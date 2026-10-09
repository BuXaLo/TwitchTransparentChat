const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, protocol } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { connectTwitch, disconnectTwitch, makeTestMessage } = require('./twitch');
const emotes = require('./emotes');
const { t, setLang, getStrings } = require('./locales');

const HOTKEY = 'CommandOrControl+Alt+F9';

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
let chatStarted = false;
let testMessageIndex = 0;

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

function toggleVisibility() {
  if (!win || win.isDestroyed()) return;
  if (win.isVisible()) {
    win.hide();
  } else {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  }
  refreshTray();
}

function openSettings() {
  if (!win || win.isDestroyed()) return;
  if (isClickThrough) setClickThrough(false);
  if (!win.isVisible()) win.showInactive();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.focus();
  win.webContents.send('open-settings');
  refreshTray();
}

function setSkipTaskbar(value) {
  store.set('skip_taskbar', !!value);
  if (win && !win.isDestroyed()) win.setSkipTaskbar(!!value);
  refreshTray();
}

/* ------------------------------------------------------------------ */
/* Иконка в трее                                                       */
/* ------------------------------------------------------------------ */

function buildTrayMenu() {
  const visible = !!(win && !win.isDestroyed() && win.isVisible());
  return Menu.buildFromTemplate([
    { label: visible ? t('tray.hide') : t('tray.show'), click: toggleVisibility },
    { label: t('tray.clickThrough'), type: 'checkbox', checked: isClickThrough, click: toggleClickThrough },
    { label: t('tray.settings'), click: openSettings },
    { type: 'separator' },
    {
      label: t('tray.hideTaskbar'),
      type: 'checkbox',
      checked: store.get('skip_taskbar', false),
      click: (item) => setSkipTaskbar(item.checked)
    },
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
  tray.on('click', toggleVisibility);
  refreshTray();
}

/* ------------------------------------------------------------------ */
/* Окно                                                                */
/* ------------------------------------------------------------------ */

function createWindow() {
  const bounds = store.get('window_bounds', {
    width: 420,
    height: 650,
    x: undefined,
    y: undefined
  });

  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 200,
    minHeight: 150,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: store.get('skip_taskbar', false),
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
    saveBoundsTimeout = setTimeout(() => {
      if (win && !win.isDestroyed() && !win.isMaximized() && !win.isMinimized()) {
        store.set('window_bounds', win.getBounds());
      }
    }, 400);
  };

  win.on('resize', debouncedSaveBounds);
  win.on('move', debouncedSaveBounds);
  win.on('show', refreshTray);
  win.on('hide', refreshTray);
  win.on('close', () => {
    clearTimeout(saveBoundsTimeout);
    if (win && !win.isDestroyed() && !win.isMaximized() && !win.isMinimized()) {
      store.set('window_bounds', win.getBounds());
    }
  });

  // Регистрируем хоткей после загрузки страницы, чтобы предупреждение не потерялось
  win.webContents.once('did-finish-load', () => {
    const ok = globalShortcut.register(HOTKEY, toggleClickThrough);
    win.webContents.send('hotkey-status', { ok });
  });
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
  channel: '',
  useProxy: false,
  proxyHost: '',
  proxyPort: '',
  proxyUser: '',
  proxyPass: '',
  messageLifetime: 15,
  fontSize: 14,
  fontFamily: 'system',
  textAlign: 'left',
  bgOpacity: 50,
  animation: 'slide-left',
  chatDirection: 'top',
  hideCommands: true,
  ignoredBots: 'Nightbot, StreamElements, Moobot, Fossabot',
  layoutMode: 'inline'
};

// Загрузка конфигурации (+ язык интерфейса, он хранится отдельно)
ipcMain.handle('load-config', () => {
  return Object.assign({}, DEFAULT_CONFIG, store.get('twitch_config', {}), {
    language: store.get('language', 'en')
  });
});

// Сохранение конфигурации
ipcMain.handle('save-config', (event, config) => {
  const toStore = Object.assign({}, config);
  delete toStore.language;
  store.set('twitch_config', toStore);
  return true;
});

// Строки интерфейса для окна
ipcMain.handle('get-strings', (event, lang) => getStrings(lang || store.get('language', 'en')));

// Смена языка: сохраняем, переключаем строки в main (статусы, трей) и отдаём их окну
ipcMain.handle('set-language', (event, lang) => {
  const applied = setLang(lang);
  store.set('language', applied);
  refreshTray();
  return getStrings(applied);
});

ipcMain.on('start-chat', (event, config) => {
  chatStarted = true;
  connectTwitch({
    channel: config.channel,
    useProxy: config.useProxy,
    proxy: {
      host: config.proxyHost,
      port: config.proxyPort,
      username: config.proxyUser,
      password: config.proxyPass
    },
    onMessage: (msg) => sendToWindow('new-message', msg),
    onError: (err) => sendToWindow('status-update', { error: true, text: err }),
    onStatus: (status, code) => sendToWindow('status-update', { error: false, text: status, code })
  });
});

ipcMain.on('stop-chat', () => {
  chatStarted = false;
  disconnectTwitch();
});

// Тестовое сообщение: работает и без подключения к чату
ipcMain.on('send-test-message', async () => {
  if (!chatStarted) {
    // Чата ещё нет — берём сетевые настройки из сохранённого конфига, чтобы подтянуть глобальные смайлы
    emotes.setNetwork(proxyFromConfig(store.get('twitch_config', {})));
  }
  await Promise.race([emotes.ensureGlobalEmotes(), new Promise((resolve) => setTimeout(resolve, 2500))]);
  sendToWindow('new-message', makeTestMessage(testMessageIndex++));
});

/* ------------------------------------------------------------------ */
/* Запуск                                                              */
/* ------------------------------------------------------------------ */

app.whenReady().then(() => {
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

  createWindow();
  createTray();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
