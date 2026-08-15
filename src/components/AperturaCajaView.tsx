/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Landmark, Play, Coins } from 'lucide-react';
import { WorkshopConfig, AppUser } from '../types';

interface AperturaCajaViewProps {
  config: WorkshopConfig;
  onOpenCaja: (saldoInicial: number) => void;
  currentUser?: AppUser | null;
  users?: AppUser[];
  asModal?: boolean;
}

// ── Representación visual de billetes y monedas (idéntica a CorteCajaModal) ──
interface MXNDenominationGraphicProps {
  value: number;
  isCoin?: boolean;
}

function MXNDenominationGraphic({ value, isCoin = false }: MXNDenominationGraphicProps) {
  if (isCoin) {
    const coinMap: Record<number, { outer: string; ring: string; core: string; text: string; size: number }> = {
      20:  { outer: '#92400e', ring: '#d97706', core: '#fbbf24', text: '#1c0a00', size: 38 },
      10:  { outer: '#78350f', ring: '#b45309', core: '#f59e0b', text: '#1c0a00', size: 34 },
      5:   { outer: '#854d0e', ring: '#ca8a04', core: '#eab308', text: '#1c0a00', size: 32 },
      2:   { outer: '#374151', ring: '#6b7280', core: '#9ca3af', text: '#111827', size: 30 },
      1:   { outer: '#1f2937', ring: '#4b5563', core: '#6b7280', text: '#f9fafb', size: 28 },
      0.5: { outer: '#7c2d12', ring: '#c2410c', core: '#fb923c', text: '#1c0a00', size: 24 },
    };
    const c = coinMap[value] ?? coinMap[1];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
        <div style={{ width: c.size, height: c.size, borderRadius: '50%', background: c.outer, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.6)', flexShrink: 0 }}>
          <div style={{ width: '78%', height: '78%', borderRadius: '50%', background: c.ring, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '65%', height: '65%', borderRadius: '50%', background: c.core, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: 8, fontWeight: 900, color: c.text, fontFamily: 'monospace', lineHeight: 1, userSelect: 'none' }}>
                {value >= 1 ? `${value}` : '50¢'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    let bgGradient = "";
    let borderStyle = "border-white/10";
    let securityRibbon = null;
    let titleOfBill = "BANCO DE MÉXICO";
    let subLabel = "";
    let serialNumber = `A${value}${Math.floor(value * 1.34)}H`;
    let portraitEmoji = "";
    let windowEmoji = "";

    if (value === 1000) {
      bgGradient = "from-[#2c3e50] via-[#435f7a] to-[#202e3b]";
      borderStyle = "border-slate-500/40 shadow-[0_0_10px_rgba(44,62,80,0.5)]";
      securityRibbon = (
        <div className="absolute left-[20%] top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#bdc3c7] via-[#7f8c8d] to-[#bdc3c7] opacity-80 flex flex-col justify-around py-1">
          <div className="w-full h-[2px] bg-white/20" />
          <div className="w-full h-[2px] bg-white/20" />
          <div className="w-full h-[2px] bg-white/20" />
        </div>
      );
      subLabel = "Hidalgo y Madero";
      portraitEmoji = "🔔";
      windowEmoji = "🐆";
    } else if (value === 500) {
      bgGradient = "from-[#0f2c59] via-[#1f56a3] to-[#0c1e3d]";
      borderStyle = "border-blue-400/40 shadow-[0_0_10px_rgba(31,86,163,0.5)]";
      securityRibbon = (
        <div className="absolute left-[25%] top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#1abc9c] via-[#2ecc71] to-[#16a085] opacity-80 flex flex-col justify-around py-1">
          <div className="w-full h-[2px] bg-white/40" />
          <div className="w-full h-[2px] bg-white/40" />
        </div>
      );
      subLabel = "Benito Juárez";
      portraitEmoji = "⚖️";
      windowEmoji = "🐳";
    } else if (value === 200) {
      bgGradient = "from-[#114022] via-[#228243] to-[#0c2a16]";
      borderStyle = "border-emerald-500/40 shadow-[0_0_10px_rgba(34,130,67,0.5)]";
      securityRibbon = (
        <div className="absolute left-[28%] top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#f1c40f] via-[#f39c12] to-[#d35400] opacity-80 flex flex-col justify-around py-1">
          <div className="w-full h-[2px] bg-white/20" />
          <div className="w-full h-[2px] bg-white/20" />
        </div>
      );
      subLabel = "Hidalgo y Morelos";
      portraitEmoji = "🦅";
      windowEmoji = "🌵";
    } else if (value === 100) {
      bgGradient = "from-[#800f2f] via-[#c9184a] to-[#590d22]";
      borderStyle = "border-rose-500/40 shadow-[0_0_10px_rgba(201,24,74,0.5)]";
      securityRibbon = null;
      subLabel = "Sor Juana Inés";
      portraitEmoji = "✍️";
      windowEmoji = "🦋";
    } else if (value === 50) {
      bgGradient = "from-[#4a1259] via-[#862e9c] to-[#340c3f]";
      borderStyle = "border-purple-400/40 shadow-[0_0_10px_rgba(134,46,156,0.5)]";
      securityRibbon = null;
      subLabel = "Ajolote Xochimilco";
      portraitEmoji = "🦎";
      windowEmoji = "🌊";
    } else if (value === 20) {
      bgGradient = "from-[#023e2b] via-[#0cbd7c] to-[#a60f35]";
      borderStyle = "border-emerald-450/40 shadow-[0_0_10px_rgba(12,189,124,0.4)]";
      securityRibbon = null;
      subLabel = "Bicentenario";
      portraitEmoji = "⚔️";
      windowEmoji = "🐊";
    }

    const characterPortrait = (
      <div className="w-[18px] h-[18px] rounded-full bg-black/25 border border-white/10 flex items-center justify-center text-[10px] shrink-0">
        {portraitEmoji}
      </div>
    );

    const transparentWindow = (
      <div className="w-[16px] h-[16px] rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-[9px] shrink-0 overflow-hidden">
        {windowEmoji}
      </div>
    );

    return (
      <div className="w-full max-w-[145px] px-1 flex justify-center">
        <div className={`banknote relative w-full h-[38px] md:h-[40px] rounded border ${borderStyle} bg-gradient-to-r ${bgGradient} flex items-center justify-between overflow-hidden cursor-pointer hover:brightness-110 active:brightness-95 transition-all select-none group`}>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[length:4px_4px] opacity-70 pointer-events-none" />
          {securityRibbon}
          <div className="flex-1 h-full py-0.5 px-1.5 flex flex-col justify-between relative z-10 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[5px] font-bold text-white/50 tracking-tighter uppercase font-mono leading-none">
                {titleOfBill}
              </span>
              <span className="text-[4px] font-bold text-red-400 font-mono tracking-tighter leading-none select-none opacity-85">
                {serialNumber}
              </span>
            </div>
            <div className="flex items-center justify-between gap-0.5 my-auto">
              {characterPortrait}
              <div className="flex flex-col text-right min-w-0 overflow-hidden">
                <span className="text-[14px] md:text-[15px] font-black font-mono leading-none tracking-tight text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
                  ${value}
                </span>
                <span className="text-[5.5px] uppercase font-bold text-white/40 tracking-tighter truncate max-w-[62px] leading-tight select-none">
                  {subLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between leading-none text-[3.8px] text-white/30 uppercase tracking-tighter font-mono">
              <span>PEsoS mEXiCaNOS</span>
              <span>BdeM dG</span>
            </div>
          </div>
          <div className="h-full w-[26px] bg-black/15 border-l border-white/5 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
            {transparentWindow}
            <div className="absolute right-[1.5px] top-1 bottom-1 w-[1.5px] flex flex-col justify-between items-center opacity-40">
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
          <div className="absolute inset-[0.5px] border border-white/10 rounded-sm pointer-events-none" />
        </div>
      </div>
    );
  }
}

function MXNCoinsStackGraphic({ isLight = false }: { isLight?: boolean }) {
  return (
    <div className="w-full max-w-[140px] px-1 flex justify-center">
      <div className={`flex items-center justify-between p-1.5 w-full rounded h-[32px] md:h-[35px] relative overflow-hidden ${isLight ? 'bg-zinc-200 border border-zinc-300' : 'bg-slate-900/50 border border-slate-800/70'}`}>
        <div className="flex items-center -space-x-2 relative shrink-0 scale-95 origin-left">
          <div className="w-4.5 h-4.5 rounded-full border border-amber-600 bg-amber-50 flex items-center justify-center scale-90 opacity-75 shadow-sm">
            <div className="w-[60%] h-[60%] rounded-full bg-slate-300 flex items-center justify-center">
              <span className="text-[5px] font-bold text-slate-900">2</span>
            </div>
          </div>
          <div className="w-5.5 h-5.5 rounded-full border border-slate-300 bg-slate-400 flex items-center justify-center z-10 shadow-md">
            <div className="w-[60%] h-[60%] rounded-full bg-amber-600 flex items-center justify-center">
              <span className="text-[6px] font-black text-amber-100">10</span>
            </div>
          </div>
          <div className="w-5 h-5 rounded-full border border-amber-600 bg-amber-50 flex items-center justify-center scale-95 z-20 shadow-sm">
            <div className="w-[60%] h-[60%] rounded-full bg-slate-300 flex items-center justify-center">
              <span className="text-[5px] font-bold text-slate-100">5</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col text-right pr-0.5 overflow-hidden">
          <span className="text-[9px] font-black text-amber-500 uppercase leading-none">Monedas</span>
          <span className="text-[6px] uppercase font-bold text-slate-400 font-mono scale-90 origin-right mt-0.5 truncate max-w-[55px]">Metálicas</span>
        </div>
      </div>
    </div>
  );
}

// ── Contador de billetes (grid 3 columnas igual a CorteCajaModal) ──────────
function BillCounter({
  isRetro, isLight, sym,
  q1000, q500, q200, q100, q50, q20,
  setQ1000, setQ500, setQ200, setQ100, setQ50, setQ20,
  coinsAmount, setCoinsAmount,
}: {
  isRetro: boolean; isLight: boolean; sym: string;
  q1000: number; q500: number; q200: number; q100: number; q50: number; q20: number;
  setQ1000: (v:number)=>void; setQ500: (v:number)=>void; setQ200: (v:number)=>void;
  setQ100: (v:number)=>void; setQ50: (v:number)=>void; setQ20: (v:number)=>void;
  coinsAmount: number; setCoinsAmount: (v:number)=>void;
}) {
  const [showCoinsPanel, setShowCoinsPanel] = useState(false);
  const [coinQ20, setCoinQ20] = useState(0);
  const [coinQ10, setCoinQ10] = useState(0);
  const [coinQ5,  setCoinQ5]  = useState(0);
  const [coinQ2,  setCoinQ2]  = useState(0);
  const [coinQ1,  setCoinQ1]  = useState(0);
  const [coinQ05, setCoinQ05] = useState(0);

  useEffect(() => {
    const total = coinQ20*20 + coinQ10*10 + coinQ5*5 + coinQ2*2 + coinQ1*1 + coinQ05*0.5;
    if (total > 0) setCoinsAmount(total);
  }, [coinQ20, coinQ10, coinQ5, coinQ2, coinQ1, coinQ05]);

  const totalBilletes = q1000*1000 + q500*500 + q200*200 + q100*100 + q50*50 + q20*20;
  const totalFisico = totalBilletes + coinsAmount;

  const inputCls = `corte-qty-input w-full text-center rounded-lg py-2.5 font-bold font-mono text-xs outline-none ${
    isRetro ? 'bg-white border border-zinc-500 text-black shadow-inner'
    : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-blue-500'
    : 'bg-slate-900 border border-slate-800/70 text-white focus:border-blue-500'
  }`;
  const subtotalCls = `w-full text-center rounded-lg py-2.5 text-xs font-black font-mono ${
    isRetro ? 'bg-zinc-200 border border-zinc-400 text-slate-800'
    : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700'
    : 'bg-slate-900/40 border border-slate-800/70 text-slate-300'
  }`;

  return (
    <div className="space-y-2.5">
      {/* Header cols */}
      <div className="grid grid-cols-12 gap-3 text-center text-[10px] font-bold uppercase font-mono px-1">
        <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Cantidad</span>
        <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Denominación</span>
        <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Importe</span>
      </div>

      {/* Billetes */}
      {[
        { denom: 1000, value: q1000, set: setQ1000 },
        { denom: 500,  value: q500,  set: setQ500  },
        { denom: 200,  value: q200,  set: setQ200  },
        { denom: 100,  value: q100,  set: setQ100  },
        { denom: 50,   value: q50,   set: setQ50   },
        { denom: 20,   value: q20,   set: setQ20   },
      ].map(row => (
        <div key={row.denom} className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-4 flex items-center">
            <input type="number" value={row.value === 0 ? '' : row.value}
              onChange={e => { const v = parseInt(e.target.value)||0; row.set(v<0?0:v); }}
              className={inputCls} placeholder="0" />
          </div>
          <div className="col-span-4 flex justify-center">
            <MXNDenominationGraphic value={row.denom} isCoin={false} />
          </div>
          <div className="col-span-4 flex items-center">
            <div className={subtotalCls}>{(row.value * row.denom).toFixed(0)}</div>
          </div>
        </div>
      ))}

      {/* Monedas */}
      <div className="grid grid-cols-12 gap-3 items-center">
        <div className="col-span-4 flex items-center">
          <div className="relative flex items-center justify-center w-full">
            <span className={`absolute left-2.5 text-[10px] font-bold font-mono z-10 ${isRetro ? 'text-zinc-600' : 'text-sky-500'}`}>$</span>
            <input type="number" value={coinsAmount === 0 ? '' : coinsAmount}
              onChange={e => setCoinsAmount(parseFloat(e.target.value)||0)}
              onDoubleClick={() => setShowCoinsPanel(true)}
              title="Escribe el total de monedas. Doble clic para desglose detallado."
              className={`corte-qty-input w-full text-center pl-5 pr-1 rounded-lg py-2.5 font-bold font-mono text-xs outline-none ${
                isRetro ? 'bg-white border border-zinc-500 text-black shadow-inner'
                : isLight ? 'bg-sky-50 text-sky-700 border border-sky-200 focus:border-sky-500'
                : 'bg-sky-950/20 text-sky-400 border border-sky-900/60 focus:border-sky-500'
              }`} placeholder="0.0" />
          </div>
        </div>
        <div className="col-span-4 flex justify-center">
          <MXNCoinsStackGraphic isLight={isLight} />
        </div>
        <div className="col-span-4">
          <div className={subtotalCls}>{coinsAmount.toFixed(1)}</div>
        </div>
      </div>

      <div onClick={() => setShowCoinsPanel(true)}
        className={`text-center py-1.5 text-[9.5px] font-black uppercase tracking-wider cursor-pointer animate-pulse font-mono ${
          isRetro ? 'text-blue-800' : isLight ? 'text-blue-600' : 'text-blue-400'
        }`}>
        ✦ Doble clic en monedas para desglose detallado ✦
      </div>

      {/* Total */}
      <div className={`px-3 py-2.5 rounded-xl border flex items-center justify-between ${
        isRetro ? 'bg-emerald-50 border-emerald-300'
        : isLight ? 'bg-emerald-50 border-emerald-200'
        : 'bg-emerald-950/40 border border-emerald-500/30'
      }`}>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Total contado</span>
        <span className={`text-lg font-black font-mono ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>{sym}{totalFisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      {/* Panel desglose monedas */}
      {showCoinsPanel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <div className={`w-full max-w-sm overflow-hidden flex flex-col font-sans ${
            isRetro ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_12px_rgba(0,0,0,0.5)] text-black'
            : isLight ? 'bg-white border border-zinc-200 rounded-lg shadow-2xl text-zinc-900'
            : 'bg-[#0f172a] border border-slate-800 rounded-lg shadow-2xl text-slate-100'
          }`} onClick={e => e.stopPropagation()}>
            <div className={`modal-dark-header px-3 py-2 flex items-center justify-between ${
              isRetro ? 'bg-[#000080] text-white'
              : isLight ? 'bg-zinc-100 border-b border-zinc-200'
              : 'bg-slate-900 border-b border-slate-800'
            }`}>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className={`text-[11px] font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-zinc-900' : 'text-slate-200'}`}>Conteo de monedas</span>
              </div>
              <button onClick={() => setShowCoinsPanel(false)}
                className={`w-5 h-5 flex items-center justify-center text-xs font-black cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-zinc-900'
                  : 'rounded hover:bg-red-500 hover:text-white transition-colors text-zinc-500 bg-zinc-200'
                }`}>×</button>
            </div>
            <div className={`p-4 space-y-3 ${isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50' : 'bg-[#090d16]'}`}>
              <div className={`p-3 rounded-lg text-center border ${
                isRetro ? 'bg-white border-zinc-500'
                : isLight ? 'bg-teal-50 border-teal-200'
                : 'bg-teal-950/45 border-teal-800/40'
              }`}>
                <div className={`text-[9px] font-bold uppercase tracking-widest font-mono ${isRetro ? 'text-zinc-500' : isLight ? 'text-teal-700' : 'text-teal-400'}`}>Total de Monedas</div>
                <div className={`text-2xl font-mono font-black mt-0.5 ${isRetro ? 'text-emerald-800' : isLight ? 'text-teal-700' : 'text-teal-300'}`}>
                  {sym}{coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-center text-[9px] font-bold uppercase font-mono px-1">
                  <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Cantidad</span>
                  <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Denominación</span>
                  <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Importe</span>
                </div>
                {[
                  { denom: 20,  value: coinQ20, set: setCoinQ20 },
                  { denom: 10,  value: coinQ10, set: setCoinQ10 },
                  { denom: 5,   value: coinQ5,  set: setCoinQ5  },
                  { denom: 2,   value: coinQ2,  set: setCoinQ2  },
                  { denom: 1,   value: coinQ1,  set: setCoinQ1  },
                  { denom: 0.5, value: coinQ05, set: setCoinQ05 },
                ].map(row => (
                  <div key={row.denom} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 flex items-center">
                      <input type="number" value={row.value === 0 ? '' : row.value}
                        onChange={e => { const v = parseInt(e.target.value)||0; row.set(v<0?0:v); }}
                        className={`corte-qty-input w-full text-center rounded-lg py-2 font-bold font-mono text-xs outline-none ${
                          isRetro ? 'bg-white border border-zinc-500 text-black shadow-inner'
                          : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-blue-500'
                          : 'bg-slate-900 border border-slate-800/80 text-white focus:border-blue-500'
                        }`} placeholder="0" />
                    </div>
                    <div className="col-span-4 flex justify-center">
                      <MXNDenominationGraphic value={row.denom} isCoin />
                    </div>
                    <div className="col-span-4 flex items-center">
                      <div className={`w-full text-center rounded-lg py-2 text-[11px] font-black font-mono ${
                        isRetro ? 'bg-zinc-200 border border-zinc-400 text-slate-800'
                        : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                        : 'bg-slate-900/40 border border-slate-800 text-slate-300'
                      }`}>{(row.value * row.denom).toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowCoinsPanel(false)}
                className={`w-full py-2 text-xs font-black uppercase rounded-lg cursor-pointer transition-colors ${
                  isRetro ? 'bg-[#000080] text-white'
                  : isLight ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-700 hover:bg-blue-600 text-white'
                }`}>Confirmar monedas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AperturaCajaView({ config, onOpenCaja, currentUser, users = [], asModal = false }: AperturaCajaViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = (typeof window !== 'undefined' && document.body.classList.contains('mode-dark'))
    ? false
    : (typeof window !== 'undefined' && document.body.classList.contains('mode-light'))
      ? true
      : config.themeMode === 'light';
  const sym = config.currencySymbol || '$';

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  // ── Altura del teclado virtual (Capacitor) para empujar el sheet ─────────
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const mainInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileScreen) return;
    let showL: any = null;
    let hideL: any = null;
    import('@capacitor/keyboard')
      .then(({ Keyboard }) => {
        Keyboard.addListener('keyboardDidShow', (info: { keyboardHeight: number }) => {
          setKeyboardHeight(info.keyboardHeight);
          // Hacer scroll al input para que quede visible
          setTimeout(() => {
            mainInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }).then((l: any) => { showL = l; });
        Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        }).then((l: any) => { hideL = l; });
      })
      .catch(() => {});
    return () => {
      if (showL) showL.remove();
      if (hideL) hideL.remove();
    };
  }, [isMobileScreen]);

  const [q1000, setQ1000] = useState(0);
  const [q500,  setQ500]  = useState(0);
  const [q200,  setQ200]  = useState(0);
  const [q100,  setQ100]  = useState(0);
  const [q50,   setQ50]   = useState(0);
  const [q20,   setQ20]   = useState(0);

  const [coinQ20, setCoinQ20] = useState(0);
  const [coinQ10, setCoinQ10] = useState(0);
  const [coinQ5,  setCoinQ5]  = useState(0);
  const [coinQ2,  setCoinQ2]  = useState(0);
  const [coinQ1,  setCoinQ1]  = useState(0);
  const [coinQ05, setCoinQ05] = useState(0);

  const [coinsAmount, setCoinsAmount] = useState(0);

  const [saldo, setSaldo] = useState<string>(() => localStorage.getItem('fixmanager_saldo_inicial') || '');
  const [error, setError] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);

  const needsAdminPin = currentUser?.role === 'employee';
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAuthorized, setPinAuthorized] = useState(false);

  const totalMonedas = (coinQ20*20) + (coinQ10*10) + (coinQ5*5) + (coinQ2*2) + (coinQ1*1) + (coinQ05*0.5);
  const totalBilletes = q1000*1000 + q500*500 + q200*200 + q100*100 + q50*50 + q20*20;
  const totalCalculado = totalBilletes + (totalMonedas > 0 ? totalMonedas : coinsAmount);

  useEffect(() => {
    if (totalMonedas > 0) {
      setCoinsAmount(totalMonedas);
    }
  }, [totalMonedas]);

  useEffect(() => {
    if (totalCalculado > 0) setSaldo(totalCalculado.toString());
  }, [totalCalculado]);

  const resetAll = () => {
    setQ1000(0); setQ500(0); setQ200(0); setQ100(0); setQ50(0); setQ20(0);
    setCoinQ20(0); setCoinQ10(0); setCoinQ5(0); setCoinQ2(0); setCoinQ1(0); setCoinQ05(0);
    setCoinsAmount(0); setSaldo('');
  };

  const handleVerifyPin = () => {
    const admins = users.filter(u => u.role === 'admin');
    const valid = admins.length === 0 ? adminPin === '1234' : admins.some(u => u.pin === adminPin);
    if (valid) { setPinAuthorized(true); setPinError(null); }
    else { setPinError('PIN incorrecto.'); setAdminPin(''); }
  };

  const handleOpen = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (needsAdminPin && !pinAuthorized) { setPinError('Se requiere autorización del dueño.'); return; }
    const rawVal = (saldo || '').toString().trim();
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    if (isNaN(val) || val < 0) { setError('Ingrese un monto válido.'); return; }
    setError(null);
    onOpenCaja(val);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') handleOpen(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saldo]);

  // ── Estilos base ──────────────────────────────────────────────────────────
  const panelBg = isRetro
    ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
    : isLight ? 'bg-white border border-zinc-200 rounded-2xl'
    : 'bg-[#0f172a] border border-slate-800 rounded-2xl';

  const headerBg = isRetro
    ? 'bg-[#000080]'
    : isLight ? 'bg-zinc-800 border-b border-zinc-700'
    : 'bg-[#0d1424] border-b border-slate-800';

  const textMain = isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-slate-100';
  const textMut  = isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-slate-400';

  const btnOpen = `w-full py-3 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] cursor-pointer rounded-xl ${
    isRetro ? 'bg-[#000080] hover:bg-[#0000a0] text-white'
    : isLight ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_4px_12px_rgba(245,158,11,0.3)]'
    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-[0_4px_16px_rgba(245,158,11,0.25)]'
  }`;

  // ── VISTA MÓVIL (ESTILO EXACTO Y ESSENCIA DE CORTE DE CAJA BOTTOM SHEET) ──
  if (isMobileScreen) {
    const totalBilletesCalc = q1000*1000 + q500*500 + q200*200 + q100*100 + q50*50 + q20*20;

    return (
      <div
        className="fixed inset-0 z-[99999] flex flex-col justify-end select-none animate-fade-in"
        style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined }}
      >
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* iOS Floating Bottom Sheet Card */}
        <div className={`relative z-10 w-full flex flex-col rounded-t-[36px] border-t shadow-2xl transition-all animate-sheet-slide-up overflow-hidden ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
        }`}
          style={{ maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 20px)` : '84vh' }}
        >
          {/* iOS Drag Handle (36px) */}
          <div className="w-full flex flex-col items-center pt-2.5 pb-1 shrink-0">
            <div className={`w-10 h-1 rounded-full ${isLight ? 'bg-slate-300' : 'bg-zinc-700'}`} />
          </div>

          {/* Top Header */}
          <div className="px-5 py-2 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Apertura de Turno
                </span>
                <h2 className="text-base font-black uppercase tracking-tight">APERTURA DE CAJA</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border active:scale-95 cursor-pointer shadow-xs ${
                isLight ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600' : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
              }`}
            >
              🔄 Reset
            </button>
          </div>

          {/* Scrollable Body */}
          <div ref={scrollBodyRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* HERO CARD DE FONDO INICIAL CONFIRMADO */}
            <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden ${
              isLight 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/80 text-slate-900' 
                : 'bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}>
                  Fondo Inicial Confirmado
                </span>
                
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                  Ingreso de Turno
                </span>
              </div>

              {/* CAMPO DE ENTRADA TIPO PÍLDORA SEAMLESS (SIN RECTÁNGULOS INTERNOS) */}
              <div className={`mt-3 flex items-center gap-3 px-5 py-3 rounded-full border shadow-xs transition-all focus-within:ring-2 ${
                isLight
                  ? 'bg-white border-amber-300 focus-within:border-amber-500 focus-within:ring-amber-400/20'
                  : 'bg-zinc-900 border-amber-500/40 text-white focus-within:border-amber-400 focus-within:ring-amber-500/20'
              }`}>
                <span className={`text-2xl font-mono font-black shrink-0 select-none ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`}>
                  {sym}
                </span>
                <input
                  ref={mainInputRef}
                  type="number"
                  step="0.01"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  placeholder="0.00"
                  onFocus={() => {
                    // En móvil, dar tiempo al teclado a aparecer y luego hacer scroll
                    setTimeout(() => {
                      mainInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 350);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    boxShadow: 'none',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                  className={`premium-search-input w-full bg-transparent text-2xl font-mono font-black !border-0 !border-none !bg-transparent !shadow-none !outline-none !ring-0 p-0 m-0 ${
                    isLight ? 'text-slate-900 placeholder-slate-300' : 'text-white placeholder-zinc-600'
                  }`}
                />
              </div>


            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {needsAdminPin && !pinAuthorized && (
              <div className={`rounded-2xl border p-3.5 space-y-2.5 ${isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-950/30 border-amber-700/50'}`}>
                <p className={`text-[10px] font-black uppercase ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🔐 Requiere autorización del dueño</p>
                <input
                  type="password"
                  maxLength={4}
                  value={adminPin}
                  onChange={e => { setAdminPin(e.target.value); setPinError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                  placeholder="PIN del dueño"
                  className={`w-full rounded-xl border px-3 py-2.5 text-center font-mono tracking-widest text-lg focus:outline-none ${isLight ? 'bg-white border-amber-300 text-zinc-900' : 'bg-slate-900 border-amber-700/50 text-white'}`}
                />
                {pinError && <p className="text-[10px] text-red-500 font-bold text-center">{pinError}</p>}
                <button onClick={handleVerifyPin} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase cursor-pointer">Autorizar apertura</button>
              </div>
            )}

            {/* BOTÓN OPCIONAL PARA CONTAR POR DENOMINACIÓN (IGUAL A ESCRITORIO) */}
            <button
              type="button"
              onClick={() => setShowCounter(!showCounter)}
              className={`w-full py-3 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{showCounter ? '✕ Ocultar desglose por denominación ▲' : '🪙 Desglose por billetes y monedas (Opcional) ▼'}</span>
            </button>

            {/* CONTENIDO DESPLEGABLE DE DENOMINACIONES CUANDO showCounter === true */}
            {showCounter && (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* TARJETAS DE CONTEO RÁPIDO DE BILLETES (ESTILO EXACTO CORTE DE CAJA) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      💵 Conteo de Billetes
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase">
                      Subtotal: {sym}{totalBilletesCalc.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { denom: 1000, val: q1000, set: setQ1000, bg: isLight ? 'from-blue-600 via-indigo-600 to-indigo-800' : 'from-blue-900 to-indigo-950' },
                      { denom: 500, val: q500, set: setQ500, bg: isLight ? 'from-blue-500 via-sky-600 to-blue-700' : 'from-blue-800 to-slate-900' },
                      { denom: 200, val: q200, set: setQ200, bg: isLight ? 'from-emerald-600 via-teal-600 to-green-700' : 'from-emerald-900 to-teal-950' },
                      { denom: 100, val: q100, set: setQ100, bg: isLight ? 'from-rose-600 via-pink-600 to-red-700' : 'from-rose-900 to-pink-950' },
                      { denom: 50, val: q50, set: setQ50, bg: isLight ? 'from-purple-600 via-indigo-600 to-violet-700' : 'from-purple-900 to-indigo-950' },
                      { denom: 20, val: q20, set: setQ20, bg: isLight ? 'from-teal-500 via-emerald-600 to-cyan-700' : 'from-teal-900 to-cyan-950' },
                    ].map(b => (
                      <div 
                        key={b.denom}
                        className={`p-3 rounded-2xl border grid grid-cols-12 items-center gap-2 transition-all ${
                          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800/80'
                        }`}
                      >
                        {/* GRAPHIC DENOM BADGE (COLS 5) */}
                        <div className="col-span-5 flex items-center gap-2 sm:gap-2.5 overflow-hidden">
                          <div className={`w-12 sm:w-14 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs text-white shrink-0 shadow-md bg-gradient-to-r ${b.bg} border border-white/20`}>
                            ${b.denom}
                          </div>
                          <div className="truncate">
                            <span className={`text-[9px] font-bold block leading-none ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Billete</span>
                            <span className={`text-xs font-black font-mono leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>${b.denom}</span>
                          </div>
                        </div>

                        {/* STEPPER CONTROLS TÁCTILES (COLS 4 - PERFECTAMENTE CENTRADOS) */}
                        <div className="col-span-4 flex items-center justify-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={() => b.set(Math.max(0, b.val - 1))}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                              isLight 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250' 
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                            }`}
                          >
                            -
                          </button>

                          <input
                            type="number"
                            value={b.val === 0 ? '' : b.val}
                            onChange={(e) => b.set(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className={`w-10 sm:w-11 h-8 sm:h-9 text-center font-mono font-black text-xs rounded-xl outline-none transition-colors ${
                              isLight 
                                ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500' 
                                : 'bg-zinc-900 border border-zinc-700 text-white focus:border-emerald-500'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => b.set(b.val + 1)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                              isLight 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            +
                          </button>
                        </div>

                        {/* SUB-IMPORTE (COLS 3 - ALINEADO A LA DERECHA) */}
                        <div className="col-span-3 text-right">
                          <span className={`text-[9px] font-mono block leading-none mb-0.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Importe</span>
                          <span className="text-xs font-mono font-black text-emerald-500 truncate block">
                            {sym}{(b.val * b.denom).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD DE MONEDAS (ESTILO EXACTO CORTE DE CAJA) */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider">Monedas Metálicas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Total en Monedas
                      </label>
                      <input
                        type="number"
                        value={coinsAmount === 0 ? '' : coinsAmount}
                        onChange={(e) => setCoinsAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className={`w-full h-11 px-3 font-mono font-black text-sm rounded-xl outline-none ${
                          isLight 
                            ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500' 
                            : 'bg-zinc-900 border border-zinc-700 text-white focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Importe Monedas</span>
                      <span className="text-sm font-mono font-black text-amber-500">
                        {sym}{coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* DESGLOSE DETALLADO DE MONEDAS COLLAPSIBLE (CON STEPPERS +/-) */}
                  <div className="pt-3 border-t border-dashed space-y-2">
                    <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Conteo de Monedas por denominación ($20, $10, $5, $2, $1, $0.50):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { denom: 20, val: coinQ20, set: setCoinQ20 },
                        { denom: 10, val: coinQ10, set: setCoinQ10 },
                        { denom: 5, val: coinQ5, set: setCoinQ5 },
                        { denom: 2, val: coinQ2, set: setCoinQ2 },
                        { denom: 1, val: coinQ1, set: setCoinQ1 },
                        { denom: 0.5, val: coinQ05, set: setCoinQ05 },
                      ].map(c => (
                        <div key={c.denom} className={`p-2 rounded-2xl border flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                          <div className="w-10 h-9 flex items-center justify-center shrink-0">
                            <MXNDenominationGraphic value={c.denom} isCoin />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => c.set(Math.max(0, c.val - 1))}
                              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                isLight 
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                              }`}
                            >
                              -
                            </button>

                            <input
                              type="number"
                              value={c.val === 0 ? '' : c.val}
                              onChange={(e) => c.set(Math.max(0, parseInt(e.target.value) || 0))}
                              placeholder="0"
                              className={`w-9 h-7 text-center font-mono font-black text-xs rounded-lg outline-none ${
                                isLight 
                                  ? 'bg-white border border-slate-300 text-slate-900 focus:border-blue-500' 
                                  : 'bg-zinc-900 border border-zinc-700 text-white focus:border-emerald-500'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => c.set(c.val + 1)}
                              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                isLight 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Floating Action Bar */}
          <div className={`p-4 border-t shrink-0 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] ${
            isLight ? 'bg-white border-slate-200 shadow-2xl' : 'bg-zinc-950 border-zinc-800'
          }`}>
            <button
              type="button"
              onClick={(e) => handleOpen(e)}
              disabled={needsAdminPin && !pinAuthorized}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>✓ INICIAR TURNO Y APERTURAR CAJA</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MODAL ─────────────────────────────────────────────────────────────────
  if (asModal) {
    return (
      <div className={`w-full shadow-2xl overflow-hidden ${panelBg}`} style={{ maxWidth: showCounter ? 820 : 400 }}>
        {/* Header */}
        <div id="apertura-modal-header" className={`px-4 py-3 flex items-center gap-2.5 ${headerBg}`}>
          <Landmark className={`w-4 h-4 shrink-0 ${isRetro ? 'text-white' : 'text-amber-400'}`} />
          <div className="flex-1">
            <p className={`text-xs font-black uppercase tracking-wide ${isRetro ? 'text-white' : 'text-white'}`}>Apertura de Caja</p>
            <p className={`text-[10px] ${isRetro ? 'text-blue-200' : 'text-zinc-400'}`}>Registra el fondo inicial para comenzar la jornada</p>
          </div>
          {totalCalculado > 0 && (
            <span className={`text-xs font-black font-mono px-2 py-1 rounded-full ${isRetro ? 'bg-white/20 text-white' : isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400'}`}>
              {sym}{totalCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        <div className={`flex ${showCounter ? `divide-x ${isRetro ? 'divide-zinc-400' : isLight ? 'divide-zinc-200' : 'divide-slate-800'}` : ''}`}>
          {/* Columna contador (expandible) - AHORA A LA IZQUIERDA */}
          {showCounter && (
            <div id="apertura-counter-panel" className={`p-5 flex-1 overflow-y-auto ${isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50' : 'bg-slate-950/40'}`} style={{ maxHeight: 520 }}>
              <div id="apertura-counter-header" className={`flex items-center justify-between pb-2 mb-3 border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-slate-300'}`}>Contador de Efectivo</span>
                <button type="button" onClick={resetAll}
                  className={`apertura-btn text-[9px] font-bold px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${
                    isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-zinc-600 hover:bg-zinc-300'
                    : isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}>Limpiar</button>
              </div>
              <BillCounter
                isRetro={isRetro} isLight={isLight} sym={sym}
                q1000={q1000} q500={q500} q200={q200} q100={q100} q50={q50} q20={q20}
                setQ1000={setQ1000} setQ500={setQ500} setQ200={setQ200} setQ100={setQ100} setQ50={setQ50} setQ20={setQ20}
                coinsAmount={coinsAmount} setCoinsAmount={setCoinsAmount}
              />
            </div>
          )}

          {/* Columna resumen / entrada - AHORA A LA DERECHA */}
          <div className="p-5 space-y-4 flex flex-col" style={{ minWidth: 340 }}>
            {error && <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${isRetro ? 'bg-red-50 border-red-400 text-red-800' : isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-950/20 border-red-800/30 text-red-400'}`}>{error}</div>}

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-wider ${textMut}`}>Fondo Inicial</label>
              <div id="apertura-fondo-input" className={`flex items-center gap-2 ${isRetro
                ? 'bg-white border-2 border-zinc-500 px-2'
                : `rounded-xl border px-3 ${isLight ? 'border-zinc-300 bg-white focus-within:border-amber-400' : 'border-slate-700 bg-slate-950/50 focus-within:border-amber-500'}`}`}>
                <span className={`text-xl font-black font-mono ${isRetro ? 'text-zinc-700' : textMut}`}>{sym}</span>
                <input type="number" step="0.01" value={saldo}
                  onChange={e => setSaldo(e.target.value)}
                  autoFocus
                  className={`flex-1 bg-transparent py-3 text-2xl font-black font-mono outline-none border-0 ${textMain}`}
                  placeholder="0.00" />
              </div>
              {totalCalculado > 0 && (
                <p className={`text-[10px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                  ✓ Calculado con el contador: {sym}{totalCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {needsAdminPin && !pinAuthorized && (
              <div className={`rounded-xl border p-3 space-y-2 ${isRetro ? 'bg-amber-50 border-amber-400' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-700/40'}`}>
                <p className={`text-[10px] font-black uppercase ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🔐 PIN del dueño requerido</p>
                <input type="password" maxLength={4} value={adminPin}
                  onChange={e => { setAdminPin(e.target.value); setPinError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                  placeholder="••••"
                  className={`w-full border rounded-lg px-3 py-2 text-center font-mono tracking-widest text-lg focus:outline-none ${isRetro ? 'bg-white border-amber-400 text-zinc-900' : isLight ? 'bg-white border-amber-300 text-zinc-900' : 'bg-slate-900 border-amber-700/50 text-white'}`} />
                {pinError && <p className="text-[10px] text-red-500 font-bold">{pinError}</p>}
                <button onClick={handleVerifyPin} className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase cursor-pointer">Autorizar</button>
              </div>
            )}
            {needsAdminPin && pinAuthorized && (
              <div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase text-center ${isRetro ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/20 border-emerald-700/40 text-emerald-400'}`}>✓ Autorizado</div>
            )}

            <div className="space-y-2 mt-auto">
              <button type="button" onClick={() => setShowCounter(c => !c)}
                className={`apertura-btn w-full py-2 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                  isRetro ? 'border border-zinc-500 bg-[#dfdfdf] hover:bg-zinc-300 text-zinc-700'
                  : isLight ? 'border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400'
                }`}>
                {showCounter ? '✕ Cerrar contador' : '🪙 Contar dinero por denominación'}
              </button>
              <button onClick={handleOpen} disabled={needsAdminPin && !pinAuthorized} className={btnOpen}>
                <Play className="w-4 h-4 fill-current shrink-0" /> Abrir Caja e Iniciar Jornada
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PANTALLA COMPLETA (embedded dentro de la app, ej: tab bloqueado) ──────
  const fullBg  = isRetro ? 'bg-[#c0c4cb]' : isLight ? 'bg-zinc-50' : 'bg-[#0d121f]';

  return (
    <div className={`flex-1 overflow-y-auto flex items-center justify-center px-4 py-6 select-none ${fullBg}`}>
      <div className={`w-full max-w-5xl shadow-2xl overflow-hidden ${panelBg}`}>
        <div id="apertura-modal-header" className={`px-6 py-4 flex items-center gap-3 ${headerBg}`}>
          <Landmark className={`w-5 h-5 shrink-0 animate-pulse ${isRetro ? 'text-white' : 'text-amber-400'}`} />
          <div>
            <h2 className={`text-sm font-black tracking-wide uppercase ${isRetro ? 'text-white' : 'text-white'}`}>Apertura de Caja</h2>
            <p className={`text-[10px] ${isRetro ? 'text-blue-200' : 'text-zinc-400'}`}>Registra el fondo inicial para comenzar la jornada del día.</p>
          </div>
          {totalCalculado > 0 && (
            <span className={`ml-auto text-xs font-black font-mono px-3 py-1.5 rounded-full ${isRetro ? 'bg-white/20 text-white' : isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400'}`}>{sym}{totalCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} contado</span>
          )}
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${isRetro ? 'divide-zinc-400' : isLight ? 'divide-zinc-200' : 'divide-slate-800'}`}>
          {/* LEFT — Contador de Efectivo (8 columnas) */}
          <div className={`lg:col-span-8 p-5 space-y-4 ${isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50/50' : 'bg-slate-950/20'}`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
              <h3 className={`text-[10px] font-black uppercase tracking-wider ${textMut}`}>Contador de Efectivo — Billetes y Monedas</h3>
              <button type="button" onClick={resetAll}
                className={`apertura-btn text-[9px] font-bold px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${
                  isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-zinc-600 hover:bg-zinc-300'
                  : isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}>Limpiar</button>
            </div>
            <BillCounter
              isRetro={isRetro} isLight={isLight} sym={sym}
              q1000={q1000} q500={q500} q200={q200} q100={q100} q50={q50} q20={q20}
              setQ1000={setQ1000} setQ500={setQ500} setQ200={setQ200} setQ100={setQ100} setQ50={setQ50} setQ20={setQ20}
              coinsAmount={coinsAmount} setCoinsAmount={setCoinsAmount}
            />
          </div>

          {/* RIGHT — Resumen / Inicio (4 columnas) */}
          <div className="lg:col-span-4 p-6 flex flex-col gap-5">
            <div className={`rounded-xl border p-3.5 text-[11px] leading-relaxed ${isRetro ? 'bg-amber-50 border-amber-300 text-amber-800' : isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/5 border-amber-500/15 text-amber-300/80'}`}>
              <p className="font-black text-[9px] uppercase tracking-wider mb-1 opacity-70">Operaciones deshabilitadas</p>
              Las ventas y movimientos estarán bloqueados hasta registrar el fondo de apertura.
            </div>
            {error && <div className={`rounded-lg border px-3 py-2.5 text-xs font-bold ${isRetro ? 'bg-red-50 border-red-400 text-red-800' : isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-950/20 border-red-800/30 text-red-400'}`}>{error}</div>}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-wider ${textMut}`}>Fondo Inicial Confirmado</label>
              <div id="apertura-fondo-input-full" className={`flex items-center rounded-xl border transition-all focus-within:ring-2 ${isRetro ? 'bg-white border-2 border-zinc-500 px-2' : isLight ? 'border-zinc-300 bg-white focus-within:border-amber-400 focus-within:ring-amber-400/20' : 'border-slate-700 bg-slate-950/50 focus-within:border-amber-500 focus-within:ring-amber-500/20'}`}>
                <span className={`pl-4 text-xl font-black font-mono ${isRetro ? 'text-zinc-700' : textMut}`}>{sym}</span>
                <input type="number" step="0.01" value={saldo} onChange={e => setSaldo(e.target.value)}
                  className={`flex-1 bg-transparent px-3 py-3.5 text-xl font-black font-mono outline-none border-0 ${textMain}`} placeholder="0.00" />
              </div>
              {totalCalculado > 0 && <p className={`text-[10px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓ Calculado con el contador de efectivo</p>}
            </div>
            <div className="space-y-2 mt-auto pt-2">
              {needsAdminPin && !pinAuthorized && (
                <div className={`rounded-xl border p-3 space-y-2 ${isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-700/40'}`}>
                  <p className={`text-[10px] font-black uppercase ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🔐 Requiere autorización del dueño</p>
                  <input type="password" maxLength={4} value={adminPin}
                    onChange={e => { setAdminPin(e.target.value); setPinError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                    placeholder="PIN del dueño"
                    className={`w-full rounded-lg border px-3 py-2 text-center font-mono tracking-widest text-lg focus:outline-none ${isRetro ? 'bg-white border-amber-300 text-zinc-900' : isLight ? 'bg-white border-amber-300 text-zinc-900' : 'bg-slate-900 border-amber-700/50 text-white'}`} />
                  {pinError && <p className="text-[10px] text-red-500 font-bold">{pinError}</p>}
                  <button onClick={handleVerifyPin} className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase cursor-pointer">Autorizar apertura</button>
                </div>
              )}
              {needsAdminPin && pinAuthorized && (
                <div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase text-center ${isRetro ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950/20 border-emerald-700/40 text-emerald-400'}`}>✓ Autorizado por el dueño</div>
              )}
              <button onClick={handleOpen} disabled={needsAdminPin && !pinAuthorized} className={btnOpen}>
                <Play className="w-4 h-4 fill-current shrink-0" /> Abrir Caja e Iniciar Jornada
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
