#!/usr/bin/env node
/**
 * clean-license.js
 * Elimina el archivo de licencia guardado localmente para poder
 * probar el flujo de activación desde cero en modo desarrollo.
 *
 * Uso:
 *   node scripts/clean-license.js          → solo borra la licencia
 *   npm run dev:clean                       → borra y arranca dev
 */

const path = require('path');
const os   = require('os');
const fs   = require('fs');

// Misma lógica que app.getPath('userData') de Electron por plataforma
function getUserDataPath(productName) {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', productName);
    case 'win32':
      return path.join(process.env.APPDATA || os.homedir(), productName);
    default:
      return path.join(os.homedir(), '.config', productName);
  }
}

const PRODUCT_NAME = 'FixManager';
const userDataPath = getUserDataPath(PRODUCT_NAME);
const licFile      = path.join(userDataPath, 'fixmanager_license.json');
const actFile      = path.join(userDataPath, 'fixmanager_activation.json');
const sessFile     = path.join(userDataPath, 'fixmanager_supabase_session.json');
const settFile     = path.join(userDataPath, 'fixmanager_settings.json');

console.log('\n🧹  FixManager — Limpieza de licencia y datos para desarrollo');
console.log('─────────────────────────────────────────────────────────');
console.log('📁  userData:', userDataPath);

let cleaned = false;
const localStorageDir  = path.join(userDataPath, 'Local Storage');
const sessionStorageDir = path.join(userDataPath, 'Session Storage');

if (fs.existsSync(licFile)) {
  fs.unlinkSync(licFile);
  console.log('✅  fixmanager_license.json eliminado.');
  cleaned = true;
}
if (fs.existsSync(actFile)) {
  fs.unlinkSync(actFile);
  console.log('✅  fixmanager_activation.json eliminado.');
  cleaned = true;
}
if (fs.existsSync(sessFile)) {
  fs.unlinkSync(sessFile);
  console.log('✅  fixmanager_supabase_session.json eliminado.');
  cleaned = true;
}
if (fs.existsSync(settFile)) {
  fs.unlinkSync(settFile);
  console.log('✅  fixmanager_settings.json eliminado.');
  cleaned = true;
}
if (fs.existsSync(localStorageDir)) {
  fs.rmSync(localStorageDir, { recursive: true, force: true });
  console.log('✅  Local Storage (Chromium) eliminado.');
  cleaned = true;
}
if (fs.existsSync(sessionStorageDir)) {
  fs.rmSync(sessionStorageDir, { recursive: true, force: true });
  console.log('✅  Session Storage (Chromium) eliminado.');
  cleaned = true;
}

if (cleaned) {
  console.log('\n');
} else {
  console.log('ℹ   No hay archivos de licencia guardados.\n');
}
