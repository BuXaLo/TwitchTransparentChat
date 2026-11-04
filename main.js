const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, protocol, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Store = require('electron-store');
const { connectTwitch, disconnectTwitch, makeTestSequence } = require('./twitch');
const emotes = require('./emotes');
const { t, setLang, getStrings } = require('./locales');
const configLib = require('./config');
const { createWidgetServer } = require('./widget-server');
const updater = require('./updater');

const HOTKEY = 'CommandOrControl+Alt+F9';
const SETTINGS_HOTKEY = 'CommandOrControl+Alt+F10'; // открыть окно настроек

// Только один экземпляр: повторный запуск возвращает окно уже работающего оверлея (см. 'second-instance')
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

// Протокол emote:// — через него main-процесс отдаёт картинки смайлов/бейджей
// (так они идут через SOCKS5-прокси, если он включён). Должен быть объявлен до app.ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'emote', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } },
  { scheme: 'card', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

const store = new Store({
  name: 'config'
});

let win = null;
let tray = null;
let isClickThrough = false;
let settingsWin = null;
let chatStarted = false;
let lastConnectedKey = null;
let pendingUpdateInfo = null;
const testRunning = { overlay: false, widget: false };

const TEST_STEP_DELAY = 450; // пауза между тестовыми сообщениями, мс
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

setLang(store.get('language', 'en'));

function proxyFromConfig(cfg) {
  if (cfg && cfg.useProxy && cfg.proxyHost && cfg.proxyPort) {
    return {
      host: String(cfg.proxyHost).trim(),
      port: parseInt(cfg.proxyPort, 10),
      username: cfg.proxyUser || '',
      password: cfg.proxyPass || ''
    };
  }
  return null;
}

function connectionKey(cfg) {
  return [
    String(cfg.channel || '').trim().toLowerCase(),
    cfg.useProxy ? '1' : '0',
    String(cfg.proxyHost || '').trim(),
    String(cfg.proxyPort || '').trim(),
    String(cfg.proxyUser || '').trim(),
    String(cfg.proxyPass || '')
  ].join('|');
}

function sendToWindow(channel, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function sendToSettings(channel, payload) {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send(channel, payload);
  }
}

/* ------------------------------------------------------------------ */
/* Сквозной режим, видимость, панель задач */
/* ------------------------------------------------------------------ */

function setClickThrough(value) {
  isClickThrough = value;
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(isClickThrough, { forward: true });
    win.webContents.send('mode-changed', isClickThrough);
  }
  refreshTray();
}

function toggleClickThrough() {
  setClickThrough(!isClickThrough);
}

// Показывает окно (если оно скрыто) и ставит его поверх всех, не отбирая фокус у игры
function revealOverlay() {
  if (!win || win.isDestroyed()) return;
  if (!win.isVisible()) win.showInactive();
  win.setAlwaysOnTop(true, 'screen-saver');
}

function toggleVisibility() {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible()) win.hide();
  else revealOverlay();
  refreshTray();
}

