/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { supabase } from '../supabase';
import { generateUUID } from './syncUtils';
import { getNetworkStatusSync } from './networkStatus';
import {
  RepairOrder,
  InventoryItem,
  RefaccionItem,
  Client,
  Expense,
  Sale,
  CorteEntry,
  AppUser,
  ServicePrice,
  DonorDevice,
  Quote,
  WorkshopConfig,
  CreditAccount,
  ApartadoEntry,
  ChipActivation
} from '../types';

interface SyncConfig {
  tableName: string;
  storageKey: string;
  mapToDbRow: (item: any, userId: string) => any;
}

// Configuración de mapeo para las 11 tablas principales
const TABLE_SYNC_CONFIGS: SyncConfig[] = [
  {
    tableName: 'orders_sync',
    storageKey: 'fixmanager_orders',
    mapToDbRow: (item: RepairOrder, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      folio: item.id,
      client_name: item.customerName,
      client_phone: item.customerPhone,
      device_brand: item.deviceBrand,
      device_model: item.deviceModel,
      serial_number: item.deviceModelNumber || '',
      failure_details: item.faultDescription || '',
      estimated_cost: item.cost || 0,
      advance_payment: item.advancePayment || 0,
      status: item.status,
      assigned_tech_id: item.assignedTechnician || '',
      history_json: item.activityLog || [],
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'inventory_sync',
    storageKey: 'fixmanager_inventory',
    mapToDbRow: (item: InventoryItem, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      name: item.name,
      category: item.category || 'Varios',
      code: item.code || '',
      price: item.price || 0,
      cost: item.cost || 0,
      stock: item.stock || 0,
      min_stock: item.minStock || 0,
      manage_stock: item.manageStock !== false,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'refacciones_sync',
    storageKey: 'fixmanager_refacciones',
    mapToDbRow: (item: RefaccionItem, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      code: item.code || '',
      name: item.name,
      brand: item.brand || '',
      device_brand: item.deviceBrand || '',
      device_model: item.deviceModel || '',
      category: item.category || '',
      stock: item.stock || 0,
      min_stock: item.minStock || 0,
      cost: item.cost || 0,
      price: item.price || 0,
      wholesale_price: item.wholesalePrice || 0,
      favorite: item.favorite || false,
      active: item.active !== false,
      manage_stock: item.manageStock !== false,
      image_url: item.imageUrl || '',
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'clients_sync',
    storageKey: 'fixmanager_clients',
    mapToDbRow: (item: Client, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      name: item.name,
      phone: item.phone,
      email: item.email || '',
      notes: '',
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'sales_sync',
    storageKey: 'fixmanager_sales',
    mapToDbRow: (item: Sale, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      ticket_number: item.ticketNumber || item.id,
      client_name: item.clientName || 'Público General',
      total: item.total || 0,
      payment_method: item.paymentMethod || 'Efectivo',
      items_json: item.items || [],
      created_by: item.createdBy || '',
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'expenses_sync',
    storageKey: 'fixmanager_expenses',
    mapToDbRow: (item: Expense, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      amount: item.amount || 0,
      type: ['Inyección', 'Inicial', 'Ajuste'].includes(item.category) ? 'ingreso' : 'egreso',
      concept: item.description || '',
      created_by: '',
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'cortes_sync',
    storageKey: 'fixmanager_cortes',
    mapToDbRow: (item: CorteEntry, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      apertura_timestamp: item.aperturaTimestamp || item.createdAt || new Date().toISOString(),
      cierre_timestamp: item.cierreTimestamp || new Date().toISOString(),
      saldo_inicial: item.saldoInicial || 0,
      ingresos: item.ingresos || 0,
      egresos: item.egresos || 0,
      saldo_final: item.saldoFinal || 0,
      diferencia: item.diferencia || 0,
      created_by: item.createdBy || '',
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'app_users_sync',
    storageKey: 'fixmanager_users',
    mapToDbRow: (item: AppUser, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      name: item.name,
      role: item.role || 'tecnico',
      pin: item.pin,
      permissions: item.permissions || {},
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'services_sync',
    storageKey: 'fixmanager_services',
    mapToDbRow: (item: ServicePrice, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      name: item.name,
      category: item.category || 'General',
      price: item.price || 0,
      cost: item.cost || 0,
      duration_minutes: item.durationMinutes || 0,
      popularity: item.popularity || 1,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'donors_sync',
    storageKey: 'fixmanager_donors',
    mapToDbRow: (item: DonorDevice, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      brand: item.brand,
      model: item.model,
      color: item.color || '',
      notes: item.notes || '',
      parts_json: item.parts || [],
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'quotes_sync',
    storageKey: 'fixmanager_quotes',
    mapToDbRow: (item: Quote, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      client_name: item.customerName,
      client_phone: item.customerPhone || '',
      device_brand: item.devices?.[0]?.deviceBrand || '',
      device_model: item.devices?.[0]?.deviceModel || '',
      failure_details: item.devices?.[0]?.faultDescription || '',
      estimated_cost: item.devices?.[0]?.estimatedCost || 0,
      valid_until: item.validUntil || null,
      status: item.status,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'credit_accounts_sync',
    storageKey: 'fixmanager_credit_accounts',
    mapToDbRow: (item: CreditAccount, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      client_name: item.clientName,
      client_phone: item.clientPhone,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'apartados_sync',
    storageKey: 'fixmanager_apartados',
    mapToDbRow: (item: ApartadoEntry, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      client_name: item.clientName,
      client_phone: item.clientPhone || '',
      total_value: item.totalValue || 0,
      status: item.status,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  },
  {
    tableName: 'chip_activations_sync',
    storageKey: 'fixmanager_chip_activations',
    mapToDbRow: (item: ChipActivation, userId: string) => ({
      id: item.uuid || generateUUID(),
      user_id: userId,
      chip_number: item.chipNumber,
      client_name: item.clientName || 'Público General',
      carrier: item.carrier || 'Genérico',
      iccid: item.iccid || '',
      imei: item.imei || '',
      price: item.price || 0,
      deleted_at: item.deletedAt || null,
      payload_json: item
    })
  }
];

/**
 * Motor de Sincronización Bidireccional
 */
export async function syncDataWithCloud(
  userId: string,
  onUpdateState?: (key: string, data: any) => void
): Promise<{ success: boolean; message: string }> {
  if (!getNetworkStatusSync()) {
    return { success: false, message: 'Dispositivo sin conexión a internet.' };
  }

  const debugLog = (msg: string) => {
    if (typeof window !== 'undefined' && (window as any).addDebugLog) {
      (window as any).addDebugLog(msg);
    } else {
      console.log('[SYNC_DEBUG]', msg);
    }
  };

  try {
    const currentSyncTime = new Date().toISOString();
    debugLog('Iniciando ciclo de sincronización para el usuario: ' + userId);

    // ==========================================
    // PARTE 1: SINCRONIZAR CONFIGURACIÓN (config_sync)
    // ==========================================
    try {
      const configSyncKey = `fixmanager_last_sync_${userId}_config_sync`;
      const lastSyncTime = localStorage.getItem(configSyncKey) || '1970-01-01T00:00:00.000Z';

      const localConfigRaw = localStorage.getItem('fixmanager_config');
      const localConfig: WorkshopConfig | null = localConfigRaw ? JSON.parse(localConfigRaw) : null;

      // PULL Config (solo traer updated_at primero para ahorrar ancho de banda egress)
      const { data: cloudConfigHead, error: configHeadError } = await supabase
        .from('config_sync')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (configHeadError) throw configHeadError;

      const cloudConfigExists = !!cloudConfigHead;
      const cloudUpdatedAt = cloudConfigHead?.updated_at || '1970-01-01T00:00:00.000Z';

      let cloudConfigRow = null;
      if (cloudConfigExists && new Date(cloudUpdatedAt) > new Date(lastSyncTime)) {
        // Descargar la fila completa solo si realmente hay cambios en la nube
        const { data: fullRow, error: configError } = await supabase
          .from('config_sync')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (configError) throw configError;
        cloudConfigRow = fullRow;
      }

      let configToSave = localConfig;
      let success = true;
      let forcePush = false;

      if (cloudConfigRow && localConfig) {
        const cloudConfig: WorkshopConfig = cloudConfigRow.config_json;
        const cloudLocalConfigUpdatedAt = cloudConfig.updatedAt || '1970-01-01T00:00:00.000Z';
        const localUpdatedAt = localConfig.updatedAt || '1970-01-01T00:00:00.000Z';

        const localModels = localConfig.customDeviceModels || [];
        const cloudModels = cloudConfig.customDeviceModels || [];

        const localOnly = localModels.filter(lm => !cloudModels.some(cm => cm.brand?.toUpperCase() === lm.brand?.toUpperCase() && cm.model?.toUpperCase() === lm.model?.toUpperCase()));
        const cloudOnly = cloudModels.filter(cm => !localModels.some(lm => lm.brand?.toUpperCase() === cm.brand?.toUpperCase() && lm.model?.toUpperCase() === cm.model?.toUpperCase()));

        // Fusionar debugLogs de diferentes dispositivos de forma no destructiva (por longitud de logs)
        const localLogs = typeof localConfig.debugLogs === 'object' && localConfig.debugLogs !== null && !Array.isArray(localConfig.debugLogs) ? localConfig.debugLogs : {};
        const cloudLogs = typeof cloudConfig.debugLogs === 'object' && cloudConfig.debugLogs !== null && !Array.isArray(cloudConfig.debugLogs) ? cloudConfig.debugLogs : {};
        let logsChanged = false;
        const mergedLogs = { ...localLogs };
        
        const allLogKeys = new Set([...Object.keys(localLogs), ...Object.keys(cloudLogs)]);
        allLogKeys.forEach(key => {
          const localArr = Array.isArray(localLogs[key]) ? localLogs[key] : [];
          const cloudArr = Array.isArray(cloudLogs[key]) ? cloudLogs[key] : [];
          
          if (cloudArr.length > localArr.length) {
            // La nube tiene más logs, actualizar local
            mergedLogs[key] = cloudArr;
            logsChanged = true;
          } else if (localArr.length > cloudArr.length) {
            // El local tiene más logs, marcar como modificado para forzar subida a la nube
            mergedLogs[key] = localArr;
            logsChanged = true;
          }
        });

        const mergedModels = [...localModels];
        let modelsChanged = false;
        if (localOnly.length > 0 || cloudOnly.length > 0) {
          cloudOnly.forEach(cm => mergedModels.push(cm));
          modelsChanged = true;
        }

        // Determinar qué hacer según marcas de tiempo de configuración de usuario
        if (new Date(cloudLocalConfigUpdatedAt) > new Date(localUpdatedAt)) {
          // La nube es la fuente de verdad (el usuario editó en otro dispositivo)
          // Tomar configuración de la nube, pero preservando el estilo de tema local y los logs fusionados
          configToSave = { 
            ...cloudConfig, 
            theme: localConfig.theme, // Preservar estilo de tema local
            customDeviceModels: modelsChanged ? mergedModels : cloudConfig.customDeviceModels,
            debugLogs: mergedLogs,
            updatedAt: cloudLocalConfigUpdatedAt 
          };
          localStorage.setItem('fixmanager_config', JSON.stringify(configToSave));
          if (onUpdateState) onUpdateState('fixmanager_config', configToSave);
          console.log('[SyncEngine] Configuración descargada (Ajustes de tema local y logs fusionados preservados).');
          
          // Si fusionamos modelos o logs locales nuevos, debemos subirlos para no perderlos,
          // pero SIN cambiar el updatedAt de la nube para no invalidar el cambio del otro dispositivo.
          if (modelsChanged || logsChanged) {
            forcePush = true;
          }
        } else if (new Date(localUpdatedAt) > new Date(cloudLocalConfigUpdatedAt)) {
          // El local es la fuente de verdad (el usuario editó en este dispositivo)
          localConfig.debugLogs = mergedLogs;
          if (modelsChanged) {
            localConfig.customDeviceModels = mergedModels;
          }
          configToSave = localConfig;
          forcePush = true;
          console.log('[SyncEngine] Configuración local más reciente. Subiendo cambios a la nube.');
        } else {
          // Son iguales (ninguno fue editado por el usuario, solo discrepancias de fondo como logs o modelos)
          if (modelsChanged || logsChanged) {
            const updated = {
              ...localConfig,
              customDeviceModels: mergedModels,
              debugLogs: mergedLogs
            };
            configToSave = updated;
            localStorage.setItem('fixmanager_config', JSON.stringify(updated));
            if (onUpdateState) onUpdateState('fixmanager_config', updated);
            forcePush = true;
            console.log('[SyncEngine] Sincronización de fondo realizada (logs/modelos fusionados, marcas de tiempo sin alterar).');
          }
        }
      } else if (cloudConfigRow && localConfig) {
        const cloudConfig: WorkshopConfig = cloudConfigRow.config_json;
        const cloudLocalConfigUpdatedAt = cloudConfig.updatedAt || cloudConfigRow.updated_at;
        configToSave = { 
          ...cloudConfig, 
          theme: localConfig.theme, // Preservar estilo de tema local (Ej. retro-window o modern)
          updatedAt: cloudLocalConfigUpdatedAt 
        };
        localStorage.setItem('fixmanager_config', JSON.stringify(configToSave));
        if (onUpdateState) onUpdateState('fixmanager_config', configToSave);
        console.log('[SyncEngine] Configuración inicial tomada de la nube (Estilo de tema local preservado).');
      } else if (cloudConfigRow) {
        const cloudConfig: WorkshopConfig = cloudConfigRow.config_json;
        const cloudLocalConfigUpdatedAt = cloudConfig.updatedAt || cloudConfigRow.updated_at;
        configToSave = { ...cloudConfig, updatedAt: cloudLocalConfigUpdatedAt };
        localStorage.setItem('fixmanager_config', JSON.stringify(configToSave));
        if (onUpdateState) onUpdateState('fixmanager_config', configToSave);
        console.log('[SyncEngine] Configuración inicial tomada de la nube.');
      }

      // PUSH Config si local fue editada (comparamos con el updatedAt del cliente en la nube)
      const cloudLocalConfigUpdatedAt = cloudConfigExists ? cloudUpdatedAt : '1970-01-01T00:00:00.000Z';
      if (configToSave && (forcePush || !cloudConfigExists || new Date(configToSave.updatedAt || '1970-01-01T00:00:00.000Z') > new Date(cloudLocalConfigUpdatedAt))) {
        const { error: pushConfigErr } = await supabase
          .from('config_sync')
          .upsert({
            user_id: userId,
            config_json: configToSave,
            updated_at: configToSave.updatedAt || currentSyncTime
          }, { onConflict: 'user_id' });

        if (pushConfigErr) {
          success = false;
          throw pushConfigErr;
        }
        console.log('[SyncEngine] Configuración local subida a la nube.');
      }

      if (success) {
        localStorage.setItem(configSyncKey, currentSyncTime);
      }
    } catch (err: any) {
      console.error('[SyncEngine] Error al sincronizar config_sync:', err);
      if (err && typeof err === 'object') {
        (window as any).addDebugLog?.(`[Sync] Error en config_sync: ${err.message || JSON.stringify(err)} | Detalles: ${err.details || ''}`);
      } else {
        (window as any).addDebugLog?.(`[Sync] Error en config_sync: ${err}`);
      }
    }

    // ==========================================
    // PARTE 2: SINCRONIZAR LAS OTRAS 13 TABLAS
    // ==========================================
    for (const conf of TABLE_SYNC_CONFIGS) {
      if (!getNetworkStatusSync()) {
        throw new Error('Conexión a internet perdida durante la sincronización.');
      }
      try {
        const tableSyncKey = `fixmanager_last_sync_${userId}_${conf.tableName}`;
        const lastSyncTime = localStorage.getItem(tableSyncKey) || '1970-01-01T00:00:00.000Z';

        debugLog(`Tabla ${conf.tableName}: start. lastSyncTime=${lastSyncTime}`);

        // 1. PULL: Descargar modificaciones de la nube
        const { data: cloudRows, error: pullError } = await supabase
          .from(conf.tableName)
          .select('*')
          .eq('user_id', userId)
          .gt('updated_at', lastSyncTime);

        if (pullError) throw pullError;

        if (conf.tableName === 'orders_sync') {
          debugLog(`orders_sync pull: fetched ${cloudRows?.length || 0} rows from cloud.`);
        }

        const localItemsRaw = localStorage.getItem(conf.storageKey);
        let localItems: any[] = localItemsRaw ? JSON.parse(localItemsRaw) : [];

        let localChanged = false;

        // 0. Asegurar metadatos de sincronización para registros legados (sin uuid)
        let legacyMigrated = false;
        localItems = localItems.map(item => {
          if (item && !item.uuid) {
            legacyMigrated = true;
            return {
              ...item,
              uuid: generateUUID(),
              updatedAt: item.updatedAt || new Date().toISOString(),
              dirty: true
            };
          }
          return item;
        });
        if (legacyMigrated) {
          localStorage.setItem(conf.storageKey, JSON.stringify(localItems));
          if (onUpdateState) onUpdateState(conf.storageKey, localItems);
        }

        // Autolimpieza de duplicados locales basados en el ID de negocio
        const seenIds = new Set<string>();
        const uniqueLocals: any[] = [];
        localItems.forEach(item => {
          if (item && item.id) {
            const strId = String(item.id);
            if (!seenIds.has(strId)) {
              seenIds.add(strId);
              uniqueLocals.push(item);
            } else {
              localChanged = true;
            }
          } else {
            uniqueLocals.push(item);
          }
        });
        localItems = uniqueLocals;

        if (cloudRows && cloudRows.length > 0) {
          debugLog(`Recibidos ${cloudRows.length} registros para ${conf.tableName}`);

          cloudRows.forEach(row => {
            const cloudPayload = row.payload_json;
            if (!cloudPayload) return;

            // Asegurar que conserve timestamps correctos de Supabase (usamos el client-side updatedAt)
            const cloudObj = {
              ...cloudPayload,
              uuid: row.id,
              updatedAt: cloudPayload.updatedAt || row.updated_at,
              deletedAt: row.deleted_at
            };

            // Buscar por UUID o por ID de negocio
            const idx = localItems.findIndex(item => 
              item.uuid === row.id || 
              (item.id && cloudPayload.id && String(item.id) === String(cloudPayload.id))
            );

            // Verificar si este registro está en la lista de eliminaciones locales pendientes
            const deletedKey = `${conf.storageKey}_deleted`;
            const deletedRaw = localStorage.getItem(deletedKey);
            let isLocallyDeletedPending = false;
            try {
              if (deletedRaw) {
                isLocallyDeletedPending = JSON.parse(deletedRaw).some((x: any) => x.uuid === row.id);
              }
            } catch (_) {}

            if (row.deleted_at) {
              // Soft delete: Si está borrado en la nube, quitar de local
              if (idx !== -1) {
                localItems.splice(idx, 1);
                localChanged = true;
              }
            } else if (isLocallyDeletedPending) {
              // Si está eliminado localmente de forma pendiente, no volver a jalarlo
              if (idx !== -1) {
                localItems.splice(idx, 1);
                localChanged = true;
              }
            } else {
              if (idx !== -1) {
                // Existe en local. Aseguramos alineación de UUIDs
                if (localItems[idx].uuid !== row.id) {
                  localItems[idx].uuid = row.id;
                  localChanged = true;
                }
                const isDirty = localItems[idx].dirty === true;
                const localUpdatedAt = localItems[idx].updatedAt || '1970-01-01T00:00:00.000Z';
                const cloudDbUpdatedAt = row.updated_at || '1970-01-01T00:00:00.000Z';
                const isCloudNewer = !isDirty && (new Date(cloudDbUpdatedAt) > new Date(localUpdatedAt));
                
                if (conf.tableName === 'orders_sync' && row.folio === 'TKT-0005') {
                  debugLog(`PULL TKT-0005: cloudDbUpdatedAt=${cloudDbUpdatedAt}, localUpdatedAt=${localUpdatedAt}, isDirty=${isDirty}, isCloudNewer=${isCloudNewer}, localEvCount=${localItems[idx].evidence?.length || 0}, cloudEvCount=${cloudObj.evidence?.length || 0}`);
                }
                if (isCloudNewer) {
                  if (conf.tableName === 'orders_sync' && row.folio === 'TKT-0005') {
                    debugLog(`PULL TKT-0005: overwriting local with cloud!`);
                  }
                  localItems[idx] = cloudObj;
                  localChanged = true;
                }
              } else {
                // Nuevo registro
                localItems.push(cloudObj);
                localChanged = true;
              }
            }
          });

          if (localChanged) {
            // Volvemos a leer de localStorage para no pisar cambios locales hechos durante la petición asíncrona (como fotos)
            const latestRaw = localStorage.getItem(conf.storageKey);
            let latestLocal: any[] = latestRaw ? JSON.parse(latestRaw) : [];

            localItems.forEach(updatedItem => {
              const lIdx = latestLocal.findIndex(x => x.id === updatedItem.id);
              if (lIdx !== -1) {
                const latestUpdatedAt = latestLocal[lIdx].updatedAt || '1970-01-01T00:00:00.000Z';
                // Comparamos timestamps de cliente para determinar si el cambio local concurrente es más nuevo, o si es dirty
                const isLatestNewer = latestLocal[lIdx].dirty === true || (new Date(latestUpdatedAt) > new Date(updatedItem.updatedAt || '1970-01-01T00:00:00.000Z'));
                if (conf.tableName === 'orders_sync' && updatedItem.id === 'TKT-0005') {
                  debugLog(`PULL MERGE TKT-0005: latestUpdatedAt=${latestUpdatedAt}, isLatestNewer=${isLatestNewer}, latestEvCount=${latestLocal[lIdx].evidence?.length || 0}, updatedItemEvCount=${updatedItem.evidence?.length || 0}`);
                }
                if (!isLatestNewer) {
                  latestLocal[lIdx] = updatedItem;
                }
              } else {
                latestLocal.push(updatedItem);
              }
            });

            // Si un elemento fue borrado en la nube, lo removemos a menos que tenga cambios locales pendientes
            latestLocal = latestLocal.filter(item => {
              const existsInLocalItems = localItems.some(x => x.id === item.id);
              if (!existsInLocalItems) {
                const isPending = item.dirty === true;
                return isPending;
              }
              return true;
            });

            localItems = latestLocal;
            localStorage.setItem(conf.storageKey, JSON.stringify(latestLocal));
            if (onUpdateState) onUpdateState(conf.storageKey, latestLocal);
          }
        }

        // 2. PUSH: Subir modificaciones locales nuevas a la nube leyendo del almacenamiento más fresco
        const pushLocalRaw = localStorage.getItem(conf.storageKey);
        const pushLocalItems: any[] = pushLocalRaw ? JSON.parse(pushLocalRaw) : localItems;

        const modifiedLocals = pushLocalItems.filter(item => {
          const isPending = item.dirty === true;
          if (conf.tableName === 'orders_sync' && item.id === 'TKT-0005') {
            debugLog(`PUSH FILTER TKT-0005: dirty=${item.dirty}, isPending=${isPending}, evCount=${item.evidence?.length || 0}`);
          }
          return isPending;
        });

        if (modifiedLocals.length > 0) {
          debugLog(`Subiendo ${modifiedLocals.length} registros para ${conf.tableName}`);
          if (conf.tableName === 'orders_sync') {
            const hasTKT5 = modifiedLocals.find(x => x.id === 'TKT-0005');
            if (hasTKT5) {
              debugLog(`PUSHING TKT-0005 to Supabase! payload.evidence.length=${hasTKT5.evidence?.length || 0}`);
            }
          }
          const dbRows = modifiedLocals.map(item => conf.mapToDbRow(item, userId));

          const { error: pushError } = await supabase
            .from(conf.tableName)
            .upsert(dbRows);

          if (pushError) throw pushError;

          // Limpiar el flag dirty de los registros subidos con éxito
          const cleanLocalRaw = localStorage.getItem(conf.storageKey);
          if (cleanLocalRaw) {
            let cleanLocalItems: any[] = JSON.parse(cleanLocalRaw);
            cleanLocalItems = cleanLocalItems.map(item => {
              const wasModified = modifiedLocals.some(m => m.id === item.id);
              if (wasModified) {
                return { ...item, dirty: false, updatedAt: new Date().toISOString() };
              }
              return item;
            });
            localStorage.setItem(conf.storageKey, JSON.stringify(cleanLocalItems));
            if (onUpdateState) onUpdateState(conf.storageKey, cleanLocalItems);
          }
        }

        // 2b. PUSH DELETES: Subir eliminaciones locales a la nube
        const deletedKey = `${conf.storageKey}_deleted`;
        const deletedRaw = localStorage.getItem(deletedKey);
        if (deletedRaw) {
          try {
            const deletedItems: { id: string; uuid: string; payload?: any }[] = JSON.parse(deletedRaw);
            if (deletedItems.length > 0) {
              debugLog(`Subiendo ${deletedItems.length} eliminaciones para ${conf.tableName}`);
              
              const deleteDbRows = deletedItems
                .filter(item => {
                  if (!item.payload) {
                    debugLog(`Descartando eliminación antigua sin payload para evitar error 400: ${item.uuid}`);
                    return false;
                  }
                  return true;
                })
                .map(item => {
                  // Mapeamos toda la fila para cumplir con restricciones NOT NULL
                  const mapped = conf.mapToDbRow(item.payload, userId);
                  return {
                    ...mapped,
                    deleted_at: new Date().toISOString()
                  };
                });

              const { error: deletePushError } = await supabase
                .from(conf.tableName)
                .upsert(deleteDbRows);

              if (deletePushError) {
                console.error(`[SyncEngine] Error al subir eliminaciones para ${conf.tableName}:`, deletePushError);
              } else {
                localStorage.setItem(deletedKey, JSON.stringify([]));
              }
            }
          } catch (e) {
            console.error(`[SyncEngine] Fallo al parsear lista de eliminados en ${deletedKey}:`, e);
          }
        }

        // Solo actualizar el timestamp si la sincronización de esta tabla completó sin excepciones.
        // Restamos 5 segundos de margen de seguridad para no perder cambios concurrentes que ocurran durante este ciclo.
        const safeSyncTime = new Date(new Date(currentSyncTime).getTime() - 5000).toISOString();
        localStorage.setItem(tableSyncKey, safeSyncTime);
        debugLog(`Tabla ${conf.tableName} sync done. New lastSyncTime=${safeSyncTime}`);

      } catch (tableErr: any) {
        console.error(`[SyncEngine] Error al sincronizar tabla ${conf.tableName}:`, tableErr);
        if (tableErr && typeof tableErr === 'object') {
          (window as any).addDebugLog?.(`[Sync] Error en tabla ${conf.tableName}: ${tableErr.message || JSON.stringify(tableErr)} | Detalles: ${tableErr.details || ''} | Hint: ${tableErr.hint || ''}`);
        } else {
          (window as any).addDebugLog?.(`[Sync] Error en tabla ${conf.tableName}: ${tableErr}`);
        }
      }
    }

    console.log('[SyncEngine] Ciclo de sincronización finalizado.');
    return { success: true, message: 'Sincronización completada.' };

  } catch (err: any) {
    console.error('[SyncEngine] Error fatal en ciclo de sincronización:', err);
    return { success: false, message: err.message || 'Error en sincronización.' };
  }
}
