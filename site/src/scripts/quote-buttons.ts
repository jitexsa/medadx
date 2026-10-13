/**
 * Static buttons → quote drawer. Works before the drawer island hydrates: the store
 * keeps the selection and the drawer opens as soon as it mounts.
 *   <button data-quote-add="farah" data-pack-idx="0">      add a product
 *   <a href="/contact" data-quote-open>                  open the drawer (link is the no-JS fallback)
 */
import { openQuote } from '@/stores/quote';

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-quote-add],[data-quote-open]');
  if (!el || e.defaultPrevented || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey) return;
  e.preventDefault();
  const id = el.dataset.quoteAdd;
  if (id) openQuote({ [id]: { packIdx: Number(el.dataset.packIdx ?? 0) || 0 } });
  else openQuote();
});

// Conversion events for analytics (no-op unless analytics is enabled).
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
  if (el?.dataset.track) {
    try {
      (window as unknown as { va?: (e: string, p: { name: string }) => void }).va?.('event', { name: el.dataset.track });
    } catch {
      /* analytics not installed */
    }
  }
});
