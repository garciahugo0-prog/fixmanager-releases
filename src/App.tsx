/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { RecargasCustomIcon } from './components/icons/RecargasCustomIcon';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import { syncDataWithCloud } from './utils/syncEngine';
import { Printer, RefreshCw, FileDown, X, MessageSquare, Smartphone } from 'lucide-react';
import { sendTelegram, tgVentaPOS, tgVentaRecharge, tgNuevaOrden, tgCambioEstado, tgOrdenEntregada, tgStockBajo, msgProductoAgregado, tgRecepcionMultiple, tgNuevoFiado, tgAbonoFiado, tgApertura, tgMovimientoCaja } from './utils/telegram';
import { sendWhatsappNotification, buildWhatsappOrderStatusMessage, buildWhatsappOrderReceptionMessage, buildWhatsappSaleTicketMessage, buildWhatsappFiadoCargoMessage, buildWhatsappApartadoMessage, showUiToast, formatPhoneForWhatsapp } from './utils/whatsapp';
import { buildPosTicketHtml, buildRechargeTicketHtml, buildTicketHtml, buildServiceLabelHtml, buildEntryTicketHtml, buildBatchEntryTicketHtml, buildQuoteTicketHtml, buildConsolidatedTicketHtml, buildMediaCartaBatchIndividualTicketsHtml, buildLetterQuoteTicketHtml, buildApartadoTicketHtml } from './utils/ticketBuilder';
import { ActiveTab, RepairOrder, ServicePrice, InventoryItem, RefaccionItem, DonorDevice, Client, Expense, Sale, WorkshopConfig, AppUser, ADMIN_PERMISSIONS, AuditAction, AuditEntry, CorteEntry, AperturaEntry, PrintJob, Quote, QuoteDevice, CreditAccount, CreditSaleEntry, CreditPayment, ApartadoEntry, ApartadoPayment, QuoteCatalogItem, InsumoCatalogItem, ChipActivation, Warehouse } from './types';
import {
  INITIAL_CONFIG,
  INITIAL_SERVICES,
  INITIAL_ORDERS,
  INITIAL_INVENTORY,
  INITIAL_REFACCIONES,
  INITIAL_CLIENTS,
  INITIAL_EXPENSES,
  INITIAL_SALES,
  generateSampleInventory,
} from './data';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { isMobile, isCapacitor } from './utils/nativeBridge';
import { getNetworkStatusSync, subscribeToNetworkStatus } from './utils/networkStatus';
import MobileWelcomeChoice from './components/mobile/MobileWelcomeChoice';
import { RemoteSupportAgent } from './components/RemoteSupportAgent';
import { AutoUpdateModal } from './components/AutoUpdateModal';
import LoginView from './components/LoginView';
import { getIndividualAdvance } from './utils/orderHelpers';
import { hasPendingReabastoDraft, clearReabastoDraft } from './utils/reabastoDraft';
import { generateUUID, migrateLocalDataToUUIDs } from './utils/syncUtils';


// Lazy-loaded components
const MobileCloudRestore = lazy(() => import('./components/mobile/MobileCloudRestore'));
const MobileApp = lazy(() => import('./components/mobile/MobileApp'));
const MobileSetupWizard = lazy(() => import('./components/mobile/MobileSetupWizard'));
const CotizacionesView = lazy(() => import('./components/CotizacionesView'));
const CatalogoView = lazy(() => import('./components/CatalogoView'));
const CorteCajaModal = lazy(() => import('./components/CorteCajaModal'));
const NuevaView = lazy(() => import('./components/NuevaView'));
const OrdenesView = lazy(() => import('./components/OrdenesView'));
const PosView = lazy(() => import('./components/PosView'));
const RecargasView = lazy(() => import('./components/RecargasView'));
const StockView = lazy(() => import('./components/StockView'));
const RefaccionesView = lazy(() => import('./components/RefaccionesView'));
const DonantesView = lazy(() => import('./components/DonantesView'));
const PrintView = lazy(() => import('./components/PrintView'));
const ReabastecerView = lazy(() => import('./components/ReabastecerView'));
const EtiquetasView = lazy(() => import('./components/EtiquetasView'));
const AperturaCajaView = lazy(() => import('./components/AperturaCajaView'));
const ReportesView = lazy(() => import('./components/ReportesView'));
const EntregaTurnoModal = lazy(() => import('./components/EntregaTurnoModal'));
const EcoTicketModal = lazy(() => import('./components/EcoTicketModal'));
const SessionResumeView = lazy(() => import('./components/SessionResumeView'));
const FiadosView = lazy(() => import('./components/FiadosView'));
const SetupWizard = lazy(() => import('./components/SetupWizard'));
const WhatsappModal = lazy(() => import('./components/WhatsappModal'));

export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`[LocalStorage] Error saving key "${key}":`, e);
  }
};

export const safeParseJSON = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch (e) {
    console.error(`[LocalStorage] Error parsing key "${key}":`, e);
    return defaultValue;
  }
};

type AppScreen = 'welcome-choice' | 'setup' | 'login' | 'resume' | 'license' | 'apertura' | 'active' | 'cloud-restore';
// Lazy-loaded components from SecondaryViews
const PreciosView = lazy(() => import('./components/PreciosView'));
const VentasView = lazy(() => import('./components/VentasView'));
const ClientesView = lazy(() => import('./components/ClientesView'));
const CortesView = lazy(() => import('./components/CortesView'));
const GastosView = lazy(() => import('./components/GastosView'));
const MovimientoModal = lazy(() => import('./components/MovimientoModal'));
const ConfigView = lazy(() => import('./components/ConfigView'));

// Migra claves localStorage del prefijo antiguo (smartec_/smtc_) al nuevo (fixmanager_/fxmgr_)
function migrateLocalStorageKeys() {
  const keyMap: Record<string, string> = {
    smartec_setup_complete: 'fixmanager_setup_complete',
    smartec_is_caja_open: 'fixmanager_is_caja_open',
    smartec_session_closed: 'fixmanager_session_closed',
    smartec_config: 'fixmanager_config',
    smartec_users: 'fixmanager_users',
    smartec_session_id: 'fixmanager_session_id',
    smartec_saldo_inicial: 'fixmanager_saldo_inicial',
    smartec_orders: 'fixmanager_orders',
    smartec_services: 'fixmanager_services',
    smartec_inventory: 'fixmanager_inventory',
    smartec_clients: 'fixmanager_clients',
    smartec_expenses: 'fixmanager_expenses',
    smartec_sales: 'fixmanager_sales',
    smartec_cortes: 'fixmanager_cortes',
    smartec_audit: 'fixmanager_audit',
    smartec_aperturas: 'fixmanager_aperturas',
    smartec_update: 'fixmanager_update',
    smartec_replenishment_logs: 'fixmanager_replenishment_logs',
    smartec_preselected_service_id: 'fixmanager_preselected_service_id',
    smartec_pending_restore_meta: 'fixmanager_pending_restore_meta',
    smartec_pending_restore_data: 'fixmanager_pending_restore_data',
    smtc_license_v2: 'fxmgr_license_v2',
    smtc_license_info: 'fxmgr_license_info',
    smtc_renew_draft: 'fxmgr_renew_draft',
    smtc_inventory_categories: 'fxmgr_inventory_categories',
    smtc_reabasto_draft: 'fxmgr_reabasto_draft',
  };
  Object.entries(keyMap).forEach(([oldKey, newKey]) => {
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
    }
    if (val !== null) localStorage.removeItem(oldKey);
  });
}
migrateLocalStorageKeys();

const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  if (error.status === 0 || !error.status) return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('typeerror');
};

const ViewFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[200px]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      <span className="text-xs opacity-75 font-bold uppercase tracking-wider text-zinc-400">Cargando sección...</span>
    </div>
  </div>
);

const ScreenFallback = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f172a] text-white">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">Iniciando FixManager...</span>
    </div>
  </div>
);

// Migrar datos locales a UUIDs/timestamps de sincronización antes de inicializar hooks
try {
  migrateLocalDataToUUIDs();
} catch (e) {
  console.error('[Migration] Error en migración sincrónica inicial:', e);
}

