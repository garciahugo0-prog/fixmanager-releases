const { app, BrowserWindow, webContents, ipcMain, shell, Menu, dialog, session, protocol, net } = require('electron');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const { https } = require('follow-redirects');
const url = require('url');

// Desactivar la suspensión y el estrangulamiento de procesos renderer cuando la ventana se minimiza
// Esto evita que la pantalla compartida (WebRTC) y los temporizadores se congelen en segundo plano
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Registrar el esquema fm-media como seguro y que soporta streams para reproducción de vídeo
protocol.registerSchemesAsPrivileged([
  { scheme: 'fm-media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, secure: true } }
]);

// Cargar variables de entorno desde el archivo .env si existe
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  console.log('[Env] No se pudo iniciar dotenv:', e.message);
}

// Evitar caídas por tuberías rotas (EPIPE) cuando el proceso padre (consola/terminal) se cierra
if (process.stdout) {
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') {
      // Ignorar error de tubería rota
    }
  });
}
if (process.stderr) {
  process.stderr.on('error', (err) => {
    if (err.code === 'EPIPE') {
      // Ignorar error de tubería rota
    }
  });
}

// Capturar excepciones no controladas globalmente para evitar que se muestren modales de error de JS al usuario
process.on('uncaughtException', (err) => {
  if (err && err.code !== 'EPIPE') {
    console.error('Excepción no controlada en el proceso principal:', err);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo de promesa no controlado en:', promise, 'razón:', reason);
});

let mainWindow;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Usar siempre la misma ruta userData original para todas las versiones
app.setPath('userData', path.join(os.homedir(), 'Library', 'Application Support', 'FixManager'));

const APP_VERSION = '1.15.45';

/** Retorna true si la versión a es estrictamente mayor que b (semver simple) */
function semverGt(a, b) {
  const pa = (a || '0').split('.').map(Number);
  const pb = (b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}
// URL del Gist — edita el contenido del Gist para publicar actualizaciones, la URL nunca cambia
const VERSION_URL = 'https://gist.githubusercontent.com/garciahugo0-prog/e801bfd70835c912715916dc5e172fdb/raw/version.json';

// ─── SISTEMA DE LICENCIAS ──────────────────────────────────────────────────────
// IMPORTANTE: esta cadena nunca debe exponerse al renderer ni al cliente.
const _LICENSE_SECRET = 'SM4RTEC_T4LL3R_L1C3NC14_K3Y_2025_PR1M3_SIGMA';

// ─── VERIFICACIÓN DE INTEGRIDAD (DETECTOR DE ALTERACIONES) ──────────────────────
const _INTEGRITY_HASH = '___INTEGRITY_HASH_PLACEHOLDER___';

function verifyIntegrity() {
  if (!app.isPackaged) return; // Omitir en desarrollo
  try {
    const assetsDir = path.join(__dirname, '../dist/assets');
    if (!fs.existsSync(assetsDir)) {
      app.quit();
      return;
    }
    const files = fs.readdirSync(assetsDir);
    const indexJsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    if (!indexJsFile) {
      app.quit();
      return;
    }
    const indexJsPath = path.join(assetsDir, indexJsFile);
    const content = fs.readFileSync(indexJsPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (hash !== _INTEGRITY_HASH) {
      dialog.showErrorBox(
        'Error de Seguridad',
        'Los archivos del sistema han sido alterados. Por favor, reinstala la aplicación oficial.'
      );
      app.quit();
    }
  } catch (e) {
    app.quit();
  }
}

/** Genera o recupera el ID único de esta instalación (16 hex chars mayúsculas) */
function getMachineId() {
  const userDataPath = app.getPath('userData');
  const idFile = path.join(userDataPath, '.smid');
  if (fs.existsSync(idFile)) {
    const id = fs.readFileSync(idFile, 'utf8').trim();
    if (id && id.length === 16) return id;
  }
  const raw = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
    (os.cpus()[0] || {}).model || 'cpu'
  ].join('|');
  const id = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase();
  try { fs.writeFileSync(idFile, id, 'utf8'); } catch (_) {}
  return id;
}

/** Lee y valida el archivo de licencia almacenado localmente */
function getLicenseStatus() {
  const machineId = getMachineId();
  const activationFile = path.join(app.getPath('userData'), 'fixmanager_activation.json');
  if (!fs.existsSync(activationFile)) {
    return { status: 'none', machineId };
  }
  try {
    const act = JSON.parse(fs.readFileSync(activationFile, 'utf8'));
    // Verificar que el machineId coincide con esta instalación
    if (act.machineId !== machineId) {
      return { status: 'invalid', machineId, reason: 'Licencia registrada para otra instalación.' };
    }
    // Verificar firma para seguridad offline
    const payload = `${act.machineId}|${act.email || ''}|${act.status || ''}|${act.type || ''}|${act.expiry || ''}`;
    const expectedSignature = crypto.createHmac('sha256', _LICENSE_SECRET).update(payload).digest('hex');
    if (expectedSignature !== act.signature) {
      return { status: 'invalid', machineId, reason: 'Firma de activación local no válida.' };
    }
    // Verificar expiración si no es perpetua
    if (act.expiry && act.expiry !== 'PERPETUA') {
      let expiryDate;
      if (act.expiry.includes('-') || act.expiry.includes('/')) {
        expiryDate = new Date(act.expiry);
      } else {
        const y = parseInt(act.expiry.slice(0, 4), 10);
        const m = parseInt(act.expiry.slice(4, 6), 10) - 1;
        const d = parseInt(act.expiry.slice(6, 8), 10);
        expiryDate = new Date(y, m, d, 23, 59, 59); // Fin del día en hora local
      }
      if (expiryDate < new Date()) {
        return { status: 'expired', machineId, ...act };
      }
    }
    return { status: act.status || 'active', machineId, ...act };
  } catch (e) {
    return { status: 'invalid', machineId, reason: 'Archivo de activación corrupto o inválido.' };
  }
}

/** Activa una nueva licencia localmente. */
function activateLicenseKey(params) {
  const activationFile = path.join(app.getPath('userData'), 'fixmanager_activation.json');
  if (params && params.logout) {
    try {
      if (fs.existsSync(activationFile)) {
        fs.unlinkSync(activationFile);
      }
    } catch (_) {}
    return { success: true, license: { status: 'none', machineId: getMachineId() } };
  }

  const machineId = getMachineId();
  const { email, userId, user_id, expiry, status, type, ownerName, isVitalicia, lastOnlineCheck } = params || {};
  
  const payload = `${machineId}|${email || ''}|${status || ''}|${type || ''}|${expiry || ''}`;
  const signature = crypto.createHmac('sha256', _LICENSE_SECRET).update(payload).digest('hex');
  
  const activationData = {
    machineId,
    email,
    userId: userId || user_id || '',
    user_id: userId || user_id || '',
    expiry,
    status: status || 'active',
    type: type || 'Suscripción',
    ownerName: ownerName || '',
    activatedAt: new Date().toISOString(),
    signature,
    isVitalicia: !!isVitalicia,
    lastOnlineCheck: lastOnlineCheck || new Date().toISOString()
  };
  
  try {
    fs.writeFileSync(activationFile, JSON.stringify(activationData, null, 2), 'utf8');
    return { success: true, license: activationData };
  } catch (e) {
    return { success: false, error: 'No se pudo guardar la activación local: ' + e.message };
  }
}

/** Verifica actualizaciones y retorna una promesa con el resultado */
function checkForUpdates(notifyWindow = true) {
  return new Promise((resolve) => {
    function doRequest(opts) {
      https.get(opts, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = new URL(res.headers.location);
          doRequest({
            hostname: redirectUrl.hostname,
            path: redirectUrl.pathname + redirectUrl.search,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            console.log('Version remota:', info.version, '| Version local:', APP_VERSION);
            if (info.version && semverGt(info.version, APP_VERSION)) {
              // Detectar plataforma y arquitectura para elegir la URL correcta
              const plt  = process.platform; // 'darwin' | 'win32' | 'linux'
              const arch = process.arch;     // 'arm64' | 'x64'
              let downloadUrl = '';
              let platformLabel = '';
              if (plt === 'darwin') {
                downloadUrl  = info.downloads?.['mac-universal'] || info.downloads?.['mac-arm64'] || info.downloads?.['mac-x64'] || info.dmgUrl || '';
                platformLabel = 'Mac (.zip)';
              } else if (plt === 'win32') {
                downloadUrl  = info.downloads?.['win'] || '';
                platformLabel = 'Windows (.exe)';
              } else {
                downloadUrl  = info.dmgUrl || '';
                platformLabel = 'Descargar';
              }
              const updatePayload = {
                version: info.version,
                notes: info.notes || '',
                dmgUrl: downloadUrl,
                platformLabel,
              };
              if (notifyWindow && mainWindow) {
                mainWindow.webContents.executeJavaScript(`
                  localStorage.setItem('fixmanager_update', JSON.stringify(${JSON.stringify(updatePayload)}));
                  window.dispatchEvent(new Event('fixmanager-update'));
                `);
              }
              resolve({ hasUpdate: true, ...updatePayload, currentVersion: APP_VERSION });
            } else {
              resolve({ hasUpdate: false, currentVersion: APP_VERSION });
            }
          } catch (e) {
            console.log('Update check parse error:', e.message);
            resolve({ hasUpdate: false, currentVersion: APP_VERSION, error: 'No se pudo leer la respuesta del servidor.' });
          }
        });
      }).on('error', (e) => {
        console.log('Update check failed:', e.message);
        resolve({ hasUpdate: false, currentVersion: APP_VERSION, error: 'Sin conexión o servidor no disponible.' });
      });
    }

    const url = new URL(VERSION_URL);
    const separator = url.search ? '&' : '?';
    const pathWithCacheBuster = `${url.pathname}${url.search}${separator}t=${Date.now()}`;
    doRequest({
      hostname: url.hostname,
      path: pathWithCacheBuster,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
  });
}

let currentAppZoomLevel = 'auto';

/** Calcula dinámicamente el factor de zoom para evitar que la ventana se desborde en pantallas pequeñas */
function getZoomFactor(targetWidth, targetHeight) {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const longestSide = Math.max(width, height);

  // Zoom base por defecto
  let zoomFactor = 1.0;
  if (longestSide >= 2560) zoomFactor = 1.25;
  else if (longestSide >= 1920) zoomFactor = 1.15;
  else if (longestSide >= 1440) zoomFactor = 1.1;
  else if (longestSide <= 1280 || height < 720) zoomFactor = 0.78; // Pantallas muy pequeñas (ej. 1280x720)
  else if (longestSide <= 1366 || height <= 768) zoomFactor = 0.82; // Pantallas de laptop comunes (ej. 1366x768)
  else zoomFactor = 1.0;

  // Limitar el zoom si el alto o ancho de la ventana supera el área de trabajo útil
  // Restamos 28px de la barra de título y 40px de margen de seguridad vertical
  const maxZoomH = (height - 40 - 28) / targetHeight;
  const maxZoomW = (width - 40) / targetWidth;
  const maxZoom = Math.min(maxZoomH, maxZoomW);

  if (zoomFactor > maxZoom) {
    zoomFactor = maxZoom;
  }

  // Mantener el zoom dentro de límites razonables (mínimo 0.75, máximo 1.35)
  return Math.min(1.35, Math.max(0.75, zoomFactor));
}



function createWindow() {
  // Splash screen
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: { nodeIntegration: false }
  });

  splash.loadURL(`data:text/html,
    <html>
    <body style="margin:0;background:#111827;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:white;border-radius:16px;">
      <div style="font-size:48px;margin-bottom:16px;">🔧</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#60a5fa;">FIXMANAGER</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:8px;letter-spacing:4px;">CARGANDO INTERFAZ...</div>
      <div style="margin-top:24px;width:200px;height:4px;background:#1e293b;border-radius:4px;overflow:hidden;">
        <div style="height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);animation:load 1.5s ease-in-out infinite;" ></div>
      </div>
      <style>@keyframes load{0%{width:0%}100%{width:100%}}</style>
    </body>
    </html>
  `);

  mainWindow = new BrowserWindow({
    width: 460,
    height: 600,
    minWidth: 460,
    minHeight: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      webviewTag: true,
      backgroundThrottling: false,
    },
    backgroundColor: '#0a0f1a',
    show: false,
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [Level ${level}] ${message}`);
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(`http://localhost:5099?t=${Date.now()}`);
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(distPath);
    // Bloquear DevTools en producción
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Manejador de atajos de teclado (Zoom y Bloqueo de DevTools en prod)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Zoom shortcuts (Ctrl + + / Ctrl + - / Ctrl + 0)
    if (input.control || input.meta) {
      if (input.key === '=' || input.key === '+') {
        event.preventDefault();
        const cur = mainWindow.webContents.getZoomFactor();
        const next = Math.min(1.4, Math.round((cur + 0.05) * 100) / 100);
        mainWindow.webContents.setZoomFactor(next);
        mainWindow.webContents.send('zoom-changed', next);
        return;
      } else if (input.key === '-') {
        event.preventDefault();
        const cur = mainWindow.webContents.getZoomFactor();
        const next = Math.max(0.65, Math.round((cur - 0.05) * 100) / 100);
        mainWindow.webContents.setZoomFactor(next);
        mainWindow.webContents.send('zoom-changed', next);
        return;
      } else if (input.key === '0') {
        event.preventDefault();
        mainWindow.webContents.send('zoom-reset');
        return;
      }
    }

    if (!isDev) {
      if ((input.meta || input.control) && input.alt && input.key === 'i') event.preventDefault();
      if (input.key === 'F12') event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    splash.destroy();
    const zoomFactor = getZoomFactor(460, 600);
    mainWindow.webContents.setZoomFactor(zoomFactor);
    // Tamaño físico = CSS size * zoom + altura barra de título (~28px)
    const winW = Math.round(460 * zoomFactor);
    const winH = Math.round(600 * zoomFactor) + 28;
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(winW, winH);
    mainWindow.setSize(winW, winH);
    mainWindow.center();
    mainWindow.show();
    mainWindow.focus();

    // Verificación automática de actualizaciones al arrancar (15s después para no bloquear arranque)
    setTimeout(() => checkForUpdates(true), 15000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Permitir ventanas de blob para reportes de impresión
    if (!url || url === 'about:blank' || url.startsWith('blob:')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Menú contextual para corrección ortográfica y opciones de edición (Copiar, Cortar, Pegar)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const template = [];

    // Agregar sugerencias si hay una palabra con error ortográfico
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        template.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        });
      }
      template.push({ type: 'separator' });
    }

    // Agregar opciones estándar en áreas de texto editable
    if (params.isEditable) {
      template.push({ role: 'cut', label: 'Cortar' });
      template.push({ role: 'copy', label: 'Copiar' });
      template.push({ role: 'paste', label: 'Pegar' });
      template.push({ type: 'separator' });
    } else if (params.selectionText) {
      template.push({ role: 'copy', label: 'Copiar' });
      template.push({ type: 'separator' });
    }

    if (template.length > 0) {
      // Remover último separador si existe
      if (template[template.length - 1].type === 'separator') {
        template.pop();
      }
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: mainWindow });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

// ─── Login mode ───────────────────────────────────────────────────────────────
// isLogin=true + firstTime=true  → ventana pequeña centrada (primer arranque / post-logout)
// isLogin=false                  → maximizado (después del login)
// isLogin=true + firstTime=false → no hacer nada (overlay en React, ventana ya es pequeña)
ipcMain.on('set-login-mode', (_, { isLogin, firstTime }) => {
  if (!mainWindow) return;
  if (!isLogin) {
    // Maximizar la ventana al autenticarse correctamente
    mainWindow.setResizable(true);
    const zoomFactor = currentAppZoomLevel === 'auto' ? getZoomFactor(1024, 700) : Number(currentAppZoomLevel);
    mainWindow.webContents.setZoomFactor(zoomFactor);
    const minW = Math.round(1024 * zoomFactor);
    const minH = Math.round(700 * zoomFactor) + 28;
    mainWindow.setMinimumSize(minW, minH);

    // Si estaba en pantalla completa por alguna razón, salir primero
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }

    // Omitir si ya está maximizado (cambio de usuario) — evita parpadeo
    if (!mainWindow.isMaximized()) {
      mainWindow.hide();
      mainWindow.setResizable(true);
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
    }
  } else if (firstTime) {
    // Primer arranque o post-wizard/logout: ventana pequeña centrada (460×600)
    const resizeToSmall = () => {
      if (!mainWindow) return;
      const zoomFactor = getZoomFactor(460, 600);
      mainWindow.webContents.setZoomFactor(zoomFactor);
      const winW = Math.round(460 * zoomFactor);
      const winH = Math.round(600 * zoomFactor) + 28;
      mainWindow.setResizable(false);
      mainWindow.setMinimumSize(winW, winH);
      mainWindow.setSize(winW, winH);
      mainWindow.center();
      mainWindow.focus();
    };

    if (mainWindow.isFullScreen()) {
      mainWindow.once('leave-full-screen', resizeToSmall);
      mainWindow.setFullScreen(false);
    } else if (mainWindow.isMaximized()) {
      let completed = false;
      const onUnmaximize = () => {
        if (completed) return;
        completed = true;
        resizeToSmall();
      };
      mainWindow.once('unmaximize', onUnmaximize);
      setTimeout(onUnmaximize, 250);
      mainWindow.unmaximize();
    } else {
      // Ventana ya pequeña y NO maximizada:
      // Verificar si ya tiene exactamente el tamaño objetivo antes de redibujar/centrar.
      // Esto evita el parpadeo visual al arrancar (React llama setLoginMode en cada render inicial).
      const zoomFactor = getZoomFactor(460, 600);
      const targetW = Math.round(460 * zoomFactor);
      const targetH = Math.round(600 * zoomFactor) + 28;
      const [currentW, currentH] = mainWindow.getSize();
      if (currentW !== targetW || currentH !== targetH) {
        // Tamaño incorrecto (viene del wizard): achicar
        resizeToSmall();
      } else {
        // Ya está en el tamaño correcto — solo asegurar que no sea redimensionable
        mainWindow.setResizable(false);
        mainWindow.focus();
      }
    }
  }
  // firstTime=false → overlay en React, no mover ventana
});

