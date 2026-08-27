/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, Search, Plus, Printer, ArrowRight, X, Check, ChevronRight, Phone, User, Smartphone, DollarSign, Calendar, Laptop, Tablet, AlertCircle, Package, Trash2, Copy, RefreshCw, MessageSquare } from 'lucide-react';
import { Quote, QuoteDevice, WorkshopConfig, ServicePrice, AppUser, ActiveTab, Client, QuoteCatalogItem, QuoteAdditionalConcept, InsumoCatalogItem, RefaccionItem } from '../types';
import { buildQuoteTicketHtml, buildLetterQuoteTicketHtml } from '../utils/ticketBuilder';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { sendWhatsappQuote, formatPhoneForWhatsapp, openWhatsappChat } from '../utils/whatsapp';
import { createPortal } from 'react-dom';
import { handleCaretPreservingChange } from '../utils/domHelpers';
import CountryCodeSelect from './CountryCodeSelect';

interface CotizacionesViewProps {
  quotes: Quote[];
  config: WorkshopConfig;
  quoteCatalog: QuoteCatalogItem[];
  insumosCatalog: InsumoCatalogItem[];
  clients?: Client[];
  currentUser?: AppUser | null;
  onCreateQuote: (quote: Quote, options?: { printTicket?: boolean }) => void;
  onUpdateQuote: (quote: Quote, options?: { printTicket?: boolean }) => void;
  onConvertQuote: (quoteId: string, prefillData: { customerName: string; customerPhone: string; customerCountryCode: string; devices: QuoteDevice[] }) => void;
  onAddQuoteCatalogItem?: (item: QuoteCatalogItem) => void;
  onAddInsumoCatalogItem?: (item: InsumoCatalogItem) => void;
  onDeleteQuote?: (quoteId: string) => void;
  refacciones?: RefaccionItem[];
}

type QuoteStatus = Quote['status'];

const STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; border: string }> = {
  Pendiente:  { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' },
  Convertida: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  Vencida:    { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300' },
  Cancelada:  { bg: 'bg-zinc-100',    text: 'text-zinc-600',    border: 'border-zinc-300' },
};

const STATUS_COLORS_DARK: Record<QuoteStatus, { bg: string; text: string; border: string }> = {
  Pendiente:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  Convertida: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Vencida:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30' },
  Cancelada:  { bg: 'bg-zinc-500/10',    text: 'text-zinc-400',    border: 'border-zinc-500/30' },
};

function isExpired(quote: Quote): boolean {
  if (!quote.validUntil || quote.status !== 'Pendiente') return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const until = new Date(quote.validUntil + 'T00:00:00');
  return until < today;
}

function getEffectiveStatus(quote: Quote): QuoteStatus {
  if (quote.status === 'Pendiente' && isExpired(quote)) return 'Vencida';
  return quote.status;
}

// ─── Modal de nueva cotización ──────────────────────────────────────────────

const EMPTY_DEVICE: QuoteDevice = {
  deviceBrand: '',
  deviceModel: '',
  deviceModelNumber: '',
  deviceType: 'Phone',
  devicePin: '',
  faultDescription: '',
  serviceType: '',
  estimatedCost: 0,
  deviceImageUrl: '',
  quantity: 1,
};

interface NewQuoteModalProps {
  isRetro: boolean;
  isLight: boolean;
  config: WorkshopConfig;
  quoteCatalog: QuoteCatalogItem[];
  insumosCatalog: InsumoCatalogItem[];
  clients: Client[];
  nextId: string;
  currentUser?: AppUser | null;
  onClose: () => void;
  onConfirm: (quote: Quote, options?: { printTicket?: boolean; sendWhatsapp?: boolean }) => void;
  onAddQuoteCatalogItem?: (item: QuoteCatalogItem) => void;
  onAddInsumoCatalogItem?: (item: InsumoCatalogItem) => void;
  editingQuote?: Quote | null;
  isClone?: boolean;
  defaultEditorFormat?: 'letter' | 'ticket';
  refacciones?: RefaccionItem[];
}

function NewQuoteModal({ 
  isRetro: _globalIsRetro, 
  isLight: _globalIsLight, 
  config, 
  quoteCatalog, 
  insumosCatalog = [], 
  clients, 
  nextId, 
  currentUser, 
  onClose, 
  onConfirm, 
  onAddQuoteCatalogItem, 
  onAddInsumoCatalogItem,
  editingQuote,
  isClone = false,
  defaultEditorFormat = 'letter',
  refacciones = []
}: NewQuoteModalProps) {
  const isRetro = false;
  const isLight = _globalIsLight;
  const [customerName, setCustomerName] = useState(editingQuote ? editingQuote.customerName : '');
  const [customerPhone, setCustomerPhone] = useState(editingQuote ? editingQuote.customerPhone : '');
  const [customerCountryCode, setCustomerCountryCode] = useState(editingQuote ? editingQuote.customerCountryCode : (config?.phoneCountryCode || '+52'));
  const [validUntil, setValidUntil] = useState(() => {
    if (editingQuote && editingQuote.validUntil) {
      return editingQuote.validUntil;
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [notes, setNotes] = useState(editingQuote ? (editingQuote.notes || '') : '');
  const [showNotesOnTicket, setShowNotesOnTicket] = useState(editingQuote ? (editingQuote.showNotesOnTicket || false) : false);
  const [createdBy, setCreatedBy] = useState(() => {
    if (editingQuote && editingQuote.createdBy) return editingQuote.createdBy;
    return config.quoteSignature || currentUser?.name || '';
  });
  const [additionalConcepts, setAdditionalConcepts] = useState<QuoteAdditionalConcept[]>(() => {
    if (editingQuote && editingQuote.additionalConcepts && editingQuote.additionalConcepts.length > 0) {
      return editingQuote.additionalConcepts;
    }
    return [{ id: 'c_' + Date.now(), description: '', price: 0, quantity: 1 }];
  });
  const [devices, setDevices] = useState<QuoteDevice[]>(() => {
    if (editingQuote && editingQuote.devices && editingQuote.devices.length > 0) {
      return editingQuote.devices;
    }
    return [{ ...EMPTY_DEVICE }];
  });
  const [clientQuery, setClientQuery] = useState('');
  const [showClientSugg, setShowClientSugg] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [insumoSearchQuery, setInsumoSearchQuery] = useState('');
  const [focusedConceptId, setFocusedConceptId] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [focusedInputRect, setFocusedInputRect] = useState<{ bottom: number; left: number; width: number } | null>(null);
  const [conceptQuery, setConceptQuery] = useState('');
  const [editingDeviceIndex, setEditingDeviceIndex] = useState(0);
  const currentDevice = devices[editingDeviceIndex];
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'ticket' | 'letter'>(editingQuote ? (editingQuote.editorFormat || 'letter') : defaultEditorFormat);
  const [title, setTitle] = useState(editingQuote ? (editingQuote.title || 'COTIZACIÓN') : 'COTIZACIÓN');
  const [activePage, setActivePage] = useState(1);
  const [zoomMode, setZoomMode] = useState<'auto' | number>('auto');
  const [autoScale, setAutoScale] = useState(1);
  const scale = zoomMode === 'auto' ? autoScale : zoomMode;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState<'template' | 'print'>('template');

  const [customLogoUrl, setCustomLogoUrl] = useState(() => {
    if (editingQuote && editingQuote.customLogoUrl !== undefined) return editingQuote.customLogoUrl;
    return config.logoUrl || '';
  });
  const [customRightLogoUrl, setCustomRightLogoUrl] = useState(() => {
    if (editingQuote && editingQuote.customRightLogoUrl !== undefined) return editingQuote.customRightLogoUrl;
    return config.quoteSecondLogoUrl || '';
  });
  const [showDoubleLogo, setShowDoubleLogo] = useState(() => {
    if (editingQuote && editingQuote.showDoubleLogo !== undefined) return editingQuote.showDoubleLogo;
    if (editingQuote && editingQuote.customRightLogoUrl) return true;
    return !!config.logoUrl && !!config.quoteSecondLogoUrl;
  });

  const [storeName, setStoreName] = useState(() => {
    if (editingQuote && editingQuote.storeNameOverride !== undefined) return editingQuote.storeNameOverride;
    return config.storeName || '';
  });
  const getInitialAddressLines = () => {
    const addr = config.address || '';
    const parts = addr.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const l1 = parts.slice(0, parts.length - 2).join(', ') + ',';
      const l2 = parts.slice(parts.length - 2).join(', ');
      return [l1, l2];
    }
    return [addr, ''];
  };
  const [storeAddressL1, setStoreAddressL1] = useState(() => {
    if (editingQuote && editingQuote.storeAddressOverride !== undefined) {
      const addr = editingQuote.storeAddressOverride || '';
      const parts = addr.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        return parts.slice(0, parts.length - 2).join(', ') + ',';
      }
      return addr;
    }
    return getInitialAddressLines()[0];
  });
  const [storeAddressL2, setStoreAddressL2] = useState(() => {
    if (editingQuote && editingQuote.storeAddressOverride !== undefined) {
      const addr = editingQuote.storeAddressOverride || '';
      const parts = addr.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        return parts.slice(parts.length - 2).join(', ');
      }
      return '';
    }
    return getInitialAddressLines()[1];
  });
  const [storePhone, setStorePhone] = useState(() => {
    if (editingQuote && editingQuote.storePhoneOverride !== undefined) return editingQuote.storePhoneOverride;
    return config.phone || '';
  });
  const [storePhone2, setStorePhone2] = useState(() => {
    if (editingQuote && editingQuote.storePhone2Override !== undefined) return editingQuote.storePhone2Override;
    return config.phone2 || '';
  });
  const [shouldPrint, setShouldPrint] = useState(true);
  const [shouldSendWhatsapp, setShouldSendWhatsapp] = useState(false);

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

  const leftLogoInputRef = useRef<HTMLInputElement>(null);
  const rightLogoInputRef = useRef<HTMLInputElement>(null);

  const handleLeftLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setCustomLogoUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRightLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setCustomRightLogoUrl(ev.target?.result as string);
        setShowDoubleLogo(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentMockQuote = useMemo<Quote>(() => {
    const finalDevices = editorMode === 'letter'
      ? devices.map(d => ({
          deviceBrand: 'CARTA',
          deviceModel: '',
          deviceModelNumber: '',
          deviceType: 'Other' as const,
          devicePin: '',
          faultDescription: '',
          serviceType: d.serviceType.trim(),
          estimatedCost: d.estimatedCost,
          deviceImageUrl: d.deviceImageUrl,
          quantity: d.quantity || 1,
        }))
      : devices;

    const finalAdditional = additionalConcepts.filter(c => c.description.trim() !== '');

    return {
      id: editingQuote ? editingQuote.id : nextId,
      status: editingQuote ? editingQuote.status : 'Pendiente',
      customerName: customerName.trim() || 'CLIENTE DE PRUEBA',
      customerPhone: customerPhone.trim() || '0000000000',
      customerCountryCode,
      devices: finalDevices,
      validUntil: validUntil || new Date().toISOString().substring(0, 10),
      notes: notes.trim() || undefined,
      showNotesOnTicket: showNotesOnTicket,
      additionalConcepts: finalAdditional,
      createdAt: editingQuote ? editingQuote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: createdBy.trim(),
      customLogoUrl,
      customRightLogoUrl,
      showDoubleLogo: showDoubleLogo || !!customRightLogoUrl,
      storeNameOverride: storeName || undefined,
      storeAddressOverride: [storeAddressL1.trim(), storeAddressL2.trim()].filter(Boolean).join(' ') || undefined,
      storePhoneOverride: storePhone || undefined,
      storePhone2Override: storePhone2 || undefined,
    };
  }, [editingQuote, nextId, customerName, customerPhone, customerCountryCode, devices, validUntil, notes, showNotesOnTicket, additionalConcepts, currentUser, editorMode, customLogoUrl, customRightLogoUrl, showDoubleLogo, storeName, storeAddressL1, storeAddressL2, storePhone, storePhone2, createdBy]);

  const totalEstimado = useMemo(() => {
    const subDevices = devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
    const subAdditional = additionalConcepts.reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
    return subDevices + subAdditional;
  }, [devices, additionalConcepts]);

  // Local theme styles helper (bypasses Tailwind global dark class mismatches)
  const isDark = !isLight && !isRetro;
  
  const labelCls = isRetro 
    ? 'text-[10px] font-black uppercase text-black' 
    : isLight 
      ? 'text-[10px] font-black uppercase text-zinc-500' 
      : 'text-[10px] font-black uppercase text-zinc-400';

  const sidebarInputCls = isRetro
    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black px-2 py-1 text-xs w-full focus:outline-none uppercase font-black'
    : isLight
      ? 'bg-white border border-zinc-300 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-blue-500 uppercase font-black'
      : 'bg-[#1c1f2e] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700 uppercase font-black';

  const sidebarCardCls = (idx: number) => {
    const isSelected = editingDeviceIndex === idx;
    if (isRetro) {
      return `p-2.5 rounded border flex items-center justify-between gap-2 transition-all shadow-sm cursor-pointer ${
        isSelected 
          ? 'bg-white border-black text-black font-black' 
          : 'bg-white border-zinc-300 text-black hover:border-black'
      }`;
    }
    if (isLight) {
      return `p-2.5 rounded border flex items-center justify-between gap-2 transition-all shadow-sm cursor-pointer ${
        isSelected
          ? 'bg-blue-50/50 border-blue-500 text-blue-900'
          : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300'
      }`;
    }
    return `p-2.5 rounded border flex items-center justify-between gap-2 transition-all shadow-sm cursor-pointer ${
      isSelected
        ? 'bg-blue-950/20 border-blue-600 text-blue-100'
        : 'bg-[#1c1f2e] border-zinc-800 text-zinc-300 hover:border-zinc-700'
    }`;
  };

  const sidebarServiceItemCls = isRetro
    ? 'w-full text-left p-2 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-black flex justify-between items-center cursor-pointer transition-all'
    : isLight
      ? 'w-full text-left p-2 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 hover:border-zinc-300 flex justify-between items-center cursor-pointer transition-all'
      : 'w-full text-left p-2 rounded border border-zinc-800 bg-[#1c1f2e] hover:bg-zinc-800/50 text-zinc-300 hover:border-zinc-700 flex justify-between items-center cursor-pointer transition-all';

  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current) {
        const parentHeight = viewportRef.current.clientHeight - 32; // padding margin spacer
        const parentWidth = viewportRef.current.clientWidth - 32;
        const scaleY = parentHeight / 1054;
        const scaleX = parentWidth / 816;
        const newScale = Math.min(scaleX, scaleY, 1);
        setAutoScale(newScale);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [devices, activePage, editorMode]);

  const paginateQuoteItems = (items: QuoteDevice[]) => {
    const additionalCount = additionalConcepts?.length || 0;
    const maxLastPage = additionalCount >= 7 ? 1 : additionalCount >= 4 ? 2 : 3;

    const pages: QuoteDevice[][] = [];
    let tempDevices = [...items];
    while (tempDevices.length > 0) {
      const rem = tempDevices.length;
      if (rem <= maxLastPage) {
        pages.push(tempDevices);
        break;
      }
      if (rem <= 5) {
        pages.push(tempDevices);
        pages.push([]);
        break;
      }
      pages.push(tempDevices.slice(0, 5));
      tempDevices = tempDevices.slice(5);
    }
    if (pages.length === 0) {
      pages.push([]);
    }
    return pages;
  };

  const totalPagesCount = useMemo(() => {
    return paginateQuoteItems(devices).length;
  }, [devices, additionalConcepts]);

  useEffect(() => {
    if (activePage > totalPagesCount) {
      setActivePage(Math.max(1, totalPagesCount));
    }
  }, [totalPagesCount, activePage]);

  const getGlobalIndex = (localIdx: number) => {
    const pages = paginateQuoteItems(devices);
    let globalIdx = 0;
    for (let i = 0; i < activePage - 1; i++) {
      globalIdx += pages[i]?.length || 0;
    }
    return globalIdx + localIdx;
  };

  const headerCls = isRetro
    ? (isLight ? 'bg-[#000080] text-white' : 'bg-[#000080] text-white border-b border-zinc-600')
    : isLight
      ? 'bg-[#1a3a6b] text-white'
      : 'bg-[#11131e] text-white';

  const modalBg = isRetro
    ? (isLight 
        ? 'bg-[#eaeef3] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] text-black shadow-md'
        : 'bg-[#1a1c23] border-2 border-t-[#383c48] border-l-[#383c48] border-r-[#111317] border-b-[#111317] text-white shadow-2xl')
    : isLight
      ? 'bg-white border border-zinc-200 text-zinc-900 shadow-xl'
      : 'bg-[#161822] border border-zinc-700 text-zinc-100 shadow-2xl';

  const inputCls = isRetro
    ? (isLight
        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black px-2 py-1 text-sm w-full'
        : 'bg-[#121316] border-2 border-t-[#111317] border-l-[#111317] border-b-[#5a6275] border-r-[#5a6275] text-white px-2 py-1 text-sm w-full')
    : isLight
      ? 'bg-white border border-zinc-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500'
      : 'bg-[#1c1f2e] border border-zinc-700 rounded px-2 py-1.5 text-sm w-full text-zinc-100 focus:outline-none focus:border-zinc-500';

  const btnPrimary = isRetro
    ? (isLight
        ? 'bg-[#000080] text-white px-4 py-1.5 font-bold text-xs border-2 border-t-white border-l-white border-r-zinc-600 border-b-zinc-600 cursor-pointer'
        : 'bg-[#000080] text-white px-4 py-1.5 font-bold text-xs border-2 border-t-[#4040c0] border-l-[#4040c0] border-r-[#00004a] border-b-[#00004a] cursor-pointer')
    : isLight
      ? 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition-colors'
      : 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition-colors';

  const btnSecondary = isRetro
    ? (isLight
        ? 'bg-[#dfdfdf] text-black px-4 py-1.5 font-bold text-xs border-2 border-t-white border-l-white border-r-zinc-600 border-b-zinc-600 cursor-pointer'
        : 'bg-[#383c48] text-white px-4 py-1.5 font-bold text-xs border-2 border-t-[#5a6275] border-l-[#5a6275] border-r-[#111317] border-b-[#111317] cursor-pointer')
    : isLight
      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition-colors'
      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition-colors';

  const clientSugg = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) {
      return clients
        .slice()
        .sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0))
        .slice(0, 6);
    }
    return clients
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0))
      .slice(0, 8);
  }, [clientQuery, clients]);

  const serviceSugg = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    
    // Obtener marca/modelo actual del dispositivo editado
    const curBrand = (currentDevice?.deviceBrand || '').trim().toLowerCase();
    const curModel = (currentDevice?.deviceModel || '').trim().toLowerCase();

    // 1. Obtener refacciones sugeridas compatibles o que coincidan con la búsqueda
    let refSugg: { id: string; description: string; price: number; isRefaccion: boolean }[] = [];
    if (refacciones && refacciones.length > 0) {
      const matches = refacciones.filter(r => {
        const rBrand = (r.deviceBrand || '').trim().toLowerCase();
        const rModel = (r.deviceModel || '').trim().toLowerCase();
        
        // Coincidencia por compatibilidad directa del equipo que se está cotizando
        const modelMatch = curBrand && curModel && rBrand === curBrand && (curModel.includes(rModel) || rModel.includes(curModel));
        
        // Coincidencia de texto
        const textMatch = q && (
          r.name.toLowerCase().includes(q) ||
          r.deviceBrand.toLowerCase().includes(q) ||
          r.deviceModel.toLowerCase().includes(q) ||
          (r.code || '').toLowerCase().includes(q)
        );
        
        return modelMatch || textMatch;
      });

      refSugg = matches.map(r => ({
        id: `ref-${r.id}`,
        description: `REEMPLAZO DE ${r.name.toUpperCase()} (${r.deviceBrand} ${r.deviceModel})`,
        price: r.price,
        isRefaccion: true
      })).slice(0, 5);
    }

    // 2. Obtener servicios del catálogo estándar de cotizaciones
    let catSugg = quoteCatalog.map(s => ({
      id: s.id,
      description: s.description,
      price: s.price,
      isRefaccion: false
    }));

    if (q) {
      catSugg = catSugg.filter(s => s.description.toLowerCase().includes(q));
    } else {
      catSugg = catSugg.slice(0, 6);
    }

    // Combinar: priorizar refacciones y limitar resultados
    return [...refSugg, ...catSugg].slice(0, 8);
  }, [serviceQuery, quoteCatalog, refacciones, currentDevice]);

  const sidebarServiceSugg = useMemo(() => {
    const q = serviceSearchQuery.trim().toLowerCase();
    if (!q) return quoteCatalog.slice(0, 10);
    return quoteCatalog.filter(s => s.description.toLowerCase().includes(q)).slice(0, 10);
  }, [serviceSearchQuery, quoteCatalog]);

  const sidebarInsumoSugg = useMemo(() => {
    const q = insumoSearchQuery.trim().toLowerCase();
    if (!q) return insumosCatalog.slice(0, 10);
    return insumosCatalog.filter(s => s.description.toLowerCase().includes(q)).slice(0, 10);
  }, [insumoSearchQuery, insumosCatalog]);

  const handleAddServicePrice = (item: QuoteCatalogItem) => {
    const descUpper = item.description.toUpperCase();
    const existingIndex = devices.findIndex(d => (d.serviceType || '').trim().toUpperCase() === descUpper.trim());

    if (existingIndex !== -1) {
      setDevices(prev => prev.map((d, idx) => 
        idx === existingIndex 
          ? { ...d, quantity: (d.quantity || 1) + 1 }
          : d
      ));
    } else {
      const newDevice: QuoteDevice = {
        ...EMPTY_DEVICE,
        serviceType: descUpper,
        estimatedCost: item.price,
        deviceImageUrl: item.imageUrl || '',
        quantity: 1,
      };
      if (devices.length === 1 && !devices[0].serviceType && devices[0].estimatedCost === 0 && !devices[0].deviceBrand) {
        setDevices([newDevice]);
      } else if (devices.length < 15) {
        setDevices(prev => [...prev, newDevice]);
      }
    }
  };

  const handleAddInsumoFromCatalog = (item: InsumoCatalogItem) => {
    const descUpper = item.description.toUpperCase();
    const existingIndex = additionalConcepts.findIndex(c => (c.description || '').trim().toUpperCase() === descUpper.trim());

    if (existingIndex !== -1) {
      setAdditionalConcepts(prev => prev.map((c, idx) => 
        idx === existingIndex 
          ? { ...c, quantity: (c.quantity || 1) + 1 }
          : c
      ));
    } else {
      setAdditionalConcepts(prev => {
        // Overwrite if only one empty row exists
        if (prev.length === 1 && prev[0].description.trim() === '' && prev[0].price === 0) {
          return [{ id: prev[0].id, description: descUpper, price: item.price, quantity: 1 }];
        }
        return [...prev, { id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 100), description: descUpper, price: item.price, quantity: 1 }];
      });
    }
  };

  const updateCurrentDevice = (patch: Partial<QuoteDevice>) => {
    setDevices(prev => prev.map((d, i) => i === editingDeviceIndex ? { ...d, ...patch } : d));
  };

  const addDevice = () => {
    setDevices(prev => [...prev, { ...EMPTY_DEVICE }]);
    setEditingDeviceIndex(devices.length);
    const newLength = devices.length + 1;
    const newTotalPages = newLength <= 2 ? 1 : 1 + Math.ceil((newLength - 2) / 3);
    setActivePage(newTotalPages);
  };

  const removeDevice = (idx: number) => {
    setDevices(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.length === 0 ? [{ ...EMPTY_DEVICE }] : filtered;
    });
    setEditingDeviceIndex(0);
    const newLength = Math.max(1, devices.length - 1);
    const newTotalPages = newLength <= 2 ? 1 : 1 + Math.ceil((newLength - 2) / 3);
    setActivePage(prev => Math.min(prev, newTotalPages));
  };

  const handleConfirm = () => {
    if (!customerName.trim()) { setErrorMsg('El nombre del cliente es requerido.'); return; }
    if (!customerPhone.trim()) { setErrorMsg('El teléfono es requerido.'); return; }
    for (const d of devices) {
      if (editorMode === 'ticket') {
        if (!d.deviceBrand.trim() || !d.deviceModel.trim()) { setErrorMsg('Todos los equipos deben tener marca y modelo.'); return; }
      }
      if (!d.serviceType.trim()) {
        setErrorMsg(editorMode === 'letter' ? 'Todos los productos deben tener descripción.' : 'Todos los equipos deben tener un servicio.');
        return;
      }
      if (d.estimatedCost <= 0) { setErrorMsg('El costo estimado debe ser mayor a 0.'); return; }
    }
    setErrorMsg('');
    setShowConfirm(true);
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    
    const finalDevices = editorMode === 'letter'
      ? devices.map(d => ({
          deviceBrand: 'CARTA',
          deviceModel: '',
          deviceModelNumber: '',
          deviceType: 'Other' as const,
          devicePin: '',
          faultDescription: '',
          serviceType: d.serviceType.trim(),
          estimatedCost: d.estimatedCost,
          deviceImageUrl: d.deviceImageUrl,
          quantity: d.quantity || 1,
        }))
      : devices;

    const finalAdditional = additionalConcepts.filter(c => c.description.trim() !== '');

    const quote: Quote = {
      id: editingQuote ? editingQuote.id : nextId,
      status: editingQuote ? editingQuote.status : 'Pendiente',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCountryCode,
      devices: finalDevices,
      validUntil: validUntil || new Date().toISOString().substring(0, 10),
      notes: notes.trim() || undefined,
      showNotesOnTicket: showNotesOnTicket,
      additionalConcepts: finalAdditional.length > 0 ? finalAdditional : undefined,
      createdAt: editingQuote ? editingQuote.createdAt : new Date().toISOString(),
      createdBy: createdBy.trim(),
      editorFormat: editorMode,
      title: editorMode === 'letter' ? (title.trim() || 'COTIZACIÓN') : 'COTIZACIÓN',
      customLogoUrl,
      customRightLogoUrl,
      showDoubleLogo: showDoubleLogo || !!customRightLogoUrl,
      storeNameOverride: storeName || undefined,
      storeAddressOverride: [storeAddressL1.trim(), storeAddressL2.trim()].filter(Boolean).join(' ') || undefined,
      storePhoneOverride: storePhone || undefined,
      storePhone2Override: storePhone2 || undefined,
    };
    onConfirm(quote, { printTicket: shouldPrint, sendWhatsapp: shouldSendWhatsapp });
  };

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const today = new Date();
  const todayStr = `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

  const formattedStorePhone = config.phone
    ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
    : '';
  const formattedStorePhone2 = config.phone2
    ? config.phone2.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone2
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`relative w-full ${editorMode === 'letter' ? 'max-w-[95vw] h-[95vh] max-h-[95vh]' : 'max-w-xl max-h-[95vh]'} overflow-hidden flex flex-col rounded-xl ${modalBg}`}
        onClick={e => e.stopPropagation()}
        style={{ minWidth: 340 }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 shrink-0 modal-dark-header ${headerCls}`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white retro-white-text" />
            <span className="font-black text-sm tracking-wide text-white retro-white-text">
              {editingQuote 
                ? (isClone ? `NUEVA COTIZACIÓN (CLONADA)` : `EDITAR COTIZACIÓN — ${editingQuote.id}`) 
                : 'NUEVA COTIZACIÓN'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="hover:bg-white/20 rounded p-0.5 cursor-pointer transition-colors text-white retro-white-text">
            <X className="w-4 h-4 text-white retro-white-text" />
          </button>
        </div>

        {/* Editor Mode Selector */}
        <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 text-[11px] shrink-0 ${
          isRetro ? 'bg-[#d4d0c8] border-zinc-500 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-[#151822] border-zinc-800 text-zinc-300'
        }`}>
          <span className="font-black uppercase tracking-wider">Formato de Cotización:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditorMode('ticket')}
              className={`px-3 py-1 font-bold rounded cursor-pointer transition-colors ${
                editorMode === 'ticket'
                  ? (isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 text-white')
                  : (isRetro ? 'bg-zinc-200 text-zinc-700' : isLight ? 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300' : 'bg-zinc-800 text-zinc-400')
              }`}
            >
              Formato Rápido (Ticket)
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('letter')}
              className={`px-3 py-1 font-bold rounded cursor-pointer transition-colors ${
                editorMode === 'letter'
                  ? (isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 text-white')
                  : (isRetro ? 'bg-zinc-200 text-zinc-700' : isLight ? 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300' : 'bg-zinc-800 text-zinc-400')
              }`}
            >
              Diseñador Visual (Tamaño Carta)
            </button>
          </div>
        </div>

        {editorMode === 'letter' ? (
          /* WYSIWYG Letter Editor */
          <>
            <div className="flex-1 flex overflow-hidden">
            {/* Left Control Panel (Sidebar) */}
            <div className={`w-[350px] border-r flex flex-col shrink-0 ${
              isRetro ? 'bg-[#d4d0c8] border-zinc-400 text-black shadow-inner' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#151720] border-[#222530] text-zinc-100'
            }`}>
              {/* Sidebar Header */}
              <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                isRetro ? 'border-zinc-400' : 'border-zinc-200/50 dark:border-zinc-850'
              }`}>
                <span className={`text-xs font-black uppercase tracking-wider ${isRetro ? 'text-black' : 'text-zinc-500'}`}>Panel de Edición</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                  isRetro ? 'bg-black/10 text-black border border-zinc-500' : isLight ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  Carta / A4
                </span>
              </div>

              {/* Scrollable Panel Area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-zinc-100/30 min-h-0">
                
                {/* 1. Datos Generales Card */}
                <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-[140px] ${isRetro ? 'bg-[#d4d0c8] border-zinc-400 text-black' : isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-[#1c1f2e] border-zinc-800 text-zinc-150'}`}>
                  <div className={`border-b px-3 py-2 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider shrink-0 ${isRetro ? 'bg-[#dfdfdf] border-zinc-350 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-350'}`}>
                    <User className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 
                    Seleccionar Cliente 
                    <span className={`text-[9px] font-normal lowercase ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-450' : 'text-zinc-500'}`}>({clients.length} en catálogo)</span>
                  </div>
                  
                  <div className="p-3.5 flex flex-col flex-1 min-h-0">
                    {/* Buscador de Clientes Directo */}
                    <div className="flex flex-col flex-1 min-h-0">
                      <label className={`block text-[10px] font-black uppercase mb-1 shrink-0 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {clientQuery ? 'Resultados de Búsqueda' : 'Clientes más Habituales (Acceso Rápido)'}
                      </label>
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        className={`border rounded px-2.5 py-1.5 text-xs focus:outline-none uppercase font-black w-full mb-1.5 shrink-0 ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black' : isLight ? 'bg-white border-zinc-300 text-black focus:border-blue-500' : 'bg-[#151722] border-zinc-700 text-white focus:border-blue-600'}`}
                        value={clientQuery}
                        onChange={e => setClientQuery(e.target.value)}
                      />
                      
                      <div className={`border rounded flex-1 overflow-y-auto p-1.5 space-y-1 flex flex-col justify-start min-h-0 ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/30'}`}>
                        {clientSugg.length > 0 ? (
                          clientSugg.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerName(c.name.toUpperCase());
                                setCustomerPhone(c.phone);
                              }}
                              className={`w-full text-left p-1.5 rounded border flex justify-between items-center cursor-pointer transition-all text-[10px] font-black uppercase shrink-0 shadow-sm ${isLight ? 'border-sky-200 bg-sky-50/50 hover:bg-sky-100 hover:border-sky-300 text-sky-900' : 'border-sky-950 bg-sky-950/20 hover:bg-sky-900/30 hover:border-sky-800 text-sky-200'}`}
                            >
                              <span className="truncate pr-1">{c.name}</span>
                              <span className="font-bold shrink-0 text-[9px]">{c.phone}</span>
                            </button>
                          ))
                        ) : (
                          <div className={`flex-1 flex items-center justify-center text-[10px] font-bold ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No se encontraron clientes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Catálogo de Servicios Card */}
                <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-[140px] ${isRetro ? 'bg-[#d4d0c8] border-zinc-400 text-black' : isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-[#1c1f2e] border-zinc-800 text-zinc-150'}`}>
                  <div className={`border-b px-3 py-2 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider shrink-0 ${isRetro ? 'bg-[#dfdfdf] border-zinc-350 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-350'}`}>
                    <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 
                    Productos (Catálogo) 
                    <span className={`text-[9px] font-normal lowercase ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-450' : 'text-zinc-500'}`}>({quoteCatalog.length} en catálogo)</span>
                  </div>
                  <div className="p-3.5 space-y-3 flex flex-col flex-1 min-h-0">
                    <input
                      type="text"
                      placeholder="Buscar en catálogo..."
                      className={`border rounded px-2.5 py-1.5 text-xs focus:outline-none uppercase font-black w-full shrink-0 ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black' : isLight ? 'bg-white border-zinc-300 text-black focus:border-emerald-500' : 'bg-[#151722] border-zinc-700 text-white focus:border-emerald-600'}`}
                      value={serviceSearchQuery}
                      onChange={e => setServiceSearchQuery(e.target.value)}
                    />
                    
                    <div className={`border rounded flex-1 overflow-y-auto p-1.5 space-y-1 flex flex-col justify-start min-h-0 ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/30'}`}>
                      {sidebarServiceSugg.length > 0 ? (
                        sidebarServiceSugg.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleAddServicePrice(s)}
                            className={`w-full text-left p-1.5 rounded border flex justify-between items-center cursor-pointer transition-all text-[10px] font-black uppercase shrink-0 shadow-sm ${isLight ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-900' : 'border-emerald-950 bg-emerald-950/20 hover:bg-emerald-900/30 hover:border-emerald-800 text-emerald-200'}`}
                          >
                            <span className="truncate pr-1">{s.description}</span>
                            <span className="font-bold shrink-0 text-[9px]">{config.currencySymbol}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </button>
                        ))
                      ) : (
                        <div className={`text-center py-4 text-xs font-bold ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>No se encontraron productos en el catálogo</div>
                      )}
                    </div>
                  </div>
                </div>


                {/* 4. Mano de Obra e Insumos Card */}
                <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-[140px] ${isRetro ? 'bg-[#d4d0c8] border-zinc-400 text-black' : isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-[#1c1f2e] border-zinc-800 text-zinc-150'}`}>
                  <div className={`border-b px-3 py-2 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider shrink-0 ${isRetro ? 'bg-[#dfdfdf] border-zinc-350 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-350'}`}>
                    <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" /> 
                    Mano de Obra / Insumos 
                    <span className={`text-[9px] font-normal lowercase ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-450' : 'text-zinc-500'}`}>({insumosCatalog.length} en catálogo)</span>
                  </div>
                  <div className="p-3.5 space-y-3 flex flex-col flex-1 min-h-0">
                    <input
                      type="text"
                      placeholder="Buscar en catálogo..."
                      className={`border rounded px-2.5 py-1.5 text-xs focus:outline-none uppercase font-black w-full shrink-0 ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black' : isLight ? 'bg-white border-zinc-300 text-black focus:border-purple-500' : 'bg-[#151722] border-zinc-700 text-white focus:border-purple-600'}`}
                      value={insumoSearchQuery}
                      onChange={e => setInsumoSearchQuery(e.target.value)}
                    />
                    
                    <div className={`border rounded flex-1 overflow-y-auto p-1.5 space-y-1 flex flex-col justify-start min-h-0 ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/30'}`}>
                      {sidebarInsumoSugg.length > 0 ? (
                        sidebarInsumoSugg.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleAddInsumoFromCatalog(s)}
                            className={`w-full text-left p-1.5 rounded border flex justify-between items-center cursor-pointer transition-all text-[10px] font-black uppercase shrink-0 shadow-sm ${isLight ? 'border-purple-200 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300 text-purple-900' : 'border-purple-950 bg-purple-950/20 hover:bg-purple-900/30 hover:border-purple-800 text-purple-200'}`}
                          >
                            <span className="truncate pr-1">{s.description}</span>
                            <span className="font-bold shrink-0 text-[9px]">{config.currencySymbol}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </button>
                        ))
                      ) : (
                        <div className={`text-center py-4 text-xs font-bold ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>No se encontraron insumos en el catálogo</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Visual Previews */}
            <div className={`flex-1 flex flex-col min-h-0 ${isLight ? 'bg-zinc-200/80' : 'bg-zinc-950/40'}`}>
              {/* Selector de modo de vista previa */}
              <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 shrink-0 ${
                isRetro ? 'bg-[#d4d0c8] border-zinc-500 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-[#151822] border-zinc-800 text-zinc-300'
              }`}>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-wider">Vista Previa:</span>
                  <div className={`flex p-0.5 rounded gap-0.5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('template')}
                      className={`px-3 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors border-none ${
                        previewMode === 'template'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Plantilla (Editable)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('print')}
                      className={`px-3 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors border-none ${
                        previewMode === 'print'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Formato Impreso
                    </button>
                  </div>
                </div>

                {/* Zoom Selector in Editor */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider">Zoom:</span>
                  <div className={`flex p-0.5 rounded gap-0.5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                    {(['auto', 0.5, 0.65, 0.8, 1.0] as const).map(z => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZoomMode(z)}
                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded cursor-pointer transition-colors border-none ${
                          zoomMode === z
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        {z === 'auto' ? 'Auto' : `${z * 100}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Viewport Content */}
              <div ref={viewportRef} className="flex-1 overflow-auto p-4 flex flex-col items-center justify-start min-h-0">
                <div 
                  style={{ 
                    width: `${816 * scale}px`, 
                    height: `${1054 * scale}px`,
                    position: 'relative',
                    overflow: 'hidden',
                    margin: 'auto'
                  }}
                  className="shrink-0 flex items-center justify-center animate-fade-in"
                >
                  {previewMode === 'print' ? (
                    <iframe
                      srcDoc={buildLetterQuoteTicketHtml(currentMockQuote, config)}
                      scrolling="no"
                      className="bg-white shadow-xl border border-zinc-300 rounded-sm"
                      style={{
                        width: '816px',
                        height: `${paginateQuoteItems(devices).length * 1054 + (paginateQuoteItems(devices).length - 1) * 20}px`,
                        transformOrigin: 'top center',
                        position: 'absolute',
                        top: `-${(activePage - 1) * (1054 + 20) * scale}px`,
                        left: '50%',
                        transform: `translate(-50%, 0) scale(${scale})`,
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '816px',
                        height: '1054px',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        position: 'absolute',
                        top: 0
                      }}
                      className="quote-sheet-paper bg-white text-black shadow-xl border border-zinc-300 rounded-sm px-8 py-6 flex flex-col justify-between select-none shrink-0"
                    >
<div className="flex-1 flex flex-col">
                        {activePage === 1 ? (
                          <>
                            {/* Hidden file inputs for logo uploads */}
                            <input type="file" ref={leftLogoInputRef} onChange={handleLeftLogoUpload} accept="image/*" className="hidden" />
                            <input type="file" ref={rightLogoInputRef} onChange={handleRightLogoUpload} accept="image/*" className="hidden" />

                            {/* Logo Header (Matches print layout - Symmetrical Centered Layout) */}
                            <div className="flex justify-between items-center gap-4 pb-2">
                              {/* Left logo slot */}
                              <div 
                                className="relative group cursor-pointer w-[120px] h-[55px] border border-dashed border-zinc-300 rounded flex items-center justify-center overflow-hidden hover:border-black transition-colors"
                                onClick={() => leftLogoInputRef.current?.click()}
                                title="Cambiar logotipo izquierdo (Click para subir)"
                              >
                                {customLogoUrl ? (
                                  <>
                                    <img src={customLogoUrl} className="max-h-full max-w-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-black uppercase">
                                      Cambiar
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-[8px] font-black text-zinc-400 uppercase text-center px-1">Logo 1 (Clic para subir)</span>
                                )}
                              </div>
                              
                              {/* Center store info */}
                              <div className="text-center flex-1">
                                <input
                                  type="text"
                                  value={storeName}
                                  onChange={e => handleCaretPreservingChange(e, setStoreName, val => val.toUpperCase())}
                                  className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-black text-sm uppercase text-center tracking-wide leading-tight w-full focus:border-b focus:border-zinc-300"
                                  placeholder="NOMBRE DEL NEGOCIO"
                                />
                                <div className="text-[9.5px] text-zinc-700 font-bold mt-1 uppercase leading-normal flex flex-col items-center">
                                  <input
                                    type="text"
                                    value={storeAddressL1}
                                    onChange={e => handleCaretPreservingChange(e, setStoreAddressL1, val => val.toUpperCase())}
                                    className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-bold text-[9px] text-center w-full focus:border-b focus:border-zinc-300"
                                    placeholder="Calle, Número y Colonia"
                                  />
                                  <input
                                    type="text"
                                    value={storeAddressL2}
                                    onChange={e => handleCaretPreservingChange(e, setStoreAddressL2, val => val.toUpperCase())}
                                    className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-bold text-[9px] text-center w-full mt-0.5 focus:border-b focus:border-zinc-300"
                                    placeholder="Ciudad, Estado"
                                  />
                                  <div className="mt-1 font-bold flex justify-center gap-1.5 items-center w-full text-blue-700 underline text-[9.5px]">
                                    <span className="text-[8.5px] text-blue-600 no-underline">TEL:</span>
                                    <input
                                      type="text"
                                      value={storePhone}
                                      onChange={e => setStorePhone(e.target.value)}
                                      className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-bold text-[9.5px] text-blue-700 underline w-[95px] text-center focus:border-b focus:border-blue-400"
                                      placeholder="Número Fijo"
                                    />
                                    <span className="no-underline text-blue-600">·</span>
                                    <span className="text-[8.5px] text-blue-600 no-underline">WA:</span>
                                    <input
                                      type="text"
                                      value={storePhone2}
                                      onChange={e => setStorePhone2(e.target.value)}
                                      className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-bold text-[9.5px] text-blue-700 underline w-[95px] text-center focus:border-b focus:border-blue-400"
                                      placeholder="WhatsApp"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right logo slot */}
                              <div 
                                className="relative group cursor-pointer w-[120px] h-[55px] border border-dashed border-zinc-300 rounded flex items-center justify-center overflow-hidden hover:border-black transition-colors"
                                onClick={() => rightLogoInputRef.current?.click()}
                                title="Cambiar logotipo derecho (Click para subir)"
                              >
                                {customRightLogoUrl ? (
                                  <>
                                    <img src={customRightLogoUrl} className="max-h-full max-w-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-black uppercase">
                                      Cambiar
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-[8px] font-black text-zinc-400 uppercase text-center px-1">Logo 2 (Clic para subir)</span>
                                )}
                              </div>
                            </div>

                            {/* Raya separadora negra triple (delgada-gruesa-delgada) */}
                            <div className="w-full mb-3 shrink-0">
                              <div className="h-[1px] bg-black w-full mb-[2px]"></div>
                              <div className="h-[3px] bg-black w-full mb-[2px]"></div>
                              <div className="h-[1px] bg-black w-full"></div>
                            </div>

                            {/* Centered Slogan */}
                            {config.slogan && (
                              <div className="text-center text-xs font-bold text-zinc-800 italic uppercase mb-2.5 shrink-0">
                                "{config.slogan.replace(/"/g, '')}"
                              </div>
                            )}


                            {/* Slogan & Title */}
                            <div className="text-center mb-4">
                              <div className="text-xl font-black tracking-widest border-b border-black pb-1 uppercase flex justify-center">
                                <input
                                  type="text"
                                  className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-black uppercase text-center tracking-widest w-full text-lg text-black focus:border-b focus:border-black"
                                  placeholder="COTIZACIÓN"
                                  value={title}
                                  onChange={e => handleCaretPreservingChange(e, setTitle, val => val.toUpperCase())}
                                />
                              </div>
                            </div>

                             {/* Client & Metadata Box (2 Rows) to match PDF layout */}
                             <div className="border-[1.5px] border-slate-200 rounded bg-slate-50/80 p-3 flex flex-col gap-2.5 text-xs font-black text-black shrink-0 mb-4">
                               {/* Row 1: Cliente & Teléfono */}
                               <div className="flex justify-between items-center w-full gap-4">
                                 {/* Client Input */}
                                 <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                   <span className="text-[10px] text-black font-black uppercase tracking-wider shrink-0">CLIENTE:</span>
                                   <div className="flex-1 relative">
                                     <input
                                       type="text"
                                       className="quote-sheet-input-underline w-full border-b border-zinc-300 focus:border-black focus:outline-none bg-transparent font-black px-1 py-0.5 text-xs text-black"
                                       placeholder="NOMBRE..."
                                       value={customerName}
                                       onChange={e => handleCaretPreservingChange(e, (val) => { setCustomerName(val); setClientQuery(val); setShowClientSugg(true); }, val => val.toUpperCase())}
                                       onFocus={() => setShowClientSugg(true)}
                                       onBlur={() => setTimeout(() => setShowClientSugg(false), 150)}
                                     />
                                     {showClientSugg && clientSugg.length > 0 && (
                                       <div className="absolute z-10 top-full left-0 right-0 mt-0.5 shadow-lg rounded overflow-hidden bg-white border border-zinc-200">
                                         {clientSugg.map(c => (
                                           <button
                                             key={c.id}
                                             type="button"
                                             className="w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:bg-zinc-100 text-zinc-800"
                                             onMouseDown={() => {
                                               setCustomerName(c.name);
                                               setCustomerPhone(formatPhoneNumber(c.phone));
                                               setCustomerCountryCode(c.countryCode || '+52');
                                               setShowClientSugg(false);
                                             }}
                                           >
                                             <span className="font-bold">{c.name}</span>
                                             <span className="ml-2 text-zinc-400">{c.phone}</span>
                                           </button>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                 </div>

                                 {/* Phone Input */}
                                 <div className="flex items-center gap-1.5 w-[230px] shrink-0 justify-end">
                                   <span className="text-[10px] text-black font-black uppercase tracking-wider shrink-0">TELÉFONO:</span>
                                   <div className="flex w-[160px] border-b border-zinc-300 focus-within:border-black bg-transparent min-w-0">
                                     <CountryCodeSelect
                                       value={customerCountryCode || config.phoneCountryCode || '+52'}
                                       onChange={code => setCustomerCountryCode(code)}
                                       isCompact
                                       className="quote-sheet-select py-0.5 pr-0.5 text-xs font-black bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer text-black shrink-0"
                                     />
                                     <input
                                       type="text"
                                       placeholder="Teléfono"
                                       className="quote-sheet-input-clean flex-1 min-w-0 border-none focus:outline-none focus:ring-0 bg-transparent py-0.5 text-xs text-black font-black"
                                       value={customerPhone}
                                       onChange={e => {
                                         const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                         setCustomerPhone(formatPhoneNumber(digits));
                                       }}
                                     />
                                   </div>
                                 </div>
                               </div>

                               {/* Divider */}
                               <div className="h-[1px] bg-zinc-200 w-full shrink-0"></div>

                               {/* Row 2: Fecha & Vence */}
                               <div className="flex justify-between items-center w-full gap-4">
                                 {/* Date of Issue (Fecha) */}
                                 <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                   <span className="text-[10px] text-black font-black uppercase tracking-wider shrink-0">FECHA EMISIÓN:</span>
                                   <span className="border-b border-transparent py-0.5 text-xs text-black font-black w-[100px] text-left">
                                     {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                   </span>
                                 </div>

                                 {/* Validity Input */}
                                 <div className="flex items-center gap-1.5 w-[220px] shrink-0 justify-end">
                                   <span className="text-[10px] text-black font-black uppercase tracking-wider shrink-0">VÁLIDA HASTA:</span>
                                   <input
                                     type="date"
                                     className="quote-sheet-input-underline border-b border-zinc-300 focus:border-black focus:outline-none bg-transparent font-black px-1 py-0.5 text-xs text-black cursor-pointer w-[120px] text-center"
                                     value={validUntil}
                                     onChange={e => setValidUntil(e.target.value)}
                                   />
                                 </div>
                               </div>
                             </div>
                          </>
                        ) : (
                          /* Mini Header for subsequent pages */
                          <div className="flex justify-between items-center border-b pb-2 mb-6 text-[10px] font-black text-zinc-500 uppercase tracking-wider shrink-0">
                            <span>{title || 'COTIZACIÓN'} · {customerName || 'CLIENTE'}</span>
                            <span className="font-mono">Página {activePage} de {paginateQuoteItems(devices).length}</span>
                          </div>
                        )}


                  {/* Items List in Visual Format */}
                  <div className="space-y-3 mb-3 flex-1">
                    {(paginateQuoteItems(devices)[activePage - 1] || []).map((device, localIdx) => {
                      const globalIdx = getGlobalIndex(localIdx);
                      return (
                        <div 
                          key={globalIdx} 
                          onClick={() => setEditingDeviceIndex(globalIdx)}
                          className={`relative group flex justify-between gap-4 border-b pb-3 transition-all ${
                            editingDeviceIndex === globalIdx 
                              ? 'border-blue-400 bg-blue-50/5 -mx-2 px-2 rounded-lg' 
                              : 'border-zinc-200'
                          }`}
                        >
                          {/* Remove item button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDevice(globalIdx);
                            }}
                            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-1 rounded-full cursor-pointer shadow-sm z-10"
                            title="Eliminar este equipo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Col 1: Upload Image Box (22% width) */}
                          <div className="w-[22%] flex flex-col items-center justify-center bg-zinc-50 border border-zinc-200 rounded p-1 max-h-[90px] overflow-hidden relative group/img shrink-0">
                            {device.deviceImageUrl ? (
                              <>
                                <img src={device.deviceImageUrl} className="max-h-[75px] max-w-full object-contain rounded" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeviceIndex(globalIdx);
                                    setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, deviceImageUrl: '' } : d));
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer shadow"
                                  title="Eliminar imagen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center text-center w-full">
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full hover:bg-zinc-100 rounded py-0.5">
                                  <Plus className="w-4 h-4 text-zinc-400" />
                                  <span className="text-[9px] font-black text-zinc-500 mt-1 uppercase">Subir Imagen</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                      setEditingDeviceIndex(globalIdx);
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => {
                                          const base64 = ev.target?.result as string;
                                          setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, deviceImageUrl: base64 } : d));
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                                <input
                                  type="text"
                                  placeholder="Link de imagen..."
                                  className="w-full border border-zinc-300 rounded px-1 py-0.5 text-[8px] font-bold text-black text-center mt-1 focus:outline-none focus:border-black"
                                  onChange={e => {
                                    setEditingDeviceIndex(globalIdx);
                                    const url = e.target.value.trim();
                                    setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, deviceImageUrl: url } : d));
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Col 2: Description (54% width) */}
                          <div className="w-[54%] flex flex-col justify-center">
                            <textarea
                              rows={3}
                              placeholder="DESCRIPCIÓN DEL PRODUCTO / SERVICIO COTIZADO..."
                              className="quote-sheet-textarea w-full border border-zinc-300 rounded p-1.5 text-xs font-black text-black focus:outline-none focus:border-black resize-none placeholder-zinc-300 bg-white"
                              value={device.serviceType}
                              onFocus={() => setEditingDeviceIndex(globalIdx)}
                              onChange={e => {
                                setEditingDeviceIndex(globalIdx);
                                const v = e.target.value.toUpperCase();
                                setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, serviceType: v } : d));
                              }}
                            />
                          </div>

                          {/* Col 3: Qty & Price inputs (20% width) */}
                          <div className="w-[20%] flex flex-col gap-1.5 justify-center items-stretch shrink-0">
                            {/* Cantidad */}
                            <div className="flex items-center gap-1 border border-zinc-350 rounded px-1.5 py-0.5 focus-within:border-black bg-white w-full">
                              <span className="text-[9px] font-black text-zinc-400 uppercase shrink-0">CANT</span>
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                className="quote-sheet-input-table w-full border-none focus:outline-none focus:ring-0 p-0 text-xs font-black text-black text-center bg-transparent"
                                value={device.quantity ?? ''}
                                onFocus={() => setEditingDeviceIndex(globalIdx)}
                                onChange={e => {
                                  setEditingDeviceIndex(globalIdx);
                                  const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                  setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, quantity: val } : d));
                                }}
                                onBlur={() => {
                                  if (!device.quantity || device.quantity < 1) {
                                    setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, quantity: 1 } : d));
                                  }
                                }}
                              />
                            </div>

                            {/* Costo Unitario */}
                            <div className="flex items-center gap-0.5 border border-zinc-350 rounded px-1.5 py-0.5 focus-within:border-black bg-white w-full">
                              <span className="text-xs font-bold text-zinc-500 shrink-0">{config.currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="quote-sheet-input-table w-full border-none focus:outline-none focus:ring-0 p-0 text-xs font-black text-black placeholder-zinc-300 bg-transparent text-right"
                                value={device.estimatedCost || ''}
                                onFocus={() => setEditingDeviceIndex(globalIdx)}
                                onChange={e => {
                                  setEditingDeviceIndex(globalIdx);
                                  setDevices(prev => prev.map((d, i) => i === globalIdx ? { ...d, estimatedCost: parseFloat(e.target.value) || 0 } : d));
                                }}
                              />
                            </div>

                            {/* Subtotal */}
                            <div className="text-[10px] font-black text-zinc-600 text-right pr-0.5 whitespace-nowrap">
                              Sub: {config.currencySymbol}{((device.quantity || 1) * (device.estimatedCost || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activePage === paginateQuoteItems(devices).length && (
                  <div className="shrink-0 space-y-3">
                    <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-2">
                      <div className="flex justify-between items-center border-b pb-1.5 mb-1.5">
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-wider">MANO DE OBRA E INSUMOS ADICIONALES</span>
                        <button
                          type="button"
                          onClick={() => setAdditionalConcepts(prev => [...prev, { id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 100), description: '', price: 0, quantity: 1 }])}
                          className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 border-none bg-transparent cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Agregar línea
                        </button>
                      </div>

                      <div className="flex gap-2 items-center px-1 text-[8px] font-black text-zinc-400 uppercase tracking-wider select-none mb-1">
                        <div className="flex-1">Descripción</div>
                        <div className="w-12 text-center">Cant</div>
                        <div className="w-24 text-center">$ Unitario</div>
                        <div className="w-20 text-center">Subtotal</div>
                        <div className="w-5 shrink-0"></div>
                      </div>

                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {additionalConcepts.map((concept) => (
                          <div key={concept.id} className="flex gap-2 items-center">
                            <div className="relative flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="DESCRIPCIÓN (EJ: CABLE UTP CAT5...)"
                                className="quote-sheet-input-border w-full bg-white border border-zinc-300 rounded px-2 py-1 text-[11px] font-bold uppercase text-black focus:outline-none focus:border-blue-500"
                                value={concept.description}
                                onChange={e => {
                                  const val = e.target.value.toUpperCase();
                                  setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, description: val } : c));
                                  setActiveSuggestionIndex(-1);
                                  
                                  const found = insumosCatalog.find(s => s.description.toUpperCase() === val.trim());
                                  if (found) {
                                    setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, description: found.description.toUpperCase(), price: found.price, quantity: c.quantity || 1 } : c));
                                  }
                                }}
                                onFocus={e => {
                                  setFocusedConceptId(concept.id);
                                  setActiveSuggestionIndex(-1);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setFocusedInputRect({ bottom: rect.bottom, left: rect.left, width: rect.width });
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setFocusedConceptId(null);
                                  }, 200);
                                }}
                                onKeyDown={e => {
                                  const q = (concept.description || '').toUpperCase();
                                  const suggestions = q.trim() ? insumosCatalog.filter(s => s.description.toUpperCase().includes(q)).slice(0, 5) : [];
                                  
                                  if (suggestions.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
                                        const selected = suggestions[activeSuggestionIndex];
                                        setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, description: selected.description.toUpperCase(), price: selected.price, quantity: c.quantity || 1 } : c));
                                        setFocusedConceptId(null);
                                        setActiveSuggestionIndex(-1);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setFocusedConceptId(null);
                                      setActiveSuggestionIndex(-1);
                                    }
                                  }
                                }}
                              />
                              {(() => {
                                const q = (concept.description || '').toUpperCase();
                                const suggestions = q.trim() && focusedConceptId === concept.id
                                  ? insumosCatalog.filter(s => s.description.toUpperCase().includes(q)).slice(0, 5)
                                  : [];
                                
                                if (suggestions.length === 0 || !focusedInputRect) return null;

                                return createPortal(
                                  <div 
                                    className="fixed z-[9999] mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded shadow-md p-1 space-y-0.5"
                                    style={{
                                      top: `${focusedInputRect.bottom}px`,
                                      left: `${focusedInputRect.left}px`,
                                      width: `${focusedInputRect.width}px`
                                    }}
                                  >
                                    {suggestions.map((s, idx) => {
                                      const isActive = activeSuggestionIndex === idx;
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-black uppercase flex justify-between items-center transition-all cursor-pointer ${
                                            isActive 
                                              ? 'bg-purple-600 text-white border-none shadow-sm'
                                              : 'bg-white hover:bg-purple-50 text-zinc-800'
                                          }`}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, description: s.description.toUpperCase(), price: s.price, quantity: c.quantity || 1 } : c));
                                            setFocusedConceptId(null);
                                            setActiveSuggestionIndex(-1);
                                          }}
                                        >
                                          <span className="truncate pr-1">{s.description}</span>
                                          <span className={`font-bold shrink-0 text-[9px] ${isActive ? 'text-purple-100' : 'text-purple-600'}`}>
                                            {config.currencySymbol}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>,
                                  document.body
                                );
                              })()}
                            </div>
                            
                            <input
                              type="number"
                              min="1"
                              placeholder="1"
                              className="quote-sheet-input-border w-12 border border-zinc-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-blue-500 text-[11px] font-bold text-black text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={concept.quantity ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, quantity: val } : c));
                              }}
                              onBlur={() => {
                                if (!concept.quantity || concept.quantity < 1) {
                                  setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, quantity: 1 } : c));
                                }
                              }}
                            />
                            
                            <input
                              type="number"
                              placeholder="0.00"
                              className="quote-sheet-input-border w-24 border border-zinc-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-blue-500 text-[11px] font-bold text-black text-center shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={concept.price || ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setAdditionalConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, price: val } : c));
                              }}
                            />

                            {/* Subtotal */}
                            <div className="text-[10px] font-black text-zinc-600 shrink-0 w-20 text-center">
                              {config.currencySymbol}{((concept.quantity || 1) * (concept.price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalConcepts(prev => {
                                  const filtered = prev.filter(c => c.id !== concept.id);
                                  return filtered.length === 0 ? [{ id: 'c_' + Date.now(), description: '', price: 0, quantity: 1 }] : filtered;
                                });
                              }}
                              className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 cursor-pointer border-none bg-transparent"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                     <div className="border-l-[3.5px] border-black pl-3 py-0.5 my-3 select-none">
                       <label className="text-[9.5px] font-black text-zinc-500 block mb-0.5 uppercase tracking-wider">Propuesta y Observaciones</label>
                       <textarea
                         className="quote-sheet-input-clean w-full border-none focus:outline-none focus:ring-0 bg-transparent p-0 text-xs font-black italic text-zinc-800 resize-none placeholder-zinc-350"
                         placeholder="EJ: LE PROPONGO DOS CÁMARAS CON GRABACIÓN DE SONIDO..."
                         value={notes}
                         onChange={e => handleCaretPreservingChange(e, setNotes, val => val.toUpperCase())}
                         rows={2}
                       />
                     </div>

                     <div className="bg-black text-white text-right font-black py-2.5 px-4 text-base rounded uppercase tracking-wider flex justify-between">
                       <span>TOTAL ESTIMADO:</span>
                       <span>{config.currencySymbol}{totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>

                     <div className="flex flex-col items-center text-center mt-6 px-1 select-none w-full">
                       <div className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider mb-8">Atentamente,</div>
                       <div className="w-60 border-b border-black mb-1.5"></div>
                       <input
                         type="text"
                         className="quote-sheet-input-clean border-none focus:outline-none bg-transparent font-black uppercase text-center w-full text-xs text-black focus:border-b focus:border-black py-0.5 placeholder-zinc-350"
                         placeholder="FIRMA RESPONSABLE (EJ: LIC. JUAN MANUEL GARCÍA ALANIZ)"
                         value={createdBy}
                         onChange={e => handleCaretPreservingChange(e, setCreatedBy, val => val.toUpperCase())}
                       />
                       <div className="text-[8.5px] font-bold text-zinc-400 mt-0.5 uppercase">Responsable / Asesor Técnico</div>
                     </div>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

            {/* Fixed footer for Letter Mode */}
            <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-4 shrink-0 ${
              isRetro ? 'bg-[#d4d0c8] border-zinc-500 text-black' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-[#151822] border-zinc-800 text-zinc-100'
            }`}>
              <div className="flex-1 min-w-[180px] flex items-center gap-3">
                {devices.length < 15 && (
                  <button
                    type="button"
                    onClick={addDevice}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-black text-xs rounded transition-colors cursor-pointer border ${
                      isRetro
                        ? 'bg-[#d4d0c8] text-black border-zinc-400 hover:bg-zinc-100'
                        : isLight
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Concepto
                  </button>
                )}
                {errorMsg && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Fixed Pagination Controls in Center */}
              <div className="flex-1 flex justify-center">
                {paginateQuoteItems(devices).length > 1 && (
                  <div className="flex items-center gap-4 select-none">
                    <button
                      type="button"
                      disabled={activePage === 1}
                      onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                      className={`px-3 py-1 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed font-black rounded text-xs border shadow-sm transition-colors cursor-pointer ${
                        isRetro ? 'text-black border-zinc-400' : 'text-zinc-800 border-zinc-300'
                      }`}
                    >
                      ← Anterior
                    </button>
                    <span className={`text-xs font-black px-3 py-1 rounded shadow-inner ${
                      isRetro ? 'bg-black/10 text-black' : 'bg-zinc-300/80 text-zinc-700'
                    }`}>
                      Página {activePage} de {paginateQuoteItems(devices).length}
                    </span>
                    <button
                      type="button"
                      disabled={activePage === paginateQuoteItems(devices).length}
                      onClick={() => setActivePage(prev => Math.min(paginateQuoteItems(devices).length, prev + 1))}
                      className={`px-3 py-1 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed font-black rounded text-xs border shadow-sm transition-colors cursor-pointer ${
                        isRetro ? 'text-black border-zinc-400' : 'text-zinc-800 border-zinc-300'
                      }`}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex justify-end gap-2 min-w-[200px]">
                <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
                <button type="button" className={btnPrimary} onClick={handleConfirm} style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                  <span className="flex items-center gap-1" style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}><Check className="w-3.5 h-3.5" /> Guardar Cotización</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Formato Rápido (Ticket) */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* No. cotización (auto) */}
            <div className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${isRetro ? 'bg-[#000080]/10 text-[#000080]' : isLight ? 'bg-blue-50 text-blue-700' : 'bg-zinc-700/40 text-zinc-400'}`}>
              ID: {nextId}
            </div>

            {/* Cliente */}
            <div className="shrink-0">
              <div className={`text-[10px] uppercase font-black mb-2 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Cliente</div>
              <div className="relative mb-2">
                <input
                  autoFocus
                  id="cot-name"
                  className={inputCls}
                  style={{ textTransform: 'uppercase' }}
                  placeholder="Nombre del cliente..."
                  value={customerName}
                  onChange={e => handleCaretPreservingChange(e, (val) => { setCustomerName(val); setClientQuery(val); setShowClientSugg(true); }, val => val.toUpperCase())}
                  onFocus={() => setShowClientSugg(true)}
                  onBlur={() => setTimeout(() => setShowClientSugg(false), 150)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-phone')?.focus(); } }}
                />
                {showClientSugg && clientSugg.length > 0 && (
                  <div className={`absolute z-10 top-full left-0 right-0 mt-0.5 shadow-lg rounded overflow-hidden ${isLight ? 'bg-white border border-zinc-200' : 'bg-[#1c1f2e] border border-zinc-700'}`}>
                    {clientSugg.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-700/50'} border-none`}
                        onMouseDown={() => {
                          setCustomerName(c.name);
                          setCustomerPhone(formatPhoneNumber(c.phone));
                          setCustomerCountryCode(c.countryCode || '+52');
                          setShowClientSugg(false);
                        }}
                      >
                        <span className="font-bold">{c.name}</span>
                        <span className={`ml-2 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Teléfono — mismo estilo que NuevaView */}
              <div className={`flex rounded-lg overflow-hidden border focus-within:ring-1 ${isRetro ? 'border-zinc-400 focus-within:border-[#000080] focus-within:ring-[#000080]' : isLight ? 'border-[#b2c0cc] focus-within:border-blue-600 focus-within:ring-blue-600' : 'border-zinc-600 focus-within:border-blue-500 focus-within:ring-blue-500'} ${isLight ? 'bg-white' : 'bg-[#1c1f2e]'} shadow-sm`}>
                <div className={`border-r shrink-0 flex items-center relative select-none ${isRetro ? 'bg-zinc-100 border-zinc-400' : isLight ? 'bg-zinc-100 border-[#b2c0cc]' : 'bg-zinc-800 border-zinc-600'}`}>
                  <CountryCodeSelect
                    value={customerCountryCode}
                    onChange={code => setCustomerCountryCode(code)}
                    className={`pl-2.5 pr-6 py-2 text-xs font-bold font-mono border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none h-full ${isLight ? 'bg-zinc-100 text-zinc-800' : 'bg-zinc-800 text-zinc-200'}`}
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23555'><path fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /></svg>")`, backgroundPosition: 'right 0.35rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.8rem' }}
                  />
                </div>
                <input
                  id="cot-phone"
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="(351) 157-4876"
                  value={customerPhone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCustomerPhone(formatPhoneNumber(digits));
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-validez')?.focus(); } }}
                  className={`flex-1 min-w-0 border-none focus:outline-none focus:ring-0 px-3 py-1.5 text-sm font-bold ${isLight ? 'bg-white text-zinc-900' : 'bg-[#1c1f2e] text-zinc-100'}`}
                />
              </div>
            </div>

            {/* Validez */}
            <div className="shrink-0">
              <label className={`text-[10px] uppercase font-black mb-1 block ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Válida hasta (opcional)</label>
              <input
                id="cot-validez"
                type="date"
                className={inputCls}
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-brand')?.focus(); } }}
              />
            </div>

            {/* Equipos */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className={`text-[10px] uppercase font-black ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Equipos</div>
                <button type="button" onClick={addDevice} className={`flex items-center gap-1 text-xs font-bold cursor-pointer border-none bg-transparent ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}>
                  <Plus className="w-3.5 h-3.5" /> Agregar equipo
                </button>
              </div>

              {/* Device tabs */}
              {devices.length > 1 && (
                <div className="flex gap-1 mb-2 flex-wrap shrink-0">
                  {devices.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingDeviceIndex(i)}
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-colors border-none ${
                        editingDeviceIndex === i
                          ? (isRetro ? 'bg-[#000080] text-white' : 'bg-blue-600 text-white')
                          : (isRetro ? 'bg-zinc-200 text-zinc-700' : isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-700 text-zinc-300')
                      }`}
                    >
                      Equipo {i + 1}
                      {devices.length > 1 && (
                        <X className="w-3 h-3 ml-0.5" onClick={e => { e.stopPropagation(); removeDevice(i); }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Device form */}
              <div className={`p-3 rounded flex flex-col gap-2 ${isRetro ? 'bg-zinc-200 border border-zinc-400' : isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-800/40 border border-zinc-700'}`}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Marca</label>
                    <input id="cot-brand" className={inputCls} style={{ textTransform: 'uppercase' }} placeholder="Ej: Apple..." value={currentDevice.deviceBrand} onChange={e => handleCaretPreservingChange(e, (val) => updateCurrentDevice({ deviceBrand: val }), val => val.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-model')?.focus(); } }} />
                  </div>
                  <div className="flex-1">
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Modelo</label>
                    <input id="cot-model" className={inputCls} style={{ textTransform: 'uppercase' }} placeholder="Ej: iPhone 14..." value={currentDevice.deviceModel} onChange={e => handleCaretPreservingChange(e, (val) => updateCurrentDevice({ deviceModel: val }), val => val.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-modelnumber')?.focus(); } }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Tipo</label>
                    <select className={inputCls} value={currentDevice.deviceType} onChange={e => updateCurrentDevice({ deviceType: e.target.value as QuoteDevice['deviceType'] })}>
                      <option value="Phone">Celular</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Escritorio</option>
                      <option value="Other">Otro</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>No. Modelo (opcional)</label>
                    <input id="cot-modelnumber" className={inputCls} style={{ textTransform: 'uppercase' }} placeholder="Ej: A2894..." value={currentDevice.deviceModelNumber} onChange={e => handleCaretPreservingChange(e, (val) => updateCurrentDevice({ deviceModelNumber: val }), val => val.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-falla')?.focus(); } }} />
                  </div>
                </div>
                <div>
                  <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Falla reportada</label>
                  <input id="cot-falla" className={inputCls} style={{ textTransform: 'uppercase' }} placeholder="Describe la falla..." value={currentDevice.faultDescription} onChange={e => handleCaretPreservingChange(e, (val) => updateCurrentDevice({ faultDescription: val }), val => val.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-service')?.focus(); } }} />
                </div>
                <div>
                  <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Servicio a cotizar</label>
                  <input
                    id="cot-service"
                    className={inputCls}
                    style={{ textTransform: 'uppercase' }}
                    placeholder="Buscar servicio..."
                    value={currentDevice.serviceType}
                    onChange={e => handleCaretPreservingChange(e, (val) => { updateCurrentDevice({ serviceType: val }); setServiceQuery(val); }, val => val.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-cost')?.focus(); } }}
                  />
                  {serviceQuery && serviceSugg.length > 0 && (
                    <div className={`mt-0.5 rounded overflow-hidden border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#1c1f2e] border-zinc-700'}`}>
                      {serviceSugg.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className={`w-full text-left px-2 py-1 text-xs cursor-pointer flex justify-between items-center ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-700/50'} border-none`}
                          onMouseDown={() => {
                            updateCurrentDevice({ serviceType: s.description, estimatedCost: s.price, deviceImageUrl: (s as any).imageUrl || '' });
                            setServiceQuery('');
                          }}
                        >
                          <span className="truncate pr-2 flex items-center gap-1">
                            {s.isRefaccion && (
                              <span className="text-[8px] bg-emerald-650/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-450 px-1.5 py-0.5 rounded font-mono font-black uppercase shrink-0">
                                PIEZA
                              </span>
                            )}
                            <span className="truncate">{s.description}</span>
                          </span>
                          <span className={`font-bold shrink-0 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>{config.currencySymbol}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      className={inputCls}
                      value={currentDevice.quantity ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                        updateCurrentDevice({ quantity: val });
                      }}
                      onBlur={() => {
                        if (!currentDevice.quantity || currentDevice.quantity < 1) {
                          updateCurrentDevice({ quantity: 1 });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Costo estimado</label>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold shrink-0 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{config.currencySymbol}</span>
                      <input
                        id="cot-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls}
                        value={currentDevice.estimatedCost || ''}
                        onChange={e => updateCurrentDevice({ estimatedCost: parseFloat(e.target.value) || 0 })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cot-notes')?.focus(); } }}
                      />
                    </div>
                  </div>
                </div>
                {/* Product Image Input */}
                <div>
                  <label className={`text-[9px] uppercase font-bold mb-1 block ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Imagen del Producto (opcional)</label>
                  <div className="flex items-center gap-2 mt-1">
                    {currentDevice.deviceImageUrl ? (
                      <div className="relative w-12 h-12 border rounded overflow-hidden bg-white flex items-center justify-center shrink-0">
                        <img src={currentDevice.deviceImageUrl} className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => updateCurrentDevice({ deviceImageUrl: '' })}
                          className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl hover:bg-red-700 border-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className={`w-12 h-12 border border-dashed rounded flex flex-col items-center justify-center cursor-pointer shrink-0 ${isLight ? 'bg-white border-zinc-300 hover:bg-zinc-100' : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700/50'}`}>
                        <Plus className="w-4 h-4 text-zinc-400" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = ev => updateCurrentDevice({ deviceImageUrl: ev.target?.result as string });
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        className={inputCls}
                        placeholder="Pegar URL de imagen..."
                        value={currentDevice.deviceImageUrl || ''}
                        onChange={e => updateCurrentDevice({ deviceImageUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div style={{ background: isRetro ? '#000080' : isLight ? '#1a3a6b' : '#11131e', color: '#ffffff', WebkitTextFillColor: '#ffffff' }} className="flex justify-between items-center p-2 rounded font-black shrink-0">
              <span className={isRetro ? 'retro-white-text' : ''} style={{ fontSize: '0.875rem', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>TOTAL ESTIMADO</span>
              <span className={isRetro ? 'retro-white-text' : ''} style={{ fontSize: '1.125rem', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>{config.currencySymbol}{totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Notas */}
            <div className="shrink-0">
              <label className={`text-[10px] uppercase font-black mb-1 block ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Notas (opcional)</label>
              <textarea
                id="cot-notes"
                className={`${inputCls} resize-none`}
                style={{ textTransform: 'uppercase' }}
                rows={2}
                placeholder="Observaciones adicionales..."
                value={notes}
                onChange={e => handleCaretPreservingChange(e, setNotes, val => val.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirm(); } }}
              />
              <label className={`flex items-center gap-1.5 mt-1.5 cursor-pointer select-none text-[9.5px] font-black uppercase ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <input
                  type="checkbox"
                  checked={showNotesOnTicket}
                  onChange={e => setShowNotesOnTicket(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                />
                <span>Imprimir notas en la cotización</span>
              </label>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1 shrink-0">
              <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
              <button
                id="cot-save-btn"
                type="button"
                className={btnPrimary}
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                onClick={handleConfirm}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
              >
                <span className="flex items-center gap-1" style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}><Check className="w-3.5 h-3.5" /> {(editingQuote && !isClone) ? 'Actualizar Cotización' : 'Guardar Cotización'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowConfirm(false); }} onClick={e => e.stopPropagation()} tabIndex={-1}>
          <div className={`w-full max-w-sm rounded-xl border shadow-2xl overflow-hidden ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-white border-zinc-200' : 'bg-[#161822] border-zinc-700'}`} autoFocus>
            <div className={`px-4 py-3 font-black text-sm uppercase tracking-wide ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-[#1a3a6b] text-white' : 'bg-[#11131e] text-white'}`}
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
              {(editingQuote && !isClone) ? 'Confirmar cambios' : 'Confirmar cotización'}
            </div>
            <div className="p-4 space-y-3">
              <p className={`text-sm ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                {editingQuote ? 'Se actualizará la cotización' : 'Se registrará la cotización'} <span className="font-black">{editingQuote ? editingQuote.id : nextId}</span> para:
              </p>
              <div className={`rounded-lg p-3 space-y-1 ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-800/50 border border-zinc-700'}`}>
                <p className={`text-sm font-black ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{customerName}</p>
                <p className={`text-xs font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{customerCountryCode} {formatPhoneNumber(customerPhone)}</p>
                <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{devices.length} equipo{devices.length > 1 ? 's' : ''} · Total estimado: <span className="font-black">{config.currencySymbol}{totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                {validUntil && <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Válida hasta: {new Date(validUntil).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
              </div>
              
              {/* Checkbox Imprimir */}
              <label className={`flex items-center gap-2 cursor-pointer select-none text-xs font-black uppercase py-1 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                <input
                  type="checkbox"
                  checked={shouldPrint}
                  onChange={e => {
                    setShouldPrint(e.target.checked);
                    if (e.target.checked) setShouldSendWhatsapp(false);
                  }}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                Imprimir formato al guardar
              </label>

              {/* Checkbox Enviar por WhatsApp */}
              {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                <label 
                  title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                  onClick={isWaIntegratedOffline ? (e) => { e.preventDefault(); window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.'); } : undefined}
                  className={`flex items-center gap-2 select-none text-xs font-black uppercase py-1 transition-all ${
                    isWaIntegratedOffline 
                      ? 'opacity-40 grayscale cursor-pointer' 
                      : 'cursor-pointer'
                  } ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={!isWaIntegratedOffline && shouldSendWhatsapp}
                    disabled={isWaIntegratedOffline}
                    onChange={e => {
                      setShouldSendWhatsapp(e.target.checked);
                      if (e.target.checked) setShouldPrint(false);
                    }}
                    style={{ accentColor: '#25D366' }}
                    className="rounded border-zinc-300 w-4 h-4 cursor-pointer pointer-events-none"
                  />
                  Enviar por WhatsApp al guardar
                </label>
              )}

              <p className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Presiona <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isLight ? 'bg-zinc-200' : 'bg-zinc-700'}`}>Enter</kbd> para confirmar o <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isLight ? 'bg-zinc-200' : 'bg-zinc-700'}`}>Esc</kbd> para cancelar.</p>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className={btnSecondary} onClick={() => setShowConfirm(false)}>Cancelar</button>
                <button
                  autoFocus
                  type="button"
                  className={btnPrimary}
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                  onClick={handleSave}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
                >
                  <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>{(editingQuote && !isClone) ? '✓ Confirmar y actualizar' : '✓ Confirmar y guardar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal CotizacionesView ───────────────────────────────────

export default function CotizacionesView({
  quotes,
  config,
  quoteCatalog,
  insumosCatalog = [],
  clients = [],
  currentUser,
  onCreateQuote,
  onUpdateQuote,
  onDeleteQuote,
  onConvertQuote,
  onAddQuoteCatalogItem,
  onAddInsumoCatalogItem,
  refacciones = [],
}: CotizacionesViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [waConnected, setWaConnected] = useState<boolean>(false);
  const [verifiedNumbers, setVerifiedNumbers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fixmanager_wa_verified_numbers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fixmanager_wa_verified_numbers', JSON.stringify(verifiedNumbers));
    } catch (e) {}
  }, [verifiedNumbers]);

  useEffect(() => {
    const handleStatus = (e: Event) => {
      setWaConnected((e as CustomEvent).detail);
    };
    window.addEventListener('whatsapp-status-update', handleStatus);

    const api = (window as any).electronAPI;
    if (api && api.whatsappGetStatus) {
      api.whatsappGetStatus().then((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      }).catch(() => {});
    }

    if (api && api.onWhatsappStatusChange) {
      api.onWhatsappStatusChange((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      });
    }

    return () => {
      window.removeEventListener('whatsapp-status-update', handleStatus);
    };
  }, []);

  const isWaIntegratedOffline = !waConnected;

  const getFormattedPhone = (phone: string, countryCode?: string) => {
    const cc = countryCode ? countryCode.replace(/\D/g, '') : '52';
    return formatPhoneForWhatsapp(phone, cc);
  };

  useEffect(() => {
    if (!waConnected) return;

    const api = (window as any).electronAPI;
    if (!api || !api.whatsappCheckNumber) return;

    // Collect all phone numbers and country codes from the quotes that are NOT in verifiedNumbers yet
    const pendingItems = quotes
      .map(q => ({ phone: q.customerPhone, cc: q.customerCountryCode }))
      .filter(item => item.phone && item.phone.trim() !== '');

    // Map to formatted phone numbers and deduplicate
    const pendingFormatted = Array.from(
      new Set(
        pendingItems.map(item => getFormattedPhone(item.phone, item.cc))
      )
    ).filter(formatted => verifiedNumbers[formatted] === undefined);

    if (pendingFormatted.length === 0) return;

    let active = true;
    const processQueue = async () => {
      for (const formatted of pendingFormatted) {
        if (!active || !waConnected) break;
        try {
          const res = await api.whatsappCheckNumber(formatted);
          if (res && res.success) {
            setVerifiedNumbers(prev => ({
              ...prev,
              [formatted]: res.exists
            }));
          }
        } catch (e) {
          console.error('[WhatsApp Check Hook Cotizaciones] Error checking phone:', formatted, e);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };

    processQueue();

    return () => {
      active = false;
    };
  }, [quotes, waConnected, verifiedNumbers]);

  const handlePhoneClick = async (phone: string, countryCode?: string, quote?: Quote) => {
    if (!phone) return;
    const formatted = getFormattedPhone(phone, countryCode);

    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 19) {
      greeting = 'Buenas tardes';
    } else if (hour >= 19 || hour < 5) {
      greeting = 'Buenas noches';
    }
    const storeName = config.storeName || '';
    const businessPart = storeName ? ` de ${storeName}` : '';
    let defaultText = '';

    if (quote) {
      const quoteId = quote.id;
      const devicesText = quote.devices && quote.devices.length > 0 
        ? quote.devices.map(d => `${d.deviceBrand || ''} ${d.deviceModel || ''}`.trim()).join(', ')
        : 'equipos';
      defaultText = `${greeting}, me comunico${businessPart} en relación a su cotización ${quoteId} para su ${devicesText}. `;
    } else {
      defaultText = `${greeting}, me comunico${businessPart}. `;
    }

    openWhatsappChat(phone, defaultText, countryCode || config.whatsappDefaultCountryCode || '52');
  };

  const renderClickablePhone = (phone: string, countryCode?: string, quote?: Quote, textStyle: string = '') => {
    if (!phone) return '—';
    const formatted = getFormattedPhone(phone, countryCode);
    const isVerified = verifiedNumbers[formatted];
    const formattedDisplay = formatPhoneNumber(phone);

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          handlePhoneClick(phone, countryCode, quote);
        }}
        title={isVerified ? "WhatsApp verificado - Clic para abrir chat" : "Clic para abrir chat de WhatsApp"}
        className={`cursor-pointer transition-all hover:underline ${
          isVerified 
            ? (isRetro 
                ? 'text-[#000080] font-black' 
                : isLight 
                ? 'text-emerald-700 hover:text-emerald-800 font-bold' 
                : 'text-emerald-400 hover:text-emerald-300 font-mono font-bold')
            : (isRetro
                ? 'text-[#000080]/80 font-bold'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 font-medium'
                : 'text-slate-300 hover:text-white font-medium')
        } ${textStyle}`}
      >
        {formattedDisplay}
      </span>
    );
  };

  const [searchTerm, setSearchTermRaw] = useState('');
  const setSearchTerm = (val: string) => {
    setSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [activeFilter, setActiveFilter] = useState<QuoteStatus | 'Todas'>('Todas');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'default' | 'letter'>('default');
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [copies, setCopies] = useState(1);
  const [zoom, setZoom] = useState(0.7);
  const [defaultEditorFormat, setDefaultEditorFormat] = useState<'letter' | 'ticket'>(() => (localStorage.getItem('fm-default-quote-format') as any) || 'letter');

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const anyModalOpen = showNewModal || previewQuote !== null;

  React.useEffect(() => {
    if (!anyModalOpen) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [anyModalOpen]);

  // Auto-mark expired
  const processedQuotes = useMemo(() => {
    return quotes.map(q => {
      if (q.status === 'Pendiente' && isExpired(q)) {
        return { ...q, status: 'Vencida' as const };
      }
      return q;
    });
  }, [quotes]);

  const filtered = useMemo(() => {
    let list = processedQuotes;
    if (activeFilter !== 'Todas') {
      list = list.filter(q => getEffectiveStatus(q) === activeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.replace(/,(?!\s)/g, '-').trim().toLowerCase();
      const searchDigits = searchTerm.replace(/\D/g, '');
      list = list.filter(qt => {
        const phoneDigits = (qt.customerPhone || '').replace(/\D/g, '');
        const phoneMatch = qt.customerPhone.toLowerCase().includes(q) || (searchDigits.length > 0 && phoneDigits.includes(searchDigits));
        return qt.customerName.toLowerCase().includes(q) || phoneMatch || qt.id.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [processedQuotes, activeFilter, searchTerm]);

  // Generate next quote ID
  const nextId = useMemo(() => {
    const nums = quotes.map(q => {
      const m = q.id.match(/^COT-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `COT-${String(max + 1).padStart(3, '0')}`;
  }, [quotes]);

  const handleCreate = (quote: Quote, options?: { printTicket?: boolean; sendWhatsapp?: boolean }) => {
    // Auto-save newly created quote items to catalog database
    if (quote.devices && quote.devices.length > 0) {
      quote.devices.forEach(d => {
        const cleanDesc = d.serviceType.trim();
        if (!cleanDesc) return;
        const exists = quoteCatalog.some(item => item.description.toUpperCase() === cleanDesc.toUpperCase());
        if (!exists && onAddQuoteCatalogItem) {
          onAddQuoteCatalogItem({
            id: 'quote_item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            description: cleanDesc,
            price: d.estimatedCost || 0
          });
        }
      });
    }

    if (quote.additionalConcepts && quote.additionalConcepts.length > 0) {
      quote.additionalConcepts.forEach(c => {
        const cleanDesc = c.description.trim();
        if (!cleanDesc) return;
        const exists = insumosCatalog.some(item => item.description.toUpperCase() === cleanDesc.toUpperCase());
        if (!exists && onAddInsumoCatalogItem) {
          onAddInsumoCatalogItem({
            id: 'insumo_item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            description: cleanDesc,
            price: c.price || 0
          });
        }
      });
    }

    if (editingQuote && !isCloneMode) {
      onUpdateQuote(quote, { printTicket: options?.printTicket });
    } else {
      onCreateQuote(quote, { printTicket: options?.printTicket });
    }

    if (options?.sendWhatsapp) {
      handleSendWhatsapp(quote, quote.editorFormat === 'letter' ? 'letter' : 'default');
    }

    setShowNewModal(false);
    setEditingQuote(null);
    setIsCloneMode(false);
  };

  const handleClone = (quote: Quote) => {
    setEditingQuote(quote);
    setIsCloneMode(true);
    setShowNewModal(true);
  };

  const handlePrint = (quote: Quote) => {
    setPreviewQuote(quote);
    setPrintStatus('idle');
    setCopies(1);
    setZoom(0.7);
    const hasImages = quote.devices.some(d => !!d.deviceImageUrl);
    setPreviewFormat(hasImages ? 'letter' : 'default');
  };

  const handleConfirmPrint = () => {
    if (!previewQuote) return;
    setPrintStatus('printing');
    
    const isLetter = previewFormat === 'letter';
    const html = isLetter 
      ? buildLetterQuoteTicketHtml(previewQuote, config)
      : buildQuoteTicketHtml(previewQuote, config);

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

    const targetPrinter = isLetter 
      ? (config.reportPrinterName || '') 
      : (config.hybridPrintMode ? (config.posPrinterBrand || config.ticketPrinterBrand || '') : (config.ticketPrinterBrand || ''));
    window.dispatchEvent(new CustomEvent('fm-silent-print', { 
      detail: { 
        html, 
        deviceName: targetPrinter, 
        paperWidthMicrons, 
        paperHeightMicrons, 
        copies, 
        isLabel: false,
        isReport: isLetter
      } 
    }));
    setPrintStatus('success');
    setTimeout(() => { setPreviewQuote(null); setPrintStatus('idle'); }, 1200);
  };

  const handleDelete = (quote: Quote) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cotización ${quote.id}?`)) {
      if (onDeleteQuote) {
        onDeleteQuote(quote.id);
      }
    }
  };

  const handleConvert = (quote: Quote) => {
    onConvertQuote(quote.id, {
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerCountryCode: quote.customerCountryCode,
      devices: quote.devices,
    });
  };

  const handleSendWhatsapp = async (quote: Quote, format: 'default' | 'letter') => {
    const isLetter = format === 'letter';
    const html = isLetter
      ? buildLetterQuoteTicketHtml(quote, config)
      : buildQuoteTicketHtml(quote, config);
    const phone = quote.customerPhone;
    const cc = (quote.customerCountryCode || '+52').replace('+', '');
    const mode = (config as any).whatsappMode || 'integrated';
    await sendWhatsappQuote(phone, quote.id, isLetter, html, cc, mode);
  };

  // Styles
  const containerCls = isRetro
    ? 'bg-[#eaeef3] text-black'
    : isLight
      ? 'bg-slate-50 text-zinc-900'
      : 'bg-[#0d121f]/95 text-zinc-100';

  const headerCls = isRetro
    ? 'bg-[#000080] text-white'
    : isLight
      ? 'bg-[#1a3a6b] text-white'
      : 'bg-[#11131e] text-white';

  const tableCls = isRetro
    ? 'bg-white border border-zinc-400'
    : isLight
      ? 'bg-white border border-zinc-200'
      : 'bg-[#0f1218] border border-zinc-800';

  const thCls = isRetro
    ? 'bg-[#dfdfdf] text-black border-b border-zinc-400 text-[10px] font-black uppercase px-3 py-2 text-left'
    : isLight
      ? 'bg-zinc-50 text-zinc-500 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider px-3 py-2 text-left'
      : 'bg-zinc-900 text-zinc-500 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider px-3 py-2 text-left';

  const tdCls = isRetro
    ? 'px-3 py-2 text-xs border-b border-zinc-200'
    : isLight
      ? 'px-3 py-2 text-xs border-b border-zinc-100'
      : 'px-3 py-2 text-xs border-b border-zinc-800/50';

  const filterBtn = (label: string, value: QuoteStatus | 'Todas') => {
    const isActive = activeFilter === value;
    if (isRetro) {
      return (
        <button
          key={value}
          type="button"
          onClick={() => setActiveFilter(value)}
          className={`px-3 py-1 text-[10px] font-black uppercase border-2 cursor-pointer ${
            isActive
              ? 'bg-[#000080] text-white border-[#000080]'
              : 'bg-[#dfdfdf] text-black border-t-white border-l-white border-b-zinc-500 border-r-zinc-500'
          }`}
        >
          {label}
        </button>
      );
    }
    if (isLight) {
      return (
        <button
          key={value}
          type="button"
          onClick={() => setActiveFilter(value)}
          className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
            isActive ? 'bg-[#1a3a6b] text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {label}
        </button>
      );
    }
    return (
      <button
        key={value}
        type="button"
        onClick={() => setActiveFilter(value)}
        className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        }`}
      >
        {label}
      </button>
    );
  };

  const statusBadge = (status: QuoteStatus, isLetter?: boolean) => {
    const displayStatus = isLetter
      ? status === 'Convertida' ? 'Aceptada'
        : status === 'Cancelada' ? 'Rechazada'
        : status
      : status;
    const effKey = displayStatus === 'Aceptada' ? 'Convertida'
      : displayStatus === 'Rechazada' ? 'Cancelada'
      : status;
    const c = isLight ? STATUS_COLORS[effKey] : STATUS_COLORS_DARK[effKey];
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${c.bg} ${c.text} ${c.border}`}>
        {displayStatus}
      </span>
    );
  };

  const btnPrimary = isRetro
    ? 'bg-[#000080] text-white px-3 py-1 text-[10px] font-black border-2 border-t-white border-l-white border-r-zinc-600 border-b-zinc-600 cursor-pointer'
    : isLight
      ? 'bg-[#1a3a6b] hover:bg-[#1e4a8a] text-white px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors'
      : 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors';

  const btnSmall = (color: 'amber' | 'emerald' | 'sky' | 'zinc' | 'rose') => {
    const colorMap = {
      amber: isLight ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20',
      emerald: isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
      sky: isLight ? 'bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20',
      zinc: isLight ? 'bg-zinc-100 text-zinc-600 border border-zinc-300 hover:bg-zinc-200' : 'bg-zinc-700/30 text-zinc-400 border border-zinc-600 hover:bg-zinc-700',
      rose: isLight ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20',
    };
    const retro = 'bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-r-zinc-500 border-b-zinc-500';
    return (isRetro ? retro : colorMap[color]) + ' px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors';
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${containerCls}`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-3 shrink-0 modal-dark-header ${headerCls}`}>
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-white retro-white-text" />
          <div>
            <div className="font-black text-sm tracking-wide text-white retro-white-text">COTIZACIONES</div>
            <div className="text-[10px] opacity-70 text-white retro-white-text">{quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} registrada{quotes.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de tipo de cotizador */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
            isRetro 
              ? 'bg-[#dfdfdf] border-zinc-400' 
              : 'bg-black/25 border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => {
                setDefaultEditorFormat('letter');
                localStorage.setItem('fm-default-quote-format', 'letter');
              }}
              className={`px-2 py-1 text-[10px] font-black uppercase transition-all rounded select-none cursor-pointer ${
                defaultEditorFormat === 'letter'
                  ? isRetro ? 'bg-[#000080] !text-white font-black retro-white-text' : 'bg-blue-600 shadow-sm !text-white font-black'
                  : isRetro ? '!text-black hover:bg-zinc-300 font-bold' : '!text-white/60 hover:!text-white hover:bg-white/5 font-bold'
              }`}
            >
              📄 Formato A4
            </button>
            <button
              type="button"
              onClick={() => {
                setDefaultEditorFormat('ticket');
                localStorage.setItem('fm-default-quote-format', 'ticket');
              }}
              className={`px-2 py-1 text-[10px] font-black uppercase transition-all rounded select-none cursor-pointer ${
                defaultEditorFormat === 'ticket'
                  ? isRetro ? 'bg-[#000080] !text-white font-black retro-white-text' : 'bg-blue-600 shadow-sm !text-white font-black'
                  : isRetro ? '!text-black hover:bg-zinc-300 font-bold' : '!text-white/60 hover:!text-white hover:bg-white/5 font-bold'
              }`}
            >
              🖨️ Formato Ticket
            </button>
          </div>

          <button type="button" onClick={() => setShowNewModal(true)} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white retro-white-text px-3 py-1.5 rounded font-bold text-xs cursor-pointer transition-colors select-none active:scale-95">
            <Plus className="w-4 h-4 text-white retro-white-text" /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${isRetro ? 'bg-[#dfdfdf] border-b border-zinc-400' : isLight ? 'bg-white border-b border-zinc-200' : 'bg-zinc-900/60 border-b border-zinc-800'}`}>
        <div className="flex gap-1.5 flex-wrap">
          {filterBtn('Todas', 'Todas')}
          {filterBtn('Pendientes', 'Pendiente')}
          {filterBtn('Aceptadas / Convertidas', 'Convertida')}
          {filterBtn('Vencidas', 'Vencida')}
          {filterBtn('Rechazadas / Canceladas', 'Cancelada')}
        </div>
        <div className="capsule-search-container ml-auto max-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
          <input
            ref={searchInputRef}
            autoFocus
            className="premium-search-input"
            placeholder="Buscar cliente, tel, ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-48 gap-3 ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <FileText className="w-12 h-12 opacity-30" />
            <div className="text-sm font-bold">No hay cotizaciones{activeFilter !== 'Todas' ? ` con estado "${activeFilter}"` : ''}</div>
            <button type="button" className={btnPrimary} onClick={() => setShowNewModal(true)}>
              <span className="flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nueva Cotización</span>
            </button>
          </div>
        ) : (
          <div className={`rounded overflow-hidden ${tableCls}`}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Equipos</th>
                  <th className={thCls}>Total Est.</th>
                  <th className={thCls}>Válida hasta</th>
                  <th className={thCls}>Estado</th>
                  <th className={thCls}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(quote => {
                  const subtotalDevices = quote.devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
                  const subtotalAdditional = (quote.additionalConcepts || []).reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
                  const total = subtotalDevices + subtotalAdditional;
                  const effStatus = getEffectiveStatus(quote);
                  const isPending = effStatus === 'Pendiente';
                  const isConverted = effStatus === 'Convertida';

                  const rawValidUntil = quote.validUntil || (quote.createdAt ? quote.createdAt.substring(0, 10) : '');
                  let validUntilStr = '-';
                  if (rawValidUntil) {
                    const vd = new Date(rawValidUntil + 'T00:00:00');
                    validUntilStr = vd.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  }

                  return (
                    <tr 
                      key={quote.id} 
                      className={`${isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/30'} cursor-pointer`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('td')?.cellIndex === 6) return;
                        setEditingQuote(quote);
                        setShowNewModal(true);
                      }}
                    >
                      <td className={`${tdCls} font-mono font-black text-xs`}>{quote.id}</td>
                      <td className={`${tdCls} max-w-[160px] break-all whitespace-normal`}>
                        <div className="font-bold">{quote.customerName}</div>
                        <div className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {quote.customerCountryCode && `${quote.customerCountryCode} `}{renderClickablePhone(quote.customerPhone, quote.customerCountryCode, quote)}
                        </div>
                      </td>
                      <td className={`${tdCls} max-w-[220px] break-all whitespace-normal`}>
                        {quote.editorFormat === 'letter' ? (
                          <div>
                            <div className="font-bold text-xs uppercase text-zinc-500">Bitácora / Formato Carta</div>
                            <div className="text-[10px] truncate max-w-[200px]" title={quote.devices.map(d => d.serviceType).join(', ')}>
                              {quote.devices.map(d => d.serviceType).join(', ')}
                            </div>
                          </div>
                        ) : quote.devices.length === 1 ? (
                          <div>
                            <div className="font-bold">{quote.devices[0].deviceBrand} {quote.devices[0].deviceModel}</div>
                            <div className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{quote.devices[0].serviceType}</div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold">{quote.devices.length} equipos</span>
                            <div className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {quote.devices.map(d => d.deviceBrand + ' ' + d.deviceModel).join(', ')}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className={`${tdCls} font-black`}>
                        {config.currencySymbol}{total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`${tdCls} ${effStatus === 'Vencida' ? (isLight ? 'text-rose-600' : 'text-rose-400') : ''}`}>
                        {validUntilStr}
                      </td>
                      <td className={tdCls}>
                        {statusBadge(effStatus, quote.editorFormat === 'letter')}
                        {isConverted && quote.convertedToOrderId && (
                          <div className={`text-[10px] mt-0.5 font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            → {quote.convertedToBatchId || quote.convertedToOrderId}
                          </div>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            type="button"
                            className={btnSmall('sky')}
                            onClick={() => handlePrint(quote)}
                            title="Reimprimir cotización"
                          >
                            <span className="flex items-center gap-0.5"><Printer className="w-3 h-3" /> Imprimir</span>
                          </button>
                          {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                          <button
                            type="button"
                            style={isWaIntegratedOffline ? { backgroundColor: '#71717a', color: '#d4d4d8' } : { backgroundColor: '#25D366', color: '#fff' }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-0.5 ${isWaIntegratedOffline ? 'opacity-40 grayscale' : 'hover:opacity-90'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isWaIntegratedOffline) {
                                window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                              } else {
                                handleSendWhatsapp(quote, quote.editorFormat === 'letter' ? 'letter' : 'default');
                              }
                            }}
                            title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : (quote.editorFormat === 'letter' ? 'Enviar cotización como PDF por WhatsApp' : 'Enviar cotización como imagen por WhatsApp')}
                          >
                            <MessageSquare className="w-3 h-3" /> {quote.editorFormat === 'letter' ? 'WA PDF' : 'WA Img'}
                          </button>
                          )}
                          <button
                            type="button"
                            className={btnSmall('amber')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClone(quote);
                            }}
                            title="Clonar cotización"
                          >
                            <span className="flex items-center gap-0.5"><Copy className="w-3 h-3" /> Clonar</span>
                          </button>
                          {isPending && (
                            <>
                              {quote.editorFormat !== 'letter' ? (
                                <button
                                  type="button"
                                  className={btnSmall('emerald')}
                                  onClick={() => handleConvert(quote)}
                                  title="Convertir a orden de reparación"
                                >
                                  <span className="flex items-center gap-0.5"><ArrowRight className="w-3 h-3" /> Convertir</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={btnSmall('emerald')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateQuote({ ...quote, status: 'Convertida' });
                                    }}
                                    title="Marcar como aceptada por el cliente"
                                  >
                                    <span className="flex items-center gap-0.5"><Check className="w-3 h-3" /> Aceptar</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={btnSmall('rose')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateQuote({ ...quote, status: 'Cancelada' });
                                    }}
                                    title="Marcar como rechazada por el cliente"
                                  >
                                    <span className="flex items-center gap-0.5"><X className="w-3 h-3" /> Rechazar</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className={btnSmall('rose')}
                                onClick={() => handleDelete(quote)}
                                title="Eliminar cotización"
                              >
                                <span className="flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Eliminar</span>
                              </button>
                            </>
                          )}
                          {quote.editorFormat === 'letter' && !isPending && (
                            <button
                              type="button"
                              className={btnSmall('zinc')}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateQuote({ ...quote, status: 'Pendiente' });
                              }}
                              title="Revertir a estado pendiente"
                            >
                              <span className="flex items-center gap-0.5"><RefreshCw className="w-3 h-3" /> Reactivar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva cotización */}
      {showNewModal && createPortal(
        <NewQuoteModal
          isRetro={isRetro}
          isLight={isLight}
          config={config}
          quoteCatalog={quoteCatalog}
          insumosCatalog={insumosCatalog}
          clients={clients}
          nextId={nextId}
          currentUser={currentUser}
          onClose={() => { setShowNewModal(false); setEditingQuote(null); setIsCloneMode(false); }}
          onConfirm={handleCreate}
          onAddQuoteCatalogItem={onAddQuoteCatalogItem}
          onAddInsumoCatalogItem={onAddInsumoCatalogItem}
          editingQuote={editingQuote}
          isClone={isCloneMode}
          defaultEditorFormat={defaultEditorFormat}
          refacciones={refacciones}
        />,
        document.body
      )}

      {/* Preview de impresión de cotización */}
      {previewQuote && createPortal(
        <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`flex flex-col rounded-xl shadow-2xl overflow-hidden max-h-[90vh] w-full ${
            previewFormat === 'letter' ? 'max-w-4xl' : 'max-w-xl'
          } ${
            isLight
              ? 'bg-white border border-zinc-200'
              : 'bg-[#1a1c22] border border-zinc-700/60'
          }`}>
            {/* Header */}
            <div className={`modal-dark-header flex items-center gap-2.5 px-4 py-3 border-b shrink-0 ${
              isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-[#11131e] border-zinc-700'
            }`}>
              <Printer className="w-4 h-4 shrink-0 !text-blue-300" />
              <span className="text-xs font-black uppercase tracking-wider !text-white">
                Vista previa — {previewQuote.id}
              </span>
              <button
                onClick={() => { setPreviewQuote(null); setPrintStatus('idle'); }}
                className="ml-auto cursor-pointer !text-zinc-300 hover:!text-white border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Format Selection */}
            <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 text-xs shrink-0 ${
              isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-[#151822] border-zinc-800 text-zinc-300'
            }`}>
              <span className="font-black uppercase tracking-wider">Formato de Impresión:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewFormat('default')}
                  className={`px-3 py-1 font-bold rounded cursor-pointer transition-colors border-none ${
                    previewFormat === 'default'
                      ? 'bg-sky-600 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Ticket / Media Carta
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('letter')}
                  className={`px-3 py-1 font-bold rounded cursor-pointer transition-colors border-none ${
                    previewFormat === 'letter'
                      ? 'bg-sky-600 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Tamaño Carta Completa (Diseño Premium)
                </button>
              </div>
            </div>

            {/* Copies Selection Row */}
            <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 text-xs shrink-0 ${
              isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-[#151822] border-zinc-800 text-zinc-300'
            }`}>
              <span className="font-black uppercase tracking-wider">Copias a Imprimir:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                  className={`w-6 h-6 flex items-center justify-center font-black border rounded cursor-pointer ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                  }`}
                >
                  -
                </button>
                <span className="w-8 text-center font-black text-sm">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies(c => c + 1)}
                  className={`w-6 h-6 flex items-center justify-center font-black border rounded cursor-pointer ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Zoom Selection Row */}
            <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 text-xs shrink-0 ${
              isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-[#151822] border-zinc-800 text-zinc-300'
            }`}>
              <span className="font-black uppercase tracking-wider">Zoom de Vista Previa:</span>
              <div className="flex gap-2">
                {[0.5, 0.65, 0.8, 1.0].map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`px-2 py-0.5 font-bold rounded cursor-pointer transition-colors border-none text-[10px] ${
                      zoom === z
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {z * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Iframe preview */}
            <div className="overflow-y-auto flex-1 flex justify-center bg-zinc-200 p-4">
              <div
                style={{
                  width: `${((previewFormat === 'letter' || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado') ? 816 : 310) * zoom}px`,
                  height: `${((previewFormat === 'letter' || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado') ? 1120 : 600) * zoom}px`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <iframe
                  srcDoc={previewFormat === 'letter' ? buildLetterQuoteTicketHtml(previewQuote, config) : buildQuoteTicketHtml(previewQuote, config)}
                  scrolling="auto"
                  style={{
                    width: (previewFormat === 'letter' || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado') ? '816px' : config.ticketPaperWidth === '58mm' ? '230px' : '310px',
                    height: (previewFormat === 'letter' || config.ticketPaperWidth === 'media-carta' || config.ticketPaperWidth === 'media-carta-duplicado') ? '1120px' : '600px',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    border: 'none',
                    background: 'white',
                    display: 'block',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className={`flex gap-2 px-4 py-3 border-t shrink-0 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#13151c] border-zinc-700'
            }`}>
              <button
                type="button"
                onClick={() => { setPreviewQuote(null); setPrintStatus('idle'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  isLight ? 'bg-zinc-100 border border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Cancelar
              </button>
              {config.whatsappMode && config.whatsappMode !== 'disabled' && (
              <button
                type="button"
                onClick={() => {
                  if (isWaIntegratedOffline) {
                    window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                  } else if (previewQuote) {
                    handleSendWhatsapp(previewQuote, previewFormat);
                  }
                }}
                style={isWaIntegratedOffline ? { backgroundColor: '#71717a' } : { backgroundColor: '#25D366' }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 text-white ${
                  isWaIntegratedOffline ? 'opacity-40 grayscale' : 'hover:opacity-90'
                }`}
                title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : (previewFormat === 'letter' ? 'Enviar PDF por WhatsApp' : 'Enviar imagen por WhatsApp')}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {previewFormat === 'letter' ? 'Enviar PDF por WA' : 'Enviar Imagen por WA'}
              </button>
              )}
              <button
                type="button"
                onClick={handleConfirmPrint}
                disabled={printStatus === 'printing' || printStatus === 'success'}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  printStatus === 'success'
                    ? 'bg-emerald-600 text-white'
                    : printStatus === 'printing'
                      ? 'bg-sky-700 text-white opacity-70'
                      : isLight
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : 'bg-sky-600 text-white hover:bg-sky-500'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                {printStatus === 'printing' ? 'Enviando…' : printStatus === 'success' ? '¡Impreso!' : 'Imprimir'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
