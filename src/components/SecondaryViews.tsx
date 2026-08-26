/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Central re-export barrel for backward compatibility
export { buildA4ReportHtml, printA4Report, showToast, notifyDone } from '../utils/a4Reports';
export { PRINTER_PRESETS_DATABASE, type PrinterPresetProfile } from '../utils/printerPresets';
export {
  DEFAULT_LABEL_TEMPLATE,
  DEFAULT_LABEL_PRODUCT_TEMPLATE,
  DEFAULT_TICKET_POS,
  DEFAULT_OT_PRESET,
  type StickerElement
} from '../utils/ticketTemplates';

export { PreciosView, type PreciosViewProps } from './PreciosView';
export { VentasView, type VentasViewProps } from './VentasView';
export { ClientesView, type ClientesViewProps, ImportClientsModal, type ImportClientsModalProps } from './ClientesView';
export { CortesView, type CortesViewProps } from './CortesView';
export { GastosView, type GastosProps } from './GastosView';
export { TicketConfigView, type TicketConfigProps } from './TicketConfigView';
export { MovimientoModal, type MovimientoModalProps } from './MovimientoModal';
export { ConfigView } from './ConfigView';
