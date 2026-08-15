/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RepairOrder } from '../types';

export const getIndividualAdvance = (order: RepairOrder, allOrders: RepairOrder[]): number => {
  if (order.batchId) {
    const siblings = allOrders.filter(x => x.batchId === order.batchId);
    if (siblings.length > 1) {
      const totalAdvance = order.batchAdvancePayment || 0;
      const totalCost = siblings.reduce((sum, x) => sum + x.cost, 0);
      if (totalCost === 0) {
        const base = Math.floor(totalAdvance / siblings.length);
        const rem = totalAdvance - base * siblings.length;
        const idx = siblings.findIndex(s => s.id === order.id);
        return base + (idx >= 0 && idx < rem ? 1 : 0);
      }

      const items = siblings.map(o => {
        const exact = (o.cost / totalCost) * totalAdvance;
        const floor = Math.floor(exact);
        const remainder = exact - floor;
        return { id: o.id, cost: o.cost, floor, remainder };
      });

      items.sort((a, b) => {
        if (Math.abs(a.remainder - b.remainder) > 1e-9) return b.remainder - a.remainder;
        if (a.cost !== b.cost) return b.cost - a.cost;
        return a.id.localeCompare(b.id);
      });

      const sumFloor = items.reduce((s, item) => s + item.floor, 0);
      const difference = Math.round(totalAdvance - sumFloor);

      const foundIdx = items.findIndex(item => item.id === order.id);
      if (foundIdx >= 0) {
        return items[foundIdx].floor + (foundIdx < difference ? 1 : 0);
      }
    }
  }
  return order.advancePayment || 0;
};
