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
  balance?: number; // Saldo remanente devuelto por la API (Tiempo Aire)
  balanceServices?: number; // Saldo remanente de Pago de Servicios
  status?: string; // Estatus de la transacción ('0', '1', '3', etc.)
}


/**
 * Helper para realizar las peticiones HTTP POST a la API de Taecel.
 * Delega la petición al Main Process de Electron si está disponible para evadir restricciones de CORS.
 */
async function performTaecelRequest(endpoint: string, body: any): Promise<any> {
  const eAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  if (eAPI && eAPI.taecelApiRequest) {
    const res = await eAPI.taecelApiRequest(endpoint, body);
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Código de error HTTP: ${res.status}`);
    }
    return typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  } else {
    // Convert body to url-encoded format for x-www-form-urlencoded requests
    const urlEncodedBody = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      urlEncodedBody.append(k, String(v));
    }

    const response = await fetch(`https://app.taecel.com/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: urlEncodedBody.toString()
    });

    if (!response.ok) {
      throw new Error(`Código de error HTTP: ${response.status}`);
    }

    return await response.json();
  }
}

/**
 * Consulta el saldo disponible en Taecel.
 * Si está en modo Sandbox, lee un saldo persistente simulado.
 */
export async function taecelGetBalance(config: WorkshopConfig): Promise<TaecelResponse> {
  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    const data = await performTaecelRequest('getBalance', {
      key: apiKey,
      nip: nip
    });
    
    if (data.success && Array.isArray(data.data)) {
      // Buscar la bolsa de Tiempo Aire
      const taBolsa = data.data.find((b: any) => b.Bolsa === 'Tiempo Aire');
      const saldoStr = taBolsa ? taBolsa.Saldo : '0.00';
      const balance = parseFloat(saldoStr.replace(/,/g, ''));

      // Buscar la bolsa de Pago de Servicios
      const serBolsa = data.data.find((b: any) => b.Bolsa === 'Pago de Servicios');
      const saldoSerStr = serBolsa ? serBolsa.Saldo : '0.00';
      const balanceServices = parseFloat(saldoSerStr.replace(/,/g, ''));

      return {
        success: true,
        message: data.message || 'Consulta de saldo exitosa.',
        balance: balance,
        balanceServices: balanceServices
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
 * Helper interno para generar el código de producto fallback en caso de no tener catálogo cargado
 */
function mapCarrierToFallbackProductCode(carrierId: string, amount: number): string {
  const cleanId = carrierId.toUpperCase();
  if (cleanId.startsWith('TELCEL')) {
    return cleanId.includes('PAQ') ? `TPA${amount}` : `TEL${String(amount).padStart(3, '0')}`;
  } else if (cleanId.startsWith('MOVISTAR')) {
    return cleanId.includes('PAQ') ? `MPA${amount}` : `MOV${String(amount).padStart(3, '0')}`;
  } else if (cleanId.startsWith('ATT') || cleanId.startsWith('AT&T')) {
    return cleanId.includes('PAQ') ? `APA${amount}` : `ATT${String(amount).padStart(3, '0')}`;
  } else if (cleanId.startsWith('UNEFON')) {
    return `UNE${String(amount).padStart(3, '0')}`;
  }
  return `${cleanId}${amount}`;
}

/**
 * Consulta el catálogo completo de productos de Taecel.
 */
export async function taecelGetProducts(config: WorkshopConfig): Promise<any> {
  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    const data = await performTaecelRequest('getProducts', {
      key: apiKey,
      nip: nip
    });
    return data;
  } catch (error: any) {
    console.error('[Taecel API Error] getProducts:', error);
    return {
      success: false,
      message: `Error al obtener catálogo: ${error.message || error}`
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
  productCode?: string; // Código real mapeado
}): Promise<TaecelResponse> {
  const { config, carrierId, amount, phoneOrReference, folioInterno, productCode } = params;

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  const resolvedProductCode = productCode || mapCarrierToFallbackProductCode(carrierId, amount);

  try {
    const cleanRefCte = ((folioInterno || '').replace(/[^a-zA-Z0-9]/g, '') || 'FM') + Date.now().toString().slice(-4);
    const data = await performTaecelRequest('RequestTXN', {
      key: apiKey,
      nip: nip,
      producto: resolvedProductCode,
      referencia: phoneOrReference,
      refCte: cleanRefCte,
      monto: amount
    });

    const isRequestSuccess = data.success && data.error === 0 && data.data && (data.data.transID || data.data.TransID);

    if (isRequestSuccess) {
      const transId = data.data.transID || data.data.TransID;
      
      // Iniciar bucle de polling interno para obtener el folio de autorización
      let attempts = 0;
      const maxAttempts = 12; // 12 intentos * 2s = 24 segundos máx
      const delayMs = 2000;
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        try {
          const statusRes = await taecelCheckStatus({
            config,
            transactionId: transId,
            folioInterno
          });
          
          if (statusRes.success) {
            return {
              success: true,
              message: 'Transacción procesada y autorizada con éxito.',
              transactionId: transId,
              authorizationFolio: statusRes.authorizationFolio,
              balance: statusRes.balance
            };
          } else {
            // Determinar si la transacción sigue pendiente
            const statusStrLower = (statusRes.status || '').toLowerCase().trim();
            const isPending = statusStrLower === 'pendiente' || statusStrLower === '0' || statusStrLower === '' || statusStrLower === 'en proceso';
            
            if (!isPending) {
              return {
                success: false,
                message: statusRes.message || 'Transacción fallida o rechazada por el operador.'
              };
            }

            // Si el estatus reporta explícitamente un error definitivo por texto, detenemos el loop
            if (statusRes.message && (
                statusRes.message.toLowerCase().includes('declinad') ||
                statusRes.message.toLowerCase().includes('rechazad') ||
                statusRes.message.toLowerCase().includes('error') ||
                statusRes.message.toLowerCase().includes('invalido') ||
                statusRes.message.toLowerCase().includes('no existe')
            )) {
              return {
                success: false,
                message: statusRes.message
              };
            }
          }
        } catch (statusErr: any) {
          console.warn('[Taecel Polling Warning] Attempt:', attempts, statusErr.message);
        }
      }
      
      return {
        success: false,
        message: 'La recarga fue enviada pero expiró el tiempo de espera sin confirmación del operador. Consulta el estatus de la transacción ID: ' + transId
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

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!transactionId) {
    return {
      success: false,
      message: 'Falta el transactionId para validar el estatus.'
    };
  }

  try {
    const data = await performTaecelRequest('StatusTXN', {
      key: apiKey,
      nip: nip,
      transID: transactionId
    });

    const statusVal = data.data ? (data.data.status !== undefined ? data.data.status : data.data.Status) : undefined;
    const statusStr = statusVal !== undefined && statusVal !== null ? String(statusVal) : '';
    
    const folioVal = data.data ? (data.data.folio !== undefined ? data.data.folio : data.data.Folio) : undefined;
    const saldoVal = data.data ? (data.data.saldo_final !== undefined ? data.data.saldo_final : (data.data.SaldoFinal || data.data.saldo)) : undefined;

    const isSuccess = data.success && data.error === 0 && data.data && (
      statusStr.toLowerCase() === 'exitosa' || 
      statusStr.toLowerCase() === 'exitoso' || 
      statusStr === '1'
    );

    return {
      success: isSuccess,
      message: data.message || (isSuccess ? 'Transacción Exitosa' : 'Transacción en proceso/pendiente o fallida.'),
      authorizationFolio: folioVal,
      balance: saldoVal ? parseFloat(String(saldoVal).replace(/,/g, '')) : undefined,
      status: statusStr
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error al validar estatus: ${error.message}`
    };
  }
}

/**
 * Consulta el historial de transacciones realizadas en un día específico.
 */
export async function taecelGetSales(params: {
  config: WorkshopConfig;
  fecha: string; // Formato YYYY-MM-DD
  bolsa?: string;
}): Promise<any> {
  const { config, fecha, bolsa } = params;

  const apiKey = config.taecelApiKey || '';
  const nip = config.taecelNip || '';

  if (!apiKey || !nip) {
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    const data = await performTaecelRequest('getSales', {
      key: apiKey,
      nip: nip,
      fecha: fecha,
      bolsa: bolsa || '1' // 1 = Tiempo Aire
    });
    return data;
  } catch (error: any) {
    console.error('[Taecel API Error] getSales:', error);
    return {
      success: false,
      message: `Error al obtener reporte de ventas: ${error.message || error}`
    };
  }
}

/**
 * Genera la URL para reportar compras de saldo en Taecel.
 */
export async function taecelGetReporteCompraUrl(config: WorkshopConfig): Promise<{
  success: boolean;
  message?: string;
  urlReporte?: string;
  refCompra?: string;
}> {
  console.log('[taecelGetReporteCompraUrl] Entered function');
  const { taecelApiKey, taecelNip } = config;

  const apiKey = taecelApiKey || '';
  const nip = taecelNip || '';

  if (!apiKey || !nip) {
    console.warn('[taecelGetReporteCompraUrl] Missing API Key or NIP in config');
    return {
      success: false,
      message: 'Falta configurar API Key o NIP de Taecel.'
    };
  }

  try {
    console.log('[taecelGetReporteCompraUrl] Sending urlReporteCompra API request');
    const data = await performTaecelRequest('urlReporteCompra', {
      key: apiKey,
      nip: nip
    });
    console.log('[taecelGetReporteCompraUrl] API Raw Response:', data);

    if (data && (data.urlReporte || data.refCompra)) {
      console.log('[taecelGetReporteCompraUrl] Found urlReporte at root level of response');
      return {
        success: true,
        refCompra: data.refCompra,
        urlReporte: data.urlReporte
      };
    } else if (data && data.data && (data.data.urlReporte || data.data.refCompra)) {
      console.log('[taecelGetReporteCompraUrl] Found urlReporte inside data level of response');
      return {
        success: true,
        refCompra: data.data.refCompra,
        urlReporte: data.data.urlReporte
      };
    } else {
      console.warn('[taecelGetReporteCompraUrl] Response has no urlReporte keys:', data);
      return {
        success: false,
        message: data.message || 'Error al generar la URL de reporte de compra.'
      };
    }
  } catch (error: any) {
    console.error('[taecelGetReporteCompraUrl] Exception thrown in network request:', error);
    return {
      success: false,
      message: `Error de red: ${error.message || error}`
    };
  }
}

// Credenciales Maestras del Distribuidor para registrar sub-cuentas bajo su red
export const TAECEL_MASTER_KEY = 'cuvfyCUgYRophQbawZyTrdeS6d0b0fd1e8c1e3feb42fd08195c0e24fcaKMu71GBwWa9Qq8IPx0FJbbIJ5aXk3';
export const TAECEL_MASTER_NIP = '50330435d8a4b1487ee07563b4a7e26d3vNPZVRGwn';

/**
 * Registra una nueva cuenta (punto de venta / sub-distribuidor) dentro de la red del distribuidor.
 */
export async function taecelRegisterAccount(params: {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  nomComercial?: string;
  forzarActivacion?: number;
}): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const data = await performTaecelRequest('RegistroCuenta', {
      key: TAECEL_MASTER_KEY,
      nip: TAECEL_MASTER_NIP,
      nombre: params.nombre,
      apellidos: params.apellidos,
      correo: params.correo,
      telefono: params.telefono,
      nomComercial: params.nomComercial || '',
      forzarActivacion: params.forzarActivacion !== undefined ? params.forzarActivacion : 1
    });

    if (data && data.success && data.error === 0) {
      return {
        success: true,
        message: data.message || 'Cuenta registrada con éxito en tu red.',
        data: data.data
      };
    } else {
      return {
        success: false,
        message: data ? (data.message || 'Error al registrar cuenta.') : 'Error de respuesta del servidor.'
      };
    }
  } catch (error: any) {
    console.error('[Taecel API Error] RegistroCuenta:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message || error}`
    };
  }
}
