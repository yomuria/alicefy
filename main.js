const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 380,
    minHeight: 700,
    frame: false,             // Убирает стандартную рамку Windows
    transparent: true,         // Разрешает прозрачность
    backgroundColor: '#00000000', // Полная прозрачность фона окна
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // В режиме разработки грузим URL твоего Vite (обычно 5173)
  win.loadURL('http://localhost:5173'); 
  
  // Если хочешь сразу открыть инструменты разработчика:
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});