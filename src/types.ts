/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActiveTab =
  | 'Nueva'
  | 'Órdenes'
  | 'Cotizaciones'
  | 'Precios'
  | 'Equipos'
  | 'POS'
  | 'Ventas'
  | 'Stock'
  | 'Reabastecer'
  | 'Etiquetas'
  | 'Clientes'
  | 'Cortes'
  | 'Gastos'
  | 'Ticket'
  | 'Imprimir'
  | 'Config'
  | 'Reportes'
  | 'Fiados'
  | 'Refacciones'
  | 'Catalogo'
  | 'Donantes'
  | 'Recargas';

export interface RepairOrder {
  id: string; // e.g., ST-014
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  customerName: string;
  customerPhone: string;
  customerCountryCode?: string; // e.g., '+52' or '+1'
  deviceType: 'Phone' | 'Tablet' | 'Laptop' | 'Watch' | 'Other';
  deviceBrand: string; // e.g., Samsung, Apple
  deviceModel: string; // e.g., Galaxy S23, iPhone 14
  deviceModelNumber?: string; // e.g., SM-S911B, A2894
  devicePin?: string; // Device PIN or pattern
  receivedAccessories?: string[]; // Accessories received with the device (SIM, charger, etc.)
  faultDescription: string;
  diagnosticsNote?: string;
  ticketNote?: string;
  labelNote?: string;
  showNotesOnLabel?: boolean;
  hidePriceOnLabel?: boolean;
  assignedTechnician: string;
  status: 'Pendiente' | 'Diagnóstico' | 'En Reparación' | 'Listo' | 'Entregado' | 'Entregado y Pagado' | 'Fallido' | 'Cancelado';
  serviceType: string; // e.g. Limpieza Centro de Carga
  serviceCost?: number; // Costo de compra/tarifa base del servicio
  cost: number;
  advancePayment: number;
  advancePaymentBreakdown?: { method: string; amount: number }[];
  createdAt: string; // Date string
  estimatedDeliveryDate: string;
  isPaid: boolean;
  createdBy?: string; // Nombre del usuario que creó la orden
  sessionId?: number; // Sesión de caja en que se creó
  parts?: { name: string; cost: number; price?: number; paidAt?: string; refaccionId?: string; fromStock?: boolean; donorId?: string; donorPartId?: string }[]; // Piezas internas (costo de egreso, no visible al cliente)
  batchId?: string;              // ID de grupo cuando se reciben múltiples equipos del mismo cliente
  batchAdvancePayment?: number;  // Anticipo global del grupo (mismo valor en todas las órdenes del grupo)
  batchPosition?: number;        // Posición dentro del grupo (1, 2, 3...)
  batchTotal?: number;           // Total de equipos en el grupo
  individuallyCharged?: boolean; // true si este equipo fue cobrado individualmente al entregar
  cashPaid?: number;
  cardPaid?: number;
  warrantyOf?: string;           // ID de la orden original si esta es una garantía
  activityLog?: {
    action: string;
    user: string;
    timestamp: string; // ISO date string
  }[];
  evidence?: OrderEvidence[];
  customerHasWhatsApp?: boolean;
}

export interface OrderEvidence {
  id: string;
  name: string;
  type: 'image' | 'video';
  path: string;
  timestamp: string;
}

export interface QuoteDevice {
  deviceBrand: string;
  deviceModel: string;
  deviceModelNumber: string;
  deviceType: 'Phone' | 'Tablet' | 'Laptop' | 'Desktop' | 'Other';
  devicePin: string;
  faultDescription: string;
  serviceType: string;
  estimatedCost: number;
  deviceImageUrl?: string;
  quantity?: number;
}

export interface Quote {
  id: string;               // COT-001, COT-002...
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  status: 'Pendiente' | 'Convertida' | 'Vencida' | 'Cancelada';
  customerName: string;
  customerPhone: string;
  customerCountryCode: string;
  devices: QuoteDevice[];
  validUntil?: string;       // ISO date
  notes?: string;
  showNotesOnTicket?: boolean;
  additionalConcepts?: QuoteAdditionalConcept[];
  createdAt: string;
  convertedToOrderId?: string;
  convertedToBatchId?: string;
  createdBy?: string;
  editorFormat?: 'ticket' | 'letter';
  title?: string;
  customLogoUrl?: string;
  customRightLogoUrl?: string;
  showDoubleLogo?: boolean;
  storeNameOverride?: string;
  storeAddressOverride?: string;
  storePhoneOverride?: string;
  storePhone2Override?: string;
}

