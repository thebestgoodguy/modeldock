// Developer / Creator: Sadri ERCAN
const { contextBridge, ipcRenderer } = require('electron');
const packageJson = require('../package.json');

contextBridge.exposeInMainWorld('modelDock', {
  name: 'ModelDock',
  developer: 'Sadri ERCAN',
  creator: 'Sadri ERCAN',
  version: packageJson.version,
  repository: 'https://github.com/thebestgoodguy/modeldock.git',
  backendUrl: process.env.MODELDOCK_BACKEND_URL || 'http://127.0.0.1:4000/api',
  selectFolder: (defaultPath) => ipcRenderer.invoke('select-folder', defaultPath)
});
