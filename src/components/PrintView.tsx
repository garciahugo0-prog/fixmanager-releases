/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Printer, ShieldCheck, CreditCard, ChevronLeft, FileDown } from 'lucide-react';
import { RepairOrder, Sale, ActiveTab, WorkshopConfig } from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { buildTicketHtml, buildPosTicketHtml } from '../utils/ticketBuilder';

export { buildTicketHtml };

function parsePatternNodes(devicePin: string): number[] | null {
  if (!devicePin) return null;
  const withPrefix = devicePin.toUpperCase().match(/^PATR[OÓ]N:\s*([\d\-]+)$/);
  const raw = !withPrefix ? devicePin.match(/^[\d\-]+$/) : null;
  const str = withPrefix ? withPrefix[1] : (raw ? raw[0] : null);
  if (!str) return null;
  const nodes = str.split('-').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 8);
  return nodes.length > 0 ? nodes : null;
}

function PatternSvg({ nodes, size = 54 }: { nodes: number[]; size?: number }) {
  const cell = size / 3;
  const r = cell * 0.22;
  const nodePos = (i: number) => ({ x: (i % 3) * cell + cell / 2, y: Math.floor(i / 3) * cell + cell / 2 });
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {nodes.slice(1).map((n, i) => {
        const a = nodePos(nodes[i]); const b = nodePos(n);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="black" strokeWidth="1.5" strokeLinecap="round" />;
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const { x, y } = nodePos(i);
        const active = nodes.includes(i);
        return <circle key={i} cx={x} cy={y} r={active ? r * 1.3 : r} fill={active ? 'black' : '#9ca3af'} />;
      })}
    </svg>
  );
}

interface PrintViewProps {
  order: RepairOrder | null;
  sale: Sale | null;
  config: WorkshopConfig;
  setActiveTab: (tab: ActiveTab) => void;
  onClearSelection: () => void;
  selectedOrderId?: string | null;
}

