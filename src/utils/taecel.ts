/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkshopConfig } from '../types';

export interface TaecelResponse {
  success: boolean;
  message: string;
  transactionId?: string; // ID único devuelto por Taecel
  authorizationFolio?: string; // Folio de autorización para el ticket
  balance?: number; // Saldo remanente devuelto por la API
}

// Inicializar balance de simulación aislado por tienda
const getSimulatedBalance = (config: WorkshopConfig): number => {
  const storeKey = (config.storeName || 'default').replace(/\s+/g, '_').toLowerCase();
  const val = localStorage.getItem(`fixmanager_taecel_sim_balance_${storeKey}`);
  if (val !== null) return parseFloat(val);
  const initial = 2500.00;
  localStorage.setItem(`fixmanager_taecel_sim_balance_${storeKey}`, initial.toFixed(2));
  return initial;
};

const setSimulatedBalance = (config: WorkshopConfig, newBalance: number) => {
  const storeKey = (config.storeName || 'default').replace(/\s+/g, '_').toLowerCase();
  localStorage.setItem(`fixmanager_taecel_sim_balance_${storeKey}`, newBalance.toFixed(2));
};

/**
 * Consulta el saldo disponible en Taecel.
 * Si está en modo Sandbox, lee un saldo persistente simulado.
 */
export async function taecelGetBalance(config: WorkshopConfig): Promise<TaecelResponse> {
  const isSandbox = config.taecelSandboxMode !== false;
  
  if (isSandbox) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      success: true,
      message: 'Saldo consultado con éxito (SIMULACIÓN)',
      balance: getSimulatedBalance(config)
    };
  }

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    const response = await fetch('https://ne.taecel.com/api/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: apiKey,
        nip: nip
      })
    });

    if (!response.ok) {
      throw new Error(`Código de error HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // Suponiendo respuesta estándar de API Taecel (adaptar según manual exacto cuando se reciba)
    if (data.status === 'exitoso' || data.success) {
      return {
        success: true,
        message: data.message || 'Consulta de saldo exitosa.',
        balance: parseFloat(data.saldo || data.balance || 0)
      };
    } else {
      return {
        success: false,
        message: data.message || 'Error al consultar saldo en Taecel.'
      };
    }
  } catch (error: any) {
    console.error('[Taecel API Error] Balance:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message || error}`
    };
  }
}

/**
 * Procesa una solicitud de recarga electrónica o pago de servicio en Taecel.
 * Si está en modo Sandbox, simula el consumo y autoriza la transacción.
 */
export async function taecelRequestRecharge(params: {
  config: WorkshopConfig;
  carrierId: string;
  amount: number;
  phoneOrReference: string;
  folioInterno: string;
}): Promise<TaecelResponse> {
  const { config, carrierId, amount, phoneOrReference, folioInterno } = params;
  const isSandbox = config.taecelSandboxMode !== false;

  if (isSandbox) {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simular latencia de red real
    
    // Simular escenarios de falla basados en inputs específicos para testing
    if (phoneOrReference.startsWith('555') || phoneOrReference === '5555555555') {
      return {
        success: false,
        message: 'Rechazado por el carrier: Saldo insuficiente en la bolsa o número no activo.'
      };
    }
    
    if (phoneOrReference === '9999999999' || phoneOrReference.startsWith('999')) {
      return {
        success: false,
        message: 'Error de cobro: Referencia no encontrada o recibo vencido / ya pagado.'
      };
    }

    const currentBalance = getSimulatedBalance(config);
    if (currentBalance < amount) {
      return {
        success: false,
        message: 'Error de la plataforma: Saldo insuficiente de tu cuenta Taecel para realizar esta operación.'
      };
    }

    const nextBalance = currentBalance - amount;
    setSimulatedBalance(config, nextBalance);

    const randomAuth = Math.floor(100000 + Math.random() * 900000).toString();
    const randomTxId = 'TX-' + Math.floor(100000000 + Math.random() * 900000000).toString();

    return {
      success: true,
      message: 'Transacción procesada y autorizada con éxito.',
      transactionId: randomTxId,
      authorizationFolio: randomAuth,
      balance: nextBalance
    };
  }

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    // Nota: El endpoint exacto y campos se validan con el manual del levantamiento tecnológico.
    // Usualmente se envía carrier, teléfono/referencia, monto, folio de transacción interno de control.
    const response = await fetch('https://ne.taecel.com/api/transaccion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: apiKey,
        nip: nip,
        carrier: carrierId,
        monto: amount,
        destino: phoneOrReference,
        referencia: folioInterno
      })
    });

    if (!response.ok) {
      throw new Error(`Código de error HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'exitoso' || data.success) {
      return {
        success: true,
        message: data.message || 'Transacción exitosa.',
        transactionId: data.transaccionId || data.transactionId,
        authorizationFolio: data.folio || data.authorizationFolio || data.folioAutorizacion,
        balance: data.saldo ? parseFloat(data.saldo) : undefined
      };
    } else {
      return {
        success: false,
        message: data.message || 'Operación declinada por el servidor de recargas.'
      };
    }
  } catch (error: any) {
    console.error('[Taecel API Error] Recharge:', error);
    return {
      success: false,
      message: `Error de red / comunicación: ${error.message || error}`
    };
  }
}

/**
 * Consulta el estatus de una transacción específica.
 */
export async function taecelCheckStatus(params: {
  config: WorkshopConfig;
  transactionId?: string;
  folioInterno: string;
}): Promise<TaecelResponse> {
  const { config, transactionId, folioInterno } = params;
  const isSandbox = config.taecelSandboxMode !== false;

  if (isSandbox) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      success: true,
      message: 'Estatus verificado: Transacción confirmada en el servidor (SIMULACIÓN)',
      authorizationFolio: 'AUTH-SIM-' + Math.floor(100000 + Math.random() * 900000)
    };
  }

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  try {
    const response = await fetch('https://ne.taecel.com/api/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: apiKey,
        nip: nip,
        transaccion: transactionId,
        referencia: folioInterno
      })
    });

    const data = await response.json();
    return {
      success: data.status === 'exitoso' || data.success,
      message: data.message || 'Verificación finalizada.',
      authorizationFolio: data.folio || data.authorizationFolio
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error al validar estatus: ${error.message}`
    };
  }
}
