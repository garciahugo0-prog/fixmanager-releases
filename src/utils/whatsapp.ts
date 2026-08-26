/**
 * Módulo de notificaciones y envío de comprobantes por WhatsApp.
 */

import html2canvas from 'html2canvas';
import { WorkshopConfig, RepairOrder, Sale, CreditAccount, CreditSaleEntry, ApartadoEntry, ApartadoPayment } from '../types';
import { buildPosTicketHtml } from './ticketBuilder';

/**
 * Renderiza un string HTML a base64 PNG usando html2canvas.
 * Monta el elemento temporalmente fuera de pantalla, captura y lo elimina.
 * Detecta el ancho dinámicamente igual que WhatsappModal para mantener el mismo estilo.
 */
async function renderHtmlToBase64(html: string): Promise<string | undefined> {
  const api = (window as any).electronAPI;
  if (!api || !api.copyHtmlToClipboard) {
    console.warn('[WhatsApp] electronAPI.copyHtmlToClipboard no disponible.');
    return undefined;
  }

  try {
    // Detectar ancho dinámicamente igual que WhatsappModal.getDynamicPreviewWidth
    const lowerHtml = html.toLowerCase();
    let contentWidth = 340;
    if (lowerHtml.includes('size: 58mm') || lowerHtml.includes('size:58mm')) {
      contentWidth = 280;
    } else if (lowerHtml.includes('210mm 297mm') || lowerHtml.includes('215.9mm 279.4mm') || lowerHtml.includes('size: letter') || lowerHtml.includes('size:letter')) {
      contentWidth = 720;
    } else if (lowerHtml.includes('216mm 140mm')) {
      contentWidth = 500;
    }

    // Inyectar los mismos estilos que usa WhatsappModal para las franjas negras
    const styles = `
      <style>
        .section-badge, .badge {
          background-color: #000000 !important;
          color: #ffffff !important;
          padding: 6px 0 !important;
          line-height: 1.2 !important;
          height: auto !important;
          display: block !important;
          text-align: center !important;
        }
        .section-badge *, .badge * {
          color: #ffffff !important;
        }
        .total-line {
          background-color: #000000 !important;
          color: #ffffff !important;
          padding: 8px 6px !important;
          line-height: 1.2 !important;
          height: auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .total-line * {
          color: #ffffff !important;
        }
        th {
          border-top: 1.5px solid #000000 !important;
          border-bottom: 1.5px solid #000000 !important;
          border-left: none !important;
          border-right: none !important;
        }
        td {
          border: none !important;
        }
      </style>
    `;

    const fullHtml = `
      <html>
        <head>
          ${styles}
        </head>
        <body style="margin: 0; padding: 0; font-family: monospace; background: #ffffff;">
          <div id="ticket-capture-root" style="width: 100%; box-sizing: border-box; background-color: #ffffff; color: #000000; display: block; padding: 20px;">
            ${html}
          </div>
        </body>
      </html>
    `;

    const res = await api.copyHtmlToClipboard({ html: fullHtml, width: contentWidth });
    if (res && res.success && res.base64) {
      return res.base64.split(',')[1]; // Sólo el base64, sin el prefijo
    }
  } catch (err) {
    console.error('[WhatsApp] Error renderizando ticket a imagen:', err);
  }
  return undefined;
}

/**
 * Limpia y formatea el número de teléfono para que sea compatible con WhatsApp.
 * Si tiene 10 dígitos, agrega el prefijo del país por defecto (ej. '52' para México).
 */
export function formatPhoneForWhatsapp(phone: string, defaultCountry: string = '52'): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = defaultCountry + cleaned;
  }
  // Normalizar números de México (52): los móviles en WhatsApp requieren el prefijo 521 (13 dígitos)
  if (cleaned.startsWith('52') && cleaned.length === 12 && !cleaned.startsWith('521')) {
    cleaned = '521' + cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Abre el chat de WhatsApp con el mensaje pre-llenado (Método Enlace Directo).
 */
export function openWhatsappChat(phone: string, text: string, defaultCountry: string = '52') {
  const formattedPhone = formatPhoneForWhatsapp(phone, defaultCountry);
  const encodedText = text ? encodeURIComponent(text) : '';
  const nativeScheme = `whatsapp://send?phone=${formattedPhone}${encodedText ? `&text=${encodedText}` : ''}`;
  const webUrl = `https://wa.me/${formattedPhone}${encodedText ? `?text=${encodedText}` : ''}`;

  const api = (window as any).electronAPI;

  if (api && api.whatsappOpenChat) {
    api.whatsappOpenChat(formattedPhone, text).then((res: any) => {
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent('open-whatsapp-chat'));
        return;
      }
      if (api?.openExternal && !api.isMock) {
        api.openExternal(webUrl);
      } else {
        window.location.href = nativeScheme;
      }
    }).catch(() => {
      if (api?.openExternal && !api.isMock) {
        api.openExternal(webUrl);
      } else {
        window.location.href = nativeScheme;
      }
    });
    return;
  }

  if (api?.openExternal && !api.isMock) {
    api.openExternal(webUrl);
  } else {
    window.location.href = nativeScheme;
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = webUrl;
      }
    }, 1200);
  }
}

/**
 * Envía una cotización por WhatsApp.
 * - Modo integrado (QR sincronizado):
 *     · Ticket → imagen PNG automática
 *     · Carta  → PDF adjunto automático
 * - Modo web/manual:
 *     · Carta  → guarda PDF en Descargas y abre WhatsApp Web en el chat del cliente
 *     · Ticket → abre WhatsApp Web en el chat del cliente con texto
 */
