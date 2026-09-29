const tls = require('tls');
const net = require('net');
const { SocksClient } = require('socks');

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

// 15 стандартных цветов Twitch для пользователей без настроенного цвета
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

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function renderTwitchEmotes(rawText, emotesTag, indexShift = 0) {
  if (!emotesTag) return escapeHtml(rawText);

  try {
    const replacements = [];
    const emoteList = emotesTag.split('/');

    for (const emote of emoteList) {
      if (!emote) continue;
      const [id, ranges] = emote.split(':');
      if (!ranges) continue;

      const url = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
      const positions = ranges.split(',');

      for (const pos of positions) {
        let [start, end] = pos.split('-').map(Number);
        start -= indexShift;
        end -= indexShift;

        if (start >= 0 && end >= start) {
          replacements.push({ start, end: end + 1, url });
        }
      }
    }

    replacements.sort((a, b) => a.start - b.start);
    const chars = Array.from(rawText);
    const parts = [];
    let lastIdx = 0;

    for (const r of replacements) {
      if (r.start > lastIdx) {
        parts.push(escapeHtml(chars.slice(lastIdx, r.start).join('')));
      }
      parts.push(`<img class="chat-emote" src="${r.url}" alt="emote" onerror="this.style.display='none'" />`);
      lastIdx = r.end;
    }

    if (lastIdx < chars.length) {
      parts.push(escapeHtml(chars.slice(lastIdx).join('')));
    }

    return parts.join('');
  } catch (e) {
    return escapeHtml(rawText);
  }
}

function getBadgesHtml(badgesTag) {
  if (!badgesTag) return '';
  const badgesList = badgesTag.split(',');
  let html = '';

  for (const b of badgesList) {
    const role = b.split('/')[0].trim();
    const url = STATIC_BADGES[role];
    if (url) {
      const escapedRole = escapeHtml(role);
      html += `<img class="chat-badge" src="${url}" alt="${escapedRole}" onerror="this.style.display='none'" />`;
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
      if (onStatus) onStatus('Связь зависла, сброс...', 'connecting');
      socket.destroy();
    }
  }, WATCHDOG_TIMEOUT);
}

function connectTwitch({ channel, useProxy, proxy, onMessage, onError, onStatus }) {
  cleanup();

  isManuallyStopped = false;
  isConnecting = true;
  currentConfig = { channel, useProxy, proxy, onMessage, onError, onStatus };

  const targetChannel = (channel || '').toLowerCase().trim().replace(/^#/, '');
  if (!targetChannel) {
    isConnecting = false;
    onStatus('Канал не указан', 'offline');
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

    onStatus('Шифрование TLS...', 'connecting');

    let socket;
    const tlsHandshakeTimer = setTimeout(() => {
      if (isConnecting && socket && !socket.destroyed) {
        isConnecting = false;
        onError('Таймаут TLS-соединения');
        onStatus('Таймаут TLS', 'offline');
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
      onStatus('Вход в чат...', 'connecting');

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
          onStatus('Переподключение по запросу Twitch...', 'connecting');
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
          onStatus(`В сети: #${targetChannel}${proxyLabel}`, 'online');
          continue;
        }

        if (parsed.command === 'PRIVMSG') {
          resetWatchdog(socket, onStatus);
          try {
            let messageText = parsed.trailing || '';
            let isAction = false;
            let indexShift = 0;

            if (messageText.startsWith('\x01ACTION ') && messageText.endsWith('\x01')) {
              isAction = true;
              indexShift = 8;
              messageText = messageText.slice(8, -1);
            }

            const tags = parsed.tags;
            const renderedHtml = renderTwitchEmotes(messageText, tags['emotes'], indexShift);
            const badgesHtml = getBadgesHtml(tags['badges']);
            const isReward = Boolean(tags['custom-reward-id']);
            const userName = tags['display-name'] || parsed.prefix.split('!')[0] || 'Аноним';

            // Если цвета нет в тегах, используем хэш ника для выбора из 15 дефолтных цветов
            const userColor = tags['color'] || getDefaultUserColor(userName);

            onMessage({
              user: userName,
              color: userColor,
              badgesHtml: badgesHtml,
              html: renderedHtml,
              rawText: messageText,
              isAction: isAction,
              isReward: isReward
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
      onError(`Ошибка сети: ${e.message}`);
      onStatus('Ошибка сети', 'offline');
    });

    socket.on('close', () => {
      clearTimeout(tlsHandshakeTimer);
      clearTimeout(watchdogTimer);
      isConnecting = false;

      if (!isManuallyStopped) {
        scheduleReconnect();
      } else {
        onStatus('Отключено', 'offline');
      }
    });
  };

  if (useProxy && proxy && proxy.host) {
    onStatus('SOCKS5 подключение...', 'connecting');
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
        onError(`Ошибка прокси: ${err.message}`);
        onStatus('Ошибка прокси', 'offline');
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
    onStatus('Прямое подключение...', 'connecting');
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
        onError('Таймаут соединения');
        onStatus('Таймаут сети', 'offline');
        directSocket.destroy();
        scheduleReconnect();
      }
    });

    directSocket.on('error', (e) => {
      isConnecting = false;
      onError(`Ошибка соединения: ${e.message}`);
      onStatus('Ошибка сети', 'offline');
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
    currentConfig.onStatus(`Реконнект через ${Math.round(delay / 1000)}с (попытка ${reconnectAttempts})...`, 'connecting');
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

module.exports = { connectTwitch, disconnectTwitch };
