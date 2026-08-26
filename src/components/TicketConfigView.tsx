/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Ticket, Save, Printer, RotateCcw, CheckCircle, RefreshCw, Palette, Search,
  Eye, HelpCircle, X, ChevronDown, ChevronUp, Copy, Plus, Trash2, Edit, Scissors,
  Smartphone, Tag, ShieldCheck, FileText, Check, AlertTriangle, MessageCircle, Send
} from 'lucide-react';
import { WorkshopConfig, ActiveTab } from '../types';
import { PRINTER_PRESETS_DATABASE, PrinterPresetProfile } from '../utils/printerPresets';
import { buildTicketHtml, buildPosTicketHtml } from '../utils/ticketBuilder';
import { showToast } from '../utils/a4Reports';
import { formatPhoneNumber } from '../utils/phoneFormatter';

/* ==========================================================
   6. TICKET CONFIG VIEW
   ========================================================== */
export interface TicketConfigProps {
  config: WorkshopConfig;
  onUpdateConfig: (config: WorkshopConfig) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedOrderId?: (id: string | null) => void;
  _hidden?: boolean;
}
export function TicketConfigView({ config, onUpdateConfig, setActiveTab, setSelectedOrderId }: TicketConfigProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [storeName, setStoreName] = useState(config.storeName);
  const [phone, setPhone] = useState(config.phone);
  const [address, setAddress] = useState(config.address);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Separate states for POS vs Service formats
  const [activeFormatTab, setActiveFormatTab] = useState<'pos' | 'service'>('pos');
  const [ticketFooterPOS, setTicketFooterPOS] = useState(config.ticketFooterPOS || config.ticketFooter || '');
  const [termsPOS, setTermsPOS] = useState(config.termsAndConditionsPOS || config.termsAndConditions || '');
  const [ticketFooterService, setTicketFooterService] = useState(config.ticketFooterService || config.ticketFooter || '');
  const [termsService, setTermsService] = useState(config.termsAndConditionsService || config.termsAndConditions || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      storeName,
      phone,
      address,
      // General fallbacks kept for safety
      ticketFooter: ticketFooterPOS, 
      termsAndConditions: termsPOS,
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService
    });
    setFeedback('¡Formatos de impresión (POS y Servicio Nuevo) guardados correctamente!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-6 select-none ${
      isRetro 
        ? 'bg-[#cbd6e2] text-zinc-900 rounded-none' 
        : isLight 
          ? 'bg-zinc-50 text-zinc-900' 
          : 'bg-[#0c0c0e] text-gray-200'
    }`}>
      <div className={`flex justify-between items-center border-b pb-4 ${
        isLight ? 'border-zinc-300' : 'border-[#1c1d22]'
      }`}>
        <h3 className={`text-sm font-display font-black tracking-wider flex items-center gap-2 ${
          isRetro ? 'text-[#000080] font-mono font-black' : isLight ? 'text-zinc-700 font-extrabold' : 'text-amber-500'
        }`}>
          <Ticket className="w-5 h-5 animate-pulse" /> CONFIGURACIÓN DEL FORMATO DE IMPRESORA TÉRMICA
        </h3>
      </div>

      {feedback && (
        <div className={`p-3 border text-xs rounded select-none ${
          isRetro 
            ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none' 
            : isLight 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-805 font-bold' 
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
        }`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`p-5 space-y-6 ${
        isRetro 
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 rounded-none shadow-sm' 
          : isLight 
            ? 'bg-zinc-100/60 border border-zinc-200 text-zinc-800 rounded-xl shadow-xs' 
            : 'bg-[#121316] border border-[#1b1c21] rounded'
      }`}>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-widest font-mono border-b pb-2 mb-4 block ${
            isRetro ? 'text-amber-900 border-zinc-300 font-black' : isLight ? 'text-zinc-900 border-zinc-200 font-extrabold' : 'text-amber-500 border-[#1c1d22]'
          }`}>Parámetros del Cabezal de Impresión</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-zinc-300'
              }`}>Nombre Comercial Cabezal</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                  isRetro 
                    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                    : isLight 
                      ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                      : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-zinc-300'
              }`}>Teléfono Local</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                  isRetro 
                    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                    : isLight 
                      ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                      : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-zinc-300'
              }`}>Dirección Física</label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                  isRetro 
                    ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                    : isLight 
                      ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                      : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Tab configuration selection for the two formats */}
        <div className="space-y-4 pt-2">
          <div className={`flex justify-between items-center border-b pb-1 ${
            isLight ? 'border-zinc-300' : 'border-[#1c1d22]'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${
              isRetro ? 'text-amber-900 border-zinc-300 font-black' : isLight ? 'text-zinc-900 border-zinc-200 font-extrabold' : 'text-zinc-200'
            }`}>Formatos de Impresión Independientes</h4>
            <div className={`flex rounded-md p-0.5 border shrink-0 ${
              isRetro 
                ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' 
                : isLight 
                  ? 'bg-zinc-100 border-zinc-200' 
                  : 'bg-[#0a0a0c] border-[#23242a]'
            }`}>
              <button
                type="button"
                onClick={() => setActiveFormatTab('pos')}
                className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
                  activeFormatTab === 'pos'
                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-500 text-black font-extrabold')
                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                }`}
              >
                🛒 Recibo POS / Ventas
              </button>
              <button
                type="button"
                onClick={() => setActiveFormatTab('service')}
                className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
                  activeFormatTab === 'service'
                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-500 text-black font-extrabold')
                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                }`}
              >
                🔧 Recibo Servicio / Órdenes
              </button>
            </div>
          </div>

          {activeFormatTab === 'pos' ? (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-3 border rounded ${
                isRetro 
                  ? 'bg-amber-50/50 border-amber-900/30' 
                  : isLight 
                    ? 'bg-amber-50/70 border-amber-500/10' 
                    : 'bg-amber-500/5 border border-amber-500/10'
              }`}>
                <p className={`text-[10px] font-sans leading-relaxed ${
                  isLight ? 'text-zinc-800 font-bold' : 'text-zinc-400'
                }`}>
                  Estás editando el formato utilizado para **Ventas Rápidas, Accesorios y Productos**. 
                  Este ticket no incluye datos técnicos del dispositivo móvil, sino un desglose de artículos vendidos.
                </p>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-amber-500'
                }`}>Leyenda de Pie de Recibo (POS)</label>
                <input
                  type="text"
                  required
                  value={ticketFooterPOS}
                  onChange={e => setTicketFooterPOS(e.target.value)}
                  className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                      : isLight 
                        ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                        : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                  }`}
                  placeholder="Ej. ¡Gracias por su compra en mostrador!"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-amber-500'
                }`}>Términos, Políticas de Garantía y Leyes de Venta (POS)</label>
                <textarea
                  rows={4}
                  required
                  value={termsPOS}
                  onChange={e => setTermsPOS(e.target.value)}
                  className={`w-full text-xs px-3 py-2 font-mono focus:outline-none ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                      : isLight 
                        ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                        : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-zinc-300 rounded'
                  }`}
                  placeholder="Ej. 1. Cambios únicamente dentro de los primeros..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-3 border rounded ${
                isRetro 
                  ? 'bg-sky-50/50 border-sky-900/30' 
                  : isLight 
                    ? 'bg-sky-50/70 border-sky-500/10' 
                    : 'bg-teal-500/5 border border-teal-500/10'
              }`}>
                <p className={`text-[10px] font-sans leading-relaxed ${
                  isLight ? 'text-zinc-800 font-bold' : 'text-zinc-400'
                }`}>
                  Estás editando el formato utilizado para **Servicios Nuevos, Órdenes de Reparación y Diagnósticos de Equipos**.
                  Este ticket despliega marca, modelo, falla del equipo y saldos por pagar.
                </p>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-sky-400'
                }`}>Leyenda de Pie de Recibo (Servicio Técnico)</label>
                <input
                  type="text"
                  required
                  value={ticketFooterService}
                  onChange={e => setTicketFooterService(e.target.value)}
                  className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                      : isLight 
                        ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                        : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                  }`}
                  placeholder="Ej. Garantía de 30 días en el servicio..."
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-sky-400'
                }`}>Términos, Políticas y Leyes de Servicio de Taller</label>
                <textarea
                  rows={4}
                  required
                  value={termsService}
                  onChange={e => setTermsService(e.target.value)}
                  className={`w-full text-xs px-3 py-2 font-mono focus:outline-none ${
                    isRetro 
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                      : isLight 
                        ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                        : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-zinc-300 rounded'
                  }`}
                  placeholder="Ej. 1. Todo diagnóstico tiene un cobro si no..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className={`px-4 py-2 text-xs font-black tracking-widest flex items-center gap-2 transition-all cursor-pointer uppercase active:scale-95 ${
              isRetro 
                ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] rounded-none' 
                : 'bg-amber-500 hover:bg-amber-600 active:scale-98 text-black rounded-md'
            }`}
          >
            <Save className="w-3.5 h-3.5" /> Guardar Todos los Formatos de Impresión
          </button>
        </div>
      </form>

      {/* Sección de Prueba de Impresión */}
      <div className={`p-5 rounded space-y-4 ${
        isRetro 
          ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 rounded-none shadow-sm' 
          : isLight 
            ? 'bg-zinc-100/60 border border-zinc-200 text-zinc-600 rounded-xl shadow-xs' 
            : 'bg-[#121316] border border-[#1b1c21] rounded'
      }`}>
        <h4 className={`text-xs font-bold uppercase tracking-widest font-mono border-b pb-2 mb-2 block ${
          isRetro ? 'text-amber-900 border-zinc-300 font-black' : isLight ? 'text-zinc-900 border-zinc-200 font-extrabold' : 'text-amber-500 border-[#1c1d22]/80'
        }`}>
          Área de Impresión y Pruebas de Formato
        </h4>
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-4 border rounded-md ${
          isRetro 
            ? 'bg-[#cbd6e2] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' 
            : isLight 
              ? 'bg-white border border-zinc-200' 
              : 'bg-[#08080a] border border-[#2d2f36]'
        }`}>
          <div className="space-y-1.5 flex-1 select-none">
            <h5 className={`text-xs font-bold flex items-center gap-1.5 ${
              isRetro ? 'text-[#000080] font-mono font-black' : isLight ? 'text-zinc-900 font-extrabold' : 'text-white'
            }`}>
              <Printer className={`w-4 h-4 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-700' : 'text-indigo-400'}`} />
              Vista Previa e Impresión de Ticket de Prueba
            </h5>
            <p className={`text-[10px] leading-relaxed font-mono ${
              isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-500 font-bold' : 'text-zinc-400'
            }`}>
              Visualiza el diseño final del ticket térmico (58mm/80mm) con el logotipo,
              datos de sucursal, desglose de impuestos e información legal que has configurado.
              Puedes mandar una impresión física o a PDF para probar tu terminal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (setSelectedOrderId) {
                setSelectedOrderId(activeFormatTab === 'pos' ? 'S-101' : 'TKT-014');
              }
              setActiveTab('Imprimir');
            }}
            className={`w-full md:w-auto shrink-0 px-4 py-2 text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer uppercase active:scale-95 ${
              isRetro 
                ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] rounded-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-md'
            }`}
          >
            <Printer className="w-3.5 h-3.5 animate-pulse" /> Abrir Diseñador / Prueba de Impresión
          </button>
        </div>
      </div>
    </div>
  );
}


export default TicketConfigView;
