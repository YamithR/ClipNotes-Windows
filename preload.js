const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipnotes', {
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  copyFile: (filePath) => ipcRenderer.invoke('copy-file', filePath),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  onRefresh: (callback) => ipcRenderer.on('refresh', () => callback())
});
