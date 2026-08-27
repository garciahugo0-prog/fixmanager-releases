/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Upload, MessageCircle, FileDown, Printer, Search,
  Edit, Trash2, Shield, Eye, Smartphone, CheckCircle, RefreshCw, X, Tag, FileText,
  Send, Download, AlertTriangle, ArrowRight, Check, Sparkles, Filter, ChevronLeft, ChevronRight,
  Database, HelpCircle
} from 'lucide-react';
import {
  Client, RepairOrder, WorkshopConfig, Sale, ActiveTab
} from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { formatPhoneForWhatsapp, openWhatsappChat } from '../utils/whatsapp';
import { buildA4ReportHtml, printA4Report, showToast } from '../utils/a4Reports';
import * as XLSX from 'xlsx';
import CountryCodeSelect from './CountryCodeSelect';

const formatDateToDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const DEFAULT_PROMO_TEMPLATE = 
  "Hola {nombre}, te informamos que en *{taller}* tenemos promociones increíbles en micas y accesorios esta semana. ¡Visítanos!\n\n" +
  "📍 *Ubícanos aquí:*\n{direccion}\n\n" +
  "🗺️ *Ver en Google Maps:*\n{maps_link}\n\n" +
  "🕒 *Horarios:*\n{horarios}\n\n" +
  "📞 *Tel:* {telefono_taller}\n" +
  "💬 *WhatsApp:* {whatsapp}\n\n" +
  "🌐 *Nuestras Redes Sociales:*\n" +
  "Facebook: {facebook}\n" +
  "Instagram: {instagram}\n" +
  "TikTok: {tiktok}";

const DEFAULT_COBRO_TEMPLATE = 
  "Hola {nombre}, en *{taller}* te recordamos amablemente que cuentas con un saldo pendiente de *{saldo_pendiente}* por tus *{ordenes_activas}* servicio(s) de reparación. Por favor, pasa a liquidar. ¡Gracias por tu preferencia!\n\n" +
  "📍 *Ubícanos aquí:*\n{direccion}\n\n" +
  "🗺️ *Ver en Google Maps:*\n{maps_link}\n\n" +
  "🕒 *Horarios:*\n{horarios}\n\n" +
  "📞 *Tel:* {telefono_taller}\n" +
  "💬 *WhatsApp:* {whatsapp}\n\n" +
  "🌐 *Nuestras Redes Sociales:*\n" +
  "Facebook: {facebook}\n" +
  "Instagram: {instagram}\n" +
  "TikTok: {tiktok}";

const DEFAULT_ESTATUS_TEMPLATE = 
  "Hola {nombre}, te informamos que en *{taller}* tenemos *{ordenes_activas}* equipo(s) en proceso de reparación. Te notificaremos por este medio en cuanto estén listos para entrega.\n\n" +
  "📍 *Ubícanos aquí:*\n{direccion}\n\n" +
  "🗺️ *Ver en Google Maps:*\n{maps_link}\n\n" +
  "🕒 *Horarios:* {horarios}\n\n" +
  "📞 *Tel:* {telefono_taller}\n" +
  "💬 *WhatsApp:* {whatsapp}\n\n" +
  "🌐 *Nuestras Redes Sociales:*\n" +
  "Facebook: {facebook}\n" +
  "Instagram: {instagram}\n" +
  "TikTok: {tiktok}";

const formatSocialLinkForPromo = (platform: 'facebook' | 'instagram' | 'tiktok', username: string | undefined): string => {
  if (!username) return '';
  const trimmed = username.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanUser = trimmed.replace(/^@/, '');
  if (platform === 'facebook') return `https://facebook.com/${cleanUser}`;
  if (platform === 'instagram') return `https://instagram.com/${cleanUser}`;
  if (platform === 'tiktok') return `https://tiktok.com/@${cleanUser}`;
  return trimmed;
};

const formatBusinessHoursForPromo = (hoursStr: string | undefined): string => {
  if (!hoursStr) return 'No definido';
  try {
    const obj = JSON.parse(hoursStr);
    if (typeof obj !== 'object' || obj === null) return hoursStr;

    const daysOrder = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo'];
    const formattedDays: string[] = [];

    for (const day of daysOrder) {
      const dayData = obj[day];
      if (dayData && dayData.isOpen) {
        const dayNameCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
        if (dayData.type === 'split') {
          formattedDays.push(`${dayNameCapitalized}: ${dayData.openTime}-${dayData.closeTime} / ${dayData.openTime2}-${dayData.closeTime2}`);
        } else {
          formattedDays.push(`${dayNameCapitalized}: ${dayData.openTime}-${dayData.closeTime}`);
        }
      }
    }

    if (formattedDays.length > 0) {
      return formattedDays.join('\n');
    }
    return hoursStr;
  } catch (e) {
    return hoursStr;
  }
};

const renderWhatsAppFormattedText = (text: string, isRetro: boolean, isLight: boolean) => {
  if (!text) return <span className="italic text-zinc-500">Sin contenido...</span>;

  // Split lines
  const lines = text.split('\n');
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linkColorClass = isRetro ? 'text-[#000080] font-black underline' : isLight ? 'text-[#027eb5] underline' : 'text-[#53bdeb] underline';

  return lines.map((line, lineIdx) => {
    const parts = line.split(urlRegex);

    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={partIdx}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  const api = (window as any).electronAPI;
                  if (api?.openExternal) {
                    e.preventDefault();
                    api.openExternal(part);
                  }
                }}
                className={`${linkColorClass} hover:opacity-80 cursor-pointer break-all`}
                title={`Abrir enlace: ${part}`}
              >
                {part}
              </a>
            );
          }

          // Format *bold*
          const boldRegex = /(\*[^*]+\*)/g;
          const subParts = part.split(boldRegex);

          return (
            <React.Fragment key={partIdx}>
              {subParts.map((sub, subIdx) => {
                if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
                  return (
                    <strong key={subIdx} className="font-extrabold">
                      {sub.slice(1, -1)}
                    </strong>
                  );
                }
                return <span key={subIdx}>{sub}</span>;
              })}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  });
};

/* ==========================================================
   3. CLIENTES VIEW - IMPORT EXCEL HELPERS & MODAL
   ========================================================== */
const cleanHeader = (s: string) => s.toLowerCase().trim().replace(/[\s_:.-]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const MAPPABLE_CLIENT_FIELDS = [
  { key: 'name', label: 'Nombre *', synonyms: ['nombre', 'name', 'cliente', 'client', 'nombrecompleto', 'fullname', 'nombre_completo'] },
  { key: 'phone', label: 'Teléfono *', synonyms: ['telefono', 'phone', 'celular', 'movil', 'móvil', 'teléfono', 'telephone', 'contacto', 'num', 'numero'] },
  { key: 'countryCode', label: 'Código País (Lada)', synonyms: ['lada', 'pais', 'country', 'codigopais', 'código_país', 'countrycode', 'country_code'] },
  { key: 'email', label: 'Correo', synonyms: ['correo', 'email', 'mail', 'correo_electronico', 'correoelectronico'] },
  { key: 'registeredAt', label: 'Fecha de Registro', synonyms: ['fecha', 'registro', 'date', 'registeredat', 'registered_at', 'creado', 'fecha_registro'] },
  { key: 'creditLimit', label: 'Límite de Crédito', synonyms: ['credito', 'credit', 'limite', 'limitecredito', 'limite_credito', 'creditlimit', 'credit_limit'] },
];

const autoMapClientHeaders = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  MAPPABLE_CLIENT_FIELDS.forEach(field => {
    let match = headers.find(h => {
      const cleanedH = cleanHeader(h);
      return field.synonyms.some(syn => cleanedH === syn);
    });
    if (!match) {
      match = headers.find(h => {
        const cleanedH = cleanHeader(h);
        return field.synonyms.some(syn => cleanedH.includes(syn) || syn.includes(cleanedH));
      });
    }
    mapping[field.key] = match || '';
  });
  return mapping;
};

const parseClientRowsWithMapping = (rows: any[], mapping: Record<string, string>, existingCount: number): Client[] => {
  const parseNumberClean = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parsedClients: Client[] = [];
  rows.forEach((row: any, i) => {
    const getVal = (fieldKey: string): any => {
      const mappedHeader = mapping[fieldKey];
      return mappedHeader ? row[mappedHeader] : undefined;
    };

    const name = String(getVal('name') || '').trim();
    let phone = String(getVal('phone') || '').replace(/\D/g, '').trim();
    if (!name || !phone) return;

    const countryCode = String(getVal('countryCode') || '').replace(/\D/g, '').trim() || '52';
    const email = String(getVal('email') || '').trim() || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
    
    let registeredAt = new Date().toISOString().split('T')[0];
    const registeredVal = getVal('registeredAt');
    if (registeredVal) {
      try {
        if (typeof registeredVal === 'number') {
          const dateObj = new Date((registeredVal - 25569) * 86400 * 1000);
          if (!isNaN(dateObj.getTime())) {
            registeredAt = dateObj.toISOString().split('T')[0];
          }
        } else {
          const parsedDate = new Date(registeredVal);
          if (!isNaN(parsedDate.getTime())) {
            registeredAt = parsedDate.toISOString().split('T')[0];
          }
        }
      } catch (e) {}
    }

    const creditLimitVal = getVal('creditLimit');
    const creditLimit = creditLimitVal !== undefined && creditLimitVal !== null ? parseNumberClean(creditLimitVal) : undefined;

    parsedClients.push({
      id: `C${existingCount + parsedClients.length + 1}`,
      name: name.toUpperCase(),
      phone,
      countryCode,
      email,
      totalOrders: 0,
      registeredAt,
      creditLimit
    });
  });

  return parsedClients;
};

export interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSetClients?: (clients: Client[]) => void;
  config: WorkshopConfig;
  showToast: (msg: string, type?: 'ok' | 'error') => void;
}

