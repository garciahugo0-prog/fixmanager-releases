import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Check, 
  AlertTriangle,
  Bookmark
} from 'lucide-react';
import { ServicePrice, WorkshopConfig } from '../../types';

interface MobilePricesViewProps {
  services: ServicePrice[];
  config: WorkshopConfig;
  isLight: boolean;
  onClose: () => void;
  onAddService?: (newSvc: ServicePrice) => void;
  onUpdateService?: (updatedSvc: ServicePrice) => void;
  onDeleteService?: (id: string) => void;
}

export default function MobilePricesView({
  services,
  config,
  isLight,
  onClose,
  onAddService,
  onUpdateService,
  onDeleteService
}: MobilePricesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Form states
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcCategory, setSvcCategory] = useState('General');
  const [svcPrice, setSvcPrice] = useState<number | string>(0);
  const [svcCost, setSvcCost] = useState<number | string>(0);
  const [svcDuration, setSvcDuration] = useState<number>(30);

  // Feedback notifications
  const [feedback, setFeedback] = useState<string | null>(null);

  // Custom themed dialog/confirm/alert state
  const [dialog, setDialog] = useState<{
    type: 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  // References for focus / navigation
  const costRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  // Keyboard height listener (Capacitor native keyboard event simulation)
  useEffect(() => {
    const handleKeyboardShow = (e: any) => {
      if (e.detail && e.detail.keyboardHeight) {
        setKeyboardHeight(e.detail.keyboardHeight);
      } else if (e.keyboardHeight) {
        setKeyboardHeight(e.keyboardHeight);
      } else {
        // Fallback standard keyboard heights
        setKeyboardHeight(280);
      }
    };
    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    window.addEventListener('keyboardWillShow', handleKeyboardShow);
    window.addEventListener('keyboardWillHide', handleKeyboardHide);
    // Support Capacitor standard events
    window.addEventListener('ionKeyboardDidShow', handleKeyboardShow);
    window.addEventListener('ionKeyboardDidHide', handleKeyboardHide);

    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardHide);
      window.removeEventListener('ionKeyboardDidShow', handleKeyboardShow);
      window.removeEventListener('ionKeyboardDidHide', handleKeyboardHide);
    };
  }, []);

  // Filter services based on search query
  const filteredServices = services.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCancelEdit = () => {
    setEditingSvcId(null);
    setSvcName('');
    setSvcCategory('General');
    setSvcPrice(0);
    setSvcCost(0);
    setSvcDuration(30);
    setShowFormModal(false);
  };

  const handleStartEdit = (svc: ServicePrice) => {
    setEditingSvcId(svc.id);
    setSvcName(svc.name);
    setSvcCategory(svc.category || 'General');
    setSvcPrice(svc.price);
    setSvcCost(svc.cost || 0);
    setSvcDuration(svc.durationMinutes || 30);
    setShowFormModal(true);
  };

  const executeSave = (
    isEdit: boolean,
    svcId: string | null,
    name: string,
    category: string,
    price: number,
    cost: number,
    duration: number
  ) => {
    const sym = config.currencySymbol || '$';
    if (isEdit && svcId) {
      const updated: ServicePrice = {
        id: svcId,
        name: name,
        category: category,
        price: price,
        cost: cost,
        durationMinutes: duration,
        popularity: services.find(s => s.id === svcId)?.popularity || 5
      };
      onUpdateService?.(updated);
      showFeedback(`✅ Servicio "${name}" actualizado con éxito.`);
      handleCancelEdit();
    } else {
      const newId = `S${services.length + 1}-${Date.now()}`;
      const newSvc: ServicePrice = {
        id: newId,
        name: name,
        category: category,
        price: price,
        cost: cost,
        durationMinutes: duration,
        popularity: 5
      };
      onAddService?.(newSvc);
      showFeedback(`✅ Servicio "${name}" registrado exitosamente.`);
      setSvcName('');
      setSvcPrice(0);
      setSvcCost(0);
      setSvcDuration(30);
      setShowFormModal(false);
    }
    setDialog(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(svcPrice);
    const numericCost = Number(svcCost) || 0;

    if (!svcName || isNaN(numericPrice) || numericPrice < 0 || isNaN(numericCost) || numericCost < 0) {
      return;
    }

    const lowercaseName = svcName.toLowerCase().trim();
    const sym = config.currencySymbol || '$';

    // 1. Check exact duplicates
    const exactMatch = services.find(s => 
      s.id !== editingSvcId && s.name.toLowerCase().trim() === lowercaseName
    );

    if (exactMatch) {
      setDialog({
        type: 'error',
        title: 'Servicio Duplicado',
        message: `Ya existe una tarifa idéntica registrada como "${exactMatch.name}" con un precio de ${sym}${exactMatch.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Por favor, cambie el nombre del servicio o edite la tarifa existente.`,
        confirmText: 'Entendido'
      });
      return;
    }

    // 2. Check similar/partial duplicates
    const similarMatch = services.find(s => {
      if (s.id === editingSvcId) return false;
      const sName = s.name.toLowerCase().trim();
      return sName.includes(lowercaseName) || lowercaseName.includes(sName);
    });

    if (similarMatch) {
      setDialog({
        type: 'warning',
        title: 'Advertencia de Similitud',
        message: `Se detectó un servicio con nombre muy similar ya registrado:\n\n• Existente: "${similarMatch.name}" (${sym}${similarMatch.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n• Nuevo: "${svcName}" (${sym}${numericPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n\n¿Desea registrar este nuevo servicio a pesar de la similitud?`,
        confirmText: 'Sí, Registrar',
        cancelText: 'No, Cancelar',
        onConfirm: () => executeSave(!!editingSvcId, editingSvcId, svcName, svcCategory, numericPrice, numericCost, svcDuration)
      });
      return;
    }

    // No duplicates, proceed directly
    executeSave(!!editingSvcId, editingSvcId, svcName, svcCategory, numericPrice, numericCost, svcDuration);
  };

  const handleDelete = (id: string, name: string) => {
    setDialog({
      type: 'confirm',
      title: 'Eliminar Tarifa',
      message: `¿Está seguro de que desea eliminar la tarifa para "${name}" de manera definitiva? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        onDeleteService?.(id);
        showFeedback(`🗑️ Tarifa de "${name}" eliminada.`);
        if (editingSvcId === id) {
          handleCancelEdit();
        }
        setDialog(null);
      }
    });
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const sym = config.currencySymbol || '$';

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
              <h2 className="text-base font-black uppercase tracking-tight leading-none">Precios de Servicio</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1 block">Catálogo de Servicios</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { handleCancelEdit(); setShowFormModal(true); }}
            className="py-2 px-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Buscador Estilo POS (Píldora Limpia) */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar reparación por nombre o categoría..."
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
            <Search className={`w-4 h-4 ${isLight ? 'text-slate-450' : 'text-zinc-400'}`} />
            <div className={`w-px h-4 ${isLight ? 'bg-slate-300' : 'bg-zinc-700'}`} />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="w-6 h-6 absolute right-3 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-zinc-450 hover:text-slate-800 dark:hover:text-white font-black text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Feedback pop */}
      {feedback && (
        <div className="absolute top-20 left-4 right-4 z-[100000] p-3 text-xs rounded-2xl border font-bold text-center animate-pulse shadow-md bg-emerald-500 border-emerald-600 text-white">
          {feedback}
        </div>
      )}

      {/* Services List scroll area */}
      <section 
        className={`flex-1 overflow-y-auto p-5 space-y-4 ${
          isLight ? 'bg-white' : 'bg-[#0c1224]'
        }`}
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
      >
        {filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <span className="text-4xl mb-3">🏷️</span>
            <h4 className="font-extrabold text-sm uppercase tracking-wide">Sin resultados</h4>
            <p className={`text-xs mt-1 max-w-[240px] ${isLight ? 'text-slate-450' : 'text-zinc-550'}`}>
              No encontramos servicios que coincidan con la búsqueda. Puedes registrar uno nuevo con el botón superior.
            </p>
          </div>
        ) : (
          filteredServices.map(svc => {
            const costVal = svc.cost || 0;
            const gainVal = svc.price - costVal;
            return (
              <div
                key={svc.id}
                className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all ${
                  isLight 
                    ? 'bg-slate-50/40 border-slate-200/90 text-slate-800 hover:bg-slate-100/30' 
                    : 'bg-zinc-900 border-zinc-800 text-white'
                }`}
              >
                {/* Upper line: Service Name & Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="font-black text-sm uppercase tracking-wide leading-tight">
                      {svc.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(svc)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                        isLight 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700' 
                          : 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-650'
                      }`}
                      title="Editar tarifa"
                    >
                      <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(svc.id, svc.name)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                        isLight 
                          ? 'bg-red-500 hover:bg-red-650 text-white border border-red-600' 
                          : 'bg-red-600 hover:bg-red-500 text-white border border-red-750'
                      }`}
                      title="Eliminar tarifa"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-2xl text-[11px] font-bold ${
                  isLight ? 'bg-slate-50' : 'bg-zinc-950/60'
                }`}>
                  <div className="space-y-0.5">
                    <span className={`text-[8px] uppercase tracking-wider block ${isLight ? 'text-slate-400' : 'text-zinc-550'}`}>
                      Costo
                    </span>
                    <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {sym}{costVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className={`text-[8px] uppercase tracking-wider block ${isLight ? 'text-slate-400' : 'text-zinc-550'}`}>
                      Tarifa
                    </span>
                    <span className="font-mono text-xs text-emerald-500 font-extrabold">
                      {sym}{svc.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-0.5 border-l pl-2.5 border-dashed border-zinc-800">
                    <span className={`text-[8px] uppercase tracking-wider block ${isLight ? 'text-slate-400' : 'text-zinc-550'}`}>
                      Ganancia Est.
                    </span>
                    <span className="font-mono text-xs text-blue-500 font-extrabold">
                      {sym}{gainVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Bottom line: Duration */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold px-1">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5] text-zinc-400" />
                  <span>Duración: <strong className={isLight ? 'text-slate-700' : 'text-zinc-300'}>{svc.durationMinutes || 30} min</strong></span>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ── Modal Form: Registrar / Editar Tarifa ── */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-[100001] flex items-end justify-center p-0" 
          onClick={handleCancelEdit}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sliding sheet container with dynamic bottom offset to avoid keyboard */}
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
                {editingSvcId ? (
                  <><Edit className="w-4 h-4 text-amber-500" /> Editar Tarifa</>
                ) : (
                  <><Plus className="w-4 h-4 text-amber-500" /> Registrar Tarifa</>
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
              {/* Name */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Nombre de Reparación *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Cambio de pantalla, Batería..."
                  value={svcName}
                  onChange={e => setSvcName(e.target.value)}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      costRef.current?.focus(); 
                      costRef.current?.select(); 
                    } 
                  }}
                  className={`w-full focus:outline-none px-3.5 py-3 text-sm font-bold rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-slate-250 focus:border-amber-500 text-slate-800' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-white'
                  }`}
                />
              </div>

              {/* Cost & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Costo / Compra ({sym})
                  </label>
                  <input
                    ref={costRef}
                    type="number"
                    min={0}
                    step="any"
                    value={svcCost === 0 ? 0 : (svcCost || '')}
                    onFocus={e => e.target.select()}
                    onKeyDown={e => { 
                      if (e.key === 'Enter') { 
                        e.preventDefault(); 
                        priceRef.current?.focus(); 
                        priceRef.current?.select(); 
                      } 
                    }}
                    onChange={e => setSvcCost(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                    placeholder="0"
                    className={`w-full focus:outline-none px-3.5 py-3 text-sm font-mono font-bold rounded-2xl border transition-all ${
                      Number(svcCost) < 0
                        ? 'border-red-500 text-red-500 bg-red-950/10'
                        : isLight 
                          ? 'bg-white border-slate-250 focus:border-amber-500 text-slate-800' 
                          : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-zinc-300'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Tarifa ({sym}) *
                  </label>
                  <input
                    ref={priceRef}
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={svcPrice === 0 ? 0 : (svcPrice || '')}
                    onFocus={e => e.target.select()}
                    onKeyDown={e => { 
                      if (e.key === 'Enter') { 
                        e.preventDefault(); 
                        durationRef.current?.focus(); 
                        durationRef.current?.select(); 
                      } 
                    }}
                    onChange={e => setSvcPrice(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                    className={`w-full focus:outline-none px-3.5 py-3 text-sm font-mono font-bold rounded-2xl border transition-all ${
                      Number(svcPrice) < 0
                        ? 'border-red-500 text-red-500 bg-red-950/10'
                        : isLight 
                          ? 'bg-white border-slate-250 focus:border-amber-500 text-emerald-700' 
                          : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-emerald-400'
                    }`}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Duración (minutos) *
                </label>
                <input
                  ref={durationRef}
                  type="number"
                  required
                  min={1}
                  value={svcDuration}
                  onFocus={e => e.target.select()}
                  onChange={e => setSvcDuration(Number(e.target.value) || 30)}
                  className={`w-full focus:outline-none px-3.5 py-3 text-sm font-mono font-bold rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-slate-250 focus:border-amber-500 text-slate-800' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-zinc-300'
                  }`}
                />
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
                disabled={Number(svcPrice) < 0 || Number(svcCost) < 0 || !svcName}
                className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center text-black bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
              >
                {editingSvcId ? 'GUARDAR CAMBIOS ✓' : 'AÑADIR AL LISTADO +'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Custom Dialogs (Confirmation, Error, Warning Alerts) ── */}
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
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-blue-500 stroke-[2.5]" />
                </div>
              )}
              <h4 className="font-black text-sm uppercase tracking-wide">{dialog.title}</h4>
            </div>

            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              {dialog.message}
            </p>

            <div className="flex gap-2.5 justify-end mt-2 pt-3 border-t border-zinc-800/10">
              {dialog.cancelText && (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className={`px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 text-slate-650 hover:bg-slate-200' 
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                  }`}
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialog.onConfirm) {
                    dialog.onConfirm();
                  } else {
                    setDialog(null);
                  }
                }}
                className={`px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  dialog.type === 'error'
                    ? 'bg-red-500 text-white hover:bg-red-650'
                    : dialog.type === 'warning'
                      ? 'bg-amber-500 text-black hover:bg-amber-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
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
