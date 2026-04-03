const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

// --- Documents directory ---
// Default: ~/Documents/Writer's Console/
function getDocumentsDir() {
  const dir = path.join(app.getPath('documents'), "Writer's Console");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Ensure exports subfolder exists
  const exportsDir = path.join(dir, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  return dir;
}

// --- File System IPC handlers ---

ipcMain.handle('fs:get-documents-dir', () => {
  return getDocumentsDir();
});

ipcMain.handle('fs:list-files', async (_event, dirPath) => {
  const dir = dirPath || getDocumentsDir();
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    // Check top-level .wc.json files (legacy flat structure)
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.wc.json')) {
        const filePath = path.join(dir, e.name);
        files.push({ name: e.name, path: filePath, modified: fs.statSync(filePath).mtimeMs });
      }
    }

    // Check subdirectories for .wc.json files (new per-doc folder structure)
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'exports') {
        const subDir = path.join(dir, e.name);
        try {
          const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
          for (const se of subEntries) {
            if (se.isFile() && se.name.endsWith('.wc.json')) {
              const filePath = path.join(subDir, se.name);
              files.push({ name: se.name, path: filePath, modified: fs.statSync(filePath).mtimeMs });
            }
          }
        } catch { /* skip unreadable dirs */ }
      }
    }

    return files.sort((a, b) => b.modified - a.modified);
  } catch {
    return [];
  }
});

// Path sanitization: ensure all file ops stay within the documents directory
function isPathSafe(filePath) {
  const docsDir = getDocumentsDir();
  const resolved = path.resolve(filePath);
  return resolved.startsWith(docsDir);
}

ipcMain.handle('fs:read-file', async (_event, filePath) => {
  if (!isPathSafe(filePath)) return { ok: false, error: 'Path outside documents directory' };
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('fs:write-file', async (_event, filePath, content) => {
  if (!isPathSafe(filePath)) return { ok: false, error: 'Path outside documents directory' };
  try {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return { ok: true };
  } catch (err) {
    // Clean up .tmp on failure
    try { fs.unlinkSync(filePath + '.tmp'); } catch { /* ignore */ }
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('fs:delete-file', async (_event, filePath) => {
  if (!isPathSafe(filePath)) return { ok: false, error: 'Path outside documents directory' };
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('fs:file-exists', async (_event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('fs:write-file-binary', async (_event, filePath, base64Data) => {
  if (!isPathSafe(filePath)) return { ok: false, error: 'Path outside documents directory' };
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);
    return { ok: true };
  } catch (err) {
    try { fs.unlinkSync(filePath + '.tmp'); } catch { /* ignore */ }
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('fs:mkdir', async (_event, dirPath) => {
  if (!isPathSafe(dirPath)) return { ok: false, error: 'Path outside documents directory' };
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Binary file read (for PDFs)
ipcMain.handle('fs:read-file-binary', async (_event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { ok: true, data: buffer.toString('base64') };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// --- Auto-updater events ---

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  mainWindow?.webContents.send('updater-status', 'checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  mainWindow?.webContents.send('updater-status', 'available', info.version);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `Writer's Console v${info.version} is available.`,
    detail: 'It will be downloaded in the background. You will be notified when it is ready to install.',
    buttons: ['OK'],
  });
});

autoUpdater.on('update-not-available', () => {
  log.info('No updates available.');
  mainWindow?.webContents.send('updater-status', 'up-to-date');
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('updater-status', 'downloading', Math.round(progress.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  mainWindow?.webContents.send('updater-status', 'ready', info.version);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Writer's Console v${info.version} has been downloaded.`,
    detail: 'Restart now to apply the update?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
  mainWindow?.webContents.send('updater-status', 'error', err.message);
});

// --- Window creation ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Writer's Console",
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    backgroundColor: '#111518',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Application menu ---

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'settings');
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'new-document');
          },
        },
        {
          label: 'Open Document...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'open-document');
          },
        },
        {
          label: 'Reveal in Finder',
          click: () => {
            shell.openPath(getDocumentsDir());
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'save');
          },
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'export');
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'toggle-sidebar');
          },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'shortcut-help');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// --- App lifecycle ---

app.whenReady().then(() => {
  cleanupTmpFiles();
  createMenu();
  createWindow();

  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tell renderer to flush saves before quitting
app.on('before-quit', () => {
  mainWindow?.webContents.send('menu-action', 'force-save-sync');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup stale .tmp files on startup (HIGH FIX #8)
function cleanupTmpFiles() {
  const dir = getDocumentsDir();
  try {
    const entries = fs.readdirSync(dir);
    for (const name of entries) {
      if (name.endsWith('.wc.json.tmp')) {
        const tmpPath = path.join(dir, name);
        const realPath = tmpPath.replace('.tmp', '');
        // If the real file exists, the .tmp is orphaned — delete it
        // If the real file doesn't exist, the .tmp IS the data — rename it
        if (fs.existsSync(realPath)) {
          fs.unlinkSync(tmpPath);
        } else {
          fs.renameSync(tmpPath, realPath);
        }
        log.info('Cleaned up tmp file:', name);
      }
    }
  } catch (err) {
    log.warn('Tmp cleanup error:', err);
  }
}
