const { ipcRenderer, webFrame } = require('electron');

// Anular la API de notificaciones HTML5 para evitar alertas del sistema en segundo plano
try {
  const noop = () => {};
  window.Notification = noop;
  window.Notification.permission = 'denied';
  window.Notification.requestPermission = () => Promise.resolve('denied');
} catch (e) {
  console.error('[WhatsApp Preload] No se pudo anular window.Notification:', e);
}

// Inyectar wppconnect-wa.js y script de control cuando el DOM esté listo
const injectWpp = () => {
  try {
    // Solicitar el contenido de wppconnect-wa.js al proceso principal de forma síncrona
    const wppJs = ipcRenderer.sendSync('get-wpp-js-content');
    if (!wppJs) {
      throw new Error('El proceso principal devolvió un script WPP vacío');
    }
    
    // Ejecutar WPPConnect en la página
    webFrame.executeJavaScript(wppJs)
      .then(() => {
        console.log('[WhatsApp Preload] wppconnect-wa.js inyectado exitosamente.');
        
        // Ejecutar script adicional para verificar estado y reportar cambios mediante postMessage
        webFrame.executeJavaScript(`
          (() => {
            try {
              if (window.Notification) {
                const Dummy = function(title, options) {
                  console.log('[WhatsApp Inject] Notificación de sistema silenciada:', title);
                };
                Dummy.permission = 'granted';
                Dummy.requestPermission = (cb) => {
                  if (cb) cb('granted');
                  return Promise.resolve('granted');
                };
                window.Notification = Dummy;
              }
            } catch (e) {
              console.error('[WhatsApp Inject] Error anulando Notification:', e);
            }

            let attempts = 0;
            let initialized = false;
            let checkInterval = null;

            const checkStatus = () => {
              if (initialized) {
                if (checkInterval) {
                  clearInterval(checkInterval);
                  checkInterval = null;
                }
                return;
              }

              if (typeof window.WPP !== 'undefined' && window.WPP.isReady) {
                console.log('[WhatsApp Inject] WPP está listo, iniciando checkStatus...');
                initialized = true;
                if (checkInterval) {
                  clearInterval(checkInterval);
                  checkInterval = null;
                }
                
                let lastStatus = null;
                let lastPhone = null;
                let lastUnread = null;

                const getStatus = () => {
                  try {
                    if (!window.WPP || !window.WPP.conn) return 'DISCONNECTED';

                    // Si hay un QR visible en pantalla, definitivamente no está conectado
                    const isQrVisible = !!(document.querySelector('canvas[aria-label], div[data-ref], [data-testid="qrcode"]'));
                    if (isQrVisible) {
                      return 'DISCONNECTED';
                    }

                    const wid = typeof window.WPP.conn.getMyUserWid === 'function' ? window.WPP.conn.getMyUserWid() : null;
                    const hasWidUser = !!(wid && (wid.user || (typeof wid._serialized === 'string' && wid._serialized.includes('@'))));

                    if (!hasWidUser) {
                      return 'DISCONNECTED';
                    }

                    let isAuth = false;
                    if (typeof window.WPP.conn.isRegistered === 'function') {
                      isAuth = window.WPP.conn.isRegistered();
                    } else if (typeof window.WPP.conn.isMainLoaded === 'function') {
                      isAuth = window.WPP.conn.isMainLoaded();
                    } else if (typeof window.WPP.conn.isAuthenticated === 'function') {
                      isAuth = window.WPP.conn.isAuthenticated();
                    } else {
                      isAuth = true;
                    }

                    return (isAuth && hasWidUser) ? 'CONNECTED' : 'DISCONNECTED';
                  } catch (e) {
                    console.error('[WhatsApp Inject] Error getting connection status:', e);
                    return 'DISCONNECTED';
                  }
                };

                const reportUnreadCount = async () => {
                  try {
                    if (window.WPP.chat && window.WPP.chat.getUnreadChats) {
                      const unreadChats = await window.WPP.chat.getUnreadChats(false);
                      let totalUnread = 0;
                      unreadChats.forEach(c => {
                        const isArchived = c.archive === true;
                        const isMuted = c.mute && (typeof c.mute.isMuted === 'function' ? c.mute.isMuted() : c.mute.isMuted === true);
                        if (!isArchived && !isMuted) {
                          totalUnread += c.unreadCount || 0;
                        }
                      });
                      if (totalUnread !== lastUnread) {
                        lastUnread = totalUnread;
                        window.postMessage({ type: 'WA_UNREAD_COUNT', count: totalUnread }, '*');
                      }
                    }
                  } catch (err) {
                    console.error('[WhatsApp Inject] Error al calcular total unread:', err);
                  }
                };

                const report = () => {
                  const status = getStatus();
                  const wid = window.WPP.conn.getMyUserWid ? window.WPP.conn.getMyUserWid() : null;
                  const phone = wid ? (wid.user || wid.toString()) : '';
                  
                  if (status !== lastStatus || phone !== lastPhone) {
                    lastStatus = status;
                    lastPhone = phone;
                    window.postMessage({ type: 'WA_STATUS', status, phone }, '*');
                  }
                  reportUnreadCount();
                };

                window.WPP.on('conn.authenticated', report);
                window.WPP.on('conn.logout', report);
                window.WPP.on('conn.auth_code_change', (authCode) => {
                  if (authCode && authCode.fullCode) {
                    window.postMessage({ type: 'WA_QR', qr: authCode.fullCode }, '*');
                  }
                });
                window.WPP.on('conn.stream_info_changed', report);
                window.WPP.on('chat.unread_count_changed', reportUnreadCount);
                window.WPP.on('chat.new_chat', reportUnreadCount);
                
                // Polling cada 3 segundos para asegurar la consistencia del estado
                setInterval(report, 3000);
                report();
              } else {
                attempts++;
                if (attempts > 60) {
                  console.error('[WhatsApp Inject] WPP no se cargó a tiempo');
                  if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                  }
                }
              }
            };

            // Comenzar a revisar cada 1 segundo
            checkInterval = setInterval(checkStatus, 1000);
            checkStatus();
          })();
        `);
      })
      .catch(err => {
        console.error('[WhatsApp Preload] Error inyectando scripts:', err);
      });
  } catch (err) {
    console.error('[WhatsApp Preload] Error obteniendo wppconnect-wa.js:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWpp);
} else {
  injectWpp();
}



// Escuchar mensajes de window.postMessage en la página para reenviarlos al Main Process
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'WA_STATUS') {
    ipcRenderer.send('wa-status-changed', data);
  } else if (data.type === 'WA_QR') {
    ipcRenderer.send('wa-qr-received', data.qr);
  } else if (data.type === 'WA_SEND_RESULT') {
    ipcRenderer.send('wa-send-result', data);
  } else if (data.type === 'WA_UNREAD_COUNT') {
    ipcRenderer.send('wa-unread-count-changed', data.count);
  }
});