// Настройки открываются в отдельном окне: оверлей остаётся на месте, сквозной режим и скрытие не мешают
function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show();
    settingsWin.focus();
    if (pendingUpdateInfo) {
      sendToSettings('update-available', pendingUpdateInfo);
    }
    return;
  }

  settingsWin = new BrowserWindow({
    width: 620,
    height: 780,
    minWidth: 520,
    minHeight: 540,
    title: t('settings.title'),
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#101014',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  settingsWin.setMenu(null);
  settingsWin.loadFile('settings.html');

  settingsWin.webContents.once('did-finish-load', () => {
    if (pendingUpdateInfo) {
      sendToSettings('update-available', pendingUpdateInfo);
    }
  });

  settingsWin.on('closed', () => {
    settingsWin = null;
    // Окно закрыли без сохранения: и оверлей, и виджет возвращаются к сохранённому виду (после предпросмотра)
    const saved = getConfig();
    sendToWindow('config-applied', configLib.overlayView(saved));
    widgetServer.broadcast('state', widgetState());
  });
}

/* ------------------------------------------------------------------ */
/* Автозапуск вместе с Windows */
/* ------------------------------------------------------------------ */

function getAutoStartPath() {
  if (!app.isPackaged) return null;
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function applyAutoStart(enabled) {
  const exe = getAutoStartPath();
  if (!exe) return;
  try {
    const wanted = !!enabled;
    if (app.getLoginItemSettings({ path: exe }).openAtLogin !== wanted) {
      app.setLoginItemSettings({ openAtLogin: wanted, path: exe });
    }
  } catch (e) {
    console.error('[AutoStart]', e);
  }
}

/* ------------------------------------------------------------------ */
/* Иконка в трее */
/* ------------------------------------------------------------------ */

function isOverlayVisible() {
  return !!(win && !win.isDestroyed() && win.isVisible());
}

function buildTrayMenu() {
  const visible = !!(win && !win.isDestroyed() && win.isVisible());
  return Menu.buildFromTemplate([
    { label: visible ? t('tray.hide') : t('tray.show'), click: toggleVisibility },
    { label: t('tray.clickThrough'), type: 'checkbox', checked: isClickThrough, click: toggleClickThrough },
    { label: t('tray.settings'), click: openSettingsWindow },
    { type: 'separator' },
    { label: t('tray.quit'), click: () => app.quit() }
  ]);
}

function refreshTray() {
  // Кнопка в настройках всегда синхронна с реальной видимостью окна (трей, кнопка и т.п.)
  sendToSettings('overlay-visibility', isOverlayVisible());
  if (!tray) return;
  tray.setToolTip(t('tray.tooltip'));
  tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32, quality: 'best' });

  tray = new Tray(icon);
  tray.on('click', () => {
    refreshTray();
    tray.popUpContextMenu();
  });
  refreshTray();
}

/* ------------------------------------------------------------------ */
/* Окно */
/* ------------------------------------------------------------------ */

const DEFAULT_BOUNDS = { width: 420, height: 650 };
const MIN_WINDOW_W = 200;
const MIN_WINDOW_H = 150;
const MIN_VISIBLE_W = 100;
const MIN_VISIBLE_H = 50;
const BOUNDS_TOLERANCE = 3;

let correctedBounds = null;

function numberOrUndefined(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function sameBounds(a, b) {
  return ['x', 'y', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) <= BOUNDS_TOLERANCE);
}

function visibleSize(bounds, area) {
  const w = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
  const h = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
  return { w: Math.max(0, w), h: Math.max(0, h) };
}

function fitBoundsToDisplays(saved, displays, primary) {
  const w = numberOrUndefined(saved && saved.width);
  const h = numberOrUndefined(saved && saved.height);
  const bounds = {
    width: w > 0 ? Math.max(w, MIN_WINDOW_W) : DEFAULT_BOUNDS.width,
    height: h > 0 ? Math.max(h, MIN_WINDOW_H) : DEFAULT_BOUNDS.height,
    x: numberOrUndefined(saved && saved.x),
    y: numberOrUndefined(saved && saved.y)
  };

  if (bounds.x === undefined || bounds.y === undefined) return { bounds, corrected: false };

  const onScreen = displays.some((d) => {
    const v = visibleSize(bounds, d.workArea);
    return v.w >= MIN_VISIBLE_W && v.h >= MIN_VISIBLE_H;
  });
  if (onScreen) return { bounds, corrected: false };

  const area = primary.workArea;
  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  return {
    bounds: {
      width,
      height,
      x: Math.round(area.x + (area.width - width) / 2),
      y: Math.round(area.y + (area.height - height) / 2)
    },
    corrected: true
  };
}

function persistBounds() {
  if (!win || win.isDestroyed() || win.isMaximized() || win.isMinimized()) return;
  const current = win.getBounds();
  if (correctedBounds) {
    if (sameBounds(current, correctedBounds)) return;
    correctedBounds = null;
  }
  store.set('window_bounds', current);
}

