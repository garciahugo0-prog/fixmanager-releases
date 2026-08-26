import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, ChevronRight, CreditCard, AlertTriangle, CheckCircle, ShoppingBag, Trash2, Package, Printer } from 'lucide-react';
import { CreditAccount, CreditSaleEntry, CreditPayment, WorkshopConfig, InventoryItem, AppUser, ApartadoEntry, ApartadoPayment, RefaccionItem } from '../types';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { CODE128_RESPONSIVE, getBarcodeScript, buildApartadoTicketHtml } from '../utils/ticketBuilder';
import { sendWhatsappNotification, buildWhatsappApartadoMessage, buildWhatsappApartadoAbonoMessage, buildWhatsappFiadoCargoMessage, buildWhatsappFiadoAbonoMessage, buildWhatsappFiadoAperturaMessage } from '../utils/whatsapp';
import { handleCaretPreservingChange } from '../utils/domHelpers';

interface Props {
  accounts: CreditAccount[];
  inventory: InventoryItem[];
  refacciones?: RefaccionItem[];
  config: WorkshopConfig;
  currentUser: AppUser | null;
  users: AppUser[];
  clients?: any[];
  onCreateAccount: (account: CreditAccount) => void;
  onAddEntry: (accountId: string, entry: CreditSaleEntry, decrementStock?: boolean) => void;
  onAddPayment: (accountId: string, payment: CreditPayment) => void;
  onUpdateAccount: (account: CreditAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  apartados: ApartadoEntry[];
  onCreateApartado: (a: ApartadoEntry) => void;
  onAddApartadoPayment: (apartadoId: string, payment: ApartadoPayment) => void;
  onUpdateApartadoStatus: (apartadoId: string, status: ApartadoEntry['status']) => void;
  initialSelectedAccountId?: string | null;
  initialSelectedApartadoId?: string | null;
  initialActiveTab?: 'fiados' | 'apartados';
  highlightedEntryId?: string | null;
  highlightedApartadoId?: string | null;
  onClearNavigationStates?: () => void;
}

const genId = () => `FD-${Date.now().toString(36).toUpperCase()}`;

const fmPrint = (html: string, paperWidthMicrons: number, ticketPrinterBrand: string, toastName = 'Ticket Fiado', toastDetails?: string, paperHeightMicrons?: number) => {
  window.dispatchEvent(new CustomEvent('automated-print', { detail: { type: 'ticket', name: toastName, details: toastDetails } }));
  window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName: ticketPrinterBrand, paperWidthMicrons, paperHeightMicrons, isLabel: false } }));
};

