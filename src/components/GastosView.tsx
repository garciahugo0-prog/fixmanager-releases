/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUpDown, ArrowUpRight, ArrowDownLeft, Printer, PiggyBank,
  X, Tag, Calendar, CreditCard
} from 'lucide-react';
import { Expense, WorkshopConfig } from '../types';
import { buildA4ReportHtml, printA4Report, showToast } from '../utils/a4Reports';

export interface GastosProps {
  expenses: Expense[];
  onAddExpense: (exp: Expense) => void;
  config: WorkshopConfig;
  initialMoveType?: 'entrada' | 'salida';
}

export function GastosView({ expenses, onAddExpense, config, initialMoveType }: GastosProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [desc, setDesc] = useState('');
  const [moveType, setMoveType] = useState<'entrada' | 'salida'>(initialMoveType ?? 'salida');
  const [payMethod, setPayMethod] = useState<'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer'>('Efectivo');

  // Sync moveType when initialMoveType prop changes (e.g. switching between Entradas/Salidas tabs)
  useEffect(() => {
    if (initialMoveType) setMoveType(initialMoveType);
  }, [initialMoveType]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Default categories depending on type
  const [categ, setCateg] = useState<string>('Repuestos');
  const [cash, setCash] = useState<number>(0);

  const descInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Auto focus description input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      descInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize category selection when type changes
  useEffect(() => {
    if (moveType === 'entrada') {
      setCateg('Inyección');
    } else {
      setCateg('Repuestos');
    }
  }, [moveType]);

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      cashInputRef.current?.focus();
    }
  };

  const handleCashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitBtnRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || cash <= 0) return;

    const newEx: Expense = {
      id: `M${Date.now().toString().slice(-5)}`,
      description: desc,
      category: categ,
      amount: cash,
      createdAt: new Date().toISOString(),
      type: moveType,
      paymentMethod: payMethod
    };
    onAddExpense(newEx);
    setDesc('');
    setCash(0);
    setPayMethod('Efectivo');
    setTimeout(() => {
      descInputRef.current?.focus();
    }, 50);
  };

  // Dynamic status math
  const totalEntradasSum = expenses
    .filter(e => e.type === 'entrada')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSalidasSum = expenses
    .filter(e => e.type === 'salida' || !e.type)
    .reduce((sum, e) => sum + e.amount, 0);

  const netCajaBalance = totalEntradasSum - totalSalidasSum;

  return (
    <div 
      className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-6 select-none ${
        isRetro 
          ? 'bg-[#eaeef3] text-black font-sans' 
          : isLight 
            ? 'bg-[#eaeef3] text-zinc-900 font-sans' 
            : 'bg-[#0c0c0e] text-gray-200'
      }`}
      style={isLight ? { backgroundColor: '#eaeef3' } : undefined}
    >
      {/* Header block with visual status counters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1c1d22] pb-5">
        <div>
          <h3 className="text-sm font-display font-black text-blue-400 tracking-wider flex items-center gap-2 uppercase">
            <ArrowUpDown className="w-5 h-5 text-sky-400" /> Movimientos de Caja (Entradas y Salidas)
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-sans">
            Registra y audita entradas y salidas manuales de efectivo para mantener el libro contable de caja cuadrado.
          </p>
        </div>
        
        {/* Quick summary badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Total Entradas:</span>
            <span className="text-xs font-mono font-bold">{config.currencySymbol}{totalEntradasSum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-rose-950/30 border border-rose-900/40 text-rose-400 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Total Salidas:</span>
            <span className="text-xs font-mono font-bold">{config.currencySymbol}{totalSalidasSum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className={`px-3 py-1.5 rounded border flex items-center gap-2 ${
            netCajaBalance >= 0
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-450'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-450'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Balance Neto:</span>
            <span className="text-xs font-mono font-bold">
              {netCajaBalance >= 0 ? '+' : ''}{config.currencySymbol}{netCajaBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (expenses.length === 0) { showToast('⚠️ No hay movimientos registrados para imprimir'); return; }
              const sym = config.currencySymbol || '$';
              const thead = `<thead><tr><th>ID</th><th>Concepto</th><th>Categoría</th><th>Tipo</th><th>Fecha</th><th style="text-align:right">Monto</th></tr></thead>`;
              const tbody = `<tbody>${expenses.map(e => {
                const isEnt = e.type === 'entrada';
                return `<tr>
                  <td style="font-family:monospace">${e.id}</td>
                  <td>${e.description}</td>
                  <td>${(e as any).category || '—'}</td>
                  <td style="color:${isEnt ? '#16a34a' : '#dc2626'};font-weight:700">${isEnt ? 'Entrada' : 'Salida'}</td>
                  <td>${new Date(e.createdAt).toLocaleString('es-MX')}</td>
                  <td style="color:${isEnt ? '#16a34a' : '#dc2626'}">${isEnt ? '+' : '-'}${sym}${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`;
              }).join('')}</tbody>`;
              const summary = `
                <div class="summary-item"><label>Total entradas</label><span style="color:#16a34a">+${sym}${totalEntradasSum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="summary-item"><label>Total salidas</label><span style="color:#dc2626">-${sym}${totalSalidasSum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="summary-item"><label>Balance neto</label><span style="color:${netCajaBalance >= 0 ? '#16a34a' : '#dc2626'}">${netCajaBalance >= 0 ? '+' : ''}${sym}${netCajaBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              `;
              const html = buildA4ReportHtml('Movimientos de Caja', `${expenses.length} movimiento(s) registrados`, config.storeName || 'TALLER', thead + tbody, summary);
              printA4Report(html, config.reportPrinterName);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase bg-sky-700 hover:bg-sky-600 border border-sky-500 text-white rounded transition-all select-none active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left list table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#121316] border border-[#1b1c21] p-4 rounded space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Bitácora de Movimientos Manuales</h4>

            <div className="hidden lg:block overflow-x-auto rounded border border-zinc-900">
              <table className="w-full text-left text-xs bg-[#0b0c0e]">
                <thead className="bg-[#101114] text-[10px] text-zinc-400 font-mono text-left">
                  <tr>
                    <th className="p-2.5 pl-4">ID</th>
                    <th className="p-2.5">Concepto / Detalle</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-center">Método</th>
                    <th className="p-2.5 text-center">Registrado En</th>
                    <th className="p-2.5 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500 font-mono">No hay movimientos registrados</td>
                    </tr>
                  ) : (
                    expenses.map(e => {
                      const isEntrada = e.type === 'entrada';
                      return (
                        <tr 
                          key={e.id} 
                          onClick={() => setSelectedExpense(e)} 
                          className="hover:bg-zinc-900/30 transition-colors cursor-pointer active:scale-[0.99]" 
                          title="Click para ver detalles del movimiento"
                        >
                          <td className="p-2.5 pl-4 font-mono text-zinc-500">{e.id}</td>
                          <td className="p-2.5 font-bold text-gray-200 max-w-[300px] break-all whitespace-normal">{e.description}</td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isEntrada 
                                ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400' 
                                : 'bg-rose-950/60 border border-rose-800/40 text-rose-400'
                            }`}>
                              {isEntrada ? (
                                <>
                                  <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" /> Entrada
                                </>
                              ) : (
                                <>
                                  <ArrowDownLeft className="w-2.5 h-2.5 text-rose-400" /> Salida
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-zinc-400 text-[10px]">
                            {e.paymentMethod || 'Efectivo'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-zinc-500 text-[10px]">
                            {new Date(e.createdAt).toLocaleString('es-MX')}
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${
                            isEntrada ? 'text-emerald-400' : 'text-rose-500'
                          }`}>
                            {isEntrada ? '+' : '-'}{config.currencySymbol}{e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Responsive cards for Cash Movements (Mobile/Tablets) - No Horizontal Scrollbar */}
            <div className="lg:hidden space-y-3 mt-3">
              {expenses.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono rounded bg-zinc-950/40 border border-zinc-900 text-gray-500">
                  No hay movimientos registrados
                </div>
              ) : (
                expenses.map(e => {
                  const isEntrada = e.type === 'entrada';
                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedExpense(e)}
                      className={`transition-all border p-3.5 space-y-2.5 rounded-lg cursor-pointer ${
                        isRetro 
                          ? 'border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white font-sans text-zinc-900' 
                          : isLight 
                            ? 'border-zinc-200 bg-white shadow-xs p-4 text-zinc-950' 
                            : 'border-[#1a1b20] bg-[#0d0e11] text-gray-200 p-4'
                      }`}
                      title="Click para ver detalles del movimiento"
                    >
                      <div className="flex justify-between items-center gap-2 border-b border-zinc-500/10 pb-2">
                        <span className="font-mono text-[10px] text-zinc-500">{e.id}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isEntrada 
                            ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400' 
                            : 'bg-rose-950/60 border border-rose-800/40 text-rose-400'
                        }`}>
                          {isEntrada ? 'Entrada' : 'Salida'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-gray-250'}`}>
                          {e.description}
                        </p>
                        {e.category && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-700/10 border border-zinc-700/20 text-zinc-400 font-mono">
                            {e.category}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-end gap-2 pt-2 border-t border-zinc-500/5 font-mono">
                        <span className="text-[9px] text-zinc-500">
                          {new Date(e.createdAt).toLocaleString('es-MX')}
                        </span>

                        <span className={`text-xs font-extrabold ${
                          isEntrada ? 'text-emerald-400' : 'text-rose-500'
                        }`}>
                          {isEntrada ? '+' : '-'}{config.currencySymbol}{e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right log movement form */}
        <form onSubmit={handleSubmit} className={`p-5 rounded space-y-4 h-fit ${
          isRetro 
            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black' 
            : isLight 
              ? 'bg-white border border-zinc-200 text-zinc-900 shadow' 
              : 'bg-[#121316] border border-[#1b1c21]'
        }`}>
          <h4 className={`text-xs font-display font-black uppercase tracking-widest flex items-center gap-1.5 pb-3 border-b ${
            isRetro 
              ? 'text-blue-900 border-[#808080] bg-[#dfdfdf]' 
              : isLight 
                ? 'text-zinc-800 border-zinc-200' 
                : 'text-zinc-300 border-[#1c1d22]'
          }`}>
            <PiggyBank className={`w-4 h-4 ${isRetro ? 'text-blue-900' : 'text-sky-400'}`} /> Registrar Movimiento Manual
          </h4>

          {/* Type Selector (Entrada / Salida) Tabs */}
          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase font-bold block ${isLight ? 'text-zinc-700' : 'text-zinc-500'}`}>Tipo de Movimiento</label>
            <div className={`grid grid-cols-2 gap-2 p-1 rounded border ${
              isRetro 
                ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' 
                : isLight 
                  ? 'bg-zinc-50 border border-zinc-200' 
                  : 'bg-[#090a0c] border border-zinc-900'
            }`}>
              <button
                type="button"
                onClick={() => setMoveType('entrada')}
                className={`py-1.5 rounded text-[10px] tracking-wider uppercase font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  moveType === 'entrada'
                    ? (isRetro ? 'bg-emerald-700 text-white shadow font-sans' : 'bg-emerald-600 text-white shadow')
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                <ArrowUpRight className={`w-3.5 h-3.5 ${moveType === 'entrada' ? 'text-white' : 'text-zinc-500'}`} />
                Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => setMoveType('salida')}
                className={`py-1.5 rounded text-[10px] tracking-wider uppercase font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  moveType === 'salida'
                    ? (isRetro ? 'bg-[#c00000] text-white shadow font-sans' : 'bg-[#e11d48] text-white shadow')
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                <ArrowDownLeft className={`w-3.5 h-3.5 ${moveType === 'salida' ? 'text-white' : 'text-zinc-500'}`} />
                Salida (-)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Descripción / Concepto</label>
            <input
              type="text"
              required
              ref={descInputRef}
              onKeyDown={handleDescKeyDown}
              placeholder={moveType === 'entrada' ? 'Ej. Cambio inicial adicional provisto por dueño' : 'Ej. Compra 5 mallas Oled para iPhone'}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className={`w-full focus:outline-none px-2.5 py-1.5 text-xs ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black font-mono' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-blue-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-blue-500 rounded text-white'}`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Cargo de Monto ({config.currencySymbol})</label>
            <input
              type="number"
              min={1}
              ref={cashInputRef}
              onKeyDown={handleCashKeyDown}
              value={cash || ''}
              placeholder="Ej. $450"
              onChange={e => setCash(Number(e.target.value) || 0)}
              className={`w-full focus:outline-none rounded px-2.5 py-1.5 text-xs font-mono font-bold ${
                isRetro 
                  ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' 
                  : isLight 
                    ? 'bg-white border border-zinc-300 text-zinc-900' 
                    : 'bg-[#08080a] border border-[#2d2f36] text-white font-mono'
              } ${
                moveType === 'entrada'
                  ? 'focus:border-emerald-500 text-emerald-800'
                  : 'focus:border-rose-500 text-rose-500'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] uppercase font-bold ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>Método de Pago</label>
            <select
              value={payMethod}
              onChange={e => setPayMethod(e.target.value as any)}
              className={`w-full focus:outline-none rounded px-2.5 py-1.5 text-xs font-bold ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black font-mono' : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-blue-500' : 'bg-[#08080a] border border-[#2d2f36] focus:border-blue-500 text-white'}`}
            >
              <option value="Efectivo" className="text-zinc-900 bg-white">Efectivo (Caja Chica)</option>
              <option value="Tarjeta" className="text-zinc-900 bg-white">Tarjeta (Débito/Crédito)</option>
              <option value="Tarjeta/Transfer" className="text-zinc-900 bg-white">Transferencia / SPEI</option>
            </select>
          </div>

          <button
            type="submit"
            ref={submitBtnRef}
            className={`w-full py-2.5 active:scale-98 text-white font-black text-[11px] tracking-wider rounded uppercase cursor-pointer transition-colors shadow ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
                : moveType === 'entrada'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {moveType === 'entrada' ? 'Registrar Entrada de Dinero +' : 'Registrar Salida de Dinero -'}
          </button>
        </form>
      </div>

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100">
          <div className={`w-full max-w-md flex flex-col relative overflow-hidden animate-scale-up ${
            isRetro 
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 font-sans shadow-2xl'
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                : 'bg-[#0c0d11] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
          }`}>
            {/* Cabecera */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro 
                ? 'bg-[#000080] border-[#808080] text-white p-2'
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  : 'bg-[#111217] border-zinc-800 text-zinc-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isRetro 
                    ? 'p-1.5 bg-[#102575] border border-white/20 text-white font-black' 
                    : isLight 
                      ? 'bg-sky-100 border border-sky-300 text-sky-700' 
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                }`}>
                  <PiggyBank className="w-4 h-4 text-current animate-pulse" />
                </div>
                <div>
                  <h3 className={`text-xs font-mono font-black uppercase tracking-widest ${isRetro ? 'text-white' : 'text-zinc-400'}`}>CONSULTA DE MOVIMIENTO</h3>
                  <span className="text-[10px] font-mono block text-sky-450 font-bold">{selectedExpense.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedExpense(null)} 
                type="button"
                className={`w-8 h-8 flex items-center justify-center transition-all cursor-pointer rounded-lg hover:text-white ${
                  isRetro 
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-zinc-300 text-black font-bold font-mono' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-6 space-y-6 flex flex-col overflow-y-auto max-h-[75vh]">
              {/* Monto Grande */}
              <div className="text-center space-y-2 py-4 border-b border-dashed border-zinc-800/15">
                <span className={`text-3xl font-mono font-extrabold tracking-tight ${
                  selectedExpense.type === 'entrada' ? 'text-emerald-400' : 'text-rose-500'
                }`}>
                  {selectedExpense.type === 'entrada' ? '+' : '-'}{config.currencySymbol}{selectedExpense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
                    selectedExpense.type === 'entrada' 
                      ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400' 
                      : 'bg-rose-950/60 border border-rose-800/40 text-rose-400'
                  }`}>
                    {selectedExpense.type === 'entrada' ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400 animate-bounce" /> Entrada de Dinero
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="w-3 h-3 text-rose-400 animate-bounce" /> Salida / Gasto
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Atributos */}
              <div className="space-y-4 font-sans text-xs">
                {/* Concepto / Descripción */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Concepto de Movimiento</span>
                  <p className={`p-3 rounded-lg font-bold text-sm leading-relaxed border ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-mono' 
                      : isLight 
                        ? 'bg-zinc-50 border border-zinc-200 text-zinc-900' 
                        : 'bg-zinc-900/60 border-[#1c1d22] text-white'
                  }`}>
                    {selectedExpense.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Categoría */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Categoría</span>
                    <div className={`p-2.5 rounded-lg font-bold flex items-center gap-2 border ${
                      isRetro 
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-700' 
                        : isLight 
                          ? 'bg-zinc-50 border border-zinc-200 text-zinc-700' 
                          : 'bg-zinc-900/45 border-[#1c1d22] text-zinc-300'
                    }`}>
                      <Tag className="w-3.5 h-3.5 text-sky-400" />
                      <span>{selectedExpense.category}</span>
                    </div>
                  </div>

                  {/* ID Único */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">ID Referencia</span>
                    <div className={`p-2.5 rounded-lg font-mono font-bold border ${
                      isRetro 
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-700' 
                        : isLight 
                          ? 'bg-zinc-50 border border-zinc-200 text-zinc-700' 
                          : 'bg-zinc-900/45 border-[#1c1d22] text-zinc-300'
                    }`}>
                      {selectedExpense.id}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fecha y Hora */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Fecha y Hora de Registro</span>
                    <div className={`p-2.5 rounded-lg font-mono font-bold flex items-center gap-1.5 border ${
                      isRetro 
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-700' 
                        : isLight 
                          ? 'bg-zinc-50 border border-zinc-200 text-zinc-700' 
                          : 'bg-zinc-900/45 border-[#1c1d22] text-zinc-300'
                    }`}>
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate">{new Date(selectedExpense.createdAt).toLocaleString('es-MX')}</span>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Método de Pago</span>
                    <div className={`p-2.5 rounded-lg font-mono font-bold flex items-center gap-1.5 border ${
                      isRetro 
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-700' 
                        : isLight 
                          ? 'bg-zinc-50 border border-zinc-200 text-zinc-700' 
                          : 'bg-zinc-900/45 border-[#1c1d22] text-zinc-300'
                    }`}>
                      <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                      <span>{selectedExpense.paymentMethod || 'Efectivo'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className={`p-4 border-t flex justify-end shrink-0 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-50 border-zinc-200' 
                  : 'bg-[#0e0f13] border-[#1c1d22]'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className={`px-4 py-1.5 text-xs font-bold font-sans uppercase rounded ${
                  isRetro 
                    ? 'border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] bg-[#dfdfdf] text-black font-extrabold active:bg-zinc-300 cursor-pointer shadow-xs' 
                    : 'bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 cursor-pointer transition-colors px-5 py-2 rounded-xl shadow-xs'
                }`}
              >
                Cerrar Detalle
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default GastosView;
