/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo } from 'react';

interface EcoTicketModalProps {
  queue: { html: string; isReport?: boolean }[];
  isRetro: boolean;
  isLight: boolean;
  onDismiss: () => void;
}

function detectPaperWidth(html: string): number {
  // Look for @page size: 58mm or 80mm in the style block
  const match = html.match(/size:\s*(\d+)mm/);
  if (match) return parseInt(match[1], 10);
  return 80; // default
}

function downloadReportAsPdf(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=900,height=700');
  if (win) {
    win.onload = () => {
      win.print();
      URL.revokeObjectURL(url);
    };
  }
}

export default function EcoTicketModal({ queue, isRetro, isLight, onDismiss }: EcoTicketModalProps) {
  const current = queue[0] ?? { html: '', isReport: false };
  const html = current.html;
  const isReport = !!current.isReport;
  const total = queue.length;

  const paperWidthMm = useMemo(() => {
    if (isReport) return null;
    return detectPaperWidth(html);
  }, [html, isReport]);

  // For tickets: convert mm to px at 96dpi
  const paperWidthPx = paperWidthMm ? Math.round(paperWidthMm * 3.7795) : null;

  // For reports: A4 is 794px wide at 96dpi
  const reportWidthPx = 794;

  // Scale to fit within viewport
  const maxWidthVw = Math.round(window.innerWidth * 0.9);
  const scale = isReport
    ? Math.min(1, maxWidthVw / reportWidthPx)
    : Math.min(1, maxWidthVw / (paperWidthPx ?? 302));

  const iframeWidth = isReport ? reportWidthPx : (paperWidthPx ?? 302);
  const iframeHeight = isReport
    ? Math.round(window.innerHeight * 0.72)
    : Math.round(window.innerHeight * 0.62);

  const headerBg = isRetro ? 'bg-[#000080]' : isLight ? 'bg-[#1a3a6b]' : 'bg-[#11131e]';
  const footerBg = isRetro ? 'bg-[#dfdfdf]' : isLight ? 'bg-white' : 'bg-zinc-900';

  const maxModalWidth = isReport ? Math.round(reportWidthPx * scale) : Math.round((paperWidthPx ?? 302) * scale);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center">
      {/* Header */}
      <div
        className={`modal-dark-header ${headerBg} text-white px-4 py-2.5 flex items-center justify-between rounded-t-xl`}
        style={{ width: maxModalWidth }}
      >
        <span className="text-sm font-bold tracking-wide">
          {isReport ? '📄 REPORTE DIGITAL' : '📋 TICKET DIGITAL — Muéstrelo al cliente'}
        </span>
        {total > 1 && (
          <span className="text-xs font-mono opacity-75">
            {isReport ? 'Reporte' : 'Ticket'} 1 de {total}
          </span>
        )}
      </div>

      {/* Iframe container */}
      <div
        className="bg-white overflow-hidden shadow-2xl"
        style={{
          width: iframeWidth,
          height: iframeHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: scale < 1 ? `${iframeHeight * (scale - 1)}px` : 0,
        }}
      >
        <iframe
          srcDoc={html}
          title={isReport ? 'Reporte digital' : 'Ticket digital'}
          style={{ width: iframeWidth, height: iframeHeight, border: 'none', display: 'block' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      {/* Footer */}
      <div
        className={`${footerBg} px-4 py-3 flex items-center justify-center gap-3 rounded-b-xl`}
        style={{ width: maxModalWidth }}
      >
        {isReport ? (
          <>
            <button
              onClick={() => downloadReportAsPdf(html)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
            >
              ⬇ Descargar PDF
            </button>
            <button
              onClick={onDismiss}
              className={`px-5 py-2.5 font-semibold rounded-lg text-sm transition-colors cursor-pointer border ${
                isRetro
                  ? 'border-zinc-500 text-zinc-700 hover:bg-zinc-200'
                  : isLight
                  ? 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                  : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Cerrar
            </button>
          </>
        ) : total > 1 ? (
          <button
            onClick={onDismiss}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Siguiente → ({total - 1} restante{total - 1 !== 1 ? 's' : ''})
          </button>
        ) : (
          <button
            onClick={onDismiss}
            className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            ✓ Listo
          </button>
        )}
      </div>
    </div>
  );
}