const buildFiadoCargoTicket = (opts: {
  storeName: string; sym: string; paperWidth: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado';
  footer: string; clientName: string; clientPhone: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number; newBalance: number;
  offset?: number;
  config?: WorkshopConfig;
  id?: string;
}) => {
  const { storeName, sym, paperWidth, footer, clientName, clientPhone, items, subtotal, newBalance, offset = 0, config, id } = opts;
  const cargoId = id || 'CARGO';
  const bcScript = getBarcodeScript(cargoId, config?.barcodeAsImage);
  const is58 = paperWidth === '58mm';
  const isMediaCarta = paperWidth === 'media-carta';
  const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado';
  const rightPad = is58 ? '8mm' : '6mm';
  const leftPad = is58 ? '3mm' : '5mm';
  const pageSize = isMediaCarta ? '216mm 140mm' : isMediaCartaDuplicado ? '210mm 297mm' : `${paperWidth} auto`;
  const pageMargin = (isMediaCarta || isMediaCartaDuplicado) ? '0' : '2mm 1mm';
  const paddingCss = (isMediaCarta || isMediaCartaDuplicado) ? '6mm 8mm 0 8mm' : `2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px)`;
  const containerStyle = isMediaCarta ? 'width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : isMediaCartaDuplicado ? 'width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : '';
  const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

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
    const storeAddress = config?.address || '';
    const storeSlogan = config?.slogan || '';

    const itemsRowsHtml = items.map(i =>
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
                    <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${clientName.toUpperCase()}</span></div>
                    ${clientPhone ? '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + clientPhone + '</span></div>' : ''}
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                  <div class="grid-title">Detalles del Movimiento</div>
                  <div class="grid-body">
                    <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">${dateStr}</span></div>
                    <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">CARGO A FIADO</span></div>
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
                  <b>CONFORMIDAD:</b> Acepto el cargo realizado a mi cuenta y me comprometo a pagar el saldo pendiente según las condiciones establecidas.
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
                  <div class="total-row"><span class="data-label">Subtotal:</span><span class="data-value">${sym}${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO FIADO:</span><span>${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                </div>
              </td>
            </tr>
          </table>
          <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
            <div class="bc-target" style="margin: 0 auto; display: flex; justify-content: center; height: 35px;"></div>
            <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${cargoId} *</div>
            <div class="footer-text" style="font-size: 9px; font-weight: 900; color: #000;">${footer}</div>
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

  const rows = items.map(i =>
    `<div class="kv"><span>${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span class="bold">${sym}${(i.price * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
  ).join('');
  const prevBalance = Math.max(0, newBalance - subtotal);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${pageSize};margin:${pageMargin}}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : '13'}px;font-weight:700;width:100%;margin:0;padding:${paddingCss};color:#000;background:#fff}
    .container{${containerStyle}}
    .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
    hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
    .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
    .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0;align-items:flex-start}
    .kv span:first-child{word-break:break-all;flex:1;min-width:0;text-align:left;padding-right:6px}
    .kv span:last-child{flex-shrink:0;text-align:right}
    .bold{font-weight:900}
    .total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
    .footer{font-size:9px;text-align:center;margin-top:5px}
  </style></head><body><div class="container">
    <div class="store">${storeName}</div>
    <hr>
    <span class="badge">💳 CARGO A FIADO</span>
    <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
    <div class="kv"><span>CLIENTE:</span><span class="bold">${clientName}</span></div>
    ${clientPhone ? `<div class="kv"><span>TEL:</span><span>${clientPhone}</span></div>` : ''}
    <hr>
    ${rows}
    <hr>
    <div class="total-row">CARGO DE HOY: ${sym}${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    ${prevBalance > 0 ? `
      <div class="kv" style="margin-top:2px"><span>SALDO ANTERIOR:</span><span>${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    ` : ''}
    <div class="kv" style="margin-top:3px;border-top:1px dashed #000;padding-top:2px"><span>SALDO PENDIENTE TOTAL:</span><span class="bold">${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="footer">${footer}</div>
  </div></body></html>`;
};

const buildFiadoTicket = (opts: {
  storeName: string; sym: string; paperWidth: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado';
  footer: string; clientName: string; clientPhone: string;
  tipo: 'ABONO' | 'LIQUIDACIÓN'; amount: number; method: string;
  prevBalance: number; newBalance: number; note?: string;
  offset?: number;
  config?: WorkshopConfig;
  id?: string;
}) => {
  const { storeName, sym, paperWidth, footer, clientName, clientPhone, tipo, amount, method, prevBalance, newBalance, note, offset = 0, config, id } = opts;
  const paymentId = id || 'PAGO';
  const bcScript = getBarcodeScript(paymentId, config?.barcodeAsImage);
  const is58 = paperWidth === '58mm';
  const isMediaCarta = paperWidth === 'media-carta';
  const isMediaCartaDuplicado = paperWidth === 'media-carta-duplicado';
  const rightPad = is58 ? '8mm' : '6mm';
  const leftPad = is58 ? '3mm' : '5mm';
  const pageSize = isMediaCarta ? '216mm 140mm' : isMediaCartaDuplicado ? '210mm 297mm' : `${paperWidth} auto`;
  const pageMargin = (isMediaCarta || isMediaCartaDuplicado) ? '0' : '2mm 1mm';
  const paddingCss = (isMediaCarta || isMediaCartaDuplicado) ? '6mm 8mm 0 8mm' : `2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px)`;
  const containerStyle = isMediaCarta ? 'width: 100%; height: 128mm; max-height: 128mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : isMediaCartaDuplicado ? 'width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;' : '';
  const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const liquidado = newBalance <= 0;

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
    const storeAddress = config?.address || '';
    const storeSlogan = config?.slogan || '';

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
                    <div class="data-row"><span class="data-label">Nombre:</span><span class="data-value">${clientName.toUpperCase()}</span></div>
                    ${clientPhone ? '              <div class="data-row"><span class="data-label">Teléfono:</span><span class="data-value">' + clientPhone + '</span></div>' : ''}
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 5px;">
                <div style="border: 1px solid #000; border-radius: 4px; overflow: hidden; height: 100%;">
                  <div class="grid-title">Detalles del Pago</div>
                  <div class="grid-body">
                    <div class="data-row"><span class="data-label">Fecha:</span><span class="data-value">${dateStr}</span></div>
                    <div class="data-row"><span class="data-label">Tipo:</span><span class="data-value">${tipo}</span></div>
                    <div class="data-row"><span class="data-label">Método:</span><span class="data-value">${method.toUpperCase()}</span></div>
                    ${note ? '              <div class="data-row"><span class="data-label">Referencia:</span><span class="data-value">' + note.toUpperCase() + '</span></div>' : ''}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>
        <div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed;">
            <tr>
              <td style="width: 55%; vertical-align: top; padding-right: 12px;">
                <div style="font-size: 8.5px; color: #475569; border: 1px solid #e2e8f0; padding: 6px; background: #f8fafc; border-radius: 4px;">
                  <b>RECIBO DE PAGO:</b> Se ha registrado el abono/pago de manera exitosa para el saldo de la cuenta del cliente indicado.
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
                  <div class="total-row"><span class="data-label">Saldo Anterior:</span><span class="data-value">${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="total-row"><span class="data-label">Monto Pagado:</span><span class="data-value">${sym}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div class="total-row grand-total" style="font-size: 11px; padding: 3px;"><span>SALDO RESTANTE:</span><span>${liquidado ? 'LIQUIDADO' : `${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span></div>
                </div>
                ${liquidado ? '<div style="font-size: 11px; font-weight: 900; color: #15803d; text-align: center; margin-top: 5px;">🎉 ¡CUENTA SALDADA!</div>' : ''}
              </td>
            </tr>
          </table>
          <div style="text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 6px;">
            <div class="bc-target" style="margin: 0 auto; display: flex; justify-content: center; height: 35px;"></div>
            <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-top: 1px; text-transform: uppercase;">* ${paymentId} *</div>
            <div class="footer-text" style="font-size: 9px; font-weight: 900; color: #000;">${footer}</div>
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{size:${pageSize};margin:${pageMargin}}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : '13'}px;font-weight:700;width:100%;margin:0;padding:${paddingCss};color:#000;background:#fff}
    .container{${containerStyle}}
    .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
    hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
    .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
    .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0}
    .bold{font-weight:900}
    .total-row{font-size:13px;font-weight:900;text-align:right;border-top:2px solid #000;margin-top:4px;padding-top:2px}
    .ok{font-size:12px;font-weight:900;text-align:center;margin-top:4px}
    .footer{font-size:9px;text-align:center;margin-top:5px}
  </style></head><body><div class="container">
    <div class="store">${storeName}</div>
    <hr>
    <span class="badge">💳 ${tipo}</span>
    <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
    <div class="kv"><span>CLIENTE:</span><span class="bold">${clientName}</span></div>
    ${clientPhone ? `<div class="kv"><span>TEL:</span><span>${clientPhone}</span></div>` : ''}
    <hr>
    <div class="kv"><span>SALDO ANTERIOR:</span><span>${sym}${prevBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="kv"><span>PAGO:</span><span class="bold">${sym}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="kv"><span>MÉTODO:</span><span>${method}</span></div>
    ${note ? `<div class="kv"><span>REF:</span><span>${note}</span></div>` : ''}
    <hr>
    <div class="total-row">SALDO RESTANTE: ${liquidado ? 'LIQUIDADO ✓' : `${sym}${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
    ${liquidado ? '<div class="ok">🎉 ¡CUENTA SALDADA!</div>' : ''}
    <div class="footer">${footer}</div>
  </div></body></html>`;
};

const CODE128_SCRIPT = `(function(){var C128=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];var START_B=104,STOP=106;function encode(s){var codes=[START_B],sum=START_B;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-32;codes.push(c);sum+=c*(i+1);}codes.push(sum%103);codes.push(STOP);return codes;}function draw(text){var codes=encode(text);var bw=2,h=40,x=10,bars=[];for(var i=0;i<codes.length;i++){var pat=C128[codes[i]];for(var j=0;j<pat.length;j++){if(j%2===0)bars.push({x:x,w:pat[j]*bw});x+=pat[j]*bw;}}var tw=x+10;var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+tw+'" height="'+(h+12)+'" shape-rendering="crispEdges" style="display:block;margin:0 auto">';for(var k=0;k<bars.length;k++){svg+='<rect x="'+bars[k].x+'" y="0" width="'+bars[k].w+'" height="'+h+'" fill="black" shape-rendering="crispEdges"/>';}var escapedText=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");svg+='<text x="'+(tw/2)+'" y="'+(h+10)+'" text-anchor="middle" font-family="monospace" font-size="9" fill="black">'+escapedText+'</text>';svg+='</svg>';document.getElementById('bc').innerHTML=svg;}draw('__ID__');})();`;



export default function FiadosView({
  accounts,
  inventory,
  refacciones = [],
  config,
  currentUser,
  users,
  clients = [],
  onCreateAccount,
  onAddEntry,
  onAddPayment,
  onDeleteAccount,
  apartados,
  onCreateApartado,
  onAddApartadoPayment,
  onUpdateApartadoStatus,
  initialSelectedAccountId,
  initialSelectedApartadoId,
  initialActiveTab,
  highlightedEntryId,
  highlightedApartadoId,
  onClearNavigationStates,
}: Props) {
  const sym = config.currencySymbol || '$';
  const isRetro = config.theme === 'retro-window';
  let effectivePaperWidth = (config.hybridPrintMode
    ? (config.posPaperWidth || '80mm')
    : (config.ticketPaperWidth || '80mm')) as any;
  if (effectivePaperWidth === 'media-carta' || effectivePaperWidth === 'media-carta-duplicado') {
    effectivePaperWidth = '80mm';
  }
  const targetPrinter = config.hybridPrintMode
    ? (config.posPrinterBrand || config.ticketPrinterBrand || '')
    : (config.ticketPrinterBrand || '');
  const isLight = config.themeMode === 'light';

  // Combined inventory and refacciones for credit search
  const combinedItems = React.useMemo(() => {
    const activeRef = refacciones.filter(r => r.active !== false);
    const surrogateRef: InventoryItem[] = activeRef.map(r => ({
      id: r.id,
      code: r.code || '',
      name: `[REFACCIÓN] ${r.name.toUpperCase()} (${(r.deviceBrand || '').toUpperCase()} ${(r.deviceModel || '').toUpperCase()})`,
      brand: r.brand,
      category: r.category || 'Refacciones',
      stock: r.stock,
      minStock: r.minStock || 0,
      price: r.price,
      wholesalePrice: r.wholesalePrice,
      cost: r.cost || 0,
      imageUrl: r.imageUrl,
      extraImages: r.extraImages,
      favorite: !!r.favorite,
      reservedQty: 0,
      manageStock: r.manageStock !== false,
      warehouseStock: r.warehouseStock,
      isChip: false,
    }));
    return [...inventory, ...surrogateRef];
  }, [inventory, refacciones]);

  // Main tab switcher
  const [mainTab, setMainTab] = useState<'fiados' | 'apartados'>('fiados');

  const [waConnected, setWaConnected] = useState<boolean>(() => {
    return (window as any).whatsappConnected || false;
  });

  useEffect(() => {
    const handleStatus = (e: Event) => {
      setWaConnected((e as CustomEvent).detail);
    };
    window.addEventListener('whatsapp-status-update', handleStatus);
    
    // Also check status right away
    const api = (window as any).electronAPI;
    if (api && api.whatsappGetStatus) {
      api.whatsappGetStatus().then((info: any) => {
        const isConnected = info && info.status === 'CONNECTED';
        (window as any).whatsappConnected = isConnected;
        setWaConnected(isConnected);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('whatsapp-status-update', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (initialActiveTab) {
      setMainTab(initialActiveTab);
    }
    if (initialSelectedAccountId) {
      setSelectedId(initialSelectedAccountId);
      setFilter('todos');
    }
    if (initialSelectedApartadoId) {
      setSelectedAptId(initialSelectedApartadoId);
      setAptFilter('todos');
    }
    
    if (highlightedEntryId) {
      setLocalHighlightedEntryId(highlightedEntryId);
      const t = setTimeout(() => setLocalHighlightedEntryId(null), 2500);
      onClearNavigationStates?.();
      return () => clearTimeout(t);
    }
    
    if (highlightedApartadoId) {
      setLocalHighlightedApartadoId(highlightedApartadoId);
      const t = setTimeout(() => setLocalHighlightedApartadoId(null), 2500);
      onClearNavigationStates?.();
      return () => clearTimeout(t);
    }
  }, [initialSelectedAccountId, initialSelectedApartadoId, initialActiveTab, highlightedEntryId, highlightedApartadoId]);

  const isWaIntegratedOffline = !waConnected;

  // Apartados state
  const [aptSearch, setAptSearch] = useState('');
  const [aptFilter, setAptFilter] = useState<'Activo' | 'Listo' | 'Entregado' | 'Cancelado' | 'todos'>('Activo');
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [aptModal, setAptModal] = useState<'nuevo' | 'abonar' | null>(null);
  const [localHighlightedEntryId, setLocalHighlightedEntryId] = useState<string | null>(null);
  const [localHighlightedApartadoId, setLocalHighlightedApartadoId] = useState<string | null>(null);
  const [aptCancelStep, setAptCancelStep] = useState<'pin' | 'confirm' | null>(null);
  const [aptCancelPin, setAptCancelPin] = useState('');
  const [aptCancelPinError, setAptCancelPinError] = useState('');

  // Nuevo apartado form
  const [aptClientName, setAptClientName] = useState('');
  const [aptClientPhone, setAptClientPhone] = useState('');
  const [aptDueDate, setAptDueDate] = useState('');
  const [aptNotes, setAptNotes] = useState('');
  const [aptFormItems, setAptFormItems] = useState<{ itemId?: string; name: string; price: string; quantity: string }[]>([{ name: '', price: '', quantity: '1' }]);
  const [aptItemSearch, setAptItemSearchRaw] = useState('');
  const setAptItemSearch = (val: string) => {
    setAptItemSearchRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [aptItemSearchIdx, setAptItemSearchIdx] = useState<number | null>(null);
  const [aptInitialAmount, setAptInitialAmount] = useState('');
  const [aptInitialMethod, setAptInitialMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');

  // Abonar apartado
  const [aptAbonoAmount, setAptAbonoAmount] = useState('');
  const [aptAbonoMethod, setAptAbonoMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [aptAbonoNote, setAptAbonoNote] = useState('');
  const [aptAbonoTargetItemId, setAptAbonoTargetItemId] = useState<string | null>(null);
  const [aptAbonoItemQtyToPay, setAptAbonoItemQtyToPay] = useState(1);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'activos' | 'cerrados' | 'todos' | 'eliminados'>('activos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modals
  const [modal, setModal] = useState<'abonar' | 'pagar' | 'agregar' | 'nuevo' | null>(null);

  const [abonoEfectivo, setAbonoEfectivo] = useState('');
  const [abonoTarjeta, setAbonoTarjeta] = useState('');
  const [abonoRef, setAbonoRef] = useState('');
  const [abonoTargetEntryId, setAbonoTargetEntryId] = useState<string | null>(null);
  const [abonoTargetItemId, setAbonoTargetItemId] = useState<string | null>(null);
  const [abonoItemQtyToPay, setAbonoItemQtyToPay] = useState(1);

  // Pagar deuda completa — pago mixto
  const [pagoEfectivo, setPagoEfectivo] = useState('');
  const [pagoTarjeta, setPagoTarjeta] = useState('');
  const [pagoRef, setPagoRef] = useState('');

  // Paso de confirmación antes de registrar
  const [confirmStep, setConfirmStep] = useState(false);

  // Eliminar fiado
  const [deleteStep, setDeleteStep] = useState<'pin' | 'confirm' | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deletePinError, setDeletePinError] = useState('');

  const fiadosSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const apartadosSearchInputRef = React.useRef<HTMLInputElement | null>(null);

  const anyModalOrDetailOpen = 
    selectedId !== null || 
    selectedAptId !== null || 
    modal !== null ||
    aptModal !== null ||
    confirmStep;

  React.useEffect(() => {
    if (!anyModalOrDetailOpen) {
      const timer = setTimeout(() => {
        if (mainTab === 'fiados') {
          fiadosSearchInputRef.current?.focus();
        } else {
          apartadosSearchInputRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mainTab, anyModalOrDetailOpen]);


  // Agregar artículos
  const [itemSearch, setItemSearchRaw] = useState('');
  const setItemSearch = (val: string) => {
    setItemSearchRaw(val.replace(/,(?!\s)/g, '-'));
  };
  const [itemHighlight, setItemHighlight] = useState(0);
  const [itemsToAdd, setItemsToAdd] = useState<{ itemId: string; name: string; qty: number; price: number }[]>([]);
  const itemHighlightRef = React.useRef(0);
  const filteredInventoryRef = React.useRef<typeof inventory>([]);
  const searchInputRef2 = React.useRef<HTMLInputElement | null>(null);
  const itemRowRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    itemRowRefs.current.forEach((el, idx) => {
      if (!el) return;
      if (idx === itemHighlight) {
        el.style.setProperty('background-color', '#2563eb', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
      } else {
        el.style.removeProperty('background-color');
        el.style.removeProperty('color');
      }
    });
  }, [itemHighlight, itemSearch]);

  // Nuevo fiado
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // WhatsApp and Print settings for credit/layaway transactions
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [printTicket, setPrintTicket] = useState(true);

  const togglePrintTicket = () => {
    setPrintTicket(prev => {
      const next = !prev;
      if (next) setSendWhatsapp(false);
      return next;
    });
  };

  const toggleSendWhatsapp = () => {
    setSendWhatsapp(prev => {
      const next = !prev;
      if (next) setPrintTicket(false);
      else setPrintTicket(true);
      return next;
    });
  };

  React.useEffect(() => {
    setSendWhatsapp(false);
    setPrintTicket(true);
  }, [modal, aptModal]);

  const renderPrintAndWhatsappOptions = () => {
    return (
      <div className="flex flex-col gap-2 mt-1">
        <label className={`flex items-center gap-3 cursor-pointer select-none px-2.5 py-1.5 rounded-xl border ${
          isRetro ? 'bg-[#dfdfdf] border-zinc-500 text-black'
          : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-750'
          : 'bg-zinc-800/35 border-zinc-800/80 text-zinc-300'
        }`}>
          <span className={`p-1 rounded-full h-6 w-6 flex items-center justify-center border shrink-0 ${
            isRetro ? 'bg-emerald-100 border-emerald-350 text-emerald-800'
            : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <Printer className="w-3.5 h-3.5" />
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wider flex-1 ${
            isRetro ? 'text-zinc-800 font-mono'
            : isLight ? 'text-zinc-650'
            : 'text-zinc-300'
          }`}>Imprimir ticket</span>
          <input 
            type="checkbox" 
            checked={printTicket} 
            onChange={togglePrintTicket}
            className="w-4 h-4 rounded cursor-pointer accent-emerald-500" 
          />
        </label>

        {config.whatsappMode && config.whatsappMode !== 'disabled' && (
          <label 
            title={isWaIntegratedOffline ? "WhatsApp desvinculado. Escanea el código QR en el menú de chat" : undefined}
            onClick={isWaIntegratedOffline ? (e) => { e.preventDefault(); window.alert('⚠️ WhatsApp desvinculado. Escanea el código QR en el menú de chat para continuar.'); } : undefined}
            className={`flex items-center gap-3 select-none px-2.5 py-1.5 rounded-xl border transition-all ${
              isWaIntegratedOffline 
                ? 'opacity-40 grayscale cursor-pointer' 
                : 'cursor-pointer'
            } ${
              isRetro ? 'bg-[#dfdfdf] border-zinc-500 text-black'
              : isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-750'
              : 'bg-zinc-800/35 border-zinc-800/80 text-zinc-300'
            }`}
          >
            <span className={`p-1 rounded-full h-6 w-6 flex items-center justify-center border shrink-0 ${
              isRetro ? 'bg-emerald-100 border-emerald-350 text-emerald-800'
              : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              💬
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider flex-1 ${
              isRetro ? 'text-zinc-800 font-mono'
              : isLight ? 'text-zinc-650'
              : 'text-zinc-300'
            }`}>Enviar por WhatsApp</span>
            <input 
              type="checkbox" 
              checked={!isWaIntegratedOffline && sendWhatsapp} 
              disabled={isWaIntegratedOffline}
              onChange={toggleSendWhatsapp}
              className="w-4 h-4 rounded cursor-pointer accent-emerald-500 pointer-events-none" 
            />
          </label>
        )}
      </div>
    );
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getBalance = (a: CreditAccount) => {
    const debt = a.entries.reduce((s, e) => s + e.subtotal, 0);
    const paid = a.payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, debt - paid);
  };

  const isAlert = (a: CreditAccount) => {
    if (getBalance(a) === 0) return false;
    const days = (Date.now() - new Date(a.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    return days >= (a.alertAfterDays ?? 7);
  };

  // ─── Apartados helpers ───────────────────────────────────────────────────────
  const genAptId = () => `APT-${Date.now().toString(36).toUpperCase()}`;

  const aptBalance = (a: ApartadoEntry) => Math.max(0, a.totalValue - a.payments.reduce((s, p) => s + p.amount, 0));

  const filteredApartados = useMemo(() => apartados.filter(a => {
    const matchText = a.clientName.toLowerCase().includes(aptSearch.toLowerCase()) ||
      (a.clientPhone || '').includes(aptSearch);
    if (aptFilter === 'todos') return matchText;
    return matchText && a.status === aptFilter;
  }), [apartados, aptSearch, aptFilter]);

  const selectedApt = apartados.find(a => a.id === selectedAptId) ?? null;

  const aptInventoryFiltered = inventory.filter(i => {
    const cleanSearch = aptItemSearch.replace(/,(?!\s)/g, '-');
    return i.name.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      (i.code && i.code.toLowerCase().includes(cleanSearch.toLowerCase()));
  }).slice(0, 8);

  const aptTotalValue = aptFormItems.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 0), 0);

  const handleSubmitNuevoApartado = () => {
    if (!aptClientName.trim()) return;
    const items = aptFormItems.filter(i => i.name.trim() && parseFloat(i.price) > 0 && parseInt(i.quantity) > 0);
    if (items.length === 0) return;
    const initialAmt = parseFloat(aptInitialAmount);
    if (!initialAmt || initialAmt <= 0) return;
    const totalValue = items.reduce((s, i) => s + parseFloat(i.price) * parseInt(i.quantity), 0);
    const firstPayment: ApartadoPayment = {
      id: genAptId(),
      date: new Date().toISOString(),
      amount: initialAmt,
      method: aptInitialMethod,
    };
    const newStatus: ApartadoEntry['status'] = initialAmt >= totalValue ? 'Listo' : 'Activo';
    const newApt: ApartadoEntry = {
      id: genAptId(),
      clientName: aptClientName.trim().toUpperCase(),
      clientPhone: aptClientPhone.trim() || undefined,
      items: items.map(i => ({ itemId: i.itemId, name: i.name.trim(), price: parseFloat(i.price), quantity: parseInt(i.quantity) })),
      totalValue,
      payments: [firstPayment],
      status: newStatus,
      createdAt: new Date().toISOString(),
      dueDate: aptDueDate || undefined,
      notes: aptNotes.trim() || undefined,
    };
    onCreateApartado(newApt);
    const paperWidth = effectivePaperWidth;
    if (printTicket) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(buildApartadoTicketHtml({
        apartado: newApt,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym, paperWidth, footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      }), paperWidthMicrons, targetPrinter, `Apartado — ${newApt.clientName}`, undefined, paperHeightMicrons);
    }
    if (sendWhatsapp && newApt.clientPhone) {
      const msg = buildWhatsappApartadoMessage(newApt, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildApartadoTicketHtml({
        apartado: newApt,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym, paperWidth: whatsappPaperWidth, footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      });
      sendWhatsappNotification(config, newApt.clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending new layaway:', err);
      });
    }
    // Reset form
    setAptClientName(''); setAptClientPhone(''); setAptDueDate(''); setAptNotes('');
    setAptFormItems([{ name: '', price: '', quantity: '1' }]);
    setAptInitialAmount(''); setAptInitialMethod('Efectivo');
    setAptModal(null);
    setSelectedAptId(newApt.id);
  };

  const openAptAbonoModal = (defaultAmount?: number, defaultNote?: string, itemId?: string) => {
    setAptAbonoAmount(defaultAmount ? defaultAmount.toString() : '');
    setAptAbonoMethod('Efectivo');
    setAptAbonoNote(defaultNote || '');
    setAptAbonoTargetItemId(itemId || null);
    
    let initialQty = 1;
    if (selectedApt && itemId) {
      const item = selectedApt.items.find(it => it.itemId === itemId);
      if (item && item.quantity > 1) {
        const itemPayments = selectedApt.payments.filter(p => p.itemId === itemId);
        const totalPaid = itemPayments.reduce((s, p) => s + p.amount, 0);
        const paidUnits = Math.floor(totalPaid / item.price);
        
        initialQty = 1;
        setAptAbonoAmount(item.price.toString());
        setAptAbonoNote(`Pago de: 1x ${item.name}`);
      }
    }
    setAptAbonoItemQtyToPay(initialQty);
    setAptModal('abonar');
  };

  const handleAbonarApartado = () => {
    if (!selectedApt) return;
    const amount = parseFloat(aptAbonoAmount);
    if (!amount || amount <= 0) return;
    const payment: ApartadoPayment = {
      id: genAptId(),
      date: new Date().toISOString(),
      amount,
      method: aptAbonoMethod,
      note: aptAbonoNote.trim() || undefined,
      itemId: aptAbonoTargetItemId || undefined,
    };
    onAddApartadoPayment(selectedApt.id, payment);
    const bal = aptBalance(selectedApt);
    const paperWidth = effectivePaperWidth;
    const updatedApt = { ...selectedApt, payments: [...selectedApt.payments, payment], status: (amount >= bal ? 'Listo' : selectedApt.status) as ApartadoEntry['status'] };
    if (printTicket) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(buildApartadoTicketHtml({
        apartado: updatedApt,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym, paperWidth, footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      }), paperWidthMicrons, targetPrinter, `Abono Apartado — ${selectedApt.clientName}`, undefined, paperHeightMicrons);
    }
    if (sendWhatsapp && selectedApt.clientPhone) {
      const msg = buildWhatsappApartadoAbonoMessage(updatedApt, payment, Math.max(0, updatedApt.totalValue - updatedApt.payments.reduce((s, p) => s + p.amount, 0)), config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildApartadoTicketHtml({
        apartado: updatedApt,
        storeName: config.storeName || 'TALLER',
        phone: config.phone || '',
        address: config.address || '',
        sym, paperWidth: whatsappPaperWidth, footer: config.ticketFooter || '¡Gracias!',
        offset: config.ticketMarginOffset || 0,
        config,
      });
      sendWhatsappNotification(config, selectedApt.clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending layaway abono:', err);
      });
    }
    setAptAbonoAmount(''); setAptAbonoNote('');
    setAptAbonoTargetItemId(null);
    setAptModal(null);
  };

  const selectedAccount = accounts.find(a => a.id === selectedId) ?? null;
  const selectedBalance = selectedAccount ? getBalance(selectedAccount) : 0;

  const filtered = useMemo(() => accounts.filter(a => {
    const match = a.clientName.toLowerCase().includes(search.toLowerCase()) || a.clientPhone.includes(search);
    const bal = getBalance(a);
    if (filter === 'eliminados') return match && !!a.deletedAt;
    if (filter === 'activos') return match && !a.deletedAt && bal > 0;
    if (filter === 'cerrados') return match && !a.deletedAt && bal === 0;
    return match && !a.deletedAt;
  }), [accounts, search, filter]);

  const totalDeuda = accounts.reduce((s, a) => s + getBalance(a), 0);

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const bg = isRetro ? 'bg-[#eaeef3]' : isLight ? 'bg-zinc-50' : 'bg-[#0c0d11]';
  const cardBg = isRetro ? 'bg-white border-2 border-zinc-300' : isLight ? 'bg-white border border-zinc-200' : 'bg-zinc-900 border border-zinc-800';
  const textMain = isRetro ? 'text-zinc-900' : isLight ? 'text-zinc-900' : 'text-white';
  const textSub = isRetro ? 'text-zinc-500' : isLight ? 'text-zinc-500' : 'text-zinc-400';
  const divider = isRetro ? 'border-zinc-200' : isLight ? 'border-zinc-100' : 'border-zinc-800';
  const hoverRow = isRetro ? 'hover:bg-zinc-50' : isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-800/40';
  const inputCls = isRetro
    ? 'bg-white border-2 border-zinc-400 text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal rounded px-3 py-2 text-sm outline-none focus:border-[#000080] w-full'
    : isLight
    ? 'bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 w-full'
    : 'bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 placeholder:font-normal rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 w-full';

  const btnPrimary = isRetro
    ? 'bg-[#000080] text-white font-black text-xs uppercase px-4 py-2 cursor-pointer border-2 border-t-[#4040c0] border-l-[#4040c0] border-b-[#00004a] border-r-[#00004a] active:scale-95'
    : isLight
    ? 'bg-[#1a3a6b] hover:bg-[#14306b] text-white font-black text-xs uppercase px-4 py-2 rounded-lg cursor-pointer active:scale-95'
    : 'bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase px-4 py-2 rounded-lg cursor-pointer active:scale-95';

  const headerBg = `modal-dark-header ${isRetro ? 'bg-[#000080]' : isLight ? 'bg-[#1a3a6b]' : 'bg-[#11131e]'}`;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const openModal = (m: 'abonar' | 'pagar' | 'agregar', defaultAmount?: number, defaultNote?: string, entryId?: string, itemId?: string) => {
    setConfirmStep(false);
    setModal(m);
    if (m === 'pagar') {
      setPagoEfectivo(selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setPagoTarjeta('');
      setPagoRef('');
      setTimeout(() => { const el = document.getElementById('pago-efectivo') as HTMLInputElement; el?.focus(); el?.select(); }, 100);
    }
    if (m === 'abonar') {
      setAbonoTargetEntryId(entryId || null);
      setAbonoTargetItemId(itemId || null);
      
      let initialQty = 1;
      let initialAmt = defaultAmount || 0;
      let initialNote = defaultNote || '';

      if (entryId && itemId && selectedAccount) {
        const entry = selectedAccount.entries.find(e => e.id === entryId);
        const item = entry?.items.find(it => it.itemId === itemId);
        if (item && item.quantity > 1) {
          const itemPayments = selectedAccount.payments.filter(p => p.entryId === entryId && p.itemId === itemId);
          const totalPaid = itemPayments.reduce((s, p) => s + p.amount, 0);
          const paidUnits = Math.floor(totalPaid / item.price);
          
          initialQty = 1;
          initialAmt = item.price;
          initialNote = `Pago de: 1x ${item.name}`;
        }
      }

      setAbonoItemQtyToPay(initialQty);
      setAbonoEfectivo(initialAmt ? initialAmt.toString() : '');
      setAbonoTarjeta('');
      setAbonoRef(initialNote);
      setTimeout(() => { const el = document.getElementById('abono-efectivo') as HTMLInputElement; el?.focus(); el?.select(); }, 100);
    }
    if (m === 'agregar') {
      setTimeout(() => searchInputRef2.current?.focus(), 100);
    }
  };

  const mixedTotal = (ef: string, tar: string) => (Number(ef) || 0) + (Number(tar) || 0);

  const mixedMethodLabel = (ef: string, tar: string) => {
    const e = Number(ef) || 0;
    const t = Number(tar) || 0;
    if (e > 0 && t > 0) return 'Mixto (Efectivo + Tarjeta/Transfer)';
    if (t > 0) return 'Tarjeta/Transfer';
    return 'Efectivo';
  };

  const confirmAbono = () => {
    if (!selectedAccount) return;
    const amt = mixedTotal(abonoEfectivo, abonoTarjeta);
    if (!amt || amt <= 0 || amt > selectedBalance) return;
    const newBalance = Math.max(0, selectedBalance - amt);
    const method = mixedMethodLabel(abonoEfectivo, abonoTarjeta);
    
    const codes: string[] = [];
    if (Number(abonoEfectivo) > 0) codes.push(`Efe: $${Number(abonoEfectivo)}`);
    if (Number(abonoTarjeta) > 0) codes.push(`T/T: $${Number(abonoTarjeta)}`);
    if (abonoRef.trim()) codes.push(`Ref: ${abonoRef.trim()}`);
    const noteString = codes.join(' | ') || undefined;

    const paymentId = genId();
    onAddPayment(selectedAccount.id, { 
      id: paymentId, 
      createdAt: new Date().toISOString(), 
      amount: amt, 
      method, 
      note: noteString,
      entryId: abonoTargetEntryId || undefined,
      itemId: abonoTargetItemId || undefined
    });
    const paperWidth = effectivePaperWidth;
    if (printTicket) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(buildFiadoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth, footer: config.ticketFooter || '¡Gracias por su pago!',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        tipo: 'ABONO', amount: amt, method,
        prevBalance: selectedBalance, newBalance, note: noteString,
        offset: config.ticketMarginOffset || 0,
        config,
        id: paymentId,
      }), paperWidthMicrons, targetPrinter, `Abono — ${selectedAccount.clientName}`, `${sym}${amt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${method}`, paperHeightMicrons);
    }
    if (sendWhatsapp && selectedAccount.clientPhone) {
      const msg = buildWhatsappFiadoAbonoMessage(selectedAccount, 'ABONO', amt, selectedBalance, newBalance, noteString, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildFiadoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth: whatsappPaperWidth, footer: config.ticketFooter || '¡Gracias por su pago!',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        tipo: 'ABONO', amount: amt, method,
        prevBalance: selectedBalance, newBalance, note: noteString,
        offset: config.ticketMarginOffset || 0,
        config,
        id: paymentId,
      });
      sendWhatsappNotification(config, selectedAccount.clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending abono fiado:', err);
      });
    }
    setAbonoEfectivo(''); setAbonoTarjeta(''); setAbonoRef('');
    setAbonoTargetEntryId(null);
    setAbonoTargetItemId(null);
    setModal(null);
    if (amt >= selectedBalance) setSelectedId(null);
  };

  const confirmPago = () => {
    if (!selectedAccount) return;
    const amt = mixedTotal(pagoEfectivo, pagoTarjeta);
    if (!amt || amt <= 0 || amt > selectedBalance) return;
    const newBalance = Math.max(0, selectedBalance - amt);
    const method = mixedMethodLabel(pagoEfectivo, pagoTarjeta);

    const codes: string[] = [];
    if (Number(pagoEfectivo) > 0) codes.push(`Efe: $${Number(pagoEfectivo)}`);
    if (Number(pagoTarjeta) > 0) codes.push(`T/T: $${Number(pagoTarjeta)}`);
    if (pagoRef.trim()) codes.push(`Ref: ${pagoRef.trim()}`);
    const noteString = codes.join(' | ') || undefined;

    const paymentId = genId();
    onAddPayment(selectedAccount.id, { id: paymentId, createdAt: new Date().toISOString(), amount: amt, method, note: noteString });
    const paperWidth = effectivePaperWidth;
    if (printTicket) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(buildFiadoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth, footer: config.ticketFooter || '¡Gracias por su pago!',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        tipo: 'LIQUIDACIÓN', amount: amt, method,
        prevBalance: selectedBalance, newBalance, note: noteString,
        offset: config.ticketMarginOffset || 0,
        config,
        id: paymentId,
      }), paperWidthMicrons, targetPrinter, `Liquidación — ${selectedAccount.clientName}`, `${sym}${amt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${method}`, paperHeightMicrons);
    }
    if (sendWhatsapp && selectedAccount.clientPhone) {
      const msg = buildWhatsappFiadoAbonoMessage(selectedAccount, 'LIQUIDACIÓN', amt, selectedBalance, newBalance, noteString, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildFiadoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth: whatsappPaperWidth, footer: config.ticketFooter || '¡Gracias por su pago!',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        tipo: 'LIQUIDACIÓN', amount: amt, method,
        prevBalance: selectedBalance, newBalance, note: noteString,
        offset: config.ticketMarginOffset || 0,
        config,
        id: paymentId,
      });
      sendWhatsappNotification(config, selectedAccount.clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending payment liquidation:', err);
      });
    }
    setPagoEfectivo(''); setPagoTarjeta(''); setPagoRef(''); setModal(null);
    if (amt >= selectedBalance) setSelectedId(null);
  };

  const confirmAgregarItems = () => {
    if (!selectedAccount || itemsToAdd.length === 0) return;
    const subtotal = itemsToAdd.reduce((s, i) => s + i.qty * i.price, 0);
    const entry: CreditSaleEntry = {
      id: genId(),
      createdAt: new Date().toISOString(),
      items: itemsToAdd.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.qty, price: i.price })),
      subtotal,
    };
    onAddEntry(selectedAccount.id, entry, true);
    const prevBalance = selectedBalance;
    const newBalance = prevBalance + subtotal;
    const paperWidth = effectivePaperWidth;
    if (printTicket) {
      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(buildFiadoCargoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth, footer: config.ticketFooter || '',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        items: itemsToAdd.map(i => ({ name: i.name, quantity: i.qty, price: i.price })),
        subtotal, newBalance,
        offset: config.ticketMarginOffset || 0,
        config,
        id: entry.id,
      }), paperWidthMicrons, targetPrinter, `Cargo Fiado — ${selectedAccount.clientName}`, `${sym}${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, paperHeightMicrons);
    }
    if (sendWhatsapp && selectedAccount.clientPhone) {
      const msg = buildWhatsappFiadoCargoMessage(selectedAccount, entry, newBalance, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildFiadoCargoTicket({
        storeName: (config.storeName || 'TALLER').toUpperCase(),
        sym, paperWidth: whatsappPaperWidth, footer: config.ticketFooter || '',
        clientName: selectedAccount.clientName, clientPhone: selectedAccount.clientPhone,
        items: itemsToAdd.map(i => ({ name: i.name, quantity: i.qty, price: i.price })),
        subtotal, newBalance,
        offset: config.ticketMarginOffset || 0,
        config,
        id: entry.id,
      });
      sendWhatsappNotification(config, selectedAccount.clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending cargo fiado:', err);
      });
    }
    setItemsToAdd([]); setItemSearch(''); setModal(null);
  };

  const confirmNuevo = () => {
    if (!newName.trim() || !newPhone.trim() || !newCreditLimit.trim()) return;
    const clientName = newName.trim().toUpperCase();
    const clientPhone = newPhone.trim();
    const creditLimit = Number(newCreditLimit);
    const accountId = genId();

    const account: CreditAccount = {
      id: accountId,
      clientName,
      clientPhone,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      entries: [], payments: [], isClosed: false, alertAfterDays: 7,
      creditLimit,
    };

    onCreateAccount(account);

    const paperWidth = effectivePaperWidth;
    const offset = config.ticketMarginOffset || 0;
    const dateStr = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const buildAperturaHtml = (pw: '58mm' | '80mm' | 'media-carta' | 'media-carta-duplicado') => {
      const is58 = pw === '58mm';
      const isMediaCarta = pw === 'media-carta';
      const isMediaCartaDuplicado = pw === 'media-carta-duplicado';
      const isWide = isMediaCarta || isMediaCartaDuplicado;
      const rightPad = is58 ? '8mm' : '6mm';
      const leftPad = is58 ? '3mm' : '5mm';
      const pageSize = isMediaCarta ? '216mm 140mm' : isMediaCartaDuplicado ? '210mm 297mm' : `${pw} auto`;
      const pageMargin = isWide ? '6mm 8mm' : '2mm 1mm';
      const paddingCss = isWide ? '0' : `2mm calc(${rightPad} - ${offset}px) 2mm calc(${leftPad} + ${offset}px)`;
      const containerStyle = isMediaCarta ? 'max-width: 120mm; margin: 0 auto;' : isMediaCartaDuplicado ? 'width: 100%; height: 141mm; max-height: 141mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; margin: 0 auto;' : '';
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page{size:${pageSize};margin:${pageMargin}}
        *{box-sizing:border-box}
        body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:${is58 ? '11' : '13'}px;font-weight:700;width:100%;margin:0;padding:${paddingCss};color:#000;background:#fff}
        .container{${containerStyle}}
        .store{font-size:15px;font-weight:900;text-align:center;margin-bottom:1px}
        hr{border:none;border-top:1.5px dashed #000;margin:4px 0}
        .badge{display:block;font-weight:900;text-align:center;font-size:13px;background:#000;color:#fff;padding:2px 0;margin:3px 0}
        .kv{display:flex;justify-content:space-between;font-size:10px;margin:1px 0}
        .footer{font-size:9px;text-align:center;margin-top:5px}
      </style></head><body><div class="container">
        <div class="store">${(config.storeName || 'TALLER').toUpperCase()}</div>
        <hr>
        <span class="badge">💳 APERTURA DE CUENTA FIADO</span>
        <div class="kv"><span>FECHA:</span><span>${dateStr}</span></div>
        <div class="kv"><span>CLIENTE:</span><span style="font-weight:900">${clientName}</span></div>
        ${clientPhone ? `<div class="kv"><span>TEL:</span><span>${clientPhone}</span></div>` : ''}
        <hr>
        <div style="text-align:center;font-size:10px;margin:3px 0">Cuenta registrada. Saldo inicial: ${config.currencySymbol || '$'}0.00</div>
        <div class="footer">${config.ticketFooter || ''}</div>
      </div></body></html>`;
    };

    if (printTicket) {
      const html = buildAperturaHtml(paperWidth);
      const paperWidthMicrons = paperWidth === '58mm' ? 48000 : paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : 72000;
      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
      fmPrint(html, paperWidthMicrons, targetPrinter, `Apertura Fiado — ${clientName}`, undefined, paperHeightMicrons);
    }
    if (sendWhatsapp && clientPhone) {
      const msg = buildWhatsappFiadoAperturaMessage(account, config);
      const whatsappPaperWidth = (paperWidth === 'media-carta' || paperWidth === 'media-carta-duplicado') ? 'media-carta' : paperWidth;
      const html = buildAperturaHtml(whatsappPaperWidth);
      sendWhatsappNotification(config, clientPhone, msg, html, true, undefined, undefined, true).catch(err => {
        console.error('[WhatsApp] Error sending account opening:', err);
      });
    }
    setNewName(''); setNewPhone(''); setNewCreditLimit(''); setModal(null);
  };

  const filteredInventory = combinedItems.filter(i => {
    const cleanSearch = itemSearch.replace(/,(?!\s)/g, '-');
    return i.name.toLowerCase().includes(cleanSearch.toLowerCase()) ||
      (i.code && i.code.toLowerCase().includes(cleanSearch.toLowerCase()));
  }).slice(0, 8);
  filteredInventoryRef.current = filteredInventory;

  const handleItemSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = filteredInventoryRef.current.length;
    if (count === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (itemHighlightRef.current + 1) % count;
      itemHighlightRef.current = next;
      setItemHighlight(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (itemHighlightRef.current - 1 + count) % count;
      itemHighlightRef.current = next;
      setItemHighlight(next);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredInventoryRef.current[itemHighlightRef.current];
      if (!item) return;
      const exists = itemsToAdd.find(i => i.itemId === item.id);
      if (exists) setItemsToAdd(prev => prev.map(i => i.itemId === item.id ? { ...i, qty: i.qty + 1 } : i));
      else setItemsToAdd(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: item.price }]);
      setItemSearch('');
      setItemHighlight(0); itemHighlightRef.current = 0;
      setTimeout(() => searchInputRef2.current?.focus(), 50);
    }
  };

  const openDeleteModal = () => {
    setDeletePin('');
    setDeletePinError('');
    const isEmployee = currentUser && currentUser.role !== 'admin';
    if (selectedBalance > 0) {
      setDeleteStep('pin');
    } else {
      setDeleteStep(isEmployee ? 'pin' : 'confirm');
    }
  };

  const verifyDeletePin = () => {
    const admins = users.filter(u => u.role === 'admin');
    const ok = admins.some(u => u.pin === deletePin);
    if (!ok) { setDeletePinError('PIN incorrecto.'); return; }
    setDeletePinError('');
    setDeleteStep('confirm');
  };

  const executeDelete = () => {
    if (!selectedAccount) return;
    onDeleteAccount(selectedAccount.id);
    setSelectedId(null);
    setDeleteStep(null);
    setDeletePin('');
  };

  const openAptCancelModal = () => {
    setAptCancelPin('');
    setAptCancelPinError('');
    setAptCancelStep('pin');
  };

  const verifyAptCancelPin = () => {
    const admins = users.filter(u => u.role === 'admin');
    const ok = admins.some(u => u.pin === aptCancelPin);
    if (!ok) { setAptCancelPinError('PIN incorrecto.'); return; }
    setAptCancelPinError('');
    setAptCancelStep('confirm');
  };

  const executeAptCancel = () => {
    if (!selectedApt) return;
    onUpdateApartadoStatus(selectedApt.id, 'Cancelado');
    setAptCancelStep(null);
    setAptCancelPin('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-full ${bg}`}>

      {/* Tab switcher */}
      <div className={`flex shrink-0 border-b ${isRetro ? 'border-zinc-300 bg-white' : isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'}`}>
        <button
          onClick={() => setMainTab('fiados')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase border-b-2 transition-colors cursor-pointer ${mainTab === 'fiados'
            ? isRetro ? 'border-[#000080] text-zinc-900' : isLight ? 'border-[#1a3a6b] text-zinc-900' : 'border-blue-500 text-white'
            : `border-transparent ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}`}>
          <CreditCard className="w-3.5 h-3.5" /> Fiados
        </button>
        <button
          onClick={() => setMainTab('apartados')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase border-b-2 transition-colors cursor-pointer ${mainTab === 'apartados'
            ? isRetro ? 'border-[#000080] text-zinc-900' : isLight ? 'border-[#1a3a6b] text-zinc-900' : 'border-blue-500 text-white'
            : `border-transparent ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}`}>
          <Package className="w-3.5 h-3.5" /> Apartados
          {apartados.filter(a => a.status === 'Activo' || a.status === 'Listo').length > 0 && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-400'}`}>
              {apartados.filter(a => a.status === 'Activo' || a.status === 'Listo').length}
            </span>
          )}
        </button>
      </div>

      {/* FIADOS TAB */}
      {mainTab === 'fiados' && <div className={`flex flex-1 overflow-hidden`}>

      {/* Panel izquierdo — lista de clientes */}
      <div className={`w-72 shrink-0 flex flex-col border-r ${divider} ${isRetro ? 'bg-white' : isLight ? 'bg-white' : 'bg-zinc-900/60'}`}>
        {/* Header lista */}
        <div className={`${headerBg} px-4 py-3 shrink-0`}
          ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-black uppercase tracking-widest text-white">💳 Fiados</span>
            <button onClick={() => setModal('nuevo')}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase bg-white/20 hover:bg-white/30 text-white rounded cursor-pointer">
              <Plus className="w-3 h-3" /> Nuevo
            </button>
          </div>
          <div className={`text-[10px] text-white/70`}>Total adeudado: <span className="font-black text-white">{sym}{totalDeuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>

        {/* Búsqueda y filtro */}
        <div className={`p-2 border-b ${divider} space-y-1.5 shrink-0`}>
          <div className="capsule-search-container">
            <Search className={`w-3.5 h-3.5 shrink-0 mr-1.5 ${textSub}`} />
            <input ref={fiadosSearchInputRef} autoFocus className="premium-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
          </div>
          <div className="flex gap-1">
            {(['activos','cerrados','todos','eliminados'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-all ${filter === f
                  ? f === 'eliminados'
                    ? 'bg-rose-600 text-white'
                    : isRetro ? 'bg-[#000080] text-white' : 'bg-blue-600 text-white'
                  : isRetro ? 'bg-zinc-100 text-zinc-500' : isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className={`text-center py-10 text-xs ${textSub}`}>Sin resultados</div>
          )}
          {filtered.map(account => {
            const bal = getBalance(account);
            const alert = isAlert(account);
            const isSelected = selectedId === account.id;
            const clientMatch = clients?.find(c => c.phone === account.clientPhone || c.name.toLowerCase().trim() === account.clientName.toLowerCase().trim());
            const limit = clientMatch?.creditLimit ?? account.creditLimit;
            return (
              <button key={account.id} onClick={() => setSelectedId(isSelected ? null : account.id)}
                className={`w-full text-left px-4 py-3 border-b ${divider} flex items-center gap-3 transition-all cursor-pointer ${isSelected ? (isLight ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-blue-950/30 border-l-4 border-l-blue-500') : hoverRow}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${bal === 0 ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/30 text-emerald-400') : alert ? (isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-900/30 text-orange-400') : (isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400')}`}>
                  {account.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-black truncate ${textMain}`}>{account.clientName}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] ${textSub}`}>{account.clientPhone}</span>
                    {limit !== undefined && limit > 0 && (
                      <span className={`text-[8px] font-black px-1 py-0.2 rounded shrink-0 border ${
                        isLight 
                          ? 'bg-amber-50 border-amber-200 text-amber-700' 
                          : 'bg-amber-950/30 border-amber-900/40 text-amber-400'
                      }`}>
                        Lím: {sym}{limit.toLocaleString('es-MX')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-black ${bal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{sym}{bal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {alert && <AlertTriangle className="w-3 h-3 text-orange-500 ml-auto" />}
                  {bal === 0 && <CheckCircle className="w-3 h-3 text-emerald-500 ml-auto" />}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${textSub} ${isSelected ? 'rotate-90' : ''} transition-transform`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel derecho — detalle del cliente seleccionado */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAccount ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${textSub}`}>
            <CreditCard className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Selecciona un cliente para ver su fiado</p>
          </div>
        ) : (
          <>
            {/* Header cliente */}
            <div className={`px-5 py-4 border-b ${divider} shrink-0 ${isRetro ? 'bg-white' : isLight ? 'bg-white' : 'bg-zinc-900/40'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className={`text-base font-black ${textMain}`}>{selectedAccount.clientName}</h2>
                  <p className={`text-xs ${textSub}`}>
                    {selectedAccount.clientPhone} · Cliente desde {new Date(selectedAccount.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span className="font-bold text-amber-600 dark:text-amber-500">
                      Límite de Crédito: {(() => {
                        const clientMatch = clients?.find(c => c.phone === selectedAccount.clientPhone || c.name.toLowerCase().trim() === selectedAccount.clientName.toLowerCase().trim());
                        const limit = clientMatch?.creditLimit ?? selectedAccount.creditLimit;
                        return limit !== undefined && limit > 0 ? `${sym}${limit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sin límite';
                      })()}
                    </span>
                  </p>
                </div>
                {/* Resumen financiero */}
                <div className={`flex items-stretch gap-px rounded-lg overflow-hidden border shrink-0 ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                  <div className={`px-3 py-2 text-center ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                    <div className={`text-[9px] font-black uppercase ${textSub}`}>Deuda total</div>
                    <div className={`text-sm font-black font-mono ${textMain}`}>{sym}{selectedAccount.entries.reduce((s, e) => s + e.subtotal, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`px-3 py-2 text-center ${isRetro ? 'bg-emerald-50' : isLight ? 'bg-emerald-50' : 'bg-emerald-950/20'}`}>
                    <div className={`text-[9px] font-black uppercase ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Abonado</div>
                    <div className={`text-sm font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{sym}{selectedAccount.payments.reduce((s, p) => s + p.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className={`px-3 py-2 text-center ${selectedBalance > 0 ? (isRetro ? 'bg-rose-50' : isLight ? 'bg-rose-50' : 'bg-rose-950/20') : (isRetro ? 'bg-emerald-100' : isLight ? 'bg-emerald-50' : 'bg-emerald-950/30')}`}>
                    <div className={`text-[9px] font-black uppercase ${selectedBalance > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-700' : 'text-emerald-400')}`}>Saldo</div>
                    <div className={`text-sm font-black font-mono ${selectedBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              {selectedBalance > 0 && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openModal('abonar')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 rounded ${isRetro ? 'bg-amber-500 text-white border-2 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700' : 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    💵 Abonar
                  </button>
                  <button onClick={() => openModal('pagar')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-emerald-600 text-white border-2 border-t-emerald-400 border-l-emerald-400 border-b-emerald-800 border-r-emerald-800 rounded' : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    ✅ Liquidar deuda
                  </button>
                  <button onClick={() => openModal('agregar')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ml-auto ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 rounded' : isLight ? 'bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-200' : 'bg-zinc-700 text-zinc-200 rounded-lg hover:bg-zinc-600'}`}>
                    <ShoppingBag className="w-3.5 h-3.5" /> Agregar artículos
                  </button>
                  <button onClick={openDeleteModal}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900 rounded' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {selectedBalance === 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-black">✓ Deuda saldada</span>
                  <button onClick={() => openModal('agregar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 rounded' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    <ShoppingBag className="w-3 h-3" /> Nuevo cargo
                  </button>
                  <button onClick={openDeleteModal}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase cursor-pointer ml-auto ${isRetro ? 'bg-rose-600 text-white rounded border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              )}
            </div>

            {/* Contenido: cargos y abonos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Cargos */}
              <div>
                <div className={`text-[9px] font-black uppercase tracking-wider mb-2 ${textSub}`}>📦 Artículos fiados</div>
                {selectedAccount.entries.length === 0 && <p className={`text-xs ${textSub}`}>Sin cargos</p>}
                {selectedAccount.entries.map(entry => {
                  const entryPayments = selectedAccount.payments.filter(p => p.entryId === entry.id);
                  const totalPaidForEntry = entryPayments.reduce((s, p) => s + p.amount, 0);
                  const entryRemaining = Math.max(0, entry.subtotal - totalPaidForEntry);
                  const isEntryFullyPaid = totalPaidForEntry >= entry.subtotal;
                  const isEntryPartiallyPaid = totalPaidForEntry > 0 && totalPaidForEntry < entry.subtotal;

                  const isHighlighted = localHighlightedEntryId === entry.id;

                  return (
                    <div key={entry.id} className={`${cardBg} rounded mb-2 overflow-hidden border transition-all duration-300 ${isHighlighted ? (isRetro ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-amber-500 bg-amber-500/5 shadow-md') : 'border-transparent'}`} style={isHighlighted ? { transform: 'scale(1.01)', transition: 'all 0.3s ease-in-out' } : undefined}>
                      <div className={`px-3 py-1.5 flex justify-between items-center border-b ${divider} ${isRetro ? 'bg-zinc-50' : isLight ? 'bg-zinc-50' : 'bg-zinc-800/50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold ${textSub}`}>{new Date(entry.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          
                          {isEntryFullyPaid ? (
                            <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
                              ✓ Liquidado
                            </span>
                          ) : (
                            <>
                              <button onClick={() => openModal('abonar', entryRemaining, `Liquidación de cargo: ${entry.id}`, entry.id)}
                                title={isEntryPartiallyPaid ? "Liquidar el saldo restante de este cargo" : "Abonar o liquidar el monto total de este cargo"}
                                className={`px-1.5 py-0.5 text-[8.5px] font-black uppercase cursor-pointer hover:opacity-85 active:scale-95 transition-all ${
                                  isRetro
                                    ? 'bg-zinc-200 text-zinc-850 border border-zinc-450 rounded shadow-sm'
                                    : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded'
                                }`}
                              >
                                {isEntryPartiallyPaid ? '💵 Liquidar Resto' : '💵 Liquidar Cargo'}
                              </button>
                              {isEntryPartiallyPaid && (
                                <span className={`text-[9px] font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                                  (Abonado: {sym}{totalPaidForEntry.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <span className={`text-[10px] font-black ${textMain}`}>{sym}{entry.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {entry.items.map((it, i) => {
                        const itemPayments = selectedAccount.payments.filter(p => p.entryId === entry.id && p.itemId === it.itemId);
                        const totalPaidForItem = itemPayments.reduce((s, p) => s + p.amount, 0);
                        const itemTotal = it.price * it.quantity;
                        const isItemFullyPaid = totalPaidForItem >= itemTotal;
                        const isItemPartiallyPaid = totalPaidForItem > 0 && totalPaidForItem < itemTotal;

                        const showItemBadges = entry.items.length > 1 || it.quantity > 1;
                        const showPayItemButton = showItemBadges && !isItemFullyPaid && !isEntryFullyPaid;

                        const amtToPay = (it.quantity > 1 && totalPaidForItem === 0) ? it.price : (itemTotal - totalPaidForItem);
                        const defaultNote = (it.quantity > 1 && totalPaidForItem === 0) ? `Pago de: 1x ${it.name}` : `Pago de: ${it.quantity}x ${it.name}`;

                        return (
                          <div key={i} className={`flex justify-between items-center px-3 py-1.5 text-xs border-b last:border-0 ${divider} ${textMain}`}>
                            <div className="flex-1 truncate flex items-center gap-1.5">
                              <span className="truncate">{it.name}{it.quantity > 1 ? <span className={`ml-1 ${textSub}`}>×{it.quantity}</span> : ''}</span>
                              {showItemBadges && isItemFullyPaid && (
                                <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-emerald-500/10 text-emerald-500 rounded">✓ Pagado</span>
                              )}
                              {showItemBadges && isItemPartiallyPaid && (
                                <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-orange-500/10 text-orange-500 rounded">Abonado: {sym}{totalPaidForItem.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {showPayItemButton && (
                                <button onClick={() => openModal('abonar', amtToPay, defaultNote, entry.id, it.itemId)}
                                  title="Registrar abono/pago para este artículo específico"
                                  className={`px-1.5 py-0.5 text-[8px] font-black uppercase cursor-pointer hover:opacity-85 active:scale-95 transition-all ${
                                    isRetro
                                      ? 'bg-zinc-100 text-zinc-700 border border-zinc-350 rounded shadow-sm'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded'
                                  }`}
                                >
                                  Pagar Art.
                                </button>
                              )}
                              <span className="font-black font-mono">{sym}{(it.price * it.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Abonos */}
              {selectedAccount.payments.length > 0 && (
                <div>
                  <div className={`text-[9px] font-black uppercase tracking-wider mb-2 ${textSub}`}>💵 Abonos registrados</div>
                  {selectedAccount.payments.map(p => (
                    <div key={p.id} className={`flex justify-between items-center px-3 py-2 rounded mb-1 ${isRetro ? 'bg-emerald-50 border border-emerald-200' : isLight ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-950/20 border border-emerald-900/30'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>+{sym}{p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className={`text-[9px] ${textSub}`}>{p.method}</span>
                        </div>
                        {p.note && (
                          <div className={`text-[9.5px] font-bold mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {p.note}
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] ${textSub}`}>{new Date(p.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL ABONAR ────────────────────────────────────────────── */}
      {modal === 'abonar' && selectedAccount && (() => {
        const totalAbono = mixedTotal(abonoEfectivo, abonoTarjeta);
        const excede = totalAbono > selectedBalance;
        const valido = totalAbono > 0 && !excede;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className={`w-full max-w-xs mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">💵 Registrar Abono</span>
              <button onClick={() => setModal(null)} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className={`text-xs ${textSub}`}>
                Cliente: <span className={`font-black ${textMain}`}>{selectedAccount.clientName}</span>
              </div>
              <div className={`flex justify-between text-sm font-black py-2 px-3 rounded ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <span className={textSub}>Saldo pendiente</span>
                <span ref={el => { if (el) el.style.setProperty('color','#f43f5e','important'); }}>{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {/* Contexto del abono/pago de cargo o artículo */}
              {(() => {
                const targetEntry = selectedAccount.entries.find(e => e.id === abonoTargetEntryId);
                const targetItem = targetEntry?.items.find(it => it.itemId === abonoTargetItemId);
                if (!targetEntry) return null;

                if (targetItem) {
                  const itemPayments = selectedAccount.payments.filter(p => p.entryId === targetEntry.id && p.itemId === targetItem.itemId);
                  const totalPaid = itemPayments.reduce((s, p) => s + p.amount, 0);
                  const maxUnpaid = targetItem.quantity - Math.floor(totalPaid / targetItem.price);

                  if (targetItem.quantity > 1) {
                    return (
                      <div className={`p-2 border rounded ${isRetro ? 'bg-zinc-50 border-zinc-350' : isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-zinc-800/40 border-zinc-800'} space-y-1.5`}>
                        <div className={`text-[9px] font-black uppercase ${textSub}`}>Artículo Seleccionado:</div>
                        <div className={`text-xs font-bold leading-tight ${textMain}`}>{targetItem.name}</div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={textSub}>Unidades a pagar:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={abonoItemQtyToPay <= 1}
                              onClick={() => {
                                const newQty = abonoItemQtyToPay - 1;
                                setAbonoItemQtyToPay(newQty);
                                setAbonoEfectivo((newQty * targetItem.price).toString());
                                setAbonoRef(`Pago de: ${newQty}x ${targetItem.name}`);
                              }}
                              className={`w-5 h-5 flex items-center justify-center font-black border rounded cursor-pointer disabled:opacity-40 select-none ${
                                isRetro ? 'border-zinc-400 bg-zinc-100 text-zinc-800' : isLight ? 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-350'
                              }`}
                            >
                              -
                            </button>
                            <span className={`font-black ${textMain}`}>{abonoItemQtyToPay} / {maxUnpaid}</span>
                            <button
                              disabled={abonoItemQtyToPay >= maxUnpaid}
                              onClick={() => {
                                const newQty = abonoItemQtyToPay + 1;
                                setAbonoItemQtyToPay(newQty);
                                setAbonoEfectivo((newQty * targetItem.price).toString());
                                setAbonoRef(`Pago de: ${newQty}x ${targetItem.name}`);
                              }}
                              className={`w-5 h-5 flex items-center justify-center font-black border rounded cursor-pointer disabled:opacity-40 select-none ${
                                isRetro ? 'border-zinc-400 bg-zinc-100 text-zinc-800' : isLight ? 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-350'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className={`text-[9px] font-semibold text-center mt-1 text-emerald-500`}>
                          Se pagará {abonoItemQtyToPay} de {targetItem.quantity} unidad(es) ({sym}{targetItem.price} c/u)
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className={`p-2 border rounded ${isRetro ? 'bg-zinc-50 border-zinc-350' : isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-zinc-800/40 border-zinc-800'} space-y-0.5`}>
                        <div className={`text-[9px] font-black uppercase ${textSub}`}>Artículo Seleccionado:</div>
                        <div className={`text-xs font-bold leading-tight ${textMain}`}>{targetItem.name}</div>
                        <div className={`text-[9.5px] font-medium ${textSub}`}>Abonando a este artículo único</div>
                      </div>
                    );
                  }
                } else {
                  return (
                    <div className={`p-2 border rounded ${isRetro ? 'bg-zinc-50 border-zinc-350' : isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-zinc-800/40 border-zinc-800'} space-y-0.5`}>
                      <div className={`text-[9px] font-black uppercase ${textSub}`}>Cargo Seleccionado:</div>
                      <div className={`text-xs font-bold ${textMain}`}>{new Date(targetEntry.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className={`text-[9.5px] font-medium ${textSub}`}>Liquidando el saldo restante de la compra</div>
                    </div>
                  );
                }
              })()}
              {/* Campos pago mixto */}
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>💵 Efectivo</label>
                <input id="abono-efectivo" type="number" min="0" step="any" value={abonoEfectivo}
                  onChange={e => setAbonoEfectivo(e.target.value)}
                  placeholder="0.00" className={`${inputCls} mt-1`} onFocus={e => e.target.select()} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>💳 Tarjeta / Transferencia</label>
                <input type="number" min="0" step="any" value={abonoTarjeta}
                  onChange={e => setAbonoTarjeta(e.target.value)}
                  placeholder="0.00" className={`${inputCls} mt-1`} onFocus={e => e.target.select()} />
              </div>
              {Number(abonoTarjeta) > 0 && (
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Ref. / Folio (opcional)</label>
                  <input value={abonoRef} onChange={e => setAbonoRef(e.target.value)}
                    placeholder="Folio voucher / SPEI..." className={`${inputCls} mt-1`} />
                </div>
              )}
              {/* Total y error */}
              <div className={`flex justify-between text-xs font-black py-1.5 px-3 rounded ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <span className={textSub}>Total a abonar</span>
                <span ref={el => { if (el) el.style.setProperty('color', excede ? '#ef4444' : '#10b981', 'important'); }}>{sym}{totalAbono.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {excede && (
                <p ref={el => { if (el) el.style.setProperty('color','#ef4444','important'); }} className="text-[10px] font-black">
                  El monto no puede superar el saldo pendiente ({sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                </p>
              )}

              {confirmStep ? (
                <div className="space-y-3">
                  <div className={`rounded-xl p-3 border space-y-1.5 ${isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/30'}`}>
                    <p ref={el => { if (el && isRetro) el.style.setProperty('color','#92400e','important'); }} className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Resumen del abono</p>
                    <div className="flex justify-between text-xs"><span className={textSub}>Cliente</span><span className={`font-black ${textMain}`}>{selectedAccount.clientName}</span></div>
                    <div className="flex justify-between text-xs"><span className={textSub}>Saldo anterior</span><span ref={el => { if (el) el.style.setProperty('color','#f43f5e','important'); }} className="font-black">{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-xs"><span className={textSub}>Total abono</span><span ref={el => { if (el) el.style.setProperty('color','#059669','important'); }} className="font-black">− {sym}{totalAbono.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {Number(abonoEfectivo) > 0 && <div className="flex justify-between text-xs"><span className={textSub}>· Efectivo</span><span className={`font-black ${textMain}`}>{sym}{Number(abonoEfectivo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {Number(abonoTarjeta) > 0 && <div className="flex justify-between text-xs"><span className={textSub}>· Tarjeta/Transfer</span><span className={`font-black ${textMain}`}>{sym}{Number(abonoTarjeta).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {abonoRef && <div className="flex justify-between text-xs"><span className={textSub}>Ref.</span><span className={`font-black ${textMain}`}>{abonoRef}</span></div>}
                    <div className={`flex justify-between text-sm font-black border-t pt-1.5 mt-1 ${isRetro ? 'border-amber-300' : isLight ? 'border-amber-200' : 'border-amber-800/40'}`}>
                      <span className={textMain}>Nuevo saldo</span>
                      <span ref={el => { if (el) el.style.setProperty('color', Math.max(0, selectedBalance - totalAbono) <= 0 ? '#059669' : '#f43f5e', 'important'); }}>
                        {Math.max(0, selectedBalance - totalAbono) <= 0 ? '✓ SALDADO' : `${sym}${Math.max(0, selectedBalance - totalAbono).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  </div>
                  {renderPrintAndWhatsappOptions()}
                  <p className={`text-[10px] text-center ${textSub}`}>
                    {printTicket ? 'Se imprimirá un ticket al confirmar.' : sendWhatsapp ? 'Se enviará el ticket por WhatsApp al confirmar.' : 'No se emitirá comprobante físico ni digital.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={confirmAbono}
                      className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-amber-500 text-white border-2 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700' : 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg'}`}
                      ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                      {printTicket ? '🖨 Sí, registrar y emitir ticket' : sendWhatsapp ? '💬 Sí, registrar y enviar WhatsApp' : 'Sí, registrar abono'}
                    </button>
                    <button onClick={() => setConfirmStep(false)}
                      className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                      Editar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setConfirmStep(true)} disabled={!valido}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isRetro ? 'bg-amber-500 text-white border-2 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700' : 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    Confirmar abono →
                  </button>
                  <button onClick={() => { setModal(null); setAbonoEfectivo(''); setAbonoTarjeta(''); setAbonoRef(''); setConfirmStep(false); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── MODAL PAGAR DEUDA ───────────────────────────────────────── */}
      {modal === 'pagar' && selectedAccount && (() => {
        const totalPago = mixedTotal(pagoEfectivo, pagoTarjeta);
        const excede = totalPago > selectedBalance;
        const valido = totalPago > 0 && !excede;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className={`w-full max-w-sm mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">✅ Liquidar Deuda</span>
              <button onClick={() => setModal(null)} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className={`flex justify-between text-sm font-black py-2 px-3 rounded ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <span className={textSub}>Total a liquidar</span>
                <span ref={el => { if (el) el.style.setProperty('color','#f43f5e','important'); }}>{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {/* Campos pago mixto */}
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>💵 Efectivo</label>
                <input id="pago-efectivo" type="number" min="0" step="any" value={pagoEfectivo}
                  onChange={e => setPagoEfectivo(e.target.value)}
                  placeholder="0.00" className={`${inputCls} mt-1`} onFocus={e => e.target.select()} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>💳 Tarjeta / Transferencia</label>
                <input type="number" min="0" step="any" value={pagoTarjeta}
                  onChange={e => setPagoTarjeta(e.target.value)}
                  placeholder="0.00" className={`${inputCls} mt-1`} onFocus={e => e.target.select()} />
              </div>
              {Number(pagoTarjeta) > 0 && (
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Ref. / Folio de operación (opcional)</label>
                  <input value={pagoRef} onChange={e => setPagoRef(e.target.value)}
                    placeholder="Folio voucher / SPEI..." className={`${inputCls} mt-1`} />
                </div>
              )}
              {/* Total y error */}
              <div className={`flex justify-between text-xs font-black py-1.5 px-3 rounded ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <span className={textSub}>Total a pagar</span>
                <span ref={el => { if (el) el.style.setProperty('color', excede ? '#ef4444' : '#10b981', 'important'); }}>{sym}{totalPago.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {excede && (
                <p ref={el => { if (el) el.style.setProperty('color','#ef4444','important'); }} className="text-[10px] font-black">
                  El monto no puede superar el saldo pendiente ({sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                </p>
              )}

              {confirmStep ? (
                <div className="space-y-3">
                  <div className={`rounded-xl p-3 border space-y-1.5 ${isRetro ? 'bg-emerald-50 border-emerald-300' : isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/30'}`}>
                    <p ref={el => { if (el && isRetro) el.style.setProperty('color','#065f46','important'); }} className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Resumen del pago</p>
                    <div className="flex justify-between text-xs"><span className={textSub}>Cliente</span><span className={`font-black ${textMain}`}>{selectedAccount.clientName}</span></div>
                    <div className="flex justify-between text-xs"><span className={textSub}>Saldo total</span><span ref={el => { if (el) el.style.setProperty('color','#f43f5e','important'); }} className="font-black">{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-xs"><span className={textSub}>Total pago</span><span ref={el => { if (el) el.style.setProperty('color','#059669','important'); }} className="font-black">− {sym}{totalPago.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {Number(pagoEfectivo) > 0 && <div className="flex justify-between text-xs"><span className={textSub}>· Efectivo</span><span className={`font-black ${textMain}`}>{sym}{Number(pagoEfectivo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {Number(pagoTarjeta) > 0 && <div className="flex justify-between text-xs"><span className={textSub}>· Tarjeta/Transfer</span><span className={`font-black ${textMain}`}>{sym}{Number(pagoTarjeta).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {pagoRef && <div className="flex justify-between text-xs"><span className={textSub}>Ref.</span><span className={`font-black ${textMain}`}>{pagoRef}</span></div>}
                    <div className={`flex justify-between text-sm font-black border-t pt-1.5 mt-1 ${isRetro ? 'border-emerald-300' : isLight ? 'border-emerald-200' : 'border-emerald-800/40'}`}>
                      <span className={textMain}>Nuevo saldo</span>
                      <span ref={el => { if (el) el.style.setProperty('color', Math.max(0, selectedBalance - totalPago) <= 0 ? '#059669' : '#f43f5e', 'important'); }}>
                        {Math.max(0, selectedBalance - totalPago) <= 0 ? '✓ SALDADO' : `${sym}${Math.max(0, selectedBalance - totalPago).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  </div>
                  {renderPrintAndWhatsappOptions()}
                  <p className={`text-[10px] text-center ${textSub}`}>
                    {printTicket ? 'Se imprimirá un ticket al confirmar.' : sendWhatsapp ? 'Se enviará el ticket por WhatsApp al confirmar.' : 'No se emitirá comprobante físico ni digital.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={confirmPago}
                      className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-emerald-600 text-white border-2 border-t-emerald-400 border-l-emerald-400 border-b-emerald-800 border-r-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'}`}
                      ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                      {printTicket ? '🖨 Sí, registrar y emitir ticket' : sendWhatsapp ? '💬 Sí, registrar y enviar WhatsApp' : 'Sí, registrar pago'}
                    </button>
                    <button onClick={() => setConfirmStep(false)}
                      className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                      Editar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setConfirmStep(true)} disabled={!valido}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isRetro ? 'bg-emerald-600 text-white border-2 border-t-emerald-400 border-l-emerald-400 border-b-emerald-800 border-r-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    Confirmar pago →
                  </button>
                  <button onClick={() => { setModal(null); setPagoEfectivo(''); setPagoTarjeta(''); setPagoRef(''); setConfirmStep(false); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── MODAL AGREGAR ARTÍCULOS ─────────────────────────────────── */}
      {modal === 'agregar' && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className={`w-full max-w-md mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">🛍 Agregar Artículos — {selectedAccount.clientName}</span>
              <button onClick={() => { setModal(null); setItemsToAdd([]); setItemSearch(''); }} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {/* Buscador estilo POS — píldora */}
              <div className="capsule-search-container">
                <Search className={`w-4 h-4 shrink-0 mr-1.5 ${textSub}`} />
                <input autoFocus value={itemSearch}
                  onChange={e => { setItemSearch(e.target.value); setItemHighlight(0); itemHighlightRef.current = 0; }}
                  onKeyDown={handleItemSearchKeyDown}
                  placeholder="Buscar artículo por nombre o código..."
                  ref={searchInputRef2}
                  className="premium-search-input" />
                {itemSearch && <button onClick={() => { setItemSearch(''); setItemHighlight(0); itemHighlightRef.current = 0; }} className={`shrink-0 cursor-pointer ${textSub} hover:text-rose-500`}><X className="w-3.5 h-3.5" /></button>}
              </div>

              {/* Resultados del buscador */}
              {itemSearch && (
                <div className={`rounded border overflow-hidden ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                  {filteredInventory.length === 0 && <div className={`px-3 py-3 text-xs ${textSub}`}>Sin resultados</div>}
                  {filteredInventory.map((item, idx) => (
                      <div key={item.id}
                        ref={el => { itemRowRefs.current[idx] = el; }}
                        className={`flex justify-between items-center px-3 py-2.5 cursor-pointer border-b last:border-0 ${divider}`}
                        onMouseEnter={() => { setItemHighlight(idx); itemHighlightRef.current = idx; }}
                        onClick={() => {
                          const exists = itemsToAdd.find(i => i.itemId === item.id);
                          if (exists) setItemsToAdd(prev => prev.map(i => i.itemId === item.id ? { ...i, qty: i.qty + 1 } : i));
                          else setItemsToAdd(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: item.price }]);
                          setItemSearch(''); setItemHighlight(0); itemHighlightRef.current = 0;
                        }}>
                        <div>
                          <div className={`text-xs font-bold ${textMain}`}>{item.name}</div>
                          <div className={`text-[9px] ${textSub}`}>{item.code} · Stock: {item.stock}</div>
                        </div>
                        <div className={`text-sm font-black ${textMain}`}>{sym}{item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                  ))}
                </div>
              )}

              {/* Artículos seleccionados */}
              {itemsToAdd.length > 0 && (
                <div>
                  <div className={`text-[9px] font-black uppercase tracking-wider mb-2 ${textSub}`}>Artículos a agregar</div>
                  {itemsToAdd.map((it, i) => (
                    <div key={i} className={`flex items-center gap-2 py-2 border-b last:border-0 ${divider}`}>
                      <span className={`flex-1 text-xs font-bold truncate ${textMain}`}>{it.name}</span>
                      <input type="number" min="1" value={it.qty}
                        onChange={e => setItemsToAdd(prev => prev.map((x, xi) => xi === i ? { ...x, qty: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                        className={`w-14 text-center text-xs ${inputCls.replace('w-full', '')} py-1`} />
                      <span className={`w-16 text-right text-xs font-black ${textMain}`}>{sym}{(it.qty * it.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <button onClick={() => setItemsToAdd(prev => prev.filter((_, xi) => xi !== i))} className="text-rose-500 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className={`flex justify-between text-sm font-black pt-2 mt-1 border-t ${divider} ${textMain}`}>
                    <span>Total cargo</span>
                    <span className="text-rose-500">{sym}{itemsToAdd.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${divider} flex flex-col gap-3`}>
              {renderPrintAndWhatsappOptions()}
              <div className="flex gap-2">
                <button onClick={confirmAgregarItems} disabled={itemsToAdd.length === 0}
                  className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnPrimary}`}
                  ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                  {printTicket ? 'Agregar e imprimir ticket' : sendWhatsapp ? 'Agregar y WhatsApp' : 'Agregar a deuda'} ({sym}{itemsToAdd.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </button>
                <button onClick={() => { setModal(null); setItemsToAdd([]); setItemSearch(''); }}
                  className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR FIADO ───────────────────────────────────── */}
      {deleteStep !== null && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setDeleteStep(null); setDeletePin(''); setDeletePinError(''); }}>
          <div className={`w-full max-w-xs mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">🗑 Eliminar Fiado</span>
              <button onClick={() => { setDeleteStep(null); setDeletePin(''); setDeletePinError(''); }} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>

            {deleteStep === 'pin' ? (
              /* ── Paso PIN ── */
              <div className="p-4 space-y-3">
                <div className={`rounded-lg p-3 border ${isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/30'}`}>
                  <p className={`text-xs font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>🔐 Autorización requerida</p>
                  <p className={`text-[10px] mt-1 ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>Esta acción requiere el PIN de un administrador para continuar.</p>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>PIN de administrador</label>
                  <input
                    autoFocus
                    type="password"
                    maxLength={6}
                    value={deletePin}
                    onChange={e => { setDeletePin(e.target.value); setDeletePinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && verifyDeletePin()}
                    placeholder="••••"
                    className={`${inputCls} mt-1 text-center tracking-widest text-lg`}
                  />
                  {deletePinError && <p className="text-[10px] text-rose-500 font-black mt-1">{deletePinError}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={verifyDeletePin} disabled={!deletePin}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    Verificar →
                  </button>
                  <button onClick={() => { setDeleteStep(null); setDeletePin(''); setDeletePinError(''); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ── Paso Resumen / Confirmación ── */
              <div className="p-4 space-y-3">
                <div className={`rounded-lg p-3 border space-y-1.5 ${selectedBalance > 0 ? (isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/30') : (isRetro ? 'bg-rose-50 border-rose-300' : isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-800/30')}`}>
                  {selectedBalance > 0 ? (
                    <>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>⚠️ ADVERTENCIA: SALDO ACTIVO</p>
                      <p className={`text-[9.5px] leading-tight ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>Esta cuenta tiene una deuda activa de <strong>{sym}{selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>. Se recomienda liquidar la deuda antes de eliminar la cuenta para evitar descuadres en los cierres de caja.</p>
                    </>
                  ) : (
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ Resumen — acción irreversible</p>
                  )}
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Cliente</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{selectedAccount.clientName}</span></div>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Teléfono</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{selectedAccount.clientPhone}</span></div>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Cargos registrados</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{selectedAccount.entries.length}</span></div>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Abonos registrados</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{selectedAccount.payments.length}</span></div>
                  <div className={`flex justify-between text-sm font-black border-t pt-1.5 mt-1 ${selectedBalance > 0 ? (isRetro ? 'border-amber-300' : isLight ? 'border-amber-200' : 'border-amber-800/40') : (isRetro ? 'border-rose-300' : isLight ? 'border-rose-200' : 'border-rose-800/40')}`}>
                    <span className={isLight ? 'text-zinc-700' : 'text-zinc-200'}>Saldo pendiente</span>
                    <span className={selectedBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}>{selectedBalance > 0 ? `${sym}${selectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Saldado'}</span>
                  </div>
                </div>
                <p className={`text-[10px] text-center font-black ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>Se eliminará permanentemente toda la cuenta y su historial.</p>
                <div className="flex gap-2">
                  <button onClick={executeDelete}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    🗑 Sí, eliminar
                  </button>
                  <button onClick={() => { setDeleteStep(null); setDeletePin(''); setDeletePinError(''); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL CANCELAR APARTADO (CON PIN) ───────────────────────── */}
      {aptCancelStep !== null && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setAptCancelStep(null); setAptCancelPin(''); setAptCancelPinError(''); }}>
          <div className={`w-full max-w-xs mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">⚠️ Cancelar Apartado</span>
              <button onClick={() => { setAptCancelStep(null); setAptCancelPin(''); setAptCancelPinError(''); }} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>

            {aptCancelStep === 'pin' ? (
              <div className="p-4 space-y-3">
                <div className={`rounded-lg p-3 border ${isRetro ? 'bg-amber-50 border-amber-300' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/30'}`}>
                  <p className={`text-xs font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>🔐 Autorización requerida</p>
                  <p className={`text-[10px] mt-1 ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>Se requiere el PIN de un administrador para cancelar el apartado.</p>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>PIN de administrador</label>
                  <input
                    autoFocus
                    type="password"
                    maxLength={6}
                    value={aptCancelPin}
                    onChange={e => { setAptCancelPin(e.target.value); setAptCancelPinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && verifyAptCancelPin()}
                    placeholder="••••"
                    className={`${inputCls} mt-1 text-center tracking-widest text-lg`}
                  />
                  {aptCancelPinError && <p className="text-[10px] text-rose-500 font-black mt-1">{aptCancelPinError}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={verifyAptCancelPin} disabled={!aptCancelPin}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    Verificar →
                  </button>
                  <button onClick={() => { setAptCancelStep(null); setAptCancelPin(''); setAptCancelPinError(''); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className={`rounded-lg p-3 border space-y-1.5 ${isRetro ? 'bg-rose-50 border-rose-300' : isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-800/30'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ Confirmar Cancelación</p>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Cliente</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{selectedApt.clientName}</span></div>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Total apartado</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{selectedApt.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs"><span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Pagos/Abonos</span><span className={`font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sym}{selectedApt.payments.reduce((s, p) => s + p.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                </div>
                <p className={`text-[10.5px] text-center font-black ${isLight ? 'text-rose-600' : 'text-rose-455'}`}>¿Realmente deseas cancelar este apartado? Esto devolverá los artículos reservados al stock y marcará el apartado como Cancelado.</p>
                <div className="flex gap-2">
                  <button onClick={executeAptCancel}
                    className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                    ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                    Sí, Cancelar
                  </button>
                  <button onClick={() => { setAptCancelStep(null); setAptCancelPin(''); setAptCancelPinError(''); }}
                    className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO FIADO ───────────────────────────────────────── */}
      {modal === 'nuevo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className={`w-full max-w-xs mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">➕ Nuevo Fiado</span>
              <button onClick={() => setModal(null)} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Nombre del cliente *</label>
                <input id="nuevo-nombre" autoFocus value={newName} onChange={e => handleCaretPreservingChange(e, setNewName, val => val.toUpperCase())}
                  placeholder="NOMBRE COMPLETO" className={`${inputCls} mt-1 uppercase`}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('nuevo-tel')?.focus()} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Teléfono *</label>
                <input id="nuevo-tel" value={newPhone} onChange={e => setNewPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(351) 000-0000" className={`${inputCls} mt-1`}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('nuevo-limit')?.focus()} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Límite de Crédito ($) *</label>
                <input id="nuevo-limit" value={newCreditLimit} onChange={e => setNewCreditLimit(e.target.value)}
                  placeholder={`Ej: ${config.defaultCreditLimit ?? 1000}`}
                  type="number"
                  min="0"
                  className={`${inputCls} mt-1`}
                  onKeyDown={e => e.key === 'Enter' && confirmNuevo()} />
              </div>
              {renderPrintAndWhatsappOptions()}
              <div className="flex gap-2 pt-1">
                <button onClick={confirmNuevo} disabled={!newName.trim() || !newPhone.trim() || !newCreditLimit.trim()}
                  className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnPrimary}`}
                  ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                  {printTicket ? 'Crear fiado e imprimir' : sendWhatsapp ? 'Crear y WhatsApp' : 'Crear fiado'}
                </button>
                <button onClick={() => { setModal(null); setNewName(''); setNewPhone(''); setNewCreditLimit(''); }}
                  className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>}
      {/* END FIADOS TAB */}

      {/* APARTADOS TAB */}
      {mainTab === 'apartados' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className={`w-72 shrink-0 flex flex-col border-r ${divider} ${isRetro ? 'bg-white' : isLight ? 'bg-white' : 'bg-zinc-900/60'}`}>
            <div className={`${headerBg} px-4 py-3 shrink-0`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black uppercase tracking-widest text-white">📦 Apartados</span>
                <button onClick={() => setAptModal('nuevo')}
                  className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase bg-white/20 hover:bg-white/30 text-white rounded cursor-pointer">
                  <Plus className="w-3 h-3" /> Nuevo
                </button>
              </div>
              <div className="flex gap-3 text-[10px] text-white/70">
                <span>Activos: <span className="font-black text-white">{apartados.filter(a => a.status === 'Activo').length}</span></span>
                <span>Listos: <span className="font-black text-white">{apartados.filter(a => a.status === 'Listo').length}</span></span>
              </div>
            </div>
            <div className={`p-2 border-b ${divider} space-y-1.5 shrink-0`}>
              <div className="capsule-search-container">
                <Search className={`w-3.5 h-3.5 shrink-0 mr-1.5 ${textSub}`} />
                <input ref={apartadosSearchInputRef} autoFocus className="premium-search-input" value={aptSearch} onChange={e => setAptSearch(e.target.value)} placeholder="Buscar..." />
              </div>
              <div className="flex gap-1">
                {(['Activo','Listo','Entregado','Cancelado','todos'] as const).map(f => (
                  <button key={f} onClick={() => setAptFilter(f)}
                    className={`flex-1 py-1 text-[8px] font-black uppercase rounded cursor-pointer transition-all ${aptFilter === f
                      ? isRetro ? 'bg-[#000080] text-white' : 'bg-blue-600 text-white'
                      : isRetro ? 'bg-zinc-100 text-zinc-500' : isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}>
                    {f === 'todos' ? 'Todos' : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredApartados.length === 0 && <div className={`text-center py-10 text-xs ${textSub}`}>Sin apartados</div>}
              {filteredApartados.map(apt => {
                const bal = aptBalance(apt);
                const isSelected = selectedAptId === apt.id;
                const statusColor = apt.status === 'Listo' ? 'text-emerald-500' : apt.status === 'Entregado' ? 'text-zinc-400' : apt.status === 'Cancelado' ? 'text-rose-400' : 'text-blue-500';
                return (
                  <button key={apt.id} onClick={() => setSelectedAptId(isSelected ? null : apt.id)}
                    className={`w-full text-left px-4 py-3 border-b ${divider} flex items-center gap-3 transition-all cursor-pointer ${isSelected ? (isLight ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-blue-950/30 border-l-4 border-l-blue-500') : hoverRow}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'}`}>
                      {apt.clientName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-black truncate ${textMain}`}>{apt.clientName}</div>
                      <div className={`text-[9px] ${textSub}`}>{apt.id}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black ${statusColor}`}>{apt.status}</div>
                      <div className={`text-[9px] ${textSub}`}>{bal > 0 ? `Saldo: ${sym}${bal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Liquidado'}</div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${textSub} ${isSelected ? 'rotate-90' : ''} transition-transform`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel — detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedApt ? (
              <div className={`flex-1 flex flex-col items-center justify-center ${textSub}`}>
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Selecciona un apartado para ver detalles</p>
              </div>
            ) : (
              <>
                <div className={`px-5 py-4 border-b ${divider} shrink-0 ${isRetro ? 'bg-white' : isLight ? 'bg-white' : 'bg-zinc-900/40'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className={`text-base font-black ${textMain}`}>{selectedApt.clientName}</h2>
                      <p className={`text-xs ${textSub}`}>{selectedApt.clientPhone || '—'} · {selectedApt.id} · {new Date(selectedApt.createdAt).toLocaleDateString('es-MX')}</p>
                      {selectedApt.dueDate && <p className={`text-xs ${textSub}`}>Vence: {new Date(selectedApt.dueDate).toLocaleDateString('es-MX')}</p>}
                      {selectedApt.notes && <p className={`text-xs italic mt-1 ${textSub}`}>{selectedApt.notes}</p>}
                    </div>
                    <div className={`flex items-stretch gap-px rounded-lg overflow-hidden border shrink-0 ${isRetro ? 'border-zinc-300' : isLight ? 'border-zinc-200' : 'border-zinc-700'}`}>
                      <div className={`px-3 py-2 text-center ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                        <div className={`text-[9px] font-black uppercase ${textSub}`}>Total</div>
                        <div className={`text-sm font-black font-mono ${textMain}`}>{sym}{selectedApt.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className={`px-3 py-2 text-center ${isRetro ? 'bg-emerald-50' : isLight ? 'bg-emerald-50' : 'bg-emerald-950/20'}`}>
                        <div className={`text-[9px] font-black uppercase ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Pagado</div>
                        <div className={`text-sm font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{sym}{selectedApt.payments.reduce((s, p) => s + p.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className={`px-3 py-2 text-center ${aptBalance(selectedApt) > 0 ? (isRetro ? 'bg-rose-50' : isLight ? 'bg-rose-50' : 'bg-rose-950/20') : (isRetro ? 'bg-emerald-100' : isLight ? 'bg-emerald-50' : 'bg-emerald-950/30')}`}>
                        <div className={`text-[9px] font-black uppercase ${aptBalance(selectedApt) > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-700' : 'text-emerald-400')}`}>Saldo</div>
                        <div className={`text-sm font-black font-mono ${aptBalance(selectedApt) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{aptBalance(selectedApt) > 0 ? `${sym}${aptBalance(selectedApt).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '✓'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(selectedApt.status === 'Activo' || selectedApt.status === 'Listo') && (
                      <button onClick={() => { setAptAbonoAmount(''); setAptAbonoNote(''); setAptModal('abonar'); }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 rounded ${isRetro ? 'bg-amber-500 text-white border-2 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700' : 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg'}`}
                        ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                        💵 Abonar
                      </button>
                    )}
                    {selectedApt.status === 'Listo' && (
                      <button onClick={() => onUpdateApartadoStatus(selectedApt.id, 'Entregado')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-emerald-600 text-white border-2 border-t-emerald-400 border-l-emerald-400 border-b-emerald-800 border-r-emerald-800 rounded' : 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg'}`}
                        ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                        ✅ Entregar
                      </button>
                    )}
                    {(selectedApt.status === 'Activo' || selectedApt.status === 'Listo') && (
                      <button onClick={openAptCancelModal}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase cursor-pointer transition-all active:scale-95 ${isRetro ? 'bg-rose-600 text-white border-2 border-t-rose-400 border-l-rose-400 border-b-rose-900 border-r-rose-900 rounded' : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg'}`}
                        ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                        Cancelar
                      </button>
                    )}
                    <button onClick={() => {
                      const paperWidth = effectivePaperWidth;
                      const paperWidthMicrons = paperWidth === 'media-carta' ? 215900 : paperWidth === 'media-carta-duplicado' ? 210000 : (paperWidth === '58mm' ? 48000 : 72000);
                      const paperHeightMicrons = paperWidth === 'media-carta' ? 139700 : paperWidth === 'media-carta-duplicado' ? 297000 : undefined;
                      fmPrint(buildApartadoTicketHtml({ apartado: selectedApt, storeName: config.storeName || 'TALLER', phone: config.phone || '', address: config.address || '', sym, paperWidth, footer: config.ticketFooter || '¡Gracias!', offset: config.ticketMarginOffset || 0, config }), paperWidthMicrons, targetPrinter, `Ticket Apartado — ${selectedApt.clientName}`, undefined, paperHeightMicrons);
                    }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase cursor-pointer ml-auto ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400 rounded' : isLight ? 'bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-200' : 'bg-zinc-700 text-zinc-200 rounded-lg hover:bg-zinc-600'}`}>
                      🖨 Ticket
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Items */}
                  <div>
                    <div className={`text-[9px] font-black uppercase tracking-wider mb-2 ${textSub}`}>📦 Artículos apartados</div>
                    {(() => {
                      const isAptHighlighted = localHighlightedApartadoId === selectedApt.id;
                      return (
                        <div className={`${cardBg} rounded overflow-hidden border transition-all duration-300 ${isAptHighlighted ? (isRetro ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-amber-500 bg-amber-500/5 shadow-md') : 'border-transparent'}`} style={isAptHighlighted ? { transform: 'scale(1.01)', transition: 'all 0.3s ease-in-out' } : undefined}>
                          {selectedApt.items.map((it, i) => {
                            const itemPayments = selectedApt.payments.filter(p => p.itemId === it.itemId);
                            const totalPaidForItem = itemPayments.reduce((s, p) => s + p.amount, 0);
                            const itemTotal = it.price * it.quantity;
                            const isItemFullyPaid = totalPaidForItem >= itemTotal;
                            const isItemPartiallyPaid = totalPaidForItem > 0 && totalPaidForItem < itemTotal;

                            const showItemBadges = selectedApt.items.length > 1 || it.quantity > 1;
                            const showPayItemButton = showItemBadges && !isItemFullyPaid && selectedApt.status !== 'Entregado' && selectedApt.status !== 'Cancelado';

                            const amtToPay = (it.quantity > 1 && totalPaidForItem === 0) ? it.price : (itemTotal - totalPaidForItem);
                            const defaultNote = (it.quantity > 1 && totalPaidForItem === 0) ? `Pago de: 1x ${it.name}` : `Pago de: ${it.quantity}x ${it.name}`;

                            return (
                              <div key={i} className={`flex justify-between items-center px-3 py-2 text-xs border-b last:border-0 ${divider} ${textMain}`}>
                                <div className="flex-1 truncate flex items-center gap-1.5">
                                  <span className="truncate">{it.name}{it.quantity > 1 ? <span className={`ml-1 ${textSub}`}>×{it.quantity}</span> : ''}</span>
                                  {showItemBadges && isItemFullyPaid && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-emerald-500/10 text-emerald-500 rounded">✓ Pagado</span>
                                  )}
                                  {showItemBadges && isItemPartiallyPaid && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-orange-500/10 text-orange-500 rounded">Abonado: {sym}{totalPaidForItem.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {showPayItemButton && (
                                    <button onClick={() => openAptAbonoModal(amtToPay, defaultNote, it.itemId)}
                                      title="Registrar abono/pago para este artículo específico del apartado"
                                      className={`px-1.5 py-0.5 text-[8px] font-black uppercase cursor-pointer hover:opacity-85 active:scale-95 transition-all ${
                                        isRetro
                                          ? 'bg-zinc-100 text-zinc-700 border border-zinc-350 rounded shadow-sm'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded'
                                      }`}
                                    >
                                      Pagar Art.
                                    </button>
                                  )}
                                  <span className="font-black font-mono">{sym}{itemTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Payments */}
                  {selectedApt.payments.length > 0 && (
                    <div>
                      <div className={`text-[9px] font-black uppercase tracking-wider mb-2 ${textSub}`}>💵 Pagos registrados</div>
                      {selectedApt.payments.map(p => (
                        <div key={p.id} className={`flex justify-between items-center px-3 py-2 rounded mb-1 ${isRetro ? 'bg-emerald-50 border border-emerald-200' : isLight ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-950/20 border border-emerald-900/30'}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>+{sym}{p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className={`text-[9px] ${textSub}`}>{p.method}</span>
                            </div>
                            {p.note && (
                              <div className={`text-[9.5px] font-bold mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {p.note}
                              </div>
                            )}
                          </div>
                          <span className={`text-[9px] ${textSub}`}>{new Date(p.date).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* END APARTADOS TAB */}

      {/* ── MODAL NUEVO APARTADO ────────────────────────────────────── */}
      {aptModal === 'nuevo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAptModal(null)}>
          <div className={`w-full max-w-lg mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">📦 Nuevo Apartado</span>
              <button onClick={() => setAptModal(null)} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(90vh - 110px)' }}>
              {/* Client info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Nombre del cliente *</label>
                  <input autoFocus value={aptClientName} onChange={e => handleCaretPreservingChange(e, setAptClientName, val => val.toUpperCase())}
                    placeholder="NOMBRE COMPLETO" className={`${inputCls} mt-1 uppercase`} />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Teléfono</label>
                  <input value={aptClientPhone} onChange={e => setAptClientPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(351) 000-0000" className={`${inputCls} mt-1`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Fecha límite (opcional)</label>
                  <input type="date" value={aptDueDate} onChange={e => setAptDueDate(e.target.value)} className={`${inputCls} mt-1`} />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase ${textSub}`}>Notas</label>
                  <input value={aptNotes} onChange={e => setAptNotes(e.target.value)} placeholder="Observaciones..." className={`${inputCls} mt-1`} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className={`text-[10px] font-black uppercase mb-2 ${textSub}`}>Artículos *</div>
                {aptFormItems.map((item, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <input value={item.name} onChange={e => {
                          const val = e.target.value;
                          setAptFormItems(prev => prev.map((x, xi) => xi === idx ? { ...x, name: val, itemId: undefined } : x));
                          setAptItemSearch(val);
                          setAptItemSearchIdx(idx);
                        }}
                          onFocus={() => { setAptItemSearch(item.name); setAptItemSearchIdx(idx); }}
                          placeholder="Nombre del artículo" className={`${inputCls}`} />
                        {aptItemSearchIdx === idx && aptItemSearch && aptInventoryFiltered.length > 0 && (
                          <div className={`absolute top-full left-0 right-0 z-10 border rounded shadow-lg ${isRetro ? 'bg-white border-zinc-300' : isLight ? 'bg-white border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>
                            {aptInventoryFiltered.map(invItem => {
                              const avail = invItem.stock - (invItem.reservedQty || 0);
                              return (
                                <div key={invItem.id}
                                  onClick={() => {
                                    setAptFormItems(prev => prev.map((x, xi) => xi === idx ? { ...x, itemId: invItem.id, name: invItem.name, price: invItem.price.toString() } : x));
                                    setAptItemSearch(''); setAptItemSearchIdx(null);
                                  }}
                                  className={`flex justify-between px-3 py-2 cursor-pointer text-xs ${hoverRow} border-b last:border-0 ${divider}`}>
                                  <span className={textMain}>{invItem.name}</span>
                                  <span className={textSub}>Disp: {avail} · {sym}{invItem.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => setAptFormItems(prev => prev.map((x, xi) => xi === idx ? { ...x, quantity: e.target.value } : x))}
                        placeholder="Cant" className={`w-16 ${inputCls.replace('w-full', '')}`} />
                      <input type="number" min="0" step="any" value={item.price}
                        onChange={e => setAptFormItems(prev => prev.map((x, xi) => xi === idx ? { ...x, price: e.target.value } : x))}
                        placeholder="Precio" className={`w-24 ${inputCls.replace('w-full', '')}`} />
                      <button onClick={() => setAptFormItems(prev => prev.filter((_, xi) => xi !== idx))} className="text-rose-500 cursor-pointer shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setAptFormItems(prev => [...prev, { name: '', price: '', quantity: '1' }])}
                  className={`text-xs font-black cursor-pointer ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                  + Agregar artículo
                </button>
                {aptTotalValue > 0 && (
                  <div className={`flex justify-between text-sm font-black mt-2 pt-2 border-t ${divider} ${textMain}`}>
                    <span>Total</span><span>{sym}{aptTotalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Initial payment */}
              <div>
                <div className={`text-[10px] font-black uppercase mb-2 ${textSub}`}>Anticipo inicial *</div>
                <div className="flex gap-2">
                  <input type="number" min="1" step="any" value={aptInitialAmount}
                    onChange={e => setAptInitialAmount(e.target.value)}
                    placeholder="Monto" className={`flex-1 ${inputCls}`} />
                  <select value={aptInitialMethod} onChange={e => setAptInitialMethod(e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia')}
                    className={`${inputCls.replace('w-full', '')} w-36`}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`p-4 border-t ${divider} flex flex-col gap-3`}>
              {renderPrintAndWhatsappOptions()}
              <div className="flex gap-2">
                <button onClick={handleSubmitNuevoApartado}
                  disabled={!aptClientName.trim() || aptFormItems.every(i => !i.name.trim()) || !aptInitialAmount || parseFloat(aptInitialAmount) <= 0}
                  className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${btnPrimary}`}
                  ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                  {printTicket ? 'Crear apartado e imprimir' : sendWhatsapp ? 'Crear y WhatsApp' : 'Crear apartado'}
                </button>
                <button onClick={() => setAptModal(null)}
                  className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ABONAR APARTADO ───────────────────────────────────── */}
      {aptModal === 'abonar' && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAptModal(null)}>
          <div className={`w-full max-w-xs mx-4 overflow-hidden shadow-2xl ${isRetro ? 'bg-white border-2 border-zinc-400' : isLight ? 'bg-white border border-zinc-200 rounded-2xl' : 'bg-zinc-900 border border-zinc-700 rounded-2xl'}`} onClick={e => e.stopPropagation()}>
            <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}
              ref={el => { if (el && isRetro) { el.style.setProperty('color','white','important'); Array.from(el.querySelectorAll('*')).forEach((c:Element) => (c as HTMLElement).style?.setProperty('color','white','important')); } }}>
              <span className="text-sm font-black uppercase text-white">💵 Abonar Apartado</span>
              <button onClick={() => setAptModal(null)} className="text-white/70 text-lg font-black cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className={`text-xs ${textSub}`}>Cliente: <span className={`font-black ${textMain}`}>{selectedApt.clientName}</span></div>
              <div className={`flex justify-between text-sm font-black py-2 px-3 rounded ${isRetro ? 'bg-zinc-100' : isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <span className={textSub}>Saldo pendiente</span>
                <span ref={el => { if (el) el.style.setProperty('color','#f43f5e','important'); }}>{sym}{aptBalance(selectedApt).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Contexto del abono/pago de artículo en apartado */}
              {(() => {
                if (!aptAbonoTargetItemId) return null;
                const targetItem = selectedApt.items.find(it => it.itemId === aptAbonoTargetItemId);
                if (!targetItem) return null;

                const itemPayments = selectedApt.payments.filter(p => p.itemId === targetItem.itemId);
                const totalPaid = itemPayments.reduce((s, p) => s + p.amount, 0);
                const maxUnpaid = targetItem.quantity - Math.floor(totalPaid / targetItem.price);

                if (targetItem.quantity > 1) {
                  return (
                    <div className={`p-2 border rounded ${isRetro ? 'bg-zinc-50 border-zinc-350' : isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-zinc-800/40 border-zinc-800'} space-y-1.5`}>
                      <div className={`text-[9px] font-black uppercase ${textSub}`}>Artículo Seleccionado:</div>
                      <div className={`text-xs font-bold leading-tight ${textMain}`}>{targetItem.name}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className={textSub}>Unidades a pagar:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={aptAbonoItemQtyToPay <= 1}
                            onClick={() => {
                              const newQty = aptAbonoItemQtyToPay - 1;
                              setAptAbonoItemQtyToPay(newQty);
                              setAptAbonoAmount((newQty * targetItem.price).toString());
                              setAptAbonoNote(`Pago de: ${newQty}x ${targetItem.name}`);
                            }}
                            className={`w-5 h-5 flex items-center justify-center font-black border rounded cursor-pointer disabled:opacity-40 select-none ${
                              isRetro ? 'border-zinc-400 bg-zinc-100 text-zinc-800' : isLight ? 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-355'
                            }`}
                          >
                            -
                          </button>
                          <span className={`font-black ${textMain}`}>{aptAbonoItemQtyToPay} / {maxUnpaid}</span>
                          <button
                            disabled={aptAbonoItemQtyToPay >= maxUnpaid}
                            onClick={() => {
                              const newQty = aptAbonoItemQtyToPay + 1;
                              setAptAbonoItemQtyToPay(newQty);
                              setAptAbonoAmount((newQty * targetItem.price).toString());
                              setAptAbonoNote(`Pago de: ${newQty}x ${targetItem.name}`);
                            }}
                            className={`w-5 h-5 flex items-center justify-center font-black border rounded cursor-pointer disabled:opacity-40 select-none ${
                              isRetro ? 'border-zinc-400 bg-zinc-100 text-zinc-800' : isLight ? 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-355'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className={`text-[9px] font-semibold text-center mt-1 text-emerald-500`}>
                        Se pagará {aptAbonoItemQtyToPay} de {targetItem.quantity} unidad(es) ({sym}{targetItem.price} c/u)
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className={`p-2 border rounded ${isRetro ? 'bg-zinc-50 border-zinc-350' : isLight ? 'bg-zinc-50 border-zinc-150' : 'bg-zinc-800/40 border-zinc-800'} space-y-0.5`}>
                      <div className={`text-[9px] font-black uppercase ${textSub}`}>Artículo Seleccionado:</div>
                      <div className={`text-xs font-bold leading-tight ${textMain}`}>{targetItem.name}</div>
                      <div className={`text-[9.5px] font-medium ${textSub}`}>Abonando a este artículo único</div>
                    </div>
                  );
                }
              })()}
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Monto</label>
                <input autoFocus type="number" min="0" step="any" value={aptAbonoAmount}
                  onChange={e => setAptAbonoAmount(e.target.value)}
                  placeholder="0.00" className={`${inputCls} mt-1`} onFocus={e => e.target.select()} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Método</label>
                <select value={aptAbonoMethod} onChange={e => setAptAbonoMethod(e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia')}
                  className={`${inputCls} mt-1`}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ${textSub}`}>Nota (opcional)</label>
                <input value={aptAbonoNote} onChange={e => setAptAbonoNote(e.target.value)}
                  placeholder="Referencia, folio..." className={`${inputCls} mt-1`} />
              </div>
              {renderPrintAndWhatsappOptions()}
              <div className="flex gap-2 pt-1">
                <button onClick={handleAbonarApartado}
                  disabled={!aptAbonoAmount || parseFloat(aptAbonoAmount) <= 0}
                  className={`flex-1 py-2.5 font-black text-xs uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isRetro ? 'bg-amber-500 text-white border-2 border-t-amber-300 border-l-amber-300 border-b-amber-700 border-r-amber-700' : 'bg-amber-500 hover:bg-amber-600 text-white rounded-lg'}`}
                  ref={el => { if (el && isRetro) el.style.setProperty('color','white','important'); }}>
                  {printTicket ? 'Registrar e imprimir' : sendWhatsapp ? 'Registrar y WhatsApp' : 'Registrar abono'}
                </button>
                <button onClick={() => setAptModal(null)}
                  className={`px-4 py-2.5 font-black text-xs uppercase cursor-pointer ${isRetro ? 'bg-zinc-200 text-zinc-700 border-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400' : isLight ? 'bg-zinc-100 text-zinc-600 rounded-lg' : 'bg-zinc-700 text-zinc-300 rounded-lg'}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