export default function App() {
  const [customAlert, setCustomAlert] = useState<{ message: string; resolve: () => void } | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    const checkStatus = () => {
      if (api && api.whatsappGetStatus) {
        api.whatsappGetStatus().then((info: any) => {
          const isConnected = info && info.status === 'CONNECTED';
          (window as any).whatsappConnected = isConnected;
          (window as any).whatsappStatus = info?.status || 'DISCONNECTED';
          window.dispatchEvent(new CustomEvent('whatsapp-status-update', { detail: isConnected }));
        }).catch(() => {});
      }
    };

    checkStatus();

    let unsub: any;
    if (api && api.onWhatsappStatusChange) {
      unsub = api.onWhatsappStatusChange((info: any) => {
        const status = typeof info === 'string' ? info : (info?.status || 'DISCONNECTED');
        const isConnected = status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        (window as any).whatsappStatus = status;
        window.dispatchEvent(new CustomEvent('whatsapp-status-update', { detail: isConnected }));
      });
    }

    const interval = setInterval(checkStatus, 4000);
    window.addEventListener('focus', checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkStatus);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    window.alert = (message: string) => {
      return new Promise<void>((resolve) => {
        setCustomAlert({ message, resolve });
      });
    };

    // Ocultar barra de accesorios del teclado en dispositivos móviles e inicializar listeners
    let isKeyboardVisible = false;
    let showListener: any = null;
    let hideListener: any = null;

    if (isCapacitor()) {
      import('@capacitor/keyboard')
        .then(({ Keyboard }) => {
          Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
          Keyboard.setScroll({ isDisabled: true }).catch(() => {});

          Keyboard.addListener('keyboardWillShow', () => {
            isKeyboardVisible = true;
          }).then(listener => { showListener = listener; });

          Keyboard.addListener('keyboardWillHide', () => {
            isKeyboardVisible = false;
            // Reset del viewport de iOS WKWebView para evitar el offset residual
            // que queda después de cerrar el teclado (bug conocido con KeyboardResize.None).
            // Sin este reset, el bottom nav bar queda cortado hasta reiniciar la app.
            setTimeout(() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' } as ScrollToOptions);
              // Forzar reflow del layout para que iOS recalcule safe-area y altura
              const rootEl = document.getElementById('root') || document.documentElement;
              const prev = rootEl.style.minHeight;
              rootEl.style.minHeight = '100.001vh';
              requestAnimationFrame(() => {
                rootEl.style.minHeight = prev || '';
              });
            }, 80);
          }).then(listener => { hideListener = listener; });
        })
        .catch(() => {});
    }

    const handleTapOutside = (e: MouseEvent) => {
      if (!isKeyboardVisible) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Si tocamos otro input/textarea, dejamos que pase el clic para que se enfoque el nuevo elemento
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }

      // Detener propagación y acción por defecto para evitar clics accidentales en filas/botones
      e.preventDefault();
      e.stopPropagation();

      import('@capacitor/keyboard')
        .then(({ Keyboard }) => {
          Keyboard.hide().catch(() => {});
        })
        .catch(() => {});
    };

    if (isCapacitor()) {
      window.addEventListener('click', handleTapOutside, true); // Interceptar en la fase de captura
      return () => {
        window.removeEventListener('click', handleTapOutside, true);
        if (showListener) showListener.remove();
        if (hideListener) hideListener.remove();
      };
    }
  }, []);

  const [whatsappModalData, setWhatsappModalData] = useState<{
    phone: string;
    text: string;
    htmlForImage?: string;
    autoAction?: boolean;
    change?: number;
    countryCode?: string;
  } | null>(null);

  useEffect(() => {
    const handleShowWhatsappModal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setWhatsappModalData(detail);
    };
    window.addEventListener('show-whatsapp-modal', handleShowWhatsappModal);
    return () => window.removeEventListener('show-whatsapp-modal', handleShowWhatsappModal);
  }, []);

  const [showRemoteAutoUpdateModal, setShowRemoteAutoUpdateModal] = useState(false);
  const [remoteUpdateSignal, setRemoteUpdateSignal] = useState<any>(null);

  useEffect(() => {
    const handleRemoteUpdateTrigger = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setRemoteUpdateSignal(detail);
      setShowRemoteAutoUpdateModal(true);
    };
    window.addEventListener('fix-remote-auto-update-trigger', handleRemoteUpdateTrigger);
    return () => window.removeEventListener('fix-remote-auto-update-trigger', handleRemoteUpdateTrigger);
  }, []);

  // ── Session / Auth flow ────────────────────────────────────────────────────
  const [appScreen, setAppScreen] = useState<AppScreen>(() => {
    const hasExistingData = Boolean(
      localStorage.getItem('fixmanager_config') ||
      localStorage.getItem('workshop_config') ||
      localStorage.getItem('fixmanager_inventory') ||
      localStorage.getItem('fixmanager_orders') ||
      localStorage.getItem('fixmanager_users') ||
      localStorage.getItem('fixmanager_services') ||
      localStorage.getItem('fixmanager_clients') ||
      localStorage.getItem('fixmanager_is_caja_open') ||
      localStorage.getItem('fixmanager_setup_complete') === 'true'
    );
    if (hasExistingData) {
      localStorage.setItem('fixmanager_setup_complete', 'true');
      return 'login';
    }
    return 'welcome-choice';
  });
  // Controla el paso inicial de LicenseGate según si viene del wizard o del flujo de restauración
  const [licenseInitialStep, setLicenseInitialStep] = useState<'welcome' | 'activate' | 'restore'>('welcome');
  const [loginInitialMode, setLoginInitialMode] = useState<'login' | 'register' | 'forgot' | 'localLink'>('login');

  // Estados para restauración desde la nube en el wizard
  const [cloudRestoreEmail, setCloudRestoreEmail] = useState('');
  const [cloudRestorePassword, setCloudRestorePassword] = useState('');
  const [cloudRestoreLoading, setCloudRestoreLoading] = useState(false);
  const [cloudRestoreError, setCloudRestoreError] = useState('');
  const [cloudRestoreUser, setCloudRestoreUser] = useState<any>(null);
  const [cloudRestoreBackups, setCloudRestoreBackups] = useState<any[]>([]);
  const [cloudRestoreFetchingBackups, setCloudRestoreFetchingBackups] = useState(false);
  const [cloudRestoreApplyingId, setCloudRestoreApplyingId] = useState<string | null>(null);

  // ── Licencia ───────────────────────────────────────────────────────────────
  // 'checking' mientras carga, 'active' si válida, 'none'/'invalid'/'expired' si no
  const [licenseStatus, setLicenseStatus] = useState<'checking' | 'active' | 'none' | 'invalid' | 'expired'>('checking');
  const [licenseInfo, setLicenseInfo] = useState<Record<string, unknown> | null>(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showRenewConfirmation, setShowRenewConfirmation] = useState(false);
  // Usuario actualmente autenticado
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // ── Reloj del sistema / Monotonic Clock Check ──────────────────────────────
  const [clockTampered, setClockTampered] = useState(false);
  const [checkingClock, setCheckingClock] = useState(false);

  // Controlar modo ventana según appScreen
  useEffect(() => {
    const isWizard = appScreen === 'welcome-choice' || appScreen === 'setup' || appScreen === 'cloud-restore';
    // IMPORTANTE: No llamar setWizardMode(false) cuando estamos en login —
    // eso causaría que main.js maximice la ventana aunque debe quedarse pequeña (460x600).
    // setWizardMode(false) solo aplica cuando salimos de un wizard real hacia la app principal.
    if (isWizard || appScreen === 'active' || appScreen === 'apertura' || appScreen === 'resume') {
      (window as any).electronAPI?.setWizardMode?.(isWizard);
    }
  }, [appScreen]);


  // Listener global para recibir evidencias subidas vía QR desde dispositivos móviles (concurrente-safe)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onEvidenceUploaded) {
      api.onEvidenceUploaded((data: { orderId: string; fileMeta: any }) => {
        (window as any).addDebugLog?.(`Global listener onEvidenceUploaded: orderId=${data.orderId}, fileMeta=${JSON.stringify(data.fileMeta)}`);
        setOrders(prevOrders => {
          return prevOrders.map(o => {
            if (String(o.id) === String(data.orderId)) {
              const currentEv = o.evidence || [];
              // Evitar duplicados por si acaso el evento se retransmite
              if (currentEv.some(x => x.id === data.fileMeta.id)) {
                (window as any).addDebugLog?.(`onEvidenceUploaded: evidence already exists for ID=${data.fileMeta.id}`);
                return o;
              }
              const newEvList = [...currentEv, data.fileMeta];
              (window as any).addDebugLog?.(`onEvidenceUploaded: adding evidence to ${o.id}. New count=${newEvList.length}`);
              return {
                ...o,
                evidence: newEvList
              };
            }
            return o;
          });
        });
        showUiToast(`📷 Evidencia cargada desde el celular para orden ${data.orderId}`, 'success');
      });
    }
  }, []);

  // DEV: Ctrl+Shift+W limpia localStorage y recarga desde el wizard
  useEffect(() => {
    const isDev = window.location.port === '5099' || window.location.hostname === 'localhost';
    if (!isDev) return;
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        if (window.confirm('⚠️ ¿Borrar todos los datos y reiniciar el wizard?')) {
          localStorage.clear();
          const api = (window as any).electronAPI;
          if (api?.activateLicense) {
            await api.activateLicense({ logout: true });
          }
          await supabase.auth.signOut().catch(() => {});
          window.location.reload();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Listener global de Supabase Auth para capturar refrescos de tokens automáticos
  useEffect(() => {
    // 1. En móvil/web, intentar restaurar la sesión guardada en localStorage en el arranque
    const restoreSession = async () => {
      const api = (window as any).electronAPI;
      if (!api) {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (!data?.session) {
          const savedTokensStr = localStorage.getItem('fixmanager_mobile_session_tokens');
          if (savedTokensStr) {
            try {
              const savedTokens = JSON.parse(savedTokensStr);
              if (savedTokens?.access_token && savedTokens?.refresh_token) {
                console.log('[Supabase Auth] Restaurando sesión móvil desde localStorage...');
                await supabase.auth.setSession({
                  access_token: savedTokens.access_token,
                  refresh_token: savedTokens.refresh_token
                }).catch(() => {});
              }
            } catch (_) {}
          }
        }
      }
    };
    restoreSession();

    // 2. Registrar el listener de eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth Event]', event);
      if (session) {
        const api = (window as any).electronAPI;
        if (api?.saveSupabaseSession) {
          // Entorno de escritorio (Electron): persistir en archivo de disco
          await api.saveSupabaseSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }).catch(() => {});
        } else {
          // Entorno móvil / web: persistir en localStorage para restaurar en próximos arranques
          localStorage.setItem('fixmanager_mobile_session_tokens', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            email: session.user.email
          }));
        }
        localStorage.setItem('fixmanager_user_id', session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Función para re-comprobar el estado de la licencia contra Supabase (First Online Login)
  const recomprobarLicenciaOnline = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.getLicense) return;

    console.log('[Licencia] Iniciando verificación online (First Online Login)...');

    // Función auxiliar de reintento de conexión (Retry Policy: 3 intentos con 1s de retraso)
    const executeWithRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> => {
      let lastErr: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          if (attempt < maxRetries) {
            console.warn(`[Licencia] Intento ${attempt}/${maxRetries} falló. Reintentando en ${delayMs}ms...`, err);
            await new Promise(res => setTimeout(res, delayMs));
          }
        }
      }
      throw lastErr;
    };

    try {
      // 1. Obtener la sesión actual del cliente o intentar restaurarla desde disco
      let currentSession = (await supabase.auth.getSession().catch((e) => {
        console.error('[Licencia Debug] getSession failed:', e);
        return { data: { session: null } };
      })).data?.session;
      console.log('[Licencia Debug] Sesión inicial en memoria:', currentSession ? `user_id=${currentSession.user.id}` : 'NULL');

      if (!currentSession && api?.getSupabaseSession) {
        const stored = await api.getSupabaseSession().catch((e) => {
          console.error('[Licencia Debug] getSupabaseSession failed:', e);
          return null;
        });
        console.log('[Licencia Debug] Tokens leídos del disco:', stored ? `access_token_len=${stored.access_token?.length}, refresh_token_len=${stored.refresh_token?.length}` : 'NULL');

        if (stored?.access_token) {
          try {
            const parts = stored.access_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload?.sub) {
                localStorage.setItem('fixmanager_user_id', payload.sub);
              }
            }
          } catch (_) {}
        }
        if (stored?.access_token && stored?.refresh_token) {
          console.log('[Licencia Debug] Intentando supabase.auth.setSession...');
          const { data: sessData, error: sessErr } = await supabase.auth.setSession({
            access_token: stored.access_token,
            refresh_token: stored.refresh_token,
          }).catch((err) => {
            console.error('[Licencia Debug] setSession threw exception:', err);
            return { data: { session: null }, error: err };
          });
          if (sessErr) {
            console.error('[Licencia Debug] setSession returned error:', sessErr);
          } else {
            console.log('[Licencia Debug] setSession succeeded. User:', sessData?.session?.user?.id);
          }
          currentSession = sessData?.session;
        }
      }

      let user = currentSession?.user || (await supabase.auth.getUser().catch((e) => {
        console.error('[Licencia Debug] getUser failed:', e);
        return { data: { user: null } };
      })).data?.user;
      console.log('[Licencia Debug] Usuario resultante:', user ? `id=${user.id}, email=${user.email}` : 'NULL');
      let profile: any = null;
      let networkFailed = false;

      if (user) {
        // Intentar obtener perfil del usuario autenticado con reintentos
        try {
          const profileRes = await executeWithRetry(async () => {
            const res = await supabase
              .from('profiles')
              .select('license_status, license_expiry, app, cloud_sync_enabled')
              .eq('id', user!.id)
              .eq('app', 'fixmanager')
              .maybeSingle();
            if (res.error && isNetworkError(res.error)) throw res.error;
            return res;
          });
          profile = profileRes.data;
        } catch (err) {
          if (isNetworkError(err)) networkFailed = true;
        }
      }

      // Si no se obtuvo perfil por user.id o no hay usuario en sesión, consultar por machine_id
      if (!profile && !networkFailed) {
        const machineId = await api.getMachineId().catch(() => '');
        if (machineId) {
          try {
            const actRes = await executeWithRetry(async () => {
              const res = await supabase
                .from('activations')
                .select('user_id')
                .eq('machine_id', machineId)
                .eq('app', 'fixmanager')
                .maybeSingle();
              if (res.error && isNetworkError(res.error)) throw res.error;
              return res;
            });

            if (actRes.data?.user_id) {
              localStorage.setItem('fixmanager_user_id', actRes.data.user_id);
              const profRes = await executeWithRetry(async () => {
                const res = await supabase
                  .from('profiles')
                  .select('license_status, license_expiry, app, cloud_sync_enabled')
                  .eq('id', actRes.data!.user_id)
                  .eq('app', 'fixmanager')
                  .maybeSingle();
                if (res.error && isNetworkError(res.error)) throw res.error;
                return res;
              });
              profile = profRes.data;
            }
          } catch (err) {
            if (isNetworkError(err)) networkFailed = true;
          }
        }
      }

      // Manejo si la conexión a internet falló tras los 3 reintentos
      if (networkFailed) {
        console.warn('[Licencia] Sin conexión a internet tras reintentos. Conservando la activación local en disco.');
        // Conservar el estado de licencia local activada sin borrar el archivo de activación de disco
        return;
      }

      // Evaluación del perfil obtenido de Supabase
      if (profile) {
        const appMode = 'fixmanager';
        const isWrongApp = profile.app && profile.app !== appMode;
        const isExpired = profile.license_expiry ? new Date(profile.license_expiry) < new Date() : false;
        const isCloudInvalid = profile.license_status !== 'active' && profile.license_status !== 'trial';
        const isInvalid = isCloudInvalid || isExpired || isWrongApp;

        console.log('[Licencia] Evaluación en línea:', { isWrongApp, isExpired, isCloudInvalid, isInvalid });

        if (isInvalid) {
          localStorage.removeItem('fixmanager_cloud_sync_enabled');
          console.warn('[Licencia] Licencia vencida, suspendida o inválida en la nube. Desvinculando localmente...');
          await api.activateLicense({ logout: true });
          if (api?.saveSupabaseSession) {
            await api.saveSupabaseSession(null).catch(() => {});
          }
          await supabase.auth.signOut().catch(() => {});

          let resolvedStatus: 'none' | 'invalid' | 'expired' = 'none';
          if (isWrongApp) {
            resolvedStatus = 'invalid';
          } else if (profile.license_status === 'suspended' || profile.license_status === 'invalid') {
            resolvedStatus = 'invalid';
          } else if (profile.license_status === 'none' || !profile.license_status) {
            resolvedStatus = 'none';
          } else if (isExpired) {
            resolvedStatus = 'expired';
          }

          setLicenseStatus(resolvedStatus);
          setLicenseInfo(null);
        } else {
          const isSyncEnabledNow = !!profile.cloud_sync_enabled;
          const hasLocalSession = !!(await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data?.session;

          if (!isSyncEnabledNow && hasLocalSession) {
            console.warn('[Licencia] Sublicencia de sincronización inactiva detectada con sesión iniciada. Cambiando a estado pausado...');
            localStorage.setItem('fixmanager_cloud_sync_enabled', 'false');
            window.dispatchEvent(new Event('fixmanager_cloud_sync_paused'));
          } else {
            const wasSyncDisabled = localStorage.getItem('fixmanager_cloud_sync_enabled') === 'false';
            localStorage.setItem('fixmanager_cloud_sync_enabled', String(isSyncEnabledNow));
            if (isSyncEnabledNow && wasSyncDisabled && hasLocalSession) {
              console.log('[Licencia] Sublicencia de sincronización reactivada automáticamente.');
              window.dispatchEvent(new Event('fixmanager_cloud_sync_activated'));
            }
          }

          console.log('[Licencia] Licencia VÁLIDA en la nube. Guardando activación local...');
          const expiryDate = new Date(profile.license_expiry);
          const isLicenseVitalicia = expiryDate.getFullYear() > 2035;

          let expiryStr = '';
          if (isLicenseVitalicia) {
            const graceDate = new Date();
            graceDate.setDate(graceDate.getDate() + 30);
            const yyyy = graceDate.getFullYear();
            const mm = String(graceDate.getMonth() + 1).padStart(2, '0');
            const dd = String(graceDate.getDate()).padStart(2, '0');
            expiryStr = `${yyyy}${mm}${dd}`;
          } else {
            const yyyy = expiryDate.getFullYear();
            const mm = String(expiryDate.getMonth() + 1).padStart(2, '0');
            const dd = String(expiryDate.getDate()).padStart(2, '0');
            expiryStr = `${yyyy}${mm}${dd}`;
          }

          const activeUserId = user?.id || profile.id;
          if (activeUserId) {
            localStorage.setItem('fixmanager_user_id', activeUserId);
          }

          const refreshResult = await api.activateLicense({
            email: user?.email || profile.email || '',
            userId: activeUserId || '',
            expiry: expiryStr,
            status: profile.license_status,
            type: profile.license_status === 'trial' ? 'Prueba' : (isLicenseVitalicia ? 'Vitalicia' : 'Suscripción'),
            ownerName: user?.email || profile.email || '',
            isVitalicia: isLicenseVitalicia,
            lastOnlineCheck: new Date().toISOString(),
            app: profile.app || 'fixmanager'
          });

          if (refreshResult.success) {
            setLicenseStatus('active');
            setLicenseInfo(refreshResult.license);
          }
        }
      } else {
        // No se encontró perfil ni por usuario ni por máquina en la nube
        console.warn('[Licencia] No se encontró perfil en Supabase para este equipo/usuario.');
        const localLic = await api.getLicense().catch(() => null);
        if (localLic && (localLic.status === 'active' || localLic.status === 'trial')) {
          console.log('[Licencia] Manteniendo activación local previa registrada en este equipo.');
          setLicenseStatus(localLic.status);
          setLicenseInfo(localLic);
        } else {
          await api.activateLicense({ logout: true });
          setLicenseStatus('none');
          setLicenseInfo(null);
        }
      }
    } catch (err) {
      console.error('[Licencia] Error durante verificación First Online Login:', err);
    }
  }, [appScreen]);

  useEffect(() => {
    // 1. Detección de manipulación de hora del sistema
    const nowMs = Date.now();
    const lastOpenedStr = localStorage.getItem('fixmanager_last_opened');
    if (lastOpenedStr) {
      const lastMs = parseInt(lastOpenedStr, 10);
      // Si el reloj local está retrasado por más de 15 minutos en comparación con la última ejecución registrada
      if (nowMs < lastMs - 900000) {
        setClockTampered(true);
        setLicenseStatus('invalid');
        return;
      }
    }
    // Si la hora es coherente, registrar la hora actual
    localStorage.setItem('fixmanager_last_opened', nowMs.toString());

    // Actualizar periódicamente el registro de hora del sistema
    const clockInterval = setInterval(() => {
      const currentMs = Date.now();
      const lastMs = parseInt(localStorage.getItem('fixmanager_last_opened') || '0', 10);
      
      // Bloquear si durante la ejecución el reloj se echa hacia atrás
      if (currentMs < lastMs - 60000) {
        setClockTampered(true);
        setLicenseStatus('invalid');
      } else {
        localStorage.setItem('fixmanager_last_opened', currentMs.toString());
      }
    }, 3000); // Cada 3 segundos para reaccionar casi al instante

    const api = (window as any).electronAPI;
    if (api?.getLicense) {
      api.getLicense()
        .then(async (info: Record<string, unknown>) => {
          const localStatus = (info?.status as typeof licenseStatus) ?? 'none';
          setLicenseStatus(localStatus);
          if (localStatus === 'active') {
            setLicenseInfo(info);
          } else {
            setLicenseInfo(null);
          }
          
          // --- ALWAYS RE-CHECK ONLINE IF SUPABASE SESSION IS ACTIVE ---
          await recomprobarLicenciaOnline();
        })
        .catch(() => {
          setLicenseStatus('none');
          setLicenseInfo(null);
        });
    }

    return () => clearInterval(clockInterval);
  }, [recomprobarLicenciaOnline]);

  // Efecto para verificar si se requiere un respaldo automático diario en la nube
  useEffect(() => {
    const checkDailyBackup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // No hay sesión activa en Supabase
        
        const lastBackupStr = localStorage.getItem('fixmanager_cloud_backup_last_time');
        const now = Date.now();
        const backupInterval = 24 * 60 * 60 * 1000; // 24 horas
        
        if (!lastBackupStr || now - new Date(lastBackupStr).getTime() > backupInterval) {
          console.log('[Cloud Backup] Iniciando respaldo silencioso automático diario...');
          await uploadBackupToSupabase(true);
        }
      } catch (err) {
        console.error('[Cloud Backup] Error en verificación diaria:', err);
      }
    };
    
    if (licenseStatus === 'active' && appScreen === 'active') {
      checkDailyBackup();
    }
  }, [licenseStatus, appScreen]);

  // Polling de licencia en segundo plano: cada 60 segundos si el usuario está en la app principal
  useEffect(() => {
    if (appScreen !== 'active') return;

    // Ejecutar inmediatamente al entrar a la pantalla activa
    recomprobarLicenciaOnline();

    const licensePollInterval = setInterval(() => {
      recomprobarLicenciaOnline();
    }, 60000); // 60 segundos

    return () => clearInterval(licensePollInterval);
  }, [appScreen, recomprobarLicenciaOnline]);

  // Polling en pantalla login: detecta automáticamente cuando el admin activa/renueva
  // la licencia desde el panel, sin que el usuario tenga que hacer clic en "Licencia".
  useEffect(() => {
    if (appScreen !== 'login') return;

    const loginLicensePoll = setInterval(() => {
      recomprobarLicenciaOnline();
    }, 10000); // cada 10 segundos mientras espera en login

    return () => clearInterval(loginLicensePoll);
  }, [appScreen, recomprobarLicenciaOnline]);


  const handleLogin = (user: AppUser) => {
    // Verificar manipulación de reloj al intentar iniciar sesión
    const nowMs = Date.now();
    const lastOpenedStr = localStorage.getItem('fixmanager_last_opened');
    if (lastOpenedStr) {
      const lastMs = parseInt(lastOpenedStr, 10);
      if (nowMs < lastMs - 900000) {
        setClockTampered(true);
        setLicenseStatus('invalid');
        return;
      }
    }
    localStorage.setItem('fixmanager_last_opened', nowMs.toString());

    if (licenseStatus !== 'active') {
      setAppScreen('login');
      return;
    }
    setCurrentUser(user);
    const cajaAbierta = localStorage.getItem('fixmanager_is_caja_open') === 'true';
    setAppScreen(cajaAbierta ? 'resume' : 'apertura');
  };
  const handleResumeSession = () => {
    // Verificar manipulación de reloj al intentar resumir sesión
    const nowMs = Date.now();
    const lastOpenedStr = localStorage.getItem('fixmanager_last_opened');
    if (lastOpenedStr) {
      const lastMs = parseInt(lastOpenedStr, 10);
      if (nowMs < lastMs - 900000) {
        setClockTampered(true);
        setLicenseStatus('invalid');
        return;
      }
    }
    localStorage.setItem('fixmanager_last_opened', nowMs.toString());

    if (licenseStatus === 'active') {
      setAppScreen('active');
    } else {
      setAppScreen('login');
    }
  };

  const handleLogout = async () => {
    await uploadBackupToSupabase(true);
    setCurrentUser(null);
    setAppScreen('login');
  };
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [corteAfterAction, setCorteAfterAction] = useState<'logout' | 'resume' | undefined>(undefined);
  const [nuevaInProgress, setNuevaInProgress] = useState(false);
  const [pendingTabFromSidebar, setPendingTabFromSidebar] = useState<ActiveTab | null>(null);
  const [showNuevaExitConfirm, setShowNuevaExitConfirm] = useState(false);
  const [showReabasteceExitConfirm, setShowReabasteceExitConfirm] = useState(false);

  const handleSidebarSetActiveTab = (tab: ActiveTab) => {
    if (activeTab === 'Nueva' && nuevaInProgress && tab !== 'Nueva') {
      setPendingTabFromSidebar(tab);
      setShowNuevaExitConfirm(true);
    } else if (activeTab === 'Reabastecer' && tab !== 'Reabastecer' && hasPendingReabastoDraft()) {
      setPendingTabFromSidebar(tab);
      setShowReabasteceExitConfirm(true);
    } else {
      if (activeTab === 'Nueva' && tab !== 'Nueva') setPrefillFromQuote(null);
      setActiveTab(tab);
    }
  };

  const handleResetSetup = () => {
    localStorage.removeItem('fixmanager_setup_complete');
    setAppScreen('setup');
  };

  const handleResetApp = async () => {
    try {
      console.log('[Reset App] Subiendo copia de seguridad preventiva a la nube...');
      await uploadBackupToSupabase(true);
    } catch (err) {
      console.error('[Reset App] Error en copia de seguridad preventiva:', err);
    }
    localStorage.removeItem('fixmanager_setup_complete');
    localStorage.removeItem('fixmanager_config');
    localStorage.removeItem('fixmanager_users');
    localStorage.removeItem('selected_local_server_host');
    localStorage.removeItem('fixmanager_session_closed');
    localStorage.removeItem('fixmanager_license_info');
    localStorage.removeItem('fixmanager_is_caja_open');
    localStorage.removeItem('fixmanager_saldo_inicial');
    window.location.reload();
  };

  const handleSetupComplete = (partialConfig: Partial<WorkshopConfig>, adminUser: AppUser, extraUsers: AppUser[] = []) => {
    // Save the company config
    const newConfig = { ...INITIAL_CONFIG, ...partialConfig };
    setConfig(newConfig);
    localStorage.setItem('fixmanager_config', JSON.stringify(newConfig));

    // Save admin + any employees created in the wizard
    const newUsers = [adminUser, ...extraUsers];
    setUsers(newUsers);
    localStorage.setItem('fixmanager_users', JSON.stringify(newUsers));

    // Mark setup as completed
    localStorage.setItem('fixmanager_setup_complete', 'true');
    localStorage.setItem('fixmanager_session_closed', 'false');

    if (isMobile()) {
      // En la versión móvil, activar licencia local mock automáticamente
      const mockLicense = {
        status: 'active',
        expiry: '20991231',
        type: 'Móvil',
        ownerName: adminUser.name,
        machineId: localStorage.getItem('fixmanager_device_uuid') || 'mobile-device',
        lastOnlineCheck: new Date().toISOString(),
      };
      localStorage.setItem('fixmanager_license_info', JSON.stringify(mockLicense));
      setLicenseStatus('active');
      setLicenseInfo(mockLicense);

      // Autologin para evitar pedir PIN inmediatamente después del wizard
      setCurrentUser(adminUser);
      setAppScreen('resume');
    } else {
      // Ir a activación de licencia directamente en escritorio
      setLicenseInitialStep('activate');
      setAppScreen('login');
    }
  };

  // Navigation & Filtering States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string>(() => {
    return localStorage.getItem('fixmanager_app_version') || '1.0';
  });
  const [pendingUpdateVersion, setPendingUpdateVersion] = useState<string | null>(null);

  // Sincronizar versión real desde Electron al arrancar
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getAppVersion) {
      api.getAppVersion().then((v: string) => {
        if (v) {
          setAppVersion(v);
          localStorage.setItem('fixmanager_app_version', v);
        }
      }).catch(() => {});
    }
  }, []);

  const handlePublishVersion = () => {
    const current = parseFloat(appVersion) || 1.0;
    const next = (current + 0.1).toFixed(1);
    setAppVersion(next);
    localStorage.setItem('fixmanager_app_version', next);
    alert(`🚀 ¡Nueva versión publicada con éxito!\nVersión actual del sistema: v${next}`);
  };

  const handleExportData = async () => {
    // Siempre obtener la licencia fresca desde Electron al momento del respaldo.
    // Esto cubre: (a) activación durante la sesión actual, (b) modo dev sin estado cacheado.
    let licenseForBackup: Record<string, unknown> | null = licenseInfo;
    const api = (window as any).electronAPI;
    if (api?.getLicense) {
      try {
        const fresh = await api.getLicense();
        if (fresh?.status === 'active') licenseForBackup = fresh;
      } catch {}
    }

    let localImages = null;
    if (api?.exportLocalImages) {
      try {
        localImages = await api.exportLocalImages();
      } catch (err) {
        console.error('Error al exportar imágenes locales:', err);
      }
    }

    const backup = {
      version: appVersion,
      exportedAt: new Date().toISOString(),
      // Incluye la licencia activa para que el cliente pueda restaurarla en otra máquina
      license: licenseForBackup ? {
        type:        licenseForBackup.type,
        expiry:      licenseForBackup.expiry,
        key:         licenseForBackup.key,
        ownerName:   licenseForBackup.ownerName  || '',
        activatedAt: licenseForBackup.activatedAt || '',
        machineId:   licenseForBackup.machineId   || '',
      } : null,
      config,
      orders,
      services,
      inventory,
      clients,
      expenses,
      sales,
      cortes: cortesHistorial,
      donors: donors.map(({ imageUrl, ...rest }) => rest),
      localImages,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `fixmanaller-backup-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Restaura silenciosamente los datos de un respaldo (sin confirm, sin alerta).
   *  Usado desde LicenseGate cuando el cliente sube su respaldo para re-activar. */
  const handleRestoreFromBackup = async (data: Record<string, unknown>) => {
    try {
      const api = (window as any).electronAPI;
      let userDataPath = '';
      if (api?.importLocalImages) {
        try {
          userDataPath = await api.importLocalImages(data.localImages || {});
        } catch (err) {
          console.error('Error al importar imágenes locales:', err);
        }
      }

      let restoredOrders = data.orders as RepairOrder[];
      if (restoredOrders && userDataPath) {
        const separator = navigator.platform.includes('Win') ? '\\' : '/';
        restoredOrders = restoredOrders.map(order => {
          if (order.evidence && order.evidence.length > 0) {
            return {
              ...order,
              evidence: order.evidence.map(ev => {
                if (ev.path) {
                  const match = ev.path.match(/(?:evidences|evidence_media)[/\\][^/\\]+[/\\][^/\\]+$/i);
                  if (match) {
                    const relativePath = match[0].replace(/[/\\]/g, separator);
                    return {
                      ...ev,
                      path: userDataPath + separator + relativePath
                    };
                  }
                }
                return ev;
              })
            };
          }
          return order;
        });
      }

      if (data.config)   { const v = { ...INITIAL_CONFIG, ...(data.config as WorkshopConfig) };   setConfig(v, true);              localStorage.setItem('fixmanager_config',    JSON.stringify(v)); }
      if (restoredOrders){ setOrders(restoredOrders);                                            localStorage.setItem('fixmanager_orders',    JSON.stringify(restoredOrders)); }
      if (data.services) { setServices(data.services as ServicePrice[]);                        localStorage.setItem('fixmanager_services',  JSON.stringify(data.services)); }
      if (data.inventory){ setInventory(data.inventory as InventoryItem[]);                     localStorage.setItem('fixmanager_inventory', JSON.stringify(data.inventory)); }
      if (data.clients)  { setClients(data.clients as Client[]);                                localStorage.setItem('fixmanager_clients',   JSON.stringify(data.clients)); }
      if (data.expenses) { setExpenses(data.expenses as Expense[]);                             localStorage.setItem('fixmanager_expenses',  JSON.stringify(data.expenses)); }
      if (data.sales)    { setSales(data.sales as Sale[]);                                      localStorage.setItem('fixmanager_sales',     JSON.stringify(data.sales)); }
      if (data.cortes)   { setCortesHistorial(data.cortes as CorteEntry[]);                     localStorage.setItem('fixmanager_cortes',    JSON.stringify(data.cortes)); }
      if (data.donors)   { setDonors(data.donors as DonorDevice[]);                             localStorage.setItem('fixmanager_donors',    JSON.stringify(data.donors)); }
      
      const usersData = data.users || data.fixmanager_users;
      if (usersData) {
        setUsers(usersData as AppUser[]);
        localStorage.setItem('fixmanager_users', JSON.stringify(usersData));
      }
    } catch (e) {
      console.error('Error during backup restoration:', e);
    }
  };

  /** Realiza y sube una copia de seguridad del taller a Supabase. */
  const uploadBackupToSupabase = async (silent = true, customCortes?: CorteEntry[]) => {
    try {
      if (silent && config.cloudBackupEnabled === false) {
        return false;
      }
      let userId: string | null = null;
      const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (authData?.user?.id) {
        userId = authData.user.id;
      } else {
        const mId = licenseInfo?.machineId || localStorage.getItem('fixmanager_machine_id');
        if (mId) {
          const { data: act } = await supabase.from('activations').select('user_id').eq('machine_id', mId).maybeSingle();
          if (act?.user_id) {
            userId = act.user_id;
          }
        }
        if (!userId && (licenseInfo as any)?.user_id) {
          userId = (licenseInfo as any).user_id;
        }
      }

      if (!userId) {
        if (!silent) alert('⚠️ No se pudo realizar el respaldo en la nube: no hay una sesión de usuario activa.');
        return false;
      }

      const api = (window as any).electronAPI;
      let licenseForBackup: Record<string, unknown> | null = licenseInfo;
      if (api?.getLicense) {
        try {
          const fresh = await api.getLicense();
          if (fresh?.status === 'active') licenseForBackup = fresh;
        } catch {}
      }

      const backup = {
        version: appVersion,
        exportedAt: new Date().toISOString(),
        license: licenseForBackup ? {
          type:        licenseForBackup.type,
          expiry:      licenseForBackup.expiry,
          key:         licenseForBackup.key,
          ownerName:   licenseForBackup.ownerName  || '',
          activatedAt: licenseForBackup.activatedAt || '',
          machineId:   licenseForBackup.machineId   || '',
        } : null,
        config,
        orders,
        services,
        inventory,
        clients,
        expenses,
        sales,
        cortes: customCortes || cortesHistorial,
        donors: donors.map(({ imageUrl, ...rest }) => rest),
      };

      const osPlatform = api?.platform || navigator.platform;
      const clientInfoStr = `App v${appVersion} - ${osPlatform} - ID: ${licenseInfo?.machineId || 'N/A'}`;

      let uploadedToCloud = false;
      try {
        const { error } = await supabase
          .from('backups')
          .insert({
            user_id: userId,
            backup_data: backup,
            client_info: clientInfoStr
          });

        if (!error) {
          uploadedToCloud = true;
        } else {
          console.warn('[Cloud Backup] Error al insertar en Supabase, guardando copia local pendiente:', error);
        }
      } catch (cloudErr) {
        console.warn('[Cloud Backup] Fallo de red/Supabase, guardando copia local pendiente:', cloudErr);
      }

      if (!uploadedToCloud && api?.savePendingBackup) {
        const safeName = `pending_backup_${Date.now()}.json`;
        await api.savePendingBackup({
          filename: safeName,
          content: {
            user_id: userId,
            backup_data: backup,
            client_info: clientInfoStr,
            createdAt: new Date().toISOString()
          }
        }).catch(e => console.error('[Pending Backup] Error guardando archivo local:', e));
      }

      localStorage.setItem('fixmanager_cloud_backup_last_time', new Date().toISOString());
      if (!silent) {
        if (uploadedToCloud) {
          alert('✅ Copia de seguridad guardada en la nube con éxito.');
        } else {
          alert('💾 Copia de seguridad guardada localmente de forma segura. Se subirá automáticamente a la nube cuando haya conexión.');
        }
      }
      return true;
    } catch (err) {
      console.error('[Cloud Backup] Error en proceso de respaldo:', err);
      if (!silent) {
        alert('❌ Error al procesar la copia de seguridad: ' + (err as Error).message);
      }
      return false;
    }
  };

  const syncPendingCloudBackups = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.getPendingBackups || !api?.deletePendingBackup) return;

    try {
      const pendingItems: Array<{ filename: string; data: any }> = await api.getPendingBackups();
      if (!pendingItems || pendingItems.length === 0) return;

      console.log(`[Pending Backup Sync] Encontrados ${pendingItems.length} respaldo(s) pendiente(s). Sincronizando...`);

      for (const item of pendingItems) {
        try {
          const payload = item.data;
          if (payload?.user_id && payload?.backup_data) {
            const { error } = await supabase
              .from('backups')
              .insert({
                user_id: payload.user_id,
                backup_data: payload.backup_data,
                client_info: payload.client_info || 'Respaldo recuperado offline'
              });

            if (!error) {
              console.log(`[Pending Backup Sync] Respaldo ${item.filename} sincronizado a la nube con éxito.`);
              await api.deletePendingBackup(item.filename);
            }
          } else {
            await api.deletePendingBackup(item.filename);
          }
        } catch (err) {
          console.warn(`[Pending Backup Sync] Error subiendo ${item.filename}:`, err);
        }
      }
    } catch (e) {
      console.error('[Pending Backup Sync] Error leyendo lista de respaldos pendientes:', e);
    }
  }, []);

  const handleCloudRestoreLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudRestoreEmail || !cloudRestorePassword) {
      setCloudRestoreError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setCloudRestoreLoading(true);
    setCloudRestoreError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cloudRestoreEmail,
        password: cloudRestorePassword,
      });
      if (error) throw error;
      if (data.user) {
        const api = (window as any).electronAPI;
        if (api?.saveSupabaseSession && data.session) {
          await api.saveSupabaseSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }).catch(() => {});
        }
        
        setCloudRestoreUser(data.user);
        setCloudRestoreFetchingBackups(true);
        
        const { data: backups, error: fetchErr } = await supabase
          .from('backups')
          .select('id, backup_data, client_info, created_at')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchErr) throw fetchErr;

        if (backups && backups.length > 0) {
          const backupRecord = backups[0];
          let backupData = backupRecord.backup_data;
          if (typeof backupData === 'string') {
            try {
              backupData = JSON.parse(backupData);
            } catch (parseErr) {
              throw new Error('Formato de datos JSON corrupto en la copia de seguridad.');
            }
          }
          
          await handleRestoreFromBackup(backupData);
          
          if (backupData?.license && api?.activateLicense) {
            try {
              const actRes = await api.activateLicense(backupData.license);
              if (actRes?.license) {
                setLicenseStatus(actRes.license.status || 'active');
                setLicenseInfo(actRes.license);
              }
            } catch (err) {
              console.warn('[Cloud Restore] Error al activar la licencia del respaldo:', err);
            }
          }
          
          localStorage.setItem('fixmanager_setup_complete', 'true');
          localStorage.setItem('fixmanager_session_closed', 'false');
          
          setCloudRestoreUser(null);
          setCloudRestoreEmail('');
          setCloudRestorePassword('');
          setCloudRestoreError('');
          setCloudRestoreBackups([]);
          
          setAppScreen('login');
        } else {
          localStorage.setItem('fixmanager_setup_complete', 'false');
          setAppScreen('welcome-choice');
        }
      }
    } catch (err: any) {
      setCloudRestoreError(err.message || 'Error al iniciar sesión.');
    } finally {
      setCloudRestoreLoading(false);
      setCloudRestoreFetchingBackups(false);
    }
  };

  const handleCloudRestoreBack = () => {
    supabase.auth.signOut().catch(() => {});
    setCloudRestoreEmail('');
    setCloudRestorePassword('');
    setCloudRestoreError('');
    setCloudRestoreUser(null);
    setCloudRestoreBackups([]);
    const isSetup = localStorage.getItem('fixmanager_setup_complete') === 'true';
    setAppScreen(isSetup ? 'login' : 'welcome-choice');
  };

  const handleCloudRestoreApply = async (backupRecord: any) => {
    if (!backupRecord || !backupRecord.backup_data) {
      alert('⚠️ El respaldo seleccionado no contiene datos válidos.');
      return;
    }

    const confirmRestore = window.confirm(
      `⚠️ ATENCIÓN: Al restaurar este respaldo, se sobrescribirán TODOS los datos actuales de este equipo.\n\n` +
      `Fecha del respaldo: ${new Date(backupRecord.created_at).toLocaleString('es-MX')}\n` +
      `Dispositivo: ${backupRecord.client_info || 'Desconocido'}\n\n` +
      `¿Estás seguro de que deseas continuar?`
    );
    if (!confirmRestore) return;

    setCloudRestoreApplyingId(backupRecord.id);
    setCloudRestoreError('');

    try {
      let backupData = backupRecord.backup_data;
      if (typeof backupData === 'string') {
        try {
          backupData = JSON.parse(backupData);
        } catch (parseErr) {
          throw new Error('Formato de datos JSON corrupto en la copia de seguridad.');
        }
      }

      await handleRestoreFromBackup(backupData);

      const api = (window as any).electronAPI;
      if (backupData?.license && api?.activateLicense) {
        try {
          const actRes = await api.activateLicense(backupData.license);
          if (actRes?.license) {
            setLicenseStatus(actRes.license.status || 'active');
            setLicenseInfo(actRes.license);
          }
        } catch (err) {
          console.warn('[Cloud Restore] Error al activar la licencia del respaldo:', err);
        }
      }

      localStorage.setItem('fixmanager_setup_complete', 'true');
      localStorage.setItem('fixmanager_session_closed', 'false');

      alert('✅ Respaldo de la nube restaurado con éxito.\nAhora puedes iniciar sesión local en tu taller.');

      setCloudRestoreEmail('');
      setCloudRestorePassword('');
      setCloudRestoreUser(null);
      setCloudRestoreBackups([]);
      setCloudRestoreApplyingId(null);

      // Redirigir de inmediato a la pantalla de inicio de sesión
      setAppScreen('login');
      await recomprobarLicenciaOnline();
    } catch (err: any) {
      console.error('[Cloud Restore] Error al restaurar respaldo:', err);
      const errMsg = err.message || 'Error al aplicar el respaldo.';
      alert('❌ Error al aplicar el respaldo: ' + errMsg);
      setCloudRestoreError(errMsg);
      setCloudRestoreApplyingId(null);
    }
  };

const handleImportData = (mode: 'merge' | 'restore') => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);

        // ── PREVIEW antes de confirmar ────────────────────────────────
        const counts: string[] = [];
        if (data.orders?.length)    counts.push(`📋 Órdenes: ${data.orders.length}`);
        if (data.sales?.length)     counts.push(`🛒 Ventas: ${data.sales.length}`);
        if (data.inventory?.length) counts.push(`📦 Inventario: ${data.inventory.length} productos`);
        if (data.services?.length)  counts.push(`✂️ Servicios: ${data.services.length}`);
        if (data.clients?.length)   counts.push(`👤 Clientes: ${data.clients.length}`);
        if (data.expenses?.length)  counts.push(`💸 Gastos: ${data.expenses.length}`);
        if (data.cortes?.length)    counts.push(`🏦 Cortes: ${data.cortes.length}`);
        if (data.config)            counts.push(`⚙️ Configuración incluida`);

        const previewLines = counts.length ? counts.join('\n') : '(Sin datos reconocidos)';
        const modeLabel = mode === 'restore'
          ? '⚠️ RESTAURACIÓN COMPLETA — borrará TODOS los datos actuales'
          : '🔀 FUSIONAR — agrega datos nuevos sin borrar los existentes';

        const ok = confirm(
          `${modeLabel}\n\n━━━ CONTENIDO DEL BACKUP ━━━\n${previewLines}\n\n¿Confirmar operación?`
        );
        if (!ok) return;

        // ── Aplicar ───────────────────────────────────────────────────
        if (data.config) { setConfig({ ...INITIAL_CONFIG, ...data.config }, true); localStorage.setItem('fixmanager_config', JSON.stringify(data.config)); }
        if (data.orders)   { const v: RepairOrder[]  = mode === 'restore' ? data.orders   : [...orders,          ...(data.orders   as RepairOrder[]) .filter((o) => !orders.find(x => x.id === o.id))];          setOrders(v);          localStorage.setItem('fixmanager_orders',    JSON.stringify(v)); }
        if (data.services) { const v: ServicePrice[] = mode === 'restore' ? data.services : [...services,        ...(data.services as ServicePrice[]).filter((s) => !services.find(x => x.id === s.id))];        setServices(v);        localStorage.setItem('fixmanager_services',  JSON.stringify(v)); }
        if (data.inventory){ const v: InventoryItem[]= mode === 'restore' ? data.inventory: [...inventory,       ...(data.inventory as InventoryItem[]).filter((i) => !inventory.find(x => x.id === i.id))];       setInventory(v);       localStorage.setItem('fixmanager_inventory', JSON.stringify(v)); }
        if (data.clients)  { const v: Client[]       = mode === 'restore' ? data.clients  : [...clients,         ...(data.clients  as Client[])       .filter((c) => !clients.find(x => x.id === c.id))];         setClients(v);         localStorage.setItem('fixmanager_clients',   JSON.stringify(v)); }
        if (data.expenses) { const v: Expense[]      = mode === 'restore' ? data.expenses : [...expenses,        ...(data.expenses as Expense[])      .filter((e) => !expenses.find(x => x.id === e.id))];        setExpenses(v);        localStorage.setItem('fixmanager_expenses',  JSON.stringify(v)); }
        if (data.sales)    { const v: Sale[]          = mode === 'restore' ? data.sales    : [...sales,           ...(data.sales    as Sale[])          .filter((s) => !sales.find(x => x.id === s.id))];           setSales(v);           localStorage.setItem('fixmanager_sales',     JSON.stringify(v)); }
        if (data.cortes)   { const v: CorteEntry[]   = mode === 'restore' ? data.cortes   : [...cortesHistorial, ...(data.cortes   as CorteEntry[])   .filter((c) => !cortesHistorial.find(x => x.id === c.id))]; setCortesHistorial(v); localStorage.setItem('fixmanager_cortes',    JSON.stringify(v)); }
        alert(mode === 'restore' ? '✅ ¡Restauración completa exitosa!' : '✅ ¡Datos importados y fusionados exitosamente!');
      } catch (err) {
        alert('❌ Error al leer el archivo. Asegúrate de que sea un backup válido de FIXMANAGER.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

  const [activeTab, setActiveTab ] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('fixmanager_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const startVal = parsed.defaultStartScreen || parsed.defaultStartView;
        if (startVal) {
          if (startVal === 'orders' || startVal === 'ordenes' || startVal === 'Órdenes') return 'Órdenes';
          if (startVal === 'stock' || startVal === 'Stock') return 'Stock';
          if (startVal === 'corte' || startVal === 'cortes' || startVal === 'Cortes') return 'Cortes';
          if (startVal === 'pos' || startVal === 'POS' || startVal === 'Panel') return 'POS';
          // 'Ventas' = Historial de Ventas, que en móvil vive dentro del tab POS
          if (startVal === 'Ventas' || startVal === 'ventas') return 'POS';
          if (startVal === 'Nueva') return 'Nueva';
          return startVal as ActiveTab;
        }
      } catch (e) {}
    }
    return 'POS';
  });
  const [pendingNavTab, setPendingNavTab] = useState<ActiveTab | null>(null);
  const navigateTab = (tab: ActiveTab) => {
    if (activeTab === 'Reabastecer' && tab !== 'Reabastecer' && hasPendingReabastoDraft()) {
      setPendingNavTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const [fiadosInitialSelectedAccountId, setFiadosInitialSelectedAccountId] = useState<string | null>(null);
  const [fiadosInitialSelectedApartadoId, setFiadosInitialSelectedApartadoId] = useState<string | null>(null);
  const [fiadosInitialActiveTab, setFiadosInitialActiveTab] = useState<'fiados' | 'apartados'>('fiados');
  const [fiadosHighlightedEntryId, setFiadosHighlightedEntryId] = useState<string | null>(null);
  const [fiadosHighlightedApartadoId, setFiadosHighlightedApartadoId] = useState<string | null>(null);

  const [configSubTab, setConfigSubTab] = useState<'global' | 'printer' | 'users' | 'notifications' | 'dev' | 'audit' | 'network' | 'taecel'>('global');
  const [showTaecelPromo, setShowTaecelPromo] = useState(() => {
    return !localStorage.getItem('fixmanager_seen_taecel_promo');
  });

  // Atajo global Ctrl+Shift+D — abre el panel dev desde cualquier pantalla
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
        e.preventDefault();
        setActiveTab('Config');
        setConfigSubTab('dev');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [stockFilter, setStockFilter] = useState<'todos' | 'agotados' | 'bajoStock'>('todos');
  const [orderFilter, setOrderFilter] = useState<string>('todos');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('TKT-014'); // Defaults to the active ticket in your image

  const [highlightBrand, setHighlightBrand] = useState(false);

  const handleConfigBrandRedirect = () => {
    setHighlightBrand(true);
    setTimeout(() => {
      setHighlightBrand(false);
    }, 4000);
  };

  const triggerSyncRef = useRef<any>(null);

  // Local Storage Database Binding or Falls back to seed data
  const [config, rawSetConfig] = useState<WorkshopConfig>(() => {
    const saved = localStorage.getItem('fixmanager_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.defaultStartView === 'Panel') {
          parsed.defaultStartView = 'POS';
        }
        // Limpiar valores por defecto anteriores si existen para asegurar que inicien limpios
        if (parsed.phone && parsed.phone.trim() === '(551) 234-5678') parsed.phone = '';
        if (parsed.email && parsed.email.trim() === 'contacto@fixmanager.app') parsed.email = '';
        if (parsed.address && parsed.address.trim() === 'Av. Principal #104, Col. Centro') parsed.address = '';
        if (parsed.whatsappMode === undefined || parsed.whatsappMode === null) {
          parsed.whatsappMode = 'direct';
        }
        
        const savedWh = localStorage.getItem('fixmanager_warehouses');
        let hasWh = false;
        if (savedWh) {
          try {
            const whList = JSON.parse(savedWh);
            if (Array.isArray(whList) && whList.length > 0) {
              hasWh = true;
            }
          } catch (e) {}
        }
        if (hasWh) {
          parsed.enableWarehouses = true;
        }
        
        return { ...INITIAL_CONFIG, ...parsed };
      } catch (e) {}
    }
    return INITIAL_CONFIG;
  });

  const setConfig = (
    value: WorkshopConfig | ((prev: WorkshopConfig) => WorkshopConfig),
    skipTimestampUpdate = false
  ) => {
    rawSetConfig(prev => {
      let next = typeof value === 'function' ? value(prev) : value;
      if (!skipTimestampUpdate) {
        next = {
          ...next,
          updatedAt: new Date().toISOString()
        };
        setTimeout(() => {
          if (triggerSyncRef.current) {
            triggerSyncRef.current();
          }
        }, 100);
      }
      localStorage.setItem('fixmanager_config', JSON.stringify(next));
      return next;
    });
  };

  // Al arrancar: el archivo en disco es la fuente de verdad (evita corrupción del localStorage)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.loadSettings) return;
    api.loadSettings().then((res: { ok: boolean; data: WorkshopConfig | null }) => {
      if (!res.ok || !res.data) return;
      const merged = { ...INITIAL_CONFIG, ...res.data };
      console.log('[Settings] Cargando configuración desde archivo en disco. Tema:', merged.theme, merged.themeMode);
      setConfig(merged, true);
      // Sincronizar también el localStorage con los datos del disco
      try {
        localStorage.setItem('fixmanager_config', JSON.stringify(merged));
      } catch (_) {}
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (config.whatsappMode === 'integrated') {
      const api = (window as any).electronAPI;
      if (api?.whatsappConnect) {
        console.log('[WhatsApp Startup] Configuración integrada detectada. Inicializando conexión silenciosa...');
        api.whatsappConnect();
      }
    }
  }, [config.whatsappMode]);

  useEffect(() => {
    if (config.enablePOS === false && ['POS', 'Ventas', 'Stock', 'Reabastecer', 'Etiquetas', 'Fiados'].includes(activeTab)) {
      setActiveTab('Órdenes');
    }
    if (config.enableTaller === false && ['Nueva', 'Órdenes', 'Cotizaciones', 'Precios', 'Equipos'].includes(activeTab)) {
      setActiveTab('POS');
    }
  }, [config.enablePOS, config.enableTaller, activeTab]);




  const getOrFetchUserId = useCallback(async (): Promise<string | null> => {
    // 1. Intentar desde localStorage persistido
    const savedUserId = localStorage.getItem('fixmanager_user_id');
    if (savedUserId) return savedUserId;

    // 2. Intentar desde sesión activa de Supabase Auth
    let { data: authData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!authData?.session) {
      const savedTokensStr = localStorage.getItem('fixmanager_mobile_session_tokens');
      if (savedTokensStr) {
        try {
          const savedTokens = JSON.parse(savedTokensStr);
          if (savedTokens?.access_token && savedTokens?.refresh_token) {
            const restored = await supabase.auth.setSession({
              access_token: savedTokens.access_token,
              refresh_token: savedTokens.refresh_token
            }).catch(() => ({ data: { session: null } }));
            if (restored?.data?.session) {
              authData = restored.data;
            }
          }
        } catch (_) {}
      }
    }
    if (authData?.session?.user?.id) {
      localStorage.setItem('fixmanager_user_id', authData.session.user.id);
      return authData.session.user.id;
    }

    // 3. Intentar desde licenseInfo
    if ((licenseInfo as any)?.userId || (licenseInfo as any)?.user_id) {
      const uId = (licenseInfo as any).userId || (licenseInfo as any).user_id;
      localStorage.setItem('fixmanager_user_id', uId);
      return uId;
    }

    // 4. Intentar consultar por machineId en la tabla 'activations'
    const api = (window as any).electronAPI;
    const mId = licenseInfo?.machineId || (api?.getMachineId ? await api.getMachineId().catch(() => '') : '');
    if (mId) {
      try {
        const { data: act } = await supabase
          .from('activations')
          .select('user_id')
          .eq('machine_id', mId)
          .eq('app', 'fixmanager')
          .maybeSingle();
        if (act?.user_id) {
          localStorage.setItem('fixmanager_user_id', act.user_id);
          return act.user_id;
        }
      } catch (_) {}
    }

    // 5. Intentar consultar por correo electrónico en la tabla 'profiles'
    const userEmail = (licenseInfo?.email as string) || (licenseInfo?.ownerName as string) || config.email;
    if (userEmail && userEmail.includes('@')) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail.trim())
          .maybeSingle();
        if (prof?.id) {
          localStorage.setItem('fixmanager_user_id', prof.id);
          return prof.id;
        }
      } catch (_) {}
    }

    // 6. Consultar el último user_id registrado para esta computadora en 'app_session_logs'
    if (mId && mId !== 'N/A') {
      try {
        const { data: lastLog } = await supabase
          .from('app_session_logs')
          .select('user_id')
          .eq('machine_id', mId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastLog?.user_id) {
          localStorage.setItem('fixmanager_user_id', lastLog.user_id);
          return lastLog.user_id;
        }
      } catch (_) {}
    }

    // 7. Consultar el último user_id registrado en la tabla de respaldos 'backups'
    try {
      const { data: lastBackup } = await supabase
        .from('backups')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastBackup?.user_id) {
        localStorage.setItem('fixmanager_user_id', lastBackup.user_id);
        return lastBackup.user_id;
      }
    } catch (_) {}

    // 8. Intentar desde el archivo de licencia local en disco (api.getLicense)
    if (api?.getLicense) {
      try {
        const lic = await api.getLicense();
        if (lic?.userId || lic?.user_id) {
          const uId = lic.userId || lic.user_id;
          localStorage.setItem('fixmanager_user_id', uId);
          return uId;
        }
      } catch (_) {}
    }

    return null;
  }, [licenseInfo, config.email]);

  useEffect(() => {
    const runInitialFullSyncClear = async () => {
      const userId = await getOrFetchUserId();
      if (!userId) return;

      const flagKey = `fixmanager_full_sync_v2_done_${userId}`;
      const isDone = localStorage.getItem(flagKey);

      if (!isDone) {
        console.log('[SyncEngine] Detectado primer inicio de sesión. Limpiando marcas de tiempo para forzar sincronización inicial completa...');
        const keys = [
          'config_sync',
          'orders_sync',
          'inventory_sync',
          'refacciones_sync',
          'clients_sync',
          'sales_sync',
          'expenses_sync',
          'cortes_sync',
          'app_users_sync',
          'services_sync',
          'donors_sync',
          'quotes_sync',
          'credit_accounts_sync',
          'apartados_sync'
        ];
        
        keys.forEach(k => {
          localStorage.removeItem(`fixmanager_last_sync_${userId}_${k}`);
        });
        
        localStorage.setItem(flagKey, 'true');
        console.log('[SyncEngine] Marcas de tiempo limpiadas. Todo listo para la sincronización inicial completa.');
      }
    };

    runInitialFullSyncClear().catch(e => console.error('[SyncEngine] Error en carga inicial completa:', e));
  }, [getOrFetchUserId]);

  const ensureValidUuid = (id: string): string => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(id)) return id;
    const cleanHex = id.replace(/[^0-9a-fA-F]/g, '').padEnd(32, '0').slice(0, 32).toLowerCase();
    return `${cleanHex.slice(0, 8)}-${cleanHex.slice(8, 12)}-4${cleanHex.slice(13, 16)}-8${cleanHex.slice(17, 20)}-${cleanHex.slice(20, 32)}`;
  };

  const handleConfirmClose = useCallback(async () => {
    try {
      const userId = await getOrFetchUserId();
      const api = (window as any).electronAPI;
      const mId = licenseInfo?.machineId || (api?.getMachineId ? await api.getMachineId().catch(() => '') : 'N/A');
      const resolvedUserId = ensureValidUuid(userId || mId);
      await supabase.from('app_session_logs').insert({
        user_id: resolvedUserId,
        machine_id: mId,
        event_type: 'close',
        app_version: appVersion,
        store_name: config.storeName || 'Caja Central'
      });
    } catch (_) {}
    (window as any).electronAPI?.confirmClose?.();
  }, [getOrFetchUserId, licenseInfo, appVersion, config.storeName]);

  const hasLoggedSessionStartRef = useRef(false);

  // Registrar inicio de sesión en la bitácora de uso (open)
  useEffect(() => {
    if (appScreen !== 'active') {
      hasLoggedSessionStartRef.current = false;
      return;
    }

    if (hasLoggedSessionStartRef.current) return;
    hasLoggedSessionStartRef.current = true;

    const logSessionStart = async () => {
      try {
        const api = (window as any).electronAPI;
        const mId = licenseInfo?.machineId || (api?.getMachineId ? await api.getMachineId().catch(() => '') : 'N/A');
        const userId = await getOrFetchUserId();
        const resolvedUserId = ensureValidUuid(userId || mId);

        let { error } = await supabase.from('app_session_logs').insert({
          user_id: resolvedUserId,
          machine_id: mId,
          event_type: 'open',
          app_version: appVersion,
          store_name: config.storeName || 'Caja Central'
        });

        if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
          // 1. Intentar mediante RPC security definer (si existe en Supabase)
          let rpcRes: any = null;
          try {
            rpcRes = await supabase.rpc('log_app_session', {
              p_user_id: resolvedUserId,
              p_machine_id: mId,
              p_event_type: 'open',
              p_app_version: appVersion,
              p_store_name: config.storeName || 'Caja Central'
            });
          } catch (_) {}

          if (rpcRes && !rpcRes.error) {
            error = null;
          } else {
            // 2. Intentar refrescar la sesión si falló por autenticación
            const refRes = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
            if (refRes?.data?.session) {
              if (api?.saveSupabaseSession) {
                await api.saveSupabaseSession({
                  access_token: refRes.data.session.access_token,
                  refresh_token: refRes.data.session.refresh_token
                }).catch(() => {});
              }
              const retryRes = await supabase.from('app_session_logs').insert({
                user_id: refRes.data.session.user.id || resolvedUserId,
                machine_id: mId,
                event_type: 'open',
                app_version: appVersion,
                store_name: config.storeName || 'Caja Central'
              });
              error = retryRes.error;
            }
          }
        }

        if (!error) {
          console.log('[Session Log] Apertura de sesión registrada con éxito en Supabase. UserID:', resolvedUserId);
        } else {
          hasLoggedSessionStartRef.current = false;
          console.warn('[Session Log] Error al insertar en Supabase:', error);
        }
      } catch (e) {
        hasLoggedSessionStartRef.current = false;
        console.warn('[Session Log] Error logging session start:', e);
      }
    };

    logSessionStart();
  }, [appScreen, getOrFetchUserId, licenseInfo, appVersion, config.storeName]);

  // Auto-sincronizar respaldos pendientes cuando la app está activa o al volver el internet
  useEffect(() => {
    if (appScreen !== 'active') return;

    syncPendingCloudBackups();

    const handleOnline = () => {
      console.log('[Network] Conexión restablecida. Sincronizando respaldos pendientes...');
      syncPendingCloudBackups();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [appScreen, syncPendingCloudBackups]);

  // ── Multicaja / Red Local state ─────────────────────────────────────────────
  const [lanStatus, setLanStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [lanSyncBlocked, setLanSyncBlocked] = useState(false);
  const [terminalName, setTerminalName] = useState(() => localStorage.getItem('fixmanager_terminal_name') || 'Caja Principal');
  const isSyncingRef = useRef(false);
  const failedSyncAttemptsRef = useRef(0);
  const isInitialSyncRef = useRef(true);

  const [orders, rawSetOrders] = useState<RepairOrder[]>(() => {
    const parsed = safeParseJSON<RepairOrder[]>('fixmanager_orders', INITIAL_ORDERS);
    // Migración: en modo personal, convertir Pendiente/Diagnóstico → En Reparación
    const mode = (config.workshopMode ?? 'personal');
    if (mode === 'personal') {
      return parsed.map(o =>
        (o.status === 'Pendiente' || o.status === 'Diagnóstico')
          ? { ...o, status: 'En Reparación' as const }
          : o
      );
    }
    return parsed;
  });

  // Global remote debugger declarations
  useEffect(() => {
    (window as any).rawSetConfig = rawSetConfig;
    (window as any).addDebugLog = (msg: string) => {
      try {
        const time = new Date().toISOString();
        const logLine = `[${time}] ${msg}`;
        console.log('[REMOTE_DEBUG]', logLine);
        
        let localConfig = INITIAL_CONFIG;
        const localConfigRaw = localStorage.getItem('fixmanager_config');
        if (localConfigRaw) {
          try {
            localConfig = JSON.parse(localConfigRaw);
          } catch (e) {}
        }
        
        // Obtener o generar un ID de dispositivo único para no pisar logs de otros dispositivos
        let deviceId = localStorage.getItem('fixmanager_device_uuid');
        if (!deviceId) {
          deviceId = localStorage.getItem('fixmanager_machine_id');
          if (!deviceId) {
            // Generar un ID aleatorio persistente para este dispositivo móvil o navegador
            deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
          }
          localStorage.setItem('fixmanager_device_uuid', deviceId);
        }
        
        const debugLogsObj = typeof localConfig.debugLogs === 'object' && localConfig.debugLogs !== null && !Array.isArray(localConfig.debugLogs) ? localConfig.debugLogs : {};
        const deviceLogs = Array.isArray(debugLogsObj[deviceId]) ? debugLogsObj[deviceId] : [];
        
        debugLogsObj[deviceId] = [...deviceLogs.slice(-150), logLine];
        localConfig.debugLogs = debugLogsObj;
        
        localStorage.setItem('fixmanager_config', JSON.stringify(localConfig));
        rawSetConfig(localConfig);
      } catch (e) {
        console.error('[DEBUG_ERROR]', e);
      }
    };
    
    // Capturar errores no controlados y enviarlos al log remoto
    const handleGlobalError = (event: ErrorEvent) => {
      (window as any).addDebugLog?.(`UNCAUGHT ERROR: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      (window as any).addDebugLog?.(`UNHANDLED PROMISE REJECTION: ${event.reason?.message || event.reason}`);
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    (window as any).addDebugLog('Remote debugger initialized.');
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [rawSetConfig]);


  const [services, rawSetServices] = useState<ServicePrice[]>(() => {
    return safeParseJSON<ServicePrice[]>('fixmanager_services', INITIAL_SERVICES);
  });

   const [quoteCatalog, setQuoteCatalog] = useState<QuoteCatalogItem[]>(() => {
    return safeParseJSON<QuoteCatalogItem[]>('fixmanager_quote_catalog', []);
  });

  const [insumosCatalog, setInsumosCatalog] = useState<InsumoCatalogItem[]>(() => {
    return safeParseJSON<InsumoCatalogItem[]>('fixmanager_insumos_catalog', []);
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    return safeParseJSON<Warehouse[]>('fixmanager_warehouses', []);
  });

  const [inventory, rawSetInventory] = useState<InventoryItem[]>(() => {
    const items = safeParseJSON<InventoryItem[]>('fixmanager_inventory', INITIAL_INVENTORY);
    return items.map(item => {
      return { 
        ...item, 
        name: (item.name || '').toUpperCase(), 
        brand: (item.brand || '').toUpperCase(),
        code: String(item.code || '').trim() || '000000000000' 
      };
    });
  });

  const [refacciones, rawSetRefacciones] = useState<RefaccionItem[]>(() => {
    let items = safeParseJSON<RefaccionItem[]>('fixmanager_refacciones', []);
    if (!items || items.length === 0) {
      items = INITIAL_REFACCIONES;
    }
    return items.map(item => {
      return { 
        ...item, 
        name: (item.name || '').toUpperCase(), 
        brand: (item.brand || '').toUpperCase(),
        deviceBrand: (item.deviceBrand || '').toUpperCase(),
        deviceModel: (item.deviceModel || '').toUpperCase(),
        code: String(item.code || '').trim() || '000000000000' 
      };
    });
  });

  const [donors, rawSetDonors] = useState<DonorDevice[]>(() => {
    return safeParseJSON<DonorDevice[]>('fixmanager_donors', []);
  });

  const [clients, rawSetClients] = useState<Client[]>(() => {
    return safeParseJSON<Client[]>('fixmanager_clients', INITIAL_CLIENTS);
  });

  const [expenses, rawSetExpenses] = useState<Expense[]>(() => {
    return safeParseJSON<Expense[]>('fixmanager_expenses', INITIAL_EXPENSES);
  });

  const [sales, rawSetSales] = useState<Sale[]>(() => {
    return safeParseJSON<Sale[]>('fixmanager_sales', INITIAL_SALES);
  });

  const [quotes, rawSetQuotes] = useState<Quote[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_quotes') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (quotes.length > 0 && insumosCatalog.length === 0) {
      const itemsMap = new Map<string, number>();
      quotes.forEach(q => {
        if (q.additionalConcepts) {
          q.additionalConcepts.forEach(c => {
            if (c.description && c.description.trim()) {
              const clean = c.description.toUpperCase().trim();
              itemsMap.set(clean, c.price || 0);
            }
          });
        }
      });
      if (itemsMap.size > 0) {
        const initialItems: InsumoCatalogItem[] = Array.from(itemsMap.entries()).map(([description, price], index) => ({
          id: `insumo_history_${index}_${Date.now()}`,
          description,
          price
        }));
        setInsumosCatalog(initialItems);
      }
    }
  }, [quotes, insumosCatalog]);

  const [creditAccounts, rawSetCreditAccounts] = useState<CreditAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_credit_accounts') || '[]'); } catch { return []; }
  });

  const [apartados, rawSetApartados] = useState<ApartadoEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_apartados') || '[]'); } catch { return []; }
  });

  const [chipActivations, rawSetChipActivations] = useState<ChipActivation[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_chip_activations') || '[]'); } catch { return []; }
  });

  // --- WhatsApp Bulk Promo Campaign ---
  const [isSendingPromos, setIsSendingPromos] = useState(false);
  const [sendingCurrentIndex, setSendingCurrentIndex] = useState(0);
  const [sendingTotal, setSendingTotal] = useState(0);
  const [sendingLogs, setSendingLogs] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const sendingCancelRef = useRef(false);
  const [showBulkPromoModal, setShowBulkPromoModal] = useState(false);
  const [promoMessage, setPromoMessage] = useState(
    "Hola {nombre}, te informamos que en *{taller}* tenemos promociones increíbles en micas y accesorios esta semana. ¡Visítanos!\n\n" +
    "📍 *Ubícanos aquí:*\n{direccion}\n\n" +
    "🗺️ *Ver en Google Maps:*\n{maps_link}\n\n" +
    "🕒 *Horarios:*\n{horarios}\n\n" +
    "📞 *Tel:* {telefono_taller}\n" +
    "💬 *WhatsApp:* {whatsapp}\n\n" +
    "🌐 *Nuestras Redes Sociales:*\n" +
    "Facebook: {facebook}\n" +
    "Instagram: {instagram}\n" +
    "TikTok: {tiktok}"
  );
  const [selectedClientIds, setSelectedClientIds] = useState<Record<string, boolean>>({});
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [promoFilterType, setPromoFilterType] = useState<'all' | 'debt' | 'active'>('all');
  const [activeTemplateType, setActiveTemplateType] = useState<'promo' | 'cobro' | 'estatus' | 'custom'>('promo');

  const showToast = (msg: string, type: 'warn' | 'ok' = 'warn') => {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;white-space:nowrap;background:${type==='ok'?'#16a34a':'#b45309'};color:#fff;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  };

  const getClientStatsForPromo = (c: Client) => {
    const sym = config.currencySymbol || '$';
    const clientOrders = orders.filter(o =>
      o.customerPhone === c.phone ||
      o.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
    );
    const totalGastado = clientOrders
      .filter(o => o.status === 'Entregado y Pagado')
      .reduce((s, o) => s + o.cost, 0);
    const saldoPendiente = clientOrders
      .filter(o => !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status))
      .reduce((s, o) => s + Math.max(0, o.cost - o.advancePayment), 0);
    const ordenesActivas = clientOrders.filter(o =>
      !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status)
    ).length;
    return { totalGastado, saldoPendiente, ordenesActivas, sym };
  };

  const formatSocialLinkForPromo = (platform: 'facebook' | 'instagram' | 'tiktok', username: string | undefined): string => {
    if (!username) return '';
    const trimmed = username.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const cleanUser = trimmed.replace(/^@/, '');
    if (platform === 'facebook') return `https://facebook.com/${cleanUser}`;
    if (platform === 'instagram') return `https://instagram.com/${cleanUser}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${cleanUser}`;
    return trimmed;
  };

  const formatBusinessHoursForPromo = (hoursStr: string | undefined): string => {
    if (!hoursStr) return 'No definido';
    try {
      const obj = JSON.parse(hoursStr);
      if (typeof obj !== 'object' || obj === null) return hoursStr;

      const daysOrder = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo'];
      const formattedDays: string[] = [];

      for (const day of daysOrder) {
        const dayData = obj[day];
        if (dayData && dayData.isOpen) {
          const dayNameCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
          if (dayData.type === 'split') {
            formattedDays.push(`${dayNameCapitalized}: ${dayData.openTime}-${dayData.closeTime} / ${dayData.openTime2}-${dayData.closeTime2}`);
          } else {
            formattedDays.push(`${dayNameCapitalized}: ${dayData.openTime}-${dayData.closeTime}`);
          }
        }
      }

      if (formattedDays.length > 0) {
        return formattedDays.join('\n');
      }
      return hoursStr;
    } catch (e) {
      return hoursStr;
    }
  };

  const handleStartSendingPromos = async (selectedClients: Client[]) => {
    setIsSendingPromos(true);
    setSendingCurrentIndex(0);
    setSendingTotal(selectedClients.length);
    sendingCancelRef.current = false;

    const initialLogs: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    selectedClients.forEach(c => {
      initialLogs[c.id] = 'pending';
    });
    setSendingLogs(initialLogs);

    const api = (window as any).electronAPI;

    for (let i = 0; i < selectedClients.length; i++) {
      if (sendingCancelRef.current) {
        showToast('⚠️ Envío de promociones cancelado');
        break;
      }

      const client = selectedClients[i];
      setSendingCurrentIndex(i);
      setSendingLogs(prev => ({ ...prev, [client.id]: 'sending' }));

      // Personalize message
      const { saldoPendiente, ordenesActivas, sym } = getClientStatsForPromo(client);
      
      const storeAddressParts = [
        config.addressStreet,
        config.addressNumber,
        config.addressColonia,
        config.addressCity,
        config.addressState,
        config.addressZip,
        config.addressCountry
      ].map(p => p?.trim()).filter(Boolean);
      const storeAddress = storeAddressParts.length > 0 ? storeAddressParts.join(', ') : (config.address || '');

      let msgText = promoMessage;

      if (!config.socialFacebook) {
        msgText = msgText.replace(/.*Facebook:.*{facebook}.*\n?/gi, '');
      }
      if (!config.socialInstagram) {
        msgText = msgText.replace(/.*Instagram:.*{instagram}.*\n?/gi, '');
      }
      if (!config.socialTiktok) {
        msgText = msgText.replace(/.*TikTok:.*{tiktok}.*\n?/gi, '');
      }
      if (!config.socialFacebook && !config.socialInstagram && !config.socialTiktok) {
        msgText = msgText.replace(/🌐 \*Nuestras Redes Sociales:\*\n?/gi, '');
      }

      const personalizedMsg = msgText
        .replace(/{nombre}/gi, client.name)
        .replace(/{taller}/gi, config.storeName || 'nuestro taller')
        .replace(/{saldo_pendiente}/gi, `${sym}${saldoPendiente.toFixed(2)}`)
        .replace(/{ordenes_activas}/gi, String(ordenesActivas))
        .replace(/{direccion}/gi, storeAddress)
        .replace(/{maps_link}/gi, config.googleMapsLink || '')
        .replace(/{facebook}/gi, formatSocialLinkForPromo('facebook', config.socialFacebook))
        .replace(/{instagram}/gi, formatSocialLinkForPromo('instagram', config.socialInstagram))
        .replace(/{tiktok}/gi, formatSocialLinkForPromo('tiktok', config.socialTiktok))
        .replace(/{telefono_taller}/gi, config.phone || '')
        .replace(/{whatsapp}/gi, (() => {
          const waPhone = (config.phone2 || config.phone || '').replace(/\D/g, '');
          const cc = config.whatsappDefaultCountryCode || '52';
          return waPhone ? `https://wa.me/${cc}${waPhone}` : '';
        })())
        .replace(/{horarios}/gi, formatBusinessHoursForPromo(config.businessHours));

      const cc = client.countryCode || config.whatsappDefaultCountryCode || '52';
      const formattedPhone = formatPhoneForWhatsapp(client.phone, cc);

      let success = false;
      try {
        const mode = config.whatsappMode || 'disabled';
        if (mode === 'integrated' && api?.whatsappSendMessage) {
          const res = await api.whatsappSendMessage(formattedPhone, personalizedMsg);
          success = !!res?.success;
        } else {
          const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedMsg)}`;
          if (api?.openExternal) api.openExternal(waUrl);
          else window.open(waUrl, '_blank');
          success = true;
        }
      } catch (e) {
        console.error('[Mass Send] Error sending to', client.phone, e);
        success = false;
      }

      setSendingLogs(prev => ({ ...prev, [client.id]: success ? 'success' : 'error' }));

      // Delay between sends
      if (i < selectedClients.length - 1) {
        const randomSeconds = Math.floor(Math.random() * (18 - 8 + 1)) + 8;
        let elapsed = 0;
        while (elapsed < randomSeconds) {
          if (sendingCancelRef.current) break;
          setCountdownSeconds(randomSeconds - elapsed);
          await new Promise(resolve => setTimeout(resolve, 1000));
          elapsed++;
        }
        setCountdownSeconds(null);
      }
    }

    setSendingCurrentIndex(selectedClients.length);
    setIsSendingPromos(false);
    if (!sendingCancelRef.current) {
      showToast('🎉 ¡Envío de promociones masivas finalizado!', 'ok');
    }
  };

  const handleCancelSendingPromos = () => {
    sendingCancelRef.current = true;
    setIsSendingPromos(false);
  };

  const setCreditAccounts = (newVal: CreditAccount[] | ((prev: CreditAccount[]) => CreditAccount[])) => {
    rawSetCreditAccounts(prev => {
      const resolved = typeof newVal === 'function' ? newVal(prev) : newVal;

      // Detectar registros eliminados localmente
      const deletedKey = 'fixmanager_credit_accounts_deleted';
      const deletedItems: { id: string; uuid: string; payload: any }[] = [];
      prev.forEach(oldItem => {
        const exists = resolved.some(item => item.id === oldItem.id);
        if (!exists && oldItem.uuid) {
          deletedItems.push({ id: oldItem.id, uuid: oldItem.uuid, payload: oldItem });
        }
      });
      if (deletedItems.length > 0) {
        try {
          const currentDeleted = JSON.parse(localStorage.getItem(deletedKey) || '[]');
          deletedItems.forEach(d => {
            if (!currentDeleted.some((x: any) => x.uuid === d.uuid)) {
              currentDeleted.push(d);
            }
          });
          localStorage.setItem(deletedKey, JSON.stringify(currentDeleted));
        } catch (_) {}
      }

      const processed = resolved.map(item => {
        const oldItem = prev.find(i => i.id === item.id);
        const isNew = !oldItem;
        const isChanged = oldItem && (
          oldItem.clientName !== item.clientName ||
          oldItem.clientPhone !== item.clientPhone ||
          oldItem.isClosed !== item.isClosed ||
          oldItem.deletedAt !== item.deletedAt ||
          JSON.stringify(oldItem.entries) !== JSON.stringify(item.entries) ||
          JSON.stringify(oldItem.payments) !== JSON.stringify(item.payments)
        );
        const uuid = item.uuid || oldItem?.uuid || generateUUID();
        const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (item.updatedAt || oldItem?.updatedAt || new Date().toISOString());
        const dirty = (isNew || isChanged) ? true : item.dirty;
        return {
          ...item,
          uuid,
          updatedAt,
          dirty
        };
      });
      localStorage.setItem('fixmanager_credit_accounts', JSON.stringify(processed));
      const hasLocalChanges = deletedItems.length > 0 || processed.some(item => (item as any).dirty);
      if (hasLocalChanges) {
        setTimeout(() => {
          if (triggerSyncRef.current) {
            triggerSyncRef.current();
          }
        }, 500);
      }
      return processed;
    });
  };

  const setApartados = (newVal: ApartadoEntry[] | ((prev: ApartadoEntry[]) => ApartadoEntry[])) => {
    rawSetApartados(prev => {
      const resolved = typeof newVal === 'function' ? newVal(prev) : newVal;

      // Detectar registros eliminados localmente
      const deletedKey = 'fixmanager_apartados_deleted';
      const deletedItems: { id: string; uuid: string; payload: any }[] = [];
      prev.forEach(oldItem => {
        const exists = resolved.some(item => item.id === oldItem.id);
        if (!exists && oldItem.uuid) {
          deletedItems.push({ id: oldItem.id, uuid: oldItem.uuid, payload: oldItem });
        }
      });
      if (deletedItems.length > 0) {
        try {
          const currentDeleted = JSON.parse(localStorage.getItem(deletedKey) || '[]');
          deletedItems.forEach(d => {
            if (!currentDeleted.some((x: any) => x.uuid === d.uuid)) {
              currentDeleted.push(d);
            }
          });
          localStorage.setItem(deletedKey, JSON.stringify(currentDeleted));
        } catch (_) {}
      }

      const processed = resolved.map(item => {
        const oldItem = prev.find(i => i.id === item.id);
        const isNew = !oldItem;
        const isChanged = oldItem && (
          oldItem.clientName !== item.clientName ||
          oldItem.clientPhone !== item.clientPhone ||
          oldItem.status !== item.status ||
          oldItem.deletedAt !== item.deletedAt ||
          JSON.stringify(oldItem.items) !== JSON.stringify(item.items) ||
          JSON.stringify(oldItem.payments) !== JSON.stringify(item.payments)
        );
        const uuid = item.uuid || oldItem?.uuid || generateUUID();
        const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (item.updatedAt || oldItem?.updatedAt || new Date().toISOString());
        const dirty = (isNew || isChanged) ? true : item.dirty;
        return {
          ...item,
          uuid,
          updatedAt,
          dirty
        };
      });
      localStorage.setItem('fixmanager_apartados', JSON.stringify(processed));
      const hasLocalChanges = deletedItems.length > 0 || processed.some(item => (item as any).dirty);
      if (hasLocalChanges) {
        setTimeout(() => {
          if (triggerSyncRef.current) {
            triggerSyncRef.current();
          }
        }, 500);
      }
      return processed;
    });
  };

  useEffect(() => {
    localStorage.setItem('fixmanager_quotes', JSON.stringify(quotes));
  }, [quotes]);

  const triggerCloudSync = useCallback(async () => {
    let syncSuccess = true;
    try {
      if (localStorage.getItem('fixmanager_cloud_sync_enabled') !== 'true') return;
      if (!getNetworkStatusSync()) return;

      const userId = await getOrFetchUserId();
      if (!userId) return;

      if ((window as any).isSyncing) return;
      (window as any).isSyncing = true;
      window.dispatchEvent(new CustomEvent('fixmanager_sync_status', { detail: { syncing: true } }));

      // Timeout de seguridad de 25 segundos para evitar bloqueos permanentes de WebKit
      const syncTimeout = setTimeout(() => {
        if ((window as any).isSyncing) {
          (window as any).addDebugLog?.('[Sync] Sincronización abortada por timeout (25s).');
          (window as any).isSyncing = false;
          window.dispatchEvent(new CustomEvent('fixmanager_sync_status', { detail: { syncing: false, success: false } }));
        }
      }, 25000);

      try {
        await syncDataWithCloud(userId, (key, data) => {
          if (key === 'fixmanager_orders') rawSetOrders(data);
          else if (key === 'fixmanager_inventory') rawSetInventory(data);
          else if (key === 'fixmanager_refacciones') rawSetRefacciones(data);
          else if (key === 'fixmanager_clients') rawSetClients(data);
          else if (key === 'fixmanager_sales') rawSetSales(data);
          else if (key === 'fixmanager_expenses') rawSetExpenses(data);
          else if (key === 'fixmanager_cortes') rawSetCortesHistorial(data);
          else if (key === 'fixmanager_users') rawSetUsers(data);
          else if (key === 'fixmanager_services') rawSetServices(data);
          else if (key === 'fixmanager_donors') rawSetDonors(data);
          else if (key === 'fixmanager_quotes') rawSetQuotes(data);
          else if (key === 'fixmanager_config') setConfig(data, true);
          else if (key === 'fixmanager_credit_accounts') rawSetCreditAccounts(data);
          else if (key === 'fixmanager_apartados') rawSetApartados(data);
          else if (key === 'fixmanager_chip_activations') rawSetChipActivations(data);
        });
      } catch (e: any) {
        syncSuccess = false;
        (window as any).addDebugLog?.(`[Sync] Error en syncDataWithCloud: ${e.message || e}`);
        console.error('[Sync] Error al ejecutar syncDataWithCloud:', e);
      } finally {
        clearTimeout(syncTimeout);
        (window as any).isSyncing = false;
        window.dispatchEvent(new CustomEvent('fixmanager_sync_status', { detail: { syncing: false, success: syncSuccess } }));
      }
    } catch (outerErr: any) {
      (window as any).addDebugLog?.(`[Sync] Error externo en triggerCloudSync: ${outerErr.message || outerErr}`);
      console.error('[Sync] Error externo:', outerErr);
    }
  }, [getOrFetchUserId]);

  useEffect(() => {
    triggerSyncRef.current = triggerCloudSync;
  }, [triggerCloudSync]);

  useEffect(() => {
    (window as any).triggerCloudSync = triggerCloudSync;
    return () => {
      delete (window as any).triggerCloudSync;
    };
  }, [triggerCloudSync]);

  // Sincronizar de inmediato cuando se restablece la conexión a internet
  useEffect(() => {
    return subscribeToNetworkStatus((online) => {
      if (online) {
        (window as any).addDebugLog?.('[Sync] Conexión detectada/restablecida. Sincronizando de inmediato...');
        triggerCloudSync();
      } else {
        // Abortar de inmediato el estado de sincronización visual al desconectarse
        if ((window as any).isSyncing) {
          (window as any).addDebugLog?.('[Sync] Conexión interrumpida. Cancelando estado visual de carga.');
          (window as any).isSyncing = false;
          window.dispatchEvent(new CustomEvent('fixmanager_sync_status', { detail: { syncing: false, success: false } }));
        }
      }
    });
  }, [triggerCloudSync]);

  useEffect(() => {
    console.log('[Licencia Debug] Ventas en memoria de PC:', sales.map(s => `${s.id} (${s.createdAt})`));
  }, [sales]);

  // Sincronizar de inmediato cuando la app recupera el foco o se hace visible
  useEffect(() => {
    const handleFocus = () => {
      triggerCloudSync();
    };
    window.addEventListener('focus', handleFocus);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerCloudSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerCloudSync]);

  // Suscripción Realtime para sincronización instantánea (WebSocket)
  useEffect(() => {
    let activeChannel: any = null;
    let isCleanedUp = false;
    
    const initRealtime = async () => {
      const userId = await getOrFetchUserId();
      if (!userId || isCleanedUp) return;

      console.log('[Realtime] Inicializando canal de eventos para usuario:', userId);

      const channelName = `realtime-sync-${userId}`;
      const channels = supabase.getChannels();
      const existing = channels.find(ch => (ch as any).topic === 'realtime:' + channelName);
      if (existing) {
        try {
          await supabase.removeChannel(existing);
        } catch (e) {}
      }

      if (isCleanedUp) return;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
          },
          (payload) => {
            console.log('[Realtime] Cambio detectado en tabla:', payload.table);
            triggerCloudSync();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Estado de conexión WebSocket:', status);
        });

      activeChannel = channel;
    };

    initRealtime();

    return () => {
      isCleanedUp = true;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [getOrFetchUserId, triggerCloudSync]);

  // Eco Mode queue — tickets intercepted when ecoMode is active
  const [ecoQueue, setEcoQueue] = useState<{ html: string; isReport?: boolean }[]>([]);
  const [a4ReportPreview, setA4ReportPreview] = useState<{
    html: string;
    title: string;
    filename: string;
    deviceName?: string;
  } | null>(null);
  const [waReportNumber, setWaReportNumber] = useState('');
  const [isSendingWaReport, setIsSendingWaReport] = useState(false);
  const [duplexManualPrintJob, setDuplexManualPrintJob] = useState<{
    order?: RepairOrder;
    orders?: RepairOrder[];
    deviceName?: string;
    paperWidthMicrons?: number;
    paperHeightMicrons?: number;
  } | null>(null);

  // Helper centralizado: imprime o muestra eco modal
  const silentPrintOrEco = React.useCallback((opts: { 
    html: string; 
    deviceName?: string; 
    paperWidthMicrons?: number; 
    paperHeightMicrons?: number; 
    copies?: number; 
    isLabel?: boolean; 
    isReport?: boolean;
    isServiceTicket?: boolean;
    isBatchServiceTicket?: boolean;
    order?: RepairOrder;
    orders?: RepairOrder[];
  }) => {
    if (opts.isReport) {
      let title = "Reporte";
      const titleMatch = opts.html.match(/<title>(.*?)<\/title>/i) || opts.html.match(/<h1>(.*?)<\/h1>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
      }
      setA4ReportPreview({
        html: opts.html,
        title: title,
        filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`,
        deviceName: opts.deviceName
      });
      return Promise.resolve({ success: true });
    }

    if (config.ecoMode) {
      if (!opts.isLabel && !config.ecoSilent) setEcoQueue(prev => [...prev, { html: opts.html, isReport: opts.isReport }]);
      return Promise.resolve({ success: true });
    }

    // Interceptar Dúplex Manual
    if ((config.hybridPrintMode || config.ticketPaperWidth === 'media-carta') && config.duplexManual && (opts.isServiceTicket || opts.isBatchServiceTicket) && (opts.order || opts.orders)) {
      const eAPI = (window as any).electronAPI;
      if (eAPI?.silentPrintHtml) {
        const finalOpts = {
          ...opts,
          useDynamicHeight: config.useDynamicHeight ?? false,
          usePrinterDefaultPageSize: config.usePrinterDefaultPageSize ?? false,
          selectedPrinterProfileId: config.selectedPrinterProfileId
        };
        if (!finalOpts.deviceName && config.ticketPrinterBrand) {
          finalOpts.deviceName = config.ticketPrinterBrand;
        }
        if (!finalOpts.paperWidthMicrons) {
          if (config.ticketPaperWidth === 'media-carta-duplicado') {
            finalOpts.paperWidthMicrons = 210000;
            finalOpts.paperHeightMicrons = 297000;
          } else if (config.ticketPaperWidth === 'media-carta') {
            finalOpts.paperWidthMicrons = 215900;
            finalOpts.paperHeightMicrons = 139700;
          } else {
            finalOpts.paperWidthMicrons = 215900;
            finalOpts.paperHeightMicrons = 279400; // duplicado/carta completo
          }
        } else if (finalOpts.paperWidthMicrons === 215900 && !finalOpts.paperHeightMicrons) {
          if (config.ticketPaperWidth === 'media-carta-duplicado') {
            finalOpts.paperWidthMicrons = 210000;
            finalOpts.paperHeightMicrons = 297000;
          } else if (config.ticketPaperWidth === 'media-carta') {
            finalOpts.paperHeightMicrons = 139700;
          } else {
            finalOpts.paperHeightMicrons = 279400;
          }
        } else if (finalOpts.paperWidthMicrons === 210000 && !finalOpts.paperHeightMicrons) {
          finalOpts.paperHeightMicrons = 297000;
        }
        eAPI.silentPrintHtml(finalOpts).catch((err: any) => {
          console.error("Error al imprimir el frente (Dúplex Manual):", err);
          const pName = finalOpts.deviceName || 'Predeterminada';
          alert(`❌ Error al imprimir el frente de la hoja en "${pName}":\n${err.message || err}\n\nVerifica que la impresora esté conectada y encendida.`);
        });
      }

      setDuplexManualPrintJob({
        order: opts.order,
        orders: opts.orders,
        deviceName: opts.deviceName || config.ticketPrinterBrand || undefined,
        paperWidthMicrons: opts.paperWidthMicrons || (config.ticketPaperWidth === 'media-carta-duplicado' ? 210000 : 215900),
        paperHeightMicrons: opts.paperHeightMicrons || (config.ticketPaperWidth === 'media-carta-duplicado' ? 297000 : (config.ticketPaperWidth === 'media-carta' ? 139700 : 279400))
      });

      return Promise.resolve({ success: true });
    }

    const eAPI = (window as any).electronAPI;
    if (eAPI?.silentPrintHtml) {
      const finalOpts = {
        ...opts,
        useDynamicHeight: config.useDynamicHeight ?? false,
        usePrinterDefaultPageSize: config.usePrinterDefaultPageSize ?? false,
        selectedPrinterProfileId: config.selectedPrinterProfileId
      };
      if ((opts.isServiceTicket || opts.isBatchServiceTicket) && config.printDuplexContract && !config.duplexManual) {
        (finalOpts as any).duplexMode = 'longEdge';
      }
      if (opts.isLabel) {
        if ((!finalOpts.deviceName || finalOpts.deviceName.trim() === '') && config.labelPrinterBrand) {
          finalOpts.deviceName = config.labelPrinterBrand;
        }

        const isVertical = config.labelOrientation === 'vertical';
        (finalOpts as any).landscape = !isVertical;

        if (!finalOpts.paperWidthMicrons && config.labelPaperSize) {
          try {
            const [widthMm, heightMm] = config.labelPaperSize.replace('mm', '').split('x').map(Number);
            if (!isNaN(widthMm) && !isNaN(heightMm)) {
              finalOpts.paperWidthMicrons = widthMm * 1000;
              finalOpts.paperHeightMicrons = heightMm * 1000;
            }
          } catch (e) {
            console.error('Error al parsear el tamaño de la etiqueta:', e);
          }
        }
      } else {
        if (!finalOpts.deviceName || finalOpts.deviceName.trim() === '') {
          if (opts.isReport) {
            finalOpts.deviceName = config.reportPrinterName || '';
          } else if (config.ticketPrinterBrand) {
            finalOpts.deviceName = config.ticketPrinterBrand;
          }
        }
        if (!finalOpts.paperWidthMicrons) {
          if (config.ticketPaperWidth === 'media-carta-duplicado') {
            finalOpts.paperWidthMicrons = 210000;
            finalOpts.paperHeightMicrons = 297000;
          } else if (config.hybridPrintMode) {
            finalOpts.paperWidthMicrons = 215900;
            finalOpts.paperHeightMicrons = 279400;
          } else if (config.ticketPaperWidth === 'media-carta') {
            finalOpts.paperWidthMicrons = 215900;
            finalOpts.paperHeightMicrons = 139700;
          }
        } else if (finalOpts.paperWidthMicrons === 210000 && !finalOpts.paperHeightMicrons) {
          finalOpts.paperHeightMicrons = 297000;
        } else if (finalOpts.paperWidthMicrons === 215900 && !finalOpts.paperHeightMicrons) {
          if (config.ticketPaperWidth === 'media-carta-duplicado') {
            finalOpts.paperWidthMicrons = 210000;
            finalOpts.paperHeightMicrons = 297000;
          } else if (config.hybridPrintMode) {
            finalOpts.paperHeightMicrons = 279400;
          } else if (config.ticketPaperWidth === 'media-carta') {
            finalOpts.paperHeightMicrons = 139700;
          }
        }
        if (!finalOpts.paperHeightMicrons && config.ticketPaperHeight && config.ticketPaperHeight > 0) {
          finalOpts.paperHeightMicrons = config.ticketPaperHeight * 1000;
        }
      }
      return eAPI.silentPrintHtml(finalOpts).catch((err: any) => {
        console.error("Error en silentPrintHtml:", err);
        const pName = finalOpts.deviceName || 'Predeterminada';
        alert(`❌ Error al imprimir en "${pName}":\n${err.message || err}\n\nVerifica la conexión y configuración de la impresora.`);
        return { success: false, error: err.message || err };
      });
    }
    return Promise.resolve({ success: false });
  }, [config]);

  // Escuchar eventos de componentes que llaman silentPrintHtml directamente
  useEffect(() => {
    const handler = (e: Event) => {
      const opts = (e as CustomEvent).detail;
      silentPrintOrEco(opts);
    };
    window.addEventListener('fm-silent-print', handler);
    return () => window.removeEventListener('fm-silent-print', handler);
  }, [silentPrintOrEco]);

  // Escuchar atajos de zoom de Electron
  useEffect(() => {
    const eAPI = (window as any).electronAPI;
    if (!eAPI) return;

    eAPI.onZoomChanged((factor: number) => {
      setConfig(prev => {
        const updated = { ...prev, appZoomLevel: factor };
        localStorage.setItem('fixmanager_config', JSON.stringify(updated));
        return updated;
      }, true);
    });

    eAPI.onZoomReset(() => {
      setConfig(prev => {
        const updated = { ...prev, appZoomLevel: 'auto' as const };
        localStorage.setItem('fixmanager_config', JSON.stringify(updated));
        eAPI.applyZoomFactor('auto');
        return updated;
      }, true);
    });
  }, []);

  // Aplicar zoom de la interfaz cuando cargue la app o cambie config.appZoomLevel
  useEffect(() => {
    const eAPI = (window as any).electronAPI;
    if (eAPI?.applyZoomFactor && config.appZoomLevel !== undefined) {
      eAPI.applyZoomFactor(config.appZoomLevel);
    }
  }, [config.appZoomLevel]);

  const [prefillFromQuote, setPrefillFromQuote] = useState<{
    quoteId: string;
    customerName: string;
    customerPhone: string;
    customerCountryCode: string;
    devices: QuoteDevice[];
  } | null>(null);

  const [prefillFromRefaccion, setPrefillFromRefaccion] = useState<RefaccionItem | null>(null);

  const [isCorteModalOpen, setIsCorteModalOpen] = useState<boolean>(false);
  const [movimientoModal, setMovimientoModal] = useState<'entrada' | 'salida' | null>(null);
  const [isEntregaTurnoOpen, setIsEntregaTurnoOpen] = useState<boolean>(false);
  const [cortesHistorial, rawSetCortesHistorial] = useState<CorteEntry[]>(() => {
    const saved = localStorage.getItem('fixmanager_cortes');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'CORTE-019',
        date: '2026-05-19',
        time: '19:45 PM',
        user: 'garciahugo0@gmail.com',
        fisico: 1250,
        estimado: 1250,
        diferencia: 0,
        denominations: {
          b1000: 1,
          b200: 1,
          b50: 1
        },
        comment: 'Corte de caja de demostración inicial. Todo cuadrado correctamente.'
      }
    ];
  });

  const [users, rawSetUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('fixmanager_users');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{
      id: 'user-admin-default',
      name: 'Administrador',
      role: 'admin' as const,
      pin: '1234',
      createdAt: new Date().toISOString(),
      permissions: ADMIN_PERMISSIONS
    }];
  });

  // Helper para detectar cambios en campos de sincronización
  const isEntityChanged = (oldItem: any, newItem: any) => {
    if (!oldItem) return false;
    const { uuid: _u1, updatedAt: _t1, ...cleanOld } = oldItem;
    const { uuid: _u2, updatedAt: _t2, ...cleanNew } = newItem;
    return JSON.stringify(cleanOld) !== JSON.stringify(cleanNew);
  };

  // Wrapper genérico para inyectar automáticamente uuid, updatedAt y el flag dirty en escrituras locales
  const createStateWrapper = <T extends { id: string; uuid?: string; updatedAt?: string; dirty?: boolean }>(
    rawSetter: React.Dispatch<React.SetStateAction<T[]>>,
    storageKey: string
  ) => {
    return (newVal: T[] | ((prev: T[]) => T[])) => {
      rawSetter(prev => {
        const resolved = typeof newVal === 'function' ? newVal(prev) : newVal;

        // Detectar registros eliminados localmente
        const deletedKey = `${storageKey}_deleted`;
        const deletedItems: { id: string; uuid: string; payload: any }[] = [];
        prev.forEach(oldItem => {
          const exists = resolved.some(item => item.id === oldItem.id);
          if (!exists && oldItem.uuid) {
            deletedItems.push({ id: oldItem.id, uuid: oldItem.uuid, payload: oldItem });
          }
        });
        if (deletedItems.length > 0) {
          try {
            const currentDeleted = JSON.parse(localStorage.getItem(deletedKey) || '[]');
            deletedItems.forEach(d => {
              if (!currentDeleted.some((x: any) => x.uuid === d.uuid)) {
                currentDeleted.push(d);
              }
            });
            localStorage.setItem(deletedKey, JSON.stringify(currentDeleted));
            (window as any).addDebugLog?.(`[Sync] Registro eliminado localmente en ${storageKey}:`, deletedItems);
          } catch (_) {}
        }

        const processed = resolved.map(item => {
          const oldItem = prev.find(i => i.id === item.id);
          const isNew = !oldItem;
          const isChanged = oldItem && isEntityChanged(oldItem, item);
          const uuid = item.uuid || oldItem?.uuid || generateUUID();
          const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (item.updatedAt || oldItem?.updatedAt || new Date().toISOString());
          const dirty = (isNew || isChanged) ? true : item.dirty;
          if (item.id === 'TKT-0005') {
            (window as any).addDebugLog?.(`createStateWrapper(${storageKey}) TKT-0005: isNew=${isNew}, isChanged=${isChanged}, dirty=${dirty}, oldEv=${(oldItem as any)?.evidence?.length || 0}, newEv=${(item as any).evidence?.length || 0}, newUpdatedAt=${updatedAt}`);
          }
          return {
            ...item,
            uuid,
            updatedAt,
            dirty
          } as T;
        });
        localStorage.setItem(storageKey, JSON.stringify(processed));
        const hasLocalChanges = deletedItems.length > 0 || processed.some(item => (item as any).dirty);
        if (hasLocalChanges) {
          setTimeout(() => {
            if (triggerSyncRef.current) {
              triggerSyncRef.current();
            }
          }, 500);
        }
        return processed;
      });
    };
  };

  const setOrders = createStateWrapper<RepairOrder>(rawSetOrders, 'fixmanager_orders');
  const setServices = createStateWrapper<ServicePrice>(rawSetServices, 'fixmanager_services');
  const setInventory = createStateWrapper<InventoryItem>(rawSetInventory, 'fixmanager_inventory');
  const setRefacciones = createStateWrapper<RefaccionItem>(rawSetRefacciones, 'fixmanager_refacciones');
  const setDonors = createStateWrapper<DonorDevice>(rawSetDonors, 'fixmanager_donors');
  const setClients = createStateWrapper<Client>(rawSetClients, 'fixmanager_clients');
  const setExpenses = createStateWrapper<Expense>(rawSetExpenses, 'fixmanager_expenses');
  const setSales = createStateWrapper<Sale>(rawSetSales, 'fixmanager_sales');
  const setQuotes = createStateWrapper<Quote>(rawSetQuotes, 'fixmanager_quotes');
  const setCortesHistorial = createStateWrapper<CorteEntry>(rawSetCortesHistorial, 'fixmanager_cortes');
  const setUsers = createStateWrapper<AppUser>(rawSetUsers, 'fixmanager_users');
  const setChipActivations = createStateWrapper<ChipActivation>(rawSetChipActivations, 'fixmanager_chip_activations');

  useEffect(() => {
    localStorage.setItem('fixmanager_users', JSON.stringify(users));
  }, [users]);

  // Asegurar que todos los clientes de órdenes, fiados y apartados existan en el catálogo de clientes
  useEffect(() => {
    if (!orders.length && !creditAccounts.length && !apartados.length) return;
    
    const clientMap = new Map<string, { name: string; phone: string; countryCode?: string }>();
    
    orders.forEach(o => {
      if (o.customerName && o.customerPhone) {
        const cleanPhone = o.customerPhone.replace(/\D/g, '');
        if (cleanPhone) {
          clientMap.set(cleanPhone, {
            name: o.customerName.trim(),
            phone: o.customerPhone.trim(),
            countryCode: o.customerCountryCode
          });
        }
      }
    });

    creditAccounts.forEach(a => {
      if (a.clientName && a.clientPhone) {
        const cleanPhone = a.clientPhone.replace(/\D/g, '');
        if (cleanPhone) {
          clientMap.set(cleanPhone, {
            name: a.clientName.trim(),
            phone: a.clientPhone.trim()
          });
        }
      }
    });

    apartados.forEach(ap => {
      if (ap.clientName && ap.clientPhone) {
        const cleanPhone = ap.clientPhone.replace(/\D/g, '');
        if (cleanPhone) {
          clientMap.set(cleanPhone, {
            name: ap.clientName.trim(),
            phone: ap.clientPhone.trim()
          });
        }
      }
    });

    let modified = false;
    const nextClients = [...clients];

    clientMap.forEach((info, phoneClean) => {
      const exists = nextClients.some(c => {
        const cPhoneClean = (c.phone || '').replace(/\D/g, '');
        return cPhoneClean === phoneClean || c.name.toUpperCase() === info.name.toUpperCase();
      });

      if (!exists) {
        const newId = `C${nextClients.length + 1}`;
        const newClient: Client = {
          id: newId,
          uuid: generateUUID(),
          name: info.name,
          phone: info.phone,
          countryCode: info.countryCode,
          email: `${info.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          totalOrders: orders.filter(o => o.customerPhone === info.phone).length,
          registeredAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
          creditLimit: config.defaultCreditLimit ?? 1000
        };
        nextClients.push(newClient);
        modified = true;
      }
    });

    if (modified) {
      setClients(nextClients);
    }
  }, [orders, creditAccounts, apartados]);

  const [sessionId, setSessionId] = useState<number>(() => {
    const saved = localStorage.getItem('fixmanager_session_id');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  });

  const [isCajaOpen, setIsCajaOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('fixmanager_is_caja_open');
    return saved === 'true'; // Solo true si fue explícitamente marcada como abierta
  });

  const [saldoInicial, setSaldoInicial] = useState<number>(() => {
    const saved = localStorage.getItem('fixmanager_saldo_inicial');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  });

  // Interceptar cierre: mostrar modal si hay caja abierta, pero solo si el usuario ya está dentro de la app activa
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCajaOpen && appScreen === 'active') {
        e.preventDefault();
        e.returnValue = '';
        setShowCloseWarning(true);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCajaOpen, appScreen]);

  const handleOpenCaja = (monto: number) => {
    const nuevaApertura = {
      id: `APE-${Date.now().toString().slice(-6)}`,
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      aperturadoPor: currentUser?.name || 'Desconocido',
      rol: currentUser?.role || 'admin',
      fondoInicial: monto,
      sesion: sessionId,
    };
    setAperturas(prev => [nuevaApertura, ...prev]);

    if (config.notifyOnApertura !== false) {
      sendTelegram(config, tgApertura(nuevaApertura, config), 'Apertura de caja');
    }

    setIsCajaOpen(true);
    setSaldoInicial(monto);
    localStorage.setItem('fixmanager_is_caja_open', 'true');
    localStorage.setItem('fixmanager_saldo_inicial', monto.toString());
    localStorage.setItem('fixmanager_session_closed', 'false');
    setAppScreen('active');
  };



  // Sync to localStorage AND disco on state changes
  useEffect(() => {
    try {
      // Filtrar cualquier valor no-serializable (DOM elements, circular refs) antes de guardar
      const safeConfig = JSON.parse(JSON.stringify(config, (_key, value) => {
        if (value instanceof Node || value instanceof Window || value instanceof EventTarget) return undefined;
        return value;
      }));
      localStorage.setItem('fixmanager_config', JSON.stringify(safeConfig));
      // Guardar también en disco via Electron IPC (capa de respaldo)
      const api = (window as any).electronAPI;
      if (api?.saveSettings) {
        api.saveSettings(safeConfig).catch(() => {});
      }
    } catch (e) {
      console.warn('Error saving config:', e);
    }
  }, [config]);

  // Sincronizar datos de configuración del negocio a Supabase
  useEffect(() => {
    const syncToSupabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (user) {
          try {
            await supabase
              .from('profiles')
              .update({
                business_name: config.storeName || '',
                business_phone: config.phone || null
              })
              .eq('id', user.id)
              .eq('app', 'fixmanager');
          } catch (e) {}
        }
      } catch {}
    };
    syncToSupabase();
  }, [config.storeName, config.phone]);

  // ─── SISTEMA DE SINCRONIZACIÓN MULTICAJA HÍBRIDA ─────────────────────────────
  const fetchLocalServerData = useCallback(async (host: string) => {
    let timeoutId: any = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(`${host}/api/sync`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        isSyncingRef.current = true;
        
        if (data.orders) {
          setOrders(data.orders);
          localStorage.setItem('fixmanager_orders', JSON.stringify(data.orders));
        }
        if (data.inventory) {
          setInventory(data.inventory);
          localStorage.setItem('fixmanager_inventory', JSON.stringify(data.inventory));
        }
        if (data.refacciones) {
          setRefacciones(data.refacciones);
          localStorage.setItem('fixmanager_refacciones', JSON.stringify(data.refacciones));
        }
        if (data.donors) {
          setDonors(data.donors);
          localStorage.setItem('fixmanager_donors', JSON.stringify(data.donors));
        }
        if (data.clients) {
          setClients(data.clients);
          localStorage.setItem('fixmanager_clients', JSON.stringify(data.clients));
        }
        if (data.config) {
          setConfig(data.config, true);
          localStorage.setItem('fixmanager_config', JSON.stringify(data.config));
        }
        if (data.expenses) {
          setExpenses(data.expenses);
          localStorage.setItem('fixmanager_expenses', JSON.stringify(data.expenses));
        }
        if (data.sales) {
          setSales(data.sales);
          localStorage.setItem('fixmanager_sales', JSON.stringify(data.sales));
        }
        if (data.cortes) {
          setCortesHistorial(data.cortes);
          localStorage.setItem('fixmanager_cortes', JSON.stringify(data.cortes));
        }
        if (data.users) {
          setUsers(data.users);
          localStorage.setItem('fixmanager_users', JSON.stringify(data.users));
        }
        if (data.services) {
          setServices(data.services);
          localStorage.setItem('fixmanager_services', JSON.stringify(data.services));
        }
        
        failedSyncAttemptsRef.current = 0;
        isInitialSyncRef.current = false;
        setLanSyncBlocked(false);
        setLanStatus('connected');
        
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
        return true;
      } else {
        throw new Error('Response status not OK');
      }
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      failedSyncAttemptsRef.current += 1;
      
      if (isInitialSyncRef.current || failedSyncAttemptsRef.current >= 3) {
        setLanSyncBlocked(true);
        setLanStatus('disconnected');
      } else {
        setLanStatus('connecting');
      }
      isInitialSyncRef.current = false;
      return false;
    }
  }, [setOrders, setInventory, setClients, setConfig, setExpenses, setSales, setCortesHistorial, setUsers, setServices]);

  // Polling para terminales esclavas
  useEffect(() => {
    const localServerHost = localStorage.getItem('selected_local_server_host');
    if (!localServerHost) return;

    fetchLocalServerData(localServerHost);

    const interval = setInterval(() => {
      fetchLocalServerData(localServerHost);
    }, 7000);

    return () => clearInterval(interval);
  }, [fetchLocalServerData]);

  // Enviar cambios locales al servidor si somos cliente LAN
  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: orders })
    }).catch(e => console.error('[LAN client] Error syncing orders:', e));
  }, [orders]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: inventory })
    }).catch(e => console.error('[LAN client] Error syncing inventory:', e));
  }, [inventory]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/refacciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: refacciones })
    }).catch(e => console.error('[LAN client] Error syncing refacciones:', e));
  }, [refacciones]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: donors })
    }).catch(e => console.error('[LAN client] Error syncing donors:', e));
  }, [donors]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: sales })
    }).catch(e => console.error('[LAN client] Error syncing sales:', e));
  }, [sales]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: clients })
    }).catch(e => console.error('[LAN client] Error syncing clients:', e));
  }, [clients]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: expenses })
    }).catch(e => console.error('[LAN client] Error syncing expenses:', e));
  }, [expenses]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/cortes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cortesHistorial })
    }).catch(e => console.error('[LAN client] Error syncing cortes:', e));
  }, [cortesHistorial]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: config })
    }).catch(e => console.error('[LAN client] Error syncing config:', e));
  }, [config]);

  useEffect(() => {
    const host = localStorage.getItem('selected_local_server_host');
    if (!host || isSyncingRef.current) return;
    fetch(`${host}/api/save/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: services })
    }).catch(e => console.error('[LAN client] Error syncing services:', e));
  }, [services]);

  // Clever gesture tracker to start in fullscreen if defaultFullscreen is enabled
  useEffect(() => {
    if (config.defaultFullscreen) {
      const enterFS = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.log('Autorequest fullscreen failed or blocked:', err);
          });
        }
        // De-register to only run once on first user gesture
        window.removeEventListener('click', enterFS);
        window.removeEventListener('keydown', enterFS);
      };
      window.addEventListener('click', enterFS);
      window.addEventListener('keydown', enterFS);
      return () => {
        window.removeEventListener('click', enterFS);
        window.removeEventListener('keydown', enterFS);
      };
    }
  }, [config.defaultFullscreen]);

  useEffect(() => {
    localStorage.setItem('fixmanager_cortes', JSON.stringify(cortesHistorial));
  }, [cortesHistorial]);

  const prevAppScreenRef = React.useRef<string>('');
  const hasLoggedInOnce = React.useRef(false);
  const [showLoginOverlay, setShowLoginOverlay] = React.useState(false);
  useEffect(() => {
    const prev = prevAppScreenRef.current;
    prevAppScreenRef.current = appScreen;
    const wasLogin = prev === 'login';
    const isLogin = appScreen === 'login';
    const wasSetup = prev === 'setup';
    const isSetup = appScreen === 'setup';

    // Wizard: mostrar en ventana pequeña cuando se activa desde dentro de la app
    if (!wasSetup && isSetup && hasLoggedInOnce.current) {
      (window as any).electronAPI?.setWizardMode?.(true);
    }
    // Wizard completado → licencia: volver a ventana pequeña (560×640)
    if (wasSetup && appScreen === 'license') {
      (window as any).electronAPI?.setLoginMode?.(true, true);
    }
    // Wizard completado → fullscreen (cualquier otra pantalla)
    if (wasSetup && appScreen !== 'license' && hasLoggedInOnce.current) {
      (window as any).electronAPI?.setWizardMode?.(false);
    }
    // Apertura de caja: pasar a fullscreen (la app principal queda de fondo)
    if (appScreen === 'apertura') {
      (window as any).electronAPI?.setLoginMode?.(false, false);
    }

    if (wasLogin && !isLogin) {
      hasLoggedInOnce.current = true;
      setShowLoginOverlay(false);
      (window as any).electronAPI?.setLoginMode?.(false, false);
    } else if (!wasLogin && isLogin) {
      // Siempre volver a ventana de login pequeña centrada (igual que el primer arranque)
      hasLoggedInOnce.current = false;
      setShowLoginOverlay(false); // state → dispara re-render mostrando login limpio
      (window as any).electronAPI?.setLoginMode?.(true, true);
    }
  }, [appScreen]);
 
  // Redirección de seguridad: si la licencia deja de estar activa y no estamos en la pantalla principal activa,
  // forzar cierre de sesión y redirección a login inmediatamente.
  // Excepción: Permitimos "banner suave" (quedarse en active) SOLO si la licencia está expirada ('expired').
  // Si está suspendida ('invalid') o no hay licencia ('none'), se expulsa al usuario de inmediato.
  useEffect(() => {
    if (licenseStatus !== 'active' && licenseStatus !== 'checking') {
      const isExpiredSoftBanner = licenseStatus === 'expired' && appScreen === 'active';
      if (!isExpiredSoftBanner) {
        if (appScreen !== 'login' && appScreen !== 'welcome-choice' && appScreen !== 'setup' && appScreen !== 'cloud-restore') {
          setCurrentUser(null);
          setAppScreen('login');
        }
      }
    }
  }, [licenseStatus, appScreen]);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => {
    const saved = localStorage.getItem('fixmanager_audit');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('fixmanager_audit', JSON.stringify(auditLog));
  }, [auditLog]);

  const registrarAudit = (accion: AuditAction, detalle: string, referencia?: string) => {
    if (!currentUser) return;
    const entry: AuditEntry = {
      id: `AUD-${Date.now()}`,
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      usuario: currentUser.name,
      rol: currentUser.role,
      accion,
      detalle,
      referencia,
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 500)); // máx 500 entradas
  };

  const [aperturas, setAperturas] = useState<AperturaEntry[]>(() => {
    const saved = localStorage.getItem('fixmanager_aperturas');
    return saved ? JSON.parse(saved) : [];
  });
   useEffect(() => {
    safeSetItem('fixmanager_aperturas', JSON.stringify(aperturas));
  }, [aperturas]);

  useEffect(() => {
    safeSetItem('fixmanager_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeSetItem('fixmanager_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    safeSetItem('fixmanager_quote_catalog', JSON.stringify(quoteCatalog));
  }, [quoteCatalog]);

  useEffect(() => {
    safeSetItem('fixmanager_insumos_catalog', JSON.stringify(insumosCatalog));
  }, [insumosCatalog]);

  useEffect(() => {
    safeSetItem('fixmanager_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    safeSetItem('fixmanager_refacciones', JSON.stringify(refacciones));
  }, [refacciones]);

  useEffect(() => {
    safeSetItem('fixmanager_donors', JSON.stringify(donors));
  }, [donors]);

  useEffect(() => {
    safeSetItem('fixmanager_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    safeSetItem('fixmanager_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    safeSetItem('fixmanager_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    safeSetItem('fixmanager_credit_accounts', JSON.stringify(creditAccounts));
  }, [creditAccounts]);

  useEffect(() => {
    safeSetItem('fixmanager_apartados', JSON.stringify(apartados));
  }, [apartados]);

  // Limpieza preventiva de almacenamiento local si está saturado o corrupto por evidencias simuladas gigantes
  useEffect(() => {
    try {
      let totalLength = 0;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalLength += val.length;
          // Si una clave individual de evidencia simulada supera 1.5MB, la marcamos para eliminar
          if (key.startsWith('fixmanager_evidences_') && val.length > 1.5 * 1024 * 1024) {
            keysToRemove.push(key);
          }
        }
      }
      
      // Si el almacenamiento total supera los 3.5MB, o hay claves individuales enormes, limpiamos evidencias simuladas
      if (totalLength > 3.5 * 1024 * 1024 || keysToRemove.length > 0) {
        console.warn("[LocalStorage] Almacenamiento casi lleno o claves excesivamente grandes detectadas. Limpiando evidencias simuladas para liberar espacio...");
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        // Si aún sigue pesado, eliminar cualquier clave de evidencia simulada para salvar la app
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fixmanager_evidences_')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.error("Error al ejecutar limpieza de localStorage:", e);
    }
  }, []);

  // Trigger a warning toast if the user accesses a hidden module
  useEffect(() => {
    if (activeTab && config.hiddenModules?.includes(activeTab)) {
      // Find the tab label
      const tabNames: Record<string, string> = {
        POS: 'Punto de Venta (POS)',
        Ventas: 'Historial de Ventas',
        Fiados: 'Créditos / Fiados',
        Stock: 'Inventario / Stock',
        Reabastecer: 'Reabasto',
        Etiquetas: 'Impresión de Etiquetas',
        Nueva: 'Nueva Orden',
        Órdenes: 'Órdenes de Servicio',
        Cotizaciones: 'Cotizaciones',
        Precios: 'Precios de Servicios',
        Refacciones: 'Inventario de Refacciones',
        Equipos: 'Equipos en Taller',
        Clientes: 'Base de Clientes',
        Catalogo: 'Catálogo de Dispositivos',
        Entrada: 'Entrada de Caja',
        Salida: 'Salida de Caja',
        Cortes: 'Caja / Cortes',
        Reportes: 'Reportes y Estadísticas'
      };
      const label = tabNames[activeTab] || activeTab;
      
      const isLightMode = config.themeMode === 'light' || config.theme === 'retro-window';
      const toast = document.createElement('div');
      toast.className = 'animate-fade-in-up';
      toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;color:${isLightMode ? '#1e293b' : '#ffffff'};">
          <span style="font-size:18px;margin-right:2px;user-select:none;">👁️‍🗨️</span>
          <div>
            <div style="font-weight:900;font-size:10px;letter-spacing:0.8px;color:${isLightMode ? '#2563eb' : '#a78bfa'};margin-bottom:2px;font-family:system-ui,-apple-system,sans-serif;">MÓDULO OCULTO</div>
            <div style="font-size:10px;font-weight:500;color:${isLightMode ? '#475569' : '#cbd5e1'};font-family:system-ui,-apple-system,sans-serif;line-height:1.2;">Estás en <strong style="color:${isLightMode ? '#0f172a' : '#ffffff'};font-weight:800;">${label}</strong>. Este módulo está oculto en tu menú lateral.</div>
          </div>
        </div>
      `;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 99999;
        padding: 10px 16px;
        border-radius: 8px;
        background: ${isLightMode ? '#ffffff' : '#1e1b4b'};
        color: ${isLightMode ? '#1e293b' : '#ffffff'};
        border: 1px solid ${isLightMode ? '#cbd5e1' : '#312e81'};
        box-shadow: ${isLightMode ? '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)' : '0 10px 25px -5px rgba(0,0,0,0.3)'};
        pointer-events: none;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
      }, 4000);
    }
  }, [activeTab, config.hiddenModules]);

  // Automated Physical Printing Toast State and Listener
  const [activePrintJobs, setActivePrintJobs] = useState<PrintJob[]>([]);
  const [telegramJobs, setTelegramJobs] = useState<{id: string; label: string; status: 'sending'|'ok'|'error'}[]>([]);
  const [updateInfo, setUpdateInfo] = useState<{version: string, notes: string, dmgUrl: string, platformLabel?: string} | null>(null);
  useEffect(() => { (window as any).__setUpdateInfo = setUpdateInfo; }, [setUpdateInfo]);
  useEffect(() => {
    const interval = setInterval(() => {
      const update = localStorage.getItem('fixmanager_update');
      if (update) {
        try {
          const parsed = JSON.parse(update);
          setUpdateInfo(parsed);
          setPendingUpdateVersion(parsed.version);
          localStorage.removeItem('fixmanager_update');
        } catch(e) {}
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePrintEvent = (e: CustomEvent<{ type: 'ticket' | 'label'; name: string; details?: string }>) => {
      // En modo eco no hay impresoras — no mostrar notificaciones de impresión
      if (config.ecoMode) return;

      const { type, name, details } = e.detail;

      // Verificar si hay impresora real configurada
      const isConfigured = type === 'ticket'
        ? !!(config.printerInterface && config.printerInterface !== 'Default')
        : !!(config.labelPrinterBrand && config.labelPrinterBrand !== '');

      // Sin impresora configurada → toast de aviso con botón a ajustes (sin nombres ficticios)
      if (!isConfigured) {
        const jobId = `no-printer-${Date.now()}`;
        setActivePrintJobs(prev => [...prev, { id: jobId, type, name, details, printerName: '', status: 'no-printer', unconfigured: true }]);
        setTimeout(() => {
          setActivePrintJobs(prev => prev.filter(j => j.id !== jobId));
        }, 8000);
        return;
      }

      // Construir nombre de impresora solo con datos reales que el usuario configuró
      let printerName = '';
      if (type === 'ticket') {
        const iface = config.printerInterface!;
        if (iface === 'Ethernet') {
          printerName = `Impresora LAN${config.printerIpAddress ? ` · ${config.printerIpAddress}` : ''}`;
        } else {
          printerName = `Impresora ${iface}`;
        }
      } else {
        const brand = config.labelPrinterBrand || '';
        const iface = config.labelPrinterInterface || '';
        printerName = brand;
        if (iface === 'Ethernet' && config.labelPrinterIpAddress) {
          printerName += ` · LAN ${config.labelPrinterIpAddress}`;
        } else if (iface && iface !== 'Default') {
          printerName += ` · ${iface}`;
        }
      }

      const jobId = `${type}-${Date.now()}`;
      setActivePrintJobs(prev => [...prev, { id: jobId, type, name, details, printerName, status: 'sending' }]);

      setTimeout(() => {
        setActivePrintJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'printing' } : j));
      }, 1000);
      setTimeout(() => {
        setActivePrintJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'success' } : j));
      }, 2500);
      setTimeout(() => {
        setActivePrintJobs(prev => prev.filter(j => j.id !== jobId));
      }, 4300);
    };

    window.addEventListener('automated-print' as any, handlePrintEvent);
    return () => {
      window.removeEventListener('automated-print' as any, handlePrintEvent);
    };
  }, [config]);

  useEffect(() => {
    const handleSending = (e: CustomEvent) => {
      const { label } = e.detail;
      const id = `tg-${Date.now()}-${Math.random()}`;
      setTelegramJobs(prev => [...prev, { id, label, status: 'sending' }]);
      // guardar id en el evento para que telegram-result lo encuentre
      (e as any).__tgId = id;
    };
    const handleResult = (e: CustomEvent) => {
      const { label, ok } = e.detail;
      setTelegramJobs(prev => {
        const job = [...prev].reverse().find(j => j.label === label && j.status === 'sending');
        if (!job) return prev;
        const updated = prev.map(j => j.id === job.id ? { ...j, status: ok ? 'ok' : 'error' } as typeof j : j);
        setTimeout(() => setTelegramJobs(p => p.filter(j => j.id !== job.id)), 3000);
        return updated;
      });
    };
    window.addEventListener('telegram-sending' as any, handleSending);
    window.addEventListener('telegram-result' as any, handleResult);
    return () => {
      window.removeEventListener('telegram-sending' as any, handleSending);
      window.removeEventListener('telegram-result' as any, handleResult);
    };
  }, []);

  // Handle Event Handlers
  const handleCreateOrder = (newOrder: RepairOrder, options?: { printTicket: boolean; printLabel: boolean; suppressTelegram?: boolean; batchPosition?: number; batchTotal?: number; sendWhatsapp?: boolean }) => {
    // En modo personal las órdenes nacen en "En Reparación"; en modo equipo en "Pendiente"
    const initialStatus = (config.workshopMode ?? 'personal') === 'personal' ? 'En Reparación' : 'Pendiente';
    const userLogStr = currentUser?.name || 'Administrador';
    const initialLog = {
      action: 'CREACIÓN DE ORDEN',
      user: userLogStr,
      timestamp: new Date().toISOString()
    };
    const orderWithUser = {
      ...newOrder,
      status: initialStatus as RepairOrder['status'],
      sessionId,
      ...(currentUser ? { createdBy: currentUser.name } : {}),
      activityLog: [initialLog]
    };
    setOrders(prev => [orderWithUser, ...prev]);
    setSelectedOrderId(newOrder.id);

    // Si esta orden viene de una cotización, marcarla como Convertida ahora que el registro es real
    if (prefillFromQuote?.quoteId && !options?.batchPosition || (options?.batchPosition === 1 && prefillFromQuote?.quoteId)) {
      setQuotes(prev => prev.map(q => q.id === prefillFromQuote!.quoteId ? { ...q, status: 'Convertida' as const, convertedToOrderId: newOrder.id } : q));
      setPrefillFromQuote(null);
    }

    if (config.notifyOnOrder !== false && !options?.suppressTelegram) { sendTelegram(config, tgNuevaOrden(newOrder, config), 'Nueva orden'); }

    // Update or register client
    registerOrUpdateClient(newOrder.customerName, newOrder.customerPhone, newOrder.customerCountryCode, true);

    // Auto-trigger printing options selected by user
    const hasOptions = !!options;
    const shouldPrintTicket = hasOptions ? options.printTicket : true;
    const shouldPrintLabel  = hasOptions ? options.printLabel  : true;

    // Inteligencia para copia de respaldo de taller en el aparato cuando se envía por WhatsApp:
    // Si se envía por WhatsApp y no se imprime el ticket completo del cliente:
    // - En modo híbrido/clásico: siempre necesitamos imprimir un ticket físico de respaldo de taller (Media Carta).
    // - En modo térmico: solo necesitamos imprimir el ticket de respaldo si NO se imprime una etiqueta adhesiva.
    const needsWorkshopTicket = !shouldPrintTicket && options?.sendWhatsapp && (config.hybridPrintMode || !shouldPrintLabel);

    const eAPI = (window as any).electronAPI;
    const paperWidthMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
      ? 210000
      : (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta')
        ? 215900
        : config.ticketPaperWidth === '58mm'
          ? 48000
          : 72000;
    const paperHeightMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
      ? 297000
      : config.hybridPrintMode
        ? 279400
        : config.ticketPaperWidth === 'media-carta'
          ? 139700
          : undefined;

    if (shouldPrintTicket) {
      const html = buildTicketHtml(newOrder, config, config.duplexManual ? 'front' : undefined);
      silentPrintOrEco({
        html,
        deviceName: config.ticketPrinterBrand || undefined,
        paperWidthMicrons,
        paperHeightMicrons,
        isLabel: false,
        isServiceTicket: true,
        order: newOrder
      });
      window.dispatchEvent(new CustomEvent('automated-print', {
        detail: { type: 'ticket', id: newOrder.id, name: `Ticket de Ingreso ${newOrder.id}`, details: `Cliente: ${newOrder.customerName} • ${newOrder.deviceBrand} ${newOrder.deviceModel}` }
      }));
    } else if (needsWorkshopTicket) {
      const html = buildTicketHtml(newOrder, config, 'front');
      silentPrintOrEco({
        html,
        deviceName: config.ticketPrinterBrand || undefined,
        paperWidthMicrons,
        paperHeightMicrons: (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado')
          ? 139700
          : paperHeightMicrons,
        isLabel: false,
        isServiceTicket: true,
        order: newOrder
      });
      window.dispatchEvent(new CustomEvent('automated-print', {
        detail: { type: 'ticket', id: newOrder.id, name: `Copia de Taller ${newOrder.id}`, details: `Cliente: ${newOrder.customerName} • ${newOrder.deviceBrand} ${newOrder.deviceModel}` }
      }));
    }

    // ── Etiqueta adhesiva ───────────────────────────────────────────────────
    if (shouldPrintLabel && !config.hybridPrintMode) {
      {
        const html = buildServiceLabelHtml(newOrder, config, options?.batchPosition ?? newOrder.batchPosition, options?.batchTotal ?? newOrder.batchTotal);
        
        const sizeKey = config.labelPaperSize || '51x25mm';
        const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
        const paperWidthMicrons = widthMm * 1000;
        const paperHeightMicrons = heightMm * 1000;

        silentPrintOrEco({
          html,
          deviceName: config.labelPrinterBrand || '',
          copies: config.printLabelCopies || 1,
          isLabel: true,
          paperWidthMicrons,
          paperHeightMicrons
        });
      }
      window.dispatchEvent(new CustomEvent('automated-print', {
        detail: { type: 'label', id: newOrder.id, name: `Etiqueta de Servicio ${newOrder.id}`, details: `Cliente: ${newOrder.customerName} • ${newOrder.deviceBrand} ${newOrder.deviceModel}` }
      }));
    }

    if (options?.sendWhatsapp && config.whatsappMode && config.whatsappMode !== 'disabled') {
      const msg = buildWhatsappOrderReceptionMessage(newOrder, config);
      const html = buildTicketHtml(newOrder, config, 'whatsapp');
      sendWhatsappNotification(config, newOrder.customerPhone, msg, html, true, undefined, newOrder.customerCountryCode).then(res => {
        if (!res.ok) {
          console.warn('[WhatsApp] Error al enviar comprobante de recepción:', res.error);
        }
      }).catch(err => {
        console.error('[WhatsApp] Error inesperado:', err);
      });
    }
  };

  const handleUpdateStatus = (id: string, nextStatus: RepairOrder['status'], skipWhatsapp?: boolean) => {
    const order = orders.find(o => o.id === id);

    // Reintegrar stock si se cancela o falla la reparación
    if (order && (nextStatus === 'Cancelado' || nextStatus === 'Fallido')) {
      if (order.parts && order.parts.length > 0) {
        const partsToRefund = order.parts.filter(p => p.refaccionId && p.fromStock);
        if (partsToRefund.length > 0) {
          setRefacciones(prev =>
            prev.map(r => {
              const count = partsToRefund.filter(p => p.refaccionId === r.id).length;
              return count > 0 ? { ...r, stock: r.stock + count } : r;
            })
          );
        }
      }
    }

    const estadosSensibles: RepairOrder['status'][] = ['Cancelado', 'Fallido', 'Entregado y Pagado'];
    if (order && estadosSensibles.includes(nextStatus)) {
      registrarAudit(
        'cambio_estado_orden',
        `Cambió orden ${id} (${order.customerName} · ${order.deviceBrand} ${order.deviceModel}) a "${nextStatus}"`,
        id
      );
    }

    const userLogStr = currentUser?.name || 'Administrador';
    const logEntry = {
      action: `CAMBIO DE ESTADO A ${nextStatus.toUpperCase()}`,
      user: userLogStr,
      timestamp: new Date().toISOString()
    };
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === id ? { 
        ...o, 
        status: nextStatus, 
        isPaid: nextStatus === 'Entregado y Pagado' ? true : o.isPaid,
        activityLog: [...(o.activityLog || []), logEntry]
      } : o))
    );

    // Si se cancela una orden que tenía anticipo → registrar salida de caja (devolución)
    if (order && nextStatus === 'Cancelado' && order.advancePayment > 0) {
      const reembolso: Expense = {
        id: `REEMB-${id}-${Date.now()}`,
        description: `Devolución anticipo — Orden cancelada ${id} (${order.customerName} · ${order.deviceBrand} ${order.deviceModel})`,
        category: 'Devolución de Servicio',
        amount: order.advancePayment,
        createdAt: new Date().toISOString(),
        type: 'salida',
      };
      setExpenses(prev => [reembolso, ...prev]);
    }

    if (order) {
      if (config.notifyOnStatusChange !== false) { sendTelegram(config, tgCambioEstado(order, nextStatus, config), 'Cambio de estado'); }
      if (config.notifyOnDelivery !== false && (nextStatus === 'Entregado' || nextStatus === 'Entregado y Pagado')) {
        sendTelegram(config, tgOrdenEntregada({ ...order, status: nextStatus }, config), 'Orden entregada');
      }

      // Notificación automática de WhatsApp al cambiar estado: se envía el texto de actualización,
      // NO la imagen del ticket (eso aplica sólo en recepción y entrega de la orden).
      if (!skipWhatsapp && config.whatsappMode && config.whatsappMode !== 'disabled' && order.customerPhone) {
        const isMobileDevice = isMobile();
        const skipAutoOnMobile = isMobileDevice && (nextStatus === 'Entregado' || nextStatus === 'Entregado y Pagado');

        if (!skipAutoOnMobile) {
          const enabledStates = config.whatsappNotifyStates ?? ['Pendiente', 'Diagnóstico', 'En Reparación', 'Listo', 'Entregado', 'Entregado y Pagado', 'Fallido', 'Cancelado'];
          if (enabledStates.includes(nextStatus)) {
            const msg = buildWhatsappOrderStatusMessage(order, nextStatus, config);
            sendWhatsappNotification(config, order.customerPhone, msg, undefined, true, undefined, order.customerCountryCode).catch(err => {
              console.error('[WhatsApp Status Change] Error al enviar notificación:', err);
            });
          }
        }
      }
    }
  };

  const handleUpdateDiagnose = (id: string, diagnosticsNote: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === id ? { ...o, diagnosticsNote } : o))
    );
  };

  const handleDeliverOrder = (id: string, cashPaid?: number, cardPaid?: number) => {
    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder) return;

    const adv = getIndividualAdvance(targetOrder, orders);
    const isRefund = targetOrder.status === 'Fallido';

    setOrders((prevOrders) =>
      prevOrders.map((o) => {
        const isFromSameBatch = targetOrder.batchId && o.batchId === targetOrder.batchId;
        let updatedOrder = { ...o };
        if (isRefund && isFromSameBatch) {
          updatedOrder.batchAdvancePayment = Math.max(0, (o.batchAdvancePayment || 0) - adv);
        }

        if (o.id === id) {
          const userLogStr = currentUser?.name || 'Administrador';
          if (isRefund) {
            const logEntry = {
              action: 'ENTREGA CON DEVOLUCIÓN DE ANTICIPO',
              user: userLogStr,
              timestamp: new Date().toISOString()
            };
            return {
              ...updatedOrder,
              status: 'Cancelado',
              cost: 0,
              advancePayment: 0,
              isPaid: true,
              diagnosticsNote: (o.diagnosticsNote || '') + `\n[Entregado] Equipo devuelto al cliente y orden cancelada. Anticipo de ${config.currencySymbol}${adv} devuelto íntegramente.`,
              activityLog: [...(o.activityLog || []), logEntry]
            };
          }
          const logEntry = {
            action: 'ENTREGA Y LIQUIDACIÓN',
            user: userLogStr,
            timestamp: new Date().toISOString()
          };
          return {
            ...updatedOrder,
            status: 'Entregado y Pagado',
            isPaid: true,
            cashPaid: cashPaid || 0,
            cardPaid: cardPaid || 0,
            activityLog: [...(o.activityLog || []), logEntry]
          };
        }
        return updatedOrder;
      })
    );

    // Si era Fallido y tenía anticipo, registrar salida de caja automática por el reembolso
    if (isRefund && adv > 0) {
      const reembolsoExpense: Expense = {
        id: `REEMB-${id}-${Date.now()}`,
        description: `Reembolso anticipo — Orden ${id} (${targetOrder.customerName} · ${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
        category: 'Devolución de Servicio',
        amount: adv,
        createdAt: new Date().toISOString(),
        type: 'salida',
        sessionId: sessionId,
        paymentMethod: 'Efectivo'
      };
      setExpenses(prev => [reembolsoExpense, ...prev]);
    } else if (targetOrder) {
      const newExpenses: Expense[] = [];
      if (cashPaid && cashPaid > 0) {
        newExpenses.push({
          id: `SRV-LIQ-CASH-${id}-${Date.now()}`,
          description: `Liquidación Orden ${id} (Efectivo) — ${targetOrder.customerName} (${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
          category: 'Servicio Técnico',
          amount: cashPaid,
          createdAt: new Date().toISOString(),
          type: 'entrada',
          sessionId: sessionId,
          paymentMethod: 'Efectivo'
        });
      }
      if (cardPaid && cardPaid > 0) {
        newExpenses.push({
          id: `SRV-LIQ-CARD-${id}-${Date.now()}`,
          description: `Liquidación Orden ${id} (Tarjeta) — ${targetOrder.customerName} (${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
          category: 'Servicio Técnico',
          amount: cardPaid,
          createdAt: new Date().toISOString(),
          type: 'entrada',
          sessionId: sessionId,
          paymentMethod: 'Tarjeta'
        });
      }
      if (newExpenses.length > 0) {
        setExpenses(prev => [...newExpenses, ...prev]);
      }
    }

    if (targetOrder && config.notifyOnDelivery !== false) { sendTelegram(config, tgOrdenEntregada(targetOrder, config), 'Orden entregada'); }
    console.log(`Órden de reparación ${id} marcada como ENTREGADA y LIQUIDADA.`);
  };

  const handleDeleteOrder = (id: string, options?: { refundAdvance?: boolean }) => {
    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder) return;

    // Reintegrar stock de refacciones asociadas
    if (targetOrder.parts && targetOrder.parts.length > 0) {
      const partsToRefund = targetOrder.parts.filter(p => p.refaccionId && p.fromStock);
      if (partsToRefund.length > 0) {
        setRefacciones(prev =>
          prev.map(r => {
            const count = partsToRefund.filter(p => p.refaccionId === r.id).length;
            return count > 0 ? { ...r, stock: r.stock + count } : r;
          })
        );
      }
    }

    const adv = targetOrder.batchId 
      ? (targetOrder.batchAdvancePayment || 0) 
      : (targetOrder.advancePayment || 0);

    const isSameSession = targetOrder.sessionId === sessionId;

    // Si la orden tenía anticipo y fue creada en la sesión actual, 
    // registrar entrada de caja compensatoria en expenses para no perder el registro de ingreso de hoy al borrarla de orders.
    if (isSameSession && adv > 0) {
      const breakdown = targetOrder.advancePaymentBreakdown || [];
      if (breakdown.length > 0) {
        breakdown.forEach((b, idx) => {
          const entradaCompensatoria: Expense = {
            id: `ENT-DEL-COMP-${id}-${idx}-${Date.now()}`,
            description: `Anticipo recibido (Orden eliminada) ${id} (${b.method}) — ${targetOrder.customerName} (${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
            category: 'Servicio Técnico',
            amount: b.amount,
            createdAt: new Date().toISOString(),
            type: 'entrada',
            sessionId: sessionId,
            paymentMethod: b.method
          };
          setExpenses(prev => [entradaCompensatoria, ...prev]);
        });
      } else {
        const entradaCompensatoria: Expense = {
          id: `ENT-DEL-COMP-${id}-${Date.now()}`,
          description: `Anticipo recibido (Orden eliminada) ${id} (Efectivo) — ${targetOrder.customerName} (${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
          category: 'Servicio Técnico',
          amount: adv,
          createdAt: new Date().toISOString(),
          type: 'entrada',
          sessionId: sessionId,
          paymentMethod: 'Efectivo'
        };
        setExpenses(prev => [entradaCompensatoria, ...prev]);
      }
    }

    // Si se requiere reembolso y hay anticipo
    if (options?.refundAdvance && adv > 0) {
      const reembolsoExpense: Expense = {
        id: `REEMB-DEL-${id}-${Date.now()}`,
        description: `Devolución anticipo (Orden eliminada) ${id} (${targetOrder.customerName} · ${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
        category: 'Devolución de Servicio',
        amount: adv,
        createdAt: new Date().toISOString(),
        type: 'salida',
        sessionId: sessionId,
        paymentMethod: 'Efectivo'
      };
      setExpenses(prev => [reembolsoExpense, ...prev]);
    }

    // Si la orden pertenece a un lote (grupo de equipos), actualizar sus hermanos
    if (targetOrder.batchId) {
      const siblings = orders.filter(o => o.batchId === targetOrder.batchId && o.id !== id);
      if (siblings.length > 0) {
        const batchTotal = siblings.length;
        setOrders(prevOrders => 
          prevOrders
            .filter(o => o.id !== id)
            .map(o => {
              if (o.batchId === targetOrder.batchId) {
                const sortedSiblings = [...siblings].sort((a, b) => (a.batchPosition || 0) - (b.batchPosition || 0));
                const newPos = sortedSiblings.findIndex(s => s.id === o.id) + 1;
                return {
                  ...o,
                  batchTotal,
                  batchPosition: newPos,
                  // Si se reembolsó el anticipo de grupo, ponerlo en 0 para los hermanos
                  ...(options?.refundAdvance ? { batchAdvancePayment: 0, advancePaymentBreakdown: [] } : {})
                };
              }
              return o;
            })
        );
      } else {
        setOrders(prevOrders => prevOrders.filter(o => o.id !== id));
      }
    } else {
      setOrders(prevOrders => prevOrders.filter(o => o.id !== id));
    }

    registrarAudit(
      'eliminar_orden',
      `Eliminó por completo la orden ${id} de ${targetOrder.customerName} (${targetOrder.deviceBrand} ${targetOrder.deviceModel})`,
      id
    );

    if (selectedOrderId === id) {
      setSelectedOrderId(null);
    }
  };

  const handleCompleteSale = (newSale: Sale, options?: { printTicket?: boolean; sendWhatsApp?: boolean; whatsappPhone?: string; whatsappCountryCode?: string }) => {
    const saleWithUser = { ...newSale, sessionId, ...(currentUser ? { createdBy: currentUser.name } : {}) };
    setSales([saleWithUser, ...sales]);

    if (options?.sendWhatsApp) {
      const saleMapped = {
        id: newSale.id,
        items: (newSale.items || []).map((i: any) => ({
          itemId: i.itemId || '',
          name: i.name || i.description || '',
          description: i.description || i.name || '',
          quantity: i.quantity,
          price: i.price,
          originalPrice: i.originalPrice,
          discountValue: i.discountValue ?? i.lineDiscountValue,
          discountType: i.discountType ?? i.lineDiscountType,
          fromWarehouseId: i.fromWarehouseId
        })),
        total: newSale.total,
        createdAt: newSale.createdAt || new Date().toISOString(),
        paymentMethod: newSale.paymentMethod,
        cashReceived: newSale.cashReceived,
        cardReceived: newSale.cardReceived,
        change: newSale.change,
        ticketNumber: newSale.ticketNumber || newSale.id,
        confirmationCode: newSale.confirmationCode || '',
        notes: newSale.notes || '',
        discount: newSale.discount,
        discountType: newSale.discountType,
        discountValue: newSale.discountValue,
        createdBy: newSale.createdBy || currentUser?.name || '',
      };
      const isRecharge =
        newSale.id.startsWith('R-') ||
        newSale.id.startsWith('RC-') ||
        (newSale.items || []).some((item: any) => {
          const id = item.itemId || item.id;
          return id && typeof id === 'string' && id.startsWith('recharge-');
        }) ||
        !!(newSale.confirmationCode && typeof newSale.confirmationCode === 'string' && newSale.confirmationCode.includes('Folio Aut:'));
      const msg = buildWhatsappSaleTicketMessage(saleMapped as any, config);
      const html = isRecharge ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
      sendWhatsappNotification(config, options.whatsappPhone || '', msg, html, true, newSale.change, options.whatsappCountryCode).then(res => {
        if (!res.ok) {
          console.warn('[WhatsApp] Error al enviar ticket de venta:', res.error);
        }
      }).catch(err => {
        console.error('[WhatsApp] Error inesperado:', err);
      });
    }

    // Detección de venta inusual
    const ventasRecientes = sales
      .filter(s => !s.isCancelled && s.createdBy === currentUser?.name)
      .slice(0, 30);
    if (ventasRecientes.length >= 5) {
      const promedio = ventasRecientes.reduce((s, v) => s + v.total, 0) / ventasRecientes.length;
      const umbral = promedio * 3;
      if (newSale.total > umbral) {
        registrarAudit(
          'venta_inusual',
          `Venta de ${config.currencySymbol}${newSale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} supera 3x el promedio (${config.currencySymbol}${promedio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) — Ticket ${newSale.ticketNumber || newSale.id}`,
          newSale.id
        );
      }
    }

    if (config.notifyOnSale !== false) {
      const isRecharge =
        newSale.id.startsWith('R-') ||
        newSale.id.startsWith('RC-') ||
        (newSale.items || []).some((item: any) => {
          const id = item.itemId || item.id;
          return id && typeof id === 'string' && id.startsWith('recharge-') && id !== 'recharge-commission';
        }) ||
        !!(newSale.confirmationCode && typeof newSale.confirmationCode === 'string' && newSale.confirmationCode.includes('Folio Aut:'));
      const telegramMsg = isRecharge 
        ? tgVentaRecharge(saleWithUser, config) 
        : tgVentaPOS(saleWithUser, config);
      sendTelegram(config, telegramMsg, isRecharge ? 'Recarga / Servicio' : 'Venta POS');
    }

    // Process repair orders in the sale:
    newSale.items.forEach(item => {
      if (item.itemId.startsWith('repair-')) {
        const orderId = item.itemId.replace('repair-', '');
        
        let cashRatio = 0;
        let cardRatio = 0;
        
        if (newSale.paymentMethod === 'Efectivo') {
          cashRatio = 1;
        } else if (newSale.paymentMethod === 'Tarjeta/Transfer' || newSale.paymentMethod === 'Tarjeta') {
          cardRatio = 1;
        } else if ((newSale.paymentMethod === 'Múltiple' || newSale.paymentMethod === 'Mixto') && newSale.total > 0) {
          const cashReceivedVal = newSale.cashReceived || 0;
          const cardReceivedVal = newSale.cardReceived || 0;
          const changeVal = newSale.change || 0;
          const cashKept = Math.max(0, cashReceivedVal - changeVal);
          cashRatio = cashKept / newSale.total;
          cardRatio = cardReceivedVal / newSale.total;
        } else {
          cashRatio = 1;
        }
        
        const itemTotal = item.price * item.quantity;
        const cashPaid = itemTotal * cashRatio;
        const cardPaid = itemTotal * cardRatio;
        
        handleDeliverOrder(orderId, cashPaid, cardPaid);
      }
    });

    // Decrement inventory stock count
    const updatedInventory = inventory.map((inv) => {
      const soldItem = newSale.items.find((i: any) => i.itemId === inv.id);
      if (soldItem && inv.manageStock !== false) {
        if (soldItem.fromWarehouseId) {
          const updatedWhStock = { ...inv.warehouseStock };
          updatedWhStock[soldItem.fromWarehouseId] = Math.max(0, (updatedWhStock[soldItem.fromWarehouseId] || 0) - soldItem.quantity);
          if (updatedWhStock[soldItem.fromWarehouseId] === 0) {
            delete updatedWhStock[soldItem.fromWarehouseId];
          }
          return {
            ...inv,
            warehouseStock: updatedWhStock
          };
        } else {
          return {
            ...inv,
            stock: Math.max(0, inv.stock - soldItem.quantity)
          };
        }
      }
      return inv;
    });
    setInventory(updatedInventory);

    // Decrement refacciones stock count
    const updatedRefacciones = refacciones.map((ref) => {
      const soldItem = newSale.items.find((i: any) => i.itemId === ref.id);
      if (soldItem && ref.manageStock !== false) {
        if (soldItem.fromWarehouseId) {
          const updatedWhStock = { ...ref.warehouseStock };
          updatedWhStock[soldItem.fromWarehouseId] = Math.max(0, (updatedWhStock[soldItem.fromWarehouseId] || 0) - soldItem.quantity);
          if (updatedWhStock[soldItem.fromWarehouseId] === 0) {
            delete updatedWhStock[soldItem.fromWarehouseId];
          }
          return {
            ...ref,
            warehouseStock: updatedWhStock
          };
        } else {
          return {
            ...ref,
            stock: Math.max(0, ref.stock - soldItem.quantity)
          };
        }
      }
      return ref;
    });
    setRefacciones(updatedRefacciones);

    // En modo eco mostrar ticket en pantalla salvo que bitácora esté activo, siempre respetando si se desmarcó el ticket
    const shouldPrint = options?.printTicket !== false && (config.ecoMode ? !config.ecoSilent : true);
    if (shouldPrint) {
      window.dispatchEvent(new CustomEvent('automated-print', {
        detail: { type: 'ticket', id: newSale.id, name: `Boleta de Venta ${newSale.id}`, details: `Pago: ${newSale.paymentMethod} • Total: ${config.currencySymbol}${newSale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
      }));
      const saleMapped = {
        id: newSale.id,
        items: (newSale.items || []).map((i: any) => ({
          itemId: i.itemId || '',
          description: i.description || i.name || '',
          name: i.name || i.description || '',
          quantity: i.quantity,
          price: i.price,
          originalPrice: i.originalPrice,
          discountValue: i.discountValue ?? (i as any).lineDiscountValue,
          discountType: i.discountType ?? (i as any).lineDiscountType,
          fromWarehouseId: i.fromWarehouseId
        })),
        total: newSale.total,
        createdAt: newSale.createdAt || new Date().toISOString(),
        paymentMethod: newSale.paymentMethod,
        cashReceived: newSale.cashReceived,
        cardReceived: newSale.cardReceived,
        change: newSale.change,
        notes: newSale.notes || '',
        confirmationCode: newSale.confirmationCode || '',
        createdBy: newSale.createdBy || currentUser?.name || '',
        discount: newSale.discount,
        discountType: newSale.discountType,
        discountValue: newSale.discountValue,
        ticketNumber: newSale.ticketNumber || newSale.id,
      };
      const isRecharge =
        newSale.id.startsWith('R-') ||
        newSale.id.startsWith('RC-') ||
        (newSale.items || []).some((item: any) => {
          const id = item.itemId || item.id;
          return id && typeof id === 'string' && id.startsWith('recharge-');
        }) ||
        !!(newSale.confirmationCode && typeof newSale.confirmationCode === 'string' && newSale.confirmationCode.includes('Folio Aut:'));
      const html = isRecharge ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
      const effectivePosWidth = config.hybridPrintMode
        ? (config.posPaperWidth || '80mm')
        : (config.ticketPaperWidth || '80mm');
      const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : effectivePosWidth === 'media-carta-duplicado' ? 210000 : effectivePosWidth === 'media-carta' ? 215900 : 72000;
      const paperHeightMicrons = effectivePosWidth === 'media-carta' ? 139700 : effectivePosWidth === 'media-carta-duplicado' ? 297000 : undefined;
      const deviceName = config.hybridPrintMode
        ? (config.posPrinterBrand || config.ticketPrinterBrand || undefined)
        : (config.ticketPrinterBrand || undefined);
      silentPrintOrEco({ html, deviceName, paperWidthMicrons, paperHeightMicrons, copies: config.printCopies || 1, isLabel: false });
    }
  };

  const handleCancelSale = (saleId: string) => {
    const saleToCancel = sales.find((s) => s.id === saleId);
    if (!saleToCancel) return;

    if (saleToCancel.isCancelled) {
      return;
    }

    registrarAudit(
      'cancelar_venta',
      `Canceló venta ${saleToCancel.ticketNumber || saleId} por ${config.currencySymbol}${saleToCancel.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      saleId
    );

    setSales((prevSales) =>
      prevSales.map((s) => (s.id === saleId ? { ...s, isCancelled: true } : s))
    );

    setInventory((prevInv) =>
      prevInv.map((inv) => {
        const soldItem = saleToCancel.items.find((it) => it.itemId === inv.id);
        if (soldItem && inv.manageStock !== false) {
          return {
            ...inv,
            stock: inv.stock + soldItem.quantity
          };
        }
        return inv;
      })
    );

    // Si la venta pertenece a una sesión de caja anterior y fue en Efectivo (o contiene Efectivo en pagos múltiples/mixtos),
    // registrar un egreso automático en la sesión actual para justificar la salida física de dinero
    if (
      saleToCancel.sessionId !== sessionId &&
      (saleToCancel.paymentMethod.includes('Efectivo') ||
        saleToCancel.paymentMethod === 'Múltiple' ||
        saleToCancel.paymentMethod === 'Mixto')
    ) {
      let efeAmt = saleToCancel.total;
      if (saleToCancel.paymentMethod === 'Múltiple' || saleToCancel.paymentMethod === 'Mixto') {
        if (saleToCancel.cashReceived !== undefined) {
          efeAmt = saleToCancel.cashReceived;
        } else {
          const efeMatch = saleToCancel.confirmationCode?.match(/Efe:\s*\$?([0-9.]+)/);
          efeAmt = efeMatch ? parseFloat(efeMatch[1]) : saleToCancel.total;
        }
      }
      
      if (efeAmt > 0) {
        const devolucionExpense: Expense = {
          id: `DEV-POS-${saleId}-${Date.now()}`,
          description: `Devolución Venta POS ${saleToCancel.ticketNumber || saleId} (Original: Sesión ${saleToCancel.sessionId})`,
          category: 'Devolución de Venta',
          amount: efeAmt,
          createdAt: new Date().toISOString(),
          type: 'salida',
          sessionId: sessionId
        };
        setExpenses(prev => [devolucionExpense, ...prev]);
      }
    }
  };

  const handlePartialRefundSale = (saleId: string, refunds: { itemIndex: number; quantity: number }[]) => {
    const saleToUpdate = sales.find((s) => s.id === saleId);
    if (!saleToUpdate) return;

    // Filter refunds that have valid quantities
    const validRefunds = refunds.filter(r => {
      const item = saleToUpdate.items[r.itemIndex];
      return item && r.quantity > 0 && r.quantity <= item.quantity;
    });

    if (validRefunds.length === 0) return;

    // Calculate total refund amount
    const totalRefundAmount = validRefunds.reduce((sum, r) => {
      const item = saleToUpdate.items[r.itemIndex];
      return sum + item.price * r.quantity;
    }, 0);

    // Audit description listing the items returned
    const itemsDescription = validRefunds.map(r => {
      const item = saleToUpdate.items[r.itemIndex];
      return `${r.quantity}x "${item.name}"`;
    }).join(', ');

    registrarAudit(
      'devolucion_parcial_venta',
      `Devolución de artículos: ${itemsDescription} de venta ${saleToUpdate.ticketNumber || saleId} (Reembolso: ${config.currencySymbol}${totalRefundAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
      saleId
    );

    // Update stock for returned items
    setInventory((prevInv) =>
      prevInv.map((inv) => {
        const refund = validRefunds.find(r => saleToUpdate.items[r.itemIndex].itemId === inv.id);
        if (refund && inv.manageStock !== false) {
          return { ...inv, stock: inv.stock + refund.quantity };
        }
        return inv;
      })
    );

    // Update the sale items list and total
    setSales((prevSales) =>
      prevSales.map((s) => {
        if (s.id === saleId) {
          const newItems = s.items
            .map((it, idx) => {
              const refund = validRefunds.find(r => r.itemIndex === idx);
              if (refund) {
                return { ...it, quantity: it.quantity - refund.quantity };
              }
              return it;
            })
            .filter((it) => it.quantity > 0);

          const newTotal = newItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
          const isCancelled = newItems.length === 0;

          return {
            ...s,
            items: newItems,
            total: newTotal,
            isCancelled
          };
        }
        return s;
      })
    );

    // Register expense if from a previous session and matches payment criteria
    if (
      saleToUpdate.sessionId !== sessionId &&
      (saleToUpdate.paymentMethod.includes('Efectivo') ||
        saleToUpdate.paymentMethod === 'Múltiple' ||
        saleToUpdate.paymentMethod === 'Mixto')
    ) {
      let refundCash = totalRefundAmount;
      if (saleToUpdate.paymentMethod.includes('Tarjeta') || saleToUpdate.paymentMethod.includes('Digital')) {
        refundCash = 0;
      } else if (saleToUpdate.paymentMethod === 'Múltiple' || saleToUpdate.paymentMethod === 'Mixto') {
        const cashLimit = saleToUpdate.cashReceived || 0;
        refundCash = Math.min(totalRefundAmount, cashLimit);
      }

      if (refundCash > 0) {
        const devolucionExpense: Expense = {
          id: `DEV-POS-BATCH-${saleId}-${Date.now()}`,
          description: `Devolución POS ${saleToUpdate.ticketNumber || saleId} — ${itemsDescription}`,
          category: 'Devolución de Venta',
          amount: refundCash,
          createdAt: new Date().toISOString(),
          type: 'salida',
          sessionId: sessionId
        };
        setExpenses((prev) => [devolucionExpense, ...prev]);
      }
    }
  };

  const handleRestockItem = (id: string, amount: number) => {
    const item = inventory.find(i => i.id === id);
    setInventory(
      inventory.map((inv) => (inv.id === id ? { ...inv, stock: inv.stock + amount } : inv))
    );
    if (item && config.notifyOnInventory !== false) { sendTelegram(config, msgProductoAgregado(item, amount, 'Abasto / Reabastecer', config), 'Stock actualizado'); }
    if (item && config.notifyOnLowStock !== false) {
      const newStock = item.stock + amount;
      if (newStock <= item.minStock) { sendTelegram(config, tgStockBajo({ ...item, stock: newStock }, config), 'Stock bajo'); }
    }
    // Registrar en historial de abastos para módulo de etiquetas
    if (item) {
      const logKey = 'fixmanager_abasto_log';
      const existing = JSON.parse(localStorage.getItem(logKey) || '[]');
      const today = new Date().toISOString().slice(0, 10);
      const todayEntry = existing.find((e: any) => e.date === today);
      if (todayEntry) {
        const idx = todayEntry.items.findIndex((i: any) => i.id === id);
        if (idx >= 0) todayEntry.items[idx].amount += amount;
        else todayEntry.items.push({ id, name: item.name, barcode: item.barcode || '', price: item.price, amount });
      } else {
        existing.unshift({ date: today, items: [{ id, name: item.name, barcode: item.barcode || '', price: item.price, amount }] });
      }
      localStorage.setItem(logKey, JSON.stringify(existing.slice(0, 30)));
    }
  };

  const handleSetWarehouses = (newWarehouses: Warehouse[]) => {
    const processed = newWarehouses.map(w => {
      const uuid = w.uuid || generateUUID();
      const updatedAt = w.updatedAt || new Date().toISOString();
      return { ...w, uuid, updatedAt };
    });
    setWarehouses(processed);
    localStorage.setItem('fixmanager_warehouses', JSON.stringify(processed));
  };

  // Wrapper de setInventory que detecta items nuevos y restock para notificaciones WA
  const handleSetInventory = (newInv: InventoryItem[]) => {
    // Sincronizar UUIDs y updatedAt de forma reactiva
    const processedInv = newInv.map(item => {
      const oldItem = inventory.find(i => i.id === item.id);
      const isNew = !oldItem;
      const isChanged = oldItem && (
        oldItem.price !== item.price ||
        oldItem.cost !== item.cost ||
        oldItem.stock !== item.stock ||
        oldItem.name !== item.name ||
        oldItem.code !== item.code ||
        oldItem.manageStock !== item.manageStock
      );
      
      const uuid = item.uuid || oldItem?.uuid || generateUUID();
      const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (item.updatedAt || oldItem?.updatedAt || new Date().toISOString());
      
      return {
        ...item,
        uuid,
        updatedAt
      };
    });

    // Auditoría: detectar eliminaciones y ediciones de precio
    const oldIds = new Set(inventory.map(i => i.id));
    const newIds = new Set(processedInv.map(i => i.id));
    inventory.forEach(oldItem => {
      if (!newIds.has(oldItem.id)) {
        registrarAudit('eliminar_producto', `Eliminó "${oldItem.name}" (${oldItem.code}) del inventario`, oldItem.id);
      } else {
        const newItem = processedInv.find(i => i.id === oldItem.id);
        if (newItem && newItem.price !== oldItem.price) {
          registrarAudit('editar_producto', `Cambió precio de "${oldItem.name}": ${config.currencySymbol}${oldItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → ${config.currencySymbol}${newItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, oldItem.id);
        }
      }
    });
    if (config.notifyOnInventory !== false) {
      const oldIds = new Set(inventory.map(i => i.id));
      processedInv.forEach(item => {
        if (!oldIds.has(item.id)) {
          // Ítem completamente nuevo
          sendTelegram(config, msgProductoAgregado(item, item.stock, 'Registro manual', config), 'Stock actualizado');
        } else {
          // Verificar si aumentó stock
          const oldItem = inventory.find(i => i.id === item.id);
          if (oldItem && item.stock > oldItem.stock) {
            const diff = item.stock - oldItem.stock;
            sendTelegram(config, msgProductoAgregado(item, diff, 'Actualización de stock', config), 'Stock actualizado');
          }
        }
      });
    }
    // Alerta de stock bajo para ítems afectados
    if (config.notifyOnLowStock !== false) {
      processedInv.forEach(item => {
        const oldItem = inventory.find(i => i.id === item.id);
        if (item.manageStock !== false && item.stock <= item.minStock && oldItem && oldItem.stock > oldItem.minStock) {
          sendTelegram(config, tgStockBajo(item, config), 'Stock bajo');
        }
      });
    }
    setInventory(processedInv);
  };

  const handleSetRefacciones = (newRef: RefaccionItem[] | ((prev: RefaccionItem[]) => RefaccionItem[])) => {
    let resolvedRef: RefaccionItem[];
    if (typeof newRef === 'function') {
      resolvedRef = newRef(refacciones);
    } else {
      resolvedRef = newRef;
    }
    const processedRef = resolvedRef.map(item => {
      const oldItem = refacciones.find(r => r.id === item.id);
      const isNew = !oldItem;
      const isChanged = oldItem && (
        oldItem.price !== item.price ||
        oldItem.cost !== item.cost ||
        oldItem.stock !== item.stock ||
        oldItem.name !== item.name ||
        oldItem.code !== item.code ||
        oldItem.manageStock !== item.manageStock
      );
      
      const uuid = item.uuid || oldItem?.uuid || generateUUID();
      const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (item.updatedAt || oldItem?.updatedAt || new Date().toISOString());
      
      return {
        ...item,
        uuid,
        updatedAt
      };
    });
    setRefacciones(processedRef);
  };

  const handleAddClient = (newClient: Client) => {
    if (!newClient.uuid) newClient.uuid = generateUUID();
    newClient.updatedAt = new Date().toISOString();
    setClients(prev => {
      const next = [newClient, ...prev];
      localStorage.setItem('fixmanager_clients', JSON.stringify(next));
      return next;
    });
  };

  const registerOrUpdateClient = (clientName: string, clientPhone: string, countryCode?: string, isOrder = false, creditLimit?: number) => {
    if (!clientName.trim() || !clientPhone.trim()) return;
    const nameClean = clientName.trim().toUpperCase();
    const phoneClean = clientPhone.replace(/\D/g, '');
    
    setClients(prev => {
      const existing = prev.find(c => {
        const cPhoneClean = (c.phone || '').replace(/\D/g, '');
        return (cPhoneClean && cPhoneClean === phoneClean) || 
               (c.name && c.name.toUpperCase() === nameClean);
      });

      if (existing) {
        const next = prev.map(c => c.id === existing.id ? { 
          ...c, 
          totalOrders: isOrder ? c.totalOrders + 1 : c.totalOrders,
          creditLimit: creditLimit !== undefined ? creditLimit : c.creditLimit,
          updatedAt: new Date().toISOString() 
        } : c);
        localStorage.setItem('fixmanager_clients', JSON.stringify(next));
        return next;
      } else {
        const newId = `C${prev.length + 1}`;
        const newClient: Client = {
          id: newId,
          uuid: generateUUID(),
          name: clientName.trim(),
          phone: clientPhone.trim(),
          countryCode: countryCode,
          email: `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          totalOrders: isOrder ? 1 : 0,
          registeredAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
          creditLimit: creditLimit !== undefined ? creditLimit : (config.defaultCreditLimit ?? 1000)
        };
        const next = [...prev, newClient];
        localStorage.setItem('fixmanager_clients', JSON.stringify(next));
        return next;
      }
    });
  };

  const handleUpdateClient = (updatedClient: Client) => {
    updatedClient.updatedAt = new Date().toISOString();
    setClients(prev => {
      const next = prev.map(c => c.id === updatedClient.id ? updatedClient : c);
      localStorage.setItem('fixmanager_clients', JSON.stringify(next));
      return next;
    });
  };

  const handleSetClients = (newClients: Client[]) => {
    const processedClients = newClients.map(client => {
      const oldClient = clients.find(c => c.id === client.id);
      const isNew = !oldClient;
      const isChanged = oldClient && (
        oldClient.name !== client.name ||
        oldClient.phone !== client.phone ||
        oldClient.email !== client.email ||
        oldClient.countryCode !== client.countryCode
      );
      
      const uuid = client.uuid || oldClient?.uuid || generateUUID();
      const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (client.updatedAt || oldClient?.updatedAt || new Date().toISOString());
      
      return {
        ...client,
        uuid,
        updatedAt
      };
    });
    setClients(processedClients);
  };

  const handleSetDonors = (newDonors: DonorDevice[]) => {
    const processedDonors = newDonors.map(donor => {
      const oldDonor = donors.find(d => d.id === donor.id);
      const isNew = !oldDonor;
      const isChanged = oldDonor && (
        oldDonor.brand !== donor.brand ||
        oldDonor.model !== donor.model ||
        oldDonor.color !== donor.color ||
        oldDonor.notes !== donor.notes ||
        JSON.stringify(oldDonor.parts) !== JSON.stringify(donor.parts)
      );
      
      const uuid = donor.uuid || oldDonor?.uuid || generateUUID();
      const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (donor.updatedAt || oldDonor?.updatedAt || new Date().toISOString());
      
      return {
        ...donor,
        uuid,
        updatedAt
      };
    });
    setDonors(processedDonors);
  };

  const handleSetQuotes = (newQuotes: Quote[]) => {
    const processedQuotes = newQuotes.map(quote => {
      const oldQuote = quotes.find(q => q.id === quote.id);
      const isNew = !oldQuote;
      const isChanged = oldQuote && (
        oldQuote.status !== quote.status ||
        oldQuote.customerName !== quote.customerName ||
        oldQuote.customerPhone !== quote.customerPhone ||
        JSON.stringify(oldQuote.devices) !== JSON.stringify(quote.devices)
      );
      
      const uuid = quote.uuid || oldQuote?.uuid || generateUUID();
      const updatedAt = (isNew || isChanged) ? new Date().toISOString() : (quote.updatedAt || oldQuote?.updatedAt || new Date().toISOString());
      
      return {
        ...quote,
        uuid,
        updatedAt
      };
    });
    setQuotes(processedQuotes);
  };

  const handleCreateQuote = (quote: Quote, options?: { printTicket?: boolean }) => {
    setQuotes(prev => [quote, ...prev]);
    // Auto-guardar servicios nuevos que no existan en el catálogo
    const newServices: ServicePrice[] = [];
    quote.devices.forEach(d => {
      if (!d.serviceType.trim()) return;
      const exists = services.some(s => s.name.toLowerCase() === d.serviceType.toLowerCase());
      if (!exists && !newServices.some(s => s.name.toLowerCase() === d.serviceType.toLowerCase())) {
        newServices.push({ id: `svc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: d.serviceType.trim(), price: d.estimatedCost, category: 'General', durationMinutes: 0, popularity: 1 });
      }
    });
    if (newServices.length > 0) {
      setServices(prev => { const updated = [...prev, ...newServices]; localStorage.setItem('fixmanager_services', JSON.stringify(updated)); return updated; });
    }
    
    // Auto-registrar cliente si es nuevo
    const cleanPhone = quote.customerPhone.replace(/\D/g, '');
    const existingClient = clients.find(
      (c) => c.phone.replace(/\D/g, '') === cleanPhone || c.name.toLowerCase() === quote.customerName.toLowerCase()
    );
    if (!existingClient) {
      const newClient: Client = {
        id: `C${clients.length + 1}`,
        name: quote.customerName,
        phone: quote.customerPhone,
        countryCode: quote.customerCountryCode,
        email: `${quote.customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        totalOrders: 0,
        registeredAt: new Date().toISOString().split('T')[0]
      };
      setClients(prev => {
        const updated = [...prev, newClient];
        localStorage.setItem('fixmanager_clients', JSON.stringify(updated));
        return updated;
      });
    }

    if (options?.printTicket !== false) {
      const html = quote.editorFormat === 'letter' 
        ? buildLetterQuoteTicketHtml(quote, config)
        : buildQuoteTicketHtml(quote, config);
      const isLetter = quote.editorFormat === 'letter';
      const paperWidthMicrons = isLetter
        ? 215900
        : config.ticketPaperWidth === 'media-carta-duplicado'
          ? 210000
          : (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta')
            ? 215900
            : config.ticketPaperWidth === '58mm'
              ? 48000
              : 72000;
      const paperHeightMicrons = isLetter
        ? 279400
        : config.ticketPaperWidth === 'media-carta-duplicado'
          ? 297000
          : config.hybridPrintMode
            ? 279400
            : config.ticketPaperWidth === 'media-carta'
              ? 139700
              : undefined;
      silentPrintOrEco({ html, deviceName: config.ticketPrinterBrand || undefined, paperWidthMicrons, paperHeightMicrons, isLabel: false });
    }
  };

  const handleUpdateQuote = (quote: Quote, options?: { printTicket?: boolean }) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? quote : q));
    if (options?.printTicket) {
      const html = quote.editorFormat === 'letter' 
        ? buildLetterQuoteTicketHtml(quote, config)
        : buildQuoteTicketHtml(quote, config);
      const isLetter = quote.editorFormat === 'letter';
      const paperWidthMicrons = isLetter
        ? 215900
        : config.ticketPaperWidth === 'media-carta-duplicado'
          ? 210000
          : (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta')
            ? 215900
            : config.ticketPaperWidth === '58mm'
              ? 48000
              : 72000;
      const paperHeightMicrons = isLetter
        ? 279400
        : config.ticketPaperWidth === 'media-carta-duplicado'
          ? 297000
          : config.hybridPrintMode
            ? 279400
            : config.ticketPaperWidth === 'media-carta'
              ? 139700
              : undefined;
      silentPrintOrEco({ html, deviceName: config.ticketPrinterBrand || undefined, paperWidthMicrons, paperHeightMicrons, isLabel: false });
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
  };

  const handleConvertQuote = (quoteId: string, prefillData: { customerName: string; customerPhone: string; customerCountryCode: string; devices: QuoteDevice[] }) => {
    // NO marcar como Convertida aún — solo cuando se complete el registro de la orden
    setPrefillFromQuote({ quoteId, ...prefillData });
    setActiveTab('Nueva');
  };

   const handleAddService = (newSvc: ServicePrice) => {
    setServices([...services, newSvc]);
  };

  const handleAddQuoteCatalogItem = (newItem: QuoteCatalogItem) => {
    setQuoteCatalog(prev => {
      const exists = prev.some(item => item.description.toUpperCase() === newItem.description.toUpperCase());
      if (exists) return prev;
      return [...prev, newItem];
    });
  };

  const handleUpdateQuoteCatalogItem = (updatedItem: QuoteCatalogItem) => {
    setQuoteCatalog(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteQuoteCatalogItem = (id: string) => {
    setQuoteCatalog(prev => prev.filter(item => item.id !== id));
  };

  const handleAddInsumoCatalogItem = (newItem: InsumoCatalogItem) => {
    setInsumosCatalog(prev => {
      const exists = prev.some(item => item.description.toUpperCase() === newItem.description.toUpperCase());
      if (exists) return prev;
      return [...prev, newItem];
    });
  };

  const handleUpdateInsumoCatalogItem = (updatedItem: InsumoCatalogItem) => {
    setInsumosCatalog(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteInsumoCatalogItem = (id: string) => {
    setInsumosCatalog(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateService = (updatedSvc: ServicePrice) => {
    setServices(services.map(s => s.id === updatedSvc.id ? updatedSvc : s));
  };

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleAddExpense = (newExp: Expense) => {
    const expenseWithSession = { ...newExp, sessionId };
    setExpenses([expenseWithSession, ...expenses]);
    if (config.notifyOnExpense !== false) {
      sendTelegram(config, tgMovimientoCaja(expenseWithSession, config), 'Movimiento de caja');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('¿Está seguro de reiniciar los valores del taller a la demostración inicial de la imagen?')) {
      localStorage.removeItem('fixmanager_config');
      localStorage.removeItem('fixmanager_orders');
      localStorage.removeItem('fixmanager_services');
      localStorage.removeItem('fixmanager_inventory');
      localStorage.removeItem('fixmanager_refacciones');
      localStorage.removeItem('fixmanager_donors');
      localStorage.removeItem('fixmanager_clients');
      localStorage.removeItem('fixmanager_expenses');
      localStorage.removeItem('fixmanager_sales');

      setConfig(INITIAL_CONFIG);
      setOrders(INITIAL_ORDERS);
      setServices(INITIAL_SERVICES);
      setInventory(INITIAL_INVENTORY);
      setRefacciones(INITIAL_REFACCIONES);
      setDonors([]);
      setClients(INITIAL_CLIENTS);
      setExpenses(INITIAL_EXPENSES);
      setSales(INITIAL_SALES);
      setSelectedOrderId('TKT-014');
      setActiveTab('POS');
      alert('El sistema de taller ha sido reiniciado correctamente con los datos semilla.');
    }
  };

  // ─── Handlers de crédito / fiados ────────────────────────────────────────────

  const handleAddCreditEntry = (accountId: string, entry: CreditSaleEntry, decrementStock = false) => {
    const entryWithSession = { ...entry, sessionId: entry.sessionId ?? sessionId };
    setCreditAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, entries: [...a.entries, entryWithSession], lastActivityAt: new Date().toISOString(), isClosed: false }
      : a
    ));
    if (decrementStock) {
      setInventory(prev => prev.map(inv => {
        const soldItem = entry.items.find(i => i.itemId === inv.id);
        return soldItem ? { ...inv, stock: Math.max(0, inv.stock - soldItem.quantity) } : inv;
      }));
      setRefacciones(prev => prev.map(ref => {
        const soldItem = entry.items.find(i => i.itemId === ref.id);
        return soldItem ? { ...ref, stock: Math.max(0, ref.stock - soldItem.quantity) } : ref;
      }));
    }
    if (config.notifyOnFiado !== false) {
      const account = creditAccounts.find(a => a.id === accountId);
      if (account) {
        const updatedAccount = { ...account, entries: [...account.entries, entryWithSession] };
        const deuda = updatedAccount.entries.reduce((s, e) => s + e.subtotal, 0) - updatedAccount.payments.reduce((s, p) => s + p.amount, 0);
        sendTelegram(config, tgNuevoFiado(updatedAccount, Math.max(0, deuda), config), 'Nuevo fiado');
      }
    }
  };

  const handleAddCreditPayment = (accountId: string, payment: CreditPayment) => {
    const paymentWithSession = { ...payment, sessionId: payment.sessionId ?? sessionId };
    const account = creditAccounts.find(a => a.id === accountId);
    setCreditAccounts(prev => prev.map(a => {
      if (a.id !== accountId) return a;
      const updated = { ...a, payments: [...a.payments, paymentWithSession], lastActivityAt: new Date().toISOString() };
      const totalDebt = updated.entries.reduce((s, e) => s + e.subtotal, 0);
      const totalPaid = updated.payments.reduce((s, p) => s + p.amount, 0);
      return { ...updated, isClosed: totalPaid >= totalDebt };
    }));

    // Registrar la porción en efectivo en el total esperado de caja de hoy
    const efeMatch = payment.note?.match(/Efe:\s*\$?([0-9.]+)/);
    const efeAmt = efeMatch ? parseFloat(efeMatch[1]) : (payment.method === 'Efectivo' ? payment.amount : 0);

    if (efeAmt > 0 && account) {
      const entradaExpense: Expense = {
        id: `FD-ABO-${accountId}-${Date.now()}`,
        description: `Abono Fiado — ${account.clientName}`,
        category: 'Abono Fiado',
        amount: efeAmt,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Efectivo'
      };
      setExpenses(prev => [entradaExpense, ...prev]);
    }

    // Registrar la porción en tarjeta/transferencia en caja
    const tarMatch = payment.note?.match(/T\/T:\s*\$?([0-9.]+)/);
    const tarAmt = tarMatch ? parseFloat(tarMatch[1]) : (payment.method === 'Tarjeta/Transfer' ? payment.amount : 0);

    if (tarAmt > 0 && account) {
      const entradaCardExpense: Expense = {
        id: `FD-ABO-CARD-${accountId}-${Date.now()}`,
        description: `Abono Fiado (Tarjeta) — ${account.clientName}`,
        category: 'Abono Fiado',
        amount: tarAmt,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Tarjeta'
      };
      setExpenses(prev => [entradaCardExpense, ...prev]);
    }

    if (config.notifyOnFiado !== false && account) {
      const saldoAnterior = Math.max(0, account.entries.reduce((s, e) => s + e.subtotal, 0) - account.payments.reduce((s, p) => s + p.amount, 0));
      const saldoNuevo = Math.max(0, saldoAnterior - payment.amount);
      sendTelegram(config, tgAbonoFiado(account, payment.amount, payment.method, saldoAnterior, saldoNuevo, config), 'Abono a fiado');
    }
  };

  const handleCreateCreditAccount = (account: CreditAccount) => {
    setCreditAccounts(prev => [account, ...prev]);
    registerOrUpdateClient(account.clientName, account.clientPhone, undefined, false, account.creditLimit);
    if (config.notifyOnFiado !== false) {
      sendTelegram(config, tgNuevoFiado(account, 0, config), 'Fiado liquidado');
    }
  };

  const handleRegisterChipActivation = (activation: Omit<ChipActivation, 'id' | 'date'>) => {
    const newActivation: ChipActivation = {
      ...activation,
      id: generateUUID(),
      date: new Date().toISOString(),
    };
    setChipActivations(prev => [newActivation, ...prev]);
    registerOrUpdateClient(activation.clientName, activation.clientPhone || activation.chipNumber, undefined, false);
  };

  const handleUpdateChipActivation = (updated: ChipActivation) => {
    setChipActivations(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleDeleteChipActivation = (activationId: string) => {
    setChipActivations(prev => prev.filter(a => a.id !== activationId));
  };

  const handleUpdateCreditAccount = (updated: CreditAccount) => {
    setCreditAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleDeleteCreditAccount = (accountId: string) => {
    const account = creditAccounts.find(a => a.id === accountId);
    if (account) {
      setInventory(prev => prev.map(inv => {
        let totalToReturn = 0;
        account.entries.forEach(entry => {
          entry.items.forEach(item => {
            if (item.itemId === inv.id) {
              totalToReturn += item.quantity;
            }
          });
        });
        if (totalToReturn > 0) {
          return { ...inv, stock: inv.stock + totalToReturn };
        }
        return inv;
      }));
    }
    setCreditAccounts(prev => prev.map(a => a.id === accountId ? { ...a, deletedAt: new Date().toISOString() } : a));
  };

  const handleDeleteClient = (phone: string, deleteOrders: boolean) => {
    setClients(prev => {
      const next = prev.filter(c => c.phone !== phone);
      localStorage.setItem('fixmanager_clients', JSON.stringify(next));
      return next;
    });

    if (deleteOrders) {
      setOrders(prev => {
        const client = clients.find(c => c.phone === phone);
        const clientName = client ? client.name.toLowerCase().trim() : '';
        const next = prev.filter(o => {
          const matchPhone = o.customerPhone === phone;
          const matchName = clientName && o.customerName.toLowerCase().trim() === clientName;
          return !(matchPhone || matchName);
        });
        localStorage.setItem('fixmanager_orders', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleEditClient = (oldPhone: string, newName: string, newPhone: string, creditLimit?: number) => {
    setClients(prev => {
      const next = prev.map(c => c.phone === oldPhone ? { ...c, name: newName, phone: newPhone, creditLimit } : c);
      localStorage.setItem('fixmanager_clients', JSON.stringify(next));
      return next;
    });

    const client = clients.find(c => c.phone === oldPhone);
    const oldNameLower = client ? client.name.toLowerCase().trim() : '';

    setOrders(prev => {
      const next = prev.map(o => {
        const matchPhone = o.customerPhone === oldPhone;
        const matchName = oldNameLower && o.customerName.toLowerCase().trim() === oldNameLower;
        if (matchPhone || matchName) {
          return { ...o, customerName: newName, customerPhone: newPhone };
        }
        return o;
      });
      localStorage.setItem('fixmanager_orders', JSON.stringify(next));
      return next;
    });

    setCreditAccounts(prev => {
      const next = prev.map(a => {
        const matchPhone = a.clientPhone === oldPhone;
        const matchName = oldNameLower && a.clientName.toLowerCase().trim() === oldNameLower;
        if (matchPhone || matchName) {
          return { ...a, clientName: newName, clientPhone: newPhone };
        }
        return a;
      });
      localStorage.setItem('fixmanager_credit_accounts', JSON.stringify(next));
      return next;
    });
  };

  // ─── Apartados handlers ───────────────────────────────────────────────────

  const handleCreateApartado = (newApartado: ApartadoEntry, options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => {
    const paymentsWithSession = newApartado.payments.map(p => ({ ...p, sessionId: p.sessionId ?? sessionId }));
    const apartadoWithSession = { ...newApartado, sessionId: newApartado.sessionId ?? sessionId, payments: paymentsWithSession };
    setApartados(prev => [apartadoWithSession, ...prev]);
    // Registrar o vincular cliente en el catálogo general
    registerOrUpdateClient(newApartado.clientName, newApartado.clientPhone, undefined, false);
    setInventory(prev => prev.map(item => {
      const apItem = apartadoWithSession.items.find(i => i.itemId === item.id);
      if (!apItem) return item;
      return { ...item, reservedQty: (item.reservedQty || 0) + apItem.quantity };
    }));

    // Registrar entrada en caja si el anticipo inicial fue en Efectivo
    const firstPayment = newApartado.payments[0];
    if (firstPayment && firstPayment.method === 'Efectivo' && firstPayment.amount > 0) {
      const entradaExpense: Expense = {
        id: `APT-INI-${newApartado.id}-${Date.now()}`,
        description: `Anticipo Apartado ${newApartado.id} — ${newApartado.clientName}`,
        category: 'Apartado',
        amount: firstPayment.amount,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Efectivo'
      };
      setExpenses(prev => [entradaExpense, ...prev]);
    } else if (firstPayment && (firstPayment.method === 'Tarjeta' || firstPayment.method === 'Transferencia') && firstPayment.amount > 0) {
      const entradaExpense: Expense = {
        id: `APT-INI-CARD-${newApartado.id}-${Date.now()}`,
        description: `Anticipo Apartado ${newApartado.id} (Tarjeta) — ${newApartado.clientName}`,
        category: 'Apartado',
        amount: firstPayment.amount,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Tarjeta'
      };
      setExpenses(prev => [entradaExpense, ...prev]);
    }

    const shouldPrint = options ? !!options.printTicket : true;
    const shouldSendWhatsApp = options ? !!options.sendWhatsApp : false;
    console.log('[handleCreateApartado] options:', options, 'shouldPrint:', shouldPrint, 'shouldSendWhatsApp:', shouldSendWhatsApp, 'phone:', newApartado.clientPhone);

    const paperWidth = config.ticketPaperWidth || '80mm';
    const sym = config.currencySymbol || '$';

    if (shouldPrint) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      const html = buildApartadoTicketHtml({
        apartado: apartadoWithSession,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym,
        paperWidth,
        footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      });
      window.dispatchEvent(new CustomEvent('automated-print', { detail: { type: 'ticket', name: `Apartado — ${newApartado.clientName}`, details: `${sym}${newApartado.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }));
      const deviceName = config.hybridPrintMode
        ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
        : (config.ticketPrinterBrand || '');
      window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName, paperWidthMicrons, paperHeightMicrons, isLabel: false } }));
    }

    if (shouldSendWhatsApp && newApartado.clientPhone) {
      const msg = buildWhatsappApartadoMessage(apartadoWithSession, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildApartadoTicketHtml({
        apartado: apartadoWithSession,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym,
        paperWidth: whatsappPaperWidth,
        footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      });
      sendWhatsappNotification(config, newApartado.clientPhone, msg, html).catch(err => {
        console.error('[WhatsApp] Error sending new layaway:', err);
      });
    }

    setFiadosInitialSelectedApartadoId(newApartado.id);
    setFiadosInitialActiveTab('apartados');
    setFiadosHighlightedApartadoId(newApartado.id);
    setFiadosInitialSelectedAccountId(null);
    setFiadosHighlightedEntryId(null);
    setActiveTab('Fiados');
  };

  const handleAddApartadoPayment = (apartadoId: string, payment: ApartadoPayment) => {
    const paymentWithSession = { ...payment, sessionId: payment.sessionId ?? sessionId };
    const apartado = apartados.find(a => a.id === apartadoId);
    setApartados(prev => prev.map(a => {
      if (a.id !== apartadoId) return a;
      const newPayments = [...a.payments, paymentWithSession];
      const totalPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      const newStatus = totalPaid >= a.totalValue ? 'Listo' : a.status;
      return { ...a, payments: newPayments, status: newStatus };
    }));

    // Registrar entrada en caja si el abono fue en Efectivo
    if (payment.method === 'Efectivo' && payment.amount > 0 && apartado) {
      const entradaExpense: Expense = {
        id: `APT-ABO-${apartadoId}-${Date.now()}`,
        description: `Abono Apartado ${apartadoId} — ${apartado.clientName}`,
        category: 'Apartado',
        amount: payment.amount,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Efectivo'
      };
      setExpenses(prev => [entradaExpense, ...prev]);
    } else if ((payment.method === 'Tarjeta' || payment.method === 'Transferencia') && payment.amount > 0 && apartado) {
      const entradaExpense: Expense = {
        id: `APT-ABO-CARD-${apartadoId}-${Date.now()}`,
        description: `Abono Apartado ${apartadoId} (Tarjeta) — ${apartado.clientName}`,
        category: 'Apartado',
        amount: payment.amount,
        createdAt: new Date().toISOString(),
        type: 'entrada',
        sessionId: sessionId,
        paymentMethod: 'Tarjeta'
      };
      setExpenses(prev => [entradaExpense, ...prev]);
    }
  };

  const handleUpdateApartadoStatus = (apartadoId: string, status: ApartadoEntry['status']) => {
    const apartado = apartados.find(a => a.id === apartadoId);
    setApartados(prev => prev.map(a => a.id === apartadoId ? { ...a, status } : a));
    if (!apartado) return;
    if (status === 'Entregado') {
      setInventory(prev => prev.map(item => {
        const apItem = apartado.items.find(i => i.itemId === item.id);
        if (!apItem) return item;
        return {
          ...item,
          stock: Math.max(0, item.stock - apItem.quantity),
          reservedQty: Math.max(0, (item.reservedQty || 0) - apItem.quantity),
        };
      }));
    } else if (status === 'Cancelado') {
      setInventory(prev => prev.map(item => {
        const apItem = apartado.items.find(i => i.itemId === item.id);
        if (!apItem) return item;
        return { ...item, reservedQty: Math.max(0, (item.reservedQty || 0) - apItem.quantity) };
      }));
    }
  };

  // Find currently selected order for printing layouts
  const printLookupId = selectedOrderId?.startsWith('LABEL_SERVICE_')
    ? selectedOrderId.replace('LABEL_SERVICE_', '')
    : selectedOrderId;
  const activePrintOrder = orders.find((o) => o.id === printLookupId) || null;
  const activePrintSale = sales.find((s) => s.id === printLookupId) || null;

  const isRetro = config.theme === 'retro-window';
  const isFluent = config.theme === 'fluent';
  const isLight = config.themeMode === 'light';

  const [mobileTheme, setMobileTheme] = React.useState<'dark' | 'light'>(() => {
    return config.themeMode || 'light';
  });

  React.useEffect(() => {
    if (config.themeMode) {
      setMobileTheme(config.themeMode);
    }
  }, [config.themeMode]);

  React.useEffect(() => {
    if (isMobile()) {
      if (mobileTheme === 'light') {
        document.body.className = 'theme-modern mode-light';
      } else {
        document.body.className = 'theme-modern mode-dark';
      }
    } else {
      if (appScreen === 'welcome-choice' || appScreen === 'cloud-restore') {
        document.body.className = 'theme-modern mode-dark';
      } else {
        document.body.className = `theme-${config.theme || 'modern'} mode-${config.themeMode || 'dark'}`;
      }
    }
  }, [config.theme, config.themeMode, mobileTheme, appScreen]);

  const handleToggleMobileTheme = () => {
    const next = mobileTheme === 'dark' ? 'light' : 'dark';
    setMobileTheme(next);
    setConfig(prev => ({ ...prev, themeMode: next }));
  };

  // Stock bajo: productos agotados + productos con stock crítico (por debajo del mínimo)
  const ventasInusualesHoy = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return auditLog.filter(e => e.accion === 'venta_inusual' && e.fecha === today).length;
  }, [auditLog]);

  const ventasHoy = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sales
      .filter(s => !s.isCancelled && s.createdBy === currentUser?.name && s.createdAt?.startsWith(today))
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales, currentUser]);

  const lowStockCount = React.useMemo(() => {
    return inventory.filter(item => item.manageStock !== false && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0)).length;
  }, [inventory]);
  const [stockAlertDismissed, setStockAlertDismissed] = useState(false);
  const [ordenesVencidasDismissed, setOrdenesVencidasDismissed] = useState(false);

  const ordenesVencidas = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activasStatuses = ['Pendiente', 'Diagnóstico', 'En Reparación'];
    return orders.filter(o => {
      if (!activasStatuses.includes(o.status)) return false;
      if (!o.estimatedDeliveryDate) return false;
      const delivery = new Date(o.estimatedDeliveryDate);
      delivery.setHours(0, 0, 0, 0);
      return delivery < today;
    });
  }, [orders]);
  // Reset dismissed cuando hay nuevas órdenes vencidas
  const prevVencidasRef = React.useRef(ordenesVencidas.length);
  React.useEffect(() => {
    if (ordenesVencidas.length > prevVencidasRef.current) setOrdenesVencidasDismissed(false);
    prevVencidasRef.current = ordenesVencidas.length;
  }, [ordenesVencidas.length]);

  // Re-mostrar alerta si el conteo cambia (nuevos productos caen en stock bajo)
  const prevLowStockRef = React.useRef(lowStockCount);
  React.useEffect(() => {
    if (lowStockCount > prevLowStockRef.current) {
      setStockAlertDismissed(false);
    }
    prevLowStockRef.current = lowStockCount;
  }, [lowStockCount]);

  // Background weekly auto backup logic
  useEffect(() => {
    if (appScreen !== 'active') return;

    const timer = setTimeout(async () => {
      if (!config.autoBackupEnabled || !config.autoBackupPath) {
        return;
      }
      
      const lastTimeStr = config.autoBackupLastTime;
      const lastTime = lastTimeStr ? new Date(lastTimeStr).getTime() : 0;
      const now = Date.now();
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      
      if (now - lastTime >= ONE_WEEK_MS) {
        console.log('[Auto Backup] Time for weekly automatic backup reached...');
        const api = (window as any).electronAPI;
        if (!api?.writeBackupFile) {
          console.warn('[Auto Backup] electronAPI.writeBackupFile is not available.');
          return;
        }

        let licenseForBackup: Record<string, unknown> | null = licenseInfo;
        if (api.getLicense) {
          try {
            const fresh = await api.getLicense();
            if (fresh?.status === 'active') licenseForBackup = fresh;
          } catch {}
        }

        let localImages = null;
        if (api.exportLocalImages) {
          try {
            localImages = await api.exportLocalImages();
          } catch (err) {
            console.error('[Auto Backup] Error al exportar imágenes locales:', err);
          }
        }

        const backup = {
          version: appVersion,
          exportedAt: new Date().toISOString(),
          license: licenseForBackup ? {
            type:        licenseForBackup.type,
            expiry:      licenseForBackup.expiry,
            key:         licenseForBackup.key,
            ownerName:   licenseForBackup.ownerName  || '',
            activatedAt: licenseForBackup.activatedAt || '',
            machineId:   licenseForBackup.machineId   || '',
          } : null,
          config,
          orders,
          services,
          inventory,
          clients,
          expenses,
          sales,
          cortes: cortesHistorial,
          localImages,
        };

        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `fixmanager-backup-${dateStr}.json`;
        const content = JSON.stringify(backup, null, 2);

        const result = await api.writeBackupFile({
          folderPath: config.autoBackupPath,
          filename,
          content
        });

        if (result && result.success) {
          console.log('[Auto Backup] Successfully saved auto backup to:', result.filePath);
          setConfig(prev => {
            const updated = {
              ...prev,
              autoBackupLastTime: new Date().toISOString()
            };
            localStorage.setItem('fixmanager_config', JSON.stringify(updated));
            return updated;
          }, true);
        } else {
          console.error('[Auto Backup] Failed to write auto backup file:', result?.error || 'Unknown error');
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [appScreen, config.autoBackupEnabled, config.autoBackupPath, config.autoBackupLastTime, appVersion, licenseInfo, orders, services, inventory, clients, expenses, sales, cortesHistorial]);


  const handleRetryClock = async () => {
    if (checkingClock) return;
    setCheckingClock(true);
    try {
      const api = (window as any).electronAPI;
      if (api?.getNetworkDate) {
        // Consultar la hora real de internet a través del backend de Electron para evitar problemas de CORS
        const res = await api.getNetworkDate();
        if (res.success && res.date) {
          const serverMs = Date.parse(res.date);
          const localMs = Date.now();
          const diffMinutes = Math.abs(localMs - serverMs) / 60000;
          
          // Si el reloj local ya tiene una diferencia menor a 15 minutos con el servidor real
          if (diffMinutes < 15) {
            localStorage.setItem('fixmanager_last_opened', serverMs.toString());
            setClockTampered(false);
            // Volver a iniciar el flujo recargando limpio
            window.location.reload();
            return;
          } else {
            alert(`El reloj de tu computadora sigue teniendo una diferencia de ${Math.round(diffMinutes)} minutos con la hora real de internet. Por favor corrígelo.`);
          }
        } else {
          console.warn('No se pudo obtener la hora del servidor a través de Electron:', res.error);
        }
      } else {
        // Fallback para modo desarrollo en el navegador (CORS puede fallar, pero sirve de resguardo)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://nudkxnfraithxhtutkdw.supabase.co', { 
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const serverDateStr = res.headers.get('date');
        if (serverDateStr) {
          const serverMs = Date.parse(serverDateStr);
          const localMs = Date.now();
          const diffMinutes = Math.abs(localMs - serverMs) / 60000;
          
          if (diffMinutes < 15) {
            localStorage.setItem('fixmanager_last_opened', serverMs.toString());
            setClockTampered(false);
            window.location.reload();
            return;
          }
        }
      }
    } catch (err) {
      console.log('Error checking clock online, falling back to page reload:', err);
    } finally {
      setCheckingClock(false);
    }
    // Si no hay red o sigue habiendo desfase, recargar normalmente para re-evaluar localmente
    window.location.reload();
  };

  let bgWrapperClass = 'bg-[#0f172a] theme-modern mode-dark';
  if (isFluent) {
    bgWrapperClass = isLight ? 'bg-[#f3f4f6] theme-fluent mode-light' : 'bg-[#1a1a1a] theme-fluent mode-dark';
  } else if (isRetro && isLight) {
    bgWrapperClass = 'bg-[#cbd6e2] theme-retro-window mode-light';
  } else if (isRetro && !isLight) {
    bgWrapperClass = 'bg-[#cbd6e2] theme-retro-window mode-dark';
  } else if (!isRetro && isLight) {
    bgWrapperClass = 'bg-[#cbd5e1] theme-modern mode-light';
  }

  // Main container classes
  let mainContainerClass = 'backdrop-blur-2xl bg-[#0d121f]/95 lg:bg-[#0d121f]/90';
  if (isFluent) {
    mainContainerClass = isLight ? 'bg-[#fafafa]/90 backdrop-blur-xl text-zinc-800' : 'bg-[#1f1f1f]/95 backdrop-blur-xl';
  } else if (isRetro) {
    mainContainerClass = isLight ? 'bg-[#eaeef3]' : 'bg-[#1a1c23]';
  } else if (!isRetro && isLight) {
    mainContainerClass = 'bg-[#eaeef3]';
  }

  // Under main view switcher classes
  let mainSwitcherClass = 'bg-white/5 backdrop-blur-md';
  if (isFluent) {
    mainSwitcherClass = isLight ? 'bg-black/[0.03] backdrop-blur-md' : 'bg-white/5 backdrop-blur-md';
  } else if (isRetro) {
    mainSwitcherClass = isLight ? 'bg-[#eaeef3]' : 'bg-[#1a1c23]';
  } else if (!isRetro && isLight) {
    mainSwitcherClass = 'bg-[#eaeef3]';
  }

  // ── Screen Gates — rendered BEFORE the full app ───────────────────────────
  const screenShell = (children: React.ReactNode) => (
    <div className={`flex flex-col h-screen overflow-hidden font-sans antialiased relative select-none ${bgWrapperClass}`}>
      {!isRetro && !isFluent && (
        <>
          <div className={`absolute top-[-10%] left-[-5%] w-[400px] h-[400px] ${isLight ? 'bg-purple-300/20' : 'bg-purple-600/30'} rounded-full blur-[120px] pointer-events-none z-0`} />
          <div className={`absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] ${isLight ? 'bg-blue-300/15' : 'bg-blue-600/20'} rounded-full blur-[150px] pointer-events-none z-0`} />
        </>
      )}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );

  if (clockTampered) {
    const isRetro = config.theme === 'retro-window';
    return (
      <div className="flex flex-col items-center justify-center h-screen overflow-hidden font-sans antialiased bg-[#0f172a] relative select-none">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-red-600/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-md px-6">
          <div className={`p-6 text-center space-y-4 ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] text-black'
            : 'bg-zinc-900/95 border border-red-500/30 rounded-2xl shadow-xl shadow-black/50 text-white'
          }`}>
            <div className="text-4xl">⏰</div>
            <h2 className={`text-lg font-black tracking-tight ${isRetro ? 'text-red-800' : 'text-red-400'}`}>
              Discrepancia de Reloj Detectada
            </h2>
            <p className={`text-xs leading-relaxed ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
              Se ha detectado que la fecha y hora de tu sistema operativo es incorrecta o ha sido retrasada. Para poder utilizar FixManager, por favor corrige la hora de tu computadora y presiona Reintentar.
            </p>
            <button
              type="button"
              onClick={handleRetryClock}
              disabled={checkingClock}
              className={`w-full py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-700 hover:bg-zinc-200'
                : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl'
              }`}
              style={{ opacity: checkingClock ? 0.7 : 1 }}
            >
              {checkingClock ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Comprobando hora...
                </>
              ) : (
                '🔄 Reintentar'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appScreen === 'welcome-choice') {
    if (isMobile()) {
      return (
        <MobileWelcomeChoice
          email={cloudRestoreEmail}
          setEmail={setCloudRestoreEmail}
          password={cloudRestorePassword}
          setPassword={setCloudRestorePassword}
          loading={cloudRestoreLoading}
          error={cloudRestoreError}
          onLogin={handleCloudRestoreLogin}
          onSetup={() => setAppScreen('setup')}
          onRestoreLocal={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target?.result as string);
                  if (!data.config && !data.orders) {
                    alert('⚠️ El archivo no parece ser un respaldo válido de FIXMANAGER.');
                    return;
                  }
                  handleRestoreFromBackup(data);
                  localStorage.setItem('fixmanager_setup_complete', 'true');
                  localStorage.setItem('fixmanager_session_closed', 'false');
                  alert('✅ Datos importados con éxito.\nAhora inicia sesión con tu cuenta de administrador para activar tu licencia.');
                  setAppScreen('login');
                } catch (err) {
                  alert('⚠️ Error al leer el archivo de respaldo: ' + (err as Error).message);
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen overflow-hidden font-sans antialiased bg-[#0f172a] relative select-none">
        {/* Orbes de fondo */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-600/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center gap-8">
          {/* Logo / título */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m5.37-2.806a3.998 3.998 0 00-.553-4.853 4 4 0 00-5.657 0" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">FIXMANAGER</h1>
            <p className="text-sm text-zinc-400">Sistema de Gestión para Taller de Reparaciones</p>
          </div>

          {/* Pregunta principal */}
          <div className="w-full">
            <p className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">¿Es la primera vez que usas FIXMANAGER?</p>

            <div className="space-y-3">
              {/* Cliente nuevo */}
              <button
                type="button"
                onClick={() => setAppScreen('setup')}
                className="w-full group flex items-start gap-4 px-5 py-5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700 hover:border-blue-500/60 rounded-2xl transition-all duration-200 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 group-hover:bg-blue-500/25 flex items-center justify-center shrink-0 transition-all mt-0.5">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">Sí, soy cliente nuevo</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Nunca he usado FIXMANAGER. Quiero configurar el sistema desde cero: nombre del taller, usuario administrador y datos iniciales.
                  </p>
                  <p className="text-[10.5px] text-blue-400/80 mt-1.5 font-bold">→ Inicia el asistente de configuración</p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Cliente existente */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target?.result as string);
                        if (!data.config && !data.orders) {
                          alert('⚠️ El archivo no parece ser un respaldo válido de FIXMANAGER.');
                          return;
                        }
                        handleRestoreFromBackup(data);
                        localStorage.setItem('fixmanager_setup_complete', 'true');
                        localStorage.setItem('fixmanager_session_closed', 'false');
                        alert('✅ Datos importados con éxito.\nAhora inicia sesión con tu cuenta de administrador para activar tu licencia en esta computadora.');
                        setAppScreen('login');
                      } catch (err) {
                        alert('⚠️ Error al leer el archivo de respaldo: ' + (err as Error).message);
                      }
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                className="w-full group flex items-start gap-4 px-5 py-5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700 hover:border-emerald-500/60 rounded-2xl transition-all duration-200 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:bg-emerald-500/25 flex items-center justify-center shrink-0 transition-all mt-0.5">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">No, ya tengo FIXMANAGER en otro equipo</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Ya usé FIXMANAGER antes y tengo un archivo de respaldo (.json) con mis órdenes, clientes, inventario y licencia guardados.
                  </p>
                  <p className="text-[10.5px] text-emerald-400/80 mt-1.5 font-bold">→ Restaura tus datos y activa tu licencia</p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Recuperar desde la Nube */}
              <button
                type="button"
                onClick={() => setAppScreen('cloud-restore')}
                className="w-full group flex items-start gap-4 px-5 py-5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700 hover:border-indigo-500/60 rounded-2xl transition-all duration-200 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 group-hover:bg-indigo-500/25 flex items-center justify-center shrink-0 transition-all mt-0.5">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">Recuperar desde la Nube</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Restaura todo tu taller directamente desde el servidor. Solo necesitas iniciar sesión con tu cuenta de administrador.
                  </p>
                  <p className="text-[10.5px] text-indigo-400/80 mt-1.5 font-bold">→ Descarga tu copia de seguridad online</p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Enlazar como Caja Secundaria */}
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('fixmanager_setup_complete', 'true');
                  setLicenseInitialStep('activate');
                  setAppScreen('login');
                  setLoginInitialMode('localLink');
                }}
                className="w-full group flex items-start gap-4 px-5 py-5 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700 hover:border-emerald-500/60 rounded-2xl transition-all duration-200 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:bg-emerald-500/25 flex items-center justify-center shrink-0 transition-all mt-0.5">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">Enlazar como Caja Secundaria</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Esta computadora no es la principal. Quiero conectarla a la Caja Principal de mi taller para compartir inventario y ventas en red local.
                  </p>
                  <p className="text-[10.5px] text-emerald-400/80 mt-1.5 font-bold">→ Conéctate a tu red local</p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

            </div>
          </div>

          <p className="text-[11px] text-zinc-600 text-center">
            FIXMANAGER — v{appVersion}
          </p>
        </div>
      </div>
    );
  }

  if (appScreen === 'setup') {
    if (isMobile()) {
      return (
        <div className="flex flex-col h-screen overflow-hidden font-sans antialiased bg-[#0a0f1d]">
          <MobileSetupWizard
            onComplete={handleSetupComplete}
            onBack={() => setAppScreen('welcome-choice')}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col h-screen overflow-hidden font-sans antialiased bg-[#0f172a]">
        <SetupWizard
          onComplete={handleSetupComplete}
          onBack={() => setAppScreen('welcome-choice')}
        />
      </div>
    );
  }

  if (appScreen === 'cloud-restore') {
    if (isMobile()) {
      return (
        <MobileCloudRestore
          email={cloudRestoreEmail}
          setEmail={setCloudRestoreEmail}
          password={cloudRestorePassword}
          setPassword={setCloudRestorePassword}
          loading={cloudRestoreLoading}
          error={cloudRestoreError}
          user={cloudRestoreUser}
          backups={cloudRestoreBackups}
          fetchingBackups={cloudRestoreFetchingBackups}
          onLogin={handleCloudRestoreLogin}
          onBack={handleCloudRestoreBack}
          onApply={handleCloudRestoreApply}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen overflow-hidden font-sans antialiased bg-[#0f172a] relative select-none">
        {/* Orbes de fondo */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md px-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloudRestoreBack}
              className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition-all cursor-pointer shrink-0"
              title="Volver"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide">Recuperación en la Nube</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Restaurar Taller desde el Servidor</p>
            </div>
          </div>

          {!cloudRestoreUser ? (
            /* Login Form */
            <form onSubmit={handleCloudRestoreLogin} className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl flex flex-col gap-4">
              <div className="text-center pb-2">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Inicia sesión con tu correo de administrador para listar tus copias de seguridad.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={cloudRestoreEmail}
                  onChange={e => setCloudRestoreEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  required
                  value={cloudRestorePassword}
                  onChange={e => setCloudRestorePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white placeholder-zinc-650"
                />
              </div>

              {cloudRestoreError && (
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold leading-relaxed">
                  ⚠️ {cloudRestoreError}
                </div>
              )}

              <button
                type="submit"
                disabled={cloudRestoreLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {cloudRestoreLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando Sesión...
                  </>
                ) : (
                  'Conectar y Buscar Copias'
                )}
              </button>
            </form>
          ) : (
            /* Backups List */
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl flex flex-col gap-4 max-h-[70vh]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-zinc-500">Sesión iniciada</p>
                  <p className="text-xs font-bold text-white truncate">{cloudRestoreUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    supabase.auth.signOut().catch(() => {});
                    setCloudRestoreUser(null);
                    setCloudRestoreBackups([]);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                >
                  Cambiar Cuenta
                </button>
              </div>

              {cloudRestoreError && (
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold leading-relaxed">
                  ⚠️ {cloudRestoreError}
                </div>
              )}

              <div className="space-y-2 overflow-y-auto flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Selecciona una copia de seguridad</p>
                
                {cloudRestoreFetchingBackups ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-500">
                    <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Buscando respaldos...</span>
                  </div>
                ) : cloudRestoreBackups.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-bold border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    ❌ No se encontraron copias de seguridad en esta cuenta.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cloudRestoreBackups.map(b => {
                      const isApplying = cloudRestoreApplyingId === b.id;
                      return (
                        <div
                          key={b.id}
                          className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white font-mono">
                              {new Date(b.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} a las {new Date(b.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10.5px] text-zinc-300 font-medium truncate mt-1">{b.client_info || 'Dispositivo N/A'}</p>
                          </div>
                          <button
                            type="button"
                            disabled={!!cloudRestoreApplyingId}
                            onClick={() => handleCloudRestoreApply(b)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isApplying ? (
                              <>
                                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Restaurando...
                              </>
                            ) : (
                              'Restaurar'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }



  const showResumeOverlay = appScreen === 'resume';




  // Banner suave (no bloqueante) si la licencia vence mientras la sesión está activa
  const showLicenseBanner = appScreen === 'active' && (licenseStatus === 'expired' || licenseStatus === 'none' || licenseStatus === 'invalid');

  const handleFiarSale = (
    clientName: string,
    clientPhone: string,
    items: any[],
    total: number,
    forceNew: boolean,
    payCash = 0,
    payCard = 0,
    options?: any,
    creditLimit?: number
  ) => {
    const now = new Date().toISOString();
    setInventory(prev => prev.map(inv => {
      const soldItem = items.find(i => i.itemId === inv.id);
      return soldItem ? { ...inv, stock: Math.max(0, inv.stock - soldItem.quantity) } : inv;
    }));
    setRefacciones(prev => prev.map(ref => {
      const soldItem = items.find(i => i.itemId === ref.id);
      return soldItem ? { ...ref, stock: Math.max(0, ref.stock - soldItem.quantity) } : ref;
    }));

    // Process repair orders in the fiado sale:
    items.forEach(item => {
      const itemId = item.itemId || item.id;
      if (itemId && typeof itemId === 'string' && itemId.startsWith('repair-')) {
        const orderId = itemId.replace('repair-', '');
        
        let cashRatio = 0;
        let cardRatio = 0;
        
        const totalPayments = payCash + payCard;
        if (totalPayments > 0 && total > 0) {
          cashRatio = payCash / total;
          cardRatio = payCard / total;
        }
        
        const itemTotal = item.price * (item.quantity || 1);
        const cashPaid = itemTotal * cashRatio;
        const cardPaid = itemTotal * cardRatio;
        
        handleDeliverOrder(orderId, cashPaid, cardPaid);
      }
    });

    const existing = forceNew ? null : creditAccounts.find(a => !a.isClosed && !a.deletedAt && (a.clientPhone === clientPhone || a.clientName === clientName));
    
    const prevBalance = existing ? Math.max(0, existing.entries.reduce((s, e) => s + e.subtotal, 0) - existing.payments.reduce((s, p) => s + p.amount, 0)) : 0;
    const paymentAmount = payCash + payCard;
    const newBalance = prevBalance + total - paymentAmount;

    const entry: CreditSaleEntry = {
      id: `FD-${Date.now().toString(36).toUpperCase()}`,
      createdAt: now,
      items,
      subtotal: total,
      sessionId,
      discount: options?.discount,
      discountType: options?.discountType,
      discountValue: options?.discountValue,
    };

    let payment: CreditPayment | null = null;
    if (paymentAmount > 0) {
      payment = {
        id: `PAY-${Date.now().toString(36).toUpperCase()}`,
        amount: paymentAmount,
        method: payCard > 0 && payCash > 0 ? 'Mixto (Efectivo + Tarjeta/Transfer)' : (payCard > 0 ? 'Tarjeta/Transfer' : 'Efectivo'),
        createdAt: now,
        note: `Abono inicial en venta. Efe: $${payCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Tarjeta: $${payCard.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        sessionId,
      };
    }

    const finalAccountId = existing ? existing.id : `FD-${Date.now().toString(36).toUpperCase()}`;
    if (existing) {
      handleAddCreditEntry(existing.id, entry);
      if (payment) {
        handleAddCreditPayment(existing.id, payment);
      }
    } else {
      const account: CreditAccount = {
        id: finalAccountId,
        clientName,
        clientPhone,
        createdAt: now,
        lastActivityAt: now,
        entries: [entry],
        payments: [],
        isClosed: false,
        alertAfterDays: 7,
      };
      handleCreateCreditAccount(account);
      if (payment) {
        handleAddCreditPayment(finalAccountId, payment);
      }
    }
    // Registrar o vincular cliente en el catálogo general
    registerOrUpdateClient(clientName, clientPhone, undefined, false, creditLimit);
    // Imprimir ticket de cargo
    const sym = config.currencySymbol || '$';
    const paperWidth = config.ticketPaperWidth || '80mm';
    const paperWidthMicrons = paperWidth === '58mm' ? 48000 : paperWidth === 'media-carta' ? 215900 : 72000;
    const offset = config.ticketMarginOffset || 0;
    const is58 = paperWidth === '58mm';
    const isMediaCarta = paperWidth === 'media-carta';
    const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
    const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
    const pageSizeCss = isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
    const pageMarginCss = isMediaCarta ? '6mm 8mm' : '2mm 1mm';
    const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const rows = items.map(i => `<div class="kv"><span>${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span class="bold">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:${pageSizeCss};margin:${pageMarginCss}}*{box-sizing:border-box}
      body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : isMediaCarta ? '14' : '13'}px;font-weight:700;width:100%;margin:0;padding:2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px);color:#000;background:#fff}
      .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
      hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
      .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
      .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0;align-items:flex-start}
      .kv span:first-child{word-break:break-all;flex:1;min-width:0;text-align:left;padding-right:6px}
      .kv span:last-child{flex-shrink:0;text-align:right}
      .bold{font-weight:900}.total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
      .footer{font-size:10px;font-weight:700;text-align:center;margin-top:5px}
    </style></head><body>
      <div class="store">${(config.storeName || 'TALLER').toUpperCase()}</div>
      <hr><span class="badge">💳 CARGO A FIADO</span>
      <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
      <div class="kv"><span>CLIENTE:</span><span class="bold">${clientName}</span></div>
      ${clientPhone ? `<div class="kv"><span>TEL:</span><span>${clientPhone}</span></div>` : ''}
      <hr>${rows}<hr>
      <div class="total-row">CARGO DE HOY: ${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      ${prevBalance > 0 ? `
        <div class="kv" style="margin-top:2px"><span>SALDO ANTERIOR:</span><span>${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      ` : ''}
      ${paymentAmount > 0 ? `
        <div class="kv" style="margin-top:2px"><span>ABONO INICIAL:</span><span>${sym}${paymentAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      ` : ''}
      <div class="kv" style="margin-top:3px;border-top:1px dashed #000;padding-top:2px"><span>SALDO PENDIENTE TOTAL:</span><span class="bold">${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      <div class="footer">${config.ticketFooter || ''}</div>
    </body></html>`;
    const shouldPrint = options ? !!options.printTicket : true;
    const shouldSendWhatsApp = options ? !!options.sendWhatsApp : false;
    console.log('[onFiarSale] options:', options, 'shouldPrint:', shouldPrint, 'shouldSendWhatsApp:', shouldSendWhatsApp, 'clientPhone:', clientPhone);

    if (shouldPrint) {
      window.dispatchEvent(new CustomEvent('automated-print', { detail: { type: 'ticket', name: `Cargo Fiado — ${clientName}`, details: `${config.currencySymbol || '$'}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }));
      const deviceName = config.hybridPrintMode
        ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
        : (config.ticketPrinterBrand || '');
      window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName, paperWidthMicrons, isLabel: false } }));
    }

    if (shouldSendWhatsApp && clientPhone) {
      const targetAccount: CreditAccount = existing || {
        id: finalAccountId,
        clientName,
        clientPhone,
        createdAt: now,
        lastActivityAt: now,
        entries: [entry],
        payments: [],
        isClosed: false,
        alertAfterDays: 7,
      };
      const msg = buildWhatsappFiadoCargoMessage(targetAccount, entry, newBalance, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const dateStrForWa = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      const is58ForWa = whatsappPaperWidth === '58mm';
      const isMediaCartaForWa = whatsappPaperWidth === 'media-carta';
      const rightPadForWa = isMediaCartaForWa ? '6mm' : (is58ForWa ? '8mm' : '6mm');
      const leftPadForWa = isMediaCartaForWa ? '6mm' : (is58ForWa ? '3mm' : '5mm');
      const pageSizeCssForWa = isMediaCartaForWa ? '216mm 140mm' : `${whatsappPaperWidth} auto`;
      const pageMarginCssForWa = isMediaCartaForWa ? '6mm 8mm' : '2mm 1mm';
      const rowsForWa = items.map(i => `<div class="kv"><span>${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span class="bold">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('');
      const whatsappHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page{size:${pageSizeCssForWa};margin:${pageMarginCssForWa}}*{box-sizing:border-box}
        body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58ForWa ? '11' : isMediaCartaForWa ? '14' : '13'}px;font-weight:700;width:100%;margin:0;padding:2mm calc(${rightPadForWa} - ${offset}px) 2mm calc(${leftPadForWa} + ${offset}px);color:#000;background:#fff}
        .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
        hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
        .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
        .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0;align-items:flex-start}
        .kv span:first-child{word-break:break-all;flex:1;min-width:0;text-align:left;padding-right:6px}
        .kv span:last-child{flex-shrink:0;text-align:right}
        .bold{font-weight:900}.total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
        .footer{font-size:10px;font-weight:700;text-align:center;margin-top:5px}
      </style></head><body>
        <div class="store">${(config.storeName || 'TALLER').toUpperCase()}</div>
        <hr><span class="badge">💳 CARGO A FIADO</span>
        <div class="kv"><span>FECHA:</span><span>${dateStrForWa}</span></div>
        <div class="kv"><span>CLIENTE:</span><span class="bold">${clientName}</span></div>
        ${clientPhone ? `<div class="kv"><span>TEL:</span><span>${clientPhone}</span></div>` : ''}
        <hr>${rowsForWa}<hr>
        <div class="total-row">CARGO DE HOY: ${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        ${prevBalance > 0 ? `
          <div class="kv" style="margin-top:2px"><span>SALDO ANTERIOR:</span><span>${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        ` : ''}
        ${paymentAmount > 0 ? `
          <div class="kv" style="margin-top:2px"><span>ABONO INICIAL:</span><span>${sym}${paymentAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        ` : ''}
        <div class="kv" style="margin-top:3px;border-top:1px dashed #000;padding-top:2px"><span>SALDO PENDIENTE TOTAL:</span><span class="bold">${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div class="footer">${config.ticketFooter || ''}</div>
      </body></html>`;
      sendWhatsappNotification(config, clientPhone, msg, whatsappHtml, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending POS fiado cargo:', err);
      });
    }

    setFiadosInitialSelectedAccountId(finalAccountId);
    setFiadosInitialActiveTab('fiados');
    setFiadosHighlightedEntryId(entry.id);
    setFiadosInitialSelectedApartadoId(null);
    setFiadosHighlightedApartadoId(null);
    setActiveTab('Fiados');
  };

  if (isMobile()) {
    return (
      <div className="w-full h-full relative">
        <Suspense fallback={<ScreenFallback />}>
          <MobileApp
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          config={config}
          currentUser={currentUser}
          users={users}
          onUpdateUsers={setUsers}
          onSelectUser={(u) => setCurrentUser(u)}
          onLogout={handleLogout}
          onResetApp={handleResetApp}
          orders={orders}
          inventory={inventory}
          refacciones={refacciones}
          onSetRefacciones={handleSetRefacciones}
          clients={clients}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          sales={sales}
          isCajaOpen={isCajaOpen}
          onOpenCaja={handleOpenCaja}
          onOpenCorteCaja={() => setIsCorteModalOpen(true)}
          onCancelSale={handleCancelSale}
          onPartialRefundSale={handlePartialRefundSale}
          onAddExpense={handleAddExpense}
          services={services}
          onAddService={handleAddService}
          onUpdateService={handleUpdateService}
          onDeleteService={handleDeleteService}
          donors={donors}
          onSetDonors={handleSetDonors}
          onFiarSale={handleFiarSale}

          mobileTheme={mobileTheme}
          onToggleMobileTheme={handleToggleMobileTheme}
          onUpdateStatus={handleUpdateStatus}
          onUpdateOrder={(updated) => {
            (window as any).addDebugLog?.(`MobileApp onUpdateOrder: id=${updated.id}, evCount=${updated.evidence?.length || 0}`);
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
          }}
          onDeleteOrder={handleDeleteOrder}
          onCreateOrder={handleCreateOrder}
          onCompleteSale={handleCompleteSale}
          onAddItem={(newItem) => {
            setInventory(prev => [newItem, ...prev]);
          }}
          onUpdateItem={(updatedItem) => {
            setInventory(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
          }}
          onDeleteItem={(id) => {
            setInventory(prev => prev.filter(i => i.id !== id));
          }}
          onImportInventory={(importedItems, mode = 'add') => {
            if (mode === 'replace') {
              setInventory(importedItems);
            } else {
              setInventory(prev => [...importedItems, ...prev]);
            }
          }}
          onSaveConfig={(newConfig) => {
            setConfig(newConfig);
          }}
          creditAccounts={creditAccounts}
          onCreateCreditAccount={handleCreateCreditAccount}
          onAddCreditEntry={handleAddCreditEntry}
          onAddCreditPayment={handleAddCreditPayment}
          onUpdateCreditAccount={handleUpdateCreditAccount}
          onDeleteCreditAccount={handleDeleteCreditAccount}
          apartados={apartados}
          onCreateApartado={handleCreateApartado}
          onAddApartadoPayment={handleAddApartadoPayment}
          onUpdateApartadoStatus={handleUpdateApartadoStatus}
          expenses={expenses}
          cortesHistorial={cortesHistorial}
          quotes={quotes}
          warehouses={warehouses}
          chipActivations={chipActivations}
          onUpdateChipActivation={handleUpdateChipActivation}
          onDeleteChipActivation={handleDeleteChipActivation}
        />
        </Suspense>
        {isCorteModalOpen && (
          <Suspense fallback={null}>
            <CorteCajaModal
              isOpen={isCorteModalOpen}
              onClose={() => { setIsCorteModalOpen(false); setCorteAfterAction(undefined); }}
              onBack={corteAfterAction && corteAfterAction !== 'resume' ? () => { setIsCorteModalOpen(false); setShowCloseWarning(true); } : undefined}
              orders={orders}
              sales={sales}
              expenses={expenses}
              inventory={inventory}
              config={config}
              afterSaveAction={corteAfterAction}
              creditAccounts={creditAccounts}
              apartados={apartados}
              onSaveCorte={async (newCorte) => {
                if (!newCorte.uuid) newCorte.uuid = generateUUID();
                newCorte.updatedAt = new Date().toISOString();
                const updatedCortes = [newCorte, ...cortesHistorial];
                try {
                  setCortesHistorial(updatedCortes);
                  localStorage.setItem('fixmanager_cortes', JSON.stringify(updatedCortes));
                } catch (e) {
                  console.error('[Corte] Error al guardar historial local:', e);
                }
                try {
                  setIsCajaOpen(false);
                  localStorage.setItem('fixmanager_is_caja_open', 'false');
                  localStorage.setItem('fixmanager_session_closed', 'true');
                  localStorage.removeItem('fixmanager_saldo_inicial');
                  setSaldoInicial(0);
                  const nextSession = sessionId + 1;
                  setSessionId(nextSession);
                  localStorage.setItem('fixmanager_session_id', nextSession.toString());
                } catch (e) {
                  console.error('[Corte] Error al actualizar estado de caja:', e);
                }
                try {
                  await uploadBackupToSupabase(true, updatedCortes);
                } catch (e) {
                  console.error('[Corte] Error al subir respaldo:', e);
                }
              }}
              onComplete={() => {
                setIsCorteModalOpen(false);
                setCorteAfterAction(undefined);
                setCurrentUser(null);
                setAppScreen('login');
              }}
              sessionId={sessionId}
              setSessionId={setSessionId}
              onAddExpense={handleAddExpense}
              onSetExpenses={setExpenses}
              currentUser={currentUser?.name || (currentUser?.role === 'admin' ? 'Administrador' : undefined)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ── Login Screen Gate — NO renderizar el app shell completo en el arranque ──
  // Solo se usa como overlay (showLoginOverlay=true) cuando el usuario cambia de sesión dentro de la app.
  // En el arranque (appScreen='login', showLoginOverlay=false), renderizar LoginView solo sin el shell completo.
  if (appScreen === 'login' && !showLoginOverlay) {
    return (
      <LoginView
        users={users}
        config={config}
        onLogin={handleLogin}
        isOverlay={false}
        licenseStatus={licenseStatus}
        licenseInfo={licenseInfo}
        onRenewLicense={() => { setLicenseStatus('none'); setAppScreen('login'); }}
        onLicenseActivated={(info) => {
          setLicenseStatus('active');
          setLicenseInfo(info);
        }}
        initialSbMode={loginInitialMode}
        onResetApp={handleResetApp}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans antialiased relative select-none ${bgWrapperClass}`}>
      <RemoteSupportAgent config={config} currentUser={currentUser} uploadBackupToSupabase={uploadBackupToSupabase} appVersion={appVersion} />
      <AutoUpdateModal isOpen={showRemoteAutoUpdateModal} onClose={() => setShowRemoteAutoUpdateModal(false)} currentVersion={appVersion} force={remoteUpdateSignal?.force} />
      {/* Background Mesh Orbs */}
      {!isRetro && (
        <>
          <div className={`absolute top-[-10%] left-[-5%] w-[400px] h-[400px] ${isLight ? 'bg-purple-300/20' : 'bg-purple-600/30'} rounded-full blur-[120px] pointer-events-none z-0`}></div>
          <div className={`absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] ${isLight ? 'bg-blue-300/15' : 'bg-blue-600/20'} rounded-full blur-[150px] pointer-events-none z-0`}></div>
          <div className={`absolute top-[20%] right-[15%] w-[300px] h-[300px] ${isLight ? 'bg-pink-300/10' : 'bg-pink-500/10'} rounded-full blur-[100px] pointer-events-none z-0`}></div>
        </>
      )}

      {/* Main Glass/Solid Container Frame - Full Screen (100%) */}
      <div className={`w-full h-full flex flex-col overflow-hidden z-10 relative ${mainContainerClass}`}>
        {/* 1. TOP WINDOW BAR */}
        <Topbar
          config={config}
          activeTicketId={selectedOrderId || 'TKT-014'}
          setActiveTab={setActiveTab}
          setSelectedOrderId={setSelectedOrderId}
          onClearCache={handleClearCache}
          ordersCount={orders.length}
          salesCount={sales.length}
          lanStatus={lanStatus}
          lanSyncBlocked={lanSyncBlocked}
          terminalName={terminalName}
          isSendingPromos={isSendingPromos}
          sendingCurrentIndex={sendingCurrentIndex}
          sendingTotal={sendingTotal}
          ordersByStatus={{
  pendiente: orders.filter(o => o.status === 'Pendiente').length,
  diagnostico: orders.filter(o => o.status === 'Diagnóstico').length,
  enReparacion: orders.filter(o => o.status === 'En Reparación').length,
  listo: orders.filter(o => o.status === 'Listo').length,
  entregado: orders.filter(o => o.status === 'Entregado' || o.status === 'Entregado y Pagado').length,
  cancelado: orders.filter(o => o.status === 'Cancelado' || o.status === 'Fallido').length,
}}
          setConfigSubTab={setConfigSubTab}
          onOpenCorteCaja={() => setIsCorteModalOpen(true)}
          sessionId={sessionId}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          activeTab={activeTab}
          onConfigBrandRedirect={handleConfigBrandRedirect}
          currentUser={currentUser}
          onLogout={handleLogout}
          onEntregaTurno={currentUser?.role === 'employee' ? () => setIsEntregaTurnoOpen(true) : undefined}
          ventasHoy={ventasHoy}
          ventasInusualesHoy={ventasInusualesHoy}
          lowStockCount={lowStockCount}
          stockAlertDismissed={stockAlertDismissed}
          onDismissStockAlert={() => setStockAlertDismissed(true)}
          onGoToStock={() => { setActiveTab('Stock'); setStockFilter('bajoStock'); }}
          ordenesVencidasCount={ordenesVencidas.length}
          ordenesVencidasDismissed={ordenesVencidasDismissed}
          onDismissOrdenesVencidas={() => setOrdenesVencidasDismissed(true)}
          onGoToOrdenes={() => { setActiveTab('Órdenes'); setOrderFilter('En Reparación'); }}
          licenseInfo={licenseInfo}
          licenseStatus={licenseStatus}
        />

        <div className="flex flex-1 overflow-hidden relative">
          {/* Botón flotante Ajustes — discreto, oculto cuando ya estás en Config */}
          {activeTab !== 'Config' && (!currentUser || currentUser.permissions.canAccessConfig) && (
            <button
              type="button"
              onClick={() => { setActiveTab('Config'); setConfigSubTab('global'); }}
              title="Ajustes"
              className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-11 h-11 cursor-pointer active:scale-95 select-none group transition-all duration-300"
              style={{
                background: isRetro ? '#000080' : isFluent ? '#0078d4' : '#f59e0b',
                borderRadius: '10px 0 0 10px',
                color: '#ffffff',
                boxShadow: isRetro
                  ? '0 0 16px rgba(0,0,128,0.7), -4px 0 12px rgba(0,0,128,0.5)'
                  : isFluent
                    ? '0 0 16px rgba(0,120,212,0.7), -4px 0 12px rgba(0,120,212,0.5)'
                    : '0 0 16px rgba(245,158,11,0.6), -4px 0 12px rgba(245,158,11,0.4)',
                opacity: 0.85,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            >
              <svg
                className="animate-spin-slow group-hover:animate-none transition-transform duration-500"
                style={{ width: 20, height: 20 }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
          {/* 2. LEFT SIDEBAR (Desktop) */}
          <div className="hidden md:flex h-full shrink-0">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={handleSidebarSetActiveTab}
              config={config}
              appVersion={appVersion}
              pendingUpdateVersion={pendingUpdateVersion}
              isCajaOpen={isCajaOpen}
              lowStockCount={lowStockCount}
              currentUser={currentUser}
              onOpenMovimiento={setMovimientoModal}
              licenseStatus={licenseStatus}
              licenseInfo={licenseInfo}
              onManageLicense={() => {
                if (licenseStatus === 'active') setShowLicenseModal(true);
                else setAppScreen('login');
              }}
              isSendingPromos={isSendingPromos}
              sendingCurrentIndex={sendingCurrentIndex}
              sendingTotal={sendingTotal}
            />
          </div>

          {/* Mobile Overlay Sidebar Drawer */}
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex" id="mobile-sidebar-drawer">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={() => setMobileSidebarOpen(false)}
              ></div>
              
              {/* Sidebar Content */}
              <div className={`relative flex flex-col ${config.theme === 'retro-window' ? 'w-[112px]' : 'w-24'} h-full shadow-2xl z-50 animate-fadeIn`}>
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    handleSidebarSetActiveTab(tab);
                    setMobileSidebarOpen(false);
                  }}
                  config={config}
                  appVersion={appVersion}
                  pendingUpdateVersion={pendingUpdateVersion}
                  isCajaOpen={isCajaOpen}
                  lowStockCount={lowStockCount}
                  currentUser={currentUser}
                  onOpenMovimiento={setMovimientoModal}
                  isSendingPromos={isSendingPromos}
                  sendingCurrentIndex={sendingCurrentIndex}
                  sendingTotal={sendingTotal}
                />
              </div>
            </div>
          )}

          {/* 3. CORE SUB-VIEW PANEL SWITCHER */}
          <main className={`flex-1 overflow-hidden flex flex-col ${mainSwitcherClass}`}>
            <Suspense fallback={<ViewFallback />}>

            {/* BANNER DE STOCK BAJO — movido a Topbar */}
            {false && lowStockCount > 0 && !stockAlertDismissed && activeTab !== 'Stock' && (
              isRetro ? (
                <div className="shrink-0 flex items-center justify-between gap-2 bg-[#dfdfdf] border-b-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-3 py-1.5 text-[11px] font-sans text-black select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span className="font-bold text-[#8b2500]">ALERTA DE ALMACÉN — {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo o agotado.</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setActiveTab('Stock'); setStockFilter('bajoStock'); }} className="px-3 py-0.5 text-[10px] font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer text-[#000080]">Ver Stock</button>
                    <button onClick={() => setStockAlertDismissed(true)} className="px-2 py-0.5 text-[10px] font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer">✕</button>
                  </div>
                </div>
              ) : isLight ? (
                <div className="shrink-0 flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-300 px-4 py-2 text-amber-900 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-500 shrink-0">⚠️</span>
                    <span className="text-xs font-bold"><span className="font-black">{lowStockCount} producto{lowStockCount > 1 ? 's' : ''}</span> con stock bajo o agotado en almacén.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setActiveTab('Stock'); setStockFilter('bajoStock'); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white rounded transition-all cursor-pointer">Ver Stock</button>
                    <button onClick={() => setStockAlertDismissed(true)} className="text-amber-400 hover:text-amber-700 transition-colors cursor-pointer px-1">✕</button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-between gap-3 bg-amber-950/30 border-b border-amber-600/30 px-4 py-2 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
                    <span className="text-xs text-amber-200 font-bold"><span className="font-black text-amber-400">{lowStockCount} producto{lowStockCount > 1 ? 's' : ''}</span> con stock bajo o agotado en almacén.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setActiveTab('Stock'); setStockFilter('bajoStock'); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded transition-all cursor-pointer">Ver Stock</button>
                    <button onClick={() => setStockAlertDismissed(true)} className="text-amber-600 hover:text-amber-400 transition-colors cursor-pointer text-xs px-1">✕</button>
                  </div>
                </div>
              )
            )}

            {/* BANNER ÓRDENES VENCIDAS — movido a Topbar */}
            {false && ordenesVencidas.length > 0 && !ordenesVencidasDismissed && activeTab !== 'Órdenes' && (
              isRetro ? (
                <div className="shrink-0 flex items-center justify-between gap-2 bg-[#dfdfdf] border-b-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-3 py-1.5 text-[11px] font-sans text-black select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕐</span>
                    <span className="font-bold text-[#8b0000]">ÓRDENES VENCIDAS — {ordenesVencidas.length} orden{ordenesVencidas.length > 1 ? 'es' : ''} superaron su fecha de entrega estimada.</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setActiveTab('Órdenes'); setOrderFilter('En Reparación'); }} className="px-3 py-0.5 text-[10px] font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 cursor-pointer text-[#000080]">Ver Órdenes</button>
                    <button onClick={() => setOrdenesVencidasDismissed(true)} className="px-2 py-0.5 text-[10px] font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 cursor-pointer">✕</button>
                  </div>
                </div>
              ) : isLight ? (
                <div className="shrink-0 flex items-center justify-between gap-3 bg-rose-50 border-b border-rose-300 px-4 py-2 text-rose-900 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="text-rose-500 shrink-0">🕐</span>
                    <span className="text-xs font-bold"><span className="font-black">{ordenesVencidas.length} orden{ordenesVencidas.length > 1 ? 'es' : ''}</span> {ordenesVencidas.length > 1 ? 'superaron' : 'superó'} la fecha de entrega estimada.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setActiveTab('Órdenes')} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white rounded transition-all cursor-pointer">Ver Órdenes</button>
                    <button onClick={() => setOrdenesVencidasDismissed(true)} className="text-rose-400 hover:text-rose-700 transition-colors cursor-pointer px-1">✕</button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-between gap-3 bg-rose-950/30 border-b border-rose-600/30 px-4 py-2 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
                    <span className="text-xs text-rose-200 font-bold"><span className="font-black text-rose-400">{ordenesVencidas.length} orden{ordenesVencidas.length > 1 ? 'es' : ''}</span> {ordenesVencidas.length > 1 ? 'superaron' : 'superó'} la fecha de entrega estimada sin resolverse.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setActiveTab('Órdenes')} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded transition-all cursor-pointer">Ver Órdenes</button>
                    <button onClick={() => setOrdenesVencidasDismissed(true)} className="text-rose-600 hover:text-rose-400 transition-colors cursor-pointer text-xs px-1">✕</button>
                  </div>
                </div>
              )
            )}


            {!isCajaOpen && appScreen === 'active' && ['POS', 'Nueva', 'Gastos', 'Cortes', 'Ventas'].includes(activeTab) ? (
              <AperturaCajaView
                config={config}
                onOpenCaja={handleOpenCaja}
              />
            ) : (
              <>


                {activeTab === 'Nueva' && (
                  <NuevaView
                    services={services}
                    onCreateOrder={handleCreateOrder}
                    config={config}
                    orders={orders}
                    clients={clients}
                    users={users}
                    setActiveTab={setActiveTab}
                    onAddService={handleAddService}
                    onNavigateAway={(tab) => setActiveTab(tab)}
                    onProgressChange={setNuevaInProgress}
                    currentUser={currentUser}
                    refacciones={refacciones}
                    onSetRefacciones={setRefacciones}
                    prefillFromQuote={prefillFromQuote ?? undefined}
                    onPrefillConsumed={() => setPrefillFromQuote(null)}
                    prefillFromRefaccion={prefillFromRefaccion}
                    onPrefillRefaccionConsumed={() => setPrefillFromRefaccion(null)}
                    onBatchCreated={(batchOrders) => {
                      if (config.notifyOnOrder !== false) {
                        sendTelegram(config, tgRecepcionMultiple(batchOrders, config), 'Recepción múltiple');
                      }
                      const html = buildConsolidatedTicketHtml(batchOrders, config, config.duplexManual ? 'front' : undefined);
                      const paperWidthMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
                        ? 210000
                        : (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta')
                          ? 215900
                          : config.ticketPaperWidth === '58mm'
                            ? 48000
                            : 72000;
                      const paperHeightMicrons = config.ticketPaperWidth === 'media-carta-duplicado'
                        ? 297000
                        : config.hybridPrintMode
                          ? 279400
                          : config.ticketPaperWidth === 'media-carta'
                            ? 139700
                            : undefined;
                      silentPrintOrEco({
                        html,
                        deviceName: config.ticketPrinterBrand || undefined,
                        paperWidthMicrons,
                        paperHeightMicrons,
                        isLabel: false,
                        isBatchServiceTicket: config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado',
                        orders: batchOrders
                      });

                      if ((config.hybridPrintMode || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado') && config.printIndividualTicketsInBatch) {
                        if (config.ticketPaperWidth === 'media-carta') {
                          batchOrders.forEach((o) => {
                            const indHtml = buildTicketHtml(o, config, 'front');
                            silentPrintOrEco({
                              html: indHtml,
                              deviceName: config.ticketPrinterBrand || undefined,
                              paperWidthMicrons: 215900,
                              paperHeightMicrons: 139700,
                              isLabel: false,
                            });
                          });
                        } else {
                          const indHtml = buildMediaCartaBatchIndividualTicketsHtml(batchOrders, config);
                          silentPrintOrEco({
                            html: indHtml,
                            deviceName: config.ticketPrinterBrand || undefined,
                            paperWidthMicrons: 215900,
                            paperHeightMicrons: 279400,
                            isLabel: false,
                          });
                        }
                      }
                    }}
                  />
                )}

                {activeTab === 'Órdenes' && (
                  <OrdenesView
                    orders={orders}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateDiagnose={handleUpdateDiagnose}
                    onUpdateOrder={(updated) => {
                      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                    }}
                    onDeliverOrder={handleDeliverOrder}
                    onDeleteOrder={handleDeleteOrder}
                    onAddOrder={(order) => {
                      setOrders(prev => [order, ...prev]);
                      setSelectedOrderId(order.id);
                    }}
                    setActiveTab={setActiveTab}
                    setSelectedOrderId={setSelectedOrderId}
                    selectedOrderId={selectedOrderId}
                    initialFilterStatus={orderFilter}
                    setOrderFilter={setOrderFilter}
                    config={config}
                    users={users}
                    currentUser={currentUser}
                    onAddExpense={handleAddExpense}
                    refacciones={refacciones}
                    onSetRefacciones={setRefacciones}
                    donors={donors}
                    onSetDonors={setDonors}
                  />
                )}

                {activeTab === 'Cotizaciones' && (
                  <CotizacionesView
                    quotes={quotes}
                    config={config}
                    quoteCatalog={quoteCatalog}
                    insumosCatalog={insumosCatalog}
                    clients={clients}
                    currentUser={currentUser}
                    onCreateQuote={handleCreateQuote}
                    onUpdateQuote={handleUpdateQuote}
                    onDeleteQuote={handleDeleteQuote}
                    onConvertQuote={handleConvertQuote}
                    onAddQuoteCatalogItem={handleAddQuoteCatalogItem}
                    onAddInsumoCatalogItem={handleAddInsumoCatalogItem}
                    refacciones={refacciones}
                  />
                )}

                {activeTab === 'Catalogo' && (
                  <CatalogoView
                    quoteCatalog={quoteCatalog}
                    insumosCatalog={insumosCatalog}
                    config={config}
                    onAddQuoteCatalogItem={handleAddQuoteCatalogItem}
                    onUpdateQuoteCatalogItem={handleUpdateQuoteCatalogItem}
                    onDeleteQuoteCatalogItem={handleDeleteQuoteCatalogItem}
                    onAddInsumoCatalogItem={handleAddInsumoCatalogItem}
                    onUpdateInsumoCatalogItem={handleUpdateInsumoCatalogItem}
                    onDeleteInsumoCatalogItem={handleDeleteInsumoCatalogItem}
                  />
                )}

                {activeTab === 'Precios' && (
                  <PreciosView
                    services={services}
                    config={config}
                    orders={orders}
                    onAddService={handleAddService}
                    onUpdateService={handleUpdateService}
                    onDeleteService={handleDeleteService}
                    onUpdateConfig={setConfig}
                    setActiveTab={setActiveTab}
                    initialTab="services"
                  />
                )}

                {activeTab === 'Equipos' && (
                  <PreciosView
                    services={services}
                    config={config}
                    orders={orders}
                    onAddService={handleAddService}
                    onUpdateService={handleUpdateService}
                    onDeleteService={handleDeleteService}
                    onUpdateConfig={setConfig}
                    setActiveTab={setActiveTab}
                    initialTab="devices"
                  />
                )}

                {activeTab === 'POS' && (
                  <PosView
                    orders={orders}
                    inventory={inventory}
                    services={services}
                    refacciones={refacciones}
                    warehouses={warehouses}
                    creditAccounts={creditAccounts}
                    onSetInventory={setInventory}
                    onSetRefacciones={setRefacciones}
                    onCompleteSale={handleCompleteSale}
                    onAddItem={(newItem) => setInventory(prev => [newItem, ...prev])}
                    checkFiarClient={(name, phone) => {
                      const byPhone = creditAccounts.find(a => !a.isClosed && !a.deletedAt && a.clientPhone === phone);
                      const byName  = creditAccounts.find(a => !a.isClosed && !a.deletedAt && a.clientName === name);
                      const found = byPhone ?? byName;
                      const client = clients.find(c => c.phone === phone || c.name.toLowerCase().trim() === name.toLowerCase().trim());
                      if (!found && !client) return null;

                      const creditLimit = client?.creditLimit !== undefined ? client.creditLimit : (config.defaultCreditLimit ?? 1000);
                      if (!found) {
                        return { 
                          clientName: client!.name, 
                          clientPhone: client!.phone, 
                          balance: 0, 
                          matchType: 'phone' as const,
                          creditLimit 
                        };
                      }
                      const debt = found.entries.reduce((s, e) => s + e.subtotal, 0);
                      const paid = found.payments.reduce((s, p) => s + p.amount, 0);
                      const matchType = byPhone ? 'phone' : 'name-only';
                      return { 
                        clientName: found.clientName, 
                        clientPhone: found.clientPhone, 
                        balance: Math.max(0, debt - paid), 
                        matchType,
                        creditLimit
                      };
                    }}
                    onFiarSale={handleFiarSale}
                    config={config}
                    sales={sales}
                    users={users}
                    setActiveTab={setActiveTab}
                    onCancelSale={handleCancelSale}
                    currentUser={currentUser}
                    onCreateApartado={handleCreateApartado}
                    onRegisterChipActivation={handleRegisterChipActivation}
                    onUpdateConfig={setConfig}
                  />
                )}

                {activeTab === 'Recargas' && (
                  <RecargasView
                    config={config}
                    sales={sales}
                    onCompleteSale={handleCompleteSale}
                    currentUser={currentUser}
                    setActiveTab={setActiveTab}
                  />
                )}

                {activeTab === 'Ventas' && (
                  <VentasView
                    sales={sales}
                    config={config}
                    setSelectedOrderId={setSelectedOrderId}
                    setActiveTab={setActiveTab}
                    onCancelSale={handleCancelSale}
                    onPartialRefundSale={handlePartialRefundSale}
                    currentUser={currentUser}
                    chipActivations={chipActivations}
                    onUpdateChipActivation={handleUpdateChipActivation}
                    onDeleteChipActivation={handleDeleteChipActivation}
                    warehouses={warehouses}
                    users={users}
                  />
                )}

                {activeTab === 'Stock' && (
                  <StockView
                    inventory={inventory}
                    refacciones={refacciones}
                    onRestockItem={handleRestockItem}
                    config={config}
                    initialFilter={stockFilter}
                    onSetInventory={handleSetInventory}
                    onSetRefacciones={handleSetRefacciones}
                    setActiveTab={setActiveTab}
                    setConfigSubTab={setConfigSubTab}
                    currentUser={currentUser}
                    warehouses={warehouses}
                    onSetWarehouses={handleSetWarehouses}
                    users={users}
                  />
                )}

                {activeTab === 'Refacciones' && (
                  <RefaccionesView
                    refacciones={refacciones}
                    inventory={inventory}
                    onSetRefacciones={handleSetRefacciones}
                    onSetInventory={handleSetInventory}
                    config={config}
                    currentUser={currentUser}
                    onCreateOrder={(item) => {
                      setPrefillFromRefaccion(item);
                      setActiveTab('Nueva');
                    }}
                    warehouses={warehouses}
                    onSetWarehouses={handleSetWarehouses}
                  />
                )}

                {activeTab === 'Donantes' && (
                  <DonantesView
                    donors={donors}
                    onSetDonors={handleSetDonors}
                    onAddExpense={handleAddExpense}
                    config={config}
                    currentUser={currentUser}
                    orders={orders}
                    sessionId={sessionId}
                  />
                )}

                {activeTab === 'Clientes' && (
                  <ClientesView
                    clients={clients}
                    setOrderFilter={setOrderFilter}
                    setActiveTab={setActiveTab}
                    setSelectedOrderId={setSelectedOrderId}
                    orders={orders}
                    config={config}
                    sales={sales}
                    onDeleteClient={handleDeleteClient}
                    onEditClient={handleEditClient}
                    onSetClients={handleSetClients}
                    isSendingPromos={isSendingPromos}
                    setIsSendingPromos={setIsSendingPromos}
                    sendingCurrentIndex={sendingCurrentIndex}
                    setSendingCurrentIndex={setSendingCurrentIndex}
                    sendingTotal={sendingTotal}
                    setSendingTotal={setSendingTotal}
                    sendingLogs={sendingLogs}
                    setSendingLogs={setSendingLogs}
                    countdownSeconds={countdownSeconds}
                    setCountdownSeconds={setCountdownSeconds}
                    sendingCancelRef={sendingCancelRef}
                    showBulkPromoModal={showBulkPromoModal}
                    setShowBulkPromoModal={setShowBulkPromoModal}
                    promoMessage={promoMessage}
                    setPromoMessage={setPromoMessage}
                    selectedClientIds={selectedClientIds}
                    setSelectedClientIds={setSelectedClientIds}
                    promoSearchQuery={promoSearchQuery}
                    setPromoSearchQuery={setPromoSearchQuery}
                    promoFilterType={promoFilterType}
                    setPromoFilterType={setPromoFilterType}
                    activeTemplateType={activeTemplateType}
                    setActiveTemplateType={setActiveTemplateType}
                    handleStartSending={handleStartSendingPromos}
                    handleCancelSending={handleCancelSendingPromos}
                  />
                )}

                {activeTab === 'Fiados' && (
                  <FiadosView
                    accounts={creditAccounts}
                    inventory={inventory}
                    refacciones={refacciones}
                    clients={clients}
                    config={config}
                    currentUser={currentUser}
                    users={users}
                    onCreateAccount={handleCreateCreditAccount}
                    onAddEntry={handleAddCreditEntry}
                    onAddPayment={handleAddCreditPayment}
                    onUpdateAccount={handleUpdateCreditAccount}
                    onDeleteAccount={handleDeleteCreditAccount}
                    apartados={apartados}
                    onCreateApartado={handleCreateApartado}
                    onAddApartadoPayment={handleAddApartadoPayment}
                    onUpdateApartadoStatus={handleUpdateApartadoStatus}
                    initialSelectedAccountId={fiadosInitialSelectedAccountId}
                    initialSelectedApartadoId={fiadosInitialSelectedApartadoId}
                    initialActiveTab={fiadosInitialActiveTab}
                    highlightedEntryId={fiadosHighlightedEntryId}
                    highlightedApartadoId={fiadosHighlightedApartadoId}
                    onClearNavigationStates={() => {
                      setFiadosInitialSelectedAccountId(null);
                      setFiadosInitialSelectedApartadoId(null);
                      setFiadosHighlightedEntryId(null);
                      setFiadosHighlightedApartadoId(null);
                    }}
                  />
                )}

                {activeTab === 'Cortes' && (
                  <CortesView
                    orders={orders}
                    sales={sales}
                    expenses={expenses}
                    config={config}
                    cortesHistorial={cortesHistorial}
                    onOpenCorteCaja={() => setIsCorteModalOpen(true)}
                    onSaveCorte={async (newCorte) => {
                      if (!newCorte.uuid) newCorte.uuid = generateUUID();
                      newCorte.updatedAt = new Date().toISOString();
                      const updatedCortes = [newCorte, ...cortesHistorial];
                      try {
                        setCortesHistorial(updatedCortes);
                        localStorage.setItem('fixmanager_cortes', JSON.stringify(updatedCortes));
                      } catch (e) {
                        console.error('[Corte] Error al guardar historial local:', e);
                      }
                      try {
                        setIsCajaOpen(false);
                        localStorage.setItem('fixmanager_is_caja_open', 'false');
                        localStorage.setItem('fixmanager_session_closed', 'true');
                        localStorage.removeItem('fixmanager_saldo_inicial');
                        setSaldoInicial(0);

                        const nextSession = sessionId + 1;
                        setSessionId(nextSession);
                        localStorage.setItem('fixmanager_session_id', nextSession.toString());
                      } catch (e) {
                        console.error('[Corte] Error al actualizar estado de caja:', e);
                      }
                      try {
                        await uploadBackupToSupabase(true, updatedCortes);
                      } catch (e) {
                        console.error('[Corte] Error al subir respaldo:', e);
                      }
                    }}
                    startingCash={saldoInicial}
                    aperturas={aperturas}
                    sessionId={sessionId}
                  />
                )}

                {activeTab === 'Gastos' && (
                  <GastosView
                    expenses={expenses}
                    onAddExpense={handleAddExpense}
                    config={config}
                  />
                )}

                {activeTab === 'Reportes' && (
                  <ReportesView
                    sales={sales}
                    orders={orders}
                    expenses={expenses}
                    cortesHistorial={cortesHistorial}
                    services={services}
                    config={config}
                    currentUser={currentUser}
                    quotes={quotes}
                    creditAccounts={creditAccounts}
                    apartados={apartados}
                    inventory={inventory}
                    refacciones={refacciones}
                    warehouses={warehouses}
                    onUpdateOrder={(updated) => {
                      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                      localStorage.setItem('fixmanager_orders', JSON.stringify(orders.map(o => o.id === updated.id ? updated : o)));
                    }}
                  />
                )}

                {activeTab === 'Imprimir' && (
                  <PrintView
                    order={activePrintOrder}
                    sale={activePrintSale}
                    config={config}
                    setActiveTab={setActiveTab}
                    onClearSelection={() => setSelectedOrderId('TKT-014')}
                    selectedOrderId={selectedOrderId}
                  />
                )}

                {activeTab === 'Reabastecer' && (
                  <ReabastecerView
                    inventory={inventory}
                    config={config}
                    onUpdateInventory={(newInv) => {
                      handleSetInventory(newInv);
                      localStorage.setItem('fixmanager_inventory', JSON.stringify(newInv));
                    }}
                    onAddExpense={handleAddExpense}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === 'Etiquetas' && (
                  <EtiquetasView
                    inventory={inventory}
                    config={config}
                  />
                )}

                {activeTab === 'Config' && (
                  <ConfigView
                    config={config}
                    onUpdateConfig={setConfig}
                    activeSubTab={configSubTab}
                    setActiveSubTab={setConfigSubTab}
                    setActiveTab={setActiveTab}
                    setSelectedOrderId={setSelectedOrderId}
                    highlightBrand={highlightBrand}
                    appVersion={appVersion}
                    onPublishVersion={handlePublishVersion}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    users={users}
                    onUpdateUsers={setUsers}
                    currentUser={currentUser}
                    auditLog={auditLog}
                    sales={sales}
                    orders={orders}
                    onDevLoadSampleInventory={() => {
                      const items = generateSampleInventory();
                      setInventory(items);
                      localStorage.setItem('fixmanager_inventory', JSON.stringify(items));
                    }}
                    onDevClearLicense={() => {
                      localStorage.removeItem('fxmgr_license_v2');
                      localStorage.removeItem('fxmgr_license_info');
                    }}
                    onDevResetAllData={() => {
                      const keys = ['fixmanager_setup_complete','fxmgr_license_v2','fxmgr_license_info','fixmanager_orders','fixmanager_services','fixmanager_inventory','fixmanager_clients','fixmanager_sales','fixmanager_expenses','fixmanager_users','fixmanager_is_caja_open','fixmanager_session_closed','fxmgr_renew_draft','fixmanager_aperturas','fixmanager_audit'];
                      keys.forEach(k => localStorage.removeItem(k));
                      setTimeout(() => window.location.reload(), 300);
                    }}
                  />
                )}
              </>
            )}
            </Suspense>
          </main>
        </div>
      </div>

      {/* 4b. MODAL DE ENTREGA DE TURNO (solo empleados) */}
      {currentUser && currentUser.role === 'employee' && (
        <Suspense fallback={null}>
          <EntregaTurnoModal
            isOpen={isEntregaTurnoOpen}
            onClose={() => setIsEntregaTurnoOpen(false)}
            sales={sales}
            config={config}
            currentUser={currentUser}
          />
        </Suspense>
      )}

      {/* MODAL IMPRESIÓN DÚPLEX MANUAL (EN 2 PASOS) */}
      {duplexManualPrintJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className={`w-full max-w-md p-6 border shadow-2xl relative select-none ${
            config.theme === 'retro-window'
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 rounded-none font-sans'
              : config.themeMode === 'light'
                ? 'bg-white border-zinc-200 text-zinc-850 rounded-2xl'
                : 'bg-[#0f1015] border-[#1c1d22] text-zinc-100 rounded-2xl'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-sm uppercase tracking-wide">📄 Frente Impreso</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {duplexManualPrintJob.orders
                    ? `Grupo de ${duplexManualPrintJob.orders.length} órdenes (Folio: ${duplexManualPrintJob.orders[0]?.batchId || ''})`
                    : `Orden #${duplexManualPrintJob.order?.id || ''}`
                  }
                </p>
              </div>
            </div>

            <div className={`p-4 border rounded-xl mb-5 text-[11px] leading-relaxed text-left ${
              config.theme === 'retro-window'
                ? 'bg-[#c0c0c0] border-[#808080] text-zinc-900'
                : config.themeMode === 'light'
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-850'
                  : 'bg-zinc-950/40 border-[#1c1d22] text-zinc-300'
            }`}>
              <p className="font-bold text-[#34d399] mb-2">Siguiente Paso para Impresión Manual:</p>
              <ol className="list-decimal pl-4 space-y-1.5 font-bold">
                <li>Retira la hoja impresa de la bandeja de salida de la impresora.</li>
                <li><b>Voltéala</b> según la orientation de tu impresora (generalmente de arriba a abajo).</li>
                <li>Vuelve a colocarla en la bandeja de entrada (papelera).</li>
                <li>Haz clic en el botón de abajo para imprimir el reverso (cláusulas).</li>
              </ol>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDuplexManualPrintJob(null)}
                className={`px-4 py-2 font-bold text-xs uppercase cursor-pointer rounded-lg border transition-all ${
                  config.theme === 'retro-window'
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 hover:bg-zinc-200'
                    : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-400 rounded-xl'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const order = duplexManualPrintJob.order;
                  const orders = duplexManualPrintJob.orders;
                  const devName = duplexManualPrintJob.deviceName;
                  const wMicrons = duplexManualPrintJob.paperWidthMicrons;
                  const hMicrons = duplexManualPrintJob.paperHeightMicrons;
                  setDuplexManualPrintJob(null);

                  const html = orders
                    ? buildConsolidatedTicketHtml(orders, config, 'back')
                    : order
                      ? buildTicketHtml(order, config, 'back')
                      : '';

                  if (html) {
                    await silentPrintOrEco({
                      html,
                      deviceName: devName,
                      paperWidthMicrons: wMicrons,
                      paperHeightMicrons: hMicrons,
                      isLabel: false
                    });

                    const toast = document.createElement('div');
                    toast.textContent = `✅ Reverso (Cláusulas) enviado a la impresora.`;
                    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3200);
                  }
                }}
                className={`px-4 py-2 font-black text-xs uppercase cursor-pointer rounded-lg border transition-all ${
                  config.theme === 'retro-window'
                    ? 'bg-[#000080] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white rounded-xl'
                }`}
              >
                🖨️ Imprimir Reverso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO RÁPIDO — Entrada / Salida */}
      {movimientoModal && (
        <Suspense fallback={null}>
          <MovimientoModal
            type={movimientoModal}
            config={config}
            onAddExpense={handleAddExpense}
            onClose={() => setMovimientoModal(null)}
          />
        </Suspense>
      )}

      {/* 4. MODAL GLOBAL DE CORTE DE CAJA POR DENOMINACIONES */}
      <Suspense fallback={null}>
        <CorteCajaModal
          isOpen={isCorteModalOpen}
          onClose={() => { setIsCorteModalOpen(false); setCorteAfterAction(undefined); }}
          onBack={corteAfterAction && corteAfterAction !== 'resume' ? () => { setIsCorteModalOpen(false); setShowCloseWarning(true); } : undefined}
          orders={orders}
          sales={sales}
          expenses={expenses}
          inventory={inventory}
          config={config}
          afterSaveAction={corteAfterAction}
          creditAccounts={creditAccounts}
          apartados={apartados}
          startingCash={saldoInicial}
          onSaveCorte={async (newCorte) => {
            if (!newCorte.uuid) newCorte.uuid = generateUUID();
            newCorte.updatedAt = new Date().toISOString();
            const updatedCortes = [newCorte, ...cortesHistorial];
            try {
              setCortesHistorial(updatedCortes);
              localStorage.setItem('fixmanager_cortes', JSON.stringify(updatedCortes));
            } catch (e) {
              console.error('[Corte] Error al guardar historial local:', e);
            }
            try {
              setIsCajaOpen(false);
              localStorage.setItem('fixmanager_is_caja_open', 'false');
              localStorage.setItem('fixmanager_session_closed', 'true');
              localStorage.removeItem('fixmanager_saldo_inicial'); // limpiar para que la próxima apertura empiece en cero
              setSaldoInicial(0);

              const nextSession = sessionId + 1;
              setSessionId(nextSession);
              localStorage.setItem('fixmanager_session_id', nextSession.toString());
            } catch (e) {
              console.error('[Corte] Error al actualizar estado de caja:', e);
            }
            try {
              await uploadBackupToSupabase(true, updatedCortes);
            } catch (e) {
              console.error('[Corte] Error al subir respaldo:', e);
            }
          }}
          onComplete={() => {
            const api = (window as any).electronAPI;
            if (api?.confirmClose) {
              handleConfirmClose();
            } else {
              setIsCorteModalOpen(false);
              setCorteAfterAction(undefined);
              setCurrentUser(null);
              setAppScreen('login');
            }
          }}
          sessionId={sessionId}
          setSessionId={setSessionId}
          onAddExpense={handleAddExpense}
          onSetExpenses={setExpenses}
          currentUser={currentUser?.name || (currentUser?.role === 'admin' ? 'Administrador' : undefined)}
        />
      </Suspense>

      {/* 5. PHYSICAL PRINTER COMMAND NOTIFICATION / TOAST (BOTTOM RIGHT CORNER) */}
      {activePrintJobs.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999999, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {activePrintJobs.map(activePrintJob => (
            <div key={activePrintJob.id} id={`printing-toast-${activePrintJob.id}`}>
              {activePrintJob.unconfigured ? (
                /* ── Sin impresora ── */
                isRetro ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#cbd6e2', border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', padding: '8px 14px', fontFamily: 'sans-serif', fontSize: '12px', color: '#031124', boxShadow: '2px 2px 6px rgba(0,0,0,0.25)', minWidth: '260px' }}>
                    <span>⚠️</span>
                    <span style={{ fontWeight: 900, color: '#800000', flex: 1 }}>Sin impresora — {activePrintJob.type === 'ticket' ? 'tickets' : 'etiquetas'}</span>
                    <button onClick={() => { setActivePrintJobs([]); setConfigSubTab('printer'); setActiveTab('Config'); }}
                      style={{ padding: '2px 8px', fontSize: '10px', fontWeight: 700, background: '#cbd6e2', border: '1px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', cursor: 'pointer' }}>Config</button>
                    <button onClick={() => setActivePrintJobs(p => p.filter(j => j.id !== activePrintJob.id))}
                      style={{ fontSize: '11px', color: '#808080', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1a1008', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '12px', padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: '280px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '12px' }}>Sin impresora configurada</div>
                      <div style={{ color: '#78716c', fontSize: '10px', marginTop: '1px' }}>{activePrintJob.type === 'ticket' ? 'Tickets' : 'Etiquetas'} sin asignar</div>
                    </div>
                    <button onClick={() => { setActivePrintJobs([]); setConfigSubTab('printer'); setActiveTab('Config'); }}
                      style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 800, background: '#f59e0b', color: '#000', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Config →</button>
                    <button onClick={() => setActivePrintJobs(p => p.filter(j => j.id !== activePrintJob.id))}
                      style={{ fontSize: '13px', color: '#57534e', cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0 }}>✕</button>
                  </div>
                )
              ) : isRetro ? (
                /* ── Retro normal ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#cbd6e2', border: '2px solid', borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#808080', borderBottomColor: '#808080', padding: '8px 14px', fontFamily: 'sans-serif', fontSize: '12px', color: '#031124', boxShadow: '2px 2px 6px rgba(0,0,0,0.25)', minWidth: '260px' }}>
                  <span style={{ flexShrink: 0 }}>🖨️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: '#000080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePrintJob.name}</div>
                    {activePrintJob.details && <div style={{ fontSize: '10px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePrintJob.details}</div>}
                    {activePrintJob.printerName && <div style={{ fontSize: '10px', color: '#666' }}>{activePrintJob.printerName}</div>}
                  </div>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>
                    {activePrintJob.status === 'sending' && '🔌'}
                    {activePrintJob.status === 'printing' && '📠'}
                    {activePrintJob.status === 'success' && '✅'}
                  </span>
                </div>
              ) : (
                /* ── Dark / Light normal ── */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: isLight ? '#ffffff' : '#18191e',
                  border: isLight ? '1px solid #e4e4e7' : '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '12px', padding: '10px 16px',
                  boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.5)',
                  minWidth: '280px', maxWidth: '340px',
                }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: activePrintJob.status === 'success' ? 'rgba(16,185,129,0.15)' : isLight ? '#f4f4f5' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Printer style={{ width: '16px', height: '16px', color: activePrintJob.status === 'success' ? '#10b981' : isLight ? '#6366f1' : '#818cf8' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isLight ? '#18181b' : '#f4f4f5', fontWeight: 800, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePrintJob.name}</div>
                    <div style={{ color: isLight ? '#71717a' : '#6b7280', fontSize: '10px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activePrintJob.printerName || (activePrintJob.type === 'ticket' ? 'Ticket' : 'Etiqueta')}
                      {activePrintJob.details ? ` · ${activePrintJob.details}` : ''}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    {activePrintJob.status === 'sending' && <span style={{ color: isLight ? '#a1a1aa' : '#6b7280', fontSize: '16px' }}>⏳</span>}
                    {activePrintJob.status === 'printing' && <span style={{ color: '#6366f1', fontSize: '16px' }}>🖨️</span>}
                    {activePrintJob.status === 'success' && <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* LOGIN OVERLAY / SCREEN — cambio de usuario o pantalla de login sobre la interfaz principal */}
      {(appScreen === 'login' || showLoginOverlay) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
          <LoginView
            users={users}
            config={config}
            onLogin={handleLogin}
            isOverlay={showLoginOverlay}
            licenseStatus={licenseStatus}
            licenseInfo={licenseInfo}
            onRenewLicense={() => { setLicenseStatus('none'); setAppScreen('login'); }}
            onLicenseActivated={(info) => {
              setLicenseStatus('active');
              setLicenseInfo(info);
            }}
            initialSbMode={loginInitialMode}
            onResetApp={handleResetApp}
          />
        </div>
      )}

      {/* BANNER SUAVE — licencia vencida durante sesión activa */}
      {showLicenseBanner && (
        <div className={`fixed top-0 left-0 right-0 z-[99998] px-4 py-2 flex items-center justify-between gap-3 shadow-lg select-none ${
          isRetro
            ? (isLight ? 'bg-red-100 border-b-2 border-red-600 text-red-950 font-mono font-black' : 'bg-red-950 border-b-2 border-red-600 text-red-100 font-mono font-black')
            : (isLight ? 'bg-red-600 border-b border-red-700 text-white font-bold' : 'bg-red-950/95 border-b border-red-800/80 text-red-100 backdrop-blur-md font-bold')
        }`}>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-sm animate-pulse">⛔</span>
            <span>Tu licencia ha vencido — Al cerrar sesión no podrás volver a ingresar hasta renovar</span>
          </div>
          <button
            onClick={() => setShowRenewConfirmation(true)}
            className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1 ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 text-red-700 hover:bg-white hover:text-red-900'
                : (isLight ? 'bg-white hover:bg-red-50 text-red-700 border border-white/40 rounded-lg shadow' : 'bg-red-600 hover:bg-red-500 text-white rounded-lg shadow')
            }`}
          >
            Renovar licencia →
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE RENOVACIÓN */}
      {showRenewConfirmation && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className={`p-6 max-w-sm w-full flex flex-col gap-4 text-center ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-950 font-mono shadow-lg' : 'bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl text-white'}`}>
            <div className="text-4xl text-amber-500">⚠️</div>
            <div>
              <div className={`text-base font-black ${isRetro ? 'text-zinc-950' : 'text-zinc-100'}`}>¿Deseas cerrar sesión para renovar?</div>
              <p className={`text-xs mt-2 leading-relaxed ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>
                Si decides continuar, se cerrará tu sesión activa de tolerancia para que el sistema actualice el estado de tu licencia.
                <br /><br />
                Si prefieres seguir trabajando hoy con el aviso de tolerancia, presiona <strong>Cancelar</strong>.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setShowRenewConfirmation(false);
                  setLicenseStatus('none');
                  setAppScreen('login');
                }}
                className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider cursor-pointer ${isRetro ? 'bg-[#000080] text-white border-2 border-t-[#2222ff] border-l-[#2222ff] border-b-[#000033] border-r-[#000033]' : 'bg-red-600 hover:bg-red-700 text-white rounded-xl'}`}
              >
                Cerrar Sesión
              </button>
              <button
                onClick={() => setShowRenewConfirmation(false)}
                className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider cursor-pointer ${isRetro ? 'bg-[#dfdfdf] text-zinc-800 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 hover:bg-zinc-300' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-xl'}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ACTUALIZACIÓN */}
      {updateInfo && currentUser && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 flex flex-col gap-4 text-center">
            <div className="text-5xl">🚀</div>
            <div>
              <div className="text-xl font-black text-zinc-900">Nueva Actualización</div>
              <div className="text-sm font-bold text-blue-600 mt-1">Versión {updateInfo.version} disponible</div>
              {updateInfo.platformLabel && (
                <div className="text-[11px] font-bold text-zinc-400 mt-1">📦 {updateInfo.platformLabel}</div>
              )}
              <div className="text-xs text-zinc-500 mt-2">{updateInfo.notes}</div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  (window as any).electronAPI?.openExternal(updateInfo.dmgUrl);
                  setUpdateInfo(null);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all cursor-pointer"
              >
                ⬇️ Descargar {updateInfo.platformLabel || 'Actualización'}
              </button>
              <button
                onClick={() => setUpdateInfo(null)}
                className="w-full py-2 text-zinc-400 hover:text-zinc-600 font-bold text-sm transition-all cursor-pointer"
              >
                Ignorar por ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apertura de Caja Modal */}
      {appScreen === 'apertura' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.25)' }}>
          <AperturaCajaView config={config} onOpenCaja={handleOpenCaja} currentUser={currentUser} users={users} asModal />
        </div>
      )}

      {/* Session Resume Overlay */}
      {showResumeOverlay && !isCorteModalOpen && (
        <SessionResumeView
          config={config}
          onResume={handleResumeSession}
          onGoToCorte={() => { setCorteAfterAction('resume'); setIsCorteModalOpen(true); }}
          onResetSetup={handleResetSetup}
          currentUser={currentUser}
        />
      )}

      {/* Modal confirmación salir de Nueva Orden con progreso */}
      {showNuevaExitConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-2xl bg-black/40">
          <div className={`w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none'
            : isLight ? 'bg-[#eef1f7] border border-slate-300' : 'bg-[#121316] border border-zinc-700'
          }`}>
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-800/40'}`}>
              <span className="text-2xl">⚠️</span>
              <div>
                <div className={`text-sm font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-amber-800' : 'text-amber-400'}`}>¿Salir de la orden?</div>
                <div className={`text-[10px] ${isRetro ? 'retro-white-text opacity-70' : isLight ? 'text-amber-600' : 'text-amber-500/80'}`}>Tienes una orden en proceso</div>
              </div>
            </div>
            <div className={`px-5 py-4 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Si sales ahora perderás el progreso de la orden en curso. ¿Deseas salir de todos modos?
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => {
                  setShowNuevaExitConfirm(false);
                  setNuevaInProgress(false);
                  setActiveTab(pendingTabFromSidebar);
                  setPendingTabFromSidebar(null);
                  setPrefillFromQuote(null);
                }}
                className={`w-full py-2.5 text-xs font-black uppercase rounded-lg cursor-pointer transition-all retro-white-text ${isRetro ? 'bg-red-600 border-none hover:bg-red-700' : isLight ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-600 hover:bg-rose-500'}`}
              >
                Sí, salir y perder el progreso
              </button>
              <button
                onClick={() => { setShowNuevaExitConfirm(false); setPendingTabFromSidebar(null); }}
                className={`w-full py-2 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all ${isRetro ? 'bg-zinc-200 border border-zinc-400 text-zinc-700' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
              >
                Continuar con la orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal borrador de Abasto al navegar fuera */}
      {showReabasteceExitConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-2xl bg-black/50">
          <div className={`w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none'
            : isLight ? 'bg-white border border-slate-200'
            : 'bg-[#121316] border border-zinc-700'
          }`}>
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-800/40'}`}>
              <span className="text-2xl">📦</span>
              <div>
                <div className={`text-sm font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-amber-800' : 'text-amber-400'}`}>Reabasto en proceso</div>
                <div className={`text-[10px] ${isRetro ? 'retro-white-text opacity-70' : isLight ? 'text-amber-600' : 'text-amber-500/80'}`}>Tienes artículos pendientes de procesar</div>
              </div>
            </div>
            <div className={`px-5 py-4 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Tienes un borrador de reabasto con artículos sin procesar. ¿Qué deseas hacer?
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => { setShowReabasteceExitConfirm(false); setPendingTabFromSidebar(null); }}
                className={`w-full py-2.5 text-xs font-black uppercase rounded-lg cursor-pointer transition-all retro-white-text ${isRetro ? 'bg-blue-600 border-none hover:bg-blue-700' : isLight ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                Continuar en Abasto
              </button>
              <button
                onClick={() => {
                  setShowReabasteceExitConfirm(false);
                  setActiveTab(pendingTabFromSidebar);
                  setPendingTabFromSidebar(null);
                }}
                className={`w-full py-2.5 text-xs font-black uppercase rounded-lg cursor-pointer transition-all retro-white-text ${isRetro ? 'bg-emerald-600 border-none hover:bg-emerald-700' : isLight ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}
              >
                Guardar borrador y salir
              </button>
              <button
                onClick={() => {
                  clearReabastoDraft();
                  setShowReabasteceExitConfirm(false);
                  setActiveTab(pendingTabFromSidebar);
                  setPendingTabFromSidebar(null);
                }}
                className={`w-full py-2 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all ${isRetro ? 'bg-zinc-200 border border-zinc-400 text-zinc-700 hover:bg-zinc-300' : isLight ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' : 'bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/40'}`}
              >
                Salir y vaciar borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Eco Mode — ticket digital */}
      {ecoQueue.length > 0 && (
        <Suspense fallback={null}>
          <EcoTicketModal
            queue={ecoQueue}
            isRetro={isRetro}
            isLight={isLight}
            onDismiss={() => setEcoQueue(prev => prev.slice(1))}
          />
        </Suspense>
      )}

      {/* Modal de Anuncio / Promo de Taecel */}
      {showTaecelPromo && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-fadeIn">
          <div className={`w-full max-w-md flex flex-col relative overflow-hidden shadow-2xl ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-mono p-5 animate-scaleUp' 
              : isLight 
                ? 'bg-white border border-slate-200 text-slate-800 rounded-3xl p-6 animate-scaleUp' 
                : 'bg-[#121316] border border-zinc-800 text-zinc-100 rounded-3xl p-6 animate-scaleUp'
          }`}>
            {isRetro ? (
              <>
                {/* Retro Style Modal */}
                <div className="bg-[#000080] px-3 py-1 flex items-center justify-between font-bold mb-4 select-none">
                  <span style={{ color: '#ffffff' }}>📱 ¡NUEVO MÓDULO DISPONIBLE!</span>
                  <button 
                    onClick={() => {
                      localStorage.setItem('fixmanager_seen_taecel_promo', 'true');
                      setShowTaecelPromo(false);
                    }}
                    className="bg-[#dfdfdf] text-black px-1.5 py-0.5 border border-white hover:bg-zinc-200 text-xs active:border-zinc-500 font-mono cursor-pointer"
                  >
                    X
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <RecargasCustomIcon className="w-12 h-12 shrink-0 select-none" />
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wide text-[#000080]">Recargas y Pago de Servicios</h3>
                      <p className="text-[11px] leading-relaxed mt-1 text-zinc-800">
                        Vende tiempo aire de todas las compañías (Telcel, Movistar, AT&T, etc.) y realiza cobros de servicios públicos (CFE, Telmex, agua, etc.) directamente desde tu punto de venta.
                      </p>
                    </div>
                  </div>
                  <div className="bg-zinc-200/50 p-2.5 border border-zinc-400 text-[10px] leading-tight text-zinc-700 select-none">
                    * Incrementa tus ingresos cobrando comisiones personalizadas por cada recarga y recibo de servicio.
                  </div>
                  <div className="flex gap-2 pt-2 justify-end">
                    <button
                      onClick={() => {
                        localStorage.setItem('fixmanager_seen_taecel_promo', 'true');
                        setShowTaecelPromo(false);
                      }}
                      className="px-4 py-1.5 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 bg-zinc-200 text-black hover:bg-zinc-300 text-xs font-bold active:border-t-zinc-600 active:border-l-zinc-600 active:border-b-white active:border-r-white cursor-pointer font-mono"
                    >
                      Más tarde
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('fixmanager_seen_taecel_promo', 'true');
                        setShowTaecelPromo(false);
                        setActiveTab('Config');
                        setConfigSubTab('taecel');
                      }}
                      className="px-4 py-1.5 border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 bg-[#000080] text-white hover:bg-[#0000a0] text-xs font-bold active:border-t-zinc-800 active:border-l-zinc-800 active:border-b-white active:border-r-white cursor-pointer font-mono"
                    >
                      Ir a Configuración
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Modern Style Modal */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center select-none">
                    <RecargasCustomIcon className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full select-none">
                      ¡Nuevo Módulo Disponible!
                    </span>
                    <h3 className="text-lg font-black tracking-tight leading-tight">
                      Recargas y Pago de Servicios
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400 px-1">
                    Vende tiempo aire de todas las compañías (Telcel, Movistar, AT&T, etc.), paquetes de datos y realiza cobro de servicios públicos (CFE, Telmex, agua, etc.) directamente desde tu punto de venta.
                  </p>

                  <div className="w-full bg-slate-50 dark:bg-zinc-950 p-3 rounded-2xl border border-slate-100 dark:border-zinc-900 text-[10px] text-left text-slate-500 dark:text-zinc-400 flex items-start gap-2 select-none">
                    <span className="text-base leading-none">💰</span>
                    <span>
                      <strong>Incrementa tus ganancias:</strong> Configura comisiones personalizadas por cada recarga y cobro de servicio para tu negocio.
                    </span>
                  </div>

                  <div className="flex flex-col w-full gap-2 pt-2">
                    <button
                      onClick={() => {
                        localStorage.setItem('fixmanager_seen_taecel_promo', 'true');
                        setShowTaecelPromo(false);
                        setActiveTab('Config');
                        setConfigSubTab('taecel');
                      }}
                      className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 cursor-pointer shadow-md transition-all"
                    >
                      Ir a Configuración y Activar
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('fixmanager_seen_taecel_promo', 'true');
                        setShowTaecelPromo(false);
                      }}
                      className="w-full py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Más tarde
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Previsualización de Reporte A4 */}
      {a4ReportPreview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md bg-black/75 animate-fadeIn">
          <div className={`w-full max-w-4xl flex flex-col relative overflow-hidden rounded-2xl shadow-2xl ${
            isRetro 
              ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans' 
              : isLight 
                ? 'bg-white border border-zinc-200 text-zinc-900' 
                : 'bg-[#0f1115] border border-zinc-800 text-zinc-100'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isRetro ? 'bg-[#000080] text-white p-2' : isLight ? 'bg-zinc-50 text-zinc-900 border-zinc-200' : 'bg-[#13151a] text-zinc-100 border-zinc-850'
            }`}>
              <div className="flex items-center gap-2">
                <Printer className={`w-4 h-4 shrink-0 ${isRetro ? 'text-white' : 'text-blue-500'}`} />
                <span className={`font-extrabold text-xs uppercase tracking-wider ${isRetro ? 'retro-white-text text-white' : isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>
                  Reporte A4: {a4ReportPreview.title}
                </span>
              </div>
              <button
                onClick={() => {
                  setA4ReportPreview(null);
                  setWaReportNumber('');
                }}
                className={`cursor-pointer ${
                  isRetro ? 'retro-white-text text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Content & Toolbar Grid */}
            <div className="flex flex-col md:flex-row h-[75vh]">
              {/* Report Iframe Preview */}
              <div className="flex-1 p-4 bg-zinc-100 dark:bg-zinc-905 border-b md:border-b-0 md:border-r border-zinc-205 dark:border-zinc-800 overflow-hidden flex flex-col text-left">
                <div className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wide">
                  Vista Previa del Documento
                </div>
                <iframe
                  title="A4 Report Preview"
                  srcDoc={a4ReportPreview.html}
                  className="flex-1 w-full bg-white rounded-lg shadow-sm border border-zinc-300 dark:border-zinc-700 overflow-y-auto"
                />
              </div>

              {/* Toolbar Options */}
              <div className="w-full md:w-80 p-5 flex flex-col justify-between space-y-6">
                <div className="space-y-5 text-left">
                  <div>
                    <h5 className="font-extrabold text-[11px] uppercase tracking-wide opacity-70 mb-1.5">
                      Acciones del Documento
                    </h5>
                    <p className="text-[10px] opacity-60 leading-relaxed">
                      Elige cómo deseas procesar o guardar el reporte generado en formato A4.
                    </p>
                  </div>

                  {/* Print Button */}
                  <button
                    onClick={() => {
                      if (!config.reportPrinterName?.trim()) {
                        alert('⚠️ No hay una impresora A4 configurada. Define una impresora A4 en Ajustes > Impresoras antes de imprimir.');
                        return;
                      }
                      const eAPI = (window as any).electronAPI;
                      if (eAPI?.silentPrintHtml) {
                        eAPI.silentPrintHtml({
                          html: a4ReportPreview.html,
                          deviceName: a4ReportPreview.deviceName || config.reportPrinterName || '',
                          paperWidthMicrons: 210000,
                          paperHeightMicrons: 297000,
                          isReport: true
                        }).then(() => {
                          const n = document.createElement('div');
                          n.textContent = '✅ Impresión enviada con éxito';
                          n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;';
                          document.body.appendChild(n);
                          setTimeout(() => n.remove(), 3200);
                        }).catch((err: any) => {
                          alert(`❌ Error al imprimir: ${err.message || err}`);
                        });
                      }
                    }}
                    className="w-full py-2.5 px-4 font-bold text-xs uppercase tracking-wide text-white bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-750 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir en Hoja A4
                  </button>

                  {/* Save PDF Button */}
                  <button
                    onClick={async () => {
                      const eAPI = (window as any).electronAPI;
                      if (eAPI?.printToPdf) {
                        const res = await eAPI.printToPdf({
                          html: a4ReportPreview.html,
                          filename: a4ReportPreview.filename,
                          paperWidth: 'A4'
                        });
                        if (res?.success) {
                          const n = document.createElement('div');
                          n.textContent = '✅ PDF descargado y guardado correctamente';
                          n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;';
                          document.body.appendChild(n);
                          setTimeout(() => n.remove(), 3200);
                        }
                      }
                    }}
                    className="w-full py-2.5 px-4 font-bold text-xs uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Guardar / Descargar PDF
                  </button>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 my-4 pt-4">
                    <h5 className="font-extrabold text-[11px] uppercase tracking-wide opacity-70 mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      Enviar por WhatsApp
                    </h5>
                    <p className="text-[10px] opacity-60 leading-relaxed mb-3">
                      Genera el documento en formato PDF y lo envía de forma automática como archivo adjunto a través de WhatsApp Web.
                    </p>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="WhatsApp (con lada, ej. 523511234567)"
                        value={waReportNumber}
                        onChange={(e) => setWaReportNumber(e.target.value.replace(/[^\d+]/g, ''))}
                        className={`w-full px-3 py-2 text-xs font-mono font-bold focus:outline-none transition-colors border-2 rounded-lg ${
                          isLight 
                            ? 'bg-white border-zinc-300 focus:border-emerald-500 text-zinc-800' 
                            : 'bg-zinc-900 border-zinc-800 focus:border-emerald-500 text-zinc-100'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isSendingWaReport || !waReportNumber.trim()}
                        onClick={async () => {
                          const cleanNumber = waReportNumber.replace(/\D/g, '');
                          if (!cleanNumber) {
                            alert("⚠️ Ingresa un número de teléfono válido.");
                            return;
                          }
                          const eAPI = (window as any).electronAPI;
                          if (!eAPI?.waGeneratePdfBase64 || !eAPI?.whatsappSendDocument) {
                            alert("❌ La integración con WhatsApp Web no está disponible.");
                            return;
                          }
                          setIsSendingWaReport(true);
                          try {
                            const pdfResult = await eAPI.waGeneratePdfBase64(a4ReportPreview.html);
                            if (!pdfResult?.success || !pdfResult.base64) {
                              throw new Error(pdfResult?.error || 'No se pudo generar el PDF.');
                            }
                            const res = await eAPI.whatsappSendDocument(cleanNumber, pdfResult.base64, a4ReportPreview.filename);
                            if (res?.success) {
                              const n = document.createElement('div');
                              n.textContent = '✅ PDF del reporte enviado por WhatsApp';
                              n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;background:#16a34a;color:#fff;pointer-events:none;white-space:nowrap;';
                              document.body.appendChild(n);
                              setTimeout(() => n.remove(), 3200);
                            } else {
                              throw new Error(res?.error || 'Error al enviar por WhatsApp.');
                            }
                          } catch (err: any) {
                            alert(`❌ Error al enviar PDF: ${err.message || err}`);
                          } finally {
                            setIsSendingWaReport(false);
                          }
                        }}
                        className="w-full py-2 px-4 font-bold text-xs uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                      >
                        {isSendingWaReport ? 'Generando y enviando...' : 'Enviar PDF por WA'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Cancel */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      setA4ReportPreview(null);
                      setWaReportNumber('');
                    }}
                    className={`w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                      isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-750 text-white'
                    }`}
                  >
                    Cerrar Previsualización
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de advertencia al cerrar con sesión abierta */}
      {showCloseWarning && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-2xl bg-black/50">
          {isRetro ? (
            <div className="relative w-full max-w-xs mx-4 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 shadow-[2px_2px_10px_rgba(0,0,0,0.5)] p-1 text-black font-sans">
              {/* Header */}
              <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between text-[11px] font-sans font-bold select-none border-b border-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">⚠️</span>
                  <span className="retro-white-text">Sesión de caja activa</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-3 space-y-3 font-sans text-black">
                <div className="bg-[#dfdfdf] border-2 border-t-zinc-600 border-l-zinc-600 border-b-white border-r-white p-3 text-[11px] leading-normal text-zinc-950 font-bold select-none">
                  <p className="mb-1">Si cierras ahora la caja quedará abierta. La próxima vez que inicies el sistema se te pedirá continuar o finalizar la sesión.</p>
                  <p className="font-black">¿Qué deseas hacer?</p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowCloseWarning(false);
                      setCorteAfterAction('logout');
                      setIsCorteModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#000080] hover:bg-[#0000aa] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a] active:border-t-[#00004a] active:border-l-[#00004a] active:border-b-white active:border-r-white font-bold text-xs uppercase cursor-pointer transition-all select-none"
                  >
                    🏦 Cerrar Sesión / Hacer Corte de Caja
                  </button>
                  <button
                    onClick={() => { setShowCloseWarning(false); handleConfirmClose(); }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-[#800000] hover:bg-[#a00000] text-white border-2 border-t-[#ff4040] border-l-[#ff4040] border-b-[#4a0000] border-r-[#4a0000] active:border-t-[#4a0000] active:border-l-[#4a0000] active:border-b-white active:border-r-white font-bold text-xs uppercase cursor-pointer transition-all select-none"
                  >
                    ✕ Salir sin finalizar sesión
                  </button>
                  <button
                    onClick={() => setShowCloseWarning(false)}
                    className="w-full py-2 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-950 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white font-bold text-xs uppercase cursor-pointer transition-all select-none"
                  >
                    Cancelar — Seguir en la app
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl ${
              isLight
                ? 'bg-[#eef1f7] border border-slate-300'
                : 'bg-[#121316] border border-zinc-700'
            }`}>
              {/* Header */}
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${
                isLight ? 'bg-amber-50 border-amber-200'
                : 'bg-amber-950/30 border-amber-800/40'
              }`}>
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className={`text-sm font-black uppercase tracking-wide ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    Sesión de caja activa
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-amber-500/80'}`}>
                    Hay una jornada en curso sin finalizar
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className={`px-5 py-4 space-y-2 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                <p>Si cierras ahora la caja quedará abierta. La próxima vez que inicies el sistema se te pedirá continuar o finalizar la sesión.</p>
                <p className={`text-[11px] font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>¿Qué deseas hacer?</p>
              </div>

              {/* Actions */}
              <div className={`px-5 pb-5 space-y-2`}>
                <button
                  onClick={() => {
                    setShowCloseWarning(false);
                    setCorteAfterAction('logout');
                    setIsCorteModalOpen(true);
                  }}
                  className={`w-full py-2.5 text-xs font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    isLight ? 'bg-amber-500 hover:bg-amber-600 text-white shadow'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  🏦 Cerrar Sesión / Hacer Corte de Caja
                </button>
                <button
                  onClick={() => { setShowCloseWarning(false); handleConfirmClose(); }}
                  className={`w-full py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    isLight ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-rose-900/30'
                  }`}
                >
                  ✕ Salir sin finalizar sesión
                </button>
                <button
                  onClick={() => setShowCloseWarning(false)}
                  className={`w-full py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    isLight ? 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Cancelar — Seguir en la app
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CUSTOM ALERT MODAL */}
      {customAlert && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fadeIn" />
          <div
            className={`relative z-10 w-full max-w-sm p-6 space-y-4 animate-scaleUp ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,0.4)] font-sans'
                : isLight
                  ? 'bg-slate-200/95 border border-slate-300 text-zinc-900 rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.3)] backdrop-blur-md'
                  : 'bg-[#121316]/95 border border-[#2a2b32] rounded-2xl shadow-2xl backdrop-blur-md text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <h4 className={`text-xs font-black uppercase tracking-widest font-mono ${
                isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900 font-extrabold' : 'text-amber-500'
              }`}>
                Aviso del Sistema
              </h4>
            </div>
            
            <p className={`text-xs leading-relaxed ${
              isRetro ? 'text-black' : isLight ? 'text-zinc-700' : 'text-zinc-300'
            }`}>
              {customAlert.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const resolve = customAlert.resolve;
                  setCustomAlert(null);
                  resolve();
                }}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer select-none active:scale-95 ${
                  isRetro
                    ? 'bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                    : isLight
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                }`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TELEGRAM NOTIFICATION TOASTS */}
      {telegramJobs.length > 0 && (
        <div style={{ position: 'fixed', bottom: activePrintJobs.length > 0 ? '80px' : '20px', right: '20px', zIndex: 999998, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {telegramJobs.map(job => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: isRetro ? '#cbd6e2' : isLight ? '#ffffff' : '#1e2130', border: isRetro ? '2px solid' : '1px solid', borderTopColor: isRetro ? '#ffffff' : 'transparent', borderLeftColor: isRetro ? '#ffffff' : 'transparent', borderRightColor: isRetro ? '#808080' : isLight ? '#e4e4e7' : '#2d3148', borderBottomColor: isRetro ? '#808080' : isLight ? '#e4e4e7' : '#2d3148', borderRadius: isRetro ? 0 : 12, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', minWidth: '220px', maxWidth: '300px' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>
                {job.status === 'sending' ? '📡' : job.status === 'ok' ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: isRetro ? '#031124' : isLight ? '#18181b' : '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.label}</div>
                <div style={{ fontSize: 10, color: isRetro ? '#555' : isLight ? '#71717a' : '#6b7280', marginTop: 2 }}>
                  {job.status === 'sending' ? 'Enviando a Telegram…' : job.status === 'ok' ? 'Notificación enviada' : 'Error al enviar'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WHATSAPP TICKET MODAL */}
      {whatsappModalData && (
        <Suspense fallback={null}>
          <WhatsappModal
            modalData={whatsappModalData}
            onClose={() => setWhatsappModalData(null)}
            config={config}
          />
        </Suspense>
      )}

    </div>
  );
}
