/**
 * pack-installer.js
 * ─────────────────────────────────────────────────────────────
 * Corre automáticamente después de `electron-builder --mac`.
 * Empaqueta los archivos .dmg generados junto con el script de
 * instalación en una carpeta lista para entregar al cliente:
 *
 *   release/
 *   └── FixManager-Installer/
 *       ├── FixManager-x.x.x-universal.dmg  (Intel + Apple Silicon)
 *       └── Instalar FixManager.command
 * ─────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Rutas ──────────────────────────────────────────────────
const ROOT         = path.join(__dirname, '..');
const RELEASE_DIR  = path.join(ROOT, 'release');
const COMMAND_FILE = path.join(ROOT, 'Instalar FixManager.command');
const OUTPUT_DIR   = path.join(RELEASE_DIR, 'FixManager-Installer');

// ── Colores para la consola ────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};

function log(icon, color, msg) {
  console.log(`${color}${icon} ${msg}${C.reset}`);
}

console.log('');
console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
console.log(`${C.cyan}${C.bold}   FIXMANAGER — Empaquetando Instalador   ${C.reset}`);
console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
console.log('');

// ── Verificar que existe la carpeta release/ ──────────────
if (!fs.existsSync(RELEASE_DIR)) {
  log('❌', C.red, `No se encontró la carpeta release/. ¿Corriste electron-builder?`);
  process.exit(1);
}

// ── Verificar que existe el script .command ───────────────
if (!fs.existsSync(COMMAND_FILE)) {
  log('❌', C.red, `No se encontró: ${path.basename(COMMAND_FILE)}`);
  log('  ', C.yellow, 'Asegúrate de que el archivo .command esté en la raíz del proyecto.');
  process.exit(1);
}

// ── Leer versión actual desde package.json ───────────────
const pkg     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
log('📋', C.cyan, `Versión actual: ${VERSION}`);
console.log('');

// ── Buscar el .dmg universal de la versión actual ────────
const allDmg = fs.readdirSync(RELEASE_DIR).filter(f => f.endsWith('.dmg'));

// Preferir universal; si no existe, tomar el primero que coincida con la versión
const universalDmg = allDmg.find(f => f.includes(VERSION) && f.includes('universal'));
const fallbackDmg  = allDmg.find(f => f.includes(VERSION));
const chosen       = universalDmg || fallbackDmg;

const dmgFiles = chosen ? [path.join(RELEASE_DIR, chosen)] : [];

const skipped = allDmg.filter(f => !chosen || path.basename(f) !== chosen);
if (skipped.length > 0) {
  log('⏭ ', C.yellow, `Ignorando: ${skipped.join(', ')}`);
}

if (dmgFiles.length === 0) {
  log('❌', C.red, `No se encontraron archivos .dmg para la versión ${VERSION} en release/`);
  log('  ', C.yellow, 'Verifica que electron-builder terminó correctamente.');
  process.exit(1);
}

log('✅', C.green, `${dmgFiles.length} archivo(s) .dmg v${VERSION} encontrado(s):`);
dmgFiles.forEach(f => log('   •', C.cyan, path.basename(f)));
console.log('');

// ── Crear/limpiar carpeta de salida ──────────────────────
if (fs.existsSync(OUTPUT_DIR)) {
  log('🗑 ', C.yellow, 'Limpiando carpeta anterior FixManager-Installer/...');
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR);
log('📁', C.cyan, `Carpeta creada: release/FixManager-Installer/`);
console.log('');

// ── Copiar archivos .dmg ──────────────────────────────────
for (const dmg of dmgFiles) {
  const dest = path.join(OUTPUT_DIR, path.basename(dmg));
  fs.copyFileSync(dmg, dest);
  log('📦', C.green, `Copiado: ${path.basename(dmg)}`);
}

// ── Copiar y dar permisos al script .command ──────────────
const destCommand = path.join(OUTPUT_DIR, 'Instalar FixManager.command');
fs.copyFileSync(COMMAND_FILE, destCommand);

try {
  execSync(`chmod +x "${destCommand}"`);
  log('🔑', C.green, `Script incluido con permisos de ejecución: Instalar FixManager.command`);
} catch (e) {
  log('⚠️ ', C.yellow, `Script copiado pero no se pudo aplicar chmod: ${e.message}`);
}

// ── Limpiar basura que deja electron-builder ──────────────
const CLEANUP = [
  'mac-universal', 'mac-arm64', 'mac-universal-x64-temp', 'mac-universal-arm64-temp',
  'win-unpacked', 'win-universal-unpacked',
  '.icon-icns', '.icon-ico',
  'builder-debug.yml', 'builder-effective-config.yaml',
  'latest.yml', 'latest-mac.yml',
];
for (const item of CLEANUP) {
  const p = path.join(RELEASE_DIR, item);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true });
  }
}
// Eliminar .blockmap y versiones antiguas de dmg/exe
fs.readdirSync(RELEASE_DIR).forEach(f => {
  const isOldVersion = (f.endsWith('.dmg') || f.endsWith('.exe')) && !f.includes(VERSION);
  const isBlockmap   = f.endsWith('.blockmap');
  const isDsStore    = f === '.DS_Store';
  if (isOldVersion || isBlockmap || isDsStore) {
    fs.rmSync(path.join(RELEASE_DIR, f));
  }
});
log('🧹', C.cyan, 'Archivos temporales eliminados.');
console.log('');

// ── Resumen final ─────────────────────────────────────────
console.log('');
console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
log('🎉', C.green, `${C.bold}¡Instalador listo!${C.reset}`);
log('📂', C.cyan, `Ubicación: release/FixManager-Installer/`);
console.log('');
console.log(`${C.yellow}  Contenido de la carpeta para el cliente:${C.reset}`);

fs.readdirSync(OUTPUT_DIR).forEach(f => {
  console.log(`    ${C.cyan}•${C.reset} ${f}`);
});
console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
console.log('');
