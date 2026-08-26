/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { Calculator, ShoppingCart, Trash2, Coins, CreditCard, Sparkles, CheckCircle, Search, X, CornerDownLeft, FolderHeart, Archive, Info, XCircle, Users, Edit, Lock, Unlock, ShieldCheck, Wrench, Printer, MessageSquare, Smartphone, AlertTriangle, Tag, Star } from 'lucide-react';
import { PosLogic, normalizeSearchText } from '../../hooks/usePosLogic';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { logPriceCheck, markAddedToCart } from '../../utils/priceCheckLog';
import { getIndividualAdvance } from '../../utils/orderHelpers';
import { handleCaretPreservingChange } from '../../utils/domHelpers';
import { PosItemThumbnail } from './PosItemThumbnail';
import { sendPosQuoteByWhatsapp } from '../../utils/whatsapp';

interface Props {
  logic: PosLogic;
  warehouses?: any[];
}

export default function PosFluent({ logic, warehouses = [] }: Props) {
  const {
    config, sales, setActiveTab, users, currentUser,
    basket, setBasket, isAdminMode,
    editingItemId, setEditingItemId, editingPriceValue, setEditingPriceValue,
    payCash, setPayCash, payCard, setPayCard,
    cardCode, setCardCode,
    lastSaleReceipt, searchQuery, setSearchQuery,
    selectedSaleWarehouseId, setSelectedSaleWarehouseId,
    isSearchModalOpen, setIsSearchModalOpen,
    modalCurrentPage, setModalCurrentPage,
    showSaleConfirm, setShowSaleConfirm, changeAmount, setChangeAmount,
    discountType, setDiscountType, discountValue, setDiscountValue, discountEnabled, setDiscountEnabled, discountAmount,
    countdown, fastSaleName, setFastSaleName, fastSalePrice, setFastSalePrice,
    saveToInventory, setSaveToInventory,
    saleNote, setSaleNote,
    isFastSaleModalOpen, setIsFastSaleModalOpen,
    showCancelConfirm, setShowCancelConfirm, showSaveSaleModal, setShowSaveSaleModal,
    saveSaleLabel, setSaveSaleLabel, showSavedSalesListModal, setShowSavedSalesListModal,
    saleToDelete, setSaleToDelete, pendingLoadSaleId,
    showSoftCalculator, setShowSoftCalculator, softCalculatorExpr, softCalculatorResult,
    showSoftCoinsCounter, setShowSoftCoinsCounter, softCoinsList, setSoftCoinsList,
    showSoftClientModal, setShowSoftClientModal,
    posShouldPrintTicket, setPosShouldPrintTicket,
    posShouldSendWhatsApp, setPosShouldSendWhatsApp,
    showPosWhatsappModal, setShowPosWhatsappModal,
    posRegisterChipActivation, setPosRegisterChipActivation,
    posActivationClientName, setPosActivationClientName,
    posActivationPhone, setPosActivationPhone,
    posActivationIccid, setPosActivationIccid,
    posActivationImei, setPosActivationImei,
    hasChipInBasket,
    pendingChipToAdd, setPendingChipToAdd,
    editingChipBasketItem, setEditingChipBasketItem,
    posWhatsappPhone, setPosWhatsappPhone, posToast, waConnected,
    showAdminAuthModal, setShowAdminAuthModal, adminAuthPin, setAdminAuthPin,
    adminAuthError, pendingEditItemId, setPendingEditItemId,
    savedSales, setSavedSales,
    searchInputRef, lastClickTimeRef, modalFastSaleNameInputRef, modalFastSalePriceInputRef,
    fastSaleModalNameInputRef, fastSaleModalPriceInputRef,
    matchedProductsForModal, exactMatch, paginatedModalItems, modalTotalPages,
    modalCategoryFilter, setModalCategoryFilter,
    inlineSelectedIndex, setInlineSelectedIndex, inlineSelectedIndexRef,
    modalSelectedIndex, setModalSelectedIndex,
    softCoinsTotal, availableItems, inventory, getItemStock,
    posTotalPosition, togglePosTotalPosition,
    basketTotal, basketTotalItems, saleType, setSaleType,
    triggerToast, handleCalcBtn, cancelAndCleanupFastSale, cancelAndCleanupSearchModal,
    addFastSaleItem, handleModalAddFastSaleItem,
    addToBasket, updateQuantity, removeFromBasket, toggleBasketItemPriceType,
    updateLineDiscount,
    handleSavePrice, handleRequestEditPrice,
    handleConfirmAddChip, handleConfirmEditChip,
    handleAdminAuthSubmit,
    handleSaveSaleForLater, confirmSaveSaleForLater,
    handleLoadSavedSale, handleConfirmLoadCombine, handleConfirmLoadOverwrite, handleCancelLoadConflict,
    handleDeleteSavedSale, executeSale, validateAndConfirm, handleCheckout,
    showFiarModal, setShowFiarModal, fiarClientName, setFiarClientName, fiarClientPhone, setFiarClientPhone, fiarCountryCode, setFiarCountryCode, fiarExistingAccount, setFiarExistingAccount, fiarCreditLimit, setFiarCreditLimit, fiarHasLimit, setFiarHasLimit, executeFiar,
    fiarNameSuggestions, fiarPhoneSuggestions, selectExistingCreditAccount,
    fiarInitialPayment, setFiarInitialPayment, fiarInitialMethod, setFiarInitialMethod, openFiarModal,
    showApartarModal, setShowApartarModal,
    apartarClientName, setApartarClientName,
    apartarClientPhone, setApartarClientPhone,
    apartarCountryCode, setApartarCountryCode,
    apartarInitialAmount, setApartarInitialAmount,
    apartarInitialMethod, setApartarInitialMethod,
    apartarDueDate, setApartarDueDate,
    handleConfirmApartar,
    // Reparaciones en POS
    orders,
    showRepairSelectionModal, setShowRepairSelectionModal,
    repairSearchQuery, setRepairSearchQuery,
    addRepairOrderToBasket,
    outOfStockAlertItem, setOutOfStockAlertItem,
  } = logic;

  const isWaIntegratedOffline = !waConnected;
  const [activeSearchField, setActiveSearchField] = React.useState<'name' | 'phone' | null>(null);

  const [chipClientName, setChipClientName] = React.useState('');
  const [chipPhone, setChipPhone] = React.useState('');
  const [chipIccid, setChipIccid] = React.useState('');
  const [chipImei, setChipImei] = React.useState('');
  const [chipRegisterDetails, setChipRegisterDetails] = React.useState(true);
  const [showNoteOption, setShowNoteOption] = React.useState(false);
  const [showSpecialOptions, setShowSpecialOptions] = React.useState(false);

  // Estados para descuentos por artículo
  const [editingDiscountItemId, setEditingDiscountItemId] = React.useState<string | null>(null);
  const [editingDiscountValue, setEditingDiscountValue] = React.useState<string>('');
  const [editingDiscountType, setEditingDiscountType] = React.useState<'percentage' | 'fixed'>('percentage');

  // Estados para cotización express desde POS
  const [showQuoteWhatsappModal, setShowQuoteWhatsappModal] = React.useState(false);
  const [quoteClientName, setQuoteClientName] = React.useState('');
  const [quoteWhatsappPhone, setQuoteWhatsappPhone] = React.useState('');
  const [quoteCountryCode, setQuoteCountryCode] = React.useState('+52');
  const [isQuoteMode, setIsQuoteMode] = React.useState(false);

  const [showFavoritesModal, setShowFavoritesModal] = React.useState(false);
  const [favSearchQuery, setFavSearchQuery] = React.useState('');
  const [favSelectedCategory, setFavSelectedCategory] = React.useState('TODAS');
  const [favSelectedIndex, setFavSelectedIndex] = React.useState(0);

  const allFavoriteItems = React.useMemo(() => {
    return (inventory || []).filter(item => !!item.favorite);
  }, [inventory]);

  const favoriteCategories = React.useMemo(() => {
    const set = new Set<string>();
    allFavoriteItems.forEach(item => {
      if (item.category) set.add(item.category.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [allFavoriteItems]);

  const filteredFavoriteItems = React.useMemo(() => {
    return allFavoriteItems.filter(item => {
      if (favSelectedCategory !== 'TODAS' && (item.category || '').trim().toUpperCase() !== favSelectedCategory) return false;
      
      // Filtrar por bodega seleccionada
      if (selectedSaleWarehouseId === 'local') {
        if (item.manageStock !== false && item.stock <= 0) return false;
      } else if (selectedSaleWarehouseId && selectedSaleWarehouseId !== 'all') {
        if (item.manageStock !== false && (item.warehouseStock?.[selectedSaleWarehouseId] || 0) <= 0) return false;
      }

      if (favSearchQuery.trim()) {
        const q = favSearchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchCode = (item.code || '').toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        return matchName || matchCode || matchBrand;
      }
      return true;
    });
  }, [allFavoriteItems, favSelectedCategory, favSearchQuery, selectedSaleWarehouseId]);

  React.useEffect(() => {
    setFavSelectedIndex(0);
  }, [favSearchQuery, favSelectedCategory, showFavoritesModal]);

  React.useEffect(() => {
    if (!showFavoritesModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const count = filteredFavoriteItems.length;
      if (count > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFavSelectedIndex(prev => Math.min(prev + 1, count - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFavSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = filteredFavoriteItems[favSelectedIndex];
          if (item) {
            addToBasket(item);
            triggerToast?.('¡Agregado a la venta!', 'success');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFavoritesModal, filteredFavoriteItems, favSelectedIndex, addToBasket, triggerToast]);

  React.useEffect(() => {
    if (!showFavoritesModal) return;
    const el = document.querySelector('.fav-item-row-selected');
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [favSelectedIndex, showFavoritesModal]);

  React.useEffect(() => {
    if (basket.length === 0) {
      setIsQuoteMode(false);
    }
  }, [basket.length]);

  React.useEffect(() => {
    if (pendingChipToAdd) {
      setChipClientName('');
      setChipPhone('');
      setChipIccid('');
      setChipImei('');
      setChipRegisterDetails(true);
    }
  }, [pendingChipToAdd]);

  React.useEffect(() => {
    if (editingChipBasketItem) {
      const act = editingChipBasketItem.chipActivation;
      setChipClientName(act?.clientName || '');
      setChipPhone(act?.chipPhone || '');
      setChipIccid(act?.iccid || '');
      setChipImei(act?.imei || '');
      setChipRegisterDetails(!!act);
    }
  }, [editingChipBasketItem]);

  const modalActiveInventory = React.useMemo(() => {
    if (selectedSaleWarehouseId === 'local') {
      return inventory.filter(item => item.manageStock === false || item.stock > 0);
    } else if (selectedSaleWarehouseId && selectedSaleWarehouseId !== 'all') {
      return inventory.filter(item => {
        const isAssigned = item.warehouseStock && (selectedSaleWarehouseId in item.warehouseStock);
        if (!isAssigned) return false;
        return item.manageStock === false || (item.warehouseStock?.[selectedSaleWarehouseId] || 0) > 0;
      });
    }
    return inventory;
  }, [inventory, selectedSaleWarehouseId]);

  const modalCategoriesList = React.useMemo(() => {
    return Array.from(new Set(modalActiveInventory.map(p => (p.category || '').trim().toUpperCase()).filter(Boolean))).sort();
  }, [modalActiveInventory]);

  const [fiarPrint, setFiarPrint] = React.useState(true);
  const [fiarWhatsapp, setFiarWhatsapp] = React.useState(false);

  React.useEffect(() => {
    if (showFiarModal) {
      setFiarPrint(true);
      setFiarWhatsapp(false);
    }
  }, [showFiarModal]);

  const toggleFiarPrint = () => {
    setFiarPrint(prev => {
      const next = !prev;
      if (next) setFiarWhatsapp(false);
      return next;
    });
  };

  const toggleFiarWhatsapp = () => {
    setFiarWhatsapp(prev => {
      const next = !prev;
      if (next) setFiarPrint(false);
      else setFiarPrint(true);
      return next;
    });
  };
  const [apartarPrint, setApartarPrint] = React.useState(true);
  const [apartarWhatsapp, setApartarWhatsapp] = React.useState(false);

  React.useEffect(() => {
    if (showApartarModal) {
      setApartarPrint(true);
      setApartarWhatsapp(false);
    }
  }, [showApartarModal]);

  const toggleApartarPrint = () => {
    setApartarPrint(prev => {
      const next = !prev;
      if (next) setApartarWhatsapp(false);
      return next;
    });
  };

  const toggleApartarWhatsapp = () => {
    setApartarWhatsapp(prev => {
      const next = !prev;
      if (next) setApartarPrint(false);
      else setApartarPrint(true);
      return next;
    });
  };


  const sym = config.currencySymbol || '$';
  const isIdle = basket.length === 0;

  const [showPriceChecker, setShowPriceChecker] = React.useState(false);
  const [priceCheckerQuery, setPriceCheckerQuery] = React.useState('');
  const [priceCheckerResults, setPriceCheckerResults] = React.useState<typeof inventory | null>(null);
  const [priceCheckerSelected, setPriceCheckerSelected] = React.useState<typeof inventory[0] | null>(null);
  const [priceCheckerAdded, setPriceCheckerAdded] = React.useState(false);
  const [priceCheckerHighlight, setPriceCheckerHighlight] = React.useState(0);
  const priceCheckerEntryId = React.useRef<string | null>(null);
  const priceCheckerInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isSearchModalOpen) return;
    const container = document.getElementById('pos-modal-table-container');
    const activeRow = container?.querySelector('.pos-modal-row-selected') as HTMLElement;
    if (container && activeRow) {
      const containerRect = container.getBoundingClientRect();
      const rowRect = activeRow.getBoundingClientRect();
      const innerContainerTop = containerRect.top + container.clientTop;

      const elemTop = rowRect.top - innerContainerTop;
      const elemBottom = rowRect.bottom - innerContainerTop;

      // Use a buffer of 35px to ensure the selected row is comfortably visible
      // and not sitting right on the edge of the scroll container.
      const buffer = container.clientHeight > 150 ? 35 : 0;

      if (elemTop < buffer) {
        container.scrollTop += (elemTop - buffer);
      } else if (elemBottom > container.clientHeight - buffer) {
        container.scrollTop += (elemBottom - (container.clientHeight - buffer));
      }
    }
  }, [modalSelectedIndex, isSearchModalOpen, modalCurrentPage]);

  React.useEffect(() => {
    if (!showSaleConfirm) {
      setShowSpecialOptions(false);
    }
  }, [showSaleConfirm]);

  const renderPriceCheckerModal = () => {
    if (!showPriceChecker) return null;
    const results = priceCheckerResults;

    const doSearch = () => {
      const q = priceCheckerQuery.trim().toLowerCase();
      if (!q) return;
      const found = inventory.filter(i => i.active !== false && (i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)));
      if (found.length === 1) { priceCheckerEntryId.current = logPriceCheck(found[0]); setPriceCheckerSelected(found[0]); setPriceCheckerResults(null); }
      else { setPriceCheckerResults(found); setPriceCheckerSelected(null); setPriceCheckerHighlight(0); }
    };

    const doAddToCart = (item: typeof inventory[0]) => {
      if (priceCheckerEntryId.current) { markAddedToCart(priceCheckerEntryId.current); priceCheckerEntryId.current = null; }
      addToBasket(item);
      setPriceCheckerAdded(true);
      setTimeout(() => {
        setPriceCheckerAdded(false);
        setPriceCheckerSelected(null);
        setPriceCheckerResults(null);
        setPriceCheckerQuery('');
        setTimeout(() => priceCheckerInputRef.current?.focus(), 50);
      }, 900);
    };

    if (priceCheckerSelected) {
      const item = priceCheckerSelected;
      const isStockControlled = item.manageStock !== false;
      const stockColor = !isStockControlled ? 'text-indigo-650' : item.stock <= 0 ? 'text-rose-500' : item.stock <= item.minStock ? 'text-amber-500' : 'text-emerald-600';
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => { setPriceCheckerSelected(null); setPriceCheckerResults(null); setPriceCheckerQuery(''); setShowPriceChecker(false); }}>
          <div className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
          }`} onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' && !priceCheckerAdded) doAddToCart(item); if (e.key === 'Escape') { setPriceCheckerSelected(null); setTimeout(() => priceCheckerInputRef.current?.focus(), 50); } }}
            tabIndex={-1} ref={el => el?.focus()}
          >
            <div className="modal-dark-header bg-[#1a3a6b] px-4 py-3 flex items-center justify-between">
              <button onClick={() => { setPriceCheckerSelected(null); setTimeout(() => priceCheckerInputRef.current?.focus(), 50); }} className="cursor-pointer text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>← Volver</button>
              <span className="text-sm font-black uppercase tracking-widest">🏷️ Verificador de Precios</span>
              <button onClick={() => { setPriceCheckerSelected(null); setPriceCheckerResults(null); setPriceCheckerQuery(''); setShowPriceChecker(false); }} className="cursor-pointer text-lg font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>✕</button>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-8 gap-4">
              <div className={`text-6xl font-black tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-center">
                <div className={`text-lg font-black leading-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>{item.name}</div>
                {item.brand && <div className={`text-sm mt-1 ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>{item.brand}</div>}
              </div>
              <div className={`w-full rounded-xl px-4 py-3 flex flex-col gap-1.5 border ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#2d2d2d] border-white/5'
              }`}>
                {item.code && <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-550' : 'text-zinc-400'}>Código</span><span className={`font-mono font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-250'}`}>{item.code}</span></div>}
                {item.category && <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-550' : 'text-zinc-400'}>Categoría</span><span className={`font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-250'}`}>{item.category}</span></div>}
                <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-550' : 'text-zinc-400'}>Stock</span><span className={`font-black ${stockColor}`}>{!isStockControlled ? 'Ilimitado' : item.stock <= 0 ? 'Sin stock' : `${item.stock} uds.`}</span></div>
                {item.wholesalePrice !== undefined && item.wholesalePrice > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className={isLight ? 'text-zinc-550' : 'text-zinc-400'}>P. Mayoreo</span>
                    <span className={`font-mono font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {sym}{item.wholesalePrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => !priceCheckerAdded && doAddToCart(item)} className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest cursor-pointer transition-all ${priceCheckerAdded ? 'bg-emerald-500 text-white' : 'bg-[#1a3a6b] hover:bg-[#14306b] text-white'}`}>
                {priceCheckerAdded ? '✓ Agregado al carrito' : '+ Agregar al carrito  [Enter]'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowPriceChecker(false)}>
        <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
          isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
        }`} style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
          <div className="modal-dark-header bg-[#1a3a6b] px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-widest">🏷️ Verificador de Precios</span>
            <button onClick={() => setShowPriceChecker(false)} className="cursor-pointer text-lg font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>✕</button>
          </div>
          <div className={`p-3 border-b ${isLight ? 'border-zinc-200' : 'border-white/5'}`}>
            <input
              ref={priceCheckerInputRef}
              autoFocus
              type="text"
              placeholder="Nombre, código de barras, marca... (Enter)"
              value={priceCheckerQuery}
              onChange={e => { setPriceCheckerQuery(e.target.value); setPriceCheckerResults(null); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { if (results && results.length > 0) { const sel = results[priceCheckerHighlight] ?? results[0]; priceCheckerEntryId.current = logPriceCheck(sel); setPriceCheckerSelected(sel); setPriceCheckerResults(null); } else doSearch(); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); if (results) setPriceCheckerHighlight(i => Math.min(i + 1, results.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); if (results) setPriceCheckerHighlight(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Escape') setShowPriceChecker(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                isLight ? 'bg-zinc-50 border border-zinc-300 text-zinc-800 placeholder-zinc-400' : 'bg-[#2d2d2d] border border-white/10 text-white placeholder-zinc-500'
              }`}
            />
          </div>
          <div className={`flex-1 overflow-y-auto divide-y ${isLight ? 'divide-zinc-200' : 'divide-white/5'}`}>
            {results === null ? null : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400">Sin resultados</div>
            ) : results.map((item, idx) => (
              <div key={item.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer ${
                idx === priceCheckerHighlight ? (isLight ? 'bg-blue-50 border-l-2 border-blue-400' : 'bg-blue-950/20 border-l-2 border-blue-500') : (isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/5')
              }`} onClick={() => { priceCheckerEntryId.current = logPriceCheck(item); setPriceCheckerSelected(item); }} onMouseEnter={() => setPriceCheckerHighlight(idx)}>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isLight ? 'text-zinc-800' : 'text-white'}`}>{item.name}</div>
                  <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>{item.brand}{item.category ? ` · ${item.category}` : ''} · Stock: {item.manageStock === false ? 'Ilimitado' : item.stock}</div>
                </div>
                <div className={`text-sm font-black shrink-0 ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
          {results !== null && (
            <div className="px-4 py-2 text-[10px] text-zinc-400 border-t border-zinc-200">
              {results.length} artículo{results.length !== 1 ? 's' : ''} — clic para ver detalle
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFavoritesModal = () => {
    if (!showFavoritesModal) return null;

    const totalFavs = filteredFavoriteItems.length;
    const currentSelNum = totalFavs > 0 ? favSelectedIndex + 1 : 0;
    const sym = config.currencySymbol || '$';

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-left select-none" onClick={() => setShowFavoritesModal(false)}>
        <div className={`w-full max-w-4xl max-h-[85vh] border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp font-sans ${
          isLight ? 'bg-[#f3f3f3] border-zinc-200 text-zinc-900' : 'bg-[#202020] border-white/10 text-white'
        }`} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className={`px-6 py-3.5 flex items-center justify-between shrink-0 border-b ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#2a2a2a] border-white/10'
          }`}>
            <div className="flex items-center gap-2.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <h3 className="text-sm font-black tracking-wider uppercase font-sans">
                ⭐ Catálogo Rápido de Favoritos
              </h3>
            </div>
            <button
              onClick={() => setShowFavoritesModal(false)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-zinc-100 text-zinc-655' : 'hover:bg-white/10 text-white/70'
              }`}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Sub-header: Search, Dynamic Categories & Info */}
          <div className={`p-4 border-b space-y-3 shrink-0 ${
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#1a1a1a] border-white/10'
          }`}>
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre, código SKU o categoría..."
                value={favSearchQuery}
                onChange={(e) => setFavSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 border rounded-xl text-xs font-sans focus:outline-none ${
                  isLight 
                    ? 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-blue-500' 
                    : 'bg-[#252525] border-white/10 text-white placeholder-zinc-605 focus:border-blue-550'
                }`}
              />
              {favSearchQuery && (
                <button onClick={() => setFavSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categorías Dinámicas (Pills) */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                onClick={() => setFavSelectedCategory('TODAS')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                  favSelectedCategory === 'TODAS'
                    ? 'bg-blue-500 text-white font-black shadow-md'
                    : (isLight ? 'bg-white hover:bg-zinc-100 text-zinc-650 border border-zinc-200' : 'bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 border border-white/10')
                }`}
              >
                🌟 TODAS ({allFavoriteItems.length})
              </button>
              {favoriteCategories.map(cat => {
                const count = allFavoriteItems.filter(i => (i.category || '').trim().toUpperCase() === cat).length;
                const isSelected = favSelectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFavSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 text-white font-black shadow-md'
                        : (isLight ? 'bg-white hover:bg-zinc-100 text-zinc-650 border border-zinc-200' : 'bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 border border-white/10')
                    }`}
                  >
                    📁 {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Instrucción */}
            <p className={`text-xs font-medium leading-relaxed p-2.5 rounded-lg border ${
              isLight ? 'bg-white border-zinc-200/80 text-zinc-600' : 'bg-[#202020] border-white/5 text-zinc-400'
            }`}>
              Se encontraron <span className="font-extrabold text-blue-500">{totalFavs}</span> coincidencias. Navegue con las teclas <span className={`font-extrabold px-1.5 py-0.5 rounded border ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-white/10 text-white'}`}>↑ ↓</span> y confirme con <span className={`font-extrabold px-1.5 py-0.5 rounded border ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-zinc-800 border-white/10 text-white'} font-mono`}>Enter</span> o con clic.
            </p>
          </div>

          {/* Tabla de Lista */}
          <div className={`flex-1 overflow-hidden p-4 min-h-0 ${isLight ? 'bg-white' : 'bg-[#151515]'}`}>
            {totalFavs === 0 ? (
              <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                <Star className="w-12 h-12 opacity-20 text-amber-500" />
                <p className={`text-sm font-semibold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {allFavoriteItems.length === 0 
                    ? 'No hay refacciones ni productos marcados como favoritos aún.' 
                    : 'No se encontraron artículos favoritos en esta categoría o búsqueda.'}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                  Puedes marcar cualquier pieza o producto como favorito en las pestañas de Stock o Refacciones haciendo clic en la estrella ⭐.
                </p>
              </div>
            ) : (
              <div className={`h-full overflow-y-auto border rounded-lg ${isLight ? 'border-zinc-200' : 'border-white/10'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-wider ${
                      isLight ? 'bg-zinc-50 border-b border-zinc-200 text-zinc-500' : 'bg-[#1f1f1f] border-b border-white/10 text-zinc-400'
                    }`}>
                      <th className="py-2.5 px-4">Código / SKU</th>
                      <th className="py-2.5 px-3">Descripción / Artículo</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-right">Existencia</th>
                      <th className="py-2.5 px-4 text-right">Precio Público</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-zinc-150' : 'divide-white/5'}`}>
                    {filteredFavoriteItems.map((item, idx) => {
                      const isSelected = idx === favSelectedIndex;
                      const isStockControlled = item.manageStock !== false;
                      const finalStock = getItemStock(item);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            addToBasket(item);
                            triggerToast?.('¡Agregado a la venta!', 'success');
                          }}
                          className={`group text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? (isLight ? 'bg-blue-50/50 fav-item-row-selected font-bold text-blue-900' : 'bg-blue-950/20 fav-item-row-selected font-bold text-blue-300')
                              : (isLight ? 'hover:bg-zinc-50/80 text-zinc-800' : 'hover:bg-white/5 text-zinc-200')
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold tracking-tight">
                            {item.code || <span className="opacity-30">N/D</span>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold uppercase tracking-wide">{item.name}</div>
                            {item.brand && (
                              <div className="text-[10px] opacity-60 font-medium">Marca: {item.brand}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 uppercase text-[10px] font-semibold opacity-70">
                            {item.category || 'General'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {isStockControlled ? (
                              <span className={`px-1.5 py-0.5 rounded font-black ${
                                finalStock <= 0 
                                  ? 'bg-rose-500/10 text-rose-500' 
                                  : finalStock <= (item.minStock || 2)
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                {finalStock} pz
                              </span>
                            ) : (
                              <span className="opacity-40">∞ Servicio</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {sym}{item.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className={`px-6 py-3 flex items-center justify-between text-xs font-semibold border-t shrink-0 ${
            isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-650' : 'bg-[#252525] border-white/10 text-zinc-400'
          }`}>
            <span className="font-mono">[ESC] Cerrar catálogo</span>
            <span className="font-bold">Mostrando: {currentSelNum} de {totalFavs} artículos</span>
          </div>

        </div>
      </div>
    );
  };

  const isLight = config.themeMode === 'light';

  return (
    <div id="pos-view-root" className={`flex-1 p-3 md:p-4 overflow-hidden lg:h-full flex flex-col space-y-3.5 select-none min-h-0 transition-colors duration-200 ${
      isLight ? 'bg-[#f3f4f7] text-zinc-800' : 'bg-[#1c1c1c] text-zinc-200'
    }`}>

      {/* ── Alerta venta procesada ─────────────────────────────────────────── */}
      {lastSaleReceipt && (
        <div className={`p-2.5 border text-xs rounded-xl shadow flex items-center gap-2 animate-fadeIn shrink-0 ${
          isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/20 border-emerald-800/35 text-emerald-300'
        }`}>
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h5 className="font-bold">¡Venta {lastSaleReceipt} procesada con éxito!</h5>
            <p className={`text-[10px] font-normal ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>El stock fue decrementado y se ingresó el dinero a la caja diaria.</p>
          </div>
        </div>
      )}

      {/* ── Barra de búsqueda ─────────────────────────────────────────────── */}
      <div className={`premium-search-container animate-fadeIn shrink-0 select-none backdrop-blur-sm shadow-sm rounded-xl border ${
        isLight ? 'bg-white/80 border-zinc-200' : 'bg-[#2d2d2d]/90 border-white/10'
      }`}>
        <div className="flex items-center text-zinc-400 shrink-0 pl-1">
          <Search className="w-5 h-5 text-blue-500" />
        </div>
        <div className={`w-[1px] h-6 mx-4 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-white/10'}`} />
        <div className="relative flex-1 flex items-center h-full">
          {/* Dummy inputs to intercept Chrome autofill of credentials */}
          <input type="text" name="prevent_autofill_username" style={{ display: 'none' }} autoComplete="off" />
          <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} autoComplete="off" />
          <input
            type="text"
            ref={searchInputRef}
            autoFocus
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            aria-autocomplete="none" data-lpignore="true" data-1p-ignore="true"
            placeholder="Escanee código de barras, descripción o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`premium-search-input font-sans text-xs ${isLight ? 'text-zinc-800 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-550 bg-transparent'}`}
            onKeyDown={(e) => {
              const queryVal = searchQuery.trim();
              if (queryVal !== '') {
                if (e.key === 'Enter') {
                  if (isSearchModalOpen) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  const matchesCount = matchedProductsForModal.length;

                  if (exactMatch) {
                     addToBasket(exactMatch);
                     setSearchQuery('');
                  } else if (matchesCount >= 1) {
                    setModalCurrentPage(1);
                    setModalSelectedIndex(0);
                    setIsSearchModalOpen(true);
                  } else {
                    setIsFastSaleModalOpen(true);
                  }
                } else if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }
            }}
          />
        </div>
        {/* Selector de origen de venta */}
        {config.enableWarehouses === true && (
        <div className="ml-2 flex items-center gap-1.5 shrink-0 select-none">
          <span className={`text-[10px] uppercase font-black tracking-wider ${isLight ? 'text-zinc-655' : 'text-zinc-450'}`}>Vender desde:</span>
          <select
            value={selectedSaleWarehouseId}
            onChange={(e) => setSelectedSaleWarehouseId(e.target.value)}
            className={`px-2.5 py-1 border rounded-lg text-xs uppercase font-bold focus:outline-none cursor-pointer ${
              isLight 
                ? 'bg-white border-zinc-200 text-zinc-800 focus:border-blue-500' 
                : 'bg-[#202020] border-white/10 text-white focus:border-blue-500'
            }`}
          >
            <option value="all">🌐 Todas las Bodegas</option>
            <option value="local">🏠 Tienda Local</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>🏢 {w.name}</option>
            ))}
          </select>
        </div>
        )}
        <button
          type="button"
          onClick={() => { setFavSearchQuery(''); setFavSelectedCategory('TODAS'); setShowFavoritesModal(true); }}
          title="Ver catálogo rápido de productos y refacciones favoritas"
          className={`ml-2 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors ${
            isLight
              ? 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-700'
              : 'bg-amber-950/20 hover:bg-amber-900/30 border-amber-500/20 text-amber-400'
          }`}
        >
          ⭐ Favoritos
        </button>
        <button
          type="button"
          onClick={() => { setSearchQuery(''); setModalCurrentPage(1); setModalSelectedIndex(0); setIsSearchModalOpen(true); }}
          title="Ver catálogo completo de productos y refacciones"
          className={`ml-2 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors ${
            isLight
              ? 'bg-blue-50/80 hover:bg-blue-100/80 border-blue-200 text-blue-700'
              : 'bg-blue-950/20 hover:bg-blue-900/30 border-blue-500/20 text-blue-400'
          }`}
        >
          📂 Catálogo
        </button>
        <button
          type="button"
          onClick={() => { setPriceCheckerQuery(''); setPriceCheckerResults(null); setShowPriceChecker(true); }}
          title="Verificar precio de un artículo"
          className={`ml-2 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors ${
            isLight
              ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
              : 'bg-zinc-800/20 hover:bg-zinc-750 border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          🏷️ Precios
        </button>
      </div>

      {/* ── Área principal ─────────────────────────────────────────────────── */}
      {isIdle ? (
        /* IDLE — logo + guía de atajos */
        <div
          className={`flex-1 backdrop-blur-sm border rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-8 md:gap-16 min-h-0 overflow-y-auto ${
            isLight ? 'bg-white/70 border-zinc-200' : 'bg-[#202020]/90 border-white/10'
          }`}
          onClick={() => {
            const now = Date.now();
            if (now - lastClickTimeRef.current < 350) logic.setShowQuickHistory(true);
            lastClickTimeRef.current = now;
          }}
        >
          <div className={`flex items-center gap-4 select-none shrink-0 md:border-r md:border-dashed md:pr-12 ${isLight ? 'md:border-zinc-200' : 'md:border-white/10'}`}>
            <div className="relative w-24 h-28 flex flex-col items-center justify-center">
              <div className="w-16 h-12 bg-blue-500 rounded-xl border border-blue-600 flex items-center justify-center relative shadow-lg">
                <div className={`w-12 h-8 rounded-lg flex flex-col p-1 gap-1 ${isLight ? 'bg-white' : 'bg-[#2d2d2d]'}`}>
                  <div className="h-1.5 w-7 bg-blue-400 rounded-sm" />
                  <div className={`h-1 w-10 rounded-sm ${isLight ? 'bg-zinc-200' : 'bg-zinc-700'}`} />
                  <div className={`h-1 w-8 rounded-sm ${isLight ? 'bg-zinc-200' : 'bg-zinc-700'}`} />
                </div>
                <div className="absolute -bottom-2 w-4 h-2 bg-zinc-300 border border-zinc-400 rounded-sm" />
                <div className="absolute -bottom-3 w-8 h-1 bg-zinc-300 rounded-sm" />
              </div>
            </div>
            <div className="leading-none flex flex-col select-none font-sans justify-center space-y-1">
              <span className="text-3xl md:text-4xl font-black text-blue-600 tracking-tighter uppercase font-display leading-none">FIXMANAGER</span>
              <span className={`text-[10px] font-mono font-black tracking-widest uppercase pt-0.5 leading-none ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>POS / SERVICIOS</span>
            </div>
          </div>

          <div className={`border p-5 rounded-2xl shadow-sm max-w-sm w-full shrink-0 flex flex-col space-y-4 ${
            isLight ? 'bg-white/90 border-zinc-200' : 'bg-[#2d2d2d]/90 border-white/10'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 select-none text-[10px] ${isLight ? 'border-zinc-100' : 'border-white/5'}`}>
              <span className="font-extrabold text-blue-500 uppercase tracking-wider flex items-center gap-1">⌨️ Guía de Atajos</span>
              <span className={`font-mono font-bold uppercase tracking-widest ${isLight ? 'text-zinc-400' : 'text-zinc-550'}`}>FIXMANAGER</span>
            </div>
            <div className="flex flex-col space-y-1.5">
              {[
                { key: 'F2', label: 'Clientes', action: 'Asignar cliente o referencia', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                { key: 'F5', label: 'Finalizar venta', action: 'Cobrar cesta actual', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { key: 'F10', label: 'Guardar venta', action: 'Enviar a lista de espera', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { key: 'X', label: 'Cancelar', action: 'Vaciar cesta o cerrar menús', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                { key: 'F6', label: 'Calculadora', action: 'Herramienta de cálculo rápido', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                { key: 'F9', label: 'Contador', action: 'Caja chica y conteo', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { key: 'Ctrl +/-', label: 'Escala / Zoom', action: 'Ampliar o reducir escala de pantalla', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              ].map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-1.5 border rounded-xl ${
                  isLight ? 'bg-zinc-50/80 border-zinc-100' : 'bg-[#202020]/90 border-white/5'
                }`}>
                  <span className={`min-w-[40px] text-center font-mono font-black text-[10px] border rounded px-1.5 py-1 ${item.color}`}>{item.key}</span>
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-extrabold uppercase tracking-tight leading-tight ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{item.label}</span>
                    <span className={`text-[9.5px] leading-none pt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* CARRITO ACTIVO */
        <div className={`flex-1 flex flex-col min-h-0 backdrop-blur-sm border rounded-2xl p-3 animate-fadeIn shadow-sm ${
          isLight ? 'bg-white/80 border-zinc-200' : 'bg-[#202020]/90 border-white/10'
        }`}>
          <div className={`flex justify-between items-center pb-2 border-b mb-2 shrink-0 flex-wrap gap-2 ${isLight ? 'border-zinc-100' : 'border-white/5'}`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">🛒 CARRITO ACTUAL ({basketTotalItems} {basketTotalItems === 1 ? 'artículo' : 'artículos'})</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* TOGGLE ¿ES COTIZACIÓN? */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="quote-active-chk-fluent-header"
                  checked={isQuoteMode}
                  onChange={(e) => setIsQuoteMode(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="quote-active-chk-fluent-header" className={`text-[10px] uppercase font-black tracking-wider cursor-pointer select-none ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`}>
                  ¿Es Cotización?
                </label>
              </div>

              {/* Botón de alternar posición del Total */}
              <button
                type="button"
                onClick={togglePosTotalPosition}
                title={`Cambiar posición del total (Actualmente: ${posTotalPosition === 'top' ? 'Arriba a la derecha' : 'Abajo'})`}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border transition-all cursor-pointer flex items-center gap-1 select-none ${
                  isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                ↕️ Total {posTotalPosition === 'top' ? 'Arriba' : 'Abajo'}
              </button>

              {/* Total Card if Top */}
              {posTotalPosition === 'top' && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border shadow-sm select-none ${
                  isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-950/40 border-blue-700/50 text-blue-200'
                }`}>
                  <span className="text-[10px] font-bold uppercase opacity-70 tracking-wider">TOTAL:</span>
                  <span className="text-xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
                    {sym}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-zinc-400 font-bold uppercase tracking-wider text-[10px] leading-tight ${
                  isLight ? 'bg-zinc-50 border-zinc-100' : 'bg-[#252525]/60 border-white/5'
                }`}>
                  <th className="px-3 py-1 w-28">Código</th>
                  <th className="px-3 py-1 w-full">Artículo</th>
                  <th className="px-3 py-1 text-center w-24">Cantidad</th>
                  <th className="px-3 py-1 text-right w-36 whitespace-nowrap">Precio Unit.</th>
                  <th className="px-3 py-1 text-right w-28 whitespace-nowrap">Subtotal</th>
                  <th className="px-3 py-1 text-center w-12">Acc.</th>
                </tr>
              </thead>
              <tbody className={`divide-y animate-fadeIn ${isLight ? 'divide-zinc-50' : 'divide-white/5'}`}>
                 {basket.map((item) => {
                  const currentPrice = item.basePrice !== undefined ? item.basePrice : (item.customPrice !== undefined ? item.customPrice : item.item.price);
                  const discountAmount = item.discountAmount !== undefined ? item.discountAmount : 0;
                  const isStockControlled = item.item.manageStock !== false;
                  const availableStock = item.fromWarehouseId ? (item.item.warehouseStock?.[item.fromWarehouseId] || 0) : item.item.stock - (item.item.reservedQty || 0);
                  const isOutOfStock = isStockControlled && availableStock <= 0;
                  const isInsufficient = isStockControlled && availableStock > 0 && item.quantity > availableStock;
                  const rowId = item.uniqueId || item.item.id;

                  return (
                    <tr key={rowId} className={`transition-all font-semibold border-l-4 ${
                      isOutOfStock ? (isLight ? 'bg-amber-50/60 hover:bg-amber-100/75 text-amber-950 border-l-amber-500' : 'bg-amber-950/20 hover:bg-amber-900/30 text-amber-100 border-l-amber-500') :
                      isInsufficient ? (isLight ? 'bg-amber-50/30 hover:bg-amber-100/40 text-amber-950 border-l-amber-400' : 'bg-amber-950/10 hover:bg-amber-900/20 text-amber-100 border-l-amber-400') :
                      (isLight ? 'hover:bg-blue-50/40 text-zinc-700 border-l-transparent' : 'hover:bg-white/5 text-zinc-300 border-l-transparent')
                    }`}>
                      <td className={`px-3 py-1.5 font-mono text-[10px] truncate max-w-[112px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} title={item.item.code || 'S/C'}>{item.item.code || 'S/C'}</td>
                      <td className={`px-3 py-1.5 uppercase text-[11px] font-bold max-w-0 w-full ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                        <div className="flex items-center gap-2.5 w-full min-w-0">
                          <PosItemThumbnail imageUrl={item.item.imageUrl} name={item.item.name} code={item.item.code} category={item.item.category} price={currentPrice - discountAmount} currencySymbol={sym} size={30} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2 w-full">
                              <div className="flex flex-col min-w-0">
                                <span className="block whitespace-normal break-words leading-tight">{item.item.name}</span>
                                {item.chipActivation && (
                                  <div className={`text-[10px] font-mono font-bold flex items-center gap-1.5 mt-0.5 border px-2 py-0.5 rounded-lg w-fit select-none ${
                                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/20 border-emerald-800/35 text-emerald-400'
                                  }`}>
                                    <span>📞 {item.chipActivation.chipNumber}</span>
                                    <span className={isLight ? 'text-zinc-300' : 'text-zinc-700'}>|</span>
                                    <span>👤 {item.chipActivation.clientName}</span>
                                    {item.chipActivation.iccid && (
                                      <>
                                        <span className={isLight ? 'text-zinc-300' : 'text-zinc-700'}>|</span>
                                        <span>SIM: {item.chipActivation.iccid}</span>
                                      </>
                                    )}
                                    {item.chipActivation.imei && (
                                      <>
                                        <span className={isLight ? 'text-zinc-300' : 'text-zinc-700'}>|</span>
                                        <span>IMEI: {item.chipActivation.imei}</span>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingChipBasketItem(item)}
                                      className="text-blue-550 hover:text-blue-650 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                )}
                                {item.item.isChip === true && !item.chipActivation && (
                                  <div className={`text-[10px] font-mono font-bold flex items-center gap-1.5 mt-0.5 border px-2 py-0.5 rounded-lg w-fit select-none ${
                                    isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-650' : 'bg-[#2a2a2a] border-white/5 text-zinc-400'
                                  }`}>
                                    <span>⚠️ Sin Registrar (Venta Normal)</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingChipBasketItem(item)}
                                      className="text-blue-550 hover:text-blue-650 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
                                    >
                                      Registrar
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isOutOfStock && (
                                <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse shadow-sm shrink-0">
                                  ⚠️ SIN STOCK. VENTA PERMITIDA (AJUSTAR INVENTARIO SI REALMENTE TIENES EL ARTÍCULO)
                                </span>
                              )}
                              {isInsufficient && (
                                <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse shadow-sm shrink-0">
                                  ⚠️ EXCEDE STOCK. VENTA PERMITIDA (AJUSTAR INVENTARIO SI REALMENTE TIENES EL ARTÍCULO)
                                </span>
                              )}
                            </div>
                            <div className={`text-[9px] font-normal capitalize flex items-center gap-2 mt-0.5 select-none flex-wrap ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              <span>{item.item.brand} · {item.item.category}</span>
                              {item.fromWarehouseId ? (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                  🏢 {warehouses.find(w => w.id === item.fromWarehouseId)?.name || 'Bodega'}
                                </span>
                              ) : (
                                config.enableWarehouses === true && (
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                                  }`}>
                                    🏠 Tienda Local
                                  </span>
                                )
                              )}
                              {isStockControlled ? (
                                availableStock > 0 ? (
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  }`}>
                                    Stock: {availableStock} {availableStock === 1 ? 'pza' : 'pzas'}
                                  </span>
                                ) : (
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                                  }`}>
                                    Sin Stock
                                  </span>
                                )
                              ) : (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-650' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                                }`}>
                                  Ilimitado
                                </span>
                              )}
                              {item.item.wholesalePrice !== undefined && item.item.wholesalePrice > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleBasketItemPriceType(rowId)}
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full transition-all cursor-pointer border select-none leading-none ${
                                    (item.priceType || saleType) === 'mayoreo'
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                      : (isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-650 hover:bg-zinc-200' : 'bg-[#2a2a2a] border-white/5 text-zinc-400 hover:bg-[#353535]')
                                  }`}
                                  title="Haz clic para cambiar entre precio público y mayoreo para este artículo"
                                >
                                  {(item.priceType || saleType) === 'mayoreo' ? 'Mayoreo' : 'Público'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => updateQuantity(rowId, -1)} title="Restar 1 de este artículo" className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer font-black border active:scale-95 text-xs ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200' : 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 border-white/5'}`}>-</button>
                          <span className={`font-mono font-black w-6 text-center text-xs ${isLight ? 'text-zinc-800' : 'text-white'}`}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(rowId, 1)} title="Sumar 1 de este artículo" className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer font-black border active:scale-95 text-xs ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200' : 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 border-white/5'}`}>+</button>
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 text-right font-mono font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {editingDiscountItemId === rowId ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[9px] text-zinc-500 font-bold select-none">
                              Base: {sym}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div 
                              className="flex items-center justify-end gap-1"
                              onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  const val = parseFloat(editingDiscountValue);
                                  updateLineDiscount(rowId, isNaN(val) ? 0 : val, editingDiscountType);
                                  setEditingDiscountItemId(null);
                                }
                              }}
                            >
                              <input
                                type="number"
                                min="0"
                                value={editingDiscountValue}
                                onChange={(e) => setEditingDiscountValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(editingDiscountValue);
                                    updateLineDiscount(rowId, isNaN(val) ? 0 : val, editingDiscountType);
                                    setEditingDiscountItemId(null);
                                  }
                                  if (e.key === 'Escape') setEditingDiscountItemId(null);
                                }}
                                className={`w-12 text-right border border-red-400 rounded-lg px-1 py-0.5 text-xs font-mono font-bold focus:outline-none ${
                                  isLight ? 'bg-white text-zinc-800' : 'bg-[#2d2d2d] text-white'
                                }`}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                              <select
                                value={editingDiscountType}
                                onChange={(e) => setEditingDiscountType(e.target.value as 'percentage' | 'fixed')}
                                className={`border border-red-400 rounded-lg text-xs py-0.5 font-bold focus:outline-none ${
                                  isLight ? 'bg-white text-zinc-800' : 'bg-[#2d2d2d] text-white'
                                }`}
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">{sym}</option>
                              </select>
                            </div>
                          </div>
                        ) : editingItemId === rowId ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-400">{sym}</span>
                            <input type="number" step="any" min="0" value={editingPriceValue} onChange={(e) => setEditingPriceValue(e.target.value)}
                              onBlur={() => handleSavePrice(rowId)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePrice(rowId); if (e.key === 'Escape') setEditingItemId(null); }}
                              className={`w-20 text-right border-2 border-blue-400 rounded px-1 py-0.5 text-xs font-mono font-bold focus:outline-none ${
                                isLight ? 'bg-white text-zinc-800' : 'bg-[#2d2d2d] text-white'
                              }`} autoFocus onFocus={(e) => e.target.select()} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 group whitespace-nowrap">
                            {/* Botones de acción (visibles solo en hover a la izquierda para mantener alineación) */}
                            <div className="hidden group-hover:flex items-center gap-1 mr-1">
                              <button
                                type="button"
                                onClick={() => handleRequestEditPrice(rowId, currentPrice)}
                                className="text-zinc-400 hover:text-blue-655 cursor-pointer"
                                title={isAdminMode ? 'Editar precio (No se refleja en el ticket)' : 'Editar precio (requiere PIN de administrador - No se refleja en el ticket)'}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDiscountItemId(rowId);
                                  setEditingDiscountValue(item.lineDiscountValue ? item.lineDiscountValue.toString() : '');
                                  setEditingDiscountType(item.lineDiscountType || 'percentage');
                                }}
                                className="text-zinc-400 hover:text-red-500 cursor-pointer"
                                title="Descuento (Se refleja en el ticket)"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Contenedor de precio y badges */}
                            <div className="flex flex-col items-end">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.customPrice !== undefined && (
                                  <span className={`text-[9px] font-bold border px-0.5 rounded ${isLight ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-amber-400 bg-amber-950/20 border-amber-800/35'}`}>MOD</span>
                                )}
                                {item.lineDiscountValue !== undefined && item.lineDiscountValue > 0 ? (
                                  <>
                                    <span className={`line-through text-xs ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                      {sym}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className={`text-xs mx-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-555'}`}>-</span>
                                    <span className={`font-semibold text-xs ${isLight ? 'text-red-655' : 'text-red-400'}`}>
                                      {item.lineDiscountType === 'percentage' ? `${item.lineDiscountValue}%` : `${sym}${item.lineDiscountValue}`}
                                    </span>
                                    <span className={`text-xs mx-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-555'}`}>=</span>
                                    <span className={`font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>
                                      {sym}{(currentPrice - discountAmount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </>
                                ) : (
                                  <span className={item.customPrice !== undefined ? 'text-amber-600 font-black' : ''}>
                                    {sym}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              {item.quantity > 1 && item.lineDiscountValue !== undefined && item.lineDiscountValue > 0 && (
                                <span className={`text-[9px] font-medium select-none mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>
                                  (Desc. total: -{sym}{(discountAmount * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-extrabold text-blue-500 text-xs">{sym}{((currentPrice - discountAmount) * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-1.5 text-center">
                        <button type="button" onClick={() => removeFromBasket(rowId)} title="Eliminar del ticket" className={`p-1 px-2 border rounded-lg transition-all cursor-pointer inline-flex items-center justify-center active:scale-90 ${isLight ? 'border-zinc-200 hover:border-red-300 hover:bg-red-50 text-zinc-400 hover:text-red-500' : 'border-white/5 hover:border-red-800/35 hover:bg-red-950/20 text-zinc-500 hover:text-red-400'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={`mt-2 pt-2 border-t flex justify-between items-center shrink-0 text-[10px] ${isLight ? 'border-zinc-100 text-zinc-400' : 'border-white/5 text-zinc-500'}`}>
            <span>Presione <strong className={isLight ? 'text-zinc-655' : 'text-zinc-350'}>Cobrar</strong> o <strong className={isLight ? 'text-zinc-655' : 'text-zinc-350'}>F5</strong> para finalizar</span>
            <span className={`font-mono uppercase font-bold border px-1.5 py-0.5 rounded ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-650' : 'bg-[#252525]/60 border-white/5 text-zinc-450'}`}>TRANSACCIÓN ACTIVA</span>
          </div>
        </div>
      )}

      {/* ── Barra inferior ─────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-sm border border-zinc-200 flex items-center justify-between shadow-sm px-4 py-2.5 rounded-lg shrink-0 select-none">
        <div className="flex items-center gap-4">
          {posTotalPosition !== 'top' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest font-sans select-none leading-none pt-0.5">Total:</span>
              <span className="text-2xl md:text-3xl font-black text-blue-600 font-mono tracking-tighter leading-none select-none">{sym}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Selector de Tipo de Venta (Público / Mayoreo) */}
          <div className="flex bg-zinc-100 border border-zinc-255/15 rounded-full p-0.5 font-sans select-none shrink-0">
            <button
              type="button"
              onClick={() => setSaleType('publico')}
              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-full transition-all cursor-pointer ${
                saleType === 'publico'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-550 hover:text-zinc-950'
              }`}
            >
              Público
            </button>
            <button
              type="button"
              onClick={() => setSaleType('mayoreo')}
              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-full transition-all cursor-pointer ${
                saleType === 'mayoreo'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-550 hover:text-zinc-950'
              }`}
            >
              Mayoreo
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isQuoteMode && (
            <>
              <button type="button" disabled={basket.length === 0} onClick={handleSaveSaleForLater}
                title="Guardar venta actual para después [F10]"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-blue-800">
                <span className="hidden sm:inline">Guardar</span> <span className="font-mono font-normal text-[9px] bg-black/15 px-1 py-0.5 rounded text-blue-100">[F10]</span>
              </button>
            </>
          )}
          {isQuoteMode && basket.length > 0 && (
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={() => {
                setQuoteClientName('');
                setQuoteWhatsappPhone('');
                setShowQuoteWhatsappModal(true);
              }}
              title="Compartir cotización de los artículos del carrito actual por WhatsApp"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-amber-800"
            >
              <Smartphone className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cotizar</span>
            </button>
          )}
          {!isQuoteMode && (
            <button type="button" disabled={basket.length === 0} onClick={handleCheckout}
              title="Finalizar la venta actual y registrar el pago [F5]"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-emerald-700">
              <span className="hidden sm:inline">Cobrar</span> <span className="font-mono font-normal text-[9px] bg-black/10 px-1 py-0.5 rounded text-emerald-100">[F5]</span>
            </button>
          )}
          <button type="button"
            disabled={basket.length === 0}
            onClick={() => setShowCancelConfirm(true)}
            title="Cancelar y vaciar todos los artículos agregados al carrito [X]"
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-rose-700">
            <span className="hidden sm:inline">Cancelar</span> <span className="font-mono font-normal text-[9px] bg-black/10 px-1 py-0.5 rounded text-rose-100">[X]</span>
          </button>
        </div>
      </div>

      {/* ── Modal de cobro ─────────────────────────────────────────────────── */}
      {showSaleConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl shadow-2xl flex flex-col font-sans overflow-hidden rounded-2xl border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
          }`}>
            <div className="bg-blue-600 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 text-white px-2 py-0.5 rounded mr-2">{saveSaleLabel || 'PÚBLICO GENERAL'}</span>
                <span className="text-[10px] text-blue-200 font-mono">IDENTIFICADOR: {saveSaleLabel ? 'ASIGNADO' : 'S/N'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 border border-white/20 rounded-xl text-right min-w-[220px] justify-between md:justify-end">
                <span className="text-[10px] text-blue-200 font-mono uppercase">Monto:</span>
                <div className="text-xl md:text-2xl font-mono font-black tracking-widest text-white">{sym}{(payCash + payCard).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {sym}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
            <div className={`px-4 py-2 border-b text-[10px] font-mono flex flex-wrap gap-x-4 gap-y-1 font-bold ${
              isLight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-blue-950/20 border-blue-900/30 text-blue-300'
            }`}>
              <span>[F2] {posShouldPrintTicket ? '✔' : '❌'} Imprimir</span>
              <span>[F5] Confirmar</span>
            </div>
            <div className={`p-5 space-y-4 max-h-[60vh] overflow-y-auto ${isLight ? 'bg-zinc-50/50' : 'bg-[#1b1b1b]'}`}>
              {(() => {
                const totalReceived = payCash + payCard;
                const isComplete = totalReceived >= basketTotal;
                const difference = Math.abs(totalReceived - basketTotal);
                return (
                  <div className={`border p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 font-mono shadow-sm ${
                    isLight ? 'bg-white border-zinc-200 text-zinc-750' : 'bg-[#2d2d2d] border-white/5 text-zinc-300'
                  }`}>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      <span>ESTADO:</span>
                      {isComplete ? <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-black text-[10px]">PAGO COMPLETO</span>
                        : <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-black text-[10px] animate-pulse">MONTO INSUFICIENTE</span>}
                    </div>
                    <div className="text-right">
                      {isComplete ? <span className="text-sm font-black text-emerald-600">CAMBIO: {sym}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        : <span className="text-sm font-black text-rose-600 animate-pulse">FALTANTE: {sym}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Distribuya el importe por método de pago:</h4>
                {[
                  { label: 'Efectivo', icon: '🪙', value: payCash, setter: setPayCash, code: null, setCode: null, autofocus: true },
                  { label: 'Tarjeta/Transfer', icon: '💳', value: payCard, setter: setPayCard, code: cardCode, setCode: setCardCode, autofocus: false },
                ].map((m) => (
                  <div key={m.label} className={`border p-3 rounded-xl transition-all shadow-sm ${
                    isLight ? 'bg-white border-zinc-200 hover:border-blue-200' : 'bg-[#2d2d2d] border-white/5 hover:border-blue-800/35'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg">{m.icon}</div>
                        <div>
                          <span className={`block text-xs font-extrabold ${isLight ? 'text-zinc-800' : 'text-white'}`}>{m.label}</span>
                          <span className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{m.label === 'Efectivo' ? 'Dinero físico' : m.label === 'Tarjeta' ? 'Terminal bancaria' : 'SPEI / Depósito'}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-base font-black text-zinc-400">{sym}</span>
                        <input type="number" min={0} step="any" value={m.value || ''} placeholder="0.00"
                          onChange={(e) => m.setter(Number(e.target.value) || 0)} onFocus={(e) => e.target.select()}
                          className={`w-44 border focus:outline-none rounded-xl px-3 pl-8 py-2.5 text-base font-mono font-black text-right ${
                            isLight ? 'bg-zinc-50 border-zinc-200 focus:border-blue-400 text-zinc-800' : 'bg-[#202020] border-white/10 focus:border-blue-750 text-white'
                          }`}
                          autoFocus={m.autofocus} />
                      </div>
                    </div>
                    {m.setCode && (
                      <div className={`mt-2 p-2 border-t border-dashed grid grid-cols-2 gap-2 items-center ${
                        isLight ? 'bg-[#fafafa] border-zinc-200' : 'bg-[#252525]/60 border-white/5'
                      }`}>
                        <span className="text-[9.5px] uppercase font-bold text-zinc-500">Referencia / Folio (Opcional):</span>
                        <input type="text" value={m.code || ''} placeholder="Ej. REF-12345" onChange={(e) => m.setCode!(e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs font-mono font-bold w-full focus:outline-none ${
                            isLight ? 'bg-white border-zinc-200 text-zinc-750 focus:border-blue-300' : 'bg-[#2d2d2d] border-white/10 text-white focus:border-blue-750'
                          }`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>


              {/* DISCOUNT INPUT CARD */}
              <div className={`border p-3 rounded-xl transition-all shadow-sm ${
                isLight ? 'bg-white border-zinc-200' : 'bg-[#2d2d2d] border-white/5'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-lg">🏷️</div>
                    <div>
                      <span className={`block text-xs font-extrabold ${isLight ? 'text-zinc-800' : 'text-white'}`}>Descuento a la Venta</span>
                      <span className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Descuento global en esta venta</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="discount-active-chk-fluent"
                      checked={discountEnabled}
                      onChange={(e) => {
                        setDiscountEnabled(e.target.checked);
                        if (!e.target.checked) {
                          setDiscountValue(0);
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="discount-active-chk-fluent" className={`text-xs font-bold cursor-pointer select-none ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      Habilitar
                    </label>
                  </div>
                </div>

                {discountEnabled && (
                  <div className={`mt-2 p-2 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-2 items-center ${
                    isLight ? 'bg-[#fafafa] border-zinc-200' : 'bg-[#252525]/60 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9.5px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Tipo:</span>
                      <select
                        value={discountType}
                        onChange={(e) => {
                          setDiscountType(e.target.value as 'percentage' | 'fixed');
                          setDiscountValue(0);
                        }}
                        className={`border rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none ${
                          isLight ? 'bg-white border-zinc-200 text-zinc-750' : 'bg-[#2d2d2d] border-white/10 text-white'
                        }`}
                      >
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Cantidad Fija ($)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9.5px] uppercase font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {discountType === 'percentage' ? 'Porcentaje:' : 'Cantidad:'}
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-0.5 text-xs font-bold text-zinc-400">
                          {discountType === 'percentage' ? '%' : sym}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={discountType === 'percentage' ? 100 : undefined}
                          step="any"
                          value={discountValue || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setDiscountValue(val);
                          }}
                          className={`border rounded-lg px-2 pl-6 py-0.5 text-xs font-mono font-bold w-full focus:outline-none ${
                            isLight ? 'bg-white border-zinc-200 text-zinc-750 focus:border-blue-300' : 'bg-[#2d2d2d] border-white/10 text-white focus:border-blue-750'
                          }`}
                        />
                      </div>
                    </div>

                    {/* QUICK PERCENTAGE BUTTONS (Only if type is percentage) */}
                    {discountType === 'percentage' && (
                      <div className={`col-span-1 sm:col-span-2 flex items-center gap-2 pt-1 border-t border-dashed ${isLight ? 'border-zinc-200' : 'border-white/5'}`}>
                        <span className={`text-[9px] uppercase font-bold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Atajos:</span>
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className="px-2 py-0.5 text-[9.5px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 hover:text-purple-700 border border-purple-500/20 hover:border-purple-500/40 rounded transition-all cursor-pointer font-bold"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE FOR SALE NOTE */}
              <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-white/5 bg-[#2d2d2d]/30'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowNoteOption(!showNoteOption)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none ${
                    isLight ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{showNoteOption ? '[-] Ocultar Nota del Ticket' : '[+] Agregar Nota al Ticket de Venta'}</span>
                  <span className="text-xs">
                    {showNoteOption ? '▲' : '▼'}
                  </span>
                </button>

                {showNoteOption && (
                  <div className={`p-3.5 border-t space-y-2 ${
                    isLight ? 'border-zinc-200 bg-white' : 'border-white/5 bg-[#202020]'
                  }`}>
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Nota / Observación para el Ticket:</label>
                    <textarea
                      value={saleNote}
                      onChange={(e) => setSaleNote(e.target.value)}
                      placeholder="Ej. Se entrega revisado, con garantía de 30 días, etc."
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none ${
                        isLight ? 'bg-zinc-50 border-zinc-200 focus:border-blue-400 text-zinc-850 focus:bg-white' : 'bg-[#2d2d2d] border-white/10 focus:border-blue-750 text-white'
                      }`}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* ACCORDION/COLLAPSIBLE FOR SPECIAL OPTIONS */}
              <div className={`border rounded-xl overflow-hidden transition-all duration-350 ${
                isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-white/5 bg-[#2d2d2d]/30'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowSpecialOptions(!showSpecialOptions)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none ${
                    isLight ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{showSpecialOptions ? 'Ocultar Opciones de Cobro' : 'Opciones Especiales (Fiar / Apartar)'}</span>
                  <span className="text-xs">
                    {showSpecialOptions ? '▲' : '▼'}
                  </span>
                </button>

                {showSpecialOptions && (
                  <div className={`p-3.5 border-t flex flex-col sm:flex-row gap-2.5 ${
                    isLight ? 'border-zinc-200 bg-white' : 'border-white/5 bg-[#202020]'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setShowSpecialOptions(false); openFiarModal(); }}
                      title="Registrar esta venta como cuenta por cobrar / fiado [F6]"
                      className={`flex-1 py-2.5 border font-extrabold text-[10px] sm:text-xs rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isLight 
                          ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100/50' 
                          : 'bg-orange-950/10 border-orange-500/30 hover:border-orange-500 text-orange-400'
                      }`}
                    >
                      💳 Fiar Venta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const initialAmt = payCash + payCard;
                        setApartarInitialAmount(initialAmt > 0 ? initialAmt.toString() : '');
                        setApartarInitialMethod(payCard > 0 ? 'Tarjeta' : 'Efectivo');
                        setShowSpecialOptions(false);
                        setShowSaleConfirm(false);
                        setShowApartarModal(true);
                      }}
                      title="Apartar productos con pago inicial [F7]"
                      className={`flex-1 py-2.5 border font-extrabold text-[10px] sm:text-xs rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isLight 
                          ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/50' 
                          : 'bg-purple-950/10 border-purple-500/30 hover:border-purple-500 text-purple-400'
                      }`}
                    >
                      📦 Apartar Productos
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={`border-t p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#252525]/60 border-white/5'
            }`}>
              <div className="flex flex-wrap items-center gap-3.5 select-none hover:opacity-95 active:scale-98 transition-all">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="fluent-print-ticket" checked={posShouldPrintTicket} onChange={(e) => setPosShouldPrintTicket(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                  <label htmlFor="fluent-print-ticket" className="text-[10px] sm:text-xs font-black text-zinc-700 cursor-pointer uppercase tracking-normal">
                    Imprimir ticket <span className="text-emerald-600 font-mono">[F2]</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                <button type="button" onClick={() => setShowSaleConfirm(false)}
                  title="Cancelar y volver a la pantalla de venta"
                  className="flex-1 sm:flex-none uppercase px-2.5 sm:px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] sm:text-xs tracking-wider cursor-pointer rounded-xl transition-all active:scale-95 text-center">
                  Cancelar
                </button>

                {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                  <button
                    type="button"
                    onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : () => executeSale({ shareWA: true })}
                    disabled={(!isWaIntegratedOffline && (payCash + payCard < basketTotal))}
                    title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Cobrar venta sin imprimir papel y enviarlo por WhatsApp"}
                    className={`flex-1 sm:flex-none uppercase px-3.5 sm:px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center whitespace-nowrap ${
                      isWaIntegratedOffline 
                        ? 'bg-zinc-500 hover:bg-zinc-650 text-zinc-300 border border-zinc-600 grayscale cursor-pointer'
                        : 'bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold border border-[#25D366]/50 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Cobrar y WA
                  </button>
                )}

                <button type="button" onClick={executeSale} disabled={payCash + payCard < basketTotal}
                  title="Confirmar pago y finalizar venta [F5]"
                  className="flex-1 sm:flex-none uppercase px-3.5 sm:px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs tracking-wider cursor-pointer rounded-xl shadow-md flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-center whitespace-nowrap">
                  Cobrar [F5]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiar */}
      {showFiarModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowFiarModal(false); setActiveSearchField(null); }}>
          <div className="w-full max-w-sm mx-4 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden" onClick={e => { e.stopPropagation(); setActiveSearchField(null); }}>
            <div className="bg-[#1a3a6b] px-4 py-3 flex items-center justify-between">
              <span className="font-black text-sm uppercase tracking-widest text-white">💳 Registrar Fiado</span>
              <button onClick={() => { setShowFiarModal(false); setActiveSearchField(null); }} className="text-white/70 hover:text-white font-black text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {fiarExistingAccount ? (
                /* Cuenta Existente Detectada: Resumen Claro */
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Confirmar Cargo en Cuenta Existente</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-600">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Cliente:</span>
                      <span className="font-extrabold text-zinc-900">{fiarExistingAccount.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Teléfono:</span>
                      <span className="font-bold text-zinc-900">{fiarExistingAccount.clientPhone}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-150 pt-1.5">
                      <span className="text-zinc-400">Saldo Anterior:</span>
                      <span className="font-bold text-zinc-900">{config.currencySymbol || '$'}{fiarExistingAccount.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Nuevo Cargo:</span>
                      <span className="font-extrabold text-orange-600">+{config.currencySymbol || '$'}{(basketTotal - (Number(fiarInitialPayment) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {fiarInitialPayment && Number(fiarInitialPayment) > 0 && (
                      <div className="flex justify-between text-[11px] text-[#2e7d32]">
                        <span>Anticipo ({fiarInitialMethod}):</span>
                        <span>-{config.currencySymbol || '$'}{Number(fiarInitialPayment).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {/* Detalle del Cargo */}
                    <div className="border-t border-zinc-150 pt-1.5 space-y-1">
                      <span className="text-[9px] font-black uppercase text-zinc-400 block">Detalle del cargo:</span>
                      <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1 text-[10px] text-zinc-500 font-medium">
                        {basket.map((bi, index) => {
                          const price = bi.customPrice ?? bi.item.price;
                          return (
                            <div key={index} className="flex justify-between">
                              <span>{bi.quantity}x {bi.item.name}</span>
                              <span>{config.currencySymbol || '$'}{(price * bi.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-zinc-150 pt-1.5 text-sm font-black">
                      <span className="text-zinc-550">Nuevo Saldo Total:</span>
                      <span className="text-zinc-900">{config.currencySymbol || '$'}{(fiarExistingAccount.balance + basketTotal - (Number(fiarInitialPayment) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Crear Nuevo Fiado: Inputs normal */
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del Cliente *</label>
                      <div className="relative">
                        <input value={fiarClientName} onChange={e => setFiarClientName(e.target.value)}
                          placeholder="Nombre Completo"
                          className="w-full mt-1 bg-white border border-zinc-300 text-zinc-900 px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:text-zinc-400"
                          onFocus={() => setActiveSearchField('name')} />
                        {activeSearchField === 'name' && fiarNameSuggestions.length > 0 && (
                          <div className="absolute top-[48px] left-0 right-0 z-[10000] bg-white border border-zinc-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {fiarNameSuggestions.map(acc => {
                              const debt = acc.entries.reduce((s, e) => s + e.subtotal, 0);
                              const paid = acc.payments.reduce((s, p) => s + p.amount, 0);
                              const balance = Math.max(0, debt - paid);
                              return (
                                <div key={acc.id}
                                  onClick={() => selectExistingCreditAccount(acc)}
                                  className="px-3 py-2 hover:bg-zinc-50 cursor-pointer border-b last:border-0 border-zinc-100 flex justify-between items-center text-zinc-900"
                                >
                                  <div>
                                    <div className="text-xs font-bold">{acc.clientName}</div>
                                    <div className="text-[9px] text-zinc-500">{acc.clientPhone}</div>
                                  </div>
                                  <div className="text-[10px] font-black text-amber-700">
                                    Saldo: {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                      <div className="relative">
                        <div className="flex mt-1 border border-zinc-300 rounded-lg overflow-hidden focus-within:border-orange-500 bg-white">
                          <select
                            value={fiarCountryCode}
                            onChange={e => setFiarCountryCode(e.target.value)}
                            className="bg-zinc-50 border-r border-zinc-300 px-2 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer appearance-none"
                          >
                            <option value="+52">🇲🇽 +52</option>
                            <option value="+1">🇺🇸 +1</option>
                          </select>
                          <input value={fiarClientPhone}
                            onChange={e => setFiarClientPhone(formatPhoneNumber(e.target.value))}
                            placeholder="(351) 000-0000"
                            className="w-full bg-white border-none text-zinc-900 px-3 py-2 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-400"
                            onFocus={() => setActiveSearchField('phone')}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-limit-fluent')?.focus(); } }} />
                        </div>
                        {activeSearchField === 'phone' && fiarPhoneSuggestions.length > 0 && (
                          <div className="absolute top-[48px] left-0 right-0 z-[10000] bg-white border border-zinc-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {fiarPhoneSuggestions.map(acc => {
                              const debt = acc.entries.reduce((s, e) => s + e.subtotal, 0);
                              const paid = acc.payments.reduce((s, p) => s + p.amount, 0);
                              const balance = Math.max(0, debt - paid);
                              return (
                                <div key={acc.id}
                                  onClick={() => selectExistingCreditAccount(acc)}
                                  className="px-3 py-2 hover:bg-zinc-50 cursor-pointer border-b last:border-0 border-zinc-100 flex justify-between items-center text-zinc-900"
                                >
                                  <div>
                                    <div className="text-xs font-bold">{acc.clientName}</div>
                                    <div className="text-[9px] text-zinc-500">{acc.clientPhone}</div>
                                  </div>
                                  <div className="text-[10px] font-black text-amber-700">
                                    Saldo: {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={fiarHasLimit}
                        onChange={e => {
                          setFiarHasLimit(e.target.checked);
                          if (!e.target.checked) setFiarCreditLimit('');
                        }}
                        className="w-4 h-4 cursor-pointer shrink-0"
                      />
                      <span>¿Establecerle límite de crédito?</span>
                    </label>
                    {fiarHasLimit && (
                      <input id="fiar-limit-fluent" value={fiarCreditLimit} onChange={e => setFiarCreditLimit(e.target.value)}
                        placeholder={`Ej: ${config.defaultCreditLimit ?? 1000}`}
                        type="number"
                        min="1"
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:text-zinc-400 animate-fadeIn"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-anticipo-fluent')?.focus(); } }} />
                    )}
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Anticipo / Abono Inicial ($)</label>
                  <input id="fiar-anticipo-fluent" value={fiarInitialPayment} onChange={e => setFiarInitialPayment(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    className="w-full mt-1 bg-white border border-zinc-300 text-zinc-900 px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Método de Anticipo</label>
                  <select value={fiarInitialMethod} onChange={e => setFiarInitialMethod(e.target.value as any)}
                    className="w-full mt-1 bg-white border border-zinc-300 text-zinc-900 px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta / Transf</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200">
                <div 
                  onClick={toggleFiarPrint}
                  className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    id="fiar-check-print-fluent"
                    checked={fiarPrint}
                    onChange={toggleFiarPrint}
                    className="w-4.5 h-4.5 accent-blue-600 bg-white border border-zinc-350 rounded shrink-0 pointer-events-none"
                  />
                  <label htmlFor="fiar-check-print-fluent" className="text-[10px] font-black text-zinc-500 uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                    <Printer className="w-3.5 h-3.5 text-zinc-400" /> Imprimir ticket
                  </label>
                </div>

                {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                  <div 
                    title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                    onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : toggleFiarWhatsapp}
                    className={`flex items-center gap-2 select-none transition-all cursor-pointer ${
                      isWaIntegratedOffline 
                        ? 'opacity-40 grayscale' 
                        : 'hover:opacity-95 active:scale-98'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      id="fiar-check-whatsapp-fluent"
                      checked={!isWaIntegratedOffline && fiarWhatsapp}
                      disabled={isWaIntegratedOffline}
                      onChange={toggleFiarWhatsapp}
                      className="w-4.5 h-4.5 accent-blue-600 bg-white border border-zinc-355 rounded shrink-0"
                    />
                    <label htmlFor="fiar-check-whatsapp-fluent" className="text-[10px] font-black text-zinc-500 uppercase tracking-normal select-none flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Enviar por WhatsApp
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {fiarExistingAccount ? (
                  <>
                    <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })} disabled={fiarHasLimit && !fiarCreditLimit.trim()}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase rounded-xl cursor-pointer transition-all">
                      Confirmar y Agregar Cargo ({fiarExistingAccount.clientName})
                    </button>
                    <button onClick={() => { setShowFiarModal(false); setFiarExistingAccount(null); }}
                      className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-650 font-black text-xs uppercase rounded-xl cursor-pointer transition-all">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })} disabled={!fiarClientName.trim() || !fiarClientPhone.trim() || (fiarHasLimit && !fiarCreditLimit.trim())}
                      title="Confirmar y registrar el fiado para el cliente"
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Confirmar fiado
                    </button>
                    <button onClick={() => { setShowFiarModal(false); setFiarExistingAccount(null); }}
                      title="Cancelar y volver a la pantalla de cobro"
                      className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-650 font-black text-xs uppercase rounded-xl cursor-pointer transition-all">
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Apartar */}
      {showApartarModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowApartarModal(false)}>
          <div className="w-full max-w-sm mx-4 bg-white border border-zinc-200 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1a3a6b] px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <span className="font-black text-sm uppercase tracking-widest text-white">📦 Apartar Productos</span>
              <button onClick={() => setShowApartarModal(false)} className="text-white/70 hover:text-white font-black text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs font-bold text-zinc-500 mb-1">Total: <span className="font-black text-zinc-800">{config.currencySymbol || '$'}{basket.reduce((s,b) => s + (b.customPrice ?? b.item.price) * b.quantity, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del cliente *</label>
                <input autoFocus value={apartarClientName} onChange={e => handleCaretPreservingChange(e, setApartarClientName, val => val.toUpperCase())}
                  placeholder="NOMBRE COMPLETO..."
                  className="w-full mt-1 bg-zinc-50 border border-zinc-300 text-zinc-800 px-3 py-1.5 text-sm font-bold uppercase rounded-xl outline-none focus:border-purple-500 placeholder:font-normal placeholder:normal-case placeholder:text-zinc-400" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                <div className="flex mt-1 bg-zinc-50 border border-zinc-300 rounded-xl overflow-hidden focus-within:border-purple-500">
                  <select
                    value={apartarCountryCode}
                    onChange={e => setApartarCountryCode(e.target.value)}
                    className="bg-zinc-100 border-r border-zinc-200 text-zinc-800 px-2 text-xs font-bold focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input value={apartarClientPhone} onChange={e => setApartarClientPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(351) 000-0000"
                    className="w-full bg-transparent border-none text-zinc-800 px-3 py-1.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Anticipo inicial *</label>
                  <input type="number" min="0" value={apartarInitialAmount} onChange={e => setApartarInitialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 bg-zinc-50 border border-zinc-300 text-zinc-800 px-3 py-1.5 text-sm font-bold rounded-xl outline-none focus:border-purple-500 placeholder:font-normal placeholder:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Método</label>
                  <select value={apartarInitialMethod} onChange={e => setApartarInitialMethod(e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia')}
                    className="w-full mt-1 bg-zinc-50 border border-zinc-300 text-zinc-800 px-2 py-1.5 text-sm font-bold rounded-xl outline-none focus:border-purple-500">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Fecha límite *</label>
                <input type="date" value={apartarDueDate} onChange={e => setApartarDueDate(e.target.value)}
                  className="w-full mt-1 bg-zinc-50 border border-zinc-300 text-zinc-800 px-3 py-1.5 text-sm font-bold rounded-xl outline-none focus:border-purple-500" />
              </div>
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-150">
                <div 
                  onClick={toggleApartarPrint}
                  className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    id="apartar-check-print-fluent"
                    checked={apartarPrint}
                    onChange={toggleApartarPrint}
                    className="w-4 h-4 accent-emerald-600 shrink-0 pointer-events-none"
                  />
                  <label htmlFor="apartar-check-print-fluent" className="text-[10px] font-black text-zinc-700 uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                    <Printer className="w-3.5 h-3.5 text-zinc-500" /> Imprimir ticket
                  </label>
                </div>

                {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                  <div 
                    title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                    onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : toggleApartarWhatsapp}
                    className={`flex items-center gap-2 select-none transition-all cursor-pointer ${
                      isWaIntegratedOffline 
                        ? 'opacity-40 grayscale' 
                        : 'hover:opacity-95 active:scale-98'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      id="apartar-check-whatsapp-fluent"
                      checked={!isWaIntegratedOffline && apartarWhatsapp}
                      disabled={isWaIntegratedOffline}
                      onChange={toggleApartarWhatsapp}
                      className="w-4 h-4 accent-emerald-600 shrink-0 pointer-events-none"
                    />
                    <label htmlFor="apartar-check-whatsapp-fluent" className="text-[10px] font-black text-zinc-700 uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500" /> Enviar por WhatsApp
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleConfirmApartar({ printTicket: apartarPrint, sendWhatsApp: apartarWhatsapp })} disabled={!apartarClientName.trim()}
                  className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-black text-xs uppercase rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Confirmar Apartado
                </button>
                <button onClick={() => setShowApartarModal(false)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black text-xs uppercase rounded-xl cursor-pointer transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Cambio a devolver ──────────────────────────────────────────────── */}
      {changeAmount !== null && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-emerald-200 w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-full border border-emerald-200">
                <Coins className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-base font-black text-zinc-800 uppercase tracking-wider">Cambio a Entregar</h3>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
              <span className="text-4xl font-mono font-black text-emerald-600 block">{sym}{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button type="button" onClick={() => setChangeAmount(null)} autoFocus
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer">
              Listo ({countdown}s)
            </button>
          </div>
        </div>
      )}

      {/* ── Cancelar venta ─────────────────────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white border border-rose-200 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100"><Trash2 className="w-5 h-5 text-rose-500" /></div>
              <div>
                <h3 className="text-sm font-black text-zinc-800 uppercase">¿Cancelar transacción?</h3>
                <p className="text-[11px] text-zinc-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">Se eliminarán <strong>{basketTotalItems}</strong> artículos del carrito.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowCancelConfirm(false)} className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs uppercase cursor-pointer">No, mantener</button>
              <button type="button" onClick={() => { logic.setBasket([]); setShowCancelConfirm(false); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer">Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Guardar venta ──────────────────────────────────────────────────── */}
      {showSaveSaleModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <form onSubmit={(e) => { e.preventDefault(); confirmSaveSaleForLater(saveSaleLabel); }} className="bg-white border border-zinc-200 w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-100"><FolderHeart className="w-5 h-5 text-blue-500" /></div>
              <div><h3 className="text-sm font-black text-zinc-800 uppercase">Guardar para después</h3><p className="text-[11px] text-zinc-400">Retener venta activa</p></div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Identificador / Cliente</label>
              <input type="text" autoFocus className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 focus:outline-none rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-800" placeholder="Nombre, mesa o referencia..."
                value={saveSaleLabel} onChange={(e) => setSaveSaleLabel(e.target.value)} onFocus={(e) => e.target.select()} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowSaveSaleModal(false)} className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs uppercase cursor-pointer">Cerrar</button>
              <button type="submit" className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Ventas en espera ───────────────────────────────────────────────── */}
      {showSavedSalesListModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center gap-3 p-4 border-b border-zinc-100 shrink-0">
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-100"><Archive className="w-5 h-5 text-amber-500" /></div>
              <div className="flex-1"><h3 className="text-sm font-black text-zinc-800 uppercase">Ventas en Espera ({savedSales.length})</h3><p className="text-[11px] text-zinc-400">Seleccione una para reanudar</p></div>
              <button type="button" onClick={() => setShowSavedSalesListModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {savedSales.length === 0 ? (
                <div className="py-12 text-center text-zinc-400"><span className="text-3xl block mb-2">📂</span><p className="text-xs font-bold uppercase">No hay ventas retenidas.</p></div>
              ) : (
                <div className="border border-zinc-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-extrabold uppercase text-[10px]">
                      <th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3 text-center">Art.</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center">Acción</th>
                    </tr></thead>
                    <tbody className="divide-y divide-zinc-50">
                      {savedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3 font-extrabold text-zinc-800 uppercase">{sale.label}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-zinc-400">{new Date(sale.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="px-4 py-3 text-center font-mono text-zinc-600">{sale.items.reduce((s, i) => s + i.quantity, 0)}</td>
                          <td className="px-4 py-3 text-right font-mono font-black text-blue-600">{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button type="button" onClick={() => handleLoadSavedSale(sale.id)} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase cursor-pointer">Recuperar</button>
                              <button type="button" onClick={() => setSaleToDelete(sale.id)} className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase cursor-pointer">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-100 flex justify-end">
              <button type="button" onClick={() => setShowSavedSalesListModal(false)} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer">Cerrar [Esc]</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación eliminar venta guardada ────────────────────────────── */}
      {saleToDelete !== null && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div className="bg-white border border-rose-100 w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="p-2 bg-rose-50 rounded-xl"><Trash2 className="w-5 h-5 text-rose-500" /></div>
              <div><h3 className="text-sm font-black text-zinc-800 uppercase">Eliminar venta guardada</h3><p className="text-[11px] text-zinc-400">Esta acción es permanente</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => logic.setSaleToDelete(null)} className="py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs uppercase cursor-pointer">Cancelar</button>
              <button type="button" onClick={() => { setSavedSales(savedSales.filter((s) => s.id !== saleToDelete)); logic.setSaleToDelete(null); }} className="py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflicto de carrito ───────────────────────────────────────────── */}
      {pendingLoadSaleId !== null && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div className="bg-white border border-amber-100 w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="p-2 bg-amber-50 rounded-xl"><Archive className="w-5 h-5 text-amber-500" /></div>
              <div><h3 className="text-sm font-black text-zinc-800 uppercase">Conflicto de carrito</h3><p className="text-[11px] text-zinc-400">El carrito actual no está vacío</p></div>
            </div>
            <p className="text-xs text-zinc-650">¿Combinar o reemplazar los artículos actuales con los de la venta guardada?</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleConfirmLoadCombine} className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer">Combinar artículos</button>
              <button type="button" onClick={handleConfirmLoadOverwrite} className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs uppercase cursor-pointer">Reemplazar carrito</button>
              <button type="button" onClick={handleCancelLoadConflict} className="py-2.5 bg-white hover:bg-zinc-50 text-zinc-500 font-bold border border-zinc-200 rounded-xl text-xs uppercase cursor-pointer">No hacer nada</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Venta Rápida Modal ─────────────────────────────────────────────── */}
      {isFastSaleModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn" onClick={cancelAndCleanupFastSale}>
          <div className="bg-white border border-zinc-200 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /><h3 className="text-sm font-extrabold text-zinc-800 uppercase">Registrar Venta Rápida</h3></div>
              <button type="button" onClick={cancelAndCleanupFastSale} className="text-zinc-400 hover:text-zinc-650 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nombre del Artículo</label>
                <input type="text" ref={fastSaleModalNameInputRef} className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 focus:outline-none rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-800" placeholder="Ej: Cable USB Tipo C"
                  value={fastSaleName} onChange={(e) => handleCaretPreservingChange(e, setFastSaleName, val => val.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fastSaleModalPriceInputRef.current?.focus();
                    } else if (e.key === 'Escape') {
                      cancelAndCleanupFastSale();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Precio de Venta ({sym})</label>
                <div className="flex border border-zinc-200 bg-zinc-50 rounded-xl overflow-hidden focus-within:border-blue-400">
                  <span className="flex items-center px-3 text-zinc-400 font-mono text-sm font-black border-r border-zinc-200 bg-zinc-100 select-none pointer-events-none">{sym}</span>
                  <input type="text" ref={fastSaleModalPriceInputRef} className="flex-1 bg-transparent px-3 py-2.5 font-mono font-black text-sm text-zinc-800 focus:outline-none" placeholder="0.00" value={fastSalePrice}
                    onChange={(e) => setFastSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addFastSaleItem(); }
                      else if (e.key === 'Escape') { cancelAndCleanupFastSale(); }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all pt-1">
                <input
                  type="checkbox"
                  id="save-to-inventory-fluent"
                  checked={saveToInventory}
                  onChange={(e) => setSaveToInventory(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 bg-white border border-zinc-300 rounded cursor-pointer shrink-0"
                />
                <label htmlFor="save-to-inventory-fluent" className="text-[10px] font-black text-zinc-650 cursor-pointer uppercase select-none">
                  Agregar al catálogo de inventario
                </label>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button type="button" onClick={cancelAndCleanupFastSale} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs uppercase cursor-pointer">Cancelar</button>
              <button type="button" onClick={addFastSaleItem} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer">Añadir artículo</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Búsqueda de Artículos ─────────────────────────────────── */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn" onClick={cancelAndCleanupSearchModal}>
          <div className="bg-white border border-zinc-200 w-full max-w-4xl rounded-2xl shadow-2xl p-7 space-y-5 text-zinc-800 animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <Search className="w-5.5 h-5.5 text-blue-500" />
                <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wide">Resultados de Búsqueda</h3>
              </div>
              <button type="button" onClick={cancelAndCleanupSearchModal} className="text-zinc-400 hover:text-zinc-650 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {/* Buscador y Categorías dentro del Modal */}
            <div className="space-y-3 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-150 shrink-0 text-zinc-800">
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nombre, código SKU o categoría..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setModalCurrentPage(1);
                    setModalSelectedIndex(0);
                  }}
                  className="w-full pl-10 pr-9 py-2 bg-white border border-zinc-250 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500/50 font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setModalCurrentPage(1);
                      setModalSelectedIndex(0);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Categorías (Pills) */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1 select-none">
                <button
                  type="button"
                  onClick={() => setModalCategoryFilter('TODAS')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                    modalCategoryFilter === 'TODAS'
                      ? 'bg-blue-600 text-white font-black shadow-md'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  🌟 TODAS ({modalActiveInventory.length})
                </button>
                {modalCategoriesList.map(cat => {
                  const count = modalActiveInventory.filter(p => (p.category || '').trim().toUpperCase() === cat).length;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setModalCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                        modalCategoryFilter === cat
                          ? 'bg-blue-600 text-white font-black shadow-md'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {paginatedModalItems.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 font-medium leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  Se encontraron <span className="font-extrabold text-blue-600">{matchedProductsForModal.length}</span> coincidencias. Navegue con las teclas <span className="font-extrabold bg-zinc-150 px-1.5 py-0.5 rounded border border-zinc-250">↑ ↓</span> y confirme con <span className="font-extrabold bg-zinc-150 px-1.5 py-0.5 rounded border border-zinc-250 font-mono">Enter</span> o clic.
                </p>
                <div id="pos-modal-table-container" className="border border-zinc-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto shadow-inner bg-zinc-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-2">Código</th><th className="px-4 py-2">Nombre / Categoría</th><th className="px-4 py-2 text-right">Precio</th><th className="px-4 py-2 text-center">Existencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedModalItems.map((product, idx) => {
                        const isSelected = idx === modalSelectedIndex;
                        const isStockControlled = product.manageStock !== false;
                        const currentStock = getItemStock(product);

                        const secondaryLocations: { name: string; qty: number }[] = [];
                        if (isStockControlled) {
                          if (selectedSaleWarehouseId && selectedSaleWarehouseId !== 'all' && selectedSaleWarehouseId !== 'local') {
                            if (product.stock > 0) {
                              secondaryLocations.push({ name: 'Tienda Local', qty: product.stock });
                            }
                            Object.entries(product.warehouseStock || {}).forEach(([whId, qty]) => {
                              if (whId !== selectedSaleWarehouseId && (qty as number) > 0) {
                                const whName = warehouses.find(w => w.id === whId)?.name || 'Bodega';
                                secondaryLocations.push({ name: whName, qty: qty as number });
                              }
                            });
                          } else {
                            Object.entries(product.warehouseStock || {}).forEach(([whId, qty]) => { 
                              if ((qty as number) > 0) {
                                const whName = warehouses.find(w => w.id === whId)?.name || 'Bodega';
                                secondaryLocations.push({ name: whName, qty: qty as number });
                              }
                            });
                          }
                        }

                        return (
                          <tr key={product.id} onClick={() => { addToBasket(product); setIsSearchModalOpen(false); }} className={`cursor-pointer border-b border-zinc-100 ${isSelected ? 'pos-modal-row-selected font-semibold bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-zinc-50'}`}>
                            <td className={`px-4 py-1.5 font-mono text-[10px] ${isSelected ? 'text-blue-900 font-extrabold' : 'text-zinc-500'}`}>{product.code || 'S/C'}</td>
                            <td className="px-4 py-1.5">
                              <div className="flex items-center gap-2.5">
                                <PosItemThumbnail imageUrl={product.imageUrl} name={product.name} code={product.code} category={product.category} price={product.price} currencySymbol={sym} size={32} />
                                <div className="flex-1 min-w-0">
                                  <span className={`block font-black uppercase text-[11.5px] truncate ${isSelected ? 'text-blue-950 font-bold' : 'text-zinc-800'}`}>{product.name}</span>
                                  <span className={`inline-block text-[9px] font-bold uppercase px-1.5 rounded ${isSelected ? 'bg-blue-100 text-blue-900' : 'bg-zinc-100 text-zinc-500'}`}>{product.category}</span>
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-1.5 text-right font-mono font-black ${isSelected ? 'text-blue-900' : 'text-zinc-900'}`}>{sym}{product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-1.5 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  isSelected
                                    ? 'bg-blue-100 text-blue-900'
                                    : !isStockControlled ? 'bg-indigo-50 text-indigo-655' : currentStock > 5 ? 'bg-emerald-50 text-emerald-800' : 'bg-[#dfdfdf] text-zinc-700'
                                }`}>
                                  {!isStockControlled ? '∞' : `${currentStock} disp`}
                                </span>
                                {secondaryLocations.map((loc, i) => (
                                  <span key={i} className={`text-[8.5px] font-black mt-0.5 leading-none ${
                                    isSelected ? 'text-blue-750' : 'text-amber-600'
                                  }`}>
                                    +{loc.qty} en {loc.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-between items-center border-t border-zinc-150 pt-3.5 text-[10.5px] text-zinc-500">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-400">
                    <span>[Esc] Cerrar</span>
                    <span>•</span>
                    <span>Sel: <b className="text-blue-600">#{modalSelectedIndex + 1 + (modalCurrentPage - 1) * 25} de {matchedProductsForModal.length}</b></span>
                  </div>
                  {modalTotalPages > 1 && (
                    <div className="flex items-center gap-2 select-none">
                      <button type="button" disabled={modalCurrentPage === 1} onClick={() => { setModalCurrentPage((p) => Math.max(1, p - 1)); setModalSelectedIndex(0); }} className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-655 disabled:opacity-30 disabled:hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer">◀ Ant</button>
                      <span className="font-bold font-mono text-zinc-700">Pág {modalCurrentPage}/{modalTotalPages}</span>
                      <button type="button" disabled={modalCurrentPage === modalTotalPages} onClick={() => { setModalCurrentPage((p) => Math.min(modalTotalPages, p + 1)); setModalSelectedIndex(0); }} className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-655 disabled:opacity-30 disabled:hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer">Sig ▶</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* VENTA RAPIDA IF NO MATCHES */
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="font-extrabold uppercase text-[10px] tracking-wider text-amber-900">Sin existencias en catálogo</h5>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      No se encontraron productos coincidentes. Registre este artículo rápidamente para ingresarlo a la venta actual.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-1 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nombre del Artículo</label>
                    <input
                      type="text"
                      ref={modalFastSaleNameInputRef}
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-800 placeholder:text-zinc-400 font-bold focus:outline-none"
                      placeholder="Ej: Mica de Privacidad Premium"
                      value={fastSaleName}
                      onChange={(e) => handleCaretPreservingChange(e, setFastSaleName, val => val.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          modalFastSalePriceInputRef.current?.focus();
                          setTimeout(() => {
                            modalFastSalePriceInputRef.current?.select();
                          }, 10);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Precio de Venta ({sym})</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 text-sm font-bold font-mono">
                        {sym}
                      </span>
                      <input
                        type="text"
                        ref={modalFastSalePriceInputRef}
                        className="w-full bg-white border border-zinc-300 rounded pl-8 pr-3 py-2 text-zinc-800 font-mono font-bold placeholder:text-zinc-400 text-sm focus:outline-none"
                        placeholder="0.00"
                        value={fastSalePrice}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                          setFastSalePrice(cleanVal);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleModalAddFastSaleItem();
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={cancelAndCleanupSearchModal}
                    className="flex-1 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded border border-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Retroceder / Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleModalAddFastSaleItem}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded border border-blue-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    Crear y Añadir <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PIN de administrador ───────────────────────────────────────────── */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fadeIn">
          <div className="bg-white border border-blue-100 w-full max-w-sm rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-100"><Lock className="w-5 h-5 text-blue-600" /></div>
              <div><h3 className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">Acceso Restringido</h3><p className="text-[11px] text-zinc-400">PIN de administrador requerido</p></div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">PIN (4 dígitos)</label>
              <input type="password" inputMode="numeric" maxLength={4} value={adminAuthPin}
                onChange={(e) => { logic.setAdminAuthPin(e.target.value.replace(/\D/g, '').slice(0, 4)); logic.setAdminAuthError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdminAuthSubmit(); if (e.key === 'Escape') { logic.setShowAdminAuthModal(false); logic.setPendingEditItemId(null); } }}
                placeholder="••••" className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-center text-xl font-mono font-black tracking-[0.5em] focus:outline-none" autoFocus />
              {adminAuthError && <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> {adminAuthError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => { logic.setShowAdminAuthModal(false); logic.setPendingEditItemId(null); }} className="py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs uppercase cursor-pointer active:scale-95">Cancelar</button>
              <button type="button" onClick={handleAdminAuthSubmit} disabled={adminAuthPin.length < 4} className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" /> Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

      {posToast && createPortal(
        <div 
          className={`fixed top-4 right-4 z-[100000] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg animate-fadeIn select-none max-w-sm ${
            posToast.type === 'success' ? 'border-emerald-200 text-emerald-700 shadow-emerald-100'
            : posToast.type === 'error' ? 'border-rose-200 text-rose-700 shadow-rose-100'
            : posToast.type === 'warning' ? 'border-amber-200 text-amber-700 shadow-amber-100'
            : 'border-zinc-200 text-zinc-700'
          }`}
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
        >
          {posToast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
          {posToast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
          {posToast.type === 'warning' && <Info className="w-5 h-5 text-amber-500 shrink-0" />}
          {posToast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
          <span className="text-xs font-bold">{posToast.message}</span>
        </div>,
        document.body
      )}

      {showRepairSelectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowRepairSelectionModal(false)}>
          <div className="bg-white border border-zinc-200 w-full max-w-2xl rounded-2xl shadow-xl p-6 relative text-zinc-800 animate-scaleUp" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowRepairSelectionModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer select-none"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
              <div className="p-2 bg-violet-50 rounded-xl border border-violet-100">
                <Wrench className="w-5 h-5 text-violet-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-violet-800 uppercase tracking-wide">
                  🔧 SELECCIONAR ORDEN DE SERVICIO (F3)
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Liquidación de reparaciones en POS</p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed select-none font-sans">
              Busca y selecciona una reparación terminada (Listo o Fallido) para agregar su saldo de liquidación al carrito de POS actual.
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={repairSearchQuery}
                onChange={(e) => setRepairSearchQuery(e.target.value)}
                placeholder="Buscar por ID de ticket, nombre de cliente, teléfono, marca o modelo..."
                className="w-full bg-zinc-50 border border-zinc-300 focus:border-violet-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm placeholder:text-zinc-400 text-zinc-800 outline-none"
                autoFocus
              />
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto max-h-[300px] border border-zinc-200 rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200">
                    <th className="px-4 py-2.5">Ticket</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Equipo</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Saldo</th>
                    <th className="px-4 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {(() => {
                    const filtered = orders.filter(o => {
                      const isReady = o.status === 'Listo' || o.status === 'Fallido';
                      if (!isReady) return false;
                      const q = repairSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        o.id.toLowerCase().includes(q) ||
                        o.customerName.toLowerCase().includes(q) ||
                        o.customerPhone.toLowerCase().includes(q) ||
                        (o.deviceBrand || '').toLowerCase().includes(q) ||
                        (o.deviceModel || '').toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic select-none bg-zinc-50/30">
                            No hay órdenes listas para entrega o devolución que coincidan con la búsqueda.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(o => {
                      const adv = getIndividualAdvance(o, orders);
                      const balance = Math.max(0, o.cost - adv);
                      const statusColor = o.status === 'Listo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr key={o.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-violet-700">{o.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-zinc-800">{o.customerName}</div>
                            <div className="text-[10px] text-zinc-400 font-medium">{formatPhoneNumber(o.customerPhone)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-zinc-700">{o.deviceBrand} {o.deviceModel}</div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[150px]" title={o.serviceType}>{o.serviceType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                            {sym}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => addRepairOrderToBasket(o)}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold rounded-lg cursor-pointer transition-all select-none text-[11px] uppercase tracking-wide border-b-2 border-violet-800"
                            >
                              + Carrito
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLUENT DE NÚMERO DE WHATSAPP (ESTILO WINDOWS 11) */}
      {showPosWhatsappModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] animate-fadeIn no-blur-backdrop">
          <div className="bg-white border border-zinc-200 max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-zinc-800 animate-scaleUp">
            <button
              type="button"
              onClick={() => {
                setPosShouldSendWhatsApp(false);
                setShowPosWhatsappModal(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer select-none"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-zinc-150 pb-3">
              <span className="text-xl">💬</span>
              <h3 className="text-sm font-sans font-black text-blue-600 uppercase tracking-wider select-none">
                Enviar ticket por WhatsApp
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed select-none">
                El ticket de venta se generará en formato digital (tipo ticket impreso) y se copiará automáticamente al portapapeles. Al hacer clic en <strong>Cobrar y Enviar</strong>, se completará la venta y se abrirá WhatsApp.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-450 font-extrabold uppercase tracking-wide block select-none">Número de WhatsApp (Celular)</label>
                <input
                  type="text"
                  value={posWhatsappPhone}
                  onChange={(e) => setPosWhatsappPhone(e.target.value)}
                  placeholder="Ej. 10 dígitos (ej. 5512345678)..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-550 focus:outline-none placeholder:text-zinc-450 font-mono text-zinc-800 font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!posWhatsappPhone.trim()) {
                        alert('Por favor ingresa un número de WhatsApp válido.');
                        return;
                      }
                      executeSale({ shareWA: true });
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => {
                    setPosShouldSendWhatsApp(false);
                    setShowPosWhatsappModal(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer select-none uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowPosWhatsappModal(false)}
                  className="px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-750 transition-colors cursor-pointer select-none uppercase"
                >
                  Listo / Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!posWhatsappPhone.trim()) {
                      alert('Por favor ingresa un número de WhatsApp válido.');
                      return;
                    }
                    executeSale({ shareWA: true });
                  }}
                  className="px-5 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-750 rounded-xl cursor-pointer transition-all border border-blue-700 uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Cobrar y Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLUENT DE NÚMERO DE WHATSAPP PARA COTIZACIÓN EXPRESS (ESTILO WINDOWS 11) */}
      {showQuoteWhatsappModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] animate-fadeIn no-blur-backdrop">
          <div className={`border max-w-md w-full rounded-2xl shadow-2xl p-6 relative animate-scaleUp ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
          }`}>
            <button
              type="button"
              onClick={() => setShowQuoteWhatsappModal(false)}
              className="absolute top-4 right-4 text-zinc-450 hover:text-zinc-850 transition-colors cursor-pointer select-none"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-2 mb-4 border-b pb-3 ${isLight ? 'border-zinc-150' : 'border-white/10'}`}>
              <span className="text-xl">💬</span>
              <h3 className="text-sm font-sans font-black text-amber-600 uppercase tracking-wider select-none">
                Cotizar Carrito por WhatsApp
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed select-none">
                Se generará una imagen digital de la cotización y se enviará por WhatsApp al cliente seleccionado.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-455 font-extrabold uppercase tracking-wide block select-none">Nombre del Cliente (Opcional)</label>
                <div className={`flex border rounded-xl overflow-hidden ${
                  isLight ? 'bg-zinc-55 border-zinc-200 focus-within:border-amber-500' : 'bg-[#1b1b1b] border-white/10 focus-within:border-amber-500'
                }`}>
                  <input
                    type="text"
                    value={quoteClientName}
                    onChange={(e) => setQuoteClientName(e.target.value)}
                    placeholder="Nombre del cliente..."
                    className={`w-full bg-transparent border-none px-3.5 py-2.5 text-sm font-bold outline-none ${
                      isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-500'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-455 font-extrabold uppercase tracking-wide block select-none">Número de WhatsApp (Celular)</label>
                <div className={`flex border rounded-xl overflow-hidden ${
                  isLight ? 'bg-zinc-55 border-zinc-200 focus-within:border-amber-500' : 'bg-[#1b1b1b] border-white/10 focus-within:border-amber-500'
                }`}>
                  <select
                    value={quoteCountryCode}
                    onChange={e => setQuoteCountryCode(e.target.value)}
                    className={`border-r px-2 text-xs font-bold focus:outline-none cursor-pointer appearance-none ${
                      isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-[#2d2d2d] border-white/10 text-white'
                    }`}
                  >
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input
                    type="text"
                    value={quoteWhatsappPhone}
                    onChange={(e) => setQuoteWhatsappPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(351) 000-0000"
                    className={`w-full bg-transparent border-none px-3.5 py-2.5 text-sm font-bold outline-none text-right ${
                      isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-500'
                    }`}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!quoteWhatsappPhone.trim()) {
                          alert('Por favor ingresa un número de WhatsApp válido.');
                          return;
                        }
                        const res = await sendPosQuoteByWhatsapp(
                          quoteWhatsappPhone,
                          quoteClientName,
                          basket,
                          basketTotal,
                          config,
                          quoteCountryCode,
                          undefined,
                          undefined,
                          undefined,
                          undefined,
                          currentUser?.name,
                          warehouses
                        );
                        if (res.ok) {
                          setBasket([]);
                          setShowQuoteWhatsappModal(false);
                        }
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className={`flex justify-end gap-3 pt-3 border-t ${isLight ? 'border-zinc-150' : 'border-white/10'}`}>
                <button
                  type="button"
                  onClick={() => setShowQuoteWhatsappModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer select-none uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!quoteWhatsappPhone.trim()) {
                      alert('Por favor ingresa un número de WhatsApp válido.');
                      return;
                    }
                    const res = await sendPosQuoteByWhatsapp(
                      quoteWhatsappPhone,
                      quoteClientName,
                      basket,
                      basketTotal,
                      config,
                      quoteCountryCode,
                      undefined,
                      undefined,
                      undefined,
                      undefined,
                      currentUser?.name,
                      warehouses
                    );
                    if (res.ok) {
                      setBasket([]);
                      setShowQuoteWhatsappModal(false);
                    }
                  }}
                  className="px-5 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer transition-all border border-amber-700 uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Enviar Cotización</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLUENT DE ACTIVACIÓN DE CHIP - AGREGAR AL CARRITO */}
      {pendingChipToAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
          <div className="bg-white border border-zinc-200 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative text-zinc-800 animate-scaleUp">
            <button
              type="button"
              onClick={() => setPendingChipToAdd(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-zinc-150 pb-3">
              <span className="text-xl">⚡</span>
              <h3 className="text-sm font-sans font-black text-blue-600 uppercase tracking-wider">
                Datos de Activación de Chip
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Estás agregando <span className="text-zinc-800 font-extrabold">{pendingChipToAdd.name}</span>. Por favor captura los datos para registrar la activación de la línea o desactiva la opción para realizar una venta normal.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chipRegisterDetails) {
                  if (!chipClientName.trim()) { alert('Por favor ingresa el nombre del cliente.'); return; }
                  if (chipPhone.trim().length !== 10) { alert('El número telefónico debe tener exactamente 10 dígitos.'); return; }
                }
                handleConfirmAddChip(chipClientName, chipPhone, chipIccid, chipImei, !chipRegisterDetails);
              }}
              className="space-y-4"
            >
              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="fluent-add-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-4.5 h-4.5 accent-blue-600 bg-white border border-zinc-300 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="fluent-add-chip-register-details" className="text-xs font-black text-zinc-700 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>
              </div>

              {chipRegisterDetails ? (
                <div className="space-y-3 bg-white border border-zinc-150 p-4 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre Completo"
                      value={chipClientName}
                      onChange={(e) => setChipClientName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Número del Chip *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10 dígitos"
                      value={chipPhone}
                      onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">ICCID (SIM) (Opcional)</label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="19 o 20 dígitos"
                      value={chipIccid}
                      onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15 dígitos"
                      value={chipImei}
                      onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold leading-relaxed">
                  ⚠️ Se agregará el chip como venta normal. No se registrará información de activación.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setPendingChipToAdd(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer uppercase select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-blue-650 hover:bg-blue-750 border border-blue-700 rounded-xl cursor-pointer transition-all uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Agregar al Carrito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FLUENT DE ACTIVACIÓN DE CHIP - EDITAR DESDE EL CARRITO */}
      {editingChipBasketItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
          <div className="bg-white border border-zinc-200 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative text-zinc-800 animate-scaleUp">
            <button
              type="button"
              onClick={() => setEditingChipBasketItem(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-zinc-150 pb-3">
              <span className="text-xl">✏️</span>
              <h3 className="text-sm font-sans font-black text-blue-600 uppercase tracking-wider">
                Editar Datos de Activación
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Modificando los datos de activación para el chip: <span className="text-zinc-800 font-extrabold">{editingChipBasketItem.item.name}</span>.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chipRegisterDetails) {
                  if (!chipClientName.trim()) { alert('Por favor ingresa el nombre del cliente.'); return; }
                  if (chipPhone.trim().length !== 10) { alert('El número telefónico debe tener exactamente 10 dígitos.'); return; }
                }
                handleConfirmEditChip(editingChipBasketItem.uniqueId || editingChipBasketItem.item.id, chipClientName, chipPhone, chipIccid, chipImei, !chipRegisterDetails);
              }}
              className="space-y-4"
            >
              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="fluent-edit-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-4.5 h-4.5 accent-blue-600 bg-white border border-zinc-300 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="fluent-edit-chip-register-details" className="text-xs font-black text-zinc-700 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>
              </div>

              {chipRegisterDetails ? (
                <div className="space-y-3 bg-white border border-zinc-155 p-4 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre Completo"
                      value={chipClientName}
                      onChange={(e) => setChipClientName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Número del Chip *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10 dígitos"
                      value={chipPhone}
                      onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">ICCID (SIM) (Opcional)</label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="19 o 20 dígitos"
                      value={chipIccid}
                      onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15 dígitos"
                      value={chipImei}
                      onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-250 focus:border-blue-550 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-800 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold leading-relaxed animate-fadeIn">
                  ⚠️ Se desactivará el registro de activación para este chip al guardar los cambios.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setEditingChipBasketItem(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer uppercase select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-blue-650 hover:bg-blue-750 border border-blue-700 rounded-xl cursor-pointer transition-all uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderPriceCheckerModal()}

      {renderFavoritesModal()}

      {/* Modal 2: F6 (Calculadora) */}
      {showSoftCalculator && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowSoftCalculator(false)}>
          <div className={`max-w-xs w-full rounded-2xl shadow-2xl p-5 relative animate-scaleUp border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
          }`} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowSoftCalculator(false)}
              className={`absolute top-4 right-4 transition-colors cursor-pointer select-none ${
                isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'
              }`}
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center gap-2 mb-4 border-b pb-2.5 ${isLight ? 'border-zinc-200' : 'border-white/10'}`}>
              <Calculator className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-display font-black text-blue-500 uppercase tracking-widest select-none">
                🎛️ Calculadora Rápida (F6)
              </h3>
            </div>

            {/* Display Area */}
            <div className={`border rounded-xl p-3.5 mb-4 text-right select-all ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/5'}`}>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider h-4 overflow-hidden truncate">
                {softCalculatorExpr || '0'}
              </div>
              <div className="text-xl font-bold font-mono text-blue-500 truncate pt-1">
                {softCalculatorResult !== null ? softCalculatorResult : (softCalculatorExpr.split(/[+\-*/]/).pop() || '0')}
              </div>
            </div>

            {/* Operator/Number buttons */}
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {['C', 'DEL', '(', ')'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtn(btn)}
                  className={`p-2.5 font-bold rounded-lg border transition-all cursor-pointer select-none ${
                    isLight 
                      ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-white/5 text-zinc-300'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['7', '8', '9', '/'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtn(btn)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    isLight 
                      ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-850' 
                      : 'bg-[#2a2a2a] hover:bg-[#333333] border-white/10 text-white'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['4', '5', '6', '*'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtn(btn)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    isLight 
                      ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-850' 
                      : 'bg-[#2a2a2a] hover:bg-[#333333] border-white/10 text-white'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['1', '2', '3', '-'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtn(btn)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    isLight 
                      ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-850' 
                      : 'bg-[#2a2a2a] hover:bg-[#333333] border-white/10 text-white'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['0', '.', '=', '+'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtn(btn)}
                  className={`p-2.5 rounded-lg border transition-all font-bold cursor-pointer select-none ${
                    btn === '=' 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600' 
                      : (isLight 
                          ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-850' 
                          : 'bg-[#2a2a2a] hover:bg-[#333333] border-white/10 text-white')
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-zinc-450 text-center uppercase font-bold tracking-wider pt-3 select-none">
              Soporta teclado numérico físico
            </p>
          </div>
        </div>
      )}

      {/* Modal 3: F9 (Contador de Caja y Monedas) */}
      {showSoftCoinsCounter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn" onClick={() => setShowSoftCoinsCounter(false)}>
          <div className={`max-w-md w-full rounded-2xl shadow-2xl p-6 relative animate-scaleUp border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#202020] border-white/10 text-white'
          }`} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowSoftCoinsCounter(false)}
              className={`absolute top-4 right-4 transition-colors cursor-pointer select-none ${
                isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'
              }`}
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isLight ? 'border-zinc-150' : 'border-white/10'}`}>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="text-xs font-display font-black text-amber-550 uppercase tracking-widest select-none">
                  🪙 Control de Caja Chica (F9)
                </h3>
              </div>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase border ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-950/20 border-amber-800/30 text-amber-400'
              }`}>
                Arqueo Rápido
              </span>
            </div>

            <p className={`text-[10.5px] mb-4 leading-relaxed select-none font-sans ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Herramienta para arqueo de caja chica. Introduzca las piezas por denominación para calcular el total acumulado de efectivo. En armonía con su hoja de desgloses.
            </p>

            {/* THREE-COLUMN GRID HEADER */}
            <div className="grid grid-cols-12 gap-3 text-center text-[10px] font-bold uppercase text-zinc-455 font-mono px-1 mb-2">
              <span className="col-span-4 text-left">Cantidad</span>
              <span className="col-span-4">Denominación</span>
              <span className="col-span-4 text-right">Importe</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
              {Object.entries(softCoinsList).map(([denom, count]) => {
                const val = parseFloat(denom);
                const isBill = val >= 20;
                
                // Stylized badge helpers for visual representation
                let badge = (
                  <span className={`px-2 py-1 rounded text-[9.5px] font-black font-mono border w-full block text-center shadow-inner ${
                    isLight ? 'bg-zinc-50 border-zinc-250 text-zinc-650' : 'bg-zinc-900 border-zinc-700 text-zinc-450'
                  }`}>
                    🪙 ${denom}
                  </span>
                );
                if (val === 1000) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-slate-900 border-slate-700 text-slate-350 w-full block text-center shadow-inner">
                      💵 $1,000
                    </span>
                  );
                } else if (val === 500) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-amber-950/40 border-amber-900/40 text-amber-400 w-full block text-center shadow-inner">
                      💵 $500
                    </span>
                  );
                } else if (val === 200) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-emerald-950/45 border-emerald-900/45 text-emerald-400 w-full block text-center shadow-inner">
                      💵 $200
                    </span>
                  );
                } else if (val === 100) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-rose-950/45 border-rose-900/45 text-rose-450 w-full block text-center shadow-inner">
                      💵 $100
                    </span>
                  );
                } else if (val === 50) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-fuchsia-950/40 border-fuchsia-900/40 text-fuchsia-400 w-full block text-center shadow-inner">
                      💵 $50
                    </span>
                  );
                } else if (val === 20) {
                  badge = (
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-teal-950/40 border-teal-900/40 text-teal-405 w-full block text-center shadow-inner">
                      💵 $20
                    </span>
                  );
                } else if (val === 10) {
                  badge = (
                    <span className={`px-2 py-1 rounded text-[9.5px] font-black font-mono border w-full block text-center shadow-inner ${
                      isLight ? 'bg-yellow-50 border-yellow-200 text-yellow-750' : 'bg-yellow-950/30 border-yellow-900/40 text-yellow-500'
                    }`}>
                      🪙 $10
                    </span>
                  );
                } else if (val === 0.5) {
                  badge = (
                    <span className={`px-2 py-1 rounded text-[9.5px] font-black font-mono border w-full block text-center shadow-inner ${
                      isLight ? 'bg-orange-50 border-orange-200 text-orange-750' : 'bg-orange-950/20 border-orange-900/30 text-orange-400'
                    }`}>
                      🪙 50¢
                    </span>
                  );
                }

                return (
                  <div key={denom} className="grid grid-cols-12 gap-3 items-center">
                    {/* QTY INPUT */}
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSoftCoinsList(prev => ({ ...prev, [denom]: val < 0 ? 0 : val }));
                        }}
                        placeholder="0"
                        className={`w-full text-center border rounded-lg py-1 font-bold font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors ${
                          isLight 
                            ? 'bg-zinc-50 border-zinc-250 text-zinc-800 placeholder-zinc-405' 
                            : 'bg-black/20 border-white/10 text-white placeholder-zinc-700'
                        }`}
                      />
                    </div>

                    {/* DENOM LABEL FRAME */}
                    <div className="col-span-4 flex justify-center">
                      {badge}
                    </div>

                    {/* COMPUTED SUB-IMPORTE */}
                    <div className="col-span-4">
                      <div className={`w-full text-right border rounded-lg py-1 pr-3 text-xs font-black font-mono ${
                        isLight 
                          ? 'bg-zinc-50/50 border-zinc-200 text-zinc-700' 
                          : 'bg-black/10 border-white/5 text-amber-400'
                      }`}>
                        ${(val * (Number(count) || 0)).toFixed(1)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER */}
            <div className={`border-t pt-4 mt-4 flex items-center justify-between ${isLight ? 'border-zinc-200' : 'border-white/10'}`}>
              <div className="flex flex-col select-none">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest font-mono">Dinero Total</span>
                <span className={`text-xl font-mono font-black ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                  ${softCoinsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  key="clear-coins"
                  type="button"
                  onClick={() => {
                    setSoftCoinsList({
                      '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0, '0.5': 0
                    });
                    triggerToast('Arqueo vaciado correctamente.', 'info');
                  }}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                    isLight 
                      ? 'bg-white hover:bg-zinc-50 border-zinc-250 text-zinc-650' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-400'
                  }`}
                >
                  Vaciar
                </button>

                <button
                  key="copy-coins"
                  type="button"
                  onClick={() => {
                    setPayCash(Number(softCoinsTotal.toFixed(2)));
                    triggerToast(`Importe total de $${softCoinsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} copiado al campo "Efectivo Recibido"`, 'success');
                    setShowSoftCoinsCounter(false);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                >
                  Usar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {outOfStockAlertItem && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-[80] select-none font-sans animate-fadeIn">
          <div className={`max-w-md w-full rounded-lg shadow-2xl p-6 relative animate-scaleUp border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#282828] border-white/10 text-white'
          }`}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-lg">
                ⚠️
              </div>
              <div className="flex-1 space-y-2.5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-amber-500">
                  Advertencia de Inventario
                </h3>
                
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-tight">
                    {outOfStockAlertItem.item.name}
                  </p>
                  <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {outOfStockAlertItem.reason === 'outofstock' 
                      ? 'No hay existencias de este artículo registradas en la ubicación seleccionada.'
                      : `La cantidad en el carrito supera las existencias físicas actuales (Máximo disponible: ${outOfStockAlertItem.maxStock} pzas).`}
                  </p>
                  {outOfStockAlertItem.warehouseName && (
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wide mt-1">
                      Bodega: {outOfStockAlertItem.warehouseName}
                    </p>
                  )}
                </div>

                <div className={`text-[9px] p-2.5 rounded-md leading-normal border ${
                  isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-black/20 border-white/5 text-zinc-400'
                }`}>
                  El parámetro de control "Permitir Ventas Sin Stock" está inactivo.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-zinc-500/15">
              <button
                type="button"
                onClick={() => setOutOfStockAlertItem(null)}
                className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded transition-all cursor-pointer shadow-sm select-none"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
