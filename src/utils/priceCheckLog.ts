const KEY = 'fixmanager_price_checks';
const MAX = 2000;

export interface PriceCheckEntry {
  id: string;
  itemId: string;
  name: string;
  code: string;
  price: number;
  category: string;
  brand: string;
  consultedAt: string;
  addedToCart: boolean;
}

function load(): PriceCheckEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save(entries: PriceCheckEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
}

export function logPriceCheck(item: { id: string; name: string; code: string; price: number; category: string; brand: string }): string {
  const entry: PriceCheckEntry = {
    id: `PC-${Date.now().toString(36).toUpperCase()}`,
    itemId: item.id,
    name: item.name,
    code: item.code,
    price: item.price,
    category: item.category,
    brand: item.brand,
    consultedAt: new Date().toISOString(),
    addedToCart: false,
  };
  const entries = load();
  entries.push(entry);
  save(entries);
  return entry.id;
}

export function markAddedToCart(entryId: string) {
  const entries = load();
  const idx = entries.findIndex(e => e.id === entryId);
  if (idx !== -1) { entries[idx].addedToCart = true; save(entries); }
}

export function loadPriceCheckLog(): PriceCheckEntry[] {
  return load();
}