export async function sendWhatsappQuote(
  phone: string,
  quoteId: string,
  isLetter: boolean,
  html: string,
  countryCode: string = '52',
  whatsappMode: string = 'integrated'
): Promise<{ ok: boolean; error?: string }> {
  const api = (window as any).electronAPI;
  if (!api) return { ok: false, error: 'API Electron no disponible' };

  const cc = countryCode.replace('+', '') || '52';
  const formattedPhone = formatPhoneForWhatsapp(phone, cc);

  // ── Modo web/manual ──────────────────────────────────────────────────────────
  if (whatsappMode !== 'integrated') {
    const waUrl = `https://wa.me/${formattedPhone}`;

    if (isLetter) {
      // Carta → guardar PDF en Descargas y luego abrir WhatsApp Web
      showUiToast('Generando PDF… se guardará en Descargas', 'info');
      const filename = `Cotizacion-${quoteId}.pdf`;
      const res = await api.waSavePdfToDownloads(html, filename);
      if (res?.success) {
        showUiToast(`PDF guardado en Descargas como "${filename}". Adjúntalo en WhatsApp Web.`, 'success');
        // Pequeña pausa para que se vea el toast antes de abrir el navegador
        await new Promise(r => setTimeout(r, 1200));
        if (api.openExternal) {
          api.openExternal(waUrl);
        } else {
          window.open(waUrl, '_blank');
        }
        return { ok: true };
      } else {
        showUiToast(`Error al guardar PDF: ${res?.error || 'desconocido'}`, 'error');
        return { ok: false, error: res?.error };
      }
    } else {
      // Ticket → abrir WhatsApp Web con texto
      const text = `Hola, te compartimos tu cotización *${quoteId}* de nuestro taller. Quedo al pendiente de cualquier duda. 😊`;
      const waUrlWithText = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      if (api.openExternal) {
        api.openExternal(waUrlWithText);
      } else {
        window.open(waUrlWithText, '_blank');
      }
      return { ok: true };
    }
  }

  // ── Modo integrado ───────────────────────────────────────────────────────────
  if (isLetter) {
    // Carta → generar PDF en memoria y enviar como documento
    showUiToast('Generando PDF de la cotización…', 'info');
    const pdfResult = await api.waGeneratePdfBase64(html);
    if (!pdfResult?.success || !pdfResult.base64) {
      showUiToast(`Error al generar PDF: ${pdfResult?.error || 'desconocido'}`, 'error');
      return { ok: false, error: pdfResult?.error };
    }
    const filename = `Cotizacion-${quoteId}.pdf`;
    const res = await api.whatsappSendDocument(formattedPhone, pdfResult.base64, filename);
    if (res?.success) {
      showUiToast('¡Cotización PDF enviada por WhatsApp!', 'success');
      return { ok: true };
    } else {
      showUiToast(`Error al enviar PDF: ${res?.error || 'desconocido'}`, 'error');
      return { ok: false, error: res?.error };
    }
  } else {
    // Ticket → convertir a imagen PNG y enviar
    showUiToast('Generando imagen de la cotización…', 'info');
    const imgBase64 = await renderHtmlToBase64(html);
    if (!imgBase64) {
      showUiToast('Error al generar imagen del ticket', 'error');
      return { ok: false, error: 'Error al renderizar imagen' };
    }
    const res = await api.whatsappSendMessage(formattedPhone, '', imgBase64);
    if (res?.success) {
      showUiToast('¡Cotización enviada por WhatsApp!', 'success');
      return { ok: true };
    } else {
      showUiToast(`Error al enviar cotización: ${res?.error || 'desconocido'}`, 'error');
      return { ok: false, error: res?.error };
    }
  }
}

/**
 * Envía la foto y cotización de un producto/refacción por WhatsApp.
 */
export async function sendProductByWhatsapp(
  phone: string,
  product: {
    name: string;
    code?: string;
    category?: string;
    price?: number;
    imageUrl?: string;
  },
  config?: WorkshopConfig,
  countryCode: string = '52'
): Promise<{ ok: boolean; error?: string }> {
  const api = (window as any).electronAPI;
  const cc = countryCode.replace('+', '') || '52';
  const formattedPhone = formatPhoneForWhatsapp(phone, cc);

  let activeConfig = config;
  if (!activeConfig) {
    const saved = localStorage.getItem('fixmanager_config');
    if (saved) {
      try {
        activeConfig = JSON.parse(saved);
      } catch (e) {}
    }
  }

  const shopName = activeConfig?.storeName || 'FixManager';
  const sym = activeConfig?.currencySymbol || '$';

  let text = `📦 *${shopName}* - Ficha de Producto / Cotización\n\n`;
  text += `🔹 *${product.name.toUpperCase()}*\n`;
  if (product.code) text += `🏷️ SKU: ${product.code}\n`;
  if (product.category) text += `📂 Categoría: ${product.category}\n`;
  if (product.price !== undefined) text += `💰 Precio: *${sym}${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}*\n`;
  text += `\nQuedamos a tus órdenes para cualquier duda o apartado. 😊`;

  let base64Image: string | undefined = undefined;
  if (product.imageUrl) {
    if (product.imageUrl.startsWith('data:image/')) {
      base64Image = product.imageUrl;
    } else if (product.imageUrl.startsWith('http://') || product.imageUrl.startsWith('https://')) {
      try {
        const response = await fetch(product.imageUrl);
        const blob = await response.blob();
        base64Image = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('[WhatsApp] Error fetching remote image:', e);
      }
    } else if (api?.readProductImage) {
      try {
        const resBase64 = await api.readProductImage(product.imageUrl);
        if (resBase64 && resBase64.startsWith('data:image/')) {
          base64Image = resBase64;
        }
      } catch (e) {}
    }
  }

  const mode = activeConfig?.whatsappMode || 'integrated';

  if (mode === 'integrated' && api?.whatsappSendMessage) {
    showUiToast('Enviando cotización por WhatsApp…', 'info');
    const res = await api.whatsappSendMessage(formattedPhone, text, base64Image);
    if (res?.success) {
      showUiToast('¡Producto/Refacción enviado por WhatsApp!', 'success');
      return { ok: true };
    } else {
      showUiToast('Abriendo WhatsApp Web...', 'info');
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      if (api.openExternal) api.openExternal(waUrl);
      else window.open(waUrl, '_blank');
      return { ok: true };
    }
  } else {
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    if (api?.openExternal) api.openExternal(waUrl);
    else window.open(waUrl, '_blank');
    return { ok: true };
  }
}

/**
 * Envía una cotización detallada de los artículos del carrito del POS por WhatsApp.
 * Genera un ticket digital con título "COTIZACIÓN" y lo envía como imagen en modo integrado.
 */
