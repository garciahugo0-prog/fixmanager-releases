/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  BarChart2, ShoppingCart, Wrench, ArrowUpRight, ArrowDownLeft,
  Scissors, Tags, Smartphone, X, Printer, Calendar,
  ChevronDown, AlertCircle, Truck, Package, TrendingUp, CreditCard, Search, Bookmark, CheckCircle
} from 'lucide-react';
import { Sale, RepairOrder, Expense, WorkshopConfig, ServicePrice, AppUser, Quote, CreditAccount, ApartadoEntry, InventoryItem, RefaccionItem } from '../types';
import { showUiToast } from '../utils/whatsapp';

export const getOrderPaymentMethod = (o: RepairOrder): string => {
  const methods = new Set<string>();
  
  if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
    o.advancePaymentBreakdown.forEach(b => {
      if (b.amount > 0) {
        methods.add(b.method);
      }
    });
  } else if (o.advancePayment && o.advancePayment > 0) {
    methods.add('Efectivo');
  }

  if (o.cashPaid && o.cashPaid > 0) {
    methods.add('Efectivo');
  }
  if (o.cardPaid && o.cardPaid > 0) {
    methods.add('Tarjeta');
  }

  if (methods.size === 0) {
    if (o.isPaid || o.status === 'Entregado y Pagado') {
      return 'Efectivo';
    }
    return '—';
  }

  if (methods.size > 1) {
    return 'Múltiple';
  }

  const method = Array.from(methods)[0];
  if (method === 'Tarjeta' || method === 'Transferencia' || method === 'Tarjeta/Transfer') {
    return 'Tarjeta/Transfer';
  }
  return method;
};

// ─── tipos de categoría ────────────────────────────────────────────────────
type ReportCategory =
  | 'ventas-pos'
  | 'ventas-ordenes'
  | 'entradas-manuales'
  | 'salidas-manuales'
  | 'cortes'
  | 'historial-precios'
  | 'historial-equipos'
  | 'rebastos'
  | 'piezas-pendientes'
  | 'top-productos'
  | 'top-cotizaciones'
  | 'fiados'
  | 'apartados'
  | 'productos-consultados'
  | 'stock-critico-tienda'
  | 'refacciones-criticas';

interface ReportesViewProps {
  sales: Sale[];
  orders: RepairOrder[];
  expenses: Expense[];
  cortesHistorial: any[];
  services: ServicePrice[];
  onUpdateOrder?: (order: RepairOrder) => void;
  config: WorkshopConfig;
  currentUser?: AppUser | null;
  quotes?: Quote[];
  creditAccounts?: CreditAccount[];
  apartados?: ApartadoEntry[];
  inventory?: InventoryItem[];
  refacciones?: RefaccionItem[];
}

