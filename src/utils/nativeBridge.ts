/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { saveEvidenceBlob, deleteEvidenceBlob } from './evidenceDb';

// Detección de plataformas
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI && !(window as any).electronAPI.isMock;
};

export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
};

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.search.includes('mobile=true')) return true;
  if (isElectron()) return false; // En la app de escritorio (Electron) siempre forzar la interfaz completa de escritorio
  return isCapacitor() || window.innerWidth <= 768;
};

// Inicializa mocks de electronAPI si estamos fuera de Electron (iOS, Android, Web)
export const initializeNativeBridge = () => {
  if (typeof window === 'undefined') return;

  if (!isElectron()) {
    console.log('[NativeBridge] Inicializando mocks de electronAPI para entorno móvil/web.');
    
    // Generar un ID único persistente para el dispositivo móvil
    let deviceId = localStorage.getItem('fixmanager_device_uuid');
    if (!deviceId) {
      deviceId = 'mob-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('fixmanager_device_uuid', deviceId);
    }

    (window as any).electronAPI = {
      isMock: true,
      platform: 'ios', // Forzar ios/android para simplificar lógica de estilos
      getApiKey: async () => '',
      openExternal: async (url: string) => {
        window.open(url, '_blank');
        return true;
      },
      onUpdateAvailable: () => {},
      getPrinters: async () => [],
      queryGeminiPrinter: async () => null,
      silentPrint: async () => ({ success: true }),
      silentPrintHtml: async () => ({ success: true }),

      // LICENCIAS
      getMachineId: async () => deviceId,
      getLicense: async () => {
        const stored = localStorage.getItem('fixmanager_license_info');
        return stored ? JSON.parse(stored) : null;
      },
      activateLicense: async (params: any) => {
        localStorage.setItem('fixmanager_license_info', JSON.stringify(params));
        return { success: true, license: params };
      },
      saveSupabaseSession: async (tokens: any) => {
        localStorage.setItem('fixmanager_supabase_session', JSON.stringify(tokens));
        return true;
      },
      getSupabaseSession: async () => {
        const tokens = localStorage.getItem('fixmanager_supabase_session');
        return tokens ? JSON.parse(tokens) : null;
      },
      getNetworkDate: async () => new Date().toISOString(),

      // ACTUALIZACIONES
      checkUpdatesManual: async () => ({ hasUpdate: false, currentVersion: '1.15.10' }),
      checkAppUpdate: async () => null,
      downloadAndInstallUpdate: async () => {},
      onUpdateProgress: () => {},
      getAppVersion: async () => '1.15.10',
      lookupDeviceInternet: async () => ({ specs: null }),

      // WHATSAPP & COMUNICACIÓN fallback web
      sendWhatsApp: async ({ url }: { url: string }) => {
        window.open(url, '_blank');
        return true;
      },
      sendWhatsAppPost: async () => ({ success: true }),
      sendTelegram: async () => ({ success: true }),
      telegramGetMe: async () => ({ ok: false }),
      telegramGetUpdates: async () => ({ ok: false }),

      // DEV
      devAuth: async () => ({ ok: true }),

      // COMPONENTES & ARCHIVOS
      confirmClose: () => {},
      printToPdf: async () => ({ success: true }),
      copyHtmlToClipboard: async () => ({ success: true }),
      readFileBase64: async () => '',
      openCashDrawer: async () => ({ success: true }),
      setLoginMode: () => {},
      setWizardMode: () => {},
      selectFolder: async () => '',
      writeBackupFile: async () => ({ success: true }),
      applyZoomFactor: () => {},
      onZoomChanged: () => {},
      onZoomReset: () => {},
      setGeminiKey: async () => true,
      getTopDevices: async () => [],
      startLocalServer: async () => ({ success: true }),
      stopLocalServer: async () => ({ success: true }),
      isServerRunning: async () => false,

      // WHATSAPP INTEGRADO
      whatsappConnect: () => {},
      getWaPreloadPath: () => '',
      getCleanUserAgent: () => navigator.userAgent,
      whatsappDisconnect: () => {},
      whatsappGetStatus: async () => ({ status: 'disconnected' }),
      onWhatsappQrCode: () => {},
      onWhatsappStatusChange: () => {},
      onWhatsappUnreadCount: () => {},
      whatsappSendMessage: async () => ({ success: true }),
      whatsappCheckNumber: async () => ({ exists: true }),
      whatsappOpenChat: () => {},
      whatsappReload: () => {},
      whatsappForceUpdate: async () => ({ success: true, message: '✅ La pasarela ya cuenta con la versión más reciente instalada.' }),
      whatsappSendDocument: async () => ({ success: true }),
      waGeneratePdfBase64: async () => '',
      waSavePdfToDownloads: async () => ({ success: true }),

      // EVIDENCIAS
      saveEvidenceMedia: async (orderId: number, fileName: string, fileBase64: string) => {
        const evId = 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        await saveEvidenceBlob(evId, fileBase64);
        
        const isVideo = fileBase64.startsWith('data:video/') || fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.mov') || fileName.toLowerCase().endsWith('.webm');
        const meta = {
          id: evId,
          name: fileName,
          url: 'db://' + evId,
          size: fileBase64.length,
          type: isVideo ? 'video' : 'image',
          timestamp: new Date().toISOString()
        };
        
        const storageKey = `fixmanager_evidences_${orderId}`;
        const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([...current, meta]));
        
        if ((window as any).onEvidenceUploadedCallback) {
          (window as any).onEvidenceUploadedCallback({ orderId, fileMeta: meta });
        }
        return { success: true, fileMeta: meta };
      },
      deleteEvidenceMedia: async (filePathOrObj: any) => {
        const pathStr = typeof filePathOrObj === 'string' ? filePathOrObj : (filePathOrObj?.filePath || '');
        if (pathStr && pathStr.startsWith('db://')) {
          const evId = pathStr.replace('db://', '');
          await deleteEvidenceBlob(evId);
        }
        return { success: true };
      },
      openEvidenceFolder: () => {},
      onEvidenceUploaded: (callback: any) => {
        (window as any).onEvidenceUploadedCallback = callback;
      },

      // SETTINGS
      saveSettings: async (configData: any) => {
        localStorage.setItem('fixmanager_config', JSON.stringify(configData));
        return true;
      },
      loadSettings: async () => {
        const data = localStorage.getItem('fixmanager_config');
        return data ? JSON.parse(data) : null;
      },

      // SOPORTE P2P NO-OP
      getDesktopSources: async () => [],
      simulateMouse: () => {},
      simulateKeyboard: () => {},
      listRemoteDir: async () => [],
      readRemoteChunk: async () => '',
      writeRemoteChunk: async () => true,
      deleteRemoteFile: async () => true,
      zipRemoteDir: async () => '',
    };
  }
};
