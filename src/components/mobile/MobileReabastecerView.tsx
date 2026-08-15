import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  UserPlus,
  X,
  Truck,
  Minus,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { InventoryItem, WorkshopConfig, Expense, AppUser } from '../../types';
import { DRAFT_KEY, clearReabastoDraft } from '../../utils/reabastoDraft';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

interface ReplenishItem {
  id: string;
  name: string;
  code: string;
  brand: string;
  currentStock: number;
  addedQty: number;
  cost: number;
  suggestedProvider?: string;
  isSuggested?: boolean;
}

interface ReplenishHistoryLog {
  id: string;
  provider: string;
  date: string;
  itemsCount: number;
  totalCost: number;
  items: { name: string; addedQty: number; cost: number }[];
  note?: string;
}

interface MobileReabastecerViewProps {
  inventory: InventoryItem[];
  config: WorkshopConfig;
  onUpdateInventory: (newInventory: InventoryItem[]) => void;
  onAddExpense?: (expense: Expense) => void;
  currentUser: AppUser | null;
  isLight: boolean;
  onClose: () => void;
}

export default function MobileReabastecerView({
  inventory,
  config,
  onUpdateInventory,
  onAddExpense,
  currentUser,
  isLight,
  onClose
}: MobileReabastecerViewProps) {
  const loadDraft = () => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  };
  const draft = loadDraft();

  const [provider, setProvider] = useState<string>(draft?.provider || '');
  const [note, setNote] = useState<string>(draft?.note || '');
  const [replenishList, setReplenishList] = useState<ReplenishItem[]>(draft?.replenishList || []);
  const [search, setSearch] = useState('');
  const [autoRegisterExpense, setAutoRegisterExpense] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Modal registrar nuevo proveedor
  const [showNewProviderModal, setShowNewProviderModal] = useState<boolean>(false);
  const [newProviderName, setNewProviderName] = useState<string>('');
  const [newProviderPhone, setNewProviderPhone] = useState<string>('');

  // Historial logs
  const [historyLogs, setHistoryLogs] = useState<ReplenishHistoryLog[]>(() => {
    const saved = localStorage.getItem('fixmanager_replenishment_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Proveedores registrados manualmente
  const [customProviders, setCustomProviders] = useState<string[]>(() => {
    const saved = localStorage.getItem('fixmanager_custom_providers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    import('@capacitor/keyboard')
      .then(({ Keyboard }) => {
        const showL = Keyboard.addListener('keyboardDidShow', (info: { keyboardHeight: number }) => {
          setKeyboardHeight(info.keyboardHeight);
        });
        const hideL = Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
        return () => {
          showL.then(l => l.remove());
          hideL.then(l => l.remove());
        };
      })
      .catch(() => {});
  }, []);

  const recentProviders: string[] = useMemo(() => {
    const fromLogs = historyLogs.map(l => l.provider).filter((p): p is string => Boolean(p));
    const combined = [...fromLogs, ...customProviders];
    return combined
      .reduce<string[]>((acc, p) => {
        const upper = p.toUpperCase().trim();
        return acc.includes(upper) ? acc : [...acc, upper];
      }, [])
      .slice(0, 10);
  }, [historyLogs, customProviders]);

  const filteredProviders = useMemo(() => {
    const q = provider.toLowerCase().trim();
    if (!q) return recentProviders;
    return recentProviders.filter(p => p.toLowerCase().includes(q));
  }, [provider, recentProviders]);

  useEffect(() => {
    localStorage.setItem('fixmanager_replenishment_logs', JSON.stringify(historyLogs));
  }, [historyLogs]);

  // Guardar borrador en localStorage
  useEffect(() => {
    if (replenishList.length > 0 || provider.trim() || note.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ replenishList, provider, note }));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [replenishList, provider, note]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return inventory.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [search, inventory]);

  const handleSelectProvider = (provName: string) => {
    setProvider(provName.toUpperCase());
  };

  const addProductToList = (item: InventoryItem) => {
    const exists = replenishList.find(draft => draft.id === item.id);
    if (exists) {
      setFeedback(`⚠️ "${item.name}" ya está en la lista.`);
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Costo sugerido
    let suggestedCost = item.cost || 0;
    let isSuggested = false;
    let suggestedProviderName = '';

    const upperProvider = provider.toUpperCase().trim();
    if (upperProvider) {
      const matchLog = historyLogs.find(log => 
        log.provider.toUpperCase().trim() === upperProvider &&
        log.items.some(it => it.name.toUpperCase().trim() === item.name.toUpperCase().trim())
      );
      if (matchLog) {
        const matchItem = matchLog.items.find(it => it.name.toUpperCase().trim() === item.name.toUpperCase().trim());
        if (matchItem) {
          suggestedCost = matchItem.cost;
          isSuggested = true;
          suggestedProviderName = matchLog.provider;
        }
      }
    }

    const newItem: ReplenishItem = {
      id: item.id,
      name: item.name,
      code: item.code,
      brand: item.brand,
      currentStock: item.stock,
      addedQty: 5, // Cantidad por defecto
      cost: suggestedCost,
      isSuggested,
      suggestedProvider: suggestedProviderName
    };

    setReplenishList([...replenishList, newItem]);
    setSearch('');
    setFeedback(`✓ "${item.name}" añadido`);
    setTimeout(() => setFeedback(null), 1500);
  };

  const handleProcessReplenish = () => {
    if (!provider.trim()) {
      alert('⚠️ Por favor ingresa o selecciona un proveedor.');
      return;
    }
    if (replenishList.length === 0) {
      alert('⚠️ La lista de reabastecimiento está vacía.');
      return;
    }

    const batchTotalCost = replenishList.reduce((acc, current) => acc + (current.addedQty * current.cost), 0);

    // 1. Actualizar el inventario general
    const updatedInventory = inventory.map(inv => {
      const matchDraft = replenishList.find(draft => draft.id === inv.id);
      if (matchDraft) {
        return {
          ...inv,
          stock: inv.stock + matchDraft.addedQty,
          cost: matchDraft.cost
        };
      }
      return inv;
    });

    onUpdateInventory(updatedInventory);

    // 2. Registrar egreso (gasto) de caja
    if (autoRegisterExpense && onAddExpense && batchTotalCost > 0) {
      const newExpense: Expense = {
        id: `M-REP-${Date.now().toString().slice(-4)}`,
        description: `Reabastecimiento masivo: Proveedor "${provider.toUpperCase()}"`,
        category: 'Repuestos',
        amount: batchTotalCost,
        createdAt: new Date().toISOString(),
        type: 'salida'
      };
      onAddExpense(newExpense);
    }

    // 3. Crear log histórico
    const newLog: ReplenishHistoryLog = {
      id: `REAB-${Date.now().toString().slice(-4)}`,
      provider: provider.toUpperCase(),
      date: new Date().toISOString(),
      itemsCount: replenishList.length,
      totalCost: batchTotalCost,
      items: replenishList.map(draft => ({
        name: draft.name,
        addedQty: draft.addedQty,
        cost: draft.cost
      })),
      note: note.trim() || undefined
    };

    const nextLogs = [newLog, ...historyLogs];
    setHistoryLogs(nextLogs);
    localStorage.setItem('fixmanager_replenishment_logs', JSON.stringify(nextLogs));
    
    // Limpiar borrador
    setReplenishList([]);
    setNote('');
    setProvider('');
    clearReabastoDraft();

    alert(`✅ ¡Entrada de almacén procesada! Se cargó stock de ${newLog.itemsCount} productos.`);
    onClose();
  };

  const totalCost = replenishList.reduce((acc, current) => acc + (current.addedQty * current.cost), 0);
  const totalQty = replenishList.reduce((acc, current) => acc + current.addedQty, 0);

  return (
    <div className={`fixed inset-0 z-[999999] flex flex-col select-none ${
      isLight ? 'bg-white text-slate-800' : 'bg-[#0c1224] text-white'
    }`}>
      
      {/* ── Encabezado Principal ── */}
      <header 
        style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}
        className={`px-5 pb-4 shrink-0 flex items-center justify-between border-b ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Reabastecer Almacén</h3>
              <p className={`text-[8px] font-semibold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                Carga stock masivamente por proveedor
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Cuerpo Principal con Scroll ── */}
      <section 
        style={{ paddingBottom: keyboardHeight }}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          isLight ? 'bg-slate-50' : 'bg-[#09090b]'
        }`}
      >
        
        {feedback && (
          <div className="p-2.5 rounded-xl text-center text-xs font-black bg-blue-500 text-white animate-bounce">
            {feedback}
          </div>
        )}

        {/* ── PASO 1: SELECCIÓN DE PROVEEDOR ── */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-zinc-850'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              1. Selecciona el Proveedor
            </span>
            <button
              onClick={() => setShowNewProviderModal(true)}
              className="text-[9px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Nuevo
            </button>
          </div>

          {/* Chips de proveedores recientes */}
          {/* Input Buscador con Dropdown Autocompletable */}
          <div className="relative space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider block text-zinc-400">
              Proveedor Seleccionado:
            </label>
            <input
              type="text"
              value={provider}
              onChange={e => {
                setProvider(e.target.value.toUpperCase());
                setShowProviderDropdown(true);
              }}
              onFocus={() => setShowProviderDropdown(true)}
              onBlur={() => {
                // Timeout para permitir registrar el onMouseDown en los items antes del blur
                setTimeout(() => setShowProviderDropdown(false), 200);
              }}
              placeholder="Escribe el nombre del proveedor..."
              className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
              }`}
            />

            {/* Dropdown de autocompletado */}
            {showProviderDropdown && filteredProviders.length > 0 && (
              <div className={`absolute left-0 right-0 mt-1 rounded-2xl border shadow-2xl z-[60] max-h-48 overflow-y-auto ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-805 text-white'
              }`}>
                <div className="p-1 flex flex-col gap-0.5">
                  {filteredProviders.map(prov => (
                    <button
                      key={prov}
                      type="button"
                      onMouseDown={() => {
                        setProvider(prov.toUpperCase());
                        setShowProviderDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        provider === prov
                          ? 'bg-blue-600 text-white'
                          : isLight
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PASO 2: BUSCADOR DE PRODUCTOS ── */}
        <div className={`p-4 rounded-2xl border ${
          !provider.trim() ? 'opacity-40 pointer-events-none' : ''
        } ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-zinc-850'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
            2. Busca y añade repuestos / accesorios
          </span>

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={provider.trim() ? "Buscar por descripción o código de barras..." : "Primero ingresa un proveedor..."}
              className={`w-full h-11 pl-11 pr-10 text-xs font-bold rounded-xl transition-all focus:outline-none ${
                isLight
                  ? 'bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                  : 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-600'
              }`}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400 p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Resultados de búsqueda flotantes */}
          {search.trim() && (
            <div className={`absolute left-8 right-8 mt-1.5 rounded-2xl border shadow-2xl z-50 max-h-56 overflow-y-auto ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-white'
            }`}>
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 font-semibold">Sin coincidencias</div>
              ) : (
                <div className="p-2 flex flex-col gap-1">
                  {filteredProducts.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addProductToList(item)}
                      className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors active:scale-[0.98] ${
                        isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-zinc-950/60 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-black truncate">{item.name}</div>
                        <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                          Stock: {item.stock} pz · Costo: ${item.cost.toFixed(2)}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg">
                        + Agregar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PASO 3: TABLA / LISTA DE SURTIDO ── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Detalle del Surtido ({replenishList.length} items)
            </span>
            {replenishList.length > 0 && (
              <button
                onClick={() => { if(confirm('¿Deseas vaciar la lista actual?')) setReplenishList([]); }}
                className="text-[9.5px] font-black uppercase tracking-wider text-rose-500 cursor-pointer active:scale-95"
              >
                Vaciar lista
              </button>
            )}
          </div>

          {replenishList.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 ${
              isLight ? 'border-slate-350 bg-slate-100/50' : 'border-zinc-850 bg-zinc-900/20'
            }`}>
              <Package className="w-8 h-8 text-zinc-500 opacity-40" />
              <div className="text-xs font-bold text-zinc-400">La lista de reabasto está vacía</div>
              <p className="text-[9px] text-zinc-500 max-w-xs leading-relaxed">
                Ingresa un proveedor y añade productos para indicar las cantidades y costos ingresados.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {replenishList.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex flex-col gap-3 shadow-xs ${
                    isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-black truncate">{item.name}</div>
                      <div className="text-[9px] text-zinc-400 font-bold mt-0.5">
                        Stock general actual: {item.currentStock} pz
                      </div>
                    </div>
                    <button
                      onClick={() => setReplenishList(prev => prev.filter(q => q.id !== item.id))}
                      className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Campos de Cantidad y Costo de forma táctil */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <div>
                      <label className="text-[8.5px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                        Cantidad Surtida:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setReplenishList(prev => prev.map(q => q.id === item.id ? { ...q, addedQty: Math.max(1, q.addedQty - 1) } : q))}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-90 ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-850 hover:bg-zinc-800'
                          }`}
                        >
                          <Minus className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.addedQty}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setReplenishList(prev => prev.map(q => q.id === item.id ? { ...q, addedQty: val } : q));
                          }}
                          className={`w-10 h-7 text-center font-mono font-black text-xs bg-transparent border-0 outline-none p-0 focus:ring-0 ${
                            isLight ? 'text-slate-800' : 'text-white'
                          }`}
                        />
                        <button
                          onClick={() => setReplenishList(prev => prev.map(q => q.id === item.id ? { ...q, addedQty: q.addedQty + 1 } : q))}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-90 ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-850 hover:bg-zinc-800'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[8.5px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                        Costo Compra ($):
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.cost || ''}
                        onChange={e => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setReplenishList(prev => prev.map(q => q.id === item.id ? { ...q, cost: val } : q));
                        }}
                        placeholder="0.00"
                        className={`w-full h-7 px-2 font-mono font-black text-xs text-right rounded-lg border focus:outline-none ${
                          isLight ? 'bg-slate-100 border-slate-200 focus:border-blue-500' : 'bg-zinc-950 border-zinc-850 focus:border-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  {item.isSuggested && (
                    <div className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">
                      💡 Sugerido por abasto anterior de {item.suggestedProvider}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── NOTAS DEL ABASTO ── */}
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
        }`}>
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
            Notas u observaciones:
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Introduce notas internas del lote (ej. lote con descuento, piezas faltantes...)"
            rows={2}
            className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
            }`}
          />
        </div>
      </section>

      {/* ── Pie de Página y Confirmación Principal ── */}
      <footer 
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
        className={`p-4 border-t space-y-3 shrink-0 ${
          isLight ? 'bg-white border-slate-200 shadow-lg' : 'bg-zinc-900 border-zinc-850'
        }`}
      >
        
        {/* Switch para Registro automático de gasto de caja */}
        {onAddExpense && replenishList.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-[9.5px] font-black uppercase tracking-wider">
                Registrar Gasto de Caja
              </span>
              <span className="text-[8px] font-bold text-zinc-400">
                Añadirá ${totalCost.toFixed(2)} automáticamente a egresos
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoRegisterExpense}
              onChange={e => setAutoRegisterExpense(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
          </div>
        )}

        <div className="flex justify-between items-center text-xs font-black px-1.5 mb-1">
          <span className="text-zinc-400">Total Piezas: {totalQty}</span>
          <span className="text-blue-500 text-sm">Total Costo: ${totalCost.toFixed(2)}</span>
        </div>

        {/* Botón Procesar */}
        <button
          type="button"
          disabled={replenishList.length === 0 || !provider.trim()}
          onClick={handleProcessReplenish}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            replenishList.length > 0 && provider.trim()
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
              : 'bg-zinc-300 text-zinc-500 dark:bg-zinc-850 dark:text-zinc-650 cursor-not-allowed shadow-none'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Confirmar y Procesar Abasto</span>
        </button>
      </footer>

      {/* ── MODAL: REGISTRAR NUEVO PROVEEDOR INTERNO ── */}
      {showNewProviderModal && (
        <div 
          style={{ bottom: keyboardHeight }}
          className="fixed inset-x-0 top-0 z-[100005] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        >
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowNewProviderModal(false)} />
          <div className={`relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 flex flex-col gap-3.5 ${
            isLight ? 'bg-white text-slate-800' : 'bg-zinc-900 text-white border border-zinc-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xs font-black uppercase flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span>Registrar Nuevo Proveedor</span>
              </h3>
              <button
                onClick={() => setShowNewProviderModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-850/20 text-zinc-400 font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider block mb-1">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  value={newProviderName}
                  onChange={e => setNewProviderName(e.target.value.toUpperCase())}
                  placeholder="Ej. REFACCIONES CENTRAL"
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider block mb-1">
                  Teléfono / Contacto
                </label>
                <input
                  type="tel"
                  value={newProviderPhone}
                  onChange={e => setNewProviderPhone(formatPhoneNumber(e.target.value))}
                  placeholder="Ej. (351) 123-4567"
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!newProviderName.trim()) {
                  alert('El nombre es obligatorio');
                  return;
                }
                const upperName = newProviderName.trim().toUpperCase();
                setProvider(upperName);

                // Persistir el proveedor de inmediato
                if (!customProviders.includes(upperName)) {
                  const nextProviders = [upperName, ...customProviders];
                  setCustomProviders(nextProviders);
                  localStorage.setItem('fixmanager_custom_providers', JSON.stringify(nextProviders));
                }

                setShowNewProviderModal(false);
                setNewProviderName('');
                setNewProviderPhone('');
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all mt-1"
            >
              Vincular Proveedor
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