export async function sendPosQuoteByWhatsapp(
  phone: string,
  clientName: string,
  items: any[],
  total: number,
  config: WorkshopConfig,
  countryCode: string = '52',
  discount?: number,
  discountType?: 'percentage' | 'fixed',
  discountValue?: number,
  notes?: string,
  createdBy?: string,
  warehouses?: any[]
): Promise<{ ok: boolean; error?: string }> {
  const api = (window as any).electronAPI;
  if (!api) return { ok: false, error: 'API Electron no disponible' };

  const cc = countryCode.replace('+', '') || '52';
  const formattedPhone = formatPhoneForWhatsapp(phone, cc);
  const sym = config.currencySymbol || '$';
  const shopName = config.storeName || 'FixManager';

  // 1. Formatear texto de caption/resumen
  let text = `📦 *${shopName}* - Cotización de Productos\n`;
  text += `------------------------------------------\n`;
  if (clientName.trim()) {
    text += `👤 *Cliente:* ${clientName.trim()}\n\n`;
  }
  text += `*Artículos:*\n`;
  items.forEach(cartItem => {
    const itemPrice = cartItem.item.price;
    text += `• ${cartItem.quantity}x ${cartItem.item.name} (${sym}${itemPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) - Subtotal: ${sym}${(cartItem.quantity * itemPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n`;
  });
  
  if (discount && discount > 0) {
    text += `\nDescuento: -${sym}${discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }
  text += `\n*TOTAL:* *${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}*\n`;
  text += `------------------------------------------\n`;
  if (notes?.trim()) {
    text += `📝 *Notas:* ${notes.trim()}\n\n`;
  }
  text += `Quedamos a tus órdenes para cualquier duda o apartado. 😊`;

  // 2. Generar el ticket de cotización
  const tempSale = {
    id: `COT-${Math.floor(100000 + Math.random() * 900000)}`,
    items: items.map(cartItem => {
      return {
        description: cartItem.item.name,
        name: cartItem.item.name,
        quantity: cartItem.quantity,
        price: cartItem.item.price,
        originalPrice: (cartItem as any).basePrice ?? cartItem.item.price,
        discountValue: (cartItem as any).lineDiscountValue,
        discountType: (cartItem as any).lineDiscountType,
        fromWarehouseId: cartItem.fromWarehouseId
      };
    }),
    total: total,
    createdAt: new Date().toISOString(),
    notes: notes || undefined,
    discount: discount || undefined,
    discountType: discountType || undefined,
    discountValue: discountValue || undefined,
    createdBy: createdBy || undefined
  };

  const html = buildPosTicketHtml(tempSale, config, warehouses, true);

  const mode = config.whatsappMode || 'integrated';

  if (mode === 'integrated') {
    showUiToast('Generando imagen de cotización…', 'info');
    const imgBase64 = await renderHtmlToBase64(html);
    if (!imgBase64) {
      showUiToast('Error al generar imagen de cotización', 'error');
      return { ok: false, error: 'Error al renderizar' };
    }

    showUiToast('Enviando cotización por WhatsApp…', 'info');
    const res = await api.whatsappSendMessage(formattedPhone, '', imgBase64);
    if (res?.success) {
      showUiToast('¡Cotización enviada por WhatsApp!', 'success');
      return { ok: true };
    } else {
      showUiToast('Error al enviar. Abriendo WhatsApp Web...', 'error');
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      if (api.openExternal) api.openExternal(waUrl);
      else window.open(waUrl, '_blank');
      return { ok: true };
    }
  } else {
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    if (api.openExternal) api.openExternal(waUrl);
    else window.open(waUrl, '_blank');
    return { ok: true };
  }
}


/**
 * Realiza el envío del mensaje en segundo plano utilizando una API/Pasarela externa (Método Automático).
 */
/**
 * Muestra una notificación emergente visual (toast) en la interfaz de usuario.
 */
export function showUiToast(message: string, type: 'success' | 'error' | 'info') {
  try {
    const toast = document.createElement('div');
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '💬';
    const bgColor = type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#25D366';
    const border = type === 'success' ? '1px solid rgba(16,185,129,0.3)' : type === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(37,211,102,0.4)';
    
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;color:#fff;">
        <span style="font-size:20px;flex-shrink:0;">${icon}</span>
        <div style="font-size:12px;font-weight:700;line-height:1.4;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${message}</div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      z-index: 999999;
      padding: 14px 22px;
      border-radius: 12px;
      background: ${bgColor};
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4);
      border: ${border};
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      pointer-events: none;
    `;
    
    document.body.appendChild(toast);
    
    // Forzar reflow para que la transición funcione
    toast.offsetHeight;
    
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 400);
    }, type === 'success' ? 7000 : 4500);
  } catch (e) {
    console.error('Error showing toast:', e);
  }
}

/**
 * Muestra una notificación emergente de carga (con spinner) que se queda visible hasta que se llame a su función de cierre.
 */
