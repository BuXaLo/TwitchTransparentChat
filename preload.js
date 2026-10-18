const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  startChat: (cfg) => ipcRenderer.send('start-chat', cfg),
  stopChat: () => ipcRenderer.send('stop-chat'),

  getStrings: (lang) => ipcRenderer.invoke('get-strings', lang),
  setLanguage: (lang) => ipcRenderer.invoke('set-language', lang),
  sendTestMessage: (channel) => ipcRenderer.send('send-test-message', channel),

  onNewMessage: (cb) => ipcRenderer.on('new-message', (e, msg) => cb(msg)),
  onMessageRemoved: (cb) => ipcRenderer.on('message-removed', (e, info) => cb(info)),
  onStatusUpdate: (cb) => ipcRenderer.on('status-update', (e, status) => cb(status)),
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', (e, clickThrough) => cb(clickThrough)),
  onOpenSettings: (cb) => ipcRenderer.on('open-settings', () => cb()),
  onHotkeyStatus: (cb) => ipcRenderer.on('hotkey-status', (e, info) => cb(info))
});
