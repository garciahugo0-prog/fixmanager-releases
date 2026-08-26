#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────
//  FixManager — Incrementar versión
//  Uso: npm run version:bump
// ──────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const rl   = require('readline').createInterface({ input: process.stdin, output: process.stdout });

const ROOT    = path.join(__dirname, '..');
const PKG     = path.join(ROOT, 'package.json');
const MAIN    = path.join(ROOT, 'electron', 'main.js');

const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};

const ask = (q) => new Promise(res => rl.question(q, res));

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === '1') return `${major + 1}.0.0`;
  if (type === '2') return `${major}.${minor + 1}.0`;
  if (type === '3') return `${major}.${minor}.${patch + 1}`;
  return null;
}

async function main() {
  console.log('');
  console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
  console.log(`${C.cyan}${C.bold}   FIXMANAGER — Actualizar Versión            ${C.reset}`);
  console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────${C.reset}`);
  console.log('');

  const pkg     = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const current = pkg.version;

  console.log(`${C.cyan}Versión actual: ${C.bold}${current}${C.reset}`);
  console.log('');
  console.log(`  1) Mayor  → cambio grande o incompatible  (ej. ${current.split('.')[0]*1+1}.0.0)`);
  console.log(`  2) Menor  → función nueva                 (ej. ${current.split('.')[0]}.${current.split('.')[1]*1+1}.0)`);
  console.log(`  3) Parche → corrección o ajuste pequeño   (ej. ${current.split('.')[0]}.${current.split('.')[1]}.${current.split('.')[2]*1+1})`);
  console.log('');

  const type = await ask(`${C.yellow}¿Qué tipo de cambio es? (1/2/3): ${C.reset}`);

  const newVersion = bumpVersion(current, type.trim());
  if (!newVersion) {
    console.log(`${C.yellow}Opción inválida, cancelando.${C.reset}`);
    rl.close();
    return;
  }

  console.log('');
  console.log(`${C.green}Nueva versión: ${C.bold}${newVersion}${C.reset}`);
  const confirm = await ask(`¿Confirmas? (s/n): `);

  if (confirm.trim().toLowerCase() !== 's') {
    console.log(`${C.yellow}Cancelado.${C.reset}`);
    rl.close();
    return;
  }

  // Generar notas automáticas con fecha
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const notes = `FixManager v${newVersion} — ${fecha}`;

  // Actualizar package.json
  pkg.version = newVersion;
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');

  // Actualizar electron/main.js
  let main = fs.readFileSync(MAIN, 'utf8');
  main = main.replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${newVersion}';`);
  fs.writeFileSync(MAIN, main);

  // Guardar notas para que publish-release.sh las use automáticamente
  const notesText = notes.trim() || `FixManager v${newVersion}`;
  fs.writeFileSync(path.join(ROOT, '.release-notes'), notesText);

  console.log('');
  console.log(`${C.green}✅ Versión actualizada a ${C.bold}${newVersion}${C.reset}`);
  console.log(`${C.cyan}   • package.json${C.reset}`);
  console.log(`${C.cyan}   • electron/main.js${C.reset}`);
  console.log(`${C.cyan}   • .release-notes${C.reset}`);
  console.log('');
  console.log(`${C.cyan}Siguiente paso: ${C.bold}npm run build:all${C.reset}`);
  console.log('');

  rl.close();
}

main();