const DEFAULT_LABEL_TEMPLATE = JSON.stringify([
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

const DEFAULT_LABEL_PRODUCT_TEMPLATE = JSON.stringify([
  { "id": "prod-label-logo", "type": "text", "text": "  {TIENDA}  ", "x": 5, "y": 5, "fontSize": 10, "fontWeight": "bolder", "inverted": true },
  { "id": "prod-label-title", "type": "text", "text": "{PRODUCTO}", "x": 5, "y": 18, "fontSize": 9.5, "fontWeight": "bolder" },
  { "id": "prod-label-brand", "type": "text", "text": "{MARCA}", "x": 5, "y": 28, "fontSize": 8, "fontWeight": "bold" },
  { "id": "prod-label-price-badge", "type": "rect", "x": 65, "y": 4, "width": 30, "height": 14 },
  { "id": "prod-label-price-val", "type": "text", "text": "{PRECIO}", "x": 80, "y": 11, "fontSize": 11, "fontWeight": "bolder", "align": "center" },
  { "id": "prod-label-qr-box", "type": "rect", "x": 65, "y": 22, "width": 30, "height": 54 },
  { "id": "prod-label-qr-sym", "type": "text", "text": "🔳", "x": 80, "y": 45, "fontSize": 20, "align": "center" },
  { "id": "prod-label-line-1", "type": "line", "x": 5, "y": 38, "width": 55 },
  { "id": "prod-label-code-lbl", "type": "text", "text": "CÓDIGO DE BARRAS", "x": 5, "y": 43, "fontSize": 8, "fontWeight": "bold" },
  { "id": "prod-label-barcode-sym", "type": "text", "text": "|||||||||||||||||", "x": 5, "y": 53, "fontSize": 14, "fontWeight": "bolder" },
  { "id": "prod-label-code-val", "type": "text", "text": "* {CODIGO} *", "x": 5, "y": 66, "fontSize": 8, "fontWeight": "bold" },
  { "id": "prod-label-footer-v", "type": "text", "text": "GARANTIA DIRECTA", "x": 3, "y": 82, "fontSize": 8, "fontWeight": "bold", "inverted": true }
]);

const DEFAULT_TICKET_POS = JSON.stringify([
  { "id": "t-1", "type": "text", "text": "{TIENDA}", "x": 50, "y": 4, "fontSize": 13, "fontWeight": "bolder", "align": "center" },
  { "id": "t-2", "type": "text", "text": "{SLOGAN}", "x": 50, "y": 9, "fontSize": 8, "align": "center" },
  { "id": "t-3", "type": "line", "x": 5, "y": 14, "width": 90 },
  { "id": "t-4", "type": "text", "text": "BOLETO DE VENTAS", "x": 50, "y": 18, "fontSize": 10, "fontWeight": "bolder", "align": "center", "inverted": true },
  { "id": "t-6", "type": "text", "text": "REGISTRO: {FECHA}", "x": 5, "y": 24, "fontSize": 8 },
  { "id": "t-7", "type": "line", "x": 5, "y": 28, "width": 90 },
  { "id": "t-8", "type": "text", "text": "{DETALLE_MOSTRADOR}", "x": 5, "y": 32, "fontSize": 9 },
  { "id": "t-9", "type": "line", "x": 5, "y": 58, "width": 90 },
  { "id": "t-10", "type": "text", "text": "{DESGLOSE_PAGOS}", "x": 5, "y": 62, "fontSize": 9 },
  { "id": "t-11", "type": "line", "x": 5, "y": 78, "width": 90 },
  { "id": "t-12", "type": "text", "text": "POLÍTICAS DE GARANTÍA", "x": 50, "y": 81, "fontSize": 8, "fontWeight": "bold", "align": "center" },
  { "id": "t-13", "type": "text", "text": "{POLITICAS}", "x": 50, "y": 85, "fontSize": 7.5, "align": "center" },
  { "id": "t-14", "type": "text", "text": "{LEYENDA_PIE}", "x": 50, "y": 94, "fontSize": 9, "fontWeight": "bold", "align": "center" }
]);

const DEFAULT_TICKET_SERVICE = JSON.stringify([
  { "id": "s-1", "type": "text", "text": "{TIENDA}", "x": 50, "y": 4, "fontSize": 13, "fontWeight": "bolder", "align": "center" },
  { "id": "s-2", "type": "text", "text": "{SLOGAN}", "x": 50, "y": 9, "fontSize": 8, "align": "center" },
  { "id": "s-3", "type": "line", "x": 5, "y": 14, "width": 90 },
  { "id": "s-4", "type": "text", "text": "ORDEN DE SERVICIO #{ORDEN}", "x": 50, "y": 17, "fontSize": 10, "fontWeight": "bolder", "align": "center", "inverted": true },
  { "id": "s-5", "type": "text", "text": "REGISTRO: {FECHA}", "x": 5, "y": 23, "fontSize": 8 },
  { "id": "s-6", "type": "line", "x": 5, "y": 27, "width": 90 },
  { "id": "s-7", "type": "text", "text": "{DATOS_CLIENTE}", "x": 5, "y": 30, "fontSize": 9 },
  { "id": "s-8", "type": "line", "x": 5, "y": 44, "width": 90 },
  { "id": "s-9", "type": "text", "text": "{DATOS_EQUIPO}", "x": 5, "y": 47, "fontSize": 9 },
  { "id": "s-10", "type": "line", "x": 5, "y": 62, "width": 90 },
  { "id": "s-11", "type": "text", "text": "DETALLES DE CORTE & FALLA", "x": 50, "y": 65, "fontSize": 9, "fontWeight": "bold", "align": "center" },
  { "id": "s-12", "type": "text", "text": "{FALLA_SERVICIO}", "x": 5, "y": 69, "fontSize": 8.5 },
  { "id": "s-13", "type": "line", "x": 5, "y": 82, "width": 90 },
  { "id": "s-14", "type": "text", "text": "{DESGLOSE_PAGOS}", "x": 5, "y": 85, "fontSize": 9 },
  { "id": "s-15", "type": "line", "x": 5, "y": 100, "width": 90 },
  { "id": "s-16", "type": "text", "text": "CLAUSULAS DEL TALLER", "x": 50, "y": 104, "fontSize": 8, "fontWeight": "bold", "align": "center" },
  { "id": "s-17", "type": "text", "text": "{POLITICAS}", "x": 50, "y": 108, "fontSize": 7.5, "align": "center" },
  { "id": "s-18", "type": "text", "text": "{LEYENDA_PIE}", "x": 50, "y": 118, "fontSize": 9, "fontWeight": "bold", "align": "center" }
]);

export function buildTicketHtmlFromTemplate(
  elements: any[],
  tagReplacements: Record<string, string>,
  paperWidth: string,
  orderId: string,
  devicePin?: string,
  barcodeAsImage?: boolean
): string {
  // Legacy function kept for label/POS template rendering
  // For service tickets use buildTicketHtml from utils/ticketBuilder
  const patternNodes = devicePin ? parsePatternNodes(devicePin) : null;

  const code128Script = `(function(){var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];var START_B=104,STOP=106;function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}function draw(text){var codes=encode(text);var bw=2,h=40,x=10,bars=[];for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}var tw=x+10;
  var barcodeAsImage = ${!!barcodeAsImage};
  var el = document.getElementById('barcode-container');
  if (barcodeAsImage) {
    var canvas = document.createElement('canvas');
    canvas.width = tw; canvas.height = h + 12;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, tw, h + 12);
    ctx.fillStyle = 'black';
    for (var k = 0; k < bars.length; k++) { ctx.fillRect(bars[k].x, 0, bars[k].w, h); }
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'black';
    ctx.fillText(text, tw / 2, h + 10);
    var imgUrl = canvas.toDataURL('image/png');
    var img = '<img src="' + imgUrl + '" style="display:block;margin:0 auto" />';
    if (el) el.innerHTML = img;
  } else {
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+tw+'" height="'+(h+12)+'" shape-rendering="crispEdges" style="display:block;margin:0 auto">';for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black" shape-rendering="crispEdges"/>';}var escapedText=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");svg+='<text x="'+(tw/2)+'" y="'+(h+10)+'" text-anchor="middle" font-family="monospace" font-size="9" fill="black">'+escapedText+'</text>';svg+='</svg>';if (el) el.innerHTML=svg;
  }
}draw('${orderId}');})();`;

  const patternSvgForElement = (elText: string): string => {
    if (!patternNodes || !elText.includes('{DATOS_EQUIPO}')) return '';
    const size = 66; const cell = size / 3; const r = cell * 0.22;
    const np = (i: number) => ({ x: (i % 3) * cell + cell / 2, y: Math.floor(i / 3) * cell + cell / 2 });
    const lines = patternNodes.slice(1).map((n, i) => { const a = np(patternNodes[i]); const b = np(n); return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="black" stroke-width="2" stroke-linecap="round"/>`; }).join('');
    const circles = Array.from({ length: 9 }, (_, i) => { const { x, y } = np(i); const active = patternNodes.includes(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(active ? r * 1.4 : r).toFixed(1)}" fill="${active ? 'black' : '#999'}"/>`; }).join('');
    return `<div style="position:absolute;left:5%;top:auto;margin-top:2px"><svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="display:block">${lines}${circles}</svg></div>`;
  };

  const elementsHtml = elements.map((el: any) => {
    if (el.type === 'line') {
      return `<div style="position:absolute;left:${el.x}%;top:${el.y * 4.8}px;width:${el.width || 90}%;border-top:1px dashed #000;transform:translateY(-50%)"></div>`;
    }
    if (el.type === 'rect') {
      return `<div style="position:absolute;left:${el.x}%;top:${el.y * 4.8}px;width:${el.width || 45}%;height:${(el.height || 35) * 4.8}px;border:1.5px solid #000;border-radius:2px"></div>`;
    }
    let text = el.text || '';
    Object.entries(tagReplacements).forEach(([tag, val]) => { text = text.split(tag).join(val); });
    const alignStyle = el.align === 'center' ? 'transform:translateX(-50%);text-align:center' : el.align === 'right' ? 'transform:translateX(-100%);text-align:right' : 'text-align:left';
    const invertedStyle = el.inverted ? 'background:black;color:white;padding:1px 4px;border-radius:2px' : '';
    return `<div style="position:absolute;left:${el.x}%;top:${el.y * 4.8}px;font-size:${(el.fontSize||9)*1.05}px;font-weight:${el.fontWeight==='bolder'?900:el.fontWeight==='bold'?700:400};font-family:'Courier New',monospace;line-height:1.2;white-space:pre-line;width:90%;max-width:100%;${alignStyle};${invertedStyle}">${text}</div>${patternSvgForElement(el.text||'')}`;
  }).join('\n');

  const maxY = elements.reduce((m: number, el: any) => Math.max(m, el.y || 0), 100);
  const containerHeight = maxY * 4.8 + 100;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${paperWidth} auto;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:9px;padding:4mm;color:#000;background:#fff}
  </style></head><body>
    <div style="position:relative;height:${containerHeight}px;width:100%">
      ${elementsHtml}
    </div>
    <div style="border-top:1px dashed #ccc;padding-top:8px;margin-top:8px;text-align:center">
      <div id="barcode-container"></div>
    </div>
  <script>${code128Script}</script>
  </body></html>`;
}

export default function PrintView({ order, sale, config, setActiveTab, onClearSelection, selectedOrderId }: PrintViewProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const isLabel = !!selectedOrderId && (
    selectedOrderId === 'LABEL_SERVICE_MOCK' || 
    selectedOrderId === 'LABEL_PRODUCT_MOCK' || 
    selectedOrderId.startsWith('LABEL_') || 
    selectedOrderId.toUpperCase().includes('LABEL')
  );
  const labelType = selectedOrderId === 'LABEL_PRODUCT_MOCK' ? 'product' : 'service';
  const labelTemplate = labelType === 'service'
    ? (config.labelTemplateService || config.labelTemplate || DEFAULT_LABEL_TEMPLATE)
    : (config.labelTemplateProduct || DEFAULT_LABEL_PRODUCT_TEMPLATE);
  const labelPaperSize = config.labelPaperSize || '50x30mm';
  const labelOrientation = config.labelOrientation || 'horizontal';
  const [wMm, hMm] = (labelPaperSize || '50x30mm').replace('mm', '').split('x').map(Number);
  const printWidth = labelOrientation === 'vertical' ? hMm : wMm;
  const printHeight = labelOrientation === 'vertical' ? wMm : hMm;

  const labelElements = React.useMemo(() => {
    try {
      const trimmed = (labelTemplate || '').trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : (parsed.elements || []);
      }
    } catch (e) {
      // fallback
    }
    return null;
  }, [labelTemplate]);

  const classicLines = React.useMemo(() => {
    if (labelElements) return null;
    return (labelTemplate || '').split('\n').filter((l: string) => l.trim() !== '');
  }, [labelElements, labelTemplate]);

  const defaultData: Record<string, string> = React.useMemo(() => ({
    '{TIENDA}': config.storeName || 'SOPORTE TÉCNICO',
    '{ORDEN}': '#ST-9844',
    '{CLIENTE}': 'Hugo García',
    '{DISPOSITIVO}': 'XIAOMI REDMI NOTE 13 PRO+',
    '{MARCA}': 'XIAOMI',
    '{MODELO}': 'REDMI NOTE 13 PRO+',
    '{FALLA}': 'CAMBIO DE PANTALLA',
    '{TELEFONO}': formatPhoneNumber(config.phone) || '(555) 000-0192',
    '{TECNICO}': 'Ing. Mario',
    '{FECHA}': new Date().toLocaleDateString('es-MX'),
    '{PRODUCTO}': 'Audífonos Bluetooth JBL 520BT',
    '{PRECIO}': `${config.currencySymbol || '$'}899.00`,
    '{CODIGO}': '7891234567890',
  }), [config]);

  const handleSystemPrint = async () => {
    // Dispatch automated-print event (cola de impresión interna)
    const printEvent = new CustomEvent('automated-print', {
      detail: {
        type: isLabel ? 'label' : 'ticket',
        id: order ? order.id : sale ? sale.id : 'PRINT-ST',
        name: isLabel
          ? `Etiqueta adhesiva (${labelType === 'service' ? 'Reparación' : 'Producto'})`
          : (order ? `Comprobante de Servicio ${order.id}` : `Boleta de Venta ${sale ? sale.id : ''}`),
        details: isLabel
          ? `Código SKU: ${order ? order.id : 'SKU-GENERICO'}`
          : (order ? `Cliente: ${order.customerName} • ${order.deviceBrand} ${order.deviceModel}` : `Total de compra: ${config.currencySymbol}${(sale ? sale.total : 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      }
    });
    window.dispatchEvent(printEvent);

    const eAPI = (window as any).electronAPI;
    if (!eAPI) return;

    if (!isLabel && order && eAPI.silentPrintHtml) {
      // Ticket de servicio: genera HTML hermoso con buildTicketHtml
      const paperWidthMicrons = config.ticketPaperWidth === '58mm' ? 48000 : config.ticketPaperWidth === 'media-carta-duplicado' ? 210000 : config.ticketPaperWidth === 'media-carta' ? 215900 : 72000;
      const paperHeightMicrons = config.ticketPaperWidth === 'media-carta' ? 139700 : config.ticketPaperWidth === 'media-carta-duplicado' ? 297000 : (config.ticketPaperHeight && config.ticketPaperHeight > 0 ? config.ticketPaperHeight * 1000 : undefined);
      try {
        const html = buildTicketHtml(order, config);
        const duplexMode = (config.printDuplexContract && !config.duplexManual) ? 'longEdge' : undefined;
        await eAPI.silentPrintHtml({
          html,
          deviceName: config.ticketPrinterBrand || '',
          paperWidthMicrons,
          paperHeightMicrons,
          isLabel: false,
          duplexMode,
          useDynamicHeight: config.useDynamicHeight ?? false,
          usePrinterDefaultPageSize: config.usePrinterDefaultPageSize ?? false,
          selectedPrinterProfileId: config.selectedPrinterProfileId
        });
      } catch (e) { console.error('silentPrintHtml falló:', e); }
    } else if (eAPI.silentPrint) {
      // Etiqueta u otros: imprime la vista actual
      const deviceName = isLabel ? (config.labelPrinterBrand || '') : (config.ticketPrinterBrand || '');
      let paperWidthMicrons = undefined;
      let paperHeightMicrons = undefined;
      
      if (isLabel) {
        if (config.labelOrientation === 'vertical') {
          paperWidthMicrons = Math.round(hMm * 1000);
          paperHeightMicrons = Math.round(wMm * 1000);
        } else {
          paperWidthMicrons = Math.round(wMm * 1000);
          paperHeightMicrons = Math.round(hMm * 1000);
        }
      } else {
        paperWidthMicrons = config.ticketPaperWidth === '58mm' ? 48000 : config.ticketPaperWidth === 'media-carta-duplicado' ? 210000 : config.ticketPaperWidth === 'media-carta' ? 215900 : 72000;
        paperHeightMicrons = config.ticketPaperWidth === 'media-carta' ? 139700 : config.ticketPaperWidth === 'media-carta-duplicado' ? 297000 : (config.ticketPaperHeight && config.ticketPaperHeight > 0 ? config.ticketPaperHeight * 1000 : undefined);
      }
      try {
        await eAPI.silentPrint({ 
          deviceName, 
          copies: 1, 
          paperWidthMicrons, 
          paperHeightMicrons, 
          isLabel,
          landscape: isLabel ? (config.labelOrientation === 'vertical' ? false : true) : false
        });
      } catch (e) { console.error('silentPrint falló:', e); }
    }

    setTimeout(() => {
      onClearSelection();
      setActiveTab(isLabel ? 'Config' : isOrder ? 'Órdenes' : 'POS');
    }, 400);
  };

  const handleSavePdf = async () => {
    const eAPI = (window as any).electronAPI;
    if (!eAPI?.printToPdf) return;
    const isStar = config.selectedPrinterProfileId === 'star-tsp100';
    const paperWidth = isStar ? '72mm' : (config.ticketPaperWidth || '80mm');
    let html = '';
    if (isOrder && order) {
      html = buildTicketHtml(order, config);
    } else if (!isOrder && sale) {
      const saleForTicket = {
        ...sale,
        items: sale.items.map(i => ({
          description: i.description || i.name || '',
          name: i.name || i.description || '',
          quantity: i.quantity,
          price: i.price,
          originalPrice: i.originalPrice,
          discountValue: i.discountValue ?? (i as any).lineDiscountValue,
          discountType: i.discountType ?? (i as any).lineDiscountType,
          fromWarehouseId: (i as any).fromWarehouseId
        })),
        discount: sale.discount,
        discountType: sale.discountType,
        discountValue: sale.discountValue,
      };
      html = buildPosTicketHtml(saleForTicket, config);
    } else {
      return;
    }
    const filename = isOrder
      ? `ticket-servicio-${order?.id || 'orden'}.pdf`
      : `ticket-venta-${sale?.id || 'pos'}.pdf`;
    await eAPI.printToPdf({ html, filename, paperWidth });
  };

  useEffect(() => {
    // Disparar impresión automáticamente al entrar a esta vista
    const timer = setTimeout(() => {
      handleSystemPrint();
    }, 600);
    return () => clearTimeout(timer);
  }, [order, sale, labelType, isLabel]);

  // Determine ticket details
  const isOrder = !!order;
  const ticketId = isOrder ? order?.id : sale ? sale?.id : 'ST-015';
  const rawDate = isOrder ? order?.createdAt : sale?.createdAt;
  const formattedDate = rawDate ? new Date(rawDate).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : new Date().toLocaleString();

  const clientName = isOrder ? order?.customerName : 'Público General';
  const clientPhone = isOrder && order?.customerPhone 
    ? (() => {
        const cc = (order.customerCountryCode || '').trim();
        const cleanCc = cc.replace(/\D/g, '');
        const formatted = formatPhoneNumber(order.customerPhone);
        return cleanCc === '52' || !cc ? formatted : `${cc} ${formatted}`;
      })()
    : 'N/A';

  // Calculate items breakdown
  const itemsList = isOrder
    ? [{
        description: `Reparación: ${order?.deviceBrand} ${order?.deviceModel} - ${order?.serviceType}`,
        price: order?.cost || 0,
        qty: 1,
        originalPrice: order?.cost,
        discountValue: 0,
        discountType: 'fixed' as const
      }]
    : sale?.items.map(i => ({
        description: i.name,
        price: i.price,
        qty: i.quantity,
        originalPrice: i.originalPrice,
        discountValue: i.discountValue,
        discountType: i.discountType
      })) || [];

  const subtotalSum = itemsList.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalTax = subtotalSum * config.taxRate;
  const grandTotal = isOrder ? (order?.cost || 0) : (sale?.total || 0);

  // Compute design elements from parsed custom templates
  const elements = React.useMemo(() => {
    try {
      const templateStr = isOrder
        ? (config.ticketTemplateService || DEFAULT_TICKET_SERVICE)
        : (config.ticketTemplatePOS || DEFAULT_TICKET_POS);
      return JSON.parse(templateStr);
    } catch (e) {
      return null;
    }
  }, [config.ticketTemplatePOS, config.ticketTemplateService, isOrder]);

  const maxElementY = React.useMemo(() => {
    if (!elements || elements.length === 0) return 100;
    return elements.reduce((m: number, el: any) => Math.max(m, el.y || 0), 100);
  }, [elements]);

  const containerHeight = `${maxElementY * 4.8 + 105}px`;

  // Compilar variables dinámicas
  const tagReplacements = React.useMemo(() => {
    const data: Record<string, string> = {
      '{TIENDA}': config.storeName || 'SOPORTE TÉCNICO',
      '{SLOGAN}': config.slogan || 'REPARACIONES & POS',
      '{FECHA}': formattedDate,
      '{TELEFONO}': isOrder && order?.customerPhone 
        ? (() => {
            const cc = (order.customerCountryCode || '').trim();
            const cleanCc = cc.replace(/\D/g, '');
            const formatted = formatPhoneNumber(order.customerPhone);
            return cleanCc === '52' || !cc ? formatted : `${cc} ${formatted}`;
          })()
        : formatPhoneNumber(config.phone),
      '{ORDEN}': order?.id || 'TKT-000',
      '{CLIENTE}': clientName || 'Público General',
      '{LEYENDA_PIE}': isOrder
        ? (config.ticketFooterService || config.ticketFooter || '¡Garantía en Reparaciones!')
        : (config.ticketFooterPOS || config.ticketFooter || '¡Conserve su recibo!'),
      '{POLITICAS}': isOrder
        ? (config.termsAndConditionsService || config.termsAndConditions || 'No nos hacemos responsables por equipos mojados.')
        : (config.termsAndConditionsPOS || config.termsAndConditions || 'Cambios únicamente en los primeros 5 días.'),
    };

    data['{DATOS_CLIENTE}'] = `CLIENTE: ${clientName.toUpperCase()}\nTELÉFONO: ${clientPhone}`;
    const pinDisplay = parsePatternNodes(order?.devicePin || '') ? 'PATRÓN:' : (order?.devicePin || '(NINGUNO)');
    data['{DATOS_EQUIPO}'] = `EQUIPO: ${(order?.deviceType || 'Dispositivo').toUpperCase()}\nMARCA/MOD: ${(order?.deviceBrand || 'S/M').toUpperCase()} ${(order?.deviceModel || '').toUpperCase()}\nPIN/BLOQUEO: ${pinDisplay}`;
    const notesText = (order?.diagnosticsNote || '').trim();
    const isDefaultNote = notesText.toUpperCase() === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                          notesText.toUpperCase() === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                          notesText.toUpperCase() === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                          notesText.toUpperCase() === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
    const hasCustomNote = notesText !== '' && !isDefaultNote;
    data['{FALLA_SERVICIO}'] = `FALLA EXP: ${(order?.faultDescription || 'Revisión técnica').toUpperCase()}\nSERVICIO: ${(order?.serviceType || 'Solución').toUpperCase()}${hasCustomNote ? `\nDETALLES: ${order.diagnosticsNote}` : ''}`;

    // Tags individuales para el preset "Orden de Trabajo ★"
    const sym = config.currencySymbol || '$';
    const cleanFault = (order?.faultDescription || '').replace(/^\[ACCESO:[^\]]*\]\s*/i, '').replace(/^\[No\.\s*Modelo:[^\]]*\]\s*/i, '');
    data['{NOM_CLIENTE}'] = clientName.toUpperCase() || 'N/A';
    data['{TEL_CLIENTE}'] = clientPhone || 'N/A';
    data['{MARCA}'] = (order?.deviceBrand || '').toUpperCase();
    data['{MODELO}'] = (order?.deviceModel || '').toUpperCase();
    data['{TIPO}'] = order?.deviceType === 'Phone' ? 'CELULAR' : (order?.deviceType || '').toUpperCase();
    data['{NO_MODELO}'] = (order?.deviceModelNumber || '').toUpperCase();
    data['{PROBLEMA}'] = cleanFault.toUpperCase() || 'N/A';
    data['{ACCESO}'] = pinDisplay;
    data['{SERVICIO}'] = (order?.serviceType || 'SERVICIO GENERAL').toUpperCase();
    data['{TECNICO}'] = (order?.assignedTechnician || '').toUpperCase();
    data['{ENTREGA}'] = order?.estimatedDeliveryDate 
      ? (() => {
          const dateStr = order.estimatedDeliveryDate;
          if (dateStr.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
          }
          const d = new Date(dateStr);
          return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        })()
      : 'N/A';
    data['{COSTO}'] = `${sym}${(order?.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    data['{ANTICIPO}'] = `${sym}${(order?.advancePayment || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    data['{SALDO}'] = `${sym}${Math.max(0, (order?.cost || 0) - (order?.advancePayment || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let itemsStr = '';
    itemsList.forEach((item) => {
      const q = `${item.qty}x `;
      const desc = item.description.substring(0, 24).padEnd(24);
      const pr = `${config.currencySymbol}${(item.price * item.qty).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      itemsStr += `${q}${desc} ${pr}\n`;
      
      const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
      const discountValue = item.discountValue;
      const discountType = item.discountType;
      const hasLineDiscount = discountValue !== undefined && discountValue > 0;
      
      if (hasLineDiscount) {
        const unitDiscountAmt = originalPrice - item.price;
        const descDetail = discountType === 'percentage'
          ? `${discountValue}% (ahorro ${config.currencySymbol}${unitDiscountAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
          : `${config.currencySymbol}${discountValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por unidad`;
        itemsStr += `   └─ Descuento: -${descDetail}\n`;
      }
    });
    data['{DETALLE_MOSTRADOR}'] = itemsStr.trim();

    let calcStr = '';
    if (config.showTaxRate !== false) {
      calcStr += `SUBTOTAL:   ${config.currencySymbol}${(subtotalSum / (1 + config.taxRate)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      calcStr += `I.V.A:      ${config.currencySymbol}${(subtotalSum - (subtotalSum / (1 + config.taxRate))).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    }
    calcStr += `TOTAL NETO: ${config.currencySymbol}${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (isOrder && order) {
      calcStr += `\nANTICIPO:   -${config.currencySymbol}${(order.advancePayment || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length === 1) {
        calcStr += ` (${order.advancePaymentBreakdown[0].method})`;
      } else if (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 1) {
        order.advancePaymentBreakdown.forEach(b => {
          calcStr += `\n↳ ${b.method}: ${config.currencySymbol}${b.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        });
      }
      calcStr += `\nSALDO REST:  ${config.currencySymbol}${Math.max(0, (order.cost || 0) - (order.advancePayment || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    data['{DESGLOSE_PAGOS}'] = calcStr;

    // Mapeos adicionales para etiquetas adhesivas
    data['{DISPOSITIVO}'] = order
      ? `${(order.deviceBrand || '').toUpperCase()} ${(order.deviceModel || '').toUpperCase()}${order.deviceModelNumber ? ` (${order.deviceModelNumber.toUpperCase()})` : ''}`.trim()
      : 'XIAOMI REDMI NOTE 13 PRO+';
    data['{FALLA}'] = order ? (order.faultDescription || 'FALLA EXP').toUpperCase() : 'CAMBIO DE PANTALLA';
    data['{PRODUCTO}'] = sale ? (sale.items?.[0]?.name || 'PRODUCTO').toUpperCase() : 'PRODUCTO MOCK';
    data['{PRECIO}'] = `${sym}${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    data['{CODIGO}'] = order ? order.id : (sale ? sale.id : '1234567890');

    return data;
  }, [config, order, sale, clientName, clientPhone, formattedDate, grandTotal, subtotalSum, isOrder, itemsList]);

  return (
    <div className="flex-1 p-4 md:p-6 bg-[#0c0c0e] overflow-y-auto space-y-6 text-gray-200 select-none">
      {/* Print CSS para ticket térmico */}
      {!isLabel && (
        <style>{`
          @media print {
            @page { size: ${config.selectedPrinterProfileId === 'star-tsp100' ? '72mm' : (config.ticketPaperWidth || '80mm')} auto; margin: 0; }
            html, body { width: ${config.selectedPrinterProfileId === 'star-tsp100' ? '72mm' : (config.ticketPaperWidth || '80mm')}; margin: 0; padding: 0; background: white; }
            body * { visibility: hidden !important; }
            #thermal-ticket-print, #thermal-ticket-print * { visibility: visible !important; }
            #thermal-ticket-print {
              position: absolute !important;
              left: 0 !important; top: 0 !important;
              width: 100% !important;
              margin: 0 !important; padding: 5px !important;
              background: white !important; color: black !important;
              box-shadow: none !important; border: none !important;
            }
            #thermal-ticket-print svg { display: block !important; overflow: visible !important; }
          }
        `}</style>
      )}

      {isLabel && (
        <style>{`
          @media print {
            @page {
              size: ${printWidth}mm ${printHeight}mm;
              margin: 0;
            }
            body * {
              visibility: hidden !important;
            }
            #custom-label-sticker-print, #custom-label-sticker-print * {
              visibility: visible !important;
            }
            #custom-label-sticker-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${printWidth}mm !important;
              height: ${printHeight}mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 1.5mm !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
        `}</style>
      )}

      {/* View Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
        <button
          onClick={() => {
            onClearSelection();
            if (isLabel) {
              setActiveTab('Config');
            } else {
              setActiveTab(isOrder ? 'Órdenes' : 'POS');
            }
          }}
          className="px-3.5 py-1.5 text-xs font-bold font-sans bg-zinc-900 border border-zinc-800 hover:text-white cursor-pointer rounded flex items-center gap-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Volver a {isLabel ? 'Configuración' : isOrder ? 'Órdenes' : 'Punto de Venta'}
        </button>

        <div className="flex items-center gap-2">
          {!isLabel && (
            <button
              onClick={handleSavePdf}
              className="px-3.5 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded flex items-center gap-2 transition-all cursor-pointer"
              title="Guardar como PDF (simulación de impresión)"
            >
              <FileDown className="w-4 h-4" /> Guardar PDF
            </button>
          )}
          <button
            onClick={handleSystemPrint}
            className="px-4 py-2 text-xs font-black tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] rounded flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 animate-bounce" /> IMPRIMIR {isLabel ? 'ETIQUETA' : 'TICKET'} (PRO)
          </button>
        </div>
      </div>

      {/* Main Grid: Ticket Sheet Previewer or Sticker Plate Mockup */}
      <div className="flex justify-center max-w-full">
        {isLabel ? (
          /* Custom Adhesive Label Container */
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md shadow-2xl space-y-4 flex flex-col items-center">
            <div className="text-center font-mono text-[10px] text-zinc-500 mb-2 uppercase leading-none">
              Vista Previa de Etiqueta Adhesiva ({labelPaperSize})
            </div>

            {/* Sticker Plate mockup */}
            <div
              ref={printAreaRef}
              id="custom-label-sticker-print"
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className={`bg-[#fefce8] text-zinc-900 shadow-xl rounded-lg border-2 border-dashed border-amber-300/80 select-text select-all relative overflow-hidden transition-all ${
                (() => {
                  const [wMm, hMm] = (labelPaperSize || '51x25mm').replace('mm','').split('x').map(Number);
                  const scale = 3.78 * 1.5;
                  const wPx = Math.round(wMm * scale);
                  const hPx = Math.round(hMm * scale);
                  return labelOrientation === 'vertical'
                    ? `w-[${hPx}px] h-[${wPx}px]`
                    : `w-[${wPx}px] h-[${hPx}px]`;
                })()
              }`}
            >
              {/* Background Sample Image if defined */}
              {config.labelSampleImageUrl && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                  <img 
                    src={config.labelSampleImageUrl} 
                    alt="Fondo Calibrador Inteligente" 
                    className="w-full h-full object-cover filter grayscale contrast-200 brightness-110 opacity-20"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Sticker Elements */}
              <div className="w-full h-full relative z-10 p-1">
                {labelElements ? (
                  <>
                    {labelElements.map((elem: any) => {
                      let displayVal = elem.text || '';
                      const activeData = (selectedOrderId === 'LABEL_SERVICE_MOCK' || selectedOrderId === 'LABEL_PRODUCT_MOCK' || (!order && !sale))
                        ? defaultData
                        : tagReplacements;
                      Object.keys(activeData).forEach((key) => {
                        if (displayVal.includes(key)) {
                          displayVal = displayVal.split(key).join(activeData[key]);
                        }
                      });
                      if (elem.type === 'line') {
                        const isVertical = elem.orientation === 'vertical';
                        return (
                          <div key={elem.id} className="absolute" style={{ left: `${elem.x}%`, top: `${elem.y}%`, width: isVertical ? '2px' : `${elem.width || 80}%`, height: isVertical ? `${elem.height || 40}%` : '2px', backgroundColor: 'black', zIndex: 10 }} />
                        );
                      }
                      if (elem.type === 'rect') {
                        return (
                          <div key={elem.id} className="absolute" style={{ left: `${elem.x}%`, top: `${elem.y}%`, width: `${elem.width || 45}%`, height: `${elem.height || 35}%`, border: '2px solid black', borderRadius: '3px', zIndex: 10 }} />
                        );
                      }
                      return (
                        <div key={elem.id} className="absolute break-words select-text uppercase leading-none font-bold" style={{ left: `${elem.x}%`, top: `${elem.y}%`, fontSize: `${elem.fontSize || 10}px`, fontWeight: elem.fontWeight === 'bolder' ? '900' : elem.fontWeight === 'bold' ? '700' : '500', textAlign: elem.align || 'left', transform: elem.align === 'center' ? 'translateX(-50%)' : elem.align === 'right' ? 'translateX(-100%)' : 'none', writingMode: elem.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb', backgroundColor: elem.inverted ? 'black' : 'transparent', color: elem.inverted ? 'white' : 'black', padding: elem.inverted ? '2px 4px' : '0px', borderRadius: elem.inverted ? '2px' : '0px', zIndex: 10 }}>
                          {displayVal}
                        </div>
                      );
                    })}
                    {/* Patrón en etiqueta — elemento independiente */}
                    {(() => {
                      const patternNodes = parsePatternNodes(order?.devicePin || '');
                      if (!patternNodes) return null;
                      const datosEl = labelElements.find((el: any) => el.text?.includes('{ACCESO}')) ||
                                      labelElements.find((el: any) => el.text?.includes('{DATOS_EQUIPO}')) ||
                                      labelElements.find((el: any) => el.text?.includes('{DISPOSITIVO}'));
                      if (!datosEl) return null;
                      const isAcceso = datosEl.text?.includes('{ACCESO}');
                      const topOffset = isAcceso ? '16px' : '28px';
                      return (
                        <div className="absolute" style={{ left: `${datosEl.x}%`, top: `calc(${datosEl.y}% + ${topOffset})`, zIndex: 11 }}>
                          <PatternSvg nodes={patternNodes} size={38} />
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="space-y-1 w-full text-[8.5px] text-zinc-900 font-bold select-text text-left p-2">
                    {classicLines && classicLines.map((line: string, lineIdx: number) => {
                      let displayVal = line;
                      const activeData = (selectedOrderId === 'LABEL_SERVICE_MOCK' || selectedOrderId === 'LABEL_PRODUCT_MOCK' || (!order && !sale))
                        ? defaultData
                        : tagReplacements;
                      Object.keys(activeData).forEach((key) => {
                        if (displayVal.includes(key)) {
                          displayVal = displayVal.split(key).join(activeData[key]);
                        }
                      });
                      return <div key={lineIdx} className="truncate select-text">{displayVal}</div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Ticket Container */
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="text-center font-mono text-[10px] text-zinc-500 mb-2 uppercase leading-none">
              Vista Previa de Impresión Térmica (58mm / 80mm)
            </div>

            {/* Actual physical thermal ticket container rendered in retro paper styling */}
            <div
              ref={printAreaRef}
              id="thermal-ticket-print"
              className="bg-[#faf9f5] border-l-[3px] border-amber-600/30 text-zinc-900 p-5 font-mono shadow-md text-[11px] select-text select-all flex flex-col items-stretch space-y-4 rounded-sm border border-zinc-250 animate-fadeIn"
            >
              {/* Template Container Canvas styling */}
              <div 
                style={{ position: 'relative', height: containerHeight, width: '100%', minHeight: '380px' }}
                className="w-full text-zinc-950 font-mono text-[9px] select-text"
              >
                {elements && elements.map((el: any) => {
                  if (el.type === 'line') {
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y * 4.8}px`,
                          width: `${el.width || 90}%`,
                          borderTop: '1px dashed #52525b',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    );
                  }

                  // Compile tag labels
                  let renderedText = el.text || '';
                  Object.entries(tagReplacements).forEach(([tag, value]) => {
                    renderedText = renderedText.split(tag).join(value);
                  });

                  // Style aligns
                  let alignmentStyles: React.CSSProperties = {};
                  if (el.align === 'center') {
                    alignmentStyles = {
                      left: `${el.x}%`,
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                    };
                  } else if (el.align === 'right') {
                    alignmentStyles = {
                      left: `${el.x}%`,
                      transform: 'translateX(-100%)',
                      textAlign: 'right',
                    };
                  } else {
                    alignmentStyles = {
                      left: `${el.x}%`,
                      textAlign: 'left',
                    };
                  }

                  return (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        top: `${el.y * 4.8}px`,
                        fontSize: `${(el.fontSize || 9) * 1.05}px`,
                        fontWeight: el.fontWeight || 'normal',
                        fontFamily: 'monospace',
                        lineHeight: '1.2',
                        whiteSpace: 'pre-line',
                        width: '90%',
                        maxWidth: '100%',
                        pointerEvents: 'none',
                        ...alignmentStyles,
                      }}
                      className={el.inverted ? 'bg-zinc-950 text-white px-2 py-0.5 rounded text-center inline-block max-w-full font-bold' : ''}
                    >
                      {renderedText}
                    </div>
                  );
                })}

                {/* Patrón de desbloqueo — elemento independiente posicionado tras DATOS_EQUIPO */}
                {(() => {
                  const patternNodes = parsePatternNodes(order?.devicePin || '');
                  if (!patternNodes) return null;
                  const datosEl = elements?.find((el: any) => el.text?.includes('{ACCESO}')) ||
                                  elements?.find((el: any) => el.text?.includes('{DATOS_EQUIPO}')) ||
                                  elements?.find((el: any) => el.text?.includes('{DISPOSITIVO}'));
                  const isAcceso = datosEl?.text?.includes('{ACCESO}');
                  const topPx = datosEl ? (datosEl.y * 4.8 + (isAcceso ? 22 : 36)) : 280;
                  return (
                    <div style={{ position: 'absolute', top: `${topPx}px`, left: '5%' }}>
                      <PatternSvg nodes={patternNodes} size={54} />
                    </div>
                  );
                })()}

                {/* Standard Barcode and footer at the bottom of the absolute container */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    bottom: '10px', 
                    left: '0', 
                    right: '0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    borderTop: '1px dashed #ccc',
                    paddingTop: '12px'
                  }}
                  className="text-center font-mono mt-4"
                >
                  {/* Simulated 1D Barcode */}
                  <div className="h-9 flex items-stretch justify-center bg-white border border-zinc-200/60 rounded px-5 py-1 shadow-sm mx-auto w-auto shrink-0 select-none">
                    <div className="w-[1.5px] bg-black mr-[0.5px]"></div>
                    <div className="w-[0.5px] bg-black mr-[1.5px]"></div>
                    <div className="w-[1px] bg-black mr-[0.5px]"></div>
                    <div className="w-[2.5px] bg-black mr-[1px]"></div>
                    <div className="w-[0.5px] bg-black mr-[0.5px]"></div>
                    <div className="w-[1.5px] bg-black mr-[2px]"></div>
                    <div className="w-[2px] bg-black mr-[0.5px]"></div>
                    <div className="w-[0.5px] bg-black mr-[1.5px]"></div>
                    <div className="w-[1.5px] bg-black mr-[0.5px]"></div>
                    <div className="w-[0.5px] bg-black mr-[1px]"></div>
                    <div className="w-[3px] bg-black mr-[1.5px]"></div>
                    <div className="w-[1px] bg-black mr-[0.5px]"></div>
                    <div className="w-[1.5px] bg-black mr-[0.5px]"></div>
                    <div className="w-[0.5px] bg-black mr-[2.5px]"></div>
                    <div className="w-[2.5px] bg-black"></div>
                  </div>
                  <span className="text-[8px] font-mono tracking-widest font-bold mt-1 text-zinc-500 uppercase">
                    * {ticketId} *
                  </span>
                  <div className="text-[7px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">
                    SOPORTE TÉCNICO AUTORIZADO
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
