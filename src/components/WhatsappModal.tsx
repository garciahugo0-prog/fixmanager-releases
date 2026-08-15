import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Smartphone, X, Loader2 } from 'lucide-react';
import { formatPhoneForWhatsapp, sendWhatsappAutomated, showUiToast } from '../utils/whatsapp';
import { formatPhoneNumber } from '../utils/phoneFormatter';

interface WhatsappModalProps {
  modalData: {
    phone: string;
    text: string;
    htmlForImage?: string;
    documentType?: string;
    autoAction?: boolean;
    change?: number;
    countryCode?: string;
  };
  onClose: () => void;
  config: any;
}

// Helper to scope ticket CSS to prevent style leakage to the main App
const scopeCss = (cssText: string, scopeSelector: string) => {
  let cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleanCss.replace(/([^{}]+)\s*({[^{}]+})/g, (match, selectors, ruleBlock) => {
    if (selectors.trim().startsWith('@')) {
      return match;
    }
    const scopedSelectors = selectors.split(',')
      .map(sel => {
        let trimmed = sel.trim();
        if (!trimmed) return '';
        if (trimmed === 'body' || trimmed === 'html') {
          return scopeSelector;
        }
        if (trimmed === '*') {
          return `${scopeSelector} *`;
        }
        return `${scopeSelector} ${trimmed}`;
      })
      .filter(Boolean)
      .join(', ');
    return `${scopedSelectors} ${ruleBlock}`;
  });
};

// Limpia el HTML del ticket de etiquetas estructurales y procesa programáticamente
// los estilos y la desactivación del corrector ortográfico para máxima fidelidad.
const cleanHtmlForPreview = (html: string) => {
  if (!html) return '';
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const head = doc.head;
    const body = doc.body;

    // Preservar los bloques <style> que están en <head> moviéndolos a <body> antes de extraer innerHTML
    if (head && body) {
      const styles = head.querySelectorAll('style');
      styles.forEach(style => {
        body.insertBefore(style, body.firstChild);
      });
    }

    // Scopear todos los bloques <style> para evitar fugas de estilo al fondo de la App
    if (body) {
      const styleTags = body.querySelectorAll('style');
      styleTags.forEach(style => {
        style.textContent = scopeCss(style.textContent || '', '#ticket-visual-preview');
      });
      body.setAttribute('spellcheck', 'false');
    }

    // 1. Apagar spellcheck en todos los elementos
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      el.setAttribute('spellcheck', 'false');
    });

    // 2. Limpiar cualquier borde en thead y tr del encabezado para evitar líneas grises y recuadros
    const theads = doc.querySelectorAll('thead');
    theads.forEach(th => {
      (th as HTMLElement).style.setProperty('border', 'none', 'important');
    });

    const headTrs = doc.querySelectorAll('thead tr');
    headTrs.forEach(tr => {
      const el = tr as HTMLElement;
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('border-top', 'none', 'important');
      el.style.setProperty('border-bottom', 'none', 'important');
      el.style.setProperty('border-left', 'none', 'important');
      el.style.setProperty('border-right', 'none', 'important');
    });

    // 3. Aplicar bordes superiores e inferiores negros y limpios en th (header) sin bordes laterales
    const ths = doc.querySelectorAll('th');
    ths.forEach(th => {
      th.style.setProperty('border-top', '1.5px solid #000000', 'important');
      th.style.setProperty('border-bottom', '1.5px solid #000000', 'important');
      th.style.setProperty('border-left', 'none', 'important');
      th.style.setProperty('border-right', 'none', 'important');
    });

    // 4. Asegurar que las celdas del cuerpo del ticket no tengan bordes
    const tds = doc.querySelectorAll('td');
    tds.forEach(td => {
      td.style.setProperty('border', 'none', 'important');
    });

    // 5. Limpiar bordes de la tabla
    const tables = doc.querySelectorAll('table');
    tables.forEach(t => {
      t.style.setProperty('border-collapse', 'collapse', 'important');
      t.style.setProperty('border', 'none', 'important');
    });

    // 6. Centrar y dar padding al badge negro superior "TICKET DE VENTA"
    const badges = doc.querySelectorAll('.section-badge, .badge');
    badges.forEach(b => {
      const el = b as HTMLElement;
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('background-color', '#000000', 'important');
      el.style.setProperty('color', '#ffffff', 'important');
      el.style.setProperty('padding', '6px 0', 'important');
      el.style.setProperty('line-height', '1.2', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('text-align', 'center', 'important');
      
      const children = el.querySelectorAll('*');
      children.forEach(c => (c as HTMLElement).style.setProperty('color', '#ffffff', 'important'));
    });

    // 7. Centrar verticalmente y dar padding al renglón de "TOTAL:"
    const totalLines = doc.querySelectorAll('.total-line');
    totalLines.forEach(tl => {
      const el = tl as HTMLElement;
      el.style.setProperty('display', 'flex', 'important');
      el.style.setProperty('justify-content', 'space-between', 'important');
      el.style.setProperty('align-items', 'center', 'important');
      el.style.setProperty('background-color', '#000000', 'important');
      el.style.setProperty('color', '#ffffff', 'important');
      el.style.setProperty('padding', '8px 6px', 'important');
      el.style.setProperty('line-height', '1.2', 'important');
      el.style.setProperty('height', 'auto', 'important');

      const children = el.querySelectorAll('*');
      children.forEach(c => (c as HTMLElement).style.setProperty('color', '#ffffff', 'important'));
    });

    return body ? body.innerHTML : doc.documentElement.innerHTML;
  } catch (err) {
    console.error('Error al procesar DOM del ticket en previsualización:', err);
    return html;
  }
};

