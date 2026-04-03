const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

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
      preload: path.join(__dirname, 'preload.js'),
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
  createMenu();
  createWindow();

  // Check for updates after a short delay (don't block startup)
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
