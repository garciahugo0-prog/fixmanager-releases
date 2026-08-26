/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
