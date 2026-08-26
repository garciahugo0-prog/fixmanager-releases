const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MAIN_JS_PATH = path.join(ROOT, 'electron', 'main.js');
const BACKUP_MAIN_JS_PATH = path.join(ROOT, 'electron', 'main.backup.js');

// Parse arguments
const args = process.argv.slice(2);
const target = args[0]; // e.g. '--win', '--mac', '--all'

if (!target || !['--win', '--mac', '--all'].includes(target)) {
  console.error('Error: Debes especificar un target válido (--win, --mac o --all)');
  process.exit(1);
}

console.log('');
console.log('==================================================');
console.log('   FIXMANAGER — Compilación Protegida (Obfuscator) ');
console.log('==================================================');
console.log('');

// Guardar copia del archivo original main.js
try {
  fs.copyFileSync(MAIN_JS_PATH, BACKUP_MAIN_JS_PATH);
  console.log('✅ Copia de seguridad creada en electron/main.backup.js');
} catch (e) {
  console.error('❌ Error al crear la copia de seguridad de main.js:', e.message);
  process.exit(1);
}

let success = false;

try {
  // 1. Calcular el hash del bundle de React (dist/assets/index-[hash].js)
  console.log('🔍 Calculando el hash de integridad de la interfaz React...');
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) {
    throw new Error('No se encontró la carpeta dist/assets. ¿Olvidaste correr "npm run build" primero?');
  }
  const files = fs.readdirSync(assetsDir);
  const indexJsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  if (!indexJsFile) {
    throw new Error('No se encontró el archivo compilado de React index-*.js en dist/assets.');
  }
  const indexJsPath = path.join(assetsDir, indexJsFile);
  const indexContent = fs.readFileSync(indexJsPath);
  const crypto = require('crypto');
  const reactHash = crypto.createHash('sha256').update(indexContent).digest('hex');
  console.log(`🔑 Hash SHA-256 calculado para ${indexJsFile}: ${reactHash}`);

  // 2. Inyectar el hash en electron/main.js antes de ofuscar
  let mainJsContent = fs.readFileSync(MAIN_JS_PATH, 'utf8');
  if (!mainJsContent.includes('___INTEGRITY_HASH_PLACEHOLDER___')) {
    throw new Error('No se encontró el placeholder ___INTEGRITY_HASH_PLACEHOLDER___ en electron/main.js');
  }
  mainJsContent = mainJsContent.replace('___INTEGRITY_HASH_PLACEHOLDER___', reactHash);
  console.log('💉 Hash de integridad inyectado en el código en memoria de electron/main.js');

  // 3. Ofuscar el código usando javascript-obfuscator
  console.log('⚙️  Ofuscando electron/main.js con javascript-obfuscator...');
  const JavaScriptObfuscator = require('javascript-obfuscator');
  const obfuscatedResult = JavaScriptObfuscator.obfuscate(mainJsContent, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.6,
    numbersToExpressions: true,
    simplify: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    splitStrings: true,
    splitStringsChunkLength: 8,
    unicodeEscapeSequence: false
  });
  
  fs.writeFileSync(MAIN_JS_PATH, obfuscatedResult.getObfuscatedCode(), 'utf8');
  console.log('✅ Código ofuscado escrito exitosamente en electron/main.js');

  // Determinar comandos de empaquetamiento a ejecutar
  let builderCmd = '';
  if (target === '--win') {
    builderCmd = './node_modules/.bin/electron-builder --win';
  } else if (target === '--mac') {
    builderCmd = './node_modules/.bin/electron-builder --mac --universal';
  } else if (target === '--all') {
    builderCmd = './node_modules/.bin/electron-builder --mac --universal && ./node_modules/.bin/electron-builder --win';
  }

  console.log(`📦 Ejecutando empaquetador: ${builderCmd}...`);
  execSync(builderCmd, { cwd: ROOT, stdio: 'inherit' });
  console.log('🎉 ¡Empaquetamiento completado exitosamente!');
  success = true;
} catch (error) {
  console.error('❌ Error durante el proceso de empaquetado protegido:', error.message);
} finally {
  console.log('');
  console.log('🧹 Limpiando y restaurando archivos...');

  // Restaurar el archivo original main.js
  if (fs.existsSync(BACKUP_MAIN_JS_PATH)) {
    try {
      fs.copyFileSync(BACKUP_MAIN_JS_PATH, MAIN_JS_PATH);
      fs.unlinkSync(BACKUP_MAIN_JS_PATH);
      console.log('🔄 Archivo original electron/main.js restaurado para desarrollo.');
    } catch (e) {
      console.error('❌ Error al restaurar el archivo original:', e.message);
    }
  }

  console.log('==================================================');
  console.log('');

  if (!success) {
    process.exit(1);
  }
}
