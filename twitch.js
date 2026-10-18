const tls = require('tls');
const net = require('net');
const { SocksClient } = require('socks');
const emotes = require('./emotes');
const { t } = require('./locales');

let activeSocket = null;
let keepAliveTimer = null;
let reconnectTimer = null;
let watchdogTimer = null;
let currentConfig = null;
let isManuallyStopped = false;
let isConnecting = false;
let mentionRegex = null;

// Экспоненциальный backoff и таймауты
let reconnectAttempts = 0;
const MIN_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;
const WATCHDOG_TIMEOUT = 60000;
const TLS_HANDSHAKE_TIMEOUT = 15000;

const CHANNEL_POINTS_ICON_URL = 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png';

const STATIC_BADGES = {
  broadcaster: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2',
  moderator: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2',
  vip: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/2',
  subscriber: 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2aa4b881531b/2',
  founder: 'https://static-cdn.jtvnw.net/badges/v1/09d93036-9ce6-45c6-8e7e-3044e3d2f0ea/2',
  partner: 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/2',
  turbo: 'https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-abac-f6c13f849dd4/2',
  premium: 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a988-4348-a9c3-60ab9b1899da/2'
};

const TWITCH_DEFAULT_COLORS = [
  '#FF0000', '#0000FF', '#00FF7F', '#B22222', '#FF7F50',
  '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
  '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF00'
];

function getDefaultUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TWITCH_DEFAULT_COLORS.length;
  return TWITCH_DEFAULT_COLORS[index];
}

function getBadgesHtml(badgesTag) {
  if (!badgesTag) return '';
  const badgesList = badgesTag.split(',');
  let html = '';

  for (const b of badgesList) {
    const role = b.split('/')[0].trim();
    const url = STATIC_BADGES[role];
    if (url) {
      const escapedRole = emotes.escapeHtml(role);
      html += `<img class="chat-badge" src="${emotes.escapeHtml(emotes.imgUrl(url))}" alt="${escapedRole}" onerror="this.style.display='none'" />`;
    }
  }
  return html;
}

// IRCv3: в значениях тегов \s = пробел, \: = ';', \\ = '\', \r и \n = переводы строк
const TAG_ESCAPES = { ':': ';', s: ' ', '\\': '\\', r: '\r', n: '\n' };

function unescapeTagValue(value) {
  if (value.indexOf('\\') === -1) return value;
  return value.replace(/\\(.?)/g, (m, c) => (c in TAG_ESCAPES ? TAG_ESCAPES[c] : c));
}

