import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Smartphone, Trash2, Globe, Plus, Cpu, ShieldAlert } from 'lucide-react';
import { supabase } from '../../supabase';
import { DEFAULT_OFFLINE_MODELS } from '../../data';

// Sanitize Helper matching MobileApp
const sanitizeDeviceSelection = (
  rawBrand: string,
  rawModel: string,
  rawModelNumber: string,
  rawType?: string
) => {
  let brand = (rawBrand || 'GENÉRICO').trim().toUpperCase();
  let model = (rawModel || '').trim().toUpperCase();
  let modelNumber = (rawModelNumber || '').trim().toUpperCase();
  let type = rawType || 'Celular';

  const knownBrands: Record<string, string> = {
    'IPHONE': 'APPLE', 'IPAD': 'APPLE', 'MACBOOK': 'APPLE', 'APPLE': 'APPLE',
    'SAMSUNG': 'SAMSUNG', 'GALAXY': 'SAMSUNG',
    'XIAOMI': 'XIAOMI', 'REDMI': 'XIAOMI', 'POCO': 'XIAOMI',
    'MOTOROLA': 'MOTOROLA', 'MOTO': 'MOTOROLA',
    'HUAWEI': 'HUAWEI', 'HONOR': 'HONOR',
    'OPPO': 'OPPO', 'REALME': 'REALME', 'VIVO': 'VIVO', 'ZTE': 'ZTE',
    'NINTENDO': 'NINTENDO', 'PLAYSTATION': 'SONY', 'PS5': 'SONY', 'PS4': 'SONY', 'XBOX': 'MICROSOFT',
    'DELL': 'DELL', 'HP': 'HP', 'LENOVO': 'LENOVO', 'ASUS': 'ASUS', 'ACER': 'ACER'
  };

  const allWords = `${brand} ${model}`.split(/\s+/);
  for (const word of allWords) {
    if (knownBrands[word]) {
      brand = knownBrands[word];
      break;
    }
  }

  // Remove duplicate brand prefix in model name
  if (model.startsWith(brand)) {
    model = model.substring(brand.length).trim();
  }

  // Clean type
  const typeMap: Record<string, string> = {
    'phone': 'Celular', 'celular': 'Celular', 'smartphone': 'Celular',
    'tablet': 'Tablet', 'ipad': 'Tablet',
    'laptop': 'Laptop', 'macbook': 'Laptop', 'computadora': 'Laptop',
    'console': 'Consola', 'consola': 'Consola', 'nintendo': 'Consola', 'playstation': 'Consola', 'xbox': 'Consola',
    'watch': 'Reloj', 'reloj': 'Reloj', 'smartwatch': 'Reloj'
  };
  const cleanType = typeMap[type.toLowerCase()] || 'Celular';

  return { brand, model, modelNumber, type: cleanType };
};

// Compatibility Helper matching MobileApp
const checkRefaccionCompatibility = (
  r: any,
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
  
  let modelOk = rModelIsGeneric;
  if (!modelOk) {
    const cleanM = model.replace(/[^a-z0-9]/g, '');
    const cleanRM = rModel.replace(/[^a-z0-9]/g, '');
    if (cleanM === cleanRM) {
      modelOk = true;
    } else {
      const modifiers = ['pro', 'max', 'plus', 'ultra', 'lite', 'power', 'play', 'neo', 'fe', 'mini'];
      let modifiersMatch = true;
      for (const mod of modifiers) {
        const hasMod1 = model.includes(mod);
        const hasMod2 = rModel.includes(mod);
        if (hasMod1 !== hasMod2) {
          modifiersMatch = false;
          break;
        }
      }
      
      if (modifiersMatch) {
        modelOk = model.includes(rModel) || rModel.includes(model);
      } else {
        modelOk = false;
      }
    }
  }

  return brandOk && modelOk;
};

// Initial services matching INITIAL_SERVICES in MobileApp
const INITIAL_SERVICES = [
  { id: '1', name: 'Cambio de Pantalla (Display)', cost: 1200 },
  { id: '2', name: 'Reemplazo de Batería', cost: 450 },
  { id: '3', name: 'Reparación de Puerto de Carga', cost: 380 },
  { id: '4', name: 'Cambio de Tapa Trasera', cost: 500 },
  { id: '5', name: 'Limpieza y Mantenimiento General', cost: 250 },
  { id: '6', name: 'Reacondicionamiento por Humedad', cost: 600 }
];

interface MobileExtraEquipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eq: any) => void;
  refacciones: any[];
  config: any;
  isLight: boolean;
  users: any[];
  currentUser: any;
  orders?: any[];
}

