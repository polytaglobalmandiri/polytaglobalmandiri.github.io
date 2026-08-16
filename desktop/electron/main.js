const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const PORTAL_ORIGIN = 'https://polytaglobalmandiri.github.io';
const isAdmin = process.argv.includes('--admin') || /admin/i.test(app.getName());
const startUrl = isAdmin ? `${PORTAL_ORIGIN}/pages/admin/` : `${PORTAL_ORIGIN}/`;

app.setAppUserModelId(isAdmin
  ? 'com.polytaglobalmandiri.admin'
  : 'com.polytaglobalmandiri.portal');

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

let mainWindow;

function isTrustedNavigation(rawUrl) {
  try {
    return new URL(rawUrl).origin === PORTAL_ORIGIN;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    title: isAdmin ? 'Polyta Administrator' : 'Polyta Portal',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#e8e8e4',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedNavigation(url)) {
      mainWindow.loadURL(url);
    } else if (/^https?:/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedNavigation(url)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return;
    const safeMessage = String(errorDescription).replace(/[&<>"']/g, '');
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!doctype html><html lang="id"><meta charset="utf-8"><title>Koneksi bermasalah</title>
      <style>body{font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#eee;color:#202124}.box{max-width:520px;padding:36px;background:white;border-radius:18px;box-shadow:0 8px 30px #0002;text-align:center}button{padding:11px 20px;border:0;border-radius:9px;background:#b71925;color:white;font-weight:700;cursor:pointer}</style>
      <div class="box"><h1>Portal belum dapat dibuka</h1><p>Periksa koneksi internet, lalu coba kembali.</p><p><small>${safeMessage}</small></p><button onclick="location.href='${startUrl}'">Coba lagi</button></div></html>
    `)}`);
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
