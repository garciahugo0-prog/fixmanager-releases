/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  FilePlus, User, Smartphone, Sparkles, DollarSign, 
  Calendar, RefreshCw, X, ChevronLeft, ChevronRight, 
  CheckCircle, ShieldAlert, Phone, Mail, Key, Palette, 
  Laptop, Tablet, Watch, AlertCircle, Printer, Tag, Camera,
  Lock, Unlock, Save, CreditCard, Flame,
  Search, Plus, FileText, Database, Check, HelpCircle, Info, Hash,
  Coins, Edit, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RepairOrder, ServicePrice, WorkshopConfig, Client, AppUser, QuoteDevice, RefaccionItem } from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { buildConsolidatedTicketHtml, buildTicketHtml } from '../utils/ticketBuilder';
import { DEFAULT_OFFLINE_MODELS, INITIAL_SERVICES } from '../data';
import { handleCaretPreservingChange } from '../utils/domHelpers';
import { generateNextOrderId } from '../utils/folioUtils';

const ACCESSORY_OPTIONS = [
  'CHIP / SIM',
  'MEMORIA SD',
  'FUNDA / PROTECTOR',
  'CARGADOR',
  'BANDEJA SIM',
  'LÁPIZ / STYLUS',
  'CABLE USB',
  'CAJA',
  'AUDÍFONOS'
];

const checkRefaccionCompatibility = (
  r: RefaccionItem,
  deviceBrand: string,
  deviceModel: string
): boolean => {
  const brand = (deviceBrand || '').toLowerCase().trim();
  const model = (deviceModel || '').toLowerCase().trim();
  if (!brand && !model) return false;

  const rBrand = (r.deviceBrand || '').toLowerCase().trim();
  const rModel = (r.deviceModel || '').toLowerCase().trim();

  const genericKeywords = new Set(['', 'todos', 'generico', 'genérico', 'universal', 'global', 'multimarca', 'cualquiera']);
  
  const rBrandIsGeneric = genericKeywords.has(rBrand);
  const rModelIsGeneric = genericKeywords.has(rModel);

  const brandOk = rBrandIsGeneric || rBrand === brand || brand.includes(rBrand) || rBrand.includes(brand);
  const modelOk = rModelIsGeneric || rModel === model || model.includes(rModel) || rModel.includes(model);

  return brandOk && modelOk;
};

const autoDetectDeviceType = (brand: string, model: string, modelNumber: string = ''): string | null => {
  const b = (brand || '').toUpperCase().trim();
  const m = (model || '').toUpperCase().trim();
  const mn = (modelNumber || '').toUpperCase().trim();
  const combined = `${b} ${m} ${mn}`;

  // 1. Control de Videojuegos
  if (
    combined.includes('CONTROL') || 
    combined.includes('CONTROLLER') || 
    combined.includes('JOYCON') || 
    combined.includes('JOY-CON') || 
    combined.includes('DUALSENSE') || 
    combined.includes('DUALSHOCK') || 
    combined.includes('GAMEPAD') || 
    combined.includes('MANDO')
  ) {
    if (
      combined.includes('XBOX') || 
      combined.includes('PLAYSTATION') || 
      combined.includes('NINTENDO') || 
      combined.includes('WII') || 
      combined.includes('SWITCH') || 
      combined.includes('PS3') || 
      combined.includes('PS4') || 
      combined.includes('PS5') || 
      combined.includes('CONSOLA')
    ) {
      return 'CONTROL DE VIDEOJUEGOS';
    }
  }

  // 2. Consola de Videojuegos
  if (
    combined.includes('XBOX') || 
    combined.includes('PLAYSTATION') || 
    combined.includes('PS3') || 
    combined.includes('PS4') || 
    combined.includes('PS5') || 
    combined.includes('NINTENDO') || 
    combined.includes('SWITCH') || 
    combined.includes('WII') || 
    combined.includes('3DS') || 
    combined.includes('NES') || 
    combined.includes('SEGA') || 
    combined.includes('DREAMCAST') || 
    combined.includes('GAME BOY') || 
    combined.includes('ATARI') || 
    combined.includes('CONSOLA') || 
    combined.includes('CONSOLE')
  ) {
    return 'CONSOLA';
  }

  // 3. Tablet
  if (
    combined.includes('IPAD') || 
    combined.includes('TABLET') || 
    combined.includes('TAB ') || 
    combined.includes('TAB-') || 
    combined.includes('M10') || 
    combined.includes('M8') || 
    combined.includes('SURFACE GO') || 
    combined.includes('MEDIAPAD')
  ) {
    return 'TABLET';
  }

  // 4. Laptop
  if (
    combined.includes('LAPTOP') || 
    combined.includes('MACBOOK') || 
    combined.includes('CHROMEBOOK') || 
    combined.includes('THINKPAD') || 
    combined.includes('NOTEBOOK') || 
    combined.includes('LAP ')
  ) {
    return 'LAPTOP';
  }

  // 5. Watch / Smartwatch
  if (
    combined.includes('WATCH') || 
    combined.includes('BAND') || 
    combined.includes('FITBIT') || 
    combined.includes('GARMIN') || 
    combined.includes('SMARTWATCH') || 
    combined.includes('RELOJ')
  ) {
    return 'RELOJ/SMARTWATCH';
  }

  // 6. Celular
  if (
    combined.includes('IPHONE') || 
    combined.includes('CELULAR') || 
    combined.includes('TELEFONO') || 
    combined.includes('TELÉFONO') || 
    combined.includes('MOBILE') || 
    combined.includes('PHONE') || 
    combined.includes('MOTO') || 
    combined.includes('GALAXY') || 
    combined.includes('POCO') || 
    combined.includes('REDMI') || 
    combined.includes('XIAOMI') || 
    combined.includes('HUAWEI') || 
    combined.includes('ONEPLUS') || 
    combined.includes('PIXEL') || 
    combined.includes('OPPO') || 
    combined.includes('VIVO') || 
    combined.includes('REALME') || 
    combined.includes('INFINIX') || 
    combined.includes('TECNO')
  ) {
    return 'CELULAR';
  }

  return null;
};

interface NuevaViewProps {
  services: ServicePrice[];
  onCreateOrder: (order: RepairOrder, options?: { printTicket: boolean; printLabel: boolean; suppressTelegram?: boolean; batchPosition?: number; batchTotal?: number; sendWhatsapp?: boolean }) => void;
  onBatchCreated?: (orders: RepairOrder[]) => void;
  config: WorkshopConfig;
  orders?: RepairOrder[];
  clients?: Client[];
  users?: AppUser[];
  setActiveTab?: (tab: any) => void;
  onNavigateAway?: (tab: any) => void;
  onProgressChange?: (inProgress: boolean) => void;
  onAddService?: (service: ServicePrice) => void;
  currentUser?: AppUser | null;
  prefillFromQuote?: {
    customerName: string;
    customerPhone: string;
    customerCountryCode: string;
    devices: QuoteDevice[];
  };
  onPrefillConsumed?: () => void;
  refacciones?: RefaccionItem[];
  onSetRefacciones?: (items: RefaccionItem[]) => void;
  prefillFromRefaccion?: RefaccionItem | null;
  onPrefillRefaccionConsumed?: () => void;
}

