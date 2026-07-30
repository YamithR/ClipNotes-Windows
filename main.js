const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, dialog, clipboard, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.yamithr.clipnotes');
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let mainWindow = null;
let tray = null;
let config = {};
let isQuitting = false;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  const defaults = {
    path: '',
    strip: true,
    'always-on-top': true,
    'window-width': 360,
    'window-height': 450,
    'shortcut-key': 'Ctrl+Shift+N'
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (config[key] === undefined) config[key] = val;
  }
  return config;
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let winIcon;
  try {
    winIcon = nativeImage.createFromPath(iconPath);
    if (winIcon.isEmpty()) winIcon = undefined;
  } catch {
    winIcon = undefined;
  }

  mainWindow = new BrowserWindow({
    width: config['window-width'] || 360,
    height: config['window-height'] || 450,
    minWidth: 300,
    minHeight: 300,
    x: workArea.width - (config['window-width'] || 360) - 20,
    y: 60,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: config['always-on-top'] !== false,
    show: false,
    icon: winIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize();
    config['window-width'] = w;
    config['window-height'] = h;
    saveConfig();
  });

  mainWindow.on('blur', () => {
    if (!mainWindow?.isFocused()) {
      mainWindow?.hide();
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = config['window-width'] || 320;
  mainWindow.setPosition(workArea.width - winWidth - 20, 60);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('refresh');
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let trayIcon;
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      trayIcon = img.resize({ width: 16, height: 16 });
    } else {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('ClipNotes');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir ClipNotes',
      click: () => showWindow()
    },
    {
      label: 'Configurar carpeta...',
      click: async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory']
        });
        if (!result.canceled && result.filePaths.length > 0) {
          config.path = result.filePaths[0];
          saveConfig();
        }
      }
    },
    {
      label: 'Configurar atajo...',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.webContents.send('open-settings');
        showWindow();
      }
    },
    {
      label: 'Acerca de...',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.webContents.send('open-about');
        showWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => showWindow());
}

function getFiles(dirPath) {
  const result = { dirs: [], files: [] };
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        result.dirs.push({ name: entry.name, path: fullPath });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const textExtensions = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.csv', '.env', '.sh', '.bat', '.ps1', '.sql', '.rb', '.php', '.go', '.rs', '.toml'];
        if (textExtensions.includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          result.files.push({
            name: entry.name,
            path: fullPath,
            content: content.trim()
          });
        }
      }
    }
  } catch {}
  result.dirs.sort((a, b) => a.name.localeCompare(b.name));
  result.files.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

ipcMain.handle('list-files', async (event, dirPath) => {
  const rootPath = config.path;
  if (!rootPath) return { dirs: [], files: [], currentPath: '', rootPath: '' };

  const currentPath = dirPath || rootPath;
  const data = getFiles(currentPath);
  return {
    ...data,
    currentPath,
    rootPath,
    isRoot: currentPath === rootPath
  };
});

ipcMain.handle('copy-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    clipboard.writeText(content.trim());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-config', () => config);

ipcMain.handle('set-config', (event, updates) => {
  Object.assign(config, updates);
  saveConfig();
  return config;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    config.path = result.filePaths[0];
    saveConfig();
    return config.path;
  }
  return null;
});

ipcMain.handle('set-shortcut', (event, shortcut) => {
  config['shortcut-key'] = shortcut;
  saveConfig();
  registerShortcut();
  return true;
});

ipcMain.handle('get-app-info', () => ({
  name: 'ClipNotes',
  version: '1.0.0',
  description: 'Copia notas de texto al portapapeles desde la bandeja del sistema',
  author: 'Yamith Romero',
  email: 'yamithr@users.noreply.github.com',
  github: 'https://github.com/YamithR/ClipNotes-Windows',
  repo: 'https://github.com/YamithR/ClipNotes-Windows'
}));

function registerShortcut() {
  globalShortcut.unregisterAll();
  const shortcut = config['shortcut-key'] || 'Ctrl+Shift+N';
  try {
    globalShortcut.register(shortcut, () => showWindow());
  } catch (e) {
    console.error('Failed to register shortcut:', e);
  }
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  createTray();
  registerShortcut();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('close-app', () => {
  isQuitting = true;
  app.quit();
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
