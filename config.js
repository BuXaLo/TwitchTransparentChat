'use strict';

/**
 * Настройки приложения: значения по умолчанию, проверка и представления для оверлея и виджета.
 * Модуль не зависит от Electron, поэтому его можно проверять отдельно.
 *
 * Хранилище остаётся плоским, как в прежних версиях: общие настройки и внешний вид оверлея лежат
 * на верхнем уровне, а внешний вид виджета для OBS лежит в объекте widget.
 */

const FONT_FAMILIES = ['system', "'Inter', sans-serif", "'Montserrat', sans-serif", "'Roboto', sans-serif"];
const TEXT_ALIGNS = ['left', 'center', 'right'];
const ANIMATIONS = ['slide-left', 'slide-down', 'fade', 'zoom'];
const DIRECTIONS = ['top', 'bottom'];
const LAYOUTS = ['inline', 'block'];

// Константы движка стилей v1.3.1
const BG_MODES = ['solid', 'grad-mono', 'grad-dual'];
const BG_MONO_MODES = ['tone', 'fade'];
const BG_DIRECTIONS = ['to right', 'to left', 'to bottom', 'to top', '45deg', '135deg', 'radial'];
const PLATE_SHAPES = ['rounded', 'strict'];
const BORDER_EFFECTS = ['static', 'neon', 'pulse', 'rgb', 'cyber', 'breathing'];

const DEFAULT_WIDGET_PORT = 8769;
const MIN_PORT = 1024;
const MAX_PORT = 65535;

// Предел размера шрифта: для виджета вдвое больше, потому что на стриме он обычно крупнее, чем перед глазами
const MAX_FONT_SIZE_OVERLAY = 36;
const MAX_FONT_SIZE_WIDGET = 72;

// Внешний вид: одинаковый набор для оверлея и для виджета
const OVERLAY_APPEARANCE_DEFAULTS = {
  messageLifetime: 15,
  fontSize: 14,
  fontFamily: 'system',
  textAlign: 'left',
  bgOpacity: 50,
  animation: 'slide-left',
  chatDirection: 'top',
  layoutMode: 'inline',
  showSub: false,
  showResub: false,
  showGift: false,
  showRaid: false,
  highlightMentions: true,
  mentionLonger: false,

  // --- Плашка (Контейнер) ---
  bgMode: 'solid', // 'solid' | 'grad-mono' | 'grad-dual'
  bgColor1: '#000000',
  bgColor2: '#251640',
  bgMonoMode: 'tone', // 'tone' (светлее<->темнее) | 'fade' (в прозрачность)
  bgDirection: 'to right', // 'to right' | 'to left' | 'to bottom' | 'to top' | '45deg' | '135deg' | 'radial'
  plateShape: 'rounded', // 'rounded' (6px) | 'strict' (0px)
  borderWidth: 0, // 0..5 px
  borderColor: '#9146FF',
  borderColor2: '#FFFFFF', // второй цвет (блик) для эффекта бегущего контура (cyber)
  borderEffect: 'static', // 'static' | 'neon' | 'pulse' | 'rgb' | 'cyber' | 'breathing'
  borderEffectSpeed: 5, // 1..10 (скорость анимации эффекта границы, 5 = стандартная 1x)
  borderEffectSync: false, // синхронизация фазы динамического эффекта между всеми сообщениями

  // --- Текст сообщения ---
  textColor: '#FFFFFF',
  textOutlineWidth: 2, // 0..4 px (дефолт 2px сохраняет прежний вид)
  textOutlineColor: '#000000',

  // --- Кастомизация никнеймов ---
  customNickEnabled: false,
  customNickColor: '#9146FF',
  customNickOutlineWidth: 2, // 0..4 px
  customNickOutlineColor: '#000000'
};

const APPEARANCE_KEYS = Object.keys(OVERLAY_APPEARANCE_DEFAULTS);

// Общее для оверлея и виджета: подключение, фильтры, пропущенная версия обновления и сохраненные стили
const GENERAL_DEFAULTS = {
  channel: '',
  useProxy: false,
  proxyHost: '',
  proxyPort: '',
  proxyUser: '',
  proxyPass: '',
  hideCommands: true,
  ignoredBots: 'Nightbot, StreamElements, Moobot, Fossabot',
  autoStart: false,
  widgetEnabled: false,
  widgetPort: DEFAULT_WIDGET_PORT,
  ignoredUpdateVersion: '',
  customPresets: []
};

