/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { Calculator, ShoppingCart, Trash2, Coins, CreditCard, Sparkles, CheckCircle, Search, X, CornerDownLeft, FolderHeart, Archive, Info, XCircle, Users, Edit, Lock, Unlock, ShieldCheck, Wrench, Printer, MessageSquare, Smartphone, Star, AlertTriangle, Tag } from 'lucide-react';
import { PosLogic, normalizeSearchText } from '../../hooks/usePosLogic';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { logPriceCheck, markAddedToCart } from '../../utils/priceCheckLog';
import { buildPosTicketHtml } from '../../utils/ticketBuilder';
import { getIndividualAdvance } from '../../utils/orderHelpers';
import { handleCaretPreservingChange } from '../../utils/domHelpers';
import { PosItemThumbnail } from './PosItemThumbnail';
import { sendPosQuoteByWhatsapp } from '../../utils/whatsapp';

interface Props {
  logic: PosLogic;
  warehouses?: any[];
}

export default function PosModern({ logic, warehouses = [] }: Props) {
  const {
    config, sales, users, setActiveTab, onCancelSale, currentUser,
    basket, setBasket, isAdminMode, setIsAdminMode,
    editingItemId, setEditingItemId, editingPriceValue, setEditingPriceValue,
    paymentMethod, setPaymentMethod, cashAmount, setCashAmount,
    payCash, setPayCash, payCard, setPayCard,
    cardCode, setCardCode,
    lastSaleReceipt, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    selectedSaleWarehouseId, setSelectedSaleWarehouseId,
    showClearConfirm, setShowClearConfirm, confirmationCode, setConfirmationCode,
    showSaleConfirm, setShowSaleConfirm, changeAmount, setChangeAmount,
    discountType, setDiscountType, discountValue, setDiscountValue, discountEnabled, setDiscountEnabled, discountAmount,
    countdown, fastSaleName, setFastSaleName, fastSalePrice, setFastSalePrice,
    saveToInventory, setSaveToInventory,
    isSearchModalOpen, setIsSearchModalOpen,
    modalCurrentPage, setModalCurrentPage,
    isFastSaleModalOpen, setIsFastSaleModalOpen,
    showQuickHistory, setShowQuickHistory, quickHistoryConfirm, setQuickHistoryConfirm,
    quickHistoryDetail, setQuickHistoryDetail, modalSelectedIndex, setModalSelectedIndex,
    inlineSelectedIndex, setInlineSelectedIndex, inlineSelectedIndexRef,
    showCancelConfirm, setShowCancelConfirm, showSaveSaleModal, setShowSaveSaleModal,
    saveSaleLabel, setSaveSaleLabel, showSavedSalesListModal, setShowSavedSalesListModal,
    saleToDelete, setSaleToDelete, pendingLoadSaleId, setPendingLoadSaleId,
    showSoftCalculator, setShowSoftCalculator, softCalculatorExpr, setSoftCalculatorExpr,
    softCalculatorResult, setSoftCalculatorResult,
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
    saleNote, setSaleNote,
    posWhatsappPhone, setPosWhatsappPhone, posToast, setPosToast, waConnected,
    showAdminAuthModal, setShowAdminAuthModal, adminAuthPin, setAdminAuthPin,
    adminAuthError, setAdminAuthError, pendingEditItemId, setPendingEditItemId,
    savedSales, setSavedSales,
    lastSelectedQueryRef, fastSaleNameInputRef, searchInputRef, lastClickTimeRef,
    modalFastSaleNameInputRef, modalFastSalePriceInputRef,
    fastSaleModalNameInputRef, fastSaleModalPriceInputRef,
    softCoinsTotal, matchedProductsForModal, exactMatch,
    modalCategoryFilter, setModalCategoryFilter,
    paginatedModalItems, modalTotalPages,
    availableItems, inventory, getItemStock,
    posTotalPosition, togglePosTotalPosition,
    basketTotal, basketTotalItems, saleType, setSaleType,
    triggerToast, handleCalcBtn, cancelAndCleanupFastSale, cancelAndCleanupSearchModal,
    addFastSaleItem, handleModalAddFastSaleItem,
    addToBasket, updateQuantity, removeFromBasket, toggleBasketItemPriceType,
    updateLineDiscount,
    handleSavePrice, handleRequestEditPrice,
    handleConfirmAddChip, handleConfirmEditChip,
    handleAdminAuthSubmit, handleLockAdminMode,
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

  const isLight = config.themeMode === 'light';

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

  React.useEffect(() => {
    if (basket.length === 0) {
      setIsQuoteMode(false);
    }
  }, [basket.length]);

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

  const isWaIntegratedOffline = !waConnected;
  const [activeSearchField, setActiveSearchField] = React.useState<'name' | 'phone' | null>(null);

  const [chipClientName, setChipClientName] = React.useState('');
  const [chipPhone, setChipPhone] = React.useState('');
  const [chipIccid, setChipIccid] = React.useState('');
  const [chipImei, setChipImei] = React.useState('');
  const [chipRegisterDetails, setChipRegisterDetails] = React.useState(true);

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


  const [showFavoritesModal, setShowFavoritesModal] = React.useState(false);
  const [favSearchQuery, setFavSearchQuery] = React.useState('');
  const [favSelectedCategory, setFavSelectedCategory] = React.useState('TODAS');

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

  const [favSelectedIndex, setFavSelectedIndex] = React.useState(0);

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
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFavoritesModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFavoritesModal, filteredFavoriteItems, favSelectedIndex, addToBasket, triggerToast]);

  React.useEffect(() => {
    if (!showFavoritesModal) return;
    const container = document.getElementById('pos-fav-modal-table-container');
    const activeRow = container?.querySelector('.pos-fav-row-selected') as HTMLElement;
    if (container && activeRow) {
      const containerRect = container.getBoundingClientRect();
      const rowRect = activeRow.getBoundingClientRect();
      const innerContainerTop = containerRect.top + container.clientTop;
      const elemTop = rowRect.top - innerContainerTop;
      const elemBottom = rowRect.bottom - innerContainerTop;
      const buffer = container.clientHeight > 150 ? 35 : 0;

      if (elemTop < buffer) {
        container.scrollTop += (elemTop - buffer);
      } else if (elemBottom > container.clientHeight - buffer) {
        container.scrollTop += (elemBottom - (container.clientHeight - buffer));
      }
    }
  }, [favSelectedIndex, showFavoritesModal]);

  const [showPriceChecker, setShowPriceChecker] = React.useState(false);
  const [showSpecialOptions, setShowSpecialOptions] = React.useState(false);
  const [showNoteOption, setShowNoteOption] = React.useState(false);
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
    const sym = config.currencySymbol || '$';
    const isLight = config.themeMode === 'light';
    if (!showPriceChecker) return null;
    const results = priceCheckerResults;
    const modalBg = isLight ? 'bg-white border border-zinc-200' : 'bg-[#111318] border border-zinc-700';
    const headerBg = `modal-dark-header ${isLight ? 'bg-[#1a3a6b]' : 'bg-[#11131e]'}`;
    const inputCls = isLight ? 'bg-zinc-50 border border-zinc-300 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600';
    const rowHover = isLight ? 'hover:bg-zinc-50 cursor-pointer' : 'hover:bg-zinc-800/50 cursor-pointer';
    const textMain = isLight ? 'text-zinc-800' : 'text-white';
    const textSub = isLight ? 'text-zinc-500' : 'text-zinc-400';
    const divider = isLight ? 'divide-zinc-200' : 'divide-zinc-800';

    const doSearch = () => {
      const q = priceCheckerQuery.trim().toLowerCase();
      if (!q) return;
      const found = inventory.filter(i => i.active !== false && (i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)));
      if (found.length === 1) { priceCheckerEntryId.current = logPriceCheck(found[0]); setPriceCheckerSelected(found[0]); setPriceCheckerResults(null); }
      else { setPriceCheckerResults(found); setPriceCheckerSelected(null); setPriceCheckerHighlight(0); }
      const input = priceCheckerInputRef.current;
      if (input) {
        input.value = '';
        input.blur();
      }
    };

    const doAddToCart = (item: any) => {
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
      const stockColor = !isStockControlled ? (isLight ? 'text-indigo-650' : 'text-indigo-400') : item.stock <= 0 ? 'text-rose-500' : item.stock <= item.minStock ? 'text-amber-500' : isLight ? 'text-emerald-600' : 'text-emerald-400';
      const addBtnCls = isLight ? 'bg-[#1a3a6b] hover:bg-[#14306b] text-white' : 'bg-blue-600 hover:bg-blue-500 text-white';
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => { setPriceCheckerSelected(null); setPriceCheckerResults(null); setPriceCheckerQuery(''); setShowPriceChecker(false); }}>
          <div className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${modalBg}`} onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' && !priceCheckerAdded) doAddToCart(item); if (e.key === 'Escape') { setPriceCheckerSelected(null); setTimeout(() => priceCheckerInputRef.current?.focus(), 50); } }}
            tabIndex={-1} ref={el => el?.focus()}
          >
            <div className={`modal-dark-header ${headerBg} px-4 py-3 flex items-center justify-between`} ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <button onClick={() => { setPriceCheckerSelected(null); setTimeout(() => priceCheckerInputRef.current?.focus(), 50); }} className="cursor-pointer text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>← Volver</button>
              <span className="text-sm font-black uppercase tracking-widest">🏷️ Verificador de Precios</span>
              <button onClick={() => { setPriceCheckerSelected(null); setPriceCheckerResults(null); setPriceCheckerQuery(''); setShowPriceChecker(false); }} className="cursor-pointer text-lg font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>✕</button>
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-8 gap-4">
              <div className={`text-6xl font-black tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-center">
                <div className={`text-lg font-black leading-tight ${textMain}`}>{item.name}</div>
                {item.brand && <div className={`text-sm mt-1 ${textSub}`}>{item.brand}</div>}
              </div>
              <div className={`w-full rounded-xl px-4 py-3 flex flex-col gap-1.5 ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-900/60 border border-zinc-800'}`}>
                {item.code && <div className="flex justify-between text-xs"><span className={textSub}>Código</span><span className={`font-mono font-bold ${textMain}`}>{item.code}</span></div>}
                {item.category && <div className="flex justify-between text-xs"><span className={textSub}>Categoría</span><span className={`font-bold ${textMain}`}>{item.category}</span></div>}
                <div className="flex justify-between text-xs"><span className={textSub}>Stock</span><span className={`font-black ${stockColor}`}>{!isStockControlled ? 'Ilimitado' : item.stock <= 0 ? 'Sin stock' : `${item.stock} uds.`}</span></div>
                {item.wholesalePrice !== undefined && item.wholesalePrice > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className={textSub}>P. Mayoreo</span>
                    <span className={`font-mono font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {sym}{item.wholesalePrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => !priceCheckerAdded && doAddToCart(item)} className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest cursor-pointer transition-all ${priceCheckerAdded ? 'bg-emerald-500 text-white' : addBtnCls}`} ref={el => { if (el) el.style.setProperty('color','white','important'); }}>
                {priceCheckerAdded ? '✓ Agregado al carrito' : '+ Agregar al carrito  [Enter]'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setShowPriceChecker(false)}>
        <div className={`w-full max-w-md mx-4 rounded-xl shadow-2xl flex flex-col overflow-hidden ${modalBg}`} style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
          <div className={`modal-dark-header ${headerBg} px-4 py-3 flex items-center justify-between`} ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
            <span className="text-sm font-black uppercase tracking-widest">🏷️ Verificador de Precios</span>
            <button onClick={() => setShowPriceChecker(false)} className="cursor-pointer text-lg font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>✕</button>
          </div>
          <div className={`p-3 border-b ${isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
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
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${inputCls}`}
            />
          </div>
          <div className={`flex-1 overflow-y-auto divide-y ${divider}`}>
            {results === null ? null : results.length === 0 ? (
              <div className={`py-8 text-center text-sm ${textSub}`}>Sin resultados</div>
            ) : results.map((item, idx) => (
              <div key={item.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${rowHover} ${idx === priceCheckerHighlight ? (isLight ? 'bg-blue-50 border-l-2 border-blue-400' : 'bg-zinc-700/60') : ''}`} onClick={() => { priceCheckerEntryId.current = logPriceCheck(item); setPriceCheckerSelected(item); }} onMouseEnter={() => setPriceCheckerHighlight(idx)}>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${textMain}`}>{item.name}</div>
                  <div className={`text-[10px] ${textSub}`}>{item.brand}{item.category ? ` · ${item.category}` : ''} · Stock: {item.manageStock === false ? 'Ilimitado' : item.stock}</div>
                </div>
                <div className={`text-sm font-black shrink-0 ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
          {results !== null && (
            <div className={`px-4 py-2 text-[10px] ${textSub} border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              {results.length} artículo{results.length !== 1 ? 's' : ''} — clic para ver detalle
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickHistoryModals = () => {
    const sym = config.currencySymbol || '$';
    const isLight = config.themeMode === 'light';

    // Clases adaptativas por tema
    const modalBg    = isLight ? 'bg-white border border-zinc-200' : 'bg-[#111318] border border-zinc-700';
    const headerBg   = isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800';
    const headerText = isLight ? 'text-zinc-800' : 'text-white';
    const subText    = isLight ? 'text-zinc-500' : 'text-zinc-400';
    const divider    = isLight ? 'divide-zinc-200' : 'divide-zinc-800';
    const rowHover   = isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/50';
    const idText     = isLight ? 'text-zinc-500' : 'text-zinc-500';
    const itemText   = isLight ? 'text-zinc-600' : 'text-zinc-400';
    const dateText   = isLight ? 'text-zinc-400' : 'text-zinc-600';
    const totalText  = isLight ? 'text-zinc-900' : 'text-white';
    const emptyText  = isLight ? 'text-zinc-400' : 'text-zinc-500';
    const btnUtil    = isLight ? 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-zinc-900'
      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white';
    const btnCancel  = isLight ? 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-600'
      : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400';
    const histBtn    = isLight ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200';

    return (
      <>
        {/* ── MODAL HISTORIAL RÁPIDO ── */}
        {showQuickHistory && (() => {
          const last10 = [...sales]
            .filter(s => !s.isCancelled)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10);
          return (
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
              style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
              onClick={() => setShowQuickHistory(false)}
            >
              <div className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl ${modalBg}`} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`px-5 py-4 border-b ${headerBg} flex items-center justify-between`}>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-wider ${headerText}`}>🧾 Últimas ventas</p>
                    <p className={`text-[10px] mt-0.5 ${subText}`}>Puedes ver el detalle, reimprimir o cancelar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {setActiveTab && (
                      <button onClick={() => { setShowQuickHistory(false); setActiveTab('Ventas'); }} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${histBtn}`}>
                        Ver historial completo →
                      </button>
                    )}
                    <button onClick={() => setShowQuickHistory(false)} className={`cursor-pointer text-lg font-black ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'}`}>✕</button>
                  </div>
                </div>

                {/* Lista */}
                <div className={`overflow-y-auto max-h-[420px] divide-y ${divider}`}>
                  {last10.length === 0 ? (
                    <div className={`py-12 text-center text-sm ${emptyText}`}>No hay ventas registradas aún</div>
                  ) : last10.map(sale => (
                    <div key={sale.id} className={`px-5 py-3.5 flex items-center justify-between gap-3 transition-colors ${rowHover}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono ${idText}`}>{sale.id}</span>
                          <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isLight
                              ? sale.paymentMethod === 'Efectivo' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : sale.paymentMethod === 'Tarjeta' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-purple-100 text-purple-700 border border-purple-300'
                              : sale.paymentMethod === 'Efectivo' ? 'bg-emerald-900/50 text-emerald-400' : sale.paymentMethod === 'Tarjeta' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 truncate ${itemText}`}>{sale.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                        <p className={`text-[9.5px] font-mono mt-0.5 ${dateText}`}>
                          {new Date(sale.createdAt).toLocaleString('es-MX', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-black ${totalText}`}>{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <div className="flex gap-1 mt-1.5 justify-end">
                          <button onClick={() => setQuickHistoryDetail(sale)} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-all ${btnUtil}`}>🔍 Detalle</button>
                          <button onClick={() => setQuickHistoryConfirm({ type: 'reprint', sale })} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-all ${btnUtil}`}>🖨 Ticket</button>
                          <button onClick={() => setQuickHistoryConfirm({ type: 'cancel', sale })} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-all ${btnCancel}`}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL DETALLE DE VENTA ── */}
        {quickHistoryDetail && (() => {
          const sale = quickHistoryDetail;
          return (
            <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${modalBg}`}>
                <div className={`px-5 py-4 border-b ${headerBg} flex items-center justify-between`} ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-wider ${headerText}`}>📋 Detalle — {sale.id}</p>
                    <p className={`text-[10px] mt-0.5 ${subText}`}>{new Date(sale.createdAt).toLocaleString('es-MX')}</p>
                  </div>
                  <button onClick={() => setQuickHistoryDetail(null)} className="cursor-pointer text-lg font-black">✕</button>
                </div>
                <div className={`px-5 py-4 space-y-3 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {/* Artículos */}
                  <div className={`rounded-lg border overflow-hidden ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                    <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`} ref={el => { if (el) el.style.setProperty('color','white','important'); }}>
                      Artículos
                    </div>
                    {sale.items.map((item, i) => (
                      <div key={i} className={`flex justify-between px-3 py-2 text-xs border-t ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                        <span className="truncate max-w-[60%]">{item.name} <span className={`font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>×{item.quantity}</span></span>
                        <span className="font-black">{sym}{(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  {/* Resumen */}
                  <div className={`flex justify-between items-center pt-2 border-t text-sm font-black ${isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                    <span className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>TOTAL</span>
                    <span className={isLight ? 'text-zinc-900' : 'text-white'}>{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Método de pago: <strong>{sale.paymentMethod}</strong>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button onClick={() => setQuickHistoryDetail(null)} className={`w-full py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                    ← Volver
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL CONFIRMACIÓN ── */}
        {quickHistoryConfirm && (() => {
          const { type, sale } = quickHistoryConfirm;
          const isCancel = type === 'cancel';
          const hasFastItems = sale.items.some(i => !i.itemId || i.itemId === '');
          const confirmHeaderBg = isCancel
            ? (isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/40 border-rose-800/50')
            : (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-800/60 border-zinc-700');
          const confirmHeaderText = isCancel
            ? (isLight ? 'text-rose-800' : 'text-rose-300')
            : (isLight ? 'text-emerald-800' : 'text-white');
          return (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${modalBg}`}>
                <div className={`px-5 py-4 border-b ${confirmHeaderBg}`}>
                  <p className={`text-sm font-black uppercase tracking-wide ${confirmHeaderText}`}>
                    {isCancel ? '⚠️ Cancelar venta' : '🖨️ Reimprimir ticket'}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {isCancel ? 'Esta acción revertirá la venta y restaurará el stock' : 'Se enviará el ticket a la impresora configurada'}
                  </p>
                </div>
                <div className={`px-5 py-4 space-y-2 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div><span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Venta</span><span className="font-black font-mono">{sale.id}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Total</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Pago</span><span>{sale.paymentMethod}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Artículos</span><span>{sale.items.length}</span></div>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-[10px] mt-1 ${isCancel
                    ? (isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-950/20 border-rose-800/40 text-rose-300')
                    : (isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400')
                  }`}>
                    {isCancel
                      ? hasFastItems
                        ? '⚡ Esta venta tiene artículos de venta rápida — esos NO se restaurarán al stock.'
                        : '📦 El stock de todos los artículos será restaurado al inventario.'
                      : `Impresora: ${config.printerInterface && config.printerInterface !== 'Default' ? `Impresora ${config.printerInterface}` : 'Predeterminada del sistema'}`
                    }
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button
                    onClick={() => {
                      if (isCancel) {
                        onCancelSale?.(sale.id);
                      } else {
                        window.dispatchEvent(new CustomEvent('automated-print', {
                          detail: {
                            type: 'ticket',
                            id: sale.id,
                            name: `Reimpresión Venta ${sale.id}`,
                            details: `Total: ${sym}${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${sale.paymentMethod}`
                          }
                        }));
                        const saleMapped = {
                          ...sale,
                          items: (sale.items || []).map((i: any) => ({
                            description: i.description || i.name || '',
                            name: i.name || i.description || '',
                            quantity: i.quantity,
                            price: i.price,
                            originalPrice: i.originalPrice,
                            discountValue: i.discountValue ?? (i as any).lineDiscountValue,
                            discountType: i.discountType ?? (i as any).lineDiscountType,
                            fromWarehouseId: (i as any).fromWarehouseId
                          })),
                        };
                        let effectivePosWidth = config.hybridPrintMode
                          ? (config.posPaperWidth || '80mm')
                          : (config.ticketPaperWidth || '80mm');
                        if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
                          effectivePosWidth = '80mm';
                        }
                        const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : 72000;
                        const paperHeightMicrons = undefined;
                        const deviceName = config.hybridPrintMode
                          ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
                          : (config.ticketPrinterBrand || '');
                        const html = buildPosTicketHtml(saleMapped as any, config as any);
                        window.dispatchEvent(new CustomEvent('fm-silent-print', {
                          detail: {
                            html,
                            deviceName,
                            paperWidthMicrons,
                            paperHeightMicrons,
                            isLabel: false
                          }
                        }));
                      }
                      setQuickHistoryConfirm(null);
                      setShowQuickHistory(false);
                    }}
                    className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isCancel ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-black'}`}
                  >
                    {isCancel ? '✕ Confirmar Cancelación' : '🖨️ Confirmar Impresión'}
                  </button>
                  <button onClick={() => setQuickHistoryConfirm(null)} className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    );
  };

  const renderShortcutModalsAndToasts = () => {
    return (
      <>
        {/* Real-time Integrated OS Notification Toast */}
        {posToast && createPortal(
          <div 
            className={`fixed top-4 right-4 z-[100000] flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-xl animate-fadeIn select-none max-w-sm ${
              posToast.type === 'success' 
                ? 'border-emerald-500/30 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : posToast.type === 'error'
                ? 'border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : posToast.type === 'warning'
                ? 'border-amber-500/30 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'border-zinc-700 text-zinc-100 shadow-[0_0_15px_rgba(150,150,150,0.15)]'
            }`}
            style={{ backgroundColor: '#121316', opacity: 1 }}
          >
            {posToast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {posToast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {posToast.type === 'warning' && <Info className="w-5 h-5 text-amber-400 shrink-0" />}
            {posToast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-bold leading-snug">{posToast.message}</span>
          </div>,
          document.body
        )}

        {/* Modal 1: F2 (Clientes / Referencia) */}
        {showSoftClientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#121316] border-2 border-zinc-600 max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
              <button
                type="button"
                onClick={() => setShowSoftClientModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-display font-black text-blue-400 uppercase tracking-wider select-none">
                  👤 CLIENTES Y REFERENCIAS (F2)
                </h3>
              </div>

              <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed select-none">
                Asigne un nombre de cliente o identificador (como número de mesa o celular) para esta transacción activa. Se usará al guardar o validar.
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block select-none">Nombre / Detalle de Cliente</label>
                  <input
                    type="text"
                    value={saveSaleLabel}
                    onChange={(e) => setSaveSaleLabel(e.target.value)}
                    placeholder="Ej. Hugo García / Mesa 4..."
                    className="w-full bg-[#22252d] border border-zinc-500 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none placeholder:text-zinc-500"
                    style={{ WebkitTextFillColor: '#ffffff', color: '#ffffff' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setShowSoftClientModal(false);
                        triggerToast(`👤 Cliente asignado: "${saveSaleLabel || 'Público General'}"`, 'success');
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5 border-t border-zinc-800/60 pt-3">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block select-none">Accesos Rápidos Estándar</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'Público General',
                      'Hugo García',
                      'Servicio Express',
                      'Mesa #1',
                      'Mesa #2',
                      'Cliente Frecuente'
                    ].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSaveSaleLabel(name);
                          setShowSoftClientModal(false);
                          triggerToast(`👤 Cliente asignado: "${name}"`, 'success');
                        }}
                        className="p-2.5 text-left bg-zinc-950 hover:bg-zinc-700 hover:text-white border border-zinc-700 text-zinc-300 rounded-xl transition-all text-[11px] font-bold cursor-pointer select-none"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSoftClientModal(false);
                    triggerToast(`👤 Cliente asignado: "${saveSaleLabel || 'Público General'}"`, 'success');
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 active:translate-y-[1px] text-zinc-950 font-sans font-black text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all uppercase tracking-wider mt-2 cursor-pointer select-none"
                >
                  Confirmar Selección [Enter]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: F6 (Calculadora) */}
        {showSoftCalculator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#121316] border-2 border-zinc-700 max-w-xs w-full rounded-2xl shadow-2xl p-5 relative text-white animate-scaleUp">
              <button
                type="button"
                onClick={() => setShowSoftCalculator(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2.5">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-display font-black text-cyan-400 uppercase tracking-widest select-none">
                  🎛️ CALCULADORA RÁPIDA (F6)
                </h3>
              </div>

              {/* Display Area */}
              <div className="bg-[#08080a] border border-[#2d2f36] rounded-xl p-3.5 mb-4 text-right select-all">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider h-4 overflow-hidden truncate">
                  {softCalculatorExpr || '0'}
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400 truncate pt-1">
                  {softCalculatorResult !== null ? softCalculatorResult : (softCalculatorExpr.split(/[+\-*/]/).pop() || '0')}
                </div>
              </div>

              {/* Number/Operator Buttons */}
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {['C', 'DEL', '(', ')'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcBtn(btn)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded-lg transition-all hover:text-white cursor-pointer select-none"
                  >
                    {btn}
                  </button>
                ))}
                {['7', '8', '9', '/'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcBtn(btn)}
                    className="p-2.5 bg-zinc-950 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition-all cursor-pointer select-none"
                  >
                    {btn}
                  </button>
                ))}
                {['4', '5', '6', '*'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcBtn(btn)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition-all cursor-pointer select-none"
                  >
                    {btn}
                  </button>
                ))}
                {['1', '2', '3', '-'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcBtn(btn)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition-all cursor-pointer select-none"
                  >
                    {btn}
                  </button>
                ))}
                {['0', '.', '=', '+'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcBtn(btn)}
                    className={`p-2.5 rounded-lg transition-all font-bold cursor-pointer select-none ${
                      btn === '=' 
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-zinc-950' 
                        : 'bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 text-white'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#2dd4bf]/80 text-center uppercase font-bold tracking-wider pt-3 select-none">
                Soporta teclado numérico físico
              </p>
            </div>
          </div>
        )}

        {/* Modal 3: F9 (Contador de Caja y Monedas) */}
        {showSoftCoinsCounter && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
            <div className="bg-[#0e1014] border border-[#1b1d24] max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
              <button
                type="button"
                onClick={() => setShowSoftCoinsCounter(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="text-xs font-display font-black text-amber-400 uppercase tracking-widest select-none">
                    🪙 CONTROL DE CAJA CHICA (F9)
                  </h3>
                </div>
                <span className="text-[9px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                  Arqueo Rápido
                </span>
              </div>

              <p className="text-[10.5px] text-zinc-400 mb-4 leading-relaxed select-none font-sans">
                Herramienta para arqueo de caja chica. Introduzca las piezas por denominación para calcular el total acumulado de efectivo. En armonía con su hoja de desgloses.
              </p>

              {/* THREE-COLUMN GRID HEADER */}
              <div className="grid grid-cols-12 gap-3 text-center text-[10px] font-bold uppercase text-zinc-500 font-mono px-1 mb-2">
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
                    <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-zinc-900 border-zinc-600 text-zinc-300 w-full block text-center shadow-inner">
                      🪙 ${denom}
                    </span>
                  );
                  if (val === 1000) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-slate-900 border-slate-700 text-slate-300 w-full block text-center shadow-inner">
                        💵 $1,000
                      </span>
                    );
                  } else if (val === 500) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-amber-950/40 border-amber-800/60 text-amber-400 w-full block text-center shadow-inner">
                        💵 $500
                      </span>
                    );
                  } else if (val === 200) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-emerald-950/40 border-emerald-900/60 text-emerald-400 w-full block text-center shadow-inner">
                        💵 $200
                      </span>
                    );
                  } else if (val === 100) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-rose-950/45 border-rose-900/50 text-rose-400 w-full block text-center shadow-inner">
                        💵 $100
                      </span>
                    );
                  } else if (val === 50) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-fuchsia-950/40 border-fuchsia-900/50 text-fuchsia-400 w-full block text-center shadow-inner">
                        💵 $50
                      </span>
                    );
                  } else if (val === 20) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-teal-950/40 border-teal-900/55 text-teal-400 w-full block text-center shadow-inner">
                        💵 $20
                      </span>
                    );
                  } else if (val === 10) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-yellow-950/40 border-yellow-800/60 text-yellow-500 w-full block text-center shadow-inner">
                        🪙 $10
                      </span>
                    );
                  } else if (val === 0.5) {
                    badge = (
                      <span className="px-2 py-1 rounded text-[9.5px] font-black font-mono border bg-orange-950/20 border-orange-900/30 text-orange-400 w-full block text-center shadow-inner">
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
                          className="w-full text-center bg-[#07080a] border border-zinc-800/80 text-white rounded shadow-sm py-1 font-bold font-mono text-xs outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      {/* DENOM LABEL FRAME */}
                      <div className="col-span-4 flex justify-center">
                        {badge}
                      </div>

                      {/* COMPUTED SUB-IMPORTE */}
                      <div className="col-span-4">
                        <div className="w-full text-right bg-[#07080a]/60 border border-zinc-900 rounded py-1 pr-3 text-xs font-black font-mono text-amber-400">
                          ${(val * (Number(count) || 0)).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FOOTER */}
              <div className="border-t border-zinc-800 pt-4 mt-4 flex items-center justify-between">
                <div className="flex flex-col select-none">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest font-mono">Dinero Total</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
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
                    className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer select-none"
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
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                  >
                    Usar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showRepairSelectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowRepairSelectionModal(false)}>
            <div className="bg-[#121316] border border-zinc-700 max-w-2xl w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowRepairSelectionModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
                <Wrench className="w-5 h-5 text-violet-400 animate-pulse" />
                <h3 className="text-xs font-display font-black text-violet-400 uppercase tracking-widest select-none">
                  🔧 SELECCIONAR ORDEN DE SERVICIO (F3)
                </h3>
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
                  className="w-full bg-[#1e2026] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm focus:border-violet-500 focus:outline-none placeholder:text-zinc-500 text-white outline-none"
                  autoFocus
                />
              </div>

              {/* Orders Table */}
              <div className="overflow-x-auto max-h-[300px] border border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-800">
                      <th className="px-4 py-2.5">Ticket</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Equipo</th>
                      <th className="px-4 py-2.5">Estado</th>
                      <th className="px-4 py-2.5 text-right">Saldo</th>
                      <th className="px-4 py-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-xs">
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
                            <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 italic select-none">
                              No hay órdenes listas para entrega o devolución que coincidan con la búsqueda.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(o => {
                        const adv = getIndividualAdvance(o, orders);
                        const balance = Math.max(0, o.cost - adv);
                        const statusColor = o.status === 'Listo' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-amber-950/40 text-amber-400 border-amber-900/50';

                        return (
                          <tr key={o.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-violet-400">{o.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold">{o.customerName}</div>
                              <div className="text-[10px] text-zinc-500">{formatPhoneNumber(o.customerPhone)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold">{o.deviceBrand} {o.deviceModel}</div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[150px]" title={o.serviceType}>{o.serviceType}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-white">
                              {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => addRepairOrderToBasket(o)}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold rounded-lg cursor-pointer transition-all select-none text-[11px] uppercase tracking-wide"
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
        {/* Admin PIN Auth Modal — used by both retro and modern themes */}
        {showAdminAuthModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-200 w-full max-w-sm p-1 shadow-2xl rounded-xl font-sans text-slate-800 animate-scaleUp">
              {/* Title bar */}
              <div className="bg-gradient-to-r from-[#000080] to-[#1034a6] text-white px-3 py-2 flex items-center justify-between select-none rounded-t-lg">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  <span>Autenticación de Administrador</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAdminAuthModal(false); setPendingEditItemId(null); }}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer"
                >
                  X
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded shrink-0">
                    <Lock className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wide text-blue-900">
                      Acceso Restringido — Solo Administradores
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      La edición de precios en el carrito requiere autorización. Ingrese el PIN de cualquier usuario administrador registrado.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    PIN de Administrador (4 dígitos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={adminAuthPin}
                    onChange={(e) => {
                      setAdminAuthPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setAdminAuthError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdminAuthSubmit();
                      if (e.key === 'Escape') { setShowAdminAuthModal(false); setPendingEditItemId(null); }
                    }}
                    placeholder="••••"
                    className="w-full bg-white border-2 border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2.5 text-center text-xl font-mono font-black tracking-[0.5em] focus:outline-none transition-colors"
                    autoFocus
                  />
                  {adminAuthError && (
                    <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 animate-fadeIn">
                      <XCircle className="w-3 h-3" /> {adminAuthError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAdminAuthModal(false); setPendingEditItemId(null); }}
                    className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminAuthSubmit}
                    disabled={adminAuthPin.length < 4}
                    className="py-2 bg-[#000080] hover:bg-[#0000aa] text-white font-extrabold rounded-lg text-xs uppercase cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Autorizar
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center font-medium">
                  El precio modificado solo aplica a esta venta — el catálogo no se altera.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderFavoritesModal = () => {
    if (!showFavoritesModal) return null;

    const totalFavs = filteredFavoriteItems.length;
    const currentSelNum = totalFavs > 0 ? favSelectedIndex + 1 : 0;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn text-left select-none">
        <div className={`w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slideUp font-sans border ${
          isLight 
            ? 'bg-white border-zinc-200 text-zinc-800' 
            : 'bg-[#121316] border-zinc-800 text-white'
        }`}>
          
          {/* Header */}
          <div className={`px-6 py-3.5 flex items-center justify-between shrink-0 border-b ${
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#18191e] border-zinc-850'
          }`}>
            <div className="flex items-center gap-2.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <h3 className={`text-sm font-black tracking-wider uppercase font-sans ${isLight ? 'text-zinc-800-important' : 'text-white'}`}>
                ⭐ CATÁLOGO RÁPIDO DE FAVORITOS
              </h3>
            </div>
            <button
              onClick={() => setShowFavoritesModal(false)}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isLight 
                  ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Sub-header: Search, Dynamic Categories & Info */}
          <div className={`p-4 border-b space-y-3 shrink-0 ${
            isLight ? 'bg-zinc-100/70 border-zinc-200 text-zinc-800' : 'bg-[#18191e] border-zinc-850'
          }`}>
            {/* Buscador */}
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre, código SKU o categoría..."
                value={favSearchQuery}
                onChange={(e) => setFavSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs placeholder-zinc-500 focus:outline-none font-sans border ${
                  isLight 
                    ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' 
                    : 'bg-zinc-900 border-zinc-750 text-white focus:border-indigo-500/50'
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
                    ? 'bg-indigo-600 text-white-important font-black shadow-md'
                    : isLight 
                      ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold border border-zinc-300'
                      : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
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
                        ? 'bg-indigo-600 text-white-important font-black shadow-md'
                        : isLight 
                          ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold border border-zinc-300'
                          : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
                    }`}
                  >
                    📁 {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Instrucción igual al modal de búsqueda */}
            <p className={`text-xs font-medium leading-relaxed p-2.5 rounded-lg border ${
              isLight 
                ? 'bg-zinc-50 border-zinc-250 text-zinc-650' 
                : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
            }`}>
              Se encontraron <span className={`font-extrabold ${isLight ? 'text-indigo-700' : 'text-indigo-450'}`}>{totalFavs}</span> coincidencias. Navegue con las teclas <span className={`font-extrabold px-1.5 py-0.5 rounded border ${isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-800 font-sans' : 'bg-zinc-800 border-zinc-750 text-zinc-300'}`}>↑ ↓</span> y confirme con <span className={`font-extrabold px-1.5 py-0.5 rounded border font-mono ${isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-800' : 'bg-zinc-800 border-zinc-750 text-zinc-300'}`}>Enter</span> o con clic.
            </p>
          </div>

          {/* Tabla de Lista (Exactamente idéntica a Coincidencias de Búsqueda del Catálogo) */}
          <div className={`flex-1 overflow-hidden p-4 min-h-0 ${isLight ? 'bg-zinc-50/50' : 'bg-[#0c0d0f]'}`}>
            {totalFavs === 0 ? (
              <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                <Star className="w-12 h-12 opacity-20 text-amber-500" />
                <p className="text-sm font-semibold text-zinc-300">
                  {allFavoriteItems.length === 0 
                    ? 'No hay refacciones ni productos marcados como favoritos aún.' 
                    : 'No se encontraron artículos favoritos en esta categoría o búsqueda.'}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                  Puedes marcar cualquier pieza o producto como favorito en las pestañas de Stock o Refacciones haciendo clic en la estrella ⭐.
                </p>
              </div>
            ) : (
              <div id="pos-fav-modal-table-container" className={`border rounded-xl overflow-hidden max-h-[440px] overflow-y-auto ${
                isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-950'
              }`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[10px] select-none ${
                      isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}>
                      <th className={`px-4 py-2 border-r ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>Código</th>
                      <th className={`px-4 py-2 border-r ${isLight ? 'border-zinc-200' : 'border-zinc-800'} w-1/2`}>Nombre / Categoría</th>
                      <th className={`px-4 py-2 border-r ${isLight ? 'border-zinc-200' : 'border-zinc-800'} text-right`}>Precio</th>
                      <th className="px-4 py-2 text-center">Existencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                    {filteredFavoriteItems.map((item, idx) => {
                      const isStockControlled = item.manageStock !== false;
                      const currentStock = (isStockControlled && selectedSaleWarehouseId && selectedSaleWarehouseId !== 'all' && selectedSaleWarehouseId !== 'local')
                        ? (item.warehouseStock?.[selectedSaleWarehouseId] || 0)
                        : item.stock;
                      const isAgotado = isStockControlled && currentStock === 0;
                      const isSelected = idx === favSelectedIndex;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            addToBasket(item);
                            triggerToast?.('¡Agregado a la venta!', 'success');
                          }}
                          onMouseMove={() => { if (favSelectedIndex !== idx) setFavSelectedIndex(idx); }}
                          className={`cursor-pointer border-b ${
                            isLight
                              ? isSelected 
                                ? 'bg-indigo-950/40 text-white font-semibold pos-fav-row-selected border-zinc-900/80' 
                                : 'hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                              : isSelected 
                                ? 'bg-indigo-950/40 text-white font-semibold pos-fav-row-selected border-zinc-900/80' 
                                : 'hover:bg-zinc-900/30 text-zinc-350 border-zinc-900/80'
                          }`}
                        >
                          <td className={`px-4 py-2 border-r font-mono text-[10.5px] ${
                            isSelected 
                              ? 'text-indigo-300 font-extrabold border-l-4 border-indigo-500 pl-3' 
                              : isLight 
                                ? 'text-zinc-500 border-zinc-200' 
                                : 'text-zinc-400 font-bold border-zinc-800'
                          }`}>
                            {item.code || 'S/C'}
                          </td>
                          <td className={`px-4 py-2 border-r max-w-0 ${
                            isSelected 
                              ? 'text-white' 
                              : isLight 
                                ? 'text-zinc-800 border-zinc-200' 
                                : 'text-zinc-200 border-zinc-800'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <PosItemThumbnail imageUrl={item.imageUrl} extraImages={item.extraImages} name={item.name} code={item.code} category={item.category} price={item.price} currencySymbol={config.currencySymbol} size={32} />
                              <div className="flex-1 min-w-0 break-words whitespace-normal">
                                <span className={`block font-black uppercase text-[11.5px] font-sans break-words whitespace-normal ${
                                  isSelected 
                                    ? 'text-white font-extrabold' 
                                    : isLight 
                                      ? 'text-zinc-800-important' 
                                      : 'text-white'
                                }`}>{item.name}</span>
                                <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                                  isSelected 
                                    ? 'bg-white/20 text-white border-white/40' 
                                    : isLight 
                                      ? 'bg-zinc-200 text-zinc-600 border-zinc-300' 
                                      : 'bg-zinc-850 text-zinc-450 border-zinc-700'
                                }`}>
                                  {item.category || 'GENERAL'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-2 text-right font-mono font-black border-r text-sm ${
                            isSelected 
                              ? 'text-indigo-300' 
                              : isLight 
                                ? 'text-zinc-800-important border-zinc-200' 
                                : 'text-emerald-450 border-zinc-800'
                          }`}>
                            {config.currencySymbol}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-2 text-center ${
                            isSelected ? 'text-white' : ''
                          }`}>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isSelected
                                ? 'bg-white/25 text-white border border-white/40'
                                : !isStockControlled
                                ? isLight 
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                                  : 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/40'
                                : isAgotado
                                ? isLight 
                                  ? 'bg-rose-100 text-rose-700 border border-rose-250' 
                                  : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                                : isLight 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-250' 
                                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                            }`}>
                              {!isStockControlled ? '∞' : `${currentStock} disp`}
                            </span>
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
          <div className={`px-6 py-3 border-t flex items-center justify-between text-[11px] font-mono shrink-0 select-none ${
            isLight 
              ? 'bg-zinc-50 border-zinc-200 text-zinc-650' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            <span>[ESC] CERRAR</span>
            <span>SEL: <b className={`font-mono ${isLight ? 'text-indigo-700 font-black' : 'text-indigo-400 font-extrabold'}`}>#{currentSelNum} DE {totalFavs}</b></span>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div id="pos-view-root" className="flex-1 p-3 md:p-4 bg-[#0c0c0e] overflow-hidden lg:h-full flex flex-col space-y-3.5 text-zinc-200 select-none min-h-0">
      {/* Alerts / Receipts */}
      {lastSaleReceipt && (
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded-md shadow-lg flex items-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h5 className="font-bold">¡Venta {lastSaleReceipt} procesada con éxito!</h5>
            <p className="text-[10px] text-zinc-400 font-normal">El stock fue decrementado y se ingresó el dinero a la caja diaria.</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="premium-search-container animate-fadeIn shrink-0 select-none">
        {/* Magnifying glass */}
        <div className="flex items-center text-zinc-400 shrink-0">
          <Search className="w-5 h-5 text-zinc-400" />
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-6 bg-zinc-700/50 mx-4 shrink-0"></div>

        {/* Main search input */}
        <div className="relative flex-1 flex items-center h-full">
          {/* Dummy inputs to intercept Chrome autofill of credentials */}
          <input type="text" name="prevent_autofill_username" style={{ display: 'none' }} autoComplete="off" />
          <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} autoComplete="off" />
          <input
            type="text"
            ref={searchInputRef}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-autocomplete="none"
            data-lpignore="true"
            data-1p-ignore="true"
            placeholder="Escanee código de barras, descripción o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-search-input font-sans text-xs"
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
                  e.preventDefault();
                  setSearchQuery('');
                }
              } else {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-0 text-zinc-400 hover:text-zinc-200 transition-colors select-none cursor-pointer premium-search-icon-btn"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Selector de origen de venta */}
        {config.enableWarehouses === true && (
        <div className="ml-2 flex items-center gap-1.5 shrink-0 select-none">
          <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Vender desde:</span>
          <select
            value={selectedSaleWarehouseId}
            onChange={(e) => setSelectedSaleWarehouseId(e.target.value)}
            className="px-2.5 py-1 bg-zinc-900 border border-zinc-750 rounded text-xs text-white uppercase font-bold focus:outline-none focus:border-indigo-500/50 cursor-pointer transition-colors"
          >
            <option value="all">🌐 Todas las Bodegas</option>
            <option value="local">🏠 Tienda Local</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>🏢 {w.name}</option>
            ))}
          </select>
        </div>
        )}
        {savedSales.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSavedSalesListModal(true)}
            className="ml-4 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 rounded text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer animate-pulse shrink-0 select-none transition-colors"
          >
            📁 En Espera ({savedSales.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => { setFavSearchQuery(''); setFavSelectedCategory('TODAS'); setShowFavoritesModal(true); }}
          title="Ver catálogo rápido de productos y refacciones favoritas"
          className="ml-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors"
        >
          ⭐ Favoritos
        </button>
        <button
          type="button"
          onClick={() => { setSearchQuery(''); setModalCurrentPage(1); setModalSelectedIndex(0); setIsSearchModalOpen(true); }}
          title="Ver catálogo completo de productos y refacciones"
          className="ml-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors"
        >
          📂 Catálogo
        </button>
        <button
          type="button"
          onClick={() => { setPriceCheckerQuery(''); setPriceCheckerResults(null); setShowPriceChecker(true); }}
          title="Verificar precio de un artículo"
          className="ml-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none transition-colors"
        >
          🏷️ Precios
        </button>
      </div>

      {/* 2-State Core Workspace */}
      {basket.length === 0 ? (
        /* =========================================================
           IDLE STATE — LOGO + KEYBOARD SHORTCUTS PANEL
           ========================================================= */
        <div
          className="flex-1 bg-[#121316] border border-[#1b1c21] rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-8 md:gap-16 min-h-0 overflow-y-auto"
          onClick={() => {
            const now = Date.now();
            if (now - lastClickTimeRef.current < 350) {
              setShowQuickHistory(true);
            }
            lastClickTimeRef.current = now;
          }}
        >

          {/* Left: FIXMANAGER Logo */}
          <div className="flex items-center gap-4 select-none shrink-0 md:border-r md:border-dashed md:border-zinc-700/50 md:pr-12">

            {/* POS Icon */}
            <div className="relative w-24 h-28 flex flex-col items-center justify-center">
              <div className="w-16 h-12 bg-indigo-600 rounded border-2 border-indigo-700 flex items-center justify-center relative shadow-sm">
                <div className="w-12 h-8 bg-[#0d0d10] rounded-sm flex flex-col p-1 gap-1">
                  <div className="h-1.5 w-7 bg-emerald-500 rounded-sm"></div>
                  <div className="h-1 w-10 bg-zinc-700 rounded-sm"></div>
                  <div className="h-1 w-8 bg-zinc-700 rounded-sm"></div>
                </div>
                <div className="absolute -bottom-2 w-4 h-2 bg-zinc-600 border border-zinc-700"></div>
                <div className="absolute -bottom-3 w-8 h-1 bg-zinc-700 rounded-sm"></div>
              </div>
            </div>

            {/* FIXMANAGER typography */}
            <div className="leading-none flex flex-col select-none font-sans justify-center space-y-1">
              <span className="text-3xl md:text-4xl font-black text-indigo-400 tracking-tighter uppercase font-display leading-none">
                FIXMANAGER
              </span>
              <span className="text-[10px] font-mono font-black tracking-widest text-zinc-500 uppercase pt-0.5 leading-none">
                POS / SERVICIOS
              </span>
            </div>
          </div>

          {/* Right: Keyboard Shortcuts Panel */}
          <div className="bg-[#0d0d10] border border-[#1b1c21] p-5 rounded-2xl shadow-inner max-w-sm w-full shrink-0 flex flex-col space-y-4 relative">
            <div className="flex items-center justify-between border-b border-[#1b1c21] pb-2 mb-0.5 select-none text-[10px]">
              <span className="font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                ⌨️ Guía de Atajos Físicos
              </span>
              <span className="text-zinc-500 font-mono font-bold uppercase tracking-widest">
                FIXMANAGER
              </span>
            </div>

            <div className="flex flex-col space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {[
                { key: 'F2', label: 'Clientes', action: 'Asignar cliente o referencia', color: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 shadow-[0_2px_0_rgba(99,102,241,0.3)]' },
                { key: 'F5', label: 'Finalizar venta', action: 'Cobrar actual cesta de compras', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-[0_2px_0_rgba(5,150,105,0.3)]' },
                { key: 'F10', label: 'Guardar venta', action: 'Mandar venta activa a espera', color: 'bg-blue-950/60 text-blue-300 border-blue-500/40 shadow-[0_2px_0_rgba(12,102,228,0.3)]' },
                { key: 'X', label: 'Cancelar', action: 'Vaciar cesta o cerrar menús', color: 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-[0_2px_0_rgba(225,29,72,0.3)]' },
                { key: 'F6', label: 'Calculadora', action: 'Herramienta de cálculo rápido', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-[0_2px_0_rgba(6,182,212,0.3)]' },
                { key: 'F9', label: 'Contador', action: 'Caja chica y conteo de caja', color: 'bg-purple-950/60 text-purple-300 border-purple-500/40 shadow-[0_2px_0_rgba(147,51,234,0.3)]' },
                { key: '2×', label: 'Últimas ventas', action: 'Doble click — ver y gestionar las últimas 10 ventas', color: 'bg-zinc-800 text-zinc-300 border-zinc-600 shadow-[0_2px_0_rgba(113,113,122,0.3)]' },
                { key: 'Ctrl +/-', label: 'Escala / Zoom', action: 'Ampliar o reducir escala de pantalla', color: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-[0_2px_0_rgba(245,158,11,0.3)]' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-[#121316] border border-[#1b1c21] rounded-xl shadow-sm select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className={`min-w-[40px] text-center font-mono font-black text-[10px] leading-tight select-none uppercase tracking-wide border rounded px-1.5 py-1 ${item.color}`}>
                      {item.key}
                    </span>
                    <div className="flex flex-col select-none">
                      <span className="text-[11px] font-extrabold text-zinc-200 uppercase tracking-tight leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[9.5px] text-zinc-500 leading-none pt-0.5 font-medium">
                        {item.action}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-zinc-600 text-center uppercase tracking-wider font-extrabold pt-1">
              ✦ Presione las teclas físicas de su sistema para accionar ✦
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================
           CART STATE — ACTIVE TRANSACTION
           ========================================================= */
        <div className="flex-1 flex flex-col min-h-0 bg-[#121316] border border-[#1b1c21] rounded-lg p-3 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-[#1b1c21] mb-2 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                🛒 COMPROBANTE DE VENTA / CARRO ACTUAL ({basketTotalItems} {basketTotalItems === 1 ? 'artículo' : 'artículos'})
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* TOGGLE ¿ES COTIZACIÓN? */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="quote-active-chk-modern-header"
                  checked={isQuoteMode}
                  onChange={(e) => setIsQuoteMode(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="quote-active-chk-modern-header" className="text-[10px] uppercase font-black tracking-wider text-amber-500 cursor-pointer select-none">
                  ¿Es Cotización?
                </label>
              </div>

              {/* Botón de alternar posición del Total */}
              <button
                type="button"
                onClick={togglePosTotalPosition}
                title={`Cambiar posición del total (Actualmente: ${posTotalPosition === 'top' ? 'Arriba a la derecha' : 'Abajo'})`}
                className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg bg-[#1a1b20] hover:bg-[#25262c] text-zinc-400 border border-[#2e3038] transition-all cursor-pointer flex items-center gap-1 select-none"
              >
                ↕️ Total {posTotalPosition === 'top' ? 'Arriba' : 'Abajo'}
              </button>

              {/* Total Card if Top */}
              {posTotalPosition === 'top' && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg border shadow-sm bg-indigo-950/40 border-indigo-700/50 text-indigo-200 select-none">
                  <span className="text-[10px] font-bold uppercase opacity-70 tracking-wider">TOTAL:</span>
                  <span className="text-xl font-black font-mono tracking-tight text-indigo-400">
                    {config.currencySymbol}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Main Basket Table */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d0d10] border-b border-[#1b1c21] text-zinc-400 font-bold uppercase tracking-wider text-[10px] leading-tight select-none">
                  <th className="px-3 py-1 w-28">Código</th>
                  <th className="px-3 py-1 w-full">Artículo / Descripción</th>
                  <th className="px-3 py-1 text-center w-24">Cantidad</th>
                  <th className="px-3 py-1 text-right w-36 whitespace-nowrap">Precio Unit.</th>
                  <th className="px-3 py-1 text-right w-28 whitespace-nowrap">Subtotal</th>
                  <th className="px-3 py-1 text-center w-12">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1c21] animate-fadeIn">
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
                      isOutOfStock ? 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-100 border-l-amber-600' :
                      isInsufficient ? 'bg-amber-950/20 hover:bg-amber-900/20 text-amber-100 border-l-amber-500' :
                      'hover:bg-white/[0.03] text-zinc-200 border-l-transparent'
                    }`}>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-zinc-500 truncate max-w-[112px]" title={item.item.code || 'S/C'}>
                        {item.item.code || 'S/C'}
                      </td>
                      <td className="px-3 py-1.5 font-sans uppercase text-[11px] text-zinc-100 font-bold max-w-0 w-full">
                        <div className="flex items-center gap-2.5 w-full min-w-0">
                          <PosItemThumbnail imageUrl={item.item.imageUrl} name={item.item.name} code={item.item.code} category={item.item.category} price={currentPrice - discountAmount} currencySymbol={config.currencySymbol} size={30} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2 w-full">
                              <div className="flex flex-col min-w-0">
                                <span className="block whitespace-normal break-words leading-tight">{item.item.name}</span>
                                {item.chipActivation && (
                                  <div className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg w-fit select-none">
                                    <span>📞 {item.chipActivation.chipNumber}</span>
                                    <span className="text-zinc-700">|</span>
                                    <span>👤 {item.chipActivation.clientName}</span>
                                    {item.chipActivation.iccid && (
                                      <>
                                        <span className="text-zinc-700">|</span>
                                        <span>SIM: {item.chipActivation.iccid}</span>
                                      </>
                                    )}
                                    {item.chipActivation.imei && (
                                      <>
                                        <span className="text-zinc-700">|</span>
                                        <span>IMEI: {item.chipActivation.imei}</span>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingChipBasketItem(item)}
                                      className="text-indigo-400 hover:text-indigo-350 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                )}
                                {item.item.isChip === true && !item.chipActivation && (
                                  <div className="text-[10px] font-mono font-bold text-zinc-400 flex items-center gap-1.5 mt-0.5 bg-zinc-800/40 border border-zinc-700/50 px-2 py-0.5 rounded-lg w-fit select-none">
                                    <span>⚠️ Sin Registrar (Venta Normal)</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingChipBasketItem(item)}
                                      className="text-indigo-450 hover:text-indigo-400 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
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
                            <div className="text-[9px] text-zinc-500 font-normal capitalize flex items-center gap-2 mt-0.5 select-none flex-wrap">
                              <span>{item.item.brand} · {item.item.category}</span>
                              {item.fromWarehouseId ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 select-none">
                                  🏢 {warehouses.find(w => w.id === item.fromWarehouseId)?.name || 'Bodega'}
                                </span>
                              ) : (
                                config.enableWarehouses === true && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 select-none">
                                    🏠 Tienda Local
                                  </span>
                                )
                              )}
                              {isStockControlled ? (
                                availableStock > 0 ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none">
                                    Stock: {availableStock} {availableStock === 1 ? 'pza' : 'pzas'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-450 select-none">
                                    Sin Stock
                                  </span>
                                )
                              ) : (
                                <span className="text-[9px] font-semibold bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 px-1.5 py-0.2 rounded-md select-none">
                                  Ilimitado
                                </span>
                              )}
                              {item.item.wholesalePrice !== undefined && item.item.wholesalePrice > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleBasketItemPriceType(rowId)}
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all cursor-pointer border select-none leading-none ${
                                    (item.priceType || saleType) === 'mayoreo'
                                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-450 hover:bg-indigo-500/20 shadow-sm'
                                      : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/60 shadow-sm'
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
                          <button
                            type="button"
                            onClick={() => updateQuantity(rowId, -1)}
                            title="Restar 1 de este artículo"
                            className="w-6 h-6 rounded bg-[#0d0d10] hover:bg-[#1b1c21] hover:text-zinc-100 text-zinc-400 flex items-center justify-center cursor-pointer font-black border border-[#2d2f36] shadow-sm active:scale-95 text-xs select-none"
                          >
                            -
                          </button>
                          <span className="font-mono text-zinc-200 font-black w-6 text-center text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(rowId, 1)}
                            title="Sumar 1 de este artículo"
                            className="w-6 h-6 rounded bg-[#0d0d10] hover:bg-[#1b1c21] hover:text-zinc-100 text-zinc-400 flex items-center justify-center cursor-pointer font-black border border-[#2d2f36] shadow-sm active:scale-95 text-xs select-none"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-300">
                        {editingDiscountItemId === rowId ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[9px] text-zinc-500 font-bold select-none">
                              Base: {config.currencySymbol}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                className="w-12 text-right bg-[#0d0d10] border border-[#2d2f36] rounded px-1 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                              <select
                                value={editingDiscountType}
                                onChange={(e) => setEditingDiscountType(e.target.value as 'percentage' | 'fixed')}
                                className="bg-[#0d0d10] border border-[#2d2f36] rounded text-white text-[10px] py-0.5 font-bold focus:outline-none"
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">{config.currencySymbol}</option>
                              </select>
                            </div>
                          </div>
                        ) : editingItemId === rowId ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-500">{config.currencySymbol}</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onBlur={() => handleSavePrice(rowId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(rowId);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              className="w-20 text-right bg-[#0d0d10] border border-[#2d2f36] rounded px-1 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 group whitespace-nowrap">
                            {/* Botones de acción (visibles solo en hover a la izquierda para mantener alineación) */}
                            <div className="hidden group-hover:flex items-center gap-1 mr-1">
                              <button
                                type="button"
                                onClick={() => handleRequestEditPrice(rowId, currentPrice)}
                                className="text-zinc-500 hover:text-indigo-400 cursor-pointer"
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
                                className="text-zinc-500 hover:text-red-400 cursor-pointer"
                                title="Descuento (Se refleja en el ticket)"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Contenedor de precio y badges */}
                            <div className="flex flex-col items-end">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.customPrice !== undefined && (
                                  <span className="text-[9px] text-amber-400 font-bold bg-amber-950/30 border border-amber-500/20 px-0.5 rounded">MOD</span>
                                )}
                                {item.lineDiscountValue !== undefined && item.lineDiscountValue > 0 ? (
                                  <>
                                    <span className="line-through text-zinc-500 text-xs">
                                      {config.currencySymbol}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-zinc-500 text-xs mx-0.5">-</span>
                                    <span className="text-red-400 font-semibold text-xs">
                                      {item.lineDiscountType === 'percentage' ? `${item.lineDiscountValue}%` : `${config.currencySymbol}${item.lineDiscountValue}`}
                                    </span>
                                    <span className="text-zinc-500 text-xs mx-0.5">=</span>
                                    <span className="text-zinc-200 font-bold">
                                      {config.currencySymbol}{(currentPrice - discountAmount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </>
                                ) : (
                                  <span className={item.customPrice !== undefined ? 'text-amber-400 font-black' : ''}>
                                    {config.currencySymbol}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              {item.quantity > 1 && item.lineDiscountValue !== undefined && item.lineDiscountValue > 0 && (
                                <span className="text-[9px] text-zinc-500 font-medium select-none mt-0.5">
                                  (Desc. total: -{config.currencySymbol}{(discountAmount * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-extrabold text-emerald-400 text-xs text-nowrap">
                        {config.currencySymbol}{((currentPrice - discountAmount) * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromBasket(rowId)}
                          className="p-1 px-2 border border-[#1b1c21] hover:border-red-500/40 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 rounded-md transition-all cursor-pointer inline-flex items-center justify-center active:scale-90"
                          title="Eliminar del ticket"
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

          <div className="mt-2 pt-2 border-t border-[#1b1c21] flex justify-between items-center select-none shrink-0 font-sans text-[10px] text-zinc-500">
            <span>Para finalizar esta venta, presione el botón <strong className="text-zinc-300">Cobrar</strong> o la tecla <strong className="text-zinc-300">F5</strong> del teclado.</span>
            <span className="font-mono uppercase text-zinc-500 font-bold bg-[#0d0d10] border border-[#1b1c21] px-1.5 py-0.5 rounded">DOCUMENTO DE VENTA ACTIVO</span>
          </div>
        </div>
      )}

      {/* Pinned bottom bar — Totalizer and Action buttons */}
      <div className="bg-[#121316] border border-[#1b1c21] text-xs text-zinc-200 flex items-center justify-between shadow-sm px-4 py-2.5 rounded-lg shrink-0 select-none">
        <div className="flex items-center gap-4">
          {posTotalPosition !== 'top' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest font-sans select-none leading-none pt-0.5">
                Total:
              </span>
              <span className="text-2xl md:text-3xl font-black text-indigo-400 font-mono tracking-tighter leading-none select-none">
                {config.currencySymbol}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Selector de Tipo de Venta (Público / Mayoreo) */}
          <div className="flex bg-[#0b0c0e] border border-[#23252f] rounded-full p-0.5 font-sans select-none shrink-0">
            <button
              type="button"
              onClick={() => setSaleType('publico')}
              className={`px-3 py-1 text-[10px] uppercase font-black rounded-full transition-all cursor-pointer ${
                saleType === 'publico'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Público
            </button>
            <button
              type="button"
              onClick={() => setSaleType('mayoreo')}
              className={`px-3 py-1 text-[10px] uppercase font-black rounded-full transition-all cursor-pointer ${
                saleType === 'mayoreo'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mayoreo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isQuoteMode && (
            <>
              <button
                type="button"
                disabled={basket.length === 0}
                onClick={handleSaveSaleForLater}
                title="Guardar venta actual para después [F10]"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-blue-800/80"
              >
                <span className="hidden sm:inline">Guardar</span> <span className="font-mono font-normal text-[9px] bg-black/20 px-1 py-0.5 rounded text-blue-100">[F10]</span>
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
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={handleCheckout}
              title="Finalizar la venta actual y registrar el pago [F5]"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-emerald-700"
            >
              <span className="hidden sm:inline">Cobrar</span> <span className="font-mono font-normal text-[9px] bg-black/20 px-1 py-0.5 rounded text-emerald-100">[F5]</span>
            </button>
          )}
          <button
            type="button"
            disabled={basket.length === 0}
            onClick={() => setShowCancelConfirm(true)}
            title="Cancelar y vaciar todos los artículos agregados al carrito [X]"
            className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b border-red-800/80"
          >
            <span className="hidden sm:inline">Cancelar</span> <span className="font-mono font-normal text-[9px] bg-black/20 px-1 py-0.5 rounded text-red-100">[X]</span>
          </button>
        </div>
      </div>

      {/* Sale Confirmation Modal */}
      {showSaleConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl shadow-2xl flex flex-col font-sans overflow-hidden select-none rounded-xl border ${
            isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#121318] border border-zinc-600 text-gray-200'
          }`}>
            {/* HEADER CONTAINER (ROYAL DECORATION IN DARK OR MODERN THEME) */}
            <div className={`p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b ${
              isLight ? 'bg-zinc-55/80 border-zinc-200 text-zinc-850' : 'bg-[#11131e] text-white border-zinc-600'
            }`}>
              <div className="space-y-0.5 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded border select-none ${
                    isLight ? 'bg-indigo-50 border-indigo-250 text-indigo-750' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    Cliente / Venta Pos
                  </span>
                  <h3 className={`text-sm font-black tracking-tight uppercase truncate max-w-xs ${
                    isLight ? 'text-zinc-800' : 'text-white'
                  }`}>
                    {saveSaleLabel || 'PÚBLICO GENERAL'}
                  </h3>
                </div>
                <p className={`text-[10px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-300'}`}>
                  IDENTIFICADOR: {saveSaleLabel ? 'ASIGNADO' : 'S/N'} | PUNTOS: 0 PTS
                </p>
              </div>
              {/* BIG GIGANTIC DIGITAL COUNTBOARD */}
              <div className={`flex items-center gap-2.5 px-4 py-2 border rounded-lg text-right min-w-[220px] justify-between md:justify-end ${
                isLight ? 'bg-zinc-100 border-zinc-305' : 'bg-black/80 border-zinc-700/80'
              }`}>
                <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-zinc-600 font-bold' : 'text-zinc-400'}`}>Monto Cobrado:</span>
                <div className={`text-xl md:text-2xl font-mono font-black tracking-widest drop-shadow-sm ${
                  isLight ? 'text-indigo-750' : 'text-[#22d3ee]'
                }`}>
                  {config.currencySymbol}{(payCash + payCard).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de {config.currencySymbol}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* ACTION KEYS QUICK STAT BAR */}
            <div className={`px-4 py-2 border-b text-[10px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 select-none font-bold ${
              isLight ? 'bg-zinc-100/50 border-zinc-200 text-zinc-600' : 'bg-[#13151b] text-zinc-300 border-zinc-600'
            }`}>
              <span className={isLight ? 'text-zinc-450 uppercase' : 'text-zinc-50 uppercase'}>Teclas Rápidas:</span>
              <span>[F2] {posShouldPrintTicket ? '✔' : '❌'} Imprimir Ticket</span>
              <span>[F5] Confirmar Venta</span>
            </div>

            {/* ACTIVE VALUE SLOTS */}
            <div className={`p-5 space-y-4.5 max-h-[60vh] overflow-y-auto scrollbar-thin ${
              isLight ? 'bg-zinc-50/50 text-zinc-800' : 'bg-[#0a0b0e] text-zinc-200'
            }`}>
              {/* INPUT FIELDS LIST */}
              <div className="space-y-4">
                <h4 className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Distribuya el importe de cobro del cliente:
                </h4>

                {/* 1. CASH INPUT CARD */}
                <div className={`border p-4 rounded-xl flex items-center justify-between gap-4 hover:border-zinc-700 transition-all shadow-inner ${
                  isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-[#12141c] border border-zinc-800'
                }`}>
                  <div className="flex items-center gap-3.5 max-w-sm w-full">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none border ${
                      isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                    }`}>
                      🪙
                    </div>
                    <div>
                      <span className={`block text-xs font-extrabold leading-none ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                        MXN Efectivo Received
                      </span>
                      <span className={`text-[9.5px] font-mono ${isLight ? 'text-zinc-600 leading-tight block mt-0.5' : 'text-zinc-400'}`}>Monedas o billetes físicos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-base font-black text-zinc-450">{config.currencySymbol}</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={payCash || ''}
                        placeholder="0.00"
                        onChange={(e) => setPayCash(Number(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className={`w-48 border focus:outline-none rounded-lg px-3 pl-8 py-2.5 text-base font-mono font-black text-right shadow-sm ${
                          isLight 
                            ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500' 
                            : 'bg-[#07080b] border border-zinc-700 focus:border-indigo-500 text-yellow-400'
                        }`}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* 2. CARD INPUT CARD */}
                <div className={`border p-4 rounded-xl flex flex-col gap-3 hover:border-zinc-700 transition-all shadow-inner ${
                  isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-[#12141c] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 max-w-sm w-full">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none border ${
                        isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                      }`}>
                        💳
                      </div>
                      <div>
                        <span className={`block text-xs font-extrabold leading-none ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                          Terminal de Tarjeta (TDC/TDB)
                        </span>
                        <span className={`text-[9.5px] font-mono ${isLight ? 'text-zinc-600 leading-tight block mt-0.5' : 'text-zinc-400'}`}>Terminal bancaria o agregador</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-base font-black text-zinc-450">{config.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={payCard || ''}
                          placeholder="0.00"
                          onChange={(e) => setPayCard(Number(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`w-48 border focus:outline-none rounded-lg px-3 pl-8 py-2.5 text-base font-mono font-black text-right shadow-sm ${
                            isLight 
                              ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-500' 
                              : 'bg-[#07080b] border border-zinc-700 focus:border-indigo-500 text-yellow-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`mt-1.5 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 items-center border ${
                    isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#080b12] border-zinc-800'
                  }`}>
                    <span className={`text-[9.5px] uppercase font-black ${isLight ? 'text-zinc-650' : 'text-zinc-300'}`}>
                      Referencia o Folio de Terminal TDC/TDB (Opcional):
                    </span>
                    <input
                      type="text"
                      value={cardCode}
                      placeholder="Folio de voucher terminal..."
                      onChange={(e) => setCardCode(e.target.value)}
                      className={`border focus:outline-none rounded px-3 py-1.5 text-xs font-mono font-black w-full ${
                        isLight 
                          ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' 
                          : 'bg-black/50 border border-zinc-700 focus:border-indigo-500 text-zinc-100'
                      }`}
                    />
                  </div>
                </div>

                {/* 3. DISCOUNT INPUT CARD */}
                <div className={`border p-4 rounded-xl flex flex-col gap-3 hover:border-zinc-700 transition-all shadow-inner ${
                  isLight ? 'bg-white border-zinc-200 hover:border-zinc-300' : 'bg-[#12141c] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 max-w-sm w-full">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none border ${
                        isLight ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                      }`}>
                        🏷️
                      </div>
                      <div>
                        <span className={`block text-xs font-extrabold leading-none ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                          Descuento a la Venta
                        </span>
                        <span className={`text-[9.5px] font-mono ${isLight ? 'text-zinc-600 leading-tight block mt-0.5' : 'text-zinc-400'}`}>Descuento global en esta venta</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="discount-active-chk"
                        checked={discountEnabled}
                        onChange={(e) => {
                          setDiscountEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setDiscountValue(0);
                          }
                        }}
                        className="w-4.5 h-4.5 accent-purple-500 cursor-pointer"
                      />
                      <label htmlFor="discount-active-chk" className={`text-xs font-black cursor-pointer select-none ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                        Habilitar
                      </label>
                    </div>
                  </div>

                  {discountEnabled && (
                    <div className={`mt-1.5 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 items-center border ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#080b12] border-zinc-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9.5px] uppercase font-black ${isLight ? 'text-zinc-650' : 'text-zinc-300'}`}>Tipo:</span>
                        <select
                          value={discountType}
                          onChange={(e) => {
                            setDiscountType(e.target.value as 'percentage' | 'fixed');
                            setDiscountValue(0);
                          }}
                          className={`border focus:outline-none rounded px-2.5 py-1 text-xs font-black ${
                            isLight 
                              ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' 
                              : 'bg-black/50 border border-zinc-700 focus:border-indigo-500 text-zinc-100'
                          }`}
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Cantidad Fija ($)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9.5px] uppercase font-black ${isLight ? 'text-zinc-650' : 'text-zinc-300'}`}>
                          {discountType === 'percentage' ? 'Porcentaje:' : 'Cantidad:'}
                        </span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1 text-xs font-bold text-zinc-450">
                            {discountType === 'percentage' ? '%' : config.currencySymbol}
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
                            className={`border focus:outline-none rounded px-2.5 pl-6 py-1 text-xs font-mono font-black w-full ${
                              isLight 
                                ? 'bg-white border-zinc-305 text-zinc-900 focus:border-indigo-500' 
                                : 'bg-black/50 border border-zinc-700 focus:border-indigo-500 text-zinc-100'
                            }`}
                          />
                        </div>
                      </div>

                      {/* QUICK PERCENTAGE BUTTONS (Only if type is percentage) */}
                      {discountType === 'percentage' && (
                        <div className={`col-span-1 sm:col-span-2 flex items-center gap-2 pt-1 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                          <span className={`text-[9px] uppercase font-black ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>Atajos:</span>
                          {[5, 10, 15, 20].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountValue(pct)}
                              className="px-2 py-0.5 text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 hover:text-purple-700 border border-purple-500/20 hover:border-purple-500/40 rounded transition-all cursor-pointer font-bold"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* STATUS CARD SUMMARY */}
              {(() => {
                const totalReceived = payCash + payCard;
                const isComplete = totalReceived >= basketTotal;
                const difference = Math.abs(totalReceived - basketTotal);
                const hasChange = isComplete && difference > 0.005;

                return (
                  <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono transition-all duration-300 ${
                    hasChange
                      ? 'bg-emerald-950/40 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : isLight 
                        ? 'bg-zinc-50 border border-zinc-250 text-zinc-800'
                        : 'bg-[#11131c] border border-zinc-600'
                  }`}>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      <span>ESTADO DEL PAGO:</span>
                      {isComplete ? (
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-black text-[10px]">
                          PAGO DISPONIBLE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded font-black text-[10px] animate-pulse">
                          MONTO INCOMPLETO
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {isComplete ? (
                        hasChange ? (
                          <span className="inline-block px-3.5 py-2 bg-emerald-500 text-black font-mono font-black text-sm sm:text-base rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-[pulse_1.5s_infinite] select-none">
                            CAMBIO AL CLIENTE: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className={`text-sm font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                            CAMBIO AL CLIENTE: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )
                      ) : (
                        <span className={`text-sm font-black animate-pulse ${isLight ? 'text-rose-700 font-extrabold' : 'text-rose-400'}`}>
                          FALTANTE POR COBRAR: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* COLLAPSIBLE FOR SALE NOTE */}
              <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800 bg-[#11131c]/50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowNoteOption(!showNoteOption)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none ${
                    isLight ? 'text-zinc-500 hover:text-zinc-850 hover:bg-zinc-150/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/20'
                  }`}
                >
                  <span>{showNoteOption ? '[-] Ocultar Nota del Ticket' : '[+] Agregar Nota al Ticket de Venta'}</span>
                  <span className="text-xs">
                    {showNoteOption ? '▲' : '▼'}
                  </span>
                </button>

                {showNoteOption && (
                  <div className={`p-3.5 border-t space-y-2 ${
                    isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-[#0a0b0e]'
                  }`}>
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-650' : 'text-zinc-500'}`}>Nota / Observación para el Ticket:</label>
                    <textarea
                      value={saleNote}
                      onChange={(e) => setSaleNote(e.target.value)}
                      placeholder="Ej. Se entrega revisado, con garantía de 30 días, etc."
                      className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                        isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:bg-white' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                      }`}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* ACCORDION/COLLAPSIBLE FOR SPECIAL OPTIONS */}
              <div className={`border rounded-xl overflow-hidden transition-all duration-350 ${
                isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-850 bg-[#11131c]/50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowSpecialOptions(!showSpecialOptions)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none ${
                    isLight ? 'text-zinc-500 hover:text-zinc-855 hover:bg-zinc-150/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/20'
                  }`}
                >
                  <span>{showSpecialOptions ? 'Ocultar Opciones de Cobro' : 'Opciones Especiales (Fiar / Apartar)'}</span>
                  <span className="text-xs transition-transform duration-200">
                    {showSpecialOptions ? '▲' : '▼'}
                  </span>
                </button>

                {showSpecialOptions && (
                  <div className={`p-3.5 border-t flex flex-col sm:flex-row gap-2.5 ${
                    isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800/80 bg-[#0a0b0e]'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setShowSpecialOptions(false); openFiarModal(); }}
                      title="Registrar esta venta como cuenta por cobrar / fiado [F6]"
                      className={`flex-1 py-2.5 border font-extrabold text-[10px] sm:text-xs rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isLight 
                          ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100/50' 
                          : 'bg-orange-500/10 hover:bg-orange-500/25 border-orange-500/30 hover:border-orange-500 text-orange-400'
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
                      className={`flex-1 py-2.5 border font-extrabold text-[10px] sm:text-xs rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        isLight 
                          ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/50' 
                          : 'bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/30 hover:border-purple-500 text-purple-400'
                      }`}
                    >
                      📦 Apartar Productos
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LOWER COMMAND STEERING PANEL */}
            <div className={`px-5 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#11131e] text-zinc-305 border-zinc-600'
            }`}>
              
              {/* LEFT FOOTER CONTAINER: CHECKBOX & SPECIAL METHODS */}
              <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto justify-start">
                {/* CHECKBOX IMPRESION */}
                <div className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all">
                  <input 
                    type="checkbox" 
                    id="pos-check-print-ticket-modern"
                    checked={posShouldPrintTicket}
                    onChange={(e) => setPosShouldPrintTicket(e.target.checked)}
                    className={`w-5 h-5 accent-emerald-500 cursor-pointer shrink-0 ${
                      isLight ? 'bg-white border-zinc-300' : 'bg-[#07080b] border-zinc-700'
                    }`}
                  />
                  <label htmlFor="pos-check-print-ticket-modern" className={`text-[10px] sm:text-xs font-black cursor-pointer uppercase tracking-normal select-none ${
                    isLight ? 'text-zinc-750' : 'text-[#cbcbcb]'
                  }`}>
                    Imprimir ticket <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>[F2]</span>
                  </label>
                </div>
              </div>

              {/* RIGHT FOOTER CONTAINER: PRIMARY ACTIONS */}
              <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSaleConfirm(false)}
                  className={`flex-1 sm:flex-none uppercase px-2.5 sm:px-6 py-2.5 text-white font-extrabold text-[10px] sm:text-xs tracking-wider cursor-pointer rounded-lg transition-all active:scale-98 shadow-sm text-center ${
                    isLight ? 'bg-rose-600 hover:bg-rose-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Cancelar
                </button>

                {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                  <button
                    type="button"
                    onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : () => executeSale({ shareWA: true })}
                    disabled={(!isWaIntegratedOffline && (payCash + payCard < basketTotal)) || (posRegisterChipActivation && (!posActivationClientName.trim() || posActivationPhone.trim().length < 10))}
                    title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Cobrar venta sin imprimir papel y enviarlo por WhatsApp"}
                    className={`flex-1 sm:flex-none uppercase px-3.5 sm:px-5 py-2.5 rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center whitespace-nowrap ${
                      isWaIntegratedOffline 
                        ? 'bg-zinc-500 hover:bg-zinc-650 text-zinc-300 border border-zinc-600 grayscale cursor-pointer'
                        : 'bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold border border-[#25D366]/50 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Cobrar y WA
                  </button>
                )}

                <button
                  type="button"
                  onClick={executeSale}
                  disabled={payCash + payCard < basketTotal || (posRegisterChipActivation && (!posActivationClientName.trim() || posActivationPhone.trim().length < 10))}
                  title="Confirmar pago y finalizar venta [F5]"
                  className="flex-1 sm:flex-none uppercase px-3.5 sm:px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs tracking-wider cursor-pointer rounded-lg shadow-md flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-center whitespace-nowrap"
                >
                  Cobrar [F5]
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Fiar */}
      {showFiarModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowFiarModal(false); setShowSaleConfirm(true); setActiveSearchField(null); }}>
          <div className="w-full max-w-sm mx-4 bg-[#121318] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => { e.stopPropagation(); setActiveSearchField(null); }}>
            <div className="bg-[#11131e] px-4 py-3 flex items-center justify-between border-b border-zinc-800">
              <span className="font-black text-sm uppercase tracking-widest text-white">💳 Registrar Fiado</span>
              <button onClick={() => { setShowFiarModal(false); setShowSaleConfirm(true); setActiveSearchField(null); }} className="text-zinc-400 hover:text-white font-black text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {fiarExistingAccount ? (
                /* Cuenta Existente Detectada: Resumen Claro */
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Confirmar Cargo en Cuenta Existente</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Cliente:</span>
                      <span className="font-extrabold text-white">{fiarExistingAccount.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Teléfono:</span>
                      <span className="font-bold text-white">{fiarExistingAccount.clientPhone}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800/80 pt-1.5">
                      <span className="text-zinc-500">Saldo Anterior:</span>
                      <span className="font-bold text-white">{config.currencySymbol || '$'}{fiarExistingAccount.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nuevo Cargo:</span>
                      <span className="font-extrabold text-orange-400">+{config.currencySymbol || '$'}{(basketTotal - (Number(fiarInitialPayment) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {fiarInitialPayment && Number(fiarInitialPayment) > 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-400">
                        <span>Anticipo ({fiarInitialMethod}):</span>
                        <span>-{config.currencySymbol || '$'}{Number(fiarInitialPayment).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                     {/* Detalle del Cargo */}
                    <div className="border-t border-zinc-800/80 pt-1.5 space-y-1">
                      <span className="text-[9px] font-black uppercase text-zinc-500 block">Detalle del cargo:</span>
                      <div className="max-h-20 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
                        {basket.map((bi, index) => {
                          const price = bi.customPrice ?? bi.item.price;
                          return (
                            <div key={index} className="flex justify-between text-[10.5px]">
                              <span className="text-zinc-350 truncate max-w-[210px]">{bi.quantity}x {bi.item.name}</span>
                              <span className="text-zinc-400 font-mono">{config.currencySymbol || '$'}{(price * bi.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800/80 pt-1.5 text-sm font-black">
                      <span className="text-zinc-400">Nuevo Saldo Total:</span>
                      <span className="text-white">{config.currencySymbol || '$'}{(fiarExistingAccount.balance + basketTotal - (Number(fiarInitialPayment) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Crear Nuevo Fiado: Inputs normal */
                <>
                  <div className="text-xs font-bold text-zinc-400">Total a fiar: <span className="font-black text-white">{config.currencySymbol || '$'}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  {/* Detalle del Cargo */}
                  <div className="mt-1 space-y-1 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] font-black uppercase text-zinc-500 block">Detalle del cargo:</span>
                    <div className="max-h-16 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
                      {basket.map((bi, index) => {
                        const price = bi.customPrice ?? bi.item.price;
                        return (
                          <div key={index} className="flex justify-between text-[10.5px]">
                            <span className="text-zinc-400 truncate max-w-[210px]">{bi.quantity}x {bi.item.name}</span>
                            <span className="text-zinc-500 font-mono">{config.currencySymbol || '$'}{(price * bi.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del cliente *</label>
                    <input autoFocus value={fiarClientName} onChange={e => handleCaretPreservingChange(e, setFiarClientName, val => val.toUpperCase())}
                      onFocus={() => setActiveSearchField('name')}
                      onClick={e => { e.stopPropagation(); setActiveSearchField('name'); }}
                      placeholder="NOMBRE COMPLETO..."
                      className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-2 text-sm font-bold uppercase rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:normal-case placeholder:text-zinc-500"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-tel-modern')?.focus(); } }} />
                    
                    {/* Suggestions Dropdown */}
                    {activeSearchField === 'name' && fiarClientName.trim() && !fiarExistingAccount && fiarNameSuggestions.length > 0 && (
                      <div className="absolute top-[62px] left-0 right-0 z-[10000] bg-[#11131e] border border-zinc-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {fiarNameSuggestions.map(acc => {
                          const debt = acc.entries.reduce((s, e) => s + e.subtotal, 0);
                          const paid = acc.payments.reduce((s, p) => s + p.amount, 0);
                          const balance = Math.max(0, debt - paid);
                          return (
                            <div key={acc.id}
                              onClick={() => selectExistingCreditAccount(acc)}
                              className="px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b last:border-0 border-zinc-800 flex justify-between items-center"
                            >
                              <div>
                                <div className="text-xs font-bold text-white">{acc.clientName}</div>
                                <div className="text-[9px] text-zinc-400">{acc.clientPhone}</div>
                              </div>
                              <div className="text-[10px] font-black text-amber-400">
                                Saldo: {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                    <div className="flex mt-1 bg-zinc-800 border border-zinc-600 rounded-lg overflow-hidden focus-within:border-orange-500">
                      <select
                        value={fiarCountryCode}
                        onChange={e => setFiarCountryCode(e.target.value)}
                        className="bg-zinc-900 border-r border-zinc-700 text-white px-2 text-xs font-bold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="+52">🇲🇽 +52</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>
                      <input id="fiar-tel-modern" value={fiarClientPhone}
                        onChange={e => setFiarClientPhone(formatPhoneNumber(e.target.value))}
                        onFocus={() => setActiveSearchField('phone')}
                        onClick={e => { e.stopPropagation(); setActiveSearchField('phone'); }}
                        placeholder="(351) 000-0000"
                        className="w-full bg-transparent border-none text-white px-3 py-2 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-500"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-limit-modern')?.focus(); } }} />
                    </div>
                    
                    {/* Suggestions Dropdown for Phone */}
                    {activeSearchField === 'phone' && fiarClientPhone.trim() && !fiarExistingAccount && fiarPhoneSuggestions.length > 0 && (
                      <div className="absolute top-[62px] left-0 right-0 z-[10000] bg-[#11131e] border border-zinc-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {fiarPhoneSuggestions.map(acc => {
                          const debt = acc.entries.reduce((s, e) => s + e.subtotal, 0);
                          const paid = acc.payments.reduce((s, p) => s + p.amount, 0);
                          const balance = Math.max(0, debt - paid);
                          return (
                            <div key={acc.id}
                              onClick={() => selectExistingCreditAccount(acc)}
                              className="px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b last:border-0 border-zinc-800 flex justify-between items-center"
                            >
                              <div>
                                <div className="text-xs font-bold text-white">{acc.clientName}</div>
                                <div className="text-[9px] text-zinc-400">{acc.clientPhone}</div>
                              </div>
                              <div className="text-[10px] font-black text-amber-400">
                                Saldo: {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                        className="w-4 h-4 accent-orange-500 bg-[#07080b] border border-zinc-700 rounded cursor-pointer shrink-0"
                      />
                      <span>¿Establecerle límite de crédito?</span>
                    </label>
                    {fiarHasLimit && (
                      <input id="fiar-limit-modern" value={fiarCreditLimit} onChange={e => setFiarCreditLimit(e.target.value)}
                        placeholder={`Ej: ${config.defaultCreditLimit ?? 1000}`}
                        type="number"
                        min="1"
                        className="w-full bg-zinc-800 border border-zinc-600 text-white px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:text-zinc-500 animate-fadeIn"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp }); } }} />
                    )}
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Anticipo / Abono Inicial ($)</label>
                  <input value={fiarInitialPayment} onChange={e => setFiarInitialPayment(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 placeholder:font-normal placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Método de Anticipo</label>
                  <select value={fiarInitialMethod} onChange={e => setFiarInitialMethod(e.target.value as any)}
                    className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-2 text-sm font-bold rounded-lg outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta / Transf</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1.5 border-t border-dashed border-zinc-800">
                <div 
                  onClick={toggleFiarPrint}
                  className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    id="fiar-check-print-modern"
                    checked={fiarPrint}
                    onChange={toggleFiarPrint}
                    className="w-4.5 h-4.5 accent-orange-500 bg-[#07080b] border border-zinc-700 rounded shrink-0 pointer-events-none"
                  />
                  <label htmlFor="fiar-check-print-modern" className="text-[10px] font-black text-[#cbcbcb] uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
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
                      id="fiar-check-whatsapp-modern"
                      checked={!isWaIntegratedOffline && fiarWhatsapp}
                      disabled={isWaIntegratedOffline}
                      onChange={toggleFiarWhatsapp}
                      className="w-4.5 h-4.5 accent-orange-500 bg-[#07080b] border border-zinc-700 rounded shrink-0 pointer-events-none"
                    />
                    <label htmlFor="fiar-check-whatsapp-modern" className="text-[10px] font-black text-[#cbcbcb] uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Enviar por WhatsApp
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {fiarExistingAccount ? (
                  <>
                    <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase rounded-lg cursor-pointer transition-all">
                      Confirmar y Agregar Cargo ({fiarExistingAccount.clientName})
                    </button>
                    <button onClick={() => { setShowFiarModal(false); setFiarExistingAccount(null); setShowSaleConfirm(true); }}
                      className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-black text-xs uppercase rounded-lg cursor-pointer transition-all">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })} disabled={!fiarClientName.trim() || !fiarClientPhone.trim() || (fiarHasLimit && !fiarCreditLimit.trim())}
                      title="Confirmar y registrar el fiado para el cliente"
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Confirmar fiado
                    </button>
                    <button onClick={() => { setShowFiarModal(false); setFiarExistingAccount(null); setShowSaleConfirm(true); }}
                      title="Cancelar y volver a la pantalla de cobro"
                      className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-black text-xs uppercase rounded-lg cursor-pointer transition-all">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }}>
          <div className="w-full max-w-sm mx-4 bg-[#18191f] border border-zinc-700 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#11131e] px-4 py-3 flex items-center justify-between rounded-t-xl border-b border-zinc-700">
              <span className="font-black text-sm uppercase tracking-widest text-white">📦 Apartar Productos</span>
              <button onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }} className="text-zinc-400 hover:text-white font-black text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs font-bold text-zinc-400 mb-1">Total: <span className="font-black text-white">{config.currencySymbol || '$'}{basket.reduce((s,b) => s + (b.customPrice ?? b.item.price) * b.quantity, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del cliente *</label>
                <input autoFocus value={apartarClientName} onChange={e => handleCaretPreservingChange(e, setApartarClientName, val => val.toUpperCase())}
                  placeholder="NOMBRE COMPLETO..."
                  className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-1.5 text-sm font-bold uppercase rounded-lg outline-none focus:border-purple-500 placeholder:font-normal placeholder:normal-case placeholder:text-zinc-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                <div className="flex mt-1 bg-zinc-800 border border-zinc-600 rounded-lg overflow-hidden focus-within:border-purple-500">
                  <select
                    value={apartarCountryCode}
                    onChange={e => setApartarCountryCode(e.target.value)}
                    className="bg-zinc-900 border-r border-zinc-700 text-white px-2 text-xs font-bold focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input value={apartarClientPhone} onChange={e => setApartarClientPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(351) 000-0000"
                    className="w-full bg-transparent border-none text-white px-3 py-1.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Anticipo inicial *</label>
                  <input type="number" min="0" value={apartarInitialAmount} onChange={e => setApartarInitialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-1.5 text-sm font-bold rounded-lg outline-none focus:border-purple-500 placeholder:font-normal placeholder:text-zinc-500" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Método</label>
                  <select value={apartarInitialMethod} onChange={e => setApartarInitialMethod(e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia')}
                    className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-2 py-1.5 text-sm font-bold rounded-lg outline-none focus:border-purple-500">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500">Fecha límite *</label>
                <input type="date" value={apartarDueDate} onChange={e => setApartarDueDate(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-600 text-white px-3 py-1.5 text-sm font-bold rounded-lg outline-none focus:border-purple-500" />
              </div>
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                <div 
                  onClick={toggleApartarPrint}
                  className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    id="apartar-check-print-modern"
                    checked={apartarPrint}
                    onChange={toggleApartarPrint}
                    className="w-4.5 h-4.5 accent-purple-500 bg-[#07080b] border border-zinc-700 rounded shrink-0 pointer-events-none"
                  />
                  <label htmlFor="apartar-check-print-modern" className="text-[10px] font-black text-[#cbcbcb] uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                    <Printer className="w-3.5 h-3.5 text-zinc-400" /> Imprimir ticket
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
                      id="apartar-check-whatsapp-modern"
                      checked={!isWaIntegratedOffline && apartarWhatsapp}
                      disabled={isWaIntegratedOffline}
                      onChange={toggleApartarWhatsapp}
                      className="w-4.5 h-4.5 accent-purple-500 bg-[#07080b] border border-zinc-700 rounded shrink-0 pointer-events-none"
                    />
                    <label htmlFor="apartar-check-whatsapp-modern" className="text-[10px] font-black text-[#cbcbcb] uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Enviar por WhatsApp
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleConfirmApartar({ printTicket: apartarPrint, sendWhatsApp: apartarWhatsapp })} disabled={!apartarClientName.trim()}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Confirmar Apartado
                </button>
                <button onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }}
                  className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-black text-xs uppercase rounded-lg cursor-pointer transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Change Due Modal */}
      {changeAmount !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#121318] border border-zinc-800 w-full max-w-sm rounded-lg shadow-2xl p-6 space-y-6 text-center max-h-[92vh] overflow-y-auto scrollbar-thin">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20">
                <Coins className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-display font-black text-white uppercase tracking-wider">
                  Monto de Cambio
                </h3>
                <p className="text-[11px] text-gray-400">
                  Entregue la siguiente cantidad de cambio al cliente
                </p>
              </div>
            </div>

            <div className="bg-[#0a0a0d] border border-zinc-700 p-6 rounded-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block font-mono">
                Cambio a Entregar
              </span>
              <span className="text-4xl font-mono font-black text-emerald-400 block tracking-tight">
                {config.currencySymbol}{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setChangeAmount(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(34,197,94,0.3)] hover:scale-102 transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              autoFocus
            >
              Cerrar / Listo <span className="text-[10px] bg-emerald-950/20 border border-emerald-950/30 px-1.5 py-0.5 rounded font-mono font-medium">{countdown}s</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Result and Fast Sale Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className={`w-full max-w-4xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-7 space-y-5 animate-slideUp premium-modal-card border ${
            isLight 
              ? 'bg-white border-zinc-200 text-zinc-800' 
              : 'bg-[#121316] border-zinc-800 text-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-3.5 ${isLight ? 'border-zinc-200' : 'border-zinc-850'}`}>
              <div className="flex items-center gap-2.5">
                <Search className={`w-5.5 h-5.5 animate-pulse ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                <h3 className={`text-sm font-black tracking-wider uppercase font-sans ${isLight ? 'text-zinc-800-important' : 'text-white'}`}>
                  {paginatedModalItems.length > 0 ? '🔍 Catálogo de Productos y Refacciones' : '✨ Crear Artículo / Venta Rápida'}
                </h3>
              </div>
              <button
                type="button"
                onClick={cancelAndCleanupSearchModal}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador y Categorías dentro del Modal */}
            <div className={`space-y-3 p-4 rounded-xl border shrink-0 ${isLight ? 'bg-zinc-100/70 border-zinc-200 text-zinc-800' : 'bg-[#18191e] border-zinc-850'}`}>
              {/* Buscador */}
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
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
                  className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs placeholder-zinc-500 focus:outline-none font-sans border ${
                    isLight 
                      ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' 
                      : 'bg-zinc-900 border-zinc-750 text-white focus:border-indigo-500/50'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setModalCurrentPage(1);
                      setModalSelectedIndex(0);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Categorías (Pills) */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setModalCategoryFilter('TODAS')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                    modalCategoryFilter === 'TODAS'
                      ? 'bg-indigo-600 text-white-important font-black shadow-md'
                      : isLight 
                        ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold border border-zinc-300'
                        : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
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
                          ? 'bg-indigo-600 text-white-important font-black shadow-md'
                          : isLight 
                            ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold border border-zinc-300'
                            : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            {paginatedModalItems.length > 0 ? (
              <div className="space-y-4">
                <p className={`text-xs font-medium leading-relaxed p-3.5 rounded-xl border ${
                  isLight 
                    ? 'bg-zinc-50 border-zinc-250 text-zinc-600' 
                    : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400'
                }`}>
                  Se encontraron <span className={`font-extrabold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{matchedProductsForModal.length}</span> coincidencias. Navegue con las teclas <span className={`font-extrabold px-1.5 py-0.5 rounded border ${isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-800 font-sans' : 'bg-zinc-800 border-zinc-750 text-zinc-300'}`}>↑ ↓</span> y confirme con <span className={`font-extrabold px-1.5 py-0.5 rounded border font-mono ${isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-800' : 'bg-zinc-800 border-zinc-750 text-zinc-300'}`}>Enter</span> o con clic.
                </p>

                {/* Table wrapper */}
                <div id="pos-modal-table-container" className={`border rounded-xl overflow-hidden max-h-[460px] overflow-y-auto ${
                  isLight 
                    ? 'border-zinc-250 bg-white' 
                    : 'border-zinc-800 bg-zinc-950'
                }`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                        isLight 
                          ? 'bg-zinc-100 border-zinc-250 text-zinc-650' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        <th className="px-4 py-2">Código</th>
                        <th className="px-4 py-2">Nombre / Categoría</th>
                        <th className="px-4 py-2 text-right">Precio</th>
                        <th className="px-4 py-2 text-center">Existencia</th>
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
                          <tr
                            key={product.id}
                            onClick={() => {
                              addToBasket(product);
                              setIsSearchModalOpen(false);
                              setSearchQuery('');
                              setTimeout(() => searchInputRef.current?.focus(), 50);
                            }}
                            onMouseMove={() => { if (modalSelectedIndex !== idx) setModalSelectedIndex(idx); }}
                            className={`cursor-pointer border-b ${
                              isLight 
                                ? isSelected 
                                  ? 'bg-indigo-950/40 text-white font-semibold pos-modal-row-selected border-zinc-900/80' 
                                  : 'hover:bg-zinc-100 text-zinc-700 border-zinc-200' 
                                : isSelected 
                                  ? 'bg-indigo-950/40 text-white font-semibold pos-modal-row-selected border-zinc-900/80' 
                                  : 'hover:bg-zinc-900/30 text-zinc-350 border-zinc-900/80'
                            }`}
                          >
                            <td className={`px-4 py-1.5 font-mono text-[10.5px] ${
                              isSelected 
                                ? 'text-indigo-300 font-extrabold border-l-4 border-indigo-500 pl-3' 
                                : isLight 
                                  ? 'text-zinc-500-important' 
                                  : 'text-zinc-500'
                            }`}>
                              {product.code || 'S/C'}
                            </td>
                            <td className={`px-4 py-1.5 max-w-0 border-r ${isLight ? 'border-zinc-200' : 'border-zinc-900'}`}>
                              <div className="flex items-center gap-2.5">
                                <PosItemThumbnail imageUrl={product.imageUrl} name={product.name} code={product.code} category={product.category} price={product.price} currencySymbol={config.currencySymbol} size={32} />
                                <div className="flex-1 min-w-0 break-words whitespace-normal text-left">
                                  <span className={`block font-black uppercase text-[11.5px] break-words whitespace-normal ${
                                    isSelected 
                                      ? 'text-white' 
                                      : isLight 
                                        ? 'text-zinc-800-important' 
                                        : 'text-zinc-200'
                                  }`}>{product.name}</span>
                                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                    isSelected 
                                      ? 'bg-indigo-900/80 text-indigo-200' 
                                      : isLight 
                                        ? 'bg-zinc-200 text-zinc-600' 
                                        : 'bg-zinc-800 text-zinc-400'
                                  }`}>{product.category}</span>
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-1.5 text-right font-mono font-black ${
                              isSelected 
                                ? 'text-indigo-300' 
                                : isLight 
                                  ? 'text-zinc-800-important' 
                                  : 'text-zinc-100'
                            }`}>
                              {config.currencySymbol}{product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-1.5 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isSelected
                                    ? 'bg-indigo-900 text-white border border-indigo-750'
                                    : !isStockControlled 
                                      ? isLight 
                                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                        : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/40' 
                                      : currentStock > 5 
                                        ? isLight 
                                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-250'
                                          : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                                        : isLight 
                                          ? 'bg-amber-100 text-amber-700 border border-amber-250'
                                          : 'bg-amber-950/50 text-amber-400 border border-amber-900/40'
                                }`}>
                                  {!isStockControlled ? '∞' : `${currentStock} disp`}
                                </span>
                                {secondaryLocations.map((loc, i) => (
                                  <span key={i} className={`text-[8.5px] font-black mt-0.5 leading-none ${
                                    isSelected 
                                      ? 'text-indigo-300' 
                                      : isLight 
                                        ? 'text-amber-700' 
                                        : 'text-amber-500'
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

                {/* Pagination Controls */}
                <div className={`flex flex-col sm:flex-row gap-2 justify-between items-center border-t pt-3.5 text-[10.5px] font-sans ${isLight ? 'border-zinc-200 text-zinc-600' : 'border-zinc-850 text-zinc-450'}`}>
                  <div className="flex items-center gap-1.5 font-mono select-none text-[10px] uppercase font-bold text-zinc-500">
                    <span>[Esc] Cerrar</span>
                    <span>•</span>
                    <span>Sel: <b className={`font-mono ${isLight ? 'text-indigo-700 font-black' : 'text-indigo-400 font-extrabold'}`}>#{modalSelectedIndex + 1 + (modalCurrentPage - 1) * 25} de {matchedProductsForModal.length}</b></span>
                  </div>

                  {modalTotalPages > 1 && (
                    <div className="flex items-center gap-2 select-none">
                      <button
                        type="button"
                        disabled={modalCurrentPage === 1}
                        onClick={() => {
                          setModalCurrentPage((p) => Math.max(1, p - 1));
                          setModalSelectedIndex(0);
                        }}
                        className={`px-2.5 py-1 disabled:opacity-30 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                          isLight 
                            ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 disabled:hover:bg-zinc-100' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:hover:bg-zinc-900'
                        }`}
                      >
                        ◀ Ant [PageUp]
                      </button>
                      <span className={`font-black font-mono text-[10px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                        Página {modalCurrentPage} de {modalTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={modalCurrentPage === modalTotalPages}
                        onClick={() => {
                          setModalCurrentPage((p) => Math.min(modalTotalPages, p + 1));
                          setModalSelectedIndex(0);
                        }}
                        className={`px-2.5 py-1 disabled:opacity-30 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                          isLight 
                            ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 disabled:hover:bg-zinc-100' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:hover:bg-zinc-900'
                        }`}
                      >
                        Sig [PageDn] ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* VENTA RAPIDA IF NO MATCHES */
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
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
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Precio de Venta ({config.currencySymbol})</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600 text-sm font-bold font-mono">
                        {config.currencySymbol}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        ref={modalFastSalePriceInputRef}
                        className="w-full bg-white border border-zinc-300 rounded pl-8 pr-3 py-2 text-emerald-600 font-mono font-bold placeholder:text-zinc-400 text-sm focus:outline-none"
                        placeholder="0.00"
                        value={fastSalePrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          const cleanValue = value.replace(/[^0-9.]/g, '');
                          const parts = cleanValue.split('.');
                          const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanValue;
                          setFastSalePrice(formatted);
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

      {/* Venta Rápida Centered Modal with Backdrop Blur and Cursor Auto-focus */}
      {isFastSaleModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn"
          onClick={cancelAndCleanupFastSale}
        >
          {false ? (
            /* Retro Theme Centered Modal */
            <div 
              className="bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_12px_rgba(0,0,0,0.5)] text-black w-full max-w-md flex flex-col font-sans overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Titlebar */}
              <div className="bg-[#000080] p-1.5 flex items-center justify-between text-white select-none">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-yellow-400 animate-pulse">✨</span>
                  <span className="text-xs font-black tracking-wide uppercase">📟 REGISTRAR ARTÍCULO DE VENTA RÁPIDA</span>
                </div>
                <button 
                  type="button"
                  onClick={cancelAndCleanupFastSale}
                  className="w-4 h-4 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-900 font-black text-[10px] cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                <div className="p-2.5 bg-yellow-100 border border-yellow-400 text-yellow-900 rounded-sm text-xs select-none">
                  <p className="font-extrabold text-[10.5px] uppercase">Venta Rápida (Sin Coincidencias)</p>
                  <p className="text-[9.5px] font-medium leading-normal mt-0.5 text-yellow-800">
                    Registre este artículo de forma temporal para agregarlo a la transacción actual.
                  </p>
                </div>

                <div className="space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider block">Nombre del Artículo</label>
                    <input
                      type="text"
                      ref={fastSaleModalNameInputRef}
                      className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[#3px] px-2.5 py-1.5 font-sans font-bold text-xs text-black focus:outline-none focus:ring-1 focus:ring-[#000080]"
                      placeholder="Escriba el nombre del artículo..."
                      value={fastSaleName}
                      onChange={(e) => handleCaretPreservingChange(e, setFastSaleName, val => val.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          fastSaleModalPriceInputRef.current?.focus();
                          setTimeout(() => {
                            fastSaleModalPriceInputRef.current?.select();
                          }, 20);
                        } else if (e.key === 'Escape') {
                          cancelAndCleanupFastSale();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider block">Precio de Venta ({config.currencySymbol})</label>
                    <div className="flex border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-white">
                      <span className="flex items-center px-2.5 text-red-700 font-mono text-base font-black border-r border-zinc-400 bg-zinc-100 select-none pointer-events-none">{config.currencySymbol}</span>
                      <input
                        type="text"
                        ref={fastSaleModalPriceInputRef}
                        className="flex-1 bg-white px-3 py-2 font-mono font-black text-base text-red-700 focus:outline-none"
                        value={fastSalePrice}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                          setFastSalePrice(cleanVal);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addFastSaleItem();
                          } else if (e.key === 'Escape') {
                            cancelAndCleanupFastSale();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 select-none hover:opacity-90 active:scale-98 transition-all pt-1">
                    <input
                      type="checkbox"
                      id="save-to-inventory-retro"
                      checked={saveToInventory}
                      onChange={(e) => setSaveToInventory(e.target.checked)}
                      className="w-4 h-4 accent-green-700 bg-white border-2 border-zinc-500 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="save-to-inventory-retro" className="text-[10px] font-black text-zinc-700 cursor-pointer uppercase select-none">
                      Agregar al catálogo de inventario
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#dfdfdf] p-2.5 flex justify-end gap-2 border-t border-zinc-400">
                <button
                  type="button"
                  onClick={cancelAndCleanupFastSale}
                  className="px-3 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
                >
                  Cancelar [Esc]
                </button>
                <button
                  type="button"
                  onClick={addFastSaleItem}
                  className="px-4 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-[#000080] active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
                >
                  Enviar Venta Rápida [Enter]
                </button>
              </div>
            </div>
          ) : (
            /* Modern Theme Centered Modal with Backdrop Blur and Defocusing */
            <div 
              className="bg-[#121316] border border-zinc-600 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4 text-zinc-200 animate-scaleIn premium-modal-card" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 animate-pulse">✨</span>
                  <h3 className="text-sm font-extrabold tracking-wider text-white uppercase font-sans">
                    Registrar Venta Rápida
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={cancelAndCleanupFastSale}
                  className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informational Header Board */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-xs leading-relaxed select-none text-left">
                <h5 className="font-extrabold uppercase text-[10px] tracking-wider mb-0.5">Artículo Especial Temporal</h5>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Ningún producto coincide con el catálogo. Ingrese el nombre y precio del artículo para añadirlo a la compra actual.
                </p>
              </div>

              {/* Input Fields */}
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-300 font-display font-semibold uppercase tracking-wider block">Nombre del Artículo</label>
                  <input
                    type="text"
                    ref={fastSaleModalNameInputRef}
                    className="w-full bg-[#22252d] border border-zinc-500 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-500 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    style={{ WebkitTextFillColor: '#ffffff', color: '#ffffff' }}
                    placeholder="Ej: Cable USB Tipo C"
                    value={fastSaleName}
                    onChange={(e) => setFastSaleName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fastSaleModalPriceInputRef.current?.focus();
                        setTimeout(() => {
                          fastSaleModalPriceInputRef.current?.select();
                        }, 20);
                      } else if (e.key === 'Escape') {
                        cancelAndCleanupFastSale();
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-300 font-display font-semibold uppercase tracking-wider block">Precio de venta ({config.currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-400 text-sm font-bold font-mono">
                      {config.currencySymbol}
                    </span>
                    <input
                      type="text"
                      ref={fastSaleModalPriceInputRef}
                      className="w-full bg-[#22252d] border border-zinc-500 rounded-lg pl-7 pr-3 py-2.5 text-sm font-mono font-bold placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      style={{ WebkitTextFillColor: '#6ee7b7', color: '#6ee7b7' }}
                      placeholder="0.00"
                      value={fastSalePrice}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                        setFastSalePrice(cleanVal);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFastSaleItem();
                        } else if (e.key === 'Escape') {
                          cancelAndCleanupFastSale();
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none hover:opacity-95 active:scale-98 transition-all pt-1">
                  <input
                    type="checkbox"
                    id="save-to-inventory-modern"
                    checked={saveToInventory}
                    onChange={(e) => setSaveToInventory(e.target.checked)}
                    className="w-4.5 h-4.5 accent-emerald-500 bg-[#07080b] border border-zinc-700 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="save-to-inventory-modern" className="text-[10px] font-black text-[#cbcbcb] cursor-pointer uppercase select-none flex items-center gap-1">
                    Agregar al catálogo de inventario
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={cancelAndCleanupFastSale}
                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar [Esc]
                </button>
                <button
                  type="button"
                  onClick={addFastSaleItem}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md hover:scale-[1.02]"
                >
                  Añadir [Enter]
                </button>
              </div>
            </div>
          )}
        </div>
      )}

                {/* Cancel Current Sale Confirmation Overlay Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-[#121318] border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl p-5 space-y-4 text-gray-200">
            {/* Title Bar */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">
                  ¿CANCELAR TRANSACCIÓN ACTUAL?
                </h3>
                <p className="text-[11px] text-gray-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-400 font-extrabold text-[11px] cursor-pointer transition-colors"
              >
                X
              </button>
            </div>

            {/* Client Area */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/10 rounded text-rose-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold uppercase text-xs tracking-wider text-rose-400">Esta acción es irreversible</h4>
                  <p className="text-xs font-bold leading-relaxed text-gray-300">
                    Se eliminarán todos los artículos (<strong>{basketTotalItems}</strong>) cargados actualmente en la cesta de compras. ¿Realmente desea limpiar la transacción actual?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-xs uppercase cursor-pointer text-center"
                >
                  No, mantener venta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBasket([]);
                    setShowCancelConfirm(false);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs uppercase cursor-pointer text-center"
                >
                  Sí, cancelar venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save / Hold Current Sale Modal with customizable label */}
      {showSaveSaleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmSaveSaleForLater(saveSaleLabel);
            }}
            className="bg-[#121318] border border-zinc-800 w-full max-w-sm rounded-lg shadow-2xl p-5 space-y-4 text-gray-200 animate-fadeIn"
          >
            {/* Title Bar */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <FolderHeart className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">
                  RETENER VENTA ACTUAL
                </h3>
                <p className="text-[11px] text-gray-400">
                  Guardar en lista de espera
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveSaleModal(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-400 font-extrabold text-[11px] cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Client Area */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-950/40 border border-blue-500/10 rounded text-blue-400 shrink-0">
                  <FolderHeart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold uppercase text-xs tracking-wider text-blue-400 font-display">Guardar para después</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mesa, nombre o referencia</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide block">Identificador de Cliente / Referencia</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full bg-[#22252d] border border-zinc-500 focus:border-yellow-500 focus:outline-none rounded-lg px-3 py-2.5 text-sm font-bold placeholder:text-zinc-500"
                  style={{ WebkitTextFillColor: '#fde68a', color: '#fde68a' }}
                  placeholder="Nombre del cliente o nota..."
                  value={saveSaleLabel}
                  onChange={(e) => setSaveSaleLabel(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <p className="text-[10px] text-gray-500 leading-normal">
                  Ingrese una nota, nombre o mesa para recuperar esta venta fácilmente en la lista de espera.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveSaleModal(false)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-xs uppercase cursor-pointer text-center"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold rounded-lg text-xs uppercase cursor-pointer text-center"
                >
                  Confirmar Guardar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Suspended Sales queue pool popup layout manager */}
      {showSavedSalesListModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-[#121318] border border-zinc-800 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-gray-200">
            {/* Title Bar */}
            <div className="flex items-center gap-3 border-b border-zinc-800 p-4 shrink-0">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Archive className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">
                  VENTAS EN ESPERA ({savedSales.length})
                </h3>
                <p className="text-[11px] text-gray-400">
                  Seleccione una para reanudar o eliminar de la lista
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedSalesListModal(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-400 font-extrabold text-[11px] cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Client Area */}
            <div className="p-4 flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
                {savedSales.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 space-y-2 select-none">
                    <span className="text-3xl block">📂</span>
                    <p className="text-xs font-bold uppercase tracking-wider">No hay ventas retenidas en la lista.</p>
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#0c0c0e]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-800 text-yellow-500 font-extrabold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-3 border-r border-zinc-700">Identificador / Cliente</th>
                          <th className="px-4 py-3 border-r border-zinc-700">Fecha y Hora</th>
                          <th className="px-4 py-3 border-r border-zinc-700 text-center">Artículos</th>
                          <th className="px-4 py-3 border-r border-zinc-700 text-right font-mono">Total</th>
                          <th className="px-4 py-3 text-center w-48">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700 bg-[#0d0f14]/40">
                        {savedSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-zinc-900 text-gray-200 transition-colors font-semibold">
                            <td className="px-4 py-3 uppercase font-extrabold text-white">
                              {sale.label}
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                              {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-300 text-xs font-mono">
                              {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-rose-400 text-sm">
                              {config.currencySymbol}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleLoadSavedSale(sale.id)}
                                  className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Recuperar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedSale(sale.id)}
                                  className="bg-rose-950 hover:bg-rose-900 border border-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSavedSalesListModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded-lg text-xs uppercase cursor-pointer text-center"
              >
                Cerrar [Esc]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Deletion Modal to avoid window.confirm */}
      {saleToDelete !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div className="bg-[#121318] border border-zinc-800 w-full max-w-sm rounded-lg shadow-2xl p-5 space-y-4 text-gray-200">
            {/* Title Bar */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <Trash2 className="w-5 h-5 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">
                  CONFIRMAR ELIMINACIÓN
                </h3>
                <p className="text-[11px] text-gray-400">
                  Esta acción es permanente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-400 font-extrabold text-[11px] cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Client Area */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-red-950/45 border border-red-500/10 rounded text-red-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold uppercase text-xs tracking-wide text-red-400">Esta acción no se puede deshacer</h4>
                  <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                    ¿Está seguro de que desea eliminar permanentemente esta venta en espera?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSavedSales(savedSales.filter((s) => s.id !== saleToDelete));
                    setSaleToDelete(null);
                  }}
                  className="py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingLoadSaleId !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div className="bg-[#121318] border border-zinc-800 w-full max-w-sm rounded-lg shadow-2xl p-5 space-y-4 text-gray-200">
            {/* Title Bar */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Archive className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">
                  CONFLICTO DE CARRITO
                </h3>
                <p className="text-[11px] text-gray-400">
                  El carrito actual no está vacío
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelLoadConflict}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-400 font-extrabold text-[11px] cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Client Area */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-yellow-950/45 border border-yellow-500/15 rounded text-yellow-400 shrink-0">
                  <Archive className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold uppercase text-xs tracking-wide text-yellow-500">¿Cómo desea proceder?</h4>
                  <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                    ¿Desea combinar los artículos actuales de su cesta con los de la venta recuperada, o prefiere sobrescribirlos por completo?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmLoadCombine}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                >
                  Combinar artículos
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLoadOverwrite}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                >
                  Sobrescribir carrito
                </button>
                <button
                  type="button"
                  onClick={handleCancelLoadConflict}
                  className="py-2.5 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELÉGANTE DE NÚMERO DE WHATSAPP (MODERNO) */}
      {showPosWhatsappModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fadeIn no-blur-backdrop">
          <div className="bg-[#121316] border border-zinc-700 max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
            <button
              type="button"
              onClick={() => {
                setPosShouldSendWhatsApp(false);
                setShowPosWhatsappModal(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xl">💬</span>
              <h3 className="text-sm font-display font-black text-emerald-400 uppercase tracking-wider select-none">
                Enviar ticket por WhatsApp
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed select-none">
                El ticket de venta se generará en formato digital (tipo ticket impreso) y se copiará automáticamente al portapapeles. Al hacer clic en <strong>Cobrar y Enviar</strong>, se completará la venta y se abrirá WhatsApp.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block select-none">Número de WhatsApp (Celular)</label>
                <input
                  type="text"
                  value={posWhatsappPhone}
                  onChange={(e) => setPosWhatsappPhone(e.target.value)}
                  placeholder="Ej. 10 dígitos (ej. 5512345678)..."
                  className="w-full bg-[#22252d] border border-zinc-650 rounded-lg px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none placeholder:text-zinc-500 font-mono text-yellow-450 font-bold"
                  style={{ WebkitTextFillColor: '#eab308', color: '#eab308' }}
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

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setPosShouldSendWhatsApp(false);
                    setShowPosWhatsappModal(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer select-none uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowPosWhatsappModal(false)}
                  className="px-4 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer select-none uppercase"
                >
                  Guardar número
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
                  className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-all border border-emerald-700 uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Cobrar y Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NÚMERO DE WHATSAPP PARA COTIZACIÓN EXPRESS (MODERNO) */}
      {showQuoteWhatsappModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fadeIn no-blur-backdrop">
          <div className="bg-[#121316] border border-zinc-700 max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
            <button
              type="button"
              onClick={() => setShowQuoteWhatsappModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xl">💬</span>
              <h3 className="text-sm font-display font-black text-amber-400 uppercase tracking-wider select-none">
                Cotizar Carrito por WhatsApp
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed select-none">
                Se generará una imagen digital de la cotización y se enviará por WhatsApp al cliente seleccionado.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block select-none">Nombre del Cliente (Opcional)</label>
                <div className="flex bg-[#22252d] border border-zinc-650 rounded-lg overflow-hidden focus-within:border-amber-500">
                  <input
                    type="text"
                    value={quoteClientName}
                    onChange={(e) => setQuoteClientName(e.target.value)}
                    placeholder="Nombre del cliente..."
                    className="w-full bg-transparent border-none text-white px-3.5 py-2.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-550"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block select-none">Número de WhatsApp (Celular)</label>
                <div className="flex bg-[#22252d] border border-zinc-650 rounded-lg overflow-hidden focus-within:border-amber-500">
                  <select
                    value={quoteCountryCode}
                    onChange={e => setQuoteCountryCode(e.target.value)}
                    className="bg-zinc-900 border-r border-zinc-700 text-white px-2 text-xs font-bold focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input
                    type="text"
                    value={quoteWhatsappPhone}
                    onChange={(e) => setQuoteWhatsappPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(351) 000-0000"
                    className="w-full bg-transparent border-none text-white px-3.5 py-2.5 text-sm font-bold text-right outline-none placeholder:font-normal placeholder:text-zinc-550 font-mono"
                    style={{ WebkitTextFillColor: '#eab308', color: '#eab308' }}
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
                          discountEnabled ? discountAmount : undefined,
                          discountEnabled ? discountType : undefined,
                          discountEnabled ? discountValue : undefined,
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

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setShowQuoteWhatsappModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer select-none uppercase"
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
                      discountEnabled ? discountAmount : undefined,
                      discountEnabled ? discountType : undefined,
                      discountEnabled ? discountValue : undefined,
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

      {/* MODAL DE ACTIVACIÓN DE CHIP - AGREGAR AL CARRITO */}
      {pendingChipToAdd && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
          <div className="bg-[#121316] border border-zinc-700 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
            <button
              type="button"
              onClick={() => setPendingChipToAdd(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xl">⚡</span>
              <h3 className="text-sm font-display font-black text-emerald-400 uppercase tracking-wider">
                Datos de Activación de Chip
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Estás agregando <span className="text-white font-extrabold">{pendingChipToAdd.name}</span>. Por favor captura los datos para registrar la activación de la línea o desactiva la opción para realizar una venta normal.
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
              <div className="bg-[#1a1c22] border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="add-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 bg-[#07080b] border border-zinc-700 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="add-chip-register-details" className="text-xs font-black text-zinc-200 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>
              </div>

              {chipRegisterDetails ? (
                <div className="space-y-3.5 bg-[#0e0f12] border border-zinc-850 p-4 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre Completo"
                      value={chipClientName}
                      onChange={(e) => setChipClientName(e.target.value)}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Número del Chip *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10 dígitos"
                      value={chipPhone}
                      onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">ICCID (Nº Serie SIM) (Opcional)</label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="19 o 20 dígitos"
                      value={chipIccid}
                      onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15 dígitos"
                      value={chipImei}
                      onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-yellow-500/90 text-[11px] font-semibold leading-relaxed animate-fadeIn">
                  ⚠️ Se agregará el chip como venta normal. No se guardará información de activación ni aparecerá en el reporte de activaciones.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setPendingChipToAdd(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer uppercase select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 rounded-xl cursor-pointer transition-all uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Agregar al Carrito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ACTIVACIÓN DE CHIP - EDITAR DESDE EL CARRITO */}
      {editingChipBasketItem && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
          <div className="bg-[#121316] border border-zinc-700 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp">
            <button
              type="button"
              onClick={() => setEditingChipBasketItem(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xl">✏️</span>
              <h3 className="text-sm font-display font-black text-indigo-400 uppercase tracking-wider">
                Editar Datos de Activación
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Modificando los datos de activación para el chip: <span className="text-white font-extrabold">{editingChipBasketItem.item.name}</span>.
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
              <div className="bg-[#1a1c22] border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 bg-[#07080b] border border-zinc-700 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="edit-chip-register-details" className="text-xs font-black text-zinc-200 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>
              </div>

              {chipRegisterDetails ? (
                <div className="space-y-3.5 bg-[#0e0f12] border border-zinc-850 p-4 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre Completo"
                      value={chipClientName}
                      onChange={(e) => setChipClientName(e.target.value)}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Número del Chip *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10 dígitos"
                      value={chipPhone}
                      onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">ICCID (Nº Serie SIM) (Opcional)</label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="19 o 20 dígitos"
                      value={chipIccid}
                      onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="15 dígitos"
                      value={chipImei}
                      onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#1e2129] border border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-zinc-150 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-yellow-500/90 text-[11px] font-semibold leading-relaxed animate-fadeIn">
                  ⚠️ Se desactivará el registro de activación. Este chip se tratará como una venta normal al guardar los cambios.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setEditingChipBasketItem(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer uppercase select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 border border-indigo-700 rounded-xl cursor-pointer transition-all uppercase shadow-md flex items-center gap-1.5"
                >
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createPortal(
        <>
          {renderShortcutModalsAndToasts()}
          {renderQuickHistoryModals()}
          {renderPriceCheckerModal()}
          {renderFavoritesModal()}

          {outOfStockAlertItem && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[80] animate-fadeIn no-blur-backdrop select-none">
              <div className="bg-[#121316] border border-red-500/30 max-w-md w-full rounded-2xl shadow-2xl p-6 relative text-white animate-scaleUp text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 border border-red-500/25 mb-4 text-red-500">
                  <span className="text-xl">⚠️</span>
                </div>
                
                <h3 className="text-sm font-display font-black text-red-450 uppercase tracking-wider mb-2">
                  Sin Existencias Disponibles
                </h3>
                
                <div className="space-y-2 mb-6">
                  <p className="text-[11px] text-zinc-150 font-bold uppercase">
                    {outOfStockAlertItem.item.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans font-medium">
                    {outOfStockAlertItem.reason === 'outofstock' 
                      ? 'Este artículo no cuenta con inventario registrado en la bodega seleccionada para realizar la venta.'
                      : `La cantidad en carrito excede el stock disponible en inventario (Existencias: ${outOfStockAlertItem.maxStock} pzas).`}
                  </p>
                  {outOfStockAlertItem.warehouseName && (
                    <p className="text-[9.5px] text-amber-400 font-bold uppercase tracking-wider mt-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit mx-auto">
                      Bodega: {outOfStockAlertItem.warehouseName}
                    </p>
                  )}
                  <div className="text-[9px] text-zinc-500 bg-black/35 py-2 px-3 rounded-xl leading-normal border border-zinc-800/40 font-medium">
                    La opción de "Permitir Ventas Sin Stock" está desactivada en la Configuración General del Taller.
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setOutOfStockAlertItem(null)}
                    className="px-6 py-2.5 text-xs font-black text-white bg-red-650 hover:bg-red-700 border border-red-750 rounded-xl cursor-pointer transition-all uppercase shadow-md active:scale-95"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