export interface QuoteAdditionalConcept {
  id: string;
  description: string;
  price: number;
  quantity?: number;
}

export interface ServicePrice {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  name: string;
  category: string;
  price: number;
  cost?: number;
  durationMinutes: number;
  popularity: number; // 1-10
  description?: string;
  brand?: string;
  model?: string;
  imageUrl?: string;
}

export interface QuoteCatalogItem {
  id: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export interface InsumoCatalogItem {
  id: string;
  description: string;
  price: number;
}

export interface Warehouse {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  stock: number;
  minStock: number;
  price: number;
  wholesalePrice?: number;
  cost: number;
  favorite?: boolean;
  reservedQty?: number;
  active?: boolean;
  manageStock?: boolean;
  imageUrl?: string;
  extraImages?: string[];
  isChip?: boolean;
  warehouseStock?: Record<string, number>;
}

export interface RefaccionItem {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  code: string;           // Código SKU o barras de la pieza
  name: string;           // Nombre (ej. Pantalla Incell)
  brand: string;          // Marca de la refacción (ej. Genérico, OEM, Original)
  deviceBrand: string;    // Marca de celular compatible (ej. Apple, Samsung)
  deviceModel: string;    // Modelo de celular compatible (ej. iPhone 11)
  category: string;       // Categoría (Pantallas, Baterías, Centros de Carga, etc.)
  stock: number;          // Existencia en stock físico (0 si es bajo pedido)
  minStock: number;       // Stock mínimo para avisar en reporte (0 si no aplica)
  cost: number;           // Costo de compra (dinero invertido)
  price: number;          // Precio cobrado al cliente en la reparación
  wholesalePrice?: number;
  favorite?: boolean;
  reservedQty?: number;
  active?: boolean;
  manageStock?: boolean;
  imageUrl?: string;
  extraImages?: string[];
  warehouseStock?: Record<string, number>;
}

export interface DonorPart {
  id: string;
  name: string;
  status: 'Disponible' | 'Dañado' | 'Usado';
  usedInOrderId?: string;
  usedDate?: string;
  notes?: string;
}

export interface DonorDevice {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  brand: string;
  model: string;
  modelNumber?: string;
  color?: string;
  serialOrImei?: string;
  cost: number;
  status: 'Disponible' | 'Agotado' | 'Desechado';
  createdAt: string;
  notes?: string;
  parts: DonorPart[];
  expenseId?: string;
  imageUrl?: string;
}

// ─── Apartados ───────────────────────────────────────────────────────────────

export interface ApartadoPayment {
  id: string;
  date: string;
  amount: number;
  method: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  note?: string;
  sessionId?: number;
  itemId?: string;
}

export interface ApartadoEntry {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  dirty?: boolean;
  clientName: string;
  clientPhone?: string;
  items: { itemId?: string; name: string; price: number; quantity: number }[];
  totalValue: number;
  payments: ApartadoPayment[];
  status: 'Activo' | 'Listo' | 'Entregado' | 'Cancelado';
  createdAt: string;
  dueDate?: string;
  notes?: string;
  sessionId?: number;
}

export interface SaleItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  fromWarehouseId?: string;
  description?: string;
}

