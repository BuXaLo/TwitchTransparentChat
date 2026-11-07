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


test('частичное обновление сохраняет только кэш упавшего источника и восстанавливается', async () => {
  const https = require('https');
  const { EventEmitter } = require('events');
  const {
    ensureGlobalEmotes,
    lookupEmote
  } = require('../emotes');
  const originalRequest = https.request;
  const originalNow = Date.now;
  let now = 1_000_000;
  let mode = 'initial';

  const responses = {
    ffz: (name) => ({ sets: { 1: { emoticons: [{ name, urls: { 2: 'https://cdn.frankerfacez.com/emoticon/1/2' } }] } }, default_sets: [1] }),
    bttv: (name) => [{ id: 'test', code: name }],
    '7tv': (name) => ({ emotes: [{ id: 'test', name, data: { host: { url: 'https://cdn.7tv.app/emote/test' } } }] })
  };

  https.request = (options, callback) => {
    const req = new EventEmitter();
    req.end = () => {
      const host = options.hostname;
      let body;
      let fail = false;
      if (host === 'api.frankerfacez.com') {
        fail = mode === 'partial';
        body = responses.ffz(mode === 'recovered' ? 'FFZ_NEW' : 'FFZ_OLD');
      } else if (host === 'api.betterttv.net') {
        body = responses.bttv(mode === 'initial' ? 'BTTV_OLD' : 'BTTV_NEW');
      } else {
        body = responses['7tv'](mode === 'initial' ? 'SEVENTV_OLD' : 'SEVENTV_NEW');
      }
      process.nextTick(() => {
        if (fail) {
          req.emit('error', new Error('temporary FFZ failure'));
          return;
        }
        const res = new EventEmitter();
        res.statusCode = 200;
        res.headers = { 'content-type': 'application/json' };
        callback(res);
        res.emit('data', Buffer.from(JSON.stringify(body)));
        res.emit('end');
      });
    };
    req.destroy = (error) => req.emit('error', error);
    return req;
  };

  Date.now = () => now;
  try {
    await ensureGlobalEmotes();
    assert.ok(lookupEmote('FFZ_OLD'));
    assert.ok(lookupEmote('BTTV_OLD'));
    assert.ok(lookupEmote('SEVENTV_OLD'));

    now += 31 * 60 * 1000;
    mode = 'partial';
    await ensureGlobalEmotes();
    assert.ok(lookupEmote('FFZ_OLD'), 'FFZ cache survives its temporary failure');
    assert.equal(lookupEmote('BTTV_OLD'), null, 'successful BTTV refresh replaces its old entries');
    assert.ok(lookupEmote('BTTV_NEW'));
    assert.equal(lookupEmote('SEVENTV_OLD'), null);
    assert.ok(lookupEmote('SEVENTV_NEW'));

    now += 31 * 1000;
    mode = 'recovered';
    await ensureGlobalEmotes();
    assert.equal(lookupEmote('FFZ_OLD'), null);
    assert.ok(lookupEmote('FFZ_NEW'));
  } finally {
    https.request = originalRequest;
    Date.now = originalNow;
  }
});
