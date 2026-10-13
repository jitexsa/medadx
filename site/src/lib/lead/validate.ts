/** Validation shared by the forms (client) and api/lead.ts (server). Ported from the design. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Accepts digits, spaces, dashes, brackets and a leading +; 6–18 chars. */
export const PHONE_RE = /^\+?[\d\s\-()]{6,18}$/;

export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isPhone = (v: string) => PHONE_RE.test(v.trim());

export const FILE_RULES = {
  accept: '.pdf,.jpg,.jpeg,.png',
  mime: ['application/pdf', 'image/jpeg', 'image/png'],
  maxFiles: 3,
  /** Vercel Functions cap request bodies at 4.5 MB; keep total uploads under that. */
  maxTotalBytes: 4 * 1024 * 1024,
} as const;

export type FileCheck = { ok: true } | { ok: false; reason: 'type' | 'size' | 'count' };

export function checkFiles(files: File[]): FileCheck {
  if (files.length > FILE_RULES.maxFiles) return { ok: false, reason: 'count' };
  if (files.some((f) => !(FILE_RULES.mime as readonly string[]).includes(f.type))) return { ok: false, reason: 'type' };
  if (files.reduce((n, f) => n + f.size, 0) > FILE_RULES.maxTotalBytes) return { ok: false, reason: 'size' };
  return { ok: true };
}

/** Honeypot + minimum fill time. Bots fill hidden fields and submit instantly. */
export const MIN_FILL_MS = 3000;
export function looksLikeBot(honeypot: string, startedAt: number, now = Date.now()) {
  return honeypot.trim() !== '' || now - startedAt < MIN_FILL_MS;
}