// ── Componente modal para equipo adicional ──────────────────────────────────
function ExtraEquipoModal({ isRetro, isLight, allModels, services, extraDraft, setExtraDraft, onClose, onConfirm, currencySymbol, onAddService, onAddDevice, customDeviceTypes, onSaveCustomType, onDeleteCustomType, deletedDefaultTypes = [], onDeleteDeviceModel, pendingDeleteType, onSetPendingDeleteType, orders = [], refacciones = [], config, users = [], currentUser }: {
  isRetro: boolean; isLight: boolean;
  allModels: { brand: string; model: string; type: string }[];
  services: ServicePrice[];
  extraDraft: any; setExtraDraft: (fn: (d: any) => any) => void;
  onClose: () => void; onConfirm: (overrideDraft?: any) => void;
  currencySymbol: string;
  onAddService?: (svc: ServicePrice) => void;
  onAddDevice?: (device: { code: string; brand: string; model: string; type: string }) => void;
  customDeviceTypes?: string[];
  onSaveCustomType?: (val: string) => void;
  onDeleteCustomType?: (val: string) => void;
  deletedDefaultTypes?: string[];
  onDeleteDeviceModel?: (brand: string, model: string) => void;
  pendingDeleteType?: string | null;
  onSetPendingDeleteType?: (val: string | null) => void;
  orders?: RepairOrder[];
  refacciones?: RefaccionItem[];
  config: WorkshopConfig;
  users?: AppUser[];
  currentUser?: AppUser | null;
}) {
  // sub-estado del paso 0
  type Sub0 = 'search' | 'pin' | 'newDevice';
  const [step, setStep] = useState<0 | 1>(0);
  const [sub0, setSub0] = useState<Sub0>('search');

  const [partSearch, setPartSearch] = React.useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const isExtraTypeManuallyChanged = useRef(false);

  useEffect(() => {
    if (sub0 === 'search') {
      isExtraTypeManuallyChanged.current = false;
    }
  }, [sub0]);

  useEffect(() => {
    if (!isExtraTypeManuallyChanged.current && (extraDraft.deviceBrand || extraDraft.deviceModel || extraDraft.deviceModelNumber)) {
      const detected = autoDetectDeviceType(extraDraft.deviceBrand, extraDraft.deviceModel, extraDraft.deviceModelNumber);
      if (detected) {
        let mapped = detected;
        if (detected === 'CELULAR') mapped = 'Phone';
        else if (detected === 'TABLET') mapped = 'Tablet';
        else if (detected === 'RELOJ/SMARTWATCH') mapped = 'Watch';
        else if (detected === 'LAPTOP') mapped = 'Laptop';
        else if (detected === 'CONSOLA') mapped = 'Consola';
        
        setExtraDraft((d: any) => ({ ...d, deviceType: mapped }));
      }
    }
  }, [extraDraft.deviceBrand, extraDraft.deviceModel, extraDraft.deviceModelNumber]);


  const [customPartPrices, setCustomPartPrices] = useState<Record<string, number>>({});
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overridePart, setOverridePart] = useState<any>(null);

  const handlePriceOverrideSuccess = (newPrice: number) => {
    if (!overridePart) return;
    const refId = overridePart.id;

    setCustomPartPrices(prev => ({ ...prev, [refId]: newPrice }));

    setExtraDraft((d: any) => {
      const currentParts = d.parts || [];
      const isSelected = currentParts.some((p: any) => p.refaccionId === refId);
      if (!isSelected) return d;

      const nextParts = currentParts.map((p: any) => p.refaccionId === refId ? { ...p, price: newPrice } : p);
      const totalCost = nextParts.reduce((s: number, p: any) => s + (p.price || 0), 0);

      let svcDesc = '';
      let svcType = '';
      if (nextParts.length > 0) {
        const lines = nextParts.map((p: any) => {
          const catalogRef = refacciones.find(r => r.id === p.refaccionId);
          const cleanCat = catalogRef ? catalogRef.category.toLowerCase().replace(/s$/, '') : '';
          const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find((s: any) => {
            const sName = s.name.toLowerCase();
            return sName.includes(cleanCat) || sName.includes(p.name.toLowerCase());
          });
          const baseName = matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${p.name.toUpperCase()}`;
          return { baseName, price: p.price };
        });
        svcDesc = Array.from(new Set(lines.map(l => l.baseName))).join(' Y ');
        svcType = svcDesc;
      }

      return {
        ...d,
        parts: nextParts,
        cost: totalCost || 0,
        faultDescription: svcDesc,
        serviceType: svcType
      };
    });
  };
  const [isEquipmentCollapsed, setIsEquipmentCollapsed] = useState(true);
  const [deviceQuery, setDeviceQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [focusedDevice, setFocusedDevice] = useState(-1);
  const [focusedService, setFocusedService] = useState(-1);
  const [pinFromNewDevice, setPinFromNewDevice] = useState(false);
  const [isAddingNewSvc, setIsAddingNewSvc] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcPrice, setNewSvcPrice] = useState(0);
  const cargoRef = useRef<HTMLInputElement>(null);
  const antiRef = useRef<HTMLInputElement>(null);
  const [pinType, setPinType] = useState<'none'|'pin'|'pattern'>('none');
  const [patternNodes, setPatternNodes] = useState<number[]>([]);
  const [showAccPopover, setShowAccPopover] = useState(false);
  const accPopoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accPopoverRef.current && !accPopoverRef.current.contains(e.target as Node)) {
        setShowAccPopover(false);
      }
    };
    if (showAccPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccPopover]);

  const [extraTypeQuery, setExtraTypeQuery] = useState('');
  const [extraTypeOpen, setExtraTypeOpen] = useState(false);
  const [extraTypeHighlight, setExtraTypeHighlight] = useState(0);
  const extraTypeListRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = extraTypeListRef.current?.children[extraTypeHighlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [extraTypeHighlight]);
  const [localPin, setLocalPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const miniCompatible = React.useMemo(() => {
    const brand = (extraDraft.deviceBrand || '').trim();
    const model = (extraDraft.deviceModel || '').trim();
    if (!brand && !model) return [];
    return refacciones.filter(r => checkRefaccionCompatibility(r, brand, model) && r.stock >= 0);
  }, [refacciones, extraDraft.deviceBrand, extraDraft.deviceModel]);
  const filteredMiniCompatible = React.useMemo(() => {
    if (!partSearch.trim()) return miniCompatible;
    const query = partSearch.toLowerCase();
    return miniCompatible.filter((ref: any) => 
      ref.name.toLowerCase().includes(query) || 
      (ref.code && ref.code.toLowerCase().includes(query))
    );
  }, [miniCompatible, partSearch]);
  const hasCompatible = miniCompatible.length > 0;

  // Autocomplete states and hooks inside ExtraEquipoModal
  const [showBrandSugg, setShowBrandSugg] = useState(false);
  const [showModelSugg, setShowModelSugg] = useState(false);
  const [showModelNumSugg, setShowModelNumSugg] = useState(false);

  const [brandSuggIdx, setBrandSuggIdx] = useState(-1);
  const [modelSuggIdx, setModelSuggIdx] = useState(-1);
  const [modelNumSuggIdx, setModelNumSuggIdx] = useState(-1);

  const extraModelNumListRef = useRef<HTMLDivElement>(null);
  const extraBrandListRef = useRef<HTMLDivElement>(null);
  const extraModelListRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = extraModelNumListRef.current?.children[modelNumSuggIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [modelNumSuggIdx]);

  React.useEffect(() => {
    const el = extraBrandListRef.current?.children[brandSuggIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [brandSuggIdx]);

  React.useEffect(() => {
    const el = extraModelListRef.current?.children[modelSuggIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [modelSuggIdx]);

  const historyModelNumbers = React.useMemo(() => {
    const fromOrders = (orders || []).map(o => o.deviceModelNumber).filter(Boolean);
    const fromOffline = DEFAULT_OFFLINE_MODELS.map(m => m.modelNumber).filter(Boolean);
    return Array.from(new Set([...fromOrders, ...fromOffline]));
  }, [orders]);

  const historyBrands = React.useMemo(() => {
    const fromModels = (allModels || []).map(m => m.brand);
    return Array.from(new Set(fromModels.filter(Boolean)));
  }, [allModels]);

  const modelNumVal = extraDraft.deviceModelNumber || '';
  const brandVal = extraDraft.deviceBrand || '';
  const modelVal = extraDraft.deviceModel || '';

  const modelNumberSuggestions = React.useMemo(() => {
    const q = modelNumVal.trim().toUpperCase();
    if (!q) return [];
    return historyModelNumbers.filter(num => num.toUpperCase().includes(q));
  }, [modelNumVal, historyModelNumbers]);

  const brandSuggestions = React.useMemo(() => {
    const q = brandVal.trim().toUpperCase();
    if (!q) return [];
    return historyBrands.filter(b => b.toUpperCase().includes(q));
  }, [brandVal, historyBrands]);

  const modelSuggestions = React.useMemo(() => {
    const q = modelVal.trim().toUpperCase();
    if (!q) return [];
    const currentBrand = brandVal.trim().toUpperCase();
    const filtered = (allModels || []).filter(m => {
      const matchesQuery = m.model.toUpperCase().includes(q);
      if (!matchesQuery) return false;
      if (currentBrand) {
        return m.brand.toUpperCase() === currentBrand;
      }
      return true;
    });
    return Array.from(new Set(filtered.map(m => m.model.toUpperCase())));
  }, [modelVal, brandVal, allModels]);

  React.useEffect(() => { setModelNumSuggIdx(-1); }, [modelNumVal]);
  React.useEffect(() => { setBrandSuggIdx(-1); }, [brandVal]);
  React.useEffect(() => { setModelSuggIdx(-1); }, [modelVal]);

  const handleSelectModelNum = (num: string) => {
    setExtraDraft((d: any) => {
      const matchingOrder = orders.find(o => o.deviceModelNumber?.toUpperCase() === num.toUpperCase());
      let brand = matchingOrder?.deviceBrand?.toUpperCase() || d.deviceBrand || '';
      let model = matchingOrder?.deviceModel?.toUpperCase() || d.deviceModel || '';
      if (!brand || !model) {
        const matchingOffline = DEFAULT_OFFLINE_MODELS.find(m => m.modelNumber?.toUpperCase() === num.toUpperCase());
        if (matchingOffline) {
          brand = matchingOffline.brand.toUpperCase();
          model = matchingOffline.model.toUpperCase();
        }
      }
      return {
        ...d,
        deviceModelNumber: num,
        deviceBrand: brand,
        deviceModel: model,
      };
    });
    setShowModelNumSugg(false);
    setTimeout(() => {
      document.getElementById('nd-brand')?.focus();
      (document.getElementById('nd-brand') as HTMLInputElement)?.select();
    }, 50);
  };

  const handleSelectBrand = (brandName: string) => {
    setExtraDraft((d: any) => ({ ...d, deviceBrand: brandName.toUpperCase() }));
    setShowBrandSugg(false);
    setTimeout(() => {
      document.getElementById('nd-model')?.focus();
      (document.getElementById('nd-model') as HTMLInputElement)?.select();
    }, 50);
  };

  const handleSelectModel = (modelName: string) => {
    setExtraDraft((d: any) => {
      const brandValStr = d.deviceBrand || '';
      let nextBrand = brandValStr;
      if (!brandValStr.trim()) {
        const found = allModels.find(m => m.model.toUpperCase() === modelName);
        if (found) nextBrand = found.brand.toUpperCase();
      }
      return {
        ...d,
        deviceModel: modelName.toUpperCase(),
        deviceBrand: nextBrand
      };
    });
    setShowModelSugg(false);
    setTimeout(() => {
      document.getElementById('nd-type')?.focus();
    }, 50);
  };

  // ── helpers de estilo — réplica fiel del wizard ──────────────────────────
  const sdCls = () => {
    if (isRetro) return 'bg-[#eaeef3] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] text-black shadow-md';
    if (isLight) return 'bg-white border border-zinc-300 text-zinc-900 shadow-lg';
    return 'bg-[#161822]/95 backdrop-blur-md border border-zinc-800 text-zinc-100 shadow-2xl';
  };
  const shCls = () => {
    if (isRetro) return 'text-[9.5px] uppercase font-mono font-bold text-[#000080] border-b border-zinc-300 px-2 py-1';
    if (isLight) return 'text-[9.5px] uppercase font-extrabold text-zinc-500 border-b border-zinc-100 px-2 py-1';
    return 'text-[9.5px] uppercase font-mono font-bold text-amber-500 border-b border-[#2d2f36] px-2 py-1';
  };
  const siCls = (sel: boolean) => {
    if (isRetro) return sel ? 'bg-[#000080] text-white border-[#000080] font-bold' : 'hover:bg-zinc-200 text-black';
    if (isLight) return sel ? 'bg-blue-50 text-blue-950 border-l-4 border-blue-600 font-extrabold' : 'hover:bg-zinc-100/80 text-zinc-800 border-l-4 border-transparent';
    return sel ? 'bg-amber-500/10 text-amber-500 border-l-4 border-amber-500 font-extrabold' : 'hover:bg-zinc-700/50 text-zinc-300 border-l-4 border-transparent';
  };
  const badgeCls = (sel: boolean) => {
    if (isRetro) return sel ? 'bg-white text-[#000080] font-mono' : 'bg-zinc-300 text-zinc-800 font-mono';
    if (isLight) return sel ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700';
    return sel ? 'bg-amber-500 text-zinc-950 font-black' : 'bg-zinc-700 text-zinc-400';
  };
  const staticCls = (sel: boolean) => {
    if (isRetro) return sel ? 'bg-[#000080] border-l-4 border-yellow-400 text-white font-black' : 'bg-zinc-200 border border-[#808080] hover:bg-zinc-300 text-black';
    if (isLight) return sel ? 'bg-blue-50 border-blue-600 border-l-4 text-blue-950 font-extrabold shadow-sm' : 'bg-zinc-100 border border-zinc-200 hover:bg-zinc-200/60 text-zinc-800';
    return sel ? 'bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 text-amber-400 font-bold' : 'bg-[#1c1f2e] border border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-300';
  };

  const deviceSugg = React.useMemo(() => {
    const q = deviceQuery.trim().toLowerCase();
    if (!q) return allModels.slice(0, 8);
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return allModels.slice(0, 8);
    return allModels.filter(m => {
      const combined = `${m.brand} ${m.model} ${(m as any).modelNumber || ''} ${(m as any).code || ''}`.toLowerCase();
      return tokens.every(token => {
        if (/^\d+$/.test(token)) {
          const regex = new RegExp(`(?:^|[^0-9])${token}(?:[^0-9]|$)`);
          return regex.test(combined);
        }
        return combined.includes(token);
      });
    }).slice(0, 8);
  }, [deviceQuery, allModels]);

  const serviceSugg = React.useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services.slice(0, 10);
    return services.filter(s => s.name.toLowerCase().includes(q)).slice(0, 10);
  }, [serviceQuery, services]);

  const selectDevice = (m: { brand: string; model: string; type: string }) => {
    setExtraDraft((d: any) => ({ ...d, deviceBrand: m.brand, deviceModel: m.model, deviceType: m.type as any, devicePin: 'SIN CLAVE' }));
    setDeviceQuery(`${m.brand} ${m.model}`);
    setPinType('none'); setLocalPin(''); setPatternNodes([]);
    setSub0('pin');
    setErrorMsg('');
  };

  const startNewDevice = (query: string) => {
    setExtraDraft((d: any) => ({ ...d, deviceBrand: '', deviceModel: query.trim().toUpperCase(), deviceModelNumber: '', devicePin: 'SIN CLAVE' }));
    setPinType('none'); setLocalPin(''); setPatternNodes([]);
    setSub0('newDevice');
    setErrorMsg('');
  };

  const confirmPin = () => {
    let pin = 'SIN CLAVE';
    if (pinType === 'pin') pin = localPin.trim().toUpperCase() || 'SIN CLAVE';
    else if (pinType === 'pattern' && patternNodes.length > 0) pin = `PATRÓN: ${patternNodes.join('-')}`;
    
    const updatedDraft = { ...extraDraft, devicePin: pin };
    setExtraDraft(updatedDraft);
    
    // Si vino de nuevo equipo, registrarlo en el historial de dispositivos
    if (pinFromNewDevice && onAddDevice && extraDraft.deviceBrand && extraDraft.deviceModel) {
      onAddDevice({ code: `extra-${Date.now()}`, brand: extraDraft.deviceBrand, model: extraDraft.deviceModel, type: extraDraft.deviceType || 'Phone' });
    }
    
    // Si ya hay refacciones seleccionadas, saltar el paso de "Definir Servicio"
    const hasRefParts = (updatedDraft.parts || []).some((p: any) => p.refaccionId);
    if (hasRefParts && updatedDraft.faultDescription) {
      setErrorMsg('');
      // Confirmar directamente con el draft actualizado
      setTimeout(() => onConfirm(), 0);
      return;
    }
    
    setStep(1); setErrorMsg('');
  };

  const selectService = (s: ServicePrice) => {
    setExtraDraft((d: any) => ({ ...d, faultDescription: s.name, serviceType: s.name, cost: s.price || d.cost }));
    setServiceQuery(s.name);
    setIsAddingNewSvc(false);
    setTimeout(() => cargoRef.current?.focus(), 50);
  };

  const triggerNewService = (name: string) => {
    setNewSvcName(name.toUpperCase());
    setNewSvcPrice(0);
    setIsAddingNewSvc(true);
    setErrorMsg('');
  };

  const stepLabels = [
    extraDraft.deviceModel ? `${extraDraft.deviceBrand} ${extraDraft.deviceModel}` : 'Modelo de equipo',
    'Definir el servicio',
  ];

  const goNext = () => {
    if (step === 0) {
      if (sub0 === 'search') {
        if (!extraDraft.deviceBrand || !extraDraft.deviceModel) { setErrorMsg('Selecciona un equipo del historial o escribe uno nuevo.'); return; }
        setSub0('pin');
      } else if (sub0 === 'pin') {
        if (extraDraft.deviceType) {
          const t = extraDraft.deviceType.toUpperCase().trim();
          const standardTypes = ['PHONE', 'CELULAR', 'TABLET', 'WATCH', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA'];
          if (t && !standardTypes.includes(t)) {
            if (onSaveCustomType) onSaveCustomType(t);
          }
        }
        confirmPin();
      } else {
        // newDevice — validar y pasar al sub-estado PIN
        if (!extraDraft.deviceBrand.trim() || !extraDraft.deviceModel.trim()) { setErrorMsg('La marca y el modelo son requeridos.'); return; }
        setPinFromNewDevice(true);
        setSub0('pin');
        setErrorMsg('');
      }
    } else {
      if (!extraDraft.faultDescription.trim()) { setErrorMsg('Define el servicio o falla a realizar.'); return; }
      setErrorMsg(''); onConfirm();
    }
  };

  const goBack = () => {
    if (step === 1) { setStep(0); setSub0('pin'); setErrorMsg(''); }
    else if (sub0 === 'pin') {
      if (pinFromNewDevice) { setSub0('newDevice'); setPinFromNewDevice(false); }
      else { setSub0('search'); setExtraDraft((d: any) => ({ ...d, deviceBrand: '', deviceModel: '', devicePin: '' })); setDeviceQuery(''); }
      setErrorMsg('');
    }
    else if (sub0 === 'newDevice') { setSub0('search'); setExtraDraft((d: any) => ({ ...d, deviceBrand: '', deviceModel: '', devicePin: '' })); setDeviceQuery(''); setErrorMsg(''); }
    else onClose();
  };

  const nodePos = (i: number) => ({ x: (i % 3) * 50 + 25, y: Math.floor(i / 3) * 50 + 25 });

  // Enter en sub-estado PIN con "Sin clave" → avanzar automáticamente
  React.useEffect(() => {
    const inPinStep = step === 0 && (sub0 === 'pin' || sub0 === 'newDevice') && pinType === 'none';
    if (!inPinStep) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Enter' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault(); goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, sub0, pinType]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className={`w-full max-w-md flex flex-col shadow-2xl rounded-sm overflow-hidden max-h-[90vh] ${isRetro ? 'bg-[#cbd6e2]' : 'bg-[#0d0f1a] border border-zinc-800'}`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#111827] via-[#1e293b] to-[#0f172a] text-white px-5 py-3 flex items-center justify-between border-b border-zinc-800 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-b from-red-500 via-blue-500 to-amber-500 rounded-md shadow-md border border-white/20">
              <Smartphone className="w-4 h-4 text-white drop-shadow" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white font-sans">EQUIPO ADICIONAL</h2>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/60 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stepper */}
        <div className={`py-3 px-5 flex items-center gap-4 border-b text-[11px] font-bold shrink-0 ${
          isRetro 
            ? (isLight ? 'bg-[#e1e6ed] border-zinc-200 text-[#556980]' : 'bg-[#121316] border-[#383c48] text-[#8ba3c2]')
            : 'bg-[#151926]/90 border-zinc-900 text-zinc-400'
        }`}>
          {stepLabels.map((label, idx) => {
            const isCurrent = step === idx;
            const isPassed = step > idx;
            return (
              <div key={idx} className={`flex items-center gap-2 transition-all ${isCurrent ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${isCurrent ? (isRetro ? 'bg-[#113a7c] text-white' : 'bg-amber-500 text-black') : isPassed ? 'bg-emerald-600 text-white' : (isRetro ? 'bg-zinc-400 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700')}`}>
                  {isPassed ? '✓' : idx + 1}
                </div>
                <span className={`uppercase font-sans font-black tracking-wide text-[10px] ${isCurrent ? (isRetro ? 'text-[#113a7c]' : 'text-amber-400') : (isRetro ? 'text-[#556980]' : 'text-zinc-400')}`}>{label}</span>
                {idx < stepLabels.length - 1 && <span className="text-zinc-600 text-[10px]">›</span>}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-red-100 border border-red-300 text-red-700 text-xs rounded-sm flex items-center gap-2 font-bold shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}
          </div>
        )}

        {/* Contenido */}
        <div className="overflow-y-auto flex-1">

          {/* ── PASO 0 — BÚSQUEDA ── */}
          {step === 0 && sub0 === 'search' && (
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans text-center">BUSCAR EQUIPO EN HISTORIAL</h3>
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="space-y-1 text-left">
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">MODELO DEL DISPOSITIVO:</label>
                  <div className="premium-search-container w-full select-none flex items-center">
                    <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0" />
                    <div className="relative flex-1 flex items-center">
                      <input type="text" autoFocus placeholder="Galaxy S24, iPhone 15, Moto G84..."
                        value={deviceQuery}
                        onChange={e => handleCaretPreservingChange(e, (val) => { setDeviceQuery(val); setFocusedDevice(-1); }, val => val.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedDevice(p => Math.min(p + 1, deviceSugg.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedDevice(p => Math.max(p - 1, 0)); }
                          else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (focusedDevice >= 0 && deviceSugg[focusedDevice]) selectDevice(deviceSugg[focusedDevice]);
                            else if (deviceSugg.length > 0 && deviceQuery.trim()) selectDevice(deviceSugg[0]);
                            else if (deviceQuery.trim()) startNewDevice(deviceQuery);
                          }
                        }}
                        className="premium-search-input uppercase text-zinc-100"
                      />
                      {deviceQuery && <button type="button" onClick={() => setDeviceQuery('')} className="absolute right-2 text-zinc-400 hover:text-white font-black text-xs">✕</button>}
                    </div>
                  </div>
                </div>

                {deviceQuery.trim() !== '' && deviceSugg.length > 0 && (
                  <div className={`${sdCls()} rounded-sm p-2 text-left max-h-52 overflow-y-auto space-y-1 divide-y divide-zinc-700/30 shadow-lg`}>
                    <div className={`${shCls()} tracking-wider select-none`}>📂 Coincidencias en historial (↕ navegar):</div>
                    {deviceSugg.map((m, idx) => (
                      <div key={idx}
                        className={`rounded-sm flex items-center hover:bg-zinc-50 border ${siCls(idx === focusedDevice)}`}>
                        <button type="button" onClick={() => selectDevice(m)}
                          className="flex-1 text-left px-3 py-2.5 cursor-pointer flex items-center justify-between text-xs font-bold bg-transparent border-0 focus:outline-none"
                        >
                          <span>{m.brand} <span className="opacity-80 font-semibold">{m.model}</span></span>
                          <span className={`text-[9px] uppercase font-mono px-2.5 py-0.5 rounded shrink-0 ${badgeCls(idx === focusedDevice)}`}>{idx === focusedDevice ? 'Seleccionar ➙' : 'Autocompletar ➙'}</span>
                        </button>
                        <button type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteDeviceModel?.(m.brand, m.model);
                          }}
                          className="text-red-500 hover:text-red-700 p-2.5 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                          title="Eliminar del historial"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {deviceQuery.trim() === '' && (
                  <div className="space-y-1.5 pt-1 text-left">
                    <span className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-0.5">⚡ Equipos del historial:</span>
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                      {allModels.slice(0, 8).map((m, idx) => (
                        <div key={idx}
                          className={`text-xs font-bold rounded-sm flex items-center font-sans border hover:bg-zinc-50 ${staticCls(idx === focusedDevice)}`}>
                          <button type="button" onClick={() => selectDevice(m)}
                            className="flex-1 p-2.5 text-left cursor-pointer flex justify-between items-center bg-transparent border-0 focus:outline-none"
                          >
                            <span className="font-extrabold uppercase">{m.brand} {m.model}</span>
                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded shrink-0 ${badgeCls(false)}`}>Historial ➙</span>
                          </button>
                          <button type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteDeviceModel?.(m.brand, m.model);
                            }}
                            className="text-red-500 hover:text-red-700 p-2.5 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                            title="Eliminar del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {allModels.length === 0 && <p className="text-center text-[10px] text-zinc-500 py-4">Sin equipos en historial aún.</p>}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-300 flex justify-center">
                  <button type="button" onClick={() => startNewDevice(deviceQuery)}
                    className="text-[10px] text-[#2c3e50] font-black tracking-widest flex items-center gap-1.5 py-1 px-3 border border-dashed border-[#b0bfc9] hover:border-blue-600 hover:text-blue-600 rounded-sm cursor-pointer uppercase">
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Registrar modelo manualmente desde cero
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ── PASO 0 — EQUIPO SELECCIONADO (PIN/PATRÓN) ── */}
          {step === 0 && sub0 === 'pin' && (
            <div className="p-6 space-y-6 text-center">
              <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">EQUIPO SELECCIONADO</h3>
              {hasCompatible && isEquipmentCollapsed ? (
                <div className="max-w-sm mx-auto p-3.5 bg-[#cbd6e2]/25 border border-[#b2c0cc] rounded-lg flex items-center justify-between text-xs transition-all animate-fade-in">
                  <div className="flex items-center gap-2.5 text-left">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="font-extrabold text-[#113a7c] uppercase">
                        {extraDraft.deviceBrand} {extraDraft.deviceModel}
                      </p>
                      <p className="text-[9.5px] font-semibold text-[#60738c] uppercase mt-0.5">
                        {extraDraft.deviceModelNumber ? `No. Modelo: ${extraDraft.deviceModelNumber}` : 'Sin No. Modelo'} • {
                          extraDraft.deviceType === 'Phone' ? 'CELULAR' :
                          extraDraft.deviceType === 'Tablet' ? 'TABLET' :
                          extraDraft.deviceType === 'Watch' ? 'RELOJ/SMARTWATCH' :
                          extraDraft.deviceType === 'Laptop' ? 'LAPTOP' :
                          extraDraft.deviceType === 'Consola' ? 'CONSOLA' :
                          (extraDraft.deviceType || '').toUpperCase()
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEquipmentCollapsed(false)}
                    className="text-[#003c94] hover:text-[#022a68] font-bold text-[9.5px] uppercase border border-[#b2c0cc] hover:border-[#003c94] px-2.5 py-1 rounded bg-white shadow-sm transition-all cursor-pointer"
                  >
                    Modificar
                  </button>
                </div>
              ) : (
                <div className="max-w-sm mx-auto p-5 bg-[#cbd6e2]/40 border border-[#b2c0cc] rounded-sm space-y-3 relative">
                  {hasCompatible && (
                    <button
                      type="button"
                      onClick={() => setIsEquipmentCollapsed(true)}
                      className="absolute top-2 right-2 text-[#60738c] hover:text-zinc-800 text-[8px] font-black uppercase font-mono border border-dashed border-[#b2c0cc] px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Minimizar ⌃
                    </button>
                  )}
                  {/* MARCA */}
                  <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                    <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">MARCA:</span>
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                        value={extraDraft.deviceBrand || ''}
                        onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({ ...d, deviceBrand: val })), val => val.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* MODELO */}
                  <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                    <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">MODELO:</span>
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                        value={extraDraft.deviceModel || ''}
                        onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({ ...d, deviceModel: val })), val => val.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* NO. MODELO */}
                  <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                    <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">NO. MODELO:</span>
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                        placeholder="SIN NÚMERO"
                        value={extraDraft.deviceModelNumber || ''}
                        onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({ ...d, deviceModelNumber: val })), val => val.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* TIPO */}
                  <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 items-center">
                    <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">TIPO:</span>
                    <div className="col-span-2 relative">
                      {(() => {
                        const typeInputValue = extraDraft.deviceType === 'Phone' ? 'CELULAR' :
                                              extraDraft.deviceType === 'Tablet' ? 'TABLET' :
                                              extraDraft.deviceType === 'Watch' ? 'RELOJ/SMARTWATCH' :
                                              extraDraft.deviceType === 'Laptop' ? 'LAPTOP' :
                                              extraDraft.deviceType === 'Consola' ? 'CONSOLA' :
                                              (extraDraft.deviceType || '').toUpperCase();
                        const defaultOptions = ['CELULAR', 'TABLET', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA'];
                        const activeDefaultOptions = defaultOptions.filter(opt => !(deletedDefaultTypes || []).includes(opt.toUpperCase()));
                        const typeOptions = [...activeDefaultOptions, ...(customDeviceTypes || []).map(t => t.toUpperCase())];
                        const isExactExtraOption = typeOptions.includes(typeInputValue);
                        const filteredExtraOptions = typeOptions.filter(opt => {
                          if (isExactExtraOption || !typeInputValue) return true;
                          return opt.includes(typeInputValue.toUpperCase().trim());
                        });

                        const handleSelectExtraOption = (val: string) => {
                          let mapped = val;
                          if (val === 'CELULAR' || val === 'PHONE') mapped = 'Phone';
                          else if (val === 'TABLET') mapped = 'Tablet';
                          else if (val === 'RELOJ' || val === 'SMARTWATCH' || val === 'RELOJ/SMARTWATCH' || val === 'WATCH') mapped = 'Watch';
                          else if (val === 'LAPTOP') mapped = 'Laptop';
                          else if (val === 'CONSOLA') mapped = 'Consola';
                          
                          isExtraTypeManuallyChanged.current = true;
                          setExtraDraft((d: any) => ({ ...d, deviceType: mapped }));
                          setShowTypeDropdown(false);
                        };

                        return (
                          <>
                            <div className="relative w-full">
                              <input
                                type="text"
                                className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm pl-2 pr-6 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                                value={typeInputValue}
                                onFocus={() => setShowTypeDropdown(true)}
                                onBlur={() => {
                                  setTimeout(() => setShowTypeDropdown(false), 200);
                                }}
                                onChange={e => {
                                  const val = e.target.value.toUpperCase().trim();
                                  let mapped = val;
                                  if (val === 'CELULAR' || val === 'PHONE') mapped = 'Phone';
                                  else if (val === 'TABLET') mapped = 'Tablet';
                                  else if (val === 'RELOJ' || val === 'SMARTWATCH' || val === 'RELOJ/SMARTWATCH' || val === 'WATCH') mapped = 'Watch';
                                  else if (val === 'LAPTOP') mapped = 'Laptop';
                                  else if (val === 'CONSOLA') mapped = 'Consola';
                                  
                                  isExtraTypeManuallyChanged.current = true;
                                  setExtraDraft((d: any) => ({ ...d, deviceType: mapped }));
                                }}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#113a7c] pointer-events-none">
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                              </div>
                            </div>
                            {showTypeDropdown && filteredExtraOptions.length > 0 && (
                              <div className="absolute z-[9999] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[#b2c0cc] rounded-md shadow-xl divide-y divide-zinc-100">
                                {filteredExtraOptions.map((opt) => {
                                  return (
                                    <div
                                      key={opt}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectExtraOption(opt);
                                      }}
                                      className="px-3 py-1.5 text-xs font-black text-[#113a7c] uppercase hover:bg-blue-50 cursor-pointer select-none text-left flex justify-between items-center group"
                                    >
                                      <span>{opt}</span>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (onDeleteCustomType) {
                                            onDeleteCustomType(opt);
                                            if (extraDraft.deviceType === opt) {
                                              setExtraDraft((d: any) => ({ ...d, deviceType: 'Phone' }));
                                            }
                                          }
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                                        title="Eliminar tipo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-left max-w-sm mx-auto">
                <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">Acceso al Dispositivo</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['none','pin','pattern'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => { setPinType(t); if (t !== 'pattern') setPatternNodes([]); if (t === 'none') setLocalPin(''); }}
                      className={`py-1.5 rounded-sm text-[9.5px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${pinType === t ? 'bg-[#003c94] text-white border-[#00255a]' : 'bg-white text-[#60738c] border-[#b2c0cc] hover:border-[#003c94] hover:text-[#003c94]'}`}>
                      {t === 'none' ? 'Sin clave' : t === 'pin' ? '🔢 PIN' : '🔷 Patrón'}
                    </button>
                  ))}
                </div>
                {pinType === 'pin' && (
                  <input type="text" autoFocus placeholder="Ingresa el PIN..."
                    className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider uppercase shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                    value={localPin} onChange={e => setLocalPin(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmPin(); } }}
                  />
                )}
                {pinType === 'pattern' && (
                  <div className="flex flex-col items-center gap-2">
                    <svg width="150" height="150" className="bg-zinc-900 rounded-lg cursor-pointer select-none"
                      onClick={e => {
                        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 150;
                        const y = ((e.clientY - rect.top) / rect.height) * 150;
                        let closest = 0; let minD = Infinity;
                        for (let i = 0; i < 9; i++) { const p = nodePos(i); const d = Math.hypot(p.x - x, p.y - y); if (d < minD) { minD = d; closest = i; } }
                        if (minD < 25) setPatternNodes(prev => prev.includes(closest) ? prev : [...prev, closest]);
                      }}>
                      {patternNodes.slice(1).map((n, i) => { const a = nodePos(patternNodes[i]); const b = nodePos(n); return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b82f6" strokeWidth="2" />; })}
                      {Array.from({length:9},(_,i) => { const {x,y} = nodePos(i); const order = patternNodes.indexOf(i); return <circle key={i} cx={x} cy={y} r="10" fill={order>=0?'#3b82f6':'#4b5563'} stroke={order>=0?'#93c5fd':'#6b7280'} strokeWidth="1.5"/>; })}
                    </svg>
                    <span className="text-[10px] text-zinc-400">{patternNodes.length === 0 ? 'Toca los puntos para dibujar' : `${patternNodes.length} punto${patternNodes.length>1?'s':''} — ${patternNodes.join('-')}`}</span>
                    {patternNodes.length > 0 && <button type="button" onClick={() => setPatternNodes([])} className="text-[10px] text-red-400 hover:text-red-300">Borrar patrón</button>}
                  </div>
                )}

                {/* Accesorios Recibidos */}
                <div className="mt-3 relative" ref={accPopoverRef}>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                    Accesorios Recibidos
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAccPopover(!showAccPopover)}
                    className={`w-full py-1.5 px-3 rounded-sm text-xs font-bold uppercase border transition-all cursor-pointer flex items-center justify-between ${
                      (extraDraft.receivedAccessories || []).length > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isRetro
                          ? 'bg-white text-zinc-700 border-[#b2c0cc] hover:border-zinc-400'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-650'
                    }`}
                  >
                    <span>
                      {(extraDraft.receivedAccessories || []).length > 0
                        ? `Accesorios (${extraDraft.receivedAccessories.length})`
                        : 'Registrar Accesorios'}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                      {(extraDraft.receivedAccessories || []).length > 0 ? extraDraft.receivedAccessories.join(', ') : 'Ninguno'}
                    </span>
                  </button>

                  {showAccPopover && (
                    <div className={`absolute z-[100] left-0 right-0 mt-1.5 p-3.5 border rounded shadow-xl max-h-48 overflow-y-auto ${
                      isRetro
                        ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                        : 'bg-[#151926]/95 backdrop-blur-md border-zinc-700 text-zinc-150'
                    }`}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {ACCESSORY_OPTIONS.map((opt) => {
                          const draftAccs = extraDraft.receivedAccessories || [];
                          const checked = draftAccs.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setExtraDraft((d: any) => ({
                                    ...d,
                                    receivedAccessories: checked
                                      ? draftAccs.filter((x: string) => x !== opt)
                                      : [...draftAccs, opt]
                                  }));
                                }}
                                className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                              />
                              <span className="font-semibold uppercase tracking-wide text-[10px]">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-zinc-750/30 mt-3 pt-2.5">
                        <input
                          type="text"
                          placeholder="Otro accesorio..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim().toUpperCase();
                              const draftAccs = extraDraft.receivedAccessories || [];
                              if (val && !draftAccs.includes(val)) {
                                setExtraDraft((d: any) => ({
                                  ...d,
                                  receivedAccessories: [...draftAccs, val]
                                }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border uppercase ${
                            isRetro
                              ? 'bg-white border-zinc-400 text-zinc-800'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                        />
                        <p className="text-[9px] text-zinc-500 mt-1">Presiona ENTER para agregar uno personalizado</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel de Refacciones Compatibles en Mini-Modal */}
              {miniCompatible.length > 0 && (
                <div className={`mt-3 rounded-lg border select-none overflow-hidden max-w-sm mx-auto ${
                  isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800/70 bg-zinc-950/20'
                }`}>
                  {/* Header */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${
                    isLight ? 'border-zinc-150 bg-zinc-50' : 'border-zinc-800/50 bg-zinc-900/40'
                  }`}>
                    <span className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>
                      <span>⚙️</span>
                      <span>Piezas de inventario compatibles</span>
                    </span>
                    <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      isLight ? 'bg-zinc-150 text-zinc-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {(extraDraft.parts || []).filter((p: any) => p.refaccionId).length}/{miniCompatible.length}
                    </span>
                  </div>
                  {/* Search Bar */}
                  <div className={`px-2 py-1.5 border-b ${isLight ? 'bg-zinc-50/50 border-zinc-100' : 'bg-zinc-900/20 border-zinc-800/40'}`}>
                    <input
                      type="text"
                      placeholder="Buscar refacción compatible..."
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                      className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border ${
                        isRetro
                          ? 'bg-white border-zinc-400 text-zinc-800'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                      }`}
                    />
                  </div>
                  {/* Checkbox rows */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40 max-h-48 overflow-y-auto">
                    {filteredMiniCompatible.length === 0 ? (
                      <div className="p-4 text-center text-xs opacity-50">
                        No se encontraron refacciones
                      </div>
                    ) : (
                      filteredMiniCompatible.map((ref: any) => {
                        const displayPrice = customPartPrices[ref.id] !== undefined ? customPartPrices[ref.id] : ref.price;
                        const isSelected = (extraDraft.parts || []).some((p: any) => p.refaccionId === ref.id);

                        const handleToggle = () => {
                          const currentParts = extraDraft.parts || [];
                          let nextParts;
                          if (isSelected) {
                            nextParts = currentParts.filter((p: any) => p.refaccionId !== ref.id);
                          } else {
                            nextParts = [...currentParts, {
                              name: ref.name,
                              cost: ref.cost,
                              price: displayPrice,
                              refaccionId: ref.id,
                              fromStock: ref.stock > 0
                            }];
                          }
                          const totalCost = nextParts.reduce((s: number, p: any) => s + (p.price || 0), 0);
                          let svcDesc = '';
                          let svcType = '';
                          if (nextParts.length > 0) {
                            const lines = nextParts.map((p: any) => {
                              const catalogRef = refacciones.find(r => r.id === p.refaccionId);
                              const cleanCat = catalogRef ? catalogRef.category.toLowerCase().replace(/s$/, '') : '';
                              const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find((s: any) => {
                                const sName = s.name.toLowerCase();
                                return sName.includes(cleanCat) || sName.includes(p.name.toLowerCase());
                              });
                              const baseName = matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${p.name.toUpperCase()}`;
                              return { baseName, price: p.price };
                            });
                            svcDesc = Array.from(new Set(lines.map(l => l.baseName))).join(' Y ');
                            svcType = svcDesc;
                          }
                          setExtraDraft((d: any) => ({
                            ...d,
                            parts: nextParts,
                            cost: totalCost || 0,
                            faultDescription: svcDesc,
                            serviceType: svcType,
                          }));
                        };

                        return (
                          <label
                            key={ref.id}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-950/25')
                                : (isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/30')
                            }`}
                          >
                            {/* Custom checkbox */}
                            <span className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                              isSelected
                                ? (isRetro ? 'bg-emerald-700 border-emerald-700' : 'bg-emerald-500 border-emerald-500')
                                : (isLight ? 'border-zinc-300 bg-white' : 'border-zinc-600 bg-zinc-800')
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <input type="checkbox" className="sr-only" checked={isSelected} onChange={handleToggle} />
                            {/* Name */}
                            <span className={`flex-1 font-semibold uppercase tracking-wide truncate ${
                              isSelected
                                ? (isLight ? 'text-emerald-800' : 'text-emerald-300')
                                : (isLight ? 'text-zinc-700' : 'text-zinc-300')
                            }`}>
                              {ref.name}
                            </span>
                            {/* Price clickable */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOverridePart(ref);
                                setOverrideModalOpen(true);
                              }}
                              className={`font-mono font-black text-[10px] shrink-0 px-2.5 py-1 rounded cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 ${
                                isSelected
                                  ? (isLight ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900')
                                  : (isLight ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750')
                              }`}
                              title="Editar precio en caliente"
                            >
                              {config.currencySymbol || '$'}{displayPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <Edit className="w-2.5 h-2.5 opacity-70 shrink-0" />
                            </button>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button type="button" onClick={() => { setSub0('search'); setExtraDraft((d: any) => ({...d, deviceBrand:'', deviceModel:'', devicePin:''})); setDeviceQuery(''); }}
                  className={`px-5 py-1.5 font-bold text-xs transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${isRetro ? 'rounded-none border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' : 'rounded-lg border'} ${isLight ? (isRetro ? 'bg-[#dfdfdf] hover:bg-zinc-200 text-black border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700') : (isRetro ? 'bg-[#2a2b30] hover:bg-[#32333a] border-t-[#42444c] border-l-[#42444c] border-b-black border-r-black text-white' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white')}`}>
                  ➙ Buscar o registrar otro equipo
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 0 — NUEVO EQUIPO ── */}
          {step === 0 && sub0 === 'newDevice' && (
            <div className="p-6 space-y-4 text-center">
              <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">REGISTRAR NUEVO EQUIPO</h3>
              <div className="space-y-3 max-w-sm mx-auto text-left">
                {/* No. Modelo */}
                <div>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">No. de Modelo <span className="text-zinc-400 normal-case font-normal">(opcional)</span></label>
                  <div className="relative">
                    <input id="nd-modelnum" type="text" autoFocus placeholder="SM-A155M, A3286..."
                      value={extraDraft.deviceModelNumber || ''}
                      onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({...d, deviceModelNumber: val})), val => val.toUpperCase())}
                      onFocus={() => setShowModelNumSugg(true)}
                      onBlur={() => setTimeout(() => setShowModelNumSugg(false), 200)}
                      onKeyDown={e => {
                        if (showModelNumSugg && modelNumberSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setModelNumSuggIdx(prev => (prev + 1) % modelNumberSuggestions.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setModelNumSuggIdx(prev => (prev - 1 + modelNumberSuggestions.length) % modelNumberSuggestions.length);
                          } else if (e.key === 'Enter') {
                            if (modelNumSuggIdx >= 0 && modelNumSuggIdx < modelNumberSuggestions.length) {
                              e.preventDefault();
                              handleSelectModelNum(modelNumberSuggestions[modelNumSuggIdx]);
                            } else {
                              setShowModelNumSugg(false);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowModelNumSugg(false);
                          }
                        } else {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('nd-brand')?.focus();
                          }
                        }
                      }}
                      className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm font-bold uppercase shadow-sm placeholder:text-zinc-400 placeholder:font-normal placeholder:normal-case"
                    />
                    {showModelNumSugg && modelNumberSuggestions.length > 0 && (
                      <div ref={extraModelNumListRef} className={`${sdCls()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                        {modelNumberSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectModelNum(item); }}
                            className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${siCls(idx === modelNumSuggIdx)}`}
                          >
                            <span>{item}</span>
                            <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${badgeCls(idx === modelNumSuggIdx)}`}>
                              {idx === modelNumSuggIdx ? 'Seleccionar ➙' : 'Historial'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Marca */}
                <div>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">Marca *</label>
                  <div className="relative">
                    <input id="nd-brand" type="text" placeholder="Apple, Samsung, Motorola..."
                      value={extraDraft.deviceBrand || ''}
                      onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({...d, deviceBrand: val})), val => val.toUpperCase())}
                      onFocus={() => setShowBrandSugg(true)}
                      onBlur={() => setTimeout(() => setShowBrandSugg(false), 200)}
                      onKeyDown={e => {
                        if (showBrandSugg && brandSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setBrandSuggIdx(prev => (prev + 1) % brandSuggestions.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setBrandSuggIdx(prev => (prev - 1 + brandSuggestions.length) % brandSuggestions.length);
                          } else if (e.key === 'Enter') {
                            if (brandSuggIdx >= 0 && brandSuggIdx < brandSuggestions.length) {
                              e.preventDefault();
                              handleSelectBrand(brandSuggestions[brandSuggIdx]);
                            } else {
                              setShowBrandSugg(false);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowBrandSugg(false);
                          }
                        } else {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('nd-model')?.focus();
                          }
                        }
                      }}
                      className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm font-bold uppercase shadow-sm placeholder:text-zinc-400 placeholder:font-normal placeholder:normal-case"
                    />
                    {showBrandSugg && brandSuggestions.length > 0 && (
                      <div ref={extraBrandListRef} className={`${sdCls()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                        {brandSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectBrand(item); }}
                            className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${siCls(idx === brandSuggIdx)}`}
                          >
                            <span>{item}</span>
                            <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${badgeCls(idx === brandSuggIdx)}`}>
                              {idx === brandSuggIdx ? 'Seleccionar ➙' : 'Historial'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Modelo */}
                <div>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">Modelo *</label>
                  <div className="relative">
                    <input id="nd-model" type="text" placeholder="iPhone 14, Galaxy S23..."
                      value={extraDraft.deviceModel || ''}
                      onChange={e => handleCaretPreservingChange(e, (val) => setExtraDraft((d: any) => ({...d, deviceModel: val})), val => val.toUpperCase())}
                      onFocus={() => setShowModelSugg(true)}
                      onBlur={() => setTimeout(() => setShowModelSugg(false), 200)}
                      onKeyDown={e => {
                        if (showModelSugg && modelSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setModelSuggIdx(prev => (prev + 1) % modelSuggestions.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setModelSuggIdx(prev => (prev - 1 + modelSuggestions.length) % modelSuggestions.length);
                          } else if (e.key === 'Enter') {
                            if (modelSuggIdx >= 0 && modelSuggIdx < modelSuggestions.length) {
                              e.preventDefault();
                              handleSelectModel(modelSuggestions[modelSuggIdx]);
                            } else {
                              setShowModelSugg(false);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowModelSugg(false);
                          }
                        } else {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            goNext();
                          }
                        }
                      }}
                      className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm font-bold uppercase shadow-sm placeholder:text-zinc-400 placeholder:font-normal placeholder:normal-case"
                    />
                    {showModelSugg && modelSuggestions.length > 0 && (
                      <div ref={extraModelListRef} className={`${sdCls()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                        {modelSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectModel(item); }}
                            className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${siCls(idx === modelSuggIdx)}`}
                          >
                            <span>{item}</span>
                            <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${badgeCls(idx === modelSuggIdx)}`}>
                              {idx === modelSuggIdx ? 'Seleccionar ➙' : 'Historial'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Tipo */}
                {(() => {
                  const BASE_TIPOS = [
                    { value: 'Phone', label: 'CELULAR' },
                    { value: 'Tablet', label: 'TABLET' },
                    { value: 'Laptop', label: 'LAPTOP' },
                    { value: 'Watch', label: 'RELOJ' },
                  ].filter(t => !(deletedDefaultTypes || []).includes(t.label.toUpperCase()));
                  const TIPOS = [...BASE_TIPOS, ...(customDeviceTypes || []).filter(c => !BASE_TIPOS.some(b => b.value === c)).map(c => ({ value: c, label: c }))];
                  const q = extraTypeQuery.toLowerCase();
                  const filtered = q ? TIPOS.filter(t => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)) : TIPOS;
                  const showAddNew = q.trim() !== '' && !TIPOS.some(t => t.label.toLowerCase() === q || t.value.toLowerCase() === q);
                  const displayLabel = (v: string) => TIPOS.find(t => t.value === v)?.label ?? v;
                  return (
                    <div>
                      <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">TIPO DE DISPOSITIVO:</label>
                      <div className="relative">
                        <input
                          id="nd-type"
                          type="text"
                          autoComplete="off"
                          placeholder=""
                          value={extraTypeOpen ? extraTypeQuery : (extraTypeQuery || displayLabel(extraDraft.deviceType || 'Phone'))}
                          onChange={e => handleCaretPreservingChange(e, (val) => { setExtraTypeQuery(val); setExtraTypeOpen(true); setExtraTypeHighlight(0); }, val => val.toUpperCase())}
                          onFocus={() => { setExtraTypeQuery(''); setExtraTypeOpen(true); setExtraTypeHighlight(0); }}
                          onBlur={() => setTimeout(() => setExtraTypeOpen(false), 150)}
                          onKeyDown={e => {
                            const total = filtered.length + (showAddNew ? 1 : 0);
                            if (e.key === 'ArrowDown') { e.preventDefault(); setExtraTypeHighlight(h => (h + 1) % total); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setExtraTypeHighlight(h => (h - 1 + total) % total); }
                            else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (extraTypeOpen && total > 0) {
                                const val = extraTypeHighlight < filtered.length ? filtered[extraTypeHighlight].value : extraTypeQuery.trim().toUpperCase();
                                setExtraDraft((d: any) => ({ ...d, deviceType: val }));
                                if (extraTypeHighlight >= filtered.length) onSaveCustomType?.(val);
                                setExtraTypeQuery(''); setExtraTypeOpen(false);
                              } else if (extraTypeQuery.trim() !== '') {
                                const match = TIPOS.find(t => t.label.toLowerCase() === extraTypeQuery.toLowerCase().trim() || t.value.toLowerCase() === extraTypeQuery.toLowerCase().trim());
                                const val = match ? match.value : extraTypeQuery.trim().toUpperCase();
                                if (!match) onSaveCustomType?.(val);
                                setExtraDraft((d: any) => ({ ...d, deviceType: val }));
                                setExtraTypeQuery(''); setExtraTypeOpen(false);
                              }
                            } else if (e.key === 'Escape') {
                              setExtraTypeQuery(''); setExtraTypeOpen(false);
                            }
                          }}
                          className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm font-bold shadow-sm placeholder:text-zinc-500"
                        />
                        {extraTypeOpen && (
                          <div ref={extraTypeListRef} className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-[#b2c0cc] shadow-lg rounded-sm max-h-44 overflow-y-auto">
                            {filtered.map((t, idx) => {
                              const isCustom = (customDeviceTypes || []).includes(t.value);
                              const isPendingDel = (pendingDeleteType ?? null) === t.value;
                              if (isPendingDel) return (
                                <div key={t.value} className="flex items-center gap-1 px-2 py-1.5 bg-red-50 border-b border-red-100">
                                  <span className="flex-1 text-xs font-black text-red-700 truncate">¿Eliminar "{t.label}"?</span>
                                  <button type="button" onMouseDown={() => { onDeleteCustomType?.(t.value); onSetPendingDeleteType?.(null); if (extraDraft.deviceType === t.value) setExtraDraft((d: any) => ({ ...d, deviceType: 'Phone' })); }}
                                    className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-red-700">Sí</button>
                                  <button type="button" onMouseDown={() => onSetPendingDeleteType?.(null)}
                                    className="text-[10px] font-black bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded cursor-pointer hover:bg-zinc-300">No</button>
                                </div>
                              );
                              return (
                                <div key={t.value} className={`flex items-center transition-colors ${idx === extraTypeHighlight ? 'bg-blue-600' : extraDraft.deviceType === t.value ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                                  <button type="button" onMouseDown={() => { setExtraDraft((d: any) => ({ ...d, deviceType: t.value })); setExtraTypeQuery(''); setExtraTypeOpen(false); }}
                                    className={`flex-1 text-left px-3 py-1.5 text-sm font-bold cursor-pointer ${idx === extraTypeHighlight ? 'text-white' : extraDraft.deviceType === t.value ? 'text-blue-700' : 'text-zinc-700'}`}>
                                    {t.label}
                                  </button>
                                  <button type="button" onMouseDown={e => { e.stopPropagation(); onSetPendingDeleteType?.(t.value); }}
                                    className={`w-8 flex-shrink-0 flex items-center justify-center py-1.5 text-xs font-black cursor-pointer ${idx === extraTypeHighlight ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-600'}`}>✕</button>
                                </div>
                              );
                            })}
                            {showAddNew && (
                              <button type="button"
                                onMouseDown={() => { const v = extraTypeQuery.trim().toUpperCase(); setExtraDraft((d: any) => ({ ...d, deviceType: v })); onSaveCustomType?.(v); setExtraTypeQuery(''); setExtraTypeOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm font-bold cursor-pointer border-t border-zinc-200 flex items-center gap-1.5 transition-colors ${extraTypeHighlight === filtered.length ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}>
                                <span>+</span> Agregar "{extraTypeQuery.trim()}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {/* Acceso */}
                <div>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">ACCESO AL DISPOSITIVO:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['none','pin','pattern'] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => { setPinType(t); if (t !== 'pattern') setPatternNodes([]); if (t === 'none') setLocalPin(''); }}
                        className={`py-1.5 rounded-sm text-[9.5px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${pinType === t ? 'bg-[#003c94] text-white border-[#00255a]' : 'bg-white text-[#60738c] border-[#b2c0cc] hover:border-[#003c94]'}`}>
                        {t === 'none' ? 'Sin clave' : t === 'pin' ? '🔢 PIN' : '🔷 Patrón'}
                      </button>
                    ))}
                  </div>
                  {pinType === 'pin' && (
                    <input id="nd-pin" type="text" autoFocus placeholder="Ingresa el PIN..."
                      className="mt-1.5 w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider uppercase shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                      value={localPin} onChange={e => setLocalPin(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goNext(); } }}
                    />
                  )}
                </div>

                {/* Accesorios Recibidos */}
                <div className="mt-3 relative" ref={accPopoverRef}>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                    Accesorios Recibidos
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAccPopover(!showAccPopover)}
                    className={`w-full py-1.5 px-3 rounded-sm text-xs font-bold uppercase border transition-all cursor-pointer flex items-center justify-between ${
                      (extraDraft.receivedAccessories || []).length > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isRetro
                          ? 'bg-white text-zinc-700 border-[#b2c0cc] hover:border-zinc-400'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-650'
                    }`}
                  >
                    <span>
                      {(extraDraft.receivedAccessories || []).length > 0
                        ? `Accesorios (${extraDraft.receivedAccessories.length})`
                        : 'Registrar Accesorios'}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                      {(extraDraft.receivedAccessories || []).length > 0 ? extraDraft.receivedAccessories.join(', ') : 'Ninguno'}
                    </span>
                  </button>

                  {showAccPopover && (
                    <div className={`absolute z-[100] left-0 right-0 mt-1.5 p-3.5 border rounded shadow-xl max-h-48 overflow-y-auto ${
                      isRetro
                        ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                        : 'bg-[#151926]/95 backdrop-blur-md border-zinc-700 text-zinc-150'
                    }`}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {ACCESSORY_OPTIONS.map((opt) => {
                          const draftAccs = extraDraft.receivedAccessories || [];
                          const checked = draftAccs.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setExtraDraft((d: any) => ({
                                    ...d,
                                    receivedAccessories: checked
                                      ? draftAccs.filter((x: string) => x !== opt)
                                      : [...draftAccs, opt]
                                  }));
                                }}
                                className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                              />
                              <span className="font-semibold uppercase tracking-wide text-[10px]">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-zinc-750/30 mt-3 pt-2.5">
                        <input
                          type="text"
                          placeholder="Otro accesorio..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim().toUpperCase();
                              const draftAccs = extraDraft.receivedAccessories || [];
                              if (val && !draftAccs.includes(val)) {
                                setExtraDraft((d: any) => ({
                                  ...d,
                                  receivedAccessories: [...draftAccs, val]
                                }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border uppercase ${
                            isRetro
                              ? 'bg-white border-zinc-400 text-zinc-805'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                          }`}
                        />
                        <p className="text-[9px] text-zinc-500 mt-1">Presiona ENTER para agregar uno personalizado</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1: NUEVO SERVICIO ── */}
          {step === 1 && isAddingNewSvc && (
            <div className="p-6 space-y-5 text-center">
              <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">REGISTRAR NUEVO SERVICIO</h3>
              <div className="space-y-4 max-w-sm mx-auto text-left">
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">Nombre del Servicio *</label>
                  <input type="text" autoFocus value={newSvcName}
                    onChange={e => handleCaretPreservingChange(e, setNewSvcName, val => val.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('extra-svc-price')?.focus(); } }}
                    placeholder="Ej. CAMBIO DE PANTALLA"
                    className={`w-full focus:outline-none px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border ${isRetro?'bg-white border-zinc-400 text-black':'bg-zinc-950 border-zinc-700 text-white focus:border-amber-500'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">Precio ({currencySymbol}) *</label>
                  <input id="extra-svc-price" type="number" min={0} value={newSvcPrice === 0 ? 0 : (newSvcPrice || '')}
                    onChange={e => setNewSvcPrice(e.target.value === '' ? '' as any : (Number(e.target.value) || 0))}
                    onFocus={e => e.target.select()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newSvcName.trim() || newSvcPrice < 0) { setErrorMsg('Nombre del servicio es requerido.'); return; }
                        if (onAddService) onAddService({ id: `SVC-${Date.now()}`, name: newSvcName.trim(), category: 'Servicio General', price: newSvcPrice, durationMinutes: 30, popularity: 5 });
                        const updated = { ...extraDraft, faultDescription: newSvcName, serviceType: newSvcName, cost: newSvcPrice };
                        setExtraDraft(() => updated);
                        setIsAddingNewSvc(false);
                        setErrorMsg('');
                        onConfirm(updated);
                      }
                    }}
                    placeholder="Requerido"
                    className={`w-full focus:outline-none px-3 py-2 text-xs font-mono font-bold rounded-lg border ${newSvcPrice>=0?(isRetro?'bg-white border-zinc-400 text-black':'bg-zinc-950 border-zinc-700 text-emerald-400 focus:border-amber-500'):(isRetro?'bg-white border-red-400 text-black':'bg-zinc-950 border-red-500/60 text-red-400')}`}
                  />
                  {newSvcPrice < 0 && <p className="text-[9px] text-red-400 font-bold mt-0.5">⚠ El precio no puede ser negativo</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    onClick={() => {
                      if (!newSvcName.trim() || newSvcPrice < 0) { setErrorMsg('Nombre del servicio es requerido.'); return; }
                      if (onAddService) onAddService({ id: `SVC-${Date.now()}`, name: newSvcName.trim(), category: 'Servicio General', price: newSvcPrice, durationMinutes: 30, popularity: 5 });
                      const updated = { ...extraDraft, faultDescription: newSvcName, serviceType: newSvcName, cost: newSvcPrice };
                      setExtraDraft(() => updated);
                      setIsAddingNewSvc(false);
                      setErrorMsg('');
                      onConfirm(updated);
                    }}
                    disabled={!newSvcName.trim() || newSvcPrice < 0}
                    className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${!newSvcName.trim()||newSvcPrice<0?'opacity-40 cursor-not-allowed bg-zinc-600 text-zinc-300':`cursor-pointer ${isRetro?'bg-[#003c94] text-white':'bg-amber-500 hover:bg-amber-400 text-black'}`}`}>
                    ✓ Registrar y continuar
                  </button>
                  <button type="button" onClick={() => { setIsAddingNewSvc(false); setServiceQuery(''); setErrorMsg(''); }}
                    className={`px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer ${isRetro?'bg-zinc-200 border border-zinc-400 text-zinc-700':'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1: SERVICIO ── */}
          {step === 1 && !isAddingNewSvc && (
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans text-center">BUSCAR O DEFINIR EL SERVICIO</h3>
              <div className="space-y-3 max-w-md mx-auto text-left">
                <div className="p-2 bg-[#cbd6e2]/40 border border-[#b2c0cc] rounded-sm flex items-center justify-between text-[9px] font-bold text-[#203a5c]">
                  <span>Equipo:</span>
                  <span className="uppercase text-[#003c94] font-black">{extraDraft.deviceBrand} {extraDraft.deviceModel}</span>
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">SERVICIO REQUERIDO *</label>
                  <div className="premium-search-container w-full select-none flex items-center">
                    <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0" />
                    <div className="relative flex-1 flex items-center">
                      <input type="text" autoFocus placeholder="Cambio de pantalla, Batería, Limpieza..."
                        value={serviceQuery}
                        onChange={e => handleCaretPreservingChange(e, (val) => { setServiceQuery(val); setExtraDraft((d: any) => ({...d, faultDescription: val, serviceType:''})); setFocusedService(-1); }, val => val.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedService(p => Math.min(p+1, serviceSugg.length-1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedService(p => Math.max(p-1, 0)); }
                          else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (focusedService >= 0 && serviceSugg[focusedService]) {
                              selectService(serviceSugg[focusedService]);
                            } else if (serviceSugg.length > 0 && serviceQuery.trim()) {
                              selectService(serviceSugg[0]);
                            } else if (serviceQuery.trim()) {
                              triggerNewService(serviceQuery);
                            }
                          }
                        }}
                        className="premium-search-input uppercase text-zinc-100"
                      />
                      {serviceQuery && <button type="button" onClick={() => { setServiceQuery(''); setExtraDraft((d: any) => ({...d, faultDescription:'', serviceType:''})); }} className="absolute right-2 text-zinc-400 hover:text-white font-black text-xs">✕</button>}
                    </div>
                  </div>
                  {serviceQuery.trim() !== '' && serviceSugg.length === 0 && (
                    <p className="text-[10px] text-zinc-500 font-bold mt-1 flex items-center gap-1">
                      <span>💡</span> Servicio no encontrado — presiona <span className="bg-zinc-200 text-zinc-700 font-mono text-[9px] px-1 py-0.5 rounded border border-zinc-300">ENTER</span> para <strong className="text-amber-500">registrar nuevo servicio</strong>.
                    </p>
                  )}
                </div>

                {serviceQuery.trim() !== '' && serviceSugg.length > 0 && (
                  <div className={`${sdCls()} rounded-sm p-2 text-left max-h-48 overflow-y-auto space-y-1 divide-y divide-zinc-700/30 shadow-lg`}>
                    <div className={`${shCls()} tracking-wider select-none`}>📂 Coincidencias en catálogo:</div>
                    {serviceSugg.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => selectService(s)}
                        className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs font-bold cursor-pointer ${siCls(idx === focusedService)}`}>
                        <span>{s.name}</span>
                        <span className={`text-[9px] uppercase font-mono px-2.5 py-0.5 rounded ${badgeCls(idx === focusedService)}`}>{currencySymbol}{s.price} ➙</span>
                      </button>
                    ))}
                  </div>
                )}

                {serviceQuery.trim() === '' && (
                  <div className="space-y-1">
                    <span className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">⚡ Servicios frecuentes:</span>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      {services.map((s, idx) => (
                        <button key={idx} type="button" onClick={() => selectService(s)}
                          className={`p-3 text-xs font-bold rounded-sm text-left cursor-pointer flex justify-between items-center font-sans border ${staticCls(idx === focusedService)}`}>
                          <span className="truncate font-extrabold">{s.name}</span>
                          <span className={`font-mono shrink-0 text-[10.5px] font-bold ${isLight?'text-amber-700':'text-amber-500'}`}>{currencySymbol}{s.price} ➙</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {extraDraft.faultDescription && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] rounded-sm flex items-center gap-2 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Servicio: <strong className="uppercase">{extraDraft.faultDescription}</strong></span>
                  </div>
                )}

                {/* Solo cargo — anticipo se maneja en paso 4 global */}
                <div className={`rounded-xl border overflow-hidden ${isRetro?'border-zinc-300':'border-zinc-700'}`}>
                  <div className={`flex flex-col items-center py-2.5 px-3 ${isRetro?'bg-emerald-50':'bg-emerald-950/30'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isRetro?'text-emerald-700':'text-emerald-500'}`}>💰 Cargo de este equipo</span>
                    <div className="relative w-full max-w-[160px]">
                      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-black ${isRetro?'text-emerald-700':'text-emerald-400'}`}>{currencySymbol}</span>
                      <input ref={cargoRef} type="text" inputMode="numeric" placeholder="0.00" value={extraDraft.cost === 0 ? 0 : (extraDraft.cost || '')}
                        onFocus={e => e.target.select()}
                        onChange={e => { const v=e.target.value.replace(/[^0-9.]/g,''); setExtraDraft((d:any)=>({...d,cost:v === '' ? '' : (Number(v) || 0)})); }}
                        onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); onConfirm(); } }}
                        className={`w-full text-right text-lg font-black font-mono pl-7 pr-2 py-1.5 rounded-lg focus:outline-none ${isRetro?'bg-white text-emerald-800 border border-emerald-300':'bg-emerald-950/40 text-emerald-300 border border-emerald-800 focus:border-emerald-500'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isRetro?'bg-amber-50 border border-amber-200':'bg-amber-950/10 border border-zinc-800/40'}`}>
                  <span className="text-sm">📅</span>
                  <p className={`text-[9px] ${isRetro?'text-amber-700':'text-amber-500'}`}>La fecha de entrega se toma del formulario principal y aplica a todos los equipos del grupo.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
          isRetro 
            ? (isLight ? 'bg-[#e1e6ed] border-zinc-300' : 'bg-[#121316] border-[#383c48]')
            : 'bg-[#151926]/95 border-zinc-900'
        }`}>
          <button type="button" onClick={goBack}
            title={sub0==='search'&&step===0?'Cancelar registro de equipo':'Regresar al paso anterior del equipo'}
            className={`py-1.5 px-4 rounded-sm text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-1 border ${isRetro?'text-zinc-700 bg-[#cbd6e2] hover:bg-[#b9c6d5] border-[#b0bfc9]':'text-zinc-300 bg-zinc-900 hover:bg-zinc-700 border-zinc-800'}`}>
            <ChevronLeft className="w-4 h-4" /> {sub0==='search'&&step===0?'Cancelar':'Anterior'}
          </button>
          <button type="button" onClick={goNext}
            title={step===1?'Guardar y agregar este equipo a la orden':'Avanzar al siguiente paso del equipo'}
            className={`py-1.5 px-5 font-bold text-xs rounded-sm transition-all cursor-pointer shadow-md uppercase tracking-wider flex items-center gap-1 border ${step===1?'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white':(isRetro?'bg-[#003c94] hover:bg-[#002f74] border-[#00255a] text-white':'bg-amber-500 hover:bg-amber-400 border-amber-600 text-black')}`}>
            {step===1?<><Save className="w-4 h-4"/> Agregar equipo</>:<>Siguiente <ChevronRight className="w-4 h-4"/></>}
          </button>
        </div>
      </div>

      <AdminPriceOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => { setOverrideModalOpen(false); setOverridePart(null); }}
        onSuccess={handlePriceOverrideSuccess}
        itemName={overridePart ? overridePart.name : ''}
        currentPrice={overridePart ? (customPartPrices[overridePart.id] !== undefined ? customPartPrices[overridePart.id] : overridePart.price) : 0}
        users={users}
        currentUser={currentUser}
        isLight={isLight}
        isRetro={isRetro}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

export default function NuevaView({
  services,
  onCreateOrder,
  config,
  orders = [],
  clients = [],
  users = [],
  setActiveTab,
  onAddService,
  onNavigateAway,
  onProgressChange,
  currentUser,
  onBatchCreated,
  prefillFromQuote,
  onPrefillConsumed,
  refacciones = [],
  onSetRefacciones,
  prefillFromRefaccion,
  onPrefillRefaccionConsumed,
}: NuevaViewProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [customDeviceTypes, setCustomDeviceTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_custom_device_types') || '[]'); } catch { return []; }
  });
  const saveCustomType = (val: string) => {
    setCustomDeviceTypes(prev => {
      if (prev.includes(val)) return prev;
      const next = [...prev, val];
      localStorage.setItem('fixmanager_custom_device_types', JSON.stringify(next));
      return next;
    });
  };
  const [deletedDefaultTypes, setDeletedDefaultTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_deleted_default_device_types') || '[]'); } catch { return []; }
  });
  const deleteDeviceType = (val: string) => {
    const valUpper = val.toUpperCase().trim();
    const defaults = ['CELULAR', 'TABLET', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA', 'RELOJ'];
    
    if (defaults.includes(valUpper)) {
      setDeletedDefaultTypes(prev => {
        if (prev.includes(valUpper)) return prev;
        const next = [...prev, valUpper];
        localStorage.setItem('fixmanager_deleted_default_device_types', JSON.stringify(next));
        return next;
      });
    } else {
      setCustomDeviceTypes(prev => {
        const next = prev.filter(t => t.toUpperCase() !== valUpper);
        localStorage.setItem('fixmanager_custom_device_types', JSON.stringify(next));
        return next;
      });
    }

    const currentMapped = (deviceType === 'Phone' ? 'CELULAR' :
                           deviceType === 'Tablet' ? 'TABLET' :
                           deviceType === 'Watch' ? 'RELOJ/SMARTWATCH' :
                           deviceType === 'Laptop' ? 'LAPTOP' :
                           deviceType === 'Consola' ? 'CONSOLA' :
                           (deviceType || '').toUpperCase()).trim();
    if (currentMapped === valUpper) {
      setDeviceType('Phone');
    }
  };
  const [pendingDeleteType, setPendingDeleteType] = useState<string | null>(null);
  const [showMainTypeDropdown, setShowMainTypeDropdown] = useState(false);
  const isTypeManuallyChanged = useRef(false);
  const deviceTypeListRef = useRef<HTMLDivElement>(null);  const [pendingNavTab, setPendingNavTab] = useState<any>(null);
  
  const abonoInputRef = useRef<HTMLInputElement>(null);
  const cargoInputRef = useRef<HTMLInputElement>(null);
  const recibidoInputRef = useRef<HTMLInputElement>(null);
  const historialDeviceStepRef = useRef(false);
  const handleNextStepRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (activeStep === 3) {
      setTimeout(() => {
        cargoInputRef.current?.focus();
        cargoInputRef.current?.select();
      }, 250);
    }
  }, [activeStep]);

  const fmtPhone10 = (digits: string) => {
    const d = digits.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  // Form input states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false);
  const [deviceType, setDeviceType] = useState<string>('Phone');
  const [deviceTypeQuery, setDeviceTypeQuery] = useState('');
  const [deviceTypeOpen, setDeviceTypeOpen] = useState(false);
  const [deviceTypeHighlight, setDeviceTypeHighlight] = useState(0);
  React.useEffect(() => {
    const el = deviceTypeListRef.current?.children[deviceTypeHighlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [deviceTypeHighlight]);
  const [deviceBrand, setDeviceBrand] = useState('Apple');
  const [deviceModelNumber, setDeviceModelNumber] = useState('');
  const [deviceModel, setDeviceModel] = useState('');

  useEffect(() => {
    if (!isTypeManuallyChanged.current && (deviceBrand || deviceModel || deviceModelNumber)) {
      const detected = autoDetectDeviceType(deviceBrand, deviceModel, deviceModelNumber);
      if (detected) {
        let mapped = detected;
        if (detected === 'CELULAR') mapped = 'Phone';
        else if (detected === 'TABLET') mapped = 'Tablet';
        else if (detected === 'RELOJ/SMARTWATCH') mapped = 'Watch';
        else if (detected === 'LAPTOP') mapped = 'Laptop';
        else if (detected === 'CONSOLA') mapped = 'Consola';
        
        setDeviceType(mapped);
      }
    }
  }, [deviceBrand, deviceModel, deviceModelNumber]);

  const compatibleRefacciones = React.useMemo(() => {
    if (!deviceBrand || !deviceModel) return [];
    return refacciones.filter(r => checkRefaccionCompatibility(r, deviceBrand, deviceModel) && r.stock >= 0);
  }, [refacciones, deviceBrand, deviceModel]);
  const [isEquipmentCollapsed, setIsEquipmentCollapsed] = useState(true);
  const [devicePin, setDevicePin] = useState('');
  const [pinType, setPinType] = useState<'none' | 'pin' | 'pattern'>('none');
  const [patternNodes, setPatternNodes] = useState<number[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [showAccessoriesPopover, setShowAccessoriesPopover] = useState(false);
  const accessoriesPopoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accessoriesPopoverRef.current && !accessoriesPopoverRef.current.contains(e.target as Node)) {
        setShowAccessoriesPopover(false);
      }
    };
    if (showAccessoriesPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccessoriesPopover]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCountryCode, setCustomerCountryCode] = useState('+52');

  const hasProgress = activeStep > 0 || !!customerName || !!deviceModel;

  // Prefill from quote — applied after states are declared (see effect below)
  const prefillApplied = React.useRef(false);
  const prefillRefaccionApplied = React.useRef(false);

  // Sync pinType + patternNodes → devicePin
  React.useEffect(() => {
    if (pinType === 'none') {
      setDevicePin('SIN CLAVE');
    } else if (pinType === 'pattern') {
      setDevicePin(patternNodes.length > 0 ? `PATRÓN: ${patternNodes.join('-')}` : '');
    }
    // 'pin' is managed directly by its input onChange
  }, [pinType, patternNodes]);

  // Reportar progreso al padre — después de hasProgress
  useEffect(() => {
    onProgressChange?.(hasProgress);
  }, [hasProgress]);

  // Step 2 service search and addition states
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [isAddingNewService, setIsAddingNewService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(0);

  const serviceSuggestionsListRef = useRef<HTMLDivElement>(null);
  const serviceHistoryListRef = useRef<HTMLDivElement>(null);

  const [showNewSvcSugg, setShowNewSvcSugg] = useState(false);
  const [newSvcSuggIdx, setNewSvcSuggIdx] = useState(-1);
  const newSvcListRef = useRef<HTMLDivElement>(null);

  const newSvcSuggestions = React.useMemo(() => {
    const q = newServiceName.trim().toUpperCase();
    if (!q) return [];
    return INITIAL_SERVICES.filter(s =>
      s.name.toUpperCase().includes(q) &&
      !services.some(x => x.name.toUpperCase() === s.name.toUpperCase())
    );
  }, [newServiceName, services]);

  React.useEffect(() => {
    if (newSvcSuggIdx < 0) return;
    const el = newSvcListRef.current?.children[newSvcSuggIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [newSvcSuggIdx]);

  const handleSelectNewSvcSugg = (name: string) => {
    setNewServiceName(name.toUpperCase());
    setShowNewSvcSugg(false);
    setTimeout(() => {
      document.getElementById('new-svc-price')?.focus();
    }, 50);
  };


  const [deletedServices, setDeletedServices] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_deleted_services') || '[]'); } catch { return []; }
  });

  const deleteServiceFromHistory = (svc: ServicePrice) => {
    setDeletedServices(prev => {
      const idStr = svc.id ? String(svc.id) : '';
      const nameStr = svc.name.toUpperCase().trim();
      const next = [...prev];
      if (idStr && !next.includes(idStr)) next.push(idStr);
      if (!next.includes(nameStr)) next.push(nameStr);
      localStorage.setItem('fixmanager_deleted_services', JSON.stringify(next));
      return next;
    });
  };

  const activeServices = React.useMemo(() => {
    const list = services.length > 0 ? services : INITIAL_SERVICES;
    return list.filter(s => {
      const idStr = s.id ? String(s.id) : '';
      const nameStr = s.name.toUpperCase().trim();
      return !deletedServices.includes(idStr) && !deletedServices.includes(nameStr);
    });
  }, [services, deletedServices]);

  const matchedServices = React.useMemo(() => {
    const q = serviceSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return activeServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  }, [serviceSearchQuery, activeServices]);


  const exactServiceMatch = React.useMemo(() => {
    const q = serviceSearchQuery.trim().toLowerCase();
    if (!q) return null;
    return activeServices.find(s => s.name.toLowerCase() === q);
  }, [serviceSearchQuery, activeServices]);

  // Focus index for keyboard navigation in Stage 2 suggestions list
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const activeSuggestions = React.useMemo(() => {
    if (serviceSearchQuery.trim() !== '') {
      return matchedServices;
    } else {
      return activeServices;
    }
  }, [serviceSearchQuery, matchedServices, activeServices]);

  React.useEffect(() => {
    if (focusedIndex < 0) return;
    if (serviceSearchQuery.trim() !== '') {
      const el = serviceSuggestionsListRef.current?.children[focusedIndex + 1] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    } else {
      const el = serviceHistoryListRef.current?.children[focusedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);


  // Step 3 client search and addition states
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [focusedClientIndex, setFocusedClientIndex] = useState<number>(-1);
  const [isRegisteringNewClient, setIsRegisteringNewClient] = useState(false);
  // Modal de coincidencia exacta
  const [exactMatchModal, setExactMatchModal] = useState<{ candidates: Client[]; focusedIdx: number } | null>(null);
  // Focused index for phone-conflict modal: 0 = "Usar existente", 1 = "Continuar nuevo"
  const [conflictFocusedIdx, setConflictFocusedIdx] = useState(0);

  useEffect(() => {
    if (isRegisteringNewClient) {
      setTimeout(() => {
        const phoneClean = customerPhone.replace(/\D/g, '');
        if (phoneClean.length > 0 && !customerName.trim()) {
          const nameInput = document.getElementById('new-customer-name-input') as HTMLInputElement | null;
          if (nameInput) {
            nameInput.focus();
            nameInput.select();
          }
        } else if (customerName.trim() !== '' && phoneClean.length === 0) {
          const phoneInput = document.getElementById('new-customer-phone-input') as HTMLInputElement | null;
          if (phoneInput) {
            phoneInput.focus();
            phoneInput.select();
          }
        } else {
          const nameInput = document.getElementById('new-customer-name-input');
          if (nameInput) nameInput.focus();
        }
      }, 100);
    }
  }, [isRegisteringNewClient]);


  const [deletedDeviceModels, setDeletedDeviceModels] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_deleted_device_models') || '[]'); } catch { return []; }
  });

  const deleteDeviceModelFromHistory = (brand: string, model: string) => {
    const key = `${brand.trim().toUpperCase()}|${model.trim().toUpperCase()}`;
    setDeletedDeviceModels(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      localStorage.setItem('fixmanager_deleted_device_models', JSON.stringify(next));
      return next;
    });
  };

  const [deletedClients, setDeletedClients] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_deleted_clients') || '[]'); } catch { return []; }
  });

  const deleteClientFromHistory = (phone: string) => {
    setDeletedClients(prev => {
      if (prev.includes(phone)) return prev;
      const next = [...prev, phone];
      localStorage.setItem('fixmanager_deleted_clients', JSON.stringify(next));
      return next;
    });
  };

  const activeClients = React.useMemo(() => {
    return (clients || []).filter(c => !deletedClients.includes(c.phone));
  }, [clients, deletedClients]);

  const matchedClientsFiltered = React.useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return activeClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [clientSearchQuery, activeClients]);

  const activeClientSuggestions = React.useMemo(() => {
    if (clientSearchQuery.trim() !== '') {
      return matchedClientsFiltered;
    } else {
      // Show up to 8 of the existing clients as a history/quick selection list
      return activeClients.slice(0, 8);
    }
  }, [clientSearchQuery, matchedClientsFiltered, activeClients]);

  const exactClientMatch = React.useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return null;
    return activeClients.find(c =>
      c.name.toLowerCase() === q ||
      c.phone.replace(/\D/g, '') === q.replace(/\D/g, '')
    );
  }, [clientSearchQuery, activeClients]);

  // Todos los que coinciden exactamente por nombre o teléfono
  const exactClientMatches = React.useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, '');
    return activeClients.filter(c =>
      c.name.toLowerCase() === q ||
      (digits.length >= 7 && c.phone.replace(/\D/g, '') === digits)
    );
  }, [clientSearchQuery, activeClients]);

  React.useEffect(() => {
    setFocusedIndex(-1);
    setFocusedClientIndex(-1);
  }, [serviceSearchQuery, clientSearchQuery, activeStep]);

  const handleSelectService = (svc: ServicePrice) => {
    setSelectedServiceId(svc.id);
    setNewServiceName(svc.name.toUpperCase());
    setNewServicePrice(svc.price || 0);
    setIsAddingNewService(true);
    setErrorMsg('');
  };

  const handleAddNewService = () => {
    const query = serviceSearchQuery.trim();
    if (!query) return;
    setSelectedServiceId('');
    setNewServiceName(query.toUpperCase());
    setNewServicePrice(0);
    setIsAddingNewService(true);
    setErrorMsg('');
  };

  const handleConfirmServicePrice = () => {
    if (!newServiceName.trim()) return;
    if (newServicePrice === undefined || newServicePrice === null || newServicePrice < 0) {
      setErrorMsg('El precio del servicio debe ser mayor o igual a 0.');
      return;
    }

    const nameUpper = newServiceName.trim().toUpperCase();
    const existingSvc = services.find(s => s.name.toUpperCase() === nameUpper);
    let targetId = selectedServiceId;

    if (!existingSvc) {
      const newId = `SVC-${Date.now()}`;
      targetId = newId;
      const newSvc: ServicePrice = {
        id: newId,
        name: nameUpper,
        category: 'Servicio General',
        price: newServicePrice,
        durationMinutes: 30,
        popularity: 5
      };
      if (onAddService) onAddService(newSvc);
    } else {
      targetId = existingSvc.id;
    }

    setSelectedServiceId(targetId);
    setFaultDescription(nameUpper);
    setServiceSearchQuery(nameUpper);
    
    // Si ya hay refacciones vinculadas, mantener la suma de sus precios globales en lugar de sobrescribirlo con el precio del servicio
    const linkedParts = refacciones.filter(r => parts.some(p => p.refaccionId === r.id));
    if (linkedParts.length > 0) {
      const totalCost = linkedParts.reduce((sum, r) => sum + r.price, 0);
      setRepairCost(totalCost);
    } else {
      setRepairCost(newServicePrice);
    }
    
    setIsAddingNewService(false);
    setErrorMsg('');
    setActiveStep(2);
  };

  // Step 1 phone database and registration states matching user screenshot
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [internetSuggestions, setInternetSuggestions] = useState<Array<{ code: string; brand: string; model: string; modelNumber: string; type: string; isInternet?: boolean }>>([]);
  const [isSearchingInternet, setIsSearchingInternet] = useState(false);
  const [isRegisteringNewPhone, setIsRegisteringNewPhone] = useState(false);
  const [newPhoneCode, setNewPhoneCode] = useState('');
  const [customModels, setCustomModels] = useState<Array<{ code: string; brand: string; model: string; type: string }>>([]);

  // Modelos del historial de órdenes + catálogo de equipos (sin hardcoded)
  const DEFAULT_MODELS = React.useMemo(() => {
    const sortedOrders = [...orders].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const fromOrders = sortedOrders
      .filter(o => o.deviceBrand && o.deviceModel)
      .map(o => ({
        code: `ord-${o.id}`,
        brand: o.deviceBrand.trim().toUpperCase(),
        model: o.deviceModel.trim().toUpperCase(),
        modelNumber: o.deviceModelNumber || '',
        type: 'Phone' as const
      }));
    const fromCatalog = (config.customDeviceModels || [])
      .filter((d: any) => !d._excluded && d.brand && d.model)
      .map((d: any) => ({
        code: `cat-${d.brand}-${d.model}`,
        brand: d.brand.trim().toUpperCase(),
        model: d.model.trim().toUpperCase(),
        modelNumber: d.modelNumber || '',
        type: (d.type || 'Phone') as string
      }));
    const fromOffline = DEFAULT_OFFLINE_MODELS.map(m => ({
      code: `off-${m.brand}-${m.model}`,
      brand: m.brand.trim().toUpperCase(),
      model: m.model.trim().toUpperCase(),
      modelNumber: m.modelNumber || '',
      type: (m.type || 'Phone') as string
    }));
    // Merge deduplicando por brand+model
    const seen = new Set<string>();
    return [...fromOrders, ...fromCatalog, ...fromOffline].filter(m => {
      const key = `${m.brand}|${m.model}`;
      if (deletedDeviceModels.includes(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [orders, config.customDeviceModels, deletedDeviceModels]);

  const allModels = React.useMemo(() => {
    return [...DEFAULT_MODELS, ...customModels].filter(m => !deletedDeviceModels.includes(`${m.brand.trim().toUpperCase()}|${m.model.trim().toUpperCase()}`));
  }, [customModels, DEFAULT_MODELS, deletedDeviceModels]);

  const matchedModels = React.useMemo(() => {
    const q = deviceSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return allModels.filter(m => {
      const combined = `${m.brand} ${m.model} ${(m as any).modelNumber || ''} ${(m as any).code || ''}`.toLowerCase();
      return tokens.every(token => {
        if (/^\d+$/.test(token)) {
          const regex = new RegExp(`(?:^|[^0-9])${token}(?:[^0-9]|$)`);
          return regex.test(combined);
        }
        return combined.includes(token);
      });
    });
  }, [deviceSearchQuery, allModels]);

  const exactDeviceMatch = React.useMemo(() => {
    const q = deviceSearchQuery.trim().toLowerCase();
    if (!q) return null;
    return allModels.find(m => 
      m.model.toLowerCase() === q || 
      `${m.brand.toLowerCase()} ${m.model.toLowerCase()}` === q ||
      m.code.toLowerCase() === q ||
      (m.modelNumber && m.modelNumber.toLowerCase() === q)
    );
  }, [deviceSearchQuery, allModels]);

  // Efecto de búsqueda debounced en internet
  React.useEffect(() => {
    const q = deviceSearchQuery.trim();
    setInternetSuggestions([]);
    
    // Solo bloquear búsqueda en internet si hay un modelo local exacto o coincidencia muy cercana para evitar consultas innecesarias
    const hasExactLocalMatch = matchedModels.some(m => {
      const qUpper = q.toUpperCase();
      const brandUpper = m.brand.toUpperCase();
      const modelUpper = m.model.toUpperCase();
      const modelNumUpper = m.modelNumber?.toUpperCase() || '';
      
      if (modelNumUpper === qUpper || modelUpper === qUpper || `${brandUpper} ${modelUpper}` === qUpper) {
        return true;
      }
      
      const cleanRegex = /iphone|ipad|samsung|galaxy|motorola|moto|xiaomi|redmi|huawei|oppo|vivo|realme|oneplus|google|pixel|lg|sony|nintendo|playstation|xbox/gi;
      const qClean = q.replace(cleanRegex, '').replace(/\s+/g, '').toUpperCase();
      const modelClean = m.model.replace(cleanRegex, '').replace(/\s+/g, '').toUpperCase();
      
      return qClean.length >= 3 && modelClean === qClean;
    });

    if (q.length < 3 || hasExactLocalMatch) {
      setIsSearchingInternet(false);
      return;
    }

    setIsSearchingInternet(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const api = (window as any).electronAPI;
        if (api?.lookupDeviceInternet) {
          const results = await api.lookupDeviceInternet(q);
          const mapped = (results || []).map((r: any, idx: number) => {
            let detectedType = r.type || 'Phone';
            if (!r.type || r.type === 'Phone') {
              const modelUpper = r.model.toUpperCase();
              const brandUpper = r.brand.toUpperCase();
              if (brandUpper.includes('NINTENDO') || brandUpper.includes('PLAYSTATION') || modelUpper.includes('SWITCH') || modelUpper.includes('XBOX') || modelUpper.includes('PLAYSTATION') || modelUpper.includes('WII') || modelUpper.includes('3DS') || modelUpper.includes('NES') || modelUpper.includes('SEGA') || modelUpper.includes('CONSOLA')) {
                detectedType = 'CONSOLA';
              } else if (modelUpper.includes('IPAD') || modelUpper.includes('TABLET') || modelUpper.includes('TAB ') || modelUpper.includes('M10') || modelUpper.includes('M8')) {
                detectedType = 'Tablet';
              } else if (modelUpper.includes('WATCH') || modelUpper.includes('BAND') || modelUpper.includes('FITBIT') || modelUpper.includes('GARMIN')) {
                detectedType = 'Watch';
              } else if (modelUpper.includes('LAPTOP') || modelUpper.includes('MACBOOK') || modelUpper.includes('CHROMEBOOK') || modelUpper.includes('THINKPAD') || modelUpper.includes('NOTEBOOK')) {
                detectedType = 'Laptop';
              }
            } else if (detectedType.toLowerCase() === 'consola') {
              detectedType = 'CONSOLA';
            }
            return {
              code: `internet-${idx}-${r.brand}-${r.model}`,
              brand: r.brand,
              model: r.model,
              modelNumber: r.modelNumber,
              type: detectedType,
              isInternet: true
            };
          });
          setInternetSuggestions(mapped);
        }
      } catch (err) {
        console.error('Error buscando dispositivo en internet:', err);
      } finally {
        setIsSearchingInternet(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [deviceSearchQuery, matchedModels.length]);

  const [focusedDeviceIndex, setFocusedDeviceIndex] = useState<number>(-1);

  const deviceHistoryListRef = useRef<HTMLDivElement>(null);
  const deviceSuggestionsListRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (focusedDeviceIndex < 0) return;
    if (deviceSearchQuery.trim() !== '') {
      const el = deviceSuggestionsListRef.current?.children[focusedDeviceIndex + 1] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    } else {
      const el = deviceHistoryListRef.current?.children[focusedDeviceIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedDeviceIndex]);

  const activeDeviceSuggestions = React.useMemo(() => {
    if (deviceSearchQuery.trim() !== '') {
      const cleanInternet = internetSuggestions.filter(sug => {
        const alreadyHasLocal = matchedModels.some(local => 
          local.brand.toUpperCase() === sug.brand.toUpperCase() &&
          local.model.toUpperCase() === sug.model.toUpperCase()
        );
        return !alreadyHasLocal;
      });
      return [...matchedModels, ...cleanInternet];
    } else {
      return DEFAULT_MODELS.slice(0, 8);
    }
  }, [deviceSearchQuery, matchedModels, internetSuggestions, DEFAULT_MODELS]);

  React.useEffect(() => {
    setFocusedDeviceIndex(-1);
  }, [deviceSearchQuery, activeStep]);

  const handleSelectDevice = (item: { code: string; brand: string; model: string; type: string; modelNumber?: string }) => {
    isTypeManuallyChanged.current = false;
    setDeviceBrand(item.brand.toUpperCase());
    setDeviceModel(item.model.toUpperCase());
    setDeviceType(item.type as any);
    setDeviceModelNumber(item.modelNumber || '');
    setDeviceSearchQuery('');
    setIsRegisteringNewPhone(false);
    setDevicePin('SIN CLAVE');
    setPinType('none');
    setPatternNodes([]);
    // No auto-avanzar: el usuario debe capturar el PIN/patrón antes de continuar
  };

  const handleAddNewDevice = () => {
    const query = deviceSearchQuery.trim();
    if (!query) return;

    let brand = 'APPLE';
    let model = query.toUpperCase();
    const queryUpper = query.toUpperCase();

    if (queryUpper.includes('IPHONE') || queryUpper.includes('APPLE') || queryUpper.includes('IPAD') || queryUpper.includes('MACBOOK')) {
      brand = 'APPLE';
      model = queryUpper.replace('APPLE', '').trim() || queryUpper;
    } else if (queryUpper.includes('SAMSUNG') || queryUpper.includes('GALAXY')) {
      brand = 'SAMSUNG';
      model = queryUpper.replace('SAMSUNG', '').trim() || queryUpper;
    } else if (queryUpper.includes('XIAOMI') || queryUpper.includes('REDMI')) {
      brand = 'XIAOMI';
      model = queryUpper.replace('XIAOMI', '').trim() || queryUpper;
    } else if (queryUpper.includes('MOTOROLA') || queryUpper.includes('MOTO')) {
      brand = 'MOTOROLA';
      model = queryUpper.replace('MOTOROLA', '').trim() || queryUpper;
    } else if (queryUpper.includes('HUAWEI')) {
      brand = 'HUAWEI';
      model = queryUpper.replace('HUAWEI', '').trim() || queryUpper;
    } else {
      const parts = queryUpper.split(' ');
      if (parts.length > 1) {
        brand = parts[0];
        model = parts.slice(1).join(' ');
      } else {
        brand = 'GENERICO';
        model = queryUpper;
      }
    }

    // Calculate maximum index code code
    const numericCodes = allModels
      .map(m => parseInt(m.code, 10))
      .filter(n => !isNaN(n));
    const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 20;
    const codeVal = String(maxCode + 1);

    const newModelItem = {
      code: codeVal,
      brand: brand.toUpperCase(),
      model: model.toUpperCase(),
      type: 'Phone' as const
    };

    setCustomModels(prev => [...prev, newModelItem]);
    setDeviceBrand(brand.toUpperCase());
    setDeviceModel(model.toUpperCase());
    setDeviceType('Phone');
    setDeviceSearchQuery('');
    setIsRegisteringNewPhone(false);
    setErrorMsg('');
    setActiveStep(1); // Go to service setup

    console.log(`Nuevo equipo registrado y seleccionado: ${brand} ${model}`);
  };
  
  // Service diagnostics and values
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [faultDescription, setFaultDescription] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [showNotesOnLabel, setShowNotesOnLabel] = useState(false);
  const [hidePriceOnLabel, setHidePriceOnLabel] = useState(config.hidePriceOnLabel ?? false);
  const isPersonalMode = (config.workshopMode ?? 'personal') === 'personal';
  const [assignedTechnician, setAssignedTechnician] = useState(() => {
    // En modo personal se autocompleta con el nombre del usuario actual (o valor por defecto)
    return 'Técnico de Turno';
  });
  // En modo personal, sincronizar con el usuario actual
  React.useEffect(() => {
    if (isPersonalMode && currentUser?.name) {
      setAssignedTechnician(currentUser.name);
    }
  }, [isPersonalMode, currentUser?.name]);
  const [repairCost, setRepairCost] = useState<number | ''>('');
  const [advancePayment, setAdvancePayment] = useState<number | ''>('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['Efectivo']);
  const [methodAmounts, setMethodAmounts] = useState<Record<string, string>>({ Efectivo: '', 'Tarjeta/Transfer': '' });
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [parts, setParts] = useState<{ name: string; cost: number | ''; price?: number; refaccionId?: string; fromStock?: boolean }[]>([]);

  const [partsSearchQuery, setPartsSearchQuery] = useState('');
  const filteredCompatibleRefacciones = React.useMemo(() => {
    if (!partsSearchQuery.trim()) return compatibleRefacciones;
    const query = partsSearchQuery.toLowerCase();
    return compatibleRefacciones.filter(r => 
      r.name.toLowerCase().includes(query) || 
      (r.code && r.code.toLowerCase().includes(query))
    );
  }, [compatibleRefacciones, partsSearchQuery]);

  React.useEffect(() => {
    setPartsSearchQuery('');
  }, [deviceBrand, deviceModel]);

  const [customPartPrices, setCustomPartPrices] = useState<Record<string, number>>({});
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overridePart, setOverridePart] = useState<any>(null);

  const handlePriceOverrideSuccess = (newPrice: number) => {
    if (!overridePart) return;
    const refId = overridePart.id;

    setCustomPartPrices(prev => ({ ...prev, [refId]: newPrice }));

    setParts(currentParts => {
      const isSelected = currentParts.some(p => p.refaccionId === refId);
      if (!isSelected) return currentParts;

      const nextParts = currentParts.map(p => p.refaccionId === refId ? { ...p, price: newPrice } : p);

      const totalCost = nextParts.reduce((sum, p) => sum + (p.price || 0), 0);
      setRepairCost(totalCost || '');

      const serviceNames = nextParts.map(p => {
        const catalogRef = refacciones.find(r => r.id === p.refaccionId);
        const cleanCat = catalogRef ? catalogRef.category.toLowerCase().replace(/s$/, '') : '';
        const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find(s => {
          const sName = s.name.toLowerCase();
          return sName.includes(cleanCat) || sName.includes(p.name.toLowerCase());
        });
        const baseName = matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${p.name.toUpperCase()}`;
        return baseName;
      });
      const joinedName = Array.from(new Set(serviceNames)).join(' Y ');
      setFaultDescription(joinedName);
      setServiceSearchQuery(joinedName);

      return nextParts;
    });
  };

  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(10);

  const finalizeOrderRegistration = () => {
    clearAllFields();
    setExtraEquipos([]);
    if (setActiveTab) {
      setActiveTab('Órdenes');
    }
  };

  const handleCloseChangeModal = () => {
    setChangeAmount(null);
    finalizeOrderRegistration();
  };

  useEffect(() => {
    if (changeAmount === null) {
      setCountdown(10);
      return;
    }
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setChangeAmount(null);
          finalizeOrderRegistration();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [changeAmount]);

  useEffect(() => {
    if (changeAmount === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleCloseChangeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeAmount]);
  const [showParts, setShowParts] = useState(false);

  // ── Equipos adicionales mismo cliente ──────────────────────────────────
  type ExtraEquipo = {
    deviceType: RepairOrder['deviceType'];
    deviceBrand: string;
    deviceModel: string;
    deviceModelNumber: string;
    devicePin: string;
    faultDescription: string;
    serviceType: string;
    cost: number;
    advancePayment: number;
    parts: { name: string; cost: number; price?: number; refaccionId?: string; fromStock?: boolean }[];
    receivedAccessories?: string[];
  };
  const [extraEquipos, setExtraEquipos] = useState<ExtraEquipo[]>([]);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraDraft, setExtraDraft] = useState<ExtraEquipo>({
    deviceType: 'Phone', deviceBrand: '', deviceModel: '', deviceModelNumber: '', devicePin: '',
    faultDescription: '', serviceType: '', cost: 0, advancePayment: 0,
    parts: [],
    receivedAccessories: [],
  });
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const handleTogglePaymentMethod = (method: 'Efectivo' | 'Tarjeta/Transfer') => {
    setSelectedMethods(prev => {
      const nextMethods = prev.includes(method)
        ? (prev.length > 1 ? prev.filter(x => x !== method) : prev)
        : [...prev, method];

      if (nextMethods.length === 1) {
        const singleMethod = nextMethods[0];
        const val = methodAmounts[singleMethod] || String(advancePayment) || '';
        const num = Number(val);
        setAdvancePayment(isNaN(num) || val === '' ? '' : num);
      } else {
        const prevSingleMethod = prev[0];
        const newAmounts = {
          ...methodAmounts,
          [prevSingleMethod]: String(advancePayment)
        };
        setMethodAmounts(newAmounts);
        const total = nextMethods.reduce((sum, key) => sum + (Number(newAmounts[key]) || 0), 0);
        setAdvancePayment(total || '');
      }
      return nextMethods;
    });
  };

  // Prefill from quote conversion
  React.useEffect(() => {
    if (!prefillFromQuote || prefillApplied.current) return;
    prefillApplied.current = true;
    const first = prefillFromQuote.devices[0];
    if (!first) return;
    setCustomerName(prefillFromQuote.customerName);
    setCustomerPhone(prefillFromQuote.customerPhone);
    setCustomerCountryCode(prefillFromQuote.customerCountryCode);

    if (first.deviceBrand === 'CARTA') {
      setDeviceBrand('');
      setDeviceModel('');
      setDeviceModelNumber('');
      setDeviceType('Phone');
      // Set the fault description to a summary of services:
      const servicesSummary = prefillFromQuote.devices.map(d => d.serviceType.toUpperCase()).join(', ');
      setFaultDescription(servicesSummary);
      setRepairCost(prefillFromQuote.devices.reduce((s, d) => s + d.estimatedCost, 0));
      setActiveStep(1); // Go to Step 1 (Device info) so they can enter the device details!
      onPrefillConsumed?.();
    } else {
      setDeviceBrand(first.deviceBrand);
      setDeviceModel(first.deviceModel);
      setDeviceModelNumber(first.deviceModelNumber || '');
      setDeviceType(first.deviceType === 'Desktop' ? 'Other' : first.deviceType);
      // Buscar servicio por nombre — como se auto-guardó al crear la cotización, debería existir
      const foundSvc = services.find(s => s.name.toLowerCase() === first.serviceType.toLowerCase());
      if (foundSvc) {
        setSelectedServiceId(foundSvc.id);
      }
      setRepairCost(first.estimatedCost);
      setFaultDescription(first.faultDescription || '');
      // Extra devices
      if (prefillFromQuote.devices.length > 1) {
        const extras = prefillFromQuote.devices.slice(1).map(d => ({
          deviceType: (d.deviceType === 'Desktop' ? 'Other' : d.deviceType) as 'Phone' | 'Tablet' | 'Laptop' | 'Watch' | 'Other',
          deviceBrand: d.deviceBrand,
          deviceModel: d.deviceModel,
          deviceModelNumber: d.deviceModelNumber || '',
          devicePin: d.devicePin || 'SIN CLAVE',
          faultDescription: d.faultDescription || '',
          serviceType: d.serviceType,
          cost: d.estimatedCost,
          advancePayment: 0,
          parts: [],
        }));
        setExtraEquipos(extras);
      }
      setActiveStep(3); // Directo al resumen
      onPrefillConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillFromQuote]);

  // Prefill desde el catálogo de refacciones
  React.useEffect(() => {
    if (!prefillFromRefaccion || prefillRefaccionApplied.current) return;
    prefillRefaccionApplied.current = true;

    // Rellenar información del equipo
    setDeviceBrand(prefillFromRefaccion.deviceBrand.toUpperCase());
    setDeviceModel(prefillFromRefaccion.deviceModel.toUpperCase());
    setDeviceType('Phone'); // Tipo de equipo por defecto

    // Vincular la refacción física, precio y costo
    setRepairCost(prefillFromRefaccion.price);
    setParts([{ 
      name: prefillFromRefaccion.name, 
      cost: prefillFromRefaccion.cost,
      refaccionId: prefillFromRefaccion.id,
      fromStock: prefillFromRefaccion.stock > 0
    }]);

    // Auto-seleccionar servicio correspondiente si existe en el catálogo
    const cleanCat = prefillFromRefaccion.category.toLowerCase().replace(/s$/, ''); // pantallas -> pantalla
    const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find(s => {
      const sName = s.name.toLowerCase();
      return sName.includes(cleanCat) || sName.includes(prefillFromRefaccion.name.toLowerCase());
    });

    if (matchedSvc) {
      setSelectedServiceId(matchedSvc.id);
      setFaultDescription(matchedSvc.name.toUpperCase());
      setServiceSearchQuery(matchedSvc.name.toUpperCase());
    } else {
      setFaultDescription(`REEMPLAZO DE ${prefillFromRefaccion.name.toUpperCase()}`);
      setServiceSearchQuery(`REEMPLAZO DE ${prefillFromRefaccion.name.toUpperCase()}`);
    }

    // Mantenerse en el Paso 0 para que completen no. modelo, contraseña y accesorios
    setActiveStep(0);
    if (onPrefillRefaccionConsumed) {
      onPrefillRefaccionConsumed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillFromRefaccion]);

  // Focus and dropdown states
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showModelNumberSuggestions, setShowModelNumberSuggestions] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [brandSuggestionIndex, setBrandSuggestionIndex] = useState(-1);
  const [modelSuggestionIndex, setModelSuggestionIndex] = useState(-1);
  const [modelNumberSuggestionIndex, setModelNumberSuggestionIndex] = useState(-1);

  // Printing selections
  const [printTicket, setPrintTicket] = useState(true);
  const [printLabel, setPrintLabel] = useState(true);
  const [sendWhatsappTicket, setSendWhatsappTicket] = useState(false);

  const togglePrintTicket = () => {
    setPrintTicket(prev => {
      const nextVal = !prev;
      if (nextVal) {
        setSendWhatsappTicket(false);
      }
      return nextVal;
    });
  };

  const toggleSendWhatsapp = () => {
    setSendWhatsappTicket(prev => {
      const nextVal = !prev;
      if (nextVal) {
        setPrintTicket(false);
        setPrintLabel(true);
      } else {
        setPrintTicket(true);
      }
      return nextVal;
    });
  };

  const [accessoriesRemoved, setAccessoriesRemoved] = useState(true);
  const [passwordLeft, setPasswordLeft] = useState(true);

  // Client suggestions
  const [matchedClients, setMatchedClients] = useState<Client[]>([]);
  const [detectedClient, setDetectedClient] = useState<Client | null>(null);
  const [clientPrevOrders, setClientPrevOrders] = useState<RepairOrder[]>([]);

  // Unique brand history list for autocompletion — only from real orders + custom catalog + offline default models
  const historyBrands = React.useMemo(() => {
    const fromOrders = orders.map(o => o.deviceBrand).filter(Boolean).map(b => {
      const clean = b.trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    });
    const fromCustom = (config.customDeviceModels || []).map(d => d.brand);
    const fromOffline = DEFAULT_OFFLINE_MODELS.map(m => m.brand);
    return Array.from(new Set([...fromOrders, ...fromCustom, ...fromOffline]));
  }, [orders, config.customDeviceModels]);

  const historyModelNumbers = React.useMemo(() => {
    const fromOrders = orders.map(o => o.deviceModelNumber).filter(Boolean);
    const fromOffline = DEFAULT_OFFLINE_MODELS.map(m => m.modelNumber).filter(Boolean);
    return Array.from(new Set([...fromOrders, ...fromOffline]));
  }, [orders]);

  const historyModels = React.useMemo(() => {
    const fromOrders = orders.map(o => o.deviceModel).filter(Boolean);
    const fromCustom = (config.customDeviceModels || []).map(d => d.model);
    const fromOffline = DEFAULT_OFFLINE_MODELS.map(m => m.model);
    return Array.from(new Set([...fromOrders, ...fromCustom, ...fromOffline]));
  }, [orders, config.customDeviceModels]);

  // Filtered autocomplete lists for main new device stepper
  const filteredModelNumberSuggestions = React.useMemo(() => {
    const q = deviceModelNumber.trim().toUpperCase();
    if (!q) return [];
    return historyModelNumbers.filter(num => num.toUpperCase().includes(q));
  }, [deviceModelNumber, historyModelNumbers]);

  const filteredBrandSuggestions = React.useMemo(() => {
    const q = deviceBrand.trim().toUpperCase();
    if (!q) return [];
    return historyBrands.filter(b => b.toUpperCase().includes(q));
  }, [deviceBrand, historyBrands]);

  const filteredModelSuggestions = React.useMemo(() => {
    const q = deviceModel.trim().toUpperCase();
    if (!q) return [];
    const currentBrand = deviceBrand.trim().toUpperCase();
    const filtered = allModels.filter(m => {
      const matchesQuery = m.model.toUpperCase().includes(q);
      if (!matchesQuery) return false;
      if (currentBrand) {
        return m.brand.toUpperCase() === currentBrand;
      }
      return true;
    });
    return Array.from(new Set(filtered.map(m => m.model.toUpperCase())));
  }, [deviceModel, deviceBrand, allModels]);

  React.useEffect(() => { setModelNumberSuggestionIndex(-1); }, [deviceModelNumber]);
  React.useEffect(() => { setBrandSuggestionIndex(-1); }, [deviceBrand]);
  React.useEffect(() => { setModelSuggestionIndex(-1); }, [deviceModel]);

  const handleSelectStepperModelNumber = (num: string) => {
    setDeviceModelNumber(num);
    setShowModelNumberSuggestions(false);
    const matchingOrder = orders.find(o => o.deviceModelNumber?.toUpperCase() === num.toUpperCase());
    let brand = matchingOrder?.deviceBrand?.toUpperCase();
    let model = matchingOrder?.deviceModel?.toUpperCase();
    if (!brand || !model) {
      const matchingOffline = DEFAULT_OFFLINE_MODELS.find(m => m.modelNumber?.toUpperCase() === num.toUpperCase());
      if (matchingOffline) {
        brand = matchingOffline.brand.toUpperCase();
        model = matchingOffline.model.toUpperCase();
      }
    }
    if (brand) setDeviceBrand(brand);
    if (model) setDeviceModel(model);
    setTimeout(() => {
      document.getElementById('new-phone-brand')?.focus();
      (document.getElementById('new-phone-brand') as HTMLInputElement)?.select();
    }, 50);
  };

  const handleSelectStepperBrand = (brandName: string) => {
    setDeviceBrand(brandName.toUpperCase());
    setShowBrandSuggestions(false);
    setTimeout(() => {
      document.getElementById('new-phone-model')?.focus();
      (document.getElementById('new-phone-model') as HTMLInputElement)?.select();
    }, 50);
  };

  const handleSelectStepperModel = (modelName: string) => {
    setDeviceModel(modelName.toUpperCase());
    setShowModelSuggestions(false);
    if (!deviceBrand.trim()) {
      const found = allModels.find(m => m.model.toUpperCase() === modelName);
      if (found) {
        setDeviceBrand(found.brand.toUpperCase());
      }
    }
    setTimeout(() => {
      const next = pinType === 'none' ? 'new-phone-type' : 'new-phone-pin';
      const el = document.getElementById(next) as HTMLInputElement | null;
      el?.focus();
      el?.select?.();
    }, 50);
  };

  const stepperModelNumberListRef = useRef<HTMLDivElement>(null);
  const stepperBrandListRef = useRef<HTMLDivElement>(null);
  const stepperModelListRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = stepperModelNumberListRef.current?.children[modelNumberSuggestionIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [modelNumberSuggestionIndex]);

  React.useEffect(() => {
    const el = stepperBrandListRef.current?.children[brandSuggestionIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [brandSuggestionIndex]);

  React.useEffect(() => {
    const el = stepperModelListRef.current?.children[modelSuggestionIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [modelSuggestionIndex]);

  // Pre-load preselected service from PreciosView if stored in localStorage
  React.useEffect(() => {
    const preselectedId = localStorage.getItem('fixmanager_preselected_service_id');
    if (preselectedId) {
      const foundSvc = services.find(s => s.id === preselectedId);
      if (foundSvc) {
        setSelectedServiceId(foundSvc.id);
        setFaultDescription(foundSvc.name);
        setServiceSearchQuery(foundSvc.name);
        setRepairCost(foundSvc.price);
        setErrorMsg('');
        // We can also advance to step 1 (Servicio) so that they can see it selected or fill the client info
        setActiveStep(1); 
        console.log(`Pre-seleccionado servicio del catálogo: ${foundSvc.name} - $${foundSvc.price}`);
      }
      localStorage.removeItem('fixmanager_preselected_service_id');
    }
  }, [services, activeStep]);

  // Handle matching client searches by name/phone
  React.useEffect(() => {
    if (!clients || clients.length === 0) return;
    const queryPhone = customerPhone.replace(/\D/g, '');
    const queryName = customerName.trim();

    if (queryPhone.length < 3 && queryName.length < 3) {
      setMatchedClients([]);
      return;
    }

    const matches = clients.filter(c => {
      const phoneMatch = queryPhone.length >= 3 && c.phone.replace(/\D/g, '').includes(queryPhone);
      const nameMatch = queryName.length >= 3 && c.name.toLowerCase().includes(queryName.toLowerCase());
      return phoneMatch || nameMatch;
    });

    setMatchedClients(matches.slice(0, 5));
  }, [customerPhone, customerName, clients]);

  // Auto-load client and his previous orders if an exact match is entered
  React.useEffect(() => {
    if (!clients || clients.length === 0) return;
    const cleanQuery = customerPhone.replace(/\D/g, '');
    const exactClient = clients.find(
      c => c.phone.replace(/\D/g, '') === cleanQuery && cleanQuery.length >= 7
    );
    // When registering a new client, don't override detectedClient — use phoneConflictClient instead
    if (isRegisteringNewClient) return;
    if (exactClient) {
      setDetectedClient(exactClient);
      if (orders) {
        const prev = orders.filter(
          o => o.customerPhone.replace(/\D/g, '') === exactClient.phone.replace(/\D/g, '') ||
               o.customerName.toLowerCase() === exactClient.name.toLowerCase()
        );
        setClientPrevOrders(prev);
      }
    } else {
      setDetectedClient(null);
      setClientPrevOrders([]);
    }
  }, [customerPhone, clients, orders, isRegisteringNewClient]);

  // When registering a new client, detect if the phone matches an existing one (non-intrusive warning only)
  const phoneConflictClient = React.useMemo(() => {
    if (!isRegisteringNewClient || !clients || changeAmount !== null) return null;
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) return null;
    return clients.find(c => c.phone.replace(/\D/g, '') === cleanPhone) || null;
  }, [isRegisteringNewClient, customerPhone, clients, changeAmount]);

  // Reset conflict focus index whenever the conflict modal appears
  React.useEffect(() => {
    if (phoneConflictClient && isRegisteringNewClient) setConflictFocusedIdx(0);
  }, [!!phoneConflictClient, isRegisteringNewClient]);

  // Mantener ref sincronizado en cada render para evitar closures obsoletos en handlers
  historialDeviceStepRef.current = activeStep === 0 && !isRegisteringNewPhone && !!deviceModel;

  // Navegación con flechas y Enter en step 0 con equipo del historial seleccionado
  React.useEffect(() => {
    const PIN_OPTS = ['none', 'pin', 'pattern'] as const;
    const handler = (e: KeyboardEvent) => {
      if (!historialDeviceStepRef.current) return;
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isTyping) return;
        e.preventDefault();
        setPinType(prev => {
          const idx = PIN_OPTS.indexOf(prev);
          const next = PIN_OPTS[e.key === 'ArrowLeft' ? (idx - 1 + PIN_OPTS.length) % PIN_OPTS.length : (idx + 1) % PIN_OPTS.length];
          if (next !== 'pattern') setPatternNodes([]);
          setDevicePin(next === 'none' ? 'SIN CLAVE' : '');
          return next;
        });
      } else if (e.key === 'Enter' && !isTyping) {
        e.preventDefault();
        handleNextStepRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Enter en nuevo equipo con "Sin clave" → guardar y continuar
  React.useEffect(() => {
    if (!isRegisteringNewPhone || pinType !== 'none') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.key === 'Enter' && !isTyping) { e.preventDefault(); handleSaveNewPhone(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRegisteringNewPhone, pinType]);

  // Keyboard Enter handler to register order upon confirmation Dialog
  React.useEffect(() => {
    if (!showConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmRegister();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    showConfirmModal,
    customerName,
    customerPhone,
    customerCountryCode,
    deviceType,
    deviceBrand,
    deviceModel,
    deviceModelNumber,
    devicePin,
    proposedSolution,
    faultDescription,
    selectedServiceId,
    services,
    repairCost,
    advancePayment,
    assignedTechnician,
    printTicket,
    printLabel
  ]);



  const handleSelectClient = (client: Client) => {
    setCustomerName(client.name.toUpperCase());
    setCustomerPhone(formatPhoneNumber(client.phone));
    if (client.countryCode) {
      setCustomerCountryCode(client.countryCode);
    } else {
      setCustomerCountryCode('+52');
    }
    setDetectedClient(client);
    setMatchedClients([]);
    setShowClientSuggestions(false);
    setClientSearchQuery('');
    setFocusedClientIndex(-1);
    setIsRegisteringNewClient(false);

    if (orders) {
      const prev = orders.filter(
        o => o.customerPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '') || o.customerName.toLowerCase() === client.name.toLowerCase()
      );
      setClientPrevOrders(prev);
    }
    setActiveStep(3); // Auto-advance to Step 4
  };

  const handleRegisterNewClient = () => {
    const q = clientSearchQuery.trim();
    setIsRegisteringNewClient(true);
    setDetectedClient(null);
    setClientPrevOrders([]);
    
    // Attempt intelligent pre-filling
    if (q) {
      const cleanPhone = q.replace(/\D/g, '');
      if (cleanPhone.length >= 5) {
        setCustomerPhone(formatPhoneNumber(cleanPhone));
        setCustomerName('');
      } else {
        setCustomerName(q.toUpperCase());
        setCustomerPhone('');
      }
    } else {
      setCustomerPhone('');
      setCustomerName('');
    }
    setClientSearchQuery('');
    setFocusedClientIndex(-1);
  };

  // Get dynamic tailwind theme classes based on the configured app branding color
  const getDynamicColors = () => {
    const primary = config.primaryColor || 'red';
    switch (primary) {
      case 'blue':
        return {
          mainBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          badge: 'bg-cyan-500 text-black',
          buttonClass: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]',
          focusBorder: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30',
          labelBadge: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
          textAccent: 'text-cyan-400',
        };
      case 'green':
        return {
          mainBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          badge: 'bg-emerald-500 text-black',
          buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]',
          focusBorder: 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
          labelBadge: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
          textAccent: 'text-emerald-400',
        };
      case 'yellow':
        return {
          mainBg: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
          badge: 'bg-amber-500 text-black',
          buttonClass: 'bg-amber-500 hover:bg-amber-600 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]',
          focusBorder: 'focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30',
          labelBadge: 'text-amber-500 border-amber-500/20 bg-amber-950/20',
          textAccent: 'text-amber-500',
        };
      case 'indigo':
        return {
          mainBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
          badge: 'bg-indigo-500 text-white',
          buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]',
          focusBorder: 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
          labelBadge: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20',
          textAccent: 'text-indigo-400',
        };
      default: // red / default
        return {
          mainBg: 'bg-red-500/10 border-red-500/30 text-red-500',
          badge: 'bg-red-600 text-white',
          buttonClass: 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]',
          focusBorder: 'focus:border-red-600 focus:ring-1 focus:ring-red-600/30',
          labelBadge: 'text-red-500 border-red-500/20 bg-red-950/20',
          textAccent: 'text-red-500',
        };
    }
  };

  const themeColors = getDynamicColors();
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const getSuggestionDropdownClasses = () => {
    if (isRetro) {
      return 'bg-[#eaeef3] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] text-black shadow-md';
    }
    if (isLight) {
      return 'bg-white border border-zinc-300 text-zinc-900 shadow-lg';
    }
    return 'bg-[#161822]/95 backdrop-blur-md border border-zinc-800 text-zinc-100 shadow-2xl';
  };

  const getSuggestionHeaderClasses = () => {
    if (isRetro) {
      return 'text-[9.5px] uppercase font-mono font-bold text-[#000080] border-b border-zinc-300 px-2 py-1';
    }
    if (isLight) {
      return 'text-[9.5px] uppercase font-extrabold text-zinc-500 border-b border-zinc-100 px-2 py-1';
    }
    return 'text-[9.5px] uppercase font-mono font-bold text-amber-500 border-b border-[#2d2f36] px-2 py-1';
  };

  const getSuggestionItemClasses = (isSelected: boolean) => {
    if (isRetro) {
      return isSelected 
        ? 'bg-[#000080] text-white border-[#000080] font-bold'
        : 'hover:bg-zinc-200 text-black';
    }
    if (isLight) {
      return isSelected
        ? 'bg-blue-50 text-blue-950 border-l-4 border-blue-600 font-extrabold'
        : 'hover:bg-zinc-100/80 text-zinc-800 border-l-4 border-transparent';
    }
    return isSelected
      ? 'bg-amber-500/10 text-amber-500 border-l-4 border-amber-500 font-extrabold'
      : 'hover:bg-zinc-700/50 text-zinc-300 border-l-4 border-transparent';
  };

  const getBadgeClasses = (isSelected: boolean) => {
    if (isRetro) {
      return isSelected ? 'bg-white text-[#000080] font-mono' : 'bg-zinc-300 text-zinc-800 font-mono';
    }
    if (isLight) {
      return isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700';
    }
    return isSelected ? 'bg-amber-500 text-zinc-950 font-black' : 'bg-zinc-700 text-zinc-400';
  };

  const getStaticItemClasses = (isSelected: boolean) => {
    if (isRetro) {
      return isSelected
        ? 'bg-[#000080] border-l-4 border-yellow-400 text-white font-black'
        : 'bg-zinc-200 border border-[#808080] hover:bg-zinc-300 text-black';
    }
    if (isLight) {
      return isSelected
        ? 'bg-blue-50 border-blue-600 border-l-4 text-blue-950 font-extrabold shadow-sm'
        : 'bg-zinc-100 border border-zinc-200 hover:bg-zinc-200/60 text-zinc-800';
    }
    return isSelected
      ? 'bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 text-amber-400 font-bold'
      : 'bg-[#1c1f2e] border border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-300';
  };

  const getSubtextClasses = () => {
    if (isRetro) return 'text-zinc-600';
    if (isLight) return 'text-zinc-500';
    return 'text-zinc-500';
  };

  // Clear fields helper
  const clearAllFields = () => {
    isTypeManuallyChanged.current = false;
    setIsEquipmentCollapsed(true);
    setDeviceType('Phone');
    setDeviceBrand('Apple');
    setDeviceModelNumber('');
    setDeviceModel('');
    setDevicePin('');
    setPinType('none');
    setPatternNodes([]);
    setSelectedAccessories([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCountryCode('+52');
    setDeviceSearchQuery('');
    setServiceSearchQuery('');
    setClientSearchQuery('');
    setFocusedClientIndex(-1);
    setIsRegisteringNewClient(false);
    setIsRegisteringNewPhone(false);
    setNewPhoneCode('');
    if (services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
    setRepairCost('');
    setFaultDescription('');
    setProposedSolution('');
    setShowNotesOnLabel(false);
    setAdvancePayment('');
    setCashReceived('');
    setSelectedMethods(['Efectivo']);
    setMethodAmounts({ Efectivo: '', 'Tarjeta/Transfer': '' });
    setEstimatedDelivery(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setErrorMsg('');
    setActiveStep(0);
    setParts([]);
    setCustomPartPrices({});
  };

  // Demo auto-fill tool to easily showcase visual integrations
  const fillQuickDemo = () => {
    const clientsList = [
      { name: 'Laura Rodríguez Luna', phone: '(557) 766-8899' },
      { name: 'Hugo García Peralta', phone: '(552) 123-4567' },
      { name: 'Ana Martínez Silva', phone: '(553) 987-6543' },
      { name: 'Sofía Castro Ortiz', phone: '(554) 333-2211' },
      { name: 'Carlos Mendoza Ruiz', phone: '(555) 444-5566' }
    ];

    const devicesList = [
      { type: 'Phone' as const, brand: 'Apple', model: 'iPhone 15 Pro Max', modelNumber: 'A3106', pin: '0812*' },
      { type: 'Phone' as const, brand: 'Samsung', model: 'Galaxy S24 Ultra', modelNumber: 'SM-S928B', pin: '1902' },
      { type: 'Tablet' as const, brand: 'Apple', model: 'iPad Pro 11"', modelNumber: 'A2759', pin: 'sin clave' },
      { type: 'Laptop' as const, brand: 'Apple', model: 'MacBook Air M3', modelNumber: 'A3113', pin: '1423' }
    ];

    const faultsList = [
      { fault: 'Cristal exterior estrellado, requiere cambio de pantalla completo.', solution: 'Instalación de ensamble de pantalla original y pruebas TrueTone.' },
      { fault: 'No detecta carga ni conexión USB, el puerto tiene polvo y juego físico.', solution: 'Limpieza con ultrasonido y microsoldadura del puerto USB de carga.' },
      { fault: 'Batería inflada y degradada al 73% de vida útil.', solution: 'Cambio de batería de alta densidad con protector térmico.' }
    ];

    const client = clientsList[Math.floor(Math.random() * clientsList.length)];
    const device = devicesList[Math.floor(Math.random() * devicesList.length)];
    const fault = faultsList[Math.floor(Math.random() * faultsList.length)];

    setCustomerName(client.name.toUpperCase());
    setCustomerPhone(client.phone);
    setDeviceType(device.type);
    setDeviceBrand(device.brand.toUpperCase());
    setDeviceModel(device.model.toUpperCase());
    setDeviceModelNumber(device.modelNumber.toUpperCase());
    setDevicePin(device.pin);
    setFaultDescription(fault.fault.toUpperCase());
    setProposedSolution('');
    setDeviceSearchQuery(device.model.toUpperCase());
    setIsRegisteringNewPhone(false);

    if (services.length > 0) {
      const idx = Math.floor(Math.random() * services.length);
      setSelectedServiceId(services[idx].id);
    }
    setRepairCost('');
    setAdvancePayment('');
    setErrorMsg('');
    // Auto-advance directly to step 4 for convenient overview
    setActiveStep(3);
  };

  // Step-level Validation (Redesigned sequence matching user images)
  const isStepValid = (stepIndex: number): boolean => {
    if (stepIndex === 0) { // Step 1: Equipo
      return !!deviceBrand.trim() && !!deviceModel.trim();
    }
    if (stepIndex === 1) { // Step 2: Falla / Servicio
      return !!faultDescription.trim();
    }
    if (stepIndex === 2) { // Step 3: Cliente
      return !!customerName.trim() && customerPhone.replace(/\D/g, '').length === 10;
    }
    return true;
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (activeStep === 3) { handleSubmit(); return; }
    if (isStepValid(activeStep)) {
      if (activeStep === 0) {
        if (deviceType) {
          const t = deviceType.toUpperCase().trim();
          const standardTypes = ['PHONE', 'CELULAR', 'TABLET', 'WATCH', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA'];
          if (t && !standardTypes.includes(t)) {
            saveCustomType(t);
          }
        }
      }
      const hasRefaccion = parts.some(p => p.refaccionId);
      if (activeStep === 0 && hasRefaccion) {
        setActiveStep(2);
      } else {
        setActiveStep(prev => Math.min(prev + 1, 3));
      }
    } else {
      if (activeStep === 0) {
        setErrorMsg('Debe buscar o registrar la marca y modelo del equipo antes de avanzar.');
      } else if (activeStep === 1) {
        setErrorMsg('Debe detallar el síntoma o solución planeada para continuar.');
      } else if (activeStep === 2) {
        const phoneDigits = customerPhone.replace(/\D/g, '').length;
        if (!customerName.trim()) {
          setErrorMsg('El nombre del cliente es requerido para continuar.');
        } else if (phoneDigits === 0) {
          setErrorMsg('El número de teléfono es requerido para continuar.');
        } else {
          setErrorMsg(`El número de teléfono debe tener exactamente 10 dígitos (faltan ${10 - phoneDigits}).`);
        }
      }
    }
  };
  handleNextStepRef.current = handleNextStep;

  const handleBackStep = () => {
    setErrorMsg('');
    const hasRefaccion = parts.some(p => p.refaccionId);
    if (activeStep === 2 && hasRefaccion) {
      setActiveStep(0);
    } else {
      setActiveStep(prev => Math.max(prev - 1, 0));
    }
  };

  const handleStepIndicatorClick = (target: number) => {
    setErrorMsg('');
    // Ensure all steps prior to target are valid
    for (let i = 0; i < target; i++) {
      if (!isStepValid(i)) {
        if (i === 0) setErrorMsg('Marca o modelo del Equipo faltante o no seleccionado.');
        else if (i === 1) setErrorMsg('Síntoma o diagnóstico del equipo incompleto.');
        else if (i === 2) setErrorMsg('Información de contacto del Cliente incompleta.');
        return;
      }
    }
    setActiveStep(target);
  };

  // Submit complete order request
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // Double check everything
    if (!deviceBrand.trim() || !deviceModel.trim()) {
      setActiveStep(0);
      setErrorMsg('Debe especificar la Marca y el Modelo del equipo para el recibo.');
      return;
    }
    if (!faultDescription.trim()) {
      setActiveStep(1);
      setErrorMsg('Describa detalladamente el síntoma o falla reportada.');
      return;
    }
    if (!customerName.trim() || customerPhone.replace(/\D/g, '').length !== 10) {
      setActiveStep(2);
      if (!customerName.trim()) {
        setErrorMsg('El nombre del propietario es requerido.');
      } else {
        setErrorMsg(`El teléfono debe tener exactamente 10 dígitos (actualmente: ${customerPhone.replace(/\D/g,'').length}).`);
      }
      return;
    }
    const totalGlobalCost = (Number(repairCost) || 0) + extraEquipos.reduce((s, eq) => s + eq.cost, 0);
    if (Number(advancePayment) > totalGlobalCost) {
      setErrorMsg('El valor abonado como anticipo no puede ser superior al costo total.');
      return;
    }

    // Open verification feedback notification/modal
    setShowConfirmModal(true);
  };

  const handleConfirmRegister = () => {
    setShowConfirmModal(false);
    const mainOrderId = generateNextOrderId(orders || []);
    const linkedRefs = refacciones.filter(r => parts.some(p => p.refaccionId === r.id));
    const serviceName = linkedRefs.length > 1
      ? linkedRefs.map(r => {
          const cleanCat = r.category.toLowerCase().replace(/s$/, '');
          const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find(s => {
            const sName = s.name.toLowerCase();
            return sName.includes(cleanCat) || sName.includes(r.name.toLowerCase());
          });
          return matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${r.name.toUpperCase()}`;
        }).join(' Y ')
      : linkedRefs.length === 1
        ? (faultDescription || linkedRefs[0].name)
        : (services.find(s => s.id === selectedServiceId)?.name || faultDescription || 'Servicio General');
    
    // Clean and compile combined diagnostic details with newline after Solución propuesta:
    const cleanSol = proposedSolution.trim();
    let fullDiagnostics = 'Diagnóstico de ingreso inicial registrado.';
    if (cleanSol) {
      if (cleanSol.toLowerCase().startsWith('solución propuesta:') || cleanSol.toLowerCase().startsWith('solucion propuesta:')) {
        const rest = cleanSol.replace(/^soluci[oó]n propuesta:\s*/i, '').trim();
        fullDiagnostics = `Solución propuesta:\n${rest}`;
      } else if (cleanSol.toLowerCase().startsWith('solución propuesta') || cleanSol.toLowerCase().startsWith('solucion propuesta')) {
        const rest = cleanSol.replace(/^soluci[oó]n propuesta\s*/i, '').trim();
        fullDiagnostics = `Solución propuesta:\n${rest}`;
      } else {
        fullDiagnostics = `Solución propuesta:\n${cleanSol}`;
      }
    }

    let fullFault = faultDescription.trim();
    const extraInfo = [];
    if (deviceModelNumber.trim()) extraInfo.push(`No. Modelo: ${deviceModelNumber.trim()}`);
    if (extraInfo.length > 0) {
      fullFault = `[${extraInfo.join(' | ')}] ${fullFault}`;
    }

    const finalParts = parts.filter(p => p.name.trim()).map(p => ({ 
      name: p.name.trim(), 
      cost: Number(p.cost) || 0,
      price: Number(p.price) || 0,
      refaccionId: p.refaccionId,
      fromStock: p.fromStock
    }));

    const sym = config.currencySymbol || '$';
    
    // Distribución del total fijo del equipo principal
    const mainCost = Number(repairCost) || 0;
    let mainServiceType = serviceName.toUpperCase();

    if (finalParts.length === 1 && mainCost > 0) {
      finalParts[0].price = mainCost;
    } else if (finalParts.length > 1 && mainCost > 0) {
      const sumPrices = finalParts.reduce((s, p) => s + (p.price || 0), 0);
      if (sumPrices > 0 && sumPrices !== mainCost) {
        const ratio = mainCost / sumPrices;
        let runningSum = 0;
        finalParts.forEach((p, idx) => {
          if (idx === finalParts.length - 1) {
            p.price = Math.max(0, Math.round((mainCost - runningSum) * 100) / 100);
          } else {
            const scaled = Math.round((p.price || 0) * ratio * 100) / 100;
            p.price = scaled;
            runningSum += scaled;
          }
        });
      }
      mainServiceType = finalParts.map(p => `${p.name} - ${sym}${p.price!.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n');
    }

    const matchedService = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
    const serviceCost = matchedService ? (matchedService.cost || 0) : 0;

    const finalOrder: RepairOrder = {
      id: mainOrderId,
      customerName: customerName.trim().toUpperCase(),
      customerPhone: customerPhone.trim(),
      customerCountryCode: customerCountryCode,
      deviceType: deviceType as RepairOrder['deviceType'],
      deviceBrand: deviceBrand.toUpperCase(),
      deviceModel: deviceModel.trim().toUpperCase(),
      deviceModelNumber: deviceModelNumber.trim().toUpperCase(),
      devicePin: devicePin.trim(),
      receivedAccessories: selectedAccessories.length > 0 ? selectedAccessories : undefined,
      faultDescription: fullFault.toUpperCase(),
      diagnosticsNote: fullDiagnostics,
      assignedTechnician: assignedTechnician.toUpperCase(),
      status: 'Pendiente',
      serviceType: mainServiceType,
      serviceCost: serviceCost,
      cost: mainCost,
      advancePayment: Number(advancePayment) || 0,
      advancePaymentBreakdown: Number(advancePayment) > 0
        ? selectedMethods.length === 1
          ? [{ method: selectedMethods[0], amount: Number(advancePayment) || 0 }]
          : selectedMethods.map(m => ({ method: m, amount: Number(methodAmounts[m]) || 0 })).filter(x => x.amount > 0)
        : undefined,
      createdAt: new Date().toISOString(),
      estimatedDeliveryDate: new Date(estimatedDelivery).toISOString(),
      isPaid: Number(advancePayment) >= ((Number(repairCost) || 0) + extraEquipos.reduce((s, eq) => s + eq.cost, 0)),
      parts: finalParts,
      showNotesOnLabel: showNotesOnLabel,
      hidePriceOnLabel: hidePriceOnLabel,
    };

    // Generar batchId si hay equipos extra
    const batchId = extraEquipos.length > 0 ? `BATCH-${Date.now()}` : undefined;
    const batchAdvancePayment = extraEquipos.length > 0 ? (Number(advancePayment) || 0) : undefined;

    // Reconstruir finalOrder con batchId si aplica
    if (batchId) {
      (finalOrder as any).batchId = batchId;
      (finalOrder as any).batchAdvancePayment = batchAdvancePayment;
      (finalOrder as any).advancePayment = 0;
      (finalOrder as any).batchPosition = 1;
      (finalOrder as any).batchTotal = 1 + extraEquipos.length;
    }

    // Generar órdenes para equipos adicionales del mismo cliente
    const accumulatedOrders: RepairOrder[] = [finalOrder];
    const extraOrders: RepairOrder[] = extraEquipos.map(eq => {
      const eqOrderId = generateNextOrderId([...(orders || []), ...accumulatedOrders]);
      const eqParts = eq.parts.map(p => ({
        name: p.name.trim(),
        cost: Number(p.cost) || 0,
        price: Number(p.price) || 0,
        refaccionId: p.refaccionId,
        fromStock: p.fromStock
      }));
      
      const eqCost = Number(eq.cost) || 0;
      let eqServiceType = eq.serviceType.toUpperCase();

      if (eqParts.length === 1 && eqCost > 0) {
        eqParts[0].price = eqCost;
      } else if (eqParts.length > 1 && eqCost > 0) {
        const sumPrices = eqParts.reduce((s, p) => s + (p.price || 0), 0);
        if (sumPrices > 0 && sumPrices !== eqCost) {
          const ratio = eqCost / sumPrices;
          let runningSum = 0;
          eqParts.forEach((p, idx) => {
            if (idx === eqParts.length - 1) {
              p.price = Math.max(0, Math.round((eqCost - runningSum) * 100) / 100);
            } else {
              const scaled = Math.round((p.price || 0) * ratio * 100) / 100;
              p.price = scaled;
              runningSum += scaled;
            }
          });
        }
        eqServiceType = eqParts.map(p => `${p.name} - ${sym}${p.price!.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n');
      }

      const matchedExtraSvc = services.find(s => s.name.toLowerCase() === eq.serviceType.toLowerCase());
      const extraSvcCost = matchedExtraSvc ? (matchedExtraSvc.cost || 0) : 0;

      const createdExtra: RepairOrder = {
        id: eqOrderId,
        customerName: customerName.trim().toUpperCase(),
        customerPhone: customerPhone.trim(),
        customerCountryCode,
        deviceType: eq.deviceType,
        deviceBrand: eq.deviceBrand.toUpperCase(),
        deviceModel: eq.deviceModel.toUpperCase(),
        deviceModelNumber: eq.deviceModelNumber.toUpperCase(),
        devicePin: eq.devicePin,
        receivedAccessories: eq.receivedAccessories && eq.receivedAccessories.length > 0 ? eq.receivedAccessories : undefined,
        faultDescription: eq.faultDescription.toUpperCase(),
        diagnosticsNote: 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.',
        assignedTechnician: assignedTechnician.toUpperCase(),
        status: 'Pendiente' as const,
        serviceType: eqServiceType,
        serviceCost: extraSvcCost,
        cost: eq.cost,
        advancePayment: 0,
        batchId,
        batchAdvancePayment,
        createdAt: new Date().toISOString(),
        estimatedDeliveryDate: new Date(estimatedDelivery).toISOString(),
        isPaid: false,
        parts: eqParts,
        showNotesOnLabel: showNotesOnLabel,
      };
    });

    if (batchId) {
      const batchTotal = 1 + extraEquipos.length;
      extraOrders.forEach((o, i) => {
        (o as any).batchId = batchId;
        (o as any).batchAdvancePayment = batchAdvancePayment;
        (o as any).batchPosition = i + 2;
        (o as any).batchTotal = batchTotal;
      });
    }

    const allOrders = [finalOrder, ...extraOrders];

    // Descontar stock de todas las refacciones vinculadas en la orden principal y secundarias
    if (onSetRefacciones && refacciones.length > 0) {
      let updated = [...refacciones];
      let changed = false;
      
      // Descontar de la orden principal
      parts.forEach(p => {
        if (p.refaccionId && p.fromStock) {
          updated = updated.map(r => {
            if (r.id === p.refaccionId && r.stock > 0) {
              changed = true;
              return { ...r, stock: r.stock - 1 };
            }
            return r;
          });
        }
      });

      // Descontar de las órdenes secundarias (extraEquipos)
      extraEquipos.forEach(eq => {
        eq.parts?.forEach(p => {
          if (p.refaccionId && p.fromStock) {
            updated = updated.map(r => {
              if (r.id === p.refaccionId && r.stock > 0) {
                changed = true;
                return { ...r, stock: r.stock - 1 };
              }
              return r;
            });
          }
        });
      });

      if (changed) {
        onSetRefacciones(updated);
      }
    }

    if (extraOrders.length > 0) {
      // Registrar todas las órdenes sin imprimir tickets individuales ni Telegram individual
      const batchTotal = allOrders.length;
      onCreateOrder(finalOrder, { printTicket: false, printLabel: config.hybridPrintMode ? false : printLabel, suppressTelegram: true, batchPosition: 1, batchTotal, sendWhatsapp: sendWhatsappTicket });
      extraOrders.forEach((o, i) => onCreateOrder(o, { printTicket: false, printLabel: config.hybridPrintMode ? false : printLabel, suppressTelegram: true, batchPosition: i + 2, batchTotal, sendWhatsapp: sendWhatsappTicket }));
      // Telegram consolidado
      if (onBatchCreated) onBatchCreated(allOrders);

      // El ticket de recepción grupal se imprime desde App.tsx vía onBatchCreated
    } else {
      // Una sola orden — flujo normal
      onCreateOrder(finalOrder, { printTicket, printLabel: config.hybridPrintMode ? false : printLabel, sendWhatsapp: sendWhatsappTicket });
    }

    const cashAdvanceAmount = selectedMethods.includes('Efectivo')
      ? (selectedMethods.length === 1 ? (Number(advancePayment) || 0) : (Number(methodAmounts['Efectivo']) || 0))
      : 0;
    const change = (selectedMethods.includes('Efectivo') && Number(cashReceived) > cashAdvanceAmount)
      ? Number(cashReceived) - cashAdvanceAmount
      : 0;

    if (change > 0) {
      setChangeAmount(change);
    } else {
      finalizeOrderRegistration();
    }
  };

  // Helper parser for a newly detected/unknown device model
  const startNewPhoneRegistration = (query: string) => {
    let brand = 'APPLE';
    let model = query.toUpperCase();
    const queryUpper = query.toUpperCase();

    if (queryUpper.includes('IPHONE') || queryUpper.includes('APPLE') || queryUpper.includes('IPAD') || queryUpper.includes('MACBOOK')) {
      brand = 'APPLE';
      model = queryUpper.replace('APPLE', '').trim();
    } else if (queryUpper.includes('SAMSUNG') || queryUpper.includes('GALAXY')) {
      brand = 'SAMSUNG';
      model = queryUpper.replace('SAMSUNG', '').trim();
    } else if (queryUpper.includes('XIAOMI') || queryUpper.includes('REDMI')) {
      brand = 'XIAOMI';
      model = queryUpper.replace('XIAOMI', '').trim();
    } else if (queryUpper.includes('MOTOROLA') || queryUpper.includes('MOTO')) {
      brand = 'MOTOROLA';
      model = queryUpper.replace('MOTOROLA', '').trim();
    } else if (queryUpper.includes('HUAWEI')) {
      brand = 'HUAWEI';
      model = queryUpper.replace('HUAWEI', '').trim();
    } else {
      const parts = queryUpper.split(' ');
      if (parts.length > 1) {
        brand = parts[0];
        model = parts.slice(1).join(' ');
      } else {
        brand = '';
        model = queryUpper;
      }
    }

    setDeviceBrand(brand);
    setDeviceModel(model);
    setDeviceType('Phone');

    // Calculate next sequence numeric code (Max + 1)
    const numericCodes = allModels
      .map(m => parseInt(m.code, 10))
      .filter(n => !isNaN(n));
    const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 20;
    setNewPhoneCode(String(maxCode + 1));

    setIsRegisteringNewPhone(true);
    setDeviceSearchQuery('');
  };

  // Saving the newly registered phone details (screenshot-matching flow)
  const handleSaveNewPhone = () => {
    const brandVal = deviceBrand.trim().toUpperCase();
    const modelVal = deviceModel.trim().toUpperCase();
    const codeVal = newPhoneCode.trim() || '21';

    if (!brandVal || !modelVal) {
      setErrorMsg('Debe rellenar la marca y modelo para guardar el teléfono.');
      return;
    }

    const newModelItem = {
      code: codeVal,
      brand: brandVal,
      model: modelVal,
      type: deviceType
    };

    setCustomModels(prev => {
      if (prev.some(m => m.code === codeVal)) {
        return prev.map(m => m.code === codeVal ? newModelItem : m);
      }
      return [...prev, newModelItem];
    });

    if (deviceType) {
      const t = deviceType.toUpperCase().trim();
      const standardTypes = ['PHONE', 'CELULAR', 'TABLET', 'WATCH', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA'];
      if (t && !standardTypes.includes(t)) {
        saveCustomType(t);
      }
    }

    setDeviceBrand(brandVal);
    setDeviceModel(modelVal);
    setIsRegisteringNewPhone(false);
    setDeviceSearchQuery('');
    setErrorMsg('');
    setActiveStep(1); // Auto-advance to the next step
  };

  // Canceling the manual phone entry and going back to search
  const handleCancelNewPhone = () => {
    isTypeManuallyChanged.current = false;
    setIsRegisteringNewPhone(false);
    setDeviceBrand('Apple');
    setDeviceModel('');
    setDeviceModelNumber('');
    setDeviceSearchQuery('');
    setErrorMsg('');
  };

  const remainingBalance = Math.max(0, Number(repairCost) - Number(advancePayment));

  // Stepper Header definitions (Dynamically named and ordered matching the images)
  const steps = [
    { 
      title: deviceModel ? `${deviceBrand.toUpperCase()} ${deviceModel.toUpperCase()}` : 'Modelo de teléfono', 
      desc: 'Búsqueda o alta de equipo' 
    },
    { title: 'Definir el servicio a realizar', desc: 'Sintomatología y falla' },
    { title: 'Elegir o agregar cliente', desc: 'Registro o búsqueda de contacto' },
    { title: 'Revisar y guardar', desc: 'Presupuesto e impresión' },
  ];

  if (currentUser && !currentUser.permissions.canManageOrders) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500 p-8">
        <span className="text-5xl">🔒</span>
        <p className="text-lg font-bold">Sin acceso</p>
        <p className="text-sm text-center">Tu usuario no tiene permiso para crear órdenes de servicio.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#070709] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black text-zinc-200 p-4 md:p-6 relative overflow-y-auto flex flex-col items-center justify-start" id="nueva-view-root">
      
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

      {/* Primary Decorative Header */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900 mb-6 relative z-10 gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${themeColors.mainBg} border`}>
            <FilePlus className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-widest font-mono ${isRetro ? 'text-zinc-950' : 'text-white'}`}>
              Nueva Recepción de Equipo
            </h1>
            <p className={`text-[10px] ${isRetro ? 'text-zinc-700 font-extrabold' : 'text-zinc-500 font-bold'} tracking-tight uppercase`}>
              Asistente de registro secuencial en 4 etapas
            </p>
          </div>
        </div>

      </div>

      {/* MONOLITHIC SIMULATED DESKTOP WINDOW CONTAINER */}
      <div className="w-full max-w-2xl text-zinc-950 animate-fade-in flex justify-center relative z-10 pb-16 mx-auto" id="simulated-desktop-container">
        <div className={`w-full ${isRetro ? 'bg-[#eaeef3] border-zinc-300' : 'bg-[#0f121d]/95 backdrop-blur-md border-zinc-800/80 text-zinc-100'} rounded-2xl border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden font-sans select-none my-1`}>
          
          {/* Header bar: Recepcion de equipos */}
          <div className={`${isRetro ? 'bg-gradient-to-r from-[#031124] to-[#0d2a4a] border-zinc-300' : 'bg-gradient-to-r from-[#111827] via-[#1e293b] to-[#0f172a] border-zinc-800'} text-white px-5 py-4 flex items-center justify-between border-b shadow-md relative`}>
            <div className="flex items-center gap-3">
              {/* Inside container resembles the colored cube in the screenshot */}
              <div className="w-9 h-9 relative flex items-center justify-center bg-gradient-to-b from-red-500 via-blue-500 to-amber-500 rounded-md shadow-md border border-white/20">
                <div className="absolute w-5 h-5 bg-gradient-to-tr from-yellow-400 to-orange-500 rotate-12 shadow animate-pulse-slow" />
                <Smartphone className="w-[18px] h-[18px] relative text-white drop-shadow" />
              </div>
              <h2 className={`text-base font-black uppercase tracking-widest ${isRetro ? 'retro-white-text' : 'text-[#ffffff]'} font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
                RECEPCIÓN DE EQUIPOS
              </h2>
            </div>
            
            {/* Highly visible customer/client indicator dynamically styled for perfect contrast */}
            <div className="flex items-center gap-3">
              {(customerName || customerPhone) ? (
                <div className="text-right select-none font-sans bg-black/60 px-3.5 py-1.5 rounded-lg border border-white/20 shadow-md header-customer-box">
                  <div className={`text-[9.5px] font-black ${isRetro ? 'retro-emerald-text' : 'text-emerald-450'} tracking-widest uppercase mb-0.5`}>
                    👤 Cliente Registrado
                  </div>
                  {customerName && (
                    <div className={`text-[12px] font-black ${isRetro ? 'retro-white-text' : 'text-white'} uppercase tracking-wide leading-tight`}>
                      {customerName}
                    </div>
                  )}
                  {customerPhone && (
                    <div className={`text-[10px] ${isRetro ? 'retro-slate-300-text' : 'text-zinc-300'} font-extrabold font-mono leading-none mt-1`}>
                      📞 {customerPhone}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-right select-none font-sans bg-black/50 px-3.5 py-1.5 rounded-lg border border-white/15 shadow-inner animate-pulse-slow header-customer-box">
                  <div className={`text-[9.5px] font-black ${isRetro ? 'retro-amber-text' : 'text-amber-500'} tracking-widest uppercase mb-0.5`}>
                    👤 Cliente
                  </div>
                  <div className={`text-[11px] font-black ${isRetro ? 'retro-slate-300-text' : 'text-zinc-300'} tracking-wide leading-tight uppercase`}>
                    Sin Asignar
                  </div>
                </div>
              )}
              <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white flex items-center justify-center shadow-lg shrink-0">
                <span className="text-amber-950 font-extrabold text-sm">🧔</span>
              </div>
            </div>
          </div>

          {/* Integrated Wizard horizontal stepper */}
          <div className={`py-3.5 px-5 ${isRetro ? 'bg-[#e1e6ed] border-zinc-200 text-[#556980]' : 'bg-[#151926]/90 border-zinc-900 text-zinc-400'} border-b flex overflow-x-auto items-center justify-between text-[11px] font-bold gap-4 pb-3.5 scrollbar-thin`}>
            <div className="flex items-center flex-wrap gap-4 md:gap-2">
            {[
              { idx: 0, label: deviceModel ? `${deviceBrand.toUpperCase()} ${deviceModel.toUpperCase()}` : 'Modelo de teléfono' },
              { idx: 1, label: 'Definir el servicio' },
              { idx: 2, label: 'Elegir cliente' },
              { idx: 3, label: 'Revisar' }
            ].map((s) => {
              const isCurrent = activeStep === s.idx;
              const isPassed = activeStep > s.idx;
              return (
                <button
                  key={s.idx}
                  type="button"
                  onClick={() => handleStepIndicatorClick(s.idx)}
                  className={`flex items-center gap-2 cursor-pointer transition-all shrink-0 ${isCurrent ? 'opacity-100' : 'opacity-60'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                    isCurrent 
                      ? (isRetro ? 'bg-[#113a7c] text-white' : 'bg-amber-500 text-black font-black') 
                      : isPassed 
                        ? 'bg-emerald-600 text-white font-sans' 
                        : (isRetro ? 'bg-zinc-400 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700')
                  }`}>
                    {s.idx + 1}
                  </div>
                  <span className={`uppercase font-sans font-black tracking-wide text-[10px] ${
                    isCurrent 
                      ? (isRetro ? 'text-[#113a7c]' : 'text-amber-400') 
                      : (isRetro ? 'text-[#556980]' : 'text-zinc-400')
                  }`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
            </div>
            {/* X — Cerrar con confirmación si hay progreso */}
            <button
              type="button"
              onClick={() => { if (activeStep > 0 || customerName || deviceModel) { setShowExitConfirm(true); } else { clearAllFields(); } }}
              title="Cerrar formulario"
              className={`shrink-0 ml-2 w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer select-none ${
                isRetro
                  ? 'bg-zinc-200 hover:bg-red-100 text-zinc-500 hover:text-red-700 border border-zinc-300'
                  : 'bg-zinc-800/60 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 border border-zinc-700'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inline Integrated Error Message if any */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-sm flex items-center gap-2 font-sans font-bold shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-650 shrink-0 animate-bounce" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Content Area with Animation helper */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep + (isRegisteringNewPhone ? '-registering' : '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-[540px] flex flex-col overflow-y-auto scrollbar-thin"
            >
              {/* STAGE 1 */}
              {activeStep === 0 && (
                <>
                  {!isRegisteringNewPhone && !deviceModel ? (
                    <div className="p-6 md:p-8 space-y-4 text-center">
                      <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">
                        BUSCAR EQUIPO EN HISTORIAL
                      </h3>

                      <div className="space-y-3 max-w-sm mx-auto">
                        <div className="space-y-1 text-left">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                            MODELO DEL DISPOSITIVO:
                          </label>
                          <div className="premium-search-container w-full select-none flex items-center">
                            <div className="flex items-center text-zinc-400 shrink-0">
                              <Search className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0"></div>
                            <div className="relative flex-1 flex items-center h-full">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Ej. Galaxy S24, iPhone 15 Pro, Moto G84..."
                                value={deviceSearchQuery}
                                onChange={(e) => handleCaretPreservingChange(e, setDeviceSearchQuery, val => val.toUpperCase())}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    if (activeDeviceSuggestions.length > 0) {
                                      setFocusedDeviceIndex((prev) => (prev + 1) % activeDeviceSuggestions.length);
                                    }
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    if (activeDeviceSuggestions.length > 0) {
                                      setFocusedDeviceIndex((prev) => (prev - 1 + activeDeviceSuggestions.length) % activeDeviceSuggestions.length);
                                    }
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (focusedDeviceIndex >= 0 && focusedDeviceIndex < activeDeviceSuggestions.length) {
                                      handleSelectDevice(activeDeviceSuggestions[focusedDeviceIndex]);
                                    } else {
                                      const query = deviceSearchQuery.trim();
                                      if (!query) return;
                                      if (exactDeviceMatch) {
                                        handleSelectDevice(exactDeviceMatch);
                                      } else {
                                        startNewPhoneRegistration(query);
                                      }
                                    }
                                  }
                                }}
                                className="premium-search-input uppercase text-zinc-100"
                              />
                              {deviceSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setDeviceSearchQuery('')}
                                  className="absolute right-2 text-zinc-400 hover:text-white font-black z-10 cursor-pointer text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-[#8fa0b0] font-medium mt-1 select-none">
                            💡 Escribe el modelo y presiona <strong>ENTER</strong> para registrar uno nuevo si no está en el historial.
                          </p>
                        </div>

                        {deviceSearchQuery.trim() !== '' && (
                          <div ref={deviceSuggestionsListRef} className={`${getSuggestionDropdownClasses()} rounded-sm p-2 text-left max-h-52 overflow-y-auto space-y-1 divide-y divide-zinc-700/30 shadow-lg animate-fade-in relative z-50`}>
                            <div className={`${getSuggestionHeaderClasses()} tracking-wider px-2 py-1.5 select-none`}>
                              📂 Coincidencias en base de datos/internet (Usa ↕ para desplazar):
                            </div>
                            {activeDeviceSuggestions.length > 0 ? (
                              <>
                                {activeDeviceSuggestions.map((item, idx) => {
                                  const isInternet = (item as any).isInternet;
                                  const isFocused = idx === focusedDeviceIndex;
                                  
                                  // Seleccionar la clase para el badge y texto
                                  let badgeCls = getBadgeClasses(isFocused);
                                  let badgeText = isFocused ? 'Seleccionar ➙' : 'Autocompletar ➙';
                                  
                                  if (isInternet) {
                                    badgeText = isFocused ? 'Seleccionar 🌐' : 'Internet 🌐';
                                    badgeCls = isFocused
                                      ? 'bg-blue-600 text-white font-black shadow-md animate-pulse'
                                      : 'bg-blue-950/60 text-blue-300 border border-blue-800/80';
                                  }

                                  return (
                                    <div key={idx}
                                      className={`rounded-sm flex items-center hover:bg-zinc-50 border ${getSuggestionItemClasses(isFocused)}`}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectDevice(item)}
                                        className="flex-1 text-left px-3 py-2.5 cursor-pointer flex items-center justify-between text-xs font-bold bg-transparent border-0 focus:outline-none"
                                      >
                                        <span>
                                          {item.brand} <span className="opacity-80 font-semibold">{item.model}</span>
                                          {item.modelNumber && (
                                            <span className="ml-2 text-[10px] text-zinc-400 font-mono font-normal">
                                              ({item.modelNumber})
                                            </span>
                                          )}
                                        </span>
                                        <span className={`text-[9px] uppercase font-mono px-2.5 py-0.5 rounded shrink-0 ${badgeCls}`}>
                                          {badgeText}
                                        </span>
                                      </button>
                                      {!isInternet && (
                                        <button type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deleteDeviceModelFromHistory(item.brand, item.model);
                                          }}
                                          className="text-red-500 hover:text-red-700 p-2.5 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                                          title="Eliminar del historial"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                {isSearchingInternet && (
                                  <div className="p-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 select-none border-t border-zinc-700/20">
                                    <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                                    <span>Buscando en internet...</span>
                                  </div>
                                )}
                              </>
                            ) : isSearchingInternet ? (
                              <div className="p-5 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2 select-none">
                                <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                                <span className="font-bold">Buscando en internet...</span>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-zinc-400 text-[11px] font-bold leading-relaxed">
                                No se encontraron resultados específicos para "{deviceSearchQuery}".
                                <div className="mt-2 text-[10px]">
                                  Presiona <kbd className="bg-white text-zinc-700 font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-300 shadow-sm" style={{boxShadow:'0 1px 0 rgba(0,0,0,0.2)'}}>ENTER</kbd> para crearlo automáticamente y avanzar.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
 
                        {deviceSearchQuery.trim() === '' && (
                          <div className="space-y-1.5 pt-1 text-left">
                            <span className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-0.5">
                              ⚡ Equipos del historial:
                            </span>
                            <span className="block text-[9px] text-[#8fa0b0] font-medium mb-1.5">
                              Del historial de órdenes y catálogo de <strong>Equipos</strong>
                            </span>
                            {DEFAULT_MODELS.length === 0 ? (
                              <div className="text-center py-4 text-[10px] text-[#8fa0b0]">
                                Aún no hay equipos registrados. Los modelos aparecerán aquí conforme crees órdenes o los agregues en <strong>Historial de Equipos</strong>.
                              </div>
                            ) : (
                              <div ref={deviceHistoryListRef} className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                                {DEFAULT_MODELS.slice(0, 8).map((m, idx) => (
                                  <div key={idx}
                                    className={`text-xs font-bold rounded-sm flex items-center font-sans border hover:bg-zinc-50 ${getStaticItemClasses(idx === focusedDeviceIndex)}`}>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectDevice(m)}
                                      className="flex-1 p-2.5 text-left cursor-pointer flex justify-between items-center bg-transparent border-0 focus:outline-none"
                                    >
                                      <span className="font-extrabold uppercase">
                                        {m.brand} {m.model}
                                      </span>
                                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded shrink-0 ${getBadgeClasses(idx === focusedDeviceIndex)}`}>
                                        {idx === focusedDeviceIndex ? 'Seleccionar ➙' : 'Historial ➙'}
                                      </span>
                                    </button>
                                    <button type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        deleteDeviceModelFromHistory(m.brand, m.model);
                                      }}
                                      className="text-red-500 hover:text-red-700 p-2.5 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                                      title="Eliminar del historial"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}


                      </div>
                    </div>
                  ) : !isRegisteringNewPhone ? (
                    <div className="p-6 md:p-8 space-y-6 text-center animate-fade-in animate-fade-in">
                      <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest mb-1.5 font-sans">
                        EQUIPO SELECCIONADO
                      </h3>
                      
                      {compatibleRefacciones.length > 0 && isEquipmentCollapsed ? (
                        <div className="max-w-sm mx-auto p-3.5 bg-[#cbd6e2]/25 border border-[#b2c0cc] rounded-lg flex items-center justify-between text-xs transition-all animate-fade-in">
                          <div className="flex items-center gap-2.5 text-left">
                            <span className="text-xl">📱</span>
                            <div>
                              <p className="font-extrabold text-[#113a7c] uppercase">
                                {deviceBrand} {deviceModel}
                              </p>
                              <p className="text-[9.5px] font-semibold text-[#60738c] uppercase mt-0.5">
                                {deviceModelNumber ? `No. Modelo: ${deviceModelNumber}` : 'Sin No. Modelo'} • {
                                  deviceType === 'Phone' ? 'CELULAR' :
                                  deviceType === 'Tablet' ? 'TABLET' :
                                  deviceType === 'Watch' ? 'RELOJ/SMARTWATCH' :
                                  deviceType === 'Laptop' ? 'LAPTOP' :
                                  deviceType === 'Consola' ? 'CONSOLA' :
                                  (deviceType || '').toUpperCase()
                                }
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEquipmentCollapsed(false)}
                            className="text-[#003c94] hover:text-[#022a68] font-bold text-[9.5px] uppercase border border-[#b2c0cc] hover:border-[#003c94] px-2.5 py-1 rounded bg-white shadow-sm transition-all cursor-pointer"
                          >
                            Modificar
                          </button>
                        </div>
                      ) : (
                        <div className="max-w-sm mx-auto p-5 bg-[#cbd6e2]/40 border border-[#b2c0cc] rounded-sm space-y-4 relative">
                          {compatibleRefacciones.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsEquipmentCollapsed(true)}
                              className="absolute top-2 right-2 text-[#60738c] hover:text-zinc-800 text-[8px] font-black uppercase font-mono border border-dashed border-[#b2c0cc] px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Minimizar ⌃
                            </button>
                          )}
                          {/* MARCA */}
                          <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                            <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">MARCA:</span>
                            <div className="col-span-2">
                              <input
                                type="text"
                                className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                                value={deviceBrand || ''}
                                onChange={e => handleCaretPreservingChange(e, setDeviceBrand, val => val.toUpperCase())}
                              />
                            </div>
                          </div>

                          {/* MODELO */}
                          <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                            <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">MODELO:</span>
                            <div className="col-span-2">
                              <input
                                type="text"
                                className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                                value={deviceModel || ''}
                                onChange={e => handleCaretPreservingChange(e, setDeviceModel, val => val.toUpperCase())}
                              />
                            </div>
                          </div>

                          {/* NO. MODELO */}
                          <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-300/60 items-center">
                            <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">NO. MODELO:</span>
                            <div className="col-span-2">
                              <input
                                type="text"
                                className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm px-2 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                                placeholder="SIN NÚMERO"
                                value={deviceModelNumber || ''}
                                onChange={e => handleCaretPreservingChange(e, setDeviceModelNumber, val => val.toUpperCase())}
                              />
                            </div>
                          </div>

                          {/* TIPO */}
                          <div className="font-mono text-xs text-left grid grid-cols-3 gap-2 py-1.5 items-center">
                            <span className="text-[9px] text-[#60738c] font-black uppercase tracking-widest col-span-1">TIPO:</span>
                            <div className="col-span-2 relative">
                              {(() => {
                                const typeInputValue = deviceType === 'Phone' ? 'CELULAR' :
                                                      deviceType === 'Tablet' ? 'TABLET' :
                                                      deviceType === 'Watch' ? 'RELOJ/SMARTWATCH' :
                                                      deviceType === 'Laptop' ? 'LAPTOP' :
                                                      deviceType === 'Consola' ? 'CONSOLA' :
                                                      (deviceType || '').toUpperCase();
                                const typeOptions = ['CELULAR', 'TABLET', 'RELOJ/SMARTWATCH', 'LAPTOP', 'CONSOLA', ...(customDeviceTypes || []).map(t => t.toUpperCase())];
                                const isExactOption = typeOptions.includes(typeInputValue);
                                const filteredOptions = typeOptions.filter(opt => {
                                  if (isExactOption || !typeInputValue) return true;
                                  return opt.includes(typeInputValue.toUpperCase().trim());
                                });

                                const handleSelectOption = (val: string) => {
                                  let mapped = val;
                                  if (val === 'CELULAR' || val === 'PHONE') mapped = 'Phone';
                                  else if (val === 'TABLET') mapped = 'Tablet';
                                  else if (val === 'RELOJ' || val === 'SMARTWATCH' || val === 'RELOJ/SMARTWATCH' || val === 'WATCH') mapped = 'Watch';
                                  else if (val === 'LAPTOP') mapped = 'Laptop';
                                  else if (val === 'CONSOLA') mapped = 'Consola';
                                  
                                  isTypeManuallyChanged.current = true;
                                  setDeviceType(mapped);
                                  setShowMainTypeDropdown(false);
                                };

                                return (
                                  <>
                                    <div className="relative w-full">
                                      <input
                                        type="text"
                                        className="bg-white text-xs font-black text-[#113a7c] border border-[#b2c0cc] rounded-sm pl-2 pr-6 py-1 w-full uppercase focus:outline-none focus:border-blue-600 shadow-sm"
                                        value={typeInputValue}
                                        onFocus={() => setShowMainTypeDropdown(true)}
                                        onBlur={() => {
                                          setTimeout(() => setShowMainTypeDropdown(false), 200);
                                        }}
                                        onChange={e => {
                                          const val = e.target.value.toUpperCase().trim();
                                          let mapped = val;
                                          if (val === 'CELULAR' || val === 'PHONE') mapped = 'Phone';
                                          else if (val === 'TABLET') mapped = 'Tablet';
                                          else if (val === 'RELOJ' || val === 'SMARTWATCH' || val === 'RELOJ/SMARTWATCH' || val === 'WATCH') mapped = 'Watch';
                                          else if (val === 'LAPTOP') mapped = 'Laptop';
                                          else if (val === 'CONSOLA') mapped = 'Consola';
                                          
                                          isTypeManuallyChanged.current = true;
                                          setDeviceType(mapped);
                                        }}
                                      />
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#113a7c] pointer-events-none">
                                        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                      </div>
                                    </div>
                                    {showMainTypeDropdown && filteredOptions.length > 0 && (
                                      <div className="absolute z-[9999] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[#b2c0cc] rounded-md shadow-xl divide-y divide-zinc-100">
                                        {filteredOptions.map((opt) => {
                                          return (
                                            <div
                                              key={opt}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectOption(opt);
                                              }}
                                              className="px-3 py-1.5 text-xs font-black text-[#113a7c] uppercase hover:bg-blue-50 cursor-pointer select-none text-left flex justify-between items-center group"
                                            >
                                              <span>{opt}</span>
                                              <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                }}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  deleteDeviceType(opt);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                                                title="Eliminar tipo"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Acceso al dispositivo — siempre visible aunque el equipo venga del historial */}
                      <div className="space-y-2 text-left max-w-sm mx-auto">
                        <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                          Acceso al Dispositivo
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['none', 'pin', 'pattern'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { setPinType(t); if (t !== 'pattern') setPatternNodes([]); setDevicePin(t === 'none' ? 'SIN CLAVE' : ''); }}
                              className={`py-1.5 rounded-sm text-[9.5px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                                pinType === t
                                  ? 'bg-[#003c94] text-white border-[#00255a]'
                                  : 'bg-white text-[#60738c] border-[#b2c0cc] hover:border-[#003c94] hover:text-[#003c94]'
                              }`}
                            >
                              {t === 'none' ? 'Sin clave' : t === 'pin' ? '🔢 PIN' : '🔷 Patrón'}
                            </button>
                          ))}
                        </div>
                        {pinType === 'pin' && (
                          <input
                            type="text"
                            placeholder="Ingresa el PIN..."
                            className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                            value={devicePin}
                            onChange={(e) => setDevicePin(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleNextStep(); }
                              else if (e.key === 'ArrowLeft') { e.preventDefault(); setPinType('none'); setDevicePin('SIN CLAVE'); setPatternNodes([]); }
                              else if (e.key === 'ArrowRight') { e.preventDefault(); setPinType('pattern'); setDevicePin(''); setPatternNodes([]); }
                            }}
                            autoFocus
                          />
                        )}
                        {pinType === 'pattern' && (() => {
                          const nodePos = (i: number) => ({ x: (i % 3) * 50 + 25, y: (Math.floor(i / 3)) * 50 + 25 });
                          return (
                            <div className="flex flex-col items-center gap-2">
                              <svg width="150" height="150" className="bg-zinc-900 rounded-lg cursor-pointer select-none"
                                onClick={(e) => {
                                  const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                                  const x = ((e.clientX - rect.left) / rect.width) * 150;
                                  const y = ((e.clientY - rect.top) / rect.height) * 150;
                                  let closest = 0; let minD = Infinity;
                                  for (let i = 0; i < 9; i++) { const p = nodePos(i); const d = Math.hypot(p.x - x, p.y - y); if (d < minD) { minD = d; closest = i; } }
                                  if (minD < 25) setPatternNodes(prev => prev.includes(closest) ? prev : [...prev, closest]);
                                }}>
                                {patternNodes.slice(1).map((n, i) => {
                                  const a = nodePos(patternNodes[i]); const b = nodePos(n);
                                  return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b82f6" strokeWidth="2" />;
                                })}
                                {Array.from({ length: 9 }, (_, i) => {
                                  const { x, y } = nodePos(i);
                                  const order = patternNodes.indexOf(i);
                                  return <circle key={i} cx={x} cy={y} r="10" fill={order >= 0 ? '#3b82f6' : '#4b5563'} stroke={order >= 0 ? '#93c5fd' : '#6b7280'} strokeWidth="1.5" />;
                                })}
                              </svg>
                              <span className="text-[10px] text-zinc-400">
                                {patternNodes.length === 0 ? 'Toca los puntos para dibujar' : `${patternNodes.length} punto${patternNodes.length > 1 ? 's' : ''} — ${patternNodes.join('-')}`}
                              </span>
                              {patternNodes.length > 0 && (
                                <button type="button" onClick={() => setPatternNodes([])} className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer">Borrar patrón</button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Accesorios Recibidos */}
                        <div className="mt-3 relative" ref={accessoriesPopoverRef}>
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                            Accesorios Recibidos
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAccessoriesPopover(!showAccessoriesPopover)}
                            className={`w-full py-1.5 px-3 rounded-sm text-xs font-bold uppercase border transition-all cursor-pointer flex items-center justify-between ${
                              selectedAccessories.length > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isRetro
                                  ? 'bg-white text-zinc-700 border-[#b2c0cc] hover:border-zinc-400'
                                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-650'
                            }`}
                          >
                            <span>
                              {selectedAccessories.length > 0
                                ? `Accesorios (${selectedAccessories.length})`
                                : 'Registrar Accesorios'}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                              {selectedAccessories.length > 0 ? selectedAccessories.join(', ') : 'Ninguno'}
                            </span>
                          </button>

                          {showAccessoriesPopover && (
                            <div className={`absolute z-[100] left-0 right-0 mt-1.5 p-3.5 border rounded shadow-xl max-h-60 overflow-y-auto ${
                              isRetro
                                ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                                : 'bg-[#151926]/95 backdrop-blur-md border-zinc-700 text-zinc-150'
                            }`}>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {ACCESSORY_OPTIONS.map((opt) => {
                                  const checked = selectedAccessories.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer py-1">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setSelectedAccessories(prev =>
                                            checked ? prev.filter(x => x !== opt) : [...prev, opt]
                                          );
                                        }}
                                        className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                                      />
                                      <span className="font-semibold uppercase tracking-wide text-[10px]">
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="border-t border-zinc-750/30 mt-3 pt-2.5">
                                <input
                                  type="text"
                                  placeholder="Otro accesorio..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim().toUpperCase();
                                      if (val && !selectedAccessories.includes(val)) {
                                        setSelectedAccessories(prev => [...prev, val]);
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                  className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border uppercase ${
                                    isRetro
                                      ? 'bg-white border-zinc-400 text-zinc-800'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                  }`}
                                />
                                <p className="text-[9px] text-zinc-500 mt-1">Presiona ENTER para agregar uno personalizado</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {compatibleRefacciones.length > 0 && (
                          <div className={`mt-3 rounded-lg border select-none overflow-hidden ${
                            isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800/70 bg-zinc-950/20'
                          }`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between px-3 py-2 border-b ${
                              isLight ? 'border-zinc-150 bg-zinc-50' : 'border-zinc-800/50 bg-zinc-900/40'
                            }`}>
                              <span className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                                isLight ? 'text-zinc-500' : 'text-zinc-400'
                              }`}>
                                <span>⚙️</span>
                                <span>Piezas de inventario compatibles</span>
                              </span>
                              <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                isLight ? 'bg-zinc-150 text-zinc-400' : 'bg-zinc-800 text-zinc-500'
                              }`}>
                                {compatibleRefacciones.filter(r => parts.some(p => p.refaccionId === r.id)).length}/{compatibleRefacciones.length}
                              </span>
                            </div>
                            {/* Search Bar */}
                            <div className={`px-2 py-1.5 border-b ${isLight ? 'bg-zinc-50/50 border-zinc-100' : 'bg-zinc-900/20 border-zinc-800/40'}`}>
                              <input
                                type="text"
                                placeholder="Buscar refacción compatible..."
                                value={partsSearchQuery}
                                onChange={(e) => setPartsSearchQuery(e.target.value)}
                                className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border ${
                                  isRetro
                                    ? 'bg-white border-zinc-400 text-zinc-800'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                }`}
                              />
                            </div>
                            {/* Checkbox rows */}
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40 max-h-48 overflow-y-auto">
                              {filteredCompatibleRefacciones.length === 0 ? (
                                <div className="p-4 text-center text-xs opacity-50">
                                  No se encontraron refacciones
                                </div>
                              ) : (
                                filteredCompatibleRefacciones.map((ref, idx) => {
                                  const displayPrice = customPartPrices[ref.id] !== undefined ? customPartPrices[ref.id] : ref.price;
                                  const isSelected = parts.some(p => p.refaccionId === ref.id);

                                  const handleToggle = () => {
                                    let nextParts: typeof parts;
                                    if (isSelected) {
                                      nextParts = parts.filter(p => p.refaccionId !== ref.id);
                                    } else {
                                      nextParts = [...parts, {
                                        name: ref.name,
                                        cost: ref.cost,
                                        price: displayPrice,
                                        refaccionId: ref.id,
                                        fromStock: ref.stock > 0
                                      }];
                                    }
                                    setParts(nextParts);
                                    setErrorMsg('');

                                    const totalCost = nextParts.reduce((sum, p) => sum + (p.price || 0), 0);
                                    setRepairCost(totalCost || '');

                                    if (nextParts.length === 0) {
                                      setFaultDescription('');
                                      setServiceSearchQuery('');
                                    } else {
                                      const serviceNames = nextParts.map(p => {
                                        const catalogRef = refacciones.find(r => r.id === p.refaccionId);
                                        const cleanCat = catalogRef ? catalogRef.category.toLowerCase().replace(/s$/, '') : '';
                                        const matchedSvc = (services.length > 0 ? services : INITIAL_SERVICES).find(s => {
                                          const sName = s.name.toLowerCase();
                                          return sName.includes(cleanCat) || sName.includes(p.name.toLowerCase());
                                        });
                                        const baseName = matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${p.name.toUpperCase()}`;
                                        return baseName;
                                      });
                                      const joinedName = Array.from(new Set(serviceNames)).join(' Y ');
                                      setFaultDescription(joinedName);
                                      setServiceSearchQuery(joinedName);
                                    }
                                  };

                                  return (
                                    <label
                                      key={ref.id}
                                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-xs ${
                                        isSelected
                                          ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-950/25')
                                          : (isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/30')
                                      }`}
                                    >
                                      {/* Custom checkbox */}
                                      <span className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                                        isSelected
                                          ? (isRetro ? 'bg-emerald-700 border-emerald-700' : 'bg-emerald-500 border-emerald-500')
                                          : (isLight ? 'border-zinc-300 bg-white' : 'border-zinc-600 bg-zinc-800')
                                      }`}>
                                        {isSelected && (
                                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </span>
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isSelected}
                                        onChange={handleToggle}
                                      />
                                      {/* Name */}
                                      <span className={`flex-1 font-semibold uppercase tracking-wide truncate ${
                                        isSelected
                                          ? (isLight ? 'text-emerald-800' : 'text-emerald-300')
                                          : (isLight ? 'text-zinc-700' : 'text-zinc-300')
                                      }`}>
                                        {ref.name}
                                      </span>
                                      {/* Price clickable */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setOverridePart(ref);
                                          setOverrideModalOpen(true);
                                        }}
                                        className={`font-mono font-black text-[10px] shrink-0 px-2.5 py-1 rounded cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 ${
                                          isSelected
                                            ? (isLight ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900')
                                            : (isLight ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750')
                                        }`}
                                        title="Editar precio en caliente"
                                      >
                                        {config.currencySymbol || '$'}{displayPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <Edit className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                      </button>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => { setDeviceModel(''); }}
                          className={`px-5 py-1.5 font-bold text-xs transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${isRetro ? 'rounded-none border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' : 'rounded-lg border'} ${isLight ? (isRetro ? 'bg-[#dfdfdf] hover:bg-zinc-200 text-black border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700') : (isRetro ? 'bg-[#2a2b30] hover:bg-[#32333a] border-t-[#42444c] border-l-[#42444c] border-b-black border-r-black text-white' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white')}`}
                        >
                          ➙ Buscar o registrar otro equipo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 md:p-8 space-y-6 text-center animate-fade-in">
                      <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest mb-1.5 font-sans">
                        REGISTRAR NUEVO TELEFONO
                      </h3>
                      
                      <div className="space-y-4 max-w-sm mx-auto animate-fade-in">
                        {/* NO. DE MODELO — primer campo */}
                        <div className="space-y-1 text-left">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                            No. de Modelo <span className="text-zinc-400 normal-case font-normal">(opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              id="new-phone-model-number"
                              type="text"
                              autoFocus
                              onFocus={e => { e.target.select(); setShowModelNumberSuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowModelNumberSuggestions(false), 200)}
                              onKeyDown={e => {
                                if (showModelNumberSuggestions && filteredModelNumberSuggestions.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setModelNumberSuggestionIndex(prev => (prev + 1) % filteredModelNumberSuggestions.length);
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setModelNumberSuggestionIndex(prev => (prev - 1 + filteredModelNumberSuggestions.length) % filteredModelNumberSuggestions.length);
                                  } else if (e.key === 'Enter') {
                                    if (modelNumberSuggestionIndex >= 0 && modelNumberSuggestionIndex < filteredModelNumberSuggestions.length) {
                                      e.preventDefault();
                                      handleSelectStepperModelNumber(filteredModelNumberSuggestions[modelNumberSuggestionIndex]);
                                    } else {
                                      setShowModelNumberSuggestions(false);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowModelNumberSuggestions(false);
                                  }
                                } else {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById('new-phone-brand')?.focus();
                                    (document.getElementById('new-phone-brand') as HTMLInputElement)?.select();
                                  }
                                }
                              }}
                              placeholder="Ej. SM-A155M, A3286, MZB0BWQES..."
                              className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider uppercase shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                              value={deviceModelNumber}
                              onChange={(e) => handleCaretPreservingChange(e, setDeviceModelNumber, val => val.toUpperCase())}
                            />
                            {showModelNumberSuggestions && filteredModelNumberSuggestions.length > 0 && (
                              <div ref={stepperModelNumberListRef} className={`${getSuggestionDropdownClasses()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                                {filteredModelNumberSuggestions.map((item, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectStepperModelNumber(item); }}
                                    className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${getSuggestionItemClasses(idx === modelNumberSuggestionIndex)}`}
                                  >
                                    <span>{item}</span>
                                    <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${getBadgeClasses(idx === modelNumberSuggestionIndex)}`}>
                                      {idx === modelNumberSuggestionIndex ? 'Seleccionar ➙' : 'Historial'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* MARCA */}
                        <div className="space-y-1 text-left">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                            M A R C A
                          </label>
                          <div className="relative">
                            <input
                              id="new-phone-brand"
                              type="text"
                              onFocus={e => { e.target.select(); setShowBrandSuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                              onKeyDown={e => {
                                if (showBrandSuggestions && filteredBrandSuggestions.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setBrandSuggestionIndex(prev => (prev + 1) % filteredBrandSuggestions.length);
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setBrandSuggestionIndex(prev => (prev - 1 + filteredBrandSuggestions.length) % filteredBrandSuggestions.length);
                                  } else if (e.key === 'Enter') {
                                    if (brandSuggestionIndex >= 0 && brandSuggestionIndex < filteredBrandSuggestions.length) {
                                      e.preventDefault();
                                      handleSelectStepperBrand(filteredBrandSuggestions[brandSuggestionIndex]);
                                    } else {
                                      setShowBrandSuggestions(false);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowBrandSuggestions(false);
                                  }
                                } else {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById('new-phone-model')?.focus();
                                    (document.getElementById('new-phone-model') as HTMLInputElement)?.select();
                                  }
                                }
                              }}
                              className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider uppercase shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                              value={deviceBrand}
                              onChange={(e) => handleCaretPreservingChange(e, setDeviceBrand, val => val.toUpperCase())}
                            />
                            {showBrandSuggestions && filteredBrandSuggestions.length > 0 && (
                              <div ref={stepperBrandListRef} className={`${getSuggestionDropdownClasses()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                                {filteredBrandSuggestions.map((item, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectStepperBrand(item); }}
                                    className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${getSuggestionItemClasses(idx === brandSuggestionIndex)}`}
                                  >
                                    <span>{item}</span>
                                    <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${getBadgeClasses(idx === brandSuggestionIndex)}`}>
                                      {idx === brandSuggestionIndex ? 'Seleccionar ➙' : 'Historial'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* MODELO */}
                        <div className="space-y-1 text-left">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                            M O D E L O
                          </label>
                          <div className="relative">
                            <input
                              id="new-phone-model"
                              type="text"
                              onFocus={e => { e.target.select(); setShowModelSuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                              onKeyDown={e => {
                                if (showModelSuggestions && filteredModelSuggestions.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setModelSuggestionIndex(prev => (prev + 1) % filteredModelSuggestions.length);
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setModelSuggestionIndex(prev => (prev - 1 + filteredModelSuggestions.length) % filteredModelSuggestions.length);
                                  } else if (e.key === 'Enter') {
                                    if (modelSuggestionIndex >= 0 && modelSuggestionIndex < filteredModelSuggestions.length) {
                                      e.preventDefault();
                                      handleSelectStepperModel(filteredModelSuggestions[modelSuggestionIndex]);
                                    } else {
                                      setShowModelSuggestions(false);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowModelSuggestions(false);
                                  }
                                } else {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const next = pinType === 'none' ? 'new-phone-type' : 'new-phone-pin';
                                    const el = document.getElementById(next) as HTMLInputElement | null;
                                    el?.focus();
                                    el?.select?.();
                                  }
                                }
                              }}
                              className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-wider uppercase shadow-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400"
                              value={deviceModel}
                              onChange={(e) => handleCaretPreservingChange(e, setDeviceModel, val => val.toUpperCase())}
                            />
                            {showModelSuggestions && filteredModelSuggestions.length > 0 && (
                              <div ref={stepperModelListRef} className={`${getSuggestionDropdownClasses()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                                {filteredModelSuggestions.map((item, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectStepperModel(item); }}
                                    className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${getSuggestionItemClasses(idx === modelSuggestionIndex)}`}
                                  >
                                    <span>{item}</span>
                                    <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${getBadgeClasses(idx === modelSuggestionIndex)}`}>
                                      {idx === modelSuggestionIndex ? 'Seleccionar ➙' : 'Historial'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ACCESO AL DISPOSITIVO */}
                        <div className="space-y-2 text-left">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                            Acceso al Dispositivo
                          </label>
                          {/* Selector de tipo */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['none', 'pin', 'pattern'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setPinType(t); if (t !== 'pattern') setPatternNodes([]); setDevicePin(t === 'none' ? 'SIN CLAVE' : ''); }}
                                className={`py-1.5 rounded-sm text-[9.5px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                                  pinType === t
                                    ? 'bg-[#003c94] text-white border-[#00255a]'
                                    : 'bg-white text-[#60738c] border-[#b2c0cc] hover:border-[#003c94] hover:text-[#003c94]'
                                }`}
                              >
                                {t === 'none' ? 'Sin clave' : t === 'pin' ? '🔢 PIN' : '🔷 Patrón'}
                              </button>
                            ))}
                          </div>

                          {/* Input PIN */}
                          {pinType === 'pin' && (
                            <input
                              id="new-phone-pin"
                              type="text"
                              autoFocus
                              onFocus={e => e.target.select()}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-phone-type')?.focus(); } }}
                              placeholder="Ej. 1234 / 0000 / 9876"
                              className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm text-center font-bold tracking-widest shadow-sm"
                              value={devicePin}
                              onChange={(e) => setDevicePin(e.target.value)}
                            />
                          )}

                          {/* Dibujar patrón */}
                          {pinType === 'pattern' && (() => {
                            const SIZE = 156;
                            const STEP = SIZE / 3;
                            const R = 10;
                            const nodePos = (i: number) => ({
                              x: (i % 3) * STEP + STEP / 2,
                              y: Math.floor(i / 3) * STEP + STEP / 2,
                            });
                            const handleNodeClick = (idx: number) => {
                              setPatternNodes(prev => {
                                if (prev.includes(idx)) return prev;
                                return [...prev, idx];
                              });
                            };
                            return (
                              <div className="flex flex-col items-center gap-2">
                                <svg
                                  width={SIZE} height={SIZE}
                                  className="rounded-lg bg-[#0a1628] border border-[#1e3a5f] cursor-pointer select-none"
                                  onClick={(e) => {
                                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                                    const mx = e.clientX - rect.left;
                                    const my = e.clientY - rect.top;
                                    let closest = -1, minD = R * 2;
                                    for (let i = 0; i < 9; i++) {
                                      const p = nodePos(i);
                                      const d = Math.hypot(mx - p.x, my - p.y);
                                      if (d < minD) { minD = d; closest = i; }
                                    }
                                    if (closest >= 0) handleNodeClick(closest);
                                  }}
                                >
                                  {/* Lines */}
                                  {patternNodes.slice(1).map((n, i) => {
                                    const a = nodePos(patternNodes[i]);
                                    const b = nodePos(n);
                                    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />;
                                  })}
                                  {/* Dots */}
                                  {Array.from({ length: 9 }, (_, i) => {
                                    const p = nodePos(i);
                                    const order = patternNodes.indexOf(i);
                                    const selected = order >= 0;
                                    return (
                                      <g key={i}>
                                        <circle cx={p.x} cy={p.y} r={R} fill={selected ? '#3b82f6' : '#1e3a5f'} stroke={selected ? '#93c5fd' : '#2d5a8e'} strokeWidth="1.5" />
                                        {selected && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">{order + 1}</text>}
                                      </g>
                                    );
                                  })}
                                </svg>
                                <div className="flex items-center gap-3 w-full justify-between">
                                  <span className="text-[9px] text-[#60738c] font-bold">
                                    {patternNodes.length === 0 ? 'Toca los puntos para dibujar' : `${patternNodes.length} punto${patternNodes.length > 1 ? 's' : ''} — ${patternNodes.join('-')}`}
                                  </span>
                                  {patternNodes.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setPatternNodes([])}
                                      className="text-[9px] font-extrabold text-red-500 hover:text-red-700 uppercase cursor-pointer"
                                    >
                                      ✕ Borrar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Accesorios Recibidos */}
                          <div className="mt-3 relative" ref={accessoriesPopoverRef}>
                            <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                              Accesorios Recibidos
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowAccessoriesPopover(!showAccessoriesPopover)}
                              className={`w-full py-1.5 px-3 rounded-sm text-xs font-bold uppercase border transition-all cursor-pointer flex items-center justify-between ${
                                selectedAccessories.length > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isRetro
                                    ? 'bg-white text-zinc-700 border-[#b2c0cc] hover:border-zinc-400'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-650'
                              }`}
                            >
                              <span>
                                {selectedAccessories.length > 0
                                  ? `Accesorios (${selectedAccessories.length})`
                                  : 'Registrar Accesorios'}
                              </span>
                              <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                                {selectedAccessories.length > 0 ? selectedAccessories.join(', ') : 'Ninguno'}
                              </span>
                            </button>

                            {showAccessoriesPopover && (
                              <div className={`absolute z-[100] left-0 right-0 mt-1.5 p-3.5 border rounded shadow-xl max-h-60 overflow-y-auto ${
                                isRetro
                                  ? 'bg-[#eaeef3] border-zinc-400 text-zinc-900'
                                  : 'bg-[#151926]/95 backdrop-blur-md border-zinc-700 text-zinc-150'
                              }`}>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {ACCESSORY_OPTIONS.map((opt) => {
                                    const checked = selectedAccessories.includes(opt);
                                    return (
                                      <label key={opt} className="flex items-center gap-2 cursor-pointer py-1">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => {
                                            setSelectedAccessories(prev =>
                                              checked ? prev.filter(x => x !== opt) : [...prev, opt]
                                            );
                                          }}
                                          className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                                        />
                                        <span className="font-semibold uppercase tracking-wide text-[10px]">
                                          {opt}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <div className="border-t border-zinc-750/30 mt-3 pt-2.5">
                                  <input
                                    type="text"
                                    placeholder="Otro accesorio..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim().toUpperCase();
                                        if (val && !selectedAccessories.includes(val)) {
                                          setSelectedAccessories(prev => [...prev, val]);
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                    className={`w-full text-xs px-2.5 py-1 focus:outline-none rounded border uppercase ${
                                      isRetro
                                        ? 'bg-white border-zinc-400 text-zinc-800'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                                    }`}
                                  />
                                  <p className="text-[9px] text-zinc-500 mt-1">Presiona ENTER para agregar uno personalizado</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TIPO */}
                        {(() => {
                          const BASE_TIPOS = [
                            { value: 'Phone', label: 'CELULAR' },
                            { value: 'Tablet', label: 'TABLET' },
                            { value: 'Laptop', label: 'LAPTOP' },
                            { value: 'Watch', label: 'RELOJ' },
                          ].filter(t => !(deletedDefaultTypes || []).includes(t.label.toUpperCase()));
                          const TIPOS = [...BASE_TIPOS, ...customDeviceTypes.filter(c => !BASE_TIPOS.some(b => b.value === c)).map(c => ({ value: c, label: c }))];
                          const q = deviceTypeQuery.toLowerCase();
                          const filtered = q
                            ? TIPOS.filter(t => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q))
                            : TIPOS;
                          const showAddNew = q.trim() !== '' && !TIPOS.some(t => t.label.toLowerCase() === q || t.value.toLowerCase() === q);
                          const displayLabel = (v: string) => TIPOS.find(t => t.value === v)?.label ?? v;
                          return (
                            <div className="space-y-1 text-left">
                              <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                                T I P O  (Celular, Lap, PC, Tablet)
                              </label>
                              <div className="relative">
                                <input
                                  id="new-phone-type"
                                  type="text"
                                  autoComplete="off"
                                  placeholder=""
                                  value={deviceTypeOpen ? deviceTypeQuery : (deviceTypeQuery || displayLabel(deviceType))}
                                  onChange={e => handleCaretPreservingChange(e, (val) => { setDeviceTypeQuery(val); setDeviceTypeOpen(true); setDeviceTypeHighlight(0); }, val => val.toUpperCase())}
                                  onFocus={() => { setDeviceTypeQuery(''); setDeviceTypeOpen(true); setDeviceTypeHighlight(0); }}
                                  onBlur={() => setTimeout(() => setDeviceTypeOpen(false), 150)}
                                  onKeyDown={e => {
                                    const total = filtered.length + (showAddNew ? 1 : 0);
                                    if (e.key === 'ArrowDown') { e.preventDefault(); setDeviceTypeHighlight(h => (h + 1) % total); }
                                    else if (e.key === 'ArrowUp') { e.preventDefault(); setDeviceTypeHighlight(h => (h - 1 + total) % total); }
                                    else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (deviceTypeOpen && total > 0) {
                                        if (deviceTypeHighlight < filtered.length) {
                                          setDeviceType(filtered[deviceTypeHighlight].value);
                                        } else {
                                          const v = deviceTypeQuery.trim().toUpperCase();
                                          setDeviceType(v); saveCustomType(v);
                                        }
                                        setDeviceTypeQuery(''); setDeviceTypeOpen(false);
                                      } else if (deviceTypeQuery.trim() !== '') {
                                        const match = TIPOS.find(t => t.label.toLowerCase() === deviceTypeQuery.toLowerCase().trim() || t.value.toLowerCase() === deviceTypeQuery.toLowerCase().trim());
                                        if (match) { setDeviceType(match.value); } else { const v = deviceTypeQuery.trim().toUpperCase(); setDeviceType(v); saveCustomType(v); }
                                        setDeviceTypeQuery(''); setDeviceTypeOpen(false);
                                      } else {
                                        document.getElementById('new-phone-submit')?.click();
                                      }
                                    } else if (e.key === 'Escape') {
                                      setDeviceTypeQuery(''); setDeviceTypeOpen(false);
                                    }
                                  }}
                                  className="w-full bg-white text-zinc-900 border border-[#b2c0cc] focus:border-blue-600 focus:outline-none rounded-sm px-3.5 py-1.5 text-sm font-bold shadow-sm placeholder:text-zinc-500"
                                />
                                {deviceTypeOpen && (
                                  <div ref={deviceTypeListRef} className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-[#b2c0cc] shadow-lg rounded-sm max-h-44 overflow-y-auto">
                                    {filtered.map((t, idx) => {
                                      const isCustom = customDeviceTypes.includes(t.value);
                                      const isPendingDel = pendingDeleteType === t.value;
                                      if (isPendingDel) return (
                                        <div key={t.value} className="flex items-center gap-1 px-2 py-1.5 bg-red-50 border-b border-red-100">
                                          <span className="flex-1 text-xs font-black text-red-700 truncate">¿Eliminar "{t.label}"?</span>
                                          <button type="button" onMouseDown={() => { deleteDeviceType(t.value); setPendingDeleteType(null); if (deviceType === t.value) setDeviceType('Phone'); }}
                                            className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-red-700">Sí</button>
                                          <button type="button" onMouseDown={() => setPendingDeleteType(null)}
                                            className="text-[10px] font-black bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded cursor-pointer hover:bg-zinc-300">No</button>
                                        </div>
                                      );
                                      return (
                                        <div key={t.value} className={`flex items-center transition-colors ${idx === deviceTypeHighlight ? 'bg-blue-600' : deviceType === t.value ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                                          <button type="button" onMouseDown={() => { setDeviceType(t.value); setDeviceTypeQuery(''); setDeviceTypeOpen(false); }}
                                            className={`flex-1 text-left px-3 py-1.5 text-sm font-bold cursor-pointer ${idx === deviceTypeHighlight ? 'text-white' : deviceType === t.value ? 'text-blue-700' : 'text-zinc-700'}`}>
                                            {t.label}
                                          </button>
                                          {isCustom ? (
                                            <button type="button" onMouseDown={e => { e.stopPropagation(); setPendingDeleteType(t.value); }}
                                              className={`w-8 flex-shrink-0 flex items-center justify-center py-1.5 text-xs font-black cursor-pointer ${idx === deviceTypeHighlight ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-600'}`}>✕</button>
                                          ) : (
                                            <span className="w-8 flex-shrink-0" />
                                          )}
                                        </div>
                                      );
                                    })}
                                    {showAddNew && (
                                      <button type="button"
                                        onMouseDown={() => { const v = deviceTypeQuery.trim().toUpperCase(); setDeviceType(v); saveCustomType(v); setDeviceTypeQuery(''); setDeviceTypeOpen(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-sm font-bold cursor-pointer border-t border-zinc-200 flex items-center gap-1.5 transition-colors ${deviceTypeHighlight === filtered.length ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}>
                                        <span>+</span> Agregar "{deviceTypeQuery.trim()}"
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Buttons container */}
                      <div className="flex items-center justify-center gap-4.5 pt-4.5">
                        <button
                          type="button"
                          onClick={handleCancelNewPhone}
                          className="px-6 py-1.5 bg-[#ccd6e2] hover:bg-[#b9c6d5] text-zinc-700 font-bold text-xs rounded-sm border border-[#b0bfc9] transition-all cursor-pointer shadow-xs uppercase tracking-wider"
                        >
                          Cancelar
                        </button>
                        <button
                          id="new-phone-submit"
                          type="button"
                          onClick={handleSaveNewPhone}
                          className="px-7 py-1.5 bg-[#003c94] hover:bg-[#002f74] text-white font-bold text-xs rounded-sm border border-[#00255a] transition-all cursor-pointer shadow-md uppercase tracking-wider"
                        >
                          Guardar
                        </button>
                      </div>

                    </div>
                  )}
                </>
              )}

              {/* STAGE 2 — Formulario nuevo/confirmar servicio */}
              {activeStep === 1 && isAddingNewService && (
                <div className="p-6 md:p-8 space-y-5 text-center">
                  <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest mb-1.5 font-sans">
                    {services.some(s => s.name.toUpperCase() === newServiceName.toUpperCase()) ? 'Confirmar Precio de Servicio' : 'Registrar Nuevo Servicio'}
                  </h3>
                  <div className="space-y-4 max-w-sm mx-auto text-left">
                    <div className="space-y-1 relative">
                      <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">Nombre del Servicio *</label>
                      <input
                        type="text"
                        autoFocus
                        value={newServiceName}
                        onChange={e => handleCaretPreservingChange(e, (val) => { setNewServiceName(val); setShowNewSvcSugg(true); setNewSvcSuggIdx(-1); }, val => val.toUpperCase())}
                        onFocus={() => { setShowNewSvcSugg(true); setNewSvcSuggIdx(-1); }}
                        onBlur={() => setTimeout(() => setShowNewSvcSugg(false), 200)}
                        onKeyDown={e => {
                          if (showNewSvcSugg && newSvcSuggestions.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setNewSvcSuggIdx(prev => (prev + 1) % newSvcSuggestions.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setNewSvcSuggIdx(prev => (prev - 1 + newSvcSuggestions.length) % newSvcSuggestions.length);
                            } else if (e.key === 'Enter') {
                              if (newSvcSuggIdx >= 0 && newSvcSuggIdx < newSvcSuggestions.length) {
                                e.preventDefault();
                                handleSelectNewSvcSugg(newSvcSuggestions[newSvcSuggIdx].name);
                              } else {
                                setShowNewSvcSugg(false);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowNewSvcSugg(false);
                            }
                          } else {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('new-svc-price')?.focus();
                            }
                          }
                        }}
                        placeholder="Ej. CAMBIO DE PANTALLA"
                        className={`w-full focus:outline-none px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border ${isRetro ? 'bg-white border-zinc-400 text-black' : 'bg-zinc-950 border-zinc-700 text-white focus:border-amber-500'}`}
                      />
                      {showNewSvcSugg && newSvcSuggestions.length > 0 && (
                        <div ref={newSvcListRef} className={`${getSuggestionDropdownClasses()} absolute w-full z-50 rounded-sm p-1.5 mt-0.5 max-h-36 overflow-y-auto space-y-0.5 divide-y divide-zinc-700/10 shadow-md`}>
                          {newSvcSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleSelectNewSvcSugg(item.name); }}
                              className={`w-full text-left px-2 py-1 rounded-xs flex items-center justify-between text-xs font-bold cursor-pointer ${getSuggestionItemClasses(idx === newSvcSuggIdx)}`}
                            >
                              <span>{item.name}</span>
                              <span className={`text-[8.5px] uppercase font-mono px-1.5 py-0.5 rounded ${getBadgeClasses(idx === newSvcSuggIdx)}`}>
                                {idx === newSvcSuggIdx ? 'Seleccionar ➙' : 'Sugerencia'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase">
                        Precio ({config.currencySymbol || '$'}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="new-svc-price"
                        type="number"
                        min={0}
                        value={newServicePrice === 0 ? 0 : (newServicePrice || '')}
                        onChange={e => setNewServicePrice(e.target.value === '' ? '' as any : (Number(e.target.value) || 0))}
                        onFocus={e => e.target.select()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmServicePrice();
                          }
                        }}
                        placeholder="Requerido"
                        className={`w-full focus:outline-none px-3 py-2 text-xs font-mono font-bold rounded-lg border ${
                          newServicePrice >= 0
                            ? isRetro ? 'bg-white border-zinc-400 text-black' : 'bg-zinc-950 border-zinc-700 text-emerald-400 focus:border-amber-500'
                            : isRetro ? 'bg-white border-red-400 text-black' : 'bg-zinc-950 border-red-500/60 text-red-400 focus:border-red-500'
                        }`}
                      />
                      {newServicePrice < 0 && (
                        <p className="text-[9px] text-red-400 font-bold mt-0.5">⚠ El precio no puede ser negativo</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmServicePrice}
                        disabled={!newServiceName.trim() || newServicePrice === undefined || newServicePrice === null || newServicePrice < 0}
                        className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${
                          !newServiceName.trim() || newServicePrice === undefined || newServicePrice === null || newServicePrice < 0
                            ? 'opacity-40 cursor-not-allowed bg-zinc-600 text-zinc-300'
                            : `cursor-pointer ${isRetro ? 'bg-[#003c94] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]' : 'bg-amber-500 hover:bg-amber-400 text-black'}`
                        }`}
                      >
                        {services.some(s => s.name.toUpperCase() === newServiceName.toUpperCase()) ? '✓ Confirmar y Continuar' : '✓ Registrar y Continuar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingNewService(false); setServiceSearchQuery(''); }}
                        className={`px-4 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer ${isRetro ? 'bg-zinc-200 border border-zinc-400 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2 */}
              {activeStep === 1 && !isAddingNewService && (
                <div className="p-6 md:p-8 space-y-4 text-center">
                  <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">
                    Buscar o definir el servicio a realizar
                  </h3>

                  <div className="space-y-3 max-w-md mx-auto text-left">
                    {/* Service selection search bar */}
                    <div className="space-y-1">
                      <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                        Servicio Requerido *
                      </label>
                      <div className="premium-search-container w-full select-none flex items-center">
                        <div className="flex items-center text-zinc-400 shrink-0">
                          <Search className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0"></div>
                        <div className="relative flex-1 flex items-center h-full">
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Ej. Cambio de pantalla, Limpieza de puerto, Batería..."
                            value={serviceSearchQuery}
                            onChange={(e) => handleCaretPreservingChange(e, setServiceSearchQuery, val => val.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (activeSuggestions.length > 0) {
                                  setFocusedIndex((prev) => (prev + 1) % activeSuggestions.length);
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (activeSuggestions.length > 0) {
                                  setFocusedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (focusedIndex >= 0 && focusedIndex < activeSuggestions.length) {
                                  handleSelectService(activeSuggestions[focusedIndex]);
                                } else {
                                  const query = serviceSearchQuery.trim();
                                  if (!query) return;
                                  if (exactServiceMatch) {
                                    handleSelectService(exactServiceMatch);
                                  } else {
                                    setNewServiceName(query.toUpperCase());
                                    setNewServicePrice(0);
                                    setIsAddingNewService(true);
                                  }
                                }
                              }
                            }}
                            className="premium-search-input uppercase text-zinc-100"
                          />
                          {serviceSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setServiceSearchQuery('');
                                setFaultDescription('');
                              }}
                              className="absolute right-2 text-zinc-400 hover:text-white font-black z-10 cursor-pointer text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-[#8fa0b0] font-medium mt-1 select-none">
                        💡 Escribe el servicio y presiona <strong>ENTER</strong> para registrar uno nuevo si no está en el catálogo.
                      </p>
                      {serviceSearchQuery.trim() !== '' && !exactServiceMatch && (
                        <p className="text-[10px] text-zinc-500 font-sans mt-1 animate-fade-in flex items-center gap-1 select-none font-bold">
                          <span>💡</span> Servicio no encontrado — presiona <span className="bg-zinc-200 text-zinc-600 font-mono text-[9px] px-1 py-0.5 rounded border border-zinc-300">ENTER</span> para <strong className="text-amber-500 font-black">registrar nuevo servicio</strong>.
                        </p>
                      )}
                      <div className="p-2 bg-[#cbd6e2]/40 border border-[#b2c0cc] rounded-sm flex items-center justify-between text-[9px] font-bold text-[#203a5c] select-none mt-1">
                        <span>Equipo:</span>
                        <span className="uppercase text-[#003c94] font-black">{deviceBrand} {deviceModel}</span>
                      </div>

                    </div>

                    {/* Matched services dropdown list */}
                    {serviceSearchQuery.trim() !== '' && (
                      <div ref={serviceSuggestionsListRef} className={`${getSuggestionDropdownClasses()} rounded-sm p-2 text-left max-h-52 overflow-y-auto space-y-1 divide-y divide-zinc-700/30 shadow-lg animate-fade-in relative z-50`}>
                        <div className={`${getSuggestionHeaderClasses()} tracking-wider px-2 py-1 select-none`}>
                          📂 Coincidencias en catálogo de precios:
                        </div>
                        {matchedServices.length > 0 ? (
                          matchedServices.map((svc, idx) => (
                            <div key={idx}
                              className={`rounded-sm flex items-center hover:bg-zinc-50 border ${getSuggestionItemClasses(idx === focusedIndex)}`}>
                              <button
                                type="button"
                                onClick={() => handleSelectService(svc)}
                                className="flex-1 text-left px-3 py-2.5 cursor-pointer flex items-center justify-between text-xs font-bold bg-transparent border-0 focus:outline-none"
                              >
                                <span>
                                  {svc.name}
                                </span>
                                <span className={`text-[9px] uppercase font-mono px-2.5 py-0.5 rounded shrink-0 ${getBadgeClasses(idx === focusedIndex)}`}>
                                  {config.currencySymbol || '$'}{svc.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ➙
                                </span>
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteServiceFromHistory(svc);
                                }}
                                className="text-red-500 hover:text-red-700 p-2.5 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-zinc-400 text-[11px] font-bold leading-relaxed">
                            No se encontraron coincidencias exactas para "{serviceSearchQuery}".
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty query common suggestions */}
                    {serviceSearchQuery.trim() === '' && (
                      <div className="space-y-2 pt-1 text-left select-none animate-fade-in">
                        <span className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                          ⚡ Servicios frecuentes registrados:
                        </span>
                        <div ref={serviceHistoryListRef} className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                          {activeServices.map((s, idx) => (
                            <div key={idx}
                              className={`text-xs font-bold rounded-sm flex items-center font-sans border hover:bg-zinc-50 ${getStaticItemClasses(idx === focusedIndex)}`}>
                              <button
                                type="button"
                                onClick={() => handleSelectService(s)}
                                className="flex-1 p-3 text-left cursor-pointer flex justify-between items-center bg-transparent border-0 focus:outline-none"
                              >
                                <span className="truncate pr-1 font-extrabold uppercase">{s.name}</span>
                                <span className={`font-mono shrink-0 select-none text-[10.5px] uppercase font-bold ${idx === focusedIndex ? 'text-amber-400 font-extrabold' : 'text-amber-600/90'}`}>
                                  {config.currencySymbol || '$'}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ➙
                                </span>
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteServiceFromHistory(s);
                                }}
                                className="text-red-500 hover:text-red-700 p-3 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Underlining notification of matching requirements */}
                    {faultDescription && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] rounded-sm flex items-center gap-2 font-bold animate-fade-in">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Servicio seleccionado: <strong className="uppercase">{faultDescription}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 3 */}
              {activeStep === 2 && (
                <div className="p-6 md:p-8 space-y-4 text-center">
                  <h3 className="text-xs font-black uppercase text-[#424f63] tracking-widest font-sans">
                    Ficha Informativa del Cliente
                  </h3>

                  <div className="space-y-3 max-w-sm mx-auto text-left">
                    {!isRegisteringNewClient && !detectedClient ? (
                      /* SEARCH BLOCK */
                      <div className="space-y-3">
                        <div className="space-y-1 relative">
                          <label className="block text-[9.5px] font-extrabold text-[#60738c] tracking-widest uppercase mb-1">
                            Buscar en Historial (Nombre o Teléfono)
                          </label>
                          <div className="premium-search-container w-full select-none flex items-center">
                            <div className="flex items-center text-zinc-400 shrink-0">
                              <Search className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0"></div>
                            <div className="relative flex-1 flex items-center h-full">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Nombre o 10 dígitos..."
                                value={clientSearchQuery}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const target = e.target;
                                  const digits = raw.replace(/\D/g, '');
                                  const isNumericInput = digits.length > 0 && digits.length === raw.replace(/[()\s\-]/g, '').length;
                                  const val = isNumericInput ? fmtPhone10(digits) : raw.toUpperCase();
                                  setClientSearchQuery(val);
                                  setFocusedClientIndex(-1);
                                  setExactMatchModal(null);
                                  // Poner el cursor siempre al final cuando hay formato de teléfono
                                  // para evitar el salto al inicio causado por la inserción de (,),-,espacio
                                  if (isNumericInput) {
                                    requestAnimationFrame(() => {
                                      const len = val.length;
                                      target.setSelectionRange(len, len);
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Si el modal de coincidencia está abierto, navegarlo con flechas/Enter/Escape
                                  if (exactMatchModal) {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      // +1 porque el índice 0..n-1 son clientes, n es "No, crear nuevo"
                                      setExactMatchModal(m => m ? { ...m, focusedIdx: Math.min(m.focusedIdx + 1, m.candidates.length) } : m);
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setExactMatchModal(m => m ? { ...m, focusedIdx: Math.max(m.focusedIdx - 1, 0) } : m);
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (exactMatchModal.focusedIdx < exactMatchModal.candidates.length) {
                                        handleSelectClient(exactMatchModal.candidates[exactMatchModal.focusedIdx]);
                                        setExactMatchModal(null);
                                      } else {
                                        setExactMatchModal(null);
                                        handleRegisterNewClient();
                                      }
                                    } else if (e.key === 'Escape') {
                                      setExactMatchModal(null);
                                    }
                                    return;
                                  }
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setFocusedClientIndex((prev) =>
                                      Math.min(prev + 1, activeClientSuggestions.length - 1)
                                    );
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setFocusedClientIndex((prev) => Math.max(prev - 1, -1));
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (focusedClientIndex >= 0 && focusedClientIndex < activeClientSuggestions.length) {
                                      handleSelectClient(activeClientSuggestions[focusedClientIndex]);
                                    } else {
                                      const query = clientSearchQuery.trim();
                                      if (!query) { handleRegisterNewClient(); return; }
                                      if (exactClientMatches.length > 0) {
                                        setExactMatchModal({ candidates: exactClientMatches, focusedIdx: 0 });
                                      } else {
                                        handleRegisterNewClient();
                                      }
                                    }
                                  }
                                }}
                                className="premium-search-input uppercase text-zinc-100"
                              />
                              {clientSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setClientSearchQuery('')}
                                  className="absolute right-2 text-zinc-400 hover:text-white font-black z-10 cursor-pointer text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-[#8fa0b0] font-medium mt-1 select-none">
                            💡 Escribe el nombre o teléfono y presiona <strong>ENTER</strong> para registrar uno nuevo si no está en la lista.
                          </p>
                        </div>

                        {/* List representation of clients */}
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {activeClientSuggestions.map((item, idx) => (
                            <div key={item.phone}
                              className={`rounded-sm flex items-center hover:bg-zinc-50 border ${getStaticItemClasses(idx === focusedClientIndex)}`}>
                              <button
                                type="button"
                                onClick={() => handleSelectClient(item)}
                                className="flex-1 text-left p-3 cursor-pointer flex items-center justify-between bg-transparent border-0 focus:outline-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${idx === focusedClientIndex ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                                  <span className="font-sans font-extrabold uppercase">
                                    {item.name}
                                  </span>
                                </div>
                                <div className={`text-[10px] font-bold font-mono shrink-0 select-none ${idx === focusedClientIndex ? 'text-amber-400' : 'text-zinc-500'}`}>
                                  {fmtPhone10(item.phone.replace(/\D/g,''))} ➙
                                </div>
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteClientFromHistory(item.phone);
                                }}
                                className="text-red-500 hover:text-red-700 p-3 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          
                          {activeClientSuggestions.length === 0 && (
                            <div className="p-4 bg-zinc-100 rounded border border-zinc-200 text-center text-xs text-zinc-500 italic">
                              No se encontraron clientes registrados con esa información.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* FORM / SUB-MENU FOR REGISTERING OR PRE-FILLED INFO */
                      <div className="space-y-4 animate-scaleUp">
                        {/* Nombre Completo del Cliente */}
                        <div className="space-y-1 text-left">
                          <label className={`block text-[9.5px] font-extrabold ${isRetro ? 'text-[#000080]' : 'text-zinc-400'} tracking-widest uppercase`}>
                            Nombre Completo del Cliente *
                          </label>
                          <div className="flex rounded-lg overflow-hidden border border-[#b2c0cc] focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white shadow-sm">
                            <div className="bg-zinc-100 px-3 py-2 flex items-center justify-center border-r border-[#b2c0cc] text-zinc-500 shrink-0">
                              <User className="w-4 h-4 text-zinc-500" />
                            </div>
                            <input
                              id="new-customer-name-input"
                              type="text"
                              required
                              placeholder="Escribe apellido(s) y nombre..."
                              value={customerName}
                              onChange={(e) => handleCaretPreservingChange(e, setCustomerName, val => val.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customerName.trim() && customerPhone.trim()) {
                                    setActiveStep(3);
                                  } else {
                                    const nextInput = document.getElementById('new-customer-phone-input') as HTMLInputElement | null;
                                    if (nextInput) {
                                      nextInput.focus();
                                      nextInput.select();
                                    }
                                  }
                                }
                              }}
                              className="w-full bg-white text-zinc-900 border-none focus:outline-none focus:ring-0 px-3 py-1.5 text-sm font-bold tracking-wider uppercase"
                            />
                          </div>
                        </div>

                        {/* Teléfono de Contacto */}
                        <div className="space-y-1 text-left">
                          <label className={`block text-[9.5px] font-extrabold ${isRetro ? 'text-[#000080]' : 'text-zinc-400'} tracking-widest uppercase`}>
                            Teléfono de Contacto *
                          </label>
                          <div className="flex rounded-lg overflow-hidden border border-[#b2c0cc] focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white shadow-sm">
                            <div className="bg-zinc-100 border-r border-[#b2c0cc] text-zinc-500 shrink-0 flex items-center relative select-none">
                              <select
                                id="country-code-selector"
                                value={customerCountryCode}
                                onChange={(e) => setCustomerCountryCode(e.target.value)}
                                className="bg-[#f4f4f5] pl-2.5 pr-6 py-2 text-xs font-bold font-mono text-zinc-800 border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none h-full"
                                style={{
                                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23555'><path fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /></svg>")`,
                                  backgroundPosition: 'right 0.35rem center',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundSize: '0.8rem'
                                }}
                              >
                                <option value="+52">🇲🇽 +52</option>
                                <option value="+1">🇺🇸 +1</option>
                              </select>
                            </div>
                            <input
                              id="new-customer-phone-input"
                              type="text"
                              required
                              placeholder="(351) 157-4876"
                              maxLength={14}
                              inputMode="numeric"
                              value={customerPhone}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setCustomerPhone(fmtPhone10(digits));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const phoneOk = customerPhone.replace(/\D/g, '').length === 10;
                                  if (customerName.trim() && phoneOk) {
                                    setActiveStep(3);
                                  } else if (!customerName.trim()) {
                                    const nameInput = document.getElementById('new-customer-name-input') as HTMLInputElement | null;
                                    if (nameInput) { nameInput.focus(); nameInput.select(); }
                                  } else if (!phoneOk) {
                                    setErrorMsg('El número de teléfono debe tener exactamente 10 dígitos.');
                                  }
                                }
                              }}
                              className={`w-full bg-white text-zinc-900 border-none focus:outline-none focus:ring-0 px-3 py-1.5 text-sm font-bold tracking-wider font-mono ${customerPhone.length > 0 && customerPhone.replace(/\D/g,'').length !== 10 ? 'text-red-600' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Status detail & Back buttons */}
                        <div className="flex flex-col gap-2">
                          {detectedClient ? (
                            <div className={`p-3 border rounded-lg flex items-center justify-between font-mono text-[10.5px] font-bold ${
                              isRetro
                                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-[#000080]'
                                : isLight
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-850'
                                  : 'bg-emerald-950/20 border-emerald-850/40 text-emerald-400'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-emerald-600' : 'bg-emerald-500'}`}></span>
                                <div className="text-left">
                                  <span className={`text-[8.5px] block uppercase font-extrabold tracking-widest ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-550' : 'text-zinc-400'}`}>Registrado</span>
                                  <span className="font-extrabold">{detectedClient.name}</span>
                                </div>
                              </div>
                              {clientPrevOrders.length > 0 && (
                                <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded ${
                                  isRetro
                                    ? 'bg-[#c6c6c6] border border-[#808080] text-[#000080]'
                                    : isLight
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-emerald-500/15 text-emerald-300'
                                }`}>
                                  ⚡ {clientPrevOrders.length} Historial
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className={`p-3 border rounded-lg flex items-center gap-2 font-mono text-[9.5px] leading-relaxed ${
                              isRetro
                                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-[#000080]'
                                : isLight
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-blue-950/20 border-blue-900/30 text-blue-300'
                            }`}>
                              <User className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : isLight ? 'text-blue-500' : 'text-blue-400'}`} />
                              <div className="text-left">
                                <span className={`text-[8.5px] block uppercase font-extrabold tracking-widest ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-550' : 'text-zinc-400'}`}>Cliente Nuevo</span>
                                <span className="font-extrabold">Registrando cliente nuevo en la base de datos local.</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsRegisteringNewClient(false);
                              setDetectedClient(null);
                              setClientPrevOrders([]);
                              setCustomerPhone('');
                              setCustomerName('');
                              setClientSearchQuery('');
                            }}
                            className={`text-xs text-center font-extrabold transition-colors py-1 cursor-pointer ${
                              isRetro
                                ? 'text-[#000080] hover:underline'
                                : isLight
                                  ? 'text-blue-700 hover:text-blue-900'
                                  : 'text-sky-400 hover:text-sky-300'
                            }`}
                          >
                            ← Buscar en historial de clientes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="p-3 flex flex-col gap-2 text-center h-full">

                  {/* Sección superior — crece para llenar el espacio disponible */}
                  <div className="w-full grid grid-cols-2 gap-3 text-left flex-1 min-h-0">
                    {/* Left: resumen */}
                    <div className={`review-panel-container w-full flex flex-col p-2.5 rounded-xl ${!isRetro ? 'bg-zinc-900/30 border border-zinc-800/60' : ''}`}>
                      <div className={`review-panel-title text-[9.5px] uppercase font-extrabold tracking-widest shrink-0 pb-1.5 mb-2 ${!isRetro ? 'text-[#60738c] border-b border-zinc-800/15' : ''}`}>
                        Detalles de Recepción
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { icon: <User className="w-3 h-3 text-orange-400" />, label: 'Cliente', value: customerName || 'N/A' },
                          { icon: <Phone className="w-3 h-3 text-emerald-400" />, label: 'Teléfono', value: `${customerCountryCode ? customerCountryCode + ' ' : ''}${customerPhone || 'N/A'}` },
                          { icon: <Smartphone className="w-3 h-3 text-sky-400" />, label: 'Dispositivo', value: extraEquipos.length > 0 ? `Recepción múltiple (${extraEquipos.length + 1} equipos)` : [deviceBrand, deviceModel, deviceModelNumber.trim()].filter(Boolean).join(' ') || 'N/A' },
                          { icon: <CheckCircle className="w-3 h-3 text-emerald-400" />, label: 'Servicio', value: (parts.some(p => p.refaccionId) ? faultDescription : (services.find(s => s.id === selectedServiceId)?.name || 'SERVICIO GENERAL')).toUpperCase() },
                        ].map((row, i) => (
                          <div key={i} className={`review-panel-row flex items-start gap-1.5 px-2 py-1.5 rounded-lg ${!isRetro ? 'bg-zinc-800/40' : ''}`}>
                            <div className={`review-panel-icon w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!isRetro ? 'bg-zinc-700/80' : ''}`}>{row.icon}</div>
                            <div className="min-w-0 flex-1">
                              <span className={`review-panel-label text-[8px] uppercase font-extrabold block leading-none mb-0.5 ${!isRetro ? 'text-zinc-400' : ''}`}>{row.label}</span>
                              <span className={`review-panel-value text-[10px] font-extrabold block font-mono leading-tight break-words ${!isRetro ? 'text-zinc-100' : ''}`}>{row.value}</span>
                            </div>
                          </div>
                        ))}
                        {/* Fila Acceso — solo en orden individual */}
                        {extraEquipos.length === 0 && devicePin.trim() && (() => {
                          const isPattern = pinType === 'pattern' && patternNodes.length > 0;
                          const nodePos = (i: number) => ({ x: (i % 3) * 14 + 7, y: Math.floor(i / 3) * 14 + 7 });
                          const patColor = '#3b82f6';
                          let patternArrow = null as React.ReactNode;
                          if (isPattern && patternNodes.length >= 2) {
                            const lp = nodePos(patternNodes[patternNodes.length - 2]);
                            const lq = nodePos(patternNodes[patternNodes.length - 1]);
                            const dx = lq.x - lp.x; const dy = lq.y - lp.y;
                            const len = Math.hypot(dx, dy) || 1;
                            const ux = dx / len; const uy = dy / len;
                            const px = -uy; const py = ux;
                            const aS = 3.5; const nR = 3.5;
                            const tip  = { x: lq.x + ux * (nR + aS), y: lq.y + uy * (nR + aS) };
                            const base = { x: tip.x - ux * aS, y: tip.y - uy * aS };
                            const l1   = { x: base.x + px * aS * 0.7, y: base.y + py * aS * 0.7 };
                            const l2   = { x: base.x - px * aS * 0.7, y: base.y - py * aS * 0.7 };
                            patternArrow = <polygon points={`${tip.x},${tip.y} ${l1.x},${l1.y} ${l2.x},${l2.y}`} fill={patColor} />;
                          }
                          return (
                            <div className={`review-panel-row flex items-center gap-2 px-2 py-1.5 rounded-lg ${!isRetro ? 'bg-zinc-800/40' : ''}`}>
                              <div className={`review-panel-icon w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${!isRetro ? 'bg-zinc-700/80' : ''}`}>
                                <span className="text-sm">🔐</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`review-panel-label text-[9px] uppercase font-extrabold block leading-none mb-0.5 ${!isRetro ? 'text-zinc-400' : ''}`}>Acceso</span>
                                {isPattern ? (
                                  <svg width="56" height="56" viewBox="-4 -4 56 56" className="mt-0.5">
                                    {patternNodes.slice(1).map((n, i) => {
                                      const a = nodePos(patternNodes[i]); const b = nodePos(n);
                                      return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={patColor} strokeWidth="1.5" strokeLinecap="round" />;
                                    })}
                                    {Array.from({ length: 9 }, (_, i) => {
                                      const { x, y } = nodePos(i);
                                      const active = patternNodes.includes(i);
                                      return <circle key={i} cx={x} cy={y} r={active ? 3.5 : 2} fill={active ? patColor : (!isRetro ? '#52525b' : '#9ca3af')} />;
                                    })}
                                    {patternArrow}
                                  </svg>
                                ) : (
                                  <span className={`review-panel-value text-[11.5px] font-extrabold truncate block font-mono leading-tight ${!isRetro ? 'text-zinc-100' : ''}`}>{devicePin.trim()}</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right: notas — textarea crece */}
                    <div className="flex flex-col gap-1.5 text-left min-h-0">
                      <label className={`text-[9px] font-black uppercase shrink-0 ${isRetro ? 'text-[#424f63]' : 'text-zinc-400'} tracking-widest flex items-center gap-1`}>
                        <Palette className="w-3 h-3 text-amber-500 shrink-0" /> Notas Internas del Taller
                      </label>
                      <textarea
                        placeholder="Observaciones técnicas, accesorios recibidos, condición del equipo... (no aparece en el ticket del cliente)"
                        value={proposedSolution}
                        onChange={(e) => handleCaretPreservingChange(e, setProposedSolution)}
                        className={`w-full flex-1 min-h-[120px] border ${isRetro ? 'bg-white text-zinc-900 border-[#b2c0cc] focus:border-[#113a7c]' : 'bg-zinc-950 text-white border-zinc-600/80 focus:border-amber-500'} focus:outline-none rounded-xl px-3 py-2.5 text-[11.5px] font-bold leading-relaxed shadow-inner resize-none`}
                      />
                      <label className={`flex items-center gap-1.5 mt-1 cursor-pointer select-none text-[9.5px] font-extrabold uppercase ${isRetro ? 'text-[#424f63]' : 'text-zinc-400'}`}>
                        <input
                          type="checkbox"
                          checked={showNotesOnLabel}
                          onChange={(e) => setShowNotesOnLabel(e.target.checked)}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                        <span>{config.hybridPrintMode ? "Imprimir notas en etiqueta de equipo" : "Imprimir notas en el ticket de servicio"}</span>
                      </label>
                      <label className={`flex items-center gap-1.5 mt-1 cursor-pointer select-none text-[9.5px] font-extrabold uppercase ${isRetro ? 'text-[#424f63]' : 'text-zinc-400'}`}>
                        <input
                          type="checkbox"
                          checked={hidePriceOnLabel}
                          onChange={(e) => setHidePriceOnLabel(e.target.checked)}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                        <span>Ocultar precio en etiqueta (maquila / técnico externo)</span>
                      </label>
                    </div>
                  </div>


                  {/* Equipos adicionales */}
                  {extraEquipos.length > 0 && (
                    <div className={`rounded-xl border overflow-hidden ${isRetro ? 'border-zinc-300' : 'border-zinc-700'}`}>
                      <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center justify-between ${isRetro ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-950/20 text-emerald-400'}`}>
                        <span>Equipos adicionales</span>
                        <span className={`text-[8px] font-bold ${isRetro ? 'text-emerald-600' : 'text-emerald-500'}`}>{extraEquipos.length} equipo{extraEquipos.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="max-h-[80px] overflow-y-auto scrollbar-thin">
                        {extraEquipos.map((eq, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-1 border-t text-[10px] ${isRetro ? 'border-zinc-200 text-zinc-800' : 'border-zinc-800 text-zinc-200'}`}>
                            <span className="font-bold truncate">{eq.deviceBrand} {eq.deviceModel}</span>
                            <span className={`text-[9px] mx-2 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>{config.currencySymbol || '$'}{eq.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <button type="button" onClick={() => setExtraEquipos(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-300 font-bold shrink-0">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setExtraDraft({ deviceType: 'Phone', deviceBrand: '', deviceModel: '', deviceModelNumber: '', devicePin: '', faultDescription: '', serviceType: '', cost: 0, advancePayment: 0, parts: [] });
                      setShowExtraModal(true);
                    }}
                    className={`w-full py-2 text-[11px] font-black uppercase tracking-wide rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${isRetro ? 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-emerald-600 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50'}`}
                  >
                    <span className="text-base leading-none">＋</span> Agregar otro equipo del mismo cliente
                  </button>

                  {/* Técnico asignado — solo en modo equipo */}
                  {!isPersonalMode && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isRetro ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-950/20 border-zinc-700/60'}`}>
                      <span className="text-sm shrink-0">👤</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${isRetro ? 'text-indigo-700' : 'text-indigo-400'}`}>Técnico:</span>
                      <select
                        value={assignedTechnician}
                        onChange={e => setAssignedTechnician(e.target.value)}
                        className={`flex-1 text-xs font-bold focus:outline-none rounded px-2 py-1 border ${isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500'}`}
                      >
                        {users.filter(u => u.permissions.canManageOrders).map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                        {users.filter(u => u.permissions.canManageOrders).length === 0 && (
                          <option value="Técnico de Turno">Técnico de Turno</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Cargo / Abono */}
                  <div className={`rounded-xl border overflow-hidden ${isRetro ? 'border-zinc-300' : 'border-zinc-700'}`}>
                    <div className="grid grid-cols-2">
                      {/* Cargo */}
                      <div className={`flex items-center gap-1.5 py-1.5 px-3 border-r ${isRetro ? 'bg-emerald-50 border-zinc-300' : 'bg-emerald-950/30 border-zinc-700'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${isRetro ? 'text-emerald-700' : 'text-emerald-500'}`}>💰 Cargo</span>
                        {extraEquipos.length > 0 ? (
                          <span className={`text-sm font-black font-mono ml-auto ${isRetro ? 'text-emerald-700' : 'text-emerald-400'}`}>
                            {config.currencySymbol || '$'}{((Number(repairCost) || 0) + extraEquipos.reduce((s, eq) => s + eq.cost, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <div className="relative flex-1 min-w-0">
                            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-black ${isRetro ? 'text-emerald-700' : 'text-emerald-400'}`}>$</span>
                            <input ref={cargoInputRef} type="text" inputMode="numeric" value={repairCost} onFocus={e => e.target.select()}
                              onChange={(e) => { const val = e.target.value; if (val === '') { setRepairCost(''); } else { const c = val.replace(/[^0-9.]/g, ''); setRepairCost(c === '' ? '' : Math.max(0, Number(c) || 0)); } }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); abonoInputRef.current?.focus(); abonoInputRef.current?.select(); } }}
                              placeholder="0.00"
                              className={`w-full text-right text-sm font-black font-mono pl-6 pr-2 py-1 rounded-lg focus:outline-none ${isRetro ? 'bg-white text-emerald-800 border border-emerald-300 focus:border-emerald-600' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800 focus:border-emerald-500'}`}
                            />
                          </div>
                        )}
                      </div>
                      {/* Abono — botones en fila + input dinámico */}
                      <div className={`flex flex-col gap-1.5 py-1.5 px-2 ${isRetro ? 'bg-sky-50' : 'bg-sky-950/30'}`}>
                        <div className="flex items-center gap-1.5 w-full">
                          {/* Botones de método */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            {(['Efectivo', 'Tarjeta/Transfer'] as const).map(m => (
                              <button key={m} type="button"
                                onClick={() => handleTogglePaymentMethod(m)}
                                className={`px-1.5 py-0.5 text-[7px] font-bold rounded cursor-pointer transition-all leading-tight ${selectedMethods.includes(m) ? isRetro ? 'bg-sky-700 text-white' : 'bg-sky-600 text-white' : isRetro ? 'bg-zinc-200 text-zinc-500 border border-zinc-300' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                              >{m}</button>
                            ))}
                          </div>
                          {/* Input dinámico */}
                          <div className="flex-1 min-w-0">
                            {selectedMethods.length === 1 && (
                              <div className="relative">
                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-black ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>$</span>
                                <input ref={abonoInputRef} type="text" inputMode="numeric" value={advancePayment} onFocus={e => e.target.select()}
                                  onChange={(e) => { const val = e.target.value; if (val === '') { setAdvancePayment(''); } else { const c = val.replace(/[^0-9.]/g, ''); setAdvancePayment(c === '' ? '' : Math.max(0, Number(c) || 0)); } }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const needsRecibido = selectedMethods.includes('Efectivo') && (Number(advancePayment) || 0) > 0;
                                      if (needsRecibido) {
                                        setTimeout(() => {
                                          if (recibidoInputRef.current) {
                                            recibidoInputRef.current.focus();
                                            recibidoInputRef.current.select();
                                          } else {
                                            requestAnimationFrame(() => {
                                              recibidoInputRef.current?.focus();
                                              recibidoInputRef.current?.select();
                                            });
                                          }
                                        }, 30);
                                      } else {
                                        handleSubmit();
                                      }
                                    }
                                  }}
                                  placeholder="0.00"
                                  className={`w-full text-right text-sm font-black font-mono pl-6 pr-2 py-1 rounded-lg focus:outline-none ${isRetro ? 'bg-white text-sky-800 border border-sky-300 focus:border-sky-600' : 'bg-sky-950/40 text-sky-300 border border-sky-800 focus:border-sky-500'}`}
                                />
                              </div>
                            )}
                            {selectedMethods.length > 1 && (
                              <div className="flex flex-col gap-0.5">
                                {selectedMethods.map(m => (
                                  <div key={m} className="flex items-center gap-1">
                                    <span className={`text-[7px] font-black uppercase shrink-0 w-10 ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>{m.slice(0,3)}</span>
                                    <div className="relative flex-1">
                                      <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-black ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>$</span>
                                      <input type="text" inputMode="numeric" value={methodAmounts[m]}
                                        onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); const updated = { ...methodAmounts, [m]: v }; setMethodAmounts(updated); const total = selectedMethods.reduce((s, k) => s + (Number(updated[k]) || 0), 0); setAdvancePayment(total || ''); }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const cashAmt = Number(methodAmounts['Efectivo']) || 0;
                                            const needsRecibido = selectedMethods.includes('Efectivo') && cashAmt > 0;
                                            if (needsRecibido) {
                                              setTimeout(() => {
                                                if (recibidoInputRef.current) {
                                                  recibidoInputRef.current.focus();
                                                  recibidoInputRef.current.select();
                                                } else {
                                                  requestAnimationFrame(() => {
                                                    recibidoInputRef.current?.focus();
                                                    recibidoInputRef.current?.select();
                                                  });
                                                }
                                              }, 30);
                                            } else {
                                              handleSubmit();
                                            }
                                          }
                                        }}
                                        placeholder="0"
                                        className={`w-full text-right text-xs font-black font-mono pl-5 pr-1 py-0.5 rounded focus:outline-none border ${isRetro ? 'bg-white border-sky-300 text-sky-800' : 'bg-sky-950/40 border-sky-700 text-sky-200'}`}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Calculadora de cambio para efectivo */}
                        {(() => {
                          const cashAdvanceAmount = selectedMethods.length === 1 && selectedMethods[0] === 'Efectivo'
                            ? (Number(advancePayment) || 0)
                            : (Number(methodAmounts['Efectivo']) || 0);

                          if (!selectedMethods.includes('Efectivo') || cashAdvanceAmount <= 0) return null;

                          const change = Number(cashReceived) > cashAdvanceAmount ? Number(cashReceived) - cashAdvanceAmount : 0;

                          return (
                            <div className="flex items-center gap-1 border-t pt-1.5 border-sky-400/20 w-full">
                              <span className={`text-[7px] font-black uppercase shrink-0 w-10 ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>Recib:</span>
                              <div className="relative flex-1">
                                <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-black ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>$</span>
                                <input ref={recibidoInputRef} type="text" inputMode="numeric" value={cashReceived} onFocus={e => e.target.select()}
                                  onChange={(e) => { const val = e.target.value; if (val === '') { setCashReceived(''); } else { const c = val.replace(/[^0-9.]/g, ''); setCashReceived(c === '' ? '' : Math.max(0, Number(c) || 0)); } }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                                  placeholder="0.00"
                                  className={`w-full text-right text-xs font-black font-mono pl-5 pr-1 py-0.5 rounded focus:outline-none border ${isRetro ? 'bg-white border-sky-300 text-sky-800' : 'bg-sky-950/40 border-sky-700 text-sky-200'}`}
                                />
                              </div>
                              {change > 0 && (
                                <div className="ml-1.5 shrink-0 bg-emerald-600 text-white font-black font-mono text-[9px] px-1.5 py-0.5 rounded leading-none">
                                  Cambio: ${change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className={`text-center py-1.5 text-[10px] font-black font-mono border-t ${isRetro ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-800/40 border-zinc-700'}`}>
                      {(() => {
                        const totalGlobal = (Number(repairCost) || 0) + extraEquipos.reduce((s, eq) => s + eq.cost, 0);
                        const abono = Number(advancePayment) || 0;
                        const resta = Math.max(0, totalGlobal - abono);
                        if (abono > totalGlobal) return <span className="text-rose-500">⚠️ El abono excede el cargo total</span>;
                        if (abono === totalGlobal && totalGlobal > 0) return <span className={isRetro ? 'text-emerald-700' : 'text-emerald-400'}>💰 Pago Liquidado (100%)</span>;
                        if (abono > 0) return <span className={isRetro ? 'text-sky-700' : 'text-sky-400'}>📝 Anticipo — Resta {config.currencySymbol || '$'}{resta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                        return <span className={isRetro ? 'text-amber-700' : 'text-amber-400'}>⏳ Pago Pendiente en Entrega</span>;
                      })()}
                    </div>
                  </div>

                  {/* Fecha + Opciones impresión en una fila */}
                  <div className={`grid grid-cols-2 gap-2 border-t pt-2 ${isRetro ? 'border-zinc-300' : 'border-zinc-800/40'}`}>
                    {/* Fecha y Botón Preview */}
                    <div className="flex flex-col gap-2">
                      {/* Fecha */}
                      <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${isRetro ? 'bg-amber-50 border border-amber-200' : 'bg-amber-950/10 border border-zinc-800/40'}`}>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isRetro ? 'text-amber-700' : 'text-amber-500'}`}>📅 Entrega</p>
                        </div>
                        <input type="date" value={estimatedDelivery} min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setEstimatedDelivery(e.target.value)}
                          className={`text-[11px] font-bold rounded px-2 py-1 focus:outline-none border ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-amber-500' : 'bg-zinc-900 border-zinc-700 text-white focus:border-amber-500'}`}
                        />
                      </div>

                      {/* Botón Preview */}
                      <button
                        type="button"
                        onClick={() => setShowTicketPreviewModal(true)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 transition-all cursor-pointer select-none text-center font-black text-[11px] uppercase ${
                          isRetro
                            ? 'bg-zinc-200 border-zinc-400 text-zinc-800 hover:bg-zinc-350'
                            : 'bg-zinc-850/60 border-zinc-750 text-zinc-300 hover:bg-zinc-750'
                        }`}
                      >
                        👁️ Preview Ticket (Ver Comprobante)
                      </button>
                    </div>
                    {/* Opciones impresión */}
                    <div className="flex gap-2">
                      {config.hybridPrintMode ? (
                        [
                          {
                            label: 'Formato Doble',
                            desc: !config.printDuplexContract
                              ? 'Frente (Sin Contrato)'
                              : config.duplexManual
                                ? 'Dúplex Manual (2 Pasos)'
                                : 'Dúplex Automático',
                            val: printTicket,
                            toggle: togglePrintTicket,
                            activeClsRetro: isLight ? 'bg-blue-50 border-[#000080] text-[#000080]' : 'bg-blue-950/80 border-blue-500 text-blue-100',
                            checkRetro: 'bg-[#000080] border-[#000080]',
                            activeClsDark: 'bg-blue-500/10 border-blue-500/60 text-blue-300',
                            checkDark: 'bg-blue-500 border-blue-500'
                          },
                          ...(config.whatsappMode && config.whatsappMode !== 'disabled' ? [
                            {
                              label: 'WhatsApp',
                              desc: 'Enviar',
                              val: sendWhatsappTicket,
                              toggle: toggleSendWhatsapp,
                              activeClsRetro: isLight ? 'bg-[#e8f9ee] border-[#128c7e] text-[#075e54]' : 'bg-[#075e54]/30 border-[#25d366]/40 text-[#25d366]',
                              checkRetro: 'bg-[#25d366] border-[#25d366]',
                              activeClsDark: 'bg-[#075e54]/20 border-[#25d366]/40 text-[#25d366]',
                              checkDark: 'bg-[#25d366] border-[#25d366]'
                            }
                          ] : [])
                        ].map((opt) => (
                          <button key={opt.label} type="button" onClick={opt.toggle}
                            className={`flex-1 flex items-center gap-1.5 px-2 py-2 rounded-xl border-2 transition-all cursor-pointer select-none text-left ${
                              opt.val
                                ? (isRetro ? opt.activeClsRetro : opt.activeClsDark)
                                : isRetro
                                  ? (isLight ? 'bg-white border-zinc-300 text-zinc-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400')
                                  : 'bg-zinc-800/40 border-zinc-700 text-zinc-500'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                              opt.val
                                ? (isRetro ? opt.checkRetro : opt.checkDark)
                                : isRetro
                                  ? (isLight ? 'bg-white border-zinc-400' : 'bg-zinc-800 border-zinc-600')
                                  : 'bg-zinc-700 border-zinc-600'
                            }`}>
                              {opt.val && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase leading-none">{opt.label}</p>
                              <p className={`text-[9px] font-medium leading-none mt-0.5 ${isRetro ? (isLight ? 'text-zinc-400' : 'text-zinc-500') : 'text-zinc-500'}`}>{opt.desc}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        [
                          { label: 'Ticket', desc: 'Comprobante', val: printTicket, toggle: togglePrintTicket, activeClsRetro: isLight ? 'bg-blue-50 border-[#000080] text-[#000080]' : 'bg-blue-950/80 border-blue-500 text-blue-100', checkRetro: 'bg-[#000080] border-[#000080]', activeClsDark: 'bg-blue-500/10 border-blue-500/60 text-blue-300', checkDark: 'bg-blue-500 border-blue-500' },
                          { label: 'Etiqueta', desc: 'Pegatina', val: printLabel, toggle: () => setPrintLabel(v => !v), activeClsRetro: isLight ? 'bg-amber-50 border-amber-600 text-amber-800' : 'bg-amber-950/80 border-amber-500 text-amber-100', checkRetro: 'bg-amber-600 border-amber-600', activeClsDark: 'bg-amber-550/10 border-amber-550/60 text-amber-300', checkDark: 'bg-amber-500 border-amber-500' },
                          ...(config.whatsappMode && config.whatsappMode !== 'disabled' ? [
                            { label: 'WhatsApp', desc: 'Enviar', val: sendWhatsappTicket, toggle: toggleSendWhatsapp, activeClsRetro: isLight ? 'bg-[#e8f9ee] border-[#128c7e] text-[#075e54]' : 'bg-[#075e54]/30 border-[#25d366]/40 text-[#25d366]', checkRetro: 'bg-[#25d366] border-[#25d366]', activeClsDark: 'bg-[#075e54]/20 border-[#25d366]/40 text-[#25d366]', checkDark: 'bg-[#25d366] border-[#25d366]' }
                          ] : [])
                        ].map((opt) => (
                          <button key={opt.label} type="button" onClick={opt.toggle}
                            className={`flex-1 flex items-center gap-1.5 px-2 py-2 rounded-xl border-2 transition-all cursor-pointer select-none text-left ${
                              opt.val
                                ? (isRetro ? opt.activeClsRetro : opt.activeClsDark)
                                : isRetro
                                  ? (isLight ? 'bg-white border-zinc-300 text-zinc-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400')
                                  : 'bg-zinc-800/40 border-zinc-700 text-zinc-500'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                              opt.val
                                ? (isRetro ? opt.checkRetro : opt.checkDark)
                                : isRetro
                                  ? (isLight ? 'bg-white border-zinc-400' : 'bg-zinc-800 border-zinc-600')
                                  : 'bg-zinc-700 border-zinc-600'
                            }`}>
                              {opt.val && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase leading-none">{opt.label}</p>
                              <p className={`text-[9px] font-medium leading-none mt-0.5 ${isRetro ? (isLight ? 'text-zinc-400' : 'text-zinc-500') : 'text-zinc-500'}`}>{opt.desc}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Buttons container in Wizard desktop window footer */}
          <div className={`flex items-center justify-between px-6 py-4 ${isRetro ? 'bg-[#e1e6ed] border-zinc-300' : 'bg-[#151926]/95 border-zinc-900'} border-t font-sans`}>
            <button
              type="button"
              onClick={handleBackStep}
              disabled={activeStep === 0}
              title="Regresar al paso anterior"
              className={`py-1.5 px-4 rounded-sm text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-1 border ${
                activeStep === 0
                  ? (isRetro ? 'text-zinc-400 bg-transparent border-transparent cursor-not-allowed opacity-40' : 'text-zinc-500 bg-transparent border-transparent cursor-not-allowed opacity-30')
                  : (isRetro ? 'text-zinc-700 bg-[#cbd6e2] hover:bg-[#b9c6d5] border-[#b0bfc9] cursor-pointer' : 'text-zinc-300 bg-zinc-900 hover:bg-zinc-700 border-zinc-800 cursor-pointer')
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            {/* Render direct next button if NOT in active step 0 registering new phone context,
                otherwise we hide standard progress buttons inside Phase 1 registration so they must click Save/Cancel */}
            {!(activeStep === 0 && isRegisteringNewPhone) && (
              <>
                {activeStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    title="Avanzar al siguiente paso del registro"
                    className={`py-1.5 px-5 font-bold text-xs rounded-sm transition-all cursor-pointer shadow-md uppercase tracking-wider flex items-center gap-1 border ${
                      isRetro
                        ? 'bg-[#003c94] hover:bg-[#002f74] border-[#00255a] text-white'
                        : `${themeColors.buttonClass} border-transparent text-white`
                    }`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {extraEquipos.length > 0 && (
                      <button
                        type="button"
                        title="Vista previa del ticket"
                        onClick={() => {
                          const baseNextId = generateNextOrderId(orders || []);
                          const matchNum = baseNextId.match(/(\d+)/);
                          const startNum = matchNum ? parseInt(matchNum[1], 10) : 1;
                          const previewOrders = [
                            {
                              id: baseNextId, customerName: customerName || 'CLIENTE', customerPhone, customerCountryCode,
                              deviceType: deviceType as RepairOrder['deviceType'], deviceBrand, deviceModel, deviceModelNumber, devicePin,
                              faultDescription, serviceType: (parts.some(p => p.refaccionId) ? faultDescription : (services.find(s => s.id === selectedServiceId)?.name || 'SERVICIO')).toUpperCase(),
                              cost: Number(repairCost) || 0, advancePayment: Number(advancePayment) || 0,
                              advancePaymentBreakdown: Number(advancePayment) > 0
                                ? selectedMethods.length === 1
                                  ? [{ method: selectedMethods[0], amount: Number(advancePayment) || 0 }]
                                  : selectedMethods.map(m => ({ method: m, amount: Number(methodAmounts[m]) || 0 })).filter(x => x.amount > 0)
                                : undefined,
                              estimatedDeliveryDate: new Date(estimatedDelivery).toISOString(),
                              assignedTechnician, status: 'Pendiente' as const, createdAt: new Date().toISOString(), isPaid: false,
                              diagnosticsNote: proposedSolution.trim() ? (proposedSolution.trim().toLowerCase().startsWith('solución propuesta') ? proposedSolution.trim().replace(/^soluci[oó]n propuesta:?\s*/i, 'Solución propuesta:\n') : `Solución propuesta:\n${proposedSolution.trim()}`) : 'Diagnóstico de ingreso inicial registrado.',
                              showNotesOnLabel: showNotesOnLabel,
                            },
                            ...extraEquipos.map((eq, i) => ({
                              id: `TKT-${String(startNum + i + 1).padStart(4, '0')}`, customerName: customerName || 'CLIENTE', customerPhone, customerCountryCode,
                              deviceType: eq.deviceType, deviceBrand: eq.deviceBrand, deviceModel: eq.deviceModel,
                              deviceModelNumber: eq.deviceModelNumber, devicePin: eq.devicePin,
                              faultDescription: eq.faultDescription, serviceType: eq.serviceType || eq.faultDescription,
                              cost: eq.cost, advancePayment: 0,
                              estimatedDeliveryDate: new Date(estimatedDelivery).toISOString(),
                              assignedTechnician, status: 'Pendiente' as const, createdAt: new Date().toISOString(), isPaid: false,
                              diagnosticsNote: 'Diagnóstico de ingreso inicial registrado.',
                              showNotesOnLabel: showNotesOnLabel,
                            })),
                          ];
                          const html = previewOrders.length === 1
                            ? buildTicketHtml(previewOrders[0], config)
                            : buildConsolidatedTicketHtml(previewOrders, config);
                          // Solo previsualización — nunca imprime
                          const blob = new Blob([html], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank', 'width=500,height=700,scrollbars=yes');
                        }}
                        className={`py-1.5 px-3 font-bold text-xs rounded-sm border transition-all cursor-pointer flex items-center gap-1 ${isRetro ? 'bg-zinc-200 border-zinc-400 text-zinc-700 hover:bg-zinc-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                      >
                        👁 Preview
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      title="Registrar órdenes en el sistema e imprimir tickets"
                      className="py-1.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-sm border border-emerald-700 transition-all cursor-pointer shadow-md uppercase tracking-wider flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" /> Registrar {extraEquipos.length > 0 ? `${extraEquipos.length + 1} Órdenes` : 'Orden'} ✓
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
        </div>
      </div>

      {/* Modal de Previsualización del Ticket */}
      {showTicketPreviewModal && (() => {
        const effectiveWidth = config.ticketPaperWidth || '80mm';
        const isMediaCarta = effectiveWidth === 'media-carta' || effectiveWidth === 'media-carta-duplicado';
        const iframeWidth = effectiveWidth === '58mm' ? '230px' : isMediaCarta ? '816px' : '310px';
        const iframeHeight = effectiveWidth === '58mm' ? '450px' : effectiveWidth === 'media-carta' ? '540px' : effectiveWidth === 'media-carta-duplicado' ? '700px' : '520px';

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
            <div className={`w-full ${isMediaCarta ? 'max-w-4xl' : 'max-w-lg'} rounded-xl border p-4 shadow-2xl relative ${
              isRetro ? 'bg-[#e1e6ed] border-zinc-400 text-black'
              : 'bg-zinc-950 border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5">
                  <span>👁️</span> Vista Previa del Ticket
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTicketPreviewModal(false)}
                  className={`p-1 rounded hover:bg-zinc-500/20 text-xs font-bold cursor-pointer`}
                >
                  ✕
                </button>
              </div>

              {/* Contenedor del ticket */}
              <div className="bg-white rounded-lg p-2 overflow-auto max-h-[70vh] flex justify-center border border-zinc-300 dark:border-zinc-800">
                <iframe
                  title="Ticket Preview"
                  srcDoc={(() => {
                    const baseNextId = generateNextOrderId(orders || []);
                    const matchNum = baseNextId.match(/(\d+)/);
                    const startNum = matchNum ? parseInt(matchNum[1], 10) : 1;
                    const previewOrders = [
                      {
                        id: baseNextId,
                        customerName: customerName || 'CLIENTE',
                        customerPhone,
                        customerCountryCode,
                        deviceType: deviceType as RepairOrder['deviceType'],
                        deviceBrand,
                        deviceModel,
                        deviceModelNumber,
                        devicePin,
                        faultDescription,
                        serviceType: (parts.some(p => p.refaccionId) ? faultDescription : (services.find(s => s.id === selectedServiceId)?.name || 'SERVICIO')).toUpperCase(),
                        cost: Number(repairCost) || 0,
                        advancePayment: Number(advancePayment) || 0,
                        advancePaymentBreakdown: Number(advancePayment) > 0
                          ? selectedMethods.length === 1
                            ? [{ method: selectedMethods[0], amount: Number(advancePayment) || 0 }]
                            : selectedMethods.map(m => ({ method: m, amount: Number(methodAmounts[m]) || 0 })).filter(x => x.amount > 0)
                          : undefined,
                        estimatedDeliveryDate: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : new Date().toISOString(),
                        assignedTechnician,
                        status: 'Pendiente' as const,
                        createdAt: new Date().toISOString(),
                        isPaid: false,
                        diagnosticsNote: proposedSolution.trim() ? (proposedSolution.trim().toLowerCase().startsWith('solución propuesta') ? proposedSolution.trim().replace(/^soluci[oó]n propuesta:?\s*/i, 'Solución propuesta:\n') : `Solución propuesta:\n${proposedSolution.trim()}`) : 'Diagnóstico de ingreso inicial registrado.',
                        showNotesOnLabel: showNotesOnLabel,
                      },
                      ...extraEquipos.map((eq, i) => ({
                        id: `TKT-${String(startNum + i + 1).padStart(4, '0')}`,
                        customerName: customerName || 'CLIENTE',
                        customerPhone,
                        customerCountryCode,
                        deviceType: eq.deviceType,
                        deviceBrand: eq.deviceBrand,
                        deviceModel: eq.deviceModel,
                        deviceModelNumber: eq.deviceModelNumber,
                        devicePin: eq.devicePin,
                        faultDescription: eq.faultDescription,
                        serviceType: eq.serviceType || eq.faultDescription,
                        cost: eq.cost,
                        advancePayment: 0,
                        estimatedDeliveryDate: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : new Date().toISOString(),
                        assignedTechnician,
                        status: 'Pendiente' as const,
                        createdAt: new Date().toISOString(),
                        isPaid: false,
                        diagnosticsNote: 'Diagnóstico de ingreso inicial registrado.',
                        showNotesOnLabel: showNotesOnLabel,
                      })),
                    ];
                    return previewOrders.length === 1
                      ? buildTicketHtml(previewOrders[0], config)
                      : buildConsolidatedTicketHtml(previewOrders, config);
                  })()}
                  style={{ width: iframeWidth, height: iframeHeight }}
                  className="border-0 max-w-full"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTicketPreviewModal(false)}
                  className={`py-1.5 px-4 text-xs font-black uppercase rounded-sm border cursor-pointer ${
                    isRetro
                      ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300 text-black'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic Confirmation Dialog Overlay */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`w-full max-w-sm rounded-xl border p-6 shadow-2xl relative font-sans ${isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-600/85 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white'}`}>
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-505 shrink-0">
                <AlertCircle className="w-5 h-5 animate-pulse text-amber-450" />
              </div>
              <div className="space-y-1.5 flex-1 text-left">
                <h3 className={`text-xs font-black uppercase tracking-wider ${isRetro ? 'text-[#113a7c]' : 'text-amber-400'}`}>
                  ¿Confirmar Registro de Orden?
                </h3>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Estás a punto de registrar una nueva orden de servicio para <strong className="text-zinc-200">{customerName}</strong>. 
                  Por favor, confirma que la información de diagnóstico, costos e impresos sea correcta.
                </p>
              </div>
            </div>

            {/* Resumen de la orden */}
            <div className={`my-3 rounded-lg border text-[11px] font-mono overflow-hidden ${isRetro ? 'bg-zinc-50 border-zinc-300 text-zinc-800' : 'bg-zinc-900/40 border-zinc-700 text-zinc-300'}`}>
              {/* Datos básicos */}
              <div className="px-3 py-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className={isRetro ? 'text-zinc-500' : 'text-zinc-500'}>Propietario:</span>
                  <span className="font-extrabold uppercase truncate max-w-[160px]">{customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isRetro ? 'text-zinc-500' : 'text-zinc-500'}>Dispositivo:</span>
                  <span className="font-bold truncate max-w-[160px]">{deviceBrand} {deviceModel}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className={isRetro ? 'text-zinc-500' : 'text-zinc-500'}>Fecha de entrega:</span>
                  <input
                    type="date"
                    value={estimatedDelivery}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setEstimatedDelivery(e.target.value)}
                    className={`text-[11px] font-bold font-mono rounded px-2 py-0.5 border focus:outline-none focus:border-blue-500 ${isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-800 border-zinc-600 text-zinc-200'}`}
                  />
                </div>
              </div>
              {/* Cargo y abono — destacados */}
              {(() => {
                const totalCargo = (Number(repairCost) || 0) + extraEquipos.reduce((s, eq) => s + eq.cost, 0);
                const totalAnticipo = (Number(advancePayment) || 0) + extraEquipos.reduce((s, eq) => s + eq.advancePayment, 0);
                const saldo = Math.max(0, totalCargo - totalAnticipo);
                return (
                  <>
                    <div className={`grid grid-cols-2 border-t ${isRetro ? 'border-zinc-300' : 'border-zinc-700'}`}>
                      <div className={`flex flex-col items-center justify-center py-3 px-2 border-r ${isRetro ? 'border-zinc-300 bg-emerald-50' : 'border-zinc-700 bg-emerald-950/30'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isRetro ? 'text-emerald-700' : 'text-emerald-500'}`}>
                          💰 Cargo Total{extraEquipos.length > 0 ? ` (${extraEquipos.length + 1} órdenes)` : ''}
                        </span>
                        <span className={`text-xl font-black font-mono ${isRetro ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {config.currencySymbol || '$'}{totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={`flex flex-col items-center justify-center py-3 px-2 ${isRetro ? 'bg-sky-50' : 'bg-sky-950/30'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isRetro ? 'text-sky-700' : 'text-sky-500'}`}>💳 Abono / Anticipo</span>
                        <span className={`text-xl font-black font-mono ${isRetro ? 'text-sky-700' : 'text-sky-400'}`}>
                          {config.currencySymbol || '$'}{totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {totalAnticipo > 0 && (
                          <div className={`text-[9px] font-bold ${isRetro ? 'text-zinc-500' : 'text-zinc-400'} mt-1 flex flex-col items-center gap-0.5`}>
                            {selectedMethods.length === 1 ? (
                              <span>({selectedMethods[0]})</span>
                            ) : (
                              <div className="flex gap-2 font-mono">
                                {selectedMethods.map(m => {
                                  const amt = Number(methodAmounts[m]) || 0;
                                  return amt > 0 ? (
                                    <span key={m}>{m.slice(0,3)}: {config.currencySymbol || '$'}{amt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  ) : null;
                                })}
                              </div>
                            )}
                            {(() => {
                              const cashPortion = selectedMethods.length === 1 && selectedMethods[0] === 'Efectivo'
                                ? totalAnticipo
                                : (Number(methodAmounts['Efectivo']) || 0);
                              if (selectedMethods.includes('Efectivo') && Number(cashReceived) > cashPortion) {
                                return (
                                  <div className="border-t border-zinc-700/20 pt-1 mt-1 text-[8.5px] w-full text-center">
                                    Pago: {config.currencySymbol || '$'}{Number(cashReceived).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Cambio: <strong className={isRetro ? 'text-emerald-700' : 'text-emerald-400'}>{config.currencySymbol || '$'}{(Number(cashReceived) - cashPortion).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`flex justify-between items-center px-3 py-2 border-t ${isRetro ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-700 bg-zinc-800/40'}`}>
                      <span className={`text-[10px] font-black uppercase tracking-wide ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Saldo pendiente:</span>
                      <span className={`text-base font-black font-mono ${saldo <= 0 ? (isRetro ? 'text-emerald-700' : 'text-emerald-400') : (isRetro ? 'text-amber-700' : 'text-amber-400')}`}>
                        {saldo <= 0 ? 'Liquidado ✓' : `${config.currencySymbol || '$'}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                title="Cancelar el registro y volver a revisar los datos"
                className={`py-1.5 px-3 rounded-sm text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isRetro 
                    ? 'bg-[#cbd6e2] hover:bg-[#b9c6d5] border-[#b0bfc9] text-zinc-700' 
                    : 'bg-zinc-900 hover:bg-zinc-700 border-zinc-800/60 text-zinc-300'
                }`}
              >
                No, Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRegister}
                title="Confirmar y registrar orden de servicio permanentemente"
                className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] rounded-sm border border-emerald-700 transition-all cursor-pointer shadow-md uppercase tracking-wider"
              >
                Sí, Registrar Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Due Modal */}
      {changeAmount !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-xl border p-6 shadow-2xl text-center space-y-6 ${isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white'}`}>
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20">
                <Coins className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className={`text-base font-display font-black uppercase tracking-wider ${isRetro ? 'text-[#113a7c]' : 'text-white'}`}>
                  Monto de Cambio
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Entregue la siguiente cantidad de cambio al cliente
                </p>
              </div>
            </div>

            <div className={`p-6 rounded-lg border text-center space-y-1 ${isRetro ? 'bg-zinc-50 border-zinc-300 text-zinc-900' : 'bg-[#0a0a0d] border-zinc-700 text-white'}`}>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">
                Cambio a Entregar
              </span>
              <span className={`text-4xl font-mono font-black block tracking-tight ${isRetro ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {config.currencySymbol || '$'}{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseChangeModal}
              title="Cerrar ventana de cambio y finalizar proceso"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(34,197,94,0.3)] hover:scale-102 transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              autoFocus
            >
              Cerrar / Listo <span className="text-[10px] bg-emerald-950/20 border border-emerald-950/30 px-1.5 py-0.5 rounded font-mono font-medium">{countdown}s</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: teléfono ya registrado — aparece al registrar nuevo cliente si el número coincide */}
      {phoneConflictClient && isRegisteringNewClient && changeAmount === null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 outline-none"
          style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
          tabIndex={-1}
          autoFocus
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setConflictFocusedIdx(prev => prev === 0 ? 1 : 0);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (conflictFocusedIdx === 0) {
                handleSelectClient(phoneConflictClient);
              } else {
                setCustomerPhone('');
                setTimeout(() => {
                  const phoneInput = document.getElementById('new-customer-phone-input') as HTMLInputElement | null;
                  if (phoneInput) phoneInput.focus();
                }, 50);
              }
            }
          }}
          ref={(el) => { if (el) el.focus(); }}
        >
          <div className={`w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl border animate-scaleUp ${isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#13151f] border-zinc-700/80 text-white'}`}>

            {/* Header */}
            <div className={`px-5 py-4 border-b ${isRetro ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/30 border-amber-700/40'}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📞</span>
                <div>
                  <div className={`text-xs font-black uppercase tracking-wider ${isRetro ? 'text-amber-800' : 'text-amber-400'}`}>
                    Número ya registrado
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isRetro ? 'text-amber-700' : 'text-amber-500/80'}`}>
                    Este teléfono pertenece a un cliente existente
                  </div>
                </div>
              </div>
            </div>

            {/* Client info */}
            <div className="px-5 py-4 space-y-3">
              <div className={`rounded-xl border p-3 font-mono ${isRetro ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-700/60'}`}>
                <div className={`text-[8.5px] uppercase font-extrabold tracking-widest mb-1 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Cliente registrado</div>
                <div className={`text-sm font-black uppercase ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>{phoneConflictClient.name}</div>
                <div className={`text-[11px] font-mono mt-0.5 ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>{phoneConflictClient.phone}</div>
              </div>
              <p className={`text-[10.5px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                ¿Deseas usar el cliente existente o continuar registrando uno nuevo con este número?
              </p>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSelectClient(phoneConflictClient)}
                onMouseEnter={() => setConflictFocusedIdx(0)}
                className={`w-full py-2 font-bold text-xs rounded-lg border transition-all cursor-pointer shadow-md uppercase tracking-wider flex items-center justify-between px-3 ${
                  conflictFocusedIdx === 0
                    ? 'bg-emerald-500 border-emerald-400 text-white ring-2 ring-emerald-400/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-700 text-white'
                }`}
              >
                <span>Usar cliente existente</span>
                {conflictFocusedIdx === 0 && <span className="text-[10px] font-black opacity-80">↵</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerPhone('');
                  setTimeout(() => {
                    const phoneInput = document.getElementById('new-customer-phone-input') as HTMLInputElement | null;
                    if (phoneInput) phoneInput.focus();
                  }, 50);
                }}
                onMouseEnter={() => setConflictFocusedIdx(1)}
                className={`w-full py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer uppercase tracking-wider flex items-center justify-between px-3 ${
                  conflictFocusedIdx === 1
                    ? isRetro
                      ? 'bg-zinc-300 border-zinc-400 text-zinc-900 ring-2 ring-zinc-400/50'
                      : 'bg-zinc-600 border-zinc-500 text-white ring-2 ring-zinc-500/50'
                    : isRetro
                      ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                      : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                }`}
              >
                <span>Continuar como nuevo cliente</span>
                {conflictFocusedIdx === 1 && <span className="text-[10px] font-black opacity-80">↵</span>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmación salir con progreso (botón X interno) */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-2xl bg-black/40" onClick={() => setShowExitConfirm(false)}>
          <div className={`w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none' : 'bg-[#121316] border border-zinc-700'}`} onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : 'bg-amber-950/30 border-amber-800/40'}`}>
              <span className="text-sm font-black uppercase tracking-wide" style={{ color: isRetro ? '#ffffff' : '#fbbf24' }}>⚠️ ¿Salir de la orden?</span>
              <div className="text-[10px] mt-0.5" style={{ color: isRetro ? 'rgba(255, 255, 255, 0.75)' : 'rgba(251, 191, 36, 0.8)' }}>Tienes una orden en proceso — perderás el progreso</div>
            </div>
            <div className="px-5 pb-5 pt-4 space-y-2">
              <button
                onClick={() => { setShowExitConfirm(false); clearAllFields(); onProgressChange?.(false); }}
                className="w-full py-2.5 text-xs font-black uppercase rounded-lg cursor-pointer bg-rose-600 hover:bg-rose-500 text-white transition-all"
              >
                Sí, salir y reiniciar
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className={`w-full py-2 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all ${isRetro ? 'bg-zinc-200 border border-zinc-400 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
              >
                Continuar con la orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE COINCIDENCIA EXACTA — overlay al frente ───────── */}
      {exactMatchModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setExactMatchModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#13141a]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl select-none">⚠️</span>
              <div>
                <p className="text-sm font-black text-amber-400 uppercase tracking-wider leading-none">
                  Posible cliente encontrado
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  ¿Se trata de alguno de estos clientes ya registrados?
                </p>
              </div>
            </div>

            {/* Opciones */}
            <div className="px-5 py-4 space-y-2">
              {exactMatchModal.candidates.map((c, idx) => (
                <button
                  key={c.id || c.phone}
                  type="button"
                  onClick={() => { handleSelectClient(c); setExactMatchModal(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    exactMatchModal.focusedIdx === idx
                      ? 'bg-amber-500/15 border-amber-400/60 ring-2 ring-amber-400/30'
                      : 'bg-zinc-800/60 border-zinc-700 hover:border-amber-400/30 hover:bg-amber-500/5'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{c.name}</p>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      {fmtPhone10(c.phone.replace(/\D/g,''))}
                      {c.totalOrders > 0 && (
                        <span className="text-amber-400/80 ml-2">· {c.totalOrders} orden{c.totalOrders !== 1 ? 'es' : ''}</span>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                    exactMatchModal.focusedIdx === idx ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {exactMatchModal.focusedIdx === idx ? '↵ Usar' : 'Usar'}
                  </span>
                </button>
              ))}

              {/* Opción: cliente nuevo */}
              <button
                type="button"
                onClick={() => { setExactMatchModal(null); handleRegisterNewClient(); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  exactMatchModal.focusedIdx === exactMatchModal.candidates.length
                    ? 'bg-emerald-500/15 border-emerald-400/60 ring-2 ring-emerald-400/30'
                    : 'bg-zinc-800/40 border-zinc-700 hover:border-emerald-400/30 hover:bg-emerald-500/5'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-zinc-200">No, registrar como nuevo cliente</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Crear un expediente nuevo con los datos ingresados</p>
                </div>
                <span className={`shrink-0 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                  exactMatchModal.focusedIdx === exactMatchModal.candidates.length ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {exactMatchModal.focusedIdx === exactMatchModal.candidates.length ? '↵ Crear' : 'Crear'}
                </span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <p className="text-[9px] text-zinc-600">↑↓ navegar · Enter confirmar · Esc cerrar</p>
              <button
                type="button"
                onClick={() => setExactMatchModal(null)}
                className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Modal — Equipo adicional mismo cliente */}
      {showExtraModal && ReactDOM.createPortal(
        <ExtraEquipoModal
          isRetro={isRetro}
          isLight={isLight}
          allModels={allModels}
          services={services}
          extraDraft={extraDraft}
          setExtraDraft={setExtraDraft}
          currencySymbol={config.currencySymbol || '$'}
          onAddService={onAddService}
          onAddDevice={(device) => setCustomModels(prev => prev.some(m => m.brand === device.brand && m.model === device.model) ? prev : [...prev, device])}
          customDeviceTypes={customDeviceTypes}
          onSaveCustomType={saveCustomType}
          onDeleteCustomType={deleteDeviceType}
          deletedDefaultTypes={deletedDefaultTypes}
          onDeleteDeviceModel={deleteDeviceModelFromHistory}
          pendingDeleteType={pendingDeleteType}
          onSetPendingDeleteType={setPendingDeleteType}
          onClose={() => setShowExtraModal(false)}
          onConfirm={(overrideDraft) => {
            setExtraEquipos(prev => [...prev, { ...(overrideDraft || extraDraft) }]);
            setShowExtraModal(false);
            setTimeout(() => abonoInputRef.current?.focus(), 100);
          }}
          orders={orders}
          refacciones={refacciones || []}
          config={config}
          users={users}
          currentUser={currentUser}
        />,
        document.body
      )}

      <AdminPriceOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => { setOverrideModalOpen(false); setOverridePart(null); }}
        onSuccess={handlePriceOverrideSuccess}
        itemName={overridePart ? overridePart.name : ''}
        currentPrice={overridePart ? (customPartPrices[overridePart.id] !== undefined ? customPartPrices[overridePart.id] : overridePart.price) : 0}
        users={users}
        currentUser={currentUser}
        isLight={isLight}
        isRetro={isRetro}
        currencySymbol={config.currencySymbol || '$'}
      />
    </div>
  );
}

// ── Componente modal para editar precio en caliente con autorización ───────
interface AdminPriceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPrice: number) => void;
  itemName: string;
  currentPrice: number;
  users: AppUser[];
  currentUser: AppUser | null | undefined;
  isLight: boolean;
  isRetro: boolean;
  currencySymbol: string;
}

function AdminPriceOverrideModal({
  isOpen,
  onClose,
  onSuccess,
  itemName,
  currentPrice,
  users,
  currentUser,
  isLight,
  isRetro,
  currencySymbol
}: AdminPriceOverrideModalProps) {
  const [step, setStep] = useState<'auth' | 'input'>('auth');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.permissions.canEditPrice) {
        setStep('input');
      } else {
        setStep('auth');
      }
      setPin('');
      setPinError('');
      setNewPrice(currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [isOpen, currentUser, currentPrice]);

  if (!isOpen) return null;

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const admins = (users || []).filter(u => u.role === 'admin' || u.permissions.canEditPrice);
    const pinMatches = admins.length === 0 ? pin === '1234' : admins.some(u => u.pin === pin);
    if (pinMatches) {
      setStep('input');
    } else {
      setPinError('PIN incorrecto. Intente de nuevo.');
      setPin('');
    }
  };

  const handlePriceSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumStr = newPrice.replace(/,/g, '');
    const num = parseFloat(cleanNumStr);
    if (isNaN(num) || num < 0) {
      alert('Precio inválido');
      return;
    }
    onSuccess(num);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border select-none overflow-hidden ${
        isRetro 
          ? 'bg-zinc-200 border-zinc-400 font-mono text-black' 
          : isLight 
            ? 'bg-white border-zinc-200 text-zinc-800' 
            : 'bg-[#15161b] border-[#1c1d22] text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between modal-dark-header ${
          isRetro ? 'bg-[#000080] border-zinc-400' : 'bg-zinc-900/40 border-zinc-800/40'
        }`}>
          <div className={`font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 ${
            isRetro ? 'retro-white-text' : 'text-zinc-850 dark:text-zinc-150'
          }`}>
            <Lock className={`w-4 h-4 shrink-0 ${isRetro ? 'retro-white-text' : 'text-zinc-500'}`} />
            Modificar Precio
          </div>
          <button
            onClick={onClose}
            className={`transition-colors cursor-pointer text-sm font-extrabold p-1 rounded hover:bg-white/10 ${
              isRetro ? 'retro-white-text hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            ✕
          </button>
        </div>

        {step === 'auth' ? (
          /* PASO AUTENTICACION */
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded shrink-0 ${isLight ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-blue-950/20 border border-blue-900/45 text-blue-400'}`}>
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className={`font-extrabold text-xs uppercase tracking-wide ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
                  Acceso Restringido
                </h4>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  La edición de precios requiere autorización de administrador.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide block">
                  PIN de Administrador
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  placeholder="••••"
                  className={`w-full text-center text-2xl font-mono font-black tracking-[0.5em] focus:outline-none transition-colors border-2 px-3 py-2 rounded-lg ${
                    isLight ? 'bg-white border-zinc-300 focus:border-blue-500 text-zinc-800' : 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-zinc-100'
                  }`}
                  autoFocus
                />
                {pinError && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    ⚠️ {pinError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide text-white cursor-pointer ${
                    pin.length === 4 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-650 opacity-55 cursor-not-allowed'
                  }`}
                >
                  Verificar
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* PASO EDICION PRECIO */
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] opacity-60 font-extrabold uppercase tracking-wide">Refacción</span>
              <h4 className="font-extrabold text-xs uppercase tracking-wide truncate">
                {itemName}
              </h4>
            </div>

            <form onSubmit={handlePriceSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide block">
                  Nuevo Precio de Venta (local)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-lg opacity-55">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d.]/g, '');
                      const parts = clean.split('.');
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      setNewPrice(parts.slice(0, 2).join('.'));
                    }}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-3 py-2 text-lg font-mono font-bold focus:outline-none transition-colors border-2 rounded-lg ${
                      isLight ? 'bg-white border-zinc-300 focus:border-blue-500 text-zinc-800' : 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-zinc-100'
                    }`}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                <p className="text-[10px] opacity-60 leading-normal">
                  Este cambio es local y solo afectará a esta orden de servicio. No se modificará el precio base del catálogo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}