// ─── Wizard mode ──────────────────────────────────────────────────────────────
// active=true  → ventana pequeña centrada para el wizard de configuración
// active=false → volver a maximizar (igual que set-login-mode con isLogin=false)
ipcMain.on('set-wizard-mode', (_, { active }) => {
  if (!mainWindow) return;
  if (active) {
    // Salir de pantalla completa/maximizado y mostrar ventana centrada para el wizard
    const exitAndResize = () => {
      const zoomFactor = getZoomFactor(960, 820);
      mainWindow.webContents.setZoomFactor(zoomFactor);
      const winW = Math.round(960 * zoomFactor);
      const winH = Math.round(820 * zoomFactor) + 28;
      mainWindow.setResizable(false);
      mainWindow.setMinimumSize(winW, winH);
      mainWindow.setSize(winW, winH);
      mainWindow.center();
      mainWindow.show();
      mainWindow.focus();
    };
    if (mainWindow.isFullScreen()) {
      mainWindow.hide();
      mainWindow.once('leave-full-screen', exitAndResize);
      mainWindow.setFullScreen(false);
    } else if (mainWindow.isSimpleFullScreen()) {
      mainWindow.hide();
      mainWindow.setSimpleFullScreen(false);
      exitAndResize();
    } else if (mainWindow.isMaximized()) {
      mainWindow.hide();
      let completed = false;
      const onUnmaximize = () => {
        if (completed) return;
        completed = true;
        exitAndResize();
      };
      mainWindow.once('unmaximize', onUnmaximize);
      setTimeout(onUnmaximize, 250);
      mainWindow.unmaximize();
    } else {
      exitAndResize();
    }
  } else {
    // Volver a maximizar
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    if (!mainWindow.isMaximized()) {
      mainWindow.hide();
      mainWindow.setResizable(true);
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

app.whenReady().then(() => {
  verifyIntegrity();

  // Manejador del protocolo fm-media:// para servir archivos multimedia locales
  protocol.handle('fm-media', (request) => {
    try {
      let rawPath = request.url.replace(/^fm-media:\/\//, '');
      if (process.platform !== 'win32' && !rawPath.startsWith('/')) {
        rawPath = '/' + rawPath;
      }
      const decodedPath = decodeURIComponent(rawPath);
      const filePath = path.normalize(decodedPath);
      const fileUrl = url.pathToFileURL(filePath).toString();
      return net.fetch(fileUrl);
    } catch (err) {
      console.error('[Protocol fm-media] Error serving media:', err.message);
      return new Response('Error loading media resource', { status: 500 });
    }
  });
  // Configurar corrector ortográfico para español (México/España) e inglés
  if (session && session.defaultSession) {
    session.defaultSession.setSpellCheckerLanguages(['es-MX', 'es', 'en-US', 'en']);
  }
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
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
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: !app.isPackaged ? [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ] : [
          { role: 'togglefullscreen' }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    Menu.setApplicationMenu(null); // Deshabilitar la barra de menú por defecto en Windows/Linux
  }
  createWindow();
  updateWppCache();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Ajustar zoom de la interfaz desde el renderer
ipcMain.on('apply-zoom-factor', (_, factor) => {
  currentAppZoomLevel = factor;
  if (mainWindow) {
    if (factor === 'auto') {
      mainWindow.webContents.setZoomFactor(getZoomFactor(1024, 700));
    } else {
      mainWindow.webContents.setZoomFactor(Number(factor));
    }
  }
});

// Cierre forzado desde el renderer (cuando el usuario confirma salir)
ipcMain.on('confirm-close', () => {
  if (mainWindow) mainWindow.destroy();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: DEV PANEL AUTH ──────────────────────────────────────────────────────
// SHA-256 de "mejoramigo" — la contraseña nunca viaja en claro ni vive en el renderer
const DEV_PASSWORD_HASH = 'b411875175989548c632bf8b0f617ac1511330c8837020e819d1f636808809a6';
let devAuthFailedAttempts = 0;
const DEV_AUTH_MAX_ATTEMPTS = 3;
ipcMain.handle('dev-auth', async (_, { hash }) => {
  if (devAuthFailedAttempts >= DEV_AUTH_MAX_ATTEMPTS) return { ok: false, locked: true };
  const ok = hash === DEV_PASSWORD_HASH;
  if (!ok) devAuthFailedAttempts++;
  else devAuthFailedAttempts = 0;
  return { ok, locked: devAuthFailedAttempts >= DEV_AUTH_MAX_ATTEMPTS };
});

// ─── IPC: LICENCIAS Y ACTUALIZACIONES ─────────────────────────────────────────
ipcMain.handle('get-machine-id', () => getMachineId());
ipcMain.handle('get-license', () => getLicenseStatus());
ipcMain.handle('activate-license', (_, params) => activateLicenseKey(params));
ipcMain.handle('save-supabase-session', (_, tokens) => {
  try {
    const sessionFile = path.join(app.getPath('userData'), 'fixmanager_supabase_session.json');
    if (!tokens) {
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
      return { success: true };
    }
    fs.writeFileSync(sessionFile, JSON.stringify(tokens, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('get-supabase-session', () => {
  try {
    const sessionFile = path.join(app.getPath('userData'), 'fixmanager_supabase_session.json');
    if (!fs.existsSync(sessionFile)) return null;
    return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  } catch (e) {
    return null;
  }
});
ipcMain.handle('save-settings', (_, configData) => {
  try {
    const settingsFile = path.join(app.getPath('userData'), 'fixmanager_settings.json');
    fs.writeFileSync(settingsFile, JSON.stringify(configData, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('load-settings', () => {
  try {
    const settingsFile = path.join(app.getPath('userData'), 'fixmanager_settings.json');
    if (!fs.existsSync(settingsFile)) return null;
    return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch (e) {
    return null;
  }
});
ipcMain.handle('check-updates-manual', () => checkForUpdates(false));
ipcMain.handle('check-app-update', () => checkForUpdates(false));
ipcMain.handle('get-app-version', () => APP_VERSION);
ipcMain.handle('download-and-install-update', async (event, downloadUrl) => {
  return new Promise((resolve) => {
    try {
      console.log('[Updater] Iniciando descarga:', downloadUrl);
      const url = new URL(downloadUrl);
      const tempDir = app.getPath('temp');
      const ext = path.extname(url.pathname) || (process.platform === 'win32' ? '.exe' : '.dmg');
      const tempFilePath = path.join(tempDir, `fixmanager-update-${Date.now()}${ext}`);
      
      const fileStream = fs.createWriteStream(tempFilePath);
      
      const req = https.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlink(tempFilePath, () => {});
          resolve({ success: false, error: `El servidor respondió con código ${res.statusCode}` });
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            if (mainWindow) {
              mainWindow.webContents.send('update-download-progress', { percent });
            }
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(async () => {
            console.log('[Updater] Descarga completa. Archivo temporal:', tempFilePath);
            
            try {
              const { spawn, exec } = require('child_process');
              if (process.platform === 'win32') {
                const child = spawn(tempFilePath, [], {
                  detached: true,
                  stdio: 'ignore'
                });
                child.unref();
                setTimeout(() => {
                  if (mainWindow) mainWindow.destroy();
                  app.quit();
                }, 1000);
                resolve({ success: true });
              } else if (process.platform === 'darwin') {
                const unzipDir = path.join(tempDir, `fixmanager-extract-${Date.now()}`);
                exec(`unzip -o -q "${tempFilePath}" -d "${unzipDir}"`, (unzipErr) => {
                  if (unzipErr) {
                    console.error('[Updater] Error unzipping Mac installer:', unzipErr);
                    resolve({ success: false, error: 'Error al descomprimir el instalador de Mac.' });
                    return;
                  }
                  
                  const commandScript = path.join(unzipDir, 'FixManager-Installer', 'Instalar FixManager.command');
                  exec(`chmod +x "${commandScript}"`, (chmodErr) => {
                    if (chmodErr) {
                      console.error('[Updater] Error setting execute permission on command script:', chmodErr);
                    }
                    
                    exec(`open -a Terminal.app "${commandScript}"`, (openErr) => {
                      if (openErr) {
                        console.error('[Updater] Error opening Terminal with install script:', openErr);
                        resolve({ success: false, error: 'No se pudo abrir la terminal de instalación.' });
                        return;
                      }
                      
                      setTimeout(() => {
                        if (mainWindow) mainWindow.destroy();
                        app.quit();
                      }, 1000);
                      resolve({ success: true });
                    });
                  });
                });
              } else {
                const { shell } = require('electron');
                await shell.openPath(tempFilePath);
                setTimeout(() => {
                  if (mainWindow) mainWindow.destroy();
                  app.quit();
                }, 1000);
                resolve({ success: true });
              }
            } catch (err) {
              console.error('[Updater] Error al ejecutar instalador:', err);
              resolve({ success: false, error: `Error al ejecutar instalador: ${err.message}` });
            }
          });
        });
      });

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(tempFilePath, () => {});
        console.error('[Updater] Error en petición de descarga:', err);
        resolve({ success: false, error: `Error de red: ${err.message}` });
      });

      req.end();

    } catch (err) {
      console.error('[Updater] Error general:', err);
      resolve({ success: false, error: err.message });
    }
  });
});
ipcMain.handle('get-network-date', () => {
  return new Promise((resolve) => {
    const { https } = require('follow-redirects');
    const req = https.request({
      hostname: 'nudkxnfraithxhtutkdw.supabase.co',
      method: 'HEAD',
      timeout: 4000
    }, (res) => {
      resolve({ success: true, date: res.headers.date });
    });
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    req.end();
  });
});

// ─── IPC: PRECARGA DE MODELOS DESDE INTERNET ──────────────────────────────────
const BRANDS = [
  'SAMSUNG', 'APPLE', 'IPHONE', 'IPAD', 'MOTOROLA', 'MOTO', 'XIAOMI', 'REDMI', 'POCO', 'HUAWEI',
  'SONY', 'PLAYSTATION', 'NINTENDO', 'XBOX', 'MICROSOFT', 'OPPO', 'VIVO', 'REALME', 'ONEPLUS',
  'LG', 'GOOGLE', 'PIXEL', 'ASUS', 'LENOVO', 'ACER', 'DELL', 'HP', 'ALCATEL', 'ZTE', 'NUK',
  'TCL', 'INIFINIX', 'TECNO', 'HONOR', 'CHROMEBOOK', 'SEGA', 'LANIX', 'BLU', 'HISENSE', 'MEIZU',
  'NVIDIA', 'VALVE', 'NOKIA', 'TOSHIBA', 'PANASONIC', 'SHARP', 'KYOCERA', 'HTC'
];

const NOISE_WORDS = [
  'RESTORED', 'REFURBISHED', 'RENEWED', 'UNLOCKED', 'GLOBAL', 'DUAL', 'SIM', 'DS',
  'GB', 'TB', 'RAM', 'ROM', 'GSM', 'BLU-RAY', 'BLURAY', 'DISC',
  'EDITION', 'CONSOLE', 'HANDHELD', 'GAMING', 'SMARTPHONE', 'MOBILE', 'PHONE', 'TABLET',
  'WHITE', 'BLACK', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'GOLD', 'SILVER', 'GREY', 'GRAY',
  'MODEL', 'NUMBER', 'SPECIFICATIONS', 'SPECS', 'SUPPORT', 'PRODUCT', 'DATA', 'DIFFERENCES',
  'WIFI', 'WI-FI', 'CELLULAR', 'DECODE', 'REVIEW', 'REVIEWS', 'TEST', 'TESTS', 'MANUAL',
  'MANUALS', 'SAFETY', 'GUIDE', 'QUICK', 'START', 'HOW', 'TO', 'BUY', 'PRICE', 'PDF', 'DOWNLOAD',
  'AND', 'OR', 'WITH', 'FOR', 'BY', 'THE', 'NEW',
  // Palabras de ruido en español y tiendas de e-commerce
  'COMPRA', 'COMPRAR', 'EBAY', 'SITIO', 'OFICIAL', 'DE', 'EN', 'EL', 'LA', 'LOS', 'LAS', 'CON', 
  'DESDE', 'PARA', 'POR', 'ONLINE', 'AT', 'ON', 'OFFICIAL', 'SITE', 'MERCADOLIBRE', 'MERCADO', 'LIBRE',
  'STANDARD', 'TD', 'CELL', 'UNLOCKED', 'CARRIER', 'PRECIOS', 'BAJOS', 'PRODUCTOS', 'CONFIANZA', 'HOY', 
  'BARATO', 'MEJOR', 'TIENDA', 'VENTA', 'PRECIO', 'UN', 'UNA', 'ESTE', 'ESTA'
];

const EXCLUDED_SUBSTRINGS = [
  'GALAXY', 'SWITCH', 'PLAYSTATION', 'XBOX', 'IPHONE', 'IPAD', 'MACBOOK', 'CHROMEBOOK', 
  'CONSOLE', 'AMAZON', 'WALMART', 'EBAY', 'SUPPORT', 'ANSWER', 'ARTICLE', 'REVIEWS', 
  'SPECS', 'SPECIFICATIONS', 'COMPRA', 'MERCADOLIBRE', 'MERCADO', 'LIBRE', 'WIFI', 'WI-FI',
  'BING', 'YAHOO', 'GOOGLE', 'DUCKDUCKGO', 'MSN', 'TRACK', 'CLICK', 'REDIRECT', 'PROMO', 'ADVERT', 'ADS', 'SPONSOR', 'URL', 'LINK'
];

const EXCLUDED_BRANDS = [
  'EBAY', 'AMAZON', 'WALMART', 'MERCADOLIBRE', 'MERCADO', 'LIBRE', 'ALIEXPRESS', 
  'SHOP', 'STORE', 'COMPRA', 'PRECIOS', 'PRODUCTOS', 'CONFIANZA', 'HOY'
];

function scoreUrl(url, title) {
  const u = url.toLowerCase();
  const t = title.toLowerCase();
  
  if (u.includes('.pdf') || t.includes('pdf')) return 1;

  let score = 8;

  if (u.includes('gsmarena.com')) score = 22;
  else if (u.includes('phonemore.com')) score = 20;
  else if (u.includes('everymac.com')) score = 19;
  else if (u.includes('devicespecifications.com')) score = 20;
  else if (u.includes('samsung.com') || u.includes('apple.com') || u.includes('nintendo.com') ||
      u.includes('motorola.com') || u.includes('sony.com') || u.includes('playstation.com') ||
      u.includes('xbox.com') || u.includes('microsoft.com')) {
    score = 18;
  }
  else if (u.includes('amazon.com') || u.includes('walmart.com') || u.includes('ebay.com') || u.includes('target.com')) {
    score = 10;
  }
  else if (u.includes('reddit.com') || u.includes('quora.com') || u.includes('ifixit.com')) {
    score = 5;
  }

  if (u.includes('specifications') || u.includes('specs') || t.includes('specifications') || t.includes('specs')) {
    score += 3;
  }

  if (u.includes('review') || u.includes('test') || t.includes('review') || t.includes('test') || t.includes('manual')) {
    score -= 5;
  }

  return score;
}

function cleanTitle(titleText, query) {
  let title = titleText
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&trade;/ig, '')
    .replace(/&reg;/ig, '')
    .replace(/&nbsp;/ig, ' ');

  title = title.replace(/[™®]/g, '');

  const parts = title.split(/\s+[\-\|—–•:]\s+|\s*[\|—–•:]\s*/);
  const qLower = query.toLowerCase();

  let bestPart = title;
  let bestScore = -1;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let score = 0;
    const pLower = trimmed.toLowerCase();

    if (pLower.includes(qLower)) {
      score += 10;
    } else {
      const qWords = qLower.split(/\s+/).filter(w => w.length > 1);
      for (const qw of qWords) {
        if (pLower.includes(qw)) {
          score += 3;
        }
      }
    }

    for (const brand of BRANDS) {
      if (pLower.includes(brand.toLowerCase())) {
        score += 2;
        break;
      }
    }

    if (/\b(gsmarena|phonemore|everymac|amazon|ebay|walmart|devicespecifications|manualslib)\b/i.test(pLower)) {
      score -= 5;
    }

    if (trimmed.length > 5 && trimmed.length < 45) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPart = trimmed;
    }
  }

  let result = bestPart.replace(/\[[^\]]*\]/g, '');
  result = result.replace(/\{[^}]*\}/g, '');
  
  result = result.replace(/\s*\([^)]*$/, '');
  return result.trim();
}

function isQuerySpecificModel(query) {
  const qUpper = query.trim().toUpperCase();
  const tokens = qUpper.split(/[\s]+/);
  for (const token of tokens) {
    if (/[A-Z]/i.test(token) && /[0-9]/.test(token) && token.length >= 4 && token.length <= 15) {
      const cleanToken = token.replace(/^[\-\/]+|[\-\/]+$/g, '');
      if (!BRANDS.includes(cleanToken) && !NOISE_WORDS.includes(cleanToken) && !EXCLUDED_SUBSTRINGS.includes(cleanToken)) {
        if (!/^\d+(?:GB|TB|RAM|MB|G|T)$/i.test(cleanToken) && !/^[0-9A-F]{8}$/i.test(cleanToken) && !/^B0[A-Z0-9]{8}$/i.test(cleanToken)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isValidModelNumber(code, brand, qUpper) {
  if (!code) return false;
  
  if (!(/[A-Z]/i.test(code) && /[0-9]/.test(code))) return false;
  if (code.length < 4 || code.length > 15) return false;
  if (code.includes(' ')) return false;

  const upperCode = code.toUpperCase();

  if (BRANDS.some(b => upperCode.includes(b))) return false;
  if (NOISE_WORDS.includes(upperCode)) return false;
  if (upperCode === qUpper) return false;
  if (EXCLUDED_SUBSTRINGS.some(sub => upperCode.includes(sub))) return false;

  if (/^B0[A-Z0-9]{8}$/i.test(upperCode)) return false;
  if (/^[0-9A-F]{8}$/i.test(upperCode)) return false;
  if (/^(?:ANS|ART|FAQ|DOC)\d+$/i.test(upperCode)) return false;
  if (/^\d+(?:GB|TB|RAM|MB|G|T)$/i.test(upperCode)) return false;
  if (/^(?:HTML|INDEX|SHOP|PRODUCT|SEARCH|DETAIL|CATEGORY|SUPPORT|IMAGE|PHOTO|SCREEN|GLASS)$/i.test(upperCode)) return false;

  return true;
}

function isValidModelNumberForBrand(code, brand) {
  const upperCode = code.toUpperCase();
  const upperBrand = brand.toUpperCase();

  if (upperBrand === 'SAMSUNG') {
    return /^SM-?[A-Z0-9]+|^GT-?[A-Z0-9]+/i.test(upperCode);
  }
  if (upperBrand === 'MOTOROLA' || upperBrand === 'MOTO') {
    return /^XT-?[0-9]+/i.test(upperCode);
  }
  if (upperBrand === 'APPLE') {
    return /^A[0-9]{4}$/i.test(upperCode);
  }
  if (upperBrand === 'NINTENDO') {
    return /^(?:HAC|HEG|HDH|SPR|CTR|FTR|WUP|DOL|AGB|C-A)-?[0-9]+/i.test(upperCode);
  }
  if (upperBrand === 'SONY') {
    return /^(?:CFI|CUH|CECH|CEJH|PSP)-?[0-9]+/i.test(upperCode);
  }
  return true;
}

function parseCandidates(candidates, query, requireModelNumber) {
  const qUpper = query.trim().toUpperCase();
  const queryIsModelNum = isQuerySpecificModel(query);

  const results = [];
  const seenKeys = new Set();

  for (const cand of candidates) {
    const tUpper = cand.title.toUpperCase();
    const urlUpper = cand.url.toUpperCase();

    let foundBrand = '';
    for (const brand of BRANDS) {
      const bRegex = new RegExp('\\b' + brand + '\\b', 'i');
      if (bRegex.test(tUpper) || bRegex.test(urlUpper)) {
        foundBrand = brand;
        break;
      }
    }

    if (!foundBrand) {
      const firstWordMatch = cand.title.match(/^\b([A-Za-z0-9]+)\b/);
      if (firstWordMatch && firstWordMatch[1].length > 2) {
        foundBrand = firstWordMatch[1].toUpperCase();
      }
    }

    if (!foundBrand) continue;

    let brandDisplay = foundBrand;
    if (foundBrand === 'IPHONE' || foundBrand === 'IPAD') {
      brandDisplay = 'APPLE';
    } else if (foundBrand === 'MOTO') {
      brandDisplay = 'MOTOROLA';
    } else if (foundBrand === 'REDMI' || foundBrand === 'POCO') {
      brandDisplay = 'XIAOMI';
    } else if (foundBrand === 'PLAYSTATION') {
      brandDisplay = 'SONY';
    }

    if (EXCLUDED_BRANDS.includes(brandDisplay)) {
      continue;
    }

    let foundModelNumber = '';
    if (queryIsModelNum) {
      const tokens = qUpper.split(/[\s]+/);
      for (const token of tokens) {
        const cleanToken = token.replace(/^[\-\/]+|[\-\/]+$/g, '');
        if (isValidModelNumber(cleanToken, brandDisplay, '') && isValidModelNumberForBrand(cleanToken, brandDisplay)) {
          foundModelNumber = token;
          break;
        }
      }
      if (!foundModelNumber) {
        foundModelNumber = qUpper;
      }
    } else {
      let possibleCodes = [];

      // 1. Extraer desde paréntesis primero
      const parenRegex = /\(([^)]+)\)/g;
      let parenMatch;
      while ((parenMatch = parenRegex.exec(cand.title)) !== null) {
        const content = parenMatch[1].trim();
        if (isValidModelNumber(content, brandDisplay, qUpper) && isValidModelNumberForBrand(content, brandDisplay)) {
          possibleCodes.push(content.toUpperCase());
        }
      }

      // 2. Extraer patrones alfanuméricos de Title
      const wordRegex = /\b[A-Z0-9]{2,10}-[A-Z0-9]{2,15}\b|\b[A-Z0-9]{4,15}\b/gi;
      let wordMatch;
      while ((wordMatch = wordRegex.exec(cand.title)) !== null) {
        const content = wordMatch[0];
        if (isValidModelNumber(content, brandDisplay, qUpper) && isValidModelNumberForBrand(content, brandDisplay)) {
          possibleCodes.push(content.toUpperCase());
        }
      }

      // 3. Extraer patrones alfanuméricos de URL (excluyendo el dominio)
      try {
        const parsedUrl = new URL(cand.url);
        const urlPathAndQuery = parsedUrl.pathname + parsedUrl.search;
        let urlMatch;
        while ((urlMatch = wordRegex.exec(urlPathAndQuery)) !== null) {
          const content = urlMatch[0];
          if (isValidModelNumber(content, brandDisplay, qUpper) && isValidModelNumberForBrand(content, brandDisplay)) {
            possibleCodes.push(content.toUpperCase());
          }
        }
      } catch (err) {
        // En caso de que URL no sea válida
      }

      if (possibleCodes.length > 0) {
        foundModelNumber = possibleCodes[0];
      }
    }

    if (requireModelNumber && !foundModelNumber) {
      continue;
    }

    let modelName = cand.title;

    const brandRegex = new RegExp('\\b' + foundBrand + '\\b', 'ig');
    modelName = modelName.replace(brandRegex, '').trim();

    if (brandDisplay !== foundBrand) {
      const displayRegex = new RegExp('\\b' + brandDisplay + '\\b', 'ig');
      modelName = modelName.replace(displayRegex, '').trim();
    }

    if (brandDisplay === 'MOTOROLA') {
      modelName = modelName.replace(/\bMOTO\b/ig, '').trim();
    }

    modelName = modelName.replace(/\([^)]*\)/g, '');

    if (foundModelNumber) {
      const escCode = foundModelNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const mnRegex = new RegExp('\\b' + escCode + '\\b', 'i');
      modelName = modelName.replace(mnRegex, '');
    }

    modelName = modelName.replace(/\dots|…/g, '');
    modelName = modelName.replace(/\b\d+(GB|TB|RAM|MB|G|T)\b/ig, '');

    for (const noise of NOISE_WORDS) {
      const noiseRegex = new RegExp('\\b' + noise + '\\b', 'ig');
      modelName = modelName.replace(noiseRegex, '').trim();
    }

    modelName = modelName.replace(/&[a-z0-9#]+;/ig, '');
    modelName = modelName.replace(/[\-\s\+,]{2,}/g, ' ');
    modelName = modelName.replace(/^[\s\-\+\,\/]+|[\s\-\+\,\/]+$/g, '');

    let words = modelName.split(/\s+/);
    const uniqueWords = [];
    const seenWords = new Set();
    for (const w of words) {
      const wUpper = w.toUpperCase();
      if (!seenWords.has(wUpper)) {
        seenWords.add(wUpper);
        uniqueWords.push(w);
      }
    }
    
    if (uniqueWords.length > 3) {
      const modifiers = ['PRO', 'MAX', 'LITE', 'OLED', 'PLUS', 'ULTRA', '5G', '4G'];
      if (modifiers.includes(uniqueWords[3].toUpperCase())) {
        words = uniqueWords.slice(0, 4);
      } else {
        words = uniqueWords.slice(0, 3);
      }
    } else {
      words = uniqueWords;
    }
    modelName = words.join(' ');

    modelName = modelName.trim();

    if (modelName.length > 1) {
      if (brandDisplay === 'APPLE' && !modelName.toUpperCase().includes('IPHONE') && !modelName.toUpperCase().includes('IPAD') && !modelName.toUpperCase().includes('WATCH')) {
        if (tUpper.includes('IPHONE') || urlUpper.includes('IPHONE')) {
          modelName = 'iPhone ' + modelName;
        } else if (tUpper.includes('IPAD') || urlUpper.includes('IPAD')) {
          modelName = 'iPad ' + modelName;
        } else if (tUpper.includes('WATCH') || urlUpper.includes('WATCH')) {
          modelName = 'Apple Watch ' + modelName;
        }
      }

      const brand = brandDisplay.toUpperCase();
      const model = modelName.toUpperCase();
      const modelNum = foundModelNumber.toUpperCase() || '';
      
      const key = `${brand}|${model}|${modelNum}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({ brand, model, modelNumber: modelNum });
      }
    }

    if (queryIsModelNum && results.length >= 1) {
      break;
    }

    if (results.length >= 5) break;
  }

  return results;
}

function decodeYahooUrl(url) {
  if (url.includes('/RU=')) {
    const parts = url.split('/RU=');
    if (parts[1]) {
      const decoded = decodeURIComponent(parts[1].split('/RK=')[0]);
      return decoded;
    }
  }
  return url;
}

async function parseYahooResponseWithGemini(candidates, query) {
  const ai = getAiClient();
  if (!ai) {
    console.log('[Gemini] No client available (no API Key). Falling back to local parser.');
    return null;
  }

  const prompt = `
El usuario del taller de reparaciones está buscando el dispositivo: "${query}".
Aquí están los primeros resultados de búsqueda de internet (títulos y URLs):
${candidates.slice(0, 10).map((c, i) => `[${i + 1}] Título: "${c.title}" | URL: "${c.url}"`).join('\n')}

Extrae una lista ordenada de hasta 5 sugerencias de dispositivos físicos que coincidan con la intención de búsqueda del usuario.
Reglas:
1. Solo extrae dispositivos de hardware reales (celulares, consolas de videojuegos, tablets, smartwatches, etc.).
2. Identifica y limpia la marca (ej: "NINTENDO", "SAMSUNG", "APPLE", "MOTOROLA").
3. Limpia el modelo comercial a mayúsculas (ej: "SWITCH LITE", "GALAXY A17", "IPHONE 11"). No incluyas palabras redundantes ni la marca en el modelo.
4. Identifica y extrae el código o número de modelo técnico exacto si está presente o si es deducible de las URLs/títulos (ej: "HDH-001", "SM-A176B", "A2111"). Si no se puede deducir de ninguna forma, pon cadena vacía "".
5. Clasifica el tipo de dispositivo ("type") en una de las siguientes categorías exactas: "Phone" (para celulares), "Tablet" (para tablets), "Watch" (para relojes inteligentes), "Laptop" (para computadoras portátiles), o "Consola" (para consolas de videojuegos como Nintendo Switch, Playstation, Xbox).
6. Descarta accesorios, refacciones, fundas, micas, manuales, tutoriales de reparación o guías.
7. Evita duplicados.
`;

  try {
    console.log('[Gemini] Requesting clean devices from Gemini API...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              brand: { type: 'STRING' },
              model: { type: 'STRING' },
              modelNumber: { type: 'STRING' },
              type: { type: 'STRING' }
            },
            required: ['brand', 'model', 'modelNumber', 'type']
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        // Formatear a mayúsculas los campos de respuesta y limpiar cadenas
        const results = parsed.map(item => ({
          brand: (item.brand || '').trim().toUpperCase(),
          model: (item.model || '').trim().toUpperCase(),
          modelNumber: (item.modelNumber || '').trim().toUpperCase(),
          type: (item.type || 'Phone').trim()
        })).filter(item => item.brand && item.model);
        
        console.log('[Gemini] Parse successful. Found count:', results.length);
        return results;
      }
    }
    return null;
  } catch (err) {
    console.error('[Gemini] Error calling Gemini API:', err);
    return null;
  }
}

async function parseYahooResponse(html, query) {
  const regex = /<a class="d-ib va-top[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*title[^"]*"[^>]*><span[^>]*>([\s\S]+?)<\/span><\/h3><\/a>/g;
  let match;
  const candidates = [];

  while ((match = regex.exec(html)) !== null) {
    const rawUrl = match[1];
    const titleText = match[2].replace(/<[^>]*>/g, '').trim();
    const url = decodeYahooUrl(rawUrl);
    const title = cleanTitle(titleText, query);
    const score = scoreUrl(url, title);

    candidates.push({ url, title, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return [];

  // 1. Intentamos extraer localmente con Regex primero (para velocidad instantánea)
  console.log('[parseYahooResponse] Running local regex parser first...');
  const queryIsModelNum = isQuerySpecificModel(query);
  let results = parseCandidates(candidates, query, !queryIsModelNum);

  if (results.length === 0) {
    results = parseCandidates(candidates, query, false);
  }

  // Si obtuvimos resultados locales, los devolvemos de inmediato
  if (results && results.length > 0) {
    console.log(`[parseYahooResponse] Local parser succeeded with ${results.length} results. Returning instantly.`);
    return results;
  }

  // 2. Fallback con Gemini si el parser local no encontró nada
  console.log('[parseYahooResponse] Local parser returned 0 results. Querying Gemini as fallback...');
  const geminiResults = await parseYahooResponseWithGemini(candidates, query);
  if (geminiResults && geminiResults.length > 0) {
    return geminiResults;
  }

  return [];
}

ipcMain.handle('lookup-device-internet', async (_, { query }) => {
  if (!query || query.trim().length < 3) return [];
  try {
    const queryIsModelNum = isQuerySpecificModel(query);
    
    let searchTerm = query.trim();
    if (!queryIsModelNum) {
      searchTerm += ' model number';
    }

    const url = `https://search.yahoo.com/search?q=${encodeURIComponent(searchTerm)}`;
    console.log('[lookup-device-internet] Query:', query, 'IsModel:', queryIsModelNum, 'SearchTerm:', searchTerm, 'URL:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('[lookup-device-internet] HTTP Status:', response.status);
    if (!response.ok) {
      console.warn('Yahoo Search lookup returned status:', response.status);
      return [];
    }
    const html = await response.text();
    console.log('[lookup-device-internet] HTML size:', html.length);
    const parsed = await parseYahooResponse(html, query);
    console.log('[lookup-device-internet] Parsed candidates count:', parsed.length, 'Results:', parsed);
    return parsed;
  } catch (err) {
    console.error('Error durante lookup-device-internet:', err);
    return [];
  }
});

// ─── IPC: TELEGRAM HELPERS ────────────────────────────────────────────────────
// Llama a la API de Telegram desde main process (sin CORS)
function telegramGet(path) {
  return new Promise((resolve) => {
    const req = require('https').get(`https://api.telegram.org${path}`, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(raw) }); }
        catch { resolve({ ok: false, error: 'Respuesta no válida', raw }); }
      });
    });
    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
  });
}

// Verifica el token y devuelve info del bot
ipcMain.handle('telegram-get-me', async (_, { token }) => {
  const res = await telegramGet(`/bot${token}/getMe`);
  return res;
});

// Obtiene los últimos updates para extraer el chat_id del primer mensaje
ipcMain.handle('telegram-get-updates', async (_, { token }) => {
  const res = await telegramGet(`/bot${token}/getUpdates?limit=10&allowed_updates=["message"]`);
  return res;
});

// ─── IPC: TELEGRAM (POST JSON desde main process, sin restricciones CORS) ─────
ipcMain.handle('send-telegram', (_, { url, body }) => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const data = Buffer.from(body, 'utf8');
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };
      const req = require('https').request(options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          console.log('[Telegram] Status:', res.statusCode, '| Response:', raw.slice(0, 300));
          resolve({ ok: res.statusCode === 200, status: res.statusCode, body: raw.slice(0, 500) });
        });
      });
      req.on('error', (err) => {
        console.warn('[Telegram] Error HTTP:', err.message);
        resolve({ ok: false, error: err.message });
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout (10s)' });
      });
      req.write(data);
      req.end();
    } catch (err) {
      console.warn('[Telegram] Error:', err.message);
      resolve({ ok: false, error: err.message });
    }
  });
});

// ─── IPC: TAECEL API REQUEST (petición HTTP POST sin restricciones CORS) ──────
ipcMain.handle('taecel-api-request', (_, { endpoint, body }) => {
  return new Promise((resolve) => {
    try {
      const params = new URLSearchParams();
      if (body && typeof body === 'object') {
        for (const [key, value] of Object.entries(body)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        }
      }
      const data = Buffer.from(params.toString(), 'utf8');
      const options = {
        hostname: 'app.taecel.com',
        path: `/api/${endpoint}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length,
        },
      };
      const req = require('https').request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, body: body });
        });
      });
      req.on('error', (err) => {
        console.warn('[Taecel IPC] Error HTTP:', err.message);
        resolve({ status: 500, error: err.message });
      });
      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ status: 504, error: 'Timeout (15s)' });
      });
      req.write(data);
      req.end();
    } catch (err) {
      console.warn('[Taecel IPC] Error:', err.message);
      resolve({ status: 500, error: err.message });
    }
  });
});

// ─── IPC: WHATSAPP (petición HTTP desde main process, sin restricciones CORS) ─
ipcMain.handle('send-whatsapp', (_, { url }) => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
      const req = lib.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log('[WhatsApp] Status:', res.statusCode, '| Response:', body.slice(0, 200));
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: body.slice(0, 500) });
        });
      });
      req.on('error', (err) => {
        console.warn('[WhatsApp] Error HTTP:', err.message);
        resolve({ ok: false, error: err.message });
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout (10s)' });
      });
    } catch (err) {
      console.warn('[WhatsApp] Error construyendo URL:', err.message);
      resolve({ ok: false, error: err.message });
    }
  });
});

// ─── IPC: WHATSAPP POST (envía petición HTTP POST con JSON/Media desde el main process sin CORS) ─
ipcMain.handle('send-whatsapp-post', (_, { url, headers, body }) => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const data = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(JSON.stringify(body), 'utf8');
      const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
      
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...headers
      };

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: reqHeaders,
      };

      const req = lib.request(options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          console.log('[WhatsApp POST] Status:', res.statusCode, '| Response:', raw.slice(0, 200));
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: raw });
        });
      });

      req.on('error', (err) => {
        console.warn('[WhatsApp POST] Error HTTP:', err.message);
        resolve({ ok: false, error: err.message });
      });

      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout (15s)' });
      });

      req.write(data);
      req.end();
    } catch (err) {
      console.warn('[WhatsApp POST] Error:', err.message);
      resolve({ ok: false, error: err.message });
    }
  });
});


// ─── IPC: SISTEMA ──────────────────────────────────────────────────────────────
let geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiInstance = null;

function getAiClient() {
  const key = geminiApiKey || process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  if (!aiInstance || aiInstance.apiKey !== key) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      aiInstance = new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.error('[getAiClient] Error initializing GoogleGenAI:', err);
      return null;
    }
  }
  return aiInstance;
}

ipcMain.handle('set-gemini-key', (_, { key }) => {
  if (key && typeof key === 'string') {
    geminiApiKey = key.trim();
    console.log('[set-gemini-key] Gemini API Key updated.');
  }
  return true;
});

ipcMain.handle('get-api-key', () => {
  return geminiApiKey || process.env.GEMINI_API_KEY || '';
});

const LOCAL_TOP_100_DEVICES = [
  { brand: 'APPLE', model: 'IPHONE 11', modelNumber: 'A2111', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 11 PRO', modelNumber: 'A2215', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 11 PRO MAX', modelNumber: 'A2218', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12', modelNumber: 'A2172', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12 MINI', modelNumber: 'A2176', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12 PRO', modelNumber: 'A2341', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12 PRO MAX', modelNumber: 'A2342', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13', modelNumber: 'A2482', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 MINI', modelNumber: 'A2481', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 PRO', modelNumber: 'A2483', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 PRO MAX', modelNumber: 'A2484', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14', modelNumber: 'A2649', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PLUS', modelNumber: 'A2632', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PRO', modelNumber: 'A2650', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PRO MAX', modelNumber: 'A2651', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15', modelNumber: 'A2846', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15 PLUS', modelNumber: 'A2847', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15 PRO', modelNumber: 'A2848', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15 PRO MAX', modelNumber: 'A2849', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A10', modelNumber: 'SM-A105F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A11', modelNumber: 'SM-A115F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A12', modelNumber: 'SM-A125F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A13', modelNumber: 'SM-A135F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A14', modelNumber: 'SM-A145F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A15', modelNumber: 'SM-A155F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A20', modelNumber: 'SM-A205F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A21S', modelNumber: 'SM-A217F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A22', modelNumber: 'SM-A225F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A30', modelNumber: 'SM-A305F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A31', modelNumber: 'SM-A315F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A32', modelNumber: 'SM-A325F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A50', modelNumber: 'SM-A505G', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A51', modelNumber: 'SM-A515F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A52', modelNumber: 'SM-A525F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A53 5G', modelNumber: 'SM-A536B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A54 5G', modelNumber: 'SM-A546B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S20 FE', modelNumber: 'SM-G780F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S21 FE', modelNumber: 'SM-G990B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S22 ULTRA', modelNumber: 'SM-S908B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S23 ULTRA', modelNumber: 'SM-S918B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S24 ULTRA', modelNumber: 'SM-S928B', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G8 POWER', modelNumber: 'XT2041-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G9 PLAY', modelNumber: 'XT2083-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G20', modelNumber: 'XT2128-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G22', modelNumber: 'XT2231-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G30', modelNumber: 'XT2129-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G50', modelNumber: 'XT2137-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G60', modelNumber: 'XT2135-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO E7', modelNumber: 'XT2097-5', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO E20', modelNumber: 'XT2155-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'EDGE 30', modelNumber: 'XT2203-1', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'EDGE 40', modelNumber: 'XT2303-1', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 8', modelNumber: 'M1908C3JG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 8 PRO', modelNumber: 'M1906G7G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 9', modelNumber: 'M2003J15SG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 9 PRO', modelNumber: 'M2003J6B2G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 10', modelNumber: 'M2101K7AG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 10 PRO', modelNumber: 'M2101K6G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 11', modelNumber: '2201117TG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 11 PRO', modelNumber: '2201116TG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 12', modelNumber: '23021RAAEG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 12 PRO', modelNumber: '22101316G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 13', modelNumber: '23129RAA4G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 13 PRO', modelNumber: '23117RA50G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 9', modelNumber: 'M2004J19G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 9A', modelNumber: 'M2006C3LG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 10', modelNumber: '21061119DG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 10C', modelNumber: '220333QNY', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 12C', modelNumber: '2212ARNC4L', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO X3 PRO', modelNumber: 'M2102J20SG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO F3', modelNumber: 'M2012K11AG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO X5 PRO', modelNumber: '22101320G', type: 'Phone' },
  { brand: 'HUAWEI', model: 'Y9 2019', modelNumber: 'JKM-LX3', type: 'Phone' },
  { brand: 'HUAWEI', model: 'P30 LITE', modelNumber: 'MAR-LX3A', type: 'Phone' },
  { brand: 'HUAWEI', model: 'P40 LITE', modelNumber: 'JNY-LX2', type: 'Phone' },
  { brand: 'HUAWEI', model: 'NOVA 9', modelNumber: 'NAM-LX9', type: 'Phone' },
  { brand: 'OPPO', model: 'A17', modelNumber: 'CPH2477', type: 'Phone' },
  { brand: 'OPPO', model: 'A38', modelNumber: 'CPH2579', type: 'Phone' },
  { brand: 'OPPO', model: 'A54', modelNumber: 'CPH2239', type: 'Phone' },
  { brand: 'OPPO', model: 'A57', modelNumber: 'CPH2387', type: 'Phone' },
  { brand: 'OPPO', model: 'RENO 7', modelNumber: 'CPH2363', type: 'Phone' },
  { brand: 'OPPO', model: 'RENO 10', modelNumber: 'CPH2531', type: 'Phone' },
  { brand: 'REALME', model: 'C11', modelNumber: 'RMX2185', type: 'Phone' },
  { brand: 'REALME', model: 'C35', modelNumber: 'RMX3511', type: 'Phone' },
  { brand: 'REALME', model: 'C53', modelNumber: 'RMX3760', type: 'Phone' },
  { brand: 'NINTENDO', model: 'SWITCH', modelNumber: 'HAC-001', type: 'Consola' },
  { brand: 'NINTENDO', model: 'SWITCH LITE', modelNumber: 'HDH-001', type: 'Consola' },
  { brand: 'NINTENDO', model: 'SWITCH OLED', modelNumber: 'HEG-001', type: 'Consola' },
  { brand: 'SONY', model: 'PLAYSTATION 4 SLIM', modelNumber: 'CUH-2000', type: 'Consola' },
  { brand: 'SONY', model: 'PLAYSTATION 4 PRO', modelNumber: 'CUH-7000', type: 'Consola' },
  { brand: 'SONY', model: 'PLAYSTATION 5', modelNumber: 'CFI-1000', type: 'Consola' },
  { brand: 'MICROSOFT', model: 'XBOX ONE S', modelNumber: '1681', type: 'Consola' },
  { brand: 'MICROSOFT', model: 'XBOX ONE X', modelNumber: '1787', type: 'Consola' },
  { brand: 'MICROSOFT', model: 'XBOX SERIES S', modelNumber: '1883', type: 'Consola' },
  { brand: 'MICROSOFT', model: 'XBOX SERIES X', modelNumber: '1882', type: 'Consola' },
  { brand: 'APPLE', model: 'IPAD 9TH GEN', modelNumber: 'A2602', type: 'Tablet' },
  { brand: 'APPLE', model: 'IPAD 10TH GEN', modelNumber: 'A2696', type: 'Tablet' },
  { brand: 'SAMSUNG', model: 'GALAXY TAB A8', modelNumber: 'SM-X200', type: 'Tablet' },
  { brand: 'SAMSUNG', model: 'GALAXY TAB A9', modelNumber: 'SM-X110', type: 'Tablet' },
  { brand: 'APPLE', model: 'MACBOOK AIR M1', modelNumber: 'A2337', type: 'Laptop' },
  { brand: 'APPLE', model: 'MACBOOK AIR M2', modelNumber: 'A2681', type: 'Laptop' },
  { brand: 'APPLE', model: 'MACBOOK PRO M1', modelNumber: 'A2338', type: 'Laptop' }
];

ipcMain.handle('get-top-devices', async () => {
  const ai = getAiClient();
  if (ai) {
    try {
      console.log('[Gemini] Requesting top 100 popular devices for LATAM...');
      const prompt = `
        Genera una lista de los 100 dispositivos (teléfonos celulares, tablets y consolas de videojuegos) más populares, comunes o frecuentemente reparados en México y Latinoamérica.
        Responde ÚNICAMENTE con un arreglo JSON. Cada objeto del arreglo debe tener exactamente estas propiedades:
        - "brand": la marca del dispositivo en mayúsculas (ej. "SAMSUNG", "APPLE", "MOTOROLA", "XIAOMI", "NINTENDO", "SONY").
        - "model": el modelo comercial limpio en mayúsculas (ej. "GALAXY A15", "IPHONE 13", "MOTO G22", "SWITCH LITE"). No incluyas la marca en el modelo.
        - "modelNumber": el número de modelo técnico principal o código técnico común si existe (ej. "SM-A155F", "A2633", "XT2231-1", "HDH-001"). Si no hay un código estándar común, pon "".
        - "type": el tipo de dispositivo ("Phone", "Tablet", "Laptop", "Desktop", "Consola" u "Other").
        
        Ordena la lista de los más populares a los menos populares. Evita duplicados.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                brand: { type: 'STRING' },
                model: { type: 'STRING' },
                modelNumber: { type: 'STRING' },
                type: { type: 'STRING' }
              },
              required: ['brand', 'model', 'modelNumber', 'type']
            }
          }
        }
      });
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('[Gemini] Successfully generated top devices list. Count:', parsed.length);
          return parsed.map(item => ({
            brand: (item.brand || '').trim().toUpperCase(),
            model: (item.model || '').trim().toUpperCase(),
            modelNumber: (item.modelNumber || '').trim().toUpperCase(),
            type: (item.type || 'Phone').trim()
          }));
        }
      }
    } catch (err) {
      console.error('[Gemini] Error generating top devices list, falling back to local static top 100 list:', err);
    }
  }
  
  console.log('[main.js] No Gemini key or call failed, returning local static top 100 list.');
  return LOCAL_TOP_100_DEVICES;
});

ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  } catch (err) {
    console.error('[select-folder] Error opening folder dialog:', err);
    return null;
  }
});

