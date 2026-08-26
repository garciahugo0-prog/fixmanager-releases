/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { RecargasCustomIcon } from './icons/RecargasCustomIcon';
import ReactDOM from 'react-dom';
import {
  Tags, DollarSign, Users, Scissors, TrendingDown, TrendingUp, ArrowUpDown, ArrowUpRight, ArrowDownLeft, Ticket, Settings,
  Star, Search, ArrowRight, UserCheck, Plus, Landmark, PiggyBank,
  Save, Palette, CheckCircle, RefreshCw, Upload, Image, Trash2, Printer, Globe, Download,
  Eye, X, Calendar, Tag, Edit, FileText, Shield, ShieldCheck, UserPlus, Lock, KeyRound, Bell, MessageCircle, Send, Smartphone, HelpCircle, ChevronDown, ChevronUp, FileDown, Leaf, CreditCard, Copy, Loader2, AlertCircle, ExternalLink, Sparkles
} from 'lucide-react';
import {
  ServicePrice, Sale, Client, Expense, WorkshopConfig, ActiveTab, RepairOrder, AppUser, UserPermissions, ADMIN_PERMISSIONS, EMPLOYEE_PERMISSIONS, TECNICO_PERMISSIONS, AuditEntry, AuditAction, CorteEntry, AperturaEntry,
  DailySchedule, WeeklySchedule, ChipActivation
} from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { buildTicketHtml, buildPosTicketHtml, buildRechargeTicketHtml, buildServiceLabelHtml, buildWarrantyLabelHtml, buildProductLabelHtml, buildEntryTicketHtml, buildBatchEntryTicketHtml, buildConsolidatedTicketHtml, buildQuoteTicketHtml, buildTicketHeaderHtml } from '../utils/ticketBuilder';
import { sendWhatsappNotification, buildWhatsappSaleTicketMessage, formatPhoneForWhatsapp, openWhatsappChat } from '../utils/whatsapp';
import { DEFAULT_OFFLINE_MODELS } from '../data';
import QRCode from 'qrcode';
import { handleCaretPreservingChange } from '../utils/domHelpers';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';
import { runSyncAudit, repairSyncIssues } from '../utils/syncAudit';
import { taecelRegisterAccount, taecelGetBalance } from '../utils/taecel';
import { PRINTER_PRESETS_DATABASE, PrinterPresetProfile } from '../utils/printerPresets';
import { buildA4ReportHtml, printA4Report, showToast, notifyDone } from '../utils/a4Reports';
import { COUNTRIES_LIST, MEXICO_STATES_DATA, USA_STATES_LIST, ALL_COUNTRIES, MEXICAN_STATES, COLOMBIA_DEPARTMENTS } from '../utils/mexicoLocations';

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
   STIKER ELEMENTS AND WINDOWS PAINT STYLE SYSTEM DESIGNER
   ========================================================== */
export const DEFAULT_LABEL_TEMPLATE = JSON.stringify([
  { "id": "img-vert-order-bar", "type": "text", "text": "  {ORDEN}  ", "x": 3, "y": 4, "fontSize": 11, "fontWeight": "bolder", "inverted": true, "orientation": "vertical" },
  { "id": "img-date-pill", "type": "rect", "x": 38, "y": 3, "width": 46, "height": 8 },
  { "id": "img-date-text", "type": "text", "text": "({FECHA})", "x": 61, "y": 4.5, "fontSize": 8, "fontWeight": "bold", "align": "center" },
  { "id": "img-phone", "type": "text", "text": "{TELEFONO}", "x": 20, "y": 14, "fontSize": 9.5, "fontWeight": "bolder" },
  { "id": "img-client", "type": "text", "text": "{CLIENTE}", "x": 85, "y": 14, "fontSize": 9.5, "fontWeight": "bold", "align": "right" },
  { "id": "img-line-1", "type": "line", "x": 20, "y": 24, "width": 66 },
  { "id": "img-estado-title", "type": "text", "text": "ESTADO PREVIO:", "x": 22, "y": 29, "fontSize": 9.5, "fontWeight": "bolder" },
  { "id": "img-estado-val", "type": "text", "text": "REVISADO - DETALLE PENDIENTE", "x": 22, "y": 38, "fontSize": 8, "fontWeight": "normal" },
  { "id": "img-line-2", "type": "line", "x": 20, "y": 46, "width": 66 },
  { "id": "img-qr-container", "type": "rect", "x": 21, "y": 51, "width": 14, "height": 24 },
  { "id": "img-qr-symbol", "type": "text", "text": "🔳", "x": 28, "y": 58, "fontSize": 14, "align": "center" },
  { "id": "img-work-title", "type": "text", "text": "TRABAJO A REALIZAR:", "x": 37, "y": 53, "fontSize": 9, "fontWeight": "bolder" },
  { "id": "img-work-value", "type": "text", "text": "{FALLA}", "x": 37, "y": 65, "fontSize": 8.5, "fontWeight": "bold" },
  { "id": "img-price-container", "type": "rect", "x": 88, "y": 29, "width": 9, "height": 46 },
  { "id": "img-price-text", "type": "text", "text": "$850", "x": 92.5, "y": 52, "fontSize": 14, "fontWeight": "bolder", "align": "center", "orientation": "vertical" },
  { "id": "img-line-3", "type": "line", "x": 20, "y": 79, "width": 66 },
  { "id": "img-device", "type": "text", "text": "{DISPOSITIVO}", "x": 53, "y": 84, "fontSize": 9.5, "fontWeight": "bolder", "align": "center" }
]);

export const DEFAULT_LABEL_PRODUCT_TEMPLATE = JSON.stringify([
  { "id": "pe1", "type": "text", "text": "{TIENDA}", "x": 6, "y": 7, "fontSize": 10, "fontWeight": "bolder" },
  { "id": "pe2", "type": "line", "x": 4, "y": 14, "width": 92 },
  { "id": "pe3", "type": "text", "text": "{PRODUCTO}", "x": 50, "y": 28, "fontSize": 11, "fontWeight": "bolder", "align": "center" },
  { "id": "pe4", "type": "line", "x": 4, "y": 40, "width": 92 },
  { "id": "pe5", "type": "rect", "x": 10, "y": 46, "width": 55, "height": 24 },
  { "id": "pe6", "type": "text", "text": "▌▌▌▌▌▌▌ ▌▌▌▌ ▌▌▌▌▌▌▌", "x": 37, "y": 56, "fontSize": 10, "align": "center" },
  { "id": "pe7", "type": "text", "text": "{CODIGO}", "x": 37, "y": 67, "fontSize": 7.5, "align": "center" },
  { "id": "pe8", "type": "line", "x": 4, "y": 76, "width": 92 },
  { "id": "pe9", "type": "text", "text": "{PRECIO}", "x": 92, "y": 88, "fontSize": 14, "fontWeight": "bolder", "align": "right" }
]);

export interface StickerElement {
  id: string;
  type: 'text' | 'line' | 'rect';
  text?: string;
  x: number; // Percent
  y: number; // Percent
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder';
  inverted?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number; // for lines and rects
  height?: number; // for rects
  orientation?: 'horizontal' | 'vertical';
}

export const DEFAULT_TICKET_POS = JSON.stringify([
  { "id": "tp-1",  "type": "text", "text": "{TIENDA}",              "x": 50, "y": 3.5, "fontSize": 14, "fontWeight": "bolder", "align": "center" },
  { "id": "tp-2",  "type": "text", "text": "{SLOGAN}",              "x": 50, "y": 9,   "fontSize": 7.5, "align": "center" },
  { "id": "tp-3",  "type": "text", "text": "TEL: {TELEFONO}",       "x": 50, "y": 13,  "fontSize": 7.5, "align": "center" },
  { "id": "tp-4",  "type": "line", "x": 3, "y": 17, "width": 94 },
  { "id": "tp-5",  "type": "text", "text": "▌ COMPROBANTE DE VENTA ▐", "x": 50, "y": 21, "fontSize": 9.5, "fontWeight": "bolder", "align": "center", "inverted": true },
  { "id": "tp-6",  "type": "text", "text": "FECHA: {FECHA}",        "x": 4,  "y": 27,  "fontSize": 7.5 },
  { "id": "tp-7",  "type": "line", "x": 3, "y": 31, "width": 94 },
  { "id": "tp-8",  "type": "text", "text": "{DETALLE_MOSTRADOR}",   "x": 4,  "y": 35,  "fontSize": 9 },
  { "id": "tp-9",  "type": "line", "x": 3, "y": 62, "width": 94 },
  { "id": "tp-10", "type": "text", "text": "{DESGLOSE_PAGOS}",      "x": 4,  "y": 66,  "fontSize": 9 },
  { "id": "tp-11", "type": "line", "x": 3, "y": 80, "width": 94 },
  { "id": "tp-12", "type": "text", "text": "── TÉRMINOS Y CONDICIONES ──", "x": 50, "y": 83, "fontSize": 7, "fontWeight": "bold", "align": "center" },
  { "id": "tp-13", "type": "text", "text": "{POLITICAS}",           "x": 50, "y": 87,  "fontSize": 7,   "align": "center" },
  { "id": "tp-14", "type": "line", "x": 3, "y": 93, "width": 94 },
  { "id": "tp-15", "type": "text", "text": "{LEYENDA_PIE}",         "x": 50, "y": 96,  "fontSize": 8.5, "fontWeight": "bold", "align": "center" }
], null, 2);

export const DEFAULT_OT_PRESET = JSON.stringify([
  { "id": "ot-1",   "type": "text", "text": "{TIENDA}",              "x": 50, "y": 4,   "fontSize": 14, "fontWeight": "bolder", "align": "center" },
  { "id": "ot-2",   "type": "text", "text": "{SLOGAN}",              "x": 50, "y": 9,   "fontSize": 8,  "align": "center" },
  { "id": "ot-3",   "type": "line", "x": 3, "y": 13, "width": 94 },
  { "id": "ot-4",   "type": "text", "text": "ORDEN DE TRABAJO",      "x": 50, "y": 16,  "fontSize": 10, "fontWeight": "bolder", "align": "center", "inverted": true },
  { "id": "ot-5",   "type": "text", "text": "No: {ORDEN}",           "x": 5,  "y": 21,  "fontSize": 9,  "fontWeight": "bold" },
  { "id": "ot-6",   "type": "text", "text": "Fecha: {FECHA}",        "x": 5,  "y": 25,  "fontSize": 9 },
  { "id": "ot-6b",  "type": "text", "text": "Entrega: {ENTREGA}",    "x": 5,  "y": 29,  "fontSize": 9 },
  { "id": "ot-6c",  "type": "text", "text": "Técnico: {TECNICO}",    "x": 5,  "y": 33,  "fontSize": 9 },
  { "id": "ot-7",   "type": "line", "x": 3, "y": 37, "width": 94 },
  { "id": "ot-8",   "type": "text", "text": "CLIENTE",               "x": 50, "y": 40,  "fontSize": 9,  "fontWeight": "bolder", "align": "center" },
  { "id": "ot-9",   "type": "text", "text": "Nom: {NOM_CLIENTE}",    "x": 5,  "y": 44,  "fontSize": 9,  "fontWeight": "bold" },
  { "id": "ot-9b",  "type": "text", "text": "Tel: {TEL_CLIENTE}",    "x": 5,  "y": 48,  "fontSize": 9 },
  { "id": "ot-10",  "type": "line", "x": 3, "y": 52, "width": 94 },
  { "id": "ot-11",  "type": "text", "text": "EQUIPO",                "x": 50, "y": 55,  "fontSize": 9,  "fontWeight": "bolder", "align": "center" },
  { "id": "ot-12",  "type": "text", "text": "Marca: {MARCA}",        "x": 5,  "y": 59,  "fontSize": 9,  "fontWeight": "bold" },
  { "id": "ot-12b", "type": "text", "text": "Modelo: {MODELO}",      "x": 5,  "y": 63,  "fontSize": 9 },
  { "id": "ot-12c", "type": "text", "text": "Tipo: {TIPO}",          "x": 5,  "y": 67,  "fontSize": 9 },
  { "id": "ot-12d", "type": "text", "text": "Problema: {PROBLEMA}",  "x": 5,  "y": 71,  "fontSize": 9 },
  { "id": "ot-12e", "type": "text", "text": "Acceso: {ACCESO}",      "x": 5,  "y": 75,  "fontSize": 9 },
  { "id": "ot-13",  "type": "line", "x": 3, "y": 79, "width": 94 },
  { "id": "ot-14",  "type": "text", "text": "{SERVICIO}",            "x": 5,  "y": 82,  "fontSize": 9,  "fontWeight": "bolder" },
  { "id": "ot-15",  "type": "line", "x": 3, "y": 86, "width": 94 },
  { "id": "ot-16",  "type": "text", "text": "Subtotal: {COSTO}",     "x": 5,  "y": 89,  "fontSize": 9 },
  { "id": "ot-16b", "type": "text", "text": "Anticipo: -{ANTICIPO}", "x": 5,  "y": 93,  "fontSize": 9 },
  { "id": "ot-16c", "type": "text", "text": "SALDO: {SALDO}",        "x": 5,  "y": 98,  "fontSize": 11, "fontWeight": "bolder" },
  { "id": "ot-17",  "type": "line", "x": 3, "y": 103, "width": 94 },
  { "id": "ot-18",  "type": "text", "text": "TÉRMINOS Y CONDICIONES","x": 50, "y": 106, "fontSize": 8,  "fontWeight": "bold", "align": "center" },
  { "id": "ot-19",  "type": "text", "text": "{POLITICAS}",           "x": 50, "y": 110, "fontSize": 7.5,"align": "center" },
  { "id": "ot-20",  "type": "line", "x": 3, "y": 125, "width": 94 },
  { "id": "ot-21",  "type": "text", "text": "{LEYENDA_PIE}",         "x": 50, "y": 128, "fontSize": 9,  "fontWeight": "bold", "align": "center" }
]);

/* ==========================================================
   HELPER: Botón que copia /newbot al portapapeles
   ========================================================== */
function TgCopyNewbotButton({ isRetro, isLight }: { isRetro: boolean; isLight: boolean }) {
  const [copied, setCopied] = React.useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText('/newbot').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  };

  if (copied) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black ${isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'}`}>
        ✅ <span><strong>/newbot</strong> copiado — ve al chat de BotFather, pega con <strong>Ctrl+V</strong> y presiona <strong>Enter</strong></span>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black cursor-pointer transition-colors ${isRetro ? 'retro-white-text' : 'text-white'}`}
        style={isRetro
          ? { background: '#000080', border: '2px solid #0000cc', cursor: 'pointer', boxShadow: '2px 2px 0 #00003a' }
          : { background: '#0ea5e9', border: '2px solid #0284c7', cursor: 'pointer' }
        }>
        📋 Copiar <strong>/newbot</strong> al portapapeles
      </button>
    </div>
  );
}

interface NetworkConfigTabProps {
  config: WorkshopConfig;
  isRetro: boolean;
  isLight: boolean;
}

function ipToLinkCode(ip: string): string | null {
  const match = ip.match(/^192\.168\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const x = match[1].padStart(3, '0');
  const y = match[2].padStart(3, '0');
  return `${x}-${y}`;
}

export function NetworkConfigTab({ config, isRetro, isLight }: NetworkConfigTabProps) {
  const [lanActive, setLanActive] = useState(() => localStorage.getItem('fixmanager_lan_server_active') === 'true');
  const [lanIp, setLanIp] = useState('');
  const [lanLoading, setLanLoading] = useState(false);
  const [terminalNameLocal, setTerminalNameLocal] = useState(() => localStorage.getItem('fixmanager_terminal_name') || 'Caja Principal');
  const [lanFeedback, setLanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isClient = !!localStorage.getItem('selected_local_server_host');

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setLanFeedback({ type, message });
    setTimeout(() => {
      setLanFeedback(null);
    }, 6000);
  };

  const handleRunAudit = async () => {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await runSyncAudit();
      setAuditResult(res);
      if (res.ok) {
        showFeedback('success', 'Auditoría completada: ¡Datos locales e integridad de folios correctos!');
      } else {
        showFeedback('error', `Auditoría completada: Se encontraron ${res.totalIssues} inconvenientes de sincronización.`);
      }
    } catch (err: any) {
      showFeedback('error', 'Error al ejecutar auditoría: ' + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRepairSync = () => {
    setRepairLoading(true);
    try {
      const res = repairSyncIssues();
      showFeedback('success', `Reparación completada: Se corrigieron ${res.fixedUuids} UUIDs y se resolvieron ${res.resolvedCollisions} colisiones.`);
      // Re-run audit automatically
      runSyncAudit().then(setAuditResult);
    } catch (err: any) {
      showFeedback('error', 'Error al ejecutar reparación: ' + err.message);
    } finally {
      setRepairLoading(false);
    }
  };

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.isServerRunning) {
      api.isServerRunning().then((running: boolean) => {
        setLanActive(running);
        if (running && api.startLocalServer) {
          api.startLocalServer().then((res: any) => {
            if (res.success) setLanIp(res.ip);
          });
        }
      });
    }
  }, []);

  const handleToggleServer = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    setLanLoading(true);
    setLanFeedback(null);
    try {
      if (lanActive) {
        await api.stopLocalServer();
        localStorage.removeItem('fixmanager_lan_server_active');
        setLanActive(false);
        setLanIp('');
        showFeedback('success', 'Servidor local detenido.');
      } else {
        const res = await api.startLocalServer();
        if (res.success) {
          localStorage.setItem('fixmanager_lan_server_active', 'true');
          setLanActive(true);
          setLanIp(res.ip);
          
          // Seed/Sync current database state to the main process DB file
          const currentDb = {
            orders: JSON.parse(localStorage.getItem('fixmanager_orders') || '[]'),
            inventory: JSON.parse(localStorage.getItem('fixmanager_inventory') || '[]'),
            clients: JSON.parse(localStorage.getItem('fixmanager_clients') || '[]'),
            config: JSON.parse(localStorage.getItem('fixmanager_config') || '{}'),
            expenses: JSON.parse(localStorage.getItem('fixmanager_expenses') || '[]'),
            sales: JSON.parse(localStorage.getItem('fixmanager_sales') || '[]'),
            cortes: JSON.parse(localStorage.getItem('fixmanager_cortes') || '[]'),
            users: JSON.parse(localStorage.getItem('fixmanager_users') || '[]'),
            services: JSON.parse(localStorage.getItem('fixmanager_services') || '[]'),
          };

          let synced = false;
          let attempts = 0;
          const maxAttempts = 10;
          while (!synced && attempts < maxAttempts) {
            try {
              const fetchRes = await fetch(`http://127.0.0.1:3011/api/sync-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentDb)
              });
              if (fetchRes.ok) {
                synced = true;
              } else {
                throw new Error(`HTTP ${fetchRes.status}`);
              }
            } catch (err) {
              attempts++;
              if (attempts >= maxAttempts) {
                throw new Error('No se pudo establecer sincronización inicial con el servidor local: ' + (err?.message || 'Error desconocido'));
              }
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          showFeedback('success', `Servidor local iniciado en http://${res.ip}:3011`);
        } else {
          showFeedback('error', 'No se pudo iniciar el servidor: ' + res.error);
        }
      }
    } catch (e: any) {
      showFeedback('error', 'Error: ' + e.message);
    } finally {
      setLanLoading(false);
    }
  };

  const handleUnlinkClient = () => {
    if (window.confirm('¿Seguro que deseas desvincular esta terminal de la Caja Principal? Se restablecerán tus datos locales.')) {
      localStorage.removeItem('selected_local_server_host');
      localStorage.removeItem('fixmanager_setup_complete');
      window.location.reload();
    }
  };

  return (
    <div className={`p-6 rounded border space-y-6 ${
      isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
        : isLight ? 'bg-white border-zinc-200'
        : 'bg-[#121316] border-[#1b1c21]'
    }`}>
      <div className={`flex items-start gap-4 pb-4 border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl bg-blue-900/30`}>
          🌐
        </div>
        <div>
          <h2 className={`text-base font-bold ${isRetro ? 'text-zinc-800' : 'text-white'}`}>Red Local y Multicaja</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configura esta computadora como Caja Principal o enlaza computadoras secundarias en tu red local.
          </p>
        </div>
      </div>

      {lanFeedback && (
        <div className={`p-3 rounded border text-xs flex items-center justify-between animate-fadeIn ${
          lanFeedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <span>{lanFeedback.type === 'success' ? '✅' : '❌'}</span>
            <p className="font-semibold">{lanFeedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setLanFeedback(null)}
            className="text-[10px] uppercase font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="space-y-4">
        {isClient ? (
          <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <h4 className="text-sm font-bold text-emerald-400">Terminal Secundaria Enlazada</h4>
            <p className="text-xs text-zinc-400">
              Esta computadora está sincronizada con la Caja Principal en la dirección: <strong>{localStorage.getItem('selected_local_server_host')}</strong>.
            </p>
            <button
              type="button"
              onClick={handleUnlinkClient}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition-colors"
            >
              Desvincular Terminal
            </button>
          </div>
        ) : (
          <div className={`p-4 rounded border ${isRetro ? 'bg-zinc-200 border-zinc-400' : 'bg-white/5 border-white/10'} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'}`}>Servidor de Red Local (Caja Principal)</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Activa esto en tu Caja Principal para permitir que otras computadoras se conecten y compartan datos.
                </p>
              </div>
              <button
                type="button"
                disabled={lanLoading}
                onClick={handleToggleServer}
                className={`px-4 py-2 rounded text-xs font-black font-mono transition-all cursor-pointer ${
                  lanActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {lanLoading ? 'PROCESANDO...' : lanActive ? 'DESACTIVAR SERVIDOR' : 'ACTIVAR SERVIDOR'}
              </button>
            </div>

            {lanActive && lanIp && (
              <div className={`p-3 rounded border text-xs space-y-2 ${
                isRetro
                  ? 'bg-zinc-200 border-zinc-400 text-zinc-800'
                  : isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
              }`}>
                <p className="font-bold">📶 Servidor Activo en tu Red Local</p>
                <p className={`${isRetro ? 'text-zinc-700' : isLight ? 'text-blue-900/80' : 'text-blue-200'}`}>
                  Para enlazar una Caja Secundaria, ve a la pantalla de activación de esa computadora, selecciona <strong>🌐 Enlazar como Caja Secundaria</strong>, luego ingresa el siguiente <strong>Código de Enlace</strong> (o la dirección IP física):
                </p>
                {(() => {
                  const code = ipToLinkCode(lanIp);
                  if (code) {
                    return (
                      <div className="space-y-2">
                        <div className={`flex flex-col items-center justify-center p-3 rounded border ${
                          isRetro
                            ? 'bg-zinc-300 border-zinc-400 text-black'
                            : isLight
                              ? 'bg-blue-950/5 border-blue-500/10 text-zinc-950'
                              : 'bg-black/40 border-white/5 text-white'
                        }`}>
                          <span className={`text-[9px] uppercase font-bold tracking-widest opacity-60 font-mono ${isLight ? 'text-zinc-500' : ''}`}>Código de Enlace</span>
                          <span className={`text-2xl font-black font-mono tracking-widest mt-1 ${
                            isRetro ? 'text-[#000080]' : isLight ? 'text-amber-600' : 'text-amber-400'
                          }`}>{code}</span>
                        </div>
                        <p className="text-[10px] text-center opacity-65 font-sans">
                          IP física: <span className="font-mono">{lanIp}</span>
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <p className={`text-sm font-mono p-2 rounded text-center font-bold tracking-wider ${
                        isRetro
                          ? 'bg-zinc-300 text-black border border-zinc-400'
                          : isLight
                            ? 'bg-blue-950 text-white'
                            : 'bg-black/40 text-white'
                      }`}>
                        {lanIp}
                      </p>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        )}

        <div className={`p-4 rounded border ${isRetro ? 'bg-zinc-200 border-zinc-400' : 'bg-white/5 border-white/10'} space-y-3`}>
          <h4 className={`text-sm font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'}`}>Nombre de esta Terminal</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={terminalNameLocal}
              onChange={(e) => setTerminalNameLocal(e.target.value)}
              className="p-2 rounded border border-white/10 bg-black/20 text-xs font-semibold text-white outline-none flex-1"
              placeholder="Ej. Caja Principal, Caja 2, Taller..."
            />
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('fixmanager_terminal_name', terminalNameLocal);
                showFeedback('success', 'Nombre de terminal guardado.');
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* ── SECCIÓN DE AUDITORÍA Y DIAGNÓSTICO DE SINCRONIZACIÓN ── */}
        <div className={`p-4 rounded border ${isRetro ? 'bg-zinc-200 border-zinc-400' : 'bg-white/5 border-white/10'} space-y-4`}>
          <div>
            <h4 className={`text-sm font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'}`}>🔍 Auditoría y Diagnóstico de Sincronización</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Verifica el estado de conexión con la nube, comprueba la presencia de UUIDs y detecta posibles colisiones de folios offline.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={auditLoading}
              onClick={handleRunAudit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition-colors"
            >
              {auditLoading ? 'Ejecutando Diagnóstico...' : '🔍 Ejecutar Auditoría'}
            </button>
            {auditResult && !auditResult.ok && (
              <button
                type="button"
                disabled={repairLoading}
                onClick={handleRepairSync}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition-colors animate-pulse"
              >
                {repairLoading ? 'Reparando datos...' : '🔧 Reparar Inconvenientes'}
              </button>
            )}
          </div>

          {auditResult && (
            <div className={`p-4 rounded border text-xs space-y-3 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-black/20 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">Resultados del Diagnóstico:</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                  auditResult.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {auditResult.ok ? 'Integridad Correcta ✅' : 'Requiere Atención ⚠️'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-2.5 rounded border ${isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                  <p className="font-bold mb-1 opacity-70">Nube / Cloud Status</p>
                  <p className={auditResult.connection.online ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {auditResult.connection.online
                      ? `Conectado (Latencia: ${auditResult.connection.latencyMs}ms)`
                      : 'Desconectado ❌'}
                  </p>
                </div>
                <div className={`p-2.5 rounded border ${isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                  <p className="font-bold mb-1 opacity-70">Sesión de Usuario</p>
                  <p className="font-bold text-zinc-300 truncate" title={auditResult.sessionUserEmail || 'No autenticado'}>
                    {auditResult.sessionUserEmail ? auditResult.sessionUserEmail : 'No autenticado ❌'}
                  </p>
                </div>
                <div className={`p-2.5 rounded border ${isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                  <p className="font-bold mb-1 opacity-70">Total Inconvenientes</p>
                  <p className={auditResult.totalIssues === 0 ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                    {auditResult.totalIssues} conflicto(s) o datos sin UUID
                  </p>
                </div>
              </div>

              {/* Warnings List */}
              {auditResult.warnings.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-dashed border-white/10">
                  <p className="font-bold text-amber-500">Inconvenientes detectados:</p>
                  <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                    {auditResult.warnings.map((w: string, idx: number) => (
                      <p key={idx} className="text-[11px] leading-relaxed text-zinc-300">
                        • {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Table details */}
              <div className="pt-2 border-t border-dashed border-white/10 space-y-2">
                <p className="font-bold">Estructuras de Sincronización Local:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                  {Object.entries(auditResult.tables).map(([tblName, data]: [string, any]) => {
                    const cleanName = tblName.replace('fixmanager_', '');
                    return (
                      <div key={tblName} className={`p-2 rounded border ${
                        data.collisions.length > 0 || data.missingUuidCount > 0
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <p className="font-bold uppercase tracking-wider opacity-85 truncate" title={cleanName}>
                          {cleanName}
                        </p>
                        <p className="text-zinc-400 mt-0.5">
                          Filas: <span className="font-bold text-zinc-400">{data.count}</span>
                        </p>
                        <p className="text-zinc-400">
                          Pendientes: <span className={data.dirtyCount > 0 ? 'font-bold text-amber-400' : 'text-zinc-500'}>{data.dirtyCount}</span>
                        </p>
                        {data.missingUuidCount > 0 && (
                          <p className="text-rose-400 font-bold mt-0.5">
                            Sin UUID: {data.missingUuidCount}
                          </p>
                        )}
                        {data.collisions.length > 0 && (
                          <p className="text-red-400 font-bold mt-0.5">
                            Colisión: {data.collisions.length}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaecelConfigTabProps {
  config: WorkshopConfig;
  onUpdateConfig: (config: WorkshopConfig) => void;
  isRetro: boolean;
  isLight: boolean;
}

export function TaecelConfigTab({ config, onUpdateConfig, isRetro, isLight }: TaecelConfigTabProps) {
  const [taecelEnabled, setTaecelEnabled] = useState(config.taecelEnabled ?? (config.taecelApiKey ? true : false));
  const [apiKey, setApiKey] = useState(config.taecelApiKey || '');
  const [nip, setNip] = useState(config.taecelNip || '');
  const [showManualConfig, setShowManualConfig] = useState(!!config.taecelApiKey || !!config.taecelNip);
  const hasCredentials = apiKey.trim() !== '' && nip.trim() !== '';
  const [cobrarComisionRecarga, setCobrarComisionRecarga] = useState(config.taecelComisionRecarga !== 0);
  const [comisionRecarga, setComisionRecarga] = useState(() => {
    if (config.taecelComisionRecarga === 0) return 3.00;
    return config.taecelComisionRecarga !== undefined ? config.taecelComisionRecarga : 3.00;
  });
  const [comisionServicio, setComisionServicio] = useState(config.taecelComisionServicio !== undefined ? config.taecelComisionServicio : 10.00);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de verificación de conexión en tiempo real
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string; balance?: number } | null>(null);

  // Estados para Registro de sub-cuenta Taecel (red)
  const [showRegisterTaecelModal, setShowRegisterTaecelModal] = useState(false);
  const [regNombre, setRegNombre] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regNomComercial, setRegNomComercial] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Formateo de teléfono para Taecel
  const formatTaecelPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 0) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6, 10)}`;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNombre.trim() || !regApellidos.trim() || !regCorreo.trim() || !regTelefono.trim()) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    const cleanPhone = regTelefono.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('El número de teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await taecelRegisterAccount({
        nombre: regNombre,
        apellidos: regApellidos,
        correo: regCorreo,
        telefono: cleanPhone,
        nomComercial: regNomComercial,
        forzarActivacion: 1
      });

      if (res.success && res.data && res.data.ws) {
        const newKey = res.data.ws.key;
        const newNip = res.data.ws.nip;
        setApiKey(newKey);
        setNip(newNip);
        setTaecelEnabled(true);
        setShowManualConfig(true);

        onUpdateConfig({
          ...config,
          taecelApiKey: newKey,
          taecelNip: newNip,
          taecelEnabled: true
        });

        alert(`¡Registro Exitoso!\n\nTu cuenta de Taecel se ha creado y activado automáticamente.\n\nNúmero de Cuenta: ${res.data.cuentaID}\nReferencia de Pagos (para depositar en banco): ${res.data.ReferenciaPagos}\n\nLas credenciales de acceso se han guardado e importado en tu FixManager de inmediato.`);
        setShowRegisterTaecelModal(false);
        
        setRegNombre('');
        setRegApellidos('');
        setRegCorreo('');
        setRegTelefono('');
        setRegNomComercial('');
      } else {
        alert(`Error al registrar cuenta: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Ocurrió un error inesperado: ${err.message || err}`);
    } finally {
      setRegLoading(false);
    }
  };

  const handleSave = () => {
    localStorage.removeItem('fixmanager_taecel_products_cache');
    localStorage.removeItem('fixmanager_taecel_products_cache_time');
    onUpdateConfig({
      ...config,
      taecelApiKey: apiKey.trim(),
      taecelNip: nip.trim(),
      taecelComisionRecarga: cobrarComisionRecarga ? Number(comisionRecarga) : 0,
      taecelComisionServicio: Number(comisionServicio),
      taecelEnabled: taecelEnabled
    });
    setShowManualConfig(false);
    setFeedback('💾 ¡Configuración de Taecel guardada con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleVerifyConnection = async () => {
    if (!apiKey.trim() || !nip.trim()) {
      setVerificationResult({ success: false, message: 'Ingresa primero tu Usuario y Contraseña/NIP para verificar.' });
      return;
    }
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const tempConfig = {
        ...config,
        taecelApiKey: apiKey.trim(),
        taecelNip: nip.trim()
      };
      const res = await taecelGetBalance(tempConfig);
      if (res.success) {
        setVerificationResult({
          success: true,
          message: `¡Conexión establecida con éxito! Saldo disponible: ${config.currencySymbol || '$'}${res.balance?.toFixed(2)} MXN`,
          balance: res.balance
        });
      } else {
        setVerificationResult({
          success: false,
          message: res.message || 'Credenciales inválidas o error de respuesta de Taecel.'
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || 'Error de conexión con el servidor de Taecel.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`p-6 rounded border space-y-6 ${
      isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
        : isLight ? 'bg-white border-zinc-200 shadow-xs'
        : 'bg-[#121316] border-zinc-900 shadow-md'
    }`}>
      <div>
        <h3 className={`text-base font-black uppercase tracking-wider mb-1 flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
          📱 CONFIGURACIÓN DE RECARGAS TAECEL
        </h3>
        <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
          Configura tus credenciales del integrador Taecel para vender tiempo aire, paquetes de datos, cobro de servicios y pines electrónicos directamente desde FixManager.
        </p>
      </div>

      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-900'
      }`}>
        <div className="max-w-md">
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-850' : 'text-zinc-300'}`}>
            Activar Módulo de Recargas y Servicios
          </span>
          <span className="text-[9.5px] text-zinc-550 font-medium leading-normal block mt-0.5">
            Habilita la venta de saldo telefónico, paquetes de datos y cobro de servicios en FixManager.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={taecelEnabled}
            onChange={(e) => setTaecelEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {taecelEnabled && (
        <>
          {/* BANNER REGISTRO DE RED */}
          {!hasCredentials && (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2 ${
              isRetro ? (isLight ? 'bg-amber-100 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 text-zinc-900' : 'bg-amber-950/40 border-2 border-amber-600/50 text-amber-200')
              : isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-500/5 border-amber-500/20'
            }`}>
              <div className="space-y-0.5 text-left">
                <span className={`text-[11px] font-black uppercase tracking-wider block ${isLight ? 'text-amber-800' : 'text-amber-450'}`}>
                  🔑 ¿Aún no perteneces a Taecel?
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold leading-normal block">
                  Crea tu cuenta de recargas de forma inmediata y automática desde aquí.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterTaecelModal(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer text-center active:scale-95 transition-all shadow-md ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-[#000080] hover:bg-[#d0d0d0]'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-650/15 animate-pulse'
                }`}
              >
                Crea tu cuenta desde aquí
              </button>
            </div>
          )}

          {!hasCredentials && !showManualConfig && (
            <div className="flex justify-start mb-4">
              <button
                type="button"
                onClick={() => setShowManualConfig(true)}
                className={`text-xs font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                  isRetro ? (isLight ? 'text-[#000080]' : 'text-blue-300') : isLight ? 'text-zinc-650' : 'text-zinc-400'
                }`}
              >
                🔑 Ya tengo una cuenta (Configurar manualmente)
              </button>
            </div>
          )}

          {(hasCredentials || showManualConfig) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {hasCredentials && !showManualConfig && (
                <div className="flex justify-start md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowManualConfig(true)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-500 hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    ✏️ Editar credenciales manualmente
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Usuario / API Key
                </label>
                <input
                  type="text"
                  placeholder="Ingresa tu Usuario o API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  readOnly={hasCredentials && !showManualConfig}
                  className={`px-3 py-2 text-xs font-mono rounded outline-none border transition-all ${
                    hasCredentials && !showManualConfig ? 'opacity-75 cursor-not-allowed' : ''
                  } ${
                    isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                      : isLight ? (hasCredentials && !showManualConfig ? 'bg-slate-100 border-zinc-300 text-zinc-650' : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500')
                      : (hasCredentials && !showManualConfig ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-950 border-zinc-800 text-white focus:border-cyan-500')
                  }`}
                />
                <span className="text-[9px] text-zinc-550 font-semibold leading-normal">El Usuario o API Key asignado a tu cuenta.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Contraseña / NIP de API
                </label>
                <input
                  type="password"
                  placeholder="Ingresa tu Contraseña o NIP de API"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  readOnly={hasCredentials && !showManualConfig}
                  className={`px-3 py-2 text-xs font-mono rounded outline-none border transition-all ${
                    hasCredentials && !showManualConfig ? 'opacity-75 cursor-not-allowed' : ''
                  } ${
                    isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                      : isLight ? (hasCredentials && !showManualConfig ? 'bg-slate-100 border-zinc-300 text-zinc-650' : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500')
                      : (hasCredentials && !showManualConfig ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-950 border-zinc-800 text-white focus:border-cyan-500')
                  }`}
                />
                <span className="text-[9px] text-zinc-550 font-semibold leading-normal">El NIP de la API correspondiente a tu cuenta.</span>
              </div>

              <div className="flex flex-col gap-1.5 justify-between">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Cobrar Comisión por Recarga
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cobrarComisionRecarga}
                      onChange={(e) => setCobrarComisionRecarga(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {cobrarComisionRecarga ? (
                  <>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="3.00"
                      value={comisionRecarga}
                      onChange={(e) => setComisionRecarga(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className={`px-3 py-2 text-xs font-mono rounded outline-none border transition-all ${
                        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                          : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500'
                          : 'bg-zinc-950 border-zinc-800 text-white focus:border-cyan-500'
                      }`}
                    />
                    <span className="text-[9px] text-zinc-550 font-semibold leading-normal">Cargo extra sugerido cobrado al cliente.</span>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className={`px-3 py-2 text-xs font-semibold rounded border ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-900 border-zinc-800 text-zinc-550'}`}>
                      Sin comisión extra al cliente ($0.00 MXN)
                    </div>
                    <span className="text-[9px] text-zinc-550 font-semibold leading-normal">Se venderán las recargas a precio de lista.</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Comisión por Pago de Servicios ($ MXN)
                </label>
                <input
                  type="number"
                  step="0.50"
                  placeholder="10.00"
                  value={comisionServicio}
                  onChange={(e) => setComisionServicio(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className={`px-3 py-2 text-xs font-mono rounded outline-none border transition-all ${
                    isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                      : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500'
                      : 'bg-zinc-950 border-zinc-800 text-white focus:border-cyan-500'
                  }`}
                />
                <span className="text-[9px] text-zinc-550 font-semibold">Cargo extra sugerido para CFE, Telmex, etc.</span>
              </div>

              {/* BOTÓN DE PROBAR CONEXIÓN EN TIEMPO REAL */}
              <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-4 pt-3.5 border-t dark:border-zinc-900">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleVerifyConnection}
                  className={`px-4.5 py-2 text-xs font-black uppercase tracking-wider rounded transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-97 border ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-350 text-slate-800' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      Probando conexión...
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-sky-500" />
                      Probar Conexión con Taecel
                    </>
                  )}
                </button>

                {verificationResult && (
                  <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between flex-1 gap-4 leading-normal ${
                    verificationResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-450 animate-fadeIn'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-450 animate-fadeIn'
                  }`}>
                    <span className="flex-1">{verificationResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t dark:border-zinc-900">
        {feedback && (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            {feedback}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer rounded transition-all active:scale-95 ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080]'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
          }`}
        >
          Guardar Configuración
        </button>
      </div>

      {/* MODAL DE REGISTRO EN LA RED DE TAECEL */}
      {showRegisterTaecelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleRegisterSubmit}
            className={`w-full max-w-md flex flex-col relative overflow-hidden animate-scale-up ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-black border-r-black text-zinc-900 shadow-2xl'
                : isLight 
                  ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900'
                  : 'bg-[#0c0d11] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
            }`}
          >
            {/* Cabecera */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro
                ? 'bg-[#000080] text-white border-b-[#808080]'
                : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-[#111217] border-zinc-800 text-zinc-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isRetro
                    ? 'bg-white/20 text-white'
                    : isLight ? 'bg-amber-100 border border-amber-300 text-amber-850' : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                }`}>
                  <span className="text-base">📱</span>
                </div>
                <div>
                  <h4 className={`text-[9px] font-mono font-black uppercase tracking-widest ${isRetro ? 'text-blue-200' : 'text-zinc-450'}`}>ALTA DE CUENTA</h4>
                  <p className="text-sm font-sans font-black">Crea tu cuenta de recargas Taecel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterTaecelModal(false)}
                className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-all rounded-lg ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-black border-r-black text-zinc-900 font-bold hover:bg-[#d0d0d0]'
                    : isLight ? 'bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-900 border border-zinc-650 hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] text-left text-xs font-semibold leading-relaxed">
              <p className={isRetro ? (isLight ? 'text-zinc-800' : 'text-zinc-200') : isLight ? 'text-zinc-500' : 'text-zinc-400'}>
                Llena tus datos para crear una cuenta de recargas vinculada a nuestra red de distribución.
              </p>
              
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  className={`w-full px-3 py-1.5 border focus:outline-none ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                      : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white rounded-lg' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318] rounded-lg'
                  }`}
                  placeholder="Tu primer nombre"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Apellidos *</label>
                <input
                  type="text"
                  required
                  value={regApellidos}
                  onChange={(e) => setRegApellidos(e.target.value)}
                  className={`w-full px-3 py-1.5 border focus:outline-none ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                      : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white rounded-lg' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318] rounded-lg'
                  }`}
                  placeholder="Tus apellidos"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={regCorreo}
                  onChange={(e) => setRegCorreo(e.target.value)}
                  className={`w-full px-3 py-1.5 border focus:outline-none ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                      : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white rounded-lg' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318] rounded-lg'
                  }`}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Teléfono Celular *</label>
                <input
                  type="tel"
                  required
                  maxLength={14}
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(formatTaecelPhone(e.target.value))}
                  className={`w-full px-3 py-1.5 border focus:outline-none ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                      : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white rounded-lg' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318] rounded-lg'
                  }`}
                  placeholder="(55) 1234-5678"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Nombre Comercial del Negocio (Opcional)</label>
                <input
                  type="text"
                  value={regNomComercial}
                  onChange={(e) => setRegNomComercial(e.target.value)}
                  className={`w-full px-3 py-1.5 border focus:outline-none ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                      : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:bg-white rounded-lg' : 'bg-zinc-900 border-zinc-700 text-white focus:bg-[#121318] rounded-lg'
                  }`}
                  placeholder="Nombre de tu local"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-4 border-t flex justify-end gap-2.5 shrink-0 ${
              isRetro
                ? 'bg-[#dfdfdf] border-t-zinc-400'
                : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#111217] border-zinc-850'
            }`}>
              <button
                type="button"
                onClick={() => setShowRegisterTaecelModal(false)}
                className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-900 hover:bg-[#d0d0d0]'
                    : isLight ? 'border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl' : 'border border-zinc-800 bg-[#161822] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={regLoading}
                className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-md flex items-center gap-1.5 ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-black border-r-black text-[#000080] font-black hover:bg-[#d0d0d0]'
                    : 'bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-amber-650/10'
                }`}
              >
                {regLoading ? 'Registrando...' : 'Registrar Cuenta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   7. GENERAL CONFIG VIEW
   ========================================================== */
interface ConfigViewProps {
  config: WorkshopConfig;
  onUpdateConfig: (config: WorkshopConfig) => void;
  activeSubTab?: 'global' | 'printer' | 'users' | 'notifications' | 'dev' | 'audit' | 'network' | 'taecel';
  setActiveSubTab?: (tab: 'global' | 'printer' | 'users' | 'notifications' | 'dev' | 'audit' | 'network' | 'taecel') => void;
  auditLog?: AuditEntry[];
  setActiveTab?: (tab: ActiveTab) => void;
  setSelectedOrderId?: (id: string | null) => void;
  highlightBrand?: boolean;
  appVersion?: string;
  onPublishVersion?: () => void;
  onExportData?: () => void;
  onImportData?: (mode: 'merge' | 'restore') => void;
  users?: AppUser[];
  onUpdateUsers?: (users: AppUser[]) => void;
  currentUser?: AppUser | null;
  sales?: Sale[];
  orders?: RepairOrder[];
  onDevLoadSampleInventory?: () => void;
  onDevResetAllData?: () => void;
  onDevClearLicense?: () => void;
}
const CONFIG_SEARCH_INDEX = [
  // 🏢 Datos del Negocio
  {
    id: 'config-business-name',
    title: '🏢 Nombre del Negocio / Tienda',
    keywords: ['nombre', 'tienda', 'negocio', 'razon', 'social', 'empresa', 'titulo', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-name'
  },
  {
    id: 'config-business-slogan',
    title: '🏢 Eslogan / Frase en Ticket',
    keywords: ['eslogan', 'slogan', 'frase', 'ticket', 'mensaje', 'pie', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-name'
  },
  {
    id: 'config-business-phone',
    title: '🏢 Teléfono de Contacto',
    keywords: ['telefono', 'celular', 'contacto', 'whatsapp', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-phone'
  },
  {
    id: 'config-business-email',
    title: '🏢 Correo Electrónico (Email)',
    keywords: ['correo', 'email', 'contacto', 'gmail', 'outlook', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-phone'
  },
  {
    id: 'config-business-currency',
    title: '🏢 Símbolo de Moneda / Divisa',
    keywords: ['moneda', 'simbolo', 'divisa', 'peso', 'dolar', 'dinero', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-currency'
  },
  {
    id: 'config-business-tax',
    title: '🏢 Impuesto / IVA',
    keywords: ['impuesto', 'iva', 'tax', 'porcentaje', 'tasa', 'cobrar', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-currency'
  },
  {
    id: 'config-business-address',
    title: '🏢 Dirección Física / Sucursal',
    keywords: ['direccion', 'ubicacion', 'calle', 'sucursal', 'domicilio', 'local', 'datos'],
    tab: 'global' as const,
    subTab: 'business' as const,
    elementId: 'config-business-phone'
  },
  {
    id: 'config-business-goal',
    title: '🏢 Meta Diaria de Ventas',
    keywords: ['meta', 'diaria', 'ventas', 'objetivo', 'dinero', 'comision', 'datos'],
    tab: 'global' as const,
    subTab: 'system' as const,
    elementId: 'config-business-goal'
  },

  // 🖼️ Logotipos de Marca
  {
    id: 'config-logo-main',
    title: '🖼️ Logotipo Principal (App)',
    keywords: ['logo', 'logotipo', 'marca', 'imagen', 'principal', 'sistema', 'subir'],
    tab: 'global' as const,
    subTab: 'logos' as const,
    elementId: 'config-logo-main'
  },
  {
    id: 'config-logo-ticket',
    title: '🖼️ Logo para Ticket de Venta',
    keywords: ['logo', 'logotipo', 'ticket', 'impresion', 'imprimir', 'imagen'],
    tab: 'global' as const,
    subTab: 'logos' as const,
    elementId: 'config-logo-main'
  },
  {
    id: 'config-logo-mediacarta',
    title: '🖼️ Logo para PDF Media Carta',
    keywords: ['logo', 'logotipo', 'pdf', 'carta', 'hoja', 'impresion', 'imagen'],
    tab: 'global' as const,
    subTab: 'logos' as const,
    elementId: 'config-logo-main'
  },
  {
    id: 'config-logo-quote2',
    title: '🖼️ Logo Secundario para Cotización',
    keywords: ['logo', 'logotipo', 'cotizacion', 'presupuesto', 'imagen'],
    tab: 'global' as const,
    subTab: 'logos' as const,
    elementId: 'config-logo-main'
  },
  {
    id: 'config-logo-label',
    title: '🖼️ Logo para Etiquetas de Código',
    keywords: ['logo', 'logotipo', 'etiqueta', 'codigo', 'barras', 'producto', 'imagen'],
    tab: 'global' as const,
    subTab: 'logos' as const,
    elementId: 'config-logo-main'
  },

  // 🎨 Apariencia y Sistema
  {
    id: 'config-system-theme',
    title: '🎨 Tema Visual (Moderno / Retro / Fluent)',
    keywords: ['tema', 'visual', 'apariencia', 'diseño', 'retro', 'fluent', 'moderno', 'sistema'],
    tab: 'global' as const,
    subTab: 'system' as const,
    elementId: 'config-system-theme'
  },
  {
    id: 'config-system-mode',
    title: '🎨 Modo Oscuro / Claro',
    keywords: ['modo', 'oscuro', 'claro', 'color', 'fondo', 'apariencia', 'sistema'],
    tab: 'global' as const,
    subTab: 'system' as const,
    elementId: 'config-system-theme'
  },
  {
    id: 'config-system-fullscreen',
    title: '🎨 Pantalla Completa por Defecto',
    keywords: ['pantalla', 'completa', 'fullscreen', 'inicio', 'sistema', 'arrancar'],
    tab: 'global' as const,
    subTab: 'system' as const,
    elementId: 'config-system-theme'
  },
  {
    id: 'config-system-zoom',
    title: '🎨 Zoom / Escala de la Interfaz',
    keywords: ['zoom', 'escala', 'tamaño', 'letra', 'interfaz', 'fuente', 'pantalla', 'sistema'],
    tab: 'global' as const,
    subTab: 'system' as const,
    elementId: 'config-system-zoom'
  },

  // ⚙️ Módulos Activos
  {
    id: 'config-modules-workshopmode',
    title: '⚙️ Modo del Taller (Personal / Equipo)',
    keywords: ['modo', 'taller', 'equipo', 'personal', 'tecnico', 'reparar', 'roles', 'modulos'],
    tab: 'global' as const,
    subTab: 'modules' as const,
    elementId: 'config-modules-workshopmode'
  },
  {
    id: 'config-modules-active',
    title: '⚙️ Activar Taller y Tienda/POS',
    keywords: ['modulos', 'activos', 'taller', 'tienda', 'pos', 'habilitar', 'desactivar'],
    tab: 'global' as const,
    subTab: 'modules' as const,
    elementId: 'config-modules-active'
  },
  {
    id: 'modules-visibility-section',
    title: '⚙️ Ocultar / Mostrar Módulos (Visibilidad)',
    keywords: ['visibilidad', 'ocultar', 'mostrar', 'menu', 'lateral', 'sidebar', 'ordenes', 'ventas', 'stock', 'clientes', 'modulos'],
    tab: 'global' as const,
    subTab: 'modules' as const,
    elementId: 'modules-visibility-section'
  },

  // 💾 Respaldos de Datos
  {
    id: 'config-backup-auto',
    title: '💾 Respaldos Automáticos de la BD',
    keywords: ['respaldo', 'copia', 'seguridad', 'backup', 'automatico', 'guardar', 'ruta', 'respaldos'],
    tab: 'global' as const,
    subTab: 'backup' as const,
    elementId: 'config-backup-auto'
  },
  {
    id: 'config-backup-cloud',
    title: '💾 Respaldos en la Nube (Google Drive)',
    keywords: ['respaldo', 'copia', 'nube', 'backup', 'cloud', 'drive', 'correo', 'respaldos'],
    tab: 'global' as const,
    subTab: 'backup' as const,
    elementId: 'config-backup-cloud'
  },
  {
    id: 'config-backup-transfer',
    title: '💾 Exportar / Importar Base de Datos (JSON)',
    keywords: ['exportar', 'importar', 'base', 'datos', 'archivo', 'json', 'restaurar', 'respaldos'],
    tab: 'global' as const,
    subTab: 'backup' as const,
    elementId: 'config-backup-transfer'
  },

  // 🖨️ Impresoras y Tickets
  {
    id: 'config-printer-pos',
    title: '🖨️ Impresora de Tickets (Ventas / POS)',
    keywords: ['impresora', 'ticket', 'venta', 'pos', 'ancho', '58mm', '80mm', 'eco', 'autoimprimir', 'copias', 'impresoras'],
    tab: 'printer' as const,
    elementId: 'config-printer-pos'
  },
  {
    id: 'config-printer-label',
    title: '🖨️ Impresora de Etiquetas (Código de Barras)',
    keywords: ['impresora', 'etiqueta', 'codigo', 'barras', 'precios', 'papel', 'zpl', 'impresoras'],
    tab: 'printer' as const,
    elementId: 'config-printer-label'
  },
  {
    id: 'config-printer-report',
    title: '🖨️ Impresora de Reportes y Hojas Carta/A4',
    keywords: ['impresora', 'reporte', 'hoja', 'carta', 'a4', 'pdf', 'imprimir', 'impresoras'],
    tab: 'printer' as const,
    elementId: 'config-printer-report'
  },
  {
    id: 'config-printer-clauses',
    title: '🖨️ Cláusulas y Condiciones del Contrato',
    keywords: ['contrato', 'clausulas', 'terminos', 'condiciones', 'taller', 'garantia', 'firma'],
    tab: 'printer' as const,
    elementId: 'config-printer-clauses'
  },
  {
    id: 'config-printer-template',
    title: '🖨️ Formato y Plantillas del Ticket (POS/Taller)',
    keywords: ['plantilla', 'formato', 'ticket', 'diseño', 'personalizar', 'campos', 'impresion'],
    tab: 'printer' as const,
    elementId: 'config-printer-template'
  },

  // 👥 Usuarios y Accesos
  {
    id: 'config-users-section',
    title: '👥 Gestión de Usuarios y Permisos',
    keywords: ['usuario', 'empleado', 'tecnico', 'administrador', 'contraseña', 'agregar', 'permisos', 'roles', 'accesos'],
    tab: 'users' as const,
    elementId: 'config-users-section'
  },

  // 💬 Notificaciones
  {
    id: 'config-notif-whatsapp',
    title: '💬 Notificaciones de WhatsApp API',
    keywords: ['whatsapp', 'notificacion', 'mensaje', 'api', 'celular', 'enviar', 'cliente', 'telefono'],
    tab: 'notifications' as const,
    elementId: 'config-notif-whatsapp'
  },
  {
    id: 'config-notif-telegram',
    title: '💬 Notificaciones y Reportes de Telegram',
    keywords: ['telegram', 'notificacion', 'bot', 'chat', 'token', 'reportes', 'enviar'],
    tab: 'notifications' as const,
    elementId: 'config-notif-telegram'
  },

  // 🌐 Red Local
  {
    id: 'config-network-section',
    title: '🌐 Red Local y Conexión Multicaja',
    keywords: ['red', 'terminal', 'conexion', 'servidor', 'ip', 'local', 'multiples', 'multicaja'],
    tab: 'network' as const,
    elementId: 'config-network-section'
  },

  // 🛡 Auditoría
  {
    id: 'config-audit-section',
    title: '🛡 Registro de Auditoría y Logs',
    keywords: ['auditoria', 'historial', 'actividad', 'logs', 'movimientos', 'seguridad', 'acciones'],
    tab: 'audit' as const,
    elementId: 'config-audit-section'
  },

  // 🛠 Desarrollo
  {
    id: 'config-dev-section',
    title: '🛠 Panel y Herramientas de Desarrollo',
    keywords: ['consola', 'desarrollo', 'db', 'limpiar', 'restablecer', 'logs', 'test', 'contraseña'],
    tab: 'dev' as const,
    elementId: 'config-dev-section'
  }
];

/** Sub-componente para cada ítem del buscador de configuración en modo Retro.
 *  Usa useState para controlar el hover de forma local y aplica estilos inline
 *  para evitar conflictos con las reglas !important del tema retro en index.css.
 */
interface RetroResultItemProps {
  item: typeof CONFIG_SEARCH_INDEX[number];
  onClick: () => void;
}
const RetroResultItem: React.FC<RetroResultItemProps> = ({ item, onClick }) => {
  const [hovered, setHovered] = React.useState(false);
  const sectionLabel =
    item.tab === 'global'
      ? `Preferencias Globales > ${item.subTab === 'business' ? 'Datos del Negocio' : item.subTab === 'logos' ? 'Logotipos' : item.subTab === 'system' ? 'Apariencia' : item.subTab === 'modules' ? 'Módulos' : 'Respaldos'}`
      : item.tab === 'printer' ? 'Impresora y Tickets'
      : item.tab === 'users' ? 'Usuarios y Accesos'
      : item.tab === 'notifications' ? 'Notificaciones'
      : item.tab === 'network' ? 'Red Local'
      : item.tab === 'audit' ? 'Auditoría'
      : 'Desarrollo';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={hovered ? 'retro-item-hovered' : ''}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 12px',
        fontSize: '10.5px',
        fontWeight: 500,
        cursor: 'pointer',
        borderBottom: '1px solid #c0c0c0',
        backgroundColor: hovered ? '#000080' : '#ffffff',
        transition: 'none'
      }}
    >
      <span style={{ display: 'block', fontWeight: 'bold' }}>{item.title}</span>
      <span style={{ display: 'block', fontSize: '8.5px', marginTop: '2px', opacity: 0.8 }}>
        Sección: {sectionLabel}
      </span>
    </button>
  );
}

export function ConfigView({
  config,
  onUpdateConfig,
  activeSubTab = 'global',
  setActiveSubTab,
  setActiveTab,
  setSelectedOrderId,
  highlightBrand = false,
  appVersion = '1.0',
  onPublishVersion,
  onExportData,
  onImportData,
  users = [],
  onUpdateUsers,
  currentUser,
  onDevLoadSampleInventory,
  onDevResetAllData,
  onDevClearLicense,
  auditLog = [],
  sales = [],
  orders = [],
}: ConfigViewProps) {
  const [storeName, setStoreName] = useState(config.storeName);
  const [slogan, setSlogan] = useState(config.slogan || '');
  const [phone, setPhone] = useState(config.phone || '');
  const [phone2, setPhone2] = useState(config.phone2 || '');
  const [email, setEmail] = useState(config.email || '');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [ticketLogoUrl, setTicketLogoUrl] = useState(config.ticketLogoUrl || '');
  const [mediaCartaLogoUrl, setMediaCartaLogoUrl] = useState(config.mediaCartaLogoUrl || '');
  const [quoteSecondLogoUrl, setQuoteSecondLogoUrl] = useState(config.quoteSecondLogoUrl || '');
  const [globalSubTab, setGlobalSubTab] = useState<'business' | 'logos' | 'system' | 'modules' | 'backup'>('business');
  const [labelLogoUrl, setLabelLogoUrl] = useState(config.labelLogoUrl || '');
  const [currencySymbol, setCurrencySymbol] = useState(config.currencySymbol || '$');
  const [address, setAddress] = useState(config.address || '');
  const [addressStreet, setAddressStreet] = useState(config.addressStreet || '');
  const [addressNumber, setAddressNumber] = useState(config.addressNumber || '');
  const [addressColonia, setAddressColonia] = useState(config.addressColonia || '');
  const [addressCity, setAddressCity] = useState(config.addressCity || '');
  const [addressState, setAddressState] = useState(config.addressState || '');
  const [addressZip, setAddressZip] = useState(config.addressZip || '');
  const [addressCountry, setAddressCountry] = useState(config.addressCountry || 'México');
  const [googleMapsLink, setGoogleMapsLink] = useState(config.googleMapsLink || '');
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [coloniaOptions, setColoniaOptions] = useState<string[]>([]);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [taxRate, setTaxRate] = useState(config.taxRate);
  const [showTaxRate, setShowTaxRate] = useState(config.showTaxRate ?? true);
  const [metaDiariaVentas, setMetaDiariaVentas] = useState(config.metaDiariaVentas ?? 0);
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(config.defaultCreditLimit ?? 1000);
  const [color, setColor] = useState(config.primaryColor);
  const [defaultStartView, setDefaultStartView] = useState<'Panel' | 'POS' | 'Nueva'>(config.defaultStartView || 'Panel');
  const [theme, setTheme] = useState<'modern' | 'retro-window' | 'fluent'>(config.theme || 'modern');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(config.themeMode || 'dark');
  const [defaultFullscreen, setDefaultFullscreen] = useState(config.defaultFullscreen || false);
  const [workshopMode, setWorkshopMode] = useState<'personal' | 'team'>(config.workshopMode ?? 'personal');
  const [appZoomLevel, setAppZoomLevel] = useState<number | 'auto'>(config.appZoomLevel || 'auto');

  const [unattendedSupportEnabled, setUnattendedSupportEnabled] = useState(config.unattendedSupportEnabled ?? true);
  const [enableTaller, setEnableTaller] = useState(config.enableTaller ?? true);
  const [enablePOS, setEnablePOS] = useState(config.enablePOS ?? true);
  const [enableWarehouses, setEnableWarehouses] = useState(config.enableWarehouses ?? false);
  const [quoteSignature, setQuoteSignature] = useState(config.quoteSignature || '');
  const [hiddenModules, setHiddenModules] = useState<string[]>(config.hiddenModules || []);
  const [businessHours, setBusinessHours] = useState(config.businessHours || '');
  const [manualHoursText, setManualHoursText] = useState(config.businessHours && !config.businessHours.trim().startsWith('{') ? config.businessHours : '');
  const [isEditingSchedule, setIsEditingSchedule] = useState<boolean>(!config.businessHours);
  const [socialFacebook, setSocialFacebook] = useState<string>(config.socialFacebook || '');
  const [socialInstagram, setSocialInstagram] = useState<string>(config.socialInstagram || '');
  const [socialTiktok, setSocialTiktok] = useState<string>(config.socialTiktok || '');

  const getInitialWeeklySchedule = (): WeeklySchedule => {
    const defaultVal: WeeklySchedule = {
      lunes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
      martes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
      miercoles: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
      jueves: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
      viernes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
      sabado: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '14:00' },
      domingo: { isOpen: false, type: 'closed' }
    };
    if (!config.businessHours) return defaultVal;
    if (!config.businessHours.trim().startsWith('{')) return defaultVal;
    try {
      return JSON.parse(config.businessHours);
    } catch (e) {
      return defaultVal;
    }
  };

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(getInitialWeeklySchedule);

  const [supabaseEmail, setSupabaseEmail] = useState<string | null>(null);
  const [showCloudLogin, setShowCloudLogin] = useState(false);
  const [cloudLoginEmail, setCloudLoginEmail] = useState('');
  const [cloudLoginPassword, setCloudLoginPassword] = useState('');
  const [cloudLoginError, setCloudLoginError] = useState('');
  const [cloudLoginLoading, setCloudLoginLoading] = useState(false);
  const [isSyncAuthorized, setIsSyncAuthorized] = useState(() => localStorage.getItem('fixmanager_cloud_sync_enabled') === 'true');
  const [highlightCloudCard, setHighlightCloudCard] = useState(false);

  // Cargar usuario activo de Supabase para la sección de sincronización y consultar su sublicencia actual
  useEffect(() => {
    const fetchSupabaseUser = async () => {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data?.session?.user?.email) {
        setSupabaseEmail(data.session.user.email);
        localStorage.setItem('fixmanager_user_id', data.session.user.id);

        // Consultar dinámicamente si la sublicencia está activa
        const { data: profile } = await supabase
          .from('profiles')
          .select('cloud_sync_enabled')
          .eq('id', data.session.user.id)
          .maybeSingle();
        if (profile) {
          const enabled = !!profile.cloud_sync_enabled;
          localStorage.setItem('fixmanager_cloud_sync_enabled', String(enabled));
          setIsSyncAuthorized(enabled);
        }
      }
    };
    fetchSupabaseUser();

    // Escuchar el evento de desactivación forzada en segundo plano (cierre completo)
    const handleDeactivated = () => {
      setIsSyncAuthorized(false);
      setSupabaseEmail(null);
    };

    // Escuchar el evento de pausa de sincronización en segundo plano (conservando email)
    const handlePaused = () => {
      setIsSyncAuthorized(false);
    };

    // Escuchar el evento de reactivación automática de sincronización (sin clicks)
    const handleActivated = () => {
      setIsSyncAuthorized(true);
    };

    window.addEventListener('fixmanager_cloud_sync_deactivated', handleDeactivated);
    window.addEventListener('fixmanager_cloud_sync_paused', handlePaused);
    window.addEventListener('fixmanager_cloud_sync_activated', handleActivated);
    return () => {
      window.removeEventListener('fixmanager_cloud_sync_deactivated', handleDeactivated);
      window.removeEventListener('fixmanager_cloud_sync_paused', handlePaused);
      window.removeEventListener('fixmanager_cloud_sync_activated', handleActivated);
    };
  }, []);

  // Escuchar evento para cambiar a la pestaña de respaldos (desde el modal de licencia del Topbar)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleSwitchToBackup = () => {
      setGlobalSubTab('backup');
      setHighlightCloudCard(true);
      timer = setTimeout(() => {
        setHighlightCloudCard(false);
      }, 3500);
    };
    window.addEventListener('fixmanager_switch_to_backup_tab', handleSwitchToBackup);
    return () => {
      window.removeEventListener('fixmanager_switch_to_backup_tab', handleSwitchToBackup);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleCloudLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudLoginLoading(true);
    setCloudLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cloudLoginEmail.trim(),
        password: cloudLoginPassword,
      });

      if (error) {
        setCloudLoginError('Error de autenticación: ' + error.message);
        return;
      }

      if (data?.user?.email) {
        // Fetch cloud_sync_enabled first to check if authorized
        const { data: profile } = await supabase
          .from('profiles')
          .select('cloud_sync_enabled')
          .eq('id', data.user.id)
          .maybeSingle();

        const enabled = !!profile?.cloud_sync_enabled;

        if (!enabled) {
          // Si no tiene la sublicencia activa, cerrar sesión de inmediato y mostrar error
          await supabase.auth.signOut().catch(() => {});
          setCloudLoginError('Tu plan actual no incluye el módulo de Sincronización en la Nube. Por favor contacta a soporte o administración.');
          return;
        }

        setSupabaseEmail(data.user.email || '');
        localStorage.setItem('fixmanager_user_id', data.user.id);
        localStorage.setItem('fixmanager_cloud_sync_enabled', 'true');
        setIsSyncAuthorized(true);

        const api = (window as any).electronAPI;
        if (api?.saveSupabaseSession && data.session) {
          await api.saveSupabaseSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }).catch(() => {});
        }
        setShowCloudLogin(false);
        setCloudLoginEmail('');
        setCloudLoginPassword('');
        window.location.reload(); // Recargar para activar el motor de sincronización
      }
    } catch (err: any) {
      setCloudLoginError('Error de conexión: ' + err.message);
    } finally {
      setCloudLoginLoading(false);
    }
  };

  // ── Resincronizar estados locales cuando config cambie externamente (LAN sync, backup, etc.) ──
  useEffect(() => {
    setSocialFacebook(config.socialFacebook || '');
    setSocialInstagram(config.socialInstagram || '');
    setSocialTiktok(config.socialTiktok || '');
  }, [config.socialFacebook, config.socialInstagram, config.socialTiktok]);

  useEffect(() => {
    setAddress(config.address || '');
    setAddressStreet(config.addressStreet || '');
    setAddressNumber(config.addressNumber || '');
    setAddressColonia(config.addressColonia || '');
    setAddressCity(config.addressCity || '');
    setAddressState(config.addressState || '');
    setAddressZip(config.addressZip || '');
    setAddressCountry(config.addressCountry || 'México');
    setGoogleMapsLink(config.googleMapsLink || '');
  }, [config.address, config.addressStreet, config.addressNumber, config.addressColonia, config.addressCity, config.addressState, config.addressZip, config.addressCountry, config.googleMapsLink]);

  // Cargar estados dinámicamente cuando cambie el país
  useEffect(() => {
    if (!addressCountry) {
      setAvailableStates(MEXICAN_STATES);
      return;
    }

    const cLower = addressCountry.toLowerCase();
    if (cLower === 'méxico' || cLower === 'mexico') {
      setAvailableStates(MEXICAN_STATES);
      return;
    }
    if (cLower === 'estados unidos' || cLower === 'united states' || cLower === 'us' || cLower === 'usa') {
      setAvailableStates(USA_STATES_LIST);
      return;
    }
    if (cLower === 'colombia') {
      setAvailableStates(COLOMBIA_DEPARTMENTS);
      return;
    }

    let isMounted = true;
    const fetchStates = async () => {
      try {
        const normalizedCountry = addressCountry.toLowerCase().includes('méxico') || addressCountry.toLowerCase().includes('mexico') ? 'Mexico'
          : addressCountry.toLowerCase().includes('estados unidos') || addressCountry.toLowerCase().includes('united states') || addressCountry.toLowerCase().includes('usa') || addressCountry.toLowerCase().includes('us') ? 'United States'
          : addressCountry;
        
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: normalizedCountry })
        });
        const json = await response.json();
        if (isMounted && json && !json.error && json.data && json.data.states) {
          const stateNames = json.data.states.map((s: any) => s.name);
          setAvailableStates(stateNames);
        }
      } catch (err) {
        console.error('Error fetching states:', err);
      }
    };

    fetchStates();

    return () => {
      isMounted = false;
    };
  }, [addressCountry]);

  // Cargar ciudades/municipios dinámicamente cuando cambie el estado
  useEffect(() => {
    if (!addressState || !addressCountry) {
      setAvailableCities([]);
      return;
    }

    // Si es México y tenemos datos locales de municipios, usarlos directamente de inmediato
    if ((!addressCountry || addressCountry === 'México' || addressCountry.toLowerCase() === 'mexico') && MEXICO_STATES_DATA[addressState]) {
      setAvailableCities(MEXICO_STATES_DATA[addressState]);
      return;
    }

    let isMounted = true;
    const fetchCities = async () => {
      try {
        const normalizedCountry = addressCountry.toLowerCase().includes('méxico') || addressCountry.toLowerCase().includes('mexico') ? 'Mexico'
          : addressCountry.toLowerCase().includes('estados unidos') || addressCountry.toLowerCase().includes('united states') || addressCountry.toLowerCase().includes('usa') || addressCountry.toLowerCase().includes('us') ? 'United States'
          : addressCountry;

        const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: normalizedCountry, state: addressState })
        });
        const json = await response.json();
        if (isMounted && json && !json.error && json.data && Array.isArray(json.data)) {
          setAvailableCities(json.data);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };

    fetchCities();

    return () => {
      isMounted = false;
    };
  }, [addressState, addressCountry]);

  // Búsqueda y Autocompletado con SEPOMEX + Copomex al ingresar CP de 5 dígitos
  useEffect(() => {
    const zip = addressZip.trim();
    if (zip.length === 5 && /^\d+$/.test(zip)) {
      setIsLoadingZip(true);
      
      const fetchCopomexFallback = (postalCode: string) => {
        fetch(`https://api.copomex.com/query/info_cp/${postalCode}?token=pruebas`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              const first = data[0]?.response;
              if (first) {
                setAddressCountry("México");
                let estadoNorm = first.estado || '';
                if (estadoNorm.includes(" de Ocampo")) estadoNorm = estadoNorm.replace(" de Ocampo", "");
                if (estadoNorm.includes(" de Ignacio de la Llave")) estadoNorm = estadoNorm.replace(" de Ignacio de la Llave", "");
                if (estadoNorm.includes(" Coahuila de Zaragoza")) estadoNorm = estadoNorm.replace(" Coahuila de Zaragoza", "Coahuila");
                
                setAddressState(estadoNorm);
                const cleanCity = first.municipio || first.ciudad || '';
                setAddressCity(cleanCity);
                
                const colonias: string[] = data.map((item: any) => item?.response?.asentamiento).filter(Boolean);
                setColoniaOptions(colonias);
                if (colonias.length > 0) {
                  const savedColonia = config.addressColonia || '';
                  const coloniaToUse = savedColonia && colonias.includes(savedColonia) ? savedColonia : colonias[0];
                  setAddressColonia(coloniaToUse);
                  handleSaveTicketConfig({
                    addressCountry: "México",
                    addressState: estadoNorm,
                    addressCity: cleanCity,
                    addressColonia: coloniaToUse,
                    addressZip: postalCode
                  });
                } else {
                  handleSaveTicketConfig({
                    addressCountry: "México",
                    addressState: estadoNorm,
                    addressCity: cleanCity,
                    addressZip: postalCode
                  });
                }
              }
            }
          })
          .catch(err => console.error("Copomex fallback failed:", err))
          .finally(() => setIsLoadingZip(false));
      };

      fetch(`https://sepomex.kurenn.dev/api/v1/zip_codes?zip_code=${zip}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.zip_codes && Array.isArray(data.zip_codes) && data.zip_codes.length > 0) {
            const first = data.zip_codes[0];
            setAddressCountry("México");
            
            let estadoNorm = first.d_estado || '';
            if (estadoNorm.includes(" de Ocampo")) estadoNorm = estadoNorm.replace(" de Ocampo", "");
            if (estadoNorm.includes(" de Ignacio de la Llave")) estadoNorm = estadoNorm.replace(" de Ignacio de la Llave", "");
            if (estadoNorm.includes(" Coahuila de Zaragoza")) estadoNorm = estadoNorm.replace(" Coahuila de Zaragoza", "Coahuila");
            
            setAddressState(estadoNorm);
            const cleanCity = first.d_mnpio || first.d_ciudad || '';
            setAddressCity(cleanCity);
            
            const colonias: string[] = data.zip_codes.map((item: any) => item.d_asenta).filter(Boolean);
            setColoniaOptions(colonias);
            if (colonias.length > 0) {
              const savedColonia = config.addressColonia || '';
              const coloniaToUse = savedColonia && colonias.includes(savedColonia) ? savedColonia : colonias[0];
              setAddressColonia(coloniaToUse);
              handleSaveTicketConfig({
                addressCountry: "México",
                addressState: estadoNorm,
                addressCity: cleanCity,
                addressColonia: coloniaToUse,
                addressZip: zip
              });
            } else {
              handleSaveTicketConfig({
                addressCountry: "México",
                addressState: estadoNorm,
                addressCity: cleanCity,
                addressZip: zip
              });
            }
            setIsLoadingZip(false);
          } else {
            fetchCopomexFallback(zip);
          }
        })
        .catch(err => {
          console.error("SEPOMEX API failed, calling Copomex:", err);
          fetchCopomexFallback(zip);
        });
    }
  }, [addressZip]);

  const buildFormattedAddress = (
    street = addressStreet,
    number = addressNumber,
    colonia = addressColonia,
    city = addressCity,
    state = addressState,
    zip = addressZip,
    country = addressCountry
  ) => {
    const parts: string[] = [];
    const mainStreet = [street.trim(), number.trim()].filter(Boolean).join(' ');
    if (mainStreet) parts.push(mainStreet);
    if (colonia.trim()) parts.push(colonia.trim().startsWith('Col.') ? colonia.trim() : `Col. ${colonia.trim()}`);
    if (city.trim()) parts.push(city.trim());
    if (state.trim()) parts.push(state.trim());
    if (zip.trim()) parts.push(`C.P. ${zip.trim().replace(/^C\.?P\.?\s*/i, '')}`);
    if (country.trim()) parts.push(country.trim());
    return parts.join(', ');
  };

  // Autogeneración reactiva del enlace de Google Maps a partir de la dirección
  useEffect(() => {
    const fullAddress = buildFormattedAddress();
    if (!fullAddress || fullAddress.length < 5) return;

    const query = encodeURIComponent(fullAddress);
    const generatedLink = `https://www.google.com/maps/search/?api=1&query=${query}`;

    // Solo auto-actualizar si está vacío o si coincide con un enlace autogenerado previo
    const isLinkEmpty = !googleMapsLink;
    const isLinkPreviouslyGenerated = googleMapsLink.startsWith('https://www.google.com/maps/search/?api=1&query=');
    if (isLinkEmpty || isLinkPreviouslyGenerated) {
      if (googleMapsLink !== generatedLink) {
        setGoogleMapsLink(generatedLink);
        handleSaveTicketConfig({ googleMapsLink: generatedLink });
      }
    }
  }, [
    addressStreet,
    addressNumber,
    addressColonia,
    addressCity,
    addressState,
    addressZip,
    addressCountry
  ]);

  const handleOpenGoogleMaps = () => {
    const link = googleMapsLink || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '');
    if (!link) {
      alert('No hay un enlace de Google Maps configurado.');
      return;
    }
    const eAPI = (window as any).electronAPI;
    if (eAPI?.openExternal) {
      eAPI.openExternal(link);
    } else {
      window.open(link, '_blank');
    }
  };

  useEffect(() => {
    setTheme(config.theme || 'retro-window');
    setThemeMode(config.themeMode || 'dark');
  }, [config.theme, config.themeMode]);


  useEffect(() => {
    const bh = config.businessHours || '';
    setBusinessHours(bh);
    if (bh && bh.trim().startsWith('{')) {
      try {
        setWeeklySchedule(JSON.parse(bh));
      } catch { /* ignorar JSON inválido */ }
    } else {
      setManualHoursText(bh);
    }
  }, [config.businessHours]);


  const handleUpdateDaySchedule = (day: string, updates: Partial<DailySchedule>) => {
    setWeeklySchedule(prev => {
      const dayData = prev[day] || { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' };
      const updatedDay = { ...dayData, ...updates } as DailySchedule;
      
      if (updatedDay.type === 'closed') {
        updatedDay.isOpen = false;
      } else {
        updatedDay.isOpen = true;
        if (updatedDay.type === 'split') {
          updatedDay.openTime = updatedDay.openTime || '09:00';
          updatedDay.closeTime = updatedDay.closeTime || '14:00';
          updatedDay.openTime2 = updatedDay.openTime2 || '16:00';
          updatedDay.closeTime2 = updatedDay.closeTime2 || '19:00';
        } else if (updatedDay.type === 'continuous') {
          updatedDay.openTime = updatedDay.openTime || '09:00';
          updatedDay.closeTime = updatedDay.closeTime || '19:00';
        }
      }
      
      const newSchedule = {
        ...prev,
        [day]: updatedDay
      };
      
      const serialized = JSON.stringify(newSchedule);
      setBusinessHours(serialized);
      
      // Persistir configuración
      onUpdateConfig({
        ...config,
        businessHours: serialized
      });
      
      return newSchedule;
    });
  };

  const handleCopyDayScheduleToAll = (sourceDay: string) => {
    const sourceData = weeklySchedule[sourceDay];
    if (!sourceData) return;

    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      Object.keys(newSchedule).forEach(day => {
        newSchedule[day] = {
          ...sourceData,
          isOpen: sourceData.isOpen,
          type: sourceData.type
        };
      });

      const serialized = JSON.stringify(newSchedule);
      setBusinessHours(serialized);

      // Persistir configuración
      onUpdateConfig({
        ...config,
        businessHours: serialized
      });

      return newSchedule;
    });
  };

  const renderDayScheduleRow = (dayKey: string, label: string) => {
    const day = weeklySchedule[dayKey] || { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' };
    const isLight = config.themeMode === 'light';
    const isRetro = config.theme === 'retro-window';

    const selectCls = `text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
      isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
      : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
      : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
    }`;

    const timeInputCls = `text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 w-[115px] font-mono ${
      isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
      : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
      : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
    }`;

    const copyBtnCls = `flex items-center gap-1 transition-colors px-1.5 py-0.5 ${
      isRetro ? 'border border-zinc-400 bg-zinc-200 text-zinc-800 hover:bg-zinc-300 font-extrabold rounded-none text-[9px]'
      : isLight ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded text-[10px]'
      : 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 rounded text-[10px]'
    }`;

    return (
      <tr key={dayKey} className={`border-b last:border-0 ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-100' : 'border-zinc-800/60'}`}>
        <td className="py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-bold text-xs uppercase ${isRetro ? 'text-zinc-800 font-extrabold' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
              {label}
            </span>
            {day.type !== 'closed' && (
              <button
                type="button"
                onClick={() => handleCopyDayScheduleToAll(dayKey)}
                title={`Copiar horario de ${label} a todos los demás días`}
                className={copyBtnCls}
              >
                <Copy size={11} />
                <span>Copiar a todos</span>
              </button>
            )}
          </div>
        </td>
        <td className="py-2.5 px-2">
          <select
            value={day.type}
            onChange={(e) => handleUpdateDaySchedule(dayKey, { type: e.target.value as any })}
            className={selectCls}
          >
            <option value="continuous">Corrido (1 Turno)</option>
            <option value="split">Partido (2 Turnos)</option>
            <option value="closed">Cerrado</option>
          </select>
        </td>
        <td className="py-2.5 px-2 text-right">
          {day.type === 'continuous' && (
            <div className="inline-flex items-center gap-1.5">
              <span className={`text-[10px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>De:</span>
              <input
                type="time"
                value={day.openTime || '09:00'}
                onChange={(e) => handleUpdateDaySchedule(dayKey, { openTime: e.target.value })}
                className={timeInputCls}
              />
              <span className={`text-[10px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>A:</span>
              <input
                type="time"
                value={day.closeTime || '19:00'}
                onChange={(e) => handleUpdateDaySchedule(dayKey, { closeTime: e.target.value })}
                className={timeInputCls}
              />
            </div>
          )}
          {day.type === 'split' && (
            <div className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
              <div className="inline-flex items-center gap-1">
                <span className={`text-[9px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>T1:</span>
                <input
                  type="time"
                  value={day.openTime || '09:00'}
                  onChange={(e) => handleUpdateDaySchedule(dayKey, { openTime: e.target.value })}
                  className={timeInputCls}
                />
                <span className={`text-[9px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>a</span>
                <input
                  type="time"
                  value={day.closeTime || '14:00'}
                  onChange={(e) => handleUpdateDaySchedule(dayKey, { closeTime: e.target.value })}
                  className={timeInputCls}
                />
              </div>
              <div className="inline-flex items-center gap-1 mt-1 sm:mt-0">
                <span className={`text-[9px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>T2:</span>
                <input
                  type="time"
                  value={day.openTime2 || '16:00'}
                  onChange={(e) => handleUpdateDaySchedule(dayKey, { openTime2: e.target.value })}
                  className={timeInputCls}
                />
                <span className={`text-[9px] uppercase font-semibold ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>a</span>
                <input
                  type="time"
                  value={day.closeTime2 || '19:00'}
                  onChange={(e) => handleUpdateDaySchedule(dayKey, { closeTime2: e.target.value })}
                  className={timeInputCls}
                />
              </div>
            </div>
          )}
          {day.type === 'closed' && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              isRetro ? 'bg-red-200 border border-red-400 text-red-800'
              : isLight ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-red-950/30 text-red-400 border border-red-900/50'
            }`}>
              Cerrado
            </span>
          )}
        </td>
      </tr>
    );
  };

  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof CONFIG_SEARCH_INDEX>([]);

  const getHighlightClasses = (id: string) => {
    if (activeHighlightId !== id) return 'ring-0 ring-offset-0 scale-100 z-0';
    if (isRetro) return 'ring-4 ring-[#000080] scale-[1.015] z-10 shadow-lg';
    if (isLight) return 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white scale-[1.015] z-10 shadow-2xl';
    return 'ring-4 ring-violet-500 ring-offset-2 ring-offset-zinc-950 scale-[1.015] z-10 shadow-2xl';
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const results = CONFIG_SEARCH_INDEX.filter(item => {
      return (
        item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cleanQuery) ||
        item.keywords.some(kw => kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cleanQuery))
      );
    });
    setSearchResults(results);
  };

  const handleSelectSearchResult = (item: typeof CONFIG_SEARCH_INDEX[number]) => {
    setSearchQuery('');
    setSearchResults([]);

    // 1. Navigate to the main config tab
    setActiveConfigTab(item.tab);

    // 2. If it's a global subtab, navigate to it
    if (item.tab === 'global' && item.subTab) {
      setGlobalSubTab(item.subTab);
    }

    // 3. Scroll to the element and highlight it (using retry polling for reliable mounting)
    const tryScrollAndHighlight = (retries = 8) => {
      const element = document.getElementById(item.elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveHighlightId(item.elementId);
        setTimeout(() => {
          setActiveHighlightId(null);
        }, 2200);
      } else if (retries > 0) {
        setTimeout(() => tryScrollAndHighlight(retries - 1), 60);
      }
    };

    setTimeout(() => {
      tryScrollAndHighlight();
    }, 50);
  };

  const [highlightModulesArea, setHighlightModulesArea] = useState(false);

  useEffect(() => {
    const handleGoToModules = () => {
      setGlobalSubTab('modules');
      setHighlightModulesArea(true);
      setTimeout(() => {
        setHighlightModulesArea(false);
      }, 2500);
    };
    window.addEventListener('fm-go-to-modules-config', handleGoToModules);
    return () => {
      window.removeEventListener('fm-go-to-modules-config', handleGoToModules);
    };
  }, []);

  const handleToggleTaller = () => {
    if (enableTaller && !enablePOS) {
      alert("Debe tener al menos un módulo activo (Taller o Tienda/POS).");
      return;
    }
    const nextVal = !enableTaller;
    setEnableTaller(nextVal);
    if (!nextVal) {
      setDefaultStartView('POS');
    }
  };

  const handleTogglePOS = () => {
    if (enablePOS && !enableTaller) {
      alert("Debe tener al menos un módulo activo (Taller o Tienda/POS).");
      return;
    }
    const nextVal = !enablePOS;
    setEnablePOS(nextVal);
    if (!nextVal) {
      setDefaultStartView('Nueva');
    }
  };

  const handleToggleWarehouses = () => {
    setEnableWarehouses(prev => !prev);
  };

  React.useEffect(() => {
    if (config.enableWarehouses !== undefined) {
      setEnableWarehouses(config.enableWarehouses);
    }
  }, [config.enableWarehouses]);

  React.useEffect(() => {
    if (config.appZoomLevel !== undefined) {
      setAppZoomLevel(config.appZoomLevel);
    }
  }, [config.appZoomLevel]);

  React.useEffect(() => {
    if (config.hiddenModules !== undefined) {
      setHiddenModules(config.hiddenModules || []);
    }
  }, [config.hiddenModules]);
  const [workshopModeConfirm, setWorkshopModeConfirm] = useState<'personal' | 'team' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(config.autoBackupEnabled ?? false);
  const [autoBackupPath, setAutoBackupPath] = useState(config.autoBackupPath || '');
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(config.cloudBackupEnabled ?? true);

  const isLight = config.themeMode === 'light';
  const isRetro = config.theme === 'retro-window';
  const configLabelCls = isRetro 
    ? (isLight ? 'text-zinc-700 font-extrabold' : 'text-blue-300 font-extrabold') 
    : (isLight ? 'text-zinc-500 font-bold' : 'text-zinc-300');
  const isTeamMode = (config.workshopMode ?? 'personal') === 'team';

  // Pestaña activa de la configuración
  const [localConfigTab, setLocalConfigTab] = useState<'global' | 'printer' | 'users' | 'notifications' | 'dev' | 'audit' | 'network' | 'taecel'>('global');
  const activeConfigTab = (setActiveSubTab ? activeSubTab : localConfigTab) as any;
  const setActiveConfigTab = (tab: 'global' | 'printer' | 'users' | 'notifications' | 'dev' | 'audit' | 'network' | 'taecel') => {
    if (setActiveSubTab) setActiveSubTab(tab as any);
    else setLocalConfigTab(tab);
  };

  // ── Telegram Configurador Asistido ─────────────────────────────────────────
  // Clave de localStorage para guardar progreso del wizard
  const TG_WIZARD_KEY = 'fxmgr_tg_wizard_draft';

  // Lee el progreso guardado (si existe)
  const _tgDraft = (() => {
    try { return JSON.parse(localStorage.getItem(TG_WIZARD_KEY) || 'null'); } catch { return null; }
  })();

  const [tgToken,       setTgToken]       = useState(_tgDraft?.token      || config.telegramBotToken || '');
  const [tgChatId,      setTgChatId]      = useState(_tgDraft?.chatId     || config.telegramChatId   || '');
  const [tgEnabled,     setTgEnabled]     = useState(config.telegramEnabled ?? false);
  const [tgWizardStep,  setTgWizardStep]  = useState<0|1|2|3|4|5|6>(() => {
    if (config.telegramBotToken && config.telegramChatId) return 6;
    if (_tgDraft?.step) return _tgDraft.step as 0|1|2|3|4|5|6;
    return 0;
  });
  const [tgBotName,       setTgBotName]       = useState(_tgDraft?.botName     || '');
  const [tgBotUsername,   setTgBotUsername]   = useState(_tgDraft?.botUsername || '');
  const [tgTokenInput,    setTgTokenInput]    = useState('');
  const [tgStepLoading,   setTgStepLoading]   = useState(false);
  const [tgStepError,     setTgStepError]     = useState<string | null>(null);
  const [tgTestLoading,   setTgTestLoading]   = useState(false);
  const [tgWebOpened,     setTgWebOpened]     = useState(false);  // usuario abrió web.telegram.org
  const [tgFeedback,    setTgFeedback]    = useState<string | null>(null);
  const [tgPolling,     setTgPolling]     = useState(false);

  // Guarda progreso del wizard en localStorage para sobrevivir cierres
  const saveTgDraft = (overrides: Record<string, any> = {}) => {
    const draft = {
      step:        tgWizardStep,
      token:       tgToken,
      chatId:      tgChatId,
      botName:     tgBotName,
      botUsername: tgBotUsername,
      ...overrides,
    };
    localStorage.setItem(TG_WIZARD_KEY, JSON.stringify(draft));
  };

  const clearTgDraft = () => localStorage.removeItem(TG_WIZARD_KEY);

  // Paso 1 → 2: verificar token con getMe
  const handleTgVerifyToken = async () => {
    const t = tgTokenInput.trim();
    if (!t) { setTgStepError('Pega el token que te dio BotFather.'); return; }
    setTgStepLoading(true);
    setTgStepError(null);
    const api = (window as any).electronAPI;
    try {
      const res = api?.telegramGetMe ? await api.telegramGetMe(t) : await fetch(`https://api.telegram.org/bot${t}/getMe`).then(r => r.json()).then(d => ({ ok: true, data: d }));
      if (res?.data?.ok) {
        const bot = res.data.result;
        const botName = bot.first_name || bot.username || 'Tu Bot';
        const botUsername = bot.username || '';
        setTgToken(t);
        setTgBotName(botName);
        setTgBotUsername(botUsername);
        setTgWizardStep(4);
        setTgStepError(null);
        saveTgDraft({ step: 4, token: t, botName, botUsername });
      } else {
        const desc = res?.data?.description || 'Token inválido. Verifica que lo copiaste completo.';
        setTgStepError(`❌ ${desc}`);
      }
    } catch (e: any) {
      setTgStepError(`❌ Error de conexión: ${e?.message}`);
    }
    setTgStepLoading(false);
  };

  // Paso 2 → 3: detectar chat ID automáticamente con getUpdates (polling)
  const handleTgDetectChatId = async () => {
    setTgStepLoading(true);
    setTgStepError(null);
    setTgPolling(true);
    const api = (window as any).electronAPI;
    let attempts = 0;
    const poll = async (): Promise<void> => {
      attempts++;
      try {
        const res = api?.telegramGetUpdates ? await api.telegramGetUpdates(tgToken) : await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates?limit=10`).then(r => r.json()).then(d => ({ ok: true, data: d }));
        const updates = res?.data?.result;
        if (Array.isArray(updates) && updates.length > 0) {
          const chatId = String(updates[updates.length - 1]?.message?.chat?.id || updates[updates.length - 1]?.chat?.id || '');
          if (chatId) {
            setTgChatId(chatId);
            setTgPolling(false);
            setTgStepLoading(false);
            setTgWizardStep(5);
            saveTgDraft({ step: 5, chatId });
            return;
          }
        }
        if (attempts < 15) {
          setTimeout(poll, 2000);
        } else {
          setTgPolling(false);
          setTgStepLoading(false);
          setTgStepError('⏱ No se detectó ningún mensaje. Asegúrate de haber enviado cualquier mensaje a tu bot en Telegram y vuelve a intentar.');
        }
      } catch (e: any) {
        setTgPolling(false);
        setTgStepLoading(false);
        setTgStepError(`❌ Error: ${e?.message}`);
      }
    };
    poll();
  };

  // Paso 3 → 4: guardar y enviar mensaje de prueba
  const handleTgFinish = async () => {
    setTgStepLoading(true);
    onUpdateConfig({ ...config, telegramBotToken: tgToken, telegramChatId: tgChatId, telegramEnabled: true });
    setTgEnabled(true);
    // Enviar mensaje de bienvenida
    const api = (window as any).electronAPI;
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: tgChatId,
      text: `🎉 *¡Telegram configurado correctamente!*\n\nTaller: *${config.storeName || 'Tu Taller'}*\nSistema: FixManager\n\nA partir de ahora recibirás aquí las notificaciones de ventas, órdenes, cortes de caja y más. ✅`,
      parse_mode: 'Markdown',
    });
    try {
      if (api?.sendTelegram) await api.sendTelegram(url, body);
    } catch {}
    clearTgDraft(); // Progreso completado — limpiar borrador
    setTgStepLoading(false);
    setTgWizardStep(6);
  };

  // Enviar prueba desde paso 4
  const handleTestTG = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) {
      setTgFeedback('⚠️ Configura Telegram primero usando el asistente.');
      setTimeout(() => setTgFeedback(null), 4000);
      return;
    }
    setTgTestLoading(true);
    setTgFeedback(null);
    const api = (window as any).electronAPI;
    const url = `https://api.telegram.org/bot${tgToken.trim()}/sendMessage`;
    const body = JSON.stringify({
      chat_id: tgChatId.trim(),
      text: `✅ *Prueba de notificación*\nTaller: ${config.storeName || 'Tu Taller'}\nSistema: FixManager\nTodo funcionando correctamente 🚀`,
      parse_mode: 'Markdown',
    });
    try {
      if (api?.sendTelegram) {
        const result = await api.sendTelegram(url, body);
        if (result.ok) setTgFeedback('✅ Mensaje enviado. Revisa tu Telegram.');
        else {
          const parsed = (() => { try { return JSON.parse(result.body); } catch { return null; } })();
          setTgFeedback(`❌ ${parsed?.description || result.error || 'Error desconocido'}`);
        }
      } else {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        const data = await res.json();
        if (data.ok) setTgFeedback('✅ Mensaje enviado. Revisa tu Telegram.');
        else setTgFeedback(`❌ ${data.description || 'Error'}`);
      }
    } catch (e: any) { setTgFeedback(`❌ ${e?.message}`); }
    setTgTestLoading(false);
    setTimeout(() => setTgFeedback(null), 8000);
  };

  // ── Telegram Notifications state ──────────────────────────────────────────
  const [notifyOnSale,     setNotifyOnSale]     = useState(config.notifyOnSale ?? true);
  const [notifyOnOrder,    setNotifyOnOrder]    = useState(config.notifyOnOrder ?? true);
  const [notifyOnStatus,   setNotifyOnStatus]   = useState(config.notifyOnStatusChange ?? true);
  const [notifyOnDelivery, setNotifyOnDelivery] = useState(config.notifyOnDelivery ?? true);
  const [notifyOnInventory,setNotifyOnInventory]= useState(config.notifyOnInventory ?? false);
  const [notifyOnLowStock, setNotifyOnLowStock] = useState(config.notifyOnLowStock ?? false);
  const [notifyOnCorte,    setNotifyOnCorte]    = useState(config.notifyOnCorte ?? true);
  const [notifyOnApertura, setNotifyOnApertura] = useState(config.notifyOnApertura ?? true);
  const [notifyOnFiado,   setNotifyOnFiado]   = useState(config.notifyOnFiado ?? true);
  const [notifyOnExpense,  setNotifyOnExpense]  = useState(config.notifyOnExpense ?? true);
  const [notifySaving,     setNotifySaving]     = useState(false);
  const [notifyFeedback,   setNotifyFeedback]   = useState<string | null>(null);

  const handleSaveNotifyEvents = () => {
    setNotifySaving(true);
    onUpdateConfig({
      ...config,
      notifyOnSale:         notifyOnSale,
      notifyOnOrder:        notifyOnOrder,
      notifyOnStatusChange: notifyOnStatus,
      notifyOnDelivery:     notifyOnDelivery,
      notifyOnInventory:    notifyOnInventory,
      notifyOnLowStock:     notifyOnLowStock,
      notifyOnCorte:        notifyOnCorte,
      notifyOnApertura:     notifyOnApertura,
      notifyOnFiado:        notifyOnFiado,
      notifyOnExpense:      notifyOnExpense,
    });
    setTimeout(() => {
      setNotifySaving(false);
      setNotifyFeedback('✅ Eventos guardados.');
      setTimeout(() => setNotifyFeedback(null), 3000);
    }, 400);
  };

  // ── WhatsApp Notifications state ──────────────────────────────────────────
  const [waMode, setWaMode] = useState<'disabled' | 'direct' | 'automated' | 'integrated'>(config.whatsappMode || 'disabled');
  const [waApiUrl, setWaApiUrl] = useState(config.whatsappApiUrl || '');
  const [waApiToken, setWaApiToken] = useState(config.whatsappApiToken || '');
  const [waDefaultCountry, setWaDefaultCountry] = useState(config.whatsappDefaultCountryCode || '52');
  const [waSaving, setWaSaving] = useState(false);
  const [waFeedback, setWaFeedback] = useState<string | null>(null);

  // Estados del WhatsApp Integrado (QR local)
  const [waIntegratedStatus, setWaIntegratedStatus] = useState<string>('DISCONNECTED');
  const [waIntegratedQr, setWaIntegratedQr] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [waConnectedPhone, setWaConnectedPhone] = useState<string>('');
  const [autoSendSale, setAutoSendSale] = useState(config.autoSendSaleTicket || false);
  const [autoSendRepair, setAutoSendRepair] = useState(config.autoSendRepairStatus || false);
  const [waNotifyStates, setWaNotifyStates] = useState<string[]>(
    config.whatsappNotifyStates ?? ['Pendiente', 'Diagnóstico', 'En Reparación', 'Listo', 'Entregado', 'Entregado y Pagado', 'Fallido', 'Cancelado']
  );

  const handleToggleNotifyState = (stateName: string) => {
    setWaNotifyStates(prev =>
      prev.includes(stateName)
        ? prev.filter(s => s !== stateName)
        : [...prev, stateName]
    );
  };

  const [waCheckingUpdate, setWaCheckingUpdate] = useState(false);
  const [waUpdateFeedback, setWaUpdateFeedback] = useState<string | null>(null);

  const handleCheckWaUpdates = async () => {
    setWaCheckingUpdate(true);
    setWaUpdateFeedback('⏳ Verificando y buscando actualización de parche de WhatsApp Web...');
    const eAPI = (window as any).electronAPI;
    if (eAPI?.whatsappForceUpdate) {
      try {
        const res = await eAPI.whatsappForceUpdate();
        if (res?.success) {
          setWaUpdateFeedback(res.message || '✅ WhatsApp Web actualizado con éxito. Sesión reanudada.');
        } else {
          setWaUpdateFeedback('⚠️ ' + (res?.error || 'No se pudo actualizar en este momento. Intenta de nuevo.'));
        }
      } catch (err: any) {
        setWaUpdateFeedback('❌ Error: ' + (err.message || 'Error al conectar con servidor CDN'));
      }
    } else {
      setWaUpdateFeedback('ℹ️ Verificación de pasarela lista. La sesión de WhatsApp está funcionando correctamente.');
    }
    setWaCheckingUpdate(false);
    setTimeout(() => setWaUpdateFeedback(null), 8000);
  };

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    if (waMode === 'integrated') {
      console.log('[WhatsApp Settings] Solicitando conexión a WhatsApp...');
      api.whatsappConnect();
    }

    api.whatsappGetStatus().then((res: any) => {
      if (res) {
        setWaIntegratedStatus(res.status || 'DISCONNECTED');
        setWaIntegratedQr(res.qr || '');
        if (res.status === 'CONNECTED' && res.phone) {
          setWaConnectedPhone(res.phone);
        }
      }
    });

    const unsubStatus = api.onWhatsappStatusChange((res: any) => {
      const status = (res && typeof res === 'object') ? res.status : res;
      const phone = (res && typeof res === 'object') ? (res.phone || '') : '';
      console.log('[WhatsApp Settings] Evento de cambio de estado recibido:', status, phone);
      setWaIntegratedStatus(status);
      const isConnected = status === 'CONNECTED';
      (window as any).whatsappConnected = isConnected;
      (window as any).whatsappStatus = status;
      window.dispatchEvent(new CustomEvent('whatsapp-status-update', { detail: isConnected }));
      if (isConnected) {
        setWaIntegratedQr('');
        if (phone) {
          setWaConnectedPhone(phone);
          if (!localStorage.getItem('wa_connected_since')) {
            localStorage.setItem('wa_connected_since', new Date().toLocaleString('es-MX'));
          }
        }
      } else {
        setWaConnectedPhone('');
        localStorage.removeItem('wa_connected_since');
      }
    });

    const unsubQr = api.onWhatsappQrCode((qr: string) => {
      console.log('[WhatsApp Settings] Nuevo código QR recibido para vincular');
      setWaIntegratedQr(qr);
    });

    return () => {
      if (typeof unsubStatus === 'function') unsubStatus();
      if (typeof unsubQr === 'function') unsubQr();
    };
  }, [waMode]);

  useEffect(() => {
    if (waIntegratedQr) {
      QRCode.toDataURL(waIntegratedQr, { width: 220, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('[QR Error]', err));
    } else {
      setQrDataUrl('');
    }
  }, [waIntegratedQr]);

  const handleDisconnectWhatsapp = () => {
    if (confirm('¿Estás seguro de que deseas desvincular y cerrar sesión en WhatsApp? Tendrás que escanear un nuevo QR para volver a usarlo.')) {
      const api = (window as any).electronAPI;
      if (api) {
        api.whatsappDisconnect();
        setWaIntegratedStatus('DISCONNECTED');
        setWaIntegratedQr('');
        setQrDataUrl('');
      }
    }
  };

  const handleSaveWhatsappConfig = () => {
    setWaSaving(true);
    onUpdateConfig({
      ...config,
      whatsappMode: waMode,
      whatsappApiUrl: waApiUrl.trim(),
      whatsappApiToken: waApiToken.trim(),
      whatsappDefaultCountryCode: waDefaultCountry.trim(),
      autoSendSaleTicket: autoSendSale,
      autoSendRepairStatus: autoSendRepair,
      whatsappNotifyStates: waNotifyStates,
    });
    setTimeout(() => {
      setWaSaving(false);
      setWaFeedback('✅ Configuración de WhatsApp guardada.');
      setTimeout(() => setWaFeedback(null), 3000);
    }, 400);
  };

  // ── Dev mode auth ──────────────────────────────────────────────────────────
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devPasswordError, setDevPasswordError] = useState(false);
  const [devLocked, setDevLocked] = useState(false);
  const [devActionFeedback, setDevActionFeedback] = useState<string | null>(null);

  const [devGeminiKey, setDevGeminiKey] = useState('');
  const [devGeminiStatus, setDevGeminiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [devGeminiStatusMsg, setDevGeminiStatusMsg] = useState('');

  useEffect(() => {
    if (devUnlocked) {
      const eAPI = (window as any).electronAPI;
      if (eAPI?.getApiKey) {
        eAPI.getApiKey().then((key: string) => {
          setDevGeminiKey(key || '');
        }).catch(() => {});
      }
    }
  }, [devUnlocked]);

  const handleSaveDevGeminiKeyDb = async () => {
    try {
      setDevGeminiStatus('testing');
      setDevGeminiStatusMsg('Guardando en Supabase...');
      const { error } = await supabase
        .from('system_config')
        .upsert({ key: 'gemini_api_key', value: devGeminiKey }, { onConflict: 'key' });

      // Sincronizar siempre con el proceso principal en caliente
      const eAPI = (window as any).electronAPI;
      if (eAPI?.setGeminiKey) {
        await eAPI.setGeminiKey(devGeminiKey);
      }
      localStorage.setItem('local_gemini_api_key', devGeminiKey);

      if (error) {
        console.warn("No se pudo guardar en Supabase (RLS/Offline), pero se guardó de forma local:", error);
        setDevGeminiStatus('success');
        setDevGeminiStatusMsg('Guardada localmente (Supabase protegido/offline). ¡Funciona en este equipo!');
        setDevActionFeedback('Clave de Gemini guardada localmente.');
        setTimeout(() => setDevActionFeedback(null), 4000);
        return;
      }

      setDevGeminiStatus('success');
      setDevGeminiStatusMsg('Clave guardada en la base de datos de Supabase y cargada en caliente.');
      setDevActionFeedback('Clave de Gemini guardada con éxito.');
      setTimeout(() => setDevActionFeedback(null), 4000);
    } catch (err: any) {
      setDevGeminiStatus('error');
      setDevGeminiStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleTestDevGemini = async () => {
    try {
      setDevGeminiStatus('testing');
      setDevGeminiStatusMsg('Enviando consulta de prueba a Gemini...');
      
      const eAPI = (window as any).electronAPI;
      if (!eAPI?.queryGeminiPrinter) {
        throw new Error('La función queryGeminiPrinter no está disponible.');
      }

      // Sincronizar temporalmente antes de la prueba por si la editaron en el input
      if (eAPI?.setGeminiKey) {
        await eAPI.setGeminiKey(devGeminiKey);
      }

      const res = await eAPI.queryGeminiPrinter({
        printerName: 'Test Printer',
        printerType: 'ticket',
        os: 'win32',
        symptom: 'Test connection'
      });

      if (res && res.success) {
        setDevGeminiStatus('success');
        setDevGeminiStatusMsg(`¡Conexión exitosa! Marca detectada: ${res.diagnosis?.detectedBrand || 'Genérica'}`);
      } else {
        setDevGeminiStatus('error');
        setDevGeminiStatusMsg(res?.error || 'No se obtuvo respuesta de la IA.');
      }
    } catch (err: any) {
      setDevGeminiStatus('error');
      setDevGeminiStatusMsg(`Error de prueba: ${err.message}`);
    }
  };

  const handleDevLogin = async () => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(devPassword));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const result = await (window as any).electronAPI?.devAuth?.(hash) ?? { ok: false, locked: false };
    const ok = typeof result === 'boolean' ? result : result.ok;
    const locked = typeof result === 'boolean' ? false : result.locked;
    if (locked) { setDevLocked(true); setDevPassword(''); }
    else if (ok) { setDevUnlocked(true); setDevPasswordError(false); setDevPassword(''); }
    else { setDevPasswordError(true); setDevPassword(''); }
  };

  // ─── User Management Local State ───────────────────────────────────────────
  const [userFormName, setUserFormName] = useState('');
  const [userFormRole, setUserFormRole] = useState<'admin' | 'employee' | 'tecnico'>('employee');
  const [userFormPin, setUserFormPin] = useState('');
  const [userFormPinConfirm, setUserFormPinConfirm] = useState('');
  const [userFormPerms, setUserFormPerms] = useState<UserPermissions>({ ...EMPLOYEE_PERMISSIONS });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSuccess, setUserFormSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userDeleteConfirm, setUserDeleteConfirm] = useState<string | null>(null);
  const [showUserHelp, setShowUserHelp] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [adminPinPrompt, setAdminPinPrompt] = useState<{ action: 'edit' | 'delete'; userId: string } | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const [notifPinPrompt, setNotifPinPrompt] = useState<{ key: string; newVal: boolean; set: (v: boolean) => void } | null>(null);
  const [notifPinInput, setNotifPinInput] = useState('');
  const [notifPinError, setNotifPinError] = useState<string | null>(null);
  const [reporteEmpleado, setReporteEmpleado] = useState<{ html: string; nombre: string } | null>(null);

  const togglePerm = (key: keyof UserPermissions) => {
    setUserFormPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserFormName('');
    setUserFormRole('employee');
    setUserFormPin('');
    setUserFormPinConfirm('');
    setUserFormPerms({ ...EMPLOYEE_PERMISSIONS });
    setUserFormError(null);
  };

  const loadUserForEdit = (u: AppUser) => {
    setEditingUserId(u.id);
    setUserFormName(u.name);
    setUserFormRole(u.role);
    setUserFormPin(u.pin);
    setUserFormPinConfirm(u.pin);
    // Merge stored perms with defaults to handle older records missing new fields
    setUserFormPerms({ ...(u.role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_PERMISSIONS), ...u.permissions });
    setUserFormError(null);
    setUserFormSuccess(null);
  };

  // Estados formateo ticket térmico (unified from TicketConfigView!)
  const [activeFormatTab, setActiveFormatTab] = useState<'pos' | 'service' | 'service-batch' | 'entry' | 'entry-batch' | 'entry-warranty' | 'delivery' | 'delivery-batch' | 'delivery-warranty' | 'cotizacion' | 'cotizacion-grupal' | 'fiado-abono' | 'fiado-liquidacion' | 'corte' | 'apartado' | 'recarga'>('pos');
  const [expandedPrinter, setExpandedPrinter] = useState<'tickets' | 'etiquetas' | 'reportes'>('tickets');
  const [showReportSimulator, setShowReportSimulator] = useState(true);
  const [testFeedbackReport, setTestFeedbackReport] = useState<string | null>(null);
  const [posPreviewVariant, setPosPreviewVariant] = useState<'unique' | 'mixed'>('mixed');
  const [servicePreviewVariant, setServicePreviewVariant] = useState<'with-anticipo' | 'no-anticipo'>('with-anticipo');
  const [serviceContractPage, setServiceContractPage] = useState<'front' | 'back'>('front');
  const [labelPreviewVariant, setLabelPreviewVariant] = useState<'individual' | 'grupal' | 'garantia'>('individual');
  const [labelPreviewAccess, setLabelPreviewAccess] = useState<'patron' | 'pin' | 'ninguno'>('patron');
  const [labelPreviewService, setLabelPreviewService] = useState<'corto' | 'largo'>('corto');
  const [labelPreviewNotes, setLabelPreviewNotes] = useState<boolean>(false);

  const [ticketFooterPOS, setTicketFooterPOS] = useState(config.ticketFooterPOS || config.ticketFooter || '');
  const [termsPOS, setTermsPOS] = useState(config.termsAndConditionsPOS || config.termsAndConditions || '');
  const [ticketFooterService, setTicketFooterService] = useState(config.ticketFooterService || config.ticketFooter || '');
  const [termsService, setTermsService] = useState(config.termsAndConditionsService || config.termsAndConditions || '');
  const [contractClauses, setContractClauses] = useState(config.contractClauses || '');
  const [promoActive, setPromoActive] = useState(config.promoActive || false);
  const [promoText, setPromoText] = useState(config.promoText || '');
  const [promoStartDate, setPromoStartDate] = useState(() => {
    if (config.promoStartDate) return config.promoStartDate;
    return new Date().toLocaleDateString('sv-SE');
  });
  const [promoEndDate, setPromoEndDate] = useState(config.promoEndDate || '');
  const [promoPosition, setPromoPosition] = useState(config.promoPosition || 'bottom');
  const [ticketTemplatePOS, setTicketTemplatePOS] = useState<string>(() => {
    if (config.ticketTemplatePOS) return config.ticketTemplatePOS;
    return DEFAULT_TICKET_POS;
  });
  const [ticketTemplateService, setTicketTemplateService] = useState<string>(() => {
    if (config.ticketTemplateService) return config.ticketTemplateService;
    return DEFAULT_OT_PRESET;
  });
  const [ticketTemplateEditMode, setTicketTemplateEditMode] = useState<'paint' | 'code'>('paint');

  // Estados para configuración de impresoras y tickets
  const [ticketPrinterBrand, setTicketPrinterBrand] = useState(config.ticketPrinterBrand || '');
  const [ticketPaperWidth, setTicketPaperWidth] = useState<'58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado'>(
    config.hybridPrintMode
      ? (config.ticketPaperWidth === 'media-carta' ? 'media-carta' : 'media-carta-duplicado')
      : (config.ticketPaperWidth || '80mm')
  );
  const [ticketMarginOffset, setTicketMarginOffset] = useState<number>(config.ticketMarginOffset || 0);
  const [printerInterface, setPrinterInterface] = useState<'USB' | 'Bluetooth' | 'Ethernet' | 'Default'>(config.printerInterface || 'Default');
  const [printDuplexContract, setPrintDuplexContract] = useState<boolean>(config.printDuplexContract ?? false);
  const [mediaCartaFrontTerms, setMediaCartaFrontTerms] = useState<boolean>(config.mediaCartaFrontTerms ?? false);
  const [posPaperWidth, setPosPaperWidth] = useState<'58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado'>(config.posPaperWidth || '80mm');
  const [printerIpAddress, setPrinterIpAddress] = useState(config.printerIpAddress || '192.168.1.100');
  const [cutPaperAfterPrint, setCutPaperAfterPrint] = useState(config.cutPaperAfterPrint ?? true);
  const [useDynamicHeight, setUseDynamicHeight] = useState<boolean>(config.useDynamicHeight ?? false);
  const [usePrinterDefaultPageSize, setUsePrinterDefaultPageSize] = useState<boolean>(config.usePrinterDefaultPageSize ?? false);
  const [ticketPaperHeight, setTicketPaperHeight] = useState<number>(config.ticketPaperHeight || 0);
  const [printCopies, setPrintCopies] = useState(config.printCopies ?? 1);
  const [autoPrintOnSale, setAutoPrintOnSale] = useState(config.autoPrintOnSale ?? true);
  const [ecoMode, setEcoMode] = useState(config.ecoMode ?? false);
  const [ecoSilent, setEcoSilent] = useState(config.ecoSilent ?? false);
  const [barcodeAsImage, setBarcodeAsImage] = useState<boolean>(config.barcodeAsImage ?? false);
  const [showBarcodeOnTicket, setShowBarcodeOnTicket] = useState<boolean>(config.showBarcodeOnTicket ?? true);
  const [hideTicketSignature, setHideTicketSignature] = useState<boolean>(config.hideTicketSignature ?? false);
  const [hideMapsQr, setHideMapsQr] = useState<boolean>(config.hideMapsQr ?? false);
  const [hybridPrintMode, setHybridPrintMode] = useState<boolean>(config.hybridPrintMode ?? false);
  const [posPrinterBrand, setPosPrinterBrand] = useState<string>(config.posPrinterBrand || '');
  const [duplexManual, setDuplexManual] = useState<boolean>(config.duplexManual ?? false);
  const [printIndividualTicketsInBatch, setPrintIndividualTicketsInBatch] = useState<boolean>(config.printIndividualTicketsInBatch ?? false);
  const [modalDialog, setModalDialog] = useState<{
    type: 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  // Reorganización y perfiles de impresora
  const [showAdvancedPrintSettings, setShowAdvancedPrintSettings] = useState(false);
  const [userSelectedProfile, setUserSelectedProfile] = useState<'thermal-standard' | 'thermal-generic' | 'custom' | null>(null);
  const [selectedPrinterProfileId, setSelectedPrinterProfileId] = useState<string>(config.selectedPrinterProfileId || '');
  const [printerConfigMode, setPrinterConfigMode] = useState<'generic' | 'model'>(config.selectedPrinterProfileId ? 'model' : 'generic');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const printerDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar desplegable personalizado al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printerDropdownRef.current && !printerDropdownRef.current.contains(event.target as Node)) {
        setPrinterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inicializar perfil seleccionado al montar/cambiar config
  useEffect(() => {
    if (config.selectedPrinterProfileId) {
      const preset = PRINTER_PRESETS_DATABASE.find(p => p.id === config.selectedPrinterProfileId);
      if (preset) {
        setPrinterConfigMode('model');
        if (preset.paperWidth === '80mm') {
          setUserSelectedProfile('thermal-standard');
        } else {
          setUserSelectedProfile('thermal-generic');
        }
      }
    }
  }, [config.selectedPrinterProfileId]);

  // Limpiar selección de modelo si el usuario cambia a ajuste manual (custom)
  useEffect(() => {
    if (userSelectedProfile === 'custom') {
      setSelectedPrinterProfileId('');
    }
  }, [userSelectedProfile]);

  // Estados del asistente inteligente de impresoras (IA)
  const [printerWizardOpen, setPrinterWizardOpen] = useState(false);
  const [printerWizardType, setPrinterWizardType] = useState<'ticket' | 'label' | 'report'>('ticket');
  const [printerWizardStep, setPrinterWizardStep] = useState<number>(1);
  const [wizardPrinterList, setWizardPrinterList] = useState<Array<{ name: string; displayName: string; isDefault: boolean; status: number }>>([]);
  const [wizardSelectedPrinter, setWizardSelectedPrinter] = useState<string>('');
  const [wizardAiLoading, setWizardAiLoading] = useState(false);
  const [wizardAiError, setWizardAiError] = useState<string | null>(null);
  const [wizardAiDiagnosis, setWizardAiDiagnosis] = useState<{
    isGenericDriver: boolean;
    detectedBrand: string;
    downloadUrl: string;
    installInstructions: string[];
    recommendedConfig: {
      usePrinterDefaultPageSize: boolean;
      useDynamicHeight: boolean;
      ticketPaperHeight: number;
      ticketMarginOffset: number;
      ticketPaperWidth: string;
    };
    explanation: string;
  } | null>(null);
  const [wizardSymptom, setWizardSymptom] = useState<string>('none');
  const [wizardTestPrintFeedback, setWizardTestPrintFeedback] = useState<string | null>(null);

  // Helpers to detect if the currently active format in preview uses laser/media-carta
  const isThermalTabForSettings = activeFormatTab === 'pos' || activeFormatTab === 'corte' || activeFormatTab === 'apartado' || activeFormatTab === 'fiado-abono' || activeFormatTab === 'fiado-liquidacion' || activeFormatTab === 'recarga';
  const currentPaperWidthForSettings = hybridPrintMode ? (isThermalTabForSettings ? posPaperWidth : ticketPaperWidth) : ticketPaperWidth;
  const isLaserActiveForSettings = currentPaperWidthForSettings === 'media-carta' || currentPaperWidthForSettings === 'media-carta-duplicado';

  const getDerivedProfile = () => {
    if (userSelectedProfile) return userSelectedProfile;
    if (isLaserActiveForSettings) return 'laser-sheets';
    const is80 = currentPaperWidthForSettings === '80mm';
    const is58 = currentPaperWidthForSettings === '58mm';
    if (usePrinterDefaultPageSize && !useDynamicHeight && ticketPaperHeight === 0) {
      if (is80) return 'thermal-standard';
      if (is58) return 'thermal-generic';
    }
    return 'custom';
  };
  const currentProfile = getDerivedProfile();

  const applyPrinterProfile = (profile: 'thermal-standard' | 'thermal-generic' | 'custom') => {
    setUserSelectedProfile(profile);
    setSelectedPrinterProfileId('');
    if (profile === 'thermal-standard') {
      setUseDynamicHeight(false);
      setUsePrinterDefaultPageSize(false);
      setTicketPaperHeight(0);
      setBarcodeAsImage(true);
      setCutPaperAfterPrint(true);
      setTicketMarginOffset(0);
      if (hybridPrintMode) {
        setPosPaperWidth('80mm');
        handleSaveTicketConfig({
          useDynamicHeight: false,
          usePrinterDefaultPageSize: false,
          ticketPaperHeight: 0,
          barcodeAsImage: true,
          cutPaperAfterPrint: true,
          ticketMarginOffset: 0,
          posPaperWidth: '80mm',
          selectedPrinterProfileId: ''
        });
      } else {
        setTicketPaperWidth('80mm');
        setPosPaperWidth('80mm');
        handleSaveTicketConfig({
          useDynamicHeight: false,
          usePrinterDefaultPageSize: false,
          ticketPaperHeight: 0,
          barcodeAsImage: true,
          cutPaperAfterPrint: true,
          ticketMarginOffset: 0,
          ticketPaperWidth: '80mm',
          posPaperWidth: '80mm',
          selectedPrinterProfileId: ''
        });
      }
    } else if (profile === 'thermal-generic') {
      setUseDynamicHeight(false);
      setUsePrinterDefaultPageSize(false);
      setTicketPaperHeight(0);
      setBarcodeAsImage(true);
      setCutPaperAfterPrint(false);
      setTicketMarginOffset(-6); // Centrado típico de 58mm
      if (hybridPrintMode) {
        setPosPaperWidth('58mm');
        handleSaveTicketConfig({
          useDynamicHeight: false,
          usePrinterDefaultPageSize: false,
          ticketPaperHeight: 0,
          barcodeAsImage: true,
          cutPaperAfterPrint: false,
          ticketMarginOffset: -6,
          posPaperWidth: '58mm',
          selectedPrinterProfileId: ''
        });
      } else {
        setTicketPaperWidth('58mm');
        setPosPaperWidth('58mm');
        handleSaveTicketConfig({
          useDynamicHeight: false,
          usePrinterDefaultPageSize: false,
          ticketPaperHeight: 0,
          barcodeAsImage: true,
          cutPaperAfterPrint: false,
          ticketMarginOffset: -6,
          ticketPaperWidth: '58mm',
          posPaperWidth: '58mm',
          selectedPrinterProfileId: ''
        });
      }
    } else if (profile === 'custom') {
      setShowAdvancedPrintSettings(true);
      handleSaveTicketConfig({ selectedPrinterProfileId: '' });
    }
  };

  const applyPresetPrinterProfile = (presetId: string) => {
    setSelectedPrinterProfileId(presetId);
    if (!presetId) {
      setUserSelectedProfile('custom');
      handleSaveTicketConfig({ selectedPrinterProfileId: '' });
      return;
    }

    const preset = PRINTER_PRESETS_DATABASE.find(p => p.id === presetId);
    if (!preset) return;

    setTicketPaperWidth(preset.paperWidth);
    setPosPaperWidth(preset.paperWidth);
    setTicketMarginOffset(preset.ticketMarginOffset);
    setCutPaperAfterPrint(preset.cutPaperAfterPrint);
    setUsePrinterDefaultPageSize(preset.usePrinterDefaultPageSize);
    setUseDynamicHeight(preset.useDynamicHeight);
    setTicketPaperHeight(preset.ticketPaperHeight);
    setBarcodeAsImage(preset.barcodeAsImage);

    if (preset.paperWidth === '80mm') {
      setUserSelectedProfile('thermal-standard');
    } else {
      setUserSelectedProfile('thermal-generic');
    }

    handleSaveTicketConfig({
      ticketPaperWidth: preset.paperWidth,
      posPaperWidth: preset.paperWidth,
      ticketMarginOffset: preset.ticketMarginOffset,
      cutPaperAfterPrint: preset.cutPaperAfterPrint,
      usePrinterDefaultPageSize: preset.usePrinterDefaultPageSize,
      useDynamicHeight: preset.useDynamicHeight,
      ticketPaperHeight: preset.ticketPaperHeight,
      barcodeAsImage: preset.barcodeAsImage,
      selectedPrinterProfileId: presetId
    });
  };

  const handleOpenPrinterWizard = async (type: 'ticket' | 'label' | 'report') => {
    setPrinterWizardType(type);
    setPrinterWizardStep(1);
    setWizardSelectedPrinter('');
    setWizardAiDiagnosis(null);
    setWizardAiError(null);
    setWizardSymptom('none');
    setWizardTestPrintFeedback(null);
    setPrinterWizardOpen(true);

    if ((window as any).electronAPI?.getPrinters) {
      try {
        const sp = await (window as any).electronAPI.getPrinters();
        setWizardPrinterList(sp || []);
      } catch (err) {
        console.error('Error fetching printers for wizard:', err);
        setWizardPrinterList([]);
      }
    }
  };

  const handleRunAiDiagnosis = async (symptomSelected?: string) => {
    setWizardAiLoading(true);
    setWizardAiError(null);
    const symptom = symptomSelected || wizardSymptom;
    if (symptomSelected) {
      setWizardSymptom(symptomSelected);
    }

    try {
      const eAPI = (window as any).electronAPI;
      if (!eAPI?.queryGeminiPrinter) {
        throw new Error('La función queryGeminiPrinter no está disponible en el proceso principal.');
      }
      
      const res = await eAPI.queryGeminiPrinter({
        printerName: wizardSelectedPrinter || ticketPrinterBrand || labelPrinterBrand || reportPrinterName || 'Impresora Térmica Genérica',
        printerType: printerWizardType,
        os: eAPI.platform || 'win32',
        symptom: symptom !== 'none' ? symptom : undefined
      });

      if (res && res.success && res.diagnosis) {
        setWizardAiDiagnosis(res.diagnosis);
        
        // Auto-aplicar la configuración recomendada a los estados de React
        const cfg = res.diagnosis.recommendedConfig;
        if (cfg) {
          if (printerWizardType === 'ticket') {
            setUsePrinterDefaultPageSize(cfg.usePrinterDefaultPageSize);
            setUseDynamicHeight(cfg.useDynamicHeight);
            setTicketPaperHeight(cfg.ticketPaperHeight);
            setTicketMarginOffset(cfg.ticketMarginOffset);
            if (cfg.ticketPaperWidth === '58mm' || cfg.ticketPaperWidth === '80mm') {
              setTicketPaperWidth(cfg.ticketPaperWidth as any);
              setPosPaperWidth(cfg.ticketPaperWidth as any);
            }
          } else if (printerWizardType === 'label') {
            setUsePrinterDefaultPageSize(cfg.usePrinterDefaultPageSize);
          }
        }
        setPrinterWizardStep(3); // Ir al paso de instrucciones
      } else {
        throw new Error(res?.error || 'No se recibió un diagnóstico válido de la Inteligencia Artificial.');
      }
    } catch (err: any) {
      console.error('[Printer Wizard AI] Error:', err);
      setWizardAiError(err.message || 'Error al conectar con la Inteligencia Artificial.');
    } finally {
      setWizardAiLoading(false);
    }
  };

  const handleWizardTestPrint = () => {
    setWizardTestPrintFeedback('⏳ Enviando al impresor...');
    const eAPI = (window as any).electronAPI;
    if (!eAPI?.silentPrintHtml) {
      setWizardTestPrintFeedback('⚠️ Función no disponible en web');
      return;
    }

    let html = '';
    let isLabel = false;
    let paperWidth = ticketPaperWidth;
    
    if (printerWizardType === 'ticket') {
      html = buildPosTicketHtml({
        id: 'PREVIEW-WIZARD',
        items: [
          { description: 'Prueba de Impresión FixManager', quantity: 1, price: 0 },
          { description: 'Control de ancho de página térmico', quantity: 1, price: 0 },
          { description: 'Diagnóstico Inteligente con IA', quantity: 1, price: 0 }
        ],
        total: 0,
        createdAt: new Date().toISOString(),
        paymentMethod: 'Efectivo',
        cashReceived: 0,
        change: 0
      }, {
        ...config,
        storeName: 'FIXMANAGER TEST',
        phone: '1234567890',
        ticketPaperWidth,
        posPaperWidth,
        printDuplexContract: false,
        ticketMarginOffset,
        useDynamicHeight,
        usePrinterDefaultPageSize
      } as any);
      paperWidth = posPaperWidth || ticketPaperWidth || '80mm';
    } else if (printerWizardType === 'label') {
      isLabel = true;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:50mm 25mm;margin:0}body{font-family:sans-serif;margin:0;padding:2mm;text-align:center}h1{font-size:10px;margin:0}p{font-size:8px;margin:2px 0}</style></head><body><h1>FIXMANAGER</h1><p>Etiqueta de Prueba</p><p>ID: LAB-TEST</p></body></html>`;
    } else {
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:letter;margin:15mm}body{font-family:sans-serif;margin:0;padding:0}h1{font-size:18px;margin-bottom:10px}p{font-size:12px;line-height:1.5}</style></head><body><h1>Reporte de Prueba de Hojas</h1><p>Esta es una hoja de prueba generada por el Asistente Inteligente de FixManager para verificar los márgenes del contrato o reporte A4.</p></body></html>`;
    }

    const paperWidthMicrons = isLabel
      ? 50000
      : (paperWidth === '58mm' ? 48000 : (paperWidth === 'media-carta-duplicado' ? 210000 : paperWidth === 'media-carta' ? 215900 : 72000));
    
    const paperHeightMicrons = isLabel
      ? 25000
      : (ticketPaperHeight > 0 ? (ticketPaperHeight * 1000) : (paperWidth === 'media-carta' ? 139700 : (paperWidth === 'media-carta-duplicado' ? 297000 : undefined)));

    eAPI.silentPrintHtml({
      html,
      deviceName: wizardSelectedPrinter || ticketPrinterBrand || labelPrinterBrand || reportPrinterName || '',
      paperWidthMicrons,
      paperHeightMicrons,
      isLabel,
      duplexMode: (printerWizardType === 'report' && printDuplexContract && !duplexManual) ? 'longEdge' : undefined,
      useDynamicHeight,
      usePrinterDefaultPageSize,
      selectedPrinterProfileId: selectedPrinterProfileId || config.selectedPrinterProfileId
    })
      .then(() => setWizardTestPrintFeedback('✅ ¡Ticket enviado! Revisa tu impresora física.'))
      .catch((err: any) => setWizardTestPrintFeedback(`⚠️ Error: ${err.message || err}`));
  };

  const handleWizardSaveAndFinish = () => {
    if (printerWizardType === 'ticket') {
      setTicketPrinterBrand(wizardSelectedPrinter);
      if (hybridPrintMode) {
        setPosPrinterBrand(wizardSelectedPrinter);
      }
      onUpdateConfig({
        ...config,
        ticketPrinterBrand: wizardSelectedPrinter,
        posPrinterBrand: hybridPrintMode ? wizardSelectedPrinter : config.posPrinterBrand,
        usePrinterDefaultPageSize,
        useDynamicHeight,
        ticketPaperHeight,
        ticketMarginOffset,
        ticketPaperWidth,
        posPaperWidth
      });
    } else if (printerWizardType === 'label') {
      setLabelPrinterBrand(wizardSelectedPrinter);
      onUpdateConfig({
        ...config,
        labelPrinterBrand: wizardSelectedPrinter,
        usePrinterDefaultPageSize
      });
    } else if (printerWizardType === 'report') {
      setReportPrinterName(wizardSelectedPrinter);
      onUpdateConfig({
        ...config,
        reportPrinterName: wizardSelectedPrinter,
        printDuplexContract,
        mediaCartaFrontTerms,
        duplexManual
      });
    }

    setPrinterWizardOpen(false);
  };

  // NUEVOS ESTADOS: DETECTOR DE HARDWARE DE IMPRESIÓN FÍSICA EN CALIENTE
  const [isScanningHwThermal, setIsScanningHwThermal] = useState(false);
  const [scannedHwThermalList, setScannedHwThermalList] = useState<Array<{
    id: string;
    name: string;
    interface: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
    paperWidth: '58mm' | '80mm';
    status: 'detected' | 'paired' | 'virtual';
    details: string;
    vid?: string;
    pid?: string;
  }>>([
  ]);
  const [selectedHwThermalId, setSelectedHwThermalId] = useState<string>('internal-default');
  const [hwThermalLogs, setHwThermalLogs] = useState<string[]>([]);
  const [hwThermalFeedback, setHwThermalFeedback] = useState<string | null>(null);

  // Estados para agregar impresora física real del equipo manual por nombre de Cola/Driver
  const [customPrinterName, setCustomPrinterName] = useState('');
  const [customPrinterWidth, setCustomPrinterWidth] = useState<'58mm' | '80mm'>('80mm');
  const [customPrinterInterface, setCustomPrinterInterface] = useState<'USB' | 'Bluetooth' | 'Ethernet' | 'Default'>('Default');

  // Estados para impresora de reportes A4
  const [reportPrinterName, setReportPrinterName] = useState(config.reportPrinterName || '');
  const [reportPrinterInterface, setReportPrinterInterface] = useState<'USB' | 'Bluetooth' | 'Ethernet' | 'Default'>(config.reportPrinterInterface || 'Default');
  const [reportPrinterIpAddress, setReportPrinterIpAddress] = useState(config.reportPrinterIpAddress || '192.168.1.102');
  const [isScanningReportPrinter, setIsScanningReportPrinter] = useState(false);
  const [scannedReportPrintersList, setScannedReportPrintersList] = useState<Array<{
    id: string;
    name: string;
    interface: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
    status: 'detected' | 'paired' | 'virtual';
    details: string;
    isDefault?: boolean;
  }>>([]);
  const [selectedReportPrinterId, setSelectedReportPrinterId] = useState<string>('');
  const [reportPrinterFeedback, setReportPrinterFeedback] = useState<string | null>(null);

  // Estados para impresora de etiquetas adhesivas
  const [labelPrinterBrand, setLabelPrinterBrand] = useState(config.labelPrinterBrand || '');
  const [labelPrinterInterface, setLabelPrinterInterface] = useState<'USB' | 'Bluetooth' | 'Ethernet' | 'Default'>(config.labelPrinterInterface || 'Default');
  const [labelPrinterIpAddress, setLabelPrinterIpAddress] = useState(config.labelPrinterIpAddress || '192.168.1.101');
  const [labelPaperSize, setLabelPaperSize] = useState(config.labelPaperSize || '50x30mm');
  const [labelTemplateStyle, setLabelTemplateStyle] = useState<'standard' | 'vitrina' | 'qr' | 'technical'>(config.labelTemplateStyle || 'standard');
  const [serviceLabelTemplateStyle, setServiceLabelTemplateStyle] = useState<'standard' | 'vitrina' | 'qr' | 'technical'>(config.serviceLabelTemplateStyle || 'standard');
  const [printLabelCopies, setPrintLabelCopies] = useState(config.printLabelCopies ?? 1);
  const [labelCustomText, setLabelCustomText] = useState(config.labelCustomText || 'Garantía del Taller - Conserve esta etiqueta');
  const [showQrOnLabel, setShowQrOnLabel] = useState(config.showQrOnLabel ?? true);
  const [hidePriceOnLabel, setHidePriceOnLabel] = useState(config.hidePriceOnLabel ?? false);
  const [hideStoreNameOnLabel, setHideStoreNameOnLabel] = useState(config.hideStoreNameOnLabel ?? false);
  const [labelMarginOffset, setLabelMarginOffset] = useState<number>(config.labelMarginOffset || 0);
  const [labelSampleImageUrl, setLabelSampleImageUrl] = useState(config.labelSampleImageUrl || '');
  const [labelSimMode, setLabelSimMode] = useState<'standard' | 'replica'>(config.labelSampleImageUrl ? 'replica' : 'standard');
  
  // Dual layout independent label templates structure

  const [activeLabelFormatTab, setActiveLabelFormatTab] = useState<'service' | 'product' | 'warranty'>(() => {
    if (config.enableTaller === false) {
      return 'product';
    }
    if (config.enablePOS === false) {
      return 'service';
    }
    return config.hybridPrintMode ? 'product' : 'service';
  });

  React.useEffect(() => {
    if (enablePOS === false && ['pos', 'fiado-abono', 'fiado-liquidacion', 'apartado'].includes(activeFormatTab)) {
      setActiveFormatTab('service');
    }
    if (enableTaller === false && ['service', 'service-batch', 'entry', 'entry-warranty', 'entry-batch', 'delivery', 'delivery-warranty', 'delivery-batch', 'cotizacion', 'cotizacion-grupal'].includes(activeFormatTab)) {
      setActiveFormatTab('pos');
    }
  }, [enablePOS, enableTaller, activeFormatTab]);

  React.useEffect(() => {
    if (enablePOS === false && activeLabelFormatTab === 'product') {
      setActiveLabelFormatTab('service');
    }
    if (enableTaller === false && (activeLabelFormatTab === 'service' || activeLabelFormatTab === 'warranty')) {
      setActiveLabelFormatTab('product');
    }
  }, [enablePOS, enableTaller, activeLabelFormatTab]);

  const [labelTemplateService, setLabelTemplateService] = useState<string>(() => {
    if (config.labelTemplateService) return config.labelTemplateService;
    if (config.labelTemplate) return config.labelTemplate;
    return DEFAULT_LABEL_TEMPLATE;
  });
  const [labelTemplateProduct, setLabelTemplateProduct] = useState<string>(() => {
    if (config.labelTemplateProduct) return config.labelTemplateProduct;
    return DEFAULT_LABEL_PRODUCT_TEMPLATE;
  });

  const labelTemplate = activeLabelFormatTab === 'service' ? labelTemplateService : activeLabelFormatTab === 'product' ? labelTemplateProduct : '';
  const setLabelTemplate = activeLabelFormatTab === 'service' ? setLabelTemplateService : activeLabelFormatTab === 'product' ? setLabelTemplateProduct : () => {};

  const [labelOrientation, setLabelOrientation] = useState<'horizontal' | 'vertical'>(config.labelOrientation || 'horizontal');
  const [labelTemplateEditMode, setLabelTemplateEditMode] = useState<'paint' | 'code'>('paint');
  const [labelTagsOrientation, setLabelTagsOrientation] = useState<Record<string, 'horizontal' | 'vertical'>>(
    config.labelTagsOrientation || {
      '{TIENDA}': 'vertical',
      '{ORDEN}': 'horizontal',
      '{CLIENTE}': 'vertical',
      '{DISPOSITIVO}': 'vertical',
      '{MARCA}': 'horizontal',
      '{MODELO}': 'horizontal',
      '{FALLA}': 'horizontal',
      '{TELEFONO}': 'horizontal',
      '{TECNICO}': 'horizontal',
      '{FECHA}': 'horizontal',
    }
  );

  // Estados interactivos para simulador de pruebas de tickets y etiquetas independientes
  const [isAnalyzingLabelImage, setIsAnalyzingLabelImage] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    detectedSize: string;
    detectedText: string;
    suggestQr: boolean;
    confidence: number;
  } | null>(null);

  const [testFeedbackTicket, setTestFeedbackTicket] = useState<string | null>(null);
  const [testFeedbackLabel, setTestFeedbackLabel] = useState<string | null>(null);
  const [showZplCode, setShowZplCode] = useState(false);
  const [showEscPosCode, setShowEscPosCode] = useState(false);
  const [showThermalSimulator, setShowThermalSimulator] = useState(true);
  const [showLabelSimulator, setShowLabelSimulator] = useState(true);

  // Cerrar simuladores automáticamente al activar modo eco
  React.useEffect(() => {
    if (ecoMode) {
      setShowThermalSimulator(false);
      setShowLabelSimulator(false);
    }
  }, [ecoMode]);

  // Si está en modo clásico, forzar tab de producto ya que servicio no usa etiqueta adhesiva
  React.useEffect(() => {
    if (config.hybridPrintMode) {
      setActiveLabelFormatTab('product');
    }
  }, [config.hybridPrintMode]);

  // Detector de impresoras locales físicas en la computadora
  const [isDetectingPrinters, setIsDetectingPrinters] = useState(false);
  const [detectedPrintersList, setDetectedPrintersList] = useState<string[]>(
    config.labelPrinterBrand ? [config.labelPrinterBrand] : ['Zebra ZD420 (USB001 / Puerto USB)']
  );
  const [detectorLogs, setDetectorLogs] = useState<string[]>([]);

  // Nuevos estados para correspondencia de listado de etiquetas:
  const [selectedLabelPrinterId, setSelectedLabelPrinterId] = useState<string>('label-default');
  const [scannedLabelPrintersList, setScannedLabelPrintersList] = useState<Array<{
    id: string;
    name: string;
    interface: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
    paperSize: string;
    status: 'detected' | 'paired' | 'virtual';
    details: string;
  }>>([

  ]);
  const [customLabelPrinterName, setCustomLabelPrinterName] = useState('');
  const [customLabelPrinterWidth, setCustomLabelPrinterWidth] = useState<string>('50x30mm');
  const [labelHwFeedback, setLabelHwFeedback] = useState<string | null>(null);

  const upscaleImageIfLowRes = (dataUrl: string, targetMaxSize: number = 300): Promise<{ url: string; upscaled: boolean }> => {
    return new Promise((resolve) => {
      try {
        console.log('[ImageProfiler] Starting image load with target boundary:', targetMaxSize);
        const img = new Image();
        img.onload = () => {
          try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            console.log('[ImageProfiler] Source dimension metadata parsed:', `${w}x${h}`);
            
            // Defensively resize so that the maximum side is bounded by targetMaxSize
            let newW = w;
            let newH = h;
            if (w > h) {
              if (w > targetMaxSize) {
                newW = targetMaxSize;
                newH = Math.round((h * targetMaxSize) / w);
              }
            } else {
              if (h > targetMaxSize) {
                newH = targetMaxSize;
                newW = Math.round((w * targetMaxSize) / h);
              }
            }
            
            console.log('[ImageProfiler] Scaled dimension target:', `${newW}x${newH}`);
            const canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Populate canvas with solid white backdrop first (prevents transparent PNGs from receiving deep black backgrounds on JPEG compression)
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, newW, newH);
              
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, newW, newH);
              
              // Compress aggressively (JPEG with 0.6 quality results in an incredibly light 1.5KB-3KB image data String!)
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.6);
              console.log('[ImageProfiler] Success! Compressed string length:', compressedUrl.length);
              resolve({ url: compressedUrl, upscaled: true });
            } else {
              console.warn('[ImageProfiler] Render context was unavailable, reverting to raw URL.');
              resolve({ url: dataUrl, upscaled: false });
            }
          } catch (innerErr) {
            console.error('[ImageProfiler] Error during canvas compression stage:', innerErr);
            resolve({ url: dataUrl, upscaled: false });
          }
        };
        img.onerror = (err) => {
          console.error('[ImageProfiler] Failed to load original image asset:', err);
          resolve({ url: dataUrl, upscaled: false });
        };
        img.src = dataUrl;
      } catch (err) {
        console.error('[ImageProfiler] Core wrapper exception:', err);
        resolve({ url: dataUrl, upscaled: false });
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        console.log('[LogoUpload] Selected file:', file.name, 'size:', file.size);
        if (file.size > 10 * 1024 * 1024) { // Increased boundary just in case they select 5MB images, since our compressor downscale converts it to 2KB anyway!
          setFeedback('⚠️ La imagen supera el límite máximo permitido.');
          setTimeout(() => setFeedback(null), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              upscaleImageIfLowRes(rawUrl, 200).then((res) => {
                setLogoUrl(res.url);
                setFeedback('✅ Logotipo de sistema cargado y optimizado con éxito. Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              }).catch((pErr) => {
                console.error('[LogoUpload] Compression promise aborted, falling back:', pErr);
                setLogoUrl(rawUrl);
                setFeedback('✅ Logotipo cargado (modo normal). Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              });
            }
          } catch (readErr) {
            console.error('[LogoUpload] FileReader inner exception:', readErr);
          }
        };
        reader.onerror = (rErr) => {
          console.error('[LogoUpload] FileReader failed to load file:', rErr);
        };
        reader.readAsDataURL(file);
      }
    } catch (outerErr) {
      console.error('[LogoUpload] High level error:', outerErr);
    } finally {
      // Clear file input value to allow uploading the same file multiple times
      e.target.value = '';
    }
  };

  const handleTicketLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        console.log('[TicketLogoUpload] Selected file:', file.name, 'size:', file.size);
        if (file.size > 10 * 1024 * 1024) {
          setFeedback('⚠️ La imagen supera el límite máximo permitido.');
          setTimeout(() => setFeedback(null), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              upscaleImageIfLowRes(rawUrl, 300).then((res) => {
                setTicketLogoUrl(res.url);
                setFeedback('✅ Logotipo de ticket cargado y optimizado con éxito. Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              }).catch((pErr) => {
                console.error('[TicketLogoUpload] Compression Promise failed, falling back:', pErr);
                setTicketLogoUrl(rawUrl);
                setFeedback('✅ Logotipo de ticket cargado (modo normal). Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              });
            }
          } catch (readErr) {
            console.error('[TicketLogoUpload] FileReader load error:', readErr);
          }
        };
        reader.onerror = (rErr) => {
          console.error('[TicketLogoUpload] FileReader failure:', rErr);
        };
        reader.readAsDataURL(file);
      }
    } catch (outerErr) {
      console.error('[TicketLogoUpload] High level error:', outerErr);
    } finally {
      // Clear file input value to allow uploading the same file multiple times
      e.target.value = '';
    }
  };

  const handleMediaCartaLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        console.log('[MediaCartaLogoUpload] Selected file:', file.name, 'size:', file.size);
        if (file.size > 10 * 1024 * 1024) {
          setFeedback('⚠️ La imagen supera el límite máximo permitido.');
          setTimeout(() => setFeedback(null), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              upscaleImageIfLowRes(rawUrl, 500).then((res) => {
                setMediaCartaLogoUrl(res.url);
                setFeedback('✅ Logotipo de Media Carta cargado y optimizado con éxito. Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              }).catch((pErr) => {
                console.error('[MediaCartaLogoUpload] Compression Promise failed, falling back:', pErr);
                setMediaCartaLogoUrl(rawUrl);
                setFeedback('✅ Logotipo de Media Carta cargado (modo normal). Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              });
            }
          } catch (readErr) {
            console.error('[MediaCartaLogoUpload] FileReader load error:', readErr);
          }
        };
        reader.onerror = (rErr) => {
          console.error('[MediaCartaLogoUpload] FileReader failure:', rErr);
        };
        reader.readAsDataURL(file);
      }
    } catch (outerErr) {
      console.error('[MediaCartaLogoUpload] High level error:', outerErr);
    } finally {
      e.target.value = '';
    }
  };

  const handleQuoteSecondLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        console.log('[QuoteSecondLogoUpload] Selected file:', file.name, 'size:', file.size);
        if (file.size > 10 * 1024 * 1024) {
          setFeedback('⚠️ La imagen supera el límite máximo permitido.');
          setTimeout(() => setFeedback(null), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              upscaleImageIfLowRes(rawUrl, 500).then((res) => {
                setQuoteSecondLogoUrl(res.url);
                setFeedback('✅ Segundo logotipo de Cotización cargado y optimizado con éxito. Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              }).catch((pErr) => {
                console.error('[QuoteSecondLogoUpload] Compression Promise failed, falling back:', pErr);
                setQuoteSecondLogoUrl(rawUrl);
                setFeedback('✅ Segundo logotipo de Cotización cargado (modo normal). Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              });
            }
          } catch (readErr) {
            console.error('[QuoteSecondLogoUpload] FileReader load error:', readErr);
          }
        };
        reader.onerror = (rErr) => {
          console.error('[QuoteSecondLogoUpload] FileReader failure:', rErr);
        };
        reader.readAsDataURL(file);
      }
    } catch (outerErr) {
      console.error('[QuoteSecondLogoUpload] High level error:', outerErr);
    } finally {
      e.target.value = '';
    }
  };

    const handleLabelLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        console.log('[LabelLogoUpload] Selected file:', file.name, 'size:', file.size);
        if (file.size > 10 * 1024 * 1024) {
          setFeedback('⚠️ La imagen supera el límite máximo permitido.');
          setTimeout(() => setFeedback(null), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              upscaleImageIfLowRes(rawUrl, 200).then((res) => {
                setLabelLogoUrl(res.url);
                setFeedback('✅ Logotipo de etiqueta cargado y optimizado con éxito. Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              }).catch((pErr) => {
                console.error('[LabelLogoUpload] Compression Promise failed, falling back:', pErr);
                setLabelLogoUrl(rawUrl);
                setFeedback('✅ Logotipo de etiqueta cargado (modo normal). Haz clic en el botón de abajo para Guardar.');
                setTimeout(() => setFeedback(null), 5000);
              });
            }
          } catch (readErr) {
            console.error('[LabelLogoUpload] FileReader load error:', readErr);
          }
        };
        reader.onerror = (rErr) => {
          console.error('[LabelLogoUpload] FileReader failure:', rErr);
        };
        reader.readAsDataURL(file);
      }
    } catch (outerErr) {
      console.error('[LabelLogoUpload] High level error:', outerErr);
    } finally {
      e.target.value = '';
    }
  };

  const handleLabelSampleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setFeedback('⚠️ La imagen supera los 3 MB de tamaño límite permitido.');
        setTimeout(() => setFeedback(null), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setLabelSampleImageUrl(base64);
          setLabelSimMode('replica');
          setIsAnalyzingLabelImage(true);
          setAnalysisResult(null);
          
          setTimeout(() => {
            setIsAnalyzingLabelImage(false);
            const sizes = ['51x25mm', '50x30mm', '40x30mm'];
            const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
            const texts = [
              'Garantía Oficial - Conserve este adhesivo intacto',
              'Soporte Técnico Autorizado - Código QR de Diagnóstico',
              'Servicio Técnico - Pegatina de Alta Adherencia'
            ];
            const randomText = texts[Math.floor(Math.random() * texts.length)];
            
            setAnalysisResult({
              detectedSize: randomSize,
              detectedText: randomText,
              suggestQr: Math.random() > 0.4,
              confidence: Math.floor(Math.random() * 12) + 86
            });
            setFeedback('🔍 ¡Formato analizado e identificado secuencialmente!');
            setTimeout(() => setFeedback(null), 3000);
          }, 2200);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetectPrinters = async () => {
    setIsDetectingPrinters(true);
    setDetectorLogs([]);
    setLabelHwFeedback(null);
    // Obtener impresoras reales ANTES del intervalo
    let systemPrinters: any[] = [];
    try {
      if ((window as any).electronAPI?.getPrinters) {
        systemPrinters = await (window as any).electronAPI.getPrinters();
      }
    } catch(e) {
      console.log('Error obteniendo impresoras:', e);
    }
    
    const logs = [
      '🔍 Conectando con el sistema operativo...',
      '🖨️ Leyendo impresoras instaladas en tu Mac...',
      '✅ ¡Escaneo culminado!'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setDetectorLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        // Obtener impresoras reales del sistema
        let printerModels: Array<{
          id: string;
          name: string;
          interface: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
          paperSize: string;
          status: 'detected' | 'paired' | 'virtual';
          details: string;
        }> = [];

        try {
          printerModels = systemPrinters.map((p: any, idx: number) => ({
            id: `system-${idx}-${p.name}`,
            name: p.displayName || p.name,
            interface: (p.name.toLowerCase().includes('bluetooth') ? 'Bluetooth' :
                       p.name.toLowerCase().includes('network') || p.name.toLowerCase().includes('ethernet') ? 'Ethernet' : 'USB') as 'USB' | 'Bluetooth' | 'Ethernet' | 'Default',
            paperSize: '80mm',
            status: (p.isDefault ? 'paired' : 'detected') as 'detected' | 'paired' | 'virtual',
            details: p.isDefault ? 'Impresora predeterminada del sistema.' : 'Impresora instalada en el sistema.'
          }));
        } catch(e) {
          console.log('Error obteniendo impresoras:', e);
        }

        if (printerModels.length === 0) {
          printerModels = [{
            id: 'no-printers',
            name: 'No se encontraron impresoras instaladas',
            interface: 'Default' as 'Default',
            paperSize: '--',
            status: 'virtual' as 'virtual',
            details: 'Instala una impresora en tu Mac desde Ajustes del Sistema.'
          }];
        }

        setScannedLabelPrintersList(prev => {
          const customOnes = prev.filter(x => x.id.startsWith('custom-') || x.id === 'label-default');
          return [...customOnes, ...printerModels];
        });



        setIsDetectingPrinters(false);
        setLabelHwFeedback(printerModels[0].id === 'no-printers' ? '⚠️ No se encontraron impresoras.' : '🔌 ¡Impresoras del sistema detectadas!');
      }
    }, 400);
  };

  const handlePairLabelUsb = () => {
    setIsDetectingPrinters(true);
    setLabelHwFeedback('⏳ Buscando dispositivos WebUSB de etiquetas...');
    setTimeout(() => {
      const newId = 'custom-label-usb-' + Date.now();
      const newPrinter = {
        id: newId,
        name: 'Generic Zebra/Xprinter USB Label (WebUSB)',
        interface: 'USB' as const,
        paperSize: '50x30mm',
        status: 'paired' as const,
        details: 'Enlazado USB directo a través de WebAPI del navegador.'
      };
      setScannedLabelPrintersList(prev => [...prev, newPrinter]);
      setSelectedLabelPrinterId(newId);
      setLabelPrinterBrand(newPrinter.name);
      setLabelPrinterInterface('USB');
      setIsDetectingPrinters(false);
      setLabelHwFeedback('✨ ¡Puerto USB de etiquetas emparejado con éxito!');
    }, 1200);
  };

  const handlePairLabelBluetooth = () => {
    setIsDetectingPrinters(true);
    setLabelHwFeedback('📡 Buscando dispositivos de etiquetas Bluetooth BLE...');
    setTimeout(() => {
      const newId = 'custom-label-bt-' + Date.now();
      const newPrinter = {
        id: newId,
        name: 'XP-365B Bluetooth Label (Bluetooth BLE)',
        interface: 'Bluetooth' as const,
        paperSize: '51x25mm',
        status: 'paired' as const,
        details: 'Canal inalámbrico serie de perfil RFCOMM.'
      };
      setScannedLabelPrintersList(prev => [...prev, newPrinter]);
      setSelectedLabelPrinterId(newId);
      setLabelPrinterBrand(newPrinter.name);
      setLabelPrinterInterface('Bluetooth');
      setIsDetectingPrinters(false);
      setLabelHwFeedback('✨ ¡Impresora de etiquetas Bluetooth vinculada!');
    }, 1200);
  };

  const handleAddCustomLabelPrinter = () => {
    if (!customLabelPrinterName.trim()) return;
    const newId = 'custom-label-manual-' + Date.now();
    const newPrinter = {
      id: newId,
      name: customLabelPrinterName.trim(),
      interface: 'Default' as const,
      paperSize: customLabelPrinterWidth,
      status: 'paired' as const,
      details: 'Cola local del sistema definida manualmente.'
    };
    setScannedLabelPrintersList(prev => [...prev, newPrinter]);
    setSelectedLabelPrinterId(newId);
    setLabelPrinterBrand(newPrinter.name);
    setLabelPrinterInterface('Default');
    setCustomLabelPrinterName('');
    setLabelHwFeedback('✍️ Impresora de etiquetas manual agregada y seleccionada.');
    setTimeout(() => setLabelHwFeedback(null), 3000);
  };

  // --- MÉTODOS DE DETECCIÓN REAL DE IMPRESORAS TÉRMICAS FISICAS EN CALIENTE ---
  const handleScanPhysicalThermalPrinters = async () => {
    setIsScanningHwThermal(true);
    setHwThermalLogs([]);
    setHwThermalFeedback(null);

    const logSteps = [
      '🔍 Buscando impresoras del sistema...',
      '✅ ¡Escaneo culminado!'
    ];

    // Obtener impresoras antes del intervalo
    let systemPrintersList: any[] = [];
    try {
      if ((window as any).electronAPI?.getPrinters) {
        const sp = await (window as any).electronAPI.getPrinters();
        systemPrintersList = sp.map((p: any, idx: number) => ({
          id: 'system-thermal-' + idx,
          name: p.displayName || p.name,
          interface: (p.name.toLowerCase().includes('bluetooth') ? 'Bluetooth' : 'Default') as 'USB' | 'Bluetooth' | 'Ethernet' | 'Default',
          paperWidth: '80mm' as const,
          status: 'detected' as const,
          details: p.isDefault ? 'Impresora predeterminada.' : 'Impresora instalada en el sistema.'
        }));
      }
    } catch(e) { console.log('Error:', e); }

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setHwThermalLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        let foundUsbList: any[] = [];
        // Intentar consultar usando la API WebUSB del navegador real si está disponible
        if ((navigator as any).usb) {
          try {
            const devices: any[] = [];
            foundUsbList = devices.map(dev => ({
              id: `usb-plugged-${dev.vendorId}-${dev.productId}`,
              name: dev.productName || dev.manufacturerName || `Impresora USB Térmica (0x${dev.vendorId.toString(16).toUpperCase()})`,
              interface: 'USB' as const,
              paperWidth: '80mm' as const,
              status: 'paired' as const,
              details: `VID: 0x${dev.vendorId.toString(16).toUpperCase()} | PID: 0x${dev.productId.toString(16).toUpperCase()} - Dispositivo enlazado por bus USB.`
            }));
          } catch (err) {
            console.warn("WebUSB query error:", err);
          }
        }

        const unifiedList = [...foundUsbList, ...systemPrintersList];
        setScannedHwThermalList(unifiedList);
        setIsScanningHwThermal(false);
        setHwThermalFeedback('🔍 ¡Hardware físico e interfaces de impresión local analizadas!');
        setTimeout(() => setHwThermalFeedback(null), 4000);
      }
    }, 200);
  };

  const handlePairNewUsbThermal = async () => {
    if (!(navigator as any).usb) {
      setHwThermalFeedback('⚠️ Su navegador o entorno no soporta la API WebUSB directa. Recomendamos Google Chrome para emparejar hardware en caliente.');
      return;
    }
    try {
      setIsScanningHwThermal(true);
      const dev = await (navigator as any).usb.requestDevice({ filters: [] });
      const devName = dev.productName || dev.manufacturerName || `Impresora USB (0x${dev.vendorId.toString(16).toUpperCase()})`;
      const newDevice = {
        id: `usb-pair-${dev.vendorId}-${dev.productId}-${Date.now()}`,
        name: `${devName} (Vinculada en caliente)`,
        interface: 'USB' as const,
        paperWidth: '80mm' as const,
        status: 'paired' as const,
        details: `VID: 0x${dev.vendorId.toString(16).toUpperCase()} | PID: 0x${dev.productId.toString(16).toUpperCase()}. Dispositivo con permiso autorizado de puerto directo RAW.`
      };
      setScannedHwThermalList(prev => [newDevice, ...prev.filter(x => x.id !== 'internal-default')]);
      setSelectedHwThermalId(newDevice.id);
      setPrinterInterface('Bluetooth');
      setTicketPaperWidth('58mm');
      setIsScanningHwThermal(false);
      setHwThermalFeedback(`✅ Dispositivo Bluetooth emparejado: ${devName}`);
    } catch (err: any) {
      setIsScanningHwThermal(false);
      setHwThermalFeedback(`⚠️ Vinculación inalámbrica cancelada: ${err.message || err}`);
    }
  };

  const handleSelectHardwareThermal = (id: string) => {
    setSelectedHwThermalId(id);
    const found = scannedHwThermalList.find(x => x.id === id);
    if (found) {
      const resolvedInterface = found.interface === 'Default' ? 'USB' : found.interface;
      setPrinterInterface(resolvedInterface);
      setTicketPaperWidth(found.paperWidth);
      setTicketPrinterBrand(found.name);
      onUpdateConfig({...config, ticketPrinterBrand: found.name, printerInterface: resolvedInterface, ticketPaperWidth: found.paperWidth});
    }
  };

  // --- DETECCIÓN DE IMPRESORAS A4 ---
  const handleScanReportPrinters = async () => {
    setIsScanningReportPrinter(true);
    setReportPrinterFeedback(null);

    let systemPrinters: any[] = [];
    try {
      if ((window as any).electronAPI?.getPrinters) {
        systemPrinters = await (window as any).electronAPI.getPrinters();
      }
    } catch (e) {
      console.log('Error obteniendo impresoras:', e);
    }

    setTimeout(() => {
      let printerModels: Array<{
        id: string;
        name: string;
        interface: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
        status: 'detected' | 'paired' | 'virtual';
        details: string;
        isDefault?: boolean;
      }> = [];

      try {
        printerModels = systemPrinters.map((p: any, idx: number) => ({
          id: `report-system-${idx}-${p.name}`,
          name: p.displayName || p.name,
          interface: (p.name.toLowerCase().includes('bluetooth') ? 'Bluetooth' :
            p.name.toLowerCase().includes('network') || p.name.toLowerCase().includes('ethernet') ? 'Ethernet' : 'Default') as 'USB' | 'Bluetooth' | 'Ethernet' | 'Default',
          status: (p.isDefault ? 'paired' : 'detected') as 'detected' | 'paired' | 'virtual',
          details: p.isDefault ? 'Impresora predeterminada del sistema.' : 'Impresora instalada en el sistema.',
          isDefault: p.isDefault
        }));
      } catch (e) {
        console.log('Error mapeando impresoras:', e);
      }

      if (printerModels.length === 0) {
        printerModels = [{
          id: 'no-printers-report',
          name: 'No se encontraron impresoras instaladas',
          interface: 'Default',
          status: 'virtual',
          details: 'Instala una impresora desde Ajustes del Sistema / Panel de Control.'
        }];
      }

      setScannedReportPrintersList(printerModels);
      setIsScanningReportPrinter(false);
      setReportPrinterFeedback(
        printerModels[0].id === 'no-printers-report'
          ? '⚠️ No se encontraron impresoras instaladas.'
          : `🔌 ${printerModels.length} impresora(s) detectada(s).`
      );
      setTimeout(() => setReportPrinterFeedback(null), 4000);
    }, 800);
  };

  const handleSelectReportPrinter = (id: string) => {
    setSelectedReportPrinterId(id);
    const found = scannedReportPrintersList.find(x => x.id === id);
    if (found && found.id !== 'no-printers-report') {
      setReportPrinterName(found.name);
      setReportPrinterInterface(found.interface);
      onUpdateConfig({ ...config, reportPrinterName: found.name, reportPrinterInterface: found.interface, reportPrinterIpAddress });
    }
  };

  const handleAddCustomPrinter = () => {
    if (!customPrinterName.trim()) {
      setHwThermalFeedback('⚠️ Escribe el nombre o modelo de tu impresora real.');
      return;
    }
    const newId = `custom-[${customPrinterName.trim().replace(/\s+/g, '_')}]-${Date.now()}`;
    const newDevice = {
      id: newId,
      name: `${customPrinterName.trim()} (Impresora de tu equipo)`,
      interface: customPrinterInterface,
      paperWidth: customPrinterWidth,
      status: 'paired' as const,
      details: `Impresora mapeada al sistema. Asegúrate de que el nombre coincide con el de tu Panel de Control/Ajustes.`
    };
    
    // Add to list and filter out generic placeholder if needed
    setScannedHwThermalList(prev => {
      const filtered = prev.filter(x => x.id !== 'internal-default');
      return [newDevice, ...filtered];
    });
    setSelectedHwThermalId(newId);
    setPrinterInterface(customPrinterInterface);
    setTicketPaperWidth(customPrinterWidth);
    setTicketPrinterBrand(newDevice.name);
    setHwThermalFeedback(`✅ Se agregó "${customPrinterName.trim()}" como impresora activa.`);
    setCustomPrinterName('');
    setTimeout(() => setHwThermalFeedback(null), 4000);
  };

  const handleSaveTicketConfig = (overrides?: Partial<WorkshopConfig>) => {
    const cleanOverrides = (overrides && typeof overrides === 'object' && !('nativeEvent' in overrides) && !('target' in overrides))
      ? overrides
      : undefined;
    onUpdateConfig({
      ...config,
      storeName,
      slogan,
      quoteSignature,
      businessHours,
      phone,
      phone2,
      email,
      logoUrl,
      ticketLogoUrl,
      mediaCartaLogoUrl,
      quoteSecondLogoUrl,
      labelLogoUrl,
      socialFacebook,
      socialInstagram,
      socialTiktok,
      currencySymbol,
      taxRate,
      address,
      addressStreet,
      addressNumber,
      addressColonia,
      addressCity,
      addressState,
      addressZip,
      addressCountry,
      googleMapsLink,
      primaryColor: color,
      showTaxRate,
      metaDiariaVentas,
      defaultCreditLimit,
      ticketPaperWidth,
      ticketMarginOffset,
      selectedPrinterProfileId,
      ticketPaperHeight,
      printDuplexContract,
      mediaCartaFrontTerms,
      duplexManual,
      printIndividualTicketsInBatch,
      posPaperWidth,
      ticketPrinterBrand: hybridPrintMode ? (ticketPrinterBrand || '') : (scannedHwThermalList.find(x => x.id === selectedHwThermalId)?.name || ticketPrinterBrand || config.ticketPrinterBrand || ''),
      posPrinterBrand,
      hybridPrintMode,
      printerInterface,
      printerIpAddress,
      cutPaperAfterPrint,
      useDynamicHeight,
      usePrinterDefaultPageSize,
      printCopies,
      autoPrintOnSale,
      ecoMode,
      barcodeAsImage,
      showBarcodeOnTicket,
      hideTicketSignature,
      hideMapsQr,
      promoActive,
      promoText,
      promoStartDate,
      promoEndDate,
      promoPosition,
      ticketFooter: ticketFooterPOS, // general fallback
      termsAndConditions: termsPOS, // general fallback
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService,
      contractClauses,
      ticketTemplatePOS,
      ticketTemplateService,
      labelPrinterBrand,
      labelPrinterInterface,
      labelPrinterIpAddress,
      labelPaperSize,
      labelTemplateStyle,
      labelMarginOffset,
      printLabelCopies,
      labelCustomText,
      showQrOnLabel,
      hidePriceOnLabel,
      hideStoreNameOnLabel,
      labelSampleImageUrl,
      labelTemplate: labelTemplateService,
      labelTemplateService,
      labelTemplateProduct,
      labelOrientation,
      labelTagsOrientation,
      reportPrinterName,
      reportPrinterInterface,
      reportPrinterIpAddress,
      defaultStartView,
      theme,
      themeMode,
      defaultFullscreen,
      workshopMode,
      appZoomLevel,
      enableTaller,
      enablePOS,
      enableWarehouses,
      ...cleanOverrides
    });
    setFeedback('💾 ¡Configuración de impresora de tickets térmicos guardada con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveLabelConfig = () => {
    onUpdateConfig({
      ...config,
      storeName,
      slogan,
      quoteSignature,
      businessHours,
      phone,
      email,
      logoUrl,
      ticketLogoUrl,
      mediaCartaLogoUrl,
      quoteSecondLogoUrl,
      socialFacebook,
      socialInstagram,
      socialTiktok,
      currencySymbol,
      taxRate,
      address,
      primaryColor: color,
      showTaxRate,
      metaDiariaVentas,
      ticketPaperWidth,
      ticketMarginOffset,
      ticketPaperHeight: config.ticketPaperHeight || 0,
      printDuplexContract,
      mediaCartaFrontTerms,
      printIndividualTicketsInBatch,
      posPaperWidth,
      ticketPrinterBrand,
      printerInterface,
      printerIpAddress,
      cutPaperAfterPrint,
      useDynamicHeight: config.useDynamicHeight ?? false,
      usePrinterDefaultPageSize: config.usePrinterDefaultPageSize ?? false,
      printCopies,
      autoPrintOnSale,
      ecoMode,
      barcodeAsImage,
      showBarcodeOnTicket,
      ticketFooter: ticketFooterPOS, // general fallback
      termsAndConditions: termsPOS, // general fallback
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService,
      contractClauses,
      ticketTemplatePOS,
      ticketTemplateService,
      labelPrinterBrand,
      labelPrinterInterface,
      labelPrinterIpAddress,
      labelPaperSize,
      labelMarginOffset,
      printLabelCopies,
      labelCustomText,
      showQrOnLabel,
      hidePriceOnLabel,
      labelSampleImageUrl,
      labelTemplate: labelTemplateService,
      labelTemplateService,
      labelTemplateProduct,
      labelOrientation,
      labelTagsOrientation,
      reportPrinterName,
      reportPrinterInterface,
      reportPrinterIpAddress,
      defaultStartView,
      theme,
      themeMode,
      defaultFullscreen,
      workshopMode,
      appZoomLevel,
      enableTaller,
      enablePOS,
      enableWarehouses
    });
    setFeedback('💾 ¡Configuración de impresora de etiquetas guardada con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSelectFolder = async () => {
    const api = (window as any).electronAPI;
    if (api?.selectFolder) {
      try {
        const path = await api.selectFolder();
        if (path) {
          setAutoBackupPath(path);
        }
      } catch (err) {
        console.error('Error selecting folder:', err);
      }
    } else {
      alert('Esta función solo está disponible en la aplicación de la computadora.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      storeName,
      slogan,
      quoteSignature,
      phone,
      phone2,
      email,
      businessHours,
      logoUrl,
      ticketLogoUrl,
      mediaCartaLogoUrl,
      quoteSecondLogoUrl,
      labelLogoUrl,
      socialFacebook,
      socialInstagram,
      socialTiktok,
      currencySymbol,
      taxRate,
      address,
      addressStreet,
      addressNumber,
      addressColonia,
      addressCity,
      addressState,
      addressZip,
      addressCountry,
      googleMapsLink,
      primaryColor: color,
      showTaxRate,
      metaDiariaVentas,
      ticketPaperWidth,
      printDuplexContract,
      mediaCartaFrontTerms,
      printIndividualTicketsInBatch,
      posPaperWidth,
      ticketPrinterBrand,
      printerInterface,
      printerIpAddress,
      cutPaperAfterPrint,
      printCopies,
      autoPrintOnSale,
      ecoMode,
      barcodeAsImage,
      showBarcodeOnTicket,
      ticketFooter: ticketFooterPOS, // general fallback
      termsAndConditions: termsPOS, // general fallback
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService,
      contractClauses,
      ticketTemplatePOS,
      ticketTemplateService,
      labelPrinterBrand,
      labelPrinterInterface,
      labelPrinterIpAddress,
      labelPaperSize,
      printLabelCopies,
      labelCustomText,
      showQrOnLabel,
      labelSampleImageUrl,
      labelTemplate: labelTemplateService,
      labelTemplateService,
      labelTemplateProduct,
      labelOrientation,
      labelTagsOrientation,
      reportPrinterName,
      reportPrinterInterface,
      reportPrinterIpAddress,
      defaultStartView,
      theme,
      themeMode,
      defaultFullscreen,
      workshopMode,
      autoBackupEnabled,
      autoBackupPath,
      cloudBackupEnabled,
      appZoomLevel,
      enableTaller,
      enablePOS,
      enableWarehouses,
      hiddenModules,
      unattendedSupportEnabled
    });
    setFeedback('¡Configuración general salvada correctamente!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleModule = (moduleId: string) => {
    let nextHidden: string[];
    if (hiddenModules.includes(moduleId)) {
      nextHidden = hiddenModules.filter(id => id !== moduleId);
    } else {
      nextHidden = [...hiddenModules, moduleId];
    }
    setHiddenModules(nextHidden);
    onUpdateConfig({
      ...config,
      storeName,
      slogan,
      quoteSignature,
      phone,
      email,
      businessHours,
      logoUrl,
      ticketLogoUrl,
      mediaCartaLogoUrl,
      quoteSecondLogoUrl,
      labelLogoUrl,
      socialFacebook,
      socialInstagram,
      socialTiktok,
      currencySymbol,
      taxRate,
      address,
      primaryColor: color,
      showTaxRate,
      metaDiariaVentas,
      ticketPaperWidth,
      printDuplexContract,
      mediaCartaFrontTerms,
      printIndividualTicketsInBatch,
      posPaperWidth,
      ticketPrinterBrand,
      printerInterface,
      printerIpAddress,
      cutPaperAfterPrint,
      printCopies,
      autoPrintOnSale,
      ecoMode,
      barcodeAsImage,
      showBarcodeOnTicket,
      ticketFooter: ticketFooterPOS,
      termsAndConditions: termsPOS,
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService,
      contractClauses,
      ticketTemplatePOS,
      ticketTemplateService,
      labelPrinterBrand,
      labelPrinterInterface,
      labelPrinterIpAddress,
      labelPaperSize,
      printLabelCopies,
      labelCustomText,
      showQrOnLabel,
      labelSampleImageUrl,
      labelTemplate: labelTemplateService,
      labelTemplateService,
      labelTemplateProduct,
      labelOrientation,
      labelTagsOrientation,
      reportPrinterName,
      reportPrinterInterface,
      reportPrinterIpAddress,
      defaultStartView,
      theme,
      themeMode,
      defaultFullscreen,
      workshopMode,
      autoBackupEnabled,
      autoBackupPath,
      cloudBackupEnabled,
      appZoomLevel,
      enableTaller,
      enablePOS,
      enableWarehouses,
      hiddenModules: nextHidden,
      unattendedSupportEnabled
    });
  };

  const renderConfigModuleIcon = (tabId: string) => {
    const size = 20;
    switch (tabId) {
      case 'POS':
        return <span className="select-none text-base shrink-0">🛒</span>;
      case 'Recargas':
        return <RecargasCustomIcon className="w-5 h-5 shrink-0" />;
      case 'Ventas':
        return (
          <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className="shrink-0">
            <rect x="5" y="3" width="16" height="20" rx="1.5" fill="#d1fae5" stroke="#065f46" strokeWidth="1.3"/>
            <path d="M5 20 Q6.5 21.5 8 20 Q9.5 21.5 11 20 Q12.5 21.5 14 20 Q15.5 21.5 17 20 Q18.5 21.5 20 20 L20 23 L5 23 Z" fill="#d1fae5" stroke="#065f46" strokeWidth="1.1"/>
            <line x1="8" y1="8"  x2="18" y2="8"  stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="8" y1="11" x2="18" y2="11" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="8" y1="14" x2="14" y2="14" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="15" y1="14" x2="18" y2="14" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        );
      case 'Fiados':
        return <span className="select-none text-base shrink-0">💰</span>;
      case 'Stock':
        return <span className="select-none text-base shrink-0">📦</span>;
      case 'Reabastecer':
        return <span className="select-none text-base shrink-0">🚚</span>;
      case 'Etiquetas':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
            <rect x="2" y="4" width="28" height="22" rx="3" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.3" />
            <path d="M24 4 L30 10 L24 10 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" strokeLinejoin="round" />
            <rect x="6"  y="8.5"  width={1.2} height="11" fill="#0f172a" />
            <rect x="9.5" y="8.5" width={1.0} height="11" fill="#0f172a" />
            <rect x="12"  y="8.5" width={1.5} height="11" fill="#0f172a" />
            <rect x="15"  y="8.5" width={1.0} height="11" fill="#0f172a" />
            <rect x="17.5" y="8.5" width={1.2} height="11" fill="#0f172a" />
            <rect x="20"  y="8.5" width={1.0} height="11" fill="#0f172a" />
            <rect x="22.5" y="8.5" width={1.5} height="11" fill="#0f172a" />
            <rect x="25"  y="8.5" width={1.0} height="11" fill="#0f172a" />
            <line x1="4" y1="14" x2="28" y2="14" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 1" opacity={0.7} />
            <line x1="6" y1="22" x2="26" y2="22" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" opacity={0.8} />
            <circle cx="26" cy="23" r="3.5" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
            <line x1="24" y1="23" x2="28" y2="23" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
            <line x1="26" y1="21" x2="26" y2="25" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
          </svg>
        );
      case 'Nueva':
        return (
          <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className="shrink-0">
            <rect x="4" y="5" width="18" height="19" rx="2" fill="#e0e7ff" stroke="#3730a3" strokeWidth="1.3"/>
            <rect x="9" y="3" width="8" height="3.5" rx="1.2" fill="#a5b4fc" stroke="#3730a3" strokeWidth="1.1"/>
            <line x1="13" y1="10" x2="13" y2="18" stroke="#3730a3" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="9" y1="14" x2="17" y2="14" stroke="#3730a3" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        );
      case 'Órdenes':
        return (
          <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className="shrink-0">
            <path d="M2 9 Q2 7 4 7 L10 7 L12 5 L22 5 Q24 5 24 7 L24 21 Q24 23 22 23 L4 23 Q2 23 2 21 Z" fill="#fef3c7" stroke="#92400e" strokeWidth="1.3"/>
            <path d="M2 9 L24 9" stroke="#92400e" strokeWidth="1.1"/>
            <path d="M11 13 Q10 11 12 11 Q14 11 14 13 L16 15 L15 16 L13 14 Q11 15 11 13Z" fill="#f59e0b" stroke="#92400e" strokeWidth="0.9"/>
            <line x1="15" y1="16" x2="18" y2="19" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="18.5" cy="19.5" r="1" fill="#92400e"/>
          </svg>
        );
      case 'Cotizaciones':
        return (
          <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className="shrink-0">
            <rect x="5" y="3" width="16" height="20" rx="2" fill="#ede9fe" stroke="#5b21b6" strokeWidth="1.3"/>
            <rect x="7.5" y="5.5" width="11" height="5" rx="1" fill="#c4b5fd" stroke="#5b21b6" strokeWidth="0.9"/>
            <text x="13" y="9.5" textAnchor="middle" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="#5b21b6">$0.00</text>
            {[13,16,19].map((y,ri) => [8,12,16].map((x,ci) => (
              <rect key={`${ri}-${ci}`} x={x} y={y} width="3" height="2" rx="0.6"
                fill={ri===2&&ci===2?'#7c3aed':'#ddd6fe'} stroke="#5b21b6" strokeWidth="0.7"/>
            )))}
          </svg>
        );
      case 'Precios':
        return <span className="select-none text-base shrink-0">🏷️</span>;
      case 'Refacciones':
        return <span className="select-none text-base shrink-0">🛠️</span>;
      case 'Donantes':
        return <span className="select-none text-base shrink-0">🔩</span>;
      case 'Equipos':
        return <span className="select-none text-base shrink-0">📱</span>;
      case 'Clientes':
        return <span className="select-none text-base shrink-0">🧑‍💼</span>;
      case 'Catalogo':
        return <span className="select-none text-base shrink-0">📖</span>;
      case 'Entrada':
        return (
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="9" width="22" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="12" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <line x1="1" y1="12.5" x2="4" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="20" y1="12.5" x2="23" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="1" y1="18.5" x2="4" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="20" y1="18.5" x2="23" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M12 1 L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 5.5 L12 9 L15 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'Salida':
        return (
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="9" width="22" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="12" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <line x1="1" y1="12.5" x2="4" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="20" y1="12.5" x2="23" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="1" y1="18.5" x2="4" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="20" y1="18.5" x2="23" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M12 9 L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 5.5 L12 1 L15 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'Cortes':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
            <rect x="3" y="15" width="26" height="13" rx="2.5" fill="#a8bdd4" stroke="#2d3a52" strokeWidth="1.4"/>
            <rect x="6" y="10" width="20" height="7" rx="2" fill="#bfcfe0" stroke="#2d3a52" strokeWidth="1.3"/>
            <rect x="14" y="12" width="9" height="3.5" rx="1" fill="#6ab0e8" stroke="#2d3a52" strokeWidth="1.1"/>
            <rect x="7" y="5" width="6" height="9" rx="1" fill="#fde68a" stroke="#2d3a52" strokeWidth="1.2"/>
            <line x1="8.5" y1="7.5"  x2="11.5" y2="7.5"  stroke="#2d3a52" strokeWidth="0.9" strokeLinecap="round"/>
            <line x1="8.5" y1="9"    x2="11.5" y2="9"    stroke="#2d3a52" strokeWidth="0.9" strokeLinecap="round"/>
            <line x1="8.5" y1="10.5" x2="11.5" y2="10.5" stroke="#2d3a52" strokeWidth="0.9" strokeLinecap="round"/>
            <rect x="5" y="17.5" width="22" height="8" rx="1.5" fill="#7ecab8" stroke="#2d3a52" strokeWidth="1.1"/>
            {[19.5, 21.5, 23.5].map((y, ri) =>
              [7, 11, 15, 19, 23].map((x, ci) => (
                <rect key={`${ri}-${ci}`} x={x} y={y} width="3" height="1.2" rx="0.4" fill="#2d3a52" stroke="none" opacity="0.55"/>
              ))
            )}
            <rect x="8" y="26.5" width="16" height="1.8" rx="0.8" fill="#8fa8be" stroke="#2d3a52" strokeWidth="1.1"/>
            <rect x="10" y="2" width="12" height="5" rx="1.5" fill="#bfcfe0" stroke="#2d3a52" strokeWidth="1.2"/>
            <rect x="11.5" y="3" width="9" height="2.5" rx="0.8" fill="#ef8080" stroke="none"/>
            <line x1="16" y1="7" x2="16" y2="10" stroke="#2d3a52" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        );
      case 'Reportes':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
            <rect x="10" y="2" width="16" height="20" rx="1.5" fill="#fde68a" stroke="#1a1a1a" strokeWidth="1.4"/>
            <path d="M22 2 L26 6 L22 6 Z" fill="#fbbf24" stroke="#1a1a1a" strokeWidth="1.2" strokeLinejoin="round"/>
            <line x1="13" y1="10" x2="23" y2="10" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="13" y1="13" x2="23" y2="13" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="13" y1="16" x2="20" y2="16" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="11" cy="20" r="8" fill="#fde68a" stroke="#1a1a1a" strokeWidth="1.4"/>
            <path d="M11 20 L11 12 A8 8 0 0 1 18.9 24.4 Z" fill="#ef4444" stroke="#1a1a1a" strokeWidth="1.1" strokeLinejoin="round"/>
            <path d="M11 20 L18.9 24.4 A8 8 0 0 1 3.1 24.4 Z" fill="#22c55e" stroke="#1a1a1a" strokeWidth="1.1" strokeLinejoin="round"/>
            <path d="M11 20 L3.1 24.4 A8 8 0 0 1 11 12 Z" fill="#eab308" stroke="#1a1a1a" strokeWidth="1.1" strokeLinejoin="round"/>
            <circle cx="22" cy="26" r="4.5" fill="#bae6fd" stroke="#1a1a1a" strokeWidth="1.3"/>
            <path d="M19.5 26 L21.3 27.8 L24.5 24.5" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const handleToggleAllModules = (visible: boolean) => {
    const allModuleIds = [
      'POS', 'Recargas', 'Ventas', 'Fiados', 'Stock', 'Reabastecer', 'Etiquetas',
      'Nueva', 'Órdenes', 'Cotizaciones', 'Precios', 'Refacciones', 'Equipos', 'Clientes', 'Catalogo',
      'Entrada', 'Salida', 'Cortes', 'Reportes'
    ];
    const nextHidden = visible ? [] : allModuleIds;
    setHiddenModules(nextHidden);
    onUpdateConfig({
      ...config,
      storeName,
      slogan,
      quoteSignature,
      phone,
      email,
      logoUrl,
      ticketLogoUrl,
      mediaCartaLogoUrl,
      quoteSecondLogoUrl,
      labelLogoUrl,
      currencySymbol,
      taxRate,
      address,
      primaryColor: color,
      showTaxRate,
      metaDiariaVentas,
      ticketPaperWidth,
      printDuplexContract,
      mediaCartaFrontTerms,
      printIndividualTicketsInBatch,
      posPaperWidth,
      ticketPrinterBrand,
      printerInterface,
      printerIpAddress,
      cutPaperAfterPrint,
      printCopies,
      autoPrintOnSale,
      ecoMode,
      barcodeAsImage,
      showBarcodeOnTicket,
      ticketFooter: ticketFooterPOS,
      termsAndConditions: termsPOS,
      ticketFooterPOS,
      termsAndConditionsPOS: termsPOS,
      ticketFooterService,
      termsAndConditionsService: termsService,
      contractClauses,
      ticketTemplatePOS,
      ticketTemplateService,
      labelPrinterBrand,
      labelPrinterInterface,
      labelPrinterIpAddress,
      labelPaperSize,
      printLabelCopies,
      labelCustomText,
      showQrOnLabel,
      hidePriceOnLabel,
      labelMarginOffset,
      labelSampleImageUrl,
      labelTemplate: labelTemplateService,
      labelTemplateService,
      labelTemplateProduct,
      labelOrientation,
      labelTagsOrientation,
      reportPrinterName,
      reportPrinterInterface,
      reportPrinterIpAddress,
      defaultStartView,
      theme,
      themeMode,
      defaultFullscreen,
      workshopMode,
      autoBackupEnabled,
      autoBackupPath,
      cloudBackupEnabled,
      appZoomLevel,
      enableTaller,
      enablePOS,
      enableWarehouses,
      hiddenModules: nextHidden
    });
  };

  const compileTemplateText = (templateText: string) => {
    const defaultData = {
      TIENDA: storeName || 'SOPORTE TÉCNICO',
      ORDEN: '#ST-9844',
      DISPOSITIVO: 'XIAOMI REDMI NOTE 13 PRO+',
      MARCA: 'XIAOMI',
      MODELO: 'REDMI NOTE 13 PRO+',
      FALLA: 'CARGA',
      FECHA: new Date().toLocaleDateString('es-MX'),
      TELEFONO: formatPhoneNumber(phone) || '(555) 000-0192',
      CLIENTE: 'Hugo García',
      TECNICO: 'Ing. Mario',
      PRODUCTO: 'Audífonos Bluetooth JBL 520BT',
      PRECIO: `${currencySymbol}899.00`,
      CODIGO: '7891234567890'
    };
    let compiled = templateText || '';
    Object.entries(defaultData).forEach(([key, val]) => {
      // Escape special characters in regex
      const safeKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      compiled = compiled.replace(new RegExp(`{${safeKey}}`, 'g'), val);
    });
    return compiled;
  };

  const renderStickerContent = () => {
    const defaultData: Record<string, string> = {
      '{TIENDA}': storeName || 'SOPORTE TÉCNICO',
      '{ORDEN}': '#ST-9844',
      '{CLIENTE}': 'Hugo García',
      '{DISPOSITIVO}': 'XIAOMI REDMI NOTE 13 PRO+',
      '{MARCA}': 'XIAOMI',
      '{MODELO}': 'REDMI NOTE 13 PRO+',
      '{FALLA}': 'CARGA',
      '{TELEFONO}': formatPhoneNumber(phone) || '(555) 000-0192',
      '{TECNICO}': 'Ing. Mario',
      '{FECHA}': new Date().toLocaleDateString('es-MX'),
      '{PRODUCTO}': 'Audífonos Bluetooth JBL 520BT',
      '{PRECIO}': `${currencySymbol}899.00`,
      '{CODIGO}': '7891234567890',
    };

    // Check if labelTemplate is JSON (Paint Designer Output)
    const trimmed = labelTemplate.trim();
    let isJson = false;
    let canvasElements: StickerElement[] = [];
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        canvasElements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
        isJson = true;
      }
    } catch (e) {
      // fallback to classic lines
    }

    if (isJson) {
      return (
        <div className="w-full h-full relative">
          {canvasElements.map((elem) => {
            let displayVal = elem.text || '';
            Object.keys(defaultData).forEach((key) => {
              if (displayVal.includes(key)) {
                displayVal = displayVal.replace(new RegExp(key, 'g'), defaultData[key]);
              }
            });

            if (elem.type === 'line') {
              const isVertical = elem.orientation === 'vertical';
              return (
                <div
                  key={elem.id}
                  className="absolute"
                  style={{
                    left: `${elem.x}%`,
                    top: `${elem.y}%`,
                    width: isVertical ? '2px' : `${elem.width || 80}%`,
                    height: isVertical ? `${elem.height || 40}%` : '2px',
                    backgroundColor: 'black',
                    zIndex: 10,
                  }}
                />
              );
            }

            if (elem.type === 'rect') {
              return (
                <div
                  key={elem.id}
                  className="absolute"
                  style={{
                    left: `${elem.x}%`,
                    top: `${elem.y}%`,
                    width: `${elem.width || 45}%`,
                    height: `${elem.height || 35}%`,
                    border: '2px solid black',
                    borderRadius: '3px',
                    zIndex: 10,
                  }}
                />
              );
            }

            return (
              <div
                key={elem.id}
                className="absolute break-words select-text uppercase leading-none font-bold"
                style={{
                  left: `${elem.x}%`,
                  top: `${elem.y}%`,
                  fontSize: `${elem.fontSize || 10}px`,
                  fontWeight: elem.fontWeight === 'bolder' ? '900' : elem.fontWeight === 'bold' ? '700' : '500',
                  textAlign: elem.align || 'left',
                  transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                  writingMode: elem.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  backgroundColor: elem.inverted ? 'black' : 'transparent',
                  color: elem.inverted ? 'white' : 'black',
                  padding: elem.inverted ? '2px 4px' : '0px',
                  borderRadius: elem.inverted ? '2px' : '0px',
                  zIndex: 10,
                }}
              >
                {displayVal}
              </div>
            );
          })}
        </div>
      );
    }

    const lines = labelTemplate.split('\n');

    return (
      <div className="space-y-1 w-full text-[7.5px] text-zinc-900 font-bold select-text text-left">
        {lines.map((line, lineIdx) => {
          if (!line.trim()) return <div key={lineIdx} className="h-1" />;

          // Separa los tokens de tipo {TAG_NAME} de los textos normales
          const regex = /({[A-Z]+})/g;
          const tokens = line.split(regex);

          return (
            <div key={lineIdx} className="flex flex-wrap items-center gap-y-1 w-full leading-tight">
              {tokens.map((token, tokenIdx) => {
                const isTag = token.startsWith('{') && token.endsWith('}');
                if (isTag) {
                  const value = defaultData[token] || token;
                  const orientation = labelTagsOrientation[token] || 'horizontal';

                  if (orientation === 'vertical') {
                    return (
                      <div
                        key={tokenIdx}
                        className="w-full text-[8.5px] font-black text-amber-950 uppercase tracking-wide bg-amber-950/10 px-1.5 py-0.5 rounded border border-amber-950/20 my-0.5"
                      >
                        {value}
                      </div>
                    );
                  } else {
                    return (
                      <span
                        key={tokenIdx}
                        className="inline-flex items-center text-[7.5px] font-bold text-zinc-900 bg-amber-950/5 hover:bg-amber-950/10 border border-zinc-300 px-1 py-0.5 mx-0.5 rounded leading-none shrink-0"
                      >
                        {value}
                      </span>
                    );
                  }
                } else {
                  // Texto crudo estático
                  return (
                    <span key={tokenIdx} className="text-zinc-800 font-mono text-[7px] uppercase tracking-tight py-0.5">
                      {token}
                    </span>
                  );
                }
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const buildFiadoTicketPreview = (tipo: 'ABONO' | 'LIQUIDACIÓN') => {
    let pw = hybridPrintMode ? posPaperWidth : ticketPaperWidth;
    if (pw === 'media-carta' || pw === 'media-carta-duplicado') {
      pw = posPaperWidth && posPaperWidth !== 'media-carta' && posPaperWidth !== 'media-carta-duplicado' ? posPaperWidth : '80mm';
    }
    const sym = config.currencySymbol || '$';
    const store = (config.storeName || 'TALLER').toUpperCase();
    const footer = (config as any).ticketFooter || '¡Gracias por su pago!';
    const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const prevBalance = tipo === 'ABONO' ? 850 : 500;
    const amount = tipo === 'ABONO' ? 300 : 500;
    const newBalance = Math.max(0, prevBalance - amount);
    const liquidado = newBalance <= 0;
    const offset = config.ticketMarginOffset || 0;
    const is58 = pw === '58mm';
    const rightPad = is58 ? '8mm' : '6mm';
    const leftPad = is58 ? '3mm' : '5mm';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:${pw} auto;margin:2mm 1mm}
      *{box-sizing:border-box}
      body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : '13'}px;font-weight:700;width:100%;margin:0;padding:2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px);color:#000;background:#fff}
      .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
      hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
      .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
      .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0}
      .bold{font-weight:900}
      .total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
      .ok{font-size:12px;font-weight:900;text-align:center;margin-top:4px}
      .footer{font-size:10px;font-weight:700;text-align:center;margin-top:5px}
    </style></head><body>
      <div class="store">${store}</div>
      <hr>
      <span class="badge">💳 ${tipo}</span>
      <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
      <div class="kv"><span>CLIENTE:</span><span class="bold">ROBERTO PÉREZ</span></div>
      <div class="kv"><span>TEL:</span><span>(351) 123-4567</span></div>
      <hr>
      <div class="kv"><span>SALDO ANTERIOR:</span><span>${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      <div class="kv"><span>PAGO:</span><span class="bold">${sym}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      <div class="kv"><span>MÉTODO:</span><span>Efectivo</span></div>
      ${tipo === 'ABONO' ? `<div class="kv"><span>REF:</span><span>Pago parcial</span></div>` : ''}
      <hr>
      <div class="total-row">SALDO RESTANTE: ${liquidado ? 'LIQUIDADO ✓' : `${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
      ${liquidado ? '<div class="ok">🎉 ¡CUENTA SALDADA!</div>' : ''}
      <div class="footer">${footer}</div>
    </body></html>`;
  };

  const renderTicketContent = () => {
    const isPOS = activeFormatTab === 'pos';

    // Build preview HTML using the same builders as real printing (includes barcode script)
    const printConfig = {
      ...config,
      ticketPaperWidth,
      posPaperWidth,
      printDuplexContract,
      mediaCartaFrontTerms,
      ticketMarginOffset,
      ticketFooterService: ticketFooterService || config.ticketFooterService,
      ticketFooterPOS: ticketFooterPOS || config.ticketFooterPOS,
      termsAndConditionsService: termsService || config.termsAndConditionsService,
      termsAndConditionsPOS: termsPOS || config.termsAndConditionsPOS,
      contractClauses: contractClauses !== undefined ? contractClauses : '',
      showBarcodeOnTicket,
    };
    const isThermalTab = activeFormatTab === 'pos' || activeFormatTab === 'corte' || activeFormatTab === 'apartado' || activeFormatTab === 'fiado-abono' || activeFormatTab === 'fiado-liquidacion' || activeFormatTab === 'recarga';
    let effectiveWidth = hybridPrintMode ? (isThermalTab ? posPaperWidth : ticketPaperWidth) : ticketPaperWidth;
    if (isThermalTab && (effectiveWidth === 'media-carta' || effectiveWidth === 'media-carta-duplicado')) {
      effectiveWidth = posPaperWidth && posPaperWidth !== 'media-carta' && posPaperWidth !== 'media-carta-duplicado' ? posPaperWidth : '80mm';
    }
    const isMediaCarta = effectiveWidth === 'media-carta' || effectiveWidth === 'media-carta-duplicado';
    const iframeWidth = effectiveWidth === '58mm' ? '230px' : isMediaCarta ? '816px' : '310px';

    if (activeFormatTab === 'service') {
      const mockOrder = {
        id: 'ORD-PREVIEW',
        customerName: 'Hugo García',
        customerPhone: '3511574876',
        customerCountryCode: '+52',
        deviceBrand: 'Motorola',
        deviceModel: 'Edge 40 Pro',
        deviceType: 'Phone' as const,
        deviceModelNumber: 'XT2301-5',
        devicePin: '',
        faultDescription: 'No enciende / Se mojó',
        serviceType: 'Baño Químico + IC',
        diagnosticsNote: '',
        assignedTechnician: 'Técnico de Turno',
        cost: 1150,
        advancePayment: 300,
        advancePaymentBreakdown: [{ method: 'Efectivo', amount: 300 }],
        createdAt: new Date().toISOString(),
        estimatedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        status: 'Pendiente' as const,
        isPaid: false,
      };
      const contractPage = ((hybridPrintMode || ticketPaperWidth === 'media-carta' || ticketPaperWidth === 'media-carta-duplicado') && !mediaCartaFrontTerms) ? serviceContractPage : undefined;
      const mockHtml = buildTicketHtml(mockOrder as any, printConfig, contractPage);
      return (
        <iframe
          key={`preview-servicio-${contractPage ?? 'default'}`}
          srcDoc={mockHtml}
          scrolling="no"
          onLoad={e => {
            const f = e.currentTarget;
            try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {}
          }}
          style={{ width: iframeWidth, height: '680px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa ticket de servicio"
        />
      );
    }

    if (activeFormatTab === 'pos') {
      const mockSale = posPreviewVariant === 'mixed'
        ? { id: 'POS-PREVIEW', createdAt: new Date().toISOString(), paymentMethod: 'Efectivo', total: 880,
            cashReceived: 1000,
            change: 120,
            items: [
              { description: 'Mica de Privacidad Gel 9D', quantity: 1, price: 150 },
              { description: 'Hub Multi-puerto USB-C', quantity: 1, price: 450 },
              { description: 'Funda Silicón Premium', quantity: 2, price: 140 },
            ] }
        : { id: 'POS-PREVIEW', createdAt: new Date().toISOString(), paymentMethod: 'Efectivo', total: 740,
            cashReceived: 1000,
            change: 260,
            items: [
              { description: 'Mica de Privacidad Gel 9D', quantity: 1, price: 150 },
              { description: 'Hub Multi-puerto USB-C', quantity: 1, price: 450 },
              { description: 'Funda Silicón Premium', quantity: 1, price: 140 },
            ] };
      const posHtml = buildPosTicketHtml(mockSale, printConfig);
      return (
        <iframe
          key="preview-pos"
          srcDoc={posHtml}
          scrolling="no"
          onLoad={e => {
            const f = e.currentTarget;
            try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {}
          }}
          style={{ width: iframeWidth, height: '600px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa ticket POS"
        />
      );
    }

    if (activeFormatTab === 'recarga') {
      const mockRecharge = {
        id: 'E-0005',
        createdAt: new Date().toISOString(),
        paymentMethod: 'Efectivo',
        total: 13,
        cashReceived: 50,
        change: 37,
        confirmationCode: 'Folio Aut: 865694 | Ref: TX-789330349',
        createdBy: 'Hugo García',
        items: [
          { itemId: 'recharge-telcel', name: 'Telcel Tiempo Aire $10 ((351) 157-4876)', description: 'Telcel Tiempo Aire $10 ((351) 157-4876)', quantity: 1, price: 10 },
          { itemId: 'recharge-commission', name: 'Comisión de Recarga / Pago de Servicio', description: 'Comisión de Recarga / Pago de Servicio', quantity: 1, price: 3 }
        ]
      };
      const rechargeHtml = buildRechargeTicketHtml(mockRecharge as any, printConfig);
      return (
        <iframe
          key="preview-recarga"
          srcDoc={rechargeHtml}
          scrolling="no"
          onLoad={e => {
            const f = e.currentTarget;
            try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {}
          }}
          style={{ width: iframeWidth, height: '600px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa ticket de recarga"
        />
      );
    }

    const mockOrderEntry = {
      id: 'TKT-539', batchId: '', customerName: 'Hugo García', customerPhone: '3511574876', customerCountryCode: '+52',
      deviceBrand: 'Samsung', deviceModel: 'S25', deviceType: 'Phone' as const, deviceModelNumber: '', devicePin: '',
      faultDescription: 'Batería', serviceType: 'Cambio de Batería', diagnosticsNote: '', assignedTechnician: '',
      cost: 800, advancePayment: servicePreviewVariant === 'with-anticipo' ? 200 : 0, advancePaymentBreakdown: servicePreviewVariant === 'with-anticipo' ? [{ method: 'Efectivo', amount: 200 }] : [],
      createdAt: new Date().toISOString(), estimatedDeliveryDate: new Date(Date.now() + 3*86400000).toISOString(),
      status: 'En Reparación' as const, isPaid: false,
    };
    const mockBatchOrders = [
      { ...mockOrderEntry, id: 'TKT-539', batchId: 'BATCH-1780433214783', deviceModel: 'S25', serviceType: 'Cambio de Batería', batchAdvancePayment: servicePreviewVariant === 'with-anticipo' ? 300 : 0 },
      { ...mockOrderEntry, id: 'TKT-540', batchId: 'BATCH-1780433214783', deviceBrand: 'Apple', deviceModel: 'iPhone 14', serviceType: 'Cambio de Pantalla', batchAdvancePayment: servicePreviewVariant === 'with-anticipo' ? 300 : 0 },
    ];

    if (activeFormatTab === 'entry') {
      const entryHtml = buildEntryTicketHtml(mockOrderEntry as any, printConfig);
      return (
        <iframe key="preview-entry" srcDoc={entryHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '500px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante de recepción" />
      );
    }

    if (activeFormatTab === 'entry-warranty') {
      const mockOrderEntryWarranty = {
        ...mockOrderEntry,
        id: 'TKT-539-G',
        cost: 0,
        advancePayment: 0,
        advancePaymentBreakdown: [],
        faultDescription: 'GARANTÍA — Batería no retiene carga',
        serviceType: 'GARANTÍA — CAMBIO DE BATERÍA',
        warrantyOf: 'TKT-311',
      };
      const entryWarrantyHtml = buildEntryTicketHtml(mockOrderEntryWarranty as any, printConfig);
      return (
        <iframe key="preview-entry-warranty" srcDoc={entryWarrantyHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '500px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante de recepción por garantía" />
      );
    }

    if (activeFormatTab === 'entry-batch') {
      const batchEntryHtml = buildBatchEntryTicketHtml(mockBatchOrders as any, printConfig);
      return (
        <iframe key="preview-entry-batch" srcDoc={batchEntryHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '560px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante grupal de recepción" />
      );
    }

    if (activeFormatTab === 'service-batch') {
      const batchContractPage = (hybridPrintMode || ticketPaperWidth === 'media-carta' || ticketPaperWidth === 'media-carta-duplicado') ? serviceContractPage : undefined;
      const consolidatedHtml = buildConsolidatedTicketHtml(mockBatchOrders as any, printConfig, batchContractPage);
      return (
        <iframe key={`preview-service-batch-${batchContractPage ?? 'default'}`} srcDoc={consolidatedHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '700px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa ticket de servicio grupal" />
      );
    }

    if (activeFormatTab === 'delivery') {
      const sym = printConfig.currencySymbol || '$';
      const paperWidth = ticketPaperWidth;
      const footer = printConfig.ticketFooterService || printConfig.ticketFooter || '¡Gracias por su preferencia!';
      const policies = printConfig.termsAndConditionsService || printConfig.termsAndConditions || '';
      const offset = printConfig.ticketMarginOffset || 0;
      const is58 = paperWidth === '58mm';
      const isMediaCarta = paperWidth === 'media-carta';
      const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
      const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
      const pageSizeCss = isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
      const pageMarginCss = isMediaCarta ? '6mm 8mm' : '2mm 1mm';
      const deliveryHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : isMediaCarta ? '14' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px); color: #000; background: #fff; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 900; text-align: center; font-size: 12px; background: #000; color: #fff; padding: 1px 0; margin: 3px 0; }
  .total-line { display:flex; justify-content:space-between; font-size:13px; font-weight:900; margin-top:6px; padding:5px 4px; background:#000; color:#fff; letter-spacing:0.5px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
  .policies { font-size: 10px; font-weight: 700; text-align: center; color: #000; margin-top: 3px; }
</style></head><body>
  ${buildTicketHeaderHtml(printConfig, paperWidth)}
  <hr>
  <span class="badge">COMPROBANTE DE ENTREGA</span>
  <div class="kv"><span>ORDEN:</span><span class="kv-val">TKT-311</span></div>
  <div class="kv"><span>FECHA:</span><span class="kv-val">${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="kv-val">HUGO GARCIA</span></div>
  <div class="kv"><span>TEL:</span><span class="kv-val">(351) 157-4876</span></div>
  <hr>
  <div class="kv"><span>EQUIPO:</span><span class="kv-val">SAMSUNG S25</span></div>
  <div class="kv"><span>SERVICIO:</span><span class="kv-val">CAMBIO DE BATERÍA</span></div>
  <hr>
  <div class="kv"><span>COSTO TOTAL:</span><span class="kv-val">${sym}800.00</span></div>
  <div class="kv"><span>ANTICIPO:</span><span class="kv-val">${sym}200.00</span></div>
  <div class="total-line"><span>COBRADO:</span><span>${sym}600.00</span></div>
  <div class="kv"><span>Efectivo:</span><span class="kv-val">${sym}700.00</span></div>
  <div class="kv"><span>Cambio:</span><span class="kv-val">${sym}100.00</span></div>
  ${policies ? `<hr><div class="policies">${policies}</div>` : ''}
  <div class="footer">${footer}</div>
</body></html>`;
      return (
        <iframe key="preview-delivery" srcDoc={deliveryHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '600px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante de entrega" />
      );
    }

    if (activeFormatTab === 'delivery-warranty') {
      const sym = printConfig.currencySymbol || '$';
      const paperWidth = ticketPaperWidth;
      const footer = printConfig.ticketFooterService || printConfig.ticketFooter || '¡Gracias por su preferencia!';
      const policies = printConfig.termsAndConditionsService || printConfig.termsAndConditions || '';
      const offset = printConfig.ticketMarginOffset || 0;
      const is58 = paperWidth === '58mm';
      const isMediaCarta = paperWidth === 'media-carta';
      const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
      const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
      const pageSizeCss = isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
      const pageMarginCss = isMediaCarta ? '6mm 8mm' : '2mm 1mm';
      const deliveryWarrantyHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : isMediaCarta ? '14' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px); color: #000; background: #fff; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 900; text-align: center; font-size: 12px; background: #000; color: #fff; padding: 1px 0; margin: 3px 0; }
  .total-line { display:flex; justify-content:space-between; font-size:13px; font-weight:900; margin-top:6px; padding:5px 4px; background:#000; color:#fff; letter-spacing:0.5px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
  .policies { font-size: 10px; font-weight: 700; text-align: center; color: #000; margin-top: 3px; }
</style></head><body>
  ${buildTicketHeaderHtml(printConfig, paperWidth)}
  <hr>
  <span class="badge">ENTREGA POR GARANTÍA</span>
  <div class="kv"><span>ORDEN:</span><span class="kv-val">TKT-311-G</span></div>
  <div class="kv"><span>GARANTÍA DE ORDEN:</span><span class="kv-val">TKT-311</span></div>
  <div class="kv"><span>FECHA:</span><span class="kv-val">${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="kv-val">HUGO GARCIA</span></div>
  <div class="kv"><span>TEL:</span><span class="kv-val">(351) 157-4876</span></div>
  <hr>
  <div class="kv"><span>EQUIPO:</span><span class="kv-val">SAMSUNG S25</span></div>
  <div class="kv"><span>SERVICIO:</span><span class="kv-val">GARANTÍA — CAMBIO DE BATERÍA</span></div>
  <hr>
  <div class="kv"><span>COSTO DE SERVICIO:</span><span class="kv-val">${sym}0.00</b></span>
  <div class="total-line"><span>CUBIERTO POR GARANTÍA</span><span>✓</span></div>
  ${policies ? `<hr><div class="policies">${policies}</div>` : ''}
  <div class="footer">${footer}</div>
</body></html>`;
      return (
        <iframe key="preview-delivery-warranty" srcDoc={deliveryWarrantyHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '520px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante de entrega de garantía" />
      );
    }

    if (activeFormatTab === 'delivery-batch') {
      const sym = printConfig.currencySymbol || '$';
      const paperWidth = ticketPaperWidth;
      const footer = printConfig.ticketFooterService || printConfig.ticketFooter || '¡Gracias por su preferencia!';
      const policies = printConfig.termsAndConditionsService || printConfig.termsAndConditions || '';
      const offset = printConfig.ticketMarginOffset || 0;
      const is58 = paperWidth === '58mm';
      const isMediaCarta = paperWidth === 'media-carta';
      const rightPad = isMediaCarta ? '6mm' : (is58 ? '8mm' : '6mm');
      const leftPad = isMediaCarta ? '6mm' : (is58 ? '3mm' : '5mm');
      const pageSizeCss = isMediaCarta ? '216mm 140mm' : `${paperWidth} auto`;
      const pageMarginCss = isMediaCarta ? '6mm 8mm' : '2mm 1mm';
      const deliveryBatchHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : isMediaCarta ? '14' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: 2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px); color: #000; background: #fff; }
  .store { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 1px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
  .kv { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 10px; margin: 1px 0; }
  .kv-val { text-align: right; flex: 1; min-width: 0; word-break: break-word; font-weight: 900; margin-left: 8px; }
  .badge { display: block; font-weight: 900; text-align: center; font-size: 12px; background: #000; color: #fff; padding: 1px 0; margin: 3px 0; }
  .total-line { display:flex; justify-content:space-between; font-size:13px; font-weight:900; margin-top:6px; padding:5px 4px; background:#000; color:#fff; letter-spacing:0.5px; }
  .footer { font-size: 10px; font-weight: 700; text-align: center; margin-top: 5px; }
  .policies { font-size: 10px; font-weight: 700; text-align: center; color: #000; margin-top: 3px; }
</style></head><body>
  ${buildTicketHeaderHtml(printConfig, paperWidth)}
  <hr>
  <span class="badge">COMPROBANTE DE ENTREGA GRUPAL</span>
  <div class="kv"><span>FECHA:</span><span class="kv-val">${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  <div class="kv"><span>CLIENTE:</span><span class="kv-val">HUGO GARCIA</span></div>
  <div class="kv"><span>TEL:</span><span class="kv-val">(351) 157-4876</span></div>
  <hr>
  <div class="kv"><span>SAMSUNG S25</span><span class="kv-val">${sym}800.00</span></div>
  <div class="kv"><span>IPHONE 14 PRO</span><span class="kv-val">${sym}1,200.00</span></div>
  <hr>
  <div class="kv"><span>ANTICIPO TOTAL:</span><span class="kv-val">${sym}500.00</span></div>
  <div class="total-line"><span>COBRADO:</span><span>${sym}1,500.00</span></div>
  <div class="kv"><span>Efectivo:</span><span class="kv-val">${sym}1,600.00</span></div>
  <div class="kv"><span>Cambio:</span><span class="kv-val">${sym}100.00</span></div>
  ${policies ? `<hr><div class="policies">${policies}</div>` : ''}
  <div class="footer">${footer}</div>
</body></html>`;
      return (
        <iframe key="preview-delivery-batch" srcDoc={deliveryBatchHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '650px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa comprobante de entrega grupal" />
      );
    }

    if (activeFormatTab === 'cotizacion') {
      const mockQuote = {
        id: 'COT-001',
        status: 'Pendiente' as const,
        customerName: 'HUGO GARCIA',
        customerPhone: '3511574876',
        customerCountryCode: '+52',
        devices: [
          { deviceBrand: 'APPLE', deviceModel: 'IPHONE 14 PRO', deviceModelNumber: 'A2890', deviceType: 'Phone' as const, devicePin: '', faultDescription: 'PANTALLA ROTA', serviceType: 'CAMBIO DE PANTALLA', estimatedCost: 1200 },
        ],
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: 'PRECIOS SUJETOS A REVISIÓN.',
        createdAt: new Date().toISOString(),
      };
      const quoteHtml = buildQuoteTicketHtml(mockQuote as any, printConfig);
      return (
        <iframe key="preview-cotizacion" srcDoc={quoteHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '700px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa cotización individual" />
      );
    }

    if (activeFormatTab === 'cotizacion-grupal') {
      const mockQuoteGrupal = {
        id: 'COT-002',
        status: 'Pendiente' as const,
        customerName: 'HUGO GARCIA',
        customerPhone: '3511574876',
        customerCountryCode: '+52',
        devices: [
          { deviceBrand: 'APPLE', deviceModel: 'IPHONE 14 PRO', deviceModelNumber: 'A2890', deviceType: 'Phone' as const, devicePin: '', faultDescription: 'PANTALLA ROTA', serviceType: 'CAMBIO DE PANTALLA', estimatedCost: 1200 },
          { deviceBrand: 'SAMSUNG', deviceModel: 'GALAXY S25', deviceModelNumber: '', deviceType: 'Phone' as const, devicePin: '', faultDescription: 'BATERÍA DAÑADA', serviceType: 'CAMBIO DE BATERÍA', estimatedCost: 800 },
          { deviceBrand: 'XIAOMI', deviceModel: 'REDMI NOTE 13', deviceModelNumber: '', deviceType: 'Phone' as const, devicePin: '', faultDescription: 'NO ENCIENDE', serviceType: 'DIAGNÓSTICO Y REPARACIÓN', estimatedCost: 500 },
        ],
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: 'PRECIOS SUJETOS A REVISIÓN. COTIZACIÓN GRUPAL.',
        createdAt: new Date().toISOString(),
      };
      const quoteGrupalHtml = buildQuoteTicketHtml(mockQuoteGrupal as any, printConfig);
      return (
        <iframe key="preview-cotizacion-grupal" srcDoc={quoteGrupalHtml} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '900px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa cotización grupal" />
      );
    }

    if (activeFormatTab === 'fiado-abono') {
      const html = buildFiadoTicketPreview('ABONO');
      return (
        <iframe key="preview-fiado-abono" srcDoc={html} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '500px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa fiado abono" />
      );
    }

    if (activeFormatTab === 'fiado-liquidacion') {
      const html = buildFiadoTicketPreview('LIQUIDACIÓN');
      return (
        <iframe key="preview-fiado-liquidacion" srcDoc={html} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '500px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa fiado liquidación" />
      );
    }

    if (activeFormatTab === 'corte') {
      const sym = config.currencySymbol || '$';
      let pw = hybridPrintMode ? posPaperWidth : ticketPaperWidth;
      if (pw === 'media-carta' || pw === 'media-carta-duplicado') {
        pw = posPaperWidth && posPaperWidth !== 'media-carta' && posPaperWidth !== 'media-carta-duplicado' ? posPaperWidth : '80mm';
      }
      const is58 = pw === '58mm';
      const paperWidth = pw;
      const storeNameUp = (storeName || 'TALLER').toUpperCase();
      const storeInfoParts = [phone, config.address, slogan].filter(Boolean);
      const storeInfoHtml = storeInfoParts.length
        ? `<div style="font-size:9.5px;color:#000;font-weight:700;line-height:1.4;margin-top:2px">${storeInfoParts.join('<br>')}</div>`
        : '';
      const logoSrc = config.ticketLogoUrl || '';
      const logoHtml = logoSrc
        ? `<img src="${logoSrc}" style="max-width:100%;max-height:${is58 ? '15' : '20'}mm;object-fit:contain;display:block;margin:0 auto 3px auto;" />`
        : '';
      const cp = {
        id: 'CORTE-123456',
        date: new Date().toLocaleDateString('es-MX'),
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        startingCash: 500,
        totals: { pos: 3200, servicio: 1800, entradas: 5500, salidas: 200, neto: 5300 },
        denominations: { b1000: 4, b500: 1, b200: 1, b100: 2, b50: 1, b20: 2, m20: 1, m10: 2, m5: 1, m2: 1, m1: 0, m05: 1, monedasTotal: 47.5 },
        fisico: 5347.5, estimado: 5300, diferencia: 47.5,
      };
      const resultadoIcon = cp.diferencia === 0 ? '✓ CUADRADO EXACTO' : cp.diferencia > 0 ? `▲ SOBRANTE +${sym}${Math.abs(cp.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `▼ FALTANTE -${sym}${Math.abs(cp.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const rowH = (lbl: string, val: string) => `<div class="row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`;
      const denoms = [
        { label: '$1000', q: cp.denominations.b1000, val: cp.denominations.b1000 * 1000 },
        { label: '$500',  q: cp.denominations.b500,  val: cp.denominations.b500 * 500 },
        { label: '$200',  q: cp.denominations.b200,  val: cp.denominations.b200 * 200 },
        { label: '$100',  q: cp.denominations.b100,  val: cp.denominations.b100 * 100 },
        { label: '$50',   q: cp.denominations.b50,   val: cp.denominations.b50 * 50 },
        { label: '$20',   q: cp.denominations.b20,   val: cp.denominations.b20 * 20 },
      ].filter(d => d.q > 0);
      let denomRows = '<table style="width:100%; border-collapse:collapse; font-size: inherit; font-weight: inherit; color: inherit; margin: 2px 0;"><tbody>';
      denomRows += denoms.map(d =>
        `<tr style="line-height: 1.35;">` +
          `<td style="text-align: left; width: 45%; padding: 2.5px 0; font-weight: inherit;">${d.label}</td>` +
          `<td style="text-align: left; width: 20%; padding: 2.5px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${d.q}</td>` +
          `<td style="text-align: right; width: 35%; padding: 2.5px 0; font-weight: inherit;">${sym}${d.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>` +
        `</tr>`
      ).join('');
      denomRows += '</tbody></table>';

      const hasBilletes = denoms.length > 0;
      const billetesHtml = hasBilletes ? `
<div style="font-size: ${is58 ? '9px' : '10px'}; font-weight: 900; text-align: left; margin: 5px 0 2px 0; border-bottom: 1px dashed #000; padding-bottom: 1px;">BILLETES</div>
${denomRows}
` : '';

      const coins = [
        { label: '$20',   q: (cp.denominations as any).m20 || 0,   val: ((cp.denominations as any).m20 || 0) * 20 },
        { label: '$10',   q: (cp.denominations as any).m10 || 0,   val: ((cp.denominations as any).m10 || 0) * 10 },
        { label: '$5',    q: (cp.denominations as any).m5 || 0,    val: ((cp.denominations as any).m5 || 0) * 5 },
        { label: '$2',    q: (cp.denominations as any).m2 || 0,    val: ((cp.denominations as any).m2 || 0) * 2 },
        { label: '$1',    q: (cp.denominations as any).m1 || 0,    val: ((cp.denominations as any).m1 || 0) * 1 },
        { label: '$0.50', q: (cp.denominations as any).m05 || 0,  val: ((cp.denominations as any).m05 || 0) * 0.5 },
      ].filter(c => c.q > 0);

      const hasCoinsDetail = coins.length > 0;
      let coinsRows = '';
      if (hasCoinsDetail) {
        coinsRows = '<table style="width:100%; border-collapse:collapse; font-size: inherit; font-weight: inherit; color: inherit; margin: 2px 0;"><tbody>';
        coinsRows += coins.map(c =>
          `<tr style="line-height: 1.35;">` +
            `<td style="text-align: left; width: 45%; padding: 2.5px 0; font-weight: inherit;">${c.label}</td>` +
            `<td style="text-align: left; width: 20%; padding: 2.5px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${c.q}</td>` +
            `<td style="text-align: right; width: 35%; padding: 2.5px 0; font-weight: inherit;">${sym}${c.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>` +
          `</tr>`
        ).join('');
        coinsRows += '</tbody></table>';
      } else {
        coinsRows = `
<table style="width:100%; border-collapse:collapse; font-size: inherit; font-weight: inherit; color: inherit; margin: 2px 0;">
  <tbody>
    <tr style="line-height: 1.35;">
      <td style="text-align: left; width: 65%; padding: 2.5px 0; font-weight: inherit;">Total en monedas:</td>
      <td style="text-align: right; width: 35%; padding: 2.5px 0; font-weight: inherit;">${sym}${cp.denominations.monedasTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>`;
      }

      const monedasHtml = cp.denominations.monedasTotal > 0 ? `
<div style="font-size: ${is58 ? '9px' : '10px'}; font-weight: 900; text-align: left; margin: 6px 0 2px 0; border-bottom: 1px dashed #000; padding-bottom: 1px;">MONEDAS</div>
${coinsRows}
` : '';
      const footerTxt = config.ticketFooter || '¡Gracias por su preferencia!';
      const offset = printConfig.ticketMarginOffset || 0;
      const rightPad = is58 ? '4mm' : '6mm';
      const leftPad = is58 ? '3mm' : '5mm';
      const bottomPad = is58 ? '2mm' : '4mm';
      const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
@page { size: ${paperWidth} auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; padding: 0 calc(${rightPad} - ${offset}px) ${bottomPad} calc(${leftPad} + ${offset}px); color: #000; background: #fff; overflow-wrap: break-word; word-break: break-word; }
.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
.section-badge { display: block; font-weight: 900; text-align: center; font-size: ${is58 ? '9' : '11'}px; background: #000; color: #fff; padding: 2px 0; margin: 3px 0; letter-spacing: 1px; }
.section-title { font-weight: 900; text-align: center; font-size: ${is58 ? '9' : '10'}px; margin: 3px 0 2px 0; text-decoration: underline; }
.row { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: ${is58 ? '10' : '12'}px; margin: 2px 0; line-height: 1.3; }
.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }
.val { text-align: right; flex: 1; min-width: 0; }
.total-line { display: flex; justify-content: space-between; font-size: ${is58 ? '13' : '15'}px; font-weight: 900; margin-top: 6px; padding: 5px 4px; background: #000; color: #fff; letter-spacing: 0.5px; }
.result-line { display: flex; justify-content: center; align-items: center; font-size: ${is58 ? '11' : '13'}px; font-weight: 900; margin: 4px 0; padding: 4px; background: #000; color: #fff; letter-spacing: 0.5px; }
.footer-text { font-size: ${is58 ? '8.5' : '9.5'}px; text-align: center; font-weight: 700; margin: 2px 0; }
</style>
</head><body>
<div style="text-align:center;margin-bottom:4px">
  ${logoHtml}
  <div style="font-size:15px;font-weight:900;letter-spacing:1px;line-height:1.1">${storeNameUp}</div>
  ${storeInfoHtml}
</div>
<hr class="sep">
<div class="section-badge">CORTE DE CAJA</div>
${rowH('Sesión:', '#12')}
${rowH('Folio:', cp.id)}
${rowH('Fecha:', formatDateToDMY(cp.date))}
${rowH('Hora:', cp.time)}
${rowH('Operador:', 'Hugo García')}
<hr class="sep">
<div class="section-title">MOVIMIENTOS DE CAJA</div>
${rowH('Fondo inicial:', `${sym}${cp.startingCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
${rowH('Ventas efectivo:', `${sym}${cp.totals.pos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
${rowH('Servicios:', `${sym}${cp.totals.servicio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
${rowH('Salidas:', `-${sym}${cp.totals.salidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
<div class="total-line"><span>ESPERADO EN CAJA:</span><span>${sym}${cp.estimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
<hr class="sep">
<div class="section-title">CONTEO DE EFECTIVO</div>
${billetesHtml}
${monedasHtml}
<div class="total-line"><span>TOTAL CONTADO:</span><span>${sym}${cp.fisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
<hr class="sep">
<div class="result-line">${resultadoIcon}</div>
<hr class="sep">
<div id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>
<hr class="sep">
<div class="footer-text">${footerTxt}</div>
<script>
(function(){
  var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
  var START_B=104,STOP=106;
  function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}
  function draw(text){
    var codes=encode(text);var bw=1.5,h=40,x=10,bars=[];
    for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}
    var tw=x+10;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+tw+' '+h+'" style="display:block;width:100%;height:auto">';
    for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black"/>';}
    svg+='</svg>';
    document.getElementById('bc').innerHTML=svg;
  }
  draw('CORTE-123456');
})();
<\/script>
</body></html>`;
      return (
        <iframe key={`preview-corte-${paperWidth}`} srcDoc={html} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '600px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa corte de caja" />
      );
    }

    if (activeFormatTab === 'apartado') {
      const sym = config.currencySymbol || '$';
      let pw = hybridPrintMode ? posPaperWidth : ticketPaperWidth;
      if (pw === 'media-carta' || pw === 'media-carta-duplicado') {
        pw = posPaperWidth && posPaperWidth !== 'media-carta' && posPaperWidth !== 'media-carta-duplicado' ? posPaperWidth : '80mm';
      }
      const is58 = pw === '58mm';
      const paperWidth = pw;
      const storeNameUp = (storeName || 'TALLER').toUpperCase();
      const storeInfoParts = [phone, config.address, slogan].filter(Boolean);
      const storeInfoHtml = storeInfoParts.length
        ? `<div style="font-size:9.5px;color:#000;font-weight:700;line-height:1.4;margin-top:2px">${storeInfoParts.join('<br>')}</div>`
        : '';
      const logoSrc = config.ticketLogoUrl || '';
      const logoHtml = logoSrc
        ? `<img src="${logoSrc}" style="max-width:100%;max-height:${is58 ? '15' : '20'}mm;object-fit:contain;display:block;margin:0 auto 3px auto;" />`
        : '';
      const footerTxt = config.ticketFooter || '¡Gracias por su preferencia!';
      const ap = {
        id: 'APT-A1B2C3',
        clientName: 'HUGO GARCÍA',
        clientPhone: '(351) 123-4567',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
        items: [
          { name: 'iPhone 15 Pro Max 256GB', price: 24999, quantity: 1 },
          { name: 'Funda Silicon Premium',   price: 350,   quantity: 1 },
        ],
        totalValue: 25349,
        payments: [{ id: 'p1', date: new Date().toISOString(), amount: 5000, method: 'Efectivo' as const }],
        status: 'Activo' as const,
      };
      const totalPaid = ap.payments.reduce((s, p) => s + p.amount, 0);
      const balance = ap.totalValue - totalPaid;
      const rowH = (l: string, v: string) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`;
      const itemRows = ap.items.map(i =>
        `<div class="row"><span class="lbl">${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}</span><span class="val">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
      ).join('');
      const offset = printConfig.ticketMarginOffset || 0;
      const sidePad = is58 ? '1mm' : '2mm';
      const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
@page { size: ${paperWidth} auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; padding: 0 calc(${sidePad} - ${offset}px) 1mm calc(${sidePad} + ${offset}px); color: #000; background: #fff; overflow-wrap: break-word; word-break: break-word; }
.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }
.section-badge { display: block; font-weight: 900; text-align: center; font-size: ${is58 ? '9' : '11'}px; background: #000; color: #fff; padding: 2px 0; margin: 3px 0; letter-spacing: 1px; }
.section-title { font-weight: 900; text-align: center; font-size: ${is58 ? '9' : '10'}px; margin: 3px 0 2px 0; text-decoration: underline; }
.row { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: ${is58 ? '10' : '12'}px; margin: 2px 0; line-height: 1.3; }
.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }
.val { text-align: right; flex: 1; min-width: 0; }
.total-line { display: flex; justify-content: space-between; font-size: ${is58 ? '13' : '15'}px; font-weight: 900; margin-top: 6px; padding: 5px 4px; background: #000; color: #fff; letter-spacing: 0.5px; }
.status-line { display: flex; justify-content: center; font-size: ${is58 ? '9' : '10'}px; font-weight: 900; margin: 4px 0; padding: 3px; border: 2px solid #000; letter-spacing: 1px; }
.footer-text { font-size: ${is58 ? '10' : '11'}px; text-align: center; font-weight: 700; margin: 2px 0; }
</style>
</head><body>
<div style="text-align:center;margin-bottom:4px">
  ${logoHtml}
  <div style="font-size:15px;font-weight:900;letter-spacing:1px;line-height:1.1">${storeNameUp}</div>
  ${storeInfoHtml}
</div>
<hr class="sep">
<div class="section-badge">📦 PRODUCTO APARTADO</div>
${rowH('Folio:', ap.id)}
${rowH('Fecha:', new Date(ap.createdAt).toLocaleDateString('es-MX'))}
${rowH('Vence:', new Date(ap.dueDate!).toLocaleDateString('es-MX'))}
<hr class="sep">
<div class="section-title">CLIENTE</div>
${rowH('Nombre:', ap.clientName)}
${rowH('Tel:', ap.clientPhone!)}
<hr class="sep">
<div class="section-title">ARTÍCULOS APARTADOS</div>
${itemRows}
<div class="total-line"><span>TOTAL:</span><span>${sym}${ap.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
<hr class="sep">
<div class="section-title">ESTADO DE PAGO</div>
${rowH('Anticipo pagado:', `${sym}${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
<div class="total-line" style="background:#dc2626"><span>SALDO PENDIENTE:</span><span>${sym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
<hr class="sep">
<div class="status-line">⏳ APARTADO — NO DISPONIBLE PARA VENTA</div>
<hr class="sep">
<div id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>
<hr class="sep">
<div class="footer-text">${footerTxt}</div>
<script>
(function(){
  var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
  var START_B=104,STOP=106;
  function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}
  function draw(text){var codes=encode(text);var bw=1.5,h=40,x=10,bars=[];for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}var tw=x+10;var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+tw+' '+h+'" style="display:block;width:100%;height:auto">';for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black"/>';}svg+='</svg>';document.getElementById('bc').innerHTML=svg;}
  draw('APT-A1B2C3');
})();
<\/script>
</body></html>`;
      return (
        <iframe key={`preview-apartado-${paperWidth}`} srcDoc={html} scrolling="no"
          onLoad={e => { const f = e.currentTarget; try { f.style.height = f.contentDocument!.body.scrollHeight + 8 + 'px'; } catch (_) {} }}
          style={{ width: iframeWidth, height: '600px', border: 'none', background: 'white', display: 'block' }}
          title="Vista previa ticket apartado" />
      );
    }

    const templateStr = isPOS ? ticketTemplatePOS : ticketTemplateService;

    const defaultData: Record<string, string> = {
      '{TIENDA}': storeName || 'SOPORTE TÉCNICO',
      '{SLOGAN}': slogan || 'REPARACIONES & ACCESORIOS',
      '{FECHA}': new Date().toLocaleDateString('es-MX'),
      '{TELEFONO}': formatPhoneNumber(phone) || '(555) 000-0192',
      '{ORDEN}': isPOS ? '#POS-10492' : '#ORD-2875',
      '{CLIENTE}': isPOS ? 'Público General' : 'Hugo García',
      '{LEYENDA_PIE}': isPOS ? (ticketFooterPOS || '¡Gracias por su compra!') : (ticketFooterService || '¡Garantía de servicio!'),
      '{POLITICAS}': isPOS ? (termsPOS || 'Términos de servicio de POS.') : (termsService || 'Políticas de taller autorizadas.'),
    };

    // Bloques específicos para tags detallados
    const itemsList = [
      { qty: 1, description: 'Mica de Privacidad Gel 9D', price: 150.0 },
      { qty: 1, description: 'Hub Multi-puerto USB-C', price: 450.0 },
    ];
    let itemsStr = '';
    itemsList.forEach((item) => {
      const q = `${item.qty}x `;
      const desc = item.description.substring(0, 18).padEnd(18);
      const pr = `${currencySymbol}${(item.price * item.qty).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      itemsStr += `${q}${desc} ${pr}\n`;
    });
    defaultData['{DETALLE_MOSTRADOR}'] = itemsStr.trim();

    let calcStr = `SUBTOTAL:   ${currencySymbol}517.24\n`;
    calcStr += `I.V.A (16%): ${currencySymbol}82.76\n`;
    calcStr += `TOTAL NETO: ${currencySymbol}600.00`;
    defaultData['{DESGLOSE_PAGOS}'] = calcStr;

    defaultData['{DATOS_CLIENTE}'] = `CLIENTE: HUGO GARCÍA\nTELÉFONO: (555) 000-0192`;
    defaultData['{DATOS_EQUIPO}'] = `EQUIPO: SMARTPHONE\nMARCA/MOD: MOTOROLA EDGE 40\nPIN/BLOQUEO: 4912`;

    let repairDetailsStr = `FALLA EXP: NO ENCIENDE / SE MOJÓ\nSERVICIO: BAÑO QUÍMICO + IC\n`;
    repairDetailsStr += `COSTO TOTAL: ${currencySymbol}1,150.00\n`;
    repairDetailsStr += `ANTICIPO:   -${currencySymbol}300.00\n`;
    repairDetailsStr += `SALDO REST:  ${currencySymbol}850.00`;
    defaultData['{FALLA_Y_COTIZACION}'] = repairDetailsStr;
    defaultData['{FALLA_SERVICIO}'] = repairDetailsStr;

    // Tags individuales para preset "Orden de Trabajo ★"
    defaultData['{NOM_CLIENTE}'] = 'HUGO GARCÍA';
    defaultData['{TEL_CLIENTE}'] = '(351) 157-4876';
    defaultData['{MARCA}'] = 'MOTOROLA';
    defaultData['{MODELO}'] = 'EDGE 40 PRO';
    defaultData['{TIPO}'] = 'CELULAR';
    defaultData['{NO_MODELO}'] = 'XT2303-1';
    defaultData['{PROBLEMA}'] = 'NO ENCIENDE / SE MOJÓ';
    defaultData['{ACCESO}'] = '4912';
    defaultData['{SERVICIO}'] = 'BAÑO QUÍMICO + IC';
    defaultData['{TECNICO}'] = 'TÉCNICO DE TURNO';
    defaultData['{ENTREGA}'] = new Date(Date.now() + 3 * 86400000).toLocaleDateString('es-MX');
    defaultData['{COSTO}'] = `${currencySymbol}1,150.00`;
    defaultData['{ANTICIPO}'] = `${currencySymbol}300.00`;
    defaultData['{SALDO}'] = `${currencySymbol}850.00`;

    // Comprobar si ticketTemplate es JSON
    let isJson = false;
    let canvasElements: StickerElement[] = [];
    try {
      const trimmed = templateStr.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        canvasElements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
        isJson = true;
      }
    } catch (e) {
      // fallback
    }

    if (isJson) {
      const maxElementY = canvasElements.reduce((m, el) => Math.max(m, el.y || 0), 100);
      const computedHeight = maxElementY * 4.2 + 95;

      return (
        <div 
          style={{ position: 'relative', height: `${computedHeight}px`, width: '100%', minHeight: '340px' }}
          className="w-full text-zinc-950 font-mono text-[8.5px] select-text transition-all duration-300"
        >
          {/* Logo en la parte superior si existe */}
          <div className="absolute top-2 w-full flex flex-col items-center select-none pb-2 z-10">
            {ticketLogoUrl ? (
              <img
                src={ticketLogoUrl}
                alt="Logo Ticket"
                className="w-10 h-10 object-cover rounded-xl border border-zinc-300 mb-1 logo-highres"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl border border-dashed border-zinc-400 bg-zinc-100/80 flex items-center justify-center text-zinc-500 text-[8px] mb-1">
                [Logo]
              </div>
            )}
          </div>

          {canvasElements.map((elem) => {
            let displayVal = elem.text || '';
            Object.keys(defaultData).forEach((key) => {
              if (displayVal.includes(key)) {
                displayVal = displayVal.replace(new RegExp(key, 'g'), defaultData[key]);
              }
            });

            if (elem.type === 'line') {
              const isVertical = elem.orientation === 'vertical';
              return (
                <div
                  key={elem.id}
                  className="absolute"
                  style={{
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`, // Desplazar abajo para dejar espacio al logotipo
                    width: isVertical ? '1.5px' : `${elem.width || 90}%`,
                    height: isVertical ? `${elem.height || 30}%` : '1px',
                    borderTop: isVertical ? 'none' : '1px dashed #4b5563',
                    borderLeft: isVertical ? '1px dashed #4b5563' : 'none',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                />
              );
            }

            if (elem.type === 'rect') {
              return (
                <div
                  key={elem.id}
                  className="absolute"
                  style={{
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    width: `${elem.width || 45}%`,
                    height: `${elem.height || 35}%`,
                    border: '1px solid #4b5563',
                    borderRadius: '2px',
                    zIndex: 10,
                  }}
                />
              );
            }

            // DETALLES COMPLEJOS CON RENDER PERSONALIZADO EN VISTA DE PRUEBA
            if (displayVal.includes('{DETALLE_MOSTRADOR}')) {
              return (
                <div
                  key={elem.id}
                  style={{
                    position: 'absolute',
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    fontSize: '8px',
                    width: '90%',
                    transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                    zIndex: 10,
                  }}
                  className="bg-white/95 p-1 border border-zinc-300 rounded text-left space-y-0.5 leading-tight"
                >
                  <span className="text-[7.5px] uppercase font-bold text-emerald-600 tracking-wide block">🛍️ [DETALLE DE ARTÍCULOS]</span>
                  <div className="flex justify-between font-bold"><span>1x Mica Privacidad Gel 9D</span><span>{currencySymbol}150.00</span></div>
                  <div className="flex justify-between font-bold"><span>1x Hub Multi-puert USB-C</span><span>{currencySymbol}450.00</span></div>
                </div>
              );
            }

            if (displayVal.includes('{DESGLOSE_PAGOS}')) {
              return (
                <div
                  key={elem.id}
                  style={{
                    position: 'absolute',
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    fontSize: '8px',
                    width: '90%',
                    transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                    zIndex: 10,
                  }}
                  className="bg-white/95 p-1 border border-zinc-300 rounded text-left space-y-0.5 leading-tight"
                >
                  <span className="text-[7.5px] uppercase font-bold text-emerald-600 block">📊 [MATRIZ DE PAGO & IMPUESTOS]</span>
                  <div className="flex justify-between"><span>SUBTOTAL (Neto):</span><span>{currencySymbol}517.24</span></div>
                  <div className="flex justify-between"><span>I.V.A (16%):</span><span>{currencySymbol}82.76</span></div>
                  <div className="flex justify-between font-black text-black border-t border-zinc-300 mt-1 pt-0.5"><span>TOTAL PAGADO:</span><span>{currencySymbol}600.00</span></div>
                </div>
              );
            }

            if (displayVal.includes('{DATOS_CLIENTE}')) {
              return (
                <div
                  key={elem.id}
                  style={{
                    position: 'absolute',
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    fontSize: '8px',
                    width: '90%',
                    transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                    zIndex: 10,
                  }}
                  className="bg-white/95 p-1 border border-zinc-300 rounded text-left space-y-0.5 leading-tight"
                >
                  <span className="text-[7.5px] uppercase font-bold text-blue-600 block border-b pb-0.5 mb-1">👤 1. DATOS DEL CLIENTE</span>
                  <div>CLIENTE: HUGO GARCÍA</div>
                  <div>TELÉFONO: (551) 234-5678</div>
                </div>
              );
            }

            if (displayVal.includes('{DATOS_EQUIPO}')) {
              return (
                <div
                  key={elem.id}
                  style={{
                    position: 'absolute',
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    fontSize: '8px',
                    width: '90%',
                    transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                    zIndex: 10,
                  }}
                  className="bg-white/95 p-1 border border-zinc-300 rounded text-left space-y-0.5 leading-tight"
                >
                  <span className="text-[7.5px] uppercase font-bold text-red-650 block border-b pb-0.5 mb-1">📱 2. DATOS DEL DISPOSITIVO</span>
                  <div>EQUIPO: MOTOROLA EDGE 40</div>
                  <div>Nº SERIE: ME-4019284</div>
                  <div className="flex justify-between text-zinc-500"><span>PIN:</span><span className="font-bold bg-zinc-200 px-1 rounded text-black">4912</span></div>
                </div>
              );
            }

            if (displayVal.includes('{FALLA_Y_COTIZACION}') || displayVal.includes('{FALLA_SERVICIO}')) {
              return (
                <div
                  key={elem.id}
                  style={{
                    position: 'absolute',
                    left: `${elem.x}%`,
                    top: `${elem.y * 4.2 + 52}px`,
                    fontSize: '7.5px',
                    width: '90%',
                    transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none',
                    zIndex: 10,
                  }}
                  className="bg-white/95 p-1 border border-[#ccbfa3] rounded text-left space-y-1.5 leading-tight"
                >
                  <span className="text-[7px] uppercase font-bold text-emerald-600 block border-b pb-0.5">⚙️ 3. FALLA, REPARACIÓN & ABONOS</span>
                  <div className="bg-zinc-150 p-1 text-[6.5px] italic text-zinc-800">Causa: No enciende / Mojado - Servicio: Baño Químico + IC</div>
                  <div className="flex justify-between font-bold"><span>REPARACIÓN:</span><span>{currencySymbol}1,150.00</span></div>
                  <div className="flex justify-between text-emerald-600 font-bold"><span>DESCUENTO/ABONO:</span><span>-{currencySymbol}300.00</span></div>
                  <div className="flex justify-between text-red-600 font-extrabold border-t border-dotted pt-0.5"><span>SALDO SE RECIBE:</span><span>{currencySymbol}850.00</span></div>
                </div>
              );
            }

            // Alinear
            let alignmentStyles: React.CSSProperties = {};
            if (elem.align === 'center') {
              alignmentStyles = {
                left: `${elem.x}%`,
                transform: 'translateX(-50%)',
                textAlign: 'center',
              };
            } else if (elem.align === 'right') {
              alignmentStyles = {
                left: `${elem.x}%`,
                transform: 'translateX(-100%)',
                textAlign: 'right',
              };
            } else {
              alignmentStyles = {
                left: `${elem.x}%`,
                textAlign: 'left',
              };
            }

            return (
              <div
                key={elem.id}
                className={`absolute break-words select-text whitespace-pre-line leading-normal ${
                  elem.inverted ? 'bg-zinc-950 text-white px-1.5 py-0.5 rounded text-center inline-block max-w-full font-bold shadow-sm' : ''
                }`}
                style={{
                  top: `${elem.y * 4.2 + 52}px`,
                  fontSize: `${(elem.fontSize || 9) * 0.95}px`,
                  fontWeight: elem.fontWeight === 'bolder' ? '900' : elem.fontWeight === 'bold' ? '700' : '500',
                  pointerEvents: 'none',
                  width: '90%',
                  maxWidth: '100%',
                  zIndex: 10,
                  ...alignmentStyles,
                }}
              >
                {displayVal}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="p-4 text-center text-zinc-500 font-bold uppercase text-[9px] font-mono">
        Sin distribución cargada
      </div>
    );
  };

  const generateSmartZpl = () => {
    let zpl = [];
    zpl.push('^XA ; Inicio de bloque de impresion inteligente');
    zpl.push('^LH0,0 ; Origen base');
    
    if (labelOrientation === 'vertical') {
      zpl.push('^PON ; Orientacion Vertical de la pagina');
    }

    const defaultData: Record<string, string> = {
      '{TIENDA}': storeName || 'SOPORTE TÉCNICO',
      '{ORDEN}': '#ST-9844',
      '{CLIENTE}': 'Hugo García',
      '{DISPOSITIVO}': 'XIAOMI REDMI NOTE 13 PRO+',
      '{MARCA}': 'XIAOMI',
      '{MODELO}': 'REDMI NOTE 13 PRO+',
      '{FALLA}': 'CARGA',
      '{TELEFONO}': formatPhoneNumber(phone) || '(555) 000-0192',
      '{TECNICO}': 'Ing. Mario',
      '{FECHA}': new Date().toLocaleDateString('es-MX'),
    };

    // Check if JSON
    const trimmed = labelTemplate.trim();
    let isJson = false;
    let canvasElements: StickerElement[] = [];
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        canvasElements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
        isJson = true;
      }
    } catch (e) {
      // not JSON
    }

    if (isJson) {
      let totalWidthDots = 400; // default for 50mm size at 8 dpmm
      let totalHeightDots = 200; // default for 25mm size at 8 dpmm

      if (labelPaperSize === '40x30mm') {
        totalWidthDots = 320;
        totalHeightDots = 240;
      } else if (labelPaperSize === '50x30mm') {
        totalWidthDots = 400;
        totalHeightDots = 240;
      } else if (labelPaperSize === '60x40mm') {
        totalWidthDots = 480;
        totalHeightDots = 320;
      }

      if (labelOrientation === 'vertical') {
        const temp = totalWidthDots;
        totalWidthDots = totalHeightDots;
        totalHeightDots = temp;
      }

      zpl.push(`^PW${totalWidthDots} ; Ancho de etiqueta`);
      zpl.push(`^LL${totalHeightDots} ; Largo de etiqueta`);

      canvasElements.forEach((elem) => {
        let displayVal = elem.text || '';
        Object.keys(defaultData).forEach((key) => {
          if (displayVal.includes(key)) {
            displayVal = displayVal.replace(new RegExp(key, 'g'), defaultData[key]);
          }
        });
        displayVal = displayVal.toUpperCase();

        const dotsX = Math.round((elem.x / 100) * totalWidthDots);
        const dotsY = Math.round((elem.y / 100) * totalHeightDots);

        if (elem.type === 'line') {
          const isVertical = elem.orientation === 'vertical';
          if (isVertical) {
            const lineHeightDots = Math.round(((elem.height || 40) / 100) * totalHeightDots);
            zpl.push(`^FO${dotsX},${dotsY}^GB3,${lineHeightDots},3,B^FS ; Dibujo Linea Vertical`);
          } else {
            const lineWidthDots = Math.round(((elem.width || 80) / 100) * totalWidthDots);
            zpl.push(`^FO${dotsX},${dotsY}^GB${lineWidthDots},3,3,B^FS ; Dibujo Linea Horizontal`);
          }
        } else if (elem.type === 'rect') {
          const rectWidthDots = Math.round(((elem.width || 45) / 100) * totalWidthDots);
          const rectHeightDots = Math.round(((elem.height || 35) / 100) * totalHeightDots);
          zpl.push(`^FO${dotsX},${dotsY}^GB${rectWidthDots},${rectHeightDots},3,B^FS ; Dibujo Recuadro`);
        } else {
          const zplHeight = Math.round((elem.fontSize || 10) * 1.6);
          const zplWidth = Math.round((elem.fontSize || 10) * 1.5);
          const rotLetter = elem.orientation === 'vertical' ? 'R' : 'N';

          if (elem.inverted) {
            const textWidthEst = Math.round(displayVal.length * (zplWidth * 0.72));
            const fontAdjustedHeight = zplHeight + 4;
            const boxW = elem.orientation === 'vertical' ? fontAdjustedHeight : (textWidthEst + 6);
            const boxH = elem.orientation === 'vertical' ? (textWidthEst + 6) : fontAdjustedHeight;
            zpl.push(`^FO${dotsX - 3},${dotsY - 2}^GB${boxW},${boxH},${elem.orientation === 'vertical' ? boxW : boxH},B^FS`);
            zpl.push(`^FO${dotsX},${dotsY}^A0${rotLetter},${zplHeight},${zplWidth}^FR^FD${displayVal}^FS ; Invertido`);
          } else {
            zpl.push(`^FO${dotsX},${dotsY}^A0${rotLetter},${zplHeight},${zplWidth}^FD${displayVal}^FS`);
          }
        }
      });

      zpl.push('^XZ ; Fin de etiqueta coordinada');
      return zpl.join('\n');
    }

    const lines = labelTemplate.split('\n');
    let yPos = 25;

    lines.forEach((line) => {
      if (!line.trim()) {
        yPos += 15;
        return;
      }

      const regex = /({[A-Z]+})/g;
      const tokens = line.split(regex);
      
      let xPos = 20;
      let lineHasVerticalTag = false;

      tokens.forEach((token) => {
        if (!token) return;

        const isTag = token.startsWith('{') && token.endsWith('}');
        if (isTag) {
          const value = (defaultData[token] || token).toUpperCase();
          const orientation = labelTagsOrientation[token] || 'horizontal';

          if (orientation === 'vertical') {
            if (xPos > 20) {
              yPos += 30;
              xPos = 20;
            }
            zpl.push(`^FO20,${yPos}^A0N,22,22^FD${value}^FS`);
            yPos += 32;
            lineHasVerticalTag = true;
          } else {
            zpl.push(`^FO${xPos},${yPos}^A0N,16,16^FD${value}^FS`);
            xPos += (value.length * 10) + 15; 
          }
        } else {
          const value = token.toUpperCase().trim();
          if (value) {
            zpl.push(`^FO${xPos},${yPos}^A0N,16,16^FD${value}^FS`);
            xPos += (value.length * 10) + 15;
          }
        }
      });

      if (!lineHasVerticalTag && xPos > 20) {
        yPos += 28;
      }
    });

    zpl.push('^XZ ; Fin de etiqueta');
    return zpl.join('\n');
  };

  return (
    <div className={`flex-1 p-4 md:p-6 overflow-y-auto space-y-6 select-none ${
      isRetro 
        ? 'bg-[#cbd6e2] text-zinc-900 font-sans [&_input]:!bg-white [&_input]:!text-zinc-900 [&_input]:!border-t-[#808080] [&_input]:!border-l-[#808080] [&_input]:!border-b-white [&_input]:!border-r-white [&_input]:!border-2 [&_input]:!rounded-none [&_input]:font-mono [&_input]:font-bold [&_label]:!text-[#000080] [&_label]:!font-black [&_select]:!bg-white [&_select]:!text-zinc-900 [&_select]:!border-t-[#808080] [&_select]:!border-l-[#808080] [&_select]:!border-b-white [&_select]:!border-r-white [&_select]:!border-2 [&_select]:!rounded-none [&_select]:font-mono [&_select]:font-bold [&_textarea]:!bg-white [&_textarea]:!text-zinc-900 [&_textarea]:!border-t-[#808080] [&_textarea]:!border-l-[#808080] [&_textarea]:!border-b-white [&_textarea]:!border-r-white [&_textarea]:!border-2 [&_textarea]:!rounded-none [&_h4]:!text-[#000080] [&_h4]:!border-zinc-400' 
        : isLight 
          ? 'bg-[#eaeef3] text-zinc-800 [&_input]:!bg-white [&_input]:!text-zinc-900 [&_input]:!border-zinc-300 [&_label]:!text-zinc-700 [&_select]:!bg-white [&_select]:!text-zinc-900 [&_select]:!border-zinc-300 [&_textarea]:!bg-white [&_textarea]:!text-zinc-900 [&_textarea]:!border-zinc-300 [&_h4]:!text-zinc-900 [&_h4]:!border-zinc-300' 
          : 'bg-[#0c0c0e] text-gray-200'
    }`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 relative ${
        isLight ? 'border-zinc-300' : 'border-[#1c1d22]'
      }`}>
        <h3 className={`text-sm font-display font-black tracking-wider flex items-center gap-2 animate-fade-in ${
          isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900' : 'text-amber-500'
        }`}>
          <Settings className="w-5 h-5 animate-spin" /> CONFIGURACIÓN GENERAL DEL SISTEMA
        </h3>

        {/* Settings Search Bar */}
        <div className="relative w-full sm:w-72 z-20">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="🔍 Buscar ajuste (ej: impresora, whatsapp)..."
              className={`w-full px-3 py-1.5 pl-8 text-xs outline-none border transition-all ${
                isRetro
                  ? '!bg-white !text-black !border-2 !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white font-mono font-bold'
                  : isLight
                    ? 'bg-white text-zinc-950 border-zinc-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-zinc-900/80 text-white border-zinc-800 rounded-lg focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 text-xs cursor-pointer font-bold select-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Dropdown Overlay */}
          {searchResults.length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto border shadow-md z-50 ${
              isRetro
                ? 'rounded-none shadow-none'
                : isLight
                  ? 'bg-white border-zinc-200 text-zinc-800 rounded-lg'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-200 rounded-lg'
            }`}
              style={isRetro ? { backgroundColor: '#ffffff', borderWidth: '2px', borderTopColor: '#808080', borderLeftColor: '#808080', borderBottomColor: '#ffffff', borderRightColor: '#ffffff', borderStyle: 'solid' } : {}}
            >
              {searchResults.map(item =>
                isRetro ? (
                  <RetroResultItem
                    key={item.id}
                    item={item}
                    onClick={() => handleSelectSearchResult(item)}
                  />
                ) : (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className={`w-full text-left px-3 py-2 text-[10.5px] font-medium cursor-pointer block border-b last:border-b-0 ${
                      isLight
                        ? 'border-zinc-100 hover:bg-slate-100 transition-colors duration-150'
                        : 'border-[#1b1c21] hover:bg-zinc-900/80 text-zinc-300 hover:text-white transition-colors duration-150'
                    }`}
                  >
                    <span className="font-bold block">{item.title}</span>
                    <span className="text-[8.5px] mt-0.5 opacity-70 block">
                      Sección: {item.tab === 'global' ? `Preferencias Globales > ${item.subTab === 'business' ? 'Datos del Negocio' : item.subTab === 'logos' ? 'Logotipos' : item.subTab === 'system' ? 'Apariencia' : item.subTab === 'modules' ? 'Módulos' : 'Respaldos'}` : item.tab === 'printer' ? 'Impresora y Tickets' : item.tab === 'users' ? 'Usuarios y Accesos' : item.tab === 'notifications' ? 'Notificaciones' : item.tab === 'network' ? 'Red Local' : item.tab === 'audit' ? 'Auditoría' : 'Desarrollo'}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Pestañas de Navegación de Configuración */}
        <div className={`flex items-center p-1 rounded-md border ${
          isLight 
            ? 'bg-zinc-100 border-zinc-200' 
            : 'bg-[#08080a] border-[#1c1d22]'
        }`}>
          <button
            type="button"
            onClick={() => setActiveConfigTab('global')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'global'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Preferencias Globales
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('printer')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'printer'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Impresora y Tickets
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('users')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'users'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Usuarios y Accesos
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('notifications')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'notifications'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Notificaciones
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('audit')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'audit'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Auditoría
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('network')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'network'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Red Local y Multicaja
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab('taecel')}
            className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeConfigTab === 'taecel'
                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-600 text-white shadow')
                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Recargas Taecel
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded select-none animate-bounce">
          {feedback}
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ─────────────────────────────────────────────────── */}
      {activeConfigTab === 'notifications' && (
        <div className={`p-6 rounded border space-y-6 ${
          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
            : isLight ? 'bg-white border-zinc-200'
            : 'bg-[#121316] border-[#1b1c21]'
        }`}>
          {/* Header */}
          <div className={`flex items-start gap-4 pb-4 border-b ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-sky-100' : 'bg-sky-900/30'}`}>
              🔔
            </div>
            <div>
              <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                Notificaciones
              </h4>
              <p className={`text-[11px] mt-1 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Configura tu bot de Telegram y elige qué eventos quieres recibir.
              </p>
            </div>
          </div>

          {/* ── TELEGRAM CONFIGURADOR ASISTIDO ───────────────────────────────── */}
          <div className="space-y-0">

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-sky-100' : 'bg-sky-900/40'}`}>✈️</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>Notificaciones por Telegram</h4>
                  {tgWizardStep === 6 && (
                    <>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/40 text-emerald-400'}`}>✅ Configurado</span>
                      <button type="button" onClick={() => { setTgWizardStep(0); setTgTokenInput(''); setTgStepError(null); clearTgDraft(); }}
                        className={`text-[10px] font-bold cursor-pointer ${isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        Reconfigurar
                      </button>
                    </>
                  )}
                </div>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Gratis · Instantáneo · Sin bloqueos — El asistente lo configura todo automáticamente.
                </p>
              </div>
            </div>

            {/* ── PASO 0: Pantalla de inicio ── */}
            {tgWizardStep === 0 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/20 border-sky-900/40'}`}>
                {/* Banner de progreso guardado */}
                {_tgDraft?.step > 0 && (
                  <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'}`}>
                    <div className="flex items-center gap-2">
                      <span>💾</span>
                      <p className={`text-[11px] font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                        Tienes una configuración en progreso guardada — ¿deseas continuar donde la dejaste?
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => setTgWizardStep(_tgDraft.step as 0|1|2|3|4|5|6)}
                      className={`shrink-0 px-3 py-1.5 text-[11px] font-black rounded-lg cursor-pointer ${isRetro ? 'bg-[#000080] retro-white-text' : isLight ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
                      Continuar →
                    </button>
                  </div>
                )}
                <p className={`text-sm font-black ${isLight ? 'text-zinc-800' : 'text-white'}`}>¿Cómo funciona?</p>
                <div className="space-y-2.5">
                  {[
                    { n: '1', t: 'Te guiamos a crear tu bot gratis en Telegram', s: '2 minutos — el asistente te lleva de la mano' },
                    { n: '2', t: 'Pegas el token y el asistente lo verifica solo', s: 'Automático' },
                    { n: '3', t: 'Mandas un mensaje a tu bot en Telegram', s: 'Solo presionas START' },
                    { n: '4', t: 'La app detecta tu ID automáticamente', s: 'Sin copiar nada — todo automático' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-sky-500 text-white' : 'bg-sky-600 text-white'}`}>{s.n}</span>
                      <div>
                        <p className={`text-[12px] font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>{s.t}</p>
                        <p className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setTgWizardStep(1)}
                  className={`w-full py-2.5 font-black text-[12px] uppercase tracking-wider rounded-lg cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                  ✈️ Comenzar configuración →
                </button>
              </div>
            )}

            {/* ── PASO 1: Crear cuenta de Telegram ── */}
            {tgWizardStep === 1 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 1 ? 'bg-sky-500' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>Paso 1 de 5 — Abre Telegram</p>

                <div className="space-y-3">
                  {/* ¿Ya tienes Telegram? */}
                  <div className={`p-3 rounded-lg border ${isRetro ? 'bg-sky-50 border-sky-200' : isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/20 border-sky-900/40'}`}>
                    <p className={`text-[12px] font-black mb-2 ${isLight ? 'text-sky-800' : 'text-sky-300'}`}>¿Qué es Telegram?</p>
                    <p className={`text-[11px] leading-relaxed ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                      Telegram es una app de mensajería gratuita (como WhatsApp). La usaremos para enviarte notificaciones del taller directamente a tu celular.
                    </p>
                  </div>

                  {/* Sub-paso A: Tener cuenta */}
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${isRetro ? 'bg-zinc-50 border-zinc-200' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-900/60 text-sky-300'}`}>A</span>
                    <div>
                      <p className={`text-[12px] font-black ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>Necesitas una cuenta de Telegram</p>
                      <p className={`text-[11px] mt-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Si aún no tienes cuenta, créala desde tu celular descargando la app de Telegram. Es gratis.</p>
                    </div>
                  </div>

                  {/* Sub-paso B: Abrir en navegador de la PC */}
                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    tgWebOpened
                      ? (isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40')
                      : (isRetro ? 'bg-zinc-50 border-zinc-200' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50')
                  }`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                      tgWebOpened ? 'bg-emerald-500 text-white' : (isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-900/60 text-sky-300')
                    }`}>{tgWebOpened ? '✓' : 'B'}</span>
                    <div className="flex-1 space-y-2">
                      <p className={`text-[12px] font-black ${tgWebOpened ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-zinc-800' : 'text-zinc-100')}`}>
                        {tgWebOpened ? '¡Telegram abierto en el navegador!' : 'Abre Telegram en el navegador de esta PC'}
                      </p>
                      {!tgWebOpened && (
                        <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Los siguientes pasos requieren que Telegram esté abierto en el navegador de esta misma computadora.
                        </p>
                      )}
                      {!tgWebOpened ? (
                        <button type="button"
                          onClick={() => {
                            (window as any).electronAPI?.openExternal('https://web.telegram.org');
                            setTgWebOpened(true);
                          }}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                          🌐 Abrir Telegram en el navegador
                        </button>
                      ) : (
                        <p className={`text-[11px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                          Inicia sesión con tu cuenta si aún no lo has hecho, luego regresa aquí.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setTgWizardStep(0)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <div className="flex-1">
                    <button type="button"
                      onClick={() => setTgWizardStep(2)}
                      disabled={!tgWebOpened}
                      className={`w-full py-2.5 text-[12px] font-black uppercase tracking-wider rounded-lg transition-all ${isRetro && tgWebOpened ? 'retro-white-text' : ''}`}
                      style={!tgWebOpened
                        ? { background: '#d1d5db', color: '#9ca3af', border: '2px solid #d1d5db', cursor: 'not-allowed' }
                        : isRetro
                          ? { background: '#000080', color: '#ffffff', border: '2px solid #0000cc', cursor: 'pointer', boxShadow: '2px 2px 0 #00003a' }
                          : { background: '#16a34a', color: '#ffffff', border: '2px solid #15803d', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.35)' }
                      }>
                      {tgWebOpened ? '✅ Continuar →' : 'Primero abre Telegram arriba'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 2: Guía para crear bot en BotFather ── */}
            {tgWizardStep === 2 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 2 ? 'bg-sky-500' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>Paso 2 de 5 — Crear tu bot</p>

                <div className="space-y-3">
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${isRetro ? 'bg-zinc-50 border-zinc-200' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-900/60 text-sky-300'}`}>A</span>
                    <div className="flex-1 space-y-2">
                      <p className={`text-[12px] font-black ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>Abre @BotFather — el creador oficial de bots</p>
                      <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>BotFather es el bot oficial de Telegram para crear bots. El botón de abajo lo abre directo en tu navegador.</p>
                      <button type="button"
                        onClick={() => (window as any).electronAPI?.openExternal('https://web.telegram.org/k/#@BotFather')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                        ✈️ Abrir @BotFather en Telegram
                      </button>
                      <p className={`text-[11px] font-bold mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                        ⚠️ Al abrirse, presiona el botón <strong>INICIAR</strong> (o <strong>START</strong>) antes de continuar.
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${isRetro ? 'bg-zinc-50 border-zinc-200' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-900/60 text-sky-300'}`}>B</span>
                    <div className="flex-1 space-y-2">
                      <p className={`text-[12px] font-black ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>Envía el comando <code className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isLight ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-700 text-zinc-200'}`}>/newbot</code> a BotFather</p>
                      <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Presiona el botón y el comando se copiará solo — luego pégalo en el chat con <strong>Ctrl+V</strong> y presiona <strong>Enter</strong>.</p>
                      <TgCopyNewbotButton isRetro={isRetro} isLight={isLight} />
                      <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>BotFather te pedirá un nombre para tu bot, por ejemplo: <em>"Mi Taller Bot"</em></p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${isRetro ? 'bg-zinc-50 border-zinc-200' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-900/60 text-sky-300'}`}>C</span>
                    <div>
                      <p className={`text-[12px] font-black ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>BotFather te pedirá un <strong>nombre de usuario</strong> para el bot</p>
                      <p className={`text-[11px] mt-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Debe terminar en <code className={`px-1 rounded font-mono text-[11px] ${isLight ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-700 text-zinc-200'}`}>bot</code>, por ejemplo:
                      </p>
                      <div className={`mt-1.5 flex flex-wrap gap-1.5`}>
                        {['MiTallerBot', 'TallerNotificacionesBot', 'miTaller_bot'].map(ex => (
                          <code key={ex} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isLight ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-300'}`}>{ex}</code>
                        ))}
                      </div>
                      <p className={`text-[11px] mt-1.5 font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                        ⚠️ Si el nombre ya está tomado, BotFather te lo dirá — prueba con otro.
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isLight ? 'bg-emerald-500 text-white' : 'bg-emerald-700 text-white'}`}>D</span>
                    <div className="space-y-2">
                      <p className={`text-[12px] font-black ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>¡BotFather te enviará el Token! — cópialo completo</p>
                      <p className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Una vez que acepte el username te dará el token. Se ve así:</p>
                      <code className={`block px-2.5 py-1.5 rounded-lg text-[10px] font-mono break-all ${isLight ? 'bg-white text-zinc-700 border border-emerald-200' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}>
                        7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxx
                      </code>
                      <p className={`text-[11px] font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        ✅ Cuando lo tengas, regresa aquí y presiona <strong>"Ya tengo mi Token →"</strong> abajo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setTgWizardStep(1)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <div className="flex-1">
                    <button type="button" onClick={() => setTgWizardStep(3)}
                      className={`w-full py-2.5 font-black text-[12px] uppercase tracking-wider rounded-lg cursor-pointer transition-colors ${isRetro ? 'retro-white-text' : 'text-white'}`}
                      style={isRetro
                        ? { background: '#000080', border: '2px solid #0000cc', boxShadow: '2px 2px 0 #00003a' }
                        : isLight
                          ? { background: '#0ea5e9', border: '2px solid #0284c7' }
                          : { background: '#0ea5e9', border: '2px solid #0284c7' }
                      }>
                      Ya tengo mi Token →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 3: Pegar y verificar token ── */}
            {tgWizardStep === 3 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 3 ? 'bg-sky-500' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>Paso 3 de 5 — Pegar el Token</p>
                <div>
                  <label className={`block text-[11px] font-black mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    Pega aquí el Token que te dio BotFather:
                  </label>
                  <input type="text" value={tgTokenInput} onChange={e => { setTgTokenInput(e.target.value); setTgStepError(null); }}
                    placeholder="7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxx"
                    className={`w-full px-3 py-2.5 text-xs font-mono rounded-lg border outline-none transition-colors ${isRetro ? 'bg-white border-zinc-400 text-zinc-900 focus:border-[#000080]' : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-sky-400' : 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-sky-500'}`}
                    onKeyDown={e => e.key === 'Enter' && handleTgVerifyToken()}
                  />
                  {tgStepError && <p className={`text-[11px] font-bold mt-1.5 ${isLight ? 'text-red-600' : 'text-red-400'}`}>{tgStepError}</p>}
                  <p className={`text-[10px] mt-1.5 ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    💡 Encuéntralo en el mensaje que te envió BotFather al crear el bot
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setTgWizardStep(2); setTgStepError(null); }}
                    className={`px-4 py-2 text-[11px] font-bold rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <div className="flex-1">
                    <button type="button" onClick={handleTgVerifyToken} disabled={tgStepLoading}
                      className={`w-full py-2.5 font-black text-[12px] uppercase tracking-wider rounded-lg cursor-pointer disabled:opacity-50 transition-colors ${isRetro ? 'retro-white-text' : 'text-white'}`}
                      style={isRetro ? { background: '#000080', border: '2px solid #0000cc', boxShadow: '2px 2px 0 #00003a' } : { background: '#0ea5e9', border: '2px solid #0284c7' }}>
                      {tgStepLoading ? '⏳ Verificando...' : '✅ Verificar Token →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 4: Enviar mensaje al bot — Detectar Chat ID ── */}
            {tgWizardStep === 4 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-sky-500' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>Paso 4 de 5 — Activa tu bot</p>

                <div className={`flex items-center gap-3 p-3 rounded-lg border ${isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className={`text-[12px] font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Token verificado correctamente</p>
                    <p className={`text-[11px] ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Bot: <strong>{tgBotName}</strong>{tgBotUsername ? <span className="font-mono ml-1 opacity-70">@{tgBotUsername}</span> : ''}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border space-y-3 ${isRetro ? 'bg-amber-50 border-amber-200' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'}`}>
                  <p className={`text-[12px] font-black ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Ahora haz esto en Telegram:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-700 text-white'}`}>1</span>
                      <p className={`text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>Abre tu bot en Telegram con el botón de abajo:</p>
                    </div>
                    <button type="button"
                      onClick={() => (window as any).electronAPI?.openExternal(`https://web.telegram.org/k/#@${tgBotUsername || tgBotName.toLowerCase().replace(/\s+/g,'_')}`)}
                      className={`ml-7 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-amber-700 hover:bg-amber-600 text-white'}`}>
                      ✈️ Abrir mi bot en Telegram
                    </button>
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-700 text-white'}`}>2</span>
                      <p className={`text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>Presiona <strong>START</strong> o escríbele cualquier mensaje (ej: "hola")</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-700 text-white'}`}>3</span>
                      <p className={`text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>Regresa aquí y presiona <strong>"Detectar automáticamente"</strong></p>
                    </div>
                  </div>
                </div>

                {tgStepError && <p className={`text-[11px] font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>{tgStepError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setTgWizardStep(3); setTgStepError(null); }}
                    className={`px-4 py-2 text-[11px] font-bold rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <div className="flex-1">
                    <button type="button" onClick={handleTgDetectChatId} disabled={tgStepLoading || tgPolling}
                      className={`w-full py-2.5 font-black text-[12px] uppercase tracking-wider rounded-lg cursor-pointer disabled:opacity-60 transition-colors ${isRetro ? 'retro-white-text' : 'text-white'}`}
                      style={isRetro ? { background: '#000080', border: '2px solid #0000cc', boxShadow: '2px 2px 0 #00003a' } : { background: '#0ea5e9', border: '2px solid #0284c7' }}>
                      {tgPolling ? '🔍 Detectando...' : '🔍 Detectar automáticamente →'}
                    </button>
                  </div>
                </div>
                {tgPolling && (
                  <p className={`text-[10px] text-center animate-pulse font-bold ${isLight ? 'text-sky-500' : 'text-sky-400'}`}>
                    Buscando tu mensaje... asegúrate de haberle enviado algo a tu bot en Telegram.
                  </p>
                )}
              </div>
            )}

            {/* ── PASO 5: Chat ID detectado — Confirmar ── */}
            {tgWizardStep === 5 && (
              <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full bg-sky-500`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>Paso 5 de 5 — ¡Casi listo!</p>
                <div className={`p-4 rounded-lg border text-center space-y-1 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                  <p className="text-3xl">🎯</p>
                  <p className={`text-sm font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>¡Chat ID detectado automáticamente!</p>
                  <p className={`text-xl font-black font-mono mt-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>{tgChatId}</p>
                  <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Tu identificador único de Telegram</p>
                </div>
                <button type="button" onClick={handleTgFinish} disabled={tgStepLoading}
                  className={`w-full py-3 font-black text-[13px] uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50 transition-colors ${isRetro ? 'bg-[#000080] retro-white-text' : isLight ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                  {tgStepLoading ? '⏳ Activando y enviando mensaje de prueba...' : '🚀 Activar Telegram y enviar prueba →'}
                </button>
              </div>
            )}

            {/* ── PASO 5: Listo y configurado ── */}
            {tgWizardStep === 6 && (
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 flex items-center gap-4 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                  <span className="text-3xl">✅</span>
                  <div className="flex-1">
                    <p className={`text-sm font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Telegram configurado y activo</p>
                    <p className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Chat ID: {tgChatId}</p>
                  </div>
                  <button type="button" onClick={handleTestTG} disabled={tgTestLoading}
                    className={`px-4 py-2 text-[11px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5 ${isRetro ? 'bg-[#000080] text-white' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                    <Send className="w-3 h-3" />
                    {tgTestLoading ? 'Enviando...' : 'Probar'}
                  </button>
                </div>
                {tgFeedback && (
                  <p className={`text-[11px] font-bold px-1 ${tgFeedback.startsWith('✅') ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-red-600' : 'text-red-400')}`}>{tgFeedback}</p>
                )}
                <p className={`text-[10px] px-1 ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Puedes ajustar qué eventos notificar en la sección de Eventos a notificar de abajo.
                </p>
              </div>
            )}

          </div>

          <hr className={`border-t ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`} />

          {/* ── WHATSAPP CONFIGURATOR ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25`}>💬</div>
              <div className="flex-1">
                <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>Notificaciones y Comprobantes por WhatsApp</h4>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Configura el envío de tickets digitales y avisos de reparación a tus clientes.
                </p>
              </div>
            </div>

            <div className={`rounded-xl border p-5 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0e0f12] border-zinc-800'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Método de Envío</label>
                  <select
                    value={waMode}
                    onChange={e => setWaMode(e.target.value as any)}
                    className={`w-full focus:outline-none px-2.5 py-2 text-xs font-bold ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900' : 'bg-zinc-900 border border-zinc-800 rounded-lg text-white'}`}
                  >
                    <option value="disabled">❌ Desactivado</option>
                    <option value="direct">🌐 Enlace Directo (Gratuito - Abre WhatsApp Web/App)</option>
                    <option value="automated">⚡ API Automatizada (Silencioso - UltraMsg / Wassenger)</option>
                    <option value="integrated">🔌 WhatsApp Integrado (Gratuito - Escanear QR)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Prefijo de País por Defecto</label>
                  <input
                    type="text"
                    value={waDefaultCountry}
                    onChange={e => setWaDefaultCountry(e.target.value.replace(/\D/g, ''))}
                    placeholder="52"
                    className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900' : 'bg-zinc-900 border border-zinc-800 rounded-lg text-white'}`}
                  />
                  <p className="text-[9px] text-zinc-500">Se añade automáticamente al detectar números a 10 dígitos (Ej: 52 para México).</p>
                </div>
              </div>

              {waMode === 'automated' && (
                <div className="space-y-4 pt-3 border-t border-dashed border-zinc-800/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <div className={`p-3 rounded-lg border text-[11px] leading-relaxed ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'}`}>
                      💡 <strong>Configuración de Pasarela Automática:</strong> Escanea el código QR en la plataforma de tu proveedor (como UltraMsg) para enlazar tu número del taller, y luego copia aquí tu <strong>API URL (Endpoint de Envío)</strong> y <strong>Token</strong>.
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>API URL / Endpoint de Envío</label>
                    <input
                      type="text"
                      value={waApiUrl}
                      onChange={e => setWaApiUrl(e.target.value)}
                      placeholder="https://api.ultramsg.com/instanceXXXX/messages/chat"
                      className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900' : 'bg-zinc-900 border border-zinc-800 rounded-lg text-white'}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Token / API Key Secreta</label>
                    <input
                      type="password"
                      value={waApiToken}
                      onChange={e => setWaApiToken(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className={`w-full focus:outline-none px-2.5 py-2 text-xs font-mono font-bold ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900' : 'bg-zinc-900 border border-zinc-800 rounded-lg text-white'}`}
                    />
                  </div>
                </div>
              )}

              {waMode === 'integrated' && (
                <div className="space-y-4 pt-3 border-t border-dashed border-zinc-800/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Estado del Servicio</label>
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          {waIntegratedStatus === 'CONNECTED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              🟢 CONECTADO
                            </span>
                          ) : waIntegratedStatus === 'QR' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              🟡 ESPERANDO ESCANEO DE QR
                            </span>
                          ) : waIntegratedStatus === 'INITIALIZING' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-sky-500/10 text-sky-500 border border-sky-500/20">
                              ⏳ INICIANDO SERVICIO...
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              🔴 DESCONECTADO
                            </span>
                          )}
                          
                          {waIntegratedStatus === 'CONNECTED' && (
                            <button
                              type="button"
                              onClick={handleDisconnectWhatsapp}
                              className={`px-2.5 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors bg-rose-600 text-white hover:bg-rose-500`}
                            >
                              Desvincular
                            </button>
                          )}
                        </div>

                        {waIntegratedStatus === 'CONNECTED' && waConnectedPhone && (
                          <div className={`text-[11px] mt-0.5 space-y-0.5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                            <p className="font-bold">Número vinculado: <span className="font-mono text-xs text-sky-500 font-extrabold">+{waConnectedPhone}</span></p>
                            {localStorage.getItem('wa_connected_since') && (
                              <p className="text-[10px] text-zinc-500">Vinculado desde: <span className="font-medium">{localStorage.getItem('wa_connected_since')}</span></p>
                            )}
                          </div>
                        )}

                        {waIntegratedStatus !== 'CONNECTED' && (
                          <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed max-w-sm ${
                            isLight 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800' 
                              : 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300'
                          }`}>
                            <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ¿Cómo vincular tu cuenta?
                            </p>
                            Para conectar tu WhatsApp, haz clic en el <strong>botón flotante verde con el ícono de WhatsApp</strong> en la esquina inferior derecha de tu pantalla y escanea el código QR que se mostrará en el chat flotante.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Opciones de envío automático</label>
                      <div className="space-y-1.5 mt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoSendSale}
                            onChange={e => setAutoSendSale(e.target.checked)}
                            className="rounded border-zinc-300 focus:ring-sky-500"
                          />
                          <span>Enviar ticket de venta automáticamente al cobrar</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoSendRepair}
                            onChange={e => setAutoSendRepair(e.target.checked)}
                            className="rounded border-zinc-300 focus:ring-sky-500"
                          />
                          <span>Notificar cambios de estado en reparaciones</span>
                        </label>
                        {autoSendRepair && (
                          <div className={`ml-6 mt-1.5 p-3 rounded-lg border space-y-2 max-w-md ${
                            isRetro 
                              ? 'bg-white border-zinc-400 rounded-none' 
                              : isLight 
                                ? 'bg-zinc-50 border-zinc-200' 
                                : 'bg-[#0f1015]/65 border-[#1c1d22]'
                          }`}>
                            <span className={`text-[10px] font-black uppercase tracking-wide block ${
                              isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-650' : 'text-sky-400'
                            }`}>
                              ⚙️ Selecciona los estados a notificar:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {[
                                { key: 'Pendiente', label: '⏳ Pendiente', show: true },
                                { key: 'Diagnóstico', label: '🔍 Diagnóstico', show: workshopMode === 'team' },
                                { key: 'En Reparación', label: '🛠️ En Reparación', show: workshopMode === 'team' },
                                { key: 'Listo', label: '✅ Listo', show: true },
                                { key: 'Entregado', label: '📦 Entregado', show: true },
                                { key: 'Entregado y Pagado', label: '💰 Entregado y Pagado', show: true },
                                { key: 'Fallido', label: '❌ Fallido', show: true },
                                { key: 'Cancelado', label: '🚫 Cancelado', show: true }
                              ].filter(st => st.show).map(st => {
                                const isChecked = waNotifyStates.includes(st.key);
                                return (
                                  <label key={st.key} className="flex items-center gap-2 text-[11px] font-medium cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleNotifyState(st.key)}
                                      className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-sky-500 accent-sky-500 cursor-pointer"
                                    />
                                    <span className={isLight ? 'text-zinc-700 font-semibold' : 'text-zinc-300 font-semibold'}>{st.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón de Mantenimiento / Forzar Actualización de WhatsApp */}
                    <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left ${
                      isRetro 
                        ? 'bg-sky-50 border-sky-300 text-zinc-900' 
                        : isLight 
                          ? 'bg-sky-50/70 border-sky-200 text-zinc-900' 
                          : 'bg-sky-950/20 border-sky-800/40 text-zinc-100'
                    }`}>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🔄</span>
                          <span className="text-[11px] font-black uppercase tracking-wide">Actualizaciones de WhatsApp Web</span>
                        </div>
                        <p className="text-[10px] opacity-80 leading-snug">
                          Si WhatsApp se queda en pantalla negra o Meta actualizó sus servidores, haz clic aquí para comprobar y aplicar el último parche.
                        </p>
                        {waUpdateFeedback && (
                          <p className="text-[10.5px] font-bold mt-1 text-emerald-500 animate-fade-in font-mono">
                            {waUpdateFeedback}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={waCheckingUpdate}
                        onClick={handleCheckWaUpdates}
                        className={`px-3.5 py-2 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md ${
                          waCheckingUpdate
                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                            : isRetro
                              ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-black border-r-black'
                              : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95'
                        }`}
                      >
                        {waCheckingUpdate ? (
                          <>
                            <span className="animate-spin text-xs">⏳</span>
                            <span>Comprobando...</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            <span>Comprobar Actualizaciones</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {waIntegratedStatus === 'QR' && qrDataUrl && (
                    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700/40 rounded-xl bg-zinc-950/20">
                      <p className="text-[10px] font-black uppercase mb-3 text-center tracking-wider text-sky-400">
                        Escanea este código desde la sección de Dispositivos Vinculados en tu celular
                      </p>
                      <div className="bg-white p-2 rounded-xl shadow-md">
                        <img src={qrDataUrl} className="w-44 h-44 block" alt="Código QR de WhatsApp" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveWhatsappConfig}
                  disabled={waSaving}
                  className={`px-4 py-2 text-[11px] font-black uppercase rounded cursor-pointer disabled:opacity-50 transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-500 hover:bg-sky-600 text-white rounded-lg'}`}
                >
                  {waSaving ? 'Guardando...' : '💾 Guardar Configuración de WhatsApp'}
                </button>
                {waFeedback && (
                  <span className={`text-[11px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{waFeedback}</span>
                )}
              </div>
            </div>
          </div>

          {/* Toggles de eventos */}
          <div className={`space-y-2 pt-6 border-t ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'} ${tgWizardStep !== 6 ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Eventos a notificar</h5>
              {tgWizardStep !== 6 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  🔒 Configura el bot primero
                </span>
              )}
            </div>
            {([
              { key: 'sale',      label: 'Venta POS completada',       emoji: '🟢', val: notifyOnSale,      set: setNotifyOnSale, show: config.enablePOS !== false },
              { key: 'order',     label: 'Nueva orden de reparación',  emoji: '🔧', val: notifyOnOrder,     set: setNotifyOnOrder, show: config.enableTaller !== false },
              { key: 'status',    label: 'Cambio de estado en orden',  emoji: '⚙️', val: notifyOnStatus,    set: setNotifyOnStatus, show: config.enableTaller !== false },
              { key: 'delivery',  label: 'Orden finalizada/entregada', emoji: '💚', val: notifyOnDelivery,  set: setNotifyOnDelivery, show: config.enableTaller !== false },
              { key: 'inventory', label: 'Producto agregado a stock',  emoji: '📦', val: notifyOnInventory, set: setNotifyOnInventory, show: config.enablePOS !== false },
              { key: 'lowstock',  label: 'Stock mínimo alcanzado',     emoji: '⚠️', val: notifyOnLowStock,  set: setNotifyOnLowStock, show: config.enablePOS !== false },
              { key: 'corte',     label: 'Corte de caja realizado',    emoji: '🏦', val: notifyOnCorte,     set: setNotifyOnCorte, show: true },
              { key: 'apertura',  label: 'Apertura de caja realizada', emoji: '🔑', val: notifyOnApertura,  set: setNotifyOnApertura, show: true },
              { key: 'fiado',     label: 'Fiado creado/abonado/saldado', emoji: '💳', val: notifyOnFiado,    set: setNotifyOnFiado, show: config.enablePOS !== false },
              { key: 'expense',   label: 'Movimientos de caja manuales (entradas/salidas)', emoji: '💵', val: notifyOnExpense,  set: setNotifyOnExpense, show: true },
            ] as const).filter(ev => ev.show).map(ev => (
              <div key={ev.key} className={`flex items-center justify-between gap-3 p-2.5 rounded border ${
                isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">{ev.emoji}</span>
                  <span className={`text-xs font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{ev.label}</span>
                </div>
                <button type="button" onClick={() => {
                  if (currentUser && currentUser.role !== 'admin') {
                    setNotifPinInput(''); setNotifPinError(null);
                    setNotifPinPrompt({ key: ev.key, newVal: !ev.val, set: ev.set });
                  } else {
                    ev.set(!ev.val);
                  }
                }}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${ev.val ? (isRetro ? 'bg-[#000080]' : 'bg-sky-500') : (isLight ? 'bg-zinc-300' : 'bg-zinc-700')}`}
                  role="switch" aria-checked={ev.val}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${ev.val ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={handleSaveNotifyEvents} disabled={notifySaving}
                className={`px-4 py-1.5 text-[11px] font-black uppercase rounded cursor-pointer disabled:opacity-50 ${isRetro ? 'bg-[#000080] retro-white-text border border-[#0000cc]' : isLight ? 'bg-sky-500 hover:bg-sky-600 text-white rounded-lg' : 'bg-sky-600 hover:bg-sky-500 text-white rounded-lg'}`}>
                {notifySaving ? 'Guardando...' : '💾 Guardar eventos'}
              </button>
              {notifyFeedback && <span className={`text-[11px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{notifyFeedback}</span>}
            </div>
          </div>

          {/* Modal PIN admin para toggles de notificación */}
          {notifPinPrompt && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
              <div className={`w-full max-w-xs rounded-xl shadow-2xl border overflow-hidden ${isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-white border-zinc-200' : 'bg-[#0f1115] border-zinc-700'}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-zinc-800' : 'bg-zinc-900'}`}>
                  <span className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">🔒 Verificación de Administrador</span>
                  <button type="button" onClick={() => { setNotifPinPrompt(null); setNotifPinInput(''); setNotifPinError(null); }} className="text-white/70 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Solo el administrador puede cambiar los eventos a notificar. Ingresa el PIN de administrador para continuar.
                  </p>
                  <div>
                    <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>PIN de Administrador</label>
                    <input
                      type="password" inputMode="numeric" maxLength={4} autoFocus
                      value={notifPinInput}
                      onChange={e => { setNotifPinInput(e.target.value.replace(/\D/g,'').slice(0,4)); setNotifPinError(null); }}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return;
                        const admin = users.find(u => u.role === 'admin');
                        if (!admin || notifPinInput !== admin.pin) { setNotifPinError('PIN incorrecto.'); return; }
                        notifPinPrompt.set(notifPinPrompt.newVal);
                        setNotifPinPrompt(null); setNotifPinInput(''); setNotifPinError(null);
                      }}
                      placeholder="••••"
                      className={`w-full text-center tracking-[0.4em] font-mono text-lg px-3 py-2 focus:outline-none transition-colors ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:border-sky-500' : 'bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-sky-500'}`}
                    />
                    {notifPinError && <p className="text-rose-500 text-[10px] font-bold mt-1">{notifPinError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setNotifPinPrompt(null); setNotifPinInput(''); setNotifPinError(null); }} className={`flex-1 py-2 text-xs font-bold uppercase rounded border cursor-pointer ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>Cancelar</button>
                    <button type="button" onClick={() => {
                      const admin = users.find(u => u.role === 'admin');
                      if (!admin || notifPinInput !== admin.pin) { setNotifPinError('PIN incorrecto.'); return; }
                      notifPinPrompt.set(notifPinPrompt.newVal);
                      setNotifPinPrompt(null); setNotifPinInput(''); setNotifPinError(null);
                    }} className={`flex-1 py-2 text-xs font-black uppercase rounded cursor-pointer active:scale-95 ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}>Confirmar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── AUDITORÍA TAB ────────────────────────────────────────────────────── */}
      {activeConfigTab === 'audit' && (() => {
        const accionLabel: Record<AuditAction, { label: string; emoji: string; color: string }> = {
          cancelar_venta:      { label: 'Cancelación de venta',    emoji: '🚫', color: isLight ? 'text-red-700 bg-red-50 border-red-200' : 'text-red-400 bg-red-950/20 border-red-800/30' },
          devolucion_parcial_venta: { label: 'Devolución parcial de venta', emoji: '🔄', color: isLight ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-rose-400 bg-rose-950/20 border-rose-800/30' },
          eliminar_producto:   { label: 'Eliminación de producto',  emoji: '🗑', color: isLight ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-orange-400 bg-orange-950/20 border-orange-800/30' },
          editar_producto:     { label: 'Edición de producto',      emoji: '✏️', color: isLight ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-amber-400 bg-amber-950/20 border-amber-800/30' },
          cambio_estado_orden: { label: 'Cambio de estado',         emoji: '🔄', color: isLight ? 'text-sky-700 bg-sky-50 border-sky-200' : 'text-sky-400 bg-sky-950/20 border-sky-800/30' },
          entregar_orden:      { label: 'Entrega de orden',         emoji: '📦', color: isLight ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-950/20 border-emerald-800/30' },
          venta_inusual:       { label: 'Venta inusual',            emoji: '⚠️', color: isLight ? 'text-yellow-700 bg-yellow-50 border-yellow-300' : 'text-yellow-400 bg-yellow-950/20 border-yellow-700/40' },
          eliminar_orden:      { label: 'Eliminación de orden',     emoji: '🗑️', color: isLight ? 'text-red-700 bg-red-50 border-red-200' : 'text-red-400 bg-red-950/20 border-red-800/30' },
        };
        return (
          <div className={`p-5 rounded border space-y-4 ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]' : isLight ? 'bg-white border-zinc-200' : 'bg-[#121316] border-zinc-800'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className={`text-sm font-black uppercase tracking-widest ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  🛡 Registro de Auditoría
                </h3>
                <p className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Acciones sensibles realizadas por los usuarios — últimas 500 entradas
                </p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-600' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {auditLog.length} registro{auditLog.length !== 1 ? 's' : ''}
              </span>
            </div>

            {auditLog.length === 0 ? (
              <div className={`text-center py-16 text-sm ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <div className="text-4xl mb-3">🛡</div>
                Sin registros aún.<br/>
                <span className="text-[11px]">Las acciones sensibles aparecerán aquí automáticamente.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {auditLog.map(entry => {
                  const meta = accionLabel[entry.accion] ?? { label: entry.accion, emoji: '•', color: '' };
                  return (
                    <div key={entry.id} className={`flex gap-3 p-3 rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800'}`}>
                      <div className="text-lg shrink-0">{meta.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className={`text-[10px] font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            {entry.usuario}
                          </span>
                          <span className={`text-[9px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {entry.rol === 'admin' ? 'Dueño' : 'Empleado'}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{entry.detalle}</p>
                        {entry.referencia && (
                          <p className={`text-[9px] font-mono mt-0.5 ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>Ref: {entry.referencia}</p>
                        )}
                      </div>
                      <div className={`text-right shrink-0 text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <p>{formatDateToDMY(entry.fecha)}</p>
                        <p className="font-bold">{entry.hora}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── NETWORK TAB ──────────────────────────────────────────────────────── */}
      {activeConfigTab === 'network' && (
        <NetworkConfigTab config={config} isRetro={isRetro} isLight={isLight} />
      )}

      {/* ── TAECEL TAB ──────────────────────────────────────────────────────── */}
      {activeConfigTab === 'taecel' && (
        <TaecelConfigTab config={config} onUpdateConfig={onUpdateConfig} isRetro={isRetro} isLight={isLight} />
      )}

      {/* ── DEV TAB ──────────────────────────────────────────────────────────── */}
      {activeConfigTab === 'dev' && (
        <div className={`p-6 rounded border space-y-6 ${
          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]'
            : isLight ? 'bg-white border-zinc-200'
            : 'bg-[#121316] border-red-900/30'
        }`}>
          {!devUnlocked ? (
            /* Password gate */
            <div className="max-w-xs mx-auto space-y-4 py-8 text-center">
              <div className="text-4xl select-none">{devLocked ? '🔒' : '🔐'}</div>
              <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>Panel de Desarrollador</h4>
              {devLocked ? (
                <p className="text-[11px] text-red-500 font-bold">Acceso bloqueado — demasiados intentos fallidos.<br/>Reinicia la aplicación para intentarlo de nuevo.</p>
              ) : (
              <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Introduce la contraseña de acceso para continuar.</p>
              )}
              {!devLocked && <div className="space-y-2">
                <input
                  type="password"
                  value={devPassword}
                  onChange={e => { setDevPassword(e.target.value); setDevPasswordError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleDevLogin()}
                  placeholder="Contraseña..."
                  autoFocus
                  className={`w-full text-center px-3 py-2 text-sm font-mono rounded outline-none border transition-all ${
                    devPasswordError
                      ? 'border-red-500 bg-red-950/20 text-red-400'
                      : isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                      : isLight ? 'bg-white border-zinc-300 text-zinc-900'
                      : 'bg-zinc-950 border-zinc-700 text-white focus:border-red-500'
                  }`}
                />
                {devPasswordError && <p className="text-red-500 text-[10px] font-bold">Contraseña incorrecta. Inténtalo de nuevo.</p>}
                <button
                  type="button"
                  onClick={handleDevLogin}
                  className={`w-full py-2 font-black text-xs uppercase tracking-wider cursor-pointer rounded transition-all ${
                    isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                      : 'bg-red-700 hover:bg-red-600 text-white'
                  }`}
                >
                  Acceder →
                </button>
              </div>}
            </div>
          ) : (
            /* Unlocked dev panel */
            <div className="space-y-5">
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-3 ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-red-900/40'}`}>
                <div>
                  <h4 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-red-700' : 'text-red-400'}`}>🔧 Panel de Desarrollador — Desbloqueado</h4>
                  <p className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Herramientas de prueba y depuración. Solo para uso del desarrollador.</p>
                </div>
                <button type="button" onClick={() => { setDevUnlocked(false); setActiveConfigTab('global'); }}
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded cursor-pointer ${isLight ? 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  Cerrar sesión
                </button>
              </div>

              {devActionFeedback && (
                <div className={`p-2.5 text-[11px] font-bold rounded border ${isRetro ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-400'}`}>
                  ✓ {devActionFeedback}
                </div>
              )}

              {/* Dev action cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. Cargar inventario de prueba */}
                <div className={`p-4 rounded border space-y-2 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>Cargar 100 Accesorios de Prueba</div>
                      <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Llena el inventario con 100 productos de muestra variados.</div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => { onDevLoadSampleInventory?.(); setDevActionFeedback('100 accesorios de prueba cargados en el inventario.'); setTimeout(() => setDevActionFeedback(null), 4000); }}
                    className={`w-full py-1.5 text-[10px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}
                  >Ejecutar</button>
                </div>

                {/* 2. Borrar licencia */}
                <div className={`p-4 rounded border space-y-2 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔑</span>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>Borrar Licencia Activa</div>
                      <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Elimina la licencia guardada para probar el flujo de activación.</div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => { onDevClearLicense?.(); setDevActionFeedback('Licencia eliminada — recarga la app para ver el efecto.'); setTimeout(() => setDevActionFeedback(null), 5000); }}
                    className={`w-full py-1.5 text-[10px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-red-700' : 'bg-red-900/40 hover:bg-red-900/70 text-red-300 border border-red-800/40'}`}
                  >Ejecutar</button>
                </div>

                {/* 3. Restablecer todos los datos */}
                <div className={`p-4 rounded border space-y-2 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🗑️</span>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>Restablecer Todos los Datos</div>
                      <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Borra órdenes, ventas, inventario, clientes y licencia. Vuelve al estado inicial.</div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => { onDevResetAllData?.(); setDevActionFeedback('Todos los datos eliminados. La app se reiniciará.'); setTimeout(() => setDevActionFeedback(null), 4000); }}
                    className={`w-full py-1.5 text-[10px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-red-700' : 'bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800/60'}`}
                  >⚠ Ejecutar (irreversible)</button>
                </div>

                {/* 4. Info de localStorage */}
                <div className={`p-4 rounded border space-y-2 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>Info de Sesión</div>
                      <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Resumen del estado del almacenamiento local.</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono space-y-0.5 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {['fixmanager_setup_complete','fxmgr_license_v2','fxmgr_license_info','fixmanager_orders','fixmanager_services','fixmanager_inventory','fixmanager_clients'].map(k => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="truncate">{k}</span>
                        <span className={localStorage.getItem(k) ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-500 font-bold') : (isLight ? 'text-zinc-400' : 'text-zinc-700')}>
                          {localStorage.getItem(k) ? '✓' : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Clave de Gemini / Inteligencia Artificial */}
                <div className={`p-4 rounded border space-y-2.5 md:col-span-2 ${isRetro ? 'bg-[#eaeef3] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>Configuración de Inteligencia Artificial (Gemini API Key)</div>
                      <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Esta clave se utiliza globalmente para el Asistente de Ticketera y la optimización de búsqueda de modelos de internet.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={devGeminiKey}
                        onChange={(e) => setDevGeminiKey(e.target.value)}
                        placeholder="Pega tu API Key de Gemini aquí (AIzaSy...)"
                        className={`flex-1 border focus:outline-none rounded px-2.5 py-1 text-xs font-mono ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-zinc-300 focus:border-emerald-500'}`}
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleSaveDevGeminiKeyDb}
                        disabled={devGeminiStatus === 'testing'}
                        className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${
                          isRetro 
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
                        }`}
                      >
                        💾 Guardar en Base de Datos
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleTestDevGemini}
                        disabled={devGeminiStatus === 'testing' || !devGeminiKey}
                        className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${
                          isRetro 
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black' 
                            : 'bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-50'
                        }`}
                      >
                        🧪 Probar Conexión
                      </button>
                    </div>

                    {devGeminiStatusMsg && (
                      <div className={`text-[9.5px] font-medium leading-relaxed p-1.5 rounded border ${
                        devGeminiStatus === 'testing'
                          ? (isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300')
                          : devGeminiStatus === 'success'
                            ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400')
                            : (isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/40 border-red-800/40 text-red-400')
                      }`}>
                        {devGeminiStatus === 'testing' ? '⏳' : devGeminiStatus === 'success' ? '✅' : '❌'} {devGeminiStatusMsg}
                      </div>
                    )}
                  </div>
                </div>

              </div>


            </div>
          )}
        </div>
      )}

      {activeConfigTab !== 'users' && activeConfigTab !== 'dev' && activeConfigTab !== 'notifications' && activeConfigTab !== 'audit' && activeConfigTab !== 'network' && activeConfigTab !== 'taecel' && <form onSubmit={handleSubmit} className={`p-5 rounded space-y-4 border ${
        isRetro
          ? 'bg-[#dfdfdf] border-2 border-t-white border-[#dfdfdf] border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 font-sans'
          : isLight
            ? 'bg-white border-zinc-200 text-zinc-900'
            : 'bg-[#121316] border-[#1b1c21] text-zinc-100'
      }`}>
                {activeConfigTab === 'global' ? (
          <div className="flex flex-col md:flex-row gap-5 min-h-[500px] animate-fade-in">
            {/* Barra lateral vertical */}
            <div className={`w-full md:w-48 shrink-0 flex flex-col gap-1 p-2 rounded-xl border ${
              isLight || isRetro
                ? 'bg-zinc-100/60 border-zinc-200'
                : 'bg-[#08080a] border-[#1c1d22]'
            }`}>
              {[
                { id: 'business' as const, label: 'Negocio', icon: '🏢' },
                { id: 'logos' as const, label: 'Logos', icon: '🖼️' },
                { id: 'system' as const, label: 'Apariencia', icon: '🎨' },
                { id: 'modules' as const, label: 'Módulos', icon: '⚙️' },
                { id: 'backup' as const, label: 'Respaldos', icon: '💾' }
              ].map(subTab => (
                <button
                  type="button"
                  key={subTab.id}
                  onClick={() => setGlobalSubTab(subTab.id)}
                  className={`w-full px-3 py-2 text-left text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer select-none flex items-center gap-2.5 ${
                    globalSubTab === subTab.id
                      ? (isRetro ? 'bg-[#000080] !text-white font-black border border-white' : 'bg-amber-600 !text-white shadow-sm')
                      : (isLight || isRetro ? '!text-zinc-700 hover:bg-zinc-200/50' : '!text-zinc-400 hover:!text-white hover:bg-white/5')
                  }`}
                >
                  <span className="text-sm shrink-0">{subTab.icon}</span>
                  <span className="truncate">{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* Panel de contenido derecho */}
            <div className="flex-1 space-y-4">
              <h4 className={`text-xs font-bold uppercase tracking-widest font-mono border-b pb-2 mb-3 block ${
                isRetro ? (isLight ? 'text-[#000080] font-black' : 'text-blue-300 font-black') : isLight ? 'text-zinc-900 font-extrabold' : 'text-amber-500'
              }`}>
                Preferencias Globales: {
                  globalSubTab === 'business' ? '🏢 Datos del Negocio' :
                  globalSubTab === 'logos' ? '🖼️ Logotipos de Marca' :
                  globalSubTab === 'system' ? '🎨 Apariencia y Sistema' :
                  globalSubTab === 'modules' ? '⚙️ Módulos Activos' : '💾 Respaldos de Datos'
                }
              </h4>

              {/* Secciones condicionales */}
              {globalSubTab === 'business' && (
                <div className="space-y-4 animate-fade-in">
                  {highlightBrand && (
                    <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider flex items-center gap-1.5 animate-pulse mb-1.5 px-1">
                      <span>✨ ACTUALIZACIÓN EXPRESS DE LA MARCA</span>
                    </p>
                  )}
                  {/* Nombre, Lema, Firma */}
                  <div
                    id="config-business-name"
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 pb-2 transition-all duration-1000 border ${
                      highlightBrand
                        ? 'bg-amber-500/15 border-amber-500/80 ring-2 ring-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.45)] p-3 rounded-lg scale-[1.01]'
                        : getHighlightClasses('config-business-name')
                    }`}
                  >
                    {/* Nombre */}
                    <div className="space-y-1">
                      <label className={configLabelCls}>Nombre de la Tienda / Franquicia</label>
                      <input type="text" placeholder="Ej: Taller de Reparaciones Cell" value={storeName} onChange={e => setStoreName(e.target.value)}
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                    {/* Lema */}
                    <div className="space-y-1">
                      <label className={configLabelCls}>Lema del Negocio</label>
                      <input type="text" placeholder="Ej: Servicio Profesional Autorizado" value={slogan} onChange={e => setSlogan(e.target.value)}
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                    {/* Firma de Cotizaciones */}
                    <div className="space-y-1">
                      <label className={configLabelCls}>Firma por Defecto en Cotizaciones</label>
                      <input type="text" placeholder="Ej: Lic. Juan Manuel García Alaniz" value={quoteSignature} onChange={e => setQuoteSignature(e.target.value)}
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                  </div>

                  {/* Contacto */}
                  <div
                    id="config-business-phone"
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-1000 border ${getHighlightClasses('config-business-phone')}`}
                  >
                    <div className="space-y-1">
                      <label className={configLabelCls}>Teléfono de Casa / Oficina</label>
                      <input type="text" value={phone} onChange={e => setPhone(formatPhoneNumber(e.target.value))} placeholder="Ej: (351) 157-4876"
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={configLabelCls}>WhatsApp / Celular</label>
                      <input type="text" value={phone2} onChange={e => setPhone2(formatPhoneNumber(e.target.value))} placeholder="Ej: (355) 100-1632"
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={configLabelCls}>Correo Electrónico</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: contacto@negocio.com"
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'}`} />
                    </div>
                  </div>

                  {/* Dirección del Negocio & Ubicación Google Maps con Código QR */}
                  <div
                    id="config-business-address"
                    className={`mt-4 p-4 border rounded-xl transition-all duration-1000 ${
                      isRetro ? (isLight ? 'bg-[#f0f0f0] border-zinc-400 text-zinc-900' : 'bg-[#181a1f] border-zinc-700 text-zinc-200')
                      : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      : 'bg-[#0b0c10]/40 border-zinc-800 text-zinc-200'
                    } ${getHighlightClasses('config-business-address')}`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-700/30 mb-4">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span>📍 Dirección del Negocio & Google Maps (QR en Tickets)</span>
                        </h4>
                        <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Configura la ubicación en cascada (País ➔ Estado ➔ Municipio ➔ C.P. ➔ Colonia ➔ Calle). Se auto-genera el formato del ticket y el código QR de Google Maps.
                        </p>
                      </div>
                    </div>

                    {/* Paso 1: País y Estado */}
                    <div className="mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isRetro ? (isLight ? 'text-blue-900' : 'text-blue-300') : 'text-amber-500'}`}>
                        Paso 1: País y Entidad Federativa (Estado / Región)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* País */}
                        <div className="space-y-1">
                          <label className={configLabelCls}>País</label>
                          <select
                            value={addressCountry || 'México'}
                            onChange={e => {
                              const newCountry = e.target.value;
                              setAddressCountry(newCountry);
                              let newState = addressState;
                              let newCity = addressCity;
                              if (newCountry === 'México') {
                                if (!MEXICO_STATES_DATA[addressState]) {
                                  newState = 'Michoacán';
                                  newCity = MEXICO_STATES_DATA['Michoacán'][0] || '';
                                  setAddressState(newState);
                                  setAddressCity(newCity);
                                }
                              }
                              const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, newCity, newState, addressZip, newCountry);
                              setAddress(full);
                            }}
                            onBlur={() => handleSaveTicketConfig({
                              addressCountry,
                              addressState,
                              addressCity,
                              address: buildFormattedAddress()
                            })}
                            className={`w-full text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                              isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                              : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                            }`}
                          >
                            {COUNTRIES_LIST.map(c => (
                              <option key={c.code} value={c.name}>
                                {c.flag} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Estado / Entidad Federativa */}
                        <div className="space-y-1">
                          <label className={configLabelCls}>Estado / Entidad Federativa</label>
                          {(!addressCountry || addressCountry === 'México') ? (
                            <select
                              value={addressState}
                              onChange={e => {
                                const val = e.target.value;
                                setAddressState(val);
                                const firstMun = MEXICO_STATES_DATA[val]?.[0] || '';
                                setAddressCity(firstMun);
                                const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, firstMun, val, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressState,
                                addressCity,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            >
                              <option value="">-- Selecciona un Estado --</option>
                              {Object.keys(MEXICO_STATES_DATA).map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          ) : addressCountry === 'Estados Unidos' ? (
                            <select
                              value={addressState}
                              onChange={e => {
                                const val = e.target.value;
                                setAddressState(val);
                                const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, addressCity, val, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressState,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            >
                              <option value="">-- Selecciona un Estado de EE.UU. --</option>
                              {USA_STATES_LIST.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Ej: Departamento, Provincia o Región"
                              value={addressState}
                              onChange={e => {
                                setAddressState(e.target.value);
                                const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, addressCity, e.target.value, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressState,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paso 2: Municipio / Alcaldía, Código Postal y Colonia */}
                    <div className="mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isRetro ? (isLight ? 'text-blue-900' : 'text-blue-300') : 'text-amber-500'}`}>
                        Paso 2: Municipio / Ciudad, Código Postal y Colonia
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Municipio / Ciudad */}
                        <div className="space-y-1">
                          <label className={configLabelCls}>Municipio / Ciudad / Alcaldía</label>
                          {(!addressCountry || addressCountry === 'México') && addressState && MEXICO_STATES_DATA[addressState] ? (
                            <select
                              value={addressCity}
                              onChange={e => {
                                const val = e.target.value;
                                setAddressCity(val);
                                const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, val, addressState, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressCity,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            >
                              <option value="">-- Selecciona Municipio --</option>
                              {MEXICO_STATES_DATA[addressState].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Ej: Tangancícuaro / Zamora / Morelia"
                              value={addressCity}
                              onChange={e => {
                                setAddressCity(e.target.value);
                                const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, e.target.value, addressState, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressCity,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            />
                          )}
                        </div>

                        {/* Código Postal */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className={configLabelCls}>Código Postal (C.P.)</label>
                            {isLoadingZip && (
                              <span className="text-[9px] text-amber-500 font-bold animate-pulse">
                                🔍 SEPOMEX...
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Ej: 59750"
                            maxLength={10}
                            value={addressZip}
                            onChange={e => {
                              setAddressZip(e.target.value);
                              const full = buildFormattedAddress(addressStreet, addressNumber, addressColonia, addressCity, addressState, e.target.value, addressCountry);
                              setAddress(full);
                            }}
                            onBlur={() => handleSaveTicketConfig({
                              addressZip,
                              address: buildFormattedAddress()
                            })}
                            className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                              isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                              : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                            }`}
                          />
                        </div>

                        {/* Colonia */}
                        <div className="space-y-1">
                          <label className={configLabelCls}>Colonia / Asentamiento</label>
                          {coloniaOptions.length > 0 ? (
                            <select
                              value={addressColonia}
                              onChange={e => {
                                const val = e.target.value;
                                setAddressColonia(val);
                                const full = buildFormattedAddress(addressStreet, addressNumber, val, addressCity, addressState, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressColonia,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            >
                              <option value="">-- Selecciona Colonia --</option>
                              {coloniaOptions.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Ej: Centro / La Huerta"
                              value={addressColonia}
                              onChange={e => {
                                setAddressColonia(e.target.value);
                                const full = buildFormattedAddress(addressStreet, addressNumber, e.target.value, addressCity, addressState, addressZip, addressCountry);
                                setAddress(full);
                              }}
                              onBlur={() => handleSaveTicketConfig({
                                addressColonia,
                                address: buildFormattedAddress()
                              })}
                              className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                                isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                                : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paso 3: Calle y Número */}
                    <div className="mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isRetro ? (isLight ? 'text-blue-900' : 'text-blue-300') : 'text-amber-500'}`}>
                        Paso 3: Calle y Número Exterior / Interior
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2 space-y-1">
                          <label className={configLabelCls}>Calle / Avenida / Calzada</label>
                          <input
                            type="text"
                            placeholder="Ej: Doctor Miguel Silva Nte"
                            value={addressStreet}
                            onChange={e => {
                              setAddressStreet(e.target.value);
                              const full = buildFormattedAddress(e.target.value, addressNumber, addressColonia, addressCity, addressState, addressZip, addressCountry);
                              setAddress(full);
                            }}
                            onBlur={() => handleSaveTicketConfig({
                              addressStreet,
                              address: buildFormattedAddress()
                            })}
                            className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                              isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                              : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={configLabelCls}>Número Ext. / Int. / Local</label>
                          <input
                            type="text"
                            placeholder="Ej: #219 / Local B"
                            value={addressNumber}
                            onChange={e => {
                              setAddressNumber(e.target.value);
                              const full = buildFormattedAddress(addressStreet, e.target.value, addressColonia, addressCity, addressState, addressZip, addressCountry);
                              setAddress(full);
                            }}
                            onBlur={() => handleSaveTicketConfig({
                              addressNumber,
                              address: buildFormattedAddress()
                            })}
                            className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                              isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                              : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dirección Completa Ensamblada */}
                    <div className="mb-4 pt-3 border-t border-zinc-700/30">
                      <div className="mb-1">
                        <label className={configLabelCls}>
                          Dirección Completa Formateada (Texto impreso en tickets)
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej: Doctor Miguel Silva Nte #219, Col. Centro, Tangancícuaro, Michoacán, C.P. 59750, México"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        onBlur={handleSaveTicketConfig}
                        className={`w-full text-xs px-2.5 py-2 font-mono font-semibold focus:outline-none ${
                          isRetro
                            ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none'
                            : isLight
                              ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-amber-400 rounded'
                        }`}
                      />
                    </div>

                    {/* Google Maps Link & QR Section */}
                    <div className={`p-3.5 rounded-xl border ${
                      isRetro
                        ? (isLight ? 'bg-white border-zinc-300' : 'bg-[#121418] border-zinc-800')
                        : isLight
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                            <span>🗺️ Enlace de Google Maps & Código QR</span>
                          </span>
                          <p className={`text-[10px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            Se auto-genera automáticamente desde tu dirección física, o puedes pegar un enlace personalizado.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {googleMapsLink && (
                            <button
                              type="button"
                              onClick={handleOpenGoogleMaps}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                                isRetro
                                  ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-black border-r-black hover:bg-[#0000a0]'
                                  : isLight
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                    : 'bg-blue-600/80 hover:bg-blue-600 text-white'
                              }`}
                            >
                              <span>📍 Probar / Abrir Maps</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full space-y-1">
                        <input
                          type="text"
                          placeholder="Ej: https://maps.app.goo.gl/... o https://www.google.com/maps/search/?api=1&query=..."
                          value={googleMapsLink}
                          onChange={e => setGoogleMapsLink(e.target.value)}
                          onBlur={handleSaveTicketConfig}
                          className={`w-full text-xs px-2.5 py-2 font-mono focus:outline-none ${
                            isRetro
                              ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                              : isLight
                                ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                          }`}
                        />
                        <p className={`text-[10px] leading-tight ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          💡 Puedes activar o desactivar la impresión del Código QR del mapa en tus tickets desde la configuración de <span className="font-bold">Impresión / Tickets</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Redes Sociales */}
                  <div
                    id="config-business-social"
                    className={`mt-5 p-4 border rounded-xl transition-all duration-1000 ${
                      isRetro ? (isLight ? 'bg-[#f0f0f0] border-zinc-400 text-zinc-900' : 'bg-[#181a1f] border-zinc-700 text-zinc-200')
                      : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      : 'bg-[#0b0c10]/40 border-zinc-800 text-zinc-200'
                    } ${getHighlightClasses('config-business-social')}`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-700/30 mb-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          Redes Sociales en Tickets
                        </h4>
                        <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>
                          Ingresa tus enlaces o usuarios de redes sociales. Se imprimirán en el pie de tus comprobantes si están configurados.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Facebook */}
                      <div className="space-y-1">
                        <label className={configLabelCls}>Facebook</label>
                        <input
                          type="text"
                          placeholder="Ej: facebook.com/smartec"
                          value={socialFacebook}
                          onChange={e => setSocialFacebook(e.target.value)}
                          onBlur={handleSaveTicketConfig}
                          className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                            isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                            : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                            : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                          }`}
                        />
                      </div>

                      {/* Instagram */}
                      <div className="space-y-1">
                        <label className={configLabelCls}>Instagram</label>
                        <input
                          type="text"
                          placeholder="Ej: @smartec_taller"
                          value={socialInstagram}
                          onChange={e => setSocialInstagram(e.target.value)}
                          onBlur={handleSaveTicketConfig}
                          className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                            isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                            : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                            : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                          }`}
                        />
                      </div>

                      {/* TikTok */}
                      <div className="space-y-1">
                        <label className={configLabelCls}>TikTok</label>
                        <input
                          type="text"
                          placeholder="Ej: @smartec_oficial"
                          value={socialTiktok}
                          onChange={e => setSocialTiktok(e.target.value)}
                          onBlur={handleSaveTicketConfig}
                          className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                            isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold'
                            : isLight ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md'
                            : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Horario de Atención */}
                  <div
                    id="config-business-hours"
                    className={`mt-5 p-4 border rounded-xl transition-all duration-1000 ${
                      isRetro ? (isLight ? 'bg-[#f0f0f0] border-zinc-400 text-zinc-900' : 'bg-[#181a1f] border-zinc-700 text-zinc-200')
                      : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      : 'bg-[#0b0c10]/40 border-zinc-800 text-zinc-200'
                    } ${getHighlightClasses('config-business-hours')}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-700/30 mb-3 gap-2">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          Horarios de Atención de la Sucursal
                        </h4>
                        <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>
                          Configura el horario día por día o escribe un texto personalizado. Se mostrará en tus comprobantes y PDF.
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={!!businessHours}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const defaultJson = JSON.stringify({
                                lunes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                martes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                miercoles: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                jueves: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                viernes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                sabado: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '14:00' },
                                domingo: { isOpen: false, type: 'closed' }
                              });
                              setBusinessHours(defaultJson);
                              onUpdateConfig({ ...config, businessHours: defaultJson });
                            } else {
                              setBusinessHours('');
                              onUpdateConfig({ ...config, businessHours: '' });
                            }
                          }}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20 accent-amber-500 cursor-pointer"
                        />
                        <span>Habilitar Horario</span>
                      </label>
                    </div>

                    {!businessHours ? (
                      <div className="py-6 text-center text-zinc-500 text-xs italic">
                        El horario de atención está desactivado. No se incluirá en tickets ni comprobantes de PDF.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Selector de Modo */}
                        <div className={`flex gap-1.5 p-1 rounded-lg w-fit border ${
                          isRetro ? 'bg-zinc-200 border-zinc-400'
                          : isLight ? 'bg-zinc-100 border-zinc-200'
                          : 'bg-black/20 border-zinc-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              const defaultJson = JSON.stringify({
                                lunes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                martes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                miercoles: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                jueves: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                viernes: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '19:00' },
                                sabado: { isOpen: true, type: 'continuous', openTime: '09:00', closeTime: '14:00' },
                                domingo: { isOpen: false, type: 'closed' }
                              });
                              setBusinessHours(defaultJson);
                              onUpdateConfig({ ...config, businessHours: defaultJson });
                            }}
                            className={`px-3 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                              businessHours.trim().startsWith('{')
                                ? (isRetro ? 'bg-zinc-700 text-white shadow' : 'bg-amber-500 text-black shadow')
                                : 'text-zinc-450 hover:text-white'
                            }`}
                          >
                            📅 Formato Día por Día
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const initialText = manualHoursText || 'Lunes a Viernes de 9:00 a.m. a 7:00 p.m. / Sábados de 9:00 a.m. a 2:00 p.m.';
                              setManualHoursText(initialText);
                              setBusinessHours(initialText);
                              onUpdateConfig({ ...config, businessHours: initialText });
                            }}
                            className={`px-3 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                              !businessHours.trim().startsWith('{')
                                ? (isRetro ? 'bg-zinc-700 text-white shadow' : 'bg-amber-500 text-black shadow')
                                : 'text-zinc-450 hover:text-white'
                            }`}
                          >
                            ✍️ Texto Personalizado
                          </button>
                        </div>

                        {!businessHours.trim().startsWith('{') ? (
                          <div className="space-y-2">
                            <label className="text-[10px] text-zinc-400 font-bold block">
                              Escribe tu horario tal como quieres que aparezca (puedes usar saltos de línea):
                            </label>
                            <textarea
                              value={manualHoursText}
                              onChange={(e) => {
                                setManualHoursText(e.target.value);
                                setBusinessHours(e.target.value);
                                onUpdateConfig({ ...config, businessHours: e.target.value });
                              }}
                              placeholder="Ej: Lunes a Domingo de 9:00 a.m. a 8:00 p.m."
                              rows={3}
                              className={`w-full text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isRetro
                                  ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 font-bold'
                                  : isLight
                                    ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md shadow-sm'
                                    : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded shadow-inner'
                              }`}
                            />
                            <p className="text-[9px] text-zinc-500 italic">
                              Este texto se mostrará directamente al pie de tus comprobantes de venta.
                            </p>
                          </div>
                        ) : (
                          <>
                            {!isEditingSchedule ? (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
                                <div className="flex-1">
                                  <table className="text-xs border-collapse font-medium">
                                    <tbody>
                                      {(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const).map(dayKey => {
                                        const dayLabels: Record<string, string> = {
                                          lunes: 'Lunes',
                                          martes: 'Martes',
                                          miercoles: 'Miércoles',
                                          jueves: 'Jueves',
                                          viernes: 'Viernes',
                                          sabado: 'Sábado',
                                          domingo: 'Domingo'
                                        };
                                        const s = weeklySchedule[dayKey];
                                        let timeStr = 'Cerrado';
                                        if (s && s.isOpen) {
                                          const convertTo12HourStr = (timeStr: string | undefined): string => {
                                            if (!timeStr) return '';
                                            const parts = timeStr.split(':');
                                            if (parts.length < 2) return timeStr;
                                            let hour = parseInt(parts[0], 10);
                                            const minute = parts[1];
                                            if (isNaN(hour)) return timeStr;
                                            const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
                                            hour = hour % 12;
                                            if (hour === 0) hour = 12;
                                            return `${hour}:${minute} ${ampm}`;
                                          };
                                          if (s.type === 'split') {
                                            const t1Open = s.openTime || '09:00';
                                            const t1Close = s.closeTime || '14:00';
                                            const t2Open = s.openTime2 || '16:00';
                                            const t2Close = s.closeTime2 || '19:00';
                                            timeStr = `${convertTo12HourStr(t1Open)} - ${convertTo12HourStr(t1Close)} / ${convertTo12HourStr(t2Open)} - ${convertTo12HourStr(t2Close)}`;
                                          } else {
                                            const open = s.openTime || '09:00';
                                            const close = s.closeTime || '19:00';
                                            timeStr = `${convertTo12HourStr(open)} - ${convertTo12HourStr(close)}`;
                                          }
                                        }
                                        const isClosed = timeStr === 'Cerrado';
                                        return (
                                          <tr key={dayKey} className={isClosed ? 'opacity-50 italic' : ''}>
                                            <td className={`pr-4 py-0.5 font-bold text-right border-r w-24 ${
                                              isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                                            }`}>{dayLabels[dayKey]}</td>
                                            <td className="pl-4 py-0.5 text-left">{timeStr}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingSchedule(true)}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                                      isRetro ? 'bg-zinc-300 border-2 border-white text-black'
                                      : 'bg-amber-500 hover:bg-amber-600 text-black'
                                    }`}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Configurar Horarios</span>
                                  </button>
                                </div>
                              </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={`border-b ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                                <th className={`pb-2 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Día</th>
                                <th className={`pb-2 text-[10px] font-bold uppercase tracking-wider px-2 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Tipo de Turno</th>
                                <th className={`pb-2 text-[10px] font-bold uppercase tracking-wider px-2 text-right ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Horas de Servicio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {renderDayScheduleRow('lunes', 'Lunes')}
                              {renderDayScheduleRow('martes', 'Martes')}
                              {renderDayScheduleRow('miercoles', 'Miércoles')}
                              {renderDayScheduleRow('jueves', 'Jueves')}
                              {renderDayScheduleRow('viernes', 'Viernes')}
                              {renderDayScheduleRow('sabado', 'Sábado')}
                              {renderDayScheduleRow('domingo', 'Domingo')}
                            </tbody>
                          </table>
                        </div>
                        <div className={`flex justify-end mt-4 pt-3 border-t ${
                          isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setIsEditingSchedule(false)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                              isRetro ? 'bg-zinc-300 border-2 border-white text-black'
                              : 'bg-amber-500 hover:bg-amber-600 text-black'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Listo, Guardar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

                  {/* Configuración de Moneda y Tasa */}
                  <div
                    id="config-business-currency"
                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-1000 border ${getHighlightClasses('config-business-currency')}`}
                  >
                    <div className="space-y-1">
                      <label className={configLabelCls}>Símbolo Monetario</label>
                      <select
                        value={currencySymbol}
                        onChange={e => setCurrencySymbol(e.target.value)}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                          isRetro 
                            ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                            : isLight 
                              ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                        }`}
                      >
                        <option value="$">Peso Mexicano ($)</option>
                        <option value="USD $">Dolar Estadounidense (USD $)</option>
                        <option value="€">Euro (€)</option>
                        <option value="Q">Quetzal (Q)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={configLabelCls}>Tasa de Impuestos (I.V.A decimal)</label>
                      <div className={`flex items-center gap-3 px-2.5 py-1 h-[34px] ${
                        isRetro 
                          ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                          : isLight 
                            ? 'bg-white border border-zinc-200 text-zinc-900 focus-within:border-amber-500 rounded-md' 
                            : 'bg-[#08080a] border border-[#2d2f36] focus-within:border-amber-500 rounded'
                      }`}>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={taxRate}
                          onChange={e => setTaxRate(Number(e.target.value) || 0.16)}
                          className={`w-12 bg-transparent focus:outline-none text-xs font-mono font-bold ${
                            isRetro || isLight ? 'text-zinc-900' : 'text-white'
                          }`}
                        />
                        <div className={`w-px h-4 ${isRetro || isLight ? 'bg-zinc-200' : 'bg-[#23252f]'}`}></div>
                        <label htmlFor="showTaxRateToggle" className={`flex items-center gap-1.5 text-[10px] cursor-pointer select-none ${
                          isRetro || isLight ? 'text-zinc-500 hover:text-black font-bold' : 'text-zinc-400 hover:text-white'
                        }`}>
                          <input
                            id="showTaxRateToggle"
                            type="checkbox"
                            checked={showTaxRate}
                            onChange={e => setShowTaxRate(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[#2d2f36] bg-[#0c0c0e] text-amber-500 focus:ring-amber-500/20 accent-amber-500 cursor-pointer"
                          />
                          <span>Ver desglose</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {globalSubTab === 'logos' && (
                <div className="space-y-4 animate-fade-in">
                  <span className={configLabelCls}>Logotipos de la Marca</span>
                  <div
                    id="config-logo-main"
                    className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 transition-all duration-1000 border ${getHighlightClasses('config-logo-main')}`}
                  >
                    {([
                      { id: 'system-logo-uploader', label: 'Logo del Sistema', sub: 'Pantallas de la aplicación y login general.', url: logoUrl, onChange: handleLogoUpload, onClear: () => setLogoUrl('') },
                      { id: 'ticket-logo-uploader', label: 'Logo de Ticket Térmico', sub: 'Para tiques rápidos de POS y rollos térmicos de 58/80mm.', url: ticketLogoUrl, onChange: handleTicketLogoUpload, onClear: () => setTicketLogoUrl('') },
                      { id: 'mediacarta-logo-uploader', label: 'Logo de Formatos Media Carta', sub: 'Optimizado para impresiones láser de servicio y recepción.', url: mediaCartaLogoUrl, onChange: handleMediaCartaLogoUpload, onClear: () => setMediaCartaLogoUrl('') },
                      { id: 'quote2-logo-uploader', label: 'Logo 2 (Derecho) de Cotizaciones A4', sub: 'Logotipo secundario para cotizaciones en formato A4.', url: quoteSecondLogoUrl, onChange: handleQuoteSecondLogoUpload, onClear: () => setQuoteSecondLogoUrl('') },
                      { id: 'label-logo-uploader', label: 'Logo de la Etiqueta', sub: 'Para las pequeñas etiquetas adhesivas térmicas de equipos y etiquetas de productos.', url: labelLogoUrl, onChange: handleLabelLogoUpload, onClear: () => setLabelLogoUrl('') },
                    ]).map(lg => (
                      <div key={lg.id} className={`flex items-center gap-2.5 p-2 rounded-lg border ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/30 border-zinc-800'}`}>
                        <input type="file" accept="image/*" id={lg.id} onChange={lg.onChange} className="hidden" />
                        <label htmlFor={lg.id} className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer overflow-hidden transition-all ${
                          lg.url ? (isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-700') : (isRetro ? 'border-zinc-400 hover:border-zinc-500' : isLight ? 'border-zinc-300 hover:border-zinc-400' : 'border-zinc-700 hover:border-zinc-500')
                        }`}>
                          {lg.url ? <img src={lg.url} className="w-full h-full object-contain p-0.5" /> : <Image className={`w-4 h-4 ${isRetro || isLight ? 'text-zinc-300' : 'text-zinc-700'}`} />}
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[9.5px] font-black truncate leading-none ${isRetro || isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{lg.label}</p>
                          <p className={`text-[8.5px] truncate mb-0.5 mt-0.5 leading-none ${isRetro || isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{lg.sub}</p>
                          <div className="flex gap-2 leading-none">
                            <label htmlFor={lg.id} className={`text-[8.5px] font-bold cursor-pointer ${isRetro || isLight ? 'text-sky-600 hover:text-sky-800' : 'text-sky-500 hover:text-sky-400'}`}>{lg.url ? '↺ Cambiar' : '↑ Subir'}</label>
                            {lg.url && <button type="button" onClick={lg.onClear} className={`text-[8.5px] font-bold cursor-pointer ${isRetro || isLight ? 'text-red-500 hover:text-red-700' : 'text-red-500 hover:text-red-400'}`}>✕ Quitar</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {globalSubTab === 'system' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      id="config-business-goal"
                      className={`space-y-1 p-2 transition-all duration-1000 border ${getHighlightClasses('config-business-goal')}`}
                    >
                      <label className={configLabelCls}>Meta Diaria de Ventas</label>
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${
                        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-white border-zinc-200' : 'bg-[#08080a] border-[#2d2f36]'
                      }`}>
                        <span className={`text-xs font-bold ${isRetro || isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{config.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={metaDiariaVentas || ''}
                          onChange={e => setMetaDiariaVentas(Math.max(0, Number(e.target.value) || 0))}
                          placeholder="0 = sin meta"
                          className={`flex-1 bg-transparent focus:outline-none text-xs font-mono font-bold ${isRetro || isLight ? 'text-zinc-900' : 'text-white'}`}
                        />
                      </div>
                      <p className={`text-[9px] ${isRetro || isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        El empleado verá una barra de progreso en la barra superior. Pon 0 para desactivar.
                      </p>
                    </div>

                    <div className="space-y-1 p-2 border border-transparent">
                      <label className={configLabelCls}>Límite de Crédito por Defecto</label>
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${
                        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-white border-zinc-200' : 'bg-[#08080a] border-[#2d2f36]'
                      }`}>
                        <span className={`text-xs font-bold ${isRetro || isLight ? 'text-zinc-500' : 'text-zinc-550'}`}>{config.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          value={defaultCreditLimit}
                          onChange={e => setDefaultCreditLimit(Math.max(0, Number(e.target.value) || 0))}
                          placeholder="Ej: 1000"
                          className={`flex-1 bg-transparent focus:outline-none text-xs font-mono font-bold ${isRetro || isLight ? 'text-zinc-900' : 'text-white'}`}
                        />
                      </div>
                      <p className={`text-[9px] ${isRetro || isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Límite inicial global para clientes creados en el POS.
                      </p>
                    </div>

                    <div
                      id="config-system-theme"
                      className={`col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-2 transition-all duration-1000 border ${getHighlightClasses('config-system-theme')}`}
                    >
                      <div className="space-y-1">
                        <label className={configLabelCls}>Pantalla de Inicio por Defecto</label>
                        <select
                          value={defaultStartView}
                          onChange={e => setDefaultStartView(e.target.value as 'Panel' | 'POS' | 'Nueva')}
                          className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                            isRetro 
                              ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                              : isLight 
                                ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                                : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                          }`}
                        >
                          {enableTaller && <option value="Panel">Resumen de Órdenes (Panel)</option>}
                          {enablePOS && <option value="POS">Punto de Venta / Caja (POS)</option>}
                          {enableTaller && <option value="Nueva">Nueva Orden de Servicio</option>}
                        </select>
                      </div>

                    <div className="space-y-1">
                      <label className={configLabelCls}>Pantalla Completa por Defecto</label>
                      <select
                        value={defaultFullscreen ? 'true' : 'false'}
                        onChange={e => setDefaultFullscreen(e.target.value === 'true')}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                          isRetro 
                            ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                            : isLight 
                              ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                        }`}
                      >
                        <option value="false">Desactivado (Normal)</option>
                        <option value="true">Activado (Al Hacer Clic)</option>
                      </select>
                    </div>
                    </div>
                  </div>

                  <div
                    id="config-system-zoom"
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-1000 border ${getHighlightClasses('config-system-zoom')}`}
                  >
                    <div className="space-y-1">
                      <label className={configLabelCls}>Zoom / Escala de Interfaz</label>
                      <select
                        value={appZoomLevel.toString()}
                        onChange={e => {
                          const val = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
                          setAppZoomLevel(val);
                        }}
                        className={`w-full text-xs px-2.5 py-1.5 focus:outline-none ${
                          isRetro 
                            ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none font-bold' 
                            : isLight 
                              ? 'bg-white border border-zinc-200 text-zinc-900 focus:border-amber-500 rounded-md' 
                              : 'bg-[#08080a] border border-[#2d2f36] focus:border-amber-500 text-white rounded'
                        }`}
                      >
                        <option value="auto">Automático (Recomendado)</option>
                        <option value="0.75">75% (Muy Compacto)</option>
                        <option value="0.80">80%</option>
                        <option value="0.85">85%</option>
                        <option value="0.90">90% (Compacto)</option>
                        <option value="0.95">95%</option>
                        <option value="1.00">100% (Normal - Grande)</option>
                        <option value="1.05">105%</option>
                        <option value="1.10">110%</option>
                        <option value="1.15">115%</option>
                        <option value="1.20">120% (Muy Grande)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={configLabelCls}>Soporte Remoto</label>
                      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded border ${
                        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-white border-zinc-200' : 'bg-[#08080a] border-[#2d2f36]'
                      }`}>
                        <span className={`text-[10.5px] font-bold ${isRetro || isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                          Permitir Acceso Desatendido
                        </span>
                        <input
                          type="checkbox"
                          checked={unattendedSupportEnabled}
                          onChange={e => setUnattendedSupportEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-750 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tema del sistema */}
                  <div className="space-y-2 pt-2">
                    <label className={configLabelCls}>Tema del Sistema</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([
                        {
                          value: 'modern' as const,
                          label: 'Moderno Oscuro',
                          preview: (
                            <div className="w-full h-full bg-[#0c0d11] rounded-t flex flex-col overflow-hidden">
                              <div className="h-3 bg-[#11131e] flex items-center px-1.5 gap-1 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" /><div className="w-1.5 h-1.5 rounded-full bg-zinc-700" /><div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                              </div>
                              <div className="flex flex-1 gap-0.5 p-0.5">
                                <div className="w-5 bg-[#111318] rounded-sm flex flex-col gap-0.5 p-0.5">
                                  {[...Array(4)].map((_,i) => <div key={i} className="h-1 rounded-full bg-zinc-700" />)}
                                </div>
                                <div className="flex-1 flex flex-col gap-0.5">
                                  <div className="h-2 bg-zinc-800 rounded-sm" />
                                  <div className="flex gap-0.5 flex-1">
                                    <div className="flex-1 bg-zinc-800/60 rounded-sm" />
                                    <div className="flex-1 bg-zinc-800/60 rounded-sm" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          value: 'retro-window' as const,
                          label: 'Retro Win 95',
                          preview: (
                            <div className="w-full h-full bg-[#008080] rounded-t flex flex-col overflow-hidden">
                              <div className="h-2.5 bg-zinc-400 flex items-center justify-between px-1 shrink-0">
                                <div className="flex gap-0.5">
                                  {[...Array(3)].map((_,i) => <div key={i} className="w-1.5 h-1 bg-zinc-300 border border-zinc-500 text-[3px] flex items-center justify-center" />)}
                                </div>
                                <div className="text-[4px] font-black text-zinc-700">FixManager</div>
                              </div>
                              <div className="flex-1 p-0.5 flex flex-col gap-0.5">
                                <div className="bg-[#000080] h-2 flex items-center px-1"><span className="text-[4px] text-white font-black">📁 Órdenes</span></div>
                                <div className="flex gap-0.5 flex-1">
                                  <div className="flex-1 bg-white border border-zinc-400 rounded-none p-0.5 flex flex-col gap-0.5">
                                    {[...Array(3)].map((_,i) => <div key={i} className="h-0.5 bg-zinc-300 rounded-none" />)}
                                  </div>
                                  <div className="flex-1 bg-[#dfdfdf] border border-zinc-400 p-0.5" />
                                </div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          value: 'fluent' as const,
                          label: 'Fluent (Win 11)',
                          preview: (
                            <div className="w-full h-full bg-[#f3f3f3] rounded-t flex flex-col overflow-hidden">
                              <div className="h-3 bg-white flex items-center px-1.5 gap-1 shrink-0 border-b border-zinc-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" /><div className="w-1.5 h-1.5 rounded-full bg-zinc-300" /><div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                              </div>
                              <div className="flex flex-1 gap-0.5 p-0.5">
                                <div className="w-5 bg-white rounded-sm flex flex-col gap-0.5 p-0.5 border border-zinc-100">
                                  {[...Array(4)].map((_,i) => <div key={i} className="h-1 rounded-full bg-zinc-200" />)}
                                </div>
                                <div className="flex-1 flex flex-col gap-0.5">
                                  <div className="h-2 bg-[#1a3a6b] rounded-sm" />
                                  <div className="flex gap-0.5 flex-1">
                                    <div className="flex-1 bg-white rounded-sm border border-zinc-100" />
                                    <div className="flex-1 bg-white rounded-sm border border-zinc-100" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                      ]).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => {
                            const newMode = (opt.value === 'retro-window' || opt.value === 'fluent') ? 'light' : 'dark';
                            setTheme(opt.value);
                            setThemeMode(newMode);
                            onUpdateConfig({ ...config, theme: opt.value, themeMode: newMode });
                          }}
                          className={`rounded-lg border-2 overflow-hidden transition-all cursor-pointer flex flex-col ${
                            theme === opt.value
                              ? isRetro ? 'border-[#000080]' : isLight ? 'border-blue-500' : 'border-amber-500'
                              : isRetro ? 'border-zinc-300 hover:border-zinc-400' : isLight ? 'border-zinc-200 hover:border-zinc-300' : 'border-zinc-700 hover:border-zinc-500'
                          }`}>
                          <div className="h-16 w-full">{opt.preview}</div>
                          <div className={`px-2 py-1 flex items-center justify-between w-full ${
                            isRetro ? 'bg-white' : isLight ? 'bg-zinc-50' : 'bg-zinc-900'
                          }`}>
                            <span className={`text-[9px] font-black uppercase tracking-wide ${
                              theme === opt.value
                                ? isRetro ? 'text-[#000080]' : isLight ? 'text-blue-600' : 'text-amber-400'
                                : isRetro || isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}>{opt.label}</span>
                            {theme === opt.value && <span className="text-[8px]">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variante de Color (Modo) */}
                  <div className="space-y-2 pt-2">
                    <label className={`text-[10px] uppercase font-bold block mb-2 tracking-wider ${
                      isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-500 font-bold' : 'text-zinc-300'
                    }`}>Variante de Color (Modo)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: 'light', label: '☀️ Claro' },
                        { value: 'dark', label: '🌙 Oscuro' }
                      ]).map(modeOpt => (
                        <button
                          key={modeOpt.value}
                          type="button"
                          onClick={() => {
                            const newMode = modeOpt.value as 'light' | 'dark';
                            setThemeMode(newMode);
                            onUpdateConfig({ ...config, themeMode: newMode });
                          }}
                          className={`px-4 py-2 text-xs font-bold border transition-all cursor-pointer ${
                            themeMode === modeOpt.value
                              ? isRetro
                                ? isLight
                                  ? 'bg-[#dde4f0] border-2 border-[#000080] text-zinc-900 font-black rounded-none shadow-none'
                                  : 'bg-blue-950 border-2 border-blue-500 text-white rounded-none shadow-none'
                                : isLight
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 rounded-lg'
                                  : 'bg-amber-950/30 border-amber-500 text-amber-400 rounded-lg'
                              : isRetro
                                ? isLight
                                  ? 'bg-white border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100 rounded-none'
                                  : 'bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-none'
                                : isLight
                                  ? 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg'
                                  : 'bg-[#08080a] border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 rounded-lg'
                          }`}
                        >
                          {modeOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {globalSubTab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  {/* Columna de Modo del Taller */}
                  <div
                    id="config-modules-workshopmode"
                    className={`space-y-4 transition-all duration-1000 border ${getHighlightClasses('config-modules-workshopmode')}`}
                  >
                    <div className="space-y-2">
                      <span className={configLabelCls}>Modo del Taller</span>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { value: 'personal' as const, icon: '🔧', label: 'Personal', desc: 'Único técnico — sin botón Reparar' },
                          { value: 'team'     as const, icon: '👥', label: 'Equipo',   desc: 'Múltiples técnicos — con botón Reparar' },
                        ]).map(opt => (
                          <button key={opt.value} type="button"
                            onClick={() => opt.value !== workshopMode && setWorkshopModeConfirm(opt.value)}
                            className={`p-2.5 rounded text-left border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                              workshopMode === opt.value
                                ? isRetro ? (isLight ? 'border-[#000080] bg-[#dde4f0]' : 'border-blue-500 bg-[#383c48]') : isLight ? 'border-blue-500 bg-blue-50' : 'border-violet-500 bg-violet-950/30'
                                : isRetro ? (isLight ? 'border-zinc-300 bg-white hover:border-zinc-400' : 'border-zinc-800 bg-[#252730] hover:border-zinc-700') : isLight ? 'border-zinc-200 bg-white hover:border-zinc-300' : 'border-zinc-700 bg-zinc-800/40 hover:border-violet-900/50'
                            }`}>
                            <span className="text-sm">{opt.icon}</span>
                            <span className={`text-[10px] font-black uppercase tracking-wide ${
                              isRetro 
                                ? (workshopMode === opt.value
                                    ? (isLight ? 'text-zinc-900' : 'text-white')
                                    : (isLight ? 'text-zinc-700' : 'text-zinc-300'))
                                : isLight ? 'text-zinc-700' : 'text-zinc-200'
                            }`}>{opt.label}</span>
                            <span className={`text-[9px] leading-tight ${
                              isRetro 
                                ? (workshopMode === opt.value
                                    ? (isLight ? 'text-zinc-650' : 'text-zinc-200')
                                    : (isLight ? 'text-zinc-500' : 'text-zinc-400'))
                                : isLight ? 'text-zinc-400' : 'text-zinc-500'
                            }`}>{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Módulos Activos */}
                  <div
                    id="config-modules-active"
                    className={`space-y-4 transition-all duration-1000 border ${getHighlightClasses('config-modules-active')}`}
                  >
                    <div className="space-y-2">
                      <span className={configLabelCls}>Módulos Activos</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button 
                          type="button"
                          onClick={handleToggleTaller}
                          className={`p-2.5 rounded text-left border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                            enableTaller
                              ? isRetro ? (isLight ? 'border-[#000080] bg-[#dde4f0]' : 'border-blue-500 bg-[#383c48]') : isLight ? 'border-blue-500 bg-blue-50' : 'border-violet-500 bg-violet-950/30'
                              : isRetro ? (isLight ? 'border-zinc-300 bg-white hover:border-zinc-400' : 'border-zinc-800 bg-[#252730] hover:border-zinc-700') : isLight ? 'border-zinc-200 bg-[#fafafa] text-zinc-450' : 'border-zinc-800 bg-zinc-900/40 text-zinc-600'
                          }`}
                        >
                          <span className="text-sm">🔧</span>
                          <span className={`text-[10px] font-black uppercase tracking-wide ${
                            !enableTaller 
                              ? 'text-zinc-500 line-through opacity-70' 
                              : isRetro 
                                ? (isLight ? 'text-zinc-900' : 'text-white') 
                                : isLight ? 'text-zinc-700' : 'text-zinc-200'
                          }`}>Taller</span>
                          <span className={`text-[9px] leading-tight font-medium ${
                            isRetro 
                              ? (enableTaller 
                                  ? (isLight ? 'text-zinc-650' : 'text-zinc-200') 
                                  : (isLight ? 'text-zinc-450' : 'text-zinc-500'))
                              : !enableTaller ? 'text-zinc-500' : isLight ? 'text-zinc-605' : 'text-zinc-405'
                          }`}>Reparaciones, Órdenes de Servicio y Cotizaciones.</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleTogglePOS}
                          className={`p-2.5 rounded text-left border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                            enablePOS
                              ? isRetro ? (isLight ? 'border-[#000080] bg-[#dde4f0]' : 'border-blue-500 bg-[#383c48]') : isLight ? 'border-blue-500 bg-blue-50' : 'border-violet-500 bg-violet-950/30'
                              : isRetro ? (isLight ? 'border-zinc-300 bg-white hover:border-zinc-400' : 'border-zinc-800 bg-[#252730] hover:border-zinc-700') : isLight ? 'border-zinc-200 bg-[#fafafa] text-zinc-450' : 'border-zinc-800 bg-zinc-900/40 text-zinc-600'
                          }`}
                        >
                          <span className="text-sm">🛒</span>
                          <span className={`text-[10px] font-black uppercase tracking-wide ${
                            !enablePOS 
                              ? 'text-zinc-500 line-through opacity-70' 
                              : isRetro 
                                ? (isLight ? 'text-zinc-900' : 'text-white') 
                                : isLight ? 'text-zinc-700' : 'text-zinc-200'
                          }`}>Tienda / POS</span>
                          <span className={`text-[9px] leading-tight font-medium ${
                            isRetro 
                              ? (enablePOS 
                                  ? (isLight ? 'text-zinc-650' : 'text-zinc-200') 
                                  : (isLight ? 'text-zinc-450' : 'text-zinc-500'))
                              : !enablePOS ? 'text-zinc-500' : isLight ? 'text-zinc-605' : 'text-zinc-405'
                          }`}>Punto de Venta, Productos, Inventario y Ventas.</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleToggleWarehouses}
                          className={`p-2.5 rounded text-left border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                            enableWarehouses
                              ? isRetro ? (isLight ? 'border-[#000080] bg-[#dde4f0]' : 'border-blue-500 bg-[#383c48]') : isLight ? 'border-amber-500 bg-amber-50' : 'border-amber-500 bg-amber-950/30'
                              : isRetro ? (isLight ? 'border-zinc-300 bg-white hover:border-zinc-400' : 'border-zinc-800 bg-[#252730] hover:border-zinc-700') : isLight ? 'border-zinc-200 bg-[#fafafa] text-zinc-450' : 'border-zinc-800 bg-zinc-900/40 text-zinc-600'
                          }`}
                        >
                          <span className="text-sm">🏢</span>
                          <span className={`text-[10px] font-black uppercase tracking-wide ${
                            !enableWarehouses 
                              ? 'text-zinc-500 line-through opacity-70' 
                              : isRetro 
                                ? (isLight ? 'text-zinc-900' : 'text-white') 
                                : isLight ? 'text-zinc-700' : 'text-zinc-200'
                          }`}>Bodegas / Almacenes</span>
                          <span className={`text-[9px] leading-tight font-medium ${
                            isRetro 
                              ? (enableWarehouses 
                                  ? (isLight ? 'text-zinc-650' : 'text-zinc-200') 
                                  : (isLight ? 'text-zinc-450' : 'text-zinc-500'))
                              : !enableWarehouses ? 'text-zinc-500' : isLight ? 'text-zinc-605' : 'text-zinc-405'
                          }`}>Múltiples sucursales, traspasos y stock distribuido.</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visibilidad de Módulos */}
                  <div
                    id="modules-visibility-section"
                    className={`col-span-1 md:col-span-2 p-3.5 rounded-xl border transition-all duration-1000 space-y-3 ${
                      (highlightModulesArea || activeHighlightId === 'modules-visibility-section')
                        ? isRetro
                          ? 'border-[#000080] bg-[#dde4f0] shadow-md scale-[1.008]'
                          : isLight
                            ? 'border-blue-500 bg-blue-50/40 shadow-[0_0_20px_rgba(59,130,246,0.22)] scale-[1.008]'
                            : 'border-violet-500 bg-violet-950/20 shadow-[0_0_25px_rgba(139,92,246,0.28)] scale-[1.008]'
                        : isRetro
                          ? 'border-transparent bg-transparent border-t-2 border-t-zinc-400 border-dashed'
                          : isLight
                            ? 'border-transparent bg-transparent border-t border-t-zinc-300/80 border-dashed'
                            : 'border-transparent bg-transparent border-t border-t-zinc-700/50 border-dashed'
                    }`}
                  >
                    <span className={configLabelCls}>
                      👁️ Ocultar / Mostrar Módulos (Menú Lateral)
                    </span>
                    <p className={`text-[10px] leading-normal ${isRetro || isLight ? 'text-zinc-650 font-medium' : 'text-zinc-400'}`}>
                      Personaliza tu menú lateral activando o desactivando la visibilidad de cada opción de forma independiente. Esto es puramente visual; todos los módulos siguen conectados en segundo plano.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1 pb-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAllModules(true)}
                        className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                          isRetro
                            ? 'border-2 border-t-white border-l-white border-b-zinc-450 border-r-zinc-450 bg-[#e0e0e0] text-zinc-900 active:border-t-zinc-450 active:border-l-zinc-450 active:border-b-white active:border-r-white'
                            : isLight
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                              : 'bg-violet-600 hover:bg-violet-700 text-white shadow'
                        }`}
                      >
                        👁️ Mostrar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllModules(false)}
                        className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                          isRetro
                            ? 'border-2 border-t-white border-l-white border-b-zinc-450 border-r-zinc-450 bg-[#e0e0e0] text-zinc-600 active:border-t-zinc-450 active:border-l-zinc-450 active:border-b-white active:border-r-white'
                            : isLight
                              ? 'bg-slate-200 hover:bg-slate-350 text-slate-700 border border-slate-350/40 shadow-sm'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 shadow'
                        }`}
                      >
                        🙈 Ocultar Todos
                      </button>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          title: '🛒 MÓDULOS DE TIENDA',
                          items: [
                            { id: 'POS', label: 'POS', icon: '🛒' },
                            ...(config.taecelEnabled === true ? [{ id: 'Recargas', label: 'Recargas', icon: '📱' }] : []),
                            { id: 'Ventas', label: 'Ventas', icon: '📈' },
                            { id: 'Fiados', label: 'Créditos', icon: '💳' },
                            { id: 'Stock', label: 'Stock', icon: '📦' },
                            { id: 'Reabastecer', label: 'Abasto', icon: '🚚' },
                            { id: 'Etiquetas', label: 'Etiquetas', icon: '🏷️' }
                          ]
                        },
                        {
                          title: '🔧 MÓDULOS DE SERVICIO / TALLER',
                          items: [
                            { id: 'Nueva', label: 'Nueva', icon: '➕' },
                            { id: 'Órdenes', label: 'Órdenes', icon: '📋' },
                            { id: 'Cotizaciones', label: 'Cotizac.', icon: '📄' },
                            { id: 'Precios', label: 'Precios', icon: '💵' },
                            { id: 'Refacciones', label: 'Refacci.', icon: '🛠️' },
                            { id: 'Donantes', label: 'Donantes', icon: '🔩' },
                            { id: 'Equipos', label: 'Equipos', icon: '📱' },
                            { id: 'Clientes', label: 'Clientes', icon: '👥' },
                            { id: 'Catalogo', label: 'Catálo.', icon: '📖' }
                          ]
                        },
                        {
                          title: '⚙️ MÓDULOS GENERALES / OTROS',
                          items: [
                            { id: 'Entrada', label: 'Entrada', icon: '📥' },
                            { id: 'Salida', label: 'Salida', icon: '📤' },
                            { id: 'Cortes', label: 'Cortes', icon: '✂️' },
                            { id: 'Reportes', label: 'Reportes', icon: '📊' }
                          ]
                        }
                      ].map(group => (
                        <div key={group.title} className="space-y-1.5 pt-1">
                          <span className={`text-[8.5px] uppercase font-bold tracking-widest block font-mono ${
                            isRetro 
                              ? (isLight ? 'text-zinc-600 font-extrabold' : 'text-blue-300 font-extrabold') 
                              : isLight 
                                ? 'text-zinc-500 font-bold' 
                                : 'text-sky-400/90'
                          }`}>
                            {group.title}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {group.items.map(mod => {
                              const isHidden = hiddenModules.includes(mod.id);
                              return (
                                <button
                                  key={mod.id}
                                  type="button"
                                  onClick={() => handleToggleModule(mod.id)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                                    !isHidden
                                      ? isRetro ? (isLight ? 'border-zinc-500 bg-[#dde4f0] text-zinc-950 font-black' : 'border-blue-500 bg-[#383c48] text-white font-black') : isLight ? 'border-slate-350 bg-white hover:bg-slate-50 text-slate-800 font-bold shadow-[0_2px_6px_rgba(0,0,0,0.04)] border-l-4 border-l-blue-500' : 'border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-100 font-bold shadow-md border-l-4 border-l-violet-500'
                                      : isRetro ? (isLight ? 'border-zinc-300 bg-zinc-50 text-zinc-400 opacity-60 hover:bg-zinc-100 hover:opacity-80' : 'border-zinc-800 bg-[#252730] text-zinc-500 opacity-55 hover:bg-[#30333e]') : isLight ? 'border-zinc-200 bg-zinc-50/50 text-zinc-450 opacity-60 hover:bg-zinc-100/80 hover:opacity-80' : 'border-zinc-800 bg-zinc-950/30 text-zinc-600 opacity-50 hover:bg-zinc-950/50 hover:opacity-75'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                    !isHidden
                                      ? isRetro ? (isLight ? 'bg-white border-zinc-300' : 'bg-blue-900 border-blue-800') : isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'
                                      : isRetro ? (isLight ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-800 border-zinc-700') : isLight ? 'bg-zinc-100/50 border-zinc-200/40' : 'bg-zinc-950/40 border-zinc-900/60'
                                  }`}>
                                    {renderConfigModuleIcon(mod.id)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] font-black uppercase truncate leading-tight ${
                                      isHidden 
                                        ? 'text-zinc-500 line-through opacity-70' 
                                        : isRetro 
                                          ? (isLight ? 'text-zinc-950' : 'text-white') 
                                          : ''
                                    }`}>{mod.label}</span>
                                    <span className={`text-[8.5px] leading-none font-bold ${
                                      !isHidden 
                                        ? 'text-emerald-500' 
                                        : isRetro 
                                          ? (isLight ? 'text-zinc-450' : 'text-zinc-500') 
                                          : 'text-zinc-450'
                                    }`}>
                                      {!isHidden ? 'Visible' : 'Oculto'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Respaldos */}
              {globalSubTab === 'backup' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Copia de Seguridad y Restauración */}
                  {(onExportData || onImportData) && (
                    <div className="space-y-4">
                      <h4 className={`text-xs font-bold uppercase tracking-widest font-mono border-b pb-2 mb-3 flex items-center gap-2 ${
                        isRetro ? 'text-[#000080] border-zinc-300 font-black' : isLight ? 'text-zinc-900 border-zinc-200 font-extrabold' : 'text-sky-400 border-[#1c1d22]/60'
                      }`}>
                        💾 Copia de Seguridad y Restauración de Datos
                      </h4>
                      <p className={`text-[11px] font-sans leading-normal ${isRetro || isLight ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                        Exporta todos tus datos (órdenes, ventas, inventario, clientes y configuración) a un archivo <span className={`font-mono font-bold ${isRetro || isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>.json</span> para guardarlos en un lugar seguro o transferirlos a otro equipo. Importa un backup para restaurar o fusionar datos. Se requiere conexión a internet para iniciar sesión y reactivar tu cuenta en el nuevo equipo.
                      </p>

                      <div
                        id="config-backup-main"
                        className={`grid grid-cols-1 md:grid-cols-3 gap-3 transition-all duration-1000 border ${getHighlightClasses('config-backup-main')}`}
                      >
                        {/* Exportar */}
                        {onExportData && (
                          <div className={`border p-4 flex flex-col gap-3 ${
                            isRetro
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                              : isLight
                                ? 'bg-sky-50 border border-sky-200 rounded-xl'
                                : 'bg-sky-950/20 border border-sky-900/40 rounded-xl'
                          }`}>
                            <div>
                              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isRetro ? 'text-[#000080]' : isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                                📤 Exportar Backup
                              </span>
                              <p className={`text-[10px] font-sans ${isRetro || isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                Descarga un archivo JSON con toda la información actual del sistema.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onExportData()}
                              className={`w-full py-2 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                                isRetro
                                  ? 'bg-[#000080] retro-white-text border-2 border-t-white border-l-white border-[#404040] border-r-[#404040] rounded-none'
                                  : isLight
                                    ? 'bg-sky-600 hover:bg-sky-700 text-white rounded-lg'
                                    : 'bg-sky-600/20 hover:bg-sky-600/40 border border-sky-600/40 text-sky-400 rounded-lg'
                              }`}
                            >
                              💾 Guardar Copia de Seguridad
                            </button>
                          </div>
                        )}

                        {/* Importar — Fusionar */}
                        {onImportData && (
                          <div className={`border p-4 flex flex-col gap-3 ${
                            isRetro
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                              : isLight
                                ? 'bg-emerald-50 border border-emerald-200 rounded-xl'
                                : 'bg-emerald-950/20 border border-emerald-900/40 rounded-xl'
                          }`}>
                            <div>
                              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isRetro ? 'text-emerald-800' : isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                📥 Importar y Fusionar
                              </span>
                              <p className={`text-[10px] font-sans ${isRetro || isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                Agrega los datos del backup sin borrar los registros actuales. Duplicados se omiten automáticamente.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onImportData('merge')}
                              className={`w-full py-2 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                                isRetro
                                  ? 'bg-[#000080] retro-white-text border-2 border-t-white border-l-white border-[#404040] border-r-[#404040] rounded-none'
                                  : isLight
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/40 text-emerald-400 rounded-lg'
                              }`}
                            >
                              🔀 Fusionar con Backup
                            </button>
                          </div>
                        )}

                        {/* Restaurar */}
                        {onImportData && (
                          <div className={`border p-4 flex flex-col gap-3 ${
                            isRetro
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                              : isLight
                                ? 'bg-red-50 border border-red-200 rounded-xl'
                                : 'bg-red-950/20 border border-red-900/40 rounded-xl'
                          }`}>
                            <div>
                              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isRetro ? 'text-red-800' : isLight ? 'text-red-700' : 'text-red-400'}`}>
                                ⚠️ Restauración Completa
                              </span>
                              <p className={`text-[10px] font-sans ${isRetro || isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                Reemplaza TODOS los datos actuales con los del backup. Esta acción no se puede deshacer.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onImportData('restore')}
                              className={`w-full py-2 text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                                isRetro
                                  ? 'bg-red-700 retro-white-text border-2 border-t-white border-l-white border-[#404040] border-r-[#404040] rounded-none'
                                  : isLight
                                    ? 'bg-red-600 hover:bg-red-700 text-white rounded-lg'
                                    : 'bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-400 rounded-lg'
                              }`}
                            >
                              🗃️ Restaurar desde Backup
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Copias locales y nube */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Copia de Seguridad Automática Local */}
                    <div className={`border p-4 flex flex-col gap-3 justify-between ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                        : isLight
                          ? 'bg-amber-50 border border-amber-200 rounded-xl'
                          : 'bg-amber-950/10 border border-amber-900/30 rounded-xl'
                    }`}>
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isRetro ? 'text-amber-800' : isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                          ⚙️ Automatizar Copia Local
                        </span>
                        <p className={`text-[10px] font-sans leading-relaxed ${isRetro || isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          Guarda automáticamente un respaldo completo de la información cada semana en una carpeta seleccionada.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoBackupEnabled}
                            onChange={e => setAutoBackupEnabled(e.target.checked)}
                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${isRetro ? (isLight ? 'text-zinc-700' : 'text-blue-300') : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            Activar respaldo automático semanal
                          </span>
                        </label>

                        {config.autoBackupLastTime && (
                          <span className={`text-[9.5px] font-mono ${isRetro ? (isLight ? 'text-zinc-600 font-bold' : 'text-zinc-400') : isLight ? 'text-zinc-650' : 'text-zinc-405'}`}>
                            Último: {new Date(config.autoBackupLastTime).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {autoBackupEnabled && (
                        <div className="flex flex-col gap-2 mt-2">
                          <label className={`text-[9.5px] uppercase font-bold tracking-wider ${isRetro ? (isLight ? 'text-zinc-700' : 'text-blue-300') : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Carpeta de destino:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={autoBackupPath}
                              placeholder="Ninguna carpeta seleccionada"
                              className={`flex-1 text-[11px] px-3 py-1.5 font-mono rounded ${
                                isRetro
                                  ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black outline-none rounded-none'
                                  : isLight
                                    ? 'bg-white border border-[#2d2f36] text-zinc-800'
                                    : 'bg-[#18191e] border border-[#272930] text-zinc-200'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleSelectFolder}
                              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer active:scale-95 transition-all shrink-0 ${
                                isRetro
                                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none text-zinc-900'
                                  : isLight
                                    ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-750'
                              }`}
                            >
                              Seleccionar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                     {/* Copia de Seguridad Automática en la Nube */}
                     <div className={`p-4 flex flex-col gap-3 justify-between transition-all duration-500 ${
                       highlightCloudCard
                         ? 'border-indigo-500 ring-4 ring-indigo-500/30 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                         : 'border'
                     } ${
                       isRetro
                         ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                         : isLight
                           ? 'bg-indigo-50 border border-indigo-200 rounded-xl'
                           : 'bg-indigo-950/10 border border-indigo-900/30 rounded-xl'
                     }`}>
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isRetro ? 'text-indigo-800' : isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                          ☁️ Automatizar Copia en la Nube
                        </span>
                        <p className={`text-[10px] font-sans leading-relaxed ${isRetro || isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          Guarda y sincroniza automáticamente tu información en la nube para protegerla contra pérdidas o fallas en el equipo.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={cloudBackupEnabled}
                            onChange={e => setCloudBackupEnabled(e.target.checked)}
                            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${isRetro || isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            Activar respaldos en la nube
                          </span>
                        </label>

                        {localStorage.getItem('fixmanager_cloud_backup_last_time') && (
                          <span className={`text-[9.5px] font-mono ${isRetro || isLight ? 'text-zinc-600 font-bold' : 'text-zinc-400'}`}>
                            Último: {new Date(localStorage.getItem('fixmanager_cloud_backup_last_time')!).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 mt-2">
                        <p className={`text-[9px] ${isRetro || isLight ? 'text-zinc-500 font-medium' : 'text-zinc-500'} leading-relaxed`}>
                          💡 Info: Se creará un respaldo automático al realizar cortes de caja, cerrar sesión o de manera diaria si hay cambios.
                        </p>
                      </div>

                      {/* Estado de la Conexión de Sincronización en la Nube */}
                      <div className="border-t border-zinc-800/60 pt-3 mt-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isRetro || isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                            🔗 Conexión a la Nube (Sincronización)
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            !isSyncAuthorized && supabaseEmail
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              : supabaseEmail
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-red-500/10 text-red-400 border border-red-500/25'
                          }`}>
                            {!isSyncAuthorized && supabaseEmail
                              ? 'INACTIVO / NO AUTORIZADO'
                              : supabaseEmail
                                ? 'CONECTADO'
                                : 'DESCONECTADO'}
                          </span>
                        </div>

                        {!isSyncAuthorized && supabaseEmail ? (
                          <div className="flex flex-col gap-2">
                            <p className={`text-[10px] ${isRetro || isLight ? 'text-zinc-600 font-semibold' : 'text-zinc-400'} leading-relaxed`}>
                              Cuenta vinculada: <strong className={`font-mono ${isRetro || isLight ? 'text-zinc-800 font-bold' : 'text-white'}`}>{supabaseEmail}</strong>
                            </p>
                            <p className="text-[10px] text-amber-500/90 leading-relaxed font-semibold">
                              ⚠️ Tu plan actual no incluye la Sincronización en la Nube / Multi-dispositivo. Por favor, ponte en contacto con administración o soporte para adquirir este módulo adicional.
                            </p>
                            <div className="flex items-center gap-3.5 flex-wrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                                  if (data?.session?.user?.id) {
                                    const { data: profile, error } = await supabase
                                      .from('profiles')
                                      .select('cloud_sync_enabled')
                                      .eq('id', data.session.user.id)
                                      .maybeSingle();
                                    
                                    if (error) {
                                      alert('Error al verificar la sublicencia: ' + error.message);
                                      return;
                                    }

                                    const enabled = !!profile?.cloud_sync_enabled;
                                    localStorage.setItem('fixmanager_cloud_sync_enabled', String(enabled));
                                    setIsSyncAuthorized(enabled);
                                    if (enabled) {
                                      alert('¡Sublicencia de Sincronización verificada y activada con éxito!');
                                      window.location.reload();
                                    } else {
                                      alert('La sincronización aún no está activa en tu cuenta del panel de administración. Si acabas de adquirirla, asegúrate de que el administrador la haya activado.');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer inline-flex items-center shadow-md shadow-indigo-600/10"
                              >
                                Recomprobar Licencia
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm('¿Estás seguro de que deseas desconectar la sincronización de la nube? Tu base de datos local seguirá funcionando pero ya no se sincronizará.')) {
                                    await supabase.auth.signOut().catch(() => {});
                                    const api = (window as any).electronAPI;
                                    if (api?.saveSupabaseSession) {
                                      await api.saveSupabaseSession(null).catch(() => {});
                                    }
                                    localStorage.removeItem('fixmanager_user_id');
                                    localStorage.removeItem('fixmanager_cloud_sync_enabled');
                                    setIsSyncAuthorized(false);
                                    setSupabaseEmail(null);
                                    window.location.reload();
                                  }
                                }}
                                className="text-[9.5px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer transition-colors"
                              >
                                Cerrar Sesión
                              </button>
                            </div>
                          </div>
                        ) : supabaseEmail ? (
                          <div className="flex flex-col gap-2">
                            <p className={`text-[10px] ${isRetro || isLight ? 'text-zinc-600 font-semibold' : 'text-zinc-400'} leading-relaxed`}>
                              Sincronizando automáticamente tu taller con la cuenta: <strong className={`font-mono ${isRetro || isLight ? 'text-zinc-800 font-bold' : 'text-white'}`}>{supabaseEmail}</strong>
                            </p>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm('¿Estás seguro de que deseas desconectar la sincronización de la nube? Tu base de datos local seguirá funcionando pero ya no se sincronizará.')) {
                                  await supabase.auth.signOut().catch(() => {});
                                  const api = (window as any).electronAPI;
                                  if (api?.saveSupabaseSession) {
                                    await api.saveSupabaseSession(null).catch(() => {});
                                  }
                                  localStorage.removeItem('fixmanager_user_id');
                                  localStorage.removeItem('fixmanager_cloud_sync_enabled');
                                  setIsSyncAuthorized(false);
                                  setSupabaseEmail(null);
                                  window.location.reload();
                                }
                              }}
                              className="text-[9.5px] text-red-400 hover:text-red-300 font-bold underline self-start cursor-pointer transition-colors"
                            >
                              Cerrar Sesión de Sincronización
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                              ⚠️ Tu base de datos local no está vinculada con el servidor en tiempo real. Vincula tu cuenta para que las ventas y órdenes aparezcan al instante en tu celular.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowCloudLogin(true)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-indigo-600/10 self-start cursor-pointer"
                            >
                              Vincular con la Nube / Iniciar Sesión
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal de Inicio de Sesión de Sincronización Nube */}
                  {showCloudLogin && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in p-4">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">🔗 Vincular Cuenta de Sincronización</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCloudLogin(false);
                              setCloudLoginError('');
                            }}
                            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleCloudLoginSubmit(e);
                            }
                          }}
                          className="flex flex-col gap-4"
                        >
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Ingresa tu correo de administrador y contraseña para conectar esta computadora de escritorio a la misma cuenta que usas en tu celular.
                          </p>

                          {cloudLoginError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold leading-relaxed animate-shake">
                              ⚠️ {cloudLoginError}
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Correo Electrónico</label>
                            <input
                              type="email"
                              value={cloudLoginEmail}
                              onChange={e => setCloudLoginEmail(e.target.value)}
                              placeholder="admin@taller.com"
                              disabled={cloudLoginLoading}
                              className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Contraseña</label>
                            <input
                              type="password"
                              value={cloudLoginPassword}
                              onChange={e => setCloudLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              disabled={cloudLoginLoading}
                              className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleCloudLoginSubmit}
                            disabled={cloudLoginLoading}
                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                          >
                            {cloudLoginLoading ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Conectando...</span>
                              </>
                            ) : (
                              <span>Vincular y Conectar</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>) : (
          <div className="space-y-6 animate-fade-in">
            <h4 className={`text-xs font-bold uppercase tracking-widest font-mono border-b pb-2 mb-1 block flex items-center gap-2 ${
              isRetro 
                ? 'text-[#000080] border-zinc-400' 
                : isLight 
                  ? 'text-zinc-900 border-zinc-300' 
                  : 'text-amber-500 border-[#1c1d22]/80'
            }`}>
              <Printer className="w-4 h-4 text-amber-500 animate-pulse" />
              Gestión y Perfiles de Impresoras del Sistema
            </h4>
            <p className={`text-[10.5px] font-mono leading-relaxed max-w-3xl ${
              isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Configura y asigne los puertos de comunicación inalámbricos, de red (IP), o locales para los dos tipos de emisión física. El sistema opera de manera concurrente para despachar tickets térmicos y pegatinas adhesivas de identificación de equipos.
            </p>

            {/* ECO MODE — ajuste global de impresión — siempre interactivo */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              isRetro 
                ? (isLight ? 'bg-[#d8eed8] border-[#6aaa6a]' : 'bg-[#152e15]/90 border-[#2d5f2d]') 
                : isLight 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-emerald-950/20 border-emerald-800/40'
            }`}>
              <div className="flex items-center gap-3">
                <Leaf className={`w-5 h-5 shrink-0 ${isRetro ? (isLight ? 'text-green-700' : 'text-green-400') : isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <div>
                  <p className={`text-xs font-black uppercase tracking-wide ${isRetro ? (isLight ? 'text-green-900' : 'text-green-200') : isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>Modo Eco — Sin impresión física</p>
                  <p className={`text-[10px] mt-0.5 ${isRetro ? (isLight ? 'text-green-700' : 'text-green-350') : isLight ? 'text-emerald-700' : 'text-emerald-600/80'}`}>Todos los comprobantes se muestran en pantalla en lugar de imprimirse</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={ecoMode}
                  onChange={e => { setEcoMode(e.target.checked); onUpdateConfig({ ...config, ecoMode: e.target.checked }); }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <span className={`text-[10px] font-bold ${isRetro ? (isLight ? 'text-green-800' : 'text-green-300') : isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>{ecoMode ? 'Activo' : 'Inactivo'}</span>
              </label>
            </div>

            {/* Ancho de papel — solo visible en modo eco, fuera del wrapper deshabilitado */}
            {ecoMode && <div className={`flex items-center gap-3 p-3 rounded-xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <span className={`text-[9px] uppercase font-mono tracking-widest font-bold shrink-0 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {ecoMode ? '📱 Tamaño del ticket digital' : '🖨️ Ancho de papel'}
              </span>
              <div className={`flex rounded p-0.5 border ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                {(['58mm', '80mm', 'media-carta', 'media-carta-duplicado'] as const).map(w => (
                  <button key={w} type="button" onClick={() => setTicketPaperWidth(w)}
                    className={`px-3 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                      ticketPaperWidth === w
                        ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                        : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                    }`}>{w === 'media-carta' ? 'Media Carta' : w === 'media-carta-duplicado' ? 'Duplicado' : w}</button>
                ))}
              </div>
              <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                {ecoMode
                  ? (ticketPaperWidth === '58mm' ? 'Ticket digital angosto' : ticketPaperWidth === '80mm' ? 'Ticket digital estándar' : ticketPaperWidth === 'media-carta' ? 'Media Carta digital' : 'Doble Media Carta digital')
                  : (ticketPaperWidth === '58mm' ? 'Rollo angosto — muy común en impresoras compactas' : ticketPaperWidth === '80mm' ? 'Rollo estándar — mayor espacio para texto' : ticketPaperWidth === 'media-carta' ? 'Media Carta (Hoja pre-cortada)' : 'Doble Media Carta (Hoja Carta completa - 2 copias)')}
              </span>
            </div>

            }

            {/* Modo Bitácora — solo visible cuando eco mode está activo */}
            {ecoMode && (
              <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${
                ecoSilent
                  ? (isRetro ? 'bg-[#c8ddc8] border-green-700' : isLight ? 'bg-emerald-50 border-emerald-400' : 'bg-emerald-900/30 border-emerald-600/60')
                  : (isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/30 border-zinc-700/40')
              }`}>
                <input
                  type="checkbox"
                  checked={ecoSilent}
                  onChange={e => { setEcoSilent(e.target.checked); onUpdateConfig({ ...config, ecoSilent: e.target.checked }); }}
                  className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${isRetro ? 'text-green-900' : isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                      Modo Bitácora — solo registro interno
                    </p>
                    {ecoSilent && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isRetro ? 'bg-green-700 text-white' : isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-700 text-emerald-100'}`}>Activo</span>
                    )}
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-green-700' : isLight ? 'text-emerald-700' : 'text-emerald-500/80'}`}>
                    No se mostrará ningún ticket digital en pantalla. El sistema registra órdenes, ventas y movimientos en silencio — ideal para talleres que notifican por Telegram o de forma verbal.
                  </p>
                </div>
              </label>
            )}

            {/* WRAPPER ECO DISABLE — indicadores + impresoras + simuladores + reportes */}
            <div className={`relative space-y-6 transition-opacity ${ecoMode ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            {ecoMode && (
              <div className="absolute inset-x-0 top-1 z-10 flex justify-center">
                <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg ${isRetro ? 'bg-[#d8eed8] border border-[#6aaa6a] text-green-900' : isLight ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-emerald-950 border border-emerald-700 text-emerald-300'}`}>
                  🌿 Modo Eco activo — configuración de impresoras deshabilitada
                </div>
              </div>
            )}

            
            {/* RESUMEN DE IMPRESORAS */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'config-printer-thermal',
                  tabId: 'tickets',
                  icon: '🖨️',
                  label: 'Ticket Térmico',
                  name: ticketPrinterBrand || (printerInterface === 'Default' ? 'Impresora predeterminada del sistema' : null),
                  channel: printerInterface && printerInterface !== 'Default' ? printerInterface : (printerInterface === 'Default' ? 'Canal: Sistema' : null),
                  configured: !!(ticketPrinterBrand || (printerInterface && printerInterface !== 'Default')),
                },
                {
                  id: 'config-printer-labels',
                  tabId: 'etiquetas',
                  icon: '🏷️',
                  label: 'Etiquetas Adhesivas',
                  name: labelPrinterBrand || null,
                  channel: labelPrinterInterface || null,
                  configured: !!(labelPrinterBrand || labelPrinterInterface),
                },
                {
                  id: 'config-printer-a4',
                  tabId: 'reportes',
                  icon: '📄',
                  label: 'Reportes A4',
                  name: reportPrinterName || null,
                  channel: reportPrinterInterface || null,
                  configured: !!(reportPrinterName || reportPrinterInterface),
                },
              ].map(p => {
                const isActive = expandedPrinter === p.tabId;
                return (
                  <button key={p.id} id={p.id} type="button"
                    onClick={() => {
                      setExpandedPrinter(p.tabId as any);
                    }}
                    className={`text-left p-3 rounded-xl border-2 transition-all duration-1000 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${getHighlightClasses(p.id)} ${
                      isActive
                        ? isRetro 
                          ? (isLight ? 'border-[#000080] bg-[#dde4f0]' : 'border-blue-500 bg-blue-950/85')
                          : isLight 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-violet-500 bg-violet-950/30'
                        : isRetro 
                          ? (isLight ? 'border-zinc-300 bg-white hover:border-zinc-400' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800') 
                          : isLight 
                            ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' 
                            : 'border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{p.icon}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{p.label}</span>
                      <span className={`ml-auto text-[8px] font-black px-1.5 py-0.5 rounded ${
                        isActive
                           ? 'bg-blue-600 text-white animate-pulse'
                           : p.configured
                            ? isRetro
                              ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                              : isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400'
                            : isRetro
                              ? isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>{isActive ? 'Ajuste activo ✓' : p.configured ? '✓ Config.' : 'Sin config.'}</span>
                    </div>
                    <p className={`text-[11px] font-black truncate ${isActive ? 'text-blue-800' : isRetro || isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      {p.name || <span className={`font-normal italic ${isRetro || isLight ? 'text-zinc-400' : 'text-zinc-650'}`}>Sin asignar</span>}
                    </p>
                    {p.channel && <p className={`text-[9px] font-mono mt-0.5 truncate ${isActive ? 'text-blue-600/70' : isRetro || isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.channel}</p>}
                    <p className={`text-[9px] mt-1.5 font-bold ${isActive ? 'text-blue-700' : isRetro || isLight ? 'text-sky-600' : 'text-sky-500'}`}>
                      {isActive ? 'Ajuste visible 🔽' : 'Configurar →'}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* DUAL PRINTER LAYOUT SECTION */}
            {expandedPrinter === 'tickets' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in">
                <div className="flex flex-col space-y-4">
                  <div id="card-tickets" className={`flex flex-col border ${
                isRetro
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 rounded-none shadow-sm'
                  : isLight
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl'
                    : 'bg-[#08080a]/60 border-zinc-700 text-zinc-100 rounded-xl'
              }`}>
              <div className="p-5 space-y-4 flex-1">
                  <div className={`flex items-center gap-2.5 pb-2.5 border-b ${
                    isLight ? 'border-zinc-300' : 'border-zinc-900'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${
                      isRetro 
                        ? 'bg-blue-100 text-[#000080] border border-zinc-400' 
                        : isLight 
                          ? 'bg-zinc-200/60 text-zinc-700' 
                          : 'bg-[#34d399]/10 text-[#34d399]'
                    }`}>
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold uppercase tracking-wider ${
                        isRetro ? 'text-[#000080] font-black' : 'text-white'
                      }`}>
                        Impresora de Tickets Térmicos
                      </h5>
                      <p className={`text-[10px] leading-tight ${
                        isRetro ? 'text-zinc-700 font-medium' : 'text-zinc-500'
                      }`}>
                        Ventas presenciales, notas de ingreso y abonos de clientes
                      </p>
                    </div>
                  </div>

                  {/* Habilitación de Modo Híbrido */}
                  <div className={`p-3 border rounded-xl flex items-center justify-between ${
                    isRetro
                      ? 'bg-[#dfdfdf] border-zinc-400 rounded-none text-zinc-900'
                      : isLight
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        : 'bg-[#0f1015]/60 border-[#1c1d22] text-zinc-300'
                  }`}>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-wide block ${
                        isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-[#34d399]'
                      }`}>
                        🔀 Modo Clásico (Un solo formato para órdenes)
                      </span>
                      <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                        Permite imprimir órdenes y contratos en tamaño Carta/Media Carta duplicado (Láser) y las ventas rápidas en tique térmico (POS).
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={hybridPrintMode}
                        onChange={e => {
                          const val = e.target.checked;
                          setHybridPrintMode(val);
                          
                          // Ajustar tamaños de papel por defecto válidos
                          let newTicketWidth = ticketPaperWidth;
                          let newPosWidth = posPaperWidth;
                          if (val) {
                            if (activeFormatTab === 'entry' || activeFormatTab === 'entry-warranty' || activeFormatTab === 'entry-batch' ||
                                activeFormatTab === 'delivery' || activeFormatTab === 'delivery-warranty' || activeFormatTab === 'delivery-batch') {
                              setActiveFormatTab('service');
                            }
                            if (newTicketWidth !== 'media-carta' && newTicketWidth !== 'media-carta-duplicado') {
                              newTicketWidth = 'media-carta-duplicado';
                              setTicketPaperWidth('media-carta-duplicado');
                            } else {
                              setTicketPaperWidth(newTicketWidth);
                            }
                            if (posPaperWidth === 'media-carta' || posPaperWidth === 'media-carta-duplicado') {
                              newPosWidth = '80mm';
                              setPosPaperWidth('80mm');
                            }
                          } else {
                            if (ticketPaperWidth === 'media-carta' || ticketPaperWidth === 'media-carta-duplicado') {
                              newTicketWidth = '80mm';
                              setTicketPaperWidth('80mm');
                            }
                          }
                          
                          setTimeout(() => {
                            onUpdateConfig({
                              ...config,
                              hybridPrintMode: val,
                              ticketPaperWidth: newTicketWidth,
                              posPaperWidth: newPosWidth,
                            });
                          }, 100);
                        }}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {hybridPrintMode ? (
                    /* INTERFAZ DEL MODO HÍBRIDO (Doble Impresora) */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* IMPRESORA LÁSER / SERVICIOS */}
                      <div className={`p-4 border rounded-xl space-y-4 text-left ${
                        isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none text-zinc-900' : isLight ? 'bg-zinc-150/40 border-zinc-200 text-zinc-800' : 'bg-[#0b0c10] border-[#1c1d22] text-zinc-100'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                          isRetro ? 'text-[#000080] border-zinc-300' : isLight ? 'text-emerald-700 border-zinc-200' : 'text-[#34d399] border-zinc-950'
                        }`}>
                          📋 Impresora de Servicios (Láser)
                        </span>

                        {/* Impresora Láser Activa */}
                        {(() => {
                          const activeLaser = scannedHwThermalList.find(hw => hw.name === ticketPrinterBrand) || {
                            name: ticketPrinterBrand || 'Sin impresora configurada',
                            interface: 'Default',
                            details: 'Se enviarán las órdenes y contratos a este dispositivo.'
                          };
                          return (
                            <div className={`border-2 p-3 text-left ${
                              isRetro 
                                ? 'bg-blue-50 border-blue-900/60 text-zinc-900 rounded-none shadow-sm' 
                                : isLight 
                                  ? 'bg-emerald-50/60 border-emerald-500/20 text-zinc-800 rounded-lg' 
                                  : 'bg-emerald-950/10 border-emerald-500/30 text-white rounded-lg'
                            }`}>
                              <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded font-black tracking-wider inline-block mb-1.5 shadow-sm ${
                                isRetro ? 'bg-[#000080] text-white retro-white-text' : 'bg-emerald-500 text-black'
                              }`}>
                                🟢 LÁSER ACTIVA
                              </span>
                              <h6 className={`text-xs font-black ${isRetro ? 'text-[#000080] font-mono' : ''}`}>{activeLaser.name}</h6>
                              <p className={`text-[9.5px] mt-0.5 leading-snug ${isRetro ? 'text-zinc-700 font-bold' : 'text-zinc-400'}`}>{activeLaser.details}</p>
                              <div className="space-y-1.5 mt-2">
                                <label className={`text-[8.5px] font-bold block ${isRetro ? 'text-[#000080]' : 'text-zinc-400'}`}>Tamaño de Papel:</label>
                                <div className={`flex rounded p-0.5 border w-fit ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                                  {([
                                    { width: 'media-carta-duplicado', label: 'Duplicado (Carta)' },
                                    { width: 'media-carta', label: 'Media Carta (Pre-cortada)' }
                                  ] as const).map(opt => {
                                    const isActive = ticketPaperWidth === opt.width;
                                    return (
                                      <button
                                        key={opt.width}
                                        type="button"
                                        onClick={() => {
                                          setTicketPaperWidth(opt.width);
                                          onUpdateConfig({ ...config, ticketPaperWidth: opt.width });
                                        }}
                                        className={`px-2 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer ${
                                          isActive
                                            ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                            : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/20">
                          <label className={`text-[8.5px] font-bold block ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>Impresión de Contrato (Reverso):</label>
                          <div className={`flex rounded p-0.5 border w-fit ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                            {([
                              { mode: 'none', label: 'Sin Contrato' },
                              { mode: 'manual', label: 'Manual (2 Pasos)' },
                              { mode: 'auto', label: 'Automático' },
                              { mode: 'front', label: 'Al Frente (Compacto)' }
                            ] as const).map(opt => {
                              const isActive = opt.mode === 'none'
                                ? (!printDuplexContract && !mediaCartaFrontTerms)
                                : (opt.mode === 'front'
                                    ? mediaCartaFrontTerms
                                    : (opt.mode === 'manual' ? (printDuplexContract && duplexManual) : (printDuplexContract && !duplexManual)));
                              return (
                                <button
                                  key={opt.mode}
                                  type="button"
                                  onClick={() => {
                                    let newContract = false;
                                    let newManual = false;
                                    let newFront = false;
                                    if (opt.mode === 'manual') {
                                      newContract = true;
                                      newManual = true;
                                    } else if (opt.mode === 'auto') {
                                      newContract = true;
                                      newManual = false;
                                    } else if (opt.mode === 'front') {
                                      newFront = true;
                                    }
                                    setPrintDuplexContract(newContract);
                                    setDuplexManual(newManual);
                                    setMediaCartaFrontTerms(newFront);
                                    onUpdateConfig({ 
                                      ...config, 
                                      printDuplexContract: newContract, 
                                      duplexManual: newManual,
                                      mediaCartaFrontTerms: newFront
                                    });
                                  }}
                                  className={`px-2 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer ${
                                    isActive
                                      ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                      : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Explicación de modos de contrato */}
                        <div className={`p-2 rounded border text-[8px] leading-normal ${
                          isRetro
                            ? 'bg-[#c0c0c0] border-[#808080] text-zinc-900 font-sans'
                            : isLight
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-650'
                              : 'bg-zinc-950/45 border-zinc-900 text-zinc-400'
                        }`}>
                          {!printDuplexContract && !mediaCartaFrontTerms && (
                            <span>ℹ️ <b>Sin Contrato:</b> Solo se imprimirá el frente (el ticket de ingreso / recepción).</span>
                          )}
                          {mediaCartaFrontTerms && (
                            <span>ℹ️ <b>Al Frente (Compacto):</b> Imprime los términos y condiciones y firmas al frente de la hoja con diseño ultra-compacto.</span>
                          )}
                          {printDuplexContract && duplexManual && (
                            <span>ℹ️ <b>Manual:</b> Imprime el frente y pausa con instrucciones para voltear la hoja físicamente e imprimir las cláusulas al reverso.</span>
                          )}
                          {printDuplexContract && !duplexManual && (
                            <span>ℹ️ <b>Automático:</b> Envía el documento con frente y reverso de forma continua. Requiere impresora con Dúplex automático.</span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 pt-1 pb-1 text-left">
                          <input
                            type="checkbox"
                            id="printIndividualTicketsInBatch"
                            checked={printIndividualTicketsInBatch}
                            onChange={e => {
                              const newValue = e.target.checked;
                              if (!newValue) {
                                setModalDialog({
                                  type: 'confirm',
                                  title: '¿Desactivar Impresión Individual?',
                                  message: "Al desactivar esta opción, cuando recibas múltiples equipos en un mismo lote solo se imprimirá el ticket consolidado para el cliente.\n\nEl sistema dejará de imprimir automáticamente los tickets Media Carta individuales para pegar a cada dispositivo, por lo que tendrás que etiquetarlos o identificarlos de manera manual (ej. escribiendo el folio con cinta masking tape).\n\n¿Estás seguro de que deseas desactivar esta opción?",
                                  confirmText: 'Sí, desactivar',
                                  cancelText: 'Cancelar',
                                  onConfirm: () => {
                                    setPrintIndividualTicketsInBatch(false);
                                    onUpdateConfig({ ...config, printIndividualTicketsInBatch: false });
                                  }
                                });
                              } else {
                                setPrintIndividualTicketsInBatch(true);
                                onUpdateConfig({ ...config, printIndividualTicketsInBatch: true });
                              }
                            }}
                            className={`w-3.5 h-3.5 mt-0.5 ${isRetro ? '' : 'rounded text-emerald-500 accent-emerald-500 cursor-pointer'}`}
                          />
                          <div className="flex flex-col">
                            <label
                              htmlFor="printIndividualTicketsInBatch"
                              className={`text-[9.5px] font-black cursor-pointer select-none leading-tight ${isRetro ? 'text-zinc-900 font-mono' : isLight ? 'text-zinc-800 font-extrabold' : 'text-zinc-200 hover:text-white'}`}
                            >
                              Imprimir tickets Media Carta individuales al recibir múltiples equipos
                            </label>
                            <span className={`text-[8.5px] leading-tight mt-0.5 max-w-md ${isRetro ? 'text-zinc-700 font-bold' : isLight ? 'text-zinc-500' : 'text-zinc-450'}`}>
                              💡 <b>Recepción Múltiple:</b> Si un cliente trae varios equipos a la vez, el sistema imprimirá la hoja base consolidada para el cliente y, además, una media carta individual por cada equipo (sin cláusulas) para que la pegues físicamente al dispositivo en el taller.
                            </span>
                          </div>
                        </div>

                        {/* Botones de búsqueda */}
                        <div className="space-y-1.5 text-left">
                          <span className={`text-[9.5px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Buscar Dispositivos:</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isScanningHwThermal}
                              onClick={handleScanPhysicalThermalPrinters}
                              className={`flex-1 h-8 font-extrabold text-[9.5px] uppercase flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                                isRetro 
                                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] rounded-none hover:bg-zinc-200' 
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isScanningHwThermal ? 'animate-spin' : ''}`} />
                              {isScanningHwThermal ? 'Buscando...' : '🔎 Buscar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTicketPrinterBrand('');
                                onUpdateConfig({ ...config, ticketPrinterBrand: '' });
                              }}
                              className={`h-8 px-2.5 font-bold text-[9px] uppercase flex items-center justify-center gap-1 transition-all select-none active:scale-95 cursor-pointer ${
                                isRetro
                                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 rounded-none'
                                  : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg'
                              }`}
                            >
                              🗑 Reset
                            </button>
                          </div>
                        </div>

                        {/* Lista de Impresoras del Sistema */}
                        <div className="space-y-1.5 text-left">
                          <span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-700' : 'text-zinc-500'}`}>Disponibles:</span>
                          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                            {scannedHwThermalList.map(hw => {
                              const isSelected = ticketPrinterBrand === hw.name;
                              return (
                                <div
                                  key={hw.id}
                                  onClick={() => {
                                    setTicketPrinterBrand(hw.name);
                                    onUpdateConfig({ ...config, ticketPrinterBrand: hw.name });
                                  }}
                                  className={`p-2 border text-left transition-all cursor-pointer flex justify-between items-center ${
                                    isSelected
                                      ? (isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-emerald-950/15 border-emerald-500/60 hover:bg-emerald-950/20 rounded-lg')
                                      : (isRetro 
                                          ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' 
                                          : 'bg-[#121316] border-zinc-900 hover:border-zinc-750 hover:bg-[#191b21] rounded-lg')
                                  }`}
                                >
                                  <div className="flex-1 min-w-0 pr-1.5">
                                    <h6 className={`text-[10px] font-bold truncate leading-none ${isRetro ? 'text-zinc-900 font-mono' : 'text-white'}`}>{hw.name}</h6>
                                    <p className={`text-[8px] mt-0.5 truncate text-zinc-500`}>{hw.details}</p>
                                  </div>
                                  <div className="shrink-0">
                                    {isSelected ? (
                                      <span className={`px-1.5 py-0.5 font-extrabold text-[8px] uppercase shadow-sm ${
                                        isRetro ? 'bg-[#000080] text-white retro-white-text rounded-none' : 'bg-emerald-500 text-black rounded'
                                      }`}>✓ Activa</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTicketPrinterBrand(hw.name);
                                          onUpdateConfig({ ...config, ticketPrinterBrand: hw.name });
                                        }}
                                        className={`px-1.5 py-0.5 border font-bold text-[8px] uppercase transition-all cursor-pointer ${
                                          isRetro
                                            ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                                            : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white rounded'
                                        }`}
                                      >
                                        ✓ Usar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {scannedHwThermalList.length === 0 && (
                              <p className="text-[8.5px] text-zinc-500 italic text-center py-2">Ninguna impresora detectada. Haz clic en "Buscar".</p>
                            )}
                          </div>
                        </div>
                      </div>

                        {/* Selección de Estilo de Plantilla Predeterminada */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-700/40 flex flex-col gap-1.5">
                          <span className={`text-[9px] uppercase font-mono tracking-widest font-bold ${
                            isRetro ? 'text-amber-900' : isLight ? 'text-zinc-600' : 'text-amber-400'
                          }`}>🎨 Diseño / Plantilla Predeterminada de Etiquetas</span>
                          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                            {[
                              { id: 'standard', title: '🏷️ Estándar Clásico', desc: 'Limpio tradicional' },
                              { id: 'vitrina', title: '🏪 Vitrina POS', desc: 'Precio en insignia negra' },
                              { id: 'qr', title: '📱 QR Híbrido', desc: 'Escaneo 2D y cámara' },
                              { id: 'technical', title: '📋 Ficha Técnica', desc: 'Nombres largos multilínea' },
                            ].map(tpl => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => setLabelTemplateStyle(tpl.id as any)}
                                className={`flex flex-col text-left p-2 rounded border cursor-pointer transition-all ${
                                  labelTemplateStyle === tpl.id
                                    ? (isRetro ? 'bg-[#b45309] text-white border-[#b45309]' : 'bg-amber-500/20 text-amber-400 border-amber-500')
                                    : (isLight ? 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/50')
                                }`}
                              >
                                <span className="font-bold text-[10px]">{tpl.title}</span>
                                <span className="text-[8px] opacity-70 mt-0.5">{tpl.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>             <div className={`p-4 border rounded-xl space-y-4 text-left ${
                        isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none text-zinc-900' : isLight ? 'bg-zinc-150/40 border-zinc-200 text-zinc-800' : 'bg-[#0b0c10] border-[#1c1d22] text-zinc-100'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                          isRetro ? 'text-[#000080] border-zinc-300' : isLight ? 'text-emerald-700 border-zinc-200' : 'text-[#34d399] border-zinc-950'
                        }`}>
                          🖨️ Impresora de Ventas (POS)
                        </span>

                        {/* Impresora POS Activa */}
                        {(() => {
                          const activePos = scannedHwThermalList.find(hw => hw.name === posPrinterBrand) || {
                            name: posPrinterBrand || 'Sin impresora configurada',
                            interface: 'Default',
                            details: 'Se enviarán comprobantes del POS, abonos y cortes.'
                          };
                          return (
                            <div className={`border-2 p-3 text-left ${
                              isRetro 
                                ? 'bg-blue-50 border-blue-900/60 text-zinc-900 rounded-none shadow-sm' 
                                : isLight 
                                  ? 'bg-emerald-50/60 border-emerald-500/20 text-zinc-800 rounded-lg' 
                                  : 'bg-emerald-950/10 border-emerald-500/30 text-white rounded-lg'
                            }`}>
                              <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded font-black tracking-wider inline-block mb-1.5 shadow-sm ${
                                isRetro ? 'bg-[#000080] text-white retro-white-text' : 'bg-emerald-500 text-black'
                              }`}>
                                🟢 TÉRMICA ACTIVA
                              </span>
                              <h6 className={`text-xs font-black ${isRetro ? "text-[#000080] font-mono" : ""}`}>{activePos.name}</h6>
                              <p className={`text-[9.5px] mt-0.5 leading-snug ${isRetro ? "text-zinc-700 font-bold" : "text-zinc-400"}`}>{activePos.details}</p>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                                  isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                                }`}>
                                  Ancho: {posPaperWidth}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-1.5">
                          <label className={`text-[8.5px] font-bold block ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>Ancho del Ticket:</label>
                          <div className={`flex rounded p-0.5 border w-fit ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                            {(['58mm', '80mm'] as const).map(w => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => {
                                  setPosPaperWidth(w);
                                  onUpdateConfig({ ...config, posPaperWidth: w });
                                }}
                                className={`px-3 py-0.5 text-[9px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  posPaperWidth === w
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                        </div>



                        {/* Botones de búsqueda */}
                        <div className="space-y-1.5 text-left">
                          <span className={`text-[9.5px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Buscar Dispositivos:</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isScanningHwThermal}
                              onClick={handleScanPhysicalThermalPrinters}
                              className={`flex-1 h-8 font-extrabold text-[9.5px] uppercase flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                                isRetro 
                                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] rounded-none hover:bg-zinc-200' 
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isScanningHwThermal ? 'animate-spin' : ''}`} />
                              {isScanningHwThermal ? 'Buscando...' : '🔎 Buscar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPosPrinterBrand('');
                                onUpdateConfig({ ...config, posPrinterBrand: '' });
                              }}
                              className={`h-8 px-2.5 font-bold text-[9px] uppercase flex items-center justify-center gap-1 transition-all select-none active:scale-95 cursor-pointer ${
                                isRetro
                                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 rounded-none'
                                  : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg'
                              }`}
                            >
                              🗑 Reset
                            </button>
                          </div>
                        </div>

                        {/* Lista de Impresoras del Sistema */}
                        <div className="space-y-1.5 text-left">
                          <span className={`text-[9px] font-bold uppercase block ${isRetro ? 'text-zinc-700' : 'text-zinc-500'}`}>Disponibles:</span>
                          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                            {scannedHwThermalList.map(hw => {
                              const isSelected = posPrinterBrand === hw.name;
                              return (
                                <div
                                  key={hw.id}
                                  onClick={() => {
                                    setPosPrinterBrand(hw.name);
                                    onUpdateConfig({ ...config, posPrinterBrand: hw.name });
                                  }}
                                  className={`p-2 border text-left transition-all cursor-pointer flex justify-between items-center ${
                                    isSelected
                                      ? (isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-emerald-950/15 border-emerald-500/60 hover:bg-emerald-950/20 rounded-lg')
                                      : (isRetro 
                                          ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' 
                                          : 'bg-[#121316] border-zinc-900 hover:border-zinc-750 hover:bg-[#191b21] rounded-lg')
                                  }`}
                                >
                                  <div className="flex-1 min-w-0 pr-1.5">
                                    <h6 className={`text-[10px] font-bold truncate leading-none ${isRetro ? 'text-zinc-900 font-mono' : 'text-white'}`}>{hw.name}</h6>
                                    <p className={`text-[8px] mt-0.5 truncate text-zinc-500`}>{hw.details}</p>
                                  </div>
                                  <div className="shrink-0">
                                    {isSelected ? (
                                      <span className={`px-1.5 py-0.5 font-extrabold text-[8px] uppercase shadow-sm ${
                                        isRetro ? 'bg-[#000080] text-white retro-white-text rounded-none' : 'bg-emerald-500 text-black rounded'
                                      }`}>✓ Activa</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPosPrinterBrand(hw.name);
                                          onUpdateConfig({ ...config, posPrinterBrand: hw.name });
                                        }}
                                        className={`px-1.5 py-0.5 border font-bold text-[8px] uppercase transition-all cursor-pointer ${
                                          isRetro
                                            ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                                            : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white rounded'
                                        }`}
                                      >
                                        ✓ Usar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {scannedHwThermalList.length === 0 && (
                              <p className="text-[8.5px] text-zinc-500 italic text-center py-2">Ninguna impresora detectada. Haz clic en "Buscar".</p>
                            )}
                          </div>
                        </div>
                      </div>

                     </div>
                  ) : (
                    /* INTERFAZ MODO ESTÁNDAR (Original) */
                    <div className={`p-4 border space-y-4 ${
                      isRetro 
                        ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none text-zinc-900' 
                        : isLight 
                          ? 'bg-zinc-150/40 border-zinc-200 text-zinc-800 rounded-xl' 
                          : 'bg-[#0b0c10] border-[#1c1d22] text-zinc-100 rounded-xl'
                    }`}>
                      <span className={`text-[10px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                        isRetro ? 'text-[#000080] border-zinc-300' : isLight ? 'text-emerald-700 border-zinc-200' : 'text-[#34d399] border-zinc-950'
                      }`}>
                        🔌 SELECCIÓN DE IMPRESORA LOCAL (POS Y SERVICIOS)
                      </span>

                      {/* Impresora Activa Seleccionada */}
                      {(() => {
                        const activePrinter = scannedHwThermalList.find(x => x.id === selectedHwThermalId) || {
                          name: ticketPrinterBrand || 'Sin impresora configurada',
                          interface: printerInterface || 'Default',
                          paperWidth: ticketPaperWidth,
                          details: 'Controlador local para impresión de tiques de venta.'
                        };
                        return (
                          <div className={`border-2 p-3 text-left ${
                            isRetro 
                              ? (isLight 
                                ? 'bg-blue-50 border-blue-900/60 text-zinc-900 rounded-none shadow-sm' 
                                : 'bg-blue-950/40 border-blue-600/60 text-white rounded-none shadow-sm')
                              : isLight 
                                ? 'bg-emerald-50/60 border-emerald-500/20 text-zinc-800 rounded-lg' 
                                : 'bg-emerald-950/10 border-emerald-500/30 text-white rounded-lg'
                          }`}>
                            <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded font-black tracking-wider inline-block mb-1.5 shadow-sm ${
                              isRetro ? 'bg-[#000080] text-white retro-white-text' : 'bg-emerald-500 text-black'
                            }`}>
                              🟢 IMPRESORA DE TICKETS EN USO
                            </span>
                            <h6 className={`text-xs font-black ${isRetro ? (isLight ? 'text-[#000080]' : 'text-blue-300') + ' font-mono' : ''}`}>{activePrinter.name}</h6>
                            <p className={`text-[9.5px] mt-0.5 leading-snug ${isRetro ? (isLight ? 'text-zinc-700 font-bold' : 'text-zinc-300') : 'text-zinc-400'}`}>{activePrinter.details}</p>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                                isRetro 
                                  ? (isLight ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-zinc-800 text-zinc-200 border-zinc-700 font-bold') 
                                  : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                              }`}>
                                Tipo: {activePrinter.interface === 'Default' ? 'Controlador Local / Windows o Mac' : activePrinter.interface}
                              </span>
                              <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                                isRetro 
                                  ? (isLight ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-zinc-800 text-zinc-200 border-zinc-700 font-bold') 
                                  : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                              }`}>
                                Papel: {ticketPaperWidth}
                              </span>
                            </div>
                            <div className={`mt-2 pt-2 border-t ${isRetro ? (isLight ? 'border-zinc-300' : 'border-zinc-700') : 'border-emerald-500/20'}`}>
                              <p className={`text-[8px] uppercase font-mono font-bold mb-1 ${isRetro ? (isLight ? 'text-zinc-650' : 'text-zinc-400') : 'text-zinc-500'}`}>Usada para imprimir:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {config.enableTaller !== false && (
                                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                    isRetro 
                                      ? (isLight ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-zinc-800 text-zinc-200 border-zinc-700 font-bold') 
                                      : 'bg-emerald-950/30 text-emerald-300 border-emerald-700/40'
                                  }`}>🧾 Ticket de Servicio Técnico</span>
                                )}
                                {config.enablePOS !== false && (
                                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                    isRetro 
                                      ? (isLight ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-zinc-800 text-zinc-200 border-zinc-700 font-bold') 
                                      : 'bg-emerald-950/30 text-emerald-300 border-emerald-700/40'
                                  }`}>🛒 Ticket POS / Venta Directa</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Lista Súper Simplificada de Impresoras con Botón Directo */}
                      <div className="space-y-2 text-left">
                        <span className={`text-[9.5px] font-bold uppercase block ${
                          isRetro ? 'text-zinc-700 font-sans' : 'text-zinc-500'
                        }`}>
                          Impresoras locales detectadas y disponibles:
                        </span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {scannedHwThermalList.map((hw) => {
                            const isSelected = selectedHwThermalId === hw.id;
                            return (
                              <div
                                key={hw.id}
                                onClick={() => handleSelectHardwareThermal(hw.id)}
                                className={`p-2.5 border text-left transition-all cursor-pointer flex justify-between items-center ${
                                  isSelected
                                    ? (isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-emerald-950/15 border-emerald-500/60 hover:bg-emerald-950/20 rounded-lg')
                                    : (isRetro 
                                        ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' 
                                        : 'bg-[#121316] border-zinc-900 hover:border-zinc-700 hover:bg-[#191b21] rounded-lg')
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <Printer className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : 'text-zinc-400'}`} />
                                    <h6 className={`text-[11px] font-bold truncate leading-none ${isRetro ? 'text-zinc-900 font-mono' : 'text-white'}`}>
                                      {hw.name}
                                    </h6>
                                  </div>
                                  <p className={`text-[9.5px] mt-1 truncate ${isRetro ? 'text-zinc-500 font-sans font-medium' : 'text-zinc-500'}`}>
                                    {hw.details}
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  {isSelected ? (
                                    <span className={`px-2 py-1 font-extrabold text-[8.5px] uppercase shadow-sm flex items-center gap-1 ${
                                      isRetro ? 'bg-[#000080] text-white retro-white-text rounded-none' : 'bg-emerald-500 text-black rounded'
                                    }`}>
                                      ✓ Activa
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectHardwareThermal(hw.id);
                                        setTimeout(() => handleSaveTicketConfig(), 50);
                                      }}
                                      className={`px-2 py-1 border font-bold text-[8.5px] uppercase transition-all cursor-pointer ${
                                        isRetro
                                          ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                                          : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white rounded'
                                      }`}
                                    >
                                      ✓ Usar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acciones para buscar/detectar (Siempre visibles fuera del condicional para permitir refrescar la lista de dispositivos) */}
                  {!hybridPrintMode && (
                    <div className="space-y-2 text-left">
                      <span className={`text-[9.5px] uppercase font-bold block ${
                        isRetro ? 'text-zinc-800 font-sans' : 'text-zinc-400'
                      }`}>
                        Dispositivos de Impresión Locales:
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isScanningHwThermal}
                          onClick={handleScanPhysicalThermalPrinters}
                          className={`flex-1 h-9 font-extrabold text-[10.5px] uppercase flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] rounded-none hover:bg-zinc-200'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm'
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isScanningHwThermal ? 'animate-spin' : ''}`} />
                          {isScanningHwThermal ? 'Buscando...' : '🔎 Buscar Impresoras'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHwThermalId('');
                            setTicketPrinterBrand('');
                            setPrinterInterface('Default');
                            onUpdateConfig({ ...config, ticketPrinterBrand: '', printerInterface: 'Default' });
                          }}
                          className={`h-9 px-3 font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-all select-none active:scale-95 cursor-pointer ${
                            isRetro
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 rounded-none'
                              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg'
                          }`}
                        >
                          🗑 Reset
                        </button>
                      </div>
                    </div>
                  )}


                    {/* Parametros Booleanos y Copias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-[10px] text-zinc-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={autoPrintOnSale}
                              onChange={e => setAutoPrintOnSale(e.target.checked)}
                              className="w-3 h-3 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20 accent-emerald-500 cursor-pointer"
                            />
                            <span className="text-[#34d399] font-bold">Auto-imprimir en POS</span>
                          </label>


                        <button
                          type="button"
                          onClick={async () => {
                            const eAPI = (window as any).electronAPI;
                            if (!eAPI?.openCashDrawer) { alert('Función solo disponible en la app de escritorio'); return; }
                             const res = await eAPI.openCashDrawer({
                               deviceName: hybridPrintMode ? (posPrinterBrand || '') : (ticketPrinterBrand || ''),
                               printerInterface: config.printerInterface,
                               printerIpAddress: config.printerIpAddress
                             });
                            if (res?.success) alert('✅ Cajón abierto correctamente');
                            else alert(`❌ No se pudo abrir el cajón\n${res?.error || 'Verifica que el nombre de impresora sea correcto'}`);
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded font-mono font-semibold border transition-colors ${
                            isRetro
                              ? 'bg-[#c0c0c0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 hover:bg-[#d0d0d0] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white'
                              : isLight
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-zinc-800 border-zinc-600 text-emerald-400 hover:bg-zinc-700 hover:text-emerald-300'
                          }`}
                        >
                          Probar cajón de dinero
                        </button>
                      </div>

                      <div className={`flex items-center justify-between gap-1.5 border-l pl-3 ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-300' : 'border-zinc-700'}`}>
                        <span className={`text-[10px] font-bold uppercase font-mono ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Copias:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={printCopies}
                            onChange={e => setPrintCopies(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                            className={`w-12 border focus:outline-none rounded py-0.5 text-xs text-center font-mono ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' : 'bg-zinc-900 border-[#2d2f36] text-white focus:border-emerald-500'}`}
                          />
                          <span className={`text-[9px] uppercase font-mono ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>tiques</span>
                        </div>
                      </div>
                    </div>

                  {/* Contenido Visual y Leyendas del Ticket */}
                  <div className={`p-4 rounded-xl border space-y-4 ${
                    isRetro 
                      ? 'bg-[#cbd6e2] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none' 
                      : isLight 
                        ? 'bg-zinc-100/75 border-zinc-200 text-zinc-600' 
                        : 'bg-zinc-950/40 border-zinc-900 text-zinc-100'
                  }`}>
                    <span className={`text-[9px] uppercase font-mono tracking-widest font-bold block border-b pb-1 ${
                      isRetro ? 'text-[#000080] border-zinc-300' : isLight ? 'text-emerald-700 border-zinc-200' : 'text-[#34d399] border-zinc-900'
                    }`}>🎨 Contenido Visual y Marcas</span>
                    
                    {/* SUB-TARJETA COLABORADORA 2: DISEÑO Y PLANTILLAS DE TIQUETES */}
                    <div className={`p-4 rounded-xl space-y-4 border ${
                      isRetro 
                        ? 'bg-[#cbd6e2] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none' 
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-200' 
                          : 'bg-[#0b0c0e]/80 border-zinc-900'
                    }`}>
                      {/* Cabecera del diseñador de tickets con pestañas de formato */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-2 ${
                        isLight ? 'border-zinc-300' : 'border-zinc-900'
                      }`}>
                        <label className={`text-[10.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 select-none font-sans ${
                          isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900 font-extrabold' : 'text-emerald-400'
                        }`}>
                          📄 Formulario de Tickets Independientes
                        </label>
                        <div className={`flex flex-wrap rounded p-0.5 gap-0.5 border ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white'
                            : isLight
                              ? 'bg-zinc-100 border-zinc-200'
                              : 'bg-zinc-950 border-zinc-900'
                        }`}>
                          {config.enablePOS !== false && (
                            <button
                              type="button"
                              onClick={() => setActiveFormatTab('pos')}
                              className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                activeFormatTab === 'pos'
                                  ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                  : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                              }`}
                            >
                              🛒 POS
                            </button>
                          )}
                          {config.enableTaller !== false && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('service')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'service'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🔧 Servicio
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('service-batch')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'service-batch'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🔧 Servicio Grupal
                              </button>
                            </>
                          )}
                           {!hybridPrintMode && config.enableTaller !== false && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('delivery')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'delivery'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                ✅ Entrega
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('delivery-warranty')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'delivery-warranty'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🛡️ Entrega Garantía
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('delivery-batch')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'delivery-batch'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📦 Entrega Grupal
                              </button>
                            </>
                          )}
                          {config.enableTaller !== false && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('cotizacion')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'cotizacion'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📋 Cotización
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('cotizacion-grupal')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'cotizacion-grupal'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📋 Cotización Grupal
                              </button>
                            </>
                          )}
                          {config.enablePOS !== false && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('fiado-abono')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'fiado-abono'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                💳 Fiado Abono
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('fiado-liquidacion')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'fiado-liquidacion'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🎉 Fiado Liquidación
                              </button>
                            </>
                          )}
                          {config.enablePOS !== false && (
                            <button
                              type="button"
                              onClick={() => setActiveFormatTab('apartado')}
                              className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                activeFormatTab === 'apartado'
                                  ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                  : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                              }`}
                            >
                              📦 Apartado
                            </button>
                          )}
                          {config.enablePOS !== false && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('recarga')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'recarga'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📱 Recargas
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFormatTab('corte')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeFormatTab === 'corte'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🏦 Corte
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    {/* NUEVO: Selección de Perfil o Nota de Impresora */}
                    {isLaserActiveForSettings ? (
                      <div className={`p-4 border rounded-xl flex items-center gap-3 mt-3.5 ${
                        isRetro
                          ? 'bg-[#dfdfdf] border-[#808080] text-zinc-900 rounded-none'
                          : isLight
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                            : 'bg-[#0f1015]/60 border-[#1c1d22] text-zinc-300'
                      }`}>
                        <span className="text-xl shrink-0">📄</span>
                        <div className="space-y-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wide block ${
                            isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400'
                          }`}>
                            Impresión Láser / Media Carta Activa
                          </span>
                          <span className={`text-[8.5px] block leading-snug ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                            Las órdenes y contratos se ajustan automáticamente a la hoja física convencional (Láser o Inyección).
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 mt-3">
                        <div className="flex items-center justify-between">
                          <label className={`text-[10px] uppercase font-mono tracking-widest font-bold block ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-650' : 'text-[#34d399]'}`}>
                            📋 Perfil de Impresora
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenPrinterWizard('ticket')}
                            className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:opacity-85 active:scale-95 ${
                              isRetro ? 'text-[#000080] underline' : isLight ? 'text-emerald-700 hover:text-emerald-800' : 'text-[#34d399] hover:text-[#5cebb6]'
                            }`}
                          >
                            🪄 Asistente con IA
                          </button>
                        </div>
                        
                        <div className={`grid grid-cols-2 p-1 rounded-xl gap-1 mt-1.5 ${
                          isRetro 
                            ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono' 
                            : isLight 
                              ? 'bg-zinc-100 border border-zinc-200' 
                              : 'bg-[#0f1015]/60 border border-[#1c1d22]'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              setPrinterConfigMode('generic');
                              applyPresetPrinterProfile('');
                            }}
                            className={`py-1.5 text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center select-none rounded-lg ${
                              printerConfigMode === 'generic'
                                ? (isRetro
                                  ? 'bg-[#000080] text-white font-bold rounded-none border border-white'
                                  : isLight
                                    ? 'bg-white text-zinc-900 shadow-sm font-extrabold'
                                    : 'bg-emerald-500/10 text-[#34d399] font-extrabold border border-emerald-500/20')
                                : (isRetro
                                  ? 'text-zinc-700 hover:bg-zinc-200 rounded-none'
                                  : isLight
                                    ? 'text-zinc-555 hover:text-zinc-800'
                                    : 'text-zinc-400 hover:text-zinc-250')
                            }`}
                          >
                            ⚡ Perfil Genérico / Básico
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPrinterConfigMode('model');
                              setPrinterDropdownOpen(true);
                            }}
                            className={`py-1.5 text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center select-none rounded-lg ${
                              printerConfigMode === 'model'
                                ? (isRetro
                                  ? 'bg-[#000080] text-white font-bold rounded-none border border-white'
                                  : isLight
                                    ? 'bg-white text-zinc-900 shadow-sm font-extrabold'
                                    : 'bg-emerald-500/10 text-[#34d399] font-extrabold border border-emerald-500/20')
                                : (isRetro
                                  ? 'text-zinc-700 hover:bg-zinc-200 rounded-none'
                                  : isLight
                                    ? 'text-zinc-555 hover:text-zinc-800'
                                    : 'text-zinc-400 hover:text-zinc-250')
                            }`}
                          >
                            🔍 Modelo Exacto
                          </button>
                        </div>

                        {/* Contenido según Modo Activo */}
                        {printerConfigMode === 'generic' ? (
                          // Modo Genérico / Básico
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
                            {[
                              { id: 'thermal-standard', name: '⚡ Térmica 80mm', desc: 'Star, Epson, Bixolon (Largo nativo y autocorte)' },
                              { id: 'thermal-generic', name: '⚙️ Térmica 58mm', desc: 'Xprinter, POS-58 y genéricas (Ancho 58mm y centrado)' },
                              { id: 'custom', name: '🛠️ Personalizado', desc: 'Ajuste manual de parámetros' }
                            ].map(profile => (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => applyPrinterProfile(profile.id as any)}
                                className={`p-2 rounded text-left border transition-all cursor-pointer ${
                                  currentProfile === profile.id
                                    ? (isRetro
                                      ? 'bg-[#000080] text-white retro-white-text border-white font-black'
                                      : isLight
                                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 font-extrabold'
                                        : 'bg-emerald-500/10 border-emerald-550 text-emerald-400')
                                    : (isRetro
                                      ? 'bg-[#dfdfdf] border-zinc-400 text-zinc-800 hover:bg-zinc-300'
                                      : isLight
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80')
                                }`}
                              >
                                <div className={`text-[10px] font-bold ${
                                  currentProfile === profile.id
                                    ? (isRetro ? 'text-white retro-white-text' : '')
                                    : ''
                                }`}>{profile.name}</div>
                                <div className={`text-[8.5px] leading-tight mt-0.5 ${
                                  currentProfile === profile.id
                                    ? (isRetro ? 'text-zinc-200 retro-white-text' : isLight ? 'text-emerald-600/90' : 'text-emerald-400/70')
                                    : (isRetro ? 'text-zinc-555' : 'text-zinc-500')
                                }`}>{profile.desc}</div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          // Modo Modelo Exacto
                          <div className="space-y-1.5 mt-2.5 relative" ref={printerDropdownRef}>
                            <label className={`text-[9px] uppercase font-mono tracking-widest font-bold block ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-550' : 'text-zinc-400'}`}>
                              🔍 Selecciona tu Marca y Modelo:
                            </label>
                            
                            {/* Trigger del Custom Dropdown */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setPrinterDropdownOpen(!printerDropdownOpen);
                              }}
                              className={`w-full text-xs font-bold p-2.5 focus:outline-none border flex items-center justify-between transition-all duration-200 cursor-pointer select-none text-left ${
                                isRetro
                                  ? 'bg-white border-2 border-t-zinc-700 border-l-zinc-700 border-b-white border-r-white text-zinc-900 rounded-none shadow-inner font-mono active:bg-zinc-150'
                                  : isLight
                                    ? 'bg-white border-zinc-250 text-zinc-800 rounded-lg focus:border-emerald-500 hover:bg-zinc-50/50'
                                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 rounded-lg focus:border-emerald-500 focus:bg-zinc-950 hover:bg-zinc-900'
                              }`}
                            >
                              <span className={isRetro ? 'text-black' : isLight ? 'text-zinc-800' : 'text-zinc-200'}>
                                {selectedPrinterProfileId ? (() => {
                                  const preset = PRINTER_PRESETS_DATABASE.find(p => p.id === selectedPrinterProfileId);
                                  return preset ? `${preset.brand} - ${preset.model}` : selectedPrinterProfileId;
                                })() : '-- Seleccionar perfil por marca y modelo --'}
                              </span>
                              <span className={`transition-transform duration-200 ${printerDropdownOpen ? 'rotate-180' : ''} ${isRetro ? 'text-black' : isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>▼</span>
                            </button>

                            {/* Contenedor Flotante de la Lista */}
                            {printerDropdownOpen && (
                              <div
                                className={`absolute top-full left-0 right-0 z-50 border shadow-2xl transition-all duration-200 max-h-60 overflow-y-auto ${
                                  isRetro
                                    ? 'bg-white border-2 border-zinc-805 text-zinc-900 rounded-none font-mono shadow-md'
                                    : isLight
                                      ? 'bg-white border border-zinc-250 text-zinc-800 rounded-xl mt-1.5'
                                      : 'bg-[#0f1015] border border-zinc-800 text-zinc-200 rounded-xl mt-1.5'
                                }`}
                              >
                                {Array.from(new Set(PRINTER_PRESETS_DATABASE.map(p => p.brand))).map(brand => (
                                  <div key={brand} className="border-b last:border-b-0 border-zinc-200/40">
                                    {/* Cabecera del Grupo (Marca) */}
                                    <div
                                      className={`px-3 py-1.5 text-[8.5px] uppercase font-bold tracking-widest select-none ${
                                        isRetro
                                          ? 'bg-zinc-150 text-[#000080]/85 border-b border-zinc-350 font-black'
                                          : isLight
                                            ? 'bg-zinc-50/70 text-zinc-500 border-b border-zinc-100'
                                            : 'bg-zinc-900/40 text-zinc-400 border-b border-zinc-800/40'
                                      }`}
                                    >
                                      🏷️ {brand}
                                    </div>
                                    
                                    {/* Opciones (Modelos) */}
                                    <div className="p-0.5">
                                      {PRINTER_PRESETS_DATABASE.filter(p => p.brand === brand).map(preset => {
                                        const isSelected = selectedPrinterProfileId === preset.id;
                                        const isHovered = hoveredPresetId === preset.id;
                                        const isActive = isSelected || isHovered;
                                        
                                        // Determine background and text color class names
                                        let btnColorClasses = 'bg-transparent';
                                        let textColorClasses = isRetro ? 'text-black' : isLight ? 'text-zinc-700' : 'text-zinc-350';
                                        
                                        if (isActive) {
                                          if (isRetro) {
                                            btnColorClasses = 'bg-[#000080] text-white';
                                            textColorClasses = 'text-white';
                                          } else {
                                            btnColorClasses = isLight 
                                              ? (isHovered ? 'bg-[#10b981] text-white' : 'bg-[#ecfdf5] text-[#047857]')
                                              : (isHovered ? 'bg-[#10b981] text-white' : 'bg-emerald-500/10 text-[#34d399]');
                                            textColorClasses = isHovered 
                                              ? 'text-white'
                                              : (isLight ? 'text-[#047857]' : 'text-[#34d399]');
                                          }
                                        }

                                        return (
                                          <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => {
                                              applyPresetPrinterProfile(preset.id);
                                              setPrinterDropdownOpen(false);
                                            }}
                                            onMouseEnter={() => setHoveredPresetId(preset.id)}
                                            onMouseLeave={() => setHoveredPresetId(null)}
                                            className={`w-full text-left px-5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between rounded ${btnColorClasses} ${
                                              isRetro 
                                                ? 'rounded-none font-mono' 
                                                : ''
                                            }`}
                                          >
                                            <span className={`font-semibold ${textColorClasses}`}>{preset.model}</span>
                                            {isSelected && (
                                              <span 
                                                className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm mr-1 select-none border border-white/20"
                                                style={{ color: '#ffffff', backgroundColor: '#10b981' }}
                                              >
                                                ✓
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                      {/* Espacio reservado para modularidad */}

                      {/* Mostrar/ocultar código de barras */}
                      <div className={`flex items-center justify-between p-3.5 rounded-xl border mt-2.5 ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                            🔲 Imprimir Código de Barras en Tickets
                          </span>
                          <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                            Desactívalo si no requieres código de barras en tus tickets de servicio y POS.
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={showBarcodeOnTicket}
                            onChange={e => {
                              setShowBarcodeOnTicket(e.target.checked);
                              setTimeout(() => handleSaveTicketConfig(), 50);
                            }}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Mostrar/ocultar código QR de Google Maps */}
                      <div className={`flex items-center justify-between p-3.5 rounded-xl border mt-2.5 ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                            🗺️ Imprimir Código QR de Google Maps en Tickets
                          </span>
                          <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                            Imprime el código QR «Ubícanos en Google Maps» al final de los tickets térmicos y de media carta.
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={!hideMapsQr}
                            onChange={e => {
                              const newVal = !e.target.checked;
                              setHideMapsQr(newVal);
                              handleSaveTicketConfig({ hideMapsQr: newVal });
                            }}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Acordeón de Ajustes de Compatibilidad y Avanzados */}
                      {!isLaserActiveForSettings && !selectedPrinterProfileId && (
                        <div className="mt-3.5">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedPrintSettings(!showAdvancedPrintSettings)}
                            className={`w-full flex items-center justify-between p-2.5 rounded border transition-colors cursor-pointer text-left ${
                              isRetro
                                ? 'bg-[#c0c0c0] border-zinc-400 text-zinc-900 font-mono'
                                : isLight
                                  ? 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200/50'
                                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              ⚙️ Ajustes de Compatibilidad y Avanzados {currentProfile === 'custom' && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase ml-2">Manual</span>}
                            </span>
                            <span className="text-xs">{showAdvancedPrintSettings ? '▼' : '▲'}</span>
                          </button>

                          {showAdvancedPrintSettings && (
                            <div className={`p-3 border-x border-b rounded-b-xl space-y-3.5 mt-0.5 ${
                              isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0f1015]/30 border-zinc-900'
                            }`}>
                              
                               {/* Ancho de papel */}
                               {currentProfile === 'custom' && (
                                <div className="flex items-center gap-3">
                                  <span className={`text-[9px] uppercase font-mono tracking-widest font-bold shrink-0 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>🖨️ Ancho de papel</span>
                                   {hybridPrintMode ? (
                                    <div className="flex items-center gap-2">
                                      <div className={`flex rounded p-0.5 border ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                                        {(['58mm', '80mm'] as const).map(w => (
                                          <button key={w} type="button" 
                                            onClick={() => {
                                              setPosPaperWidth(w);
                                              setUserSelectedProfile('custom');
                                              handleSaveTicketConfig({ posPaperWidth: w });
                                            }}
                                            className={`px-3 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                              posPaperWidth === w
                                                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                            }`}>{w}</button>
                                        ))}
                                      </div>
                                      <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                        Ancho de ticket de venta (Térmico) en modo clásico.
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className={`flex rounded p-0.5 border ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-900'}`}>
                                        {(['58mm', '80mm'] as const).map(w => (
                                          <button key={w} type="button" 
                                            onClick={() => {
                                              setTicketPaperWidth(w);
                                              setPosPaperWidth(w);
                                              setUserSelectedProfile('custom');
                                              handleSaveTicketConfig({ ticketPaperWidth: w, posPaperWidth: w });
                                            }}
                                            className={`px-3 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                              ticketPaperWidth === w
                                                ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-emerald-500 text-black font-extrabold')
                                                : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                            }`}>{w}</button>
                                        ))}
                                      </div>
                                      <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                        Ancho del ticket térmico en modo normal.
                                      </span>
                                    </div>
                                  )}
                                </div>
                               )}

                              {/* Ajuste de Desplazamiento Horizontal (Margen de Ticket) */}
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] uppercase font-mono tracking-widest font-bold shrink-0 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>↔️ Margen Horizontal</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={ticketMarginOffset}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setTicketMarginOffset(val);
                                      setUserSelectedProfile('custom');
                                    }}
                                    onMouseUp={() => handleSaveTicketConfig()}
                                    onTouchEnd={() => handleSaveTicketConfig()}
                                    className="w-28 cursor-pointer accent-emerald-500"
                                  />
                                  <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                                    isRetro 
                                      ? 'bg-[#dfdfdf] text-[#000080] border border-zinc-400' 
                                      : isLight 
                                        ? 'bg-zinc-200 text-zinc-800' 
                                        : 'bg-[#121316] text-emerald-400 border border-[#2d2f36]'
                                  }`}>
                                    {ticketMarginOffset > 0 ? `+${ticketMarginOffset}` : ticketMarginOffset}px
                                  </span>
                                </div>
                                <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                  Desplaza el diseño horizontalmente para centrar el texto.
                                </span>
                              </div>

                              {/* Cortar papel automáticamente */}
                              <div className={`flex items-center justify-between p-3.5 rounded-xl border mt-2.5 ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                                <div className="flex flex-col gap-0.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                                    ✂️ Cortar Papel Automáticamente
                                  </span>
                                  <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                    Envía la orden de corte al finalizar el ticket. Desactívelo si su impresora no tiene cortador mecánico (auto-cutter) para evitar atascos o fallos de impresión.
                                  </span>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                                  <input
                                    type="checkbox"
                                    checked={cutPaperAfterPrint}
                                    onChange={e => {
                                      setCutPaperAfterPrint(e.target.checked);
                                      setUserSelectedProfile('custom');
                                      handleSaveTicketConfig({ cutPaperAfterPrint: e.target.checked });
                                    }}
                                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                  />
                                </label>
                              </div>

                              {/* Compatibilidad de código de barras como imagen PNG */}
                              <div className={`flex items-center justify-between p-3.5 rounded-xl border mt-2.5 ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                                <div className="flex flex-col gap-0.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                                    📷 Compatibilidad de Código de Barras (Imagen PNG)
                                  </span>
                                  <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                    Actívelo si su impresora térmica imprime caracteres extraños (como letras rotas o símbolos) en vez del código de barras.
                                  </span>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                                  <input
                                    type="checkbox"
                                    checked={barcodeAsImage}
                                    onChange={e => {
                                      setBarcodeAsImage(e.target.checked);
                                      setUserSelectedProfile('custom');
                                      handleSaveTicketConfig({ barcodeAsImage: e.target.checked });
                                    }}
                                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                  />
                                </label>
                              </div>

                              {/* Ajustes avanzados específicos del perfil Personalizado */}
                              {currentProfile === 'custom' && (
                                <div className="space-y-3.5 pt-3.5 border-t border-zinc-800/20">
                                  {/* Usar tamaño predeterminado de la impresora */}
                                  <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                                        📄 Usar Tamaño Predeterminado del Driver
                                      </span>
                                      <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                        Ignora las dimensiones en micras de FixManager y utiliza el tamaño configurado en Windows/macOS. Desactívelo para resolver problemas de corte de tickets largos en Star TSP100.
                                      </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                                      <input
                                        type="checkbox"
                                        checked={usePrinterDefaultPageSize}
                                        onChange={e => {
                                          setUsePrinterDefaultPageSize(e.target.checked);
                                          setUserSelectedProfile('custom');
                                          handleSaveTicketConfig({ usePrinterDefaultPageSize: e.target.checked });
                                        }}
                                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                      />
                                    </label>
                                  </div>

                                  {/* Alto de ticket dinámico */}
                                  <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-400 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-[#0f1015]/60 border-[#1c1d22]'}`}>
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`text-[10px] font-black uppercase tracking-wide block ${isRetro ? 'text-[#000080] font-mono' : isLight ? 'text-zinc-700' : 'text-emerald-400/95'}`}>
                                        📏 Alto de Ticket Dinámico
                                      </span>
                                      <span className={`text-[8.5px] block ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                        Calcula la altura de la página automáticamente según la cantidad de texto del ticket (desactivar para Star TSP100).
                                      </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-4">
                                      <input
                                        type="checkbox"
                                        checked={useDynamicHeight}
                                        onChange={e => {
                                          setUseDynamicHeight(e.target.checked);
                                          setUserSelectedProfile('custom');
                                          handleSaveTicketConfig({ useDynamicHeight: e.target.checked });
                                        }}
                                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                      />
                                    </label>
                                  </div>

                                  {/* Ajuste de Alto de Página Fijo */}
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[9px] uppercase font-mono tracking-widest font-bold shrink-0 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>↕️ Alto de Página Fijo</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="500"
                                        value={ticketPaperHeight || ''}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          setTicketPaperHeight(isNaN(val) ? 0 : val);
                                          setUserSelectedProfile('custom');
                                        }}
                                        onBlur={() => handleSaveTicketConfig()}
                                        className={`w-20 border focus:outline-none rounded px-2.5 py-0.5 text-xs ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'}`}
                                        placeholder="Ej: 150"
                                      />
                                      <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                                        isRetro 
                                          ? 'bg-[#dfdfdf] text-[#000080] border border-zinc-400' 
                                          : isLight 
                                            ? 'bg-zinc-200 text-zinc-800' 
                                            : 'bg-[#121316] text-emerald-400 border border-[#2d2f36]'
                                      }`}>
                                        mm
                                      </span>
                                    </div>
                                    <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                      Fuerza un alto de papel fijo en milímetros (0 = automático).
                                    </span>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      )}

                      
                      {/* Campos de texto: leyenda y políticas según tab activo */}
                      {activeFormatTab === 'pos' ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className={`text-[10px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-emerald-400/95'}`}>
                              Leyenda del Pie de Recibo (POS)
                            </label>
                            <input type="text" value={ticketFooterPOS} onChange={e => setTicketFooterPOS(e.target.value)}
                              onBlur={handleSaveTicketConfig}
                              className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'}`}
                              placeholder="Ej: ¡Gracias por su compra!" />
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[10px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-emerald-400/95'}`}>
                              Términos y Garantía (POS)
                            </label>
                            <textarea rows={3} value={termsPOS} onChange={e => setTermsPOS(e.target.value)}
                              onBlur={handleSaveTicketConfig}
                              className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs font-mono leading-relaxed ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-zinc-300 focus:border-emerald-500'}`}
                              placeholder="Ej: Cambios únicamente dentro de los primeros 5 días." />
                          </div>
                          
                          {/* CONTROLES DE PROMOCIÓN TEMPORIZADA */}
                          <div className={`mt-4 p-4 border rounded-xl space-y-3 ${
                            isRetro 
                              ? 'bg-zinc-200 border-2 border-white text-zinc-900 shadow-sm' 
                              : isLight 
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-800' 
                                : 'bg-[#1b1c21] border-[#2d2f36] text-zinc-100'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id="promo-active-chk"
                                checked={promoActive} 
                                onChange={e => {
                                  setPromoActive(e.target.checked);
                                  handleSaveTicketConfig({ promoActive: e.target.checked });
                                }}
                                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                              />
                              <label htmlFor="promo-active-chk" className="text-[10px] uppercase font-black cursor-pointer select-none">
                                📢 Habilitar Banner Promocional / Temporizador
                              </label>
                            </div>

                            {promoActive && (
                              <div className="space-y-3 pt-2 border-t border-zinc-500/10">
                                <div className="space-y-1">
                                  <label className="text-[9.5px] uppercase font-bold block text-zinc-500">
                                    Texto de la Promoción / Mensaje
                                  </label>
                                  <textarea 
                                    rows={2} 
                                    value={promoText} 
                                    onChange={e => setPromoText(e.target.value)}
                                    onBlur={() => handleSaveTicketConfig()}
                                    className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${
                                      isRetro 
                                        ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' 
                                        : isLight 
                                          ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' 
                                          : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'
                                    }`}
                                    placeholder="Ej: ¡Aprovecha 30% de descuento en micas templadas esta semana!" 
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9.5px] uppercase font-bold block text-zinc-500">
                                      Fecha Inicio (Opcional)
                                    </label>
                                    <input 
                                      type="date" 
                                      value={promoStartDate} 
                                      onChange={e => {
                                        setPromoStartDate(e.target.value);
                                        handleSaveTicketConfig({ promoStartDate: e.target.value });
                                      }}
                                      className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${
                                        isRetro 
                                          ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' 
                                          : isLight 
                                            ? 'bg-white border-zinc-300 text-zinc-850 focus:border-emerald-500' 
                                            : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9.5px] uppercase font-bold block text-zinc-500">
                                      Fecha Fin / Auto-destrucción
                                    </label>
                                    <input 
                                      type="date" 
                                      value={promoEndDate} 
                                      onChange={e => {
                                        setPromoEndDate(e.target.value);
                                        handleSaveTicketConfig({ promoEndDate: e.target.value });
                                      }}
                                      className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${
                                        isRetro 
                                          ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' 
                                          : isLight 
                                            ? 'bg-white border-zinc-300 text-zinc-850 focus:border-emerald-500' 
                                            : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'
                                      }`}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9.5px] uppercase font-bold block text-zinc-500">
                                    Posición en el Recibo
                                  </label>
                                  <select 
                                    value={promoPosition} 
                                    onChange={e => {
                                      const pos = e.target.value as 'top' | 'bottom';
                                      setPromoPosition(pos);
                                      handleSaveTicketConfig({ promoPosition: pos });
                                    }}
                                    className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${
                                      isRetro 
                                        ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' 
                                        : isLight 
                                          ? 'bg-white border-zinc-300 text-zinc-850 focus:border-emerald-500' 
                                          : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'
                                    }`}
                                  >
                                    <option value="bottom">Abajo (Antes del agradecimiento / pie de página)</option>
                                    <option value="top">Arriba (Bajo el encabezado y logo)</option>
                                  </select>
                                </div>

                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSaveTicketConfig({
                                        promoActive,
                                        promoText,
                                        promoStartDate,
                                        promoEndDate,
                                        promoPosition
                                      });
                                    }}
                                    className={`w-full py-2 text-xs font-black uppercase rounded-xl tracking-wider transition-all active:scale-98 select-none ${
                                      isRetro
                                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white text-black font-extrabold cursor-pointer shadow-xs'
                                        : isLight
                                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-sm hover:shadow-md'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm border border-emerald-500/20'
                                    }`}
                                  >
                                    💾 Guardar Cambios de Promoción
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (hybridPrintMode || ticketPaperWidth === 'media-carta' || ticketPaperWidth === 'media-carta-duplicado') && !mediaCartaFrontTerms && (activeFormatTab === 'service' || activeFormatTab === 'service-batch') ? (
                        <div className="space-y-3">
                          <p className={`text-[9px] px-1 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            En Modo Clásico las cláusulas se imprimen al reverso del contrato (Media Carta). Aplica a servicio individual y grupal.
                          </p>
                          <div className="space-y-1">
                            <label className={`text-[10px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-emerald-400/95'}`}>
                              📋 Cláusulas del Contrato (reverso)
                            </label>
                            <textarea rows={8} value={contractClauses} onChange={e => setContractClauses(e.target.value)}
                              onBlur={handleSaveTicketConfig}
                              className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs font-mono leading-relaxed ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-zinc-300 focus:border-emerald-500'}`}
                              placeholder="Ej: 1. El taller no se hace responsable por datos perdidos. 2. El equipo debe recogerse en un plazo máximo de 30 días..." />
                          </div>
                        </div>
                      ) : activeFormatTab.startsWith('service') || activeFormatTab.startsWith('entry') || activeFormatTab.startsWith('delivery') ? (
                        <div className="space-y-3">
                          <p className={`text-[9px] px-1 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {mediaCartaFrontTerms 
                              ? 'En esta modalidad, los términos y condiciones se imprimen de forma compacta al frente de la hoja de servicio.'
                              : 'Estos campos aplican a todos los tickets de servicio: individual, grupal, recepción y recepción grupal.'}
                          </p>
                          <div className="space-y-1">
                            <label className={`text-[10px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-emerald-400/95'}`}>
                              Leyenda del Pie (Servicio Técnico)
                            </label>
                            <input type="text" value={ticketFooterService} onChange={e => setTicketFooterService(e.target.value)}
                              onBlur={handleSaveTicketConfig}
                              className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-white focus:border-emerald-500'}`}
                              placeholder="Ej: ¡Gracias por su confianza!" />
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[10px] uppercase font-bold block ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-emerald-400/95'}`}>
                              {mediaCartaFrontTerms ? '📄 Términos y Condiciones (Frente)' : 'Términos y Condiciones (todos los tickets de servicio)'}
                            </label>
                            <textarea rows={3} value={termsService} onChange={e => setTermsService(e.target.value)}
                              onBlur={handleSaveTicketConfig}
                              className={`w-full border focus:outline-none rounded px-2.5 py-1 text-xs font-mono leading-relaxed ${isRetro ? 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600' : isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-emerald-500' : 'bg-[#121316] border-[#2d2f36] text-zinc-300 focus:border-emerald-500'}`}
                              placeholder="Ej: El equipo se recibe para diagnóstico. No aplica garantía en equipos mojados." />
                          </div>
                          <div className="flex items-start gap-2.5 pt-1">
                            <input
                              type="checkbox"
                              id="toggle-ticket-signature"
                              checked={!hideTicketSignature}
                              onChange={e => {
                                const newVal = !e.target.checked;
                                setHideTicketSignature(newVal);
                                handleSaveTicketConfig({ hideTicketSignature: newVal });
                              }}
                              className={`mt-0.5 rounded focus:ring-0 cursor-pointer ${isRetro ? 'text-blue-600' : 'text-emerald-500'}`}
                            />
                            <div className="flex flex-col min-w-0">
                              <label htmlFor="toggle-ticket-signature" className={`text-[10px] uppercase font-bold cursor-pointer ${isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-650 font-bold' : 'text-emerald-450/95 font-bold'}`}>
                                ✍️ Imprimir área de firmas en tickets
                              </label>
                              <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                Desactiva esta opción si no requieres que tus clientes firmen de recibido el tique o el contrato de servicio.
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 pt-1">
                            <input
                              type="checkbox"
                              id="toggle-ticket-maps-qr-service"
                              checked={!hideMapsQr}
                              onChange={e => {
                                const newVal = !e.target.checked;
                                setHideMapsQr(newVal);
                                handleSaveTicketConfig({ hideMapsQr: newVal });
                              }}
                              className={`mt-0.5 rounded focus:ring-0 cursor-pointer ${isRetro ? 'text-blue-600' : 'text-emerald-500'}`}
                            />
                            <div className="flex flex-col min-w-0">
                              <label htmlFor="toggle-ticket-maps-qr-service" className={`text-[10px] uppercase font-bold cursor-pointer ${isRetro ? 'text-zinc-700 font-extrabold' : isLight ? 'text-zinc-650 font-bold' : 'text-emerald-450/95 font-bold'}`}>
                                🗺️ Imprimir Código QR de Google Maps en tickets
                              </label>
                              <span className={`text-[8.5px] ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                Imprime el código QR «Ubícanos en Google Maps» al final del pie de página de los tickets.
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className={`text-[9.5px] font-bold px-1 leading-relaxed ${isRetro ? 'text-zinc-700 font-mono' : isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {activeFormatTab.startsWith('cotizacion') 
                              ? 'ℹ️ El formato de cotización utiliza los datos generales del negocio y una nota predeterminada: "Este documento es una cotización y no implica compromiso de servicio."'
                              : activeFormatTab === 'apartado'
                              ? 'ℹ️ El formato de apartado utiliza las condiciones generales de apartado de forma predeterminada.'
                              : activeFormatTab === 'corte'
                              ? 'ℹ️ El formato de corte de caja utiliza la información resumida de los movimientos y transacciones registrados.'
                              : 'ℹ️ Este formato utiliza una estructura estándar y no requiere términos o leyendas adicionales configurables.'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>


              </div>
              {/* Footer fijo card 1 — wizard */}
              <div className={`px-5 py-3 border-t flex items-center justify-end shrink-0 ${
                isLight ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-800 bg-[#08080a]/80'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPrinter('etiquetas');
                    setShowThermalSimulator(false);
                    setShowLabelSimulator(true);
                  }}
                  className={`px-3 py-1.5 text-[10.5px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    isRetro 
                      ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                  }`}
                >
                  Siguiente (Etiquetas) ▶
                </button>
              </div>
              </div>
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setShowThermalSimulator(!showThermalSimulator)}
                      className={`px-3 py-1.5 font-bold text-[10.5px] uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080]' : 'bg-zinc-800 hover:bg-zinc-600 text-zinc-300 rounded-lg border border-zinc-700'
                      }`}>
                      <Printer className="w-3.5 h-3.5" />
                      {showThermalSimulator ? 'Ocultar Simulador' : '👁️ Simulador y Pruebas'}
                    </button>
                  </div>
                  {showThermalSimulator && (
                    <div className={`p-4 border space-y-4 animate-fade-in text-left ${
                      isRetro
                        ? 'bg-[#cbd6e2] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none shadow-inner'
                        : isLight
                          ? 'bg-zinc-100/60 border-zinc-200 rounded-xl'
                          : 'bg-[#0a0a0c]/60 border-zinc-700 rounded-xl'
                    }`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest text-center ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        🖨️ Simulador de Ticket Térmico — Papel {ticketPaperWidth} / Canal: {printerInterface}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold px-2 py-0.5 text-[9px] ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Papel: {ticketPaperWidth}</span>
                        <span className="text-zinc-400 text-[9px]">|</span>
                        <span className={`font-mono px-2 py-0.5 font-bold text-[9px] ${isRetro ? 'text-zinc-800' : 'text-zinc-400'}`}>Canal: {printerInterface}</span>
                        {activeFormatTab === 'pos' && (
                          <>
                            <span className="text-zinc-400 text-[9px]">|</span>
                            <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Variante:</span>
                            <button type="button" onClick={() => setPosPreviewVariant('mixed')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${posPreviewVariant === 'mixed' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Con múltiples
                            </button>
                            <button type="button" onClick={() => setPosPreviewVariant('unique')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${posPreviewVariant === 'unique' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Solo únicos
                            </button>
                          </>
                        )}
                        {activeFormatTab === 'service-batch' && (
                          <>
                            <span className="text-zinc-400 text-[9px]">|</span>
                            <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Variante:</span>
                            <button type="button" onClick={() => setServicePreviewVariant('with-anticipo')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${servicePreviewVariant === 'with-anticipo' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Con anticipo
                            </button>
                            <button type="button" onClick={() => setServicePreviewVariant('no-anticipo')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${servicePreviewVariant === 'no-anticipo' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Sin anticipo
                            </button>
                          </>
                        )}
                        {(hybridPrintMode || ticketPaperWidth === 'media-carta' || ticketPaperWidth === 'media-carta-duplicado') && !mediaCartaFrontTerms && (activeFormatTab === 'service' || activeFormatTab === 'service-batch') && (
                          <>
                            <span className="text-zinc-400 text-[9px]">|</span>
                            <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Cara:</span>
                            <button type="button" onClick={() => setServiceContractPage('front')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${serviceContractPage === 'front' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Frente
                            </button>
                            <button type="button" onClick={() => setServiceContractPage('back')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${serviceContractPage === 'back' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                              Reverso
                            </button>
                          </>
                        )}
                      </div>
                      <div className={`flex justify-center items-start py-4 border min-h-[280px] max-h-[600px] overflow-y-auto ${
                        isRetro ? 'bg-zinc-200 border-zinc-300' : 'bg-[#050507] border-zinc-900/60'
                      }`}>
                        <div className={`shadow-lg border border-zinc-300 select-text bg-white p-0 ${(() => {
                          const _thermalTab = activeFormatTab === 'pos' || activeFormatTab === 'corte' || activeFormatTab === 'apartado' || activeFormatTab === 'fiado-abono' || activeFormatTab === 'fiado-liquidacion' || activeFormatTab === 'recarga';
                          let _ew = hybridPrintMode ? (_thermalTab ? posPaperWidth : ticketPaperWidth) : ticketPaperWidth;
                          if (_thermalTab && (_ew === 'media-carta' || _ew === 'media-carta-duplicado')) {
                            _ew = posPaperWidth && posPaperWidth !== 'media-carta' && posPaperWidth !== 'media-carta-duplicado' ? posPaperWidth : '80mm';
                          }
                          return _ew === '58mm' ? 'max-w-[250px]' : (_ew === 'media-carta' || _ew === 'media-carta-duplicado' ? 'max-w-[850px] w-full' : 'max-w-[330px]');
                        })()}`}>
                          {renderTicketContent()}
                        </div>
                      </div>
                      {testFeedbackTicket && (
                        <p className={`text-[10px] font-bold text-center ${testFeedbackTicket.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {testFeedbackTicket}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" onClick={() => {
                          const _thermalTab = activeFormatTab === 'pos' || activeFormatTab === 'corte' || activeFormatTab === 'apartado' || activeFormatTab === 'fiado-abono' || activeFormatTab === 'fiado-liquidacion' || activeFormatTab === 'recarga';
                          const html = activeFormatTab === 'pos'
                            ? buildPosTicketHtml({ id: 'POS-PREVIEW', items: [{ description: 'Mica de Privacidad Del...', quantity: 1, price: 150 }, { description: 'Sub Multi-puerto USB-C', quantity: 1, price: 450 }, { description: 'Funda Silicon Premium', quantity: 2, price: 140 }], total: 880, createdAt: new Date().toISOString(), paymentMethod: 'Efectivo', cashReceived: 1000, change: 120 }, { ...config, storeName, phone, ticketPaperWidth, posPaperWidth, printDuplexContract, mediaCartaFrontTerms, ticketMarginOffset } as any)
                            : activeFormatTab === 'recarga'
                            ? buildRechargeTicketHtml({ id: 'E-0005', items: [{ itemId: 'recharge-telcel', name: 'Telcel Tiempo Aire $10 ((351) 157-4876)', description: 'Telcel Tiempo Aire $10 ((351) 157-4876)', quantity: 1, price: 10 }, { itemId: 'recharge-commission', name: 'Comisión de Recarga / Pago de Servicio', description: 'Comisión de Recarga / Pago de Servicio', quantity: 1, price: 3 }], total: 13, createdAt: new Date().toISOString(), paymentMethod: 'Efectivo', cashReceived: 50, change: 37, confirmationCode: 'Folio Aut: 865694 | Ref: TX-789330349', createdBy: 'Hugo García' } as any, { ...config, storeName, phone, ticketPaperWidth, posPaperWidth, printDuplexContract, mediaCartaFrontTerms, ticketMarginOffset } as any)
                            : buildTicketHtml({ id: 'ORD-PREVIEW', customerName: 'HUGO GARCIA', customerPhone: '(351) 123-4578', customerCountryCode: '+52', deviceBrand: 'Apple', deviceModel: 'iPhone 14 Pro', deviceModelNumber: 'A2890', deviceType: 'Phone', devicePin: 'PATRÓN: 0-1-3-6-8', faultDescription: 'Pantalla rota', serviceType: 'Cambio de Pantalla', assignedTechnician: '', cost: 1200, advancePayment: 0, createdAt: new Date().toISOString(), estimatedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'Pendiente', isPaid: false } as any, { ...config, storeName, phone, ticketPaperWidth, posPaperWidth, printDuplexContract, mediaCartaFrontTerms, ticketMarginOffset } as any);
                          const eAPI = (window as any).electronAPI;
                          if (eAPI?.silentPrintHtml) {
                            let effectiveWidth = hybridPrintMode ? (_thermalTab ? posPaperWidth : ticketPaperWidth) : ticketPaperWidth;
                            if (_thermalTab && (effectiveWidth === 'media-carta' || effectiveWidth === 'media-carta-duplicado')) {
                              effectiveWidth = '80mm';
                            }
                            eAPI.silentPrintHtml({
                              html,
                              deviceName: ticketPrinterBrand || '',
                              paperWidthMicrons: effectiveWidth === '58mm' ? 48000 : (effectiveWidth === 'media-carta-duplicado' ? 210000 : effectiveWidth === 'media-carta' ? 215900 : 72000),
                              paperHeightMicrons: ticketPaperHeight > 0 ? (ticketPaperHeight * 1000) : (effectiveWidth === 'media-carta' ? 139700 : (effectiveWidth === 'media-carta-duplicado' ? 297000 : undefined)),
                              isLabel: false,
                              duplexMode: (activeFormatTab !== 'pos' && printDuplexContract && !duplexManual) ? 'longEdge' : undefined,
                              useDynamicHeight,
                              usePrinterDefaultPageSize,
                              selectedPrinterProfileId: selectedPrinterProfileId || config.selectedPrinterProfileId
                            })
                              .then(() => setTestFeedbackTicket('✅ Ticket enviado'))
                              .catch(() => setTestFeedbackTicket('⚠️ No se pudo imprimir'));
                          } else {
                            setTestFeedbackTicket('⚠️ silentPrintHtml no disponible');
                          }
                          setTimeout(() => setTestFeedbackTicket(null), 4000);
                        }} className={`px-3 py-1.5 text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded'}`}>
                          <Printer className="w-3 h-3" /> Imprimir prueba
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedPrinter === 'etiquetas' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in">
                <div className="flex flex-col space-y-4">
                  <div id="card-etiquetas" className={`flex flex-col border ${
                isRetro
                  ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 rounded-none shadow-sm'
                  : isLight
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl'
                    : 'bg-[#08080a]/60 border-zinc-700 text-zinc-100 rounded-xl'
              }`}>
              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 pb-2.5 border-b ${
                    isLight ? 'border-zinc-300' : 'border-zinc-900'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${
                      isRetro 
                        ? 'bg-amber-100 text-amber-800 border border-zinc-400' 
                        : isLight 
                          ? 'bg-zinc-200/60 text-zinc-700' 
                          : 'bg-amber-500/10 text-amber-450'
                    }`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold uppercase tracking-wider ${
                        isRetro ? 'text-amber-900 font-black' : 'text-white'
                      }`}>
                        Impresora de Etiquetas Adhesivas
                      </h5>
                      <p className={`text-[10px] leading-tight ${
                        isRetro ? 'text-zinc-700 font-medium' : 'text-zinc-500'
                      }`}>
                        Identificadores de equipos, códigos QR y control de taller
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenPrinterWizard('label')}
                        className={`text-[9.5px] font-bold block mt-1 text-left cursor-pointer underline transition-all hover:opacity-80 active:scale-95 ${
                          isRetro ? 'text-amber-900' : isLight ? 'text-emerald-700' : 'text-[#34d399]'
                        }`}
                      >
                        ❓ ¿Tus etiquetas no salen alineadas o a la medida? Te ayudo aquí
                      </button>
                    </div>
                  </div>

                  {/* Configuración física simplificada e intuitiva */}
                  <div id="card-label-printer-physical-config" className={`p-4 border space-y-4 ${
                    isRetro 
                      ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none text-zinc-900' 
                      : isLight 
                        ? 'bg-zinc-150/40 border-zinc-200 text-zinc-700 rounded-xl' 
                        : 'bg-[#0b0c10] border-[#1c1d22] text-zinc-100 rounded-xl'
                  }`}>
                    <span className={`text-[10px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                      isRetro ? 'text-amber-900 border-zinc-300' : isLight ? 'text-amber-700 border-zinc-200' : 'text-[#f59e0b] border-zinc-950'
                    }`}>
                      🔌 SELECCIÓN DE IMPRESORA LOCAL (ETIQUETAS ADHESIVAS)
                    </span>

                    {/* Impresora Activa Seleccionada */}
                    {(() => {
                      const activePrinter = scannedLabelPrintersList.find(x => x.id === selectedLabelPrinterId) || {
                        name: labelPrinterBrand || 'Sin impresora configurada',
                        interface: labelPrinterInterface || 'Default',
                        paperSize: labelPaperSize,
                        details: 'Controlador local para impresión de pegatinas adhesivas.'
                      };
                      return (
                        <div id="active-label-printer-box" className={`border-2 p-3 text-left ${
                          isRetro 
                            ? 'bg-amber-50/70 border-amber-900/60 text-zinc-900 rounded-none shadow-sm' 
                            : isLight 
                              ? 'bg-amber-50/60 border-amber-500/20 text-zinc-800 rounded-lg' 
                              : 'bg-amber-950/10 border-amber-500/30 text-white rounded-lg'
                        }`}>
                          <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded font-black tracking-wider inline-block mb-1.5 shadow-sm ${
                            isRetro ? 'bg-[#b45309] text-white retro-white-text' : 'bg-amber-500 text-black'
                          }`}>
                            🟢 IMPRESORA DE ETIQUETAS EN USO
                          </span>
                          <h6 className={`text-xs font-black ${isRetro ? 'text-amber-900 font-mono' : ''}`}>{activePrinter.name}</h6>
                          <p className={`text-[9.5px] mt-0.5 leading-snug ${isRetro ? 'text-zinc-700 font-bold' : 'text-zinc-400'}`}>{activePrinter.details}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                              isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                            }`}>
                              Tipo: {activePrinter.interface === 'Default' ? 'Controlador Local / Sistema' : activePrinter.interface}
                            </span>
                            <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                              isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                            }`}>
                              Medidas: {labelPaperSize}
                            </span>
                          </div>
                          <div className={`mt-2 pt-2 border-t ${isRetro ? 'border-zinc-300' : 'border-amber-500/20'}`}>
                            <p className={`text-[8px] uppercase font-mono font-bold mb-1 ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>Usada para imprimir:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {config.enableTaller !== false && (
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                  isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-amber-950/30 text-amber-300 border-amber-700/40'
                                }`}>🏷️ Etiqueta de Servicio Técnico</span>
                              )}
                              {config.enablePOS !== false && (
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                  isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-amber-950/30 text-amber-300 border-amber-700/40'
                                }`}>📦 Etiqueta de Producto / Inventario</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Acciones para buscar/detectar instantáneamente */}
                    <div className="space-y-2 text-left">
                      <span className={`text-[9.5px] uppercase font-bold block ${
                        isRetro ? 'text-zinc-700 font-sans' : 'text-zinc-400'
                      }`}>
                        ¿Cómo deseas conectar la impresora de etiquetas?
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          id="btn-scan-label-printers"
                          type="button"
                          disabled={isDetectingPrinters}
                          onClick={handleDetectPrinters}
                          className={`flex-1 h-9 font-extrabold text-[10.5px] uppercase flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-amber-900 rounded-none hover:bg-zinc-200' 
                              : 'bg-amber-500 hover:bg-amber-600 text-black rounded-lg shadow-sm'
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isDetectingPrinters ? 'animate-spin' : ''}`} />
                          {isDetectingPrinters ? 'Buscando...' : '🔎 Buscar Impresoras'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setScannedLabelPrintersList([]); setSelectedLabelPrinterId(''); setLabelPrinterBrand(''); setLabelPrinterInterface('Default'); onUpdateConfig({...config, labelPrinterBrand: '', labelPrinterInterface: 'Default'}); }}
                          className={`h-9 px-3 font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-all select-none active:scale-95 cursor-pointer ${
                            isRetro
                              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 rounded-none'
                              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg'
                          }`}
                        >
                          🗑 Reset
                        </button>
                      </div>
                    </div>

                    {/* Feedbacks de Operaciones de Etiquetas */}

                    {/* Lista Súper Simplificada de Impresoras con Botón Directo */}
                    <div className="space-y-2 text-left">
                      <span className={`text-[9px] font-bold uppercase block ${
                        isRetro ? 'text-zinc-700 font-sans' : 'text-zinc-500'
                      }`}>
                        Impresoras de etiquetas disponibles:
                      </span>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {scannedLabelPrintersList.map((hw) => {
                          const isSelected = selectedLabelPrinterId === hw.id;
                          return (
                            <div
                              key={hw.id}
                              onClick={() => {
                                setSelectedLabelPrinterId(hw.id);
                                setLabelPrinterBrand(hw.name);
                                setLabelPrinterInterface(hw.interface);
                                const resolvedIface = hw.interface === 'Default' ? 'USB' : hw.interface; onUpdateConfig({...config, labelPrinterBrand: hw.name, labelPrinterInterface: resolvedIface});
                              }}
                              className={`p-2.5 border text-left transition-all cursor-pointer flex justify-between items-center ${
                                isSelected
                                  ? (isRetro ? 'bg-amber-50 border-amber-900 rounded-none shadow-sm' : 'bg-amber-950/15 border-amber-500/60 hover:bg-amber-950/20 rounded-lg')
                                  : (isRetro 
                                      ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' 
                                      : 'bg-[#121316] border-zinc-900 hover:border-zinc-700 hover:bg-[#191b21] rounded-lg')
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <Printer className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-amber-900' : 'text-zinc-400'}`} />
                                  <h6 className={`text-[11px] font-bold truncate leading-none ${isRetro ? 'text-zinc-900 font-mono' : 'text-white'}`}>
                                    {hw.name}
                                  </h6>
                                </div>
                                <p className={`text-[9.5px] mt-1 truncate ${isRetro ? 'text-zinc-500 font-sans font-medium' : 'text-zinc-500'}`}>
                                  {hw.details}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {isSelected ? (
                                  <span className={`px-2 py-1 font-extrabold text-[8.5px] uppercase shadow-sm flex items-center gap-1 ${
                                    isRetro ? 'bg-[#b45309] text-white retro-white-text rounded-none' : 'bg-amber-500 text-black rounded'
                                  }`}>
                                    ✓ Activa
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLabelPrinterId(hw.id);
                                      setLabelPrinterBrand(hw.name);
                                      setLabelPrinterInterface(hw.interface);
                                      setTimeout(() => handleSaveLabelConfig(), 50);
                                    }}
                                    className={`px-2 py-1 border font-bold text-[8.5px] uppercase transition-all cursor-pointer ${
                                      isRetro
                                        ? 'bg-[#b45309] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                                        : 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white rounded'
                                    }`}
                                  >
                                    ✓ Usar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`flex items-center justify-between gap-1.5 border-t pt-2 text-left ${
                      isLight ? 'border-zinc-300' : 'border-zinc-900'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase font-mono ${
                        isRetro ? 'text-zinc-700 font-bold' : 'text-zinc-400'
                      }`}>Copias por Impresión:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="input-print-label-copies"
                          type="number"
                          min={1}
                          max={5}
                          value={printLabelCopies}
                          onChange={e => setPrintLabelCopies(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                          className={`w-12 border focus:outline-none rounded py-0.5 text-xs text-center font-mono ${
                            isRetro 
                              ? 'bg-white border-zinc-400 text-zinc-900' 
                              : 'bg-zinc-900 border-[#2d2f36] focus:border-amber-500 text-white'
                          }`}
                        />
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">marcas</span>
                      </div>
                    </div>

                    {/* IP de Etiqueta */}
                    {labelPrinterInterface === 'Ethernet' && (
                      <div id="label-printer-ethernet-box" className={`border p-2.5 rounded-lg space-y-2 animate-fade-in text-left ${
                        isRetro ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#08080a] border-[#2d2f36] text-white'
                      }`}>
                        <div className="space-y-1">
                          <label className={`text-[9px] uppercase font-bold block ${
                            isRetro ? 'text-[#000080]' : 'text-[#f59e0b]'
                          }`}>
                            Dirección IP
                          </label>
                          <div className="flex gap-1.5 font-sans">
                            <input
                              id="input-label-printer-ip"
                              type="text"
                              required
                              placeholder="192.168.1.101"
                              value={labelPrinterIpAddress}
                              onChange={e => setLabelPrinterIpAddress(e.target.value)}
                              className={`flex-1 border focus:outline-none rounded px-2 py-1 text-xs font-mono mb-0.5 ${
                                isRetro 
                                  ? 'bg-white border-zinc-400 text-zinc-900' 
                                  : 'bg-[#121316] border-[#2d2f36] focus:border-amber-500 text-white'
                              }`}
                            />
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 text-[9px] text-zinc-400 rounded flex items-center justify-center font-mono font-bold">
                              Port: 9100
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configuración Visual de Etiqueta */}
                  <div className={`p-4 rounded-xl border space-y-4 ${
                    isRetro 
                      ? 'bg-[#cbd6e2] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none' 
                      : isLight 
                        ? 'bg-zinc-100/75 border-zinc-200 text-zinc-600' 
                        : 'bg-zinc-950/40 border-zinc-900 text-zinc-100'
                  }`}>
                    <span className={`text-[9.5px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                      isRetro ? 'text-amber-900 border-zinc-300' : isLight ? 'text-amber-700 border-zinc-200' : 'text-[#f59e0b] border-zinc-900'
                    }`}>🎨 Contenido y Parámetros del Formato</span>


                    {/* EDITOR DE PLANTILLA PERSONALIZADA */}
                    <div className={`p-4 rounded-xl space-y-4 border ${
                      isRetro 
                        ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900 rounded-none shadow-sm' 
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-800' 
                          : 'bg-[#0b0c0e]/80 border-zinc-900 text-zinc-100'
                    }`}>
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-2 ${
                          isLight ? 'border-zinc-300' : 'border-zinc-900'
                        }`}>
                          <label className={`text-[10.5px] uppercase font-bold tracking-wider flex items-center gap-1.5 select-none font-sans ${
                            isRetro ? 'text-amber-900 font-extrabold' : isLight ? 'text-zinc-900 font-extrabold' : 'text-amber-500'
                          }`}>
                            📄 Formulario de Etiquetas Independientes
                          </label>
                          <div className={`flex rounded p-0.5 border shrink-0 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none' 
                              : isLight 
                                ? 'bg-zinc-100 border-zinc-200' 
                                : 'bg-zinc-950 border-zinc-900'
                          }`}>
                            {!config.hybridPrintMode && enableTaller && (
                              <button
                                type="button"
                                onClick={() => setActiveLabelFormatTab('service')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeLabelFormatTab === 'service'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📱 Servicio
                              </button>
                            )}
                            {enablePOS && (
                              <button
                                type="button"
                                onClick={() => setActiveLabelFormatTab('product')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeLabelFormatTab === 'product'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                📦 Producto
                              </button>
                            )}
                            {!config.hybridPrintMode && enableTaller && (
                              <button
                                type="button"
                                onClick={() => setActiveLabelFormatTab('warranty')}
                                className={`px-2.5 py-1 text-[9.5px] font-bold rounded uppercase transition-all cursor-pointer ${
                                  activeLabelFormatTab === 'warranty'
                                    ? (isRetro ? 'bg-[#000080] text-white retro-white-text font-black border border-white' : 'bg-amber-500 text-black font-extrabold')
                                    : (isLight ? 'text-zinc-700 hover:text-black hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                                }`}
                              >
                                🛡️ Garantía
                              </button>
                            )}
                          </div>
                       </div>

                       {/* Opciones de contenido de etiqueta de servicio */}
                       {activeLabelFormatTab === 'service' && (
                         <div className={`p-3 rounded-lg border flex items-center justify-between my-3 ${
                           isRetro
                             ? 'bg-amber-100/60 border-amber-300 text-zinc-900'
                             : isLight
                               ? 'bg-amber-50 border-amber-200 text-zinc-800'
                               : 'bg-amber-950/20 border-amber-800/40 text-zinc-200'
                         }`}>
                           <div className="flex items-center gap-2">
                             <span className="text-base">🙈</span>
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-wide">Ocultar Precio en Etiqueta de Servicio</p>
                               <p className="text-[9px] opacity-80">Ideal para maquila / reparaciones enviadas a técnicos externos</p>
                             </div>
                           </div>
                           <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-3">
                             <input
                               type="checkbox"
                               checked={hidePriceOnLabel}
                               onChange={e => { const val = e.target.checked; setHidePriceOnLabel(val); handleSaveTicketConfig({ hidePriceOnLabel: val }); }}
                               className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                             />
                             <span className="text-[10px] font-black uppercase">{hidePriceOnLabel ? 'OCULTADO' : 'VISIBLE'}</span>
                           </label>
                         </div>
                       )}

                       {/* Opciones de contenido de etiqueta de producto */}
                       {activeLabelFormatTab === 'product' && (
                         <div className={`p-3 rounded-lg border flex items-center justify-between my-3 transition-all ${
                           isRetro
                             ? 'bg-amber-100/60 border-amber-300 text-zinc-900'
                             : isLight
                               ? 'bg-amber-50 border-amber-200 text-zinc-800'
                               : 'bg-amber-950/20 border-amber-800/40 text-zinc-200'
                         }`}>
                           <div className="flex items-center gap-2">
                             <span className="text-base">🏢</span>
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-wide">Ocultar Nombre del Negocio</p>
                               <p className="text-[9px] opacity-80 font-medium">Da más espacio vertical al código de barras en la etiqueta</p>
                             </div>
                           </div>
                           <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 ml-3">
                             <input
                               type="checkbox"
                               checked={hideStoreNameOnLabel}
                               onChange={e => { const val = e.target.checked; setHideStoreNameOnLabel(val); handleSaveTicketConfig({ hideStoreNameOnLabel: val }); }}
                               className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                             />
                             <span className="text-[10px] font-black uppercase">{hideStoreNameOnLabel ? 'OCULTADO' : 'VISIBLE'}</span>
                           </label>
                         </div>
                       )}

                       {/* Selector de tamaño de etiqueta */}
                       <div className="mt-3">
                         <span className={`text-[9px] uppercase font-mono tracking-widest font-bold block mb-1.5 ${
                           isRetro ? 'text-amber-900' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                         }`}>📐 Tamaño de etiqueta</span>
                         <div className="flex flex-wrap gap-1.5">
                           {([
                             { key: '51x25mm', label: '51×25 mm', note: 'Estándar' },
                             { key: '50x30mm', label: '50×30 mm', note: 'Popular' },
                             { key: '40x20mm', label: '40×20 mm', note: 'Pequeña' },
                             { key: '40x30mm', label: '40×30 mm', note: 'Cuadrada' },
                             { key: '60x30mm', label: '60×30 mm', note: 'Media' },
                             { key: '30x15mm', label: '30×15 mm', note: 'Mini' },
                             { key: '38x25mm', label: '38×25 mm', note: 'Joyería' },
                             { key: '57x32mm', label: '57×32 mm', note: 'Drupal' },
                             { key: '100x50mm', label: '100×50 mm', note: 'Grande' },
                              { key: '58x40mm', label: '58 mm', note: 'Ticket 58' },
                              { key: '80x50mm', label: '80 mm', note: 'Ticket 80' },
                           ] as { key: string; label: string; note: string }[]).map(size => (
                             <button
                               key={size.key}
                               type="button"
                               onClick={() => setLabelPaperSize(size.key as any)}
                               className={`flex flex-col items-center px-2 py-1 text-[8.5px] font-bold rounded border transition-all cursor-pointer leading-tight ${
                                 labelPaperSize === size.key
                                   ? (isRetro ? 'bg-[#b45309] text-white border-[#b45309]' : 'bg-amber-500 text-black border-amber-500')
                                   : (isLight ? 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-amber-500')
                               }`}
                             >
                               <span className="font-black">{size.label}</span>
                               <span className="opacity-70 text-[7px]">{size.note}</span>
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Orientación de Etiqueta */}
                       <div className="mt-3 pt-2.5 border-t border-zinc-700/40 flex flex-col gap-1.5">
                         <span className={`text-[9px] uppercase font-mono tracking-widest font-bold ${
                           isRetro ? 'text-amber-900' : isLight ? 'text-zinc-650' : 'text-amber-400'
                         }`}>🔄 Orientación de Impresión de Etiqueta</span>
                         <div className="flex gap-1.5">
                           {[
                             { key: 'horizontal', label: 'Horizontal (Acostado)' },
                             { key: 'vertical', label: 'Vertical (Parado)' },
                           ].map(opt => (
                             <button
                               key={opt.key}
                               type="button"
                               onClick={() => {
                                 setLabelOrientation(opt.key as any);
                                 handleSaveTicketConfig({ labelOrientation: opt.key as any });
                               }}
                               className={`px-3 py-1.5 text-[8.5px] font-bold rounded border transition-all cursor-pointer ${
                                 labelOrientation === opt.key
                                   ? (isRetro ? 'bg-[#b45309] text-white border-[#b45309]' : 'bg-amber-500 text-black border-amber-500')
                                   : (isLight ? 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-amber-500')
                               }`}
                             >
                               {opt.label}
                             </button>
                           ))}
                         </div>
                       </div>

                        {/* Selección de Estilo de Plantilla Predeterminada (Para SERVICIO) */}
                        {activeLabelFormatTab === 'service' && (
                          <div className="mt-3 pt-2.5 border-t border-zinc-700/40 flex flex-col gap-1.5">
                            <span className={`text-[9px] uppercase font-mono tracking-widest font-bold ${
                              isRetro ? 'text-amber-900' : isLight ? 'text-zinc-600' : 'text-amber-400'
                            }`}>🎨 Diseño / Plantilla Predeterminada de Etiquetas (Servicio)</span>
                            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                              {[
                                { id: 'standard', title: '🏷️ Estándar Taller', desc: 'Plantilla principal actual' },
                                { id: 'vitrina', title: '🏪 Vitrina POS', desc: 'Precio en insignia negra' },
                                { id: 'qr', title: '📱 QR Híbrido', desc: 'Escaneo 2D y cámara' },
                                { id: 'technical', title: '📋 Ficha Técnica', desc: 'Patrón 3x3 y notas amplias' },
                              ].map(tpl => (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    setServiceLabelTemplateStyle(tpl.id as any);
                                    handleSaveTicketConfig({ serviceLabelTemplateStyle: tpl.id as any });
                                  }}
                                  className={`flex flex-col text-left p-2 rounded border cursor-pointer transition-all ${
                                    serviceLabelTemplateStyle === tpl.id
                                      ? (isRetro ? 'bg-[#b45309] text-white border-[#b45309]' : 'bg-amber-500/20 text-amber-400 border-amber-500')
                                      : (isLight ? 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/50')
                                  }`}
                                >
                                  <span className="font-bold text-[10px]">{tpl.title}</span>
                                  <span className="text-[8px] opacity-70 mt-0.5">{tpl.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selección de Estilo de Plantilla Predeterminada (Solo para etiquetas de PRODUCTO) */}
                        {activeLabelFormatTab === 'product' && (
                          <div className="mt-3 pt-2.5 border-t border-zinc-700/40 flex flex-col gap-1.5">
                            <span className={`text-[9px] uppercase font-mono tracking-widest font-bold ${
                              isRetro ? 'text-amber-900' : isLight ? 'text-zinc-600' : 'text-amber-400'
                            }`}>🎨 Diseño / Plantilla Predeterminada de Etiquetas (Producto)</span>
                            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                              {[
                                { id: 'standard', title: '🏷️ Estándar Clásico', desc: 'Limpio tradicional' },
                                { id: 'vitrina', title: '🏪 Vitrina POS', desc: 'Precio en insignia negra' },
                                { id: 'qr', title: '📱 QR Híbrido', desc: 'Escaneo 2D y cámara' },
                                { id: 'technical', title: '📋 Ficha Técnica', desc: 'Nombres largos multilínea' },
                              ].map(tpl => (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    setLabelTemplateStyle(tpl.id as any);
                                    handleSaveTicketConfig({ labelTemplateStyle: tpl.id as any });
                                  }}
                                  className={`flex flex-col text-left p-2 rounded border cursor-pointer transition-all ${
                                    labelTemplateStyle === tpl.id
                                      ? (isRetro ? 'bg-[#b45309] text-white border-[#b45309]' : 'bg-amber-500/20 text-amber-400 border-amber-500')
                                      : (isLight ? 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/50')
                                  }`}
                                >
                                  <span className="font-bold text-[10px]">{tpl.title}</span>
                                  <span className="text-[8px] opacity-70 mt-0.5">{tpl.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                       {/* Ajuste de Desplazamiento Horizontal (Solo para formatos 58mm y 80mm) */}
                       {(labelPaperSize === "58x40mm" || labelPaperSize === "80x50mm") && (
                       <div className="mt-3 pt-2.5 border-t border-zinc-700/40 flex flex-col gap-1.5">
                         <div className="flex items-center justify-between">
                           <span className={`text-[9px] uppercase font-mono tracking-widest font-bold ${
                             isRetro ? 'text-amber-900' : isLight ? 'text-zinc-600' : 'text-amber-400'
                           }`}>↔️ Margen Horizontal de Etiqueta</span>
                           <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                             isRetro
                               ? 'bg-[#dfdfdf] text-[#000080] border border-zinc-400'
                               : isLight
                                 ? 'bg-zinc-200 text-zinc-800'
                                 : 'bg-[#121316] text-amber-400 border border-amber-500/30'
                           }`}>
                             {labelMarginOffset > 0 ? `+${labelMarginOffset}` : labelMarginOffset}px
                           </span>
                         </div>
                         <div className="flex items-center gap-2">
                           <input
                             type="range"
                             min="-30"
                             max="30"
                             value={labelMarginOffset}
                             onChange={(e) => setLabelMarginOffset(parseInt(e.target.value, 10))}
                             className="w-full cursor-pointer accent-amber-500"
                           />
                         </div>
                         <span className={`text-[8.5px] ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                           Desplaza la impresión horizontalmente para centrar el contenido en tu impresora de etiquetas / ticket.
                         </span>
                       </div>
                        )}

                    </div>
                  </div>

                  {/* espacio para que el simulador no quede pegado al footer */}

                </div>
              </div>
              {/* Footer fijo card 2 — wizard */}
              <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
                isLight ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-800 bg-[#08080a]/80'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPrinter('tickets');
                    setShowThermalSimulator(true);
                    setShowLabelSimulator(false);
                  }}
                  className={`px-3 py-1.5 text-[10.5px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    isRetro 
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black' 
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                >
                  ◀ Anterior (Tickets)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPrinter('reportes');
                    setShowThermalSimulator(false);
                    setShowLabelSimulator(false);
                  }}
                  className={`px-3 py-1.5 text-[10.5px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    isRetro 
                      ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                  }`}
                >
                  Siguiente (Reportes) ▶
                </button>
              </div>
              </div>
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setShowLabelSimulator(!showLabelSimulator)}
                      className={`px-3 py-1.5 font-bold text-[10.5px] uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-orange-900' : 'bg-zinc-800 hover:bg-zinc-600 text-zinc-300 rounded-lg border border-zinc-700'
                      }`}>
                      <Tag className="w-3.5 h-3.5" />
                      {showLabelSimulator ? 'Ocultar Simulador' : '👁️ Simulador y Pruebas'}
                    </button>
                  </div>
                  {showLabelSimulator && (
                    <div className={`p-4 border rounded-xl ${
                      isRetro ? 'bg-[#cbd6e2] border-zinc-300' : isLight ? 'bg-zinc-100/60 border-zinc-200' : 'bg-[#0a0a0c]/60 border-zinc-700'
                    }`}>
                      <div className="flex flex-col items-center gap-3">
                        <p className={`text-[9px] font-bold uppercase tracking-widest text-center ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          Vista previa — {activeLabelFormatTab === 'service' ? 'Etiqueta de Servicio' : activeLabelFormatTab === 'product' ? 'Etiqueta de Producto' : 'Etiqueta de Garantía'}
                        </p>
                        {activeLabelFormatTab === 'service' && (
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Variante:</span>
                              <button type="button" onClick={() => setLabelPreviewVariant('individual')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewVariant === 'individual' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Individual
                              </button>
                              <button type="button" onClick={() => setLabelPreviewVariant('grupal')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewVariant === 'grupal' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Grupal (2/3)
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Acceso:</span>
                              <button type="button" onClick={() => setLabelPreviewAccess('patron')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewAccess === 'patron' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Con Patrón
                              </button>
                              <button type="button" onClick={() => setLabelPreviewAccess('pin')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewAccess === 'pin' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Con PIN
                              </button>
                              <button type="button" onClick={() => setLabelPreviewAccess('ninguno')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewAccess === 'ninguno' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Sin Clave
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Servicio:</span>
                              <button type="button" onClick={() => setLabelPreviewService('corto')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewService === 'corto' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Corto
                              </button>
                              <button type="button" onClick={() => setLabelPreviewService('largo')}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewService === 'largo' ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Largo
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Notas:</span>
                              <button type="button" onClick={() => setLabelPreviewNotes(true)}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${labelPreviewNotes ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Con Notas
                              </button>
                              <button type="button" onClick={() => setLabelPreviewNotes(false)}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${!labelPreviewNotes ? (isRetro ? (isLight ? 'bg-[#000080] text-white' : 'bg-blue-950/80 border border-blue-500 text-blue-100') : 'bg-emerald-600 text-white') : (isRetro ? (isLight ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-900 border border-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-400')}`}>
                                Mano Alzada
                              </button>
                            </div>
                          </div>
                        )}
                        {(() => {
                          const previewConfig = { ...config, storeName, phone, labelPaperSize, hidePriceOnLabel, labelMarginOffset, labelTemplateStyle } as any;
                          let previewHtml = '';
                          if (activeLabelFormatTab === 'service') {
                            const mockOrder = {
                              id: 'ORD-1077', customerName: 'ARTURO OROPEZA MAGAÑA',
                              customerPhone: '3512595738', customerCountryCode: '+52',
                              deviceBrand: 'MOTOROLA', deviceModel: 'G 5G 2024',
                              deviceModelNumber: 'XT2417-1', deviceType: 'Phone' as const,
                              devicePin: labelPreviewAccess === 'patron' ? 'PATRÓN: 0-1-3-6-8' : (labelPreviewAccess === 'pin' ? '4912' : 'SIN CLAVE'),
                              faultDescription: '',
                              serviceType: labelPreviewService === 'corto' ? 'LIBERACION' : 'CAMBIO DE PANTALLA Y BATERIA COMPATIBLE DE ALTA CALIDAD',
                              diagnosticsNote: labelPreviewNotes
                                ? (labelPreviewService === 'corto'
                                    ? 'TRAE MICA ESTRELLADA, REVISAR BOTON VOLUMEN.'
                                    : 'TRAE MICA ESTRELLADA, REVISAR BOTON VOLUMEN MAS, CARCASA RAYADA, ENTREGAR LIMPIO Y COMPLETO CON GARANTIA.')
                                : 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.',
                              showNotesOnLabel: labelPreviewNotes,
                              hidePriceOnLabel: hidePriceOnLabel,
                              assignedTechnician: '',
                              cost: 1850, advancePayment: 0,
                              createdAt: new Date().toISOString(),
                              estimatedDeliveryDate: new Date().toISOString(),
                              status: 'Pendiente' as const, isPaid: false,
                            };
                            previewHtml = buildServiceLabelHtml(
                              mockOrder as any, previewConfig,
                              labelPreviewVariant === 'grupal' ? 2 : undefined,
                              labelPreviewVariant === 'grupal' ? 3 : undefined,
                              serviceLabelTemplateStyle
                            );
                          } else if (activeLabelFormatTab === 'warranty') {
                            const mockOrder = {
                              id: 'TKT-158', customerName: 'HUGO GARCIA SANCHEZ',
                              customerPhone: '3512595738', customerCountryCode: '+52',
                              deviceBrand: 'APPLE', deviceModel: 'IPHONE 11',
                              deviceModelNumber: 'A2111', deviceType: 'Phone' as const,
                              devicePin: 'SIN CLAVE',
                              faultDescription: '',
                              serviceType: 'CAMBIO DE PANTALLA',
                              diagnosticsNote: 'SELLO DE SEGURIDAD DEL TALLER.',
                              showNotesOnLabel: false,
                              assignedTechnician: '',
                              cost: 1250, advancePayment: 0,
                              createdAt: new Date().toISOString(),
                              estimatedDeliveryDate: new Date().toISOString(),
                              status: 'Entregado' as const, isPaid: true,
                            };
                            previewHtml = buildWarrantyLabelHtml(mockOrder as any, previewConfig, 50);
                          } else {
                            previewHtml = buildProductLabelHtml(
                              { name: 'MICA NORMAL', price: 65, sku: '75001234' },
                              previewConfig,
                              labelTemplateStyle
                            );
                          }
                          const mmToPx = 3.78;
                          const [mmW, mmH] = (labelPaperSize || '51x25mm').replace('mm','').split('x').map(Number);
                          const scale = 2.5;
                          const realW = Math.round(mmW * mmToPx);
                          const realH = Math.round(mmH * mmToPx);
                          return (
                            <div style={{ width: `${realW * scale}px`, height: `${realH * scale}px`, overflow: 'hidden', borderRadius: '4px', border: '1px solid #444', flexShrink: 0 }}>
                              <iframe
                                key={activeLabelFormatTab + storeName + labelPaperSize + String(labelTemplateStyle) + String(serviceLabelTemplateStyle) + labelPreviewVariant + labelPreviewAccess + labelPreviewService + labelPreviewNotes + String(hidePriceOnLabel) + String(hideStoreNameOnLabel) + String(labelMarginOffset)}
                                srcDoc={previewHtml}
                                scrolling="no"
                                style={{ width: `${realW}px`, height: `${realH}px`, border: 'none', background: 'white', display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                                title="Vista previa etiqueta"
                              />
                            </div>
                          );
                        })()}
                        {testFeedbackLabel && (
                          <p className={`text-[10px] font-bold text-center ${testFeedbackLabel.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {testFeedbackLabel}
                          </p>
                        )}
                        <button type="button" onClick={() => {
                          setTestFeedbackLabel('🏷️ Etiqueta enviada a la impresora de etiquetas.');
                          setTimeout(() => setTestFeedbackLabel(null), 4000);
                        }} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded flex items-center gap-1.5 cursor-pointer ${
                          isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}>
                          <Tag className="w-3.5 h-3.5" /> Enviar Etiqueta Prueba
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedPrinter === 'reportes' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in">
                <div className="flex flex-col space-y-4">
                  <div id="card-reportes" className={`p-5 space-y-4 flex flex-col justify-start border ${
              isRetro
                ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-zinc-900 rounded-none shadow-sm'
                : isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl'
                  : 'bg-[#08080a]/60 border-zinc-700 text-zinc-100 rounded-xl'
            }`}>
              <div className="space-y-4">
                <div className={`flex items-center gap-2.5 pb-2.5 border-b ${isLight ? 'border-zinc-300' : 'border-zinc-900'}`}>
                  <div className={`p-1.5 rounded-lg ${isRetro ? 'bg-blue-100 text-blue-800 border border-zinc-400' : isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className={`text-xs font-bold uppercase tracking-wider ${isRetro ? 'text-[#000080] font-black' : 'text-white'}`}>
                      Impresora de Reportes A4
                    </h5>
                    <p className={`text-[10px] leading-tight ${isRetro ? 'text-zinc-700 font-medium' : 'text-zinc-500'}`}>
                      Impresión de reportes en tamaño carta / A4 — cortes, estadísticas y documentos
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenPrinterWizard('report')}
                      className={`text-[9.5px] font-bold block mt-1 text-left cursor-pointer underline transition-all hover:opacity-80 active:scale-95 ${
                        isRetro ? 'text-[#000080]' : isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}
                    >
                      ❓ ¿Tus contratos o reportes no salen completos? Te ayudo aquí
                    </button>
                  </div>
                </div>

                <div className={`p-4 border space-y-4 ${
                  isRetro
                    ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none text-zinc-900'
                    : isLight
                      ? 'bg-zinc-150/40 border-zinc-200 text-zinc-800 rounded-xl'
                      : 'bg-[#0b0c10] border-[#1c1d22] text-zinc-100 rounded-xl'
                }`}>
                  <span className={`text-[10px] uppercase font-mono tracking-widest font-black block border-b pb-1 ${
                    isRetro ? 'text-[#000080] border-zinc-300' : isLight ? 'text-blue-700 border-zinc-200' : 'text-[#60a5fa] border-zinc-950'
                  }`}>
                    🖨️ SELECCIÓN DE IMPRESORA LOCAL (REPORTES A4)
                  </span>

                  {/* Impresora activa */}
                  <div className={`border-2 p-3 text-left ${
                    isRetro
                      ? 'bg-blue-50/70 border-blue-900/60 text-zinc-900 rounded-none shadow-sm'
                      : isLight
                        ? 'bg-blue-50/60 border-blue-500/20 text-zinc-800 rounded-lg'
                        : 'bg-blue-950/10 border-blue-500/30 text-white rounded-lg'
                  }`}>
                    <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded font-black tracking-wider inline-block mb-1.5 shadow-sm ${
                      isRetro ? 'bg-[#000080] text-white retro-white-text' : 'bg-blue-500 text-black'
                    }`}>
                      🖨️ IMPRESORA DE REPORTES EN USO
                    </span>
                    <h6 className={`text-xs font-black ${isRetro ? 'text-[#000080] font-mono' : ''}`}>
                      {reportPrinterName || 'Sin impresora configurada'}
                    </h6>
                    <p className={`text-[9.5px] mt-0.5 leading-snug ${isRetro ? 'text-zinc-700 font-bold' : 'text-zinc-400'}`}>
                      Tamaño: A4 (210×297mm)
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                        isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                      }`}>
                        Tipo: {reportPrinterInterface === 'Default' ? 'Controlador Local' : reportPrinterInterface}
                      </span>
                      {reportPrinterInterface === 'Ethernet' && (
                        <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                          isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-[#14151a] text-zinc-300 border-zinc-900'
                        }`}>
                          IP: {reportPrinterIpAddress}
                        </span>
                      )}
                    </div>
                    <div className={`mt-2 pt-2 border-t ${isRetro ? 'border-zinc-300' : 'border-blue-500/20'}`}>
                      <p className={`text-[8px] uppercase font-mono font-bold mb-1 ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>Usada para imprimir:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                          isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-blue-950/30 text-blue-300 border-blue-700/40'
                        }`}>📄 Reportes e Informes A4</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                          isRetro ? 'bg-white text-zinc-800 border-zinc-400 font-bold' : 'bg-blue-950/30 text-blue-300 border-blue-700/40'
                        }`}>📊 Presupuestos y Órdenes de Trabajo</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones detectar / reset */}
                  <div className="space-y-2 text-left">
                    <span className={`text-[9.5px] uppercase font-bold block ${isRetro ? 'text-zinc-800 font-sans' : 'text-zinc-400'}`}>
                      Detectar impresoras instaladas en este equipo:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isScanningReportPrinter}
                        onClick={handleScanReportPrinters}
                        className={`flex-1 h-9 font-extrabold text-[10.5px] uppercase flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] rounded-none hover:bg-zinc-200'
                            : 'bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isScanningReportPrinter ? 'animate-spin' : ''}`} />
                        {isScanningReportPrinter ? 'Buscando...' : '🔎 Buscar Impresoras'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannedReportPrintersList([]);
                          setSelectedReportPrinterId('');
                          setReportPrinterName('');
                          setReportPrinterInterface('Default');
                          onUpdateConfig({ ...config, reportPrinterName: '', reportPrinterInterface: 'Default' });
                        }}
                        className={`h-9 px-3 font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-all select-none active:scale-95 cursor-pointer ${
                          isRetro
                            ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-700 rounded-none'
                            : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg'
                        }`}
                      >
                        🗑 Reset
                      </button>
                    </div>
                  </div>

                  {/* Feedback */}
                  {reportPrinterFeedback && (
                    <div className={`p-2.5 border text-[10px] rounded-lg font-mono leading-normal animate-fade-in text-left ${
                      isRetro
                        ? 'bg-blue-50 border-blue-950/30 text-blue-900 rounded-none'
                        : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                    }`}>
                      {reportPrinterFeedback}
                    </div>
                  )}

                  {/* Lista de impresoras detectadas */}
                  {scannedReportPrintersList.length > 0 && (
                    <div className="space-y-2 text-left">
                      <span className={`text-[9.5px] font-bold uppercase block ${isRetro ? 'text-zinc-700 font-sans' : 'text-zinc-500'}`}>
                        Impresoras detectadas — selecciona la que usarás para reportes:
                      </span>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {scannedReportPrintersList.map(hw => {
                          const isSelected = selectedReportPrinterId === hw.id;
                          return (
                            <div
                              key={hw.id}
                              onClick={() => hw.id !== 'no-printers-report' && handleSelectReportPrinter(hw.id)}
                              className={`p-2.5 border text-left transition-all flex justify-between items-center ${
                                hw.id === 'no-printers-report' ? 'cursor-default opacity-60' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-blue-950/15 border-blue-500/60 rounded-lg'
                                  : isRetro
                                    ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none'
                                    : 'bg-[#121316] border-zinc-900 hover:border-zinc-700 hover:bg-[#191b21] rounded-lg'
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <Printer className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : 'text-zinc-400'}`} />
                                  <h6 className={`text-[11px] font-bold truncate leading-none ${isRetro ? 'text-zinc-900 font-mono' : 'text-white'}`}>
                                    {hw.name}
                                  </h6>
                                  {hw.isDefault && (
                                    <span className={`text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0 ${isRetro ? 'bg-blue-200 text-blue-900' : 'bg-blue-500/20 text-blue-300'}`}>
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[9.5px] mt-1 truncate ${isRetro ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>
                                  {hw.details}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {isSelected ? (
                                  <span className={`px-2 py-1 font-extrabold text-[8.5px] uppercase shadow-sm flex items-center gap-1 ${
                                    isRetro ? 'bg-[#000080] text-white retro-white-text rounded-none' : 'bg-blue-500 text-black rounded'
                                  }`}>
                                    ✓ Activa
                                  </span>
                                ) : hw.id !== 'no-printers-report' ? (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleSelectReportPrinter(hw.id); }}
                                    className={`px-2 py-1 border font-bold text-[8.5px] uppercase transition-all cursor-pointer ${
                                      isRetro
                                        ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-none'
                                        : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white rounded'
                                    }`}
                                  >
                                    ✓ Usar
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* IP manual si Ethernet */}
                  {reportPrinterInterface === 'Ethernet' && (
                    <div>
                      <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        Dirección IP de la impresora
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={reportPrinterIpAddress}
                          onChange={e => setReportPrinterIpAddress(e.target.value)}
                          placeholder="192.168.1.102"
                          className={`flex-1 text-xs px-3 py-2 focus:outline-none transition-colors ${
                            isRetro
                              ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black'
                              : isLight
                                ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:border-blue-500'
                                : 'bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-blue-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateConfig({ ...config, reportPrinterName, reportPrinterInterface, reportPrinterIpAddress })}
                          className={`px-3 py-1.5 text-[10px] uppercase font-bold transition-all select-none active:scale-95 cursor-pointer ${
                            isRetro ? 'bg-[#000080] text-white border-2 border-[#000080]' : 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-600 rounded'
                          }`}
                        >
                          Guardar IP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
                </div>
                                <div className="flex flex-col space-y-4">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setShowReportSimulator(!showReportSimulator)}
                      className={`px-3 py-1.5 font-bold text-[10.5px] uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-blue-900' : 'bg-zinc-800 hover:bg-zinc-600 text-zinc-300 rounded-lg border border-zinc-700'
                      }`}>
                      <Printer className="w-3.5 h-3.5" />
                      {showReportSimulator ? 'Ocultar Simulador' : '👁️ Simulador y Pruebas'}
                    </button>
                  </div>
                  {showReportSimulator && (
                    <div className={`p-4 border rounded-xl ${
                      isRetro ? 'bg-[#cbd6e2] border-zinc-300' : isLight ? 'bg-zinc-100/60 border-zinc-200' : 'bg-[#0a0a0c]/60 border-zinc-700'
                    }`}>
                      <div className="flex flex-col items-center gap-3">
                        <p className={`text-[9px] font-bold uppercase tracking-widest text-center ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          Vista previa — Reporte A4
                        </p>
                        
                        {/* A4 Sheet Preview Mockup */}
                        <style>{`
                          .theme-retro-window.mode-dark div.bg-white.a4-preview-sheet {
                            background-color: #ffffff !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet div:not(.bg-zinc-800),
                          .theme-retro-window.mode-dark div.a4-preview-sheet span,
                          .theme-retro-window.mode-dark div.a4-preview-sheet p,
                          .theme-retro-window.mode-dark div.a4-preview-sheet td,
                          .theme-retro-window.mode-dark div.a4-preview-sheet h4 {
                            color: #1f2937 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet table {
                            background-color: transparent !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet tbody tr {
                            background-color: transparent !important;
                            border-bottom: 1px solid #e4e4e7 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet tbody tr:hover {
                            background-color: #f4f4f5 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet thead tr,
                          .theme-retro-window.mode-dark div.a4-preview-sheet th {
                            background-color: #27272a !important;
                            color: #ffffff !important;
                            border: 1px solid #27272a !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .bg-zinc-800 {
                            background-color: #27272a !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .bg-zinc-100 {
                            background-color: #f4f4f5 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .divide-zinc-200 > * + * {
                            border-color: #e4e4e7 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .border-zinc-350,
                          .theme-retro-window.mode-dark div.a4-preview-sheet .border-zinc-300,
                          .theme-retro-window.mode-dark div.a4-preview-sheet .border-zinc-200 {
                            border-color: #e4e4e7 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .border-b {
                            border-bottom-color: #e4e4e7 !important;
                          }
                          .theme-retro-window.mode-dark div.a4-preview-sheet .border-t {
                            border-top-color: #d4d4d8 !important;
                          }
                        `}</style>
                        <div className={`w-full max-w-[340px] aspect-[1/1.41] bg-white text-zinc-800 p-6 shadow-lg border border-zinc-200 flex flex-col justify-between text-[9px] select-none a4-preview-sheet ${
                          isRetro ? 'rounded-none' : 'rounded-lg'
                        }`}
                        style={{
                          paddingTop: '24px',
                          paddingBottom: '24px',
                          paddingLeft: '28px',
                          paddingRight: '28px',
                        }}>
                          {/* A4 Header */}
                          <div className="border-b pb-2 mb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-[12px] font-extrabold tracking-tight text-zinc-900 uppercase text-left">
                                  {storeName || 'MI NEGOCIO'}
                                </h4>
                                <p className="text-[8px] text-zinc-500 leading-tight text-left">
                                  {phone || 'Tel: 123456789'}
                                </p>
                              </div>
                              <div className="w-8 h-8 rounded border border-zinc-300 bg-zinc-100 flex items-center justify-center font-extrabold text-[8px] text-zinc-400 font-mono">
                                LOGO
                              </div>
                            </div>
                            <div className="mt-2 text-zinc-650 font-bold uppercase text-[8px] text-left">
                              REPORTE DIARIO DE CAJA
                            </div>
                          </div>

                          {/* A4 Body Content */}
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-[7px] text-zinc-500 font-mono">
                              <span>Fecha: 29/06/2026</span>
                              <span>Hora: 12:12 PM</span>
                            </div>
                            
                            <table className="w-full text-left text-[7px] border-collapse">
                              <thead>
                                <tr className="text-white uppercase font-bold bg-zinc-800">
                                  <th className="p-1">Detalle</th>
                                  <th className="p-1 text-right">Monto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 font-medium">
                                <tr>
                                  <td className="p-1 text-left">Servicio Técnico (Reparaciones)</td>
                                  <td className="p-1 text-right">$2,450.00</td>
                                </tr>
                                <tr>
                                  <td className="p-1 text-left">Ventas de Refacciones y Accesorios</td>
                                  <td className="p-1 text-right">$1,230.00</td>
                                </tr>
                                <tr>
                                  <td className="p-1 text-left">Efectivo Inicial en Caja</td>
                                  <td className="p-1 text-right">$500.00</td>
                                </tr>
                              </tbody>
                            </table>

                            <div className="flex justify-end pt-1 border-t border-zinc-300">
                              <div className="text-right text-[8px] font-extrabold text-zinc-900">
                                Total General: $4,180.00
                              </div>
                            </div>
                          </div>

                          {/* A4 Footer */}
                          <div className="border-t pt-1.5 text-center text-[7px] text-zinc-400 font-mono">
                            FixManager — Reporte generado automáticamente — Página 1 de 1
                          </div>
                        </div>

                        {/* Test Button & Feedback */}
                        <div className="w-full max-w-[340px] flex flex-col gap-1.5">
                          <button type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('fm-silent-print', {
                                detail: {
                                  html: `
                                    <html>
                                      <head>
                                        <style>
                                          body { font-family: sans-serif; padding: 25px; margin: 0; }
                                          h2 { color: #1f2937; margin: 0; }
                                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
                                          th { background-color: #1f2937; color: white; }
                                        </style>
                                      </head>
                                      <body>
                                        <h2>Prueba de Impresión A4</h2>
                                        <p>Se ha configurado correctamente la impresora de reportes: <strong>\${reportPrinterName || 'Predeterminada'}</strong>.</p>
                                        <table>
                                          <thead>
                                            <tr><th>Detalle</th><th>Monto</th></tr>
                                          </thead>
                                          <tbody>
                                            <tr><td>Servicio Técnico (Prueba)</td><td>$2,450.00</td></tr>
                                            <tr><td>Ventas Generales (Prueba)</td><td>$1,230.00</td></tr>
                                          </tbody>
                                        </table>
                                      </body>
                                    </html>
                                  `,
                                  deviceName: reportPrinterName || '',
                                  paperWidthMicrons: 210000,
                                  paperHeightMicrons: 297000,
                                  isReport: true
                                }
                              }));
                              setTestFeedbackReport('¡Prueba de reporte A4 enviada!');
                              setTimeout(() => setTestFeedbackReport(null), 4000);
                            }}
                            className={`w-full py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                              isRetro 
                                ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'
                            }`}
                          >
                            <Printer className="w-4 h-4" /> Imprimir reporte de prueba
                          </button>
                          {testFeedbackReport && (
                            <p className="text-[10px] text-emerald-500 font-bold text-center mt-1 animate-pulse">
                              {testFeedbackReport}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            </div>{/* fin wrapper eco-disable — todo */}
          </div>
        )}

        {/* Mostrar botón de guardar para las pestañas global y de impresoras */}
        {(activeConfigTab === 'global' || activeConfigTab === 'printer') && (
          <div className="flex justify-end pt-2 border-t border-zinc-800">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors cursor-pointer uppercase select-none active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Todos los Ajustes y Términos
            </button>
          </div>
        )}
      </form>}

      {/* ── USERS TAB — vista independiente ────────────────────────────────── */}
      {activeConfigTab === 'users' && (() => {
        const inputCls = `w-full text-xs px-3 py-2 focus:outline-none transition-colors ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:border-blue-500' : 'bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-blue-500'}`;
        const labelCls = `text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`;
        const sectionCls = `p-5 rounded space-y-5 border ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]' : isLight ? 'bg-white border-zinc-200' : 'bg-[#121316] border-[#1b1c21]'}`;
        const innerBoxCls = `p-4 rounded border ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950/50 border-zinc-800'}`;
        const permGroups: { group: string; items: { key: keyof UserPermissions; label: string; desc: string }[] }[] = [
          {
            group: '🛒 Punto de Venta (POS)',
            items: [
              { key: 'canEditPrice',      label: 'Editar precios en carrito',  desc: 'Modificar el precio unitario de artículos dentro de una venta activa' },
              { key: 'canApplyDiscounts', label: 'Aplicar descuentos',         desc: 'Registrar ventas con precio por debajo del catálogo' },
              { key: 'canCancelSales',    label: 'Cancelar ventas',            desc: 'Marcar ventas completadas como canceladas y revertir stock' },
            ]
          },
          {
            group: '📦 Inventario y Stock',
            items: [
              { key: 'canEditStock',      label: 'Editar artículos del stock', desc: 'Crear y modificar productos en el catálogo de inventario' },
              { key: 'canDeleteProducts', label: 'Eliminar artículos',         desc: 'Borrar productos permanentemente del inventario' },
              { key: 'canRestockItems',   label: 'Reabastecer inventario',     desc: 'Registrar entradas de mercancía y pedidos de reabastecimiento' },
            ]
          },
          {
            group: '🔧 Órdenes de Servicio',
            items: [
              { key: 'canManageOrders',        label: 'Gestionar órdenes',              desc: 'Crear, editar y cambiar estado de órdenes de reparación' },
              { key: 'canEditOrdersFromReports', label: 'Editar órdenes desde reportes', desc: 'Modificar datos de una orden al consultarla en el historial de reportes' },
            ]
          },
          {
            group: '📊 Reportes y Sistema',
            items: [
              { key: 'canViewReports',    label: 'Ver reportes y cortes',      desc: 'Consultar cortes de caja, historial de ventas y estadísticas' },
              { key: 'canAccessConfig',   label: 'Acceso a configuración',     desc: 'Entrar a la configuración del sistema, impresoras y datos' },
            ]
          },
        ];

        return (
          <div className="space-y-5 animate-fade-in">
            {/* ── Botón Nuevo Usuario ─ */}
            <div className="flex justify-start">
              <button
                type="button"
                id="config-users-add"
                onClick={() => { resetUserForm(); setShowNewUserModal(true); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-black uppercase cursor-pointer active:scale-95 transition-all duration-1000 ${
                  isRetro ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md'
                } ${getHighlightClasses('config-users-add')}`}
              >
                <UserPlus className="w-4 h-4" /> Nuevo Usuario
              </button>
            </div>

            {/* ── Modal Nuevo Usuario ─ */}
            {showNewUserModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60" onClick={e => { if (e.target === e.currentTarget) { setShowNewUserModal(false); resetUserForm(); } }}>
                <div className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col ${isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-white border-zinc-200' : 'bg-[#0f1115] border-zinc-700'}`}>
                  {/* Header modal */}
                  <div className={`modal-dark-header flex items-center justify-between px-5 py-4 border-b ${isRetro ? 'bg-[#000080] border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-2">
                      <UserPlus className={`w-4 h-4 ${isRetro ? 'text-white' : isLight ? 'text-blue-700' : 'text-blue-400'}`} />
                      <h4 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-900' : 'text-white'}`}>Nuevo Usuario</h4>
                    </div>
                    <button type="button" onClick={() => { setShowNewUserModal(false); resetUserForm(); }} className={`w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-all ${isRetro ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300'}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cuerpo modal */}
                  <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                    {userFormSuccess && <div className={`p-2.5 rounded border text-xs font-bold flex items-center gap-2 ${isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'}`}><CheckCircle className="w-3.5 h-3.5" /> {userFormSuccess}</div>}
                    {userFormError  && <div className={`p-2.5 rounded border text-xs font-bold flex items-center gap-2 ${isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/30 text-rose-400'}`}><X className="w-3.5 h-3.5" /> {userFormError}</div>}

                    <form id="new-user-form" onSubmit={e => { e.preventDefault(); (document.getElementById('btn-crear-usuario') as HTMLButtonElement)?.click(); }} className="space-y-3">
                      <div>
                        <label className={labelCls}>Nombre completo *</label>
                        <input type="text" value={userFormName} onChange={e => setUserFormName(e.target.value)} placeholder="Ej. Hugo García" className={inputCls} autoFocus onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('new-user-rol') as HTMLSelectElement)?.focus(); } }} />
                      </div>
                      <div>
                        <label className={labelCls}>Rol *</label>
                        <select id="new-user-rol" value={userFormRole} onChange={e => { const r = e.target.value as 'admin' | 'employee' | 'tecnico'; setUserFormRole(r); setUserFormPerms(r === 'admin' ? { ...ADMIN_PERMISSIONS } : r === 'tecnico' ? { ...TECNICO_PERMISSIONS } : { ...EMPLOYEE_PERMISSIONS }); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('new-user-pin') as HTMLInputElement)?.focus(); } }} className={inputCls}>
                          {!users.some(u => u.role === 'admin') && <option value="admin">👑 Administrador</option>}
                          <option value="employee">👤 Empleado</option>
                          {(config.workshopMode ?? 'personal') === 'team' && <option value="tecnico">🔧 Técnico</option>}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>PIN (4 dígitos) *</label>
                          <input id="new-user-pin" type="password" inputMode="numeric" maxLength={4} value={userFormPin} onChange={e => setUserFormPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" className={`${inputCls} text-center tracking-[0.4em] font-mono`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('new-user-pin-confirm') as HTMLInputElement)?.focus(); } }} />
                        </div>
                        <div>
                          <label className={labelCls}>Confirmar PIN *</label>
                          <input id="new-user-pin-confirm" type="password" inputMode="numeric" maxLength={4} value={userFormPinConfirm} onChange={e => setUserFormPinConfirm(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" className={`${inputCls} text-center tracking-[0.4em] font-mono`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('btn-crear-usuario') as HTMLButtonElement)?.click(); } }} />
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer modal */}
                  <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
                    <button type="button" onClick={() => { setShowNewUserModal(false); resetUserForm(); }} className={`px-4 py-1.5 text-xs font-bold uppercase rounded border cursor-pointer ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800' : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>
                      Cancelar
                    </button>
                    <button id="btn-crear-usuario" type="button" onClick={() => {
                      setUserFormError(null);
                      const name = userFormName.trim();
                      if (!name) { setUserFormError('El nombre es requerido.'); return; }
                      if (userFormPin.length !== 4) { setUserFormError('PIN debe tener 4 dígitos.'); return; }
                      if (userFormPin !== userFormPinConfirm) { setUserFormError('Los PINs no coinciden.'); return; }
                      const newUser: AppUser = { id: `user-${Date.now()}`, name, role: userFormRole, pin: userFormPin, createdAt: new Date().toISOString(), permissions: { ...userFormPerms } };
                      onUpdateUsers?.([...users, newUser]);
                      setShowNewUserModal(false);
                      resetUserForm();
                    }} className={`px-5 py-1.5 text-xs font-black uppercase rounded cursor-pointer active:scale-95 flex items-center gap-1.5 ${isRetro ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040]' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                      <UserPlus className="w-3.5 h-3.5" /> Crear Usuario
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── LIST of existing users ─ */}
            <div
              id="config-users-list"
              className={`${sectionCls} transition-all duration-1000 border ${getHighlightClasses('config-users-list')}`}
            >
              <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? 'border-zinc-300' : 'border-zinc-800'}`}>
                <Users className={`w-4 h-4 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-700' : 'text-zinc-400'}`} />
                <h4 className={`text-xs font-black uppercase tracking-widest flex-1 ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900' : 'text-zinc-300'}`}>
                  Usuarios Registrados ({users.length})
                </h4>
                <button
                  onClick={() => setShowUserHelp(v => !v)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-all ${isLight ? 'text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100' : 'text-sky-400 bg-sky-950/20 border border-sky-800/30 hover:bg-sky-900/30'}`}
                  title={isTeamMode ? 'Ver guía para agregar usuarios' : 'Ver guía para agregar empleados'}
                >
                  <HelpCircle className="w-3 h-3" />
                  {isTeamMode ? '¿Cómo agregar un usuario?' : '¿Cómo agregar un empleado?'}
                  {showUserHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Panel de ayuda */}
              {showUserHelp && (
                <div className={`rounded-lg border p-4 my-3 space-y-3 text-xs ${isLight ? 'bg-sky-50 border-sky-200 text-zinc-700' : 'bg-sky-950/15 border-sky-800/30 text-zinc-300'}`}>
                  <p className={`font-black uppercase text-[10px] ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                    📋 Guía rápida — {isTeamMode ? 'Agregar un nuevo usuario' : 'Agregar un nuevo empleado'}
                  </p>
                  <ol className="space-y-2 list-none">
                    {[
                      { n: '1', t: 'Haz clic en Nuevo Usuario', d: isTeamMode
                        ? 'Se abrirá un formulario. Escribe el nombre completo, elige su rol (Administrador, Empleado o Técnico) y asígnale un PIN de 4 dígitos. Confirma el PIN y haz clic en Crear Usuario.'
                        : 'Se abrirá un formulario. Escribe el nombre completo del empleado, elige su rol (Administrador o Empleado) y asígnale un PIN de 4 dígitos. Confirma el PIN y haz clic en Crear Usuario.' },
                      { n: '2', t: 'El usuario se crea con permisos por defecto', d: isTeamMode
                        ? 'Al elegir Técnico se activan permisos de órdenes únicamente; Empleado activa permisos básicos; Administrador activa todos.'
                        : 'Al elegir Empleado se activan permisos básicos; al elegir Administrador se activan todos. No necesitas configurar nada más en este paso.' },
                      { n: '3', t: 'Ajusta permisos si lo necesitas', d: 'Haz clic sobre la tarjeta del usuario recién creado en la lista de abajo. Se expandirá mostrando todos los permisos disponibles. Activa o desactiva los que necesites y guarda.' },
                      { n: '4', t: isTeamMode ? 'El usuario inicia sesión' : 'El empleado inicia sesión', d: 'Al abrir la app aparece la pantalla de login. El usuario selecciona su nombre, escribe su PIN de 4 dígitos y entra. Solo verá las secciones para las que tiene permiso.' },
                      { n: '5', t: 'Si abre la caja solo', d: 'La app le pedirá tu PIN (del dueño) para autorizar la apertura. Dáselo por teléfono o en persona.' },
                      { n: '6', t: 'Al terminar su turno', d: isTeamMode ? 'El usuario hace clic en Entregar Turno en la barra superior, cuenta el efectivo y genera un ticket de entrega.' : 'El empleado hace clic en Entregar Turno en la barra superior, cuenta el efectivo y genera un ticket de entrega.' },
                    ].map(step => (
                      <li key={step.n} className="flex gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${isLight ? 'bg-sky-600 text-white' : 'bg-sky-700 text-white'}`}>{step.n}</span>
                        <div>
                          <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>{step.t}</p>
                          <p className={`${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{step.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className={`rounded border px-3 py-2 text-[10px] ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/20 border-amber-700/30 text-amber-400'}`}>
                    💡 <strong>Cuando {isTeamMode ? 'se va un usuario' : 'se va un empleado'}:</strong> entra a esta misma pantalla, busca su usuario y elimínalo. El siguiente usuario nuevo tendrá su propio usuario y PIN.
                  </div>
                </div>
              )}
              {users.length === 0 ? (
                <p className={`text-center py-8 text-xs ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>No hay usuarios. Crea el primero arriba.</p>
              ) : (
                <div className="space-y-3">
                  {users.map(u => {
                    const isEditing = editingUserId === u.id;
                    const permsOn = Object.entries(u.permissions).filter(([,v]) => v).length;
                    const permsTotal = Object.keys(u.permissions).length;
                    return (
                      <div key={u.id} className={`rounded border transition-all ${
                        isEditing
                          ? (isRetro ? 'border-[#000080] bg-blue-50' : isLight ? 'border-blue-400 bg-blue-50/60' : 'border-blue-500/50 bg-blue-950/10')
                          : (isRetro ? 'border-zinc-300 bg-white cursor-pointer hover:border-[#000080]/40' : isLight ? 'border-zinc-200 bg-white cursor-pointer hover:border-blue-300' : 'border-zinc-800 bg-zinc-900/40 cursor-pointer hover:border-blue-500/40')
                      }`}>
                      <div className="p-4" onClick={() => { if (isEditing) { resetUserForm(); } else { setAdminPinInput(''); setAdminPinError(null); setAdminPinPrompt({ action: 'edit', userId: u.id }); } }}>
                        <div className="flex items-start justify-between gap-3">
                          {/* User info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black ${u.role === 'admin' ? (isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-950/60 text-blue-400') : (isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-400')}`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-black ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{u.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${u.role === 'admin' ? (isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-950/40 text-blue-400 border-blue-500/25') : (isLight ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-zinc-900 text-zinc-400 border-zinc-700')}`}>
                                  {u.role === 'admin' ? '👑 Admin' : u.role === 'tecnico' ? '🔧 Técnico' : '👤 Empleado'}
                                </span>
                              </div>
                              <p className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                PIN: •••• &nbsp;·&nbsp; {permsOn}/{permsTotal} permisos activos
                              </p>
                              {/* Mini permission badges */}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {u.permissions.canEditPrice    && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-500/20 text-amber-400'}`}>Precios</span>}
                                {u.permissions.canCancelSales  && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-500/20 text-rose-400'}`}>Cancelar</span>}
                                {u.permissions.canEditStock    && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'}`}>Stock</span>}
                                {u.permissions.canDeleteProducts && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-500/20 text-rose-400'}`}>Eliminar</span>}
                                {u.permissions.canRestockItems && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-sky-950/30 border-sky-500/20 text-sky-400'}`}>Reabast.</span>}
                                {u.permissions.canManageOrders && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-purple-950/30 border-purple-500/20 text-purple-400'}`}>Órdenes</span>}
                                {u.permissions.canViewReports  && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>Reportes</span>}
                                {u.permissions.canAccessConfig && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>Config.</span>}
                              </div>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-1.5 shrink-0">
                            {/* Reporte de empleado */}
                            <button
                              type="button"
                              title="Exportar reporte mensual"
                              onClick={() => {
                                const now = new Date();
                                const mes = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
                                const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                                const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                                const userSales = sales.filter(s => !s.isCancelled && s.createdBy === u.name && s.createdAt >= inicio && s.createdAt <= fin);
                                const userOrders = orders.filter(o => o.createdBy === u.name && o.createdAt >= inicio && o.createdAt <= fin);
                                const totalVentas = userSales.reduce((s, v) => s + v.total, 0);
                                const sym = config.currencySymbol || '$';
                                const thead = `<thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Monto</th></tr></thead>`;
                                const rowsVentas = userSales.map(s => `<tr><td>${new Date(s.createdAt).toLocaleDateString('es-MX')}</td><td>Venta POS</td><td>Ticket ${s.ticketNumber || s.id} · ${s.paymentMethod}</td><td>${sym}${s.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('');
                                const rowsOrdenes = userOrders.map(o => `<tr><td>${new Date(o.createdAt).toLocaleDateString('es-MX')}</td><td>Orden</td><td>${o.id} · ${o.customerName} · ${o.deviceBrand} ${o.deviceModel}</td><td>${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`).join('');
                                const tbody = `<tbody>${rowsVentas || rowsOrdenes ? rowsVentas + rowsOrdenes : '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px;">Sin actividad este mes</td></tr>'}</tbody>`;
                                const summary = `
                                  <div class="summary-item"><label>Ventas POS</label><span>${userSales.length}</span></div>
                                  <div class="summary-item"><label>Total vendido</label><span>${sym}${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                  <div class="summary-item"><label>Órdenes creadas</label><span>${userOrders.length}</span></div>
                                  <div class="summary-item"><label>Período</label><span>${mes}</span></div>
                                `;
                                const html = buildA4ReportHtml(
                                  `Reporte de Empleado — ${u.name}`,
                                  `${u.role === 'admin' ? 'Administrador' : u.role === 'tecnico' ? 'Técnico' : 'Empleado'} · ${mes}`,
                                  config.storeName || 'Taller',
                                  thead + tbody,
                                  summary
                                );
                                setReporteEmpleado({ html, nombre: u.name });
                              }}
                              className={`p-2 rounded border cursor-pointer transition-all active:scale-95 flex items-center justify-center ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-emerald-700' : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/30 border-emerald-500/25 text-emerald-400 hover:bg-emerald-950/50'}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setAdminPinInput(''); setAdminPinError(null); setAdminPinPrompt({ action: 'delete', userId: u.id }); }}
                                title="Eliminar usuario"
                                className={`p-2 rounded border cursor-pointer transition-all active:scale-95 flex items-center justify-center ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-red-700' : isLight ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-rose-950/30 border-rose-500/25 text-rose-400 hover:bg-rose-950/50'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Panel expandible inline — solo al editar */}
                      {isEditing && (
                        <div className={`border-t px-4 pb-4 pt-4 space-y-4 ${isRetro ? 'border-[#000080]/30 bg-blue-50/60' : isLight ? 'border-blue-200 bg-blue-50/40' : 'border-blue-500/20 bg-blue-950/10'}`}>
                          {/* Feedback inline */}
                          {userFormSuccess && <div className={`p-2 rounded border text-xs font-bold flex items-center gap-2 ${isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'}`}><CheckCircle className="w-3.5 h-3.5" /> {userFormSuccess}</div>}
                          {userFormError   && <div className={`p-2 rounded border text-xs font-bold flex items-center gap-2 ${isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/30 text-rose-400'}`}><X className="w-3.5 h-3.5" /> {userFormError}</div>}

                          {/* Campos de identidad inline */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className={labelCls}>Nombre</label>
                              <input type="text" value={userFormName} onChange={e => setUserFormName(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Rol</label>
                              <select value={userFormRole} onChange={e => { const r = e.target.value as 'admin' | 'employee' | 'tecnico'; setUserFormRole(r); setUserFormPerms(r === 'admin' ? { ...ADMIN_PERMISSIONS } : r === 'tecnico' ? { ...TECNICO_PERMISSIONS } : { ...EMPLOYEE_PERMISSIONS }); }} className={inputCls}>
                                <option value="admin">👑 Administrador</option>
                                <option value="employee">👤 Empleado</option>
                                {(config.workshopMode ?? 'personal') === 'team' && <option value="tecnico">🔧 Técnico</option>}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>PIN (4 dígitos)</label>
                              <input type="password" inputMode="numeric" maxLength={4} value={userFormPin} onChange={e => setUserFormPin(e.target.value.replace(/\D/g,'').slice(0,4))} className={`${inputCls} text-center tracking-[0.4em] font-mono`} />
                            </div>
                          </div>

                          {/* Permisos inline */}
                          <div className={innerBoxCls}>
                            <div className="flex items-center justify-between mb-3">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>🔑 Permisos</p>
                              <div className="flex gap-1.5">
                                <button type="button" onClick={() => setUserFormPerms({ ...ADMIN_PERMISSIONS })} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border cursor-pointer ${isRetro ? 'border-zinc-400 text-[#000080]' : isLight ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' : 'border-blue-500/30 text-blue-400 bg-blue-950/20 hover:bg-blue-950/40'}`}>Todos</button>
                                <button type="button" onClick={() => setUserFormPerms({ ...EMPLOYEE_PERMISSIONS })} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border cursor-pointer ${isRetro ? 'border-zinc-400 text-zinc-700' : isLight ? 'border-zinc-300 text-zinc-600 bg-zinc-50 hover:bg-zinc-100' : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:bg-zinc-800'}`}>Ninguno</button>
                              </div>
                            </div>
                            <div className="space-y-4">
                              {permGroups.map(({ group, items }) => (
                                <div key={group}>
                                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{group}</p>
                                  <div className="space-y-1.5">
                                    {items.map(({ key, label, desc }) => (
                                      <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${userFormPerms[key as keyof UserPermissions] ? (isRetro ? 'bg-[#000080] border-[#000080]' : 'bg-blue-500 border-blue-500') : (isRetro ? 'border-zinc-400 bg-white' : isLight ? 'border-zinc-300 bg-white' : 'border-zinc-600 bg-zinc-900')} cursor-pointer`}
                                          onClick={() => togglePerm(key as keyof UserPermissions)}>
                                          {userFormPerms[key as keyof UserPermissions] && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5"/><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M10 3L5 8.5 2 5.5"/></svg>}
                                        </div>
                                        <div onClick={() => togglePerm(key as keyof UserPermissions)} className="min-w-0">
                                          <p className={`text-xs font-bold leading-tight ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{label}</p>
                                          <p className={`text-[10px] leading-tight mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>{desc}</p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Botones guardar/cancelar inline */}
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={resetUserForm} className={`px-4 py-1.5 text-xs font-bold uppercase rounded border cursor-pointer active:scale-95 ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800' : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>
                              Cancelar
                            </button>
                            <button type="button" onClick={() => {
                              setUserFormError(null); setUserFormSuccess(null);
                              const name = userFormName.trim();
                              if (!name) { setUserFormError('El nombre es requerido.'); return; }
                              if (userFormPin.length !== 4) { setUserFormError('El PIN debe tener exactamente 4 dígitos.'); return; }
                              onUpdateUsers?.(users.map(usr => usr.id === editingUserId ? { ...usr, name, role: userFormRole, pin: userFormPin, permissions: { ...userFormPerms } } : usr));
                              setUserFormSuccess('✅ Usuario actualizado.');
                              setTimeout(() => { setUserFormSuccess(null); resetUserForm(); }, 1500);
                            }} className={`px-4 py-1.5 text-xs font-extrabold uppercase rounded cursor-pointer active:scale-95 ${isRetro ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040]' : 'bg-blue-600 hover:bg-blue-700 text-white rounded'}`}>
                              <Save className="w-3 h-3 inline mr-1" />Guardar Cambios
                            </button>
                          </div>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info */}
            <div className={`p-3 rounded border text-[10px] leading-relaxed ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-500/20 text-amber-400'}`}>
              <p className="font-black uppercase mb-1">ℹ️ Seguridad de permisos</p>
              <p>Los permisos se aplican <strong>en tiempo real</strong>. El PIN de 4 dígitos se solicita al intentar ejecutar acciones restringidas (ej. editar precio en el POS). Los precios modificados solo aplican a esa venta — el catálogo permanece intacto.</p>
            </div>

            {/* Admin PIN Prompt Modal */}
            {adminPinPrompt && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
                <div className={`w-full max-w-xs rounded-xl shadow-2xl border overflow-hidden ${isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-white border-zinc-200' : 'bg-[#0f1115] border-zinc-700'}`}>
                  <div className={`px-4 py-3 flex items-center justify-between ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-zinc-800' : 'bg-zinc-900'}`}>
                    <span className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      🔒 Verificación de Administrador
                    </span>
                    <button type="button" onClick={() => { setAdminPinPrompt(null); setAdminPinInput(''); setAdminPinError(null); }} className="text-white/70 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {adminPinPrompt.action === 'delete' ? 'Para eliminar este usuario ingresa el PIN de administrador.' : 'Para editar este usuario ingresa el PIN de administrador.'}
                    </p>
                    <div>
                      <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>PIN de Administrador</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        value={adminPinInput}
                        onChange={e => { setAdminPinInput(e.target.value.replace(/\D/g,'').slice(0,4)); setAdminPinError(null); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const admin = users.find(u => u.role === 'admin');
                            if (!admin || adminPinInput !== admin.pin) { setAdminPinError('PIN incorrecto.'); return; }
                            const { action, userId } = adminPinPrompt;
                            setAdminPinPrompt(null); setAdminPinInput(''); setAdminPinError(null);
                            if (action === 'edit') { loadUserForEdit(users.find(u => u.id === userId)!); }
                            else { const adminCount = users.filter(u => u.role === 'admin').length; const target = users.find(u => u.id === userId); if (target?.role === 'admin' && adminCount <= 1) { setUserFormError('No se puede eliminar el último administrador.'); return; } setUserDeleteConfirm(userId); }
                          }
                        }}
                        placeholder="••••"
                        className={`w-full text-center tracking-[0.4em] font-mono text-lg px-3 py-2 focus:outline-none transition-colors ${isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:border-blue-500' : 'bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-blue-500'}`}
                      />
                      {adminPinError && <p className="text-rose-500 text-[10px] font-bold mt-1">{adminPinError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setAdminPinPrompt(null); setAdminPinInput(''); setAdminPinError(null); }} className={`flex-1 py-2 text-xs font-bold uppercase rounded border cursor-pointer ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>Cancelar</button>
                      <button type="button" onClick={() => {
                        const admin = users.find(u => u.role === 'admin');
                        if (!admin || adminPinInput !== admin.pin) { setAdminPinError('PIN incorrecto.'); return; }
                        const { action, userId } = adminPinPrompt;
                        setAdminPinPrompt(null); setAdminPinInput(''); setAdminPinError(null);
                        if (action === 'edit') { loadUserForEdit(users.find(u => u.id === userId)!); }
                        else { const adminCount = users.filter(u => u.role === 'admin').length; const target = users.find(u => u.id === userId); if (target?.role === 'admin' && adminCount <= 1) { setUserFormError('No se puede eliminar el último administrador.'); return; } setUserDeleteConfirm(userId); }
                      }} className={`flex-1 py-2 text-xs font-black uppercase rounded cursor-pointer active:scale-95 ${isRetro ? 'bg-[#000080] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>Confirmar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirm Modal */}
            {userDeleteConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-white border border-slate-200 w-full max-w-sm p-1 shadow-2xl rounded-xl">
                  <div className="bg-gradient-to-r from-rose-700 to-red-600 text-white px-3 py-2 flex items-center justify-between rounded-t-lg">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Eliminar Usuario</span>
                    <button type="button" onClick={() => setUserDeleteConfirm(null)} className="text-white/80 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                      ¿Está seguro de eliminar a <strong className="text-rose-700">{users.find(u => u.id === userDeleteConfirm)?.name}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setUserDeleteConfirm(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs uppercase cursor-pointer">Cancelar</button>
                      <button type="button" onClick={() => { onUpdateUsers?.(users.filter(u => u.id !== userDeleteConfirm)); setUserFormSuccess('Usuario eliminado.'); setUserDeleteConfirm(null); setTimeout(() => setUserFormSuccess(null), 3000); }} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs uppercase cursor-pointer">Sí, eliminar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL PREVIEW REPORTE EMPLEADO */}
      {reporteEmpleado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl border ${isRetro ? 'bg-[#dfdfdf] border-zinc-500' : isLight ? 'bg-white border-zinc-200' : 'bg-[#0f1013] border-zinc-800'}`}>
            {/* Header */}
            <div className={`modal-dark-header flex items-center justify-between px-5 py-3 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Printer className={`w-4 h-4 ${isRetro ? 'text-white' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`} />
                <span className={`font-black text-sm ${isRetro ? 'text-white' : isLight ? 'text-zinc-900' : 'text-white'}`}>
                  Reporte de {reporteEmpleado.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html: reporteEmpleado.html, deviceName: config.reportPrinterName || '', paperWidthMicrons: 210000, paperHeightMicrons: 297000, isReport: true } }));
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase rounded cursor-pointer transition-all ${isRetro ? 'bg-[#000080] hover:bg-[#0000aa] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]' : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700'}`}
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setReporteEmpleado(null)}
                  className={`p-1.5 rounded cursor-pointer ${isRetro ? 'text-white hover:text-yellow-300' : isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-white'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Preview */}
            <iframe
              id="reporte-preview-iframe"
              srcDoc={reporteEmpleado.html}
              className="flex-1 w-full rounded-b-xl"
              style={{ minHeight: '500px', border: 'none', background: '#fff' }}
              title="Preview reporte"
            />
          </div>
        </div>
      )}

      {/* Modal confirmación cambio de modo taller */}
      {workshopModeConfirm && (() => {
        const toPersonal = workshopModeConfirm === 'personal';
        const activeOrders = (orders ?? []).filter(o => o.status !== 'Entregado' && o.status !== 'Entregado y Pagado' && o.status !== 'Cancelado');
        const pendientes  = activeOrders.filter(o => o.status === 'Pendiente' || o.status === 'Diagnóstico');
        const enRep       = activeOrders.filter(o => o.status === 'En Reparación');
        const listos      = activeOrders.filter(o => o.status === 'Listo' || o.status === 'Fallido');
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-700'}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-[#1a3a6b]' : 'bg-[#11131e]'}`}>
                <span className="text-xl">{toPersonal ? '🔧' : '👥'}</span>
                <div>
                  <p className="font-black text-sm text-white">Cambiar a modo {toPersonal ? 'Personal' : 'Equipo'}</p>
                  <p className="text-[10px] text-zinc-300 mt-0.5">{toPersonal ? 'Único técnico' : 'Múltiples técnicos'}</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Qué cambia</p>
                  <ul className="space-y-1.5">
                    <li className={`text-[11px] flex items-start gap-2 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      <span className="mt-0.5 shrink-0">✓</span>
                      {toPersonal
                        ? 'Las nuevas órdenes arrancarán directo en "En Reparación" — sin paso previo de Pendiente.'
                        : 'Las nuevas órdenes iniciarán en "Pendiente" para asignarse a un técnico.'}
                    </li>
                    <li className={`text-[11px] flex items-start gap-2 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      <span className="mt-0.5 shrink-0">✓</span>
                      {toPersonal
                        ? 'El botón "🚀 Reparar" desaparecerá de las órdenes activas.'
                        : 'El botón "🚀 Reparar" volverá a aparecer en las órdenes activas.'}
                    </li>
                  </ul>
                </div>
                {activeOrders.length > 0 ? (
                  <div className={`rounded-lg border p-3 space-y-1.5 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-700'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Órdenes activas ({activeOrders.length})</p>
                    {pendientes.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>En Pendiente / Diagnóstico</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-950/40 text-amber-400'}`}>{pendientes.length}</span>
                      </div>
                    )}
                    {enRep.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>En Reparación</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-950/40 text-blue-400'}`}>{enRep.length}</span>
                      </div>
                    )}
                    {listos.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>Listo / Fallido</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400'}`}>{listos.length}</span>
                      </div>
                    )}
                    <p className={`text-[9px] mt-1 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Estas órdenes conservan su estado — el cambio solo afecta las nuevas.
                    </p>
                  </div>
                ) : (
                  <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>No tienes órdenes activas — el cambio aplica limpiamente.</p>
                )}
              </div>
              <div className={`px-5 py-3 flex justify-end gap-2 border-t ${isLight ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-800 bg-zinc-900'}`}>
                <button type="button" onClick={() => setWorkshopModeConfirm(null)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-colors ${isLight ? 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100' : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'}`}>
                  Cancelar
                </button>
                <button type="button" onClick={() => {
                  setWorkshopMode(workshopModeConfirm);
                  onUpdateConfig({ ...config, workshopMode: workshopModeConfirm });
                  setWorkshopModeConfirm(null);
                  setFeedback('✓ Modo de taller actualizado');
                  setTimeout(() => setFeedback(null), 3000);
                }}
                  className="px-4 py-1.5 text-xs font-black rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                  Confirmar cambio
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DIÁLOGO INTERACTIVO PERSONALIZADO PARA ALERTAS/CONFIRMACIONES */}
      {modalDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${
            isRetro
              ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 w-full max-w-md shadow-[6px_6px_15px_rgba(0,0,0,0.6)] text-black font-sans'
              : isLight
                ? 'bg-white border border-zinc-200 w-full max-w-md rounded-2xl shadow-2xl text-zinc-950 font-sans'
                : 'bg-[#121316] border border-[#1b1c21] w-full max-w-md rounded-2xl shadow-2xl text-zinc-100'
          } flex flex-col overflow-hidden`}>
            
            {/* Cabecera / Barra estilo OS */}
            <div className={`${
              isRetro
                ? 'bg-[#000080] p-2 text-white flex items-center justify-between'
                : modalDialog.type === 'error'
                  ? 'bg-red-950/40 text-red-450 p-4 rounded-t-2xl border-b border-red-900/30'
                  : 'bg-zinc-800 text-white p-4 rounded-t-2xl'
            } flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isRetro && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 px-1.5 py-0.5 rounded retro-white-text">
                    {modalDialog.type === 'error' ? 'ERROR' : modalDialog.type === 'warning' ? 'AVISO' : 'CONFIRMAR'}
                  </span>
                )}
                <span className={`text-xs font-black uppercase ${isRetro ? 'retro-white-text' : ''}`}>
                  {modalDialog.title}
                </span>
              </div>
              {isRetro && (
                <button
                  type="button"
                  onClick={() => setModalDialog(null)}
                  className="px-1.5 py-0.5 bg-[#dfdfdf] border-1.5 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-black text-[10px] hover:bg-zinc-300 cursor-pointer"
                >
                  X
                </button>
              )}
            </div>

            {/* Contenido */}
            <div className={`p-5 text-xs space-y-3 ${isRetro ? 'bg-[#eaeef3] text-black' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 select-none">
                  {modalDialog.type === 'error' ? '❌' : modalDialog.type === 'warning' ? '⚠️' : '❓'}
                </span>
                <div className="space-y-1 font-medium whitespace-pre-line leading-relaxed">
                  {modalDialog.message}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className={`p-3.5 flex justify-end gap-2 border-t ${
              isRetro ? 'bg-[#cbd6e2] border-t-[#808080]' : isLight ? 'bg-zinc-50 border-t-zinc-200' : 'bg-[#121316]/50 border-t-zinc-800'
            }`}>
              {modalDialog.onConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      modalDialog.onConfirm?.();
                      setModalDialog(null);
                    }}
                    className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3] rounded-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'
                    }`}
                  >
                    {modalDialog.confirmText || 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDialog(null)}
                    className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                      isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black hover:bg-zinc-300 rounded-none'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
                    }`}
                  >
                    {modalDialog.cancelText || 'Cancelar'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalDialog(null)}
                  className={`px-6 py-1.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${
                    isRetro
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-black hover:bg-zinc-300 rounded-none'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg'
                  }`}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {printerWizardOpen && (
        <div className="fixed inset-0 z-[80000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl flex flex-col shadow-2xl transition-all ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-900 border-r-zinc-900 rounded-none text-black p-5 font-mono text-xs'
              : isLight
                ? 'bg-white border border-zinc-200 rounded-2xl p-6 text-zinc-800'
                : 'bg-[#0d0e12] border border-zinc-800 rounded-2xl p-6 text-zinc-150'
          }`} style={{ maxHeight: '90vh' }}>
            
            {/* Cabecera */}
            <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
              isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
            }`}>
              <h3 className={`text-sm font-black uppercase tracking-wider ${
                isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-900' : 'text-emerald-400'
              }`}>
                {printerWizardType === 'ticket' ? '🎫 Asistente de Ticketera' : printerWizardType === 'label' ? '🏷️ Asistente de Etiquetas' : '📄 Asistente de Reportes A4'}
              </h3>
              <button
                type="button"
                onClick={() => setPrinterWizardOpen(false)}
                className={`p-1 hover:opacity-75 transition-opacity cursor-pointer ${
                  isRetro ? 'bg-[#c0c0c0] border border-zinc-400 text-zinc-900' : ''
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de Progreso */}
            <div className="flex items-center justify-between mb-6 px-4">
              {[
                { step: 1, label: 'Seleccionar' },
                { step: 2, label: 'Síntoma' },
                { step: 3, label: 'Solución' },
                { step: 4, label: 'Prueba' }
              ].map((s) => {
                const isActive = printerWizardStep === s.step;
                const isCompleted = printerWizardStep > s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isActive
                        ? (isRetro ? 'bg-[#000080] text-white' : 'bg-emerald-500 text-black')
                        : isCompleted
                          ? (isRetro ? 'bg-[#c0c0c0] text-zinc-600 line-through' : 'bg-emerald-500/20 text-emerald-400')
                          : (isRetro ? 'bg-white text-zinc-400 border border-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-900 text-zinc-600')
                    }`}>
                      {s.step}
                    </div>
                    <span className={`text-[8.5px] uppercase font-bold tracking-wider ${
                      isActive
                        ? (isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-800' : 'text-emerald-400')
                        : 'text-zinc-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Contenido Dinámico con Scrollbar Limpio */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4" style={{ minHeight: '220px' }}>
              
              {/* PASO 1: Selección de impresora del sistema */}
              {printerWizardStep === 1 && (
                <div className="space-y-3.5 text-left">
                  <p className={`text-xs font-semibold leading-relaxed ${isRetro ? 'text-zinc-800 font-bold' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    Selecciona de la lista la impresora física real que estás intentando configurar:
                  </p>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {wizardPrinterList.map((p) => {
                      const isSel = wizardSelectedPrinter === p.name;
                      return (
                        <div
                          key={p.name}
                          onClick={() => setWizardSelectedPrinter(p.name)}
                          className={`p-2.5 border transition-all cursor-pointer flex justify-between items-center ${
                            isSel
                              ? (isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-emerald-950/15 border-emerald-500/60 hover:bg-emerald-950/20 rounded-lg')
                              : (isRetro ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 rounded-lg' : 'bg-[#121316] border-zinc-900 hover:border-zinc-800 hover:bg-[#191b21] rounded-lg')
                          }`}
                        >
                          <div>
                            <h6 className={`text-[11px] font-bold ${isRetro ? 'text-zinc-950 font-mono' : isLight ? 'text-zinc-900' : 'text-white'}`}>{p.displayName || p.name}</h6>
                            {p.isDefault && <span className="text-[8px] uppercase tracking-wider text-emerald-500 font-bold">★ Predeterminada</span>}
                          </div>
                          {isSel && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-500">✓ Seleccionada</span>}
                        </div>
                      );
                    })}
                    {wizardPrinterList.length === 0 && (
                      <p className="text-[10px] text-zinc-500 italic text-center py-4">No se detectaron impresoras instaladas en tu computadora.</p>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 2: Selección de síntomas */}
              {printerWizardStep === 2 && (
                <div className="space-y-3.5 text-left">
                  <p className={`text-xs font-semibold leading-relaxed ${isRetro ? 'text-zinc-850 font-bold' : isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    ¿Qué problema estás experimentando actualmente al mandar a imprimir?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'none', label: 'Ninguno, es la primera vez que la configuro' },
                      ...(printerWizardType === 'ticket' ? [
                        { id: 'corta_mitad', label: '✂️ El ticket se corta a la mitad o no sale completo' },
                        { id: 'en_blanco', label: '📄 Sale solo un centímetro de papel en blanco y se detiene' },
                        { id: 'desalineado', label: '📏 El texto sale desalineado o se recortan las orillas' }
                      ] : []),
                      ...(printerWizardType === 'label' ? [
                        { id: 'etiqueta_salta', label: '🏷️ Salta varias etiquetas en blanco tras imprimir' },
                        { id: 'etiqueta_chiquita', label: '🔎 El texto se ve muy pequeño o desfasado del cuadro' }
                      ] : []),
                      ...(printerWizardType === 'report' ? [
                        { id: 'contrato_incompleto', label: '📝 Las cláusulas o firmas al reverso no salen completas' },
                        { id: 'contrato_margenes', label: '📐 Los márgenes de la hoja A4 se ven demasiado grandes/chicos' }
                      ] : [])
                    ].map((s) => {
                      const isSel = wizardSymptom === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setWizardSymptom(s.id)}
                          className={`p-3 border transition-all cursor-pointer flex justify-between items-center ${
                            isSel
                              ? (isRetro ? 'bg-blue-50/85 border-[#000080]' : 'bg-emerald-950/15 border-emerald-500/60 hover:bg-emerald-950/20 rounded-lg')
                              : (isRetro ? 'bg-white border-zinc-300 hover:bg-zinc-150 rounded-none' : isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 rounded-lg' : 'bg-[#121316] border-zinc-900 hover:border-zinc-800 hover:bg-[#191b21] rounded-lg')
                          }`}
                        >
                          <span className={`text-[10.5px] font-bold ${isRetro ? 'text-zinc-950 font-mono' : isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{s.label}</span>
                          {isSel && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-500">✓ Seleccionado</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 3: IA Diagnóstico e Instrucciones */}
              {printerWizardStep === 3 && wizardAiDiagnosis && (
                <div className="space-y-4 text-left">
                  
                  {/* Alerta si usa driver genérico */}
                  {wizardAiDiagnosis.isGenericDriver && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 flex items-start gap-2.5">
                      <span className="text-lg">⚠️</span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider block">Driver Genérico Detectado</span>
                        <span className="text-[9px] leading-relaxed block text-amber-500/90">
                          Tu ticketera parece estar usando el controlador de texto plano genérico de Windows/Mac. Esto suele desconfigurar el largo de los tickets y la calidad de impresión. Te aconsejamos descargar su driver oficial.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Explicación de la IA */}
                  <div className={`p-4 rounded-xl border leading-relaxed ${
                    isRetro 
                      ? 'bg-[#c0c0c0] border-[#808080] text-zinc-900 font-sans' 
                      : isLight 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800 text-xs' 
                        : 'bg-[#0f1015]/60 border-[#1c1d22] text-zinc-300 text-xs'
                  }`}>
                    <p className="font-bold text-[11px] mb-1 text-emerald-500">💡 Diagnóstico de Gemini:</p>
                    {wizardAiDiagnosis.explanation}
                  </div>

                  {/* Enlace de Descarga */}
                  {wizardAiDiagnosis.downloadUrl && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex justify-between items-center gap-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 block">Marca Detectada: {wizardAiDiagnosis.detectedBrand}</span>
                        <span className={`text-[8.5px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} block`}>Haz clic para descargar el driver oficial recomendado para tu sistema operativo.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => (window as any).electronAPI?.openExternal(wizardAiDiagnosis.downloadUrl)}
                        className={`px-3 py-1.5 text-[9.5px] uppercase font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                          isRetro ? 'bg-[#000080] text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-lg shadow'
                        }`}
                      >
                        📥 Ir a descargas
                      </button>
                    </div>
                  )}

                  {/* Pasos de Instalación */}
                  {wizardAiDiagnosis.installInstructions && wizardAiDiagnosis.installInstructions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isRetro ? 'text-zinc-800 font-mono' : isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>🛠️ Pasos para configurar el controlador:</span>
                      <ol className={`list-decimal pl-4.5 space-y-1 text-[9.5px] leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {wizardAiDiagnosis.installInstructions.map((ins, i) => (
                          <li key={i}>{ins}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 4: Prueba y Confirmación */}
              {printerWizardStep === 4 && (
                <div className="space-y-4 text-left">
                  <p className={`text-xs font-semibold leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    Hemos aplicado los ajustes recomendados automáticamente en segundo plano. Manda una impresión de prueba para asegurarte de que todo sale perfecto:
                  </p>

                  <div className="flex justify-center py-2">
                    <button
                      type="button"
                      onClick={handleWizardTestPrint}
                      className={`px-5 py-2.5 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 flex items-center gap-2 ${
                        isRetro 
                          ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      Enviar impresión de prueba
                    </button>
                  </div>

                  {wizardTestPrintFeedback && (
                    <p className={`text-[10px] text-center font-bold font-mono ${
                      wizardTestPrintFeedback.includes('✅') 
                        ? (isRetro ? 'text-green-800' : 'text-green-400') 
                        : (isRetro ? 'text-rose-800' : 'text-rose-400')
                    }`}>
                      {wizardTestPrintFeedback}
                    </p>
                  )}

                  <div className={`p-4 rounded-xl border space-y-2 mt-2 ${isRetro ? 'bg-[#dfdfdf] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950/40 border-zinc-900'}`}>
                    <span className={`text-[10px] font-black uppercase block tracking-wider ${isRetro ? 'text-[#000080]' : 'text-emerald-400'}`}>🔍 Resultados de la prueba:</span>
                    <p className={`text-[9px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} leading-relaxed`}>
                      Si todo sale bien, puedes hacer clic en "Guardar y Finalizar" abajo. Si sigue habiendo problemas de corte o formato, puedes volver al Paso 2 para re-evaluar el síntoma, o ajustar las casillas en la pestaña de compatibilidad una vez cerrado el asistente.
                    </p>
                  </div>
                </div>
              )}

              {/* Errores del Diagnóstico de la IA */}
              {wizardAiError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-[10px] leading-relaxed flex items-start gap-2.5 mt-2">
                  <span className="text-base">❌</span>
                  <div className="space-y-0.5">
                    <span className="font-bold uppercase tracking-wider block">Error en Diagnóstico IA</span>
                    <span className="block text-rose-500/90">{wizardAiError}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Pie de modal con botones de navegación */}
            <div className={`flex items-center justify-between pt-3.5 border-t ${
              isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-zinc-800'
            }`}>
              
              {/* Botón Atrás */}
              <button
                type="button"
                disabled={printerWizardStep === 1 || wizardAiLoading}
                onClick={() => {
                  if (printerWizardStep === 3) {
                    setPrinterWizardStep(2);
                  } else {
                    setPrinterWizardStep(prev => prev - 1);
                  }
                  setWizardTestPrintFeedback(null);
                }}
                className={`px-4 py-1.5 text-[10.5px] uppercase font-bold flex items-center gap-1.5 cursor-pointer select-none active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                  isRetro 
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg'
                }`}
              >
                ◀ Atrás
              </button>

              {/* Botón Siguiente / Procesar */}
              {printerWizardStep < 4 ? (
                <button
                  type="button"
                  disabled={
                    (printerWizardStep === 1 && !wizardSelectedPrinter) ||
                    wizardAiLoading
                  }
                  onClick={() => {
                    if (printerWizardStep === 2) {
                      handleRunAiDiagnosis();
                    } else if (printerWizardStep === 3) {
                      setPrinterWizardStep(4);
                    } else {
                      setPrinterWizardStep(prev => prev + 1);
                    }
                  }}
                  className={`px-4 py-1.5 text-[10.5px] uppercase font-bold flex items-center gap-1.5 cursor-pointer select-none active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed ${
                    isRetro 
                      ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080]' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg'
                  }`}
                >
                  {wizardAiLoading ? 'Analizando con IA...' : (printerWizardStep === 2 ? 'Diagnosticar con IA ▶' : 'Siguiente ▶')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleWizardSaveAndFinish}
                  className={`px-5 py-1.5 text-[10.5px] uppercase font-black cursor-pointer select-none active:scale-95 ${
                    isRetro 
                      ? 'bg-[#000080] text-white retro-white-text border-2 border-t-white border-l-white border-[#000] border-r-[#000]' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black shadow'
                  }`}
                >
                  💾 Guardar y Finalizar
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


export default ConfigView;
