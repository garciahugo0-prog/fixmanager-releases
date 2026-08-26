/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RepairOrder, WorkshopConfig, Quote, QuoteDevice, DailySchedule, WeeklySchedule, ApartadoEntry } from '../types';

export function formatCustomerPhoneWithCountryCode(phone: string | undefined, countryCode: string | undefined): string {
  if (!phone) return 'N/A';
  const cc = countryCode ? countryCode.trim() : '';
  const rawDigits = phone.replace(/\D/g, '');
  let phoneDigits = rawDigits;
  let ccPrefix = cc;
  
  if (cc) {
    const cleanCc = cc.replace(/\D/g, '');
    if (cleanCc && rawDigits.startsWith(cleanCc) && rawDigits.length > cleanCc.length) {
      phoneDigits = rawDigits.slice(cleanCc.length);
    }
  }
  
  const formatted10 = phoneDigits.length === 10
    ? phoneDigits.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
    : phone;
    
  if (ccPrefix) {
    const cleanPrefix = ccPrefix.replace(/\D/g, '');
    if (cleanPrefix === '52') {
      return formatted10;
    }
  }
    
  return ccPrefix ? `${ccPrefix} ${formatted10}` : formatted10;
}

export function formatPromiseDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    if (dateStr.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return 'N/A';
  }
}

export function getMediaCartaStorePhonesLine(config: WorkshopConfig): string {
  const phone = config.phone
    ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
    : '';
  const phone2 = config.phone2
    ? config.phone2.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone2
    : '';

  if (phone && phone2) {
    return 'Tel: ' + phone + ' · WA: ' + phone2;
  } else if (phone) {
    return 'Tel: ' + phone;
  } else if (phone2) {
    return 'WA: ' + phone2;
  }
  return '';
}

function parsePatternNodes(devicePin: string): number[] | null {
  if (!devicePin) return null;
  // Formato con prefijo: "PATRÓN: 0-1-3" o solo números separados por guión: "0-1-3"
  const withPrefix = devicePin.toUpperCase().match(/^PATR[OÓ]N:\s*([\d\-]+)$/);
  const raw = !withPrefix ? devicePin.match(/^[\d\-]+$/) : null;
  const str = withPrefix ? withPrefix[1] : (raw ? raw[0] : null);
  if (!str) return null;
  const nodes = str.split('-').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 8);
  return nodes.length > 0 ? nodes : null;
}

function buildPatternSvgHtml(patternNodes: number[]): string {
  const size = 66;
  const cell = size / 3;
  const r = cell * 0.22;
  const np = (i: number) => ({ x: (i % 3) * cell + cell / 2, y: Math.floor(i / 3) * cell + cell / 2 });
  
  const lines = patternNodes
    .slice(1)
    .map((n, i) => {
      const a = np(patternNodes[i]);
      const b = np(n);
      return '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" stroke="black" stroke-width="2" stroke-linecap="round"/>';
    })
    .join('');

  let arrowHtml = '';
  const nodeR = r * 1.4;
  const arrowSize = 4.5;
  if (patternNodes.length >= 2) {
    const lp = np(patternNodes[patternNodes.length - 2]);
    const lq = np(patternNodes[patternNodes.length - 1]);
    const dx = lq.x - lp.x;
    const dy = lq.y - lp.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    
    // Tip of the arrow lands exactly at the boundary of the last node (circle)
    const tip = { x: lq.x - ux * nodeR, y: lq.y - uy * nodeR };
    const base = { x: tip.x - ux * arrowSize, y: tip.y - uy * arrowSize };
    const l1 = { x: base.x + px * arrowSize * 0.7, y: base.y + py * arrowSize * 0.7 };
    const l2 = { x: base.x - px * arrowSize * 0.7, y: base.y - py * arrowSize * 0.7 };
    
    arrowHtml = '<polygon points="' + tip.x.toFixed(1) + ',' + tip.y.toFixed(1) + ' ' + l1.x.toFixed(1) + ',' + l1.y.toFixed(1) + ' ' + l2.x.toFixed(1) + ',' + l2.y.toFixed(1) + '" fill="black" />';
  }

  const circles = Array.from({ length: 9 }, (_, i) => {
    const { x, y } = np(i);
    const activeIndex = patternNodes.indexOf(i);
    const active = activeIndex !== -1;
    if (active) {
      const stepNumber = activeIndex + 1;
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + nodeR.toFixed(1) + '" fill="black" stroke="black" stroke-width="0"/>' +
             '<text x="' + x.toFixed(1) + '" y="' + (y + 0.5).toFixed(1) + '" fill="white" font-size="8.5px" font-weight="900" text-anchor="middle" dominant-baseline="middle">' + stepNumber + '</text>';
    } else {
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="black" stroke-width="0.8"/>';
    }
  }).join('');

  return '<svg width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" style="display:block">' + lines + arrowHtml + circles + '</svg>';
}

const CODE128_SCRIPT_TEMPLATE = `(function(){
  var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
  var START_B=104,STOP=106;
  function encode(s){
    var codes=[START_B],sum=START_B;
    for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}
    codes.push(sum%103);codes.push(STOP);
    return codes;
  }
  function draw(text){
    var codes=encode(text);
    
    // Calcular módulos totales para determinar el ancho óptimo
    var totalModules = 0;
    for(var i=0;i<codes.length;i++){
      var pat=C128[codes[i]];
      for(var j=0;j<pat.length;j++){
        totalModules += pat[j];
      }
    }

    var barcodeAsImage = false; // __BARCODE_AS_IMAGE__
    var hideText = false; // __HIDE_TEXT__
    var targets = document.getElementsByClassName('bc-target');
    var el = document.getElementById('bc');
    var targetEl = el;
    if (targets && targets.length > 0) {
      targetEl = targets[0];
    }

    // Medición del ancho real del contenedor padre
    var containerWidth = 150;
    if (targetEl && targetEl.parentElement) {
      containerWidth = targetEl.parentElement.offsetWidth || 150;
    }
    if (containerWidth <= 0) {
      containerWidth = 150;
    }

    // Diseñar código para ocupar el 90% del contenedor para quiet zones seguras
    var availableWidth = Math.floor(containerWidth * 0.90);
    if (availableWidth < 80) availableWidth = 80;

    // Calcular bw de forma adaptativa
    var bw = availableWidth / totalModules;
    if (bw < 0.9) {
      bw = 0.9;
    } else if (bw > 2.0) {
      bw = 2.0;
    }
    bw = Math.round(bw * 100) / 100;

    var bw=2,h=32,x=10,bars=[];
    // Sobrescribir bw inicial de la firma de reemplazo por el dinámico calculado
    bw = bw; 

    for(var i=0;i<codes.length;i++){
      var pat=C128[codes[i]];
      for(var j=0;j<pat.length;j++){
        if(j%2===0)bars.push({x:x,w:pat[j]*bw});
        x+=pat[j]*bw;
      }
    }
    var tw=x+10;

    if (barcodeAsImage) {
      var canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = h + (hideText ? 2 : 12);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, tw, h + (hideText ? 2 : 12));
      ctx.fillStyle = 'black';
      for (var k = 0; k < bars.length; k++) { ctx.fillRect(bars[k].x, 0, bars[k].w, h); }
      if (!hideText) {
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'black';
        ctx.fillText(text, tw / 2, h + 10);
      }
      var imgUrl = canvas.toDataURL('image/png');
      var img = '<img src="' + imgUrl + '" style="display:block;width:auto;max-width:100%;height:auto;margin:0 auto" />';
      if (targets && targets.length > 0) {
        for (var t = 0; t < targets.length; t++) { targets[t].innerHTML = img; }
      } else {
        if (el) el.innerHTML = img;
      }
    } else {
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+tw+'" height="'+(h+(hideText ? 2 : 12))+'" viewBox="0 0 '+tw+' '+(h+(hideText ? 2 : 12))+'" shape-rendering="crispEdges" style="display:block;width:auto;max-width:100%;height:auto;margin:0 auto">';
      for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black" shape-rendering="crispEdges"/>';}
      if (!hideText) {
        var escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        svg+='<text x="'+(tw/2)+'" y="'+(h+10)+'" text-anchor="middle" font-family="monospace" font-size="9" fill="black">'+escapedText+'</text>';
      }
      svg+='</svg>';
      if (targets && targets.length > 0) {
        for (var t = 0; t < targets.length; t++) { targets[t].innerHTML = svg; }
      } else {
        if (el) el.innerHTML = svg;
      }
    }
  }
  draw('__ORDER_ID__');
})();`;

// Versión del script que hace el SVG responsivo
export const CODE128_RESPONSIVE = CODE128_SCRIPT_TEMPLATE;

export function getBarcodeScript(text: string, barcodeAsImage?: boolean, showBarcode?: boolean, hideText?: boolean, barHeight?: number): string {
  if (showBarcode === false) return '';
  const heightVal = barHeight || 32;
  return CODE128_RESPONSIVE
    .replace('__ORDER_ID__', text)
    .replace('// __BARCODE_AS_IMAGE__', 'barcodeAsImage = ' + (barcodeAsImage ? 'true' : 'false') + ';')
    .replace('// __HIDE_TEXT__', 'hideText = ' + (hideText ? 'true' : 'false') + ';')
    .replace('var bw=2,h=32', 'var bw=2,h=' + heightVal);
}


function formatDayGroup(days: string[], labels: Record<string, string>): string {
  const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const indices = days.map(d => allDays.indexOf(d)).sort((a, b) => a - b);
  
  const parts: string[] = [];
  let start = indices[0];
  let prev = indices[0];

  for (let i = 1; i <= indices.length; i++) {
    const curr = indices[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      if (start === prev) {
        parts.push(labels[allDays[start]]);
      } else {
        parts.push(`${labels[allDays[start]]}-${labels[allDays[prev]]}`);
      }
      start = curr;
      prev = curr;
    }
  }

  return parts.join(', ');
}

export function formatWeeklySchedule(hoursJson: string | undefined): string {
  if (!hoursJson) return '';
  if (!hoursJson.trim().startsWith('{')) {
    return hoursJson;
  }
  try {
    const schedule: WeeklySchedule = JSON.parse(hoursJson);
    const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const shortDayLabels: Record<string, string> = {
      lunes: 'LUN',
      martes: 'MAR',
      miercoles: 'MIÉ',
      jueves: 'JUE',
      viernes: 'VIE',
      sabado: 'SÁB',
      domingo: 'DOM'
    };

    const convertTo12Hour = (timeStr: string | undefined): string => {
      if (!timeStr) return '';
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      let hour = parseInt(parts[0], 10);
      const minute = parts[1];
      if (isNaN(hour)) return timeStr;
      const ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      return `${hour}:${minute}${ampm}`;
    };
    
    const daySchedules = dayNames.map(day => {
      const s = schedule[day];
      let timeStr = 'CERRADO';
      if (s && s.isOpen) {
        if (s.type === 'split') {
          const t1Open = s.openTime || '09:00';
          const t1Close = s.closeTime || '14:00';
          const t2Open = s.openTime2 || '16:00';
          const t2Close = s.closeTime2 || '19:00';
          timeStr = `${convertTo12Hour(t1Open)}-${convertTo12Hour(t1Close)}, ${convertTo12Hour(t2Open)}-${convertTo12Hour(t2Close)}`;
        } else {
          const open = s.openTime || '09:00';
          const close = s.closeTime || '19:00';
          timeStr = `${convertTo12Hour(open)}-${convertTo12Hour(close)}`;
        }
      }
      return { day, timeStr };
    });

    const scheduleToDays: Record<string, string[]> = {};
    daySchedules.forEach(item => {
      if (!scheduleToDays[item.timeStr]) {
        scheduleToDays[item.timeStr] = [];
      }
      scheduleToDays[item.timeStr].push(item.day);
    });

    const formattedGroups: string[] = [];
    const processedSchedules = new Set<string>();

    dayNames.forEach(day => {
      const s = schedule[day];
      let timeStr = 'CERRADO';
      if (s && s.isOpen) {
        if (s.type === 'split') {
          const t1Open = s.openTime || '09:00';
          const t1Close = s.closeTime || '14:00';
          const t2Open = s.openTime2 || '16:00';
          const t2Close = s.closeTime2 || '19:00';
          timeStr = `${convertTo12Hour(t1Open)}-${convertTo12Hour(t1Close)}, ${convertTo12Hour(t2Open)}-${convertTo12Hour(t2Close)}`;
        } else {
          const open = s.openTime || '09:00';
          const close = s.closeTime || '19:00';
          timeStr = `${convertTo12Hour(open)}-${convertTo12Hour(close)}`;
        }
      }

      if (!processedSchedules.has(timeStr)) {
        processedSchedules.add(timeStr);
        const daysInGroup = scheduleToDays[timeStr];
        const formattedDays = formatDayGroup(daysInGroup, shortDayLabels);
        formattedGroups.push(`${formattedDays}: ${timeStr}`);
      }
    });

    // Ordenar los grupos para que los que contienen CERRADO queden siempre al final
    formattedGroups.sort((a, b) => {
      const aClosed = a.toLowerCase().includes('cerrado');
      const bClosed = b.toLowerCase().includes('cerrado');
      if (aClosed && !bClosed) return 1;
      if (!aClosed && bClosed) return -1;
      return 0;
    });

    return formattedGroups.join(' · ');
  } catch (e) {
    return hoursJson;
  }
}

export function buildMediaCartaStoreDetailsHtml(config: WorkshopConfig): string {
  const slogan = config.slogan ? '<i>"' + config.slogan + '"</i><br>' : '';
  const storePhoneLine = getMediaCartaStorePhonesLine(config);
  const mainDetails = [(config.address ? 'Dirección: ' + config.address : ''), storePhoneLine].filter(Boolean).join(' · ');
  return slogan + mainDetails;
}