// ─── categorías del menú superior ─────────────────────────────────────────
const CATEGORIES: { id: ReportCategory; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: 'ventas-pos',        label: 'Ventas POS',          icon: ShoppingCart,   color: 'text-yellow-400  border-yellow-500/40  bg-yellow-500/10' },
  { id: 'ventas-ordenes',    label: 'Ventas Órdenes',      icon: Wrench,         color: 'text-sky-400     border-sky-500/40     bg-sky-500/10'    },
  { id: 'entradas-manuales', label: 'Entradas Manuales',   icon: ArrowUpRight,   color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'},
  { id: 'salidas-manuales',  label: 'Salidas Manuales',    icon: ArrowDownLeft,  color: 'text-rose-400    border-rose-500/40    bg-rose-500/10'   },
  { id: 'cortes',            label: 'Cortes',              icon: Scissors,       color: 'text-pink-400    border-pink-500/40    bg-pink-500/10'   },
  { id: 'historial-precios', label: 'Historial de Precios',icon: Tags,           color: 'text-amber-400   border-amber-500/40   bg-amber-500/10'  },
  { id: 'historial-equipos', label: 'Historial de Equipos',icon: Smartphone,     color: 'text-cyan-400    border-cyan-500/40    bg-cyan-500/10'   },
  { id: 'rebastos',          label: 'Reabastos',           icon: Truck,          color: 'text-orange-400  border-orange-500/40  bg-orange-500/10' },
  { id: 'piezas-pendientes', label: 'Piezas Pendientes',   icon: Package,        color: 'text-amber-400   border-amber-500/40   bg-amber-500/10'  },
  { id: 'top-productos',     label: 'Top Productos',       icon: TrendingUp,     color: 'text-violet-400  border-violet-500/40  bg-violet-500/10' },
  { id: 'top-cotizaciones',  label: 'Top Cotizaciones',    icon: BarChart2,      color: 'text-teal-400    border-teal-500/40    bg-teal-500/10'   },
  { id: 'fiados',            label: 'Fiados',              icon: CreditCard,     color: 'text-rose-400    border-rose-500/40    bg-rose-500/10'   },
  { id: 'apartados',         label: 'Apartados',           icon: Bookmark,       color: 'text-sky-400     border-sky-500/40     bg-sky-500/10'    },
  { id: 'productos-consultados', label: 'Consultados',     icon: Search,         color: 'text-indigo-400  border-indigo-500/40  bg-indigo-500/10' },
  { id: 'stock-critico-tienda', label: 'Stock Crítico Tienda', icon: AlertCircle, color: 'text-amber-500 border-amber-500/40 bg-amber-500/10' },
  { id: 'refacciones-criticas', label: 'Refacciones Críticas', icon: Wrench, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
];

function buildA4Html(title: string, subtitle: string, store: string, thead: string, tbody: string, summary: string): string {
  const now = new Date().toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 20mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:15mm}
  @media print { body { padding: 0 !important; } }
  .hdr{border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}
  .hdr-l{}
  .hdr-l .report-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px}
  .hdr-l h1{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;color:#111}
  .hdr-l .store-name{font-size:10px;color:#555;margin-top:5px;font-weight:600}
  .hdr-r{text-align:right;font-size:9px;color:#777;padding-top:4px}
  .hdr-r strong{display:block;font-size:11px;color:#111;font-weight:800;margin-bottom:2px}
  .sub{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-left:4px solid #111;padding-left:8px;margin-bottom:12px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead tr{background:#111;color:#fff}
  thead th{padding:5px 8px;text-align:left;font-size:9.5px;text-transform:uppercase}
  thead th:last-child{text-align:right}
  tbody tr:nth-child(even){background:#f5f5f5}
  tbody td{padding:5px 8px;border-bottom:1px solid #e0e0e0;vertical-align:top}
  tbody td:last-child{text-align:right;font-weight:700}
  .summary{margin-top:16px;border-top:2px solid #111;padding-top:10px;display:flex;flex-wrap:wrap;gap:12px}
  .si{background:#f0f0f0;border:1px solid #ddd;padding:8px 14px;border-radius:4px;min-width:120px}
  .si label{display:block;font-size:8.5px;text-transform:uppercase;color:#666;font-weight:700}
  .si span{display:block;font-size:14px;font-weight:900;margin-top:2px}
  .footer{margin-top:20px;border-top:1px solid #ccc;padding-top:6px;font-size:8.5px;color:#888;text-align:center}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <div class="hdr-l">
    <div class="report-label">Reporte FixManager</div>
    <h1>${title}</h1>
    <div class="store-name">${store}</div>
  </div>
  <div class="hdr-r"><strong>${now}</strong>Generado automáticamente</div>
</div>
<div class="sub">${subtitle}</div>
<table>${thead}${tbody}</table>
<div class="summary">${summary}</div>
<div class="footer">${store} — FixManager — ${now}</div>
</body></html>`;
}

async function printReport(html: string, printerName?: string) {
  window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName: printerName || '', paperWidthMicrons: 210000, paperHeightMicrons: 297000, isReport: true } }));
}

export default function ReportesView({ sales, orders, expenses, cortesHistorial, services, config, currentUser, onUpdateOrder, quotes = [], creditAccounts = [], apartados = [], inventory = [], refacciones = [] }: ReportesViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const sym = config.currencySymbol || '$';

  const [category, setCategory] = useState<ReportCategory>(() => {
    if (config.enablePOS === false) {
      return 'ventas-ordenes';
    }
    return 'ventas-pos';
  });

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter(cat => {
      if (config.enablePOS === false) {
        if (['ventas-pos', 'rebastos', 'top-productos', 'fiados', 'apartados', 'productos-consultados', 'stock-critico-tienda'].includes(cat.id)) {
          return false;
        }
      }
      if (config.enableTaller === false) {
        if (['ventas-ordenes', 'historial-precios', 'historial-equipos', 'piezas-pendientes', 'top-cotizaciones'].includes(cat.id)) {
          return false;
        }
      }
      return true;
    });
  }, [config.enablePOS, config.enableTaller]);

  React.useEffect(() => {
    if (config.enablePOS === false && ['ventas-pos', 'rebastos', 'top-productos', 'fiados', 'apartados', 'productos-consultados'].includes(category)) {
      setCategory('ventas-ordenes');
    }
    if (config.enableTaller === false && ['ventas-ordenes', 'historial-precios', 'historial-equipos', 'piezas-pendientes', 'top-cotizaciones'].includes(category)) {
      setCategory('ventas-pos');
    }
  }, [config.enablePOS, config.enableTaller, category]);
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [payFilter, setPayFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showHidden, setShowHidden] = useState(false);
  const [printPreview, setPrintPreview] = useState<{ html: string; open: boolean } | null>(null);

  // Modal de detalle/edición de orden
  const [orderModal, setOrderModal] = useState<RepairOrder | null>(null);
  const [orderEdit, setOrderEdit] = useState<RepairOrder | null>(null);
  const canEditOrders = currentUser ? currentUser.permissions.canEditOrdersFromReports : true;
  const openOrderModal = (o: RepairOrder) => { setOrderModal(o); setOrderEdit({ ...o }); };
  const closeOrderModal = () => { setOrderModal(null); setOrderEdit(null); };
  const saveOrderEdit = () => {
    if (!orderEdit || !onUpdateOrder) return;
    onUpdateOrder(orderEdit);
    setOrderModal(orderEdit);
  };

  // ─── Historial de rebastos desde localStorage ─────────────────────────
  const rebastoLogs: any[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_replenishment_logs') || '[]'); } catch { return []; }
  }, [category]);

  // ─── Log de productos consultados en verificador de precios ───────────
  const priceCheckLogs: any[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_price_checks') || '[]'); } catch { return []; }
  }, [category]);

  // ─── Datos filtrados según categoría ──────────────────────────────────
  const filteredData = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    const inRange = (dateStr: string) => {
      // Extraer fecha local (YYYY-MM-DD) del registro sin conversión UTC
      const d = new Date(dateStr);
      const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (dateFrom && localDate < dateFrom) return false;
      if (dateTo   && localDate > dateTo)   return false;
      return true;
    };

    if (category === 'ventas-pos') {
      return [...sales]
        .filter(s => !s.isCancelled)
        .filter(s => inRange(s.createdAt))
        .filter(s => payFilter === 'Todos' || s.paymentMethod === payFilter)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (category === 'ventas-ordenes') {
      return orders
        .filter(o => o.status === 'Entregado y Pagado')
        .filter(o => inRange(o.createdAt))
        .filter(o => {
          if (payFilter === 'Todos') return true;
          const pm = getOrderPaymentMethod(o);
          return pm === payFilter;
        });
    }
    if (category === 'entradas-manuales') {
      return expenses
        .filter(e => e.type === 'entrada' && e.category !== 'Servicio Técnico')
        .filter(e => inRange(e.createdAt));
    }
    if (category === 'salidas-manuales') {
      return expenses
        .filter(e => (e.type === 'salida' || !e.type) && e.category !== 'Devolución de Servicio' && e.category !== 'Devolución de Venta')
        .filter(e => inRange(e.createdAt));
    }
    if (category === 'cortes') {
      return cortesHistorial
        .filter(c => inRange(c.createdAt || c.date || ''));
    }
    if (category === 'historial-precios') {
      return services;
    }
    if (category === 'historial-equipos') {
      const seen = new Set<string>();
      const list: { brand: string; model: string; modelCode: string; type: string; source: string }[] = [];
      (config.customDeviceModels || []).forEach(d => {
        const k = `${d.brand}|${d.model}`;
        if (!seen.has(k)) { seen.add(k); list.push({ brand: d.brand, model: d.model, modelCode: d.modelNumber || '—', type: d.type, source: 'Catálogo' }); }
      });
      orders.filter(o => o.deviceBrand && o.deviceModel).forEach(o => {
        const k = `${o.deviceBrand}|${o.deviceModel}`;
        if (!seen.has(k)) { seen.add(k); list.push({ brand: o.deviceBrand, model: o.deviceModel, modelCode: o.deviceModelNumber || '—', type: o.deviceType || 'Phone', source: 'Historial' }); }
      });
      return list;
    }
    if (category === 'rebastos') {
      return rebastoLogs.filter(l => {
        const d = new Date(l.date);
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }
    if (category === 'piezas-pendientes') {
      return orders.filter(o => o.parts && o.parts.some(p => !p.paidAt));
    }
    if (category === 'productos-consultados') {
      return priceCheckLogs.filter((e: any) => {
        const d = e.consultedAt?.slice(0, 10) ?? '';
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
    }
    if (category === 'fiados') {
      return creditAccounts.filter(a => !a.deletedAt).filter(a => {
        if (!dateFrom && !dateTo) return true;
        const d = a.createdAt.slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
    }
    if (category === 'apartados') {
      return apartados.filter(a => {
        if (!dateFrom && !dateTo) return true;
        const d = a.createdAt.slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
    }
    if (category === 'stock-critico-tienda') {
      return inventory.filter(item => {
        if (!showHidden && item.active === false) return false;
        return item.manageStock !== false && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0);
      });
    }
    if (category === 'refacciones-criticas') {
      return refacciones.filter(item => {
        if (!showHidden && item.active === false) return false;
        return item.manageStock !== false && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0);
      });
    }
    return [];
  }, [category, sales, orders, expenses, cortesHistorial, services, config, dateFrom, dateTo, payFilter, statusFilter, rebastoLogs, creditAccounts, priceCheckLogs, apartados, inventory, refacciones, showHidden]);

  // ─── Totales / sumario ─────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (category === 'ventas-pos') {
      const total = (filteredData as Sale[]).reduce((s, x) => {
        const saleRepairsTotal = x.items
          .filter(item => item.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        return s + Math.max(0, x.total - saleRepairsTotal);
      }, 0);
      return { total, count: filteredData.length };
    }
    if (category === 'ventas-ordenes') {
      const list = filteredData as RepairOrder[];
      const total = list.reduce((s, x) => s + x.cost, 0);
      let cash = 0;
      let card = 0;
      let totalInvestment = 0;
      list.forEach(o => {
        if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
          o.advancePaymentBreakdown.forEach(b => {
            if (b.method === 'Efectivo') cash += b.amount;
            else card += b.amount;
          });
        } else {
          cash += o.advancePayment || 0;
        }
        cash += o.cashPaid || 0;
        card += o.cardPaid || 0;
        if (o.status === 'Entregado y Pagado' && !o.cashPaid && !o.cardPaid) {
          const remaining = o.cost - (o.advancePayment || 0);
          if (remaining > 0) {
            cash += remaining;
          }
        }
        const orderPartsCost = o.parts ? o.parts.reduce((sum, p) => sum + (p.cost || 0), 0) : 0;
        totalInvestment += orderPartsCost + (o.serviceCost || 0);
      });
      const totalProfit = total - totalInvestment;
      return { total, count: list.length, extra: cash, extra2: card, extra3: totalInvestment, extra4: totalProfit };
    }
    if (category === 'entradas-manuales' || category === 'salidas-manuales') {
      const total = (filteredData as Expense[]).reduce((s, x) => s + x.amount, 0);
      return { total, count: filteredData.length };
    }
    if (category === 'rebastos') {
      const total = (filteredData as any[]).reduce((s, l) => s + Number(l.totalCost), 0);
      const pzas  = (filteredData as any[]).reduce((s, l) => s + (l.items as any[]).reduce((a: number, b: any) => a + b.addedQty, 0), 0);
      return { total, count: filteredData.length, extra: pzas };
    }
    if (category === 'piezas-pendientes') {
      const total = (filteredData as RepairOrder[]).flatMap(o => (o.parts || []).filter(p => !p.paidAt)).reduce((s, p) => s + p.cost, 0);
      const count = (filteredData as RepairOrder[]).flatMap(o => (o.parts || []).filter(p => !p.paidAt)).length;
      return { total, count };
    }
    if (category === 'productos-consultados') {
      const logs = filteredData as any[];
      const agregados = logs.filter(e => e.addedToCart).length;
      const tasa = logs.length > 0 ? Math.round((agregados / logs.length) * 100) : 0;
      return { total: null, count: logs.length, extra: agregados, extra2: tasa };
    }
    if (category === 'fiados') {
      const accs = filteredData as CreditAccount[];
      const getBalance = (a: CreditAccount) => Math.max(0, a.entries.reduce((s, e) => s + e.subtotal, 0) - a.payments.reduce((s, p) => s + p.amount, 0));
      const totalDeuda = accs.reduce((s, a) => s + getBalance(a), 0);
      const activos = accs.filter(a => getBalance(a) > 0).length;
      const saldados = accs.filter(a => getBalance(a) === 0).length;
      return { total: totalDeuda, count: accs.length, extra: activos, extra2: saldados };
    }
    if (category === 'apartados') {
      const apts = filteredData as ApartadoEntry[];
      const getPaid = (a: ApartadoEntry) => a.payments.reduce((s, p) => s + p.amount, 0);
      const getRemaining = (a: ApartadoEntry) => Math.max(0, a.totalValue - getPaid(a));
      const totalValue = apts.reduce((s, a) => s + a.totalValue, 0);
      const totalReceived = apts.reduce((s, a) => s + getPaid(a), 0);
      const totalRemaining = apts.reduce((s, a) => s + getRemaining(a), 0);
      return { total: totalValue, count: apts.length, extra: totalReceived, extra2: totalRemaining };
    }
    if (category === 'stock-critico-tienda') {
      const totalCost = (filteredData as InventoryItem[]).reduce((s, x) => s + (x.stock * x.cost), 0);
      return { total: totalCost, count: filteredData.length };
    }
    if (category === 'refacciones-criticas') {
      const totalCost = (filteredData as RefaccionItem[]).reduce((s, x) => s + (x.stock * x.cost), 0);
      return { total: totalCost, count: filteredData.length };
    }
    return { total: null, count: filteredData.length };
  }, [filteredData, category]);

  // ─── Helpers de estilo ─────────────────────────────────────────────────
  const cardCls   = isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500' : isLight ? 'bg-white border border-zinc-200' : 'bg-[#121316] border border-[#1b1c21]';
  const inputCls  = isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black focus:outline-none text-xs px-2 py-1.5 w-full' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:border-violet-400 focus:outline-none text-xs px-3 py-1.5 w-full' : 'bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-violet-500 focus:outline-none text-xs px-3 py-1.5 w-full';
  const labelCls  = isRetro ? 'text-[9.5px] font-black uppercase text-zinc-600 block mb-1' : isLight ? 'text-[9.5px] font-black uppercase text-zinc-500 block mb-1' : 'text-[9.5px] font-black uppercase text-zinc-500 block mb-1';
  const thCls     = isRetro ? 'bg-[#000080] text-white px-3 py-2 text-left text-[9.5px] font-black uppercase tracking-wide' : isLight ? 'bg-zinc-100 text-zinc-600 px-3 py-2 text-left text-[9.5px] font-black uppercase' : 'bg-zinc-800 text-zinc-400 px-3 py-2 text-left text-[9.5px] font-black uppercase';
  const tdCls     = isRetro ? 'px-3 py-2 text-[10.5px] text-zinc-800 border-b border-zinc-300' : isLight ? 'px-3 py-2 text-[10.5px] text-zinc-700 border-b border-zinc-100' : 'px-3 py-2 text-[10.5px] text-zinc-300 border-b border-zinc-800';
  const trEven    = isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50' : 'bg-zinc-900/30';
  const emptyText = isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-600';
  const selectCls = inputCls;

  // ─── Tabla según categoría ─────────────────────────────────────────────
  const renderTable = () => {
    if (category === 'top-cotizaciones') {
      if (quotes.length === 0) {
        return (
          <div className={`py-16 text-center text-sm ${emptyText}`}>
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No hay cotizaciones registradas aún.
          </div>
        );
      }

      const quotasFiltradas = quotes.filter(q => {
        const d = q.createdAt.slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });

      const serviceMap = new Map<string, { count: number; costoTotal: number; convertidas: number }>();
      const deviceMap = new Map<string, { count: number }>();

      quotasFiltradas.forEach(q => {
        q.devices.forEach(d => {
          const svc = (d.serviceType || 'Sin especificar').trim();
          const prev = serviceMap.get(svc) || { count: 0, costoTotal: 0, convertidas: 0 };
          const qty = d.quantity || 1;
          serviceMap.set(svc, { count: prev.count + qty, costoTotal: prev.costoTotal + (qty * (d.estimatedCost || 0)), convertidas: prev.convertidas + (q.status === 'Convertida' ? 1 : 0) });
          const dev = `${d.deviceBrand || '?'} ${d.deviceModel || '?'}`.trim();
          const prevD = deviceMap.get(dev) || { count: 0 };
          deviceMap.set(dev, { count: prevD.count + qty });
        });
      });

      const topServices = Array.from(serviceMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
      const topDevices = Array.from(deviceMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 10);
      const totalDevices = quotasFiltradas.reduce((s, q) => s + q.devices.reduce((acc, d) => acc + (d.quantity || 1), 0), 0);
      const convertidas = quotasFiltradas.filter(q => q.status === 'Convertida').length;
      const conversionRate = quotasFiltradas.length > 0 ? Math.round((convertidas / quotasFiltradas.length) * 100) : 0;
      const maxCount = topServices[0]?.count || 1;
      const medals = ['🥇', '🥈', '🥉'];
      const podioColors = [
        isLight ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-teal-950/30 border-teal-600/40 text-teal-400',
        isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-600' : 'bg-zinc-800/50 border-zinc-600/40 text-zinc-400',
        isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-cyan-950/30 border-cyan-600/40 text-cyan-400',
      ];

      return (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Cotizaciones', value: quotasFiltradas.length, color: isLight ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-teal-950/20 border-teal-800/30 text-teal-300' },
              { label: 'Equipos cotizados', value: totalDevices, color: isLight ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-teal-950/20 border-teal-800/30 text-teal-300' },
              { label: 'Convertidas', value: convertidas, color: isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' },
              { label: 'Tasa conversión', value: `${conversionRate}%`, color: isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-950/20 border-sky-800/30 text-sky-300' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
                <p className="text-[9px] uppercase font-bold mb-1 opacity-70">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
          {topServices.length >= 2 && (
            <div>
              <h3 className={`text-[10px] uppercase font-black mb-2 tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>🏆 Servicios más cotizados</h3>
              <div className="grid grid-cols-3 gap-3">
                {topServices.slice(0, 3).map((s, i) => (
                  <div key={s.name} className={`rounded-xl border p-3 ${podioColors[i]}`}>
                    <div className="text-xl mb-1">{medals[i]}</div>
                    <div className="text-xs font-black leading-tight truncate">{s.name}</div>
                    <div className="text-lg font-black mt-1">{s.count} <span className="text-[10px] font-bold opacity-60">veces</span></div>
                    {s.costoTotal > 0 && <div className="text-[10px] opacity-60 font-mono">{sym}{s.costoTotal.toFixed(0)} estimado</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className={`text-[10px] uppercase font-black mb-2 tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>📋 Todos los servicios cotizados</h3>
            <div className={`rounded-xl border overflow-hidden ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className={isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400'}>
                    {['#','Servicio','Solicitudes','Convertidas','Costo estimado','Demanda'].map(h => (
                      <th key={h} className={`px-3 py-2 font-black uppercase tracking-wider text-[9px] ${h === 'Costo estimado' ? 'text-right' : h === 'Solicitudes' || h === 'Convertidas' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                  {topServices.map((s, i) => {
                    const pct = Math.round((s.count / maxCount) * 100);
                    return (
                      <tr key={s.name} className={isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/30'}>
                        <td className={`px-3 py-2 font-black text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{i + 1}</td>
                        <td className={`px-3 py-2 font-bold ${isLight ? 'text-zinc-800' : 'text-white'}`}>{s.name}</td>
                        <td className="px-3 py-2 text-center"><span className={`font-black text-sm ${isLight ? 'text-teal-700' : 'text-teal-400'}`}>{s.count}</span></td>
                        <td className="px-3 py-2 text-center"><span className={`font-bold text-xs ${s.convertidas > 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-zinc-400' : 'text-zinc-600')}`}>{s.convertidas}</span></td>
                        <td className={`px-3 py-2 text-right font-mono font-bold text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{s.costoTotal > 0 ? `${sym}${s.costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                        <td className="px-3 py-2">
                          <div className={`h-1.5 rounded-full overflow-hidden w-full ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {topDevices.length > 0 && (
            <div>
              <h3 className={`text-[10px] uppercase font-black mb-2 tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>📱 Dispositivos más cotizados</h3>
              <div className={`rounded-xl border overflow-hidden ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400'}>
                      <th className="px-3 py-2 text-left font-black uppercase tracking-wider text-[9px]">#</th>
                      <th className="px-3 py-2 text-left font-black uppercase tracking-wider text-[9px]">Dispositivo</th>
                      <th className="px-3 py-2 text-right font-black uppercase tracking-wider text-[9px]">Veces cotizado</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                    {topDevices.map((d, i) => (
                      <tr key={d.name} className={isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/30'}>
                        <td className={`px-3 py-2 font-black text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{i < 3 ? medals[i] : i + 1}</td>
                        <td className={`px-3 py-2 font-bold ${isLight ? 'text-zinc-800' : 'text-white'}`}>{d.name}</td>
                        <td className={`px-3 py-2 text-right font-black ${isLight ? 'text-teal-700' : 'text-teal-400'}`}>{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Sin registros para los filtros seleccionados.
        </div>
      );
    }

    if (category === 'ventas-pos') {
      const rows = filteredData as Sale[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Fecha</th>
            <th className={thCls}>Artículos</th>
            <th className={thCls}>Método Pago</th>
            <th className={`${thCls} text-right`}>Total</th>
          </tr></thead>
          <tbody>
            {rows.map((s, i) => {
              const saleRepairsTotal = s.items
                .filter(item => item.itemId.startsWith('repair-'))
                .reduce((sum, item) => sum + item.price * item.quantity, 0);
              const saleNetTotal = Math.max(0, s.total - saleRepairsTotal);
              const nonRepairItems = s.items.filter(item => !item.itemId.startsWith('repair-'));
              return (
                <tr key={s.id} className={i % 2 === 1 ? trEven : ''}>
                  <td className={`${tdCls} font-mono font-black`}>{s.id}</td>
                  <td className={tdCls}>{new Date(s.createdAt).toLocaleString('es-MX', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className={`${tdCls} max-w-[220px] truncate`}>{nonRepairItems.map(i => `${i.name} ×${i.quantity}`).join(', ') || '—'}</td>
                  <td className={tdCls}>{s.paymentMethod}</td>
                  <td className={`${tdCls} text-right font-black`}>{sym}{saleNetTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (category === 'ventas-ordenes') {
      const rows = filteredData as RepairOrder[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Cliente</th>
            <th className={thCls}>Equipo</th>
            <th className={thCls}>Servicio</th>
            <th className={thCls}>Método Pago</th>
            <th className={thCls}>Fecha</th>
            <th className={thCls}></th>
            <th className={`${thCls} text-right`}>Inversión</th>
            <th className={`${thCls} text-right`}>Ganancia</th>
            <th className={`${thCls} text-right`}>Costo</th>
          </tr></thead>
          <tbody>
            {rows.map((o, i) => {
              const pm = getOrderPaymentMethod(o);
              const orderInvestment = (o.parts ? o.parts.reduce((sum, p) => sum + (p.cost || 0), 0) : 0) + (o.serviceCost || 0);
              const orderProfit = o.cost - orderInvestment;
              return (
                <tr key={o.id} className={i % 2 === 1 ? trEven : ''}>
                  <td className={`${tdCls} font-mono font-black`}>{o.id}</td>
                  <td className={tdCls}>{o.customerName}</td>
                  <td className={tdCls}>{o.deviceBrand} {o.deviceModel}</td>
                  <td className={`${tdCls} max-w-[200px]`}>
                    <div className="font-semibold truncate" title={o.serviceType}>{o.serviceType}</div>
                    {o.parts && o.parts.length > 0 && (
                      <div className="mt-1 space-y-0.5 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-1">
                        {o.parts.map((p, idx) => (
                          <div key={idx} className="text-[9.5px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-1">
                            <span className="truncate max-w-[110px]" title={p.name}>• {p.name}</span>
                            <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 shrink-0">
                              (C: {sym}{p.cost || 0} | V: {sym}{p.price || 0})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      pm === 'Efectivo' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : pm === 'Tarjeta/Transfer' || pm === 'Tarjeta' || pm === 'Transferencia'
                        ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        : pm === 'Múltiple'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                    }`}>
                      {pm}
                    </span>
                  </td>
                  <td className={tdCls}>{new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
                  <td className={tdCls}>
                    <button
                      type="button"
                      onClick={() => { setOrderModal(o); setOrderEdit({ ...o }); }}
                      className={`px-2 py-1 text-[10px] font-black rounded border cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-[#000080] text-white border-blue-900 hover:bg-blue-900' : isLight ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20'}`}
                    >
                      Ver / Editar
                    </button>
                  </td>
                  <td className={`${tdCls} text-right font-mono font-semibold text-amber-600 dark:text-amber-400`}>
                    {sym}{orderInvestment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`${tdCls} text-right font-mono font-semibold ${orderProfit < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {sym}{orderProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`${tdCls} text-right font-black`}>{sym}{o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (category === 'entradas-manuales' || category === 'salidas-manuales') {
      const rows = filteredData as Expense[];
      const isEntrada = category === 'entradas-manuales';
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Concepto</th>
            <th className={thCls}>Categoría</th>
            <th className={thCls}>Fecha</th>
            <th className={`${thCls} text-right`}>Monto</th>
          </tr></thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id} className={i % 2 === 1 ? trEven : ''}>
                <td className={`${tdCls} font-mono`}>{e.id}</td>
                <td className={tdCls}>{e.description}</td>
                <td className={tdCls}>{e.category || '—'}</td>
                <td className={tdCls}>{new Date(e.createdAt).toLocaleString('es-MX', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className={`${tdCls} text-right font-black ${isEntrada ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isEntrada ? '+' : '-'}{sym}{e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (category === 'cortes') {
      const rows = filteredData as any[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Fecha/Hora</th>
            <th className={thCls}>Técnico</th>
            <th className={thCls}>Estimado</th>
            <th className={thCls}>Contado</th>
            <th className={`${thCls} text-right`}>Diferencia</th>
          </tr></thead>
          <tbody>
            {rows.map((c, i) => {
              const diff = c.diferencia ?? 0;
              return (
                <tr key={c.id} className={i % 2 === 1 ? trEven : ''}>
                  <td className={`${tdCls} font-mono font-black`}>{c.id}</td>
                  <td className={tdCls}>{new Date(c.createdAt || c.date || '').toLocaleString('es-MX', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className={tdCls}>{c.technicianName || '—'}</td>
                  <td className={tdCls}>{sym}{(c.estimado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={tdCls}>{sym}{(c.fisico ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdCls} text-right font-black ${diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-sky-400' : 'text-rose-500'}`}>
                    {diff >= 0 ? '+' : ''}{sym}{diff.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (category === 'historial-precios') {
      const rows = filteredData as ServicePrice[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Servicio</th>
            <th className={thCls}>Categoría</th>
            <th className={thCls}>Duración</th>
            <th className={`${thCls} text-right`}>Precio</th>
          </tr></thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id} className={i % 2 === 1 ? trEven : ''}>
                <td className={`${tdCls} font-mono`}>{s.id}</td>
                <td className={`${tdCls} font-bold`}>{s.name}</td>
                <td className={tdCls}>{s.category}</td>
                <td className={tdCls}>{s.durationMinutes} min</td>
                <td className={`${tdCls} text-right font-black`}>{sym}{s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (category === 'historial-equipos') {
      const rows = filteredData as { brand: string; model: string; modelCode: string; type: string; source: string }[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>Marca</th>
            <th className={thCls}>Modelo</th>
            <th className={thCls}>Código de Modelo</th>
            <th className={thCls}>Tipo</th>
            <th className={thCls}>Origen</th>
          </tr></thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={`${d.brand}-${d.model}`} className={i % 2 === 1 ? trEven : ''}>
                <td className={`${tdCls} font-bold`}>{d.brand}</td>
                <td className={tdCls}>{d.model}</td>
                <td className={`${tdCls} font-mono`}>{d.modelCode}</td>
                <td className={tdCls}>{d.type}</td>
                <td className={tdCls}>{d.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (category === 'rebastos') {
      const rows = filteredData as any[];
      return (
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Proveedor</th>
            <th className={thCls}>Fecha</th>
            <th className={thCls}>Artículos</th>
            <th className={thCls}>Piezas</th>
            <th className={`${thCls} text-right`}>Inversión</th>
            <th className={thCls}>Nota</th>
          </tr></thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={l.id} className={i % 2 === 1 ? trEven : ''}>
                <td className={`${tdCls} font-mono text-[10px]`}>{l.id}</td>
                <td className={`${tdCls} font-bold`}>{l.provider}</td>
                <td className={`${tdCls} font-mono text-[10px]`}>{new Date(l.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className={tdCls}>{l.itemsCount}</td>
                <td className={tdCls}>{(l.items as any[]).reduce((a: number, b: any) => a + b.addedQty, 0)} pz</td>
                <td className={`${tdCls} text-right font-black ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{sym}{Number(l.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`${tdCls} text-zinc-500 italic text-[10px]`}>{l.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (category === 'piezas-pendientes') {
      const pendientes = orders.flatMap(o =>
        (o.parts || []).filter(p => !p.paidAt).map(p => ({ orderId: o.id, customer: o.customerName, status: o.status, partName: p.name, cost: p.cost, createdAt: o.createdAt }))
      );
      const total = pendientes.reduce((s, p) => s + p.cost, 0);
      return (
        <div className="space-y-3">
          {pendientes.length === 0 ? (
            <p className={`text-center py-10 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Sin piezas pendientes de pago 🎉</p>
          ) : (
            <>
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-950/20 border border-amber-800'}`}>
                <span className={`text-[11px] font-black uppercase ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{pendientes.length} pieza{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
                <span className={`text-[11px] font-black font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Total: {sym}{total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <table className="w-full text-left">
                <thead><tr>
                  <th className={thCls}>Orden</th>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Estado</th>
                  <th className={thCls}>Pieza</th>
                  <th className={thCls}>Fecha Orden</th>
                  <th className={`${thCls} text-right`}>Costo</th>
                </tr></thead>
                <tbody>
                  {pendientes.map((p, i) => (
                    <tr key={i} className={i % 2 === 1 ? trEven : ''}>
                      <td className={`${tdCls} font-mono text-[10px]`}>{p.orderId}</td>
                      <td className={`${tdCls} font-bold`}>{p.customer}</td>
                      <td className={tdCls}>{p.status}</td>
                      <td className={tdCls}>{p.partName}</td>
                      <td className={`${tdCls} font-mono text-[10px]`}>{new Date(p.createdAt).toLocaleDateString('es-MX')}</td>
                      <td className={`${tdCls} text-right font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{sym}{p.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      );
    }
    if (category === 'top-productos') {
      // Filtrar ventas por rango de fecha
      const ventasFiltradas = sales.filter(s => {
        const d = s.createdAt.slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      });
      // Agregar por nombre normalizado
      const map = new Map<string, { unidades: number; ingresos: number; ventas: number }>();
      ventasFiltradas.forEach(sale => {
        (sale.items || []).forEach((item: any) => {
          if (item.itemId && item.itemId.startsWith('repair-')) return;
          const key = (item.name || item.description || '').trim().toUpperCase();
          if (!key) return;
          const prev = map.get(key) || { unidades: 0, ingresos: 0, ventas: 0 };
          map.set(key, {
            unidades: prev.unidades + (item.quantity || 1),
            ingresos: prev.ingresos + ((item.quantity || 1) * (item.price || 0)),
            ventas: prev.ventas + 1,
          });
        });
      });
      const ranking = Array.from(map.entries())
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.unidades - a.unidades);
      const totalUnidades = ranking.reduce((s, r) => s + r.unidades, 0);
      const totalIngresos = ranking.reduce((s, r) => s + r.ingresos, 0);
      const podioColors = [
        isLight ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-yellow-950/30 border-yellow-600/40 text-yellow-400',
        isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-600' : 'bg-zinc-800/50 border-zinc-600/40 text-zinc-400',
        isLight ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-orange-950/30 border-orange-600/40 text-orange-400',
      ];
      const medals = ['🥇', '🥈', '🥉'];
      return (
        <div className="space-y-4">
          {ranking.length === 0 ? (
            <div className={`py-16 text-center text-sm ${emptyText}`}>
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Sin ventas registradas en este período.
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl border p-3 text-center ${isLight ? 'bg-violet-50 border-violet-200' : 'bg-violet-950/20 border-violet-800/30'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-1 ${isLight ? 'text-violet-500' : 'text-violet-400'}`}>Productos únicos</p>
                  <p className={`text-2xl font-black ${isLight ? 'text-violet-700' : 'text-violet-300'}`}>{ranking.length}</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${isLight ? 'bg-violet-50 border-violet-200' : 'bg-violet-950/20 border-violet-800/30'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-1 ${isLight ? 'text-violet-500' : 'text-violet-400'}`}>Unidades vendidas</p>
                  <p className={`text-2xl font-black ${isLight ? 'text-violet-700' : 'text-violet-300'}`}>{totalUnidades}</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${isLight ? 'bg-violet-50 border-violet-200' : 'bg-violet-950/20 border-violet-800/30'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-1 ${isLight ? 'text-violet-500' : 'text-violet-400'}`}>Ingresos totales</p>
                  <p className={`text-xl font-black font-mono ${isLight ? 'text-violet-700' : 'text-violet-300'}`}>{sym}{totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              {/* Podio top 3 */}
              {ranking.length >= 2 && (
                <div className="grid grid-cols-3 gap-3">
                  {ranking.slice(0, 3).map((r, i) => (
                    <div key={r.nombre} className={`rounded-xl border p-3 ${podioColors[i]}`}>
                      <div className="text-2xl mb-1">{medals[i]}</div>
                      <p className="text-[11px] font-black leading-tight truncate" title={r.nombre}>{r.nombre}</p>
                      <p className="text-[10px] font-bold mt-1">{r.unidades} uds · {sym}{r.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Tabla completa */}
              <table className="w-full text-left">
                <thead><tr>
                  <th className={thCls}>#</th>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Unidades</th>
                  <th className={`${thCls} text-right`}>Ventas</th>
                  <th className={`${thCls} text-right`}>Ingresos</th>
                  <th className={`${thCls} text-right`}>% del total</th>
                </tr></thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.nombre} className={i % 2 === 1 ? trEven : ''}>
                      <td className={`${tdCls} font-black text-[11px] w-8`}>
                        {i < 3 ? medals[i] : <span className={`${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{i + 1}</span>}
                      </td>
                      <td className={`${tdCls} font-bold max-w-[220px] truncate`}>{r.nombre}</td>
                      <td className={`${tdCls} text-right font-black ${isLight ? 'text-violet-700' : 'text-violet-400'}`}>{r.unidades}</td>
                      <td className={`${tdCls} text-right ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{r.ventas}</td>
                      <td className={`${tdCls} text-right font-mono font-black`}>{sym}{r.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          <div className={`h-1.5 rounded-full ${isLight ? 'bg-violet-200' : 'bg-zinc-700'}`} style={{ width: '50px' }}>
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((r.unidades / ranking[0].unidades) * 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {totalUnidades > 0 ? Math.round((r.unidades / totalUnidades) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      );
    }


    if (category === 'productos-consultados') {
      const logs = filteredData as any[];
      if (logs.length === 0) return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No hay consultas registradas en el período seleccionado.
        </div>
      );
      return (
        <table className="w-full text-left">
          <thead>
            <tr>
              {['Producto','Código','Categoría','Marca','Precio','Hora consulta','Al carrito'].map(h => (
                <th key={h} className={`${thCls} ${h === 'Precio' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((e: any, i: number) => (
              <tr key={e.id} className={i % 2 === 0 ? trEven : ''}>
                <td className={`${tdCls} font-black`}>{e.name}</td>
                <td className={`${tdCls} font-mono`}>{e.code || '—'}</td>
                <td className={tdCls}>{e.category || '—'}</td>
                <td className={tdCls}>{e.brand || '—'}</td>
                <td className={`${tdCls} text-right font-mono font-black`}>{sym}{Number(e.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={tdCls}>{new Date(e.consultedAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className={tdCls}>
                  <span ref={el => { if (el) el.style.setProperty('color', e.addedToCart ? '#059669' : '#9ca3af', 'important'); }} className="text-[10px] font-black">
                    {e.addedToCart ? '✓ Sí' : '— No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (category === 'fiados') {
      const accs = filteredData as CreditAccount[];
      const getBalance = (a: CreditAccount) => Math.max(0, a.entries.reduce((s, e) => s + e.subtotal, 0) - a.payments.reduce((s, p) => s + p.amount, 0));
      if (accs.length === 0) return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No hay fiados registrados en el período seleccionado.
        </div>
      );
      return (
        <table className="w-full text-left">
          <thead>
            <tr>
              {['Cliente','Teléfono','Cargos','Abonos','Deuda total','Abonado','Saldo','Estado','Alta'].map(h => (
                <th key={h} className={`${thCls} ${h === 'Deuda total' || h === 'Abonado' || h === 'Saldo' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accs.map((a, i) => {
              const deuda   = a.entries.reduce((s, e) => s + e.subtotal, 0);
              const abonado = a.payments.reduce((s, p) => s + p.amount, 0);
              const saldo   = getBalance(a);
              return (
                <tr key={a.id} className={i % 2 === 0 ? trEven : ''}>
                  <td className={`${tdCls} font-black`}>{a.clientName}</td>
                  <td className={tdCls}>{a.clientPhone}</td>
                  <td className={`${tdCls} text-center`}>{a.entries.length}</td>
                  <td className={`${tdCls} text-center`}>{a.payments.length}</td>
                  <td className={`${tdCls} text-right font-mono`}>{sym}{deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdCls} text-right font-mono text-emerald-600`}>{sym}{abonado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdCls} text-right font-black font-mono ${saldo > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{sym}{saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={tdCls}>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${saldo > 0 ? (isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-900/30 text-rose-400') : (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400')}`}>
                      {saldo > 0 ? 'Con saldo' : 'Saldado'}
                    </span>
                  </td>
                  <td className={tdCls}>{new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    if (category === 'apartados') {
      const apts = filteredData as ApartadoEntry[];
      const getPaid = (a: ApartadoEntry) => a.payments.reduce((s, p) => s + p.amount, 0);
      const getRemaining = (a: ApartadoEntry) => Math.max(0, a.totalValue - getPaid(a));
      if (apts.length === 0) return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No hay apartados registrados en el período seleccionado.
        </div>
      );
      return (
        <table className="w-full text-left">
          <thead>
            <tr>
              {['Cliente','Teléfono','Artículos / Servicios','Estado','Total','Abonado','Saldo restante','Alta','Vence'].map(h => (
                <th key={h} className={`${thCls} ${h === 'Total' || h === 'Abonado' || h === 'Saldo restante' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apts.map((a, i) => {
              const pagado    = getPaid(a);
              const saldo     = getRemaining(a);
              const itemsList = a.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
              const statusColors: Record<string, string> = {
                'Activo':    isLight ? 'bg-blue-100 text-blue-700'    : 'bg-blue-900/30 text-blue-400',
                'Listo':     isLight ? 'bg-amber-100 text-amber-700'  : 'bg-amber-900/30 text-amber-400',
                'Entregado': isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400',
                'Cancelado': isLight ? 'bg-rose-100 text-rose-700'    : 'bg-rose-900/30 text-rose-400',
              };
              return (
                <tr key={a.id} className={i % 2 === 0 ? trEven : ''}>
                  <td className={`${tdCls} font-black`}>{a.clientName}</td>
                  <td className={tdCls}>{a.clientPhone || '—'}</td>
                  <td className={tdCls} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemsList}>{itemsList || '—'}</td>
                  <td className={tdCls}>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${statusColors[a.status] || ''}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className={`${tdCls} text-right font-mono`}>{sym}{a.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdCls} text-right font-mono text-emerald-600`}>{sym}{pagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdCls} text-right font-black font-mono ${saldo > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{sym}{saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={tdCls}>{new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className={tdCls}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    if (category === 'stock-critico-tienda') {
      const items = filteredData as InventoryItem[];
      if (items.length === 0) return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-500" />
          Todo el inventario de la tienda está por encima del mínimo.
        </div>
      );
      return (
        <table className="w-full text-left">
          <thead>
            <tr>
              {['Código / Barras', 'Nombre Producto', 'Categoría', 'Marca', 'Mínimo', 'Stock Actual', 'Costo', 'Precio'].map(h => (
                <th key={h} className={`${thCls} ${h === 'Mínimo' || h === 'Stock Actual' || h === 'Costo' || h === 'Precio' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? trEven : ''}>
                <td className={`${tdCls} font-mono text-zinc-500`}>{x.code || '—'}</td>
                <td className={`${tdCls} font-bold`}>{x.name}</td>
                <td className={tdCls}>{x.category || 'Accesorios'}</td>
                <td className={tdCls}>{x.brand || '—'}</td>
                <td className={`${tdCls} text-right font-bold text-zinc-400`}>{x.minStock}</td>
                <td className={`${tdCls} text-right font-black text-rose-500`}>{x.stock}</td>
                <td className={`${tdCls} text-right font-mono text-zinc-400`}>{sym}{x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`${tdCls} text-right font-mono text-emerald-600`}>{sym}{x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (category === 'refacciones-criticas') {
      const items = filteredData as RefaccionItem[];
      if (items.length === 0) return (
        <div className={`py-16 text-center text-sm ${emptyText}`}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-500" />
          Todas las refacciones del taller están por encima del mínimo.
        </div>
      );
      return (
        <table className="w-full text-left">
          <thead>
            <tr>
              {['Código / SKU', 'Refacción', 'Compatibilidad', 'Marca Ref', 'Mínimo', 'Stock Actual', 'Costo', 'Precio Rep.'].map(h => (
                <th key={h} className={`${thCls} ${h === 'Mínimo' || h === 'Stock Actual' || h === 'Costo' || h === 'Precio Rep.' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? trEven : ''}>
                <td className={`${tdCls} font-mono text-zinc-500`}>{x.code || '—'}</td>
                <td className={`${tdCls} font-bold`}>{x.name}</td>
                <td className={`${tdCls} font-mono text-indigo-500`}>{x.deviceBrand} {x.deviceModel}</td>
                <td className={tdCls}>{x.brand || 'GENERICO'}</td>
                <td className={`${tdCls} text-right font-bold text-zinc-400`}>{x.minStock}</td>
                <td className={`${tdCls} text-right font-black text-rose-500`}>{x.stock}</td>
                <td className={`${tdCls} text-right font-mono text-zinc-400`}>{sym}{x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`${tdCls} text-right font-mono text-emerald-600`}>{sym}{x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  // ─── Construir HTML del reporte ────────────────────────────────────────
  const buildReportHtml = () => {
    const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES.find(c => c.id === 'entradas-manuales')!;
    let thead = '', tbody = '', summaryHtml = '';

    if (category === 'ventas-pos') {
      const rows = filteredData as Sale[];
      const total = rows.reduce((s, x) => {
        const saleRepairsTotal = x.items
          .filter(item => item.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        return s + Math.max(0, x.total - saleRepairsTotal);
      }, 0);
      thead = `<thead><tr><th>ID</th><th>Fecha</th><th>Artículos</th><th>Pago</th><th style="text-align:right">Total</th></tr></thead>`;
      tbody = `<tbody>${rows.map(s => {
        const saleRepairsTotal = s.items
          .filter(item => item.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        const saleNetTotal = Math.max(0, s.total - saleRepairsTotal);
        const nonRepairItems = s.items.filter(item => !item.itemId.startsWith('repair-'));
        return `<tr><td>${s.id}</td><td>${new Date(s.createdAt).toLocaleString('es-MX')}</td><td>${nonRepairItems.map(i => `${i.name} x${i.quantity}`).join(', ') || '—'}</td><td>${s.paymentMethod}</td><td>${sym}${saleNetTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total ventas</label><span>${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Transacciones</label><span>${rows.length}</span></div>`;
    } else if (category === 'ventas-ordenes') {
      const rows = filteredData as RepairOrder[];
      const total = rows.reduce((s, x) => s + x.cost, 0);
      let cash = 0;
      let card = 0;
      let totalInvestment = 0;
      rows.forEach(o => {
        if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
          o.advancePaymentBreakdown.forEach(b => {
            if (b.method === 'Efectivo') cash += b.amount;
            else card += b.amount;
          });
        } else {
          cash += o.advancePayment || 0;
        }
        cash += o.cashPaid || 0;
        card += o.cardPaid || 0;
        if (o.status === 'Entregado y Pagado' && !o.cashPaid && !o.cardPaid) {
          const remaining = o.cost - (o.advancePayment || 0);
          if (remaining > 0) {
            cash += remaining;
          }
        }
        const orderPartsCost = o.parts ? o.parts.reduce((sum, p) => sum + (p.cost || 0), 0) : 0;
        totalInvestment += orderPartsCost + (o.serviceCost || 0);
      });
      const totalProfit = total - totalInvestment;
      thead = `<thead><tr><th>ID</th><th>Cliente</th><th>Equipo</th><th>Servicio</th><th>Método Pago</th><th>Fecha</th><th style="text-align:right">Inversión</th><th style="text-align:right">Ganancia</th><th style="text-align:right">Costo</th></tr></thead>`;
      tbody = `<tbody>${rows.map(o => {
        const pm = getOrderPaymentMethod(o);
        const orderInvestment = (o.parts ? o.parts.reduce((sum, p) => sum + (p.cost || 0), 0) : 0) + (o.serviceCost || 0);
        const orderProfit = o.cost - orderInvestment;
        const partsListHtml = o.parts && o.parts.length > 0
          ? `<div style="font-size:9px;color:#71717a;margin-top:2px;border-top:1px dashed #e4e4e7;padding-top:2px;">` + 
            o.parts.map(p => `• ${p.name} (C: ${sym}${p.cost || 0} | V: ${sym}${p.price || 0})`).join('<br/>') + 
            `</div>`
          : '';
        return `<tr>
          <td>${o.id}</td>
          <td>${o.customerName}</td>
          <td>${o.deviceBrand} ${o.deviceModel}</td>
          <td>
            <div style="font-weight:600;">${o.serviceType}</div>
            ${partsListHtml}
          </td>
          <td>${pm}</td>
          <td>${new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
          <td style="text-align:right">${sym}${orderInvestment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right">${sym}${orderProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total cobrado</label><span>${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Total Inversión</label><span>${sym}${totalInvestment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Ganancia Neta</label><span>${sym}${totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Total Efectivo</label><span>${sym}${cash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Total Tarjeta/Trans</label><span>${sym}${card.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Órdenes</label><span>${rows.length}</span></div>`;
    } else if (category === 'entradas-manuales' || category === 'salidas-manuales') {
      const rows = filteredData as Expense[];
      const total = rows.reduce((s, x) => s + x.amount, 0);
      thead = `<thead><tr><th>ID</th><th>Concepto</th><th>Categoría</th><th>Fecha</th><th style="text-align:right">Monto</th></tr></thead>`;
      tbody = `<tbody>${rows.map(e => `<tr><td>${e.id}</td><td>${e.description}</td><td>${e.category || '—'}</td><td>${new Date(e.createdAt).toLocaleString('es-MX')}</td><td>${sym}${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total</label><span>${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Movimientos</label><span>${rows.length}</span></div>`;
    } else if (category === 'cortes') {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>ID</th><th>Fecha</th><th>Técnico</th><th>Estimado</th><th>Contado</th><th style="text-align:right">Diferencia</th></tr></thead>`;
      tbody = `<tbody>${rows.map(c => `<tr><td>${c.id}</td><td>${new Date(c.createdAt || '').toLocaleString('es-MX')}</td><td>${c.technicianName || '—'}</td><td>${sym}${(c.estimado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${(c.fisico ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${c.diferencia >= 0 ? '+' : ''}${sym}${(c.diferencia ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Cortes</label><span>${rows.length}</span></div>`;
    } else if (category === 'historial-precios') {
      const rows = filteredData as ServicePrice[];
      thead = `<thead><tr><th>ID</th><th>Servicio</th><th>Categoría</th><th>Duración</th><th style="text-align:right">Precio</th></tr></thead>`;
      tbody = `<tbody>${rows.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.category}</td><td>${s.durationMinutes} min</td><td>${sym}${s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Servicios</label><span>${rows.length}</span></div>`;
    } else if (category === 'rebastos') {
      const rows = filteredData as any[];
      const totalInv = rows.reduce((s: number, l: any) => s + Number(l.totalCost), 0);
      const totalPz  = rows.reduce((s: number, l: any) => s + (l.items as any[]).reduce((a: number, b: any) => a + b.addedQty, 0), 0);
      thead = `<thead><tr><th>ID</th><th>Proveedor</th><th>Fecha</th><th>Artículos</th><th>Piezas</th><th>Nota</th><th style="text-align:right">Inversión</th></tr></thead>`;
      tbody = `<tbody>${rows.map((l: any) => `<tr><td>${l.id}</td><td>${l.provider}</td><td>${new Date(l.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${l.itemsCount}</td><td>${(l.items as any[]).reduce((a: number, b: any) => a + b.addedQty, 0)} pz</td><td>${l.note || '—'}</td><td style="text-align:right">${sym}${Number(l.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Rebastos</label><span>${rows.length}</span></div><div class="si"><label>Piezas totales</label><span>${totalPz} pz</span></div><div class="si"><label>Inversión total</label><span>${sym}${totalInv.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
    } else if (category === 'apartados') {
      const rows = filteredData as ApartadoEntry[];
      const totalVal = rows.reduce((s, a) => s + a.totalValue, 0);
      const totalPaid = rows.reduce((s, a) => s + a.payments.reduce((sp, p) => sp + p.amount, 0), 0);
      const totalRem = rows.reduce((s, a) => s + Math.max(0, a.totalValue - a.payments.reduce((sp, p) => sp + p.amount, 0)), 0);
      thead = `<thead><tr><th>Cliente</th><th>Teléfono</th><th>Artículos</th><th>Estado</th><th style="text-align:right">Total</th><th style="text-align:right">Abonado</th><th style="text-align:right">Saldo</th><th>Alta</th><th>Vence</th></tr></thead>`;
      tbody = `<tbody>${rows.map(a => {
        const paid = a.payments.reduce((s, p) => s + p.amount, 0);
        const rem  = Math.max(0, a.totalValue - paid);
        const items = a.items.map(it => `${it.name} x${it.quantity}`).join(', ');
        return `<tr><td>${a.clientName}</td><td>${a.clientPhone || '—'}</td><td>${items || '—'}</td><td>${a.status}</td><td>${sym}${a.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${paid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${rem.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${new Date(a.createdAt).toLocaleDateString('es-MX')}</td><td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString('es-MX') : '—'}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total apartados</label><span>${sym}${totalVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Recibido</label><span>${sym}${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Pendiente</label><span>${sym}${totalRem.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Registros</label><span>${rows.length}</span></div>`;
    } else if (category === 'stock-critico-tienda') {
      const rows = filteredData as InventoryItem[];
      const totalCost = rows.reduce((s, x) => s + (x.stock * x.cost), 0);
      thead = `<thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Marca</th><th>Mínimo</th><th>Existencia</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio</th></tr></thead>`;
      tbody = `<tbody>${rows.map(x => `<tr><td>${x.code || '—'}</td><td>${x.name}</td><td>${x.category || 'Accesorios'}</td><td>${x.brand || '—'}</td><td>${x.minStock}</td><td style="color:#d9534f;font-weight:bold">${x.stock}</td><td>${sym}${x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Inversión Crítica</label><span>${sym}${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Artículos en Alerta</label><span>${rows.length}</span></div>`;
    } else if (category === 'refacciones-criticas') {
      const rows = filteredData as RefaccionItem[];
      const totalCost = rows.reduce((s, x) => s + (x.stock * x.cost), 0);
      thead = `<thead><tr><th>Código</th><th>Refacción</th><th>Celular Compatible</th><th>Marca Ref</th><th>Mínimo</th><th>Existencia</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio Rep.</th></tr></thead>`;
      tbody = `<tbody>${rows.map(x => `<tr><td>${x.code || '—'}</td><td>${x.name}</td><td>${x.deviceBrand} ${x.deviceModel}</td><td>${x.brand || 'GENERICO'}</td><td>${x.minStock}</td><td style="color:#d9534f;font-weight:bold">${x.stock}</td><td>${sym}${x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Inversión Crítica</label><span>${sym}${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Refacciones en Alerta</label><span>${rows.length}</span></div>`;
    } else {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>Marca</th><th>Modelo</th><th>Código de Modelo</th><th>Tipo</th><th>Origen</th></tr></thead>`;
      tbody = `<tbody>${rows.map(d => `<tr><td>${d.brand}</td><td>${d.model}</td><td>${d.modelCode}</td><td>${d.type}</td><td>${d.source}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Equipos</label><span>${rows.length}</span></div>`;
    }

    const reportTitles: Record<ReportCategory, string> = {
      'ventas-pos':          'Historial de Ventas POS',
      'ventas-ordenes':      'Historial de Ventas por Órdenes',
      'entradas-manuales':   'Historial de Entradas Manuales',
      'salidas-manuales':    'Historial de Salidas Manuales',
      'cortes':              'Historial de Cortes de Caja',
      'historial-precios':   'Historial de Precios de Servicios',
      'historial-equipos':   'Historial de Equipos',
      'rebastos':            'Historial de Rebastos',
      'piezas-pendientes':   'Piezas Pendientes de Pago',
      'top-productos':       'Top Productos más Vendidos',
      'top-cotizaciones':    'Top Cotizaciones — Servicios más Solicitados',
      'fiados':              'Reporte de Fiados',
      'apartados':           'Reporte de Apartados',
      'productos-consultados': 'Productos Consultados en Verificador de Precios',
      'stock-critico-tienda':  'Reporte de Inventario Crítico (Tienda)',
      'refacciones-criticas':  'Reporte de Refacciones Críticas (Taller)',
    };
    const isLiveInventory = category === 'stock-critico-tienda' || category === 'refacciones-criticas';
    const reportSubtitle = isLiveInventory 
      ? `${filteredData.length} registro(s) crítico(s) en total (Al corte)`
      : `${filteredData.length} registro(s) · ${dateFrom || 'inicio'} → ${dateTo || 'hoy'}`;
    return buildA4Html(reportTitles[category], reportSubtitle, config.storeName || 'TALLER', thead, tbody, summaryHtml);
  };

  // ─── Abrir preview antes de imprimir ───────────────────────────────────
  const handlePrint = () => {
    if (filteredData.length === 0) return;
    const html = buildReportHtml();
    setPrintPreview({ html, open: true });
  };

  const confirmPrint = () => {
    if (!printPreview) return;
    if (!config.reportPrinterName?.trim()) {
      showUiToast('⚠️ No hay una impresora A4 configurada. Define una impresora A4 en Ajustes > Impresoras antes de imprimir.', 'error');
      return;
    }

    const html = printPreview.html;
    setPrintPreview(null);
    printReport(html, config.reportPrinterName);
  };

  const activeCat = CATEGORIES.find(c => c.id === category) || CATEGORIES.find(c => c.id === 'entradas-manuales')!;

  if (currentUser && !currentUser.permissions.canViewReports) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500 p-8">
        <span className="text-5xl">🔒</span>
        <p className="text-lg font-bold">Sin acceso</p>
        <p className="text-sm text-center">Tu usuario no tiene permiso para ver reportes.</p>
      </div>
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 flex flex-col select-none ${isRetro ? 'bg-[#eaeef3] text-black font-sans' : isLight ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0c0c0e] text-zinc-200'}`} style={{ minHeight: 0 }}>

      {/* ── CATEGORÍAS SUPERIORES ── */}
      <div className={`shrink-0 flex items-center gap-1.5 px-4 pt-3 pb-2 flex-wrap border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        {filteredCategories.map(cat => {
          const Icon = cat.icon;
          const isActive = cat.id === category;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setCategory(cat.id); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wide rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? isRetro ? 'bg-[#000080] text-white border-[#000080]' : `border ${cat.color} font-black`
                  : isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-zinc-700 hover:bg-zinc-200' : isLight ? 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── CUERPO: filtros izquierda + tabla derecha ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* PANEL DE FILTROS */}
        <aside className={`w-56 shrink-0 flex flex-col gap-4 p-4 border-r overflow-y-auto ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-white border-zinc-200' : 'bg-[#0e0f13] border-zinc-800'}`}>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Filtros
            </p>

            {/* Rango de fechas */}
            {category !== 'historial-precios' && category !== 'historial-equipos' && category !== 'stock-critico-tienda' && category !== 'refacciones-criticas' && (
              <>
                <div className="mb-2">
                  <label className={labelCls}>Desde</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>Hasta</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
                </div>
              </>
            )}

            {/* Método de pago — Ventas POS y Ventas Órdenes */}
            {(category === 'ventas-pos' || category === 'ventas-ordenes') && (
              <div className="mb-3">
                <label className={labelCls}>Método de Pago</label>
                <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className={selectCls}>
                  {['Todos', 'Efectivo', 'Tarjeta/Transfer', 'Múltiple'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}

            {(category === 'stock-critico-tienda' || category === 'refacciones-criticas') && (
              <div className="mb-4">
                <label className="flex items-center gap-2 text-[10.5px] font-bold select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={e => setShowHidden(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 border-zinc-300 dark:border-zinc-700 w-3.5 h-3.5"
                  />
                  <span className={isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-700' : 'text-zinc-300'}>
                    Incluir ocultos
                  </span>
                </label>
              </div>
            )}

            {/* Limpiar */}
            <button
              onClick={() => { setDateFrom(today); setDateTo(today); setPayFilter('Todos'); setStatusFilter('Todos'); setShowHidden(false); }}
              className={`w-full py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer transition-all ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-zinc-700' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg'}`}
            >
              ✕ Limpiar filtros
            </button>
          </div>

          {/* Resumen */}
          {(summary.total !== null || summary.count > 0) && (
            <div className={`p-3 rounded-xl border space-y-2 ${isRetro ? 'bg-white border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Resumen</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div>
                  <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Registros</p>
                  <p className={`text-lg font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{summary.count}</p>
                </div>
                {summary.total !== null && (
                  <div>
                    <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Total</p>
                    <p className={`text-lg font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{summary.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {(summary as any).extra !== undefined && category !== 'fiados' && category !== 'productos-consultados' && category !== 'ventas-ordenes' && category !== 'apartados' && (
                  <div>
                    <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Piezas</p>
                    <p className={`text-lg font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{(summary as any).extra} pz</p>
                  </div>
                )}
                {category === 'ventas-ordenes' && (summary as any).extra !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-emerald-500">Total Efectivo</p>
                    <p className="text-sm font-black font-mono text-emerald-500">{sym}{(summary as any).extra.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {category === 'ventas-ordenes' && (summary as any).extra2 !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-purple-500">Total Tarjeta/Trans</p>
                    <p className="text-sm font-black font-mono text-purple-500">{sym}{(summary as any).extra2.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {category === 'ventas-ordenes' && (summary as any).extra3 !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-amber-500">Total Inversión</p>
                    <p className="text-sm font-black font-mono text-amber-500">{sym}{(summary as any).extra3.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {category === 'ventas-ordenes' && (summary as any).extra4 !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-sky-500">Ganancia Neta</p>
                    <p className="text-sm font-black font-mono text-sky-500">{sym}{(summary as any).extra4.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {category === 'productos-consultados' && (summary as any).extra !== undefined && (
                  <>
                    <div>
                      <p className="text-[9px] font-black" style={{ color: '#059669' }}>Al carrito</p>
                      <p className="text-lg font-black font-mono" style={{ color: '#059669' }}>{(summary as any).extra}</p>
                    </div>
                    <div>
                      <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Conversión</p>
                      <p className={`text-lg font-black font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{(summary as any).extra2}%</p>
                    </div>
                  </>
                )}
                {category === 'fiados' && (summary as any).extra !== undefined && (
                  <div>
                    <p className="text-[9px] font-black" style={{ color: '#f43f5e' }}>Con saldo</p>
                    <p className="text-lg font-black font-mono" style={{ color: '#f43f5e' }}>{(summary as any).extra}</p>
                  </div>
                )}
                {category === 'fiados' && (summary as any).extra2 !== undefined && (
                  <div>
                    <p className="text-[9px] font-black" style={{ color: '#059669' }}>Saldados</p>
                    <p className="text-lg font-black font-mono" style={{ color: '#059669' }}>{(summary as any).extra2}</p>
                  </div>
                )}
                {category === 'apartados' && (summary as any).extra !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-emerald-500">Recibido / Abonado</p>
                    <p className="text-lg font-black font-mono text-emerald-500">{sym}{(summary as any).extra.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                {category === 'apartados' && (summary as any).extra2 !== undefined && (
                  <div>
                    <p className="text-[9px] font-black text-rose-500">Pendiente de cobro</p>
                    <p className="text-lg font-black font-mono text-rose-500">{sym}{(summary as any).extra2.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECCIÓN DE IMPRESIÓN ── */}
          <div className={`mt-auto pt-3 border-t space-y-2 ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
              🖨️ Imprimir Reporte
            </p>
            <p className={`text-[9px] leading-relaxed ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Se imprimirá el reporte actual con los filtros aplicados en la impresora A4 configurada.
            </p>
            {config.reportPrinterName ? (
              <p className={`text-[9px] font-bold truncate ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                📠 {config.reportPrinterName}
              </p>
            ) : (
              <p className={`text-[9px] ${isRetro ? 'text-amber-700' : isLight ? 'text-amber-600' : 'text-amber-500'}`}>
                ⚠️ Sin impresora A4 configurada
              </p>
            )}
            <button
              onClick={handlePrint}
              disabled={filteredData.length === 0}
              className={`w-full py-2.5 text-[10.5px] font-black uppercase flex items-center justify-center gap-2 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRetro
                  ? 'bg-[#000080] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]'
                  : isLight
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl'
                    : 'bg-violet-700 hover:bg-violet-600 border border-violet-500/60 text-white rounded-xl'
              }`}
            >
              <Printer className="w-4 h-4" />
              Imprimir A4
            </button>
          </div>
        </aside>

        {/* ÁREA DE TABLA */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header de tabla */}
          <div className={`shrink-0 flex items-center gap-2 px-5 py-3 border-b ${isRetro ? 'border-zinc-400 bg-[#eaeef3]' : isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-[#0e0f13]'}`}>
            <activeCat.icon className={`w-4 h-4 ${activeCat.color.split(' ')[0]}`} />
            <span className={`text-xs font-black uppercase tracking-wide ${isRetro ? 'text-zinc-800' : isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>
              {activeCat.label}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isRetro ? 'bg-zinc-300 text-zinc-600' : isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}>
              {filteredData.length} reg.
            </span>
          </div>

          {/* Tabla scrolleable */}
          <div className="flex-1 overflow-auto">
            {renderTable()}
          </div>
        </main>
      </div>

      {/* ── MODAL DETALLE / EDICIÓN DE ORDEN (inline, no portal) ── */}
      {orderModal && orderEdit && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={closeOrderModal}
        >
          <div
            style={{ width: '100%', maxWidth: '520px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            className={isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' : isLight ? 'bg-white border border-zinc-200' : 'bg-[#121316] border border-zinc-700'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`modal-dark-header flex items-center justify-between px-5 py-3 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Wrench className={`w-4 h-4 ${isRetro ? 'text-white' : isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                <span className={`text-sm font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>Orden {orderModal.id}</span>
                {!canEditOrders && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isRetro ? 'bg-zinc-300 text-zinc-600' : 'bg-zinc-700 text-zinc-400'}`}>Solo lectura</span>}
              </div>
              <button type="button" onClick={closeOrderModal} className={`p-1 rounded cursor-pointer ${isRetro ? 'hover:bg-white/20 text-white' : isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-700 text-zinc-400'}`}><X className="w-4 h-4" /></button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>
              {(() => {
                const lbl = `text-[9px] font-black uppercase tracking-wide block mb-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-zinc-500'}`;
                const inp = `w-full text-xs px-2.5 py-1.5 rounded focus:outline-none font-medium ${isRetro ? 'bg-white border border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-sky-400' : 'bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-sky-500'}`;
                const ro = !canEditOrders;
                const set = (field: keyof RepairOrder, val: any) => setOrderEdit(prev => prev ? { ...prev, [field]: val } : prev);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Cliente</label><input readOnly={ro} className={inp} value={orderEdit.customerName} onChange={e => set('customerName', e.target.value)} /></div>
                      <div><label className={lbl}>Teléfono</label><input readOnly={ro} className={inp} value={orderEdit.customerPhone} onChange={e => set('customerPhone', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Marca</label><input readOnly={ro} className={inp} value={orderEdit.deviceBrand} onChange={e => set('deviceBrand', e.target.value)} /></div>
                      <div><label className={lbl}>Modelo</label><input readOnly={ro} className={inp} value={orderEdit.deviceModel} onChange={e => set('deviceModel', e.target.value)} /></div>
                    </div>
                    <div><label className={lbl}>Servicio</label><input readOnly={ro} className={inp} value={orderEdit.serviceType} onChange={e => set('serviceType', e.target.value)} /></div>
                    <div><label className={lbl}>Falla reportada</label><textarea readOnly={ro} className={`${inp} resize-none h-16`} value={orderEdit.faultDescription} onChange={e => set('faultDescription', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Estado</label>
                        <select disabled={ro} className={inp} value={orderEdit.status} onChange={e => set('status', e.target.value as RepairOrder['status'])}>
                          {['Pendiente','Diagnóstico','En Reparación','Listo','Entregado','Entregado y Pagado','Fallido','Cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><label className={lbl}>Técnico</label><input readOnly={ro} className={inp} value={orderEdit.assignedTechnician} onChange={e => set('assignedTechnician', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className={lbl}>Costo Venta ({sym})</label><input readOnly={ro} type="number" className={inp} value={orderEdit.cost} onChange={e => set('cost', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} /></div>
                      <div><label className={lbl}>Costo Compra ({sym})</label><input readOnly={ro} type="number" className={inp} value={orderEdit.serviceCost || 0} onChange={e => set('serviceCost', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} /></div>
                      <div><label className={lbl}>Anticipo ({sym})</label><input readOnly={ro} type="number" className={inp} value={orderEdit.advancePayment} onChange={e => set('advancePayment', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} /></div>
                    </div>
                    <div><label className={lbl}>Entrega estimada</label><input readOnly={ro} type="date" className={inp} value={orderEdit.estimatedDeliveryDate?.slice(0,10) || ''} onChange={e => set('estimatedDeliveryDate', e.target.value)} /></div>
                    <div><label className={lbl}>Nota de diagnóstico</label><textarea readOnly={ro} className={`${inp} resize-none h-16`} value={orderEdit.diagnosticsNote || ''} onChange={e => set('diagnosticsNote', e.target.value)} /></div>
                    <div className="mt-2">
                       <label className="flex items-center gap-2 cursor-pointer select-none">
                         <input disabled={ro} type="checkbox" checked={!!orderEdit.showNotesOnLabel} onChange={e => set('showNotesOnLabel', e.target.checked)}
                           className="w-4 h-4 rounded cursor-pointer accent-amber-500" />
                         <span className="text-[10px] font-bold text-zinc-500 uppercase">Imprimir notas internas en etiqueta de servicio</span>
                       </label>
                     </div>
                  </>
                );
              })()}
            </div>
            {/* Footer */}
            <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isRetro ? 'border-zinc-400 bg-[#c8ccd4]' : isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/60'}`}>
              <button type="button" onClick={closeOrderModal} className={`px-4 py-1.5 text-xs font-bold rounded cursor-pointer ${isRetro ? 'bg-zinc-300 border border-zinc-400 text-zinc-800' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Cerrar</button>
              {canEditOrders && onUpdateOrder && (
                <button type="button" onClick={saveOrderEdit} className={`px-4 py-1.5 text-xs font-black rounded cursor-pointer ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>Guardar cambios</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW DE IMPRESIÓN ── */}
      {printPreview?.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          {/* Fondo cristal esmerilado — desenfoca toda la app detrás */}
          <div
            className={`absolute inset-0 ${
              isRetro
                ? 'bg-[#3a5a8a]/35 backdrop-blur-xl'
                : isLight
                  ? 'bg-slate-400/25 backdrop-blur-xl'
                  : 'bg-[#0c0c0e]/50 backdrop-blur-xl'
            }`}
            onClick={() => setPrintPreview(null)}
          />

          {/* Tarjeta modal — también con efecto cristal */}
          <div
            className={`relative z-10 flex flex-col rounded-2xl shadow-2xl w-[820px] max-h-[88vh] overflow-hidden border ${
              isRetro
                ? 'bg-[#dfe3e8]/95 border-white/70 backdrop-blur-2xl'
                : isLight
                  ? 'bg-white/80 border-white/60 backdrop-blur-2xl shadow-zinc-200/60'
                  : 'bg-zinc-900/70 border-white/10 backdrop-blur-2xl'
            }`}
            style={{ boxShadow: isRetro
              ? '0 8px 40px 0 rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.9)'
              : isLight
                ? '0 8px 48px 0 rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8)'
                : '0 8px 48px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
            }}
          >
            {/* Header modal */}
            <div className={`shrink-0 flex items-center justify-between px-5 py-3.5 border-b ${
              isRetro
                ? 'bg-[#000080] border-white/20'
                : isLight
                  ? 'bg-white/60 border-zinc-200/70 backdrop-blur-sm'
                  : 'bg-zinc-800/60 border-white/10 backdrop-blur-sm'
            }`}>
              <div className="flex items-center gap-2">
                <Printer className={`w-4 h-4 ${isRetro ? 'text-white' : isLight ? 'text-zinc-700' : 'text-violet-400'}`} />
                <span className={`text-xs font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>
                  Vista previa de impresión
                </span>
              </div>
              <button
                onClick={() => setPrintPreview(null)}
                className={`p-1 rounded-lg cursor-pointer transition-colors ${isRetro ? 'text-white hover:bg-white/20' : isLight ? 'text-zinc-500 hover:bg-zinc-200/70' : 'text-zinc-400 hover:bg-white/10'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso */}
            <div className={`shrink-0 flex items-start gap-2 px-5 py-2.5 border-b text-[10.5px] ${
              isRetro
                ? 'bg-yellow-50/80 border-yellow-300/60 text-yellow-800'
                : isLight
                  ? 'bg-amber-50/70 border-amber-200/60 text-amber-700'
                  : 'bg-amber-900/20 border-amber-600/20 text-amber-400'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Revisa el reporte antes de autorizar la impresión. Una vez confirmado se enviará a la impresora.</span>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 overflow-hidden p-4">
              <iframe
                srcDoc={printPreview.html}
                className="w-full h-full rounded-xl border border-zinc-300/60 bg-white shadow-inner"
                title="Preview reporte"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Acciones */}
            <div className={`shrink-0 flex items-center justify-end gap-3 px-5 py-3.5 border-t ${
              isRetro
                ? 'border-white/50 bg-[#e0e4e8]/80'
                : isLight
                  ? 'border-zinc-200/50 bg-white/50 backdrop-blur-sm'
                  : 'border-white/10 bg-zinc-900/50 backdrop-blur-sm'
            }`}>
              <button
                onClick={() => setPrintPreview(null)}
                className={`px-4 py-2 text-[10.5px] font-bold uppercase rounded-xl cursor-pointer transition-all ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 text-zinc-700'
                    : isLight
                      ? 'bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-600 border border-zinc-200/60'
                      : 'bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-white/10'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPrint}
                className={`px-5 py-2 text-[10.5px] font-black uppercase flex items-center gap-2 rounded-xl cursor-pointer transition-all active:scale-95 ${
                  isRetro
                    ? 'bg-[#000080] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]'
                    : isLight
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      : 'bg-violet-700 hover:bg-violet-600 border border-violet-500/60 text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Confirmar e imprimir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