export default function MobileExtraEquipoModal({
  isOpen,
  onClose,
  onConfirm,
  refacciones = [],
  config,
  isLight,
  users = [],
  currentUser,
  orders = []
}: MobileExtraEquipoModalProps) {
  // Wizard steps: 0 = Dispositivo, 1 = Definir Servicio
  const [step, setStep] = useState<0 | 1>(0);

  // Step 0 States
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [deviceType, setDeviceType] = useState('Celular');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [isRegisteringManual, setIsRegisteringManual] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Internet Search & suggestions (Gemini)
  const [internetSuggestions, setInternetSuggestions] = useState<any[]>([]);
  const [isSearchingInternet, setIsSearchingInternet] = useState(false);

  // Security / PIN
  const [pinType, setPinType] = useState<'none' | 'pin' | 'pattern'>('none');
  const [pinValue, setPinValue] = useState('');
  const [patternNodes, setPatternNodes] = useState<number[]>([]);
  const [isDraggingPattern, setIsDraggingPattern] = useState(false);
  const [patternTouchPos, setPatternTouchPos] = useState<{ x: number; y: number } | null>(null);
  const patternSvgRef = useRef<SVGSVGElement | null>(null);

  // Accessories
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [showAccessories, setShowAccessories] = useState(false);

  // Compatible Parts
  const [selectedParts, setSelectedParts] = useState<any[]>([]);
  const [partsSearch, setPartsSearch] = useState('');
  const [customPartPrices, setCustomPartPrices] = useState<Record<string, number>>({});

  // Step 1 States (Service / Falla)
  const [serviceQuery, setServiceQuery] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState<number | ''>('');
  const [isConfirmingPrice, setIsConfirmingPrice] = useState(false);

  // Modal Price Override
  const [overridePart, setOverridePart] = useState<any | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // Reset fields when opening
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDeviceSearchQuery('');
      setDeviceType('Celular');
      setBrand('');
      setModel('');
      setModelNumber('');
      setIsRegisteringManual(false);
      setIsCollapsed(true);
      setInternetSuggestions([]);
      setIsSearchingInternet(false);
      setPinType('none');
      setPinValue('');
      setPatternNodes([]);
      setIsDraggingPattern(false);
      setPatternTouchPos(null);
      setSelectedAccessories([]);
      setShowAccessories(false);
      setSelectedParts([]);
      setPartsSearch('');
      setCustomPartPrices({});
      setServiceQuery('');
      setSelectedServiceName('');
      setServicePrice('');
      setIsConfirmingPrice(false);
      setOverridePart(null);
      setOverrideModalOpen(false);
    }
  }, [isOpen]);

  // Compute brand suggestions from history
  const brandSuggestions = useMemo(() => {
    if (!orders) return [];
    const brands = orders
      .map(o => (o.deviceBrand || '').toUpperCase().trim())
      .filter(Boolean);
    return Array.from(new Set(brands)).slice(0, 8);
  }, [orders]);

  // Devices matching history and default offline models
  const allDeviceModels = useMemo(() => {
    const sortedOrders = [...(orders || [])].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const fromOrders = sortedOrders
      .filter(o => o.deviceBrand && o.deviceModel)
      .map(o => ({
        brand: o.deviceBrand.trim().toUpperCase(),
        model: o.deviceModel.trim().toUpperCase(),
        modelNumber: o.deviceModelNumber || '',
        type: 'Celular'
      }));

    const fromCatalog = (config?.customDeviceModels || [])
      .filter((d: any) => !d._excluded && d.brand && d.model)
      .map((d: any) => ({
        brand: d.brand.trim().toUpperCase(),
        model: d.model.trim().toUpperCase(),
        modelNumber: d.modelNumber || '',
        type: d.type || 'Celular'
      }));

    const seen = new Set<string>();
    const uniqueModels: Array<{ brand: string; model: string; modelNumber: string; type: string }> = [];

    [...fromOrders, ...fromCatalog, ...(DEFAULT_OFFLINE_MODELS || [])].forEach(m => {
      const key = `${m.brand.trim().toUpperCase()}|${m.model.trim().toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueModels.push({
          brand: m.brand.trim().toUpperCase(),
          model: m.model.trim().toUpperCase(),
          modelNumber: m.modelNumber || '',
          type: m.type || 'Celular'
        });
      }
    });

    return uniqueModels;
  }, [orders, config]);

  // Local database filtered suggestions
  const filteredDeviceModels = useMemo(() => {
    const searchQ = deviceSearchQuery.trim().toUpperCase();
    const cleanSearchQ = searchQ.replace(/[^A-Z0-9]/g, '');

    if (!searchQ) {
      return allDeviceModels.slice(0, 8);
    }

    return allDeviceModels.filter(m => {
      const b = (m.brand || '').toUpperCase();
      const md = (m.model || '').toUpperCase();
      const num = (m.modelNumber || '').toUpperCase();
      const combined = `${b} ${md} ${num}`.replace(/[^A-Z0-9]/g, '');
      return (
        combined.includes(cleanSearchQ) ||
        b.includes(searchQ) ||
        md.includes(searchQ) ||
        num.includes(searchQ)
      );
    }).slice(0, 10);
  }, [allDeviceModels, deviceSearchQuery]);

  // Compute compatibles
  const compatibles = useMemo(() => {
    if (!brand || !model) return [];
    return (refacciones || []).filter(r => checkRefaccionCompatibility(r, brand, model) && r.stock >= 0);
  }, [refacciones, brand, model]);

  // Gemini Search useEffect (same logic as MobileApp)
  useEffect(() => {
    const query = deviceSearchQuery.trim();
    if (query.length < 3) {
      setInternetSuggestions([]);
      setIsSearchingInternet(false);
      return;
    }

    setIsSearchingInternet(true);
    const timer = setTimeout(async () => {
      let found: any[] = [];
      try {
        let apiKey = localStorage.getItem('local_gemini_api_key') || '';
        if (!apiKey) {
          const { data } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'gemini_api_key')
            .maybeSingle();
          if (data?.value) apiKey = data.value;
        }

        if (apiKey) {
          const prompt = `Devuelve un arreglo JSON puro sin formato markdown con hasta 4 modelos exactos de dispositivos electrónicos que coincidan con "${query}". IMPORTANTE: Separa estrictamente el nombre comercial del modelo del número técnico de modelo. JSON estricto: [{"brand":"MARCA (ej: SAMSUNG)","model":"NOMBRE_COMERCIAL_SIN_MARCA (ej: GALAXY A55 5G, IPHONE 15 PRO MAX)","modelNumber":"CODIGO_TECNICO (ej: SM-A556B, SM-A550M, A3106)","type":"Celular|Tablet|Laptop|Consola|Reloj"}]`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const json = await response.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              found = parsed.map((item: any) => {
                const sanitized = sanitizeDeviceSelection(
                  item.brand || '',
                  item.model || '',
                  item.modelNumber || '',
                  item.type || 'Celular'
                );
                return {
                  ...sanitized,
                  isInternet: true
                };
              });
            }
          }
        }
      } catch (e) {
        console.warn('[Gemini AI Search in Modal] failed:', e);
      }

      // Strategy 2: If Gemini returned no results or there's no API key, synthesize a smart fallback
      if (found.length === 0) {
        const qUpper = query.toUpperCase();
        let brand = 'GENÉRICO';
        let type = 'Celular';
        let model = qUpper;
        let modelNumber = '';

        if (qUpper.includes('IPHONE') || qUpper.includes('IPAD') || qUpper.includes('APPLE') || /^A\d{4}$/.test(qUpper)) {
          brand = 'APPLE';
          if (qUpper.includes('IPAD')) type = 'Tablet';
          else if (qUpper.includes('WATCH')) type = 'Watch';
          else if (qUpper.includes('MACBOOK')) type = 'Laptop';
          else type = 'Celular';

          if (/^A\d{4}$/.test(qUpper)) {
            modelNumber = qUpper;
          }
        } else if (qUpper.includes('SAMSUNG') || qUpper.includes('GALAXY') || qUpper.startsWith('SM-')) {
          brand = 'SAMSUNG';
          if (qUpper.includes('TAB')) type = 'Tablet';
          else if (qUpper.includes('WATCH')) type = 'Watch';
          else type = 'Celular';

          if (qUpper.startsWith('SM-')) {
            modelNumber = qUpper;
          }
        } else if (qUpper.includes('XIAOMI') || qUpper.includes('REDMI') || qUpper.includes('POCO')) {
          brand = 'XIAOMI';
          type = 'Celular';
        } else if (qUpper.includes('MOTO') || qUpper.includes('MOTOROLA') || qUpper.startsWith('XT')) {
          brand = 'MOTOROLA';
          type = 'Celular';
          if (qUpper.startsWith('XT')) {
            modelNumber = qUpper;
          }
        } else if (qUpper.includes('NINTENDO') || qUpper.includes('SWITCH') || qUpper.includes('PLAYSTATION') || qUpper.includes('PS5') || qUpper.includes('PS4') || qUpper.includes('XBOX')) {
          if (qUpper.includes('NINTENDO') || qUpper.includes('SWITCH')) brand = 'NINTENDO';
          else if (qUpper.includes('PLAYSTATION') || qUpper.includes('PS')) brand = 'SONY';
          else brand = 'MICROSOFT';
          type = 'Consola';
        }

        const sanitized = sanitizeDeviceSelection(brand, model, modelNumber, type);
        found = [{ ...sanitized, isInternet: true }];
      }

      setInternetSuggestions(found);
      setIsSearchingInternet(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [deviceSearchQuery]);

  if (!isOpen) return null;

  // Toggle parts
  const handleTogglePart = (ref: any) => {
    const isSelected = selectedParts.some(p => p.refaccionId === ref.id);
    const displayPrice = customPartPrices[ref.id] !== undefined ? customPartPrices[ref.id] : ref.price;
    
    let nextParts: any[];
    if (isSelected) {
      nextParts = selectedParts.filter(p => p.refaccionId !== ref.id);
    } else {
      nextParts = [...selectedParts, {
        name: ref.name,
        cost: ref.cost,
        price: displayPrice,
        refaccionId: ref.id,
        fromStock: ref.stock > 0
      }];
    }
    setSelectedParts(nextParts);
    
    // Auto-prefill step 1 properties
    const totalCost = nextParts.reduce((sum, p) => sum + (p.price || 0), 0);
    setServicePrice(totalCost);
    
    if (nextParts.length === 0) {
      setSelectedServiceName('');
      setServiceQuery('');
    } else {
      const serviceNames = nextParts.map(p => {
        const catalogRef = refacciones.find(r => r.id === p.refaccionId);
        const cleanCat = catalogRef ? catalogRef.category.toLowerCase().replace(/s$/, '') : '';
        const matchedSvc = INITIAL_SERVICES.find(s => {
          const sName = s.name.toLowerCase();
          return sName.includes(cleanCat) || sName.includes(p.name.toLowerCase());
        });
        const baseName = matchedSvc ? matchedSvc.name.toUpperCase() : `REEMPLAZO DE ${p.name.toUpperCase()}`;
        return baseName;
      });
      const joinedName = Array.from(new Set(serviceNames)).join(' Y ');
      setSelectedServiceName(joinedName);
      setServiceQuery(joinedName);
    }
  };

  const handleNextStep0 = () => {
    if (!brand.trim() || !model.trim()) {
      alert('⚠️ Selecciona o registra la marca y modelo del equipo.');
      return;
    }
    
    // Skip Step 1 if parts are selected
    if (selectedParts.length > 0) {
      handleFinalSave(Number(servicePrice) || 0, selectedServiceName);
    } else {
      setStep(1);
    }
  };

  const handleFinalSave = (finalCost: number, finalName: string) => {
    let finalPin = 'SIN CLAVE';
    if (pinType === 'pin') {
      finalPin = pinValue.trim() || 'SIN CLAVE';
    } else if (pinType === 'pattern') {
      finalPin = patternNodes.length > 0 ? `PATRÓN: ${patternNodes.join('-')}` : 'SIN CLAVE';
    }

    onConfirm({
      deviceType: deviceType === 'Celular' ? 'Phone' : deviceType,
      deviceBrand: brand.toUpperCase().trim(),
      deviceModel: model.toUpperCase().trim(),
      deviceModelNumber: modelNumber.toUpperCase().trim(),
      devicePin: finalPin,
      receivedAccessories: selectedAccessories,
      faultDescription: finalName.toUpperCase().trim(),
      serviceType: finalName.toUpperCase().trim(),
      cost: finalCost,
      parts: selectedParts
    });
  };

  const accessoryOptions = [
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

  const handleSelectSuggestedDevice = (s: any) => {
    const clean = sanitizeDeviceSelection(s.brand, s.model, s.modelNumber || '', s.type || 'Celular');
    setBrand(clean.brand);
    setModel(clean.model);
    setModelNumber(clean.modelNumber);
    setDeviceType(clean.type);
    setIsRegisteringManual(false);
    setIsCollapsed(true);
    setDeviceSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-3 font-sans overflow-hidden">
      <div className={`w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border p-5 flex flex-col gap-4 shadow-2xl relative scrollbar-thin ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-white'
      }`}>
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
            isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700'
          }`}
        >
          ✕
        </button>

        {/* Stepper progress indicator */}
        <div className="flex flex-col gap-1 items-center pt-1 border-b pb-3.5 border-zinc-800/10 dark:border-zinc-800/40">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Recepción Múltiple</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`h-4 px-2 rounded-full text-[8.5px] font-black flex items-center justify-center uppercase ${
              step === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}>
              1. DISPOSITIVO
            </span>
            <span className="text-zinc-500 font-bold">➔</span>
            <span className={`h-4 px-2 rounded-full text-[8.5px] font-black flex items-center justify-center uppercase ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}>
              2. SERVICIO
            </span>
          </div>
        </div>

        {/* STEP 0: DEVICE DETAIL */}
        {step === 0 && (
          <div className="flex flex-col gap-4 pr-1">
            
            {/* 1. Device Selection or Search */}
            {!isRegisteringManual && !model ? (
              <div className="flex flex-col gap-3">
                <div className="text-center mb-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    BUSCAR EQUIPO EN HISTORIAL
                  </h4>
                  <p className="text-[8.5px] text-zinc-500 mt-0.5">
                    Selecciona un modelo frecuente o busca inteligente
                  </p>
                </div>

                {/* Search input field */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold text-zinc-400 tracking-widest uppercase text-left">
                    MODELO DEL DISPOSITIVO:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. GALAXY S24, IPHONE 15, MOTO G84..."
                      value={deviceSearchQuery}
                      onChange={(e) => setDeviceSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredDeviceModels.length > 0) {
                            handleSelectSuggestedDevice(filteredDeviceModels[0]);
                          } else if (deviceSearchQuery.trim()) {
                            const clean = sanitizeDeviceSelection('GENÉRICO', deviceSearchQuery.trim(), deviceSearchQuery.trim(), 'Celular');
                            setBrand(clean.brand);
                            setModel(clean.model);
                            setModelNumber(clean.modelNumber);
                            setDeviceType(clean.type);
                            setIsRegisteringManual(true);
                          }
                        }
                      }}
                      className={`w-full h-10 pl-9 pr-8 text-xs font-bold uppercase rounded-xl focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-slate-50 border border-slate-250' : 'bg-zinc-950 border border-zinc-800'
                      }`}
                    />
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    {deviceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDeviceSearchQuery('')}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-white font-black text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Internet search indicator */}
                {isSearchingInternet && (
                  <div className="p-2.5 text-center text-[10px] text-blue-400 font-bold flex items-center justify-center gap-1.5 rounded-xl bg-blue-950/20 border border-blue-800/40 animate-pulse">
                    <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>🌐 Buscando en internet con IA...</span>
                  </div>
                )}

                {/* Internet / IA suggestions */}
                {internetSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-blue-400 text-left">
                      🌐 COINCIDENCIAS EN INTERNET / IA:
                    </span>
                    {internetSuggestions.map((m, idx) => (
                      <div
                        key={`ai-${idx}`}
                        onClick={() => handleSelectSuggestedDevice(m)}
                        className={`p-2.5 rounded-xl border flex justify-between items-center transition-all cursor-pointer active:scale-98 ${
                          isLight ? 'bg-blue-50/70 border-blue-300 text-blue-950' : 'bg-violet-950/40 border-violet-700/60 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">🌐</span>
                          <div className="text-left">
                            <p className="text-xs font-black uppercase">{m.brand} {m.model}</p>
                            <p className="text-[8.5px] text-blue-400 font-bold uppercase mt-0.5">
                              {m.modelNumber ? `Mod: ${m.modelNumber} • ` : ''}{m.type}
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white shadow-sm">
                          Usar
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual form trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const clean = sanitizeDeviceSelection('GENÉRICO', deviceSearchQuery.trim(), deviceSearchQuery.trim(), 'Celular');
                    setBrand(clean.brand);
                    setModel(clean.model);
                    setModelNumber(clean.modelNumber);
                    setDeviceType(clean.type);
                    setIsRegisteringManual(true);
                  }}
                  className={`py-2 px-3 rounded-xl border border-dashed text-xs font-bold text-center transition-all cursor-pointer ${
                    isLight ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-violet-950/20 border-violet-800/40 text-violet-300'
                  }`}
                >
                  ➕ Registrar nuevo modelo manualmente
                </button>

                {/* Local database matching and frequent history list */}
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 mt-1 text-left">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-zinc-500 block mb-0.5">
                    {deviceSearchQuery ? '📂 Coincidencias en Historial:' : '⚡ Equipos Frecuentes:'}
                  </span>
                  {filteredDeviceModels.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestedDevice(m)}
                      className={`p-2.5 rounded-xl border flex justify-between items-center transition-all cursor-pointer active:scale-98 ${
                        isLight ? 'bg-white border-slate-200 hover:border-blue-300 text-slate-800' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase">{m.brand} {m.model}</p>
                          <p className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5">
                            {m.modelNumber ? `Mod: ${m.modelNumber} • ` : ''}{m.type}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[8.5px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                        isLight ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        Historial ➙
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Collapsed Device Identification Card */
              <div className="flex flex-col gap-3">
                {compatibles.length > 0 && isCollapsed ? (
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all animate-fade-in ${
                    isLight ? 'bg-blue-50/30 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2.5 text-left">
                      <span className="text-xl">📱</span>
                      <div>
                        <p className={`font-black uppercase ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          {brand} {model}
                        </p>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">
                          {modelNumber ? `No. Modelo: ${modelNumber}` : 'Sin No. Modelo'} • {deviceType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCollapsed(false)}
                      className="text-xs font-black uppercase text-blue-500 hover:underline cursor-pointer"
                    >
                      Modificar
                    </button>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-2xl border flex flex-col gap-3 relative ${
                    isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                  }`}>
                    {compatibles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-350 text-[9px] font-black uppercase font-mono border border-dashed border-zinc-700/50 px-2 py-0.5 rounded-lg cursor-pointer"
                      >
                        Minimizar ⌃
                      </button>
                    )}
                    <div>
                      <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Tipo de Dispositivo</label>
                      <div className="grid grid-cols-5 gap-1">
                        {['Celular', 'Tablet', 'Laptop', 'Consola', 'Reloj'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDeviceType(t)}
                            className={`py-1 rounded-lg text-[8.5px] font-black uppercase transition-all ${
                              deviceType === t ? 'bg-blue-600 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400')
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Marca *</label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value.toUpperCase())}
                          className={`w-full h-8 px-2.5 text-xs font-bold rounded-xl focus:outline-none ${
                            isLight ? 'bg-slate-50 border border-slate-250' : 'bg-zinc-950 border border-zinc-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Modelo *</label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value.toUpperCase())}
                          className={`w-full h-8 px-2.5 text-xs font-bold rounded-xl focus:outline-none ${
                            isLight ? 'bg-slate-50 border border-slate-250' : 'bg-zinc-950 border border-zinc-800'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">No. Modelo</label>
                      <input
                        type="text"
                        value={modelNumber}
                        onChange={(e) => setModelNumber(e.target.value.toUpperCase())}
                        className={`w-full h-8 px-2.5 text-xs font-bold rounded-xl focus:outline-none ${
                          isLight ? 'bg-slate-50 border border-slate-250' : 'bg-zinc-950 border border-zinc-800'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBrand(''); setModel(''); setIsRegisteringManual(false); }}
                      className="text-[9px] font-black uppercase text-rose-500 border border-dashed border-rose-500/40 p-2 rounded-xl text-center block mt-1"
                    >
                      🔄 Cambiar Equipo
                    </button>
                  </div>
                )}

                {/* 2. Pin & Security */}
                <div className="p-3 rounded-2xl border bg-zinc-500/5 border-zinc-500/10 flex flex-col gap-2.5">
                  <label className="text-[9.5px] font-black uppercase text-zinc-500 block">Acceso y Seguridad</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['none', 'pin', 'pattern'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPinType(t as any)}
                        className={`py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer text-center ${
                          pinType === t ? 'bg-blue-600 text-white' : (isLight ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400')
                        }`}
                      >
                        {t === 'none' ? 'Sin Clave' : t === 'pin' ? 'Código PIN' : 'Patrón'}
                      </button>
                    ))}
                  </div>

                  {pinType === 'pin' && (
                    <input
                      type="text"
                      value={pinValue}
                      onChange={(e) => setPinValue(e.target.value)}
                      placeholder="Ingresa PIN..."
                      className={`w-full h-9 px-3 text-xs font-bold rounded-xl text-center focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                      }`}
                    />
                  )}

                  {pinType === 'pattern' && (
                    (() => {
                      const nodeR = 9;
                      const pos = (n: number) => {
                        const row = Math.floor(n / 3);
                        const col = n % 3;
                        return { x: 18 + col * 20, y: 18 + row * 20 };
                      };
                      const color = isLight ? '#2563eb' : '#8b5cf6';
                      const lastNodePos = patternNodes.length > 0 ? pos(patternNodes[patternNodes.length - 1]) : null;

                      const handlePointerMoveOrTouch = (clientX: number, clientY: number) => {
                        if (!patternSvgRef.current) return;
                        const rect = patternSvgRef.current.getBoundingClientRect();
                        const scaleX = 76 / rect.width;
                        const scaleY = 76 / rect.height;
                        const x = Math.max(0, Math.min(76, (clientX - rect.left) * scaleX));
                        const y = Math.max(0, Math.min(76, (clientY - rect.top) * scaleY));

                        setPatternTouchPos({ x, y });

                        for (let n = 0; n < 9; n++) {
                          const p = pos(n);
                          const dist = Math.hypot(p.x - x, p.y - y);
                          if (dist < 8) {
                            setPatternNodes(prev => {
                              if (prev.includes(n)) return prev;
                              return [...prev, n];
                            });
                            break;
                          }
                        }
                      };

                      return (
                        <div className="flex flex-col items-center gap-2 py-1">
                          <div 
                            className={`relative p-2.5 rounded-2xl border shadow-inner select-none touch-none ${
                              isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
                            }`}
                            onPointerDown={(e) => {
                              setIsDraggingPattern(true);
                              handlePointerMoveOrTouch(e.clientX, e.clientY);
                            }}
                            onPointerMove={(e) => {
                              if (isDraggingPattern) {
                                handlePointerMoveOrTouch(e.clientX, e.clientY);
                              }
                            }}
                            onPointerUp={() => {
                              setIsDraggingPattern(false);
                              setPatternTouchPos(null);
                            }}
                            onTouchStart={(e) => {
                              if (e.touches.length > 0) {
                                setIsDraggingPattern(true);
                                handlePointerMoveOrTouch(e.touches[0].clientX, e.touches[0].clientY);
                              }
                            }}
                            onTouchMove={(e) => {
                              if (isDraggingPattern && e.touches.length > 0) {
                                handlePointerMoveOrTouch(e.touches[0].clientX, e.touches[0].clientY);
                              }
                            }}
                            onTouchEnd={() => {
                              setIsDraggingPattern(false);
                              setPatternTouchPos(null);
                            }}
                          >
                            <svg 
                              ref={patternSvgRef} 
                              width="150" 
                              height="150" 
                              viewBox="0 0 76 76" 
                              className="mx-auto block"
                            >
                              {/* Direct lines between active nodes */}
                              {patternNodes.map((n, i) => {
                                if (i === 0) return null;
                                const a = pos(patternNodes[i - 1]);
                                const b = pos(n);

                                const dx = b.x - a.x; const dy = b.y - a.y;
                                const len = Math.sqrt(dx*dx + dy*dy);
                                let arrowEl = null;
                                if (len > 0) {
                                  const ux = dx / len; const uy = dy / len;
                                  const px = -uy; const py = ux;
                                  const mid = { x: a.x + dx * 0.5, y: a.y + dy * 0.5 };
                                  const arrowSize = 2;
                                  const tip = mid;
                                  const base = { x: tip.x - ux * arrowSize, y: tip.y - uy * arrowSize };
                                  const l1 = { x: base.x + px * arrowSize * 0.7, y: base.y + py * arrowSize * 0.7 };
                                  const l2 = { x: base.x - px * arrowSize * 0.7, y: base.y - py * arrowSize * 0.7 };
                                  arrowEl = <polygon points={`${tip.x},${tip.y} ${l1.x},${l1.y} ${l2.x},${l2.y}`} fill={color} />;
                                }

                                return (
                                  <g key={i}>
                                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="3" strokeLinecap="round" />
                                    {arrowEl}
                                  </g>
                                );
                              })}

                              {/* Live trace line to current finger position while dragging */}
                              {isDraggingPattern && lastNodePos && patternTouchPos && (
                                <line 
                                  x1={lastNodePos.x} 
                                  y1={lastNodePos.y} 
                                  x2={patternTouchPos.x} 
                                  y2={patternTouchPos.y} 
                                  stroke={color} 
                                  strokeWidth="2.5" 
                                  strokeDasharray="3 3"
                                  strokeLinecap="round" 
                                />
                              )}

                              {/* 9 Nodes */}
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                                const p = pos(n);
                                const idx = patternNodes.indexOf(n);
                                const active = idx !== -1;

                                return (
                                  <g 
                                    key={n} 
                                    onClick={() => {
                                      setPatternNodes(prev => {
                                        if (prev.includes(n)) return prev;
                                        return [...prev, n];
                                      });
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <circle 
                                      cx={p.x} 
                                      cy={p.y} 
                                      r={active ? nodeR : 4.5} 
                                      fill={active ? color : (isLight ? '#cbd5e1' : '#3f3f46')} 
                                      className="transition-all"
                                    />
                                    {active && (
                                      <text 
                                        x={p.x} 
                                        y={p.y} 
                                        fill="#ffffff" 
                                        fontSize="8px" 
                                        fontWeight="900" 
                                        textAnchor="middle" 
                                        dominantBaseline="middle"
                                      >
                                        {idx + 1}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          </div>

                          {patternNodes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setPatternNodes([])}
                              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                isLight 
                                  ? 'bg-slate-200/80 border-slate-300 text-slate-700 hover:bg-slate-300' 
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              🔄 Limpiar Patrón ({patternNodes.map(n => n + 1).join(' ➔ ')})
                            </button>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* 3. Accessories */}
                <div className="rounded-2xl border border-zinc-500/10">
                  <button
                    type="button"
                    onClick={() => setShowAccessories(!showAccessories)}
                    className={`w-full px-3 py-2.5 flex justify-between items-center text-[9.5px] font-black uppercase text-zinc-500 cursor-pointer ${
                      showAccessories ? 'border-b border-zinc-500/10' : ''
                    }`}
                  >
                    <span>📦 Accesorios Recibidos ({selectedAccessories.length})</span>
                    <span>{showAccessories ? '⌃' : '⌄'}</span>
                  </button>
                  {showAccessories && (
                    <div className="p-3 grid grid-cols-3 gap-1 animate-fade-in bg-zinc-500/5">
                      {accessoryOptions.map((acc) => {
                        const isSelected = selectedAccessories.includes(acc);
                        return (
                          <button
                            key={acc}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAccessories(prev => prev.filter(a => a !== acc));
                              } else {
                                setSelectedAccessories(prev => [...prev, acc]);
                              }
                            }}
                            className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${
                              isSelected ? 'bg-blue-600 text-white' : (isLight ? 'bg-slate-100 text-slate-600' : 'bg-zinc-850 text-zinc-400')
                            }`}
                          >
                            {acc}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Compatible Parts List */}
                {compatibles.length > 0 && (
                  <div className="p-3 rounded-2xl border bg-zinc-500/5 border-zinc-500/10 flex flex-col gap-2.5">
                    <label className="text-[9.5px] font-black uppercase text-zinc-500 block">Piezas Compatibles en Stock ({compatibles.length})</label>
                    <input
                      type="text"
                      placeholder="Filtrar piezas compatibles..."
                      value={partsSearch}
                      onChange={(e) => setPartsSearch(e.target.value)}
                      className={`w-full h-8 px-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-slate-50 border border-slate-250' : 'bg-zinc-950 border border-zinc-800'
                      }`}
                    />
                    <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                      {compatibles
                        .filter(r => (r.name || '').toLowerCase().includes(partsSearch.toLowerCase()))
                        .map((ref) => {
                          const isSelected = selectedParts.some(p => p.refaccionId === ref.id);
                          const displayPrice = customPartPrices[ref.id] !== undefined ? customPartPrices[ref.id] : ref.price;
                          return (
                            <div
                              key={ref.id}
                              onClick={() => handleTogglePart(ref)}
                              className={`p-2 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                  : (isLight ? 'bg-slate-100/50 border-slate-200 text-slate-800' : 'bg-zinc-950/40 border-zinc-850 text-white')
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                />
                                <div className="text-left">
                                  <p className="text-[9.5px] font-black uppercase truncate max-w-[150px]">{ref.name}</p>
                                  <p className="text-[7.5px] text-zinc-500 font-bold uppercase mt-0.5">Stock: {ref.stock} pz</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9.5px] font-black font-mono text-emerald-400">
                                  {config.currencySymbol || '$'}{displayPrice.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOverridePart(ref);
                                    setOverrideModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded-lg cursor-pointer ${
                                    isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                                  }`}
                                >
                                  ✏️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: SERVICE & FAULT */}
        {step === 1 && (
          <div className="flex flex-col gap-4 pr-1 animate-fade-in">
            {/* Collapsed selected device info */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-violet-950/20 border-violet-800/40'
            }`}>
              <div className="flex items-center gap-2 text-left">
                <span className="text-base">📱</span>
                <div>
                  <p className="text-[8.5px] font-black uppercase text-zinc-400">Dispositivo Seleccionado</p>
                  <p className="font-black uppercase">{brand} {model}</p>
                </div>
              </div>
              <button type="button" onClick={() => setStep(0)} className="text-[9px] font-black uppercase text-blue-500 underline">Modificar</button>
            </div>

            {/* Confirm Service price */}
            {isConfirmingPrice ? (
              <div className={`p-4 rounded-2xl border flex flex-col gap-3 animate-fade-in ${
                isLight ? 'bg-white border-blue-300 shadow-md' : 'bg-zinc-900 border-violet-700/50 shadow-xl'
              }`}>
                <h4 className="text-xs font-black uppercase text-center text-blue-500">Confirmar Precio de Servicio</h4>
                <div>
                  <label className="text-[9.5px] font-black uppercase text-zinc-500">Nombre de Servicio *</label>
                  <input
                    type="text"
                    value={selectedServiceName}
                    onChange={(e) => setSelectedServiceName(e.target.value.toUpperCase())}
                    className={`w-full h-10 px-3 text-xs font-bold uppercase mt-1 rounded-xl focus:outline-none focus:ring-1 ${
                      isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-black uppercase text-zinc-500">Costo Estimado ($) *</label>
                  <input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full h-10 px-3 text-xs font-bold mt-1 rounded-xl focus:outline-none focus:ring-1 ${
                      isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmingPrice(false)}
                  className="text-[9px] font-bold text-blue-500 uppercase underline text-center block mt-1"
                >
                  Cambiar Servicio
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-left">
                <label className="text-[9.5px] font-black uppercase text-zinc-500 block mb-0.5">Buscar o definir el servicio a realizar</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribe el servicio a realizar..."
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && serviceQuery.trim()) {
                        setSelectedServiceName(serviceQuery.trim().toUpperCase());
                        setServicePrice('');
                        setIsConfirmingPrice(true);
                      }
                    }}
                    className={`w-full h-10 px-3 text-xs font-bold uppercase rounded-xl focus:outline-none focus:ring-1 ${
                      isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                    }`}
                  />
                </div>

                {/* Service suggestions */}
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(INITIAL_SERVICES.filter(s => s.name.toLowerCase().includes(serviceQuery.toLowerCase())))
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceName(s.name.toUpperCase());
                          setServicePrice(s.cost);
                          setIsConfirmingPrice(true);
                        }}
                        className={`w-full p-2.5 text-xs text-left rounded-xl border flex justify-between items-center transition-colors ${
                          isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800'
                        }`}
                      >
                        <span className="font-bold">{s.name}</span>
                        <span className="font-mono text-emerald-400 font-black">{config.currencySymbol || '$'}{s.cost}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-2.5 mt-2 border-t pt-3 border-zinc-800/10 dark:border-zinc-800/40 shrink-0">
          {step === 0 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 h-10 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleNextStep0}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(0)}
                className={`flex-1 h-10 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalCost = Number(servicePrice) || 0;
                  const finalName = selectedServiceName.trim();
                  if (!finalName) {
                    alert('⚠️ Especifica el nombre del servicio.');
                    return;
                  }
                  handleFinalSave(finalCost, finalName);
                }}
                className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Agregar Equipo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Internal price override portal */}
      {overrideModalOpen && overridePart && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 animate-fade-in select-none">
          <div className={`w-full max-w-xs p-5 rounded-3xl border flex flex-col gap-4 shadow-2xl relative ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            <button
              type="button"
              onClick={() => { setOverrideModalOpen(false); setOverridePart(null); }}
              className={`absolute top-4 right-4 h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
                isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700'
              }`}
            >
              ✕
            </button>
            <div className="text-center pt-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block font-sans">AUTORIZACIÓN REQUERIDA</span>
              <h4 className="text-xs font-black uppercase text-rose-500 mt-0.5 truncate px-6 block font-sans">
                EDITAR PRECIO: {overridePart.name}
              </h4>
            </div>
            {/* Simple mobile PIN / Authorization form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanPrice = (e.currentTarget.elements.namedItem('new_price') as HTMLInputElement).value;
                const priceNum = parseFloat(cleanPrice);
                if (isNaN(priceNum) || priceNum < 0) {
                  alert('Precio inválido');
                  return;
                }
                const pinInput = (e.currentTarget.elements.namedItem('pin_code') as HTMLInputElement).value;
                const admins = (users || []).filter(u => u.role === 'admin' || u.permissions.canEditPrice);
                const pinMatches = admins.length === 0 ? pinInput === '1234' : admins.some(u => u.pin === pinInput);
                const isAuthorized = currentUser?.permissions.canEditPrice || pinMatches;
                
                if (isAuthorized) {
                  const refId = overridePart.id;
                  setCustomPartPrices(prev => ({ ...prev, [refId]: priceNum }));
                  setSelectedParts(currentParts => {
                    const isSel = currentParts.some(p => p.refaccionId === refId);
                    if (!isSel) return currentParts;
                    const next = currentParts.map(p => p.refaccionId === refId ? { ...p, price: priceNum } : p);
                    const totalCost = next.reduce((sum, p) => sum + (p.price || 0), 0);
                    setServicePrice(totalCost);
                    return next;
                  });
                  setOverrideModalOpen(false);
                  setOverridePart(null);
                } else {
                  alert('PIN incorrecto o sin autorización');
                }
              }}
              className="flex flex-col gap-3"
            >
              {!currentUser?.permissions.canEditPrice && (
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-zinc-400 font-sans block text-left">PIN DE AUTORIZACIÓN (ADMIN)</label>
                  <input
                    name="pin_code"
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="••••"
                    required
                    className={`w-full h-10 px-3 text-center text-xs font-mono font-bold tracking-widest rounded-xl focus:outline-none focus:ring-1 ${
                      isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                    }`}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-zinc-400 font-sans block text-left">NUEVO PRECIO ({config.currencySymbol || '$'})</label>
                <input
                  name="new_price"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={customPartPrices[overridePart.id] !== undefined ? customPartPrices[overridePart.id] : overridePart.price}
                  required
                  className={`w-full h-10 px-3 text-center text-xs font-mono font-bold rounded-xl focus:outline-none focus:ring-1 ${
                    isLight ? 'bg-slate-50 border border-slate-250 text-slate-800' : 'bg-zinc-950 border border-zinc-800 text-white'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer font-sans"
              >
                Guardar Precio
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