export function showLoadingToast(message: string): { close: () => void; update: (newMessage: string, type: 'success' | 'error') => void } {
  const toast = document.createElement('div');
  const spinnerSvg = `
    <svg style="animation: spin 1s linear infinite; width: 18px; height: 18px; color: #ffffff; display: block;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;color:#ffffff !important;">
      <span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:#ffffff !important;">${spinnerSvg}</span>
      <div id="loading-toast-text" style="font-size:12px;font-weight:700;line-height:1.4;color:#ffffff !important;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${message}</div>
    </div>
  `;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    z-index: 999999;
    padding: 14px 22px;
    border-radius: 12px;
    background: #2563eb;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.25);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
    pointer-events: none;
  `;
  
  document.body.appendChild(toast);
  toast.offsetHeight; // Forzar reflow
  
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  const close = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  };

  const update = (newMessage: string, type: 'success' | 'error') => {
    const textEl = toast.querySelector('#loading-toast-text');
    if (textEl) textEl.textContent = newMessage;
    
    const iconSpan = toast.querySelector('span');
    if (iconSpan) {
      iconSpan.innerHTML = type === 'success' ? '✅' : '❌';
    }
    
    toast.style.background = type === 'success' ? '#059669' : '#dc2626';
    toast.style.border = type === 'success' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    
    setTimeout(close, type === 'success' ? 5000 : 7000);
  };
  
  return { close, update };
}

/**
 * Realiza el envío del mensaje en segundo plano utilizando una API/Pasarela externa (Método Automático).
 */
export async function sendWhatsappAutomated(
  apiUrlOrConfig: string | WorkshopConfig,
  apiTokenOrPhone: string,
  phoneOrText: string,
  textOrImage?: string,
  defaultCountry: string = '52',
  base64Image?: string
): Promise<{ ok: boolean; error?: string }> {
  let url = '';
  let token = '';
  let recipient = '';
  let msgText = '';
  let country = defaultCountry;
  let imgBase64 = base64Image;
  let mode = 'disabled';

  if (apiUrlOrConfig && typeof apiUrlOrConfig === 'object') {
    const config = apiUrlOrConfig as WorkshopConfig;
    url = config.whatsappApiUrl || '';
    token = config.whatsappApiToken || '';
    recipient = apiTokenOrPhone;
    msgText = phoneOrText;
    country = config.whatsappDefaultCountryCode || '52';
    imgBase64 = textOrImage;
    mode = config.whatsappMode || 'disabled';
  } else {
    url = apiUrlOrConfig as string;
    token = apiTokenOrPhone;
    recipient = phoneOrText;
    msgText = textOrImage || '';
    imgBase64 = base64Image;
  }

  const formattedPhone = formatPhoneForWhatsapp(recipient, country);

  // Si está en modo Integrado nativo, enviar a través del proceso principal
  if (mode === 'integrated') {
    console.log('[WhatsApp] Enviando vía cliente nativo integrado...');
    const api = (window as any).electronAPI;
    if (api?.whatsappSendMessage) {
      try {
        const res = await api.whatsappSendMessage(formattedPhone, msgText, imgBase64);
        if (res.success) {
          return { ok: true };
        } else {
          return { ok: false, error: res.error || 'Error al enviar por WhatsApp integrado' };
        }
      } catch (err: any) {
        return { ok: false, error: err.message || err };
      }
    } else {
      return { ok: false, error: 'API de WhatsApp integrado no disponible en el proceso principal' };
    }
  }

  // Comportamiento anterior para UltraMsg / Wassenger
  try {
    const isUltraMsg = url.toLowerCase().includes('ultramsg');
    const isWassenger = url.toLowerCase().includes('wassenger');
    
    let sendUrl = url.trim();
    if (imgBase64 && isUltraMsg) {
      sendUrl = sendUrl.replace('/chat', '/image');
    }
    
    let bodyObj: any = {};
    const headers: any = { 'Content-Type': 'application/json' };
    
    if (isUltraMsg) {
      if (imgBase64) {
        bodyObj = {
          token: token.trim(),
          to: formattedPhone,
          image: imgBase64,
          caption: msgText
        };
      } else {
        bodyObj = {
          token: token.trim(),
          to: formattedPhone,
          body: msgText
        };
      }
    } else if (isWassenger) {
      headers['Token'] = token.trim();
      bodyObj = {
        phone: formattedPhone,
        message: msgText
      };
      if (imgBase64) {
        bodyObj.media = {
          file: imgBase64,
          filename: 'ticket.png'
        };
      }
    } else {
      bodyObj = {
        token: token.trim(),
        to: formattedPhone,
        phone: formattedPhone,
        body: imgBase64 || msgText,
        message: msgText,
        text: msgText,
        image: imgBase64 || undefined,
        caption: imgBase64 ? msgText : undefined
      };
    }
    
    const api = (window as any).electronAPI;
    if (api?.sendWhatsAppPost) {
      console.log('[WhatsApp] Enviando POST vía main process para evitar CORS...');
      const response = await api.sendWhatsAppPost(sendUrl, headers, JSON.stringify(bodyObj));
      if (!response.ok) {
        return { ok: false, error: response.error || `HTTP ${response.status || 'Error'}` };
      }
      return { ok: true };
    } else {
      console.log('[WhatsApp] Enlace directo de API fallback vía fetch...');
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyObj)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        return { ok: false, error: `HTTP ${response.status}: ${errText}` };
      }
      
      return { ok: true };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de conexión a la API' };
  }
}

/**
 * Despacha el mensaje de WhatsApp según la configuración seleccionada.
 * Tanto en modo 'direct' (manual) como 'automated' (API), abriremos el nuevo modal de React para confirmar el número
 * y previsualizar el ticket.
 */
export async function sendWhatsappNotification(
  config: WorkshopConfig,
  phone: string,
  text: string,
  htmlForImage?: string,
  autoAction?: boolean,
  change?: number,
  countryCode?: string,
  forceSilent?: boolean
): Promise<{ ok: boolean; error?: string; openWindow?: boolean }> {
  const mode = config.whatsappMode || 'disabled';
  if (mode === 'disabled') {
    return { ok: false, error: 'WhatsApp desactivado en la configuración' };
  }

  // Si está activo el modo integrado, verificar si debe enviarse de forma silenciosa en segundo plano
  if (mode === 'integrated') {
    const isConnected = (window as any).whatsappConnected;
    if (isConnected === false) {
      console.warn('[WhatsApp] Envío cancelado: WhatsApp Integrado no está vinculado.');
      showUiToast('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat.', 'error');
      return { ok: false, error: 'WhatsApp no está conectado' };
    }

    const isSale = text.toLowerCase().includes('ticket') || 
                   text.toLowerCase().includes('venta') || 
                   text.toLowerCase().includes('compra') || 
                   text.toLowerCase().includes('crédito') || 
                   text.toLowerCase().includes('credito') || 
                   text.toLowerCase().includes('fiado') || 
                   text.toLowerCase().includes('abono') || 
                   text.toLowerCase().includes('apartado');
    const isRepair = text.toLowerCase().includes('orden') || text.toLowerCase().includes('reparación') || text.toLowerCase().includes('estatus') || text.toLowerCase().includes('estado');
    
    const cleanedPhone = phone ? phone.replace(/\D/g, '') : '';
    const hasValidPhone = cleanedPhone.length >= 10;
    
    const shouldSendSilently = hasValidPhone && (forceSilent || (isSale && config.autoSendSaleTicket) || (isRepair && config.autoSendRepairStatus));
    
    if (shouldSendSilently) {
      console.log('[WhatsApp] Encontrado número válido, enviando notificación silenciosa en segundo plano...');
      const cc = countryCode ? countryCode.replace('+', '') : (config.whatsappDefaultCountryCode || '52');
      const formattedPhone = formatPhoneForWhatsapp(phone, cc);
      const api = (window as any).electronAPI;
      if (api?.whatsappSendMessage) {
        const loading = showLoadingToast('Generando comprobante y enviando por WhatsApp...');
        // Si hay HTML, lo renderizamos a base64 PNG y lo enviamos como imagen
        (async () => {
          try {
            let imgBase64: string | undefined;
            if (htmlForImage) {
              imgBase64 = await renderHtmlToBase64(htmlForImage);
            }
            const finalSendText = text || '';
            const res = await api.whatsappSendMessage(formattedPhone, finalSendText, imgBase64);
            if (res.success) {
              loading.update('¡Comprobante enviado por WhatsApp en segundo plano!', 'success');
            } else {
              console.error('[WhatsApp Silencioso] Error al enviar:', res.error);
              loading.update(`Error al enviar WhatsApp: ${res.error}`, 'error');
            }
          } catch (err: any) {
            console.error('[WhatsApp Silencioso] Falló el envío:', err);
            loading.update('Error de conexión con WhatsApp', 'error');
          }
        })();
        return { ok: true, openWindow: false };
      }
    }
  }
  
  // Despachar evento personalizado para que App.tsx levante el modal de React
  const finalSendText = text || '';
  window.dispatchEvent(new CustomEvent('show-whatsapp-modal', {
    detail: { phone, text: finalSendText, htmlForImage, autoAction, change, countryCode }
  }));
  
  return { ok: true, openWindow: true };
}


// ─── Helpers de Alineación para Tickets de Texto (WhatsApp Monospace) ─────────

function centerText(text: string, width: number): string {
  const clean = text.trim();
  if (clean.length >= width) return clean.substring(0, width);
  const left = Math.floor((width - clean.length) / 2);
  const right = width - clean.length - left;
  return ' '.repeat(left) + clean + ' '.repeat(right);
}

function rightAlign(leftText: string, rightText: string, width: number): string {
  const cleanLeft = leftText.trim();
  const cleanRight = rightText.trim();
  const spaceNeeded = width - cleanLeft.length - cleanRight.length;
  if (spaceNeeded <= 0) {
    const truncatedLeft = cleanLeft.substring(0, Math.max(0, width - cleanRight.length - 1)) + ' ';
    return truncatedLeft + cleanRight;
  }
  return cleanLeft + ' '.repeat(spaceNeeded) + cleanRight;
}

function wrapText(text: string, width: number): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= width) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      while (currentLine.length > width) {
        lines.push(currentLine.substring(0, width));
        currentLine = currentLine.substring(width);
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Plantillas de Mensajes ───────────────────────────────────────────────────

/**
 * Mensaje de Comprobante de Venta POS.
 */
export function buildWhatsappSaleTicketMessage(sale: Sale, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(sale.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  
  let ticket = '```\n';
  // Header
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.slogan) wrapText(config.slogan, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.address) wrapText(config.address, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';
  
  ticket += '--------------------------------\n';
  ticket += centerText('TICKET DE VENTA', 32) + '\n';
  ticket += '--------------------------------\n';
  
  ticket += `Folio: #${sale.ticketNumber || sale.id}\n`;
  ticket += `Fecha: ${fecha} ${hora}\n`;
  if (sale.paymentMethod) {
    const metodoText = (sale.paymentMethod === 'Múltiple' || sale.paymentMethod === 'Mixto') && sale.confirmationCode
      ? sale.confirmationCode
      : sale.paymentMethod;
    ticket += `Pago: ${metodoText}\n`;
  }
  ticket += '--------------------------------\n';
  ticket += rightAlign('Artículos', 'Total', 32) + '\n';
  ticket += '--------------------------------\n';
  
  sale.items.forEach(i => {
    const qtyText = `${i.quantity}x `;
    const descText = i.name || '';
    const priceText = `${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const availableWidth = 32 - qtyText.length - priceText.length;
    const descLines = wrapText(descText, availableWidth);
    if (descLines.length > 0) {
      ticket += rightAlign(qtyText + descLines[0], priceText, 32) + '\n';
      for (let j = 1; j < descLines.length; j++) {
        ticket += ' '.repeat(qtyText.length) + descLines[j] + '\n';
      }
    }

    if (i.description && i.description !== i.name) {
      const detailLines = wrapText(`(${i.description})`, 32 - 3);
      detailLines.forEach(dl => {
        ticket += `   ${dl}\n`;
      });
    }

    const discountValue = (i as any).discountValue !== undefined ? (i as any).discountValue : (i as any).lineDiscountValue;
    const discountType = (i as any).discountType || (i as any).lineDiscountType || 'percentage';
    const hasLineDiscount = discountValue !== undefined && Number(discountValue) > 0;
    if (hasLineDiscount) {
      let origPrice = (i as any).originalPrice !== undefined && Number((i as any).originalPrice) > i.price
        ? Number((i as any).originalPrice)
        : 0;
      let unitDiscountAmt = 0;
      if (origPrice > 0) {
        unitDiscountAmt = origPrice - i.price;
      } else {
        if (discountType === 'percentage') {
          const factor = 1 - Number(discountValue) / 100;
          if (factor > 0 && factor < 1) {
            origPrice = Number((i.price / factor).toFixed(2));
            unitDiscountAmt = origPrice - i.price;
          } else {
            origPrice = i.price;
            unitDiscountAmt = 0;
          }
        } else {
          unitDiscountAmt = Number(discountValue);
          origPrice = i.price + unitDiscountAmt;
        }
      }
      const totalDiscountAmt = unitDiscountAmt * i.quantity;
      const origStr = origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unitDescStr = unitDiscountAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const finalStr = i.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalDescStr = totalDiscountAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let descDetail = '';
      if (discountType === 'percentage') {
        descDetail = `${sym}${origStr} - ${discountValue}% = ${sym}${finalStr}`;
      } else {
        descDetail = `${sym}${origStr} - ${sym}${unitDescStr} = ${sym}${finalStr}`;
      }
      if (i.quantity > 1) {
        descDetail += ` (Ahorro: -${sym}${totalDescStr})`;
      }
      ticket += `   └─ Desc: ${descDetail}\n`;
    }
  });
  
  ticket += '--------------------------------\n';
  
  const itemsSubtotal = (sale.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
  if (sale.discount && sale.discount > 0) {
    ticket += rightAlign('Subtotal Venta:', `${sym}${itemsSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    ticket += rightAlign(`Descuento ${sale.discountType === 'percentage' ? '(' + sale.discountValue + '%)' : ''}:`, `-${sym}${sale.discount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  }

  const taxRate = config.taxRate || 0;
  const showTax = config.showTaxRate !== false && taxRate > 0;
  if (showTax) {
    const subtotalBeforeTax = sale.total / (1 + taxRate);
    const taxAmount = sale.total - subtotalBeforeTax;
    ticket += rightAlign('Subtotal Neto:', `${sym}${subtotalBeforeTax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    ticket += rightAlign(`IVA (${(taxRate * 100).toFixed(0)}%):`, `${sym}${taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  }
  
  ticket += rightAlign('TOTAL:', `${sym}${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  
  if (sale.cashReceived !== undefined || sale.cardReceived !== undefined || sale.change !== undefined) {
    const cash = sale.cashReceived || 0;
    const card = sale.cardReceived || 0;
    const change = sale.change || 0;
    if (cash > 0) {
      ticket += rightAlign('Efectivo Recibido:', `${sym}${cash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    }
    if (card > 0) {
      ticket += rightAlign('Pago Tarjeta/T:', `${sym}${card.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    }
    if (change > 0) {
      ticket += rightAlign('CAMBIO:', `${sym}${change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    }
  }
  
  const policies = config.termsAndConditionsPOS || config.termsAndConditions || '';
  if (policies) {
    ticket += '--------------------------------\n';
    ticket += centerText('GARANTÍAS Y POLÍTICAS', 32) + '\n';
    wrapText(policies, 32).forEach(l => ticket += l + '\n');
  }
  
  ticket += '--------------------------------\n';
  const footerText = config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su preferencia!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';
  
  return ticket;
}

/**
 * Mensaje de WhatsApp para Ticket de Recarga o Pago de Servicios.
 */
export function buildWhatsappRechargeTicketMessage(sale: Sale, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(sale.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const rechargeItem = (sale.items || []).find(item => {
    const id = item.itemId || (item as any).id;
    return id && typeof id === 'string' && id.startsWith('recharge-') && id !== 'recharge-commission';
  });
  const commissionItem = (sale.items || []).find(item => {
    const id = item.itemId || (item as any).id;
    return id === 'recharge-commission';
  });

  let carrierName = rechargeItem ? rechargeItem.name.split(' $')[0] : 'RECARGA';
  if (carrierName.toUpperCase().startsWith('RECARGA ')) {
    carrierName = carrierName.slice(8);
  }

  let phoneOrReference = '';
  if (rechargeItem) {
    const firstOpenIdx = rechargeItem.name.indexOf('(');
    const lastCloseIdx = rechargeItem.name.lastIndexOf(')');
    if (firstOpenIdx !== -1 && lastCloseIdx !== -1 && lastCloseIdx > firstOpenIdx) {
      phoneOrReference = rechargeItem.name.slice(firstOpenIdx + 1, lastCloseIdx);
      if (phoneOrReference.startsWith('(') && phoneOrReference.endsWith(')')) {
        phoneOrReference = phoneOrReference.slice(1, -1);
      }
    } else {
      const parts = rechargeItem.name.split(' ');
      phoneOrReference = parts[parts.length - 1] || '';
    }
  }

  let folio = '';
  let ref = sale.id;
  if (sale.confirmationCode) {
    const folioMatch = sale.confirmationCode.match(/Folio Aut:\s*([^|]+)/i);
    const refMatch = sale.confirmationCode.match(/Ref:\s*([^|]+)/i);
    if (folioMatch) folio = folioMatch[1].trim();
    if (refMatch) ref = refMatch[1].trim();
  }

  const amount = rechargeItem ? rechargeItem.price : sale.total;
  const commission = commissionItem ? commissionItem.price : 0;
  const total = sale.total;

  const isPagoServicio = rechargeItem ? (
    rechargeItem.name.toUpperCase().includes('CFE') ||
    rechargeItem.name.toUpperCase().includes('TELMEX') ||
    rechargeItem.name.toUpperCase().includes('IZZI') ||
    rechargeItem.name.toUpperCase().includes('SERVICIO') ||
    (rechargeItem.itemId && rechargeItem.itemId.includes('cfe')) ||
    (rechargeItem.itemId && rechargeItem.itemId.includes('telmex')) ||
    (rechargeItem.itemId && rechargeItem.itemId.includes('izzi'))
  ) : false;

  const titleText = isPagoServicio ? 'COMPROBANTE DE SERVICIOS' : 'COMPROBANTE DE RECARGA';

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.slogan) wrapText(config.slogan, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.address) wrapText(config.address, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  wrapText(titleText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '--------------------------------\n';

  ticket += `Operador: ${carrierName.toUpperCase()}\n`;
  ticket += `${isPagoServicio ? 'Referencia:' : 'Celular:'} ${phoneOrReference}\n`;
  if (folio) {
    ticket += `Folio Aut: ${folio}\n`;
  }
  ticket += `ID Transacción: ${ref}\n`;
  ticket += `Fecha: ${fecha} ${hora}\n`;
  ticket += '--------------------------------\n';

  ticket += rightAlign('Monto:', `${sym}${amount.toFixed(2)}`, 32) + '\n';
  if (commission > 0) {
    ticket += rightAlign('Comisión:', `${sym}${commission.toFixed(2)}`, 32) + '\n';
  }
  ticket += rightAlign('TOTAL PAGADO:', `${sym}${total.toFixed(2)}`, 32) + '\n';

  ticket += '--------------------------------\n';
  const footerText = config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su preferencia!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';

  return ticket;
}

/**
 * Mensaje de Recepción de Equipo (Nueva Orden).
 */
export function buildWhatsappOrderReceptionMessage(order: RepairOrder, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(order.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const entrega = order.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

  const saldo = Math.max(0, order.cost - order.advancePayment);
  const cc = order.customerCountryCode ? order.customerCountryCode.replace('+', '').trim() : '';
  const isUS = cc === '1';
  let storeName = (config.storeName || 'TALLER').toUpperCase();

  if (isUS) {
    let text = `📝 *COMPROBANTE DE RECEPCIÓN - ${storeName}*\n\n`;
    text += `Hola *${order.customerName.toUpperCase()}*,\n`;
    text += `Confirmamos la recepción de tu equipo para servicio. A continuación los detalles:\n\n`;
    text += `*Folio:* #${order.id}\n`;
    text += `*Fecha:* ${fecha} ${hora}\n`;
    text += `*Entrega Promesa:* ${entrega}\n\n`;
    
    text += `*--- EQUIPO ---*\n`;
    text += `*Marca/Modelo:* ${(order.deviceBrand + ' ' + order.deviceModel).toUpperCase()}\n`;
    if (order.deviceModelNumber) {
      text += `*Mod. Técnico:* ${order.deviceModelNumber.toUpperCase()}\n`;
    }
    const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
    text += `*Tipo:* ${deviceType}\n`;
    if (order.devicePin && order.devicePin !== 'SIN CLAVE') {
      text += `*Clave de Acceso:* ${order.devicePin}\n`;
    }
    if (order.receivedAccessories && order.receivedAccessories.length > 0) {
      text += `*Accesorios:* ${order.receivedAccessories.join(', ').toUpperCase()}\n`;
    }
    text += `\n`;
    
    text += `*--- DETALLES DEL SERVICIO ---*\n`;
    text += `*Servicio:* ${order.serviceType.toUpperCase()}\n`;
    const cleanFault = order.faultDescription.replace(/^\[[^\]]*\]\s*/g, '').trim().toUpperCase();
    if (cleanFault) {
      text += `*Falla Reportada:* ${cleanFault}\n`;
    }
    text += `\n`;
    
    text += `*--- IMPORTES ---*\n`;
    text += `*Costo Servicio:* ${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    text += `*Anticipo Recibido:* ${sym}${order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    text += `*SALDO RESTANTE:* ${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
    
    if (config.phone) {
      text += `Cualquier duda, estamos a tus órdenes en el teléfono *${config.phone}*.\n`;
    }
    const footerText = config.ticketFooterService || config.ticketFooter || '¡Gracias por su confianza!';
    text += `\n_${footerText}_`;
    return text;
  }

  let ticket = '```\n';
  // Header
  storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.slogan) wrapText(config.slogan, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.address) wrapText(config.address, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  ticket += centerText('COMPROBANTE RECEPCIÓN', 32) + '\n';
  ticket += '--------------------------------\n';

  ticket += `Folio de Orden: #${order.id}\n`;
  ticket += `Fecha: ${fecha} ${hora}\n`;
  ticket += `Entrega Promesa: ${entrega}\n`;
  ticket += '--------------------------------\n';
  ticket += centerText('CLIENTE', 32) + '\n';
  
  wrapText(order.customerName.toUpperCase(), 32).forEach(l => ticket += l + '\n');
  ticket += `Tel: ${order.customerPhone}\n`;
  ticket += '--------------------------------\n';
  ticket += centerText('EQUIPO', 32) + '\n';
  
  ticket += `Marca: ${order.deviceBrand.toUpperCase()}\n`;
  ticket += `Modelo: ${order.deviceModel.toUpperCase()}\n`;
  if (order.deviceModelNumber) {
    ticket += `Mod. Técnico: ${order.deviceModelNumber.toUpperCase()}\n`;
  }
  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
  ticket += `Tipo: ${deviceType}\n`;
  if (order.devicePin && order.devicePin !== 'SIN CLAVE') {
    ticket += `Acceso: ${order.devicePin}\n`;
  }
  if (order.receivedAccessories && order.receivedAccessories.length > 0) {
    const accs = order.receivedAccessories.join(', ').toUpperCase();
    ticket += 'Accesorios:\n';
    wrapText(accs, 32).forEach(l => ticket += l + '\n');
  }
  
  ticket += '--------------------------------\n';
  ticket += centerText('SERVICIO A REALIZAR', 32) + '\n';
  
  wrapText(order.serviceType.toUpperCase(), 32).forEach(l => ticket += l + '\n');
  
  const cleanFault = order.faultDescription.replace(/^\[[^\]]*\]\s*/g, '').trim().toUpperCase();
  if (cleanFault) {
    ticket += 'Falla Reportada:\n';
    wrapText(cleanFault, 32).forEach(l => ticket += l + '\n');
  }
  
  ticket += '--------------------------------\n';
  ticket += rightAlign('Costo Servicio:', `${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('Anticipo Recibido:', `${sym}${order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('SALDO RESTANTE:', `${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += '--------------------------------\n';
  
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  if (policies) {
    ticket += centerText('TÉRMINOS Y CONDICIONES', 32) + '\n';
    wrapText(policies, 32).forEach(l => ticket += l + '\n');
    ticket += '--------------------------------\n';
  }
  
  const footerText = config.ticketFooterService || config.ticketFooter || '¡Gracias por su confianza!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';

  return ticket;
}

/**
 * Mensaje de Cambio de Estado en Reparación.
 */
export function buildWhatsappOrderStatusMessage(order: RepairOrder, status: string, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const saldo = Math.max(0, order.cost - order.advancePayment);

  const statusEmojis: Record<string, string> = {
    'Pendiente': '🕐',
    'Diagnóstico': '🔍',
    'En Reparación': '⚙️',
    'Listo': '✅',
    'Entregado': '📦',
    'Entregado y Pagado': '💚',
    'Fallido': '❌',
    'Cancelado': '🚫',
  };

  const statusTitle: Record<string, string> = {
    'Pendiente': 'ORDEN EN ESPERA',
    'Diagnóstico': 'EQUIPO EN DIAGNÓSTICO',
    'En Reparación': 'EQUIPO EN REPARACIÓN',
    'Listo': '¡EQUIPO LISTO!',
    'Entregado': 'EQUIPO ENTREGADO',
    'Entregado y Pagado': 'SERVICIO FINALIZADO',
    'Fallido': 'SERVICIO NO EXITOSO',
    'Cancelado': 'ORDEN CANCELADA / NO AUTORIZADA',
  };

  const statusText: Record<string, string> = {
    'Pendiente': 'HA INGRESADO A RECEPCIÓN Y ESTÁ EN ESPERA.',
    'Diagnóstico': 'SE ENCUENTRA EN PROCESO DE DIAGNÓSTICO TÉCNICO.',
    'En Reparación': 'YA SE ENCUENTRA EN MANTENIMIENTO O REPARACIÓN.',
    'Listo': '¡ESTÁ LISTO! YA PUEDE PASAR AL TALLER A RECOGER SU EQUIPO.',
    'Entregado': 'HA SIDO ENTREGADO AL CLIENTE.',
    'Entregado y Pagado': 'HA SIDO LIQUIDADO Y ENTREGADO CON ÉXITO.',
    'Fallido': 'NO PUDO SER REPARADO TRAS LOS DIAGNÓSTICOS.',
    'Cancelado': 'HA SIDO REGISTRADO COMO CANCELADO / NO AUTORIZADO. SU EQUIPO SE ENCUENTRA DISPONIBLE EN EL TALLER PARA SU DEVOLUCIÓN.',
  };

  const emoji = statusEmojis[status] || '🔄';
  const title = statusTitle[status] || 'ACTUALIZACIÓN';
  const textMsg = statusText[status] || `CAMBIO DE ESTADO A: ${status.toUpperCase()}`;
  const cc = order.customerCountryCode ? order.customerCountryCode.replace('+', '').trim() : '';
  const isUS = cc === '1';
  let storeName = (config.storeName || 'TALLER').toUpperCase();

  if (isUS) {
    let text = `${emoji} *NOTIFICACIÓN DE REPARACIÓN - ${storeName}*\n\n`;
    text += `Hola *${order.customerName.toUpperCase()}*,\n`;
    text += `Te informamos sobre el estatus de tu servicio:\n\n`;
    text += `*Folio:* #${order.id}\n`;
    text += `*Equipo:* ${(order.deviceBrand + ' ' + order.deviceModel).toUpperCase()}\n`;
    text += `*Estatus:* *${title}*\n\n`;
    
    text += `${textMsg}\n\n`;
    
    if (status === 'Listo') {
      text += `*Monto a Liquidar:* *${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n\n`;
    } else if (status === 'Entregado' || status === 'Entregado y Pagado') {
      text += `*Costo Total:* *${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
      text += `*Monto Liquidado:* *${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n\n`;
    }
    
    if (config.phone) {
      text += `Cualquier duda, estamos a tus órdenes en el teléfono *${config.phone}*.\n`;
    }
    const footerText = config.ticketFooterService || config.ticketFooter || '¡Gracias por su confianza!';
    text += `\n_${footerText}_`;
    return text;
  }

  let ticket = '```\n';
  // Header
  storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';
  
  ticket += '--------------------------------\n';
  ticket += centerText(title, 32) + '\n';
  ticket += '--------------------------------\n';
  
  ticket += `Folio de Orden: #${order.id}\n`;
  ticket += `Cliente: ${order.customerName.toUpperCase()}\n`;
  ticket += `Equipo: ${order.deviceBrand} ${order.deviceModel}\n`.toUpperCase();
  ticket += '--------------------------------\n';
  
  wrapText(textMsg, 32).forEach(l => ticket += l + '\n');
  
  ticket += '--------------------------------\n';
  
  if (status === 'Listo') {
    ticket += rightAlign('Monto a Liquidar:', `${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    ticket += '--------------------------------\n';
  } else if (status === 'Entregado' || status === 'Entregado y Pagado') {
    ticket += rightAlign('Costo Total:', `${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    ticket += rightAlign('Monto Liquidado:', `${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
    ticket += '--------------------------------\n';
  }
  
  const footerText = config.ticketFooterService || config.ticketFooter || '¡Gracias por su confianza!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';
  
  return `${emoji} *NOTIFICACIÓN DE REPARACIÓN*\n${ticket}`;
}


/**
 * Mensaje de Nuevo Apartado.
 */
export function buildWhatsappApartadoMessage(apartado: ApartadoEntry, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(apartado.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const totalPaid = apartado.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, apartado.totalValue - totalPaid);

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';
  
  ticket += '--------------------------------\n';
  ticket += centerText('COMPROBANTE APARTADO', 32) + '\n';
  ticket += '--------------------------------\n';
  ticket += `Folio: #${apartado.id}\n`;
  ticket += `Fecha: ${fecha}\n`;
  if (apartado.dueDate) {
    const due = new Date(apartado.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ticket += `Vence: ${due}\n`;
  }
  ticket += '--------------------------------\n';
  ticket += `Cliente: ${apartado.clientName.toUpperCase()}\n`;
  if (apartado.clientPhone) ticket += `Tel: ${apartado.clientPhone}\n`;
  ticket += '--------------------------------\n';
  ticket += rightAlign('Producto/Concepto', 'Total', 32) + '\n';
  ticket += '--------------------------------\n';
  
  apartado.items.forEach(i => {
    const qtyText = `${i.quantity}x `;
    const descText = i.name || '';
    const priceText = `${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const availableWidth = 32 - qtyText.length - priceText.length;
    const descLines = wrapText(descText, availableWidth);
    if (descLines.length > 0) {
      ticket += rightAlign(qtyText + descLines[0], priceText, 32) + '\n';
      for (let j = 1; j < descLines.length; j++) {
        ticket += ' '.repeat(qtyText.length) + descLines[j] + '\n';
      }
    }
  });
  
  ticket += '--------------------------------\n';
  ticket += rightAlign('Valor Total:', `${sym}${apartado.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('Total Anticipos:', `${sym}${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('SALDO PENDIENTE:', `${sym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += '--------------------------------\n';
  
  const footerText = config.ticketFooter || '¡Gracias por su confianza!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';

  return `📦 *NOTIFICACIÓN DE APARTADO*\n${ticket}`;
}

/**
 * Mensaje de Abono a Apartado.
 */
export function buildWhatsappApartadoAbonoMessage(apartado: ApartadoEntry, payment: ApartadoPayment, bal: number, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(payment.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const liquidado = bal <= 0;

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  ticket += centerText('ABONO DE APARTADO', 32) + '\n';
  ticket += '--------------------------------\n';
  ticket += `Folio de Apartado: #${apartado.id}\n`;
  ticket += `Fecha de Abono: ${fecha}\n`;
  ticket += '--------------------------------\n';
  ticket += `Cliente: ${apartado.clientName.toUpperCase()}\n`;
  ticket += '--------------------------------\n';
  ticket += rightAlign('Saldo Anterior:', `${sym}${(bal + payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('Monto Abono:', `${sym}${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('Método:', payment.method.toUpperCase(), 32) + '\n';
  if (payment.note) {
    ticket += 'Ref: ' + payment.note.toUpperCase() + '\n';
  }
  ticket += '--------------------------------\n';
  ticket += rightAlign('SALDO RESTANTE:', liquidado ? 'LIQUIDADO' : `${sym}${bal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += '--------------------------------\n';
  if (liquidado) {
    ticket += centerText('🎉 ¡APARTADO LIQUIDADO!', 32) + '\n';
    ticket += '--------------------------------\n';
  }

  const footerText = config.ticketFooter || '¡Gracias por su pago!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';

  return `💵 *RECIBO DE ABONO (APARTADO)*\n${ticket}`;
}

/**
 * Mensaje de Nuevo Cargo Fiado.
 */
export function buildWhatsappFiadoCargoMessage(account: CreditAccount, entry: CreditSaleEntry, newBalance: number, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date(entry.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Calculate previous balance and current payment (if any) from history
  const entryTime = new Date(entry.createdAt).getTime();
  const otherEntries = (account.entries || []).filter(e => e.id !== entry.id);
  const otherPayments = (account.payments || []).filter(p => {
    const payTime = new Date(p.createdAt).getTime();
    return Math.abs(entryTime - payTime) > 30000;
  });
  const calcPrevBalance = Math.max(0, 
    otherEntries.reduce((s, e) => s + e.subtotal, 0) - 
    otherPayments.reduce((s, p) => s + p.amount, 0)
  );
  
  const thisPayment = (account.payments || []).find(p => {
    const payTime = new Date(p.createdAt).getTime();
    return Math.abs(entryTime - payTime) <= 30000;
  });
  const paymentAmount = thisPayment ? thisPayment.amount : 0;

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  ticket += centerText('CARGO A CRÉDITO', 32) + '\n';
  ticket += '--------------------------------\n';
  ticket += `Folio de Cargo: #${entry.id}\n`;
  ticket += `Fecha: ${fecha}\n`;
  ticket += '--------------------------------\n';
  ticket += `Cliente: ${account.clientName.toUpperCase()}\n`;
  if (account.clientPhone) ticket += `Tel: ${account.clientPhone}\n`;
  ticket += '--------------------------------\n';
  ticket += rightAlign('Concepto/Artículo', 'Total', 32) + '\n';
  ticket += '--------------------------------\n';

  entry.items.forEach(i => {
    const qtyText = `${i.quantity}x `;
    const descText = i.name || '';
    const priceText = `${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const availableWidth = 32 - qtyText.length - priceText.length;
    const descLines = wrapText(descText, availableWidth);
    if (descLines.length > 0) {
      ticket += rightAlign(qtyText + descLines[0], priceText, 32) + '\n';
      for (let j = 1; j < descLines.length; j++) {
        ticket += ' '.repeat(qtyText.length) + descLines[j] + '\n';
      }
    }
  });

  ticket += '--------------------------------\n';
  ticket += rightAlign('Cargo de hoy:', `${sym}${entry.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  if (calcPrevBalance > 0) {
    ticket += rightAlign('Saldo anterior:', `${sym}${calcPrevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  }
  if (paymentAmount > 0) {
    ticket += rightAlign('Abono de hoy:', `${sym}${paymentAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  }
  ticket += rightAlign('SALDO TOTAL:', `${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += '--------------------------------\n';

  const footerText = config.ticketFooter || '';
  if (footerText) {
    wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  }
  ticket += '```';

  return `💳 *CARGO DE CRÉDITO REGISTRADO*\n${ticket}`;
}

/**
 * Mensaje de Abono / Liquidación de Fiado.
 */
export function buildWhatsappFiadoAbonoMessage(
  account: CreditAccount,
  tipo: 'ABONO' | 'LIQUIDACIÓN',
  amount: number,
  prevBalance: number,
  newBalance: number,
  note: string | undefined,
  config: WorkshopConfig
): string {
  const sym = config.currencySymbol || '$';
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const liquidado = newBalance <= 0;

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  ticket += centerText(`RECIBO DE ${tipo}`, 32) + '\n';
  ticket += '--------------------------------\n';
  ticket += `Fecha: ${fecha}\n`;
  ticket += '--------------------------------\n';
  ticket += `Cliente: ${account.clientName.toUpperCase()}\n`;
  ticket += '--------------------------------\n';
  ticket += rightAlign('Saldo Anterior:', `${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += rightAlign('Monto Pagado:', `${sym}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  if (note) {
    ticket += 'Ref: ' + note.toUpperCase() + '\n';
  }
  ticket += '--------------------------------\n';
  ticket += rightAlign('SALDO PENDIENTE:', liquidado ? 'LIQUIDADO' : `${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 32) + '\n';
  ticket += '--------------------------------\n';
  if (liquidado) {
    ticket += centerText('🎉 ¡CUENTA SALDADA!', 32) + '\n';
    ticket += '--------------------------------\n';
  }

  const footerText = config.ticketFooter || '¡Gracias por su pago!';
  wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  ticket += '```';

  return `💵 *RECIBO DE PAGO (CUENTA DE CRÉDITO)*\n${ticket}`;
}

/**
 * Mensaje de Apertura de Cuenta Fiado.
 */
export function buildWhatsappFiadoAperturaMessage(account: CreditAccount, config: WorkshopConfig): string {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let ticket = '```\n';
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  wrapText(storeName, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  if (config.phone) ticket += centerText(`Tel: ${config.phone}`, 32) + '\n';

  ticket += '--------------------------------\n';
  ticket += centerText('APERTURA DE CRÉDITO', 32) + '\n';
  ticket += '--------------------------------\n';
  ticket += `Fecha: ${fecha}\n`;
  ticket += '--------------------------------\n';
  ticket += `Cliente: ${account.clientName.toUpperCase()}\n`;
  if (account.clientPhone) ticket += `Tel: ${account.clientPhone}\n`;
  ticket += '--------------------------------\n';
  ticket += centerText('CUENTA REGISTRADA', 32) + '\n';
  ticket += centerText('SALDO INICIAL: $0.00', 32) + '\n';
  ticket += '--------------------------------\n';

  const footerText = config.ticketFooter || '';
  if (footerText) {
    wrapText(footerText, 32).forEach(l => ticket += centerText(l, 32) + '\n');
  }
  ticket += '```';

  return `💳 *CUENTA DE CRÉDITO APERTURADA*\n${ticket}`;
}