export function WhatsappModal({ modalData, onClose, config }: WhatsappModalProps) {
  const theme = config?.theme || 'modern';
  const themeMode = config?.themeMode || 'dark';
  const isRetro = theme === 'retro-window';
  const isLight = themeMode === 'light';
  const isFluent = theme === 'fluent';

  const [waCountry, setWaCountry] = useState(() => {
    if (modalData.countryCode) {
      return modalData.countryCode.replace('+', '');
    }
    return localStorage.getItem('last_wa_country') || '52';
  });

  const [waPhone, setWaPhone] = useState(() => {
    const raw = modalData.phone || '';
    const clean = raw.replace(/\D/g, '');
    const cc = modalData.countryCode ? modalData.countryCode.replace('+', '') : '';
    if (cc && clean.startsWith(cc) && clean.length > cc.length) {
      return formatPhoneNumber(clean.slice(cc.length));
    }
    if (!cc && clean.startsWith('52') && clean.length > 10) {
      return formatPhoneNumber(clean.slice(2));
    }
    return formatPhoneNumber(clean);
  });

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAutoSend, setIsAutoSend] = useState(!!modalData.autoAction);
  const [mobilePreCopied, setMobilePreCopied] = useState(false);

  // Determinar si es automático (bot) o manual (Web)
  const isAutomated = config.whatsappMode === 'automated' || config.whatsappMode === 'integrated';

  // Validar si el teléfono tiene exactamente 10 dígitos locales
  const cleanLocalPhone = waPhone.replace(/\D/g, '');
  const isPhoneValid = cleanLocalPhone.length === 10;

  // Obtener el teléfono final con código de país
  const getFinalPhone = () => {
    if (!isPhoneValid) return '';
    return waCountry + cleanLocalPhone;
  };

  const preCopyImageOnMobile = async () => {
    const element = document.getElementById('ticket-visual-preview');
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        });
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              setMobilePreCopied(true);
              showUiToast('¡Ticket copiado al portapapeles! Listo para pegar.', 'success');
            } catch (clipErr) {
              console.error('Clipboard write failed:', clipErr);
            }
          }
        }, 'image/png');
      } catch (err) {
        console.error('Error pre-capturing image:', err);
      }
    }
  };

  // Ejecutar los scripts incrustados en el HTML del ticket para renderizar el código de barras.
  // Al no especificar array de dependencias, se ejecuta en cada renderizado (p. ej. al escribir en el input),
  // evitando que la actualización de estado de React limpie el código de barras dibujado dinámicamente.
  useEffect(() => {
    if (modalData.htmlForImage) {
      const container = document.getElementById('ticket-visual-preview');
      if (container) {
        const scripts = container.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          try {
            const scriptContent = scripts[i].textContent || '';
            if (scriptContent.includes('C128') || scriptContent.includes('draw(')) {
              // Ejecutar el script del código de barras de forma síncrona
              const runScript = new Function(scriptContent);
              runScript();
            }
          } catch (err) {
            console.error('Error al renderizar código de barras en previsualización:', err);
          }
        }
      }
    }
  });

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  // 1. Enviar de forma automática (Bot API)
  const handleSendAutomated = async () => {
    const api = (window as any).electronAPI;
    const finalPhone = getFinalPhone();
    if (!finalPhone) {
      showUiToast('Por favor ingresa un número de celular válido.', 'error');
      return;
    }

    setIsSending(true);
    setApiError(null);

    try {
      let imageBase64: string | undefined = undefined;

      // Si hay HTML, renderizarlo a imagen usando copyHtmlToClipboard (evita parpadeos/achicamiento)
      if (modalData.htmlForImage && api?.copyHtmlToClipboard) {
        const contentWidth = getDynamicPreviewWidth() || '340px';
        const widthVal = parseInt(contentWidth);
        
        // Estilos para el renderizado del ticket (negro/blanco en badges y totales)
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
                ${modalData.htmlForImage}
              </div>
            </body>
          </html>
        `;

        const res = await api.copyHtmlToClipboard({ html: fullHtml, width: widthVal });
        if (res && res.success && res.base64) {
          imageBase64 = res.base64.split(',')[1];
        }
      }

      const response = await sendWhatsappAutomated(config, finalPhone, modalData.text, imageBase64);
      if (response.ok) {
        showUiToast('¡Ticket enviado automáticamente por WhatsApp!', 'success');
        onClose();
      } else {
        throw new Error(response.error || 'Error desconocido en el servidor de WhatsApp');
      }
    } catch (err: any) {
      console.error('[WhatsApp Automático] Falló:', err);
      setApiError(err.message || 'Error de conexión con el bot.');
      if (err.message && err.message.includes('no está registrado en WhatsApp')) {
        showUiToast('El número de destino no tiene WhatsApp activo.', 'error');
      } else {
        showUiToast('No se pudo enviar automáticamente. Usa la modalidad manual abajo.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  // 2. Copiar imagen al portapapeles y abrir enlace de WhatsApp Web
  const handleSendImageDirect = async () => {
    const api = (window as any).electronAPI;
    const finalPhone = getFinalPhone();
    if (!finalPhone) {
      showUiToast('Por favor ingresa un número de celular válido.', 'error');
      return;
    }

    setIsSending(true);

    const element = document.getElementById('ticket-visual-preview');
    if (element) {
      try {
        if (api?.copyHtmlToClipboard) {
          const contentWidth = getDynamicPreviewWidth() || '340px';
          const widthVal = parseInt(contentWidth);

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
                  ${modalData.htmlForImage}
                </div>
              </body>
            </html>
          `;

          await api.copyHtmlToClipboard({ html: fullHtml, width: widthVal });
        } else {
          // Fallback para móviles: usar html2canvas para renderizar a imagen y escribir en el portapapeles
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
          });
          
          await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      'image/png': blob
                    })
                  ]);
                } catch (clipErr) {
                  console.error('Clipboard write failed:', clipErr);
                }
              }
              resolve();
            }, 'image/png');
          });
        }
      } catch (err) {
        console.error('Error capturing image:', err);
      }
    }

    // Preparar URL y redirección nativa de WhatsApp
    const cc = modalData.countryCode ? modalData.countryCode.replace('+', '') : (config.whatsappDefaultCountryCode || '52');
    const formattedPhone = formatPhoneForWhatsapp(finalPhone, cc);
    const encodedText = encodeURIComponent(modalData.text || '');

    const nativeScheme = `whatsapp://send?phone=${formattedPhone}&text=${encodedText}`;
    const waMeUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;

    if (api?.openExternal) {
      api.openExternal(waMeUrl);
    } else {
      // Redirección nativa optimizada para móvil
      window.location.href = nativeScheme;
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = waMeUrl;
        }
      }, 1200);
    }

    showUiToast('¡WhatsApp abierto! Pega la imagen en el chat.', 'success');
    setIsSending(false);
    onClose();
  };



  const handlePrint = () => {
    if (modalData.htmlForImage) {
      window.dispatchEvent(new CustomEvent('fm-silent-print', {
        detail: { html: modalData.htmlForImage }
      }));
      showUiToast('Imprimiendo ticket de respaldo...', 'success');
    } else {
      showUiToast('No hay una versión imprimible de este ticket.', 'error');
    }
  };

  const isMediaCarta = config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado';
  
  // Detección dinámica de ancho del ticket analizando el contenido HTML a renderizar:
  // - Si el HTML contiene "size: 58mm", se renderiza a 280px.
  // - Si el HTML contiene "size: 80mm", se renderiza a 340px.
  // - Si el HTML contiene "216mm 140mm" (Media Carta), se renderiza a 500px.
  // - Si el HTML contiene "210mm 297mm" o "215.9mm 279.4mm" (Carta), se renderiza a 720px.
  const getDynamicPreviewWidth = (html?: string) => {
    if (!html) {
      const isHybrid = config.hybridPrintMode;
      const isHalfLetter = config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado';
      return isHybrid ? '720px' : isHalfLetter ? '500px' : config.ticketPaperWidth === '58mm' ? '280px' : '340px';
    }
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('size: 58mm') || lowerHtml.includes('size:58mm')) {
      return '280px';
    }
    if (lowerHtml.includes('size: 80mm') || lowerHtml.includes('size:80mm')) {
      return '340px';
    }
    if (lowerHtml.includes('210mm 297mm') || lowerHtml.includes('215.9mm 279.4mm') || lowerHtml.includes('size: letter') || lowerHtml.includes('size:letter')) {
      return '720px';
    }
    if (lowerHtml.includes('216mm 140mm')) {
      return '500px';
    }
    const isHybrid = config.hybridPrintMode;
    const isHalfLetter = config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado';
    return isHybrid ? '720px' : isHalfLetter ? '500px' : config.ticketPaperWidth === '58mm' ? '280px' : '340px';
  };

  const previewWidth = getDynamicPreviewWidth(modalData.htmlForImage);

  const isLightOrRetro = isLight || isRetro;

  // ─── AUTO-TRIGGER FOR CREATION FLOW ────────────────────────────────────────
  useEffect(() => {
    if (isAutoSend && isPhoneValid && !apiError) {
      const timer = setTimeout(() => {
        const api = (window as any).electronAPI;
        if (!api || api.isMock) {
          // En móviles/navegadores no auto-redirigimos (por restricciones de gestos de Safari),
          // pero sí podemos pre-renderizar y copiar el ticket al portapapeles automáticamente
          preCopyImageOnMobile();
        } else if (isAutomated) {
          handleSendAutomated();
        } else {
          handleSendImageDirect();
        }
      }, 700); // 700ms to ensure barcode and styles render in DOM
      return () => clearTimeout(timer);
    }
  }, [isAutoSend, isPhoneValid, apiError]);

  if (isAutoSend && isPhoneValid && !apiError) {
    const api = (window as any).electronAPI;
    const isMobileEnv = !api || api.isMock;

    if (!isMobileEnv) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 animate-fadeIn no-blur-backdrop" style={{ padding: '24px' }}>
        <div 
          className={`w-full max-w-md shadow-2xl flex flex-col items-center justify-center text-center p-8 border ${
            isLightOrRetro 
              ? 'bg-[#eaeef3] border-zinc-300 text-zinc-800' 
              : 'bg-[#121215] border-zinc-800 text-zinc-100'
          }`}
          style={{ borderRadius: '12px' }}
        >
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <h3 className="font-bold text-lg mb-2">Preparando WhatsApp...</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isAutomated 
              ? 'Enviando el comprobante digital automáticamente...' 
              : 'Generando comprobante digital y abriendo chat...'}
          </p>
          
          {/* Keep the ticket preview rendered off-screen so html2canvas can capture it with correct dimensions and stylesheet scoping */}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: previewWidth }}>
            <div 
              id="ticket-visual-preview"
              className="shadow-md border border-zinc-300 select-text"
              style={{ 
                width: previewWidth,
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '16px 20px',
                display: 'block',
                alignSelf: 'flex-start'
              }}
              spellCheck={false}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                #ticket-visual-preview {
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  padding: 16px 20px 30px 20px !important;
                  box-sizing: border-box !important;
                }
                #ticket-visual-preview div:not(.section-badge):not(.badge):not(.total-line),
                #ticket-visual-preview table,
                #ticket-visual-preview tr,
                #ticket-visual-preview td,
                #ticket-visual-preview th {
                  background-color: transparent !important;
                }
                #ticket-visual-preview th {
                  border-top: 1px solid #000000 !important;
                  border-bottom: 2px solid #000000 !important;
                  border-left: none !important;
                  border-right: none !important;
                }
                #ticket-visual-preview td {
                  border: none !important;
                }
                #ticket-visual-preview .section-badge,
                #ticket-visual-preview .badge {
                  background-color: #000000 !important;
                  color: #ffffff !important;
                  padding: 6px 0 !important;
                  line-height: 1.2 !important;
                  height: auto !important;
                  display: block !important;
                  text-align: center !important;
                }
                #ticket-visual-preview .section-badge *,
                #ticket-visual-preview .badge * {
                  color: #ffffff !important;
                }
                #ticket-visual-preview .total-line {
                  background-color: #000000 !important;
                  color: #ffffff !important;
                  padding: 8px 6px !important;
                  line-height: 1.2 !important;
                  height: auto !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: space-between !important;
                }
                #ticket-visual-preview .total-line * {
                  color: #ffffff !important;
                }
                /* Ocultamos cualquier línea de corrector ortográfico nativo */
                #ticket-visual-preview *::spelling-error {
                  text-decoration: none !important;
                  text-decoration-line: none !important;
                  -webkit-text-decorations-in-effect: none !important;
                }
                #ticket-visual-preview *::grammar-error {
                  text-decoration: none !important;
                  text-decoration-line: none !important;
                  -webkit-text-decorations-in-effect: none !important;
                }
              `}} />
              <div spellCheck={false} dangerouslySetInnerHTML={{ __html: cleanHtmlForPreview(modalData.htmlForImage || '') }} />
            </div>
          </div>
        </div>
      </div>
    );
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 animate-fadeIn no-blur-backdrop" style={{ padding: '24px' }}>
      <div 
        id="whatsapp-modal-card"
        className={`w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp max-h-[95vh] border ${
          isLightOrRetro 
            ? 'bg-[#eaeef3] border-zinc-300 text-zinc-800' 
            : 'bg-[#121215] border-zinc-800 text-zinc-100'
        }`}
        style={{ borderRadius: '12px' }}
      >
        {/* Header */}
        <div 
          className={`flex items-center gap-3 text-white ${
            isLightOrRetro 
              ? 'bg-[#000080] text-white' 
              : 'bg-[#11131e] text-white border-b border-zinc-850'
          }`}
          style={{ 
            padding: '14px 20px', 
            borderTopLeftRadius: '11px', 
            borderTopRightRadius: '11px',
            height: '52px'
          }}
        >
          <button 
            onClick={onClose}
            className="bg-white hover:bg-zinc-150 text-black font-extrabold flex items-center justify-center border border-zinc-300 transition-colors shadow-sm"
            style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '6px', 
              fontSize: '16px', 
              lineHeight: '1',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          <Smartphone className="w-5 h-5 text-white" /> 
          <span className="font-sans font-bold uppercase tracking-wider text-white" style={{ fontSize: '13.5px' }}>
            COMPARTIR TICKET POR WHATSAPP
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto flex-1 min-h-0" style={{ padding: '24px' }}>
          {mobilePreCopied && (
            <div 
              className={`p-3.5 flex items-center gap-3 border animate-fadeIn ${
                isLightOrRetro 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                  : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'
              }`}
              style={{ borderRadius: '12px' }}
            >
              <span className="text-xl">📋</span>
              <div className="flex-1 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 select-none">
                  Ticket Copiado
                </span>
                <span className="text-xs font-bold leading-tight block">
                  La imagen del ticket ya está en tu portapapeles. Presiona el botón verde abajo para abrir el chat y pegarlo.
                </span>
              </div>
            </div>
          )}
          {/* Banner de cambio a entregar al cliente */}
          {modalData.change !== undefined && modalData.change > 0 && (
            <div 
              className={`p-4 flex flex-col items-center justify-center text-center border animate-fadeIn ${
                isLightOrRetro 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-850' 
                  : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
              }`}
              style={{ borderRadius: '12px' }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 select-none">
                💵 CAMBIO A ENTREGAR AL CLIENTE
              </span>
              <span className="text-3xl font-mono font-black select-text">
                {config.currencySymbol || '$'}{modalData.change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {/* Phone Input */}
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-sans">
              Número de Celular (WhatsApp)
            </label>
            <div className="flex gap-3">
              <select
                id="whatsapp-country-select"
                value={waCountry}
                onChange={(e) => {
                  setWaCountry(e.target.value);
                  localStorage.setItem('last_wa_country', e.target.value);
                }}
                className={`text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono border ${
                  isLightOrRetro 
                    ? 'bg-white border-zinc-300 text-zinc-800' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                }`}
                style={{ padding: '8px 12px', borderRadius: '8px' }}
              >
                <option value="52">🇲🇽 México (+52)</option>
                <option value="1">🇺🇸 USA/Canadá (+1)</option>
                <option value="54">🇦🇷 Argentina (+54)</option>
                <option value="591">🇧🇴 Bolivia (+591)</option>
                <option value="55">🇧🇷 Brasil (+55)</option>
                <option value="56">🇨🇱 Chile (+56)</option>
                <option value="57">🇨🇴 Colombia (+57)</option>
                <option value="506">🇨🇷 Costa Rica (+506)</option>
                <option value="593">🇪🇨 Ecuador (+593)</option>
                <option value="34">🇪🇸 España (+34)</option>
                <option value="503">🇸🇻 El Salvador (+503)</option>
                <option value="502">🇬🇹 Guatemala (+502)</option>
                <option value="504">🇭🇳 Honduras (+504)</option>
                <option value="505">🇳🇮 Nicaragua (+505)</option>
                <option value="507">🇵🇦 Panamá (+507)</option>
                <option value="595">🇵🇾 Paraguay (+595)</option>
                <option value="51">🇵🇪 Perú (+51)</option>
                <option value="598">🇺🇾 Uruguay (+598)</option>
                <option value="58">🇻🇪 Venezuela (+58)</option>
              </select>
              <input
                type="tel"
                id="whatsapp-phone-input"
                value={waPhone}
                onChange={(e) => {
                  setWaPhone(formatPhoneNumber(e.target.value));
                  setIsAutoSend(false);
                }}
                placeholder="Número de celular (Ej. 5512345678)"
                className={`flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono border ${
                  isLightOrRetro 
                    ? 'bg-white border-zinc-300 text-zinc-800' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                }`}
                style={{ padding: '8px 16px', borderRadius: '8px' }}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
              Selecciona tu país e ingresa el número. Si el número guardado ya incluye el código de país (ej. comienza con 52), se enviará tal como está.
            </p>
          </div>

          {/* Error Message if API fails */}
          {apiError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs">
              <strong>Error de envío automático:</strong> {apiError}
            </div>
          )}

          {/* Ticket Visual Preview or plain text fallback */}
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-sans">
              VISTA PREVIA DEL TICKET DIGITAL
            </label>
            <div 
              className={`flex justify-center items-start border max-h-96 overflow-y-auto ${
                isLightOrRetro 
                  ? 'border-zinc-300' 
                  : 'border-zinc-850'
              }`}
              style={{ 
                padding: '20px', 
                borderRadius: '8px', 
                backgroundColor: isLightOrRetro ? '#808080' : '#1e1e24' 
              }}
            >
              {modalData.htmlForImage ? (
                <div 
                  id="ticket-visual-preview"
                  className="shadow-md border border-zinc-300 select-text"
                  style={{ 
                    width: previewWidth,
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    padding: '16px 20px',
                    display: 'block',
                    alignSelf: 'flex-start'
                  }}
                  spellCheck={false}
                >
                  {/* 
                    Inyectamos estilos específicos como hijos directos del ticket.
                    Esto asegura que cuando html2canvas clone el contenedor para generar la imagen,
                    el clon incluya el bloque <style> dentro de sí mismo y no pierda sus estilos.
                  */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    #ticket-visual-preview {
                      background-color: #ffffff !important;
                      color: #000000 !important;
                      padding: 16px 20px 30px 20px !important;
                      box-sizing: border-box !important;
                    }
                    #ticket-visual-preview div:not(.section-badge):not(.badge):not(.total-line),
                    #ticket-visual-preview table,
                    #ticket-visual-preview tr,
                    #ticket-visual-preview td,
                    #ticket-visual-preview th {
                      background-color: transparent !important;
                    }
                    #ticket-visual-preview th {
                      border-top: 1px solid #000000 !important;
                      border-bottom: 2px solid #000000 !important;
                      border-left: none !important;
                      border-right: none !important;
                    }
                    #ticket-visual-preview td {
                      border: none !important;
                    }
                    #ticket-visual-preview .section-badge,
                    #ticket-visual-preview .badge {
                      background-color: #000000 !important;
                      color: #ffffff !important;
                      padding: 6px 0 !important;
                      line-height: 1.2 !important;
                      height: auto !important;
                      display: block !important;
                      text-align: center !important;
                    }
                    #ticket-visual-preview .section-badge *,
                    #ticket-visual-preview .badge * {
                      color: #ffffff !important;
                    }
                    #ticket-visual-preview .total-line {
                      background-color: #000000 !important;
                      color: #ffffff !important;
                      padding: 8px 6px !important;
                      line-height: 1.2 !important;
                      height: auto !important;
                      display: flex !important;
                      align-items: center !important;
                      justify-content: space-between !important;
                    }
                    #ticket-visual-preview .total-line * {
                      color: #ffffff !important;
                    }
                    /* Ocultamos cualquier línea de corrector ortográfico nativo */
                    #ticket-visual-preview *::spelling-error {
                      text-decoration: none !important;
                      text-decoration-line: none !important;
                      -webkit-text-decorations-in-effect: none !important;
                    }
                    #ticket-visual-preview *::grammar-error {
                      text-decoration: none !important;
                      text-decoration-line: none !important;
                      -webkit-text-decorations-in-effect: none !important;
                    }
                  `}} />
                  <div spellCheck={false} dangerouslySetInnerHTML={{ __html: cleanHtmlForPreview(modalData.htmlForImage) }} />
                </div>
              ) : (
                <div 
                  id="ticket-visual-preview"
                  className="shadow-md border border-zinc-300 select-text"
                  style={{ 
                    width: previewWidth,
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    padding: '16px 20px',
                    display: 'block',
                    alignSelf: 'flex-start',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre',
                    textAlign: 'left',
                    lineHeight: 'normal'
                  }}
                  spellCheck={false}
                >
                  {modalData.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className={`flex flex-col gap-3 shrink-0 border-t ${
            isLightOrRetro 
              ? 'border-zinc-200' 
              : 'border-zinc-800'
          }`}
          style={{ 
            padding: '20px', 
            backgroundColor: isLightOrRetro ? '#eaeef3' : '#121215',
            borderBottomLeftRadius: '11px',
            borderBottomRightRadius: '11px'
          }}
        >
          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isAutomated ? (
              <>
                <button
                  onClick={handleSendAutomated}
                  disabled={!isPhoneValid || isSending}
                  className="w-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 select-none transition-all text-white font-sans"
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    cursor: !isPhoneValid || isSending ? 'not-allowed' : 'pointer',
                    backgroundColor: !isPhoneValid || isSending 
                      ? (isLightOrRetro ? '#a7f3d0' : '#064e3b') 
                      : '#059669',
                    border: `1px solid ${!isPhoneValid || isSending ? '#a7f3d0' : '#047857'}`
                  }}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" /> Enviar por WhatsApp (Automático)
                    </>
                  )}
                </button>

                {/* Botón de fallback manual por si falla la API o se prefiere manual */}
                <div className="mt-1">
                  <button
                    onClick={handleSendImageDirect}
                    disabled={!isPhoneValid || isSending}
                    className="w-full text-[11px] font-extrabold uppercase tracking-wider transition-all select-none rounded border flex items-center justify-center gap-1.5 hover:bg-zinc-100 disabled:opacity-40 active:scale-95 cursor-pointer text-zinc-700 border-zinc-300"
                    style={{ padding: '10px 12px', borderRadius: '8px' }}
                    title="Copiar imagen y abrir WhatsApp Web"
                  >
                    🖼️ Enviar Imagen Manualmente (WhatsApp Web)
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleSendImageDirect}
                  disabled={!isPhoneValid}
                  className="w-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 select-none transition-all font-sans"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: !isPhoneValid ? 'not-allowed' : 'pointer',
                    backgroundColor: !isPhoneValid 
                      ? (isLightOrRetro ? '#c2f0c2' : '#0f3a1f') 
                      : '#25D366',
                    color: !isPhoneValid ? '#58a068' : '#ffffff',
                    border: `1px solid ${!isPhoneValid ? '#addfad' : '#128C7E'}`
                  }}
                >
                  <Smartphone className="w-4 h-4" /> Enviar Imagen por WhatsApp
                </button>
              </>
            )}
          </div>

          {/* Secondary actions */}
          <div className="flex justify-between items-center gap-2 text-[11px] mt-1">
            {modalData.htmlForImage && (
              <button
                onClick={handlePrint}
                className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: isLightOrRetro ? '#f4f4f5' : '#27272a',
                  color: isLightOrRetro ? '#18181b' : '#e4e4e7',
                  border: `1px solid ${isLightOrRetro ? '#d4d4d8' : '#3f3f46'}`
                }}
                title="Imprimir ticket físico de respaldo"
              >
                🖨️ Imprimir Ticket
              </button>
            )}

            <button
              onClick={onClose}
              className="ml-auto text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-sm"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: isLightOrRetro ? '#f4f4f5' : '#27272a',
                color: isLightOrRetro ? '#18181b' : '#e4e4e7',
                border: `1px solid ${isLightOrRetro ? '#d4d4d8' : '#3f3f46'}`
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsappModal;
