import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Wrench, 
  Package, 
  Calendar, 
  ChevronRight, 
  Search, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  User,
  CheckCircle,
  FileText,
  PieChart,
  BarChart2,
  ShoppingCart,
  ArrowDownLeft,
  Scissors,
  Tags,
  Smartphone,
  Truck,
  CreditCard,
  Bookmark,
  Printer,
  Share2
} from 'lucide-react';
import { 
  Sale, 
  RepairOrder, 
  Expense, 
  WorkshopConfig, 
  AppUser, 
  ServicePrice, 
  CreditAccount, 
  ApartadoEntry, 
  InventoryItem, 
  RefaccionItem 
} from '../../types';

interface MobileReportesViewProps {
  sales: Sale[];
  orders: RepairOrder[];
  expenses: Expense[];
  cortesHistorial: any[];
  services: ServicePrice[];
  config: WorkshopConfig;
  currentUser: AppUser | null | undefined;
  quotes?: any[];
  creditAccounts?: CreditAccount[];
  apartados?: ApartadoEntry[];
  inventory: InventoryItem[];
  refacciones: RefaccionItem[];
  onClose: () => void;
  onUpdateOrder?: (order: RepairOrder) => void | Promise<void>;
  printMobileHtml?: (html: string, isLabel?: boolean) => void;
}

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

