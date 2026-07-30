const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipnotes', {
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  copyFile: (filePath) => ipcRenderer.invoke('copy-file', filePath),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  setShortcut: (shortcut) => ipcRenderer.invoke('set-shortcut', shortcut),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  onRefresh: (callback) => ipcRenderer.on('refresh', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),
  onOpenAbout: (callback) => ipcRenderer.on('open-about', () => callback()),
  onConfigChanged: (callback) => ipcRenderer.on('config-changed', (e, p) => callback(p)),
  closeApp: () => ipcRenderer.send('close-app')
});
