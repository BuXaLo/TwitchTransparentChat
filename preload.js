const { contextBridge, ipcRenderer } = require('electron');

// Общий мост для окна оверлея и окна настроек: каждое окно использует только свои методы
contextBridge.exposeInMainWorld('api', {
  // --- Настройки ---
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  getOverlayState: () => ipcRenderer.invoke('get-overlay-state'),
  previewOverlay: (view) => ipcRenderer.send('preview-overlay', view),

  // --- Язык ---
  getStrings: (lang) => ipcRenderer.invoke('get-strings', lang),
  setLanguage: (lang) => ipcRenderer.invoke('set-language', lang),

  // --- Окна и режимы ---
  openSettings: () => ipcRenderer.send('open-settings-window'),
  enableClickThrough: () => ipcRenderer.send('enable-click-through'),

  // --- Тесты: в оверлей и в виджет по отдельности ---
  sendTestMessage: (channel) => ipcRenderer.send('send-test-message', channel),
  sendWidgetTest: (channel) => ipcRenderer.send('send-widget-test', channel),

  // --- Виджет для OBS ---
  getWidgetStatus: () => ipcRenderer.invoke('get-widget-status'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),

  // --- События от главного процесса ---
  onNewMessage: (cb) => ipcRenderer.on('new-message', (e, msg) => cb(msg)),
  onMessageRemoved: (cb) => ipcRenderer.on('message-removed', (e, info) => cb(info)),
  onStatusUpdate: (cb) => ipcRenderer.on('status-update', (e, status) => cb(status)),
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', (e, clickThrough) => cb(clickThrough)),
  onHotkeyStatus: (cb) => ipcRenderer.on('hotkey-status', (e, info) => cb(info)),
  onConfigApplied: (cb) => ipcRenderer.on('config-applied', (e, cfg) => cb(cfg)),
  onStringsUpdated: (cb) => ipcRenderer.on('strings-updated', (e, data) => cb(data)),
  onWidgetStatus: (cb) => ipcRenderer.on('widget-status', (e, status) => cb(status))
});
