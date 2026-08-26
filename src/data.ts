/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RepairOrder, ServicePrice, InventoryItem, RefaccionItem, Expense, Client, WorkshopConfig, Sale } from './types';
import { DEFAULT_CONTRACT_CLAUSES } from './utils/ticketBuilder';

export const INITIAL_CONFIG: WorkshopConfig = {
  storeName: '',
  phone: '',
  phone2: '',
  email: '',
  logoUrl: '',
  slogan: '',
  address: '',
  ticketFooter: '',
  termsAndConditions: '',
  ticketFooterPOS: '',
  termsAndConditionsPOS: '',
  ticketFooterService: '',
  termsAndConditionsService: '',
  contractClauses: '',
  currencySymbol: '$',
  taxRate: 0.16,
  primaryColor: 'red',
  showTaxRate: true,
  ticketLogoUrl: '',
  mediaCartaLogoUrl: '',
  ticketPaperWidth: '80mm',
  ticketMarginOffset: 0,
  ticketPaperHeight: 0,
  hideTicketSignature: false,
  hideMapsQr: false,
  printerInterface: 'Default',
  printerIpAddress: '192.168.1.100',
  cutPaperAfterPrint: true,
  useDynamicHeight: false,
  usePrinterDefaultPageSize: false,
  printCopies: 1,
  autoPrintOnSale: true,
  hidePriceOnLabel: false,
  labelMarginOffset: 0,
  enableWarehouses: false,
  defaultStartView: 'POS',
  theme: 'retro-window',
  themeMode: 'light',
  socialFacebook: '',
  socialInstagram: '',
  socialTiktok: '',
  businessHours: '',
  addressStreet: '',
  addressNumber: '',
  addressColonia: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  addressCountry: '',
  googleMapsLink: '',
  defaultFullscreen: false,
  printIndividualTicketsInBatch: true,
  // Notificaciones Telegram — activadas por defecto cuando el bot esté configurado
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  notifyOnSale: true,
  notifyOnOrder: true,
  notifyOnStatusChange: true,
  notifyOnDelivery: true,
  notifyOnInventory: false,
  notifyOnLowStock: false,
  notifyOnCorte: true,
  notifyOnApertura: true,
  notifyOnExpense: true,
  workshopMode: 'personal',
  autoBackupEnabled: false,
  autoBackupPath: '',
  autoBackupLastTime: '',
  enableTaller: true,
  enablePOS: true,
  posTotalPosition: 'bottom',
  whatsappMode: 'integrated',
  autoSendSaleTicket: false,
  autoSendRepairStatus: false,
  whatsappNotifyStates: ['Pendiente', 'Diagnóstico', 'En Reparación', 'Listo', 'Entregado', 'Entregado y Pagado', 'Fallido', 'Cancelado'],
};

export const INITIAL_SERVICES: ServicePrice[] = [
  { id: 'S1-init', name: 'CAMBIO DE PANTALLA (DISPLAY)', category: 'Pantalla', price: 0, durationMinutes: 45, popularity: 5 },
  { id: 'S2-init', name: 'CAMBIO DE BATERÍA', category: 'Batería', price: 0, durationMinutes: 30, popularity: 5 },
  { id: 'S3-init', name: 'REPARACIÓN DE CENTRO DE CARGA', category: 'Centro de Carga', price: 0, durationMinutes: 40, popularity: 5 },
  { id: 'S4-init', name: 'CAMBIO DE CRISTAL / TAPA TRASERA', category: 'Cristal', price: 0, durationMinutes: 60, popularity: 5 },
  { id: 'S5-init', name: 'LIMPIEZA Y MANTENIMIENTO GENERAL', category: 'Limpieza', price: 0, durationMinutes: 30, popularity: 5 },
  { id: 'S6-init', name: 'DIAGNÓSTICO TÉCNICO / REVISIÓN', category: 'Diagnóstico', price: 0, durationMinutes: 20, popularity: 5 },
  { id: 'S7-init', name: 'REPARACIÓN DE BOTONES (ENCENDIDO/VOLUMEN)', category: 'Herramientas', price: 0, durationMinutes: 30, popularity: 5 },
  { id: 'S8-init', name: 'REACTIVACIÓN / FLASHEO DE SOFTWARE', category: 'Software', price: 0, durationMinutes: 45, popularity: 5 },
  { id: 'S9-init', name: 'ELIMINACIÓN DE HUMEDAD (CELULAR MOJADO)', category: 'Limpieza', price: 0, durationMinutes: 90, popularity: 5 },
  { id: 'S10-init', name: 'CAMBIO DE CÁMARA (FRONTAL/TRASERA)', category: 'Cámara', price: 0, durationMinutes: 40, popularity: 5 }
];

