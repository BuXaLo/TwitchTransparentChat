'use strict';

const https = require('https');
const tls = require('tls');
const net = require('net');
const { SocksClient } = require('socks');

/* ============================================================
 * Настройки сети (прокси) — общие для API смайлов и для картинок
 * ============================================================ */

// Хосты, с которых разрешено грузить картинки (и через которые ходит протокол emote://)
const ALLOWED_IMAGE_HOSTS = new Set([
  'static-cdn.jtvnw.net',
  'cdn.7tv.app',
  'cdn.betterttv.net',
  'cdn.frankerfacez.com'
]);

const network = { proxy: null };

// Только для автотестов (самоподписанный сертификат локального сервера)
let tlsOverride = {};
function _setTlsOptionsForTests(opts) {
  tlsOverride = opts || {};
}

/**
 * proxy: { host, port, username?, password? } или null (прямое соединение)
 */
function setNetwork(proxy) {
  if (proxy && proxy.host && proxy.port) {
    network.proxy = {
      host: String(proxy.host).trim(),
      port: parseInt(proxy.port, 10),
      username: proxy.username || '',
      password: proxy.password || ''
    };
  } else {
    network.proxy = null;
  }
}

function isProxyActive() {
  return !!network.proxy;
}

/* ============================================================
 * HTTPS-клиент с поддержкой SOCKS5 (использует уже установленный пакет socks)
 * ============================================================ */

class SocksHttpsAgent extends https.Agent {
  constructor(proxy, extra) {
    super(Object.assign({ keepAlive: false }, extra || {}));
    this._proxy = proxy;
  }

  createConnection(options, callback) {
    let finished = false;
    const finish = (err, sock) => {
      if (finished) return;
      finished = true;
      callback(err, sock);
    };

    const host = options.host || options.hostname;
    const port = parseInt(options.port, 10) || 443;

    SocksClient.createConnection({
      proxy: {
        host: this._proxy.host,
        port: this._proxy.port,
        type: 5,
        userId: this._proxy.username || undefined,
        password: this._proxy.password || undefined
      },
      command: 'connect',
      destination: { host, port },
      timeout: 10000
    })
      .then(({ socket }) => {
        const tlsOpts = {
          socket,
          rejectUnauthorized: options.rejectUnauthorized !== false
        };
        if (!net.isIP(host)) tlsOpts.servername = options.servername || host;
        finish(null, tls.connect(tlsOpts));
      })
      .catch((err) => finish(err));
  }
}

/**
 * GET по HTTPS. Если включён прокси — через SOCKS5, иначе напрямую.
 * Возвращает { status, headers, body: Buffer }
 */
function httpGet(urlStr, opts) {
  const o = Object.assign({ timeoutMs: 12000, maxBytes: 20 * 1024 * 1024, redirects: 3, headers: {} }, opts || {});

  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      reject(e);
      return;
    }
    if (u.protocol !== 'https:') {
      reject(new Error('Only https is supported'));
      return;
    }

    const agent = network.proxy ? new SocksHttpsAgent(network.proxy, tlsOverride) : undefined;
    let settled = false;
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(val);
    };

    const req = https.request(
      Object.assign(
        {
          protocol: 'https:',
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'GET',
          headers: Object.assign({ 'User-Agent': 'TwitchTransparentChat/1.1', Accept: '*/*' }, o.headers),
          agent
        },
        tlsOverride
      ),
      (res) => {
        const status = res.statusCode || 0;

        if ([301, 302, 307, 308].includes(status) && res.headers.location && o.redirects > 0) {
          res.resume();
          let next;
          try {
            next = new URL(res.headers.location, u).href;
          } catch (e) {
            done(reject, e);
            return;
          }
          httpGet(next, Object.assign({}, o, { redirects: o.redirects - 1 })).then(
            (r) => done(resolve, r),
            (e) => done(reject, e)
          );
          return;
        }

        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > o.maxBytes) {
            req.destroy(new Error('Response too large'));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => done(resolve, { status, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on('error', (e) => done(reject, e));
      }
    );

    const timer = setTimeout(() => req.destroy(new Error('Request timeout')), o.timeoutMs);
    req.on('error', (e) => done(reject, e));
    req.end();
  });
}

