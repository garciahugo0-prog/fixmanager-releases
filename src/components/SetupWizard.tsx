/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2, User, Printer, CheckCircle2,
  Phone, MapPin, Shield, Eye, EyeOff,
  RefreshCw, Check, Ticket, Tag, ChevronRight, ChevronLeft,
  Wrench, ImagePlus, X, Palette, Users, Plus, Trash2,
  MessageCircle, Loader2, Send, Bell, BellOff, Smartphone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { WorkshopConfig, AppUser, ADMIN_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../types';
import { INITIAL_CONFIG } from '../data';
import { formatPhoneNumber } from '../utils/phoneFormatter';

interface SetupWizardProps {
  onComplete: (config: Partial<WorkshopConfig>, adminUser: AppUser, extraUsers?: AppUser[]) => void;
  onBack?: () => void;
}

interface PrinterOption {
  name: string;
  displayName: string;
  isDefault: boolean;
}

// ── Datos de referencia ────────────────────────────────────────────────────

interface CountryCode {
  code: string;
  flag: string;
  name: string;
  currencyCode: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+52',  flag: '🇲🇽', name: 'México',             currencyCode: 'MXN' },
  { code: '+1',   flag: '🇺🇸', name: 'Estados Unidos',     currencyCode: 'USD' },
  { code: '+1',   flag: '🇨🇦', name: 'Canadá',             currencyCode: 'CAD' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina',          currencyCode: 'ARS' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil',             currencyCode: 'BRL' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile',              currencyCode: 'CLP' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia',           currencyCode: 'COP' },
  { code: '+51',  flag: '🇵🇪', name: 'Perú',               currencyCode: 'PEN' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela',          currencyCode: 'VES' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador',            currencyCode: 'USD' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia',            currencyCode: 'BOB' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay',            currencyCode: 'UYU' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay',           currencyCode: 'PYG' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala',          currencyCode: 'GTQ' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador',        currencyCode: 'USD' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras',           currencyCode: 'USD' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua',          currencyCode: 'USD' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica',         currencyCode: 'CRC' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá',             currencyCode: 'PAB' },
  { code: '+1',   flag: '🇩🇴', name: 'Rep. Dominicana',   currencyCode: 'DOP' },
  { code: '+53',  flag: '🇨🇺', name: 'Cuba',               currencyCode: 'USD' },
  { code: '+34',  flag: '🇪🇸', name: 'España',             currencyCode: 'EUR' },
  { code: '+44',  flag: '🇬🇧', name: 'Reino Unido',        currencyCode: 'GBP' },
  { code: '+49',  flag: '🇩🇪', name: 'Alemania',           currencyCode: 'EUR' },
  { code: '+33',  flag: '🇫🇷', name: 'Francia',            currencyCode: 'EUR' },
  { code: '+39',  flag: '🇮🇹', name: 'Italia',             currencyCode: 'EUR' },
  { code: '+81',  flag: '🇯🇵', name: 'Japón',              currencyCode: 'JPY' },
  { code: '+86',  flag: '🇨🇳', name: 'China',              currencyCode: 'CNY' },
];

interface Currency {
  flag:   string;
  code:   string;
  name:   string;
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { flag: '🇲🇽', code: 'MXN', name: 'Peso Mexicano',          symbol: '$'   },
  { flag: '🇺🇸', code: 'USD', name: 'Dólar Estadounidense',   symbol: '$'   },
  { flag: '🇨🇦', code: 'CAD', name: 'Dólar Canadiense',       symbol: 'CA$' },
  { flag: '🇦🇷', code: 'ARS', name: 'Peso Argentino',         symbol: '$'   },
  { flag: '🇧🇷', code: 'BRL', name: 'Real Brasileño',         symbol: 'R$'  },
  { flag: '🇨🇱', code: 'CLP', name: 'Peso Chileno',           symbol: '$'   },
  { flag: '🇨🇴', code: 'COP', name: 'Peso Colombiano',        symbol: '$'   },
  { flag: '🇵🇪', code: 'PEN', name: 'Sol Peruano',            symbol: 'S/'  },
  { flag: '🇻🇪', code: 'VES', name: 'Bolívar Venezolano',     symbol: 'Bs.' },
  { flag: '🇧🇴', code: 'BOB', name: 'Boliviano',              symbol: 'Bs.' },
  { flag: '🇺🇾', code: 'UYU', name: 'Peso Uruguayo',          symbol: '$U'  },
  { flag: '🇵🇾', code: 'PYG', name: 'Guaraní Paraguayo',      symbol: '₲'   },
  { flag: '🇬🇹', code: 'GTQ', name: 'Quetzal Guatemalteco',   symbol: 'Q'   },
  { flag: '🇨🇷', code: 'CRC', name: 'Colón Costarricense',    symbol: '₡'   },
  { flag: '🇵🇦', code: 'PAB', name: 'Balboa Panameño',        symbol: 'B/.' },
  { flag: '🇩🇴', code: 'DOP', name: 'Peso Dominicano',        symbol: 'RD$' },
  { flag: '🇪🇸', code: 'EUR', name: 'Euro',                   symbol: '€'   },
  { flag: '🇬🇧', code: 'GBP', name: 'Libra Esterlina',        symbol: '£'   },
  { flag: '🇯🇵', code: 'JPY', name: 'Yen Japonés',            symbol: '¥'   },
  { flag: '🇨🇳', code: 'CNY', name: 'Yuan Chino',             symbol: '¥'   },
];

// ── Step order: Apariencia first ──────────────────────────────────────────
const STEPS = [
  { id: 1,  label: 'Apariencia',            icon: Palette       },
  { id: 2,  label: 'Datos del Negocio',     icon: Building2     },
  { id: 3,  label: 'Logotipos',             icon: ImagePlus     },
  { id: 4,  label: 'Administrador',          icon: Shield        },
  { id: 5,  label: 'Impresoras',             icon: Printer       },
  { id: 6,  label: 'Empleados',              icon: Users         },
  { id: 7,  label: 'Modo del Taller',        icon: Wrench        },
  { id: 8,  label: 'Notificaciones',         icon: MessageCircle },
  { id: 9,  label: 'WhatsApp',              icon: Smartphone    },
  { id: 10, label: 'Confirmar y Finalizar',  icon: CheckCircle2  },
];

export default function SetupWizard({ onComplete, onBack }: SetupWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 — Apariencia (first so theme is live from the start)
  const [selectedTheme,     setSelectedTheme]     = useState<'retro-window' | 'modern' | 'fluent'>('retro-window');
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark'>('light');

  // Step 2 — Datos del Negocio
  const [storeName,           setStoreName]           = useState('');
  const [slogan,              setSlogan]              = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('México');
  const [phoneCode,           setPhoneCode]           = useState('+52');
  const [phone,               setPhone]               = useState('');
  const [address,             setAddress]             = useState('');
  const [currencyCode,        setCurrencyCode]        = useState('MXN');

  // Step 3 — Logotipos
  const [logoUrl,        setLogoUrl]        = useState('');
  const [ticketLogoUrl,  setTicketLogoUrl]  = useState('');
  const [mediaCartaLogoUrl, setMediaCartaLogoUrl] = useState('');
  const [labelLogoUrl,   setLabelLogoUrl]   = useState('');

  // Step 4 — Administrador
  const [adminName,       setAdminName]       = useState('Administrador');
  const [adminPin,        setAdminPin]        = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [showPin,         setShowPin]         = useState(false);

  // Step 5 — Empleados
  const [employees, setEmployees] = useState<Array<{ name: string; pin: string; pinConfirm: string; showPin: boolean; error: string }>>([]);

  // Step 6 — Modo del taller
  const [workshopMode, setWorkshopMode] = useState<'personal' | 'team'>('personal');
  const [empShowForm, setEmpShowForm] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empPinConfirm, setEmpPinConfirm] = useState('');
  const [empError, setEmpError] = useState('');

  const handleAddEmployee = () => {
    if (!empName.trim()) { setEmpError('Ingresa el nombre del empleado.'); return; }
    if (empPin.length !== 4 || !/^\d{4}$/.test(empPin)) { setEmpError('El PIN debe ser de 4 dígitos numéricos.'); return; }
    if (empPin !== empPinConfirm) { setEmpError('Los PINs no coinciden.'); return; }
    if (empPin === adminPin) { setEmpError('El PIN del empleado no puede ser igual al del administrador.'); return; }
    if (employees.some(e => e.pin === empPin)) { setEmpError('Ese PIN ya está en uso por otro empleado.'); return; }
    setEmployees(prev => [...prev, { name: empName.trim(), pin: empPin, pinConfirm: empPinConfirm, showPin: false, error: '' }]);
    setEmpName(''); setEmpPin(''); setEmpPinConfirm(''); setEmpError(''); setEmpShowForm(false);
  };

  // Step 8 — Telegram
  const TG_DRAFT_KEY = 'fxmgr_setup_tg_draft';
  const _tgDraft = (() => { try { return JSON.parse(localStorage.getItem(TG_DRAFT_KEY) || 'null'); } catch { return null; } })();
  const [tgUse,          setTgUse]          = useState<boolean | null>(null);
  const [tgSubStep,      setTgSubStep]      = useState<0|1|2|3|4|5|6>(0);
  const [tgToken,        setTgToken]        = useState(_tgDraft?.token || '');
  const [tgTokenInput,   setTgTokenInput]   = useState('');
  const [tgChatId,       setTgChatId]       = useState(_tgDraft?.chatId || '');
  const [tgBotName,      setTgBotName]      = useState(_tgDraft?.botName || '');
  const [tgBotUsername,  setTgBotUsername]  = useState(_tgDraft?.botUsername || '');
  const [tgStepLoading,  setTgStepLoading]  = useState(false);
  const [tgStepError,    setTgStepError]    = useState<string | null>(null);
  const [tgPolling,      setTgPolling]      = useState(false);
  const [tgWebOpened,    setTgWebOpened]    = useState(false);
  const [tgTestSent,     setTgTestSent]     = useState(false);

  const saveTgDraft = (overrides: Record<string, any> = {}) => {
    const draft = { token: tgToken, chatId: tgChatId, botName: tgBotName, botUsername: tgBotUsername, ...overrides };
    localStorage.setItem(TG_DRAFT_KEY, JSON.stringify(draft));
  };
  const clearTgDraft = () => localStorage.removeItem(TG_DRAFT_KEY);

  const handleTgVerifyToken = async () => {
    const t = tgTokenInput.trim();
    if (!t) { setTgStepError('Pega el token que te dio BotFather.'); return; }
    setTgStepLoading(true); setTgStepError(null);
    const api = (window as any).electronAPI;
    try {
      const res = api?.telegramGetMe
        ? await api.telegramGetMe(t)
        : await fetch(`https://api.telegram.org/bot${t}/getMe`).then(r => r.json()).then(d => ({ ok: true, data: d }));
      if (res?.data?.ok) {
        const bot = res.data.result;
        const botName = bot.first_name || bot.username || 'Tu Bot';
        const botUsername = bot.username || '';
        setTgToken(t); setTgBotName(botName); setTgBotUsername(botUsername);
        setTgSubStep(4); setTgStepError(null);
        saveTgDraft({ token: t, botName, botUsername });
      } else {
        setTgStepError(`❌ ${res?.data?.description || 'Token inválido. Verifica que lo copiaste completo.'}`);
      }
    } catch (e: any) { setTgStepError(`❌ Error de conexión: ${e?.message}`); }
    setTgStepLoading(false);
  };

  const handleTgDetectChatId = async () => {
    setTgStepLoading(true); setTgStepError(null); setTgPolling(true);
    const api = (window as any).electronAPI;
    let attempts = 0;
    const poll = async (): Promise<void> => {
      attempts++;
      try {
        const res = api?.telegramGetUpdates
          ? await api.telegramGetUpdates(tgToken)
          : await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates?limit=10`).then(r => r.json()).then(d => ({ ok: true, data: d }));
        const updates = res?.data?.result;
        if (Array.isArray(updates) && updates.length > 0) {
          const chatId = String(updates[updates.length - 1]?.message?.chat?.id || updates[updates.length - 1]?.chat?.id || '');
          if (chatId) {
            setTgChatId(chatId); setTgPolling(false); setTgStepLoading(false);
            setTgSubStep(5); saveTgDraft({ chatId });
            return;
          }
        }
        if (attempts < 15) { setTimeout(poll, 2000); }
        else {
          setTgPolling(false); setTgStepLoading(false);
          setTgStepError('⏱ No se detectó ningún mensaje. Envía cualquier mensaje a tu bot en Telegram e intenta de nuevo.');
        }
      } catch (e: any) { setTgPolling(false); setTgStepLoading(false); setTgStepError(`❌ Error: ${e?.message}`); }
    };
    poll();
  };

  const handleTgFinishSetup = async () => {
    setTgStepLoading(true);
    const api = (window as any).electronAPI;
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: tgChatId,
      text: `🎉 *¡Telegram configurado correctamente!*\n\nSistema: FixManager\n\nA partir de ahora recibirás las notificaciones del taller aquí. ✅`,
      parse_mode: 'Markdown',
    });
    try { if (api?.sendTelegram) await api.sendTelegram(url, body); } catch {}
    clearTgDraft(); setTgStepLoading(false); setTgTestSent(true); setTgSubStep(6);
  };

  // Step 9 — WhatsApp
  const [waMode,     setWaMode]     = useState<'disabled' | 'web' | 'integrated' | null>(null);
  const [waSubStep,  setWaSubStep]  = useState<0|1|2|3>(0);
  const [waQr,       setWaQr]       = useState<string>('');       // data-url PNG del QR
  const [waQrRaw,    setWaQrRaw]    = useState<string>('');       // string QR crudo
  const [waStatus,   setWaStatus]   = useState<string>('');       // CONNECTING / QR_READY / CONNECTED
  const [waPhone,    setWaPhone]    = useState<string>('');
  const [waError,    setWaError]    = useState<string | null>(null);

  // ── Render QR desde string crudo ──────────────────────────────────────
  useEffect(() => {
    if (!waQrRaw) { setWaQr(''); return; }
    QRCode.toDataURL(waQrRaw, { width: 220, margin: 2 })
      .then(url => setWaQr(url))
      .catch(() => setWaQr(''));
  }, [waQrRaw]);

  // ── Escuchar eventos IPC de WhatsApp cuando estamos en sub-paso 1/2 ──
  useEffect(() => {
    if (step !== 9 || waMode !== 'integrated') return;
    const api = (window as any).electronAPI;
    if (!api) return;
    api.onWhatsappQrCode?.((qr: string) => {
      setWaQrRaw(qr);
      setWaStatus('QR_READY');
      setWaSubStep(2);
    });
    api.onWhatsappStatusChange?.((status: string, phone?: string) => {
      setWaStatus(status);
      if (status === 'CONNECTED') {
        setWaPhone(phone || '');
        setWaSubStep(3);
      }
    });
  }, [step, waMode]);

  const handleWaChooseMode = (mode: 'disabled' | 'web' | 'integrated') => {
    setWaMode(mode);
    setWaError(null);
    if (mode === 'integrated') {
      setWaSubStep(1);
    }
  };

  const handleWaStartConnect = () => {
    const api = (window as any).electronAPI;
    api?.whatsappConnect?.();
    setWaStatus('CONNECTING');
    setWaSubStep(2);
  };

  const handleWaDisconnect = () => {
    const api = (window as any).electronAPI;
    api?.whatsappDisconnect?.();
    setWaMode(null); setWaSubStep(0); setWaQr(''); setWaQrRaw('');
    setWaStatus(''); setWaPhone('');
  };

  // Step 5 — Impresoras (old Step 4)
  const [usePrinters,       setUsePrinters]       = useState<boolean | null>(null);
  const [ecoSilent,         setEcoSilent]         = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterOption[]>([]);
  const [loadingPrinters,   setLoadingPrinters]   = useState(false);
  const [ticketPrinterName, setTicketPrinterName] = useState('');
  const [ticketInterface,   setTicketInterface]   = useState<'USB' | 'Bluetooth' | 'Ethernet'>('USB');
  const [ticketPaperWidth,  setTicketPaperWidth]  = useState<'58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado'>('80mm');
  const [labelPrinterName,  setLabelPrinterName]  = useState('');
  const [labelInterface,    setLabelInterface]    = useState<'USB' | 'Bluetooth' | 'Ethernet'>('USB');
  const [labelPaperSize,     setLabelPaperSize]     = useState<'51x25mm' | '50x30mm' | '40x20mm' | '40x30mm' | '60x30mm' | '30x15mm' | '38x25mm' | '57x32mm' | '100x50mm' | '58x40mm' | '80x50mm'>('51x25mm');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs
  const firstInputRef  = useRef<HTMLInputElement>(null); // storeName
  const sloganRef      = useRef<HTMLInputElement>(null);
  const phoneRef       = useRef<HTMLInputElement>(null);
  const addressRef     = useRef<HTMLInputElement>(null);
  const adminNameRef   = useRef<HTMLInputElement>(null);
  const adminPinRef    = useRef<HTMLInputElement>(null);
  const adminConfRef   = useRef<HTMLInputElement>(null);

  // ── Dynamic theme tokens (computed from selectedTheme) ────────────────────
  const isRetro  = selectedTheme === 'retro-window';
  const isFluent = selectedTheme === 'fluent';

  const RAISED = isRetro
    ? 'border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070]'
    : '';

  const SUNKEN = isRetro
    ? 'border-2 border-t-[#707070] border-l-[#707070] border-b-white border-r-white'
    : 'border border-zinc-700 rounded-lg';

  const INPUT = isRetro
    ? `w-full bg-white border-2 border-t-[#707070] border-l-[#707070] border-b-white border-r-white px-2 py-1.5 text-sm font-mono text-zinc-900 outline-none placeholder-zinc-400`
    : `w-full bg-[#1c1f27] border border-zinc-600 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-zinc-600`;

  const BTN = isRetro
    ? `border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] bg-[#c0c4cb] px-4 py-1 text-xs font-bold text-zinc-900 cursor-pointer select-none active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white`
    : `px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 cursor-pointer hover:bg-zinc-700`;

  // Outer wrapper
  const outerStyle: React.CSSProperties = isRetro
    ? { background: '#d4d8e0' }
    : isFluent
    ? { background: '#f0f2f5' }
    : { background: '#070b14' };

  // Card
  const cardClass = isRetro
    ? `${RAISED} bg-[#c0c4cb] w-full max-w-[660px] shadow-2xl flex flex-col`
    : `bg-[#0d121f] border border-zinc-700 rounded-2xl w-full max-w-[660px] shadow-2xl flex flex-col`;

  // Title bar
  const titleBarClass = isRetro
    ? `bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-[5px] flex items-center gap-2`
    : `bg-[#0d0f14] border-b border-zinc-800 px-3 py-2 flex items-center gap-2 rounded-t-2xl`;

  // Tab bar
  const tabBarClass = isRetro
    ? `flex border-b-2 border-[#707070] bg-[#c0c4cb] px-2 pt-1.5 gap-px overflow-x-auto`
    : `flex border-b border-zinc-800 bg-[#0d121f] px-2 pt-1.5 gap-0.5 overflow-x-auto`;

  // Tab button classes
  const tabActive = isRetro
    ? `border-t-white border-l-white border-r-[#707070] bg-[#c0c4cb] -mb-[2px] pb-[8px] relative z-10 text-zinc-900`
    : `border-b-2 border-b-indigo-500 -mb-[2px] pb-[8px] relative z-10 text-white bg-[#0d121f]`;
  const tabDone = isRetro
    ? `border-t-[#999] border-l-[#999] border-r-[#555] bg-[#b8bcC3] text-zinc-600 hover:bg-[#bec2c9]`
    : `text-zinc-400 hover:text-zinc-200 border-b-2 border-b-transparent`;
  const tabFuture = isRetro
    ? `border-t-[#999] border-l-[#999] border-r-[#555] bg-[#b0b4bb] text-zinc-400 cursor-not-allowed`
    : `text-zinc-600 cursor-not-allowed border-b-2 border-b-transparent`;

  // Content area
  const contentClass = isRetro
    ? `p-5 space-y-3 overflow-y-auto flex-1`
    : `p-5 space-y-3 overflow-y-auto flex-1`;

  // Footer
  const footerClass = isRetro
    ? `border-t-2 border-t-[#707070] bg-[#c0c4cb] px-4 py-2.5 flex items-center justify-between`
    : `border-t border-zinc-800 bg-[#0d121f] px-4 py-3 flex items-center justify-between rounded-b-2xl`;

  // Primary (Next) button
  const btnNext = isRetro
    ? `${RAISED} bg-[#000080] text-white px-5 py-1.5 text-xs font-black cursor-pointer flex items-center gap-1.5`
    : `bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-1.5 text-xs font-black cursor-pointer flex items-center gap-1.5 rounded-lg`;

  // Complete button
  const btnComplete = isRetro
    ? `${RAISED} bg-[#006400] text-white px-5 py-1.5 text-xs font-black cursor-pointer flex items-center gap-1.5`
    : `bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-1.5 text-xs font-black cursor-pointer flex items-center gap-1.5 rounded-lg`;

  // Back button
  const btnBack = isRetro
    ? `${BTN} flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed`
    : `flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 cursor-pointer hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed`;

  // Dot progress
  const dotActive = isRetro ? 'w-4 h-2.5 bg-[#000080]' : 'w-4 h-2.5 bg-indigo-500';
  const dotDone   = isRetro ? 'w-2.5 h-2.5 bg-[#006600]' : 'w-2.5 h-2.5 bg-emerald-500';
  const dotFuture = isRetro ? 'w-2.5 h-2.5 bg-zinc-400'  : 'w-2.5 h-2.5 bg-zinc-700';

  // Section info boxes
  const infoBoxYellow = isRetro
    ? `${SUNKEN} bg-[#ffffcc] p-2.5 text-[11px] text-zinc-700 leading-relaxed`
    : `bg-amber-900/20 border border-amber-700/40 rounded-lg p-2.5 text-[11px] text-amber-200 leading-relaxed`;

  const infoBoxGreen = isRetro
    ? `${SUNKEN} bg-[#ccffcc] p-2 flex items-center gap-2 text-[11px] font-bold text-[#006600]`
    : `bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-2 flex items-center gap-2 text-[11px] font-bold text-emerald-400`;

  const summaryBox = isRetro
    ? `${SUNKEN} bg-white p-3`
    : `bg-zinc-800/50 border border-zinc-700 rounded-lg p-3`;

  const summaryEditBtn = isRetro
    ? `${RAISED} px-2 py-0.5 text-[9px] font-bold text-zinc-700 cursor-pointer`
    : `px-2 py-0.5 text-[9px] font-bold rounded bg-zinc-700 border border-zinc-600 text-zinc-300 cursor-pointer hover:bg-zinc-600`;

  const currencyBadge = isRetro
    ? `${RAISED} bg-[#c0c4cb] px-2 py-0.5 text-[10px] font-black font-mono text-zinc-800`
    : `bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-[10px] font-black font-mono text-zinc-200`;

  // Logo upload handlers
  const handleSystemLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleTicketLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTicketLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLabelLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLabelLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleMediaCartaLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setMediaCartaLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Advance focus to next ref on Enter key
  const advance = (nextRef: React.RefObject<HTMLInputElement | null>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); nextRef.current?.focus(); }
    };

  // Derived values
  const selectedCurrency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const selectedCountry  = COUNTRY_CODES.find(c => c.name === selectedCountryName) || COUNTRY_CODES.find(c => c.code === phoneCode) || COUNTRY_CODES[0];

  // Focus management — step 1 (theme) has no text inputs
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    if (step === 4) {
      const t = setTimeout(() => adminPinRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Sincronizar el tema elegido con las clases del body para previsualización real
  useEffect(() => {
    const prevClass = document.body.className;
    document.body.className = `theme-${selectedTheme} mode-${selectedThemeMode}`;
    return () => {
      document.body.className = prevClass;
    };
  }, [selectedTheme, selectedThemeMode]);

  const loadPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const list = await (window as any).electronAPI?.getPrinters?.() || [];
      setAvailablePrinters(list);
    } catch { setAvailablePrinters([]); }
    finally   { setLoadingPrinters(false); }
  };

  useEffect(() => {
    if (step === 5 && usePrinters === true && availablePrinters.length === 0) loadPrinters();
  }, [step, usePrinters]); // eslint-disable-line

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (!storeName.trim()) e.storeName = 'El nombre del negocio es obligatorio.';
    }
    if (s === 4) {
      if (!adminName.trim())            e.adminName       = 'El nombre es obligatorio.';
      if (!/^\d{4}$/.test(adminPin))    e.adminPin        = 'El PIN debe ser de exactamente 4 dígitos.';
      if (adminPin !== adminPinConfirm) e.adminPinConfirm = 'Los PINs no coinciden.';
    }
    if (s === 5) {
      if (usePrinters === null) e.usePrinters = 'Por favor selecciona una opción.';
      if (usePrinters === true && !ticketPrinterName) e.ticketPrinter = 'Debes seleccionar la impresora de tickets.';
      if (usePrinters === true && !labelPrinterName)  e.labelPrinter  = 'Debes seleccionar la impresora de etiquetas.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [returnToSummary, setReturnToSummary] = useState(false);

  const handleNext = () => {
    if (!validate(step)) return;
    if (returnToSummary) { setReturnToSummary(false); setStep(10); }
    else setStep(s => Math.min(s + 1, 10));
  };
  const handleBack = () => { setErrors({}); setStep(s => Math.max(s - 1, 1)); };
  const handleComplete = () => {
    if (!validate(step)) return;
    const selectedCountry = COUNTRY_CODES.find(c => c.code === phoneCode);
    const cfg: Partial<WorkshopConfig> = {
      ...INITIAL_CONFIG,
      storeName:      storeName.trim(),
      slogan:         slogan.trim(),
      phone:          phone.trim() ? `${phoneCode} ${phone.trim()}` : '',
      phoneCountryCode: phoneCode,
      countryName:    selectedCountry?.name || '',
      addressCountry: selectedCountry?.name || '',
      whatsappDefaultCountryCode: phoneCode.replace('+', ''),
      address:        address.trim(),
      currencySymbol: selectedCurrency.symbol,
      logoUrl:        logoUrl || '',
      ticketLogoUrl:  ticketLogoUrl || '',
      mediaCartaLogoUrl: mediaCartaLogoUrl || '',
      labelLogoUrl:   labelLogoUrl || '',
      theme:          selectedTheme,
      themeMode:      selectedThemeMode,
      workshopMode,
    };
    if (usePrinters) {
      if (ticketPrinterName) {
        cfg.ticketPrinterBrand  = ticketPrinterName;
        cfg.printerInterface    = detectInterface(ticketPrinterName);
        cfg.ticketPaperWidth    = ticketPaperWidth;
      }
      if (labelPrinterName)  { 
        cfg.labelPrinterBrand = labelPrinterName; 
        cfg.labelPrinterInterface = detectInterface(labelPrinterName); 
        cfg.labelPaperSize    = labelPaperSize;
      }
    } else {
      cfg.ecoMode = true;
      if (ecoSilent) cfg.ecoSilent = true;
    }
    const adminUser: AppUser = {
      id:          `user-admin-${Date.now()}`,
      name:        adminName.trim(),
      role:        'admin',
      pin:         adminPin,
      createdAt:   new Date().toISOString(),
      permissions: ADMIN_PERMISSIONS,
    };
    const employeeUsers: AppUser[] = employees.map((e, i) => ({
      id:          `user-emp-${Date.now()}-${i}`,
      name:        e.name,
      role:        'employee' as const,
      pin:         e.pin,
      createdAt:   new Date().toISOString(),
      permissions: EMPLOYEE_PERMISSIONS,
    }));
    if (tgUse && tgToken && tgChatId) {
      cfg.telegramBotToken = tgToken;
      cfg.telegramChatId   = tgChatId;
    }
    if (waMode === 'integrated' && waStatus === 'CONNECTED') {
      cfg.whatsappMode = 'integrated';
    } else if (waMode === 'web') {
      cfg.whatsappMode = 'direct';
    } else {
      cfg.whatsappMode = 'disabled';
    }
    localStorage.setItem('fixmanager_country_configured_v2', 'true');
    onComplete(cfg, adminUser, employeeUsers);
  };

  // ── DEV: rellenar datos de prueba ─────────────────────────────────────────
  const fillTestData = () => {
    setStoreName('Tu Taller de Reparaciones');
    setSlogan('Expertos en reparación de celulares');
    setPhoneCode('+52');
    setPhone('(351) 157-4876');
    setAddress('Av. Principal #104, Col. Centro');
    setCurrencyCode('MXN');
    setAdminName('Hugo García');
    setAdminPin('1234');
    setAdminPinConfirm('1234');
    setUsePrinters(false);
    setSelectedTheme('retro-window');
    setSelectedThemeMode('light');
    setErrors({});
  };

  // ── Auto-detectar interfaz desde nombre de impresora ─────────────────────
  const detectInterface = (name: string): 'USB' | 'Bluetooth' | 'Ethernet' => {
    const n = name.toLowerCase();
    if (n.includes('bluetooth') || n.includes('bt ') || n.includes(' bt')) return 'Bluetooth';
    if (n.includes('ethernet') || n.includes('network') || n.includes('lan') || n.includes('wifi') || n.includes('wi-fi')) return 'Ethernet';
    return 'USB';
  };

  // ── Capitalización automática ─────────────────────────────────────────────
  const toTitleCase = (s: string) =>
    s.replace(/\b(\w)(\S*)/g, (_, first, rest) => first.toUpperCase() + rest);
  const toSentenceCase = (s: string) =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

  // ── small helpers ─────────────────────────────────────────────────────────
  const lbl = (text: string, req = false) => (
    <label className={`block text-[10px] font-black uppercase mb-0.5 tracking-wide ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const err = (key: string) =>
    errors[key] ? <p className="text-red-500 text-[10px] font-bold mt-0.5 flex items-center gap-1">⚠ {errors[key]}</p> : null;

  const ifaceBtn = (
    v: 'USB' | 'Bluetooth' | 'Ethernet',
    cur: 'USB' | 'Bluetooth' | 'Ethernet',
    set: (x: 'USB' | 'Bluetooth' | 'Ethernet') => void,
  ) => (
    <button key={v} type="button" onClick={() => set(v)}
      className={`flex-1 py-0.5 text-[10px] font-bold cursor-pointer border select-none ${
        cur === v
          ? isRetro ? 'bg-[#000080] text-white border-[#000080]' : 'bg-indigo-600 text-white border-indigo-600 rounded'
          : isRetro ? `bg-[#c0c4cb] text-zinc-700 ${RAISED}` : 'bg-zinc-800 text-zinc-400 border-zinc-600 hover:bg-zinc-700 rounded'
      }`}
    >{v}</button>
  );

  const sectionHeader = (icon: React.ReactNode, text: string) => (
    <div className={isRetro
      ? `${SUNKEN} bg-white p-2.5 flex items-center gap-3`
      : `bg-zinc-800/50 border border-zinc-700 rounded-lg p-2.5 flex items-center gap-3`}>
      <div className="w-8 h-8 flex items-center justify-center shrink-0">{icon}</div>
      <p className={`text-sm font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>{text}</p>
    </div>
  );

  // ── Fondo simulado de la app ──────────────────────────────────────────────
  // Paletas por tema
  const bg = isRetro
    ? { page: '#d4d8e0', sidebar: '#b0b4bb', sidebarBorder: '2px solid #707070', topbar: '#c0c4cb', topbarBorder: '2px solid #707070', card: '#c0c4cb', cardBorder: '2px solid #b0b4bb', accent: '#000080', muted: '#a0a4ab', bar: '#000080', blurOverlay: 'rgba(192,196,203,0.5)' }
    : isFluent
    ? { page: '#f0f2f5', sidebar: 'rgba(255,255,255,0.92)', sidebarBorder: '1px solid rgba(0,0,0,0.08)', topbar: 'rgba(255,255,255,0.95)', topbarBorder: '1px solid rgba(0,0,0,0.06)', card: 'rgba(255,255,255,0.9)', cardBorder: '1px solid rgba(0,0,0,0.07)', accent: '#0078d4', muted: '#d1d5db', bar: '#0078d4', blurOverlay: 'rgba(240,242,245,0.45)' }
    : { page: '#070b14', sidebar: '#0d0f1a', sidebarBorder: '1px solid #1e293b', topbar: '#0d121f', topbarBorder: '1px solid #1e293b', card: '#0d121f', cardBorder: '1px solid #1e293b', accent: '#312e81', muted: '#1e293b', bar: '#1e3a5f', blurOverlay: 'rgba(7,11,20,0.55)' };

  const FakeAppBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Page bg */}
      <div className="absolute inset-0" style={{ background: bg.page }} />
      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-[72px] flex flex-col items-center py-3 gap-2"
        style={{ background: bg.sidebar, borderRight: bg.sidebarBorder }}>
        <div className="w-9 h-9 rounded-lg mb-2" style={{ background: bg.accent }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-10 h-8 rounded" style={{ background: i===0 ? bg.accent : bg.card, opacity: i===0?1:0.7 }} />
        ))}
      </div>
      {/* Main area */}
      <div className="absolute left-[72px] right-0 top-0 bottom-0 flex flex-col">
        {/* Top bar */}
        <div className="h-11 flex items-center px-4 gap-3 shrink-0"
          style={{ background: bg.topbar, borderBottom: bg.topbarBorder }}>
          {[120,80,100,90].map((w,i) => <div key={i} className="h-5 rounded" style={{ width: w, background: bg.muted }} />)}
          <div className="flex-1"/>
          {[1,2,3].map(i=><div key={i} className="w-7 h-7 rounded-full" style={{ background: bg.muted }}/>)}
        </div>
        {/* Content grid */}
        <div className="flex-1 p-4 grid grid-cols-3 gap-3 content-start overflow-hidden"
          style={{ background: bg.page }}>
          {/* Stat cards */}
          {[...Array(3)].map((_,i)=>(
            <div key={i} className="rounded-lg p-3 space-y-2"
              style={{ background: bg.card, border: bg.cardBorder, height: 80 }}>
              <div className="h-2 rounded-full w-1/2" style={{ background: bg.muted }}/>
              <div className="h-5 rounded w-3/4" style={{ background: bg.accent, opacity: 0.8 }}/>
            </div>
          ))}
          {/* Table card */}
          <div className="col-span-3 rounded-lg p-3 space-y-1.5"
            style={{ background: bg.card, border: bg.cardBorder, height: 180 }}>
            <div className="h-2.5 rounded w-1/4 mb-3" style={{ background: bg.muted }}/>
            {[...Array(5)].map((_,i)=>(
              <div key={i} className="flex gap-2">
                {[40,25,20,15].map((w,j)=>(
                  <div key={j} className="h-2 rounded-full" style={{ width:`${w}%`, background: bg.muted, opacity: 1-i*0.15 }}/>
                ))}
              </div>
            ))}
          </div>
          {/* Two more cards */}
          {[...Array(2)].map((_,i)=>(
            <div key={i} className={`${i===0?'col-span-2':'col-span-1'} rounded-lg p-3`}
              style={{ background: bg.card, border: bg.cardBorder, height: 120 }}>
              <div className="h-2 rounded-full w-1/3 mb-2" style={{ background: bg.muted }}/>
              <div className="flex gap-1 h-14 items-end">
                {[...Array(8)].map((_,j)=>(
                  <div key={j} className="flex-1 rounded-t" style={{ height:`${30+Math.sin(j)*25+i*10}%`, background: bg.bar, opacity:0.6+j*0.05 }}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Blur overlay */}
      <div className="absolute inset-0" style={{ backdropFilter: 'blur(14px) saturate(0.5)', background: bg.blurOverlay }} />
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex items-center justify-center select-none overflow-auto py-4 px-2 relative"
      style={outerStyle}
    >
      <FakeAppBackground />
      <div className={cardClass} style={{ position: 'relative', zIndex: 10, maxHeight: 'calc(100vh - 32px)' }}>

        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <div className={titleBarClass}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Volver a la pantalla de bienvenida"
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-white/20 hover:bg-white/30 text-white cursor-pointer border border-white/30 select-none mr-1"
            >
              ← Atrás
            </button>
          )}
          <Wrench className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="text-white text-xs font-bold flex-1 tracking-wide leading-none">
            Asistente de Configuración Inicial — FIXMANAGER
          </span>
        </div>

        {/* ── Step tabs ──────────────────────────────────────────────────── */}
        <div className={tabBarClass}>
          {STEPS.map(s => {
            const Icon   = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <button
                key={s.id} type="button"
                onClick={() => done && setStep(s.id)}
                disabled={!done && !active}
                title={!active ? s.label : undefined}
                className={`flex items-center gap-1.5 py-1.5 text-[10px] font-bold whitespace-nowrap overflow-hidden
                  ${active ? 'px-3' : 'px-2.5 justify-center'}
                  ${isRetro ? 'border-t-2 border-l-2 border-r-2' : 'border-b-2'} transition-all duration-200 cursor-pointer
                  ${active ? tabActive : done ? tabDone : tabFuture}`}
                style={{ minWidth: active ? 0 : 32, maxWidth: active ? 200 : 32, flex: active ? '1 1 auto' : '0 0 32px' }}
              >
                {done ? <Check className={`w-3 h-3 shrink-0 ${isRetro ? 'text-[#006600]' : 'text-emerald-400'}`} /> : <Icon className="w-3 h-3 shrink-0" />}
                {active && <span className="truncate">{s.label}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className={contentClass}>

          {/* ════════════════════════════════════════════════════════════════
              PASO 1 — Apariencia  (live theme preview)
          ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (<>
            {sectionHeader(<Palette className={`w-5 h-5 ${isRetro ? 'text-[#5b21b6]' : 'text-indigo-400'}`} />, 'Elige la Apariencia')}

            <div className="space-y-4 pt-1">
              <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Selecciona el estilo visual que más te guste. La interfaz cambiará en tiempo real para que veas cómo se verá el sistema. Podrás cambiarlo después en <strong>Ajustes → Apariencia</strong>.
              </p>

              <div className="grid grid-cols-1 gap-3">

                {/* ── Retro (Win95) ── */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('retro-window')}
                  className={`w-full text-left cursor-pointer transition-none ${
                    selectedTheme === 'retro-window'
                      ? isRetro
                        ? 'border-2 border-[#000080] bg-[#e8ecf5]'
                        : 'border-2 border-indigo-500 bg-zinc-800/60 rounded-xl'
                      : isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-2 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                  }`}
                >
                  {/* Preview */}
                  <div className={`overflow-hidden ${!isRetro ? 'rounded-t-xl' : ''}`} style={{ height: 110 }}>
                    <div className="w-full h-full flex items-center justify-center p-3"
                      style={{ background: 'repeating-linear-gradient(45deg,#007070 0,#007070 1px,#008080 1px,#008080 8px)' }}>
                      <div className="bg-[#c0c4cb] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-md" style={{ width: 200 }}>
                        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-1.5 py-1 flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#c0c4cb] border border-[#707070]" />
                          <span className="text-white text-[7px] font-bold flex-1">FIXMANAGER — POS</span>
                          <div className="flex gap-0.5">
                            {['_','□','×'].map(c => <div key={c} className="w-3 h-2.5 bg-[#c0c4cb] border border-[#707070] flex items-center justify-center text-[5px] font-black">{c}</div>)}
                          </div>
                        </div>
                        <div className="p-1.5 flex gap-1">
                          <div className="w-8 bg-[#eaeef3] border border-[#707070] flex flex-col gap-0.5 p-0.5">
                            {['POS','Órd','Stock','Cfg'].map(t => <div key={t} className="text-[5px] font-bold text-zinc-700 bg-[#c0c4cb] px-0.5 py-px">{t}</div>)}
                          </div>
                          <div className="flex-1 bg-white border border-[#707070] p-1 space-y-0.5">
                            <div className="h-1.5 bg-[#000080] rounded-none w-full" />
                            <div className="h-1 bg-[#c0c4cb] w-3/4" />
                            <div className="h-1 bg-[#c0c4cb] w-1/2" />
                            <div className="h-3 bg-[#eaeef3] border border-[#707070] mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className={`px-3 py-2 flex items-center gap-2 ${isRetro ? 'border-t border-[#707070]' : 'border-t border-zinc-700'}`}>
                    {selectedTheme === 'retro-window' && <Check className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />}
                    <div>
                      <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>Retro · Windows 95</p>
                      <p className={`text-[9px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Estilo clásico con bordes en relieve y fondo de escritorio verde.</p>
                    </div>
                  </div>
                </button>

                {/* ── Moderno Oscuro ── */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('modern')}
                  className={`w-full text-left cursor-pointer transition-none ${
                    selectedTheme === 'modern'
                      ? isRetro
                        ? 'border-2 border-[#000080] bg-[#e8ecf5]'
                        : 'border-2 border-indigo-500 bg-zinc-800/60 rounded-xl'
                      : isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-2 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                  }`}
                >
                  {/* Preview */}
                  <div className={`overflow-hidden ${!isRetro ? 'rounded-t-xl' : ''}`} style={{ height: 110 }}>
                    <div className="w-full h-full flex items-center justify-center p-3" style={{ background: '#0a0e1a' }}>
                      <div className="rounded-xl shadow-2xl overflow-hidden" style={{ width: 200, background: '#0d121f', border: '1px solid #1e293b' }}>
                        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ background: '#0d121f', borderBottom: '1px solid #1e293b' }}>
                          <div className="w-4 h-4 rounded-lg flex items-center justify-center" style={{ background: '#312e81' }}>
                            <div className="w-2 h-2 rounded-sm" style={{ background: '#818cf8' }} />
                          </div>
                          <span className="text-[7px] font-black" style={{ color: '#e2e8f0' }}>FIXMANAGER</span>
                          <div className="flex-1" />
                          <div className="flex gap-1">
                            {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#334155' }} />)}
                          </div>
                        </div>
                        <div className="flex" style={{ height: 64 }}>
                          <div className="w-8 flex flex-col items-center gap-1 py-1" style={{ background: '#0d121f', borderRight: '1px solid #1e293b' }}>
                            {['P','O','S','C'].map(t => <div key={t} className="w-5 h-3 rounded flex items-center justify-center text-[4px] font-black" style={{ background: '#1e293b', color: '#94a3b8' }}>{t}</div>)}
                          </div>
                          <div className="flex-1 p-1.5 space-y-1">
                            <div className="h-2 rounded-full w-full" style={{ background: '#4f46e5' }} />
                            <div className="h-1.5 rounded-full w-3/4" style={{ background: '#1e293b' }} />
                            <div className="h-1.5 rounded-full w-1/2" style={{ background: '#1e293b' }} />
                            <div className="h-4 rounded-lg mt-0.5" style={{ background: '#111827', border: '1px solid #1e293b' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className={`px-3 py-2 flex items-center gap-2 ${isRetro ? 'border-t border-[#707070]' : 'border-t border-zinc-700'}`}>
                    {selectedTheme === 'modern' && <Check className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />}
                    <div>
                      <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>Moderno · Oscuro</p>
                      <p className={`text-[9px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Interfaz oscura ideal para ambientes con poca luz.</p>
                    </div>
                  </div>
                </button>

                {/* ── Fluent (Windows 11) ── */}
                <button
                  type="button"
                  onClick={() => setSelectedTheme('fluent')}
                  className={`w-full text-left cursor-pointer transition-none ${
                    selectedTheme === 'fluent'
                      ? isRetro
                        ? 'border-2 border-[#000080] bg-[#e8ecf5]'
                        : 'border-2 border-indigo-500 bg-zinc-800/60 rounded-xl'
                      : isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-2 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                  }`}
                >
                  {/* Preview */}
                  <div className={`overflow-hidden ${!isRetro ? 'rounded-t-xl' : ''}`} style={{ height: 110 }}>
                    <div className="w-full h-full flex items-center justify-center p-3" style={{ background: '#e8e8e8' }}>
                      <div className="rounded-xl shadow-lg overflow-hidden" style={{ width: 200, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <div className="w-4 h-4 rounded-lg flex items-center justify-center" style={{ background: '#0078d4' }}>
                            <div className="w-2 h-2 rounded-sm" style={{ background: 'white' }} />
                          </div>
                          <span className="text-[7px] font-black" style={{ color: '#1a1a1a' }}>FIXMANAGER</span>
                          <div className="flex-1" />
                        </div>
                        <div className="flex" style={{ height: 64 }}>
                          <div className="w-10 flex flex-col items-center gap-1 py-1" style={{ background: 'rgba(255,255,255,0.9)', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                            {[{c:'#0078d4'},{c:'#16a34a'},{c:'#f59e0b'},{c:'#8b5cf6'}].map((x,i) => <div key={i} className="w-6 h-3 rounded-md flex items-center justify-center text-[4px] font-bold" style={{ background: `${x.c}18`, color: x.c }}></div>)}
                          </div>
                          <div className="flex-1 p-1.5 space-y-1">
                            <div className="h-2 rounded-full w-full" style={{ background: '#0078d4' }} />
                            <div className="h-1.5 rounded-full w-3/4" style={{ background: '#e5e7eb' }} />
                            <div className="h-1.5 rounded-full w-1/2" style={{ background: '#e5e7eb' }} />
                            <div className="h-4 rounded-lg mt-0.5" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className={`px-3 py-2 flex items-center gap-2 ${isRetro ? 'border-t border-[#707070]' : 'border-t border-zinc-700'}`}>
                    {selectedTheme === 'fluent' && <Check className={`w-3.5 h-3.5 shrink-0 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />}
                    <div>
                      <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>Fluent · Windows 11</p>
                      <p className={`text-[9px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Interfaz clara y moderna inspirada en el diseño Fluent de Windows 11.</p>
                    </div>
                  </div>
                </button>

              </div>

              {/* Selector de Variante */}
              <div className={`flex flex-col space-y-2 pt-4 border-t ${isRetro ? 'border-zinc-400' : 'border-zinc-800'}`}>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Variante del Tema (Modo)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedThemeMode('light')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase cursor-pointer text-center transition-all ${
                      selectedThemeMode === 'light'
                        ? isRetro
                          ? 'bg-[#000080] text-white border-2 border-t-zinc-800 border-l-zinc-800 border-b-white border-r-white shadow-inner font-sans'
                          : 'bg-indigo-600 text-white rounded-xl border border-indigo-500 shadow-sm font-sans'
                        : isRetro
                          ? 'bg-[#dfdfdf] text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 active:border-b-white active:border-r-white active:border-t-zinc-650 active:border-l-zinc-650 font-sans'
                          : 'bg-zinc-800/30 border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800/50 font-sans'
                    }`}
                  >
                    ☀️ Modo Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedThemeMode('dark')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase cursor-pointer text-center transition-all ${
                      selectedThemeMode === 'dark'
                        ? isRetro
                          ? 'bg-[#000080] text-white border-2 border-t-zinc-800 border-l-zinc-800 border-b-white border-r-white shadow-inner font-sans'
                          : 'bg-indigo-600 text-white rounded-xl border border-indigo-500 shadow-sm font-sans'
                        : isRetro
                          ? 'bg-[#dfdfdf] text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 active:border-b-white active:border-r-white active:border-t-zinc-650 active:border-l-zinc-650 font-sans'
                          : 'bg-zinc-800/30 border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800/50 font-sans'
                    }`}
                  >
                    🌙 Modo Oscuro
                  </button>
                </div>
              </div>
            </div>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 2 — Datos del Negocio
          ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (<>
            {sectionHeader(<Building2 className={`w-5 h-5 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />, 'Información de tu Negocio')}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

              {/* Nombre */}
              <div className="sm:col-span-2">
                {lbl('Nombre del Taller', true)}
                <input ref={firstInputRef} type="text" value={storeName}
                  onChange={e => setStoreName(toTitleCase(e.target.value))}
                  onKeyDown={advance(sloganRef)}
                  className={INPUT} placeholder="Ej: Tu Taller de Reparaciones" />
                {err('storeName')}
              </div>

              {/* Slogan */}
              <div className="sm:col-span-2">
                {lbl('Lema / Slogan')}
                <input ref={sloganRef} type="text" value={slogan}
                  onChange={e => setSlogan(toTitleCase(e.target.value))}
                  onKeyDown={advance(phoneRef)}
                  className={INPUT} placeholder="Ej: Expertos en reparación de celulares" />
              </div>

              {/* Teléfono con clave de país */}
              <div className="sm:col-span-2">
                {lbl('Teléfono')}
                <div className="flex gap-1 items-stretch">
                  {/* Country code selector */}
                  <div className={`${SUNKEN} ${isRetro ? 'bg-white' : 'bg-[#1c1f27]'} flex items-center`} style={{ minWidth: 130 }}>
                    <select
                      value={selectedCountry.name}
                      onChange={e => {
                        const country = COUNTRY_CODES.find(c => c.name === e.target.value);
                        if (country) {
                          setSelectedCountryName(country.name);
                          setPhoneCode(country.code);
                          if (country.currencyCode) {
                            setCurrencyCode(country.currencyCode);
                          }
                        }
                      }}
                      className={`bg-transparent text-xs font-mono outline-none px-1.5 py-1.5 w-full cursor-pointer ${isRetro ? 'text-zinc-900' : 'text-zinc-200'}`}
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={`${c.name}-${i}`} value={c.name}>
                          {c.flag}  {c.code}  {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Number */}
                  <div className="flex items-center gap-1 flex-1">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <input ref={phoneRef} type="tel" value={phone}
                      maxLength={14}
                      onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                      onKeyDown={advance(addressRef)}
                      className={INPUT}
                      placeholder="(351) 157-4876" />
                  </div>
                </div>
                {/* Preview */}
                {phone.trim() && (
                  <p className={`text-[10px] mt-0.5 font-mono ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {selectedCountry.flag} Número completo: {phoneCode} {phone}
                  </p>
                )}
              </div>

              {/* Currency selector */}
              <div>
                {lbl('Moneda', true)}
                <div className={`${SUNKEN} ${isRetro ? 'bg-white' : 'bg-[#1c1f27]'}`}>
                  <select
                    value={currencyCode}
                    onChange={e => setCurrencyCode(e.target.value)}
                    className={`w-full bg-transparent text-xs font-mono outline-none px-2 py-1.5 cursor-pointer ${isRetro ? 'text-zinc-900' : 'text-zinc-200'}`}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag}  {c.code} — {c.name}  ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Preview badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-base leading-none">{selectedCurrency.flag}</span>
                  <span className={currencyBadge}>
                    {selectedCurrency.symbol}
                  </span>
                  <span className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>{selectedCurrency.name}</span>
                </div>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                {lbl('Dirección')}
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input ref={addressRef} type="text" value={address}
                    onChange={e => setAddress(toTitleCase(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                    className={INPUT} placeholder="Av. Principal #104, Col. Centro" />
                </div>
                <p className={`text-[10px] mt-1.5 flex items-center gap-1.5 ${isRetro ? 'text-zinc-500 font-bold' : 'text-zinc-400'}`}>
                  <span>📍</span>
                  <span>Podrás generar el código QR de Google Maps con tu dirección detallada en <strong>Ajustes → Datos del Negocio</strong>.</span>
                </p>
              </div>

            </div>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 3 — Logotipos
          ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (<>
            {sectionHeader(<ImagePlus className={`w-5 h-5 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />, 'Logotipos de la Marca')}

            <div className="space-y-4 pt-1">
              <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Personaliza la identidad visual de tu taller. Puedes subir tus logotipos ahora o continuar y agregarlos más tarde en <strong>Ajustes → Preferencias Globales</strong>. Todos los campos son opcionales.
              </p>

              {/* ── 1. Logo del Sistema ── */}
              <div className={`p-4 rounded-xl border space-y-3 ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800/40 border-zinc-700'}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <p className={`text-xs font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>1. Logo del Sistema</p>
                    <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Se muestra en el login, menú lateral superior y pantalla principal de la aplicación.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 rounded-lg'} inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'} cursor-pointer`}>
                        <ImagePlus className="w-3.5 h-3.5" />
                        {logoUrl ? 'Cambiar' : 'Subir imagen…'}
                        <input type="file" accept="image/*" onChange={handleSystemLogo} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button type="button" onClick={() => setLogoUrl('')}
                          className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 rounded-lg'} flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-500 cursor-pointer`}>
                          <X className="w-3 h-3" /> Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-5 flex justify-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-zinc-550 mb-1">Simulación App</span>
                      <div className={`${SUNKEN} w-[140px] h-[75px] p-2 flex flex-col justify-between items-center ${isRetro ? 'bg-[#c0c4cb] border-zinc-400' : 'bg-[#0d121f] border-zinc-700'}`}>
                        <div className="w-full flex justify-center items-center h-8 bg-black/10 rounded-sm">
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-0.5" />
                          ) : (
                            <Building2 className={`w-5 h-5 ${isRetro ? 'text-zinc-500' : 'text-zinc-650'}`} />
                          )}
                        </div>
                        <div className="w-full space-y-0.5">
                          <div className="h-1 w-full bg-white/20 rounded-sm" />
                          <div className="h-2 w-10 mx-auto bg-indigo-600/60 rounded-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. Logo del Ticket ── */}
              <div className={`p-4 rounded-xl border space-y-3 ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800/40 border-zinc-700'}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <p className={`text-xs font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>2. Logo del Ticket</p>
                    <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Se imprime en la parte superior de los tickets y comprobantes térmicos.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 rounded-lg'} inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'} cursor-pointer`}>
                        <ImagePlus className="w-3.5 h-3.5" />
                        {ticketLogoUrl ? 'Cambiar' : 'Subir imagen…'}
                        <input type="file" accept="image/*" onChange={handleTicketLogo} className="hidden" />
                      </label>
                      {ticketLogoUrl && (
                        <button type="button" onClick={() => setTicketLogoUrl('')}
                          className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 rounded-lg'} flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-500 cursor-pointer`}>
                          <X className="w-3 h-3" /> Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-5 flex justify-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-zinc-550 mb-1">Simulación Ticket</span>
                      <div className="w-[140px] h-[75px] bg-white border border-zinc-300 p-1.5 shadow-sm overflow-hidden flex flex-col items-center justify-between text-black font-sans leading-none">
                        <div className="w-full border-t border-dashed border-zinc-400" />
                        {ticketLogoUrl ? (
                          <img src={ticketLogoUrl} alt="Logo" className="max-h-5 max-w-[100px] object-contain" />
                        ) : (
                          <span className="text-[7px] font-black text-zinc-400">TALLER</span>
                        )}
                        <div className="text-[5px] text-zinc-500 font-bold mt-0.5">ORDEN DE SERVICIO</div>
                        <div className="w-full border-t border-zinc-300" />
                        <div className="w-full flex justify-between text-[4px] font-mono text-zinc-600">
                          <span>No: 1077</span>
                          <span>Total: $1,850</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 3. Logo de la Etiqueta ── */}
              <div className={`p-4 rounded-xl border space-y-3 ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800/40 border-zinc-700'}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <p className={`text-xs font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>3. Logo de las Etiquetas</p>
                    <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Se imprime en etiquetas de reparación (invertido a blanco) y etiquetas de producto.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 rounded-lg'} inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'} cursor-pointer`}>
                        <ImagePlus className="w-3.5 h-3.5" />
                        {labelLogoUrl ? 'Cambiar' : 'Subir imagen…'}
                        <input type="file" accept="image/*" onChange={handleLabelLogo} className="hidden" />
                      </label>
                      {labelLogoUrl && (
                        <button type="button" onClick={() => setLabelLogoUrl('')}
                          className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 rounded-lg'} flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-500 cursor-pointer`}>
                          <X className="w-3 h-3" /> Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-5 flex justify-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-zinc-555 mb-1">Simulación Etiqueta</span>
                      <div className="w-[140px] h-[75px] bg-white border border-zinc-300 p-0.5 flex shadow-sm rounded-sm text-black relative select-none">
                        <div className="w-5 bg-black flex flex-col items-center justify-start pt-1 gap-1 flex-shrink-0">
                          {labelLogoUrl ? (
                            <img src={labelLogoUrl} alt="Logo" className="w-3.5 h-3.5 object-contain invert brightness-200" />
                          ) : (
                            <Building2 className="w-3 h-3 text-white" />
                          )}
                          <span className="text-[3px] font-bold text-white tracking-widest" style={{ writingMode: 'vertical-lr' }}>1077</span>
                        </div>
                        <div className="flex-1 pl-1 flex flex-col justify-between py-0.5">
                          <div className="space-y-0.5">
                            <div className="text-[4px] font-black uppercase text-zinc-800 truncate">ARTURO OROPEZA MAGAÑA</div>
                            <div className="text-[6px] font-black uppercase tracking-wide leading-none text-zinc-950">LIBERACION</div>
                          </div>
                          <div className="border-t border-zinc-800 pt-0.5 text-[4px] font-bold text-zinc-900 truncate uppercase">
                            MOTOROLA G 5G 2024
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. Logo de Formatos Media Carta ── */}
              <div className={`p-4 rounded-xl border space-y-3 ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800/40 border-zinc-700'}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <p className={`text-xs font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>4. Logo de Formatos Media Carta</p>
                    <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Optimizado para impresiones de tamaño carta y media carta (hojas de servicio, recepción y cotizaciones). Se visualiza con mayor resolución.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 rounded-lg'} inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold ${isRetro ? 'text-zinc-800' : 'text-zinc-200'} cursor-pointer`}>
                        <ImagePlus className="w-3.5 h-3.5" />
                        {mediaCartaLogoUrl ? 'Cambiar' : 'Subir imagen…'}
                        <input type="file" accept="image/*" onChange={handleMediaCartaLogo} className="hidden" />
                      </label>
                      {mediaCartaLogoUrl && (
                        <button type="button" onClick={() => setMediaCartaLogoUrl('')}
                          className={`${isRetro ? `${RAISED} bg-[#c0c4cb]` : 'bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 rounded-lg'} flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-500 cursor-pointer`}>
                          <X className="w-3 h-3" /> Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-5 flex justify-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-zinc-555 mb-1">Simulación Media Carta</span>
                      <div className="w-[140px] h-[75px] bg-white border border-zinc-300 p-1.5 shadow-sm overflow-hidden flex flex-col items-center justify-between text-black font-sans leading-none">
                        <div className="w-full flex justify-between items-center h-5">
                          {mediaCartaLogoUrl ? (
                            <img src={mediaCartaLogoUrl} alt="Logo" className="max-h-full max-w-[50px] object-contain" />
                          ) : (
                            <span className="text-[7px] font-black text-zinc-400">TALLER</span>
                          )}
                          <div className="text-right">
                            <div className="text-[5px] font-black">ORDEN DE SERVICIO</div>
                            <div className="text-[3px] text-zinc-550 font-bold scale-[0.8] origin-right">FOLIO: 1077</div>
                          </div>
                        </div>
                        <div className="w-full border-t border-zinc-300 my-0.5" />
                        <div className="w-full flex justify-between text-[3.5px] font-mono text-zinc-600">
                          <span>Cliente: Arturo Oropeza</span>
                          <span>Total: $1,850</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 4 — Administrador
          ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (<>
            {sectionHeader(<Shield className={`w-5 h-5 ${isRetro ? 'text-[#800000]' : 'text-red-400'}`} />, 'Cuenta de Administrador')}

            <div className="space-y-3 pt-1">
              <div>
                {lbl('Nombre del Administrador', true)}
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input ref={adminNameRef} type="text" value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    onKeyDown={advance(adminPinRef)}
                    className={INPUT} placeholder="Ej: Hugo García" />
                </div>
                {err('adminName')}
              </div>

              <div className={infoBoxYellow}>
                🔐 El <strong>PIN de 4 dígitos</strong> se usará para iniciar sesión, autorizar acciones de administrador y realizar cortes de caja.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl('PIN de Acceso (4 dígitos)', true)}
                  <div className="relative">
                    <input
                      ref={adminPinRef}
                      type={showPin ? 'text' : 'password'}
                      value={adminPin}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAdminPin(v);
                        if (v.length === 4) adminConfRef.current?.focus();
                      }}
                      className={INPUT + ' pr-7 font-mono tracking-[0.4em] text-lg text-center'}
                      placeholder="••••" maxLength={4} inputMode="numeric"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPin(v => !v)}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer ${isRetro ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {err('adminPin')}
                </div>
                <div>
                  {lbl('Confirmar PIN', true)}
                  <input
                    ref={adminConfRef}
                    type={showPin ? 'text' : 'password'}
                    value={adminPinConfirm}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setAdminPinConfirm(v);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                    className={INPUT + ' font-mono tracking-[0.4em] text-lg text-center'}
                    placeholder="••••" maxLength={4} inputMode="numeric"
                  />
                  {err('adminPinConfirm')}
                </div>
              </div>

              {adminPin.length === 4 && adminPin === adminPinConfirm && (
                <div className={infoBoxGreen}>
                  <Check className="w-3.5 h-3.5" /> Los PINs coinciden correctamente.
                </div>
              )}
            </div>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 5 — Impresoras
          ════════════════════════════════════════════════════════════════ */}
          {step === 5 && (<>
            {sectionHeader(<Printer className={`w-5 h-5 ${isRetro ? 'text-[#804000]' : 'text-amber-400'}`} />, 'Configuración de Impresoras')}

            <div className="space-y-3 pt-1">
              {err('usePrinters')}

              <div className="flex gap-2">
                {([
                  { val: true,  label: 'Sí, usaré impresoras', icon: <Printer className="w-4 h-4" /> },
                  { val: false, label: 'No por ahora',          icon: <span>🚫</span>               },
                ] as const).map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => { setUsePrinters(opt.val); setErrors({}); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 text-xs font-bold cursor-pointer ${
                      usePrinters === opt.val
                        ? isRetro
                          ? 'bg-[#000080] text-white border-[#000080]'
                          : 'bg-indigo-600 text-white border-indigo-600 rounded-lg'
                        : isRetro
                          ? `${RAISED} text-zinc-700 bg-[#c0c4cb]`
                          : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:bg-zinc-700 rounded-lg'
                    }`}
                  >
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>

              {usePrinters === true && (
                <div className="space-y-3">
                  <button type="button" onClick={loadPrinters} disabled={loadingPrinters}
                    className={`${BTN} w-full flex items-center justify-center gap-2 py-1.5 disabled:opacity-50`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPrinters ? 'animate-spin' : ''}`} />
                    {loadingPrinters ? 'Detectando...' : `Detectar impresoras del sistema${availablePrinters.length > 0 ? ` (${availablePrinters.length} encontradas)` : ''}`}
                  </button>

                  {availablePrinters.length === 0 && !loadingPrinters && (
                    <div className={`${isRetro ? `${SUNKEN} bg-[#ffffcc]` : 'bg-amber-900/20 border border-amber-700/40 rounded-lg'} p-2 text-[10px] ${isRetro ? 'text-zinc-600' : 'text-amber-200'} text-center`}>
                      No se detectaron impresoras. Configúralas luego en <strong>Ajustes → Impresoras</strong>.
                    </div>
                  )}

                  {/* Ticket */}
                  <div className={`${isRetro ? `${SUNKEN} bg-[#f0f0f8]` : 'bg-zinc-800/50 border border-zinc-700 rounded-lg'} p-3 space-y-2`}>
                    <div className="flex items-center gap-1.5">
                      <Ticket className={`w-3.5 h-3.5 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`} />
                      <span className={`text-[10px] font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>Impresora de Tickets POS</span>
                    </div>
                    <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Comprobantes de venta, recibos y boletas de servicio.</p>
                    {availablePrinters.length > 0 ? (
                      <select value={ticketPrinterName} onChange={e => { setTicketPrinterName(e.target.value); setErrors(p => ({ ...p, ticketPrinter: '' })); }} className={INPUT}>
                        <option value="">Seleccionar impresora... *</option>
                        {availablePrinters.map(p => (
                          <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' (Predeterminada)' : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={ticketPrinterName} onChange={e => { setTicketPrinterName(e.target.value); setErrors(p => ({ ...p, ticketPrinter: '' })); }}
                        className={INPUT} placeholder="Nombre exacto de la impresora *" />
                    )}
                    {err('ticketPrinter')}
                    
                    {/* Tamaño de papel de ticket */}
                    <div className="space-y-0.5 pt-1">
                      {lbl('Tamaño del Papel')}
                      <select 
                        value={ticketPaperWidth} 
                        onChange={e => setTicketPaperWidth(e.target.value as '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado')} 
                        className={INPUT}
                      >
                        <option value="80mm">80mm (Ancho estándar de cajón)</option>
                        <option value="58mm">58mm (Terminal de cobro / mini térmica)</option>
                        <option value="media-carta">Media Carta (Impresora láser o inyección)</option>
                        <option value="media-carta-duplicado">Media Carta Duplicado (2 copias en hoja Carta)</option>
                      </select>
                    </div>
                  </div>

                  {/* Label */}
                  <div className={`${isRetro ? `${SUNKEN} bg-[#f0f8f0]` : 'bg-zinc-800/50 border border-zinc-700 rounded-lg'} p-3 space-y-2`}>
                    <div className="flex items-center gap-1.5">
                      <Tag className={`w-3.5 h-3.5 ${isRetro ? 'text-[#006400]' : 'text-emerald-400'}`} />
                      <span className={`text-[10px] font-black uppercase ${isRetro ? 'text-[#006400]' : 'text-emerald-400'}`}>Impresora de Etiquetas Adhesivas</span>
                    </div>
                    <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Etiquetas para equipos en reparación (Zebra, Xprinter…).</p>
                    {availablePrinters.length > 0 ? (
                      <select value={labelPrinterName} onChange={e => { setLabelPrinterName(e.target.value); setErrors(p => ({ ...p, labelPrinter: '' })); }} className={INPUT}>
                        <option value="">Seleccionar impresora... *</option>
                        {availablePrinters.map(p => (
                          <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' (Predeterminada)' : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={labelPrinterName} onChange={e => { setLabelPrinterName(e.target.value); setErrors(p => ({ ...p, labelPrinter: '' })); }}
                        className={INPUT} placeholder="Ej: Zebra ZD220, Xprinter 370B *" />
                    )}
                    {err('labelPrinter')}

                    {/* Tamaño de etiqueta adhesiva */}
                    <div className="space-y-0.5 pt-1">
                      {lbl('Tamaño de la Etiqueta')}
                      <select 
                        value={labelPaperSize} 
                        onChange={e => setLabelPaperSize(e.target.value as any)} 
                        className={INPUT}
                      >
                        <option value="51x25mm">51 x 25 mm (Tamaño recomendado / universal)</option>
                        <option value="50x30mm">50 x 30 mm</option>
                        <option value="40x20mm">40 x 20 mm</option>
                        <option value="40x30mm">40 x 30 mm</option>
                        <option value="60x30mm">60 x 30 mm</option>
                        <option value="30x15mm">30 x 15 mm</option>
                        <option value="38x25mm">38 x 25 mm</option>
                        <option value="57x32mm">57 x 32 mm</option>
                        <option value="100x50mm">100 x 50 mm (Formato de envío grande)</option>
                        <option value="58x40mm">58 mm (Rollo de ticket 58mm)</option>
                        <option value="80x50mm">80 mm (Rollo de ticket 80mm)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {usePrinters === false && (
                <div className={`${isRetro ? `${SUNKEN} bg-[#d8eed8]` : 'bg-emerald-950/20 border border-emerald-700/40 rounded-xl'} p-4 space-y-3`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌿</span>
                    <span className={`text-[11px] font-black uppercase tracking-wide ${isRetro ? 'text-green-900' : 'text-emerald-400'}`}>Se activará el Modo Eco</span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-green-800' : 'text-emerald-300'}`}>
                    Sin impresoras, los comprobantes de venta, órdenes y cotizaciones se mostrarán en pantalla en lugar de imprimirse — el cliente puede fotografiarlos con su celular.
                  </p>
                  {/* Opción bitácora */}
                  <label className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg border transition-colors ${
                    ecoSilent
                      ? (isRetro ? 'bg-[#c8ddc8] border-green-700' : 'bg-emerald-900/30 border-emerald-600/60')
                      : (isRetro ? 'bg-[#dfdfdf] border-zinc-400' : 'bg-zinc-900/30 border-zinc-700/40')
                  }`}>
                    <input
                      type="checkbox"
                      checked={ecoSilent}
                      onChange={e => setEcoSilent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5">
                      <p className={`text-[10px] font-black uppercase tracking-wide ${isRetro ? 'text-green-900' : 'text-emerald-300'}`}>
                        Modo Bitácora — solo registro interno
                      </p>
                      <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-green-700' : 'text-emerald-500/80'}`}>
                        No se mostrará ningún ticket en pantalla. El sistema actúa únicamente como registro interno: guarda órdenes, ventas y movimientos sin interrumpir el flujo con comprobantes digitales.
                      </p>
                    </div>
                  </label>
                  <p className={`text-[10px] leading-relaxed ${isRetro ? 'text-green-700' : 'text-emerald-500/80'}`}>
                    Puedes cambiar esto en cualquier momento desde <strong>Ajustes → Impresoras y Tickets</strong>.
                  </p>
                </div>
              )}
            </div>
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 5 — Empleados
════════════════════════════════════════════════════════════════ */}
          {step === 6 && (<>
            {sectionHeader(<Users className={`w-5 h-5 ${isRetro ? 'text-[#804000]' : 'text-sky-400'}`} />, 'Empleados (opcional)')}
            <p className={`text-xs mb-3 ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Agrega a los empleados que usarán la app. Puedes omitir este paso y agregarlos después desde Configuración → Usuarios.
            </p>

            {/* Lista de empleados agregados */}
            {employees.length > 0 && (
              <div className="space-y-2 mb-3">
                {employees.map((e, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white bg-sky-600`}>
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${isRetro ? 'text-zinc-900' : 'text-white'}`}>{e.name}</p>
                        <p className={`text-[10px] font-mono ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>PIN: {'•'.repeat(4)} · Empleado</p>
                      </div>
                    </div>
                    <button onClick={() => setEmployees(prev => prev.filter((_, j) => j !== i))}
                      className="text-zinc-400 hover:text-red-400 cursor-pointer transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario nuevo empleado */}
            {empShowForm ? (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : 'bg-zinc-800/60 border-zinc-700'}`}>
                <p className={`text-xs font-black uppercase ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Nuevo empleado</p>
                <div>
                  <label className={`text-[10px] font-bold uppercase ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Nombre</label>
                  <input
                    value={empName}
                    onChange={e => { setEmpName(e.target.value); setEmpError(''); }}
                    placeholder="Nombre del empleado"
                    className={`w-full mt-1 px-3 py-2 text-sm rounded-lg border focus:outline-none ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : 'bg-zinc-900 border-zinc-600 text-white focus:border-sky-500'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[10px] font-bold uppercase ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>PIN (4 dígitos)</label>
                    <input
                      type="password" maxLength={4} value={empPin}
                      onChange={e => { setEmpPin(e.target.value.replace(/\D/g, '')); setEmpError(''); }}
                      placeholder="••••"
                      className={`w-full mt-1 px-3 py-2 text-sm rounded-lg border text-center font-mono tracking-widest focus:outline-none ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : 'bg-zinc-900 border-zinc-600 text-white focus:border-sky-500'}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>Confirmar PIN</label>
                    <input
                      type="password" maxLength={4} value={empPinConfirm}
                      onChange={e => { setEmpPinConfirm(e.target.value.replace(/\D/g, '')); setEmpError(''); }}
                      placeholder="••••"
                      className={`w-full mt-1 px-3 py-2 text-sm rounded-lg border text-center font-mono tracking-widest focus:outline-none ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : 'bg-zinc-900 border-zinc-600 text-white focus:border-sky-500'}`}
                    />
                  </div>
                </div>
                {empError && <p className="text-[11px] text-red-500 font-bold">{empError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setEmpShowForm(false); setEmpName(''); setEmpPin(''); setEmpPinConfirm(''); setEmpError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${isRetro ? 'bg-zinc-100 border-zinc-300 text-zinc-600' : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600'}`}>
                    Cancelar
                  </button>
                  <button onClick={handleAddEmployee}
                    className={`flex-1 py-2 text-xs font-black rounded-lg cursor-pointer ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}>
                    Agregar empleado
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEmpShowForm(true)}
                className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${isRetro ? 'border-zinc-400 text-zinc-500 hover:bg-zinc-100' : 'border-zinc-700 text-zinc-500 hover:border-sky-600 hover:text-sky-400'}`}>
                <Plus className="w-4 h-4" /> Agregar empleado
              </button>
            )}

            {employees.length === 0 && !empShowForm && (
              <p className={`text-center text-[11px] mt-3 ${isRetro ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Sin empleados — puedes continuar y agregarlos después desde Configuración.
              </p>
            )}
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 7 — Modo del Taller
          ════════════════════════════════════════════════════════════════ */}
          {step === 7 && (<>
            {sectionHeader(<Wrench className={`w-5 h-5 ${isRetro ? 'text-[#800080]' : 'text-violet-400'}`} />, 'Modo del Taller')}
            <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Elige cómo opera tu taller. Podrás cambiarlo después en Configuración.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {([
                { value: 'personal' as const, icon: '🔧', title: 'Taller Personal', desc: 'Soy el único técnico. Las órdenes arrancan directo en "En Reparación".' },
                { value: 'team' as const,     icon: '👥', title: 'Taller con Equipo', desc: 'Tengo varios técnicos. Las órdenes inician en "Pendiente" y se asignan.' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWorkshopMode(opt.value)}
                  className={`p-4 rounded text-left border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    workshopMode === opt.value
                      ? isRetro
                        ? 'border-[#000080] bg-[#dde4f0] text-zinc-900'
                        : 'border-violet-500 bg-violet-950/30 text-white'
                      : isRetro
                        ? 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                        : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className={`text-xs font-black uppercase tracking-wide ${isRetro ? '' : workshopMode === opt.value ? 'text-violet-300' : ''}`}>{opt.title}</span>
                  <span className={`text-[10px] leading-relaxed ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>{opt.desc}</span>
                  {workshopMode === opt.value && (
                    <span className={`self-end text-[10px] font-black uppercase ${isRetro ? 'text-[#000080]' : 'text-violet-400'}`}>✓ Seleccionado</span>
                  )}
                </button>
              ))}
            </div>
          </>)}

          {step === 8 && (<>
            {sectionHeader(<MessageCircle className={`w-5 h-5 ${isRetro ? 'text-[#005b96]' : 'text-sky-400'}`} />, 'Notificaciones Telegram')}

            {/* ── PANTALLA INICIAL: elegir si configurar o no ── */}
            {tgSubStep === 0 && (
              <div className={`rounded-xl border p-4 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/20 border-sky-900/40'}`}>
                <p className={`text-[12px] font-black ${isRetro || isFluent ? 'text-zinc-800' : 'text-white'}`}>¿Cómo funciona?</p>
                <div className="space-y-2">
                  {[
                    { n: '1', t: 'Creamos un bot gratis en Telegram',           s: '2 min — el asistente te lleva de la mano' },
                    { n: '2', t: 'Pegas el token y lo verificamos solo',         s: 'Automático' },
                    { n: '3', t: 'Le mandas un mensaje a tu bot',                s: 'Solo presionas START' },
                    { n: '4', t: 'La app detecta tu ID automáticamente',         s: 'Sin copiar nada' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 bg-sky-500 text-white`}>{s.n}</span>
                      <div>
                        <p className={`text-[11px] font-bold ${isRetro || isFluent ? 'text-zinc-700' : 'text-zinc-200'}`}>{s.t}</p>
                        <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className={`text-[10px] leading-relaxed ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Recibirás alertas de: nuevas órdenes, cambios de estado, entregas, ventas del POS y más.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button"
                    onClick={() => { setTgUse(false); }}
                    className={`py-2 text-[11px] font-bold rounded-lg cursor-pointer border transition-colors ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'}`}>
                    <BellOff className="w-3.5 h-3.5 inline mr-1" />Ahora no
                  </button>
                  <button type="button"
                    onClick={() => { setTgUse(true); setTgSubStep(1); }}
                    className={`py-2 text-[12px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                    ✈️ Configurar →
                  </button>
                </div>
                {tgUse === false && (
                  <p className={`text-[10px] text-center ${isRetro || isFluent ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Podrás activarlo después en <strong>Ajustes → Notificaciones</strong>
                  </p>
                )}
              </div>
            )}

            {/* ── SUB-PASO 1: Abrir Telegram Web ── */}
            {tgSubStep === 1 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 1 ? 'bg-sky-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-sky-600' : 'text-sky-400'}`}>Paso 1 de 5 — Abre Telegram</p>
                <div className={`p-3 rounded-lg border ${isRetro ? 'bg-sky-50 border-sky-200' : isFluent ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/20 border-sky-900/40'}`}>
                  <p className={`text-[11px] font-black mb-1 ${isRetro || isFluent ? 'text-sky-800' : 'text-sky-300'}`}>¿Qué es Telegram?</p>
                  <p className={`text-[11px] leading-relaxed ${isRetro || isFluent ? 'text-sky-700' : 'text-sky-400'}`}>
                    App de mensajería gratuita (como WhatsApp). La usaremos para enviarte notificaciones del taller a tu celular.
                  </p>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${tgWebOpened ? (isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40') : (isRetro ? 'bg-zinc-50 border-zinc-200' : isFluent ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50')}`}>
                  <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${tgWebOpened ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'}`}>{tgWebOpened ? '✓' : '→'}</span>
                  <div className="flex-1 space-y-2">
                    <p className={`text-[11px] font-black ${tgWebOpened ? (isRetro || isFluent ? 'text-emerald-700' : 'text-emerald-400') : (isRetro || isFluent ? 'text-zinc-800' : 'text-zinc-100')}`}>
                      {tgWebOpened ? '¡Telegram abierto! Inicia sesión si aún no lo has hecho.' : 'Abre Telegram en el navegador de esta PC'}
                    </p>
                    {!tgWebOpened
                      ? <button type="button"
                          onClick={() => { (window as any).electronAPI?.openExternal('https://web.telegram.org'); setTgWebOpened(true); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                          🌐 Abrir Telegram Web
                        </button>
                      : <p className={`text-[11px] font-bold ${isRetro || isFluent ? 'text-emerald-600' : 'text-emerald-400'}`}>Regresa aquí cuando hayas iniciado sesión.</p>
                    }
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setTgSubStep(0); setTgUse(null); }}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <button type="button" onClick={() => setTgSubStep(2)} disabled={!tgWebOpened}
                    className={`flex-1 py-1.5 text-[12px] font-black uppercase rounded-lg transition-all cursor-pointer ${tgWebOpened ? (isRetro ? 'bg-[#000080] text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white') : (isRetro || isFluent ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-700 text-zinc-500')} disabled:cursor-not-allowed`}>
                    {tgWebOpened ? '✅ Continuar →' : 'Primero abre Telegram'}
                  </button>
                </div>
              </div>
            )}

            {/* ── SUB-PASO 2: Crear bot en BotFather ── */}
            {tgSubStep === 2 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 2 ? 'bg-sky-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-sky-600' : 'text-sky-400'}`}>Paso 2 de 5 — Crear tu bot</p>
                <div className="space-y-2">
                  {[
                    { id: 'A', content: (<>
                      <p className={`text-[11px] font-black ${isRetro || isFluent ? 'text-zinc-800' : 'text-zinc-100'}`}>Abre @BotFather — el creador oficial de bots</p>
                      <button type="button" onClick={() => (window as any).electronAPI?.openExternal('https://web.telegram.org/k/#@BotFather')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                        ✈️ Abrir @BotFather
                      </button>
                      <p className={`text-[10px] font-bold ${isRetro || isFluent ? 'text-amber-700' : 'text-amber-400'}`}>⚠️ Presiona <strong>INICIAR</strong> o <strong>START</strong> antes de continuar.</p>
                    </>) },
                    { id: 'B', content: (<>
                      <p className={`text-[11px] font-black ${isRetro || isFluent ? 'text-zinc-800' : 'text-zinc-100'}`}>Envía el comando <code className={`px-1 rounded text-[10px] font-mono ${isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`}>/newbot</code> a BotFather</p>
                      <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>BotFather te pedirá un nombre, ej: <em>"Mi Taller Bot"</em>, luego un username que termine en <code className={`px-1 rounded font-mono text-[10px] ${isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`}>bot</code>.</p>
                    </>) },
                    { id: 'C', content: (<div className={`p-2 rounded-lg border ${isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                      <p className={`text-[11px] font-black ${isRetro || isFluent ? 'text-emerald-800' : 'text-emerald-300'}`}>¡BotFather te enviará el Token! — cópialo completo</p>
                      <code className={`block mt-1 px-2 py-1 rounded text-[10px] font-mono break-all ${isRetro || isFluent ? 'bg-white text-zinc-700 border border-emerald-200' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}>7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxx</code>
                    </div>) },
                  ].map(({ id, content }) => (
                    <div key={id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${isRetro ? 'bg-zinc-50 border-zinc-200' : isFluent ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 bg-sky-500 text-white`}>{id}</span>
                      <div className="flex-1 space-y-1.5">{content}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setTgSubStep(1)} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <button type="button" onClick={() => setTgSubStep(3)} className={`flex-1 py-1.5 text-[12px] font-black uppercase rounded-lg cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>Ya tengo mi Token →</button>
                </div>
              </div>
            )}

            {/* ── SUB-PASO 3: Pegar y verificar token ── */}
            {tgSubStep === 3 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 3 ? 'bg-sky-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-sky-600' : 'text-sky-400'}`}>Paso 3 de 5 — Pegar el Token</p>
                <label className={`block text-[11px] font-black ${isRetro || isFluent ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  Pega aquí el Token que te dio BotFather:
                </label>
                <input type="text" value={tgTokenInput}
                  onChange={e => { setTgTokenInput(e.target.value); setTgStepError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleTgVerifyToken()}
                  placeholder="7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-lg border outline-none transition-colors ${isRetro ? 'bg-white border-zinc-400 text-zinc-900 focus:border-[#000080]' : isFluent ? 'bg-white border-zinc-300 text-zinc-900 focus:border-sky-400' : 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-sky-500'}`}
                />
                {tgStepError && <p className={`text-[11px] font-bold ${isRetro || isFluent ? 'text-red-600' : 'text-red-400'}`}>{tgStepError}</p>}
                <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  💡 Encuéntralo en el mensaje que te envió BotFather al crear el bot.
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setTgSubStep(2); setTgStepError(null); }} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <button type="button" onClick={handleTgVerifyToken} disabled={tgStepLoading}
                    className={`flex-1 py-1.5 text-[12px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-50 transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                    {tgStepLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />Verificando...</> : '✅ Verificar Token →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── SUB-PASO 4: Activar bot — detectar Chat ID ── */}
            {tgSubStep === 4 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-sky-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-sky-600' : 'text-sky-400'}`}>Paso 4 de 5 — Activa tu bot</p>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                  <span className="text-xl">✅</span>
                  <div>
                    <p className={`text-[11px] font-black ${isRetro || isFluent ? 'text-emerald-700' : 'text-emerald-400'}`}>Token verificado</p>
                    <p className={`text-[11px] ${isRetro || isFluent ? 'text-emerald-600' : 'text-emerald-500'}`}>Bot: <strong>{tgBotName}</strong>{tgBotUsername ? <span className="font-mono ml-1 opacity-70 text-[10px]">@{tgBotUsername}</span> : ''}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border space-y-2 ${isRetro ? 'bg-amber-50 border-amber-200' : isFluent ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'}`}>
                  <p className={`text-[11px] font-black ${isRetro || isFluent ? 'text-amber-800' : 'text-amber-300'}`}>Ahora haz esto en Telegram:</p>
                  {[
                    { n: '1', t: <>Abre tu bot con el botón de abajo</> },
                    { n: '2', t: <>Presiona <strong>START</strong> o escríbele cualquier mensaje (ej: "hola")</> },
                    { n: '3', t: <>Regresa aquí y pulsa <strong>"Detectar automáticamente"</strong></> },
                  ].map(({ n, t }) => (
                    <div key={n} className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isFluent ? 'bg-amber-500 text-white' : 'bg-amber-700 text-white'}`}>{n}</span>
                      <p className={`text-[11px] ${isRetro || isFluent ? 'text-amber-700' : 'text-amber-300'}`}>{t}</p>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => (window as any).electronAPI?.openExternal(`https://web.telegram.org/k/#@${tgBotUsername}`)}
                    className={`flex items-center gap-1.5 ml-7 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : isFluent ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-amber-700 hover:bg-amber-600 text-white'}`}>
                    ✈️ Abrir mi bot en Telegram
                  </button>
                </div>
                {tgStepError && <p className={`text-[11px] font-bold ${isRetro || isFluent ? 'text-red-600' : 'text-red-400'}`}>{tgStepError}</p>}
                {tgPolling && <p className={`text-[10px] text-center animate-pulse font-bold ${isFluent ? 'text-sky-500' : 'text-sky-400'}`}>Buscando tu mensaje... asegúrate de haberle enviado algo a tu bot.</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setTgSubStep(3); setTgStepError(null); }} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>← Atrás</button>
                  <button type="button" onClick={handleTgDetectChatId} disabled={tgStepLoading || tgPolling}
                    className={`flex-1 py-1.5 text-[12px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-60 transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                    {tgPolling ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />Detectando...</> : '🔍 Detectar automáticamente →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── SUB-PASO 5: Chat ID detectado ── */}
            {tgSubStep === 5 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full bg-sky-500`} />)}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-sky-600' : 'text-sky-400'}`}>Paso 5 de 5 — ¡Casi listo!</p>
                <div className={`p-4 rounded-lg border text-center space-y-1 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                  <p className="text-2xl">🎯</p>
                  <p className={`text-sm font-black ${isRetro || isFluent ? 'text-emerald-700' : 'text-emerald-400'}`}>¡Chat ID detectado automáticamente!</p>
                  <p className={`text-xl font-black font-mono mt-1 ${isRetro || isFluent ? 'text-zinc-900' : 'text-white'}`}>{tgChatId}</p>
                  <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-500'}`}>Tu identificador único de Telegram</p>
                </div>
                <button type="button" onClick={handleTgFinishSetup} disabled={tgStepLoading}
                  className={`w-full py-2.5 font-black text-[13px] uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50 transition-colors ${isRetro ? 'bg-[#000080] text-white' : isFluent ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                  {tgStepLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />Activando...</> : '🚀 Activar Telegram y enviar prueba →'}
                </button>
              </div>
            )}

            {/* ── COMPLETADO ── */}
            {tgSubStep === 6 && (
              <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className={`text-sm font-black ${isRetro || isFluent ? 'text-emerald-700' : 'text-emerald-400'}`}>¡Telegram configurado y activo!</p>
                    <p className={`text-[11px] ${isRetro || isFluent ? 'text-emerald-600' : 'text-emerald-500'}`}>Bot: <strong>{tgBotName}</strong> · Chat ID: <code className="font-mono text-[10px]">{tgChatId}</code></p>
                  </div>
                </div>
                <p className={`text-[10px] italic ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Revisa Telegram — deberías haber recibido el mensaje de confirmación. Puedes ajustar qué eventos notificar en Ajustes → Notificaciones.
                </p>
              </div>
            )}
          </>)}

          {/* ════════════════════════════════════════════════════════════════
              PASO 9 — WhatsApp
          ════════════════════════════════════════════════════════════════ */}
          {step === 9 && (<>
            {sectionHeader(<Smartphone className={`w-5 h-5 ${isRetro ? 'text-[#128c7e]' : 'text-emerald-400'}`} />, 'Configuración de WhatsApp')}

            <div className="space-y-4 pt-1">
              <p className={`text-[11px] leading-relaxed ${isRetro ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Configura cómo enviará la aplicación los tickets y notificaciones a tus clientes por WhatsApp. Podrás cambiarlo después en <strong>Ajustes → WhatsApp</strong>.
              </p>

              {/* ── SELECCIÓN DE MODO ── */}
              {waMode === null && (
                <div className="grid grid-cols-1 gap-3">
                  {/* Modo Integrado */}
                  <button
                    type="button"
                    onClick={() => handleWaChooseMode('integrated')}
                    className={`w-full text-left cursor-pointer transition-all p-3 rounded-xl border-2 ${
                      isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🤖</span>
                      <div>
                        <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>Modo Automático (Recomendado)</p>
                        <p className={`text-[9.5px] mt-0.5 ${isRetro ? 'text-zinc-650' : 'text-zinc-400'}`}>
                          Vincula tu celular mediante un código QR (como en WhatsApp Web). Envía tickets de forma 100% silenciosa en segundo plano sin intervención humana.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Modo Web Direct */}
                  <button
                    type="button"
                    onClick={() => handleWaChooseMode('web')}
                    className={`w-full text-left cursor-pointer transition-all p-3 rounded-xl border-2 ${
                      isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🌐</span>
                      <div>
                        <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>Modo Manual (WhatsApp Web)</p>
                        <p className={`text-[9.5px] mt-0.5 ${isRetro ? 'text-zinc-650' : 'text-zinc-400'}`}>
                          No requiere vincular nada. La app abre un enlace de WhatsApp Web en el navegador para que mandes el ticket de forma manual.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Modo Deshabilitado */}
                  <button
                    type="button"
                    onClick={() => handleWaChooseMode('disabled')}
                    className={`w-full text-left cursor-pointer transition-all p-3 rounded-xl border-2 ${
                      isRetro
                        ? `${RAISED} bg-[#c0c4cb] hover:bg-[#cacdd4]`
                        : 'border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🚫</span>
                      <div>
                        <p className={`text-xs font-black ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>No usar WhatsApp</p>
                        <p className={`text-[9.5px] mt-0.5 ${isRetro ? 'text-zinc-650' : 'text-zinc-400'}`}>
                          Deshabilita por completo la función de WhatsApp. Los tickets de venta o de ingreso se entregarán únicamente impresos.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* ── MODO MANUAL SELECCIONADO ── */}
              {waMode === 'web' && (
                <div className={`rounded-xl border p-4 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/40'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <p className={`text-[12px] font-black ${isRetro || isFluent ? 'text-zinc-800' : 'text-white'}`}>Modo Manual (WhatsApp Web)</p>
                      <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Has seleccionado enviar mensajes manualmente abriendo pestañas de tu navegador.
                      </p>
                    </div>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Al registrar ventas o reparaciones, la app abrirá enlaces de tipo <code>wa.me/telefono</code>. No requiere vinculación con QR en esta PC.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWaMode(null)}
                    className={`w-full py-2 text-[11px] font-bold rounded-lg cursor-pointer border transition-colors ${
                      isRetro || isFluent
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    🔄 Cambiar modo de WhatsApp
                  </button>
                </div>
              )}

              {/* ── MODO DESHABILITADO SELECCIONADO ── */}
              {waMode === 'disabled' && (
                <div className={`rounded-xl border p-4 space-y-4 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚫</span>
                    <div>
                      <p className={`text-[12px] font-black ${isRetro || isFluent ? 'text-zinc-800' : 'text-white'}`}>WhatsApp Deshabilitado</p>
                      <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        No se enviarán notificaciones ni comprobantes por WhatsApp.
                      </p>
                    </div>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Si en el futuro deseas enviar tickets digitales por este medio, podrás activarlo desde los ajustes de la aplicación.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWaMode(null)}
                    className={`w-full py-2 text-[11px] font-bold rounded-lg cursor-pointer border transition-colors ${
                      isRetro || isFluent
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    🔄 Activar WhatsApp
                  </button>
                </div>
              )}

              {/* ── MODO INTEGRADO: PASOS ── */}
              {waMode === 'integrated' && (
                <div className={`rounded-xl border p-4 space-y-3 ${isRetro ? 'bg-white border-zinc-300' : isFluent ? 'bg-white border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                  
                  {/* SUB-PASO 1: Explicación y botón para conectar */}
                  {waSubStep === 1 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 1 ? 'bg-emerald-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-emerald-600' : 'text-emerald-400'}`}>Paso 1 de 3 — Preparar Conexión</p>
                      <p className={`text-[11px] leading-relaxed ${isRetro || isFluent ? 'text-zinc-650' : 'text-zinc-400'}`}>
                        Al iniciar la vinculación, el sistema creará un navegador en segundo plano y te mostrará un código QR aquí. Asegúrate de tener tu celular con WhatsApp a la mano.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={handleWaDisconnect}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>
                          ← Cambiar modo
                        </button>
                        <button type="button" onClick={handleWaStartConnect}
                          className={`flex-1 py-1.5 text-[12px] font-black uppercase rounded-lg cursor-pointer transition-colors ${isRetro ? 'bg-[#000080] text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                          Generar código QR →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-PASO 2: Mostrar QR */}
                  {waSubStep === 2 && (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-1 w-full">
                        {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= 2 ? 'bg-emerald-500' : isRetro || isFluent ? 'bg-zinc-200' : 'bg-zinc-700'}`} />)}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-wider w-full text-left ${isFluent ? 'text-emerald-600' : 'text-emerald-400'}`}>Paso 2 de 3 — Escanea el código QR</p>
                      
                      {waStatus === 'CONNECTING' && (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                          <p className={`text-[10px] animate-pulse ${isRetro || isFluent ? 'text-zinc-600' : 'text-zinc-400'}`}>Iniciando navegador interno... espera un momento.</p>
                        </div>
                      )}

                      {waStatus === 'QR_READY' && waQr && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-md">
                            <img src={waQr} alt="WhatsApp QR Code" className="w-[180px] h-[180px]" />
                          </div>
                          <p className={`text-[10px] text-center max-w-sm ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Abre WhatsApp en tu celular → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong> y escanea el código.
                          </p>
                        </div>
                      )}

                      <button type="button" onClick={handleWaDisconnect}
                        className={`w-full py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-650 border border-zinc-200' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'}`}>
                        ❌ Cancelar / Desconectar
                      </button>
                    </div>
                  )}

                  {/* SUB-PASO 3: Conectado */}
                  {waSubStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full bg-emerald-500`} />)}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isFluent ? 'text-emerald-600' : 'text-emerald-400'}`}>Paso 3 de 3 — ¡Dispositivo Vinculado!</p>
                      
                      <div className={`p-4 rounded-lg border text-center space-y-1 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isFluent ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                        <p className="text-2xl">🤖</p>
                        <p className={`text-sm font-black ${isRetro || isFluent ? 'text-emerald-700' : 'text-emerald-400'}`}>¡WhatsApp vinculado exitosamente!</p>
                        {waPhone && <p className={`text-lg font-black font-mono mt-1 ${isRetro || isFluent ? 'text-zinc-900' : 'text-white'}`}>{waPhone}</p>}
                        <p className={`text-[10px] ${isRetro || isFluent ? 'text-zinc-500' : 'text-zinc-500'}`}>La app enviará notificaciones y tickets automáticamente a tus clientes.</p>
                      </div>

                      <button type="button" onClick={handleWaDisconnect}
                        className={`w-full py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${isRetro || isFluent ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200' : 'bg-rose-950/20 hover:bg-rose-950/30 text-rose-400 border border-rose-900/30'}`}>
                        Desvincular WhatsApp
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          </>)}

          {step === 10 && (<>
            {sectionHeader(<CheckCircle2 className={`w-5 h-5 ${isRetro ? 'text-[#006600]' : 'text-emerald-400'}`} />, 'Confirmar Configuración')}

            <div className="space-y-3 pt-1">
              {/* Apariencia */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#5b21b6]' : 'text-indigo-400'}`}>
                    <Palette className="w-3 h-3" /> Apariencia
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(1); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                <div className={`flex text-[11px] py-0.5 ${isRetro ? '' : 'text-zinc-300'}`}>
                  <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Tema</span>
                  <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>
                    {(() => {
                      const themeName = selectedTheme === 'retro-window' ? 'Retro · Windows 95'
                        : selectedTheme === 'fluent' ? 'Fluent · Windows 11'
                        : 'Moderno';
                      const modeName = selectedThemeMode === 'light' ? 'Claro' : 'Oscuro';
                      return `${themeName} (${modeName})`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Negocio */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>
                    <Building2 className="w-3 h-3" /> Negocio
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(2); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                <div className="space-y-0.5">
                  {([
                    ['Nombre',   storeName || '—'],
                    ['Lema',     slogan    || '—'],
                    ['Teléfono', phone ? `${phoneCode} ${phone}` : '—'],
                    ['Dirección',address   || '—'],
                    ['Moneda',   `${selectedCurrency.flag} ${selectedCurrency.code} — ${selectedCurrency.name} (${selectedCurrency.symbol})`],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k} className={`flex text-[11px] py-0.5 ${isRetro ? 'border-b border-zinc-100 last:border-0' : 'border-b border-zinc-700/50 last:border-0'}`}>
                      <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>{k}</span>
                      <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logotipos */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#000080]' : 'text-indigo-400'}`}>
                    <ImagePlus className="w-3.5 h-3.5" /> Logotipos de la Marca
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(3); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                <div className="flex gap-4">
                  {[
                    { label: 'Sistema', url: logoUrl },
                    { label: 'Ticket', url: ticketLogoUrl },
                    { label: 'Etiqueta', url: labelLogoUrl },
                    { label: 'Media Carta', url: mediaCartaLogoUrl },
                  ].map(lg => (
                    <div key={lg.label} className="flex flex-col items-center">
                      <span className={`text-[9px] font-bold mb-1 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>{lg.label}</span>
                      <div className={`${SUNKEN} ${isRetro ? 'bg-white' : 'bg-zinc-900'} w-12 h-12 flex items-center justify-center overflow-hidden`}>
                        {lg.url ? (
                          <img src={lg.url} alt={lg.label} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-[8px] text-zinc-400 italic">Sin logo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#800000]' : 'text-red-400'}`}>
                    <Shield className="w-3 h-3" /> Administrador
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(4); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                {[['Nombre', adminName], ['PIN', '••••'], ['Rol', 'Administrador (acceso total)']].map(([k,v]) => (
                  <div key={k} className={`flex text-[11px] py-0.5 ${isRetro ? 'border-b border-zinc-100 last:border-0' : 'border-b border-zinc-700/50 last:border-0'}`}>
                    <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>{k}</span>
                    <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Modo del Taller */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#800080]' : 'text-violet-400'}`}>
                    <Wrench className="w-3 h-3" /> Modo del Taller
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(7); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                <div className={`flex text-[11px] py-0.5`}>
                  <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Modo</span>
                  <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>
                    {workshopMode === 'personal' ? '🔧 Taller Personal — Único técnico' : '👥 Taller con Equipo — Múltiples técnicos'}
                  </span>
                </div>
              </div>

              {/* Impresoras */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#804000]' : 'text-amber-400'}`}>
                    <Printer className="w-3 h-3" /> Impresoras
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(5); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                {usePrinters ? (
                  <>
                    <div className={`flex text-[11px] py-0.5 ${isRetro ? 'border-b border-zinc-100' : 'border-b border-zinc-700/50'}`}>
                      <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Tickets</span>
                      <span className={ticketPrinterName ? `font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}` : `italic ${isRetro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {ticketPrinterName ? `${ticketPrinterName} · ${detectInterface(ticketPrinterName)} (${ticketPaperWidth})` : '— sin configurar'}
                      </span>
                    </div>
                    <div className="flex text-[11px] py-0.5">
                      <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Etiquetas</span>
                      <span className={labelPrinterName ? `font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}` : `italic ${isRetro ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {labelPrinterName ? `${labelPrinterName} · ${detectInterface(labelPrinterName)} (${labelPaperSize})` : '— sin configurar'}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className={`text-[11px] italic py-0.5 ${isRetro ? 'text-zinc-400' : 'text-zinc-500'}`}>Sin impresoras configuradas</p>
                )}
              </div>

              {/* Telegram */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isRetro ? 'text-[#005b96]' : 'text-sky-400'}`}>
                    <MessageCircle className="w-3 h-3" /> Telegram
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(8); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                {tgUse && tgToken && tgChatId ? (
                  <div className="space-y-0.5">
                    {[['Bot', tgBotName || tgBotUsername], ['Chat ID', tgChatId]].map(([k,v]) => (
                      <div key={k} className={`flex text-[11px] py-0.5 ${isRetro ? 'border-b border-zinc-100 last:border-0' : 'border-b border-zinc-700/50 last:border-0'}`}>
                        <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>{k}</span>
                        <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-[11px] italic py-0.5 ${isRetro ? 'text-zinc-400' : 'text-zinc-500'}`}>Sin notificaciones Telegram</p>
                )}
              </div>

              {/* WhatsApp */}
              <div className={summaryBox}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1`} style={{ color: '#128C7E' }}>
                    <Smartphone className="w-3 h-3" /> WhatsApp
                  </span>
                  <button type="button" onClick={() => { setReturnToSummary(true); setStep(9); }} className={summaryEditBtn}>✏ Editar</button>
                </div>
                <div className={`flex text-[11px] py-0.5`}>
                  <span className={`font-bold w-24 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>Modo</span>
                  <span className={`font-bold ${isRetro ? 'text-zinc-900' : 'text-zinc-100'}`}>
                    {waMode === 'integrated' && waStatus === 'CONNECTED'
                      ? `🤖 Integrado (QR)${waPhone ? ` · ${waPhone}` : ''}`
                      : waMode === 'web'
                      ? '🌐 WhatsApp Web · Manual'
                      : '🚫 No configurado'}
                  </span>
                </div>
              </div>
            </div>
          </>)}

        </div>{/* end content */}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={footerClass}>
          <button type="button" onClick={handleBack} disabled={step === 1}
            className={btnBack}>
            <ChevronLeft className="w-3.5 h-3.5" /> Atrás
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div key={s.id} className={`rounded-full transition-none ${
                step === s.id ? dotActive : step > s.id ? dotDone : dotFuture
              }`} />
            ))}
          </div>

          {step < 10 ? (
            <button type="button" onClick={handleNext} className={btnNext}>
              {step === 8 && tgUse === false
                ? 'Omitir y Continuar'
                : step === 9 && !waMode
                ? 'Omitir WhatsApp'
                : step === 9 && (waMode === 'disabled' || waMode === 'web')
                ? 'Continuar'
                : step === 9 && waMode === 'integrated' && waStatus !== 'CONNECTED'
                ? 'Omitir y Continuar'
                : 'Siguiente'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button type="button" onClick={handleComplete} className={btnComplete}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar y Comenzar
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
