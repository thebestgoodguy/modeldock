// Developer / Creator: Sadri ERCAN
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;
let backendStartPromise = null;

async function startBackend() {
  if (backendStartPromise) return backendStartPromise;

  backendStartPromise = (async () => {
    process.env.MODELDOCK_DB_PATH = path.join(app.getPath('userData'), 'hf_downloader.db');
    process.env.DOWNLOADER_SCRIPT = app.isPackaged
      ? path.join(process.resourcesPath, 'downloader.py')
      : path.join(__dirname, '..', 'downloader.py');
    process.env.MODELDOCK_BACKEND_HOST = process.env.MODELDOCK_BACKEND_HOST || '127.0.0.1';
    process.env.MODELDOCK_BACKEND_PORT = process.env.MODELDOCK_BACKEND_PORT || (app.isPackaged ? '0' : '4000');

    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverModule = await import(pathToFileURL(serverPath).href);
    const backend = await serverModule.backendReady;
    process.env.MODELDOCK_BACKEND_URL = backend.apiUrl;
    return backend;
  })();

  return backendStartPromise;
}

async function createWindow() {
  await startBackend();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#09090b',
    title: 'ModelDock',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