export function buildTicketFooterBlock(config: WorkshopConfig, paperWidth: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado'): string {
  const is58 = paperWidth === '58mm';
  const isMediaCarta = paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado';
  
  const hasHours = !!config.businessHours;
  const hasSocial = !!(config.socialFacebook || config.socialInstagram || config.socialTiktok);
  const hasMaps = !!(config.googleMapsLink && config.googleMapsLink.trim() !== '' && !config.hideMapsQr);
  
  if (!hasHours && !hasSocial && !hasMaps) return '';
  
  let hoursHtml = '';
  if (hasHours) {
    const isJson = config.businessHours!.trim().startsWith('{');
    if (isJson) {
      try {
        const schedule: WeeklySchedule = JSON.parse(config.businessHours!);
        const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const shortDayLabels: Record<string, string> = {
          lunes: 'LUN',
          martes: 'MAR',
          miercoles: 'MIÉ',
          jueves: 'JUE',
          viernes: 'VIE',
          sabado: 'SÁB',
          domingo: 'DOM'
        };

        const convertTo12Hour = (timeStr: string | undefined): string => {
          if (!timeStr) return '';
          const parts = timeStr.split(':');
          if (parts.length < 2) return timeStr;
          let hour = parseInt(parts[0], 10);
          const minute = parts[1];
          if (isNaN(hour)) return timeStr;
          const ampm = hour >= 12 ? 'pm' : 'am';
          hour = hour % 12;
          if (hour === 0) hour = 12;
          return `${hour}:${minute}${ampm}`;
        };

        const dayRows = dayNames.map(day => {
          const s = schedule[day];
          let timeStr = 'CERRADO';
          if (s && s.isOpen) {
            if (s.type === 'split') {
              const t1Open = s.openTime || '09:00';
              const t1Close = s.closeTime || '14:00';
              const t2Open = s.openTime2 || '16:00';
              const t2Close = s.closeTime2 || '19:00';
              timeStr = `${convertTo12Hour(t1Open)}-${convertTo12Hour(t1Close)} / ${convertTo12Hour(t2Open)}-${convertTo12Hour(t2Close)}`;
            } else {
              const open = s.openTime || '09:00';
              const close = s.closeTime || '19:00';
              timeStr = `${convertTo12Hour(open)}-${convertTo12Hour(close)}`;
            }
          }
          const label = shortDayLabels[day];
          const isClosed = timeStr === 'CERRADO';
          return { label, timeStr, isClosed };
        });

        const fontSize = isMediaCarta ? '7.5px' : (is58 ? '6.5px' : '7.5px');
        let tableHtml = `<table style="margin:2px auto;font-size:${fontSize};line-height:1.3;border-collapse:collapse;color:#000;font-family:system-ui,-apple-system,sans-serif;">`;
        dayRows.forEach(r => {
          const weight = r.isClosed ? '600' : '800';
          const textWeight = r.isClosed ? '500' : '600';
          const textStyle = r.isClosed ? 'font-style: italic;' : '';
          tableHtml += `
            <tr style="${textStyle}">
              <td style="padding: 1px 6px; text-align: right; font-weight: ${weight}; color: #000; border-right: 1px solid #000; width: 38px; vertical-align: top;">${r.label}</td>
              <td style="padding: 1px 0 1px 8px; text-align: left; font-weight: ${textWeight}; color: #000;">${r.timeStr}</td>
            </tr>
          `;
        });
        tableHtml += `</table>`;

        const titleHtml = `<div style="font-size:${isMediaCarta ? '8px' : (is58 ? '7px' : '8px')};color:#000;font-weight:900;text-align:center;letter-spacing:0.5px;text-transform:uppercase;">Horarios de Atención</div>`;
        hoursHtml = titleHtml + tableHtml;
      } catch (e) {
        console.error('Error parsing business hours:', e);
      }
    } else {
      const fontSize = isMediaCarta ? '7.5px' : (is58 ? '6.5px' : '7.5px');
      hoursHtml = `
        <div style="font-size:${isMediaCarta ? '8px' : (is58 ? '7px' : '8px')};color:#000;font-weight:900;text-align:center;letter-spacing:0.5px;text-transform:uppercase;">Horarios de Atención</div>
        <div style="font-size:${fontSize};font-weight:700;color:#000;text-align:center;margin-top:2px;line-height:1.3;font-family:system-ui,-apple-system,sans-serif;white-space:pre-line;text-transform:none;">${config.businessHours}</div>
      `;
    }
  }

  let socialHtml = '';
  if (hasSocial) {
    const iconSize = is58 ? '9px' : '10px';
    const fbSvg = `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="display:inline-block;vertical-align:middle;margin-right:3px;fill:#000;"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>`;
    const igSvg = `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="display:inline-block;vertical-align:middle;margin-right:3px;fill:#000;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
    const ttSvg = `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="display:inline-block;vertical-align:middle;margin-right:3px;fill:#000;"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.21-.42-.45-.61-.7-.01 3.68.01 7.36-.01 11.04-.02 1.63-.52 3.25-1.5 4.54-1.57 2.13-4.22 3.26-6.84 2.87-2.58-.33-4.88-2.07-5.78-4.52-1.07-2.8-.29-6.19 1.93-8.15 1.57-1.42 3.73-2.05 5.82-1.75v4.1c-1.39-.42-2.98-.07-3.98.98-.91.93-1.19 2.37-.73 3.61.43 1.21 1.68 2.05 2.97 2.02 1.68-.02 3.01-1.5 3.01-3.18V.02z"/></svg>`;

    const socialParts: string[] = [];
    if (config.socialFacebook) {
      socialParts.push(`<span style="white-space:nowrap;display:inline-flex;align-items:center;vertical-align:middle;">${fbSvg}${config.socialFacebook}</span>`);
    }
    if (config.socialInstagram) {
      socialParts.push(`<span style="white-space:nowrap;display:inline-flex;align-items:center;vertical-align:middle;">${igSvg}${config.socialInstagram}</span>`);
    }
    if (config.socialTiktok) {
      socialParts.push(`<span style="white-space:nowrap;display:inline-flex;align-items:center;vertical-align:middle;">${ttSvg}${config.socialTiktok}</span>`);
    }
    const socialFontSize = isMediaCarta ? '7.5px' : (is58 ? '6.5px' : '7.5px');
    socialHtml = `<div style="font-size:${socialFontSize};color:#000;font-weight:700;text-align:center;margin-top:4px;margin-bottom:2px;line-height:1.2;font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:2px 8px;">` +
      socialParts.join(' &nbsp;·&nbsp; ') +
      `</div>`;
  }

  let googleMapsHtml = '';
  if (hasMaps) {
    const qrSize = is58 ? 45 : 60;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=0&data=` + encodeURIComponent(config.googleMapsLink!);
    googleMapsHtml = `
      <div style="text-align:center;margin-top:5px;margin-bottom:3px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="font-size:${isMediaCarta ? '8px' : (is58 ? '7px' : '8px')};color:#000;font-weight:900;text-transform:uppercase;margin-bottom:2px;">📍 Ubícanos en Google Maps</div>
        <img src="${qrUrl}" style="width:${qrSize}px;height:${qrSize}px;display:block;margin:0 auto;" />
      </div>
    `;
  }

  const waWarningHtml = `<div style="font-size:${isMediaCarta ? '7.5px' : (is58 ? '7px' : '8px')};font-style:italic;color:#000;font-weight:500;margin-top:3px;text-align:center;line-height:1.2;font-family:system-ui,-apple-system,sans-serif;">(Guárdanos en tus contactos para recibir notificaciones por WhatsApp)</div>`;

  const style = isMediaCarta 
    ? 'margin-top:5px;margin-bottom:3px;flex-shrink:0;border-top:1.5px dashed #000;padding-top:4px;'
    : 'margin-top:3px;margin-bottom:5px;flex-shrink:0;';

  return `<div style="${style}">` +
    hoursHtml +
    socialHtml +
    googleMapsHtml +
    waWarningHtml +
    `</div>`;
}

export function buildTicketHeaderHtml(config: WorkshopConfig, paperWidth: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado'): string {
  const storeName = (config.storeName || 'TALLER').toUpperCase();
  const slogan = config.slogan || '';
  const phone = config.phone || '';
  const phone2 = config.phone2 || '';
  const address = config.address || '';
  const is58 = paperWidth === '58mm';

  const logoSrc = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado')
    ? (config.mediaCartaLogoUrl || '')
    : (config.ticketLogoUrl || '');
  const maxH = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? '25' : (is58 ? '15' : '20');
  const logoHtml = logoSrc
    ? '<img src="' + logoSrc + '" style="max-width:100%;max-height:' + maxH + 'mm;object-fit:contain;display:block;margin:0 auto 3px auto;" />'
    : '';

  let phoneText = '';
  if (phone && phone2) {
    phoneText = 'TEL: ' + phone + ' | WA: ' + phone2;
  } else if (phone) {
    phoneText = 'TEL: ' + phone;
  } else if (phone2) {
    phoneText = 'WA: ' + phone2;
  }

  const sloganText = slogan ? '<span style="font-style:italic;color:#000;">"' + slogan + '"</span>' : '';
  const storeInfoParts = [phoneText, address, sloganText].filter(Boolean);
  const storeInfoFontSize = is58 ? '8.5px' : '9.5px';
  const storeInfoHtml = storeInfoParts.length
    ? '<div style="font-size:' + storeInfoFontSize + ';line-height:1.35;margin-top:2px;font-weight:700;">' + storeInfoParts.join('<br>') + '</div>'
    : '';

  return '<div style="text-align:center;margin-bottom:4px">' +
    logoHtml +
    '<div style="font-size:15px;font-weight:900;letter-spacing:1px;line-height:1.1">' + storeName + '</div>' +
    storeInfoHtml +
    '</div>';
}

export function buildPromoHtml(config: WorkshopConfig, is58: boolean): { top: string; bottom: string } {
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const isPromoActive = 
    config.promoActive && 
    config.promoText && 
    config.promoText.trim() !== '' &&
    (!config.promoStartDate || todayStr >= config.promoStartDate) &&
    (!config.promoEndDate || todayStr <= config.promoEndDate);
  
  if (!isPromoActive) {
    return { top: '', bottom: '' };
  }
  
  const promoHtml = '<div style="border:1.5px dashed #000;padding:5px;text-align:center;font-size:' + (is58 ? '9.5' : '10.5') + 'px;margin:5px 0;font-weight:900;line-height:1.35;word-break:break-word;white-space:pre-wrap;">📢 ' + config.promoText + '</div>';
  
  const top = config.promoPosition === 'top' ? promoHtml : '';
  const bottom = config.promoPosition !== 'top' ? promoHtml : '';
  return { top, bottom };
}

export function buildTicketHtml(order: RepairOrder, config: WorkshopConfig, page?: 'front' | 'back' | 'whatsapp'): string {
  if (config.ticketPaperWidth === 'media-carta') {
    if (page === 'whatsapp') {
      return buildSingleDuplexMediaCartaTicketHtml(order, config, 'whatsapp');
    }
    if (config.printDuplexContract && !config.mediaCartaFrontTerms && page !== undefined) {
      return buildSingleDuplexMediaCartaTicketHtml(order, config, page);
    }
    return buildMediaCartaTicketHtml(order, config);
  } else if (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta-duplicado') {
    if (page === 'whatsapp') {
      return buildDuplexMediaCartaTicketHtml(order, config, 'whatsapp');
    }
    if (config.printDuplexContract && !config.mediaCartaFrontTerms && page !== undefined) {
      return buildDuplexMediaCartaTicketHtml(order, config, page);
    }
    return buildMediaCartaDuplicadoTicketHtml(order, config);
  }
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
  const { top: promoTop, bottom: promoBottom } = buildPromoHtml(config, paperWidth === '58mm');

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = order.estimatedDeliveryDate ? formatPromiseDate(order.estimatedDeliveryDate) : 'POR CONFIRMAR';
  const isPaidOrder = order.status === 'Entregado y Pagado' || (order as any).isPaid === true;
  const balance = isPaidOrder ? 0 : Math.max(0, order.cost - order.advancePayment);
  const patternNodes = parsePatternNodes(order.devicePin || '');

  const technicianRow = order.assignedTechnician
    ? '<div class="row"><span class="lbl">Técnico:</span><span class="val">' + order.assignedTechnician + '</span></div>'
    : '';

  const modelNumberRow = order.deviceModelNumber
    ? '<div class="row"><span class="lbl">No. Modelo:</span><span class="val">' + order.deviceModelNumber + '</span></div>'
    : '';

  let accessHtml = '';
  if (patternNodes) {
    accessHtml = '<div class="field-label">Acceso al dispositivo:</div><div style="margin:3px 0 4px 0">' + buildPatternSvgHtml(patternNodes) + '</div>';
  } else if (order.devicePin && order.devicePin !== 'SIN CLAVE') {
    accessHtml = '<div class="row"><span class="lbl">Acceso:</span><span class="val bold">' + order.devicePin + '</span></div>';
  }

  const rawNotes = order.ticketNote !== undefined ? order.ticketNote : (order.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  let formattedNote = rawNotes.trim();
  if (formattedNote) {
    if (/^soluci[oó]n propuesta:?\s*/i.test(formattedNote)) {
      formattedNote = formattedNote.replace(/^soluci[oó]n propuesta:?\s*/i, '');
    }
  }
  const formattedNoteHtml = formattedNote.replace(/\n/g, '<br/>');

  const diagnosticsRow = order.showNotesOnLabel && !isDefaultNote
    ? '<div style="border:1.5px dashed #000;padding:6px;margin:6px 0;font-size:9.5px;line-height:1.35;word-break:break-word;white-space:pre-wrap;text-align:left;color:#000;">' +
      '<div style="font-weight:900;margin-bottom:3px;font-size:10px;">📋 NOTAS DEL TALLER:</div>' +
      '<div>' + formattedNoteHtml + '</div>' +
      '</div>'
    : '';

  const policiesHtml = policies
    ? '<hr class="sep"><div class="section-title">TÉRMINOS Y CONDICIONES</div><div class="policies-text">' + policies + '</div>'
    : '<hr class="sep">';

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();

  const code128Script = getBarcodeScript(order.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const signatureHtml = config.hideTicketSignature
    ? ''
    : '<div style="text-align:center;margin-top:18px;margin-bottom:6px">' +
      '<div style="height:38px"></div>' +
      '<div style="border-top:1px solid #000;width:65%;margin:0 auto 4px auto"></div>' +
      '<div style="font-size:8.5px;font-weight:700;letter-spacing:0.5px">FIRMA DE ACEPTACIÓN</div>' +
      '</div>';

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const isWhatsappPage = page === 'whatsapp';
  const offset = isWhatsappPage ? 0 : (config.ticketMarginOffset || 0);
  const rightPad = isWhatsappPage ? '4mm' : (isStarTsp100 ? '1mm' : (paperWidth === '58mm' ? '4mm' : '6mm'));
  const leftPad = isWhatsappPage ? '4mm' : (isStarTsp100 ? '1mm' : (paperWidth === '58mm' ? '4mm' : '5mm'));
  const bottomPad = paperWidth === '58mm' ? '2mm' : '4mm';

  return '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    '@page { size: ' + effectivePaperSize + ' auto; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ' + (paperWidth === '58mm' ? '11' : '13') + 'px; font-weight: 700; width: 100%; padding: 0 calc(' + rightPad + ' - ' + offset + 'px) ' + bottomPad + ' calc(' + leftPad + ' + ' + offset + 'px); color: #000; background: #fff; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word; }' +
    '.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }' +
    '.section-badge { display: block; font-weight: 900; text-align: center; font-size: ' + (paperWidth === '58mm' ? '10' : '11') + 'px; background: #000; color: #fff; padding: 2px 0; margin: 3px 0; letter-spacing: 1px; }' +
    '.section-title { font-weight: 900; text-align: center; font-size: ' + (paperWidth === '58mm' ? '10' : '10') + 'px; margin: 3px 0 2px 0; text-decoration: underline; }' +
    '.row { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: ' + (paperWidth === '58mm' ? '11' : '12') + 'px; margin: 2px 0; line-height: 1.3; }' +
    '.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }' +
    '.val { text-align: right; flex: 1; min-width: 0; word-break: break-word; }' +
    '.bold { font-weight: 900; }' +
    '.field-label { font-weight: 700; font-size: ' + (paperWidth === '58mm' ? '9' : '10') + 'px; margin-top: 2px; }' +
    '.total-line { display: flex; justify-content: space-between; font-size: ' + (paperWidth === '58mm' ? '13' : '15') + 'px; font-weight: 900; margin-top: 6px; padding: 5px 4px; background: #000; color: #fff; letter-spacing: 0.5px; }' +
    '.policies-text { font-size: ' + (paperWidth === '58mm' ? '8' : '9') + 'px; color: #000; line-height: 1.35; margin: 2px 0; }' +
    '.footer-text { font-size: ' + (paperWidth === '58mm' ? '8.5' : '9.5') + 'px; text-align: center; font-weight: 700; margin: 2px 0; }' +
    '</style>' +
    '</head><body>' +
    buildTicketHeaderHtml(config, paperWidth as any) +
    '<hr class="sep">' +
    (promoTop ? promoTop + '<hr class="sep">' : '') +
    '<div class="section-badge">ORDEN DE TRABAJO</div>' +
    '<div class="row"><span class="lbl">No:</span><span class="val bold">' + order.id + '</span></div>' +
    '<div class="row"><span class="lbl">Fecha de Ingreso:</span><span class="val">' + dateStr + '</span></div>' +
    '<div class="row"><span class="lbl">Promesa de Entrega:</span><span class="val">' + deliveryStr + '</span></div>' +
    technicianRow +
    (order.createdBy ? '<div class="row"><span class="lbl">Atendió:</span><span class="val">' + order.createdBy.toUpperCase() + '</span></div>' : '') +
    '<hr class="sep">' +
    '<div class="section-title">CLIENTE</div>' +
    '<div class="row"><span class="lbl">Nom:</span><span class="val bold">' + order.customerName.toUpperCase() + '</span></div>' +
    '<div class="row"><span class="lbl">Tel:</span><span class="val">' + customerPhone + '</span></div>' +
    '<hr class="sep">' +
    '<div class="section-title">EQUIPO</div>' +
    '<div class="row"><span class="lbl">Marca:</span><span class="val">' + order.deviceBrand + '</span></div>' +
    '<div class="row"><span class="lbl">Modelo:</span><span class="val">' + order.deviceModel + '</span></div>' +
    modelNumberRow +
    '<div class="row"><span class="lbl">Tipo:</span><span class="val">' + deviceType + '</span></div>' +
    accessHtml +
    (order.receivedAccessories && order.receivedAccessories.length > 0
      ? '<div class="row"><span class="lbl">Accesorios:</span><span class="val bold">' + order.receivedAccessories.join(', ') + '</span></div>'
      : '') +
    '<hr class="sep">' +
    '<div class="section-title" style="margin-top:5px;margin-bottom:7px;font-size:11.5px;font-weight:900">SERVICIO A REALIZAR</div>' +
    '<div style="border:1px solid #000;border-radius:3px;padding:5px 6px;margin:0 0 4px 0">' +
      (() => {
        // Migración retroactiva: convierte formato antiguo "SVC A Y SVC B" en multilínea
        const effectiveSvcType = (order.serviceType && !order.serviceType.includes('\n') && order.serviceType.includes(' Y '))
          ? order.serviceType.split(' Y ').join('\n')
          : order.serviceType;
        if (effectiveSvcType.includes('\n') || effectiveSvcType.includes(' - ')) {
          const lines = effectiveSvcType.split('\n');
          let html = '<div style="width:100%;font-size:12px;line-height:1.4">';
          lines.forEach((line, index) => {
            const sepIdx = line.lastIndexOf(' - ');
            const borderStyle = index < lines.length - 1 ? 'border-bottom:1px dashed #bbb;padding-bottom:3px;margin-bottom:3px;' : '';
            if (sepIdx !== -1) {
              const name = line.substring(0, sepIdx);
              const price = line.substring(sepIdx + 3);
              html += '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px;' + borderStyle + '"><span style="flex:1;font-weight:700;overflow-wrap:break-word;word-break:break-word">' + name + '</span><span style="white-space:nowrap;font-weight:900;flex-shrink:0">' + price + '</span></div>';
            } else {
              html += '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px;' + borderStyle + '"><span style="flex:1;font-weight:700">' + line + '</span></div>';
            }
          });
          html += '</div>';
          return html;
        }
        return '<div class="row bold" style="font-size:13px"><span>' + order.serviceType + '</span><span style="white-space:nowrap">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>';
      })() +
    '</div>' +
    diagnosticsRow +
    '<hr class="sep" style="margin-top:14px">' +
    '<div class="row"><span class="lbl">Subtotal:</span><span class="val">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '<div class="row"><span class="lbl">Anticipo:</span><span class="val">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length === 1 ? ' (' + order.advancePaymentBreakdown[0].method + ')' : '') +
    '</span></div>' +
    (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 1
      ? order.advancePaymentBreakdown.map(b =>
          '<div class="row" style="font-size:10px;color:#000;padding-left:10px"><span class="lbl">↳ ' + b.method + ':</span><span class="val">' + currSym + b.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
        ).join('')
      : '') +
    '<div class="total-line"><span>SALDO:</span><span>' + (balance <= 0 ? currSym + '0.00 (PAGADO ✓)' : currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + '</span></div>' +
    policiesHtml +
    signatureHtml +
    '<hr class="sep">' +
    '<div class="bc-target" id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>' +
    '<hr class="sep">' +
    buildTicketFooterBlock(config, paperWidth as any) +
    (promoBottom ? promoBottom + '<hr class="sep">' : '') +
    '<div class="footer-text">' + footer + '</div>' +
    '<script>' + code128Script + '<\/script>' +
    '</body></html>';
}

export function buildPosTicketHtml(
  sale: {
    id: string;
    items: { description: string; quantity: number; price: number; fromWarehouseId?: string }[];
    total: number;
    createdAt: string;
    paymentMethod?: string;
    confirmationCode?: string;
    cashReceived?: number;
    cardReceived?: number;
    change?: number;
    notes?: string;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    createdBy?: string;
  },
  config: WorkshopConfig,
  warehouses?: { id: string; name: string }[],
  isQuote?: boolean
): string {
  let effectivePosWidth = config.posPaperWidth || config.ticketPaperWidth || '80mm';
  if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
    effectivePosWidth = '80mm';
  }
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsPOS || config.termsAndConditions || '';
  const paperWidth = effectivePosWidth === '58mm' ? '58mm' : '80mm';

  const _d = new Date(sale.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;

  const is58 = paperWidth === '58mm';

  // Timed promotion check
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const isPromoActive = 
    config.promoActive && 
    config.promoText && 
    config.promoText.trim() !== '' &&
    (!config.promoStartDate || todayStr >= config.promoStartDate) &&
    (!config.promoEndDate || todayStr <= config.promoEndDate);

  const promoHtml = isPromoActive
    ? '<div style="border:1.5px dashed #000;padding:5px;text-align:center;font-size:' + (is58 ? '9.5' : '10.5') + 'px;margin:5px 0;font-weight:900;line-height:1.35;word-break:break-word;white-space:pre-wrap;">📢 ' + config.promoText + '</div>'
    : '';

  const promoTop = isPromoActive && config.promoPosition === 'top' ? promoHtml : '';
  const promoBottom = isPromoActive && config.promoPosition !== 'top' ? promoHtml : '';

  const fs = is58 ? '10' : '12';
  const priceColW = is58 ? '44px' : '54px';
  const hasMultiQty = (sale.items || []).some(item => item.quantity > 1);
  const unitColHtml = hasMultiQty ? '<col style="width:' + priceColW + '">' : '';
  const unitThHtml = hasMultiQty ? '<th style="text-align:right;padding:2px 4px;font-weight:900;border-top:1px solid #000 !important;border-bottom:2px solid #000 !important;border-left:none !important;border-right:none !important;">P.Unit.</th>' : '';
  let itemsHtml =
    '<table style="width:100%;border-collapse:collapse;font-size:' + fs + 'px;border:none !important;">' +
    '<colgroup><col style="width:auto">' + unitColHtml + '<col style="width:' + priceColW + '"></colgroup>' +
    '<thead><tr style="font-size:' + fs + 'px;font-weight:900;text-transform:uppercase;border-bottom:2px solid #000 !important;border-top:1px solid #000 !important;">' +
    '<th style="text-align:left;padding:2px 4px 2px 0;font-weight:900;border-top:1px solid #000 !important;border-bottom:2px solid #000 !important;border-left:none !important;border-right:none !important;">Artículo</th>' +
    unitThHtml +
    '<th style="text-align:right;padding:2px 0;font-weight:900;border-top:1px solid #000 !important;border-bottom:2px solid #000 !important;border-left:none !important;border-right:none !important;">Total</th>' +
    '</tr></thead><tbody>';
  (sale.items || []).forEach(item => {
    const lineTotal = item.quantity * item.price;
    const unitCell = hasMultiQty
      ? (item.quantity > 1
          ? '<td style="text-align:right;white-space:nowrap;color:#000;padding:3px 4px;border:none !important;">' + currSym + item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>'
          : '<td style="border:none !important;"></td>')
      : '';
    const whName = warehouses && item.fromWarehouseId ? (warehouses.find(w => w.id === item.fromWarehouseId)?.name || 'Bodega') : (item.fromWarehouseId ? 'Bodega' : '');
    const descSuffix = whName ? ` (${whName})` : '';
    itemsHtml +=
      '<tr>' +
      '<td style="font-weight:700;padding:3px 4px 3px 0;word-break:break-word;border:none !important;">' + item.quantity + 'x ' + item.description + descSuffix + '</td>' +
      unitCell +
      '<td style="text-align:right;white-space:nowrap;font-weight:900;padding:3px 0;border:none !important;">' + currSym + lineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';

    const discountValue = (item as any).discountValue !== undefined ? (item as any).discountValue : (item as any).lineDiscountValue;
    const discountType = (item as any).discountType || (item as any).lineDiscountType || 'percentage';
    const hasLineDiscount = discountValue !== undefined && Number(discountValue) > 0;

    if (hasLineDiscount) {
      let origPrice = (item as any).originalPrice !== undefined && Number((item as any).originalPrice) > item.price
        ? Number((item as any).originalPrice)
        : 0;
      
      let unitDiscountAmt = 0;
      if (origPrice > 0) {
        unitDiscountAmt = origPrice - item.price;
      } else {
        if (discountType === 'percentage') {
          const factor = 1 - Number(discountValue) / 100;
          if (factor > 0 && factor < 1) {
            origPrice = Number((item.price / factor).toFixed(2));
            unitDiscountAmt = origPrice - item.price;
          } else {
            origPrice = item.price;
            unitDiscountAmt = 0;
          }
        } else {
          unitDiscountAmt = Number(discountValue);
          origPrice = item.price + unitDiscountAmt;
        }
      }
      const totalDiscountAmt = unitDiscountAmt * item.quantity;
      
      const origStr = origPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unitDescStr = unitDiscountAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const finalStr = item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalDescStr = totalDiscountAmt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      let descDetail = '';
      if (discountType === 'percentage') {
        descDetail = `${currSym}${origStr} - ${discountValue}% = ${currSym}${finalStr}`;
      } else {
        descDetail = `${currSym}${origStr} - ${currSym}${unitDescStr} = ${currSym}${finalStr}`;
      }
      
      if (item.quantity > 1) {
        descDetail += ` (Ahorro total: -${currSym}${totalDescStr})`;
      }

      itemsHtml +=
        '<tr>' +
        '<td colspan="' + (hasMultiQty ? 3 : 2) + '" style="font-size:' + (is58 ? '8.5' : '9.5') + 'px;color:#000;font-style:italic;padding:0 0 4px 12px;border:none !important;">' +
        '└─ Descuento: ' + descDetail + '</td>' +
        '</tr>';
    }
  });
  itemsHtml += '</tbody></table>';

  const itemsSubtotal = (sale.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discountRow = sale.discount && sale.discount > 0
    ? '<div class="row"><span class="lbl">Subtotal Venta:</span><span class="val">' + currSym + itemsSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
      '<div class="row" style="font-weight:900;"><span class="lbl">Descuento ' + (sale.discountType === 'percentage' ? '(' + sale.discountValue + '%)' : '') + ':</span><span class="val">-' + currSym + sale.discount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
    : '';

  const taxRate = config.taxRate || 0;
  const showTax = config.showTaxRate !== false && taxRate > 0;
  const subtotalBeforeTax = showTax ? (sale.total / (1 + taxRate)) : sale.total;
  const taxAmount = showTax ? (sale.total - subtotalBeforeTax) : 0;

  const taxRows = showTax
    ? '<div class="row"><span class="lbl">Subtotal Neto:</span><span class="val">' + currSym + subtotalBeforeTax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
      '<div class="row"><span class="lbl">IVA (' + (taxRate * 100).toFixed(0) + '%):</span><span class="val">' + currSym + taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
    : '';

  const paymentRow = sale.paymentMethod
    ? '<div class="row"><span class="lbl">Forma de pago:</span><span class="val">' + sale.paymentMethod + '</span></div>'
    : '';

  const showConfirmation = sale.confirmationCode && 
    !sale.confirmationCode.includes('Ref: S/Ref') &&
    !(sale.confirmationCode.startsWith('Efe:') && !sale.confirmationCode.includes('T/T:'));

  const confirmationRow = showConfirmation
    ? '<div class="row" style="font-size: ' + (is58 ? '9' : '10') + 'px;"><span class="lbl">Ref/Aut:</span><span class="val bold">' + sale.confirmationCode + '</span></div>'
    : '';

  let paymentDetailsHtml = '';
  if (sale.cashReceived !== undefined || sale.cardReceived !== undefined || sale.change !== undefined) {
    const cash = sale.cashReceived || 0;
    const card = sale.cardReceived || 0;
    const change = sale.change || 0;
    if (cash > 0) {
      paymentDetailsHtml += '<div class="row"><span class="lbl">Pago en Efectivo:</span><span class="val">' + currSym + cash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>';
    }
    if (card > 0) {
      paymentDetailsHtml += '<div class="row"><span class="lbl">Pago con Tarjeta/T:</span><span class="val">' + currSym + card.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>';
    }
    if (change > 0) {
      paymentDetailsHtml += '<div class="row bold" style="font-size: ' + (is58 ? '11' : '13') + 'px;"><span class="lbl">CAMBIO:</span><span class="val">' + currSym + change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>';
    }
  }

  const policiesHtml = policies
    ? '<hr class="sep"><div class="section-title">GARANTÍAS Y POLÍTICAS</div><div class="policies-text">' + policies + '</div>'
    : '';

  const code128Script = getBarcodeScript(sale.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset = config.ticketMarginOffset || 0;
  const rightPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '6mm');
  const leftPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '5mm');
  const bottomPad = is58 ? '2mm' : '4mm';

  const CSS =
    '@page { size: ' + effectivePaperSize + ' auto; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ' + (is58 ? '11' : '13') + 'px; font-weight: 700; width: 100%; padding: 0 calc(' + rightPad + ' - ' + offset + 'px) ' + bottomPad + ' calc(' + leftPad + ' + ' + offset + 'px); color: #000; background: #fff; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word; }' +
    '.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }' +
    '.section-badge { display: block; font-weight: 900; text-align: center; font-size: ' + (is58 ? '10' : '11') + 'px; background: #000 !important; color: #fff !important; padding: 6px 0 !important; margin: 3px 0; letter-spacing: 1px; line-height: 1.2 !important; height: auto !important; }' +
    '.section-title { font-weight: 900; text-align: center; font-size: ' + (is58 ? '10' : '10') + 'px; margin: 3px 0 2px 0; text-decoration: underline; }' +
    '.row { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: ' + (is58 ? '11' : '12') + 'px; margin: 2px 0; line-height: 1.3; }' +
    '.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }' +
    '.val { text-align: right; flex: 1; min-width: 0; word-break: break-word; }' +
    '.bold { font-weight: 900; }' +
    '.total-line { display: flex; justify-content: space-between; align-items: center !important; font-size: ' + (is58 ? '13' : '15') + 'px; font-weight: 900; margin-top: 6px; padding: 8px 6px !important; background: #000 !important; color: #fff !important; letter-spacing: 0.5px; line-height: 1.2 !important; height: auto !important; }' +
    '.policies-text { font-size: ' + (is58 ? '8' : '9') + 'px; color: #000; line-height: 1.35; margin: 2px 0; }' +
    '.footer-text { font-size: ' + (is58 ? '8.5' : '9.5') + 'px; text-align: center; font-weight: 700; margin: 3px 0; }';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' +
    buildTicketHeaderHtml(config, paperWidth as any) +
    '<hr class="sep">' +
    promoTop +
    (promoTop ? '<hr class="sep">' : '') +
    '<div class="section-badge">' + (isQuote ? 'COTIZACIÓN' : 'TICKET DE VENTA') + '</div>' +
    '<div class="row"><span class="lbl">' + (isQuote ? 'Cotización No:' : 'No:') + '</span><span class="val bold">' + sale.id + '</span></div>' +
    '<div class="row"><span class="lbl">Fecha:</span><span class="val">' + dateStr + '</span></div>' +
    (sale.createdBy ? '<div class="row"><span class="lbl">Atendió:</span><span class="val">' + sale.createdBy.toUpperCase() + '</span></div>' : '') +
    paymentRow +
    confirmationRow +
    '<hr class="sep">' +
    itemsHtml +
    '<hr class="sep">' +
    discountRow +
    taxRows +
    (discountRow || taxRows ? '<hr class="sep">' : '') +
    '<div class="total-line"><span>TOTAL:</span><span>' + currSym + sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    paymentDetailsHtml +
    (sale.notes
      ? '<hr class="sep"><div style="text-align:left;font-size:' + (is58 ? '10' : '11') + 'px;margin-top:4px;"><span class="lbl" style="display:block;margin-bottom:2px;">NOTAS DE VENTA:</span><span style="font-weight:700;white-space:pre-wrap;display:block;">' + sale.notes + '</span></div>'
      : '') +
    policiesHtml +
    '<hr class="sep">' +
    '<div class="bc-target" id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>' +
    '<hr class="sep">' +
    buildTicketFooterBlock(config, paperWidth as any) +
    promoBottom +
    (promoBottom ? '<hr class="sep">' : '') +
    '<div class="footer-text">' + footer + '</div>' +
    '<script>' + code128Script + '<\/script>' +
    '</body></html>';
}

export function buildRechargeTicketHtml(
  sale: {
    id: string;
    items: { itemId: string; name: string; price: number; quantity: number; description?: string }[];
    total: number;
    createdAt: string;
    paymentMethod?: string;
    confirmationCode?: string;
    createdBy?: string;
    cashReceived?: number;
    change?: number;
  },
  config: WorkshopConfig
): string {
  const rechargeItem = (sale.items || []).find(item => {
    const id = (item.itemId || (item as any).id || '') as string;
    const name = (item.name || item.description || '') as string;
    if (id === 'recharge-commission' || name.toLowerCase().includes('comisión de recarga') || name.toLowerCase().includes('comision de recarga') || name.toLowerCase().includes('comisión de servicio')) {
      return false;
    }
    if (id.startsWith('recharge-') || id.startsWith('recarga-')) {
      return true;
    }
    return (
      name.toLowerCase().includes('tiempo aire') ||
      name.toLowerCase().includes('paquete') ||
      name.toLowerCase().includes('telcel') ||
      name.toLowerCase().includes('movistar') ||
      name.toLowerCase().includes('att') ||
      name.toLowerCase().includes('at&t') ||
      name.toLowerCase().includes('unefon') ||
      name.toLowerCase().includes('bait') ||
      name.toLowerCase().includes('virgin') ||
      name.toLowerCase().includes('cfe') ||
      name.toLowerCase().includes('telmex') ||
      name.toLowerCase().includes('izzi') ||
      name.toLowerCase().includes('recarga') ||
      name.toLowerCase().includes('servicio')
    );
  }) || (sale.items || [])[0];

  const commissionItem = (sale.items || []).find(item => {
    const id = (item.itemId || (item as any).id || '') as string;
    const name = (item.name || item.description || '') as string;
    return (
      id === 'recharge-commission' ||
      name.toLowerCase().includes('comisión') ||
      name.toLowerCase().includes('comision')
    );
  });

  const rawItemName = rechargeItem ? (rechargeItem.name || rechargeItem.description || '') : '';
  let cleanItemName = rawItemName;
  if (cleanItemName.toUpperCase().startsWith('1X ') || cleanItemName.toUpperCase().startsWith('1 X ')) {
    cleanItemName = cleanItemName.slice(3).trim();
  }

  let carrierName = cleanItemName ? cleanItemName.split(' $')[0] : 'RECARGA';
  if (carrierName.toUpperCase().startsWith('RECARGA ')) {
    carrierName = carrierName.slice(8);
  }
  
  // Extract phone/reference from description, item name, or confirmationCode
  let phoneOrReference = '';
  if (cleanItemName) {
    const firstOpenIdx = cleanItemName.indexOf('(');
    const lastCloseIdx = cleanItemName.lastIndexOf(')');
    if (firstOpenIdx !== -1 && lastCloseIdx !== -1 && lastCloseIdx > firstOpenIdx) {
      let rawInner = cleanItemName.slice(firstOpenIdx + 1, lastCloseIdx).trim();
      while (rawInner.startsWith('(') && rawInner.endsWith(')')) {
        rawInner = rawInner.slice(1, -1).trim();
      }
      phoneOrReference = rawInner;
    } else {
      const phoneMatch = cleanItemName.match(/\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/) || cleanItemName.match(/\b\d{10}\b/);
      if (phoneMatch) {
        phoneOrReference = phoneMatch[0];
      } else {
        const parts = cleanItemName.split(' ');
        phoneOrReference = parts[parts.length - 1] || '';
      }
    }
  }

  // Parse folio and reference from confirmationCode (e.g. "Folio Aut: 123456 | Ref: TX-789012")
  let folio = '';
  let ref = sale.id; // Fallback to sale ID
  if (sale.confirmationCode) {
    const folioMatch = sale.confirmationCode.match(/Folio Aut:\s*([^|]+)/i);
    const refMatch = sale.confirmationCode.match(/Ref:\s*([^|]+)/i);
    if (folioMatch) folio = folioMatch[1].trim();
    if (refMatch) ref = refMatch[1].trim();
  }

  const commission = commissionItem ? commissionItem.price : 0;
  let amount = rechargeItem ? rechargeItem.price : (sale.total - commission);
  if (amount <= 0 || (commission > 0 && amount === sale.total)) {
    amount = sale.total - commission;
  }
  const total = sale.total;

  const itemCheckStr = ((rechargeItem?.itemId || '') + ' ' + (rechargeItem?.name || '') + ' ' + (rechargeItem?.description || '')).toUpperCase();
  const isPagoServicio = (
    itemCheckStr.includes('CFE') ||
    itemCheckStr.includes('TELMEX') ||
    itemCheckStr.includes('IZZI') ||
    itemCheckStr.includes('SERVICIO') ||
    itemCheckStr.includes('PAGO DE SERVICIO')
  );

  const badgeText = isPagoServicio ? 'PAGO DE SERVICIOS' : 'COMPROBANTE DE RECARGA';

  let effectivePosWidth = config.posPaperWidth || config.ticketPaperWidth || '80mm';
  if (effectivePosWidth === 'media-carta' || effectivePosWidth === 'media-carta-duplicado') {
    effectivePosWidth = '80mm';
  }
  const currSym = config.currencySymbol || '$';
  const paperWidth = effectivePosWidth === '58mm' ? '58mm' : '80mm';
  const is58 = paperWidth === '58mm';

  const _d = new Date(sale.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = isNaN(_d.getTime()) ? sale.createdAt : `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset = config.ticketMarginOffset || 0;
  const rightPad = isStarTsp100 ? '1mm' : (paperWidth === '58mm' ? '4mm' : '6mm');
  const leftPad = isStarTsp100 ? '1mm' : (paperWidth === '58mm' ? '4mm' : '5mm');
  const bottomPad = paperWidth === '58mm' ? '2mm' : '4mm';

  let detailText = '';
  const rawDesc = (rechargeItem?.description || rechargeItem?.name || '').trim();
  if (rawDesc) {
    let cleanDesc = rawDesc;
    // 1. Remove 1x or 1 X prefix if present
    if (cleanDesc.toUpperCase().startsWith('1X ') || cleanDesc.toUpperCase().startsWith('1 X ')) {
      cleanDesc = cleanDesc.slice(3).trim();
    }
    // 2. Remove phone / reference in parentheses from description so it's not repeated
    if (phoneOrReference && cleanDesc.includes(phoneOrReference)) {
      cleanDesc = cleanDesc.replace(new RegExp('\\(?\\(?\\s*' + phoneOrReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\)?\\)?', 'gi'), '').trim();
    }
    // 3. Clean any trailing empty parentheses
    cleanDesc = cleanDesc.replace(/\s*\(\s*\)\s*$/g, '').trim();

    detailText = cleanDesc || rawDesc;
  }

  return '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    '@page { size: ' + effectivePaperSize + ' auto; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ' + (paperWidth === '58mm' ? '11' : '13') + 'px; font-weight: 700; width: 100%; padding: 0 calc(' + rightPad + ' - ' + offset + 'px) ' + bottomPad + ' calc(' + leftPad + ' + ' + offset + 'px); color: #000; background: #fff; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word; }' +
    '.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }' +
    '.section-badge { display: block; font-weight: 900; text-align: center; font-size: ' + (paperWidth === '58mm' ? '10' : '11') + 'px; background: #000; color: #fff; padding: 2px 0; margin: 3px 0; letter-spacing: 1px; }' +
    '.row { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: ' + (paperWidth === '58mm' ? '11' : '12') + 'px; margin: 2px 0; line-height: 1.3; }' +
    '.lbl { font-weight: 700; white-space: nowrap; margin-right: 4px; }' +
    '.val { text-align: right; flex: 1; min-width: 0; word-break: break-word; }' +
    '.bold { font-weight: 900; }' +
    '.total-line { display: flex; justify-content: space-between; font-size: ' + (paperWidth === '58mm' ? '12' : '14') + 'px; font-weight: 900; margin-top: 4px; padding: 4px; border: 1.5px solid #000; }' +
    '.footer-text { font-size: ' + (paperWidth === '58mm' ? '8.5' : '9.5') + 'px; text-align: center; font-weight: 700; margin: 4px 0 2px 0; }' +
    '</style>' +
    '</head><body>' +
    buildTicketHeaderHtml(config, paperWidth as any) +
    '<hr class="sep">' +
    '<div class="section-badge">' + badgeText + '</div>' +
    '<div class="row"><span class="lbl">Operador:</span><span class="val bold">' + carrierName.toUpperCase() + '</span></div>' +
    (detailText ? '<div class="row"><span class="lbl">Detalle:</span><span class="val bold">' + detailText.toUpperCase() + '</span></div>' : '') +
    '<div class="row"><span class="lbl">' + (isPagoServicio ? 'Referencia:' : 'Celular:') + '</span><span class="val bold">' + phoneOrReference + '</span></div>' +
    (folio ? '<div class="row"><span class="lbl">Folio Aut:</span><span class="val bold">' + folio + '</span></div>' : '') +
    '<div class="row"><span class="lbl">ID Transacción:</span><span class="val">' + ref + '</span></div>' +
    '<div class="row"><span class="lbl">Fecha:</span><span class="val">' + dateStr + '</span></div>' +
    (sale.createdBy ? '<div class="row"><span class="lbl">Atendió:</span><span class="val">' + sale.createdBy.toUpperCase() + '</span></div>' : '') +
    '<hr class="sep">' +
    '<div class="row"><span class="lbl">Monto:</span><span class="val">' + currSym + amount.toFixed(2) + '</span></div>' +
    (commission > 0 ? '<div class="row"><span class="lbl">Comisión:</span><span class="val">' + currSym + commission.toFixed(2) + '</span></div>' : '') +
    '<div class="total-line"><span class="lbl">TOTAL PAGADO:</span><span class="val bold">' + currSym + total.toFixed(2) + '</span></div>' +
    '<hr class="sep">' +
    '<div class="footer-text">' + (config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su preferencia!') + '</div>' +
    '</body></html>';
}


// ─── ETIQUETA DE SERVICIO ────────────────────────────────────────────────────

const SERVICE_LABEL_SIZES: Record<string, { scale: number }> = {
  '51x25mm':  { scale: 1.00 },
  '50x30mm':  { scale: 1.10 },
  '40x20mm':  { scale: 0.80 },
  '40x30mm':  { scale: 0.88 },
  '60x30mm':  { scale: 1.15 },
  '30x15mm':  { scale: 0.58 },
  '38x25mm':  { scale: 0.85 },
  '57x32mm':  { scale: 1.20 },
  '100x50mm': { scale: 1.80 },
  '58x40mm':  { scale: 1.22 },
  '80x50mm':  { scale: 1.55 },
};

export function buildServiceLabelHtml(order: RepairOrder, config: WorkshopConfig, batchPosition?: number, batchTotal?: number, overrideStyle?: 'standard' | 'vitrina' | 'qr' | 'technical'): string {
  const templateStyle = overrideStyle || config.serviceLabelTemplateStyle || 'standard';
  const sym = config.currencySymbol || '$';
  const phone = config.phone || '';
  const store = (config.storeName || 'TALLER').toUpperCase();
  const sizeKey = config.labelPaperSize || '51x25mm';
  const isVertical = config.labelOrientation === 'vertical';
  const [labelWmm, labelHmm] = sizeKey.replace('mm','').split('x').map(Number);
  const labelW = `${labelWmm}mm`;
  
  // Calculate a slightly smaller height for the CSS to avoid subpixel rounding overflow/blank page issues
  const cssLabelH = `${labelHmm - 0.8}mm`;

  const { scale } = SERVICE_LABEL_SIZES[sizeKey] || { scale: 1.00 };
  const s = (base: number) => (base * scale).toFixed(1);
  const sm = (base: number) => (base * scale).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const logoSrc = config.labelLogoUrl || '';
  const logoHtml = logoSrc
    ? `<div style="width:${s(16)}px;height:${s(16)}px;background:#ffffff;border-radius:${s(2)}px;display:flex;align-items:center;justify-content:center;margin-bottom:${s(3)}px;padding:1.5px;box-sizing:border-box;"><img src="${logoSrc}" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`
    : '';

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = labelWmm <= 40
    ? `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)} ${_pad(_h12)}:${_pad(_d.getMinutes())}${_ampm.slice(0,1)}`
    : `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${String(_d.getFullYear()).slice(-2)} ${_pad(_h12)}:${_pad(_d.getMinutes())}${_ampm}`;

  const shouldHidePrice = order.hidePriceOnLabel ?? config.hidePriceOnLabel ?? false;

  const customerPhone = shouldHidePrice
    ? ''
    : (order.customerPhone
        ? formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode)
        : phone);
  const isTicketLabelFormat = sizeKey === '58x40mm' || sizeKey === '80x50mm';
  const labelOffset = isTicketLabelFormat ? (config.labelMarginOffset || 0) : 0;

  // Format price with comma thousands separator
  const priceDisplay = shouldHidePrice
    ? ''
    : `${sym}${Number(order.cost).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const limitStr = (str: string, max: number) => {
    if (!str) return '';
    const clean = str.trim().toUpperCase();
    return clean.length > max ? clean.slice(0, max - 1) + '.' : clean;
  };

  const deviceLine = [order.deviceBrand, order.deviceModel, order.deviceModelNumber ? `(${order.deviceModelNumber})` : ''].filter(Boolean).join(' ');

  const deviceLength = deviceLine.length;
  let deviceFontSizeNum = labelWmm <= 50 ? 7.5 : 9.0;
  if (deviceLength > 36) {
    deviceFontSizeNum = labelWmm <= 50 ? 5.0 : 5.5;
  } else if (deviceLength > 28) {
    deviceFontSizeNum = labelWmm <= 50 ? 5.8 : 6.5;
  } else if (deviceLength > 20) {
    deviceFontSizeNum = labelWmm <= 50 ? 6.5 : 7.5;
  } else if (deviceLength > 14) {
    deviceFontSizeNum = labelWmm <= 50 ? 7.2 : 8.5;
  }

  // Access: PIN or pattern
  const patternNodes = parsePatternNodes(order.devicePin || '');
  let pinHtml = '';
  let patternHtml = '';
  const showPatternGrid = patternNodes && labelHmm > 22;

  if (showPatternGrid && patternNodes) {
    const size = 24 * scale; const cell = size / 3; const r = cell * 0.22; const nodeR = r * 1.4;
    const np = (i: number) => ({ x: (i % 3) * cell + cell / 2, y: Math.floor(i / 3) * cell + cell / 2 });
    const lines = patternNodes.slice(1).map((n, i) => {
      const a = np(patternNodes[i]); const b = np(n);
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="black" stroke-width="${(1.8 * scale).toFixed(1)}" stroke-linecap="round"/>`;
    }).join('');

    let arrowHtml = '';
    const arrowSize = 3 * scale;
    if (patternNodes.length >= 2) {
      const lp = np(patternNodes[patternNodes.length - 2]);
      const lq = np(patternNodes[patternNodes.length - 1]);
      const dx = lq.x - lp.x; const dy = lq.y - lp.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len; const uy = dy / len;
      const px = -uy; const py = ux;
      const tip = { x: lq.x - ux * nodeR, y: lq.y - uy * nodeR };
      const base = { x: tip.x - ux * arrowSize, y: tip.y - uy * arrowSize };
      const l1 = { x: base.x + px * arrowSize * 0.7, y: base.y + py * arrowSize * 0.7 };
      const l2 = { x: base.x - px * arrowSize * 0.7, y: base.y - py * arrowSize * 0.7 };
      arrowHtml = `<polygon points="${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${l1.x.toFixed(1)},${l1.y.toFixed(1)} ${l2.x.toFixed(1)},${l2.y.toFixed(1)}" fill="black" />`;
    }

    const circles = Array.from({ length: 9 }, (_, i) => {
      const { x, y } = np(i);
      const activeIndex = patternNodes.indexOf(i);
      const active = activeIndex !== -1;
      if (active) {
        const stepNumber = activeIndex + 1;
        const fontSize = (3.6 * scale).toFixed(1);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${nodeR.toFixed(1)}" fill="black" stroke="black" stroke-width="0"/>` +
               `<text x="${x.toFixed(1)}" y="${(y + 0.3 * scale).toFixed(1)}" fill="white" font-size="${fontSize}px" font-weight="900" text-anchor="middle" dominant-baseline="middle">${stepNumber}</text>`;
      } else {
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="black" stroke-width="${(1.0 * scale).toFixed(1)}"/>`;
      }
    }).join('');
    patternHtml = `<div class="access-pattern"><svg width="${size.toFixed(1)}" height="${size.toFixed(1)}" xmlns="http://www.w3.org/2000/svg" style="display:block">${lines}${arrowHtml}${circles}</svg></div>`;
  } else if (patternNodes) {
    patternHtml = `<div class="access-pin-col"><span class="access-pin" style="background:#000;color:#fff;font-size:${s(7.5)}px;font-weight:900;border:none;">[PATRÓN]</span></div>`;
  } else if (order.devicePin && order.devicePin !== 'SIN CLAVE') {
    pinHtml = `<div class="access-pin-col"><span class="access-pin" style="background:#000;color:#fff;font-size:${s(7.5)}px;font-weight:900;border:none;">${order.devicePin}</span></div>`;
  }

  const deliveryStr = order.estimatedDeliveryDate
    ? formatPromiseDate(order.estimatedDeliveryDate)
    : '';

  // Dynamic font size for customer name based on its length
  const nameLength = (order.customerName || '').trim().length;
  let nameBaseSize = 7.5;
  if (nameLength > 32) {
    nameBaseSize = 5.0;
  } else if (nameLength > 25) {
    nameBaseSize = 6.0;
  } else if (nameLength > 18) {
    nameBaseSize = 7.0;
  }

  // Dynamic font size for service type based on its length
  const cleanServiceType = (order.serviceType || '').trim().replace(/\s*-\s*\$\s*[\d,]+(\.\d+)?$/i, '').trim();
  const serviceLength = cleanServiceType.length;
  let serviceBaseSize = 9.5;
  let serviceLineHeight = '1.05';
  if (serviceLength > 35) {
    serviceBaseSize = 6.5;
    serviceLineHeight = '1.0';
  } else if (serviceLength > 22) {
    serviceBaseSize = 7.5;
    serviceLineHeight = '1.0';
  } else if (serviceLength > 14) {
    serviceBaseSize = 8.5;
    serviceLineHeight = '1.05';
  }

  const notesText = (order.labelNote !== undefined ? order.labelNote : order.diagnosticsNote || '').trim();
  const isDefaultNote = notesText.toUpperCase() === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText.toUpperCase() === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText.toUpperCase() === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText.toUpperCase() === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const hasCustomNote = !!order.showNotesOnLabel && notesText !== '' && !isDefaultNote;

  let cleanNote = notesText;
  if (cleanNote.toUpperCase().startsWith('SOLUCIÓN PROPUESTA:')) {
    cleanNote = cleanNote.slice('SOLUCIÓN PROPUESTA:'.length).trim();
  } else if (cleanNote.toUpperCase().startsWith('SOLUCION PROPUESTA:')) {
    cleanNote = cleanNote.slice('SOLUCION PROPUESTA:'.length).trim();
  }

  const notesLength = cleanNote.length;
  let notesBaseSize = 7.5;
  if (notesLength > 80) {
    notesBaseSize = 5.0;
  } else if (notesLength > 50) {
    notesBaseSize = 6.0;
  } else if (notesLength > 25) {
    notesBaseSize = 7.0;
  }

  const batchText = (batchPosition && batchTotal && batchTotal > 1) ? `[${batchPosition}/${batchTotal}]` : '';

  // VARIANTE 1: Vitrina POS Servicio
  if (templateStyle === 'vitrina') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${labelW} ${cssLabelH}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { position: relative; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${s(7)}px; font-weight: 700; width: ${labelW}; height: ${cssLabelH}; overflow: hidden; background: #fff; color: #000; }
      .label { position: absolute; top: ${sm(0.6)}mm; left: calc(${sm(0.8)}mm + ${labelOffset}px); width: calc(100% - ${sm(1.6)}mm); height: calc(${cssLabelH} - ${sm(1.2)}mm); display: flex; flex-direction: column; justify-content: space-between; border: ${s(1.2)}px solid #000; padding: ${sm(0.6)}mm; }
      .v-header { background: #000; color: #fff; padding: ${sm(0.4)}mm ${sm(1)}mm; font-size: ${s(8)}px; font-weight: 950; display: flex; justify-content: space-between; align-items: center; border-radius: ${s(1)}px; line-height: 1.1; }
      .v-body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-evenly; padding: 1px 0; }
      .v-row-name { font-size: ${s(nameBaseSize - 0.5)}px; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
      .v-row-device { font-size: ${s(deviceFontSizeNum - 0.8)}px; font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; color: #222; }
      .v-row-service { display: flex; align-items: center; justify-content: space-between; gap: ${s(3)}px; min-width: 0; }
      .v-service-txt { font-size: ${s(serviceBaseSize - 0.5)}px; font-weight: 900; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.1; }
      .v-price-badge { background: #000; color: #fff; font-size: ${s(12)}px; font-weight: 950; padding: 1px 5px; border-radius: ${s(1.5)}px; white-space: nowrap; flex-shrink: 0; line-height: 1; }
      .v-footer { border-top: ${s(1)}px solid #000; padding-top: 1.5px; display: flex; justify-content: space-between; align-items: center; font-size: ${s(6.8)}px; font-weight: 900; line-height: 1; }
    </style></head><body>
    <div class="label">
      <div class="v-header">
        <span>${order.id} ${batchText ? `<span style="background:#fff;color:#000;padding:0 3px;border-radius:2px;font-size:${s(6)}px;margin-left:3px;">${batchText}</span>` : ''}</span>
        <span>${dateStr}</span>
      </div>
      <div class="v-body">
        <div class="v-row-name">${order.customerName}</div>
        <div class="v-row-device">${deviceLine}</div>
        <div class="v-row-service">
          <div class="v-service-txt">${cleanServiceType}</div>
          ${shouldHidePrice ? '' : `<div class="v-price-badge">${priceDisplay}</div>`}
        </div>
        ${hasCustomNote ? `<div style="font-size:${s(6.0)}px;font-weight:800;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1;">NTS: ${cleanNote}</div>` : ''}
      </div>
      <div class="v-footer">
        <span>${customerPhone ? `TEL: ${customerPhone}` : ''}</span>
        ${pinHtml || patternHtml ? `<div style="display:flex;align-items:center;">${pinHtml || patternHtml}</div>` : '<span style="background:#000;color:#fff;padding:0 3px;border-radius:2px;font-size:6px;font-weight:900;">SIN CLAVE</span>'}
      </div>
    </div>
    </body></html>`;
  }

  // VARIANTE 2: QR & Digital Servicio
  if (templateStyle === 'qr') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${labelW} ${cssLabelH}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { position: relative; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${s(7)}px; font-weight: 700; width: ${labelW}; height: ${cssLabelH}; overflow: hidden; background: #fff; color: #000; }
      .label { position: absolute; top: ${sm(0.6)}mm; left: calc(${sm(0.8)}mm + ${labelOffset}px); width: calc(100% - ${sm(1.6)}mm); height: calc(${cssLabelH} - ${sm(1.2)}mm); display: flex; flex-direction: row; justify-content: space-between; border: ${s(1.2)}px solid #000; padding: ${sm(0.6)}mm; gap: ${sm(1)}mm; }
      .qr-frame { width: 32%; height: 100%; border: ${s(1)}px solid #000; border-radius: ${s(1.5)}px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1px; flex-shrink: 0; }
      .qr-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
      .qr-row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
    </style></head><body>
    <div class="label">
      <div class="qr-info">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: ${s(1)}px solid #000; padding-bottom: 1px; line-height: 1;">
          <span style="font-size: ${s(8)}px; font-weight: 950;">${order.id} ${batchText ? `<span style="background:#000;color:#fff;padding:0 2px;border-radius:2px;font-size:${s(6)}px;margin-left:2px;">${batchText}</span>` : ''}</span>
          <span style="font-size: ${s(6.5)}px; font-weight: 800;">${dateStr.split(' ')[0]}</span>
        </div>
        <div class="qr-row" style="font-size: ${s(nameBaseSize - 0.8)}px; font-weight: 900; text-transform: uppercase;">${order.customerName}</div>
        ${customerPhone ? `<div class="qr-row" style="font-size: ${s(6.2)}px; font-weight: 800;">TEL: ${customerPhone}</div>` : ''}
        <div class="qr-row" style="font-size: ${s(6.5)}px; font-weight: 800; text-transform: uppercase; color: #222;">${deviceLine}</div>
        <div class="qr-row" style="font-size: ${s(serviceBaseSize - 1.2)}px; font-weight: 900; text-transform: uppercase;">${cleanServiceType}</div>
        ${hasCustomNote ? `<div class="qr-row" style="font-size: ${s(5.8)}px; font-weight: 800; color: #333;">NTS: ${cleanNote}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1px; line-height: 1;">
          ${pinHtml || patternHtml ? `<div style="display:flex;align-items:center;">${patternHtml || pinHtml}</div>` : '<span style="font-size:6px;font-weight:900;background:#000;color:#fff;padding:0 2px;border-radius:1px;">SIN CLAVE</span>'}
          ${shouldHidePrice ? '' : `<span style="font-size: ${s(12)}px; font-weight: 950; line-height: 1;">${priceDisplay}</span>`}
        </div>
      </div>
      <div class="qr-frame">
        <div class="qr-target" id="qr" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
      </div>
    </div>
    <script>(function(){
      var scriptEl = document.currentScript;
      var el = (scriptEl && scriptEl.previousElementSibling) 
        ? scriptEl.previousElementSibling.querySelector('.qr-target') 
        : (document.getElementById('qr') || document.querySelector('.qr-target'));
      if (!el) return;
      var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=' + encodeURIComponent('${order.id}');
      el.innerHTML = '<img src="' + qrUrl + '" style="width:100%;height:100%;object-fit:contain;display:block;" />';
    })();<\/script>
    </body></html>`;
  }

  // VARIANTE 3: Ficha Técnica Recepción
  if (templateStyle === 'technical') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${labelW} ${cssLabelH}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { position: relative; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${s(7)}px; font-weight: 700; width: ${labelW}; height: ${cssLabelH}; overflow: hidden; background: #fff; color: #000; }
      .label { position: absolute; top: ${sm(0.6)}mm; left: calc(${sm(0.8)}mm + ${labelOffset}px); width: calc(100% - ${sm(1.6)}mm); height: calc(${cssLabelH} - ${sm(1.2)}mm); display: flex; flex-direction: column; justify-content: space-between; border: ${s(1.2)}px solid #000; padding: ${sm(0.6)}mm; }
      .t-header { background: #000; color: #fff; padding: ${sm(0.4)}mm ${sm(1)}mm; font-size: ${s(7.5)}px; font-weight: 950; display: flex; justify-content: space-between; align-items: center; border-radius: ${s(1)}px; line-height: 1.1; }
      .t-row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
    </style></head><body>
    <div class="label">
      <div class="t-header">
        <span>📋 ${store}</span>
        <span>${order.id} ${batchText ? `<span style="background:#fff;color:#000;padding:0 3px;border-radius:2px;font-size:${s(6)}px;margin-left:3px;">${batchText}</span>` : ''}</span>
        <span>${dateStr.split(' ')[0]}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: ${sm(1)}mm; flex: 1; margin: 2px 0; min-height: 0;">
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
          <div class="t-row" style="font-size: ${s(nameBaseSize - 0.8)}px; font-weight: 900; text-transform: uppercase;">CLI: ${order.customerName}</div>
          ${customerPhone ? `<div class="t-row" style="font-size: ${s(6.2)}px; font-weight: 800;">TEL: ${customerPhone}</div>` : ''}
          <div class="t-row" style="font-size: ${s(deviceFontSizeNum - 0.8)}px; font-weight: 900; text-transform: uppercase;">EQP: ${deviceLine}</div>
          <div class="t-row" style="font-size: ${s(serviceBaseSize - 1.2)}px; font-weight: 900; text-transform: uppercase;">TRB: ${cleanServiceType}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
          ${pinHtml || patternHtml ? `<div class="access-card" style="padding: 1px;">${pinHtml || patternHtml}</div>` : '<div style="background:#000;color:#fff;padding:2px 5px;border-radius:2px;font-size:7px;font-weight:900;">SIN CLAVE</div>'}
        </div>
      </div>
      <div style="border-top: ${s(1)}px dashed #000; padding-top: 1px; display: flex; justify-content: space-between; align-items: flex-end; font-size: ${s(6.5)}px; font-weight: 800; line-height: 1;">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 4px;">${hasCustomNote ? `NTS: ${cleanNote}` : ''}</div>
        ${shouldHidePrice ? '' : `<div style="font-size: ${s(12)}px; font-weight: 950; line-height: 1;">${priceDisplay}</div>`}
      </div>
    </div>
    </body></html>`;
  }

  // OPCIÓN 1: Estándar Taller (LA PLANTILLA ACTUAL INTACTA SIN TOCAR)
  // Determine if it is a small label (hide sidebars and redistribute layout)
  const isSmallLabel = labelWmm < 38 || labelHmm <= 20;
  const isExtremelySmall = labelHmm <= 16;

  // Ultra-compact layout for extremely small height labels (e.g. 30x15mm)
  if (isExtremelySmall) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${labelW} ${cssLabelH}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        position: relative;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: ${s(7)}px;
        font-weight: 700;
        width: ${labelW};
        height: ${cssLabelH};
        overflow: hidden;
        background: #fff;
        color: #000;
      }
      .label {
        position: absolute;
        top: ${sm(1.2)}mm;
        left: ${sm(2.0)}mm;
        width: calc(100% - ${sm(4.0)}mm);
        height: calc(${cssLabelH} - ${sm(2.4)}mm);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: ${s(1.2)}px solid #000;
        padding: ${sm(0.5)}mm;
      }
    </style></head><body>
    <div class="label">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding-bottom: ${s(0.5)}px; border-bottom: ${s(1.2)}px solid #000; flex-shrink: 0;">
        <span style="font-size: ${s(8.5)}px; font-weight: 950; text-transform: uppercase; line-height: 1;">#${order.id}</span>
        <span style="font-size: ${s(9.0)}px; font-weight: 950; background: #000; color: #fff; padding: ${s(0.5)}px ${s(2.5)}px; border-radius: ${s(1.5)}px; line-height: 1; white-space: nowrap;">${priceDisplay}</span>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: ${s(0.5)}px 0; overflow: hidden; min-height: 0;">
        <div style="font-size: ${s(nameBaseSize - 0.5)}px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; line-height: 1.1;">${order.customerName}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: ${s(1.5)}px; min-width: 0; gap: ${s(3)}px; line-height: 1.1;">
          <div style="font-size: ${s(serviceBaseSize - 1.5)}px; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${cleanServiceType}</div>
          ${order.devicePin && order.devicePin !== 'SIN CLAVE' ? `
            <div style="font-size: ${s(6.5)}px; font-weight: 900; background: #000; color: #fff; padding: 0 ${s(2)}px; border-radius: ${s(1.2)}px; flex-shrink: 0; line-height: 1.2; font-family: monospace;">
              ${patternNodes ? '[PATRÓN]' : order.devicePin}
            </div>
          ` : ''}
        </div>
      </div>
      <div style="border-top: ${s(1.2)}px solid #000; padding-top: ${s(0.8)}px; font-size: ${s(deviceFontSizeNum - 0.5)}px; font-weight: 900; text-transform: uppercase; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; background: #fff; line-height: 1;">
        ${limitStr(deviceLine, 80)}
      </div>
    </div>
    </body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: ${labelW} ${cssLabelH}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      position: relative;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${s(7)}px;
      font-weight: 700;
      width: ${labelW};
      height: ${cssLabelH};
      overflow: hidden;
      background: #fff;
      color: #000;
    }
    .label {
      position: absolute;
      top: ${sm(0.8)}mm;
      left: calc(${sm(1.0)}mm + ${labelOffset}px);
      width: calc(100% - ${sm(2.0)}mm);
      height: calc(${cssLabelH} - ${sm(1.6)}mm);
      display: flex;
      flex-direction: row;
      border: ${s(1.5)}px solid #000;
    }
    
    .left-bar {
      width: ${s(18)}px;
      background: #000;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: ${logoSrc ? 'flex-start' : 'center'};
      padding-top: ${logoSrc ? s(3.5) + 'px' : '0'};
      font-size: ${s(9.5)}px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      height: 100%;
      flex-shrink: 0;
    }
    
    .right-bar {
      width: ${s(18)}px;
      display: flex;
      align-items: center;
      justify-content: center;
      writing-mode: vertical-rl;
      font-size: ${s(9.5)}px;
      font-weight: 900;
      height: 100%;
      color: #fff;
      background: #000;
      flex-shrink: 0;
    }
    
    .center-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
    }
    
    .top-bar {
      display: flex;
      flex-direction: column;
      gap: ${s(1.5)}px;
      padding: ${s(0.8)}px ${s(2.5)}px;
      border-bottom: ${s(1.5)}px solid #000;
      overflow: hidden;
    }
    .top-row-1 { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .top-row-2 { display: flex; justify-content: space-between; align-items: center; width: 100%; min-width: 0; }
    .top-id { font-size: ${s(8.5)}px; font-weight: 950; text-transform: uppercase; white-space: nowrap; line-height: 1; }
    .date-badge {
      background: #000;
      color: #fff;
      font-size: ${s(labelWmm <= 60 ? 6.5 : 7.5)}px;
      font-weight: 900;
      padding: ${s(labelHmm <= 22 ? 0.5 : 1)}px ${s(labelWmm <= 60 ? 2.5 : (labelHmm <= 22 ? 2.5 : 4.5))}px;
      border-radius: 999px;
      white-space: nowrap;
      line-height: 1;
    }
    .top-phone { font-size: ${s(labelWmm <= 60 ? 7.0 : (order.customerCountryCode ? 7.5 : 8.5))}px; font-weight: 900; white-space: nowrap; text-align: right; line-height: 1; }
    .top-name { font-size: ${s(nameBaseSize)}px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; text-align: left; flex: 1; min-width: 0; }
    .batch-badge { background: #000; color: #fff; font-size: ${s(5)}px; font-weight: 900; padding: ${s(1)}px ${s(2)}px; border-radius: ${s(1.5)}px; letter-spacing: 0.5px; white-space: nowrap; flex-shrink: 0; line-height: 1; margin-left: ${s(4)}px; }
    
    .body-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      padding: ${s(0.5)}px ${s(3.5)}px ${s(labelHmm <= 22 ? 0.5 : 1.5)}px;
    }
    .body-top-row {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: ${s(4)}px;
      min-height: 0;
    }
    .service-box { display: flex; flex-direction: column; gap: ${s(0.5)}px; flex: 1; min-width: 0; }
    .service-val { font-size: ${s(serviceBaseSize)}px; font-weight: 900; text-transform: uppercase; line-height: ${serviceLineHeight}; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .side-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: ${s(2)}px;
      flex-shrink: 0;
    }
    .price-badge {
      background: #000;
      color: #fff;
      font-size: ${s(9)}px;
      font-weight: 950;
      padding: ${s(1)}px ${s(3.5)}px;
      border-radius: ${s(2)}px;
      line-height: 1;
      white-space: nowrap;
    }

    .access-card {
      display: inline-flex;
      align-items: center;
      border: ${s(labelHmm <= 22 ? 1.2 : 1.8)}px solid #000;
      padding: ${s(labelHmm <= 22 ? 0.8 : 1.5)}px ${s(labelHmm <= 22 ? 1.5 : 3)}px;
      border-radius: ${s(2)}px;
      background: #fff;
      flex-shrink: 0;
    }
    .access-label { font-size: ${s(7.5)}px; font-weight: 900; text-transform: uppercase; color: #000; margin-right: 0px; }
    .access-pin { font-size: ${s(8)}px; font-weight: 900; letter-spacing: 0.5px; background: #000; color: #fff; border: ${s(1)}px solid #000; padding: 0px ${s(2.5)}px; border-radius: ${s(1)}px; }
    .access-pattern { display: flex; align-items: center; gap: ${s(3)}px; }
    .access-pin-col { display: flex; align-items: center; }
    
    .handwrite-area {
      flex: 1;
      width: 100%;
      min-height: 0;
      padding-top: 0px;
    }
    .handwrite-line {
      border-bottom: ${s(2.2)}px solid #000;
      width: 100%;
      margin-top: ${s(labelHmm <= 22 ? 2 : 4)}px;
    }
    .handwrite-notes {
      font-size: ${s(notesBaseSize)}px;
      line-height: 1.05;
      font-weight: 500;
      word-break: break-word;
      white-space: pre-wrap;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: ${labelHmm <= 22 ? 1 : 3};
      -webkit-box-orient: vertical;
      color: #000;
      margin-top: ${s(1)}px;
    }
    
    .bottom-row {
      border-top: ${s(1.5)}px solid #000;
      padding: ${s(1.5)}px ${s(3)}px;
      font-size: ${s(deviceFontSizeNum)}px;
      font-weight: 900;
      text-transform: uppercase;
      text-align: center;
      background: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
      line-height: 1;
    }
  </style></head><body>
  <div class="label">
    ${isSmallLabel ? `
    <div class="center-area" style="width: 100%;">
      <div class="top-bar">
        <div class="top-row-1">
          <span class="top-id bold">#${order.id}</span>
          <span class="date-badge">${dateStr}</span>
        </div>
        <div class="top-row-2">
          <span class="top-name">${order.customerName}</span>
          <span class="top-phone">${customerPhone}</span>
        </div>
      </div>
      <div class="body-center">
        <div class="body-top-row">
          <div class="service-box">
            <div class="service-val">${cleanServiceType}</div>
          </div>
          <div class="side-info">
            ${shouldHidePrice ? '' : `<div class="price-badge">${priceDisplay}</div>`}
            ${pinHtml || patternHtml ? `<div class="access-card">${pinHtml || patternHtml}</div>` : ''}
          </div>
        </div>
        <div class="handwrite-area">
          ${hasCustomNote ? `
          <div class="handwrite-notes">${cleanNote}</div>
          ` : `
          <div class="handwrite-line"></div>
          `}
        </div>
      </div>
      <div class="bottom-row">
        ${limitStr(deviceLine, 80)}
      </div>
    </div>
    ` : `
    <div class="left-bar">
      ${logoHtml}
      <div style="display: block; margin-top: ${logoSrc ? s(4) + 'px' : '0'}; text-align: center; width: 100%;">
        <span style="writing-mode: vertical-lr; display: inline-block; line-height: 1;">
          ${order.id.replace(/\D/g, '')}
        </span>
      </div>
    </div>
    <div class="center-area">
      <div class="top-bar">
        <div class="top-row-1">
          <span class="date-badge">${dateStr}</span>
          <span class="top-phone">${customerPhone}</span>
        </div>
        <div class="top-row-2">
          <span class="top-name">${order.customerName}</span>
          ${batchPosition && batchTotal ? `<span class="batch-badge">${batchPosition}/${batchTotal}</span>` : ''}
        </div>
      </div>
      <div class="body-center">
        <div class="body-top-row">
          <div class="service-box">
            <div class="service-val">${cleanServiceType}</div>
          </div>
          ${pinHtml || patternHtml ? `
          <div class="access-card">
            ${pinHtml || patternHtml}
          </div>
          ` : ''}
        </div>
        <div class="handwrite-area">
          ${hasCustomNote ? `
          <div class="handwrite-notes">${cleanNote}</div>
          ` : `
          <div class="handwrite-line"></div>
          `}
        </div>
      </div>
      <div class="bottom-row">
        ${limitStr(deviceLine, 80)}
      </div>
    </div>
    <div class="right-bar">${priceDisplay}</div>
    `}
  </div>
  </body></html>`;
}

// ─── ETIQUETA DE GARANTÍA (SELLO DE TALLER) ──────────────────────────────────

export function buildWarrantyLabelHtml(order: RepairOrder, config: WorkshopConfig, serviceRepetitionCount?: number): string {
  const sym = config.currencySymbol || '$';
  const phone = config.phone || '';
  const store = (config.storeName || 'TALLER').toUpperCase();
  const sizeKey = config.labelPaperSize || '51x25mm';
  const [labelWmm, labelHmm] = sizeKey.replace('mm','').split('x').map(Number);
  const labelW = `${labelWmm}mm`;
  const cssLabelH = `${labelHmm - 0.8}mm`;

  const scale = (SERVICE_LABEL_SIZES[sizeKey] || { scale: 1.00 }).scale;
  const s = (base: number) => (base * scale).toFixed(1);
  const sm = (base: number) => (base * scale).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const printDate = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = printDate.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(printDate.getDate())}/${_pad(printDate.getMonth()+1)}/${String(printDate.getFullYear()).slice(-2)} ${_pad(_h12)}:${_pad(printDate.getMinutes())}${_ampm}`;

  const customerNameClean = (order.customerName || 'CLIENTE GENERICO').trim().toUpperCase();
  const deviceLine = [order.deviceBrand, order.deviceModel, order.deviceModelNumber ? `(${order.deviceModelNumber})` : ''].filter(Boolean).join(' ').toUpperCase();

  const isSmallLabel = labelWmm < 38 || labelHmm <= 20;
  const isExtremelySmall = labelHmm <= 16;

  const logoSrc = config.labelLogoUrl || '';
  const logoHtmlHeader = logoSrc
    ? `<img src="${logoSrc}" style="height:${s(11)}px;max-width:${s(30)}px;object-fit:contain;display:block;margin:0 4px;"/>`
    : '';
  const logoHtmlRightBar = logoSrc
    ? `<div style="width:${s(16)}px;height:${s(16)}px;background:#ffffff;border-radius:${s(2)}px;display:flex;align-items:center;justify-content:center;margin-bottom:${s(3)}px;padding:1.5px;box-sizing:border-box;"><img src="${logoSrc}" style="width:100%;height:100%;object-fit:contain;display:block;"/></div>`
    : '';

  // Warning texts
  const warningText1 = "SELLO DE GARANTÍA";
  const warningText2 = "NO MANIPULAR / NO REMOVER";

  if (isExtremelySmall) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${labelW} ${cssLabelH}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        position: relative;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: ${s(6.5)}px;
        font-weight: 700;
        width: ${labelW};
        height: ${cssLabelH};
        overflow: hidden;
        background: #fff;
        color: #000;
      }
      .label {
        position: absolute;
        top: ${sm(1.2)}mm;
        left: ${sm(2.0)}mm;
        width: calc(100% - ${sm(4.0)}mm);
        height: calc(${cssLabelH} - ${sm(2.4)}mm);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: ${s(1.2)}px solid #000;
        padding: ${sm(0.5)}mm;
      }
    </style></head><body>
    <div class="label">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: ${s(1.0)}px solid #000; padding-bottom: 2px; flex-shrink: 0;">
        <span style="font-size: ${s(7.5)}px; font-weight: 950;">#${order.id}</span>
        ${logoSrc ? `<img src="${logoSrc}" style="height:${s(7.5)}px;max-width:${s(20)}px;object-fit:contain;"/>` : ''}
        <span style="font-size: ${s(6.5)}px; font-weight: 900; background: #000; color: #fff; padding: 0 ${s(1.5)}px; border-radius: ${s(1)}px;">${dateStr.split(' ')[0]}</span>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; line-height: 1.1;">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: ${s(6.5)}px;">CLI: ${customerNameClean}</div>
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: ${s(6.5)}px;">EQ: ${deviceLine}</div>
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: ${s(6.5)}px;">TRB: ${(order.serviceType || '').toUpperCase()}</div>
        ${serviceRepetitionCount !== undefined ? `
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: ${s(6.5)}px; font-weight: 950;">Nº: #${serviceRepetitionCount}</div>
        ` : ''}
      </div>
      <div style="border-top: ${s(1.0)}px dashed #000; font-size: ${s(5.5)}px; font-weight: 900; text-align: center; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; line-height: 1.2; padding-top: 1px;">
        ${warningText2}
      </div>
    </div>
    </body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: ${labelW} ${cssLabelH}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      position: relative;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${s(7.5)}px;
      font-weight: 700;
      width: ${labelW};
      height: ${cssLabelH};
      overflow: hidden;
      background: #fff;
      color: #000;
    }
    .label {
      position: absolute;
      top: ${sm(0.8)}mm;
      left: ${sm(1.0)}mm;
      width: calc(100% - ${sm(2.0)}mm);
      height: calc(${cssLabelH} - ${sm(1.6)}mm);
      display: flex;
      flex-direction: row;
      border: ${s(1.8)}px solid #000;
    }
    .left-bar {
      width: ${s(18)}px;
      background: #000;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: ${s(7)}px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      height: 100%;
      flex-shrink: 0;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      white-space: nowrap;
      text-align: center;
    }
    .center-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${s(1)}px ${s(3)}px;
      border-bottom: ${s(1.2)}px solid #000;
      background: #fff;
    }
    .top-id { font-size: ${s(8.5)}px; font-weight: 950; text-transform: uppercase; }
    .date-badge {
      background: #000;
      color: #fff;
      font-size: ${s(7)}px;
      font-weight: 900;
      padding: ${s(1)}px ${s(3)}px;
      border-radius: ${s(1.5)}px;
      white-space: nowrap;
    }
    .body-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: ${s(2)}px ${s(4)}px;
      min-height: 0;
      overflow: hidden;
      gap: ${s(1.5)}px;
    }
    .info-row {
      display: flex;
      align-items: baseline;
      min-width: 0;
      white-space: nowrap;
    }
    .info-lbl {
      font-size: ${s(7)}px;
      font-weight: 900;
      color: #000000;
      margin-right: 4px;
      flex-shrink: 0;
    }
    .info-val {
      font-size: ${s(7.5)}px;
      font-weight: 900;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .warning-banner {
      border-top: ${s(1.2)}px dashed #000;
      padding: ${s(2)}px ${s(3)}px;
      font-size: ${s(6.5)}px;
      font-weight: 950;
      text-align: center;
      background: #fff;
      color: #000;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }
    .right-bar {
      width: ${s(18)}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: ${logoSrc ? 'flex-start' : 'center'};
      padding-top: ${logoSrc ? s(3) + 'px' : '0'};
      font-size: ${s(7)}px;
      font-weight: 950;
      height: 100%;
      color: #fff;
      background: #000;
      flex-shrink: 0;
      white-space: nowrap;
      text-align: center;
    }
  </style></head><body>
  <div class="label">
    ${isSmallLabel ? `
    <div class="center-area" style="width: 100%;">
      <div class="top-bar">
        <span class="top-id">#${order.id}</span>
        <span class="date-badge">${dateStr.split(' ')[0]}</span>
        ${logoHtmlHeader}
      </div>
      <div class="body-center">
        <div class="info-row">
          <span class="info-lbl">CTE:</span>
          <span class="info-val">${customerNameClean}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">EQP:</span>
          <span class="info-val">${deviceLine}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">TRB:</span>
          <span class="info-val">${(order.serviceType || '').toUpperCase()}</span>
        </div>
        ${serviceRepetitionCount !== undefined ? `
        <div class="info-row" style="margin-top: 1px;">
          <span class="info-lbl">TRB Nº:</span>
          <span class="info-val" style="font-size: ${s(8)}px; font-weight: 950;">#${serviceRepetitionCount}</span>
        </div>
        ` : ''}
      </div>
      <div class="warning-banner" style="color: #000; background: #fff;">
        ${warningText2}
      </div>
    </div>
    ` : `
    <div class="left-bar">
      ${warningText1}
    </div>
    <div class="center-area">
      <div class="top-bar">
        <span class="top-id" style="font-size: ${s(9)}px;">#${order.id}</span>
        <span class="date-badge">${dateStr}</span>
      </div>
      <div class="body-center">
        <div class="info-row">
          <span class="info-lbl">CLIENTE:</span>
          <span class="info-val" style="font-size: ${s(8)}px;">${customerNameClean}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">EQUIPO:</span>
          <span class="info-val" style="font-size: ${s(8)}px;">${deviceLine}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">TRABAJO:</span>
          <span class="info-val" style="font-size: ${s(8)}px;">${(order.serviceType || '').toUpperCase()}</span>
        </div>
        ${serviceRepetitionCount !== undefined ? `
        <div class="info-row" style="margin-top: 1px;">
          <span class="info-lbl">TRABAJO Nº:</span>
          <span class="info-val" style="font-size: ${s(8.5)}px; font-weight: 950; color: #000;">#${serviceRepetitionCount}</span>
        </div>
        ` : ''}
      </div>
      <div class="warning-banner">
        ⚠️ ${warningText2} ⚠️
      </div>
    </div>
    <div class="right-bar">
      ${logoHtmlRightBar}
      <div style="display: block; margin-top: ${logoSrc ? s(4) + 'px' : '0'}; font-weight: 950; text-align: center; width: 100%;">
        <span style="writing-mode: vertical-rl; display: inline-block; line-height: 1;">
          ${store}
        </span>
      </div>
    </div>
    `}
  </div>
  </body></html>`;
}

// ─── ETIQUETA DE PRODUCTO ────────────────────────────────────────────────────

const LABEL_SIZES: Record<string, { w: string; h: string; bcH: number; scale: number }> = {
  '51x25mm':  { w: '51mm',  h: '25mm', bcH: 48, scale: 1.00 },
  '50x30mm':  { w: '50mm',  h: '30mm', bcH: 58, scale: 1.10 },
  '40x20mm':  { w: '40mm',  h: '20mm', bcH: 35, scale: 0.82 },
  '40x30mm':  { w: '40mm',  h: '30mm', bcH: 50, scale: 0.88 },
  '60x30mm':  { w: '60mm',  h: '30mm', bcH: 50, scale: 1.15 },
  '30x15mm':  { w: '30mm',  h: '15mm', bcH: 18, scale: 0.62 },
  '38x25mm':  { w: '38mm',  h: '25mm', bcH: 40, scale: 0.90 },
  '57x32mm':  { w: '57mm',  h: '32mm', bcH: 54, scale: 1.20 },
  '100x50mm': { w: '100mm', h: '50mm', bcH: 80, scale: 1.80 },
  '58x40mm':  { w: '58mm',  h: '40mm', bcH: 60, scale: 1.22 },
  '80x50mm':  { w: '80mm',  h: '50mm', bcH: 75, scale: 1.55 },
};

export function buildProductLabelHtml(
  item: { name: string; price: number; sku?: string; barcode?: string; brand?: string },
  config: WorkshopConfig,
  overrideStyle?: 'standard' | 'vitrina' | 'qr' | 'technical'
): string {
  const templateStyle = overrideStyle || config.labelTemplateStyle || 'standard';
  const sym = config.currencySymbol || '$';
  const store = (config.storeName || 'TALLER').toUpperCase();
  const logoText = store.slice(0, 2);
  const brandName = store;
  const barcodeId = item.barcode || item.sku || '0000000000000';
  const sizeKey = config.labelPaperSize || '51x25mm';
  const [labelWmm, labelHmm] = sizeKey.replace('mm','').split('x').map(Number);
  const sizeInfo = LABEL_SIZES[sizeKey] || LABEL_SIZES['51x25mm'];
  const logoSrc = config.labelLogoUrl || '';
  const hideStoreName = config.hideStoreNameOnLabel || false;
  const hasHeader = !hideStoreName || logoSrc;
  const bcH = (hasHeader || templateStyle !== 'standard') ? sizeInfo.bcH : Math.round(sizeInfo.bcH * 1.28);
  const { w: baseW, h: baseH, scale } = sizeInfo;
  const s = (base: number) => (base * scale).toFixed(1);
  const sm = (base: number) => (base * scale).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bc128 = getBarcodeScript(barcodeId, false, true, true, bcH)
    .replace("document.getElementById('bc')", "((document.currentScript && document.currentScript.previousElementSibling) ? document.currentScript.previousElementSibling.querySelector('.bc-target') : document.getElementById('bc'))");
  const price = item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isVertical = config.labelOrientation === 'vertical';
  const labelW = baseW;
  const hMm = Number(baseH.replace('mm', ''));
  const cssLabelH = `${hMm - 0.8}mm`;

  const labelOffset = config.labelMarginOffset || 0;
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="height:${s(18)}px;max-width:${s(40)}px;object-fit:contain;display:block;"/>`
    : '';

  const isSmallLabel = labelWmm <= 40 || labelHmm <= 20;
  const isExtremelySmall = labelHmm <= 16;

  const nameTrimmed = (item.name || '').trim();
  const nameLength = nameTrimmed.length;

  let nameFontSize = `${s(8.5)}px`;
  let nameLineHeight = '1.1';
  let maxLines = 2;

  if (isExtremelySmall) {
    nameFontSize = nameLength > 25 ? `${s(6.0)}px` : `${s(6.5)}px`;
    nameLineHeight = '1.0';
    maxLines = 2;
  } else if (isSmallLabel) {
    nameFontSize = nameLength > 35 ? `${s(6.2)}px` : nameLength > 20 ? `${s(6.8)}px` : `${s(7.5)}px`;
    nameLineHeight = '1.05';
    maxLines = 2;
  } else {
    if (nameLength > 45) {
      nameFontSize = `${s(6.8)}px`;
      nameLineHeight = '1.0';
      maxLines = 3;
    } else if (nameLength > 22) {
      nameFontSize = `${s(7.5)}px`;
      nameLineHeight = '1.05';
      maxLines = 2;
    } else {
      nameFontSize = `${s(8.5)}px`;
      nameLineHeight = '1.1';
      maxLines = 2;
    }
  }

  const storeLen = brandName.length;
  let brandFontSize = `${s(8)}px`;
  if (storeLen > 25) {
    brandFontSize = `${s(6.0)}px`;
  } else if (storeLen > 15) {
    brandFontSize = `${s(7.0)}px`;
  }

  let paddingHtml = `${sm(1.5)}mm ${sm(2.5)}mm ${sm(1)}mm`;
  let brandMargin = `${sm(0.3)}mm`;
  let brandHtml = '';
  if (!hideStoreName) {
    brandHtml = logoSrc
      ? `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: ${brandMargin}; flex-shrink: 0;">
          <div class="brand" style="margin-bottom: 0;">${brandName}</div>
          ${logoHtml}
        </div>`
      : `<div class="brand">${brandName}</div>`;
  } else if (logoSrc) {
    brandHtml = `<div style="display: flex; justify-content: flex-end; align-items: center; width: 100%; margin-bottom: ${brandMargin}; flex-shrink: 0;">
        ${logoHtml}
      </div>`;
  }
  let dividerHtml = hideStoreName ? '' : `<hr class="divider"/>`;
  let barcodeNumHtml = `<div class="barcode-num">${barcodeId}</div>`;
  let footerHtml = `
    <div class="footer">
      <span class="price">${sym}${price}</span>
    </div>
  `;
  let barcodeNumMargin = `${sm(0.5)}mm`;
  let footerMargin = `${sm(0.8)}mm`;

  if (isExtremelySmall) {
    paddingHtml = `${sm(0.4)}mm ${sm(1.2)}mm ${sm(0.4)}mm`;
    brandHtml = '';
    dividerHtml = '';
    barcodeNumHtml = '';
    footerHtml = `
      <div class="footer" style="justify-content: center; margin-top: ${sm(0.2)}mm; padding-right: 0;">
        <span class="price" style="font-size: ${s(13)}px;">${sym}${price}</span>
      </div>
    `;
  } else if (isSmallLabel) {
    paddingHtml = `${sm(0.8)}mm ${sm(1.8)}mm ${sm(0.6)}mm`;
    dividerHtml = '';
    brandMargin = `${sm(0.1)}mm`;
    barcodeNumMargin = `${sm(0.2)}mm`;
    footerHtml = `
      <div class="footer" style="justify-content: center; margin-top: ${sm(0.3)}mm; padding-right: 0;">
        <span class="price" style="font-size: ${s(14)}px;">${sym}${price}</span>
      </div>
    `;
  }

  const baseCss = `
    @page { size: ${labelW} ${cssLabelH}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
    .label { width: ${labelW}; height: ${cssLabelH}; display: flex; flex-direction: column; padding: ${paddingHtml}; overflow: hidden; transform: translateX(${labelOffset}px); }
    .brand { font-size: ${brandFontSize}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #000; margin-bottom: ${brandMargin}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .product-name { font-size: ${nameFontSize}; font-weight: 900; text-transform: uppercase; text-align: center; line-height: ${nameLineHeight}; flex-shrink: 0; white-space: normal; word-break: break-word; overflow-wrap: break-word; display: -webkit-box; -webkit-line-clamp: ${maxLines}; -webkit-box-orient: vertical; overflow: hidden; }
    .divider { border: none; border-top: 1.5px solid #000; margin: ${sm(0.8)}mm 0 ${sm(0.6)}mm; flex-shrink: 0; }
    .barcode-wrap { text-align: center; line-height: 0; flex: 1; min-height: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .barcode-wrap svg, .barcode-wrap img { max-width: 95% !important; width: auto !important; height: ${bcH}px !important; }
    .tech-barcode-wrap svg, .tech-barcode-wrap img, .vitrina-barcode-wrap svg, .vitrina-barcode-wrap img { height: 100% !important; }
    .barcode-num { text-align: center; font-size: ${s(7.5)}px; font-weight: 700; letter-spacing: 1.5px; font-family: 'Courier New', monospace; margin-top: ${barcodeNumMargin}; flex-shrink: 0; }
    .footer { display: flex; align-items: flex-end; justify-content: flex-end; margin-top: ${footerMargin}; padding-right: ${sm(2)}mm; flex-shrink: 0; }
    .price { font-size: ${s(16)}px; font-weight: 900; line-height: 1; white-space: nowrap; }
  `;

  if (templateStyle === 'vitrina') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
      .vitrina-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: ${sm(0.4)}mm; margin-bottom: ${sm(0.5)}mm; font-weight: 900; }
      .price-badge-box { background: #000; color: #fff; border-radius: ${s(3)}px; padding: ${sm(1.2)}mm ${sm(2)}mm; font-size: ${s(18)}px; font-weight: 950; font-family: system-ui, -apple-system, sans-serif; white-space: nowrap; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    </style></head><body>
    <div class="label" style="justify-content: space-between;">
      <div class="vitrina-header">
        <span style="font-size: ${s(8)}px; font-weight: 950; text-transform: uppercase;">${hideStoreName ? '' : brandName}</span>
        <span style="font-size: ${s(7)}px; font-weight: 800; font-family: monospace;">SKU: ${barcodeId}</span>
      </div>
      <div class="product-name" style="font-size: ${s(9)}px; font-weight: 950; margin: ${sm(0.3)}mm 0; line-height: 1.1; -webkit-line-clamp: 2;">${item.name.toUpperCase()}</div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: ${sm(1.5)}mm; margin-top: ${sm(0.5)}mm; flex: 1; min-height: 0;">
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="barcode-wrap vitrina-barcode-wrap" style="width: 100%; height: ${s(24)}px;"><div class="bc-target" id="bc"></div></div>
          <div style="font-size: ${s(6.5)}px; font-weight: 800; font-family: monospace; margin-top: 1px; letter-spacing: 0.5px;">${barcodeId}</div>
        </div>
        <div class="price-badge-box">${sym}${price}</div>
      </div>
    </div>
    <script>${bc128}<\/script>
    </body></html>`;
  }

  if (templateStyle === 'qr') {
    const qrScript = `(function(){
      var scriptEl = document.currentScript;
      var el = (scriptEl && scriptEl.previousElementSibling) 
        ? scriptEl.previousElementSibling.querySelector('.qr-target') 
        : (document.getElementById('qr') || document.querySelector('.qr-target'));
      if (!el) return;
      var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=' + encodeURIComponent('${barcodeId}');
      el.innerHTML = '<img src="' + qrUrl + '" style="width:100%;height:100%;object-fit:contain;display:block;" />';
    })();`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
      .qr-frame { border: 1.5px solid #000; border-radius: ${s(2.5)}px; padding: ${sm(0.5)}mm; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; box-sizing: border-box; }
    </style></head><body>
    <div class="label" style="flex-direction: row; align-items: center; justify-content: space-between; gap: ${sm(1.5)}mm;">
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding-right: ${sm(0.5)}mm;">
        ${hideStoreName ? '' : `<div style="font-size: ${s(7.5)}px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 1px;">${brandName}</div>`}
        <div class="product-name" style="text-align: left; font-size: ${s(8)}px; line-height: 1.1; -webkit-line-clamp: 2; margin: 1px 0;">${item.name.toUpperCase()}</div>
        <div style="font-size: ${s(6.5)}px; font-weight: 800; font-family: monospace; color: #111;">SKU: ${barcodeId}</div>
        <div style="font-size: ${s(18)}px; font-weight: 950; color: #000; line-height: 1; margin-top: 2px;">${sym}${price}</div>
      </div>
      <div style="width: 38%; height: 95%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <div class="qr-frame">
          <div class="qr-target" id="qr" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
        </div>
      </div>
    </div>
    <script>${qrScript}<\/script>
    </body></html>`;
  }

  if (templateStyle === 'technical') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
      .tech-header { background: #000; color: #fff; padding: ${sm(0.4)}mm ${sm(1.2)}mm; font-size: ${s(7)}px; font-weight: 900; display: flex; justify-content: space-between; align-items: center; border-radius: ${s(1)}px; margin-bottom: ${sm(0.6)}mm; flex-shrink: 0; }
      .tech-name { font-size: ${s(7.5)}px; font-weight: 800; text-transform: uppercase; text-align: left; line-height: 1.05; flex: 1; min-height: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-break: break-word; }
      .tech-footer { display: flex; align-items: flex-end; justify-content: space-between; border-top: 1px dashed #000; padding-top: ${sm(0.5)}mm; margin-top: ${sm(0.5)}mm; flex-shrink: 0; }
    </style></head><body>
    <div class="label" style="justify-content: space-between;">
      <div class="tech-header">
        <span>${hideStoreName ? '📋 DETALLE' : `📋 ${brandName}`}</span>
        <span style="font-family: monospace;">SKU: ${barcodeId}</span>
      </div>
      <div class="tech-name">${item.name.toUpperCase()}</div>
      <div class="tech-footer">
        <div style="display: flex; flex-direction: column; flex: 1; min-width: 0; padding-right: ${sm(1)}mm;">
          <div class="barcode-wrap tech-barcode-wrap" style="height: ${s(22)}px;"><div class="bc-target" id="bc"></div></div>
          <div style="font-size: ${s(6)}px; font-weight: 700; font-family: monospace; text-align: center; margin-top: 1px;">${barcodeId}</div>
        </div>
        <div style="font-size: ${s(17)}px; font-weight: 950; line-height: 1; font-family: system-ui, sans-serif; white-space: nowrap;">${sym}${price}</div>
      </div>
    </div>
    <script>${bc128}<\/script>
    </body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
  <div class="label" style="justify-content: space-between;">
    ${brandHtml}
    <div class="product-name" style="margin: ${sm(0.4)}mm 0;">${item.name.toUpperCase()}</div>
    ${dividerHtml}
    <div class="barcode-wrap"><div class="bc-target" id="bc"></div></div>
    ${barcodeNumHtml}
    ${footerHtml}
  </div>
  <script>${bc128}<\/script>
  </body></html>`;
}

function buildEntryBarcode(text: string, divId: string, barcodeAsImage?: boolean, showBarcode?: boolean): string {
  if (showBarcode === false) return '';
  const script = getBarcodeScript(text, barcodeAsImage, showBarcode).replace("document.getElementById('bc')", "document.getElementById('" + divId + "')");
  return `<div id="${divId}" style="margin:4px 0;text-align:center;width:100%;overflow:hidden"></div><script>${script}<\/script>`;
}


export function buildEntryTicketHtml(order: RepairOrder, config: WorkshopConfig): string {
  if (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta-duplicado') {
    return buildMediaCartaDuplicadoTicketHtml(order, config);
  } else if (config.ticketPaperWidth === 'media-carta') {
    return buildMediaCartaTicketHtml(order, config);
  }
  const sym = config.currencySymbol || '$';
  const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
  const is58 = paperWidth === '58mm';
  const fs = is58 ? '11' : '13';
  const fsSm = is58 ? '9' : '10';

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = order.estimatedDeliveryDate
    ? formatPromiseDate(order.estimatedDeliveryDate)
    : null;

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '');
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  const policiesHtml = policies
    ? `<hr class="sep"><div style="font-weight:900;text-align:center;font-size:${is58?'10':'11'}px;margin:2px 0;text-decoration:underline">TÉRMINOS Y CONDICIONES</div><div style="font-size:${is58?'8.5':'10'}px;line-height:1.35;margin:2px 0">${policies}</div>`
    : '';
  const barcodeHtml = buildEntryBarcode(order.id, 'bc-entry', config.barcodeAsImage, config.showBarcodeOnTicket);

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset = config.ticketMarginOffset || 0;
  const rightPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '6mm');
  const leftPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '5mm');
  const bottomPad = is58 ? '2mm' : '4mm';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${effectivePaperSize} auto;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${fs}px;font-weight:700;width:100%;padding:0 calc(${rightPad} - ${offset}px) ${bottomPad} calc(${leftPad} + ${offset}px);color:#000;background:#fff;overflow-x:hidden;overflow-wrap:break-word;word-break:break-word}
    .sep{border:none;border-top:1.5px dashed #000;margin:4px 0}
    .badge{display:block;font-weight:900;text-align:center;font-size:${is58?'10':'11'}px;background:#000;color:#fff;padding:2px 0;margin:3px 0;letter-spacing:1px}
    .row{display:flex;justify-content:space-between;font-size:${is58?'11':'12'}px;margin:2px 0;line-height:1.3}
    .lbl{font-weight:700;white-space:nowrap;margin-right:4px}
    .val{text-align:right;white-space:nowrap;flex-shrink:0}
    .bold{font-weight:900}
    .notice{font-size:${fsSm}px;font-weight:900;text-align:center;border:2px solid #000;padding:4px;margin:6px 0;letter-spacing:0.5px}
  </style></head><body>
  ${buildTicketHeaderHtml(config, paperWidth as any)}
  <hr class="sep">
  <div class="badge">COMPROBANTE DE RECEPCIÓN</div>
  <div class="row"><span class="lbl">No. Orden:</span><span class="val bold">${order.id}</span></div>
  <div class="row"><span class="lbl">Fecha:</span><span class="val">${dateStr}</span></div>
  ${order.createdBy ? `<div class="row"><span class="lbl">Atendió:</span><span class="val">${order.createdBy.toUpperCase()}</span></div>` : ''}
  ${deliveryStr ? `<div class="row"><span class="lbl">Entrega estimada:</span><span class="val">${deliveryStr}</span></div>` : ''}
  <hr class="sep">
  <div class="row"><span class="lbl">Cliente:</span><span class="val bold">${order.customerName.toUpperCase()}</span></div>
  ${customerPhone ? `<div class="row"><span class="lbl">Tel:</span><span class="val">${customerPhone}</span></div>` : ''}
  <hr class="sep">
  <div class="row"><span class="lbl">Equipo:</span><span class="val">${order.deviceBrand} ${order.deviceModel}</span></div>
  ${(() => {
    // Migración retroactiva: convierte formato antiguo "SVC A Y SVC B" en multilínea
    const effectiveSvcType = (order.serviceType && !order.serviceType.includes('\n') && order.serviceType.includes(' Y '))
      ? order.serviceType.split(' Y ').join('\n')
      : (order.serviceType || '');

    if (effectiveSvcType.includes('\n') || effectiveSvcType.includes(' - ')) {
      const lines = effectiveSvcType.split('\n');
      let html = '';
      lines.forEach((line, index) => {
        const sepIdx = line.lastIndexOf(' - ');
        const borderStyle = index < lines.length - 1 ? 'border-bottom:1px dashed #eee;padding-bottom:2px;margin-bottom:2px;' : '';
        if (sepIdx !== -1) {
          const name = line.substring(0, sepIdx);
          const price = line.substring(sepIdx + 3);
          html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px;font-size:${is58?'11':'12'}px;margin:2px 0;line-height:1.3;${borderStyle}"><span class="lbl" style="flex:1;white-space:normal;overflow-wrap:break-word;word-break:break-word">${name}:</span><span class="val bold" style="flex-shrink:0">${price}</span></div>`;
        } else {
          html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px;font-size:${is58?'11':'12'}px;margin:2px 0;line-height:1.3;${borderStyle}"><span class="lbl" style="flex:1;white-space:normal">${line}:</span></div>`;
        }
      });
      return html;
    }
    return `<div class="row"><span class="lbl">Servicio:</span><span class="val">${order.serviceType || cleanFault}</span></div>`;
  })()}
  ${order.receivedAccessories && order.receivedAccessories.length > 0
    ? `<div class="row"><span class="lbl">Accesorios:</span><span class="val bold">${order.receivedAccessories.join(', ')}</span></div>`
    : ''
  }
  <hr class="sep">
  <div class="row"><span class="lbl">Presupuesto total:</span><span class="val font-mono bold">${sym}${order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row"><span class="lbl">Anticipo:</span><span class="val font-mono">${sym}${order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row" style="font-size:${is58 ? '12' : '13'}px;border-top:1.5px dashed #000;padding-top:2px;margin-top:2px">
    <span class="lbl bold">Resta por Pagar:</span>
    <span class="val font-mono bold" style="text-decoration:underline">${sym}${(Math.max(0, order.cost - order.advancePayment)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  </div>
  ${policiesHtml}
  <hr class="sep">
  <div class="notice">PRESÉNTALO AL RECOGER TU EQUIPO</div>
  ${barcodeHtml}
  </body></html>`;
}

export function buildBatchEntryTicketHtml(orders: RepairOrder[], config: WorkshopConfig): string {
  if (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta-duplicado') {
    return buildMediaCartaDuplicadoConsolidatedTicketHtml(orders, config);
  } else if (config.ticketPaperWidth === 'media-carta') {
    return buildMediaCartaConsolidatedTicketHtml(orders, config);
  }
  const sym = config.currencySymbol || '$';
  const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
  const is58 = paperWidth === '58mm';
  const fs = is58 ? '11' : '13';
  const fsSm = is58 ? '9' : '10';

  const first = orders[0];
  const batchId = first.batchId || '';
  const now = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = now.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(now.getDate())}/${_pad(now.getMonth()+1)}/${now.getFullYear()} ${_h12}:${_pad(now.getMinutes())}${_ampm}`;

  const customerPhone = formatCustomerPhoneWithCountryCode(first.customerPhone, first.customerCountryCode);

  const totalCost = orders.reduce((s, o) => s + o.cost, 0);
  const totalAdvance = first.batchAdvancePayment || 0;
  const totalDue = Math.max(0, totalCost - totalAdvance);

  const equiposHtml = orders.map((o, i) => {
    const cleanFault = (o.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '');
    const accsHtml = o.receivedAccessories && o.receivedAccessories.length > 0
      ? `<div style="font-size:${is58?'7.5':'8.5'}px;font-style:italic;color:#000;padding-left:10px;margin-bottom:2px">↳ Accesorios: ${o.receivedAccessories.join(', ')}</div>`
      : '';
    return `<div style="display:flex;justify-content:space-between;font-size:${is58?'9':'11'}px;margin:2px 0;border-bottom:1px dashed #000;padding-bottom:2px">
      <span style="font-weight:700">${i+1}. ${o.deviceBrand} ${o.deviceModel}</span>
      <span style="font-family:monospace;font-weight:900">${o.id}</span>
    </div>
    ${(() => {
      // Migración retroactiva: convierte formato antiguo "SVC A Y SVC B" en multilínea
      const effectiveSvcType = (o.serviceType && !o.serviceType.includes('\n') && o.serviceType.includes(' Y '))
        ? o.serviceType.split(' Y ').join('\n')
        : (o.serviceType || '');

      if (effectiveSvcType.includes('\n') || effectiveSvcType.includes(' - ')) {
        const lines = effectiveSvcType.split('\n');
        let html = '';
        lines.forEach((line, index) => {
          const sepIdx = line.lastIndexOf(' - ');
          const borderStyle = index < lines.length - 1 ? 'border-bottom:1px dashed #eee;padding-bottom:1px;margin-bottom:1px;' : '';
          if (sepIdx !== -1) {
            const name = line.substring(0, sepIdx);
            const price = line.substring(sepIdx + 3);
            html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4px;font-size:${is58?'8':'9'}px;color:#000;padding-left:10px;${borderStyle}"><span style="flex:1;overflow-wrap:break-word;word-break:break-word">${name}</span><span style="white-space:nowrap;font-weight:700;flex-shrink:0">${price}</span></div>`;
          } else {
            html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4px;font-size:${is58?'8':'9'}px;color:#000;padding-left:10px;${borderStyle}"><span style="flex:1">${line}</span></div>`;
          }
        });
        return html;
      }
      return `<div style="display:flex;justify-content:space-between;align-items:flex-end;font-size:${is58?'8':'9'}px;color:#000;padding-left:10px;margin-bottom:2px">
        <span>${o.serviceType || cleanFault}</span>
        <span style="font-weight:700;white-space:nowrap;flex-shrink:0">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>`;
    })()} ${accsHtml}`;
  }).join('');

  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  const policiesHtml = policies
    ? `<hr class="sep"><div style="font-weight:900;text-align:center;font-size:${is58?'10':'11'}px;margin:2px 0;text-decoration:underline">TÉRMINOS Y CONDICIONES</div><div style="font-size:${is58?'8.5':'10'}px;line-height:1.35;margin:2px 0">${policies}</div>`
    : '';
  const barcodeHtml = buildEntryBarcode(batchId, 'bc-batch-entry', config.barcodeAsImage, config.showBarcodeOnTicket);

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset = config.ticketMarginOffset || 0;
  const rightPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '6mm');
  const leftPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '5mm');
  const bottomPad = is58 ? '2mm' : '4mm';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${effectivePaperSize} auto;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${fs}px;font-weight:700;width:100%;padding:0 calc(${rightPad} - ${offset}px) ${bottomPad} calc(${leftPad} + ${offset}px);color:#000;background:#fff;overflow-x:hidden;overflow-wrap:break-word;word-break:break-word}
    .sep{border:none;border-top:1.5px dashed #000;margin:4px 0}
    .badge{display:block;font-weight:900;text-align:center;font-size:${is58?'10':'11'}px;background:#000;color:#fff;padding:2px 0;margin:3px 0;letter-spacing:1px}
    .row{display:flex;justify-content:space-between;font-size:${is58?'10':'12'}px;margin:2px 0;line-height:1.3}
    .lbl{font-weight:700;white-space:nowrap;margin-right:4px}
    .val{text-align:right;white-space:nowrap;flex-shrink:0}
    .bold{font-weight:900}
    .notice{font-size:${fsSm}px;font-weight:900;text-align:center;border:2px solid #000;padding:4px;margin:6px 0;letter-spacing:0.5px}
  </style></head><body>
  ${buildTicketHeaderHtml(config, paperWidth as any)}
  <hr class="sep">
  <div class="badge">RECEPCIÓN GRUPAL · ${orders.length} EQUIPOS</div>
  <div class="row"><span class="lbl">Fecha:</span><span class="val">${dateStr}</span></div>
  <hr class="sep">
  <div class="row"><span class="lbl">Cliente:</span><span class="val bold">${first.customerName.toUpperCase()}</span></div>
  ${customerPhone ? `<div class="row"><span class="lbl">Tel:</span><span class="val">${customerPhone}</span></div>` : ''}
  <hr class="sep">
  ${equiposHtml}
  <hr class="sep">
  <div class="row"><span class="lbl">Total de Equipos:</span><span class="val bold">${orders.length}</span></div>
  <div class="row"><span class="lbl">Costo Total del Grupo:</span><span class="val font-mono bold">${sym}${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row"><span class="lbl">Anticipo del Grupo:</span><span class="val font-mono">${sym}${totalAdvance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row" style="font-size:${is58 ? '11' : '13'}px;border-top:1.5px dashed #000;padding-top:2px;margin-top:2px">
    <span class="lbl bold">Resta por Pagar:</span>
    <span class="val font-mono bold" style="text-decoration:underline">${sym}${totalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  </div>
  ${policiesHtml}
  <hr class="sep">
  <div class="notice">PRESÉNTALO AL RECOGER TUS EQUIPOS</div>
  ${barcodeHtml}
  </body></html>`;
}

export function buildMediaCartaQuoteTicketHtml(quote: Quote, config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = 'Este documento es una cotización y no implica compromiso de servicio.';

  const _d = new Date(quote.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  
  let validStr = 'N/A';
  if (quote.validUntil) {
    const vd = new Date(quote.validUntil + 'T00:00:00');
    validStr = `${_pad(vd.getDate())}/${_pad(vd.getMonth()+1)}/${vd.getFullYear()}`;
  }

  const customerPhone = formatCustomerPhoneWithCountryCode(quote.customerPhone, quote.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '75mm';
          img.style.maxHeight = '28mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '42mm';
          img.style.maxHeight = '24mm';
        }
      })(this)" style="max-height: 25mm; max-width: 55mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const subtotalDevices = quote.devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
  const subtotalAdditional = (quote.additionalConcepts || []).reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
  const totalEstimado = subtotalDevices + subtotalAdditional;

  const showCustomNotes = !!(quote.showNotesOnTicket && quote.notes && quote.notes.trim() !== '');

  const code128Script = getBarcodeScript(quote.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const deviceRowsHtml = quote.devices.map((d, index) => {
    const dq = d.quantity || 1;
    const detailsCostText = dq > 1 ? `<div style="font-size: 8.5px; color: #475569; margin-top: 1px;">CANTIDAD: ${dq} · UNITARIO: ${currSym}${d.estimatedCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : '';
    const rowSubtotal = dq * d.estimatedCost;
    return `<tr>
      <td>
        <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">${d.deviceBrand} ${d.deviceModel}</div>
        <div style="font-size: 9px; color: #475569; margin-top: 1px;">
          ${d.deviceType ? `TIPO: ${d.deviceType === 'Phone' ? 'CELULAR' : d.deviceType.toUpperCase()}` : ''}
          ${d.deviceModelNumber ? ` · MODELO: ${d.deviceModelNumber.toUpperCase()}` : ''}
        </div>
        <div style="margin-top: 3px; font-weight: 500; font-size: 9px; color: #334155;"><b>SERVICIO A COTIZAR:</b> ${d.serviceType.toUpperCase()}</div>
        ${d.faultDescription ? `<div style="margin-top: 2px; font-size: 8.5px; font-weight: 500; color: #475569;"><b>FALLA REPORTADA:</b> ${d.faultDescription.toUpperCase()}</div>` : ''}
        ${detailsCostText}
      </td>
      <td style="text-align: right; font-weight: 900; font-size: 11px; vertical-align: middle;">${currSym}${rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('') + (quote.additionalConcepts || []).map(c => {
    const cq = c.quantity || 1;
    const detailsCostText = cq > 1 ? `<div style="font-size: 8.5px; color: #475569; margin-top: 1px;">CANTIDAD: ${cq} · UNITARIO: ${currSym}${c.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : '';
    const rowSubtotal = cq * c.price;
    return `<tr>
      <td>
        <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #1e3a8a;">[INSUMO / MANO DE OBRA]</div>
        <div style="margin-top: 3px; font-weight: 500; font-size: 9px; color: #334155;">${c.description.toUpperCase()}</div>
        ${detailsCostText}
      </td>
      <td style="text-align: right; font-weight: 900; font-size: 11px; vertical-align: middle;">${currSym}${rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.35; padding: 6mm 8mm 0 8mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 6px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 6px; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }' +
    '.total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }' +
    '.policies-box { font-size: 7px; color: #475569; line-height: 1.3; border: 1px solid #e2e8f0; padding: 4px 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; margin-bottom: 8px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 5px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' +
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '4px') + ';">' + (config.storeName || 'COTIZACIÓN') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 8px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Cotización</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Cotización:</span><span class="data-value">#' + quote.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Emisión:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Válida hasta:</span><span class="data-value">' + validStr + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + quote.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table">' +
    '      <thead><tr><th style="width: 75%;">Dispositivo & Servicio a Cotizar</th><th style="width: 25%; text-align: right;">Costo Estimado</th></tr></thead>' +
    '      <tbody>' + deviceRowsHtml + '</tbody>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 4px; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 28mm;">' +
    '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
    (showCustomNotes
      ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + quote.notes + '</div>'
      : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '      </div>') +
    '    </div>' +
    '  </div>' +
    '  <div style="flex-shrink: 0;">' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    '          <div class="policies-box" style="margin-top: 0; margin-bottom: 6px;"><b>NOTA:</b> ' + policies + '</div>' +
    (!quote.showNotesOnTicket && quote.notes ? '          <div style="font-size: 8.5px; color: #000; margin-top: 4px;"><b>Notas Adicionales:</b> ' + quote.notes + '</div>' : '') +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">' +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>TOTAL ESTIMADO:</span><span>' + currSym + totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    buildTicketFooterBlock(config, 'media-carta') +
    '  </div>' +
    '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildQuoteTicketHtml(quote: Quote, config: WorkshopConfig): string {
  if (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta-duplicado') {
    return buildMediaCartaDuplicadoQuoteTicketHtml(quote, config);
  } else if (config.ticketPaperWidth === 'media-carta') {
    return buildMediaCartaQuoteTicketHtml(quote, config);
  }
  const sym = config.currencySymbol || '$';
  const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
  const is58 = paperWidth === '58mm';
  const fs = is58 ? '11' : '13';
  const fsSm = is58 ? '9' : '10';
  const fsMd = is58 ? '10' : '12';

  const now = new Date(quote.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12;
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${h12}:${pad(now.getMinutes())}${ampm}`;

  let validStr = '';
  if (quote.validUntil) {
    const vd = new Date(quote.validUntil + 'T00:00:00');
    validStr = `${pad(vd.getDate())}/${pad(vd.getMonth()+1)}/${pad(vd.getFullYear())}`;
  }

  const customerPhone = formatCustomerPhoneWithCountryCode(quote.customerPhone, quote.customerCountryCode);

  const subtotalDevices = quote.devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
  const subtotalAdditional = (quote.additionalConcepts || []).reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
  const totalEstimado = subtotalDevices + subtotalAdditional;
  const multipleDevices = (quote.devices.length + (quote.additionalConcepts || []).length) > 1;

  const devicesHtml = quote.devices.map((d, i) => {
    const dq = d.quantity || 1;
    const detailsCost = dq > 1 ? '<div style="font-size:' + fsSm + 'px;color:#000;margin-top:2px">CANT: ' + dq + ' x ' + sym + d.estimatedCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' : '';
    const rowSubtotal = dq * d.estimatedCost;
    return (
      '<div style="margin:6px 0;border:' + (multipleDevices ? '2px solid #000' : '1px solid #000') + ';border-radius:2px;overflow:hidden">' +
        (multipleDevices
          ? '<div style="background:#000;color:#fff;font-weight:900;font-size:' + fsSm + 'px;padding:2px 5px;display:flex;justify-content:space-between;letter-spacing:0.5px">' +
               '<span>EQUIPO ' + (i+1) + ' / ' + quote.devices.length + '</span>' +
            '</div>'
          : '') +
        '<div style="padding:4px 5px">' +
          '<div style="display:flex;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0;font-weight:700"><span>' + d.deviceBrand + ' ' + d.deviceModel + '</span></div>' +
          (d.deviceType ? '<div style="font-size:' + fsSm + 'px;color:#000;margin:1px 0">' + (d.deviceType === 'Phone' ? 'Celular' : d.deviceType) + (d.deviceModelNumber ? ' · ' + d.deviceModelNumber : '') + '</div>' : '') +
          '<div style="border-top:1px dashed #000;margin:3px 0"></div>' +
          '<div style="font-size:' + fsSm + 'px;font-weight:900;text-transform:uppercase;margin-bottom:2px">SERVICIO A COTIZAR</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:' + fsMd + 'px;font-weight:900"><span>' + d.serviceType + '</span><span>' + sym + rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
          (d.faultDescription ? '<div style="font-size:' + (is58?'8':'9') + 'px;color:#000;margin-top:2px">' + d.faultDescription + '</div>' : '') +
          detailsCost +
        '</div>' +
      '</div>'
    );
  }).join('') + (quote.additionalConcepts || []).map((c, i) => {
    const cq = c.quantity || 1;
    const detailsCost = cq > 1 ? '<div style="font-size:' + fsSm + 'px;color:#000;margin-top:2px">CANT: ' + cq + ' x ' + sym + c.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' : '';
    const rowSubtotal = cq * c.price;
    return (
      '<div style="margin:6px 0;border:1px solid #000;border-radius:2px;overflow:hidden">' +
        '<div style="padding:4px 5px">' +
          '<div style="font-size:' + fsSm + 'px;font-weight:900;text-transform:uppercase;color:#000">INSUMO / MANO DE OBRA</div>' +
          '<div style="border-top:1px dashed #000;margin:3px 0"></div>' +
          '<div style="display:flex;justify-content:space-between;font-size:' + fsMd + 'px;font-weight:900"><span>' + c.description + '</span><span>' + sym + rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
          detailsCost +
        '</div>' +
      '</div>'
    );
  }).join('');

  const totalHtml = multipleDevices
    ? '<div style="display:flex;justify-content:space-between;font-size:' + (is58?'13':'15') + 'px;font-weight:900;margin-top:6px;padding:5px 4px;background:#000;color:#fff;letter-spacing:0.5px"><span>TOTAL EST.:</span><span>' + sym + totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>'
    : '<div style="display:flex;justify-content:space-between;font-size:' + (is58?'13':'15') + 'px;font-weight:900;margin-top:6px;padding:5px 4px;background:#000;color:#fff;letter-spacing:0.5px"><span>TOTAL EST.:</span><span>' + sym + totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>';

  const code128Script = getBarcodeScript(quote.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset = config.ticketMarginOffset || 0;
  const rightPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '6mm');
  const leftPad = isStarTsp100 ? '1mm' : (is58 ? '4mm' : '5mm');
  const bottomPad = is58 ? '2mm' : '4mm';

  const CSS =
    '@page { size: ' + effectivePaperSize + ' auto; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ' + fs + 'px; font-weight: 700; width: 100%; padding: 0 calc(' + rightPad + ' - ' + offset + 'px) ' + bottomPad + ' calc(' + leftPad + ' + ' + offset + 'px); color: #000; background: #fff; overflow-x: hidden; overflow-wrap: break-word; word-break: break-word; }' +
    '.sep { border: none; border-top: 1.5px dashed #000; margin: 4px 0; }';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' +
    buildTicketHeaderHtml(config, paperWidth as any) +
    '<hr class="sep">' +
    '<div style="display:block;font-weight:900;text-align:center;font-size:' + fsSm + 'px;background:#000;color:#fff;padding:2px 0;margin:3px 0;letter-spacing:1px">COTIZACIÓN DE SERVICIO</div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0"><span style="font-weight:700">No.:</span><span style="text-align:right;flex:1;font-weight:900">' + quote.id + '</span></div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0"><span style="font-weight:700">Fecha:</span><span style="text-align:right;flex:1">' + dateStr + '</span></div>' +
    (validStr ? '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0"><span style="font-weight:700">Válida hasta:</span><span style="text-align:right;flex:1">' + validStr + '</span></div>' : '') +
    '<hr class="sep">' +
    '<div style="font-weight:900;text-align:center;font-size:' + fsSm + 'px;margin:3px 0 2px 0;text-decoration:underline">CLIENTE</div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0"><span style="font-weight:700">Nom:</span><span style="text-align:right;flex:1;font-weight:900">' + quote.customerName.toUpperCase() + '</span></div>' +
    (customerPhone ? '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:' + fsMd + 'px;margin:2px 0"><span style="font-weight:700">Tel:</span><span style="text-align:right;flex:1">' + customerPhone + '</span></div>' : '') +
    devicesHtml +
    '<hr class="sep">' +
    totalHtml +
    (quote.notes ? '<div style="margin-top:6px;font-size:' + fsSm + 'px;color:#000"><b>Notas:</b> ' + quote.notes + '</div>' : '') +
    '<hr class="sep">' +
    '<div style="font-size:' + (is58?'7.5':'8.5') + 'px;text-align:center;color:#000;margin:4px 0;line-height:1.4">Este documento es una cotización y no implica compromiso de servicio.</div>' +
    '<hr class="sep">' +
    '<div class="bc-target" id="bc" style="margin:5px 0 2px 0;text-align:center;width:100%;overflow:hidden"></div>' +
    '<hr class="sep">' +
    buildTicketFooterBlock(config, paperWidth as any) +
    '<div style="font-size:' + (is58?'8.5':'9.5') + 'px;text-align:center;font-weight:700;margin:2px 0">¡Gracias por su preferencia!</div>' +
    '<script>' + code128Script + '<\/script>' +
    '</body></html>';
}

export function buildConsolidatedTicketHtml(orders: RepairOrder[], config: WorkshopConfig, page?: 'front' | 'back'): string {
  if (config.ticketPaperWidth === 'media-carta') {
    if (config.printDuplexContract && !config.mediaCartaFrontTerms && page !== undefined) {
      return buildSingleDuplexMediaCartaConsolidatedTicketHtml(orders, config, page);
    }
    return buildMediaCartaConsolidatedTicketHtml(orders, config);
  } else if (config.hybridPrintMode || config.ticketPaperWidth === 'media-carta-duplicado') {
    if (config.mediaCartaFrontTerms) {
      return buildMediaCartaDuplicadoConsolidatedTicketHtml(orders, config, 'front');
    }
    return buildMediaCartaDuplicadoConsolidatedTicketHtml(orders, config, page);
  }
  const sym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  const paperWidth = config.ticketPaperWidth === '58mm' ? '58mm' : '80mm';
  const { top: promoTop, bottom: promoBottom } = buildPromoHtml(config, paperWidth === '58mm');
  const fs = paperWidth === '58mm' ? '11' : '13';
  const fsSm = paperWidth === '58mm' ? '9' : '10';
  const fsMd = paperWidth === '58mm' ? '10' : '12';
  const pad = (n: number) => String(n).padStart(2, '0');

  const first = orders[0];
  const batchId = first?.batchId || '';
  const now = new Date();
  const h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12;
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${h12}:${pad(now.getMinutes())}${ampm}`;

  const totalCargo = orders.reduce((s, o) => s + o.cost, 0);
  const totalAnticipo = orders[0]?.batchAdvancePayment ?? orders.reduce((s, o) => s + o.advancePayment, 0);
  const totalResta = Math.max(0, totalCargo - totalAnticipo);

  const signatureHtml = config.hideTicketSignature
    ? ''
    : '<div style="text-align:center;margin-top:16px;margin-bottom:6px">' +
      '<div style="height:36px"></div>' +
      '<div style="border-top:1px solid #000;width:65%;margin:0 auto 4px auto"></div>' +
      '<div style="font-size:8.5px;font-weight:700;letter-spacing:0.5px">FIRMA DE ACEPTACIÓN</div>' +
      '</div>';

  // Combine breakdowns from all orders in the batch
  const combinedBreakdown: { method: string; amount: number }[] = [];
  orders.forEach(o => {
    if (o.advancePaymentBreakdown) {
      o.advancePaymentBreakdown.forEach(b => {
        const existing = combinedBreakdown.find(x => x.method === b.method);
        if (existing) {
          existing.amount += b.amount;
        } else {
          combinedBreakdown.push({ ...b });
        }
      });
    } else if (o.advancePayment > 0) {
      const defaultMethod = 'Efectivo';
      const existing = combinedBreakdown.find(x => x.method === defaultMethod);
      if (existing) {
        existing.amount += o.advancePayment;
      } else {
        combinedBreakdown.push({ method: defaultMethod, amount: o.advancePayment });
      }
    }
  });

  if (combinedBreakdown.length === 0 && totalAnticipo > 0) {
    combinedBreakdown.push({ method: 'Efectivo', amount: totalAnticipo });
  }

  const barcodeHtml = batchId ? buildEntryBarcode(batchId, 'bc-consolidated-entry', config.barcodeAsImage, config.showBarcodeOnTicket) : '';

  const customerPhone = formatCustomerPhoneWithCountryCode(first.customerPhone, first.customerCountryCode);

  // Bloque de cada equipo — mismo estilo que ticket individual
  const equiposHtml = orders.map(o => {
    const cleanFault = (o.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '');
    const deliveryStr = formatPromiseDate(o.estimatedDeliveryDate);
    const deviceType = o.deviceType === 'Phone' ? 'CELULAR' : (o.deviceType || '').toUpperCase();
    const modelNumberRow = o.deviceModelNumber
      ? `<div class="row"><span class="lbl">No. Modelo:</span><span class="val">${o.deviceModelNumber}</span></div>`
      : '';
    const patNodes = parsePatternNodes(o.devicePin || '');
    let accessHtml = '';
    if (patNodes) {
      accessHtml = '<div class="field-label">Acceso:</div><div style="margin:2px 0 3px 0">' + buildPatternSvgHtml(patNodes) + '</div>';
    } else if (o.devicePin && o.devicePin !== 'SIN CLAVE') {
      accessHtml = `<div class="row"><span class="lbl">Acceso:</span><span class="val bold">${o.devicePin}</span></div>`;
    }

    const idx = orders.indexOf(o) + 1;
    return (
      `<div style="margin:8px 0;border:2px solid #000;border-radius:2px;overflow:hidden">` +
        // Encabezado del bloque
        `<div style="background:#000;color:#fff;font-weight:900;font-size:${fsSm}px;padding:2px 5px;display:flex;justify-content:space-between;letter-spacing:0.5px">` +
          `<span>EQUIPO ${idx} / ${orders.length}</span><span>${o.id}</span>` +
        `</div>` +
        // Cuerpo del bloque
        `<div style="padding:4px 5px">` +
          `<div class="row"><span class="lbl">Marca:</span><span class="val">${o.deviceBrand}</span></div>` +
          `<div class="row"><span class="lbl">Modelo:</span><span class="val">${o.deviceModel}</span></div>` +
          modelNumberRow +
          `<div class="row"><span class="lbl">Tipo:</span><span class="val">${deviceType}</span></div>` +
          (o.assignedTechnician ? `<div class="row"><span class="lbl">Técnico:</span><span class="val">${o.assignedTechnician}</span></div>` : '') +
          accessHtml +
          (o.receivedAccessories && o.receivedAccessories.length > 0 ? `<div class="row"><span class="lbl">Accesorios:</span><span class="val bold">${o.receivedAccessories.join(', ')}</span></div>` : '') +
          `<div style="border-top:1px solid #000;margin:4px 0"></div>` +
          // Servicio
          `<div style="font-weight:900;font-size:${fsSm}px;text-decoration:underline;text-align:center;margin-bottom:3px">SERVICIO</div>` +
          (() => {
            // Migración retroactiva: convierte formato antiguo "SVC A Y SVC B" en multilínea
            const effectiveSvcType = (o.serviceType && !o.serviceType.includes('\n') && o.serviceType.includes(' Y '))
              ? o.serviceType.split(' Y ').join('\n')
              : (o.serviceType || '');
            if (effectiveSvcType.includes('\n') || effectiveSvcType.includes(' - ')) {
              const lines = effectiveSvcType.split('\n');
              let html = `<div style="width:100%;font-size:${fsMd}px;line-height:1.4;margin-bottom:2px">`;
              lines.forEach((line, index) => {
                const sepIdx = line.lastIndexOf(' - ');
                const borderStyle = index < lines.length - 1 ? 'border-bottom:1px dashed #bbb;padding-bottom:3px;margin-bottom:3px;' : '';
                if (sepIdx !== -1) {
                  const name = line.substring(0, sepIdx);
                  const price = line.substring(sepIdx + 3);
                  html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4px;${borderStyle}"><span style="flex:1;font-weight:700;overflow-wrap:break-word;word-break:break-word">${name}</span><span style="white-space:nowrap;font-weight:900;flex-shrink:0">${price}</span></div>`;
                } else {
                  html += `<div style="${borderStyle}font-weight:700">${line}</div>`;
                }
              });
              if (lines.length > 1) {
                html += `<div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1.5px solid #000;margin-top:3px;padding-top:2px"><span style="font-weight:700;font-size:${fsSm}px">TOTAL</span><span style="white-space:nowrap;font-weight:900">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
              }
              html += '</div>';
              return html;
            }
            return `<div class="row bold" style="font-size:${fsMd}px"><span>${o.serviceType || cleanFault}</span><span style="white-space:nowrap">${sym}${o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
          })() +
          (cleanFault && o.serviceType && cleanFault !== o.serviceType && !o.serviceType.includes('\n') ? `<div style="font-size:${fsSm}px;color:#000;margin-top:1px">${cleanFault}</div>` : '') +
          `<div style="border-top:1px dashed #000;margin:3px 0"></div>` +
          `<div class="row"><span class="lbl">Promesa:</span><span class="val">${deliveryStr}</span></div>` +
        `</div>` +
      `</div>`
    );
  }).join('');

  const policiesHtml = policies
    ? '<hr class="sep"><div class="section-title">TÉRMINOS Y CONDICIONES</div><div class="policies-text">' + policies + '</div>'
    : '<hr class="sep">';

  const isStarTsp100 = config.selectedPrinterProfileId === 'star-tsp100';
  const effectivePaperSize = isStarTsp100 ? '72mm' : paperWidth;
  const offset_consolidated = config.ticketMarginOffset || 0;
  const is58_consolidated = paperWidth === '58mm';
  const rightPad_consolidated = isStarTsp100 ? '1mm' : (is58_consolidated ? '4mm' : '6mm');
  const leftPad_consolidated = isStarTsp100 ? '1mm' : (is58_consolidated ? '4mm' : '5mm');
  const bottomPad_consolidated = is58_consolidated ? '2mm' : '4mm';

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>' +
    `@page { size: ${effectivePaperSize} auto; margin: 0; }` +
    '* { box-sizing:border-box; margin:0; padding:0; }' +
    `body { font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:${fs}px; font-weight:700; width:100%; padding:0 calc(${rightPad_consolidated} - ${offset_consolidated}px) ${bottomPad_consolidated} calc(${leftPad_consolidated} + ${offset_consolidated}px); color:#000; background:#fff; overflow-x:hidden; overflow-wrap:break-word; word-break:break-word; }` +
    '.sep { border:none; border-top:1.5px dashed #000; margin:4px 0; }' +
    `.section-badge { display:block; font-weight:900; text-align:center; font-size:${paperWidth === '58mm' ? '10' : '11'}px; background:#000; color:#fff; padding:5px 0; margin:3px 0; letter-spacing:1px; line-height:1.25; height:auto; }` +
    `.section-title { font-weight:900; text-align:center; font-size:${paperWidth === '58mm' ? '10' : '10'}px; margin:3px 0 2px 0; text-decoration:underline; }` +
    `.row { display:flex; flex-wrap:wrap; justify-content:space-between; font-size:${paperWidth === '58mm' ? '11' : '12'}px; margin:2px 0; line-height:1.3; }` +
    '.lbl { font-weight:700; white-space:nowrap; margin-right:4px; }' +
    '.val { text-align:right; flex:1; min-width:0; word-break:break-word; }' +
    '.bold { font-weight:900; }' +
    `.field-label { font-weight:700; font-size:${fsSm}px; margin-top:2px; }` +
    `.total-line { display:flex; justify-content:space-between; align-items:center; font-size:${paperWidth === '58mm' ? '13' : '15'}px; font-weight:900; margin-top:6px; padding:7px 5px; background:#000; color:#fff; letter-spacing:0.5px; line-height:1.25; height:auto; }` +
    `.policies-text { font-size:${paperWidth === '58mm' ? '8px' : '9px'}; color:#000; line-height:1.35; margin:2px 0; }` +
    `.footer-text { font-size:${paperWidth === '58mm' ? '8.5' : '9.5'}px; text-align:center; font-weight:700; margin:2px 0; }` +
    '</style></head><body>' +
    buildTicketHeaderHtml(config, paperWidth as any) +
    '<hr class="sep">' +
    (promoTop ? promoTop + '<hr class="sep">' : '') +
    `<div class="section-badge">RECEPCIÓN MÚLTIPLE · ${orders.length} EQUIPOS</div>` +
    `<div class="row"><span class="lbl">Fecha:</span><span class="val">${dateStr}</span></div>` +
    '<hr class="sep">' +
    '<div class="section-title">CLIENTE</div>' +
    `<div class="row"><span class="lbl">Nom:</span><span class="val bold">${first.customerName.toUpperCase()}</span></div>` +
    `<div class="row"><span class="lbl">Tel:</span><span class="val">${customerPhone}</span></div>` +
    equiposHtml +
    '<hr class="sep" style="border-top:2px solid #000;margin:8px 0 4px 0">' +
    `<div class="total-line"><span>TOTAL CARGO:</span><span>${sym}${totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` +
    (totalAnticipo > 0
      ? `<div class="row"><span class="lbl">Total anticipo:</span><span class="val">-${sym}${totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
          combinedBreakdown.length === 1 ? ' (' + combinedBreakdown[0].method + ')' : ''
        }</span></div>` +
        (combinedBreakdown.length > 1
          ? combinedBreakdown.map(b =>
              `<div class="row" style="font-size:10px;color:#000;padding-left:10px"><span class="lbl">↳ ${b.method}:</span><span class="val">${sym}${b.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
            ).join('')
          : '') +
        `<div class="total-line" style="font-size:${fs}px"><span>SALDO TOTAL:</span><span>${totalResta > 0 ? sym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'LIQUIDADO ✓'}</span></div>`
      : '') +
    policiesHtml +
    signatureHtml +
    (barcodeHtml ? '<hr class="sep">' + barcodeHtml : '') +
    '<hr class="sep">' +
    buildTicketFooterBlock(config, paperWidth as any) +
    (promoBottom ? promoBottom + '<hr class="sep">' : '') +
    `<div class="footer-text">${footer}</div>` +
    '</body></html>';
}

export function buildMediaCartaConsolidatedTicketHtml(orders: RepairOrder[], config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  let policiesFontSize = '7.5px';
  if (policies && policies.length > 500) {
    policiesFontSize = '5.5px';
  } else if (policies && policies.length > 300) {
    policiesFontSize = '6.2px';
  } else if (policies && policies.length > 150) {
    policiesFontSize = '7.2px';
  } else {
    policiesFontSize = '8px';
  }

  const first = orders[0];
  const batchId = first?.batchId || first?.id || '';
  const now = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = now.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(now.getDate())}/${_pad(now.getMonth()+1)}/${now.getFullYear()} ${_h12}:${_pad(now.getMinutes())}${_ampm}`;

  const rawNotes = orders[0]?.ticketNote !== undefined ? orders[0]?.ticketNote : (orders[0]?.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(orders[0]?.showNotesOnLabel && rawNotes && !isDefaultNote);

  let rawConsNote = rawNotes.trim();
  if (rawConsNote && /^soluci[oó]n propuesta/i.test(rawConsNote)) {
    rawConsNote = rawConsNote.replace(/^soluci[oó]n propuesta:?\s*/i, 'Solución propuesta:\n');
  }
  const formattedConsNoteHtml = rawConsNote.replace(/\n/g, '<br/>');

  const customerPhone = formatCustomerPhoneWithCountryCode(first?.customerPhone, first?.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const totalCargo = orders.reduce((s, o) => s + o.cost, 0);
  const totalAnticipo = first?.batchAdvancePayment ?? orders.reduce((s, o) => s + o.advancePayment, 0);
  const totalResta = Math.max(0, totalCargo - totalAnticipo);

  // Combine breakdowns from all orders in the batch
  const combinedBreakdown: { method: string; amount: number }[] = [];
  orders.forEach(o => {
    if (o.advancePaymentBreakdown) {
      o.advancePaymentBreakdown.forEach(b => {
        const existing = combinedBreakdown.find(x => x.method === b.method);
        if (existing) {
          existing.amount += b.amount;
        } else {
          combinedBreakdown.push({ ...b });
        }
      });
    } else if (o.advancePayment > 0) {
      const defaultMethod = 'Efectivo';
      const existing = combinedBreakdown.find(x => x.method === defaultMethod);
      if (existing) {
        existing.amount += o.advancePayment;
      } else {
        combinedBreakdown.push({ method: defaultMethod, amount: o.advancePayment });
      }
    }
  });

  if (combinedBreakdown.length === 0 && totalAnticipo > 0) {
    combinedBreakdown.push({ method: 'Efectivo', amount: totalAnticipo });
  }

  let itemsHtml = '';
  orders.forEach((o, idx) => {
    const cleanFault = (o.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();
    const patNodes = parsePatternNodes(o.devicePin || '');
    const pinDisplay = patNodes ? '[PATRÓN]' : (o.devicePin || '(NINGUNO)');
    const details = [
      o.deviceBrand + ' ' + o.deviceModel,
      o.deviceModelNumber ? 'Mod: ' + o.deviceModelNumber : '',
      o.receivedAccessories && o.receivedAccessories.length > 0 ? 'Acc: ' + o.receivedAccessories.join(', ') : '',
      'Acceso: ' + pinDisplay
    ].filter(Boolean).join(' | ');

    itemsHtml += '<tr>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1; font-weight: 700; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700;">' + o.id + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">' + details.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700; text-transform: uppercase;">' + o.serviceType + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">FALLA: ' + cleanFault.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 900; font-size: 10.5px;">' + currSym + o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
  });

  const code128Script = getBarcodeScript(batchId, config.barcodeAsImage, config.showBarcodeOnTicket);

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 134mm; max-height: 134mm; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; }' +
    '.items-table td { padding: 3px 5px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 3px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-size: 7.5px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' +
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '4px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" id="bc" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 6px; flex-shrink: 0;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Recepción</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio Grupo:</span><span class="data-value">#' + batchId + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Cant. Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + first.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="width: 8%; text-align: center;">No.</th>' +
    '          <th style="width: 42%; text-align: left; padding: 4px 6px;">Equipo / Identificación / Acceso</th>' +
    '          <th style="width: 38%; text-align: left; padding: 4px 6px;">Servicio & Falla</th>' +
    '          <th style="width: 12%; text-align: right; padding: 4px 6px;">Costo</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' +
    itemsHtml +
    '      </tbody>' +
    '    </table>' +
    (config.mediaCartaFrontTerms
      ? '    <div style="display: flex; gap: 8px; justify-content: space-between; flex: 1; min-height: 0; overflow: hidden; margin-top: 2px; margin-bottom: 2px;">' +
        '      <div style="width: 55%; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 5px; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 3px; letter-spacing: 0.5px; flex-shrink: 0;">TÉRMINOS Y CONDICIONES</div>' +
        '          <div style="font-size: ' + policiesFontSize + '; line-height: 1.25; color: #334155; font-weight: 600; overflow-y: auto; flex: 1; word-break: break-word;">' + (policies || 'Sin términos configurados.') + '</div>' +
        '        </div>' +
        '      </div>' +
        '      <div style="width: 45%; display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 4px 6px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 10mm;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 3px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES</div>' +
        (showCustomNotes
          ? '          <div style="font-size: 8px; line-height: 1.25; color: #000; font-weight: 600; white-space: pre-wrap; word-break: break-word; text-align: left; flex: 1; overflow: hidden;">' + formattedConsNoteHtml + '</div>'
          : '          <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0; min-height: 0;">' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '          </div>') +
        '        </div>' +
        '        <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px; border: 1.5px solid #000; border-radius: 4px; background: #fafaf9;">' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Total de Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (combinedBreakdown.length > 0 ?
        '          <div style="font-size: 7.5px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + combinedBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '          <div class="total-row grand-total" style="font-size: 10px; padding: 2.5px; display: flex; justify-content: space-between; background: #000; color: #fff; border-radius: 2px; font-weight: 900;"><span>SALDO RESTANTE:</span><span>' + currSym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0; margin-top: 2px;">' +
        '    <table class="signatures-table" style="width: 100%; margin-top: 2px; margin-bottom: 0;">' +
        '      <tr>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 16px;"></div><div class="signature-line" style="font-size: 7.5px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-weight: 700; text-transform: uppercase;">Firma del Cliente</div></td>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 16px;"></div><div class="signature-line" style="font-size: 7.5px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-weight: 700; text-transform: uppercase;">Firma Autorizada del Taller</div></td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>'
      : '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 0; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 20mm;">' +
        '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
        (showCustomNotes
          ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; word-break: break-word; text-align: left; flex: 1; overflow: hidden;">' + formattedConsNoteHtml + '</div>'
          : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '      </div>') +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0;">' +
        '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
        '      <tr>' +
        '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
        '          <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">' +
        '            <tr>' +
        '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
        '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
        '            </tr>' +
        '          </table>' +
        '        </td>' +
        '        <td style="width: 45%; vertical-align: top;">' +
        '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">' +
        '            <div class="total-row"><span class="data-label">Total de Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (combinedBreakdown.length > 0 ?
        '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + combinedBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          </div>' +
        '        </td>' +
        '      </tr>' +
        '    </table>' +
        buildTicketFooterBlock(config, 'media-carta') +
        '  </div>') +
    '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildSingleDuplexMediaCartaConsolidatedTicketHtml(orders: RepairOrder[], config: WorkshopConfig, page?: 'front' | 'back'): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  const first = orders[0];
  const batchId = first?.batchId || first?.id || '';
  const now = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = now.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(now.getDate())}/${_pad(now.getMonth()+1)}/${now.getFullYear()} ${_h12}:${_pad(now.getMinutes())}${_ampm}`;

  const rawNotes = orders[0]?.ticketNote !== undefined ? orders[0]?.ticketNote : (orders[0]?.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(orders[0]?.showNotesOnLabel && rawNotes && !isDefaultNote);

  const customerPhone = formatCustomerPhoneWithCountryCode(first?.customerPhone, first?.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const totalCargo = orders.reduce((s, o) => s + o.cost, 0);
  const totalAnticipo = orders[0]?.batchAdvancePayment ?? orders.reduce((s, o) => s + o.advancePayment, 0);
  const totalResta = Math.max(0, totalCargo - totalAnticipo);

  const combinedBreakdown: { method: string; amount: number }[] = [];
  orders.forEach(o => {
    if (o.advancePaymentBreakdown) {
      o.advancePaymentBreakdown.forEach(b => {
        const existing = combinedBreakdown.find(x => x.method === b.method);
        if (existing) {
          existing.amount += b.amount;
        } else {
          combinedBreakdown.push({ ...b });
        }
      });
    } else if (o.advancePayment > 0) {
      const defaultMethod = 'Efectivo';
      const existing = combinedBreakdown.find(x => x.method === defaultMethod);
      if (existing) {
        existing.amount += o.advancePayment;
      } else {
        combinedBreakdown.push({ method: defaultMethod, amount: o.advancePayment });
      }
    }
  });

  if (combinedBreakdown.length === 0 && totalAnticipo > 0) {
    combinedBreakdown.push({ method: 'Efectivo', amount: totalAnticipo });
  }

  let itemsHtml = '';
  orders.forEach((o, idx) => {
    const cleanFault = (o.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();
    const patNodes = parsePatternNodes(o.devicePin || '');
    const pinDisplay = patNodes ? '[PATRÓN]' : (o.devicePin || '(NINGUNO)');
    const details = [
      o.deviceBrand + ' ' + o.deviceModel,
      o.deviceModelNumber ? 'Mod: ' + o.deviceModelNumber : '',
      o.receivedAccessories && o.receivedAccessories.length > 0 ? 'Acc: ' + o.receivedAccessories.join(', ') : '',
      'Acceso: ' + pinDisplay
    ].filter(Boolean).join(' | ');

    itemsHtml += '<tr>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1; font-weight: 700; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700;">' + o.id + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">' + details.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700; text-transform: uppercase;">' + o.serviceType + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">FALLA: ' + cleanFault.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 4px 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 900; font-size: 10.5px;">' + currSym + o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
  });

  const code128Script = getBarcodeScript(batchId, config.barcodeAsImage, config.showBarcodeOnTicket);

  const frontPoliciesHtml = config.printDuplexContract
    ? '          <div style="font-size: 7px; font-weight: 700; text-align: center; margin-top: 0; margin-bottom: 5px; color: #000; text-transform: uppercase; border: 1.5px solid #000; border-radius: 4px; padding: 3px; line-height: 1.2;">' +
      'LOS TÉRMINOS Y CONDICIONES DEL SERVICIO QUE SOLICITA, ESTÁN AL REVERSO DE ESTA HOJA. AL FIRMAR EL PRESENTE CONTRATO, LOS ACEPTA DE FORMA VOLUNTARIA.' +
      '</div>'
    : '';

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '4px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" id="bc" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 6px; flex-shrink: 0;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Resumen de Recepción Múltiple</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Lote/Folio:</span><span class="data-value">#' + batchId + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">' + dateStr + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Cliente:</span><span class="data-value">' + first.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="width: 8%; text-align: center;">#</th>' +
    '          <th style="width: 32%;">Orden / Disp.</th>' +
    '          <th style="width: 45%;">Servicio & Falla</th>' +
    '          <th style="width: 15%; text-align: right;">Costo</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' +
    itemsHtml +
    '      </tbody>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 0; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 20mm;">' +
    '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
    (showCustomNotes
      ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
      : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '      </div>') +
    '    </div>' +
    '  </div>' +
    '  <div style="flex-shrink: 0;">' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    frontPoliciesHtml +
    '          <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">' +
    '            <tr>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
    '            </tr>' +
    '          </table>' +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">' +
    '            <div class="total-row"><span class="data-label">Total de Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
    '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    (combinedBreakdown.length > 0 ?
    '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + combinedBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    buildTicketFooterBlock(config, 'media-carta') +
    '  </div>';

  const rawClauses = config.contractClauses !== undefined ? config.contractClauses : DEFAULT_CONTRACT_CLAUSES;
  const clausesList = rawClauses
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const clausesHtml = clausesList
    .map(clause => `<div class="clause-item">${clause}</div>`)
    .join('');

  const contractHtml = 
    '  <div class="contract-wrapper" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="contract-header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">' +
    '      <tr>' +
    '        <td style="width: 65%; font-size: 11px; font-weight: 900; text-align: left; text-transform: uppercase; line-height: 1.1;">CONTRATO DE SERVICIOS SIMPLIFICADO</td>' +
    '        <td style="width: 35%; font-size: 8px; font-weight: 700; text-align: right; color: #475569; text-transform: uppercase;">REVERSO DE LOTE #' + batchId + '</td>' +
    '      </tr>' +
    '      <tr>' +
    '        <td colspan="2" style="font-size: 7px; font-weight: 700; text-align: center; color: #000; padding: 2px 0; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.5px;">' +
    '          (Al firmar al reverso de la hoja acepta estos términos de forma tácita)' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div class="contract-clauses-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; gap: 3.5px;">' +
    clausesHtml +
    '    </div>' +
    '    <div class="contract-footer-note" style="font-size: 6px; font-weight: 700; color: #475569; text-align: center; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px;">' +
    '      LOS TÉRMINOS Y CONDICIONES DE ESTE CONTRATO ESTÁN SUJETOS A LA REGULACIÓN VIGENTE. CONSERVE ESTA COPIA COMO COMPROBANTE DE SU SERVICIO.' +
    '    </div>' +
    '  </div>';

  let bodyContent = '';
  if (page === 'front') {
    bodyContent = '<div class="print-page"><div class="invoice-container">' + innerTicketHtml + '</div></div>';
  } else if (page === 'back') {
    bodyContent = '<div class="print-page"><div class="invoice-container">' + contractHtml + '</div></div>';
  } else {
    bodyContent = 
      '<div class="print-page page-break"><div class="invoice-container">' + innerTicketHtml + '</div></div>' +
      '<div class="print-page"><div class="invoice-container">' + contractHtml + '</div></div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.print-page { width: 100%; height: 134mm; max-height: 134mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
    '.page-break { page-break-after: always; break-after: page; }' +
    '.invoice-container { width: 100%; height: 134mm; max-height: 134mm; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 3px 5px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 3px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-size: 7.5px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '.contract-wrapper { width: 100%; height: 134mm; max-height: 134mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; box-sizing: border-box; }' +
    '.contract-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; flex-shrink: 0; }' +
    '.contract-clauses-container { flex: 1; overflow: hidden; font-size: 10px; line-height: 1.3; color: #000; text-align: justify; word-break: break-word; overflow-wrap: break-word; }' +
    '.clause-item { margin-bottom: 3px; font-weight: 600; }' +
    '</style></head><body>' +
    bodyContent +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaTicketHtml(order: RepairOrder, config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  let policiesFontSize = '7.5px';
  if (policies && policies.length > 500) {
    policiesFontSize = '5.5px';
  } else if (policies && policies.length > 300) {
    policiesFontSize = '6.2px';
  } else if (policies && policies.length > 150) {
    policiesFontSize = '7.2px';
  } else {
    policiesFontSize = '8px';
  }

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = formatPromiseDate(order.estimatedDeliveryDate);
  const balance = Math.max(0, order.cost - order.advancePayment);
  const patternNodes = parsePatternNodes(order.devicePin || '');

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
  const pinDisplay = patternNodes ? '[PATRÓN GRÁFICO]' : (order.devicePin || '(NINGUNO)');
  const pinSvg = patternNodes ? buildPatternSvgHtml(patternNodes) : '';

  const rawNotes = order.ticketNote !== undefined ? order.ticketNote : (order.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(order.showNotesOnLabel && rawNotes && !isDefaultNote);

  let formattedMCNote = rawNotes.trim();
  if (formattedMCNote && /^soluci[oó]n propuesta/i.test(formattedMCNote)) {
    formattedMCNote = formattedMCNote.replace(/^soluci[oó]n propuesta:?\s*/i, 'Solución propuesta:\n');
  }
  const formattedMCNoteHtml = formattedMCNote.replace(/\n/g, '<br/>');

  const code128Script = getBarcodeScript(order.id, config.barcodeAsImage, config.showBarcodeOnTicket);
  const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table" style="flex-shrink: 0; margin-bottom: 2px;">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" id="bc" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 3px; flex-shrink: 0;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 4px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Orden</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#' + order.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Est. Entrega:</span><span class="data-value">' + deliveryStr + '</span></div>' +
    (order.assignedTechnician ? '              <div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">' + order.assignedTechnician + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 4px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + order.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 3px; flex-shrink: 0;">' +
    '      <div class="grid-title">Detalles del Dispositivo</div>' +
    '      <table style="width: 100%; border-collapse: collapse;">' +
    '        <tr>' +
    '          <td style="width: 50%; padding: 2px 4px; vertical-align: top; border-right: 1px solid #cbd5e1;">' +
    '            <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">' + order.deviceBrand + ' ' + order.deviceModel + '</span></div>' +
    (order.deviceModelNumber ? '            <div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">' + order.deviceModelNumber + '</span></div>' : '') +
    '            <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">' + deviceType + '</span></div>' +
    (order.receivedAccessories && order.receivedAccessories.length > 0 ?
    '            <div class="data-row" style="flex-direction: column; align-items: flex-start; border: none;"><span class="data-label" style="margin-bottom: 2px;">Accesorios:</span><span class="data-value" style="text-align: left; width: 100%;">' + order.receivedAccessories.join(', ') + '</span></div>' : '') +
    '          </td>' +
    '          <td style="width: 50%; padding: 2px 4px; vertical-align: top;">' +
    '            <div class="data-row"><span class="data-label">Bloqueo/Acceso:</span><span class="data-value">' + pinDisplay + '</span></div>' +
    (pinSvg ? '            <div style="margin-top: 3px; display: flex; justify-content: flex-end;">' + pinSvg + '</div>' : '') +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </div>' +
    '    <table class="items-table" style="flex-shrink: 0; margin-bottom: 2px;">' +
    '      <thead><tr><th style="width: 75%;">Servicio & Falla Reportada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>' +
    '      <tbody><tr>' +
    '        <td style="padding: 2px 4px;">' +
    '          <div style="font-weight: 900; font-size: 10.5px; text-transform: uppercase;">' + order.serviceType + '</div>' +
    '          <div style="margin-top: 1px; font-weight: 500; font-size: 9px; color: #334155;"><b>FALLA:</b> ' + cleanFault.toUpperCase() + '</div>' +
    (order.diagnosticsNote && !isDefaultNote && !order.showNotesOnLabel ? '          <div style="margin-top: 1px; border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 8.5px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS:</b> ' + order.diagnosticsNote + '</div>' : '') +
    '        </td>' +
    '        <td style="text-align: right; font-weight: 900; font-size: 10.5px; vertical-align: middle; padding: 2px 4px;">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
    '      </tr></tbody>' +
    '    </table>' +
    (config.mediaCartaFrontTerms
      ? '    <div style="display: flex; gap: 6px; justify-content: space-between; flex: 1; min-height: 0; overflow: hidden; margin-top: 1px; margin-bottom: 1px;">' +
        '      <div style="width: 55%; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 4px; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">TÉRMINOS Y CONDICIONES</div>' +
        '          <div style="font-size: ' + policiesFontSize + '; line-height: 1.2; color: #334155; font-weight: 600; overflow-y: auto; flex: 1; word-break: break-word;">' + (policies || 'Sin términos configurados.') + '</div>' +
        '        </div>' +
        '      </div>' +
        '      <div style="width: 45%; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 3px 5px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 8mm;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES</div>' +
        (showCustomNotes
          ? '          <div style="font-size: 8px; line-height: 1.2; color: #000; font-weight: 600; white-space: pre-wrap; word-break: break-word; text-align: left; flex: 1; overflow: hidden;">' + formattedMCNoteHtml + '</div>'
          : '          <div style="margin-top: 1px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 1px 0; min-height: 0;">' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '          </div>') +
        '        </div>' +
        '        <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 3px; border: 1.5px solid #000; border-radius: 4px; background: #fafaf9;">' +
        '          <div class="total-row" style="font-size: 8px; display: flex; justify-content: space-between;"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          <div class="total-row" style="font-size: 8px; display: flex; justify-content: space-between;"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
        '          <div style="font-size: 7px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 1px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '          <div class="total-row grand-total" style="font-size: 9.5px; padding: 2px; display: flex; justify-content: space-between; background: #000; color: #fff; border-radius: 2px; font-weight: 900;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0; margin-top: 1px;">' +
        '    <table class="signatures-table" style="width: 100%; margin-top: 1px; margin-bottom: 0;">' +
        '      <tr>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-weight: 700; text-transform: uppercase;">Firma del Cliente</div></td>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-weight: 700; text-transform: uppercase;">Firma Autorizada del Taller</div></td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>'
      : '    <div style="border: 1px solid #000; border-radius: 4px; padding: 4px; margin-top: 0; margin-bottom: 2px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 12mm;">' +
        '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
        (showCustomNotes
          ? '      <div style="font-size: 8.5px; line-height: 1.3; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + order.diagnosticsNote + '</div>'
          : '      <div style="margin-top: 1px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0; min-height: 0;">' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '      </div>') +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0;">' +
        '    <table style="width: 100%; border-collapse: collapse; margin-top: 2px; table-layout: fixed;">' +
        '      <tr>' +
        '        <td style="width: 55%; vertical-align: top; padding-right: 8px;">' +
        '          <table class="signatures-table" style="width: 100%; margin-top: 2px; margin-bottom: 0;">' +
        '            <tr>' +
        '              <td style="width: 50%;"><div style="height: 14px;"></div><div class="signature-line" style="font-size: 7px;">Firma del Cliente</div></td>' +
        '              <td style="width: 50%;"><div style="height: 14px;"></div><div class="signature-line" style="font-size: 7px;">Firma Autorizada del Taller</div></td>' +
        '            </tr>' +
        '          </table>' +
        '        </td>' +
        '        <td style="width: 45%; vertical-align: top;">' +
        '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 3px 4px;">' +
        '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
        '            <div style="font-size: 7px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 1px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '            <div class="total-row grand-total" style="font-size: 9.5px; padding: 2px;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          </div>' +
        '        </td>' +
        '      </tr>' +
        '    </table>' +
        buildTicketFooterBlock(config, 'media-carta') +
        '  </div>');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 2mm 4mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 132mm; max-height: 132mm; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 2px 4px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 2px 4px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 9px; }' +
    '.total-row.grand-total { font-size: 9.5px; font-weight: 900; background: #000; color: #fff; padding: 2px; margin-top: 1px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 1px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-size: 7px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildSingleDuplexMediaCartaTicketHtml(order: RepairOrder, config: WorkshopConfig, page?: 'front' | 'back' | 'whatsapp'): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = formatPromiseDate(order.estimatedDeliveryDate);
  const balance = Math.max(0, order.cost - order.advancePayment);
  const patternNodes = parsePatternNodes(order.devicePin || '');

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
  const pinDisplay = patternNodes ? '[PATRÓN GRÁFICO]' : (order.devicePin || '(NINGUNO)');
  const pinSvg = patternNodes ? buildPatternSvgHtml(patternNodes) : '';

  const rawNotes = order.ticketNote !== undefined ? order.ticketNote : (order.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(order.showNotesOnLabel && rawNotes && !isDefaultNote);

  const code128Script = getBarcodeScript(order.id, config.barcodeAsImage, config.showBarcodeOnTicket);
  const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

  const frontPoliciesHtml = config.printDuplexContract
    ? '          <div style="font-size: 7px; font-weight: 700; text-align: center; margin-top: 0; margin-bottom: 5px; color: #000; text-transform: uppercase; border: 1.5px solid #000; border-radius: 4px; padding: 3px; line-height: 1.2;">' +
      'LOS TÉRMINOS Y CONDICIONES DEL SERVICIO QUE SOLICITA, ESTÁN AL REVERSO DE ESTA HOJA. AL FIRMAR EL PRESENTE CONTRATO, LOS ACEPTA DE FORMA VOLUNTARIA.' +
      '</div>'
    : '';

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '4px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" id="bc" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 6px; flex-shrink: 0;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Orden</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#' + order.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Est. Entrega:</span><span class="data-value">' + deliveryStr + '</span></div>' +
    (order.assignedTechnician ? '              <div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">' + order.assignedTechnician + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + order.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 6px; flex-shrink: 0;">' +
    '      <div class="grid-title">Detalles del Dispositivo</div>' +
    '      <table style="width: 100%; border-collapse: collapse;">' +
    '        <tr>' +
    '          <td style="width: 50%; padding: 4px 6px; vertical-align: top; border-right: 1px solid #cbd5e1;">' +
    '            <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">' + order.deviceBrand + ' ' + order.deviceModel + '</span></div>' +
    (order.deviceModelNumber ? '            <div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">' + order.deviceModelNumber + '</span></div>' : '') +
    '            <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">' + deviceType + '</span></div>' +
    (order.receivedAccessories && order.receivedAccessories.length > 0 ?
    '            <div class="data-row" style="flex-direction: column; align-items: flex-start; border: none;"><span class="data-label" style="margin-bottom: 2px;">Accesorios:</span><span class="data-value" style="text-align: left; width: 100%;">' + order.receivedAccessories.join(', ') + '</span></div>' : '') +
    '          </td>' +
    '          <td style="width: 50%; padding: 4px 6px; vertical-align: top;">' +
    '            <div class="data-row"><span class="data-label">Bloqueo/Acceso:</span><span class="data-value">' + pinDisplay + '</span></div>' +
    (pinSvg ? '            <div style="margin-top: 4px; display: flex; justify-content: flex-end;">' + pinSvg + '</div>' : '') +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </div>' +
    '    <table class="items-table" style="flex-shrink: 0; margin-bottom: 4px;">' +
    '      <thead><tr><th style="width: 75%;">Servicio & Falla Reportada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>' +
    '      <tbody><tr>' +
    '        <td style="padding: 4px 6px;">' +
    '          <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">' + order.serviceType + '</div>' +
    '          <div style="margin-top: 2px; font-weight: 500; font-size: 9.5px; color: #334155;"><b>FALLA:</b> ' + cleanFault.toUpperCase() + '</div>' +
    (order.diagnosticsNote && !isDefaultNote && !order.showNotesOnLabel ? '          <div style="margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px; font-size: 9px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS:</b> ' + order.diagnosticsNote + '</div>' : '') +
    '        </td>' +
    '        <td style="text-align: right; font-weight: 900; font-size: 11px; vertical-align: middle; padding: 4px 6px;">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
    '      </tr></tbody>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 0; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 20mm;">' +
    '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
    (showCustomNotes
      ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
      : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '      </div>') +
    '    </div>' +
    '  </div>' +
    '  <div style="flex-shrink: 0;">' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    frontPoliciesHtml +
    '          <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">' +
    '            <tr>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
    '            </tr>' +
    '          </table>' +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">' +
    '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
    '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    buildTicketFooterBlock(config, 'media-carta') +
    '  </div>';

  const rawClauses = config.contractClauses !== undefined ? config.contractClauses : DEFAULT_CONTRACT_CLAUSES;
  const clausesList = rawClauses
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const clausesHtml = clausesList
    .map(clause => `<div class="clause-item">${clause}</div>`)
    .join('');

  const contractHtml = 
    '  <div class="contract-wrapper" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="contract-header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">' +
    '      <tr>' +
    '        <td style="width: 65%; font-size: 11px; font-weight: 900; text-align: left; text-transform: uppercase; line-height: 1.1;">CONTRATO DE SERVICIOS SIMPLIFICADO</td>' +
    '        <td style="width: 35%; font-size: 8px; font-weight: 700; text-align: right; color: #475569; text-transform: uppercase;">REVERSO DE NOTA #' + order.id + '</td>' +
    '      </tr>' +
    '      <tr>' +
    '        <td colspan="2" style="font-size: 7px; font-weight: 700; text-align: center; color: #000; padding: 2px 0; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.5px;">' +
    '          (Al firmar al reverso de la hoja acepta estos términos de forma tácita)' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div class="contract-clauses-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; gap: 3.5px;">' +
    clausesHtml +
    '    </div>' +
    '    <div class="contract-footer-note" style="font-size: 6px; font-weight: 700; color: #475569; text-align: center; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px;">' +
    '      LOS TÉRMINOS Y CONDICIONES DE ESTE CONTRATO ESTÁN SUJETOS A LA REGULACIÓN VIGENTE. CONSERVE ESTA COPIA COMO COMPROBANTE DE SU SERVICIO.' +
    '    </div>' +
    '  </div>';

  let bodyContent = '';
  if (page === 'front') {
    bodyContent = '<div class="print-page"><div class="invoice-container">' + innerTicketHtml + '</div></div>';
  } else if (page === 'back') {
    bodyContent = '<div class="print-page"><div class="invoice-container">' + contractHtml + '</div></div>';
  } else if (page === 'whatsapp') {
    if (config.printDuplexContract !== false) {
      bodyContent = 
        '<div class="print-page">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '  <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>' +
        '  <div class="invoice-container">' + contractHtml + '</div>' +
        '</div>';
    } else {
      bodyContent = 
        '<div class="print-page" style="height: 134mm; max-height: 134mm;">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '</div>';
    }
  } else {
    bodyContent = 
      '<div class="print-page page-break"><div class="invoice-container">' + innerTicketHtml + '</div></div>' +
      '<div class="print-page"><div class="invoice-container">' + contractHtml + '</div></div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.print-page { width: 100%; height: 134mm; max-height: 134mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
    '.page-break { page-break-after: always; break-after: page; }' +
    '.invoice-container { width: 100%; height: 134mm; max-height: 134mm; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 3px 5px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 3px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-size: 7.5px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '.contract-wrapper { width: 100%; height: 134mm; max-height: 134mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; box-sizing: border-box; }' +
    '.contract-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; flex-shrink: 0; }' +
    '.contract-clauses-container { flex: 1; overflow: hidden; font-size: 10px; line-height: 1.3; color: #000; text-align: justify; word-break: break-word; overflow-wrap: break-word; }' +
    '.clause-item { margin-bottom: 3px; font-weight: 600; }' +
    '</style></head><body>' +
    bodyContent +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaPosTicketHtml(
  sale: {
    id: string;
    items: { description: string; quantity: number; price: number; fromWarehouseId?: string }[];
    total: number;
    createdAt: string;
    paymentMethod?: string;
    cashReceived?: number;
    cardReceived?: number;
    change?: number;
    createdBy?: string;
  },
  config: WorkshopConfig,
  warehouses?: { id: string; name: string }[]
): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su compra!';
  const policies = config.termsAndConditionsPOS || config.termsAndConditions || '';

  const _d = new Date(sale.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '75mm';
          img.style.maxHeight = '28mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '42mm';
          img.style.maxHeight = '24mm';
        }
      })(this)" style="max-height: 25mm; max-width: 55mm; object-fit: contain; display: block;" />`
    : '';

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const taxRate = config.taxRate || 0;
  const showTax = config.showTaxRate !== false && taxRate > 0;
  const subtotalBeforeTax = showTax ? (sale.total / (1 + taxRate)) : sale.total;
  const taxAmount = showTax ? (sale.total - subtotalBeforeTax) : 0;

  let itemsHtml = '';
  (sale.items || []).forEach(item => {
    const totalLine = item.quantity * item.price;
    const whName = warehouses && item.fromWarehouseId ? (warehouses.find(w => w.id === item.fromWarehouseId)?.name || 'Bodega') : (item.fromWarehouseId ? 'Bodega' : '');
    const descSuffix = whName ? ` (${whName})` : '';
    itemsHtml += '<tr>' +
      '<td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">' + item.description + descSuffix + '</td>' +
      '<td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">' + item.quantity + '</td>' +
      '<td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">' + currSym + item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '<td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900;">' + currSym + totalLine.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
  });

  const code128Script = getBarcodeScript(sale.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 216mm 140mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.35; padding: 6mm 8mm 0 8mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 9px; font-weight: 600; color: #333; margin-top: 3px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 6px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }' +
    '.total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }' +
    '.policies-box { font-size: 7px; color: #475569; line-height: 1.3; border: 1px solid #e2e8f0; padding: 4px 6px; background: #f8fafc; border-radius: 4px; margin-top: 4px; margin-bottom: 8px; word-break: break-all; overflow-wrap: break-word; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' +
    '  <div>' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '16px' : '24px') + '; margin-bottom: ' + (logoHtml ? '0' : '4px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 8px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Venta</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Ticket Folio:</span><span class="data-value">#' + sale.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">' + dateStr + '</span></div>' +
    (sale.createdBy ? '              <div class="data-row"><span class="data-label">Atendió:</span><span class="data-value">' + sale.createdBy.toUpperCase() + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Cliente:</span><span class="data-value">PÚBLICO GENERAL</span></div>' +
    (sale.paymentMethod ? '              <div class="data-row"><span class="data-label">Forma de Pago:</span><span class="data-value">' + sale.paymentMethod + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table">' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="text-align: left; padding: 4px 6px;">Artículo / Descripción</th>' +
    '          <th style="width: 15%; text-align: center; padding: 4px 6px;">Cant</th>' +
    '          <th style="width: 20%; text-align: right; padding: 4px 6px;">P. Unit</th>' +
    '          <th style="width: 20%; text-align: right; padding: 4px 6px;">Subtotal</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' +
    itemsHtml +
    '      </tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div>' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    (policies ? '          <div class="policies-box" style="margin-top: 0; margin-bottom: 0;"><b>GARANTÍAS Y POLÍTICAS:</b> ' + policies + '</div>' : '') +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">' +
    (showTax ?
    '            <div class="total-row"><span class="data-label">Subtotal:</span><span class="data-value">' + currSym + subtotalBeforeTax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '            <div class="total-row"><span class="data-label">I.V.A (' + (taxRate * 100).toFixed(0) + '%):</span><span class="data-value">' + currSym + taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>TOTAL NETO:</span><span>' + currSym + sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    (sale.cashReceived !== undefined && sale.cashReceived > 0 ?
    '            <div class="total-row" style="margin-top: 3px;"><span class="data-label">Efectivo recibido:</span><span class="data-value">' + currSym + sale.cashReceived.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    (sale.cardReceived !== undefined && sale.cardReceived > 0 ?
    '            <div class="total-row"><span class="data-label">Tarjeta/Transferencia:</span><span class="data-value">' + currSym + sale.cardReceived.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    (sale.change !== undefined && sale.change > 0 ?
    '            <div class="total-row" style="border-top: 1px dashed #ccc; padding-top: 3px; font-weight: 900;"><span class="data-label">CAMBIO:</span><span class="data-value">' + currSym + sale.change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    buildTicketFooterBlock(config, 'media-carta') +
    '  </div>' +
    '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaDuplicadoTicketHtml(order: RepairOrder, config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  let policiesFontSize = '7.5px';
  if (policies && policies.length > 500) {
    policiesFontSize = '5.5px';
  } else if (policies && policies.length > 300) {
    policiesFontSize = '6.2px';
  } else if (policies && policies.length > 150) {
    policiesFontSize = '7.2px';
  } else {
    policiesFontSize = '8px';
  }

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = formatPromiseDate(order.estimatedDeliveryDate);
  const balance = Math.max(0, order.cost - order.advancePayment);
  const patternNodes = parsePatternNodes(order.devicePin || '');

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
  const pinDisplay = patternNodes ? '[PATRÓN GRÁFICO]' : (order.devicePin || '(NINGUNO)');
  const pinSvg = patternNodes ? buildPatternSvgHtml(patternNodes) : '';

  const rawNotes = order.ticketNote !== undefined ? order.ticketNote : (order.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(order.showNotesOnLabel && rawNotes && !isDefaultNote);

  const code128Script = getBarcodeScript(order.id, config.barcodeAsImage, config.showBarcodeOnTicket);
  const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table" style="flex-shrink: 0; margin-bottom: 2px;">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 3px; flex-shrink: 0;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 4px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Orden</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#' + order.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Est. Entrega:</span><span class="data-value">' + deliveryStr + '</span></div>' +
    (order.assignedTechnician ? '              <div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">' + order.assignedTechnician + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 4px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + order.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 3px; flex-shrink: 0;">' +
    '      <div class="grid-title">Detalles del Dispositivo</div>' +
    '      <table style="width: 100%; border-collapse: collapse;">' +
    '        <tr>' +
    '          <td style="width: 50%; padding: 2px 4px; vertical-align: top; border-right: 1px solid #e2e8f0;">' +
    '            <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">' + order.deviceBrand + ' ' + order.deviceModel + '</span></div>' +
    (order.deviceModelNumber ? '            <div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">' + order.deviceModelNumber + '</span></div>' : '') +
    '            <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">' + deviceType + '</span></div>' +
    (order.receivedAccessories && order.receivedAccessories.length > 0 ?
    '            <div class="data-row" style="flex-direction: column; align-items: flex-start; border: none;"><span class="data-label" style="margin-bottom: 2px;">Accesorios:</span><span class="data-value" style="text-align: left; width: 100%;">' + order.receivedAccessories.join(', ') + '</span></div>' : '') +
    '          </td>' +
    '          <td style="width: 50%; padding: 2px 4px; vertical-align: top;">' +
    '            <div class="data-row"><span class="data-label">Bloqueo/Acceso:</span><span class="data-value">' + pinDisplay + '</span></div>' +
    (pinSvg ? '            <div style="margin-top: 3px; display: flex; justify-content: flex-end;">' + pinSvg + '</div>' : '') +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </div>' +
    '    <table class="items-table" style="flex-shrink: 0; margin-bottom: 2px;">' +
    '      <thead><tr><th style="width: 75%;">Servicio & Falla Reportada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>' +
    '      <tbody><tr>' +
    '        <td style="padding: 2px 4px;">' +
    '          <div style="font-weight: 900; font-size: 10px; text-transform: uppercase;">' + order.serviceType + '</div>' +
    '          <div style="margin-top: 1px; font-weight: 500; font-size: 8.5px; color: #334155;"><b>FALLA:</b> ' + cleanFault.toUpperCase() + '</div>' +
    (order.diagnosticsNote && !isDefaultNote && !order.showNotesOnLabel ? '          <div style="margin-top: 1px; border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 8px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS:</b> ' + order.diagnosticsNote + '</div>' : '') +
    '        </td>' +
    '        <td style="text-align: right; font-weight: 900; font-size: 10px; vertical-align: middle; padding: 2px 4px;">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
    '      </tr></tbody>' +
    '    </table>' +
    (config.mediaCartaFrontTerms
      ? '    <div style="display: flex; gap: 6px; justify-content: space-between; flex: 1; min-height: 0; overflow: hidden; margin-top: 1px; margin-bottom: 1px;">' +
        '      <div style="width: 55%; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 4px; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">TÉRMINOS Y CONDICIONES</div>' +
        '          <div style="font-size: ' + policiesFontSize + '; line-height: 1.2; color: #334155; font-weight: 600; overflow-y: auto; flex: 1; word-break: break-word;">' + (policies || 'Sin términos configurados.') + '</div>' +
        '        </div>' +
        '      </div>' +
        '      <div style="width: 45%; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 3px 5px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 8mm;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES</div>' +
        (showCustomNotes
          ? '          <div style="font-size: 8px; line-height: 1.2; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
          : '          <div style="margin-top: 1px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 1px 0; min-height: 0;">' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '          </div>') +
        '        </div>' +
        '        <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 3px; border: 1.5px solid #000; border-radius: 4px; background: #fafaf9;">' +
        '          <div class="total-row" style="font-size: 8px; display: flex; justify-content: space-between;"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          <div class="total-row" style="font-size: 8px; display: flex; justify-content: space-between;"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
        '          <div style="font-size: 7px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 1px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '          <div class="total-row grand-total" style="font-size: 9.5px; padding: 2px; display: flex; justify-content: space-between; background: #000; color: #fff; border-radius: 2px; font-weight: 900;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0; margin-top: 1px;">' +
        '    <table class="signatures-table" style="width: 100%; margin-top: 1px; margin-bottom: 0;">' +
        '      <tr>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-weight: 700; text-transform: uppercase;">Firma del Cliente</div></td>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-weight: 700; text-transform: uppercase;">Firma Autorizada del Taller</div></td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>'
      : '    <div style="border: 1px solid #000; border-radius: 4px; padding: 4px; margin-top: 0; margin-bottom: 2px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 12mm;">' +
        '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 1px; margin-bottom: 2px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
        (showCustomNotes
          ? '      <div style="font-size: 8.5px; line-height: 1.3; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
          : '      <div style="margin-top: 1px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0; min-height: 0;">' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '      </div>') +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0;">' +
        '    <table style="width: 100%; border-collapse: collapse; margin-top: 2px; table-layout: fixed;">' +
        '      <tr>' +
        '        <td style="width: 55%; vertical-align: top; padding-right: 8px;">' +
        (policies ? '          <div class="policies-box" style="margin-top: 0; margin-bottom: 3px;"><b>TÉRMINOS Y CONDICIONES:</b> ' + policies + '</div>' : '') +
        '          <table class="signatures-table" style="width: 100%; margin-top: 2px; margin-bottom: 0;">' +
        '            <tr>' +
        '              <td style="width: 50%;"><div style="height: 14px;"></div><div class="signature-line" style="font-size: 7px;">Firma del Cliente</div></td>' +
        '              <td style="width: 50%;"><div style="height: 14px;"></div><div class="signature-line" style="font-size: 7px;">Firma Autorizada del Taller</div></td>' +
        '            </tr>' +
        '          </table>' +
        '        </td>' +
        '        <td style="width: 45%; vertical-align: top;">' +
        '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 3px 4px;">' +
        '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
        '            <div style="font-size: 7px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 1px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '            <div class="total-row grand-total" style="font-size: 9.5px; padding: 2px;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          </div>' +
        '        </td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 215.9mm 279.4mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 2mm 4mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 132mm; max-height: 132mm; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 2px 4px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; }' +
    '.items-table td { padding: 2px 4px; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 9px; }' +
    '.total-row.grand-total { font-size: 9.5px; font-weight: 900; background: #000; color: #fff; padding: 2px; margin-top: 1px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 1px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1px; font-size: 7px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '.divider-line { width: 100%; height: 5mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 0.5mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaBatchIndividualTicketsHtml(orders: RepairOrder[], config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';
  const logoSrc = config.mediaCartaLogoUrl || '';

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const buildSingleDeviceInnerHtml = (order: RepairOrder): string => {
    const _d = new Date(order.createdAt);
    const _pad = (n: number) => String(n).padStart(2, '0');
    const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
    const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
    const deliveryStr = formatPromiseDate(order.estimatedDeliveryDate);
    const balance = Math.max(0, order.cost - order.advancePayment);
    const patternNodes = parsePatternNodes(order.devicePin || '');

    const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

    const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
    const pinDisplay = patternNodes ? '[PATRÓN GRÁFICO]' : (order.devicePin || '(NINGUNO)');
    const pinSvg = patternNodes ? buildPatternSvgHtml(patternNodes) : '';

    const notesText = (order.diagnosticsNote || '').trim().toUpperCase();
    const isDefaultNote = notesText === '' ||
                          notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                          notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                          notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                          notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
    const showCustomNotes = !!(order.showNotesOnLabel && order.diagnosticsNote && !isDefaultNote);

    const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

    return (
      '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
      '    <table class="header-table">' +
      '      <tr>' +
      logoTd +
      '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
      '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
      '          <div class="store-details">' +
      buildMediaCartaStoreDetailsHtml(config) +
      '          </div>' +
      '        </td>' +
      '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
      '          <div id="bc-target-' + order.id + '" style="display: inline-block; max-width: 100%;"></div>' +
      '        </td>' +
      '      </tr>' +
      '    </table>' +
      '    <table style="width: 100%; margin-bottom: 4px;">' +
      '      <tr>' +
      '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
      '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
      '            <div class="grid-title">Información de la Orden</div>' +
      '            <div class="grid-body">' +
      '              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#' + order.id + '</span></div>' +
      '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
      '              <div class="data-row"><span class="data-label">Est. Entrega:</span><span class="data-value">' + deliveryStr + '</span></div>' +
      (order.assignedTechnician ? '              <div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">' + order.assignedTechnician + '</span></div>' : '') +
      (order.createdBy ? '              <div class="data-row"><span class="data-label">Atendió:</span><span class="data-value">' + order.createdBy.toUpperCase() + '</span></div>' : '') +
      '            </div>' +
      '          </div>' +
      '        </td>' +
      '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
      '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
      '            <div class="grid-title">Datos del Cliente</div>' +
      '            <div class="grid-body">' +
      '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + order.customerName.toUpperCase() + '</span></div>' +
      '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
      '            </div>' +
      '          </div>' +
      '        </td>' +
      '      </tr>' +
      '    </table>' +
      '    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">' +
      '      <div class="grid-title">Detalles del Dispositivo</div>' +
      '      <table style="width: 100%; border-collapse: collapse;">' +
      '        <tr>' +
      '          <td style="width: 50%; padding: 4px 6px; vertical-align: top; border-right: 1px solid #e2e8f0;">' +
      '            <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">' + order.deviceBrand + ' ' + order.deviceModel + '</span></div>' +
      (order.deviceModelNumber ? '            <div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">' + order.deviceModelNumber + '</span></div>' : '') +
      '            <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">' + deviceType + '</span></div>' +
      (order.receivedAccessories && order.receivedAccessories.length > 0 ?
      '            <div class="data-row" style="flex-direction: column; align-items: flex-start; border: none;"><span class="data-label" style="margin-bottom: 2px;">Accesorios:</span><span class="data-value" style="text-align: left; width: 100%;">' + order.receivedAccessories.join(', ') + '</span></div>' : '') +
      '          </td>' +
      '          <td style="width: 50%; padding: 4px 6px; vertical-align: top;">' +
      '            <div class="data-row"><span class="data-label">Bloqueo/Acceso:</span><span class="data-value">' + pinDisplay + '</span></div>' +
      (pinSvg ? '            <div style="margin-top: 4px; display: flex; justify-content: flex-end;">' + pinSvg + '</div>' : '') +
      '          </td>' +
      '        </tr>' +
      '      </table>' +
      '    </div>' +
      '    <table class="items-table">' +
      '      <thead><tr><th style="width: 75%;">Servicio & Falla Reportada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>' +
      '      <tbody><tr>' +
      '        <td>' +
      '          <div style="font-weight: 900; font-size: 10px; text-transform: uppercase;">' + order.serviceType + '</div>' +
      '          <div style="margin-top: 2px; font-weight: 500; font-size: 8.5px; color: #334155;"><b>FALLA:</b> ' + cleanFault.toUpperCase() + '</div>' +
      (order.diagnosticsNote && !isDefaultNote && !order.showNotesOnLabel ? '          <div style="margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px; font-size: 8px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS:</b> ' + order.diagnosticsNote + '</div>' : '') +
      '        </td>' +
      '        <td style="text-align: right; font-weight: 900; font-size: 10px; vertical-align: middle;">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '      </tr></tbody>' +
      '    </table>' +
      '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 4px; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 28mm;">' +
      '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
      (showCustomNotes
        ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + order.diagnosticsNote + '</div>'
        : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
          '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
          '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
          '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
          '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
          '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
          '      </div>') +
      '    </div>' +
      '  </div>' +
      '  <div style="flex-shrink: 0;">' +
      '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
      '      <tr>' +
      '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
      (policies ? '          <div class="policies-box" style="margin-top: 0; margin-bottom: 4px;"><b>TÉRMINOS Y CONDICIONES:</b> ' + policies + '</div>' : '') +
      '          <table class="signatures-table" style="width: 100%; margin-top: 3px; margin-bottom: 0;">' +
      '            <tr>' +
      '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
      '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
      '            </tr>' +
      '          </table>' +
      '        </td>' +
      '        <td style="width: 45%; vertical-align: top;">' +
      '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px;">' +
      '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
      '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
      (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
      '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
      '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
      '          </div>' +
      '        </td>' +
      '      </tr>' +
      '    </table>' +
      '  </div>'
    );
  };

  let bodyContent = '';
  let scriptContent = '';

  for (let i = 0; i < orders.length; i += 2) {
    const o1 = orders[i];
    const o2 = orders[i + 1] || null;

    scriptContent += getBarcodeScript(o1.id, config.barcodeAsImage, config.showBarcodeOnTicket)
      .replace("document.getElementsByClassName('bc-target')", "document.querySelectorAll('#bc-target-" + o1.id + "')");

    if (o2) {
      scriptContent += getBarcodeScript(o2.id, config.barcodeAsImage, config.showBarcodeOnTicket)
        .replace("document.getElementsByClassName('bc-target')", "document.querySelectorAll('#bc-target-" + o2.id + "')");
    }

    bodyContent += '<div class="page-container">';
    bodyContent += '  <div class="invoice-container">' + buildSingleDeviceInnerHtml(o1) + '</div>';
    bodyContent += '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTAR AQUÍ (EQUIPOS INDIVIDUALES) ✂️</div></div>';
    
    if (o2) {
      bodyContent += '  <div class="invoice-container">' + buildSingleDeviceInnerHtml(o2) + '</div>';
    } else {
      bodyContent += '  <div class="invoice-container" style="visibility: hidden; height: 130mm; max-height: 130mm;"></div>';
    }
    
    bodyContent += '</div>';

    if (i + 2 < orders.length) {
      bodyContent += '<div class="page-break"></div>';
    }
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 215.9mm 279.4mm; margin: 0; }' + // Tamaño carta
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; margin: 0; padding: 0; }' +
    '.page-container { width: 100%; height: 279.4mm; max-height: 279.4mm; padding: 3mm 5mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
    '.invoice-container { width: 100%; height: 130mm; max-height: 130mm; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; }' +
    '.items-table td { padding: 3px 5px; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 3px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-size: 7.5px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '.divider-line { width: 100%; height: 6mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 1mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '.page-break { page-break-after: always; }' +
    '</style></head><body>' +
    bodyContent +
    '<script>' + scriptContent + '</script></body></html>';
}

export const DEFAULT_CONTRACT_CLAUSES = '';

export function buildDuplexMediaCartaTicketHtml(order: RepairOrder, config: WorkshopConfig, page?: 'front' | 'back' | 'whatsapp'): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  const _d = new Date(order.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  const deliveryStr = formatPromiseDate(order.estimatedDeliveryDate);
  const balance = Math.max(0, order.cost - order.advancePayment);
  const patternNodes = parsePatternNodes(order.devicePin || '');

  const customerPhone = formatCustomerPhoneWithCountryCode(order.customerPhone, order.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const deviceType = order.deviceType === 'Phone' ? 'CELULAR' : (order.deviceType || '').toUpperCase();
  const pinDisplay = patternNodes ? '[PATRÓN GRÁFICO]' : (order.devicePin || '(NINGUNO)');
  const pinSvg = patternNodes ? buildPatternSvgHtml(patternNodes) : '';

  const notesText = (order.diagnosticsNote || '').trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(order.showNotesOnLabel && order.diagnosticsNote && !isDefaultNote);

  const code128Script = getBarcodeScript(order.id, config.barcodeAsImage, config.showBarcodeOnTicket);
  const cleanFault = (order.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();

  const frontPoliciesHtml = 
    '<div style="font-size: 7.5px; font-weight: 700; text-align: center; margin-top: 6px; margin-bottom: 2px; color: #000; text-transform: uppercase; border: 1.5px solid #000; border-radius: 4px; padding: 5px; line-height: 1.3;">' +
    'LOS TÉRMINOS Y CONDICIONES DEL SERVICIO QUE SOLICITA, ESTÁN AL REVERSO DE ESTA HOJA. AL FIRMAR EL PRESENTE CONTRATO, LOS ACEPTA DE FORMA VOLUNTARIA.' +
    '</div>';

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 4px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Orden</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Orden:</span><span class="data-value">#' + order.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Est. Entrega:</span><span class="data-value">' + deliveryStr + '</span></div>' +
    (order.assignedTechnician ? '              <div class="data-row"><span class="data-label">Técnico:</span><span class="data-value">' + order.assignedTechnician + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + order.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">' +
    '      <div class="grid-title">Detalles del Dispositivo</div>' +
    '      <table style="width: 100%; border-collapse: collapse;">' +
    '        <tr>' +
    '          <td style="width: 50%; padding: 4px 6px; vertical-align: top; border-right: 1px solid #e2e8f0;">' +
    '            <div class="data-row"><span class="data-label">Marca / Modelo:</span><span class="data-value">' + order.deviceBrand + ' ' + order.deviceModel + '</span></div>' +
    (order.deviceModelNumber ? '            <div class="data-row"><span class="data-label">Modelo Técnico:</span><span class="data-value">' + order.deviceModelNumber + '</span></div>' : '') +
    '            <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">' + deviceType + '</span></div>' +
    (order.receivedAccessories && order.receivedAccessories.length > 0 ?
    '            <div class="data-row" style="flex-direction: column; align-items: flex-start; border: none;"><span class="data-label" style="margin-bottom: 2px;">Accesorios:</span><span class="data-value" style="text-align: left; width: 100%;">' + order.receivedAccessories.join(', ') + '</span></div>' : '') +
    '          </td>' +
    '          <td style="width: 50%; padding: 4px 6px; vertical-align: top;">' +
    '            <div class="data-row"><span class="data-label">Bloqueo/Acceso:</span><span class="data-value">' + pinDisplay + '</span></div>' +
    (pinSvg ? '            <div style="margin-top: 4px; display: flex; justify-content: flex-end;">' + pinSvg + '</div>' : '') +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </div>' +
    '    <table class="items-table">' +
    '      <thead><tr><th style="width: 75%;">Servicio & Falla Reportada</th><th style="width: 25%; text-align: right;">Costo</th></tr></thead>' +
    '      <tbody><tr>' +
    '        <td>' +
    '          <div style="font-weight: 900; font-size: 10px; text-transform: uppercase;">' + order.serviceType + '</div>' +
    '          <div style="margin-top: 2px; font-weight: 500; font-size: 8.5px; color: #334155;"><b>FALLA:</b> ' + cleanFault.toUpperCase() + '</div>' +
    (order.diagnosticsNote && !isDefaultNote && !order.showNotesOnLabel ? '          <div style="margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px; font-size: 8px; font-weight: 500; color: #475569;"><b>NOTAS TÉCNICAS:</b> ' + order.diagnosticsNote + '</div>' : '') +
    '        </td>' +
    '        <td style="text-align: right; font-weight: 900; font-size: 10px; vertical-align: middle;">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
    '      </tr></tbody>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 4px; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 28mm;">' +
    '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
    (showCustomNotes
      ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + order.diagnosticsNote + '</div>'
      : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '      </div>') +
    '    </div>' +
    '  </div>' +
    '  <div style="flex-shrink: 0;">' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    frontPoliciesHtml +
    '          <table class="signatures-table" style="width: 100%; margin-top: 3px; margin-bottom: 0;">' +
    '            <tr>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
    '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
    '            </tr>' +
    '          </table>' +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px;">' +
    '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + order.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + order.advancePayment.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    (order.advancePaymentBreakdown && order.advancePaymentBreakdown.length > 0 ?
    '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + order.advancePaymentBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '  </div>';

  const rawClauses = config.contractClauses !== undefined ? config.contractClauses : DEFAULT_CONTRACT_CLAUSES;
  const clausesList = rawClauses
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const clausesHtml = clausesList
    .map(clause => `<div class="clause-item">${clause}</div>`)
    .join('');

  const contractHtml = 
    '  <div class="contract-wrapper">' +
    '    <table class="contract-header-table">' +
    '      <tr>' +
    '        <td style="width: 65%; font-size: 11.5px; font-weight: 900; text-align: left; text-transform: uppercase; line-height: 1.1;">CONTRATO DE SERVICIOS SIMPLIFICADO</td>' +
    '        <td style="width: 35%; font-size: 8px; font-weight: 700; text-align: right; color: #475569; text-transform: uppercase;">REVERSO DE NOTA #' + order.id + '</td>' +
    '      </tr>' +
    '      <tr>' +
    '        <td colspan="2" style="font-size: 7px; font-weight: 700; text-align: center; color: #000; padding: 2px 0; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.5px;">' +
    '          (Al firmar al reverso de la hoja acepta estos términos de forma tácita)' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <div class="contract-clauses-container">' +
    clausesHtml +
    '    </div>' +
    '    <div class="contract-footer-note">' +
    '      LOS TÉRMINOS Y CONDICIONES DE ESTE CONTRATO ESTÁN SUJETOS A LA REGULACIÓN VIGENTE. CONSERVE ESTA COPIA COMO COMPROBANTE DE SU SERVICIO.' +
    '    </div>' +
    '  </div>';

  let bodyContent = '';
  if (page === 'front') {
    bodyContent = 
      '<div class="print-page">' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '</div>';
  } else if (page === 'back') {
    bodyContent = 
      '<div class="print-page">' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ AL REVERSO DEL TICKET ✂️</div></div>' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '</div>';
  } else if (page === 'whatsapp') {
    if (config.printDuplexContract !== false) {
      bodyContent = 
        '<div class="print-page">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">📜 TÉRMINOS Y CONDICIONES DEL SERVICIO 📜</div></div>' +
        '  <div class="invoice-container">' + contractHtml + '</div>' +
        '</div>';
    } else {
      bodyContent = 
        '<div class="print-page" style="height: 141mm; max-height: 141mm;">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '</div>';
    }
  } else {
    bodyContent = 
      '<div class="print-page page-break">' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '</div>' +
      '<div class="print-page">' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ AL REVERSO DEL TICKET ✂️</div></div>' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '</div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 210mm 297mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.print-page { width: 100%; height: 291mm; max-height: 291mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
    '.page-break { page-break-after: always; break-after: page; }' +
    '.invoice-container { width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 3px 5px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.signatures-table { width: 100%; margin-top: 3px; margin-bottom: 0;' + (config.hideTicketSignature ? ' display: none !important;' : '') + ' }' +
    '.signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-size: 7.5px; font-weight: 700; text-align: center; text-transform: uppercase; }' +
    '.divider-line { width: 100%; height: 6mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 1mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '.contract-wrapper { width: 100%; height: 141mm; max-height: 141mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; box-sizing: border-box; }' +
    '.contract-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; flex-shrink: 0; }' +
    '.contract-clauses-container { flex: 1; overflow: hidden; font-size: 10px; line-height: 1.3; color: #000; text-align: justify; word-break: break-word; overflow-wrap: break-word; }' +
    '.clause-item { margin-bottom: 3px; font-weight: 600; }' +
    '.contract-footer-note { font-size: 6px; font-weight: 700; text-align: center; color: #475569; border-top: 1px dashed #94a3b8; padding-top: 3px; margin-top: 3px; text-transform: uppercase; flex-shrink: 0; }' +
    '</style></head><body>' +
    bodyContent +
    '<script>' + code128Script + '</script>' +
    `<script>(function(){
  var wrappers = document.querySelectorAll('.contract-wrapper');
  wrappers.forEach(function(wrapper) {
    var clausesEl = wrapper.querySelector('.contract-clauses-container');
    if (!clausesEl) return;
    var fs = 10.0;
    var minFs = 6.0;
    while (wrapper.scrollHeight > wrapper.clientHeight && fs > minFs) {
      fs = Math.round((fs - 0.2) * 10) / 10;
      clausesEl.style.fontSize = fs + 'px';
    }
  });
})();</script>` +
    '</body></html>';
}

export function buildMediaCartaDuplicadoPosTicketHtml(
  sale: {
    id: string;
    items: { description: string; quantity: number; price: number; fromWarehouseId?: string }[];
    total: number;
    createdAt: string;
    paymentMethod?: string;
    cashReceived?: number;
    cardReceived?: number;
    change?: number;
  },
  config: WorkshopConfig,
  warehouses?: { id: string; name: string }[]
): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterPOS || config.ticketFooter || '¡Gracias por su compra!';
  const policies = config.termsAndConditionsPOS || config.termsAndConditions || '';

  const _d = new Date(sale.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const taxRate = config.taxRate || 0;
  const showTax = config.showTaxRate !== false && taxRate > 0;
  const subtotalBeforeTax = showTax ? (sale.total / (1 + taxRate)) : sale.total;
  const taxAmount = showTax ? (sale.total - subtotalBeforeTax) : 0;

  let itemsHtml = '';
  (sale.items || []).forEach(item => {
    const totalLine = item.quantity * item.price;
    itemsHtml += '<tr>' +
      '<td style="padding: 4px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">' + item.description + '</td>' +
      '<td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">' + item.quantity + '</td>' +
      '<td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">' + currSym + item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '<td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900;">' + currSym + totalLine.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
  });

  const code128Script = getBarcodeScript(sale.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const innerTicketHtml = 
    '  <div>' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 4px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Venta</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Ticket Folio:</span><span class="data-value">#' + sale.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">' + dateStr + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Cliente:</span><span class="data-value">PÚBLICO GENERAL</span></div>' +
    (sale.paymentMethod ? '              <div class="data-row"><span class="data-label">Forma de Pago:</span><span class="data-value">' + sale.paymentMethod + '</span></div>' : '') +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table">' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="text-align: left; padding: 4px 6px;">Artículo / Descripción</th>' +
    '          <th style="width: 15%; text-align: center; padding: 4px 6px;">Cant</th>' +
    '          <th style="width: 20%; text-align: right; padding: 4px 6px;">P. Unit</th>' +
    '          <th style="width: 20%; text-align: right; padding: 4px 6px;">Subtotal</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' +
    itemsHtml +
    '      </tbody>' +
    '    </table>' +
    '  </div>' +
    '  <div>' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    (policies ? '          <div class="policies-box" style="margin-top: 0; margin-bottom: 0;"><b>GARANTÍAS Y POLÍTICAS:</b> ' + policies + '</div>' : '') +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px;">' +
    (showTax ?
    '            <div class="total-row"><span class="data-label">Subtotal:</span><span class="data-value">' + currSym + subtotalBeforeTax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '            <div class="total-row"><span class="data-label">I.V.A (' + (taxRate * 100).toFixed(0) + '%):</span><span class="data-value">' + currSym + taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>TOTAL NETO:</span><span>' + currSym + sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    (sale.cashReceived !== undefined && sale.cashReceived > 0 ?
    '            <div class="total-row" style="margin-top: 3px;"><span class="data-label">Efectivo recibido:</span><span class="data-value">' + currSym + sale.cashReceived.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    (sale.cardReceived !== undefined && sale.cardReceived > 0 ?
    '            <div class="total-row"><span class="data-label">Tarjeta/Transferencia:</span><span class="data-value">' + currSym + sale.cardReceived.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    (sale.change !== undefined && sale.change > 0 ?
    '            <div class="total-row" style="border-top: 1px dashed #ccc; padding-top: 3px; font-weight: 900;"><span class="data-label">CAMBIO:</span><span class="data-value">' + currSym + sale.change.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' : '') +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    buildTicketFooterBlock(config, 'media-carta') +
    '  </div>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 210mm 297mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; }' +
    '.items-table td { padding: 3px 5px; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.divider-line { width: 100%; height: 6mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 1mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TIENDA) ✂️</div></div>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaDuplicadoQuoteTicketHtml(quote: Quote, config: WorkshopConfig): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = 'Este documento es una cotización y no implica compromiso de servicio.';

  const _d = new Date(quote.createdAt);
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = _d.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(_d.getDate())}/${_pad(_d.getMonth()+1)}/${_d.getFullYear()} ${_h12}:${_pad(_d.getMinutes())}${_ampm}`;
  
  let validStr = 'N/A';
  if (quote.validUntil) {
    const vd = new Date(quote.validUntil + 'T00:00:00');
    validStr = `${_pad(vd.getDate())}/${_pad(vd.getMonth()+1)}/${vd.getFullYear()}`;
  }

  const customerPhone = formatCustomerPhoneWithCountryCode(quote.customerPhone, quote.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const subtotalDevices = quote.devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
  const subtotalAdditional = (quote.additionalConcepts || []).reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
  const totalEstimado = subtotalDevices + subtotalAdditional;
  const showCustomNotes = !!(quote.showNotesOnTicket && quote.notes && quote.notes.trim() !== '');

  const code128Script = getBarcodeScript(quote.id, config.barcodeAsImage, config.showBarcodeOnTicket);

  const deviceRowsHtml = quote.devices.map((d, index) => {
    const dq = d.quantity || 1;
    const detailsCostText = dq > 1 ? `<div style="font-size: 8px; color: #475569; margin-top: 1px;">CANTIDAD: ${dq} · UNITARIO: ${currSym}${d.estimatedCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : '';
    const rowSubtotal = dq * d.estimatedCost;
    return `<tr>
      <td>
        <div style="font-weight: 900; font-size: 10px; text-transform: uppercase;">${d.deviceBrand} ${d.deviceModel}</div>
        <div style="font-size: 8px; color: #475569; margin-top: 1px;">
          ${d.deviceType ? `TIPO: ${d.deviceType === 'Phone' ? 'CELULAR' : d.deviceType.toUpperCase()}` : ''}
          ${d.deviceModelNumber ? ` · MODELO: ${d.deviceModelNumber.toUpperCase()}` : ''}
        </div>
        <div style="margin-top: 2px; font-weight: 500; font-size: 8px; color: #334155;"><b>SERVICIO A COTIZAR:</b> ${d.serviceType.toUpperCase()}</div>
        ${d.faultDescription ? `<div style="margin-top: 2px; font-size: 8px; font-weight: 500; color: #475569;"><b>FALLA REPORTADA:</b> ${d.faultDescription.toUpperCase()}</div>` : ''}
        ${detailsCostText}
      </td>
      <td style="text-align: right; font-weight: 900; font-size: 10px; vertical-align: middle;">${currSym}${rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('') + (quote.additionalConcepts || []).map(c => {
    const cq = c.quantity || 1;
    const detailsCostText = cq > 1 ? `<div style="font-size: 8px; color: #475569; margin-top: 1px;">CANTIDAD: ${cq} · UNITARIO: ${currSym}${c.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : '';
    const rowSubtotal = cq * c.price;
    return `<tr>
      <td>
        <div style="font-weight: 900; font-size: 10px; text-transform: uppercase; color: #1e3a8a;">[INSUMO / MANO DE OBRA]</div>
        <div style="margin-top: 2px; font-weight: 500; font-size: 8px; color: #334155;">${c.description.toUpperCase()}</div>
        ${detailsCostText}
      </td>
      <td style="text-align: right; font-weight: 900; font-size: 10px; vertical-align: middle;">${currSym}${rowSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;
  }).join('');

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'COTIZACIÓN') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 4px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Cotización</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio/Cotización:</span><span class="data-value">#' + quote.id + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Emisión:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Válida hasta:</span><span class="data-value">' + validStr + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + quote.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table">' +
    '      <thead><tr><th style="width: 75%;">Dispositivo & Servicio a Cotizar</th><th style="width: 25%; text-align: right;">Costo Estimado</th></tr></thead>' +
    '      <tbody>' + deviceRowsHtml + '</tbody>' +
    '    </table>' +
    '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 4px; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 28mm;">' +
    '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
    (showCustomNotes
      ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + quote.notes + '</div>'
      : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
        '      </div>') +
    '    </div>' +
    '  </div>' +
    '  <div style="flex-shrink: 0;">' +
    '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
    '      <tr>' +
    '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
    '          <div class="policies-box" style="margin-top: 0; margin-bottom: 4px;"><b>NOTA:</b> ' + policies + '</div>' +
    (!quote.showNotesOnTicket && quote.notes ? '          <div style="font-size: 8px; color: #000; margin-top: 2px;"><b>Notas Adicionales:</b> ' + quote.notes + '</div>' : '') +
    '        </td>' +
    '        <td style="width: 45%; vertical-align: top;">' +
    '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px;">' +
    '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>TOTAL ESTIMADO:</span><span>' + currSym + totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '  </div>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: 210mm 297mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.invoice-container { width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; text-align: left; }' +
    '.items-table td { padding: 3px 5px; border-bottom: 1px solid #cbd5e1; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.divider-line { width: 100%; height: 6mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 1mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '</style></head><body>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TIENDA) ✂️</div></div>' +
    '<div class="invoice-container">' + innerTicketHtml + '</div>' +
    '<script>' + code128Script + '</script></body></html>';
}

export function buildMediaCartaDuplicadoConsolidatedTicketHtml(orders: RepairOrder[], config: WorkshopConfig, page?: 'front' | 'back'): string {
  const currSym = config.currencySymbol || '$';
  const footer = config.ticketFooterService || config.ticketFooter || '¡Gracias por su preferencia!';
  const policies = config.termsAndConditionsService || config.termsAndConditions || '';

  let policiesFontSize = '7.5px';
  if (policies && policies.length > 500) {
    policiesFontSize = '5.5px';
  } else if (policies && policies.length > 300) {
    policiesFontSize = '6.2px';
  } else if (policies && policies.length > 150) {
    policiesFontSize = '7.2px';
  } else {
    policiesFontSize = '8px';
  }

  const first = orders[0];
  const batchId = first?.batchId || first?.id || '';
  const now = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _h = now.getHours(); const _ampm = _h >= 12 ? 'PM' : 'AM'; const _h12 = _h % 12 || 12;
  const dateStr = `${_pad(now.getDate())}/${_pad(now.getMonth()+1)}/${now.getFullYear()} ${_h12}:${_pad(now.getMinutes())}${_ampm}`;

  const customerPhone = formatCustomerPhoneWithCountryCode(first?.customerPhone, first?.customerCountryCode);

  const storePhoneLine = getMediaCartaStorePhonesLine(config);

  const logoSrc = config.mediaCartaLogoUrl || '';
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" onload="(function(img){
        var ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.4) {
          img.style.maxWidth = '65mm';
          img.style.maxHeight = '18mm';
          var cell = img.parentElement;
          if (cell) {
            cell.style.width = '35%';
            var sibling = cell.nextElementSibling;
            if (sibling) sibling.style.width = '35%';
          }
        } else {
          img.style.maxWidth = '38mm';
          img.style.maxHeight = '15mm';
        }
      })(this)" style="max-height: 16mm; max-width: 50mm; object-fit: contain; display: block;" />`
    : '';

  const logoTd = '<td class="header-cell" style="width: 25%; vertical-align: middle; text-align: center;">' + (logoHtml || '') + '</td>';
  const detailsWidth = '45%';

  const totalCargo = orders.reduce((s, o) => s + o.cost, 0);
  const totalAnticipo = first?.batchAdvancePayment ?? orders.reduce((s, o) => s + o.advancePayment, 0);
  const totalResta = Math.max(0, totalCargo - totalAnticipo);

  const combinedBreakdown: { method: string; amount: number }[] = [];
  orders.forEach(o => {
    if (o.advancePaymentBreakdown) {
      o.advancePaymentBreakdown.forEach(b => {
        const existing = combinedBreakdown.find(x => x.method === b.method);
        if (existing) {
          existing.amount += b.amount;
        } else {
          combinedBreakdown.push({ ...b });
        }
      });
    } else if (o.advancePayment > 0) {
      const defaultMethod = 'Efectivo';
      const existing = combinedBreakdown.find(x => x.method === defaultMethod);
      if (existing) {
        existing.amount += o.advancePayment;
      } else {
        combinedBreakdown.push({ method: defaultMethod, amount: o.advancePayment });
      }
    }
  });

  if (combinedBreakdown.length === 0 && totalAnticipo > 0) {
    combinedBreakdown.push({ method: 'Efectivo', amount: totalAnticipo });
  }

  const rawNotes = orders[0]?.ticketNote !== undefined ? orders[0]?.ticketNote : (orders[0]?.diagnosticsNote || '');
  const notesText = rawNotes.trim().toUpperCase();
  const isDefaultNote = notesText === '' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNÓSTICO DE INGRESO INICIAL REGISTRADO' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO.' ||
                        notesText === 'DIAGNOSTICO DE INGRESO INICIAL REGISTRADO';
  const showCustomNotes = !!(orders[0]?.showNotesOnLabel && rawNotes && !isDefaultNote);

  let itemsHtml = '';
  orders.forEach((o, idx) => {
    const cleanFault = (o.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();
    const patNodes = parsePatternNodes(o.devicePin || '');
    const pinDisplay = patNodes ? '[PATRÓN]' : (o.devicePin || '(NINGUNO)');
    const details = [
      o.deviceBrand + ' ' + o.deviceModel,
      o.deviceModelNumber ? 'Mod: ' + o.deviceModelNumber : '',
      o.receivedAccessories && o.receivedAccessories.length > 0 ? 'Acc: ' + o.receivedAccessories.join(', ') : '',
      'Acceso: ' + pinDisplay
    ].filter(Boolean).join(' | ');

    itemsHtml += '<tr>' +
      '<td style="padding: 3px 4px; border-bottom: 1px solid #cbd5e1; font-weight: 700; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 3px 4px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700;">' + o.id + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">' + details.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 3px 4px; border-bottom: 1px solid #cbd5e1;">' +
      '  <div style="font-weight: 700; text-transform: uppercase;">' + o.serviceType + '</div>' +
      '  <div style="font-size: 8px; color: #475569; margin-top: 1px;">FALLA: ' + cleanFault.toUpperCase() + '</div>' +
      '</td>' +
      '<td style="padding: 3px 4px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 900; font-size: 9.5px;">' + currSym + o.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
  });

  const code128Script = getBarcodeScript(batchId, config.barcodeAsImage, config.showBarcodeOnTicket);

  const innerTicketHtml = 
    '  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">' +
    '    <table class="header-table">' +
    '      <tr>' +
    logoTd +
    '        <td class="header-cell" style="width: ' + detailsWidth + '; vertical-align: middle; text-align: center;">' +
    '          <div class="store-title" style="font-size: ' + (logoHtml ? '14px' : '20px') + '; margin-bottom: ' + (logoHtml ? '0' : '3px') + ';">' + (config.storeName || 'SOPORTE TÉCNICO') + '</div>' +
    '          <div class="store-details">' +
    buildMediaCartaStoreDetailsHtml(config) +
    '          </div>' +
    '        </td>' +
    '        <td class="header-cell" style="width: 30%; vertical-align: middle; text-align: right;">' +
    '          <div class="bc-target" style="display: inline-block; max-width: 100%;"></div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table style="width: 100%; margin-bottom: 4px;">' +
    '      <tr>' +
    '        <td style="width: 50%; vertical-align: top; padding-right: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Información de la Recepción</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Folio Grupo:</span><span class="data-value">#' + batchId + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Fecha Ingreso:</span><span class="data-value">' + dateStr + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Cant. Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '        <td style="width: 50%; vertical-align: top; padding-left: 5px;">' +
    '          <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">' +
    '            <div class="grid-title">Datos del Cliente</div>' +
    '            <div class="grid-body">' +
    '              <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">' + first.customerName.toUpperCase() + '</span></div>' +
    '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + customerPhone + '</span></div>' +
    '            </div>' +
    '          </div>' +
    '        </td>' +
    '      </tr>' +
    '    </table>' +
    '    <table class="items-table">' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="width: 8%; text-align: center;">No.</th>' +
    '          <th style="width: 42%; text-align: left; padding: 4px 6px;">Equipo / Identificación / Acceso</th>' +
    '          <th style="width: 38%; text-align: left; padding: 4px 6px;">Servicio & Falla</th>' +
    '          <th style="width: 12%; text-align: right; padding: 4px 6px;">Costo</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' +
    itemsHtml +
    '      </tbody>' +
    '    </table>' +
    (config.mediaCartaFrontTerms
      ? '    <div style="display: flex; gap: 8px; justify-content: space-between; flex: 1; min-height: 0; overflow: hidden; margin-top: 4px; margin-bottom: 2px;">' +
        '      <div style="width: 55%; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 5px; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 3px; letter-spacing: 0.5px; flex-shrink: 0;">TÉRMINOS Y CONDICIONES</div>' +
        '          <div style="font-size: ' + policiesFontSize + '; line-height: 1.25; color: #334155; font-weight: 600; overflow-y: auto; flex: 1; word-break: break-word;">' + (policies || 'Sin términos configurados.') + '</div>' +
        '        </div>' +
        '      </div>' +
        '      <div style="width: 45%; display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">' +
        '        <div style="border: 1px solid #000; border-radius: 4px; padding: 4px 6px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 12mm;">' +
        '          <div style="font-weight: 900; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 3px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES</div>' +
        (showCustomNotes
          ? '          <div style="font-size: 8px; line-height: 1.25; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
          : '          <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0; min-height: 0;">' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '            <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '          </div>') +
        '        </div>' +
        '        <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px; border: 1.5px solid #000; border-radius: 4px; background: #fafaf9;">' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Total de Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          <div class="total-row" style="font-size: 8.5px; display: flex; justify-content: space-between;"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (combinedBreakdown.length > 0 ?
        '          <div style="font-size: 7.5px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + combinedBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '          <div class="total-row grand-total" style="font-size: 10px; padding: 2.5px; display: flex; justify-content: space-between; background: #000; color: #fff; border-radius: 2px; font-weight: 900;"><span>SALDO RESTANTE:</span><span>' + currSym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0; margin-top: 2px;">' +
        '    <table class="signatures-table" style="width: 100%; margin-top: 2px; margin-bottom: 0;">' +
        '      <tr>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 16px;"></div><div class="signature-line" style="font-size: 7.5px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-weight: 700; text-transform: uppercase;">Firma del Cliente</div></td>' +
        '        <td style="width: 50%; text-align: center;"><div style="height: 16px;"></div><div class="signature-line" style="font-size: 7.5px; border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 1.5px; font-weight: 700; text-transform: uppercase;">Firma Autorizada del Taller</div></td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>'
      : '    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-top: 4px; margin-bottom: 4px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; min-height: 24mm;">' +
        '      <div style="font-weight: 900; font-size: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: 0.5px; flex-shrink: 0;">OBSERVACIONES / NOTAS ADICIONALES</div>' +
        (showCustomNotes
          ? '      <div style="font-size: 8.5px; line-height: 1.35; color: #000; font-weight: 600; white-space: pre-wrap; text-align: left; flex: 1; overflow: hidden;">' + rawNotes + '</div>'
          : '      <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; min-height: 0;">' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '        <div style="border-bottom: 1px dotted #000; height: 0;"></div>' +
            '      </div>') +
        '    </div>' +
        '  </div>' +
        '  <div style="flex-shrink: 0;">' +
        '    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">' +
        '      <tr>' +
        '        <td style="width: 55%; vertical-align: top; padding-right: 12px;">' +
        (policies ? '          <div class="policies-box" style="margin-top: 0; margin-bottom: 4px;"><b>TÉRMINOS Y CONDICIONES:</b> ' + policies + '</div>' : '') +
        '          <table class="signatures-table" style="width: 100%; margin-top: 3px; margin-bottom: 0;">' +
        '            <tr>' +
        '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>' +
        '              <td style="width: 50%;"><div style="height: 25px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>' +
        '            </tr>' +
        '          </table>' +
        '        </td>' +
        '        <td style="width: 45%; vertical-align: top;">' +
        '          <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 4px;">' +
        '            <div class="total-row"><span class="data-label">Total de Equipos:</span><span class="data-value">' + orders.length + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Costo Total:</span><span class="data-value">' + currSym + totalCargo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '            <div class="total-row"><span class="data-label">Anticipo:</span><span class="data-value">-' + currSym + totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        (combinedBreakdown.length > 0 ?
        '            <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: -2px; margin-bottom: 2px;">(' + combinedBreakdown.map(b => `${b.method}: ${currSym}${b.amount.toFixed(0)}`).join(', ') + ')</div>' : '') +
        '            <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>' + currSym + totalResta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></div>' +
        '          </div>' +
        '        </td>' +
        '      </tr>' +
        '    </table>' +
        buildTicketFooterBlock(config, 'media-carta') +
        '  </div>');

  const rawClauses = config.contractClauses !== undefined ? config.contractClauses : DEFAULT_CONTRACT_CLAUSES;
  const clausesList = rawClauses.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const clausesHtml = clausesList.map(c => `<div class="clause-item">${c}</div>`).join('');
  const contractHtml =
    '<div class="contract-wrapper">' +
    '  <table class="contract-header-table">' +
    '    <tr>' +
    '      <td style="width:65%;font-size:11.5px;font-weight:900;text-align:left;text-transform:uppercase;line-height:1.1;">CONTRATO DE SERVICIOS SIMPLIFICADO</td>' +
    '      <td style="width:35%;font-size:8px;font-weight:700;text-align:right;color:#475569;text-transform:uppercase;">REVERSO DE GRUPO #' + batchId + '</td>' +
    '    </tr>' +
    '    <tr>' +
    '      <td colspan="2" style="font-size:7px;font-weight:700;text-align:center;color:#000;padding:2px 0;border-bottom:1px solid #000;text-transform:uppercase;letter-spacing:0.5px;">' +
    '        (Al firmar al reverso de la hoja acepta estos términos de forma tácita)' +
    '      </td>' +
    '    </tr>' +
    '  </table>' +
    '  <div class="contract-clauses-container">' + clausesHtml + '</div>' +
    '  <div class="contract-footer-note">LOS TÉRMINOS Y CONDICIONES DE ESTE CONTRATO ESTÁN SUJETOS A LA REGULACIÓN VIGENTE. CONSERVE ESTA COPIA COMO COMPROBANTE DE SU SERVICIO.</div>' +
    '</div>';

  const css =
    '@page { size: 210mm 297mm; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #000; background: #fff; line-height: 1.3; padding: 3mm 5mm; margin: 0; }' +
    '.print-page { width: 100%; height: 291mm; max-height: 291mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }' +
    '.page-break { page-break-after: always; break-after: page; }' +
    '.invoice-container { width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; overflow: hidden; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }' +
    '.header-cell { vertical-align: top; }' +
    '.store-title { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; }' +
    '.store-details { font-size: 8px; font-weight: 600; color: #333; margin-top: 1px; }' +
    '.grid-title { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2px 5px; text-transform: uppercase; letter-spacing: 0.5px; }' +
    '.grid-body { padding: 3px 5px; }' +
    '.data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 1px 0; }' +
    '.data-row:last-child { border-bottom: none; }' +
    '.data-label { font-weight: 700; color: #475569; }' +
    '.data-value { font-weight: 700; color: #000; text-align: right; }' +
    '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #000; }' +
    '.items-table th { background: #000; color: #fff; font-weight: 900; font-size: 8px; padding: 2.5px 5px; text-transform: uppercase; }' +
    '.items-table td { padding: 3px 4px; font-size: 9px; vertical-align: top; }' +
    '.totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fafaf9; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9.5px; }' +
    '.total-row.grand-total { font-size: 11px; font-weight: 900; background: #000; color: #fff; padding: 3px; margin-top: 2px; border-radius: 2px; }' +
    '.policies-box { font-size: 6.5px; color: #475569; line-height: 1.25; border: 1px solid #e2e8f0; padding: 3px 5px; background: #f8fafc; border-radius: 4px; margin-top: 3px; margin-bottom: 5px; word-break: break-all; overflow-wrap: break-word; }' +
    '.divider-line { width: 100%; height: 6mm; display: flex; align-items: center; justify-content: center; position: relative; margin: 1mm 0; }' +
    '.divider-dashed { width: 100%; border-top: 1px dashed #000; }' +
    '.divider-tag { position: absolute; background: #fff; padding: 0 8px; font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px; }' +
    '.contract-wrapper { width: 100%; height: 141mm; max-height: 141mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; padding: 4px; }' +
    '.contract-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; border-bottom: 2px solid #000; padding-bottom: 4px; flex-shrink: 0; }' +
    '.contract-clauses-container { flex: 1; overflow: hidden; column-count: 2; column-gap: 10px; font-size: 10px; line-height: 1.4; color: #000; padding: 4px 0; word-break: break-word; overflow-wrap: break-word; }' +
    '.clause-item { break-inside: avoid; margin-bottom: 4px; padding: 2px 4px; border-left: 2px solid #000; font-weight: 600; }' +
    '.contract-footer-note { font-size: 6.5px; color: #475569; text-align: center; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }';

  const autoFitScript = `<script>(function(){
  var wrappers = document.querySelectorAll('.contract-wrapper');
  wrappers.forEach(function(wrapper) {
    var clausesEl = wrapper.querySelector('.contract-clauses-container');
    if (!clausesEl) return;
    var fs = 10.0;
    var minFs = 6.0;
    while (wrapper.scrollHeight > wrapper.clientHeight && fs > minFs) {
      fs = Math.round((fs - 0.2) * 10) / 10;
      clausesEl.style.fontSize = fs + 'px';
    }
  });
})();</script>`;

  let bodyContent = '';
  if (page === 'front') {
    bodyContent =
      '<div class="print-page">' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
      '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
      '</div>';
  } else if (page === 'back') {
    bodyContent =
      '<div class="print-page">' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ AL REVERSO DEL TICKET ✂️</div></div>' +
      '  <div class="invoice-container">' + contractHtml + '</div>' +
      '</div>';
  } else {
    if (config.printDuplexContract) {
      bodyContent =
        '<div class="print-page page-break">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '</div>' +
        '<div class="print-page">' +
        '  <div class="invoice-container">' + contractHtml + '</div>' +
        '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ AL REVERSO DEL TICKET ✂️</div></div>' +
        '  <div class="invoice-container">' + contractHtml + '</div>' +
        '</div>';
    } else {
      bodyContent =
        '<div class="print-page">' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '  <div class="divider-line"><div class="divider-dashed"></div><div class="divider-tag">✂️ CORTE AQUÍ (COPIA CLIENTE / COPIA TALLER) ✂️</div></div>' +
        '  <div class="invoice-container">' + innerTicketHtml + '</div>' +
        '</div>';
    }
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css +
    '</style></head><body>' + bodyContent +
    '<script>' + code128Script + '</script>' + autoFitScript + '</body></html>';
}

export function buildLetterQuoteTicketHtml(quote: Quote, config: WorkshopConfig): string {
  const sym = config.currencySymbol || '$';
  const logoSrc = config.mediaCartaLogoUrl || '';
  const storeName = quote.storeNameOverride || config.storeName || 'SOPORTE TÉCNICO';
  const storeAddress = quote.storeAddressOverride || config.address || '';
  const storePhone = quote.storePhoneOverride !== undefined ? quote.storePhoneOverride : (config.phone || '');
  const storePhone2 = quote.storePhone2Override !== undefined ? quote.storePhone2Override : (config.phone2 || '');

  const addrParts = storeAddress.split(',').map(p => p.trim());
  let addrLine1 = storeAddress;
  let addrLine2 = '';
  if (addrParts.length >= 3) {
    addrLine1 = addrParts.slice(0, addrParts.length - 2).join(', ') + ',';
    addrLine2 = addrParts.slice(addrParts.length - 2).join(', ');
  }
  
  const formatPrice = (num: number) => num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const formattedStorePhone = storePhone
    ? storePhone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || storePhone
    : '';

  const formattedStorePhone2 = storePhone2
    ? storePhone2.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || storePhone2
    : '';

  const isBlank = !quote.customerName && quote.devices.length === 4 && quote.devices.every(d => !d.deviceBrand);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const d = new Date(quote.createdAt);
  const dateStr = isBlank ? '____ de _______________ de 20____' : `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  const issueDateFormatted = isBlank
    ? '__/__/____'
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const clientNameDisplay = isBlank 
    ? '<span style="border-bottom: 1px solid #000; display: inline-block; width: 180px; height: 16px;"></span>'
    : `<strong>${quote.customerName.toUpperCase()}</strong>`;
    
  const clientPhoneDisplay = isBlank 
    ? '<span style="border-bottom: 1px solid #000; display: inline-block; width: 110px; height: 16px;"></span>'
    : `<strong>${quote.customerCountryCode || ''} ${quote.customerPhone}</strong>`;

  const validUntilDisplay = isBlank
    ? '____/____/________'
    : quote.validUntil
      ? new Date(quote.validUntil + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';

  const additionalCount = quote.additionalConcepts?.length || 0;
  const maxLastPage = additionalCount >= 7 ? 1 : additionalCount >= 4 ? 2 : 3;

  const pages: QuoteDevice[][] = [];
  let tempDevices = [...quote.devices];
  while (tempDevices.length > 0) {
    const rem = tempDevices.length;
    if (rem <= maxLastPage) {
      pages.push(tempDevices);
      break;
    }
    if (rem <= 5) {
      pages.push(tempDevices);
      pages.push([]);
      break;
    }
    pages.push(tempDevices.slice(0, 5));
    tempDevices = tempDevices.slice(5);
  }
  if (pages.length === 0) {
    pages.push([]);
  }

  const sloganHtml = config.slogan ? `<div style="font-size: 13.5px; font-style: italic; font-weight: 700; color: #374151; margin-bottom: 12px;">"${config.slogan}"</div>` : '';
  const phoneLines = [];
  if (formattedStorePhone) phoneLines.push(`Tel: ${formattedStorePhone}`);
  if (formattedStorePhone2) phoneLines.push(`Whatsapp: ${formattedStorePhone2}`);

  const storeInfoHtml = [
    storeAddress,
    ...phoneLines
  ].filter(Boolean).join(' · ');

  const titleStr = (quote.title || 'COTIZACIÓN').toUpperCase();



  const totalPages = pages.length;
  let pagesHtml = '';

  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === totalPages - 1;
    const pageNum = pageIdx + 1;

    let pageHeaderHtml = '';
    if (isFirstPage) {
      const leftLogo = quote.customLogoUrl !== undefined ? quote.customLogoUrl : (config.logoUrl || '');
      const rightLogo = quote.customRightLogoUrl !== undefined ? quote.customRightLogoUrl : (config.quoteSecondLogoUrl || '');
      const showDouble = !!rightLogo;

      let businessHoursText = '';
      if (config.businessHours) {
        if (config.businessHours.trim().startsWith('{')) {
          try {
            const schedule = JSON.parse(config.businessHours);
            const parts: string[] = [];
            const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            const dayLabels: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue', viernes: 'Vie', sabado: 'Sab', domingo: 'Dom' };
            days.forEach(d => {
              const s = schedule[d];
              if (s && s.isOpen) {
                const convertTo12HourShort = (t: string | undefined) => {
                  if (!t) return '';
                  let hr = parseInt(t.split(':')[0], 10);
                  const mn = t.split(':')[1];
                  const ampm = hr >= 12 ? 'pm' : 'am';
                  hr = hr % 12 || 12;
                  return `${hr}:${mn}${ampm}`;
                };
                if (s.type === 'split') {
                  parts.push(`${dayLabels[d]}: ${convertTo12HourShort(s.openTime)}-${convertTo12HourShort(s.closeTime)} / ${convertTo12HourShort(s.openTime2)}-${convertTo12HourShort(s.closeTime2)}`);
                } else {
                  parts.push(`${dayLabels[d]}: ${convertTo12HourShort(s.openTime)}-${convertTo12HourShort(s.closeTime)}`);
                }
              }
            });
            businessHoursText = parts.join(' · ');
          } catch (e) {
            businessHoursText = config.businessHours;
          }
        } else {
          businessHoursText = config.businessHours.replace(/\r?\n/g, ' · ');
        }
      }

      let headerTableHtml = '';
      // Formato con logos a los extremos (si existen) y datos al centro
      headerTableHtml = 
        '    <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">' +
        '      <tr>' +
        '        <td class="header-cell" style="width: 25%; text-align: left; vertical-align: middle;">' +
        (leftLogo ? `          <img src="${leftLogo}" style="max-height: 22mm; max-width: 45mm; object-fit: contain;" />` : '') +
        '        </td>' +
        '        <td class="header-cell" style="width: 50%; text-align: center; vertical-align: middle; padding: 0 10px;">' +
        '          <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.45; text-align: center; text-transform: uppercase;">' +
        `            <div style="font-size: 13.5px; font-weight: 900; color: #000; letter-spacing: 0.5px; margin-bottom: 3.5px;">${storeName}</div>` +
        `            ${addrLine1 ? `<div style="margin-bottom: 2px;">${addrLine1}</div>` : ''}` +
        `            ${addrLine2 ? `<div style="margin-bottom: 2px;">${addrLine2}</div>` : ''}` +
        '            <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-decoration: underline; margin-top: 4px; text-transform: none;">' +
        `              ${storePhone ? `Tel ${storePhone}` : ''}` +
        `              ${storePhone && storePhone2 ? '&nbsp;&nbsp;&nbsp;&nbsp;' : ''}` +
        `              ${storePhone2 ? `Whatsapp. ${storePhone2}` : ''}` +
        '            </div>' +
        (businessHoursText ? `            <div style="font-size: 9px; font-weight: 700; color: #4b5563; margin-top: 4.5px; text-transform: none;">HORARIO: ${businessHoursText}</div>` : '') +
        '          </div>' +
        '        </td>' +
        '        <td class="header-cell" style="width: 25%; text-align: right; vertical-align: middle;">' +
        ((showDouble && rightLogo) ? `          <img src="${rightLogo}" style="max-height: 22mm; max-width: 45mm; object-fit: contain;" />` : '') +
        '        </td>' +
        '      </tr>' +
        '    </table>';

      pageHeaderHtml = 
        '  <div style="flex-shrink: 0;">' +
        headerTableHtml +
        '    <div style="width: 100%; margin: 8px 0 12px 0;">' +
        '      <div style="height: 1px; background: #000; width: 100%; margin-bottom: 2px;"></div>' +
        '      <div style="height: 3px; background: #000; width: 100%; margin-bottom: 2px;"></div>' +
        '      <div style="height: 1px; background: #000; width: 100%;"></div>' +
        '    </div>' +
        (config.slogan ? `    <div style="text-align: center; font-size: 13.5px; font-style: italic; font-weight: 750; color: #1f2937; text-transform: uppercase; margin-top: 10px; margin-bottom: 4px;">"${config.slogan.replace(/"/g, '')}"</div>` : '') +
        `    <div style="font-size: 20px; font-weight: 900; color: #000; letter-spacing: 1px; text-transform: uppercase; text-align: center; margin-top: 10px; margin-bottom: 14px;">${titleStr}</div>` +
        '    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">' +
        '      <tr>' +
        '        <td style="width: 100%; vertical-align: top;">' +
        '          <table style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; background: #f8fafc; box-sizing: border-box; border-collapse: collapse;">' +
        '            <tr>' +
        '              <td style="font-size: 11.5px; font-weight: 700; color: #000; text-transform: uppercase; padding: 4px 0 6px 0; text-align: left; width: 60%;">' +
        '                <span style="color: #000; font-weight: 900; font-size: 10px; margin-right: 5px; letter-spacing: 0.5px;">CLIENTE:</span>' +
        `                ${clientNameDisplay}` +
        '              </td>' +
        '              <td style="font-size: 11.5px; font-weight: 700; color: #000; text-transform: uppercase; padding: 4px 0 6px 0; text-align: right; width: 40%;">' +
        '                <span style="color: #000; font-weight: 900; font-size: 10px; margin-right: 5px; letter-spacing: 0.5px;">TELÉFONO:</span>' +
        `                ${clientPhoneDisplay}` +
        '              </td>' +
        '            </tr>' +
        '            <tr>' +
        '              <td style="font-size: 11.5px; font-weight: 700; color: #000; text-transform: uppercase; padding: 6px 0 4px 0; border-top: 1px solid #e5e7eb; text-align: left; width: 60%;">' +
        '                <span style="color: #000; font-weight: 900; font-size: 10px; margin-right: 5px; letter-spacing: 0.5px;">FECHA EMISIÓN:</span>' +
        `                <strong>${issueDateFormatted}</strong>` +
        '              </td>' +
        '              <td style="font-size: 11.5px; font-weight: 700; color: #000; text-transform: uppercase; padding: 6px 0 4px 0; border-top: 1px solid #e5e7eb; text-align: right; width: 40%;">' +
        '                <span style="color: #000; font-weight: 900; font-size: 10px; margin-right: 5px; letter-spacing: 0.5px;">VÁLIDA HASTA:</span>' +
        `                ${validUntilDisplay}` +
        '              </td>' +
        '            </tr>' +
        '          </table>' +
        '        </td>' +
        '      </tr>' +
        '    </table>' +
        '  </div>';
    } else {
      pageHeaderHtml =
        `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #000; padding-bottom: 5px; margin-bottom: 18px; text-transform: uppercase; font-size: 11px; font-weight: 800; color: #4b5563;">` +
        `  <span>${titleStr} · CLIENTE: ${quote.customerName.toUpperCase()}</span>` +
        `  <span>PÁGINA ${pageNum} DE ${totalPages}</span>` +
        `</div>`;
    }

    let itemsHtml = '';
    pageItems.forEach((device) => {
      const isRowBlank = isBlank || (!device.deviceBrand && !device.deviceModel && !device.serviceType);
      
      let descriptionHtml = '';
      let priceHtml = '';
      let imgHtml = '';
      
      if (isRowBlank) {
        descriptionHtml = 
          '<div style="height: 18px; border-bottom: 1px dotted #888; width: 90%; margin-bottom: 8px;"></div>' +
          '<div style="height: 18px; border-bottom: 1px dotted #888; width: 90%; margin-bottom: 8px;"></div>' +
          '<div style="height: 18px; border-bottom: 1px dotted #888; width: 60%;"></div>';
        priceHtml = '<div style="font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px dotted #888; width: 100%; height: 18px; margin-top: 10px;"></div>';
        imgHtml = '<div style="width: 100%; height: 95px; border: 1.5px dashed #ccc; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 11px;">[ IMAGEN ]</div>';
      } else {
        if (quote.editorFormat === 'letter' || device.deviceBrand === 'CARTA') {
          descriptionHtml = `<div style="font-size: 13.5px; font-weight: 800; color: #000; text-transform: uppercase; white-space: pre-wrap; line-height: 1.45;">${device.serviceType}</div>`;
        } else {
          const cleanFault = (device.faultDescription || '').replace(/^\[[^\]]*\]\s*/g, '').trim();
          const details = [
            device.deviceModelNumber ? 'Mod: ' + device.deviceModelNumber : '',
            cleanFault ? 'Falla: ' + cleanFault : ''
          ].filter(Boolean).join(' · ');
          
          descriptionHtml = 
            `<div style="font-size: 14.5px; font-weight: 800; text-transform: uppercase; color: #000; margin-bottom: 4px;">${device.deviceBrand} ${device.deviceModel}</div>` +
            `<div style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px; text-transform: uppercase;">${device.serviceType}</div>` +
            (details ? `<div style="font-size: 11.5px; font-weight: 600; color: #4b5563; text-transform: uppercase;">${details}</div>` : '');
        }
          
        const q = device.quantity || 1;
        if (q > 1) {
          priceHtml = 
            `<div style="font-size: 11px; font-weight: 700; color: #4b5563; margin-bottom: 2px; text-transform: uppercase; white-space: nowrap;">${q} x ${sym}${formatPrice(device.estimatedCost)}</div>` +
            `<div style="font-size: 15px; font-weight: 900; color: #000; white-space: nowrap;">${sym}${formatPrice(q * device.estimatedCost)}</div>`;
        } else {
          priceHtml = `<div style="font-size: 15px; font-weight: 900; color: #000; white-space: nowrap;">${sym}${formatPrice(device.estimatedCost)}</div>`;
        }
        
        if (device.deviceImageUrl) {
          imgHtml = `<img src="${device.deviceImageUrl}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px;" />`;
        } else {
          const iconType = device.deviceType || 'Phone';
          let placeholderText = 'CELULAR';
          if (iconType === 'Laptop') placeholderText = 'LAPTOP';
          if (iconType === 'Desktop') placeholderText = 'COMPUTADORA';
          if (iconType === 'Tablet') placeholderText = 'TABLET';
          
          imgHtml = `<div style="width: 100%; height: 80px; border: 1.5px dashed #ccc; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase;">` +
                    `  <div style="font-size: 20px; margin-bottom: 4px;">💻</div>` +
                    `  <div>${placeholderText}</div>` +
                    `</div>`;
        }
      }
      
      itemsHtml += 
        `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; page-break-inside: avoid; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">` +
        `  <div style="width: 22%; display: flex; justify-content: center; align-items: center; min-height: 80px; max-height: 85px; overflow: hidden; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px;">` +
        `    ${imgHtml}` +
        `  </div>` +
        `  <div style="width: 54%; text-align: left; padding-left: 15px; padding-right: 15px; display: flex; flex-direction: column; justify-content: center; min-height: 80px;">` +
        `    ${descriptionHtml}` +
        `  </div>` +
        `  <div style="width: 20%; text-align: right; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; min-height: 80px;">` +
        `    ${priceHtml}` +
        `  </div>` +
        `</div>`;
    });

    let footerHtml = '';
    if (isLastPage) {
      const subtotalDevices = quote.devices.reduce((s, d) => s + (d.quantity || 1) * d.estimatedCost, 0);
      const subtotalAdditional = (quote.additionalConcepts || []).reduce((s, c) => s + (c.quantity || 1) * c.price, 0);
      const totalCost = subtotalDevices + subtotalAdditional;
      const totalHtml = isBlank
        ? 'TOTAL ESTIMADO: ' + sym + ' ___________________'
        : `TOTAL ESTIMADO: ${sym}${formatPrice(totalCost)}`;

      let additionalConceptsHtml = '';
      if (quote.additionalConcepts && quote.additionalConcepts.length > 0 && !isBlank) {
        additionalConceptsHtml = 
          '    <div style="border: 1.5px solid #cbd5e1; border-radius: 4px; padding: 10px; margin-bottom: 12px; font-size: 11.5px; font-weight: 700; text-align: left; background: #f8fafc; page-break-inside: avoid;">' +
          '      <div style="font-weight: 900; font-size: 10px; text-transform: uppercase; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px;">MANO DE OBRA Y CONCEPTOS SECUNDARIOS</div>' +
          '      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
          '        <thead>' +
          '          <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">' +
          '            <th style="padding: 4px 0; width: 55%;">Descripción</th>' +
          '            <th style="padding: 4px 0; text-align: center; width: 10%;">Cant</th>' +
          '            <th style="padding: 4px 0; text-align: right; width: 15%;">Unitario</th>' +
          '            <th style="padding: 4px 0; text-align: right; width: 20%;">Importe</th>' +
          '          </tr>' +
          '        </thead>' +
          '        <tbody>' +
          quote.additionalConcepts.map(c => {
            const cq = c.quantity || 1;
            const itemSubtotal = cq * c.price;
            return `        <tr style="border-bottom: 1px dashed #e2e8f0;">` +
                   `          <td style="padding: 6px 0; text-transform: uppercase; color: #000; font-weight: 700;">${c.description}</td>` +
                   `          <td style="padding: 6px 0; text-align: center; color: #000; font-weight: 700;">${cq}</td>` +
                   `          <td style="padding: 6px 0; text-align: right; color: #000; font-weight: 700;">${sym}${formatPrice(c.price)}</td>` +
                   `          <td style="padding: 6px 0; text-align: right; font-weight: 900; color: #000;">${sym}${formatPrice(itemSubtotal)}</td>` +
                   `        </tr>`;
          }).join('') +
          '        </tbody>' +
          '      </table>' +
          '    </div>';
      }

      let notesHtml = '';
      if (quote.notes && !isBlank) {
        notesHtml = 
          '<div style="margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid;">' +
          '  <div style="border-left: 3px solid #000; padding: 2px 0 2px 12px; font-size: 12px; line-height: 1.45; color: #000;">' +
          '    <div style="font-weight: 900; font-size: 9.5px; tracking-wider: 0.5px; color: #4b5563; margin-bottom: 3.5px; text-transform: uppercase;">Propuesta y Observaciones</div>' +
          `    <div style="font-style: italic; font-weight: 700; text-transform: uppercase; white-space: pre-wrap;">${quote.notes.toUpperCase()}</div>` +
          '  </div>' +
          '</div>';
      }

      let responsibleHtml = '';
      if (quote.createdBy && !isBlank) {
        responsibleHtml = 
          '<div style="margin-top: 30px; margin-bottom: 20px; page-break-inside: avoid; text-align: center;">' +
          '  <div style="font-size: 9.5px; font-weight: 900; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 30px;">Atentamente,</div>' +
          '  <div style="width: 240px; border-bottom: 1.5px solid #000; margin: 0 auto 8px auto;"></div>' +
          `  <div style="font-size: 12px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">${quote.createdBy.toUpperCase()}</div>` +
          '  <div style="font-size: 9.5px; font-weight: 700; color: #4b5563; margin-top: 2px; text-transform: uppercase;">Responsable / Asesor Técnico</div>' +
          '</div>';
      }

      footerHtml =
        '  <div style="flex-shrink: 0; margin-top: 4px;">' +
        additionalConceptsHtml +
        `    <div class="totals-banner">${totalHtml}</div>` +
        notesHtml +
        responsibleHtml +
        '    <div style="text-align: center; font-size: 14.5px; font-weight: 900; font-style: italic; margin-top: 15px; margin-bottom: 2px; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">' +
        '      ¡¡Gracias Por Su Preferencia!!' +
        '    </div>' +
        '  </div>';
    }

    pagesHtml += 
      `<div class="page">` +
      `  ${pageHeaderHtml}` +
      `  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; padding: 2px 0;">` +
      `    ${itemsHtml}` +
      `  </div>` +
      `  ${footerHtml}` +
      `</div>`;
  });

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: letter; margin: 0; }' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #000; background: #e4e4e7; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 0; margin: 0; }' +
    '.page { width: 216mm; height: 279mm; max-height: 279mm; overflow: hidden; padding: 10mm 15mm; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.15); display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }' +
    '.header-cell { vertical-align: middle; }' +
    '.store-title { font-size: 20px; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.1; margin-bottom: 4px; }' +
    '.store-details { font-size: 11px; font-weight: 700; color: #374151; line-height: 1.4; }' +
    '.thick-bar { height: 4.5px; background: #000; width: 100%; margin: 6px 0 10px 0; }' +
    '.slogan-box { text-align: center; margin-bottom: 12px; }' +
    '.info-grid { width: 100%; margin-bottom: 18px; }' +
    '.info-label { font-weight: 800; color: #000; text-transform: uppercase; font-size: 12.5px; }' +
    '.totals-banner { background: #000; color: #fff; font-size: 18px; font-weight: 900; padding: 8px 15px; text-transform: uppercase; text-align: right; border-radius: 4px; margin-top: 10px; margin-bottom: 12px; letter-spacing: 0.5px; }' +
    '@media print {' +
    '  body { background: #fff; padding: 0; }' +
    '  .page { box-shadow: none; page-break-after: always; }' +
    '  .page:last-child { page-break-after: avoid; }' +
    '}' +
    '</style></head><body>' +
    pagesHtml +
    '</body></html>';
}

export const buildApartadoTicketHtml = (opts: {
  apartado: ApartadoEntry;
  storeName: string;
  phone: string;
  address: string;
  sym: string;
  paperWidth: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado';
  footer: string;
  offset?: number;
  config?: WorkshopConfig;
}) => {
  const { apartado, storeName, phone, address, sym, paperWidth: rawPaperWidth, footer, offset = 0, config } = opts;
  const isStar = config?.selectedPrinterProfileId === 'star-tsp100';
  const paperWidth = isStar ? '72mm' : rawPaperWidth;
  const is58 = paperWidth === '58mm';
  const isMediaCarta = paperWidth === 'media-carta';
  const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado';
  const rightPad = is58 ? '8mm' : '6mm';
  const leftPad = is58 ? '3mm' : '5mm';
  const pageSize = isMediaCarta ? '216mm 140mm' : isMediaCartaDuplicado ? '210mm 297mm' : `${paperWidth} auto`;
  const pageMargin = (isMediaCarta || isMediaCartaDuplicado) ? '0' : '2mm 1mm';
  const paddingCss = (isMediaCarta || isMediaCartaDuplicado) ? '6mm 8mm 0 8mm' : `2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px)`;
  const containerStyle = isMediaCarta ? 'width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : isMediaCartaDuplicado ? 'width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : '';
  const dateStr = new Date(apartado.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const totalPaid = apartado.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, apartado.totalValue - totalPaid);
  const statusLabel = apartado.status === 'Activo' ? 'ACTIVO' : apartado.status === 'Listo' ? 'LISTO PARA ENTREGAR' : apartado.status === 'Entregado' ? 'ENTREGADO' : 'CANCELADO';
  const bcScript = getBarcodeScript(apartado.id, config?.barcodeAsImage);

  if (isMediaCarta || isMediaCartaDuplicado) {
    const logoSrc = config?.mediaCartaLogoUrl || '';
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" onload="(function(img){
          var ratio = img.naturalWidth / img.naturalHeight;
          if (ratio > 1.4) {
            img.style.maxWidth = '75mm';
            img.style.maxHeight = '28mm';
          } else {
            img.style.maxWidth = '42mm';
            img.style.maxHeight = '24mm';
          }
        })(this)" style="max-height: 22mm; max-width: 50mm; object-fit: contain; display: block;" />`
      : '';
    const formattedStorePhone = config?.phone
      ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
      : '';
    const storeAddress = config?.address || address || '';
    const storeSlogan = config?.slogan || '';

    const itemsRowsHtml = apartado.items.map(i =>
      `<tr>` +
      `  <td><div style="font-weight:900;font-size:10.5px;text-transform:uppercase;">${i.name}</div></td>` +
      `  <td style="text-align:center;">${i.quantity}</td>` +
      `  <td style="text-align:right;">${sym}${i.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>` +
      `  <td style="text-align:right;font-weight:900;">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>` +
      `</tr>`
    ).join('');

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
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; }
      .items-table th { background: #000; color: #fff; font-weight: 900; font-size: 9.5px; padding: 4px 6px; text-transform: uppercase; text-align: left; }
      .items-table td { padding: 6px; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }
      .totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }
      .total-row { display: flex; justify-content: space-between; padding: 2.5px 0; font-size: 10.5px; }
      .total-row.grand-total { font-size: 12px; font-weight: 900; background: #000; color: #fff; padding: 4px; margin-top: 3px; border-radius: 2px; }
      .signatures-table { width: 100%; margin-top: 5px; margin-bottom: 0; }
      .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
    `;

    const ticketContent = `
      <div class="invoice-container">
        <div>
          <table class="header-table">
            <tr>
              ${logoHtml ? `
                <td class="header-cell" style="width: 40%; vertical-align: middle;">${logoHtml}</td>
                <td class="header-cell" style="width: 60%; padding-left: 10px; vertical-align: middle;">
                  <div class="store-title" style="font-size: 16px;">${storeName}</div>
              ` : `
                <td class="header-cell" style="width: 100%; text-align: center; vertical-align: middle;">
                  <div class="store-title" style="font-size: 24px; margin-bottom: 4px;">${storeName}</div>
              `}
                  <div class="store-details">
                    ${storeSlogan ? '<i>"' + storeSlogan + '"</i><br>' : ''}
                    ${storeAddress ? 'Dirección: ' + storeAddress + '<br>' : ''}
                    ${formattedStorePhone ? 'Tel: ' + formattedStorePhone : ''}
                  </div>
                </td>
            </tr>
          </table>
          <table style="width: 100%; margin-bottom: 8px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 5px;">
                <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                  <div class="grid-title">Datos del Cliente</div>
                  <div class="grid-body">
                    <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${apartado.clientName.toUpperCase()}</span></div>
                    ${apartado.clientPhone ? '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + apartado.clientPhone + '</span></div>' : ''}
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                  <div class="grid-title">Detalles del Apartado</div>
                  <div class="grid-body">
                    <div class="data-row"><span class="data-label">Folio:</span><span class="data-value">#${apartado.id}</span></div>
                    <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">${dateStr}</span></div>
                    ${apartado.dueDate ? '              <div class="data-row"><span class="data-label">Vencimiento:</span><span class="data-value">' + new Date(apartado.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }) + '</span></div>' : ''}
                    <div class="data-row"><span class="data-label">Estado:</span><span class="data-value">${statusLabel}</span></div>
                  </div>
                </div>
              </td>
            </tr>
          </table>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%; padding: 4px 6px;">Producto / Concepto</th>
                <th style="width: 15%; text-align: center; padding: 4px 6px;">Cant</th>
                <th style="width: 15%; text-align: right; padding: 4px 6px;">Unitario</th>
                <th style="width: 20%; text-align: right; padding: 4px 6px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>
        </div>
        <div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
            <tr>
              <td style="width: 55%; vertical-align: top; padding-right: 12px;">
                <div style="font-size: 8px; color: #475569; border: 1px solid #e2e8f0; padding: 5px; background: #f8fafc; border-radius: 4px;">
                  <b>CONDICIONES DE APARTADO:</b> Las piezas apartadas se guardarán hasta la fecha de vencimiento. Transcurrida la fecha sin liquidarse, el apartado se cancelará sin devolución de anticipos.
                </div>
                <table class="signatures-table" style="width: 100%; margin-top: 4px; margin-bottom: 0;">
                  <tr>
                    <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma del Cliente</div></td>
                    <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Firma Autorizada del Taller</div></td>
                  </tr>
                </table>
              </td>
              <td style="width: 45%; vertical-align: top;">
                <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
                  <div class="total-row"><span class="data-label">Total Valor:</span><span class="data-value">${sym}${apartado.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="total-row"><span class="data-label">Total Anticipos:</span><span class="data-value">-${sym}${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO PENDIENTE:</span><span>${balance > 0 ? `${sym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LIQUIDADO'}</span></div>
                </div>
              </td>
            </tr>
          </table>
          <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
            <div class="bc-target" style="margin: 0 auto; display: flex; justify-content: center; height: 35px;"></div>
            <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${apartado.id} *</div>
            <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">${footer}</div>
          </div>
        </div>
      </div>
    `;

    return isMediaCarta
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>${ticketContent}<script>${bcScript}</script></body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>
          <div class="ticket-copy">${ticketContent}</div>
          <div class="divider-line"><span class="divider-text">RECORTAR AQUÍ</span></div>
          <div class="ticket-copy">${ticketContent}</div>
          <script>${bcScript}</script>
        </body></html>`;
  }

  const itemRows = apartado.items.map(i =>
    `<div class="kv"><span>${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span class="bold">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${pageSize};margin:${pageMargin}}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : '13'}px;font-weight:700;width:100%;margin:0;padding:${paddingCss};color:#000;background:#fff}
    .container{${containerStyle}}
    .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
    .sub{font-size:10px;font-weight:700;text-align:center;color:#000}
    hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
    .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
    .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0}
    .bold{font-weight:900}
    .total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
    .footer{font-size:9px;text-align:center;margin-top:5px}
    .status{font-size:10px;font-weight:900;text-align:center;margin:3px 0}
  </style></head><body><div class="container">
    <div class="store">${storeName.toUpperCase()}</div>
    ${phone ? `<div class="sub">${phone}</div>` : ''}
    ${address ? `<div class="sub">${address}</div>` : ''}
    <hr>
    <span class="badge">📦 APARTADO</span>
    <div class="kv"><span>FOLIO:</span><span class="bold">${apartado.id}</span></div>
    <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
    ${apartado.dueDate ? `<div class="kv"><span>VENCE:</span><span>${new Date(apartado.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span></div>` : ''}
    <div class="kv"><span>CLIENTE:</span><span class="bold">${apartado.clientName}</span></div>
    ${apartado.clientPhone ? `<div class="kv"><span>TEL:</span><span>${apartado.clientPhone}</span></div>` : ''}
    <hr>
    ${itemRows}
    <hr>
    <div class="total-row">TOTAL: ${sym}${apartado.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    <div class="kv" style="margin-top:3px"><span>ANTICIPO:</span><span class="bold">${sym}${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="kv"><span>SALDO:</span><span class="bold">${balance > 0 ? `${sym}${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LIQUIDADO ✓'}</span></div>
    <div class="status">ESTADO: ${statusLabel}</div>
    <hr>
    <div id="bc"></div>
    <div class="footer">${footer}</div>
    <script>${bcScript}</script>
  </div></body></html>`;
};