export function ImportClientsModal({
  isOpen,
  onClose,
  clients,
  onSetClients,
  config,
  showToast,
}: ImportClientsModalProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [tempImportedClients, setTempImportedClients] = useState<Client[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0 });
  const [localError, setLocalError] = useState<string | null>(null);
  const [importReplaceMode, setImportReplaceMode] = useState(false);
  const [rawImportedRows, setRawImportedRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  const [isDetailedPreviewOpen, setIsDetailedPreviewOpen] = useState(false);
  const [previewSearchTerm, setPreviewSearchTermRaw] = useState('');
  const setPreviewSearchTerm = (val: string) => {
    setPreviewSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(25);

  const filteredPreviewClients = React.useMemo(() => {
    if (!previewSearchTerm.trim()) return tempImportedClients;
    const normSearch = normalizeText(previewSearchTerm);
    return tempImportedClients.filter(c =>
      normalizeText(c.name).includes(normSearch) ||
      normalizeText(c.phone).includes(normSearch)
    );
  }, [tempImportedClients, previewSearchTerm]);

  React.useEffect(() => {
    setPreviewPage(1);
  }, [previewSearchTerm]);

  const totalPreviewPages = Math.ceil(filteredPreviewClients.length / previewRowsPerPage) || 1;
  const paginatedPreviewClients = React.useMemo(() => {
    const startIdx = (previewPage - 1) * previewRowsPerPage;
    return filteredPreviewClients.slice(startIdx, startIdx + previewRowsPerPage);
  }, [filteredPreviewClients, previewPage, previewRowsPerPage]);

  const handleDownloadTemplate = () => {
    const headers = "Nombre,Telefono,Lada,Correo,Fecha Registro,Limite Credito\n";
    const row1 = "HUGO GARCIA,3511574876,52,hugo@example.com,2026-08-12,1000\n";
    const row2 = "FULANITO DETAL,3515278483,52,fulanito@example.com,2026-08-12,500\n";
    const csvContent = "\uFEFF" + headers + row1 + row2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const doc = document;
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_importacion_clientes.csv");
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBytes = evt.target?.result;
        if (!dataBytes) {
          setLocalError('No se pudieron leer los bytes del archivo.');
          return;
        }

        let workbook;
        try {
          workbook = XLSX.read(dataBytes, { type: 'array' });
        } catch (readErr: any) {
          console.error(readErr);
          setLocalError(`No se pudo parsear el archivo Excel. Asegúrese de que no esté corrupto. Detalle: ${readErr.message || readErr}`);
          return;
        }

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          setLocalError('El archivo Excel no contiene ninguna pestaña u hoja de cálculo válida.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          setLocalError(`No se pudo leer la hoja "${firstSheetName}" en el archivo.`);
          return;
        }

        let rawJson: any[] = [];
        try {
          rawJson = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        } catch (jsonErr: any) {
          console.error(jsonErr);
          setLocalError(`Error al convertir los datos de la hoja a JSON. Detalle: ${jsonErr.message || jsonErr}`);
          return;
        }

        if (!rawJson || rawJson.length === 0) {
          setLocalError('El archivo cargado no contiene registros válidos o está vacío.');
          return;
        }

        const headersSet = new Set<string>();
        rawJson.forEach(row => {
          Object.keys(row).forEach(k => headersSet.add(k));
        });
        const headers = Array.from(headersSet);
        setDetectedHeaders(headers);
        setRawImportedRows(rawJson);

        const initialMapping = autoMapClientHeaders(headers);
        setColumnMapping(initialMapping);

        const parsedClients = parseClientRowsWithMapping(rawJson, initialMapping, clients.length);
        setTempImportedClients(parsedClients);
        setImportStats({ total: rawJson.length, valid: parsedClients.length });
      } catch (err: any) {
        console.error(err);
        setLocalError(`Error inesperado al importar. Detalle: ${err.message || err}`);
      }
    };
    reader.onerror = (evt) => {
      console.error(evt);
      setLocalError('Error de lectura física del archivo.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyImport = () => {
    if (!onSetClients || tempImportedClients.length === 0) return;
    setIsImporting(true);

    setTimeout(() => {
      try {
        if (importReplaceMode) {
          onSetClients(tempImportedClients);
          showToast(`✅ Directorio de clientes REEMPLAZADO con éxito. Se cargaron ${tempImportedClients.length} clientes nuevos.`, 'ok');
        } else {
          const mergedClients = [...clients];
          tempImportedClients.forEach(newC => {
            const idx = mergedClients.findIndex(c => c.phone === newC.phone);
            if (idx !== -1) {
              mergedClients[idx] = {
                ...mergedClients[idx],
                name: newC.name,
                countryCode: newC.countryCode || mergedClients[idx].countryCode,
                email: newC.email || mergedClients[idx].email,
                creditLimit: newC.creditLimit !== undefined ? newC.creditLimit : mergedClients[idx].creditLimit,
              };
            } else {
              mergedClients.push(newC);
            }
          });
          onSetClients(mergedClients);
          showToast(`✅ Directorio de clientes IMPORTADO con éxito. Se añadieron/actualizaron ${tempImportedClients.length} clientes.`, 'ok');
        }

        onClose();
        setIsDetailedPreviewOpen(false);
        setTempImportedClients([]);
        setImportStats({ total: 0, valid: 0 });
        setPreviewSearchTerm('');
        setPreviewPage(1);
      } catch (err) {
        console.error(err);
        showToast('⚠️ Error al procesar e importar la base de datos de clientes.');
      } finally {
        setIsImporting(false);
      }
    }, 150);
  };

  const inputClass = isRetro
    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-1.5 focus:outline-none font-mono'
    : isLight
      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-purple-500'
      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono';

  const searchInputClass = `pl-9 ${inputClass}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className={`rounded-xl max-w-xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] ${
        isRetro ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
        : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
        : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
          isRetro ? 'bg-[#000080] border-[#808080] text-white'
          : isLight ? 'bg-zinc-50 border-zinc-200'
          : 'bg-[#0e0f12] border-[#1c1d22]'
        }`}>
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-purple-500'}`} />
            <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
              📂 Importar Directorio de Clientes desde Excel / CSV
            </h3>
          </div>
          <button
            onClick={() => {
              onClose();
              setIsDetailedPreviewOpen(false);
              setTempImportedClients([]);
              setPreviewSearchTerm('');
              setPreviewPage(1);
            }}
            className={`p-1 rounded-full cursor-pointer ${
              isRetro ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
              : isLight ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 border border-zinc-300'
              : 'text-gray-400 hover:text-white bg-zinc-900 border border-zinc-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto text-left">
          {localError && (
            <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-[11px] font-sans ${
              isRetro ? 'bg-red-50 border-red-400 text-red-800'
              : isLight ? 'bg-red-50 border-red-350 text-red-750'
              : 'bg-red-950/30 border-red-900/60 text-red-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]'
            }`}>
              <span className="shrink-0 text-sm">⚠️</span>
              <div className="flex-1">
                <span className="block font-black uppercase tracking-wider text-[9.5px] mb-0.5 text-red-500 font-mono">Archivo no compatible</span>
                <span className="leading-relaxed">{localError}</span>
              </div>
              <button type="button" onClick={() => setLocalError(null)} className="text-zinc-500 hover:text-zinc-300 text-[11px] font-black shrink-0 px-1 cursor-pointer">×</button>
            </div>
          )}

          <div className={`border rounded-lg p-4 space-y-4 ${
            isRetro ? 'bg-white border-zinc-400'
            : isLight ? 'bg-zinc-50 border-zinc-200'
            : 'bg-[#181a1f] border-zinc-800'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Estructura de Columnas Soportada</h4>
                <p className={`text-[11px] ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                  El importador reconoce de forma inteligente los siguientes encabezados (inglés o español):
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3]'
                  : isLight ? 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'
                  : 'bg-[#1f2025] hover:bg-zinc-800 text-purple-400 border-purple-950/40'
                }`}
              >
                <Download className="w-3 h-3" /> Descargar Plantilla CSV
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono select-all">
              {['Nombre', 'Telefono', 'Lada', 'Correo', 'Fecha Registro', 'Limite Credito'].map(col => {
                let badgeClass = isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-200';
                if (col === 'Nombre' || col === 'Telefono') {
                  badgeClass = isLight ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold' : 'bg-zinc-900 border-zinc-800 text-amber-500 font-bold';
                }
                return (
                  <span key={col} className={`border px-2 py-0.5 rounded ${badgeClass}`}>
                    {col}{(col === 'Nombre' || col === 'Telefono') ? ' *' : ''}
                  </span>
                );
              })}
            </div>
            <p className={`text-[10px] italic ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
              💡 Los campos obligatorios son <span className={isLight ? 'text-zinc-800 font-bold' : 'text-zinc-300'}>Nombre y Teléfono</span>. Los demás se auto-generarán si se omiten.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              onClick={() => setImportReplaceMode(false)}
              className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                !importReplaceMode
                  ? isRetro ? (isLight ? 'border-[#000080] bg-blue-50' : 'border-blue-500/80 bg-blue-950/20') : isLight ? 'border-purple-400 bg-purple-50' : 'border-purple-600/50 bg-purple-950/10'
                  : isRetro ? (isLight ? 'border-zinc-400 bg-[#eaeef3] hover:bg-zinc-200' : 'border-[#383c48] bg-[#121316] hover:bg-[#282b35]') : isLight ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-[#2d2f36] bg-[#1c1e24]/40 hover:bg-[#1c1e24]'
              }`}
            >
              <div className="flex items-center gap-2">
                <input type="radio" name="import-mode-client" checked={!importReplaceMode} onChange={() => setImportReplaceMode(false)} className="text-purple-600 animate-none" />
                <span className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Adicionar a Clientes</span>
              </div>
              <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                Se sumarán los clientes nuevos y se actualizarán datos si ya existe el teléfono.
              </p>
            </label>
            <label
              onClick={() => setImportReplaceMode(true)}
              className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                importReplaceMode
                  ? isRetro ? (isLight ? 'border-red-600 bg-red-50' : 'border-rose-500/80 bg-rose-950/20') : isLight ? 'border-rose-400 bg-rose-50' : 'border-rose-950/80 bg-rose-950/10'
                  : isRetro ? (isLight ? 'border-zinc-400 bg-[#eaeef3] hover:bg-zinc-200' : 'border-[#383c48] bg-[#121316] hover:bg-[#282b35]') : isLight ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-[#2d2f36] bg-[#1c1e24]/40 hover:bg-[#1c1e24]'
              }`}
            >
              <div className="flex items-center gap-2">
                <input type="radio" name="import-mode-client" checked={importReplaceMode} onChange={() => setImportReplaceMode(true)} className="text-rose-500 animate-none" />
                <span className={`text-xs font-bold ${isRetro ? (isLight ? 'text-red-800' : 'text-red-300') : isLight ? 'text-rose-700' : 'text-rose-400'}`}>Reemplazar Directorio</span>
              </div>
              <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                ¡Cuidado! Se eliminará el directorio actual de clientes para cargar únicamente los del Excel.
              </p>
            </label>
          </div>

          <div className={`relative group border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isRetro ? 'border-zinc-500 hover:border-[#000080] bg-white'
            : isLight ? 'border-zinc-300 hover:border-purple-400 bg-zinc-50'
            : 'border-[#2d2f36] hover:border-purple-500/50 bg-[#17181d]/50'
          }`}>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className={`p-3 rounded-full group-hover:scale-105 transition-transform ${
                isRetro ? 'bg-blue-100 border border-[#000080] text-[#000080]'
                : isLight ? 'bg-purple-100 border border-purple-300 text-purple-600'
                : 'bg-purple-950/30 border border-purple-500/20 text-purple-400'
              }`}>
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  Arrastre o haga clic para seleccionar su archivo .xlsx, .xls o .csv
                </p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Soporta libros de Excel antiguos, modernos, y archivos CSV
                </p>
              </div>
            </div>
          </div>

          {tempImportedClients.length > 0 && (
            <div className="space-y-4 pt-2 animate-fadeIn font-mono">
              <div className={`p-4 border rounded-xl space-y-3 text-left ${
                isRetro ? 'bg-[#dfdfdf] border-[#808080]'
                : isLight ? 'bg-zinc-50 border-zinc-200'
                : 'bg-[#141519] border-zinc-800'
              }`}>
                <div className="flex items-center gap-2 border-b pb-2 border-zinc-800/10">
                  <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-zinc-800' : 'text-amber-400'}`}>⚙️ Mapeo de Columnas Detectadas</span>
                </div>
                <p className={`text-[10.5px] font-sans ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                  FixManager asoció automáticamente los campos de tu Excel. Si deseas corregir o reasignar alguna columna, puedes hacerlo a continuación:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {MAPPABLE_CLIENT_FIELDS.map(field => {
                    const selectedCol = columnMapping[field.key] || '';
                    return (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className={`text-[9.5px] font-mono font-bold uppercase ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                          {field.label}
                        </label>
                        <select
                          value={selectedCol}
                          onChange={e => {
                            const updatedMapping = { ...columnMapping, [field.key]: e.target.value };
                            setColumnMapping(updatedMapping);
                            const parsed = parseClientRowsWithMapping(rawImportedRows, updatedMapping, clients.length);
                            setTempImportedClients(parsed);
                            setImportStats({ total: rawImportedRows.length, valid: parsed.length });
                          }}
                          className={`text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer ${
                            isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900'
                            : isLight ? 'bg-white border border-zinc-300 rounded-lg text-zinc-900'
                            : 'bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-250'
                          }`}
                        >
                          <option value="">-- Ignorar / Ninguno --</option>
                          {detectedHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left ${
                isRetro ? 'bg-[#dfdfdf] border-[#808080]'
                : isLight ? 'bg-purple-50/50 border-purple-200 text-purple-900'
                : 'bg-[#181a1f] border-zinc-800/80 text-zinc-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle className={`w-4 h-4 ${isRetro ? 'text-zinc-800' : 'text-emerald-500'}`} />
                    <span>Se procesaron {importStats.valid} registros con éxito</span>
                  </div>
                  <p className={`text-[10.5px] ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                    Para garantizar una importación fiel y segura, debes revisar el listado completo y verificar los datos mapeados antes de confirmar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailedPreviewOpen(true)}
                  className={`shrink-0 px-4 py-2 text-xs font-black rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-[#000080] hover:bg-[#eaeef3]'
                    : isLight ? 'bg-purple-600 hover:bg-purple-500 text-white shadow border-transparent'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg border-transparent'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Ver Listado Completo ({tempImportedClients.length} cl.)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 border-t flex justify-end gap-2 shrink-0 ${
          isRetro ? 'bg-[#dfdfdf] border-zinc-500'
          : isLight ? 'bg-zinc-50 border-zinc-200'
          : 'bg-[#0e0f12] border-[#1c1d22]'
        }`}>
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsDetailedPreviewOpen(false);
              setTempImportedClients([]);
              setPreviewSearchTerm('');
              setPreviewPage(1);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
              : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
              : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
            }`}
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={tempImportedClients.length === 0}
            onClick={handleApplyImport}
            className={`px-5 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 ${
              tempImportedClients.length > 0
                ? isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 cursor-pointer'
                  : isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg'
                : isRetro ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-400'
                  : isLight ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" /> CONFIRMAR E IMPORTAR ({tempImportedClients.length} CLIENTES)
          </button>
        </div>
      </div>

      {isDetailedPreviewOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
          <div className={`rounded-lg max-w-6xl w-full overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh] ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
            : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
            : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro ? 'bg-[#000080] border-[#808080] text-white'
              : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-[#0e0f12] border-[#1c1d22] text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Search className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-amber-500'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                  🔍 Previsualización Detallada de Importación ({tempImportedClients.length} Clientes)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider font-mono ${
                  importReplaceMode
                    ? 'bg-rose-950/30 text-rose-450 border-rose-900/50'
                    : 'bg-emerald-950/30 text-emerald-450 border-emerald-900/50'
                }`}>
                  Modo: {importReplaceMode ? 'Reemplazar todo' : 'Adicionar al directorio'}
                </span>
                <button
                  onClick={() => setIsDetailedPreviewOpen(false)}
                  className={`p-1 rounded-full cursor-pointer ${
                    isRetro ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                    : isLight ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 border border-zinc-300'
                    : 'text-gray-400 hover:text-white bg-zinc-900 border border-[#2d2f36]'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`p-6 space-y-4 overflow-y-auto flex-1 text-left ${
              isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-white' : 'bg-[#121316]'
            }`}>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por nombre o número en la lista..."
                    value={previewSearchTerm}
                    onChange={(e) => setPreviewSearchTerm(e.target.value)}
                    className={searchInputClass}
                  />
                  {previewSearchTerm && (
                    <button
                      onClick={() => setPreviewSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className={`text-xs px-3 py-1.5 border rounded-lg font-mono flex items-center gap-2 ${
                  isRetro ? 'bg-blue-50 border-[#000080] text-[#000080]'
                  : isLight ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-purple-950/20 border-purple-500/30 text-purple-400'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Filtro: <strong>{filteredPreviewClients.length}</strong> de <strong>{tempImportedClients.length}</strong>
                  </span>
                </div>
              </div>

              <div className={`border rounded-xl overflow-hidden shadow-sm ${
                isRetro ? 'border-zinc-400 bg-white'
                : isLight ? 'border-zinc-200 bg-white'
                : 'border-zinc-800 bg-[#17181d]'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b font-extrabold uppercase ${
                        isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Teléfono</th>
                        <th className="p-3">Lada</th>
                        <th className="p-3">Correo</th>
                        <th className="p-3">Fecha Registro</th>
                        <th className="p-3">Límite Crédito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {paginatedPreviewClients.map((c, idx) => (
                        <tr key={idx} className={isLight ? 'hover:bg-zinc-55' : 'hover:bg-zinc-900/50'}>
                          <td className="p-3 font-bold">{c.name}</td>
                          <td className="p-3 font-mono">{formatPhoneNumber(c.phone)}</td>
                          <td className="p-3 font-mono text-zinc-500">{c.countryCode || '52'}</td>
                          <td className="p-3 text-zinc-500">{c.email}</td>
                          <td className="p-3 text-zinc-500">{c.registeredAt}</td>
                          <td className="p-3 font-mono text-emerald-500">
                            {c.creditLimit !== undefined ? `${config.currencySymbol}${c.creditLimit.toFixed(2)}` : 'N/D'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPreviewPages > 1 && (
                <div className="flex items-center justify-between pt-2 shrink-0 select-none">
                  <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Página {previewPage} de {totalPreviewPages} ({filteredPreviewClients.length} cl.)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer select-none transition-colors ${
                        previewPage === 1
                          ? isLight ? 'text-zinc-300 border-zinc-200 bg-zinc-50 cursor-not-allowed' : 'text-zinc-700 border-zinc-800 bg-[#121316] cursor-not-allowed'
                          : isLight ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-[#181a1f] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                      disabled={previewPage === totalPreviewPages}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer select-none transition-colors ${
                        previewPage === totalPreviewPages
                          ? isLight ? 'text-zinc-300 border-zinc-200 bg-zinc-50 cursor-not-allowed' : 'text-zinc-700 border-zinc-800 bg-[#121316] cursor-not-allowed'
                          : isLight ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-[#181a1f] border-[#2d2f36] text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex justify-end gap-2 shrink-0 ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-500'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#0e0f12] border-[#1c1d22]'
            }`}>
              <button
                type="button"
                onClick={() => setIsDetailedPreviewOpen(false)}
                className={`px-5 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                  : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
                }`}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface ClientesViewProps {
  clients: Client[];
  setOrderFilter: (search: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedOrderId: (id: string | null) => void;
  orders: RepairOrder[];
  config: WorkshopConfig;
  sales?: Sale[];
  onDeleteClient?: (phone: string, deleteOrders: boolean) => void;
  onEditClient?: (oldPhone: string, newName: string, newPhone: string, creditLimit?: number) => void;
  onSetClients?: (clients: Client[]) => void;
}
export function ClientesView({ clients, setOrderFilter, setActiveTab, setSelectedOrderId, orders, config, sales = [], onDeleteClient, onEditClient, onSetClients }: ClientesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCountryCode, setNewClientCountryCode] = useState(config.phoneCountryCode || '+52');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCreditLimit, setNewClientCreditLimit] = useState('');
  const [showImportClientsModal, setShowImportClientsModal] = useState(false);

  const [waConnected, setWaConnected] = useState<boolean>(() => {
    return (window as any).whatsappConnected || false;
  });

  useEffect(() => {
    const handleStatus = (e: Event) => {
      setWaConnected((e as CustomEvent).detail);
    };
    window.addEventListener('whatsapp-status-update', handleStatus);
    
    // Also check status right away
    const api = (window as any).electronAPI;
    if (api && api.whatsappGetStatus) {
      api.whatsappGetStatus().then((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      }).catch(() => {});
    }

    let unsubscribe: (() => void) | undefined;
    if (api && api.onWhatsappStatusChange) {
      unsubscribe = api.onWhatsappStatusChange((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      });
    }

    return () => {
      window.removeEventListener('whatsapp-status-update', handleStatus);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const isWaIntegratedOffline = !waConnected;
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [showBulkPromoModal, setShowBulkPromoModal] = useState(false);
  const [promoMessage, setPromoMessage] = useState(DEFAULT_PROMO_TEMPLATE);
  const [selectedClientIds, setSelectedClientIds] = useState<Record<string, boolean>>({});
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [promoFilterType, setPromoFilterType] = useState<'all' | 'debt' | 'active'>('all');
  const [activeTemplateType, setActiveTemplateType] = useState<'promo' | 'cobro' | 'estatus' | 'custom'>('promo');
  const [isSendingPromos, setIsSendingPromos] = useState(false);
  const [sendingCurrentIndex, setSendingCurrentIndex] = useState(0);
  const [sendingTotal, setSendingTotal] = useState(0);
  const [sendingLogs, setSendingLogs] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const sendingCancelRef = useRef(false);
  const promoTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertTagAtCursor = (tag: string) => {
    const textarea = promoTextAreaRef.current;
    if (!textarea) {
      setPromoMessage(prev => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + tag + after;
    setPromoMessage(newValue);
    
    // Restore focus and position cursor right after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map(c => {
      const orderCount = orders.filter(o =>
        o.customerPhone === c.phone ||
        o.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
      ).length;
      const { totalGastado, saldoPendiente } = getClientStats(c);
      return {
        'ID Cliente': c.id,
        'Nombre': c.name,
        'Teléfono': c.phone,
        'Código País': c.countryCode || '52',
        'Correo Electrónico': c.email || '',
        'Total Órdenes': orderCount,
        'Total Gastado': totalGastado,
        'Saldo Pendiente': saldoPendiente,
        'Fecha Registro': c.registeredAt
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `Clientes_Exportados_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('✅ Clientes exportados a Excel correctamente', 'ok');
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      showToast('⚠️ Nombre y teléfono son obligatorios');
      return;
    }
    const cleanPhone = newClientPhone.replace(/\D/g, '').trim();
    if (clients.some(c => c.phone === cleanPhone)) {
      showToast('⚠️ Ya existe un cliente con ese número de teléfono');
      return;
    }
    const nextIdNum = clients.length + 1;
    const newClient: Client = {
      id: `C${nextIdNum}`,
      name: newClientName.toUpperCase().trim(),
      phone: cleanPhone,
      countryCode: (newClientCountryCode || config.phoneCountryCode || '+52').replace('+', ''),
      email: `${newClientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      totalOrders: 0,
      registeredAt: new Date().toISOString().split('T')[0],
      creditLimit: newClientCreditLimit ? Number(newClientCreditLimit) : undefined
    };
    if (onSetClients) {
      onSetClients([...clients, newClient]);
    }
    setShowAddClientModal(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientCreditLimit('');
    showToast('✅ Cliente agregado con éxito', 'ok');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rows || rows.length === 0) {
          showToast('⚠️ El archivo Excel está vacío o no tiene formato válido.');
          return;
        }

        const keys = Object.keys(rows[0]);
        const nameKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('nombre') || l.includes('name') || l.includes('cliente');
        });
        const phoneKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('telefono') || l.includes('teléfono') || l.includes('phone') || l.includes('celular') || l.includes('movil') || l.includes('móvil');
        });
        const countryCodeKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('pais') || l.includes('país') || l.includes('country') || l.includes('codigo') || l.includes('código');
        });
        const emailKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('correo') || l.includes('email') || l.includes('mail');
        });
        const registeredAtKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('fecha') || l.includes('registro') || l.includes('creado') || l.includes('registered') || l.includes('date');
        });

        if (!nameKey || !phoneKey) {
          showToast('⚠️ Columnas requeridas no encontradas. Asegúrese de tener columnas "Nombre" y "Teléfono".');
          return;
        }

        let importedCount = 0;
        let updatedCount = 0;

        const updatedClients = [...clients];

        rows.forEach((row) => {
          const name = String(row[nameKey] || '').trim();
          let phone = String(row[phoneKey] || '').replace(/\D/g, '').trim();
          if (!name || !phone) return;

          const countryCode = countryCodeKey ? String(row[countryCodeKey] || '').replace(/\D/g, '').trim() : '52';
          const email = emailKey ? String(row[emailKey] || '').trim() : `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
          
          let registeredAt = new Date().toISOString().split('T')[0];
          if (registeredAtKey && row[registeredAtKey]) {
            try {
              let cellValue = row[registeredAtKey];
              if (typeof cellValue === 'number') {
                const dateObj = new Date((cellValue - 25569) * 86400 * 1000);
                if (!isNaN(dateObj.getTime())) {
                  registeredAt = dateObj.toISOString().split('T')[0];
                }
              } else {
                const parsedDate = new Date(cellValue);
                if (!isNaN(parsedDate.getTime())) {
                  registeredAt = parsedDate.toISOString().split('T')[0];
                }
              }
            } catch (e) {}
          }

          const existingIdx = updatedClients.findIndex(c => c.phone === phone);
          if (existingIdx !== -1) {
            updatedClients[existingIdx] = {
              ...updatedClients[existingIdx],
              name: name,
              countryCode: countryCode || updatedClients[existingIdx].countryCode,
              email: email || updatedClients[existingIdx].email,
              registeredAt: registeredAt || updatedClients[existingIdx].registeredAt
            };
            updatedCount++;
          } else {
            const nextIdNum = updatedClients.length + 1;
            const newClient: Client = {
              id: `C${nextIdNum}`,
              name,
              phone,
              countryCode,
              email,
              totalOrders: 0,
              registeredAt
            };
            updatedClients.push(newClient);
            importedCount++;
          }
        });

        if (onSetClients) {
          onSetClients(updatedClients);
        }

        showToast(`✅ Importación finalizada: ${importedCount} creados, ${updatedCount} actualizados.`, 'ok');
      } catch (err) {
        showToast('⚠️ Error al leer el archivo Excel.');
        console.error(err);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const [verifiedNumbers, setVerifiedNumbers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fixmanager_wa_verified_numbers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fixmanager_wa_verified_numbers', JSON.stringify(verifiedNumbers));
    } catch (e) {}
  }, [verifiedNumbers]);

  const getFormattedPhone = (phone: string, countryCode?: string) => {
    const cc = countryCode ? countryCode.replace(/\D/g, '') : '52';
    return formatPhoneForWhatsapp(phone, cc);
  };

  useEffect(() => {
    if (!waConnected) return;

    const api = (window as any).electronAPI;
    if (!api || !api.whatsappCheckNumber) return;

    // Collect all phone numbers and country codes from the clients that are NOT in verifiedNumbers yet
    const pendingItems = clients
      .map(c => ({ phone: c.phone, cc: c.countryCode }))
      .filter(item => item.phone && item.phone.trim() !== '');

    // Map to formatted phone numbers and deduplicate
    const pendingFormatted = Array.from(
      new Set(
        pendingItems.map(item => getFormattedPhone(item.phone, item.cc))
      )
    ).filter(formatted => verifiedNumbers[formatted] === undefined);

    if (pendingFormatted.length === 0) return;

    let active = true;
    const processQueue = async () => {
      for (const formatted of pendingFormatted) {
        if (!active || !waConnected) break;
        try {
          const res = await api.whatsappCheckNumber(formatted);
          if (res && res.success) {
            setVerifiedNumbers(prev => ({
              ...prev,
              [formatted]: res.exists
            }));
          }
        } catch (e) {
          console.error('[WhatsApp Check Hook Clientes] Error checking phone:', formatted, e);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };

    processQueue();

    return () => {
      active = false;
    };
  }, [clients, waConnected, verifiedNumbers]);

  const handleToggleSelectAll = (checked: boolean) => {
    const nextSelected: Record<string, boolean> = {};
    if (checked) {
      promoFilteredClients.forEach(c => {
        if (c.phone) {
          nextSelected[c.id] = true;
        }
      });
    }
    setSelectedClientIds(nextSelected);
  };

  const handleToggleSelectClient = (clientId: string, checked: boolean) => {
    setSelectedClientIds(prev => ({
      ...prev,
      [clientId]: checked
    }));
  };

  const handleStartSending = async () => {
    const mode = config.whatsappMode || 'disabled';
    if (mode === 'integrated' && isWaIntegratedOffline) {
      showToast('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat.');
      return;
    }

    const selectedClients = clients.filter(c => selectedClientIds[c.id] && c.phone);
    if (selectedClients.length === 0) {
      showToast('⚠️ Selecciona al menos un cliente con número de teléfono');
      return;
    }
    if (!promoMessage.trim()) {
      showToast('⚠️ Escribe un mensaje de promoción');
      return;
    }

    setIsSendingPromos(true);
    setSendingCurrentIndex(0);
    setSendingTotal(selectedClients.length);
    sendingCancelRef.current = false;

    const initialLogs: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    selectedClients.forEach(c => {
      initialLogs[c.id] = 'pending';
    });
    setSendingLogs(initialLogs);

    const api = (window as any).electronAPI;

    for (let i = 0; i < selectedClients.length; i++) {
      if (sendingCancelRef.current) {
        showToast('⚠️ Envío de promociones cancelado');
        break;
      }

      const client = selectedClients[i];
      setSendingCurrentIndex(i);
      setSendingLogs(prev => ({ ...prev, [client.id]: 'sending' }));

      // Auto scroll to active client row
      setTimeout(() => {
        const el = document.getElementById(`promo-row-${client.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);

      // Personalize message
      const personalizedMsg = buildPersonalizedPromoMessage(promoMessage, client);

      const cc = client.countryCode || config.whatsappDefaultCountryCode || '52';
      const formattedPhone = formatPhoneForWhatsapp(client.phone, cc);

      let success = false;
      try {
        if (mode === 'integrated' && api?.whatsappSendMessage) {
          const res = await api.whatsappSendMessage(formattedPhone, personalizedMsg);
          success = !!res?.success;
        } else {
          // Fallback to direct opening
          const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedMsg)}`;
          if (api?.openExternal) api.openExternal(waUrl);
          else window.open(waUrl, '_blank');
          success = true;
        }
      } catch (e) {
        console.error('[Mass Send] Error sending to', client.phone, e);
        success = false;
      }

      setSendingLogs(prev => ({ ...prev, [client.id]: success ? 'success' : 'error' }));

      // Delay between sends (except for the last one)
      if (i < selectedClients.length - 1) {
        const randomSeconds = Math.floor(Math.random() * (18 - 8 + 1)) + 8;
        let elapsed = 0;
        while (elapsed < randomSeconds) {
          if (sendingCancelRef.current) break;
          setCountdownSeconds(randomSeconds - elapsed);
          await new Promise(resolve => setTimeout(resolve, 1000));
          elapsed++;
        }
        setCountdownSeconds(null);
      }
    }

    setSendingCurrentIndex(selectedClients.length);
    setIsSendingPromos(false);
    if (!sendingCancelRef.current) {
      showToast('🎉 ¡Envío de promociones masivas finalizado!', 'ok');
    }
  };

  const handleCancelSending = () => {
    sendingCancelRef.current = true;
    setIsSendingPromos(false);
  };

  const handlePhoneClick = async (phone: string, countryCode?: string) => {
    if (!phone) return;
    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 19) {
      greeting = 'Buenas tardes';
    } else if (hour >= 19 || hour < 5) {
      greeting = 'Buenas noches';
    }
    const storeName = config.storeName || '';
    const businessPart = storeName ? ` de ${storeName}` : '';
    const defaultText = `${greeting}, me comunico${businessPart}. `;

    openWhatsappChat(phone, defaultText, countryCode || config.whatsappDefaultCountryCode || '52');
  };

  const renderClickablePhone = (phone: string, countryCode?: string, textStyle: string = '') => {
    if (!phone) return '—';
    const formatted = getFormattedPhone(phone, countryCode);
    const isVerified = verifiedNumbers[formatted];
    const formattedDisplay = formatPhoneNumber(phone);

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          handlePhoneClick(phone, countryCode);
        }}
        title={isVerified ? "WhatsApp verificado - Clic para abrir chat" : "Clic para abrir chat de WhatsApp"}
        className={`cursor-pointer transition-all hover:underline ${
          isVerified 
            ? (isRetro 
                ? 'text-[#000080] font-black' 
                : isLight 
                ? 'text-emerald-700 hover:text-emerald-800 font-bold' 
                : 'text-emerald-400 hover:text-emerald-300 font-mono font-bold')
            : (isRetro
                ? 'text-[#000080]/80 font-bold'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 font-medium'
                : 'text-slate-300 hover:text-white font-medium')
        } ${textStyle}`}
      >
        {formattedDisplay}
      </span>
    );
  };

  const filtered = clients.filter(c => {
    if (!searchTerm.trim()) return true;
    const cleanSearch = searchTerm.toLowerCase().trim();
    const searchDigits = searchTerm.replace(/\D/g, '');
    const clientPhoneDigits = (c.phone || '').replace(/\D/g, '');
    const clientNameNorm = normalizeText(c.name || '');
    const searchNorm = normalizeText(searchTerm);

    const matchesName = clientNameNorm.includes(searchNorm) || (c.name || '').toLowerCase().includes(cleanSearch);
    const matchesLiteralPhone = (c.phone || '').toLowerCase().includes(cleanSearch);
    let normClientDigits = clientPhoneDigits;
    if (normClientDigits.length === 12 && normClientDigits.startsWith('52')) normClientDigits = normClientDigits.slice(2);
    else if (normClientDigits.length === 13 && normClientDigits.startsWith('521')) normClientDigits = normClientDigits.slice(3);
    else if (normClientDigits.length > 10) normClientDigits = normClientDigits.slice(-10);

    const matchesDigitsPhone = searchDigits.length > 0 && (
      clientPhoneDigits.includes(searchDigits) || 
      normClientDigits.includes(searchDigits)
    );
    const matchesEmail = (c.email || '').toLowerCase().includes(cleanSearch);
    const matchesId = (c.id || '').toLowerCase().includes(cleanSearch);

    return matchesName || matchesLiteralPhone || matchesDigitsPhone || matchesEmail || matchesId;
  });

  const [clientOrdersModal, setClientOrdersModal] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');

  // Calcula historial de pagos por cliente
  const getClientStats = (c: Client) => {
    const sym = config.currencySymbol || '$';
    const clientOrders = orders.filter(o =>
      o.customerPhone === c.phone ||
      o.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
    );
    const totalGastado = clientOrders
      .filter(o => o.status === 'Entregado y Pagado')
      .reduce((s, o) => s + o.cost, 0);
    const saldoPendiente = clientOrders
      .filter(o => !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status))
      .reduce((s, o) => s + Math.max(0, o.cost - o.advancePayment), 0);
    const ordenesActivas = clientOrders.filter(o =>
      !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status)
    ).length;
    return { totalGastado, saldoPendiente, ordenesActivas, sym };
  };

  const buildPersonalizedPromoMessage = (rawText: string, client: Client): string => {
    const { saldoPendiente, ordenesActivas, sym } = getClientStats(client);

    const storeAddressParts = [
      config.addressStreet,
      config.addressNumber,
      config.addressColonia,
      config.addressCity,
      config.addressState,
      config.addressZip,
      config.addressCountry
    ].map(p => p?.trim()).filter(Boolean);
    const storeAddress = storeAddressParts.length > 0 ? storeAddressParts.join(', ') : (config.address || '');

    let msgText = rawText;

    if (!config.socialFacebook) {
      msgText = msgText.replace(/.*Facebook:.*{facebook}.*\n?/gi, '');
    }
    if (!config.socialInstagram) {
      msgText = msgText.replace(/.*Instagram:.*{instagram}.*\n?/gi, '');
    }
    if (!config.socialTiktok) {
      msgText = msgText.replace(/.*TikTok:.*{tiktok}.*\n?/gi, '');
    }
    if (!config.socialFacebook && !config.socialInstagram && !config.socialTiktok) {
      msgText = msgText.replace(/🌐 \*Nuestras Redes Sociales:\*\n?/gi, '');
    }

    return msgText
      .replace(/{nombre}/gi, client.name)
      .replace(/{taller}/gi, config.storeName || 'nuestro taller')
      .replace(/{saldo_pendiente}/gi, `${sym}${saldoPendiente.toFixed(2)}`)
      .replace(/{ordenes_activas}/gi, String(ordenesActivas))
      .replace(/{direccion}/gi, storeAddress)
      .replace(/{maps_link}/gi, config.googleMapsLink || '')
      .replace(/{facebook}/gi, formatSocialLinkForPromo('facebook', config.socialFacebook))
      .replace(/{instagram}/gi, formatSocialLinkForPromo('instagram', config.socialInstagram))
      .replace(/{tiktok}/gi, formatSocialLinkForPromo('tiktok', config.socialTiktok))
      .replace(/{telefono_taller}/gi, config.phone || '')
      .replace(/{whatsapp}/gi, (() => {
        const waPhone = (config.phone2 || config.phone || '').replace(/\D/g, '');
        const cc = config.whatsappDefaultCountryCode || '52';
        return waPhone ? `https://wa.me/${cc}${waPhone}` : '';
      })())
      .replace(/{horarios}/gi, formatBusinessHoursForPromo(config.businessHours));
  };

  const promoFilteredClients = React.useMemo(() => {
    return clients.filter(c => {
      if (!c.phone) return false;
      
      if (promoSearchQuery.trim()) {
        const cleanSearch = promoSearchQuery.toLowerCase().trim();
        const searchDigits = promoSearchQuery.replace(/\D/g, '');
        const clientPhoneDigits = (c.phone || '').replace(/\D/g, '');
        const clientNameNorm = normalizeText(c.name || '');
        const searchNorm = normalizeText(promoSearchQuery);

        const matchesName = clientNameNorm.includes(searchNorm) || (c.name || '').toLowerCase().includes(cleanSearch);
        const matchesLiteralPhone = (c.phone || '').toLowerCase().includes(cleanSearch);
        const matchesDigitsPhone = searchDigits.length > 0 && clientPhoneDigits.includes(searchDigits);

        if (!matchesName && !matchesLiteralPhone && !matchesDigitsPhone) return false;
      }
      
      if (promoFilterType === 'debt') {
        const { saldoPendiente } = getClientStats(c);
        if (saldoPendiente <= 0) return false;
      } else if (promoFilterType === 'active') {
        const { ordenesActivas } = getClientStats(c);
        if (ordenesActivas <= 0) return false;
      }
      
      return true;
    });
  }, [clients, promoSearchQuery, promoFilterType]);

  const clientOrdersForModal = clientOrdersModal
    ? orders.filter(o => {
        const clientPhoneDigits = (clientOrdersModal.phone || '').replace(/\D/g, '');
        const orderPhoneDigits = (o.customerPhone || '').replace(/\D/g, '');
        const matchesDigits = clientPhoneDigits.length >= 7 && orderPhoneDigits.length >= 7 && (
          clientPhoneDigits.includes(orderPhoneDigits) || orderPhoneDigits.includes(clientPhoneDigits)
        );
        const matchesPhone = o.customerPhone === clientOrdersModal.phone || matchesDigits;
        const matchesName = normalizeText(o.customerName || '') === normalizeText(clientOrdersModal.name || '');
        return matchesPhone || matchesName;
      })
    : [];

  const filterClientOrdersByClick = (clientName: string) => {
    setOrderFilter(clientName);
    setActiveTab('Órdenes');
  };

  // Get repair history for the selected client
  const clientHistory = selectedClientForHistory
    ? orders.filter(o => {
        const clientPhoneDigits = (selectedClientForHistory.phone || '').replace(/\D/g, '');
        const orderPhoneDigits = (o.customerPhone || '').replace(/\D/g, '');
        const matchesDigits = clientPhoneDigits.length >= 7 && orderPhoneDigits.length >= 7 && (
          clientPhoneDigits.includes(orderPhoneDigits) || orderPhoneDigits.includes(clientPhoneDigits)
        );
        const matchesPhone = o.customerPhone === selectedClientForHistory.phone || matchesDigits;
        const matchesName = normalizeText(o.customerName || '') === normalizeText(selectedClientForHistory.name || '');
        return matchesPhone || matchesName;
      })
    : [];

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
      <div className={`flex justify-between items-center border-b pb-4 gap-3 flex-wrap ${
        isRetro ? 'border-b-[#808080]' : isLight ? 'border-b-zinc-200' : 'border-b-[#1c1d22]'
      }`}>
        <h3 className={`text-sm font-black tracking-wider flex items-center gap-2 ${
          isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-600' : 'text-purple-400 font-display'
        }`}>
          <Users className="w-5 h-5" /> EXPEDIENTE DIGITAL DE CLIENTES
        </h3>
        <div className="flex items-center gap-2 flex-wrap select-none">
          <button
            type="button"
            onClick={() => {
              setNewClientName('');
              setNewClientPhone('');
              setNewClientCreditLimit('');
              setShowAddClientModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
              : isLight ? 'bg-purple-700 hover:bg-purple-650 text-white rounded-lg font-bold'
              : 'bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300 hover:text-white rounded-lg'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Nuevo Cliente
          </button>
          <button
            type="button"
            onClick={() => setShowImportClientsModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
              : isLight ? 'bg-purple-700 hover:bg-purple-650 text-white rounded-lg font-bold'
              : 'bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300 hover:text-white rounded-lg'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Importar Excel
          </button>
          {config.whatsappMode && config.whatsappMode !== 'disabled' && (
            <button
              type="button"
              onClick={() => {
                if (isWaIntegratedOffline) {
                  window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.');
                } else {
                  setSelectedClientIds({});
                  setSendingLogs({});
                  setPromoMessage(DEFAULT_PROMO_TEMPLATE);
                  setPromoFilterType('all');
                  setActiveTemplateType('promo');
                  setShowBulkPromoModal(true);
                }
              }}
              style={isWaIntegratedOffline ? { backgroundColor: '#71717a', borderColor: '#52525b' } : undefined}
              title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase transition-all select-none active:scale-95 cursor-pointer text-white border ${
                isWaIntegratedOffline 
                  ? 'bg-zinc-500 hover:bg-zinc-550 border-zinc-600 grayscale' 
                  : (isRetro ? 'bg-[#25D366] border-2 border-t-[#a3f3b9] border-l-[#a3f3b9] border-b-[#0b7d34] border-r-[#0b7d34] shadow-none rounded-none text-white'
                    : 'bg-[#25D366] hover:bg-[#128C7E] rounded-lg shadow-sm hover:shadow-md border-[#25D366] text-white')
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-white" />
              <span className="text-white">Enviar Promociones</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportExcel}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
              : isLight ? 'bg-orange-700 hover:bg-orange-655 text-white rounded-lg font-bold'
              : 'bg-orange-900/40 hover:bg-orange-900/60 border border-orange-800 text-orange-300 hover:text-white rounded-lg'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => {
              if (clients.length === 0) { showToast('⚠️ No hay clientes registrados para imprimir'); return; }
              const sym = config.currencySymbol || '$';
              const thead = `<thead><tr><th>ID</th><th>Nombre</th><th>Teléfono</th><th>Registrado</th><th style="text-align:right">Órdenes</th></tr></thead>`;
              const tbody = `<tbody>${clients.map(c => {
                const orderCount = orders.filter(o =>
                  o.customerPhone === c.phone ||
                  o.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
                ).length;
                return `<tr>
                  <td style="font-family:monospace">${c.id}</td>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.phone}</td>
                  <td>${c.registeredAt ? formatDateToDMY(c.registeredAt) : '—'}</td>
                  <td>${orderCount}</td>
                </tr>`;
              }).join('')}</tbody>`;
              const totalOrders = orders.length;
              const summary = `
                <div class="summary-item"><label>Total clientes</label><span>${clients.length}</span></div>
                <div class="summary-item"><label>Total órdenes</label><span>${totalOrders}</span></div>
              `;
              const html = buildA4ReportHtml('Directorio de Clientes', `${clients.length} cliente(s) registrados · Filtro: "${searchTerm || 'ninguno'}"`, config.storeName || 'TALLER', thead + tbody, summary);
              printA4Report(html, config.reportPrinterName);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase transition-all select-none active:scale-95 cursor-pointer ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
              : isLight ? 'bg-zinc-750 hover:bg-zinc-700 text-white rounded-lg font-bold'
              : 'bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Todos los Clientes
          </button>
        </div>
      </div>

      <div className={`p-4 rounded border ${
        isRetro 
          ? 'bg-[#dfdfdf] border-[#808080] space-y-3' 
          : isLight 
            ? 'bg-white border-zinc-200/60 p-5 rounded-2xl shadow-xs space-y-4' 
            : 'bg-[#121316] border-[#1b1c21] p-4 rounded space-y-3'
      }`}>
        <div className="premium-search-container max-w-xs w-full select-none flex items-center">
          <div className="flex items-center text-zinc-400 shrink-0">
            <Search className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
          <div className="relative flex-1 flex items-center h-full">
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nombre o número telefónico..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="premium-search-input"
              style={{ color: isRetro ? 'black' : isLight ? 'black' : 'white' }}
            />
          </div>
        </div>

        <div className={`hidden lg:block overflow-x-auto rounded border ${
          isRetro ? 'border-[#808080]' : 'border-zinc-900'
        }`}>
          <table className={`w-full text-left text-xs ${
            isRetro ? 'bg-white text-black' : isLight ? 'bg-white text-zinc-800' : 'bg-[#0b0c0e]'
          }`}>
            <thead className={`${
              isRetro 
                ? 'bg-[#cbd6e2] text-black font-bold border-b border-[#808080]' 
                : isLight 
                  ? 'bg-zinc-100 text-zinc-600 border-b border-zinc-200' 
                  : 'bg-[#101114] text-zinc-400 font-mono border-b border-zinc-900'
            } text-[10px]`}>
              <tr>
                <th className="p-3 pl-4">ID Registro</th>
                <th className="p-3">Nombre del Cliente</th>
                <th className="p-3">Datos de Contacto</th>
                <th className="p-3 text-center">Órdenes</th>
                <th className="p-3 text-center">Total Gastado</th>
                <th className="p-3 text-center">Saldo Pendiente</th>
                <th className="p-3 text-center">Límite Crédito</th>
                <th className="p-3 text-center">Registrado En</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isRetro ? 'divide-[#cbd6e2]' : isLight ? 'divide-zinc-200' : 'divide-zinc-700/50'
            }`}>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setClientOrdersModal(c)} className={`cursor-pointer transition-all ${isRetro ? 'hover:bg-zinc-100' : isLight ? 'hover:bg-zinc-50' : 'hover:bg-[#16171d]/50'}`}>
                  <td className="p-3 pl-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded font-mono text-[10.5px] font-bold ${
                      isRetro 
                        ? 'bg-[#cbd6e2] border border-[#808080] text-black' 
                        : isLight 
                          ? 'bg-zinc-100 border border-zinc-200 text-zinc-700' 
                          : 'bg-black/60 border border-zinc-800/80 text-zinc-400'
                    }`}>
                      👤 {c.id}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center border shadow-sm uppercase shrink-0 ${
                        isRetro 
                          ? 'bg-[#000080]/15 text-[#000080] border-[#000080]/30' 
                          : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      }`}>
                        {c.name.substring(0,2)}
                      </div>
                      <span className={`font-sans font-black text-[12.5px] tracking-wide block uppercase ${
                        isRetro ? 'text-black' : isLight ? 'text-zinc-900' : 'text-white'
                      }`}>
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-0.5">
                      <p className={`font-mono font-bold text-[11.5px] tracking-wide ${
                        isRetro ? 'text-black' : isLight ? 'text-zinc-800' : 'text-zinc-200'
                      }`}>{renderClickablePhone(c.phone, c.countryCode)}</p>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 font-black font-mono text-[12.5px] rounded-md border ${
                      isRetro 
                        ? 'bg-[#cbd6e2] border-[#808080] text-black' 
                        : isLight 
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-800' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-inner'
                    }`}>
                      {c.totalOrders}
                      {(() => {
                        const { ordenesActivas } = getClientStats(c);
                        return ordenesActivas > 0 ? <span className="ml-1.5 text-[8.5px] font-black text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.2 rounded">({ordenesActivas} activa{ordenesActivas > 1 ? 's' : ''})</span> : null;
                      })()}
                    </span>
                  </td>
                  {/* Total gastado */}
                  <td className="p-3 text-center">
                    {(() => {
                      const { totalGastado, sym } = getClientStats(c);
                      return <span className={`font-black font-mono text-[11px] ${totalGastado > 0 ? 'text-emerald-500' : isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{sym}{totalGastado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                    })()}
                  </td>
                  {/* Saldo pendiente */}
                  <td className="p-3 text-center">
                    {(() => {
                      const { saldoPendiente, sym } = getClientStats(c);
                      return saldoPendiente > 0
                        ? <span className="font-black font-mono text-[11px] text-rose-500">{sym}{saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        : <span className={`text-[10px] font-bold ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>—</span>;
                    })()}
                  </td>
                  {/* Límite Crédito */}
                  <td className="p-3 text-center">
                    {(() => {
                      const sym = config.currencySymbol || '$';
                      const limit = c.creditLimit !== undefined ? c.creditLimit : (config.defaultCreditLimit ?? 1000);
                      return <span className={`font-black font-mono text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{sym}{limit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                    })()}
                  </td>
                  <td className={`p-3 text-center font-mono text-[10.5px] ${isRetro ? 'text-[#000080]/85' : 'text-zinc-500'}`}>
                    {formatDateToDMY(c.registeredAt)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditName(c.name);
                          setEditPhone(c.phone);
                          setEditCreditLimit(c.creditLimit !== undefined ? String(c.creditLimit) : '');
                          setClientToEdit(c);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setClientToDelete(c);
                        }}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Responsive Cards for Clients (Mobile/Tablets) - No Horizontal Scrollbar */}
        <div className="lg:hidden space-y-3 mt-4">
          {filtered.length === 0 ? (
            <div className={`p-8 text-center text-xs font-mono rounded ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-zinc-400 text-zinc-900' : isLight ? 'bg-white border border-zinc-200 text-zinc-500' : 'bg-[#0f1115] border border-[#1b1c21] text-gray-400'
            }`}>
              No se encontraron clientes registrados con este filtro
            </div>
          ) : (
            filtered.map(c => {
              // Compute initials
              const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              
              return (
                <div
                  key={c.id}
                  onClick={() => setClientOrdersModal(c)}
                  className={`transition-all border cursor-pointer ${
                    isRetro
                      ? 'border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white font-sans text-zinc-900 hover:bg-zinc-50'
                      : isLight
                        ? 'border-zinc-200 rounded-xl bg-white shadow-sm p-4 text-zinc-950 hover:shadow-md'
                        : 'border-[#1b1c21] rounded-xl bg-[#0a0b0d] p-4 text-gray-200 hover:border-zinc-600'
                  } space-y-3`}
                >
                  {/* Top line ID and initials badge */}
                  <div className="flex justify-between items-center gap-2 border-b border-zinc-500/10 pb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                      isRetro 
                        ? 'bg-[#cbd6e2] border border-[#808080] text-black' 
                        : isLight 
                          ? 'bg-zinc-150 border border-zinc-200 text-zinc-700 font-extrabold' 
                          : 'bg-black/60 border border-zinc-600 text-zinc-400'
                    }`}>
                      👤 {c.id}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-zinc-400">
                        Unido: {formatDateToDMY(c.registeredAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditName(c.name);
                          setEditPhone(c.phone);
                          setEditCreditLimit(c.creditLimit !== undefined ? String(c.creditLimit) : '');
                          setClientToEdit(c);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                        title="Editar cliente"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setClientToDelete(c);
                        }}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Profile info & contact */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center border shadow-sm uppercase shrink-0 ${
                      isRetro 
                        ? 'bg-[#000080] text-white border-white/20' 
                        : isLight 
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-600' 
                          : 'bg-zinc-800/80 border-zinc-700 text-amber-500'
                    }`}>
                      {initials || 'C'}
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className={`font-black text-sm uppercase ${
                        isRetro ? 'text-black font-extrabold' : isLight ? 'text-zinc-900 font-extrabold' : 'text-white'
                      }`}>{c.name}</p>
                      
                      <p className={`font-mono font-bold ${
                        isRetro ? 'text-black' : isLight ? 'text-zinc-800 font-semibold' : 'text-zinc-300'
                      }`}>{renderClickablePhone(c.phone, c.countryCode)}</p>
                    </div>
                  </div>

                  {/* Stats & counters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-500/10 flex flex-col justify-center items-center">
                      <span className="text-zinc-400 text-[9px] font-mono mb-1">Órdenes</span>
                      <span className={`px-1.5 py-0.5 font-black font-mono text-[11px] rounded border ${
                        isRetro ? 'bg-[#cbd6e2] border-[#808080] text-black' : isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-650' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}>{c.totalOrders}</span>
                    </div>

                    <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-500/10 flex flex-col justify-center items-center">
                      <span className="text-zinc-400 text-[9px] font-mono mb-1">Gastado</span>
                      {(() => {
                        const { totalGastado, sym } = getClientStats(c);
                        return <span className={`font-black font-mono text-[11px] ${totalGastado > 0 ? 'text-emerald-500' : isLight ? 'text-zinc-400' : 'text-zinc-650'}`}>{sym}{totalGastado.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>;
                      })()}
                    </div>

                    <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-500/10 flex flex-col justify-center items-center">
                      <span className="text-zinc-400 text-[9px] font-mono mb-1">Saldo / Límite</span>
                      {(() => {
                        const { saldoPendiente, sym } = getClientStats(c);
                        const limit = c.creditLimit !== undefined ? c.creditLimit : (config.defaultCreditLimit ?? 1000);
                        return (
                          <div className="flex flex-col items-center leading-none">
                            {saldoPendiente > 0 ? (
                              <span className="font-black font-mono text-[10px] text-rose-500 mb-0.5">{sym}{saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400 mb-0.5">—</span>
                            )}
                            <span className="text-[9px] font-mono text-zinc-500">{sym}{limit.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL ÓRDENES DEL CLIENTE — solo consulta, fondo cristalino */}
      {clientOrdersModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/10 backdrop-blur-2xl" onClick={() => setClientOrdersModal(null)}>
          <div
            className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none'
              : isLight ? 'bg-white/90 border border-zinc-200 backdrop-blur-sm'
              : 'bg-[#121316]/90 border border-zinc-700 backdrop-blur-sm'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${
              isRetro ? 'bg-[#000080] border-zinc-600'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-zinc-800/60 border-zinc-700'
            }`}>
              <div>
                <span className={`text-sm font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-zinc-900' : 'text-white'}`}>
                  🔍 Órdenes — {clientOrdersModal.name}
                </span>
                <span className={`text-[10px] block font-mono mt-0.5 ${isRetro ? 'text-white/70' : isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {clientOrdersForModal.length} orden{clientOrdersForModal.length !== 1 ? 'es' : ''} encontrada{clientOrdersForModal.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const sym = config.currencySymbol || '$';
                    const cl = clientOrdersModal!;
                    const thead = `<thead><tr><th>ID</th><th>Dispositivo</th><th>Falla</th><th>Estado</th><th>Fecha</th><th style="text-align:right">Costo</th></tr></thead>`;
                    const tbody = `<tbody>${clientOrdersForModal.map(o => `<tr>
                      <td style="font-family:monospace">${o.id}</td>
                      <td>${o.deviceBrand} ${o.deviceModel}</td>
                      <td>${o.faultDescription}</td>
                      <td>${o.status}</td>
                      <td>${new Date(o.createdAt).toLocaleString('es-MX')}</td>
                      <td>${sym}${(o.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>`).join('')}</tbody>`;
                    const total = clientOrdersForModal.filter(o => o.status === 'Entregado y Pagado').reduce((s, o) => s + (o.cost || 0), 0);
                    const summary = `
                      <div class="summary-item"><label>Cliente</label><span style="font-size:11px">${cl.name}</span></div>
                      <div class="summary-item"><label>Teléfono</label><span style="font-size:11px">${cl.phone}</span></div>
                      <div class="summary-item"><label>Total órdenes</label><span>${clientOrdersForModal.length}</span></div>
                      <div class="summary-item"><label>Total cobrado</label><span>${sym}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    `;
                    if (clientOrdersForModal.length === 0) { showToast('⚠️ Este cliente no tiene órdenes registradas'); return; }
                    const html = buildA4ReportHtml(`Historial del Cliente: ${cl.name}`, `Tel: ${cl.phone}${cl.email ? ' · ' + cl.email : ''}`, config.storeName || 'TALLER', thead + tbody, summary);
                    printA4Report(html, config.reportPrinterName);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all bg-white/20 hover:bg-white/35 text-white border border-white/30"
                >
                  <Printer className="w-3 h-3" /> Imprimir
                </button>
                <button onClick={() => setClientOrdersModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-bold cursor-pointer transition-all">✕</button>
              </div>
            </div>

            {/* Lista de órdenes */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {clientOrdersForModal.length === 0 ? (
                <div className={`text-center py-12 text-sm font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Sin órdenes registradas para este cliente.
                </div>
              ) : clientOrdersForModal.map(o => (
                <div 
                  key={o.id} 
                  onClick={() => {
                    setClientOrdersModal(null);
                    setSelectedOrderId(o.id);
                    setActiveTab('Órdenes');
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 ${
                    isRetro ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                    : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-sm font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{o.id}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                        o.status === 'Entregado' || o.status === 'Entregado y Pagado' ? 'bg-emerald-500/20 text-emerald-600' :
                        o.status === 'Listo' ? 'bg-sky-500/20 text-sky-600' :
                        o.status === 'En Reparación' ? 'bg-purple-500/20 text-purple-600' :
                        'bg-amber-500/20 text-amber-600'
                      }`}>{o.status}</span>
                    </div>
                    <div className={`truncate ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{o.deviceBrand} {o.deviceModel} · {o.faultDescription}</div>
                    <div className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {new Date(o.createdAt).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-black text-base font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{config.currencySymbol}{o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    {o.advancePayment > 0 && (
                      <div className={`text-[9px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>Anticipo: {config.currencySymbol}{o.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DETALLE HISTORIAL CLIENTE (MODAL) */}
      {clientToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-md flex flex-col relative overflow-hidden ${
            isRetro 
              ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans shadow-2xl' 
              : isLight 
                ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900' 
                : 'bg-[#0f1115] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isRetro ? 'bg-[#000080] text-white p-2' : isLight ? 'bg-zinc-50 text-zinc-900 border-zinc-200' : 'bg-[#13151a] text-zinc-100 border-zinc-850'
            }`}>
              <div className="flex items-center gap-2">
                <Edit className={`w-4 h-4 shrink-0 ${isRetro ? 'text-white' : 'text-blue-500'}`} />
                <span className={`font-extrabold text-xs uppercase tracking-wider ${isRetro ? 'retro-white-text text-white' : isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>
                  Editar Cliente
                </span>
              </div>
              <button
                onClick={() => setClientToEdit(null)}
                className={`cursor-pointer ${
                  isRetro ? 'retro-white-text text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editName.trim() || !editPhone.trim()) {
                  showToast('⚠️ Nombre y teléfono son obligatorios');
                  return;
                }
                onEditClient?.(
                  clientToEdit.phone,
                  editName.toUpperCase().trim(),
                  editPhone.replace(/\D/g, ''),
                  editCreditLimit ? Number(editCreditLimit) : undefined
                );
                setClientToEdit(null);
                showToast('✅ Datos del cliente actualizados con éxito', 'ok');
              }}
              className="p-5 space-y-4 text-left"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide block">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 rounded-lg ${
                    isLight 
                      ? 'bg-white border-zinc-300 focus:border-blue-500 text-zinc-850' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-zinc-100'
                  }`}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide block">
                  Número de Teléfono
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={editPhone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setEditPhone(formatPhoneNumber(clean));
                  }}
                  className={`w-full px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 rounded-lg ${
                    isLight 
                      ? 'bg-white border-zinc-300 focus:border-blue-500 text-zinc-850' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-zinc-100'
                  }`}
                  placeholder="(351) 123-4567"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide block">
                  Límite de Crédito ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 rounded-lg ${
                    isLight 
                      ? 'bg-white border-zinc-300 focus:border-blue-500 text-zinc-850' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-zinc-100'
                  }`}
                  placeholder="Ej: 1000"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] leading-relaxed">
                💡 <strong>NOTA DE SINCRONIZACIÓN:</strong><br />
                Al corregir el nombre o número del cliente, el cambio se reflejará automáticamente en todas sus órdenes de servicio vigentes e históricas, garantizando la consistencia de su historial.
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClientToEdit(null)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                    isLight ? 'bg-zinc-105 hover:bg-zinc-200 border-zinc-200 text-zinc-705' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-750 text-white'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clientToDelete && (() => {
        const clOrders = orders.filter(o =>
          o.customerPhone === clientToDelete.phone ||
          o.customerName.toLowerCase().trim() === clientToDelete.name.toLowerCase().trim()
        );
        const activeOrders = clOrders.filter(o =>
          !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status)
        );
        const deliveredOrders = clOrders.length - activeOrders.length;
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className={`w-full max-w-md flex flex-col relative overflow-hidden ${
              isRetro 
                ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans shadow-2xl' 
                : isLight 
                  ? 'bg-white border border-zinc-200 rounded-2xl shadow-2xl text-zinc-900' 
                  : 'bg-[#0f1115] border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100'
            }`}>
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isRetro ? 'bg-[#000080] text-white p-2' : isLight ? 'bg-zinc-50 text-zinc-900 border-zinc-200' : 'bg-[#13151a] text-zinc-100 border-zinc-850'
              }`}>
                <div className="flex items-center gap-2">
                  <Trash2 className={`w-4 h-4 shrink-0 ${isRetro ? 'text-white' : 'text-red-500'}`} />
                  <span className={`font-extrabold text-xs uppercase tracking-wider ${isRetro ? 'retro-white-text text-white' : isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>
                    Eliminar Cliente
                  </span>
                </div>
                <button
                  onClick={() => setClientToDelete(null)}
                  className={`cursor-pointer ${
                    isRetro ? 'retro-white-text text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] opacity-60 font-extrabold uppercase tracking-wide">Cliente</span>
                  <h4 className="font-extrabold text-sm uppercase tracking-wide truncate">{clientToDelete.name}</h4>
                  <p className="font-mono text-xs opacity-75">{formatPhoneNumber(clientToDelete.phone)}</p>
                </div>

                {clOrders.length === 0 ? (
                  <p className="text-xs leading-normal">
                    ¿Estás seguro de que deseas eliminar a este cliente? Esta acción no se puede deshacer.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs leading-normal text-rose-500 font-bold">
                      ⚠️ Este cliente tiene {clOrders.length} {clOrders.length === 1 ? 'orden registrada' : 'órdenes registradas'} ({activeOrders.length} en proceso, {deliveredOrders} entregadas).
                    </p>
                    
                    <div className={`border rounded-lg p-2.5 max-h-40 overflow-y-auto space-y-2 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-black/30 border-zinc-855'
                    }`}>
                      <p className="text-[9.5px] uppercase font-bold tracking-wider opacity-60 mb-1 select-none">Preview de órdenes asociadas:</p>
                      {clOrders.map(o => (
                        <div key={o.id} className="flex justify-between items-center text-[10.5px] py-1 border-b border-zinc-550/10">
                          <div className="truncate pr-1">
                            <span className="font-mono font-black mr-1">{o.id}</span>
                            <span className="opacity-80">{o.deviceBrand} {o.deviceModel}</span>
                          </div>
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                            !['Entregado', 'Entregado y Pagado', 'Cancelado', 'Fallido'].includes(o.status) 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-amber-555/10 border border-amber-555/20 rounded-lg text-[10px] leading-relaxed">
                      💡 <strong>¿Qué deseas hacer con sus órdenes?</strong><br />
                      <strong>Opción A:</strong> Conserva sus datos financieros en caja/garantías y oculta al cliente.<br />
                      <strong>Opción B:</strong> Borra permanentemente al cliente y todas sus órdenes del taller.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-4 border-t flex flex-col gap-2 shrink-0 ${
                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#121316] border-zinc-850'
              }`}>
                {clOrders.length === 0 ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setClientToDelete(null)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                        isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-800 border-zinc-750 text-white'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteClient?.(clientToDelete.phone, false);
                        setClientToDelete(null);
                        showToast('✅ Cliente eliminado con éxito', 'ok');
                      }}
                      className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide text-white bg-red-650 hover:bg-red-600 cursor-pointer"
                    >
                      Sí, Eliminar
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteClient?.(clientToDelete.phone, false);
                        setClientToDelete(null);
                        showToast('✅ Cliente archivado. Historial de órdenes conservado.', 'ok');
                      }}
                      className="w-full py-2 bg-zinc-700 hover:bg-zinc-650 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-all cursor-pointer border border-zinc-650"
                    >
                      Opción A: Conservar Historial y Ocultar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteClient?.(clientToDelete.phone, true);
                        setClientToDelete(null);
                        showToast('✅ Cliente y todas sus órdenes eliminadas con éxito', 'ok');
                      }}
                      className="w-full py-2 bg-red-650 hover:bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-all cursor-pointer shadow-md shadow-red-950/50"
                    >
                      Opción B: Eliminar Cliente y Órdenes
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientToDelete(null)}
                      className="w-full py-2 text-zinc-400 hover:text-white rounded-lg font-bold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedClientForHistory && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${
            isRetro 
              ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 w-full max-w-4xl shadow-[6px_6px_15px_rgba(0,0,0,0.6)] text-black font-sans' 
              : isLight
                ? 'bg-white border border-zinc-200 w-full max-w-4xl rounded-2xl shadow-2xl text-zinc-950 font-sans'
                : 'bg-[#121316] border border-[#1b1c21] w-full max-w-4xl rounded-2xl shadow-2xl text-zinc-100'
          } flex flex-col max-h-[90vh] overflow-hidden`}>
            
            {/* Cabecera del Expediente */}
            <div className={`${
              isRetro 
                ? 'bg-[#000080] p-3 text-white flex items-center justify-between' 
                : 'bg-[#1a1b20] text-white p-4.5 rounded-t-2xl flex items-center justify-between border-b border-zinc-600/40'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase font-mono font-black tracking-wider px-2 py-0.5 rounded ${
                  isRetro ? 'bg-white/20 text-white' : 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
                }`}>
                  Expediente Digital
                </span>
                <h3 className={`text-sm font-black uppercase ${isRetro ? 'retro-white-text' : 'text-white'}`}>
                  Historial de Reparaciones: {selectedClientForHistory.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className={`cursor-pointer ${
                  isRetro 
                    ? 'px-2 py-0.5 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-black text-xs hover:bg-zinc-300' 
                    : 'w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-sm transition-all'
                }`}
              >
                {isRetro ? 'X' : '✕'}
              </button>
            </div>

            {/* Metadatos de Contacto */}
            <div className={`p-4 border-b flex flex-wrap gap-4 items-center justify-between text-xs ${
              isRetro ? 'bg-[#cbd6e2] border-b-[#808080]' : isLight ? 'bg-zinc-50 border-b-zinc-200' : 'bg-black/30 border-b-zinc-800/80'
            }`}>
              <div className="flex flex-wrap gap-5">
                <div>
                  <span className="text-zinc-500 font-bold block uppercase text-[10px]">Teléfono:</span>
                  <span className="font-mono font-bold text-sm">{renderClickablePhone(selectedClientForHistory.phone, selectedClientForHistory.countryCode)}</span>
                </div>

                <div>
                  <span className="text-zinc-500 font-bold block uppercase text-[10px]">Total de Servicios:</span>
                  <span className="font-extrabold">{clientHistory.length} Registros</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block text-[9px] uppercase font-mono">ID Expediente:</span>
                <span className="font-mono text-[10px] text-zinc-400 font-bold">{selectedClientForHistory.id}</span>
              </div>
            </div>

            {/* Historial de Reparaciones (Tabla con listado) */}
            <div className={`p-4 md:p-6 overflow-y-auto flex-1 space-y-4 ${isRetro ? 'bg-[#eaeef3]' : ''}`}>
              {clientHistory.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs flex flex-col items-center justify-center gap-1.5 font-sans font-medium">
                  <span>⚠️ No se encontraron órdenes de servicio guardadas para este cliente.</span>
                  <span className="text-[11px] text-zinc-400">Verifique el listado general en el panel de órdenes.</span>
                </div>
              ) : (
                <div className={`overflow-x-auto rounded-lg border ${isRetro ? 'border-[#808080]' : 'border-zinc-800'}`}>
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className={`${
                      isRetro ? 'bg-[#cbd6e2] text-black' : isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-[#101114] text-zinc-400'
                    } text-[10px] font-mono border-b ${isRetro ? 'border-b-[#808080]' : 'border-b-zinc-800'}`}>
                      <tr>
                        <th className="p-3 pl-4">Folio / Fecha</th>
                        <th className="p-3">Equipo</th>
                        <th className="p-3">Falla Reportada</th>
                        <th className="p-3">Servicio Brindado</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Costo / Saldo</th>
                        <th className="p-3 text-center">Estatus Pago</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isRetro ? 'divide-[#cbd6e2] bg-white text-black' : isLight ? 'divide-zinc-200 bg-white text-zinc-600' : 'divide-zinc-800/80 bg-zinc-950/20'}`}>
                      {clientHistory.map((order) => {
                        let statusColor = 'bg-zinc-100 text-zinc-700';
                        if (order.status === 'Entregado y Pagado' || order.status === 'Listo') {
                          statusColor = 'bg-emerald-500/15 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20';
                        } else if (order.status === 'En Reparación' || order.status === 'Diagnóstico') {
                          statusColor = 'bg-blue-500/15 text-blue-650 dark:text-blue-400 border border-blue-500/20';
                        } else if (order.status === 'Fallido' || order.status === 'Cancelado') {
                          statusColor = 'bg-red-500/15 text-red-650 dark:text-red-400 border border-red-500/20';
                        } else {
                          statusColor = 'bg-yellow-500/15 text-yellow-650 dark:text-yellow-400 border border-yellow-500/20';
                        }

                        return (
                          <tr key={order.id} className={isRetro ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800/15'}>
                            <td className="p-3 pl-4 whitespace-nowrap">
                              <span className="font-mono font-bold block text-purple-650 dark:text-purple-400 text-[11px]">{order.id}</span>
                              <span className="text-[10px] text-zinc-500 font-mono block">{formatDateToDMY(order.createdAt)}</span>
                            </td>
                            <td className="p-3 max-w-[150px] truncate">
                              <span className="font-extrabold block text-[12px] uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                                {order.deviceBrand} {order.deviceModel}
                              </span>
                            </td>
                            <td className="p-3 max-w-[180px] break-words">
                              <span className="text-[11.5px] font-medium leading-relaxed block italic text-zinc-500 dark:text-zinc-400">
                                "{order.faultDescription}"
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-zinc-500 dark:text-zinc-300">
                              {order.serviceType || 'Mantenimiento General'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-[9.5px] font-bold rounded-sm uppercase tracking-wide ${statusColor}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                              <div className="text-[12.5px]">{config.currencySymbol}{order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              {order.advancePayment > 0 && (
                                <div className="text-[9.5px] text-zinc-400 leading-none">Anticipo: -{config.currencySymbol}{order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {order.isPaid || order.status === 'Entregado y Pagado' ? (
                                <span className={`px-1.5 py-0.5 rounded-xs font-black text-[9px] uppercase tracking-wider font-mono ${
                                  isRetro ? 'bg-zinc-150 border border-zinc-400 text-emerald-800' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  ✓ Cobrado
                                </span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded-xs font-black text-[9px] uppercase tracking-wider font-mono ${
                                  isRetro ? 'bg-zinc-150 border border-zinc-400 text-rose-800' : 'bg-rose-950/30 text-rose-450 border border-rose-500/30'
                                }`}>
                                  ⚠ Pendiente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className={`p-3 flex justify-end gap-2 border-t ${
              isRetro ? 'bg-[#cbd6e2] border-t-[#808080]' : isLight ? 'bg-zinc-50 border-t-zinc-200' : 'bg-[#121316] border-t-zinc-800'
            }`}>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className={`px-4 py-1.5 text-xs font-black uppercase cursor-pointer transition-all ${
                  isRetro 
                    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black active:scale-95' 
                    : 'bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg px-4 border border-zinc-700'
                }`}
              >
                Cerrar Expediente
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL ENVÍO MASIVO DE PROMOCIONES */}
      {showBulkPromoModal && (() => {
        const selectedClientsCount = Object.values(selectedClientIds).filter(Boolean).length;

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div
              className={`w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${
                isRetro ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none text-black font-sans'
                : isLight ? 'bg-white border border-zinc-200 rounded-2xl text-zinc-950 font-sans'
                : 'bg-[#121316] border border-zinc-700 rounded-2xl text-gray-250'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
                isRetro ? 'bg-[#075E54] border-zinc-650 text-white'
                : 'bg-[#075E54] border-[#128C7E] text-white'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-mono font-black tracking-wider px-2 py-0.5 rounded ${
                    isRetro ? 'bg-white/20 text-white' : 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30'
                  }`}>
                    WhatsApp Masivo
                  </span>
                  <h3 className="text-sm font-black uppercase">
                    📢 Campaña de Promociones a Clientes
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    if (isSendingPromos) {
                      if (!confirm('Hay un envío en progreso. ¿Deseas detenerlo y cerrar?')) return;
                      handleCancelSending();
                    }
                    setShowBulkPromoModal(false);
                  }} 
                  className={`cursor-pointer ${
                    isRetro 
                      ? 'px-2 py-0.5 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-black text-xs hover:bg-zinc-300' 
                      : 'w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center font-bold text-sm transition-all'
                  }`}
                >
                  {isRetro ? 'X' : '✕'}
                </button>
              </div>

              {/* Content Body */}
              <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 p-5 overflow-y-auto flex-1 ${
                isRetro ? 'bg-[#cbd6e2]'
                : isLight ? 'bg-[#efeae2]'
                : 'bg-[#0b141a]'
              }`}>
                
                {/* Left Column: Settings and Message Template */}
                <div className="md:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center pb-1">
                      <label className={`text-[10px] uppercase font-black tracking-wider block ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        Mensaje de la Promoción:
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPromoMessage(DEFAULT_PROMO_TEMPLATE);
                            setPromoFilterType('all');
                            setActiveTemplateType('promo');
                          }}
                          disabled={isSendingPromos}
                          title="Cargar plantilla promocional"
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold select-none ${
                            activeTemplateType === 'promo'
                              ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 shadow-inner' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800')
                              : (isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-black active:border-zinc-500' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 shadow-sm' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700')
                          }`}
                        >
                          📢 Promo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoMessage(DEFAULT_COBRO_TEMPLATE);
                            setPromoFilterType('debt');
                            setActiveTemplateType('cobro');
                          }}
                          disabled={isSendingPromos}
                          title="Cargar plantilla de cobranza"
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold select-none ${
                            activeTemplateType === 'cobro'
                              ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 shadow-inner' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800')
                              : (isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-black active:border-zinc-500' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 shadow-sm' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700')
                          }`}
                        >
                          💰 Cobro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoMessage(DEFAULT_ESTATUS_TEMPLATE);
                            setPromoFilterType('active');
                            setActiveTemplateType('estatus');
                          }}
                          disabled={isSendingPromos}
                          title="Cargar plantilla de estatus de reparación"
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold select-none ${
                            activeTemplateType === 'estatus'
                              ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 shadow-inner' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800')
                              : (isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-black active:border-zinc-500' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 shadow-sm' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700')
                          }`}
                        >
                          🔧 Estatus
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoMessage('');
                            setActiveTemplateType('custom');
                          }}
                          disabled={isSendingPromos}
                          title="Cambiar a mensaje libre y desbloquear todos los filtros"
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer font-bold select-none ${
                            activeTemplateType === 'custom'
                              ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 shadow-inner' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800')
                              : (isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-black active:border-zinc-500' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 shadow-sm' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700')
                          }`}
                        >
                          ✍️ Libre
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={promoTextAreaRef}
                      rows={6}
                      value={promoMessage}
                      disabled={isSendingPromos}
                      onChange={(e) => setPromoMessage(e.target.value)}
                      placeholder={
                        activeTemplateType === 'custom'
                          ? "Aquí escribe libremente lo que tú quieras en tu plantilla. Puedes usar los tags que están en la parte de abajo para llamar exactamente a los nombres de cada cliente y cosas por el estilo."
                          : "Escribe aquí el texto de tu promoción..."
                      }
                      className={`w-full text-xs font-medium p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        isRetro ? 'bg-white border-zinc-400 text-black rounded-none font-mono font-bold'
                        : isLight ? 'bg-white border-zinc-200 text-zinc-850'
                        : 'bg-[#18191f] border-zinc-800 text-white'
                      }`}
                    />
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                      isRetro ? 'bg-[#dfdfdf] border-zinc-450 text-black font-bold'
                      : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-650'
                      : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-400'
                    }`}>
                      <div className="text-[10px] font-bold flex items-center gap-1.5 opacity-90">
                        <span>💡 Haz clic para insertar etiquetas dinámicas:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{nombre}')}
                          disabled={isSendingPromos}
                          title="Nombre del cliente"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-emerald-50 hover:bg-emerald-100/85 border-emerald-200 hover:border-emerald-300 text-emerald-700 shadow-sm'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 hover:border-emerald-500/40 text-emerald-450'
                          }`}
                        >
                          <span className="font-extrabold">{`{nombre}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Cliente)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{taller}')}
                          disabled={isSendingPromos}
                          title="Nombre de tu negocio/taller"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-sky-50 hover:bg-sky-100/85 border-sky-200 hover:border-sky-300 text-sky-700 shadow-sm'
                                : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/25 hover:border-sky-500/40 text-sky-450'
                          }`}
                        >
                          <span className="font-extrabold">{`{taller}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Negocio)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{direccion}')}
                          disabled={isSendingPromos}
                          title="Dirección física del taller"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-blue-50 hover:bg-blue-100/85 border-blue-200 hover:border-blue-300 text-blue-700 shadow-sm'
                                : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 hover:border-blue-500/40 text-blue-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{direccion}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Ubicación)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{maps_link}')}
                          disabled={isSendingPromos}
                          title="Enlace a Google Maps de tu taller"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-red-50 hover:bg-red-100/85 border-red-200 hover:border-red-300 text-red-700 shadow-sm'
                                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/25 hover:border-red-500/40 text-red-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{maps_link}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Maps)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{horarios}')}
                          disabled={isSendingPromos}
                          title="Horarios de atención de tu taller"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-amber-50 hover:bg-amber-100/85 border-amber-200 hover:border-amber-300 text-amber-700 shadow-sm'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 hover:border-amber-500/40 text-amber-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{horarios}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Horarios)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{telefono_taller}')}
                          disabled={isSendingPromos}
                          title="Teléfono de contacto del taller"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-indigo-50 hover:bg-indigo-100/85 border-indigo-200 hover:border-indigo-300 text-indigo-700 shadow-sm'
                                : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{telefono_taller}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Teléfono)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{whatsapp}')}
                          disabled={isSendingPromos}
                          title="Enlace directo a tu WhatsApp"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-emerald-50 hover:bg-emerald-100/85 border-emerald-200 hover:border-emerald-300 text-emerald-700 shadow-sm'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 hover:border-emerald-500/40 text-emerald-450'
                          }`}
                        >
                          <span className="font-extrabold">{`{whatsapp}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(WhatsApp)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{facebook}')}
                          disabled={isSendingPromos}
                          title="Enlace a tu Facebook"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-blue-50 hover:bg-blue-100/85 border-blue-200 hover:border-blue-300 text-blue-700 shadow-sm'
                                : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 hover:border-blue-500/40 text-blue-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{facebook}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Facebook)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{instagram}')}
                          disabled={isSendingPromos}
                          title="Enlace a tu Instagram"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-pink-50 hover:bg-pink-100/85 border-pink-200 hover:border-pink-300 text-pink-700 shadow-sm'
                                : 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/25 hover:border-pink-500/40 text-pink-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{instagram}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Instagram)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{tiktok}')}
                          disabled={isSendingPromos}
                          title="Enlace a tu TikTok"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800 shadow-sm'
                                : 'bg-zinc-700/30 hover:bg-zinc-700/50 border-zinc-600 text-zinc-200'
                          }`}
                        >
                          <span className="font-extrabold">{`{tiktok}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(TikTok)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{saldo_pendiente}')}
                          disabled={isSendingPromos}
                          title="Adeudo total del cliente en reparaciones activas"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-amber-50 hover:bg-amber-100/85 border-amber-200 hover:border-amber-300 text-amber-700 shadow-sm'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 hover:border-amber-500/40 text-amber-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{saldo_pendiente}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Adeudo)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => insertTagAtCursor('{ordenes_activas}')}
                          disabled={isSendingPromos}
                          title="Cantidad de órdenes activas del cliente"
                          className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                            isRetro 
                              ? 'bg-[#dfdfdf] border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-300 text-black active:border-zinc-500'
                              : isLight
                                ? 'bg-purple-50 hover:bg-purple-100/85 border-purple-200 hover:border-purple-300 text-purple-700 shadow-sm'
                                : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/25 hover:border-purple-500/40 text-purple-400'
                          }`}
                        >
                          <span className="font-extrabold">{`{ordenes_activas}`}</span>
                          <span className="opacity-70 font-sans font-medium text-[8.5px]">(Equipos)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Card */}
                  {(() => {
                    const selectedList = clients.filter(c => selectedClientIds[c.id]);
                    const sampleClient: Client = selectedList[0] || clients[0] || { id: 'MOCK-CLIENT', name: 'Cliente Ejemplo', phone: '', email: '', registeredAt: '', totalOrders: 0 };
                    const previewText = buildPersonalizedPromoMessage(promoMessage, sampleClient);
                    return (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-mono font-black tracking-wider text-zinc-500 block">Previsualización (WhatsApp):</span>
                        {/* Chat Container Background */}
                        <div className={`p-4 rounded-xl border flex flex-col items-end justify-start shadow-inner relative overflow-hidden min-h-[120px] ${
                          isRetro ? 'bg-[#eaeef3] border-zinc-400'
                          : isLight ? 'bg-[#efeae2] border-zinc-200'
                          : 'bg-[#0b141a] border-zinc-800'
                        }`}>
                          {/* Chat Bubble */}
                          <div 
                            className={`relative max-w-[95%] sm:max-w-[88%] rounded-2xl rounded-tr-none p-3 text-xs leading-normal shadow-sm break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                              isRetro ? 'border-2 border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 font-bold font-mono' : ''
                            }`}
                            style={{
                              backgroundColor: isRetro ? '#d9fdd3' : isLight ? '#d9fdd3' : '#005c4b',
                              color: isRetro ? '#000000' : isLight ? '#111b21' : '#e9edef',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            <div 
                              className="whitespace-pre-wrap font-sans text-xs break-words [overflow-wrap:anywhere] [word-break:break-word]"
                              style={{ 
                                color: isRetro ? '#000000' : isLight ? '#111b21' : '#e9edef',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere'
                              }}
                            >
                              {renderWhatsAppFormattedText(previewText, isRetro, isLight)}
                            </div>
                            
                            {/* Time & Double Checkmark */}
                            <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] opacity-60 font-mono text-right select-none">
                              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[#53bdeb]">✓✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Delay & Settings */}
                  <div className={`p-3 border rounded-xl text-[9.5px] leading-relaxed flex items-start gap-2 ${
                    isRetro ? 'bg-white border-zinc-400 text-black'
                    : isLight ? 'bg-white border-zinc-150 text-zinc-600'
                    : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-300'
                  }`}>
                    <span className="text-sm">⏱️</span>
                    <div>
                      <strong>Retraso de Envío Orgánico y Dinámico</strong><br />
                      Para proteger tu número contra bloqueos por spam en WhatsApp, el sistema variará automáticamente el tiempo de espera entre cada envío (de forma aleatoria entre 8 y 18 segundos).
                    </div>
                  </div>

                  {/* WhatsApp mode warning */}
                  <div className={`p-3 rounded-xl border text-[9.5px] leading-relaxed flex items-start gap-2 ${
                    config.whatsappMode === 'integrated' 
                      ? (isLight ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400')
                      : (config.whatsappMode && config.whatsappMode !== 'disabled'
                        ? (isLight ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-amber-950/20 border-amber-900/30 text-amber-400')
                        : (isLight ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-[#291415] border-rose-900/30 text-rose-450'))
                  }`}>
                    <span className="text-base leading-none">
                      {config.whatsappMode === 'integrated' ? '⚙️' : (config.whatsappMode && config.whatsappMode !== 'disabled' ? '⚠️' : '❌')}
                    </span>
                    <div>
                      <strong>Modo de WhatsApp: {
                        config.whatsappMode === 'integrated' ? 'INTEGRADO (API)' : (config.whatsappMode && config.whatsappMode !== 'disabled' ? 'MANUAL (WEB)' : 'DESACTIVADO')
                      }</strong><br />
                      {config.whatsappMode === 'integrated' && 'Los mensajes se enviarán automáticamente en segundo plano con el delay establecido.'}
                      {config.whatsappMode && config.whatsappMode !== 'disabled' && config.whatsappMode !== 'integrated' && 'Al no tener la API integrada activa, el sistema abrirá pestañas de chat consecutivas para que envíes manualmente.'}
                      {(!config.whatsappMode || config.whatsappMode === 'disabled') && 'WhatsApp está desactivado. Actívalo en Ajustes -> Sincronización/Notificaciones para poder realizar envíos masivos.'}
                    </div>
                  </div>
                </div>

                {/* Right Column: Recipient Selection list */}
                <div className={`md:col-span-7 flex flex-col h-[55vh] border rounded-xl overflow-hidden ${
                  isRetro ? 'border-zinc-400 bg-zinc-100'
                  : isLight ? 'border-[#128C7E]/20 bg-[#efeae2]/5' 
                  : 'border-[#128C7E]/30 bg-[#0f1013]/40'
                }`}>
                  {/* List Header and Filter Search */}
                  <div className={`p-3 border-b flex items-center justify-between gap-3 ${
                    isRetro ? 'bg-[#dfdfdf] border-zinc-400'
                    : isLight ? 'bg-[#efeae2]/45 border-[#128C7E]/10' 
                    : 'bg-[#182229] border-[#128C7E]/20'
                  }`}>
                    <div className="relative flex-1 max-w-xs">
                      <span className="absolute left-2.5 top-2 text-zinc-500"><Search className="w-3.5 h-3.5" /></span>
                      <input
                        type="text"
                        disabled={isSendingPromos}
                        value={promoSearchQuery}
                        onChange={(e) => setPromoSearchQuery(e.target.value)}
                        placeholder="Buscar destinatario..."
                        className={`w-full border rounded-lg px-2.5 pl-8 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isRetro ? 'bg-white border-zinc-400 text-black rounded-none font-bold'
                          : isLight ? 'bg-white border-zinc-200 text-zinc-800 focus:ring-[#25D366]'
                          : 'bg-[#0f1013] border-zinc-800 text-white focus:ring-[#25D366]'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSendingPromos || (activeTemplateType !== 'promo' && activeTemplateType !== 'custom')}
                        onClick={() => setPromoFilterType('all')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                          promoFilterType === 'all'
                            ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 rounded-none' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300 rounded-lg' : 'bg-emerald-950/40 text-emerald-400 border-emerald-850 rounded-lg')
                            : (isRetro ? 'bg-zinc-200 text-zinc-800 border-zinc-400 rounded-none' : isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 rounded-lg' : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-850 rounded-lg')
                        } ${
                          (activeTemplateType !== 'promo' && activeTemplateType !== 'custom') ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        disabled={isSendingPromos || (activeTemplateType !== 'cobro' && activeTemplateType !== 'custom')}
                        onClick={() => setPromoFilterType('debt')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                          promoFilterType === 'debt'
                            ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 rounded-none' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300 rounded-lg' : 'bg-emerald-950/40 text-emerald-400 border-emerald-850 rounded-lg')
                            : (isRetro ? 'bg-zinc-200 text-zinc-800 border-zinc-400 rounded-none' : isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 rounded-lg' : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-850 rounded-lg')
                        } ${
                          (activeTemplateType !== 'cobro' && activeTemplateType !== 'custom') ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      >
                        Con Adeudo
                      </button>
                      <button
                        type="button"
                        disabled={isSendingPromos || (activeTemplateType !== 'estatus' && activeTemplateType !== 'custom')}
                        onClick={() => setPromoFilterType('active')}
                        className={`px-2 py-1 text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                          promoFilterType === 'active'
                            ? (isRetro ? 'bg-[#000080] text-white border-zinc-900 rounded-none' : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300 rounded-lg' : 'bg-emerald-950/40 text-emerald-400 border-emerald-850 rounded-lg')
                            : (isRetro ? 'bg-zinc-200 text-zinc-800 border-zinc-400 rounded-none' : isLight ? 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 rounded-lg' : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-850 rounded-lg')
                        } ${
                          (activeTemplateType !== 'estatus' && activeTemplateType !== 'custom') ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      >
                        En Taller
                      </button>
                    </div>

                    <span className="text-[10px] uppercase font-bold text-zinc-500 whitespace-nowrap">
                      {selectedClientsCount} seleccionados
                    </span>
                  </div>

                  {/* Table of contacts */}
                  <div className="overflow-y-auto flex-1 scrollbar-thin">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[9.5px] uppercase font-mono border-b ${
                        isRetro ? 'bg-[#cbd6e2] border-zinc-400 text-black'
                        : isLight ? 'bg-[#efeae2]/65 border-[#128C7E]/10 text-zinc-650' 
                        : 'bg-[#111b21] border-[#128C7E]/20 text-[#8696a0]'
                      }`}>
                        <tr>
                          <th className="p-2.5 pl-4 w-10 text-center">
                            <input
                              type="checkbox"
                              disabled={isSendingPromos}
                              checked={promoFilteredClients.length > 0 && promoFilteredClients.every(c => selectedClientIds[c.id])}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="w-3.5 h-3.5 accent-[#25D366] cursor-pointer"
                            />
                          </th>
                          <th className="p-2.5">Nombre</th>
                          <th className="p-2.5">WhatsApp</th>
                          <th className="p-2.5 text-center w-24">Estado</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isRetro ? 'divide-zinc-400 bg-white text-black'
                        : isLight ? 'divide-zinc-100 bg-white text-zinc-750' 
                        : 'divide-[#222e35]/60 bg-[#0b141a]/10 text-zinc-350'
                      }`}>
                        {promoFilteredClients.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs italic">
                              No hay clientes con teléfono que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          promoFilteredClients.map((c) => {
                            const isSelected = !!selectedClientIds[c.id];
                            const logStatus = sendingLogs[c.id] || 'pending';
                            
                            let statusLabel = 'Pendiente ⏳';
                            let statusStyle = 'text-zinc-500';
                            if (logStatus === 'sending') {
                              statusLabel = 'Enviando... ✉️';
                              statusStyle = 'text-[#25D366] font-bold animate-pulse';
                            } else if (logStatus === 'success') {
                              statusLabel = 'Enviado ✔️';
                              statusStyle = 'text-[#25D366] font-bold';
                            } else if (logStatus === 'error') {
                              statusLabel = 'Error ❌';
                              statusStyle = 'text-rose-500 font-bold';
                            }

                            const isCurrentSending = logStatus === 'sending';

                            return (
                              <tr 
                                key={c.id} 
                                id={`promo-row-${c.id}`}
                                className={`transition-colors ${
                                  isCurrentSending
                                    ? (isRetro ? 'bg-amber-100 font-bold border-y border-amber-400' : isLight ? 'bg-emerald-50 border-l-4 border-emerald-500 font-semibold text-zinc-950' : 'bg-[#005c4b]/30 border-l-4 border-[#25D366] font-semibold text-white')
                                    : (isSelected 
                                        ? (isRetro ? 'bg-[#d9fdd3]' : isLight ? 'bg-[#d9fdd3]/20' : 'bg-[#005c4b]/15')
                                        : (isRetro ? 'hover:bg-zinc-100' : isLight ? 'hover:bg-zinc-50' : 'hover:bg-[#202c33]/30'))
                                }`}
                              >
                                <td className="p-2.5 pl-4 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={isSendingPromos}
                                    checked={isSelected}
                                    onChange={(e) => handleToggleSelectClient(c.id, e.target.checked)}
                                    className="w-3.5 h-3.5 accent-[#25D366] cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 font-bold uppercase truncate max-w-[150px]">{c.name}</td>
                                <td className="p-2.5 font-mono">{formatPhoneNumber(c.phone)}</td>
                                <td className="p-2.5 text-center text-[10px] font-mono shrink-0 select-none">
                                  <span className={statusStyle}>{statusLabel}</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Progress bar info at the bottom if sending */}
                  {isSendingPromos && (
                    <div className={`p-3 border-t flex flex-col gap-1.5 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#18191f] border-zinc-800'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase select-none">
                        <span className="text-zinc-400">Progreso de la Campaña:</span>
                        <span className="text-emerald-500">
                          {sendingCurrentIndex} de {sendingTotal} completados ({Math.round((sendingCurrentIndex / sendingTotal) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-700/40 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${(sendingCurrentIndex / sendingTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
                isRetro ? 'bg-[#dfdfdf] border-zinc-400'
                : isLight ? 'bg-[#f0f2f5] border-zinc-200'
                : 'bg-[#1f2c34] border-[#222e35]'
              }`}>
                <div>
                  {isSendingPromos && (() => {
                    const successCount = Object.values(sendingLogs).filter(s => s === 'success').length;
                    const errorCount = Object.values(sendingLogs).filter(s => s === 'error').length;
                    const sentCount = successCount + errorCount;
                    const progressPercent = sendingTotal > 0 ? Math.round((sentCount / sendingTotal) * 100) : 0;
                    return (
                      <div className="w-80 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span className="text-[#25D366] animate-pulse">
                            ✉️ Enviando {sendingCurrentIndex + 1} de {sendingTotal}
                          </span>
                          <span className={isRetro ? 'text-black font-extrabold' : isLight ? 'text-zinc-650' : 'text-zinc-400'}>
                            {progressPercent}%
                          </span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className={`w-full h-2 rounded-full overflow-hidden flex ${
                          isRetro ? 'bg-zinc-300 border border-zinc-400' : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}>
                          <div 
                            className="h-full bg-[#25D366] transition-all duration-300" 
                            style={{ width: `${(successCount / sendingTotal) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-red-500 transition-all duration-300" 
                            style={{ width: `${(errorCount / sendingTotal) * 100}%` }}
                          />
                        </div>
                        <div className={`flex items-center gap-3 text-[9px] font-bold uppercase ${
                          isRetro ? 'text-zinc-750 font-extrabold' : 'text-zinc-500'
                        }`}>
                          <span>Éxitos: <strong className="text-emerald-500">{successCount}</strong></span>
                          <span>Errores: <strong className="text-rose-500">{errorCount}</strong></span>
                          {countdownSeconds !== null && (
                            <span className="ml-auto text-amber-500 animate-pulse">
                              Siguiente en {countdownSeconds}s ⏱️
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  {isSendingPromos ? (
                    <button
                      type="button"
                      onClick={handleCancelSending}
                      className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-wide cursor-pointer transition-all active:scale-95 border-none"
                    >
                      Detener Envío
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowBulkPromoModal(false)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide border cursor-pointer ${
                          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-750'
                          : isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                          : 'bg-zinc-800 border-zinc-700 text-white'
                        }`}
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={handleStartSending}
                        disabled={selectedClientsCount === 0 || !config.whatsappMode || config.whatsappMode === 'disabled'}
                        className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5 border-none cursor-pointer ${
                          isRetro 
                            ? 'bg-[#25D366] border-2 border-t-[#a3f3b9] border-l-[#a3f3b9] border-b-[#0b7d34] border-r-[#0b7d34] text-white font-extrabold disabled:bg-zinc-300 disabled:text-zinc-500 disabled:border-zinc-400 disabled:pointer-events-none'
                            : 'text-white bg-[#25D366] hover:bg-[#128C7E] disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-850 dark:disabled:text-zinc-500 disabled:pointer-events-none disabled:active:scale-100 shadow-sm'
                        }`}
                      >
                        <Send className="w-3 h-3 text-white" /> Enviar a {selectedClientsCount} Clientes
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Importación de Clientes */}
      <ImportClientsModal
        isOpen={showImportClientsModal}
        onClose={() => setShowImportClientsModal(false)}
        clients={clients}
        onSetClients={onSetClients}
        config={config}
        showToast={(msg, type) => showToast(msg, type === 'error' ? 'warn' : 'ok')}
      />

      {/* Modal de Agregar Cliente */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col ${
            isRetro ? 'bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
            : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
            : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro ? 'bg-[#000080] border-[#808080] text-white'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#0e0f12] border-[#1c1d22]'
            }`}>
              <div className="flex items-center gap-2">
                <UserPlus className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-purple-500'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                  👤 AGREGAR NUEVO CLIENTE
                </h3>
              </div>
              <button
                onClick={() => setShowAddClientModal(false)}
                className={`p-1 rounded-full cursor-pointer ${
                  isRetro ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                  : isLight ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 border border-zinc-300'
                  : 'text-gray-400 hover:text-white bg-zinc-900 border border-zinc-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="p-6 space-y-4 text-left font-sans">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className={isRetro
                    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-2 focus:outline-none font-mono'
                    : isLight
                      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-purple-500'
                      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono'
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Teléfono (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5 items-stretch">
                  <CountryCodeSelect
                    value={newClientCountryCode}
                    onChange={(code) => setNewClientCountryCode(code)}
                    className={`text-xs px-2 py-2 focus:outline-none cursor-pointer ${
                      isRetro 
                        ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black font-mono font-bold' 
                        : isLight 
                          ? 'bg-white border border-zinc-300 rounded text-zinc-900' 
                          : 'bg-[#1c1e24] border border-[#2d2f36] rounded text-white font-mono'
                    }`}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Ej. 3511574876"
                    maxLength={14}
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className={isRetro
                      ? 'flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-2 focus:outline-none font-mono'
                      : isLight
                        ? 'flex-1 bg-white border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-purple-500'
                        : 'flex-1 bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono'
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Límite de Crédito (Opcional)
                </label>
                <input
                  type="number"
                  placeholder="Ej. 1000"
                  value={newClientCreditLimit}
                  onChange={(e) => setNewClientCreditLimit(e.target.value)}
                  className={isRetro
                    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-2 focus:outline-none font-mono'
                    : isLight
                      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-purple-500'
                      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono'
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className={`px-5 py-2 text-xs font-bold rounded transition-colors cursor-pointer ${
                    isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                    : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold rounded transition-colors cursor-pointer text-white ${
                    isRetro ? 'bg-[#000080] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-blue-800'
                    : isLight ? 'bg-purple-750 hover:bg-purple-700'
                    : 'bg-purple-900/60 border border-purple-800 hover:bg-purple-900/80 text-white'
                  }`}
                >
                  Agregar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default ClientesView;
