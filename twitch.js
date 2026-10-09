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

function parseIrcMessage(line) {
  let tags = {};
  let str = line;

  if (str.startsWith('@')) {
    const spaceIdx = str.indexOf(' ');
    const tagsStr = str.slice(1, spaceIdx);
    str = str.slice(spaceIdx + 1);

    tagsStr.split(';').forEach((kv) => {
      const [k, v] = kv.split('=');
      tags[k] = v || '';
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

function connectTwitch({ channel, useProxy, proxy, onMessage, onError, onStatus }) {
  cleanup();

  isManuallyStopped = false;
  isConnecting = true;
  currentConfig = { channel, useProxy, proxy, onMessage, onError, onStatus };

  // Смайлы и картинки ходят тем же путём, что и чат: через SOCKS5, если он включён
  emotes.setNetwork(useProxy && proxy && proxy.host ? { host: proxy.host, port: proxy.port, username: proxy.username, password: proxy.password } : null);
  emotes.ensureGlobalEmotes();

  const targetChannel = (channel || '').toLowerCase().trim().replace(/^#/, '');
  if (!targetChannel) {
    isConnecting = false;
    onStatus(t('status.noChannel'), 'offline');
    return;
  }

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

            onMessage({
              user: userName,
              color: userColor,
              badgesHtml: badgesHtml,
              html: renderedHtml,
              rawText: messageText,
              isAction: isAction,
              isReward: isReward,
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
 * Тестовые сообщения для настройки внешнего вида (не требуют подключения к чату).
 * Проходят через тот же рендер, что и настоящие: родные смайлы, 7TV/BTTV/FFZ, бейджи, награды, /me.
 */
function makeTestMessage(index) {
  const i = ((index % 5) + 5) % 5;
  const sample = emotes.getSampleEmoteNames(2);
  const thirdParty = sample.length ? ' ' + sample.join(' ') : '';
  const iconUrl = emotes.imgUrl(CHANNEL_POINTS_ICON_URL);

  const withKappa = (text) => {
    const full = `${text} Kappa`;
    const start = Array.from(full).length - 5;
    return { text: full, emotes: `25:${start}-${start + 4}` };
  };

  let msg;
  switch (i) {
    case 0: {
      const m = withKappa(t('test.msg1') + thirdParty);
      msg = { user: t('test.user1'), color: '#FF69B4', badges: 'subscriber/12', text: m.text, emotes: m.emotes };
      break;
    }
    case 1:
      msg = { user: t('test.user2'), color: '#00FF7F', badges: 'moderator/1,subscriber/3', text: t('test.msg2') + thirdParty, emotes: '' };
      break;
    case 2:
      msg = { user: t('test.user3'), color: '#9ACD32', badges: 'vip/1', text: t('test.reward'), emotes: '', reward: true };
      break;
    case 3:
      msg = { user: t('test.user4'), color: '#1E90FF', badges: '', text: t('test.action') + thirdParty, emotes: '', action: true };
      break;
    default:
      msg = { user: t('test.user5'), color: '#8A2BE2', badges: 'broadcaster/1', text: t('test.long'), emotes: '' };
  }

  return {
    user: msg.user,
    color: msg.color,
    badgesHtml: getBadgesHtml(msg.badges),
    html: emotes.renderTwitchEmotes(msg.text, msg.emotes),
    rawText: msg.text,
    isAction: !!msg.action,
    isReward: !!msg.reward,
    rewardIconUrl: iconUrl
  };
}

module.exports = { connectTwitch, disconnectTwitch, makeTestMessage };