function normalizeChannel(channel) {
  return (channel || '').toLowerCase().trim().replace(/^#/, '');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// «@канал» как отдельное слово: «@bob» не срабатывает внутри «@bobby»
function buildMentionRegex(nick) {
  if (!nick) return null;
  return new RegExp('(?<![A-Za-z0-9_])@' + escapeRegExp(nick) + '(?![A-Za-z0-9_])', 'i');
}

/**
 * Превращает USERNOTICE в компактное событие для оверлея.
 * Возвращает null для событий, которые мы не показываем.
 */
function buildNoticeMessage(parsed) {
  const tags = parsed.tags;
  const user = tags['display-name'] || tags['login'] || t('common.anon');
  const userText = parsed.trailing
    ? emotes.renderTwitchEmotes(parsed.trailing, tags['emotes'])
    : '';

  switch (tags['msg-id']) {
    case 'sub':
      return {
        isNotice: true, noticeType: 'sub', user,
        tier: tags['msg-param-sub-plan'] || '1000',
        html: userText
      };

    case 'resub':
      return {
        isNotice: true, noticeType: 'resub', user,
        tier: tags['msg-param-sub-plan'] || '1000',
        months: parseInt(tags['msg-param-cumulative-months'], 10) || 0,
        html: userText
      };

    case 'subgift':
      // Отдельные подарки из массовой раздачи не показываем: о них скажет одно событие submysterygift
      if (tags['msg-param-community-gift-id']) return null;
      return {
        isNotice: true, noticeType: 'gift', user,
        tier: tags['msg-param-sub-plan'] || '1000',
        recipient: tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name'] || '',
        isMassGift: false
      };

    case 'submysterygift':
      return {
        isNotice: true, noticeType: 'gift', user,
        tier: tags['msg-param-sub-plan'] || '1000',
        count: parseInt(tags['msg-param-mass-gift-count'], 10) || 1,
        isMassGift: true
      };

    case 'raid':
      return {
        isNotice: true, noticeType: 'raid',
        user: tags['msg-param-displayName'] || tags['msg-param-login'] || user,
        viewers: parseInt(tags['msg-param-viewerCount'], 10) || 0
      };

    default:
      return null;
  }
}

function parseIrcMessage(line) {
  let tags = {};
  let str = line;

  if (str.startsWith('@')) {
    const spaceIdx = str.indexOf(' ');
    const tagsStr = str.slice(1, spaceIdx);
    str = str.slice(spaceIdx + 1);

    tagsStr.split(';').forEach((kv) => {
      const eq = kv.indexOf('=');
      const k = eq === -1 ? kv : kv.slice(0, eq);
      tags[k] = eq === -1 ? '' : unescapeTagValue(kv.slice(eq + 1));
    });
  }

  let prefix = '';
  if (str.startsWith(':')) {
    const spaceIdx = str.indexOf(' ');
    prefix = str.slice(1, spaceIdx);
    str = str.slice(spaceIdx + 1);
  }

  const trailingIdx = str.indexOf(' :');
  let trailing = '';
  let commandAndParams = '';

  if (trailingIdx !== -1) {
    commandAndParams = str.slice(0, trailingIdx).trim();
    trailing = str.slice(trailingIdx + 2);
  } else {
    commandAndParams = str.trim();
  }

  const parts = commandAndParams.split(/\s+/);
  const command = parts[0] ? parts[0].toUpperCase() : '';
  const params = parts.slice(1);

  return { tags, prefix, command, params, trailing };
}

function resetWatchdog(socket, onStatus) {
  clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    if (socket && !socket.destroyed) {
      console.warn('[Watchdog] Нет ответов от IRC > 60 сек. Принудительный сброс сокета...');
      if (onStatus) onStatus(t('status.watchdog'), 'connecting');
      socket.destroy();
    }
  }, WATCHDOG_TIMEOUT);
}

