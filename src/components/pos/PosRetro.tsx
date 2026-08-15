/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calculator, ShoppingCart, Trash2, Coins, CreditCard, Sparkles, CheckCircle, Search, X, CornerDownLeft, FolderHeart, Archive, Info, XCircle, Users, Edit, Lock, Unlock, ShieldCheck, Wrench, Printer, MessageSquare, Smartphone, Star } from 'lucide-react';
import { PosLogic, normalizeSearchText } from '../../hooks/usePosLogic';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { logPriceCheck, markAddedToCart } from '../../utils/priceCheckLog';
import { buildPosTicketHtml } from '../../utils/ticketBuilder';
import { getIndividualAdvance } from '../../utils/orderHelpers';
import { handleCaretPreservingChange } from '../../utils/domHelpers';
import { PosItemThumbnail } from './PosItemThumbnail';

interface Props { logic: PosLogic; }

export default function PosRetro({ logic }: Props) {
  const {
    config, sales, users, setActiveTab, onCancelSale,
    basket, setBasket, isAdminMode, setIsAdminMode,
    editingItemId, setEditingItemId, editingPriceValue, setEditingPriceValue,
    paymentMethod, setPaymentMethod, cashAmount, setCashAmount,
    payCash, setPayCash, payCard, setPayCard,
    cardCode, setCardCode,
    lastSaleReceipt, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    showClearConfirm, setShowClearConfirm, confirmationCode, setConfirmationCode,
    showSaleConfirm, setShowSaleConfirm, changeAmount, setChangeAmount,
    discountType, setDiscountType, discountValue, setDiscountValue, discountEnabled, setDiscountEnabled, discountAmount,
    showFiarModal, setShowFiarModal, fiarClientName, setFiarClientName, fiarClientPhone, setFiarClientPhone, fiarCountryCode, setFiarCountryCode, fiarExistingAccount, setFiarExistingAccount, fiarCreditLimit, setFiarCreditLimit, executeFiar,
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
    paginatedModalItems, modalTotalPages,
    availableItems, inventory,
    basketTotal, basketTotalItems, saleType, setSaleType,
    triggerToast, handleCalcBtn, cancelAndCleanupFastSale, cancelAndCleanupSearchModal,
    addFastSaleItem, handleModalAddFastSaleItem,
    addToBasket, updateQuantity, removeFromBasket, toggleBasketItemPriceType,
    handleSavePrice, handleRequestEditPrice,
    handleConfirmAddChip, handleConfirmEditChip,
    handleAdminAuthSubmit, handleLockAdminMode,
    handleSaveSaleForLater, confirmSaveSaleForLater,
    handleLoadSavedSale, handleConfirmLoadCombine, handleConfirmLoadOverwrite, handleCancelLoadConflict,
    handleDeleteSavedSale, executeSale, validateAndConfirm, handleCheckout,
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
    orders,
    showRepairSelectionModal, setShowRepairSelectionModal,
    repairSearchQuery, setRepairSearchQuery,
    addRepairOrderToBasket,
  } = logic;

  const isWaIntegratedOffline = config.whatsappMode === 'integrated' && !waConnected;

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

  const isLight = config.themeMode === 'light';

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
      if (favSearchQuery.trim()) {
        const q = favSearchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchCode = (item.code || '').toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        return matchName || matchCode || matchBrand;
      }
      return true;
    });
  }, [allFavoriteItems, favSelectedCategory, favSearchQuery]);

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
    const container = document.getElementById('pos-fav-modal-table-container-retro');
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
    const isRetro = config.theme === 'retro-window';
    const isLight = config.themeMode === 'light';
    if (!showPriceChecker) return null;
    const results = priceCheckerResults;
    const modalBg = isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600' : isLight ? 'bg-white border border-zinc-200' : 'bg-[#111318] border border-zinc-700';
    const headerBg = `modal-dark-header ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-[#1a3a6b]' : 'bg-[#11131e]'}`;
    const inputCls = isRetro ? 'bg-white border-2 border-zinc-400 text-zinc-800 placeholder-zinc-400' : isLight ? 'bg-zinc-50 border border-zinc-300 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600';
    const rowHover = isRetro ? 'hover:bg-zinc-200 cursor-pointer' : isLight ? 'hover:bg-zinc-50 cursor-pointer' : 'hover:bg-zinc-800/50 cursor-pointer';
    const textMain = isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-800' : 'text-white';
    const textSub = isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-500' : 'text-zinc-400';
    const divider = isRetro ? 'divide-zinc-400' : isLight ? 'divide-zinc-200' : 'divide-zinc-800';

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
      const stockColor = !isStockControlled ? (isLight ? 'text-indigo-650' : 'text-indigo-400') : item.stock <= 0 ? 'text-rose-500' : item.stock <= item.minStock ? 'text-amber-500' : isLight ? 'text-emerald-600' : 'text-emerald-400';
      const addBtnCls = isRetro
        ? 'bg-[#000080] hover:bg-[#0000aa] text-white border-2 border-t-[#8080ff] border-l-[#8080ff] border-b-[#000040] border-r-[#000040]'
        : isLight ? 'bg-[#1a3a6b] hover:bg-[#14306b] text-white'
        : 'bg-blue-600 hover:bg-blue-500 text-white';
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => { setPriceCheckerSelected(null); setPriceCheckerResults(null); setPriceCheckerQuery(''); setShowPriceChecker(false); }}>
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
              <div className={`w-full rounded-xl px-4 py-3 flex flex-col gap-1.5 ${isRetro ? 'bg-zinc-200' : isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-900/60 border border-zinc-800'}`}>
                {item.code && <div className="flex justify-between text-xs"><span className={textSub}>Código</span><span className={`font-mono font-bold ${textMain}`}>{item.code}</span></div>}
                {item.category && <div className="flex justify-between text-xs"><span className={textSub}>Categoría</span><span className={`font-bold ${textMain}`}>{item.category}</span></div>}
                <div className="flex justify-between text-xs"><span className={textSub}>Stock</span><span className={`font-black ${stockColor}`}>{!isStockControlled ? 'Ilimitado' : item.stock <= 0 ? 'Sin stock' : `${item.stock} uds.`}</span></div>
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
          <div className={`p-3 border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
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
              <div key={item.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${rowHover} ${idx === priceCheckerHighlight ? (isRetro ? 'bg-zinc-200' : isLight ? 'bg-blue-50 border-l-2 border-blue-400' : 'bg-zinc-700/60') : ''}`} onClick={() => { priceCheckerEntryId.current = logPriceCheck(item); setPriceCheckerSelected(item); }} onMouseEnter={() => setPriceCheckerHighlight(idx)}>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${textMain}`}>{item.name}</div>
                  <div className={`text-[10px] ${textSub}`}>{item.brand}{item.category ? ` · ${item.category}` : ''} · Stock: {item.manageStock === false ? 'Ilimitado' : item.stock}</div>
                </div>
                <div className={`text-sm font-black shrink-0 ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
          {results !== null && (
            <div className={`px-4 py-2 text-[10px] ${textSub} border-t ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              {results.length} artículo{results.length !== 1 ? 's' : ''} — clic para ver detalle
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickHistoryModals = () => {
    const sym = config.currencySymbol || '$';
    const isRetro = config.theme === 'retro-window';
    const isLight = config.themeMode === 'light';
    const isDark = !isRetro && !isLight;

    // Clases adaptativas por tema
    const modalBg    = isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600' : isLight ? 'bg-white border border-zinc-200' : 'bg-[#111318] border border-zinc-700';
    const headerBg   = isRetro ? 'bg-[#000080] border-zinc-500' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800';
    const headerText = isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white';
    const subText    = isRetro ? 'text-white/70' : isLight ? 'text-zinc-500' : 'text-zinc-400';
    const divider    = isRetro ? (isLight ? 'divide-zinc-400' : 'divide-[#383c48]') : isLight ? 'divide-zinc-200' : 'divide-zinc-800';
    const rowHover   = isRetro ? (isLight ? 'hover:bg-zinc-200' : 'hover:bg-[#282b35]') : isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/50';
    const idText     = isRetro ? (isLight ? 'text-zinc-600' : 'text-zinc-450') : isLight ? 'text-zinc-500' : 'text-zinc-500';
    const itemText   = isRetro ? (isLight ? 'text-zinc-700' : 'text-zinc-300') : isLight ? 'text-zinc-600' : 'text-zinc-400';
    const dateText   = isRetro ? (isLight ? 'text-zinc-500' : 'text-zinc-450') : isLight ? 'text-zinc-400' : 'text-zinc-600';
    const totalText  = isRetro ? (isLight ? 'text-zinc-900' : 'text-white') : isLight ? 'text-zinc-900' : 'text-white';
    const emptyText  = isRetro ? (isLight ? 'text-zinc-500' : 'text-zinc-400') : isLight ? 'text-zinc-400' : 'text-zinc-500';
    const btnUtil    = isRetro
      ? (isLight
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800 hover:bg-zinc-200'
          : 'bg-[#1a1c23] border-2 border-t-[#383c48] border-l-[#383c48] border-b-[#111317] border-r-[#111317] text-zinc-200 hover:bg-[#282b35]')
      : isLight ? 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-zinc-900'
      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white';
    const btnCancel  = isRetro
      ? (isLight
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-rose-700 hover:bg-red-100'
          : 'bg-[#1a1c23] border-2 border-t-[#383c48] border-l-[#383c48] border-b-[#111317] border-r-[#111317] text-rose-400 hover:bg-[#2c1d21]')
      : isLight ? 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-600'
      : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400';
    const histBtn    = isRetro
      ? (isLight
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-[#000080] hover:bg-[#cbd6e2]'
          : 'bg-[#1a1c23] border-2 border-t-[#383c48] border-l-[#383c48] border-b-[#111317] border-r-[#111317] text-[#60a5fa] hover:bg-[#282b35]')
      : isLight ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
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
                    <button onClick={() => setShowQuickHistory(false)} className={`cursor-pointer text-lg font-black ${isRetro ? 'text-white' : isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-white'}`}>✕</button>
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
                <div className={`px-5 py-4 space-y-3 ${isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {/* Artículos */}
                  <div className={`rounded-lg border overflow-hidden ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                    <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`} ref={el => { if (el) el.style.setProperty('color','white','important'); }}>
                      Artículos
                    </div>
                    {sale.items.map((item, i) => (
                      <div key={i} className={`flex justify-between px-3 py-2 text-xs border-t ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                        <span className="truncate max-w-[60%]">{item.name} <span className={`font-mono ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>×{item.quantity}</span></span>
                        <span className="font-black">{sym}{(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  {/* Resumen */}
                  <div className={`flex justify-between items-center pt-2 border-t text-sm font-black ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                    <span className={isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'}>TOTAL</span>
                    <span className={isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-white'}>{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`text-[10px] ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Método de pago: <strong>{sale.paymentMethod}</strong>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button onClick={() => setQuickHistoryDetail(null)} className={`w-full py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
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
            ? (isRetro ? 'bg-[#800000] border-zinc-500' : isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/40 border-rose-800/50')
            : (isRetro ? 'bg-[#003c00] border-zinc-500' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-800/60 border-zinc-700');
          const confirmHeaderText = isCancel
            ? (isRetro ? 'text-white' : isLight ? 'text-rose-800' : 'text-rose-300')
            : (isRetro ? 'text-white' : isLight ? 'text-emerald-800' : 'text-white');
          return (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${modalBg}`}>
                <div className={`px-5 py-4 border-b ${confirmHeaderBg}`}>
                  <p className={`text-sm font-black uppercase tracking-wide ${confirmHeaderText}`}>
                    {isCancel ? '⚠️ Cancelar venta' : '🖨️ Reimprimir ticket'}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isRetro ? 'text-white/70' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {isCancel ? 'Esta acción revertirá la venta y restaurará el stock' : 'Se enviará el ticket a la impresora configurada'}
                  </p>
                </div>
                <div className={`px-5 py-4 space-y-2 text-xs ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div><span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Venta</span><span className="font-black font-mono">{sale.id}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Total</span><span className={`font-black ${isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Pago</span><span>{sale.paymentMethod}</span></div>
                    <div><span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Artículos</span><span>{sale.items.length}</span></div>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-[10px] mt-1 ${isCancel
                    ? (isRetro ? 'bg-red-50 border-red-300 text-red-800' : isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-950/20 border-rose-800/40 text-rose-300')
                    : (isRetro ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400')
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
                          id: sale.id,
                          items: (sale.items || []).map((i: any) => ({
                            description: i.description || i.name || '',
                            quantity: i.quantity,
                            price: i.price
                          })),
                          total: sale.total,
                          createdAt: sale.createdAt || new Date().toISOString(),
                          paymentMethod: sale.paymentMethod,
                          cashReceived: sale.cashReceived,
                          cardReceived: sale.cardReceived,
                          change: sale.change,
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
                  <button onClick={() => setQuickHistoryConfirm(null)} className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-800' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
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
        {posToast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-xl animate-fadeIn select-none max-w-sm ${
            posToast.type === 'success' 
              ? 'bg-[#121316] border-emerald-500/30 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
              : posToast.type === 'error'
              ? 'bg-[#121316] border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : posToast.type === 'warning'
              ? 'bg-[#121316] border-amber-500/30 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-[#121316] border-zinc-700 text-zinc-100 shadow-[0_0_15px_rgba(150,150,150,0.15)]'
          }`}>
            {posToast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {posToast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {posToast.type === 'warning' && <Info className="w-5 h-5 text-amber-400 shrink-0" />}
            {posToast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-bold leading-snug">{posToast.message}</span>
          </div>
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
            <div className="bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_12px_rgba(0,0,0,0.5)] text-black w-full max-w-2xl flex flex-col font-sans overflow-hidden animate-scaleUp" onClick={e => e.stopPropagation()}>
              {/* Title bar */}
              <div className="bg-gradient-to-r from-[#000080] to-[#1034a6] text-white px-3 py-1.5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <Wrench className="w-4 h-4 text-blue-200 animate-pulse" />
                  <span>Seleccionar Reparación para Cobro (F3)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRepairSelectionModal(false)}
                  className="w-4 h-4 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-950 font-black text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                <div className="bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white p-2 text-xs">
                  <input
                    type="text"
                    value={repairSearchQuery}
                    onChange={(e) => setRepairSearchQuery(e.target.value)}
                    placeholder="Buscar por ID, cliente, teléfono, marca o modelo..."
                    className="w-full outline-none border-none bg-transparent"
                    autoFocus
                  />
                </div>

                <div className="bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#dfdfdf] border-b-2 border-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2 border-r border-zinc-400">Ticket</th>
                        <th className="px-3 py-2 border-r border-zinc-400">Cliente</th>
                        <th className="px-3 py-2 border-r border-zinc-400">Equipo</th>
                        <th className="px-3 py-2 border-r border-zinc-400">Estado</th>
                        <th className="px-3 py-2 border-r border-zinc-400 text-right">Saldo</th>
                        <th className="px-3 py-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-300">
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
                              <td colSpan={6} className="px-3 py-8 text-center text-zinc-500 italic select-none">
                                No hay órdenes listas para entrega o devolución que coincidan con la búsqueda.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(o => {
                          const adv = getIndividualAdvance(o, orders);
                          const balance = Math.max(0, o.cost - adv);

                          return (
                            <tr key={o.id} className="hover:bg-zinc-100 transition-colors">
                              <td className="px-3 py-2 font-mono font-bold text-[#000080] border-r border-zinc-300">{o.id}</td>
                              <td className="px-3 py-2 border-r border-zinc-300">
                                <div className="font-bold text-zinc-900">{o.customerName}</div>
                                <div className="text-[10px] text-zinc-500">{formatPhoneNumber(o.customerPhone)}</div>
                              </td>
                              <td className="px-3 py-2 border-r border-zinc-300">
                                <div className="font-bold text-zinc-800">{o.deviceBrand} {o.deviceModel}</div>
                                <div className="text-[10px] text-zinc-500 truncate max-w-[150px]" title={o.serviceType}>{o.serviceType}</div>
                              </td>
                              <td className="px-3 py-2 border-r border-zinc-300">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${o.status === 'Listo' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-zinc-900 border-r border-zinc-300">
                                {config.currencySymbol || '$'}{balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => addRepairOrderToBasket(o)}
                                  className="px-3 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
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

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRepairSelectionModal(false)}
                    className="px-4 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn text-left select-none">
        <div className="w-full max-w-4xl max-h-[85vh] bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 shadow-2xl flex flex-col overflow-hidden text-black animate-scaleUp">
          
          {/* Header */}
          <div className="px-5 py-3 bg-[#000080] text-white flex items-center justify-between shrink-0 modal-dark-header">
            <div className="flex items-center gap-2.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">⭐ CATÁLOGO RÁPIDO DE FAVORITOS</h3>
            </div>
            <button
              onClick={() => setShowFavoritesModal(false)}
              className="p-1 bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-[#cfcfcf] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-header: Search, Dynamic Categories & Info */}
          <div className="p-3 bg-[#eaeef3] border-b-2 border-zinc-400 space-y-2.5 shrink-0">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre, código SKU o categoría..."
                value={favSearchQuery}
                onChange={(e) => setFavSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-xs font-mono text-black placeholder-zinc-500 focus:outline-none"
              />
              {favSearchQuery && (
                <button onClick={() => setFavSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-black">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categorías Dinámicas (Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFavSelectedCategory('TODAS')}
                className={`px-3 py-1.5 text-[10px] font-black tracking-wide uppercase transition-all shrink-0 cursor-pointer border-2 ${
                  favSelectedCategory === 'TODAS'
                    ? 'bg-[#000080] text-white border-t-white border-l-white border-b-zinc-800 border-r-zinc-800'
                    : 'bg-[#dfdfdf] text-black border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 hover:bg-zinc-200'
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
                    className={`px-3 py-1.5 text-[10px] font-black tracking-wide uppercase transition-all shrink-0 cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-[#000080] text-white border-t-white border-l-white border-b-zinc-800 border-r-zinc-800'
                        : 'bg-[#dfdfdf] text-black border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    📁 {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Instrucción exactamente igual a coincidencia de búsqueda */}
            <p className="text-xs text-zinc-700 font-bold leading-relaxed bg-[#f8fafc] p-2 border border-zinc-300 font-mono">
              Se encontraron <span className="font-extrabold text-[#000080]">{totalFavs}</span> coincidencias. Navegue con las teclas <span className="bg-[#dfdfdf] px-1 border border-zinc-400">↑ ↓</span> y confirme con <span className="bg-[#dfdfdf] px-1 border border-zinc-400">Enter</span> o con clic.
            </p>
          </div>

          {/* Tabla de Lista Retro (Exactamente igual a Búsqueda) */}
          <div className="flex-1 overflow-hidden p-3 min-h-0 bg-[#ffffff]">
            {totalFavs === 0 ? (
              <div className="py-12 text-center text-zinc-600 flex flex-col items-center justify-center gap-2 font-mono">
                <Star className="w-10 h-10 opacity-30 text-amber-600" />
                <p className="text-xs font-bold text-zinc-800">
                  {allFavoriteItems.length === 0 
                    ? 'No hay refacciones ni productos marcados como favoritos aún.' 
                    : 'No se encontraron artículos favoritos en esta categoría o búsqueda.'}
                </p>
                <p className="text-[11px] text-zinc-500 max-w-sm">
                  Puedes marcar cualquier pieza o producto como favorito en Stock o Refacciones usando el botón de estrella ⭐.
                </p>
              </div>
            ) : (
              <div id="pos-fav-modal-table-container-retro" className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white overflow-hidden max-h-[440px] overflow-y-auto bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#dfdfdf] border-b-2 border-zinc-400 text-black font-extrabold uppercase text-[10px] select-none">
                      <th className="px-4 py-1.5 border-r border-zinc-350">Código</th>
                      <th className="px-4 py-1.5 border-r border-zinc-350 w-1/2">Nombre / Categoría</th>
                      <th className="px-4 py-1.5 border-r border-zinc-350 text-right">Precio</th>
                      <th className="px-4 py-1.5 text-center">Existencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                    {filteredFavoriteItems.map((item, idx) => {
                      const isStockControlled = item.manageStock !== false;
                      const isAgotado = isStockControlled && item.stock === 0;
                      const isSelected = idx === favSelectedIndex;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            addToBasket(item);
                            triggerToast?.('¡Agregado a la venta!', 'success');
                          }}
                          onMouseMove={() => { if (favSelectedIndex !== idx) setFavSelectedIndex(idx); }}
                          className={`cursor-pointer ${
                            isSelected ? 'pos-modal-row-selected pos-fav-row-selected text-white font-bold' : ''
                          }`}
                        >
                          <td className={`px-4 py-1.5 border-r ${
                            isSelected ? 'bg-[#000080] text-white font-extrabold' : 'text-zinc-800 font-bold'
                          }`}>
                            {item.code || 'S/C'}
                          </td>
                          <td className={`px-4 py-1.5 border-r max-w-0 ${
                            isSelected ? 'bg-[#000080] text-white font-extrabold' : 'text-zinc-800'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <PosItemThumbnail imageUrl={item.imageUrl} extraImages={item.extraImages} name={item.name} code={item.code} category={item.category} price={item.price} currencySymbol={config.currencySymbol} size={32} />
                              <div className="flex-1 min-w-0 break-words whitespace-normal">
                                <span className={`block font-black uppercase text-[11.5px] font-sans break-words whitespace-normal ${
                                  isSelected ? 'text-white font-extrabold' : 'text-black'
                                }`}>{item.name}</span>
                                <span className={`inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                                  isSelected ? 'bg-white/20 text-white border-white/40' : 'bg-zinc-150 text-zinc-600 border-zinc-300'
                                }`}>{item.category || 'GENERAL'}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-1.5 text-right font-black border-r ${
                            isSelected ? 'bg-[#000080] text-white font-extrabold' : 'text-emerald-700'
                          }`}>
                            {config.currencySymbol}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-1.5 text-center ${
                            isSelected ? 'bg-[#000080] text-white' : ''
                          }`}>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isSelected
                                ? 'bg-white/20 text-white border border-white/40'
                                : !isStockControlled ? 'bg-indigo-50 border border-indigo-200 text-indigo-800' : item.stock > 5 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {!isStockControlled ? '∞' : `${item.stock} disp`}
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
          <div className="px-5 py-2 bg-[#dfdfdf] border-t-2 border-zinc-400 flex items-center justify-between text-[11px] font-mono font-bold text-black shrink-0 select-none">
            <span>[ESC] CERRAR</span>
            <span>SEL: #{currentSelNum} DE {totalFavs}</span>
          </div>

        </div>
      </div>
    );
  };

    return (
      <div id="pos-view-root" className="flex-1 p-3 md:p-4 bg-[#eaeef3] overflow-hidden lg:h-full flex flex-col space-y-3.5 text-zinc-900 select-none min-h-0">
        {/* Alerts / Receipts */}
        {lastSaleReceipt && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-805 text-xs rounded-md shadow flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h5 className="font-bold">¡Venta {lastSaleReceipt} procesada con éxito!</h5>
              <p className="text-[10px] text-zinc-500 font-normal">El stock fue decrementado y se ingresó el dinero a la caja diaria.</p>
            </div>
          </div>
        )}

        {/* 1. Retro, wide, and uniform fully white borderless search bar under the topbar */}
        <div className="premium-search-container animate-fadeIn shrink-0 select-none">
          {/* Magnifying glass (lupa) */}
          <div className="flex items-center text-zinc-400 shrink-0">
            <Search className="w-5 h-5 text-zinc-400" />
          </div>

          {/* Vertical divider line */}
          <div className="w-[1px] h-6 bg-zinc-200 mx-4 shrink-0"></div>

          {/* Main search text input */}
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
                className="absolute right-0 text-zinc-400 hover:text-zinc-600 transition-colors select-none cursor-pointer premium-search-icon-btn"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {savedSales.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSavedSalesListModal(true)}
              className="ml-4 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer animate-pulse shrink-0 select-none"
            >
              📁 En Espera ({savedSales.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => { setFavSearchQuery(''); setFavSelectedCategory('TODAS'); setShowFavoritesModal(true); }}
            title="Ver catálogo rápido de productos y refacciones favoritas"
            className="ml-2 px-3 py-1.5 bg-[#dfdfdf] hover:bg-[#cbd6e2] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-[10px] font-black text-[#000080] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
          >
            ⭐ Favoritos
          </button>
          <button
            type="button"
            onClick={() => { setPriceCheckerQuery(''); setPriceCheckerResults(null); setShowPriceChecker(true); }}
            title="Verificar precio de un artículo"
            className="ml-2 px-3 py-1.5 bg-[#dfdfdf] hover:bg-[#cbd6e2] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
          >
            🏷️ Precios
          </button>
        </div>
        {/* 2-State Core Workspace */}
        {basket.length === 0 ? (
          /* =========================================================
             IDLE DASHBOARD DESIGN: CENTRE-PIECE BRAND GRAPHIC & KEYS
             ========================================================= */
          <div
            className="flex-1 bg-white border border-zinc-300 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-8 md:gap-16 min-h-0 overflow-y-auto"
            onClick={() => {
              const now = Date.now();
              if (now - lastClickTimeRef.current < 350) setShowQuickHistory(true);
              lastClickTimeRef.current = now;
            }}
          >
            
            {/* Left: FIXMANAGER Clean Logo */}
            <div className="flex items-center gap-4 select-none shrink-0 md:border-r md:border-dashed md:border-zinc-300/85 md:pr-12">
              
              {/* Clean Computer/POS Icon constructed via solid CSS/Tailwind */}
              <div className="relative w-24 h-28 flex flex-col items-center justify-center">
                <div className="w-16 h-12 bg-[#0c66e4] rounded border-2 border-blue-700 flex items-center justify-center relative shadow-sm">
                  {/* Innards of screen: Clean lines representing UI */}
                  <div className="w-12 h-8 bg-white rounded-sm flex flex-col p-1 gap-1">
                    <div className="h-1.5 w-7 bg-emerald-500 rounded-sm"></div>
                    <div className="h-1 w-10 bg-zinc-200 rounded-sm"></div>
                    <div className="h-1 w-8 bg-zinc-200 rounded-sm"></div>
                  </div>
                  {/* Stand of screen */}
                  <div className="absolute -bottom-2 w-4 h-2 bg-zinc-400 border border-zinc-500"></div>
                  <div className="absolute -bottom-3 w-8 h-1 bg-zinc-500 rounded-sm"></div>
                </div>
              </div>

              {/* FIXMANAGER typography block */}
              <div className="leading-none flex flex-col select-none font-sans justify-center space-y-1">
                <span className="text-3xl md:text-4xl font-black text-[#0c66e4] tracking-tighter uppercase font-display leading-none">
                  FIXMANAGER
                </span>
                <span className="text-[10px] font-mono font-black tracking-widest text-zinc-400 uppercase pt-0.5 leading-none">
                  POS / SERVICIOS
                </span>
              </div>
            </div>

            {/* Right: Beautifully Integrated Keycap Reference Panel (Static View) */}
            <div className={`p-5 border shadow-inner max-w-sm w-full shrink-0 flex flex-col space-y-4 relative ${
              isLight ? 'bg-[#f1f5f9]/70 border-zinc-300 rounded-2xl' : 'bg-zinc-900/60 border-zinc-800 rounded-none'
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-300 pb-2 mb-0.5 select-none text-[10px]">
                <span className="font-extrabold text-[#0c66e4] uppercase tracking-wider flex items-center gap-1">
                  ⌨️ Guía de Atajos Físicos
                </span>
                <span className="text-zinc-500 font-mono font-bold uppercase tracking-widest">
                  FIXMANAGER
                </span>
              </div>

              <div className="flex flex-col space-y-1.5 pr-1">
                {[
                  { key: 'F2', label: 'Clientes', action: 'Asignar cliente o referencia', color: isLight ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-[0_2px_0_rgba(99,102,241,0.45)]' : 'bg-indigo-950/80 text-indigo-300 border-indigo-900/60 shadow-[0_2px_0_rgba(99,102,241,0.25)]' },
                  { key: 'F3', label: 'Reparación', action: 'Cobrar orden de servicio', color: isLight ? 'bg-violet-50 text-violet-850 border-violet-300 shadow-[0_2px_0_rgba(139,92,246,0.45)]' : 'bg-violet-950/80 text-violet-300 border-violet-900/60 shadow-[0_2px_0_rgba(139,92,246,0.25)]' },
                  { key: 'F5', label: 'Finalizar venta', action: 'Cobrar actual cesta de compras', color: isLight ? 'bg-emerald-50 text-emerald-850 border-emerald-300 shadow-[0_2px_0_rgba(5,150,105,0.45)]' : 'bg-emerald-950/80 text-emerald-300 border-emerald-900/60 shadow-[0_2px_0_rgba(5,150,105,0.25)]' },
                  { key: 'F10', label: 'Guardar venta', action: 'Mandar venta activa a espera', color: isLight ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-[0_2px_0_rgba(12,102,228,0.45)]' : 'bg-blue-950/80 text-blue-300 border-blue-900/60 shadow-[0_2px_0_rgba(12,102,228,0.25)]' },
                  { key: 'X', label: 'Cancelar', action: 'Vaciar cesta o cerrar menús', color: isLight ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-[0_2px_0_rgba(225,29,72,0.45)]' : 'bg-rose-950/80 text-rose-350 border-rose-900/60 shadow-[0_2px_0_rgba(225,29,72,0.25)]' },
                  { key: 'F6', label: 'Calculadora', action: 'Herramienta de cálculo rápido', color: isLight ? 'bg-cyan-50 text-cyan-800 border-cyan-300 shadow-[0_2px_0_rgba(6,182,212,0.45)]' : 'bg-cyan-950/80 text-cyan-300 border-cyan-900/60 shadow-[0_2px_0_rgba(6,182,212,0.25)]' },
                  { key: 'F9', label: 'Contador', action: 'Caja chica y conteo de caja', color: isLight ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-[0_2px_0_rgba(147,51,234,0.45)]' : 'bg-purple-950/80 text-purple-300 border-purple-900/60 shadow-[0_2px_0_rgba(147,51,234,0.25)]' },
                  { key: '2×', label: 'Últimas ventas', action: 'Doble click — ver y gestionar las últimas 10 ventas', color: isLight ? 'bg-zinc-100 text-zinc-700 border-zinc-400 shadow-[0_2px_0_rgba(113,113,122,0.45)]' : 'bg-zinc-800 text-zinc-300 border-zinc-700 shadow-[0_2px_0_rgba(113,113,122,0.25)]' },
                  { key: 'Ctrl +/-', label: 'Escala / Zoom', action: 'Ampliar o reducir escala de pantalla', color: isLight ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-[0_2px_0_rgba(245,158,11,0.45)]' : 'bg-amber-950/80 text-amber-300 border-amber-900/60 shadow-[0_2px_0_rgba(245,158,11,0.25)]' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-1.5 border select-none ${
                      isLight ? 'bg-white border-zinc-200 rounded-xl' : 'bg-zinc-950/40 border-zinc-800/80 rounded-none'
                    } shadow-sm`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`min-w-[40px] text-center font-mono font-black text-[10px] leading-tight select-none uppercase tracking-wide border rounded px-1.5 py-1 ${item.color}`}>
                        {item.key}
                      </span>
                      <div className="flex flex-col select-none">
                        <span className={`text-[11px] font-extrabold uppercase tracking-tight leading-tight ${!isLight ? 'text-white' : 'text-zinc-800'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[9.5px] leading-none pt-0.5 font-medium ${!isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {item.action}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-[9px] text-zinc-500 text-center uppercase tracking-wider font-extrabold pt-1">
                ✦ Presione las teclas físicas de su sistema para accionar ✦
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             ACTIVE TRANSACTION STATE: COMPACT FULL-WIDTH CART FOR RETRO-WINDOW
             ========================================================= */
          <div className="flex-1 flex flex-col min-h-0 bg-white border border-zinc-300 rounded-lg p-3 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 mb-2 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-[#0c66e4] uppercase tracking-wider flex items-center gap-1.5">
                  🛒 COMPROBANTE DE VENTA / CARRO ACTUAL ({basketTotalItems} {basketTotalItems === 1 ? 'artículo' : 'artículos'})
                </span>
              </div>
            </div>

            {/* Main Basket Grid */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px] leading-tight select-none">
                    <th className="px-3 py-1 w-28">Código</th>
                    <th className="px-3 py-1">Artículo / Descripción</th>
                    <th className="px-3 py-1 text-center w-24">Cantidad</th>
                    <th className="px-3 py-1 text-right w-28">Precio Unit.</th>
                    <th className="px-3 py-1 text-right w-24">Subtotal</th>
                    <th className="px-3 py-1 text-center w-12">Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 animate-fadeIn">
                  {basket.map((item) => {
                    const currentPrice = item.customPrice !== undefined ? item.customPrice : item.item.price;
                    const isStockControlled = item.item.manageStock !== false;
                    const availableStock = item.item.stock - (item.item.reservedQty || 0);
                    const isOutOfStock = isStockControlled && availableStock <= 0;
                    const isInsufficient = isStockControlled && availableStock > 0 && item.quantity > availableStock;
                    const rowId = item.uniqueId || item.item.id;

                    return (
                      <tr key={rowId} className={`transition-all font-semibold border-l-4 ${
                        isOutOfStock ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-l-amber-600' :
                        isInsufficient ? 'bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 border-l-amber-500' :
                        'hover:bg-zinc-50 text-zinc-800 border-l-transparent'
                      }`}>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-zinc-500 truncate max-w-[112px]" title={item.item.code || 'S/C'}>
                          {item.item.code || 'S/C'}
                        </td>
                        <td className="px-3 py-1.5 font-sans uppercase text-[11px] text-zinc-900 font-bold max-w-0">
                          <div className="flex items-center gap-2.5">
                            <PosItemThumbnail imageUrl={item.item.imageUrl} extraImages={item.item.extraImages} name={item.item.name} code={item.item.code} category={item.item.category} price={currentPrice} currencySymbol={config.currencySymbol} size={30} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-2 w-full">
                                <div className="flex flex-col">
                                  <span className="truncate">{item.item.name}</span>
                                  {item.chipActivation && (
                                    <div className="text-[10px] font-mono font-bold text-green-700 flex items-center gap-1.5 mt-0.5 bg-green-50 border border-green-300 px-2 py-0.5 rounded w-fit select-none">
                                      <span>📞 {item.chipActivation.chipNumber}</span>
                                      <span className="text-zinc-400">|</span>
                                      <span>👤 {item.chipActivation.clientName}</span>
                                      {item.chipActivation.iccid && (
                                        <>
                                          <span className="text-zinc-400">|</span>
                                          <span>SIM: {item.chipActivation.iccid}</span>
                                        </>
                                      )}
                                      {item.chipActivation.imei && (
                                        <>
                                          <span className="text-zinc-400">|</span>
                                          <span>IMEI: {item.chipActivation.imei}</span>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setEditingChipBasketItem(item)}
                                        className="text-blue-700 hover:text-blue-800 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
                                      >
                                        Editar
                                      </button>
                                    </div>
                                  )}
                                  {item.item.isChip === true && !item.chipActivation && (
                                    <div className="text-[10px] font-mono font-bold text-zinc-650 flex items-center gap-1.5 mt-0.5 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded w-fit select-none">
                                      <span>⚠️ Sin Registrar (Venta Normal)</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingChipBasketItem(item)}
                                        className="text-blue-700 hover:text-blue-800 font-sans text-[9px] underline uppercase tracking-wider ml-1 cursor-pointer select-none"
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
                              <div className="text-[9px] text-zinc-400 font-normal capitalize flex items-center gap-2 mt-0.5 select-none">
                                <span>{item.item.brand} · {item.item.category}</span>
                                {item.item.wholesalePrice !== undefined && item.item.wholesalePrice > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleBasketItemPriceType(rowId)}
                                    className={`text-[8.5px] font-black px-1.5 py-0.5 transition-all cursor-pointer border select-none leading-none ${
                                      (item.priceType || saleType) === 'mayoreo'
                                        ? 'bg-blue-50 border-blue-400 text-blue-800 font-black shadow-sm'
                                        : 'bg-[#dfdfdf] border-zinc-400 text-zinc-700 hover:bg-[#eaeef3]'
                                    }`}
                                    style={{
                                      borderStyle: 'outset',
                                      borderWidth: '1.5px'
                                    }}
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
                              className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 text-zinc-600 flex items-center justify-center cursor-pointer font-black border border-zinc-300 shadow-sm active:scale-95 text-xs select-none"
                            >
                              -
                            </button>
                            <span className="font-mono text-zinc-800 font-black w-6 text-center text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(rowId, 1)}
                              title="Sumar 1 de este artículo"
                              className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 text-zinc-600 flex items-center justify-center cursor-pointer font-black border border-zinc-300 shadow-sm active:scale-95 text-xs select-none"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-700">
                          {editingItemId === rowId ? (
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
                                className="w-20 text-right bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-1 py-0.5 text-xs font-mono font-bold text-black focus:outline-none focus:border-blue-600"
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 group">
                              <span className={item.customPrice !== undefined ? 'text-amber-700 font-black' : ''}>
                                {config.currencySymbol}{currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {item.customPrice !== undefined && (
                                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-0.5 rounded">MOD</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRequestEditPrice(rowId, currentPrice)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-[#000080] cursor-pointer ml-0.5"
                                title={isAdminMode ? 'Editar precio' : 'Editar precio (requiere PIN de administrador)'}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-extrabold text-emerald-600 text-xs text-nowrap">
                          {config.currencySymbol}{(currentPrice * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromBasket(rowId)}
                            className="p-1 px-2 border border-zinc-200 hover:border-red-300 hover:bg-red-50 text-zinc-400 hover:text-red-650 rounded-md transition-all cursor-pointer inline-flex items-center justify-center active:scale-90"
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

            <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-between items-center select-none shrink-0 font-sans text-[10px] text-zinc-400">
              <span>Para finalizar esta venta, presione el botón <strong>Cobrar</strong> o la tecla <strong>F5</strong> del teclado.</span>
              <span className="font-mono uppercase text-zinc-500 font-bold bg-zinc-50 border px-1.5 py-0.5 rounded">DOCUMENTO DE VENTA ACTIVO</span>
            </div>
          </div>
        )}

        {/* 3. Pinned bottom bar - Totalizer and Action buttons */}
        <div className="bg-white border text-xs text-zinc-800 flex items-center justify-between shadow-sm px-4 py-2.5 bg-[#fafafa] rounded-lg border-zinc-300 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest font-sans select-none leading-none pt-0.5">
                Total:
              </span>
              <span className="text-2xl md:text-3xl font-black text-[#0c66e4] font-mono tracking-tighter leading-none select-none">
                {config.currencySymbol}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Selector de Tipo de Venta (Público / Mayoreo) */}
            <div className="flex items-center gap-3 bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-1 text-[9.5px] uppercase font-bold shrink-0 text-black font-mono">
              <span className="text-zinc-600">Venta:</span>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="radio"
                  name="retroSaleType"
                  checked={saleType === 'publico'}
                  onChange={() => setSaleType('publico')}
                  className="w-3 h-3 cursor-pointer accent-blue-700"
                />
                <span>Público</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="radio"
                  name="retroSaleType"
                  checked={saleType === 'mayoreo'}
                  onChange={() => setSaleType('mayoreo')}
                  className="w-3 h-3 cursor-pointer accent-blue-700"
                />
                <span>Mayoreo</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRepairSelectionModal(true)}
              title="Agregar saldo de orden de servicio al carrito [F3]"
              className={`px-4 py-2 text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b ${
                isLight ? 'bg-violet-600 hover:bg-violet-700 border-violet-800' : 'bg-violet-800 hover:bg-violet-700 border-violet-950'
              }`}
            >
              <span className="hidden sm:inline">Reparación</span> <span className="font-mono font-normal text-[9px] bg-black/15 px-1 py-0.5 rounded text-violet-100">[F3]</span>
            </button>
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={handleSaveSaleForLater}
              title="Guardar venta actual para después [F10]"
              className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b ${
                isLight ? 'bg-blue-600 hover:bg-blue-700 border-blue-800/80' : 'bg-blue-900 hover:bg-blue-800 border-blue-950'
              }`}
            >
              <span className="hidden sm:inline">Guardar</span> <span className="font-mono font-normal text-[9px] bg-black/15 px-1 py-0.5 rounded text-blue-100">[F10]</span>
            </button>
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={handleCheckout}
              title="Finalizar la venta actual y registrar el pago [F5]"
              className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b ${
                isLight ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700' : 'bg-emerald-800 hover:bg-emerald-750 border-emerald-950'
              }`}
            >
              <span className="hidden sm:inline">Cobrar</span> <span className="font-mono font-normal text-[9px] bg-black/15 px-1 py-0.5 rounded text-emerald-100">[F5]</span>
            </button>
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={() => setShowCancelConfirm(true)}
              title="Cancelar y vaciar todos los artículos agregados al carrito [X]"
              className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase text-[11px] font-black rounded tracking-wider cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-b ${
                isLight ? 'bg-[#dc2626] hover:bg-[#b91c1c] border-red-900/80' : 'bg-rose-900 hover:bg-rose-800 border-rose-950'
              }`}
            >
              <span className="hidden sm:inline">Cancelar</span> <span className="font-mono font-normal text-[9px] bg-black/15 px-1 py-0.5 rounded text-red-100">[X]</span>
            </button>
          </div>
        </div>

        {showSaleConfirm && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 w-full max-w-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.5)] flex flex-col font-sans overflow-hidden select-none" style={{ color: '#000' }}>
              
              {/* HEADER CONTAINER (ROYAL WINDOW DECORATION WITH BLUE BAR) */}
              <div id="pos-sale-confirm-header" className="bg-[#000080] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="space-y-0.5 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-1.5 py-0.5 rounded select-none" style={{ color: '#fff' }}>
                      Cliente
                    </span>
                    <h3 className="text-sm font-black tracking-tight uppercase truncate max-w-xs" style={{ color: '#fff' }}>
                      {saveSaleLabel || 'PÚBLICO GENERAL'}
                    </h3>
                  </div>
                </div>
                {/* BIG COUNTBOARD */}
                <div id="pos-cobro-total-box" className="flex items-center gap-2 bg-black px-3.5 py-1.5 border-2 border-zinc-500 rounded text-right min-w-[200px] justify-between md:justify-end">
                  <span className="text-[10px] font-mono uppercase">Cobro total:</span>
                  <div className="text-xl md:text-2xl font-mono font-black tracking-tighter">
                    {config.currencySymbol}{(payCash + payCard).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de {config.currencySymbol}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* ACTION KEY COMMAND SHORTCUT BAR */}
              <div className="bg-[#cbcbcb] text-zinc-700 px-3.5 py-1.5 border-b border-zinc-400 text-[10px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 select-none font-bold">
                <span className="text-zinc-500">ACCIONES:</span>
                <span>[F2] {posShouldPrintTicket ? '✔' : '❌'} Imprimir Ticket</span>
                <span>[F5] Confirmar Venta</span>
              </div>

              {/* MAIN ROWS OF PAYMENT PORTALS */}
              <div className="p-4 md:p-5 space-y-4 max-h-[60vh] overflow-y-auto bg-[#eaeef3]">
                {/* DISTRIBUTION PLATFORMS */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] uppercase font-bold text-zinc-700 tracking-wider">
                    Ingrese el pago del cliente por cada método:
                  </h4>

                  {/* 1. CASH INPUT ROW */}
                  <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2 max-w-sm w-full">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-250 select-none">
                        🪙
                      </div>
                      <div>
                        <span className="block text-xs font-extrabold text-slate-900 leading-none">
                          MXN Efectivo
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">Dinero entregado a mano</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-base font-black text-slate-500">{config.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={payCash || ''}
                          placeholder="0.00"
                          onChange={(e) => setPayCash(Number(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-48 bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] pl-8 pr-3 py-2.5 text-base text-black font-mono font-black text-right shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. CARD INPUT ROW */}
                  <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 max-w-sm w-full">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-250 select-none">
                          💳
                        </div>
                        <div>
                          <span className="block text-xs font-extrabold text-slate-900 leading-none">
                            Terminal / Tarjeta
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">Cobro con clip u otra terminal</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-base font-black text-slate-500">{config.currencySymbol}</span>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={payCard || ''}
                            placeholder="0.00"
                            onChange={(e) => setPayCard(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-48 bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] pl-8 pr-3 py-2.5 text-base text-black font-mono font-black text-right shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-1.5 p-2 bg-[#dfdfdf]/40 border-t border-dashed border-zinc-300 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <span className="text-[9.5px] uppercase font-bold text-zinc-600">
                        Código / ID Folio de Operación Terminal (Opcional):
                      </span>
                      <input
                        type="text"
                        value={cardCode}
                        placeholder="Ej. T-184729"
                        onChange={(e) => setCardCode(e.target.value)}
                        className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] px-2 py-0.5 text-xs text-black font-mono font-bold w-full"
                      />
                    </div>
                  </div>

                  {/* 3. DISCOUNT INPUT CARD */}
                  <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex flex-col gap-2 shadow-inner" style={{ color: '#000' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 max-w-sm w-full">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-250 select-none">
                          🏷️
                        </div>
                        <div>
                          <span className="block text-xs font-extrabold text-slate-900 leading-none">
                            Descuento a la Venta
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">Descuento global en esta venta</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id="discount-active-chk-retro"
                          checked={discountEnabled}
                          onChange={(e) => {
                            setDiscountEnabled(e.target.checked);
                            if (!e.target.checked) {
                              setDiscountValue(0);
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="discount-active-chk-retro" className="text-xs font-bold cursor-pointer select-none">
                          Habilitar
                        </label>
                      </div>
                    </div>

                    {discountEnabled && (
                      <div className="mt-1.5 p-2 bg-[#dfdfdf]/45 border-t border-dashed border-zinc-300 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase font-bold text-zinc-700">Tipo:</span>
                          <select
                            value={discountType}
                            onChange={(e) => {
                              setDiscountType(e.target.value as 'percentage' | 'fixed');
                              setDiscountValue(0);
                            }}
                            className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none rounded-none px-1.5 py-0.5 text-xs font-bold"
                          >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Cantidad Fija ($)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase font-bold text-zinc-700">
                            {discountType === 'percentage' ? 'Porcentaje:' : 'Cantidad:'}
                          </span>
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-0.5 text-xs font-bold text-slate-600">
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
                              className="w-full bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] pl-6 pr-2 py-0.5 text-xs font-bold font-mono"
                            />
                          </div>
                        </div>

                        {/* QUICK PERCENTAGE BUTTONS (Only if type is percentage) */}
                        {discountType === 'percentage' && (
                          <div className="col-span-1 sm:col-span-2 flex items-center gap-2 pt-1 border-t border-dashed border-zinc-300">
                            <span className="text-[9px] uppercase font-bold text-zinc-500">Atajos:</span>
                            {[5, 10, 15, 20].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setDiscountValue(pct)}
                                className="px-2 py-0.5 text-[9.5px] bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer font-bold"
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>


                  {/* WhatsApp inline card removed in favor of beautiful focused modal on checkout */}

                </div>

                {/* STATUS BAR WITH RESIDUAL TOTAL */}
                {(() => {
                  const totalReceived = payCash + payCard;
                  const isComplete = totalReceived >= basketTotal;
                  const difference = Math.abs(totalReceived - basketTotal);
                  const hasChange = isComplete && difference > 0.005;

                  return (
                    <div className={`border-2 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono transition-all duration-300 ${
                      hasChange
                        ? 'bg-emerald-100/90 border-t-emerald-600 border-l-emerald-600 border-b-emerald-250 border-r-emerald-250'
                        : 'bg-white border-b-white border-r-white border-t-[#808080] border-l-[#808080]'
                    }`}>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        <span>ESTADO DEL PAGO:</span>
                        {isComplete ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px]">
                            SUFICIENTE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] animate-pulse">
                            INCOMPLETO
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        {isComplete ? (
                          hasChange ? (
                            <span className="inline-block px-3 py-1.5 bg-emerald-600 text-white font-mono font-black text-sm sm:text-base border-2 border-t-white border-l-white border-b-emerald-800 border-r-emerald-800 animate-[pulse_1.5s_infinite] shadow-sm select-none">
                              CAMBIO A DEVOLVER: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-sm font-extrabold text-emerald-700">
                              CAMBIO A DEVOLVER: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )
                        ) : (
                          <span className="text-sm font-extrabold text-rose-700 animate-pulse">
                            DIFERENCIA RESTANTE: {config.currencySymbol}{difference.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* COLLAPSIBLE FOR SALE NOTE */}
                <div className="bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-0.5 font-mono shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowNoteOption(!showNoteOption)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 select-none hover:bg-zinc-200 focus:outline-none"
                  >
                    <span>{showNoteOption ? '[-] Ocultar Nota del Ticket' : '[+] Agregar Nota al Ticket de Venta'}</span>
                    <span className="text-[9px]">{showNoteOption ? '▲' : '▼'}</span>
                  </button>

                  {showNoteOption && (
                    <div className="p-2.5 bg-[#eaeef3] border-t-2 border-[#808080] flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold uppercase text-zinc-700 select-none">Nota / Observación para el Ticket:</label>
                      <textarea
                        value={saleNote}
                        onChange={(e) => setSaleNote(e.target.value)}
                        placeholder="Ej. Se entrega revisado y funcionando..."
                        className="w-full px-2 py-1 text-xs border-2 border-zinc-750 bg-white text-zinc-950 font-mono focus:outline-none"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* ACCORDION/COLLAPSIBLE FOR SPECIAL OPTIONS */}
                <div className="bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-0.5 font-mono shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowSpecialOptions(!showSpecialOptions)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 select-none hover:bg-zinc-200 focus:outline-none"
                  >
                    <span>{showSpecialOptions ? '[-] Ocultar Métodos Especiales' : '[+] Registrar como Fiado / Apartado'}</span>
                    <span className="text-[9px]">{showSpecialOptions ? '▲' : '▼'}</span>
                  </button>

                  {showSpecialOptions && (
                    <div className="p-2.5 bg-[#eaeef3] border-t-2 border-[#808080] flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={() => { setShowSpecialOptions(false); setShowSaleConfirm(false); setShowFiarModal(true); }}
                        title="Registrar esta venta como cuenta por cobrar / fiado [F6]"
                        className="flex-1 uppercase px-2 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 retro-white-text font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 text-center"
                      >
                        💳 Fiar Venta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const initialAmt = payCash + payCard;
                          setApartarInitialAmount(initialAmt > 0 ? initialAmt.toString() : '');
                          setApartarInitialMethod(payCard > 0 ? 'Tarjeta' : 'Efectivo');
                          setShowSaleConfirm(false);
                          setShowApartarModal(true);
                        }}
                        title="Apartar productos con pago inicial [F7]"
                        className="flex-1 uppercase px-2 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 retro-white-text font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 text-center"
                      >
                        📦 Apartar Productos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION COMMAND FEET */}
              <div className="bg-[#cbcbcb] text-zinc-600 px-4 py-3 border-t border-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* LEFT FOOTER CONTAINER: CHECKBOX & SPECIAL METHODS */}
                <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto justify-start">
                  {/* CHECKBOX IMPRESION */}
                  <div className="flex items-center gap-2 select-none hover:opacity-90 active:scale-98 transition-all">
                    <input 
                      type="checkbox" 
                      id="pos-check-print-ticket-retro"
                      checked={posShouldPrintTicket}
                      onChange={(e) => setPosShouldPrintTicket(e.target.checked)}
                      className="w-5 h-5 accent-green-700 bg-white border-2 border-zinc-500 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="pos-check-print-ticket-retro" className="text-[10px] sm:text-xs font-black text-black cursor-pointer uppercase tracking-normal">
                      Imprimir ticket <span className="text-green-700 font-mono">[F2]</span>
                    </label>
                  </div>

                </div>

                {/* RIGHT FOOTER CONTAINER: PRIMARY ACTIONS */}
                <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSaleConfirm(false)}
                    title="Cancelar y volver a la pantalla de venta"
                    className="flex-1 sm:flex-none uppercase px-2.5 sm:px-6 py-2.5 bg-red-600 hover:bg-red-700 retro-white-text font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-sm text-center"
                  >
                    Cancelar
                  </button>

                  {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                    <button
                      type="button"
                      onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : () => executeSale({ shareWA: true })}
                      disabled={(!isWaIntegratedOffline && (payCash + payCard < basketTotal)) || (posRegisterChipActivation && (!posActivationClientName.trim() || posActivationPhone.trim().length < 10))}
                      title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Confirmar pago y compartir por WhatsApp (sin ticket impreso)"}
                      className={`flex-1 sm:flex-none uppercase px-3.5 sm:px-5 py-2.5 font-black text-[10px] sm:text-xs tracking-wider cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 text-center whitespace-nowrap ${
                        isWaIntegratedOffline 
                          ? 'bg-[#dfdfdf] text-zinc-550 border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 grayscale'
                          : 'bg-[#25D366] hover:bg-[#128C7E] text-white border-2 border-t-emerald-300 border-l-emerald-300 border-b-emerald-800 border-r-emerald-800 disabled:opacity-55 disabled:cursor-not-allowed'
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
                    className="flex-1 sm:flex-none uppercase px-3.5 sm:px-7 py-2.5 bg-green-700 hover:bg-green-800 retro-white-text font-black text-[10px] sm:text-xs tracking-wider cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-55 disabled:cursor-not-allowed text-center whitespace-nowrap"
                  >
                    Cobrar [F5]
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal Fiar */}
        {showFiarModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => { setShowFiarModal(false); setShowSaleConfirm(true); }}>
            <div className="w-full max-w-sm mx-4 bg-white border-2 border-zinc-400 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="bg-[#000080] px-4 py-2.5 flex items-center justify-between"
                ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                <span className="font-black text-sm uppercase tracking-widest text-white">💳 Registrar Fiado</span>
                <button onClick={() => { setShowFiarModal(false); setShowSaleConfirm(true); }} className="text-white font-black text-lg cursor-pointer">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div className={`text-xs font-bold text-zinc-600 mb-1`}>Total a fiar: <span className="font-black text-zinc-900">{config.currencySymbol || '$'}{basketTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del cliente *</label>
                  <input id="fiar-nombre" autoFocus value={fiarClientName} onChange={e => handleCaretPreservingChange(e, setFiarClientName, val => val.toUpperCase())}
                    placeholder="NOMBRE COMPLETO..."
                    className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-3 py-1.5 text-sm font-bold uppercase outline-none focus:border-[#000080] placeholder:font-normal placeholder:normal-case placeholder:text-zinc-400"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-telefono')?.focus(); } }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                  <div className="flex mt-1 border-2 border-zinc-400 bg-white focus-within:border-[#000080]">
                    <select
                      value={fiarCountryCode}
                      onChange={e => setFiarCountryCode(e.target.value)}
                      className="bg-zinc-100 border-r-2 border-zinc-450 px-2 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                    <input id="fiar-telefono" value={fiarClientPhone}
                      onChange={e => setFiarClientPhone(formatPhoneNumber(e.target.value))}
                      placeholder="(351) 000-0000"
                      className="w-full bg-white border-none text-zinc-900 px-3 py-1.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-400"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('fiar-limit-retro')?.focus(); } }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Límite de Crédito ($)</label>
                  <input id="fiar-limit-retro" value={fiarCreditLimit} onChange={e => setFiarCreditLimit(e.target.value)}
                    placeholder={`Ej: ${config.defaultCreditLimit ?? 1000}`}
                    type="number"
                    min="0"
                    className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#000080] placeholder:font-normal placeholder:text-zinc-400"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp }); } }} />
                </div>
                <div className="flex flex-col gap-2 pt-1.5 border-t border-dashed border-zinc-300">
                  <div className="flex items-center gap-2 select-none hover:opacity-90 active:scale-98 transition-all">
                    <input 
                      type="checkbox" 
                      id="fiar-check-print-retro"
                      checked={fiarPrint}
                      onChange={toggleFiarPrint}
                      className="w-4 h-4 accent-green-700 bg-white border-2 border-zinc-500 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="fiar-check-print-retro" className="text-[10px] font-black text-black cursor-pointer uppercase tracking-normal select-none flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5 text-zinc-650" /> Imprimir ticket
                    </label>
                  </div>

                  {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                    <div 
                      title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                      onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : undefined}
                      className={`flex items-center gap-2 select-none transition-all ${
                        isWaIntegratedOffline 
                          ? 'opacity-35 grayscale cursor-pointer' 
                          : 'hover:opacity-90 active:scale-98 cursor-pointer'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        id="fiar-check-whatsapp-retro"
                        checked={!isWaIntegratedOffline && fiarWhatsapp}
                        disabled={isWaIntegratedOffline}
                        onChange={toggleFiarWhatsapp}
                        className="w-4 h-4 accent-green-700 bg-white border-2 border-zinc-500 rounded shrink-0 pointer-events-none"
                      />
                      <label htmlFor="fiar-check-whatsapp-retro" className="text-[10px] font-black text-black uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-650" /> Enviar por WhatsApp
                      </label>
                    </div>
                  )}
                </div>
                {fiarExistingAccount && (
                  <div className="bg-amber-50 border-2 border-amber-400 p-3 space-y-2">
                    <p className="text-xs font-black text-amber-800">⚠️ {fiarExistingAccount.matchType === 'phone' ? 'Teléfono ya registrado' : 'Nombre similar detectado'}</p>
                    {fiarExistingAccount.matchType === 'phone' ? (
                      <p className="text-[10px] text-amber-700">Ya existe una cuenta con ese teléfono a nombre de <strong>{fiarExistingAccount.clientName}</strong> (saldo: <strong>{config.currencySymbol || '$'}{fiarExistingAccount.balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>). ¿Agregar a esa cuenta?</p>
                    ) : (
                      <p className="text-[10px] text-amber-700">Se encontró una cuenta llamada <strong>{fiarExistingAccount.clientName}</strong> ({fiarExistingAccount.clientPhone}) con saldo <strong>{config.currencySymbol || '$'}{fiarExistingAccount.balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. ¿Es la misma persona o alguien diferente?</p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })} className="w-full py-1.5 bg-orange-500 text-white font-black text-[10px] uppercase cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700">
                        Agregar a cuenta de {fiarExistingAccount.clientName} ({fiarExistingAccount.clientPhone})
                      </button>
                      {fiarExistingAccount.matchType === 'name-only' && (
                        <button onClick={() => { executeFiar(true, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp }); }} className="w-full py-1.5 bg-blue-700 text-white font-black text-[10px] uppercase cursor-pointer border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700">
                          Crear nueva cuenta para {fiarClientName.trim().toUpperCase()} ({fiarClientPhone.trim()})
                        </button>
                      )}
                      <button onClick={() => setFiarExistingAccount(null)} className="w-full py-1.5 bg-zinc-200 text-zinc-700 font-black text-[10px] uppercase cursor-pointer border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              <div className="flex gap-2 pt-1">
                  <button onClick={() => executeFiar(false, { printTicket: fiarPrint, sendWhatsApp: fiarWhatsapp })} disabled={!fiarClientName.trim() || !fiarClientPhone.trim() || !fiarCreditLimit.trim()}
                    title="Confirmar y registrar el fiado para el cliente"
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700">
                    Confirmar fiado
                  </button>
                  <button onClick={() => { setShowFiarModal(false); setFiarExistingAccount(null); setShowSaleConfirm(true); }}
                    title="Cancelar y volver a la pantalla de cobro"
                    className="px-4 py-2 bg-zinc-200 text-zinc-700 font-black text-xs uppercase cursor-pointer border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Apartar */}
        {showApartarModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }}>
            <div className="w-full max-w-sm mx-4 bg-white border-2 border-zinc-400 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="bg-[#000080] px-4 py-2.5 flex items-center justify-between"
                ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c: Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                <span className="font-black text-sm uppercase tracking-widest text-white">📦 Apartar Productos</span>
                <button onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }} className="text-white font-black text-lg cursor-pointer">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-xs font-bold text-zinc-600 mb-1">Total a apartar: <span className="font-black text-zinc-900">{config.currencySymbol || '$'}{basket.reduce((s,b) => s + (b.customPrice ?? b.item.price) * b.quantity, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Nombre del cliente *</label>
                  <input autoFocus value={apartarClientName} onChange={e => handleCaretPreservingChange(e, setApartarClientName, val => val.toUpperCase())}
                    placeholder="NOMBRE COMPLETO..."
                    className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-3 py-1.5 text-sm font-bold uppercase outline-none focus:border-[#000080] placeholder:font-normal placeholder:normal-case placeholder:text-zinc-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Teléfono *</label>
                  <div className="flex mt-1 border-2 border-zinc-400 bg-white focus-within:border-[#000080]">
                    <select
                      value={apartarCountryCode}
                      onChange={e => setApartarCountryCode(e.target.value)}
                      className="bg-zinc-100 border-r-2 border-zinc-450 px-2 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                    <input value={apartarClientPhone} onChange={e => setApartarClientPhone(formatPhoneNumber(e.target.value))}
                      placeholder="(351) 000-0000"
                      className="w-full bg-white border-none text-zinc-900 px-3 py-1.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-zinc-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Anticipo inicial *</label>
                    <input type="number" min="0" value={apartarInitialAmount} onChange={e => setApartarInitialAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#000080] placeholder:font-normal placeholder:text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Método</label>
                    <select value={apartarInitialMethod} onChange={e => setApartarInitialMethod(e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia')}
                      className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-2 py-1.5 text-sm font-bold outline-none focus:border-[#000080]">
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500">Fecha límite *</label>
                  <input type="date" value={apartarDueDate} onChange={e => setApartarDueDate(e.target.value)}
                    className="w-full mt-1 bg-white border-2 border-zinc-400 text-zinc-900 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#000080]" />
                </div>
                <div className="flex flex-col gap-2 pt-1.5 border-t border-dashed border-zinc-350">
                  <div className="flex items-center gap-2 select-none hover:opacity-90 active:scale-98 transition-all">
                    <input 
                      type="checkbox" 
                      id="apartar-check-print-retro"
                      checked={apartarPrint}
                      onChange={toggleApartarPrint}
                      className="w-4 h-4 accent-green-700 bg-white border-2 border-zinc-500 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="apartar-check-print-retro" className="text-[10px] font-black text-black cursor-pointer uppercase tracking-normal select-none flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5 text-zinc-650" /> Imprimir ticket
                    </label>
                  </div>

                  {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                    <div 
                      title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                      onClick={isWaIntegratedOffline ? () => triggerToast?.('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.', 'warning') : undefined}
                      className={`flex items-center gap-2 select-none transition-all ${
                        isWaIntegratedOffline 
                          ? 'opacity-35 grayscale cursor-pointer' 
                          : 'hover:opacity-90 active:scale-98 cursor-pointer'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        id="apartar-check-whatsapp-retro"
                        checked={!isWaIntegratedOffline && apartarWhatsapp}
                        disabled={isWaIntegratedOffline}
                        onChange={toggleApartarWhatsapp}
                        className="w-4 h-4 accent-green-700 bg-white border-2 border-zinc-500 rounded shrink-0 pointer-events-none"
                      />
                      <label htmlFor="apartar-check-whatsapp-retro" className="text-[10px] font-black text-black uppercase tracking-normal select-none flex items-center gap-1 pointer-events-none">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-650" /> Enviar por WhatsApp
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleConfirmApartar({ printTicket: apartarPrint, sendWhatsApp: apartarWhatsapp })} disabled={!apartarClientName.trim()}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700">
                    Confirmar Apartado
                  </button>
                  <button onClick={() => { setShowApartarModal(false); setShowSaleConfirm(true); }}
                    className="px-4 py-2 bg-zinc-200 text-zinc-700 font-black text-xs uppercase cursor-pointer border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Due Modal */}
        {changeAmount !== null && (
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-300 w-full max-w-xs p-1 shadow-2xl rounded-xl font-sans text-slate-800 animate-fadeIn scale-100">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-[#10b981] to-emerald-500 text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🪙 Cambio a Entregar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChangeAmount(null)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-5 space-y-4 text-center">
                <div className="flex flex-col items-center gap-2 border border-slate-200 bg-white p-4 rounded-lg shadow-inner">
                  <span className="text-3xl animate-bounce">🪙</span>
                  <span className="text-xs uppercase text-slate-450 font-bold tracking-widest font-mono">Cambio a Entregar</span>
                  <span className="text-3xl font-mono font-black text-emerald-600 tracking-tight block">
                    {config.currencySymbol}{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setChangeAmount(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  autoFocus
                >
                  Cerrar / Listo ({countdown}s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Current Sale Confirmation Overlay Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-300 w-full max-w-md p-1 shadow-2xl rounded-xl font-sans text-slate-800">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-rose-600 to-red-500 text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
                  <Trash2 className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>¿Cancelar Venta Actual?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-600 shrink-0">
                    <Trash2 className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase text-xs tracking-wide text-rose-700">Esta acción es irreversible</h4>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      Se eliminarán todos los artículos (<strong>{basketTotalItems}</strong>) cargados actualmente en la cesta de compras. ¿Realmente desea limpiar la transacción actual?
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
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
                    className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
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
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmSaveSaleForLater(saveSaleLabel);
              }}
              className="bg-[#f8fafc] border border-slate-300 w-full max-w-sm p-1 shadow-2xl rounded-xl font-sans text-slate-800"
            >
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-[#2563eb] to-[#3b82f6] text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
                  <FolderHeart className="w-3.5 h-3.5 text-white" />
                  <span>Retener Venta Actual</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveSaleModal(false)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-600 shrink-0">
                    <FolderHeart className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold uppercase text-xs tracking-wider text-blue-800">Guardar para después</h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Mesa, nombre o referencia</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Identificador de Cliente / Referencia</label>
                  <input
                    type="text"
                    autoFocus
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Escriba el nombre o referencia..."
                    value={saveSaleLabel}
                    onChange={(e) => setSaveSaleLabel(e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                  <p className="text-[10px] text-slate-450 font-semibold leading-normal">
                    Ingrese una nota, nombre o mesa para recuperar esta venta fácilmente en la lista de espera.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveSaleModal(false)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
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
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-300 w-full max-w-2xl p-1 shadow-2xl rounded-xl font-sans text-slate-800 flex flex-col max-h-[85vh]">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-[#2563eb] to-[#3b82f6] text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs shrink-0 rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider font-bold animate-fadeIn">
                  <Archive className="w-3.5 h-3.5 text-white" />
                  <span>Ventas en Espera ({savedSales.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSavedSalesListModal(false)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-4 flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="flex items-center justify-between select-none">
                  <div>
                    <h4 className="font-extrabold uppercase text-xs tracking-wider text-indigo-900">Lista de Ventas Retenidas</h4>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Seleccione una para reanudar o eliminar de la lista</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSavedSalesListModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs leading-none transition-all cursor-pointer select-none"
                  >
                    CERRAR [Esc]
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
                  {savedSales.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2 select-none">
                      <span className="text-3xl block">📂</span>
                      <p className="text-xs font-bold uppercase tracking-wider">No hay ventas retenidas en la lista.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] select-none">
                            <th className="px-4 py-3 border-r border-slate-100">Identificador / Cliente</th>
                            <th className="px-4 py-3 border-r border-slate-100">Fecha y Hora</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-center">Artículos</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-right font-mono">Total</th>
                            <th className="px-4 py-3 text-center w-48 font-bold">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 bg-white">
                          {savedSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50 text-slate-800 transition-colors font-semibold">
                              <td className="px-4 py-3 uppercase font-extrabold text-slate-900">
                                {sale.label}
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 text-xs font-mono">
                                {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-black text-rose-600 text-sm">
                                {config.currencySymbol}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleLoadSavedSale(sale.id)}
                                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer select-none"
                                  >
                                    Recuperar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedSale(sale.id)}
                                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer select-none"
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
            </div>
          </div>
        )}

        {/* Custom Confirmation Deletion Modal to avoid window.confirm */}
        {saleToDelete !== null && (
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-300 w-full max-w-sm p-1 shadow-2xl rounded-xl font-sans text-slate-800">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-rose-650 to-red-650 text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Trash2 className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>Confirmar Eliminación</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-600 shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase text-xs tracking-wide text-rose-700">Esta acción no se puede deshacer</h4>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      ¿Está seguro de que desea eliminar permanentemente esta venta en espera?
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaleToDelete(null)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedSales(savedSales.filter((s) => s.id !== saleToDelete));
                      setSaleToDelete(null);
                    }}
                    className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pendingLoadSaleId !== null && (
          <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
            <div className="bg-[#f8fafc] border border-slate-300 w-full max-w-sm p-1 shadow-2xl rounded-xl font-sans text-slate-800">
              {/* Title Bar */}
              <div className="bg-gradient-to-r from-[#1c2d5a] via-[#2563eb] to-[#3b82f6] text-white px-2.5 py-1.5 flex items-center justify-between select-none font-bold text-xs rounded-t-lg">
                <div className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Archive className="w-3.5 h-3.5 text-white" />
                  <span>Conflicto de Carrito</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelLoadConflict}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-extrabold text-[10px] transition-all cursor-pointer border border-white/10"
                >
                  X
                </button>
              </div>

              {/* Client Area */}
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#fef9c3] border border-yellow-200 rounded text-yellow-700 shrink-0">
                    <Archive className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase text-xs tracking-wide text-indigo-900">El carrito no está vacío</h4>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
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
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  >
                    Sobrescribir carrito
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelLoadConflict}
                    className="py-2.5 bg-white hover:bg-slate-50 text-slate-500 font-bold border border-slate-200 rounded-lg shadow-sm active:scale-95 transition-all text-xs uppercase cursor-pointer text-center"
                  >
                    No hacer nada
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isSearchModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn"
            onClick={cancelAndCleanupSearchModal}
          >
            <div 
              className="bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_12px_rgba(0,0,0,0.5)] text-black w-full max-w-4xl flex flex-col font-sans overflow-hidden animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Titlebar */}
              <div className="bg-[#000080] p-1.5 flex items-center justify-between text-white select-none">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>🔍</span>
                  <span className="text-xs font-black tracking-wide uppercase">CATÁLOGO COMPLETO DE PRODUCTOS Y REFACCIONES</span>
                </div>
                <button 
                  type="button"
                  onClick={cancelAndCleanupSearchModal}
                  className="w-4 h-4 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-950 font-black text-[10px] cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              {paginatedModalItems.length > 0 ? (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-zinc-800 font-bold select-none leading-relaxed">
                    Se encontraron <span className="font-extrabold text-[#000080]">{matchedProductsForModal.length}</span> coincidencias. Navegue con las teclas <span className="font-black bg-zinc-200 border border-zinc-400 px-1 py-0.5 rounded font-mono">↑ ↓</span> y confirme con <span className="font-black bg-zinc-200 border border-zinc-400 px-1 py-0.5 rounded font-mono">Enter</span> o con clic.
                  </p>

                  {/* Table with Retro Biselado */}
                  <div id="pos-modal-table-container" className="border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-white max-h-[460px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-zinc-200 border-b-2 border-zinc-400 text-zinc-700 font-bold uppercase tracking-wider text-[10px] leading-tight select-none">
                          <th className="px-4 py-1.5 border-r border-zinc-350 w-[20%]">Código</th>
                          <th className="px-4 py-1.5 border-r border-zinc-350 w-[50%]">Nombre / Categoría</th>
                          <th className="px-4 py-1.5 border-r border-zinc-350 text-right w-[15%]">Precio</th>
                          <th className="px-4 py-1.5 text-center w-[15%]">Existencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                        {paginatedModalItems.map((product, idx) => {
                          const isSelected = idx === modalSelectedIndex;
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
                              className={`cursor-pointer ${
                                isSelected ? 'pos-modal-row-selected' : ''
                              }`}
                            >
                              <td className={`px-4 py-1.5 border-r break-all ${
                                isSelected ? 'bg-[#000080] text-white font-bold' : 'text-zinc-655'
                              }`}>
                                {product.code || 'S/C'}
                              </td>
                              <td className={`px-4 py-1.5 border-r max-w-0 ${
                                isSelected ? 'bg-[#000080] text-white font-bold' : 'text-zinc-800'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <PosItemThumbnail imageUrl={product.imageUrl} extraImages={product.extraImages} name={product.name} code={product.code} category={product.category} price={product.price} currencySymbol={config.currencySymbol} size={32} />
                                  <div className="flex-1 min-w-0 break-words whitespace-normal">
                                    <span className="block font-black uppercase text-[11.5px] font-sans break-words whitespace-normal">{product.name}</span>
                                    <span className={`inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border border-zinc-300 ${
                                      isSelected ? 'bg-white/20 text-white' : 'bg-zinc-150 text-zinc-600'
                                    }`}>{product.category}</span>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-1.5 text-right font-black border-r ${
                                isSelected ? 'bg-[#000080] text-white' : 'text-emerald-700'
                              }`}>
                                {config.currencySymbol}{product.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-4 py-1.5 text-center ${
                                isSelected ? 'bg-[#000080]' : ''
                              }`}>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  isSelected 
                                    ? 'bg-white/25 text-white' 
                                    : product.manageStock === false ? 'bg-indigo-50 border border-indigo-200 text-indigo-800' : product.stock > 5 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {product.manageStock === false ? '∞' : `${product.stock} disp`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Retro */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-center border-t border-zinc-400 pt-3 text-[10.5px]">
                    <div className="flex items-center gap-1.5 font-mono select-none uppercase font-bold text-zinc-600 text-[10px]">
                      <span>[Esc] Cerrar</span>
                      <span>•</span>
                      <span>Sel: <b className="text-[#000080]">#{modalSelectedIndex + 1 + (modalCurrentPage - 1) * 25} de {matchedProductsForModal.length}</b></span>
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
                          className="px-2.5 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                        >
                          ◀ Ant [PageUp]
                        </button>
                        <span className="font-black font-mono text-zinc-800 text-[10.5px]">
                          Página {modalCurrentPage} de {modalTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={modalCurrentPage === modalTotalPages}
                          onClick={() => {
                            setModalCurrentPage((p) => Math.min(modalTotalPages, p + 1));
                            setModalSelectedIndex(0);
                          }}
                          className="px-2.5 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Sig [PageDn] ▶
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VENTA RAPIDA RETRO */
                <div className="p-4 space-y-4">
                  <div className="p-2.5 bg-yellow-100 border border-yellow-400 text-yellow-900 rounded-sm text-xs select-none">
                    <p className="font-extrabold text-[10.5px] uppercase">Venta Rápida (Sin Coincidencias)</p>
                    <p className="text-[9.5px] font-medium leading-normal mt-0.5 text-yellow-800">
                      Registre este artículo de forma temporal para agregarlo a la transacción actual.
                    </p>
                  </div>

                  <div className="space-y-3.5 text-left text-black text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider block">Nombre del Artículo</label>
                      <input
                        type="text"
                        ref={modalFastSaleNameInputRef}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[#3px] px-2.5 py-1.5 font-sans font-bold text-xs text-black focus:outline-none"
                        placeholder="Escriba el nombre del artículo..."
                        value={fastSaleName}
                        onChange={(e) => handleCaretPreservingChange(e, setFastSaleName, val => val.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            modalFastSalePriceInputRef.current?.focus();
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
                          ref={modalFastSalePriceInputRef}
                          className="flex-1 bg-white px-3 py-2 font-mono font-black text-base text-red-700 focus:outline-none"
                          placeholder="0.00"
                          value={fastSalePrice}
                          onChange={(e) => setFastSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
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

                  {/* Buttons */}
                  <div className="flex justify-end gap-2 border-t border-zinc-400 pt-2.5">
                    <button
                      type="button"
                      onClick={cancelAndCleanupSearchModal}
                      className="px-3 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-black active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
                    >
                      Cancelar [Esc]
                    </button>
                    <button
                      type="button"
                      onClick={handleModalAddFastSaleItem}
                      className="px-4 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-[#000080] active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer"
                    >
                      Enviar Venta Rápida [Enter]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {isFastSaleModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn"
            onClick={() => {
              setIsFastSaleModalOpen(false);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
          >
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
                  onClick={() => {
                    setIsFastSaleModalOpen(false);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="w-4 h-4 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-950 font-black text-[10px] cursor-pointer"
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

                <div className="space-y-3.5 text-left text-black">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider block">Nombre del Artículo</label>
                    <input
                      type="text"
                      ref={fastSaleModalNameInputRef}
                      className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[#3px] px-2.5 py-1.5 font-sans font-bold text-xs text-black focus:outline-none"
                      placeholder="Escriba el nombre del artículo..."
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
                          setIsFastSaleModalOpen(false);
                          setTimeout(() => searchInputRef.current?.focus(), 50);
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
                            setIsFastSaleModalOpen(false);
                            setTimeout(() => searchInputRef.current?.focus(), 50);
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
                  onClick={() => {
                    setIsFastSaleModalOpen(false);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
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
          </div>
        )}

        {/* MODAL RETRO DE NÚMERO DE WHATSAPP (ESTILO WINDOWS 95) */}
        {showPosWhatsappModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[60] animate-fadeIn no-blur-backdrop">
            <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 max-w-md w-full shadow-[4px_4px_10px_rgba(0,0,0,0.5)] p-5 relative font-sans text-black animate-scaleUp">
              {/* Retro title bar */}
              <div className="bg-[#000080] p-1.5 flex items-center justify-between mb-3 text-white" ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                <span className="text-xs font-bold tracking-tight select-none flex items-center gap-1 font-mono text-white" style={{ color: '#ffffff' }}>
                  💬 Enviar ticket por WhatsApp
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPosShouldSendWhatsApp(false);
                    setShowPosWhatsappModal(false);
                  }}
                  className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[10px] font-black h-4 w-4 flex items-center justify-center cursor-pointer select-none"
                  title="Cerrar (Esc)"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5">
                <p className="text-[11px] leading-relaxed text-zinc-950 font-mono select-none">
                  El ticket de venta se generará en formato digital y se copiará al portapapeles. Al hacer clic en [Cobrar y Enviar], se completará la venta y se abrirá WhatsApp.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide block select-none">Número de WhatsApp (Celular)</label>
                  <input
                    type="text"
                    value={posWhatsappPhone}
                    onChange={(e) => setPosWhatsappPhone(e.target.value)}
                    placeholder="Número de celular..."
                    className="w-full bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] px-3 py-2 text-sm text-black font-mono font-bold text-right shadow-sm focus:outline-none"
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

                <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-400">
                  <button
                    type="button"
                    onClick={() => {
                      setPosShouldSendWhatsApp(false);
                      setShowPosWhatsappModal(false);
                    }}
                    className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-4 py-1.5 cursor-pointer font-bold select-none uppercase hover:bg-[#cfcfcf]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPosWhatsappModal(false)}
                    className="bg-[#dfdfdf] text-[#000080] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-4 py-1.5 cursor-pointer font-bold select-none uppercase hover:bg-[#cfcfcf]"
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-5 py-1.5 cursor-pointer font-bold select-none uppercase"
                  >
                    Cobrar y Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RETRO DE ACTIVACIÓN DE CHIP - AGREGAR AL CARRITO */}
        {pendingChipToAdd && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
            <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 max-w-lg w-full shadow-[4px_4px_10px_rgba(0,0,0,0.5)] p-5 relative font-sans text-black animate-scaleUp">
              {/* Retro title bar */}
              <div className="bg-[#000080] p-1.5 flex items-center justify-between mb-3 text-white" ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                <span className="text-xs font-bold tracking-tight select-none flex items-center gap-1 font-mono text-white" style={{ color: '#ffffff' }}>
                  ⚡ Datos de Activación de Chip
                </span>
                <button
                  type="button"
                  onClick={() => setPendingChipToAdd(null)}
                  className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[10px] font-black h-4 w-4 flex items-center justify-center cursor-pointer select-none"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3">
                <p className="text-[11px] leading-relaxed text-zinc-950 font-mono select-none">
                  Agregando chip: <span className="font-bold">{pendingChipToAdd.name}</span>. Captura los datos para registrar la activación de la línea o desactiva la casilla para realizar una venta normal.
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
                className="space-y-3.5"
              >
                <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retro-add-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-4 h-4 accent-green-700 bg-white border border-zinc-300 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="retro-add-chip-register-details" className="text-xs font-black text-zinc-700 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>

                {chipRegisterDetails ? (
                  <div className="bg-[#dfdfdf] border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white p-3.5 text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nombre Completo"
                        value={chipClientName}
                        onChange={(e) => setChipClientName(e.target.value)}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">Número del Chip *</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="10 dígitos"
                        value={chipPhone}
                        onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">ICCID (SIM) (Opcional)</label>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="19 o 20 dígitos"
                        value={chipIccid}
                        onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="15 dígitos"
                        value={chipImei}
                        onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-250 text-yellow-800 text-[11px] font-semibold font-mono leading-relaxed">
                    ⚠️ Se agregará el chip como venta normal (sin registrar activación).
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-400">
                  <button
                    type="button"
                    onClick={() => setPendingChipToAdd(null)}
                    className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-4 py-1.5 cursor-pointer font-bold select-none uppercase hover:bg-[#cfcfcf]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#dfdfdf] text-[#000080] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-5 py-1.5 cursor-pointer font-black select-none uppercase hover:bg-[#cfcfcf]"
                  >
                    Agregar al Carrito
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL RETRO DE ACTIVACIÓN DE CHIP - EDITAR DESDE EL CARRITO */}
        {editingChipBasketItem && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] animate-fadeIn no-blur-backdrop select-none">
            <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 max-w-lg w-full shadow-[4px_4px_10px_rgba(0,0,0,0.5)] p-5 relative font-sans text-black animate-scaleUp">
              {/* Retro title bar */}
              <div className="bg-[#000080] p-1.5 flex items-center justify-between mb-3 text-white" ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
                <span className="text-xs font-bold tracking-tight select-none flex items-center gap-1 font-mono text-white" style={{ color: '#ffffff' }}>
                  ✏️ Editar Datos de Activación
                </span>
                <button
                  type="button"
                  onClick={() => setEditingChipBasketItem(null)}
                  className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[10px] font-black h-4 w-4 flex items-center justify-center cursor-pointer select-none"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3">
                <p className="text-[11px] leading-relaxed text-zinc-950 font-mono select-none">
                  Modificando datos de activación para: <span className="font-bold">{editingChipBasketItem.item.name}</span>.
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
                className="space-y-3.5"
              >
                <div className="bg-white border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] p-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retro-edit-chip-register-details"
                    checked={chipRegisterDetails}
                    onChange={(e) => setChipRegisterDetails(e.target.checked)}
                    className="w-4 h-4 accent-green-700 bg-white border border-zinc-300 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="retro-edit-chip-register-details" className="text-xs font-black text-zinc-700 cursor-pointer uppercase select-none">
                    Registrar datos de activación
                  </label>
                </div>

                {chipRegisterDetails ? (
                  <div className="bg-[#dfdfdf] border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white p-3.5 text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">Nombre del Cliente *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nombre Completo"
                        value={chipClientName}
                        onChange={(e) => setChipClientName(e.target.value)}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">Número del Chip *</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="10 dígitos"
                        value={chipPhone}
                        onChange={(e) => setChipPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">ICCID (SIM) (Opcional)</label>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="19 o 20 dígitos"
                        value={chipIccid}
                        onChange={(e) => setChipIccid(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider block">IMEI del Equipo (Opcional)</label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="15 dígitos"
                        value={chipImei}
                        onChange={(e) => setChipImei(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-1 font-sans font-bold text-xs text-black font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-55 border border-yellow-250 text-yellow-800 text-[11px] font-semibold font-mono leading-relaxed">
                    ⚠️ Se desactivará el registro de activación para este chip al guardar los cambios.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-400">
                  <button
                    type="button"
                    onClick={() => setEditingChipBasketItem(null)}
                    className="bg-[#dfdfdf] text-black border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-4 py-1.5 cursor-pointer font-bold select-none uppercase hover:bg-[#cfcfcf]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#dfdfdf] text-[#000080] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-xs px-5 py-1.5 cursor-pointer font-black select-none uppercase hover:bg-[#cfcfcf]"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {renderShortcutModalsAndToasts()}
        {renderQuickHistoryModals()}
        {renderPriceCheckerModal()}
        {renderFavoritesModal()}
      </div>
    );
}
