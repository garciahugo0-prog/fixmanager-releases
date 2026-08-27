/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, RefreshCw, Cpu, Award, Clock, Calendar, Scissors, Menu, Maximize2, Minimize2, Copy, Check, AlertTriangle, ShieldCheck, Loader2, WifiOff, Download, RotateCcw, ChevronLeft, ChevronRight, KeyRound, X, HandCoins, Headphones, Users, Smartphone } from 'lucide-react';
import { ActiveTab, WorkshopConfig, AppUser } from '../types';
import { supabase } from '../supabase';
import { SupportChatWidget } from './SupportChatWidget';
import { subscribeToNetworkStatus } from '../utils/networkStatus';

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─── TIPOS DE LICENCIA ────────────────────────────────────────────────────────
interface LicenseInfo {
  status: 'active' | 'trial' | 'expired' | 'invalid' | 'none';
  machineId: string;
  key?: string;
  type?: string;       // PRO | BASICA | VITALICIA
  expiry?: string;     // PERPETUA | AAAAMMDD
  ownerName?: string;
  activatedAt?: string;
  reason?: string;
}

interface UpdateInfo {
  hasUpdate: boolean;
  version?: string;
  notes?: string;
  dmgUrl?: string;
  currentVersion?: string;
  error?: string;
}

// Helper seguro para llamar a electronAPI (puede no estar disponible en dev)
const eAPI = () => (window as any).electronAPI ?? null;

interface TopbarProps {
  config: WorkshopConfig;
  activeTicketId: string;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedOrderId: (id: string | null) => void;
  onClearCache: () => void;
  ordersCount: number;
  ordersByStatus?: {
  pendiente: number;
  diagnostico: number;
  enReparacion: number;
  listo: number;
  entregado: number;
  cancelado: number;
};
  salesCount: number;
  setConfigSubTab?: (subtab: 'global' | 'printer' | 'users') => void;
  onOpenCorteCaja?: () => void;
  sessionId: number;
  onToggleMobileSidebar?: () => void;
  activeTab?: ActiveTab;
  onConfigBrandRedirect?: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onEntregaTurno?: () => void;
  ventasHoy?: number;
  ventasInusualesHoy?: number;
  lowStockCount?: number;
  stockAlertDismissed?: boolean;
  onDismissStockAlert?: () => void;
  onGoToStock?: () => void;
  ordenesVencidasCount?: number;
  ordenesVencidasDismissed?: boolean;
  onDismissOrdenesVencidas?: () => void;
  onGoToOrdenes?: () => void;
  lanStatus?: 'disconnected' | 'connecting' | 'connected';
  lanSyncBlocked?: boolean;
  terminalName?: string;
  licenseInfo?: LicenseInfo | null;
  licenseStatus?: 'checking' | 'active' | 'trial' | 'none' | 'invalid' | 'expired';
  isSendingPromos?: boolean;
  sendingCurrentIndex?: number;
  sendingTotal?: number;
}

const Cube3D = () => (
  <svg viewBox="0 0 100 100" className="w-5 h-5 inline-block shrink-0 select-none">
    {/* Isometric Cube Shaded Faces */}
    {/* Left Face - Coral/Red */}
    <polygon points="50,50 15,32 15,72 50,90" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
    {/* Right Face - Royal Blue */}
    <polygon points="50,50 85,32 85,72 50,90" fill="#1d4ed8" stroke="#173fa1" strokeWidth="1" />
    {/* Top Face - Green */}
    <polygon points="50,14 85,32 50,50 15,32" fill="#16a34a" stroke="#117e3a" strokeWidth="1" />
  </svg>
);

