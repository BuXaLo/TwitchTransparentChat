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
