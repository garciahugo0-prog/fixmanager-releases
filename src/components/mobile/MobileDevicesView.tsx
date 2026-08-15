import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  AlertTriangle,
  Smartphone,
  Tablet as TabletIcon,
  Laptop as LaptopIcon,
  Monitor,
  HelpCircle
} from 'lucide-react';
import { DEFAULT_OFFLINE_MODELS } from '../../data';
import { RepairOrder } from '../../types';

interface DeviceModelItem {
  brand: string;
  model: string;
  modelNumber?: string;
  type: 'Phone' | 'Tablet' | 'Laptop' | 'Desktop' | 'Other';
  source?: 'custom' | 'system' | 'history';
  idx: number | null;
}

interface MobileDevicesViewProps {
  config: any;
  orders: RepairOrder[];
  isLight: boolean;
  onUpdateConfig: (newConfig: any) => void;
  onClose: () => void;
}

export default function MobileDevicesView({
  config,
  orders = [],
  isLight,
  onUpdateConfig,
  onClose
}: MobileDevicesViewProps) {
  // Navigation & UI search
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form states
  const [devBrand, setDevBrand] = useState('');
  const [devModel, setDevModel] = useState('');
  const [devModelNumber, setDevModelNumber] = useState('');
  const [devType, setDevType] = useState<'Phone' | 'Tablet' | 'Laptop' | 'Desktop' | 'Other'>('Phone');
  
  // Edit tracker
  const [editingDevIdx, setEditingDevIdx] = useState<number | null>(null);
  const [originalDevToEdit, setOriginalDevToEdit] = useState<{ brand: string; model: string } | null>(null);

  // Focus Refs
  const modelRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  // Keyboard adjustment for iOS Capacitor
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleKeyboardShow = (e: any) => {
      if (e.detail && e.detail.keyboardHeight) {
        setKeyboardHeight(e.detail.keyboardHeight);
      } else {
        setKeyboardHeight(280); // Fallback standard height
      }
    };
    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    window.addEventListener('keyboardWillShow', handleKeyboardShow);
    window.addEventListener('keyboardWillHide', handleKeyboardHide);
    window.addEventListener('ionKeyboardDidShow', handleKeyboardShow);
    window.addEventListener('ionKeyboardDidHide', handleKeyboardHide);

    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardHide);
      window.removeEventListener('ionKeyboardDidShow', handleKeyboardShow);
      window.removeEventListener('ionKeyboardDidHide', handleKeyboardHide);
    };
  }, []);

  // Dialog notifications
  const [dialog, setDialog] = useState<{
    type: 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Unified device models list matching desktop logic
  const deviceCatalog = useMemo(() => {
    const allCustom = config.customDeviceModels || [];
    const excluded = new Set(
      allCustom.filter((d: any) => d._excluded).map((d: any) => `${d.brand.toLowerCase()}|${d.model.toLowerCase()}`)
    );

    // 1. Custom entries
    const custom: DeviceModelItem[] = allCustom
      .map((d: any, i: number) => ({
        brand: d.brand,
        model: d.model,
        modelNumber: d.modelNumber,
        type: d.type || 'Phone',
        source: 'custom' as const,
        idx: i
      }))
      .filter((d: any) => !d._excluded);

    // 2. System default entries
    const systemRaw = (DEFAULT_OFFLINE_MODELS || []).map(m => ({
      brand: m.brand,
      model: m.model,
      modelNumber: m.modelNumber,
      type: m.type as any || 'Phone',
      source: 'system' as const,
      idx: null as number | null
    }));

    // 3. Historical entries from orders
    const historicalRaw = orders
      .filter(o => o.deviceBrand && o.deviceModel)
      .map(o => ({
        brand: o.deviceBrand,
        model: o.deviceModel,
        modelNumber: o.deviceModelNumber,
        type: (o.deviceType as any) || 'Phone',
        source: 'history' as const,
        idx: null as number | null
      }));

    const customKeys = new Set(custom.map(d => `${d.brand.toLowerCase()}|${d.model.toLowerCase()}`));

    // Deduplicate system models
    const uniqueSystem = systemRaw.filter(
      d => !customKeys.has(`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`) && 
           !excluded.has(`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`)
    );
    const systemKeys = new Set(uniqueSystem.map(d => `${d.brand.toLowerCase()}|${d.model.toLowerCase()}`));

    // Deduplicate historical models
    const history = historicalRaw.filter(
      d => !customKeys.has(`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`) &&
           !systemKeys.has(`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`) &&
           !excluded.has(`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`)
    );

    const seenHistory = new Set<string>();
    const uniqueHistory = history.filter(d => {
      const key = `${d.brand.toLowerCase()}|${d.model.toLowerCase()}`;
      if (seenHistory.has(key)) return false;
      seenHistory.add(key);
      return true;
    });

    return [...custom, ...uniqueSystem, ...uniqueHistory];
  }, [config.customDeviceModels, orders]);

  // Filter devices based on search query
  const filteredDevices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return deviceCatalog;
    return deviceCatalog.filter(
      d =>
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        (d.modelNumber || '').toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
    );
  }, [deviceCatalog, searchTerm]);

  // Form cancel
  const handleCancelEdit = () => {
    setEditingDevIdx(null);
    setOriginalDevToEdit(null);
    setDevBrand('');
    setDevModel('');
    setDevModelNumber('');
    setDevType('Phone');
    setShowFormModal(false);
  };

  // Start edit flow
  const handleStartEdit = (dev: DeviceModelItem) => {
    setDevBrand(dev.brand);
    setDevModel(dev.model);
    setDevModelNumber(dev.modelNumber || '');
    setDevType(dev.type || 'Phone');
    setEditingDevIdx(dev.idx);
    setOriginalDevToEdit(dev.idx === null ? { brand: dev.brand, model: dev.model } : null);
    setShowFormModal(true);
  };

  // Save backend config logic matching desktop version
  const executeSave = (brandText: string, modelText: string, codeText: string, typeText: any) => {
    const current = [...(config.customDeviceModels || [])];
    const normalizedBrand = brandText.toLowerCase().trim();
    const normalizedModel = modelText.toLowerCase().trim();

    if (editingDevIdx !== null) {
      // Edit existing custom device
      current[editingDevIdx] = { 
        brand: brandText.trim(), 
        model: modelText.trim(), 
        modelNumber: codeText.trim() || undefined, 
        type: typeText 
      };

      // Clean excludes
      const cleaned = current.filter((d: any, idx: number) => {
        if (idx === editingDevIdx) return true;
        const matchesNewName = d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel;
        if (matchesNewName && d._excluded) return false;
        return true;
      });

      onUpdateConfig({ ...config, customDeviceModels: cleaned });
      showFeedback(`✅ Modelo "${modelText}" actualizado.`);
      handleCancelEdit();
    } else {
      if (originalDevToEdit) {
        // Exclude system/history model and add edited version as custom
        const nextList = current.filter(
          (d: any) => !(d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel)
        );
        nextList.push({ brand: originalDevToEdit.brand, model: originalDevToEdit.model, type: typeText, _excluded: true });
        nextList.push({ brand: brandText.trim(), model: modelText.trim(), modelNumber: codeText.trim() || undefined, type: typeText });
        onUpdateConfig({ ...config, customDeviceModels: nextList });
        showFeedback(`✅ Modelo "${modelText}" actualizado.`);
        handleCancelEdit();
      } else {
        // Check restore from excluded first
        const excludedIdx = current.findIndex(
          (d: any) => d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel
        );

        if (excludedIdx !== -1) {
          current[excludedIdx] = { 
            brand: brandText.trim(), 
            model: modelText.trim(), 
            modelNumber: codeText.trim() || undefined, 
            type: typeText 
          };
          onUpdateConfig({ ...config, customDeviceModels: current });
          showFeedback(`✅ "${brandText} ${modelText}" guardado en catálogo.`);
          handleCancelEdit();
        } else {
          // Standard check duplication
          const dup = current.find(
            (d: any) => !d._excluded && d.brand.toLowerCase() === normalizedBrand && d.model.toLowerCase() === normalizedModel
          );

          if (dup) {
            setDialog({
              type: 'error',
              title: 'Modelo Duplicado',
              message: `El modelo "${brandText} ${modelText}" ya se encuentra registrado en el catálogo. Intente con otro nombre o edite el actual.`,
              confirmText: 'Entendido'
            });
            return;
          }

          current.push({ 
            brand: brandText.trim(), 
            model: modelText.trim(), 
            modelNumber: codeText.trim() || undefined, 
            type: typeText 
          });
          onUpdateConfig({ ...config, customDeviceModels: current });
          showFeedback(`✅ "${brandText} ${modelText}" guardado en catálogo.`);
          handleCancelEdit();
        }
      }
    }
    setDialog(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devBrand.trim() || !devModel.trim()) return;
    executeSave(devBrand, devModel, devModelNumber, devType);
  };

  // Delete matching desktop logic
  const handleDelete = (idx: number | null, label: string, brand: string, model: string) => {
    setDialog({
      type: 'confirm',
      title: 'Eliminar Modelo',
      message: idx !== null
        ? `¿Eliminar "${label}" del catálogo? Esta acción no se puede deshacer.`
        : `"${label}" es un modelo predeterminado. Al eliminarlo, se ocultará de las sugerencias del catálogo de forma segura. ¿Continuar?`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        const current = [...(config.customDeviceModels || [])];
        if (idx !== null) {
          // Custom model
          current.splice(idx, 1);
          onUpdateConfig({ ...config, customDeviceModels: current });
        } else {
          // System/History model - exclude it
          current.push({ brand, model, type: devType, _excluded: true } as any);
          onUpdateConfig({ ...config, customDeviceModels: current });
        }
        showFeedback('🗑️ Modelo eliminado del catálogo.');
        setDialog(null);
      }
    });
  };

  // Helper icon renderer based on device type
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Tablet':
        return <TabletIcon className="w-4 h-4 text-cyan-500 stroke-[2.5]" />;
      case 'Laptop':
        return <LaptopIcon className="w-4 h-4 text-cyan-500 stroke-[2.5]" />;
      case 'Desktop':
        return <Monitor className="w-4 h-4 text-cyan-500 stroke-[2.5]" />;
      case 'Other':
        return <HelpCircle className="w-4 h-4 text-cyan-500 stroke-[2.5]" />;
      case 'Phone':
      default:
        return <Smartphone className="w-4 h-4 text-cyan-500 stroke-[2.5]" />;
    }
  };

  const getDeviceTypeName = (type: string) => {
    switch (type) {
      case 'Tablet':
        return 'Tablet';
      case 'Laptop':
        return 'Laptop';
      case 'Desktop':
        return 'PC / Escritorio';
      case 'Other':
        return 'Otro';
      case 'Phone':
      default:
        return 'Teléfono';
    }
  };

  return (
    <section 
      className={`fixed inset-0 z-[999999] flex flex-col select-none ${
        isLight ? 'bg-white text-slate-800' : 'bg-[#0c1224] text-white'
      }`}
    >
      {/* Header (Cohesivo e Integrado estilo iOS Premium) */}
      <header 
        style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}
        className={`px-5 pb-4 shrink-0 flex flex-col gap-4 ${
          isLight ? 'bg-white' : 'bg-[#0c1224]'
        }`}
      >
        {/* Fila del Título, Regreso y botón Nuevo */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                isLight ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight leading-none">Modelos de Equipos</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1 block">Marcas y Dispositivos</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { handleCancelEdit(); setShowFormModal(true); }}
            className="py-2 px-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Buscador Estilo POS (Píldora Limpia) */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar por marca, modelo o código..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 text-xs font-bold transition-colors focus:outline-none"
            style={{
              borderRadius: '9999px',
              border: isLight ? '1px solid #e2e8f0' : '1px solid #27272a',
              backgroundColor: isLight ? '#f8fafc' : '#18181b',
              paddingLeft: '2.75rem',
              paddingRight: '2.5rem',
              height: '2.75rem',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: isLight ? '#1e293b' : '#ffffff',
              outline: 'none',
              boxShadow: 'none'
            }}
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <Search className={`w-4 h-4 ${isLight ? 'text-slate-455' : 'text-zinc-400'}`} />
            <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-zinc-700'}`} />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="w-6 h-6 absolute right-3 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-zinc-455 hover:text-slate-800 dark:hover:text-white font-black text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Feedback pop */}
      {feedback && (
        <div className="absolute top-24 left-4 right-4 z-[100000] p-3 text-xs rounded-2xl border font-bold text-center animate-pulse shadow-md bg-emerald-500 border-emerald-600 text-white">
          {feedback}
        </div>
      )}

      {/* Device Catalog List */}
      <section 
        className={`flex-1 overflow-y-auto p-5 space-y-4 ${
          isLight ? 'bg-white' : 'bg-[#0c1224]'
        }`}
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
      >
        {filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <span className="text-4xl mb-3">📱</span>
            <h4 className="font-extrabold text-sm uppercase tracking-wide">Sin resultados</h4>
            <p className={`text-xs mt-1 max-w-[240px] ${isLight ? 'text-slate-450' : 'text-zinc-550'}`}>
              No encontramos dispositivos que coincidan con la búsqueda. Puedes agregar uno nuevo con el botón superior.
            </p>
          </div>
        ) : (
          filteredDevices.map((dev, dIdx) => {
            const label = `${dev.brand} ${dev.model}`;
            return (
              <div
                key={`${dev.brand}-${dev.model}-${dIdx}`}
                className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all ${
                  isLight 
                    ? 'bg-slate-50/40 border-slate-200/90 text-slate-800 hover:bg-slate-100/30' 
                    : 'bg-zinc-900 border-zinc-800 text-white'
                }`}
              >
                {/* Upper row: Name & Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-sm uppercase tracking-wide leading-tight">
                      {label}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {/* Device Type Badge */}
                      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        isLight ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/60'
                      }`}>
                        {getDeviceIcon(dev.type)}
                        <span>{getDeviceTypeName(dev.type)}</span>
                      </span>

                      {/* Source indicator */}
                      <span className={`inline-flex items-center text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        dev.source === 'custom' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : dev.source === 'system' 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {dev.source === 'custom' ? 'Catálogo' : dev.source === 'system' ? 'Sistema' : 'Historial'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(dev)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                        isLight 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700' 
                          : 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-650'
                      }`}
                      title="Editar modelo"
                    >
                      <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dev.idx, label, dev.brand, dev.model)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                        isLight 
                          ? 'bg-red-500 hover:bg-red-650 text-white border border-red-600' 
                          : 'bg-red-600 hover:bg-red-500 text-white border border-red-750'
                      }`}
                      title="Eliminar modelo"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Model Number / Code if available */}
                {dev.modelNumber && (
                  <div className={`p-2 rounded-2xl text-[10px] font-bold font-mono ${
                    isLight ? 'bg-slate-50 text-slate-500' : 'bg-zinc-950/60 text-zinc-400'
                  }`}>
                    <span className="uppercase text-[8px] tracking-widest block text-zinc-400 mb-0.5">Código Técnico</span>
                    <span>{dev.modelNumber}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* ── Modal Form: Agregar / Editar Equipo ── */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-[100001] flex items-end justify-center p-0" 
          onClick={handleCancelEdit}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sliding sheet container */}
          <form
            onSubmit={handleSubmit}
            onClick={e => e.stopPropagation()}
            style={{ 
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
              transition: 'bottom 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
              paddingBottom: keyboardHeight > 0 
                ? '20px' 
                : 'calc(24px + env(safe-area-inset-bottom, 0px))'
            }}
            className={`relative z-10 w-full rounded-t-[32px] p-6 space-y-4 shadow-2xl border-t flex flex-col ${
              isLight 
                ? 'bg-slate-100 border-slate-200 text-slate-800' 
                : 'bg-zinc-900 border-zinc-800 text-white'
            }`}
          >
            {/* Grab handle */}
            <div className="w-12 h-1.5 rounded-full bg-zinc-750/30 mx-auto -mt-2 mb-2 shrink-0" />

            <div className="flex items-center justify-between shrink-0">
              <h3 className={`text-sm font-black uppercase tracking-wide flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-white'
              }`}>
                {editingDevIdx !== null || originalDevToEdit !== null ? (
                  <><Edit className="w-4 h-4 text-cyan-500" /> Editar Modelo</>
                ) : (
                  <><Plus className="w-4 h-4 text-cyan-500" /> Agregar Modelo</>
                )}
              </h3>
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isLight ? 'bg-slate-250 hover:bg-slate-300 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form body */}
            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {/* Brand */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Samsung, Apple, Motorola..."
                  value={devBrand}
                  onChange={e => setDevBrand(e.target.value)}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      modelRef.current?.focus(); 
                    } 
                  }}
                  className={`w-full focus:outline-none px-3.5 py-3 text-sm font-bold rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-slate-250 focus:border-cyan-500 text-slate-800' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-white'
                  }`}
                />
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Modelo *
                </label>
                <input
                  ref={modelRef}
                  type="text"
                  required
                  placeholder="Ej. Galaxy S24 Ultra, iPhone 15 Pro..."
                  value={devModel}
                  onChange={e => setDevModel(e.target.value)}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      codeRef.current?.focus(); 
                    } 
                  }}
                  className={`w-full focus:outline-none px-3.5 py-3 text-sm font-bold rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-slate-250 focus:border-cyan-500 text-slate-800' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-white'
                  }`}
                />
              </div>

              {/* Model Number / Code */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Código del Modelo <span className="normal-case font-normal">(opcional)</span>
                </label>
                <input
                  ref={codeRef}
                  type="text"
                  placeholder="Ej. SM-S928B, A3116, XT2343-1..."
                  value={devModelNumber}
                  onChange={e => setDevModelNumber(e.target.value)}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      typeRef.current?.focus(); 
                    } 
                  }}
                  className={`w-full focus:outline-none px-3.5 py-3 text-sm font-mono font-bold rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-slate-250 focus:border-cyan-500 text-slate-800' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-white'
                  }`}
                />
              </div>

              {/* Device Type */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Tipo de Dispositivo
                </label>
                <div className="relative">
                  <select
                    ref={typeRef}
                    value={devType}
                    onChange={e => setDevType(e.target.value as any)}
                    className={`w-full focus:outline-none px-3.5 py-3 text-sm font-bold rounded-2xl border appearance-none transition-all ${
                      isLight 
                        ? 'bg-white border-slate-250 focus:border-cyan-500 text-slate-800' 
                        : 'bg-zinc-950 border-zinc-800 focus:border-cyan-500 text-white'
                    }`}
                  >
                    <option value="Phone">📱 Teléfono</option>
                    <option value="Tablet">📟 Tablet</option>
                    <option value="Laptop">💻 Laptop</option>
                    <option value="Desktop">🖥️ PC / Escritorio</option>
                    <option value="Other">🔧 Otro</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-zinc-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 shrink-0 pt-2 border-t border-zinc-850/20">
              <button
                type="button"
                onClick={handleCancelEdit}
                className={`flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
                  isLight 
                    ? 'bg-slate-250 border-slate-350 text-slate-700 hover:bg-slate-300' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-350 hover:bg-zinc-750'
                }`}
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={!devBrand.trim() || !devModel.trim()}
                className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
              >
                {editingDevIdx !== null || originalDevToEdit !== null ? 'GUARDAR CAMBIOS ✓' : 'AGREGAR AL CATÁLOGO +'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Custom Dialogs (Confirmation, Error alerts) ── */}
      {dialog && (
        <div className="fixed inset-0 z-[110000] flex items-center justify-center p-5 select-none animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => { if (dialog.type !== 'confirm') setDialog(null); }} />
          <div className={`relative z-10 w-full max-w-sm p-5 rounded-3xl border flex flex-col gap-4 shadow-2xl ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-800' 
              : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            <div className="flex items-center gap-3">
              {dialog.type === 'error' && (
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-red-500 stroke-[2.5]" />
                </div>
              )}
              {dialog.type === 'warning' && (
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500 stroke-[2.5]" />
                </div>
              )}
              {dialog.type === 'confirm' && (
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500 stroke-[2.5]" />
                </div>
              )}
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide leading-tight">
                  {dialog.title}
                </h4>
              </div>
            </div>

            <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              {dialog.message}
            </p>

            <div className="flex gap-2 pt-2 shrink-0">
              {dialog.cancelText && (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-colors cursor-pointer border ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                  }`}
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  dialog.onConfirm?.();
                  setDialog(null);
                }}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-colors cursor-pointer text-white ${
                  dialog.type === 'error' 
                    ? 'bg-zinc-700 hover:bg-zinc-600' 
                    : dialog.type === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-red-500 hover:bg-red-655'
                }`}
              >
                {dialog.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
