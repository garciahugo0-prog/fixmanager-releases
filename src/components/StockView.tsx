/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Package, Search, PlusCircle, AlertTriangle, CheckCircle, RefreshCw, XCircle, Coins, TrendingUp, Layers, Edit, Trash2, Printer, Plus, X, Barcode, Star, Upload, Download, FileSpreadsheet, ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { InventoryItem, RefaccionItem, WorkshopConfig, AppUser } from '../types';
import { buildProductLabelHtml } from '../utils/ticketBuilder';
import { showUiToast } from '../utils/whatsapp';
import { PosItemThumbnail } from './pos/PosItemThumbnail';
import { BatchPhotoAssignerModal } from './BatchPhotoAssignerModal';

interface StockViewProps {
  inventory: InventoryItem[];
  refacciones?: RefaccionItem[];
  onRestockItem: (id: string, amount: number) => void;
  config: WorkshopConfig;
  initialFilter: 'todos' | 'agotados' | 'bajoStock';
  onSetInventory?: (inventory: InventoryItem[]) => void;
  onSetRefacciones?: (refacciones: RefaccionItem[]) => void;
  setActiveTab?: (tab: string) => void;
  setConfigSubTab?: (tab: string) => void;
  currentUser?: AppUser | null;
}

const ProductMiniature: React.FC<{ imageUrl?: string; extraImages?: string[]; name: string; code?: string; category?: string; price?: number; currencySymbol?: string; isRetro?: boolean }> = ({ imageUrl, extraImages, name, code, category, price, currencySymbol = '$' }) => {
  return (
    <PosItemThumbnail
      imageUrl={imageUrl}
      extraImages={extraImages}
      name={name}
      code={code}
      category={category || 'Producto'}
      price={price}
      currencySymbol={currencySymbol}
      size={34}
    />
  );
};

const inferCategory = (name: string): string => {
  const norm = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normaliza y elimina acentos

  // Palabras clave para Refacciones
  const refaccionKeywords = [
    'pantalla', 'display', 'bateria', 'pila', 'pin de carga', 'centro de carga', 
    'conector', 'flex', 'microfono', 'altavoz', 'bocina', 'camara', 
    'tapa', 'cristal c', 'boton', 'tarjeta', 'logica', 'reparacion', 
    'refaccion', 'touch', 'tactil', 'modulo', 'jack', 'vibrador', 'centro carga'
  ];

  // Palabras clave para Herramientas
  const herramientaKeywords = [
    'cautin', 'multimetro', 'pinza', 'destornillador', 'desarmador', 
    'estacion', 'soldar', 'microscopio', 'fuente', 'espatula', 
    'herramienta', 'llave', 'alicate', 'extractor', 'sopladora', 'puntas'
  ];

  // Palabras clave para Consumibles
  const consumibleKeywords = [
    'estaño', 'estano', 'soldadura', 'pegamento', 't7000', 'b7000', 'e8000', 't8000', 
    'alcohol', 'isopropilico', 'limpiador', 'cinta', 'kapton', 'termica', 
    'flux', 'pasta', 'malla'
  ];

  // Palabras clave para Accesorios
  const accesorioKeywords = [
    'funda', 'case', 'silicon', 'protector', 'mica', 'vidrio', 'templado', 'cristal templado', 
    'cargador', 'cable', 'audifono', 'auricular', 'soporte', 'tripie', 
    'aro de luz', 'usb', 'memoria', 'adaptador', 'powerbank', 'micas', 'correa', 'llavero'
  ];

  if (refaccionKeywords.some(key => norm.includes(key))) return 'Refacción';
  if (herramientaKeywords.some(key => norm.includes(key))) return 'Herramienta';
  if (consumibleKeywords.some(key => norm.includes(key))) return 'Consumible';
  if (accesorioKeywords.some(key => norm.includes(key))) return 'Accesorio';

  return 'Accesorio'; // Default category
};

const inferSubcategory = (name: string): string => {
  const norm = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normaliza y elimina acentos

  if (norm.includes('mica') || norm.includes('vidrio templado') || norm.includes('cristal templado') || norm.includes('vidrio ceramico') || norm.includes('vidrio') && norm.includes('templa')) return 'MICAS';
  if (norm.includes('funda') || norm.includes('case') || norm.includes('silicon') || norm.includes('silicona') || norm.includes('protector') || norm.includes('carcasa') || norm.includes('cover')) return 'FUNDAS';
  if (norm.includes('cable') || norm.includes('lightning a') || norm.includes('tipo c a') || norm.includes('tipo-c a') || norm.includes('cordon') || norm.includes('cable usb')) return 'CABLES';
  if (norm.includes('clavija') || norm.includes('enchufe') || norm.includes('adaptador pared') || norm.includes('cubo cargador') || norm.includes('conector pared') || norm.includes('bloque') && norm.includes('carga')) return 'CLAVIJAS';
  if (norm.includes('cargador') || norm.includes('powerbank') || norm.includes('power bank') || norm.includes('bateria portatil') || norm.includes('bateria externa') || norm.includes('carga rapida') || norm.includes('carga inalambrica') || norm.includes('wireless charger') || norm.includes('20w') || norm.includes('25w') || norm.includes('65w') || norm.includes('adaptador de carga')) return 'CARGADORES';
  return 'OTROS';
};

const MAPPABLE_FIELDS = [
  { key: 'code', label: 'Codigo', synonyms: ['codigo', 'code', 'barcode', 'codigodebarras', 'ean', 'upc', 'clave', 'ref', 'sku', 'id'] },
  { key: 'name', label: 'Nombre *', synonyms: ['nombre', 'name', 'articulo', 'producto', 'descripcion', 'descarticulo', 'nomprod', 'detalles'] },
  { key: 'brand', label: 'Marca', synonyms: ['marca', 'brand', 'fabricante', 'marcaespecifica', 'proveedor', 'maker', 'marcafabricante'] },
  { key: 'category', label: 'Categoria', synonyms: ['categoria', 'category', 'clasificacion', 'tipo', 'linea'] },
  { key: 'cost', label: 'Costo', synonyms: ['costo', 'cost', 'compra', 'preciodecompra', 'costounitario', 'preciocompra', 'costounidad'] },
  { key: 'price', label: 'Precio', synonyms: ['precio', 'price', 'venta', 'preciodeventa', 'preciopublico', 'preciolista', 'pvp', 'publico', 'ventaunitario'] },
  { key: 'wholesalePrice', label: 'Mayoreo', synonyms: ['mayoreo', 'preciomayoreo', 'wholesaleprice', 'distribuidor', 'wholesale', 'preciomayorista', 'mayorista', 'mayoreounitario'] },
  { key: 'stock', label: 'Stock', synonyms: ['stock', 'cantidad', 'inventario', 'cant', 'unidades', 'existencia', 'existencias', 'cantdisp', 'disponible'] },
  { key: 'minStock', label: 'Minimo', synonyms: ['minimo', 'minimoalert', 'stockminimo', 'minstock', 'cantminima'] },
  { key: 'favorite', label: 'Favorito', synonyms: ['favorito', 'favorite', 'destacado', 'fav', 'esfavorito'] },
  { key: 'manageStock', label: 'Manejar Inventario', synonyms: ['manejarinventario', 'manejastock', 'inventariar', 'controlarinventario', 'controlstock', 'lleveinventario', 'lleva_inventario', 'track_stock', 'manage_stock', 'managestock'] },
];

