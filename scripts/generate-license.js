#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║       FIXMANAGER — GENERADOR DE LICENCIAS               ║
 * ║       Uso exclusivo del desarrollador (Hugo García)          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * USO:
 *   node scripts/generate-license.js <machineId> <tipo> [expiración] [nombre]
 *
 * ARGUMENTOS:
 *   machineId    — ID de 16 chars que el cliente ve en su app (ej: A3F89C21BB417D02)
 *   tipo         — PRO | BASICA | VITALICIA
 *   expiración   — PERPETUA (default) | fecha en formato AAAAMMDD (ej: 20271231)
 *   nombre       — Nombre del titular, opcional (entre comillas si tiene espacios)
 *
 * EJEMPLOS:
 *   node scripts/generate-license.js A3F89C21BB417D02 PRO
 *   node scripts/generate-license.js A3F89C21BB417D02 BASICA 20261231 "Taller El Norte"
 *   node scripts/generate-license.js A3F89C21BB417D02 VITALICIA PERPETUA "Hugo Taller"
 *
 * NOTAS DE SEGURIDAD:
 *   - NUNCA compartas este script ni el SECRET con clientes
 *   - Guarda un registro local de a quién emitiste cada clave
 *   - Este script debe correr SOLO en tu máquina de desarrollo
 */

'use strict';

const crypto = require('crypto');

// ⚠ SECRETO — NUNCA exponer al renderer/cliente
const _LICENSE_SECRET = 'SM4RTEC_T4LL3R_L1C3NC14_K3Y_2025_PR1M3_SIGMA';

const VALID_TYPES = ['PRO', 'BASICA', 'VITALICIA'];

function buildLicenseKey(machineId, type, expiry) {
  const payload = `${machineId}|${type}|${expiry}`;
  const h = crypto
    .createHmac('sha256', _LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return `SMTC-${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}-${h.slice(12,16)}`;
}

function validateDate(dateStr) {
  if (!dateStr || dateStr === 'PERPETUA') return true;
  if (!/^\d{8}$/.test(dateStr)) return false;
  const y = parseInt(dateStr.slice(0,4));
  const m = parseInt(dateStr.slice(4,6));
  const d = parseInt(dateStr.slice(6,8));
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
  console.log('\n  USO:');
  console.log('    node scripts/generate-license.js <machineId> <tipo> [expiración] [nombre]\n');
  console.log('  TIPOS VÁLIDOS:');
  console.log('    PRO        — Acceso completo a todas las funciones');
  console.log('    BASICA     — Funciones esenciales del taller');
  console.log('    VITALICIA  — PRO sin fecha de vencimiento (premium)\n');
  console.log('  EXPIRACIÓN:');
  console.log('    PERPETUA   — Sin fecha límite (default)');
  console.log('    AAAAMMDD   — Fecha límite, ej: 20271231 = 31 dic 2027\n');
  console.log('  EJEMPLOS:');
  console.log('    node scripts/generate-license.js A3F89C21BB417D02 PRO');
  console.log('    node scripts/generate-license.js A3F89C21BB417D02 BASICA 20261231 "Taller El Norte"');
  process.exit(0);
}

const machineId = (args[0] || '').trim().toUpperCase();
const type      = (args[1] || '').trim().toUpperCase();
const expiry    = (args[2] || 'PERPETUA').trim().toUpperCase();
const owner     = (args[3] || '').trim();

// Validaciones
if (!machineId || machineId.length !== 16) {
  console.error('\n  ❌ ERROR: El machineId debe tener exactamente 16 caracteres.');
  console.error('     El cliente lo puede ver en su app → menú Licencia → "ID de Instalación"\n');
  process.exit(1);
}

if (!VALID_TYPES.includes(type)) {
  console.error(`\n  ❌ ERROR: Tipo inválido "${type}". Usa: ${VALID_TYPES.join(' | ')}\n`);
  process.exit(1);
}

if (!validateDate(expiry)) {
  console.error(`\n  ❌ ERROR: Fecha de expiración inválida "${expiry}". Usa PERPETUA o formato AAAAMMDD (ej: 20271231)\n`);
  process.exit(1);
}

const key = buildLicenseKey(machineId, type, expiry);

// Mostrar resultado
console.log('\n' + '═'.repeat(60));
console.log('  ✅  CLAVE DE LICENCIA GENERADA — FIXMANAGER');
console.log('═'.repeat(60));
console.log(`\n  Clave:        ${key}`);
console.log(`  Tipo:         ${type}`);
console.log(`  Expiración:   ${expiry === 'PERPETUA' ? 'Sin fecha límite (Perpetua)' : `${expiry.slice(0,4)}-${expiry.slice(4,6)}-${expiry.slice(6,8)}`}`);
console.log(`  Machine ID:   ${machineId}`);
if (owner) console.log(`  Titular:      ${owner}`);
console.log(`  Generada:     ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`);
console.log('\n' + '─'.repeat(60));
console.log('  📤 Envía al cliente:');
console.log(`\n     Clave:  ${key}`);
console.log(`     Tipo:   ${type}`);
if (expiry !== 'PERPETUA') console.log(`     Expira: ${expiry.slice(0,4)}-${expiry.slice(4,6)}-${expiry.slice(6,8)}`);
console.log('\n' + '═'.repeat(60) + '\n');