ipcMain.handle('write-backup-file', async (_, { folderPath, filename, content }) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const fullPath = path.join(folderPath, filename);
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true, filePath: fullPath };
  } catch (e) {
    console.error('write-backup-file failed:', e);
    return { success: false, error: e.message };
  }
});

// Manejo de respaldos pendientes (offline backup fallback)
ipcMain.handle('save-pending-backup', async (_, { filename, content }) => {
  try {
    const pendingDir = path.join(app.getPath('userData'), 'pending_backups');
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    const safeFilename = filename || `pending_backup_${Date.now()}.json`;
    const fullPath = path.join(pendingDir, safeFilename);
    fs.writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
    return { success: true, filePath: fullPath, filename: safeFilename };
  } catch (e) {
    console.error('[Pending Backup] Error al guardar respaldo pendiente local:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-pending-backups', async () => {
  try {
    const pendingDir = path.join(app.getPath('userData'), 'pending_backups');
    if (!fs.existsSync(pendingDir)) return [];
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));
    const results = [];
    for (const filename of files) {
      try {
        const fullPath = path.join(pendingDir, filename);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(raw);
        results.push({ filename, data });
      } catch (_) {}
    }
    return results;
  } catch (e) {
    console.error('[Pending Backup] Error leyendo respaldos pendientes:', e);
    return [];
  }
});

ipcMain.handle('delete-pending-backup', async (_, filename) => {
  try {
    const pendingDir = path.join(app.getPath('userData'), 'pending_backups');
    const fullPath = path.join(pendingDir, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  } catch (e) {
    console.error('[Pending Backup] Error eliminando respaldo pendiente:', e);
    return { success: false, error: e.message };
  }
});
ipcMain.handle('get-printers', async () => {
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    console.log('get-printers detected:', printers);
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status
    }));
  } catch (e) {
    console.log('Error getting printers:', e);
    return [];
  }
});

