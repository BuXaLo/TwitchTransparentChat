'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locales = require('../locales');

const originalLang = locales.getLang();

test.afterEach(() => {
  locales.setLang(originalLang);
});

test('getStrings возвращает строки русского языка', () => {
  assert.equal(locales.getStrings('ru')['settings.title'], 'Twitch Overlay: настройки');
});

test('getStrings использует английский fallback для неизвестного языка', () => {
  assert.equal(locales.getStrings('unknown'), locales.getStrings('en'));
});

test('t подставляет параметры в локализованную строку', () => {
  locales.setLang('en');
  assert.equal(
    locales.t('ui.updateAvailableTitle', { latest: '2.0', current: '1.0' }),
    'Update Available: v2.0 (current: v1.0)'
  );
});
