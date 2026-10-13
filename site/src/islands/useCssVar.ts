import type { RefObject } from 'preact';
import { useLayoutEffect } from 'preact/hooks';

/**
 * Apply a dynamic style via CSSOM after render. Inline `style` attributes are blocked by
 * the site's Content-Security-Policy, but CSSOM writes (`el.style.setProperty`) are allowed.
 */
export function useCssVar(ref: RefObject<HTMLElement | SVGElement | null>, name: string, value: string) {
  useLayoutEffect(() => {
    ref.current?.style.setProperty(name, value);
  }, [value]);
}
