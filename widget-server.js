'use strict';

/**
 * Локальный веб-сервер виджета для OBS (источник «Браузер»).
 *
 *   /              страница виджета (widget.html)
 *   /chat.css      общие стили чата
 *   /chat-view.js  общий код отображения чата
 *   /api/state     настройки виджета и строки интерфейса (JSON)
 *   /events        поток событий (SSE): chat, remove, state
 *   /img/<host>/…  картинки смайлов и бейджей: скачивает приложение, поэтому они идут через SOCKS5-прокси
 *   /fonts/<файл>  комплектные шрифты woff2 из папки fonts/
 *   /card/<имя>   свои картинки плашек из userData/card-images
 *
 * Слушает только 127.0.0.1 и отвечает только на запросы с «своим» заголовком Host.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_FILES = {
  '/': ['widget.html', 'text/html; charset=utf-8'],
  '/chat.css': ['chat.css', 'text/css; charset=utf-8'],
  '/chat-view.js': ['chat-view.js', 'application/javascript; charset=utf-8'],
  '/fonts.css': ['fonts.css', 'text/css; charset=utf-8']
};

const HEARTBEAT_MS = 15000;
const BIND_ADDRESS = '127.0.0.1';

function createWidgetServer(options) {
  const { rootDir, getState, fetchImage, isHostAllowed, getCardImage, onChange } = options;

  let server = null;
  let port = null;
  let listening = false;
  let lastError = null;
  let heartbeat = null;
  const clients = new Set();
  let lifecycleGeneration = 0;
  let lifecycleQueue = Promise.resolve();

  function enqueueLifecycle(operation) {
    const result = lifecycleQueue.then(operation);
    lifecycleQueue = result.catch(() => {});
    return result;
  }

  function notify() {
    try {
      if (onChange) onChange();
    } catch (e) {
      console.error('[Widget] onChange error', e);
    }
  }

  // Защита от DNS-rebinding: принимаем только запросы, адресованные нашему адресу и порту
  function hostAllowed(req) {
    const host = String(req.headers.host || '').toLowerCase();
    return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
  }

  function reply(res, status, headers, body) {
    res.writeHead(status, Object.assign({ 'X-Content-Type-Options': 'nosniff' }, headers));
    res.end(body);
  }

  async function handle(req, res) {
    if (!hostAllowed(req)) return reply(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return reply(res, 405, { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' }, 'Method Not Allowed');
    }

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (STATIC_FILES[pathname]) {
      const [file, type] = STATIC_FILES[pathname];
      try {
        const body = await fs.promises.readFile(path.join(rootDir, file));
        return reply(res, 200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }, body);
      } catch (e) {
        return reply(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error');
      }
    }

    if (pathname === '/api/state') {
      return reply(res, 200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }, rewriteLocalUrls(JSON.stringify(getState())));
    }

    if (pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff'
      });
      res.write('retry: 2000\n\n');
      clients.add(res);
      notify();
      req.on('close', () => {
        clients.delete(res);
        notify();
      });
      return;
    }

    const WOFF2_RE = /^\.woff2$/;
    if (pathname.startsWith('/fonts/')) {
      const name = path.basename(pathname);
      if (WOFF2_RE.test(path.extname(name).toLowerCase()) && /^[A-Za-z0-9._-]+$/.test(name)) {
        try {
          const body = await fs.promises.readFile(path.join(rootDir, 'fonts', name));
          return reply(res, 200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'max-age=604800' }, body);
        } catch (e) {
          return reply(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
        }
      }
      return reply(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
    }

    // Свои картинки плашек: userData/card-images/<имя>.webp, имя в адресе закодировано.
    // Некорректное имя или отсутствующий файл — 404, и плашка рисуется без картинки.
    if (pathname.startsWith('/card/')) {
      let id = '';
      try { id = decodeURIComponent(pathname.slice('/card/'.length)); } catch (e) { /* битый адрес */ }
      const data = getCardImage ? getCardImage(id) : null;
      if (!data) return reply(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
      return reply(res, 200, { 'Content-Type': 'image/webp', 'Cache-Control': 'no-cache' }, data);
    }

    const img = /^\/img\/([^/]+)(\/.*)$/.exec(pathname);
    if (img) {
      const host = img[1].toLowerCase();
      if (!isHostAllowed(host)) return reply(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      try {
        const data = await fetchImage(`https://${host}${img[2]}${url.search}`);
        const type = /^image\//i.test(data.contentType || '') ? data.contentType : 'application/octet-stream';
        return reply(res, 200, { 'Content-Type': type, 'Cache-Control': 'max-age=3600' }, data.body);
      } catch (e) {
        return reply(res, 502, { 'Content-Type': 'text/plain' }, 'Bad Gateway');
      }
    }

    return reply(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
  }

  // Внутренние адреса card://img/<имя> и emote://host/path становятся адресами на этом же сервере
  function rewriteLocalUrls(json) {
    return json
      .replace(/card:\/\/img\//g, '/card/')
      .replace(/emote:\/\//g, '/img/');
  }

  function stopServer() {
    clearInterval(heartbeat);
    heartbeat = null;
    lastError = null;

    for (const res of clients) {
      try { res.end(); } catch (e) { /* соединение уже закрыто */ }
    }
    clients.clear();

    const srv = server;
    server = null;
    listening = false;
    port = null;

    if (!srv) {
      notify();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      srv.close(() => resolve());
      if (typeof srv.closeAllConnections === 'function') srv.closeAllConnections();
    }).then(notify);
  }

  function start(newPort) {
    const generation = ++lifecycleGeneration;

    return enqueueLifecycle(async () => {
      if (generation !== lifecycleGeneration) return;
      if (listening && port === newPort) return;

      await stopServer();
      if (generation !== lifecycleGeneration) return;

      await new Promise((resolve, reject) => {
        const srv = http.createServer((req, res) => {
          handle(req, res).catch((e) => {
            console.error('[Widget] request error', e);
            if (!res.headersSent) reply(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error');
            else res.end();
          });
        });
        srv.on('clientError', (err, socket) => socket.destroy());

        const onStartError = (err) => {
          if (generation !== lifecycleGeneration) {
            resolve();
            return;
          }
          lastError = { code: err.code || 'ERROR', message: err.message, port: newPort };
          notify();
          reject(err);
        };
        srv.once('error', onStartError);

        srv.listen(newPort, BIND_ADDRESS, () => {
          if (generation !== lifecycleGeneration) {
            srv.close(() => resolve());
            return;
          }

          srv.removeListener('error', onStartError);
          srv.on('error', (e) => console.error('[Widget] server error', e));
          server = srv;
          port = newPort;
          listening = true;
          heartbeat = setInterval(() => {
            for (const res of clients) res.write(': ping\n\n');
          }, HEARTBEAT_MS);
          if (heartbeat.unref) heartbeat.unref();
          notify();
          resolve();
        });
      });
    });
  }

  function stop() {
    const generation = ++lifecycleGeneration;
    return enqueueLifecycle(() => {
      if (generation !== lifecycleGeneration) return;
      return stopServer();
    });
  }

  // event: chat | remove | state
  function broadcast(event, data) {
    if (!clients.size) return;
    const payload = rewriteLocalUrls(JSON.stringify(data));
    for (const res of clients) {
      res.write(`event: ${event}\ndata: ${payload}\n\n`);
    }
  }

  function getStatus() {
    return {
      running: listening,
      port: listening ? port : null,
      clients: clients.size,
      error: lastError
    };
  }

  return { start, stop, broadcast, getStatus };
}

module.exports = { createWidgetServer };
