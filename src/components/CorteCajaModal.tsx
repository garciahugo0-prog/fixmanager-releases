import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, DollarSign, Calculator, Percent, Coins, CreditCard, 
  PiggyBank, User, Eye, History, Settings, Printer, 
  Check, Save, RefreshCw, Sliders, Banknote, Loader2,
  AlertTriangle, MessageSquare
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { RepairOrder, Sale, Expense, WorkshopConfig, InventoryItem, CreditAccount, ApartadoEntry } from '../types';
import { sendTelegram, tgCorte } from '../utils/telegram';

interface CorteCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: RepairOrder[];
  sales: Sale[];
  expenses: Expense[];
  config: WorkshopConfig;
  onSaveCorte: (corte: any) => Promise<void> | void;
  onComplete?: () => void;
  sessionId: number;
  setSessionId: React.Dispatch<React.SetStateAction<number>>;
  onAddExpense?: (exp: Expense) => void;
  onSetExpenses?: (exps: Expense[]) => void;
  /** Acción adicional que ocurre justo después de guardar el corte */
  afterSaveAction?: 'logout' | 'change-user';
  inventory?: InventoryItem[];
  /** Volver al diálogo anterior (modal de advertencia de cierre) */
  onBack?: () => void;
  /** Usuario en turno para mostrar en el footer */
  currentUser?: string;
  creditAccounts?: CreditAccount[];
  apartados?: ApartadoEntry[];
  startingCash?: number;
}

function numberToSpanishWords(num: number): string {
  const rounded = Math.round(num * 100) / 100;
  const entero = Math.floor(rounded);
  const centavos = Math.round((rounded - entero) * 100);

  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const veintes = ["VEINTE", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function convertirGrupo(n: number): string {
    let output = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        output += "CIEN ";
      } else {
        output += centenas[c] + " ";
      }
    }

    if (d > 0) {
      if (d === 1) {
        output += especiales[u] + " ";
      } else if (d === 2) {
        if (u === 0) output += "VEINTE ";
        else output += veintes[u] + " ";
      } else {
        output += decenas[d];
        if (u > 0) {
          output += " Y " + unidades[u] + " ";
        } else {
          output += " ";
        }
      }
    } else if (u > 0) {
      output += unidades[u] + " ";
    }

    return output.trim();
  }

  if (entero === 0) {
    const zeroCentavosStr = centavos.toString().padStart(2, '0');
    return `**CERO ${zeroCentavosStr}/100 MX. PESOS**`;
  }

  let text = "";
  let millones = Math.floor(entero / 1000000);
  let miles = Math.floor((entero % 1000000) / 1000);
  let unidadesRestantes = entero % 1000;

  if (millones > 0) {
    if (millones === 1) {
      text += "UN MILLON ";
    } else {
      text += convertirGrupo(millones) + " MILLONES ";
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      text += "MIL ";
    } else {
      text += convertirGrupo(miles) + " MIL ";
    }
  }

  if (unidadesRestantes > 0) {
    text += convertirGrupo(unidadesRestantes) + " ";
  }

  const centavosStr = centavos.toString().padStart(2, '0');
  return `**${text.trim()} ${centavosStr}/100 MX. PESOS**`.toUpperCase();
}

// Beautiful Graphical Representation of MXN Coins and Banknotes
interface MXNDenominationGraphicProps {
  value: number;
  isCoin?: boolean;
}