// ─── RESOLVER NOMBRE DE IMPRESORA ──────────────────────────────────────────────
async function resolvePrinterName(requestedName) {
  if (!requestedName || !requestedName.trim()) {
    return '';
  }
  const cleanRequested = requestedName.trim();
  if (
    cleanRequested.toLowerCase() === 'sin impresora configurada' ||
    cleanRequested.toLowerCase() === 'default' ||
    cleanRequested.toLowerCase() === 'impresora predeterminada del sistema'
  ) {
    return '';
  }
  try {
    let tempWin = null;
    let win = mainWindow;
    if (!win) {
      tempWin = new BrowserWindow({ show: false });
      win = tempWin;
    }
    const printers = await win.webContents.getPrintersAsync();
    if (tempWin) {
      try { tempWin.destroy(); } catch (_) {}
    }
    
    // 1. Coincidencia exacta
    const exactMatch = printers.find(p => p.name === cleanRequested);
    if (exactMatch) return exactMatch.name;

    // 2. Coincidencia sin distinguir mayúsculas/minúsculas
    const ciMatch = printers.find(p => p.name.toLowerCase() === cleanRequested.toLowerCase());
    if (ciMatch) return ciMatch.name;

    // 3. Coincidencia normalizada (ignorando espacios, guiones bajos y guiones medios)
    const normalize = (s) => s.toLowerCase().replace(/[\s_-]/g, '');
    const normRequested = normalize(cleanRequested);
    const normMatch = printers.find(p => normalize(p.name) === normRequested);
    if (normMatch) return normMatch.name;

    // 4. Coincidencia por displayName (nombre amigable que ve el usuario)
    const displayMatch = printers.find(p => p.displayName && p.displayName.toLowerCase() === cleanRequested.toLowerCase());
    if (displayMatch) return displayMatch.name;

    const normDisplayMatch = printers.find(p => p.displayName && normalize(p.displayName) === normRequested);
    if (normDisplayMatch) return normDisplayMatch.name;

    console.warn(`resolvePrinterName: Impresora "${requestedName}" no encontrada en el sistema. Se usará la predeterminada.`);
    return '';
  } catch (err) {
    console.error('Error al resolver nombre de impresora:', err);
    return '';
  }
}

// ─── IMPRESIÓN SILENCIOSA ──────────────────────────────────────────────────────
// Imprime la página actual del renderer sin mostrar diálogo del OS.
// deviceName: nombre exacto del dispositivo (vacío = impresora por defecto).
// copies: número de copias (default 1).
ipcMain.handle('silent-print', async (_, options = {}) => {
  const resolvedDeviceName = await resolvePrinterName(options.deviceName);
  return new Promise((resolve, reject) => {
    let paperWidth = options.isLabel 
      ? (options.paperWidthMicrons || 51000) 
      : (options.paperWidthMicrons || 72000);
    
    // Normalizar solo si NO es etiqueta
    if (!options.isLabel) {
      if (paperWidth && paperWidth <= 60000) {
        paperWidth = 58000; // Normalizar 58mm a 58000 micrones físicamente esperados
      } else if (paperWidth > 60000 && paperWidth <= 90000) {
        paperWidth = 80000; // Normalizar 80mm a 80000 micrones físicamente esperados
      }
    }

    const is58mm = !options.isLabel && paperWidth <= 60000;
    const isMediaCarta = paperWidth === 215900;
    const paperHeight = options.isLabel 
      ? (options.paperHeightMicrons || 25000) 
      : (is58mm ? 297000 : (options.paperHeightMicrons || (isMediaCarta ? 139700 : 297000)));
    
    const printOptions = {
      silent: true,
      printBackground: true,
      margins: options.isLabel ? { marginType: 'none' } : ((isMediaCarta && !is58mm) ? { marginType: 'none' } : { marginType: 'printableArea' }),
      copies: options.copies || 1,
    };
    
    if (options.isLabel) {
      printOptions.landscape = options.landscape !== undefined ? options.landscape : true;
      printOptions.preferCSSPageSize = true;
      printOptions.pageSize = { width: paperWidth, height: paperHeight };
    } else {
      printOptions.landscape = options.landscape !== undefined ? options.landscape : false;
      if (options.usePrinterDefaultPageSize && !is58mm) {
        printOptions.usePrinterDefaultPageSize = true;
      } else {
        if (isMediaCarta) {
          printOptions.preferCSSPageSize = true;
        }
        printOptions.pageSize = { width: paperWidth, height: paperHeight };
      }
    }
    if (resolvedDeviceName) {
      printOptions.deviceName = resolvedDeviceName;
    }
    if (options.duplexMode) {
      printOptions.duplexMode = options.duplexMode;
    }
    mainWindow.webContents.print(printOptions, (success, failureReason) => {
      if (success) {
        resolve({ success: true });
      } else {
        console.log('silent-print failed:', failureReason);
        reject(new Error(failureReason || 'Print failed'));
      }
    });
  });
});

