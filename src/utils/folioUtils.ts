/**
 * Utility functions for generating incremental 4-digit folios for Repair Orders (TKT-0001)
 * and POS Sales (S-0001) with automatic anti-collision checking.
 */
import { RepairOrder, Sale } from '../types';

/**
 * Generates the next sequential Repair Order ID starting at `TKT-0001`.
 * Increments from 1 upward, skipping any ID or number that already exists in the database.
 */
export function generateNextOrderId(existingOrders: RepairOrder[] = [], prefix: string = 'TKT', startingNumber: number = 1): string {
  const existingSet = new Set<string>();
  const existingNums = new Set<number>();

  for (const order of existingOrders) {
    if (order && order.id) {
      existingSet.add(order.id.trim().toUpperCase());
      if (order.id.trim().toUpperCase().startsWith(prefix.toUpperCase() + '-')) {
        const match = order.id.match(/(\d+)/);
        if (match) {
          existingNums.add(parseInt(match[1], 10));
        }
      }
    }
  }

  let currNum = Math.max(1, startingNumber);

  while (true) {
    const candidateId = `${prefix}-${String(currNum).padStart(4, '0')}`;
    const candidateShortId = `${prefix}-${currNum}`;

    if (!existingSet.has(candidateId) && !existingSet.has(candidateShortId) && !existingNums.has(currNum)) {
      return candidateId;
    }
    currNum++;
  }
}

/**
 * Generates the next sequential POS Sale ID starting at `S-0001`.
 * Increments from 1 upward, skipping any ID or number that already exists in the database.
 */
export function generateNextSaleId(existingSales: Sale[] = [], prefix: string = 'E', startingNumber: number = 1): string {
  const existingSet = new Set<string>();
  const existingNums = new Set<number>();

  for (const sale of existingSales) {
    if (sale && sale.id) {
      existingSet.add(sale.id.trim().toUpperCase());
      if (sale.id.trim().toUpperCase().startsWith(prefix.toUpperCase() + '-')) {
        const match = sale.id.match(/(\d+)/);
        if (match) {
          existingNums.add(parseInt(match[1], 10));
        }
      }
    }
  }

  let currNum = Math.max(1, startingNumber);

  while (true) {
    const candidateId = `${prefix}-${String(currNum).padStart(4, '0')}`;
    const candidateShortId = `${prefix}-${currNum}`;

    if (!existingSet.has(candidateId) && !existingSet.has(candidateShortId) && !existingNums.has(currNum)) {
      return candidateId;
    }
    currNum++;
  }
}

/**
 * Extracts pure numeric ticket number string for Sale ticketNumber property (e.g. "0001").
 */
export function extractSaleTicketNumber(saleId: string): string {
  const digits = saleId.replace(/\D/g, '');
  return digits ? digits.padStart(4, '0') : '0001';
}
