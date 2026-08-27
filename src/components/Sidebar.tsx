/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ActiveTab, WorkshopConfig, AppUser } from '../types';
import { RecargasCustomIcon } from './icons/RecargasCustomIcon';
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  Tags,
  ShoppingCart,
  History,
  Package,
  Users,
  Scissors,
  TrendingDown,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Ticket,
  Printer,
  Settings,
  Store,
  ChevronDown,
  ChevronUp,
  Wrench,
  Truck,
  Smartphone,
  PieChart,
  FileText,
  CreditCard,
  Barcode as BarcodeIcon,
  BookOpen,
  Coins
} from 'lucide-react';

const EtiquetasIllustration = ({ size = 32, mono = false }: { size?: number; mono?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Etiqueta / sticker de fondo */}
    <rect x="2" y="4" width="28" height="22" rx="3" fill={mono ? 'none' : '#f1f5f9'} stroke={mono ? 'currentColor' : '#64748b'} strokeWidth={mono ? 1.0 : 1.3} />
    {/* Doblez esquina superior derecha */}
    <path d="M24 4 L30 10 L24 10 Z" fill={mono ? 'none' : '#cbd5e1'} stroke={mono ? 'currentColor' : '#64748b'} strokeWidth="1" strokeLinejoin="round" opacity={mono ? 0.35 : 1} />
    {/* Barras del código — más delgadas y espaciadas si es mono para evitar efecto 'negrita' */}
    <rect x="6"  y="8.5"  width={mono ? 0.9 : 1.2} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="9.5" y="8.5" width={mono ? 0.9 : 1.0} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="12"  y="8.5" width={mono ? 0.9 : 1.5} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="15"  y="8.5" width={mono ? 0.9 : 1.0} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="17.5" y="8.5" width={mono ? 0.9 : 1.2} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="20"  y="8.5" width={mono ? 0.9 : 1.0} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="22.5" y="8.5" width={mono ? 0.9 : 1.5} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    <rect x="25"  y="8.5" width={mono ? 0.9 : 1.0} height="11" fill={mono ? 'currentColor' : '#0f172a'} />
    {/* Línea de escaneo roja */}
    <line x1="4" y1="14" x2="28" y2="14" stroke={mono ? 'currentColor' : '#ef4444'} strokeWidth="1" strokeDasharray="2 1" opacity={mono ? 0.25 : 0.7} />
    {/* Número bajo el código */}
    <line x1="6" y1="22" x2="26" y2="22" stroke={mono ? 'currentColor' : '#94a3b8'} strokeWidth="1" strokeDasharray="2 2" opacity={mono ? 0.3 : 0.8} />
    {/* Etiqueta de precio — badge amarillo */}
    <circle cx="26" cy="23" r="3.5" fill={mono ? 'none' : '#fbbf24'} stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1" opacity={mono ? 0.5 : 1} />
    <line x1="24" y1="23" x2="28" y2="23" stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1" strokeLinecap="round" opacity={mono ? 0.5 : 1} />
    <line x1="26" y1="21" x2="26" y2="25" stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1" strokeLinecap="round" opacity={mono ? 0.5 : 1} />
  </svg>
);

