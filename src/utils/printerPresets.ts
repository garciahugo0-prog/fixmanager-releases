/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrinterPresetProfile {
  id: string;
  brand: string;
  model: string;
  paperWidth: '58mm' | '80mm';
  ticketMarginOffset: number;
  cutPaperAfterPrint: boolean;
  usePrinterDefaultPageSize: boolean;
  useDynamicHeight: boolean;
  ticketPaperHeight: number;
  barcodeAsImage: boolean;
}

export const PRINTER_PRESETS_DATABASE: PrinterPresetProfile[] = [
  {
    id: 'xprinter-xp-n160ii',
    brand: 'Xprinter',
    model: 'XP-N160II (80mm)',
    paperWidth: '80mm',
    ticketMarginOffset: -11,
    cutPaperAfterPrint: false,
    usePrinterDefaultPageSize: false,
    useDynamicHeight: false,
    ticketPaperHeight: 0,
    barcodeAsImage: false
  },
  {
    id: 'xprinter-xp-58iih',
    brand: 'Xprinter',
    model: 'XP-58IIH / POS-58 (58mm)',
    paperWidth: '58mm',
    ticketMarginOffset: -6,
    cutPaperAfterPrint: false,
    usePrinterDefaultPageSize: false,
    useDynamicHeight: false,
    ticketPaperHeight: 0,
    barcodeAsImage: true
  },
  {
    id: 'epson-tm-t20',
    brand: 'Epson',
    model: 'TM-T20 / TM-T88 (80mm)',
    paperWidth: '80mm',
    ticketMarginOffset: 0,
    cutPaperAfterPrint: true,
    usePrinterDefaultPageSize: false,
    useDynamicHeight: false,
    ticketPaperHeight: 0,
    barcodeAsImage: true
  },
  {
    id: 'star-tsp100',
    brand: 'Star Micronics',
    model: 'TSP100 / TSP650 (80mm)',
    paperWidth: '80mm',
    ticketMarginOffset: 0,
    cutPaperAfterPrint: true,
    usePrinterDefaultPageSize: false,
    useDynamicHeight: false,
    ticketPaperHeight: 0,
    barcodeAsImage: true
  },
  {
    id: 'zjiang-pos-5890u',
    brand: 'Zjiang / Genérica',
    model: 'POS-5890U / ZJ-5890 (58mm)',
    paperWidth: '58mm',
    ticketMarginOffset: -5,
    cutPaperAfterPrint: false,
    usePrinterDefaultPageSize: false,
    useDynamicHeight: false,
    ticketPaperHeight: 0,
    barcodeAsImage: true
  }
];
