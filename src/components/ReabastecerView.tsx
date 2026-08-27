/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  UserPlus,
  TrendingUp,
  FileText,
  X,
  HelpCircle,
  Truck,
  Receipt,
  FileSpreadsheet,
  PackagePlus
} from 'lucide-react';
import { InventoryItem, WorkshopConfig, Expense, AppUser } from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { handleCaretPreservingChange } from '../utils/domHelpers';
import { PosItemThumbnail } from './pos/PosItemThumbnail';
import CountryCodeSelect from './CountryCodeSelect';

interface ReabastecerViewProps {
  inventory: InventoryItem[];
  config: WorkshopConfig;
  onUpdateInventory: (newInventory: InventoryItem[]) => void;
  onAddExpense?: (expense: Expense) => void;
  currentUser?: AppUser | null;
}

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
  imageUrl?: string;
  extraImages?: string[];
  category?: string;
  price?: number;
  wholesalePrice?: number;
  originalCost?: number;
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

const COMMON_PROVIDERS: string[] = [
];

function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/,(?!\s)/g, '-');
}

import { hasPendingReabastoDraft, clearReabastoDraft, DRAFT_KEY } from '../utils/reabastoDraft';

export default function ReabastecerView({
  inventory,
  config,
  onUpdateInventory,
  onAddExpense,
  currentUser
}: ReabastecerViewProps) {
  const loadDraft = () => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  };
  const draft = loadDraft();

  const [provider, setProvider] = useState<string>(draft?.provider || '');
  const [customProviderActive, setCustomProviderActive] = useState<boolean>(false);
  const [note, setNote] = useState<string>(draft?.note || '');

  // New provider registration modal state
  const [showNewProviderModal, setShowNewProviderModal] = useState<boolean>(false);
  const [newProviderName, setNewProviderName] = useState<string>('');
  const [newProviderPhone, setNewProviderPhone] = useState<string>('');
  const [newProviderCountryCode, setNewProviderCountryCode] = useState<string>('+52');
  const [newProviderCity, setNewProviderCity] = useState<string>('');
  const [newProviderState, setNewProviderState] = useState<string>('');
  const [newProviderAddress, setNewProviderAddress] = useState<string>('');
  const [newProviderModalError, setNewProviderModalError] = useState<string>('');

  const openNewProviderModal = () => {
    setNewProviderName('');
    setNewProviderPhone('');
    setNewProviderCountryCode(config?.phoneCountryCode || '+52');
    setNewProviderCity('');
    setNewProviderState('');
    setNewProviderAddress('');
    setNewProviderModalError('');
    setShowNewProviderModal(true);
  };

  const confirmNewProvider = () => {
    if (!newProviderName.trim()) {
      setNewProviderModalError('El nombre del proveedor es obligatorio.');
      return;
    }
    if (!newProviderPhone.trim()) {
      setNewProviderModalError('El número de teléfono es obligatorio.');
      return;
    }
    setProvider(newProviderName.trim().toUpperCase());
    setCustomProviderActive(false);
    setShowNewProviderModal(false);
  };
  
  // Selection/Draft state — restaura desde borrador si existe
  const [replenishList, setReplenishList] = useState<ReplenishItem[]>(draft?.replenishList || []);
  const [searchTerm, setSearchTermRaw] = useState<string>('');
  const setSearchTerm = (val: string) => {
    setSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [inlineSelectedIndex, setInlineSelectedIndex] = useState<number>(0);

  // Auto-guardar borrador en localStorage
  useEffect(() => {
    if (replenishList.length > 0 || provider.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ replenishList, provider, note }));
    }
  }, [replenishList, provider, note]);

  useEffect(() => {
    setInlineSelectedIndex(0);
  }, [searchTerm]);

  const [autoRegisterExpense, setAutoRegisterExpense] = useState<boolean>(false);
  const [showConfirmReplenish, setShowConfirmReplenish] = useState<boolean>(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intermediary add product modal state
  const [pendingAddItem, setPendingAddItem] = useState<InventoryItem | null>(null);
  const [pendingAddQty, setPendingAddQty] = useState<string>('5');
  const [pendingAddCost, setPendingAddCost] = useState<string>('0');
  const [pendingAddIsSuggested, setPendingAddIsSuggested] = useState<boolean>(false);
  const [pendingAddSuggestedProvider, setPendingAddSuggestedProvider] = useState<string>('');

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingAddItem) {
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    }
  }, [pendingAddItem]);

  const confirmAddProduct = () => {
    if (!pendingAddItem) return;
    const qty = Math.max(1, parseInt(pendingAddQty) || 1);
    const costVal = Math.max(0, parseFloat(pendingAddCost) || 0);

    const newItem: ReplenishItem = {
      id: pendingAddItem.id,
      name: pendingAddItem.name,
      code: pendingAddItem.code,
      brand: pendingAddItem.brand,
      currentStock: pendingAddItem.stock,
      addedQty: qty,
      cost: costVal,
      isSuggested: pendingAddIsSuggested,
      suggestedProvider: pendingAddSuggestedProvider,
      imageUrl: pendingAddItem.imageUrl,
      extraImages: pendingAddItem.extraImages,
      category: pendingAddItem.category,
      price: pendingAddItem.price,
      wholesalePrice: pendingAddItem.wholesalePrice,
      originalCost: pendingAddItem.cost
    };

    setReplenishList([...replenishList, newItem]);
    setSearchTerm('');
    setPendingAddItem(null);
  };

  // Persistence of historic replenishment logs
  const [historyLogs, setHistoryLogs] = useState<ReplenishHistoryLog[]>(() => {
    const saved = localStorage.getItem('fixmanager_replenishment_logs');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recentProviders: string[] = (historyLogs
    .map(log => log.provider)
    .filter((p): p is string => Boolean(p))
    .reduce<string[]>((acc, p) => acc.includes(p) ? acc : [...acc, p], []))
    .slice(0, 8);

  useEffect(() => {
    localStorage.setItem('fixmanager_replenishment_logs', JSON.stringify(historyLogs));
  }, [historyLogs]);

  const handleSelectProvider = (provName: string) => {
    setProvider(provName);
    setCustomProviderActive(false);
  };

  // ── Mini-form: nuevo producto desde Abasto ──────────────────────────────
  const [showNewProduct, setShowNewProduct] = useState(false);
  const emptyNewProd = () => {
    const isBarcode = /^\d+$/.test(searchTerm.trim()) && searchTerm.trim().length >= 5;
    return {
      name: isBarcode ? '' : searchTerm.toUpperCase(),
      code: isBarcode ? searchTerm.trim() : `7500${Math.floor(Math.random() * 9000 + 1000)}`,
      category: 'Accesorio',
      cost: 0,
      price: 0,
      wholesalePrice: 0,
      stock: 0,
      minStock: 3,
    };
  };
  const [newProd, setNewProd] = useState(emptyNewProd);
  const refNPName  = useRef<HTMLInputElement>(null);
  const refNPCode  = useRef<HTMLInputElement>(null);
  const refNPStock = useRef<HTMLInputElement>(null);
  const refNPMin   = useRef<HTMLInputElement>(null);
  const refNPCost  = useRef<HTMLInputElement>(null);
  const refNPPrice = useRef<HTMLInputElement>(null);
  const refNPWholesale = useRef<HTMLInputElement>(null);

  const openNewProduct = () => {
    const isBarcode = /^\d+$/.test(searchTerm.trim()) && searchTerm.trim().length >= 5;
    setNewProd(emptyNewProd());
    setNewProdError(null);
    setShowNewProduct(true);
    setTimeout(() => {
      if (isBarcode) {
        refNPName.current?.focus();
      } else {
        refNPStock.current?.focus();
        refNPStock.current?.select();
      }
    }, 80);
  };

  const [newProdError, setNewProdError] = useState<string | null>(null);

  const saveNewProduct = () => {
    const focusAfter = (ref: React.RefObject<HTMLInputElement>) => setTimeout(() => ref.current?.focus(), 50);
    if (!newProd.name.trim()) { setNewProdError('El nombre es obligatorio.'); focusAfter(refNPName); return; }
    if (!Number(newProd.stock)) { setNewProdError('Las unidades en almacén no pueden ser 0.'); focusAfter(refNPStock); return; }
    if (newProd.minStock === '' || isNaN(Number(newProd.minStock)) || Number(newProd.minStock) < 0) { setNewProdError('El stock mínimo debe ser un número válido mayor o igual a 0.'); focusAfter(refNPMin); return; }
    if (!Number(newProd.cost)) { setNewProdError('El costo de compra es obligatorio. Se necesita para calcular utilidades.'); focusAfter(refNPCost); return; }
    if (!Number(newProd.price)) { setNewProdError('El precio de venta es obligatorio.'); focusAfter(refNPPrice); return; }
    if (Number(newProd.price) < Number(newProd.cost)) { setNewProdError(`El precio de venta ($${Number(newProd.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) no puede ser menor que el costo ($${Number(newProd.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.`); focusAfter(refNPPrice); return; }
    if (!Number(newProd.wholesalePrice)) { setNewProdError('El precio de mayoreo es obligatorio.'); focusAfter(refNPWholesale); return; }
    if (Number(newProd.wholesalePrice) < Number(newProd.cost)) { setNewProdError(`El precio de mayoreo ($${Number(newProd.wholesalePrice).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) no puede ser menor que el costo ($${Number(newProd.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.`); focusAfter(refNPWholesale); return; }
    setNewProdError(null);
    const item: InventoryItem = {
      id: `ACC-${Date.now().toString().slice(-6)}`,
      code: newProd.code.trim() || `7500${Math.floor(Math.random() * 9000 + 1000)}`,
      name: newProd.name.trim().toUpperCase(),
      brand: 'GENÉRICO',
      category: newProd.category || 'Accesorio',
      cost: Number(newProd.cost) || 0,
      price: Number(newProd.price) || 0,
      wholesalePrice: Number(newProd.wholesalePrice) || 0,
      stock: 0, // Inicia en 0 y se suma al procesar el abasto
      minStock: (newProd.minStock === '' || isNaN(Number(newProd.minStock))) ? 3 : Number(newProd.minStock),
      favorite: false,
    };
    const newInventory = [item, ...inventory];
    onUpdateInventory(newInventory);
    // Auto-agregar al reabasto con la cantidad ingresada como nueva cantidad
    setReplenishList(prev => [...prev, {
      id: item.id,
      name: item.name,
      code: item.code,
      brand: item.brand,
      currentStock: 0,
      addedQty: Number(newProd.stock) || 1,
      cost: item.cost,
      imageUrl: item.imageUrl,
      extraImages: item.extraImages,
      category: item.category,
      price: item.price,
      wholesalePrice: item.wholesalePrice,
      originalCost: item.cost
    }]);
    setSearchTerm('');
    setShowNewProduct(false);
    setSuccessMessage(`✅ "${item.name}" agregado al inventario y a la lista de reabasto.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const npEnter = (next: React.RefObject<HTMLElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); next.current?.focus(); }
  };

  // Filter inventory for search selection using robust text normalization (e.g. ignoring accents/Mac formatting)
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    // Normalizar texto eliminando acentos y diacríticos de manera robusta
    const normalize = (text: string) => 
      text.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

    const q = normalize(searchTerm);
    return inventory.filter(item => 
      item.active !== false &&
      !item.deletedAt &&
      item.manageStock !== false &&
      (normalize(item.name).includes(q) || 
      (item.code && normalize(item.code).includes(q)))
    ).slice(0, 10);
  }, [searchTerm, inventory]);

  // Append product to the current list
  const addProductToList = (item: InventoryItem) => {
    const exists = replenishList.find(draft => draft.id === item.id);
    if (exists) {
      setErrorMessage(`El artículo "${item.name}" ya se encuentra agregado en la lista.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Search for historical cost suggestions from this specific supplier
    let suggestedCost = item.cost || 0;
    let isSuggested = false;
    let suggestedProviderName = '';

    const upperProvider = provider.toUpperCase().trim();
    if (upperProvider) {
      // Find the most recent reorder log from this provider that contains the added item
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

    setPendingAddItem(item);
    setPendingAddQty('5');
    setPendingAddCost(suggestedCost.toString());
    setPendingAddIsSuggested(isSuggested);
    setPendingAddSuggestedProvider(suggestedProviderName);
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setReplenishList(
      replenishList.map(item => item.id === id ? { ...item, addedQty: Math.max(1, qty) } : item)
    );
  };

  const handleUpdateCost = (id: string, costVal: number) => {
    setReplenishList(
      replenishList.map(item => item.id === id ? { ...item, cost: Math.max(0, costVal) } : item)
    );
  };

  const handleUpdatePrice = (id: string, priceVal: number) => {
    setReplenishList(
      replenishList.map(item => item.id === id ? { ...item, price: Math.max(0, priceVal) } : item)
    );
  };

  const handleUpdateWholesalePrice = (id: string, wholesalePriceVal: number) => {
    setReplenishList(
      replenishList.map(item => item.id === id ? { ...item, wholesalePrice: Math.max(0, wholesalePriceVal) } : item)
    );
  };

  const handleRemoveItem = (id: string) => {
    setReplenishList(replenishList.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setReplenishList([]);
    setNote('');
    setProvider('');
    setCustomProviderActive(false);
    localStorage.removeItem(DRAFT_KEY);
  };

  // Intercept submit and show confirmation modal
  const handleProcessReplenish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider.trim()) {
      setErrorMessage('Por favor ingrese o seleccione un proveedor válido para continuar.');
      return;
    }
    if (replenishList.length === 0) {
      setErrorMessage('La lista de reabastecimiento está vacía. Añada repuestos o accesorios.');
      return;
    }
    setErrorMessage(null);
    setShowConfirmReplenish(true);
  };

  // Submit and process stock upon confirmation
  const handleConfirmProcess = () => {
    setShowConfirmReplenish(false);
    
    // Calculamos costos totales
    const batchTotalCost = replenishList.reduce((acc, current) => acc + (current.addedQty * current.cost), 0);

    // 1. Actualizar el inventario general
    const updatedInventory = inventory.map(inv => {
      const matchDraft = replenishList.find(draft => draft.id === inv.id);
      if (matchDraft) {
        return {
          ...inv,
          stock: inv.stock + matchDraft.addedQty,
          cost: matchDraft.cost // Actualizar el costo de compra unitario registrado
        };
      }
      return inv;
    });

    onUpdateInventory(updatedInventory);

    // 2. Registrar egreso (gasto) opcional si onAddExpense está provisto
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

    // 3. Crear el log histórico de reabastecimiento
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

    setHistoryLogs([newLog, ...historyLogs]);
    setSuccessMessage(`¡Entrada masiva de stock procesada con éxito! Se cargó el inventario para ${replenishList.length} artículos.`);
    
    // Clear draft form
    handleClearAll();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const totalCostDraft = replenishList.reduce((acc, draft) => acc + (draft.addedQty * draft.cost), 0);
  const totalQtyDraft = replenishList.reduce((acc, draft) => acc + draft.addedQty, 0);

  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  if (currentUser && !currentUser.permissions.canRestockItems) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500 p-8">
        <span className="text-5xl">🔒</span>
        <p className="text-lg font-bold">Sin acceso</p>
        <p className="text-sm text-center">Tu usuario no tiene permiso para realizar reabastecimiento.</p>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 overflow-y-auto flex-1 h-full ${
      isRetro 
        ? 'bg-[#eaeef3] text-zinc-900 border-t border-white' 
        : isLight 
          ? 'bg-zinc-50 text-zinc-800' 
          : 'bg-[#0a0b0d] text-gray-250'
    }`}>
      
      {/* View Header */}
      <div className={`mb-5 pb-3 border-b ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-800/80'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div>
          <h2 className={`text-xl font-display font-black flex items-center gap-2 ${isRetro ? 'text-blue-900' : isLight ? 'text-indigo-750' : 'text-amber-500'}`}>
            <Truck className="w-5 h-5 antialiased" /> REABASTECER POR PROVEEDOR
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Módulo para cargar cantidades de stock de forma masiva agrupadas por proveedor y registrar los costos de compra en movimientos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {replenishList.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`px-3 py-1 text-xs rounded border transition-all ${isRetro ? 'bg-zinc-200 border-zinc-300 hover:bg-zinc-150 text-zinc-600' : 'bg-[#121316] hover:bg-zinc-900 text-red-400 border-red-500/20'}`}
            >
              Vaciar Borrador
            </button>
          )}
        </div>
      </div>

      {feedbackMsg(successMessage, errorMessage, isRetro)}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* COL 1 & 2: REPLENISH BATCH BUILDER */}
        <div className="xl:col-span-2 space-y-5">
          
          {/* STEP 1: SELECT SUPPLIER/PROVIDER */}
          <div className={`p-4 rounded border transition-all ${
            isRetro 
              ? 'bg-white border-zinc-300 shadow-sm' 
              : isLight 
                ? 'bg-white border-zinc-200 shadow-sm text-zinc-800' 
                : 'bg-[#121316] border-[#1e2025]'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black ${provider.trim() ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                {provider.trim() ? '✓' : '1'}
              </span>
              Seleccione el Proveedor
              {provider.trim() && <span className={`ml-1 text-[10px] font-bold ${isRetro ? 'text-emerald-700' : isLight ? 'text-emerald-700' : 'text-emerald-450'}`}>— {provider}</span>}
            </h3>

            {!customProviderActive && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-2">Escoja de favoritos o ingrese un proveedor alternativo:</p>
                {recentProviders.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recentProviders.map((prov) => (
                      <button
                        type="button"
                        key={prov}
                        onClick={() => handleSelectProvider(prov)}
                        className={`px-2.5 py-1 text-[10px] rounded border transition-all truncate max-w-[200px] cursor-pointer ${
                          provider === prov
                            ? isRetro
                              ? 'bg-blue-600 text-white border-blue-700'
                              : isLight
                                ? 'bg-indigo-50 border-indigo-250 text-indigo-700 font-black shadow-sm'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/60 font-bold shadow-md'
                            : isRetro
                              ? 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                              : isLight
                                ? 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200 text-zinc-700 hover:border-zinc-400'
                                : 'bg-[#090a0d] border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`text-[10px] mb-3 italic ${isRetro ? 'text-zinc-400' : 'text-zinc-650'}`}>
                    Aún no hay proveedores recientes. Registra uno nuevo para empezar.
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {provider.trim() && (
                    <span className={`text-[11px] font-mono font-bold mr-2 ${
                      isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-800-important' : 'text-zinc-300'
                    }`}>
                      Proveedor actual: <strong className={isLight ? 'text-amber-700 font-black' : 'text-amber-500'}>{provider}</strong>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={openNewProviderModal}
                    className={`text-[10.5px] font-black text-blue-500 cursor-pointer hover:underline flex items-center gap-1 leading-none`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Registrar nuevo proveedor
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SEARCH & ADD ARTICLES */}
          <div className={`p-4 rounded border transition-all ${
            !provider.trim()
              ? isRetro 
                ? 'bg-zinc-100 border-zinc-200 opacity-50' 
                : isLight
                  ? 'bg-zinc-50 border-zinc-200 opacity-50'
                  : 'bg-[#0e0f12] border-[#1a1b20] opacity-40'
              : isRetro 
                ? 'bg-white border-zinc-300 shadow-sm' 
                : isLight
                  ? 'bg-white border-zinc-250 shadow-sm'
                  : 'bg-[#121316] border-[#1e2025]'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-750' : 'text-zinc-300'}`}>
              <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black ${replenishList.length > 0 ? 'bg-emerald-500' : provider.trim() ? 'bg-blue-500' : 'bg-zinc-400'}`}>
                {replenishList.length > 0 ? '✓' : '2'}
              </span>
              Añadir Repuestos o Accesorios al Surtido
              {!provider.trim() && <span className={`ml-1 text-[9px] font-bold ${isRetro ? 'text-zinc-400' : 'text-zinc-500'}`}>— Primero elige un proveedor</span>}
            </h3>
            <p className="text-[10.5px] text-zinc-500 mb-3">
              Use el buscador para filtrar su inventario y agréguelos a la tabla para editar sus cantidades masivamente
            </p>

            {/* Embed local style to override global background color for this search container so it has a professional slight gray tone and is not lost on white cards */}
            <style>{`
              div.premium-search-container.replenish-search-container {
                background-color: ${isRetro ? '#eaeef3' : isLight ? '#f1f5f9' : '#24252a'} !important;
                background: ${isRetro ? '#eaeef3' : isLight ? '#f1f5f9' : '#24252a'} !important;
                border: 2px solid ${isRetro ? '#cbd5e1' : isLight ? '#cbd5e1' : '#3f424b'} !important;
                box-shadow: ${isLight ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.4)'} !important;
              }
              div.premium-search-container.replenish-search-container:focus-within {
                border-color: ${isRetro ? '#000080' : isLight ? '#3b82f6' : '#f59e0b'} !important;
              }
              div.premium-search-container.replenish-search-container input {
                color: ${isRetro ? '#000000' : isLight ? '#0f172a' : '#f4f4f5'} !important;
              }
              div.premium-search-container.replenish-search-container input::placeholder {
                color: ${isRetro ? '#7c7c7c' : isLight ? '#94a3b8' : '#71717a'} !important;
              }
            `}</style>

            {/* Premium, wide, and uniform fully rounded search bar identical to POS */}
            <div className="premium-search-container replenish-search-container animate-fadeIn shrink-0 select-none flex items-center mb-4">
              {/* Magnifying glass (lupa) */}
              <div className="flex items-center text-zinc-400 shrink-0">
                <Search className="w-5 h-5 text-zinc-400" />
              </div>

              {/* Vertical divider line */}
              <div className={`w-[1px] h-6 mx-4 shrink-0 ${isLight ? 'bg-zinc-300' : 'bg-zinc-700'}`}></div>

              {/* Main search text input */}
              <div className="relative flex-1 flex items-center h-full">
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-autocomplete="none"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder={provider.trim() ? "Escanee código de barras, descripción o SKU..." : "Primero selecciona un proveedor..."}
                  value={searchTerm}
                  onChange={(e) => { if (provider.trim()) setSearchTerm(e.target.value); }}
                  disabled={!provider.trim()}
                  className={`premium-search-input font-sans text-xs ${!provider.trim() ? 'cursor-not-allowed' : ''}`}
                  onKeyDown={(e) => {
                    const queryVal = searchTerm.trim();
                    if (queryVal !== '') {
                      const matchesCount = filteredProducts.length;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (matchesCount > 0) {
                          setInlineSelectedIndex((prev) => (prev + 1) % matchesCount);
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (matchesCount > 0) {
                          setInlineSelectedIndex((prev) => (prev - 1 + matchesCount) % matchesCount);
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (matchesCount > 0) {
                          const selectedItem = filteredProducts[inlineSelectedIndex];
                          if (selectedItem) addProductToList(selectedItem);
                        } else if (searchTerm.trim()) {
                          // Sin coincidencias → abrir mini-form de nuevo producto
                          if (!showNewProduct) openNewProduct();
                          else saveNewProduct();
                        }
                      }
                    }
                  }}
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-0 text-zinc-400 hover:text-zinc-500 transition-colors select-none cursor-pointer premium-search-icon-btn"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick search suggestions results, styled with high contrast and harmony like POS */}
            {searchTerm.trim().length > 0 && (
              <div className={`rounded-xl border shadow-xl overflow-hidden mb-4 ${
                isRetro 
                  ? 'bg-white border-zinc-300 shadow-md divide-y divide-zinc-150' 
                  : isLight 
                    ? 'bg-white border-zinc-200 shadow-md divide-y divide-zinc-200 text-zinc-800' 
                    : 'bg-[#16171d] border-[#22242a] shadow-black/40 divide-y divide-[#1e2025]'
              }`}>
                <div className={`px-4 py-2 text-[10px] uppercase font-black tracking-wider ${
                  isRetro 
                    ? 'bg-zinc-100 text-zinc-500' 
                    : isLight 
                      ? 'bg-zinc-50 text-indigo-700 border-b border-zinc-200' 
                      : 'bg-black/40 text-amber-500 border-b border-zinc-800/25'
                }`}>
                  🔍 Coincidencias en Inventario ({filteredProducts.length}) — Use ↑ ↓ y Enter
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center flex flex-col items-center gap-2">
                    <p className={`text-xs font-bold ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      Sin coincidencias para "<span className="font-black">{searchTerm}</span>"
                    </p>
                    {!showNewProduct ? (
                      <button
                        type="button"
                        onClick={openNewProduct}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 ${
                          isRetro
                            ? 'bg-[#000080] text-white hover:bg-blue-900 border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                            : isLight 
                              ? 'bg-indigo-600 hover:bg-indigo-750 text-white-important shadow-sm'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        Agregar como nuevo producto
                      </button>
                    ) : (
                      <div className={`w-full text-left mt-1 rounded-lg border p-3 space-y-2.5 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#1a1b20] border-[#2d2f36]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            <PackagePlus className="w-3 h-3" /> Nuevo Producto
                          </span>
                          <button type="button" onClick={() => setShowNewProduct(false)} className={`p-0.5 rounded ${isRetro ? 'hover:bg-zinc-300 text-zinc-600' : 'hover:bg-white/10 text-zinc-400'}`}><X className="w-3.5 h-3.5" /></button>
                        </div>

                        {/* Nombre */}
                        <div>
                          <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Nombre *</label>
                          <input ref={refNPName} type="text" autoFocus value={newProd.name}
                            onChange={e => handleCaretPreservingChange(e, (val) => setNewProd(p => ({ ...p, name: val })), val => val.toUpperCase())}
                            onKeyDown={npEnter(refNPStock)}
                            className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-bold ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                            placeholder="Nombre del producto..."
                          />
                        </div>

                        {/* Código */}
                        <div>
                          <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Código de Barras</label>
                          <input ref={refNPCode} type="text" value={newProd.code}
                            onChange={e => setNewProd(p => ({ ...p, code: e.target.value }))}
                            onKeyDown={npEnter(refNPStock)}
                            className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                          />
                        </div>

                        {/* Stock + Mínimo */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Unidades</label>
                            <input ref={refNPStock} type="number" min={0} value={newProd.stock || ''}
                              onChange={e => setNewProd(p => ({ ...p, stock: Math.max(0, parseInt(e.target.value) || 0) }))}
                              onFocus={e => e.target.select()} onKeyDown={npEnter(refNPMin)}
                              className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Mínimo</label>
                            <input ref={refNPMin} type="number" min={0} value={newProd.minStock}
                              onChange={e => setNewProd(p => ({ ...p, minStock: Math.max(0, parseInt(e.target.value) || 0) }))}
                              onFocus={e => e.target.select()} onKeyDown={npEnter(refNPCost)}
                              className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                            />
                          </div>
                        </div>

                        {/* Costo + Precio + Mayoreo */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Costo ({config.currencySymbol})</label>
                            <input ref={refNPCost} type="number" min={0} step="0.01" value={newProd.cost === 0 ? '' : newProd.cost}
                              onChange={e => setNewProd(p => ({ ...p, cost: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setNewProd(p => ({ ...p, cost: v })); }}
                              onFocus={e => e.target.select()} onKeyDown={npEnter(refNPPrice)}
                              className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Precio ({config.currencySymbol})</label>
                            <input ref={refNPPrice} type="number" min={0} step="0.01" value={newProd.price === 0 ? '' : newProd.price}
                              onChange={e => setNewProd(p => ({ ...p, price: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setNewProd(p => ({ ...p, price: v })); }}
                              onFocus={e => e.target.select()}
                              onKeyDown={npEnter(refNPWholesale)}
                              className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className={`text-[9px] uppercase font-bold block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Mayoreo ({config.currencySymbol})</label>
                            <input ref={refNPWholesale} type="number" min={0} step="0.01" value={newProd.wholesalePrice === 0 ? '' : newProd.wholesalePrice}
                              onChange={e => setNewProd(p => ({ ...p, wholesalePrice: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setNewProd(p => ({ ...p, wholesalePrice: v })); }}
                              onFocus={e => e.target.select()}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNewProduct(); } }}
                              className={`w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-mono ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#111215] border border-[#2d2f36] text-zinc-100 focus:border-amber-500'}`}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {Number(newProd.price) > 0 && Number(newProd.cost) > 0 && Number(newProd.price) < Number(newProd.cost) && (
                          <p className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
                            🚫 El precio de venta (${Number(newProd.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) es menor que el costo (${Number(newProd.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.
                          </p>
                        )}

                        {Number(newProd.wholesalePrice) > 0 && Number(newProd.cost) > 0 && Number(newProd.wholesalePrice) < Number(newProd.cost) && (
                          <p className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
                            🚫 El precio de mayoreo (${Number(newProd.wholesalePrice).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) es menor que el costo (${Number(newProd.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.
                          </p>
                        )}

                        {newProdError && (
                          <p className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
                            ⚠ {newProdError}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={saveNewProduct}
                          className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-[0.98] ${
                            isRetro
                              ? 'bg-[#000080] text-white hover:bg-blue-900 border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                              : isLight 
                                ? 'bg-indigo-650 hover:bg-indigo-750 text-white-important font-bold shadow-sm'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          ✓ Guardar y agregar al reabasto
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`max-h-80 overflow-y-auto ${isRetro ? 'divide-y divide-zinc-150' : isLight ? 'divide-y divide-zinc-200' : 'divide-y divide-[#1e2025]'}`}>
                    {filteredProducts.map((item, idx) => {
                      const isSelected = idx === inlineSelectedIndex;
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => addProductToList(item)}
                          onMouseEnter={() => setInlineSelectedIndex(idx)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? isRetro
                                ? 'bg-blue-100 text-blue-950 border-l-4 border-blue-600 shadow-inner'
                                : isLight 
                                  ? 'bg-indigo-50 text-indigo-950 border-l-4 border-indigo-500 shadow-inner'
                                  : 'bg-amber-500/20 text-white border-l-4 border-amber-500 shadow-inner'
                              : isRetro 
                                ? 'hover:bg-blue-50 text-zinc-900 border-l-4 border-transparent' 
                                : isLight 
                                  ? 'hover:bg-zinc-100 text-zinc-700 border-l-4 border-transparent'
                                  : 'hover:bg-amber-500/5 text-zinc-200 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <PosItemThumbnail
                                imageUrl={item.imageUrl}
                                name={item.name}
                                code={item.code}
                                category={item.category}
                                price={item.price}
                                currencySymbol={config.currencySymbol}
                                size={32}
                              />
                            </div>
                            <div className="leading-tight text-left min-w-0">
                              <span className={`text-xs font-black block uppercase truncate max-w-[320px] ${
                                isSelected
                                  ? isRetro ? 'text-blue-900' : isLight ? 'text-indigo-900' : 'text-amber-300'
                                  : isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-800' : 'text-zinc-300'
                              }`}>
                                {item.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5 block truncate">
                                Marca: <strong className={isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-700' : 'text-zinc-300'}>{item.brand || 'S/M'}</strong> | 
                                Código: <strong className={`${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-700' : 'text-zinc-300'} font-bold`}>{item.code || 'S/C'}</strong> | 
                                Stock: <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${
                                  item.stock > 0 
                                    ? isLight 
                                      ? 'text-emerald-700 bg-emerald-100/70 border border-emerald-200' 
                                      : 'text-emerald-500 bg-emerald-500/10' 
                                    : isLight 
                                      ? 'text-rose-700 bg-rose-100/70 border border-rose-200' 
                                      : 'text-red-500 bg-red-500/10'
                                }`}>{item.stock} pz</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? isRetro
                                  ? 'bg-blue-600 text-white border border-blue-700 scale-105'
                                  : isLight 
                                    ? 'bg-indigo-600 text-white-important border border-indigo-750 scale-105'
                                    : 'bg-amber-500 text-zinc-950 border border-amber-600 scale-105'
                                : isRetro 
                                  ? 'bg-blue-100 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white' 
                                  : isLight 
                                    ? 'bg-zinc-100 border border-zinc-300 text-zinc-700 hover:bg-indigo-650 hover:text-white-important'
                                    : 'bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-50 hover:text-zinc-950'
                            }`}
                          >
                            <Plus className="w-4 h-4 text-current stroke-[3px]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: REPLENISH TABLES GRID */}
          <div className={`p-4 rounded border ${
            isRetro 
              ? 'bg-white border-zinc-300 shadow-sm' 
              : isLight 
                ? 'bg-white border-zinc-200 shadow-sm' 
                : 'bg-[#121316] border-[#1e2025]'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-750' : 'text-zinc-300'}`}>
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black">3</span>
              Surtido actual del Pedido ({replenishList.length} artículos)
            </h3>

            {replenishList.length === 0 ? (
              <div className="text-center py-8 px-4">
                <HelpCircle className="w-12 h-12 mx-auto text-zinc-500 opacity-40 animate-pulse mb-2" />
                <p className="text-xs text-zinc-500">¿No hay artículos en la lista?</p>
                <p className="text-[11px] text-zinc-600 mt-1">Busque arriba los accesorios o repuestos que adquirió con el proveedor para sumarlos aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className={`text-[10px] uppercase font-black tracking-wider border-b ${
                      isRetro 
                        ? 'border-zinc-300 text-zinc-500 bg-zinc-100' 
                        : isLight 
                          ? 'border-zinc-200 text-zinc-500 bg-zinc-50' 
                          : 'border-zinc-800 text-zinc-400 bg-black/30'
                    }`}>
                      <th className="py-2 px-3">Artículo</th>
                      <th className="py-2 px-2 text-center">Stock Actual</th>
                      <th className="py-2 px-2 text-center w-24">Nueva Cantidad</th>
                      <th className="py-2 px-2 text-center">Stock Final</th>
                      <th className="py-2 px-2 text-center w-24">Costo Compra</th>
                      <th className="py-2 px-2 text-center w-28">Nuevo Costo Compra</th>
                      <th className="py-2 px-2 text-center w-28">Nuevo P. Venta</th>
                      <th className="py-2 px-2 text-center w-28">Nuevo P. Mayoreo</th>
                      <th className="py-2 px-2 text-right">Subtotal</th>
                      <th className="py-2 px-1 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {replenishList.map((item) => {
                      const isStockControlled = item.manageStock !== false;
                      const currentStock = item.currentStock;
                      const isAgotado = isStockControlled && currentStock === 0;
                      return (
                        <tr 
                          key={item.id} 
                          className={`text-xs ${
                            isRetro 
                              ? 'hover:bg-zinc-50 text-zinc-800' 
                              : isLight 
                                ? 'hover:bg-zinc-50 text-zinc-800' 
                                : 'hover:bg-[#15161b] text-zinc-300'
                          }`}
                        >
                          <td className="py-3 px-3 leading-tight font-sans">
                            <div className="flex items-center gap-3.5">
                              <div className="flex-shrink-0">
                                <PosItemThumbnail
                                  imageUrl={item.imageUrl}
                                  name={item.name}
                                  code={item.code}
                                  category={item.category}
                                  price={item.price}
                                  currencySymbol={config.currencySymbol}
                                  size={32}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`font-extrabold block truncate max-w-[240px] ${isRetro ? 'text-blue-900 font-black' : isLight ? 'text-zinc-800-important font-black' : 'text-amber-500'}`}>{item.name}</span>
                                <span className="text-[9.5px] font-mono text-zinc-500 uppercase block truncate">
                                  {item.brand || 'S/M'} | {item.code || 'S/C'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={`py-3 px-2 text-center font-mono font-bold ${isLight ? 'text-zinc-850' : 'text-zinc-300'}`}>
                            {item.currentStock}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.addedQty}
                              onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value, 10))}
                              className={`w-full text-center font-bold px-1.5 py-1 text-xs rounded border focus:outline-none focus:ring-1 ${
                                isRetro 
                                  ? 'bg-zinc-50 border-zinc-300 text-blue-900 focus:ring-blue-500' 
                                  : isLight 
                                    ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:ring-indigo-500' 
                                    : 'bg-[#090a0d] border-zinc-800 text-amber-300 focus:ring-amber-500'
                              }`}
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`font-sans font-extrabold text-[12px] ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>
                              {item.currentStock + item.addedQty}
                            </span>
                          </td>
                          <td className={`py-3 px-2 text-center font-mono font-bold ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            {config.currencySymbol || '$'}{(item.originalCost ?? item.cost ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-zinc-500 font-mono text-[10px]">{config.currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cost}
                                onChange={(e) => handleUpdateCost(item.id, parseFloat(e.target.value) || 0)}
                                className={`w-full text-right pr-2 pl-4 py-1 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                                  isRetro 
                                    ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-blue-500' 
                                    : isLight 
                                      ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-indigo-500' 
                                      : 'bg-[#090a0d] border-zinc-800 text-white focus:ring-amber-500'
                                }`}
                              />
                            </div>
                            {item.isSuggested && (
                              <div className={`text-[8.5px] leading-tight font-extrabold mt-0.5 select-none text-left pl-1 truncate max-w-[110px] ${
                                isRetro ? 'text-emerald-700' : isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'
                              }`} title={`Sugerido por historial de ${item.suggestedProvider}`}>
                                💡 Historial: {item.suggestedProvider}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-zinc-500 font-mono text-[10px]">{config.currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price === undefined || isNaN(Number(item.price)) ? '' : item.price}
                                onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className={`w-full text-right pr-2 pl-4 py-1 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                                  isRetro 
                                    ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-blue-500' 
                                    : isLight 
                                      ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-indigo-500' 
                                      : 'bg-[#090a0d] border-zinc-800 text-white focus:ring-amber-500'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-zinc-500 font-mono text-[10px]">{config.currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.wholesalePrice === undefined || isNaN(Number(item.wholesalePrice)) ? '' : item.wholesalePrice}
                                onChange={(e) => handleUpdateWholesalePrice(item.id, parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className={`w-full text-right pr-2 pl-4 py-1 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                                  isRetro 
                                    ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-blue-500' 
                                    : isLight 
                                      ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:ring-indigo-500' 
                                      : 'bg-[#090a0d] border-zinc-800 text-white focus:ring-amber-500'
                                }`}
                              />
                            </div>
                          </td>
                          <td className={`py-3 px-2 text-right font-mono font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-400'}`}>
                            {config.currencySymbol}{(item.addedQty * item.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer rounded"
                              title="Remover de la carga masiva"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* COL 3: SUMMARY & FINALIZE PROCESS */}
        <div className="space-y-6">
          <form onSubmit={handleProcessReplenish} className={`p-4 rounded border ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 shadow-sm' 
              : isLight 
                ? 'bg-white border-zinc-200 text-zinc-800 shadow-sm' 
                : 'bg-[#121316] border-[#1e2025]'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-3 ${
              isRetro ? 'text-blue-900 border-[#808080]' : isLight ? 'text-indigo-750 border-zinc-200' : 'text-zinc-300 border-zinc-800'
            }`}>
              Resumen del Reabastecimiento
            </h3>

            <div className="space-y-3 mt-1.5">
              <div className="flex justify-between text-xs">
                <span className={isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-650' : 'text-zinc-500'}>Proveedor:</span>
                <span className={`font-extrabold uppercase text-right max-w-[150px] truncate block ${
                  isRetro ? 'text-blue-900 font-black' : isLight ? 'text-amber-700 font-black' : 'text-amber-455 text-white'
                }`}>
                  {provider || 'POR ASIGNAR'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-650' : 'text-zinc-500'}>Artículos únicos:</span>
                <span className={`font-bold ${isRetro ? 'text-zinc-900 font-black' : isLight ? 'text-zinc-850' : 'text-white'}`}>{replenishList.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-650' : 'text-zinc-500'}>Unidades Totales:</span>
                <span className={`font-mono font-bold ${isRetro ? 'text-blue-720 font-extrabold' : isLight ? 'text-indigo-700 font-bold' : 'text-blue-400'}`}>{totalQtyDraft} px</span>
              </div>

              {/* Expense connection toggle */}
              {onAddExpense && (
                <div className={`p-2 px-2.5 rounded border my-2 flex items-start gap-1.5 transition-colors ${
                  autoRegisterExpense 
                    ? isRetro 
                      ? isLight ? 'bg-emerald-100 border-emerald-450 text-emerald-950 shadow-inner' : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                      : 'bg-emerald-950/10 border-emerald-500/20'
                    : isRetro 
                      ? isLight ? 'bg-zinc-200 border-zinc-400 text-zinc-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      : 'bg-[#0a0a0d] border-zinc-600/40'
                }`}>
                  <input
                    type="checkbox"
                    id="auto-expense"
                    checked={autoRegisterExpense}
                    onChange={(e) => setAutoRegisterExpense(e.target.checked)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="auto-expense" className="text-[10px] font-medium select-none cursor-pointer leading-tight block">
                    <strong className={`font-bold block ${
                      isRetro 
                        ? isLight ? 'text-emerald-850' : 'text-emerald-350 font-extrabold'
                        : 'text-emerald-450'
                    }`}>Registrar como Movimiento de Egreso</strong>
                    <span className={isRetro ? (isLight ? 'text-zinc-600' : 'text-zinc-400') : 'text-zinc-500'}>
                      Genera una orden de gasto por la compra de repuestos para verla reflejada en caja.
                    </span>
                  </label>
                </div>
              )}

              {/* Notes block */}
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>Notas del Cargamento / Referencia de Factura</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Factura #2910, piezas recibidas en buen estado en caja principal..."
                  className={`w-full rounded p-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-950 focus:ring-blue-500' 
                      : isLight 
                        ? 'bg-zinc-50 border border-zinc-300 text-zinc-800 focus:ring-indigo-500' 
                        : 'bg-[#08090b] border border-zinc-700 text-white focus:ring-amber-500'
                  }`}
                />
              </div>

              <div className={`border-t pt-3 my-2 ${isRetro ? 'border-[#808080]' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black shrink-0 ${replenishList.length > 0 && provider.trim() ? 'bg-blue-500' : 'bg-zinc-400'}`}>3</span>
                  <span className={`text-[10px] font-black uppercase tracking-wide ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Procesar Entrada</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xs uppercase font-black tracking-wider ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-650' : 'text-zinc-500'}`}>Costo de Inversión:</span>
                  <span className={`text-lg font-mono font-black ${isRetro ? 'text-rose-700' : isLight ? 'text-rose-700' : 'text-rose-500'}`}>
                    {config.currencySymbol}{totalCostDraft.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={replenishList.length === 0 || !provider.trim()}
                  title={!provider.trim() ? 'Primero elige o escribe un proveedor' : replenishList.length === 0 ? 'Agrega al menos un artículo a la lista' : undefined}
                  className={`w-full py-2.5 text-xs uppercase font-black tracking-widest rounded flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                    replenishList.length === 0 || !provider.trim()
                      ? 'bg-zinc-600/50 text-zinc-500 cursor-not-allowed border border-transparent'
                      : isRetro 
                        ? 'bg-[#113a7c] text-white hover:bg-blue-800 border-2 border-t-[#1d5fb9] border-l-[#1d5fb9] border-r-[#081e42] border-b-[#081e42]' 
                        : isLight 
                          ? 'bg-indigo-650 hover:bg-indigo-750 text-white-important font-bold' 
                          : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold'
                  } cursor-pointer`}
                >
                  <Check className="w-4 h-4 text-current" />
                  <span>Procesar Entrada Masiva</span>
                </button>
              </div>
            </div>
          </form>

          {/* HISTORIAL RECIBIDO RECIENTE */}
          <div className={`p-4 rounded border ${
            isRetro 
              ? 'bg-white border-zinc-300 shadow-sm' 
              : isLight 
                ? 'bg-white border-zinc-200 shadow-sm' 
                : 'bg-[#121316] border-[#1e2025]'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1 opacity-80 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-750' : 'text-zinc-300'}`}>
              <Receipt className="w-4 h-4" /> Historial de Reabastecimientos
            </h3>
            <p className="text-[9.5px] text-zinc-500 mb-3">
              Últimas cargas masivas procesadas guardadas en sesión local
            </p>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {historyLogs.length === 0 ? (
                <p className="text-zinc-500 text-center text-xs py-4">No hay registros históricos de abasto.</p>
              ) : (
                historyLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-2.5 rounded border text-xs leading-normal ${
                      isRetro 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800' 
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-850' 
                          : 'bg-black/30 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className={`flex items-center justify-between font-mono font-bold text-[9.5px] text-zinc-500 mb-1 border-b pb-1 ${
                      isLight ? 'border-zinc-200' : 'border-zinc-800/20'
                    }`}>
                      <span>{log.id}</span>
                      <span>{new Date(log.date).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className={`font-extrabold uppercase text-[10.5px] ${isLight ? 'text-amber-700 font-black' : 'text-amber-500'}`}>
                      {log.provider}
                    </div>

                    {log.note && (
                      <p className={`p-1.5 rounded my-1 font-sans text-[10px] italic ${
                        isRetro 
                          ? 'bg-white text-zinc-500' 
                          : isLight 
                            ? 'bg-zinc-100 text-zinc-650 border border-zinc-200' 
                            : 'bg-[#1b1c21] text-zinc-400'
                      }`}>
                        "{log.note}"
                      </p>
                    )}

                    <div className="mt-1.5 space-y-0.5 text-[9.5px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Equipos surtidos:</span>
                        <span className="font-bold">{log.itemsCount} tipos ({log.items.reduce((a, b) => a + b.addedQty, 0)} pz)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Monto Invertido:</span>
                        <span className={`font-bold font-mono ${isLight ? 'text-rose-700 font-extrabold' : 'text-rose-400'}`}>{config.currencySymbol}{log.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {showConfirmReplenish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className={`${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-white rounded shadow-2xl text-zinc-900' 
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-xl text-zinc-800 shadow-2xl' 
                : 'bg-[#121316] border border-[#1e2025] rounded-xl text-zinc-100'
          } max-w-md w-full overflow-hidden animate-scaleUp`}>
            <div className="p-5 flex flex-col items-center text-center space-y-4">
              <div className={`p-3 rounded-full ${
                isRetro 
                  ? 'bg-blue-100 border border-blue-300 text-blue-700' 
                  : isLight 
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-750' 
                    : 'bg-[#24252a] border border-[#3f424b] text-[#f59e0b]'
              }`}>
                <Truck className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className={`font-display font-black uppercase tracking-widest text-sm ${
                  isRetro ? 'text-[#113a7c]' : isLight ? 'text-indigo-750' : 'text-[#f59e0b]'
                }`}>¿Registrar Entrada Masiva?</h4>
                <p className={`text-xs leading-relaxed ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-650' : 'text-zinc-300'}`}>
                  Esto ingresará un total de <strong className={isRetro ? 'text-blue-700 font-extrabold' : isLight ? 'text-indigo-700 font-bold' : 'text-amber-500 font-extrabold'}>{totalQtyDraft} piezas</strong> para <strong className={isRetro ? 'text-blue-700 font-extrabold' : isLight ? 'text-indigo-700 font-bold' : 'text-amber-500 font-extrabold'}>{replenishList.length} productos</strong> al inventario del taller.
                </p>
                {autoRegisterExpense && onAddExpense && (
                  <p className={`p-2 rounded text-[11px] font-medium border leading-tight ${
                    isRetro 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                      : isLight 
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                        : 'bg-emerald-950/15 border-emerald-900/40 text-emerald-300'
                  }`}>
                    <strong>Nota:</strong> Se registrará de forma automática un <strong>egreso de caja por {config.currencySymbol}{totalCostDraft.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> del proveedor "{provider.toUpperCase()}".
                  </p>
                )}
              </div>
            </div>
            <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-zinc-400' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#0f1013] border-[#1a1c22]'
            }`}>
              <button
                type="button"
                onClick={() => setShowConfirmReplenish(false)}
                className={`px-3.5 py-1.5 text-xs rounded transition-colors ${
                  isRetro 
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-black font-semibold' 
                    : isLight 
                      ? 'text-zinc-550 hover:text-zinc-800 bg-transparent border border-zinc-300' 
                      : 'text-gray-400 hover:text-white bg-transparent border border-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmProcess}
                className={`px-4 py-1.5 text-xs font-black rounded uppercase tracking-wider transition-colors ${
                  isRetro 
                    ? 'bg-[#113a7c] text-white hover:bg-blue-800 border-2 border-t-[#216cd3] border-l-[#216cd3]' 
                    : isLight 
                      ? 'bg-indigo-650 hover:bg-indigo-750 text-white-important font-bold shadow-sm' 
                      : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold'
                }`}
              >
                Sí, Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className={`${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-white rounded shadow-2xl text-zinc-900' 
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-xl text-zinc-800 shadow-2xl' 
                : 'bg-[#121316] border border-[#1e2025] rounded-xl text-zinc-100'
          } max-w-md w-full overflow-hidden animate-scaleUp`}>
            <div className="p-5 space-y-4">
              <div className={`flex items-center justify-between pb-2 border-b ${
                isLight ? 'border-zinc-200' : 'border-zinc-800/60'
              }`}>
                <h4 className={`font-display font-black uppercase tracking-widest text-sm ${
                  isRetro ? 'text-[#113a7c]' : isLight ? 'text-indigo-750' : 'text-amber-500'
                } flex items-center gap-1.5`}>
                  <PackagePlus className="w-5 h-5 text-current" /> AGREGAR A ABASTO
                </h4>
                <button
                  type="button"
                  onClick={() => setPendingAddItem(null)}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-3 rounded border text-xs space-y-1.5 ${
                isRetro 
                  ? 'bg-white border-zinc-300' 
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200' 
                    : 'bg-[#181a1f] border-zinc-800'
              }`}>
                <div>
                  <span className="text-zinc-500 font-bold">Producto:</span>{' '}
                  <span className="font-extrabold uppercase">{pendingAddItem.name}</span>
                </div>
                {pendingAddItem.code && (
                  <div>
                    <span className="text-zinc-500 font-bold">Código/SKU:</span>{' '}
                    <span className={`font-mono ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>{pendingAddItem.code}</span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500 font-bold">Stock Actual:</span>{' '}
                  <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] ${
                    pendingAddItem.stock <= pendingAddItem.minStock
                      ? isLight 
                        ? 'bg-rose-105 text-rose-700 border border-rose-200' 
                        : 'bg-red-500/20 text-red-400'
                      : isLight 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-250' 
                        : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {pendingAddItem.stock} pz (Mín: {pendingAddItem.minStock})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold">Costo en Catálogo:</span>{' '}
                  <span className={`font-extrabold ${isRetro ? 'text-zinc-900' : isLight ? 'text-amber-700 font-black' : 'text-amber-500'}`}>
                    {config.currencySymbol || '$'}{(pendingAddItem.cost || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold">Precio de Venta:</span>{' '}
                  <span className={`font-extrabold ${isRetro ? 'text-zinc-900' : isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {config.currencySymbol || '$'}{(pendingAddItem.price || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold">Precio de Mayoreo:</span>{' '}
                  <span className={`font-extrabold ${isRetro ? 'text-zinc-900' : isLight ? 'text-blue-700' : 'text-sky-400'}`}>
                    {config.currencySymbol || '$'}{(pendingAddItem.wholesalePrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {pendingAddIsSuggested && (
                <div className={`p-2 rounded text-[10px] flex items-center gap-1.5 border ${
                  isRetro 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : isLight 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-750 font-medium' 
                      : 'bg-[#1b253b] border-blue-900/30 text-blue-300'
                }`}>
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Costo unitario sugerido del último abasto con <strong>{pendingAddSuggestedProvider}</strong>.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-[11px] font-bold block ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>CANTIDAD A AGREGAR</label>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    step="1"
                    value={pendingAddQty}
                    onChange={(e) => setPendingAddQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        costInputRef.current?.focus();
                        costInputRef.current?.select();
                      }
                    }}
                    className={`w-full text-sm font-bold p-2 text-center rounded border ${
                      isRetro
                        ? 'bg-white border-zinc-300 text-black'
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500 focus:outline-none'
                          : 'bg-[#1b1c21] border-[#292b35] text-white focus:border-amber-500 focus:outline-none'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-[11px] font-bold block ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>COSTO UNITARIO ({config.currencySymbol || '$'})</label>
                  <input
                    ref={costInputRef}
                    type="number"
                    min="0"
                    step="any"
                    value={pendingAddCost}
                    onChange={(e) => setPendingAddCost(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        confirmAddProduct();
                      }
                    }}
                    className={`w-full text-sm font-bold p-2 text-center rounded border ${
                      isRetro
                        ? 'bg-white border-zinc-300 text-black'
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500 focus:outline-none'
                          : 'bg-[#1b1c21] border-[#292b35] text-white focus:border-amber-500 focus:outline-none'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-zinc-400' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#0f1013] border-[#1a1c22]'
            }`}>
              <button
                type="button"
                onClick={() => setPendingAddItem(null)}
                className={`px-3.5 py-1.5 text-xs rounded transition-colors ${
                  isRetro 
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-black font-semibold' 
                    : isLight 
                      ? 'text-zinc-550 hover:text-zinc-800 bg-transparent border border-zinc-300' 
                      : 'text-gray-400 hover:text-white bg-transparent border border-zinc-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAddProduct}
                className={`px-4 py-1.5 text-xs font-black rounded uppercase tracking-wider transition-colors ${
                  isRetro 
                    ? 'bg-[#113a7c] text-white hover:bg-blue-800 border-2 border-t-[#216cd3] border-l-[#216cd3]' 
                    : isLight 
                      ? 'bg-indigo-650 hover:bg-indigo-750 text-white-important font-bold shadow-sm' 
                      : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold'
                }`}
              >
                Agregar al Surtido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — REGISTRO DE NUEVO PROVEEDOR */}
      {showNewProviderModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowNewProviderModal(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowNewProviderModal(false); }}
          tabIndex={-1}
        >
          <div className={`max-w-sm w-full overflow-hidden animate-scaleUp ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-2xl text-zinc-900'
              : 'bg-[#121316] border border-zinc-600 rounded-xl text-zinc-100 shadow-2xl'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
              isRetro
                ? 'bg-gradient-to-r from-[#113a7c] to-[#1a55b5] border-[#808080]'
                : 'bg-[#0d0f14] border-zinc-700'
            }`}>
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-white shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Nuevo Proveedor</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProviderModal(false)}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                  isRetro ? 'hover:bg-red-600 text-white' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className={`text-[10.5px] leading-snug ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Ingresa los datos del proveedor. <strong className={isRetro ? 'text-zinc-800' : 'text-zinc-200'}>Nombre y teléfono son obligatorios.</strong>
              </p>

              {newProviderModalError && (
                <div className={`flex items-center gap-2 p-2 rounded border text-[10.5px] ${
                  isRetro ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{newProviderModalError}</span>
                </div>
              )}

              {/* Nombre — required */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Nombre del Proveedor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newProviderName}
                  onChange={(e) => handleCaretPreservingChange(e, (val) => { setNewProviderName(val); setNewProviderModalError(''); }, val => val.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('div.space-y-3')?.querySelectorAll('input')[1] as HTMLInputElement)?.focus(); } }}
                  placeholder="Ej. REPUESTOS ZONA NORTE"
                  className={`w-full px-3 py-2 text-sm rounded outline-none border transition-colors ${
                    isRetro
                      ? 'bg-white border-zinc-400 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 placeholder-zinc-400 focus:outline-1 focus:outline-blue-600'
                      : 'bg-[#22252d] border border-zinc-500 focus:border-amber-500 placeholder-zinc-600'
                  }`}
                  style={!isRetro ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}
                />
              </div>

              {/* Teléfono — required */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className={`flex rounded overflow-hidden border focus-within:border-amber-500 transition-colors ${isRetro ? 'border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white' : 'border border-zinc-500 bg-[#22252d]'}`}>
                  <CountryCodeSelect
                    value={newProviderCountryCode}
                    onChange={(code) => setNewProviderCountryCode(code)}
                    className={`shrink-0 pl-2 pr-5 py-2 text-xs font-bold font-mono border-r focus:outline-none appearance-none cursor-pointer ${isRetro ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-[#1a1d23] border-zinc-600 text-zinc-200'}`}
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23888'><path fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /></svg>")`, backgroundPosition: 'right 0.3rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.75rem' }}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    value={newProviderPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewProviderPhone(formatPhoneNumber(digits));
                      setNewProviderModalError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('div.space-y-3')?.querySelectorAll('input')[2] as HTMLInputElement)?.focus(); } }}
                    placeholder="(477) 123-4567"
                    className={`flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono ${isRetro ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-zinc-600'}`}
                  />
                </div>
              </div>

              {/* Ciudad + Estado — row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={newProviderCity}
                    onChange={(e) => handleCaretPreservingChange(e, setNewProviderCity, val => val.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('div.space-y-3')?.querySelectorAll('input')[3] as HTMLInputElement)?.focus(); } }}
                    placeholder="León"
                    className={`w-full px-3 py-2 text-sm rounded outline-none border transition-colors ${
                      isRetro
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 placeholder-zinc-400 focus:outline-1 focus:outline-blue-600'
                        : 'bg-[#22252d] border border-zinc-500 focus:border-amber-500 placeholder-zinc-600'
                    }`}
                    style={!isRetro ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Estado
                  </label>
                  <input
                    type="text"
                    value={newProviderState}
                    onChange={(e) => handleCaretPreservingChange(e, setNewProviderState, val => val.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.closest('div.space-y-3')?.querySelectorAll('input')[4] as HTMLInputElement)?.focus(); } }}
                    placeholder="Guanajuato"
                    className={`w-full px-3 py-2 text-sm rounded outline-none border transition-colors ${
                      isRetro
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 placeholder-zinc-400 focus:outline-1 focus:outline-blue-600'
                        : 'bg-[#22252d] border border-zinc-500 focus:border-amber-500 placeholder-zinc-600'
                    }`}
                    style={!isRetro ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}
                  />
                </div>
              </div>

              {/* Domicilio */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Domicilio
                </label>
                <input
                  type="text"
                  value={newProviderAddress}
                  onChange={(e) => handleCaretPreservingChange(e, setNewProviderAddress, val => val.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewProvider(); } }}
                  placeholder="Calle, número, colonia"
                  className={`w-full px-3 py-2 text-sm rounded outline-none border transition-colors ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 placeholder-zinc-400 focus:outline-1 focus:outline-blue-600'
                      : 'bg-[#22252d] border border-zinc-500 focus:border-amber-500 placeholder-zinc-600'
                  }`}
                  style={!isRetro ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-400' : 'bg-[#0f1013] border-zinc-700'
            }`}>
              <button
                type="button"
                onClick={() => setShowNewProviderModal(false)}
                className={`px-3.5 py-1.5 text-xs rounded transition-colors ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-black font-semibold hover:bg-zinc-100'
                    : 'text-zinc-400 hover:text-white bg-transparent border border-zinc-700 hover:border-zinc-500'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmNewProvider}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded transition-colors ${
                  isRetro
                    ? 'bg-[#113a7c] text-white hover:bg-blue-800 border-2 border-t-[#216cd3] border-l-[#216cd3] border-r-[#081e42] border-b-[#081e42]'
                    : 'bg-amber-600 hover:bg-amber-500 text-zinc-950'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Guardar Proveedor
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function feedbackMsg(success: string | null, error: string | null, isRetro: boolean) {
  if (success) {
    return (
      <div className={`p-3 rounded border text-xs mb-4 flex items-center gap-2 leading-tight select-none animate-fadeIn ${
        isRetro ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
      }`}>
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
        <div>{success}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`p-3 rounded border text-xs mb-4 flex items-center gap-2 leading-tight select-none animate-fadeIn ${
        isRetro ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
      }`}>
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <div>{error}</div>
      </div>
    );
  }
  return null;
}