/** JSON по HTTPS. 404 -> null (у канала просто нет таких смайлов) */
async function fetchJson(url) {
  const res = await httpGet(url, { headers: { Accept: 'application/json' }, maxBytes: 25 * 1024 * 1024 });
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${url}`);
  return JSON.parse(res.body.toString('utf-8'));
}

/* ============================================================
 * Картинки через прокси (для протокола emote://)
 * ============================================================ */

const imageCache = new Map(); // url -> { contentType, body }
const imageInflight = new Map();
const IMAGE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
let imageCacheBytes = 0;

function cacheImage(url, entry) {
  imageCache.set(url, entry);
  imageCacheBytes += entry.body.length;
  while (imageCacheBytes > IMAGE_CACHE_MAX_BYTES && imageCache.size > 1) {
    const oldestKey = imageCache.keys().next().value;
    imageCacheBytes -= imageCache.get(oldestKey).body.length;
    imageCache.delete(oldestKey);
  }
}

async function fetchImage(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(u.hostname)) {
    throw new Error('Host is not allowed');
  }

  const cached = imageCache.get(url);
  if (cached) {
    imageCache.delete(url); // обновляем «свежесть» (LRU)
    imageCache.set(url, cached);
    return cached;
  }
  if (imageInflight.has(url)) return imageInflight.get(url);

  const p = (async () => {
    const res = await httpGet(url, { maxBytes: 8 * 1024 * 1024 });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const contentType = String(res.headers['content-type'] || '');
    if (!/^image\//i.test(contentType)) throw new Error('Not an image');
    const entry = { contentType, body: res.body };
    cacheImage(url, entry);
    return entry;
  })().finally(() => imageInflight.delete(url));

  imageInflight.set(url, p);
  return p;
}

/**
 * Если активен прокси — картинки отдаём через emote://host/path (их тянет main-процесс через прокси).
 * Без прокси остаются обычные https-ссылки (браузер грузит напрямую).
 */
function imgUrl(url) {
  if (!network.proxy) return url;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(u.hostname)) {
      return `emote://${u.hostname}${u.pathname}${u.search}`;
    }
  } catch (e) {
    /* ignore */
  }
  return url;
}

/* ============================================================
 * Парсеры API (чистые функции, удобно тестировать)
 * Результат: [{ name, url, zeroWidth }]
 * ============================================================ */

function safeCdnUrl(u) {
  if (typeof u !== 'string') return null;
  try {
    const x = new URL(u.startsWith('//') ? `https:${u}` : u);
    if (x.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(x.hostname)) return x.href;
  } catch (e) {
    /* ignore */
  }
  return null;
}

function parse7tv(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const e of list) {
    if (!e || typeof e.name !== 'string') continue;
    let url = null;
    if (e.data && e.data.host && typeof e.data.host.url === 'string') {
      url = safeCdnUrl(`${e.data.host.url}/2x.webp`);
    }
    if (!url && typeof e.id === 'string' && /^[0-9A-Za-z]+$/.test(e.id)) {
      url = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
    }
    if (!url) continue;
    const zeroWidth = ((e.flags || 0) & 1) === 1 || (((e.data && e.data.flags) || 0) & 256) === 256;
    out.push({ name: e.name, url, zeroWidth });
  }
  return out;
}

// Zero-width смайлы BTTV (глобальные)
const BTTV_ZERO_WIDTH = new Set(['SoSnowy', 'IceCold', 'SantaHat', 'TopHat', 'ReinDeer', 'CandyCane', 'cvMask', 'cvHazmat']);

function parseBttv(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const e of list) {
    if (!e || typeof e.code !== 'string' || typeof e.id !== 'string' || !/^[\w-]+$/.test(e.id)) continue;
    out.push({
      name: e.code,
      url: `https://cdn.betterttv.net/emote/${e.id}/2x.webp`,
      zeroWidth: BTTV_ZERO_WIDTH.has(e.code)
    });
  }
  return out;
}

