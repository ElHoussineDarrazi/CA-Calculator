const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const STORAGE_DIR_NAME = 'ca-portage';
const LEGACY_DATA_DIRS = ['ca-portage', 'ca-calculator', 'CA Calculator'];

app.setPath('userData', path.join(app.getPath('appData'), STORAGE_DIR_NAME));

const isDev = !app.isPackaged;
const dataPath = path.join(app.getPath('userData'), 'clients.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'CA Calculator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function tryReadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // ignore corrupted file
  }
  return null;
}

function readData() {
  const current = tryReadJson(dataPath);
  if (current?.clients?.length) {
    return current;
  }

  const appData = app.getPath('appData');
  for (const dir of LEGACY_DATA_DIRS) {
    const legacyPath = path.join(appData, dir, 'clients.json');
    if (path.resolve(legacyPath) === path.resolve(dataPath)) continue;

    const legacy = tryReadJson(legacyPath);
    if (legacy?.clients?.length) {
      writeData(legacy);
      return legacy;
    }
  }

  if (current) return current;
  return { clients: [], activeClientId: null };
}

function writeData(data) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

app.whenReady().then(() => {
  ipcMain.handle('load-data', () => readData());
  ipcMain.handle('save-data', (_event, data) => {
    writeData(data);
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