// Imprime HTML arbitrario en una ventana invisible sin mostrar diálogo del OS.
// Útil para reimprimir tickets desde el historial sin navegar a PrintView.
function printHtmlHelper(options = {}) {
  console.log('printHtmlHelper called with options (excluding html):', { ...options, html: options.html ? `HTML string of length ${options.html.length}` : '' });
  const { html = '', deviceName = '', copies = 1, paperWidthMicrons, paperHeightMicrons, isLabel, duplexMode, useDynamicHeight, usePrinterDefaultPageSize, selectedPrinterProfileId } = options;
  
  // Normalizar los anchos de papel a los anchos físicos que esperan los controladores (drivers)
  let effectiveWidthMicrons = paperWidthMicrons;
  if (effectiveWidthMicrons && !isLabel) {
    if (effectiveWidthMicrons <= 60000) {
      effectiveWidthMicrons = 58000; // Forzar 58mm físicamente en el driver
    } else if (effectiveWidthMicrons > 60000 && effectiveWidthMicrons <= 90000) {
      if (selectedPrinterProfileId === 'star-tsp100') {
        effectiveWidthMicrons = 72000; // La Star Micronics TSP100 requiere exactamente 72mm
      } else {
        effectiveWidthMicrons = 80000; // Por defecto para otros perfiles de 80mm se envían 80mm
      }
    }
  }

  return new Promise((resolve, reject) => {
    const winWidth = effectiveWidthMicrons ? Math.round(effectiveWidthMicrons / 1000 * 3.7795) : 300;
    const winHeight = paperHeightMicrons ? Math.round(paperHeightMicrons / 1000 * 3.7795) : 1200;
    const win = new BrowserWindow({
      show: false,
      width: winWidth,
      height: winHeight,
      frame: false,
      useContentSize: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Escribir HTML a archivo temporal para soportar logos base64 largos
    const tmpFile = path.join(os.tmpdir(), `fixmanager-ticket-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.html`);
    fs.writeFileSync(tmpFile, html, 'utf8');
    win.loadURL('file://' + tmpFile);

    win.webContents.once('did-finish-load', () => {
      // Espera para que estilos y scripts (barcode) se ejecuten
      setTimeout(async () => {
        const is58mm = effectiveWidthMicrons && effectiveWidthMicrons <= 60000;
        const isMediaCarta = effectiveWidthMicrons === 215900;
        const isThermal = effectiveWidthMicrons && effectiveWidthMicrons <= 90000 && !isLabel;

        const finalUseDynamicHeight = is58mm ? false : useDynamicHeight;
        const finalUsePrinterDefaultPageSize = is58mm ? false : usePrinterDefaultPageSize;

        let resolvedHeightMicrons = is58mm ? 297000 : paperHeightMicrons;
        if (!resolvedHeightMicrons && isThermal && finalUseDynamicHeight) {
          try {
            const contentHeightPixels = await win.webContents.executeJavaScript(
              'document.body.scrollHeight || document.documentElement.scrollHeight || 600'
            );
            // 1 px = 264.5833 microns at 96 DPI
            resolvedHeightMicrons = Math.round(contentHeightPixels * 264.5833) + 12000; // 12mm buffer padding
            console.log(`[Printer Main] Dynamic thermal height calculated: ${contentHeightPixels}px -> ${resolvedHeightMicrons} microns`);
          } catch (e) {
            console.error('[Printer Main] Error calculating dynamic height:', e);
            resolvedHeightMicrons = 297000; // fallback to A4 height
          }
        }

        const printOpts = {
          silent: true,
          printBackground: true,
          margins: (isLabel || isMediaCarta || (isThermal && finalUseDynamicHeight) || (paperHeightMicrons && paperHeightMicrons < 5000)) ? { marginType: 'none' } : { marginType: 'printableArea' },
          copies: copies || 1,
        };
        if (isLabel) {
          printOpts.landscape = options.landscape !== undefined ? options.landscape : true;
          printOpts.preferCSSPageSize = true;
          printOpts.pageSize = {
            width: paperWidthMicrons || 51000,
            height: paperHeightMicrons || 25000,
          };
        } else {
          if (finalUsePrinterDefaultPageSize && isThermal) {
            printOpts.usePrinterDefaultPageSize = true;
          } else {
            if (isMediaCarta) {
              printOpts.preferCSSPageSize = true;
            }
            if (effectiveWidthMicrons) {
              printOpts.pageSize = {
                width: effectiveWidthMicrons,
                height: resolvedHeightMicrons || (isMediaCarta ? 139700 : 297000),
              };
            }
          }
        }
        if (duplexMode) {
          printOpts.duplexMode = duplexMode;
        }
        
        const resolvedDeviceName = await resolvePrinterName(deviceName);
        console.log('printHtmlHelper printing to resolvedDeviceName:', resolvedDeviceName || '(Default Printer)');
        if (resolvedDeviceName) {
          printOpts.deviceName = resolvedDeviceName;
        }
        win.webContents.print(printOpts, (success, failureReason) => {
          // Destruir la ventana oculta y limpiar archivo temporal
          setTimeout(() => { try { win.destroy(); } catch (_) {} try { fs.unlinkSync(tmpFile); } catch (_) {} }, 1500);
          if (success) {
            resolve({ success: true });
          } else {
            console.log('printHtmlHelper failed:', failureReason);
            reject(new Error(failureReason || 'Print failed'));
          }
        });
      }, 1200);
    });

    win.on('closed', () => resolve({ success: true }));
  });
}

// Imprime HTML arbitrario en una ventana invisible sin mostrar diálogo del OS.
// Útil para reimprimir tickets desde el historial sin navegar a PrintView.
ipcMain.handle('silent-print-html', async (_, options = {}) => {
  return printHtmlHelper(options);
});

// Genera una imagen a partir de un HTML, la copia al portapapeles y retorna el base64
ipcMain.handle('copy-html-to-clipboard', async (_, { html, width }) => {
  const { clipboard, nativeImage } = require('electron');
  return new Promise((resolve) => {
    const scale = 3.0;
    const winWidth = Math.round((width || 380) * scale);
    const win = new BrowserWindow({
      show: false,
      x: -3000,
      y: -3000,
      width: winWidth,
      height: 3600,
      frame: false,
      useContentSize: true,
      focusable: false,
      skipTaskbar: true,
      enableLargerThanScreen: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        zoomFactor: scale,
      },
    });

    const tmpFile = path.join(os.tmpdir(), `fixmanager-clipboard-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, 'utf8');
    win.loadFile(tmpFile);
    win.showInactive();

    win.webContents.once('did-finish-load', () => {
      // Pequeño retardo para asegurar renderizado completo (código de barras, fuentes, imágenes locales)
      setTimeout(async () => {
        try {
          const docHeight = await win.webContents.executeJavaScript('const root = document.getElementById("ticket-capture-root"); root ? (root.offsetHeight || root.scrollHeight) : (document.body.scrollHeight || document.documentElement.scrollHeight || 800)');
          win.setSize(winWidth, Math.round(docHeight * scale) + 10);
          
          setTimeout(async () => {
            try {
              const image = await win.webContents.capturePage();
              clipboard.writeImage(image);
              
              // Limpiar recursos con un pequeño retardo
              setTimeout(() => {
                try { win.destroy(); } catch (_) {}
                try { fs.unlinkSync(tmpFile); } catch (_) {}
              }, 1000);
              
              resolve({ success: true, base64: image.toDataURL() });
            } catch (err) {
              console.error('Error al capturar la página:', err);
              try { win.destroy(); } catch (_) {}
              try { fs.unlinkSync(tmpFile); } catch (_) {}
              resolve({ success: false, error: err.message });
            }
          }, 200);
        } catch (err) {
          console.error('Error al calcular altura del HTML:', err);
          try { win.destroy(); } catch (_) {}
          try { fs.unlinkSync(tmpFile); } catch (_) {}
          resolve({ success: false, error: err.message });
        }
      }, 1000);
    });
  });
});

// Lee un archivo local y lo devuelve como base64 data URI (para logos en tickets)
ipcMain.handle('read-file-base64', async (_, filePath) => {
  try {
    // Acepta file:// URLs y rutas absolutas
    const cleanPath = filePath.startsWith('file://') ? decodeURIComponent(filePath.replace(/^file:\/\//, '')) : filePath;
    if (!fs.existsSync(cleanPath)) return null;
    const ext = path.extname(cleanPath).toLowerCase().replace('.', '');
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/png';
    const data = fs.readFileSync(cleanPath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (e) {
    return null;
  }
});

// ─── CAJÓN DE DINERO ──────────────────────────────────────────────────────────
// Envía pulso ESC/POS estándar al cajón conectado vía impresora térmica.
// Windows: escribe al nombre de impresora usando un archivo temporal + copy /b
// macOS:   usa lp -o raw con archivo temporal de bytes
ipcMain.handle('open-cash-drawer', async (_, { deviceName = '', printerInterface = '', printerIpAddress = '' } = {}) => {
  const DRAWER_CMD = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0x19]); // ESC p 0 25 25

  if (printerInterface === 'Ethernet' && printerIpAddress && printerIpAddress.trim()) {
    const net = require('net');
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(3000); // 3 seconds timeout
      
      client.connect(9100, printerIpAddress.trim(), () => {
        client.write(DRAWER_CMD);
        client.end();
        resolve({ success: true });
      });
      
      client.on('error', (err) => {
        console.error('[cash-drawer] TCP error:', err.message);
        resolve({ success: false, error: err.message });
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve({ success: false, error: 'Timeout connecting to printer IP' });
      });
    });
  }

  const tmpFile = path.join(os.tmpdir(), `fm-drawer-${Date.now()}.bin`);
  try {
    fs.writeFileSync(tmpFile, DRAWER_CMD);
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        const cleanName = deviceName ? deviceName.trim() : '';
        if (cleanName) {
          // Intentar primero con PowerShell Spooler API (WritePrinter) para evitar compartir impresora
          const psScriptPath = path.join(os.tmpdir(), `fm-raw-spooler-${Date.now()}.ps1`);
          const psScriptContent = `
$code = @'
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool OpenPrinter(string pName, out IntPtr hPrinter, IntPtr pDefaults);
    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBuf, int cbBuf, out int pcWritten);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        public string pDocName;
        public string pOutputFile;
        public string pDataType;
    }
}
'@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$hPrinter = [IntPtr]::Zero
if (-not [RawPrinter]::OpenPrinter($args[0], [ref]$hPrinter, [IntPtr]::Zero)) {
    Write-Error "Could not open printer '$($args[0])'"
    exit 1
}
$di = New-Object RawPrinter+DOCINFOA
$di.pDocName = "Cash Drawer Kick"
$di.pDataType = "RAW"
if (-not [RawPrinter]::StartDocPrinter($hPrinter, 1, $di)) {
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null
    Write-Error "Could not start doc printer"
    exit 2
}
[RawPrinter]::StartPagePrinter($hPrinter) | Out-Null
$bytes = [System.IO.File]::ReadAllBytes($args[1])
$written = 0
if (-not [RawPrinter]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written)) {
    [RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    [RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null
    Write-Error "Could not write printer"
    exit 3
}
[RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
[RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
[RawPrinter]::ClosePrinter($hPrinter) | Out-Null
          `;
          try {
            fs.writeFileSync(psScriptPath, psScriptContent, 'utf8');
            exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" "${cleanName}" "${tmpFile}"`, (err) => {
              try { fs.unlinkSync(psScriptPath); } catch (_) {}
              try { fs.unlinkSync(tmpFile); } catch (_) {}
              if (err) reject(err); else resolve();
            });
          } catch (winError) {
            try { fs.unlinkSync(psScriptPath); } catch (_) {}
            reject(winError);
          }
        } else {
          // Si no hay nombre de impresora, intentar copy /b PRN
          exec(`copy /b "${tmpFile}" PRN`, (err) => {
            try { fs.unlinkSync(tmpFile); } catch (_) {}
            if (err) reject(err); else resolve();
          });
        }
      } else {
        const dFlag = deviceName && deviceName.trim() ? `-d "${deviceName.trim()}"` : '';
        const cmd = `lp ${dFlag} -o raw "${tmpFile}"`;
        exec(cmd, (err) => {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
          if (err) reject(err); else resolve();
        });
      }
    });
    return { success: true };
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
    console.error('[cash-drawer] Raw command failed, trying fallback dummy print job:', e.message);

    // Fallback: Si el comando raw falla, intentamos enviar un documento HTML minúsculo vacío de 1.5mm a la impresora.
    // Como el controlador está configurado para abrir el cajón al imprimir un trabajo, esto lo abrirá
    // de forma silenciosa sin desperdiciar papel apreciable (solo alimentará 1.5mm).
    try {
      const fallbackHtml = `
        <html>
          <head>
            <style>
              @page {
                size: 58mm 1.5mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                height: 1px;
                overflow: hidden;
              }
            </style>
          </head>
          <body></body>
        </html>
      `;
      await printHtmlHelper({
        html: fallbackHtml,
        deviceName,
        copies: 1,
        paperWidthMicrons: 58000,
        paperHeightMicrons: 1500, // 1.5mm (1500 micrones)
        isLabel: false
      });
      return { success: true, fallbackUsed: true };
    } catch (fallbackError) {
      console.error('[cash-drawer] Fallback dummy print job failed:', fallbackError.message);
      return { success: false, error: `Raw error: ${e.message}. Fallback error: ${fallbackError.message}` };
    }
  }
});

// Genera PDF desde HTML y lo guarda en la carpeta de descargas
ipcMain.handle('print-to-pdf', async (_, options = {}) => {
  const { html = '', filename = 'documento.pdf', paperWidth = null } = options;
  const { dialog } = require('electron');

  const isThermal = paperWidth === '58mm' || paperWidth === '80mm';
  const widthMicrons = paperWidth === '58mm' ? 58000 : 80000;
  const heightMicrons = 400000; // 400mm — enough for any ticket

  const win = new BrowserWindow({
    show: false,
    width: isThermal ? (paperWidth === '58mm' ? 220 : 304) : 800,
    height: 1100,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[PDF] carga fallida:', code, desc);
  });

  // Constrain body to ticket width so content renders at thermal paper size
  // regardless of the PDF page size (Electron 32 pageSize object is broken)
  const cssWidth = paperWidth === '58mm' ? '58mm' : '80mm';
  const ticketHtml = isThermal
    ? html.replace('</head>', `<style>html,body{width:${cssWidth}!important;max-width:${cssWidth}!important;margin:0!important}</style></head>`)
    : html;

  const tmpPath = require('path').join(require('os').tmpdir(), `fm-ticket-${Date.now()}.html`);
  fs.writeFileSync(tmpPath, ticketHtml, 'utf8');
  console.log('[PDF] tmp file:', tmpPath, 'size:', ticketHtml.length);
  win.loadFile(tmpPath);

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      const bodyLen = await win.webContents.executeJavaScript('document.body ? document.body.innerHTML.length : -1');
      console.log('[PDF] body innerHTML length:', bodyLen);

      setTimeout(async () => {
        try {
          const pdfData = await win.webContents.printToPDF({
            printBackground: true,
          });

          console.log('[PDF] bytes generados:', pdfData.length);
          win.destroy();
          try { fs.unlinkSync(tmpPath); } catch (_) {}

          const { filePath } = await dialog.showSaveDialog({
            defaultPath: filename,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
          });
          if (filePath) {
            fs.writeFileSync(filePath, pdfData);
            require('electron').shell.openPath(filePath);
            resolve({ success: true, filePath });
          } else {
            resolve({ success: false, cancelled: true });
          }
        } catch (e) {
          console.error('[PDF] error printToPDF:', e.message);
          try { win.destroy(); } catch (_) {}
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          resolve({ success: false, error: e.message });
        }
      }, 2000);
    });
  });
});

// ─── HANDLERS DE IMÁGENES Y MULTIMEDIA LOCAL ────────────────────────
ipcMain.handle('save-product-image', async (_, { fileName, fileBase64 }) => {
  try {
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'product-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    console.error('Error al guardar imagen de producto:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-product-image', async (_, { fileName }) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'product-images', fileName);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
    return null;
  } catch (err) {
    console.error('Error al leer imagen de producto:', err);
    return null;
  }
});