function parseFfz(json) {
  const out = [];
  if (!json || !json.sets) return out;

  let setIds = [];
  if (json.room && json.room.set !== undefined && json.room.set !== null) setIds = [json.room.set];
  else if (Array.isArray(json.default_sets)) setIds = json.default_sets;

  for (const id of setIds) {
    const set = json.sets[String(id)];
    if (!set || !Array.isArray(set.emoticons)) continue;
    for (const e of set.emoticons) {
      if (!e || typeof e.name !== 'string' || !e.urls) continue;
      const url = safeCdnUrl(e.urls['2'] || e.urls['1'] || e.urls['4']);
      if (url) out.push({ name: e.name, url, zeroWidth: false });
    }
  }
  return out;
}

/* ============================================================
 * Загрузка и кэш смайлов
 * ============================================================ */

const REFRESH_MS = 30 * 60 * 1000; // обновлять справочник раз в 30 минут (при переподключении)
const RETRY_MS = 30 * 1000; // повтор после неудачной загрузки не чаще, чем раз в 30 сек

function newState() {
  return { map: new Map(), complete: false, loadedAt: 0, lastAttempt: 0, promise: null };
}

const globalState = newState();
let channelState = Object.assign(newState(), { roomId: null });

function mergeInto(map, list) {
  for (const e of list) map.set(e.name, e);
}

async function buildGlobalMap() {
  const results = await Promise.allSettled([
    fetchJson('https://api.frankerfacez.com/v1/set/global').then((j) => (j ? parseFfz(j) : [])),
    fetchJson('https://api.betterttv.net/3/cached/emotes/global').then((j) => (j ? parseBttv(j) : [])),
    fetchJson('https://7tv.io/v3/emote-sets/global').then((j) => (j ? parse7tv(j.emotes) : []))
  ]);
  return collect(results);
}

async function buildChannelMap(roomId) {
  const results = await Promise.allSettled([
    fetchJson(`https://api.frankerfacez.com/v1/room/id/${roomId}`).then((j) => (j ? parseFfz(j) : [])),
    fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`).then((j) =>
      j ? parseBttv([].concat(j.channelEmotes || [], j.sharedEmotes || [])) : []
    ),
    fetchJson(`https://7tv.io/v3/users/twitch/${roomId}`).then((j) =>
      j && j.emote_set ? parse7tv(j.emote_set.emotes) : []
    )
  ]);
  return collect(results);
}

// Порядок в массиве = приоритет по возрастанию (позже — перекрывает раньше): FFZ < BTTV < 7TV
function collect(results) {
  const map = new Map();
  let complete = true;
  for (const r of results) {
    if (r.status === 'fulfilled') mergeInto(map, r.value);
    else complete = false;
  }
  return { map, complete };
}

function ensure(state, builder) {
  if (state.promise) return state.promise;

  const now = Date.now();
  const fresh = state.complete
    ? now - state.loadedAt <= REFRESH_MS
    : state.lastAttempt > 0 && now - state.lastAttempt <= RETRY_MS;
  if (fresh) return Promise.resolve();

  state.lastAttempt = now;
  state.promise = builder()
    .then(({ map, complete }) => {
      if (map.size > 0 || complete) state.map = map;
      state.complete = complete;
      if (complete) state.loadedAt = Date.now();
    })
    .catch(() => {})
    .finally(() => {
      state.promise = null;
    });
  return state.promise;
}

function ensureGlobalEmotes() {
  return ensure(globalState, buildGlobalMap);
}

function ensureChannelEmotes(roomId) {
  const id = String(roomId || '');
  if (!/^\d+$/.test(id)) return Promise.resolve();
  if (channelState.roomId !== id) {
    channelState = Object.assign(newState(), { roomId: id });
  }
  return ensure(channelState, () => buildChannelMap(id));
}

// Только для автотестов: подставить словари без обращения к сети
function _setEmotesForTests(globalList, channelList) {
  globalState.map = new Map();
  mergeInto(globalState.map, globalList || []);
  channelState = Object.assign(newState(), { roomId: '1' });
  mergeInto(channelState.map, channelList || []);
}

