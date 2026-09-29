const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  startChat: (cfg) => ipcRenderer.send('start-chat', cfg),
  stopChat: () => ipcRenderer.send('stop-chat'),
  onNewMessage: (cb) => ipcRenderer.on('new-message', (e, msg) => cb(msg)),
  onStatusUpdate: (cb) => ipcRenderer.on('status-update', (e, status) => cb(status)),
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', (e, clickThrough) => cb(clickThrough))
});