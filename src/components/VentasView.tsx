/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  ShoppingCart, Search, Calendar, Printer, X, FileText, CheckCircle,
  TrendingDown, TrendingUp, ArrowUpDown, ArrowUpRight, ArrowDownLeft, Trash2, Eye, RefreshCw, FileDown,
  DollarSign, Smartphone, Sparkles, Check, HelpCircle, Send, AlertTriangle, Tag,
  ChevronDown, ChevronUp, Copy, Filter, MessageCircle, UserCheck, Scissors, Shield, ShieldCheck,
  Ticket, PiggyBank, CreditCard, Edit, RotateCcw
} from 'lucide-react';
import {
  Sale, WorkshopConfig, ActiveTab, AppUser, ChipActivation, RepairOrder
} from '../types';
import { buildPosTicketHtml, buildRechargeTicketHtml } from '../utils/ticketBuilder';
import { sendWhatsappNotification, buildWhatsappSaleTicketMessage, formatPhoneForWhatsapp, openWhatsappChat } from '../utils/whatsapp';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { buildA4ReportHtml, printA4Report, showToast, notifyDone } from '../utils/a4Reports';
import { isRechargeSale } from '../utils/folioUtils';
import * as XLSX from 'xlsx';

const formatDateToDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/* ==========================================================
   2. VENTAS VIEW
   ========================================================== */
