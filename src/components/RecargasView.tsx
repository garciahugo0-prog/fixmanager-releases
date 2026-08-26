/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WorkshopConfig, Sale, SaleItem } from '../types';
import { TAECEL_CARRIERS, TaecelCarrier } from '../utils/taecelCarriers';
import { taecelGetBalance, taecelRequestRecharge, taecelGetProducts, taecelGetSales, taecelGetReporteCompraUrl } from '../utils/taecel';
import { buildPosTicketHtml, buildRechargeTicketHtml } from '../utils/ticketBuilder';
import { generateNextSaleId, extractSaleTicketNumber } from '../utils/folioUtils';
import { Search, Smartphone, Zap, FileText, Gift, RefreshCw, AlertCircle, Check, Coins, Printer, MessageCircle } from 'lucide-react';

const IconTiempoAire = ({ isSelected }: { isSelected: boolean }) => (
  <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradAire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <rect x="5" y="2" width="14" height="20" rx="3" fill="url(#gradAire)" />
    <rect x="7" y="4" width="10" height="13" rx="1" fill="#ffffff" opacity="0.95" />
    <circle cx="12" cy="19" r="1.5" fill="#ffffff" />
    <path d="M9 13h1.5M9 10h3.5M9 7h5.5" stroke="url(#gradAire)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPaquetes = ({ isSelected }: { isSelected: boolean }) => (
  <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradPaq" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
    </defs>
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#gradPaq)" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#gradPaq)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconServicios = ({ isSelected }: { isSelected: boolean }) => (
  <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradServ" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" stroke="url(#gradServ)" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" stroke="url(#gradServ)" strokeWidth="2" strokeLinecap="round" />
    <rect x="9" y="7" width="2" height="2" fill="url(#gradServ)" rx="0.5" />
    <rect x="13" y="7" width="2" height="2" fill="url(#gradServ)" rx="0.5" />
    <rect x="9" y="11" width="2" height="2" fill="url(#gradServ)" rx="0.5" />
    <rect x="13" y="11" width="2" height="2" fill="url(#gradServ)" rx="0.5" />
  </svg>
);

const IconAppPins = ({ isSelected }: { isSelected: boolean }) => (
  <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradApp" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#gradApp)" />
    <path d="M10 9l5 3-5 3V9z" fill="#ffffff" opacity="0.95" />
    <circle cx="5" cy="7" r="1" fill="#ffffff" opacity="0.6" />
    <circle cx="19" cy="17" r="1" fill="#ffffff" opacity="0.6" />
  </svg>
);

interface RecargasViewProps {
  config: WorkshopConfig;
  sales: Sale[];
  onCompleteSale: (
    sale: Sale,
    options?: { printTicket?: boolean; sendWhatsApp?: boolean; whatsappPhone?: string; whatsappCountryCode?: string }
  ) => void;
  currentUser: any;
  setActiveTab: (tab: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const CARRIER_LOGOS: Record<string, string> = {
  TELCEL: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/telcel.png',
  TELCEL_PAQ: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/telcel.png',
  MOVISTAR: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/movistar.png',
  MOVISTAR_PAQ: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/movistar.png',
  ATT: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/att.png',
  ATT_PAQ: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/att.png',
  UNEFON: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/unefon.png',
  BAIT: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/bait.png',
  VIRGIN: 'https://cdn.taecel.com/src/web/taecel/assets/img/carriers/virgin-mobile.png',
  CFE: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Comisi%C3%B3n_Federal_de_Electricidad_%28logo%29_.svg',
  TELMEX: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Telmex_Logo.svg',
  IZZI: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Logo_Izzi.svg',
  SKY: 'https://upload.wikimedia.org/wikipedia/commons/7/74/SKY_Basic_Logo.svg',
  DISH: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Dish_Network_Logo.svg',
  NETFLIX: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  SPOTIFY: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  XBOX: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg',
  PLAYSTATION: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg',
  GOOGLE_PLAY: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Google_Play_2022_logo.svg',
  APPLE: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  CINEPOLIS: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Cin%C3%A9polis_logo.svg',
  INFONAVIT: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Logo_INFONAVIT.svg'
};

const renderCarrierLogo = (id: string, name: string, logoUrlFromApi?: string, isSelected?: boolean, isLarge: boolean = false) => {
  const sizeClass = isLarge ? 'w-24 h-14 rounded-2xl p-1.5' : 'w-16 h-10 rounded-xl p-1';
  
  if (id === 'AGUA') {
    return (
      <div className={`${sizeClass} flex items-center justify-center bg-blue-500 border border-blue-600 shadow-xs overflow-hidden shrink-0`}>
        <svg viewBox="0 0 24 24" className={`${isLarge ? 'w-8 h-8' : 'w-6 h-6'} text-white`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </div>
    );
  }

  if (id === 'TELEVIA') {
    return (
      <div className={`${sizeClass} flex items-center justify-center bg-emerald-600 border border-emerald-700 shadow-xs overflow-hidden shrink-0`}>
        <svg viewBox="0 0 24 24" className={`${isLarge ? 'w-8 h-8' : 'w-6 h-6'} text-white`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      </div>
    );
  }

  const logoUrl = logoUrlFromApi || CARRIER_LOGOS[id] || CARRIER_LOGOS[name.toUpperCase()] || CARRIER_LOGOS[id.toUpperCase()];
  
  if (logoUrl) {
    return (
      <div className={`${sizeClass} relative flex items-center justify-center bg-white border border-slate-200/80 shadow-3xs overflow-hidden shrink-0`}>
        {/* Fallback de iniciales detrás de la imagen por si no hay internet */}
        <span className="absolute text-[11px] font-black uppercase text-slate-400 select-none">
          {name.slice(0, 2)}
        </span>
        <img 
          src={logoUrl} 
          alt={name} 
          className="absolute inset-0 w-full h-full object-contain p-1.5 bg-white z-10 animate-fade-in"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }
  
  // Fallback si no hay logo registrado
  return (
    <div className={`${isLarge ? 'w-24 h-14 text-xl rounded-2xl' : 'w-16 h-10 text-sm rounded-xl'} flex items-center justify-center font-bold uppercase transition-all shadow-xs bg-slate-205 text-slate-700 shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const getBrandStyle = (id: string, isLight: boolean) => {
  switch (id) {
    case 'TELCEL':
    case 'TELCEL_PAQ':
      return {
        accentColor: '#0054a6',
        bgSelected: isLight ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-950/20 border-blue-500/40',
        textSelected: isLight ? 'text-blue-800' : 'text-blue-300'
      };
    case 'MOVISTAR':
    case 'MOVISTAR_PAQ':
      return {
        accentColor: '#00a9e0',
        bgSelected: isLight ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-950/20 border-sky-500/40',
        textSelected: isLight ? 'text-sky-750' : 'text-sky-300'
      };
    case 'ATT':
    case 'ATT_PAQ':
      return {
        accentColor: '#0087cb',
        bgSelected: isLight ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-950/20 border-sky-500/40',
        textSelected: isLight ? 'text-sky-850' : 'text-sky-300'
      };
    case 'UNEFON':
      return {
        accentColor: '#ffc600',
        bgSelected: isLight ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-950/20 border-amber-500/40',
        textSelected: isLight ? 'text-amber-800' : 'text-amber-300'
      };
    case 'BAIT':
      return {
        accentColor: '#ff5000',
        bgSelected: isLight ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-950/20 border-orange-500/40',
        textSelected: isLight ? 'text-orange-700' : 'text-orange-300'
      };
    case 'VIRGIN':
      return {
        accentColor: '#e11a2b',
        bgSelected: isLight ? 'bg-red-500/10 border-red-500/30' : 'bg-red-950/20 border-red-500/40',
        textSelected: isLight ? 'text-red-750' : 'text-red-300'
      };
    case 'CFE':
      return {
        accentColor: '#009639',
        bgSelected: isLight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-950/20 border-emerald-500/40',
        textSelected: isLight ? 'text-emerald-700' : 'text-emerald-300'
      };
    case 'TELMEX':
      return {
        accentColor: '#0099cc',
        bgSelected: isLight ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-950/20 border-sky-500/40',
        textSelected: isLight ? 'text-sky-800' : 'text-sky-350'
      };
    case 'IZZI':
      return {
        accentColor: '#e03a93',
        bgSelected: isLight ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-950/20 border-pink-500/40',
        textSelected: isLight ? 'text-pink-750' : 'text-pink-300'
      };
    case 'SKY':
      return {
        accentColor: '#002f6c',
        bgSelected: isLight ? 'bg-blue-600/10 border-blue-600/30' : 'bg-blue-900/20 border-blue-600/40',
        textSelected: isLight ? 'text-blue-800' : 'text-blue-300'
      };
    case 'DISH':
      return {
        accentColor: '#ff0000',
        bgSelected: isLight ? 'bg-red-500/10 border-red-500/30' : 'bg-red-950/20 border-red-500/40',
        textSelected: isLight ? 'text-red-700' : 'text-red-300'
      };
    case 'NETFLIX':
      return {
        accentColor: '#e50914',
        bgSelected: isLight ? 'bg-red-600/10 border-red-600/30' : 'bg-red-950/20 border-red-600/40',
        textSelected: isLight ? 'text-red-800' : 'text-red-300'
      };
    case 'SPOTIFY':
      return {
        accentColor: '#1db954',
        bgSelected: isLight ? 'bg-green-500/10 border-green-500/30' : 'bg-green-950/20 border-green-500/40',
        textSelected: isLight ? 'text-green-700' : 'text-green-300'
      };
    case 'XBOX':
      return {
        accentColor: '#107c10',
        bgSelected: isLight ? 'bg-green-600/10 border-green-600/30' : 'bg-green-950/20 border-green-650/40',
        textSelected: isLight ? 'text-green-750' : 'text-green-300'
      };
    case 'PLAYSTATION':
      return {
        accentColor: '#003087',
        bgSelected: isLight ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-950/20 border-indigo-500/40',
        textSelected: isLight ? 'text-indigo-750' : 'text-indigo-300'
      };
    case 'GOOGLE_PLAY':
      return {
        accentColor: '#34a853',
        bgSelected: isLight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-950/20 border-emerald-500/40',
        textSelected: isLight ? 'text-emerald-750' : 'text-emerald-300'
      };
    case 'APPLE':
      return {
        accentColor: '#1a1a1a',
        bgSelected: isLight ? 'bg-slate-800/10 border-slate-400/40' : 'bg-zinc-800/20 border-zinc-700/40',
        textSelected: isLight ? 'text-slate-900' : 'text-zinc-100'
      };
    case 'CINEPOLIS':
      return {
        accentColor: '#002d62',
        bgSelected: isLight ? 'bg-blue-700/10 border-blue-500/30' : 'bg-blue-950/20 border-blue-500/40',
        textSelected: isLight ? 'text-blue-800' : 'text-blue-300'
      };
    case 'INFONAVIT':
      return {
        accentColor: '#ff0000',
        bgSelected: isLight ? 'bg-red-500/10 border-red-500/30' : 'bg-red-950/20 border-red-500/40',
        textSelected: isLight ? 'text-red-750' : 'text-red-300'
      };
    default:
      return {
        accentColor: '#f59e0b',
        bgSelected: isLight ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-950/20 border-amber-500/40',
        textSelected: isLight ? 'text-amber-800' : 'text-amber-300'
      };
  }
};

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const getBillColor = (amount: number, isLight: boolean) => {
  switch (amount) {
    case 20:
      return {
        bg: 'bg-[#2980b9] border-[#1f618d]',
        active: 'ring-4 ring-blue-400 scale-[1.05] border-white shadow-md'
      };
    case 50:
      return {
        bg: 'bg-[#b71c1c] border-[#7f0000]',
        active: 'ring-4 ring-rose-400 scale-[1.05] border-white shadow-md'
      };
    case 100:
      return {
        bg: 'bg-[#78281f] border-[#511812]',
        active: 'ring-4 ring-red-400 scale-[1.05] border-white shadow-md'
      };
    case 200:
      return {
        bg: 'bg-[#196f3d] border-[#114f2b]',
        active: 'ring-4 ring-green-400 scale-[1.05] border-white shadow-md'
      };
    case 500:
      return {
        bg: 'bg-[#34495e] border-[#2c3e50]',
        active: 'ring-4 ring-slate-400 scale-[1.05] border-white shadow-md'
      };
    default:
      return isLight
        ? { bg: 'bg-[#7f8c8d] border-[#616a6b]', active: 'ring-4 ring-yellow-400 scale-[1.05] border-white shadow-md' }
        : { bg: 'bg-[#566573] border-[#34495e]', active: 'ring-4 ring-yellow-400 scale-[1.05] border-white shadow-md' };
  }
};

export default function RecargasView({
  config,
  sales,
  onCompleteSale,
  currentUser,
  setActiveTab,
  isMobile = false,
  onClose
}: RecargasViewProps) {
  const isLight = config.themeMode === 'light';
  const currency = config.currencySymbol || '$';
  const isSandbox = false;

  const [waConnected, setWaConnected] = useState<boolean>(() => {
    return (window as any).whatsappConnected || false;
  });

  useEffect(() => {
    const handleStatus = (e: Event) => {
      setWaConnected((e as CustomEvent).detail);
    };
    window.addEventListener('whatsapp-status-update', handleStatus);
    
    // Also check status right away
    const api = (window as any).electronAPI;
    if (api && api.whatsappGetStatus) {
      api.whatsappGetStatus().then((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('whatsapp-status-update', handleStatus);
    };
  }, []);

  const isWaIntegratedOffline = !waConnected;

  // Estados de carga de saldo
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceServices, setBalanceServices] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Filtros y catálogo
  const [selectedType, setSelectedType] = useState<'recarga' | 'paquete' | 'servicio' | 'pin'>('recarga');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCarrier, setSelectedCarrier] = useState<TaecelCarrier | null>(null);

  // Refs para autofoco
  const phoneRef = useRef<HTMLInputElement>(null);
  const confirmPhoneRef = useRef<HTMLInputElement>(null);

  // Formulario de recarga
  const [phoneOrReference, setPhoneOrReference] = useState<string>('');
  const [confirmPhoneOrReference, setConfirmPhoneOrReference] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | null>(null);

  // Estados para el Modal de Cobro unificado
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [mobileCheckoutStep, setMobileCheckoutStep] = useState<1 | 2>(1);
  const [mobilePaymentMode, setMobilePaymentMode] = useState<'efectivo' | 'tarjeta' | 'mixto'>('efectivo');

  useEffect(() => {
    if (showCheckoutModal) {
      setMobileCheckoutStep(1);
    }
  }, [showCheckoutModal]);

  // Saldo disabled logic (incluye error de balance para previsualizar el estado deshabilitado)
  const isAirtimeDisabled = !!balanceError || (balance !== null && balance <= 0);
  const isServicesDisabled = !!balanceError || (balanceServices !== null && balanceServices <= 0);
  const isAllDisabled = isAirtimeDisabled && isServicesDisabled;

  // Efecto para auto-seleccionar pestaña disponible si la actual queda deshabilitada por saldo
  useEffect(() => {
    if (isAirtimeDisabled && (selectedType === 'recarga' || selectedType === 'paquete')) {
      if (!isServicesDisabled) {
        setSelectedType('servicio');
        setSelectedCarrier(null);
      }
    } else if (isServicesDisabled && (selectedType === 'servicio' || selectedType === 'pin')) {
      if (!isAirtimeDisabled) {
        setSelectedType('recarga');
        setSelectedCarrier(null);
      }
    }
  }, [balance, balanceServices, selectedType]);

  const [payCash, setPayCash] = useState<number | ''>('');
  const [payCard, setPayCard] = useState<number | ''>('');
  const [cardVoucherRef, setCardVoucherRef] = useState<string>('');
  const [printTicket, setPrintTicket] = useState<boolean>(true);
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');

  const [taecelProducts, setTaecelProducts] = useState<any[]>([]);
  const [apiCarriers, setApiCarriers] = useState<TaecelCarrier[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Historial Taecel
  const [showSalesHistory, setShowSalesHistory] = useState<boolean>(false);
  const [showReportarCompraModal, setShowReportarCompraModal] = useState<boolean>(false);
  const [reportarCompraUrl, setReportarCompraUrl] = useState<string>('');
  const [historyRecargas, setHistoryRecargas] = useState<any[]>([]);
  const [historyServicios, setHistoryServicios] = useState<any[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState<string>(getLocalDateString());
  const [historyEndDate, setHistoryEndDate] = useState<string>(getLocalDateString());
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Estadísticas del día
  const stats = useMemo(() => {
    let totalRecargasVal = 0;
    let totalServiciosVal = 0;
    let totalComisionesVal = 0;
    let successfulCount = 0;
    let failedCount = 0;

    historyRecargas.forEach((tx: any) => {
      const amountStr = String(tx.Monto || '').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      const isExitosa = (tx.Status || '').trim().toLowerCase() === 'exitosa';
      if (isExitosa) {
        totalRecargasVal += amount;
        successfulCount++;
        const comisionStr = String(tx.Comision || '').replace(/[^0-9.]/g, '');
        const comision = parseFloat(comisionStr) || 0;
        totalComisionesVal += comision;
      } else {
        failedCount++;
      }
    });

    historyServicios.forEach((tx: any) => {
      const amountStr = String(tx.Monto || '').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      const isExitosa = (tx.Status || '').trim().toLowerCase() === 'exitosa';
      if (isExitosa) {
        totalServiciosVal += amount;
        successfulCount++;
        const comisionStr = String(tx.Comision || '').replace(/[^0-9.]/g, '');
        const comision = parseFloat(comisionStr) || 0;
        totalComisionesVal += comision;
      } else {
        failedCount++;
      }
    });

    const totalCount = successfulCount + failedCount;
    return {
      totalRecargas: totalRecargasVal,
      totalServicios: totalServiciosVal,
      totalComisiones: totalComisionesVal,
      successful: successfulCount,
      failed: failedCount,
      totalCount: totalCount
    };
  }, [historyRecargas, historyServicios]);

  // Procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    txId: string;
    folio: string;
    carrierName: string;
    phone: string;
    amount: number;
    commission: number;
  } | null>(null);

  // Cargar saldo al iniciar
  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    setBalanceError(null);
    try {
      const res = await taecelGetBalance(config);
      if (res.success) {
        if (res.balance !== undefined) setBalance(res.balance);
        if (res.balanceServices !== undefined) setBalanceServices(res.balanceServices);
      } else {
        setBalanceError(res.message);
      }
    } catch (e: any) {
      setBalanceError(e.message || 'Error de conexión');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const extractCarriersFromCatalog = (res: any): TaecelCarrier[] => {
    if (!res || !res.data || !Array.isArray(res.data.carriers) || !Array.isArray(res.data.productos)) {
      return [];
    }

    return res.data.carriers.map((c: any) => {
      // Determinar tipo de carrier (recarga, paquete, servicio o pin)
      let type: 'recarga' | 'paquete' | 'servicio' | 'pin' = 'recarga';
      const nameLower = c.Nombre.toLowerCase();
      
      if (c.CategoriaID === '4' || nameLower.includes('pin') || nameLower.includes('gift') || nameLower.includes('card') || nameLower.includes('playstation') || nameLower.includes('xbox') || nameLower.includes('nintendo') || nameLower.includes('spotify') || nameLower.includes('netflix') || nameLower.includes('crunchy') || nameLower.includes('paramount') || nameLower.includes('blizzard') || nameLower.includes('roblox') || nameLower.includes('free fire') || nameLower.includes('pubg') || nameLower.includes('razer') || nameLower.includes('amazon') || nameLower.includes('uber') || nameLower.includes('play')) {
        type = 'pin';
      } else if (c.BolsaID === '2') {
        type = 'servicio';
      } else if (c.BolsaID === '1') {
        // En Taecel Bolsa 1 es Tiempo Aire y Paquetes.
        if (c.CategoriaID === '2' || nameLower.includes('paq') || nameLower.includes('sin lim') || nameLower.includes('datos') || nameLower.includes('internet amigo') || nameLower.includes('paquetes')) {
          type = 'paquete';
        } else {
          type = 'recarga';
        }
      }

      // Obtener montos sugeridos específicos para este carrier
      const carrierProducts = res.data.productos.filter((p: any) => p.CarrierID === c.ID || p.Carrier.toLowerCase() === c.Nombre.toLowerCase());
      const parsedMontos: number[] = carrierProducts.map((p: any) => parseFloat(p.Monto));
      const options: number[] = Array.from(new Set<number>(parsedMontos))
        .filter((m: number) => !isNaN(m) && m > 0)
        .sort((a: number, b: number) => a - b);

      const apiField = (Array.isArray(c.Campos) && c.Campos.length > 0) ? c.Campos[0] : null;

      return {
        id: c.ID, // Usamos el ID oficial de la API de Taecel
        name: c.Nombre,
        type,
        options: options.length > 0 ? options : undefined,
        logoUrl: c.Logotipo,
        description: c.description || (type === 'servicio' ? `Pago de servicio ${c.Nombre}` : undefined),
        fieldLabel: apiField ? apiField.Nombre : undefined,
        fieldPlaceholder: apiField ? `Ingresa ${apiField.Nombre.toLowerCase()}...` : undefined
      };
    });
  };

  // Cargar catálogo de productos de Taecel
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const cached = localStorage.getItem('fixmanager_taecel_products_cache');
      const cacheTime = localStorage.getItem('fixmanager_taecel_products_cache_time');
      const now = Date.now();
      
      const isSandbox = false;
      const cachedIsSandbox = localStorage.getItem('fixmanager_taecel_products_cache_is_sandbox') === 'true';
      
      if (!isSandbox && (cachedIsSandbox === isSandbox) && cached && cacheTime && (now - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.data && Array.isArray(parsed.data.productos)) {
          setTaecelProducts(parsed.data.productos);
          const mapped = extractCarriersFromCatalog(parsed);
          setApiCarriers(mapped);
          setIsLoadingProducts(false);
          return;
        }
      }

      const res = await taecelGetProducts(config);
      console.log('DEBUG TAECEL RESPONSE:', JSON.stringify(res));
      if (res.success && res.data && Array.isArray(res.data.productos)) {
        setTaecelProducts(res.data.productos);
        const mapped = extractCarriersFromCatalog(res);
        setApiCarriers(mapped);
        localStorage.setItem('fixmanager_taecel_products_cache', JSON.stringify(res));
        localStorage.setItem('fixmanager_taecel_products_cache_time', now.toString());
        localStorage.setItem('fixmanager_taecel_products_cache_is_sandbox', isSandbox.toString());
      }
    } catch (e) {
      console.error('[Taecel Products Load Error]:', e);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchProducts();
  }, [config.taecelApiKey, config.taecelNip]);

  const fetchSalesHistory = async (startDate: string, endDate: string) => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const getDatesInRange = (s: string, e: string): string[] => {
        const dates: string[] = [];
        const curr = new Date(s + 'T00:00:00');
        const last = new Date(e + 'T00:00:00');
        let count = 0;
        while (curr <= last && count < 7) {
          const year = curr.getFullYear();
          const month = String(curr.getMonth() + 1).padStart(2, '0');
          const day = String(curr.getDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${day}`);
          curr.setDate(curr.getDate() + 1);
          count++;
        }
        return dates;
      };

      const dates = getDatesInRange(startDate, endDate);
      const recargasPromises = dates.map(d => taecelGetSales({ config, fecha: d, bolsa: '1' }));
      const serviciosPromises = dates.map(d => taecelGetSales({ config, fecha: d, bolsa: '2' }));

      const [recargasResults, serviciosResults] = await Promise.all([
        Promise.all(recargasPromises),
        Promise.all(serviciosPromises)
      ]);

      let mergedRecargas: any[] = [];
      let mergedServicios: any[] = [];
      let errorMsg = '';

      recargasResults.forEach((res, i) => {
        if (res.success && Array.isArray(res.data)) {
          mergedRecargas = [...mergedRecargas, ...res.data];
        } else if (!res.success) {
          errorMsg += `Recargas [${dates[i]}]: ${res.message || 'Error'}. `;
        }
      });

      serviciosResults.forEach((res, i) => {
        if (res.success && Array.isArray(res.data)) {
          mergedServicios = [...mergedServicios, ...res.data];
        } else if (!res.success) {
          errorMsg += `Servicios [${dates[i]}]: ${res.message || 'Error'}. `;
        }
      });

      const sortFn = (a: any, b: any) => {
        return new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime();
      };
      mergedRecargas.sort(sortFn);
      mergedServicios.sort(sortFn);

      setHistoryRecargas(mergedRecargas);
      setHistoryServicios(mergedServicios);

      if (errorMsg && mergedRecargas.length === 0 && mergedServicios.length === 0) {
        setHistoryError(errorMsg);
      }
    } catch (e: any) {
      setHistoryError(e.message || 'Error de conexión');
      setHistoryRecargas([]);
      setHistoryServicios([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showSalesHistory) {
      fetchSalesHistory(historyStartDate, historyEndDate);
    }
  }, [showSalesHistory, historyStartDate, historyEndDate]);

  const handleReprintTicket = (tx: any) => {
    const isExitosa = (tx.Status || '').trim().toLowerCase() === 'exitosa';
    if (!isExitosa) return;

    const monto = parseFloat(String(tx.Monto || 0).replace(/[^0-9.]/g, '')) || 0;
    const comision = parseFloat(String(tx.Comision || 0).replace(/[^0-9.]/g, '')) || 0;
    const total = monto + comision;

    const detailDesc = tx.Descripcion || tx.Nota || `RECARGA ${tx.Carrier} $${monto.toFixed(2)}`;
    const rechargeItem = {
      itemId: `recharge-${tx.Carrier}`,
      name: `RECARGA ${tx.Carrier} $${monto.toFixed(2)} (${tx.Telefono || tx.Referencia})`,
      description: detailDesc,
      quantity: 1,
      price: monto
    };

    const commissionItem = {
      itemId: 'recharge-commission',
      name: `Comisión de Servicio`,
      description: `Comisión de Servicio`,
      quantity: 1,
      price: comision
    };

    const saleMapped = {
      id: tx.TransID || `TX${Date.now()}`,
      items: [rechargeItem, ...(comision > 0 ? [commissionItem] : [])],
      total: total,
      createdAt: tx.Fecha,
      paymentMethod: 'Efectivo',
      confirmationCode: `Folio Aut: ${tx.Folio} | Ref: ${tx.TransID}`,
      createdBy: currentUser?.name || ''
    };

    const html = buildRechargeTicketHtml(saleMapped as any, config);
    const effectivePosWidth = config.hybridPrintMode
      ? (config.posPaperWidth || '80mm')
      : (config.ticketPaperWidth || '80mm');
    const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : effectivePosWidth === 'media-carta-duplicado' ? 210000 : effectivePosWidth === 'media-carta' ? 215900 : 72000;
    const paperHeightMicrons = effectivePosWidth === 'media-carta' ? 139700 : effectivePosWidth === 'media-carta-duplicado' ? 297000 : undefined;
    const deviceName = config.hybridPrintMode
      ? (config.posPrinterBrand || config.ticketPrinterBrand || undefined)
      : (config.ticketPrinterBrand || undefined);

    // Enviar impresión mediante el despachador central de App.tsx para respetar perfiles de impresión y colas
    window.dispatchEvent(new CustomEvent('fm-silent-print', {
      detail: {
        html,
        deviceName,
        paperWidthMicrons,
        paperHeightMicrons,
        copies: 1,
        isLabel: false
      }
    }));

    // Despachar evento para feedback visual (toast en pantalla)
    window.dispatchEvent(new CustomEvent('automated-print', {
      detail: {
        type: 'ticket',
        name: `Reimpresión: ${tx.Carrier}`,
        details: `Folio Aut: ${tx.Folio || 'N/A'} • Ref: ${tx.TransID}`
      }
    }));
  };

  const handlePrintReport = () => {
    const totalRecargas = stats.totalRecargas;
    const totalServicios = stats.totalServicios;
    const totalComisiones = stats.totalComisiones;
    const totalVendido = totalRecargas + totalServicios;
    const currSym = config.currencySymbol || '$';
    
    // Generar las filas detalladas para Recargas (Tiempo Aire)
    let recargasRows = '';
    historyRecargas.forEach((tx: any) => {
      const isExitosa = (tx.Status || '').trim().toLowerCase() === 'exitosa';
      recargasRows += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${!isExitosa ? 'color: #94a3b8; text-decoration: line-through;' : ''}">
          <td style="padding: 8px 6px;">${tx.Carrier}</td>
          <td style="padding: 8px 6px; font-family: monospace;">${tx.Telefono || tx.Referencia || 'N/A'}</td>
          <td style="padding: 8px 6px;">${tx.Fecha}</td>
          <td style="padding: 8px 6px; font-family: monospace;">${tx.Folio || 'N/A'}</td>
          <td style="padding: 8px 6px; text-align: right;" class="font-bold">${currSym}${parseFloat(String(tx.Monto || 0).replace(/[^0-9.]/g, '')).toFixed(2)}</td>
          <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: ${isExitosa ? '#10b981' : '#ef4444'}">${tx.Status.trim()}</td>
        </tr>
      `;
    });

    // Generar las filas detalladas para Servicios
    let serviciosRows = '';
    historyServicios.forEach((tx: any) => {
      const isExitosa = (tx.Status || '').trim().toLowerCase() === 'exitosa';
      serviciosRows += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${!isExitosa ? 'color: #94a3b8; text-decoration: line-through;' : ''}">
          <td style="padding: 8px 6px;">${tx.Carrier}</td>
          <td style="padding: 8px 6px; font-family: monospace;">${tx.Telefono || tx.Referencia || 'N/A'}</td>
          <td style="padding: 8px 6px;">${tx.Fecha}</td>
          <td style="padding: 8px 6px; font-family: monospace;">${tx.Folio || 'N/A'}</td>
          <td style="padding: 8px 6px; text-align: right;" class="font-bold">${currSym}${parseFloat(String(tx.Monto || 0).replace(/[^0-9.]/g, '')).toFixed(2)}</td>
          <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: ${isExitosa ? '#10b981' : '#ef4444'}">${tx.Status.trim()}</td>
        </tr>
      `;
    });

    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reporte de Ventas Taecel</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            padding: 30px;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 2px solid #ccc; margin: 15px 0; }
          .header { font-size: 22px; font-weight: bold; margin-bottom: 5px; color: #1e3a8a; text-transform: uppercase; }
          .section-title { font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 25px 0 10px 0; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; text-transform: uppercase; }
          
          .summary-container { display: flex; gap: 15px; margin-bottom: 25px; width: 100%; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; text-align: center; flex: 1; }
          .summary-card .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .summary-card .val { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; font-weight: bold; font-size: 11px; color: #475569; text-transform: uppercase; text-align: left; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="text-center header">${config.storeName || 'FixManager POS'}</div>
        <div class="text-center font-bold" style="font-size: 16px;">REPORTE DE VENTAS TAECEL</div>
        <div class="text-center" style="font-size: 12px; color: #666; margin-top: 5px;">
          Periodo: ${historyStartDate.split('-').reverse().join('/')} 
          ${historyStartDate !== historyEndDate ? ` al ${historyEndDate.split('-').reverse().join('/')}` : ''}
        </div>
        <div class="divider"></div>
        
        <div class="summary-container">
          <div class="summary-card">
            <div class="label">Total Recargas</div>
            <div class="val" style="color: #3b82f6;">${currSym}${totalRecargas.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Servicios</div>
            <div class="val" style="color: #10b981;">${currSym}${totalServicios.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Comisiones</div>
            <div class="val" style="color: #f59e0b;">${currSym}${totalComisiones.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Operaciones Exitosas</div>
            <div class="val" style="color: #0f172a;">${stats.successful} de ${stats.totalCount}</div>
          </div>
        </div>

        <div class="section-title">Detalle de Tiempo Aire (Recargas)</div>
        <table>
          <thead>
            <tr>
              <th style="padding: 8px 6px;">Operador</th>
              <th style="padding: 8px 6px;">Número Celular</th>
              <th style="padding: 8px 6px;">Fecha/Hora</th>
              <th style="padding: 8px 6px;">Folio Aut.</th>
              <th style="padding: 8px 6px; text-align: right;">Monto</th>
              <th style="padding: 8px 6px; text-align: right;">Estatus</th>
            </tr>
          </thead>
          <tbody>
            ${recargasRows || '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #94a3b8; font-style: italic;">No se realizaron recargas en este periodo</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Detalle de Pago de Servicios y Pines</div>
        <table>
          <thead>
            <tr>
              <th style="padding: 8px 6px;">Servicio</th>
              <th style="padding: 8px 6px;">Referencia</th>
              <th style="padding: 8px 6px;">Fecha/Hora</th>
              <th style="padding: 8px 6px;">Folio Aut.</th>
              <th style="padding: 8px 6px; text-align: right;">Monto</th>
              <th style="padding: 8px 6px; text-align: right;">Estatus</th>
            </tr>
          </thead>
          <tbody>
            ${serviciosRows || '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #94a3b8; font-style: italic;">No se realizaron pagos de servicios en este periodo</td></tr>'}
          </tbody>
        </table>
        
        <div class="text-center" style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Reporte generado el: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `;

    // Despachar el reporte A4 al previsualizador central de App.tsx (setA4ReportPreview)
    window.dispatchEvent(new CustomEvent('fm-silent-print', {
      detail: {
        html,
        deviceName: config.reportPrinterName || '',
        paperWidthMicrons: 210000,
        paperHeightMicrons: 297000,
        isReport: true
      }
    }));
  };

  const handleReportarCompra = async () => {
    console.log('[RecargasView] handleReportarCompra click triggered');
    setErrorMsg(null);
    try {
      console.log('[RecargasView] Calling taecelGetReporteCompraUrl with config:', config);
      const res = await taecelGetReporteCompraUrl(config);
      console.log('[RecargasView] taecelGetReporteCompraUrl response:', res);
      if (res.success && res.urlReporte) {
        if (isMobile) {
          window.open(res.urlReporte, '_blank');
        } else {
          setReportarCompraUrl(res.urlReporte);
          setShowReportarCompraModal(true);
        }
      } else {
        console.warn('[RecargasView] Reportar compra url request failed:', res);
        setErrorMsg(res.message || 'No se pudo generar la URL para reportar la compra.');
      }
    } catch (err: any) {
      console.error('[RecargasView] Exception in handleReportarCompra:', err);
      setErrorMsg(err.message || 'Error de conexión al generar reporte de compra.');
    }
  };

  const resolveProductCode = (): string | undefined => {
    if (!selectedCarrier || !selectedAmount) return undefined;
    
    const amountNum = parseFloat(String(selectedAmount));
    
    // 1. Intentar coincidencia exacta por ID de Carrier (para carriers cargados dinámicamente de la API)
    const productByCarrierId = taecelProducts.find((p: any) => {
      if (p.CarrierID !== undefined && p.CarrierID !== null && String(p.CarrierID) === String(selectedCarrier.id)) {
        if (selectedCarrier.type === 'servicio') {
          return true;
        }
        return parseFloat(p.Monto) === amountNum;
      }
      return false;
    });

    if (productByCarrierId) {
      return productByCarrierId.Codigo;
    }

    // 2. Coincidencia por nombre o fallback clásico (para los hardcoded o si falla el ID)
    let targetCatId = '1';
    if (selectedCarrier.type === 'paquete') targetCatId = '2';
    else if (selectedCarrier.type === 'servicio') targetCatId = '3';
    else if (selectedCarrier.type === 'pin') targetCatId = '4';

    const product = taecelProducts.find((p: any) => {
      if (p.CategoriaID !== targetCatId) return false;
      if (selectedCarrier.type !== 'servicio' && parseFloat(p.Monto) !== amountNum) return false;
      
      const apiCarrier = p.Carrier.toLowerCase();
      const carrierIdUpper = selectedCarrier.id.toUpperCase();
      
      if (carrierIdUpper.startsWith('TELCEL') && apiCarrier.includes('telcel')) return true;
      if (carrierIdUpper.startsWith('MOVISTAR') && apiCarrier.includes('movistar')) return true;
      if ((carrierIdUpper.startsWith('ATT') || carrierIdUpper.startsWith('AT&T')) && (apiCarrier.includes('att') || apiCarrier.includes('at&t') || apiCarrier.includes('nextel') || apiCarrier.includes('iusacell'))) return true;
      if (carrierIdUpper.startsWith('UNEFON') && apiCarrier.includes('unefon')) return true;
      if (carrierIdUpper.startsWith('BAIT') && apiCarrier.includes('bait')) return true;
      if (carrierIdUpper.startsWith('VIRGIN') && apiCarrier.includes('virgin')) return true;
      if (carrierIdUpper.startsWith('CFE') && apiCarrier.includes('cfe')) return true;
      if (carrierIdUpper.startsWith('TELMEX') && apiCarrier.includes('telmex')) return true;
      if (carrierIdUpper.startsWith('IZZI') && apiCarrier.includes('izzi')) return true;
      if (carrierIdUpper.startsWith('SKY') && apiCarrier.includes('sky')) return true;
      if (carrierIdUpper.startsWith('DISH') && apiCarrier.includes('dish')) return true;
      if (carrierIdUpper.startsWith('NETFLIX') && apiCarrier.includes('netflix')) return true;
      if (carrierIdUpper.startsWith('SPOTIFY') && apiCarrier.includes('spotify')) return true;
      if (carrierIdUpper.startsWith('XBOX') && apiCarrier.includes('xbox')) return true;
      if (carrierIdUpper.startsWith('PLAYSTATION') && apiCarrier.includes('playstation')) return true;
      if (carrierIdUpper.startsWith('GOOGLE_PLAY') && (apiCarrier.includes('google') || apiCarrier.includes('play'))) return true;
      if (carrierIdUpper.startsWith('APPLE') && apiCarrier.includes('apple')) return true;
      if (carrierIdUpper.startsWith('CINEPOLIS') && apiCarrier.includes('cinepolis')) return true;
      if (carrierIdUpper.startsWith('INFONAVIT') && apiCarrier.includes('infonavit')) return true;
      if (carrierIdUpper.startsWith('TELEVIA') && (apiCarrier.includes('televia') || apiCarrier.includes('pase'))) return true;
      if (carrierIdUpper.startsWith('AGUA') && apiCarrier.includes('agua')) return true;

      // Coincidencia genérica si el nombre contiene la palabra clave
      if (apiCarrier.includes(selectedCarrier.name.toLowerCase())) return true;

      return false;
    });

    return product ? product.Codigo : undefined;
  };

  // Autoresetear campos al cambiar de operador y hacer foco automático
  useEffect(() => {
    setPhoneOrReference('');
    setConfirmPhoneOrReference('');
    setSelectedAmount('');
    setPaymentMethod(null);
    setShowCheckoutModal(false);
    setPayCash('');
    setPayCard('');
    setCardVoucherRef('');
    setPrintTicket(true);
    setWhatsappPhone('');
    setErrorMsg(null);
    setMobilePaymentMode('efectivo');

    if (selectedCarrier) {
      setTimeout(() => {
        phoneRef.current?.focus();
      }, 50);
    }
  }, [selectedCarrier]);

  // Catálogo filtrado
  const carrierListSource = apiCarriers.length > 0 ? apiCarriers : TAECEL_CARRIERS;

  const filteredCarriers = carrierListSource.filter(
    (c) =>
      c.type === selectedType &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Encontrar el producto seleccionado actualmente de Taecel para extraer descripción/vigencia
  const selectedProduct = useMemo(() => {
    if (!selectedCarrier || !selectedAmount) return null;
    const amountNum = parseFloat(String(selectedAmount));
    return taecelProducts.find((p: any) => {
      // 1. Intentar por CarrierID
      if (p.CarrierID !== undefined && p.CarrierID !== null && String(p.CarrierID) === String(selectedCarrier.id)) {
        if (selectedCarrier.type === 'servicio') return true;
        return parseFloat(p.Monto) === amountNum;
      }
      // 2. Fallback por nombre
      if (p.Carrier.toLowerCase() === selectedCarrier.name.toLowerCase() || selectedCarrier.name.toLowerCase().includes(p.Carrier.toLowerCase())) {
        if (selectedCarrier.type === 'servicio') return true;
        return parseFloat(p.Monto) === amountNum;
      }
      return false;
    });
  }, [selectedCarrier, selectedAmount, taecelProducts]);

  // Comisión sugerida o configurada
  const comisionRecarga = config.taecelComisionRecarga !== undefined ? config.taecelComisionRecarga : 3.0;
  const comisionServicio = config.taecelComisionServicio !== undefined ? config.taecelComisionServicio : 10.0;
  const currentCommission =
    (selectedCarrier?.type === 'servicio' || selectedCarrier?.type === 'pin') ? comisionServicio : comisionRecarga;

  const totalToCollect = (Number(selectedAmount) || 0) + currentCommission;

  // Validación por pasos dinámicos progresivos
  const cleanPhone = phoneOrReference.replace(/\D/g, '');
  const cleanConfirm = confirmPhoneOrReference.replace(/\D/g, '');

  const isStep1Valid =
    selectedCarrier !== null &&
    (selectedCarrier.type === 'servicio'
      ? cleanPhone.length >= 4
      : cleanPhone.length === 10);

  const isStep2Valid =
    isStep1Valid &&
    cleanConfirm === cleanPhone;

  const isStep3Valid =
    isStep2Valid &&
    selectedAmount !== '' &&
    selectedAmount > 0;

  const isInputMatch = isStep2Valid;
  
  const isFormValid =
    isStep3Valid &&
    !isProcessing;

  const handleProcessTransactionWithOptions = async (opts: { printTicket: boolean; sendWhatsApp: boolean; whatsappPhone: string }) => {
    if (!isStep3Valid || !selectedCarrier) return;
    setErrorMsg(null);
    setIsProcessing(true);

    const folioInterno = generateNextSaleId(sales, isMobile ? 'RC' : 'R');
    const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
    const resolvedPaymentMethod = (Number(payCash) || 0) > 0 && (Number(payCard) || 0) > 0
      ? 'Mixto'
      : ((Number(payCard) || 0) > 0 ? 'Tarjeta' : 'Efectivo');

    try {
      const productCode = resolveProductCode();
      const res = await taecelRequestRecharge({
        config,
        carrierId: selectedCarrier.id,
        amount: Number(selectedAmount),
        phoneOrReference: cleanPhone,
        folioInterno,
        productCode
      });

      if (res.success && res.transactionId && res.authorizationFolio) {
        // Actualizar balance local en caso de sandbox
        if (res.balance !== undefined) {
          setBalance(res.balance);
        } else {
          // Si no devuelve balance, forzar recarga de balance
          fetchBalance();
        }

        const fullDetail = [
          selectedProduct?.Descripcion,
          selectedProduct?.Vigencia && !selectedProduct.Descripcion?.toLowerCase().includes(selectedProduct.Vigencia.toLowerCase()) 
            ? `Vigencia: ${selectedProduct.Vigencia}` 
            : null
        ].filter(Boolean).join(' - ');

        const rechargeItem: SaleItem = {
          itemId: `recharge-${selectedCarrier.id}`,
          name: `${selectedCarrier.name} $${selectedAmount} (${phoneOrReference})`,
          quantity: 1,
          price: Number(selectedAmount),
          description: fullDetail || selectedProduct?.Descripcion || undefined
        };

        const commissionItem: SaleItem = {
          itemId: 'recharge-commission',
          name: `Comisión de Recarga / Pago de Servicio`,
          quantity: 1,
          price: currentCommission
        };

        const saleTicketNum = extractSaleTicketNumber(folioInterno);
        const newSale: Sale = {
          id: folioInterno,
          items: [rechargeItem, commissionItem],
          total: totalToCollect,
          paymentMethod: resolvedPaymentMethod,
          createdAt: new Date().toISOString(),
          ticketNumber: saleTicketNum,
          confirmationCode: `Folio Aut: ${res.authorizationFolio} | Ref: ${res.transactionId}${
            resolvedPaymentMethod === 'Mixto'
              ? ` | Efe: $${(Number(payCash) || 0).toFixed(2)} | T/T: $${(Number(payCard) || 0).toFixed(2)}`
              : (resolvedPaymentMethod === 'Tarjeta' && cardVoucherRef ? ` | Voucher: ${cardVoucherRef}` : '')
          }`,
          cashReceived: (Number(payCash) || 0),
          cardReceived: (Number(payCard) || 0),
          change: Math.max(0, totalReceived - totalToCollect)
        };

        // Cerrar modal de cobro si estaba abierto
        setShowCheckoutModal(false);

        // Completar venta y mandar a imprimir ticket de recarga
        onCompleteSale(newSale, { 
          printTicket: opts.printTicket, 
          sendWhatsApp: opts.sendWhatsApp, 
          whatsappPhone: opts.whatsappPhone 
        });

        // Mostrar éxito
        setSuccessData({
          txId: res.transactionId,
          folio: res.authorizationFolio,
          carrierName: selectedCarrier.name,
          phone: phoneOrReference,
          amount: Number(selectedAmount),
          commission: currentCommission
        });
      } else {
        setErrorMsg(res.message);
        setShowCheckoutModal(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Ocurrió un error inesperado al procesar la recarga.');
      setShowCheckoutModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setPhoneOrReference('');
    setConfirmPhoneOrReference('');
    setSelectedAmount('');
    setPaymentMethod(null);
    setShowCheckoutModal(false);
    setPayCash('');
    setPayCard('');
    setCardVoucherRef('');
    setPrintTicket(true);
    setWhatsappPhone('');
    setErrorMsg(null);
    setSelectedCarrier(null);
    fetchBalance();
  };

  const handleConfirmRechargeCheckout = (sendWA: boolean, shouldPrint?: boolean) => {
    const finalPrint = shouldPrint !== undefined ? shouldPrint : (sendWA ? false : printTicket);
    handleProcessTransactionWithOptions({
      printTicket: finalPrint,
      sendWhatsApp: sendWA,
      whatsappPhone: whatsappPhone.replace(/\D/g, '') || cleanPhone
    });
  };

  // Atajos de teclado en el Checkout
  useEffect(() => {
    if (!showCheckoutModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setPrintTicket(prev => !prev);
      }
      if (e.key === 'F5') {
        e.preventDefault();
        const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
        if (totalReceived >= totalToCollect) {
          handleConfirmRechargeCheckout(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCheckoutModal, payCash, payCard, totalToCollect, printTicket, whatsappPhone]);

  return (
    <div className={`w-full h-full flex flex-col md:flex-row ${isMobile ? 'gap-0 p-0' : 'md:gap-5 gap-0 md:p-5 p-0'} overflow-hidden select-none`}>
      {/* ─── COLUMNA IZQUIERDA: CATÁLOGO Y COMPAÑÍAS ─── */}
      <div className={`w-full ${isMobile ? 'flex-1' : 'md:w-5/12'} flex flex-col ${
        isMobile ? 'rounded-none border-none shadow-none' : 'md:rounded-3xl rounded-none md:border border-none md:shadow-xs shadow-none'
      } overflow-hidden ${
        isMobile 
          ? (selectedCarrier ? 'hidden' : 'flex') 
          : (selectedCarrier ? 'hidden md:flex' : 'flex')
      } ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/80 border-zinc-900'
      }`}>
        <div className={`p-4 border-b flex flex-col gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f172a]/40 border-zinc-900'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isMobile && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer mr-1 ${
                    isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-zinc-800 text-zinc-250 hover:bg-zinc-700'
                  }`}
                >
                  <span className="text-base font-black">✕</span>
                </button>
              )}
              <h2 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                📱 Servicios y Recargas
              </h2>
            </div>
            
            {/* Saldo Badge */}
            <div className="flex items-center gap-2">
              {isSandbox && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 animate-pulse">
                  Sandbox
                </span>
              )}
              <div 
                onClick={fetchBalance}
                title={balanceError || "Actualizar saldo"}
                className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-black font-mono cursor-pointer transition-all border select-none ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100' 
                    : 'bg-zinc-950 border-zinc-850 text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {isLoadingBalance ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 hover:rotate-180 transition-transform duration-300 text-slate-500 shrink-0" />
                )}
                <div className="flex items-center gap-3.5 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] opacity-60 font-sans tracking-wide uppercase font-black">Aire:</span>
                    <span className={balanceError && balance === null ? "text-rose-500 font-black" : "font-black"}>
                      {balance !== null ? `${currency}${balance.toFixed(2)}` : '$---'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] opacity-60 font-sans tracking-wide uppercase font-black">Servicios:</span>
                    <span className={balanceError && balanceServices === null ? "text-rose-500 font-black" : "font-black"}>
                      {balanceServices !== null ? `${currency}${balanceServices.toFixed(2)}` : '$---'}
                    </span>
                  </div>
                  {balanceError && (
                    <span className="text-rose-500 text-[10px] font-black" title={balanceError}>
                      ⚠️ Error
                    </span>
                  )}
                </div>
              </div>

              {/* Historial Taecel Button */}
              <div 
                onClick={() => setShowSalesHistory(true)}
                title="Historial de Ventas Taecel"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black cursor-pointer transition-all border whitespace-nowrap ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100' 
                    : 'bg-zinc-950 border-zinc-850 text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Historial</span>
              </div>

              {/* Reportar Compra Button */}
              <div 
                onClick={handleReportarCompra}
                title="Reportar compra de saldo a Taecel"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black cursor-pointer transition-all border whitespace-nowrap ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100' 
                    : 'bg-zinc-950 border-zinc-850 text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Reportar Compra</span>
              </div>
            </div>
          </div>

          {/* Error General (visible cuando no hay operador seleccionado) */}
          {errorMsg && !selectedCarrier && (
            <div className={`p-3 rounded-xl border bg-rose-500/10 border-rose-500/30 text-xs font-semibold flex items-start gap-2 animate-shake ${
              isLight ? 'text-rose-600' : 'text-rose-400'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 flex justify-between items-center gap-2">
                <span>{errorMsg}</span>
                <button 
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer select-none"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Categorías Tabs */}
          <div className={`flex rounded-xl p-1 border ${isLight ? 'bg-slate-200/50 border-slate-300/40' : 'bg-zinc-950 border-zinc-900'}`}>
            {(['recarga', 'paquete', 'servicio', 'pin'] as const).map((t) => {
              const isActive = selectedType === t;
              const isTabDisabled = (t === 'recarga' || t === 'paquete') ? isAirtimeDisabled : isServicesDisabled;
              const labels = {
                recarga: 'Tiempo Aire',
                paquete: 'Paquetes',
                servicio: 'Servicios',
                pin: 'Servicios de Aplicaciones'
              };
              const activeStyles = {
                recarga: isLight
                  ? 'bg-blue-500/10 text-blue-600 border-blue-200 shadow-sm'
                  : 'bg-blue-500/25 text-blue-300 border-blue-500/40 shadow-sm',
                paquete: isLight
                  ? 'bg-amber-500/10 text-amber-700 border-amber-250 shadow-sm'
                  : 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm',
                servicio: isLight
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-250 shadow-sm'
                  : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm',
                pin: isLight
                  ? 'bg-purple-500/10 text-purple-700 border-purple-250 shadow-sm'
                  : 'bg-purple-500/25 text-purple-300 border-purple-500/40 shadow-sm'
              };
              const icons = {
                recarga: IconTiempoAire,
                paquete: IconPaquetes,
                servicio: IconServicios,
                pin: IconAppPins
              };
              const TabIcon = icons[t];
              
              return (
                <button
                  key={t}
                  disabled={isTabDisabled}
                  onClick={() => { setSelectedType(t); setSelectedCarrier(null); }}
                  className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border border-transparent ${
                    isTabDisabled
                      ? 'opacity-35 cursor-not-allowed pointer-events-none'
                      : isActive
                        ? activeStyles[t]
                        : isLight
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  <TabIcon isSelected={isActive} />
                  <span className="hidden sm:inline">{labels[t]}</span>
                </button>
              );
            })}
          </div>

          {/* Buscador */}
          <div className={`relative ${isAllDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
            <input
              type="text"
              placeholder={`Buscar compañía / servicio...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none font-semibold ${
                isLight 
                  ? 'bg-white border-slate-300 focus:border-blue-500 text-slate-850' 
                  : 'bg-zinc-900 border-zinc-800 focus:border-cyan-500 text-zinc-200'
              }`}
            />
          </div>
        </div>

        {/* Contenedor de la Lista y la Marca de Agua */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Lista de Compañías */}
          <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar ${isAllDisabled ? 'opacity-40 pointer-events-none font-medium' : ''}`}>
            {filteredCarriers.length === 0 ? (
              <div className={`text-center py-10 text-xs font-semibold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                Ninguna compañía coincide con la búsqueda.
              </div>
            ) : (
              filteredCarriers.map((c) => {
                const isSelected = selectedCarrier?.id === c.id;
                const brand = getBrandStyle(c.id, isLight);
                
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCarrier(c)}
                    className={`pl-3 pr-4 py-3.5 rounded-2xl border border-l-0 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] hover:-translate-y-[1.5px] ${
                      isSelected
                        ? `${brand.bgSelected} shadow-xs font-bold`
                        : isLight 
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-350 text-slate-700' 
                          : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                    }`}
                    style={{
                      borderLeft: `4px solid ${brand.accentColor}`
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      {renderCarrierLogo(c.id, c.name, c.logoUrl, isSelected)}
                      <div>
                        <span className={`text-xs font-black uppercase block leading-tight ${isSelected ? brand.textSelected : ''}`}>{c.name}</span>
                        {c.description && (
                          <span className="text-[8.5px] font-semibold opacity-70 block mt-0.5">{c.description}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-500 font-bold shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {isAllDisabled && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[1px] pointer-events-none select-none">
              <div className={`max-w-[280px] p-5 rounded-3xl border shadow-lg transition-all duration-300 ${
                isLight 
                  ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/80' 
                  : 'bg-zinc-950/95 border-zinc-800 text-zinc-200 shadow-black/80'
              }`}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2.5 text-rose-500 animate-pulse" />
                <h3 className="text-[11px] font-black uppercase tracking-wider mb-1">
                  {balanceError ? 'Conexión Inactiva' : 'Sin Saldo en Taecel'}
                </h3>
                <p className="text-[10px] font-bold opacity-80 leading-normal">
                  {balanceError 
                    ? 'No se pudo obtener el saldo de la API. Verifica tu conexión de red o la configuración de tus credenciales de Taecel.' 
                    : 'Las funciones de recarga y cobro de servicios se encuentran inactivas por falta de saldo.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── COLUMNA DERECHA: FORMULARIO DE COBRO ─── */}
      <div className={`flex-1 flex flex-col ${
        isMobile ? 'rounded-none border-none shadow-none' : 'md:rounded-3xl rounded-none md:border border-none md:shadow-xs shadow-none'
      } overflow-hidden ${
        isMobile 
          ? (selectedCarrier ? 'flex' : 'hidden') 
          : (selectedCarrier ? 'flex' : 'hidden md:flex')
      } ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0b1020]/85 border-zinc-900'
      }`}>
        {!selectedCarrier ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4 bg-radial from-slate-100/50 via-transparent to-transparent dark:bg-none">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <div className="max-w-xs">
              <h3 className={`text-sm font-black uppercase tracking-wider mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                Selecciona un Operador
              </h3>
              <p className={`text-xs font-semibold leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Selecciona una compañía de la lista de la izquierda para configurar los detalles del cobro y procesar la recarga.
              </p>
            </div>
          </div>
        ) : (
          (() => {
            const brand = getBrandStyle(selectedCarrier.id, isLight);
            return (
              <div className={`flex-1 flex flex-col overflow-hidden ${isAllDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* Banner de Cabecera Dinámico */}
                <div 
                  className="h-28 relative flex items-end p-5 overflow-hidden transition-all duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${brand.accentColor}dd, ${brand.accentColor}25)`,
                    borderBottom: `1px solid ${brand.accentColor}30`
                  }}
                >
                  {/* Botón de regreso en móvil */}
                  <button
                    type="button"
                    onClick={() => setSelectedCarrier(null)}
                    className={`absolute top-3 left-3 z-20 ${isMobile ? 'block' : 'md:hidden'} w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>

                  {/* Círculos abstractos de fondo */}
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8 blur-md" />
                  <div className="absolute bottom-0 right-12 w-16 h-16 rounded-full bg-white/5 translate-y-4 blur-sm" />
                  
                  <div className="flex items-center gap-4 z-10 translate-y-3">
                    <div className="shadow-lg rounded-3xl bg-white border border-slate-200/50 overflow-hidden">
                      {renderCarrierLogo(selectedCarrier.id, selectedCarrier.name, selectedCarrier.logoUrl, false, true)}
                    </div>
                  </div>
                </div>

                <div className={`flex-1 flex flex-col overflow-y-auto p-5 md:p-6 ${isMobile ? 'justify-start gap-1' : 'justify-between'} mt-3 custom-scrollbar`}>
                  {/* Detalles del operador */}
                  <div className={isMobile ? 'mb-2' : 'mb-4'}>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-550/10 text-slate-500 w-max block mb-1">
                      {selectedType === 'recarga' ? 'Tiempo Aire' : selectedType === 'paquete' ? 'Paquete' : selectedType === 'servicio' ? 'Servicio' : 'Pin Electrónico'}
                    </span>
                    <h3 className={`text-base font-black uppercase tracking-wide leading-tight ${isLight ? 'text-slate-850' : 'text-zinc-200'}`}>
                      {selectedCarrier.name}
                    </h3>
                  </div>

                  {/* Inputs del formulario */}
                  <div className={`flex flex-col gap-5 max-w-md ${isMobile ? '' : 'flex-1'}`}>
                    {/* Teléfono o Referencia (Paso 1) */}
                    <div className="flex flex-col gap-1.5 transition-all duration-300">
                      <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-650' : 'text-zinc-400'}`}>
                        {selectedCarrier.fieldLabel || (selectedCarrier.type === 'servicio' ? 'Número de Referencia del Recibo' : 'Número Celular (10 dígitos)')}
                      </label>
                      <input
                        ref={phoneRef}
                        type="text"
                        maxLength={selectedCarrier.type === 'servicio' ? 40 : 14}
                        placeholder={selectedCarrier.fieldPlaceholder || (selectedCarrier.type === 'servicio' ? 'Ingresa la referencia o código de barras...' : 'Ej: (551) 234-5678')}
                        value={phoneOrReference}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (selectedCarrier.type === 'servicio') {
                            setPhoneOrReference(raw.replace(/\D/g, ''));
                          } else {
                            const formatted = formatPhoneNumber(raw);
                            setPhoneOrReference(formatted);
                            const clean = formatted.replace(/\D/g, '');
                            if (clean.length === 10) {
                              setTimeout(() => confirmPhoneRef.current?.focus(), 30);
                            }
                          }
                        }}
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none font-bold font-mono tracking-widest ${
                          isLight 
                            ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-850' 
                            : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-zinc-100'
                        }`}
                      />
                    </div>

                    {/* Confirmación del teléfono o referencia (Paso 2) */}
                    <div className={`flex flex-col gap-1.5 transition-all duration-300 ${!isStep1Valid ? 'opacity-30 pointer-events-none' : ''}`}>
                      <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-650' : 'text-zinc-400'}`}>
                        Confirmar {selectedCarrier.fieldLabel || (selectedCarrier.type === 'servicio' ? 'Referencia' : 'Número Celular')}
                      </label>
                      <input
                        ref={confirmPhoneRef}
                        disabled={!isStep1Valid}
                        type="text"
                        maxLength={selectedCarrier.type === 'servicio' ? 40 : 14}
                        placeholder={selectedCarrier.fieldPlaceholder ? `Confirma ${selectedCarrier.fieldPlaceholder.toLowerCase().replace('ingresa ', '')}` : (selectedCarrier.type === 'servicio' ? 'Vuelve a escribir la referencia para confirmar...' : 'Ej: (551) 234-5678')}
                        value={confirmPhoneOrReference}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (selectedCarrier.type === 'servicio') {
                            setConfirmPhoneOrReference(raw.replace(/\D/g, ''));
                          } else {
                            setConfirmPhoneOrReference(formatPhoneNumber(raw));
                          }
                        }}
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none font-bold font-mono tracking-widest ${
                          phoneOrReference && confirmPhoneOrReference && phoneOrReference !== confirmPhoneOrReference
                            ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500'
                            : isLight 
                              ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-850' 
                              : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-zinc-100'
                        }`}
                      />
                      {phoneOrReference && confirmPhoneOrReference && phoneOrReference !== confirmPhoneOrReference && (
                        <span className="text-[10px] font-bold text-rose-500 block">El número de confirmación no coincide.</span>
                      )}
                    </div>

                    {/* Monto (Paso 3) */}
                    <div className={`flex flex-col gap-1.5 transition-all duration-300 ${!isStep2Valid ? 'opacity-30 pointer-events-none' : ''}`}>
                      <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-650' : 'text-zinc-400'}`}>
                        Monto a Recargar
                      </label>
                      
                      {selectedCarrier.type === 'servicio' ? (
                        /* Campo numérico para servicios */
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">{currency}</span>
                          <input
                            disabled={!isStep2Valid}
                            type="number"
                            placeholder="0.00"
                            value={selectedAmount}
                            onChange={(e) => setSelectedAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className={`w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border outline-none font-black font-mono ${
                              isLight 
                                ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-850' 
                                : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-zinc-100'
                            }`}
                          />
                        </div>
                      ) : (
                        /* Grilla de montos sugeridos */
                        <div className="grid grid-cols-5 gap-2">
                          {(selectedCarrier.options || [10, 20, 50, 100, 200]).map((opt) => {
                            const isAmtSelected = selectedAmount === opt;
                            const colors = getBillColor(opt, isLight);
                            return (
                              <button
                                disabled={!isStep2Valid}
                                key={opt}
                                onClick={() => setSelectedAmount(opt)}
                                className={`relative h-12 rounded-lg border font-mono flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer select-none overflow-hidden text-white retro-white-text ${colors.bg} ${
                                  isAmtSelected ? colors.active : 'opacity-85 hover:opacity-100 hover:scale-[1.02] shadow-xs'
                                }`}
                              >
                                {/* Micro-esquina del billete */}
                                <span className="absolute top-0.5 left-1 text-[7px] font-black opacity-70 leading-none text-white retro-white-text">{opt}</span>
                                <span className="absolute bottom-0.5 right-1 text-[7px] font-black opacity-70 leading-none text-white retro-white-text">{opt}</span>
                                
                                {/* Centro del billete */}
                                <div className="flex-1 flex items-center justify-center font-black text-xs tracking-tight pt-1 text-white retro-white-text">
                                  {currency}{opt}
                                </div>
                                
                                {/* Línea decorativa del billete */}
                                <div className="w-full h-0.5 bg-white/25 rounded-full mt-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Ficha dinámica de detalles de recarga (Vigencia y Descripción de Taecel) */}
                      {selectedProduct && (selectedProduct.Vigencia || selectedProduct.Descripcion) && (
                        <div className={`mt-3 p-3.5 rounded-xl border flex flex-col gap-1.5 text-[11px] leading-relaxed transition-all duration-300 animate-fadeIn ${
                          isLight 
                            ? 'bg-amber-50/50 border-amber-250/60 text-slate-700' 
                            : 'bg-amber-950/15 border-amber-500/15 text-zinc-350'
                        }`}>
                          {selectedProduct.Vigencia && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold uppercase text-[9px] tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded-md text-amber-600">Vigencia</span>
                              <span className="font-mono font-black">{selectedProduct.Vigencia}</span>
                            </div>
                          )}
                          {selectedProduct.Descripcion && (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-extrabold uppercase text-[9px] tracking-wider text-amber-600">Detalles</span>
                              <span className="font-semibold">{selectedProduct.Descripcion}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Totales y Botón de Envío */}
                  <div className={`${isMobile ? 'mt-4' : 'mt-8'} pt-4 border-t transition-all duration-300 ${!isStep3Valid ? 'opacity-40' : ''} ${isLight ? 'border-slate-150' : 'border-zinc-900'}`}>
                    <div className="flex flex-col gap-1 mb-4">
                      <div className={`flex justify-between items-center text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        <span>Subtotal Recarga:</span>
                        <span className="font-mono">{currency}{(Number(selectedAmount) || 0).toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        <span>Comisión del Establecimiento:</span>
                        <span className="font-mono">{currency}{currentCommission.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center text-sm font-black mt-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                        <span>TOTAL A COBRAR:</span>
                        <span className="font-mono text-base">{currency}{totalToCollect.toFixed(2)}</span>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className={`p-3 mb-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-xs font-semibold flex items-start gap-2 animate-shake ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      disabled={!isFormValid || isProcessing}
                      onClick={() => {
                        setPaymentMethod('Efectivo');
                        setPayCash(totalToCollect);
                        setPayCard('');
                        setCardVoucherRef('');
                        setPrintTicket(true);
                        setWhatsappPhone(cleanPhone);
                        setShowCheckoutModal(true);
                        setMobilePaymentMode('efectivo');
                      }}
                      className={`w-full ${isMobile ? 'py-4 text-sm' : 'py-3 text-xs'} rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isFormValid && !isProcessing
                          ? 'bg-amber-500 hover:bg-amber-600 active:scale-98 text-white shadow-md'
                          : (isLight
                              ? 'bg-slate-200 text-slate-400 border-slate-300'
                              : 'bg-zinc-900 text-zinc-650 border-zinc-800/40') + ' cursor-not-allowed border'
                      }`}
                    >
                      📱 Cobrar y Aplicar Recarga
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* ─── MODAL DE COBRO UNIFICADO (CHECKOUT) ─── */}
      {showCheckoutModal && selectedCarrier && (
        isMobile ? (
          /* ─── MODAL DE COBRO UNIFICADO MÓVIL (BOTTOM SHEET STYLE) ─── */
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99998] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
            <div className="absolute inset-0" onClick={() => setShowCheckoutModal(false)} />
            
            <div className={`relative w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 flex flex-col gap-4 max-h-[92vh] overflow-hidden ${
              isLight ? 'bg-white text-slate-800' : 'bg-zinc-900 border border-zinc-800 text-white'
            }`}>
              
              {/* Header */}
              <div className="flex justify-between items-center shrink-0 border-b pb-2.5">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isLight ? 'text-blue-600' : 'text-emerald-400'
                  }`}>
                    Módulo de Cobro Móvil
                  </span>
                  <h3 className={`text-sm font-black leading-tight uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {mobileCheckoutStep === 1 ? 'Resumen de Venta' : 'Finalizar Cobro'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (mobileCheckoutStep === 2) {
                      setMobileCheckoutStep(1);
                    } else {
                      setShowCheckoutModal(false);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {mobileCheckoutStep === 2 ? '←' : '✕'}
                </button>
              </div>

              {mobileCheckoutStep === 1 ? (
                /* ── STEP 1: RESUMEN DE COBRO Y MÉTODOS DE PAGO ── */
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
                    {/* Resumen del Operador */}
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
                      isLight ? 'bg-slate-50/50 border-slate-150' : 'bg-zinc-950/20 border-zinc-850'
                    }`}>
                      {renderCarrierLogo(selectedCarrier.id, selectedCarrier.name, selectedCarrier.logoUrl, false, false)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase leading-tight">{selectedCarrier.name}</h4>
                        <p className="text-[11px] font-mono font-bold tracking-wider opacity-70 mt-1">{phoneOrReference}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider block text-zinc-400">Transacción</span>
                        <span className="text-xs font-mono font-black text-amber-500">
                          {currency}{Number(selectedAmount).toFixed(2)} + {currency}{currentCommission.toFixed(2)} com.
                        </span>
                      </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="flex flex-col gap-2">
                      <label className={`text-[10px] font-black uppercase tracking-wider ${
                        isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}>
                        Método de Pago:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMobilePaymentMode('efectivo');
                            setPayCash(totalToCollect);
                            setPayCard('');
                          }}
                          className={`p-3 px-1 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            mobilePaymentMode === 'efectivo'
                              ? isLight
                                ? 'bg-blue-50 border-blue-200 text-blue-600 font-black shadow-xs'
                                : 'bg-[#152347] border-blue-900/60 text-cyan-400 font-black shadow-xs'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-500'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-lg">🪙</span>
                          <span className="text-[10px] font-black uppercase tracking-wide">Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMobilePaymentMode('tarjeta');
                            setPayCard(totalToCollect);
                            setPayCash('');
                          }}
                          className={`p-3 px-1 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            mobilePaymentMode === 'tarjeta'
                              ? isLight
                                ? 'bg-blue-50 border-blue-200 text-blue-600 font-black shadow-xs'
                                : 'bg-[#152347] border-blue-900/60 text-cyan-400 font-black shadow-xs'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-500'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-lg">💳</span>
                          <span className="text-[10px] font-black uppercase tracking-wide">Tarjeta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMobilePaymentMode('mixto');
                            setPayCash('');
                            setPayCard('');
                          }}
                          className={`p-3 px-1 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            mobilePaymentMode === 'mixto'
                              ? isLight
                                ? 'bg-blue-50 border-blue-200 text-blue-600 font-black shadow-xs'
                                : 'bg-[#152347] border-blue-900/60 text-cyan-400 font-black shadow-xs'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-500'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-lg">🔀</span>
                          <span className="text-[10px] font-black uppercase tracking-wide">Mixto</span>
                        </button>
                      </div>
                    </div>

                    {/* Input Efectivo */}
                    {(mobilePaymentMode === 'efectivo' || mobilePaymentMode === 'mixto') && (
                      <div className="flex flex-col gap-2 transition-all">
                        <label className={`text-[10px] font-black uppercase tracking-wider ${
                          isLight ? 'text-slate-500' : 'text-zinc-400'
                        }`}>
                          Efectivo Entregado ($):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">{currency}</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={payCash}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                              setPayCash(val);
                              if (mobilePaymentMode === 'mixto' && val !== '') {
                                const remaining = Math.max(0, totalToCollect - Number(val));
                                  setPayCard(remaining || '');
                              }
                            }}
                            className={`w-full pl-8 pr-4 py-2.5 text-sm font-black font-mono rounded-xl focus:outline-none ${
                              isLight
                                ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500'
                                : 'bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500'
                            }`}
                          />
                        </div>
                        
                        {/* Accesos rápidos billetes */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[totalToCollect, 55, 100, 200, 500]
                            .filter((amt) => amt >= totalToCollect)
                            .filter((value, index, self) => self.indexOf(value) === index)
                            .map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setPayCash(val);
                                  if (mobilePaymentMode === 'mixto') {
                                    const remaining = Math.max(0, totalToCollect - val);
                                    setPayCard(remaining || '');
                                  }
                                }}
                                className={`px-3 py-1.5 font-mono font-black text-[10px] rounded-xl border transition-all cursor-pointer ${
                                  payCash === val
                                    ? isLight
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                                      : 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-xs'
                                    : isLight
                                      ? 'bg-slate-50 border-slate-205 text-slate-750 hover:bg-slate-100'
                                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-850'
                                }`}
                              >
                                {val === totalToCollect ? `Exacto (${currency}${val})` : `${currency}${val}`}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Input Tarjeta Monto (solo para Mixto) */}
                    {mobilePaymentMode === 'mixto' && (
                      <div className="flex flex-col gap-2 transition-all">
                        <label className={`text-[10px] font-black uppercase tracking-wider ${
                          isLight ? 'text-slate-500' : 'text-zinc-400'
                        }`}>
                          Monto con Tarjeta / Transfer ($):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">{currency}</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={payCard}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                              setPayCard(val);
                              if (val !== '') {
                                const remaining = Math.max(0, totalToCollect - Number(val));
                                setPayCash(remaining || '');
                              }
                            }}
                            className={`w-full pl-8 pr-4 py-2.5 text-sm font-black font-mono rounded-xl focus:outline-none ${
                              isLight
                                ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500'
                                : 'bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Input Folio Tarjeta */}
                    {(mobilePaymentMode === 'tarjeta' || mobilePaymentMode === 'mixto') && (
                      <div className="flex flex-col gap-2 transition-all">
                        <label className={`text-[10px] font-black uppercase tracking-wider ${
                          isLight ? 'text-slate-500' : 'text-zinc-400'
                        }`}>
                          Código / ID Folio de Operación Terminal (Opcional):
                        </label>
                        <input
                          type="text"
                          value={cardVoucherRef}
                          placeholder="Ej. T-184729"
                          onChange={(e) => setCardVoucherRef(e.target.value)}
                          className={`w-full px-4 py-2.5 text-sm font-bold font-mono rounded-xl focus:outline-none ${
                            isLight
                              ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500'
                              : 'bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* Resumen de cobro */}
                    {(() => {
                      const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
                      const isEnough = totalReceived >= totalToCollect;
                      const diff = Math.abs(totalReceived - totalToCollect);
                      return (
                        <div className="mt-4 pt-3 border-t flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="opacity-75">MXN Recibido:</span>
                            <span className="font-mono font-bold">{currency}{totalReceived.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="opacity-75">Cambio a devolver:</span>
                            <span className={`font-mono font-bold ${isEnough && diff > 0.005 ? 'text-emerald-500' : ''}`}>
                              {currency}{isEnough ? diff.toFixed(2) : (0).toFixed(2)}
                            </span>
                          </div>
                          {!isEnough && (
                            <div className="text-[10px] font-black text-rose-500 uppercase mt-0.5 animate-pulse">
                              * El monto recibido es menor al total de {currency}{totalToCollect.toFixed(2)}
                            </div>
                          )}
                          <div className="flex justify-between items-center text-sm font-black mt-2">
                            <span className="uppercase tracking-wider">Total a Cobrar:</span>
                            <span className="font-mono text-lg">{currency}{totalToCollect.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sticky Footer */}
                  {(() => {
                    const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
                    const isEnough = totalReceived >= totalToCollect;
                    return (
                      <div className={`border-t pt-3 mt-2 shrink-0 ${isLight ? 'bg-white' : 'bg-zinc-900'}`}>
                        <button
                          type="button"
                          disabled={!isEnough}
                          onClick={() => setMobileCheckoutStep(2)}
                          className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            isEnough
                              ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-650 cursor-not-allowed border border-slate-200 dark:border-zinc-800'
                          }`}
                        >
                          ✓ Confirmar Cobro
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ── STEP 2: BOTONES DE FINALIZAR COBRO MÓVIL ── */
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar justify-center">
                  <div className="text-center space-y-1.5 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      isLight ? 'text-blue-500' : 'text-emerald-400'
                    }`}>
                      Venta por {currency}{totalToCollect.toFixed(2)}
                    </span>
                    <h3 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      FINALIZAR COBRO
                    </h3>
                    <p className={`text-[11px] leading-relaxed max-w-xs mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Elige cómo deseas procesar la venta y entregar el comprobante:
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full">
                    {/* Solo cobrar */}
                    <button
                      type="button"
                      onClick={() => {
                        setPrintTicket(false);
                        handleConfirmRechargeCheckout(false, false);
                      }}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all duration-155 active:scale-95 cursor-pointer text-left ${
                        isLight 
                          ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800' 
                          : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-white'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shrink-0 font-black">
                        💵
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black uppercase tracking-wide">Solo Cobrar</h4>
                        <p className="text-xs font-semibold leading-tight mt-0.5 opacity-70">Registra la venta sin imprimir ticket ni enviar WhatsApp.</p>
                      </div>
                    </button>

                    {/* Cobrar e imprimir */}
                    <button
                      type="button"
                      onClick={() => {
                        setPrintTicket(true);
                        handleConfirmRechargeCheckout(false, true);
                      }}
                      className="w-full p-4 rounded-2xl border border-blue-500 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-155 cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-4 text-white text-left"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
                        <Printer className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black uppercase tracking-wide text-white drop-shadow-xs">Cobrar e Imprimir Ticket</h4>
                        <p className="text-xs font-bold text-white/95 leading-tight mt-0.5">Registra la venta e imprime el comprobante térmico físico.</p>
                      </div>
                    </button>

                    {/* Cobrar y WhatsApp */}
                    {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                      <button
                        type="button"
                        onClick={isWaIntegratedOffline ? () => window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.') : () => {
                          handleConfirmRechargeCheckout(true, false);
                        }}
                        title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 text-white text-left transition-all duration-155 cursor-pointer shadow-lg ${
                          isWaIntegratedOffline 
                            ? 'bg-zinc-500 hover:bg-zinc-550 border border-zinc-600 grayscale shadow-zinc-500/30'
                            : 'bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 border border-emerald-500/80 shadow-emerald-500/30'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
                          <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black uppercase tracking-wide text-white drop-shadow-xs">Cobrar y Enviar por WhatsApp</h4>
                          <p className="text-xs font-bold text-white/95 leading-tight mt-0.5">Genera la imagen del ticket térmico y abre el chat de WhatsApp.</p>
                        </div>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileCheckoutStep(1)}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer mt-4 ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    Volver Atrás
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── MODAL DE COBRO DE ESCRITORIO (Mantiene el diseño retro original) ─── */
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 w-full max-w-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.5)] flex flex-col font-sans overflow-hidden select-none" style={{ color: '#000' }}>
              
              {/* Barra superior azul */}
              <div id="pos-sale-confirm-header" className="bg-[#000080] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5" style={{ color: '#fff' }}>
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-1.5 py-0.5 rounded select-none" style={{ color: '#fff' }}>
                    Cliente
                  </span>
                  <h3 className="text-sm font-black tracking-tight uppercase truncate max-w-xs" style={{ color: '#fff' }}>
                    PÚBLICO GENERAL
                  </h3>
                </div>
                
                <div id="pos-cobro-total-box" className="flex items-center gap-2 bg-black px-3.5 py-1.5 border-2 border-zinc-500 rounded text-right min-w-[200px] justify-between md:justify-end" style={{ color: '#fff' }}>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Cobro total:</span>
                  <div className="text-xl md:text-2xl font-mono font-black tracking-tighter text-yellow-400">
                    {currency}{totalToCollect.toFixed(2)} de {currency}{totalToCollect.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Accesos Rápidos de Teclado */}
              <div className="bg-[#cbcbcb] text-zinc-700 px-3.5 py-1.5 border-b border-zinc-400 text-[10px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 select-none font-bold">
                <span className="text-zinc-500">ACCIONES:</span>
                <span>[F2] {printTicket ? '✔' : '❌'} Imprimir Ticket</span>
                <span>[F5] Confirmar Venta</span>
              </div>

              {/* Main body area */}
              <div className="p-4 md:p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-[#eaeef3]">
                
                {/* Ficha Resumen de la Recarga */}
                <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex items-center justify-between gap-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    {renderCarrierLogo(selectedCarrier.id, selectedCarrier.name, selectedCarrier.logoUrl, false, false)}
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider block text-zinc-500 leading-none">
                        {selectedCarrier.name}
                      </span>
                      <span className="text-sm font-mono font-black tracking-wider block text-slate-900 mt-1">
                        {phoneOrReference}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider block text-zinc-400">Transacción</span>
                    <span className="text-sm font-mono font-bold text-amber-500">
                      {currency}{Number(selectedAmount).toFixed(2)} + {currency}{currentCommission.toFixed(2)} com.
                    </span>
                  </div>
                </div>

                {/* MXN Efectivo input row */}
                <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 max-w-sm w-full">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-250 select-none">
                        🪙
                      </div>
                      <div>
                        <span className="block text-xs font-extrabold text-slate-900 leading-none">MXN Efectivo</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Dinero entregado a mano</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-base font-black text-slate-500">{currency}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={payCash}
                          onChange={(e) => setPayCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-48 bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] pl-8 pr-3 py-2 text-base text-black font-mono font-black text-right shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>

                  {/* Accesos Rápidos a Billetes */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-zinc-200">
                    {[totalToCollect, 50, 100, 200, 500]
                      .filter((amt) => amt >= totalToCollect)
                      .filter((value, index, self) => self.indexOf(value) === index)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPayCash(val)}
                          className={`px-2.5 py-1.5 font-mono font-black text-[10px] border-2 transition-all cursor-pointer ${
                            payCash === val
                              ? 'bg-amber-500 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700 text-white'
                              : 'bg-slate-100 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 text-slate-800 hover:bg-slate-200'
                          }`}
                        >
                          {val === totalToCollect ? 'Exacto' : `${currency}${val}`}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Terminal / Tarjeta input row */}
                <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 max-w-sm w-full">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-250 select-none">
                        💳
                      </div>
                      <div>
                        <span className="block text-xs font-extrabold text-slate-900 leading-none">Terminal / Tarjeta</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Cobro con clip u otra terminal</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-base font-black text-slate-500">{currency}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={payCard}
                          onChange={(e) => setPayCard(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-48 bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] pl-8 pr-3 py-2 text-base text-black font-mono font-black text-right shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Código de voucher */}
                  <div className="mt-1.5 p-2 bg-[#dfdfdf]/40 border-t border-dashed border-zinc-300 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <span className="text-[9.5px] uppercase font-bold text-zinc-650">
                      Código / ID Folio de Operación Terminal (Opcional):
                    </span>
                    <input
                      type="text"
                      value={cardVoucherRef}
                      placeholder="Ej. T-184729"
                      onChange={(e) => setCardVoucherRef(e.target.value)}
                      className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] px-2 py-1 text-xs text-black font-mono font-bold w-full sm:w-48"
                    />
                  </div>
                </div>


                {/* Estado del Pago & Cambio / Faltante */}
                {(() => {
                  const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
                  const isEnough = totalReceived >= totalToCollect;
                  const diff = Math.abs(totalReceived - totalToCollect);
                  const hasChange = isEnough && diff > 0.005;
                  return (
                    <div className={`border-2 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono transition-all duration-300 ${
                      hasChange 
                        ? 'bg-emerald-100/90 border-t-emerald-600 border-l-emerald-600 border-b-emerald-250 border-r-emerald-250' 
                        : 'bg-white border-b-white border-r-white border-t-[#808080] border-l-[#808080]'
                    }`}>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-750">
                        <span>ESTADO DEL PAGO:</span>
                        <span className={`px-2 py-0.5 font-black text-[10px] border ${
                          isEnough 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                        }`}>
                          {isEnough ? 'SUFICIENTE' : 'INCOMPLETO'}
                        </span>
                      </div>
                      <div className="text-right">
                        {isEnough ? (
                          hasChange ? (
                            <span className="inline-block px-3 py-1.5 bg-emerald-600 text-white font-mono font-black text-sm sm:text-base border-2 border-t-white border-l-white border-b-emerald-800 border-r-emerald-800 animate-[pulse_1.5s_infinite] shadow-sm select-none">
                              CAMBIO A DEVOLVER: {currency}{diff.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm font-extrabold text-emerald-700">
                              CAMBIO A DEVOLVER: {currency}{diff.toFixed(2)}
                            </span>
                          )
                        ) : (
                          <span className="text-sm font-extrabold text-rose-700 animate-pulse">
                            DIFERENCIA RESTANTE: {currency}{diff.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Acciones y Botones del Checkout */}
                {(() => {
                  const totalReceived = (Number(payCash) || 0) + (Number(payCard) || 0);
                  const isEnough = totalReceived >= totalToCollect;
                  return (
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                      {/* Checkbox de Impresión */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pos-check-print-ticket-recharge"
                          checked={printTicket}
                          onChange={(e) => setPrintTicket(e.target.checked)}
                          className="w-5 h-5 accent-green-700 bg-white border-2 border-zinc-500 rounded cursor-pointer shrink-0"
                        />
                        <label htmlFor="pos-check-print-ticket-recharge" className="text-[10px] sm:text-xs font-black text-black cursor-pointer uppercase tracking-normal">
                          Imprimir ticket <span className="text-green-700 font-mono">[F2]</span>
                        </label>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setShowCheckoutModal(false)}
                          className="flex-1 sm:flex-none uppercase px-2.5 sm:px-6 py-2.5 bg-red-655 hover:bg-red-700 text-white font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-sm text-center"
                        >
                          Cancelar
                        </button>

                        {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                          <button
                            type="button"
                            disabled={!isEnough && !isWaIntegratedOffline}
                            onClick={isWaIntegratedOffline ? () => window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.') : () => handleConfirmRechargeCheckout(true, false)}
                            title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                            className={`flex-1 sm:flex-none uppercase px-3.5 sm:px-5 py-2.5 font-black text-[10px] sm:text-xs tracking-wider cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 text-center whitespace-nowrap ${
                              isWaIntegratedOffline 
                                ? 'bg-[#dfdfdf] text-zinc-550 border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 grayscale cursor-pointer'
                                : 'bg-[#25D366] hover:bg-[#128C7E] text-white border-2 border-t-emerald-300 border-l-emerald-300 border-b-emerald-800 border-r-emerald-800 disabled:opacity-55 disabled:cursor-not-allowed'
                            }`}
                          >
                            <span>Cobrar y WA</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={!isEnough}
                          onClick={() => handleConfirmRechargeCheckout(false)}
                          className="flex-1 sm:flex-none uppercase px-3.5 sm:px-7 py-2.5 bg-green-700 hover:bg-green-800 text-white font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-55 disabled:cursor-not-allowed text-center whitespace-nowrap"
                        >
                          <span>Cobrar [F5]</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )
      )}

      {/* ─── MODAL: PROCESANDO TRANSACCIÓN ─── */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className={`p-8 rounded-3xl border shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center ${
            isLight ? 'bg-white border-slate-100' : 'bg-zinc-950 border-zinc-900'
          }`}>
            <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
            <div>
              <h4 className={`text-sm font-black uppercase tracking-wider mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                Procesando Recarga
              </h4>
              <p className={`text-xs font-semibold leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Estableciendo conexión segura con el servidor de Taecel y confirmando autorización. Por favor, no apagues ni cierres la aplicación.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: TRANSACCIÓN EXITOSA ─── */}
      {successData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className={`p-8 rounded-3xl border shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full text-center ${
            isLight ? 'bg-white border-slate-150' : 'bg-zinc-950 border-zinc-900'
          }`}>
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-3xl">
              ✓
            </div>
            
            <div className="w-full">
              <h4 className={`text-base font-black uppercase tracking-wider mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                ¡Venta Exitosa!
              </h4>
              <p className={`text-xs font-semibold leading-relaxed mb-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                La recarga ha sido aplicada correctamente y se ha enviado la orden de impresión del comprobante.
              </p>

              {/* Detalles del ticket */}
              <div className={`p-4 rounded-2xl text-xs font-semibold flex flex-col gap-2 ${
                isLight ? 'bg-slate-50 text-slate-700' : 'bg-zinc-900/80 text-zinc-300'
              }`}>
                <div className="flex justify-between">
                  <span className="opacity-70">Operador:</span>
                  <span className="font-bold">{successData.carrierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Destino:</span>
                  <span className="font-mono font-bold tracking-wider">{successData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Importe:</span>
                  <span className="font-mono font-bold">{currency}{successData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Comisión:</span>
                  <span className="font-mono font-bold">{currency}{successData.commission.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between border-t pt-1.5 mt-1 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                  <span className="font-bold">Total Cobrado:</span>
                  <span className="font-mono font-bold text-amber-500">{currency}{(successData.amount + successData.commission).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between border-t pt-1.5 mt-1 text-[10px] ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                  <span className="opacity-75">Autorización:</span>
                  <span className="font-mono font-bold tracking-widest">{successData.folio}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResetForm}
              className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 shadow-md ${
                isLight ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'
              }`}
            >
              Cerrar y Limpiar
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: CENTRO DE REPORTES TAECEL ─── */}
      {showSalesHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setShowSalesHistory(false)}
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md transition-opacity duration-300"
          />
          
          {/* Modal Body */}
          <div className={`relative w-full max-w-6xl h-[90vh] shadow-2xl shadow-black/50 flex flex-col rounded-3xl overflow-hidden border transition-all duration-300 scale-100 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-900 text-zinc-200'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50' : 'border-zinc-900 bg-zinc-950'
            }`}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Centro de Reportes y Transacciones Taecel
                </h3>
                <p className="text-[10px] font-semibold opacity-70">
                  Resumen de operaciones de Tiempo Aire y Pago de Servicios para el taller
                </p>
              </div>
              
              {/* Controls inside header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase opacity-70">Desde:</span>
                    <input 
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${
                        isLight 
                          ? 'bg-white border-slate-250 text-slate-800' 
                          : 'bg-zinc-900 border-zinc-850 text-zinc-200'
                      } focus:outline-none`}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase opacity-70">Hasta:</span>
                    <input 
                      type="date"
                      value={historyEndDate}
                      min={historyStartDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${
                        isLight 
                          ? 'bg-white border-slate-250 text-slate-800' 
                          : 'bg-zinc-900 border-zinc-850 text-zinc-200'
                      } focus:outline-none`}
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePrintReport}
                  disabled={isLoadingHistory || (historyRecargas.length === 0 && historyServicios.length === 0)}
                  title="Imprimir Reporte Completo del Periodo"
                  className={`px-3 py-1 rounded-xl flex items-center justify-center gap-1 text-xs font-black uppercase cursor-pointer active:scale-95 border disabled:opacity-50 ${
                    isLight 
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                      : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-900 text-emerald-400'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Reporte
                </button>

                <button 
                  onClick={() => fetchSalesHistory(historyStartDate, historyEndDate)}
                  disabled={isLoadingHistory}
                  className={`px-3 py-1 rounded-xl flex items-center justify-center gap-1 text-xs font-black uppercase cursor-pointer active:scale-95 border disabled:opacity-50 ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>

                <button 
                  onClick={() => setShowSalesHistory(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-110 active:scale-95 ${
                    isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Statistics Dashboard Panel */}
            <div className={`p-4 border-b grid grid-cols-4 gap-4 ${
              isLight ? 'border-slate-100 bg-slate-50/50' : 'border-zinc-900 bg-zinc-950/40'
            }`}>
              {/* Card 1: Aire Total */}
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/40 border-zinc-900'
              }`}>
                <span className="text-[9px] font-black uppercase opacity-60">Total Tiempo Aire</span>
                <span className="text-base font-black font-mono text-blue-500">
                  {currency}{stats.totalRecargas.toFixed(2)}
                </span>
                <span className="text-[9px] opacity-50 font-semibold">Vendido con éxito en el periodo</span>
              </div>

              {/* Card 2: Servicios Total */}
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/40 border-zinc-900'
              }`}>
                <span className="text-[9px] font-black uppercase opacity-60">Total Servicios</span>
                <span className="text-base font-black font-mono text-emerald-500">
                  {currency}{stats.totalServicios.toFixed(2)}
                </span>
                <span className="text-[9px] opacity-50 font-semibold">Cobrado con éxito en el periodo</span>
              </div>

              {/* Card 3: Comisiones */}
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/40 border-zinc-900'
              }`}>
                <span className="text-[9px] font-black uppercase opacity-60">Comisión Estimada</span>
                <span className="text-base font-black font-mono text-amber-500">
                  {currency}{stats.totalComisiones.toFixed(2)}
                </span>
                <span className="text-[9px] opacity-50 font-semibold">Generado por transacciones</span>
              </div>

              {/* Card 4: Tasa Éxito */}
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/40 border-zinc-900'
              }`}>
                <span className="text-[9px] font-black uppercase opacity-60">Tasa de Éxito</span>
                <span className="text-base font-black font-mono">
                  {stats.successful} <span className="text-xs font-semibold opacity-60">de {stats.totalCount}</span>
                </span>
                <span className="text-[9px] opacity-50 font-semibold">
                  {stats.totalCount > 0 ? `${((stats.successful / stats.totalCount) * 100).toFixed(0)}% efectivas` : 'Sin operaciones'}
                </span>
              </div>
            </div>

            {/* Split Content Columns */}
            <div className="flex-1 flex overflow-hidden">
              {isLoadingHistory ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cargando transacciones...</span>
                </div>
              ) : historyError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6 border border-rose-500/20 bg-rose-500/5 rounded-2xl m-4">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-rose-500 mb-1">
                      Error de Consulta
                    </h5>
                    <p className="text-[11px] font-semibold opacity-85 leading-relaxed">
                      {historyError}
                    </p>
                  </div>
                  <button 
                    onClick={() => fetchSalesHistory(historyStartDate, historyEndDate)}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-black uppercase transition-all cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  {/* Column 1: Tiempo Aire */}
                  <div className={`flex-1 flex flex-col overflow-hidden border-r ${
                    isLight ? 'border-slate-100' : 'border-zinc-900'
                  }`}>
                    <div className={`p-3 border-b flex items-center justify-between ${
                      isLight ? 'bg-slate-50/50' : 'bg-zinc-950/20'
                    }`}>
                      <span className="text-xs font-black uppercase tracking-wider">Tiempo Aire (Recargas)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                        {historyRecargas.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {historyRecargas.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-50 text-center">
                          <FileText className="w-8 h-8 text-zinc-500" />
                          <span className="text-xs font-bold uppercase tracking-wider">Sin Recargas</span>
                          <span className="text-[9px] leading-relaxed">No se encontraron recargas hechas en este rango de fechas.</span>
                        </div>
                      ) : (
                        historyRecargas.map((tx: any, idx: number) => {
                          const isExitosa = tx.Status.trim().toLowerCase() === 'exitosa';
                          const isFracasada = tx.Status.trim().toLowerCase() === 'fracasada';

                          return (
                            <div 
                              key={tx.TransID || idx}
                              className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all hover:scale-[1.01] ${
                                isLight ? 'bg-slate-50/50 border-slate-100' : 'bg-zinc-900/40 border-zinc-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {tx.logo ? (
                                    <img 
                                      src={tx.logo} 
                                      alt={tx.Carrier}
                                      className="w-5 h-5 object-contain rounded-md"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <span className="text-xs font-black">{tx.Carrier}</span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isExitosa 
                                    ? 'bg-emerald-500/20 text-emerald-500' 
                                    : isFracasada 
                                      ? 'bg-rose-500/20 text-rose-500' 
                                      : 'bg-amber-500/20 text-amber-500'
                                }`}>
                                  {tx.Status.trim()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase opacity-60">Número:</span>
                                  <span className="font-mono font-bold tracking-wider text-blue-500">{tx.Telefono || tx.Referencia}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black uppercase opacity-60">Monto:</span>
                                  <span className="font-mono font-bold text-amber-500">{tx.Monto}</span>
                                </div>
                              </div>

                              <div className={`border-t pt-2 mt-0.5 flex items-center justify-between text-[10px] ${
                                isLight ? 'border-slate-100' : 'border-zinc-800'
                              }`}>
                                <div className="flex flex-col">
                                  <span className="opacity-60">Fecha/Hora:</span>
                                  <span className="font-semibold">{tx.Fecha}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="opacity-60">ID Transacción:</span>
                                  <span className="font-mono">{tx.TransID}</span>
                                </div>
                                {tx.Folio && isExitosa ? (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleReprintTicket(tx)}
                                      title="Reimprimir Ticket de Recarga"
                                      className={`px-2 py-0.5 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer transition-all border active:scale-95 ${
                                        isLight 
                                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' 
                                          : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                                      }`}
                                    >
                                      <Printer className="w-2.5 h-2.5" />
                                      Ticket
                                    </button>
                                    <div className="flex flex-col items-end">
                                      <span className="opacity-60 text-[8px]">Folio:</span>
                                      <span className="font-mono font-bold text-emerald-500">{tx.Folio}</span>
                                    </div>
                                  </div>
                                ) : tx.Folio ? (
                                  <div className="flex flex-col items-end">
                                    <span className="opacity-60">Folio:</span>
                                    <span className="font-mono font-bold text-emerald-500">{tx.Folio}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Column 2: Pago de Servicios */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={`p-3 border-b flex items-center justify-between ${
                      isLight ? 'bg-slate-50/50' : 'bg-zinc-950/20'
                    }`}>
                      <span className="text-xs font-black uppercase tracking-wider">Pago de Servicios y Pines</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        {historyServicios.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {historyServicios.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-50 text-center">
                          <FileText className="w-8 h-8 text-zinc-500" />
                          <span className="text-xs font-bold uppercase tracking-wider">Sin Servicios</span>
                          <span className="text-[9px] leading-relaxed">No se encontraron pagos de servicios en este rango de fechas.</span>
                        </div>
                      ) : (
                        historyServicios.map((tx: any, idx: number) => {
                          const isExitosa = tx.Status.trim().toLowerCase() === 'exitosa';
                          const isFracasada = tx.Status.trim().toLowerCase() === 'fracasada';

                          return (
                            <div 
                              key={tx.TransID || idx}
                              className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all hover:scale-[1.01] ${
                                isLight ? 'bg-slate-50/50 border-slate-100' : 'bg-zinc-900/40 border-zinc-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {tx.logo ? (
                                    <img 
                                      src={tx.logo} 
                                      alt={tx.Carrier}
                                      className="w-5 h-5 object-contain rounded-md"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <span className="text-xs font-black">{tx.Carrier}</span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isExitosa 
                                    ? 'bg-emerald-500/20 text-emerald-500' 
                                    : isFracasada 
                                      ? 'bg-rose-500/20 text-rose-500' 
                                      : 'bg-amber-500/20 text-amber-500'
                                }`}>
                                  {tx.Status.trim()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase opacity-60">Referencia:</span>
                                  <span className="font-mono font-bold tracking-wider text-blue-500 truncate max-w-[200px]">{tx.Telefono || tx.Referencia}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black uppercase opacity-60">Monto:</span>
                                  <span className="font-mono font-bold text-amber-500">{tx.Monto}</span>
                                </div>
                              </div>

                              <div className={`border-t pt-2 mt-0.5 flex items-center justify-between text-[10px] ${
                                isLight ? 'border-slate-100' : 'border-zinc-800'
                              }`}>
                                <div className="flex flex-col">
                                  <span className="opacity-60">Fecha/Hora:</span>
                                  <span className="font-semibold">{tx.Fecha}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="opacity-60">ID Transacción:</span>
                                  <span className="font-mono">{tx.TransID}</span>
                                </div>
                                {tx.Folio && isExitosa ? (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleReprintTicket(tx)}
                                      title="Reimprimir Ticket de Servicio"
                                      className={`px-2 py-0.5 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer transition-all border active:scale-95 ${
                                        isLight 
                                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' 
                                          : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                                      }`}
                                    >
                                      <Printer className="w-2.5 h-2.5" />
                                      Ticket
                                    </button>
                                    <div className="flex flex-col items-end">
                                      <span className="opacity-60 text-[8px]">Folio:</span>
                                      <span className="font-mono font-bold text-emerald-500">{tx.Folio}</span>
                                    </div>
                                  </div>
                                ) : tx.Folio ? (
                                  <div className="flex flex-col items-end">
                                    <span className="opacity-60">Folio:</span>
                                    <span className="font-mono font-bold text-emerald-500">{tx.Folio}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REPORTAR COMPRA TAECEL (INTEGRADO EN APP) ─── */}
      {showReportarCompraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setShowReportarCompraModal(false)}
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md transition-opacity duration-300"
          />
          
          {/* Modal Body */}
          <div className={`relative w-full max-w-[96vw] h-[92vh] shadow-2xl shadow-black/50 flex flex-col rounded-3xl overflow-hidden border transition-all duration-300 scale-100 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-900 text-zinc-200'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50' : 'border-zinc-900 bg-zinc-950'
            }`}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  Reportar Compra de Saldo Taecel
                </h3>
                <p className="text-[10px] font-semibold opacity-70">
                  Registra tus depósitos bancarios para abonar saldo a tu cuenta
                </p>
              </div>
              
              <button 
                onClick={() => setShowReportarCompraModal(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all border active:scale-95 ${
                  isLight 
                    ? 'bg-slate-150 hover:bg-slate-200 border-slate-200 text-slate-800' 
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
              >
                Cerrar Ventana
              </button>
            </div>

            {/* Webview container */}
            <div className="flex-1 bg-white relative">
              <webview 
                src={reportarCompraUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