function connectTwitch({ channel, useProxy, proxy, onMessage, onRemove, onError, onStatus }) {
  cleanup();

  isManuallyStopped = false;
  isConnecting = true;
  currentConfig = { channel, useProxy, proxy, onMessage, onRemove, onError, onStatus };

  // Смайлы и картинки ходят тем же путём, что и чат: через SOCKS5, если он включён
  emotes.setNetwork(useProxy && proxy && proxy.host ? { host: proxy.host, port: proxy.port, username: proxy.username, password: proxy.password } : null);
  emotes.ensureGlobalEmotes();

  const targetChannel = normalizeChannel(channel);
  if (!targetChannel) {
    isConnecting = false;
    onStatus(t('status.noChannel'), 'offline');
    return;
  }

  // Подсветка упоминаний и ответов строится по имени канала (ник стримера = логин канала)
  mentionRegex = buildMentionRegex(targetChannel);

  const setupTlsSocket = (rawSocket) => {
    if (isManuallyStopped) {
      if (rawSocket && !rawSocket.destroyed) rawSocket.destroy();
      return;
    }

    rawSocket.setTimeout(0);
    rawSocket.setKeepAlive(true, 10000);
    rawSocket.setNoDelay(true);

    onStatus(t('status.tls'), 'connecting');

    let socket;
    const tlsHandshakeTimer = setTimeout(() => {
      if (isConnecting && socket && !socket.destroyed) {
        isConnecting = false;
        onError(t('err.tlsTimeout'));
        onStatus(t('status.tlsTimeout'), 'offline');
        socket.destroy();
      }
    }, TLS_HANDSHAKE_TIMEOUT);

    socket = tls.connect({
      socket: rawSocket,
      host: 'irc.chat.twitch.tv',
      port: 6697,
      servername: 'irc.chat.twitch.tv'
    }, () => {
      clearTimeout(tlsHandshakeTimer);
      isConnecting = false;
      onStatus(t('status.joining'), 'connecting');

      socket.setKeepAlive(true, 10000);
      socket.setNoDelay(true);

      const guestNick = `justinfan${Math.floor(10000 + Math.random() * 80000)}`;
      socket.write(`PASS SCHMOOPIIE\r\n`);
      socket.write(`NICK ${guestNick}\r\n`);
      socket.write(`CAP REQ :twitch.tv/tags twitch.tv/commands\r\n`);
      socket.write(`JOIN #${targetChannel}\r\n`);

      resetWatchdog(socket, onStatus);

      clearInterval(keepAliveTimer);
      keepAliveTimer = setInterval(() => {
        if (socket && !socket.destroyed) {
          socket.write(`PING :tmi.twitch.tv\r\n`);
        }
      }, 25000);
    });

    activeSocket = socket;
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString('utf-8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop();

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line === ':tmi.twitch.tv RECONNECT') {
          console.log('[Twitch] Получен сигнал планового реконнекта от Twitch');
          onStatus(t('status.twitchReconnect'), 'connecting');
          socket.destroy();
          return;
        }

        const parsed = parseIrcMessage(line);

        if (parsed.command === 'PING') {
          resetWatchdog(socket, onStatus);
          const payload = parsed.trailing || parsed.params[0] || 'tmi.twitch.tv';
          socket.write(`PONG :${payload}\r\n`);
          continue;
        }

        if (parsed.command === 'PONG') {
          resetWatchdog(socket, onStatus);
          continue;
        }

        if (parsed.command === '001') {
          resetWatchdog(socket, onStatus);
          reconnectAttempts = 0;
          const proxyLabel = (useProxy && proxy?.host) ? ' [SOCKS5]' : '';
          onStatus(t('status.online', { channel: targetChannel, proxy: proxyLabel }), 'online');
          continue;
        }

        if (parsed.command === 'ROOMSTATE') {
          // Приходит при входе в канал: в теге room-id лежит ID канала для 7TV/BTTV/FFZ
          if (parsed.tags['room-id']) emotes.ensureChannelEmotes(parsed.tags['room-id']);
          continue;
        }

        if (parsed.command === 'CLEARMSG') {
          // Модератор удалил одно сообщение
          const targetId = parsed.tags['target-msg-id'];
          if (targetId && typeof onRemove === 'function') onRemove({ id: targetId });
          continue;
        }

        if (parsed.command === 'CLEARCHAT') {
          // Бан или таймаут пользователя (в trailing его логин); без логина — чат очищен целиком
          if (typeof onRemove === 'function') {
            const targetLogin = (parsed.trailing || '').trim().toLowerCase();
            const targetUserId = parsed.tags['target-user-id'] || '';
            onRemove(targetLogin || targetUserId ? { login: targetLogin, userId: targetUserId } : { all: true });
          }
          continue;
        }

        if (parsed.command === 'USERNOTICE') {
          try {
            const notice = buildNoticeMessage(parsed);
            if (notice) onMessage(notice);
          } catch (e) {
            console.error('[Notice parse error]', e);
          }
          continue;
        }

        if (parsed.command === 'PRIVMSG') {
          resetWatchdog(socket, onStatus);
          try {
            let messageText = parsed.trailing || '';
            let isAction = false;

            // Обработка /me сообщений (\x01ACTION text\x01)
            // Twitch строит индексы emotes уже относительно чистого текста внутри ACTION!
            if (messageText.startsWith('\x01ACTION ') && messageText.endsWith('\x01')) {
              isAction = true;
              messageText = messageText.slice(8, -1);
            }

            const tags = parsed.tags;
            // Рендерим эмоуты по чистым координатам Twitch
            const renderedHtml = emotes.renderTwitchEmotes(messageText, tags['emotes']);
            const badgesHtml = getBadgesHtml(tags['badges']);
            const isReward = Boolean(tags['custom-reward-id']);
            const userName = tags['display-name'] || parsed.prefix.split('!')[0] || t('common.anon');
            const userColor = tags['color'] || getDefaultUserColor(userName);

            const login = (parsed.prefix.split('!')[0] || '').toLowerCase();
            const isOwn = login === targetChannel;
            const isReplyToMe = (tags['reply-parent-user-login'] || '').toLowerCase() === targetChannel;
            const isMention = !isOwn && (isReplyToMe || (mentionRegex ? mentionRegex.test(messageText) : false));

            onMessage({
              id: tags['id'] || '',
              login: login,
              userId: tags['user-id'] || '',
              user: userName,
              color: userColor,
              badgesHtml: badgesHtml,
              html: renderedHtml,
              rawText: messageText,
              isAction: isAction,
              isReward: isReward,
              isMention: isMention,
              mentionNick: targetChannel,
              rewardIconUrl: emotes.imgUrl(CHANNEL_POINTS_ICON_URL)
            });
          } catch (e) {
            console.error('[Parse error]', e);
          }
        }
      }
    });

    socket.on('error', (e) => {
      clearTimeout(tlsHandshakeTimer);
      isConnecting = false;
      onError(t('err.network', { msg: e.message }));
      onStatus(t('status.networkError'), 'offline');
    });

    socket.on('close', () => {
      clearTimeout(tlsHandshakeTimer);
      clearTimeout(watchdogTimer);
      isConnecting = false;

      if (!isManuallyStopped) {
        scheduleReconnect();
      } else {
        onStatus(t('status.disconnected'), 'offline');
      }
    });
  };

  if (useProxy && proxy && proxy.host) {
    onStatus(t('status.socks'), 'connecting');
    const socksOptions = {
      proxy: {
        host: proxy.host,
        port: parseInt(proxy.port, 10),
        type: 5,
        userId: proxy.username || undefined,
        password: proxy.password || undefined
      },
      command: 'connect',
      destination: {
        host: 'irc.chat.twitch.tv',
        port: 6697
      },
      timeout: 10000
    };

    SocksClient.createConnection(socksOptions, (err, info) => {
      if (err) {
        if (isManuallyStopped) return;
        isConnecting = false;
        onError(t('err.proxy', { msg: err.message }));
        onStatus(t('status.proxyError'), 'offline');
        scheduleReconnect();
        return;
      }

      if (isManuallyStopped) {
        if (info?.socket && !info.socket.destroyed) info.socket.destroy();
        return;
      }

      setupTlsSocket(info.socket);
    });
  } else {
    onStatus(t('status.direct'), 'connecting');
    const directSocket = net.connect({
      host: 'irc.chat.twitch.tv',
      port: 6697
    }, () => {
      if (isManuallyStopped) {
        directSocket.destroy();
        return;
      }
      setupTlsSocket(directSocket);
    });

    activeSocket = directSocket;

    directSocket.setTimeout(10000, () => {
      if (isConnecting && !directSocket.destroyed) {
        isConnecting = false;
        onError(t('err.timeout'));
        onStatus(t('status.timeout'), 'offline');
        directSocket.destroy();
        scheduleReconnect();
      }
    });

    directSocket.on('error', (e) => {
      isConnecting = false;
      onError(t('err.connection', { msg: e.message }));
      onStatus(t('status.networkError'), 'offline');
      directSocket.destroy();
      scheduleReconnect();
    });
  }
}

