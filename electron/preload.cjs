// Developer / Creator: Sadri ERCAN
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('modelDock', {
  name: 'ModelDock',
  developer: 'Sadri ERCAN',
  creator: 'Sadri ERCAN',
  repository: 'https://github.com/thebestgoodguy/modeldock.git',
  backendUrl: process.env.MODELDOCK_BACKEND_URL || 'http://127.0.0.1:4000/api'
});
