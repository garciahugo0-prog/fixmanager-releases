import React, { useState, useMemo, useRef } from 'react';
import { Search, Barcode, Trash2, Printer, Package, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { InventoryItem, WorkshopConfig } from '../types';
import { buildProductLabelHtml } from '../utils/ticketBuilder';

interface QueueItem {
  id: string;
  name: string;
  code: string;
  price: number;
  brand?: string;
  qty: number;
}

interface AbastoEntry {
  date: string;
  items: { id: string; name: string; barcode: string; price: number; amount: number }[];
}

interface EtiquetasViewProps {
  inventory: InventoryItem[];
  config: WorkshopConfig;
}

interface ProductRowProps {
  item: InventoryItem;
  onAdd: (qty: number) => void;
  isRetro: boolean;
  cardBg: string;
  border: string;
  textPrimary: string;
  textMuted: string;
}

const ProductRow: React.FC<ProductRowProps> = ({ item, onAdd, isRetro, cardBg, border, textPrimary, textMuted }) => {
  const [qty, setQty] = useState(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: cardBg, border, borderRadius: isRetro ? 0 : 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 10, color: textMuted, marginTop: 1 }}>
          ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{item.code ? ` · ${item.code}` : ''}{item.brand ? ` · ${item.brand}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button onClick={() => setQty(q => Math.max(1, q - 1))}
          style={{ width: 22, height: 22, border, borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: textPrimary }}>
          <Minus style={{ width: 9, height: 9 }} />
        </button>
        <input
          type="number" min={1} value={qty}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          style={{ width: 36, textAlign: 'center', padding: '2px 2px', border, borderRadius: 4, background: 'transparent', color: textPrimary, fontSize: 12, fontWeight: 900, outline: 'none' }}
        />
        <button onClick={() => setQty(q => q + 1)}
          style={{ width: 22, height: 22, border, borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: textPrimary }}>
          <Plus style={{ width: 9, height: 9 }} />
        </button>
      </div>
      <button
        onClick={() => { onAdd(qty); setQty(1); }}
        style={{ padding: '5px 10px', fontSize: 10, fontWeight: 800, background: '#f59e0b', color: 'white', border: 'none', borderRadius: isRetro ? 0 : 6, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0 }}
      >
        + Cola
      </button>
    </div>
  );
};

// ── Fila de cola con cantidad editable directamente ───────────────────────
interface QueueRowProps {
  item: QueueItem;
  isRetro: boolean; isLight: boolean;
  cardBg: string; border: string; textPrimary: string; textMuted: string;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}
const QueueRow: React.FC<QueueRowProps> = ({ item, isRetro, isLight, cardBg, border, textPrimary, textMuted, onChangeQty, onRemove }) => {
  const [draft, setDraft] = useState(String(item.qty));
  const [hint, setHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza si el qty externo cambia (ej. se agrega otra vez el mismo producto)
  React.useEffect(() => { setDraft(String(item.qty)); }, [item.qty]);

  const commit = (raw: string) => {
    const n = parseInt(raw);
    if (!isNaN(n) && n >= 1) {
      onChangeQty(n);
      setHint(`Se imprimirán ${n} etiqueta${n !== 1 ? 's' : ''} de este producto`);
    } else {
      setDraft(String(item.qty)); // revierte si inválido
      setHint('Cantidad inválida — debe ser 1 o más');
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHint(null), 2500);
  };

  return (
    <div style={{ background: cardBg, border, borderRadius: isRetro ? 0 : 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          <div style={{ fontSize: 10, color: textMuted, marginTop: 1 }}>${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{item.code ? ` · ${item.code}` : ''}</div>
        </div>
        {/* Input de cantidad directamente editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cant.</span>
          <input
            type="number"
            min={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
            style={{
              width: 52, textAlign: 'center', padding: '4px 6px',
              border: hint && hint.includes('inválida') ? '1px solid #ef4444' : (isLight ? '1px solid #cbd5e1' : '1px solid #2d3148'),
              borderRadius: isRetro ? 0 : 6, background: isLight ? '#f8fafc' : '#0d0f14',
              color: textPrimary, fontSize: 14, fontWeight: 900, outline: 'none',
            }}
          />
        </div>
        <button onClick={onRemove} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0 }}>
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
      {/* Notificación inline */}
      {hint && (
        <div style={{
          padding: '4px 12px 6px',
          fontSize: 10, fontWeight: 600,
          color: hint.includes('inválida') ? '#ef4444' : '#10b981',
          background: hint.includes('inválida') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
          borderTop: `1px solid ${hint.includes('inválida') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
        }}>
          {hint.includes('inválida') ? '✕ ' : '✓ '}{hint}
        </div>
      )}
    </div>
  );
};