function scheduleReconnect() {
  if (isManuallyStopped || !currentConfig || reconnectTimer) return;

  reconnectAttempts++;
  const delay = Math.min(MIN_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);

  if (currentConfig.onStatus) {
    currentConfig.onStatus(t('status.reconnect', { sec: Math.round(delay / 1000), n: reconnectAttempts }), 'connecting');
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTwitch(currentConfig);
  }, delay);
}

function cleanup() {
  clearInterval(keepAliveTimer);
  clearTimeout(reconnectTimer);
  clearTimeout(watchdogTimer);
  keepAliveTimer = null;
  reconnectTimer = null;
  watchdogTimer = null;

  if (activeSocket) {
    activeSocket.removeAllListeners();
    activeSocket.destroy();
    activeSocket = null;
  }
}

function disconnectTwitch() {
  isManuallyStopped = true;
  reconnectAttempts = 0;
  isConnecting = false;
  cleanup();
}

/**
 * Тестовый сценарий для настройки внешнего вида (подключение к чату не нужно).
 * Возвращает список шагов { msg | remove, delay }: main-процесс выдаёт их по очереди.
 * Все сообщения проходят через тот же рендер, что и настоящие:
 * родные смайлы, 7TV/BTTV/FFZ, бейджи, награды, /me, упоминания, события и удаление.
 */
