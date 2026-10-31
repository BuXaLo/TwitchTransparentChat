const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, protocol, screen, clipboard } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { connectTwitch, disconnectTwitch, makeTestSequence } = require('./twitch');
const emotes = require('./emotes');
const { t, setLang, getStrings } = require('./locales');
const configLib = require('./config');
const { createWidgetServer } = require('./widget-server');

const HOTKEY = 'CommandOrControl+Alt+F9';

// Только один экземпляр: повторный запуск возвращает окно уже работающего оверлея (см. 'second-instance')
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

// Протокол emote:// — через него main-процесс отдаёт картинки смайлов/бейджей
// (так они идут через SOCKS5-прокси, если он включён). Должен быть объявлен до app.ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'emote', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

const store = new Store({
  name: 'config'
});

let win = null;
let tray = null;
let isClickThrough = false;
let settingsWin = null;
let chatStarted = false;
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
/* Сквозной режим, видимость, панель задач                             */
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
    return;
  }

  settingsWin = new BrowserWindow({
    width: 600,
    height: 760,
    minWidth: 500,
    minHeight: 520,
    title: t('settings.title'),
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#101014',
    autoHideMenuBar: true,
    // Оверлей стоит поверх всех окон, поэтому окно настроек тоже должно быть над ним
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  settingsWin.setMenu(null);
  settingsWin.loadFile('settings.html');

  settingsWin.on('closed', () => {
    settingsWin = null;
    // Окно закрыли без сохранения: оверлей возвращается к сохранённому виду (после предпросмотра)
    sendToWindow('config-applied', configLib.overlayView(getConfig()));
  });
}

/* ------------------------------------------------------------------ */
/* Автозапуск вместе с Windows                                         */
/* ------------------------------------------------------------------ */

// В portable-сборке process.execPath указывает на временную распаковку, а настоящий путь к .exe
// electron-builder кладёт в PORTABLE_EXECUTABLE_FILE. Из исходников (npm start) автозапуск не трогаем,
// чтобы не зарегистрировать electron.exe.
function getAutoStartPath() {
  if (!app.isPackaged) return null;
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function applyAutoStart(enabled) {
  const exe = getAutoStartPath();
  if (!exe) return;
  try {
    const wanted = !!enabled;
    // Пишем в систему, только если состояние отличается: при каждом запуске это заодно
    // обновляет путь, если пользователь переложил .exe в другую папку
    if (app.getLoginItemSettings({ path: exe }).openAtLogin !== wanted) {
      app.setLoginItemSettings({ openAtLogin: wanted, path: exe });
    }
  } catch (e) {
    console.error('[AutoStart]', e);
  }
}

/* ------------------------------------------------------------------ */
/* Иконка в трее                                                       */
/* ------------------------------------------------------------------ */

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
  if (!tray) return;
  tray.setToolTip(t('tray.tooltip'));
  tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32, quality: 'best' });

  tray = new Tray(icon);
  // Левый клик открывает то же меню, что и правый, и сам ничего не скрывает
  tray.on('click', () => {
    refreshTray();
    tray.popUpContextMenu();
  });
  refreshTray();
}

/* ------------------------------------------------------------------ */
/* Окно                                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_BOUNDS = { width: 420, height: 650 };
const MIN_WINDOW_W = 200; // совпадает с minWidth/minHeight окна
const MIN_WINDOW_H = 150;
const MIN_VISIBLE_W = 100;  // окно считается потерянным, если ни на одном мониторе не видно хотя бы такой части
const MIN_VISIBLE_H = 50;
const BOUNDS_TOLERANCE = 3; // допуск при сравнении границ (округления при масштабировании Windows), px

// Если не null, окно стоит в исправленной позиции. Её нельзя записывать в конфиг:
// сохранённая раньше позиция остаётся, пока пользователь сам не сдвинет или не растянет окно.
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

// Проверяет сохранённые границы окна. Если окно и так видно хотя бы на одном мониторе, возвращает их как есть.
// Если оно «уехало» (например, отключили монитор), возвращает границы по центру основного монитора.
function fitBoundsToDisplays(saved, displays, primary) {
  const w = numberOrUndefined(saved && saved.width);
  const h = numberOrUndefined(saved && saved.height);
  const bounds = {
    // Размер: испорченное значение (нет, ноль, отрицательное) заменяем на стандартное; допустимые не трогаем
    width: w > 0 ? Math.max(w, MIN_WINDOW_W) : DEFAULT_BOUNDS.width,
    height: h > 0 ? Math.max(h, MIN_WINDOW_H) : DEFAULT_BOUNDS.height,
    x: numberOrUndefined(saved && saved.x),
    y: numberOrUndefined(saved && saved.y)
  };

  // Позиции нет (первый запуск или повреждённый конфиг): место выберет система
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
    // Пользователь ещё не трогал окно: старую сохранённую позицию не перезаписываем
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
    // Окно без кнопки на панели задач (и в Alt+Tab): Win+D, Win+M и «Свернуть все окна» его не трогают
    skipTaskbar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile('index.html');

  // Debounce сохранения положения окна (400мс)
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

  // Регистрируем хоткей после загрузки страницы, чтобы предупреждение не потерялось
  win.webContents.once('did-finish-load', () => {
    const ok = globalShortcut.register(HOTKEY, toggleClickThrough);
    win.webContents.send('hotkey-status', { ok });
    startInitialChat();
  });
}

/* ------------------------------------------------------------------ */
/* Настройки, чат и виджет для OBS                                     */
/* ------------------------------------------------------------------ */

