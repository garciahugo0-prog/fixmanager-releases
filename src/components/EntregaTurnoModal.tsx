/**
 * Modal de Entrega de Turno para empleados.
 * Permite contar el efectivo de sus ventas y generar un resumen
 * sin cerrar la caja ni ver datos de otros usuarios.
 */

import React, { useState, useMemo } from 'react';
import { X, Banknote, Coins, CheckCircle, Printer, RotateCcw } from 'lucide-react';
import { Sale, WorkshopConfig, AppUser } from '../types';

interface EntregaTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  config: WorkshopConfig;
  currentUser: AppUser;
}

export default function EntregaTurnoModal({ isOpen, onClose, sales, config, currentUser }: EntregaTurnoModalProps) {
  const sym = config.currencySymbol || '$';
  const isRetro = config.theme === 'retro-window';

  // Conteo de billetes
  const [q1000, setQ1000] = useState(0);
  const [q500,  setQ500]  = useState(0);
  const [q200,  setQ200]  = useState(0);
  const [q100,  setQ100]  = useState(0);
  const [q50,   setQ50]   = useState(0);
  const [q20,   setQ20]   = useState(0);
  const [monedas, setMonedas] = useState(0);
  const [showResumen, setShowResumen] = useState(false);

  // Solo las ventas de este usuario en el día de hoy
  const today = new Date().toISOString().slice(0, 10);
  const misSales = useMemo(() =>
    sales.filter(s =>
      !s.isCancelled &&
      s.createdBy === currentUser.name &&
      s.createdAt.slice(0, 10) === today
    ), [sales, currentUser.name, today]);

  const totalVendido   = misSales.reduce((s, v) => s + v.total, 0);

  const { totalEfectivo, totalTarjeta } = useMemo(() => {
    let efe = 0;
    let tar = 0;
    misSales.forEach(s => {
      if (s.paymentMethod === 'Efectivo') {
        efe += s.total;
      } else if (s.paymentMethod === 'Tarjeta/Transfer' || s.paymentMethod === 'Tarjeta' || s.paymentMethod === 'Transferencia') {
        tar += s.total;
      } else if (s.paymentMethod === 'Múltiple' || s.paymentMethod === 'Mixto') {
        const efeMatch = s.confirmationCode?.match(/Efe:\s*\$?([0-9.]+)/);
        const cardMatch = s.confirmationCode?.match(/T\/T:\s*\$?([0-9.]+)/);
        const efeAmt = efeMatch ? parseFloat(efeMatch[1]) : 0;
        const cardAmt = cardMatch ? parseFloat(cardMatch[1]) : 0;

        if (efeAmt === 0 && cardAmt === 0) {
          efe += s.total;
        } else {
          efe += efeAmt;
          tar += cardAmt;
        }
      } else {
        efe += s.total;
      }
    });
    return { totalEfectivo: efe, totalTarjeta: tar };
  }, [misSales]);

  const totalBilletes  = q1000*1000 + q500*500 + q200*200 + q100*100 + q50*50 + q20*20;
  const totalContado   = totalBilletes + monedas;
  const diferencia     = totalContado - totalEfectivo;

  const cuadra = Math.abs(diferencia) < 0.01;

  const handleReset = () => {
    setQ1000(0); setQ500(0); setQ200(0);
    setQ100(0); setQ50(0); setQ20(0); setMonedas(0);
    setShowResumen(false);
  };
  const handleImprimir = async () => {
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const fecha = new Date().toLocaleDateString('es-MX');
    let paperWidth = (config.hybridPrintMode
      ? (config.posPaperWidth || '80mm')
      : (config.ticketPaperWidth || '80mm')) as any;
    if (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') {
      paperWidth = '80mm';
    }
    const targetPrinter = config.hybridPrintMode
      ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
      : (config.ticketPrinterBrand || '');
    const is58 = paperWidth === '58mm';
    const isMediaCarta = paperWidth === 'media-carta';
    const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado';
    const offset = config.ticketMarginOffset || 0;
    const rightPad = is58 ? '4mm' : '6mm';
    const leftPad = is58 ? '3mm' : '5mm';

    if (isMediaCarta || isMediaCartaDuplicado) {
      const logoSrc = config.ticketLogoUrl || '';
      const logoHtml = logoSrc
        ? `<img src="${logoSrc}" style="max-height: 20mm; max-width: 45mm; object-fit: contain; display: block;" />`
        : '';
      const formattedStorePhone = config.phone
        ? config.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || config.phone
        : '';
      const storeAddress = config.address || '';
      const storeSlogan = config.slogan || '';

      const statusColor = cuadra ? '#15803d' : '#b91c1c';
      const statusIcon = cuadra ? '✓ CUADRA EXACTO' : '⚠ NO CUADRA';

      const denoms = [
        { label: 'B/$1000', q: q1000, val: q1000 * 1000 },
        { label: 'B/$500',  q: q500,  val: q500 * 500 },
        { label: 'B/$200',  q: q200,  val: q200 * 200 },
        { label: 'B/$100',  q: q100,  val: q100 * 100 },
        { label: 'B/$50',   q: q50,   val: q50 * 50 },
        { label: 'B/$20',   q: q20,   val: q20 * 20 },
      ].filter(d => d.q > 0);

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
        .totals-box { width: 45%; margin-left: auto; border: 1.5px solid #000; border-radius: 4px; padding: 6px; background: #fafaf9; }
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
                  <div class="store-title">${(config.storeName || 'FixManager').toUpperCase()}</div>
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
                    <div class="grid-title">Datos del Turno</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Empleado:</span><span class="data-value">${currentUser.name.toUpperCase()}</span></div>
                      <div class="data-row"><span class="data-label">Fecha / Hora:</span><span class="data-value">${fecha} ${hora}</span></div>
                    </div>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Resumen de Cuadre</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Efectivo Esperado:</span><span class="data-value">${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Efectivo Contado:</span><span class="data-value">${sym}${totalContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Diferencia:</span><span class="data-value" style="color:${statusColor};">${diferencia >= 0 ? '+' : ''}${sym}${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            <table style="width: 100%; margin-bottom: 8px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Movimientos del Turno</div>
                    <div class="grid-body">
                      <div class="data-row"><span class="data-label">Ventas Realizadas:</span><span class="data-value">${misSales.length}</span></div>
                      <div class="data-row"><span class="data-label">Total Vendido:</span><span class="data-value">${sym}${totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Efectivo Esperado:</span><span class="data-value">${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div class="data-row"><span class="data-label">Tarjeta/Transfer (Info):</span><span class="data-value">${sym}${totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                    <div class="grid-title">Conteo de Billetes y Monedas</div>
                    <div class="grid-body">
                      ${denoms.length > 0 ? denoms.map(d =>
                        `<div class="data-row"><span class="data-label">${d.label}:</span><span class="data-value">${d.q} &times; ${sym}${(d.val/d.q).toFixed(0)} = ${sym}${d.val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
                      ).join('') : '<div class="data-row" style="color: #64748b; font-style: italic; font-weight: 500;">No se registraron billetes</div>'}
                      ${monedas > 0 ? `<div class="data-row"><span class="data-label">Monedas:</span><span class="data-value">${sym}${monedas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
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
                  <div class="comment-box"><b>OBSERVACIONES/ESTADO:</b><br><span style="text-transform: uppercase; color: ${statusColor};">${statusIcon}</span><br><br><span style="font-size: 8px; color: #64748b;">Turno de caja entregado y registrado por el operador de forma conforme.</span></div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                  <div class="totals-box" style="width: 100%; margin-left: 0; margin-top: 0; padding: 5px;">
                    <div class="total-row"><span class="data-label">Esperado:</span><span class="data-value">${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="total-row"><span class="data-label">Contado:</span><span class="data-value">${sym}${totalContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="total-row grand-total" style="background: ${statusColor}; font-size: 11px; padding: 3px;"><span>ESTADO:</span><span>${statusIcon}</span></div>
                  </div>
                  <table class="signatures-table" style="width: 100%; margin-top: 15px; margin-bottom: 0;">
                    <tr>
                      <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Entrega</div></td>
                      <td style="width: 50%;"><div style="height: 12px;"></div><div class="signature-line" style="font-size: 7.5px;">Recibe</div></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
              <div class="footer-text" style="font-size: 9px; font-weight: 900; margin-top: 3px; color: #000;">¡Gracias por su esfuerzo diario!</div>
            </div>
          </div>
        </div>
      `;

      const html = isMediaCarta
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>${ticketContent}</body></html>`
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}${commonStyles}</style></head><body>
            <div class="ticket-copy">${ticketContent}</div>
            <div class="divider-line"><span class="divider-text">RECORTAR AQUÍ</span></div>
            <div class="ticket-copy">${ticketContent}</div>
          </body></html>`;

      const paperWidthMicrons = isMediaCarta ? 215900 : (isMediaCartaDuplicado ? 210000 : 215900);
      const paperHeightMicrons = isMediaCarta ? 139700 : (isMediaCartaDuplicado ? 297000 : 279400);
      window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName: targetPrinter, paperWidthMicrons, paperHeightMicrons } }));
      return;
    }

    const pageSizeCss = `${paperWidth} auto`;
    const pageMarginCss = '2mm 1mm';
    const bodyPadding = `2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px)`;
    const containerStart = '<div>';
    const containerEnd = '</div>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: ${pageSizeCss}; margin: ${pageMarginCss}; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: ${is58 ? '11' : '13'}px; font-weight: 700; width: 100%; margin: 0; padding: ${bodyPadding}; color: #000; background: #fff; }
  h2 { text-align: center; font-size: 14px; margin: 4px 0; }
  .sub { text-align: center; font-size: 11px; color: #000; font-weight: 700; margin-bottom: 8px; }
  hr { border: none; border-top: 1.5px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .total { font-weight: bold; font-size: 13px; }
  .ok { color: green; font-weight: bold; text-align: center; margin-top: 6px; }
  .err { color: red; font-weight: bold; text-align: center; margin-top: 6px; }
  .firma { margin-top: 20px; border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 10px; }
</style></head><body>${containerStart}
  <h2>ENTREGA DE TURNO</h2>
  <div class="sub">${config.storeName || 'FixManager'}</div>
  <div class="sub">${fecha} — ${hora}</div>
  <div class="sub">Empleado: <b>${currentUser.name}</b></div>
  <hr/>
  <div class="row"><span>Ventas realizadas:</span><span>${misSales.length}</span></div>
  <div class="row"><span>Total vendido:</span><span>${sym}${totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <hr/>
  <div class="row"><span>Efectivo (esperado):</span><span>${sym}${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row"><span>Tarjeta/Transfer:</span><span>${sym}${totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <hr/>
  <b>CONTEO DE EFECTIVO</b>
  <div style="font-size: 10px; font-weight: bold; margin-top: 4px; border-bottom: 1px dashed #000; padding-bottom: 1px;">BILLETES</div>
  <table style="width:100%; border-collapse:collapse; font-size: inherit; font-weight: inherit; color: inherit; margin: 4px 0;">
    <tbody>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$1000</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q1000}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q1000*1000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$500</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q500}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q500*500).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$200</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q200}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q200*200).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$100</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q100}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q100*100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$50</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q50}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q50*50).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 45%; padding: 2px 0; font-weight: inherit;">$20</td>
        <td style="text-align: left; width: 20%; padding: 2px 0; white-space: nowrap; font-weight: inherit; color: #000;">× ${q20}</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${(q20*20).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>
  ${monedas > 0 ? `
  <div style="font-size: 10px; font-weight: bold; margin-top: 6px; border-bottom: 1px dashed #000; padding-bottom: 1px;">MONEDAS</div>
  <table style="width:100%; border-collapse:collapse; font-size: inherit; font-weight: inherit; color: inherit; margin: 4px 0;">
    <tbody>
      <tr style="line-height: 1.35;">
        <td style="text-align: left; width: 65%; padding: 2px 0; font-weight: inherit;">Total en monedas:</td>
        <td style="text-align: right; width: 35%; padding: 2px 0; font-weight: inherit;">${sym}${monedas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>
  ` : ''}
  <div class="row total"><span>TOTAL CONTADO:</span><span>${sym}${totalContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  <div class="row total"><span>DIFERENCIA:</span><span style="color:${cuadra?'green':'red'}">${diferencia >= 0 ? '+' : ''}${sym}${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  ${cuadra
    ? '<div class="ok">✓ CUADRA — Efectivo correcto</div>'
    : `<div class="err">⚠ NO CUADRA — Revisar</div>`
  }
  <div class="firma">Firma del empleado: ___________________</div>
  <div class="firma">Firma del dueño: ______________________</div>
${containerEnd}</body></html>`;
    const paperWidthMicrons = paperWidth === '58mm' ? 48000 : 72000;
    const paperHeightMicrons = undefined;
    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName: targetPrinter, paperWidthMicrons, paperHeightMicrons } }));
  };

  if (!isOpen) return null;

  const inputCls = isRetro
    ? 'w-16 text-center border-2 border-t-zinc-500 border-l-zinc-500 border-b-white border-r-white bg-white text-black font-mono text-sm p-1 focus:outline-none'
    : 'w-16 text-center bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 font-mono text-sm focus:outline-none focus:border-sky-500';

  const denominations = [
    { label: '$1,000', value: 1000, qty: q1000, set: setQ1000 },
    { label: '$500',   value: 500,  qty: q500,  set: setQ500  },
    { label: '$200',   value: 200,  qty: q200,  set: setQ200  },
    { label: '$100',   value: 100,  qty: q100,  set: setQ100  },
    { label: '$50',    value: 50,   qty: q50,   set: setQ50   },
    { label: '$20',    value: 20,   qty: q20,   set: setQ20   },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] ${
        isRetro ? 'bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600' : 'bg-[#0f1013] border border-zinc-800'
      }`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isRetro ? 'bg-gradient-to-r from-[#000080] to-[#1084d0] border-zinc-600' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2">
            <Banknote className={`w-4 h-4 ${isRetro ? 'text-white' : 'text-emerald-400'}`} />
            <span className={`font-black text-sm uppercase tracking-wide ${isRetro ? 'text-white font-sans' : 'text-white'}`}>
              Entrega de Turno — {currentUser.name}
            </span>
          </div>
          <button onClick={onClose} className={`cursor-pointer ${isRetro ? 'text-white hover:text-yellow-300' : 'text-zinc-500 hover:text-white'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* Resumen de ventas del turno */}
          <div className={`rounded-lg p-3 border ${isRetro ? 'bg-white border-zinc-400' : 'bg-zinc-900 border-zinc-800'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
              Tus ventas de hoy
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded p-2 text-center ${isRetro ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-800'}`}>
                <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Ventas</p>
                <p className={`font-black text-lg ${isRetro ? 'text-zinc-900' : 'text-white'}`}>{misSales.length}</p>
              </div>
              <div className={`rounded p-2 text-center ${isRetro ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-800'}`}>
                <p className={`text-[10px] ${isRetro ? 'text-zinc-500' : 'text-zinc-400'}`}>Total vendido</p>
                <p className="font-black text-lg text-emerald-400">{sym}{totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className={`flex gap-2 mt-2 text-[11px] font-mono`}>
              <span className={`flex-1 text-center rounded py-1 ${isRetro ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border border-emerald-800/20 text-emerald-400'}`}>
                💵 Efectivo: {sym}{totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex-1 text-center rounded py-1 ${isRetro ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-blue-950/30 border border-blue-800/20 text-blue-400'}`}>
                💳 Tarjeta/Transfer: {sym}{totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Conteo de billetes */}
          <div className={`rounded-lg p-3 border ${isRetro ? 'bg-white border-zinc-400' : 'bg-zinc-900 border-zinc-800'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isRetro ? 'text-zinc-600' : 'text-zinc-500'}`}>
              <Banknote className="w-3.5 h-3.5" /> Contar efectivo a entregar
            </p>
            <div className="space-y-2">
              {denominations.map(d => (
                <div key={d.label} className="flex items-center justify-between gap-2">
                  <span className={`w-14 text-right font-mono font-bold text-sm ${isRetro ? 'text-zinc-800' : 'text-zinc-300'}`}>{d.label}</span>
                  <span className={`text-xs ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>×</span>
                  <input
                    type="number"
                    min={0}
                    value={d.qty || ''}
                    onChange={e => d.set(Math.max(0, parseInt(e.target.value) || 0))}
                    className={inputCls}
                    placeholder="0"
                  />
                  <span className={`text-xs ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>=</span>
                  <span className={`w-20 text-right font-mono text-sm ${isRetro ? 'text-zinc-800' : 'text-zinc-300'}`}>
                    {sym}{(d.qty * d.value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}

              {/* Monedas */}
              <div className={`flex items-center justify-between gap-2 pt-2 border-t ${isRetro ? 'border-zinc-300' : 'border-zinc-700'}`}>
                <span className={`w-14 text-right font-mono font-bold text-sm flex items-center gap-1 ${isRetro ? 'text-zinc-800' : 'text-zinc-300'}`}>
                  <Coins className="w-3 h-3" /> Monedas
                </span>
                <span className={`text-xs ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}></span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={monedas || ''}
                  onChange={e => setMonedas(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={inputCls}
                  placeholder="0"
                />
                <span className={`text-xs ${isRetro ? 'text-zinc-500' : 'text-zinc-500'}`}>=</span>
                <span className={`w-20 text-right font-mono text-sm ${isRetro ? 'text-zinc-800' : 'text-zinc-300'}`}>
                  {sym}{monedas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado del conteo */}
          {totalContado > 0 && (
            <div className={`rounded-lg p-3 border ${
              cuadra
                ? isRetro ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-800/30'
                : isRetro ? 'bg-red-50 border-red-300' : 'bg-red-950/20 border-red-800/30'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Efectivo esperado:</span>
                <span className={`font-mono font-bold ${isRetro ? 'text-zinc-900' : 'text-white'}`}>{sym}{totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold ${isRetro ? 'text-zinc-700' : 'text-zinc-400'}`}>Total contado:</span>
                <span className={`font-mono font-bold ${isRetro ? 'text-zinc-900' : 'text-white'}`}>{sym}{totalContado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between items-center border-t pt-1 mt-1 ${isRetro ? 'border-zinc-300' : 'border-zinc-700'}`}>
                <span className={`text-xs font-black uppercase ${isRetro ? 'text-zinc-700' : 'text-zinc-300'}`}>Diferencia:</span>
                <span className={`font-mono font-black text-sm ${cuadra ? 'text-emerald-500' : 'text-red-400'}`}>
                  {diferencia >= 0 ? '+' : ''}{sym}{diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`mt-2 text-center text-[11px] font-black uppercase flex items-center justify-center gap-1.5 ${cuadra ? 'text-emerald-500' : 'text-red-400'}`}>
                {cuadra
                  ? <><CheckCircle className="w-4 h-4" /> Cuadra — listo para entregar</>
                  : <><X className="w-4 h-4" /> No cuadra — vuelve a contar</>
                }
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className={`flex gap-2 px-4 py-3 border-t ${isRetro ? 'bg-[#d4d0c8] border-zinc-500' : 'border-zinc-800'}`}>
          <button
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all ${
              isRetro
                ? 'bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 text-zinc-700 hover:bg-zinc-200'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" /> Limpiar
          </button>
          <button
            onClick={handleImprimir}
            disabled={totalContado === 0}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase rounded cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isRetro
                ? 'bg-[#000080] text-white hover:bg-[#0000aa] border-2 border-t-[#6060ff] border-l-[#6060ff] border-b-[#00005a] border-r-[#00005a]'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir resumen y entregar
          </button>
        </div>
      </div>
    </div>
  );
}
