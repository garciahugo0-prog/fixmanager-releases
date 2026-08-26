const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  platform: process.platform,
  onUpdateAvailable: (callback) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_, data) => callback(data));
  },
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  queryGeminiPrinter: (params) => ipcRenderer.invoke('query-gemini-printer', params),
  // Imprime la página actual sin mostrar el diálogo del OS
  silentPrint: (options) => ipcRenderer.invoke('silent-print', options || {}),
  // Imprime HTML arbitrario en ventana oculta sin diálogo del OS
  silentPrintHtml: (options) => ipcRenderer.invoke('silent-print-html', options || {}),

  // ─── LICENCIAS ───────────────────────────────────────────────────────────────
  /** Devuelve el ID único de esta instalación (16 hex chars) */
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  /** Devuelve el estado actual de la licencia: { status, type, expiry, ownerName, activatedAt, machineId } */
  getLicense: () => ipcRenderer.invoke('get-license'),
  /** Activa la licencia con los datos proporcionados. Retorna { success, license?, error? } */
  activateLicense: (params) => ipcRenderer.invoke('activate-license', params),
  /** Guarda los tokens de sesión de Supabase en disco para persistirlos entre reinicios */
  saveSupabaseSession: (tokens) => ipcRenderer.invoke('save-supabase-session', tokens),
  /** Recupera los tokens de sesión de Supabase guardados en disco */
  getSupabaseSession: () => ipcRenderer.invoke('get-supabase-session'),
  /** Obtiene la fecha y hora del servidor desde el main process para evitar CORS */
  getNetworkDate: () => ipcRenderer.invoke('get-network-date'),

  // ─── ACTUALIZACIONES ─────────────────────────────────────────────────────────
  /** Verifica actualizaciones manualmente. Retorna { hasUpdate, version?, notes?, dmgUrl?, currentVersion, error? } */
  checkUpdatesManual: () => ipcRenderer.invoke('check-updates-manual'),
  checkAppUpdate: () => ipcRenderer.invoke('check-app-update'),
  downloadAndInstallUpdate: (url) => ipcRenderer.invoke('download-and-install-update', url),
  onUpdateProgress: (callback) => {
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.on('update-download-progress', (_, data) => callback(data));
  },
  /** Devuelve la versión actual del app (APP_VERSION de main.js) */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  /** Busca especificaciones de un dispositivo en internet (scraping sin CORS) */
  lookupDeviceInternet: (query) => ipcRenderer.invoke('lookup-device-internet', { query }),
  /** Envía un mensaje de WhatsApp vía HTTP desde el proceso principal (sin CORS) */
  sendWhatsApp: (url) => ipcRenderer.invoke('send-whatsapp', { url }),
  /** Envía una petición POST de WhatsApp desde el proceso principal (sin CORS) */
  sendWhatsAppPost: (url, headers, body) => ipcRenderer.invoke('send-whatsapp-post', { url, headers, body }),
  /** Envía un mensaje de Telegram vía POST desde el proceso principal (sin CORS) */
  sendTelegram: (url, body) => ipcRenderer.invoke('send-telegram', { url, body }),
  /** Verifica el token y devuelve info del bot { ok, data: { result: { first_name, username } } } */
  telegramGetMe: (token) => ipcRenderer.invoke('telegram-get-me', { token }),
  /** Obtiene los últimos mensajes para extraer el chat_id automáticamente */
  telegramGetUpdates: (token) => ipcRenderer.invoke('telegram-get-updates', { token }),
  /** Envía peticiones API a Taecel sin restricciones de CORS desde el main process */
  taecelApiRequest: (endpoint, body) => ipcRenderer.invoke('taecel-api-request', { endpoint, body }),

  // ─── DEV PANEL ───────────────────────────────────────────────────────────────
  /** Verifica la contraseña del panel dev — la comparación ocurre en main, nunca en el renderer */
  devAuth: (hash) => ipcRenderer.invoke('dev-auth', { hash }),

  // ─── CIERRE CONTROLADO ───────────────────────────────────────────────────────
  /** Cierra la ventana de forma definitiva (sin interceptar beforeunload) */
  confirmClose: () => ipcRenderer.send('confirm-close'),
  /** Genera y descarga un PDF desde HTML */
  printToPdf: (options) => ipcRenderer.invoke('print-to-pdf', options || {}),
  /** Genera una imagen del HTML del ticket y la copia al portapapeles */
  copyHtmlToClipboard: (options) => ipcRenderer.invoke('copy-html-to-clipboard', options || {}),
  /** Lee un archivo local y lo devuelve como base64 data URI */
  readFileBase64: (filePath) => ipcRenderer.invoke('read-file-base64', filePath),
  /** Envía pulso ESC/POS al cajón de dinero conectado a la impresora térmica */
  openCashDrawer: (options) => {
    const args = typeof options === 'string' ? { deviceName: options } : options;
    return ipcRenderer.invoke('open-cash-drawer', args);
  },
  /** Redimensiona la ventana según el modo login/app */
  setLoginMode: (isLogin, firstTime) => ipcRenderer.send('set-login-mode', { isLogin, firstTime }),
  /** Muestra u oculta el wizard en ventana pequeña centrada */
  setWizardMode: (active) => ipcRenderer.send('set-wizard-mode', { active }),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  writeBackupFile: (opts) => ipcRenderer.invoke('write-backup-file', opts),
  savePendingBackup: (data) => ipcRenderer.invoke('save-pending-backup', data),
  getPendingBackups: () => ipcRenderer.invoke('get-pending-backups'),
  deletePendingBackup: (filename) => ipcRenderer.invoke('delete-pending-backup', filename),
  applyZoomFactor: (factor) => ipcRenderer.send('apply-zoom-factor', factor),
  onZoomChanged: (cb) => {
    ipcRenderer.removeAllListeners('zoom-changed');
    ipcRenderer.on('zoom-changed', (_, val) => cb(val));
  },
  onZoomReset: (cb) => {
    ipcRenderer.removeAllListeners('zoom-reset');
    ipcRenderer.on('zoom-reset', () => cb());
  },
  setGeminiKey: (key) => ipcRenderer.invoke('set-gemini-key', { key }),
  getTopDevices: () => ipcRenderer.invoke('get-top-devices'),
  startLocalServer: () => ipcRenderer.invoke('start-local-server'),
  stopLocalServer: () => ipcRenderer.invoke('stop-local-server'),
  isServerRunning: () => ipcRenderer.invoke('is-server-running'),

  // ─── WHATSAPP INTEGRADO ──────────────────────────────────────────────────────
  whatsappConnect: () => {},
  getWaPreloadPath: () => ipcRenderer.sendSync('get-wa-preload-path'),
  getCleanUserAgent: () => ipcRenderer.sendSync('get-clean-user-agent'),
  whatsappDisconnect: () => ipcRenderer.send('wa-disconnect'),
  whatsappGetStatus: () => ipcRenderer.invoke('wa-get-status'),
  onWhatsappQrCode: (callback) => {
    const handler = (_, qr) => callback(qr);
    ipcRenderer.on('wa-on-qrcode', handler);
    return () => ipcRenderer.removeListener('wa-on-qrcode', handler);
  },
  onWhatsappStatusChange: (callback) => {
    const handler = (_, status) => callback(status);
    ipcRenderer.on('wa-on-status-change', handler);
    return () => ipcRenderer.removeListener('wa-on-status-change', handler);
  },
  onWhatsappUnreadCount: (callback) => {
    const handler = (_, count) => callback(count);
    ipcRenderer.on('wa-on-unread-count', handler);
    return () => ipcRenderer.removeListener('wa-on-unread-count', handler);
  },
  whatsappSendMessage: (phone, text, base64Image) => ipcRenderer.invoke('wa-send-message', { phone, text, base64Image }),
  whatsappCheckNumber: (phone) => ipcRenderer.invoke('wa-check-number', { phone }),
  whatsappOpenChat: (phone, defaultText) => ipcRenderer.invoke('wa-open-chat', { phone, defaultText }),
  whatsappReload: () => ipcRenderer.send('wa-reload'),
  whatsappForceUpdate: () => ipcRenderer.invoke('wa-force-update'),
  /** Envía un documento PDF al chat de WhatsApp */
  whatsappSendDocument: (phone, pdfBase64, filename) => ipcRenderer.invoke('wa-send-document', { phone, pdfBase64, filename }),
  /** Genera un PDF en memoria desde HTML y devuelve el base64 (sin guardar en disco) */
  waGeneratePdfBase64: (html) => ipcRenderer.invoke('wa-generate-pdf-base64', { html }),
  /** Guarda PDF directo en la carpeta Descargas y lo revela en Finder/Explorer (modo web/manual) */
  waSavePdfToDownloads: (html, filename) => ipcRenderer.invoke('wa-save-pdf-to-downloads', { html, filename }),
  
  // Evidencias Multimedia
  saveEvidenceMedia: (orderId, fileName, fileBase64) => ipcRenderer.invoke('save-evidence-media', { orderId, fileName, fileBase64 }),
  deleteEvidenceMedia: (filePath) => ipcRenderer.invoke('delete-evidence-media', { filePath }),
  openEvidenceFolder: (orderId) => ipcRenderer.invoke('open-evidence-folder', { orderId }),
  onEvidenceUploaded: (callback) => {
    ipcRenderer.removeAllListeners('evidence-uploaded');
    ipcRenderer.on('evidence-uploaded', (_, data) => callback(data));
  },
  onProductImageUploaded: (callback) => {
    ipcRenderer.removeAllListeners('product-image-uploaded');
    ipcRenderer.on('product-image-uploaded', (_, data) => callback(data));
  },

  // Persistencia robusta de configuración en disco (evita problemas de localStorage)
  saveSettings: (configData) => ipcRenderer.invoke('save-settings', configData),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // Soporte Remoto ("Fix Asistencia")
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  simulateMouse: (event) => ipcRenderer.invoke('simulate-mouse', event),
  simulateKeyboard: (event) => ipcRenderer.invoke('simulate-keyboard', event),

  // Gestor de Archivos Remotos P2P
  listRemoteDir: (targetPath) => ipcRenderer.invoke('list-remote-dir', targetPath),
  readRemoteChunk: (opts) => ipcRenderer.invoke('read-remote-chunk', opts),
  writeRemoteChunk: (opts) => ipcRenderer.invoke('write-remote-chunk', opts),
  deleteRemoteFile: (filePath) => ipcRenderer.invoke('delete-remote-file', filePath),
  zipRemoteDir: (dirPath) => ipcRenderer.invoke('zip-remote-dir', dirPath),

  // IMÁGENES DE PRODUCTO Y BACKUPS LOCALES
  saveProductImage: (fileName, fileBase64) => ipcRenderer.invoke('save-product-image', { fileName, fileBase64 }),
  readProductImage: (fileName) => ipcRenderer.invoke('read-product-image', { fileName }),
  deleteProductImage: (fileName) => ipcRenderer.invoke('delete-product-image', { fileName }),
  exportLocalImages: () => ipcRenderer.invoke('export-local-images'),
  importLocalImages: (localImages) => ipcRenderer.invoke('import-local-images', { localImages }),
});
