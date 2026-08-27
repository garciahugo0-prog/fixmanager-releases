/**
 * Utility functions for local-first database synchronization and schema migrations.
 */

/**
 * Generates a standard RFC4122 v4 UUID.
 * Fallback to Math.random if crypto.randomUUID is not available in the environment.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import { isRechargeSale } from './folioUtils';

/**
 * Automatically normalizes legacy sales records in fixmanager_sales
 * by properly setting explicit isRecharge boolean property.
 * This guarantees historical records created before modular sub-tabs
 * are cleanly separated in Ventas, Recargas, and Chips SIM views.
 */
export function normalizeLegacySalesData(): number {
  const raw = localStorage.getItem('fixmanager_sales');
  if (!raw) return 0;

  try {
    const sales = JSON.parse(raw);
    if (!Array.isArray(sales)) return 0;

    let modified = 0;
    const normalized = sales.map((sale: any) => {
      if (!sale || typeof sale !== 'object') return sale;

      // Detect if it is a recharge using robust criteria
      const isRec = isRechargeSale(sale);
      if (sale.isRecharge !== isRec) {
        sale.isRecharge = isRec;
        modified++;
      }
      return sale;
    });

    if (modified > 0) {
      localStorage.setItem('fixmanager_sales', JSON.stringify(normalized));
      console.log(`[Migration] Se normalizaron ${modified} registros de ventas/recargas históricos en fixmanager_sales.`);
    }
    return modified;
  } catch (e) {
    console.error('[Migration] Error al normalizar registros históricos de ventas:', e);
    return 0;
  }
}

/**
 * Migrates existing localStorage records (which only have short IDs like TKT-0001)
 * to include UUIDs and timestamps for synchronization, preventing data loss.
 */
export function migrateLocalDataToUUIDs() {
  console.log('[Migration] Iniciando comprobación de migración a UUIDs para sincronización...');

  // Also normalize legacy sales records
  normalizeLegacySalesData();

  const tablesToMigrate = [
    { key: 'fixmanager_orders', name: 'Órdenes' },
    { key: 'fixmanager_inventory', name: 'Inventario' },
    { key: 'fixmanager_refacciones', name: 'Refacciones' },
    { key: 'fixmanager_clients', name: 'Clientes' },
    { key: 'fixmanager_sales', name: 'Ventas' },
    { key: 'fixmanager_expenses', name: 'Gastos' },
    { key: 'fixmanager_users', name: 'Usuarios/Empleados' },
    { key: 'fixmanager_services', name: 'Servicios' },
    { key: 'fixmanager_donors', name: 'Donantes' },
    { key: 'fixmanager_quotes', name: 'Cotizaciones' },
    { key: 'fixmanager_credit_accounts', name: 'Fiados/Créditos' },
    { key: 'fixmanager_apartados', name: 'Apartados' }
  ];

  let migratedCount = 0;

  for (const table of tablesToMigrate) {
    const raw = localStorage.getItem(table.key);
    if (!raw) continue;

    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;

      let changed = false;
      const updatedItems = items.map((item: any) => {
        if (item && typeof item === 'object') {
          // Si no tiene uuid, le generamos uno
          if (!item.uuid) {
            item.uuid = generateUUID();
            changed = true;
          }
          // Si no tiene timestamps de sincronización, los inicializamos
          if (!item.createdAt) {
            item.createdAt = new Date().toISOString();
            changed = true;
          }
          if (!item.updatedAt) {
            item.updatedAt = item.createdAt || new Date().toISOString();
            changed = true;
          }
        }
        return item;
      });

      if (changed) {
        localStorage.setItem(table.key, JSON.stringify(updatedItems));
        console.log(`[Migration] Tabla "${table.name}" migrada con éxito.`);
        migratedCount++;
      }
    } catch (e) {
      console.error(`[Migration] Error al migrar la tabla ${table.key}:`, e);
    }
  }

  if (migratedCount > 0) {
    console.log(`[Migration] Migración terminada. ${migratedCount} tabla(s) actualizada(s).`);
  } else {
    console.log('[Migration] No se requirieron migraciones. Todo está al día.');
  }
}