function makeTestSequence(channel) {
  const nick = normalizeChannel(channel) || 'streamer';
  const sample = emotes.getSampleEmoteNames(2);
  const thirdParty = sample.length ? ' ' + sample.join(' ') : '';
  const iconUrl = emotes.imgUrl(CHANNEL_POINTS_ICON_URL);
  const stamp = Date.now();
  let seq = 0;

  const withKappa = (text) => {
    const full = `${text} Kappa`;
    const start = Array.from(full).length - 5;
    return { text: full, emotes: `25:${start}-${start + 4}` };
  };

  const chat = (o) => {
    const n = seq++;
    return {
      id: `test-${stamp}-${n}`,
      login: String(o.user).toLowerCase(),
      userId: `test-user-${n}`,
      user: o.user,
      color: o.color,
      badgesHtml: getBadgesHtml(o.badges || ''),
      html: emotes.renderTwitchEmotes(o.text, o.emotes || ''),
      rawText: o.text,
      isAction: !!o.action,
      isReward: !!o.reward,
      isMention: !!o.mention,
      mentionNick: nick,
      rewardIconUrl: iconUrl
    };
  };

  // force: тестовые события показываются, даже если они выключены в настройках
  const notice = (o) => ({
    isNotice: true,
    force: true,
    noticeType: o.type,
    user: o.user,
    tier: o.tier || '1000',
    months: o.months || 0,
    count: o.count || 0,
    recipient: o.recipient || '',
    viewers: o.viewers || 0,
    isMassGift: !!o.mass,
    html: o.text ? emotes.renderTwitchEmotes(o.text, o.emotes || '') : ''
  });

  const kappa1 = withKappa(t('test.msg1') + thirdParty);
  const kappa2 = withKappa(t('test.resub'));
  const troll = chat({ user: t('test.user6'), color: '#FF4500', text: t('test.spam') });

  return [
    { delay: 0, msg: chat({ user: t('test.user1'), color: '#FF69B4', badges: 'subscriber/12', text: kappa1.text, emotes: kappa1.emotes }) },
    { msg: chat({ user: t('test.user2'), color: '#00FF7F', badges: 'moderator/1,subscriber/3', text: t('test.msg2') + thirdParty }) },
    { msg: chat({ user: t('test.user3'), color: '#9ACD32', badges: 'vip/1', text: t('test.reward'), reward: true }) },
    { msg: chat({ user: t('test.user4'), color: '#1E90FF', text: t('test.action') + thirdParty, action: true }) },
    { msg: chat({ user: t('test.user1'), color: '#FF69B4', text: `@${nick} ${t('test.mention')}`, mention: true }) },
    // Ответ тебе без «@» в тексте: подсвечивается по тегу reply-parent-user-login
    { msg: chat({ user: t('test.user2'), color: '#00FF7F', badges: 'moderator/1', text: t('test.reply'), mention: true }) },
    { msg: chat({ user: t('test.user3'), color: '#9ACD32', badges: 'vip/1', text: `@${nick} ${t('test.rewardMention')}`, reward: true, mention: true }) },
    { msg: chat({ user: t('test.user5'), color: '#8A2BE2', badges: 'broadcaster/1', text: t('test.long') }) },
    { msg: notice({ type: 'sub', user: t('test.user3'), tier: '1000' }) },
    { msg: notice({ type: 'resub', user: t('test.user1'), tier: '2000', months: 12, text: kappa2.text, emotes: kappa2.emotes }) },
    { msg: notice({ type: 'gift', user: t('test.user5'), tier: '1000', recipient: t('test.recipient') }) },
    { msg: notice({ type: 'gift', user: t('test.user5'), tier: '1000', count: 10, mass: true }) },
    { msg: notice({ type: 'raid', user: t('test.user4'), viewers: 128 }) },
    // Сообщение, которое «модератор» удаляет через пару секунд
    { msg: troll },
    { delay: 2200, remove: { id: troll.id } }
  ];
}

module.exports = { connectTwitch, disconnectTwitch, makeTestSequence };
