/**
 * Server-only: turns a validated lead into an email for the trade team and sends it with Resend.
 * Used by api/lead.ts. Keep this free of Astro/browser APIs (it runs as a plain Vercel Function).
 *
 * Env (set in Vercel, never in the repo):
 *   RESEND_API_KEY     required; a "sending access" key is enough
 *   LEAD_TO            comma-separated recipients (default info@medadx.com)
 *   LEAD_FROM          sender on a Resend-verified domain (default "Medad-X Website <leads@medadx.com>")
 *   LEAD_FALLBACK_TO   used only while LEAD_FROM's domain is not verified: the lead is sent from
 *                      onboarding@resend.dev to this address (must be the Resend account owner's email)
 */

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
}
export interface MailMessage {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}
export type DeliveryResult = { ok: true; via: 'primary' | 'fallback' } | { ok: false; status: number; error: string };

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TEST_SENDER = 'Medad-X Website <onboarding@resend.dev>';
const TITLES: Record<LeadKind, string> = {
  quote: 'Quote request',
  'quick-quote': 'Quick inquiry',
  'trading-account': 'Trading account application',
};

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
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** One-line text: collapses whitespace (incl. newlines) and caps the length. */
const line = (v: unknown, max = 300) =>
  (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
/** Multi-line text (the message box): keeps line breaks, caps the length. */
const block = (v: unknown, max = 5000) => (v == null ? '' : String(v)).replace(/\r\n?/g, '\n').trim().slice(0, max);

function phoneOf(kind: LeadKind, p: Record<string, unknown>) {
  const phone = line(p.phone, 40);
  if (kind !== 'trading-account' || phone.startsWith('+')) return phone;
  return `${line(p.dial, 8)} ${phone.replace(/^0+/, '')}`.trim();
}

/** wa.me link when the number is in international format; otherwise undefined (no guessing). */
function waLink(phone: string) {
  if (!phone.startsWith('+')) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : undefined;
}

type Row = [label: string, value: string, opts?: { href?: string; pre?: boolean }];

function rowsFor(kind: LeadKind, p: Record<string, unknown>): Row[] {
  const phone = phoneOf(kind, p);
  const email = line(p.email, 200);
  const contact: Row[] = [
    ['Phone', phone, { href: waLink(phone) }],
    ['Email', email, { href: email ? `mailto:${email}` : undefined }],
  ];
  if (kind === 'trading-account') {
    return [
      ['Company', line(p.company)],
      ['Business type', line(p.bizType)],
      ['Country', line(p.country)],
      ['City', line(p.city)],
      ['Trade license no.', line(p.license)],
      ['Contact name', line(p.name)],
      ['Role', line(p.role)],
      ...contact,
      ['Products of interest', line(p.products, 600)],
      ['Monthly volume', line(p.volume)],
      ['Target markets', line(p.markets, 600)],
      ['Consent to contact', p.consent === true ? 'Yes' : 'No'],
    ];
  }
  return [
    ['Name', line(p.name)],
    ['Company', line(p.company)],
    ...contact,
    ...(kind === 'quote' ? ([['Message', block(p.message), { pre: true }]] as Row[]) : []),
  ];
}

function itemsFor(kind: LeadKind, p: Record<string, unknown>): string[] {
  if (kind === 'quick-quote' && Array.isArray(p.items)) return p.items.slice(0, 20).map((i) => line(i));
  if (kind === 'quote' && Array.isArray(p.lines)) {
    const out = p.lines.slice(0, 50).map((l: Record<string, unknown>) => `${line(l?.product)} · ${line(l?.size)} × ${line(l?.qty, 30)}`);
    const t = (p.totals ?? {}) as Record<string, unknown>;
    const qty = Number(t.qty) || 0;
    const kg = Number(t.kg) || 0;
    if (out.length && kg > 0) out.push(`Total: ${qty.toLocaleString('en-US')} units · ${kg.toLocaleString('en-US')} kg`);
    return out;
  }
  return [];
}

/** Builds the notification email. All visitor-supplied text is escaped. */
export function buildLeadEmail(lead: Lead, ref: string, note?: string): MailMessage {
  const kind = String(lead.meta.type) as LeadKind;
  const p = lead.payload ?? {};
  const title = TITLES[kind] ?? 'Website lead';
  const who = line(kind === 'trading-account' ? p.company || p.name : p.name, 80);
  const org = kind === 'trading-account' ? '' : line(p.company, 80);
  const subject = `${title}: ${who}${org ? ` (${org})` : ''} · ${ref}`.slice(0, 200);

  const rows = rowsFor(kind, p).filter(([, v]) => v);
  const items = itemsFor(kind, p);
  const meta: Row[] = (
    [
      ['Reference', ref],
      ['Submitted', line(lead.meta.submittedAt, 40)],
      ['Language', line(p.lang, 5).toUpperCase()],
      ['Page', line(lead.meta.page, 500)],
      ['Referrer', line(lead.meta.referrer, 500)],
      ['Attachments', lead.files.map((f) => attachmentName(f)).join(', ')],
    ] as Row[]
  ).filter(([, v]) => v);

  const td = 'padding:8px 12px;border-bottom:1px solid #ece6d6;vertical-align:top;font-size:14px;';
  const htmlRow = ([label, value, o]: Row) => {
    const v = esc(value);
    const cell = o?.href ? `<a href="${esc(o.href)}" style="color:#1f5a3c;">${v}</a>` : v;
    return `<tr><th align="left" style="${td}color:#6b6453;font-weight:600;width:180px;">${esc(label)}</th><td dir="auto" style="${td}color:#1d1b16;${o?.pre ? 'white-space:pre-wrap;' : ''}">${cell}</td></tr>`;
  };
  const table = (r: Row[]) =>
    `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">${r.map(htmlRow).join('')}</table>`;
  const h2 = (s: string) =>
    `<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d1f;margin:24px 0 8px;">${s}</h2>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f7f4ec;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px;">
${note ? `<p style="background:#fff4d6;border:1px solid #e9c46a;border-radius:6px;padding:10px 12px;font-size:13px;color:#5c4a12;">${esc(note)}</p>` : ''}
<div style="background:#ffffff;border-radius:10px;padding:24px;border:1px solid #ece6d6;">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d1f;">medadx.com · ${esc(title)}</p>
<h1 style="margin:0 0 16px;font-size:20px;color:#1d1b16;" dir="auto">${esc(who || title)}</h1>
${table(rows)}
${items.length ? `${h2(kind === 'quote' ? 'Products requested' : 'Selected products')}<ul style="margin:0;padding-left:20px;font-size:14px;color:#1d1b16;line-height:1.6;">${items.map((i) => `<li dir="auto">${esc(i)}</li>`).join('')}</ul>` : ''}
${h2('Submission')}
${table(meta)}
<p style="margin:20px 0 0;font-size:13px;color:#6b6453;">${p.email ? 'Reply to this email to answer the customer directly.' : 'No email given: contact the customer by phone or WhatsApp.'}</p>
</div></div></body></html>`;

  const text = [
    ...(note ? [note, ''] : []),
    `${title}: ${who}`,
    '',
    ...rows.map(([l, v]) => `${l}: ${v}`),
    ...(items.length ? ['', kind === 'quote' ? 'Products requested:' : 'Selected products:', ...items.map((i) => `- ${i}`)] : []),
    '',
    ...meta.map(([l, v]) => `${l}: ${v}`),
  ].join('\n');

  const email = line(p.email, 200);
  return { subject, html, text, replyTo: email || undefined };
}

const attachmentName = ({ key, file }: { key: string; file: File }) => {
  const name = file.name.replace(/[^\w.\- ]+/g, '_').slice(-100) || 'attachment';
  return key && key !== 'file' ? `${key}-${name}` : name;
};

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
  if (primary.ok) return { ok: true, via: 'primary' };

  const unverified = primary.status === 403 && /not verified|verify a domain/i.test(primary.message);
  if (unverified && cfg.fallbackTo.length) {
    const note = `Sent with Resend's test sender because the sending domain is not verified yet. Intended for: ${cfg.to.join(', ')}. Verify the domain in Resend to deliver there directly.`;
    const fb = await send(RESEND_TEST_SENDER, cfg.fallbackTo, buildLeadEmail(lead, ref, note), `${ref}-fallback`);
    if (fb.ok) return { ok: true, via: 'fallback' };
    return { ok: false, status: fb.status, error: fb.message };
  }
  return { ok: false, status: primary.status, error: primary.message };
}