const DEFAULT_CONFIG = Object.assign({}, GENERAL_DEFAULTS, OVERLAY_APPEARANCE_DEFAULTS);

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function oneOf(v, list, def) {
  return list.includes(v) ? v : def;
}

function bool(v, def) {
  return typeof v === 'boolean' ? v : def;
}

function text(v, def = '') {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return def;
}

function hexColor(v, def = '#000000') {
  if (typeof v !== 'string') return def;
  const s = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase();
  }
  return def;
}

function normalizePort(v, def = DEFAULT_WIDGET_PORT) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= MIN_PORT && n <= MAX_PORT ? n : def;
}

function isValidPort(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= MIN_PORT && n <= MAX_PORT;
}

// Приводит внешний вид к допустимым значениям. Отсутствующие или испорченные поля берутся из defaults.
function sanitizeAppearance(src, defaults = OVERLAY_APPEARANCE_DEFAULTS, maxFontSize = MAX_FONT_SIZE_OVERLAY) {
  const s = src && typeof src === 'object' ? src : {};
  const d = defaults;
  return {
    messageLifetime: clampInt(s.messageLifetime, 0, 300, d.messageLifetime),
    fontSize: clampInt(s.fontSize, 10, maxFontSize, d.fontSize),
    fontFamily: oneOf(s.fontFamily, FONT_FAMILIES, d.fontFamily),
    textAlign: oneOf(s.textAlign, TEXT_ALIGNS, d.textAlign),
    bgOpacity: clampInt(s.bgOpacity, 0, 100, d.bgOpacity),
    animation: oneOf(s.animation, ANIMATIONS, d.animation),
    chatDirection: oneOf(s.chatDirection, DIRECTIONS, d.chatDirection),
    layoutMode: oneOf(s.layoutMode, LAYOUTS, d.layoutMode),
    showSub: bool(s.showSub, d.showSub),
    showResub: bool(s.showResub, d.showResub),
    showGift: bool(s.showGift, d.showGift),
    showRaid: bool(s.showRaid, d.showRaid),
    highlightMentions: bool(s.highlightMentions, d.highlightMentions),
    mentionLonger: bool(s.mentionLonger, d.mentionLonger),

    // Плашка
    bgMode: oneOf(s.bgMode, BG_MODES, d.bgMode),
    bgColor1: hexColor(s.bgColor1, d.bgColor1),
    bgColor2: hexColor(s.bgColor2, d.bgColor2),
    bgMonoMode: oneOf(s.bgMonoMode, BG_MONO_MODES, d.bgMonoMode),
    bgDirection: oneOf(s.bgDirection, BG_DIRECTIONS, d.bgDirection),
    plateShape: oneOf(s.plateShape, PLATE_SHAPES, d.plateShape),
    borderWidth: clampInt(s.borderWidth, 0, 5, d.borderWidth),
    borderColor: hexColor(s.borderColor, d.borderColor),
    borderColor2: hexColor(s.borderColor2, d.borderColor2),
    borderEffect: oneOf(s.borderEffect, BORDER_EFFECTS, d.borderEffect),
    borderEffectSpeed: clampInt(s.borderEffectSpeed, 1, 10, d.borderEffectSpeed),
    borderEffectSync: bool(s.borderEffectSync, d.borderEffectSync),

    // Текст
    textColor: hexColor(s.textColor, d.textColor),
    textOutlineWidth: clampInt(s.textOutlineWidth, 0, 4, d.textOutlineWidth),
    textOutlineColor: hexColor(s.textOutlineColor, d.textOutlineColor),

    // Никнеймы
    customNickEnabled: bool(s.customNickEnabled, d.customNickEnabled),
    customNickColor: hexColor(s.customNickColor, d.customNickColor),
    customNickOutlineWidth: clampInt(s.customNickOutlineWidth, 0, 4, d.customNickOutlineWidth),
    customNickOutlineColor: hexColor(s.customNickOutlineColor, d.customNickOutlineColor)
  };
}