export interface OfflineDeviceModel {
  brand: string;
  model: string;
  modelNumber: string;
  type: string;
}

export const DEFAULT_OFFLINE_MODELS: OfflineDeviceModel[] = [
  // Apple
  { brand: 'APPLE', model: 'IPHONE 15 PRO MAX', modelNumber: 'A3106', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15 PRO', modelNumber: 'A3102', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15 PLUS', modelNumber: 'A3094', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 15', modelNumber: 'A3090', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PRO MAX', modelNumber: 'A2894', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PRO', modelNumber: 'A2890', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14 PLUS', modelNumber: 'A2886', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 14', modelNumber: 'A2882', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 PRO MAX', modelNumber: 'A2643', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 PRO', modelNumber: 'A2638', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13', modelNumber: 'A2633', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 13 MINI', modelNumber: 'A2628', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12 PRO MAX', modelNumber: 'A2411', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12 PRO', modelNumber: 'A2407', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 12', modelNumber: 'A2403', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 11 PRO MAX', modelNumber: 'A2218', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 11 PRO', modelNumber: 'A2215', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 11', modelNumber: 'A2221', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE XS MAX', modelNumber: 'A2101', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE XS', modelNumber: 'A2097', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE XR', modelNumber: 'A2105', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE X', modelNumber: 'A1901', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 8 PLUS', modelNumber: 'A1897', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 8', modelNumber: 'A1905', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 7 PLUS', modelNumber: 'A1778', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE 7', modelNumber: 'A1778', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE SE 2022', modelNumber: 'A2783', type: 'Phone' },
  { brand: 'APPLE', model: 'IPHONE SE 2020', modelNumber: 'A2275', type: 'Phone' },

  // Samsung
  { brand: 'SAMSUNG', model: 'GALAXY S24 ULTRA', modelNumber: 'SM-S928B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S24+', modelNumber: 'SM-S926B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S24', modelNumber: 'SM-S921B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S23 ULTRA', modelNumber: 'SM-S918B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S23+', modelNumber: 'SM-S916B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S23', modelNumber: 'SM-S911B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S22 ULTRA', modelNumber: 'SM-S908B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S22', modelNumber: 'SM-S901B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S21 ULTRA', modelNumber: 'SM-G998B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S21 FE', modelNumber: 'SM-G990B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY S20 FE', modelNumber: 'SM-G780F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A54 5G', modelNumber: 'SM-A546B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A34 5G', modelNumber: 'SM-A346B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A14 5G', modelNumber: 'SM-A146B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A14', modelNumber: 'SM-A145F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A53 5G', modelNumber: 'SM-A536B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A33 5G', modelNumber: 'SM-A336B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A23', modelNumber: 'SM-A235F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A13', modelNumber: 'SM-A135F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A52S 5G', modelNumber: 'SM-A528B', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A52', modelNumber: 'SM-A525F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A32', modelNumber: 'SM-A325F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A22', modelNumber: 'SM-A225F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A12', modelNumber: 'SM-A125F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY A21S', modelNumber: 'SM-A217F', type: 'Phone' },
  { brand: 'SAMSUNG', model: 'GALAXY J7 PRIME', modelNumber: 'SM-G610M', type: 'Phone' },

  // Xiaomi
  { brand: 'XIAOMI', model: 'REDMI NOTE 13 PRO 5G', modelNumber: '23090RA98G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 13 PRO', modelNumber: '23117RA68G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 13', modelNumber: '23129RAA4G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 12 PRO 5G', modelNumber: '22101316G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 12 PRO', modelNumber: '2209116AG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 12', modelNumber: '23021RAAEG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 11 PRO', modelNumber: '2201116TG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 11', modelNumber: '2201117TG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 10 PRO', modelNumber: 'M2101K6G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI NOTE 10', modelNumber: 'M2101K7AG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 12C', modelNumber: '2212ARNC4L', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 10C', modelNumber: '220333QNY', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 9C', modelNumber: 'M2006C3MNG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'REDMI 9A', modelNumber: 'M2006C3LG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO X6 PRO', modelNumber: '2311DRK48G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO X5 PRO', modelNumber: '22101320G', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO X3 PRO', modelNumber: 'M2102J20SG', type: 'Phone' },
  { brand: 'XIAOMI', model: 'POCO F5', modelNumber: '23049PCD8G', type: 'Phone' },

  // Motorola
  { brand: 'MOTOROLA', model: 'MOTO G84 5G', modelNumber: 'XT2347', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G54 5G', modelNumber: 'XT2343', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G34 5G', modelNumber: 'XT2363', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G24 POWER', modelNumber: 'XT2425', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G14', modelNumber: 'XT2341', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G23', modelNumber: 'XT2233', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G22', modelNumber: 'XT2231', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G60', modelNumber: 'XT2135', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G50', modelNumber: 'XT2137', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G30', modelNumber: 'XT2129', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G20', modelNumber: 'XT2128', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G9 POWER', modelNumber: 'XT2091', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G9 PLAY', modelNumber: 'XT2073', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G8 POWER', modelNumber: 'XT2041', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO G8 PLAY', modelNumber: 'XT2015', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'EDGE 40 NEO', modelNumber: 'XT2307', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'EDGE 30 NEO', modelNumber: 'XT2245', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO E13', modelNumber: 'XT2345', type: 'Phone' },
  { brand: 'MOTOROLA', model: 'MOTO E22', modelNumber: 'XT2239', type: 'Phone' },

  // Huawei
  { brand: 'HUAWEI', model: 'P30 LITE', modelNumber: 'MAR-LX1A', type: 'Phone' },
  { brand: 'HUAWEI', model: 'P30 PRO', modelNumber: 'VOG-L29', type: 'Phone' },
  { brand: 'HUAWEI', model: 'P40 LITE', modelNumber: 'JNY-LX1', type: 'Phone' },
  { brand: 'HUAWEI', model: 'P40 PRO', modelNumber: 'ELS-NX9', type: 'Phone' },
  { brand: 'HUAWEI', model: 'Y9 PRIME 2019', modelNumber: 'STK-LX3', type: 'Phone' },
  { brand: 'HUAWEI', model: 'Y9 2019', modelNumber: 'JKM-LX3', type: 'Phone' },
  { brand: 'HUAWEI', model: 'MATE 20 LITE', modelNumber: 'SNE-LX3', type: 'Phone' },
  { brand: 'HUAWEI', model: 'MATE 30 PRO', modelNumber: 'LIO-AL00', type: 'Phone' },
  { brand: 'HUAWEI', model: 'NOVA 9', modelNumber: 'NAM-LX9', type: 'Phone' },
  { brand: 'HUAWEI', model: 'NOVA Y70', modelNumber: 'MGA-LX9', type: 'Phone' }
];

export const INITIAL_ORDERS: RepairOrder[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_REFACCIONES: RefaccionItem[] = [];

/* ─── Dev-only helpers (only called from DevModeView) ───────────────────── */
export function generateSampleInventory(): InventoryItem[] {
  const brands = ['Apple', 'SAMSUNG', 'Xiaomi', 'Motorola', 'Huawei', 'Realme', 'OPPO'];
  const accessoryTypes = [
    { prefix: 'Funda de Silicón Premium',             price: 250, cost: 80,  brandSpecific: true  },
    { prefix: 'Vidrio Templado Cerámico 9D',           price: 150, cost: 35,  brandSpecific: true  },
    { prefix: 'Funda Transparente Anti-Impacto',       price: 190, cost: 55,  brandSpecific: true  },
    { prefix: 'Cargador Original Carga Rápida 20W/25W',price: 450, cost: 150, brandSpecific: true  },
    { prefix: 'Cable Tipo C a Tipo C Reforzado 2m',    price: 180, cost: 45,  brandSpecific: false },
    { prefix: 'Soporte Magnético para Rejilla Auto',   price: 220, cost: 70,  brandSpecific: false },
    { prefix: 'Mica de Privacidad Cerámica Antiespía', price: 190, cost: 45,  brandSpecific: true  },
    { prefix: 'Protector de Lente de Cámara Metal Ring',price:130, cost: 25,  brandSpecific: true  },
    { prefix: 'Funda de Cuero Genuino MagSafe',        price: 590, cost: 200, brandSpecific: true  },
    { prefix: 'Batería Portátil Keyring 5000mAh',      price: 350, cost: 110, brandSpecific: false },
    { prefix: 'Adaptador OTG Tipo-C a USB 3.0',        price: 90,  cost: 15,  brandSpecific: false },
    { prefix: 'Audífonos Bluetooth In-Ear Pro',        price: 650, cost: 220, brandSpecific: false },
    { prefix: 'Soporte Escritorio de Aluminio',        price: 199, cost: 60,  brandSpecific: false },
    { prefix: 'Anillo Sujetador Metálico 360',         price: 80,  cost: 15,  brandSpecific: false },
    { prefix: 'Brazalete Deportivo Neopreno',          price: 120, cost: 30,  brandSpecific: false },
  ];
  const modelsByBrand: Record<string, string[]> = {
    'Apple':    ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 11'],
    'SAMSUNG':  ['Galaxy S24 Ultra',  'Galaxy S23 Ultra', 'Galaxy A54 5G', 'Galaxy A34', 'Galaxy S22'],
    'Xiaomi':   ['Redmi Note 13 Pro', 'POCO X6 Pro', 'Redmi 12C', 'Xiaomi 13T'],
    'Motorola': ['Moto G84 5G', 'Edge 40 Neo', 'Moto G54', 'Moto E13'],
    'Huawei':   ['P60 Pro', 'Nova 11i', 'Mate 50 Pro'],
    'Realme':   ['Realme 11 Pro+', 'Realme C53'],
    'OPPO':     ['Reno 10 5G', 'OPPO A78'],
  };
  const subcategory = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('funda') || n.includes('case'))     return 'Fundas';
    if (n.includes('vidrio') || n.includes('mica'))    return 'Protectores';
    if (n.includes('cargador') || n.includes('cable')) return 'Cargadores';
    if (n.includes('audífonos'))                       return 'Audio';
    if (n.includes('batería'))                         return 'Baterías';
    return 'Accesorios';
  };
  const items: InventoryItem[] = [];
  let counter = 1, index = 1;
  while (items.length < 100) {
    const type = accessoryTypes[index % accessoryTypes.length];
    const brand = brands[index % brands.length];
    const model = (modelsByBrand[brand] || ['Universal'])[index % (modelsByBrand[brand]?.length || 1)];
    const name = (type.brandSpecific
      ? `${type.prefix} (${model})`
      : `${type.prefix} - ${brand} Universal`
    ).toUpperCase();
    items.push({
      id: `ACC-${100 + counter}`,
      code: `750912300${(100 + counter).toString().padStart(3, '0')}`,
      name,
      brand: brand.toUpperCase(),
      category: 'Accesorio',
      subcategory: subcategory(name),
      stock: Math.floor(Math.random() * 20) + 5,
      minStock: Math.floor(Math.random() * 5) + 3,
      price: type.price,
      cost: type.cost,
      favorite: counter % 8 === 0,
    });
    counter++; index++;
  }
  return items;
}

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_SALES: Sale[] = [];

/**
 * Generates 100 high-quality dummy inventory items for testing purposes.
 */
export function get100TestProducts(): InventoryItem[] {
  const categories = ['Pantalla', 'Batería', 'Bocina', 'Centro de Carga', 'Cristal', 'Cámara', 'Accesorio', 'Herramientas'];
  const brands = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Realme'];
  const models = ['Pro Max', 'Ultra', 'Neo', 'Lite', 'Plus', 'FE', 'Power', 'Play'];
  const items: InventoryItem[] = [];
  
  for (let i = 1; i <= 100; i++) {
    const brand = brands[i % brands.length];
    const category = categories[i % categories.length];
    const model = models[(i * 3) % models.length];
    const cost = Math.floor(Math.random() * 800) + 50; // $50 to $850
    const price = Math.floor(cost * 1.5) + 30; // ~50% markup
    items.push({
      id: `TEST-${i}`,
      code: `7509999${String(i).padStart(5, '0')}`,
      name: `${category} de ${brand} ${model} v${i % 10}`,
      brand: brand,
      category: category,
      stock: Math.floor(Math.random() * 20) + 5, // 5 to 25
      minStock: Math.floor(Math.random() * 5) + 2,
      price,
      cost,
      favorite: i % 8 === 0
    });
  }
  return items;
}