export default function Topbar({
  config,
  activeTicketId,
  setActiveTab,
  setSelectedOrderId,
  onClearCache,
  ordersCount,
  ordersByStatus,
  salesCount,
  setConfigSubTab,
  onOpenCorteCaja,
  sessionId,
  onToggleMobileSidebar,
  activeTab = 'POS',
  onConfigBrandRedirect,
  currentUser,
  onLogout,
  onEntregaTurno,
  ventasHoy = 0,
  ventasInusualesHoy = 0,
  lowStockCount = 0,
  stockAlertDismissed = false,
  onDismissStockAlert,
  onGoToStock,
  ordenesVencidasCount = 0,
  ordenesVencidasDismissed = false,
  onDismissOrdenesVencidas,
  onGoToOrdenes,
  lanStatus = 'disconnected',
  lanSyncBlocked = false,
  terminalName = 'Caja Principal',
  licenseInfo: licenseInfoProp = null,
  isSendingPromos = false,
  sendingCurrentIndex = 0,
  sendingTotal = 0,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState<string>('');
  const [systemDate, setSystemDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Sincronización en la nube feedback reactivo ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setIsSyncing(detail.syncing);
        if (!detail.syncing && detail.success) {
          setJustSynced(true);
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setJustSynced(false);
          }, 1500);
        }
      }
    };
    window.addEventListener('fixmanager_sync_status', handleSyncStatus);
    return () => {
      window.removeEventListener('fixmanager_sync_status', handleSyncStatus);
      clearTimeout(timeoutId);
    };
  }, []);

  // --- Estado de conexión a internet ---
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    return subscribeToNetworkStatus((online) => {
      setIsOnline(online);
    });
  }, []);

  // ─── MODALES centrados ─────────────────────────────────────────────────────
  const [showLicenseModal,  setShowLicenseModal]  = useState(false);
  // licenseInfo comes from App.tsx (kept in sync by recomprobarLicenciaOnline polling)
  const licenseInfo = licenseInfoProp;
  const [showUpdatesModal,  setShowUpdatesModal]  = useState(false);
  const [showUserDropdown,  setShowUserDropdown]  = useState(false);
  const isRetro = config.theme === 'retro-window';
  const isFluent = config.theme === 'fluent';
  const isLight = config.themeMode === 'light';
  const isWindows = (eAPI()?.platform ?? navigator.platform) === 'win32';

  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [waUnreadCount, setWaUnreadCount] = useState<number>(0);
  const [supportUnread, setSupportUnread] = useState<number>(0);

  useEffect(() => {
    const handleSupportUnread = (e: any) => {
      if (typeof e.detail === 'number') {
        setSupportUnread(e.detail);
      }
    };
    window.addEventListener('support-unread-count', handleSupportUnread);
    return () => window.removeEventListener('support-unread-count', handleSupportUnread);
  }, []);

  useEffect(() => {
    const api = eAPI();
    if (api && api.onWhatsappStatusChange) {
      api.whatsappGetStatus?.().then((res: any) => {
        if (res) {
          if (res.status) setWaStatus(res.status);
          setWaUnreadCount(res.unreadCount || 0);
          const isConnected = res.status === 'CONNECTED';
          (window as any).whatsappConnected = isConnected;
          (window as any).whatsappStatus = res.status || 'DISCONNECTED';
          window.dispatchEvent(new CustomEvent('whatsapp-status-update', { detail: isConnected }));
        }
      });
      const unsub = api.onWhatsappStatusChange((res: any) => {
        const status = typeof res === 'string' ? res : (res?.status || 'DISCONNECTED');
        setWaStatus(status);
        const isConnected = status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        (window as any).whatsappStatus = status;
        window.dispatchEvent(new CustomEvent('whatsapp-status-update', { detail: isConnected }));
      });
      let unsubCount: any;
      if (api.onWhatsappUnreadCount) {
        unsubCount = api.onWhatsappUnreadCount((count: number) => {
          setWaUnreadCount(count);
        });
      }
      return () => {
        if (typeof unsub === 'function') unsub();
        if (typeof unsubCount === 'function') unsubCount();
      };
    }
  }, []);

  const [isWaOpen, setIsWaOpen] = useState(false);
  const [isWaReloading, setIsWaReloading] = useState(false);
  const webviewNodeRef = useRef<any>(null);
  
  const handleReloadWa = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWaReloading(true);
    try {
      if (webviewNodeRef.current && typeof webviewNodeRef.current.reload === 'function') {
        webviewNodeRef.current.reload();
      }
    } catch (err) {}
    const eAPI = (window as any).electronAPI;
    if (eAPI?.whatsappReload) eAPI.whatsappReload();
    setTimeout(() => setIsWaReloading(false), 1200);
  };
  const webviewRef = useCallback((node: any) => {
    webviewNodeRef.current = node;
    if (node !== null) {
      const applyZoom = () => {
        try {
          node.setZoomFactor(1.0);
        } catch (e) {
          // Ignorar si el webcontents no está inicializado aún
        }
      };

      node.addEventListener('dom-ready', applyZoom);
      node.addEventListener('did-finish-load', applyZoom);
      node.addEventListener('console-message', (e: any) => {
        console.log(`[WhatsApp Webview Console] [L:${e.level}] ${e.message}`);
      });

      // Asegurar escala normal
      applyZoom();
      setTimeout(applyZoom, 500);
      setTimeout(applyZoom, 1000);
      setTimeout(applyZoom, 2000);
    }
  }, []);

  useEffect(() => {
    if (webviewNodeRef.current) {
      try {
        webviewNodeRef.current.setZoomFactor(1.0);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handleOpenWa = () => {
      setIsWaOpen(true);
    };
    window.addEventListener('open-whatsapp-chat', handleOpenWa);
    return () => window.removeEventListener('open-whatsapp-chat', handleOpenWa);
  }, []);

  const toggleWa = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWaOpen(prev => !prev);
  };

  // ─── LICENCIA ─────────────────────────────────────────────────────────────
  const [copiedMachineId, setCopiedMachineId] = useState(false);
  const [sbDeactivating, setSbDeactivating] = useState(false);
  const [sbDeactivateError, setSbDeactivateError] = useState<string | null>(null);

  const handleDeactivateDevice = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas cerrar sesión de tu licencia y desvincular este dispositivo?\n\nEsto desactivará FixManager en esta computadora, permitiéndote usar tu licencia en otra.')) {
      return;
    }
    setSbDeactivating(true);
    setSbDeactivateError(null);
    try {
      const api = eAPI();
      const currentMachineId = licenseInfo?.machineId;
      if (currentMachineId) {
        // Eliminar la activación en Supabase
        const { error } = await supabase
          .from('activations')
          .delete()
          .eq('machine_id', currentMachineId)
          .eq('app', 'fixmanager');
          
        if (error) {
          console.warn('Error al borrar activación remota:', error.message);
        }
      }
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut().catch(() => {});
      
      // Eliminar el archivo de activación local
      if (api?.activateLicense) {
        await api.activateLicense({ logout: true });
      }
      
      setShowLicenseModal(false);
      window.location.reload();
    } catch (err) {
      setSbDeactivateError('Error al desvincular el dispositivo: ' + (err as Error).message);
    } finally {
      setSbDeactivating(false);
    }
  };

  // Panel de renovación dentro del modal de licencia
  const [showRenewPanel, setShowRenewPanel]       = useState(false);
  const [renewMachineId, setRenewMachineId]       = useState('');
  const [renewSelectedPlan, setRenewSelectedPlan] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail]   = useState('');

  const parseExpiryToDate = (expiryStr: string): Date | null => {
    if (!expiryStr || expiryStr === 'PERPETUA') return null;
    if (typeof expiryStr === 'string' && expiryStr.length === 8 && /^\d{8}$/.test(expiryStr)) {
      const year = parseInt(expiryStr.slice(0, 4), 10);
      const month = parseInt(expiryStr.slice(4, 6), 10) - 1;
      const day = parseInt(expiryStr.slice(6, 8), 10);
      return new Date(year, month, day, 23, 59, 59);
    }
    const d = new Date(expiryStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getDaysLeft = (): number | null => {
    if (!licenseInfo || !licenseInfo.expiry || licenseInfo.expiry === 'PERPETUA' || licenseInfo.type === 'VITALICIA' || (licenseInfo as any).isVitalicia) return null;
    const expiryDate = parseExpiryToDate(licenseInfo.expiry as string);
    if (!expiryDate) return null;
    const diffTime = expiryDate.getTime() - Date.now();
    return Math.ceil(diffTime / 86400000);
  };

  const getLicenseRemainingText = (): string => {
    if (!licenseInfo) return '';
    if (licenseInfo.expiry === 'PERPETUA' || licenseInfo.type === 'VITALICIA' || (licenseInfo as any).isVitalicia) return ' (Vitalicia)';
    if (!licenseInfo.expiry) return '';
    const days = getDaysLeft();
    if (days === null) return '';
    if (days > 3650) return ' (Vitalicia)'; // fecha muy lejana → tratar como vitalicia
    if (days < 0) return ' (Vencida)';
    if (days === 0) return ' (Vence hoy)';
    return ` (Quedan ${days} ${days === 1 ? 'día' : 'días'})`;
  };

  // ─── ACTUALIZACIONES ───────────────────────────────────────────────────────
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState<string>(
    localStorage.getItem('fixmanager_app_version') || '1.0'
  );

  useEffect(() => {
    const api = eAPI();
    if (api?.getAppVersion) {
      api.getAppVersion().then((v: string) => { if (v) setCurrentAppVersion(v); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Error exiting fullscreen:', err);
        });
      }
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setSystemTime(
        date.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
      setSystemDate(
        date.toLocaleDateString('es-MX', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).replace(/\./g, '')
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTicketClick = () => {
    if (activeTicketId) {
      setSelectedOrderId(activeTicketId);
      setActiveTab('Órdenes');
    }
  };

  const handleMenuClick = (menu: string) => {
    if (menuOpen === menu) {
      setMenuOpen(null);
    } else {
      setMenuOpen(menu);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const closeAll = () => {
      setMenuOpen(null);
      setShowUserDropdown(false);
      setIsWaOpen(false);
      const api = eAPI();
      if (api && api.whatsappToggleWindow) {
        api.whatsappToggleWindow(false);
      }
    };
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  const handleConfigRedirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('Config');
    if (setConfigSubTab) setConfigSubTab('global');
    if (onConfigBrandRedirect) onConfigBrandRedirect();
  };

  const handleOpenLicenseModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(null);
    setShowLicenseModal(true);
    // licenseInfo is kept up-to-date via the App.tsx polling; no manual fetch needed.
  };

  const [downloadingHotUpdate, setDownloadingHotUpdate] = useState(false);
  const [hotUpdateProgress, setHotUpdateProgress] = useState(0);

  const handleOpenUpdatesModal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(null);
    setShowUpdatesModal(true);
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    setUpdateInfo(null);
    setDownloadingHotUpdate(false);
    const api = eAPI();
    if (api?.checkAppUpdate) {
      try {
        const result = await api.checkAppUpdate();
        if (result && result.hasUpdate) {
          setUpdateInfo({
            hasUpdate: true,
            version: result.latestVersion || result.version,
            currentVersion: result.currentVersion,
            notes: result.notes,
            dmgUrl: result.downloadUrl || result.dmgUrl
          });
        } else {
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: result?.currentVersion || currentAppVersion,
            error: result?.error
          });
        }
      } catch {
        setUpdateInfo({ hasUpdate: false, error: 'No se pudo conectar al servidor.' });
      }
    } else {
      await new Promise(r => setTimeout(r, 1200));
      setUpdateInfo({ hasUpdate: false, currentVersion: currentAppVersion });
    }
    setCheckingUpdates(false);
  };

  const handleCheckUpdates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    setUpdateInfo(null);
    setDownloadingHotUpdate(false);
    const api = eAPI();
    if (api?.checkAppUpdate) {
      try {
        const result = await api.checkAppUpdate();
        if (result && result.hasUpdate) {
          setUpdateInfo({
            hasUpdate: true,
            version: result.latestVersion || result.version,
            currentVersion: result.currentVersion,
            notes: result.notes,
            dmgUrl: result.downloadUrl || result.dmgUrl
          });
        } else {
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: result?.currentVersion || currentAppVersion,
            error: result?.error
          });
        }
      } catch {
        setUpdateInfo({ hasUpdate: false, error: 'No se pudo conectar al servidor.' });
      }
    } else {
      await new Promise(r => setTimeout(r, 1200));
      setUpdateInfo({ hasUpdate: false, currentVersion: currentAppVersion });
    }
    setCheckingUpdates(false);
  };

  const handleStartDirectUpdate = async () => {
    const api = eAPI();
    const targetUrl = updateInfo?.dmgUrl;
    if (!targetUrl) {
      alert('No hay enlace de descarga disponible para esta actualización.');
      return;
    }

    setDownloadingHotUpdate(true);
    setHotUpdateProgress(0);

    if (api?.onUpdateProgress) {
      api.onUpdateProgress((data: { percent: number }) => {
        if (data && typeof data.percent === 'number') {
          setHotUpdateProgress(Math.round(data.percent));
        }
      });
    }

    try {
      if (api?.downloadAndInstallUpdate) {
        const res = await api.downloadAndInstallUpdate(targetUrl);
        if (res && res.error) {
          throw new Error(res.error);
        }
      } else if (api?.openExternal) {
        api.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch (err: any) {
      console.warn('[Update Fallback] La descarga directa falló, abriendo en navegador:', err);
      setDownloadingHotUpdate(false);
      if (api?.openExternal) {
        api.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    }
  };

  const handleCopyMachineId = () => {
    const id = licenseInfo?.machineId;
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopiedMachineId(true);
      setTimeout(() => setCopiedMachineId(false), 2000);
    });
  };

  const handleOpenRenewPanel = async () => {
    setShowRenewPanel(true);
    const api = eAPI();
    if (api?.getMachineId) {
      const id = await api.getMachineId().catch(() => '');
      setRenewMachineId(id);
    } else {
      setRenewMachineId(licenseInfo?.machineId || '');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    } catch (err) {
      console.warn('Error fetching user email for renewal message:', err);
    }
  };

  const handleCancelRenew = () => {
    setShowRenewPanel(false);
    setRenewSelectedPlan(null);
  };

  const handleRenewWhatsApp = () => {
    const plan = renewSelectedPlan || '(no seleccionado)';
    const planLabels: Record<string, string> = { MENSUAL: '1 mes', ANUAL: '1 año', VITALICIA: 'Vitalicia (sin vencimiento)' };
    const msg = encodeURIComponent(
      `Hola Hugo! Quiero renovar/cambiar mi licencia de FIXMANAGER.\n\n` +
      `📋 DATOS DE MI CUENTA:\n` +
      `• Correo/Usuario: ${currentUserEmail || licenseInfo?.ownerName || 'No registrado'}\n` +
      `• Tipo actual: ${licenseInfo?.type || 'Desconocido'}\n` +
      `• Vencimiento: ${licenseInfo?.expiry === 'PERPETUA' || licenseInfo?.type === 'VITALICIA' || (licenseInfo as any)?.isVitalicia ? 'Sin vencimiento' : licenseInfo?.expiry || 'N/A'}\n\n` +
      `🆕 PLAN QUE QUIERO:\n` +
      `• ${planLabels[plan] ?? plan}\n\n` +
      `💻 MI MACHINE ID: ${renewMachineId}\n\n` +
      `Por favor, realiza la activación.`
    );
    const url = `https://wa.me/523511574876?text=${msg}`;
    const api = eAPI();
    if (api?.openExternal) api.openExternal(url);
    else window.open(url, '_blank');
  };

  // ── Planes disponibles para renovación (solo upgrades respecto al plan actual) ──
  const _allRenewPlans = [
    { id: 'MENSUAL',   label: '1 Mes',     sub: 'Licencia mensual renovable',  emoji: '📅' },
    { id: 'ANUAL',     label: '1 Año',     sub: 'Mejor precio por mes',        emoji: '📆' },
    { id: 'VITALICIA', label: 'Vitalicia', sub: 'Sin vencimiento, pago único', emoji: '♾'  },
  ];
  const currentLicType = licenseInfo?.type ?? '';
  const availableRenewPlans =
    currentLicType === 'MENSUAL'   ? _allRenewPlans.filter(p => p.id !== 'MENSUAL') :
    currentLicType === 'ANUAL'     ? _allRenewPlans.filter(p => p.id === 'VITALICIA') :
    currentLicType === 'VITALICIA' ? [] :
    _allRenewPlans; // PRO / BASICA / legado → todas

  return (
    <>
    <header className={`relative z-30 ${isRetro ? 'bg-[#cbd6e2] border-b border-zinc-350 text-zinc-800' : isFluent ? (isLight ? 'bg-[#fafafa]/90 backdrop-blur-xl border-b border-[#cbd5e1] text-zinc-800' : 'bg-[#2a2a2a]/95 backdrop-blur-xl border-b border-white/[0.06] text-zinc-200') : 'bg-[#09090b] border-b border-[#1a1b20] text-gray-300'} select-none shrink-0`} onClick={(e) => e.stopPropagation()}>
      {config.theme === 'retro-window' ? (
        <>
          {/* Tier 1: Windows Title Bar with Deep Blue / Dark Blue Gradient matching Cubi POS */}
          <div className={`text-white px-3 py-1.5 flex flex-col md:grid md:grid-cols-3 items-center justify-between border-b border-zinc-950 shadow-md gap-2 md:gap-0 bg-gradient-to-r ${isLight ? 'from-[#0c66e4] via-[#0052cc] to-[#091e42]' : 'from-[#142340] via-[#101b33] to-[#080d1a]'}`}>
            {/* Left Column: Clickable logo, store name & slogan in retro theme */}
            <div className="flex items-center gap-2 justify-self-start w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                {onToggleMobileSidebar && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMobileSidebar();
                    }}
                    className="p-2 rounded md:hidden focus:outline-none transition-all active:scale-95 cursor-pointer bg-[#dfe4ea] hover:bg-zinc-200 border-2 border-l-white border-t-white border-r-zinc-600 border-b-zinc-600 text-zinc-800 shadow-sm font-sans flex items-center justify-center gap-1 active:border-r-white active:border-b-white active:border-l-zinc-600 active:border-t-zinc-600"
                    title="Abrir menú de navegación"
                  >
                    <Menu className="w-4 h-4 text-current shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Menú</span>
                  </button>
                )}
                
                <div 
                  onClick={handleConfigRedirect}
                  className="flex items-center gap-3 select-none shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Ajuste rápido: Configurar Logo, Nombre o Lema"
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center font-black overflow-hidden select-none shrink-0 ${
                    isRetro 
                      ? `rounded-xl border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white ${isLight ? 'bg-white' : 'bg-blue-950/80'}` 
                      : 'rounded-xl bg-white border-2 border-blue-600 shadow-md'
                  }`}>
                    {config.logoUrl && (config.logoUrl.startsWith('data:') || config.logoUrl.startsWith('http')) ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover logo-highres" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[#0c66e4] text-[9.5px] font-black tracking-tighter leading-none text-center">📥 LOGO</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <h1 className="text-base md:text-lg font-black tracking-wider text-white uppercase font-sans">
                      {config.storeName || '[CLICK PARA DEFINIR NOMBRE]'}
                    </h1>
                    <p className="text-[10.5px] md:text-[11.5px] text-[#cbd6e2] font-mono tracking-wide leading-normal select-none uppercase font-bold mt-0.5">
                      {config.slogan || '[CLICK PARA DEFINIR LEMA]'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Un-abbreviated pill status markers centered */}
            <div className="flex items-center justify-center gap-1.5 justify-self-center">
              <button
                type="button"
                onClick={() => setActiveTab('Clientes')}
                className={`px-2.5 py-1 border rounded text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm relative overflow-hidden ${
                  activeTab === 'Clientes'
                    ? (isLight ? 'bg-purple-600 border-purple-700 text-white shadow-inner' : 'bg-purple-900 border-purple-800 text-white shadow-inner')
                    : 'bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-200'
                }`}
                title={isSendingPromos ? `Campaña en curso: ${sendingCurrentIndex} de ${sendingTotal}` : "Directorio de Clientes y Envíos Masivos"}
              >
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>CLIENTES{isSendingPromos && sendingTotal > 0 && ` (${Math.round((sendingCurrentIndex / sendingTotal) * 100)}%)`}</span>
                {isSendingPromos && sendingTotal > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(sendingCurrentIndex / sendingTotal) * 100}%` }}
                  />
                )}
              </button>
              {config.taecelEnabled === true && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Recargas')}
                  className={`px-2.5 py-1 border rounded text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm ${
                    activeTab === 'Recargas'
                      ? (isLight ? 'bg-cyan-600 border-cyan-700 text-white shadow-inner' : 'bg-cyan-900 border-cyan-800 text-white shadow-inner')
                      : 'bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200'
                  }`}
                  title="Venta de Recargas Telefónicas y Pago de Servicios"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>RECARGAS</span>
                </button>
              )}
              {config.enableTaller !== false && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === 'ordenes' ? null : 'ordenes'); }}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 rounded text-[10.5px] font-black text-amber-200 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm"
                    title="Ver desglose de Órdenes de Servicio"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-pulse"></span>
                    <span>ÓRDENES: {ordersCount}</span>
                  </button>
                  {menuOpen === 'ordenes' && ordersByStatus && (
                    <div className="absolute left-0 top-full mt-1 w-52 bg-[#000080] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-xl z-50 p-2 text-white text-[10px] font-mono" onClick={(e) => e.stopPropagation()}>
                      <div className="font-black text-[10px] uppercase mb-1.5 border-b border-white/20 pb-1">📋 Desglose de Órdenes</div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>🟡 Pendiente</span><span className="font-black">{ordersByStatus.pendiente}</span></div>
                        <div className="flex justify-between"><span>🔵 Diagnóstico</span><span className="font-black">{ordersByStatus.diagnostico}</span></div>
                        <div className="flex justify-between"><span>🔧 En Reparación</span><span className="font-black">{ordersByStatus.enReparacion}</span></div>
                        <div className="flex justify-between"><span>✅ Listo</span><span className="font-black">{ordersByStatus.listo}</span></div>
                        <div className="flex justify-between"><span>📦 Entregado</span><span className="font-black">{ordersByStatus.entregado}</span></div>
                        <div className="flex justify-between"><span>❌ Cancelado</span><span className="font-black">{ordersByStatus.cancelado}</span></div>
                      </div>
                      <button
                        onClick={() => { setActiveTab('Órdenes'); setMenuOpen(null); }}
                        className="w-full mt-2 py-1 bg-white text-[#000080] font-black text-[9px] uppercase cursor-pointer"
                      >
                        Ver todas las órdenes →
                      </button>
                    </div>
                  )}
                </div>
              )}
              {config.enablePOS !== false && (
                <button
                  onClick={() => setActiveTab('Ventas')}
                  className="px-2.5 py-1 bg-[#10b981]/25 hover:bg-[#10b981]/35 border border-[#34d399]/40 rounded text-[10.5px] font-black text-[#a7f3d0] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm"
                  title="Ver Historial de Ventas POS"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span>
                  <span>VENTAS: {salesCount}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('Cortes')}
                className="px-2.5 py-1 bg-pink-500/15 hover:bg-pink-500/30 border border-pink-400/30 rounded text-[10.5px] font-black text-pink-200 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm"
                title="Ver Historial de Cortes de Caja"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-pink-450 animate-pulse"></span>
                <span>CORTE DE CAJA: #{sessionId}</span>
              </button>
            </div>

            {/* Right Column: Realizar Corte + Usuario */}
            <div className="flex items-center justify-end justify-self-end gap-2">
              {/* Barra de meta — retro — solo empleados */}
              {config.enablePOS !== false && currentUser && currentUser.role === 'employee' && (config.metaDiariaVentas ?? 0) > 0 && (() => {
                const meta = config.metaDiariaVentas!;
                const pct = Math.min(100, Math.round((ventasHoy / meta) * 100));
                const sym = config.currencySymbol || '$';
                return (
                  <div className="flex flex-col items-end gap-0.5 shrink-0 bg-[#d4d0c8] border border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 px-2 py-1">
                    <span className="text-[8px] font-black font-mono text-zinc-700">{pct >= 100 ? '🎯 META CUMPLIDA' : `META: ${pct}% · ${sym}${ventasHoy.toFixed(0)}/${sym}${meta.toFixed(0)}`}</span>
                    <div className="w-24 h-2 bg-zinc-400 border border-t-zinc-600 border-l-zinc-600 border-b-white border-r-white">
                      <div className={`h-full ${pct >= 100 ? 'bg-green-600' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
              {currentUser && currentUser.role === 'employee' && onEntregaTurno && (
                <button
                  type="button"
                  onClick={onEntregaTurno}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-sans font-black rounded border border-emerald-700 shadow-md transition-all active:scale-95 select-none cursor-pointer text-[11px] uppercase tracking-wider"
                  title="Contar y entregar el efectivo de tu turno"
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>Entregar Turno</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleFullScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dfdfdf] hover:bg-zinc-200 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800 font-sans font-bold shadow-sm transition-all active:scale-95 select-none cursor-pointer text-[11px] uppercase active:border-t-zinc-600 active:border-l-zinc-600 active:border-b-white active:border-r-white shrink-0"
                title={isFullscreen ? "Salir de pantalla completa" : "Maximizar a pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{isFullscreen ? "Ventana" : "Pantalla Completa"}</span>
              </button>

              {onOpenCorteCaja && (
                <button
                  type="button"
                  onClick={onOpenCorteCaja}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-sans font-black rounded border border-rose-700 shadow-md transition-all active:scale-95 select-none cursor-pointer text-[11px] uppercase tracking-wider font-extrabold"
                  title="Abrir formulario y realizar corte de caja hoy"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Realizar Corte</span>
                </button>
              )}
              {/* User dropdown — retro */}
              {currentUser && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setShowUserDropdown(v => !v); }}
                    className="flex items-center gap-1 px-2 py-1 bg-[#dfdfdf] hover:bg-zinc-200 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-[11px] font-sans font-bold cursor-pointer active:border-t-zinc-600 active:border-l-zinc-600 active:border-b-white active:border-r-white"
                    title="Ver opciones de usuario y cambiar de sesión"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#000080] flex items-center justify-center font-black text-white text-[10px] shrink-0">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[80px] truncate text-zinc-900">{currentUser.name}</span>
                    <span className={`text-[9px] font-black uppercase px-1 py-0.5 border shrink-0 ${currentUser.role === 'admin' ? 'bg-amber-100 text-amber-800 border-amber-400' : 'bg-zinc-200 text-zinc-700 border-zinc-400'}`}>
                      {currentUser.role === 'admin' ? 'Admin' : 'Emp.'}
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0 transition-transform text-zinc-700" style={{ transform: showUserDropdown ? 'rotate(90deg)' : 'none' }} />
                  </button>
                  {showUserDropdown && (
                    <div onClick={e => e.stopPropagation()} className="absolute right-0 top-full mt-1 w-48 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 shadow-lg z-50" style={{ color: '#000000' }}>
                      <div className="modal-dark-header px-3 py-2 border-b border-zinc-400 bg-[#000080]">
                        <p className="text-[11px] font-black text-white truncate">{currentUser.name}</p>
                        <p className="text-[9px] text-blue-200">{currentUser.role === 'admin' ? '👑 Administrador' : '👤 Empleado'}</p>
                      </div>
                      <div className="py-1">
                        {isWindows && (
                          <button
                            type="button"
                            onClick={() => { toggleFullScreen(); setShowUserDropdown(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold cursor-pointer font-sans"
                            title={isFullscreen ? "Salir del modo pantalla completa" : "Entrar al modo pantalla completa"}
                            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.setProperty('background','#000080'); b.style.setProperty('color','#ffffff','important'); }}
                            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.setProperty('background',''); b.style.setProperty('color','#000000','important'); }}
                          >
                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            {isFullscreen ? 'Ventana normal' : 'Pantalla completa'}
                          </button>
                        )}
                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => { onLogout(); setShowUserDropdown(false); }}
                            style={{ color: '#b91c1c' }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold cursor-pointer font-sans border-t border-zinc-400 mt-1"
                            title="Cerrar la sesión del usuario actual"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor='#dc2626'; (e.currentTarget as HTMLButtonElement).style.color='#ffffff'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor=''; (e.currentTarget as HTMLButtonElement).style.color='#b91c1c'; }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Cambiar usuario
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tier 2: Gray Windows Toolbar style Menu Bar */}
          <div className="bg-[#dfe4ea] border-b border-zinc-350 px-3 py-1 text-xs text-zinc-700 flex flex-row items-center justify-between relative select-none shadow-sm gap-4 overflow-x-auto whitespace-nowrap min-h-[34px]">
            {/* Main Menus */}
            <div className="flex items-center gap-2">
              {/* LICENCIA — retro */}

              <button
                type="button"
                onClick={handleOpenLicenseModal}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-bold border flex items-center gap-1 border-transparent hover:bg-zinc-200 ${licenseInfo && licenseInfo.status !== 'active' && licenseInfo.status !== 'trial' ? 'text-amber-700' : 'text-zinc-800'}`}
                title="Ver detalles de tu licencia Fixmanager"
              >
                <Award className="w-3 h-3" />
                Licencia{getLicenseRemainingText()}
              </button>

              {/* ACTUALIZACIONES — retro */}
              <button
                type="button"
                onClick={handleOpenUpdatesModal}
                className="px-2 py-0.5 rounded cursor-pointer transition-colors text-zinc-800 font-bold border border-transparent hover:bg-zinc-200 flex items-center gap-1"
                title="Comprobar si hay actualizaciones disponibles en el servidor"
              >
                {checkingUpdates ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Actualizaciones
              </button>
              <span className="text-[9.5px] text-zinc-600 font-mono bg-zinc-300/60 px-1.5 py-0.5 border border-zinc-350 select-text cursor-default rounded shrink-0">
                v{currentAppVersion}
              </span>
              <div className="relative inline-block">
                <button
                  data-support-toggle="true"
                  type="button"
                  onClick={() => {
                    setSupportUnread(0);
                    window.dispatchEvent(new CustomEvent('toggle-support-chat'));
                  }}
                  className="text-[9.5px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-1.5 py-0.5 border border-indigo-300 rounded cursor-pointer transition-colors flex items-center gap-1 shrink-0 relative"
                  title="Chat de Soporte Técnico en Vivo"
                >
                  <Headphones className="w-3 h-3 text-indigo-600 animate-pulse" />
                  <span>Soporte</span>
                  {supportUnread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </button>
                <SupportChatWidget config={config} currentUser={currentUser} appVersion={currentAppVersion} />
              </div>
            </div>

            {/* Center: alertas */}
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              {lowStockCount > 0 && !stockAlertDismissed && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-300 rounded-full">
                  <span className="text-[11px]">⚠️</span>
                  <button onClick={onGoToStock} className="text-[10px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer whitespace-nowrap" title="Ir al Almacén/Inventario para ver stock crítico">
                    {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo
                  </button>
                  <button onClick={onDismissStockAlert} className="text-amber-400 hover:text-amber-700 cursor-pointer text-[10px] font-black ml-0.5" title="Descartar esta alerta de stock">✕</button>
                </div>
              )}
              {ordenesVencidasCount > 0 && !ordenesVencidasDismissed && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-zinc-300 rounded-full">
                  <span className="text-[11px]">🕐</span>
                  <button onClick={onGoToOrdenes} className="text-[10px] font-bold text-zinc-700 hover:text-zinc-900 cursor-pointer whitespace-nowrap" title="Ir a Órdenes para atender registros vencidos">
                    {ordenesVencidasCount} orden{ordenesVencidasCount > 1 ? 'es' : ''} vencida{ordenesVencidasCount > 1 ? 's' : ''}
                  </button>
                  <button onClick={onDismissOrdenesVencidas} className="text-zinc-400 hover:text-zinc-700 cursor-pointer text-[10px] font-black ml-0.5" title="Descartar esta alerta de vencimiento">✕</button>
                </div>
              )}
            </div>

            {/* Date & Time right section */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center font-sans">
              <div className="text-[10px] font-mono text-zinc-600 hidden md:flex items-center gap-2 select-none">
                {licenseInfo?.status === 'active' || licenseInfo?.status === 'trial' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLicenseModal(true)}
                      title="Ver detalles de tu licencia"
                      className="hover:text-zinc-800 transition-colors cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px] flex items-center gap-1 text-zinc-600"
                    >
                      <span>Licencia:</span>
                      <span className="text-emerald-600 font-bold">{licenseInfo.type}{licenseInfo.ownerName ? ` — ${licenseInfo.ownerName}` : ''}</span>
                    </button>
                    <span className="text-zinc-400 font-mono select-none">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true') {
                          (window as any).triggerCloudSync?.();
                        } else {
                          setShowLicenseModal(true);
                        }
                      }}
                      title={localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? "Sincronizar ahora con la nube" : "Ver detalles de la sincronización"}
                      className="flex items-center gap-1.5 hover:text-zinc-800 transition-colors cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px]"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isSyncing
                          ? 'bg-emerald-400 animate-spin border border-emerald-500 border-t-transparent'
                          : localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true'
                            ? isOnline
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-rose-500 animate-pulse border border-rose-600'
                            : 'bg-zinc-400'
                      }`} />
                      <span className={`text-[10px] font-mono ${
                        isSyncing || localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true'
                          ? isOnline
                            ? 'text-emerald-600 font-bold'
                            : 'text-rose-500 font-bold'
                          : 'text-zinc-500'
                      }`}>
                        Sync {isSyncing ? 'Sincronizando...' : localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? (isOnline ? 'Activa' : 'Sin Internet') : 'Inactiva'}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLicenseModal(true)}
                    title="Ver detalles de tu licencia"
                    className="text-amber-600 font-bold flex items-center gap-1 cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px]"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" /> Sin licencia activa
                  </button>
                )}
              </div>
              <span className="text-zinc-400 font-mono text-[11px] hidden md:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-zinc-100 border border-zinc-300 text-zinc-600 rounded text-[10px] font-mono font-bold select-none leading-none">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span className="capitalize">{systemDate}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#eaeef3] border border-zinc-300 text-zinc-600 rounded font-mono text-[10px] font-bold select-none leading-none">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{systemTime}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Row 1: Brand + Status pills + Action buttons — mirrors retro Tier 1 */}
          <div className={`flex flex-col md:grid md:grid-cols-3 md:items-center px-3 py-2 border-b gap-2 md:gap-0 ${isFluent ? (isLight ? 'bg-[#fafafa]/80 border-[#cbd5e1]' : 'bg-[#2a2a2a] border-white/[0.06]') : 'bg-[#0d0f14] border-[#1a1b20]'}`}>

            {/* Left: Logo + Name + Slogan */}
            <div className="flex items-center gap-2 justify-self-start">
              {onToggleMobileSidebar && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleMobileSidebar(); }}
                  className="p-1.5 rounded-lg md:hidden focus:outline-none transition-all active:scale-95 cursor-pointer border bg-[#1b1c21] hover:bg-[#25262c] text-zinc-100 border-[#2d2f36]"
                  title="Abrir menú de navegación"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-all active:scale-[0.98]"
                onClick={handleConfigRedirect}
                title="Ajuste rápido: Configurar Logo, Nombre o Lema"
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center font-bold text-white relative overflow-hidden group shrink-0 ${
                  isRetro
                    ? `rounded-xl border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white ${isLight ? 'bg-white' : 'bg-blue-950/80'}`
                    : isFluent
                      ? (isLight ? 'bg-zinc-200 border-zinc-300 shadow-sm' : 'bg-[#333] border-white/10 shadow-sm')
                      : 'bg-[#181a1f] border-[#2d2f36] shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 to-red-950/20 opacity-40" />
                  {config.logoUrl && (config.logoUrl.startsWith('data:') || config.logoUrl.startsWith('http')) ? (
                    <img src={config.logoUrl} alt="Logo del negocio" className="w-full h-full object-cover transition-transform group-hover:scale-110 logo-highres" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] text-[#00d2ff] font-sans font-black flex flex-col items-center leading-none text-center p-0.5 select-none animate-pulse">📥<span>LOGO</span></span>
                  )}
                </div>
                <div className="leading-tight">
                  <h1 className={`text-base md:text-lg font-display font-black tracking-wider uppercase leading-tight ${isFluent ? (isLight ? 'text-zinc-800' : 'text-white') : 'text-white'}`}>
                    {config.storeName || '[DEFINIR NOMBRE EN AJUSTES]'}
                  </h1>
                  <p className={`text-[11px] font-mono tracking-wide uppercase font-bold leading-normal mt-0.5 truncate max-w-[260px] ${isFluent ? (isLight ? 'text-blue-600' : 'text-[#60cdff]') : 'text-[#f59e0b]'}`}>
                    {config.slogan || '[DEFINIR LEMA EN AJUSTES]'}
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Status pills */}
            <div className="flex items-center justify-center gap-1.5 justify-self-center">
              {localStorage.getItem('selected_local_server_host') ? (
                <div
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 shrink-0 border ${
                    lanStatus === 'connected'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : lanStatus === 'connecting'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-red-500/15 border-red-500/30 text-red-300'
                  }`}
                  title={`Estado de enlace con Caja Principal: ${terminalName}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    lanStatus === 'connected' ? 'bg-emerald-400' : lanStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-500 animate-pulse'
                  }`}></span>
                  <span>{terminalName.toUpperCase()}: {lanStatus === 'connected' ? 'OK' : lanStatus === 'connecting' ? 'CONECTANDO...' : 'SIN CONEXIÓN'}</span>
                </div>
              ) : (
                localStorage.getItem('fixmanager_lan_server_active') === 'true' && (
                  <div className="px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 shrink-0 bg-blue-500/15 border border-blue-500/30 text-blue-300" title="Actuando como Servidor Principal LAN">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    <span>PRINCIPAL (LAN)</span>
                  </div>
                )
              )}
              <button
                type="button"
                onClick={() => setActiveTab('Clientes')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 relative overflow-hidden ${
                  activeTab === 'Clientes'
                    ? (isLight ? 'bg-purple-600 border-purple-700 text-white shadow-inner' : 'bg-purple-950 border-purple-900 text-white shadow-inner')
                    : (isFluent ? 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300' : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300')
                }`}
                title={isSendingPromos ? `Campaña en curso: ${sendingCurrentIndex} de ${sendingTotal}` : "Directorio de Clientes y Envíos Masivos"}
              >
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>CLIENTES{isSendingPromos && sendingTotal > 0 && ` (${Math.round((sendingCurrentIndex / sendingTotal) * 100)}%)`}</span>
                {isSendingPromos && sendingTotal > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(sendingCurrentIndex / sendingTotal) * 100}%` }}
                  />
                )}
              </button>
              {config.taecelEnabled === true && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Recargas')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${
                    activeTab === 'Recargas'
                      ? (isLight ? 'bg-cyan-600 border-cyan-700 text-white shadow-inner' : 'bg-cyan-950 border-cyan-900 text-white shadow-inner')
                      : (isFluent ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300')
                  }`}
                  title="Venta de Recargas Telefónicas y Pago de Servicios"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-450 shrink-0" />
                  <span>RECARGAS</span>
                </button>
              )}
              {config.enableTaller !== false && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Órdenes')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${isFluent ? 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300' : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300'}`}
                  title="Ver Listado de Órdenes de Servicio"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>ÓRDENES: {ordersCount}</span>
                </button>
              )}
              {config.enablePOS !== false && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Ventas')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${isFluent ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300'}`}
                  title="Ver Historial de Ventas POS"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>VENTAS: {salesCount}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('Cortes')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${isFluent ? 'bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 text-pink-300' : 'bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300'}`}
                title="Ver Historial de Cortes de Caja"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse"></span>
                <span>CORTE DE CAJA: #{sessionId}</span>
              </button>
            </div>

            {/* Right: Fullscreen + CorteCaja + Settings */}
            <div className="flex items-center justify-end justify-self-end gap-2">
              {/* Badge ventas inusuales — solo admin */}
              {config.enablePOS !== false && currentUser?.role === 'admin' && ventasInusualesHoy > 0 && (
                <button
                  onClick={() => { setActiveTab('Config'); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-[11px] font-black cursor-pointer hover:bg-yellow-500/20 transition-all animate-pulse"
                  title="Hay ventas inusuales hoy — ver en Config → Auditoría"
                >
                  ⚠️ {ventasInusualesHoy} venta{ventasInusualesHoy > 1 ? 's' : ''} inusual{ventasInusualesHoy > 1 ? 'es' : ''}
                </button>
              )}
              {/* Barra de meta diaria — solo empleados cuando hay meta configurada */}
              {config.enablePOS !== false && currentUser && currentUser.role === 'employee' && (config.metaDiariaVentas ?? 0) > 0 && (() => {
                const meta = config.metaDiariaVentas!;
                const pct = Math.min(100, Math.round((ventasHoy / meta) * 100));
                const color = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                const sym = config.currencySymbol || '$';
                return (
                  <div className="flex flex-col items-end gap-0.5 shrink-0" title={`Meta: ${sym}${meta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Vendido: ${sym}${ventasHoy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black font-mono ${pct >= 100 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {pct >= 100 ? '🎯 Meta!' : `${pct}%`}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">{sym}{ventasHoy.toFixed(0)}/{sym}{meta.toFixed(0)}</span>
                    </div>
                    <div className="w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
              {currentUser && currentUser.role === 'employee' && onEntregaTurno && (
                <button
                  type="button"
                  onClick={onEntregaTurno}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all active:scale-95 cursor-pointer uppercase font-black tracking-wide"
                  title="Contar y entregar el efectivo de tu turno"
                >
                  <HandCoins className="w-4 h-4 shrink-0" />
                  <span className="text-[11px]">Entregar Turno</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleFullScreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-sans font-bold rounded-md text-[11px] uppercase tracking-wide transition-all border cursor-pointer active:scale-95 shrink-0 ${
                  isFluent 
                    ? 'bg-white/[0.08] hover:bg-white/[0.12] border-white/[0.08] text-zinc-250' 
                    : 'bg-zinc-800/60 hover:bg-zinc-700/60 border-zinc-700/50 text-zinc-300'
                }`}
                title={isFullscreen ? "Salir de pantalla completa" : "Maximizar a pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{isFullscreen ? "Ventana" : "Pantalla Completa"}</span>
              </button>

              {onOpenCorteCaja && (
                <button
                  type="button"
                  onClick={onOpenCorteCaja}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-sans font-black rounded-md text-[11px] uppercase tracking-wide transition-all border cursor-pointer active:scale-95 shrink-0 ${isFluent ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400' : 'bg-pink-500 hover:bg-pink-600 text-black hover:text-white border-pink-500/30'}`}
                  title="Abrir formulario y conteo físico de caja"
                >
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <span>Realizar Corte</span>
                </button>
              )}
              {/* User dropdown */}
              {currentUser && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setShowUserDropdown(v => !v); }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors ${isFluent ? (isLight ? 'bg-zinc-200/60 hover:bg-zinc-200 border border-zinc-300 text-zinc-800' : 'bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-200') : 'bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300'}`}
                    title="Ver opciones de usuario y cambiar de sesión"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-[10px] shrink-0 ${isFluent ? 'bg-[#0078d4]' : 'bg-zinc-700'}`}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold max-w-[80px] truncate">{currentUser.name}</span>
                    <span className={`text-[9px] font-black uppercase px-1 py-0.5 rounded shrink-0 ${currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/40'}`}>
                      {currentUser.role === 'admin' ? 'Admin' : 'Emp.'}
                    </span>
                    <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${showUserDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  {showUserDropdown && (
                    <div onClick={e => e.stopPropagation()} className={`absolute right-0 top-full mt-1.5 w-48 rounded-lg border shadow-xl z-50 overflow-hidden ${isFluent ? (isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#2a2a2a] border-white/[0.1] text-zinc-200') : 'bg-zinc-900 border-zinc-700'}`}>
                      <div className={`px-3 py-2 border-b ${isFluent ? (isLight ? 'border-zinc-200' : 'border-white/[0.06]') : 'border-zinc-800'}`}>
                        <p className="text-[11px] font-black text-zinc-200 truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-500">{currentUser.role === 'admin' ? '👑 Administrador' : '👤 Empleado'}</p>
                      </div>
                      <div className="py-1">
                        {isWindows && (
                          <button
                            type="button"
                            onClick={() => { toggleFullScreen(); setShowUserDropdown(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold hover:bg-zinc-100 cursor-pointer transition-colors ${isFluent ? (isLight ? 'text-zinc-700 hover:bg-zinc-100' : 'text-zinc-100 hover:bg-white/10') : 'text-white'}`}
                            title={isFullscreen ? "Salir del modo pantalla completa" : "Entrar al modo pantalla completa"}
                          >
                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            {isFullscreen ? 'Ventana normal' : 'Pantalla completa'}
                          </button>
                        )}
                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => { onLogout(); setShowUserDropdown(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 cursor-pointer transition-colors border-t border-zinc-700 mt-1"
                            title="Cerrar la sesión del usuario actual"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Cambiar usuario
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Menus + License + Date/Time — mirrors retro Tier 2 */}
          <div className={`flex items-center justify-between px-4 py-1.5 text-xs border-b relative ${isFluent ? (isLight ? 'bg-[#fafafa]/90 border-[#cbd5e1]' : 'bg-[#222]/90 border-white/[0.05]') : 'bg-[#0b0c0f] border-[#16171a]'}`}>
            <div className="flex items-center gap-4">
              {/* LICENCIA — moderno */}
              <button
                type="button"
                onClick={handleOpenLicenseModal}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-medium flex items-center gap-1 ${licenseInfo && licenseInfo.status !== 'active' && licenseInfo.status !== 'trial' ? 'text-amber-400 hover:text-amber-300' : (isFluent ? (isLight ? 'text-zinc-650 hover:text-zinc-800' : 'text-zinc-500 hover:text-zinc-350') : 'text-gray-400 hover:text-white')}`}
                title="Ver detalles de tu licencia Fixmanager"
              >
                <Award className="w-3 h-3" />
                Licencia{getLicenseRemainingText()}
              </button>

              {/* ACTUALIZACIONES — moderno */}
              <button
                type="button"
                onClick={handleOpenUpdatesModal}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-medium flex items-center gap-1 ${isFluent ? (isLight ? 'text-zinc-650 hover:text-zinc-800' : 'text-zinc-500 hover:text-zinc-350') : 'text-gray-400 hover:text-white'}`}
                title="Comprobar si hay actualizaciones disponibles en el servidor"
              >
                {checkingUpdates ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Actualizaciones
              </button>
              <span className={`text-[9.5px] font-mono select-text cursor-default px-1.5 py-0.5 rounded shrink-0 ${isFluent ? (isLight ? 'text-zinc-600 bg-zinc-100 border border-zinc-200' : 'text-zinc-550 bg-white/5 border border-white/5') : 'text-zinc-500 bg-zinc-950/40 border border-zinc-850'}`}>
                v{currentAppVersion}
              </span>
              <div className="relative inline-block">
                <button
                  data-support-toggle="true"
                  type="button"
                  onClick={() => {
                    setSupportUnread(0);
                    window.dispatchEvent(new CustomEvent('toggle-support-chat'));
                  }}
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 shrink-0 relative ${
                    isFluent
                      ? isLight
                        ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                        : 'text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50'
                      : 'text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50'
                  }`}
                  title="Chat de Soporte Técnico en Vivo"
                >
                  <Headphones className="w-3 h-3 text-indigo-400 animate-pulse" />
                  <span>Soporte</span>
                  {supportUnread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </button>
                <SupportChatWidget config={config} currentUser={currentUser} appVersion={currentAppVersion} />
              </div>
            </div>
            {/* Center: alertas */}
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              {lowStockCount > 0 && !stockAlertDismissed && (
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${isFluent ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-950/50 border-amber-600/40'}`}>
                  <span className="text-[11px]">⚠️</span>
                  <button onClick={onGoToStock} className="text-[10px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap" title="Ir al Almacén/Inventario para ver stock crítico">
                    {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo
                  </button>
                  <button onClick={onDismissStockAlert} className="text-amber-600 hover:text-amber-400 cursor-pointer text-[10px] font-black ml-0.5" title="Descartar esta alerta de stock">✕</button>
                </div>
              )}
              {ordenesVencidasCount > 0 && !ordenesVencidasDismissed && (
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${isFluent ? 'bg-zinc-700/40 border-zinc-600/40' : 'bg-zinc-800/60 border-zinc-700/50'}`}>
                  <span className="text-[11px]">🕐</span>
                  <button onClick={onGoToOrdenes} className="text-[10px] font-bold text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap" title="Ir a Órdenes para atender registros vencidos">
                    {ordenesVencidasCount} orden{ordenesVencidasCount > 1 ? 'es' : ''} vencida{ordenesVencidasCount > 1 ? 's' : ''}
                  </button>
                  <button onClick={onDismissOrdenesVencidas} className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-[10px] font-black ml-0.5" title="Descartar esta alerta de vencimiento">✕</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] font-mono text-gray-500 hidden md:flex items-center gap-2 select-none">
                {licenseInfo?.status === 'active' || licenseInfo?.status === 'trial' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLicenseModal(true)}
                      title="Ver detalles de tu licencia"
                      className="hover:text-zinc-300 transition-colors cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px] flex items-center gap-1 text-gray-500"
                    >
                      <span>Licencia:</span>
                      <span className="text-emerald-400 font-bold">{licenseInfo.type}{licenseInfo.ownerName ? ` — ${licenseInfo.ownerName}` : ''}</span>
                    </button>
                    <span className="text-[#3b3d4a] font-mono select-none">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true') {
                          (window as any).triggerCloudSync?.();
                        } else {
                          setShowLicenseModal(true);
                        }
                      }}
                      title={localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? "Sincronizar ahora con la nube" : "Ver detalles de la sincronización"}
                      className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px]"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isSyncing
                          ? 'bg-emerald-400 animate-spin border border-emerald-500 border-t-transparent'
                          : localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true'
                            ? isOnline
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-rose-500 animate-pulse border border-rose-600'
                            : 'bg-zinc-600'
                      }`} />
                      <span className={`text-[10px] font-mono ${
                        isSyncing || localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true'
                          ? isOnline
                            ? (isLight ? 'text-emerald-700 font-extrabold' : 'text-emerald-400 font-bold')
                            : (isLight ? 'text-rose-700 font-extrabold' : 'text-rose-450 font-bold')
                          : (isLight ? 'text-zinc-600 font-bold' : 'text-zinc-500')
                      }`}>
                        Sync {isSyncing ? 'Sincronizando...' : localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? (isOnline ? 'Activa' : 'Sin Internet') : 'Inactiva'}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLicenseModal(true)}
                    title="Ver detalles de tu licencia"
                    className="text-amber-400 font-bold flex items-center gap-1 cursor-pointer outline-none bg-transparent border-none p-0 font-mono text-[10px]"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" /> Sin licencia activa
                  </button>
                )}
              </div>
              <span className="text-[#3b3d4a] font-mono text-[11px] hidden md:inline">|</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 ${
                isFluent 
                  ? (isLight ? 'bg-zinc-200/60 border-zinc-300 text-zinc-700' : 'bg-white/[0.05] border-white/[0.08] text-zinc-400') 
                  : isLight 
                    ? 'bg-zinc-100 border-zinc-250 text-zinc-700' 
                    : 'bg-[#0e1014] border-[#1b1d24] text-zinc-300'
              }`}>
                <Calendar className="w-3 h-3 shrink-0 text-zinc-500" />
                <span className="capitalize">{systemDate}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10.5px] font-black border shrink-0 ${
                isFluent 
                  ? (isLight ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400') 
                  : isLight 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                    : 'bg-[#0b1511] border-[#142d22] text-emerald-400'
              }`}>
                <Clock className="w-3 h-3 animate-pulse shrink-0 text-emerald-500" />
                <span>{systemTime}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {isSyncing && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 animate-pulse z-40" />
      )}
      {justSynced && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-400 z-40 transition-opacity duration-1000 opacity-100" />
      )}
    </header>

    {/* Banner de Aviso Previo de Vencimiento de Licencia (5 días de anticipación) */}
    {licenseInfo && getDaysLeft() !== null && (getDaysLeft() ?? 999) <= 5 && (getDaysLeft() ?? -1) >= 0 && (
      <div className={`px-4 py-1.5 text-xs font-black flex items-center justify-between shadow-md border-b select-none z-20 shrink-0 ${
        isRetro
          ? (isLight 
              ? 'bg-[#fef3c7] border-[#d97706] text-[#451a03] font-mono' 
              : 'bg-[#261702] border-[#b45309] text-[#fef08a] font-mono')
          : isFluent
            ? (isLight
                ? 'bg-amber-500/15 border-amber-400/30 text-amber-950 backdrop-blur-md'
                : 'bg-amber-950/80 border-amber-500/30 text-amber-100 backdrop-blur-md')
            : (isLight
                ? 'bg-amber-100 border-amber-300 text-amber-950'
                : 'bg-gradient-to-r from-amber-950/95 via-amber-900/90 to-amber-950/95 border-amber-600/40 text-amber-100')
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm animate-pulse">⏳</span>
          <span>
            {getDaysLeft() === 0 
              ? '¡Tu suscripción a FixManager vence HOY! Recuerda contactar a administración para renovar y evitar interrupciones.'
              : `¡Tu suscripción vence en ${getDaysLeft()} ${getDaysLeft() === 1 ? 'día' : 'días'}! Contacta a administración para renovar con anticipación.`
            }
          </span>
        </div>
        <button 
          onClick={handleOpenRenewPanel}
          className={`px-3 py-1 text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 ${
            isRetro
              ? (isLight
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 text-[#000080] hover:bg-white hover:text-blue-900'
                  : 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-900 border-r-zinc-900 text-black hover:bg-white')
              : isFluent
                ? (isLight
                    ? 'rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    : 'rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md hover:shadow-amber-500/20')
                : (isLight
                    ? 'rounded-lg bg-amber-700 hover:bg-amber-800 text-white shadow-sm'
                    : 'rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md hover:shadow-amber-500/20')
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Renovar Licencia
        </button>
      </div>
    )}

    {(config.whatsappMode === 'integrated' || waStatus === 'CONNECTED' || isWaOpen) && (
      <>
        {/* Floating Action Button (FAB) style WhatsApp Widget */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleWa(e); }}
          className="fixed bottom-[72px] right-[24px] z-[8000] w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(37,211,102,0.35)] transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          title="Abrir / Cerrar WhatsApp"
        >
          <WhatsappIcon className="w-7 h-7" />
          {/* Status dot or unread count badge */}
          {waStatus === 'CONNECTED' && waUnreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 border border-white text-white font-sans font-black text-[9px] flex items-center justify-center shadow-lg animate-bounce select-none">
              {waUnreadCount > 99 ? '99+' : waUnreadCount}
            </span>
          ) : (
            <span 
              className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                waStatus === 'CONNECTED' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : waStatus === 'INITIALIZING' 
                    ? 'bg-amber-500 animate-pulse' 
                    : 'bg-rose-500'
              }`} 
            />
          )}
        </button>

        {/* Portrait Glassmorphic WhatsApp Card popover */}
        <div 
          className="fixed z-[8000] overflow-visible bg-zinc-950/75 border border-emerald-500/25 p-2 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
          style={{
            bottom: '140px',
            right: '24px',
            width: '912px',
            height: '562px',
            transform: isWaOpen ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
            opacity: isWaOpen ? 1 : 0,
            pointerEvents: isWaOpen ? 'auto' : 'none',
            transformOrigin: 'right 22px bottom',
            transition: 'opacity 0.25s ease-out, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Indicator triangle pointing down to the FAB */}
          <div 
            className="absolute -bottom-[6px] w-3 h-3 bg-[#09090b] border-r border-b border-emerald-500/25 rotate-45 z-0"
            style={{
              right: '22px',
            }}
          />

          {/* Cabecera de la cortina */}
          <div className="flex items-center justify-between px-3 py-1 mb-1.5 text-zinc-400 text-[10px] font-black uppercase tracking-wider relative z-10">
            <div className="flex items-center gap-2">
              <WhatsappIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp — Sesión Integrada</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isWaReloading}
                onClick={handleReloadWa}
                className="text-[9.5px] font-extrabold text-zinc-400 hover:text-emerald-400 cursor-pointer bg-zinc-800/60 hover:bg-zinc-800 px-2 py-0.5 rounded transition-all flex items-center gap-1"
                title="Recargar vista de WhatsApp Web"
              >
                <span className={isWaReloading ? 'animate-spin inline-block' : ''}>🔄</span>
                <span>{isWaReloading ? 'Recargando...' : 'Recargar'}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleWa(e); }}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-black cursor-pointer ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* El placeholder interno con el webview */}
          <div 
            className="w-full bg-[#111b21] overflow-hidden rounded-xl border border-white/5 relative z-10"
            style={{
              height: '520px',
            }}
          >
            <webview
              ref={webviewRef}
              src="https://web.whatsapp.com"
              partition="persist:whatsapp"
              preload={eAPI()?.getWaPreloadPath()}
              useragent={eAPI()?.getCleanUserAgent()}
              style={{ width: '100%', height: '100%', border: 'none' }}
              className="w-full h-full"
              spellcheck="true"
            />
          </div>
        </div>
      </>
    )}


    {/* ════════════════════════════════════════════════════════
        MODAL — LICENCIA (centrado, fondo borroso)
    ════════════════════════════════════════════════════════ */}
    {showLicenseModal && (
      <div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={() => { setShowLicenseModal(false); setShowRenewPanel(false); }}
      >
        <div
          className={`w-full max-w-sm overflow-hidden shadow-2xl ${isRetro
            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070]'
            : 'bg-[#111316] border border-zinc-700 rounded-2xl'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div id="license-modal-header" style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background: isRetro ? 'linear-gradient(to right, #0c66e4, #091e42)' : '#0d0f14', borderBottom: isRetro ? 'none' : '1px solid #27272a', color:'white' }}>
            <div className="flex items-center gap-3">
              {showRenewPanel && (
                <button type="button" onClick={() => setShowRenewPanel(false)}
                  title="Volver a info de licencia (el proceso se guarda)"
                  style={{ padding:6, borderRadius:4, cursor:'pointer', background:'transparent', border:'none', color:'white', display:'flex' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'rgba(255,255,255,0.15)' }}>
                {showRenewPanel
                  ? <RotateCcw style={{ width:16, height:16, color:'white' }} />
                  : <Award style={{ width:16, height:16, color:'white' }} />
                }
              </div>
              <div>
                <h2 style={{ fontSize:13, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.05em', color:'white', margin:0 }}>
                  {showRenewPanel ? 'Renovar / Cambiar Plan' : 'Información de Licencia'}
                </h2>
                <p style={{ fontSize:10, marginTop:2, color:'rgba(255,255,255,0.7)', margin:0 }}>FIXMANAGER</p>
              </div>
            </div>
            <button type="button" onClick={() => { setShowLicenseModal(false); setShowRenewPanel(false); }}
              style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'white', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>

          {/* ── Body: Info de licencia ── */}
          {!showRenewPanel && (
            <div className="p-5 space-y-4">

              {!licenseInfo || licenseInfo.status === 'none' ? (
                <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-amber-50 border border-amber-300' : 'bg-amber-950/20 border border-amber-700/30'}`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-amber-700' : 'text-amber-400'}`} />
                  <div>
                    <p className={`text-xs font-black ${isRetro ? 'text-amber-800' : 'text-amber-300'}`}>Sin licencia activa</p>
                    <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>El sistema está en modo demo. Contacta a Hugo para activar tu licencia.</p>
                  </div>
                </div>
              ) : (licenseInfo.status === 'active' || licenseInfo.status === 'trial') ? (
                <>
                  <div className={`rounded-lg overflow-hidden ${isRetro ? 'bg-white border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white' : 'bg-zinc-900/50 border border-zinc-700'}`}>
                    <div className={`flex items-center gap-2 px-3 py-2 ${isRetro ? 'bg-emerald-50 border-b border-emerald-200' : 'bg-emerald-900/20 border-b border-emerald-700/30'}`}>
                      <ShieldCheck className={`w-4 h-4 shrink-0 ${isRetro ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] font-black ${isRetro ? 'text-emerald-800' : 'text-emerald-300'}`}>
                        {licenseInfo.status === 'trial' ? '● Prueba Gratuita (7 días)' : '● Licencia Activa'}
                      </span>
                      <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded ${isRetro ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'}`}>{licenseInfo.type || (licenseInfo.status === 'trial' ? 'Prueba' : 'Activa')}</span>
                    </div>
                    <div className={`p-3 space-y-1.5 text-[11px] font-mono ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {licenseInfo.ownerName && (
                        <div className="flex justify-between">
                          <span className={isRetro ? 'text-zinc-500' : 'text-zinc-600'}>Titular</span>
                          <span className={`font-black ${isRetro ? 'text-zinc-900' : 'text-white'}`}>{licenseInfo.ownerName as string}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className={isRetro ? 'text-zinc-500' : 'text-zinc-600'}>Vencimiento</span>
                        <span className={`font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'}`}>
                          {licenseInfo.expiry === 'PERPETUA' || licenseInfo.type === 'VITALICIA' || (licenseInfo as any).isVitalicia ? '♾ Sin vencimiento' : (() => {
                            const expiryDate = parseExpiryToDate(licenseInfo.expiry as string);
                            return expiryDate ? expiryDate.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }) : 'N/A';
                          })()}
                        </span>
                      </div>
                      {licenseInfo.expiry !== 'PERPETUA' && licenseInfo.type !== 'VITALICIA' && !(licenseInfo as any).isVitalicia && (() => {
                        const days = getDaysLeft();
                        if (days === null) return null;
                        const color = days <= 7 ? (isRetro ? 'text-red-600' : 'text-red-400') : days <= 14 ? (isRetro ? 'text-amber-600' : 'text-amber-400') : (isRetro ? 'text-emerald-700' : 'text-emerald-400');
                        return (
                          <div className="flex justify-between">
                            <span className={isRetro ? 'text-zinc-500' : 'text-zinc-600'}>Días restantes</span>
                            <span className={`font-black ${color}`}>{days > 0 ? `${days} días` : days === 0 ? 'Vence hoy' : 'Vencida'}</span>
                          </div>
                        );
                      })()}
                      {licenseInfo.activatedAt && (
                        <div className="flex justify-between">
                          <span className={isRetro ? 'text-zinc-500' : 'text-zinc-600'}>Activada el</span>
                          <span className={isRetro ? 'text-zinc-700' : 'text-zinc-400'}>
                            {new Date(licenseInfo.activatedAt as string).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sincronización en la Nube */}
                  <div className={`rounded-xl overflow-hidden border ${
                    isRetro
                      ? 'bg-white border-2 border-t-zinc-400 border-l-zinc-400 border-b-white border-r-white'
                      : 'bg-zinc-950/40 border-zinc-800/80'
                  }`}>
                    <div className={`flex items-center gap-2 px-3 py-2 ${
                      isRetro
                        ? 'bg-zinc-100 border-b border-zinc-200'
                        : 'bg-zinc-900/50 border-b border-zinc-850'
                    }`}>
                      <span className={`text-[11px] font-black ${isRetro ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        ☁️ Sincronización en la Nube
                      </span>
                      <span className={`ml-auto text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                        localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : 'bg-red-500/10 text-red-400 border border-red-500/25'
                      }`}>
                        {localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className={`p-3 space-y-2.5 text-[10.5px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true' ? (
                        <p>
                          ✅ Tu sublicencia de sincronización está activa. Tu taller se está sincronizando de forma segura y en tiempo real con la nube.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          <p>
                            ❌ Este equipo no tiene activa la Sincronización en la Nube. La sincronización te permite conectar tu taller de escritorio con la aplicación móvil en tu celular para ver ventas, reportes y órdenes al instante.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowLicenseModal(false);
                              setActiveTab('Config');
                              if (setConfigSubTab) setConfigSubTab('global');
                              setTimeout(() => {
                                window.dispatchEvent(new Event('fixmanager_switch_to_backup_tab'));
                              }, 50);
                            }}
                            className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                              isRetro
                                ? 'bg-indigo-200 hover:bg-indigo-300 text-indigo-800 border border-indigo-450'
                                : 'bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
                            }`}
                          >
                            Ir a Ajustes y Activar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón Renovar / Cambiar plan */}
                  <button
                    type="button"
                    onClick={handleOpenRenewPanel}
                    className={`w-full py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all ${isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-700 hover:bg-zinc-200'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl'}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Renovar / Cambiar plan
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivateDevice}
                    disabled={sbDeactivating}
                    className={`w-full py-2 flex items-center justify-center gap-2 cursor-pointer transition-all text-[10.5px] font-bold ${isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-red-700 hover:bg-zinc-200 mt-2'
                      : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl mt-2'}`}
                  >
                    {sbDeactivating ? 'Desvinculando...' : 'Desvincular este dispositivo / Cerrar Sesión'}
                  </button>
                </>
              ) : (
                <>
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-red-50 border border-red-300' : 'bg-red-950/20 border border-red-700/30'}`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-red-700' : 'text-red-400'}`} />
                    <div>
                      <p className={`text-xs font-black ${isRetro ? 'text-red-800' : 'text-red-300'}`}>
                        {licenseInfo.status === 'expired' ? 'Licencia vencida' : 'Licencia inválida'}
                      </p>
                      {licenseInfo.reason && <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>{licenseInfo.reason}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenRenewPanel}
                    className={`w-full py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all ${isRetro
                      ? 'bg-[#113a7c] text-white border-2 border-t-[#1d5fb9] border-l-[#1d5fb9] border-b-[#081e42] border-r-[#081e42] hover:bg-blue-800'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 rounded-xl'}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Renovar licencia
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivateDevice}
                    disabled={sbDeactivating}
                    className={`w-full py-2 flex items-center justify-center gap-2 cursor-pointer transition-all text-[10.5px] font-bold ${isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-red-700 hover:bg-zinc-200 mt-2'
                      : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl mt-2'}`}
                  >
                    {sbDeactivating ? 'Desvinculando...' : 'Desvincular este dispositivo / Cerrar Sesión'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Body: Panel de renovación ── */}
          {showRenewPanel && (
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Plan actual */}
              {(licenseInfo?.status === 'active' || licenseInfo?.status === 'trial') && (
                <div className={`p-3 rounded-lg text-[10.5px] ${isRetro ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-900/50 border border-zinc-700'}`}>
                  <p className={`text-[9.5px] font-black uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-500' : 'text-zinc-600'}`}>Plan actual</p>
                  <p className={`font-black ${isRetro ? 'text-zinc-800' : 'text-zinc-200'}`}>
                    {licenseInfo.type as string}
                    {licenseInfo.expiry && licenseInfo.expiry !== 'PERPETUA' && licenseInfo.type !== 'VITALICIA' && !(licenseInfo as any).isVitalicia && (() => {
                      const expiryDate = parseExpiryToDate(licenseInfo.expiry as string);
                      if (!expiryDate) return null;
                      const days = getDaysLeft();
                      if (days !== null && days > 3650) return <span className={`ml-2 font-normal ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>· ♾ Sin vencimiento</span>;
                      const formatted = expiryDate.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });
                      const daysText = days !== null ? (days > 0 ? ` (Quedan ${days} ${days === 1 ? 'día' : 'días'})` : days === 0 ? ' (Vence hoy)' : ' (Vencida)') : '';
                      return <span className={`ml-2 font-normal ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>· Vence {formatted}{daysText}</span>;
                    })()}
                  </p>
                </div>
              )}

              {/* Selector de plan — solo opciones superiores al plan actual */}
              {availableRenewPlans.length === 0 ? (
                <div className={`p-3 rounded-lg flex items-start gap-3 ${isRetro ? 'bg-emerald-50 border border-emerald-300' : 'bg-emerald-950/20 border border-emerald-700/30'}`}>
                  <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <div>
                    <p className={`text-xs font-black ${isRetro ? 'text-emerald-800' : 'text-emerald-300'}`}>Ya tienes el plan más completo ♾</p>
                    <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Tu licencia Vitalicia no tiene vencimiento. No necesitas ninguna renovación.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    1. Elige el nuevo plan
                  </p>
                  {availableRenewPlans.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => { setRenewSelectedPlan(plan.id); }}
                      style={
                        renewSelectedPlan === plan.id
                          ? { background:'#000080', border:'2px solid #000080', color:'white', width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 12px', textAlign:'left', cursor:'pointer' }
                          : {}
                      }
                      className={renewSelectedPlan === plan.id ? '' : `w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-all ${
                        isRetro ? 'bg-white border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 hover:bg-zinc-100 text-zinc-800' : 'bg-zinc-900/50 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-lg'
                      }`}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{plan.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 900, color: renewSelectedPlan === plan.id ? 'white' : undefined }} className={renewSelectedPlan === plan.id ? '' : (isRetro ? 'text-zinc-800' : 'text-zinc-200')}>{plan.label}</p>
                        <p style={{ fontSize: 10, color: renewSelectedPlan === plan.id ? 'rgba(255,255,255,0.8)' : undefined }} className={renewSelectedPlan === plan.id ? '' : (isRetro ? 'text-zinc-500' : 'text-zinc-500')}>{plan.sub}</p>
                      </div>
                      {renewSelectedPlan === plan.id && <Check style={{ width:16, height:16, flexShrink:0, color:'white' }} />}
                    </button>
                  ))}
                </div>
              )}

              {availableRenewPlans.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    2. Solicita tu nueva clave a Hugo
                  </p>
                  <button type="button"
                    onClick={handleRenewWhatsApp}
                    disabled={!renewSelectedPlan}
                    title={!renewSelectedPlan ? 'Primero elige un plan arriba' : ''}
                    style={renewSelectedPlan ? { background:'#1fad4e', border:'2px solid #0d6e2f', color:'white', width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 14px', cursor:'pointer', borderRadius:4, opacity:1 } : { width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 14px', cursor:'not-allowed', opacity:0.4, background:'#d1d5db', border:'2px solid #9ca3af', borderRadius:4 }}
                  >
                    <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: renewSelectedPlan ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
                      <svg viewBox="0 0 24 24" style={{ width:16, height:16, fill: renewSelectedPlan ? '#25D366' : '#6b7280' }} xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:900, color: renewSelectedPlan ? 'white' : '#6b7280' }}>Escribir a Hugo García</p>
                      <p style={{ fontSize:11, marginTop:2, color: renewSelectedPlan ? 'rgba(255,255,255,0.75)' : '#6b7280' }}>
                        {renewSelectedPlan ? '351 157 4876 · +52 México' : 'Elige un plan primero'}
                      </p>
                    </div>
                    <ChevronRight style={{ width:16, height:16, flexShrink:0, opacity:0.7, color:'white' }} />
                  </button>
                  <p className={`text-[9.5px] ${isRetro ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    El mensaje incluye tu plan elegido y tu Machine ID automáticamente.
                  </p>
                </div>
              )}

              {availableRenewPlans.length > 0 && (
                <div className={`p-4 rounded-xl text-xs flex flex-col gap-2 ${isRetro ? 'bg-blue-50 border-2 border-blue-400 text-blue-900' : 'bg-blue-950/20 border border-blue-800/40 text-blue-300'}`}>
                  <div className="font-black flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Activación automática</span>
                  </div>
                  <p className="leading-relaxed text-[11px] opacity-90">
                    Una vez realizado tu pago y confirmada la activación, tu aplicación se actualizará automáticamente en segundo plano. ¡Listo!
                  </p>
                </div>
              )}

              {/* ── Botón cancelar renovación ── */}
              <button type="button" onClick={handleCancelRenew}
                style={{ width:'100%', padding:'8px 0', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', background:'#dc2626', border:'2px solid #b91c1c', color:'white', borderRadius:4 }}>
                <X style={{ width:14, height:14 }} />
                Cancelar — no quiero renovar ahora
              </button>
            </div>
          )}

        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════
        MODAL — ACTUALIZACIONES (centrado, fondo borroso)
    ════════════════════════════════════════════════════════ */}
    {showUpdatesModal && (
      <div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={() => setShowUpdatesModal(false)}
      >
        <div
          className={`w-full max-w-sm overflow-hidden shadow-2xl ${isRetro
            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070]'
            : 'bg-[#111316] border border-zinc-700 rounded-2xl'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`modal-dark-header px-5 py-3.5 flex items-center justify-between gap-3 ${isRetro
            ? 'bg-gradient-to-r from-[#0c66e4] to-[#091e42] text-white'
            : 'bg-[#0d0f14] border-b border-zinc-800 text-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRetro ? 'bg-white/20' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                {checkingUpdates ? <Loader2 className={`w-4 h-4 animate-spin ${isRetro ? 'text-white' : 'text-blue-400'}`} /> : <RefreshCw className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-blue-400'}`} />}
              </div>
              <div>
                <h2 style={{ fontSize:13, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.05em', color:'white' }}>Actualizaciones</h2>
                <p style={{ fontSize:10, marginTop:2, color:'rgba(255,255,255,0.7)' }}>FIXMANAGER</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowUpdatesModal(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-bold cursor-pointer transition-all">✕</button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {downloadingHotUpdate ? (
              <div className="space-y-3 p-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isRetro ? 'text-zinc-800' : 'text-zinc-200'}>Descargando actualización en FixManager...</span>
                  <span className="font-mono text-blue-400 font-black">{hotUpdateProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-zinc-700">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-200"
                    style={{ width: `${hotUpdateProgress}%` }}
                  />
                </div>
                <p className={`text-[10px] text-center font-bold animate-pulse ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {hotUpdateProgress < 100
                    ? 'Por favor no cierres la aplicación...'
                    : 'Descarga finalizada. Iniciando instalador silencioso...'}
                </p>
              </div>
            ) : checkingUpdates ? (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isRetro ? 'bg-blue-50 border border-blue-200' : 'bg-blue-950/20 border border-blue-700/30'}`}>
                <Loader2 className={`w-5 h-5 animate-spin shrink-0 ${isRetro ? 'text-blue-600' : 'text-blue-400'}`} />
                <div>
                  <p className={`text-xs font-black ${isRetro ? 'text-blue-800' : 'text-blue-300'}`}>Verificando servidores...</p>
                  <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Conectando con el servidor de actualizaciones.</p>
                </div>
              </div>
            ) : updateInfo ? (
              updateInfo.hasUpdate ? (
                <div className="space-y-3">
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-blue-50 border border-blue-300' : 'bg-blue-950/20 border border-blue-700/30'}`}>
                    <Download className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-blue-700' : 'text-blue-400'}`} />
                    <div>
                      <p className={`text-xs font-black ${isRetro ? 'text-blue-800' : 'text-blue-300'}`}>Nueva versión disponible: v{updateInfo.version}</p>
                      <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Versión actual: v{updateInfo.currentVersion}</p>
                    </div>
                  </div>
                  {updateInfo.notes && (
                    <p className={`text-[11px] px-3 py-2 rounded-lg ${isRetro ? 'bg-white border border-zinc-300 text-zinc-700' : 'bg-zinc-900/50 border border-zinc-700 text-zinc-300'}`}>
                      {updateInfo.notes}
                    </p>
                  )}
                  <button type="button" onClick={handleStartDirectUpdate}
                    className={`w-full py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-xl ${isRetro
                      ? 'bg-[#113a7c] text-white border-2 border-t-[#1d5fb9] border-l-[#1d5fb9] border-r-[#081e42] border-b-[#081e42] hover:bg-blue-800'
                      : 'bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white'}`}>
                    <Download className="w-4 h-4" /> Descargar e instalar actualización
                  </button>
                </div>
              ) : updateInfo.error ? (
                <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-amber-50 border border-amber-300' : 'bg-amber-950/20 border border-amber-700/30'}`}>
                  <WifiOff className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-amber-700' : 'text-amber-400'}`} />
                  <div>
                    <p className={`text-xs font-black ${isRetro ? 'text-amber-800' : 'text-amber-300'}`}>Sin conexión</p>
                    <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>{updateInfo.error}</p>
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-emerald-50 border border-emerald-300' : 'bg-emerald-950/20 border border-emerald-700/30'}`}>
                  <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <div>
                    <p className={`text-xs font-black ${isRetro ? 'text-emerald-800' : 'text-emerald-300'}`}>Sistema al día ✓</p>
                    <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Versión v{updateInfo.currentVersion} — No hay actualizaciones pendientes.</p>
                  </div>
                </div>
              )
            ) : (
              <div className={`flex items-start gap-3 p-3 rounded-lg ${isRetro ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-900/50 border border-zinc-700'}`}>
                <Cpu className={`w-5 h-5 shrink-0 mt-0.5 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`} />
                <div>
                  <p className={`text-xs font-black ${isRetro ? 'text-zinc-700' : 'text-zinc-300'}`}>Buscar actualizaciones</p>
                  <p className={`text-[10.5px] mt-0.5 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Haz clic en el botón para comprobar si hay una versión más reciente disponible.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
              className={`w-full py-2 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-700 hover:bg-zinc-200'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl'}`}
            >
              {checkingUpdates ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...</> : <><RefreshCw className="w-3.5 h-3.5" /> Buscar ahora</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