function lookupEmote(word) {
  return channelState.map.get(word) || globalState.map.get(word) || null;
}

/** Имена нескольких загруженных смайлов — для тестового сообщения */
function getSampleEmoteNames(count) {
  const names = [];
  for (const m of [channelState.map, globalState.map]) {
    for (const e of m.values()) {
      if (!e.zeroWidth && !names.includes(e.name)) names.push(e.name);
      if (names.length >= count) return names;
    }
  }
  return names;
}

/* ============================================================
 * Рендер сообщения: родные смайлы Twitch + 7TV/BTTV/FFZ
 * ============================================================ */

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function parseNativeRanges(emotesTag, charCount) {
  const ranges = [];
  if (!emotesTag) return ranges;

  for (const emote of emotesTag.split('/')) {
    if (!emote) continue;
    const [id, positions] = emote.split(':');
    if (!positions || !/^\w+$/.test(id)) continue;
    for (const pos of positions.split(',')) {
      const [s, e] = pos.split('-').map(Number);
      if (Number.isNaN(s) || Number.isNaN(e) || s < 0 || s >= charCount) continue;
      ranges.push({ id, start: s, end: Math.min(e + 1, charCount) });
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  // Убираем пересечения
  const clean = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start < lastEnd || r.end <= r.start) continue;
    clean.push(r);
    lastEnd = r.end;
  }
  return clean;
}

function pushTextSegment(items, text) {
  for (const token of text.split(/(\s+)/)) {
    if (token === '') continue;

    if (/^\s+$/.test(token)) {
      items.push({ type: 'text', text: token, ws: true });
      continue;
    }

    const found = lookupEmote(token);
    if (!found) {
      items.push({ type: 'text', text: token });
      continue;
    }

    if (found.zeroWidth) {
      // Накладываем на предыдущий смайл (пробелы между ними убираем)
      let k = items.length - 1;
      while (k >= 0 && items[k].type === 'text' && items[k].ws) k--;
      if (k >= 0 && items[k].type === 'emote') {
        items.splice(k + 1);
        items[k].overlays.push(found);
        continue;
      }
    }

    items.push({ type: 'emote', url: found.url, alt: token, overlays: [] });
  }
}

function buildItems(rawText, emotesTag) {
  const chars = Array.from(rawText);
  const native = parseNativeRanges(emotesTag, chars.length);
  const items = [];
  let last = 0;

  for (const r of native) {
    if (r.start > last) pushTextSegment(items, chars.slice(last, r.start).join(''));
    items.push({
      type: 'emote',
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0`,
      alt: chars.slice(r.start, r.end).join(''),
      overlays: []
    });
    last = r.end;
  }
  if (last < chars.length) pushTextSegment(items, chars.slice(last).join(''));
  return items;
}

function imgTag(url, alt, cls) {
  return `<img class="${cls}" src="${escapeHtml(imgUrl(url))}" alt="${escapeHtml(alt)}" onerror="this.style.display='none'" />`;
}

function itemToHtml(it) {
  if (it.type === 'text') return escapeHtml(it.text);
  const base = imgTag(it.url, it.alt, 'chat-emote');
  if (!it.overlays.length) return base;
  const over = it.overlays.map((o) => imgTag(o.url, o.name, 'chat-emote zero-width')).join('');
  return `<span class="emote-stack">${base}${over}</span>`;
}

function renderTwitchEmotes(rawText, emotesTag) {
  try {
    return buildItems(rawText || '', emotesTag).map(itemToHtml).join('');
  } catch (e) {
    return escapeHtml(rawText || '');
  }
}

module.exports = {
  ALLOWED_IMAGE_HOSTS,
  setNetwork,
  isProxyActive,
  httpGet,
  fetchJson,
  fetchImage,
  imgUrl,
  ensureGlobalEmotes,
  ensureChannelEmotes,
  lookupEmote,
  getSampleEmoteNames,
  renderTwitchEmotes,
  escapeHtml,
  // для тестов
  parse7tv,
  parseBttv,
  parseFfz,
  _setTlsOptionsForTests,
  _setEmotesForTests
};
