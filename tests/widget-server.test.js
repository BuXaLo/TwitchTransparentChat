'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { createWidgetServer } = require('../widget-server');

function createServer(options = {}) {
  return createWidgetServer({
    rootDir: process.cwd(),
    getState: () => ({
      channel: 'test',
      image: 'emote://cdn.7tv.app/emote/test.webp',
      card: 'card://img/custom-card'
    }),
    fetchImage: async () => ({ body: Buffer.from('image-data'), contentType: 'image/webp' }),
    isHostAllowed: (host) => host === 'cdn.7tv.app',
    getCardImage: (id) => id === 'custom-card' ? Buffer.from('card-data') : null,
    ...options
  });
}

async function getFreePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

function request(port, pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: pathname,
      method: options.method || 'GET',
      headers: options.headers
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    req.once('error', reject);
    req.end();
  });
}

async function startServer(options) {
  const server = createServer(options);
  const port = await getFreePort();
  await server.start(port);
  return { server, port };
}

test('stop отменяет запуск, который ещё стоит в очереди', async () => {
  const server = createServer();
  const starting = server.start(0);
  const stopping = server.stop();

  await Promise.all([starting, stopping]);

  assert.equal(server.getStatus().running, false);
  assert.equal(server.getStatus().port, null);
});

test('из параллельных запусков выполняется только последний', async () => {
  const server = createServer();
  const first = server.start(0);
  const second = server.start(0);

  await Promise.all([first, second]);

  assert.equal(server.getStatus().running, true);
  assert.equal(server.getStatus().port, 0);

  await server.stop();

  assert.equal(server.getStatus().running, false);
  assert.equal(server.getStatus().port, null);
});

test('HTTP API возвращает состояние и переписывает локальные URL', async () => {
  const { server, port } = await startServer();
  try {
    const response = await request(port, '/api/state');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/json/);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(JSON.parse(response.body), {
      channel: 'test',
      image: '/img/cdn.7tv.app/emote/test.webp',
      card: '/card/custom-card'
    });
  } finally {
    await server.stop();
  }
});

test('статический маршрут отдаёт страницу OBS Widget', async () => {
  const { server, port } = await startServer();
  try {
    const response = await request(port, '/');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.body, /<html/i);
  } finally {
    await server.stop();
  }
});

test('сервер отклоняет чужой Host и неподдерживаемый HTTP-метод', async () => {
  const { server, port } = await startServer();
  try {
    const forbidden = await request(port, '/api/state', { headers: { Host: 'example.com' } });
    assert.equal(forbidden.status, 403);

    const method = await request(port, '/api/state', { method: 'POST' });
    assert.equal(method.status, 405);
    assert.equal(method.headers.allow, 'GET, HEAD');
  } finally {
    await server.stop();
  }
});

test('неизвестный маршрут возвращает 404', async () => {
  const { server, port } = await startServer();
  try {
    const response = await request(port, '/not-found');
    assert.equal(response.status, 404);
  } finally {
    await server.stop();
  }
});

test('маршруты изображений проверяют хост и возвращают содержимое', async () => {
  let fetchCount = 0;
  const { server, port } = await startServer({
    fetchImage: async () => {
      fetchCount++;
      return { body: Buffer.from('remote-image'), contentType: 'image/webp' };
    }
  });
  try {
    const allowed = await request(port, '/img/cdn.7tv.app/emote/test.webp');
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body, 'remote-image');
    assert.equal(allowed.headers['content-type'], 'image/webp');

    const denied = await request(port, '/img/evil.example/image.webp');
    assert.equal(denied.status, 403);
    assert.equal(fetchCount, 1);
  } finally {
    await server.stop();
  }
});

test('маршрут пользовательской картинки отдаёт данные или 404', async () => {
  const { server, port } = await startServer();
  try {
    const found = await request(port, '/card/custom-card');
    assert.equal(found.status, 200);
    assert.equal(found.body, 'card-data');
    assert.equal(found.headers['content-type'], 'image/webp');

    const missing = await request(port, '/card/missing');
    assert.equal(missing.status, 404);
  } finally {
    await server.stop();
  }
});

test('SSE подключение получает broadcast и закрывается при остановке сервера', async () => {
  const { server, port } = await startServer();
  let response;
  let received = '';
  let resolveEvent;
  const eventReceived = new Promise((resolve) => { resolveEvent = resolve; });
  const req = http.get({ host: '127.0.0.1', port, path: '/events' }, (res) => {
    response = res;
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      received += chunk;
      if (received.includes('event: chat\ndata:')) resolveEvent();
    });
  });

  try {
    await new Promise((resolve, reject) => {
      req.once('error', reject);
      req.once('response', resolve);
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /text\/event-stream/);
    assert.equal(server.getStatus().clients, 1);

    server.broadcast('chat', { image: 'emote://cdn.7tv.app/emote/test.webp' });
    await Promise.race([
      eventReceived,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SSE event timeout')), 1000))
    ]);
    assert.match(received, /event: chat/);
    assert.match(received, /"image":"\/img\/cdn.7tv.app\/emote\/test.webp"/);
  } finally {
    req.destroy();
    await server.stop();
  }
});
