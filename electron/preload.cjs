const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu actions from main process
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },

  // Updater status
  onUpdaterStatus: (callback) => {
    ipcRenderer.on('updater-status', (_event, status, detail) => callback(status, detail));
  },

  // File system operations (disk-first storage)
  fs: {
    getDocumentsDir: () => ipcRenderer.invoke('fs:get-documents-dir'),
    listFiles: (dir) => ipcRenderer.invoke('fs:list-files', dir),
    readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
    writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
    deleteFile: (path) => ipcRenderer.invoke('fs:delete-file', path),
    fileExists: (path) => ipcRenderer.invoke('fs:file-exists', path),
    readFileBinary: (path) => ipcRenderer.invoke('fs:read-file-binary', path),
    writeFileBinary: (path, base64) => ipcRenderer.invoke('fs:write-file-binary', path, base64),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
  },

  // Platform info
  platform: process.platform,
  isElectron: true,
});