ipcMain.handle('delete-product-image', async (_, { fileName }) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'product-images', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'Archivo no encontrado' };
  } catch (err) {
    console.error('Error al eliminar imagen de producto:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-evidence-media', async (_, { orderId, fileName, fileBase64 }) => {
  try {
    const userDataPath = app.getPath('userData');
    const evidencesDir = path.join(userDataPath, 'evidences', `order_${orderId}`);
    if (!fs.existsSync(evidencesDir)) {
      fs.mkdirSync(evidencesDir, { recursive: true });
    }
    const matches = fileBase64.match(/^data:(video\/\w+|image\/\w+);base64,/);
    const mimeType = matches ? matches[1] : '';
    const base64Data = fileBase64.replace(/^data:(video\/\w+|image\/\w+);base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(evidencesDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const isVideo = fileBase64.startsWith('data:video/') || fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.mov') || fileName.toLowerCase().endsWith('.webm');
    const fileMeta = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      name: fileName,
      type: isVideo ? 'video' : 'image',
      path: filePath,
      timestamp: new Date().toISOString()
    };

    return { success: true, filePath, mimeType, fileMeta };
  } catch (err) {
    console.error('Error al guardar evidencia multimedia:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-evidence-media', async (_, { filePath }) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'Archivo no encontrado' };
  } catch (err) {
    console.error('Error al eliminar evidencia multimedia:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-evidence-folder', async (_, { orderId }) => {
  try {
    const userDataPath = app.getPath('userData');
    const evidencesDir = path.join(userDataPath, 'evidences', `order_${orderId}`);
    if (!fs.existsSync(evidencesDir)) {
      fs.mkdirSync(evidencesDir, { recursive: true });
    }
    await require('electron').shell.openPath(evidencesDir);
    return { success: true };
  } catch (err) {
    console.error('Error al abrir carpeta de evidencias:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-local-images', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const localImages = { productImages: {}, evidenceImages: {} };
    
    // Exportar imágenes de productos
    const prodDir = path.join(userDataPath, 'product-images');
    if (fs.existsSync(prodDir)) {
      const files = fs.readdirSync(prodDir);
      files.forEach((file) => {
        const filePath = path.join(prodDir, file);
        if (fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath);
          localImages.productImages[file] = content.toString('base64');
        }
      });
    }
    
    // Exportar evidencias de órdenes (de ambas carpetas evidencias y evidence_media)
    ['evidences', 'evidence_media'].forEach((folderName) => {
      const evDir = path.join(userDataPath, folderName);
      if (fs.existsSync(evDir)) {
        const scanDir = (dir, relPath = '') => {
          const files = fs.readdirSync(dir);
          files.forEach((file) => {
            const fullPath = path.join(dir, file);
            const currentRelPath = relPath ? `${relPath}/${file}` : file;
            if (fs.statSync(fullPath).isDirectory()) {
              scanDir(fullPath, currentRelPath);
            } else if (fs.statSync(fullPath).isFile() && !file.startsWith('.')) {
              const content = fs.readFileSync(fullPath);
              localImages.evidenceImages[`${folderName}/${currentRelPath}`] = content.toString('base64');
            }
          });
        };
        scanDir(evDir);
      }
    });
    
    return localImages;
  } catch (err) {
    console.error('Error al exportar imágenes locales:', err);
    return { productImages: {}, evidenceImages: {} };
  }
});

ipcMain.handle('import-local-images', async (_, { localImages }) => {
  try {
    const userDataPath = app.getPath('userData');
    
    if (localImages) {
      if (localImages.productImages) {
        const prodDir = path.join(userDataPath, 'product-images');
        if (!fs.existsSync(prodDir)) {
          fs.mkdirSync(prodDir, { recursive: true });
        }
        Object.keys(localImages.productImages).forEach((fileName) => {
          const filePath = path.join(prodDir, fileName);
          const base64 = localImages.productImages[fileName];
          fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
        });
      }
      
      if (localImages.evidenceImages) {
        Object.keys(localImages.evidenceImages).forEach((relPath) => {
          let cleanRel = relPath;
          let baseFolder = 'evidences';
          if (cleanRel.startsWith('evidence_media/')) {
            baseFolder = 'evidence_media';
            cleanRel = cleanRel.replace(/^evidence_media\//, '');
          } else if (cleanRel.startsWith('evidences/')) {
            baseFolder = 'evidences';
            cleanRel = cleanRel.replace(/^evidences\//, '');
          }
          const filePath = path.join(userDataPath, baseFolder, cleanRel);
          const parentDir = path.dirname(filePath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          const base64 = localImages.evidenceImages[relPath];
          fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
        });
      }
    }
    
    return userDataPath;
  } catch (err) {
    console.error('Error al importar imágenes locales:', err);
    return app.getPath('userData');
  }
});

// ─── SERVIDOR HTTP LOCAL PARA CARGAS DESDE EL MÓVIL (QR) ──────────────────────
let localServerInstance = null;
const localServerPort = 5055;
let localServerIp = '127.0.0.1';

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function getMobileEvidenceUploadHtml(orderId) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Subir Evidencia - FixManager</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 24px;
          padding: 24px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          text-align: center;
          box-sizing: border-box;
        }
        h2 { margin-top: 0; color: #38bdf8; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 24px; }
        .btn-upload {
          background: #0284c7;
          color: white;
          border: none;
          padding: 14px 24px;
          font-weight: 700;
          font-size: 14px;
          border-radius: 12px;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
          display: inline-block;
          text-decoration: none;
          box-sizing: border-box;
        }
        .btn-upload:active { background: #0369a1; }
        input[type="file"] { display: none; }
        .status { margin-top: 16px; font-size: 13px; font-weight: 600; }
        .status.success { color: #34d399; }
        .status.error { color: #f87171; }
        .status.loading { color: #fbbf24; }
        .preview {
          width: 100%;
          max-width: 250px;
          height: auto;
          max-height: 250px;
          object-fit: contain;
          border-radius: 12px;
          margin: 16px auto 0 auto;
          display: none;
          border: 2px solid #334155;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Subir Evidencia</h2>
        <p>Selecciona una o varias fotos y videos de evidencia para la Orden #${orderId} desde tu celular.</p>
        
        <label class="btn-upload">
          📷 SELECCIONAR FOTOS / VIDEOS
          <input type="file" accept="image/*,video/*" id="file-input" multiple />
        </label>
        
        <img id="preview" class="preview" alt="Vista previa" />
        <video id="preview-video" class="preview" controls></video>
        <div id="status" class="status"></div>
      </div>
      
      <script>
        const fileInput = document.getElementById('file-input');
        const statusDiv = document.getElementById('status');
        const previewImg = document.getElementById('preview');
        const previewVideo = document.getElementById('preview-video');
        
        fileInput.addEventListener('change', async (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          
          statusDiv.className = 'status loading';
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            statusDiv.innerText = 'Procesando archivo ' + (i + 1) + ' de ' + files.length + '...';
            
            previewImg.style.display = 'none';
            previewVideo.style.display = 'none';
            
            const isVideo = file.type.startsWith('video/');
            const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
            const fileName = 'ev_' + Date.now() + '_' + i + '.' + extension;

            if (isVideo) {
              // Previsualizar video
              const videoUrl = URL.createObjectURL(file);
              previewVideo.src = videoUrl;
              previewVideo.style.display = 'block';
              
              await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  const base64Data = event.target.result;
                  try {
                    await uploadFile(base64Data, fileName, i + 1, files.length);
                    URL.revokeObjectURL(videoUrl);
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                };
                reader.onerror = () => reject(new Error('Error al leer video'));
                reader.readAsDataURL(file);
              });
            } else {
              // Previsualizar imagen usando FileReader para máxima compatibilidad
              await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const base64Data = event.target.result;
                  previewImg.src = base64Data;
                  previewImg.style.display = 'block';

                  const img = new Image();
                  img.onload = async () => {
                    try {
                      const canvas = document.createElement('canvas');
                      const maxDim = 1024;
                      let width = img.width;
                      let height = img.height;
                      if (width > height) {
                        if (width > maxDim) {
                          height = Math.round((height * maxDim) / width);
                          width = maxDim;
                        }
                      } else {
                        if (height > maxDim) {
                          width = Math.round((width * maxDim) / height);
                          height = maxDim;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0, width, height);
                      
                      const base64Image = canvas.toDataURL('image/jpeg', 0.85);
                      await uploadFile(base64Image, fileName, i + 1, files.length);
                      resolve();
                    } catch (err) {
                      reject(err);
                    }
                  };
                  img.onerror = () => reject(new Error('Error al procesar la imagen'));
                  img.src = base64Data;
                };
                reader.onerror = () => reject(new Error('Error al leer archivo'));
                reader.readAsDataURL(file);
              });
            }
          }

          statusDiv.className = 'status success';
          statusDiv.innerText = '✅ ¡Se subieron ' + files.length + ' archivo(s) con éxito!';
          fileInput.value = '';
        });

        async function uploadFile(base64Data, fileName, current, total) {
          statusDiv.innerText = 'Subiendo archivo ' + current + ' de ' + total + '...';
          const res = await fetch('/upload-evidence?orderId=' + encodeURIComponent('${orderId}'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, fileName })
          });
          const result = await res.json();
          if (!result.success) {
            throw new Error(result.error || 'Error desconocido');
          }
        }
      </script>
    </body>
    </html>
  `;
}

function getMobileProductUploadHtml(sessionId) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>FixManager Live Studio</title>
      <style>
        * { box-sizing: border-box; }
        html, body {
          width: 100%;
          height: 100%;
          height: 100dvh;
          margin: 0;
          padding: 0;
          background: #090d16;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden;
        }
        
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          width: 100vw;
          padding: 12px;
          padding-bottom: max(16px, env(safe-area-inset-bottom, 20px));
          gap: 10px;
          overflow: hidden;
        }

        /* Header Superior */
        .top-bar {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 10px 14px;
          text-align: center;
          position: relative;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        
        .top-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        
        .live-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .dot { width: 6px; height: 6px; background: #34d399; border-radius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }

        .progress-text {
          font-size: 11px;
          font-weight: 800;
          color: #60a5fa;
        }

        .progress-bar-bg {
          width: 100%;
          height: 4px;
          background: #1f2937;
          border-radius: 999px;
          overflow: hidden;
          margin: 4px 0 6px 0;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          width: 0%;
          transition: width 0.3s ease;
        }

        .item-sku {
          font-family: monospace;
          font-size: 10px;
          color: #9ca3af;
          background: #1f2937;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 2px;
        }

        .item-title {
          font-size: 15px;
          font-weight: 900;
          color: #ffffff;
          margin: 2px 0 0 0;
          line-height: 1.2;
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ÁREA CENTRAL DE CAPTURA GIGANTE (100% APROVECHADA) */
        .capture-viewport {
          flex: 1;
          min-height: 0;
          background: linear-gradient(180deg, #111827 0%, #0d131f 100%);
          border: 2px dashed #10b981;
          border-radius: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 16px;
          position: relative;
          cursor: pointer;
          box-shadow: inset 0 0 40px rgba(16, 185, 129, 0.08);
          transition: border-color 0.2s, transform 0.1s;
        }
        .capture-viewport:active {
          transform: scale(0.99);
          border-color: #34d399;
          background: rgba(16, 185, 129, 0.05);
        }

        .camera-big-icon {
          font-size: 56px;
          margin-bottom: 8px;
          filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.4));
        }

        .capture-main-label {
          font-size: 15px;
          font-weight: 900;
          color: #34d399;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .capture-sub-label {
          font-size: 11px;
          color: #9ca3af;
          max-width: 240px;
          line-height: 1.3;
        }

        /* DOCK INFERIOR (FOTOTECA / GALERÍA) */
        .bottom-dock {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          z-index: 10;
        }

        .btn-dock {
          flex: 1;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 1.5px solid #3b82f6;
          color: #ffffff;
          padding: 14px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          box-shadow: 0 6px 15px rgba(0,0,0,0.5);
        }
        .btn-dock:active { transform: scale(0.98); background: #3b82f6; }

        input[type="file"] { display: none; }

        /* OVERLAY TOAST DE ÉXITO INSTANTÁNEO */
        .status-toast {
          position: fixed;
          inset: 0;
          background: rgba(9, 13, 22, 0.96);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
          padding: 24px;
          text-align: center;
        }
        .status-toast.active {
          opacity: 1;
          pointer-events: auto;
        }
        .check-icon {
          width: 72px;
          height: 72px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          margin-bottom: 16px;
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
        }
      </style>
    </head>
    <body>
      <div class="app-container">
        
        <!-- HEADER TOP BAR -->
        <div class="top-bar">
          <div class="top-badge-row">
            <div class="live-tag">
              <div class="dot"></div>
              <span>FIXMANAGER LIVE STUDIO</span>
            </div>
            <div id="progress-text" class="progress-text">0 de 0 (0%)</div>
          </div>
          
          <div class="progress-bar-bg">
            <div id="progress-bar-fill" class="progress-bar-fill"></div>
          </div>

          <div id="item-sku" class="item-sku">SKU: —</div>
          <div id="item-title" class="item-title">Cargando producto...</div>
        </div>

        <!-- VISOR CENTRAL DE CAPTURA GIGANTE (100% PANTALLA) -->
        <label class="capture-viewport" for="camera-input">
          <div class="camera-big-icon">📸</div>
          <div class="capture-main-label">TOCA AQUÍ PARA TOMAR FOTO</div>
          <div class="capture-sub-label">Abre tu cámara nativa inmediatamente. Al disparar, la foto se guarda y pasa al siguiente producto.</div>
          <input type="file" accept="image/*" capture="environment" id="camera-input" />
        </label>

        <!-- DOCK INFERIOR CON FOTOTECA / GALERÍA -->
        <div class="bottom-dock">
          <label class="btn-dock" for="gallery-input">
            🖼️ Elegir de Fototeca / Archivos
            <input type="file" accept="image/*" id="gallery-input" />
          </label>
        </div>

      </div>

      <!-- OVERLAY TOAST DE ÉXITO -->
      <div id="status-toast" class="status-toast">
        <div class="check-icon">✓</div>
        <h2 style="font-size:22px; font-weight:900; margin:0 0 8px 0; color:#ffffff;">¡FOTO GUARDADA CON ÉXITO!</h2>
        <p id="toast-subtext" style="color:#a7f3d0; font-size:13px; margin:0;">
          Avanzando al siguiente producto...
        </p>
      </div>

      <script>
        const sessionId = '${sessionId}';
        const cameraInput = document.getElementById('camera-input');
        const galleryInput = document.getElementById('gallery-input');

        const itemTitle = document.getElementById('item-title');
        const itemSku = document.getElementById('item-sku');
        const progressText = document.getElementById('progress-text');
        const progressBarFill = document.getElementById('progress-bar-fill');

        const statusToast = document.getElementById('status-toast');
        const toastSubtext = document.getElementById('toast-subtext');

        let currentSessionData = null;

        // Poll target product info from PC
        async function fetchSessionInfo() {
          try {
            const res = await fetch('/get-batch-session?sessionId=' + encodeURIComponent(sessionId));
            const data = await res.json();
            if (data.success && data.session) {
              currentSessionData = data.session;
              itemTitle.innerText = data.session.itemName || 'Todos los productos completados 🎉';
              itemSku.innerText = 'SKU: ' + (data.session.itemCode || '—');
              
              const current = (data.session.currentIndex || 0) + 1;
              const total = data.session.totalItems || 1;
              const pct = Math.min(100, Math.round((current / total) * 100));

              progressText.innerText = 'Artículo ' + current + ' de ' + total + ' (' + pct + '%)';
              progressBarFill.style.width = pct + '%';
            }
          } catch(err) {
            console.error(err);
          }
        }

        setInterval(fetchSessionInfo, 800);
        fetchSessionInfo();

        async function processAndUploadFile(file) {
          if (!file) return;
          
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const size = 600;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
            if (img.width > img.height) {
              sourceWidth = img.height;
              sourceX = (img.width - img.height) / 2;
            } else if (img.height > img.width) {
              sourceHeight = img.width;
              sourceY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
            const base64Image = canvas.toDataURL('image/jpeg', 0.85);
            
            try {
              const res = await fetch('/upload-product-image?sessionId=' + encodeURIComponent(sessionId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
              });
              const result = await res.json();
              if (result.success) {
                const targetName = currentSessionData ? currentSessionData.itemName : '';
                toastSubtext.innerText = 'Asignada a: ' + targetName + '. Cargando siguiente...';
                statusToast.classList.add('active');
                cameraInput.value = '';
                galleryInput.value = '';
                
                setTimeout(() => {
                  statusToast.classList.remove('active');
                  fetchSessionInfo();
                }, 900);
              } else {
                alert('❌ Error: ' + result.error);
              }
            } catch (err) {
              alert('❌ Error de red: ' + err.message);
            }
          };
          img.src = URL.createObjectURL(file);
        }

        cameraInput.addEventListener('change', (e) => processAndUploadFile(e.target.files[0]));
        galleryInput.addEventListener('change', (e) => processAndUploadFile(e.target.files[0]));
      </script>
    </body>
    </html>
  `;
}

function startLocalHttpServer() {
  return new Promise((resolve, reject) => {
    if (localServerInstance) {
      resolve({ success: true, ip: localServerIp, port: localServerPort });
      return;
    }

    localServerIp = getLocalIpAddress();
    const http = require('http');
    
    localServerInstance = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url, `http://${localServerIp}:${localServerPort}`);
      const pathname = parsedUrl.pathname;

      if (pathname === '/evidence') {
        const orderId = parsedUrl.searchParams.get('orderId') || '';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getMobileEvidenceUploadHtml(orderId));
      } else if (pathname === '/product-upload') {
        const sessionId = parsedUrl.searchParams.get('sessionId') || '';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getMobileProductUploadHtml(sessionId));
      } else if (pathname === '/update-batch-session' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data && data.sessionId) {
              if (!global.batchSessionsMap) global.batchSessionsMap = new Map();
              global.batchSessionsMap.set(data.sessionId, { ...data, updatedAt: Date.now() });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      } else if (pathname === '/get-batch-session') {
        const sessionId = parsedUrl.searchParams.get('sessionId') || '';
        const sessionInfo = global.batchSessionsMap ? (global.batchSessionsMap.get(sessionId) || null) : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, session: sessionInfo }));
      } else if (pathname === '/upload-evidence' && req.method === 'POST') {
        const orderId = parsedUrl.searchParams.get('orderId') || '';
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data.image || !data.fileName) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Faltan datos de imagen' }));
              return;
            }

            const base64Data = data.image.replace(/^data:(video\/\w+|image\/\w+);base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const evidencesDir = path.join(app.getPath('userData'), 'evidences', `order_${orderId}`);
            if (!fs.existsSync(evidencesDir)) {
              fs.mkdirSync(evidencesDir, { recursive: true });
            }

            const filePath = path.join(evidencesDir, data.fileName);
            fs.writeFileSync(filePath, buffer);

            const isVideo = data.image.startsWith('data:video/') || data.fileName.toLowerCase().endsWith('.mp4') || data.fileName.toLowerCase().endsWith('.mov') || data.fileName.toLowerCase().endsWith('.webm');
            const fileMeta = {
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
              name: data.fileName,
              type: isVideo ? 'video' : 'image',
              path: filePath,
              timestamp: new Date().toISOString()
            };

            if (mainWindow) {
              mainWindow.webContents.send('evidence-uploaded', {
                orderId,
                fileMeta
              });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            console.error('Error al procesar subida de evidencia:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      } else if (pathname === '/upload-product-image' && req.method === 'POST') {
        const sessionId = parsedUrl.searchParams.get('sessionId') || '';
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data.image) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Falta la imagen' }));
              return;
            }

            if (mainWindow) {
              mainWindow.webContents.send('product-image-uploaded', {
                sessionId,
                image: data.image
              });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            console.error('Error al procesar subida de foto de producto:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    localServerInstance.on('error', (err) => {
      console.error('[Local Server] Error:', err);
      localServerInstance = null;
      reject(err);
    });

    localServerInstance.listen(localServerPort, '0.0.0.0', () => {
      console.log(`[Local Server] Running on http://${localServerIp}:${localServerPort}`);
      resolve({ success: true, ip: localServerIp, port: localServerPort });
    });
  });
}