function MXNDenominationGraphic({ value, isCoin = false }: MXNDenominationGraphicProps) {
  if (isCoin) {
    // Colores con inline styles para garantizar visibilidad en cualquier tema
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
    let securityRibbon = null; // Shimmering security thread
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
          
          {/* Subtle diagonal banknote guilloche pattern effect */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[length:4px_4px] opacity-70 pointer-events-none" />
          
          {/* Holographic context ribbon / thread */}
          {securityRibbon}

          {/* Core Banknote Layout */}
          <div className="flex-1 h-full py-0.5 px-1.5 flex flex-col justify-between relative z-10 text-left">
            {/* Bank Header Row */}
            <div className="flex items-center justify-between">
              <span className="text-[5px] font-bold text-white/50 tracking-tighter uppercase font-mono leading-none">
                {titleOfBill}
              </span>
              {/* Red-colored unique banknote serial number */}
              <span className="text-[4px] font-bold text-red-400 font-mono tracking-tighter leading-none select-none opacity-85">
                {serialNumber}
              </span>
            </div>

            {/* Central Area: Portrait & Denominations */}
            <div className="flex items-center justify-between gap-0.5 my-auto">
              {/* Portrait */}
              {characterPortrait}

              {/* Bold Denomination */}
              <div className="flex flex-col text-right min-w-0 overflow-hidden">
                <span className="text-[14px] md:text-[15px] font-black font-mono leading-none tracking-tight text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
                  ${value}
                </span>
                <span className="text-[5.5px] uppercase font-bold text-white/40 tracking-tighter truncate max-w-[62px] leading-tight select-none">
                  {subLabel}
                </span>
              </div>
            </div>

            {/* Micro details at bottom row */}
            <div className="flex items-center justify-between leading-none text-[3.8px] text-white/30 uppercase tracking-tighter font-mono">
              <span>PEsoS mEXiCaNOS</span>
              <span>BdeM dG</span>
            </div>
          </div>

          {/* Polymeric Transparent Security Window or Watermark Frame on the right */}
          <div className="h-full w-[26px] bg-black/15 border-l border-white/5 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
            {transparentWindow}
            
            {/* Fine tactile registry lines for blind people (Mexican bills feature this as borders/dots) */}
            <div className="absolute right-[1.5px] top-1 bottom-1 w-[1.5px] flex flex-col justify-between items-center opacity-40">
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
            </div>
          </div>

          {/* Holographic glitter reflection layer visible on hover */}
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

export default function CorteCajaModal({
  isOpen,
  onClose,
  orders,
  sales,
  expenses,
  config,
  onSaveCorte,
  onComplete,
  sessionId,
  setSessionId,
  onAddExpense,
  onSetExpenses,
  afterSaveAction,
  onBack,
  currentUser,
  inventory = [],
  creditAccounts = [],
  apartados = [],
  startingCash
}: CorteCajaModalProps) {
  // Navigation Tabs (top-right of the window structure)
  const [activeTab, setActiveTab] = useState<'Resumen' | 'Registros'>('Resumen');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  const [isClosingMobileCorte, setIsClosingMobileCorte] = useState(false);
  const [corteStartY, setCorteStartY] = useState<number | null>(null);
  const [corteDragY, setCorteDragY] = useState<number>(0);

  const closeMobileCorteSheet = () => {
    if (isClosingMobileCorte) return;
    setIsClosingMobileCorte(true);
    setCorteDragY(0);
    setCorteStartY(null);
    setTimeout(() => {
      onClose();
      setIsClosingMobileCorte(false);
    }, 350);
  };

  const [showMobileCorteOptionsModal, setShowMobileCorteOptionsModal] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [corteStep, setCorteStep] = useState<number>(0);
  const [corteWarning, setCorteWarning] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  // Borradores del conteo guardados en esta sesión
  const [drafts, setDrafts] = useState<Array<{ time: string; q1000: number; q500: number; q200: number; q100: number; q50: number; q20: number; coinsAmount: number; total: number }>>(() => {
    try {
      const raw = localStorage.getItem('fixmanager_corte_drafts');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  // Modal de confirmación interno
  const [confirm, setConfirm] = useState<{ title: string; body: string; onOk: () => void; autoConfirm?: number } | null>(null);
  // Modal de salida anticipada
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{ q1000: number; q500: number; q200: number; q100: number; q50: number; q20: number; coinsAmount: number } | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Selected date search of the system
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isUtilityExpanded, setIsUtilityExpanded] = useState<boolean>(false);
  const [isUserSalesExpanded, setIsUserSalesExpanded] = useState<boolean>(false);
  const [isCreditApartadosExpanded, setIsCreditApartadosExpanded] = useState<boolean>(false);

  // Banknote quantity inputs
  const [q1000, setQ1000] = useState<number>(0);
  const [q500, setQ500] = useState<number>(0);
  const [q200, setQ200] = useState<number>(0);
  const [q100, setQ100] = useState<number>(0);
  const [q50, setQ50] = useState<number>(0);
  const [q20, setQ20] = useState<number>(0);
  
  // Coin sub-conteo panel toggle
  const [showCoinsPanel, setShowCoinsPanel] = useState<boolean>(false);
  
  // Coin count state for detailed breakdown
  const [coinQ20, setCoinQ20] = useState<number>(0);
  const [coinQ10, setCoinQ10] = useState<number>(0);
  const [coinQ5, setCoinQ5] = useState<number>(0);
  const [coinQ2, setCoinQ2] = useState<number>(0);
  const [coinQ1, setCoinQ1] = useState<number>(0);
  const [coinQ05, setCoinQ05] = useState<number>(0);

  // Coins subtotal editable or automatically generated
  const [coinsAmount, setCoinsAmount] = useState<number>(0);

  // Prefilled / Editable entries & exits (right summary column)
  const [saldoInicial, setSaldoInicial] = useState<number>(() => {
    if (typeof startingCash === 'number' && !isNaN(startingCash)) return startingCash;
    const saved = localStorage.getItem('fixmanager_saldo_inicial');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  });

  useEffect(() => {
    if (isOpen) {
      if (typeof startingCash === 'number' && !isNaN(startingCash)) {
        setSaldoInicial(startingCash);
      } else {
        const saved = localStorage.getItem('fixmanager_saldo_inicial');
        if (saved !== null) {
          const parsed = parseFloat(saved);
          setSaldoInicial(isNaN(parsed) ? 0 : parsed);
        } else {
          setSaldoInicial(0);
        }
      }
    }
  }, [isOpen, startingCash]);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaldoInicialChange = (val: number) => {
    setSaldoInicial(val);
    localStorage.setItem('fixmanager_saldo_inicial', val.toString());
  };

  const [ventasEfectivo, setVentasEfectivo] = useState<number>(0);
  const [ventasTarjeta, setVentasTarjeta] = useState<number>(0);
  const [comisionesRecargas, setComisionesRecargas] = useState<number>(0);
  const [recargasPlanes, setRecargasPlanes] = useState<number>(0);
  const [serviciosTecnicos, setServiciosTecnicos] = useState<number>(0);
  const [entradasManuales, setEntradasManuales] = useState<number>(0); // Starts clean, manual entries only
  const [abonosFiadosEfectivo, setAbonosFiadosEfectivo] = useState<number>(0);
  const [abonosApartadosEfectivo, setAbonosApartadosEfectivo] = useState<number>(0);

  const [devolucionesVentas, setDevolucionesVentas] = useState<number>(0);
  const [devolucionesServicios, setDevolucionesServicios] = useState<number>(0);
  const [salidasManuales, setSalidasManuales] = useState<number>(0);



  // Previously created cortes loaded locally if needed for the Registros tab
  const [localCortes, setLocalCortes] = useState<any[]>([]);
  const [corteComment, setCorteComment] = useState<string>('');

  // Load previous cortes on tab change
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fixmanager_cortes');
      if (saved) {
        setLocalCortes(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab, isOpen]);

  // Sync details from current day's DB operation automatically on date change or open
  useEffect(() => {
    if (isOpen) {
      // 1. Calculate POS sales for this session only (splitting cash and card)
      const daySales = sales.filter(s => !s.isCancelled && s.sessionId === sessionId);
      let cashSalesSum = 0;
      let cardSalesSum = 0;
      let recargasPlanesSum = 0;
      let comisionesRecargasSum = 0;

      daySales.forEach(s => {
        let saleRepairsTotal = 0;
        let saleRecargas = 0;
        let saleComisiones = 0;

        s.items.forEach(item => {
          if (item.itemId && item.itemId.startsWith('repair-')) {
            saleRepairsTotal += item.price * item.quantity;
          } else if (item.itemId === 'recharge-commission') {
            saleComisiones += item.price * item.quantity;
          } else if (item.itemId && item.itemId.startsWith('recharge-')) {
            saleRecargas += item.price * item.quantity;
          }
        });

        const saleNetTotal = Math.max(0, s.total - saleRepairsTotal - saleRecargas - saleComisiones);

        if (s.paymentMethod === 'Efectivo') {
          cashSalesSum += saleNetTotal;
          recargasPlanesSum += saleRecargas;
          comisionesRecargasSum += saleComisiones;
        } else if (s.paymentMethod === 'Tarjeta/Transfer' || s.paymentMethod === 'Tarjeta') {
          cardSalesSum += saleNetTotal;
          cardSalesSum += saleRecargas + saleComisiones;
        } else if (s.paymentMethod === 'Múltiple' || s.paymentMethod === 'Mixto') {
          const efeMatch = s.confirmationCode?.match(/Efe:\s*\$?([0-9.]+)/);
          const cardMatch = s.confirmationCode?.match(/T\/T:\s*\$?([0-9.]+)/);
          const efeAmt = efeMatch ? parseFloat(efeMatch[1]) : 0;
          const cardAmt = cardMatch ? parseFloat(cardMatch[1]) : 0;

          if (efeAmt === 0 && cardAmt === 0) {
            cashSalesSum += saleNetTotal;
            recargasPlanesSum += saleRecargas;
            comisionesRecargasSum += saleComisiones;
          } else {
            const totalMatch = efeAmt + cardAmt;
            const cashRatio = totalMatch > 0 ? efeAmt / totalMatch : 0;
            const cardRatio = totalMatch > 0 ? cardAmt / totalMatch : 0;

            const repairsCash = saleRepairsTotal * cashRatio;
            const repairsCard = saleRepairsTotal * cardRatio;

            const recargasCash = saleRecargas * cashRatio;
            const recargasCard = saleRecargas * cardRatio;

            const comisionesCash = saleComisiones * cashRatio;
            const comisionesCard = saleComisiones * cardRatio;

            cashSalesSum += Math.max(0, efeAmt - repairsCash - recargasCash - comisionesCash);
            cardSalesSum += Math.max(0, cardAmt - repairsCard - recargasCard - comisionesCard);

            recargasPlanesSum += recargasCash;
            comisionesRecargasSum += comisionesCash;
            cardSalesSum += recargasCard + comisionesCard;
          }
        } else {
          cashSalesSum += saleNetTotal;
          recargasPlanesSum += saleRecargas;
          comisionesRecargasSum += saleComisiones;
        }
      });

      // 2. Calculate orders for this session only (advances only, separating cash and card/transfer)
      const dayOrders = orders.filter(o => o.sessionId === sessionId);
      let repairsCashSum = 0;
      let repairsCardSum = 0;

      dayOrders.forEach(o => {
        if (o.advancePayment && o.advancePayment > 0) {
          if (o.advancePaymentBreakdown && o.advancePaymentBreakdown.length > 0) {
            o.advancePaymentBreakdown.forEach(b => {
              if (b.method === 'Efectivo') {
                repairsCashSum += b.amount;
              } else if (b.method === 'Tarjeta' || b.method === 'Tarjeta/Transfer') {
                repairsCardSum += b.amount;
              } else {
                repairsCashSum += b.amount; // fallback safe assumption
              }
            });
          } else {
            repairsCashSum += o.advancePayment; // default to cash if no breakdown
          }
        }
      });

      // 3. Outflows/Expenses & Manual Entrances for this session, separating cash and card/transfer
      const dayExpenses = expenses.filter(e => e.sessionId === sessionId);
      
      let manualEntradasSum = 0;
      let manualEntradasCardSum = 0;
      let abonosFiadosCashSum = 0;
      let abonosApartadosCashSum = 0;

      dayExpenses.forEach(e => {
        if (e.type === 'entrada') {
          if (e.category === 'Servicio Técnico') {
            if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
              repairsCardSum += e.amount;
            } else {
              repairsCashSum += e.amount;
            }
          } else if (e.category === 'Abono Fiado') {
            if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
              manualEntradasCardSum += e.amount;
            } else {
              abonosFiadosCashSum += e.amount;
            }
          } else if (e.category === 'Apartado') {
            if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
              manualEntradasCardSum += e.amount;
            } else {
              abonosApartadosCashSum += e.amount;
            }
          } else {
            if (e.paymentMethod === 'Tarjeta' || e.paymentMethod === 'Tarjeta/Transfer') {
              manualEntradasCardSum += e.amount;
            } else {
              manualEntradasSum += e.amount;
            }
          }
        }
      });

      setServiciosTecnicos(repairsCashSum);
      setComisionesRecargas(comisionesRecargasSum);
      setRecargasPlanes(recargasPlanesSum);
      cardSalesSum += repairsCardSum;
      cardSalesSum += manualEntradasCardSum;

      setVentasEfectivo(cashSalesSum);
      setVentasTarjeta(cardSalesSum);

      const devVentasSum = dayExpenses
        .filter(e => (e.type === 'salida' || !e.type) && e.category === 'Devolución de Venta')
        .reduce((acc, e) => acc + e.amount, 0);

      const devServiciosSum = dayExpenses
        .filter(e => (e.type === 'salida' || !e.type) && e.category === 'Devolución de Servicio')
        .reduce((acc, e) => acc + e.amount, 0);

      const manualSalidasSum = dayExpenses
        .filter(e => (e.type === 'salida' || !e.type) && e.category !== 'Devolución de Servicio' && e.category !== 'Devolución de Venta')
        .reduce((acc, e) => acc + e.amount, 0);

      setDevolucionesVentas(devVentasSum);
      setDevolucionesServicios(devServiciosSum);
      setEntradasManuales(manualEntradasSum);
      setAbonosFiadosEfectivo(abonosFiadosCashSum);
      setAbonosApartadosEfectivo(abonosApartadosCashSum);
      setSalidasManuales(manualSalidasSum);

      // Reset counting inputs
      setQ1000(0);
      setQ500(0);
      setQ200(0);
      setQ100(0);
      setQ50(0);
      setQ20(0);
      setCoinsAmount(0);
      
      // Detailed coins reset
      setCoinQ20(0);
      setCoinQ10(0);
      setCoinQ5(0);
      setCoinQ2(0);
      setCoinQ1(0);
      setCoinQ05(0);

      // Reload saldoInicial and reset manual entrances
      const savedSaldo = localStorage.getItem('fixmanager_saldo_inicial');
      const parsedSaldo = savedSaldo ? parseFloat(savedSaldo) : 1000;
      setSaldoInicial(isNaN(parsedSaldo) ? 1000 : parsedSaldo);
    }
  }, [isOpen, selectedDate, sales, orders, expenses]);

  // Desglose de ventas POS por usuario para esta sesión
  const desglosePorUsuario = useMemo(() => {
    const daySales = sales.filter(s => !s.isCancelled && s.sessionId === sessionId);
    const map: Record<string, { ventas: number; total: number }> = {};
    daySales.forEach(s => {
      const key = s.createdBy || 'Sin usuario';
      if (!map[key]) map[key] = { ventas: 0, total: 0 };
      map[key].ventas += 1;
      const saleRepairsTotal = s.items
        .filter(item => item.itemId && item.itemId.startsWith('repair-'))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
      map[key].total += Math.max(0, s.total - saleRepairsTotal);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [sales, selectedDate, sessionId]);

  // Cálculo de utilidad del turno
  const utilidad = useMemo(() => {
    const daySales = sales.filter(s => !s.isCancelled && s.sessionId === sessionId);
    const costoVentas = daySales.reduce((acc, sale) => {
      return acc + sale.items.reduce((sum, item) => {
        const inv = inventory.find(i => i.id === item.itemId);
        return sum + (inv ? inv.cost * item.quantity : 0);
      }, 0);
    }, 0);
    const ingresoVentas = daySales.reduce((acc, s) => {
      const saleRepairsTotal = s.items
        .filter(item => item.itemId && item.itemId.startsWith('repair-'))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
      return acc + Math.max(0, s.total - saleRepairsTotal);
    }, 0);
    const margenVentas = ingresoVentas - costoVentas;

    const dayOrders = orders.filter(o => o.sessionId === sessionId && (o.status === 'Entregado y Pagado' || (o.advancePayment ?? 0) > 0));
    const costoPiezas = dayOrders.reduce((acc, o) => acc + (o.parts ?? []).reduce((s, p) => s + p.cost, 0), 0);
    const ingresoServicios = dayOrders.reduce((acc, o) => acc + (o.status === 'Entregado y Pagado' ? o.cost : (o.advancePayment ?? 0)), 0);
    const margenServicios = ingresoServicios - costoPiezas;
    const ordenesSinPiezas = dayOrders.filter(o => !o.parts || o.parts.length === 0).length;

    const actCostoVentas = config.enablePOS !== false ? costoVentas : 0;
    const actIngresoVentas = config.enablePOS !== false ? ingresoVentas : 0;
    const actMargenVentas = config.enablePOS !== false ? margenVentas : 0;

    const actCostoPiezas = config.enableTaller !== false ? costoPiezas : 0;
    const actIngresoServicios = config.enableTaller !== false ? ingresoServicios : 0;
    const actMargenServicios = config.enableTaller !== false ? margenServicios : 0;
    const actOrdenesSinPiezas = config.enableTaller !== false ? ordenesSinPiezas : 0;

    return { 
      costoVentas: actCostoVentas, 
      ingresoVentas: actIngresoVentas, 
      margenVentas: actMargenVentas, 
      costoPiezas: actCostoPiezas, 
      ingresoServicios: actIngresoServicios, 
      margenServicios: actMargenServicios, 
      ordenesSinPiezas: actOrdenesSinPiezas, 
      neta: actMargenVentas + actMargenServicios 
    };
  }, [sales, orders, inventory, sessionId, config.enablePOS, config.enableTaller]);

  // Estadísticas del turno para Créditos y Apartados
  const creditApartadoStats = useMemo(() => {
    // 1. Fiados (Créditos)
    const activeAccounts = (creditAccounts || []).filter(acc => !acc.deletedAt);
    const sessionCreditEntries = activeAccounts.flatMap(acc => 
      (acc.entries || []).filter(e => e.sessionId === sessionId)
    );
    const totalCreditedSales = sessionCreditEntries.reduce((s, e) => s + e.subtotal, 0);
    const countCreditSales = sessionCreditEntries.length;

    const sessionCreditPayments = activeAccounts.flatMap(acc =>
      (acc.payments || []).filter(p => p.sessionId === sessionId)
    );
    const totalCreditPayments = sessionCreditPayments.reduce((s, p) => s + p.amount, 0);

    // 2. Apartados
    const sessionApartados = (apartados || []).filter(a => a.sessionId === sessionId);
    const totalApartadosValue = sessionApartados.reduce((s, a) => s + a.totalValue, 0);
    const countApartados = sessionApartados.length;

    const sessionApartadoPayments = (apartados || []).flatMap(a =>
      (a.payments || []).filter(p => p.sessionId === sessionId)
    );
    const totalApartadoPayments = sessionApartadoPayments.reduce((s, p) => s + p.amount, 0);

    return {
      totalCreditedSales,
      countCreditSales,
      totalCreditPayments,
      totalApartadosValue,
      countApartados,
      totalApartadoPayments,
    };
  }, [creditAccounts, apartados, sessionId]);

  // Whenever the detail coins change, update coinsAmount automatically
  // Countdown para auto-confirmación en tercer intento
  useEffect(() => {
    if (!confirm?.autoConfirm) return;
    setCountdown(confirm.autoConfirm);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          confirm.onOk();
          setConfirm(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirm?.autoConfirm]);

  useEffect(() => {
    if (showCoinsPanel) {
      const computedCoins =
        (coinQ20 * 20) +
        (coinQ10 * 10) +
        (coinQ5 * 5) + 
        (coinQ2 * 2) + 
        (coinQ1 * 1) + 
        (coinQ05 * 0.5);
      setCoinsAmount(computedCoins);
    }
  }, [coinQ20, coinQ10, coinQ5, coinQ2, coinQ1, coinQ05, showCoinsPanel]);

  // Mathematically computed fields
  const totalBilletes = 
    (q1000 * 1000) + 
    (q500 * 500) + 
    (q200 * 200) + 
    (q100 * 100) + 
    (q50 * 50) + 
    (q20 * 20);

  const totalFisicoContado = totalBilletes + coinsAmount;

  // Dynamic Right-side calculation parameters
  const totalEntradas = saldoInicial + 
    (config.enablePOS !== false ? (ventasEfectivo + comisionesRecargas + recargasPlanes) : 0) + 
    (config.enableTaller !== false ? serviciosTecnicos : 0) + 
    abonosFiadosEfectivo +
    abonosApartadosEfectivo +
    entradasManuales;
  const totalSalidas = (config.enablePOS !== false ? devolucionesVentas : 0) + (config.enableTaller !== false ? devolucionesServicios : 0) + salidasManuales;

  const totalRequeridoCaja = totalEntradas - totalSalidas;
  const discrepancy = totalFisicoContado - totalRequeridoCaja;

  // Dynamic metrics for the category icons dashboard
  const margenPercent = useMemo(() => {
    if (totalEntradas === 0) return 0;
    return Math.round((utilidad.neta / totalEntradas) * 100);
  }, [utilidad.neta, totalEntradas]);

  const ventasUsuarioActual = useMemo(() => {
    const daySales = sales.filter(s => !s.isCancelled && s.sessionId === sessionId);
    const targetUser = (currentUser || 'Administrador').toLowerCase().trim();
    return daySales
      .filter(s => {
        const creator = (s.createdBy || '').toLowerCase().trim();
        if (!creator && targetUser === 'administrador') return true;
        return creator === targetUser;
      })
      .reduce((acc, s) => {
        const saleRepairsTotal = s.items
          .filter(item => item.itemId && item.itemId.startsWith('repair-'))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        return acc + Math.max(0, s.total - saleRepairsTotal);
      }, 0);
  }, [sales, sessionId, currentUser]);

  // Formats text into Spanish display spelling
  const textWordsSpanish = numberToSpanishWords(totalFisicoContado);

  const totalSales = ventasEfectivo + ventasTarjeta;
  const cashPct = totalSales > 0 ? Math.round((ventasEfectivo / totalSales) * 100) : 100;
  const cardPct = totalSales > 0 ? Math.round((ventasTarjeta / totalSales) * 100) : 0;

  if (!isOpen) return null;

  const hasCountInProgress = q1000 > 0 || q500 > 0 || q200 > 0 || q100 > 0 || q50 > 0 || q20 > 0 || coinsAmount > 0;

  const saveDraftNow = () => {
    const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const total = (q1000*1000)+(q500*500)+(q200*200)+(q100*100)+(q50*50)+(q20*20)+coinsAmount;
    const newDraft = { time, q1000, q500, q200, q100, q50, q20, coinsAmount, total };
    setDrafts(prev => [newDraft, ...prev.slice(0, 9)]);
    setSavedDraft(time);
    setSavedSnapshot({ q1000, q500, q200, q100, q50, q20, coinsAmount });
  };

  const countMatchesSnapshot = savedSnapshot !== null
    && savedSnapshot.q1000 === q1000
    && savedSnapshot.q500 === q500
    && savedSnapshot.q200 === q200
    && savedSnapshot.q100 === q100
    && savedSnapshot.q50 === q50
    && savedSnapshot.q20 === q20
    && savedSnapshot.coinsAmount === coinsAmount;

  const handleCloseRequest = () => {
    if (hasCountInProgress && !countMatchesSnapshot) {
      setShowExitPrompt(true);
    } else {
      if (isMobileScreen) {
        closeMobileCorteSheet();
      } else {
        onClose();
      }
    }
  };



  // Helper to scroll and flash highlight a section
  const highlightSection = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      const highlightColor = (isLight) ? '#bae6fd' : '#075985';
      
      // Collect target element and its sub-elements to apply the highlight background
      const elements: HTMLElement[] = [target];
      
      // Target buttons (e.g. accordion headers)
      target.querySelectorAll('button').forEach(el => elements.push(el as HTMLElement));
      
      // Target text/number inputs
      target.querySelectorAll('input').forEach(el => elements.push(el as HTMLElement));
      
      // Target custom resumen fields
      target.querySelectorAll('.corte-resumen-field').forEach(el => elements.push(el as HTMLElement));

      // Save original styles
      const origStyles = elements.map(el => ({
        el,
        bg: el.style.backgroundColor,
        transition: el.style.transition
      }));

      // Apply highlight color and smooth transition
      origStyles.forEach(({ el }) => {
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = highlightColor;
      });

      // Restore original styles after a short delay
      setTimeout(() => {
        origStyles.forEach(({ el, bg, transition }) => {
          el.style.backgroundColor = bg;
          // Clean up transition inline style after fade out
          setTimeout(() => {
            el.style.transition = transition;
          }, 350);
        });
      }, 1000);
    }
  };

  const buildCorte = (noCoincidio = false) => ({
    id: `CORTE-${Date.now().toString().slice(-6)}`,
    date: selectedDate,
    time: new Date().toTimeString().split(' ')[0],
    user: 'garciahugo0@gmail.com',
    startingCash: saldoInicial,
    totals: { pos: ventasEfectivo, servicio: serviciosTecnicos, entradas: totalEntradas, salidas: totalSalidas, neto: totalRequeridoCaja, abonosFiados: abonosFiadosEfectivo, abonosApartados: abonosApartadosEfectivo, entradasManuales: entradasManuales },
    denominations: { b1000: q1000, b500: q500, b200: q200, b100: q100, b50: q50, b20: q20, m20: coinQ20, m10: coinQ10, m5: coinQ5, m2: coinQ2, m1: coinQ1, m05: coinQ05, monedasTotal: coinsAmount },
    fisico: totalFisicoContado,
    estimado: totalRequeridoCaja,
    diferencia: discrepancy,
    noCoincidio,
    comment: corteComment.trim()
      ? corteComment.trim()
      : noCoincidio
      ? `Corte forzado tras 3 intentos sin cuadrar. Sesión #${sessionId}.`
      : `Corte de caja registrado para sesión #${sessionId}.`,
    creditTotals: {
      creditedSales: creditApartadoStats.totalCreditedSales,
      countCreditSales: creditApartadoStats.countCreditSales,
      creditPayments: creditApartadoStats.totalCreditPayments
    },
    apartadoTotals: {
      apartadosValue: creditApartadoStats.totalApartadosValue,
      countApartados: creditApartadoStats.countApartados,
      apartadoPayments: creditApartadoStats.totalApartadoPayments
    },
  });

  const buildCorteTicketHtml = (corte: ReturnType<typeof buildCorte>) => {
    const sym = config.currencySymbol || '$';
    const storeName = (config.storeName || 'TALLER').toUpperCase();
    const phone = config.phone || '';
    const address = config.address || '';
    const slogan = config.slogan || '';
    const footer = config.ticketFooter || '¡Gracias por su preferencia!';

    const storeInfoParts = [phone, address, slogan].filter(Boolean);
    const storeInfoHtml = storeInfoParts.length
      ? `<div style="font-size:9.5px;color:#000;font-weight:700;line-height:1.4;margin-top:2px">${storeInfoParts.join('<br>')}</div>`
      : '';

    const logoSrc = config.ticketLogoUrl || '';
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" style="max-height: 20mm; max-width: 45mm; object-fit: contain; display: block; margin: 0 auto;" />`
      : '';

    const statusColor = corte.diferencia === 0 ? '#15803d' : corte.diferencia > 0 ? '#b45309' : '#b91c1c';
    const isDiferencia = corte.diferencia !== 0;
    const resultadoIcon = corte.diferencia === 0 ? '✓ CUADRADO EXACTO' : corte.diferencia > 0 ? `▲ SOBRANTE +${sym}${Math.abs(corte.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `▼ FALTANTE -${sym}${Math.abs(corte.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const abonosFiados = (corte.totals as any)?.abonosFiados || 0;
    const abonosApartados = (corte.totals as any)?.abonosApartados || 0;
    const entradasManuales = corte.totals.entradas - corte.startingCash - corte.totals.pos - corte.totals.servicio - abonosFiados - abonosApartados;

    const rowHtml = (lbl: string, val: string) =>
      `<div class="row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`;

    const denoms = [
      { label: '$1000', q: corte.denominations.b1000 || 0, val: (corte.denominations.b1000 || 0) * 1000 },
      { label: '$500',  q: corte.denominations.b500 || 0,  val: (corte.denominations.b500 || 0) * 500 },
      { label: '$200',  q: corte.denominations.b200 || 0,  val: (corte.denominations.b200 || 0) * 200 },
      { label: '$100',  q: corte.denominations.b100 || 0,  val: (corte.denominations.b100 || 0) * 100 },
      { label: '$50',   q: corte.denominations.b50 || 0,   val: (corte.denominations.b50 || 0) * 50 },
      { label: '$20',   q: corte.denominations.b20 || 0,   val: (corte.denominations.b20 || 0) * 20 },
    ].filter(d => d.q > 0);

    const hasCreditOrApartado = 
      corte.creditTotals.creditedSales > 0 || 
      corte.creditTotals.creditPayments > 0 || 
      corte.apartadoTotals.apartadosValue > 0 || 
      corte.apartadoTotals.apartadoPayments > 0;

    const isMediaCarta = false;
    const isMediaCartaDuplicado = false;

    if (isMediaCarta || isMediaCartaDuplicado) {
      const formattedStorePhone = config.phone
        ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
        : '';

      const pageCSS = isMediaCarta
        ? `@page { size: 216mm 140mm; margin: 0; }
           * { box-sizing: border-box; }
           body { font-family: system-ui, sans-serif; width: 216mm; height: 140mm; padding: 6mm; box-sizing: border-box; background: #fff; color: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
           .invoice-container { width: 90mm; height: 128mm; display: flex; flex-direction: column; justify-content: space-between; margin: 0 auto; }`
        : `@page { size: 210mm 297mm; margin: 0; }
           * { box-sizing: border-box; }
           body { font-family: system-ui, sans-serif; width: 210mm; height: 297mm; margin: 0; padding: 0; background: #fff; color: #000; overflow: hidden; }
           .ticket-copy { height: 145mm; padding: 6mm; box-sizing: border-box; overflow: hidden; display: flex; align-items: center; justify-content: center; }
           .invoice-container { width: 90mm; height: 133mm; display: flex; flex-direction: column; justify-content: space-between; margin: 0 auto; }
           .divider-line { height: 7mm; display: flex; align-items: center; justify-content: center; border-top: 1px dashed #000; position: relative; margin: 0; }
           .divider-text { font-size: 8px; font-weight: bold; background: #fff; padding: 0 10px; color: #000; letter-spacing: 2px; position: absolute; top: -6px; }`;

      const commonStyles = `
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .header-cell { vertical-align: top; }
        .store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }
        .store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }
        .grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .grid-body { padding: 6px; }
        .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }
        .data-row:last-child { border-bottom: none; }
        .data-label { font-weight: 700; color: #475569; }
        .data-value { font-weight: 700; color: #000; text-align: right; }
        .total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }
        .total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }
        .comment-box { font-size: 8px; color: #334155; line-height: 1.35; border: 1.5px solid #000; padding: 5px 6px; background: #f8fafc; border-radius: 4px; height: 100%; min-height: 12mm; }
        .signatures-table { width: 100%; margin-top: 5px; margin-bottom: 0; }
        .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
      `;

      const ticketContent = `
        <div class="invoice-container">
          <div>
            <table class="header-table">
              <tr>
                <td class="header-cell" style="width: 40%;">${logoHtml}</td>
                <td class="header-cell" style="width: 60%; padding-left: 10px; text-align: center;">
                  <div class="store-title">${storeName}</div>
                  <div class="store-details">
                    ${slogan ? '<i>"' + slogan + '"</i><br>' : ''}
                    ${address ? 'Dirección: ' + address + '<br>' : ''}
                    ${formattedStorePhone ? 'Tel: ' + formattedStorePhone : ''}
                  </div>
                </td>
              </tr>
            </table>
            <table style="width: 100%; margin-bottom: 8px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Información del Corte</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Sesión:</span><span class="data-value">#${sessionId}</span></div>
                      <div class="data-row"><span class="data-label">Folio:</span><span class="data-value">${corte.id}</span></div>
                      <div class="data-row"><span class="data-label">Fecha / Hora:</span><span class="data-value">${corte.date ? corte.date.split('-').reverse().join('/') : ''} ${corte.time}</span></div>
                      ${currentUser ? '              <div class="data-row"><span class="data-label">Operador:</span><span class="data-value">' + currentUser.toUpperCase() + '</span></div>' : ''}
                    </div>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Resumen de Cuadre</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Esperado en Caja:</span><span class="data-value">${sym}${corte.estimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Efectivo Contado:</span><span class="data-value">${sym}${corte.fisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Diferencia:</span><span class="data-value" style="color:${statusColor};">${corte.diferencia >= 0 ? '+' : ''}${sym}${corte.diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            <table style="width: 100%; margin-bottom: 8px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Movimientos de Caja</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Fondo Inicial:</span><span class="data-value">${sym}${corte.startingCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Ventas Efectivo:</span><span class="data-value">${sym}${corte.totals.pos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      ${corte.totals.servicio > 0 ? '              <div class="data-row"><span class="data-label">Servicios:</span><span class="data-value">' + sym + corte.totals.servicio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                      ${abonosFiados > 0 ? '              <div class="data-row"><span class="data-label">Abonos Fiados:</span><span class="data-value">' + sym + abonosFiados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                      ${abonosApartados > 0 ? '              <div class="data-row"><span class="data-label">Abonos Apartados:</span><span class="data-value">' + sym + abonosApartados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                      ${entradasManuales > 0 ? '              <div class="data-row"><span class="data-label">Entradas Manuales:</span><span class="data-value">' + sym + entradasManuales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                      ${corte.totals.salidas > 0 ? '              <div class="data-row"><span class="data-label">Salidas:</span><span class="data-value">-' + sym + corte.totals.salidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                      ${ventasTarjeta > 0 ? '              <div class="data-row"><span class="data-label">Tarjeta/Transfer (Info):</span><span class="data-value">' + sym + ventasTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                    </div>
                  </div>
                  ${hasCreditOrApartado ?
                  '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-top: 6px;">' +
                  '            <div class="grid-title">Créditos y Apartados (Info)</div>' +
                  '            <div class="grid-body">' +
                  (corte.creditTotals.creditedSales > 0 ? '              <div class="data-row"><span class="data-label">Ventas Fiadas:</span><span class="data-value">' + sym + corte.creditTotals.creditedSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
                  (corte.creditTotals.creditPayments > 0 ? '              <div class="data-row"><span class="data-label">Abonos Fiados:</span><span class="data-value">' + sym + corte.creditTotals.creditPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
                  (corte.apartadoTotals.apartadosValue > 0 ? '              <div class="data-row"><span class="data-label">Nuevos Apartados:</span><span class="data-value">' + sym + corte.apartadoTotals.apartadosValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
                  (corte.apartadoTotals.apartadoPayments > 0 ? '              <div class="data-row"><span class="data-label">Abonos/Anticipos:</span><span class="data-value">' + sym + corte.apartadoTotals.apartadoPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
                  '            </div>' +
                  '          </div>' : ''}
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Conteo de Billetes y Monedas</div>
                    <div class="grid-body">
                      ${denoms.length > 0 ? denoms.map(d =>
                      '              <div class="data-row"><span class="data-label">' + d.label + ':</span><span class="data-value">' + d.q + ' &times; ' + sym + (d.val/d.q).toFixed(0) + ' = ' + sym + d.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
                      ).join('') : '              <div class="data-row" style="color: #64748b; font-style: italic; font-weight: 500;">No se registraron billetes</div>'}
                      ${corte.denominations.monedasTotal > 0 ? '              <div class="data-row"><span class="data-label">Monedas:</span><span class="data-value">' + sym + corte.denominations.monedasTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : ''}
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          <div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 5px;">
                  <div class="comment-box"><b>OBSERVACIONES/COMENTARIOS:</b><br><span style="text-transform: uppercase;">' + corte.comment + '</span></div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
                    <div class="total-row"><span class="data-label">Esperado:</span><span class="data-value">' + sym + corte.estimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>
                    <div class="total-row"><span class="data-label">Contado:</span><span class="data-value">' + sym + corte.fisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>
                    <div class="total-row grand-total" style="background: ' + (isDiferencia ? statusColor : '#000') + '; font-size: 11px; padding: 3px;"><span>ESTADO:</span><span>' + resultadoIcon + '</span></div>
                  </div>
                  <table class="signatures-table" style="width: 100%; margin-top: 15px; margin-bottom: 0;">
                    <tr>
                      <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Cajero</div></td>
                      <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Auditor/Admin</div></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
              <div class="bc-target" style="margin: 0 auto; display: flex; justify-content: center; height: 35px;"></div>
              <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ' + corte.id + ' *</div>
              <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">' + footer + '</div>
            </div>
          </div>
        </div>
      `;

      const code128Script = `(function(){
        var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
        var START_B=104,STOP=106;
        function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}
        function draw(text){
          var codes=encode(text);var bw=2,h=40,x=10,bars=[];
          for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}
          var tw=x+10;
          var barcodeAsImage = ${!!config.barcodeAsImage};
          var targets = document.getElementsByClassName('bc-target');
          if (barcodeAsImage) {
            var canvas=document.createElement('canvas');canvas.width=tw;canvas.height=h;
            var ctx=canvas.getContext('2d');
            ctx.fillStyle='white';ctx.fillRect(0,0,tw,h);
            ctx.fillStyle='black';
            for(var k=0;k<bars.length;k++){ctx.fillRect(bars[k].x,0,bars[k].w,h);}
            var imgUrl=canvas.toDataURL('image/png');
            var img='<img src="'+imgUrl+'" style="display:block;width:100%;height:auto" />';
            for(var idx=0; idx<targets.length; idx++){ targets[idx].innerHTML=img; }
          } else {
            var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+tw+' '+h+'" shape-rendering="crispEdges" style="display:block;width:100%;height:auto">';
            for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black" shape-rendering="crispEdges"/>';}
            svg+='</svg>';
            for(var idx=0; idx<targets.length; idx++){ targets[idx].innerHTML=svg; }
          }
        }
        draw('${corte.id}');
      })();`;

      const pageHtml = isMediaCarta
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>${ticketContent}<script>${code128Script}</script></body></html>`
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>
            <div class="ticket-copy">${ticketContent}</div>
            <div class="divider-line"><span class="divider-text">RECORTAR AQUÍ</span></div>
            <div class="ticket-copy">${ticketContent}</div>
            <script>${code128Script}</script>
          </body></html>`;
      return pageHtml;
    }

    const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
    const is58 = paperWidth === '58mm';

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
<div class="sub-header">BILLETES</div>
${denomRows}
` : '';

    const coins = [
      { label: '$20',   q: (corte.denominations as any).m20 || 0,   val: ((corte.denominations as any).m20 || 0) * 20 },
      { label: '$10',   q: (corte.denominations as any).m10 || 0,   val: ((corte.denominations as any).m10 || 0) * 10 },
      { label: '$5',    q: (corte.denominations as any).m5 || 0,    val: ((corte.denominations as any).m5 || 0) * 5 },
      { label: '$2',    q: (corte.denominations as any).m2 || 0,    val: ((corte.denominations as any).m2 || 0) * 2 },
      { label: '$1',    q: (corte.denominations as any).m1 || 0,    val: ((corte.denominations as any).m1 || 0) * 1 },
      { label: '$0.50', q: (corte.denominations as any).m05 || 0,  val: ((corte.denominations as any).m05 || 0) * 0.5 },
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
      <td style="text-align: right; width: 35%; padding: 2.5px 0; font-weight: inherit;">${sym}${corte.denominations.monedasTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>`;
    }

    const monedasHtml = corte.denominations.monedasTotal > 0 ? `
<div class="sub-header">MONEDAS</div>
${coinsRows}
` : '';

    const offset = config.ticketMarginOffset || 0;
    const rightPad = is58 ? '4mm' : '6mm';
    const leftPad = is58 ? '3mm' : '5mm';
    const bottomPad = is58 ? '2mm' : '4mm';

    const creditApartadoHtml = hasCreditOrApartado ? `
<hr class="sep">
<div class="section-title">CRÉDITOS Y APARTADOS (INFO)</div>
${corte.creditTotals.creditedSales > 0 ? rowHtml('Ventas fiadas:', `${sym}${corte.creditTotals.creditedSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${corte.creditTotals.creditPayments > 0 ? rowHtml('Abonos fiados:', `${sym}${corte.creditTotals.creditPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${corte.apartadoTotals.apartadosValue > 0 ? rowHtml('Nuevos apartados:', `${sym}${corte.apartadoTotals.apartadosValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${corte.apartadoTotals.apartadoPayments > 0 ? rowHtml('Abonos/Anticipos:', `${sym}${corte.apartadoTotals.apartadoPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
` : '';

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
@page { size: ${paperWidth} auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; padding: 0 calc(${rightPad} - ${offset}px) ${bottomPad} calc(${leftPad} + ${offset}px); color: #000; background: #fff; overflow-wrap: break-word; word-break: break-word; }
.sep { border: none !important; border-top: 1.5px dashed #000000 !important; height: 0 !important; margin: 8px 0 !important; display: block !important; clear: both !important; }
.section-badge { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; font-weight: 900 !important; font-size: ${is58 ? '10' : '12'}px !important; background-color: #000000 !important; color: #ffffff !important; padding: 7px 0 !important; margin: 6px 0 !important; letter-spacing: 1.5px !important; line-height: 1 !important; box-sizing: border-box !important; }
.section-title { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; font-weight: 900 !important; font-size: ${is58 ? '10' : '11'}px !important; margin: 8px 0 4px 0 !important; text-decoration: underline !important; letter-spacing: 0.5px !important; line-height: 1.2 !important; }
.sub-header { font-size: ${is58 ? '9.5' : '11'}px !important; font-weight: 900 !important; text-align: left !important; margin: 8px 0 4px 0 !important; padding-bottom: 4px !important; border-bottom: 1px dashed #000000 !important; line-height: 1.2 !important; }
.row { display: flex !important; align-items: center !important; justify-content: space-between !important; font-size: ${is58 ? '10' : '12'}px; margin: 3.5px 0 !important; line-height: 1.35 !important; }
.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }
.val { text-align: right; flex: 1; min-width: 0; }
.total-line { display: flex !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; font-size: ${is58 ? '12' : '14'}px !important; font-weight: 900 !important; margin: 6px 0 !important; padding: 8px 8px !important; background-color: #000000 !important; color: #ffffff !important; letter-spacing: 0.5px !important; line-height: 1 !important; box-sizing: border-box !important; }
.result-line { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; font-size: ${is58 ? '11' : '13'}px !important; font-weight: 900 !important; margin: 6px 0 !important; padding: 8px 8px !important; background-color: #000000 !important; color: #ffffff !important; letter-spacing: 0.5px !important; line-height: 1 !important; box-sizing: border-box !important; }
.footer-text { font-size: ${is58 ? '8.5' : '9.5'}px; text-align: center; font-weight: 700; margin: 6px 0 2px 0; }
</style>
</head><body>
<div style="text-align:center;margin-bottom:4px">
  ${logoHtml}
  <div style="font-size:15px;font-weight:900;letter-spacing:1px;line-height:1.1">${storeName}</div>
  ${storeInfoHtml}
</div>
<hr class="sep">
<div class="section-badge">CORTE DE CAJA</div>
${rowHtml('Sesión:', `#${sessionId}`)}
${rowHtml('Folio:', corte.id)}
${rowHtml('Fecha:', `${corte.date ? corte.date.split('-').reverse().join('/') : ''}`)}
${rowHtml('Hora:', `${corte.time}`)}
${currentUser ? rowHtml('Operador:', currentUser) : ''}
<hr class="sep">
<div class="section-title">MOVIMIENTOS DE CAJA</div>
${rowHtml('Fondo inicial:', `${sym}${corte.startingCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
${rowHtml('Ventas efectivo:', `${sym}${corte.totals.pos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
${corte.totals.servicio > 0 ? rowHtml('Servicios:', `${sym}${corte.totals.servicio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${abonosFiados > 0 ? rowHtml('Abonos fiados:', `${sym}${abonosFiados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${abonosApartados > 0 ? rowHtml('Abonos apartados:', `${sym}${abonosApartados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${entradasManuales > 0 ? rowHtml('Entradas manuales:', `${sym}${entradasManuales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
${corte.totals.salidas > 0 ? rowHtml('Salidas:', `-${sym}${corte.totals.salidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
<div class="total-line"><span>ESPERADO EN CAJA:</span><span>${sym}${corte.estimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
${ventasTarjeta > 0 ? `<div class="row" style="font-size:10px;margin-top:2px;color:#000"><span>Tarjeta/Transfer (Info):</span><span>${sym}${ventasTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
${creditApartadoHtml}
<hr class="sep">
<div class="section-title">CONTEO DE EFECTIVO</div>
${billetesHtml}
${monedasHtml}
<div class="total-line"><span>TOTAL CONTADO:</span><span>${sym}${corte.fisico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
<hr class="sep">
<div class="result-line">${resultadoIcon}</div>
<hr class="sep">
<div id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>
<hr class="sep">
<div class="footer-text">${footer}</div>
<script>
(function(){
  var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
  var START_B=104,STOP=106;
  function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}
  function draw(text){
    var codes=encode(text);var bw=2,h=40,x=10,bars=[];
    for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}
    var tw=x+10;
    var barcodeAsImage = ${!!config.barcodeAsImage};
    var el = document.getElementById('bc');
    if (barcodeAsImage) {
      var canvas=document.createElement('canvas');canvas.width=tw;canvas.height=h;
      var ctx=canvas.getContext('2d');
      ctx.fillStyle='white';ctx.fillRect(0,0,tw,h);
      ctx.fillStyle='black';
      for(var k=0;k<bars.length;k++){ctx.fillRect(bars[k].x,0,bars[k].w,h);}
      var imgUrl=canvas.toDataURL('image/png');
      var img='<img src="'+imgUrl+'" style="display:block;width:100%;height:auto" />';
      if (el) el.innerHTML=img;
    } else {
      var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+tw+' '+h+'" shape-rendering="crispEdges" style="display:block;width:100%;height:auto">';
      for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black" shape-rendering="crispEdges"/>';}
      svg+='</svg>';
      if (el) el.innerHTML=svg;
    }
  }
  draw('${corte.id}');
})();
</script>
</body></html>`;
  };

  const finalizarCorte = async (noCoincidio = false) => {
    setIsSaving(true);
    setCorteStep(1); // 1. Generando reporte local
    await new Promise(resolve => setTimeout(resolve, 800));

    const newCorte = buildCorte(noCoincidio);

    setCorteStep(2); // 2. Imprimiendo ticket
    try {
      const html = buildCorteTicketHtml(newCorte);
      let effectivePosWidth = config.hybridPrintMode
        ? (config.posPaperWidth || '80mm')
        : (config.ticketPaperWidth || '80mm');
      if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
        effectivePosWidth = '80mm';
      }
      const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : 72000;
      const paperHeightMicrons = undefined;
      const deviceName = config.hybridPrintMode
        ? (config.posPrinterBrand || config.ticketPrinterBrand || undefined)
        : (config.ticketPrinterBrand || undefined);
      window.dispatchEvent(new CustomEvent('automated-print', { detail: { type: 'ticket', name: 'Corte de caja', details: new Date().toLocaleDateString('es-MX') } }));
      window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: {
        html,
        deviceName,
        paperWidthMicrons,
        paperHeightMicrons,
        isLabel: false,
      } }));
    } catch (e) {
      console.warn('[Corte] Error al imprimir ticket:', e);
    }
    await new Promise(resolve => setTimeout(resolve, 800));

    setCorteStep(3); // 3. Enviando Telegram
    await sendTelegram(config, tgCorte(newCorte, config), 'Corte de caja').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 800));

    setCorteStep(4); // 4. Guardando copia y subiendo a nube
    try {
      await onSaveCorte(newCorte);
    } catch (e) {
      console.error('[Corte] Error en onSaveCorte:', e);
    }

    setCorteStep(5); // 5. Finalizando y cerrando sistema
    await new Promise(resolve => setTimeout(resolve, 1200));

    setIntentosFallidos(0);
    setCorteWarning(null);
    
    if (onComplete) {
      onComplete();
    } else {
      onClose();
      setIsSaving(false);
    }
  };

  const prepareCorteHtmlForCapture = (rawHtml: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      const existingStyles = Array.from(doc.querySelectorAll('style'))
        .map(styleEl => styleEl.textContent || '')
        .join('\n');

      const bodyContent = doc.body ? doc.body.innerHTML : rawHtml;

      return `
        <div id="corte-mobile-capture-root" style="width: 340px; background-color: #ffffff !important; color: #000000 !important; font-family: monospace, sans-serif; padding: 12px; box-sizing: border-box;">
          <style>
            ${existingStyles}
            #corte-mobile-capture-root * {
              box-sizing: border-box !important;
              color: #000000 !important;
              font-family: monospace, sans-serif !important;
            }
            #corte-mobile-capture-root .section-badge, 
            #corte-mobile-capture-root .badge {
              background-color: #000000 !important;
              color: #ffffff !important;
              padding: 5px 0 !important;
              text-align: center !important;
              display: block !important;
              font-weight: 900 !important;
            }
            #corte-mobile-capture-root .section-badge *, 
            #corte-mobile-capture-root .badge * {
              color: #ffffff !important;
            }
            #corte-mobile-capture-root .total-line {
              background-color: #000000 !important;
              color: #ffffff !important;
              padding: 6px 8px !important;
              display: flex !important;
              justify-content: space-between !important;
              font-weight: 900 !important;
            }
            #corte-mobile-capture-root .total-line * {
              color: #ffffff !important;
            }
            #corte-mobile-capture-root hr, 
            #corte-mobile-capture-root .sep {
              border: none !important;
              border-top: 1.5px dashed #000000 !important;
              height: 0 !important;
              margin: 8px 0 !important;
            }
          </style>
          ${bodyContent}
        </div>
      `;
    } catch (e) {
      return rawHtml;
    }
  };

  const shareCorteWhatsappImage = async (ticketHtml: string) => {
    try {
      // Crear iframe aislado fuera del árbol DOM principal para evitar que html2canvas distorsione el viewport de la app
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0px';
      iframe.style.width = '350px';
      iframe.style.height = '1200px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      iframeDoc.open();
      iframeDoc.write(ticketHtml);
      iframeDoc.close();

      // Breve pausa para asegurar renderizado de tipografías y código de barras dentro del iframe aislado
      await new Promise(resolve => setTimeout(resolve, 150));

      const lastChild = iframeDoc.body.lastElementChild as HTMLElement;
      const calculatedBottom = lastChild ? (lastChild.offsetTop + lastChild.offsetHeight + 15) : 0;
      const realHeight = calculatedBottom > 100 ? calculatedBottom : iframeDoc.body.scrollHeight;

      iframe.style.height = `${realHeight}px`;

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: realHeight,
        windowHeight: realHeight
      });

      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }

      return new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const file = new File([blob], `corte_caja_${Date.now()}.png`, { type: 'image/png' });

          if (navigator.share && typeof navigator.share === 'function') {
            try {
              await navigator.share({
                files: [file]
              });
              resolve();
              return;
            } catch (shareErr: any) {
              if (shareErr.name === 'AbortError') {
                resolve();
                return;
              }
            }
          }

          const phone = config.phone ? config.phone.replace(/\D/g, '') : '';
          const url = phone 
            ? `https://api.whatsapp.com/send?phone=${phone}`
            : `https://api.whatsapp.com/send`;
          window.open(url, '_blank');
          resolve();
        }, 'image/png');
      });
    } catch (err) {
      console.error("Error al capturar ticket de corte a imagen para WhatsApp:", err);
    }
  };

  const executeMobileCorteWithOptions = async (option: 'only' | 'print' | 'whatsapp') => {
    setIsSaving(true);
    setCorteStep(1);
    await new Promise(resolve => setTimeout(resolve, 400));

    const noCoincidio = discrepancy !== 0;
    const newCorte = buildCorte(noCoincidio);
    const ticketHtml = buildCorteTicketHtml(newCorte);

    if (option === 'print') {
      setCorteStep(2);
      try {
        let effectivePosWidth = config.hybridPrintMode
          ? (config.posPaperWidth || '80mm')
          : (config.ticketPaperWidth || '80mm');
        if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
          effectivePosWidth = '80mm';
        }
        const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : 72000;
        const deviceName = config.hybridPrintMode
          ? (config.posPrinterBrand || config.ticketPrinterBrand || undefined)
          : (config.ticketPrinterBrand || undefined);

        window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: {
          html: ticketHtml,
          deviceName,
          paperWidthMicrons,
          paperHeightMicrons: undefined,
          isLabel: false,
        } }));
      } catch (e) {
        console.warn('[Corte] Error imprimiendo ticket:', e);
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    } else if (option === 'whatsapp') {
      setCorteStep(2);
      await shareCorteWhatsappImage(ticketHtml);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setCorteStep(3);
    await sendTelegram(config, tgCorte(newCorte, config), 'Corte de caja').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 400));

    setCorteStep(4);
    try {
      await onSaveCorte(newCorte);
    } catch (e) {
      console.error('[Corte] Error en onSaveCorte:', e);
    }

    setCorteStep(5);
    await new Promise(resolve => setTimeout(resolve, 600));

    setIntentosFallidos(0);
    setCorteWarning(null);

    if (onComplete) {
      onComplete();
    } else {
      onClose();
      setIsSaving(false);
    }
  };

  const handleMobileFinalizarClick = () => {
    // Si el conteo no coincide y es intento 1 ó 2 (intentosFallidos < 2)
    if (discrepancy !== 0 && intentosFallidos < 2) {
      const nextAttempt = intentosFallidos + 1;
      setIntentosFallidos(nextAttempt);
      const sym = config.currencySymbol || '$';
      const diffStr = `${sym}${Math.abs(discrepancy).toFixed(2)}`;
      const statusStr = discrepancy < 0 ? `FALTANTE de -${diffStr}` : `SOBRANTE de +${diffStr}`;
      setCorteWarning(`⚠️ ATENCIÓN: El efectivo contado no coincide con el esperado (${statusStr}).\n\nIntento ${nextAttempt} de 3. Por favor verifica tus billetes o presiona de nuevo "Finalizar Corte" para proceder.`);
      return;
    }

    // Al 3er intento o si cuadra perfectamente
    setCorteWarning(null);
    setShowMobileCorteOptionsModal(true);
  };

  const handleRegisterCorte = () => {
    setCorteWarning(null);
    const sym = config.currencySymbol;

    // Sin conteo capturado — corte directo sin confirmación extra
    if (totalFisicoContado === 0 && totalRequeridoCaja === 0) {
      setConfirm({
        title: '¿Finalizar el corte de caja?',
        body: `No se ha ingresado conteo de efectivo.\n\n• Contado: ${sym}0.00\n• Esperado: ${sym}${totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nSe registrará el corte con diferencia de ${sym}${Math.abs(discrepancy).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        onOk: () => finalizarCorte(false)
      });
      return;
    }

    // Exacto ✅
    if (discrepancy === 0) {
      setConfirm({
        title: '✅ Efectivo cuadrado — ¿Finalizar corte?',
        body: `El efectivo contado coincide exactamente con lo esperado.\n\n• Contado: ${sym}${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Esperado: ${sym}${totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Diferencia: ${sym}0.00 ✓\n\nSe cerrará la sesión de caja.`,
        onOk: () => finalizarCorte(false)
      });
      return;
    }

    // Sobrante 📈 — permitir con confirmación
    if (discrepancy > 0) {
      setConfirm({
        title: '📈 Sobrante detectado — ¿Finalizar corte?',
        body: `Hay más dinero del esperado en caja.\n\n• Contado: ${sym}${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Esperado: ${sym}${totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Sobrante: +${sym}${discrepancy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nSe registrará el corte con esta diferencia y se cerrará la sesión.`,
        onOk: () => finalizarCorte(false)
      });
      return;
    }

    // Faltante ❌ — contar intentos
    const nuevosIntentos = intentosFallidos + 1;
    setIntentosFallidos(nuevosIntentos);

    if (nuevosIntentos >= 3) {
      // Tercer intento — confirmación automática con countdown
      setConfirm({
        title: '⚠️ 3 intentos fallidos — Corte forzado',
        body: `El efectivo no cuadró después de 3 intentos de conteo.\n\n• Contado: ${sym}${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Esperado: ${sym}${totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Faltante: -${sym}${Math.abs(discrepancy).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nEl corte se registrará marcado como "No coincidió". Confirmando automáticamente...`,
        onOk: () => finalizarCorte(true),
        autoConfirm: 6
      });
    } else {
      // Aún hay intentos — solo aviso, sin confirmación ni guardar
      const restantes = 3 - nuevosIntentos;
      setCorteWarning(`❌ El efectivo contado (${sym}${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) no coincide con lo esperado (${sym}${totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Faltante: -${sym}${Math.abs(discrepancy).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Vuelve a contar el efectivo. Intentos restantes: ${restantes}.`);
    }
  };

  const isRetro = config.theme === 'retro-window';
  const isLight = (typeof window !== 'undefined' && document.body.classList.contains('mode-dark'))
    ? false
    : (typeof window !== 'undefined' && document.body.classList.contains('mode-light'))
      ? true
      : config.themeMode === 'light';

  const handlePrint = () => {
    const cortePreview = buildCorte(false);
    const html = buildCorteTicketHtml(cortePreview);
    let effectivePosWidth = config.hybridPrintMode
      ? (config.posPaperWidth || '80mm')
      : (config.ticketPaperWidth || '80mm');
    if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
      effectivePosWidth = '80mm';
    }
    const paperWidthMicrons = effectivePosWidth === '58mm' ? 48000 : 72000;
    const paperHeightMicrons = undefined;
    const deviceName = config.hybridPrintMode
      ? (config.posPrinterBrand || config.ticketPrinterBrand || undefined)
      : (config.ticketPrinterBrand || undefined);
    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: {
      html,
      deviceName,
      paperWidthMicrons,
      paperHeightMicrons,
      isLabel: false,
    } }));
  };

  return (
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
      isMobileScreen ? 'p-0' : 'p-0 md:p-4 bg-black/85 backdrop-blur-md'
    }`}>
      {isSaving && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
          {isRetro ? (
            /* ── Retro mini dialog ── */
            <div className="pointer-events-auto bg-[#dfdfdf] border-4 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 shadow-[4px_4px_16px_rgba(0,0,0,0.55)] w-72 flex flex-col font-sans select-none">
              <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-tight">⚙ CIERRE DE SISTEMA — [LPT1]</span>
              </div>
              <div className="p-3 space-y-1.5 font-mono text-[11px] text-left">
                {[
                  { id: 1, label: 'Generar registro local' },
                  { id: 2, label: 'Enviar a ticketera' },
                  { id: 3, label: 'Enviar notificación' },
                  { id: 4, label: 'Subir respaldo nube' },
                  { id: 5, label: 'Apagar sistema' },
                ].map((s) => (
                  <div key={s.id} className={corteStep > s.id ? 'text-green-700 font-bold' : corteStep === s.id ? 'text-blue-800 font-bold' : 'text-slate-400'}>
                    {corteStep > s.id ? '[X]' : corteStep === s.id ? '> ' : '[ ]'} {s.label}
                  </div>
                ))}
              </div>
              <div className="mx-3 mb-3 h-4 bg-zinc-400 border border-zinc-600 relative overflow-hidden flex items-center justify-center">
                <div className="absolute left-0 top-0 bottom-0 bg-[#000080] transition-all duration-500" style={{ width: `${(corteStep / 5) * 100}%` }} />
                <span className="relative z-10 text-[9px] font-mono font-bold text-white mix-blend-difference">{Math.round((corteStep / 5) * 100)}%</span>
              </div>
            </div>
          ) : (
            /* ── Modern compact mini modal ── */
            <div className={`pointer-events-auto w-80 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] border p-5 flex flex-col gap-3 select-none backdrop-blur-sm ${
              isLight
                ? 'bg-white/95 border-zinc-200 text-zinc-900'
                : 'bg-[#0f172a]/95 border-slate-700/60 text-slate-100'
            }`}>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/15 border border-blue-500/30'}`}>
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
                <div>
                  <p className={`text-[13px] font-black leading-none ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>Finalizando jornada</p>
                  <p className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>No apagues el equipo...</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {[
                  { id: 1, label: 'Generando registro de corte...' },
                  { id: 2, label: 'Enviando a ticketera...' },
                  { id: 3, label: 'Enviando notificación...' },
                  { id: 4, label: 'Subiendo copia de seguridad...' },
                  { id: 5, label: 'Apagando sistema...' },
                ].map((step) => {
                  const isDone = corteStep > step.id;
                  const isCurrent = corteStep === step.id;
                  return (
                    <div key={step.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                      isCurrent
                        ? isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/25'
                        : isDone
                        ? isLight ? 'bg-emerald-50/60 border border-transparent' : 'bg-slate-800/40 border border-transparent opacity-60'
                        : 'border border-transparent opacity-30'
                    }`}>
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        </div>
                      ) : (
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isLight ? 'border-zinc-300 bg-zinc-100' : 'border-slate-700 bg-slate-800'}`}>
                          <span className={`text-[8px] font-bold ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>{step.id}</span>
                        </div>
                      )}
                      <span className={`text-[11px] font-semibold leading-none ${isCurrent ? 'text-blue-500' : isDone ? isLight ? 'text-emerald-700' : 'text-slate-300' : isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className={`flex justify-between text-[9px] font-bold uppercase tracking-wider px-0.5 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span>Progreso</span>
                  <span>{Math.round((corteStep / 5) * 100)}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-zinc-200' : 'bg-slate-800'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(corteStep / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WINDOW CONTROLLER GRID / MOBILE NATIVE SWITCH */}
      {isMobileScreen ? (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end select-none animate-fade-in">
          {/* BACKDROP OSCURO TÁCTIL (Sin desenfocado, desvanecimiento progresivo de 350ms) */}
          <div 
            onClick={handleCloseRequest}
            className={`absolute inset-0 bg-black/65 transition-opacity duration-350 ease-out ${
              isClosingMobileCorte ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* TARJETA DESLIZABLE ESTILO iOS NATIVO (Efecto cortina hacia abajo) */}
          <div 
            style={
              isClosingMobileCorte
                ? { transform: 'translateY(100%)' }
                : corteDragY > 0 
                  ? { transform: `translateY(${corteDragY}px)` }
                  : undefined
            }
            className={`relative z-10 w-full max-w-xl mx-auto max-h-[84vh] rounded-t-[36px] shadow-2xl flex flex-col overflow-hidden ${
              isClosingMobileCorte
                ? 'transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]'
                : corteDragY > 0
                  ? 'transition-none'
                  : 'animate-sheet-slide-up'
            } ${
              isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* LENGÜETA TÁCTIL / DRAG HANDLE INTERACTIVO ESTILO iOS (Deslizar hacia abajo para cerrar) */}
            <div 
              onTouchStart={(e) => setCorteStartY(e.touches[0].clientY)}
              onTouchMove={(e) => {
                if (corteStartY === null) return;
                const delta = e.touches[0].clientY - corteStartY;
                if (delta > 0) setCorteDragY(delta);
              }}
              onTouchEnd={() => {
                if (corteDragY > 70) {
                  closeMobileCorteSheet();
                } else {
                  setCorteDragY(0);
                  setCorteStartY(null);
                }
              }}
              className="w-full flex flex-col items-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
            >
              <div className={`w-9 h-1 rounded-full transition-colors ${
                corteDragY > 30 
                  ? (isLight ? 'bg-blue-600' : 'bg-emerald-400') 
                  : (isLight ? 'bg-slate-300' : 'bg-zinc-600')
              }`} />
            </div>

            {/* TOP MOBILE APP BAR (SIN BOTÓN "X" SOBRANTE) */}
            <div className={`px-4 pt-1 pb-3 flex items-center justify-between border-b shrink-0 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/90 border-zinc-800 backdrop-blur-md'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide leading-tight">Corte de Caja</h2>
                  <p className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Sesión #{sessionId} • {currentUser || 'Administrador'}
                  </p>
                </div>
              </div>
            </div>

          {/* MOBILE SEGMENTED CONTROL (TABS) */}
          <div className={`p-2 border-b shrink-0 flex items-center gap-1.5 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-zinc-900/50 border-zinc-800/80'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('Resumen')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'Resumen'
                  ? isLight 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/60'
                  : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Arqueo Físico</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Registros')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'Registros'
                  ? isLight 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/60'
                  : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
          </div>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
            {activeTab === 'Resumen' ? (
              <>
                {/* NOTIFICACIÓN VISIBLE DE ATENCIÓN DE DIFERENCIA (INTENTOS DE ARQUEO) */}
                {corteWarning && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-900 dark:text-amber-300 flex items-start gap-3 shadow-md">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-black uppercase tracking-wider mb-1">Diferencia detectada en Arqueo</p>
                      <p className="whitespace-pre-line font-medium leading-relaxed">{corteWarning}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setCorteWarning(null)} 
                      className="text-amber-500 font-bold px-1 text-sm cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* HERO CARD DE EFECTIVO CONTADO VS ESPERADO */}
                <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden ${
                  isLight 
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-200/80 text-slate-900' 
                    : 'bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border-emerald-500/30 text-white'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      Total Contado en Caja
                    </span>
                    
                    {/* DIFF BADGE */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                      discrepancy === 0
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                        : discrepancy < 0
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                    }`}>
                      {discrepancy === 0 ? '✓ Cuadrado' : discrepancy < 0 ? `⚠️ Faltante ${config.currencySymbol || '$'}${Math.abs(discrepancy).toFixed(2)}` : `📈 Sobrante +${config.currencySymbol || '$'}${discrepancy.toFixed(2)}`}
                    </span>
                  </div>

                  <div className={`text-3xl sm:text-4xl font-mono font-black tracking-tight ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    {config.currencySymbol || '$'}{totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-semibold ${
                    isLight ? 'border-emerald-200/60 text-slate-600' : 'border-zinc-800 text-zinc-400'
                  }`}>
                    <span>Esperado: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{config.currencySymbol || '$'}{totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    <span>Fondo Inicial: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{config.currencySymbol || '$'}{saldoInicial.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>

                {/* TARJETAS DE CONTEO RÁPIDO DE BILLETES CON STEPPERS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      💵 Conteo de Billetes
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase">
                      Subtotal: {config.currencySymbol || '$'}{(q1000*1000 + q500*500 + q200*200 + q100*100 + q50*50 + q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                        {/* SUB-IMPORTE (COLS 3 - PERFECTAMENTE ALINEADO A LA DERECHA) */}
                        <div className="col-span-3 text-right">
                          <span className={`text-[9px] font-mono block leading-none mb-0.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Importe</span>
                          <span className="text-xs font-mono font-black text-emerald-500 truncate block">
                            {config.currencySymbol || '$'}{(b.val * b.denom).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD DE MONEDAS */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider">Monedas Metálicas</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCoinsPanel(!showCoinsPanel)}
                      className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      {showCoinsPanel ? 'Ocultar desglose' : 'Desglose detallado ▼'}
                    </button>
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
                        {config.currencySymbol || '$'}{coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* DESGLOSE DETALLADO DE MONEDAS COLLAPSIBLE */}
                  {showCoinsPanel && (
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
                          <div key={c.denom} className={`p-2 rounded-2xl border flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'}`}>
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
                  )}
                </div>

                {/* CARD BALANCE DE ENTRADAS Y SALIDAS */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900/80 border-zinc-800'
                }`}>
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <span>Resumen de Entradas & Salidas</span>
                  </h4>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Fondo Inicial / Saldo:</span>
                      <span className="font-bold">{config.currencySymbol || '$'}{saldoInicial.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Ventas Efectivo:</span>
                      <span className="font-bold text-emerald-500">{config.currencySymbol || '$'}{ventasEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Servicios Técnicos:</span>
                      <span className="font-bold text-emerald-500">{config.currencySymbol || '$'}{serviciosTecnicos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Salidas / Egresos:</span>
                      <span className="font-bold text-rose-500">-{config.currencySymbol || '$'}{totalSalidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between py-1.5 font-black text-sm pt-2">
                      <span>Total Entradas Esperadas:</span>
                      <span className="text-emerald-500">{config.currencySymbol || '$'}{totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* COMENTARIOS U OBSERVACIONES */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider block px-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Comentarios u Observaciones del Turno
                  </label>
                  <textarea
                    value={corteComment}
                    onChange={(e) => setCorteComment(e.target.value)}
                    placeholder="Ej. Se dejaron $50 en monedas para cambio..."
                    rows={2}
                    maxLength={180}
                    className={`w-full p-3 text-xs rounded-xl outline-none font-sans leading-relaxed border ${
                      isLight 
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                        : 'bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500'
                    }`}
                  />
                </div>
              </>
            ) : (
              /* TAB HISTÓRICO EN MÓVIL */
              <div className="space-y-3">
                <h3 className={`text-xs font-black uppercase tracking-wider px-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Histórico de Cortes & Borradores
                </h3>

                {drafts.length === 0 && localCortes.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                    <History className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-60" />
                    <p className="text-xs font-semibold">No hay borradores ni cortes guardados en esta sesión.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drafts.map((d, i) => (
                      <div key={i} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
                      }`}>
                        <div>
                          <span className="font-mono font-black text-sm block">${d.total.toFixed(2)}</span>
                          <span className="text-[10px] text-zinc-400">Borrador guardado a las {d.time}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setQ1000(d.q1000); setQ500(d.q500); setQ200(d.q200);
                            setQ100(d.q100); setQ50(d.q50); setQ20(d.q20);
                            setCoinsAmount(d.coinsAmount);
                            setActiveTab('Resumen');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl"
                        >
                          Recuperar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STICKY BOTTOM FLOATING ACTION BAR */}
          {(() => {
            const hasCountEntered = q1000 > 0 || q500 > 0 || q200 > 0 || q100 > 0 || q50 > 0 || q20 > 0 || coinsAmount > 0 || corteComment.trim().length > 0;

            return (
              <div className={`p-3.5 border-t shrink-0 flex items-center gap-2 sticky bottom-0 z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] ${
                isLight ? 'bg-white/95 border-slate-200 backdrop-blur-md shadow-lg' : 'bg-zinc-950 border-zinc-800/80 shadow-2xl'
              }`}>
                {/* RESET BUTTON */}
                <button
                  type="button"
                  disabled={!hasCountEntered}
                  onClick={() => {
                    if (!hasCountEntered) return;
                    setConfirm({
                      title: '⚠️ ¿RESET ARQUEO EN CURSO?',
                      body: `Se restablecerán a cero todos los billetes y monedas ingresados ($${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN).\n\n¿Estás seguro de limpiar este conteo?`,
                      onOk: () => {
                        setQ1000(0); setQ500(0); setQ200(0); setQ100(0); setQ50(0); setQ20(0);
                        setCoinsAmount(0);
                        setCoinQ20(0); setCoinQ10(0); setCoinQ5(0); setCoinQ2(0); setCoinQ1(0); setCoinQ05(0);
                        setCorteComment('');
                        setConfirm(null);
                      }
                    });
                  }}
                  title={hasCountEntered ? "Resetear conteo actual" : "Ingresa billetes o monedas para resetear"}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                    !hasCountEntered
                      ? isLight 
                        ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' 
                        : 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-800/40 text-zinc-600'
                      : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/25 active:scale-90 cursor-pointer'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {/* DRAFT BUTTON */}
                <button
                  type="button"
                  disabled={!hasCountEntered}
                  onClick={() => {
                    if (!hasCountEntered) return;
                    setConfirm({
                      title: '💾 ¿GUARDAR BORRADOR LOCAL?',
                      body: `Se guardará un borrador local del conteo actual ($${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) registrado a las ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.\n\nPodrás recuperar o cargar este conteo en cualquier momento desde la pestaña "Histórico".`,
                      onOk: () => {
                        const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                        const newDraft = { time, q1000, q500, q200, q100, q50, q20, coinsAmount, total: totalFisicoContado };
                        const updated = [newDraft, ...drafts.slice(0, 9)];
                        setDrafts(updated);
                        try {
                          localStorage.setItem('fixmanager_corte_drafts', JSON.stringify(updated));
                        } catch (e) {}
                        setConfirm(null);
                      }
                    });
                  }}
                  title={hasCountEntered ? "Guardar borrador local" : "Ingresa billetes o monedas para guardar borrador"}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                    !hasCountEntered
                      ? isLight 
                        ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' 
                        : 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-800/40 text-zinc-600'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-500/25 active:scale-90 cursor-pointer'
                  }`}
                >
                  <Save className="w-5 h-5" />
                </button>

                {/* MAIN FINALIZAR CORTE BUTTON */}
                <button
                  type="button"
                  disabled={!hasCountEntered}
                  onClick={() => {
                    if (!hasCountEntered) return;
                    handleMobileFinalizarClick();
                  }}
                  className={`flex-1 h-11 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    !hasCountEntered
                      ? isLight 
                        ? 'opacity-40 cursor-not-allowed border border-slate-200 bg-slate-200 text-slate-400' 
                        : 'opacity-40 cursor-not-allowed border border-zinc-800 bg-zinc-800/40 text-zinc-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>FINALIZAR CORTE DE CAJA</span>
                </button>
              </div>
            );
          })()}

          {/* MODAL / SHEET DESLIZABLE DE OPCIONES DE FINALIZACIÓN DE CORTE (SOLO, IMPRIMIR, WHATSAPP) */}
          {showMobileCorteOptionsModal && (
            <div className="fixed inset-0 z-[100000] flex flex-col justify-end select-none animate-fade-in">
              {/* BACKDROP OSCURO */}
              <div 
                onClick={() => setShowMobileCorteOptionsModal(false)}
                className="absolute inset-0 bg-black/75"
              />

              {/* TARJETA DESLIZABLE ESTILO iOS (36px Drag Handle) */}
              <div 
                className={`relative z-10 w-full max-w-xl mx-auto rounded-t-[36px] border-t shadow-2xl p-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-sheet-slide-up ${
                  isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* LENGÜETA TÁCTIL (DRAG HANDLE) */}
                <div className="w-full flex justify-center pb-1">
                  <div className={`w-9 h-1 rounded-full ${isLight ? 'bg-slate-300' : 'bg-zinc-700'}`} />
                </div>

                {/* ENCABEZADO Y ENTORNO */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider">¿Cómo deseas finalizar el Corte?</h3>
                  <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Total Contado en Caja: <strong className="text-emerald-500">{config.currencySymbol || '$'}{totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>

                {/* OPCIONES DE ACCIÓN */}
                <div className="space-y-2.5 pt-2">
                  {/* OPCIÓN 1: SOLO FINALIZAR */}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowMobileCorteOptionsModal(false);
                      await executeMobileCorteWithOptions('only');
                    }}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between border active:scale-95 transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">💵</span>
                      <div className="text-left">
                        <span className="block font-bold">Solo Finalizar Corte</span>
                        <span className={`text-[10px] normal-case block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Registra el cierre de turno sin imprimir ni enviar</span>
                      </div>
                    </div>
                    <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>→</span>
                  </button>

                  {/* OPCIÓN 2: FINALIZAR E IMPRIMIR */}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowMobileCorteOptionsModal(false);
                      await executeMobileCorteWithOptions('print');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Printer className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-bold">Finalizar e Imprimir</span>
                        <span className="text-[10px] text-blue-200 normal-case block">Imprime el ticket térmico oficial del corte de caja</span>
                      </div>
                    </div>
                    <span>→</span>
                  </button>

                  {/* OPCIÓN 3: FINALIZAR Y WHATSAPP */}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowMobileCorteOptionsModal(false);
                      await executeMobileCorteWithOptions('whatsapp');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#22bf5b] text-white font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-bold">Finalizar y Enviar WhatsApp</span>
                        <span className="text-[10px] text-emerald-100 normal-case block">Genera y comparte la imagen PNG del ticket de corte</span>
                      </div>
                    </div>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* WINDOW CONTROLLER GRID DESKTOP */
        <div 
          className={isRetro
            ? "bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_11px_rgba(0,0,0,0.55)] text-black w-full h-full md:h-auto max-w-5xl md:rounded-2xl rounded-none flex flex-col font-sans max-h-[100vh] md:max-h-[90vh] md:min-h-[620px] overflow-hidden"
            : isLight ? "bg-white border-0 md:border border-zinc-200 rounded-none md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-zinc-900 w-full h-full md:h-auto max-w-5xl flex flex-col font-sans max-h-[100vh] md:max-h-[90vh] md:min-h-[620px] overflow-hidden"
            : "bg-[#0f172a] border-0 md:border border-slate-800 rounded-none md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-slate-100 w-full h-full md:h-auto max-w-5xl flex flex-col font-sans max-h-[100vh] md:max-h-[90vh] md:min-h-[620px] overflow-hidden"
          }
          onClick={(e) => e.stopPropagation()}
        >
        {/* WINDOW DECORATION TITLEBAR */}
        <div className={isRetro
          ? "bg-[#000080] px-3 py-2.5 flex items-center justify-between gap-2 retro-white-text select-none cursor-default shrink-0"
          : isLight ? "bg-zinc-800 border-b border-zinc-700 px-3 md:px-4 py-2.5 flex items-center justify-between shrink-0"
          : "bg-[#0d1424] border-b border-slate-800 px-3 md:px-4 py-2.5 flex items-center justify-between shrink-0"
        }>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center shrink-0">
              <Calculator className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs md:text-sm font-black uppercase tracking-wide text-white truncate">
              📟 Finalizar Sesión — Arqueo
            </span>
          </div>

          {/* TAB SEGMENTS — solo Resumen y Registros */}
          <div className={`flex items-center gap-1 p-0.5 rounded shrink-0 ${
            isRetro ? 'bg-[#1a1a6e] border border-[#3030a0]'
            : 'bg-black/30 border border-white/10'
          }`}>
            {(['Resumen', 'Registros'] as const).map((t) => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`retro-tab-button px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded transition-all cursor-pointer ${
                    active
                      ? 'active-tab bg-blue-500 text-white shadow'
                      : 'text-zinc-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* WINDOW CLOSE BUTTONS */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCloseRequest}
              className={isRetro
                ? "w-4.5 h-4.5 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-950 hover:bg-[#c2c2c2] active:border-r-white active:border-b-white active:border-t-zinc-700 active:border-l-zinc-700 active:border cursor-pointer text-[10px] font-black leading-none"
                : "w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-bold cursor-pointer transition-all text-sm"
              }
            >
              ×
            </button>
          </div>
        </div>

        {/* CONTAINER VIEWPORTS */}
        {activeTab === 'Resumen' && (
          <div className={`flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden ${
            isRetro ? 'bg-[#eaeef3] text-black' : isLight ? 'bg-zinc-50 text-zinc-900' : 'bg-[#090d16]'
          }`}>
            
            {/* LEFT SIDE BLOCK (CONTEO DE DINERO) - (7 COLS) */}
            <div className={`lg:col-span-7 p-3 md:p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r overflow-y-visible lg:overflow-y-auto w-full ${
              isRetro ? 'border-zinc-400 bg-[#dfdfdf] text-black' : isLight ? 'border-zinc-200 bg-white text-zinc-900' : 'border-slate-800 bg-[#0b0e17]'
            }`}>
              
              {/* SESION ID BANNER & BIG GREEN BOARD */}
              <div className="space-y-3">
                <div className={`py-2.5 px-4 rounded text-center tracking-wide font-black text-lg md:text-xl shadow-md uppercase ${
                  isRetro 
                    ? 'bg-[#000080] text-white' 
                    : isLight ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-800 bg-[#1e40af] text-white'
                }`}>
                  Sesion ID #{sessionId}
                </div>

                {/* GREEN MASSIVE TOTAL */}
                <div id="corte-total-display" className={isRetro
                  ? "bg-white border-2 border-zinc-500 p-4 rounded-lg text-center"
                  : isLight ? "bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-center"
                  : "bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-lg text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                }>
                  <div className={`text-3xl md:text-4xl font-mono font-black tracking-tight ${
                    isRetro ? 'text-emerald-800' : isLight ? 'text-emerald-700' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                  }`}>
                    {config.currencySymbol}{totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* ROW OF 6 CATEGORY ICONS */}
                <div className={`grid ${config.enablePOS !== false ? 'grid-cols-6' : 'grid-cols-5'} gap-1 p-2 rounded-lg text-center shadow-inner ${
                  isRetro ? 'bg-zinc-300 border border-zinc-400 text-black' : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-900' : 'bg-slate-950/60 border border-slate-800/80'
                }`}>
                  {/* 1. COINS */}
                  <div 
                    onClick={() => {
                      highlightSection('corte-coins-row');
                      const coinsInput = document.getElementById('corte-coins-input') as HTMLInputElement | null;
                      if (coinsInput) {
                        setTimeout(() => {
                          coinsInput.focus();
                          coinsInput.select();
                        }, 200);
                      }
                    }}
                    title="Monedas físicas contadas (Haz clic para sombrear y enfocar la fila de monedas)"
                    className="flex flex-col items-center justify-center cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded"
                  >
                    <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-slate-200'}`}>{config.currencySymbol}{coinsAmount}</span>
                  </div>

                  {/* 2. BANKNOTES */}
                  <div 
                    onClick={() => {
                      highlightSection('corte-banknotes-section');
                      const firstInput = document.querySelector('.corte-qty-input') as HTMLInputElement | null;
                      if (firstInput) {
                        setTimeout(() => {
                          firstInput.focus();
                          firstInput.select();
                        }, 200);
                      }
                    }}
                    title="Billetes físicos contados (Haz clic para sombrear y enfocar la sección de billetes)"
                    className={`flex flex-col items-center justify-center border-l cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800/80'}`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-emerald-850' : isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{config.currencySymbol}{totalBilletes}</span>
                  </div>

                  {/* 3. CARD SALES */}
                  <div 
                    onClick={() => highlightSection('corte-card-info')}
                    title={config.enablePOS === false ? "Pagos con Tarjeta/Transferencia (Info) (Haz clic para ubicar y sombrear en el resumen)" : "Ventas registradas con Tarjeta/Transferencia (Haz clic para ubicar y sombrear en el resumen)"}
                    className={`flex flex-col items-center justify-center border-l cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800/80'}`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>{config.currencySymbol}{ventasTarjeta}</span>
                  </div>

                  {/* 4. UTILITY MARGIN PERCENT */}
                  <div 
                    onClick={() => highlightSection('corte-utility-section')}
                    title="Margen de utilidad neto del turno (Haz clic para ubicar y sombrear en el resumen)"
                    className={`flex flex-col items-center justify-center border-l cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800/80'}`}
                  >
                    <Percent className="w-5 h-5 text-orange-500" />
                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>{margenPercent}%</span>
                  </div>

                  {/* 5. INITIAL CASH / FLOAT */}
                  <div 
                    onClick={() => {
                      highlightSection('corte-saldo-inicial-row');
                      setTimeout(() => {
                        const newSaldo = prompt("Modificar saldo inicial (fondo de caja):", saldoInicial.toString());
                        if (newSaldo !== null) {
                          const parsed = parseFloat(newSaldo);
                          if (!isNaN(parsed) && parsed >= 0) {
                            handleSaldoInicialChange(parsed);
                          }
                        }
                      }, 400);
                    }}
                    title="Saldo inicial / Fondo de caja (Haz clic para ubicar, sombrear y modificar el fondo)"
                    className={`flex flex-col items-center justify-center border-l cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800/80'}`}
                  >
                    <PiggyBank className="w-5 h-5 text-purple-500" />
                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>{config.currencySymbol}{saldoInicial}</span>
                  </div>

                  {/* 6. USER SALES */}
                  {config.enablePOS !== false && (
                    <div 
                      onClick={() => highlightSection('corte-user-sales-section')}
                      title={`Ventas de este turno cobradas por el operador actual (${currentUser || 'Administrador'}) (Haz clic para ubicar y sombrear en el resumen)`}
                      className={`flex flex-col items-center justify-center border-l cursor-pointer hover:bg-black/10 active:scale-95 transition-all p-1 rounded ${isRetro ? 'border-zinc-400' : isLight ? 'border-zinc-200' : 'border-slate-800/80'}`}
                    >
                      <User className="w-5 h-5 text-yellow-600" />
                      <span className={`text-[10px] font-bold font-mono mt-0.5 ${isRetro ? 'text-zinc-600' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>{config.currencySymbol}{ventasUsuarioActual}</span>
                    </div>
                  )}
                </div>

                {/* THE 3-COLUMN COUNTING GRID */}
                <div className="mt-4 space-y-2.5">
                  <div id="corte-banknotes-section" className="space-y-2.5 rounded p-1 transition-all">
                    <div className="grid grid-cols-12 gap-3 text-center text-[10px] font-bold uppercase font-mono px-1">
                    <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Cantidad</span>
                    <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Denominación</span>
                    <span className={`col-span-4 text-center ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Importe</span>
                  </div>

                  {/* BANKNOTES ROWS */}
                  {[
                    { denom: 1000, value: q1000, set: setQ1000 },
                    { denom: 500, value: q500, set: setQ500 },
                    { denom: 200, value: q200, set: setQ200 },
                    { denom: 100, value: q100, set: setQ100 },
                    { denom: 50, value: q50, set: setQ50 },
                    { denom: 20, value: q20, set: setQ20 },
                  ].map((row) => (
                    <div key={row.denom} className="grid grid-cols-12 gap-3 items-center">
                      {/* QTY INPUT */}
                      <div className="col-span-4 flex items-center">
                        <input
                          type="number"
                          value={row.value === 0 ? '' : row.value}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            row.set(val < 0 ? 0 : val);
                          }}
                          className={`corte-qty-input w-full text-center rounded-lg py-2.5 font-bold font-mono text-xs outline-none ${
                            isRetro
                              ? 'bg-white border border-zinc-500 text-black shadow-inner'
                              : isLight ? 'bg-white border border-zinc-300 text-zinc-900 transition-colors focus:border-blue-500'
                              : 'bg-slate-900 border border-slate-800/70 text-white transition-colors focus:border-blue-500'
                          }`}
                          placeholder="0"
                        />
                      </div>

                      {/* DENOM LABEL FRAME */}
                      <div className="col-span-4 flex justify-center">
                        <MXNDenominationGraphic value={row.denom} isCoin={false} />
                      </div>

                      {/* COMPUTED SUB-IMPORTE */}
                      <div className="col-span-4 flex items-center">
                        <div className={`w-full text-center rounded-lg py-2.5 text-xs font-black font-mono ${
                          isRetro
                            ? 'bg-zinc-200 border border-zinc-400 text-slate-800'
                            : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                            : 'bg-slate-900/40 border border-slate-800/70 text-slate-300'
                        }`}>
                          {(row.value * row.denom).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>

                  {/* COINS INTERACTIVE ROW */}
                  <div id="corte-coins-row" className="grid grid-cols-12 gap-3 items-center rounded p-1 transition-all">
                    {/* Coin box input */}
                    <div className="col-span-4 flex items-center">
                      <div className="relative flex items-center justify-center w-full">
                        <span className={`absolute left-2.5 text-[10px] font-bold font-mono z-10 ${isRetro ? 'text-zinc-600' : 'text-sky-500'}`}>$</span>
                        <input
                          id="corte-coins-input"
                          type="number"
                          value={coinsAmount === 0 ? '' : coinsAmount}
                          onChange={e => setCoinsAmount(parseFloat(e.target.value) || 0)}
                          onDoubleClick={() => setShowCoinsPanel(true)}
                          title="Escribe el total de monedas. Doble clic para desglose detallado."
                          className={`corte-qty-input w-full text-center pl-5 pr-1 rounded-lg py-2.5 font-bold font-mono text-xs outline-none transition-colors ${
                            isRetro
                              ? 'bg-white border border-zinc-500 text-black shadow-inner'
                              : isLight ? 'bg-sky-50 text-sky-700 border border-sky-200 focus:border-sky-500'
                              : 'bg-sky-950/20 text-sky-400 border border-sky-900/60 focus:border-sky-500'
                          }`}
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    {/* Denomination for coins */}
                    <div className="col-span-4 flex justify-center">
                      <MXNCoinsStackGraphic isLight={isLight} />
                    </div>

                    {/* Total Coin Importe */}
                    <div className="col-span-4 flex items-center">
                      <div className={`w-full text-center rounded-lg py-2.5 text-xs font-black font-mono ${
                        isRetro
                          ? 'bg-zinc-200 border border-zinc-400 text-slate-800'
                          : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                          : 'bg-slate-900/40 border border-slate-800/70 text-slate-300'
                      }`}>
                        {coinsAmount.toFixed(1)}
                      </div>
                    </div>
                  </div>
 
                  {/* TOOLTIP FOR COINS BREAKDOWN */}
                  <div 
                    onClick={() => setShowCoinsPanel(true)}
                    className={`text-center py-2 text-[9.5px] font-black uppercase tracking-wider cursor-pointer animate-pulse font-mono transition-all select-none ${
                      isRetro ? 'text-blue-800 hover:text-blue-950' : isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    ✦ Doble clic en el campo de monedas para desglose detallado ✦
                  </div>
 
                  {/* CENTERED POPUP DIALOG (SUB-VENTANA) FOR DETAILED COIN COUNTING */}
                  {showCoinsPanel && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className={isRetro 
                        ? "bg-[#dfdfdf] border-4 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-[3px_3px_12px_rgba(0,0,0,0.5)] text-black w-full max-w-sm flex flex-col font-sans overflow-hidden" 
                        : isLight ? "bg-white border border-zinc-200 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-zinc-900 w-full max-w-sm overflow-hidden flex flex-col font-sans"
                        : "bg-[#0f172a] border border-slate-800 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-slate-100 w-full max-w-sm overflow-hidden flex flex-col font-sans"
                      } onClick={(e) => e.stopPropagation()}>
                        
                        {/* Sub-window Titlebar */}
                        <div className={isRetro 
                          ? "bg-[#000080] p-1.5 flex items-center justify-between text-white" 
                          : isLight ? "bg-zinc-100 border-b border-zinc-200 px-3 py-2 flex items-center justify-between"
                          : "bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between"
                        }>
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span className={isRetro ? "text-[11px] font-black tracking-wide uppercase retro-white-text" : isLight ? "text-[11px] font-bold text-zinc-900 tracking-wide uppercase" : "text-[11px] font-bold text-slate-200 tracking-wide uppercase"}>Conteo de monedas</span>
                          </div>
                          <button 
                            onClick={() => setShowCoinsPanel(false)}
                            className={isRetro 
                              ? "w-4 h-4 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 flex items-center justify-center text-zinc-950 font-black text-[10px]" 
                              : isLight ? "w-5 h-5 bg-zinc-200 rounded hover:bg-red-500 hover:text-white flex items-center justify-center text-zinc-500 transition-colors cursor-pointer text-xs font-black"
                              : "w-5 h-5 bg-slate-800 rounded hover:bg-red-650 hover:text-white flex items-center justify-center text-slate-400 transition-colors cursor-pointer text-xs font-black"
                            }
                          >
                            ×
                          </button>
                        </div>
 
                        {/* Sub-window Main Body */}
                        <div className={`p-4 space-y-4 ${isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50' : 'bg-[#090d16]'}`}>
                          {/* BIG SUM BOARD */}
                          <div id="coins-total-display" className={isRetro
                            ? "bg-white border-2 border-zinc-500 p-3 text-center"
                            : isLight ? "bg-teal-50 border border-teal-200 p-3 rounded-lg text-center"
                            : "bg-teal-950/45 border border-teal-800/40 p-3 rounded-lg text-center shadow-inner"
                          }>
                            <div className={`text-[9px] font-bold uppercase tracking-widest font-mono ${isRetro ? 'text-zinc-500' : isLight ? 'text-teal-700' : 'text-teal-400'}`}>Total de Monedas</div>
                            <div className={`text-2xl font-mono font-black mt-0.5 ${isRetro ? 'text-emerald-800' : isLight ? 'text-teal-700' : 'text-teal-300'}`}>
                              {config.currencySymbol}{coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
 
                          {/* 3-COLUMN INTUITIVE TABLE MATCHING BANKNOTES LOOK AND FEEL */}
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
                            ].map((row) => (
                              <div key={row.denom} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4 flex items-center">
                                  <input
                                    type="number"
                                    value={row.value === 0 ? '' : row.value}
                                    onChange={(e) => { const val = parseInt(e.target.value) || 0; row.set(val < 0 ? 0 : val); }}
                                    className={`corte-qty-input w-full text-center rounded-lg py-2 font-bold font-mono text-xs outline-none ${
                                      isRetro
                                        ? 'bg-white border border-zinc-500 text-black shadow-inner'
                                        : isLight ? 'bg-white border border-zinc-300 text-zinc-900 focus:border-blue-500'
                                        : 'bg-slate-900 border border-slate-800/80 text-white focus:border-blue-500'
                                    }`}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="col-span-4 flex justify-center">
                                  <MXNDenominationGraphic value={row.denom} isCoin={true} />
                                </div>
                                <div className="col-span-4 flex items-center">
                                  <div className={`w-full text-center rounded-lg py-2 text-[11px] font-black font-mono ${
                                    isRetro
                                      ? 'bg-zinc-200 border border-zinc-400 text-slate-800'
                                      : isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                                      : 'bg-slate-900/40 border border-slate-800 text-slate-300'
                                  }`}>
                                    {(row.value * row.denom).toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
 
                        {/* Sub-window Command Footer */}
                        <div className={isRetro 
                          ? "bg-[#dfdfdf] p-2.5 flex justify-end gap-2 border-t border-zinc-400" 
                          : isLight ? "bg-zinc-100 p-3 flex justify-end gap-2 text-zinc-900 border-t border-zinc-200"
                          : "bg-slate-900 p-3 flex justify-end gap-2 text-white border-t border-slate-800"
                        }>
                          <button
                            onClick={() => {
                              const computedCoins = 
                                (coinQ20 * 20) + 
                                (coinQ10 * 10) + 
                                (coinQ5 * 5) + 
                                (coinQ2 * 2) + 
                                (coinQ1 * 1) + 
                                (coinQ05 * 0.5);
                              setCoinsAmount(computedCoins);
                              setShowCoinsPanel(false);
                            }}
                            className="px-4 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white border border-emerald-500/30 rounded text-[10.5px] uppercase font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aceptar Conteo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              {/* DYNAMIC COMPOSITION GRAPH AND SHIFT OBSERVATIONS COMMENTS */}
              <div className={`grid grid-cols-1 ${config.enablePOS !== false ? 'md:grid-cols-2' : ''} gap-3 mt-4`}>
                {/* COMPOSICIÓN DE VENTAS */}
                {config.enablePOS !== false && (
                  <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                    isRetro ? 'bg-zinc-200 border-zinc-400 text-black shadow-inner'
                    : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                    : 'bg-slate-900/35 border-slate-800/75 text-slate-350 shadow-sm'
                  }`}>
                    <div>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider block mb-2 ${
                        isLight ? 'text-zinc-650' : 'text-slate-400'
                      }`}>
                        📊 Composición de Ventas (Turno)
                      </span>
                      
                      {totalSales === 0 ? (
                        <div className="text-[10px] text-zinc-500 font-medium py-3 text-center font-mono">
                          Sin ventas registradas en esta sesión
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Segmented bar */}
                          <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-950/40 border border-slate-800/40">
                            {cashPct > 0 && (
                              <div 
                                style={{ width: `${cashPct}%` }} 
                                className="bg-emerald-500 h-full transition-all duration-500" 
                                title={`Efectivo: ${cashPct}%`}
                              />
                            )}
                            {cardPct > 0 && (
                              <div 
                                style={{ width: `${cardPct}%` }} 
                                className="bg-blue-500 h-full transition-all duration-500" 
                                title={`Tarjeta/Transf: ${cardPct}%`}
                              />
                            )}
                          </div>
                          {/* Legend */}
                          <div className="flex items-center justify-between text-[9px] font-bold font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block shrink-0" />
                              <span>Efe: {cashPct}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block shrink-0" />
                              <span>Tar: {cardPct}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className={`text-[8.5px] border-t pt-1.5 mt-2.5 font-mono flex justify-between ${
                      isLight ? 'border-zinc-200 text-zinc-500' : 'border-slate-800/50 text-slate-500'
                    }`}>
                      <span>Ventas Totales:</span>
                      <span className="font-bold">{config.currencySymbol}{totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* OBSERVACIONES / COMENTARIOS */}
                <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                  isRetro ? 'bg-zinc-200 border-zinc-400 text-black shadow-inner'
                  : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  : 'bg-slate-900/35 border-slate-800/75 text-slate-350 shadow-sm'
                }`}>
                  <div>
                    <span className={`text-[8.5px] font-black uppercase tracking-wider block mb-1.5 ${
                      isLight ? 'text-zinc-650' : 'text-slate-400'
                    }`}>
                      ✍ Observaciones del Arqueo
                    </span>
                    <textarea
                      value={corteComment}
                      onChange={(e) => setCorteComment(e.target.value)}
                      placeholder="Comentarios u observaciones sobre este corte de caja..."
                      maxLength={180}
                      rows={2}
                      className={`w-full p-2 text-[10px] rounded outline-none resize-none font-sans leading-snug transition-all border ${
                        isRetro ? 'bg-white border-zinc-500 text-black focus:border-blue-500 shadow-inner'
                        : isLight ? 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-200 focus:border-slate-700 focus:ring-1 focus:ring-slate-900'
                      }`}
                    />
                  </div>
                  <div className="text-[8px] text-right mt-1.5 font-mono text-slate-500/80 uppercase">
                    {corteComment.length}/180
                  </div>
                </div>
              </div>
            </div>

              {/* WORD CONVERTED LINE */}
              <div className={`p-2.5 rounded text-center mt-4 ${isLight ? 'bg-zinc-100 border border-zinc-200' : 'bg-slate-950/80 border border-slate-800'}`}>
                <span className={`text-[10px] font-black uppercase tracking-wide block font-mono ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                  {textWordsSpanish}
                </span>
              </div>
            </div>

            {/* RIGHT SIDE BLOCK (RESUMEN ENTRADAS / SALIDAS) - (5 COLS) */}
            <div className={`lg:col-span-5 p-3 md:p-4 border-t lg:border-t-0 lg:border-l overflow-y-visible lg:overflow-y-auto flex flex-col justify-between ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0e1322] border-slate-800/80'}`}>
              
              <div className="space-y-4">
                {/* SELECTOR FECHA RAPIDO */}
                <div className={`flex items-center justify-between gap-2 border-b pb-2 ${isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                  <span className={`text-[10px] uppercase font-bold font-mono ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Fecha de Operación:</span>
                  <span className={`font-mono px-2 py-0.5 text-[10.5px] font-bold ${isLight ? 'text-zinc-900' : 'text-slate-200'}`}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* SECTION 1: ENTRADAS DE EFECTIVO */}
                <div className="space-y-2">
                  {/* GREEN HEADER BAR */}
                  <div className="bg-[#10b981]/20 border border-emerald-800/30 px-3 py-1.5 rounded flex justify-between items-center text-emerald-450 font-bold uppercase tracking-wide text-[11px] shadow-sm font-sans" style={{ color: '#34d399' }}>
                    <span>Entradas de efectivo</span>
                    <span className="font-mono">{config.currencySymbol}{totalEntradas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* ENTRADAS GRID LIST */}
                  <div className="space-y-1.5 pl-1.5 pr-0.5">
                    {[
                      { label: 'Saldo Inicial', val: saldoInicial, show: true },
                      { label: 'Ventas en Efectivo', val: ventasEfectivo, show: config.enablePOS !== false },
                      { label: 'Órdenes de Servicio', val: serviciosTecnicos, show: config.enableTaller !== false },
                      { label: 'Abonos de Fiados (Efectivo)', val: abonosFiadosEfectivo, show: abonosFiadosEfectivo > 0 },
                      { label: 'Abonos de Apartados (Efectivo)', val: abonosApartadosEfectivo, show: abonosApartadosEfectivo > 0 },
                      { label: 'Entradas de Efectivo (Manual)', val: entradasManuales, show: true },
                    ].filter(row => row.show).map((row, i) => (
                      <div key={i} id={row.label === 'Saldo Inicial' ? 'corte-saldo-inicial-row' : undefined} className="flex items-center justify-between gap-2 rounded p-1.5 transition-all">
                        <div className={`corte-resumen-field flex items-center justify-center rounded-lg border w-28 h-7 text-xs font-mono font-bold ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-700' : 'bg-slate-900/60 border-slate-800/80 text-zinc-200'}`}>
                          <span className={`text-[10px] mr-0.5 ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-slate-500'}`}>$</span>
                          {row.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className={`text-[10px] font-semibold text-right uppercase font-mono tracking-tight flex-1 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
                          {row.label}
                        </span>
                      </div>
                    ))}
                    
                    {/* Tarjeta Informativo */}
                    {config.enablePOS !== false && (
                      <div id="corte-card-info" className="flex items-center justify-between gap-2 p-1.5 rounded transition-all">
                        <div className={`corte-resumen-field flex items-center justify-center rounded-lg border w-28 h-7 text-xs font-mono font-bold ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-700' : 'bg-slate-900/60 border-slate-800/80 text-cyan-450'}`}>
                          <span className="text-[10px] mr-0.5 text-slate-500">$</span>
                          {ventasTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className={`text-[10px] font-semibold text-right uppercase font-mono tracking-tight flex-1 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
                          Ventas Tarjeta/Transfer (Info)
                        </span>
                      </div>
                    )}
                </div>

                {/* SECTION 2: SALIDAS DE EFECTIVO */}
                <div className={`space-y-2 pt-1 border-t ${isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                  {/* RED HEADER BAR */}
                  <div className="bg-rose-950/30 border border-rose-800/40 px-3 py-1.5 rounded flex justify-between items-center text-rose-350 font-bold uppercase tracking-wide text-[11px] shadow-sm font-sans" style={{ color: '#f43f5e' }}>
                    <span>Salidas de efectivo</span>
                    <span className="font-mono">{config.currencySymbol}{totalSalidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* SALIDAS GRID LIST */}
                  <div className="space-y-1.5 pl-1.5 pr-0.5">
                    {[
                      { label: 'Devoluciones de ventas', val: devolucionesVentas, show: config.enablePOS !== false },
                      { label: 'Devoluciones de servicios', val: devolucionesServicios, show: config.enableTaller !== false },
                      { label: 'Salidas de efectivo (Manual)', val: salidasManuales, show: true },
                    ].filter(row => row.show).map((row, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className={`corte-resumen-field flex items-center justify-center rounded-lg border w-28 h-7 text-xs font-mono font-bold ${isRetro ? 'bg-white border-zinc-400 text-zinc-900' : isLight ? 'bg-zinc-50 border-zinc-300 text-zinc-700' : 'bg-slate-900/60 border-slate-800/80 text-zinc-200'}`}>
                          <span className={`text-[10px] mr-0.5 ${isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-400' : 'text-slate-500'}`}>$</span>
                          {row.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className={`text-[10px] font-semibold text-right uppercase font-mono tracking-tight flex-1 ${isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
                          {row.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

               {/* GRUPO DE DETALLES COLAPSIBLES (VENTAS POR USUARIO, CRÉDITOS Y APARTADOS, UTILIDAD DEL TURNO) */}
              <div className="space-y-3 mt-4">
                {/* 1. VENTAS POR USUARIO COLLAPSIBLE */}
                {config.enablePOS !== false && desglosePorUsuario.length > 0 && (
                  <div id="corte-user-sales-section" className={`space-y-2 pt-1 border-t rounded p-0.5 transition-all ${isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                    <button
                      type="button"
                      onClick={() => setIsUserSalesExpanded(!isUserSalesExpanded)}
                      className={`w-full text-left px-3 py-1.5 rounded flex justify-between items-center font-bold uppercase tracking-wide text-[11px] cursor-pointer transition-colors ${
                        (isLight) 
                          ? 'bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700' 
                          : 'bg-sky-950/30 hover:bg-sky-900/40 border border-sky-800/40 text-sky-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>👥 Ventas por usuario</span>
                        <span className={`text-[9px] font-normal lowercase ${(isLight) ? 'text-zinc-500' : 'text-slate-400'}`}>
                          ({isUserSalesExpanded ? 'contraer' : 'ver detalles'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {config.currencySymbol}{desglosePorUsuario.reduce((s, [, d]) => s + d.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`${(isLight) ? 'text-zinc-500' : 'text-slate-400'} font-normal text-[9.5px]`}>
                          {isUserSalesExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isUserSalesExpanded && (
                      <div className="space-y-1.5 pl-1.5 pr-0.5 animate-fadeIn">
                        {desglosePorUsuario.map(([nombre, datos]) => (
                          <div key={nombre} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-[11px] ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-slate-900/40 border border-slate-800/50'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${nombre === 'Sin usuario' ? 'bg-zinc-500' : 'bg-sky-600'}`}>
                                {nombre.charAt(0).toUpperCase()}
                              </span>
                              <span className={`font-semibold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{nombre}</span>
                              <span className={`text-[9px] font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>{datos.ventas} venta{datos.ventas !== 1 ? 's' : ''}</span>
                            </div>
                            <span className={`font-mono font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>{config.currencySymbol}{datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CRÉDITOS Y APARTADOS COLLAPSIBLE */}
                {config.enablePOS !== false && (
                  <div className={`space-y-2 pt-1 border-t ${isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                    <button
                      type="button"
                      onClick={() => setIsCreditApartadosExpanded(!isCreditApartadosExpanded)}
                      className={`w-full text-left px-3 py-1.5 rounded flex justify-between items-center font-bold uppercase tracking-wide text-[11px] cursor-pointer transition-colors ${
                        (isLight) 
                          ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800' 
                          : 'bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>💳 Créditos y Apartados (Info)</span>
                        <span className={`text-[9px] font-normal lowercase ${(isLight) ? 'text-zinc-500' : 'text-slate-400'}`}>
                          ({isCreditApartadosExpanded ? 'contraer' : 'ver detalles'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {config.currencySymbol}{(creditApartadoStats.totalCreditedSales + creditApartadoStats.totalApartadosValue).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`${(isLight) ? 'text-zinc-500' : 'text-slate-400'} font-normal text-[9.5px]`}>
                          {isCreditApartadosExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isCreditApartadosExpanded && (
                      <div className="grid grid-cols-2 gap-2 mt-1 animate-fadeIn">
                        {/* Tarjeta de Créditos */}
                        <div className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                          isRetro
                            ? 'bg-white border-zinc-400 text-zinc-900 shadow-inner'
                            : isLight
                            ? 'bg-amber-50/30 border-amber-100/80 text-zinc-900 shadow-[0_1.5px_6px_rgba(0,0,0,0.02)]'
                            : 'bg-amber-950/10 border-amber-900/30 text-slate-200 shadow-sm'
                        }`}>
                          <div>
                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Fiados (Turno)</span>
                            <span className="text-base font-mono font-black mt-0.5 block leading-tight">
                              {config.currencySymbol}{creditApartadoStats.totalCreditedSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className={`text-[8.5px] mt-2 font-mono flex flex-col gap-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <span>• Cantidad: {creditApartadoStats.countCreditSales}</span>
                            <span>• Abonos hoy: {config.currencySymbol}{creditApartadoStats.totalCreditPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        {/* Tarjeta de Apartados */}
                        <div className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                          isRetro
                            ? 'bg-white border-zinc-400 text-zinc-900 shadow-inner'
                            : isLight
                            ? 'bg-sky-50/30 border-sky-100/85 text-zinc-900 shadow-[0_1.5px_6px_rgba(0,0,0,0.02)]'
                            : 'bg-sky-950/10 border-sky-900/30 text-slate-200 shadow-sm'
                        }`}>
                          <div>
                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>Apartados (Turno)</span>
                            <span className="text-base font-mono font-black mt-0.5 block leading-tight">
                              {config.currencySymbol}{creditApartadoStats.totalApartadosValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className={`text-[8.5px] mt-2 font-mono flex flex-col gap-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <span>• Cantidad: {creditApartadoStats.countApartados}</span>
                            <span>• Recibido hoy: {config.currencySymbol}{creditApartadoStats.totalApartadoPayments.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. UTILIDAD DEL TURNO */}
                {((config.enablePOS !== false && utilidad.ingresoVentas > 0) || (config.enableTaller !== false && utilidad.ingresoServicios > 0)) && (
                  <div id="corte-utility-section" className={`space-y-2 pt-1 border-t rounded p-0.5 transition-all ${isLight ? 'border-zinc-200' : 'border-slate-800'}`}>
                    <button
                      type="button"
                      onClick={() => setIsUtilityExpanded(!isUtilityExpanded)}
                      className={`w-full text-left px-3 py-1.5 rounded flex justify-between items-center font-bold uppercase tracking-wide text-[11px] cursor-pointer transition-colors ${
                        (isLight) 
                          ? 'bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700' 
                          : 'bg-violet-950/30 hover:bg-violet-900/40 border border-violet-800/40 text-violet-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>📈 Utilidad del turno</span>
                        <span className={`text-[9px] font-normal lowercase ${(isLight) ? 'text-zinc-500' : 'text-slate-400'}`}>
                          ({isUtilityExpanded ? 'contraer' : 'ver detalles'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${utilidad.neta >= 0 ? ((isLight) ? 'text-emerald-600' : 'text-emerald-400') : ((isLight) ? 'text-rose-600' : 'text-rose-400')}`}>
                          {utilidad.neta >= 0 ? '+' : ''}{config.currencySymbol}{utilidad.neta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`${(isLight) ? 'text-zinc-500' : 'text-slate-400'} font-normal text-[9.5px]`}>
                          {isUtilityExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isUtilityExpanded && (
                      <div className="space-y-1.5 pl-1.5 pr-0.5 animate-fadeIn">
                        {/* Ventas */}
                        {config.enablePOS !== false && utilidad.ingresoVentas > 0 && (
                          <div className={`rounded p-2 space-y-1 text-[10px] font-mono ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-slate-900/40 border border-slate-800/50'}`}>
                            <div className="flex justify-between">
                              <span className={isLight ? 'text-zinc-500' : 'text-slate-400'}>Ventas POS</span>
                              <span className={isLight ? 'text-zinc-700' : 'text-slate-300'}>{config.currencySymbol}{utilidad.ingresoVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={isLight ? 'text-zinc-500' : 'text-slate-400'}>– Costo productos</span>
                              <span className="text-rose-400">–{config.currencySymbol}{utilidad.costoVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className={`flex justify-between font-black border-t pt-1 ${isLight ? 'border-zinc-200' : 'border-slate-700'}`}>
                              <span className={isLight ? 'text-zinc-600' : 'text-slate-300'}>Margen ventas</span>
                              <span className={utilidad.margenVentas >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {utilidad.margenVentas >= 0 ? '+' : ''}{config.currencySymbol}{utilidad.margenVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {utilidad.ingresoVentas > 0 && (
                                  <span className={`ml-1 text-[9px] ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    ({Math.round((utilidad.margenVentas / utilidad.ingresoVentas) * 100)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Servicios */}
                        {config.enableTaller !== false && utilidad.ingresoServicios > 0 && (
                          <div className={`rounded p-2 space-y-1 text-[10px] font-mono ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-slate-900/40 border border-slate-800/50'}`}>
                            <div className="flex justify-between">
                              <span className={isLight ? 'text-zinc-500' : 'text-slate-400'}>Servicios</span>
                              <span className={isLight ? 'text-zinc-700' : 'text-slate-300'}>{config.currencySymbol}{utilidad.ingresoServicios.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={isLight ? 'text-zinc-500' : 'text-slate-400'}>– Costo piezas</span>
                              <span className="text-rose-400">–{config.currencySymbol}{utilidad.costoPiezas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className={`flex justify-between font-black border-t pt-1 ${isLight ? 'border-zinc-200' : 'border-slate-700'}`}>
                              <span className={isLight ? 'text-zinc-600' : 'text-slate-300'}>Margen servicios</span>
                              <span className={utilidad.margenServicios >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {utilidad.margenServicios >= 0 ? '+' : ''}{config.currencySymbol}{utilidad.margenServicios.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {utilidad.ingresoServicios > 0 && (
                                  <span className={`ml-1 text-[9px] ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    ({Math.round((utilidad.margenServicios / utilidad.ingresoServicios) * 100)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                            {utilidad.ordenesSinPiezas > 0 && (
                              <p className={`text-[9px] pt-0.5 ${isLight ? 'text-zinc-400' : 'text-slate-600'}`}>
                                {utilidad.ordenesSinPiezas} orden{utilidad.ordenesSinPiezas > 1 ? 'es' : ''} sin piezas registradas — costo asumido $0
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* INTEGRATION REPORT DETAILS STATUS */}
              <div className={`grid grid-cols-2 gap-3 mt-5 border-t pt-4 ${isLight ? 'border-zinc-200' : 'border-slate-700'}`}>

                {/* REQUIRED TOTAL */}
                <div className={`p-3 rounded-lg border-2 ${isLight ? 'bg-teal-50 border-teal-400' : 'bg-teal-950/45 border-teal-600/60'}`}>
                  <span className={`text-[8.5px] font-black tracking-widest uppercase block mb-1.5 ${isLight ? 'text-teal-600' : 'text-teal-500'}`}>
                    Esperado en caja
                  </span>
                  <span className={`text-base md:text-lg lg:text-xl font-mono font-black block leading-none ${isLight ? 'text-teal-700' : 'text-teal-300'}`}>
                    {config.currencySymbol}{totalRequeridoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* DISCREPANCY */}
                <div className={`p-3 rounded-lg border-2 ${
                  discrepancy === 0
                    ? isLight ? 'bg-emerald-50 border-emerald-400' : 'bg-emerald-950/40 border-emerald-600/60'
                    : discrepancy > 0
                    ? isLight ? 'bg-sky-50 border-sky-400' : 'bg-sky-950/40 border-sky-600/60'
                    : isLight ? 'bg-rose-50 border-rose-500' : 'bg-rose-950/40 border-rose-600/60'
                }`}>
                  <span className={`text-[8.5px] font-black tracking-widest uppercase block mb-1.5 ${
                    discrepancy === 0
                      ? isLight ? 'text-emerald-600' : 'text-emerald-500'
                      : discrepancy > 0
                      ? isLight ? 'text-sky-600' : 'text-sky-500'
                      : isLight ? 'text-rose-600' : 'text-rose-500'
                  }`}>
                    {discrepancy === 0 ? 'Estado' : discrepancy > 0 ? 'Sobrante' : 'Faltante'}
                  </span>
                  {discrepancy === 0 ? (
                    <span className={`text-sm md:text-base lg:text-lg font-black font-mono block leading-none ${isLight ? 'text-emerald-700' : 'text-emerald-350'}`}>
                      ✔ CUADRADO
                    </span>
                  ) : (
                    <span className={`text-base md:text-lg lg:text-xl font-black font-mono block leading-none ${
                      discrepancy > 0
                        ? isLight ? 'text-sky-700' : 'text-sky-300'
                        : isLight ? 'text-rose-700' : 'text-rose-300'
                    }`}>
                      {discrepancy > 0 ? '+' : ''}{config.currencySymbol}{discrepancy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* EXTRA DETAILS TAB VIEW */}
        {activeTab === 'Efectivo' && (
          <div className={`flex-1 p-6 space-y-4 overflow-y-auto ${isLight ? 'bg-zinc-50' : 'bg-[#090d16]'}`}>
            <h4 className={`text-sm font-extrabold uppercase font-mono border-b pb-2 ${isLight ? 'text-zinc-900 border-zinc-200' : 'text-slate-200 border-slate-800'}`}>
              Flujos detallados de dinero en efectivo de la fecha {selectedDate}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className={`p-4 rounded border space-y-3 ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0f172a] border-slate-800'}`}>
                <span className={`font-bold font-mono block uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-450'}`}>● Desglose de Entradas Registradas</span>
                <div className={`space-y-1 p-2 rounded text-[11px] font-mono leading-relaxed border font-sans ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-slate-950/40 border-slate-800/60'}`}>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Fondo Inicial de Caja (Saldo Inicial):</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{saldoInicial.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Ventas de productos en mostrador:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{ventasEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Abonos y entregas de servicios técnicos:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{serviciosTecnicos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Comisiones de Recargas:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{comisionesRecargas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Recargas & planes:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{recargasPlanes.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {abonosFiadosEfectivo > 0 && (
                    <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                      <span>Abonos de fiados (Efectivo):</span>
                      <span className="font-bold font-mono">{config.currencySymbol}{abonosFiadosEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {abonosApartadosEfectivo > 0 && (
                    <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                      <span>Abonos de apartados (Efectivo):</span>
                      <span className="font-bold font-mono">{config.currencySymbol}{abonosApartadosEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className={`flex justify-between ${isLight ? 'text-teal-700' : 'text-teal-400'}`}>
                    <span>Ajustes / Entradas manuales de efectivo:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{entradasManuales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-1 font-bold mt-1 ${isLight ? 'border-zinc-200 text-emerald-700' : 'border-slate-800/80 text-emerald-400'}`}>
                    <span>Total Entradas de Caja:</span>
                    <span className="font-mono">{config.currencySymbol}{totalEntradas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  {/* Tarjeta Informativo */}
                  <div className={`flex justify-between border-t border-dashed pt-1 mt-1.5 font-bold ${isLight ? 'border-zinc-200 text-cyan-600' : 'border-slate-800/80 text-cyan-400'}`}>
                    <span>Ventas Tarjeta / Transfer (Info):</span>
                    <span className="font-mono">{config.currencySymbol}{ventasTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded border space-y-3 ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0f172a] border-slate-800'}`}>
                <span className={`font-bold font-mono block uppercase ${isLight ? 'text-red-600' : 'text-rose-400'}`}>● Desglose de Salidas Registradas</span>
                <div className={`space-y-1 p-2 rounded text-[11px] font-mono leading-relaxed border font-sans ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-slate-950/40 border-slate-800/60'}`}>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Devoluciones de Ventas:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{devolucionesVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Devoluciones de Servicios:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{devolucionesServicios.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                    <span>Otros retiros / egresos manuales:</span>
                    <span className="font-bold font-mono">{config.currencySymbol}{salidasManuales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-1 font-bold mt-1 ${isLight ? 'border-zinc-200 text-red-600' : 'border-slate-800/80 text-rose-450'}`} style={isLight ? {} : { color: '#fb7185' }}>
                    <span>Total Salidas de Caja:</span>
                    <span className="font-mono">{config.currencySymbol}{totalSalidas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORICO REGISTROS TAB VIEW */}
        {activeTab === 'Registros' && (
          <div className={`flex-1 p-6 space-y-5 overflow-y-auto w-full ${isLight ? 'bg-zinc-50' : 'bg-[#090d16]'}`}>
            {/* Borradores guardados */}
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wider border-b pb-2 mb-3 ${isLight ? 'text-zinc-700 border-zinc-200' : 'text-slate-300 border-slate-800'}`}>
                💾 Conteos Guardados en esta Sesión
              </h4>
              {drafts.length === 0 ? (
                <div className={`text-center py-6 text-xs ${isLight ? 'text-zinc-400' : 'text-slate-600'}`}>
                  No hay conteos guardados aún. Usa el botón <strong>Guardar</strong> para registrar el conteo actual.
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map((d, i) => (
                    <div key={i} className={`p-3 rounded border flex items-center justify-between gap-3 text-xs ${isLight ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-[#0f172a] border-slate-800 text-slate-300'}`}>
                      <div className="space-y-0.5">
                        <span className={`font-black text-sm ${isLight ? 'text-zinc-900' : 'text-white'}`}>{config.currencySymbol}{d.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className={`block text-[10px] font-mono ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>Guardado a las {d.time}</span>
                        <span className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>
                          B:{config.currencySymbol}{(d.q1000*1000+d.q500*500+d.q200*200+d.q100*100+d.q50*50+d.q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · M:{config.currencySymbol}{d.coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={() => setConfirm({
                          title: '¿Recuperar este conteo?',
                          body: `Se escribirán en el conteo actual los siguientes valores guardados a las ${d.time}:\n• Total: ${config.currencySymbol}${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Billetes: ${config.currencySymbol}${(d.q1000*1000+d.q500*500+d.q200*200+d.q100*100+d.q50*50+d.q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Monedas: ${config.currencySymbol}${d.coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nEl conteo actual será reemplazado.`,
                          onOk: () => {
                            setQ1000(d.q1000); setQ500(d.q500); setQ200(d.q200);
                            setQ100(d.q100); setQ50(d.q50); setQ20(d.q20);
                            setCoinsAmount(d.coinsAmount);
                            setDrafts(prev => prev.filter((_, idx) => idx !== i));
                            setActiveTab('Resumen');
                          }
                        })}
                        className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                          isRetro ? 'bg-[#000080] text-white border border-[#4040c0]'
                          : isLight ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-blue-700 hover:bg-blue-600 text-white'
                        }`}
                      >
                        Recuperar →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AJUSTES TAB VIEW */}
        {activeTab === 'Ajustes' && (
          <div className={`flex-1 p-6 space-y-4 overflow-y-auto ${isLight ? 'bg-zinc-50 text-zinc-700' : 'bg-[#090d16] text-slate-300'}`}>
            <h4 className={`text-sm font-extrabold uppercase font-mono border-b pb-2 ${isLight ? 'text-zinc-900 border-zinc-200' : 'text-slate-200 border-slate-800'}`}>
              Configuraciones y Preferencias del Sistema de Caja
            </h4>
            <div className="max-w-md space-y-4 text-xs">
              <div className={`p-4 rounded border space-y-3 ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0f172a] border-slate-805'}`}>
                <span className={`font-bold font-mono block uppercase ${isLight ? 'text-zinc-900' : 'text-slate-200'}`}>Parámetros</span>
                <p className={`leading-normal text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Configura los montos iniciales por defecto y formatos de impresión de arqueos generados por el sistema de inventario.
                </p>
                <div className="flex items-center justify-between gap-4 mt-2">
                  <span>Operador de Caja Auditado:</span>
                  <span className={`font-mono font-bold px-2 py-1 border rounded ${isLight ? 'text-zinc-700 bg-zinc-100 border-zinc-300' : 'text-slate-300 bg-slate-950 border-slate-800'}`}>garciahugo0@gmail.com</span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-2">
                  <span>Puerto Impresora Termica:</span>
                  <span className={`font-mono font-bold px-2 py-1 border rounded ${isLight ? 'text-zinc-700 bg-zinc-100 border-zinc-300' : 'text-slate-300 bg-slate-950 border-slate-800'}`}>USB001 (Simulado)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* THE ROYAL BLUE BOTTON FOOTER RIBBON */}
        {/* Banner de validación de efectivo */}
        {corteWarning && (
          <div className={`px-4 py-2.5 text-xs font-bold border-t flex items-start gap-2 ${
            corteWarning.startsWith('📈') || corteWarning.startsWith('⚠️ Tercer')
              ? isRetro ? 'bg-amber-50 border-amber-400 text-amber-900' : isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
              : isRetro ? 'bg-red-50 border-red-400 text-red-900' : isLight ? 'bg-red-50 border-red-300 text-red-800' : 'bg-red-950/40 border-red-700/50 text-red-300'
          }`}>
            <span className="mt-0.5 shrink-0">
              {corteWarning.startsWith('📈') ? '📈' : corteWarning.startsWith('⚠️ Tercer') ? '⚠️' : '❌'}
            </span>
            <span>{corteWarning.replace(/^[📈⚠️❌]\s?/, '')}</span>
          </div>
        )}

        <div className={isRetro
          ? "bg-[#dfdfdf] text-black px-3 sm:px-4 py-2.5 border-t border-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 sticky bottom-0 z-30"
          : isLight ? "bg-zinc-100 text-zinc-800 px-3 sm:px-4 py-2.5 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 sticky bottom-0 z-30"
          : "bg-[#111827] text-gray-200 px-3 sm:px-4 py-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 sticky bottom-0 z-30"
        }>
          
          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto justify-stretch sm:justify-start">
            {/* Finalizar Corte — la confirmación se muestra después de las validaciones */}
            <button
              onClick={handleRegisterCorte}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 text-[11px] sm:text-[10.5px] uppercase font-black cursor-pointer transition-colors rounded shadow-xs active:scale-95"
              style={{ background: '#059669', color: '#fff', border: '1px solid #047857' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#047857')}
              onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finalizar Corte</span>
            </button>

            {/* Guardar borrador */}
            <button
              onClick={() => {
                const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const total = totalFisicoContado;
                setConfirm({
                  title: '¿Guardar conteo actual?',
                  body: `Se guardará el conteo en Registros con los siguientes valores:\n• Billetes: ${config.currencySymbol}${(q1000*1000+q500*500+q200*200+q100*100+q50*50+q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Monedas: ${config.currencySymbol}${coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Total contado: ${config.currencySymbol}${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Hora: ${time}\n\nPodrás recuperarlo desde la pestaña Registros.`,
                  onOk: () => {
                    const newDraft = { time, q1000, q500, q200, q100, q50, q20, coinsAmount, total };
                    setDrafts(prev => [newDraft, ...prev.slice(0, 9)]);
                    setSavedDraft(time);
                    setSavedSnapshot({ q1000, q500, q200, q100, q50, q20, coinsAmount });
                  }
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] uppercase font-bold cursor-pointer transition-colors rounded"
              style={{ background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar{savedDraft ? ` ✓ ${savedDraft}` : ''}</span>
            </button>

            {/* Resetear conteo */}
            <button
              onClick={() => setConfirm({
                title: '¿Resetear el conteo?',
                body: `Se borrarán todos los valores del conteo actual:\n• Billetes: ${config.currencySymbol}${(q1000*1000+q500*500+q200*200+q100*100+q50*50+q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → $0.00\n• Monedas: ${config.currencySymbol}${coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → $0.00\n• Total contado: ${config.currencySymbol}${totalFisicoContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → $0.00\n\nEsta acción no se puede deshacer (guarda antes si lo necesitas).`,
                onOk: () => {
                  setQ1000(0); setQ500(0); setQ200(0); setQ100(0); setQ50(0); setQ20(0);
                  setCoinsAmount(0); setCoinQ20(0); setCoinQ10(0); setCoinQ5(0); setCoinQ2(0); setCoinQ1(0); setCoinQ05(0);
                  setSavedDraft(null);
                }
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] uppercase font-bold cursor-pointer transition-colors rounded"
              style={{ background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resetear</span>
            </button>
          </div>

          {/* RIGHT: status + cancelar */}
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono uppercase tracking-tight ${
              isRetro ? 'text-zinc-700 font-bold' : isLight ? 'text-zinc-500' : 'text-slate-400'
            }`}>
              OPERADOR: {currentUser || 'Administrador'}
            </span>
            {onBack && (
              <button
                onClick={() => { setCorteWarning(null); setIntentosFallidos(0); onBack(); }}
                className={isRetro
                  ? "flex items-center gap-1.5 px-3 py-1 bg-[#dfdfdf] border-t-white border-l-white border-r-[#808080] border-b-[#808080] border-2 text-[10.5px] uppercase font-black text-rose-700 cursor-pointer"
                  : isLight ? "flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 rounded text-[10.5px] uppercase font-bold cursor-pointer"
                  : "flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[10.5px] uppercase font-bold cursor-pointer"
                }
              >
                ← Cancelar / Volver
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Modal de confirmación interno */}
      {confirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setConfirm(null)}>
          <div
            className={`w-full max-w-sm overflow-hidden shadow-2xl ${
              isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-none'
              : isLight ? 'bg-white border border-zinc-200 rounded-2xl'
              : 'bg-[#131720] border border-zinc-700 rounded-2xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div id="corte-confirm-header" className={`modal-dark-header px-5 py-4 border-b ${isRetro ? 'bg-[#000080] border-zinc-600' : isLight ? 'bg-[#1a3a6b] border-blue-800' : 'bg-zinc-800/60 border-zinc-700'}`}>
              <span style={{ color: 'white' }} className="text-sm font-black uppercase tracking-wide">{confirm.title}</span>
            </div>
            <div className="px-5 py-4">
              <p className={`text-xs whitespace-pre-line leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{confirm.body}</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              {confirm.autoConfirm ? (
                <div className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg text-center ${
                  isRetro ? 'bg-amber-100 border-2 border-amber-400 text-amber-900'
                  : isLight ? 'bg-amber-50 border border-amber-300 text-amber-800'
                  : 'bg-amber-950/40 border border-amber-700/50 text-amber-300'
                }`}>
                  Cerrando automáticamente en {countdown}s...
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { confirm.onOk(); setConfirm(null); }}
                    className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg cursor-pointer transition-all ${
                      isRetro ? 'bg-[#000080] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all ${
                      isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
                      : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de salida anticipada */}
      {showExitPrompt && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border ${
            isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none'
            : isLight ? 'bg-white border-zinc-200'
            : 'bg-[#131720] border-zinc-700'
          }`}>
            <div className={`px-5 py-4 border-b ${
              isRetro ? 'bg-[#000080] border-zinc-600'
              : isLight ? 'bg-amber-50 border-amber-300'
              : 'bg-amber-950/40 border-amber-700/50'
            }`}>
              <p className={`text-sm font-black uppercase tracking-wide ${isRetro ? 'text-white' : isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                ⚠️ Salir del corte de caja
              </p>
              <p className={`text-[10px] mt-0.5 ${isRetro ? 'text-white/70' : isLight ? 'text-amber-600' : 'text-amber-400/80'}`}>
                Tienes un conteo en progreso — ¿qué deseas hacer?
              </p>
            </div>

            <div className={`px-5 py-3 border-b text-xs space-y-1 ${
              isRetro ? 'border-zinc-400 text-zinc-800'
              : isLight ? 'border-zinc-100 text-zinc-600'
              : 'border-zinc-800 text-zinc-400'
            }`}>
              <p className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>Conteo actual</p>
              <p>Billetes: <strong>{config.currencySymbol}{((q1000*1000)+(q500*500)+(q200*200)+(q100*100)+(q50*50)+(q20*20)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
              <p>Monedas: <strong>{config.currencySymbol}{coinsAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
              <p className={`font-black text-sm ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                Total: {config.currencySymbol}{((q1000*1000)+(q500*500)+(q200*200)+(q100*100)+(q50*50)+(q20*20)+coinsAmount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="px-5 py-4 space-y-2">
              <button
                onClick={() => { saveDraftNow(); setShowExitPrompt(false); onClose(); }}
                className={`w-full py-3 text-xs font-black uppercase rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isRetro ? 'bg-[#000080] text-white border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a]'
                  : isLight ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-700 hover:bg-blue-600 text-white'
                }`}
              >
                💾 Guardar conteo en Registros y salir
              </button>

              <button
                onClick={() => { setShowExitPrompt(false); onClose(); }}
                className={`w-full py-3 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800'
                  : isLight ? 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700'
                  : 'bg-rose-950/30 hover:bg-rose-950/50 border border-rose-700/50 text-rose-400'
                }`}
              >
                🗑 Salir sin guardar (se perderá el conteo)
              </button>

              <button
                onClick={() => setShowExitPrompt(false)}
                className={`w-full py-2.5 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all active:scale-95 ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-600'
                  : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'
                  : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ← Continuar con el corte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
