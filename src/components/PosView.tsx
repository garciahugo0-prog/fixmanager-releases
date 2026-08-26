/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InventoryItem, ServicePrice, Sale, WorkshopConfig, AppUser, ApartadoEntry, RepairOrder, RefaccionItem, CreditAccount } from '../types';
import usePosLogic from '../hooks/usePosLogic';
import PosRetro from './pos/PosRetro';
import PosModern from './pos/PosModern';
import PosFluent from './pos/PosFluent';

interface PosViewProps {
  orders: RepairOrder[];
  inventory: InventoryItem[];
  services: ServicePrice[];
  refacciones?: RefaccionItem[];
  creditAccounts?: CreditAccount[];
  onCompleteSale: (sale: Sale, options?: { printTicket?: boolean; sendWhatsApp?: boolean; whatsappPhone?: string; whatsappCountryCode?: string }) => void;
  onFiarSale?: (clientName: string, clientPhone: string, items: { itemId: string; name: string; quantity: number; price: number }[], total: number, forceNew?: boolean, payCash?: number, payCard?: number, options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => void;
  checkFiarClient?: (name: string, phone: string) => { clientName: string; clientPhone: string; balance: number; matchType: 'phone' | 'name-only' } | null;
  config: WorkshopConfig;
  sales?: Sale[];
  users?: AppUser[];
  setActiveTab?: (tab: string) => void;
  onCancelSale?: (saleId: string) => void;
  currentUser?: AppUser | null;
  onCreateApartado?: (entry: ApartadoEntry, options?: { printTicket?: boolean; sendWhatsApp?: boolean }) => void;
  onAddItem?: (item: InventoryItem) => void;
  onRegisterChipActivation?: (activation: { clientName: string; clientPhone?: string; chipNumber: string; iccid?: string; imei?: string; carrier: string; saleId?: string; price?: number }) => void;
  warehouses?: any[];
  onSetInventory?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onSetRefacciones?: React.Dispatch<React.SetStateAction<RefaccionItem[]>>;
  onUpdateConfig?: (config: WorkshopConfig) => void;
}

export default function PosView(props: PosViewProps) {
  const logic = usePosLogic(props);

  if (props.config.theme === 'retro-window') return <PosRetro logic={logic} warehouses={props.warehouses} />;
  if (props.config.theme === 'fluent') return <PosFluent logic={logic} warehouses={props.warehouses} />;
  return <PosModern logic={logic} warehouses={props.warehouses} />;
}
