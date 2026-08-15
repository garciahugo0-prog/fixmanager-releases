import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Barcode, Trash2, Printer, Package, ChevronDown, ChevronRight, Plus, Minus, ArrowLeft } from 'lucide-react';
import { InventoryItem, WorkshopConfig } from '../../types';
import { buildProductLabelHtml } from '../../utils/ticketBuilder';

interface QueueItem {
  id: string;
  name: string;
  code: string;
  price: number;
  brand?: string;
  qty: number;
}

interface AbastoEntry {
  id?: string;
  provider?: string;
  date: string;
  items: { id: string; name: string; barcode: string; price: number; amount: number }[];
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

interface MobileEtiquetasViewProps {
  inventory: InventoryItem[];
  config: WorkshopConfig;
  isLight: boolean;
  onClose: () => void;
}

export default function MobileEtiquetasView({ inventory, config, isLight, onClose }: MobileEtiquetasViewProps) {
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fixmanager_label_print_queue') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fixmanager_label_print_queue', JSON.stringify(queue));
  }, [queue]);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'vitrina' | 'qr' | 'technical'>(config.labelTemplateStyle || 'standard');

  const abastoLog: AbastoEntry[] = useMemo(() => {
    try {
      const logsRaw = localStorage.getItem('fixmanager_replenishment_logs') || '[]';
      const logs: ReplenishHistoryLog[] = JSON.parse(logsRaw);
      
      return logs.map(log => {
        const items = log.items.map(it => {
          const invItem = inventory.find(inv => inv.name.toUpperCase().trim() === it.name.toUpperCase().trim());
          return {
            id: invItem?.id || `temp-${Date.now()}-${Math.random()}`,
            name: it.name,
            barcode: invItem?.code || '',
            price: invItem?.price || 0,
            amount: it.addedQty
          };
        });
        
        return {
          id: log.id,
          provider: log.provider,
          date: log.date,
          items
        };
      });
    } catch {
      return [];
    }
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return inventory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.code && i.code.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [search, inventory]);

  const addToQueue = (item: { id: string; name: string; price: number; brand?: string; code?: string }, qty: number) => {
    setQueue(prev => {
      const existing = prev.find(q => q.id === item.id);
      if (existing) {
        return prev.map(q => q.id === item.id ? { ...q, qty: q.qty + qty } : q);
      }
      return [...prev, { id: item.id, name: item.name, code: item.code || '', price: item.price, brand: item.brand, qty }];
    });
    setFeedback(`✓ ${item.name} agregado`);
    setTimeout(() => setFeedback(null), 1500);
  };

  const importAbasto = (entry: AbastoEntry, singleItem?: { id: string; name: string; price: number; brand?: string; code?: string; amount: number }) => {
    if (singleItem) {
      setQueue(prev => {
        const exists = prev.find(q => q.id === singleItem.id);
        if (exists) {
          return prev.map(q => q.id === singleItem.id ? { ...q, qty: singleItem.amount } : q);
        }
        return [...prev, { id: singleItem.id, name: singleItem.name, code: singleItem.code || '', price: singleItem.price, brand: singleItem.brand, qty: singleItem.amount }];
      });
      setFeedback(`✓ "${singleItem.name}" cargado`);
      setTimeout(() => setFeedback(null), 1500);
    } else {
      const newItems: QueueItem[] = entry.items.map(i => {
        const inv = inventory.find(inv => inv.id === i.id);
        return { id: i.id, name: i.name, code: inv?.code || i.barcode, price: i.price, brand: inv?.brand, qty: i.amount };
      });
      setQueue(newItems);
      setFeedback(`✓ Abasto importado (${newItems.length} prod.)`);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const buildBatchHtml = () => {
    const singles = queue.flatMap(item => {
      const single = buildProductLabelHtml({ name: item.name, price: item.price, sku: item.code, brand: item.brand }, config, selectedTemplate);
      const bodyMatch = single.match(/<body>([\s\S]*?)<\/body>/);
      const headMatch = single.match(/<head>([\s\S]*?)<\/head>/);
      const body = bodyMatch?.[1] || '';
      const head = headMatch?.[1] || '';
      const copies = Array.from({ length: item.qty }, () => body);
      return { head, copies };
    });
    if (!singles.length) return '';
    const head = singles[0].head;
    const allCopies = singles.flatMap(s => s.copies);
    const bodies = allCopies.map((body, i) =>
      i < allCopies.length - 1
        ? body.replace('class="label" style="', 'class="label" style="page-break-after:always; ')
        : body
    );
    return `<!DOCTYPE html><html><head>${head}</head><body>${bodies.join('')}</body></html>`;
  };

  const printAll = () => {
    if (!queue.length) return;
    const html = buildBatchHtml();

    const sizeKey = config.labelPaperSize || '51x25mm';
    const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
    const paperWidthMicrons = widthMm * 1000;
    const paperHeightMicrons = heightMm * 1000;

    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { 
      html, 
      deviceName: config.labelPrinterBrand || '', 
      copies: 1, 
      isLabel: true,
      paperWidthMicrons,
      paperHeightMicrons
    } }));
    window.dispatchEvent(new CustomEvent('automated-print', { detail: { type: 'label', name: 'Etiquetas en bloque', details: `${queue.reduce((a, i) => a + i.qty, 0)} etiquetas · ${queue.length} productos` } }));
    
    // Disparar diálogo de impresión web nativo en caso de que esté fuera de Electron (Capacitor)
    if (!(window as any).electronAPI?.printTicket) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.print();
      }
    }

    setFeedback(`✓ Enviadas ${queue.reduce((a, i) => a + i.qty, 0)} etiquetas a la impresora`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const totalLabels = queue.reduce((a, i) => a + i.qty, 0);

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
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Impresión de Etiquetas</h3>
              <p className={`text-[8px] font-semibold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                Gestiona tu cola y manda todo de un golpe
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Buscador Táctil Rápido ── */}
      <nav className={`px-4 py-3 border-b shrink-0 ${
        isLight ? 'bg-white border-slate-150' : 'bg-zinc-900/60 border-zinc-850'
      }`}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto por nombre o SKU..."
            className={`w-full h-11 pl-11 pr-10 text-xs font-bold rounded-xl transition-all focus:outline-none ${
              isLight
                ? 'bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500'
                : 'bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-600'
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

        {/* Resultados de Búsqueda Flotantes / Desplegables */}
        {search.trim() && (
          <div className={`absolute left-4 right-4 mt-1.5 rounded-2xl border shadow-xl z-50 max-h-60 overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 font-semibold">Sin resultados</div>
            ) : (
              <div className="p-2 flex flex-col gap-1.5">
                {filteredProducts.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { addToQueue(item, 1); setSearch(''); }}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors active:scale-[0.98] ${
                      isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-zinc-950/60 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-black truncate">{item.name}</div>
                      <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                        ${item.price.toFixed(2)}{item.code ? ` · ${item.code}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider shrink-0 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      + Cola
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Cuerpo principal con scroll ── */}
      <section className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        isLight ? 'bg-slate-50' : 'bg-[#09090b]'
      }`}>
        
        {/* Banner de Feedback flotante */}
        {feedback && (
          <div className="p-2.5 rounded-xl text-center text-xs font-black bg-emerald-500 text-slate-950 animate-bounce">
            {feedback}
          </div>
        )}

        {/* ── Sección: Cola de Impresión Actual ── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Cola de Impresión ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                onClick={() => { if(confirm('¿Vaciar cola de impresión?')) setQueue([]); }}
                className="text-[9px] font-black uppercase tracking-wider text-rose-500 cursor-pointer active:scale-95"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 ${
              isLight ? 'border-slate-300 bg-slate-100/50' : 'border-zinc-850 bg-zinc-900/20'
            }`}>
              <Barcode className="w-8 h-8 text-zinc-500 opacity-40" />
              <div className="text-xs font-bold text-zinc-400">La cola de etiquetas está vacía</div>
              <p className="text-[9px] text-zinc-500 max-w-xs leading-relaxed">
                Busca productos arriba o importa lotes de tu historial de abasto para llenarla.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs ${
                    isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
                  }`}
                >
                  <div className="min-w-0 pr-3 flex-1">
                    <div className="text-xs font-black truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      ${item.price.toFixed(2)}{item.code ? ` · SKU: ${item.code}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQueue(prev => prev.map(q => q.id === item.id ? { ...q, qty: Math.max(1, q.qty - 1) } : q))}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-90 ${
                          isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-850 hover:bg-zinc-800'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, qty: val } : q));
                        }}
                        className={`w-10 h-7 text-center font-mono font-black text-xs bg-transparent border-0 outline-none p-0 focus:ring-0 ${
                          isLight ? 'text-slate-800' : 'text-white'
                        }`}
                      />
                      <button
                        onClick={() => setQueue(prev => prev.map(q => q.id === item.id ? { ...q, qty: q.qty + 1 } : q))}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer active:scale-90 ${
                          isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-850 hover:bg-zinc-800'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>

                    <button
                      onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sección: Historial de Abasto ── */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-1 block">
            Importar de Historial de Abasto
          </span>

          {abastoLog.length === 0 ? (
            <div className={`p-5 text-center rounded-2xl border ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-850 bg-zinc-950/20'
            }`}>
              <span className="text-[10px] font-semibold text-zinc-500">Sin historial de abastos registrados aún</span>
            </div>
          ) : (
            <div className="space-y-2">
              {abastoLog.map(entry => {
                const isOpen = expandedDates.has(entry.date);
                const dateObj = new Date(entry.date);
                const formattedDate = isNaN(dateObj.getTime())
                  ? 'Fecha de abasto'
                  : dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const totalItemsQty = entry.items.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <div
                    key={entry.id || entry.date}
                    className={`rounded-2xl border overflow-hidden ${
                      isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-850'
                    }`}
                  >
                    {/* Fila superior de la cabecera del abasto */}
                    <div
                      onClick={() => setExpandedDates(prev => {
                        const newSet = new Set(prev);
                        if (isOpen) newSet.delete(entry.date);
                        else newSet.add(entry.date);
                        return newSet;
                      })}
                      className="p-3 flex items-center justify-between cursor-pointer select-none active:bg-zinc-800/10"
                    >
                      <div>
                        <div className="text-xs font-black text-amber-500 capitalize">
                          {formattedDate} {entry.provider && <span className="text-slate-400 dark:text-zinc-500 font-bold">· {entry.provider}</span>}
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-0.5">
                          {entry.items.length} productos · {totalItemsQty} piezas
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            importAbasto(entry);
                          }}
                          className="h-6 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-[8.5px] uppercase tracking-wider cursor-pointer"
                        >
                          Cargar Todo
                        </button>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Contenido expandido con el detalle de items del abasto */}
                    {isOpen && (
                      <div className={`p-2 border-t flex flex-col gap-1.5 ${
                        isLight ? 'bg-slate-50/50 border-slate-100' : 'bg-zinc-950/40 border-zinc-850'
                      }`}>
                        {entry.items.map(item => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-xl border flex items-center justify-between ${
                              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-850'
                            }`}
                          >
                            <div className="min-w-0 pr-2 flex-1">
                              <span className="text-[11px] font-black truncate block">{item.name}</span>
                              <span className="text-[9px] text-zinc-500 block">{item.amount} pz</span>
                            </div>
                            <button
                              onClick={() => {
                                const inv = inventory.find(inv => inv.id === item.id);
                                importAbasto(entry, {
                                  id: item.id,
                                  name: item.name,
                                  price: item.price,
                                  brand: inv?.brand,
                                  code: inv?.code || item.barcode,
                                  amount: item.amount
                                });
                              }}
                              className="h-5 px-2 rounded-md border border-amber-500/40 text-amber-500 font-extrabold text-[8px] uppercase tracking-wider hover:bg-amber-500/10 cursor-pointer"
                            >
                              + Cola
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Pie de Página y Acción Principal ── */}
      <footer 
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
        className={`p-4 border-t space-y-3.5 shrink-0 ${
          isLight ? 'bg-white border-slate-200 shadow-lg' : 'bg-zinc-900 border-zinc-850'
        }`}
      >
        
        {/* Selector de Plantilla rápido */}
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
            Diseño de la Etiqueta:
          </span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'standard', label: '🏷️ Estándar' },
              { id: 'vitrina', label: '🏪 Vitrina' },
              { id: 'qr', label: '📱 QR' },
              { id: 'technical', label: '📋 Ficha' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                  selectedTemplate === t.id
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botón Principal Impresión */}
        <button
          type="button"
          disabled={queue.length === 0}
          onClick={printAll}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            queue.length > 0
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 cursor-pointer'
              : 'bg-zinc-300 text-zinc-500 dark:bg-zinc-850 dark:text-zinc-600 cursor-not-allowed shadow-none'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Lote {totalLabels > 0 ? `(${totalLabels})` : ''}</span>
        </button>
      </footer>

    </div>
  );
}
