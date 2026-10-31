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
 *
 * Слушает только 127.0.0.1 и отвечает только на запросы с «своим» заголовком Host.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_FILES = {
  '/': ['widget.html', 'text/html; charset=utf-8'],
  '/chat.css': ['chat.css', 'text/css; charset=utf-8'],
  '/chat-view.js': ['chat-view.js', 'application/javascript; charset=utf-8']
};

const HEARTBEAT_MS = 15000;
const BIND_ADDRESS = '127.0.0.1';

function createWidgetServer(options) {
  const { rootDir, getState, fetchImage, isHostAllowed, onChange } = options;

  let server = null;
  let port = null;
  let listening = false;
  let lastError = null;
  let heartbeat = null;
  const clients = new Set();

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

  // Внутренний адрес emote://host/path становится адресом на этом же сервере
  function rewriteLocalUrls(json) {
    return json.replace(/emote:\/\//g, '/img/');
  }

  function start(newPort) {
    if (listening && port === newPort) return Promise.resolve();

    return stop().then(() => new Promise((resolve, reject) => {
      lastError = null;
      const srv = http.createServer((req, res) => {
        handle(req, res).catch((e) => {
          console.error('[Widget] request error', e);
          if (!res.headersSent) reply(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error');
          else res.end();
        });
      });
      srv.on('clientError', (err, socket) => socket.destroy());

      const onStartError = (err) => {
        lastError = { code: err.code || 'ERROR', message: err.message, port: newPort };
        server = null;
        listening = false;
        port = null;
        notify();
        reject(err);
      };
      srv.once('error', onStartError);

      srv.listen(newPort, BIND_ADDRESS, () => {
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
    }));
  }

  function stop() {
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
