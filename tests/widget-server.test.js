'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createWidgetServer } = require('../widget-server');

function createServer() {
  return createWidgetServer({
    rootDir: process.cwd(),
    getState: () => ({}),
    fetchImage: async () => ({ body: Buffer.alloc(0), contentType: 'image/webp' }),
    isHostAllowed: () => true,
    getCardImage: () => null
  });
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