const cleanHeader = (s: string) => s.toLowerCase().trim().replace(/[\s_:-]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeText = (text: string): string => {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const autoMapHeaders = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  
  MAPPABLE_FIELDS.forEach(field => {
    // 1. Intentar coincidencia exacta o sinónimos directos
    let match = headers.find(h => {
      const cleanedH = cleanHeader(h);
      return field.synonyms.some(syn => cleanedH === syn);
    });
    
    // 2. Si no hay match, intentar ver si algún sinónimo está contenido en el encabezado
    if (!match) {
      match = headers.find(h => {
        const cleanedH = cleanHeader(h);
        return field.synonyms.some(syn => cleanedH.includes(syn) || syn.includes(cleanedH));
      });
    }
    
    if (match) {
      mapping[field.key] = match;
    } else {
      mapping[field.key] = ''; // No mapeado
    }
  });
  
  return mapping;
};

const parseNumberClean = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

const parseRowsWithMapping = (rows: any[], mapping: Record<string, string>): any[] => {
  return rows.map((row: any, i) => {
    const getVal = (fieldKey: string): any => {
      const mappedHeader = mapping[fieldKey];
      return mappedHeader ? row[mappedHeader] : undefined;
    };

    const name = String(getVal('name') || '').trim() || `PROD IMPORTADO #${i + 1}`;
    
    const rawCode = getVal('code');
    let code = '';
    if (rawCode !== undefined && rawCode !== null) {
      if (typeof rawCode === 'number') {
        code = rawCode.toFixed(0);
      } else {
        code = String(rawCode).trim();
      }
      
      // Auto-pad leading zero for standard barcode lengths if it got parsed as a number and lost it
      if (/^\d+$/.test(code)) {
        if (code.length === 11) {
          code = '0' + code; // UPC-A
        } else if (code.length === 12) {
          code = '0' + code; // EAN-13 starting with 0
        } else if (code.length === 7) {
          code = '0' + code; // EAN-8/UPC-E
        }
      }
    }
    if (!code) {
      code = `7500${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    const brand = String(getVal('brand') || '').trim().toUpperCase() || 'GENÉRICO';
    
    let category = String(getVal('category') || '').trim();
    if (!category) {
      category = inferCategory(name);
    } else {
      // Capitalize first letter of custom category for consistency
      category = category.charAt(0).toUpperCase() + category.slice(1);
    }

    const cost = parseNumberClean(getVal('cost'));
    let price = parseNumberClean(getVal('price'));
    if (!price && cost > 0) {
      price = Number((cost * 1.5).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }

    let wholesalePrice = parseNumberClean(getVal('wholesalePrice'));
    if (!wholesalePrice && price > 0) {
      wholesalePrice = price;
    }

    const stock = parseNumberClean(getVal('stock'));
    const rawMinStock = getVal('minStock');
    const minStock = (rawMinStock !== undefined && rawMinStock !== null && String(rawMinStock).trim() !== '')
      ? parseNumberClean(rawMinStock)
      : 5;
    
    const favVal = getVal('favorite');
    const favorite = favVal === true || String(favVal).toLowerCase() === 'si' || String(favVal).toLowerCase() === 'yes' || favVal === 1 || String(favVal) === '1' || String(favVal).toLowerCase() === 'activo';

    const rawManageStock = getVal('manageStock');
    const manageStock = rawManageStock === undefined ? true : (rawManageStock === true || String(rawManageStock).toLowerCase() === 'si' || String(rawManageStock).toLowerCase() === 'yes' || rawManageStock === 1 || String(rawManageStock) === '1' || String(rawManageStock).toLowerCase() === 'activo' || String(rawManageStock).toLowerCase() === 'true');

    const subcategory = category === 'Accesorio' ? inferSubcategory(name) : undefined;

    return {
      id: `ACC-IMP-${Date.now().toString().slice(-3)}-${i}`,
      code,
      name,
      brand,
      category,
      subcategory,
      cost,
      price,
      wholesalePrice,
      stock: manageStock ? stock : 0,
      minStock: manageStock ? minStock : 0,
      favorite,
      manageStock
    };
  });
};

export default function StockView({ inventory, refacciones = [], onRestockItem, config, initialFilter, onSetInventory, onSetRefacciones, setActiveTab, setConfigSubTab, currentUser }: StockViewProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  const getCategoryBadgeStyles = (category: string) => {
    const cat = (category || '').toLowerCase();
    
    if (isRetro) {
      if (cat.includes('accesorio')) {
        return 'bg-[#e0d6ff] text-[#331188] border border-[#a38aff] font-bold';
      }
      if (cat.includes('refaccion')) {
        return 'bg-[#d8f0ff] text-[#004488] border border-[#7cc4ff] font-bold';
      }
      if (cat.includes('soporte')) {
        return 'bg-[#ffeed8] text-[#884400] border border-[#ffd19a] font-bold';
      }
      if (cat.includes('funda')) {
        return 'bg-[#e2ffd8] text-[#116600] border border-[#a2ff7c] font-bold';
      }
      return 'bg-[#eaeaea] text-[#222222] border border-[#aaaaaa] font-bold';
    }

    if (isLight) {
      if (cat.includes('accesorio')) {
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      }
      if (cat.includes('refaccion')) {
        return 'bg-sky-100 text-sky-700 border border-sky-200';
      }
      if (cat.includes('soporte')) {
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      }
      if (cat.includes('funda')) {
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      }
      return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
    }

    // Dark Mode
    if (cat.includes('accesorio')) {
      return 'bg-purple-950/45 text-purple-300 border border-purple-800/40';
    }
    if (cat.includes('refaccion')) {
      return 'bg-sky-950/45 text-sky-300 border border-sky-800/40';
    }
    if (cat.includes('soporte')) {
      return 'bg-amber-950/45 text-amber-300 border border-amber-800/40';
    }
    if (cat.includes('funda')) {
      return 'bg-emerald-950/45 text-emerald-300 border border-emerald-800/40';
    }
    return 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/40';
  };

  // ── Categorías editables persistidas en localStorage ──────────────────────
  const DEFAULT_CATEGORIES = ['Accesorio', 'Refacción', 'Herramienta', 'Consumible', 'Otro'];
  const CATS_KEY = 'fxmgr_inventory_categories';
  const loadCats = (): string[] => {
    try { const s = localStorage.getItem(CATS_KEY); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  };
  const [categories, setCategories] = useState<string[]>(loadCats);
  const saveCats = (cats: string[]) => { setCategories(cats); localStorage.setItem(CATS_KEY, JSON.stringify(cats)); };
  const addCategory = (name: string) => { const n = name.trim(); if (!n || categories.includes(n)) return; saveCats([...categories, n]); };
  const removeCategory = (cat: string) => { saveCats(categories.filter(c => c !== cat)); };

  // ── Marcas editables persistidas en localStorage + acumuladas ────────────────
  const DEFAULT_BRANDS = ['GENÉRICO', 'APPLE', 'SAMSUNG', 'XIAOMI', 'MOTOROLA', 'HUAWEI', 'REALME', 'OPPO', 'ZTE', 'HONOR'];
  const BRANDS_KEY = 'fxmgr_inventory_brands';
  const loadBrands = (): string[] => {
    try { const s = localStorage.getItem(BRANDS_KEY); return s ? JSON.parse(s) : DEFAULT_BRANDS; } catch { return DEFAULT_BRANDS; }
  };
  const [customBrands, setCustomBrands] = useState<string[]>(loadBrands);
  const saveBrands = (bList: string[]) => { setCustomBrands(bList); localStorage.setItem(BRANDS_KEY, JSON.stringify(bList)); };
  
  const addBrand = (name: string) => {
    const n = name.trim().toUpperCase();
    if (!n) return;
    if (!customBrands.includes(n)) {
      saveBrands([...customBrands, n]);
    }
    setFormData(prev => ({ ...prev, brand: n }));
  };

  const removeBrand = (bName: string) => {
    saveBrands(customBrands.filter(b => b !== bName));
  };

  const availableBrands = useMemo(() => {
    const fromInventory = (inventory || [])
      .map(item => (item.brand || '').trim().toUpperCase())
      .filter(b => b.length > 0);
    const uniqueSet = Array.from(new Set([...customBrands, ...fromInventory]));
    return uniqueSet.sort((a, b) => a.localeCompare(b));
  }, [customBrands, inventory]);

  // Estado del dropdown de categoría en el form
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [catHighlight, setCatHighlight] = useState(-1);
  const [newCatInput, setNewCatInput] = useState('');
  const catDropRef = useRef<HTMLDivElement>(null);
  const catListRef = useRef<HTMLDivElement>(null);

  // Estado del dropdown de marca en el form
  const [brandDropOpen, setBrandDropOpen] = useState(false);
  const [brandHighlight, setBrandHighlight] = useState(-1);
  const [newBrandInput, setNewBrandInput] = useState('');
  const brandDropRef = useRef<HTMLDivElement>(null);
  const brandListRef = useRef<HTMLDivElement>(null);

  // Refs para navegación Enter entre campos del form
  const refNombre   = useRef<HTMLInputElement>(null);
  const refCodigo   = useRef<HTMLInputElement>(null);
  const refCatBtn   = useRef<HTMLButtonElement>(null);
  const refStock    = useRef<HTMLInputElement>(null);
  const refMinStock = useRef<HTMLInputElement>(null);
  const refCosto    = useRef<HTMLInputElement>(null);
  const refPrecio   = useRef<HTMLInputElement>(null);
  const refMayoreo  = useRef<HTMLInputElement>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onEnterNext = (next: React.RefObject<HTMLElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); next.current?.focus(); }
  };

  useEffect(() => {
    if (!catDropOpen) { setCatHighlight(-1); return; }
    // Init highlight on current category
    const idx = categories.indexOf(formData.category);
    setCatHighlight(idx >= 0 ? idx : 0);
    const handler = (e: MouseEvent) => { if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [catDropOpen]);

  useEffect(() => {
    if (!brandDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (brandDropRef.current && !brandDropRef.current.contains(e.target as Node)) {
        setBrandDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [brandDropOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!catDropOpen || catHighlight < 0) return;
    const el = catListRef.current?.children[catHighlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [catHighlight]);

  const handleCatKeyDown = (e: React.KeyboardEvent) => {
    if (!catDropOpen) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setCatDropOpen(true); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCatHighlight(i => Math.min(i + 1, categories.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCatHighlight(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (catHighlight >= 0 && catHighlight < categories.length) {
        setFormData(prev => ({ ...prev, category: categories[catHighlight] }));
        setCatDropOpen(false);
        setTimeout(() => refStock.current?.focus(), 50);
      }
    }
    else if (e.key === 'Escape') { e.preventDefault(); setCatDropOpen(false); }
  };

  // Dynamic Modal theme styles
  const modalCardClass = isRetro
    ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 rounded-sm shadow-2xl overflow-hidden font-sans text-black relative'
    : isLight
      ? 'bg-white border border-zinc-200 rounded-lg shadow-2xl overflow-hidden text-zinc-900 relative'
      : 'bg-[#121316] border border-[#2d2f36] rounded-lg shadow-2xl overflow-hidden text-zinc-100 relative';

  const modalHeaderClass = isRetro
    ? 'bg-[#000080] border-[#808080] text-white p-2.5 flex items-center justify-between border-b retro-header-blue'
    : isLight
      ? 'bg-zinc-50 border-b border-zinc-200 p-4 flex items-center justify-between'
      : 'bg-[#0e0f12] border-b border-[#1c1d22] p-4 flex items-center justify-between';

  const modalHeaderTitleClass = isRetro
    ? 'text-sm font-sans font-bold text-white flex items-center gap-2'
    : isLight
      ? 'text-sm font-display font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2'
      : 'text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2';

  const modalBodyClass = isRetro
    ? 'p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left bg-[#eaeef3]'
    : isLight
      ? 'p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left bg-white text-zinc-900'
      : 'p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left text-zinc-100 bg-[#121316]';

  const labelClass = isRetro
    ? 'block text-[10px] text-black font-sans uppercase tracking-wider mb-1 font-bold'
    : isLight
      ? 'block text-[10px] text-zinc-500 font-sans uppercase tracking-wider mb-1 font-bold'
      : 'block text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1';

  const inputClass = isRetro
    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-1.5 focus:outline-none font-mono'
    : isLight
      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-amber-500'
      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono';

  const selectClass = isRetro
    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-1.5 focus:outline-none font-sans'
    : isLight
      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-amber-500'
      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500';

  const readonlyInputClass = isRetro
    ? 'w-full bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-500 text-xs px-3 py-1.5 focus:outline-none font-mono cursor-not-allowed'
    : isLight
      ? 'w-full bg-zinc-100 border border-zinc-300 rounded px-3 py-1.5 text-xs text-zinc-500 font-mono focus:outline-none cursor-not-allowed'
      : 'w-full bg-[#181a1f] border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-500 font-mono focus:outline-none cursor-not-allowed';

  const innerBgCard = isRetro
    ? 'grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-[#eaeef3] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none'
    : isLight
      ? 'grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl'
      : 'grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-[#141519] border border-zinc-700/60 rounded-xl';

  const marginInfoBg = isRetro
    ? 'bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-3 text-xs font-mono flex justify-between items-center text-black'
    : isLight
      ? 'bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex justify-between items-center text-xs font-mono text-zinc-700'
      : 'bg-[#181a1f] border border-zinc-800 p-3 rounded-lg flex justify-between items-center text-xs font-mono text-zinc-400';

  const chkLabelClass = isLight
    ? 'text-xs text-black font-sans tracking-tight cursor-pointer font-medium'
    : 'text-xs text-zinc-300 font-sans tracking-tight cursor-pointer';

  const modalFooterClass = isRetro
    ? 'bg-[#dfdfdf] p-4 border-t-2 border-[#808080] flex justify-end gap-2'
    : isLight
      ? 'bg-zinc-50 p-4 border-t border-zinc-200 flex justify-end gap-2'
      : 'bg-[#0e0f12] p-4 border-t border-[#1c1d22] flex justify-end gap-2';

  const btnCancelClass = isRetro
    ? 'px-4 py-1.5 text-xs text-black font-sans font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer'
    : isLight
      ? 'px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors cursor-pointer'
      : 'px-4 py-1.5 text-xs text-gray-400 hover:text-white rounded transition-colors bg-transparent border border-zinc-800 cursor-pointer';

  const btnSubmitClass = isRetro
    ? 'px-5 py-1.5 text-xs text-black font-sans font-bold bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer'
    : 'px-5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors shadow-lg cursor-pointer';

  const [searchTerm, setSearchTermRaw] = useState('');
  const setSearchTerm = (val: string) => {
    setSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'favoritos' | 'agotados' | 'bajoStock'>(initialFilter || 'todos');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string>('TODOS');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, selectedSubcategoryFilter]);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal and custom article actions states
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [printingItem, setPrintingItem] = useState<InventoryItem | null>(null);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestockId, setConfirmRestockId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Excel and spreadsheet import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchPhotoModalOpen, setIsBatchPhotoModalOpen] = useState(false);

  // Cargar logs históricos de reabastecimiento para consultar proveedores
  const replenishmentLogs = React.useMemo(() => {
    if (!editingItem) return [];
    try {
      const saved = localStorage.getItem('fixmanager_replenishment_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [editingItem]);

  // Filtrar el historial de compras para obtener los proveedores y costos de este artículo en específico
  const itemProvidersHistory = React.useMemo(() => {
    if (!editingItem) return [];
    const nameToMatch = editingItem.name.toUpperCase().trim();
    const history: { provider: string; date: string; qty: number; cost: number; note?: string }[] = [];
    
    replenishmentLogs.forEach((log: any) => {
      if (log.items && Array.isArray(log.items)) {
        log.items.forEach((itemInLog: any) => {
          if (itemInLog.name && itemInLog.name.toUpperCase().trim() === nameToMatch) {
            history.push({
              provider: log.provider,
              date: log.date,
              qty: itemInLog.addedQty || itemInLog.qty || 0,
              cost: itemInLog.cost || 0,
              note: log.note
            });
          }
        });
      }
    });
    return history;
  }, [replenishmentLogs, editingItem]);



  // Form state for creating and editing articles
  // Form state for creating and editing articles
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    category: 'Accesorio',
    subcategory: 'OTROS',
    cost: 0,
    price: 0,
    wholesalePrice: 0,
    stock: 0,
    minStock: 5,
    favorite: false,
    manageStock: true,
    imageUrl: '',
    isChip: false
  });

  const [formPreviewUrl, setFormPreviewUrl] = useState('');
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [imageQrCodeUrl, setImageQrCodeUrl] = useState('');
  const [uploadSessionId, setUploadSessionId] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [localPort, setLocalPort] = useState(5055);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onProductImageUploaded) {
      api.onProductImageUploaded((data: { sessionId: string; image: string }) => {
        if (data && data.sessionId === uploadSessionId) {
          setFormData(prev => ({ ...prev, imageUrl: data.image }));
          setShowImageSourceModal(false);
        }
      });
    }
  }, [uploadSessionId]);

  useEffect(() => {
    if (!formData.imageUrl) {
      setFormPreviewUrl('');
    } else if (formData.imageUrl.startsWith('data:image/') || formData.imageUrl.startsWith('http')) {
      setFormPreviewUrl(formData.imageUrl);
    } else {
      const api = (window as any).electronAPI;
      if (api?.readProductImage) {
        const cleanImg = formData.imageUrl.split('?')[0];
        api.readProductImage(cleanImg).then((base64: string) => {
          if (base64) setFormPreviewUrl(base64);
        });
      }
    }
  }, [formData.imageUrl]);

  const processImageBlobToSquareBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;

            if (img.width > img.height) {
              sourceWidth = img.height;
              sourceX = (img.width - img.height) / 2;
            } else if (img.height > img.width) {
              sourceHeight = img.width;
              sourceY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64);
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingImage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingImage(false);
  };

  const handleDropImage = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = (Array.from(files) as File[]).find(f => f.type.startsWith('image/'));
    if (file) {
      try {
        const base64 = await processImageBlobToSquareBase64(file);
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
        showUiToast?.('📥 ¡Imagen arrastrada y cargada con éxito!', 'success');
        if (showImageSourceModal) setShowImageSourceModal(false);
      } catch (err) {
        console.error('Error processing dropped image:', err);
      }
    }
  };

  useEffect(() => {
    if (!editingItem && !isAddingNew) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            try {
              const base64 = await processImageBlobToSquareBase64(blob);
              setFormData(prev => ({ ...prev, imageUrl: base64 }));
              showUiToast?.('📋 ¡Imagen pegada exitosamente desde el portapapeles!', 'success');
              if (showImageSourceModal) setShowImageSourceModal(false);
            } catch (err) {
              console.error('Error pasting image:', err);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingItem, isAddingNew, showImageSourceModal]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageBlobToSquareBase64(file).then(base64 => {
      setFormData(prev => ({ ...prev, imageUrl: base64 }));
    }).catch(err => console.error(err));
  };

  const handleOpenImageSourceModal = () => {
    const sessId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setUploadSessionId(sessId);
    
    const api = (window as any).electronAPI;
    if (api?.startLocalServer) {
      api.startLocalServer().then((res: any) => {
        if (res.success) {
          setLocalIp(res.ip);
          setLocalPort(res.port);
          const link = `http://${res.ip}:${res.port}/product-upload?sessionId=${sessId}`;
          QRCode.toDataURL(link, { width: 180, margin: 1 }).then(url => {
            setImageQrCodeUrl(url);
          }).catch(err => {
            console.error('Error generating QR code:', err);
          });
        }
      });
    }
    setShowImageSourceModal(true);
  };

  const handleOpenAdd = () => {
    setFormData({
      code: `7500${Math.floor(Math.random() * 9000 + 1000)}`,
      name: '',
      brand: '',
      category: 'Accesorio',
      subcategory: 'OTROS',
      cost: 0,
      price: 0,
      wholesalePrice: 0,
      stock: 0,
      minStock: 3,
      favorite: false,
      manageStock: true,
      imageUrl: ''
    });
    setCatDropOpen(false);
    setFormError(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setCatDropOpen(false);
    setFormError(null);
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory || 'OTROS',
      cost: item.cost,
      price: item.price,
      wholesalePrice: item.wholesalePrice !== undefined ? item.wholesalePrice : item.price,
      stock: item.stock,
      minStock: item.minStock,
      favorite: !!item.favorite,
      manageStock: item.manageStock !== false,
      imageUrl: item.imageUrl || '',
      isChip: !!item.isChip
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSetInventory) return;

    // Validación: costo de compra obligatorio
    const cost  = Number(formData.cost)  || 0;
    const price = Number(formData.price) || 0;
    const wholesalePrice = Number(formData.wholesalePrice) || 0;
    if (cost <= 0) {
      setFormError('⚠️ El costo de compra es obligatorio. Necesitas registrarlo para calcular utilidades correctamente.');
      refCosto.current?.focus();
      return;
    }
    if (price > 0 && price < cost) {
      setFormError(
        `⚠️ El precio público ($${price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) no puede ser menor que el costo unitario ($${cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.`
      );
      return;
    }
    if (wholesalePrice > 0 && wholesalePrice < cost) {
      setFormError(
        `⚠️ El precio de mayoreo ($${wholesalePrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) no puede ser menor que el costo unitario ($${cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida.`
      );
      return;
    }
    setFormError(null);

    const isStockManaged = formData.manageStock !== false;
    const api = (window as any).electronAPI;
    const targetId = isAddingNew ? `ACC-${Date.now().toString().slice(-4)}` : (editingItem?.id || '');
    let finalImageUrl = isAddingNew ? '' : (editingItem?.imageUrl || '');

    // Si hay una nueva imagen cargada en base64
    if (formData.imageUrl.startsWith('data:image/')) {
      let supabaseUrl: string | null = null;
      try {
        const { uploadProductImageToSupabase } = await import('../utils/evidenceUpload');
        supabaseUrl = await uploadProductImageToSupabase('product', targetId, formData.imageUrl);
      } catch (err) {
        console.error('Error uploading product image to Supabase:', err);
      }

      if (supabaseUrl) {
        finalImageUrl = supabaseUrl + '?v=' + Date.now();
      } else {
        // Fallback local
        const fileName = `prod_${targetId}.jpg`;
        const cleanFileName = fileName.split('?')[0];
        if (api?.saveProductImage) {
          await api.saveProductImage(cleanFileName, formData.imageUrl);
        }
        finalImageUrl = cleanFileName + '?v=' + Date.now();
      }
    } else if (!formData.imageUrl) {
      // Si se eliminó la imagen del producto
      if (editingItem && editingItem.imageUrl) {
        if (editingItem.imageUrl.startsWith('http')) {
          try {
            const { deleteProductImageFromSupabase } = await import('../utils/evidenceUpload');
            await deleteProductImageFromSupabase(editingItem.imageUrl);
          } catch (err) {
            console.error('Error deleting product image from Supabase:', err);
          }
        } else {
          if (api?.deleteProductImage) {
            await api.deleteProductImage(editingItem.imageUrl.split('?')[0]);
          }
        }
      }
      finalImageUrl = '';
    }

    if (isAddingNew) {
      const newItem: InventoryItem = {
        id: targetId,
        code: formData.code.trim() || `7500${Math.floor(Math.random() * 9000 + 1000)}`,
        name: (formData.name.trim() || 'NUEVO ARTÍCULO DE PRUEBA').toUpperCase(),
        brand: (formData.brand.trim() || 'GENÉRICO').toUpperCase(),
        category: formData.category || 'Accesorio',
        subcategory: formData.category === 'Accesorio' ? (inferSubcategory(formData.name) || formData.subcategory || 'OTROS') : undefined,
        cost: Number(formData.cost) || 0,
        price: Number(formData.price) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || Number(formData.price) || 0,
        stock: isStockManaged ? (Number(formData.stock) || 0) : 0,
        minStock: isStockManaged ? (formData.minStock === '' || isNaN(Number(formData.minStock)) ? 3 : Number(formData.minStock)) : 0,
        favorite: formData.favorite,
        manageStock: isStockManaged,
        imageUrl: finalImageUrl,
        isChip: formData.isChip
      };

      onSetInventory([newItem, ...inventory]);
      setIsAddingNew(false);
      setFeedback(`¡Se registró el nuevo artículo "${newItem.name}" correctamente en almacén!`);
    } else if (editingItem) {
      const updated = inventory.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            code: formData.code.trim(),
            name: formData.name.trim().toUpperCase(),
            brand: (formData.brand.trim() || item.brand || 'GENÉRICO').toUpperCase(),
            category: formData.category,
            subcategory: formData.category === 'Accesorio' ? (formData.subcategory || inferSubcategory(formData.name) || 'OTROS') : undefined,
            cost: Number(formData.cost),
            price: Number(formData.price),
            wholesalePrice: Number(formData.wholesalePrice) || Number(formData.price) || 0,
            stock: isStockManaged ? Number(formData.stock) : 0,
            minStock: isStockManaged ? Number(formData.minStock) : 0,
            favorite: formData.favorite,
            manageStock: isStockManaged,
            imageUrl: finalImageUrl,
            isChip: formData.isChip
          };
        }
        return item;
      });

      onSetInventory(updated);
      setEditingItem(null);
      setFeedback(`¡Se actualizó el artículo "${formData.name.toUpperCase()}" correctamente!`);
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (!onSetInventory) return;
    const updated = inventory.filter(item => item.id !== id);
    onSetInventory(updated);
    setConfirmDeleteId(null);
    setFeedback(`¡El artículo "${name}" ha sido eliminado del inventario!`);
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleToggleActive = (id: string) => {
    if (!onSetInventory) return;
    const updated = inventory.map(item => {
      if (item.id === id) {
        return { ...item, active: item.active === false ? true : false };
      }
      return item;
    });
    onSetInventory(updated);
  };

  const handleToggleFavorite = (id: string) => {
    if (!onSetInventory) return;
    const updated = inventory.map(item => {
      if (item.id === id) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    onSetInventory(updated);
  };

  const renderBarcodeLines = (code: string) => {
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '') || '750912300';
    const bars: React.ReactNode[] = [];
    for (let i = 0; i < 36; i++) {
      const charCode = cleanCode.charCodeAt(i % cleanCode.length) || 68;
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode + i) % 2) + 1;
      bars.push(<div key={`b-${i}`} className="bg-black shrink-0" style={{ width: `${w1}px`, height: '100%' }} />);
      bars.push(<div key={`s-${i}`} className="bg-transparent shrink-0" style={{ width: `${w2}px`, height: '100%' }} />);
    }
    return <div className="flex h-10 items-stretch justify-center bg-white w-full select-none">{bars}</div>;
  };

  // Inventario / Almacén cost and retail metrics
  const totalCostInvested = React.useMemo(() => {
    return inventory.reduce((acc, item) => acc + (item.cost * item.stock), 0);
  }, [inventory]);

  const totalSalesValuation = React.useMemo(() => {
    return inventory.reduce((acc, item) => acc + (item.price * item.stock), 0);
  }, [inventory]);

  const totalEstimatedProfit = totalSalesValuation - totalCostInvested;

  const totalUnitsInStock = React.useMemo(() => {
    return inventory.reduce((acc, item) => acc + item.stock, 0);
  }, [inventory]);

  // Breakdown of models and total units by category
  const categorySummaryBreakdown = React.useMemo(() => {
    const summary: Record<string, { models: number; units: number }> = {
      'Refacción': { models: 0, units: 0 },
      'Accesorio': { models: 0, units: 0 },
      'Consumible': { models: 0, units: 0 },
      'Herramienta': { models: 0, units: 0 },
      'Otro': { models: 0, units: 0 }
    };

    inventory.forEach((item) => {
      const cat = item.category || 'Otro';
      const key = summary[cat] ? cat : 'Otro';
      summary[key].models += 1;
      summary[key].units += item.stock;
    });

    return summary;
  }, [inventory]);

  const load100SampleAccessories = () => {
    if (!onSetInventory) return;

    const brands = ['Apple', 'SAMSUNG', 'Xiaomi', 'Motorola', 'Huawei', 'Realme', 'OPPO'];
    const accessoryTypes = [
      { prefix: 'Funda de Silicón Premium', price: 250, cost: 80, brandSpecific: true },
      { prefix: 'Vidrio Templado Cerámico 9D', price: 150, cost: 35, brandSpecific: true },
      { prefix: 'Funda Transparente Anti-Impacto', price: 190, cost: 55, brandSpecific: true },
      { prefix: 'Cargador Original Carga Rápida 20W/25W', price: 450, cost: 150, brandSpecific: true },
      { prefix: 'Cable Tipo C a Tipo C Reforzado 2m', price: 180, cost: 45, brandSpecific: false },
      { prefix: 'Soporte Magnético para Rejilla Auto', price: 220, cost: 70, brandSpecific: false },
      { prefix: 'Mica de Privacidad Cerámica Antiespía', price: 190, cost: 45, brandSpecific: true },
      { prefix: 'Protector de Lente de Cámara Metal Ring', price: 130, cost: 25, brandSpecific: true },
      { prefix: 'Funda de Cuero Genuino MagSafe', price: 590, cost: 200, brandSpecific: true },
      { prefix: 'Batería Portátil Keyring 5000mAh', price: 350, cost: 110, brandSpecific: false },
      { prefix: 'Adaptador OTG Tipo-C a USB 3.0', price: 90, cost: 15, brandSpecific: false },
      { prefix: 'Audífonos Bluetooth In-Ear Pro', price: 650, cost: 220, brandSpecific: false },
      { prefix: 'Soporte Escritorio de Aluminio', price: 199, cost: 60, brandSpecific: false },
      { prefix: 'Anillo Sujetador Metálico 360', price: 80, cost: 15, brandSpecific: false },
      { prefix: 'Brazalete Deportivo Neopreno', price: 120, cost: 30, brandSpecific: false }
    ];

    const modelsByBrand: Record<string, string[]> = {
      'Apple': ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 11'],
      'SAMSUNG': ['Galaxy S24 Ultra', 'Galaxy S23 Ultra', 'Galaxy A54 5G', 'Galaxy A34', 'Galaxy S22'],
      'Xiaomi': ['Redmi Note 13 Pro', 'POCO X6 Pro', 'Redmi 12C', 'Xiaomi 13T'],
      'Motorola': ['Moto G84 5G', 'Edge 40 Neo', 'Moto G54', 'Moto E13'],
      'Huawei': ['P60 Pro', 'Nova 11i', 'Mate 50 Pro'],
      'Realme': ['Realme 11 Pro+', 'Realme C53'],
      'OPPO': ['Reno 10 5G', 'OPPO A78']
    };

    const items: InventoryItem[] = [];
    let itemCounter = 1;
    let index = 1;

    while (items.length < 100) {
      const type = accessoryTypes[index % accessoryTypes.length];
      const selectedBrand = brands[index % brands.length];
      const modelList = modelsByBrand[selectedBrand] || ['Universal'];
      const selectedModel = modelList[index % modelList.length];

      const name = (type.brandSpecific 
        ? `${type.prefix} (${selectedModel})`
        : `${type.prefix} - ${selectedBrand} Universal`).toUpperCase();

      const id = `ACC-${100 + itemCounter}`;
      const code = `750912300${(100 + itemCounter).toString().padStart(3, '0')}`;
      
      const stock = Math.floor(Math.random() * 20) + 5; // 5 to 24 units
      const minStock = Math.floor(Math.random() * 5) + 3; // 3 to 7 units
      const favorite = itemCounter % 8 === 0;

      items.push({
        id,
        code,
        name,
        brand: selectedBrand.toUpperCase(),
        category: 'Accesorio',
        subcategory: inferSubcategory(name),
        stock,
        minStock,
        price: type.price,
        cost: type.cost,
        favorite
      });

      itemCounter++;
      index++;
    }

    onSetInventory(items);
    setFeedback('¡Se cargaron exitosamente 100 accesorios para celulares del catálogo de pruebas!');
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  React.useEffect(() => {
    if (initialFilter) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  const filteredItems = inventory.filter((item) => {
    if (!showInactive && item.active === false) return false;

    const cleanSearch = searchTerm.replace(/,(?!\s)/g, '-');
    const normSearch = normalizeText(cleanSearch);
    const textMatch =
      normalizeText(item.name).includes(normSearch) ||
      normalizeText(item.code).includes(normSearch) ||
      normalizeText(item.brand).includes(normSearch);

    let matchesFilter = textMatch;
    if (activeFilter === 'todos') matchesFilter = textMatch;
    else if (activeFilter === 'favoritos') matchesFilter = textMatch && !!item.favorite;
    else if (activeFilter === 'agotados') matchesFilter = textMatch && item.stock === 0;
    else if (activeFilter === 'bajoStock') matchesFilter = textMatch && item.minStock > 0 && item.stock > 0 && item.stock <= item.minStock;

    if (selectedSubcategoryFilter !== 'TODOS') {
      if (item.category !== selectedSubcategoryFilter) {
        return false;
      }
    }

    return matchesFilter;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = React.useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredItems.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredItems, currentPage, rowsPerPage]);

  const handleQuickRestock = (id: string, name: string) => {
    onRestockItem(id, restockAmount);
    setFeedback(`¡Se añadieron ${restockAmount} unidades a "${name}" exitosamente!`);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const replenishAll = () => {
    inventory.forEach((i) => {
      if (i.manageStock !== false && ((i.minStock > 0 && i.stock <= i.minStock) || i.stock === 0)) {
        onRestockItem(i.id, 15);
      }
    });
    setFeedback('¡Se ha reabastecido de forma masiva (+15 unidades) a todos los productos agotados o críticos!');
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleExportToExcel = () => {
    try {
      // Prepare the data to be exported
      const exportData = inventory.map((item) => {
        const itemSubcategory = item.category === 'Accesorio' ? (item.subcategory || inferSubcategory(item.name)) : '';
        return {
          'CODIGO': item.code,
          'NOMBRE / ARTICULO': item.name.toUpperCase(),
          'FABRICANTE / MARCA': (item.brand || '').toUpperCase(),
          'CATEGORIA': item.category,
          'SUBCATEGORIA (ACCESORIO)': itemSubcategory,
          'COSTO COMPRA': item.cost,
          'PRECIO VENTA': item.price,
          'PRECIO MAYOREO': item.wholesalePrice || 0,
          'STOCK ACTUAL': item.stock,
          'STOCK MINIMO': item.minStock,
          'GANANCIA MARGEN': item.price - item.cost,
          'FAVORITO': item.favorite ? 'SI' : 'NO'
        };
      });

      // Create sheet from json
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns to look super professional and elegant
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 45 }, // Nombre
        { wch: 22 }, // Fabricante
        { wch: 15 }, // Categoría
        { wch: 25 }, // Subcategoría
        { wch: 14 }, // Costo
        { wch: 14 }, // Precio Venta
        { wch: 16 }, // Precio Mayoreo
        { wch: 14 }, // Stock Actual
        { wch: 14 }, // Stock Mínimo
        { wch: 16 }, // Ganancia
        { wch: 10 }, // Favorito
      ];
      worksheet['!cols'] = colWidths;

      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Taller');

      // Generate buffer and trigger download
      XLSX.writeFile(workbook, `Inventario_Taller_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setFeedback('✅ ¡Se ha exportado el catálogo de artículos e inventario a Excel correctamente!');
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err) {
      console.error(err);
      setFeedback('⚠️ Error al exportar a Excel. Intente de nuevo.');
    }
  };

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
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1c1d22] pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm md:text-base font-display font-black text-amber-600 uppercase tracking-widest">
            📦 CONTROL DE INVENTARIO Y DE ALMACÉN
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(!currentUser || currentUser.permissions.canEditStock) && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] font-display font-semibold uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Producto
          </button>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(147,51,234,0.2)] font-display font-semibold uppercase tracking-wider text-left"
            title="Importar base de datos de inventario desde archivo de Excel (.xlsx, .xls) o CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Importar Excel
          </button>
          <button
            onClick={() => setIsBatchPhotoModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-md font-display uppercase tracking-wider"
            title="Asignación rápida de fotos en lote desde celular con QR o matriz en PC"
          >
            <Sparkles className="w-3.5 h-3.5" /> ⚡ Cargar Fotos en Lote
          </button>
          <button
            onClick={handleExportToExcel}
            className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] font-display font-semibold uppercase tracking-wider"
            title="Exportar todo el inventario (artículos, accesorios, materiales, etc.) a un archivo de Excel"
          >
            <Download className="w-3.5 h-3.5" /> Exportar a Excel
          </button>

        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded-md shadow-lg animate-fadeIn">
          {feedback}
        </div>
      )}

      {/* Resumen de Métrica de Inversión y Almacén */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido */}
        <div className="bg-[#121316] border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Costo Total Invertido</p>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {config.currencySymbol}{totalCostInvested.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-emerald-500/70 font-sans">Capital de Trabajo en Almacén</p>
          </div>
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 rounded text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Valor de Venta Público */}
        <div className="bg-[#121316] border border-[#1b1c21] p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Valor Estimado de Venta</p>
            <p className="text-xl font-bold font-mono text-white">
              {config.currencySymbol}{totalSalesValuation.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-zinc-500 font-sans">Precio Público de Todo el Stock</p>
          </div>
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Ganancia Proyectada */}
        <div className="bg-[#121316] border border-cyan-500/30 p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Ganancia Teórica</p>
            <p className="text-xl font-bold font-mono text-cyan-400">
              +{config.currencySymbol}{totalEstimatedProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-zinc-500 font-sans">
              Retorno Estimado ({totalCostInvested > 0 ? ((totalEstimatedProfit / totalCostInvested) * 100).toFixed(0) : 0}%)
            </p>
          </div>
          <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/20 rounded text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Cantidad Total de Artículos */}
        <div className="bg-[#121316] border border-[#1b1c21] p-4 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 w-full">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Unidades Disponibles</p>
              <p className="text-xl font-bold font-mono text-amber-500">
                {totalUnitsInStock} <span className="text-xs text-zinc-400 font-normal font-sans">piezas</span>
              </p>
              <p className="text-[9px] text-zinc-500 font-sans">{inventory.length} modelos únicos activos</p>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-amber-500 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-2.5 mt-1.5 w-full">
            <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1.5 w-full">Resumen por Categoría</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] w-full">
              <div className="flex items-center justify-between bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-900/60" title={`${categorySummaryBreakdown['Refacción'].models} modelos`}>
                <span className="text-zinc-400 text-[9px] font-sans">🔧 Refacciones</span>
                <span className="font-mono font-bold text-sky-400">{categorySummaryBreakdown['Refacción'].units}</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-900/60" title={`${categorySummaryBreakdown['Accesorio'].models} modelos`}>
                <span className="text-zinc-400 text-[9px] font-sans">🔌 Accesorios</span>
                <span className="font-mono font-bold text-emerald-400">{categorySummaryBreakdown['Accesorio'].units}</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-900/60" title={`${categorySummaryBreakdown['Consumible'].models} modelos`}>
                <span className="text-zinc-400 text-[9px] font-sans">🧪 Consumibles</span>
                <span className="font-mono font-bold text-purple-400">{categorySummaryBreakdown['Consumible'].units}</span>
              </div>
              <div className="flex items-center justify-between bg-[#1f1915]/50 px-2 py-0.5 rounded border border-amber-950/20" title={`${categorySummaryBreakdown['Herramienta'].models} modelos`}>
                <span className="text-zinc-400 text-[9px] font-sans">🛠️ Herramientas</span>
                <span className="font-mono font-bold text-amber-500">{categorySummaryBreakdown['Herramienta'].units}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control row: Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="premium-search-container w-full md:max-w-xs shrink-0 select-none flex items-center">
          <div className="flex items-center text-zinc-400 shrink-0">
            <Search className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="w-[1px] h-4 bg-zinc-700/50 mx-3 shrink-0"></div>
          <div className="relative flex-1 flex items-center h-full">
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Buscar código, refacción, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-search-input pr-6"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 dark:hover:text-white transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Level filtering tabs */}
        <div className={`flex divide-x overflow-hidden ${
          isRetro 
            ? 'divide-zinc-400 bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
            : isLight 
              ? 'divide-zinc-200 bg-white border border-zinc-300 rounded' 
              : 'divide-zinc-600 bg-[#121316] border border-[#1c1d22] rounded'
        }`}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'favoritos', label: '⭐ Favoritos' },
            { id: 'agotados', label: 'Agotados (Stock 0)' },
            { id: 'bajoStock', label: 'Stock Bajo-Crítico' }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? isRetro
                      ? 'bg-[#000080] text-white retro-white-text font-extrabold uppercase'
                      : isLight
                        ? 'bg-amber-600 text-white font-extrabold'
                        : 'bg-zinc-800 text-amber-500'
                    : isRetro
                      ? 'text-zinc-800 bg-[#dfdfdf] hover:bg-zinc-200 hover:text-black'
                      : isLight
                        ? 'text-zinc-600 bg-white hover:bg-zinc-50 hover:text-zinc-900'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mostrar Inactivos */}
        <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-black uppercase ${isRetro ? 'text-black font-mono' : 'text-zinc-400 hover:text-zinc-200'} transition-colors`}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
          />
          <span>Mostrar Inactivos</span>
        </label>

      </div>

      {/* Category filter - dynamic from real inventory data */}
      <div className={`p-3 space-y-2 ${
        isRetro 
          ? 'bg-[#eaeef3] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' 
          : isLight 
            ? 'bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900' 
            : 'bg-[#121316]/55 border border-[#1b1c21] p-3 rounded-md text-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <Layers className={`w-3.5 h-3.5 ${isRetro ? 'text-[#000080]' : isLight ? 'text-amber-600' : 'text-emerald-400'}`} />
            <span className={`text-[10px] font-sans font-extrabold uppercase tracking-wide ${
              isRetro ? 'text-[#000080]' : isLight ? 'text-zinc-800' : 'text-emerald-400 font-mono tracking-wider'
            }`}>Categorías</span>
          </div>
          <span className={`text-[9px] font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Filtrar por categoría de producto
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(() => {
            // Obtener categorías únicas del inventario real
            const uniqueCategories = Array.from(
              new Set(inventory.map(i => i.category).filter(Boolean))
            ).sort() as string[];

            const categories = [
              { id: 'TODOS', label: 'Ver Todo', count: inventory.length },
              ...uniqueCategories.map(cat => ({
                id: cat,
                label: cat,
                count: inventory.filter(i => i.category === cat).length,
              })),
            ];

            return categories;
          })().map((cat) => {
            const isActive = selectedSubcategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedSubcategoryFilter(cat.id)}
                className={`px-2.5 py-1 text-[11px] font-sans rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? isRetro
                      ? 'bg-[#000080] text-white retro-white-text border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-extrabold shadow-sm'
                      : isLight
                        ? 'bg-emerald-600 text-white border border-emerald-600 font-semibold shadow-sm'
                        : 'bg-emerald-600 text-white border border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)] font-medium'
                    : isRetro
                      ? 'bg-[#dfdfdf] text-zinc-800 border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-200 hover:text-black font-bold'
                      : isLight
                        ? 'bg-white text-zinc-700 border border-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 font-medium'
                        : 'bg-[#18191d]/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800/60 font-medium'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-sm sub-count-badge ${
                  isActive
                    ? isRetro
                      ? 'bg-white text-[#000080] border border-[#000080]'
                      : isLight
                        ? 'bg-white text-emerald-800 border border-emerald-300'
                        : 'bg-black/40 text-white border border-emerald-500/40'
                    : isRetro
                      ? 'bg-zinc-300 text-zinc-700 border border-zinc-400'
                      : isLight
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Item Ledger Table */}
      <div className="bg-[#121316] border border-[#1b1c21] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0e0f12] border-b border-[#2d2f36] text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                <th className="p-3 pl-4">Código</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Marca</th>
                <th className="p-3">Categoría</th>
                <th className="p-3 text-right">Costo</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-right">Mayoreo</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-center">Mínimo</th>
                <th className="p-3 text-center">Favorito</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500 font-mono">
                    Ninguna pieza de recambio cumple con los filtros activos.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isStockControlled = item.manageStock !== false;
                  const isAgotado = isStockControlled && item.stock === 0;
                  const isBajoStock = isStockControlled && item.minStock > 0 && item.stock > 0 && item.stock <= item.minStock;
                  const isInactive = item.active === false;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${isInactive ? 'opacity-45 bg-rose-950/5' : ''} ${
                        isRetro
                          ? 'hover:bg-zinc-200/40'
                          : isLight
                          ? 'hover:bg-zinc-100/60'
                          : 'bg-transparent hover:bg-zinc-900/30'
                      }`}
                    >
                      {/* Code */}
                      <td className={`p-3 pl-4 font-mono font-bold text-[11px] ${
                        isRetro ? 'text-[#000080]' : isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}>
                        {item.code}
                      </td>

                      {/* Name */}
                      <td className="p-3 max-w-[280px]">
                        <div className="flex items-center gap-2.5 break-words whitespace-normal">
                          <ProductMiniature imageUrl={item.imageUrl} extraImages={item.extraImages} name={item.name} code={item.code} category={item.category} price={item.price} currencySymbol={config.currencySymbol} isRetro={isRetro} />
                          <p className={`font-bold break-all whitespace-normal ${
                            isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-800' : 'text-gray-200'
                          }`}>{item.name.toUpperCase()}</p>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className={`p-3 text-[11px] ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        {(item.brand || '—').toUpperCase()}
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit ${getCategoryBadgeStyles(item.category || '')}`}>
                            {item.category || '—'}
                          </span>
                          {item.category === 'Accesorio' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded w-fit font-mono font-bold uppercase bg-emerald-900/20 text-emerald-400 border border-emerald-800/30">
                              {item.subcategory || inferSubcategory(item.name)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className={`p-3 text-right font-mono ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        {config.currencySymbol}{item.cost}
                      </td>

                      {/* Price */}
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-white'}>
                          {config.currencySymbol}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Mayoreo */}
                      <td className={`p-3 text-right font-mono font-bold ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        <span className={isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-white'}>
                          {config.currencySymbol}{(item.wholesalePrice !== undefined ? item.wholesalePrice : item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Stock level */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          {item.manageStock === false ? (
                            <span className="bg-indigo-950/40 text-indigo-400 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-indigo-800/45 flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" /> ILIMITADO
                            </span>
                          ) : isAgotado ? (
                            <span className="bg-rose-950/40 text-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-rose-800/45 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> AGOTADO
                            </span>
                          ) : isBajoStock ? (
                            <span className="bg-amber-950/40 text-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-amber-800/45 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> CRÍTICO ({item.stock})
                            </span>
                          ) : (
                            <span className="bg-emerald-950/40 text-emerald-400 px-2.5 py-1 text-[10px] font-bold uppercase rounded border border-emerald-800/45 flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> OK ({item.stock})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Minimo */}
                      <td className={`p-3 text-center font-mono text-[11px] ${
                        isRetro ? 'text-zinc-700' : isLight ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        {item.manageStock === false ? '—' : `${item.minStock ?? 5} pz`}
                      </td>

                      {/* Favorito */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleFavorite(item.id)}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            item.favorite
                              ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                              : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40'
                          }`}
                          title={item.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        >
                          <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-500' : 'fill-transparent'}`} />
                        </button>
                      </td>

                      {/* Quick Restock & Product Maintenance Actions */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col xl:flex-row items-center justify-center gap-2">
                          {/* Quick restock input + button */}
                          {item.manageStock !== false ? (
                            <div className={`flex items-center overflow-hidden max-w-[130px] shrink-0 border ${
                              isRetro 
                                ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white border-r-[#eaeef3] border-b-[#eaeef3]' 
                                : isLight 
                                  ? 'bg-white border-zinc-300 rounded' 
                                  : 'bg-zinc-950 border-zinc-600 rounded'
                            }`}>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={restockAmount}
                                onChange={(e) => setRestockAmount(Math.max(1, Number(e.target.value) || 1))}
                                className={`w-11 text-center text-xs font-mono font-bold py-1 focus:outline-none border-r ${
                                  isRetro 
                                    ? 'bg-white text-zinc-900 border-r-zinc-300' 
                                    : isLight 
                                      ? 'bg-white text-zinc-900 border-r-zinc-200' 
                                      : 'bg-transparent text-emerald-400 border-r-zinc-700'
                                }`}
                                style={{
                                  MozAppearance: 'textfield',
                                  WebkitAppearance: 'none'
                                }}
                              />
                              <button
                                onClick={() => confirmRestockId === item.id ? (handleQuickRestock(item.id, item.name), setConfirmRestockId(null)) : setConfirmRestockId(item.id)}
                                className={`px-3 py-1 font-sans font-black uppercase text-[10px] tracking-wider transition-all select-none cursor-pointer ${
                                  confirmRestockId === item.id
                                    ? 'bg-emerald-600 text-white'
                                    : isRetro 
                                      ? 'bg-[#dfdfdf] hover:bg-zinc-200 text-[#000080]' 
                                      : isLight 
                                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' 
                                        : 'bg-zinc-900 text-emerald-500 hover:bg-zinc-700 hover:text-white'
                                }`}
                                title="Reabastecer rápidamente"
                              >
                                {confirmRestockId === item.id ? '✓ Confirmar Surtir' : 'Surtir'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-mono italic opacity-60">
                              Servicio/Ilimitado
                            </span>
                          )}

                          <div className="flex items-center gap-1">
                            {/* Editar */}
                            {(!currentUser || currentUser.permissions.canEditStock) && (
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 px-1.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded cursor-pointer transition-colors"
                              title="Editar artículo de Almacén"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            )}

                            {/* Imprimir Etiqueta */}
                            <button
                              onClick={() => setPrintingItem(item)}
                              className="p-1 px-1.5 border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 rounded cursor-pointer transition-colors"
                              title="Imprimir etiqueta de código de barras adhesiva"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Activar / Desactivar */}
                            {(!currentUser || currentUser.permissions.canEditStock) && (
                            <button
                              onClick={() => handleToggleActive(item.id)}
                              title={isInactive ? 'Activar producto' : 'Desactivar producto'}
                              className={`p-1 px-1.5 border rounded cursor-pointer transition-colors ${
                                isInactive
                                  ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                                  : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300'
                              }`}
                            >
                              {isInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            )}

                            {/* Eliminar de catálogo */}
                            {(!currentUser || currentUser.permissions.canDeleteProducts) && (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1 px-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-505/20 text-rose-400 hover:text-rose-300 rounded cursor-pointer transition-colors"
                              title="Eliminar artículo del inventario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginación del Almacén */}
        {filteredItems.length > 0 && (
          <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isRetro ? 'bg-[#dfdfdf] border-zinc-400 text-black font-sans'
            : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
            : 'bg-[#0e0f12] border-[#2d2f36] text-zinc-450 border-t border-[#1b1c21]'
          }`}>
            {/* Izquierda: Información del rango */}
            <div className="text-[11px] font-mono">
              {isRetro ? (
                <span>
                  Mostrando del {(currentPage - 1) * rowsPerPage + 1} al {Math.min(currentPage * rowsPerPage, filteredItems.length)} de {filteredItems.length} artículos (Pág. {currentPage} de {totalPages})
                </span>
              ) : (
                <span>
                  Mostrando <strong className={isLight ? 'text-zinc-950' : 'text-white'}>{(currentPage - 1) * rowsPerPage + 1}</strong> a <strong className={isLight ? 'text-zinc-950' : 'text-white'}>{Math.min(currentPage * rowsPerPage, filteredItems.length)}</strong> de <strong className={isLight ? 'text-zinc-950' : 'text-white'}>{filteredItems.length}</strong> artículos
                </span>
              )}
            </div>

            {/* Derecha: Selector de filas y controles */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Selector de filas por página */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Filas por pág:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`text-xs px-1.5 py-0.5 rounded cursor-pointer ${
                    isRetro
                      ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black font-mono focus:outline-none'
                      : isLight
                        ? 'bg-white border border-zinc-300 text-zinc-800 focus:outline-none focus:border-emerald-500'
                        : 'bg-[#1c1e24] border border-[#2d2f36] text-white focus:outline-none focus:border-emerald-500 font-mono'
                  }`}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              {/* Botones de navegación */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    currentPage === 1
                      ? 'opacity-30 cursor-not-allowed'
                      : isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                        : isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-750'
                  }`}
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="text-[11px] font-mono px-2 select-none">
                  {currentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    currentPage === totalPages
                      ? 'opacity-30 cursor-not-allowed'
                      : isRetro
                        ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                        : isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-750'
                  }`}
                  title="Página Siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

       {/* MODAL: IMPRESIÓN DE ETIQUETA ADHESIVA */}
      {printingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <style>{`
            @media print {
              /* Ocultar el resto del sitio */
              body * {
                visibility: hidden;
              }
              /* Hacer visible solo el contenedor real de impresión */
              #print-job-container, #print-job-container * {
                visibility: visible;
              }
              #print-job-container {
                position: fixed;
                left: 0 !important;
                top: 0 !important;
                width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .printable-sticker-copy {
                width: 58mm !important;
                height: 32mm !important;
                page-break-after: always;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 3mm !important;
                background: white !important;
                color: black !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
              }
            }
          `}</style>
          
          <div className={isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 max-w-md w-full overflow-hidden shadow-2xl flex flex-col relative animate-scale-up text-black font-sans' : isLight ? 'bg-white border border-zinc-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col relative animate-scale-up text-zinc-900 font-sans' : 'bg-[#0f1115] border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col relative animate-scale-up text-zinc-100 font-sans'}>
            
            {/* Cabecera del modal */}
            <div className="modal-dark-header bg-[#000080] p-3.5 flex items-center justify-between border-b border-[#00006a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.18)',border:'1px solid rgba(255,255,255,0.3)'}}>
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-sans font-black uppercase tracking-widest text-white">EMISOR DE ETIQUETAS</h3>
                  <span className="text-[10px] font-mono block font-extrabold text-white/70">IMPRESIÓN INDUSTRIAL CONTINUA</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPrintingItem(null);
                  setPrintCopies(1);
                }}
                className={isRetro 
                  ? 'w-6 h-6 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 hover:bg-zinc-200 hover:text-black font-extrabold flex items-center justify-center text-xs text-black active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white cursor-pointer select-none' 
                  : 'w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-bold cursor-pointer transition-all'
                }
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className={`${isRetro ? 'p-4 bg-[#eaeef3]' : isLight ? 'p-6 bg-white' : 'p-6 bg-[#0f1115]'} space-y-5 flex flex-col overflow-y-auto max-h-[75vh]`}>
              
              {/* Información General */}
              <div className="text-center space-y-1">
                <h4 className={`text-sm font-sans font-black uppercase ${isLight ? 'text-zinc-900' : 'text-white'}`}>{printingItem.name}</h4>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Ref/SKU: {printingItem.id} • SKU Proveedor: {printingItem.code}
                </p>
              </div>

              {/* BANDEJA DE PREVIEW */}
              <div className={`relative w-full py-6 px-4 border flex flex-col items-center justify-center overflow-hidden ${
                isRetro 
                  ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
                  : isLight 
                    ? 'bg-zinc-150 border-zinc-200 rounded-xl' 
                    : 'bg-[#14151a] border-[#202125] rounded-xl'
              }`}>
                {/* Patrón de rodillo térmico de fondo */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Preview idéntico al HTML impreso — iframe con srcDoc */}
                {(() => {
                  const previewHtml = buildProductLabelHtml(
                    { name: printingItem.name, price: printingItem.price, sku: printingItem.code, brand: printingItem.brand },
                    config
                  );
                  const mmToPx = 3.78;
                  const sizeKey = config.labelPaperSize || '51x25mm';
                  const [mmW, mmH] = sizeKey.replace('mm','').split('x').map(Number);
                  const scale = 2.5;
                  const realW = Math.round(mmW * mmToPx);
                  const realH = Math.round(mmH * mmToPx);
                  return (
                    <div style={{ width: `${realW * scale}px`, height: `${realH * scale}px`, overflow: 'hidden', borderRadius: '4px', border: '1px solid #ccc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)', flexShrink: 0 }}>
                      <iframe
                        key={printingItem.id + sizeKey}
                        srcDoc={previewHtml}
                        scrolling="no"
                        style={{ width: `${realW}px`, height: `${realH}px`, border: 'none', background: 'white', display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        title="Vista previa etiqueta"
                      />
                    </div>
                  );
                })()}

                {/* Sombra de despegue y slots del rodillo */}
                <div className="w-2/3 h-1.5 bg-black/45 blur-md rounded-full mt-2"></div>
                <div className={`text-[9px] font-mono uppercase tracking-widest mt-1.5 flex items-center gap-1.5 ${isLight ? 'text-zinc-500 font-bold' : 'text-zinc-500'}`}>
                  <span>← {config.labelPaperSize || '51x25mm'} →</span>
                </div>
              </div>

              {/* OPCIONES DE IMPRESIÓN */}
              <div className={`p-4 ${
                isRetro 
                  ? 'space-y-4 bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black' 
                  : isLight 
                    ? 'space-y-4 bg-zinc-50 border border-zinc-200 rounded-xl' 
                    : 'space-y-4 bg-[#14161d] border border-zinc-900 rounded-xl'
              }`}>
                <span className={`text-[9px] uppercase font-mono tracking-widest font-bold block border-b pb-1.5 ${
                  isRetro 
                    ? 'text-[#000080] border-b-zinc-400' 
                    : isLight 
                      ? 'text-amber-600 border-b-zinc-200' 
                      : 'text-[#56bcff] border-b-zinc-700'
                }`}>
                  🎛️ AJUSTES DE IMPRESIÓN
                </span>
                
                {/* Selector de copias */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className={`text-xs font-bold block ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>Copias de Etiqueta</label>
                    <span className={`text-[10px] block ${isLight ? 'text-zinc-500 font-medium' : 'text-zinc-500'}`}>Cantidad total de pegatinas</span>
                  </div>
                  <div className={`flex items-center rounded-lg p-0.5 border ${
                    isRetro 
                      ? 'bg-white border-t-[#808080] border-l-[#808080] border-b-white border-r-white' 
                      : isLight 
                        ? 'bg-white border-zinc-300' 
                        : 'bg-[#1c1d22] border-zinc-800'
                  }`}>
                    <button 
                      type="button"
                      onClick={() => setPrintCopies(c => Math.max(1, c - 1))}
                      className={`w-8 h-8 rounded hover:bg-zinc-200 flex items-center justify-center font-bold active:scale-90 select-none cursor-pointer ${
                        isLight ? 'text-zinc-700' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      min={1}
                      max={50}
                      value={printCopies}
                      onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-12 text-center bg-transparent text-xs border-none font-mono focus:outline-none ${
                        isLight ? 'text-zinc-900 font-extrabold' : 'text-white'
                      }`}
                    />
                    <button 
                      type="button"
                      onClick={() => setPrintCopies(c => Math.max(1, c + 1))}
                      className={`w-8 h-8 rounded hover:bg-zinc-200 flex items-center justify-center font-bold active:scale-90 select-none cursor-pointer ${
                        isLight ? 'text-zinc-700' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Info de Configuración de Impresora */}
                <div className={`border-t pt-3 flex flex-col space-y-1 text-[11px] font-mono ${
                  isRetro
                    ? 'border-t-zinc-400 text-zinc-700'
                    : isLight
                      ? 'border-t-zinc-200 text-zinc-500'
                      : 'border-t-zinc-700 text-[#c5cdd6]'
                }`}>
                  {config.labelPrinterBrand ? (
                    <>
                      <div className="flex justify-between">
                        <span>Impresora de etiquetas:</span>
                        <span className={isLight ? 'text-[#000080] font-bold uppercase' : 'text-sky-400 font-bold uppercase'}>{config.labelPrinterBrand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Puerto/Conector:</span>
                        <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>{config.labelPrinterInterface || 'USB'}</span>
                      </div>
                      {config.labelPrinterInterface === 'Ethernet' && config.labelPrinterIpAddress && (
                        <div className="flex justify-between">
                          <span>Dirección IP:</span>
                          <span className={isLight ? 'text-zinc-700 font-bold' : 'text-zinc-300 font-bold'}>{config.labelPrinterIpAddress}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`flex flex-col gap-2 pt-1 rounded-lg p-2 ${
                      isRetro ? 'bg-amber-50 border border-amber-300' : isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-950/30 border border-amber-800/40'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-base leading-none">⚠️</span>
                        <span className={`text-[10px] leading-tight ${isLight ? 'text-amber-800 font-bold' : 'text-amber-300 font-semibold'}`}>
                          No hay impresora de etiquetas configurada. Agrégala en Configuración para poder imprimir.
                        </span>
                      </div>
                      {(setActiveTab && setConfigSubTab) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPrintingItem(null);
                            setConfigSubTab('printer');
                            setActiveTab('Config');
                          }}
                          className={`self-end text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded cursor-pointer transition-all ${
                            isRetro
                              ? 'bg-[#000080] text-white hover:bg-[#0000aa] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700'
                              : isLight
                                ? 'bg-amber-500 text-black hover:bg-amber-600 rounded-lg'
                                : 'bg-amber-500 text-black hover:bg-amber-400 rounded-lg'
                          }`}
                        >
                          Configurar impresora →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* INSTRUCCIONES RÁPIDAS */}
              <div className={`p-3 text-[10.5px] space-y-1 font-mono border ${
                isRetro 
                  ? 'bg-white border-zinc-300 text-zinc-700 font-sans' 
                  : isLight 
                    ? 'bg-amber-500/5 border-amber-500/25 text-zinc-600' 
                    : 'bg-[#1b120c]/40 border-amber-950/20 text-[#bfb2a8]'
              }`}>
                <span className="font-bold text-amber-500 block uppercase">⚙️ Notas de automatización:</span>
                {config.labelPrinterBrand ? (
                  <p>• Los bytes crudos RAW de la etiqueta serán despachados mediante el puerto preconfigurado ({config.labelPrinterInterface || 'USB'}) de forma directa sin demoras.</p>
                ) : (
                  <p>• Configura una impresora de etiquetas en <strong>Configuración → Impresoras</strong> para habilitar la impresión automática.</p>
                )}
              </div>

            </div>

            {/* Pie del modal con acciones */}
            <div className={isRetro ? 'bg-[#dfdfdf] p-4 border-t-2 border-[#808080] flex justify-end gap-2.5 shrink-0' : isLight ? 'bg-zinc-50 p-4 border-t border-zinc-200 flex justify-end gap-2.5 shrink-0' : 'bg-[#13151a] p-4 border-t border-zinc-900 flex justify-end gap-2.5 shrink-0'}>
              <button
                type="button"
                onClick={() => {
                  setPrintingItem(null);
                  setPrintCopies(1);
                }}
                className={btnCancelClass}
              >
                Cerrar consulta
              </button>
              
              <button
                onClick={() => {
                  // Play dynamic subtle physical audio
                  try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                  } catch (e) {}

                  const eAPI = (window as any).electronAPI;

                  // Construir HTML de etiqueta usando la función centralizada
                  const buildLabelHtml = () => {
                    const singleLabel = buildProductLabelHtml(
                      { name: printingItem.name, price: printingItem.price, sku: printingItem.code, brand: printingItem.brand },
                      config
                    );
                    if (printCopies <= 1) return singleLabel;
                    // Para múltiples copias, repetir el body con page-break
                    const bodyMatch = singleLabel.match(/<body>([\s\S]*?)<\/body>/);
                    const headMatch = singleLabel.match(/<head>([\s\S]*?)<\/head>/);
                    const bodyContent = bodyMatch ? bodyMatch[1] : '';
                    const headContent = headMatch ? headMatch[1] : '';
                    const copies = Array.from({ length: printCopies }, (_, i) =>
                      i < printCopies - 1
                        ? bodyContent.replace('class="label" style="', 'class="label" style="page-break-after:always; ')
                        : bodyContent
                    ).join('');
                    return `<!DOCTYPE html><html><head>${headContent}</head><body>${copies}</body></html>`;
                  };

                  const dispatchPrintEvent = () => {
                    window.dispatchEvent(new CustomEvent('automated-print', {
                      detail: {
                        type: 'label',
                        id: printingItem.id,
                        name: `Etiqueta de Producto`,
                        copies: printCopies,
                        brand: config.labelPrinterBrand || 'Zebra ZD220',
                        port: config.labelPrinterInterface || 'USB',
                        details: `${printingItem.brand || ''} ${printingItem.name} [Código ${printingItem.code}]`
                      }
                    }));
                  };

                  const closePrinterModal = () => {
                    setPrintingItem(null);
                    setPrintCopies(1);
                  };

                  // Etiqueta adhesiva — isLabel:true → omitida silenciosamente en eco mode
                  const sizeKey = config.labelPaperSize || '51x25mm';
                  const [widthMm, heightMm] = sizeKey.replace('mm', '').split('x').map(Number);
                  const paperWidthMicrons = widthMm * 1000;
                  const paperHeightMicrons = heightMm * 1000;

                  window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: {
                    html: buildLabelHtml(),
                    deviceName: config.labelPrinterBrand || '',
                    copies: 1,
                    isLabel: true,
                    paperWidthMicrons,
                    paperHeightMicrons
                  }}));
                  dispatchPrintEvent();
                  closePrinterModal();
                }}
                style={isRetro ? { color: '#ffffff' } : undefined}
                className={isRetro
                  ? 'px-5 py-2 text-xs font-sans font-extrabold uppercase bg-[#000080] hover:bg-blue-800 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 active:border-t-zinc-600 active:border-l-zinc-600 active:border-b-white active:border-r-white cursor-pointer select-none flex items-center gap-1.5'
                  : 'px-5 py-2 text-xs font-black uppercase tracking-wide bg-sky-500 hover:bg-sky-450 text-[#090b0e] hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all rounded-xl cursor-pointer select-none active:scale-95 flex items-center gap-1.5'
                }
              >
                <Printer className="w-3.5 h-3.5" /> EMPEZAR IMPRESIÓN ({printCopies})
              </button>
            </div>
          </div>

          {/* CONTENEDOR OCULTO EN CLIENTE, PERO EXCLUSIVO PARA IMPRESIONES (Admite multiples copias repetidas) */}
          <div id="print-job-container" className="hidden">
            {Array.from({ length: printCopies }).map((_, idx) => (
              <div key={idx} className="printable-sticker-copy font-mono">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '7.5px', fontWeight: 'bold' }}>
                        {(config.storeName || 'TALLER FIXMANAGER').toUpperCase()}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                        {config.currencySymbol}{printingItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'sans-serif', textTransform: 'uppercase', padding: '1mm 0' }}>
                        {printingItem.name}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontSize: '6.5px', color: '#444', textTransform: 'uppercase' }}>
                        Marca: {printingItem.brand || 'Gral'} • ID: {printingItem.id}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', paddingTop: '1.5mm' }}>
                        {renderBarcodeLines(printingItem.code)}
                        <div style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '1.5px', marginTop: '0.5mm' }}>
                          {printingItem.code}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* MODAL: EDITAR / REGISTRAR ARTÍCULO */}
      {(editingItem || isAddingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className={modalCardClass + " max-w-lg w-full my-8"}>
            <div className={modalHeaderClass}>
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-amber-500'}`} />
                <h3 className={modalHeaderTitleClass}>
                  {isAddingNew ? '➕ Registrar Nuevo Artículo' : '✏️ Editar Artículo de Almacén'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingItem(null);
                }}
                className={isRetro 
                  ? "flex items-center justify-center w-5 h-5 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-black text-[11px] cursor-pointer"
                  : "text-gray-400 hover:text-white p-1 rounded-full bg-zinc-900 border border-zinc-800 cursor-pointer"
                }
              >
                {isRetro ? '×' : <X className="w-4 h-4" />}
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className={modalBodyClass}>
                {/* Tip de navegación por teclado */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold ${
                  isRetro ? (isLight ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-sky-950/20 border border-sky-800/30 text-sky-400')
                  : isLight ? 'bg-sky-50 border border-sky-200 text-sky-600'
                  : 'bg-sky-950/20 border border-sky-800/30 text-sky-400'
                }`}>
                  <span>⌨️</span>
                  <span>Puedes pasar de campo en campo con la tecla <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${isLight ? 'bg-white border border-zinc-300 text-zinc-700' : 'bg-zinc-800 border border-zinc-600 text-zinc-200'}`}>Enter</kbd> — al llegar al último campo presiona <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${isLight ? 'bg-white border border-zinc-300 text-zinc-700' : 'bg-zinc-800 border border-zinc-600 text-zinc-200'}`}>Enter</kbd> para guardar.</span>
                </div>



                {/* Imagen del Producto */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropImage}
                  className={`flex flex-col gap-2 p-3 border rounded-xl transition-all relative overflow-hidden ${
                    isDraggingImage
                      ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/50 scale-[1.01]'
                      : 'bg-zinc-950/20 dark:bg-zinc-900/30 border-zinc-200/5 dark:border-zinc-800/50'
                  }`}
                >
                  {isDraggingImage && (
                    <div className="pointer-events-none absolute inset-0 bg-blue-600/20 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-blue-400 font-black text-xs uppercase tracking-wider gap-1 animate-pulse">
                      <span className="text-2xl">📥</span>
                      <span>¡Suelta la imagen aquí!</span>
                    </div>
                  )}
                  <label className={labelClass}>Imagen del Producto (Clic o Arrastra para cambiar)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      id="prod-image-upload"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    
                    {formPreviewUrl ? (
                      <div className="relative w-20 h-20 rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden group select-none shrink-0 shadow-md">
                        <div 
                          onClick={handleOpenImageSourceModal}
                          className="w-full h-full block cursor-pointer"
                        >
                          <img src={formPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-black uppercase tracking-wider">
                            📷 Cambiar
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData({ ...formData, imageUrl: '' });
                          }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
                          title="Eliminar imagen"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={handleOpenImageSourceModal} 
                        className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 shrink-0 select-none cursor-pointer transition-all ${
                          isDraggingImage
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400 scale-105'
                            : isRetro ? 'bg-zinc-200 border-zinc-400 text-black hover:bg-zinc-300'
                            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/40 hover:border-blue-500 dark:hover:border-blue-400 text-zinc-550 dark:text-zinc-450'
                        }`}
                      >
                        <span className="text-[18px]">{isDraggingImage ? '📥' : '📷'}</span>
                        <span className="text-[9px] text-center font-black uppercase tracking-wider">{isDraggingImage ? 'Soltar' : 'Subir'}</span>
                      </div>
                    )}

                    <div className="flex-1 text-[11px] leading-relaxed text-zinc-550 dark:text-zinc-400">
                      <p className="font-bold">Formato cuadrado optimizado</p>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">Se recortará automáticamente desde el centro.</p>
                      <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold mt-1 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                          <span>📋</span>
                          <span>Presiona <kbd className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono text-[9px]">Ctrl + V</kbd> para pegar una imagen del portapapeles.</span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <span>🖱️</span>
                          <span>O arrastra y suelta una imagen directamente aquí (Drag & Drop).</span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Código de Barras EAN/UPC *</label>
                  <input
                    ref={refCodigo}
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    onKeyDown={onEnterNext(refCatBtn)}
                    className={inputClass}
                    placeholder="Ej. 750912300101"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className={labelClass}>Nombre Descriptivo del Artículo *</label>
                  <input
                    ref={refNombre}
                    type="text"
                    required
                    autoFocus
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value.toUpperCase();
                      const detectedCategory = inferCategory(newName);
                      const detectedSubcategory = detectedCategory === 'Accesorio' ? inferSubcategory(newName) : 'OTROS';
                      
                      let detectedBrand = formData.brand;
                      if (!detectedBrand || detectedBrand === 'GENÉRICO' || detectedBrand === '') {
                        for (const b of availableBrands) {
                          if (b !== 'GENÉRICO' && newName.includes(b)) {
                            detectedBrand = b;
                            break;
                          }
                        }
                      }

                      setFormData({
                        ...formData,
                        name: newName,
                        category: detectedCategory,
                        subcategory: detectedSubcategory,
                        brand: detectedBrand
                      });
                    }}
                    onKeyDown={onEnterNext(refCosto)}
                    className={inputClass}
                    placeholder="Ej. Vidrio Templado 15 D Pro, Funda Antigolpes..."
                  />
                </div>

                {/* Grid para Marca / Fabricante y Categoría */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Marca / Fabricante — dropdown editable */}
                  <div ref={brandDropRef} className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelClass}>Marca / Fabricante</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBrandDropOpen(v => !v)}
                      className={selectClass + ' text-left flex items-center justify-between w-full'}
                    >
                      <span>{formData.brand || 'GENÉRICO'}</span>
                      <span className={`text-[10px] ml-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>▾</span>
                    </button>
                    {brandDropOpen && (
                      <div className={`absolute z-50 top-full mt-1 w-full rounded-md shadow-2xl overflow-hidden border ${
                        isRetro
                          ? 'bg-[#ece9d8] border-zinc-500 text-black'
                          : isLight
                            ? 'bg-white border-zinc-200 text-zinc-900'
                            : 'bg-zinc-900 border-zinc-700 text-white shadow-black/80'
                      }`} style={{ minWidth: '160px' }}>
                        <div ref={brandListRef} className="max-h-44 overflow-y-auto">
                          {availableBrands.map((b, idx) => (
                            <div
                              key={b}
                              onMouseEnter={() => setBrandHighlight(idx)}
                              className={`flex items-center justify-between px-3 py-2 cursor-pointer group transition-colors ${
                                (formData.brand || 'GENÉRICO') === b
                                  ? (isRetro ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white')
                                  : (isRetro ? 'text-black hover:bg-blue-100' : isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-zinc-800')
                              }`}
                            >
                              <span
                                className="flex-1 text-xs font-medium select-none"
                                onClick={() => { setFormData({ ...formData, brand: b }); setBrandDropOpen(false); }}
                              >{b}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBrand(b);
                                  if (formData.brand === b) setFormData({ ...formData, brand: availableBrands.find(x => x !== b) || 'GENÉRICO' });
                                }}
                                className={`ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                  (formData.brand || 'GENÉRICO') === b ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-red-400 hover:bg-red-500/20'
                                }`}
                                title={`Eliminar "${b}"`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className={`border-t px-2 py-2 flex gap-1.5 ${
                          isRetro
                            ? 'border-zinc-400 bg-[#dfdfdf]'
                            : isLight
                              ? 'border-zinc-100 bg-zinc-50'
                              : 'border-zinc-800 bg-zinc-950/80'
                        }`}>
                          <input
                            type="text"
                            value={newBrandInput}
                            onChange={e => setNewBrandInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addBrand(newBrandInput);
                                setNewBrandInput('');
                                setBrandDropOpen(false);
                              }
                            }}
                            placeholder="Nueva marca..."
                            className={`flex-1 text-[11px] px-2 py-1 rounded border focus:outline-none focus:border-blue-400 ${
                              isRetro
                                ? 'border-zinc-400 bg-white text-black'
                                : isLight
                                  ? 'border-zinc-200 bg-white text-zinc-900'
                                  : 'border-zinc-700 bg-zinc-900 text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              addBrand(newBrandInput);
                              setNewBrandInput('');
                              setBrandDropOpen(false);
                            }}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categoría — dropdown editable */}
                  <div ref={catDropRef} className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelClass}>Categoría</label>
                      {formData.name.trim().length > 2 && (
                        <span className={`text-[9px] font-medium font-sans ${isRetro ? 'text-blue-800' : isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>✨ Inteligente</span>
                      )}
                    </div>
                    <button
                      ref={refCatBtn}
                      type="button"
                      onClick={() => setCatDropOpen(v => !v)}
                      onKeyDown={handleCatKeyDown}
                      className={selectClass + ' text-left flex items-center justify-between w-full'}
                    >
                      <span>{formData.category}</span>
                      <span className={`text-[10px] ml-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>▾</span>
                    </button>
                    {catDropOpen && (
                      <div className={`absolute z-50 top-full mt-1 w-full rounded-md shadow-2xl overflow-hidden border ${
                        isRetro
                          ? 'bg-[#ece9d8] border-zinc-500 text-black'
                          : isLight
                            ? 'bg-white border-zinc-200 text-zinc-900'
                            : 'bg-zinc-900 border-zinc-700 text-white shadow-black/80'
                      }`} style={{ minWidth: '160px' }}>
                        <div ref={catListRef} className="max-h-44 overflow-y-auto">
                          {categories.map((cat, idx) => (
                            <div
                              key={cat}
                              onMouseEnter={() => setCatHighlight(idx)}
                              className={`flex items-center justify-between px-3 py-2 cursor-pointer group transition-colors ${
                                catHighlight === idx || (formData.category === cat)
                                  ? (isRetro ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white')
                                  : (isRetro ? 'text-black hover:bg-blue-100' : isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-zinc-800')
                              }`}
                            >
                              <span
                                className="flex-1 text-xs font-medium select-none"
                                onClick={() => { setFormData({ ...formData, category: cat }); setCatDropOpen(false); }}
                              >{cat}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeCategory(cat); if (formData.category === cat) setFormData({ ...formData, category: categories.find(c => c !== cat) || '' }); }}
                                className={`ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                  catHighlight === idx || (formData.category === cat) ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-red-400 hover:bg-red-500/20'
                                }`}
                                title={`Eliminar "${cat}"`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className={`border-t px-2 py-2 flex gap-1.5 ${
                          isRetro
                            ? 'border-zinc-400 bg-[#dfdfdf]'
                            : isLight
                              ? 'border-zinc-100 bg-zinc-50'
                              : 'border-zinc-800 bg-zinc-950/80'
                        }`}>
                          <input
                            type="text"
                            value={newCatInput}
                            onChange={e => setNewCatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(newCatInput); setNewCatInput(''); } }}
                            placeholder="Nueva categoría..."
                            className={`flex-1 text-[11px] px-2 py-1 rounded border focus:outline-none focus:border-blue-400 ${
                              isRetro
                                ? 'border-zinc-400 bg-white text-black'
                                : isLight
                                  ? 'border-zinc-200 bg-white text-zinc-900'
                                  : 'border-zinc-700 bg-zinc-900 text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => { addCategory(newCatInput); setNewCatInput(''); }}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campos de Costo, Precio de Venta y Mayoreo */}
                <div className={
                  isRetro
                    ? 'grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 bg-[#eaeef3] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white rounded-none'
                    : isLight
                      ? 'grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl'
                      : 'grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 bg-[#141519] border border-zinc-700/60 rounded-xl'
                }>
                  {/* Costo */}
                  <div className="space-y-1.5 align-left">
                    <label className={`${labelClass} min-h-[28px] flex items-end pb-0.5`}>
                      Costo Unitario de Compra ({config.currencySymbol}) *
                    </label>
                    <div className="flex border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white w-full min-w-0">
                      <span className="flex items-center px-2.5 text-zinc-700 font-mono text-sm font-black border-r border-zinc-300 bg-zinc-100 select-none pointer-events-none">
                        {config.currencySymbol}
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        ref={refCosto}
                        value={formData.cost === 0 ? '' : formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setFormData(p => ({ ...p, cost: v })); }}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={onEnterNext(refPrecio)}
                        className="flex-1 w-full min-w-0 bg-white px-3 py-2 text-xs text-black focus:outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Precio de venta */}
                  <div className="space-y-1.5 align-left">
                    <label className={`${labelClass} min-h-[28px] flex items-end pb-0.5`}>
                      Precio Público de Venta ({config.currencySymbol}) *
                    </label>
                    <div className="flex border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white w-full min-w-0">
                      <span className="flex items-center px-2.5 text-zinc-700 font-mono text-sm font-black border-r border-zinc-300 bg-zinc-100 select-none pointer-events-none">
                        {config.currencySymbol}
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        ref={refPrecio}
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setFormData(p => ({ ...p, price: v })); }}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={onEnterNext(refMayoreo)}
                        className="flex-1 w-full min-w-0 bg-white px-3 py-2 text-xs text-black focus:outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Precio de Mayoreo */}
                  <div className="space-y-1.5 align-left">
                    <label className={`${labelClass} min-h-[28px] flex items-end pb-0.5`}>
                      Precio de Mayoreo ({config.currencySymbol}) *
                    </label>
                    <div className="flex border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white w-full min-w-0">
                      <span className="flex items-center px-2.5 text-zinc-700 font-mono text-sm font-black border-r border-zinc-300 bg-zinc-100 select-none pointer-events-none">
                        {config.currencySymbol}
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        ref={refMayoreo}
                        value={formData.wholesalePrice === 0 ? '' : formData.wholesalePrice}
                        onChange={(e) => setFormData({ ...formData, wholesalePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; e.target.value = v > 0 ? String(v) : ''; setFormData(p => ({ ...p, wholesalePrice: v })); }}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={onEnterNext(refStock)}
                        className="flex-1 w-full min-w-0 bg-white px-3 py-2 text-xs text-black focus:outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Margen Informativo en Modal */}
                <div className={marginInfoBg}>
                  <span className={isLight ? 'text-zinc-600 font-bold' : 'text-zinc-400'}>Margen proyectado unitario:</span>
                  <span className={`font-bold ${formData.price >= formData.cost ? (isLight ? 'text-emerald-800' : 'text-teal-400') : (isLight ? 'text-red-700' : 'text-rose-450')}`}>
                    {formData.price >= formData.cost ? '+' : ''}
                    {config.currencySymbol}{(formData.price - formData.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {formData.price > 0 && ` (${(((formData.price - formData.cost) / formData.price) * 100).toFixed(0)}%)`}
                  </span>
                </div>

                {/* Error de validación precio < costo */}
                {formData.price > 0 && formData.cost > 0 && formData.price < formData.cost && (
                  <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-bold ${
                    isRetro ? 'bg-red-50 border-red-400 text-red-800'
                    : isLight ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-red-950/30 border-red-700/50 text-red-400'
                  }`}>
                    <span className="shrink-0 text-base">🚫</span>
                    <span>El precio público ({config.currencySymbol}{Number(formData.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) es menor que el costo unitario ({config.currencySymbol}{Number(formData.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estarías vendiendo a pérdida — corrige el precio antes de guardar.</span>
                  </div>
                )}

                {/* Error general de validación */}
                {formError && (
                  <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-bold ${
                    isRetro ? 'bg-red-50 border-red-400 text-red-800'
                    : isLight ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-red-950/30 border-red-700/50 text-red-400'
                  }`}>
                    <span className="shrink-0 text-base">🚫</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* Sección de existencias e inventario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2 py-1 select-none">
                    <input
                      type="checkbox"
                      id="formManageStock"
                      checked={formData.manageStock !== false}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          manageStock: e.target.checked,
                          stock: e.target.checked ? formData.stock : 0,
                          minStock: e.target.checked ? formData.minStock : 0
                        });
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="formManageStock" className={chkLabelClass}>
                      Manejar existencias / stock físico en almacén
                    </label>
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2 py-1 select-none">
                    <input
                      type="checkbox"
                      id="formIsChip"
                      checked={formData.isChip === true}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          isChip: e.target.checked
                        });
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="formIsChip" className={chkLabelClass}>
                      Es un Chip / Tarjeta SIM (Permite registrar datos de activación en POS)
                    </label>
                  </div>

                  {formData.manageStock !== false ? (
                    <>
                      {/* Stock Actual */}
                      <div>
                        <label className={labelClass}>Unidades en Almacén *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          ref={refStock}
                          value={formData.stock === 0 && !editingItem ? '' : formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                          onKeyDown={onEnterNext(refMinStock)}
                          onFocus={(e) => e.target.select()}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>

                      {/* Stock Mínimo */}
                      <div>
                        <label className={labelClass}>Stock Mínimo Alerta *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          ref={refMinStock}
                          value={formData.minStock}
                          onChange={(e) => setFormData({ ...formData, minStock: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                          onKeyDown={onEnterNext(refCosto)}
                          onFocus={(e) => e.target.select()}
                          className={inputClass}
                        />
                      </div>
                    </>
                  ) : (
                    <div className={`col-span-1 sm:col-span-2 p-3 rounded-lg text-xs font-medium leading-relaxed ${
                      isRetro ? 'bg-zinc-300 border border-zinc-400 text-zinc-800'
                      : isLight ? 'bg-slate-50 border border-slate-200 text-slate-650'
                      : 'bg-zinc-950/45 border border-zinc-850/60 text-zinc-450'
                    }`}>
                      ℹ️ <strong>Bajo pedido (Sin inventario):</strong> El artículo no controlará existencias físicas. Se asume que no requiere stock en almacén y se surtirá al momento de realizar la reparación o venta.
                    </div>
                  )}
                </div>

                {/* Favorito / Destacado */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-favorite"
                    checked={formData.favorite}
                    onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
                    className={isRetro 
                      ? "w-4 h-4 bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black cursor-pointer"
                      : "rounded border-[#2d2f36] bg-[#1c1e24] text-amber-500 focus:ring-amber-500 cursor-pointer"
                    }
                  />
                  <label htmlFor="chk-favorite" className={chkLabelClass}>
                    Marcar como "Favorito" (Se muestra primero en Nueva y Punto de Venta)
                  </label>
                </div>

                {/* HISTORIAL DE PROVEEDORES (SURTIDOS HISTÓRICOS DE ESTE ARTÍCULO) */}
                {!isAddingNew && editingItem && (
                  <div className={`mt-5 pt-4 border-t ${isRetro ? 'border-zinc-400' : 'border-zinc-800'}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                      isRetro ? 'text-blue-900 font-bold' : isLight ? 'text-zinc-800' : 'text-amber-500'
                    }`}>
                      📊 Historial de Proveedores
                    </h4>
                    {itemProvidersHistory.length === 0 ? (
                      <p className={`text-[11px] italic ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        No se han registrado surtidos históricos para este artículo.
                      </p>
                    ) : (
                      <div className={`overflow-x-auto rounded border max-h-48 overflow-y-auto ${
                        isRetro ? 'bg-white border-zinc-400 shadow-sm animate-fadeIn' : isLight ? 'bg-zinc-50/50 border-zinc-200 shadow-sm animate-fadeIn' : 'bg-[#0a0b0e] border-[#1e2025] animate-fadeIn'
                      }`}>
                        <table className="w-full text-left border-collapse text-[10.5px]">
                          <thead>
                            <tr className={`uppercase font-black text-[9px] tracking-wider border-b select-none ${
                              isRetro ? 'bg-zinc-100 text-zinc-650 border-zinc-300' : isLight ? 'bg-zinc-100/80 text-zinc-500 border-zinc-200' : 'bg-black/30 text-zinc-400 border-zinc-800/80'
                            }`}>
                              <th className="py-1.5 px-2.5">Proveedor</th>
                              <th className="py-1.5 px-2 text-center">Fecha</th>
                              <th className="py-1.5 px-2 text-center">Cantidad</th>
                              <th className="py-1.5 px-2 text-right">Costo Unitario</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isRetro ? 'divide-zinc-200' : isLight ? 'divide-zinc-100' : 'divide-zinc-800/60'}`}>
                            {itemProvidersHistory.map((historyLog, logIdx) => (
                              <tr 
                                key={logIdx} 
                                className={`${isRetro ? 'text-zinc-800 hover:bg-zinc-50' : isLight ? 'text-zinc-700 hover:bg-zinc-100/50' : 'text-zinc-300 hover:bg-[#121316]'}`}
                              >
                                <td className="py-1.5 px-2.5 font-bold truncate max-w-[150px]" title={historyLog.provider}>
                                  {historyLog.provider}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono">
                                  {new Date(historyLog.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono">
                                  {historyLog.qty} pz
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold">
                                  {config.currencySymbol}{historyLog.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={modalFooterClass}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingItem(null);
                  }}
                  className={btnCancelClass}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formData.price > 0 && formData.cost > 0 && formData.price < formData.cost}
                  className={`${btnSubmitClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isAddingNew ? 'REGISTRAR ARTÍCULO' : 'GUARDAR CAMBIOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className={`max-w-sm w-full overflow-hidden shadow-2xl ${
            isRetro
              ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 font-sans text-black'
              : isLight
              ? 'bg-white border border-zinc-200 rounded-xl text-zinc-900'
              : 'bg-[#121316] border border-rose-950/40 rounded-xl text-white'
          }`}>
            <div className="p-5 flex flex-col items-center text-center space-y-4">
              <div className={`p-3 rounded-full ${isRetro ? 'bg-rose-100 border-2 border-rose-400' : isLight ? 'bg-rose-50 border border-rose-200' : 'bg-rose-950/40 border border-rose-800/30'}`}>
                <AlertTriangle className={`w-8 h-8 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              </div>
              <div className="space-y-2">
                <h4 className={`font-black uppercase tracking-widest text-sm ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>¿Eliminar del Inventario?</h4>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>
                  Esta acción es irreversible. El artículo será removido del inventario del taller y su registro de stock desaparecerá.
                </p>
                {(() => {
                  const item = inventory.find(i => i.id === confirmDeleteId);
                  return item ? (
                    <p className={`text-[11px] font-mono p-1.5 mt-1 rounded border ${isRetro ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-[#181a1f] border-zinc-800 text-zinc-400'}`}>
                      [{item.code}] {item.name.toUpperCase()}
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
            <div className={`p-4 border-t flex items-center justify-end gap-2 ${isRetro ? 'bg-[#cbcbcb] border-zinc-400' : isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0e0f12] border-[#1c1d22]'}`}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className={`px-3.5 py-1.5 text-xs rounded transition-colors cursor-pointer ${isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-700' : isLight ? 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600' : 'bg-transparent border border-zinc-700 text-zinc-400 hover:text-white'}`}
              >
                No, conservar
              </button>
              <button
                onClick={() => {
                  const item = inventory.find(i => i.id === confirmDeleteId);
                  if (item) handleDeleteItem(item.id, item.name);
                }}
                className="px-4 py-1.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
              >
                Sí, eliminar artículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para elegir método de subida de imagen (Computadora o Celular QR) */}
      {showImageSourceModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in font-sans text-left">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col ${
            isRetro ? 'bg-[#dfdfdf] border-zinc-500 rounded-none' 
            : isLight ? 'bg-white border-zinc-200 text-slate-800' 
            : 'bg-[#181d28] border-slate-800 text-white'
          }`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center ${
              isRetro ? 'bg-[#000080] text-white border-b-2' 
              : isLight ? 'bg-slate-50 border-zinc-200' 
              : 'bg-slate-900/50 border-slate-800'
            }`}>
              <h3 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                📷 Método de Carga de Imagen
              </h3>
              <button
                type="button"
                onClick={() => setShowImageSourceModal(false)}
                className={`p-1 rounded-md transition-colors ${
                  isRetro ? 'hover:bg-red-800 !text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              
              {/* Opción 1: Desde la computadora */}
              <div 
                onClick={() => {
                  setShowImageSourceModal(false);
                  setTimeout(() => {
                    document.getElementById('prod-image-upload')?.click();
                  }, 100);
                }}
                className={`p-4 rounded-2xl border border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isRetro 
                    ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300 text-black' 
                    : 'bg-slate-100/10 hover:bg-slate-100/20 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400'
                }`}
              >
                <span className="text-2xl">💻</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Subir desde esta Computadora</h4>
                  <p className="text-[10px] text-zinc-400">Selecciona una imagen guardada en tu disco local.</p>
                </div>
              </div>

              {/* Opción 2: Pegar del Portapapeles (Ctrl+V) */}
              <div 
                onClick={async () => {
                  try {
                    if (navigator.clipboard && navigator.clipboard.read) {
                      const items = await navigator.clipboard.read();
                      for (const item of items) {
                        const imageType = item.types.find(t => t.startsWith('image/'));
                        if (imageType) {
                          const blob = await item.getType(imageType);
                          const base64 = await processImageBlobToSquareBase64(blob);
                          setFormData(prev => ({ ...prev, imageUrl: base64 }));
                          showUiToast?.('📋 ¡Imagen pegada desde el portapapeles!', 'success');
                          setShowImageSourceModal(false);
                          return;
                        }
                      }
                    }
                    showUiToast?.('Presiona Ctrl+V o Cmd+V para pegar la captura o foto copiada', 'info');
                  } catch (err) {
                    showUiToast?.('Presiona Ctrl+V o Cmd+V en cualquier momento para pegar la imagen', 'info');
                  }
                }}
                className={`p-4 rounded-2xl border border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isRetro 
                    ? 'bg-blue-100 border-blue-400 hover:bg-blue-200 text-blue-950' 
                    : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/40 hover:border-blue-400 text-blue-400'
                }`}
              >
                <span className="text-2xl">📋</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Pegar desde Portapapeles (Ctrl + V)</h4>
                  <p className="text-[10px] opacity-80">Haz clic aquí o presiona <kbd className="px-1 py-0.5 rounded bg-black/20 font-mono">Ctrl+V</kbd> para pegar la captura o imagen copiada.</p>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-250 dark:border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">O también</span>
                <div className="flex-grow border-t border-zinc-250 dark:border-zinc-800"></div>
              </div>

              {/* Opción 2: Escanear QR con Celular */}
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-1">📱</span>
                <h4 className="text-xs font-black uppercase tracking-wider">Escanear con tu Celular</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  Escanea el código QR desde tu celular (debe estar en la misma red Wi-Fi) para tomar la foto directamente con la cámara del celular.
                </p>

                <div className="mt-4 p-3 bg-white rounded-2xl border border-zinc-200 shadow-lg select-none">
                  {imageQrCodeUrl ? (
                    <img src={imageQrCodeUrl} alt="QR Code Link" className="w-36 h-36" />
                  ) : (
                    <div className="animate-pulse w-36 h-36 bg-zinc-100 dark:bg-zinc-850 rounded-xl" />
                  )}
                </div>

                <span className="text-[9px] font-mono mt-3 px-2 py-1.5 rounded-lg border select-all shadow-inner bg-zinc-100/60 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 break-all text-zinc-600 dark:text-zinc-400 max-w-xs text-center block w-full">
                  http://{localIp}:{localPort}/product-upload?sessionId={uploadSessionId}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end gap-2 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-slate-900/50 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => setShowImageSourceModal(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700' 
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
                }`}
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      <ImportInventoryModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        inventory={inventory}
        onSetInventory={onSetInventory}
        config={config}
        setFeedback={setFeedback}
        categories={categories}
        saveCats={saveCats}
      />

      <BatchPhotoAssignerModal
        isOpen={isBatchPhotoModalOpen}
        onClose={() => setIsBatchPhotoModalOpen(false)}
        inventory={inventory}
        refacciones={refacciones || []}
        onSetInventory={onSetInventory}
        onSetRefacciones={onSetRefacciones}
        config={config}
      />
    </div>
  );
}

// ── COMPONENTE OPTIMIZADO: MODAL DE IMPORTACIÓN AISLADO PARA MEJORAR EL RENDIMIENTO ──
interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onSetInventory?: (inventory: InventoryItem[]) => void;
  config: WorkshopConfig;
  setFeedback: (msg: string | null) => void;
  categories: string[];
  saveCats: (cats: string[]) => void;
}

export function ImportInventoryModal({
  isOpen,
  onClose,
  inventory,
  onSetInventory,
  config,
  setFeedback,
  categories,
  saveCats,
}: ImportInventoryModalProps) {
  const isRetro = config.theme === 'retro-window';
  const isLight = config.themeMode === 'light';

  // Excel and spreadsheet import states (localizados para evitar re-renderizar StockView)
  const [tempImportedItems, setTempImportedItems] = useState<InventoryItem[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0 });
  const [localError, setLocalError] = useState<string | null>(null);
  const [importReplaceMode, setImportReplaceMode] = useState(false); // false = append, true = replace
  const [rawImportedRows, setRawImportedRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  // Estados para la previsualización detallada e interactiva (localizados)
  const [isDetailedPreviewOpen, setIsDetailedPreviewOpen] = useState(false);
  const [previewSearchTerm, setPreviewSearchTermRaw] = useState('');
  const setPreviewSearchTerm = (val: string) => {
    setPreviewSearchTermRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(25);

  // Filtrar en base al término de búsqueda para la previsualización completa
  const filteredPreviewItems = React.useMemo(() => {
    if (!previewSearchTerm.trim()) return tempImportedItems;
    const normSearch = normalizeText(previewSearchTerm);
    return tempImportedItems.filter(it => 
      normalizeText(it.name).includes(normSearch) ||
      normalizeText(it.code).includes(normSearch) ||
      normalizeText(it.brand).includes(normSearch)
    );
  }, [tempImportedItems, previewSearchTerm]);

  // Resetear página si el filtro de búsqueda de la previsualización cambia
  React.useEffect(() => {
    setPreviewPage(1);
  }, [previewSearchTerm]);

  const totalPreviewPages = Math.ceil(filteredPreviewItems.length / previewRowsPerPage) || 1;
  const paginatedPreviewItems = React.useMemo(() => {
    const startIdx = (previewPage - 1) * previewRowsPerPage;
    return filteredPreviewItems.slice(startIdx, startIdx + previewRowsPerPage);
  }, [filteredPreviewItems, previewPage, previewRowsPerPage]);

  const handleDownloadTemplate = () => {
    const headers = "Codigo,Nombre,Marca,Categoria,Costo,Precio,Mayoreo,Stock,Minimo,Favorito,Manejar Inventario\n";
    const row1 = "750100200301,PANTALLA DISPLAY IPHONE 13,Apple,Refacción,450.00,850.00,750.00,15,3,no,si\n";
    const row2 = "750100407122,VIDRIO TEMPLADO 9D,Gbox,Accesorio,15.00,80.00,70.00,50,10,si,si\n";
    const row3 = "750100511899,PEGAMENTO T7000 NEGRO,Zhanlida,Consumible,40.00,99.00,90.00,8,2,no,si\n";
    const row4 = "SERV-001,INSTALACIÓN EXPRESS,GENÉRICO,Servicios,0.00,150.00,150.00,0,0,no,no\n";
    // Using BOM so Excel opens with Spanish UTF-8 accents seamlessly
    const csvContent = "\uFEFF" + headers + row1 + row2 + row3 + row4;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const doc = document;
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_ajustes_inventario.csv");
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null); // Clear any previous errors

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
          const isMacro = file.name.endsWith('.xlsm') || file.name.endsWith('.xltm');
          setLocalError(
            isMacro 
              ? 'El archivo contiene macros (.xlsm). Las macros bloquean la lectura automática segura. Por favor, guarde el archivo como un libro de Excel estándar (.xlsx) sin macros o como CSV e intente de nuevo.'
              : `No se pudo parsear el archivo Excel. Asegúrese de que no esté corrupto o protegido con contraseña. Detalle: ${readErr.message || readErr}`
          );
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
        
        // Convert to array of JSON rows
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

        // Obtener todos los encabezados del archivo Excel
        const headersSet = new Set<string>();
        rawJson.forEach(row => {
          Object.keys(row).forEach(k => headersSet.add(k));
        });
        const headers = Array.from(headersSet);
        setDetectedHeaders(headers);
        setRawImportedRows(rawJson);

        // Generar el mapeo inteligente automático inicial
        const initialMapping = autoMapHeaders(headers);
        setColumnMapping(initialMapping);

        // Parsear filas usando este mapeo inicial
        const parsedItems = parseRowsWithMapping(rawJson, initialMapping);
        setTempImportedItems(parsedItems);
        setImportStats({ total: rawJson.length, valid: parsedItems.length });
      } catch (err: any) {
        console.error(err);
        setLocalError(`Error inesperado al importar. Detalle: ${err.message || err}`);
      }
    };
    reader.onerror = (evt) => {
      console.error(evt);
      setLocalError('Error de lectura física del archivo desde el disco. Compruebe los permisos del archivo.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyImport = () => {
    if (!onSetInventory || tempImportedItems.length === 0) return;
    setIsImporting(true);

    setTimeout(() => {
      try {
        // Dynamically add and save any new imported categories
        const uniqueCategories = Array.from(new Set(tempImportedItems.map(it => it.category as string)));
        const newCategoriesList = [...categories];
        let hasNewCategory = false;
        uniqueCategories.forEach(cat => {
          if (cat && typeof cat === 'string' && !newCategoriesList.includes(cat)) {
            newCategoriesList.push(cat);
            hasNewCategory = true;
          }
        });
        if (hasNewCategory) {
          saveCats(newCategoriesList);
        }

        if (importReplaceMode) {
          onSetInventory(tempImportedItems);
          setFeedback(`✅ Inventario REEMPLAZADO con éxito. Se cargaron ${tempImportedItems.length} artículos nuevos.`);
        } else {
          // Append mode: Merge items
          onSetInventory([...tempImportedItems, ...inventory]);
          setFeedback(`✅ Inventario IMPORTADO con éxito. Se añadieron ${tempImportedItems.length} artículos al stock actual.`);
        }

        onClose();
        setIsDetailedPreviewOpen(false);
        setTempImportedItems([]);
        setImportStats({ total: 0, valid: 0 });
        setPreviewSearchTerm('');
        setPreviewPage(1);
      } catch (err) {
        console.error(err);
        setFeedback('⚠️ Error al procesar e importar la base de datos.');
      } finally {
        setIsImporting(false);
      }
    }, 150);

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const inputClass = isRetro
    ? 'w-full bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-black text-xs px-3 py-1.5 focus:outline-none font-mono'
    : isLight
      ? 'w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-amber-500'
      : 'w-full bg-[#1c1e24] border border-[#2d2f36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono';

  const searchInputClass = `pl-9 ${inputClass}`;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
        <div className={`rounded-lg max-w-2xl w-full overflow-hidden shadow-2xl my-8 relative ${
          isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
          : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
          : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
        }`}>
          {isImporting && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-fadeIn">
              <div className={`p-6 rounded-xl flex flex-col items-center gap-4 text-center max-w-sm border ${
                isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans shadow-lg'
                : isLight ? 'bg-white shadow-xl text-zinc-900 border border-zinc-200 rounded-2xl'
                : 'bg-[#121316] border border-zinc-800 text-zinc-100 shadow-2xl rounded-2xl'
              }`}>
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest font-mono">Procesando Importación</h4>
                  <p className={`text-[10px] mt-1.5 leading-relaxed ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                    Guardando {tempImportedItems.length} artículos en la base de datos de FixManager. Por favor, no cierres la ventana...
                  </p>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-amber-500 animate-[progressBar_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>
          )}
          <div className={`flex items-center justify-between p-4 border-b ${
            isRetro ? 'bg-[#000080] border-[#808080]'
            : isLight ? 'bg-zinc-50 border-zinc-200'
            : 'bg-[#0e0f12] border-[#1c1d22]'
          }`}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-purple-500'}`} />
              <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                📂 Importar Inventario desde Excel / CSV
              </h3>
            </div>
            <button
              onClick={() => {
                onClose();
                setIsDetailedPreviewOpen(false);
                setTempImportedItems([]);
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

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-left">
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
                {['Codigo', 'Nombre', 'Marca', 'Categoria', 'Costo', 'Precio', 'Mayoreo', 'Stock', 'Minimo', 'Favorito'].map(col => {
                  let badgeClass = isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-800 text-zinc-200';
                  if (col === 'Nombre') {
                    badgeClass = isLight ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold' : 'bg-zinc-900 border-zinc-800 text-amber-500 font-bold';
                  } else if (col === 'Categoria') {
                    badgeClass = isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-900 border-zinc-800 text-emerald-400';
                  }
                  return (
                    <span key={col} className={`border px-2 py-0.5 rounded ${badgeClass}`}>
                      {col}{col === 'Nombre' ? ' *' : ''}
                    </span>
                  );
                })}
              </div>
              <p className={`text-[10px] italic ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                💡 El único campo obligatorio es <span className={isLight ? 'text-zinc-800 font-bold' : 'text-zinc-300'}>Nombre</span>. La Categoría se inferirá si se omite.
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
                  <input type="radio" name="import-mode" checked={!importReplaceMode} onChange={() => setImportReplaceMode(false)} className="text-purple-600" />
                  <span className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Adicionar al Almacén</span>
                </div>
                <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                  Se sumarán los artículos importados al stock existente.
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
                  <input type="radio" name="import-mode" checked={importReplaceMode} onChange={() => setImportReplaceMode(true)} className="text-rose-500" />
                  <span className={`text-xs font-bold ${isRetro ? (isLight ? 'text-red-800' : 'text-red-300') : isLight ? 'text-rose-700' : 'text-rose-400'}`}>Reemplazar Inventario</span>
                </div>
                <p className={`text-[10px] mt-1 pl-5 ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
                  ¡Cuidado! Se eliminará el inventario actual para cargar únicamente los del Excel.
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

            {tempImportedItems.length > 0 && (
              <div className="space-y-4 pt-2 animate-fadeIn font-mono">
                {/* PANEL DE MAPEADOR DE COLUMNAS INTERACTIVO */}
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
                    {MAPPABLE_FIELDS.map(field => {
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
                              const parsed = parseRowsWithMapping(rawImportedRows, updatedMapping);
                              setTempImportedItems(parsed);
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

                {/* ACCESO A PREVISUALIZACIÓN DETALLADA */}
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
                    <Search className="w-3.5 h-3.5" /> Ver Listado Completo ({tempImportedItems.length} art.)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`p-4 border-t flex justify-end gap-2 ${
            isRetro ? 'bg-[#dfdfdf] border-zinc-500'
            : isLight ? 'bg-zinc-50 border-zinc-200'
            : 'bg-[#0e0f12] border-[#1c1d22]'
          }`}>
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsDetailedPreviewOpen(false);
                setTempImportedItems([]);
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
              disabled={tempImportedItems.length === 0}
              onClick={handleApplyImport}
              className={`px-5 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 ${
                tempImportedItems.length > 0
                  ? isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 cursor-pointer'
                    : isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg'
                  : isRetro ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-400'
                    : isLight ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> CONFIRMAR E IMPORTAR ({tempImportedItems.length} ARTÍCULOS)
            </button>
          </div>
        </div>
      </div>

      {isDetailedPreviewOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
          <div className={`rounded-lg max-w-6xl w-full overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh] ${
            isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-black font-sans'
            : isLight ? 'bg-white border border-zinc-200 text-zinc-900'
            : 'bg-[#121316] border border-[#2d2f36] text-zinc-100'
          }`}>
            {/* Cabecera del Modal */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
              isRetro ? 'bg-[#000080] border-[#808080] text-white'
              : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-[#0e0f12] border-[#1c1d22] text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Search className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-amber-500'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isRetro ? 'text-white' : isLight ? 'text-zinc-800' : 'text-white'}`}>
                  🔍 Previsualización Detallada de Importación ({tempImportedItems.length} Artículos)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider font-mono ${
                  importReplaceMode
                    ? 'bg-rose-950/30 text-rose-450 border-rose-900/50'
                    : 'bg-emerald-950/30 text-emerald-450 border-emerald-900/50'
                }`}>
                  Modo: {importReplaceMode ? 'Reemplazar todo' : 'Adicionar al almacén'}
                </span>
                <button
                  onClick={() => setIsDetailedPreviewOpen(false)}
                  className={`p-1 rounded-full cursor-pointer ${
                    isRetro ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                    : isLight ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 border border-zinc-300'
                    : 'text-gray-400 hover:text-white bg-zinc-900 border border-zinc-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal */}
            <div className={`p-6 space-y-4 overflow-y-auto flex-1 text-left ${
              isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-white' : 'bg-[#121316]'
            }`}>
              {/* Buscador e info rápida */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por nombre, código o marca en la lista..."
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
                    Filtro: <strong>{filteredPreviewItems.length}</strong> de <strong>{tempImportedItems.length}</strong>
                  </span>
                </div>
              </div>

              {/* Tabla de Artículos */}
              <div className={`border rounded-xl overflow-hidden shadow-sm ${
                isRetro ? 'border-zinc-400 bg-white'
                : isLight ? 'border-zinc-200 bg-white'
                : 'border-zinc-800 bg-[#17181d]'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${
                        isRetro ? 'bg-[#000080] text-white border-zinc-400'
                        : isLight ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}>
                        <th className="p-3 font-bold">Código / SKU</th>
                        <th className="p-3 font-bold">Nombre / Artículo</th>
                        <th className="p-3 font-bold">Marca</th>
                        <th className="p-3 font-bold text-center">Categoría</th>
                        <th className="p-3 font-bold text-right">Costo</th>
                        <th className="p-3 font-bold text-right">Precio</th>
                        <th className="p-3 font-bold text-center">Stock</th>
                        <th className="p-3 font-bold text-center">Mín. Alerta</th>
                        <th className="p-3 font-bold text-center">Favorito</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono ${
                      isRetro ? 'divide-zinc-200 text-zinc-900 bg-white'
                      : isLight ? 'divide-zinc-200 text-zinc-800 bg-white'
                      : 'divide-zinc-800/50 text-zinc-350 bg-[#121316]/20'
                    }`}>
                      {paginatedPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-zinc-500 font-sans">
                            No se encontraron artículos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        paginatedPreviewItems.map((it, idx) => {
                          return (
                            <tr key={idx} className={`hover:bg-zinc-500/5 transition-colors`}>
                              <td className="p-3 text-[11px] max-w-[120px] truncate text-zinc-500 font-mono">
                                {it.code}
                              </td>
                              <td className="p-3 font-sans font-bold max-w-[280px] truncate text-zinc-150">
                                {it.name}
                              </td>
                              <td className="p-3 font-sans max-w-[120px] truncate">
                                {it.brand || 'GENÉRICO'}
                              </td>
                              <td className="p-3 text-center font-sans">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${
                                  it.category === 'Refacción' ? 'bg-sky-950/40 text-sky-400 border-sky-900/30'
                                  : it.category === 'Accesorio' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                                  : it.category === 'Consumible' ? 'bg-amber-950/40 text-amber-400 border-amber-900/30'
                                  : it.category === 'Herramienta' ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}>
                                  {it.category}
                                </span>
                              </td>
                              <td className="p-3 text-right text-zinc-400">
                                {config.currencySymbol}{it.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-bold text-emerald-400`}>
                                  {config.currencySymbol}{it.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-amber-500">
                                {it.stock}
                              </td>
                              <td className="p-3 text-center text-zinc-500">
                                {it.minStock}
                              </td>
                              <td className="p-3 text-center">
                                {it.favorite ? (
                                  <div className="flex items-center justify-center gap-1 text-amber-500 font-bold mx-auto">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    <span className="text-[10px]">Sí</span>
                                  </div>
                                ) : (
                                  <span className={`text-[10px] ${isLight ? 'text-zinc-400 font-medium' : 'text-zinc-500'}`}>No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Controles de Paginación */}
              {filteredPreviewItems.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center py-2 shrink-0">
                  <div className={`text-xs ${isLight ? 'text-zinc-650' : 'text-gray-400'}`}>
                    Mostrando registros <strong>{Math.min(filteredPreviewItems.length, (previewPage - 1) * previewRowsPerPage + 1)}</strong> a{' '}
                    <strong>{Math.min(filteredPreviewItems.length, previewPage * previewRowsPerPage)}</strong> de{' '}
                    <strong>{filteredPreviewItems.length}</strong> (Página <strong>{previewPage}</strong> de <strong>{totalPreviewPages}</strong>)
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Filas por página:</span>
                    <select
                      value={previewRowsPerPage}
                      onChange={(e) => {
                        setPreviewRowsPerPage(Number(e.target.value));
                        setPreviewPage(1);
                      }}
                      className={`text-xs p-1 focus:outline-none cursor-pointer ${
                        isRetro ? 'bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-zinc-900'
                        : isLight ? 'bg-white border border-zinc-300 rounded text-zinc-900'
                        : 'bg-zinc-900 border border-zinc-800 rounded text-zinc-250'
                      }`}
                    >
                      {[25, 50, 100, 250].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        disabled={previewPage === 1}
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        className={`p-1.5 rounded transition-all cursor-pointer ${
                          previewPage === 1
                            ? 'opacity-40 cursor-not-allowed'
                            : isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                              : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={previewPage === totalPreviewPages}
                        onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                        className={`p-1.5 rounded transition-all cursor-pointer ${
                          previewPage === totalPreviewPages
                            ? 'opacity-40 cursor-not-allowed'
                            : isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                              : isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-750'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie del modal de previsualización */}
            <div className={`p-4 border-t flex justify-between gap-2 shrink-0 ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-500'
              : isLight ? 'bg-zinc-50 border-zinc-200'
              : 'bg-[#0e0f12] border-[#1c1d22]'
            }`}>
              <button
                type="button"
                onClick={() => setIsDetailedPreviewOpen(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                  isRetro ? 'bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 text-zinc-800 hover:bg-zinc-200'
                  : isLight ? 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'text-gray-400 hover:text-white border border-zinc-800 bg-transparent'
                }`}
              >
                ← Regresar al Mapeo
              </button>
              
              <button
                type="button"
                onClick={handleApplyImport}
                className={`px-6 py-2 text-xs font-bold rounded transition-colors flex items-center gap-2 ${
                  isRetro ? 'bg-[#000080] text-white border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 cursor-pointer'
                  : isLight ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow'
                  : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-lg'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                CONFIRMAR E IMPORTAR AHORA ({tempImportedItems.length} ARTÍCULOS)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
