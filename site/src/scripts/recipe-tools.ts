/** Recipe detail: servings scaler (ported parse/format/scale logic), print, share/copy. */
const root = document.querySelector<HTMLElement>('[data-recipe-root]');

const FRACS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅐': 1 / 7,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '⅑': 1 / 9,
  '⅒': 0.1,
};
const FCHARS = Object.keys(FRACS).join('');

export function parseVal(tok: string): number {
  tok = tok.trim();
  const last = tok.charAt(tok.length - 1);
  if (FRACS[last] !== undefined) {
    const num = tok.slice(0, -1).replace(/\s+/g, '');
    return (num ? parseFloat(num) : 0) + FRACS[last]!;
  }
  return parseFloat(tok);
}

export function fmtQty(x: number): string {
  if (!isFinite(x)) return '';
  if (x >= 10) return String(Math.round(x));
  const whole = Math.floor(x + 1e-9);
  const frac = x - whole;
  const table: [number, string][] = [
    [0, ''],
    [0.125, '⅛'],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
    [1, ''],
  ];
  let best = table[0]!;
  let bd = Math.abs(frac);
  for (const row of table) {
    const d = Math.abs(frac - row[0]);
    if (d < bd) {
      bd = d;
      best = row;
    }
  }
  let w = whole;
  let f = best[1];
  if (best[0] === 1) {
    w += 1;
    f = '';
  }
  if (w === 0 && f === '') return x < 0.05 ? '0' : String(Math.round(x * 100) / 100);
  if (w === 0) return f;
  return f ? `${w}${f}` : String(w);
}

export function scaleLine(text: string, factor: number): string {
  if (factor === 1 || !text) return text;
  const numTok = `(?:\\d+(?:\\.\\d+)?(?:\\s*[${FCHARS}])?|[${FCHARS}])`;
  const m = text.match(new RegExp(`^\\s*(${numTok})(\\s*[\\u2013-]\\s*(${numTok}))?`));
  if (!m) return text;
  let out = fmtQty(parseVal(m[1]!) * factor);
  if (m[3]) out += '–' + fmtQty(parseVal(m[3]) * factor);
  return out + text.slice(m[0].length);
}

if (root) {
  const base = Number(root.dataset.base) || 1;
  let serves = base;
  const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-qty]'));
  const outs = Array.from(root.querySelectorAll<HTMLElement>('[data-serves],[data-serves-out]'));
  const note = root.querySelector<HTMLElement>('[data-scaled-note]');
  const render = () => {
    const f = serves / base;
    lines.forEach((l) => (l.textContent = scaleLine(l.dataset.qty ?? '', f)));
    outs.forEach((o) => (o.textContent = String(serves)));
    if (note) note.hidden = serves === base;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-serve]').forEach((b) =>
    b.addEventListener('click', () => {
      serves = Math.max(1, Math.min(40, serves + Number(b.dataset.serve)));
      render();
    }),
  );

  const toast = document.querySelector<HTMLElement>('[data-rd-toast]');
  const showToast = () => {
    if (!toast) return;
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 2200);
  };
  root.querySelector('[data-rd-print]')?.addEventListener('click', () => window.print());
  root.querySelector<HTMLButtonElement>('[data-rd-share]')?.addEventListener('click', async (e) => {
    const title = (e.currentTarget as HTMLElement).dataset.title ?? document.title;
    const url = location.href.split('#')[0]!;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* blocked */
    }
    showToast();
  });
}
