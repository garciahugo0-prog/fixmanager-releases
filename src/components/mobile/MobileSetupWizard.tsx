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
  Smartphone, Moon, Sun, Search, Bluetooth, Wifi, AlertTriangle
} from 'lucide-react';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { WorkshopConfig, AppUser, ADMIN_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../../types';
import { INITIAL_CONFIG } from '../../data';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { PRINTER_PRESETS_DATABASE } from '../SecondaryViews';

interface SetupWizardProps {
  onComplete: (config: Partial<WorkshopConfig>, adminUser: AppUser, extraUsers?: AppUser[]) => void;
  onBack?: () => void;
}

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

const STEPS = [
  { id: 1, label: 'Apariencia',            icon: Palette       },
  { id: 2, label: 'Datos del Negocio',     icon: Building2     },
  { id: 3, label: 'Logotipos',             icon: ImagePlus     },
  { id: 4, label: 'Administrador',          icon: Shield        },
  { id: 5, label: 'Impresoras',             icon: Printer       },
  { id: 6, label: 'Modo del Taller',        icon: Wrench        },
  { id: 7, label: 'Empleados',              icon: Users         },
  { id: 8, label: 'Confirmar y Finalizar',  icon: CheckCircle2  },
];

export default function MobileSetupWizard({ onComplete, onBack }: SetupWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 — Apariencia (Claro / Oscuro)
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('fixmanager_mobile_theme') as 'dark' | 'light') || 'light';
  });

  // Step 2 — Datos del Negocio
  const [storeName,           setStoreName]           = useState('');
  const [slogan,              setSlogan]              = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('México');
  const [phoneCode,           setPhoneCode]           = useState('+52');
  const [phone,               setPhone]               = useState('');
  const [address,             setAddress]             = useState('');
  const [currencyCode,        setCurrencyCode]        = useState('MXN');

  // Bottom Sheet modals for selects
  const [showCountryCodeSheet, setShowCountryCodeSheet] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

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

  // Step 5 — Impresoras
  const [usePrinters,       setUsePrinters]       = useState<boolean | null>(null);
  const [ecoSilent,         setEcoSilent]         = useState(false);
  
  const [ticketPrinterName, setTicketPrinterName] = useState('');
  const [ticketInterface,   setTicketInterface]   = useState<'Bluetooth' | 'Ethernet'>('Bluetooth');
  const [ticketPaperWidth,  setTicketPaperWidth]  = useState<'58mm' | '80mm'>('80mm');
  const [ticketIpAddress,   setTicketIpAddress]   = useState('');
  const [showManualTicket,  setShowManualTicket]  = useState(false);
  const [manualTicketName,  setManualTicketName]  = useState('');

  const [useLabelPrinter,   setUseLabelPrinter]   = useState(false);
  const [labelPrinterName,  setLabelPrinterName]  = useState('');
  const [labelInterface,    setLabelInterface]    = useState<'Bluetooth' | 'Ethernet'>('Bluetooth');
  const [labelPaperSize,     setLabelPaperSize]     = useState<'51x25mm' | '50x30mm' | '40x20mm' | '40x30mm' | '60x30mm'>('51x25mm');
  const [labelIpAddress,    setLabelIpAddress]    = useState('');
  const [showManualLabel,   setShowManualLabel]   = useState(false);
  const [manualLabelName,   setManualLabelName]   = useState('');

  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<Array<{ name: string; type: 'bluetooth' | 'network'; address: string }>>([]);
  const [showAllBTDevices, setShowAllBTDevices] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const runBluetoothDeviceScan = async () => {
    setIsScanningPrinters(true);
    setScanError(null);

    const isPrinterName = (name: string) => {
      if (showAllBTDevices) return true;
      const lower = name.toLowerCase();
      const printerKeywords = ['pos', 'thermal', 'printer', 'xp', 'pt', 'mpt', 'rp', 'bt-', 'tsp', 'epson', 'star', 'zebra', 'bixolon', 'citizen', 'godex', 'tsc', 'hprt', 'gprinter', 'label'];
      return printerKeywords.some(kw => lower.includes(kw));
    };

    setDiscoveredPrinters([]);

    try {
      await BleClient.initialize();
      await BleClient.requestLEScan(
        { allowDuplicates: false },
        (result) => {
          if (result && result.device) {
            const devName = result.device.name || result.localName;
            if (devName && devName.trim() && isPrinterName(devName.trim())) {
              const newP = {
                name: devName.trim(),
                type: 'bluetooth' as const,
                address: result.device.deviceId || 'Bluetooth LE'
              };
              setDiscoveredPrinters(prev => {
                const filtered = prev.filter(p => p.name !== newP.name);
                return [newP, ...filtered];
              });
            }
          }
        }
      );

      setTimeout(async () => {
        try { await BleClient.stopLEScan(); } catch (e) {}
        setIsScanningPrinters(false);
      }, 5000);
    } catch (bleErr: any) {
      console.error('[BleClient] Scan error:', bleErr);
      setScanError(bleErr?.message || 'No se pudo iniciar el escaneo. Si estás en un simulador de iOS, las funciones Bluetooth físicas no están soportadas.');
      setIsScanningPrinters(false);
    }
  };

  const [isScanningNetwork, setIsScanningNetwork] = useState(false);

  const runNetworkDeviceScan = async (targetCategory: 'ticket' | 'label' = 'ticket') => {
    setIsScanningNetwork(true);
    
    const candidateIPs: string[] = [];
    const currentIp = targetCategory === 'ticket' ? ticketIpAddress : labelIpAddress;
    if (currentIp && currentIp.trim()) {
      candidateIPs.push(currentIp.trim());
    }

    // Common local network printer IPs
    ['192.168.1.100', '192.168.1.200', '192.168.1.50', '192.168.0.100', '192.168.0.50', '192.168.1.150', '192.168.1.250'].forEach(ip => {
      if (!candidateIPs.includes(ip)) candidateIPs.push(ip);
    });

    const foundIPs: string[] = [];

    try {
      await Promise.allSettled(
        candidateIPs.map(async (ip) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 450);
          try {
            await fetch(`http://${ip}:9100`, { mode: 'no-cors', signal: controller.signal });
            foundIPs.push(ip);
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              foundIPs.push(ip);
            }
          } finally {
            clearTimeout(timeoutId);
          }
        })
      );
    } catch (e) {}

    if (foundIPs.length > 0) {
      const newPrinters = foundIPs.map(ip => ({
        name: targetCategory === 'ticket' ? `Impresora LAN (${ip})` : `Etiquetadora LAN (${ip})`,
        type: 'network' as const,
        address: ip
      }));
      setDiscoveredPrinters(prev => {
        const filtered = prev.filter(p => p.type !== 'network');
        return [...newPrinters, ...filtered];
      });
    }
    
    setIsScanningNetwork(false);
  };

  // Step 6 — Modo del taller
  const [workshopMode, setWorkshopMode] = useState<'personal' | 'team'>('personal');

  // Step 7 — Empleados
  const [employees, setEmployees] = useState<Array<{ name: string; pin: string; pinConfirm: string; showPin: boolean; error: string }>>([]);
  const [empShowForm, setEmpShowForm] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empPinConfirm, setEmpPinConfirm] = useState('');
  const [empError, setEmpError] = useState('');

  // Errors dictionary
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddEmployee = () => {
    if (!empName.trim()) { setEmpError('Ingresa el nombre del empleado.'); return; }
    if (empPin.length !== 4 || !/^\d{4}$/.test(empPin)) { setEmpError('El PIN debe ser de 4 dígitos numéricos.'); return; }
    if (empPin !== empPinConfirm) { setEmpError('Los PINs no coinciden.'); return; }
    if (empPin === adminPin) { setEmpError('El PIN del empleado no puede ser igual al del administrador.'); return; }
    if (employees.some(e => e.pin === empPin)) { setEmpError('Ese PIN ya está en uso por otro empleado.'); return; }
    setEmployees(prev => [...prev, { name: empName.trim(), pin: empPin, pinConfirm: empPinConfirm, showPin: false, error: '' }]);
    setEmpName(''); setEmpPin(''); setEmpPinConfirm(''); setEmpError(''); setEmpShowForm(false);
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-update document body class when theme mode is changed in Step 1
  useEffect(() => {
    if (selectedThemeMode === 'light') {
      document.body.className = 'theme-modern mode-light';
      localStorage.setItem('fixmanager_mobile_theme', 'light');
    } else {
      document.body.className = 'theme-modern mode-dark';
      localStorage.setItem('fixmanager_mobile_theme', 'dark');
    }
  }, [selectedThemeMode]);

  const selectedCurrency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // Capitalize helpers
  const toTitleCase = (s: string) =>
    s.replace(/\b(\w)(\S*)/g, (_, first, rest) => first.toUpperCase() + rest);

  // Logo upload helpers
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

  // Validation function
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
      if (usePrinters === true && !ticketPrinterName) e.ticketPrinter = 'Debes vincular una impresora de tickets.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    // Si elegimos modo personal, podemos saltar el paso de empleados (paso 7) y pasar directo a confirmar (paso 8)
    if (step === 6 && workshopMode === 'personal') {
      setStep(8);
    } else {
      setStep(s => Math.min(s + 1, 8));
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step === 8 && workshopMode === 'personal') {
      setStep(6);
    } else {
      setStep(s => Math.max(s - 1, 1));
    }
  };

  const handleComplete = () => {
    if (!validate(step)) return;
    const selectedCountry = COUNTRY_CODES.find(c => c.name === selectedCountryName) || COUNTRY_CODES.find(c => c.code === phoneCode);
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
      theme:          'modern',
      themeMode:      selectedThemeMode,
      workshopMode,
    };

    if (usePrinters) {
      if (ticketPrinterName) {
        cfg.ticketPrinterBrand  = ticketPrinterName;
        cfg.printerInterface    = ticketInterface;
        cfg.ticketPaperWidth    = ticketPaperWidth;

        if (ticketInterface === 'Bluetooth') {
          localStorage.setItem('fixmanager_mobile_print_mode', 'bluetooth');
          localStorage.setItem('fixmanager_mobile_ticket_printer', ticketPrinterName);
          localStorage.setItem('fixmanager_mobile_connected_printer', ticketPrinterName);
        } else {
          localStorage.setItem('fixmanager_mobile_print_mode', 'network');
          localStorage.setItem('fixmanager_mobile_ticket_printer', ticketPrinterName);
          localStorage.setItem('fixmanager_mobile_printer_ip', ticketIpAddress);
        }
      }
      if (labelPrinterName)  { 
        cfg.labelPrinterBrand = labelPrinterName; 
        cfg.labelPrinterInterface = labelInterface; 
        cfg.labelPaperSize    = labelPaperSize;

        localStorage.setItem('fixmanager_mobile_label_printer', labelPrinterName);
        if (labelInterface === 'Ethernet') {
          localStorage.setItem('fixmanager_mobile_printer_ip', labelIpAddress);
        }
      }
    } else {
      cfg.ecoMode = true;
      if (ecoSilent) cfg.ecoSilent = true;
      localStorage.setItem('fixmanager_mobile_print_mode', 'system');
      localStorage.removeItem('fixmanager_mobile_ticket_printer');
      localStorage.removeItem('fixmanager_mobile_connected_printer');
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

    // WhatsApp defaults for mobile
    cfg.whatsappMode = 'direct';

    localStorage.setItem('fixmanager_country_configured_v2', 'true');
    onComplete(cfg, adminUser, employeeUsers);
  };

  // Dynamic Theme Colors
  const isLight = selectedThemeMode === 'light';
  
  const bgClass = isLight ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0a0f1d] text-white';
  const cardClass = isLight ? 'bg-white border border-zinc-200' : 'bg-zinc-900/60 border border-zinc-800';
  const inputClass = isLight 
    ? 'w-full bg-zinc-100 border border-zinc-300 focus:border-indigo-500 rounded-xl px-4 py-3 text-base text-zinc-900 outline-none placeholder-zinc-400' 
    : 'w-full bg-zinc-950/70 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-3 text-base text-white outline-none placeholder-zinc-600';
  const labelClass = isLight ? 'text-zinc-600 text-xs font-bold' : 'text-zinc-400 text-xs font-bold';
  const headerClass = isLight ? 'bg-white border-b border-zinc-200' : 'bg-zinc-950/80 border-b border-zinc-900';
  const footerClass = isLight ? 'bg-white border-t border-zinc-200' : 'bg-zinc-950/80 border-t border-zinc-900';
  
  const progressText = `Paso ${step} de 8`;
  const currentStep = STEPS[step - 1];

  // Filtering lists
  const filteredCountries = COUNTRY_CODES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  const filteredCurrencies = CURRENCIES.filter(c => 
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) || 
    c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-screen w-full select-none overflow-hidden ${bgClass} font-sans relative`}>
      <style>{`
        /* Overrides to defeat the global light-mode overrides in index.css */
        .theme-modern.mode-light button.text-white,
        .theme-modern.mode-light button.bg-zinc-900,
        .theme-modern.mode-light button.bg-zinc-950,
        .theme-modern.mode-light button.bg-indigo-600,
        .theme-modern.mode-light button.bg-violet-600,
        .theme-modern.mode-light button.bg-violet-600\\/90,
        .theme-modern.mode-light button.bg-emerald-600,
        .theme-modern.mode-light button.bg-blue-600 {
          color: #ffffff !important;
        }

        .theme-modern.mode-light button.text-white * {
          color: #ffffff !important;
        }

        /* Adjust the paper width and interface buttons in light mode */
        .theme-modern.mode-light .paper-width-active {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
          color: #ffffff !important;
        }

        .theme-modern.mode-light .interface-active {
          background-color: #4f46e5 !important;
          border-color: #4338ca !important;
          color: #ffffff !important;
        }

        .theme-modern.mode-light .paper-width-active span,
        .theme-modern.mode-light .interface-active span {
          color: #ffffff !important;
        }
      `}</style>
      
      {/* Dynamic Glow Orbs for visual excellence (only in Dark Mode) */}
      {!isLight && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-violet-600/10 rounded-full blur-[90px] pointer-events-none z-0" />
          <div className="absolute bottom-[20%] left-[-15%] w-[200px] h-[200px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none z-0" />
        </>
      )}

      {/* Header bar */}
      <header className={`relative z-10 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between ${headerClass}`}>
        <div className="flex items-center gap-3">
          {onBack && step === 1 ? (
            <button 
              type="button" 
              onClick={onBack}
              className={`p-2 rounded-lg cursor-pointer ${isLight ? 'hover:bg-zinc-100 text-zinc-600' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            step > 1 && (
              <button 
                type="button" 
                onClick={handleBack}
                className={`p-2 rounded-lg cursor-pointer ${isLight ? 'hover:bg-zinc-100 text-zinc-600' : 'hover:bg-zinc-900 text-zinc-400'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )
          )}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider">Configuración</h2>
            <p className="text-[10px] opacity-75 font-semibold">{progressText} • {currentStep.label}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
          {React.createElement(currentStep.icon, { className: 'w-3 h-3 text-violet-400' })}
          <span>{currentStep.label}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={`w-full h-1 ${isLight ? 'bg-zinc-200' : 'bg-zinc-950'}`}>
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${(step / 8) * 100}%` }}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 py-6 z-10 flex flex-col justify-between">
        <div className="space-y-5 max-w-md w-full mx-auto">
          
          {/* STEP 1: APARIENCIA */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Elige tu Apariencia</h3>
                <p className="text-xs opacity-75">Selecciona el estilo visual para la aplicación móvil.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => setSelectedThemeMode('dark')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedThemeMode === 'dark' 
                      ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-950/20' 
                      : isLight 
                        ? 'border-zinc-200 bg-white text-zinc-500' 
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedThemeMode === 'dark' ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Moon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className={`block font-black text-sm ${selectedThemeMode === 'dark' ? 'text-violet-400' : ''}`}>Modo Oscuro</span>
                    <span className="text-[10px] opacity-75">Ideal para OLED y noche</span>
                  </div>
                </button>

                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => setSelectedThemeMode('light')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedThemeMode === 'light' 
                      ? 'border-indigo-500 bg-indigo-600/10 shadow-lg shadow-indigo-100/20' 
                      : isLight 
                        ? 'border-zinc-200 bg-white text-zinc-500' 
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedThemeMode === 'light' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Sun className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className={`block font-black text-sm ${selectedThemeMode === 'light' ? 'text-indigo-600' : ''}`}>Modo Claro</span>
                    <span className="text-[10px] opacity-75">Máxima legibilidad diurna</span>
                  </div>
                </button>
              </div>

              {/* Visual preview simulator */}
              <div className={`p-4 rounded-xl border ${cardClass} space-y-2 mt-4`}>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Vista Previa</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedThemeMode === 'dark' ? 'bg-violet-500' : 'bg-indigo-600'}`} />
                  <span className="text-xs font-bold">FixManager está listo en tu dispositivo.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DATOS DEL NEGOCIO */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Datos del Negocio</h3>
                <p className="text-xs opacity-75">Configura la información básica de tu taller.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>NOMBRE DEL NEGOCIO *</label>
                  <input
                    type="text"
                    placeholder="Ej. Smart Clinic"
                    value={storeName}
                    onChange={(e) => setStoreName(toTitleCase(e.target.value))}
                    className={inputClass}
                  />
                  {errors.storeName && (
                    <p className="text-xs text-red-500 font-bold mt-1">⚠️ {errors.storeName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>SLOGAN O DESCRIPCIÓN (OPCIONAL)</label>
                  <input
                    type="text"
                    placeholder="Ej. Clínica Especializada de Celulares"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>CÓDIGO</label>
                    <button
                      type="button"
                      onClick={() => setShowCountryCodeSheet(true)}
                      className={`w-full py-3 px-3 rounded-xl border text-sm font-bold text-center flex items-center justify-center gap-1 cursor-pointer ${
                        isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-zinc-950/70 border-zinc-800 text-white'
                      }`}
                    >
                      <span>{COUNTRY_CODES.find(c => c.code === phoneCode)?.flag}</span>
                      <span>{phoneCode}</span>
                    </button>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className={labelClass}>TELÉFONO DE CONTACTO</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="351 157 4876"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>DIRECCIÓN FÍSICA</label>
                  <input
                    type="text"
                    placeholder="Av. Principal #123, Col. Centro"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-[10px] opacity-70 flex items-center gap-1.5 pt-0.5">
                    <span>📍</span>
                    <span>Genera el QR de Google Maps en <strong>Ajustes → Datos del Negocio</strong>.</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>MONEDA DE TRABAJO</label>
                  <button
                    type="button"
                    onClick={() => setShowCurrencySheet(true)}
                    className={`w-full py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-between cursor-pointer ${
                      isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-zinc-950/70 border-zinc-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{selectedCurrency.flag}</span>
                      <span>{selectedCurrency.name}</span>
                    </div>
                    <span className="bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded text-xs font-mono font-black border border-violet-500/20">
                      {selectedCurrency.code} ({selectedCurrency.symbol})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: LOGOTIPOS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Identidad del Taller</h3>
                <p className="text-xs opacity-75">Carga logotipos para el sistema y tus comprobantes.</p>
              </div>

              <div className="space-y-4">
                
                {/* Logo del Sistema */}
                <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Logo del Sistema</h4>
                    <p className="text-[10px] opacity-75">Se muestra en la pantalla de bienvenida y menús.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                    }`}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1 rounded-xl" />
                      ) : (
                        <ImagePlus className="w-6 h-6 opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <label className="flex-1 py-2 px-3 text-xs font-black bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-center cursor-pointer active:scale-95 transition-all">
                        Cargar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleSystemLogo} />
                      </label>
                      {logoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setLogoUrl('')} 
                          className="px-3 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo de Ticket Térmico */}
                <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Logo de Ticket Térmico</h4>
                    <p className="text-[10px] opacity-75">Se imprime en el cabezal de tickets de 58/80mm.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                    }`}>
                      {ticketLogoUrl ? (
                        <img src={ticketLogoUrl} alt="Ticket Logo" className="w-full h-full object-contain p-1 rounded-xl" />
                      ) : (
                        <ImagePlus className="w-6 h-6 opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <label className="flex-1 py-2 px-3 text-xs font-black bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-center cursor-pointer active:scale-95 transition-all">
                        Cargar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleTicketLogo} />
                      </label>
                      {ticketLogoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setTicketLogoUrl('')} 
                          className="px-3 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo de Etiquetas de Servicio */}
                <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Logo de Etiquetas</h4>
                    <p className="text-[10px] opacity-75">Logo miniatura impreso en etiquetas de equipos.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                    }`}>
                      {labelLogoUrl ? (
                        <img src={labelLogoUrl} alt="Label Logo" className="w-full h-full object-contain p-1 rounded-xl" />
                      ) : (
                        <ImagePlus className="w-6 h-6 opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <label className="flex-1 py-2 px-3 text-xs font-black bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-center cursor-pointer active:scale-95 transition-all">
                        Cargar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleLabelLogo} />
                      </label>
                      {labelLogoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setLabelLogoUrl('')} 
                          className="px-3 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 4: ADMINISTRADOR */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Cuenta del Administrador</h3>
                <p className="text-xs opacity-75">Crea la cuenta del dueño del taller para control total.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    placeholder="Ej. Hugo García"
                    value={adminName}
                    onChange={(e) => setAdminName(toTitleCase(e.target.value))}
                    className={inputClass}
                  />
                  {errors.adminName && (
                    <p className="text-xs text-red-500 font-bold mt-1">⚠️ {errors.adminName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>PIN DE ACCESO (4 DÍGITOS)</label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="Ej. 1234"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 cursor-pointer`}
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.adminPin && (
                    <p className="text-xs text-red-500 font-bold mt-1">⚠️ {errors.adminPin}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>CONFIRMAR PIN</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Escribe tu PIN de nuevo"
                    value={adminPinConfirm}
                    onChange={(e) => setAdminPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={inputClass}
                  />
                  {errors.adminPinConfirm && (
                    <p className="text-xs text-red-500 font-bold mt-1">⚠️ {errors.adminPinConfirm}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: IMPRESORAS */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Ajustes de Impresión</h3>
                <p className="text-xs opacity-75">Configura cómo entregarás comprobantes y etiquetas.</p>
              </div>

              {usePrinters === null ? (
                <div className="space-y-4 pt-2">
                  <p className="text-center text-xs opacity-80">¿Cuentas con impresoras térmicas de tickets o etiquetas?</p>
                  
                  <button
                    type="button"
                    onClick={() => { setUsePrinters(true); setErrors({}); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-zinc-800 bg-zinc-900/40 text-left hover:border-violet-500 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">Sí, usaré Impresora Térmica</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Tickets y etiquetas por Bluetooth o Red.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUsePrinters(false); setErrors({}); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-zinc-800 bg-zinc-900/40 text-left hover:border-emerald-500 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <LeafIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">No, modo ecológico (Digital)</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Generar PDF y compartir por WhatsApp.</p>
                    </div>
                  </button>

                  {errors.usePrinters && (
                    <p className="text-xs text-red-500 font-bold text-center mt-2">⚠️ {errors.usePrinters}</p>
                  )}
                </div>
              ) : !usePrinters ? (
                // Eco Mode Setup
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <LeafIcon className="w-5 h-5" />
                      <h4 className="font-black text-sm">Modo Ecológico Activo</h4>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed">
                      El sistema no buscará hardware físico de impresión. En su lugar, todos los tickets se generarán de forma digital en pantalla, permitiéndote guardarlos como PDF o enviarlos a tus clientes de manera rápida.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUsePrinters(null)}
                    className="w-full text-center py-2.5 text-xs font-bold text-zinc-500 hover:text-white cursor-pointer uppercase tracking-wider"
                  >
                    🔄 Cambiar elección de impresora
                  </button>
                </div>
              ) : (
                // Thermal Printer Setup
                <div className="space-y-4">
                  
                  {/* --- IMPRESORA DE TICKETS --- */}
                  <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/20 border border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-violet-400">
                        1. Impresora de Tickets
                      </span>
                      {ticketPrinterName && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Vinculada
                        </span>
                      )}
                    </div>

                    {/* Interface selector */}
                    <div className="space-y-1">
                      <label className={labelClass}>CONEXIÓN DE LA IMPRESORA</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTicketInterface('Bluetooth');
                            setTicketPrinterName('');
                            setErrors({});
                          }}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            ticketInterface === 'Bluetooth'
                              ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                              : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Bluetooth className="w-4 h-4" />
                          <span>Bluetooth</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTicketInterface('Ethernet');
                            setTicketPrinterName(ticketIpAddress ? `Impresora Red (${ticketIpAddress.trim()})` : '');
                            setErrors({});
                          }}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            ticketInterface === 'Ethernet'
                              ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                              : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Wifi className="w-4 h-4" />
                          <span>Red / Wi-Fi</span>
                        </button>
                      </div>
                    </div>

                    {/* Bluetooth Scanning & Listing for Ticket Printer */}
                    {ticketInterface === 'Bluetooth' && (
                      <div className="space-y-2.5 pt-1 animate-fadeIn">
                        {ticketPrinterName ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                            <div className="text-left">
                              <p className="text-[10px] text-zinc-500 font-bold uppercase">Dispositivo Vinculado</p>
                              <p className="text-sm font-black text-white mt-0.5">{ticketPrinterName}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTicketPrinterName('')}
                              className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              disabled={isScanningPrinters}
                              onClick={runBluetoothDeviceScan}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                            >
                              {isScanningPrinters ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                                  <span>Buscando impresoras...</span>
                                </>
                              ) : (
                                <>
                                  <Search className="w-4 h-4" />
                                  <span>Buscar Impresoras Bluetooth</span>
                                </>
                              )}
                            </button>

                            {/* Discovered BT devices list */}
                            {discoveredPrinters.length > 0 && (
                              <div className="border border-zinc-800/80 rounded-xl divide-y divide-zinc-800 bg-zinc-950/20 max-h-[160px] overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                                {discoveredPrinters.map(dev => (
                                  <div key={dev.name} className="flex items-center justify-between p-2 hover:bg-zinc-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Bluetooth className="w-3.5 h-3.5 text-zinc-500" />
                                      <div className="text-left">
                                        <p className="text-xs font-bold text-white">{dev.name}</p>
                                        <p className="text-[9px] text-zinc-500">{dev.address}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTicketPrinterName(dev.name);
                                        setErrors({});
                                      }}
                                      className="text-[10px] font-black text-violet-400 bg-violet-600/10 border border-violet-500/20 rounded-lg px-3 py-1.5 cursor-pointer uppercase tracking-wider hover:bg-violet-600 hover:text-white transition-all"
                                    >
                                      Vincular
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* BLE Fallback for Simulators */}
                            {scanError && (
                              <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-left">
                                <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  Simulador detectado o BLE inactivo
                                </p>
                                <p className="text-[10px] text-zinc-400 leading-normal">
                                  Los simuladores de iOS no soportan escaneo de hardware real. Escribe el nombre para simular la conexión:
                                </p>
                                {!showManualTicket ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowManualTicket(true)}
                                    className="text-[9.5px] font-black text-amber-400 underline uppercase tracking-wider cursor-pointer"
                                  >
                                    Vincular manualmente
                                  </button>
                                ) : (
                                  <div className="flex gap-2 animate-fadeIn">
                                    <input
                                      type="text"
                                      placeholder="Ej. XP-80, Epson"
                                      value={manualTicketName}
                                      onChange={(e) => setManualTicketName(e.target.value)}
                                      className="flex-1 text-[11px] bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (manualTicketName.trim()) {
                                          setTicketPrinterName(manualTicketName.trim());
                                          setErrors({});
                                        }
                                      }}
                                      className="text-[10px] font-bold bg-amber-600/90 text-white rounded-lg px-3 py-1.5 cursor-pointer"
                                    >
                                      Vincular
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Network IP for Ticket Printer */}
                    {ticketInterface === 'Ethernet' && (
                      <div className="space-y-2.5 pt-1 animate-fadeIn text-left">
                        <button
                          type="button"
                          disabled={isScanningNetwork}
                          onClick={() => runNetworkDeviceScan('ticket')}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                        >
                          {isScanningNetwork ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                              <span>Buscando en red LAN...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span>Buscar Impresoras en Red LAN</span>
                            </>
                          )}
                        </button>

                        {/* List of discovered LAN printers */}
                        {discoveredPrinters.filter(p => p.type === 'network').length > 0 && (
                          <div className="border border-zinc-800/80 rounded-xl divide-y divide-zinc-800 bg-zinc-950/20 max-h-[140px] overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                            {discoveredPrinters.filter(p => p.type === 'network').map(dev => {
                              const isLinked = ticketIpAddress === dev.address;
                              return (
                                <div key={dev.address} className="flex items-center justify-between p-2 hover:bg-zinc-900/20 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Wifi className="w-3.5 h-3.5 text-zinc-500" />
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-white">{dev.name}</p>
                                      <p className="text-[9px] text-zinc-500">Puerto 9100</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTicketPrinterName(dev.name);
                                      setTicketIpAddress(dev.address);
                                      setErrors({});
                                    }}
                                    className={`text-[10px] font-black rounded-lg px-3 py-1.5 cursor-pointer uppercase tracking-wider transition-all ${
                                      isLinked
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white'
                                    }`}
                                  >
                                    {isLinked ? 'Vinculada' : 'Vincular'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className={labelClass}>O INGRESA LA DIRECCIÓN IP MANUALMENTE</label>
                          <input
                            type="text"
                            placeholder="Ej. 192.168.1.100"
                            value={ticketIpAddress}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTicketIpAddress(val);
                              setTicketPrinterName(val.trim() ? `Impresora Red (${val.trim()})` : '');
                              setErrors({});
                            }}
                            className={inputClass}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          ⚠️ Asegúrate de estar conectado a la misma red Wi-Fi que la impresora de tickets.
                        </p>
                      </div>
                    )}

                    {/* Paper width selector */}
                    <div className="space-y-1 text-left">
                      <label className={labelClass}>ANCHO DE PAPEL DE TICKETS</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTicketPaperWidth('80mm')}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            ticketPaperWidth === '80mm'
                              ? 'bg-violet-600 border-violet-500 text-white shadow-sm paper-width-active'
                              : isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
                          }`}
                        >
                          80 mm (Estándar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTicketPaperWidth('58mm')}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            ticketPaperWidth === '58mm'
                              ? 'bg-violet-600 border-violet-500 text-white shadow-sm paper-width-active'
                              : isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
                          }`}
                        >
                          58 mm (Portátil)
                        </button>
                      </div>
                    </div>

                    {errors.ticketPrinter && (
                      <p className="text-xs text-red-500 font-bold mt-1 text-left">⚠️ {errors.ticketPrinter}</p>
                    )}
                  </div>

                  {/* --- IMPRESORA DE ETIQUETAS ETIQUETAS --- */}
                  <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/20 border border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-violet-400">
                        2. Impresora de Etiquetas (Opcional)
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useLabelPrinter}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseLabelPrinter(checked);
                            if (!checked) {
                              setLabelPrinterName('');
                              setLabelIpAddress('');
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    {useLabelPrinter && (
                      <div className="space-y-3 pt-2 border-t border-zinc-800/50 animate-fadeIn">
                        
                        {/* Interface Selector */}
                        <div className="space-y-1">
                          <label className={labelClass}>CONEXIÓN ETIQUETADORA</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLabelInterface('Bluetooth');
                                setLabelPrinterName('');
                              }}
                              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                labelInterface === 'Bluetooth'
                                  ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                                  : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              <Bluetooth className="w-4 h-4" />
                              <span>Bluetooth</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLabelInterface('Ethernet');
                                setLabelPrinterName(labelIpAddress ? `Etiquetadora Red (${labelIpAddress.trim()})` : '');
                              }}
                              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                labelInterface === 'Ethernet'
                                  ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                                  : isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              <Wifi className="w-4 h-4" />
                              <span>Red / Wi-Fi</span>
                            </button>
                          </div>
                        </div>

                        {/* Bluetooth scan for label printer */}
                        {labelInterface === 'Bluetooth' && (
                          <div className="space-y-2 animate-fadeIn">
                            {labelPrinterName ? (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                                <div className="text-left">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Etiquetadora Vinculada</p>
                                  <p className="text-sm font-black text-white mt-0.5">{labelPrinterName}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLabelPrinterName('')}
                                  className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 active:scale-95 transition-all cursor-pointer"
                                >
                                  Cambiar
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <button
                                  type="button"
                                  disabled={isScanningPrinters}
                                  onClick={runBluetoothDeviceScan}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                                >
                                  {isScanningPrinters ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                                      <span>Buscando etiquetadoras...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-4 h-4" />
                                      <span>Buscar Impresoras Bluetooth</span>
                                    </>
                                  )}
                                </button>

                                {discoveredPrinters.length > 0 && (
                                  <div className="border border-zinc-800/80 rounded-xl divide-y divide-zinc-800 bg-zinc-950/20 max-h-[140px] overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                                    {discoveredPrinters.map(dev => (
                                      <div key={dev.name} className="flex items-center justify-between p-1.5 hover:bg-zinc-900/20 rounded-lg">
                                        <div className="flex items-center gap-1.5">
                                          <Bluetooth className="w-3.5 h-3.5 text-zinc-500" />
                                          <div className="text-left">
                                            <p className="text-xs font-bold text-white">{dev.name}</p>
                                            <p className="text-[9px] text-zinc-500">{dev.address}</p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setLabelPrinterName(dev.name)}
                                          className="text-[9.5px] font-black text-violet-400 bg-violet-600/10 border border-violet-500/20 rounded-lg px-2.5 py-1.5 cursor-pointer uppercase tracking-wider hover:bg-violet-600 hover:text-white transition-all"
                                        >
                                          Vincular
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {scanError && (
                                  <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-left">
                                    <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      Simulador detectado o BLE inactivo
                                    </p>
                                    {!showManualLabel ? (
                                      <button
                                        type="button"
                                        onClick={() => setShowManualLabel(true)}
                                        className="text-[9.5px] font-black text-amber-400 underline uppercase tracking-wider cursor-pointer"
                                      >
                                        Vincular manualmente
                                      </button>
                                    ) : (
                                      <div className="flex gap-2 animate-fadeIn">
                                        <input
                                          type="text"
                                          placeholder="Ej. XP-365B, Zebra"
                                          value={manualLabelName}
                                          onChange={(e) => setManualLabelName(e.target.value)}
                                          className="flex-1 text-[11px] bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 text-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (manualLabelName.trim()) {
                                              setLabelPrinterName(manualLabelName.trim());
                                            }
                                          }}
                                          className="text-[10px] font-bold bg-amber-600/90 text-white rounded-lg px-3 py-1.5 cursor-pointer"
                                        >
                                          Vincular
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Network IP for label printer */}
                        {labelInterface === 'Ethernet' && (
                          <div className="space-y-2.5 animate-fadeIn text-left">
                            <button
                              type="button"
                              disabled={isScanningNetwork}
                              onClick={() => runNetworkDeviceScan('label')}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                            >
                              {isScanningNetwork ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                                  <span>Buscando en red LAN...</span>
                                </>
                              ) : (
                                <>
                                  <Search className="w-4 h-4" />
                                  <span>Buscar Etiquetadoras en Red LAN</span>
                                </>
                              )}
                            </button>

                            {/* List of discovered LAN label printers */}
                            {discoveredPrinters.filter(p => p.type === 'network').length > 0 && (
                              <div className="border border-zinc-800/80 rounded-xl divide-y divide-zinc-800 bg-zinc-950/20 max-h-[140px] overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                                {discoveredPrinters.filter(p => p.type === 'network').map(dev => {
                                  const isLinked = labelIpAddress === dev.address;
                                  return (
                                    <div key={dev.address} className="flex items-center justify-between p-2 hover:bg-zinc-900/20 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Wifi className="w-3.5 h-3.5 text-zinc-500" />
                                        <div className="text-left">
                                          <p className="text-xs font-bold text-white">{dev.name.replace('Impresora', 'Etiquetadora')}</p>
                                          <p className="text-[9px] text-zinc-500">Puerto 9100</p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLabelPrinterName(dev.name.replace('Impresora', 'Etiquetadora'));
                                          setLabelIpAddress(dev.address);
                                        }}
                                        className={`text-[10px] font-black rounded-lg px-3 py-1.5 cursor-pointer uppercase tracking-wider transition-all ${
                                          isLinked
                                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                            : 'bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white'
                                        }`}
                                      >
                                        {isLinked ? 'Vinculada' : 'Vincular'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className={labelClass}>O INGRESA LA DIRECCIÓN IP MANUALMENTE</label>
                              <input
                                type="text"
                                placeholder="Ej. 192.168.1.101"
                                value={labelIpAddress}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLabelIpAddress(val);
                                  setLabelPrinterName(val.trim() ? `Etiquetadora Red (${val.trim()})` : '');
                                }}
                                className={inputClass}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-normal">
                              ⚠️ Asegúrate de estar conectado a la misma red Wi-Fi que la impresora de etiquetas.
                            </p>
                          </div>
                        )}

                        {/* Label Paper size selector */}
                        <div className="space-y-1 text-left">
                          <label className={labelClass}>TAMAÑO ETIQUETA ADHESIVA</label>
                          <select
                            value={labelPaperSize}
                            onChange={(e) => setLabelPaperSize(e.target.value as any)}
                            className={inputClass}
                          >
                            <option value="51x25mm">51x25 mm</option>
                            <option value="50x30mm">50x30 mm</option>
                            <option value="40x20mm">40x20 mm</option>
                            <option value="40x30mm">40x30 mm</option>
                            <option value="60x30mm">60x30 mm</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUsePrinters(null);
                      setTicketPrinterName('');
                      setLabelPrinterName('');
                    }}
                    className="w-full text-center py-2 text-xs font-bold text-zinc-500 hover:text-white cursor-pointer uppercase tracking-wider"
                  >
                    🔄 Cambiar a modo ecológico
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: MODO DEL TALLER */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Modo del Taller</h3>
                <p className="text-xs opacity-75">Elige cómo se gestionará la operación técnica.</p>
              </div>

              <div className="space-y-4 pt-2">
                
                {/* Personal Mode Card */}
                <button
                  type="button"
                  onClick={() => setWorkshopMode('personal')}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    workshopMode === 'personal'
                      ? 'border-violet-500 bg-violet-600/10'
                      : isLight 
                        ? 'border-zinc-200 bg-white' 
                        : 'border-zinc-800 bg-zinc-900/40'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    workshopMode === 'personal' ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`font-black text-sm ${workshopMode === 'personal' ? 'text-violet-400' : 'text-white'}`}>Taller Personal</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Soy el único técnico. Todas las reparaciones se me asignan a mí y cobro directamente. El asistente se saltará la creación de empleados.
                    </p>
                  </div>
                </button>

                {/* Team Mode Card */}
                <button
                  type="button"
                  onClick={() => setWorkshopMode('team')}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    workshopMode === 'team'
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : isLight 
                        ? 'border-zinc-200 bg-white' 
                        : 'border-zinc-800 bg-zinc-900/40'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    workshopMode === 'team' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`font-black text-sm ${workshopMode === 'team' ? 'text-indigo-400' : 'text-white'}`}>Taller con Equipo</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Tengo empleados o técnicos adicionales. Permite crear perfiles de empleados con PINs individuales de acceso y asignarles equipos específicos.
                    </p>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* STEP 7: EMPLEADOS */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Equipo de Trabajo</h3>
                <p className="text-xs opacity-75">Agrega a tus empleados y técnicos de reparación.</p>
              </div>

              <div className="space-y-4">
                
                {/* Employee List */}
                <div className="space-y-2">
                  {employees.length === 0 ? (
                    <p className="text-center text-xs opacity-50 py-4 italic">No has agregado empleados aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {employees.map((emp, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-xl border ${cardClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="block font-black text-xs">{emp.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">PIN: ••••</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmployee(idx)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form to Add Employee */}
                {empShowForm ? (
                  <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
                    <div className="space-y-1">
                      <label className={labelClass}>NOMBRE COMPLETO</label>
                      <input
                        type="text"
                        placeholder="Ej. Carlos Pérez"
                        value={empName}
                        onChange={(e) => setEmpName(toTitleCase(e.target.value))}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>PIN (4 DÍGITOS)</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          placeholder="PIN"
                          value={empPin}
                          onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>CONFIRMAR PIN</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          placeholder="Confirmar"
                          value={empPinConfirm}
                          onChange={(e) => setEmpPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {empError && (
                      <p className="text-xs text-red-500 font-bold">⚠️ {empError}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddEmployee}
                        className="flex-1 py-2 px-3 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
                      >
                        Guardar Empleado
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEmpShowForm(false); setEmpError(''); }}
                        className={`py-2 px-3 text-xs font-bold border rounded-xl cursor-pointer ${
                          isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEmpShowForm(true)}
                    className="w-full py-3 border-2 border-dashed border-zinc-800 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Empleado</span>
                  </button>
                )}

              </div>
            </div>
          )}

          {/* STEP 8: CONFIRMAR Y FINALIZAR */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">¡Todo listo!</h3>
                <p className="text-xs opacity-75">Revisa la configuración antes de arrancar tu taller.</p>
              </div>

              <div className={`p-4 rounded-2xl border ${cardClass} space-y-3.5 divide-y divide-zinc-800`}>
                
                {/* General Info */}
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="block font-black uppercase text-[9px] tracking-wider text-violet-400">Taller</span>
                    <span className="font-bold text-sm">{storeName}</span>
                    {slogan && <span className="block text-[10px] opacity-75 font-semibold mt-0.5">{slogan}</span>}
                  </div>
                  <div className="text-right">
                    <span className="block font-black uppercase text-[9px] tracking-wider text-violet-400">Moneda</span>
                    <span className="font-bold">{selectedCurrency.flag} {selectedCurrency.code}</span>
                  </div>
                </div>

                {/* Account details */}
                <div className="flex justify-between items-center text-xs pt-3">
                  <div>
                    <span className="block font-black uppercase text-[9px] tracking-wider text-emerald-400">Administrador</span>
                    <span className="font-bold">{adminName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black uppercase text-[9px] tracking-wider text-emerald-400">Modo Taller</span>
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {workshopMode === 'personal' ? 'Personal 👤' : 'Equipo 👥'}
                    </span>
                  </div>
                </div>

                {/* Printer config */}
                <div className="flex justify-between items-center text-xs pt-3">
                  <div>
                    <span className="block font-black uppercase text-[9px] tracking-wider text-indigo-400">Impresión</span>
                    <span className="font-bold">
                      {usePrinters ? `${ticketPrinterName} (${ticketPaperWidth})` : 'Modo Ecológico (Digital)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black uppercase text-[9px] tracking-wider text-indigo-400">Empleados</span>
                    <span className="font-bold">{employees.length}</span>
                  </div>
                </div>

                {/* Theme mode summary */}
                <div className="flex justify-between items-center text-xs pt-3">
                  <div>
                    <span className="block font-black uppercase text-[9px] tracking-wider text-zinc-400">Tema Móvil</span>
                    <span className="font-bold capitalize">{selectedThemeMode === 'dark' ? 'Oscuro 🌙' : 'Claro ☀️'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black uppercase text-[9px] tracking-wider text-zinc-400">WhatsApp</span>
                    <span className="font-bold">Enlaces Directos ✅</span>
                  </div>
                </div>

              </div>

              <div className="bg-violet-950/20 border border-violet-500/20 rounded-xl p-3 text-[10px] text-violet-300 leading-relaxed text-center">
                ✨ Puedes modificar todos estos ajustes más tarde desde el menú de Ajustes en la aplicación.
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Nav Buttons */}
      <footer className={`px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-10 flex items-center justify-between ${footerClass}`}>
        <div className="w-1/3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer border flex items-center gap-1 active:scale-95 transition-all ${
                isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          )}
        </div>

        <div className="w-1/3 flex justify-center">
          {/* Custom progress dots */}
          <div className="flex gap-1.5 items-center">
            {STEPS.map((s) => (
              <div 
                key={s.id} 
                className={`transition-all duration-300 rounded-full ${
                  s.id === step 
                    ? 'w-4 h-2 bg-violet-500 shadow-md shadow-violet-500/30' 
                    : s.id < step 
                      ? 'w-2 h-2 bg-emerald-500' 
                      : `w-1.5 h-1.5 ${isLight ? 'bg-zinc-300' : 'bg-zinc-800'}`
                }`} 
              />
            ))}
          </div>
        </div>

        <div className="w-1/3 flex justify-end">
          {step < 8 ? (
            <button
              type="button"
              onClick={handleNext}
              className="py-3 px-5 rounded-xl font-black text-xs bg-violet-600 hover:bg-violet-500 text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg shadow-violet-950/20"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="py-3 px-5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg shadow-emerald-950/20"
            >
              <Check className="w-4 h-4" />
              <span>Comenzar</span>
            </button>
          )}
        </div>
      </footer>

      {/* ========================================== */}
      {/* BOTTOM SHEET: SELECCIÓN DE CÓDIGO DE PAÍS */}
      {/* ========================================== */}
      {showCountryCodeSheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300">
          
          {/* Tap outside to close */}
          <div className="flex-1" onClick={() => { setShowCountryCodeSheet(false); setCountrySearch(''); }} />

          {/* Sliding sheet container */}
          <div className={`max-h-[75vh] flex flex-col rounded-t-3xl border-t shadow-2xl z-50 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-900'
          }`}>
            
            {/* Grabber bar */}
            <div className="flex justify-center py-3 shrink-0">
              <div className={`w-12 h-1.5 rounded-full ${isLight ? 'bg-zinc-300' : 'bg-zinc-800'}`} />
            </div>

            {/* Title & Close */}
            <div className="px-5 pb-3 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black uppercase tracking-wider">Código de País</h3>
              <button 
                type="button" 
                onClick={() => { setShowCountryCodeSheet(false); setCountrySearch(''); }}
                className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 pb-4 shrink-0">
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
                isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-900 text-white'
              }`}>
                <Search className="w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar país o código..." 
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-inherit"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1.5">
              {filteredCountries.length === 0 ? (
                <p className="text-center text-xs opacity-50 py-8 italic">No se encontraron resultados.</p>
              ) : (
                filteredCountries.map((cc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedCountryName(cc.name);
                      setPhoneCode(cc.code);
                      if (cc.currencyCode) {
                        setCurrencyCode(cc.currencyCode);
                      }
                      setShowCountryCodeSheet(false);
                      setCountrySearch('');
                    }}
                    className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                      (selectedCountryName === cc.name || phoneCode === cc.code) 
                        ? 'border-violet-500 bg-violet-500/10' 
                        : isLight 
                          ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800' 
                          : 'border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900/80 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cc.flag}</span>
                      <span className="text-sm font-bold">{cc.name}</span>
                    </div>
                    <span className="font-black font-mono text-sm text-violet-400">{cc.code}</span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* BOTTOM SHEET: SELECCIÓN DE MONEDA */}
      {/* ========================================== */}
      {showCurrencySheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300">
          
          {/* Tap outside to close */}
          <div className="flex-1" onClick={() => { setShowCurrencySheet(false); setCurrencySearch(''); }} />

          {/* Sliding sheet container */}
          <div className={`max-h-[75vh] flex flex-col rounded-t-3xl border-t shadow-2xl z-50 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-900'
          }`}>
            
            {/* Grabber bar */}
            <div className="flex justify-center py-3 shrink-0">
              <div className={`w-12 h-1.5 rounded-full ${isLight ? 'bg-zinc-300' : 'bg-zinc-800'}`} />
            </div>

            {/* Title & Close */}
            <div className="px-5 pb-3 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black uppercase tracking-wider">Moneda del Taller</h3>
              <button 
                type="button" 
                onClick={() => { setShowCurrencySheet(false); setCurrencySearch(''); }}
                className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 pb-4 shrink-0">
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
                isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-zinc-950 border-zinc-900 text-white'
              }`}>
                <Search className="w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar moneda o código..." 
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-inherit"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1.5">
              {filteredCurrencies.length === 0 ? (
                <p className="text-center text-xs opacity-50 py-8 italic">No se encontraron resultados.</p>
              ) : (
                filteredCurrencies.map((curr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setCurrencyCode(curr.code); setShowCurrencySheet(false); setCurrencySearch(''); }}
                    className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                      currencyCode === curr.code 
                        ? 'border-violet-500 bg-violet-500/10' 
                        : isLight 
                          ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800' 
                          : 'border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900/80 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{curr.flag}</span>
                      <div>
                        <span className="block text-sm font-bold leading-tight">{curr.name}</span>
                        <span className="text-[10px] opacity-75 font-mono">{curr.code}</span>
                      </div>
                    </div>
                    <span className="bg-violet-500/10 text-violet-400 px-2 py-1 rounded text-xs font-mono font-black border border-violet-500/20">
                      {curr.symbol}
                    </span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Leaf icon for Eco Mode
function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18C7.5 3 4 6.5 4 11s3.5 8 8 8m0-16c4.5 0 8 3.5 8 8s-3.5 8-8 8" />
    </svg>
  );
}
