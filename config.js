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
  mentionLonger: false
};

const APPEARANCE_KEYS = Object.keys(OVERLAY_APPEARANCE_DEFAULTS);

// Общее для оверлея и виджета: подключение и фильтры
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
  widgetPort: DEFAULT_WIDGET_PORT
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
    mentionLonger: bool(s.mentionLonger, d.mentionLonger)
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
    widgetPort: normalizePort(s.widgetPort)
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

// Живой предпросмотр из окна настроек: те же поля, что в overlayView, но проверенные
function sanitizePreview(src) {
  const s = src && typeof src === 'object' ? src : {};
  return Object.assign(sanitizeAppearance(s, OVERLAY_APPEARANCE_DEFAULTS), {
    hideCommands: bool(s.hideCommands, GENERAL_DEFAULTS.hideCommands),
    ignoredBots: typeof s.ignoredBots === 'string' ? s.ignoredBots.trim() : GENERAL_DEFAULTS.ignoredBots
  });
}

module.exports = {
  FONT_FAMILIES,
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
