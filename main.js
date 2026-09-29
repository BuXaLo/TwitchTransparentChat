const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { connectTwitch, disconnectTwitch } = require('./twitch');

const store = new Store({
  name: 'config'
});

let win = null;
let isClickThrough = false;

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
      if (win && !win.isMaximized() && !win.isMinimized() && !win.isDestroyed()) {
        store.set('window_bounds', win.getBounds());
      }
    }, 400);
  };

  win.on('resize', debouncedSaveBounds);
  win.on('move', debouncedSaveBounds);
  win.on('close', () => {
    clearTimeout(saveBoundsTimeout);
    if (win && !win.isMaximized() && !win.isMinimized() && !win.isDestroyed()) {
      store.set('window_bounds', win.getBounds());
    }
  });

  // Статичный хоткей Ctrl+Alt+F9
  globalShortcut.register('CommandOrControl+Alt+F9', () => {
    isClickThrough = !isClickThrough;
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(isClickThrough, { forward: true });
      win.webContents.send('mode-changed', isClickThrough);
    }
  });
}

// Загрузка конфигурации
ipcMain.handle('load-config', () => {
  return store.get('twitch_config', {
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
  });
});

// Сохранение конфигурации
ipcMain.handle('save-config', (event, config) => {
  store.set('twitch_config', config);
  return true;
});

ipcMain.on('start-chat', (event, config) => {
  connectTwitch({
    channel: config.channel,
    useProxy: config.useProxy,
    proxy: {
      host: config.proxyHost,
      port: config.proxyPort,
      username: config.proxyUser,
      password: config.proxyPass
    },
    onMessage: (msg) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('new-message', msg);
      }
    },
    onError: (err) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('status-update', { error: true, text: err });
      }
    },
    onStatus: (status, code) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('status-update', { error: false, text: status, code });
      }
    }
  });
});

ipcMain.on('stop-chat', () => {
  disconnectTwitch();
});

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