function createWindow() {
  const fitted = fitBoundsToDisplays(store.get('window_bounds'), screen.getAllDisplays(), screen.getPrimaryDisplay());
  const bounds = fitted.bounds;
  correctedBounds = fitted.corrected ? Object.assign({}, bounds) : null;

  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: MIN_WINDOW_W,
    minHeight: MIN_WINDOW_H,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile('index.html');

  let saveBoundsTimeout = null;
  const debouncedSaveBounds = () => {
    clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(persistBounds, 400);
  };

  win.on('resize', debouncedSaveBounds);
  win.on('move', debouncedSaveBounds);
  win.on('show', refreshTray);
  win.on('hide', refreshTray);
  win.on('close', () => {
    clearTimeout(saveBoundsTimeout);
    persistBounds();
  });
  win.on('closed', () => {
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
  });

  win.webContents.once('did-finish-load', () => {
    const ok = globalShortcut.register(HOTKEY, toggleClickThrough);
    globalShortcut.register(SETTINGS_HOTKEY, openSettingsWindow); // занят другой программой — просто остаётся недоступным
    win.webContents.send('hotkey-status', { ok });
    startInitialChat();
    runStartupUpdateCheck();
  });
}

/* ------------------------------------------------------------------ */
/* Настройки, чат и виджет для OBS */
/* ------------------------------------------------------------------ */

function getConfig() {
  return configLib.normalizeConfig(store.get('twitch_config', {}));
}

function currentLanguage() {
  return store.get('language', 'en');
}

function widgetState(customWidgetView) {
  const lang = currentLanguage();
  const view = customWidgetView || configLib.widgetView(getConfig());
  return { config: view, strings: getStrings(lang), language: lang };
}

const widgetServer = createWidgetServer({
  rootDir: __dirname,
  getState: () => widgetState(),
  fetchImage: (url) => emotes.fetchImage(url),
  isHostAllowed: (host) => emotes.ALLOWED_IMAGE_HOSTS.has(host),
  getCardImage: readCardImage,
  onChange: () => sendToSettings('widget-status', widgetStatus())
});

/* ------------------------------------------------------------------ */
/* Свои картинки плашек (userData/card-images/<sha1>.webp)             */
/* ------------------------------------------------------------------ */

let _cardImageDir = null;
function cardImageDir() {
  if (!_cardImageDir) _cardImageDir = path.join(app.getPath('userData'), 'card-images');
  return _cardImageDir;
}
const CARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // лимит: 2 МБ
const CARD_IMAGE_MAX_SIDE = 1600; // лимит: 1600 px по длинной стороне (проверяется в рендерере)
const CARD_IMAGE_ID_RE = configLib.CARD_IMAGE_ID_RE;

