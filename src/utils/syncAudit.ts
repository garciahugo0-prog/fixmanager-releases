import { supabase } from '../supabase';
import { generateUUID } from './syncUtils';

export interface AuditResult {
  ok: boolean;
  timestamp: string;
  connection: {
    online: boolean;
    latencyMs?: number;
    error?: string;
  };
  sessionUserEmail?: string | null;
  tables: Record<string, {
    count: number;
    dirtyCount: number;
    missingUuidCount: number;
    collisions: string[];
  }>;
  totalIssues: number;
  warnings: string[];
}

const STORAGE_KEYS = [
  'fixmanager_orders',
  'fixmanager_inventory',
  'fixmanager_refacciones',
  'fixmanager_clients',
  'fixmanager_sales',
  'fixmanager_expenses',
  'fixmanager_cortes',
  'fixmanager_users',
  'fixmanager_services',
  'fixmanager_donors',
  'fixmanager_quotes',
  'fixmanager_credit_accounts',
  'fixmanager_apartados'
];

/**
 * Runs a complete head-to-toe sync diagnostic check.
 */
export async function runSyncAudit(): Promise<AuditResult> {
  const result: AuditResult = {
    ok: true,
    timestamp: new Date().toISOString(),
    connection: { online: false },
    tables: {},
    totalIssues: 0,
    warnings: []
  };

  // 1. Connection check
  const start = Date.now();
  let sessionUserEmail: string | null = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (sessionData?.session?.user?.email) {
      sessionUserEmail = sessionData.session.user.email;
    }
  } catch (_) {}

  result.sessionUserEmail = sessionUserEmail;

  try {
    const { error } = await supabase.from('config_sync').select('count', { count: 'exact', head: true }).limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    result.connection.online = true;
    result.connection.latencyMs = Date.now() - start;

    if (!sessionUserEmail) {
      result.ok = false;
      result.warnings.push('⚠️ No se detectó una sesión de usuario activa en la nube. Ve a la pestaña de Ajustes del Sistema y verifica tu inicio de sesión.');
    }
  } catch (err: any) {
    result.connection.online = false;
    result.connection.error = err?.message || JSON.stringify(err);
    result.warnings.push(`No se pudo conectar a la base de datos en la nube (Supabase): ${result.connection.error}`);
  }

  // 2. Head-to-toe table check
  for (const key of STORAGE_KEYS) {
    let items: any[] = [];
    try {
      const raw = localStorage.getItem(key);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) {
        items = [];
      }
    } catch (e: any) {
      result.tables[key] = {
        count: 0,
        dirtyCount: 0,
        missingUuidCount: 0,
        collisions: []
      };
      result.totalIssues++;
      result.warnings.push(`La tabla local "${key}" tiene JSON corrupto y no se pudo leer.`);
      continue;
    }

    const collisions: string[] = [];
    let dirtyCount = 0;
    let missingUuidCount = 0;
    const idSet = new Set<string>();

    for (const item of items) {
      if (!item) continue;

      // Check dirty flag
      if (item.dirty === true) {
        dirtyCount++;
      }

      // Check UUID presence
      if (!item.uuid) {
        missingUuidCount++;
      }

      // Check Folio / Business ID collisions (specifically for orders and sales)
      if (key === 'fixmanager_orders' || key === 'fixmanager_sales') {
        const id = item.id ? String(item.id).trim().toUpperCase() : '';
        if (id) {
          if (idSet.has(id)) {
            collisions.push(id);
          } else {
            idSet.add(id);
          }
        }
      }
    }

    result.tables[key] = {
      count: items.length,
      dirtyCount,
      missingUuidCount,
      collisions
    };

    result.totalIssues += missingUuidCount + collisions.length;

    if (missingUuidCount > 0) {
      result.warnings.push(`Tabla "${key}": Se encontraron ${missingUuidCount} registros sin identificador único de sincronización (UUID).`);
    }
    if (collisions.length > 0) {
      result.warnings.push(`Tabla "${key}": Se detectaron ${collisions.length} folios duplicados (colisiones): ${collisions.join(', ')}.`);
    }
  }

  result.ok = result.totalIssues === 0;
  return result;
}

/**
 * Automatically repairs issues like missing UUIDs and deduplicates entries.
 */
export function repairSyncIssues(): { fixedUuids: number; resolvedCollisions: number } {
  let fixedUuids = 0;
  let resolvedCollisions = 0;

  for (const key of STORAGE_KEYS) {
    let items: any[] = [];
    try {
      const raw = localStorage.getItem(key);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) continue;
    } catch (_) {
      continue;
    }

    let changed = false;
    const idSet = new Set<string>();
    const cleanedItems: any[] = [];

    for (const item of items) {
      if (!item) continue;

      // 1. Repair missing UUIDs
      if (!item.uuid) {
        item.uuid = generateUUID();
        item.dirty = true; // Mark as dirty so it syncs up
        fixedUuids++;
        changed = true;
      }

      // 2. Repair Folio / Business ID collisions (orders and sales)
      if (key === 'fixmanager_orders' || key === 'fixmanager_sales') {
        const id = item.id ? String(item.id).trim().toUpperCase() : '';
        if (id) {
          if (idSet.has(id)) {
            // Collision found! Generate a safe suffix to resolve collision
            const timestamp = new Date().getTime().toString().slice(-4);
            const separator = id.includes('-') ? '-' : '';
            const newId = `${id}${separator}DUP${timestamp}`;
            item.id = newId;
            item.dirty = true;
            resolvedCollisions++;
            changed = true;
          }
          idSet.add(item.id.trim().toUpperCase());
        }
      }

      cleanedItems.push(item);
    }

    if (changed) {
      localStorage.setItem(key, JSON.stringify(cleanedItems));
    }
  }

  return { fixedUuids, resolvedCollisions };
}
