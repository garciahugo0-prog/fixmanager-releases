export const DRAFT_KEY = 'fxmgr_reabasto_draft';

export function hasPendingReabastoDraft(): boolean {
  try {
    const d = localStorage.getItem(DRAFT_KEY);
    if (!d) return false;
    const parsed = JSON.parse(d);
    return Array.isArray(parsed.replenishList) && parsed.replenishList.length > 0;
  } catch { return false; }
}

export function clearReabastoDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