const CortesIllustration = ({ size = 32, mono = false }: { size?: number; mono?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cuerpo principal de la caja registradora */}
    <rect x="3" y="15" width="26" height="13" rx="2.5" fill={mono ? 'none' : '#a8bdd4'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.4"/>
    {/* Panel superior / cabina */}
    <rect x="6" y="10" width="20" height="7" rx="2" fill={mono ? 'none' : '#bfcfe0'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.3"/>
    {/* Pantalla display azul */}
    <rect x="14" y="12" width="9" height="3.5" rx="1" fill={mono ? 'none' : '#6ab0e8'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.1"/>
    {/* Ticket amarillo saliendo */}
    <rect x="7" y="5" width="6" height="9" rx="1" fill={mono ? 'none' : '#fde68a'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.2"/>
    {/* Líneas del ticket */}
    <line x1="8.5" y1="7.5"  x2="11.5" y2="7.5"  stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="0.9" strokeLinecap="round"/>
    <line x1="8.5" y1="9"    x2="11.5" y2="9"    stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="0.9" strokeLinecap="round"/>
    <line x1="8.5" y1="10.5" x2="11.5" y2="10.5" stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="0.9" strokeLinecap="round"/>
    {/* Teclado / teclas — área verde */}
    <rect x="5" y="17.5" width="22" height="8" rx="1.5" fill={mono ? 'none' : '#7ecab8'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.1"/>
    {/* Filas de teclas */}
    {[19.5, 21.5, 23.5].map((y, ri) =>
      [7, 11, 15, 19, 23].map((x, ci) => (
        <rect key={`${ri}-${ci}`} x={x} y={y} width="3" height="1.2" rx="0.4"
          fill={mono ? 'none' : '#2d3a52'} stroke="none" opacity="0.55"/>
      ))
    )}
    {/* Cajón inferior */}
    <rect x="8" y="26.5" width="16" height="1.8" rx="0.8" fill={mono ? 'none' : '#8fa8be'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.1"/>
    {/* Display superior (pantalla roja) */}
    <rect x="10" y="2" width="12" height="5" rx="1.5" fill={mono ? 'none' : '#bfcfe0'} stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.2"/>
    <rect x="11.5" y="3" width="9" height="2.5" rx="0.8" fill={mono ? 'none' : '#ef8080'} stroke="none"/>
    {/* Poste del display */}
    <line x1="16" y1="7" x2="16" y2="10" stroke={mono ? 'currentColor' : '#2d3a52'} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const ReportesIllustration = ({ size = 32, mono = false }: { size?: number; mono?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Documento */}
    <rect x="10" y="2" width="16" height="20" rx="1.5" fill={mono ? 'none' : '#fde68a'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.4"/>
    {/* Doblez esquina */}
    <path d="M22 2 L26 6 L22 6 Z" fill={mono ? 'none' : '#fbbf24'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.2" strokeLinejoin="round"/>
    {/* Líneas de texto */}
    <line x1="13" y1="10" x2="23" y2="10" stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="13" y1="13" x2="23" y2="13" stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="13" y1="16" x2="20" y2="16" stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.3" strokeLinecap="round"/>
    {/* Pie chart — superpuesto a la izquierda */}
    <circle cx="11" cy="20" r="8" fill={mono ? 'none' : '#fde68a'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.4"/>
    {/* Sector rojo ~30% */}
    <path d="M11 20 L11 12 A8 8 0 0 1 18.9 24.4 Z" fill={mono ? 'none' : '#ef4444'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.1" strokeLinejoin="round"/>
    {/* Sector verde ~40% */}
    <path d="M11 20 L18.9 24.4 A8 8 0 0 1 3.1 24.4 Z" fill={mono ? 'none' : '#22c55e'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.1" strokeLinejoin="round"/>
    {/* Sector amarillo resto */}
    <path d="M11 20 L3.1 24.4 A8 8 0 0 1 11 12 Z" fill={mono ? 'none' : '#eab308'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.1" strokeLinejoin="round"/>
    {/* Insignia check */}
    <circle cx="22" cy="26" r="4.5" fill={mono ? 'none' : '#bae6fd'} stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.3"/>
    <path d="M19.5 26 L21.3 27.8 L24.5 24.5" stroke={mono ? 'currentColor' : '#1a1a1a'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BillEntrada = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Billete */}
    <rect x="1" y="9" width="22" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <line x1="1" y1="12.5" x2="4" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="20" y1="12.5" x2="23" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="1" y1="18.5" x2="4" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="20" y1="18.5" x2="23" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
    {/* Flecha desde arriba hacia el billete — dinero entrando */}
    <path d="M12 1 L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 5.5 L12 9 L15 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BillSalida = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Billete */}
    <rect x="1" y="9" width="22" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <line x1="1" y1="12.5" x2="4" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="20" y1="12.5" x2="23" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="1" y1="18.5" x2="4" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
    <line x1="20" y1="18.5" x2="23" y2="18.5" stroke="currentColor" strokeWidth="1.3"/>
    {/* Flecha desde el billete hacia arriba — dinero saliendo */}
    <path d="M12 9 L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 5.5 L12 1 L15 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: WorkshopConfig;
  appVersion?: string;
  pendingUpdateVersion?: string | null;
  isCajaOpen?: boolean;
  lowStockCount?: number;
  currentUser?: AppUser | null;
  onOpenMovimiento?: (type: 'entrada' | 'salida') => void;
  licenseStatus?: 'checking' | 'active' | 'trial' | 'none' | 'invalid' | 'expired';
  licenseInfo?: Record<string, unknown> | null;
  onManageLicense?: () => void;
  isSendingPromos?: boolean;
  sendingCurrentIndex?: number;
  sendingTotal?: number;
}

const renderTabIllustration = (tabId: string, size: number = 22, mono: boolean = false) => {
  switch (tabId) {
    case 'POS':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          🛒
        </span>
      );
    case 'Nueva':
      return (
        <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="5" width="18" height="19" rx="2" fill={mono ? 'none' : '#e0e7ff'} stroke={mono ? 'currentColor' : '#3730a3'} strokeWidth="1.3"/>
          <rect x="9" y="3" width="8" height="3.5" rx="1.2" fill={mono ? 'none' : '#a5b4fc'} stroke={mono ? 'currentColor' : '#3730a3'} strokeWidth="1.1"/>
          <line x1="13" y1="10" x2="13" y2="18" stroke={mono ? 'currentColor' : '#3730a3'} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="9" y1="14" x2="17" y2="14" stroke={mono ? 'currentColor' : '#3730a3'} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case 'Ventas':
      return (
        <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="16" height="20" rx="1.5" fill={mono ? 'none' : '#d1fae5'} stroke={mono ? 'currentColor' : '#065f46'} strokeWidth="1.3"/>
          <path d="M5 20 Q6.5 21.5 8 20 Q9.5 21.5 11 20 Q12.5 21.5 14 20 Q15.5 21.5 17 20 Q18.5 21.5 20 20 L20 23 L5 23 Z" fill={mono ? 'none' : '#d1fae5'} stroke={mono ? 'currentColor' : '#065f46'} strokeWidth="1.1"/>
          <line x1="8" y1="8"  x2="18" y2="8"  stroke={mono ? 'currentColor' : '#065f46'} strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="11" x2="18" y2="11" stroke={mono ? 'currentColor' : '#065f46'} strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="14" x2="14" y2="14" stroke={mono ? 'currentColor' : '#065f46'} strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="15" y1="14" x2="18" y2="14" stroke={mono ? 'currentColor' : '#16a34a'} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      );
    case 'Órdenes':
      return (
        <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 9 Q2 7 4 7 L10 7 L12 5 L22 5 Q24 5 24 7 L24 21 Q24 23 22 23 L4 23 Q2 23 2 21 Z" fill={mono ? 'none' : '#fef3c7'} stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1.3"/>
          <path d="M2 9 L24 9" stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1.1"/>
          <path d="M11 13 Q10 11 12 11 Q14 11 14 13 L16 15 L15 16 L13 14 Q11 15 11 13Z" fill={mono ? 'none' : '#f59e0b'} stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="0.9"/>
          <line x1="15" y1="16" x2="18" y2="19" stroke={mono ? 'currentColor' : '#92400e'} strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="18.5" cy="19.5" r="1" fill={mono ? 'currentColor' : '#92400e'}/>
        </svg>
      );
    case 'Cotizaciones':
      return (
        <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="16" height="20" rx="2" fill={mono ? 'none' : '#ede9fe'} stroke={mono ? 'currentColor' : '#5b21b6'} strokeWidth="1.3"/>
          <rect x="7.5" y="5.5" width="11" height="5" rx="1" fill={mono ? 'none' : '#c4b5fd'} stroke={mono ? 'currentColor' : '#5b21b6'} strokeWidth="0.9"/>
          <text x="13" y="9.5" textAnchor="middle" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill={mono ? 'currentColor' : '#5b21b6'}>$0.00</text>
          {[13,16,19].map((y,ri) => [8,12,16].map((x,ci) => (
            <rect key={`${ri}-${ci}`} x={x} y={y} width="3" height="2" rx="0.6"
              fill={ri===2&&ci===2?(mono ? 'currentColor' : '#7c3aed'):(mono ? 'none' : '#ddd6fe')} stroke={mono ? 'currentColor' : '#5b21b6'} strokeWidth="0.7"/>
          )))}
        </svg>
      );
    case 'Precios':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          🏷️
        </span>
      );
    case 'Equipos':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          📱
        </span>
      );
    case 'Stock':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          📦
        </span>
      );
    case 'Cortes':
      return <CortesIllustration size={size} mono={mono} />;
    case 'Reportes':
      return <ReportesIllustration size={size} mono={mono} />;
    case 'Clientes':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans mt-0.5" style={{ fontSize: `${size}px` }}>
          🧑‍💼
        </span>
      );
    case 'Catalogo':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          📖
        </span>
      );
    case 'Gastos':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          👛
        </span>
      );
    case 'Reabastecer':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          🚚
        </span>
      );
    case 'Etiquetas':
      return <EtiquetasIllustration size={size} mono={mono} />;
    case 'Fiados':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          💰
        </span>
      );
    case 'Refacciones':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          🛠️
        </span>
      );
    case 'Donantes':
      return (
        <span className="select-none leading-none filter drop-shadow-sm font-sans" style={{ fontSize: `${size}px` }}>
          🔩
        </span>
      );
    case 'Recargas':
      return (
        <RecargasCustomIcon className="filter drop-shadow-sm" size={size} />
      );
    default:
      return null;
  }
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  config,
  appVersion = '1.0',
  pendingUpdateVersion = null,
  isCajaOpen = true,
  lowStockCount = 0,
  currentUser,
  onOpenMovimiento,
  licenseStatus,
  licenseInfo,
  onManageLicense,
  isSendingPromos = false,
  sendingCurrentIndex = 0,
  sendingTotal = 0,
}: SidebarProps) {
  const primaryColor = config.primaryColor;
  const isLight = config.themeMode === 'light';

  const [showHiddenMenu, setShowHiddenMenu] = useState(false);

  const isTiendaTab = ['POS', 'Recargas', 'Ventas', 'Stock', 'Reabastecer', 'Etiquetas'].includes(activeTab);
  const isServiciosTab = ['Nueva', 'Órdenes', 'Cotizaciones', 'Precios', 'Refacciones', 'Equipos', 'Clientes', 'Catalogo', 'Donantes'].includes(activeTab);

  // Core transactional modules restricted when Caja is closed
  const restrictedModules = ['POS', 'Recargas', 'Nueva', 'Ventas', 'Cortes', 'Gastos'];

  const tabsConfig: { id: ActiveTab; label: string; icon: React.ComponentType<any>; color: string }[] = [
    { id: 'POS', label: 'POS', icon: ShoppingCart, color: 'text-yellow-500' },
    { id: 'Recargas', label: 'Recargas', icon: Smartphone, color: 'text-amber-500' },
    { id: 'Ventas', label: 'Ventas', icon: History, color: 'text-emerald-400' },
    { id: 'Fiados', label: 'Créditos', icon: Coins, color: 'text-orange-400' },
    { id: 'Stock', label: 'Inventario', icon: Package, color: 'text-amber-600' },
    { id: 'Reabastecer', label: 'Abasto', icon: Truck, color: 'text-amber-500' },
    { id: 'Etiquetas', label: 'Etiquetas', icon: BarcodeIcon, color: 'text-yellow-400' },
    { id: 'Nueva', label: 'Nueva', icon: FilePlus, color: 'text-emerald-500' },
    { id: 'Órdenes', label: 'Órdenes', icon: ClipboardList, color: 'text-sky-500' },
    { id: 'Cotizaciones', label: 'Cotizac.', icon: FileText, color: 'text-violet-400' },
    { id: 'Precios', label: 'Precios', icon: Tags, color: 'text-amber-500' },
    { id: 'Refacciones', label: 'Refacciones', icon: Wrench, color: 'text-sky-400' },
    { id: 'Donantes', label: 'Donantes', icon: Smartphone, color: 'text-teal-400' },
    { id: 'Equipos', label: 'Equipos', icon: Smartphone, color: 'text-cyan-500' },
    { id: 'Clientes', label: 'Clientes', icon: Users, color: 'text-purple-400' },
    { id: 'Catalogo', label: 'Catálogo', icon: BookOpen, color: 'text-indigo-400' },
    { id: 'Cortes', label: 'Cortes', icon: Scissors, color: 'text-pink-500' },
    { id: 'Gastos', label: 'Movimientos', icon: ArrowUpDown, color: 'text-sky-400' },
    { id: 'Reportes', label: 'Reportes', icon: PieChart, color: 'text-violet-400' }
  ];

  // Filtra pestañas según permisos del usuario activo
  const isTabAllowed = (tabId: ActiveTab): boolean => {
    if (!currentUser) return true; // sin usuario cargado, no bloquear
    const p = currentUser.permissions;
    if (tabId === 'Reabastecer') return p.canRestockItems;
    if (tabId === 'Reportes') return p.canViewReports;
    if (tabId === 'Config') return p.canAccessConfig;
    if (tabId === 'Stock') return p.canEditStock;
    if (tabId === 'Nueva') return p.canManageOrders;
    if (tabId === 'Donantes') return p.canEditStock || p.canManageOrders;
    return true;
  };

  const isTabVisible = (tabId: string): boolean => {
    if (tabId === 'Recargas' && config.taecelEnabled !== true) {
      return false;
    }
    return !config.hiddenModules?.includes(tabId);
  };

  const visibleTabsConfig = tabsConfig.filter(t => isTabAllowed(t.id) && isTabVisible(t.id));

  const allowedHiddenTabs = tabsConfig.filter(t => config.hiddenModules?.includes(t.id) && isTabAllowed(t.id));
  const hasHiddenTabs = allowedHiddenTabs.length > 0;

  const tabsBeforeGroup: typeof tabsConfig = [];
  const tabsAfterGroup = visibleTabsConfig.filter(t => ['Cortes', 'Gastos', 'Reportes'].includes(t.id));

  const getColorClasses = (tabId: ActiveTab) => {
    const isActive = activeTab === tabId;
    if (isActive) {
      if (isLight) {
        if (primaryColor === 'blue') return 'bg-cyan-500/10 border-l-4 border-cyan-600 text-cyan-800 shadow-[inset_0_0_12px_rgba(8,145,178,0.05)] font-bold';
        if (primaryColor === 'green') return 'bg-emerald-500/10 border-l-4 border-emerald-600 text-emerald-800 shadow-[inset_0_0_12px_rgba(5,150,105,0.05)] font-bold';
        if (primaryColor === 'yellow') return 'bg-yellow-500/10 border-l-4 border-yellow-600 text-yellow-800 shadow-[inset_0_0_12px_rgba(202,138,4,0.05)] font-bold';
        if (primaryColor === 'indigo') return 'bg-indigo-500/10 border-l-4 border-indigo-600 text-indigo-800 shadow-[inset_0_0_12px_rgba(79,70,229,0.05)] font-bold';
        return 'bg-red-500/10 border-l-4 border-red-600 text-red-800 shadow-[inset_0_0_12px_rgba(220,38,38,0.05)] font-bold';
      } else {
        if (primaryColor === 'blue') return 'bg-cyan-500/20 border-l-4 border-cyan-400 text-cyan-300 shadow-[inset_0_0_12px_rgba(34,211,238,0.08)]';
        if (primaryColor === 'green') return 'bg-emerald-500/20 border-l-4 border-emerald-400 text-emerald-300 shadow-[inset_0_0_12px_rgba(52,211,153,0.08)]';
        if (primaryColor === 'yellow') return 'bg-yellow-500/20 border-l-4 border-yellow-400 text-yellow-300 shadow-[inset_0_0_12px_rgba(234,179,8,0.08)]';
        if (primaryColor === 'indigo') return 'bg-indigo-500/20 border-l-4 border-indigo-400 text-indigo-300 shadow-[inset_0_0_12px_rgba(129,140,248,0.08)]';
        return 'bg-red-500/20 border-l-4 border-red-400 text-red-300 shadow-[inset_0_0_12px_rgba(239,68,68,0.08)]';
      }
    }
    return isLight 
      ? 'text-slate-600 border-l-4 border-transparent hover:text-slate-950 hover:bg-slate-200/50 transition-all duration-200'
      : 'text-gray-400 border-l-4 border-transparent hover:text-white hover:bg-zinc-900/40 transition-all duration-200';
  };

  const getSubTabClasses = (tabId: ActiveTab, activeColorBorder: string, activeColorText: string, activeColorBg: string) => {
    const isActive = activeTab === tabId;
    if (isActive) {
      let textCls = activeColorText;
      let bgCls = activeColorBg;
      if (isLight) {
        if (textCls.includes('text-yellow-') || textCls.includes('text-amber-')) textCls = 'text-amber-800 font-bold';
        else if (textCls.includes('text-emerald-')) textCls = 'text-emerald-800 font-bold';
        else if (textCls.includes('text-orange-')) textCls = 'text-orange-850 font-bold';
        else if (textCls.includes('text-sky-') || textCls.includes('text-blue-')) textCls = 'text-sky-800 font-bold';
        else if (textCls.includes('text-violet-') || textCls.includes('text-purple-')) textCls = 'text-purple-800 font-bold';
        
        if (bgCls.includes('/10')) bgCls = bgCls.replace('/10', '/15');
      }
      return `flex flex-col items-center justify-center py-1 text-center cursor-pointer transition-all border-l-[3px] ${activeColorBorder} ${textCls} ${bgCls} font-bold`;
    }
    return isLight
      ? `flex flex-col items-center justify-center py-1 text-center cursor-pointer transition-all border-l-[3px] border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/40`
      : `flex flex-col items-center justify-center py-1 text-center cursor-pointer transition-all border-l-[3px] border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#111215]/40`;
  };

  const renderDefaultTab = (tabId: ActiveTab) => {
    const tab = tabsConfig.find(t => t.id === tabId);
    if (!tab) return null;
    if (!isTabAllowed(tabId)) return null;
    if (!isTabVisible(tabId)) return null;
    const Icon = tab.icon;
    const isDisabled = !isCajaOpen && restrictedModules.includes(tabId);
    return (
      <button
        key={tab.id}
        onClick={() => { if (!isDisabled) setActiveTab(tab.id); }}
        className={isDisabled
          ? "flex flex-col items-center justify-center py-2.5 my-0.5 w-full text-center text-zinc-600 opacity-35 grayscale cursor-not-allowed select-none border-l-4 border-transparent"
          : `flex flex-col items-center justify-center py-2.5 my-0.5 w-full text-center cursor-pointer ${getColorClasses(tab.id)}`
        }
        title={isDisabled ? `${tab.label} (Requiere Apertura de Caja)` : tab.label}
        id={`sidebar-tab-${tab.id.toLowerCase()}`}
        disabled={isDisabled}
      >
        <div className="p-1">
          {renderTabIllustration(tab.id, 20, activeTab !== tab.id)}
        </div>
        <span className="text-[10px] md:text-[11px] font-sans mt-1 tracking-wide font-medium">
          {tab.label} {isDisabled && '🔒'}
        </span>
      </button>
    );
  };

  const [isTiendaMoreExpanded, setIsTiendaMoreExpanded] = useState(false);
  const [isServiciosMoreExpanded, setIsServiciosMoreExpanded] = useState(false);

  useEffect(() => {
    if (['Fiados', 'Stock', 'Reabastecer', 'Etiquetas'].includes(activeTab)) {
      setIsTiendaMoreExpanded(true);
    }
    if (['Precios', 'Refacciones', 'Equipos', 'Catalogo', 'Donantes'].includes(activeTab)) {
      setIsServiciosMoreExpanded(true);
    }
  }, [activeTab]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrollBelow, setHasScrollBelow] = useState(false);
  const [hasScrollAbove, setHasScrollAbove] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setHasScrollBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
      setHasScrollAbove(el.scrollTop > 4);
    };
    const t = setTimeout(check, 100);
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { clearTimeout(t); el.removeEventListener('scroll', check); ro.disconnect(); };
  }, []);

  if (config.theme === 'retro-window') {
    const getBadgeBg = (id: string) => {
      switch (id) {
        case 'POS': return 'bg-gradient-to-br from-[#0c82df] to-[#043380]';
        case 'Recargas': return 'bg-gradient-to-br from-amber-500 to-yellow-600';
        case 'Ventas': return 'bg-gradient-to-br from-[#16a34a] to-[#15803d]';
        case 'Fiados': return 'bg-gradient-to-br from-orange-500 to-orange-700';
        case 'Stock': return 'bg-gradient-to-br from-[#eab308] to-[#ca8a04]';
        case 'Nueva': return 'bg-gradient-to-br from-indigo-500 to-indigo-700';
        case 'Órdenes': return 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]';
        case 'Cotizaciones': return 'bg-gradient-to-br from-violet-500 to-purple-600';
        case 'Precios': return 'bg-gradient-to-br from-purple-500 to-fuchsia-600';
        case 'Refacciones': return 'bg-gradient-to-br from-sky-400 to-indigo-650';
        case 'Equipos': return 'bg-gradient-to-br from-cyan-500 to-sky-600';
        case 'Clientes': return 'bg-gradient-to-br from-rose-500 to-pink-600';
        case 'Catalogo': return 'bg-gradient-to-br from-indigo-400 to-blue-600';
        case 'Cortes': return 'bg-gradient-to-br from-pink-500 to-rose-600';
        case 'Gastos': return 'bg-gradient-to-br from-slate-500 to-zinc-600';
        case 'Reabastecer': return 'bg-gradient-to-br from-[#f59e0b] to-[#d97706]';
        case 'Etiquetas': return 'bg-gradient-to-br from-yellow-400 to-amber-500';
        default: return 'bg-blue-600';
      }
    };

    const getRetroIllustration = (tabId: string) => {
      return (
        <div className="relative w-8 h-8 flex items-center justify-center bg-[#fafafa] border border-zinc-200 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105 overflow-hidden">
          {renderTabIllustration(tabId, tabId === 'Clientes' ? 18 : 22, false)}
          {tabId === 'POS' && <span className="absolute bottom-1 right-1.5 text-[7px] z-20 leading-none animate-bounce">🪙</span>}
          {tabId === 'Precios' && <span className="absolute bottom-1 right-1 text-[9px] z-20">💵</span>}
          {tabId === 'Equipos' && <span className="absolute bottom-1 right-1 text-[9px] z-20">🔍</span>}
          {tabId === 'Catalogo' && <span className="absolute bottom-1 right-1 text-[9px] z-20">🏷️</span>}
          {tabId === 'Gastos' && <span className="absolute bottom-1 right-1 text-[9px] z-20">💵</span>}
          {tabId === 'Reabastecer' && <span className="absolute bottom-1 right-1 text-[9px] z-20">📦</span>}
                  {tabId === 'Stock' && lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none z-20 border border-white shadow">
              {lowStockCount > 99 ? '99+' : lowStockCount}
            </span>
          )}
        </div>
      );
    };

    const renderRetroTab = (tabId: ActiveTab) => {
      const tab = tabsConfig.find(t => t.id === tabId);
      if (!tab) return null;
      if (!isTabAllowed(tabId)) return null;
      if (!isTabVisible(tabId)) return null;
      const isTabActive = activeTab === tab.id;
      const isClientesPromo = tab.id === 'Clientes' && isSendingPromos && sendingTotal > 0;
      const labelText = isClientesPromo 
        ? `${tab.label} (${Math.round((sendingCurrentIndex / sendingTotal) * 100)}%)`
        : tab.label;
      const isDisabled = !isCajaOpen && restrictedModules.includes(tabId);

      return (
        <button
          type="button"
          key={tab.id}
          onClick={() => {
            if (!isDisabled) {
              setActiveTab(tab.id);
            }
          }}
          className={`w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all border outline-none group relative overflow-hidden ${
            isDisabled
              ? 'bg-[#d2d6dc] border-2 border-dashed border-zinc-400 text-zinc-400 opacity-50 grayscale cursor-not-allowed select-none'
              : isTabActive
                ? 'bg-white border-2 border-[#1e40af] text-[#031124] shadow-lg ring-2 ring-blue-500/40 scale-[1.05] cursor-pointer'
                : 'bg-white hover:bg-[#fafafa] border-zinc-300 hover:border-zinc-400 text-zinc-800 shadow-sm cursor-pointer'
          }`}
          title={isDisabled ? `${tab.label} (Deshabilitado: Requiere Apertura de Caja)` : tab.label}
          id={`sidebar-test-${tab.id.toLowerCase()}`}
          disabled={isDisabled}
        >
          <div className={isDisabled ? 'grayscale opacity-30' : ''}>
            {getRetroIllustration(tab.id)}
          </div>
          <span className={`text-[8.5px] font-sans font-black mt-1 leading-none uppercase truncate w-full text-center tracking-tight ${isDisabled ? 'text-zinc-500' : isTabActive ? 'text-blue-700 font-extrabold' : 'text-zinc-500'}`}>
            {labelText} {isDisabled && '🔒'}
          </span>
          {isClientesPromo && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 transition-all duration-300"
              style={{ width: `${(sendingCurrentIndex / sendingTotal) * 100}%` }}
            />
          )}
        </button>
      );
    };

    return (
      <aside className="w-full md:w-24 select-none shrink-0 h-full border-r border-[#c1c9d4] bg-[#f0f2f5] flex flex-col shadow-[inset_-3px_0_6px_rgba(0,0,0,0.02)] relative overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-1.5 px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-1.5">
            {config.enablePOS !== false && (
              <div className={`border-2 rounded-xl p-1 flex flex-col gap-1 shadow-inner ${
                isLight ? 'border-amber-400 bg-[#fef5d6]' : 'border-amber-900/40 bg-amber-950/20'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsTiendaMoreExpanded(!isTiendaMoreExpanded)}
                  className={`w-full flex items-center justify-center gap-1 py-0.5 text-[7.5px] font-sans font-black tracking-wider text-center uppercase rounded transition-colors cursor-pointer outline-none ${
                    isLight ? 'text-amber-800 hover:bg-amber-200/40' : 'text-amber-450 hover:bg-white/[0.04]'
                  }`}
                >
                ✦ TIENDA ✦ {isTiendaMoreExpanded ? '▲' : '[+4] ▼'}
                </button>
                {renderRetroTab('POS')}
                {renderRetroTab('Ventas')}
                {isTiendaMoreExpanded && (
                  <>
                    {renderRetroTab('Fiados')}
                    {renderRetroTab('Stock')}
                    {renderRetroTab('Reabastecer')}
                    {renderRetroTab('Etiquetas')}
                  </>
                )}
              </div>
            )}
            {config.enableTaller !== false && (
              <div className={`border-2 rounded-xl p-1 flex flex-col gap-1 shadow-inner ${
                isLight ? 'border-blue-400 bg-[#dbeafe]' : 'border-blue-900/40 bg-blue-950/20'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsServiciosMoreExpanded(!isServiciosMoreExpanded)}
                  className={`w-full flex items-center justify-center gap-1 py-0.5 text-[7.5px] font-sans font-black tracking-wider text-center uppercase rounded transition-colors cursor-pointer outline-none ${
                    isLight ? 'text-blue-800 hover:bg-blue-200/40' : 'text-blue-450 hover:bg-white/[0.04]'
                  }`}
                >
                  ✦ SERVICIO ✦ {isServiciosMoreExpanded ? '▲' : '[+4] ▼'}
                </button>
                {renderRetroTab('Nueva')}
                {renderRetroTab('Órdenes')}
                {renderRetroTab('Cotizaciones')}
                {isServiciosMoreExpanded && (
                  <>
                    {renderRetroTab('Precios')}
                    {renderRetroTab('Refacciones')}
                    {renderRetroTab('Donantes')}
                    {renderRetroTab('Equipos')}
                    {renderRetroTab('Catalogo')}
                  </>
                )}
              </div>
            )}
            {/* Entrada / Salida — retro */}
            {(['entrada', 'salida'] as const).filter(type => isTabVisible(type === 'entrada' ? 'Entrada' : 'Salida')).map(type => {
              const isEntrada = type === 'entrada';
              const isDisabled = !isCajaOpen;
              return (
                <button key={type} onClick={() => { if (!isDisabled && onOpenMovimiento) onOpenMovimiento(type); }} disabled={isDisabled}
                  title={isDisabled ? `${isEntrada ? 'Entrada' : 'Salida'} (Requiere Apertura de Caja)` : isEntrada ? 'Registrar entrada de efectivo' : 'Registrar salida de efectivo'}
                  className={`flex flex-col items-center py-1.5 px-1 w-full text-center cursor-pointer transition-all ${isDisabled ? 'opacity-35 cursor-not-allowed grayscale' : isEntrada ? 'hover:bg-emerald-50' : 'hover:bg-rose-50'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-0.5 border-2 ${isDisabled ? 'border-zinc-300 bg-zinc-100' : isEntrada ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                    {isEntrada ? <BillEntrada className="w-6 h-6 text-emerald-600" /> : <BillSalida className="w-6 h-6 text-rose-600" />}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wide ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}`}>{isEntrada ? 'Entrada' : 'Salida'}</span>
                </button>
              );
            })}
            {renderRetroTab('Cortes')}
            {renderRetroTab('Reportes')}

            {/* Ocultos - Retro Theme */}
            {hasHiddenTabs && (
              <div className="border-t-2 border-zinc-400 mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('Config');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('fm-go-to-modules-config'));
                    }, 80);
                  }}
                  className="flex flex-col items-center py-1.5 px-1 w-full text-center cursor-pointer transition-all border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white"
                  title="Administrar módulos ocultos"
                >
                  <span className="text-base mb-0.5">👁️‍🗨️</span>
                  <span className="text-[9px] font-black uppercase tracking-wide">Ocultos</span>
                </button>
              </div>
            )}
          </div>
        </div>

        </div>{/* cierre div scroll interno */}
        {hasScrollAbove && (
          <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none bg-gradient-to-b from-[#f0f2f5] to-transparent flex items-start justify-center pt-1">
            <ChevronUp className="w-4 h-4 text-zinc-500 animate-bounce" />
          </div>
        )}
        {hasScrollBelow && (
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none bg-gradient-to-t from-[#f0f2f5] to-transparent flex items-end justify-center pb-1">
            <ChevronDown className="w-4 h-4 text-zinc-500 animate-bounce" />
          </div>
        )}
      </aside>
    );
  }

  if (config.theme === 'fluent') {
    const isLight = config.themeMode === 'light';

    const getFluentTabColor = (tabId: ActiveTab) => {
      const map: Partial<Record<ActiveTab, { bg: string; text: string; icon: string }>> = {
        POS:      { bg: 'bg-yellow-50',  text: 'text-yellow-700',  icon: 'text-yellow-500' },
        Recargas: { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-500' },
        Ventas:   { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
        Stock:    { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-600' },
        Reabastecer: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' },
        Etiquetas: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
        Nueva:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'text-indigo-500' },
        Órdenes:  { bg: 'bg-sky-50',     text: 'text-sky-700',     icon: 'text-sky-500' },
        Cotizaciones: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500' },
        Precios:  { bg: 'bg-purple-50',  text: 'text-purple-700',  icon: 'text-purple-500' },
        Refacciones: { bg: 'bg-sky-50',  text: 'text-sky-700',     icon: 'text-sky-500' },
        Equipos:  { bg: 'bg-cyan-50',    text: 'text-cyan-700',    icon: 'text-cyan-500' },
        Clientes: { bg: 'bg-pink-50',    text: 'text-pink-700',    icon: 'text-pink-500' },
        Cortes:   { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: 'text-rose-500' },
        Gastos:   { bg: 'bg-slate-50',   text: 'text-slate-700',   icon: 'text-slate-500' },
        Reportes: { bg: 'bg-violet-50',  text: 'text-violet-700',  icon: 'text-violet-500' },
      };
      return map[tabId] ?? { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' };
    };

    const renderFluentTab = (tab: typeof tabsConfig[number]) => {
      if (!isTabAllowed(tab.id)) return null;
      if (!isTabVisible(tab.id)) return null;
      const isActive = activeTab === tab.id;
      const isDisabled = !isCajaOpen && restrictedModules.includes(tab.id);
      const colors = getFluentTabColor(tab.id);
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => { if (!isDisabled) setActiveTab(tab.id); }}
          disabled={isDisabled}
          title={isDisabled ? `${tab.label} (Requiere Apertura de Caja)` : tab.label}
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all outline-none group relative
            ${isDisabled ? 'opacity-35 grayscale cursor-not-allowed' : 'cursor-pointer'}
            ${isActive ? (isLight ? 'bg-zinc-200/60' : 'bg-white/[0.08]') : (isLight ? 'hover:bg-zinc-150' : 'hover:bg-white/[0.04]')}
          `}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-0.5 transition-all
            ${isActive ? (isLight ? 'bg-zinc-200' : 'bg-white/10') : (isLight ? 'bg-transparent group-hover:bg-zinc-100' : 'bg-transparent group-hover:bg-white/[0.06]')}
            ${isActive ? '' : 'opacity-75 grayscale-[30%]'}
          `}>
            {renderTabIllustration(tab.id, 22, !isActive)}
            {tab.id === 'Stock' && lowStockCount > 0 && (
              <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-semibold leading-none tracking-tight ${isActive ? colors.icon : (isLight ? 'text-zinc-500 group-hover:text-zinc-700' : 'text-white/40 group-hover:text-white/60')}`}>
            {tab.label}{isDisabled ? ' 🔒' : ''}
          </span>
          {isActive && (
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r ${colors.icon.replace('text-', 'bg-')}`} />
          )}
        </button>
      );
    };

    const allFluentTabs: ActiveTab[] = ['POS', 'Recargas', 'Ventas', 'Stock', 'Reabastecer', 'Etiquetas', 'Nueva', 'Órdenes', 'Cotizaciones', 'Precios', 'Equipos', 'Clientes', 'Cortes', 'Gastos', 'Reportes'];

    return (
      <aside className={`w-full md:w-24 flex flex-col select-none shrink-0 h-full border-r relative overflow-hidden ${isLight ? 'bg-[#fafafa]/95 border-zinc-200' : 'bg-[#252525]/90 border-white/[0.06]'}`}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-stretch p-2 gap-1.5">
          {config.enablePOS !== false && (
            <div className={`p-1.5 rounded-xl border-2 flex flex-col gap-1 shadow-inner transition-colors ${
              isLight ? 'bg-[#fef5d6]/70 border-amber-400/60' : 'bg-amber-950/25 border-amber-900/40'
            }`}>
              <button
                type="button"
                onClick={() => setIsTiendaMoreExpanded(!isTiendaMoreExpanded)}
                className={`w-full flex items-center justify-center gap-1 py-1 text-[7.5px] font-sans font-black tracking-wider text-center uppercase rounded transition-colors cursor-pointer outline-none mb-1 ${
                  isLight ? 'text-amber-800 hover:bg-amber-200/40' : 'text-amber-400/90 hover:bg-white/[0.04]'
                }`}
              >
                ✦ TIENDA ✦ {isTiendaMoreExpanded ? '▲' : '[+4] ▼'}
              </button>
              {(['POS', 'Ventas'] as ActiveTab[]).map(id => {
                const tab = tabsConfig.find(t => t.id === id);
                return tab ? renderFluentTab(tab) : null;
              })}
              {isTiendaMoreExpanded && (['Fiados', 'Stock', 'Reabastecer', 'Etiquetas'] as ActiveTab[]).map(id => {
                const tab = tabsConfig.find(t => t.id === id);
                return tab ? renderFluentTab(tab) : null;
              })}
            </div>
          )}

          {config.enableTaller !== false && (
            <div className={`p-1.5 rounded-xl border-2 flex flex-col gap-1 shadow-inner transition-colors ${
              isLight ? 'bg-[#dbeafe]/70 border-blue-400/60' : 'bg-blue-950/25 border-blue-900/40'
            }`}>
              <button
                type="button"
                onClick={() => setIsServiciosMoreExpanded(!isServiciosMoreExpanded)}
                className={`w-full flex items-center justify-center gap-1 py-1 text-[7.5px] font-sans font-black tracking-wider text-center uppercase rounded transition-colors cursor-pointer outline-none mb-1 ${
                  isLight ? 'text-blue-800 hover:bg-blue-200/40' : 'text-blue-400/90 hover:bg-white/[0.04]'
                }`}
              >
                ✦ SERVICIO ✦ {isServiciosMoreExpanded ? '▲' : '[+4] ▼'}
              </button>
              {(['Nueva', 'Órdenes', 'Cotizaciones'] as ActiveTab[]).map(id => {
                const tab = tabsConfig.find(t => t.id === id);
                return tab ? renderFluentTab(tab) : null;
              })}
              {isServiciosMoreExpanded && (['Precios', 'Refacciones', 'Donantes', 'Equipos', 'Catalogo'] as ActiveTab[]).map(id => {
                const tab = tabsConfig.find(t => t.id === id);
                return tab ? renderFluentTab(tab) : null;
              })}
            </div>
          )}


          {/* Entrada / Salida — fluent */}
          {(isTabVisible('Entrada') || isTabVisible('Salida')) && (
            <div className={`p-1.5 rounded-xl border ${
              isLight ? 'bg-zinc-200/20 border-zinc-200' : 'bg-white/[0.02] border-white/[0.04]'
            }`}>
              {(['entrada', 'salida'] as const).filter(type => isTabVisible(type === 'entrada' ? 'Entrada' : 'Salida')).map(type => {
                const isEntrada = type === 'entrada';
                const isDisabled = !isCajaOpen;
              return (
                <button key={type} onClick={() => { if (!isDisabled && onOpenMovimiento) onOpenMovimiento(type); }} disabled={isDisabled}
                  title={isDisabled ? `${isEntrada ? 'Entrada' : 'Salida'} (Requiere Apertura de Caja)` : isEntrada ? 'Registrar entrada de efectivo' : 'Registrar salida de efectivo'}
                  className={`flex flex-col items-center py-2 px-1 w-full text-center transition-all ${isDisabled ? 'opacity-35 cursor-not-allowed grayscale' : `cursor-pointer ${isEntrada ? (isLight ? 'hover:bg-emerald-500/10 text-emerald-600' : 'hover:bg-emerald-500/10 text-emerald-400') : (isLight ? 'hover:bg-rose-500/10 text-rose-600' : 'hover:bg-rose-500/10 text-rose-400')}`}`}>
                  <div className="p-1">
                    {isEntrada ? <BillEntrada className="w-6 h-6 opacity-80" /> : <BillSalida className="w-6 h-6 opacity-80" />}
                  </div>
                  <span className="text-[10px] md:text-[11px] font-sans mt-1 tracking-wide font-medium">
                    {isEntrada ? 'Entrada' : 'Salida'}
                  </span>
                </button>
              );
            })}
          </div>)}

          {/* Cortes — fluent */}
          <div className="mb-1">
            {(() => {
              const tab = tabsConfig.find(t => t.id === 'Cortes');
              return tab ? renderFluentTab(tab) : null;
            })()}
          </div>

          <div className={`border-t pt-1 ${isLight ? 'border-zinc-200' : 'border-white/[0.06]'}`}>
            {(() => {
              const tab = tabsConfig.find(t => t.id === 'Reportes');
              return tab ? renderFluentTab(tab) : null;
            })()}
          </div>

          {/* Ocultos - Fluent Theme */}
          {hasHiddenTabs && (
            <div className={`border-t pt-1.5 mt-1.5 ${isLight ? 'border-zinc-200' : 'border-white/[0.06]'}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('Config');
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('fm-go-to-modules-config'));
                  }, 80);
                }}
                className={`flex flex-col items-center justify-center py-2.5 w-full text-center transition-all cursor-pointer select-none rounded hover:bg-black/[0.04] ${
                  isLight ? 'text-zinc-550 hover:text-zinc-850' : 'text-white/60 hover:text-white'
                }`}
                title="Administrar módulos ocultos"
              >
                <div className="p-1">
                  <span className="text-lg">👁️‍🗨️</span>
                </div>
                <span className="text-[10px] font-sans font-medium tracking-wide">Ocultos</span>
              </button>
            </div>
          )}
        </div>
        </div>
        {hasScrollAbove && (
          <div className={`absolute top-0 left-0 right-0 h-10 pointer-events-none flex items-start justify-center pt-1 bg-gradient-to-b ${isLight ? 'from-[#fafafa] text-zinc-400' : 'from-[#252525] text-white/40'} to-transparent`}>
            <ChevronUp className="w-4 h-4 animate-bounce" />
          </div>
        )}
        {hasScrollBelow && (
          <div className={`absolute bottom-0 left-0 right-0 h-10 pointer-events-none flex items-end justify-center pb-1 bg-gradient-to-t ${isLight ? 'from-[#fafafa] text-zinc-400' : 'from-[#252525] text-white/40'} to-transparent`}>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-24 flex flex-col select-none shrink-0 h-full border-r bg-[#0a0a0c] border-[#1a1b20] relative overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-stretch pt-2">
        {tabsBeforeGroup.map((tab) => {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 my-0 text-center cursor-pointer ${getColorClasses(
                tab.id
              )}`}
              title={tab.label}
              id={`sidebar-tab-${tab.id.toLowerCase()}`}
            >
              <div className="p-1">
                {renderTabIllustration(tab.id, 20, activeTab !== tab.id)}
              </div>
              <span className="text-[10px] md:text-[11px] font-sans mt-0.5 tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Grupo Tienda (POS, Ventas, Fiados, Stock, Reabastecer, Etiquetas) - Unified styling like Retro */}
        {config.enablePOS !== false && (
          <div className="my-2 border-2 border-amber-500/30 rounded-xl p-1.5 bg-amber-950/20 flex flex-col gap-1 shadow-inner transition-colors mx-1">
            <button
              type="button"
              onClick={() => setIsTiendaMoreExpanded(!isTiendaMoreExpanded)}
              className="w-full flex items-center justify-center gap-1 py-1 text-[7.5px] font-sans font-black text-amber-450 tracking-wider text-center uppercase hover:bg-amber-500/10 rounded transition-colors cursor-pointer outline-none mb-1"
            >
              ✦ TIENDA ✦ {isTiendaMoreExpanded ? '▲' : '[+4] ▼'}
            </button>

            {/* POS */}
            {isTabVisible('POS') && (
              <button
                onClick={() => {
                  if (!isCajaOpen) return;
                  setActiveTab('POS');
                }}
                className={!isCajaOpen
                  ? "flex flex-col items-center justify-center py-1.5 text-center transition-all border-l-2 border-transparent text-zinc-600 opacity-35 grayscale cursor-not-allowed select-none"
                  : getSubTabClasses('POS', 'border-yellow-500', 'text-yellow-500', 'bg-yellow-500/10')
                }
                title={!isCajaOpen ? "POS (Deshabilitado: Requiere Apertura de Caja)" : "Punto de Venta"}
                disabled={!isCajaOpen}
              >
                {renderTabIllustration('POS', 16, activeTab !== 'POS')}
                <span className="text-[9px] font-sans mt-0.5 font-medium">POS {!isCajaOpen && '🔒'}</span>
              </button>
            )}

            {/* Ventas */}
            {isTabVisible('Ventas') && (
              <button
                onClick={() => {
                  if (!isCajaOpen) return;
                  setActiveTab('Ventas');
                }}
                className={!isCajaOpen
                  ? "flex flex-col items-center justify-center py-1.5 text-center transition-all border-l-2 border-transparent text-zinc-600 opacity-35 grayscale cursor-not-allowed select-none"
                  : getSubTabClasses('Ventas', 'border-emerald-500', 'text-emerald-400', 'bg-emerald-500/10')
                }
                title={!isCajaOpen ? "Ventas (Deshabilitado: Requiere Apertura de Caja)" : "Historial de Ventas"}
                disabled={!isCajaOpen}
              >
                {renderTabIllustration('Ventas', 16, activeTab !== 'Ventas')}
                <span className="text-[9px] font-sans mt-0.5 font-medium">Ventas {!isCajaOpen && '🔒'}</span>
              </button>
            )}

            {isTiendaMoreExpanded && (
              <>
                {/* Fiados */}
                {isTabVisible('Fiados') && isTabAllowed('Fiados') && (
                <button
                  onClick={() => setActiveTab('Fiados')}
                  className={getSubTabClasses('Fiados', 'border-orange-500', 'text-orange-400', 'bg-orange-500/10')}
                  title="Créditos — Fiados & Apartados"
                >
                  {renderTabIllustration('Fiados', 16, activeTab !== 'Fiados')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Créditos</span>
                </button>
                )}

                {/* Stock */}
                {isTabVisible('Stock') && isTabAllowed('Stock') && (
                <button
                  onClick={() => setActiveTab('Stock')}
                  className={getSubTabClasses('Stock', 'border-amber-600', 'text-amber-500', 'bg-amber-600/10')}
                  title={lowStockCount > 0 ? `Inventario — ${lowStockCount} producto${lowStockCount > 1 ? 's' : ''} con stock crítico` : "Inventario"}
                >
                  <div className="relative">
                    {renderTabIllustration('Stock', 16, activeTab !== 'Stock')}
                    {lowStockCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                        {lowStockCount > 99 ? '99+' : lowStockCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Inventario</span>
                </button>
                )}

                {/* Reabastecer */}
                {isTabVisible('Reabastecer') && isTabAllowed('Reabastecer') && (
                <button
                  onClick={() => setActiveTab('Reabastecer')}
                  className={getSubTabClasses('Reabastecer', 'border-amber-500', 'text-amber-400', 'bg-amber-500/10')}
                  title="Abasto de Stock"
                >
                  {renderTabIllustration('Reabastecer', 16, activeTab !== 'Reabastecer')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Abasto</span>
                </button>
                )}

                {/* Etiquetas */}
                {isTabVisible('Etiquetas') && isTabAllowed('Etiquetas') && (
                <button
                  onClick={() => setActiveTab('Etiquetas')}
                  className={getSubTabClasses('Etiquetas', 'border-yellow-500', 'text-yellow-400', 'bg-yellow-500/10')}
                  title="Imprimir Etiquetas"
                >
                  {renderTabIllustration('Etiquetas', 16, activeTab !== 'Etiquetas')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Etiquetas</span>
                </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Grupo Servicios (Nueva, Órdenes, Precios, Clientes) - Unified styling like Retro */}
        {config.enableTaller !== false && (
          <div className="my-2 border-2 border-blue-500/30 rounded-xl p-1.5 bg-blue-950/20 flex flex-col gap-1 shadow-inner transition-colors mx-1">
            <button
              type="button"
              onClick={() => setIsServiciosMoreExpanded(!isServiciosMoreExpanded)}
              className="w-full flex items-center justify-center gap-1 py-1 text-[7.5px] font-sans font-black text-blue-455 tracking-wider text-center uppercase hover:bg-blue-500/10 rounded transition-colors cursor-pointer outline-none mb-1"
            >
              ✦ SERVICIO ✦ {isServiciosMoreExpanded ? '▲' : '[+4] ▼'}
            </button>

            {/* Nueva */}
            {isTabVisible('Nueva') && isTabAllowed('Nueva') && (
              <button
                onClick={() => {
                  if (!isCajaOpen) return;
                  setActiveTab('Nueva');
                }}
                className={!isCajaOpen
                  ? "flex flex-col items-center justify-center py-1.5 text-center transition-all border-l-2 border-transparent text-zinc-600 opacity-35 grayscale cursor-not-allowed select-none"
                  : getSubTabClasses('Nueva', 'border-emerald-500', 'text-emerald-400', 'bg-emerald-500/10')
                }
                title={!isCajaOpen ? "Nueva Orden (Deshabilitado: Requiere Apertura de Caja)" : "Nueva Orden/Servicio"}
                disabled={!isCajaOpen}
              >
                {renderTabIllustration('Nueva', 16, activeTab !== 'Nueva')}
                <span className="text-[9px] font-sans mt-0.5 font-medium">Nueva {!isCajaOpen && '🔒'}</span>
              </button>
            )}

            {/* Órdenes */}
            {isTabVisible('Órdenes') && (
              <button
                onClick={() => setActiveTab('Órdenes')}
                className={getSubTabClasses('Órdenes', 'border-sky-500', 'text-sky-400', 'bg-sky-500/10')}
                title="Órdenes de Reparación"
              >
                {renderTabIllustration('Órdenes', 16, activeTab !== 'Órdenes')}
                <span className="text-[9px] font-sans mt-0.5 font-medium">Órdenes</span>
              </button>
            )}

            {/* Cotizaciones */}
            {isTabVisible('Cotizaciones') && (
              <button
                onClick={() => setActiveTab('Cotizaciones')}
                className={getSubTabClasses('Cotizaciones', 'border-violet-500', 'text-violet-400', 'bg-violet-500/10')}
                title="Cotizaciones de Servicio"
              >
                {renderTabIllustration('Cotizaciones', 16, activeTab !== 'Cotizaciones')}
                <span className="text-[9px] font-sans mt-0.5 font-medium">Cotizac.</span>
              </button>
            )}

            {isServiciosMoreExpanded && (
              <>
                {/* Precios */}
                {isTabVisible('Precios') && (
                <button
                  onClick={() => setActiveTab('Precios')}
                  className={getSubTabClasses('Precios', 'border-amber-500', 'text-amber-500', 'bg-amber-500/10')}
                  title="Catálogo de Precios"
                >
                  {renderTabIllustration('Precios', 16, activeTab !== 'Precios')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Precios</span>
                </button>
                )}

                {/* Refacciones */}
                {isTabVisible('Refacciones') && (
                <button
                  onClick={() => setActiveTab('Refacciones')}
                  className={getSubTabClasses('Refacciones', 'border-sky-500', 'text-sky-400', 'bg-sky-500/10')}
                  title="Inventario y Catálogo de Refacciones"
                >
                  {renderTabIllustration('Refacciones', 16, activeTab !== 'Refacciones')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Refacciones</span>
                </button>
                )}

                {/* Donantes */}
                {isTabVisible('Donantes') && (
                <button
                  onClick={() => setActiveTab('Donantes')}
                  className={getSubTabClasses('Donantes', 'border-teal-500', 'text-teal-400', 'bg-teal-500/10')}
                  title="Equipos Donantes / Despiece"
                >
                  {renderTabIllustration('Donantes', 16, activeTab !== 'Donantes')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Donantes</span>
                </button>
                )}

                {/* Equipos */}
                {isTabVisible('Equipos') && (
                <button
                  onClick={() => setActiveTab('Equipos')}
                  className={getSubTabClasses('Equipos', 'border-cyan-500', 'text-cyan-500', 'bg-cyan-500/10')}
                  title="Modelos de Equipos"
                >
                  {renderTabIllustration('Equipos', 16, activeTab !== 'Equipos')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Equipos</span>
                </button>
                )}

                {/* Catálogo */}
                {isTabVisible('Catalogo') && (
                <button
                  onClick={() => setActiveTab('Catalogo')}
                  className={getSubTabClasses('Catalogo', 'border-indigo-500', 'text-indigo-400', 'bg-indigo-500/10')}
                  title="Catálogo de Cotizaciones"
                >
                  {renderTabIllustration('Catalogo', 16, activeTab !== 'Catalogo')}
                  <span className="text-[9px] font-sans mt-0.5 font-medium">Catálogo</span>
                </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Entrada / Salida — abren modal directo */}
        {(['entrada', 'salida'] as const).filter(type => isTabVisible(type === 'entrada' ? 'Entrada' : 'Salida')).map(type => {
          const isEntrada = type === 'entrada';
          const isDisabled = !isCajaOpen;
          return (
            <button
              key={type}
              onClick={() => { if (!isDisabled && onOpenMovimiento) onOpenMovimiento(type); }}
              disabled={isDisabled}
              title={isDisabled ? `${isEntrada ? 'Entrada' : 'Salida'} (Requiere Apertura de Caja)` : isEntrada ? 'Registrar entrada de efectivo' : 'Registrar salida de efectivo'}
              className={isDisabled
                ? "flex flex-col items-center justify-center py-2.5 my-0.5 text-center text-zinc-600 opacity-35 grayscale cursor-not-allowed select-none border-l-4 border-transparent"
                : `flex flex-col items-center justify-center py-2.5 my-0.5 text-center cursor-pointer select-none transition-all border-l-4 border-transparent ${isEntrada ? 'hover:bg-emerald-500/10 hover:border-l-emerald-400 text-emerald-400' : 'hover:bg-rose-500/10 hover:border-l-rose-400 text-rose-400'}`
              }
            >
              <div className="p-1">
                {isEntrada ? <BillEntrada className="w-6 h-6 opacity-80" /> : <BillSalida className="w-6 h-6 opacity-80" />}
              </div>
              <span className="text-[10px] md:text-[11px] font-sans mt-1 tracking-wide font-medium">
                {isEntrada ? 'Entrada' : 'Salida'} {isDisabled && '🔒'}
              </span>
            </button>
          );
        })}

        {/* Cortes */}
        {renderDefaultTab('Cortes')}

        {/* Reportes */}
        {renderDefaultTab('Reportes')}

        {/* Ocultos - Modern Theme */}
        {hasHiddenTabs && (
          <div className={`mt-1 pt-1 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <button
              onClick={() => {
                setActiveTab('Config');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('fm-go-to-modules-config'));
                }, 80);
              }}
              className={`flex flex-col items-center justify-center py-2.5 w-full text-center transition-all cursor-pointer select-none border-l-4 border-transparent ${
                isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#111215]/40'
              }`}
              title="Administrar módulos ocultos"
            >
              <div className="p-1">
                <span className="text-lg">👁️‍🗨️</span>
              </div>
              <span className="text-[10px] md:text-[11px] font-sans mt-1 tracking-wide font-medium">Ocultos</span>
            </button>
          </div>
        )}
      </div>

      </div>{/* cierre div scroll interno */}
      {hasScrollAbove && (
        <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none bg-gradient-to-b from-[#0a0a0c] to-transparent flex items-start justify-center pt-1">
          <ChevronUp className="w-4 h-4 text-zinc-500 animate-bounce" />
        </div>
      )}
      {hasScrollBelow && (
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none bg-gradient-to-t from-[#0a0a0c] to-transparent flex items-end justify-center pb-1">
          <ChevronDown className="w-4 h-4 text-zinc-500 animate-bounce" />
        </div>
      )}
    </aside>
  );
}