const CATEGORIES: { id: ReportCategory; label: string; icon: React.ComponentType<any>; color: string; desc: string }[] = [
  { id: 'ventas-pos',        label: 'Ventas POS',          icon: ShoppingCart,   color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', desc: 'Historial de ventas de mostrador' },
  { id: 'ventas-ordenes',    label: 'Ventas Órdenes',      icon: Wrench,         color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', desc: 'Ingresos por reparaciones' },
  { id: 'entradas-manuales', label: 'Entradas Caja',       icon: ArrowUpRight,   color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', desc: 'Inyecciones manuales a caja' },
  { id: 'salidas-manuales',  label: 'Salidas Caja',        icon: ArrowDownLeft,  color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', desc: 'Gastos manuales y egresos' },
  { id: 'cortes',            label: 'Cortes',              icon: Scissors,       color: 'text-pink-500 bg-pink-500/10 border-pink-500/20', desc: 'Historial de cortes de caja' },
  { id: 'historial-precios', label: 'Lista Precios',       icon: Tags,           color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', desc: 'Catálogo de servicios homologados' },
  { id: 'historial-equipos', label: 'Historial Equipos',   icon: Smartphone,     color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', desc: 'Marcas y modelos homologados' },
  { id: 'rebastos',          label: 'Reabastos',           icon: Truck,          color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', desc: 'Inversiones en almacén y compras' },
  { id: 'piezas-pendientes', label: 'Piezas Pendientes',   icon: Package,        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', desc: 'Piezas encargadas por cobrar' },
  { id: 'top-productos',     label: 'Top Productos',       icon: TrendingUp,     color: 'text-violet-500 bg-violet-500/10 border-violet-500/20', desc: 'Productos más demandados' },
  { id: 'top-cotizaciones',  label: 'Top Cotizaciones',    icon: BarChart2,      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', desc: 'Servicios cotizados y conversión' },
  { id: 'fiados',            label: 'Fiados',              icon: CreditCard,     color: 'text-red-500 bg-red-500/10 border-red-500/20', desc: 'Cuentas de crédito activas' },
  { id: 'apartados',         label: 'Apartados',           icon: Bookmark,       color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', desc: 'Control de apartados' },
  { id: 'productos-consultados', label: 'Consultados',     icon: Search,         color: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20', desc: 'Verificaciones de precios de clientes' },
  { id: 'stock-critico-tienda', label: 'Crítico Tienda',   icon: AlertTriangle,  color: 'text-amber-600 bg-amber-600/10 border-amber-600/20', desc: 'Accesorios con existencias bajas' },
  { id: 'refacciones-criticas', label: 'Crítico Taller',   icon: Wrench,         color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', desc: 'Refacciones con existencias bajas' },
];

type DateFilterType = 'hoy' | 'ayer' | '7dias' | 'esteMes' | 'mesAnterior' | 'historico';

// Generador de HTML de reporte A4
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
  .hdr-l h1{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;color:#111}
  .hdr-l .store-name{font-size:10px;color:#555;margin-top:5px;font-weight:600}
  .hdr-r{text-align:right;font-size:9px;color:#777;padding-top:4px}
  .hdr-r strong{display:block;font-size:11px;color:#111;font-weight:800;margin-bottom:2px}
  .sub{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-left:4px solid #111;padding-left:8px;margin-bottom:12px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead tr{background:#111;color:#fff}
  thead th{padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
  thead th:last-child{text-align:right}
  tbody tr:nth-child(even){background:#f5f5f5}
  tbody td{padding:6px 8px;border-bottom:1px solid #e0e0e0;vertical-align:top}
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
  <div class="hdr-r"><strong>${now}</strong>Generado desde Dispositivo Móvil</div>
</div>
<div class="sub">${subtitle}</div>
<table>${thead}${tbody}</table>
<div class="summary">${summary}</div>
<div class="footer">${store} — FixManager — ${now}</div>
</body></html>`;
}

// Convertidor base64 a File
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export default function MobileReportesView({
  sales = [],
  orders = [],
  expenses = [],
  cortesHistorial = [],
  services = [],
  config,
  currentUser,
  quotes = [],
  creditAccounts = [],
  apartados = [],
  inventory = [],
  refacciones = [],
  onClose,
  printMobileHtml
}: MobileReportesViewProps) {
  const isLight = config?.themeMode === 'light';
  const currencySymbol = config?.currencySymbol || '$';

  const [activeCategory, setActiveCategory] = useState<ReportCategory>(() => {
    if (config?.enablePOS === false) return 'ventas-ordenes';
    return 'ventas-pos';
  });

  const [dateFilter, setDateFilter] = useState<DateFilterType>('esteMes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  // Estado para la barra de progreso discreta
  const [processingState, setProcessingState] = useState<{
    active: boolean;
    type: 'print' | 'share' | null;
    progress: number;
    message: string;
  }>({
    active: false,
    type: null,
    progress: 0,
    message: ''
  });

  // Filtrar categorías disponibles según la configuración de la tienda
  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter(cat => {
      if (config?.enablePOS === false) {
        if (['ventas-pos', 'rebastos', 'top-productos', 'fiados', 'apartados', 'productos-consultados', 'stock-critico-tienda'].includes(cat.id)) {
          return false;
        }
      }
      if (config?.enableTaller === false) {
        if (['ventas-ordenes', 'historial-precios', 'historial-equipos', 'piezas-pendientes', 'top-cotizaciones', 'refacciones-criticas'].includes(cat.id)) {
          return false;
        }
      }
      return true;
    });
  }, [config?.enablePOS, config?.enableTaller]);

  // Rango de fechas
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'hoy':
        break;
      case 'ayer':
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        break;
      case '7dias':
        start.setDate(now.getDate() - 7);
        break;
      case 'esteMes':
        start.setDate(1);
        break;
      case 'mesAnterior':
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        end.setMonth(now.getMonth());
        end.setDate(0);
        break;
      case 'historico':
        start.setFullYear(2000, 0, 1);
        end.setFullYear(2100, 11, 31);
        break;
    }
    return { start, end };
  }, [dateFilter]);

  // Helper para verificar rango de fechas
  const inRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= dateRange.start && d <= dateRange.end;
  };

  // Helper de métodos de pago de órdenes
  const getOrderPaymentMethod = (o: RepairOrder): string => {
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

  // ─── Logs de localStorage ───────────────────────────────────
  const rebastoLogs: any[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_replenishment_logs') || '[]'); } catch { return []; }
  }, [activeCategory]);

  const priceCheckLogs: any[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('fixmanager_price_checks') || '[]'); } catch { return []; }
  }, [activeCategory]);

  // ─── Filtrado de datos por categoría ─────────────────────────
  const filteredData = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    if (activeCategory === 'ventas-pos') {
      return sales
        .filter(s => !s.isCancelled)
        .filter(s => inRange(s.createdAt))
        .filter(s => {
          if (!query) return true;
          const itemsText = (s.items || []).map(i => i.name).join(' ').toLowerCase();
          return s.id.toLowerCase().includes(query) || 
                 (s.paymentMethod || '').toLowerCase().includes(query) ||
                 itemsText.includes(query);
        });
    }
    if (activeCategory === 'ventas-ordenes') {
      return orders
        .filter(o => o.status === 'Entregado y Pagado')
        .filter(o => inRange(o.createdAt))
        .filter(o => {
          if (!query) return true;
          return o.id.toLowerCase().includes(query) ||
                 (o.customerName || '').toLowerCase().includes(query) ||
                 (o.deviceBrand || '').toLowerCase().includes(query) ||
                 (o.deviceModel || '').toLowerCase().includes(query) ||
                 (o.serviceType || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'entradas-manuales') {
      return expenses
        .filter(e => e.type === 'entrada' && e.category !== 'Servicio Técnico')
        .filter(e => inRange(e.createdAt || ''))
        .filter(e => {
          if (!query) return true;
          return (e.description || '').toLowerCase().includes(query) ||
                 (e.category || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'salidas-manuales') {
      return expenses
        .filter(e => (e.type === 'salida' || !e.type) && e.category !== 'Devolución de Servicio' && e.category !== 'Devolución de Venta')
        .filter(e => inRange(e.createdAt || ''))
        .filter(e => {
          if (!query) return true;
          return (e.description || '').toLowerCase().includes(query) ||
                 (e.category || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'cortes') {
      return cortesHistorial
        .filter(c => inRange(c.createdAt || c.date || ''))
        .filter(c => {
          if (!query) return true;
          return (c.technicianName || c.usuario || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'historial-precios') {
      return services.filter(s => {
        if (!query) return true;
        return s.name.toLowerCase().includes(query) ||
               (s.category || '').toLowerCase().includes(query);
      });
    }
    if (activeCategory === 'historial-equipos') {
      const seen = new Set<string>();
      const list: { brand: string; model: string; modelCode: string; type: string; source: string }[] = [];
      (config?.customDeviceModels || []).forEach(d => {
        const k = `${d.brand}|${d.model}`;
        if (!seen.has(k)) { 
          seen.add(k); 
          list.push({ brand: d.brand, model: d.model, modelCode: d.modelNumber || '—', type: d.type, source: 'Catálogo' }); 
        }
      });
      orders.filter(o => o.deviceBrand && o.deviceModel).forEach(o => {
        const k = `${o.deviceBrand}|${o.deviceModel}`;
        if (!seen.has(k)) { 
          seen.add(k); 
          list.push({ brand: o.deviceBrand, model: o.deviceModel, modelCode: o.deviceModelNumber || '—', type: o.deviceType || 'Celular', source: 'Historial' }); 
        }
      });
      return list.filter(item => {
        if (!query) return true;
        return item.brand.toLowerCase().includes(query) ||
               item.model.toLowerCase().includes(query) ||
               item.modelCode.toLowerCase().includes(query);
      });
    }
    if (activeCategory === 'rebastos') {
      return rebastoLogs
        .filter(l => {
          const d = new Date(l.date);
          return d >= dateRange.start && d <= dateRange.end;
        })
        .filter(l => {
          if (!query) return true;
          return (l.provider || '').toLowerCase().includes(query) ||
                 (l.note || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'piezas-pendientes') {
      return orders
        .filter(o => o.parts && o.parts.some(p => !p.paidAt))
        .filter(o => {
          if (!query) return true;
          return o.id.toLowerCase().includes(query) ||
                 (o.customerName || '').toLowerCase().includes(query) ||
                 (o.parts || []).some(p => p.name.toLowerCase().includes(query));
        });
    }
    if (activeCategory === 'fiados') {
      return creditAccounts
        .filter(a => !a.deletedAt)
        .filter(a => {
          return (!dateFilter || dateFilter === 'historico' || inRange(a.createdAt));
        })
        .filter(a => {
          if (!query) return true;
          return a.clientName.toLowerCase().includes(query) ||
                 (a.clientPhone || '').includes(query);
        });
    }
    if (activeCategory === 'apartados') {
      return apartados
        .filter(a => {
          return (!dateFilter || dateFilter === 'historico' || inRange(a.createdAt));
        })
        .filter(a => {
          if (!query) return true;
          const itemsText = (a.items || []).map(i => i.name).join(' ').toLowerCase();
          return a.clientName.toLowerCase().includes(query) ||
                 (a.clientPhone || '').includes(query) ||
                 itemsText.includes(query);
        });
    }
    if (activeCategory === 'stock-critico-tienda') {
      return inventory
        .filter(item => {
          if (!showHidden && item.active === false) return false;
          return item.manageStock !== false && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0);
        })
        .filter(item => {
          if (!query) return true;
          return item.name.toLowerCase().includes(query) ||
                 (item.code || '').toLowerCase().includes(query) ||
                 (item.brand || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'refacciones-criticas') {
      return refacciones
        .filter(item => {
          if (!showHidden && item.active === false) return false;
          return item.manageStock !== false && ((item.minStock > 0 && item.stock <= item.minStock) || item.stock === 0);
        })
        .filter(item => {
          if (!query) return true;
          return item.name.toLowerCase().includes(query) ||
                 (item.code || '').toLowerCase().includes(query) ||
                 (item.deviceBrand || '').toLowerCase().includes(query) ||
                 (item.deviceModel || '').toLowerCase().includes(query);
        });
    }
    if (activeCategory === 'productos-consultados') {
      return priceCheckLogs
        .filter((e: any) => {
          const d = e.consultedAt ?? '';
          return inRange(d);
        })
        .filter((e: any) => {
          if (!query) return true;
          return (e.name || '').toLowerCase().includes(query) ||
                 (e.code || '').toLowerCase().includes(query);
        });
    }

    return [];
  }, [activeCategory, sales, orders, expenses, cortesHistorial, services, config, dateRange, searchTerm, rebastoLogs, creditAccounts, priceCheckLogs, apartados, inventory, refacciones, showHidden]);

  // ─── Resúmenes / Totales ──────────────────────────────────────
  const summary = useMemo(() => {
    if (activeCategory === 'ventas-pos') {
      const total = (filteredData as Sale[]).reduce((s, x) => {
        const saleRepairsTotal = (x.items || [])
          .filter(item => item.itemId && item.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        return s + Math.max(0, x.total - saleRepairsTotal);
      }, 0);
      return { total, count: filteredData.length };
    }
    if (activeCategory === 'ventas-ordenes') {
      const list = filteredData as RepairOrder[];
      const total = list.reduce((s, x) => s + x.cost, 0);
      let cash = 0;
      let card = 0;
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
      });
      return { total, count: list.length, extra: cash, extra2: card };
    }
    if (activeCategory === 'entradas-manuales' || activeCategory === 'salidas-manuales') {
      const total = (filteredData as Expense[]).reduce((s, x) => s + x.amount, 0);
      return { total, count: filteredData.length };
    }
    if (activeCategory === 'rebastos') {
      const total = (filteredData as any[]).reduce((s, l) => s + Number(l.totalCost), 0);
      const pzas  = (filteredData as any[]).reduce((s, l) => s + (l.items as any[]).reduce((a: number, b: any) => a + b.addedQty, 0), 0);
      return { total, count: filteredData.length, extra: pzas };
    }
    if (activeCategory === 'piezas-pendientes') {
      const total = (filteredData as RepairOrder[]).flatMap(o => (o.parts || []).filter(p => !p.paidAt)).reduce((s, p) => s + p.cost, 0);
      const count = (filteredData as RepairOrder[]).flatMap(o => (o.parts || []).filter(p => !p.paidAt)).length;
      return { total, count };
    }
    if (activeCategory === 'productos-consultados') {
      const logs = filteredData as any[];
      const agregados = logs.filter(e => e.addedToCart).length;
      const tasa = logs.length > 0 ? Math.round((agregados / logs.length) * 100) : 0;
      return { total: null, count: logs.length, extra: agregados, extra2: tasa };
    }
    if (activeCategory === 'fiados') {
      const accs = filteredData as CreditAccount[];
      const getBalance = (a: CreditAccount) => Math.max(0, a.entries.reduce((s, e) => s + e.subtotal, 0) - a.payments.reduce((s, p) => s + p.amount, 0));
      const totalDeuda = accs.reduce((s, a) => s + getBalance(a), 0);
      const activos = accs.filter(a => getBalance(a) > 0).length;
      const saldados = accs.filter(a => getBalance(a) === 0).length;
      return { total: totalDeuda, count: accs.length, extra: activos, extra2: saldados };
    }
    if (activeCategory === 'apartados') {
      const apts = filteredData as ApartadoEntry[];
      const getPaid = (a: ApartadoEntry) => a.payments.reduce((s, p) => s + p.amount, 0);
      const getRemaining = (a: ApartadoEntry) => Math.max(0, a.totalValue - getPaid(a));
      const totalValue = apts.reduce((s, a) => s + a.totalValue, 0);
      const totalReceived = apts.reduce((s, a) => s + getPaid(a), 0);
      const totalRemaining = apts.reduce((s, a) => s + getRemaining(a), 0);
      return { total: totalValue, count: apts.length, extra: totalReceived, extra2: totalRemaining };
    }
    if (activeCategory === 'stock-critico-tienda') {
      const totalCost = (filteredData as InventoryItem[]).reduce((s, x) => s + (x.stock * x.cost), 0);
      return { total: totalCost, count: filteredData.length };
    }
    if (activeCategory === 'refacciones-criticas') {
      const totalCost = (filteredData as RefaccionItem[]).reduce((s, x) => s + (x.stock * x.cost), 0);
      return { total: totalCost, count: filteredData.length };
    }
    return { total: null, count: filteredData.length };
  }, [filteredData, activeCategory, sales]);

  // Formateadores
  const formatMoney = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // ─── Construir HTML del Reporte A4 ─────────────────────────────
  const buildReportHtml = (): string => {
    const cat = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const sym = currencySymbol;
    let thead = '';
    let tbody = '';
    let summaryHtml = '';

    if (activeCategory === 'ventas-pos') {
      const rows = filteredData as Sale[];
      thead = `<thead><tr><th>ID</th><th>Fecha</th><th>Artículos</th><th>Pago</th><th style="text-align:right">Total</th></tr></thead>`;
      tbody = `<tbody>${rows.map(s => {
        const repairsTotal = (s.items || [])
          .filter(i => i.itemId && i.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        const netTotal = Math.max(0, s.total - repairsTotal);
        const nonRepairs = (s.items || []).filter(i => !i.itemId?.startsWith('repair-'));
        return `<tr><td>${s.id}</td><td>${new Date(s.createdAt).toLocaleString('es-MX')}</td><td>${nonRepairs.map(i => `${i.name} x${i.quantity}`).join(', ') || '—'}</td><td>${s.paymentMethod}</td><td>${sym}${netTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total ventas</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Transacciones</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'ventas-ordenes') {
      const rows = filteredData as RepairOrder[];
      thead = `<thead><tr><th>ID</th><th>Cliente</th><th>Equipo</th><th>Servicio</th><th>Método Pago</th><th>Fecha</th><th style="text-align:right">Costo</th></tr></thead>`;
      tbody = `<tbody>${rows.map(o => {
        const pm = getOrderPaymentMethod(o);
        return `<tr><td>${o.id}</td><td>${o.customerName}</td><td>${o.deviceBrand} ${o.deviceModel}</td><td>${o.serviceType}</td><td>${pm}</td><td>${new Date(o.createdAt).toLocaleDateString('es-MX')}</td><td>${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total cobrado</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Total Efectivo</label><span>${sym}${(summary.extra || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Total Tarjeta/Trans</label><span>${sym}${(summary.extra2 || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                     <div class="si"><label>Órdenes</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'entradas-manuales' || activeCategory === 'salidas-manuales') {
      const rows = filteredData as Expense[];
      thead = `<thead><tr><th>ID</th><th>Concepto</th><th>Categoría</th><th>Fecha</th><th style="text-align:right">Monto</th></tr></thead>`;
      tbody = `<tbody>${rows.map(e => `<tr><td>${e.id}</td><td>${e.description || '—'}</td><td>${e.category || '—'}</td><td>${new Date(e.createdAt || '').toLocaleString('es-MX')}</td><td>${sym}${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Movimientos</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'cortes') {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>ID</th><th>Fecha</th><th>Técnico</th><th>Estimado</th><th>Contado</th><th style="text-align:right">Diferencia</th></tr></thead>`;
      tbody = `<tbody>${rows.map(c => `<tr><td>${c.id}</td><td>${new Date(c.createdAt || c.date || '').toLocaleString('es-MX')}</td><td>${c.technicianName || c.usuario || '—'}</td><td>${sym}${(c.estimado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${(c.fisico ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${c.diferencia >= 0 ? '+' : ''}${sym}${(c.diferencia ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Cortes</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'historial-precios') {
      const rows = filteredData as ServicePrice[];
      thead = `<thead><tr><th>ID</th><th>Servicio</th><th>Categoría</th><th>Duración</th><th style="text-align:right">Precio</th></tr></thead>`;
      tbody = `<tbody>${rows.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.category}</td><td>${s.durationMinutes} min</td><td>${sym}${s.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Servicios</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'historial-equipos') {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>Marca</th><th>Modelo</th><th>Código de Modelo</th><th>Tipo</th><th>Origen</th></tr></thead>`;
      tbody = `<tbody>${rows.map(d => `<tr><td>${d.brand}</td><td>${d.model}</td><td>${d.modelCode}</td><td>${d.type}</td><td>${d.source}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Equipos</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'rebastos') {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>ID</th><th>Proveedor</th><th>Fecha</th><th>Artículos</th><th>Piezas</th><th>Nota</th><th style="text-align:right">Inversión</th></tr></thead>`;
      tbody = `<tbody>${rows.map(l => `<tr><td>${l.id}</td><td>${l.provider}</td><td>${new Date(l.date).toLocaleString('es-MX')}</td><td>${l.itemsCount}</td><td>${(l.items || []).reduce((acc: number, b: any) => acc + b.addedQty, 0)} pz</td><td>${l.note || '—'}</td><td style="text-align:right">${sym}${Number(l.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Rebastos</label><span>${rows.length}</span></div><div class="si"><label>Piezas totales</label><span>${summary.extra || 0} pz</span></div><div class="si"><label>Inversión total</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
    } else if (activeCategory === 'piezas-pendientes') {
      const rows = filteredData as RepairOrder[];
      const pendientes = rows.flatMap(o =>
        (o.parts || []).filter(p => !p.paidAt).map(p => ({ orderId: o.id, customer: o.customerName, status: o.status, partName: p.name, cost: p.cost, createdAt: o.createdAt }))
      );
      thead = `<thead><tr><th>Orden</th><th>Cliente</th><th>Estado</th><th>Pieza</th><th>Fecha</th><th style="text-align:right">Costo</th></tr></thead>`;
      tbody = `<tbody>${pendientes.map(p => `<tr><td>${p.orderId}</td><td>${p.customer}</td><td>${p.status}</td><td>${p.partName}</td><td>${new Date(p.createdAt).toLocaleDateString('es-MX')}</td><td>${sym}${p.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Piezas Pendientes</label><span>${pendientes.length}</span></div><div class="si"><label>Total</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
    } else if (activeCategory === 'top-productos') {
      const rows = filteredData as Sale[];
      const map = new Map<string, { unidades: number; ingresos: number; ventas: number }>();
      rows.forEach(sale => {
        (sale.items || []).forEach(item => {
          if (item.itemId?.startsWith('repair-')) return;
          const key = (item.name || '').trim().toUpperCase();
          if (!key) return;
          const prev = map.get(key) || { unidades: 0, ingresos: 0, ventas: 0 };
          map.set(key, {
            unidades: prev.unidades + item.quantity,
            ingresos: prev.ingresos + (item.quantity * item.price),
            ventas: prev.ventas + 1
          });
        });
      });
      const ranking = Array.from(map.entries())
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.unidades - a.unidades);
      const totalUnidades = ranking.reduce((s, r) => s + r.unidades, 0);
      const totalIngresos = ranking.reduce((s, r) => s + r.ingresos, 0);

      thead = `<thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Ventas</th><th style="text-align:right">Ingresos</th></tr></thead>`;
      tbody = `<tbody>${ranking.map((r, i) => `<tr><td>${i + 1}</td><td>${r.nombre}</td><td>${r.unidades}</td><td>${r.ventas}</td><td>${sym}${r.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Productos Únicos</label><span>${ranking.length}</span></div><div class="si"><label>Unidades vendidas</label><span>${totalUnidades}</span></div><div class="si"><label>Ingresos totales</label><span>${sym}${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
    } else if (activeCategory === 'top-cotizaciones') {
      const quotasFiltradas = quotes.filter((q: any) => {
        const d = (q.createdAt || q.date || '').slice(0, 10);
        return inRange(d);
      });
      const serviceMap = new Map<string, { count: number; costoTotal: number; convertidas: number }>();
      quotasFiltradas.forEach((q: any) => {
        (q.devices || []).forEach((d: any) => {
          const svc = (d.serviceType || 'Sin especificar').trim();
          const prev = serviceMap.get(svc) || { count: 0, costoTotal: 0, convertidas: 0 };
          const qty = d.quantity || 1;
          serviceMap.set(svc, { count: prev.count + qty, costoTotal: prev.costoTotal + (qty * (d.estimatedCost || 0)), convertidas: prev.convertidas + (q.status === 'Convertida' ? 1 : 0) });
        });
      });
      const topServices = Array.from(serviceMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
      const totalDevices = quotasFiltradas.reduce((s: number, q: any) => s + (q.devices || []).reduce((acc: number, d: any) => acc + (d.quantity || 1), 0), 0);
      const convertidas = quotasFiltradas.filter((q: any) => q.status === 'Convertida').length;
      const conversionRate = quotasFiltradas.length > 0 ? Math.round((convertidas / quotasFiltradas.length) * 100) : 0;

      thead = `<thead><tr><th>#</th><th>Servicio</th><th>Solicitudes</th><th>Convertidas</th><th style="text-align:right">Costo estimado</th></tr></thead>`;
      tbody = `<tbody>${topServices.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.count}</td><td>${s.convertidas}</td><td>${sym}${s.costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Cotizaciones</label><span>${quotasFiltradas.length}</span></div><div class="si"><label>Equipos cotizados</label><span>${totalDevices}</span></div><div class="si"><label>Convertidas</label><span>${convertidas} (${conversionRate}%)</span></div>`;
    } else if (activeCategory === 'fiados') {
      const rows = filteredData as CreditAccount[];
      thead = `<thead><tr><th>Cliente</th><th>Teléfono</th><th>Cargos</th><th>Abonos</th><th style="text-align:right">Deuda</th><th style="text-align:right">Abonado</th><th style="text-align:right">Saldo</th><th>Alta</th></tr></thead>`;
      tbody = `<tbody>${rows.map(a => {
        const deuda = (a.entries || []).reduce((s, e) => s + e.subtotal, 0);
        const abonado = (a.payments || []).reduce((s, p) => s + p.amount, 0);
        const saldo = Math.max(0, deuda - abonado);
        return `<tr><td>${a.clientName}</td><td>${a.clientPhone || '—'}</td><td>${a.entries?.length || 0}</td><td>${a.payments?.length || 0}</td><td>${sym}${deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${abonado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${new Date(a.createdAt).toLocaleDateString('es-MX')}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Deuda total fiados</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Cuentas</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'apartados') {
      const rows = filteredData as ApartadoEntry[];
      thead = `<thead><tr><th>Cliente</th><th>Teléfono</th><th>Artículos</th><th>Estado</th><th style="text-align:right">Total</th><th style="text-align:right">Abonado</th><th style="text-align:right">Saldo</th><th>Alta</th><th>Vence</th></tr></thead>`;
      tbody = `<tbody>${rows.map(a => {
        const paid = (a.payments || []).reduce((s, p) => s + p.amount, 0);
        const rem  = Math.max(0, a.totalValue - paid);
        const items = (a.items || []).map(it => `${it.name} x${it.quantity}`).join(', ');
        return `<tr><td>${a.clientName}</td><td>${a.clientPhone || '—'}</td><td>${items || '—'}</td><td>${a.status}</td><td>${sym}${a.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${paid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${rem.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${new Date(a.createdAt).toLocaleDateString('es-MX')}</td><td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString('es-MX') : '—'}</td></tr>`;
      }).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Total apartados</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Recibido</label><span>${sym}${(summary.extra || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Pendiente</label><span>${sym}${(summary.extra2 || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
    } else if (activeCategory === 'productos-consultados') {
      const rows = filteredData as any[];
      thead = `<thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Marca</th><th style="text-align:right">Precio</th><th>Hora consulta</th><th>Al carrito</th></tr></thead>`;
      tbody = `<tbody>${rows.map(e => `<tr><td>${e.name}</td><td>${e.code || '—'}</td><td>${e.category || '—'}</td><td>${e.brand || '—'}</td><td>${sym}${Number(e.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${new Date(e.consultedAt).toLocaleString('es-MX')}</td><td>${e.addedToCart ? 'Sí' : 'No'}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Consultas</label><span>${rows.length}</span></div><div class="si"><label>Al Carrito</label><span>${summary.extra || 0} (${summary.extra2 || 0}%)</span></div>`;
    } else if (activeCategory === 'stock-critico-tienda') {
      const rows = filteredData as InventoryItem[];
      thead = `<thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Marca</th><th>Mínimo</th><th>Existencia</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio</th></tr></thead>`;
      tbody = `<tbody>${rows.map(x => `<tr><td>${x.code || '—'}</td><td>${x.name}</td><td>${x.category || 'Accesorios'}</td><td>${x.brand || '—'}</td><td>${x.minStock}</td><td style="color:#d9534f;font-weight:bold">${x.stock}</td><td>${sym}${x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Inversión Crítica</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Artículos en Alerta</label><span>${rows.length}</span></div>`;
    } else if (activeCategory === 'refacciones-criticas') {
      const rows = filteredData as RefaccionItem[];
      thead = `<thead><tr><th>Código</th><th>Refacción</th><th>Celular Compatible</th><th>Marca Ref</th><th>Mínimo</th><th>Existencia</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio Rep.</th></tr></thead>`;
      tbody = `<tbody>${rows.map(x => `<tr><td>${x.code || '—'}</td><td>${x.name}</td><td>${x.deviceBrand} ${x.deviceModel}</td><td>${x.brand || 'GENERICO'}</td><td>${x.minStock}</td><td style="color:#d9534f;font-weight:bold">${x.stock}</td><td>${sym}${x.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>${sym}${x.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('')}</tbody>`;
      summaryHtml = `<div class="si"><label>Inversión Crítica</label><span>${sym}${(summary.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="si"><label>Refacciones en Alerta</label><span>${rows.length}</span></div>`;
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

    const startStr = dateRange.start.toLocaleDateString('es-MX');
    const endStr = dateRange.end.toLocaleDateString('es-MX');
    const subtitle = `${filteredData.length} registro(s) · ${startStr} → ${endStr}`;
    
    return buildA4Html(
      reportTitles[activeCategory] || 'Reporte de Sistema',
      subtitle,
      config?.storeName || 'TALLER',
      thead,
      tbody,
      summaryHtml
    );
  };

  // ─── 1. IMPRIMIR SILENCIOSO EN A4 (Electron) ───────────────────
  const handlePrintA4 = () => {
    if (filteredData.length === 0) {
      alert('No hay información para imprimir.');
      return;
    }

    const eAPI = (window as any).electronAPI;
    if (!eAPI) {
      if (printMobileHtml) {
        const html = buildReportHtml();
        printMobileHtml(html, false);
      } else {
        alert('La función de impresión web no está disponible en este momento.');
      }
      return;
    }

    if (!config?.reportPrinterName?.trim()) {
      alert('⚠️ No hay una impresora A4 configurada. Define una impresora A4 en Ajustes > Impresoras antes de imprimir.');
      return;
    }

    // Iniciar progreso fluido para la impresión A4 (1.5 segundos totales)
    setProcessingState({
      active: true,
      type: 'print',
      progress: 0,
      message: 'Conectando con la impresora A4 física...'
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 12 + 6;
      if (currentProgress >= 90) {
        currentProgress = 90;
        clearInterval(interval);
      }
      setProcessingState(prev => ({
        ...prev,
        progress: Math.min(Math.round(currentProgress), 90),
        message: currentProgress > 45 ? 'Transmitiendo datos del reporte...' : 'Conectando con la impresora A4 física...'
      }));
    }, 70);

    // Gatillar la orden de impresión a la mitad del proceso
    setTimeout(() => {
      const html = buildReportHtml();
      window.dispatchEvent(new CustomEvent('fm-silent-print', { 
        detail: { 
          html, 
          deviceName: config.reportPrinterName, 
          paperWidthMicrons: 210000, 
          paperHeightMicrons: 297000, 
          isReport: true 
        } 
      }));
    }, 450);

    // Finalizar al 100% de forma visual
    setTimeout(() => {
      clearInterval(interval);
      setProcessingState(prev => ({
        ...prev,
        progress: 100,
        message: '¡Transmisión Completa! Imprimiendo...'
      }));

      setTimeout(() => {
        setProcessingState({ active: false, type: null, progress: 0, message: '' });
      }, 500);
    }, 1200);
  };

  // ─── 2. GENERAR IMAGEN Y COMPARTIR NATIVO ────────────────────
  const handleShareReport = async () => {
    if (filteredData.length === 0) {
      alert('No hay información para compartir.');
      return;
    }

    // Iniciar progreso fluido para compartir (captura html2canvas)
    setProcessingState({
      active: true,
      type: 'share',
      progress: 0,
      message: 'Inicializando motor gráfico de captura...'
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8 + 3;
      if (currentProgress >= 92) {
        currentProgress = 92;
        clearInterval(interval);
      }
      setProcessingState(prev => ({
        ...prev,
        progress: Math.min(Math.round(currentProgress), 92),
        message: currentProgress > 50 ? 'Dibujando pixeles y sombras...' : 'Renderizando reporte en lienzo virtual A4...'
      }));
    }, 85);

    try {
      const htmlContent = buildReportHtml();
      
      // Crear iframe invisible para renderizar el reporte
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0px';
      iframe.style.width = '1024px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        clearInterval(interval);
        setProcessingState({ active: false, type: null, progress: 0, message: '' });
        alert('Error al generar la vista previa del reporte.');
        document.body.removeChild(iframe);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(async () => {
        try {
          const bodyEl = iframeDoc.body;
          const realHeight = bodyEl.scrollHeight || 1200;
          iframe.style.height = `${realHeight}px`;

          const canvas = await html2canvas(bodyEl, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            height: realHeight,
            windowHeight: realHeight
          });

          // Limpiar iframe
          document.body.removeChild(iframe);

          const dataUrl = canvas.toDataURL('image/png');
          const catLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || 'Reporte';
          const file = dataURLtoFile(dataUrl, `Reporte_${catLabel.replace(/\s+/g, '_')}.png`);
          const messageText = `📋 *REPORTE FIXMANAGER*\nComparto el reporte de *${catLabel}* desde la aplicación móvil.`;

          clearInterval(interval);
          setProcessingState(prev => ({
            ...prev,
            progress: 100,
            message: '¡Generación exitosa! Abriendo menú compartir...'
          }));

          setTimeout(async () => {
            setProcessingState({ active: false, type: null, progress: 0, message: '' });
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: `Reporte de ${catLabel}`,
                  text: messageText
                });
              } catch (shareErr: any) {
                if (shareErr.name !== 'AbortError') {
                  alert('Error al compartir: ' + shareErr.message);
                }
              }
            } else {
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = `Reporte_${catLabel.replace(/\s+/g, '_')}.png`;
              link.click();
              alert('Captura de reporte descargada. Puedes compartirla manualmente.');
            }
          }, 450);

        } catch (canvasErr: any) {
          clearInterval(interval);
          setProcessingState({ active: false, type: null, progress: 0, message: '' });
          console.error("Error generating canvas:", canvasErr);
          alert('No se pudo generar la imagen del reporte: ' + canvasErr.message);
        }
      }, 350);

    } catch (err: any) {
      clearInterval(interval);
      setProcessingState({ active: false, type: null, progress: 0, message: '' });
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <section className={`fixed inset-0 z-[999999] flex flex-col font-sans select-none overflow-hidden animate-fade-in ${
      isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#09090b] text-white'
    }`}>
      {/* Cabecera */}
      <header 
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 24px))' }}
        className={`p-4 flex items-center justify-between border-b shrink-0 ${
          isLight ? 'bg-white border-slate-150' : 'bg-zinc-950 border-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
            <BarChart2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider">Reportes</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Estadísticas y Finanzas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botón Imprimir A4 */}
          <button
            type="button"
            onClick={handlePrintA4}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
            }`}
            title="Imprimir Reporte en A4"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Botón Compartir Reporte */}
          <button
            type="button"
            onClick={handleShareReport}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
            }`}
            title="Compartir Reporte"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
            }`}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Rango de Fechas / Filtro Rápido */}
      <section className={`p-3 border-b flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar ${
        isLight ? 'bg-white border-slate-150' : 'bg-zinc-950 border-zinc-900'
      }`}>
        {(['hoy', 'ayer', '7dias', 'esteMes', 'mesAnterior', 'historico'] as DateFilterType[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDateFilter(filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all active:scale-[0.97] ${
              dateFilter === filter
                ? 'bg-fuchsia-600 text-white shadow-xs shadow-fuchsia-500/25'
                : isLight
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {filter === 'hoy' && 'Hoy'}
            {filter === 'ayer' && 'Ayer'}
            {filter === '7dias' && '7 Días'}
            {filter === 'esteMes' && 'Este Mes'}
            {filter === 'mesAnterior' && 'Mes Ant.'}
            {filter === 'historico' && 'Histórico'}
          </button>
        ))}
      </section>

      {/* Menú de Categorías (16 Pestañas Deslizantes) */}
      <nav className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar ${
        isLight ? 'bg-white border-slate-150' : 'bg-zinc-950 border-zinc-900'
      }`}>
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchTerm('');
                setShowHidden(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider shrink-0 transition-all active:scale-95 border ${
                isActive
                  ? isLight
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-zinc-100 text-black border-zinc-150'
                  : isLight
                    ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Buscador Rápido */}
      <div className={`p-3 border-b flex flex-col gap-2 ${
        isLight ? 'bg-white border-slate-150' : 'bg-zinc-950 border-zinc-900'
      }`}>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar en este reporte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-10 pl-9 pr-4 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-fuchsia-500 ${
              isLight ? 'bg-slate-100 border border-slate-200 text-slate-800' : 'bg-zinc-900 border border-zinc-800 text-white'
            }`}
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
        </div>
        {(activeCategory === 'stock-critico-tienda' || activeCategory === 'refacciones-criticas') && (
          <label className="flex items-center gap-2 px-1 text-xs select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded text-fuchsia-600 focus:ring-fuchsia-500 border-zinc-300 dark:border-zinc-700 w-3.5 h-3.5"
            />
            <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400 font-bold'}>
              Incluir artículos ocultos (inactivos)
            </span>
          </label>
        )}
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ─── 1. VENTAS POS ─── */}
        {activeCategory === 'ventas-pos' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Total de Ventas POS</span>
              <h3 className="text-2xl font-black font-mono text-emerald-500">
                {formatMoney(summary.total || 0)}
              </h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} Transacciones</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as Sale[]).map(s => {
                const repairsTotal = (s.items || [])
                  .filter(i => i.itemId && i.itemId.startsWith('repair-'))
                  .reduce((sum, item) => sum + item.price * item.quantity, 0);
                const netTotal = Math.max(0, s.total - repairsTotal);
                const nonRepairs = (s.items || []).filter(i => !i.itemId?.startsWith('repair-'));
                return (
                  <div key={s.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start border-b border-dashed pb-2 border-zinc-800 mb-2">
                      <div>
                        <span className="text-xs font-black font-mono">#{s.id}</span>
                        <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{formatDate(s.createdAt)}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-500 font-mono">{formatMoney(netTotal)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Artículos:</p>
                      <p className="text-xs truncate">{nonRepairs.map(i => `${i.name} (${i.quantity}pz)`).join(', ') || '—'}</p>
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase mt-1">
                        <span>Pago: {s.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 2. VENTAS ÓRDENES ─── */}
        {activeCategory === 'ventas-ordenes' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border flex flex-col gap-0.5 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Total cobrado</span>
                <h4 className="text-lg font-black font-mono text-emerald-500">{formatMoney(summary.total || 0)}</h4>
                <span className="text-[8px] font-bold text-zinc-400 uppercase">{summary.count} órdenes</span>
              </div>
              <div className={`p-4 rounded-3xl border flex flex-col gap-0.5 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Efectivo vs Tarjeta</span>
                <span className="text-[10px] font-black text-emerald-500">Efe: {formatMoney(summary.extra || 0)}</span>
                <span className="text-[10px] font-black text-purple-500">Tar: {formatMoney(summary.extra2 || 0)}</span>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as RepairOrder[]).map(o => {
                const pm = getOrderPaymentMethod(o);
                return (
                  <div key={o.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start border-b border-dashed pb-2 border-zinc-800 mb-2">
                      <div>
                        <span className="text-xs font-black font-mono">FOLIO: {o.id}</span>
                        <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{o.customerName}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-500 font-mono">{formatMoney(o.cost)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase">{o.deviceBrand} {o.deviceModel}</p>
                      <p className="text-xs text-zinc-400">{o.serviceType}</p>
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase mt-1">
                        <span>Pago: {pm}</span>
                        <span>{new Date(o.createdAt).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 3. ENTRADAS MANUALES ─── */}
        {activeCategory === 'entradas-manuales' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Total Entradas Manuales</span>
              <h3 className="text-2xl font-black font-mono text-emerald-500">
                {formatMoney(summary.total || 0)}
              </h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} Movimientos</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as Expense[]).map(e => (
                <div key={e.id} className={`p-3 rounded-2xl border flex justify-between items-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div>
                    <h4 className="text-xs font-black uppercase">{e.description}</h4>
                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{e.category || 'Inyección'} · {formatDate(e.createdAt)}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500 font-mono">+{formatMoney(e.amount)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 4. SALIDAS MANUALES ─── */}
        {activeCategory === 'salidas-manuales' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Total Salidas Manuales</span>
              <h3 className="text-2xl font-black font-mono text-rose-500">
                {formatMoney(summary.total || 0)}
              </h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} Movimientos</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as Expense[]).map(e => (
                <div key={e.id} className={`p-3 rounded-2xl border flex justify-between items-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div>
                    <h4 className="text-xs font-black uppercase">{e.description}</h4>
                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{e.category || 'Otros'} · {formatDate(e.createdAt)}</span>
                  </div>
                  <span className="text-xs font-black text-rose-500 font-mono">-{formatMoney(e.amount)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 5. CORTES ─── */}
        {activeCategory === 'cortes' && (
          <div className="space-y-3">
            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin cortes registrados</div>
            ) : (
              (filteredData as any[]).map((c, i) => {
                const diff = c.diferencia ?? 0;
                return (
                  <div key={c.id || i} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start border-b border-dashed pb-2 border-zinc-800 mb-2">
                      <div>
                        <span className="text-xs font-black font-mono">CORTE: {c.id}</span>
                        <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{c.technicianName || c.usuario || '—'}</span>
                      </div>
                      <span className={`text-xs font-black font-mono ${diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-sky-500' : 'text-rose-500'}`}>
                        {diff >= 0 ? '+' : ''}{formatMoney(diff)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-1 rounded bg-slate-500/5">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Estimado</span>
                        <span className="font-mono">{formatMoney(c.estimado || 0)}</span>
                      </div>
                      <div className="p-1 rounded bg-slate-500/5">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Contado</span>
                        <span className="font-mono">{formatMoney(c.fisico || 0)}</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-zinc-400 block text-right mt-2">{formatDate(c.createdAt || c.date)}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 6. HISTORIAL DE PRECIOS ─── */}
        {activeCategory === 'historial-precios' && (
          <div className="space-y-3">
            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as ServicePrice[]).map(s => (
                <div key={s.id} className={`p-3 rounded-2xl border flex justify-between items-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div>
                    <h4 className="text-xs font-black uppercase">{s.name}</h4>
                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{s.category} · {s.durationMinutes} min</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500 font-mono">{formatMoney(s.price)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 7. HISTORIAL DE EQUIPOS ─── */}
        {activeCategory === 'historial-equipos' && (
          <div className="space-y-3">
            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as any[]).map((d, i) => (
                <div key={i} className={`p-3 rounded-2xl border flex justify-between items-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div>
                    <h4 className="text-xs font-black uppercase">{d.brand} {d.model}</h4>
                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">Código: {d.modelCode} · Tipo: {d.type}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${
                    d.source === 'Catálogo' 
                      ? 'bg-cyan-500/10 text-cyan-500' 
                      : 'bg-indigo-500/10 text-indigo-500'
                  }`}>{d.source}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 8. REABASTOS ─── */}
        {activeCategory === 'rebastos' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Total Inversión</span>
                <h3 className="text-xl font-black font-mono text-rose-500">{formatMoney(summary.total || 0)}</h3>
              </div>
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Piezas Ingresadas</span>
                <h3 className="text-xl font-black font-mono text-cyan-500">{summary.extra || 0} pz</h3>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as any[]).map((l, i) => (
                <div key={l.id || i} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xs font-black uppercase">{l.provider}</h4>
                      <span className="text-[9px] font-bold text-zinc-400 mt-0.5 block">{new Date(l.date).toLocaleString('es-MX')}</span>
                    </div>
                    <span className="text-xs font-black text-rose-500 font-mono">{formatMoney(Number(l.totalCost))}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Artículos: {l.itemsCount} · Nota: {l.note || '—'}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 9. PIEZAS PENDIENTES ─── */}
        {activeCategory === 'piezas-pendientes' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400">Valor de Piezas en Espera</span>
              <h3 className="text-2xl font-black font-mono text-indigo-500">{formatMoney(summary.total || 0)}</h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} piezas pendientes</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin piezas pendientes</div>
            ) : (
              (filteredData as RepairOrder[]).flatMap(o => 
                (o.parts || []).filter(p => !p.paidAt).map((p, idx) => (
                  <div key={`${o.id}-${idx}`} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 block">ORDEN: {o.id}</span>
                        <h4 className="text-xs font-black uppercase">{o.customerName}</h4>
                      </div>
                      <span className="text-xs font-black text-indigo-500 font-mono">{formatMoney(p.cost)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Pieza: {p.name}</p>
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase mt-2">
                      <span>Estado: {o.status}</span>
                      <span>Fecha: {new Date(o.createdAt).toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {/* ─── 10. TOP PRODUCTOS ─── */}
        {activeCategory === 'top-productos' && (
          <div className="space-y-4">
            {/* ranking global */}
            {(() => {
              const map = new Map<string, { unidades: number; ingresos: number; ventas: number }>();
              (filteredData as Sale[]).forEach(sale => {
                (sale.items || []).forEach(item => {
                  if (item.itemId?.startsWith('repair-')) return;
                  const key = (item.name || '').trim().toUpperCase();
                  if (!key) return;
                  const prev = map.get(key) || { unidades: 0, ingresos: 0, ventas: 0 };
                  map.set(key, {
                    unidades: prev.unidades + item.quantity,
                    ingresos: prev.ingresos + (item.quantity * item.price),
                    ventas: prev.ventas + 1
                  });
                });
              });

              const ranking = Array.from(map.entries())
                .map(([nombre, data]) => ({ nombre, ...data }))
                .sort((a, b) => b.unidades - a.unidades);

              const totalUnidades = ranking.reduce((acc, r) => acc + r.unidades, 0);
              const maxUnidades = ranking[0]?.unidades || 1;
              const medals = ['🥇', '🥈', '🥉'];

              if (ranking.length === 0) {
                return <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros en este periodo</div>;
              }

              return (
                <div className="space-y-3">
                  <div className={`p-4 rounded-3xl border text-center ${
                    isLight ? 'bg-violet-50 border-violet-100 text-violet-850' : 'bg-violet-950/20 border-violet-900/30 text-violet-400'
                  }`}>
                    <span className="text-[9px] font-black uppercase block tracking-wider">Total Unidades Vendidas</span>
                    <h3 className="text-3xl font-black font-mono">{totalUnidades}</h3>
                    <span className="text-[9px] font-bold opacity-75 uppercase block mt-1">{ranking.length} productos diferentes</span>
                  </div>

                  {ranking.map((r, idx) => {
                    const pct = Math.round((r.unidades / maxUnidades) * 100);
                    return (
                      <div key={r.nombre} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black">{idx < 3 ? medals[idx] : `#${idx + 1}`}</span>
                            <h4 className="text-xs font-black uppercase truncate max-w-[200px]">{r.nombre}</h4>
                          </div>
                          <span className="text-xs font-black text-violet-500 font-mono">{r.unidades} pz</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                            <span>Ingresos: {formatMoney(r.ingresos)}</span>
                            <span>{r.ventas} Transacciones</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-zinc-850'}`}>
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── 11. TOP COTIZACIONES ─── */}
        {activeCategory === 'top-cotizaciones' && (
          <div className="space-y-4">
            {/* ranking cotizaciones */}
            {(() => {
              const quotasFiltradas = quotes.filter((q: any) => {
                return inRange(q.createdAt || q.date || Date.now());
              });

              if (quotasFiltradas.length === 0) {
                return <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin cotizaciones en este periodo</div>;
              }

              const serviceMap = new Map<string, { count: number; costoTotal: number; convertidas: number }>();
              const deviceMap = new Map<string, { count: number }>();

              quotasFiltradas.forEach((q: any) => {
                (q.devices || []).forEach((d: any) => {
                  const svc = (d.serviceType || 'Servicio General').trim();
                  const prev = serviceMap.get(svc) || { count: 0, costoTotal: 0, convertidas: 0 };
                  const qty = d.quantity || 1;
                  serviceMap.set(svc, {
                    count: prev.count + qty,
                    costoTotal: prev.costoTotal + (qty * (d.estimatedCost || 0)),
                    convertidas: prev.convertidas + (q.status === 'Convertida' ? 1 : 0)
                  });

                  const dev = `${d.deviceBrand || '?'} ${d.deviceModel || '?'}`.trim();
                  const prevD = deviceMap.get(dev) || { count: 0 };
                  deviceMap.set(dev, { count: prevD.count + qty });
                });
              });

              const topServices = Array.from(serviceMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
              const topDevices = Array.from(deviceMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 5);
              const totalDevices = quotasFiltradas.reduce((s: number, q: any) => s + (q.devices || []).reduce((acc: number, d: any) => acc + (d.quantity || 1), 0), 0);
              const convertidas = quotasFiltradas.filter((q: any) => q.status === 'Convertida').length;
              const conversionRate = quotasFiltradas.length > 0 ? Math.round((convertidas / quotasFiltradas.length) * 100) : 0;
              const maxSvcCount = topServices[0]?.count || 1;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                      <span className="text-[8px] font-bold text-zinc-400 block uppercase">Equipos Cotizados</span>
                      <span className="text-xl font-black">{totalDevices} eq.</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                      <span className="text-[8px] font-bold text-zinc-400 block uppercase">Tasa Conversión</span>
                      <span className="text-xl font-black text-emerald-500">{conversionRate}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400">Servicios más Cotizados</h4>
                    {topServices.map((s, idx) => {
                      const pct = Math.round((s.count / maxSvcCount) * 100);
                      return (
                        <div key={s.name} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black">{idx < 3 ? medals[idx] : `#${idx + 1}`}</span>
                              <h4 className="text-xs font-black uppercase truncate max-w-[200px]">{s.name}</h4>
                            </div>
                            <span className="text-xs font-black text-teal-500 font-mono">{s.count} veces</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                              <span>Monto Estimado: {formatMoney(s.costoTotal)}</span>
                              <span>Convertidas: {s.convertidas}</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-zinc-850'}`}>
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {topDevices.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] font-black uppercase text-zinc-400">Dispositivos más Cotizados</h4>
                      <div className={`rounded-2xl border divide-y overflow-hidden ${
                        isLight ? 'bg-white border-slate-200 divide-slate-100' : 'bg-zinc-900 border-zinc-800 divide-zinc-850'
                      }`}>
                        {topDevices.map((d, idx) => (
                          <div key={d.name} className="p-3 flex justify-between items-center text-xs">
                            <span className="font-bold uppercase">{idx < 3 ? medals[idx] : idx + 1} {d.name}</span>
                            <span className="font-black text-teal-500 font-mono">{d.count} eq.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── 12. FIADOS ─── */}
        {activeCategory === 'fiados' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Total Deuda Fiados</span>
                <h3 className="text-xl font-black font-mono text-rose-500">{formatMoney(summary.total || 0)}</h3>
              </div>
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Cuentas Activas</span>
                <h3 className="text-xl font-black font-mono text-cyan-500">{summary.extra || 0} act.</h3>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as CreditAccount[]).map(a => {
                const balance = Math.max(0, (a.entries || []).reduce((s, e) => s + e.subtotal, 0) - (a.payments || []).reduce((s, p) => s + p.amount, 0));
                return (
                  <div key={a.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start border-b border-dashed pb-2 border-zinc-800 mb-2">
                      <div>
                        <h4 className="text-xs font-black uppercase">{a.clientName}</h4>
                        <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{a.clientPhone || 'Sin teléfono'}</span>
                      </div>
                      <span className={`text-xs font-black font-mono ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatMoney(balance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase">
                      <span>Cargos: {a.entries?.length || 0} · Abonos: {a.payments?.length || 0}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${
                        balance > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>{balance > 0 ? 'Con Deuda' : 'Saldado'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 13. APARTADOS ─── */}
        {activeCategory === 'apartados' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Total Apartados</span>
                <h3 className="text-xl font-black font-mono text-fuchsia-500">{formatMoney(summary.total || 0)}</h3>
              </div>
              <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-zinc-400">Recibido vs Pendiente</span>
                <span className="text-[10px] font-black text-emerald-500">Rec: {formatMoney(summary.extra || 0)}</span>
                <span className="text-[10px] font-black text-rose-500 font-mono">Pen: {formatMoney(summary.extra2 || 0)}</span>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as ApartadoEntry[]).map(a => {
                const paid = (a.payments || []).reduce((s, p) => s + p.amount, 0);
                const remaining = Math.max(0, a.totalValue - paid);
                const itemsList = (a.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');
                return (
                  <div key={a.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start border-b border-dashed pb-2 border-zinc-800 mb-2">
                      <div>
                        <h4 className="text-xs font-black uppercase">{a.clientName}</h4>
                        <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{a.clientPhone || 'Sin teléfono'}</span>
                      </div>
                      <span className="text-xs font-black text-fuchsia-500 font-mono">{formatMoney(a.totalValue)}</span>
                    </div>
                    <p className="text-xs truncate mb-2">{itemsList || '—'}</p>
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase">
                      <span>Restante: {formatMoney(remaining)}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${
                        a.status === 'Activo' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : a.status === 'Listo' 
                          ? 'bg-amber-500/10 text-amber-500' 
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>{a.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 14. PRODUCTOS CONSULTADOS ─── */}
        {activeCategory === 'productos-consultados' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <span className="text-[8px] font-bold text-zinc-400 block uppercase">Consultas Totales</span>
                <span className="text-xl font-black">{summary.count}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <span className="text-[8px] font-bold text-zinc-400 block uppercase">Agregados al Carrito</span>
                <span className="text-xl font-black text-emerald-500">{summary.extra} ({summary.extra2}%)</span>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Sin registros</div>
            ) : (
              (filteredData as any[]).map((e, idx) => (
                <div key={e.id || idx} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h4 className="text-xs font-black uppercase">{e.name}</h4>
                      <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">Código: {e.code || '—'} · {e.brand}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-500 font-mono">{formatMoney(e.price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase mt-2">
                    <span>{new Date(e.consultedAt).toLocaleTimeString('es-MX')}</span>
                    <span className={e.addedToCart ? 'text-emerald-500 font-black' : 'text-zinc-500'}>
                      {e.addedToCart ? '✓ Agregado' : '— No agregado'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 15. STOCK CRÍTICO TIENDA ─── */}
        {activeCategory === 'stock-critico-tienda' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400">Costo Inversión Crítica</span>
              <h3 className="text-2xl font-black font-mono text-rose-500">{formatMoney(summary.total || 0)}</h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} productos en stock crítico</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Todo el inventario sobre el mínimo</div>
            ) : (
              (filteredData as InventoryItem[]).map(x => (
                <div key={x.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500">CÓD: {x.code || '—'}</span>
                      <h4 className="text-xs font-black uppercase">{x.name}</h4>
                    </div>
                    <span className="text-xs font-black text-rose-500 font-mono">{x.stock} pz</span>
                  </div>
                  <p className="text-xs text-zinc-400">Mínimo: {x.minStock} · Marca: {x.brand || '—'}</p>
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase mt-2">
                    <span>Costo: {formatMoney(x.cost)}</span>
                    <span className="text-emerald-500">Venta: {formatMoney(x.price)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── 16. REFACCIONES CRÍTICAS ─── */}
        {activeCategory === 'refacciones-criticas' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <span className="text-[9px] font-black uppercase text-zinc-400">Costo Inversión Crítica (Taller)</span>
              <h3 className="text-2xl font-black font-mono text-rose-500">{formatMoney(summary.total || 0)}</h3>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">{summary.count} refacciones en stock crítico</span>
            </div>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase">Todas las refacciones sobre el mínimo</div>
            ) : (
              (filteredData as RefaccionItem[]).map(x => (
                <div key={x.id} className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500">CÓD: {x.code || '—'}</span>
                      <h4 className="text-xs font-black uppercase">{x.name}</h4>
                    </div>
                    <span className="text-xs font-black text-rose-500 font-mono">{x.stock} pz</span>
                  </div>
                  <p className="text-xs text-zinc-400">Compatible: {x.deviceBrand} {x.deviceModel}</p>
                  <p className="text-xs text-zinc-500">Mínimo: {x.minStock} · Marca ref.: {x.brand || 'GENÉRICO'}</p>
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase mt-2">
                    <span>Costo: {formatMoney(x.cost)}</span>
                    <span className="font-black text-emerald-500 font-black">Reparación: {formatMoney(x.price)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* Indicador de Procesamiento Premium (Centro, discreto con barra de progreso real/progresiva) */}
      {processingState.active && (
        <div className="fixed inset-0 z-[10000000] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div 
            className={`w-full max-w-[280px] p-5 rounded-3xl border shadow-2xl flex flex-col items-center text-center transition-all ${
              isLight ? 'bg-white border-slate-150' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            {/* Animación del Icono */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 relative ${
              processingState.type === 'print' 
                ? 'bg-blue-500/10 text-blue-500' 
                : 'bg-fuchsia-500/10 text-fuchsia-500'
            }`}>
              {processingState.type === 'print' ? (
                <Printer className="w-5 h-5 animate-pulse" />
              ) : (
                <Share2 className="w-5 h-5 animate-pulse" />
              )}
              {/* Círculo giratorio de progreso */}
              <div className="absolute inset-0 rounded-2xl border-2 border-t-transparent border-current animate-spin opacity-20" />
            </div>

            {/* Mensaje descriptivo con color inline explícito */}
            <h4 
              style={{ color: isLight ? '#0f172a' : '#ffffff' }}
              className="text-[11px] font-black uppercase tracking-wider mb-1"
            >
              {processingState.type === 'print' ? 'Imprimiendo Reporte A4' : 'Preparando Archivo A4'}
            </h4>
            
            <p 
              style={{ color: isLight ? '#475569' : '#a1a1aa' }}
              className="text-[10px] font-bold leading-normal mb-4 min-h-[30px] flex items-center justify-center"
            >
              {processingState.message}
            </p>

            {/* Barra de progreso */}
            <div className="w-full space-y-1.5">
              <div className={`w-full h-2 rounded-full overflow-hidden relative ${
                isLight ? 'bg-slate-100' : 'bg-zinc-850'
              }`}>
                <div 
                  className={`h-full rounded-full transition-all duration-150 ease-out ${
                    processingState.type === 'print'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      : 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
                  }`}
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
              <span 
                style={{ color: isLight ? '#334155' : '#d4d4d8' }}
                className="text-[10px] font-black font-mono block mt-1"
              >
                {processingState.progress}%
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
