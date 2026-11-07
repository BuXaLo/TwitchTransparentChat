'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, renderTwitchEmotes } = require('../emotes');

test('escapeHtml экранирует HTML-символы', () => {
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
});

test('renderTwitchEmotes возвращает пустую строку для пустого сообщения', () => {
  assert.equal(renderTwitchEmotes('', ''), '');
});

test('renderTwitchEmotes экранирует обычный текст сообщения', () => {
  assert.equal(
    renderTwitchEmotes('<script>alert(1)</script>', ''),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );
});

test('fetchImage блокирует редирект на неразрешённый хост', async () => {
  const https = require('https');
  const { EventEmitter } = require('events');
  const { fetchImage } = require('../emotes');
  const originalRequest = https.request;
  let requestCount = 0;

  https.request = (options, callback) => {
    requestCount++;
    const req = new EventEmitter();
    req.end = () => {
      const response = new EventEmitter();
      response.statusCode = 302;
      response.headers = { location: 'https://example.com/image.webp' };
      response.resume = () => {};
      callback(response);
    };
    req.destroy = (error) => req.emit('error', error);
    return req;
  };

  try {
    await assert.rejects(
      fetchImage('https://cdn.7tv.app/emote/test/2x.webp'),
      /Redirect host is not allowed/
    );
    assert.equal(requestCount, 1);
  } finally {
    https.request = originalRequest;
  }
});
