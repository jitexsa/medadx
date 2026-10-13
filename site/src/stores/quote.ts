/**
 * Quote selection shared by every island and static "Request quote" button.
 * Persisted to sessionStorage (product/pack/qty only — no personal data).
 */
import { atom, map } from 'nanostores';

export interface QuoteItem {
  packIdx: number;
  qty: string;
}
export type QuoteItems = Record<string, QuoteItem>;

const KEY = 'mx-quote';
const load = (): QuoteItems => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as QuoteItems;
  } catch {
    return {};
  }
};

export const $quoteItems = map<QuoteItems>(typeof window === 'undefined' ? {} : load());
export const $drawerOpen = atom(false);

if (typeof window !== 'undefined') {
  $quoteItems.listen((v) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  });
}

/** Mirrors the design's openDrawer(items, replace). */
export function openQuote(items: Record<string, Partial<QuoteItem>> = {}, replace = false) {
  const base = replace ? {} : { ...$quoteItems.get() };
  for (const [id, patch] of Object.entries(items)) {
    base[id] = Object.assign({ packIdx: 0, qty: '' }, base[id], patch);
  }
  $quoteItems.set(base);
  $drawerOpen.set(true);
}

export function setQuoteItem(id: string, patch: Partial<QuoteItem> | null) {
  const next = { ...$quoteItems.get() };
  if (patch === null) delete next[id];
  else next[id] = Object.assign({ packIdx: 0, qty: '' }, next[id], patch);
  $quoteItems.set(next);
}

export const closeQuote = () => $drawerOpen.set(false);

/** Contact details typed into the drawer, carried to the full quote form (this tab only). */
const PREFILL = 'mx-quote-contact';
export function savePrefill(v: { name?: string; company?: string; phone?: string }) {
  try {
    sessionStorage.setItem(PREFILL, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}
export function takePrefill(): { name?: string; company?: string; phone?: string } {
  try {
    const v = JSON.parse(sessionStorage.getItem(PREFILL) ?? '{}');
    sessionStorage.removeItem(PREFILL);
    return v;
  } catch {
    return {};
  }
}
