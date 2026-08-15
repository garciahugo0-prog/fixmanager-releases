/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InventoryItem, ServicePrice, Sale, WorkshopConfig, AppUser, ApartadoEntry, RepairOrder, RefaccionItem } from '../types';
import { getIndividualAdvance } from '../utils/orderHelpers';
import { generateNextSaleId, extractSaleTicketNumber } from '../utils/folioUtils';

export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/,(?!\s)/g, '-');
}

interface UsePosLogicProps {
  orders: RepairOrder[];
  inventory: InventoryItem[];
  services: ServicePrice[];
  refacciones?: RefaccionItem[];
  onCompleteSale: (sale: Sale, options?: { printTicket?: boolean; sendWhatsApp?: boolean; whatsappPhone?: string; whatsappCountryCode?: string }) => void;
  onFiarSale?: (clientName: string, clientPhone: string, items: { itemId: string; name: string; quantity: number; price: number }[], total: number, forceNew?: boolean, payCash?: number, payCard?: number, options?: { printTicket?: boolean; sendWhatsApp?: boolean }, creditLimit?: number) => void;
  checkFiarClient?: (name: string, phone: string) => { clientName: string; clientPhone: string; balance: number; matchType: 'phone' | 'name-only'; creditLimit?: number } | null;
  config: WorkshopConfig;
  sales?: Sale[];
  users?: AppUser[];
  setActiveTab?: (tab: string) => void;
  onCancelSale?: (saleId: string) => void;
  currentUser?: AppUser | null;
  onCreateApartado?: (entry: ApartadoEntry, options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => void;
  onAddItem?: (item: InventoryItem) => void;
  onRegisterChipActivation?: (activation: { clientName: string; clientPhone?: string; chipNumber: string; iccid?: string; imei?: string; carrier: string; saleId?: string; price?: number }) => void;
}

export default function usePosLogic({
  orders,
  inventory,
  services,
  refacciones = [],
  onCompleteSale,
  onFiarSale,
  checkFiarClient,
  config,
  sales = [],
  users = [],
  setActiveTab,
  onCancelSale,
  onCreateApartado,
  onAddItem,
  onRegisterChipActivation,
  currentUser,
}: UsePosLogicProps) {
  const [basket, setBasketRaw] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pos_active_basket_v1');
      const loaded = saved ? JSON.parse(saved) : [];
      return loaded.map((b: any) => b.uniqueId ? b : { ...b, uniqueId: b.item.id });
    } catch { return []; }
  });

  const setBasket = React.useCallback((val: React.SetStateAction<any[]>) => {
    setBasketRaw(prev => {
      const rawNext = typeof val === 'function' ? val(prev) : val;
      const next = rawNext.map((b: any) => b.uniqueId ? b : { ...b, uniqueId: `${b.item.id}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}` });
      if (next.length === 0) {
        setIsAdminMode(false);
      }
      return next;
    });
  }, []);
  const [isAdminMode, setIsAdminMode] = React.useState<boolean>(false);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = React.useState<string>('');
  const [paymentMethod, setPaymentMethod] = React.useState<'Efectivo' | 'Tarjeta/Transfer'>('Efectivo');
  const [saleType, setSaleType] = React.useState<'publico' | 'mayoreo'>('publico');


  const [cashAmount, setCashAmount] = React.useState<number>(0);
  const [payCash, setPayCash] = React.useState<number>(0);
  const [payCard, setPayCard] = React.useState<number>(0);

  const [cardCode, setCardCode] = React.useState<string>('');

  const [lastSaleReceipt, setLastSaleReceipt] = React.useState<string | null>(null);
  const [searchQuery, setSearchQueryRaw] = React.useState('');
  const setSearchQuery = React.useCallback((val: string | ((prev: string) => string)) => {
    if (typeof val === 'function') {
      setSearchQueryRaw(prev => {
        const res = val(prev);
        return res.replace(/,(?!\s)/g, '-');
      });
    } else {
      setSearchQueryRaw(val.replace(/,(?!\s)/g, '-'));
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = React.useState('Favoritos y Más Vendidos');
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [confirmationCode, setConfirmationCode] = React.useState('');
  const [showSaleConfirm, setShowSaleConfirm] = React.useState(false);
  const [showFiarModal, setShowFiarModal] = React.useState(false);
  const [fiarClientName, setFiarClientName] = React.useState('');
  const [fiarClientPhone, setFiarClientPhone] = React.useState('');
  const [fiarCountryCode, setFiarCountryCode] = React.useState('+52');
  const [fiarExistingAccount, setFiarExistingAccount] = React.useState<{ clientName: string; clientPhone: string; balance: number; matchType: 'phone' | 'name-only'; creditLimit?: number } | null>(null);
  const [fiarForceNew, setFiarForceNew] = React.useState(false);
  const [fiarCreditLimit, setFiarCreditLimit] = React.useState('');
  const [saveToInventory, setSaveToInventory] = React.useState(false);
  const [saleNote, setSaleNote] = React.useState('');

  // Estados de activación de Chip en POS
  const [posRegisterChipActivation, setPosRegisterChipActivation] = React.useState(false);
  const [posActivationClientName, setPosActivationClientName] = React.useState('');
  const [posActivationPhone, setPosActivationPhone] = React.useState('');
  const [posActivationIccid, setPosActivationIccid] = React.useState('');
  const [posActivationImei, setPosActivationImei] = React.useState('');

  const [pendingChipToAdd, setPendingChipToAdd] = React.useState<InventoryItem | null>(null);
  const [editingChipBasketItem, setEditingChipBasketItem] = React.useState<any | null>(null);

  const handleConfirmAddChip = React.useCallback((clientName: string, phone: string, iccid: string, imei: string, skipRegistration = false) => {
    if (!pendingChipToAdd) return;
    const uniqueId = `${pendingChipToAdd.id}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    const activation = skipRegistration ? undefined : {
      clientName: clientName.trim().toUpperCase(),
      clientPhone: phone.trim(),
      chipNumber: phone.trim(),
      iccid: iccid.trim(),
      imei: imei.trim(),
      carrier: pendingChipToAdd.brand || 'Genérico',
      price: pendingChipToAdd.price || 0,
    };
    setBasket(prev => [...prev, {
      item: pendingChipToAdd,
      quantity: 1,
      uniqueId,
      chipActivation: activation
    }]);
    setPendingChipToAdd(null);
  }, [pendingChipToAdd, setBasket]);

  const handleConfirmEditChip = React.useCallback((uniqueId: string, clientName: string, phone: string, iccid: string, imei: string, skipRegistration = false) => {
    setBasket(prev => prev.map(b => {
      if (b.uniqueId === uniqueId) {
        return {
          ...b,
          chipActivation: skipRegistration ? undefined : {
            clientName: clientName.trim().toUpperCase(),
            clientPhone: phone.trim(),
            chipNumber: phone.trim(),
            iccid: iccid.trim(),
            imei: imei.trim(),
            carrier: b.chipActivation?.carrier || b.item.brand || 'Genérico',
            price: b.chipActivation?.price || b.item.price || 0,
          }
        };
      }
      return b;
    }));
    setEditingChipBasketItem(null);
  }, [setBasket]);

  const hasChipInBasket = React.useMemo(() => {
    return basket.some(b => b.item.isChip === true);
  }, [basket]);

  // Reparaciones en POS
  const [showRepairSelectionModal, setShowRepairSelectionModal] = React.useState(false);
  const [repairSearchQuery, setRepairSearchQuery] = React.useState('');

  const addRepairOrderToBasket = React.useCallback((order: RepairOrder) => {
    const adv = getIndividualAdvance(order, orders);
    const balanceDue = Math.max(0, order.cost - adv);

    // Check if already in basket
    const existing = basket.find(b => b.item.id === `repair-${order.id}`);
    if (existing) {
      triggerToast(`⚠️ La orden ${order.id} ya está en el carrito.`, 'info');
      return;
    }

    // Create mock InventoryItem
    const tempItem: InventoryItem = {
      id: `repair-${order.id}`,
      code: order.id,
      name: `REPARACIÓN: ${order.id} - ${order.deviceBrand || ''} ${order.deviceModel || ''}`,
      brand: order.deviceBrand || '',
      category: 'Servicio Técnico',
      stock: 1,
      minStock: 0,
      price: balanceDue,
      cost: balanceDue,
    };

    setBasket(prev => [...prev, { item: tempItem, quantity: 1 }]);
    triggerToast(`🔧 Orden ${order.id} agregada al carrito.`, 'success');
    setShowRepairSelectionModal(false);
  }, [basket, orders]);

  // Apartar desde POS
  const [showApartarModal, setShowApartarModal] = React.useState(false);
  const [apartarClientName, setApartarClientName] = React.useState('');
  const [apartarClientPhone, setApartarClientPhone] = React.useState('');
  const [apartarCountryCode, setApartarCountryCode] = React.useState('+52');
  const [apartarInitialAmount, setApartarInitialAmount] = React.useState('');
  const [apartarInitialMethod, setApartarInitialMethod] = React.useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [apartarDueDate, setApartarDueDate] = React.useState('');
  const [apartarNotes, setApartarNotes] = React.useState('');

  const handleConfirmApartar = React.useCallback((options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => {
    if (!apartarClientName.trim()) { alert('Ingresa el nombre del cliente.'); return; }
    if (!apartarClientPhone.trim()) { alert('El teléfono del cliente es requerido.'); return; }
    const initAmt2 = parseFloat(apartarInitialAmount);
    if (isNaN(initAmt2) || initAmt2 <= 0) { alert('Ingresa un anticipo inicial mayor a $0.'); return; }
    if (!apartarDueDate) { alert('Selecciona una fecha límite para el apartado.'); return; }
    const items = derivedBasket.map(b => ({
      itemId: b.item.id,
      name: b.item.name,
      price: b.customPrice !== undefined ? b.customPrice : b.item.price,
      quantity: b.quantity,
    }));
    const totalValue = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const payments: import('../types').ApartadoPayment[] = [];
    const initAmt = parseFloat(apartarInitialAmount);
    if (!isNaN(initAmt) && initAmt > 0) {
      payments.push({ id: `pay-${Date.now()}`, date: new Date().toISOString(), amount: initAmt, method: apartarInitialMethod });
    }
    const cleanedPhone = apartarClientPhone.replace(/\D/g, '');
    const finalPhone = apartarCountryCode + cleanedPhone;
    const entry: ApartadoEntry = {
      id: `APT-${Date.now()}`,
      clientName: apartarClientName.trim(),
      clientPhone: finalPhone || undefined,
      items,
      totalValue,
      payments,
      status: payments.reduce((s, p) => s + p.amount, 0) >= totalValue ? 'Listo' : 'Activo',
      createdAt: new Date().toISOString(),
      dueDate: apartarDueDate || undefined,
      notes: apartarNotes.trim() || undefined,
    };
    onCreateApartado?.(entry, options);
    setBasket([]);
    setShowApartarModal(false);
    setApartarClientName('');
    setApartarClientPhone('');
    setApartarInitialAmount('');
    setApartarDueDate('');
    setApartarNotes('');
  }, [basket, apartarClientName, apartarClientPhone, apartarCountryCode, apartarInitialAmount, apartarInitialMethod, apartarDueDate, apartarNotes, onCreateApartado]);

  const [changeAmount, setChangeAmount] = React.useState<number | null>(null);
  const [countdown, setCountdown] = React.useState<number>(10);
  const [fastSaleName, setFastSaleName] = React.useState('');
  const [fastSalePrice, setFastSalePrice] = React.useState('');
  const [mobileTab, setMobileTab] = React.useState<'catalog' | 'cart'>('catalog');
  const [isSearchModalOpen, setIsSearchModalOpen] = React.useState(false);
  const [modalCurrentPage, setModalCurrentPage] = React.useState(1);
  const [isFastSaleModalOpen, setIsFastSaleModalOpen] = React.useState(false);
  const [showQuickHistory, setShowQuickHistory] = React.useState(false);
  const [quickHistoryConfirm, setQuickHistoryConfirm] = React.useState<{ type: 'cancel' | 'reprint'; sale: Sale } | null>(null);
  const [quickHistoryDetail, setQuickHistoryDetail] = React.useState<Sale | null>(null);
  const [modalSelectedIndex, setModalSelectedIndex] = React.useState(0);
  const [inlineSelectedIndex, setInlineSelectedIndex] = React.useState(0);
  const inlineSelectedIndexRef = React.useRef(0);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showSaveSaleModal, setShowSaveSaleModal] = React.useState(false);
  const [saveSaleLabel, setSaveSaleLabel] = React.useState('');
  const [showSavedSalesListModal, setShowSavedSalesListModal] = React.useState(false);
  const [saleToDelete, setSaleToDelete] = React.useState<string | null>(null);
  const [pendingLoadSaleId, setPendingLoadSaleId] = React.useState<string | null>(null);
  const [showSoftCalculator, setShowSoftCalculator] = React.useState(false);
  const [softCalculatorExpr, setSoftCalculatorExpr] = React.useState('');
  const [softCalculatorResult, setSoftCalculatorResult] = React.useState<string | null>(null);
  const [showSoftCoinsCounter, setShowSoftCoinsCounter] = React.useState(false);
  const [softCoinsList, setSoftCoinsList] = React.useState<{ [key: string]: number }>({
    '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0, '0.5': 0,
  });
  const [showSoftClientModal, setShowSoftClientModal] = React.useState(false);
  const [posShouldPrintTicket, setPosShouldPrintTicket] = React.useState(config.autoPrintOnSale ?? true);
  const [posShouldSendWhatsApp, setPosShouldSendWhatsApp] = React.useState(false);
  const [showPosWhatsappModal, setShowPosWhatsappModal] = React.useState(false);

  const [waConnected, setWaConnected] = React.useState<boolean>(() => {
    return (window as any).whatsappConnected || false;
  });

  React.useEffect(() => {
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

  // Sincronizar selección de ticket de POS y WhatsApp (exclusión mutua y abrir modal al activar)
  React.useEffect(() => {
    if (posShouldSendWhatsApp) {
      setPosShouldPrintTicket(false);

      // Pre-llenar el número si no tiene uno
      if (!posWhatsappPhone) {
        const repairItem = basket.find(b => b.item.id.startsWith('repair-'));
        if (repairItem) {
          const orderId = repairItem.item.id.replace('repair-', '');
          const order = orders.find(o => o.id === orderId);
          if (order?.customerPhone) {
            setPosWhatsappPhone(order.customerPhone);
          }
        } else if (/^\d{10,13}$/.test(saveSaleLabel.replace(/\D/g, ''))) {
          setPosWhatsappPhone(saveSaleLabel.replace(/\D/g, ''));
        }
      }
    }
  }, [posShouldSendWhatsApp]);

  React.useEffect(() => {
    if (posShouldPrintTicket) {
      setPosShouldSendWhatsApp(false);
    }
  }, [posShouldPrintTicket]);

  const [posWhatsappPhone, setPosWhatsappPhone] = React.useState('');
  const [posToast, setPosToast] = React.useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
  const [showAdminAuthModal, setShowAdminAuthModal] = React.useState(false);
  const [adminAuthPin, setAdminAuthPin] = React.useState('');
  const [adminAuthError, setAdminAuthError] = React.useState('');
  const [pendingEditItemId, setPendingEditItemId] = React.useState<string | null>(null);
  const [discountType, setDiscountType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [discountEnabled, setDiscountEnabled] = React.useState<boolean>(false);
  const [savedSales, setSavedSales] = React.useState<{
    id: string;
    timestamp: string;
    items: { item: InventoryItem; quantity: number; customPrice?: number }[];
    total: number;
    label: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('pos_saved_sales_v1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Refs
  const lastSelectedQueryRef = React.useRef<string | null>(null);
  const fastSalePriceRef = React.useRef<HTMLInputElement | null>(null);
  const fastSaleNameInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastClickTimeRef = React.useRef<number>(0);
  const modalFastSaleNameInputRef = React.useRef<HTMLInputElement | null>(null);
  const modalFastSalePriceInputRef = React.useRef<HTMLInputElement | null>(null);
  const fastSaleModalNameInputRef = React.useRef<HTMLInputElement | null>(null);
  const fastSaleModalPriceInputRef = React.useRef<HTMLInputElement | null>(null);
  const prevIsFastSaleModalOpen = React.useRef(false);

  const isFirstMountPriceType = React.useRef(true);
  React.useEffect(() => {
    if (isFirstMountPriceType.current) {
      isFirstMountPriceType.current = false;
      return;
    }
    setBasket(prev => prev.map(b => ({ ...b, priceType: undefined })));
  }, [saleType]);

  // ─── Computed ───────────────────────────────────────────────────────────────

  const softCoinsTotal = Object.entries(softCoinsList).reduce((acc, [denom, count]) => {
    return acc + (parseFloat(denom) * (Number(count) || 0));
  }, 0);

  const salesCountMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (sales && sales.length > 0) {
      sales.forEach((sale) => {
        if (sale.isCancelled) return;
        (sale.items || []).forEach((item) => {
          if (item.itemId) counts[item.itemId] = (counts[item.itemId] || 0) + item.quantity;
        });
      });
    }
    return counts;
  }, [sales]);

  const combinedInventory = React.useMemo(() => {
    const surrogateRefacciones: InventoryItem[] = refacciones.map(r => ({
      id: r.id,
      code: r.code || '',
      name: `[REFACCIÓN] ${r.name.toUpperCase()} (${r.deviceBrand.toUpperCase()} ${r.deviceModel.toUpperCase()})`,
      brand: r.brand,
      category: r.category || 'Refacciones',
      stock: r.stock,
      minStock: r.minStock || 0,
      price: r.price,
      wholesalePrice: r.wholesalePrice,
      cost: r.cost,
      imageUrl: r.imageUrl,
      extraImages: r.extraImages,
      favorite: !!r.favorite,
      reservedQty: 0,
      manageStock: r.manageStock !== false
    }));
    return [...inventory, ...surrogateRefacciones];
  }, [inventory, refacciones]);

  const getResolvedItemPrice = React.useCallback((item: any) => {
    if (saleType === 'mayoreo' && item.wholesalePrice !== undefined && item.wholesalePrice > 0) {
      return item.wholesalePrice;
    }
    return item.price;
  }, [saleType]);

  const resolvedInventory = React.useMemo(() => {
    return combinedInventory.map(item => ({
      ...item,
      price: getResolvedItemPrice(item)
    }));
  }, [combinedInventory, getResolvedItemPrice]);

  const queryTrimmed = normalizeSearchText(searchQuery);

  // Pre-normalizar inventario una sola vez cuando cambie para evitar miles de normalizaciones al escribir
  const normalizedInventory = React.useMemo(() => {
    return resolvedInventory.map((p) => ({
      item: p,
      normalizedName: normalizeSearchText(p.name),
      normalizedCode: p.code ? normalizeSearchText(p.code) : '',
    }));
  }, [resolvedInventory]);

  const matchedProductsForModal = React.useMemo(() => {
    if (!queryTrimmed) return [];
    if (queryTrimmed === 'fav') {
      return resolvedInventory
        .filter(p => (!!p.favorite || (salesCountMap[p.id] || 0) > 0 || normalizeSearchText(p.name).startsWith('fav')))
        .sort((a, b) => {
          if (!!a.favorite && !b.favorite) return -1;
          if (!a.favorite && !!b.favorite) return 1;
          return (salesCountMap[b.id] || 0) - (salesCountMap[a.id] || 0);
        });
    }

    const tokens = queryTrimmed.split(/\s+/).filter(Boolean);
    const matches: InventoryItem[] = [];
    for (let i = 0; i < normalizedInventory.length; i++) {
      const entry = normalizedInventory[i];
      const isMatch = tokens.every(token => 
        entry.normalizedName.includes(token) || 
        entry.normalizedCode.includes(token)
      );
      if (isMatch) {
        matches.push(entry.item);
      }
    }
    return matches;
  }, [resolvedInventory, normalizedInventory, queryTrimmed, salesCountMap]);

  const exactMatch = React.useMemo(() => {
    if (!queryTrimmed) return null;
    return matchedProductsForModal.find(p => {
      const normCode = p.code ? normalizeSearchText(p.code) : '';
      return normCode === queryTrimmed;
    }) || null;
  }, [matchedProductsForModal, queryTrimmed]);

  const modalRowsPerPage = 25;

  const paginatedModalItems = React.useMemo(() => {
    const startIndex = (modalCurrentPage - 1) * modalRowsPerPage;
    return matchedProductsForModal.slice(startIndex, startIndex + modalRowsPerPage);
  }, [matchedProductsForModal, modalCurrentPage]);

  const modalTotalPages = React.useMemo(() => {
    return Math.ceil(matchedProductsForModal.length / modalRowsPerPage) || 1;
  }, [matchedProductsForModal.length]);

  const topSellingIds = React.useMemo(() => {
    if (!sales || sales.length === 0) return new Set<string>();
    const salesCount: Record<string, number> = {};
    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (item.itemId) salesCount[item.itemId] = (salesCount[item.itemId] || 0) + item.quantity;
      });
    });
    const sorted = Object.entries(salesCount)
      .filter(([_, qty]) => qty > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);
    return new Set<string>(sorted);
  }, [sales]);

  const categories = React.useMemo(() => {
    return ['Favoritos y Más Vendidos', 'Todos', ...Array.from(new Set(resolvedInventory.map((i) => i.category)))];
  }, [resolvedInventory]);

  const availableItems = React.useMemo(() => {
    const query = queryTrimmed;
    
    const filtered: InventoryItem[] = [];
    for (let i = 0; i < normalizedInventory.length; i++) {
      const entry = normalizedInventory[i];
      const item = entry.item;
      
      if (query === 'fav') {
        if (!!item.favorite || (salesCountMap[item.id] || 0) > 0 || entry.normalizedName.startsWith('fav')) {
          filtered.push(item);
        }
        continue;
      }
      
      if (selectedCategory === 'Favoritos y Más Vendidos') {
        if (!item.favorite && !topSellingIds.has(item.id)) continue;
      } else if (selectedCategory !== 'Todos' && item.category !== selectedCategory) {
        continue;
      }
      
      if (!query) {
        filtered.push(item);
        continue;
      }
      
      const tokens = query.split(/\s+/).filter(Boolean);
      const isMatch = tokens.every(token => 
        entry.normalizedName.includes(token) || 
        entry.normalizedCode.includes(token)
      );
      if (isMatch) {
        filtered.push(item);
      }
    }
    
    if (query === 'fav' || selectedCategory === 'Favoritos y Más Vendidos') {
      return [...filtered].sort((a, b) => {
        if (query === 'fav') {
          if (!!a.favorite && !b.favorite) return -1;
          if (!a.favorite && !!b.favorite) return 1;
          return (salesCountMap[b.id] || 0) - (salesCountMap[a.id] || 0);
        }
        if (!!a.favorite && !b.favorite) return -1;
        if (!a.favorite && !!b.favorite) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [normalizedInventory, queryTrimmed, selectedCategory, salesCountMap, topSellingIds]);

  const derivedBasket = React.useMemo(() => {
    return basket.map(b => {
      const resolvedPriceType = b.priceType || saleType;
      const price = b.customPrice !== undefined ? b.customPrice : (
        resolvedPriceType === 'mayoreo' && b.item.wholesalePrice !== undefined && b.item.wholesalePrice > 0
          ? b.item.wholesalePrice
          : b.item.price
      );
      return {
        ...b,
        item: {
          ...b.item,
          price
        }
      };
    });
  }, [basket, saleType]);

  const basketSubtotal = derivedBasket.reduce((sum, b) => {
    const price = b.customPrice !== undefined ? b.customPrice : b.item.price;
    return sum + price * b.quantity;
  }, 0);
  const basketTotal = React.useMemo(() => {
    if (!discountEnabled || isNaN(discountValue) || discountValue <= 0) {
      return basketSubtotal;
    }
    if (discountType === 'percentage') {
      const factor = Math.max(0, 1 - discountValue / 100);
      return Number((basketSubtotal * factor).toFixed(2));
    } else {
      return Math.max(0, Number((basketSubtotal - discountValue).toFixed(2)));
    }
  }, [basketSubtotal, discountEnabled, discountType, discountValue]);

  const discountAmount = React.useMemo(() => {
    if (!discountEnabled || isNaN(discountValue) || discountValue <= 0) {
      return 0;
    }
    if (discountType === 'percentage') {
      return Number((basketSubtotal * (discountValue / 100)).toFixed(2));
    } else {
      return Math.min(basketSubtotal, discountValue);
    }
  }, [basketSubtotal, discountEnabled, discountType, discountValue]);

  const basketTotalItems = derivedBasket.reduce((acc, b) => acc + b.quantity, 0);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setPosToast({ message, type });
  };

  const playCashRegisterSound = () => {
    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.start(); osc1.stop(ctx.currentTime + 0.4);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime + 0.05); osc2.stop(ctx.currentTime + 0.45);
      }, 60);
    } catch (err) {
      console.warn('AudioContext bloqueado o no soportado', err);
    }
  };

  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setSoftCalculatorExpr(''); setSoftCalculatorResult(null);
    } else if (val === 'DEL') {
      setSoftCalculatorExpr((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        if (!/^[0-9+\-*/().\s]+$/.test(softCalculatorExpr)) throw new Error('Expresión no permitida');
        // eslint-disable-next-line no-eval
        const result = eval(softCalculatorExpr);
        setSoftCalculatorResult(String(Number(result.toFixed(2))));
      } catch { setSoftCalculatorResult('ERROR'); }
    } else {
      if (softCalculatorResult) {
        if (['+', '-', '*', '/'].includes(val)) { setSoftCalculatorExpr(softCalculatorResult + val); }
        else { setSoftCalculatorExpr(val); }
        setSoftCalculatorResult(null);
      } else {
        setSoftCalculatorExpr((prev) => prev + val);
      }
    }
  };

  const cancelAndCleanupFastSale = () => {
    setIsFastSaleModalOpen(false);
    setSearchQuery('');
    setTimeout(() => {
      if (searchInputRef.current) { searchInputRef.current.focus(); searchInputRef.current.value = ''; }
    }, 50);
  };

  const cancelAndCleanupSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchQuery('');
    setTimeout(() => {
      if (searchInputRef.current) { searchInputRef.current.focus(); searchInputRef.current.value = ''; }
    }, 50);
  };

  const addFastSaleItem = () => {
    const trimmedName = fastSaleName.trim();
    if (!trimmedName) { alert('Por favor, ingrese un nombre para el artículo de venta rápida.'); return; }
    const priceNum = parseFloat(fastSalePrice);
    if (isNaN(priceNum) || priceNum < 0) { alert('Por favor, ingrese un precio de venta válido.'); return; }
    
    const itemId = saveToInventory ? `C${Date.now()}` : `fast-sale-${Date.now()}`;
    const itemCode = saveToInventory ? `VR-${Date.now().toString(36).toUpperCase()}` : 'TEMP';
    const tempItem: InventoryItem = {
      id: itemId,
      code: itemCode,
      name: trimmedName,
      brand: 'Venta Rápida',
      category: 'Venta Rápida',
      stock: saveToInventory ? 1 : 99999,
      minStock: 0,
      price: priceNum,
      cost: 0,
      active: true,
      manageStock: true,
    };
    if (saveToInventory) {
      onAddItem?.(tempItem);
    }
    
    setBasket([...basket, { item: tempItem, quantity: 1 }]);
    setFastSalePrice(''); setFastSaleName(''); setSearchQuery(''); setIsFastSaleModalOpen(false); setSaveToInventory(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleModalAddFastSaleItem = () => {
    const trimmedName = fastSaleName.trim();
    if (!trimmedName) { alert('Por favor, ingrese un nombre para el artículo de venta rápida.'); return; }
    const priceNum = parseFloat(fastSalePrice);
    if (isNaN(priceNum) || priceNum < 0) { alert('Por favor, ingrese un precio de venta válido.'); return; }
    
    const itemId = saveToInventory ? `C${Date.now()}` : `fast-sale-${Date.now()}`;
    const itemCode = saveToInventory ? `VR-${Date.now().toString(36).toUpperCase()}` : 'TEMP';
    const tempItem: InventoryItem = {
      id: itemId,
      code: itemCode,
      name: trimmedName,
      brand: 'Venta Rápida',
      category: 'Venta Rápida',
      stock: saveToInventory ? 1 : 99999,
      minStock: 0,
      price: priceNum,
      cost: 0,
      active: true,
      manageStock: true,
    };
    if (saveToInventory) {
      onAddItem?.(tempItem);
    }
    
    setBasket([...basket, { item: tempItem, quantity: 1, uniqueId: tempItem.id }]);
    setFastSalePrice(''); setFastSaleName(''); setSearchQuery(''); setIsSearchModalOpen(false); setSaveToInventory(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const addToBasket = (item: InventoryItem) => {
    if (item.isChip === true) {
      setPendingChipToAdd(item);
      return;
    }
    const existing = basket.find((b) => b.item.id === item.id && !b.chipActivation);
    if (existing) {
      setBasket(basket.map((b) => (b.uniqueId === existing.uniqueId ? { ...b, quantity: b.quantity + 1 } : b)));
    } else {
      setBasket([...basket, { item, quantity: 1, uniqueId: item.id }]);
    }
  };

  const updateQuantity = (uniqueId: string, diff: number) => {
    const term = basket.find((b) => b.uniqueId === uniqueId);
    if (!term) return;
    if (uniqueId.startsWith('repair-')) {
      if (term.quantity + diff <= 0) {
        setBasket(basket.filter((b) => b.uniqueId !== uniqueId));
      } else {
        triggerToast('⚠️ Las órdenes de servicio solo pueden tener cantidad de 1 en el carrito.', 'info');
      }
      return;
    }
    if (term.item.isChip === true) {
      const nextQt = term.quantity + diff;
      if (nextQt <= 0) {
        setBasket(basket.filter((b) => b.uniqueId !== uniqueId));
      } else {
        triggerToast('⚠️ Los chips SIM se registran individualmente con cantidad 1.', 'info');
      }
      return;
    }
    const nextQt = term.quantity + diff;
    if (nextQt <= 0) { setBasket(basket.filter((b) => b.uniqueId !== uniqueId)); return; }
    setBasket(basket.map((b) => (b.uniqueId === uniqueId ? { ...b, quantity: nextQt } : b)));
  };

  const removeFromBasket = (uniqueId: string) => {
    setBasket(basket.filter((b) => b.uniqueId !== uniqueId));
  };

  const handleSavePrice = (uniqueId: string) => {
    const val = parseFloat(editingPriceValue);
    if (!isNaN(val) && val >= 0) {
      setBasket(basket.map((b) => b.uniqueId === uniqueId ? { ...b, customPrice: Number(val.toFixed(2)) } : b));
    }
    setEditingItemId(null);
  };

  const toggleBasketItemPriceType = (uniqueId: string) => {
    setBasket(basket.map((b) => {
      if (b.uniqueId === uniqueId) {
        const currentType = b.priceType || saleType;
        const nextType = currentType === 'publico' ? 'mayoreo' : 'publico';
        return { ...b, priceType: nextType, customPrice: undefined };
      }
      return b;
    }));
  };

  const handleRequestEditPrice = (uniqueId: string, currentPrice: number) => {
    const term = basket.find(b => b.uniqueId === uniqueId);
    if (!term) return;
    if (term.item.id.startsWith('repair-')) {
      triggerToast('⚠️ El saldo de una orden de servicio no puede ser modificado desde el POS.', 'info');
      return;
    }
    if (isAdminMode) {
      setEditingItemId(uniqueId); setEditingPriceValue(currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setPendingEditItemId(uniqueId); setAdminAuthPin(''); setAdminAuthError(''); setShowAdminAuthModal(true);
    }
  };

  const handleAdminAuthSubmit = () => {
    const admins = users.filter(u => u.role === 'admin');
    const pinMatches = admins.length === 0 ? adminAuthPin === '1234' : admins.some(u => u.pin === adminAuthPin);
    if (pinMatches) {
      setIsAdminMode(true); setShowAdminAuthModal(false);
      if (pendingEditItemId) {
        const basketItem = basket.find(b => b.uniqueId === pendingEditItemId || b.item.id === pendingEditItemId);
        if (basketItem) {
          const price = basketItem.customPrice !== undefined ? basketItem.customPrice : basketItem.item.price;
          setEditingItemId(pendingEditItemId); setEditingPriceValue(price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      }
      setPendingEditItemId(null);
      triggerToast('🔓 Modo administrador activado — precios editables', 'success');
    } else {
      setAdminAuthError('PIN incorrecto. Intente de nuevo.'); setAdminAuthPin('');
    }
  };

  const handleLockAdminMode = () => {
    setIsAdminMode(false); setEditingItemId(null);
    triggerToast('🔒 Modo administrador desactivado', 'info');
  };

  const handleSaveSaleForLater = () => {
    if (basket.length === 0) return;
    const defaultLabel = `Cliente #${savedSales.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    setSaveSaleLabel(defaultLabel);
    setShowSaveSaleModal(true);
  };

  const confirmSaveSaleForLater = (customLabel: string) => {
    const finalLabel = customLabel.trim() || `Venta #${savedSales.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const newSaved = { id: `suspended-${Date.now()}`, timestamp: new Date().toISOString(), items: [...basket], total: basketTotal, label: finalLabel };
    setSavedSales([newSaved, ...savedSales]);
    setBasket([]); setSaveSaleLabel(''); setShowSaveSaleModal(false);
  };

  const handleLoadSavedSale = (saleId: string) => {
    const sale = savedSales.find((s) => s.id === saleId);
    if (!sale) return;
    if (basket && basket.length > 0) {
      setPendingLoadSaleId(saleId);
    } else {
      setBasket([...sale.items]);
      setSavedSales(savedSales.filter((s) => s.id !== saleId));
      setShowSavedSalesListModal(false);
    }
  };

  const handleConfirmLoadCombine = () => {
    if (!pendingLoadSaleId) return;
    const sale = savedSales.find((s) => s.id === pendingLoadSaleId);
    if (sale) {
      const newBasket = [...basket];
      (sale.items || []).forEach((itemToLoad) => {
        const existingIdx = newBasket.findIndex((b) => b.item?.id === itemToLoad.item?.id);
        if (existingIdx !== -1) { newBasket[existingIdx].quantity += itemToLoad.quantity; }
        else { newBasket.push(itemToLoad); }
      });
      setBasket(newBasket);
      setSavedSales(savedSales.filter((s) => s.id !== pendingLoadSaleId));
    }
    setPendingLoadSaleId(null); setShowSavedSalesListModal(false);
  };

  const handleConfirmLoadOverwrite = () => {
    if (!pendingLoadSaleId) return;
    const sale = savedSales.find((s) => s.id === pendingLoadSaleId);
    if (sale) { setBasket([...sale.items]); setSavedSales(savedSales.filter((s) => s.id !== pendingLoadSaleId)); }
    setPendingLoadSaleId(null); setShowSavedSalesListModal(false);
  };

  const handleCancelLoadConflict = () => setPendingLoadSaleId(null);

  const handleDeleteSavedSale = (saleId: string) => setSaleToDelete(saleId);

  const executeSale = (options?: { shareWA?: boolean }) => {
    const totalReceived = payCash + payCard;
    if (totalReceived < basketTotal) { alert('El monto ingresado/recibido no cubre el total de la venta.'); return; }

    const isWA = !!options?.shareWA;
    let targetPhone = posWhatsappPhone;
    let targetCountryCode = '';
    if (isWA && !targetPhone) {
      const repairItem = basket.find(b => b.item.id.startsWith('repair-'));
      if (repairItem) {
        const orderId = repairItem.item.id.replace('repair-', '');
        const order = orders.find(o => o.id === orderId);
        if (order?.customerPhone) {
          targetPhone = order.customerPhone;
          targetCountryCode = order.customerCountryCode || '';
        }
      } else if (/^\d{10,13}$/.test(saveSaleLabel.replace(/\D/g, ''))) {
        targetPhone = saveSaleLabel.replace(/\D/g, '');
      }
    } else if (isWA && targetPhone) {
      const repairItem = basket.find(b => b.item.id.startsWith('repair-'));
      if (repairItem) {
        const orderId = repairItem.item.id.replace('repair-', '');
        const order = orders.find(o => o.id === orderId);
        if (order && order.customerPhone.replace(/\D/g, '') === targetPhone.replace(/\D/g, '')) {
          targetCountryCode = order.customerCountryCode || '';
        }
      }
    }

    const activeMethods: string[] = [];
    if (payCash > 0) activeMethods.push('Efectivo');
    if (payCard > 0) activeMethods.push('Tarjeta/Transfer');
    let finalMethod = activeMethods.length === 1 ? activeMethods[0] : activeMethods.length > 1 ? 'Múltiple' : 'Efectivo';
    const codes: string[] = [];
    if (payCash > 0) codes.push(`Efe: ${config.currencySymbol}${payCash}`);
    if (payCard > 0) codes.push(`T/T: ${config.currencySymbol}${payCard} (Ref: ${cardCode.trim() || 'S/Ref'})`);
    const nextSaleId = generateNextSaleId(sales);
    const saleTicketNum = extractSaleTicketNumber(nextSaleId);
    const changeDue = Math.max(0, totalReceived - basketTotal);
    const completedSale: Sale = {
      id: nextSaleId,
      items: derivedBasket.map((b) => ({ itemId: b.item.id, name: b.item.name, quantity: b.quantity, price: b.customPrice !== undefined ? b.customPrice : b.item.price })),
      total: basketTotal, paymentMethod: finalMethod, createdAt: new Date().toISOString(),
      ticketNumber: saleTicketNum, confirmationCode: codes.join(' | '),
      cashReceived: payCash,
      cardReceived: payCard,
      change: changeDue,
      notes: saleNote.trim() || undefined,
      discount: discountAmount > 0 ? discountAmount : undefined,
      discountType: discountEnabled ? discountType : undefined,
      discountValue: discountEnabled ? discountValue : undefined,
    };
    onCompleteSale(completedSale, {
      printTicket: isWA ? false : posShouldPrintTicket,
      sendWhatsApp: isWA,
      whatsappPhone: targetPhone,
      whatsappCountryCode: targetCountryCode,
    });
    setLastSaleReceipt(completedSale.id);
    if (!isWA) {
      setChangeAmount(changeDue);
    }

    // Register all chip activations in the basket
    basket.forEach((b) => {
      if (b.chipActivation) {
        onRegisterChipActivation?.({
          ...b.chipActivation,
          saleId: nextSaleId,
        });
      }
    });

    setBasket([]); setPayCash(0); setPayCard(0); setCardCode('');
    setDiscountEnabled(false); setDiscountValue(0); setDiscountType('percentage');
    setPosShouldSendWhatsApp(false); setPosWhatsappPhone('');
    setPosRegisterChipActivation(false);
    setPosActivationClientName('');
    setPosActivationPhone('');
    setPosActivationIccid('');
    setPosActivationImei('');
    setSaleNote('');
    setShowSaleConfirm(false); setShowPosWhatsappModal(false); setIsAdminMode(false); setEditingItemId(null);
    setTimeout(() => setLastSaleReceipt(null), 4500);
  };

  const executeFiar = (forceNew = false, options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => {
    if (!fiarClientName.trim() || !fiarClientPhone.trim()) return;
    const cleanedPhone = fiarClientPhone.replace(/\D/g, '');
    const finalPhone = fiarCountryCode + cleanedPhone;
    
    // 1. Obtener límite por defecto y símbolo de moneda
    const defaultLimit = config.defaultCreditLimit ?? 1000;
    const sym = config.currencySymbol || '$';

    // 2. Verificar cliente existente solo si no se está forzando cuenta nueva
    let matchedProfile = fiarExistingAccount;
    if (!fiarExistingAccount && !forceNew && checkFiarClient) {
      const found = checkFiarClient(fiarClientName.trim().toUpperCase(), finalPhone);
      if (found) {
        if (found.balance > 0) {
          setFiarExistingAccount(found);
          return;
        } else {
          matchedProfile = found;
        }
      }
    }

    // 3. Validar límite de crédito
    let limit = defaultLimit;
    let currentBalance = 0;

    const activeProfile = matchedProfile || fiarExistingAccount;
    if (activeProfile && !forceNew) {
      limit = activeProfile.creditLimit !== undefined ? activeProfile.creditLimit : defaultLimit;
      currentBalance = activeProfile.balance || 0;
    }

    // Si el usuario capturó un límite en el formulario, ese tiene prioridad
    if (fiarCreditLimit.trim() !== '') {
      limit = Number(fiarCreditLimit);
    }

    // Si limit > 0 (0 es crédito ilimitado), validar saldo acumulado
    if (limit > 0) {
      const totalPostSale = currentBalance + basketTotal;
      if (totalPostSale > limit) {
        triggerToast(
          `❌ Límite de crédito excedido. Límite: ${sym}${limit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}, Saldo actual: ${sym}${currentBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}, Venta: +${sym}${basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Total ${sym}${totalPostSale.toLocaleString('es-MX', { minimumFractionDigits: 2 })} supera el permitido.`,
          'error'
        );
        return;
      }
    }

    const items = derivedBasket.map(b => ({
      itemId: b.item.id,
      name: b.item.name,
      quantity: b.quantity,
      price: b.customPrice !== undefined ? b.customPrice : b.item.price,
    }));
    const mergedOptions = {
      ...options,
      discount: discountAmount > 0 ? discountAmount : undefined,
      discountType: discountEnabled ? discountType : undefined,
      discountValue: discountEnabled ? discountValue : undefined,
    };
    // Si forceNew, pasar flag para que App.tsx cree cuenta nueva aunque exista una con mismo nombre
    onFiarSale?.(
      fiarClientName.trim().toUpperCase(),
      finalPhone,
      items,
      basketTotal,
      forceNew,
      payCash,
      payCard,
      mergedOptions,
      fiarCreditLimit.trim() !== '' ? Number(fiarCreditLimit) : undefined
    );

    // Register all chip activations in the basket for Fiar
    basket.forEach((b) => {
      if (b.chipActivation) {
        onRegisterChipActivation?.({
          ...b.chipActivation,
          saleId: `FIADO-${Date.now()}`,
        });
      }
    });

    setBasket([]); setFiarClientName(''); setFiarClientPhone(''); setFiarCreditLimit('');
    setFiarExistingAccount(null); setFiarForceNew(false);
    setDiscountEnabled(false); setDiscountValue(0); setDiscountType('percentage');
    setPosRegisterChipActivation(false);
    setPosActivationClientName('');
    setPosActivationPhone('');
    setPosActivationIccid('');
    setPosActivationImei('');
    setShowFiarModal(false); setShowSaleConfirm(false);
  };

  const validateAndConfirm = () => {
    if (basket.length === 0) { alert('La cesta está vacía.'); return; }
    setPayCash(Number(basketTotal.toFixed(2))); setPayCard(0);
    setCardCode(''); setPosShouldPrintTicket(config.autoPrintOnSale ?? true); setShowSaleConfirm(true);
  };

  const handleCheckout = (e?: React.FormEvent) => {
    e?.preventDefault(); validateAndConfirm();
  };

  const handleShortcutPress = (key: string) => {
    const isEsc = key === 'ESC' || key === 'Escape' || key === 'X' || key === 'x';
    if (key === 'F2') {
      if (showSaleConfirm) { setPosShouldPrintTicket((prev) => !prev); } else { setShowSoftClientModal(true); }

    } else if (key === 'F3') {
      setShowRepairSelectionModal((prev) => !prev);
    } else if (key === 'F5') {
      if (showSaleConfirm) { executeSale(); } else { validateAndConfirm(); }
    } else if (key === 'F10') {
      if (basket.length > 0 && !showSaleConfirm && !showSaveSaleModal) { handleSaveSaleForLater(); }
      else if (basket.length === 0) { triggerToast('⚠️ Cargue productos al carrito antes de guardar la venta.', 'info'); }
    } else if (key === 'F6') {
      setShowSoftCalculator((prev) => !prev);
    } else if (key === 'F9') {
      setShowSoftCoinsCounter((prev) => !prev);
    } else if (isEsc) {
      if (showSoftCalculator) { setShowSoftCalculator(false); }
      else if (showSoftCoinsCounter) { setShowSoftCoinsCounter(false); }
      else if (showSoftClientModal) { setShowSoftClientModal(false); }
      else if (showPosWhatsappModal) { setShowPosWhatsappModal(false); }
      else if (showRepairSelectionModal) { setShowRepairSelectionModal(false); }
      else if (showSaleConfirm) { setShowSaleConfirm(false); }
      else if (showSaveSaleModal) { setShowSaveSaleModal(false); }
      else if (showSavedSalesListModal) { setShowSavedSalesListModal(false); }
      else if (showCancelConfirm) { setShowCancelConfirm(false); }
      else if (basket.length > 0) { setShowCancelConfirm(true); }
    }
  };

  // ─── Effects ────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (posToast) { const t = setTimeout(() => setPosToast(null), 3000); return () => clearTimeout(t); }
  }, [posToast]);

  React.useEffect(() => {
    const redirectToast = localStorage.getItem('pos_redirect_toast');
    if (redirectToast) {
      triggerToast(redirectToast, 'success');
      localStorage.removeItem('pos_redirect_toast');
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('pos_saved_sales_v1', JSON.stringify(savedSales));
  }, [savedSales]);

  React.useEffect(() => {
    localStorage.setItem('pos_active_basket_v1', JSON.stringify(basket));
  }, [basket]);

  // Auto-focus search input when no modal or editor is open
  const anyModalOpen = 
    showSaleConfirm ||
    showFiarModal ||
    showApartarModal ||
    showSoftCalculator ||
    showSoftCoinsCounter ||
    showSoftClientModal ||
    showPosWhatsappModal ||
    showRepairSelectionModal ||
    showSaveSaleModal ||
    showSavedSalesListModal ||
    showCancelConfirm ||
    isFastSaleModalOpen ||
    isSearchModalOpen ||
    showAdminAuthModal ||
    editingItemId !== null ||
    showClearConfirm ||
    showQuickHistory;

  React.useEffect(() => {
    if (!anyModalOpen && currentUser) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [anyModalOpen, currentUser]);

  React.useEffect(() => {
    if (!currentUser) return;

    // Refocus when window gains focus (e.g. waking up, switching back to app)
    const handleWindowFocus = () => {
      const active = document.activeElement;
      const isInputFocused = active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      );
      if (!isInputFocused && !anyModalOpen) {
        searchInputRef.current?.focus();
      }
    };

    // Intercept keys (e.g. barcode scanner) when not typing in any input
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (anyModalOpen) return;
      
      const active = document.activeElement;
      const isInputFocused = active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      );
      if (isInputFocused) return;

      // Ignore modifiers and functional/navigation keys
      if (e.altKey || e.ctrlKey || e.metaKey || e.key.length > 1) {
        return;
      }

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [anyModalOpen, currentUser]);

  React.useEffect(() => {
    if (!currentUser) {
      setSearchQuery('');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    setInlineSelectedIndex(0); inlineSelectedIndexRef.current = 0;
    setModalSelectedIndex(0);
    setModalCurrentPage(1);
    if (searchQuery.trim() !== '') { setFastSaleName(searchQuery); }
    else { lastSelectedQueryRef.current = null; }
  }, [searchQuery]);

  React.useEffect(() => {
    if (changeAmount === null) { setCountdown(10); return; }
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { setChangeAmount(null); return 10; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [changeAmount]);

  React.useEffect(() => {
    if (basketTotal > 0) { setPayCash(Number(basketTotal.toFixed(2))); setPayCard(0); setCardCode(''); }
    else { setPayCash(0); setPayCard(0); setCardCode(''); }
  }, [basketTotal]);

  React.useEffect(() => {
    if (!currentUser) return;
    if (!isSearchModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const itemsCount = paginatedModalItems.length;
      if (itemsCount > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setModalSelectedIndex((prev) => Math.min(prev + 1, itemsCount - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setModalSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selectedItem = paginatedModalItems[modalSelectedIndex];
          if (selectedItem) {
            addToBasket(selectedItem);
            setIsSearchModalOpen(false);
            setSearchQuery('');
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
        } else if (e.key === 'PageDown' || e.key === 'ArrowRight') {
          if (modalCurrentPage < modalTotalPages) {
            e.preventDefault();
            setModalCurrentPage((prev) => prev + 1);
            setModalSelectedIndex(0);
          }
        } else if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
          if (modalCurrentPage > 1) {
            e.preventDefault();
            setModalCurrentPage((prev) => prev - 1);
            setModalSelectedIndex(0);
          }
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSearchModalOpen(false);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, modalSelectedIndex, paginatedModalItems, modalCurrentPage, modalTotalPages, basket, currentUser]);

  React.useEffect(() => {
    if (isSearchModalOpen && matchedProductsForModal.length === 0) {
      setTimeout(() => { if (modalFastSaleNameInputRef.current) { modalFastSaleNameInputRef.current.focus(); modalFastSaleNameInputRef.current.select(); } }, 100);
    }
  }, [isSearchModalOpen, matchedProductsForModal.length]);

  React.useEffect(() => {
    if (isFastSaleModalOpen) {
      setFastSaleName(searchQuery.trim()); setFastSalePrice('');
      setTimeout(() => { if (fastSaleModalNameInputRef.current) { fastSaleModalNameInputRef.current.focus(); fastSaleModalNameInputRef.current.select(); } }, 100);
    } else if (prevIsFastSaleModalOpen.current && !isFastSaleModalOpen) {
      setSearchQuery(''); setFastSaleName(''); setFastSalePrice('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    prevIsFastSaleModalOpen.current = isFastSaleModalOpen;
  }, [isFastSaleModalOpen]);

  React.useEffect(() => {
    if (availableItems.length === 0 && searchQuery.trim() !== '') {
      if (lastSelectedQueryRef.current !== searchQuery) {
        lastSelectedQueryRef.current = searchQuery;
        const timer = setTimeout(() => {
          const el = fastSaleNameInputRef.current;
          if (el) { el.focus(); el.select(); el.setSelectionRange(0, el.value.length); }
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [availableItems.length, searchQuery]);

  React.useEffect(() => {
    if (!currentUser) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFastSaleModalOpen) { e.preventDefault(); setIsFastSaleModalOpen(false); setTimeout(() => searchInputRef.current?.focus(), 50); return; }
        if (availableItems.length === 0 && searchQuery.trim() !== '') { e.preventDefault(); setSearchQuery(''); setTimeout(() => searchInputRef.current?.focus(), 50); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableItems.length, searchQuery, isFastSaleModalOpen, currentUser]);

  React.useEffect(() => {
    if (!currentUser) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      
      if (showSoftCalculator && !isTyping) {
        if (/^[0-9+\-*/().]$/.test(e.key)) {
          e.preventDefault();
          handleCalcBtn(e.key);
          return;
        }
        if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          handleCalcBtn('=');
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleCalcBtn('DEL');
          return;
        }
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleCalcBtn('C');
          return;
        }
      }

      if (e.key === 'F5') { e.preventDefault(); handleShortcutPress('F5'); }
      else if (e.key === 'F10') { e.preventDefault(); handleShortcutPress('F10'); }
      else if (e.key === 'F2') { e.preventDefault(); handleShortcutPress('F2'); }
      else if (e.key === 'F3') { e.preventDefault(); handleShortcutPress('F3'); }
      else if (e.key === 'F6') { e.preventDefault(); handleShortcutPress('F6'); }
      else if (e.key === 'F9') { e.preventDefault(); handleShortcutPress('F9'); }
      else if ((e.key === 'x' || e.key === 'X') && !isTyping) { e.preventDefault(); handleShortcutPress('ESC'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [basket, payCash, payCard, basketTotal, cardCode, showSaleConfirm, showSaveSaleModal, showSavedSalesListModal, showCancelConfirm, savedSales.length, showSoftCalculator, showSoftCoinsCounter, showSoftClientModal, showRepairSelectionModal, currentUser, softCalculatorExpr, softCalculatorResult, posShouldPrintTicket, posShouldSendWhatsApp, posWhatsappPhone, config.autoPrintOnSale]);

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    // Config & external
    config, sales, users, setActiveTab, onCancelSale, orders,
    // State
    basket: derivedBasket, setBasket,
    saleType, setSaleType,
    isAdminMode, setIsAdminMode,
    editingItemId, setEditingItemId,
    editingPriceValue, setEditingPriceValue,
    paymentMethod, setPaymentMethod,
    cashAmount, setCashAmount,
    payCash, setPayCash,
    payCard, setPayCard,

    cardCode, setCardCode,
    lastSaleReceipt, setLastSaleReceipt,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    showClearConfirm, setShowClearConfirm,
    confirmationCode, setConfirmationCode,
    showSaleConfirm, setShowSaleConfirm,
    discountType, setDiscountType,
    discountValue, setDiscountValue,
    discountEnabled, setDiscountEnabled,
    discountAmount,
    showFiarModal, setShowFiarModal,
    fiarClientName, setFiarClientName,
    fiarClientPhone, setFiarClientPhone,
    fiarCountryCode, setFiarCountryCode,
    fiarExistingAccount, setFiarExistingAccount,
    fiarForceNew, setFiarForceNew,
    fiarCreditLimit, setFiarCreditLimit,
    executeFiar,
    changeAmount, setChangeAmount,
    countdown, setCountdown,
    fastSaleName, setFastSaleName,
    fastSalePrice, setFastSalePrice,
    saveToInventory, setSaveToInventory,
    mobileTab, setMobileTab,
    isSearchModalOpen, setIsSearchModalOpen,
    modalCurrentPage, setModalCurrentPage,
    isFastSaleModalOpen, setIsFastSaleModalOpen,
    showQuickHistory, setShowQuickHistory,
    quickHistoryConfirm, setQuickHistoryConfirm,
    quickHistoryDetail, setQuickHistoryDetail,
    modalSelectedIndex, setModalSelectedIndex,
    inlineSelectedIndex, setInlineSelectedIndex, inlineSelectedIndexRef,
    showCancelConfirm, setShowCancelConfirm,
    showSaveSaleModal, setShowSaveSaleModal,
    saveSaleLabel, setSaveSaleLabel,
    showSavedSalesListModal, setShowSavedSalesListModal,
    saleToDelete, setSaleToDelete,
    pendingLoadSaleId, setPendingLoadSaleId,
    showSoftCalculator, setShowSoftCalculator,
    softCalculatorExpr, setSoftCalculatorExpr,
    softCalculatorResult, setSoftCalculatorResult,
    showSoftCoinsCounter, setShowSoftCoinsCounter,
    softCoinsList, setSoftCoinsList,
    showSoftClientModal, setShowSoftClientModal,
    posShouldPrintTicket, setPosShouldPrintTicket,
    posShouldSendWhatsApp, setPosShouldSendWhatsApp,
    showPosWhatsappModal, setShowPosWhatsappModal,
    posWhatsappPhone, setPosWhatsappPhone,
    posToast, setPosToast,
    showAdminAuthModal, setShowAdminAuthModal,
    adminAuthPin, setAdminAuthPin,
    adminAuthError, setAdminAuthError,
    pendingEditItemId, setPendingEditItemId,
    savedSales, setSavedSales,
    // Refs
    lastSelectedQueryRef, fastSalePriceRef, fastSaleNameInputRef, searchInputRef,
    lastClickTimeRef, modalFastSaleNameInputRef, modalFastSalePriceInputRef,
    fastSaleModalNameInputRef, fastSaleModalPriceInputRef,
    // Computed
    softCoinsTotal, salesCountMap, queryTrimmed, matchedProductsForModal, exactMatch,
    paginatedModalItems, modalTotalPages,
    topSellingIds, categories, availableItems, inventory: resolvedInventory,
    basketSubtotal, basketTotal, basketTotalItems,
    // Handlers
    triggerToast, playCashRegisterSound, handleCalcBtn,
    cancelAndCleanupFastSale, cancelAndCleanupSearchModal,
    addFastSaleItem, handleModalAddFastSaleItem,
    addToBasket, updateQuantity, removeFromBasket, toggleBasketItemPriceType,
    handleSavePrice, handleRequestEditPrice,
    handleAdminAuthSubmit, handleLockAdminMode,
    handleSaveSaleForLater, confirmSaveSaleForLater,
    handleLoadSavedSale, handleConfirmLoadCombine, handleConfirmLoadOverwrite, handleCancelLoadConflict,
    handleDeleteSavedSale, executeSale, validateAndConfirm, handleCheckout, handleShortcutPress,
    // Apartar desde POS
    showApartarModal, setShowApartarModal,
    apartarClientName, setApartarClientName,
    apartarClientPhone, setApartarClientPhone,
    apartarCountryCode, setApartarCountryCode,
    apartarInitialAmount, setApartarInitialAmount,
    apartarInitialMethod, setApartarInitialMethod,
    apartarDueDate, setApartarDueDate,
    apartarNotes, setApartarNotes,
    handleConfirmApartar,
    // Reparaciones en POS
    showRepairSelectionModal, setShowRepairSelectionModal,
    repairSearchQuery, setRepairSearchQuery,
    addRepairOrderToBasket,

    // Activación de Chips en POS
    posRegisterChipActivation, setPosRegisterChipActivation,
    posActivationClientName, setPosActivationClientName,
    posActivationPhone, setPosActivationPhone,
    posActivationIccid, setPosActivationIccid,
    posActivationImei, setPosActivationImei,
    hasChipInBasket,
    pendingChipToAdd, setPendingChipToAdd,
    editingChipBasketItem, setEditingChipBasketItem,
    handleConfirmAddChip, handleConfirmEditChip,
    saleNote, setSaleNote,
    waConnected,
  };
}

export type PosLogic = ReturnType<typeof usePosLogic>;