export interface Sale {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjeta/Transfer' | 'Tarjeta' | 'Múltiple' | string;
  createdAt: string;
  ticketNumber: string;
  confirmationCode?: string;
  isCancelled?: boolean;
  createdBy?: string; // Nombre del usuario que realizó la venta
  sessionId?: number; // Sesión de caja en que se realizó
  cashReceived?: number;
  cardReceived?: number;
  change?: number;
  clientName?: string;
  clientPhone?: string;
  clientCountryCode?: string;
  notes?: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface Expense {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  description: string;
  category: 'Repuestos' | 'Servicios' | 'Alquiler' | 'Sueldos' | 'Herramientas' | 'Otros' | 'Inyección' | 'Ajuste' | 'Inicial' | 'Préstamo' | string;
  amount: number;
  createdAt: string;
  type?: 'entrada' | 'salida';
  sessionId?: number;
  paymentMethod?: 'Efectivo' | 'Tarjeta' | 'Tarjeta/Transfer' | string;
}

// ─── Crédito / Fiados ────────────────────────────────────────────────────────

export interface CreditSaleEntry {
  id: string;
  createdAt: string;
  items: SaleItem[];
  subtotal: number;
  note?: string;
  sessionId?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface CreditPayment {
  id: string;
  createdAt: string;
  amount: number;
  method: 'Efectivo' | 'Tarjeta/Transfer' | 'Mixto (Efectivo + Tarjeta/Transfer)';
  note?: string;
  sessionId?: number;
  entryId?: string;
  itemId?: string;
}

export interface CreditAccount {
  id: string;
  uuid?: string;
  updatedAt?: string;
  dirty?: boolean;
  clientName: string;
  clientPhone: string;
  createdAt: string;
  lastActivityAt: string;
  entries: CreditSaleEntry[];   // Cargos (artículos fiados)
  payments: CreditPayment[];    // Abonos
  isClosed: boolean;            // true cuando saldo = 0 y se cerró
  alertAfterDays?: number;      // Días sin actividad antes de alertar (default 7)
  deletedAt?: string;           // ISO timestamp si fue eliminado (soft-delete)
  creditLimit?: number;
}

export interface Client {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  name: string;
  phone: string;
  countryCode?: string; // e.g., '+52' or '+1'
  email: string;
  totalOrders: number;
  registeredAt: string;
  creditLimit?: number;
}

export interface UserPermissions {
  // POS
  canEditPrice: boolean;        // Editar precios en el carrito POS
  canApplyDiscounts: boolean;   // Aplicar descuentos
  canCancelSales: boolean;      // Cancelar ventas completadas
  // Inventario
  canEditStock: boolean;        // Editar / agregar artículos al inventario
  canDeleteProducts: boolean;   // Eliminar artículos del catálogo
  canRestockItems: boolean;     // Realizar reabastecimiento de productos
  // Órdenes
  canManageOrders: boolean;     // Crear y gestionar órdenes de reparación
  canEditOrdersFromReports: boolean; // Editar órdenes desde el historial de reportes
  // Reportes
  canViewReports: boolean;      // Ver cortes de caja y reportes de ventas
  // Sistema
  canAccessConfig: boolean;     // Acceder a la configuración del sistema
}

export interface AppUser {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  name: string;
  role: 'admin' | 'employee' | 'tecnico' | 'vendedor';
  pin: string; // 4-digit numeric PIN
  createdAt: string;
  permissions: UserPermissions;
}

export const ADMIN_PERMISSIONS: UserPermissions = {
  canEditPrice: true, canApplyDiscounts: true, canCancelSales: true,
  canEditStock: true, canDeleteProducts: true, canRestockItems: true,
  canManageOrders: true, canViewReports: true, canAccessConfig: true, canEditOrdersFromReports: true,
};

export const EMPLOYEE_PERMISSIONS: UserPermissions = {
  canEditPrice: false, canApplyDiscounts: false, canCancelSales: false,
  canEditStock: false, canDeleteProducts: false, canRestockItems: false,
  canManageOrders: true, canViewReports: false, canAccessConfig: false, canEditOrdersFromReports: false,
};

export const TECNICO_PERMISSIONS: UserPermissions = {
  canEditPrice: false, canApplyDiscounts: false, canCancelSales: false,
  canEditStock: false, canDeleteProducts: false, canRestockItems: false,
  canManageOrders: true, canViewReports: false, canAccessConfig: false, canEditOrdersFromReports: false,
};

export type AuditAction =
  | 'cancelar_venta'
  | 'devolucion_parcial_venta'
  | 'eliminar_producto'
  | 'editar_producto'
  | 'cambio_estado_orden'
  | 'entregar_orden'
  | 'venta_inusual'
  | 'eliminar_orden';

export interface PrintJob {
  id: string;
  type: 'ticket' | 'label';
  name: string;
  details?: string;
  printerName: string;
  status: 'printing' | 'done' | 'error' | 'no-printer';
  unconfigured?: boolean;
}

export interface AperturaEntry {
  id: string;
  fecha: string;
  hora: string;
  sesion: number;
  aperturadoPor: string;
  rol: 'admin' | 'employee';
  fondoInicial: number;
}

export interface CorteEntry {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  date: string;
  time: string;
  createdAt?: string;
  technicianName?: string;
  user?: string;
  sesion?: number;
  startingCash?: number;
  estimado?: number;
  fisico?: number;
  diferencia: number;
  totals?: {
    pos: number;
    servicio: number;
    entradas: number;
    salidas: number;
    neto: number;
    abonosFiados?: number;
    abonosApartados?: number;
    entradasManuales?: number;
    recargasCelular?: number;
    pagosServicios?: number;
    comisionesRecargas?: number;
    [key: string]: any;
  };
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  fecha: string;       // ISO date
  hora: string;        // HH:MM
  usuario: string;     // nombre del usuario
  rol: 'admin' | 'employee';
  accion: AuditAction;
  detalle: string;     // descripción legible
  referencia?: string; // ID de la venta/producto/orden afectado
}

export interface WorkshopConfig {
  updatedAt?: string;
  deletedAt?: string;
  storeName: string;
  phone: string;
  phone2?: string;
  email: string;
  logoUrl: string;
  slogan: string;
  address: string;
  addressStreet?: string;
  addressNumber?: string;
  addressColonia?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  googleMapsLink?: string;
  ticketFooter: string;
  termsAndConditions: string;
  defaultCreditLimit?: number;
  ticketFooterPOS?: string;
  termsAndConditionsPOS?: string;
  ticketFooterService?: string;
  termsAndConditionsService?: string;
  contractClauses?: string;
  currencySymbol: string;
  taxRate: number; // e.g., 0.16 for 16%
  primaryColor: 'red' | 'blue' | 'yellow' | 'green' | 'indigo';
  showTaxRate: boolean;
  ticketLogoUrl?: string;
  mediaCartaLogoUrl?: string;
  quoteSecondLogoUrl?: string;
  ticketPaperWidth?: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado';
  ticketMarginOffset?: number;
  selectedPrinterProfileId?: string;
  ticketPaperHeight?: number; // Alto de página personalizado en mm (opcional)
  ticketPrinterBrand?: string;
  hybridPrintMode?: boolean;
  mediaCartaFrontTerms?: boolean;
  posPrinterBrand?: string;
  barcodeAsImage?: boolean;
  showBarcodeOnTicket?: boolean; // false = no imprime código de barras (default true)
  hideTicketSignature?: boolean; // true = no imprime áreas de firma
  hideMapsQr?: boolean; // true = no imprime QR de Google Maps en tickets
  printerInterface?: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
  printerIpAddress?: string;
  cutPaperAfterPrint?: boolean;
  printCopies?: number;
  autoPrintOnSale?: boolean;
  labelPrinterBrand?: string;
  labelPrinterInterface?: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
  labelPrinterIpAddress?: string;
  labelPaperSize?: '51x25mm' | '50x30mm' | '40x20mm' | '40x30mm' | '60x30mm' | '30x15mm' | '38x25mm' | '57x32mm' | '100x50mm' | '58x40mm' | '80x50mm';
  labelTemplateStyle?: 'standard' | 'vitrina' | 'qr' | 'technical';
  serviceLabelTemplateStyle?: 'standard' | 'vitrina' | 'qr' | 'technical';
  labelMarginOffset?: number;
  printLabelCopies?: number;
  labelCustomText?: string;
  showQrOnLabel?: boolean;
  hidePriceOnLabel?: boolean;
  hideStoreNameOnLabel?: boolean;
  labelSampleImageUrl?: string;
  labelTemplate?: string;
  labelTemplateService?: string;
  labelTemplateProduct?: string;
  labelTemplatePOS?: string;
  ticketTemplatePOS?: string;
  ticketTemplateService?: string;
  labelOrientation?: 'horizontal' | 'vertical';
  labelTagsOrientation?: Record<string, 'horizontal' | 'vertical'>;
  // Impresora de Reportes A4
  reportPrinterName?: string;
  reportPrinterInterface?: 'USB' | 'Bluetooth' | 'Ethernet' | 'Default';
  reportPrinterIpAddress?: string;
  defaultStartView?: 'Panel' | 'POS' | 'Nueva';
  theme?: 'modern' | 'retro-window' | 'fluent';
  themeMode?: 'light' | 'dark';
  allowOutOfStockSales?: boolean;
  defaultFullscreen?: boolean;
  customDeviceModels?: { brand: string; model: string; modelNumber?: string; type: 'Phone' | 'Tablet' | 'Laptop' | 'Desktop' | 'Other' }[];
  // Telegram Notifications
  telegramBotToken?: string;     // Token del bot: "7123456789:AAFxxx..."
  telegramChatId?: string;       // Chat ID del dueño: "123456789"
  telegramEnabled?: boolean;     // Activar notificaciones por Telegram
  notifyOnSale?: boolean;        // Venta POS completada
  notifyOnOrder?: boolean;       // Nueva orden de reparación
  notifyOnStatusChange?: boolean; // Cambio de estado en orden
  notifyOnDelivery?: boolean;    // Orden finalizada / entregada
  notifyOnInventory?: boolean;   // Producto agregado al inventario
  notifyOnLowStock?: boolean;    // Stock mínimo alcanzado
  notifyOnCorte?: boolean;       // Corte de caja realizado
  notifyOnApertura?: boolean;    // Apertura de caja realizada
  notifyOnFiado?: boolean;       // Fiado creado, abonado o liquidado
  notifyOnExpense?: boolean;     // Entradas y salidas manuales de efectivo
  metaDiariaVentas?: number;     // Meta diaria de ventas en efectivo (0 = sin meta)
  workshopMode?: 'personal' | 'team'; // 'personal' = dueño único técnico, 'team' = múltiples técnicos
  ecoMode?: boolean; // Modo Eco: muestra tickets en pantalla en lugar de imprimirlos
  ecoSilent?: boolean; // Modo Bitácora: eco mode sin tickets digitales, solo registro interno
  useDynamicHeight?: boolean; // Alto de ticket dinámico para impresoras térmicas (opcional)
  usePrinterDefaultPageSize?: boolean; // Utilizar tamaño de página predeterminado del controlador de la impresora (opcional)
  autoBackupEnabled?: boolean;
  enableWarehouses?: boolean;
  autoBackupPath?: string;
  autoBackupLastTime?: string;
  cloudBackupEnabled?: boolean;
  labelLogoUrl?: string;
  appZoomLevel?: number | 'auto';
  printDuplexContract?: boolean;
  posPaperWidth?: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado';
  duplexManual?: boolean;
  printIndividualTicketsInBatch?: boolean;
  // WhatsApp Notifications and Sharing
  whatsappMode?: 'disabled' | 'direct' | 'automated' | 'integrated';
  whatsappApiUrl?: string;
  whatsappApiToken?: string;
  whatsappDefaultCountryCode?: string; // Default: '52'
  autoSendSaleTicket?: boolean;
  autoSendRepairStatus?: boolean;
  whatsappNotifyStates?: string[];
  enableTaller?: boolean;
  enablePOS?: boolean;
  posTotalPosition?: 'bottom' | 'top';
  quoteSignature?: string;
  hiddenModules?: string[];
  businessHours?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTiktok?: string;
  unattendedSupportEnabled?: boolean;
  debugLogs?: any;
  // Taecel API Integration
  taecelApiKey?: string;
  taecelNip?: string;
  taecelEnabled?: boolean;
  taecelSandboxMode?: boolean;
  taecelComisionRecarga?: number;
  taecelComisionServicio?: number;
  promoActive?: boolean;
  promoText?: string;
  promoStartDate?: string;
  promoEndDate?: string;
  promoPosition?: 'top' | 'bottom';
}

export interface DailySchedule {
  isOpen: boolean;
  type: 'continuous' | 'split' | 'closed';
  openTime?: string;
  closeTime?: string;
  openTime2?: string;
  closeTime2?: string;
}

export type WeeklySchedule = Record<string, DailySchedule>;

export interface ChipActivation {
  id: string;
  uuid?: string;
  updatedAt?: string;
  deletedAt?: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  chipNumber: string;
  iccid?: string;
  imei?: string;
  carrier: string;
  saleId?: string;
  price?: number;
}

