/**
 * Módulo de notificaciones Telegram.
 *
 * Cada cliente crea su propio bot con @BotFather (gratis) y configura:
 *   - telegramBotToken : token del bot  "7123456789:AAFxxx..."
 *   - telegramChatId   : su propio chat ID (número)
 *
 * La petición HTTP se hace desde el main process vía electronAPI.sendTelegram
 * para evitar restricciones CORS en el renderer.
 */

import { WorkshopConfig, RepairOrder, Sale, InventoryItem, CreditAccount, Expense } from '../types';

// Convierte el devicePin a texto legible para Telegram.
// Si es patrón, dibuja una cuadrícula 3×3 con los nodos numerados y flechas.
function formatAccesoTelegram(pin?: string): string {
  if (!pin || pin === 'SIN CLAVE' || pin.trim() === '') return 'Sin clave';

  const isPatron = pin.startsWith('PATRÓN:') || /^[0-8](-[0-8]){2,}$/.test(pin.trim());
  if (!isPatron) return `PIN: ${pin}`;

  const nodes = (pin.startsWith('PATRÓN:') ? pin.replace('PATRÓN:', '').trim() : pin.trim())
    .split('-').map(Number).filter(n => !isNaN(n));

  // Emojis numerados para los 9 nodos (posiciones 0-8)
  const labels = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨'];
  // Flechas entre nodos consecutivos según dirección
  const arrow = (a: number, b: number): string => {
    const dr = Math.floor(b / 3) - Math.floor(a / 3); // fila
    const dc = (b % 3) - (a % 3);                     // columna
    if (dr === 0 && dc > 0) return '→';
    if (dr === 0 && dc < 0) return '←';
    if (dr > 0 && dc === 0) return '↓';
    if (dr < 0 && dc === 0) return '↑';
    if (dr > 0 && dc > 0)  return '↘';
    if (dr > 0 && dc < 0)  return '↙';
    if (dr < 0 && dc > 0)  return '↗';
    if (dr < 0 && dc < 0)  return '↖';
    return '·';
  };

  // Construir cuadrícula 3×3
  const grid = Array(9).fill('○');
  nodes.forEach((n, i) => { grid[n] = labels[i] ?? '●'; });
  const row = (r: number) => `${grid[r*3]} ${grid[r*3+1]} ${grid[r*3+2]}`;

  // Secuencia con flechas
  const seq = nodes.map((n, i) =>
    i < nodes.length - 1 ? `${labels[i] ?? n} ${arrow(n, nodes[i+1])}` : (labels[i] ?? String(n))
  ).join(' ');

  return `Patrón:\n${row(0)}\n${row(1)}\n${row(2)}\n↳ ${seq}`;
}

/**
 * Envía un mensaje de Telegram al dueño del taller.
 * Usa el IPC de Electron (main process) cuando está disponible.
 */
export async function sendTelegram(config: WorkshopConfig, message: string, label?: string): Promise<void> {
  const { telegramBotToken, telegramChatId, telegramEnabled } = config;
  if (telegramEnabled === false) {
    console.log('[Telegram] Notificaciones desactivadas.');
    return;
  }
  if (!telegramBotToken?.trim() || !telegramChatId?.trim()) {
    if (telegramEnabled) console.warn('[Telegram] Token o Chat ID no configurados.');
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken.trim()}/sendMessage`;
  const body = JSON.stringify({
    chat_id: telegramChatId.trim(),
    text: message,
    parse_mode: 'Markdown',
  });

  // Toast de notificación en la UI
  if (label) {
    window.dispatchEvent(new CustomEvent('telegram-sending', { detail: { label } }));
  }

  console.log('[Telegram] Enviando notificación a chat:', telegramChatId.trim());

  try {
    const api = (window as any).electronAPI;
    if (api?.sendTelegram) {
      const result = await api.sendTelegram(url, body);
      if (!result.ok) {
        console.warn('[Telegram] Error:', result.status, result.body || result.error);
        if (label) window.dispatchEvent(new CustomEvent('telegram-result', { detail: { label, ok: false } }));
      } else {
        console.log('[Telegram] Enviado correctamente.');
        if (label) window.dispatchEvent(new CustomEvent('telegram-result', { detail: { label, ok: true } }));
      }
    } else {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (label) window.dispatchEvent(new CustomEvent('telegram-result', { detail: { label, ok: true } }));
    }
  } catch (err) {
    console.warn('[Telegram] Error al enviar notificación:', err);
    if (label) window.dispatchEvent(new CustomEvent('telegram-result', { detail: { label, ok: false } }));
  }
}

function formatTelegramPhone(phone?: string, countryCode?: string): string {
  if (!phone) return '';
  if (!countryCode) return phone;
  const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${prefix} ${phone}`;
}