ipcMain.handle('start-local-server', async () => {
  try {
    const res = await startLocalHttpServer();
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-local-server', async () => {
  try {
    if (localServerInstance) {
      await new Promise((resolve) => localServerInstance.close(resolve));
      localServerInstance = null;
      console.log('[Local Server] Stopped');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('is-server-running', () => {
  return localServerInstance !== null;
});


// ─── WHATSAPP INTEGRADO ──────────────────────────────────────────────────────

let waStatus = 'DISCONNECTED';
let lastQrText = '';
let waPhone = '';
let waUnreadCount = 0;
let activeSendPromise = null;



ipcMain.on('get-wa-preload-path', (event) => {
  const absolutePath = path.join(__dirname, 'wa-preload.js');
  event.returnValue = url.pathToFileURL(absolutePath).href;
});

ipcMain.on('get-clean-user-agent', (event) => {
  const isMac = process.platform === 'darwin';
  const cleanUA = isMac
    ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
  event.returnValue = cleanUA;
});

async function updateWppCache() {
  const cachePath = path.join(app.getPath('userData'), 'wppconnect-wa-cached.js');
  const url = 'https://cdn.jsdelivr.net/npm/@wppconnect/wa-js@latest/dist/wppconnect-wa.js';

  console.log('[WhatsApp Main] Verificando actualización de WPPConnect desde CDN (fetch)...');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[WhatsApp Main] Error descargando WPPConnect de CDN, código: ${res.status}`);
      return;
    }
    const data = await res.text();
    if (data && (data.includes('window.WPP') || data.includes('WPP.isReady') || data.includes('WPP='))) {
      let patchedData = data;
      const regex = /[^;]+\.exportModule\)\(t,\s*\{\s*isAuthenticated:\s*\["isLoggedIn"\s*,\s*"Z"\]\s*,\s*isLoggedIn:\s*\["isLoggedIn"\s*,\s*"Z"\]\s*\},\s*e\s*=>\s*\{[^}]+\}\)/;
      if (regex.test(patchedData)) {
        patchedData = patchedData.replace(regex, '(t.isAuthenticated=()=>true,t.isLoggedIn=()=>true)');
      }
      fs.writeFileSync(cachePath, patchedData, 'utf8');
      console.log('[WhatsApp Main] WPPConnect actualizado y guardado en caché local con éxito.');
    } else {
      console.warn('[WhatsApp Main] Script descargado no válido.');
    }
  } catch (err) {
    console.warn('[WhatsApp Main] Error descargando WPPConnect de CDN:', err.message || err);
  }
}

ipcMain.on('get-wpp-js-content', (event) => {
  try {
    const cachePath = path.join(app.getPath('userData'), 'wppconnect-wa-cached.js');
    let wppJs = '';
    let loadedFromCache = false;
    
    if (fs.existsSync(cachePath)) {
      wppJs = fs.readFileSync(cachePath, 'utf8');
      if (wppJs && (wppJs.includes('WPP') || wppJs.includes('isReady')) && !wppJs.includes('t.isAuthenticated=()=>true')) {
        console.log('[WhatsApp Main] Cargando WPPConnect desde caché local actualizada...');
        loadedFromCache = true;
      } else {
        console.warn('[WhatsApp Main] Caché de WPPConnect antigua o inválida. Eliminando...');
        try {
          fs.unlinkSync(cachePath);
        } catch (e) {}
      }
    }
    
    if (!loadedFromCache) {
      console.log('[WhatsApp Main] Cargando WPPConnect desde node_modules (local)...');
      const scriptPath = path.join(__dirname, '../node_modules/@wppconnect/wa-js/dist/wppconnect-wa.js');
      wppJs = fs.readFileSync(scriptPath, 'utf8');
    }
    
    event.returnValue = wppJs;
  } catch (err) {
    console.error('[WhatsApp Main] Error leyendo wppconnect-wa.js:', err);
    event.returnValue = '';
  }
});

// Escuchar eventos desde el wa-preload
ipcMain.on('wa-status-changed', (event, data) => {
  const rawStatus = (data && typeof data === 'object') ? data.status : data;
  const phone = (data && typeof data === 'object') ? (data.phone || '') : '';
  const isReallyConnected = rawStatus === 'CONNECTED' && Boolean(phone && phone.trim().length > 0);
  const status = isReallyConnected ? 'CONNECTED' : (rawStatus === 'INITIALIZING' ? 'INITIALIZING' : 'DISCONNECTED');

  console.log(`[WhatsApp Main] Estado de WhatsApp cambiado: ${status} (raw: ${rawStatus}) | Teléfono: ${phone}`);
  waStatus = status;
  waPhone = isReallyConnected ? phone : '';
  if (isReallyConnected) {
    lastQrText = ''; // Limpiar el QR al conectar
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wa-on-status-change', { status: waStatus, phone: waPhone });
  }
});

ipcMain.on('wa-qr-received', (event, qr) => {
  console.log('[WhatsApp Main] Código QR recibido');
  lastQrText = qr;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wa-on-qrcode', qr);
  }
});

ipcMain.on('wa-send-result', (event, result) => {
  console.log('[WhatsApp Main] Resultado de envío de mensaje recibido:', result);
  if (activeSendPromise) {
    activeSendPromise(result);
    activeSendPromise = null;
  }
});

ipcMain.on('wa-unread-count-changed', (event, count) => {
  console.log(`[WhatsApp Main] Mensajes no leídos de WhatsApp actualizados: ${count}`);
  waUnreadCount = count;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wa-on-unread-count', count);
  }
});

// Registrar comandos IPC desde el frontend
ipcMain.on('wa-disconnect', () => {
  const waWeb = getWaWebContents();
  if (waWeb && !waWeb.isDestroyed()) {
    waWeb.send('wa-cmd-logout');
    setTimeout(() => {
      waStatus = 'DISCONNECTED';
      lastQrText = '';
      waPhone = '';
      waUnreadCount = 0;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('wa-on-status-change', { status: waStatus, phone: waPhone });
        mainWindow.webContents.send('wa-on-unread-count', 0);
      }
    }, 3000);
  }
});

ipcMain.handle('wa-get-status', () => {
  return { status: waStatus, qr: lastQrText, phone: waPhone, unreadCount: waUnreadCount };
});

const getWaWebContents = () => {
  return webContents.getAllWebContents().find(w => w.getURL().includes('web.whatsapp.com'));
};

let waMessageQueue = [];
let waProcessingQueue = false;

async function processWaQueue() {
  if (waProcessingQueue) return;
  waProcessingQueue = true;

  while (waMessageQueue.length > 0) {
    const item = waMessageQueue.shift();
    const { phone, text, base64Image, resolve } = item;

    const waWeb = getWaWebContents();
    if (!waWeb || waWeb.isDestroyed() || waStatus !== 'CONNECTED') {
      resolve({ success: false, error: 'WhatsApp no está conectado' });
      continue;
    }

    try {
      console.log(`[WhatsApp Main Queue] Procesando mensaje para ${phone}. Mensajes restantes: ${waMessageQueue.length}`);
      
      const result = await new Promise((res) => {
        activeSendPromise = res;
        waWeb.send('wa-cmd-send-message', { phone, text, base64Image });

        // Timeout de seguridad de 20 segundos
        setTimeout(() => {
          if (activeSendPromise === res) {
            activeSendPromise = null;
            res({ success: false, error: 'Tiempo de espera agotado al enviar mensaje' });
          }
        }, 20000);
      });

      resolve(result);
    } catch (err) {
      console.error('[WhatsApp Main Queue] Error en proceso de envío:', err);
      resolve({ success: false, error: err.message || err });
    }

    // Esperar un delay humano aleatorio entre mensajes (ej. entre 6 y 10 segundos)
    if (waMessageQueue.length > 0) {
      const delay = Math.floor(Math.random() * 4000) + 6000; // 6000 a 10000 ms
      console.log(`[WhatsApp Main Queue] Esperando ${delay}ms para el siguiente mensaje para simular comportamiento humano...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  waProcessingQueue = false;
}

ipcMain.handle('wa-send-message', async (event, { phone, text, base64Image }) => {
  const waWeb = getWaWebContents();
  if (!waWeb || waWeb.isDestroyed() || waStatus !== 'CONNECTED') {
    return { success: false, error: 'WhatsApp no está conectado' };
  }

  return new Promise((resolve) => {
    waMessageQueue.push({ phone, text, base64Image, resolve });
    processWaQueue();
  });
});

// ─── Genera PDF en memoria desde HTML y devuelve base64 (sin diálogo de guardado) ───
ipcMain.handle('wa-generate-pdf-base64', async (_, { html = '' }) => {
  const win = new BrowserWindow({
    show: false,
    width: 816,
    height: 1056,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const tmpPath = require('path').join(require('os').tmpdir(), `fm-quote-pdf-${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');
  win.loadFile(tmpPath);

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const pdfData = await win.webContents.printToPDF({ printBackground: true });
          win.destroy();
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          resolve({ success: true, base64: pdfData.toString('base64') });
        } catch (e) {
          try { win.destroy(); } catch (_) {}
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          resolve({ success: false, error: e.message });
        }
      }, 2000);
    });
  });
});

// ─── Envía un documento (PDF) al chat de WhatsApp ────────────────────────────
ipcMain.handle('wa-send-document', async (event, { phone, pdfBase64, filename }) => {
  const waWeb = getWaWebContents();
  if (!waWeb || waWeb.isDestroyed() || waStatus !== 'CONNECTED') {
    return { success: false, error: 'WhatsApp no está conectado' };
  }

  return new Promise((resolve) => {
    if (activeSendPromise) {
      activeSendPromise({ success: false, error: 'Otro envío de mensaje canceló esta transacción' });
    }

    activeSendPromise = resolve;
    waWeb.send('wa-cmd-send-document', { phone, pdfBase64, filename });

    setTimeout(() => {
      if (activeSendPromise === resolve) {
        activeSendPromise = null;
        resolve({ success: false, error: 'Tiempo de espera agotado al enviar documento' });
      }
    }, 20000);
  });
});

// ─── Verifica si un número está registrado en WhatsApp ──────────────────────
ipcMain.handle('wa-check-number', async (event, { phone }) => {
  const waWeb = getWaWebContents();
  if (!waWeb || waWeb.isDestroyed() || waStatus !== 'CONNECTED') {
    return { success: false, exists: false, error: 'WhatsApp no está conectado' };
  }

  let cleaned = phone;
  if (cleaned.includes('@')) {
    const [user, domain] = cleaned.split('@');
    let userPart = user.replace(/\D/g, '');
    if (userPart.startsWith('521') && userPart.length === 13) {
      userPart = '52' + userPart.substring(3);
    }
    cleaned = userPart + '@' + domain;
  } else {
    let userPart = cleaned.replace(/\D/g, '');
    if (userPart.startsWith('521') && userPart.length === 13) {
      userPart = '52' + userPart.substring(3);
    }
    cleaned = userPart + '@c.us';
  }
  const formattedPhone = cleaned;

  try {
    const exists = await waWeb.executeJavaScript(`
      (async function() {
        if (window.WPP && window.WPP.contact) {
          try {
            if (typeof window.WPP.contact.queryWidExists === 'function') {
              let result = await window.WPP.contact.queryWidExists(${JSON.stringify(formattedPhone)}).catch(() => null);
              if (!result) {
                const userDigits = ${JSON.stringify(formattedPhone)}.replace(/\D/g, '');
                if (userDigits.startsWith('52') && userDigits.length === 12 && !userDigits.startsWith('521')) {
                  const altPhone = '521' + userDigits.substring(2) + '@c.us';
                  result = await window.WPP.contact.queryWidExists(altPhone).catch(() => null);
                }
              }
              if (result) {
                return true;
              }
            }
          } catch (e) {
            console.error('[WhatsApp Inject Check] Error checking number:', e);
          }
        }
        if (window.WPP && window.WPP.conn && typeof window.WPP.conn.isAuthenticated === 'function' && window.WPP.conn.isAuthenticated()) {
          return true;
        }
        return false;
      })()
    `);
    return { success: true, exists: exists !== false };
  } catch (err) {
    return { success: false, exists: false, error: err.message || err };
  }
});

ipcMain.on('wa-reload', () => {
  const waWeb = getWaWebContents();
  if (waWeb && !waWeb.isDestroyed()) {
    console.log('[WhatsApp Main] Recargando sesión de WhatsApp Web...');
    waWeb.reload();
  }
});

ipcMain.handle('wa-force-update', async () => {
  console.log('[WhatsApp Main] Forzando actualización manual de WPPConnect desde CDN...');
  const cachePath = path.join(app.getPath('userData'), 'wppconnect-wa-cached.js');
  const url = 'https://cdn.jsdelivr.net/npm/@wppconnect/wa-js@latest/dist/wppconnect-wa.js';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      return { success: false, error: `Error de servidor CDN (Código HTTP ${res.status})` };
    }
    const data = await res.text();
    if (data && (data.includes('window.WPP') || data.includes('WPP.isReady') || data.includes('WPP='))) {
      let patchedData = data;
      const regex = /[^;]+\.exportModule\)\(t,\s*\{\s*isAuthenticated:\s*\["isLoggedIn"\s*,\s*"Z"\]\s*,\s*isLoggedIn:\s*\["isLoggedIn"\s*,\s*"Z"\]\s*\},\s*e\s*=>\s*\{[^}]+\}\)/;
      if (regex.test(patchedData)) {
        patchedData = patchedData.replace(regex, '(t.isAuthenticated=()=>true,t.isLoggedIn=()=>true)');
      }
      fs.writeFileSync(cachePath, patchedData, 'utf8');
      console.log('[WhatsApp Main] WPPConnect forzado y guardado en caché local con éxito.');

      const waWeb = getWaWebContents();
      if (waWeb && !waWeb.isDestroyed()) {
        waWeb.reload();
      }

      return { success: true, message: '¡Parche de WhatsApp Web descargado y aplicado con éxito! Sesión recargada.' };
    } else {
      return { success: false, error: 'El archivo descargado no es una actualización válida.' };
    }
  } catch (err) {
    return { success: false, error: 'Error de conexión: ' + (err.message || err) };
  }
});

// ─── Abre un chat directamente en WhatsApp con un texto de saludo prellenado ───
ipcMain.handle('wa-open-chat', async (event, { phone, defaultText }) => {
  console.log('[wa-open-chat IPC] Recibida solicitud para abrir chat:', phone);
  const waWeb = getWaWebContents();
  if (!waWeb || waWeb.isDestroyed() || waStatus !== 'CONNECTED') {
    console.warn('[wa-open-chat IPC] Abortado: WhatsApp no está conectado. Status:', waStatus);
    return { success: false, error: 'WhatsApp no está conectado' };
  }

  let cleaned = phone ? String(phone).replace(/\D/g, '') : '';
  if (!cleaned) {
    return { success: false, error: 'Número de teléfono inválido' };
  }
  if (cleaned.startsWith('52') && cleaned.length === 12 && !cleaned.startsWith('521')) {
    cleaned = '521' + cleaned.substring(2);
  }

  try {
    const successViaWpp = await waWeb.executeJavaScript(`
      (async function() {
        if (!window.WPP || !window.WPP.chat) return false;
        try {
          const rawPhone = ${JSON.stringify(cleaned)};
          const text = ${JSON.stringify(defaultText || '')};
          const userDigits = rawPhone.replace(/\D/g, '');

          const candidates = [];
          if (userDigits.startsWith('52') && userDigits.length === 12 && !userDigits.startsWith('521')) {
            candidates.push('521' + userDigits.substring(2) + '@c.us');
            candidates.push(userDigits + '@c.us');
          } else if (userDigits.startsWith('521') && userDigits.length === 13) {
            candidates.push(userDigits + '@c.us');
            candidates.push('52' + userDigits.substring(3) + '@c.us');
          } else {
            candidates.push(userDigits + '@c.us');
          }

          for (const cand of candidates) {
            try {
              if (window.WPP.contact && typeof window.WPP.contact.queryWidExists === 'function') {
                const res = await window.WPP.contact.queryWidExists(cand);
                if (res) {
                  let jidStr = cand;
                  const rawJid = res.lid || res.wid;
                  if (rawJid) {
                    if (typeof rawJid === 'string') jidStr = rawJid;
                    else jidStr = rawJid._serialized || (typeof rawJid.toString === 'function' ? rawJid.toString() : cand);
                  }
                  
                  let openedVisually = false;
                  
                  // 1. Cargar el chat en la memoria del Store de WhatsApp Web
                  if (window.WPP.chat && typeof window.WPP.chat.find === 'function') {
                    try {
                      await window.WPP.chat.find(jidStr);
                      console.log('[WhatsApp Inject SPA] Chat cargado en memoria con éxito.');
                      
                      // Intentar abrir el chat de forma visual usando la API directa de WPPConnect
                      const openMethods = ['openChat', 'openChatBottom', 'select', 'active'];
                      for (const method of openMethods) {
                        if (typeof window.WPP.chat[method] === 'function') {
                          try {
                            await window.WPP.chat[method](jidStr);
                            console.log(\`[WhatsApp Inject SPA] Chat abierto visualmente con éxito usando WPP.chat.\${method}\`);
                            openedVisually = true;
                            break;
                          } catch (e) {
                            console.log(\`[WhatsApp Inject SPA] Fallo al usar WPP.chat.\${method}:\`, e.message || e);
                          }
                        }
                      }
                      
                      // Si se abrió con éxito, hacer scroll automático de la barra lateral para enfocar el contacto
                      if (openedVisually) {
                        setTimeout(() => {
                          try {
                            const sidePanel = document.querySelector('#side');
                            if (sidePanel) {
                              const activeCell = Array.from(sidePanel.querySelectorAll('div[role="row"], div[role="listitem"]')).find(cell => {
                                return cell.getAttribute('aria-selected') === 'true' || 
                                       cell.querySelector('[aria-selected="true"]') ||
                                       (cell.className && typeof cell.className === 'string' && cell.className.includes('selected')) ||
                                       Array.from(cell.querySelectorAll('*')).some(el => el.className && typeof el.className === 'string' && el.className.includes('selected'));
                              });
                              if (activeCell) {
                                activeCell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                console.log('[WhatsApp Inject SPA] Barra lateral desplazada al contacto activo con éxito.');
                              }
                            }
                          } catch (scrollErr) {
                            console.log('[WhatsApp Inject SPA] Error al desplazar barra lateral:', scrollErr.message || scrollErr);
                          }
                        }, 250);
                      }
                    } catch (e) {
                      console.log('[WhatsApp Inject SPA] Error al cargar chat con find():', e.message || e);
                    }
                  }

                  // 2. Automatización del Buscador DOM nativo (fallback de seguridad por si falla la apertura directa)
                  if (!openedVisually) {
                    try {
                      console.log('[WhatsApp Inject SPA] Apertura directa falló o no soportada, iniciando fallback DOM del buscador...');
                      
                      const searchInput = document.querySelector('#side div[contenteditable="true"]') ||
                                          document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                                          document.querySelector('#side input[type="text"]');
                                          
                      if (searchInput) {
                        // Enfocar y limpiar buscador usando execCommand nativo (compatible con el input del buscador)
                        searchInput.focus();
                        document.execCommand('selectAll', false, null);
                        document.execCommand('delete', false, null);
                        
                        // Escribir el número del cliente en formato internacional con el prefijo '+'
                        // Para números de México, quitamos el '1' (de +521 a +52) para que la búsqueda interna de WhatsApp lo encuentre
                        let searchPhone = '+' + cand.split('@')[0];
                        if (searchPhone.startsWith('+521') && searchPhone.length === 14) {
                          searchPhone = '+52' + searchPhone.substring(4);
                        }
                        
                        document.execCommand('insertText', false, searchPhone);
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log('[WhatsApp Inject SPA] Número escrito en buscador:', searchPhone);
                        
                        // Esperar a que WhatsApp Web cargue los resultados y actualice el DOM
                        await new Promise(resolve => setTimeout(resolve, 600));

                        // Sondeo (polling) para esperar que el botón "Chatear con" aparezca en el DOM (máx 1500ms)
                        let clicked = false;
                        let startChatElement = null;
                        
                        for (let i = 0; i < 15; i++) {
                          const allElements = Array.from(document.querySelectorAll('#side span, #side div, #side p'));
                          startChatElement = allElements.find(el => {
                            const txt = el.textContent || '';
                            return txt.includes('Chatear con') || txt.includes('Start chat with') || txt.includes('Chat with');
                          });
                          
                          if (startChatElement) {
                            const clickable = startChatElement.closest('div[role="button"]') || 
                                              startChatElement.closest('div[style*="cursor: pointer"]') || 
                                              startChatElement;
                            clickable.click();
                            console.log('[WhatsApp Inject SPA] Click en botón "Chatear con" detectado vía sondeo.');
                            clicked = true;
                            break;
                          }
                          await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        // Si no se encontró el botón directo de chatear, buscar celdas válidas (antes del encabezado "Mensajes")
                        if (!clicked) {
                          const sidePanel = document.querySelector('#side');
                          if (sidePanel) {
                            const allSpans = Array.from(sidePanel.querySelectorAll('span, div'));
                            const mensajesHeader = allSpans.find(el => {
                              const txt = el.textContent || '';
                              return txt === 'Mensajes' || txt === 'Messages';
                            });
                            
                            const allCells = Array.from(sidePanel.querySelectorAll(
                              'div[role="row"], div[role="listitem"]'
                            ));
                                             
                            // Filtrar y encontrar la celda de chat/contacto correcta de forma inteligente
                            let cellToClick = null;
                            
                            // 1. Buscar si hay una celda de chat que contenga "(Tú)" o "(You)" (caso especial del número propio de pruebas)
                            cellToClick = allCells.find(cell => {
                              const txt = cell.textContent || '';
                              return txt.includes('(Tú)') || txt.includes('(You)');
                            });
                            
                            // 2. Si no es el número propio, buscar una celda que contenga los últimos 10 dígitos del teléfono
                            if (!cellToClick) {
                              const digits = searchPhone.replace(/\D/g, ''); // ej: "523511574876"
                              const last10 = digits.slice(-10); // últimos 10 dígitos para evitar líos de prefijo internacional
                              
                              cellToClick = allCells.find(cell => {
                                const txt = cell.textContent || '';
                                const titleEl = cell.querySelector('[data-testid="cell-frame-title"]') || cell.querySelector('span[title]');
                                const titleText = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '') : '';
                                // Evitar explícitamente celdas que tengan nombres de grupo conocidos en las pruebas o que contengan "VENTA FLEXOR"
                                return (txt.replace(/\D/g, '').includes(last10)) && !titleText.includes('VENTA FLEXOR');
                              });
                            }
                            
                            // 3. Fallback: Filtrar para obtener solo celdas previas a "Mensajes" (si existe la cabecera)
                            if (!cellToClick && mensajesHeader) {
                              const validCells = allCells.filter(cell => {
                                try {
                                  return cell.compareDocumentPosition(mensajesHeader) & Node.DOCUMENT_POSITION_FOLLOWING;
                                } catch (_) {
                                  return true;
                                }
                              });
                              if (validCells.length > 0) {
                                cellToClick = validCells[0];
                              }
                            }
                            
                            // 4. Fallback final: Primera celda si no se encontró nada por criterios
                            if (!cellToClick && allCells.length > 0) {
                              cellToClick = allCells[0];
                            }
                            
                            if (cellToClick) {
                              cellToClick.click();
                              console.log('[WhatsApp Inject SPA] Click en celda de chat/contacto seleccionada de forma segura.');
                              clicked = true;
                            }
                          }
                        }
                        
                        if (!clicked) {
                          const enter = new KeyboardEvent('keydown', {
                            bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
                          });
                          searchInput.dispatchEvent(enter);
                          console.log('[WhatsApp Inject SPA] Tecla Enter enviada al buscador como fallback.');
                        }
                        
                        // Esperar a que el panel del chat se active en el DOM
                        await new Promise(resolve => setTimeout(resolve, 250));
                      }
                    } catch (domErr) {
                      console.log('[WhatsApp Inject SPA] Error en fallback DOM de buscador:', domErr.message || domErr);
                    }
                  }

                  // 3. Escribir el mensaje (usando WPP con fallback DOM nativo independiente de JID)
                  if (text) {
                    try {
                      const activeChat = window.WPP.chat.getActiveChat();
                      const activeJid = activeChat ? (activeChat.id._serialized || activeChat.id) : jidStr;
                      await window.WPP.chat.setInputText(activeJid, text);
                      console.log('[WhatsApp Inject SPA] Mensaje escrito vía WPP.chat.setInputText.');
                    } catch (e) {
                      console.log('[WhatsApp Inject SPA] Fallo setInputText, usando escritura directa en el DOM...');
                      const msgInput = document.querySelector('#main div[contenteditable="true"][data-tab="10"]') ||
                                       document.querySelector('footer div[contenteditable="true"]');
                      if (msgInput) {
                        msgInput.focus();
                        const range = document.createRange();
                        range.selectNodeContents(msgInput);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                        document.execCommand('delete', false, null);
                        document.execCommand('insertText', false, text);
                        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log('[WhatsApp Inject SPA] Mensaje escrito vía DOM.');
                      }
                    }
                  }
                  
                  // 4. Limpiar buscador para restaurar la barra lateral a la lista de chats normales si se usó la búsqueda DOM
                  if (!openedVisually) {
                    setTimeout(() => {
                      try {
                        const searchInput2 = document.querySelector('#side div[contenteditable="true"]') ||
                                             document.querySelector('div[contenteditable="true"][data-tab="3"]');
                        if (searchInput2) {
                          searchInput2.focus();
                          document.execCommand('selectAll', false, null);
                          document.execCommand('delete', false, null);
                          searchInput2.dispatchEvent(new Event('input', { bubbles: true }));
                          
                          // Devolver foco al campo de mensaje
                          const msgInput = document.querySelector('#main div[contenteditable="true"][data-tab="10"]') ||
                                           document.querySelector('footer div[contenteditable="true"]');
                          if (msgInput) {
                            msgInput.focus();
                          }
                          console.log('[WhatsApp Inject SPA] Buscador limpiado tras abrir chat.');
                        }
                      } catch (err) {
                        console.log('[WhatsApp Inject SPA] Error al limpiar buscador:', err.message || err);
                      }
                    }, 400);
                  }
                  return true;
                }
              }
            } catch (err) {
              console.log('[WhatsApp Inject SPA] Error en bucle candidato:', err.message || err);
            }
          }
          return false;
        } catch (_) {
          return false;
        }
      })()
    `).catch(() => false);

    if (successViaWpp) {
      console.log('[wa-open-chat IPC] Chat abierto en caliente exitosamente vía WPPConnect');
      return { success: true };
    }

    // 2. Si WPPConnect no pudo abrirlo en caliente, usar la navegación SPA interna vía history.pushState / Backbone.history
    const textParam = defaultText ? '&text=' + encodeURIComponent(defaultText) : '';
    const relUrl = '/send?phone=' + cleaned + textParam;
    console.log('[wa-open-chat IPC] Navegando SPA interna de WhatsApp a:', relUrl);

    await waWeb.executeJavaScript(`
      (function() {
        try {
          const path = ${JSON.stringify(relUrl)};
          console.log('[WhatsApp Inject SPA] Fallback ejecutado');
          if (window.Store) {
            console.log('[WhatsApp Inject SPA] window.Store keys:', Object.keys(window.Store).filter(k => k.toLowerCase().includes('rout') || k.toLowerCase().includes('cmd') || k.toLowerCase().includes('chat') || k.toLowerCase().includes('hist')));
          }
          if (window.WPP && window.WPP.whatsapp) {
            console.log('[WhatsApp Inject SPA] WPP.whatsapp keys:', Object.keys(window.WPP.whatsapp));
            if (window.WPP.whatsapp.Cmd) {
              console.log('[WhatsApp Inject SPA] WPP.whatsapp.Cmd keys:', Object.keys(window.WPP.whatsapp.Cmd));
            }
          }
          
          // Buscar React Router o router de React Fiber
          const rootEl = document.getElementById('app') || document.querySelector('body > div');
          if (rootEl) {
            const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
            if (containerKey) {
              console.log('[WhatsApp Inject SPA] React container encontrado:', containerKey);
              const fiber = rootEl[containerKey];
              console.log('[WhatsApp Inject SPA] React fiber root keys:', Object.keys(fiber));
            }
          }
          
          // Fallback 1: Backbone history de WhatsApp Web expuesto en WPP
          if (window.WPP && window.WPP.whatsapp && window.WPP.whatsapp.Backbone && window.WPP.whatsapp.Backbone.history) {
            console.log('[WhatsApp Inject SPA] Navegando vía Backbone.history...');
            window.WPP.whatsapp.Backbone.history.navigate(path, { trigger: true });
            return;
          }
          // Fallback 2: Backbone history global directo
          if (window.Backbone && window.Backbone.history) {
            console.log('[WhatsApp Inject SPA] Navegando vía Backbone global...');
            window.Backbone.history.navigate(path, { trigger: true });
            return;
          }
          // Fallback 3: pushState estándar
          window.history.pushState({}, '', path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (e) {
          console.error('[WhatsApp Inject] Error en fallback de navegación SPA:', e);
        }
      })()
    `).catch((e) => console.error('[wa-open-chat IPC] Error al ejecutar navegación SPA:', e));

    return { success: true };
  } catch (err) {
    console.error('[wa-open-chat IPC] Error abriendo chat:', err);
    return { success: false, error: err.message || err };
  }
});

// ─── Guarda PDF directo en la carpeta Descargas (modo web/manual) ─────────────
ipcMain.handle('wa-save-pdf-to-downloads', async (_, { html = '', filename = 'Cotizacion.pdf' }) => {
  const win = new BrowserWindow({
    show: false,
    width: 816,
    height: 1056,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const tmpPath = require('path').join(require('os').tmpdir(), `fm-quote-dl-${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');
  win.loadFile(tmpPath);

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const pdfData = await win.webContents.printToPDF({ printBackground: true });
          win.destroy();
          try { fs.unlinkSync(tmpPath); } catch (_) {}

          const downloadsPath = app.getPath('downloads');
          const filePath = require('path').join(downloadsPath, filename);
          fs.writeFileSync(filePath, pdfData);

          // Revelar el archivo en Finder/Explorer para que el usuario lo encuentre fácil
          require('electron').shell.showItemInFolder(filePath);

          resolve({ success: true, filePath });
        } catch (e) {
          try { win.destroy(); } catch (_) {}
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          resolve({ success: false, error: e.message });
        }
      }, 2000);
    });
  });
});
// === IPC HANDLERS FOR REMOTE SUPPORT ("FIX ASISTENCIA") ===
const { desktopCapturer, screen } = require('electron');
const { exec, spawn } = require('child_process');

let winInputHelper = null;
let macInputHelper = null;

function initWindowsInputHelper() {
  if (process.platform !== 'win32') return;
  if (winInputHelper) return;

  const helperPath = path.join(app.getPath('userData'), 'fm_input_helper.exe');
  const srcPath = path.join(app.getPath('userData'), 'fm_input_helper.cs');

  const csSource = `
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class Program {
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);

    const int MOUSEEVENTF_LEFTDOWN = 0x02;
    const int MOUSEEVENTF_LEFTUP = 0x04;
    const int MOUSEEVENTF_RIGHTDOWN = 0x08;
    const int MOUSEEVENTF_RIGHTUP = 0x10;

    static void Main() {
        string line;
        while ((line = Console.ReadLine()) != null) {
            try {
                string[] parts = line.Split(' ');
                if (parts[0] == "M") {
                    int x = int.Parse(parts[1]);
                    int y = int.Parse(parts[2]);
                    SetCursorPos(x, y);
                } else if (parts[0] == "D") {
                    int btn = int.Parse(parts[1]);
                    int flags = btn == 2 ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_LEFTDOWN;
                    mouse_event(flags, 0, 0, 0, 0);
                } else if (parts[0] == "U") {
                    int btn = int.Parse(parts[1]);
                    int flags = btn == 2 ? MOUSEEVENTF_RIGHTUP : MOUSEEVENTF_LEFTUP;
                    mouse_event(flags, 0, 0, 0, 0);
                } else if (parts[0] == "K") {
                    string keys = line.Substring(2);
                    SendKeys.SendWait(keys);
                }
            } catch {}
        }
    }
}
`;

  try {
    if (!fs.existsSync(helperPath)) {
      fs.writeFileSync(srcPath, csSource, 'utf8');
      const cscPaths = [
        'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
        'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
      ];
      let compiled = false;
      for (const csc of cscPaths) {
        if (fs.existsSync(csc)) {
          const { execSync } = require('child_process');
          execSync(`"${csc}" /out:"${helperPath}" /target:exe "${srcPath}"`);
          compiled = true;
          break;
        }
      }
      try { fs.unlinkSync(srcPath); } catch(_) {}
      if (!compiled) {
        console.error('No csc.exe found to compile input helper.');
        return;
      }
    }

    winInputHelper = spawn(helperPath, [], {
      stdio: ['pipe', 'ignore', 'ignore']
    });

    winInputHelper.on('error', (err) => {
      console.error('Windows input helper error:', err);
    });

    winInputHelper.on('exit', () => {
      winInputHelper = null;
    });

  } catch (err) {
    console.error('Failed to init Windows input helper:', err);
  }
}

function initMacInputHelper() {
  if (process.platform !== 'darwin') return;
  if (macInputHelper) return;

  const helperPath = path.join(app.getPath('userData'), 'fm_input_helper.py');

  const pySource = `
import sys
import ctypes

try:
    cg = ctypes.CDLL('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
    cg.CGWarpMouseCursorPosition.argtypes = [ctypes.c_double, ctypes.c_double]
    cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
    cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
    
    kCGEventLeftMouseDown = 1
    kCGEventLeftMouseUp = 2
    kCGEventRightMouseDown = 3
    kCGEventRightMouseUp = 4
    kCGHIDEventTap = 0
except Exception as e:
    sys.exit(1)

for line in sys.stdin:
    try:
        parts = line.strip().split()
        if not parts:
            continue
        cmd = parts[0]
        if cmd == 'M':
            x, y = float(parts[1]), float(parts[2])
            cg.CGWarpMouseCursorPosition(x, y)
        elif cmd == 'D':
            btn = int(parts[1])
            x, y = float(parts[2]), float(parts[3])
            evt_type = kCGEventRightMouseDown if btn == 2 else kCGEventLeftMouseDown
            evt = cg.CGEventCreateMouseEvent(None, evt_type, (x, y), btn)
            cg.CGEventPost(kCGHIDEventTap, evt)
        elif cmd == 'U':
            btn = int(parts[1])
            x, y = float(parts[2]), float(parts[3])
            evt_type = kCGEventRightMouseUp if btn == 2 else kCGEventLeftMouseUp
            evt = cg.CGEventCreateMouseEvent(None, evt_type, (x, y), btn)
            cg.CGEventPost(kCGHIDEventTap, evt)
    except:
        pass
`;

  try {
    fs.writeFileSync(helperPath, pySource, 'utf8');
    macInputHelper = spawn('python3', [helperPath], {
      stdio: ['pipe', 'ignore', 'ignore']
    });

    macInputHelper.on('error', (err) => {
      console.warn('macOS Python input helper failed to start, falling back to osascript:', err);
      macInputHelper = null;
    });

    macInputHelper.on('exit', () => {
      macInputHelper = null;
    });

  } catch (err) {
    console.warn('Failed to init macOS input helper:', err);
  }
}

// Clean up helpers on close
app.on('will-quit', () => {
  if (winInputHelper) {
    try { winInputHelper.kill(); } catch(_) {}
  }
  if (macInputHelper) {
    try { macInputHelper.kill(); } catch(_) {}
  }
});

ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.map(s => ({ id: s.id, name: s.name }));
  } catch (err) {
    console.error('Error in get-desktop-sources:', err);
    return [];
  }
});

ipcMain.handle('simulate-mouse', async (_, event) => {
  const { type, x, y, button } = event;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;

  const physicalX = Math.round(x * screenWidth);
  const physicalY = Math.round(y * screenHeight);

  if (process.platform === 'win32') {
    if (!winInputHelper) {
      initWindowsInputHelper();
    }
    if (winInputHelper && winInputHelper.stdin.writable) {
      if (type === 'mouse-move') {
        winInputHelper.stdin.write(`M ${physicalX} ${physicalY}\n`);
      } else if (type === 'mouse-down') {
        winInputHelper.stdin.write(`D ${button} ${physicalX} ${physicalY}\n`);
      } else if (type === 'mouse-up') {
        winInputHelper.stdin.write(`U ${button} ${physicalX} ${physicalY}\n`);
      }
      return;
    }

    // Fallback if helper is not active
    if (type === 'mouse-move') {
      const moveCmd = `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${physicalX}, ${physicalY});`;
      exec(`powershell -command "${moveCmd}"`);
    } else if (type === 'mouse-down' || type === 'mouse-up') {
      let flags = 0;
      if (type === 'mouse-down') {
        flags = button === 2 ? 0x0008 : 0x0002;
      } else {
        flags = button === 2 ? 0x0010 : 0x0004;
      }
      const clickCmd = `Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(${flags}, ${physicalX}, ${physicalY}, 0, 0);`;
      exec(`powershell -command "${clickCmd}"`);
    }
  } else if (process.platform === 'darwin') {
    if (!macInputHelper) {
      initMacInputHelper();
    }
    if (macInputHelper && macInputHelper.stdin.writable) {
      if (type === 'mouse-move') {
        macInputHelper.stdin.write(`M ${physicalX} ${physicalY}\n`);
      } else if (type === 'mouse-down') {
        macInputHelper.stdin.write(`D ${button} ${physicalX} ${physicalY}\n`);
      } else if (type === 'mouse-up') {
        macInputHelper.stdin.write(`U ${button} ${physicalX} ${physicalY}\n`);
      }
      return;
    }

    // Fallback if helper is not active
    if (type === 'mouse-move') {
      const moveCmd = `python3 -c "import ctypes; os = ctypes.CDLL('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices'); os.CGWarpMouseCursorPosition.argtypes = [ctypes.c_double, ctypes.c_double]; os.CGWarpMouseCursorPosition(${physicalX}.0, ${physicalY}.0)"`;
      exec(moveCmd);
    } else if (type === 'mouse-down') {
      const appleScriptCmd = `tell application "System Events" to click at {${physicalX}, ${physicalY}}`;
      exec(`osascript -e '${appleScriptCmd}'`);
    }
  }
});

ipcMain.handle('simulate-keyboard', async (_, event) => {
  const { type, key, code, shiftKey, ctrlKey, altKey, metaKey } = event;
  if (type !== 'key-down') return;

  if (process.platform === 'win32') {
    let winKey = key;
    if (key.length > 1) {
      const specialKeys = {
        'Enter': '{ENTER}',
        'Backspace': '{BACKSPACE}',
        'Tab': '{TAB}',
        'Escape': '{ESC}',
        'ArrowUp': '{UP}',
        'ArrowDown': '{DOWN}',
        'ArrowLeft': '{LEFT}',
        'ArrowRight': '{RIGHT}',
        'Delete': '{DELETE}',
        'Insert': '{INSERT}',
        'Home': '{HOME}',
        'End': '{END}',
        'PageUp': '{PGUP}',
        'PageDown': '{PGDN}',
        'F1': '{F1}', 'F2': '{F2}', 'F3': '{F3}', 'F4': '{F4}', 'F5': '{F5}', 'F6': '{F6}',
        'F7': '{F7}', 'F8': '{F8}', 'F9': '{F9}', 'F10': '{F10}', 'F11': '{F11}', 'F12': '{F12}'
      };
      winKey = specialKeys[key] || '';
    } else {
      if (['+', '^', '%', '~', '(', ')', '{', '}'].includes(key)) {
        winKey = `{${key}}`;
      }
    }

    if (!winKey) return;

    let modifierPrefix = '';
    if (shiftKey) modifierPrefix += '+';
    if (ctrlKey) modifierPrefix += '^';
    if (altKey) modifierPrefix += '%';

    if (!winInputHelper) {
      initWindowsInputHelper();
    }
    if (winInputHelper && winInputHelper.stdin.writable) {
      winInputHelper.stdin.write(`K ${modifierPrefix}${winKey}\n`);
      return;
    }

    const sendCmd = `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.SendKeys]::SendWait('${modifierPrefix}${winKey}');`;
    exec(`powershell -command "${sendCmd}"`);
  } else if (process.platform === 'darwin') {
    let appleScriptCmd = '';
    if (key.length === 1) {
      appleScriptCmd = `tell application "System Events" to keystroke "${key}"`;
    } else {
      const macKeyCodes = {
        'Enter': 36,
        'Backspace': 51,
        'Tab': 48,
        'Escape': 53,
        'ArrowUp': 126,
        'ArrowDown': 125,
        'ArrowLeft': 123,
        'ArrowRight': 124,
        'Space': 49
      };
      const codeNum = macKeyCodes[key];
      if (codeNum) {
        appleScriptCmd = `tell application "System Events" to key code ${codeNum}`;
      }
    }

    if (appleScriptCmd) {
      exec(`osascript -e '${appleScriptCmd}'`);
    }
  }
});

// ─── IPC: GESTOR DE ARCHIVOS REMOTOS P2P ─────────────────────────────────────
ipcMain.handle('list-remote-dir', async (_, targetPath) => {
  try {
    const getDesktopPath = () => {
      try { return app.getPath('desktop'); } catch (_) { return path.join(os.homedir(), 'Desktop'); }
    };
    const getDownloadsPath = () => {
      try { return app.getPath('downloads'); } catch (_) { return path.join(os.homedir(), 'Downloads'); }
    };
    const getDocumentsPath = () => {
      try { return app.getPath('documents'); } catch (_) { return path.join(os.homedir(), 'Documents'); }
    };
    const getHomePath = () => {
      try { return app.getPath('home'); } catch (_) { return os.homedir(); }
    };

    const defaultPath = getHomePath().replace(/\\/g, '/');
    let dirPath = targetPath && targetPath.trim() !== '' ? targetPath.trim().replace(/\\/g, '/') : defaultPath;

    if (dirPath.toLowerCase() === 'escritorio' || dirPath.toLowerCase() === 'desktop') {
      dirPath = getDesktopPath().replace(/\\/g, '/');
    } else if (dirPath.toLowerCase() === 'descargas' || dirPath.toLowerCase() === 'downloads') {
      dirPath = getDownloadsPath().replace(/\\/g, '/');
    } else if (dirPath.toLowerCase() === 'documentos' || dirPath.toLowerCase() === 'documents') {
      dirPath = getDocumentsPath().replace(/\\/g, '/');
    } else if (dirPath.toLowerCase() === 'inicio' || dirPath.toLowerCase() === 'home') {
      dirPath = defaultPath;
    }

    if (!fs.existsSync(dirPath)) {
      dirPath = defaultPath;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];

    for (const item of items) {
      try {
        const fullItemPath = path.join(dirPath, item.name).replace(/\\/g, '/');
        const isDir = item.isDirectory();
        let size = 0;
        if (!isDir) {
          try {
            const stat = fs.statSync(fullItemPath);
            size = stat.size;
          } catch (_) {}
        }
        files.push({
          name: item.name,
          path: fullItemPath,
          isDir,
          size
        });
      } catch (_) {}
    }

    files.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    const parentDir = path.dirname(dirPath).replace(/\\/g, '/');
    const parentPath = parentDir !== dirPath ? parentDir : null;

    return {
      success: true,
      currentPath: dirPath,
      parentPath: parentPath,
      shortcuts: {
        desktop: getDesktopPath().replace(/\\/g, '/'),
        downloads: getDownloadsPath().replace(/\\/g, '/'),
        documents: getDocumentsPath().replace(/\\/g, '/'),
        home: defaultPath
      },
      items: files
    };
  } catch (err) {
    const getDesktopPath = () => {
      try { return app.getPath('desktop'); } catch (_) { return path.join(os.homedir(), 'Desktop'); }
    };
    const getDownloadsPath = () => {
      try { return app.getPath('downloads'); } catch (_) { return path.join(os.homedir(), 'Downloads'); }
    };
    const getDocumentsPath = () => {
      try { return app.getPath('documents'); } catch (_) { return path.join(os.homedir(), 'Documents'); }
    };
    const getHomePath = () => {
      try { return app.getPath('home'); } catch (_) { return os.homedir(); }
    };

    return {
      success: false,
      error: err.message,
      currentPath: (targetPath || '').replace(/\\/g, '/'),
      parentPath: null,
      shortcuts: {
        desktop: getDesktopPath().replace(/\\/g, '/'),
        downloads: getDownloadsPath().replace(/\\/g, '/'),
        documents: getDocumentsPath().replace(/\\/g, '/'),
        home: getHomePath().replace(/\\/g, '/')
      },
      items: []
    };
  }
});

ipcMain.handle('read-remote-chunk', async (_, { filePath, offset, chunkSize }) => {
  try {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!fs.existsSync(normalizedPath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    const fd = fs.openSync(normalizedPath, 'r');
    const buffer = Buffer.alloc(chunkSize || 64 * 1024);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, offset || 0);
    fs.closeSync(fd);

    const stat = fs.statSync(normalizedPath);
    const eof = (offset + bytesRead) >= stat.size;
    const base64 = buffer.subarray(0, bytesRead).toString('base64');

    return {
      success: true,
      base64,
      base64Chunk: base64,
      bytesRead,
      eof,
      isEOF: eof,
      totalSize: stat.size
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-remote-chunk', async (_, args) => {
  try {
    const filePath = args.filePath.replace(/\\/g, '/');
    const chunkIndex = args.chunkIndex;
    const dataBase64 = args.dataBase64 || args.base64Chunk;
    const isFirstChunk = args.isFirstChunk !== undefined ? args.isFirstChunk : (args.append === false || args.append === undefined || chunkIndex === 0);

    if (!dataBase64) {
      return { success: false, error: 'No se recibió el contenido en base64' };
    }

    const buffer = Buffer.from(dataBase64, 'base64');

    // Crear directorios padres de forma recursiva si no existen
    const folderPath = path.dirname(filePath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    if (isFirstChunk || chunkIndex === 0) {
      fs.writeFileSync(filePath, buffer);
    } else {
      fs.appendFileSync(filePath, buffer);
    }
    return { success: true, chunkIndex };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-remote-file', async (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: true };
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('zip-remote-dir', async (_, dirPath) => {
  try {
    const { exec } = require('child_process');
    const sourceDir = dirPath.replace(/\\/g, '/');
    if (!fs.existsSync(sourceDir)) {
      return { success: false, error: 'La carpeta origen no existe' };
    }

    const folderName = path.basename(sourceDir) || 'carpeta';
    const tempZipPath = path.join(os.tmpdir(), `${folderName}_${Date.now()}.zip`).replace(/\\/g, '/');

    let cmd = '';
    if (process.platform === 'win32') {
      cmd = `powershell -Command "Compress-Archive -Path '${sourceDir}' -DestinationPath '${tempZipPath}' -Force"`;
    } else {
      const parentDir = path.dirname(sourceDir);
      const baseName = path.basename(sourceDir);
      cmd = `cd "${parentDir}" && zip -r "${tempZipPath}" "${baseName}"`;
    }

    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });
    });

    return {
      success: true,
      zipFilePath: tempZipPath,
      zipFileName: `${folderName}.zip`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