// Файл картинки называется так, как её назвал пользователь: userData/card-images/<имя>.webp.
// Имя очищается от символов, недопустимых в именах файлов Windows.
function cardImageSlug(name) {
  let s = String(name || '').normalize('NFC')
    .replace(/[<>:"\/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 40)
    .replace(/[. ]+$/, '');
  if (!s) s = 'Picture';
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s += '_';
  return s;
}

function listCardImages() {
  try {
    return fs.readdirSync(cardImageDir())
      .filter((f) => f.toLowerCase().endsWith('.webp'))
      .map((f) => f.slice(0, -5))
      .filter((id) => CARD_IMAGE_ID_RE.test(id))
      .sort((x, y) => x.localeCompare(y))
      .map((id) => ({ id, name: id }));
  } catch (e) {
    return [];
  }
}

// Свободное имя: при совпадении (Windows не различает регистр) добавляется « (2)», « (3)»…
function uniqueCardId(base, ignoreId) {
  const taken = new Set(listCardImages().map((e) => e.id.toLowerCase()));
  if (ignoreId) taken.delete(ignoreId.toLowerCase());
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1000; i++) {
    const suffix = ` (${i})`;
    const cand = base.slice(0, 40 - suffix.length).replace(/[. ]+$/, '') + suffix;
    if (!taken.has(cand.toLowerCase())) return cand;
  }
  return base;
}

function cardImagePath(id) {
  return path.join(cardImageDir(), `${id}.webp`);
}

function readCardImage(id) {
  if (!CARD_IMAGE_ID_RE.test(String(id || ''))) return null;
  try {
    return fs.readFileSync(cardImagePath(id));
  } catch (e) {
    return null; // файл пропал: фоллбек — виджет/оверлей рисует плашку без картинки
  }
}

// Подменяет ссылки на картинку во всех стилях (оверлей, виджет, свои пресеты).
// newId === '' означает удаление картинки: стиль откатывается на «без картинки».
function remapCardRefs(map) {
  let cfg;
  try { cfg = getConfig(); } catch (e) { return false; }
  let changed = false;
  const fix = (a) => {
    if (a && a.cardImageCustom && Object.prototype.hasOwnProperty.call(map, a.cardImageCustom)) {
      a.cardImageCustom = map[a.cardImageCustom];
      changed = true;
    }
  };
  fix(cfg);
  fix(cfg.widget);
  (cfg.customPresets || []).forEach((p) => fix(p.appearance));
  if (changed) {
    store.set('twitch_config', cfg);
    try { sendToWindow('config-applied', configLib.overlayView(cfg)); } catch (e) { /* окно закрыто */ }
    try { applyWidgetSettings(cfg); } catch (e) { /* виджет выключен */ }
  }
  return changed;
}

// Миграция раннего формата (<sha1>.webp + index.json) в файлы с понятными именами
function migrateCardImages() {
  const dir = cardImageDir();
  let files;
  try { files = fs.readdirSync(dir); } catch (e) { return; }
  const legacy = files.filter((f) => /^[0-9a-f]{40}\.webp$/.test(f));
  if (!legacy.length && !files.includes('index.json')) return;
  let names = {};
  try {
    JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')).forEach((e) => { if (e && e.sha) names[e.sha] = e.name; });
  } catch (e) { /* реестра нет */ }
  const map = {};
  legacy.forEach((f) => {
    const sha = f.slice(0, -5);
    const id = uniqueCardId(cardImageSlug(names[sha] || 'Picture'));
    try {
      fs.renameSync(path.join(dir, f), cardImagePath(id));
      map[sha] = id;
    } catch (e) { /* пропускаем */ }
  });
  try { fs.unlinkSync(path.join(dir, 'index.json')); } catch (e) { /* уже нет */ }
  if (Object.keys(map).length) remapCardRefs(map);
}

// Сохранение своей картинки: рендерер уже конвертировал её в WebP через canvas и передал ArrayBuffer.
// Файл сохраняется под заданным именем; при совпадении имени добавляется « (2)».
ipcMain.handle('save-card-image', (event, arrayBuffer, name) => {
  try {
    const buf = Buffer.from(arrayBuffer || []);
    if (!buf.length || buf.length > CARD_IMAGE_MAX_BYTES) return { ok: false, error: 'size' };
    fs.mkdirSync(cardImageDir(), { recursive: true });
    const id = uniqueCardId(cardImageSlug(name));
    fs.writeFileSync(cardImagePath(id), buf);
    return { ok: true, id, name: id, images: listCardImages() };
  } catch (e) {
    return { ok: false, error: e.code || 'error' };
  }
});

// Список загруженных картинок для выбора в настройках
ipcMain.handle('list-card-images', () => listCardImages());

// Переименование = переименование файла
ipcMain.handle('rename-card-image', (event, oldId, name) => {
  if (!CARD_IMAGE_ID_RE.test(String(oldId || ''))) return { ok: false };
  if (!fs.existsSync(cardImagePath(oldId))) return { ok: false };
  const id = uniqueCardId(cardImageSlug(name), oldId);
  if (id !== oldId) {
    try {
      if (id.toLowerCase() === oldId.toLowerCase()) {
        const tmp = cardImagePath(`${oldId}.tmp-${Date.now()}`);
        fs.renameSync(cardImagePath(oldId), tmp);
        fs.renameSync(tmp, cardImagePath(id));
      } else {
        fs.renameSync(cardImagePath(oldId), cardImagePath(id));
      }
    } catch (e) {
      return { ok: false };
    }
    remapCardRefs({ [oldId]: id });
  }
  return { ok: true, id, name: id, oldId, images: listCardImages() };
});

ipcMain.handle('delete-card-image', (event, id) => {
  if (!CARD_IMAGE_ID_RE.test(String(id || ''))) return { ok: false };
  try { fs.unlinkSync(cardImagePath(id)); } catch (e) { /* уже удалён */ }
  remapCardRefs({ [id]: '' });
  return { ok: true, images: listCardImages() };
});

function widgetStatus() {
  return Object.assign({ enabled: !!getConfig().widgetEnabled }, widgetServer.getStatus());
}

async function applyWidgetSettings(cfg) {
  if (cfg.widgetEnabled) {
    try {
      await widgetServer.start(cfg.widgetPort);
    } catch (e) {
      console.error('[Widget] start failed:', e.message);
    }
  } else {
    await widgetServer.stop();
  }
}

function broadcastMessage(msg) {
  sendToWindow('new-message', msg);
  widgetServer.broadcast('chat', msg);
}

function broadcastRemove(info) {
  sendToWindow('message-removed', info);
  widgetServer.broadcast('remove', info);
}

function startChat(cfg) {
  chatStarted = true;
  lastConnectedKey = connectionKey(cfg);
  connectTwitch({
    channel: cfg.channel,
    useProxy: cfg.useProxy,
    proxy: {
      host: cfg.proxyHost,
      port: cfg.proxyPort,
      username: cfg.proxyUser,
      password: cfg.proxyPass
    },
    onMessage: broadcastMessage,
    onRemove: broadcastRemove,
    onError: (err) => sendToWindow('status-update', { error: true, text: err }),
    onStatus: (status, code) => sendToWindow('status-update', { error: false, text: status, code })
  });
}

function startInitialChat() {
  const cfg = getConfig();
  if (cfg.channel) startChat(cfg);
  else openSettingsWindow();
}

/* ------------------------------------------------------------------ */
/* Проверка обновлений при старте и через настройки */
/* ------------------------------------------------------------------ */

async function runStartupUpdateCheck() {
  const cfg = getConfig();
  emotes.setNetwork(proxyFromConfig(cfg));

  const res = await updater.checkForUpdates({
    ignoredVersion: cfg.ignoredUpdateVersion,
    lang: currentLanguage(),
    ignoreSkipped: false
  });

  if (res && res.hasUpdate) {
    pendingUpdateInfo = res;
    openSettingsWindow();
  }
}

ipcMain.handle('check-for-updates', async (event, opts) => {
  const cfg = getConfig();
  emotes.setNetwork(proxyFromConfig(cfg));
  const res = await updater.checkForUpdates({
    ignoredVersion: cfg.ignoredUpdateVersion,
    lang: currentLanguage(),
    ignoreSkipped: !!(opts && opts.manual)
  });
  if (res && res.hasUpdate) pendingUpdateInfo = res;
  return res;
});

ipcMain.handle('skip-update-version', (event, version) => {
  const cfg = getConfig();
  cfg.ignoredUpdateVersion = String(version || '').trim();
  store.set('twitch_config', cfg);
  pendingUpdateInfo = null;
  return { ok: true, ignoredUpdateVersion: cfg.ignoredUpdateVersion };
});

ipcMain.handle('install-update', async (event, updateInfo) => {
  // URL из данных рендерера проверяются в updater: открываются только ссылки репозитория
  const res = await updater.downloadAndInstallUpdate(pendingUpdateInfo || updateInfo, {
    onProgress: (prog) => sendToSettings('update-progress', prog),
    onDownloaded: () => sendToSettings('update-progress', { downloaded: true }),
    onError: (msg) => sendToSettings('update-progress', { error: msg })
  });
  if (res && res.mode !== 'browser-fallback') pendingUpdateInfo = null;
  return res;
});

/* ------------------------------------------------------------------ */
/* IPC обработчики настроек и предпросмотра */
/* ------------------------------------------------------------------ */

ipcMain.handle('load-config', () => Object.assign({}, getConfig(), {
  language: currentLanguage(),
  currentVersion: app.getVersion(),
  isPortable: updater.isPortableBuild(),
  pendingUpdate: pendingUpdateInfo,
  defaults: configLib.OVERLAY_APPEARANCE_DEFAULTS
}));

ipcMain.handle('save-config', async (event, raw) => {
  const prev = getConfig();
  const forceReconnect = !!(raw && raw._forceReconnect);
  const cfg = configLib.normalizeConfig(Object.assign({}, raw, {
    ignoredUpdateVersion: raw.ignoredUpdateVersion !== undefined ? raw.ignoredUpdateVersion : prev.ignoredUpdateVersion,
    customPresets: Array.isArray(raw.customPresets) ? raw.customPresets : prev.customPresets
  }));
  store.set('twitch_config', cfg);
  applyAutoStart(cfg.autoStart);

  sendToWindow('config-applied', configLib.overlayView(cfg));

  // Перезапускаем подключение к чату только при явном нажатии «Сохранить и подключиться»
  // либо если изменились параметры канала/прокси (чтобы сохранение стилей из модалок не рвало сокет)
  const newKey = connectionKey(cfg);
  if (forceReconnect || !chatStarted || newKey !== lastConnectedKey) {
    startChat(cfg);
  }

  await applyWidgetSettings(cfg);
  widgetServer.broadcast('state', widgetState());

  return { ok: true, widget: widgetStatus(), widgetPort: cfg.widgetPort, customPresets: cfg.customPresets };
});

ipcMain.handle('get-overlay-state', () => {
  const lang = currentLanguage();
  return { config: configLib.overlayView(getConfig()), strings: getStrings(lang), language: lang };
});

// Живой предпросмотр оверлея (применяется на лету, но не сохраняется в store)
ipcMain.on('preview-overlay', (event, view) => {
  sendToWindow('config-applied', configLib.sanitizePreview(view, configLib.MAX_FONT_SIZE_OVERLAY));
});

// Живой предпросмотр виджета OBS по SSE (на лету, без сохранения)
ipcMain.on('preview-widget', (event, view) => {
  const sanitized = configLib.sanitizePreview(view, configLib.MAX_FONT_SIZE_WIDGET);
  widgetServer.broadcast('state', widgetState(sanitized));
});

ipcMain.on('open-settings-window', openSettingsWindow);

// Скрыть / показать оверлей из настроек: ровно то же действие, что пункт в трее
ipcMain.handle('get-overlay-visible', () => isOverlayVisible());
ipcMain.handle('toggle-overlay-visibility', () => {
  toggleVisibility();
  return isOverlayVisible();
});

// Ссылка «Поддержать автора»: адрес зашит в коде, из окна настроек его подменить нельзя
const SUPPORT_URL = 'https://www.donationalerts.com/r/buxalo';
ipcMain.handle('open-support-link', () => {
  shell.openExternal(SUPPORT_URL);
  return true;
});
ipcMain.on('enable-click-through', () => setClickThrough(true));

ipcMain.handle('get-strings', (event, lang) => getStrings(lang || currentLanguage()));

ipcMain.handle('set-language', (event, lang) => {
  const applied = setLang(lang);
  store.set('language', applied);
  refreshTray();

  const strings = getStrings(applied);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.setTitle(t('settings.title'));
  sendToWindow('strings-updated', { strings, language: applied });
  sendToSettings('strings-updated', { strings, language: applied });
  widgetServer.broadcast('state', widgetState());
  return strings;
});

ipcMain.handle('get-widget-status', () => widgetStatus());

ipcMain.handle('copy-text', (event, text) => {
  clipboard.writeText(String(text).slice(0, 2000));
  return true;
});

async function runTest(kind, channel, sendMessage, sendRemove, warmupMs = 0) {
  if (testRunning[kind]) return;
  testRunning[kind] = true;
  try {
    const cfg = getConfig();
    if (!chatStarted) {
      emotes.setNetwork(proxyFromConfig(cfg));
    }
    await Promise.race([emotes.ensureGlobalEmotes(), new Promise((resolve) => setTimeout(resolve, 2500))]);

    if (warmupMs) await sleep(warmupMs);
    for (const step of makeTestSequence(channel || cfg.channel || '')) {
      await sleep(step.delay !== undefined ? step.delay : TEST_STEP_DELAY);
      if (step.remove) sendRemove(step.remove);
      else sendMessage(step.msg);
    }
  } finally {
    testRunning[kind] = false;
  }
}

ipcMain.on('send-test-message', (event, channel) => {
  // Если оверлей был скрыт, даём окну прорисоваться: иначе анимация появления проигрывается «вхолостую» ещё до показа
  const wasHidden = !!(win && !win.isDestroyed() && !win.isVisible());
  revealOverlay();
  runTest(
    'overlay',
    channel,
    (msg) => sendToWindow('new-message', msg),
    (info) => sendToWindow('message-removed', info),
    wasHidden ? 500 : 0
  );
});

ipcMain.on('send-widget-test', (event, channel) => {
  runTest(
    'widget',
    channel,
    (msg) => widgetServer.broadcast('chat', msg),
    (info) => widgetServer.broadcast('remove', info)
  );
});

/* ------------------------------------------------------------------ */
/* Запуск */
/* ------------------------------------------------------------------ */

app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (isClickThrough) setClickThrough(false);
  revealOverlay();
  win.moveTop();
  refreshTray();
});

