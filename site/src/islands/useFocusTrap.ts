import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for dialogs: traps Tab inside `ref`, closes on Escape, makes the
 * rest of the page `inert`, locks body scroll, and returns focus to the opener.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const outside = Array.from(document.body.children).filter((el) => !el.contains(panel) && el.tagName !== 'SCRIPT') as HTMLElement[];
    outside.forEach((el) => (el.inert = true));
    document.body.classList.add('is-locked');

    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const firstEl = nodes[0]!;
      const lastEl = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      outside.forEach((el) => (el.inert = false));
      document.body.classList.remove('is-locked');
      opener?.focus?.();
    };
  }, [active]);
}