// Начальные значения виджета: копия внешнего вида оверлея, но без подсветки упоминаний
function widgetSeed(overlayAppearance) {
  return Object.assign({}, overlayAppearance, { highlightMentions: false, mentionLonger: false });
}

/**
 * Полная проверка настроек. Подходит и для того, что пришло из окна настроек, и для того, что лежит
 * в хранилище (в том числе в старом формате без новых полей).
 * Если объекта widget нет, он создаётся копией внешнего вида оверлея.
 */
function normalizeConfig(src) {
  const s = src && typeof src === 'object' ? src : {};
  const g = GENERAL_DEFAULTS;

  const out = {
    channel: text(s.channel),
    useProxy: bool(s.useProxy, g.useProxy),
    proxyHost: text(s.proxyHost),
    proxyPort: text(s.proxyPort),
    proxyUser: text(s.proxyUser),
    proxyPass: text(s.proxyPass),
    hideCommands: bool(s.hideCommands, g.hideCommands),
    ignoredBots: typeof s.ignoredBots === 'string' ? s.ignoredBots.trim() : g.ignoredBots,
    autoStart: bool(s.autoStart, g.autoStart),
    widgetEnabled: bool(s.widgetEnabled, g.widgetEnabled),
    widgetPort: normalizePort(s.widgetPort),
    ignoredUpdateVersion: text(s.ignoredUpdateVersion, g.ignoredUpdateVersion),
    customPresets: Array.isArray(s.customPresets)
      ? s.customPresets
          .filter((p) => p && typeof p === 'object')
          .map((p) => ({
            name: text(p.name, 'Style').slice(0, 40) || 'Style',
            appearance: sanitizeAppearance(p.appearance, OVERLAY_APPEARANCE_DEFAULTS, MAX_FONT_SIZE_WIDGET)
          }))
      : []
  };

  Object.assign(out, sanitizeAppearance(s, OVERLAY_APPEARANCE_DEFAULTS));
  out.widget = sanitizeAppearance(s.widget, widgetSeed(pickAppearance(out)), MAX_FONT_SIZE_WIDGET);
  return out;
}

function pickAppearance(cfg) {
  const out = {};
  APPEARANCE_KEYS.forEach((k) => { out[k] = cfg[k]; });
  return out;
}

// Что нужно отображению чата в оверлее
function overlayView(cfg) {
  return Object.assign(pickAppearance(cfg), {
    hideCommands: cfg.hideCommands,
    ignoredBots: cfg.ignoredBots
  });
}

// Что нужно отображению чата в виджете: свой внешний вид и общие фильтры
function widgetView(cfg) {
  return Object.assign({}, cfg.widget, {
    hideCommands: cfg.hideCommands,
    ignoredBots: cfg.ignoredBots
  });
}

// Живой предпросмотр из окна настроек: те же поля, что в overlayView / widgetView, но проверенные
function sanitizePreview(src, maxFontSize = MAX_FONT_SIZE_OVERLAY) {
  const s = src && typeof src === 'object' ? src : {};
  return Object.assign(sanitizeAppearance(s, OVERLAY_APPEARANCE_DEFAULTS, maxFontSize), {
    hideCommands: bool(s.hideCommands, GENERAL_DEFAULTS.hideCommands),
    ignoredBots: typeof s.ignoredBots === 'string' ? s.ignoredBots.trim() : GENERAL_DEFAULTS.ignoredBots
  });
}

module.exports = {
  FONT_FAMILIES,
  BG_MODES,
  BG_MONO_MODES,
  BG_DIRECTIONS,
  PLATE_SHAPES,
  BORDER_EFFECTS,
  DEFAULT_WIDGET_PORT,
  MAX_FONT_SIZE_OVERLAY,
  MAX_FONT_SIZE_WIDGET,
  MIN_PORT,
  MAX_PORT,
  OVERLAY_APPEARANCE_DEFAULTS,
  APPEARANCE_KEYS,
  GENERAL_DEFAULTS,
  DEFAULT_CONFIG,
  normalizeConfig,
  normalizePort,
  isValidPort,
  sanitizeAppearance,
  sanitizePreview,
  overlayView,
  widgetView
};
