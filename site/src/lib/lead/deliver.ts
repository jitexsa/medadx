/**
 * Server-only: emails a validated lead to the trade team with Resend (email.ts builds it), then
 * sends the customer a confirmation (confirm-email.ts) when they gave an email. Used by api/lead.ts.
 * Keep this free of Astro/browser APIs (it runs as a plain Vercel Function).
 *
 * Env (set in Vercel, never in the repo):
 *   RESEND_API_KEY     required; a "sending access" key is enough
 *   LEAD_TO            comma-separated recipients (default info@medadx.com)
 *   LEAD_FROM          sender on a Resend-verified domain (default "Medad-X Website <leads@medadx.com>")
 *   LEAD_FALLBACK_TO   used only while LEAD_FROM's domain is not verified: the lead is sent from
 *                      onboarding@resend.dev to this address (must be the Resend account owner's email)
 *   CONFIRM_FROM       sender of the customer confirmation (default "Medad-X <leads@medadx.com>");
 *                      replies go to LEAD_TO
 *   LEAD_CONFIRM       set to "off" to stop customer confirmations (e.g. if the form is abused)
 */

import { buildConfirmationEmail } from './confirm-email.js';
import { attachmentName, buildLeadEmail } from './email.js';

export { buildLeadEmail };

export type LeadKind = 'trading-account' | 'quote' | 'quick-quote';
export interface Lead {
  meta: Record<string, unknown>;
  payload: Record<string, unknown>;
  files: { key: string; file: File }[];
}
export interface MailConfig {
  apiKey: string;
  to: string[];
  from: string;
  fallbackTo: string[];
  confirmFrom: string;
  confirm: boolean;
}
export interface MailMessage {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}
export type DeliveryResult =
  /** confirmed: the customer confirmation was sent; confirmError: it was attempted and failed. */
  { ok: true; via: 'primary' | 'fallback'; confirmed: boolean; confirmError?: string } | { ok: false; status: number; error: string };

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TEST_SENDER = 'Medad-X Website <onboarding@resend.dev>';

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Reads the mail settings from env. Returns null when Resend is not configured. */
export function mailConfig(env: Record<string, string | undefined>): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const to = list(env.LEAD_TO);
  return {
    apiKey,
    to: to.length ? to : ['info@medadx.com'],
    from: env.LEAD_FROM?.trim() || 'Medad-X Website <leads@medadx.com>',
    fallbackTo: list(env.LEAD_FALLBACK_TO),
    confirmFrom: env.CONFIRM_FROM?.trim() || 'Medad-X <leads@medadx.com>',
    confirm: (env.LEAD_CONFIRM ?? '').trim().toLowerCase() !== 'off',
  };
}

async function postResend(apiKey: string, body: unknown, idempotencyKey: string, fetchImpl: typeof fetch) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchImpl(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true as const, status: res.status, message: '' };
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      // Retry once on rate limits and Resend outages; client errors are final.
      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return { ok: false as const, status: res.status, message: String(err.message ?? '') };
    } catch (e) {
      if (attempt === 0) continue;
      return { ok: false as const, status: 0, message: e instanceof Error ? e.message : 'network error' };
    }
  }
}

/** Sends the lead. Falls back to Resend's test sender while the domain is unverified (if configured). */
export async function deliverLead(lead: Lead, ref: string, cfg: MailConfig, fetchImpl: typeof fetch = fetch): Promise<DeliveryResult> {
  const attachments = await Promise.all(
    lead.files.map(async (f) => ({ filename: attachmentName(f), content: Buffer.from(await f.file.arrayBuffer()).toString('base64') })),
  );
  const send = (from: string, to: string[], msg: MailMessage, key: string) =>
    postResend(
      cfg.apiKey,
      {
        from,
        to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        ...(attachments.length ? { attachments } : {}),
        tags: [{ name: 'lead_type', value: String(lead.meta.type).replace(/[^\w-]/g, '_') }],
      },
      key,
      fetchImpl,
    );

  const primary = await send(cfg.from, cfg.to, buildLeadEmail(lead, ref), ref);
  if (primary.ok) return { ok: true, via: 'primary', ...(await confirmCustomer(lead, ref, cfg, fetchImpl)) };

  const unverified = primary.status === 403 && /not verified|verify a domain/i.test(primary.message);
  if (unverified && cfg.fallbackTo.length) {
    const note = `Sent with Resend's test sender because the sending domain is not verified yet. Intended for: ${cfg.to.join(', ')}. Verify the domain in Resend to deliver there directly.`;
    const fb = await send(RESEND_TEST_SENDER, cfg.fallbackTo, buildLeadEmail(lead, ref, note), `${ref}-fallback`);
    // No customer confirmation here: an unverified domain can only send to the account owner.
    if (fb.ok) return { ok: true, via: 'fallback', confirmed: false };
    return { ok: false, status: fb.status, error: fb.message };
  }
  return { ok: false, status: primary.status, error: primary.message };
}

/** Best effort: the lead already reached the team, so a failure here never fails the submission. */
async function confirmCustomer(lead: Lead, ref: string, cfg: MailConfig, fetchImpl: typeof fetch) {
  const msg = cfg.confirm ? buildConfirmationEmail(lead, ref) : null;
  if (!msg) return { confirmed: false };
  const res = await postResend(
    cfg.apiKey,
    {
      from: cfg.confirmFrom,
      to: [msg.to],
      reply_to: cfg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      tags: [
        { name: 'lead_type', value: String(lead.meta.type).replace(/[^\w-]/g, '_') },
        { name: 'email', value: 'customer_confirmation' },
      ],
    },
    `${ref}-confirm`,
    fetchImpl,
  );
  return res.ok ? { confirmed: true } : { confirmed: false, confirmError: `${res.status} ${res.message}`.trim() };
}
