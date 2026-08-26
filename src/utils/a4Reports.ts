/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function showToast(msg: string, type: 'warn' | 'ok' = 'warn') {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;white-space:nowrap;background:${type==='ok'?'#16a34a':'#b45309'};color:#fff;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function notifyDone(msg: string) {
  showToast(msg, 'ok');
}

export function buildA4ReportHtml(title: string, subtitle: string, storeName: string, rows: string, summaryHtml: string): string {
  const now = new Date().toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 15mm; }
  @media print { body { padding: 0 !important; } }
  .header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-left h1 { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
  .header-left p { font-size: 10px; color: #555; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9px; color: #555; }
  .header-right strong { display: block; font-size: 11px; color: #111; }
  .subtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-left: 4px solid #111; padding-left: 8px; margin-bottom: 10px; color: #222; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 5px 8px; text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; }
  thead th:last-child { text-align: right; }
  tbody tr:nth-child(even) { background: #f5f5f5; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 700; }
  .summary { margin-top: 16px; border-top: 2px solid #111; padding-top: 10px; display: flex; flex-wrap: wrap; gap: 12px; }
  .summary-item { background: #f0f0f0; border: 1px solid #ddd; padding: 8px 14px; border-radius: 4px; min-width: 120px; }
  .summary-item label { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 700; }
  .summary-item span { display: block; font-size: 14px; font-weight: 900; margin-top: 2px; }
  .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 8.5px; color: #888; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1>${storeName}</h1>
    <p>${title}</p>
  </div>
  <div class="header-right">
    <strong>${now}</strong>
    Reporte generado por FixManager
  </div>
</div>
<div class="subtitle">${subtitle}</div>
<table>${rows}</table>
<div class="summary">${summaryHtml}</div>
<div class="footer">${storeName} &mdash; Reporte generado automáticamente por FixManager &mdash; ${now}</div>
</body></html>`;
}

export async function printA4Report(html: string, printerName?: string): Promise<void> {
  if (!printerName?.trim()) {
    showToast('⚠️ No hay una impresora A4 configurada. Define una impresora A4 en Ajustes > Impresoras antes de imprimir.', 'warn');
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fm-silent-print', { detail: { html, deviceName: printerName, paperWidthMicrons: 210000, paperHeightMicrons: 297000, isReport: true } }));
  }
}