export interface VentasViewProps {
  sales: Sale[];
  config: WorkshopConfig;
  setSelectedOrderId?: (id: string) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  onCancelSale?: (saleId: string) => void;
  onPartialRefundSale?: (saleId: string, refunds: { itemIndex: number; quantity: number }[]) => void;
  currentUser?: AppUser | null;
  chipActivations?: ChipActivation[];
  onUpdateChipActivation?: (updated: ChipActivation) => void;
  onDeleteChipActivation?: (activationId: string) => void;
  warehouses?: any[];
  users?: any[];
}
export function VentasView({
  sales,
  config,
  setSelectedOrderId,
  setActiveTab,
  onCancelSale,
  onPartialRefundSale,
  currentUser,
  chipActivations = [],
  onUpdateChipActivation,
  onDeleteChipActivation
}: VentasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const [waConnected, setWaConnected] = useState<boolean>(() => {
    return (window as any).whatsappConnected || false;
  });

  useEffect(() => {
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

  const isWaIntegratedOffline = !waConnected;
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancellationMode, setIsCancellationMode] = useState(false);
  const [refundQuantities, setRefundQuantities] = useState<number[]>([]);
  const [refundSuccessModal, setRefundSuccessModal] = useState<{
    ticketNumber: string;
    paymentMethod: string;
    refundAmount: number;
    refundCash: number;
    refundCard: number;
    isPartial: boolean;
  } | null>(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [saleToReprint, setSaleToReprint] = useState<Sale | null>(null);
  const [previewSaleForModal, setPreviewSaleForModal] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [subTab, setSubTab] = useState<'ventas' | 'recargas' | 'activaciones'>('ventas');

  const [selectedActivation, setSelectedActivation] = useState<ChipActivation | null>(null);
  const [showActivationDetailModal, setShowActivationDetailModal] = useState(false);
  const [showActivationEditModal, setShowActivationEditModal] = useState(false);
  const [showActivationDeleteConfirm, setShowActivationDeleteConfirm] = useState(false);

  // Edit form states
  const [editCarrier, setEditCarrier] = useState('');
  const [editChipNumber, setEditChipNumber] = useState('');
  const [editIccid, setEditIccid] = useState('');
  const [editImei, setEditImei] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editPrice, setEditPrice] = useState(0);

  const startEditActivation = (act: ChipActivation) => {
    setSelectedActivation(act);
    setEditCarrier(act.carrier);
    setEditChipNumber(act.chipNumber);
    setEditIccid(act.iccid || '');
    setEditImei(act.imei || '');
    setEditClientName(act.clientName);
    setEditClientPhone(act.clientPhone || '');
    setEditPrice(act.price || 0);
    setShowActivationEditModal(true);
  };

  const filteredActivations = chipActivations.filter(act => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = !query ||
                          act.clientName.toLowerCase().includes(query) ||
                          act.chipNumber.includes(query) ||
                          (act.iccid || '').includes(query) ||
                          (act.imei || '').includes(query) ||
                          act.carrier.toLowerCase().includes(query) ||
                          (act.saleId || '').toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;

    const actDate = new Date(act.date);
    const now = new Date();

    if (dateFilter === 'today') {
      return actDate.getFullYear() === now.getFullYear() &&
             actDate.getMonth() === now.getMonth() &&
             actDate.getDate() === now.getDate();
    }

    if (dateFilter === 'week') {
      const diffTime = now.getTime() - actDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }

    if (dateFilter === 'month') {
      return actDate.getFullYear() === now.getFullYear() &&
             actDate.getMonth() === now.getMonth();
    }

    if (dateFilter === 'year') {
      return actDate.getFullYear() === now.getFullYear();
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportActivationsToExcel = () => {
    if (filteredActivations.length === 0) {
      showToast('⚠️ No hay activaciones de chips registradas para exportar');
      return;
    }
    const dataToExport = filteredActivations.map(act => ({
      'Fecha / Hora': new Date(act.date).toLocaleString('es-MX'),
      'Compañía': act.carrier,
      'Número de Chip': act.chipNumber,
      'ICCID (Nº SIM)': act.iccid || 'N/A',
      'IMEI Equipo': act.imei || 'N/A',
      'Cliente': act.clientName,
      'Precio Venta': act.price || 0,
      'Folio Venta': act.saleId || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activaciones');
    XLSX.writeFile(wb, `Activaciones_Chips_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('✅ Activaciones de chips exportadas a Excel correctamente', 'ok');
  };

  const handleConfirmReprint = async () => {
    if (!saleToReprint) {
      setShowPrintConfirm(false);
      return;
    }

    // Evento de cola de impresión interna
    try {
      const printEvent = new CustomEvent('automated-print', {
        detail: {
          type: 'ticket',
          id: saleToReprint.id,
          name: `Reimpresión Boleta de Venta ID ${saleToReprint.id}`,
          details: `Total: ${config.currencySymbol}${saleToReprint.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Cobro: ${saleToReprint.paymentMethod}`,
          brand: config.printerInterface || 'TERMICA DEFAULT',
          port: config.printerInterface || 'USB'
        }
      });
      window.dispatchEvent(printEvent);
    } catch (e) {
      console.error("No se pudo disparar evento de cola de impresión", e);
    }

    const eAPI = (window as any).electronAPI;

    if (eAPI?.silentPrintHtml) {
      const sale = saleToReprint;
      const saleMapped = {
        ...sale,
        items: sale.items.map(i => ({ itemId: (i as any).itemId || (i as any).id, name: i.name, description: i.description || i.name, quantity: i.quantity, price: i.price })),
      };
      const isRec = isRechargeSale(saleMapped as any);
      const ticketHtml = isRec ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
      let effectivePosWidth = config.posPaperWidth || config.ticketPaperWidth || '80mm';
      if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
        effectivePosWidth = '80mm';
      }
      const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : 72000;
      const paperHeightMicrons = undefined;

      setShowPrintConfirm(false);
      setSaleToReprint(null);

      try {
        const deviceName = config.hybridPrintMode
          ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
          : (config.ticketPrinterBrand || '');
        window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html: ticketHtml, deviceName, paperWidthMicrons, paperHeightMicrons, isLabel: false } }));
      } catch (err) {
        console.error('reimpresión falló:', err);
        // Fallback: navegar a PrintView si silentPrintHtml falla
        if (setSelectedOrderId && setActiveTab) {
          setSelectedOrderId(sale.id);
          setActiveTab('Imprimir');
        }
      }
    } else {
      // Sin Electron (entorno web) → navegar a PrintView como antes
      setShowPrintConfirm(false);
      setSaleToReprint(null);
      if (setSelectedOrderId && setActiveTab) {
        setSelectedOrderId(saleToReprint.id);
        setActiveTab('Imprimir');
      }
    }
  };

  const closeModal = () => {
    setSelectedSale(null);
    setShowCancelConfirm(false);
    setShowPrintConfirm(false);
    setSaleToReprint(null);
    setIsCancellationMode(false);
    setRefundQuantities([]);
  };

  const filteredSales = sales.filter(s => {
    const isRec = isRechargeSale(s);
    if (subTab === 'ventas' && isRec) return false;
    if (subTab === 'recargas' && !isRec) return false;

    // Search Term Filter
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = !query ||
                          s.id.toLowerCase().includes(query) ||
                          (s.ticketNumber || '').toLowerCase().includes(query) ||
                          (s.clientName || '').toLowerCase().includes(query) ||
                          s.paymentMethod.toLowerCase().includes(query) ||
                          (s.items || []).some(i => (i.name || '').toLowerCase().includes(query));
    if (!matchesSearch) return false;

    // Date Range Filter
    if (dateFilter === 'all') return true;

    const saleDate = new Date(s.createdAt);
    const now = new Date();

    if (dateFilter === 'today') {
      return saleDate.getFullYear() === now.getFullYear() &&
             saleDate.getMonth() === now.getMonth() &&
             saleDate.getDate() === now.getDate();
    }

    if (dateFilter === 'week') {
      // Within last 7 days
      const diffTime = now.getTime() - saleDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }

    if (dateFilter === 'month') {
      return saleDate.getFullYear() === now.getFullYear() &&
             saleDate.getMonth() === now.getMonth();
    }

    if (dateFilter === 'year') {
      return saleDate.getFullYear() === now.getFullYear();
    }

  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const accumulatedSalesTotal = filteredSales
    .filter(s => !s.isCancelled)
    .reduce((sum, s) => sum + s.total, 0);

  // Keep modal fully reactive by getting the up-to-date state of the selected sale
  const currentSaleState = selectedSale ? (sales.find(s => s.id === selectedSale.id) || selectedSale) : null;

  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const isFluent = config.theme === 'fluent';

  const totalSalesCount = filteredSales.filter(s => !s.isCancelled).length;
  const cancelledSalesCount = filteredSales.filter(s => s.isCancelled).length;

  const totalCashCollected = filteredSales
    .filter(s => !s.isCancelled)
    .reduce((sum, s) => {
      if (s.paymentMethod === 'Efectivo') {
        return sum + s.total;
      }
      if (s.paymentMethod === 'Múltiple' || s.paymentMethod === 'Mixto') {
        return sum + (s.cashReceived || 0);
      }
      return sum;
    }, 0);

  const totalDigitalCollected = filteredSales
    .filter(s => !s.isCancelled)
    .reduce((sum, s) => {
      if (s.paymentMethod === 'Efectivo') {
        return sum;
      }
      if (s.paymentMethod === 'Múltiple' || s.paymentMethod === 'Mixto') {
        if (s.cardReceived !== undefined) return sum + s.cardReceived;
        return sum + (s.total - (s.cashReceived || 0));
      }
      return sum + s.total;
    }, 0);

  return (
    <div className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-6 select-none ${
      isRetro ? 'bg-[#cbd6e2] text-zinc-900' : isLight ? 'bg-[#eaeef3] text-zinc-800' : 'bg-[#0c0c0e] text-gray-200'
    }`}>
      {/* Sub-pestañas secundarias de consulta */}
      <div className={`flex select-none shrink-0 ${
        isRetro 
          ? 'border-b-2 border-zinc-400 pb-0 gap-1 mb-4' 
          : 'p-1 rounded-xl flex gap-1.5 w-fit mb-4 ' + (isLight ? 'bg-zinc-200/60' : 'bg-[#121316]/80 border border-[#1b1c21]')
      }`}>
        <button
          type="button"
          onClick={() => setSubTab('ventas')}
          className={`transition-all duration-200 cursor-pointer select-none ${
            isRetro
              ? `px-4 py-1.5 text-xs font-mono font-bold uppercase ${
                  subTab === 'ventas'
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-transparent border-r-zinc-700 text-zinc-900 -mb-[2px] z-10 pb-2'
                    : 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-700 text-zinc-600 hover:bg-[#d0d0d0]'
                }`
              : `px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 ${
                  subTab === 'ventas'
                    ? (isLight 
                        ? 'bg-white text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                    : (isLight
                        ? 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]')
                }`
          }`}
        >
          🛒 Historial de Ventas y Caja
        </button>
        <button
          type="button"
          onClick={() => setSubTab('recargas')}
          className={`transition-all duration-200 cursor-pointer select-none ${
            isRetro
              ? `px-4 py-1.5 text-xs font-mono font-bold uppercase ${
                  subTab === 'recargas'
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-transparent border-r-zinc-700 text-zinc-900 -mb-[2px] z-10 pb-2'
                    : 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-700 text-zinc-600 hover:bg-[#d0d0d0]'
                }`
              : `px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 ${
                  subTab === 'recargas'
                    ? (isLight 
                        ? 'bg-white text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
                    : (isLight
                        ? 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]')
                }`
          }`}
        >
          ⚡ Recargas y Servicios
        </button>
        <button
          type="button"
          onClick={() => setSubTab('activaciones')}
          className={`transition-all duration-200 cursor-pointer select-none ${
            isRetro
              ? `px-4 py-1.5 text-xs font-mono font-bold uppercase ${
                  subTab === 'activaciones'
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-transparent border-r-zinc-700 text-zinc-900 -mb-[2px] z-10 pb-2'
                    : 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-700 text-zinc-650 hover:bg-[#d0d0d0]'
                }`
              : `px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 ${
                  subTab === 'activaciones'
                    ? (isLight 
                        ? 'bg-white text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                    : (isLight
                        ? 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]')
                }`
          }`}
        >
          📱 Historial de Chips SIM
        </button>
      </div>

      {subTab !== 'activaciones' ? (
        <div className={`flex justify-between items-center border-b pb-4 gap-3 flex-wrap ${isLight ? 'border-zinc-300' : 'border-[#1c1d22]'}`}>
          <h3 className={`text-sm font-display font-black tracking-wider flex items-center gap-2 ${isRetro ? 'text-[#113a7c]' : isLight ? 'text-zinc-900' : subTab === 'recargas' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {subTab === 'recargas' ? <Sparkles className="w-5 h-5 animate-pulse text-amber-500" /> : <DollarSign className="w-5 h-5 animate-pulse" />} {subTab === 'recargas' ? 'HISTORIAL DE RECARGAS Y PAGOS DE SERVICIOS' : 'HISTORIAL DE VENTAS Y CAJA DIARIA'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`text-xs px-3 py-1 font-mono rounded font-bold border ${
              isRetro ? 'bg-[#ffffff] border-[#808080] text-[#000080]' :
              isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' :
              'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
            }`}>
              {subTab === 'recargas' ? 'MONTO RECARGAS: ' : 'VENTAS TOTALES: '}{config.currencySymbol}{accumulatedSalesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <button
              type="button"
              onClick={() => {
                if (filteredSales.length === 0) { showToast('⚠️ No hay ventas registradas para imprimir'); return; }
                const sym = config.currencySymbol || '$';
                const thead = `<thead><tr><th>ID</th><th>Fecha</th><th>Artículos</th><th>Pago</th><th>Estado</th><th style="text-align:right">Total</th></tr></thead>`;
                const tbody = `<tbody>${filteredSales.map(s => `<tr>
                  <td style="font-family:monospace">${s.id}</td>
                  <td>${new Date(s.createdAt).toLocaleString('es-MX')}</td>
                  <td>${s.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                  <td>${s.paymentMethod}</td>
                  <td>${s.isCancelled ? 'Cancelada' : 'Completada'}</td>
                  <td>${sym}${s.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`).join('')}</tbody>`;
                const cancelled = filteredSales.filter(s => s.isCancelled).length;
                const summary = `
                  <div class="summary-item"><label>Ventas totales</label><span>${sym}${accumulatedSalesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="summary-item"><label>Num. transacciones</label><span>${filteredSales.length}</span></div>
                  <div class="summary-item"><label>Canceladas</label><span>${cancelled}</span></div>
                `;
                const reportTitle = subTab === 'recargas' ? 'Historial de Recargas y Servicios' : 'Historial de Ventas';
                const html = buildA4ReportHtml(reportTitle, `Período: ${dateFilter === 'all' ? 'Todo el historial' : dateFilter}  ·  Filtro: "${searchTerm || 'ninguno'}"`, config.storeName || 'TALLER', thead + tbody, summary);
                printA4Report(html, config.reportPrinterName);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
                : isLight ? 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg'
              }`}
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex justify-between items-center border-b pb-4 gap-3 flex-wrap ${isLight ? 'border-zinc-300' : 'border-[#1c1d22]'}`}>
          <h3 className={`text-sm font-display font-black tracking-wider flex items-center gap-2 ${isRetro ? 'text-[#113a7c]' : isLight ? 'text-zinc-900' : 'text-emerald-450'}`}>
            <Smartphone className="w-5 h-5 animate-pulse" /> HISTORIAL DE ACTIVACIONES DE CHIPS
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`text-xs px-3 py-1 font-mono rounded font-bold border ${
              isRetro ? 'bg-[#ffffff] border-[#808080] text-[#000080]' :
              isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' :
              'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
            }`}>
              CHIPS ACTIVADOS: {filteredActivations.length}
            </div>
            <button
              type="button"
              onClick={exportActivationsToExcel}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
                : isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'
                : 'bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-400 rounded-lg'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" /> Exportar a Excel
            </button>
          </div>
        </div>
      )}

      {subTab !== 'activaciones' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none shrink-0 animate-fadeIn">
          {/* Total Ventas */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-zinc-200 shadow-sm' : 'bg-[#121316]/50 border border-white/[0.06] backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-zinc-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <Ticket className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {subTab === 'recargas' ? 'Recargas Activas' : 'Ventas Activas'}
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-blue-900' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                {totalSalesCount} <span className="text-[10px] font-normal font-sans text-zinc-500">reg.</span>
              </span>
            </div>
          </div>

          {/* Ventas Canceladas */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-zinc-200 shadow-sm' : 'bg-[#121316]/50 border border-white/[0.06] backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-zinc-200 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" /> {subTab === 'recargas' ? 'Recargas Canceladas' : 'Canceladas'}
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-red-950' : 'text-red-500'}`}>
                {cancelledSalesCount} <span className="text-[10px] font-normal font-sans text-zinc-500">transac.</span>
              </span>
            </div>
          </div>

          {/* Total Efectivo */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-emerald-500/10 shadow-sm' : 'bg-[#121316]/50 border border-emerald-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-emerald-205 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {subTab === 'recargas' ? 'Efectivo Recargas' : 'Total Efectivo'}
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-950' : 'text-emerald-450'}`}>
                {config.currencySymbol}{totalCashCollected.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Total Tarjeta/Digital */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isFluent
                ? (isLight ? 'bg-white/80 border border-purple-500/10 shadow-sm' : 'bg-[#121316]/50 border border-purple-500/20 backdrop-blur-xl')
                : isLight
                  ? 'bg-white border border-purple-205 shadow-sm'
                  : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Tarjeta/Transfer
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-purple-950' : 'text-purple-400'}`}>
                {config.currencySymbol}{totalDigitalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none shrink-0 animate-fadeIn">
          {/* Total Activados */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isLight
                ? 'bg-white border border-zinc-200 shadow-sm'
                : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                ⚡ Total Activados
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-blue-900' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                {filteredActivations.length} <span className="text-[10px] font-normal font-sans text-zinc-500">chips</span>
              </span>
            </div>
          </div>

          {/* Activados Hoy */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isLight
                ? 'bg-white border border-zinc-200 shadow-sm'
                : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                📅 Activados Hoy
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-950' : 'text-emerald-450'}`}>
                {filteredActivations.filter(act => {
                  const actDate = new Date(act.date);
                  const now = new Date();
                  return actDate.getFullYear() === now.getFullYear() &&
                         actDate.getMonth() === now.getMonth() &&
                         actDate.getDate() === now.getDate();
                }).length} <span className="text-[10px] font-normal font-sans text-zinc-500">reg.</span>
              </span>
            </div>
          </div>

          {/* Telcel & Movistar Count */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isLight
                ? 'bg-white border border-zinc-200 shadow-sm'
                : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                📱 Telcel / Movistar
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                {filteredActivations.filter(act => act.carrier.toUpperCase().includes('TELCEL')).length} <span className="text-[9px] font-normal font-sans text-zinc-500">T</span> / {filteredActivations.filter(act => act.carrier.toUpperCase().includes('MOVISTAR')).length} <span className="text-[9px] font-normal font-sans text-zinc-500">M</span>
              </span>
            </div>
          </div>

          {/* AT&T & Bait Count */}
          <div className={`py-2 px-3 rounded-lg flex items-center justify-between ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
              : isLight
                ? 'bg-white border border-zinc-200 shadow-sm'
                : 'bg-[#121316] border border-[#1b1c21] shadow-lg'
          }`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-700 font-mono' : 'text-zinc-400'} flex items-center gap-1`}>
                📡 AT&T / Bait
              </span>
              <span className={`text-sm md:text-base font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                {filteredActivations.filter(act => act.carrier.toUpperCase().includes('AT&T') || act.carrier.toUpperCase().includes('ATT') || act.carrier.toUpperCase().includes('UNEFON')).length} <span className="text-[9px] font-normal font-sans text-zinc-500">A</span> / {filteredActivations.filter(act => act.carrier.toUpperCase().includes('BAIT') || act.carrier.toUpperCase().includes('ALTAN')).length} <span className="text-[9px] font-normal font-sans text-zinc-500">B</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 rounded space-y-4 border ${
        isRetro ? 'bg-[#eaeef3] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]' :
        isLight ? 'bg-white border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.02)]' :
        'bg-[#121316] border-[#1b1c21]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Barra de búsqueda */}
          <div className="premium-search-container max-w-xs w-full select-none flex items-center">
            <div className="flex items-center text-zinc-400 shrink-0">
              <Search className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
            <div className="relative flex-1 flex items-center h-full">
              <input
                autoFocus
                type="text"
                placeholder={subTab === 'ventas' ? "Buscar ID de Venta, cliente o producto..." : subTab === 'recargas' ? "Buscar ID, número, compañía, folio..." : "Buscar por número, ICCID, IMEI o cliente..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="premium-search-input"
              />
            </div>
          </div>

          {/* Filtros de Rango de Fecha */}
          <div className={`flex items-center gap-1.5 p-1.5 rounded-lg border self-start md:self-auto overflow-x-auto max-w-full ${
            isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#08080a] border-[#2d2f36]'
          }`}>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2 font-mono hidden sm:inline flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Fecha:
            </span>
            {(['all', 'today', 'week', 'month', 'year'] as const).map((filter) => {
              const label = {
                all: 'Todos',
                today: 'Hoy',
                week: 'Semana',
                month: 'Mes',
                year: 'Año'
              }[filter];

              const isActive = dateFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? (isLight ? 'bg-zinc-200 text-zinc-900 border border-zinc-300 font-extrabold' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30')
                      : (isLight ? 'text-zinc-500 hover:text-zinc-900 border border-transparent hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white border border-transparent hover:bg-zinc-900')
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {subTab !== 'activaciones' ? (
          <div className={`hidden lg:block overflow-x-auto rounded border ${isLight ? 'border-zinc-200 bg-white' : 'border-zinc-900'}`}>
            <table className={`w-full text-left text-xs ${isLight ? 'bg-white' : 'bg-[#0b0c0e]'}`}>
              <thead className={`text-[10px] font-mono uppercase ${
                isLight ? 'bg-zinc-50 text-zinc-500 border-b border-zinc-200' : 'bg-[#101114] text-zinc-400'
              }`}>
                <tr>
                  <th className="p-3 pl-4">ID Transac.</th>
                  <th className="p-3">{subTab === 'recargas' ? 'Compañía / Servicio / Teléfono' : 'Socio de Venta / Items'}</th>
                  <th className="p-3 text-center">Fecha de Registro</th>
                  <th className="p-3 text-center">Método de Cobro</th>
                  <th className="p-3 text-right">Monto Neto</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-700/50'}`}>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-8 text-center font-mono text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {subTab === 'recargas' ? 'No hay recargas ni pagos de servicios registrados' : 'No hay ingresos de POS registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} title="Clic para consultar detalles de esta transacción" className={`${
                      sale.isCancelled ? 'opacity-55' : (isLight ? 'hover:bg-zinc-50' : 'hover:bg-[#121316]/50')
                    } transition-all cursor-pointer`}>
                      <td className="p-3 pl-4 font-mono font-bold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border ${
                          isLight 
                            ? (sale.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through' : 'bg-amber-105 text-amber-800 border-amber-200')
                            : (sale.isCancelled ? 'bg-black/40 text-zinc-500 border-zinc-650 line-through' : 'bg-black/40 text-amber-500 border-zinc-700')
                        }`}>
                          🎟️ {sale.id}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {sale.items.map((i, k) => (
                            <div key={k} className={`text-xs font-bold flex items-center gap-1.5 ${
                              sale.isCancelled ? 'text-zinc-550 line-through' : (isLight ? 'text-zinc-800' : 'text-zinc-200')
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="font-mono font-black shrink-0">{i.quantity}x</span>
                              <span className="opacity-95 text-xs truncate max-w-xs">{i.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-zinc-450">
                        {new Date(sale.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="p-3 text-center">
                        {sale.isCancelled ? (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 font-bold border border-red-500/25 rounded text-[9px] uppercase">
                            ⚠️ Cancelada
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border ${
                            isRetro
                              ? 'bg-[#cbd6e2] border-[#858585] text-[#000080]'
                              : sale.paymentMethod === 'Efectivo' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' 
                                : sale.paymentMethod === 'Tarjeta' 
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/25' 
                                  : 'bg-purple-500/10 text-purple-500 border-purple-500/25'
                          }`} style={
                            isLight && !isRetro
                              ? { 
                                  color: sale.paymentMethod === 'Efectivo' ? '#15803d' : sale.paymentMethod === 'Tarjeta' ? '#1d4ed8' : '#7e22ce',
                                  backgroundColor: sale.paymentMethod === 'Efectivo' ? '#dcfce7' : sale.paymentMethod === 'Tarjeta' ? '#dbeafe' : '#f3e8ff'
                                }
                              : undefined
                          }>
                            {sale.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className={`p-3 text-right font-mono text-[13px] font-black ${
                        sale.isCancelled ? 'line-through text-red-500/50' : (isLight ? 'text-emerald-800' : 'text-emerald-450')
                      }`} style={isRetro && !sale.isCancelled ? { color: '#15803d' } : undefined}>
                        {config.currencySymbol}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          {setSelectedOrderId && setActiveTab && (
                            <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewSaleForModal(sale);
                              }}
                              className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider border rounded-md inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md active:scale-95 ${
                                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-zinc-900' :
                                isLight ? 'bg-sky-50 hover:bg-sky-100 text-sky-850 border-sky-200' :
                                'bg-sky-500/10 hover:bg-sky-500 hover:text-black text-sky-300 border-sky-500/35'
                              }`}
                              title="Ver ticket digital de la boleta de venta"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ticket Digital
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSaleToReprint(sale);
                                setShowPrintConfirm(true);
                              }}
                              className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider border rounded-md inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md active:scale-95 ${
                                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-[#000080]' :
                                isLight ? 'bg-amber-100 hover:bg-amber-250 text-amber-800 border-amber-300' :
                                'bg-amber-500/10 hover:bg-amber-50 hover:text-black text-amber-300 border-amber-500/35'
                              }`}
                              title="Re-imprimir o ver ticket thermal"
                            >
                              <Printer className="w-3.5 h-3.5" /> Reimprimir
                            </button>
                            {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isWaIntegratedOffline) {
                                    window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                                  } else {
                                    const saleMapped = {
                                      ...sale,
                                      items: (sale.items || []).map((i: any) => ({
                                        itemId: i.itemId || i.id,
                                        name: i.name || i.description || '',
                                        description: i.description || i.name || '',
                                        quantity: i.quantity,
                                        price: i.price
                                      })),
                                    };
                                    const isRec = isRechargeSale(saleMapped as any);
                                    const msg = buildWhatsappSaleTicketMessage(saleMapped as any, config);
                                    const html = isRec ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
                                    let targetPhone = '';
                                    if (isRec) {
                                      const allText = (sale.items || []).map((i: any) => i.name || i.description || '').join(' ') + ' ' + (sale.notes || '');
                                      const phoneMatch = allText.match(/\b\d{10}\b/) || allText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                                      if (phoneMatch) targetPhone = phoneMatch[0].replace(/\D/g, '');
                                    }
                                    sendWhatsappNotification(config, targetPhone, msg, html, undefined, sale.change);
                                  }
                                }}
                                style={isWaIntegratedOffline ? { backgroundColor: '#71717a', borderColor: '#52525b' } : undefined}
                                className={`whatsapp-green-btn px-3 py-1 text-[11px] font-black uppercase tracking-wider border rounded-md inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md active:scale-95 text-white ${
                                  isWaIntegratedOffline 
                                    ? 'wa-offline bg-zinc-500 hover:bg-zinc-550 border-zinc-600 grayscale' 
                                    : 'bg-[#25D366] hover:bg-[#20ba5a] border-[#20ba5a]'
                                }`}
                                title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : "Enviar ticket de venta por WhatsApp"}
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </button>
                            )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`hidden lg:block overflow-x-auto rounded border ${isLight ? 'border-zinc-200 bg-white' : 'border-zinc-900'}`}>
            <table className={`w-full text-left text-xs ${isLight ? 'bg-white' : 'bg-[#0b0c0e]'}`}>
              <thead className={`text-[10px] font-mono uppercase ${
                isLight ? 'bg-zinc-50 text-zinc-500 border-b border-zinc-200' : 'bg-[#101114] text-zinc-400'
              }`}>
                <tr>
                  <th className="p-3 pl-4">Fecha / Hora</th>
                  <th className="p-3">Compañía</th>
                  <th className="p-3">Número Telefónico</th>
                  <th className="p-3 font-mono text-center">ICCID (Nº Serie SIM)</th>
                  <th className="p-3 font-mono text-center">IMEI Equipo</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Folio / Precio</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-700/50'}`}>
                {filteredActivations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`p-8 text-center font-mono text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      No hay activaciones de chips SIM registradas
                    </td>
                  </tr>
                ) : (
                  filteredActivations.map((act) => (
                    <tr
                      key={act.id}
                      onClick={() => {
                        setSelectedActivation(act);
                        setShowActivationDetailModal(true);
                      }}
                      className={`cursor-pointer ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-[#121316]/50'} transition-all`}
                    >
                      <td className="p-3 pl-4 font-mono font-bold">
                        {new Date(act.date).toLocaleString('es-MX')}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                          act.carrier.toUpperCase().includes('TELCEL') ? 'bg-blue-105 text-blue-800' :
                          act.carrier.toUpperCase().includes('MOVISTAR') ? 'bg-green-105 text-green-800' :
                          act.carrier.toUpperCase().includes('AT&T') || act.carrier.toUpperCase().includes('ATT') ? 'bg-blue-950 text-blue-200' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>
                          {act.carrier}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-sm text-blue-500">
                        {act.chipNumber}
                      </td>
                      <td className="p-3 font-mono text-center text-zinc-400">
                        {act.iccid || '—'}
                      </td>
                      <td className="p-3 font-mono text-center text-zinc-400">
                        {act.imei || '—'}
                      </td>
                      <td className="p-3 font-bold">
                        {act.clientName}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-mono text-[10px] text-zinc-500">{act.saleId || '—'}</div>
                        <div className="font-mono font-black text-xs">{config.currencySymbol}{act.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditActivation(act);
                            }}
                            className={`px-2 py-1 text-[10px] font-black uppercase border rounded-md inline-flex items-center gap-1 transition-all duration-205 cursor-pointer shadow-sm active:scale-95 ${
                              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-[#000080]' :
                              isLight ? 'bg-blue-50 hover:bg-blue-105 text-blue-800 border-blue-200' :
                              'bg-blue-500/10 hover:bg-blue-500 hover:text-black text-blue-300 border-blue-500/35'
                            }`}
                            title="Editar activación"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedActivation(act);
                              setShowActivationDeleteConfirm(true);
                            }}
                            className={`px-2 py-1 text-[10px] font-black uppercase border rounded-md inline-flex items-center gap-1 transition-all duration-205 cursor-pointer shadow-sm active:scale-95 ${
                              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-red-700' :
                              isLight ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200' :
                              'bg-red-500/10 hover:bg-red-500 hover:text-black text-red-300 border-red-500/35'
                            }`}
                            title="Eliminar activación"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Responsive view cards */}
        {subTab !== 'activaciones' ? (
          <div className="lg:hidden space-y-3.5 mt-4">
            {filteredSales.length === 0 ? (
              <div className={`p-8 text-center text-xs font-mono rounded ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-200 text-zinc-500' : 'bg-[#0f1115] border border-zinc-900 text-gray-400'
              }`}>
                {subTab === 'recargas' ? 'No hay recargas ni pagos de servicios registrados' : 'No hay ingresos de POS registrados'}
              </div>
            ) : (
              filteredSales.map(sale => {
                return (
                  <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`transition-all border ${
                    isRetro 
                      ? 'border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white font-sans text-zinc-900' 
                      : isLight 
                        ? 'border-zinc-200 rounded-xl bg-white shadow-sm text-zinc-950 p-4' 
                        : 'border-[#1b1c21] rounded-xl bg-[#0b0c0e] text-gray-200 p-4'
                  } space-y-3 cursor-pointer ${sale.isCancelled ? 'opacity-65' : ''}`}
                  title="Tocar para consultar detalles de esta venta"
                >
                  <div className="flex justify-between items-center gap-2 border-b border-zinc-500/10 pb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-black border ${
                      isLight 
                        ? (sale.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through' : 'bg-amber-105 text-amber-800 border-amber-200')
                        : (sale.isCancelled ? 'bg-black/40 text-zinc-500 border-zinc-650 line-through' : 'bg-black/40 text-amber-500 border-zinc-700')
                    }`}>
                      🎟️ {sale.id}
                    </span>
                    <span className={`text-[10px] font-mono text-zinc-400 flex items-center gap-1.5`}>
                      {new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {sale.createdBy && <span className="text-sky-400 font-bold">· {sale.createdBy}</span>}
                    </span>
                  </div>
                  <div className="space-y-1.5 py-1">
                    {sale.items.map((i, k) => (
                      <div key={k} className={`text-[11px] font-sans font-bold flex items-center gap-1.5 ${
                        sale.isCancelled ? 'text-zinc-500 line-through' : (isLight ? 'text-zinc-900' : 'text-zinc-205')
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-black font-mono shrink-0">{i.quantity}x</span>
                        <span className="opacity-95 text-xs truncate">{i.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-500/5 font-mono">
                    <span>{new Date(sale.createdAt).toLocaleDateString('es-MX')}</span>
                    {sale.isCancelled ? (
                      <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 font-bold border border-red-500/25 rounded text-[8.5px] uppercase">
                        ⚠️ CANCELADA
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                        isRetro
                          ? 'bg-[#cbd6e2] border-[#858585] text-[#000080]'
                          : sale.paymentMethod === 'Efectivo' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' 
                            : sale.paymentMethod === 'Tarjeta' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/25' 
                              : 'bg-purple-500/10 text-purple-500 border-purple-500/25'
                      }`} style={
                        isLight && !isRetro
                          ? { 
                              color: sale.paymentMethod === 'Efectivo' ? '#15803d' : sale.paymentMethod === 'Tarjeta' ? '#1d4ed8' : '#7e22ce',
                              backgroundColor: sale.paymentMethod === 'Efectivo' ? '#dcfce7' : sale.paymentMethod === 'Tarjeta' ? '#dbeafe' : '#f3e8ff'
                            }
                          : undefined
                      }>
                        {sale.paymentMethod}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-500/10">
                    <div className="font-mono text-[10px]">
                      <span className="text-zinc-500 uppercase block text-[8px]">Monto Cobrado</span>
                      <span className={`font-black text-[13px] ${
                        sale.isCancelled ? 'line-through text-red-500/60' : (isLight ? 'text-emerald-800' : 'text-emerald-400')
                      }`}>
                        {config.currencySymbol}{sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {setSelectedOrderId && setActiveTab && (
                      <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSaleForModal(sale);
                        }}
                        className={`h-7 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900'
                            : isLight
                              ? 'bg-sky-100 hover:bg-sky-200 text-sky-850 border-sky-300'
                              : 'bg-sky-500/10 hover:bg-sky-500 hover:text-black text-sky-350 border-sky-500/35'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" /> Ticket Digital
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaleToReprint(sale);
                          setShowPrintConfirm(true);
                        }}
                        className={`h-7 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080]'
                            : isLight
                              ? 'bg-amber-100 hover:bg-amber-250 text-amber-800 border-amber-300'
                              : 'bg-amber-500/10 hover:bg-amber-50 hover:text-black text-amber-350 border-amber-500/35'
                        }`}
                      >
                        <Printer className="w-3 h-3" /> Ticket
                      </button>
                      {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isWaIntegratedOffline) {
                              window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                            } else {
                              const saleMapped = {
                                ...sale,
                                items: (sale.items || []).map((i: any) => ({
                                  itemId: i.itemId || i.id,
                                  name: i.name || i.description || '',
                                  description: i.description || i.name || '',
                                  quantity: i.quantity,
                                  price: i.price
                                })),
                              };
                              const msg = buildWhatsappSaleTicketMessage(saleMapped as any, config);
                              const isRec = isRechargeSale(saleMapped as any);
                              const html = isRec ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
                              sendWhatsappNotification(config, '', msg, html, undefined, sale.change);
                            }
                          }}
                          style={isWaIntegratedOffline ? { backgroundColor: '#71717a', borderColor: '#52525b' } : undefined}
                          title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                          className={`whatsapp-green-btn h-7 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1 cursor-pointer transition-transform text-white border ${
                            isWaIntegratedOffline 
                              ? 'wa-offline bg-zinc-500 hover:bg-zinc-550 border-zinc-600 grayscale' 
                              : 'bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 border-[#20ba5a]'
                          }`}
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                      )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        ) : (
          <div className="lg:hidden space-y-3.5 mt-4">
            {filteredActivations.length === 0 ? (
              <div className={`p-8 text-center text-xs font-mono rounded ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-200 text-zinc-500' : 'bg-[#0f1115] border border-zinc-900 text-gray-400'
              }`}>
                No hay activaciones de chips SIM registradas
              </div>
            ) : (
              filteredActivations.map(act => (
                <div
                  key={act.id}
                  onClick={() => {
                    setSelectedActivation(act);
                    setShowActivationDetailModal(true);
                  }}
                  className={`border p-4 cursor-pointer ${
                    isRetro ? 'border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white font-sans text-zinc-900' :
                    isLight ? 'border-zinc-200 rounded-xl bg-white shadow-sm text-zinc-955 hover:bg-zinc-50' :
                    'border-[#1b1c21] rounded-xl bg-[#0b0c0e] text-gray-200 hover:bg-[#121316]/50'
                  } space-y-3 transition-all`}
                >
                  <div className="flex justify-between items-center gap-2 border-b border-zinc-500/10 pb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-black border ${
                      act.carrier.toUpperCase().includes('TELCEL') ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      act.carrier.toUpperCase().includes('MOVISTAR') ? 'bg-green-100 text-green-800 border-green-200' :
                      'bg-zinc-100 text-zinc-800 border-zinc-200'
                    }`}>
                      ⚡ {act.carrier}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(act.date).toLocaleString('es-MX')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-black text-blue-500">
                      Nº: {act.chipNumber}
                    </div>
                    {act.iccid && (
                      <div className="text-[10px] text-zinc-450 font-mono">
                        ICCID: {act.iccid}
                      </div>
                    )}
                    {act.imei && (
                      <div className="text-[10px] text-zinc-450 font-mono">
                        IMEI: {act.imei}
                      </div>
                    )}
                    <div className="text-xs">
                      Cliente: <span className="font-bold">{act.clientName}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-500/10 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block text-[8px]">{act.saleId || 'S/Folio'}</span>
                      <span className="font-black text-xs">{config.currencySymbol}{act.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditActivation(act);
                        }}
                        className={`px-2 py-1 text-[9px] font-bold uppercase border rounded-md inline-flex items-center gap-1 transition-all duration-200 cursor-pointer shadow-sm active:scale-95 ${
                          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-[#000080]' :
                          isLight ? 'bg-blue-50 hover:bg-blue-105 text-blue-800 border-blue-200' :
                          'bg-blue-500/10 hover:bg-blue-500 hover:text-black text-blue-300 border-blue-500/35'
                        }`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivation(act);
                          setShowActivationDeleteConfirm(true);
                        }}
                        className={`px-2 py-1 text-[9px] font-bold uppercase border rounded-md inline-flex items-center gap-1 transition-all duration-200 cursor-pointer shadow-sm active:scale-95 ${
                          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] text-red-700' :
                          isLight ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200' :
                          'bg-red-500/10 hover:bg-red-500 hover:text-black text-red-300 border-red-500/35'
                        }`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL DETALLADO DE CONSULTA DE VENTA */}
      {currentSaleState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-lg flex flex-col relative overflow-hidden animate-scale-up ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 font-sans shadow-2xl'
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                : 'bg-[#0c0d11] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
          }`}>
            
            {/* Cabecera del modal */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro
                ? 'bg-[#000080] border-[#808080] text-white p-2'
                : isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  : 'bg-[#111217] border-zinc-800 text-zinc-100'
            }`} ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isRetro 
                    ? 'p-1.5 bg-[#102575] border border-white/20 text-white font-black' 
                    : isLight 
                      ? (isRechargeSale(currentSaleState) ? 'bg-amber-100/70 border border-amber-300 text-amber-700' : 'bg-blue-100/70 border border-blue-300 text-blue-700') 
                      : (isRechargeSale(currentSaleState) ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-blue-500/10 text-blue-400 border border-blue-500/25')
                }`}>
                  {isRechargeSale(currentSaleState) ? <Sparkles className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                </div>
                <div>
                  <h4 className={`text-[11px] font-mono font-black uppercase tracking-widest ${
                    isRetro ? 'text-white' : 'text-zinc-400'
                  }`}>
                    {isRechargeSale(currentSaleState) ? 'CONSULTA DE RECARGA / SERVICIO' : 'CONSULTA DE VENTA'}
                  </h4>
                  <p className={`text-sm font-sans font-black ${
                    isRetro ? 'text-white font-mono' : isLight ? 'text-zinc-900' : 'text-white'
                  }`}>{currentSaleState.id}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className={
                  isRetro
                    ? 'w-6 h-6 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-[#808080] font-bold active:scale-95 flex items-center justify-center cursor-pointer'
                    : isLight 
                      ? 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900 text-zinc-700'
                      : 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-900 border border-zinc-600 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }
                title="Cerrar consulta"
                ref={el => { if (el && isRetro) el.style.setProperty('color','#000000','important'); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Detalles */}
            <div className={`p-6 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-thin ${
              isRetro ? 'bg-[#dfdfdf] text-zinc-900' : isLight ? 'bg-white text-zinc-900' : 'bg-[#0c0d11] text-zinc-100'
            }`}>
              
              {/* Bloque Informativo de Metadatos */}
              <div className={`grid grid-cols-2 gap-4 p-4 border font-sans ${
                isRetro 
                  ? 'bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white text-zinc-900 shadow-inner'
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl shadow-sm'
                    : 'bg-[#14161d] border border-zinc-900 text-zinc-100 rounded-xl'
              }`}>
                <div className="space-y-1">
                  <span className={`text-[9.5px] uppercase font-bold tracking-widest block ${
                    isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-500'
                  }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Fecha y Hora</span>
                  <span className={`text-xs font-mono font-bold ${
                    isRetro ? 'text-black font-black' : isLight ? 'text-zinc-600' : 'text-zinc-100'
                  }`} style={isRetro ? (isLight ? { color: '#000000' } : { color: '#ffffff' }) : undefined}>{new Date(currentSaleState.createdAt).toLocaleString('es-MX')}</span>
                </div>
                <div className="space-y-1">
                  <span className={`text-[9.5px] uppercase font-bold tracking-widest block ${
                    isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-500'
                  }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Método de Cobro</span>
                  <span className={`px-2 py-0.5 font-black uppercase tracking-wider text-[9px] rounded-md inline-block border ${
                    isRetro
                      ? 'bg-[#cbd6e2] border-[#858585] font-extrabold shadow-sm'
                      : currentSaleState.paymentMethod === 'Efectivo' 
                        ? 'bg-emerald-50/10 text-emerald-600 border-emerald-500/20' 
                        : currentSaleState.paymentMethod === 'Tarjeta' 
                          ? 'bg-blue-50/10 text-blue-600 border-blue-500/20' 
                          : 'bg-purple-50/10 text-purple-600 border-purple-500/20'
                  }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>
                    💵 {currentSaleState.paymentMethod}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className={`text-[9.5px] uppercase font-bold tracking-widest block ${
                    isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-500'
                  }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Número de Ticket</span>
                  <span className={`text-xs font-mono font-bold ${
                    isRetro ? 'text-black font-black' : isLight ? 'text-zinc-600' : 'text-zinc-100'
                  }`} style={isRetro ? (isLight ? { color: '#000000' } : { color: '#ffffff' }) : undefined}>{currentSaleState.ticketNumber || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className={`text-[9.5px] uppercase font-bold tracking-widest block ${
                    isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-500'
                  }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Código Cobro</span>
                  <span className={`text-xs font-mono font-bold ${
                    isRetro ? 'text-black font-black' : isLight ? 'text-zinc-600' : 'text-zinc-100'
                  }`} style={isRetro ? (isLight ? { color: '#000000' } : { color: '#ffffff' }) : undefined}>{currentSaleState.confirmationCode || 'No requiere'}</span>
                </div>
              </div>

              {/* Banner de Cancelación */}
              {currentSaleState.isCancelled && (
                <div className={`p-4 text-center text-[10.5px] font-bold font-mono tracking-wide leading-relaxed border ${
                  isRetro
                    ? 'bg-red-50 border-2 border-red-400 text-red-950 font-black shadow-sm'
                    : isLight
                      ? 'bg-red-50 border border-red-200 text-red-650 font-black shadow-sm rounded-xl'
                      : 'border bg-red-950/20 border-red-900/35 text-red-400 shadow-lg rounded-xl'
                }`} style={isRetro ? (isLight ? { color: '#b91c1c' } : { color: '#fca5a5' }) : undefined}>
                  ⚠️ ESTA TRANSACCIÓN HA SIDO CANCELADA. LAS PIEZAS SE REINTEGRARON AUTOMÁTICAMENTE AL STOCK DE INVENTARIO.
                </div>
              )}

              {/* MODO DEVOLUCIÓN SELECTIVA / PARCIAL O DESGLOSE NORMAL */}
              {isCancellationMode ? (
                <div className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-black uppercase block tracking-wider ${isLight ? 'text-red-700' : 'text-red-400'}`}>
                      Seleccionar Artículos a Devolver al Stock
                    </span>
                    <span className={`text-[10.5px] block font-sans leading-tight ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Desmarca los artículos que el cliente conservará. Ajusta la cantidad a reintegrar si aplica.
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[36vh] overflow-y-auto pr-1">
                    {(currentSaleState.items || []).map((item, idx) => {
                      const isSelected = (refundQuantities[idx] || 0) > 0;
                      return (
                        <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-2 ${
                          isRetro
                            ? 'bg-white border-2 border-zinc-500 text-zinc-900'
                            : isLight 
                              ? 'bg-zinc-50 border-zinc-200' 
                              : 'bg-zinc-900 border-zinc-800'
                        }`}>
                          <div className="flex justify-between items-center text-xs">
                            <label className="flex items-center gap-2.5 font-bold cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newQuantities = [...refundQuantities];
                                  newQuantities[idx] = isSelected ? 0 : item.quantity;
                                  setRefundQuantities(newQuantities);
                                }}
                                className="w-4.5 h-4.5 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                              />
                              <span className={isSelected ? 'font-black text-red-600' : 'text-zinc-400 font-medium'}>
                                Devolver al Stock
                              </span>
                            </label>
                            <span className={`font-mono font-black ${isSelected ? 'text-red-600' : 'text-zinc-400 font-medium'}`}>
                              {config.currencySymbol}{(item.price * (refundQuantities[idx] || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pl-7 text-[11px]">
                            <span className={`font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{item.name}</span>
                            <span className="text-zinc-400 font-mono">{item.quantity}x a {config.currencySymbol}{item.price.toFixed(2)} c/u</span>
                          </div>

                          {isSelected && item.quantity > 1 && (
                            <div className="flex items-center justify-end gap-2.5 pl-7 mt-1.5 pt-1.5 border-t border-dashed border-zinc-300 dark:border-zinc-800">
                              <span className="text-[9.5px] font-black uppercase text-zinc-400">Cant. a devolver:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQuantities = [...refundQuantities];
                                    newQuantities[idx] = Math.max(1, (newQuantities[idx] || 1) - 1);
                                    setRefundQuantities(newQuantities);
                                  }}
                                  className={`w-6 h-6 rounded-md border flex items-center justify-center font-black text-xs active:scale-90 transition-transform ${
                                    isLight ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                  }`}
                                >
                                  -
                                </button>
                                <span className="text-xs font-mono font-black w-6 text-center">{refundQuantities[idx]}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQuantities = [...refundQuantities];
                                    newQuantities[idx] = Math.min(item.quantity, (newQuantities[idx] || 0) + 1);
                                    setRefundQuantities(newQuantities);
                                  }}
                                  className={`w-6 h-6 rounded-md border flex items-center justify-center font-black text-xs active:scale-90 transition-transform ${
                                    isLight ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen dinámico de reembolso */}
                  {(() => {
                    const totalRefundAmount = currentSaleState.items.reduce(
                      (sum, it, idx) => sum + it.price * (refundQuantities[idx] || 0),
                      0
                    );
                    const totalItemsReturned = refundQuantities.reduce((sum, q) => sum + q, 0);
                    const isFullCancellation = Math.abs(totalRefundAmount - currentSaleState.total) < 0.01;

                    return (
                      <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                        isLight 
                          ? 'bg-amber-50 border-amber-200 text-zinc-800 shadow-sm'
                          : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      }`}>
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                          <span>Monto Total a Reembolsar:</span>
                          <span className="text-base font-mono font-black text-rose-600">
                            {config.currencySymbol}{totalRefundAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-[10.5px] leading-normal font-medium text-zinc-500">
                          {isFullCancellation ? (
                            <span>⚠️ Se cancelará la venta <strong>por completo</strong> y todos los artículos regresarán al stock.</span>
                          ) : totalRefundAmount > 0 ? (
                            <span>💡 Devolución parcial de <strong>{totalItemsReturned}</strong> artículo(s). El resto de la venta continuará activa.</span>
                          ) : (
                            <span>Selecciona al menos un artículo para procesar la devolución.</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  {/* Listado de Artículos y Desglose */}
                  <div className="space-y-2.5">
                    <span className={`text-[9.5px] uppercase font-black tracking-widest block ${
                      isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700' : 'text-zinc-500'
                    }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>DESGLOSE DE ARTÍCULOS ADQUIRIDOS</span>
                    <div className={`border ${
                      isRetro 
                        ? 'border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white bg-white text-zinc-900 shadow-inner' 
                        : isLight 
                          ? 'border-zinc-200 bg-white text-zinc-900 rounded-xl shadow-sm overflow-hidden' 
                          : 'border-zinc-900 bg-[#101115] text-zinc-100 rounded-xl overflow-hidden'
                    }`}>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase font-mono ${
                            isRetro 
                              ? 'bg-[#cbd6e2] text-[#000080] border-b-2 border-b-[#808080] font-black' 
                              : isLight 
                                ? 'bg-zinc-50 text-zinc-500 border-zinc-200 font-bold' 
                                : 'bg-[#15171d] text-zinc-200 border-zinc-900 font-bold'
                          }`}>
                            <th className="p-3" style={isRetro ? (isLight ? { color: '#031124', backgroundColor: '#cbd6e2' } : { color: '#ffffff', backgroundColor: '#1a1c23' }) : undefined}>Artículo / Servicio</th>
                            <th className="p-3 text-center" style={isRetro ? (isLight ? { color: '#031124', backgroundColor: '#cbd6e2' } : { color: '#ffffff', backgroundColor: '#1a1c23' }) : undefined}>Cant.</th>
                            <th className="p-3 text-right" style={isRetro ? (isLight ? { color: '#031124', backgroundColor: '#cbd6e2' } : { color: '#ffffff', backgroundColor: '#1a1c23' }) : undefined}>Unitario</th>
                            <th className="p-3 text-right" style={isRetro ? (isLight ? { color: '#031124', backgroundColor: '#cbd6e2' } : { color: '#ffffff', backgroundColor: '#1a1c23' }) : undefined}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${
                          isRetro ? 'divide-zinc-200' : isLight ? 'divide-zinc-150' : 'divide-zinc-900'
                        }`}>
                          {currentSaleState.items.map((it, idx) => (
                            <tr key={idx} className={
                              isRetro 
                                ? 'hover:bg-zinc-100/50 transition-colors' 
                                : isLight 
                                  ? 'hover:bg-zinc-50 transition-colors' 
                                  : 'hover:bg-zinc-900/20 transition-colors'
                            }>
                              <td className={`p-3 font-semibold max-w-[200px] break-all whitespace-normal ${
                                currentSaleState.isCancelled 
                                  ? 'text-zinc-400 line-through' 
                                  : isRetro
                                    ? 'text-black font-extrabold'
                                    : isLight 
                                      ? 'text-zinc-600' 
                                      : 'text-zinc-200'
                              }`} style={isRetro && !currentSaleState.isCancelled ? { color: '#000000' } : undefined}>{it.name}</td>
                              <td className={`p-3 text-center font-mono font-bold ${
                                isRetro ? 'text-black font-black' : isLight ? 'text-zinc-500' : 'text-zinc-400'
                              }`} style={isRetro ? (isLight ? { color: '#000000' } : { color: '#ffffff' }) : undefined}>{it.quantity}</td>
                              <td className={`p-3 text-right font-mono ${
                                isRetro ? 'text-black' : isLight ? 'text-zinc-700' : 'text-zinc-300'
                              }`} style={isRetro ? (isLight ? { color: '#000000' } : { color: '#ffffff' }) : undefined}>{config.currencySymbol}{it.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`p-3 text-right font-mono font-bold ${
                                currentSaleState.isCancelled 
                                  ? 'text-red-500/40' 
                                  : isRetro 
                                    ? 'text-[#000080] font-black' 
                                    : isLight 
                                      ? 'text-emerald-700 font-extrabold' 
                                      : 'text-emerald-400'
                              }`} style={isRetro && !currentSaleState.isCancelled ? { color: '#000080' } : undefined}>{config.currencySymbol}{(it.price * it.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Caja de Totales */}
                  <div className={`border p-5 space-y-3 ${
                    isRetro 
                      ? 'bg-[#cbd6e2] border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white text-zinc-900 shadow-inner' 
                      : isLight 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-2xl shadow-sm' 
                        : 'bg-[#14161f] border border-zinc-700 text-zinc-100 rounded-2xl'
                  }`}>
                    {config.showTaxRate && (
                      <>
                        <div className="flex justify-between text-xs font-sans">
                          <span className={`font-semibold ${isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-300'}`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Subtotal (sin imp.):</span>
                          <span className={`font-mono font-bold ${
                            currentSaleState.isCancelled 
                              ? 'line-through text-zinc-400 animate-pulse' 
                              : isRetro 
                                ? 'text-black font-black' 
                                : isLight 
                                  ? 'text-zinc-900' 
                                  : 'text-zinc-100'
                          }`} style={isRetro && !currentSaleState.isCancelled ? { color: '#000000' } : undefined}>
                            {config.currencySymbol}{(currentSaleState.total / (1 + config.taxRate)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-sans">
                          <span className={`font-semibold ${isRetro ? 'text-[#000080] font-black' : isLight ? 'text-zinc-700 font-bold' : 'text-zinc-300'}`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>IVA Incluido ({(config.taxRate * 100).toFixed(0)}%):</span>
                          <span className={`font-mono font-bold ${
                            currentSaleState.isCancelled 
                              ? 'line-through text-zinc-400' 
                              : isRetro 
                                ? 'text-black font-black' 
                                : isLight 
                                  ? 'text-zinc-900' 
                                  : 'text-zinc-100'
                          }`} style={isRetro && !currentSaleState.isCancelled ? { color: '#000000' } : undefined}>
                            {config.currencySymbol}{(currentSaleState.total - (currentSaleState.total / (1 + config.taxRate))).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`border-t border-dashed my-2.5 ${
                          isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                        }`}></div>
                      </>
                    )}
                    <div className="flex justify-between items-center font-sans">
                      <span className={`text-[10px] uppercase font-black tracking-widest ${
                        isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-500' : 'text-zinc-400'
                      }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>Monto Neto Total</span>
                      <span className={`text-xl font-black font-mono tracking-tight ${
                        currentSaleState.isCancelled 
                          ? 'line-through text-red-500/60' 
                          : isRetro 
                            ? 'text-[#000080] font-black underline decoration-2' 
                            : isLight 
                              ? 'text-emerald-700 font-black' 
                              : 'text-emerald-400'
                      }`} style={isRetro && !currentSaleState.isCancelled ? { color: '#000080', textDecoration: 'underline', textDecorationThickness: '2px' } : undefined}>
                        {config.currencySymbol}{currentSaleState.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Notas de Venta */}
                  {currentSaleState.notes && (
                    <div className="space-y-2">
                      <span className={`text-[9.5px] uppercase font-black tracking-widest block ${
                        isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-700' : 'text-zinc-500'
                      }`} style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}>NOTAS / OBSERVACIONES</span>
                      <div className={`p-4 border font-sans text-xs ${
                        isRetro 
                          ? 'bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white text-zinc-900 shadow-inner'
                          : isLight 
                            ? 'bg-amber-50/40 border-amber-100 text-zinc-800 rounded-xl shadow-sm'
                            : 'bg-[#1a1715] border border-amber-900/35 text-amber-100/90 rounded-xl'
                      }`}>
                        <p className="whitespace-pre-wrap">{currentSaleState.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Acciones del pie del modal */}
            <div className={`p-4 border-t flex justify-end gap-2.5 shrink-0 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#111217] border-zinc-800/85'
            }`}>
              {isCancellationMode ? (
                (() => {
                  const totalRefundAmount = currentSaleState.items.reduce(
                    (sum, it, idx) => sum + it.price * (refundQuantities[idx] || 0),
                    0
                  );
                  const isFullCancellation = Math.abs(totalRefundAmount - currentSaleState.total) < 0.01;

                  return (
                    <div className="w-full flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancellationMode(false);
                          setRefundQuantities([]);
                        }}
                        className={
                          isRetro
                            ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                            : isLight
                              ? 'px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer select-none active:scale-95'
                              : 'px-4 py-2 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer select-none bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 active:scale-95'
                        }
                      >
                        Regresar
                      </button>
                      <button
                        type="button"
                        disabled={totalRefundAmount === 0}
                        onClick={() => {
                          if (isFullCancellation) {
                            if (onCancelSale) {
                              onCancelSale(currentSaleState.id);
                            }
                          } else {
                            const refunds = currentSaleState.items
                              .map((it, idx) => ({ itemIndex: idx, quantity: refundQuantities[idx] || 0 }))
                              .filter(r => r.quantity > 0);
                            if (onPartialRefundSale) {
                              onPartialRefundSale(currentSaleState.id, refunds);
                            }
                          }

                          const paymentMethod = currentSaleState.paymentMethod || 'Efectivo';
                          let refundCash = 0;
                          let refundCard = 0;
                          if (paymentMethod.toLowerCase().includes('tarjeta') || paymentMethod.toLowerCase().includes('digital')) {
                            refundCard = totalRefundAmount;
                          } else if (paymentMethod.toLowerCase().includes('mixto') || paymentMethod.toLowerCase().includes('múltiple')) {
                            refundCash = Math.min(totalRefundAmount, currentSaleState.cashReceived || 0);
                            refundCard = Math.max(0, totalRefundAmount - refundCash);
                          } else {
                            refundCash = totalRefundAmount;
                          }

                          setRefundSuccessModal({
                            ticketNumber: currentSaleState.ticketNumber || currentSaleState.id,
                            paymentMethod: currentSaleState.paymentMethod,
                            refundAmount: totalRefundAmount,
                            refundCash,
                            refundCard,
                            isPartial: !isFullCancellation
                          });

                          closeModal();
                        }}
                        className={`px-4 py-2 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer select-none active:scale-95 shadow-md flex items-center gap-1.5 ${
                          totalRefundAmount === 0
                            ? 'opacity-40 cursor-not-allowed bg-zinc-600'
                            : 'bg-red-600 hover:bg-red-500'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isFullCancellation ? 'Confirmar Cancelación Total' : 'Confirmar Devolución'} ({config.currencySymbol}{totalRefundAmount.toFixed(2)})
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full flex items-center justify-between gap-3">
                  {/* Lado Izquierdo: Acción de Devolución o Distintivo de Recarga */}
                  <div>
                    {!isRechargeSale(currentSaleState) && (onCancelSale || onPartialRefundSale) && !currentSaleState.isCancelled && (!currentUser || currentUser.permissions.canCancelSales) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancellationMode(true);
                          setRefundQuantities(currentSaleState.items.map(it => it.quantity));
                        }}
                        className={
                          isRetro
                            ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-red-900 border-r-red-900 bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1.5 cursor-pointer select-none active:scale-95'
                            : isLight
                              ? 'px-4 py-2 text-xs font-semibold uppercase border rounded-xl bg-red-50 hover:bg-red-100 border-red-200 text-red-650 transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-sm'
                              : 'px-4 py-2 text-xs font-black uppercase border rounded-xl bg-red-950/20 hover:bg-red-800/20 border-red-900/30 text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95'
                        }
                        title="Devolver artículos al stock o cancelar venta"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Devolución / Cancelar
                      </button>
                    )}

                    {isRechargeSale(currentSaleState) && (
                      <span className="text-[10.5px] font-mono font-bold text-amber-500/90 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Transacción de recarga / servicios
                      </span>
                    )}
                  </div>

                  {/* Lado Derecho: Acciones de Impresión y Envío WhatsApp */}
                  <div className="flex items-center gap-2">
                    {setSelectedOrderId && setActiveTab && (
                      <>
                        <button
                          onClick={() => {
                            setSaleToReprint(currentSaleState);
                            setShowPrintConfirm(true);
                          }}
                          className={
                            isRetro
                              ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-[#808080] border-r-[#808080] bg-[#dfdfdf] text-[#000080] flex items-center gap-1.5 cursor-pointer select-none active:scale-95'
                              : isLight
                                ? 'px-4 py-2 text-xs font-black uppercase rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-sm'
                                : 'px-4 py-2 text-xs font-black uppercase rounded-xl bg-emerald-500 hover:bg-emerald-450 hover:shadow-[0_0_12px_rgba(52,211,153,0.3)] text-neutral-950 transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95'
                          }
                          style={isRetro ? (isLight ? { color: '#000080' } : { color: '#60a5fa' }) : undefined}
                        >
                          <Printer className="w-3.5 h-3.5" /> Re-imprimir Ticket
                        </button>
                        {config.whatsappMode && config.whatsappMode !== 'disabled' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isWaIntegratedOffline) {
                                window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                              } else {
                                const saleMapped = {
                                  id: currentSaleState.id,
                                  items: (currentSaleState.items || []).map((i: any) => ({
                                    itemId: i.itemId || i.id,
                                    name: i.name || i.description || '',
                                    description: i.description || i.name || '',
                                    quantity: i.quantity,
                                    price: i.price
                                  })),
                                  total: currentSaleState.total,
                                  createdAt: currentSaleState.createdAt || new Date().toISOString(),
                                  paymentMethod: currentSaleState.paymentMethod,
                                  cashReceived: currentSaleState.cashReceived,
                                  cardReceived: currentSaleState.cardReceived,
                                  change: currentSaleState.change,
                                  ticketNumber: currentSaleState.ticketNumber || currentSaleState.id,
                                  confirmationCode: currentSaleState.confirmationCode || '',
                                  notes: currentSaleState.notes || '',
                                };
                                const isRec = isRechargeSale(saleMapped as any);
                                const msg = buildWhatsappSaleTicketMessage(saleMapped as any, config);
                                const html = isRec ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);
                                let targetPhone = '';
                                if (isRec) {
                                  const allText = (currentSaleState.items || []).map((i: any) => i.name || i.description || '').join(' ') + ' ' + (currentSaleState.notes || '');
                                  const phoneMatch = allText.match(/\b\d{10}\b/) || allText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                                  if (phoneMatch) targetPhone = phoneMatch[0].replace(/\D/g, '');
                                }
                                sendWhatsappNotification(config, targetPhone, msg, html, undefined, currentSaleState.change);
                              }
                            }}
                            style={isWaIntegratedOffline ? { backgroundColor: '#71717a', borderColor: '#52525b' } : undefined}
                            title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
                            className={`whatsapp-green-btn px-4 py-2 text-xs font-black uppercase rounded-xl text-white transition-all flex items-center gap-1.5 cursor-pointer select-none border ${
                              isWaIntegratedOffline 
                                ? 'wa-offline bg-zinc-500 hover:bg-zinc-550 border-zinc-600 grayscale' 
                                : 'bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 shadow-sm border-[#20ba5a]'
                            }`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUCIÓN / CANCELACIÓN EXITOSA */}
      {refundSuccessModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 select-none animate-fade-in overflow-hidden">
          <div className={`w-full max-w-sm p-6 rounded-3xl border flex flex-col items-center text-center shadow-2xl relative z-10 ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900'
              : isLight 
                ? 'bg-white border-zinc-200 text-zinc-900' 
                : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            <button 
              onClick={() => setRefundSuccessModal(null)}
              className={`absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-colors ${
                isLight ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 text-white flex items-center justify-center text-2xl font-black mb-3 shadow-lg shadow-rose-500/40 animate-pulse">
              {refundSuccessModal.refundCash > 0 && refundSuccessModal.refundCard > 0 ? '🪙' : refundSuccessModal.refundCard > 0 ? '💳' : '💵'}
            </div>

            <h3 className="text-base font-black uppercase tracking-tight text-rose-600">
              {refundSuccessModal.isPartial ? 'DEVOLUCIÓN PARCIAL EXITOSA' : 'CANCELACIÓN EXITOSA'}
            </h3>

            <p className="text-xs font-bold mt-1 text-zinc-500">
              Ticket afectado: <span className="font-mono font-black text-rose-600">#{refundSuccessModal.ticketNumber}</span>
            </p>
            
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-1 bg-zinc-100 text-zinc-700 border border-zinc-200">
              Pago Original: {refundSuccessModal.paymentMethod}
            </span>

            <div className={`w-full my-4 p-4 rounded-2xl border flex flex-col gap-2.5 shadow-xs ${
              isLight 
                ? 'bg-rose-50/50 border-rose-100 text-zinc-900' 
                : 'bg-zinc-950 border-zinc-800 text-white'
            }`}>
              {refundSuccessModal.refundCash > 0 && refundSuccessModal.refundCard > 0 ? (
                <div className="flex flex-col gap-2.5 w-full py-1 text-xs">
                  <div className="flex justify-between items-center font-extrabold pb-1.5 border-b border-rose-100/50">
                    <span className="text-zinc-500 flex items-center gap-1">💵 EN EFECTIVO (CAJA):</span>
                    <span className="text-sm font-black text-rose-600 font-mono">
                      {config.currencySymbol}{refundSuccessModal.refundCash.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-extrabold pb-1.5 border-b border-rose-100/50">
                    <span className="text-zinc-500 flex items-center gap-1">💳 REVERSAR A TARJETA:</span>
                    <span className="text-sm font-black text-blue-600 font-mono">
                      {config.currencySymbol}{refundSuccessModal.refundCard.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-black pt-1">
                    <span className="text-[10px] tracking-wider text-zinc-400">TOTAL REEMBOLSO:</span>
                    <span className="text-base text-rose-600 font-mono">
                      {config.currencySymbol}{refundSuccessModal.refundAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : refundSuccessModal.refundCard > 0 ? (
                <div className="flex flex-col gap-1 items-center justify-center py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    REVERSAR EN TERMINAL BANCARIA:
                  </span>
                  <span className="text-2xl font-mono font-black text-blue-600 animate-bounce">
                    {config.currencySymbol}{refundSuccessModal.refundCard.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1 items-center justify-center py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    ENTREGAR EN EFECTIVO (CAJA):
                  </span>
                  <span className="text-2xl font-mono font-black text-rose-600 animate-bounce">
                    {config.currencySymbol}{refundSuccessModal.refundCash.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setRefundSuccessModal(null)}
              className="w-full h-10 rounded-xl bg-zinc-900 text-white font-bold text-xs uppercase hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE RE-IMPRESIÓN INDUSTRIAL */}
      {showPrintConfirm && saleToReprint && (() => {
        const ticketPrinterBrand = config.printerInterface === 'Default' ? 'Xprinter XP-N160I (USB PNP)' : (config.printerInterface === 'Ethernet' ? `Impresora de red LAN (${config.printerIpAddress || '192.168.1.100'})` : `Impresora Térmica ${config.printerInterface || 'USB'}`);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100">
            <div className={`w-full max-w-sm overflow-hidden flex flex-col relative animate-scale-up ${
              isRetro 
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 font-sans'
                : isLight 
                  ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                  : 'bg-[#0f1115] border border-zinc-700 rounded-2xl shadow-2xl'
            }`}>
              
              {/* Cabecera del modal de confirmación */}
              <div className={`flex items-center gap-3 p-4 border-b ${
                isRetro 
                  ? 'bg-[#000080] border-[#808080] text-white p-2'
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                    : 'bg-[#13151a] border-b border-zinc-900/80 text-zinc-100'
              }`}>
                <div className={`p-2 rounded-xl flex items-center justify-center border ${
                  isRetro 
                    ? 'bg-blue-900/30 text-white border-white/20' 
                    : isLight 
                      ? 'bg-sky-100 text-sky-600 border-sky-200 shadow-sm' 
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                }`}>
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-mono font-black uppercase tracking-widest ${
                    isRetro ? 'text-white' : isLight ? 'text-[#0ea5e9]' : 'text-[#56bcff]'
                  }`}>CONFIRMAR RE-IMPRESIÓN</h3>
                  <span className={`text-[9px] font-mono block uppercase tracking-widest ${
                    isRetro ? 'text-zinc-200' : 'text-zinc-400'
                  }`}>BOLETO TÉRMICO DE VENTA</span>
                </div>
              </div>

              {/* Contenido / Informativo */}
              <div className="p-6 space-y-4 font-sans text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block tracking-wider">Detalles de la Boleta</span>
                <p className={`text-sm font-black uppercase leading-snug ${
                  isLight ? 'text-zinc-950' : 'text-white'
                }`}>
                  ¿Realmente desea re-imprimir la Boleta de Venta #{saleToReprint.id}?
                </p>
                
                <div className={`p-4 border rounded-xl space-y-2 text-left font-mono text-[11px] ${
                  isRetro 
                    ? 'bg-white border-[#808080] text-zinc-900 shadow-inner' 
                    : isLight 
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm' 
                      : 'bg-[#14151a] border border-zinc-900 text-zinc-300'
                }`}>
                  <div className="flex justify-between">
                    <span>Monto Total:</span>
                    <span className={`font-black ${
                      isRetro ? 'text-blue-900 font-extrabold' : isLight ? 'text-emerald-700 font-black' : 'text-[#00ffc4]'
                    }`}>{config.currencySymbol}{saleToReprint.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medio de Cobro:</span>
                    <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-150'}`}>{saleToReprint.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impresora Asignada:</span>
                    <span className={`font-bold uppercase ${
                      isRetro ? 'text-[#000080]' : isLight ? 'text-sky-700 font-black' : 'text-sky-400'
                    }`}>{ticketPrinterBrand}</span>
                  </div>
                </div>

                <div className={`border p-3 text-left text-[10px] font-mono leading-relaxed rounded-xl ${
                  isRetro 
                    ? 'bg-amber-50 border-amber-300 text-amber-800' 
                    : isLight 
                      ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                      : 'bg-[#1b120c]/45 border border-amber-950/20 text-amber-500'
                }`}>
                  💡 <strong>NOTA:</strong> El boleto se despachará de forma directa sin demoras ni intermediarios bajo el ancho térmico preestablecido con copia de seguridad física.
                </div>
              </div>

              {/* Acciones */}
              <div className={`p-4 border-t flex justify-end gap-2.5 ${
                isRetro 
                  ? 'bg-[#dfdfdf] border-[#808080]' 
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200' 
                    : 'bg-[#13151a] border-zinc-900'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintConfirm(false);
                    setSaleToReprint(null);
                  }}
                  className={
                    isRetro
                      ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                      : isLight
                        ? 'px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer select-none active:scale-95 shadow-sm'
                        : 'px-4 py-2 text-xs font-bold rounded-xl border border-zinc-600 bg-zinc-90 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer select-none active:scale-95'
                  }
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReprint}
                  className={
                    isRetro
                      ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 bg-[#dfdfdf] text-[#000080] font-black active:scale-95 flex items-center gap-1 cursor-pointer select-none'
                      : isLight
                        ? 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-sky-600 hover:bg-sky-500 text-white rounded-xl cursor-pointer select-none active:scale-95 flex items-center gap-1.5 shadow-sm'
                        : 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-[#38bdf8] hover:bg-sky-450 text-[#090b0e] hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all rounded-xl cursor-pointer select-none active:scale-95 flex items-center gap-1.5'
                  }
                >
                  <Printer className="w-3.5 h-3.5" /> Procesar copia
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Previsualización de Venta (POS) */}
      {previewSaleForModal && (() => {
        let effectivePosWidth = config.posPaperWidth || config.ticketPaperWidth || '80mm';
        if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
          effectivePosWidth = '80mm';
        }
        const iframeWidth = effectivePosWidth === '58mm' ? '230px' : '310px';
        const iframeHeight = effectivePosWidth === '58mm' ? '450px' : '520px';

        const saleMapped = {
          ...previewSaleForModal,
          items: previewSaleForModal.items.map((i: any) => ({
            itemId: i.itemId || (i as any).id,
            name: i.name || i.description || '',
            description: i.name || i.description || '',
            quantity: i.quantity,
            price: i.price
          }))
        };

        const isRec = isRechargeSale(saleMapped as any);
                              const html = isRec ? buildRechargeTicketHtml(saleMapped as any, config) : buildPosTicketHtml(saleMapped, config);

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
            <div className="w-full max-w-lg rounded-xl border p-4 shadow-2xl relative bg-zinc-950 border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white"
                 ref={el => { if (el && isRetro) { el.className = 'w-full max-w-lg border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 p-4 relative bg-[#dfdfdf] text-zinc-900 font-sans shadow-2xl'; } else if (el && isLight) { el.className = 'w-full max-w-lg rounded-xl border border-zinc-200 p-4 shadow-2xl relative bg-white text-zinc-900'; } }}>
              <div className="flex items-center justify-between border-b pb-2 mb-3 border-zinc-800"
                   ref={el => { if (el && isRetro) { el.className = 'flex items-center justify-between border-b pb-2 mb-3 border-[#808080]'; } else if (el && isLight) { el.className = 'flex items-center justify-between border-b pb-2 mb-3 border-zinc-200'; } }}>
                <h3 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-zinc-300"
                    ref={el => { if (el && isRetro) { el.className = 'text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-[#000080]'; } else if (el && isLight) { el.className = 'text-xs uppercase font-black tracking-widest flex items-center gap-1.5 text-zinc-800'; } }}>
                  <span>👁️</span> Vista Previa del Ticket POS
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewSaleForModal(null)}
                  className="p-1 rounded hover:bg-zinc-800 text-xs font-bold cursor-pointer text-zinc-400"
                  ref={el => { if (el && isRetro) { el.className = 'p-1 rounded hover:bg-zinc-300 text-xs font-bold cursor-pointer text-zinc-800'; } else if (el && isLight) { el.className = 'p-1 rounded hover:bg-zinc-100 text-xs font-bold cursor-pointer text-zinc-500'; } }}
                >
                  ✕
                </button>
              </div>

              {/* Contenedor del ticket */}
              <div className="bg-white rounded-lg p-2 overflow-auto max-h-[70vh] flex justify-center border border-zinc-800"
                   ref={el => { if (el && isRetro) { el.className = 'bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white p-2 overflow-auto max-h-[70vh] flex justify-center'; } else if (el && isLight) { el.className = 'bg-white rounded-lg p-2 overflow-auto max-h-[70vh] flex justify-center border border-zinc-200'; } }}>
                <iframe
                  title="Ticket POS Preview"
                  srcDoc={html}
                  style={{ width: iframeWidth, height: iframeHeight }}
                  className="border-0 max-w-full"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewSaleForModal(null)}
                  className="py-1.5 px-4 text-xs font-black uppercase rounded-sm border cursor-pointer bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                  ref={el => { if (el && isRetro) { el.className = 'py-1.5 px-4 text-xs font-black uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer'; } else if (el && isLight) { el.className = 'py-1.5 px-4 text-xs font-black uppercase rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer shadow-sm'; } }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DETALLADO DE CONSULTA DE ACTIVACIÓN DE CHIP */}
      {showActivationDetailModal && selectedActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-md flex flex-col relative overflow-hidden animate-scale-up ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 font-sans shadow-2xl'
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                : 'bg-[#0c0d11] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
          }`}>
            
            {/* Cabecera del modal */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro
                ? 'bg-[#000080] border-[#808080] text-white p-2'
                : isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  : 'bg-[#111217] border-zinc-800 text-zinc-100'
            }`} ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isRetro 
                    ? 'p-1.5 bg-[#102575] border border-white/20 text-white font-black' 
                    : isLight 
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' 
                      : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25'
                }`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-[11px] font-mono font-black uppercase tracking-widest ${
                    isRetro ? 'text-white' : 'text-zinc-400'
                  }`}>DETALLES DE ACTIVACIÓN</h4>
                  <p className={`text-sm font-sans font-black ${
                    isRetro ? 'text-white font-mono' : isLight ? 'text-zinc-900' : 'text-white'
                  }`}>{selectedActivation.chipNumber}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowActivationDetailModal(false); setSelectedActivation(null); }}
                className={
                  isRetro
                    ? 'w-6 h-6 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-[#808080] font-bold active:scale-95 flex items-center justify-center cursor-pointer'
                    : isLight 
                      ? 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900 text-zinc-700'
                      : 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-900 border border-zinc-600 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }
                title="Cerrar detalles"
                ref={el => { if (el && isRetro) el.style.setProperty('color','#000000','important'); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Cuerpo */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className={`p-4 border rounded-xl space-y-3 font-mono text-xs ${
                isRetro 
                  ? 'bg-white border-[#808080] text-zinc-900 shadow-inner' 
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm' 
                    : 'bg-[#14151a] border border-zinc-900 text-zinc-300'
              }`}>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Compañía:</span>
                  <span className="font-black text-blue-500">{selectedActivation.carrier}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Número de Chip:</span>
                  <span className="font-black text-zinc-800 dark:text-white text-sm">{selectedActivation.chipNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">ICCID (SIM):</span>
                  <span>{selectedActivation.iccid || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">IMEI Equipo:</span>
                  <span>{selectedActivation.imei || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Nombre Cliente:</span>
                  <span className="font-bold">{selectedActivation.clientName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Teléfono Cliente:</span>
                  <span>{selectedActivation.clientPhone || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Folio de Venta:</span>
                  <span>{selectedActivation.saleId || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-zinc-500/10">
                  <span className="text-zinc-500">Precio de Venta:</span>
                  <span className="font-bold text-emerald-600">{config.currencySymbol}{selectedActivation.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Fecha Registro:</span>
                  <span>{new Date(selectedActivation.date).toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-4 border-t flex justify-end gap-2 shrink-0 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#111217] border-zinc-800/85'
            }`}>
              <button
                type="button"
                onClick={() => { setShowActivationDetailModal(false); startEditActivation(selectedActivation); }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-750 cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-4 py-2 text-xs font-bold rounded-xl border border-zinc-650 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer select-none active:scale-95'
                }
              >
                Editar Datos
              </button>
              <button
                type="button"
                onClick={() => { setShowActivationDetailModal(false); setShowActivationDeleteConfirm(true); }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-red-900 border-[#808080] bg-red-100 text-red-700 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-4 py-2 text-xs font-semibold rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-4 py-2 text-xs font-bold rounded-xl bg-red-950/20 hover:bg-red-800/20 border border-red-900/35 text-red-400 cursor-pointer select-none active:scale-95'
                }
              >
                Eliminar Registro
              </button>
              <button
                type="button"
                onClick={() => { setShowActivationDetailModal(false); setSelectedActivation(null); }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-4 py-2 text-xs font-bold rounded-xl border border-zinc-800 bg-[#161822] hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer select-none active:scale-95'
                }
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDICIÓN DE DATOS DE ACTIVACIÓN */}
      {showActivationEditModal && selectedActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editClientName || !editChipNumber) {
                showToast('⚠️ Nombre del cliente y número son obligatorios');
                return;
              }
              if (onUpdateChipActivation) {
                onUpdateChipActivation({
                  ...selectedActivation,
                  carrier: editCarrier,
                  chipNumber: editChipNumber,
                  iccid: editIccid,
                  imei: editImei,
                  clientName: editClientName,
                  clientPhone: editClientPhone,
                  price: editPrice
                });
                showToast('✅ Datos de activación actualizados correctamente');
              }
              setShowActivationEditModal(false);
              setSelectedActivation(null);
            }}
            className={`w-full max-w-md flex flex-col relative overflow-hidden animate-scale-up ${
              isRetro 
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 font-sans shadow-2xl'
                : isLight 
                  ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                  : 'bg-[#0c0d11] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-105'
            }`}
          >
            
            {/* Cabecera del modal */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro
                ? 'bg-[#000080] border-[#808080] text-white p-2'
                : isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  : 'bg-[#111217] border-zinc-800 text-zinc-101'
            }`} ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isRetro 
                    ? 'p-1.5 bg-[#102575] border border-white/20 text-white font-black' 
                    : isLight 
                      ? 'bg-blue-100 border border-blue-300 text-blue-750' 
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                }`}>
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-[11px] font-mono font-black uppercase tracking-widest ${
                    isRetro ? 'text-white' : 'text-zinc-450'
                  }`}>MODIFICAR ACTIVACIÓN</h4>
                  <p className={`text-sm font-sans font-black ${
                    isRetro ? 'text-white font-mono' : isLight ? 'text-zinc-900' : 'text-white'
                  }`}>Editar Registro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowActivationEditModal(false); setSelectedActivation(null); }}
                className={
                  isRetro
                    ? 'w-6 h-6 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-[#808080] font-bold active:scale-95 flex items-center justify-center cursor-pointer'
                    : isLight 
                      ? 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900 text-zinc-700'
                      : 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg bg-zinc-900 border border-zinc-600 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }
                title="Cerrar edición"
                ref={el => { if (el && isRetro) el.style.setProperty('color','#000000','important'); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Cuerpo */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Operadora / Compañía */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>Compañía Operadora *</label>
                <select
                  value={editCarrier}
                  onChange={(e) => setEditCarrier(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                >
                  <option value="Telcel">Telcel</option>
                  <option value="Movistar">Movistar</option>
                  <option value="AT&T">AT&T</option>
                  <option value="Unefon">Unefon</option>
                  <option value="Bait">Bait</option>
                  <option value="Altan Redes">Altan Redes</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Número de Chip */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>Número Telefónico (Chip) *</label>
                <input
                  type="text"
                  value={editChipNumber}
                  onChange={(e) => setEditChipNumber(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="Número de 10 dígitos"
                />
              </div>

              {/* ICCID */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>ICCID (SIM) (Opcional)</label>
                <input
                  type="text"
                  value={editIccid}
                  onChange={(e) => setEditIccid(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="19 o 20 dígitos"
                />
              </div>

              {/* IMEI */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>IMEI del Equipo (Opcional)</label>
                <input
                  type="text"
                  value={editImei}
                  onChange={(e) => setEditImei(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="15 dígitos"
                />
              </div>

              {/* Nombre Cliente */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>Nombre del Cliente *</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="Nombre del Cliente"
                />
              </div>

              {/* Teléfono Cliente */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>Teléfono de Contacto (Opcional)</label>
                <input
                  type="text"
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="Teléfono del Cliente"
                />
              </div>

              {/* Precio */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'font-mono' : 'text-zinc-400'}`}>Precio del Chip ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice || ''}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isRetro ? 'bg-white border-[#808080] text-zinc-900 font-mono' :
                    isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white' :
                    'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318]'
                  }`}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-4 border-t flex justify-end gap-2.5 shrink-0 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#111217] border-zinc-800/85'
            }`}>
              <button
                type="button"
                onClick={() => { setShowActivationEditModal(false); setSelectedActivation(null); }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-all cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-4 py-2 text-xs font-bold rounded-xl border border-zinc-800 bg-[#161822] hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer select-none active:scale-95'
                }
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 bg-[#dfdfdf] text-[#000080] font-black active:scale-95 cursor-pointer'
                    : isLight
                      ? 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-[#38bdf8] hover:bg-sky-450 text-[#090b0e] transition-all rounded-xl cursor-pointer select-none active:scale-95'
                }
              >
                Guardar Cambios
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE ACTIVACIÓN */}
      {showActivationDeleteConfirm && selectedActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100">
          <div className={`w-full max-w-sm overflow-hidden flex flex-col relative animate-scale-up ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 font-sans shadow-2xl'
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                : 'bg-[#0f1115] border border-zinc-700 rounded-2xl shadow-2xl'
          }`}>
            
            {/* Cabecera del modal */}
            <div className={`flex items-center gap-3 p-4 border-b ${
              isRetro 
                ? 'bg-[#000080] border-[#808080] text-white p-2'
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  : 'bg-[#13151a] border-b border-zinc-900/80 text-zinc-100'
            }`} ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <div className={`p-2 rounded-xl flex items-center justify-center border ${
                isRetro 
                  ? 'bg-red-900/30 text-white border-white/20' 
                  : isLight 
                    ? 'bg-red-100 text-red-650 border-red-200 shadow-sm' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/25'
              }`}>
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs font-mono font-black uppercase tracking-widest ${
                  isRetro ? 'text-white' : isLight ? 'text-red-750' : 'text-red-450'
                }`}>CONFIRMAR ELIMINACIÓN</h3>
                <span className={`text-[9px] font-mono block uppercase tracking-widest ${
                  isRetro ? 'text-zinc-200' : 'text-zinc-450'
                }`}>Registro de Chip SIM</span>
              </div>
            </div>

            {/* Contenido / Cuerpo */}
            <div className="p-6 space-y-4 font-sans text-center">
              <p className={`text-sm font-black uppercase leading-snug ${
                isLight ? 'text-zinc-950' : 'text-white'
              }`}>
                ¿Realmente desea eliminar la activación del número {selectedActivation.chipNumber}?
              </p>
              
              <div className={`p-4 border rounded-xl space-y-2 text-left font-mono text-[11px] ${
                isRetro 
                  ? 'bg-white border-[#808080] text-zinc-900 shadow-inner' 
                  : isLight 
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm' 
                    : 'bg-[#14151a] border border-zinc-900 text-zinc-300'
              }`}>
                <div className="flex justify-between">
                  <span>Compañía:</span>
                  <span className="font-bold">{selectedActivation.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold">{selectedActivation.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Folio Venta:</span>
                  <span>{selectedActivation.saleId || '—'}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-4 border-t flex justify-end gap-2.5 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#13151a] border-zinc-900'
            }`}>
              <button
                type="button"
                onClick={() => { setShowActivationDeleteConfirm(false); setSelectedActivation(null); }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-zinc-700 border-[#808080] bg-[#dfdfdf] hover:bg-zinc-200 text-zinc-900 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-4 py-2 text-xs font-bold rounded-xl border border-zinc-605 bg-zinc-90 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer select-none active:scale-95'
                }
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteChipActivation) {
                    onDeleteChipActivation(selectedActivation.id);
                    showToast('🗑️ Registro de activación eliminado correctamente');
                  }
                  setShowActivationDeleteConfirm(false);
                  setSelectedActivation(null);
                }}
                className={
                  isRetro
                    ? 'px-3 py-1.5 text-xs font-bold uppercase border-2 border-t-white border-l-white border-b-red-900 border-r-red-900 bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 cursor-pointer select-none active:scale-95'
                    : isLight
                      ? 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-red-650 hover:bg-red-600 text-white rounded-xl cursor-pointer select-none active:scale-95 shadow-sm'
                      : 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-red-500 hover:bg-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all rounded-xl cursor-pointer select-none active:scale-95'
                }
              >
                Sí, Eliminar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


export default VentasView;
