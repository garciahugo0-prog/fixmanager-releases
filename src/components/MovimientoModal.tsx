/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Expense, WorkshopConfig } from '../types';
import { handleCaretPreservingChange } from '../utils/domHelpers';

export interface MovimientoModalProps {
  type: 'entrada' | 'salida';
  config: WorkshopConfig;
  onAddExpense: (exp: Expense) => void;
  onClose: () => void;
}

export function MovimientoModal({ type, config, onAddExpense, onClose }: MovimientoModalProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';
  const sym = config.currencySymbol || '$';
  const isEntrada = type === 'entrada';

  const [desc, setDesc] = useState('');
  const [cash, setCash] = useState('');
  const descRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => descRef.current?.focus(), 80); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cash);
    if (!desc.trim() || !amount || amount <= 0) return;
    onAddExpense({
      id: `M${Date.now().toString().slice(-5)}`,
      description: desc.trim().toUpperCase(),
      category: isEntrada ? 'Inyección' : 'Repuestos',
      amount,
      createdAt: new Date().toISOString(),
      type,
    });
    onClose();
  };

  const modalBg = isLight ? 'bg-white border border-zinc-200' : 'bg-[#111318] border border-zinc-700';
  const headerBg = isRetro ? 'bg-[#000080]' : isLight ? (isEntrada ? 'bg-emerald-700' : 'bg-rose-700') : (isEntrada ? 'bg-emerald-900/60' : 'bg-rose-900/60');
  const inputCls = isLight ? 'bg-zinc-50 border border-zinc-300 text-zinc-800' : 'bg-zinc-900 border border-zinc-700 text-white';
  const labelCls = isLight ? 'text-zinc-700' : 'text-zinc-400';
  const btnCls = isEntrada ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${modalBg}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`${headerBg} px-5 py-4 flex items-center justify-between`} style={{ color: 'white' }}
          ref={el => { if (el) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c: Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
          <div className="flex items-center gap-2">
            {isEntrada ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            <span className="font-black text-sm uppercase tracking-widest">
              {isEntrada ? 'Registrar Entrada' : 'Registrar Salida'}
            </span>
          </div>
          <button onClick={onClose} className="cursor-pointer text-lg font-black opacity-70 hover:opacity-100">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={`text-[11px] font-black uppercase tracking-widest ${labelCls}`}>Concepto</label>
            <input
              ref={descRef}
              type="text"
              value={desc}
              onChange={e => handleCaretPreservingChange(e, setDesc, val => val.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); cashRef.current?.focus(); } if (e.key === 'Escape') onClose(); }}
              placeholder={isEntrada ? 'EJ. DEPÓSITO DE CLIENTE...' : 'EJ. COMPRA DE REFACCIONES...'}
              className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none uppercase ${inputCls}`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`text-[11px] font-black uppercase tracking-widest ${labelCls}`}>Monto</label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{sym}</span>
              <input
                ref={cashRef}
                type="number"
                min="0.01"
                step="0.01"
                value={cash}
                onChange={e => setCash(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
                placeholder="0.00"
                className={`w-full rounded-lg pl-7 pr-3 py-2.5 text-sm outline-none font-mono font-bold ${inputCls}`}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-black cursor-pointer ${isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
              Cancelar
            </button>
            <button type="submit" className={`flex-1 py-2.5 rounded-xl text-sm font-black cursor-pointer transition-all ${btnCls}`}>
              {isEntrada ? '+ Registrar Entrada' : '− Registrar Salida'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default MovimientoModal;