// Настройки хранятся в прежнем плоском виде, поэтому после обновления ничего не теряется;
// недостающие поля (виджет, подсветка упоминаний) дополняются значениями по умолчанию
function getConfig() {
  return configLib.normalizeConfig(store.get('twitch_config', {}));
}

function currentLanguage() {
  return store.get('language', 'en');
}

function widgetState() {
  const lang = currentLanguage();
  return { config: configLib.widgetView(getConfig()), strings: getStrings(lang), language: lang };
}

const widgetServer = createWidgetServer({
  rootDir: __dirname,
  getState: widgetState,
  fetchImage: (url) => emotes.fetchImage(url),
  isHostAllowed: (host) => emotes.ALLOWED_IMAGE_HOSTS.has(host),
  onChange: () => sendToSettings('widget-status', widgetStatus())
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

// Каждое сообщение чата получают и оверлей, и подключённые виджеты
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

// Первый запуск (канал не задан): сразу открываем настройки
function startInitialChat() {
  const cfg = getConfig();
  if (cfg.channel) startChat(cfg);
  else openSettingsWindow();
}

// Загрузка конфигурации (+ язык интерфейса, он хранится отдельно)
ipcMain.handle('load-config', () => Object.assign({}, getConfig(), { language: currentLanguage() }));

// Сохранение: применяем к оверлею, переподключаем чат, запускаем или останавливаем виджет
ipcMain.handle('save-config', async (event, raw) => {
  const cfg = configLib.normalizeConfig(raw);
  store.set('twitch_config', cfg);
  applyAutoStart(cfg.autoStart);

  sendToWindow('config-applied', configLib.overlayView(cfg));
  startChat(cfg);
  await applyWidgetSettings(cfg);
  widgetServer.broadcast('state', widgetState());

  return { ok: true, widget: widgetStatus(), widgetPort: cfg.widgetPort };
});

ipcMain.handle('get-overlay-state', () => {
  const lang = currentLanguage();
  return { config: configLib.overlayView(getConfig()), strings: getStrings(lang), language: lang };
});

// Живой предпросмотр из окна настроек: применяется к оверлею, но не сохраняется
ipcMain.on('preview-overlay', (event, view) => {
  sendToWindow('config-applied', configLib.sanitizePreview(view));
});

ipcMain.on('open-settings-window', openSettingsWindow);

// Кнопка «Сквозной режим» в шапке окна (обратно из этого режима выходят хоткеем или через трей)
ipcMain.on('enable-click-through', () => setClickThrough(true));

// Строки интерфейса для окна
ipcMain.handle('get-strings', (event, lang) => getStrings(lang || currentLanguage()));

// Смена языка: сохраняем сразу, переключаем строки в main (статусы, трей) и сообщаем всем окнам и виджету
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

// Тест: по одному клику выдаёт все сценарии (обычные сообщения, награды, /me, упоминания и ответы,
// события подписок и рейдов, удаление сообщения модератором). Работает и без подключения к чату.
// Тест оверлея и тест виджета независимы: сообщения уходят только в выбранное место.
async function runTest(kind, channel, sendMessage, sendRemove) {
  if (testRunning[kind]) return;
  testRunning[kind] = true;
  try {
    const cfg = getConfig();
    if (!chatStarted) {
      // Чата ещё нет: берём сетевые настройки из сохранённого конфига, чтобы подтянуть глобальные смайлы
      emotes.setNetwork(proxyFromConfig(cfg));
    }
    await Promise.race([emotes.ensureGlobalEmotes(), new Promise((resolve) => setTimeout(resolve, 2500))]);

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
  // Если оверлей скрыт через трей, тест всё равно должен быть виден
  revealOverlay();
  runTest(
    'overlay',
    channel,
    (msg) => sendToWindow('new-message', msg),
    (info) => sendToWindow('message-removed', info)
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
/* Запуск                                                              */
/* ------------------------------------------------------------------ */

// Повторный запуск: выходим из сквозного режима и показываем обычное окно (даже если его скрыли через трей)
app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (isClickThrough) setClickThrough(false);
  revealOverlay();
  win.moveTop();
  refreshTray();
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return; // лишний экземпляр: он уже закрывается

  // emote://cdn.7tv.app/emote/<id>/2x.webp  ->  https://cdn.7tv.app/emote/<id>/2x.webp (через прокси, если включён)
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

  // Устаревший ключ: окно теперь всегда скрыто с панели задач
  store.delete('skip_taskbar');

  createWindow();
  createTray();

  // Синхронизируем автозапуск с сохранённой настройкой (заодно обновляет путь, если .exe переложили)
  const cfg = getConfig();
  applyAutoStart(cfg.autoStart);

  // Виджет для OBS по умолчанию выключен; если он был включён, поднимаем сервер
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
