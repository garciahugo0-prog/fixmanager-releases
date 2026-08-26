/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Landmark, Scissors, Printer } from 'lucide-react';
import {
  RepairOrder, Sale, Expense, WorkshopConfig, CorteEntry, AperturaEntry
} from '../types';
import { buildA4ReportHtml, printA4Report, showToast } from '../utils/a4Reports';

const formatDateToDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export interface CortesViewProps {
  orders: RepairOrder[];
  sales: Sale[];
  expenses: Expense[];
  config: WorkshopConfig;
  cortesHistorial: CorteEntry[];
  onOpenCorteCaja: () => void;
  onSaveCorte?: (corte: CorteEntry) => Promise<void> | void;
  startingCash: number;
  aperturas?: AperturaEntry[];
  sessionId?: number;
}

export function CortesView({ orders, sales, expenses, config, cortesHistorial, onOpenCorteCaja, startingCash, aperturas = [], sessionId }: CortesViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [selectedCorte, setSelectedCorte] = useState<any | null>(null);

  // Totales de la sesión actual
  const today = new Date().toISOString().slice(0, 10);
  const formattedToday = today.split('-').reverse().join('/');
  
  // 1. Calculate sales for this session only (or today if undefined), separating cash portion of net POS sales
  const daySales = sales.filter(s => !s.isCancelled && (sessionId !== undefined ? s.sessionId === sessionId : s.createdAt?.startsWith(today)));
  let cashSalesSum = 0;
  daySales.forEach(s => {
    const saleRepairsTotal = s.items
      .filter(item => item.itemId.startsWith('repair-'))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);

    const saleNetTotal = Math.max(0, s.total - saleRepairsTotal);

    if (s.paymentMethod === 'Efectivo') {
      cashSalesSum += saleNetTotal;
    } else if (s.paymentMethod === 'Tarjeta/Transfer' || s.paymentMethod === 'Tarjeta') {
      // Card net sales, not added to cashSalesSum
    } else if (s.paymentMethod === 'Múltiple' || s.paymentMethod === 'Mixto') {
      const efeMatch = s.confirmationCode?.match(/Efe:\s*\$?([0-9.]+)/);
      const cardMatch = s.confirmationCode?.match(/T\/T:\s*\$?([0-9.]+)/);
      const efeAmt = efeMatch ? parseFloat(efeMatch[1]) : 0;
      const cardAmt = cardMatch ? parseFloat(cardMatch[1]) : 0;

      if (efeAmt === 0 && cardAmt === 0) {
        cashSalesSum += saleNetTotal;
      } else {
        const totalMatch = efeAmt + cardAmt;
        const cashRatio = totalMatch > 0 ? efeAmt / totalMatch : 0;
        const repairsCash = saleRepairsTotal * cashRatio;
        cashSalesSum += Math.max(0, efeAmt - repairsCash);
      }
    } else {
      cashSalesSum += saleNetTotal;
    }
  });

  // 2. Calculate orders for this session only (or today if undefined) (advances only, cash only)
  const dayOrders = orders.filter(o => sessionId !== undefined ? o.sessionId === sessionId : o.createdAt?.startsWith(today));
  let repairsCashSum = 0;
  dayOrders.forEach(o => {
    if (o.advancePayment && o.advancePayment > 0) {
      if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
        o.advancePaymentBreakdown.forEach(b => {
          if (b.method === 'Efectivo') {
            repairsCashSum += b.amount;
          } else if (b.method === 'Tarjeta' || b.method === 'Tarjeta/Transfer') {
            // Card advances, not added to repairsCashSum
          } else {
            repairsCashSum += b.amount; // fallback
          }
        });
      } else {
        repairsCashSum += o.advancePayment; // default to cash if no breakdown
      }
    }
  });

  // 3. Outflows & Manual Inflows for this session (or today if undefined) (cash only)
  const dayExpenses = expenses.filter(e => sessionId !== undefined ? e.sessionId === sessionId : e.createdAt?.startsWith(today));
  
  let manualEntradasSum = 0;
  dayExpenses.forEach(e => {
    if (e.type === 'entrada') {
      if (e.category === 'Servicio Técnico') {
        if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
          // Card technical services, not added to repairsCashSum
        } else {
          repairsCashSum += e.amount;
        }
      } else {
        if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
          // Card manual inflows, not added to manualEntradasSum
        } else {
          manualEntradasSum += e.amount;
        }
      }
    }
  });

  const totalIncome = cashSalesSum + repairsCashSum + manualEntradasSum;
  
  const totalOutflow = dayExpenses
    .filter(e => e.type === 'salida' || !e.type)
    .reduce((sum, e) => sum + e.amount, 0);

  const expectedCash = startingCash + totalIncome - totalOutflow;

  const formatLabel = (k: string) => {
    const map: Record<string, string> = {
      b1000: '$1000', b500: '$500', b200: '$200', b100: '$100', b50: '$50', b20: '$20',
      c20: '20¢ moneda', c10: '10¢ moneda', c5: '$5 moneda', c2: '$2 moneda', c1: '$1 moneda', c50c: '50¢ moneda'
    };
    return map[k] || k;
  };

  // ─── RETRO THEME ──────────────────────────────────────────────────────────
  if (isRetro) {
    return (
      <div 
        className="flex-1 p-3 md:p-5 bg-[#eaeef3] overflow-y-auto select-none font-sans text-black"
        style={{ backgroundColor: '#eaeef3' }}
      >
        {/* Header */}
        <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center gap-2 mb-3 shadow-sm">
          <Landmark className="w-4 h-4 shrink-0" />
          <span className="font-black text-xs uppercase tracking-wider">Cortes de Caja — Historial y Arqueo</span>
          <span className="ml-auto bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
            {cortesHistorial.length} registros
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* HISTORIAL */}
          <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 p-2 flex flex-col h-[500px]">
            <div className="bg-[#000080] text-white px-2 py-1 text-[10px] font-bold uppercase mb-2 flex items-center justify-between">
              <span>📅 Cortes Registrados</span>
              <span>{cortesHistorial.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {cortesHistorial.length === 0 ? (
                <div className="text-center py-16 text-[10px] text-zinc-500 font-mono leading-relaxed">
                  Sin cortes registrados.<br />Realice su primer arqueo<br />desde el panel derecho.
                </div>
              ) : (
                cortesHistorial.map(c => {
                  const isSelected = selectedCorte?.id === c.id;
                  const diff = c.diferencia ?? 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCorte(isSelected ? null : c)}
                      className={`p-2 border-2 cursor-pointer transition-all text-[10px] font-mono ${
                        isSelected
                          ? 'bg-[#000080] text-white border-t-[#4040d0] border-l-[#4040d0] border-b-[#00004a] border-r-[#00004a]'
                          : 'bg-[#eaeef3] border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black">{c.id}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isLight
                              ? (diff === 0 ? 'bg-emerald-100 text-emerald-850'
                                 : diff > 0 ? 'bg-sky-100 text-sky-800'
                                 : 'bg-red-100 text-red-800')
                              : (diff === 0 ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/40 font-black'
                                 : diff > 0 ? 'bg-sky-950/50 text-sky-300 border border-sky-900/40 font-black'
                                 : 'bg-red-950/50 text-red-300 border border-red-900/40 font-black')
                        }`}>
                          {diff === 0 ? '✓ CUADRADO' : diff > 0 ? `+${config.currencySymbol}${diff}` : `-${config.currencySymbol}${Math.abs(diff)}`}
                        </span>
                      </div>
                      <div className={isSelected ? 'text-zinc-200' : 'text-zinc-600'}>
                        <div>{formatDateToDMY(c.date)} — {c.time}</div>
                        <div>Físico: <span className={`font-bold ${isSelected ? 'text-white' : 'text-black'}`}>{config.currencySymbol}{c.fisico}</span></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DETALLE O RESUMEN */}
          <div className="lg:col-span-2 space-y-3">
            {selectedCorte ? (
              <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 p-3 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between bg-[#000080] text-white px-2 py-1">
                  <div className="text-[10px] font-bold">
                    {selectedCorte.id} — {formatDateToDMY(selectedCorte.date)} {selectedCorte.time}
                  </div>
                  <button
                    onClick={() => setSelectedCorte(null)}
                    className="text-[9px] font-bold bg-[#dfdfdf] text-black px-2 py-0.5 hover:bg-zinc-300 cursor-pointer border border-zinc-500"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="bg-[#eaeef3] border border-zinc-400 p-2 text-center">
                    <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Físico Contado</div>
                    <div className="font-black text-base text-black">{config.currencySymbol}{selectedCorte.fisico?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-[#eaeef3] border border-zinc-400 p-2 text-center">
                    <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Estimado Sistema</div>
                    <div className="font-black text-base text-zinc-700">{config.currencySymbol}{selectedCorte.estimado?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`border p-2 text-center ${
                    (selectedCorte.diferencia ?? 0) === 0 ? 'bg-emerald-50 border-emerald-400' :
                    (selectedCorte.diferencia ?? 0) > 0 ? 'bg-sky-50 border-sky-400' : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Diferencia</div>
                    <div className={`font-black text-base ${
                      (selectedCorte.diferencia ?? 0) === 0 ? 'text-emerald-700' :
                      (selectedCorte.diferencia ?? 0) > 0 ? 'text-sky-700' : 'text-red-700'
                    }`}>
                      {(selectedCorte.diferencia ?? 0) === 0 ? '±0.00' : `${(selectedCorte.diferencia ?? 0) > 0 ? '+' : ''}${config.currencySymbol}${Math.abs(selectedCorte.diferencia ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>

                {selectedCorte.denominations && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-black uppercase text-zinc-700">Billetes y Monedas Contados:</div>
                    <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
                      {Object.entries(selectedCorte.denominations).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="bg-white border border-zinc-300 px-2 py-1 flex justify-between">
                          <span className="text-zinc-500">{formatLabel(k)}</span>
                          <span className="font-bold text-black">×{v as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCorte.comment && (
                  <div className="bg-white border border-zinc-400 p-2 text-[10px] font-mono text-zinc-700 whitespace-pre-wrap">
                    <span className="font-bold text-zinc-500 block text-[9px] mb-1">OBSERVACIONES:</span>
                    "{selectedCorte.comment}"
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Resumen del día */}
                <div className="bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 p-3 space-y-2">
                  <div className="bg-[#000080] text-white px-2 py-1 text-[10px] font-bold uppercase mb-2">
                    💰 Flujo de Caja de Hoy ({formattedToday})
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#eaeef3] border border-zinc-400 p-2">
                      <div className="text-zinc-600 text-[9px] uppercase font-bold">Fondo Inicial</div>
                      <div className="font-black text-sm">{config.currencySymbol}{startingCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-[#eaeef3] border border-zinc-400 p-2">
                      <div className="text-emerald-700 text-[9px] uppercase font-bold">Ingresos</div>
                      <div className="font-black text-sm text-emerald-800">+{config.currencySymbol}{totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-[#eaeef3] border border-zinc-400 p-2">
                      <div className="text-red-700 text-[9px] uppercase font-bold">Gastos/Salidas</div>
                      <div className="font-black text-sm text-red-800">-{config.currencySymbol}{totalOutflow.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-[#000080] text-white border border-zinc-400 p-2">
                      <div className="text-[9px] uppercase font-bold text-white retro-white-text">Esperado en Caja</div>
                      <div className="font-black text-sm text-white retro-white-text">{config.currencySymbol}{expectedCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <button
                    onClick={onOpenCorteCaja}
                    className="w-full py-2.5 bg-[#000080] hover:bg-[#0000a0] text-white retro-white-text text-[10px] font-black uppercase cursor-pointer border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a] flex items-center justify-center gap-2 mt-2 active:border-t-[#00004a] active:border-l-[#00004a] active:border-b-[#4040c0] active:border-r-[#4040c0]"
                  >
                    <Scissors className="w-3.5 h-3.5" /> REALIZAR CORTE DE CAJA CON CONTADOR
                  </button>
                </div>

                {/* Hint */}
                <div className="bg-[#fffbe6] border border-yellow-500 p-2.5 text-[10px] font-sans text-zinc-700 leading-relaxed">
                  💡 <strong>Cómo funciona:</strong> Haga clic en un corte del historial para ver su desglose completo de billetes y observaciones. Use el botón azul para realizar un nuevo arqueo y cerrar la sesión del día.
                </div>
              </>
            )}
          </div>
        </div>

        {/* HISTORIAL DE APERTURAS — retro */}
        {aperturas.length > 0 && (
          <div className="mt-4 bg-[#eaeef3] border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 p-3">
            <div className="bg-[#000080] text-white px-2 py-1 text-[9px] font-black uppercase mb-2 flex items-center justify-between">
              <span>🔓 Historial de Aperturas de Caja</span>
              <span>{aperturas.length} registro{aperturas.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1.5">
              {aperturas.slice(0, 20).map((a, i) => (
                <div key={a.id || i} className="flex items-center justify-between gap-3 px-2 py-1.5 bg-white border border-zinc-300 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${a.rol === 'admin' ? 'bg-amber-600' : 'bg-sky-600'}`}>
                      {(a.aperturadoPor || '?').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-bold text-zinc-900">{a.aperturadoPor}</p>
                      <p className="text-[9px] text-zinc-500">{a.rol === 'admin' ? 'Dueño/Admin' : 'Empleado'} · Sesión #{a.sesion}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-500">{formatDateToDMY(a.fecha)}</p>
                    <p className="font-black text-zinc-800">{a.hora}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-500">Fondo</p>
                    <p className="font-black text-emerald-700">{config.currencySymbol}{Number(a.fondoInicial).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── MODERN THEME (DARK & LIGHT) ──────────────────────────────────────────
  const cardCls = isLight
    ? 'bg-white border border-zinc-200 rounded-xl'
    : 'bg-[#121316] border border-[#1b1c21] rounded-xl';
  const innerCardCls = isLight
    ? 'bg-zinc-50 border border-zinc-200 rounded-lg'
    : 'bg-[#0b0c0f] border border-zinc-700 rounded-lg';
  const textPrimary = isLight ? 'text-zinc-900' : 'text-white';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-500';
  const textSub = isLight ? 'text-zinc-400' : 'text-zinc-400';

  return (
    <div 
      className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-5 select-none ${isLight ? 'bg-[#eaeef3]' : 'bg-[#0c0c0e]'}`}
      style={isLight ? { backgroundColor: '#eaeef3' } : undefined}
    >
      {/* Page header */}
      <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLight ? 'bg-pink-50 text-pink-600' : 'bg-pink-950/30 text-pink-400'}`}>
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-black tracking-wide ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              CORTES DE CAJA
            </h3>
            <p className={`text-[10px] ${textMuted}`}>
              Historial de arqueos y cierre de jornada
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            isLight ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-pink-950/20 text-pink-400 border-pink-900/30'
          }`}>
            {cortesHistorial.length} corte{cortesHistorial.length !== 1 ? 's' : ''} registrado{cortesHistorial.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              const sym = config.currencySymbol || '$';
              if (cortesHistorial.length === 0) { showToast('⚠️ No hay cortes registrados para imprimir'); return; }
              const thead = `<thead><tr><th>ID</th><th>Fecha/Hora</th><th>Técnico</th><th>Fondo Inicial</th><th>Estimado</th><th>Físico Contado</th><th style="text-align:right">Diferencia</th></tr></thead>`;
              const tbody = `<tbody>${cortesHistorial.map(c => {
                const diff = c.diferencia ?? 0;
                return `<tr>
                  <td style="font-family:monospace">${c.id}</td>
                  <td>${new Date(c.createdAt || c.date || '').toLocaleString('es-MX')}</td>
                  <td>${c.technicianName || '—'}</td>
                  <td>${sym}${(c.startingCash ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${sym}${(c.estimado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${sym}${(c.fisico ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="color:${diff === 0 ? '#16a34a' : diff > 0 ? '#2563eb' : '#dc2626'};font-weight:700">${diff >= 0 ? '+' : ''}${sym}${diff.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`;
              }).join('')}</tbody>`;
              const totalDiff = cortesHistorial.reduce((s, c) => s + (c.diferencia ?? 0), 0);
              const summary = `
                <div class="summary-item"><label>Total cortes</label><span>${cortesHistorial.length}</span></div>
                <div class="summary-item"><label>Diferencia acumulada</label><span style="color:${totalDiff >= 0 ? '#16a34a' : '#dc2626'}">${totalDiff >= 0 ? '+' : ''}${sym}${totalDiff.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              `;
              const html = buildA4ReportHtml('Historial de Cortes de Caja', `${cortesHistorial.length} arqueo(s) registrado(s)`, config.storeName || 'TALLER', thead + tbody, summary);
              printA4Report(html, config.reportPrinterName);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isLight ? 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* HISTORIAL — columna izquierda */}
        <div className={`${cardCls} p-4 flex flex-col`} style={{ maxHeight: '540px', minHeight: '300px' }}>
          <div className={`pb-3 mb-3 border-b ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Historial de Cortes
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {cortesHistorial.length === 0 ? (
              <div className={`text-center py-16 text-[10px] leading-relaxed ${textMuted}`}>
                <div className="text-3xl mb-3">📭</div>
                Sin cortes registrados aún.
                <br />
                Realice el primer arqueo desde el panel derecho.
              </div>
            ) : (
              cortesHistorial.map(c => {
                const isSelected = selectedCorte?.id === c.id;
                const diff = c.diferencia ?? 0;
                const diffColor = diff === 0 ? 'emerald' : diff > 0 ? 'sky' : 'red';
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCorte(isSelected ? null : c)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-pink-50 border-pink-300 shadow-sm'
                          : 'bg-zinc-800/60 border-pink-500/40 shadow-md shadow-pink-500/5'
                        : isLight
                          ? 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
                          : 'bg-[#0b0c0f] border-zinc-700 hover:bg-[#131418] hover:border-zinc-600'
                    }`}
                  >
                    {/* ID + fecha */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black font-mono ${isSelected ? (isLight ? 'text-pink-700' : 'text-pink-400') : textPrimary}`}>
                        {c.id}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                        diffColor === 'emerald'
                          ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                          : diffColor === 'sky'
                          ? isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-950/20 text-sky-400 border-sky-900/30'
                          : isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-950/20 text-red-400 border-red-900/30'
                      }`}>
                        {diff === 0 ? '✓ Cuadrado' : diff > 0 ? `+${config.currencySymbol}${Math.abs(diff)}` : `-${config.currencySymbol}${Math.abs(diff)}`}
                      </span>
                    </div>

                    {/* Monto y fecha */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className={`text-base font-black font-mono ${textPrimary}`}>
                          {config.currencySymbol}{Number(c.fisico).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[9px] ${textMuted} mt-0.5`}>
                          Físico contado
                        </div>
                      </div>
                      <div className={`text-right text-[9px] ${textSub}`}>
                        <div>{formatDateToDMY(c.date)}</div>
                        <div>{c.time}</div>
                      </div>
                    </div>

                    {/* Operador */}
                    {c.user && (
                      <div className={`mt-2 pt-2 border-t text-[8px] truncate ${isLight ? 'border-zinc-100 text-zinc-400' : 'border-zinc-800 text-zinc-600'}`}>
                        Por: {c.user}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETALLE O RESUMEN DEL DÍA — columna derecha */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCorte ? (
            /* ── DETALLE DE CORTE ─── */
            <div className={`${cardCls} p-5 space-y-4 animate-fade-in`}>
              {/* Header del detalle */}
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                <div>
                  <h4 className={`text-xs font-black tracking-wide ${isLight ? 'text-pink-600' : 'text-pink-400'}`}>
                    Detalle — {selectedCorte.id}
                  </h4>
                  <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                    {formatDateToDMY(selectedCorte.date)} · {selectedCorte.time} · Por: {selectedCorte.user}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCorte(null)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                    isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                  }`}
                >
                  ← Volver al historial
                </button>
              </div>

              {/* Tres métricas principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`${innerCardCls} p-4 text-center`}>
                  <div className={`text-[9px] uppercase font-black mb-1 ${textMuted}`}>Físico Contado</div>
                  <div className={`text-lg font-black font-mono ${textPrimary}`}>
                    {config.currencySymbol}{Number(selectedCorte.fisico).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`${innerCardCls} p-4 text-center`}>
                  <div className={`text-[9px] uppercase font-black mb-1 ${textMuted}`}>Estimado Sistema</div>
                  <div className={`text-lg font-black font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {config.currencySymbol}{Number(selectedCorte.estimado).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`p-4 text-center rounded-lg border ${
                  (selectedCorte.diferencia ?? 0) === 0
                    ? isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/30'
                    : isLight ? 'bg-red-50 border-red-200' : 'bg-red-950/20 border-red-900/30'
                }`}>
                  <div className={`text-[9px] uppercase font-black mb-1 ${textMuted}`}>Diferencia</div>
                  <div className={`text-lg font-black font-mono ${
                    (selectedCorte.diferencia ?? 0) === 0
                      ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                      : (selectedCorte.diferencia ?? 0) > 0
                        ? isLight ? 'text-sky-700' : 'text-sky-400'
                        : isLight ? 'text-red-700' : 'text-red-400'
                  }`}>
                    {(selectedCorte.diferencia ?? 0) === 0
                      ? '±0.00'
                      : `${(selectedCorte.diferencia ?? 0) > 0 ? '+' : ''}${config.currencySymbol}${Math.abs(selectedCorte.diferencia ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                </div>
              </div>

              {/* Desglose de denominaciones */}
              {selectedCorte.denominations && Object.values(selectedCorte.denominations).some(Boolean) && (
                <div className={`${innerCardCls} p-4 space-y-3`}>
                  <h5 className={`text-[9px] font-black uppercase tracking-wider ${textMuted}`}>
                    💴 Efectivo Contado por Denominación
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(selectedCorte.denominations).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className={`flex justify-between items-center px-2.5 py-2 rounded-lg border text-[9px] font-mono ${
                        isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/50 border-zinc-800'
                      }`}>
                        <span className={textMuted}>{formatLabel(k)}</span>
                        <span className={`font-black ${textPrimary}`}>×{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedCorte.comment && (
                <div className={`${innerCardCls} p-3 whitespace-pre-wrap text-[10px] font-mono ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>
                  <span className={`text-[9px] uppercase font-black block mb-1.5 ${textMuted}`}>Observaciones del operador:</span>
                  "{selectedCorte.comment}"
                </div>
              )}
            </div>
          ) : (
            /* ── RESUMEN DEL DÍA ─── */
            <div className="space-y-4 animate-fade-in">
              {/* Métricas del día */}
              <div className={`${cardCls} p-5 space-y-4`}>
                <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                  <h4 className={`text-[10px] font-black uppercase tracking-wider ${textMuted}`}>
                    Flujo de Caja Hoy ({formattedToday})
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`${innerCardCls} p-3.5 text-center space-y-1`}>
                    <div className={`text-[9px] uppercase font-black ${textMuted}`}>Fondo Inicial</div>
                    <div className={`text-base font-black font-mono ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>
                      {config.currencySymbol}{startingCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`${innerCardCls} p-3.5 text-center space-y-1`}>
                    <div className={`text-[9px] uppercase font-black ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Ingresos</div>
                    <div className={`text-base font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      +{config.currencySymbol}{totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`${innerCardCls} p-3.5 text-center space-y-1`}>
                    <div className={`text-[9px] uppercase font-black ${isLight ? 'text-rose-600' : 'text-rose-500'}`}>Gastos</div>
                    <div className={`text-base font-black font-mono ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                      -{config.currencySymbol}{totalOutflow.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`p-3.5 text-center space-y-1 rounded-lg border ${
                    isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/15 border-amber-800/30'
                  }`}>
                    <div className={`text-[9px] uppercase font-black ${isLight ? 'text-amber-600' : 'text-amber-500'}`}>Esperado en Caja</div>
                    <div className={`text-base font-black font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                      {config.currencySymbol}{expectedCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Botón de corte */}
                <button
                  onClick={onOpenCorteCaja}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98 ${
                    isLight
                      ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-[0_4px_12px_rgba(219,39,119,0.25)]'
                      : 'bg-pink-600 hover:bg-pink-700 text-white shadow-[0_4px_16px_rgba(219,39,119,0.3)] ring-1 ring-pink-500/30'
                  }`}
                >
                  <Scissors className="w-4 h-4 animate-pulse" />
                  Realizar Corte de Caja con Contador
                </button>
              </div>

              {/* Guía rápida */}
              <div className={`${cardCls} p-4 space-y-3`}>
                <h4 className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-pink-600' : 'text-pink-400'}`}>
                  🛡️ Guía de Auditoría
                </h4>
                <div className={`space-y-2 text-[10px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {[
                    { n: '1', t: 'Seleccione un corte del historial para ver su desglose completo de billetes y monedas.' },
                    { n: '2', t: 'Para cerrar la jornada, pulse "Realizar Corte de Caja". Eso cerrará la sesión y pedirá un nuevo inicio de sesión.' },
                    { n: '3', t: 'El sistema calculará diferencias entre lo físico contado y el estimado teórico del sistema.' },
                  ].map(s => (
                    <div key={s.n} className={`flex gap-2.5 p-2.5 rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0b0c0f] border-zinc-700'}`}>
                      <span className={`text-[9px] font-black w-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-500'}`}>{s.n}.</span>
                      <span className="leading-relaxed">{s.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HISTORIAL DE APERTURAS — sección independiente al final */}
      {aperturas.length > 0 && (
        <div className={`${cardCls} p-4`}>
          <div className={`pb-3 mb-3 border-b flex items-center gap-2 ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <span className="text-base">🔓</span>
            <h4 className={`text-[10px] font-black uppercase tracking-wider flex-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Historial de Aperturas de Caja
            </h4>
            <span className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{aperturas.length} registro{aperturas.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {aperturas.slice(0, 30).map((a, i) => (
              <div key={a.id || i} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800'}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white ${a.rol === 'admin' ? 'bg-amber-600' : 'bg-sky-600'}`}>
                    {(a.aperturadoPor || '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>{a.aperturadoPor}</p>
                    <p className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {a.rol === 'admin' ? 'Dueño/Admin' : 'Empleado'} · Sesión #{a.sesion}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{formatDateToDMY(a.fecha)}</p>
                  <p className={`text-[10px] font-black font-mono ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{a.hora}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[9px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Fondo inicial</p>
                  <p className="font-black font-mono text-emerald-500">{config.currencySymbol}{Number(a.fondoInicial).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CortesView;
