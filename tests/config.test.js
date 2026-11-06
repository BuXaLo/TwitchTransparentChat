'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config');

test('normalizeChannel принимает логин, префиксы и Twitch URL', () => {
  assert.equal(config.normalizeChannel('  Some_Channel  '), 'some_channel');
  assert.equal(config.normalizeChannel('#Some_Channel'), 'some_channel');
  assert.equal(config.normalizeChannel('@Some_Channel'), 'some_channel');
  assert.equal(config.normalizeChannel('https://www.twitch.tv/Some_Channel/about'), 'some_channel');
  assert.equal(config.normalizeChannel('invalid channel'), '');
  assert.equal(config.normalizeChannel('a'.repeat(26)), '');
});

test('normalizePort и isValidPort соблюдают диапазон портов', () => {
  assert.equal(config.normalizePort('9000'), 9000);
  assert.equal(config.normalizePort('80'), config.DEFAULT_WIDGET_PORT);
  assert.equal(config.normalizePort('not-a-port'), config.DEFAULT_WIDGET_PORT);
  assert.equal(config.isValidPort(1024), true);
  assert.equal(config.isValidPort(65535), true);
  assert.equal(config.isValidPort(65536), false);
  assert.equal(config.isValidPort('8769'), true);
});

test('normalizeConfig заполняет defaults и наследует оформление overlay для widget', () => {
  const normalized = config.normalizeConfig({
    channel: 'Streamer',
    fontSize: 30,
    highlightMentions: true,
    mentionLonger: true
  });

  assert.equal(normalized.channel, 'streamer');
  assert.equal(normalized.fontSize, 30);
  assert.equal(normalized.widget.fontSize, 30);
  assert.equal(normalized.widget.highlightMentions, false);
  assert.equal(normalized.widget.mentionLonger, false);
  assert.equal(normalized.widgetEnabled, false);
  assert.equal(normalized.widgetPort, config.DEFAULT_WIDGET_PORT);
  assert.deepEqual(normalized.userStyles, []);
  assert.deepEqual(normalized.widget.userStyles, []);
});

test('sanitizeAppearance ограничивает значения и заменяет недопустимые поля defaults', () => {
  const appearance = config.sanitizeAppearance({
    fontSize: 1000,
    messageLifetime: -10,
    bgOpacity: 150,
    borderWidth: 99,
    fontFamily: 'unknown',
    bgColor1: 'red',
    cardImagePreset: 'unknown'
  });

  assert.equal(appearance.fontSize, config.MAX_FONT_SIZE_OVERLAY);
  assert.equal(appearance.messageLifetime, 0);
  assert.equal(appearance.bgOpacity, 100);
  assert.equal(appearance.borderWidth, 5);
  assert.equal(appearance.fontFamily, config.OVERLAY_APPEARANCE_DEFAULTS.fontFamily);
  assert.equal(appearance.bgColor1, config.OVERLAY_APPEARANCE_DEFAULTS.bgColor1);
  assert.equal(appearance.cardImagePreset, 'none');
});

test('normalizeConfig очищает назначения стилей и ограничивает ротацию', () => {
  const normalized = config.normalizeConfig({
    userStyles: [
      { nick: 'Viewer', styleKey: ' first ', styleName: ' First ', appearance: { fontSize: 20 } },
      { nick: '@VIEWER', styleKey: 'duplicate' },
      { nick: 'invalid nick', styleKey: 'invalid' }
    ],
    rotation: {
      source: 'manual',
      enabled: true,
      random: true,
      pool: [
        { name: 'One', appearance: { fontSize: 18 } },
        { name: 'Two', appearance: { fontSize: 19 } },
        { name: 'Three', appearance: { fontSize: 20 } },
        { name: 'Four', appearance: { fontSize: 21 } },
        { name: 'Five', appearance: { fontSize: 22 } },
        { name: 'Six', appearance: { fontSize: 23 } }
      ]
    }
  });

  assert.equal(normalized.userStyles.length, 1);
  assert.equal(normalized.userStyles[0].nick, 'viewer');
  assert.equal(normalized.userStyles[0].styleKey, 'first');
  assert.equal(normalized.rotation.pool.length, 5);
  assert.equal(normalized.rotation.enabled, true);
  assert.equal(normalized.rotation.random, true);
});

test('overlayView и widgetView возвращают renderer-представления без внутренних полей', () => {
  const normalized = config.normalizeConfig({
    hideCommands: false,
    ignoredBots: ' BotA, BotB ',
    userStyles: [{ nick: 'Viewer', appearance: { fontSize: 22 } }]
  });
  const overlay = config.overlayView(normalized);
  const widget = config.widgetView(normalized);

  assert.equal(overlay.hideCommands, false);
  assert.equal(overlay.ignoredBots, 'BotA, BotB');
  assert.equal(overlay.userStyles.viewer.fontSize, 22);
  assert.equal(Object.hasOwn(overlay, 'widget'), false);

  assert.equal(widget.hideCommands, false);
  assert.equal(widget.ignoredBots, 'BotA, BotB');
  assert.equal(widget.highlightMentions, false);
  assert.equal(widget.mentionLonger, false);
  assert.equal(Object.hasOwn(widget, 'widget'), false);
});

test('sanitizePreview применяет отдельный лимит размера шрифта виджета', () => {
  const preview = config.sanitizePreview(
    { fontSize: 60, highlightMentions: true, mentionLonger: true },
    config.MAX_FONT_SIZE_WIDGET
  );

  assert.equal(preview.fontSize, 60);
  assert.equal(preview.highlightMentions, true);
  assert.equal(preview.mentionLonger, true);
});
