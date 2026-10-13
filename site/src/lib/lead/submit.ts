/**
 * Lead submission — same contract as the original lead-submit.js:
 *   submitLead(type, payload, files) → Promise<{ ref?: string }>
 * POSTs JSON (or multipart when files are attached) to PUBLIC_LEAD_ENDPOINT.
 * With no endpoint configured the submit is simulated (preview/dev only).
 */
import { looksLikeBot } from './validate';

export type LeadType = 'trading-account' | 'quote' | 'quick-quote';

export const LEAD_ENDPOINT: string = import.meta.env.PUBLIC_LEAD_ENDPOINT ?? '';
export const LEADS_SIMULATED = !LEAD_ENDPOINT;

export interface SpamGuard {
  honeypot: string;
  startedAt: number;
}

export async function submitLead(
  type: LeadType,
  payload: Record<string, unknown>,
  files: Record<string, File> | null,
  guard: SpamGuard,
): Promise<{ ref?: string }> {
  // Silently "succeed" for bots so they get no signal.
  if (looksLikeBot(guard.honeypot, guard.startedAt)) return {};

  const meta = {
    type,
    submittedAt: new Date().toISOString(),
    page: location.href,
    referrer: document.referrer || null,
    elapsedMs: Date.now() - guard.startedAt,
  };

  if (LEADS_SIMULATED) {
    console.warn('[Medad-X] PUBLIC_LEAD_ENDPOINT not set — submission simulated, nothing was sent.', meta);
    await new Promise((r) => setTimeout(r, 1200));
    return {};
  }

  const hasFiles = !!files && Object.values(files).some(Boolean);
  let body: BodyInit;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasFiles) {
    const fd = new FormData();
    fd.append('meta', JSON.stringify(meta));
    fd.append('payload', JSON.stringify(payload));
    for (const [k, f] of Object.entries(files!)) if (f) fd.append(k, f, f.name);
    body = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ meta, payload });
  }
  const res = await fetch(LEAD_ENDPOINT, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const out = await res.json().catch(() => ({}));
  track(`${type.replace('-', '_')}_submit`);
  return out as { ref?: string };
}

/** Optional analytics hook (Vercel Web Analytics exposes window.va when enabled). */
export function track(event: string) {
  try {
    (window as unknown as { va?: (e: string, p: { name: string }) => void }).va?.('event', { name: event });
  } catch {
    /* analytics not installed */
  }
}

export const fallbackRef = (prefix = 'MX-') => prefix + Math.floor(100000 + Math.random() * 900000);