export default function EtiquetasView({ inventory, config }: EtiquetasViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  // ── Colores por tema ──────────────────────────────────────────────────────
  const bg       = isRetro ? (isLight ? '#dfdfdf' : '#2c2e38') : isLight ? '#f1f5f9' : '#0b0d12';
  const cardBg   = isRetro ? (isLight ? '#eaeef3' : '#383c48') : isLight ? '#ffffff'  : '#111318';
  const sideBg   = isRetro ? (isLight ? '#d4dae2' : '#303440') : isLight ? '#f8fafc'  : '#0d0f14';
  const border   = isRetro ? (isLight ? '2px solid #808080' : '2px solid #5a6275') : isLight ? '1px solid #e2e8f0' : '1px solid #1e2130';
  const textPrimary = isRetro ? (isLight ? '#031124' : '#ffffff') : isLight ? '#0f172a' : '#f1f5f9';
  const textMuted   = isRetro ? (isLight ? '#6b7280' : '#8c95a5') : isLight ? '#64748b' : '#6b7280';
  const inputBg     = isRetro ? '#ffffff' : isLight ? '#ffffff' : '#0d0f14';
  const inputBorder = isRetro ? (isLight ? '2px solid #808080' : '2px solid #5a6275') : isLight ? '1px solid #cbd5e1' : '1px solid #2d3148';
  const headerBg    = isRetro ? (isLight ? '#000080' : 'linear-gradient(to right, #1d4ed8, #0f172a)') : isLight ? '#1a3a6b' : '#11131e';

  const [search, setSearchRaw] = useState('');
  const setSearch = (val: string) => {
    setSearchRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [activeIndex, setActiveIndex] = useState(-1);
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fixmanager_label_print_queue') || '[]');
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('fixmanager_label_print_queue', JSON.stringify(queue));
  }, [queue]);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [replaceNotif, setReplaceNotif] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const abastoLog: AbastoEntry[] = useMemo(() => {
    try {
      const logsRaw = localStorage.getItem('fixmanager_replenishment_logs') || '[]';
      const logs: any[] = JSON.parse(logsRaw);
      return logs.map(log => {
        const items = log.items.map((it: any) => {
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
          date: log.date,
          items
        };
      });
    } catch {
      return [];
    }
  }, [inventory]);

  const filtered = useMemo(() => {
    const cleanSearch = search.replace(/,(?!\s)/g, '-');
    if (!cleanSearch.trim()) return [];
    const q = cleanSearch.toLowerCase().trim();
    return inventory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.code && i.code.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [search, inventory]);

  const addToQueue = (item: { id: string; name: string; price: number; brand?: string; code?: string }, qty: number) => {
    setQueue(prev => {
      const existing = prev.find(q => q.id === item.id);
      if (existing) return prev.map(q => q.id === item.id ? { ...q, qty: q.qty + qty } : q);
      return [...prev, { id: item.id, name: item.name, code: item.code || '', price: item.price, brand: item.brand, qty }];
    });
    setFeedback(`✓ ${item.name} agregado`);
    setTimeout(() => setFeedback(null), 1800);
  };

  const confirm = (title: string, message: string, confirmLabel: string, onConfirm: () => void, danger = false) =>
    setConfirmPending({ title, message, confirmLabel, danger, onConfirm });

  const showReplace = (msg: string) => {
    setReplaceNotif(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setReplaceNotif(null), 3000);
  };

  const doImport = (entry: AbastoEntry, singleItem?: { id: string; name: string; price: number; brand?: string; code?: string; amount: number }) => {
    if (singleItem) {
      const exists = queue.find(q => q.id === singleItem.id);
      if (exists) {
        setQueue(prev => prev.map(q => q.id === singleItem.id ? { ...q, qty: singleItem.amount } : q));
        showReplace(`Cantidad de "${singleItem.name}" actualizada a ${singleItem.amount} etiqueta${singleItem.amount !== 1 ? 's' : ''}`);
      } else {
        setQueue(prev => [...prev, { id: singleItem.id, name: singleItem.name, code: singleItem.code || '', price: singleItem.price, brand: singleItem.brand, qty: singleItem.amount }]);
        showReplace(`"${singleItem.name}" agregado a la cola`);
      }
    } else {
      const newQueue: QueueItem[] = entry.items.map(i => {
        const inv = inventory.find(inv => inv.id === i.id);
        return { id: i.id, name: i.name, code: inv?.code || i.barcode, price: i.price, brand: inv?.brand, qty: i.amount };
      });
      const dateStr = entry.date.includes('T') ? entry.date : (entry.date + 'T12:00:00');
      const d = new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      setQueue(newQueue);
      showReplace(`Cola cargada con el abasto del ${d} — ${newQueue.length} producto${newQueue.length !== 1 ? 's' : ''}`);
    }
  };

  const importAbasto = (entry: AbastoEntry, singleItem?: { id: string; name: string; price: number; brand?: string; code?: string; amount: number }) => {
    const willReplace = queue.length > 0 && !singleItem;
    const willUpdate  = !!singleItem && !!queue.find(q => q.id === singleItem.id);

    if (willReplace) {
      const dateStr = entry.date.includes('T') ? entry.date : (entry.date + 'T12:00:00');
      const d = new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      setConfirmPending({
        title: 'Reemplazar cola de impresión',
        message: `La cola actual tiene ${queue.length} producto${queue.length !== 1 ? 's' : ''} y será reemplazada completa con el abasto del ${d} (${entry.items.length} producto${entry.items.length !== 1 ? 's' : ''}).`,
        confirmLabel: 'Sí, reemplazar',
        onConfirm: () => { doImport(entry, singleItem); setConfirmPending(null); },
      });
    } else if (willUpdate) {
      const exists = queue.find(q => q.id === singleItem!.id)!;
      setConfirmPending({
        title: 'Actualizar cantidad en cola',
        message: `"${singleItem!.name}" ya está en la cola con ${exists.qty} etiqueta${exists.qty !== 1 ? 's' : ''}. Se reemplazará con ${singleItem!.amount}.`,
        confirmLabel: 'Sí, reemplazar',
        onConfirm: () => { doImport(entry, singleItem); setConfirmPending(null); },
      });
    } else {
      doImport(entry, singleItem);
    }
  };

  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'vitrina' | 'qr' | 'technical'>(config.labelTemplateStyle || 'standard');

  React.useEffect(() => {
    if (config.labelTemplateStyle) {
      setSelectedTemplate(config.labelTemplateStyle);
    }
  }, [config.labelTemplateStyle]);

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
    setFeedback(`✓ Enviando ${queue.reduce((a, i) => a + i.qty, 0)} etiquetas a imprimir`);
    setTimeout(() => setFeedback(null), 3000);
  };


  const totalLabels = queue.reduce((a, i) => a + i.qty, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Descripción del módulo ── */}
      <div className="modal-dark-header" style={{ padding: '10px 20px', borderBottom: border, background: isRetro ? '#000080' : isLight ? '#1a3a6b' : '#11131e', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Barcode style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />
        <div>
          <span className="text-white retro-white-text" style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', marginRight: 8 }}>Impresión de Etiquetas</span>
          <span className="text-white retro-white-text" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Busca productos, arma una cola de impresión y manda todas las etiquetas a la impresora de un solo golpe. También puedes importar directamente desde el historial de abasto.</span>
        </div>
      </div>

      {/* ── Barra de búsqueda superior ── */}
      <div style={{ padding: '10px 16px', borderBottom: border, background: cardBg, flexShrink: 0, position: 'relative' }}>
        <style>{`
          .etiquetas-search-container {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            padding: 0 14px !important;
            height: 40px !important;
            background: ${isRetro ? (isLight ? '#ffffff' : '#121316') : isLight ? '#f1f5f9' : '#0d0f14'} !important;
            border: 2px solid ${search.trim() ? '#f59e0b' : (isRetro ? (isLight ? '#9ca3af' : '#383c48') : isLight ? '#cbd5e1' : '#2d3148')} !important;
            border-radius: 999px !important;
            transition: border-color 0.15s !important;
            box-shadow: ${search.trim() ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none'} !important;
          }
          .etiquetas-search-container input.premium-search-input.etiquetas-search-input {
            flex: 1 !important;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            border-width: 0px !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            line-height: 1 !important;
            font-size: 13px !important;
            color: ${textPrimary} !important;
            caret-color: ${textPrimary} !important;
          }
          .etiquetas-search-container input.premium-search-input.etiquetas-search-input:focus {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            background-color: transparent !important;
            color: ${textPrimary} !important;
            caret-color: ${textPrimary} !important;
          }
        `}</style>
        <div className="etiquetas-search-container">
          <Search style={{ width: 15, height: 15, color: search.trim() ? '#f59e0b' : textMuted, flexShrink: 0, pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            autoFocus
            type="text"
            className="premium-search-input etiquetas-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveIndex(-1); }}
            onKeyDown={e => {
              if (!filtered.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
                setTimeout(() => {
                  dropdownRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
                }, 0);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
                setTimeout(() => {
                  dropdownRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
                }, 0);
              } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                const item = filtered[activeIndex];
                if (item) { addToQueue(item, 1); setSearch(''); setActiveIndex(-1); }
              } else if (e.key === 'Escape') {
                setSearch(''); setActiveIndex(-1);
              }
            }}
            placeholder="Buscar producto por nombre o código de barras…"
          />
          {search.trim() && (
            <button onClick={() => { setSearch(''); setActiveIndex(-1); searchRef.current?.focus(); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: '0 2px', flexShrink: 0, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
              ×
            </button>
          )}
          {feedback && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap', paddingLeft: 6, borderLeft: '1px solid rgba(16,185,129,0.3)', marginLeft: 4 }}>{feedback}</span>
          )}
        </div>

        {/* ── Resultados de búsqueda ── */}
        {search.trim() && (
          <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 16, right: 16, zIndex: 50, background: cardBg, border: border, maxHeight: 320, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: textMuted }}>Sin resultados para "{search}"</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 6 }}>
              {filtered.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={item.id}
                    data-active={isActive ? 'true' : 'false'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: isActive ? (isRetro ? '#000080' : isLight ? '#e0eaff' : '#1e2d4a') : sideBg,
                      border: isActive ? `1px solid ${isRetro ? '#000080' : '#3b82f6'}` : border,
                      borderRadius: isRetro ? 0 : 8,
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onClick={() => { addToQueue(item, 1); setSearch(''); setActiveIndex(-1); searchRef.current?.focus(); }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: isActive ? (isRetro ? '#fff' : isLight ? '#1e3a8a' : '#93c5fd') : textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 10, color: isActive ? (isRetro ? '#c7d2e8' : isLight ? '#3b82f6' : '#60a5fa') : textMuted, marginTop: 1 }}>
                        ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{item.code ? ` · ${item.code}` : ''}{item.brand ? ` · ${item.brand}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? (isRetro ? '#ffd' : '#3b82f6') : textMuted, textTransform: 'uppercase', flexShrink: 0 }}>
                      {isActive ? '↵ agregar' : `$${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── Layout principal: izquierda = abasto, derecha = cola ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Panel izquierdo: Historial de Abasto ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: border, background: sideBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: border, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Historial de Abasto</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {!abastoLog.length ? (
              <div style={{ textAlign: 'center', padding: '30px 12px', color: textMuted }}>
                <Package style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.3 }} />
                <div style={{ fontSize: 11 }}>Sin historial aún</div>
                <div style={{ fontSize: 9, marginTop: 4 }}>Aparecerá aquí cada vez que reabasteces productos</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {abastoLog.map(entry => {
                  const dateStr = entry.date.includes('T') ? entry.date : (entry.date + 'T12:00:00');
                  const d = new Date(dateStr);
                  const formatted = isNaN(d.getTime())
                    ? 'Fecha de abasto'
                    : d.toLocaleDateString('es-MX', entry.date.includes('T')
                        ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                        : { weekday: 'short', day: 'numeric', month: 'short' });
                  const totalPzs = entry.items.reduce((a, i) => a + i.amount, 0);
                  const isOpen = expandedDates.has(entry.date);
                  return (
                    <div key={entry.date} style={{ background: cardBg, border, borderRadius: isRetro ? 0 : 8, overflow: 'hidden' }}>
                      {/* Encabezado de fecha */}
                      <div
                        onClick={() => setExpandedDates(s => { const n = new Set(s); isOpen ? n.delete(entry.date) : n.add(entry.date); return n; })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11, color: textPrimary, textTransform: 'capitalize' }}>{formatted}</div>
                          <div style={{ fontSize: 9, color: textMuted }}>{entry.items.length} prod · {totalPzs} pz</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); importAbasto(entry); }}
                            style={{ padding: '3px 8px', fontSize: 9, fontWeight: 800, background: '#f59e0b', color: 'white', border: 'none', borderRadius: isRetro ? 0 : 5, cursor: 'pointer', textTransform: 'uppercase' }}
                            title={queue.length > 0 ? 'Reemplazará la cola actual' : 'Cargar en cola'}
                          >
                            {queue.length > 0 ? '↺ Reemplazar' : '+ Todo'}
                          </button>
                          {isOpen
                            ? <ChevronDown style={{ width: 12, height: 12, color: textMuted }} />
                            : <ChevronRight style={{ width: 12, height: 12, color: textMuted }} />}
                        </div>
                      </div>
                      {/* Items expandidos */}
                      {isOpen && (
                        <div style={{ borderTop: border }}>
                          {entry.items.map(i => (
                            <div key={i.id} style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', gap: 6, borderBottom: `1px solid ${isLight ? '#f1f5f9' : '#1a1d26'}` }}>
                              <span style={{ flex: 1, fontSize: 10, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
                              <span style={{ fontSize: 9, color: textMuted, flexShrink: 0 }}>{i.amount} pz</span>
                              <button
                                onClick={() => { const inv = inventory.find(inv => inv.id === i.id); importAbasto(entry, { id: i.id, name: i.name, price: i.price, brand: inv?.brand, code: inv?.code || i.barcode, amount: i.amount }); }}
                                style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', background: 'transparent', border: `1px solid #f59e0b`, color: '#f59e0b', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0 }}
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
        </div>

        {/* ── Panel derecho: Cola de impresión ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Notificación de reemplazo */}
          {replaceNotif && (
            <div style={{ padding: '7px 16px', fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>↺</span> {replaceNotif}
            </div>
          )}
          {/* Header cola */}
          <div style={{ padding: '10px 16px', borderBottom: border, background: cardBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: textPrimary }}>
                Cola de impresión
              </div>
              <div style={{ fontSize: 9, color: textMuted, marginTop: 1 }}>
                {queue.length > 0 ? `${queue.length} producto${queue.length !== 1 ? 's' : ''} · ${totalLabels} etiqueta${totalLabels !== 1 ? 's' : ''}` : 'Vacía — agrega productos'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {queue.length > 0 && (
                <button
                  onClick={() => confirm(
                    'Vaciar cola de impresión',
                    `Se eliminarán los ${queue.length} producto${queue.length !== 1 ? 's' : ''} de la cola. Esta acción no se puede deshacer.`,
                    'Sí, vaciar cola',
                    () => { setQueue([]); setConfirmPending(null); showReplace('Cola vaciada'); },
                    true
                  )}
                  style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'transparent', border: '1px solid #ef444440', borderRadius: isRetro ? 0 : 6, cursor: 'pointer' }}
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => {
                  if (!queue.length) return;
                  confirm(
                    'Confirmar impresión',
                    `Se enviarán ${totalLabels} etiqueta${totalLabels !== 1 ? 's' : ''} de ${queue.length} producto${queue.length !== 1 ? 's' : ''} a la impresora "${config.labelPrinterBrand || 'predeterminada'}".`,
                    'Sí, imprimir',
                    () => { printAll(); setConfirmPending(null); }
                  );
                }}
                disabled={!queue.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 11, fontWeight: 900,
                  background: queue.length ? '#f59e0b' : (isLight ? '#e2e8f0' : '#1e2130'),
                  color: queue.length ? 'white' : textMuted,
                  border: 'none', borderRadius: isRetro ? 0 : 7, cursor: queue.length ? 'pointer' : 'not-allowed',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}
              >
                <Printer style={{ width: 13, height: 13 }} />
                Imprimir {totalLabels > 0 ? `(${totalLabels})` : ''}
              </button>
            </div>
          </div>

          {/* Selector rápido de plantilla para este lote */}
          <div style={{ padding: '8px 16px', borderBottom: border, background: isLight ? '#f8fafc' : '#0e1017', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: textMuted }}>
              🎨 Diseño del lote:
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { id: 'standard', label: '🏷️ Estándar' },
                { id: 'vitrina', label: '🏪 Vitrina POS' },
                { id: 'qr', label: '📱 QR Híbrido' },
                { id: 'technical', label: '📋 Ficha Técnica' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id as any)}
                  style={{
                    padding: '3px 8px', fontSize: 10, fontWeight: 800,
                    borderRadius: isRetro ? 0 : 5, cursor: 'pointer',
                    background: selectedTemplate === t.id ? '#f59e0b' : 'transparent',
                    color: selectedTemplate === t.id ? 'white' : textMuted,
                    border: selectedTemplate === t.id ? '1px solid #f59e0b' : border,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de cola */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {!queue.length ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: textMuted }}>
                <Barcode style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: 0.2 }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>Cola vacía</div>
                <div style={{ fontSize: 10, marginTop: 6 }}>Busca productos arriba o importa desde el historial de abasto</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {queue.map(item => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    isRetro={isRetro}
                    isLight={isLight}
                    cardBg={cardBg}
                    border={border}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    onChangeQty={qty => setQueue(q => q.map(i => i.id === item.id ? { ...i, qty } : i))}
                    onRemove={() => confirm(
                      'Quitar producto de la cola',
                      `"${item.name}" se eliminará de la lista de impresión.`,
                      'Sí, quitar',
                      () => { setQueue(q => q.filter(i => i.id !== item.id)); setConfirmPending(null); },
                      true
                    )}
                  />
                ))}
                {/* Totalizador */}
                <div style={{ marginTop: 4, padding: '9px 14px', background: headerBg, borderRadius: isRetro ? 0 : 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{queue.length} producto{queue.length !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'white', fontSize: 13, fontWeight: 900 }}>{totalLabels} etiqueta{totalLabels !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de confirmación ── */}
      {confirmPending && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
          <div style={{ background: cardBg, border, borderRadius: isRetro ? 0 : 12, overflow: 'hidden', maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Título */}
            <div className="modal-dark-header" style={{ padding: '12px 20px', background: confirmPending.danger ? '#7f1d1d' : (isRetro ? '#000080' : isLight ? '#1a3a6b' : '#11131e'), display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>{confirmPending.danger ? '🗑️' : '🖨️'}</span>
              <span className="text-white retro-white-text" style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{confirmPending.title}</span>
            </div>
            {/* Mensaje */}
            <div style={{ padding: '18px 20px 20px', fontSize: 12, fontWeight: 500, color: textPrimary, lineHeight: 1.6 }}>
              {confirmPending.message}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 20px 18px' }}>
              <button
                onClick={() => setConfirmPending(null)}
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: 'transparent', border, borderRadius: isRetro ? 0 : 7, cursor: 'pointer', color: textMuted }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPending.onConfirm}
                style={{ padding: '7px 18px', fontSize: 12, fontWeight: 900, background: confirmPending.danger ? '#dc2626' : '#f59e0b', color: 'white', border: 'none', borderRadius: isRetro ? 0 : 7, cursor: 'pointer' }}
              >
                {confirmPending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