/* ------------------------------------------------------------------ */
/* Очистка мусора в userData при запуске                                */
/* ------------------------------------------------------------------ */

// Удаляются ТОЛЬКО перегенерируемые кеши Chromium. Никогда не трогаем:
// config.json, card-images/, Local Storage, Session Storage, Network (Cookies),
// Preferences, Local State — там настройки, сессии и библиотека картинок.
const CLEANABLE_DIRS = ['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'blob_storage', 'Shared Dictionary'];

function cleanupUserData() {
  for (const name of CLEANABLE_DIRS) {
    const dir = path.join(app.getPath('userData'), name);
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}

ipcMain.handle('get-config-dir-info', async () => {
  const dir = app.getPath('userData');
  const stat = (p) => {
    try {
      const s = fs.statSync(p);
      return s.size;
    } catch (e) {
      return 0;
    }
  };
  const dirSize = (d) => {
    let total = 0;
    try {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) total += dirSize(p);
        else total += stat(p);
      }
    } catch (e) { /* недоступен — пропускаем */ }
    return total;
  };
  const cardIndex = listCardImages();
  const cardBytes = fs.existsSync(cardImageDir()) ? dirSize(cardImageDir()) : 0;
  return {
    dir,
    configBytes: stat(path.join(dir, 'config.json')),
    cardImages: { count: cardIndex.length, bytes: cardBytes, index: cardIndex },
    cacheBytes: CLEANABLE_DIRS.reduce((t, n) => t + dirSize(path.join(dir, n)), 0)
  };
});