// Escuchar comandos desde el proceso principal (main.js)
ipcRenderer.on('wa-cmd-send-message', (event, { phone, text, base64Image }) => {
  let cleaned = phone;
  if (cleaned.includes('@')) {
    const [user, domain] = cleaned.split('@');
    cleaned = user.replace(/\D/g, '') + '@' + domain;
  } else {
    cleaned = cleaned.replace(/\D/g, '') + '@c.us';
  }
  const formattedPhone = cleaned;
  console.log(`[WhatsApp Preload] Intentando enviar mensaje a ${formattedPhone}`);
  
  const safePhone = JSON.stringify(formattedPhone);
  const safeText = JSON.stringify(text);
  const safeImage = base64Image ? JSON.stringify(base64Image) : 'null';
  
  webFrame.executeJavaScript(`
    (function() {
      const rawPhone = ${safePhone};
      const text = ${safeText};
      const base64Image = ${safeImage};
      if (window.WPP && window.WPP.chat) {
        
        Promise.resolve()
          .then(() => {
            if (window.WPP && window.WPP.contact && window.WPP.contact.queryWidExists) {
              const tryQuery = (p) => window.WPP.contact.queryWidExists(p).then(res => {
                if (res) {
                  if (typeof res === 'string') return res;
                  if (res._serialized) return res._serialized;
                  if (res.lid) return res.lid._serialized || (typeof res.lid.toString === 'function' ? res.lid.toString() : null);
                  if (res.wid) return res.wid._serialized || (typeof res.wid.toString === 'function' ? res.wid.toString() : null);
                  if (res.user) return res.user + '@c.us';
                }
                return null;
              }).catch(() => null);

              return tryQuery(rawPhone).then(found => {
                if (found) return found;
                // Si es México 52 + 10 dígitos y falló, probar agregando el 1 (521 + 10 dígitos)
                const userDigits = rawPhone.replace(/\D/g, '');
                if (userDigits.startsWith('52') && userDigits.length === 12 && !userDigits.startsWith('521')) {
                  const altPhone = '521' + userDigits.substring(2) + '@c.us';
                  return tryQuery(altPhone).then(altFound => altFound || rawPhone);
                }
                return rawPhone;
              });
            }
            return rawPhone;
          })
          .then(async (targetPhone) => {
            if (window.WPP && window.WPP.chat && window.WPP.chat.find) {
              try {
                await window.WPP.chat.find(targetPhone).catch(() => {});
              } catch (_) {}
            }
            if (window.WPP && window.WPP.chat && window.WPP.chat.markIsComposing) {
              console.log('[WhatsApp Inject] Marcando escribiendo...');
              try {
                window.WPP.chat.markIsComposing(targetPhone, 2000);
              } catch (e) {}
            }
            return targetPhone;
          })
          .then(targetPhone => {
            if (base64Image && window.WPP.chat.sendFileMessage) {
              console.log('[WhatsApp Inject] Enviando imagen del ticket a:', targetPhone);
              const fileDataUri = base64Image.startsWith('data:') 
                ? base64Image 
                : 'data:image/png;base64,' + base64Image;
              return window.WPP.chat.sendFileMessage(
                targetPhone,
                fileDataUri,
                {
                  type: 'image',
                  caption: text
                }
              );
            } else if (window.WPP.chat.sendTextMessage) {
              console.log('[WhatsApp Inject] Enviando mensaje de texto a:', targetPhone);
              return window.WPP.chat.sendTextMessage(targetPhone, text);
            } else {
              throw new Error('Métodos de envío de mensaje no están listos');
            }
          })
          .then(() => {
            window.postMessage({ type: 'WA_SEND_RESULT', success: true }, '*');
          })
          .catch(err => {
            console.error('[WhatsApp Inject] Error enviando mensaje:', err);
            window.postMessage({ type: 'WA_SEND_RESULT', success: false, error: err.message || err }, '*');
          });
          
      } else {
        window.postMessage({ type: 'WA_SEND_RESULT', success: false, error: 'Módulo WPP.chat no está listo' }, '*');
      }
    })();
  `);
});

