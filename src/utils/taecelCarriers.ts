/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TaecelCarrier {
  id: string;
  name: string;
  type: 'recarga' | 'paquete' | 'servicio' | 'pin';
  options?: number[]; // Valores sugeridos rápidos
  description?: string;
  logoUrl?: string; // URL del logotipo de la API
  fieldLabel?: string; // Etiqueta dinámica de campo (ej. Número de Servicio)
  fieldPlaceholder?: string; // Marcador dinámico del input
}

export const TAECEL_CARRIERS: TaecelCarrier[] = [
  // ─── RECARGAS DE TIEMPO AIRE ───
  { id: 'TELCEL', name: 'Telcel Tiempo Aire', type: 'recarga', options: [10, 20, 30, 50, 100, 150, 200, 300, 500] },
  { id: 'MOVISTAR', name: 'Movistar Tiempo Aire', type: 'recarga', options: [10, 20, 30, 50, 80, 100, 120, 150, 200, 300] },
  { id: 'ATT', name: 'AT&T Tiempo Aire', type: 'recarga', options: [10, 20, 30, 50, 100, 150, 200, 300, 500] },
  { id: 'UNEFON', name: 'Unefon Tiempo Aire', type: 'recarga', options: [10, 20, 30, 50, 70, 100, 150, 200, 300, 500] },
  { id: 'BAIT', name: 'Bait (Mi Móvil)', type: 'recarga', options: [20, 30, 50, 100, 200, 300] },
  { id: 'VIRGIN', name: 'Virgin Mobile', type: 'recarga', options: [20, 30, 50, 100, 150, 200, 300] },

  // ─── PAQUETES SIN LÍMITE / DATOS ───
  { id: 'TELCEL_PAQ', name: 'Telcel Sin Límite (Paquetes)', type: 'paquete', options: [20, 30, 50, 80, 100, 150, 200, 300, 500] },
  { id: 'MOVISTAR_PAQ', name: 'Movistar Datos Libres', type: 'paquete', options: [30, 50, 100, 150, 200] },
  { id: 'ATT_PAQ', name: 'AT&T Internet Más', type: 'paquete', options: [30, 50, 100, 150, 200, 300] },

  // ─── PAGO DE SERVICIOS ───
  { id: 'CFE', name: 'CFE (Luz)', type: 'servicio', description: 'Pago de recibo de electricidad vigente.' },
  { id: 'TELMEX', name: 'Telmex (Teléfono/Infinitum)', type: 'servicio', description: 'Pago de recibo de telefonía fija e internet.' },
  { id: 'IZZI', name: 'Izzi (Televisión/Internet)', type: 'servicio', description: 'Pago de televisión por cable e internet.' },
  { id: 'SKY', name: 'Sky / VeTV', type: 'servicio', description: 'Pago de mensualidad de televisión satelital.' },
  { id: 'DISH', name: 'Dish', type: 'servicio', description: 'Pago de mensualidad de televisión de paga.' },
  { id: 'AGUA', name: 'Recibo de Agua', type: 'servicio', description: 'Pago de suministro de agua potable.' },
  { id: 'INFONAVIT', name: 'Infonavit', type: 'servicio', description: 'Abono a crédito de vivienda Infonavit.' },
  { id: 'TELEVIA', name: 'TeleVía / PASE', type: 'servicio', description: 'Recarga de tag para autopistas urbanas y casetas.' },

  // ─── PINES / TARJETAS DIGITALES ───
  { id: 'NETFLIX', name: 'Netflix Pin', type: 'pin', options: [150, 300, 500] },
  { id: 'SPOTIFY', name: 'Spotify Premium', type: 'pin', options: [115, 345, 690] },
  { id: 'XBOX', name: 'Xbox Live / Game Pass', type: 'pin', options: [200, 500, 1000] },
  { id: 'PLAYSTATION', name: 'PlayStation Store', type: 'pin', options: [100, 200, 500, 1000] },
  { id: 'GOOGLE_PLAY', name: 'Google Play', type: 'pin', options: [100, 200, 500, 1000] },
  { id: 'APPLE', name: 'Apple Gift Card', type: 'pin', options: [200, 500, 1000] },
  { id: 'CINEPOLIS', name: 'Cinépolis Cinecash', type: 'pin', options: [100, 250, 500] },
];