ipcMain.handle('open-config-dir', () => {
  shell.openPath(app.getPath('userData'));
  return true;
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;

  cleanupUserData();
  updater.cleanupInstallerLeftovers();
  migrateCardImages();

  protocol.handle('emote', async (request) => {
    try {
      const u = new URL(request.url);
      if (!emotes.ALLOWED_IMAGE_HOSTS.has(u.hostname)) {
        return new Response('Forbidden', { status: 403 });
      }
      const img = await emotes.fetchImage(`https://${u.hostname}${u.pathname}${u.search}`);
      return new Response(img.body, {
        status: 200,
        headers: { 'content-type': img.contentType, 'cache-control': 'max-age=3600' }
      });
    } catch (e) {
      return new Response('Bad gateway', { status: 502 });
    }
  });

  // card://img/<имя> — свои картинки плашек из userData/card-images (WebP, уже проверены при сохранении)
  protocol.handle('card', (request) => {
    let id = '';
    try { id = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, '')); } catch (e) { /* битый адрес */ }
    const data = readCardImage(id);
    if (!data) return new Response('Not Found', { status: 404 });
    return new Response(data, {
      status: 200,
      headers: { 'content-type': 'image/webp', 'cache-control': 'no-cache' }
    });
  });

  store.delete('skip_taskbar');

  createWindow();
  createTray();

  const cfg = getConfig();
  applyAutoStart(cfg.autoStart);
  applyWidgetSettings(cfg);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  widgetServer.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