ipcRenderer.on('wa-cmd-logout', () => {
  console.log('[WhatsApp Preload] Ejecutando orden de cierre de sesión...');
  webFrame.executeJavaScript(`
    if (window.WPP && window.WPP.conn && window.WPP.conn.logout) {
      window.WPP.conn.logout();
    }
  `);
});

// Enviar documento PDF al chat de WhatsApp
ipcRenderer.on('wa-cmd-send-document', (event, { phone, pdfBase64, filename }) => {
  let cleaned = phone;
  if (cleaned.includes('@')) {
    const [user, domain] = cleaned.split('@');
    cleaned = user.replace(/\D/g, '') + '@' + domain;
  } else {
    cleaned = cleaned.replace(/\D/g, '') + '@c.us';
  }
  const formattedPhone = cleaned;
  console.log(`[WhatsApp Preload] Intentando enviar PDF a ${formattedPhone}`);

  const safePhone = JSON.stringify(formattedPhone);
  const safePdf = JSON.stringify(pdfBase64);
  const safeFilename = JSON.stringify(filename || 'Cotizacion.pdf');

  webFrame.executeJavaScript(`
    (function() {
      const rawPhone = ${safePhone};
      const pdfBase64 = ${safePdf};
      const filename = ${safeFilename};
      if (window.WPP && window.WPP.chat) {
        Promise.resolve()
          .then(() => {
            if (window.WPP && window.WPP.contact && window.WPP.contact.queryWidExists) {
              const tryQuery = (p) => window.WPP.contact.queryWidExists(p).then(res => {
                if (res) {
                  if (typeof res === 'string') return res;
                  if (res._serialized) return res._serialized;
                  if (res.lid) return res.lid._serialized || (typeof res.lid.toString === 'function' ? res.lid.toString() : null);
                  if (res.wid) return res.wid._serialized || (typeof res.wid.toString === 'function' ? res.wid.toString() : null);
                  if (res.user) return res.user + '@c.us';
                }
                return null;
              }).catch(() => null);

              return tryQuery(rawPhone).then(found => {
                if (found) return found;
                const userDigits = rawPhone.replace(/\D/g, '');
                if (userDigits.startsWith('52') && userDigits.length === 12 && !userDigits.startsWith('521')) {
                  const altPhone = '521' + userDigits.substring(2) + '@c.us';
                  return tryQuery(altPhone).then(altFound => altFound || rawPhone);
                }
                return rawPhone;
              });
            }
            return rawPhone;
          })
          .then(async (targetPhone) => {
            if (window.WPP && window.WPP.chat && window.WPP.chat.find) {
              try {
                await window.WPP.chat.find(targetPhone).catch(() => {});
              } catch (_) {}
            }
            if (window.WPP && window.WPP.chat && window.WPP.chat.markIsComposing) {
              console.log('[WhatsApp Inject] Marcando escribiendo para PDF...');
              try {
                window.WPP.chat.markIsComposing(targetPhone, 2000);
              } catch (e) {}
            }
            return targetPhone;
          })
          .then(targetPhone => {
            console.log('[WhatsApp Inject] Enviando PDF a:', targetPhone);
            return window.WPP.chat.sendFileMessage(
              targetPhone,
              'data:application/pdf;base64,' + pdfBase64,
              {
                type: 'document',
                filename: filename,
                caption: ''
              }
            );
          })
          .then(() => {
            window.postMessage({ type: 'WA_SEND_RESULT', success: true }, '*');
          })
          .catch(err => {
            console.error('[WhatsApp Inject] Error enviando PDF:', err);
            window.postMessage({ type: 'WA_SEND_RESULT', success: false, error: err.message || err }, '*');
          });
      } else {
        window.postMessage({ type: 'WA_SEND_RESULT', success: false, error: 'Módulo WPP.chat no está listo' }, '*');
      }
    })();
  `);
});