// ─── Plantillas de mensajes ────────────────────────────────────────────────────

export function tgVentaPOS(sale: Sale, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const items = sale.items.map((i, idx) =>
    `  ${idx + 1}. ${i.name}\n` +
    (i.quantity > 1
      ? `      ${i.quantity} x ${sym}${i.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `      ${sym}${i.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  ).join('\n');
  const metodos = (sale.paymentMethod === 'Múltiple' || sale.paymentMethod === 'Mixto') && sale.confirmationCode
    ? sale.confirmationCode.split(' | ').map(p => `  💳 ${p}`).join('\n')
    : `  💳 ${sale.paymentMethod}: ${sym}${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    `🟢 *VENTA REGISTRADA*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 Tienda: ${config.storeName || 'Taller'}\n` +
    `🎫 Ticket: ${sale.ticketNumber || sale.id}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 Artículos:\n${items}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Total: ${sym}${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `${metodos}`
  );
}

export function tgNuevaOrden(order: RepairOrder, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const entrega = order.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No definida';
  return (
    `🔧 *NUEVA ORDEN DE SERVICIO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 Folio: ${order.id}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${order.customerName}\n` +
    (order.customerPhone ? `📞 Teléfono: ${formatTelegramPhone(order.customerPhone, order.customerCountryCode)}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📱 Equipo: ${order.deviceBrand} ${order.deviceModel}\n` +
    `🔩 Falla: ${order.faultDescription.replace(/^\[[^\]]*\]\s*/g, '')}\n` +
    `🔐 Acceso: ${formatAccesoTelegram(order.devicePin)}\n` +
    `👨‍🔧 Técnico: ${order.assignedTechnician}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Costo est.: ${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `💵 Anticipo: ${sym}${order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `📦 Entrega est.: ${entrega}`
  );
}

export function tgCambioEstado(order: RepairOrder, nuevoEstado: RepairOrder['status'], config: WorkshopConfig): string {
  const estadoEmoji: Record<string, string> = {
    'Pendiente': '🕐', 'Diagnóstico': '🔍', 'En Reparación': '⚙️',
    'Listo': '✅', 'Entregado': '📦', 'Entregado y Pagado': '💚',
    'Fallido': '❌', 'Cancelado': '🚫',
  };
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    `${estadoEmoji[nuevoEstado] || '🔄'} *CAMBIO DE ESTADO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 Folio: ${order.id}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${order.customerName}\n` +
    (order.customerPhone ? `📞 Teléfono: ${formatTelegramPhone(order.customerPhone, order.customerCountryCode)}\n` : '') +
    `📱 Equipo: ${order.deviceBrand} ${order.deviceModel}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🔄 Nuevo estado: *${nuevoEstado}*`
  );
}

export function tgOrdenEntregada(order: RepairOrder, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const anticipo = order.advancePayment || 0;
  const saldo = Math.max(0, order.cost - anticipo);
  return (
    `💚 *ORDEN FINALIZADA Y ENTREGADA*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 Folio: ${order.id}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${order.customerName}\n` +
    (order.customerPhone ? `📞 Teléfono: ${formatTelegramPhone(order.customerPhone, order.customerCountryCode)}\n` : '') +
    `📱 Equipo: ${order.deviceBrand} ${order.deviceModel}\n` +
    `👨‍🔧 Técnico: ${order.assignedTechnician}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Total: ${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `💵 Anticipo: ${sym}${anticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    (saldo > 0 ? `💳 Cobrado al entregar: ${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `✅ Liquidado previamente`)
  );
}

export function tgStockBajo(item: InventoryItem, config: WorkshopConfig): string {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    `⚠️ *STOCK BAJO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📦 Producto: ${item.name}\n` +
    (item.brand ? `🏷 Marca: ${item.brand}\n` : '') +
    `🔢 Código: ${item.code}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📉 Stock actual: ${item.stock} unidades\n` +
    `📊 Mínimo configurado: ${item.minStock} unidades\n` +
    `🚨 ¡Tiempo de reabastecer!`
  );
}

export function msgProductoAgregado(item: InventoryItem, cantidad: number, origen: string, config: WorkshopConfig): string {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    `📦 *INVENTARIO ACTUALIZADO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `🔀 Origen: ${origen}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📦 Producto: ${item.name}\n` +
    (item.brand ? `🏷 Marca: ${item.brand}\n` : '') +
    `🔢 Código: ${item.code}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `➕ Cantidad agregada: +${cantidad} unidades\n` +
    `📊 Stock resultante: ${item.stock + cantidad} unidades`
  );
}

export function tgCorte(corte: any, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const estado = corte.diferencia === 0
    ? '✅ Cuadrado exacto'
    : corte.diferencia > 0
      ? `📈 Sobrante: +${sym}${Math.abs(corte.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `⚠️ Faltante: -${sym}${Math.abs(corte.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    `🏦 *CORTE DE CAJA*\n` +
    `Sesión: #${corte.id}\n` +
    `Fecha: ${corte.date} ${corte.time}\n` +
    `Efectivo contado: ${sym}${corte.fisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `Esperado en caja: ${sym}${corte.estimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `Resultado: ${estado}\n` +
    `Taller: ${config.storeName || 'Taller'}`
  );
}

export function tgApertura(apertura: any, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  return (
    `🏁 *APERTURA DE CAJA / INICIO DE DÍA*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 Taller: ${config.storeName || 'Taller'}\n` +
    `🆔 Sesión: #${apertura.sesion || apertura.id}\n` +
    `📅 Fecha: ${apertura.fecha ? apertura.fecha.split('-').reverse().join('/') : ''} ${apertura.hora}\n` +
    `👤 Operador: ${apertura.aperturadoPor}\n` +
    `💼 Rol: ${apertura.rol}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Fondo inicial: ${sym}${apertura.fondoInicial.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );
}

export function tgEntregaTurno(
  empleado: string,
  ventas: number,
  totalVendido: number,
  totalEfectivo: number,
  totalTarjeta: number,
  totalTransfer: number,
  totalContado: number,
  diferencia: number,
  config: WorkshopConfig
): string {
  const sym = config.currencySymbol || '$';
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString('es-MX');
  const cuadra = Math.abs(diferencia) < 0.01;
  const estadoDinero = cuadra
    ? '✅ Cuadra exacto'
    : diferencia > 0
      ? `📈 Sobran: +${sym}${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `⚠️ Faltan: -${sym}${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    `👤 *ENTREGA DE TURNO*\n` +
    `Empleado: *${empleado}*\n` +
    `Fecha: ${fecha} — ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Ventas realizadas: ${ventas}\n` +
    `Total vendido: ${sym}${totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `  💵 Efectivo: ${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    (totalTarjeta > 0 ? `  💳 Tarjeta/Transfer: ${sym}${totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Efectivo contado: ${sym}${totalContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `Efectivo esperado: ${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `Resultado: ${estadoDinero}\n` +
    `Taller: ${config.storeName || 'Taller'}`
  );
}

export function tgRecepcionMultiple(orders: RepairOrder[], config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const first = orders[0];
  const totalCargo = orders.reduce((s, o) => s + o.cost, 0);
  const totalAnticipo = orders.reduce((s, o) => s + o.advancePayment, 0);
  const folios = orders.map(o => o.id).join(', ');
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const entrega = first.estimatedDeliveryDate
    ? new Date(first.estimatedDeliveryDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No definida';
  const equipos = orders.map((o, i) =>
    `${i + 1}. 📱 ${o.deviceBrand} ${o.deviceModel}\n` +
    `    📋 Folio: ${o.id}\n` +
    `    🔩 Falla: ${o.faultDescription.replace(/^\[[^\]]*\]\s*/g, '')}\n` +
    `    🔐 Acceso: ${formatAccesoTelegram(o.devicePin)}\n` +
    `    💰 Costo: ${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ).join('\n\n');
  return (
    `📦 *RECEPCIÓN MÚLTIPLE — ${orders.length} EQUIPOS*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${first.customerName}\n` +
    (first.customerPhone ? `📞 Teléfono: ${formatTelegramPhone(first.customerPhone, first.customerCountryCode)}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${equipos}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Total cargo: ${sym}${totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `💵 Anticipo: ${sym}${totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `🔴 Saldo: ${sym}${Math.max(0, totalCargo - totalAnticipo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `📦 Entrega est.: ${entrega}`
  );
}


// ─── Fiados ────────────────────────────────────────────────────────────────────

export function tgNuevoFiado(account: CreditAccount, deuda: number, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const items = account.entries[account.entries.length - 1]?.items ?? [];
  const detalle = items.map((i, idx) =>
    `  ${idx + 1}. ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''} — ${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ).join('\n');
  return (
    `💳 *NUEVO FIADO REGISTRADO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 Taller: ${config.storeName || 'Taller'}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${account.clientName}\n` +
    (account.clientPhone ? `📞 Teléfono: ${account.clientPhone}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    (detalle ? `🛒 Artículos:\n${detalle}\n━━━━━━━━━━━━━━━━━━━\n` : '') +
    `🔴 Deuda total: ${sym}${deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );
}

export function tgAbonoFiado(account: CreditAccount, monto: number, method: string, saldoAnterior: number, saldoNuevo: number, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    `💵 *ABONO A FIADO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 Taller: ${config.storeName || 'Taller'}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Cliente: ${account.clientName}\n` +
    (account.clientPhone ? `📞 Teléfono: ${account.clientPhone}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Abono: ${sym}${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `💳 Método: ${method}\n` +
    `📉 Saldo anterior: ${sym}${saldoAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `${saldoNuevo <= 0 ? `✅ *¡DEUDA SALDADA!*` : `🔴 Saldo restante: ${sym}${saldoNuevo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}`
  );
}

export function tgMovimientoCaja(expense: Expense, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const typeText = expense.type === 'entrada' ? '📥 *ENTRADA DE EFECTIVO*' : '📤 *SALIDA DE EFECTIVO (GASTO)*';
  const labelEmoji = expense.type === 'entrada' ? '🟢' : '🔴';
  return (
    `${typeText}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 Taller: ${config.storeName || 'Taller'}\n` +
    `📅 Fecha: ${fecha} ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📂 Categoría: ${expense.category || 'Otros'}\n` +
    `📝 Concepto: ${expense.description || 'Movimiento manual'}\n` +
    (expense.paymentMethod ? `💳 Método: ${expense.paymentMethod}\n` : '') +
    (expense.sessionId ? `🆔 Sesión: #${expense.sessionId}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${labelEmoji} Monto: ${sym}${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );
}
