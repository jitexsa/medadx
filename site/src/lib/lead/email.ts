/**
 * The notification email the trade team receives for each website lead: branded HTML plus a
 * plain-text twin built from the same view model. Server-only (used by deliver.ts).
 *
 * Email HTML rules: tables for layout, inline styles, no web fonts (stacks fall back to system
 * fonts), images only from https://medadx.com. All visitor-supplied text goes through esc().
 */
import { fmtInt, packKg } from '../catalog-shared.js';
import type { Lead, LeadKind, MailMessage } from './deliver.js';

const LOGO = 'https://medadx.com/icons/icon-192.png';
const C = {
  page: '#f5f0e4',
  card: '#ffffff',
  ink: '#1e2619',
  muted: '#6b6a5c',
  faint: '#8a8574',
  line: '#e7dfc9',
  rowLine: '#f0eadb',
  green: '#1f3d2a',
  link: '#1f5b3c',
  gold: '#c29a45',
  goldText: '#7f5f1c',
  goldLight: '#e1bc63',
  cream: '#efe7ce',
  tint: '#f7f3e8',
  chip: '#f3ecd6',
  sand: '#e9d9a8',
  ok: '#3e8e5a',
};
const F = {
  body: "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  head: "'Cormorant Garamond',Georgia,'Times New Roman',serif",
  mono: "'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
};
const HEADLINES: Record<LeadKind, { subject: string; title: string; noun: string }> = {
  quote: { subject: 'Quote request', title: 'New quote request', noun: 'quote request' },
  'quick-quote': { subject: 'Quick inquiry', title: 'New quick inquiry', noun: 'inquiry' },
  'trading-account': {
    subject: 'Trading account application',
    title: 'New trading account application',
    noun: 'trading account application',
  },
};

interface Field {
  label: string;
  value: string;
  href?: string;
  ltr?: boolean;
  chips?: string[];
  good?: boolean;
}
interface Section {
  title: string;
  fields?: Field[];
  table?: { rows: [product: string, pack: string, qty: string, kg: string][]; total: string };
  items?: string[];
  quote?: string;
  files?: string[];
}
interface Action {
  label: string;
  href: string;
  primary?: boolean;
}

// ---------- text helpers ----------
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** One-line text: collapses whitespace (incl. newlines) and caps the length. */
const line = (v: unknown, max = 300) =>
  (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
/** Multi-line text (the message box): keeps line breaks, caps the length. */
const block = (v: unknown, max = 5000) => (v == null ? '' : String(v)).replace(/\r\n?/g, '\n').trim().slice(0, max);
const arr = (v: unknown, max = 20) =>
  Array.isArray(v)
    ? v
        .slice(0, max)
        .map((x) => line(x, 120))
        .filter(Boolean)
    : [];
const tonnes = (kg: number) => (kg >= 1000 ? ` (${(kg / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} t)` : '');

export const attachmentName = ({ key, file }: { key: string; file: File }) => {
  const name = file.name.replace(/[^\w.\- ]+/g, '_').slice(-100) || 'attachment';
  return key && key !== 'file' ? `${key}-${name}` : name;
};

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
const telLink = (phone: string) => {
  const t = (phone.startsWith('+') ? '+' : '') + phone.replace(/\D/g, '');
  return t.replace('+', '').length >= 6 ? `tel:${t}` : undefined;
};
/** Only plain addresses become mailto: links (no ?cc= tricks from a crafted email field). */
const SAFE_EMAIL = /^[\w.+'-]+@[\w-]+(\.[\w-]+)+$/;
function riyadhTime(iso: unknown) {
  const d = new Date(typeof iso === 'string' ? iso : Date.now());
  const date = Number.isNaN(d.getTime()) ? new Date() : d;
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const g = (t: string) => f.find((x) => x.type === t)?.value ?? '';
  return `${g('weekday')}, ${g('day')} ${g('month')} ${g('year')} · ${g('hour')}:${g('minute')} Riyadh time`;
}

// ---------- view model ----------
function view(lead: Lead, ref: string) {
  const kind = String(lead.meta.type) as LeadKind;
  const p = lead.payload ?? {};
  const h = HEADLINES[kind] ?? { subject: 'Website lead', title: 'New website lead', noun: 'request' };
  const phone = phoneOf(kind, p);
  const email = line(p.email, 200);
  const name = line(p.name, 120);
  const company = line(p.company, 120);
  const files = lead.files.map(attachmentName);

  // Quote / quick inquiry show name + company in the header card, so Contact only adds the channels.
  const contact: Field[] = [
    ...(kind === 'trading-account'
      ? [
          { label: 'Name', value: name },
          { label: 'Role', value: line(p.role, 120) },
        ]
      : []),
    { label: 'Email', value: email, href: SAFE_EMAIL.test(email) ? `mailto:${email}` : undefined, ltr: true },
    { label: 'Phone', value: phone, href: waLink(phone) ?? telLink(phone), ltr: true },
  ];

  const sections: Section[] = [];
  let heroName = name;
  let heroSub = company;
  let preheader: string[];

  if (kind === 'trading-account') {
    const products = arr(p.products);
    const markets = arr(p.markets);
    const where = [line(p.city, 80), line(p.country, 80)].filter(Boolean).join(', ');
    heroName = company || name;
    heroSub = [[name, line(p.role, 80)].filter(Boolean).join(', '), where].filter(Boolean).join(' · ');
    sections.push(
      {
        title: 'Company',
        fields: [
          { label: 'Company', value: company },
          { label: 'Business type', value: line(p.bizType) },
          { label: 'Country', value: line(p.country) },
          { label: 'City', value: line(p.city) },
          { label: 'Trade license no.', value: line(p.license, 60), ltr: true },
        ],
      },
      { title: 'Contact', fields: contact },
      {
        title: 'Requirements',
        fields: [
          { label: 'Products of interest', value: products.join(', '), chips: products },
          { label: 'Monthly volume', value: line(p.volume) },
          { label: 'Target markets', value: markets.join(', '), chips: markets },
          { label: 'Consent to contact', value: p.consent === true ? 'Yes' : 'No', good: p.consent === true },
        ],
      },
    );
    if (files.length) sections.push({ title: 'Documents', files });
    preheader = [line(p.bizType, 60), where, line(p.volume, 60), products.join(', ')];
  } else if (kind === 'quote') {
    const rows: [string, string, string, string][] = [];
    for (const l of (Array.isArray(p.lines) ? p.lines : []).slice(0, 50) as Record<string, unknown>[]) {
      const qty = line(l?.qty, 30);
      const kg = packKg(line(l?.size, 40)) * (parseFloat(qty.replace(/[^\d.]/g, '')) || 0);
      rows.push([line(l?.product, 80), line(l?.size, 40), qty, kg ? `${fmtInt(kg)} kg` : '']);
    }
    const t = (p.totals ?? {}) as Record<string, unknown>;
    const qty = Number(t.qty) || 0;
    const kg = Number(t.kg) || 0;
    const total = kg > 0 ? `${fmtInt(qty)} units · ${fmtInt(kg)} kg${tonnes(kg)}` : '';
    sections.push({ title: 'Contact', fields: contact });
    if (rows.length) sections.push({ title: 'Products requested', table: { rows, total } });
    const msg = block(p.message);
    if (msg) sections.push({ title: 'Message', quote: msg });
    if (files.length) sections.push({ title: 'Attachment', files });
    preheader = [company, total || rows.map((r) => r[0]).join(', '), phone];
  } else {
    const items = arr(p.items);
    sections.push({ title: 'Contact', fields: contact });
    if (items.length) sections.push({ title: 'Selected products', items });
    preheader = [company, items.join('; '), phone];
  }

  const actions: Action[] = [];
  if (SAFE_EMAIL.test(email))
    actions.push({
      label: 'Reply by email',
      href: `mailto:${email}?subject=${encodeURIComponent(`Re: Your Medad-X ${h.noun} (${ref})`)}`,
      primary: true,
    });
  const wa = waLink(phone);
  if (wa) actions.push({ label: 'WhatsApp', href: wa, primary: !actions.length });
  const tel = telLink(phone);
  if (tel) actions.push({ label: 'Call', href: tel, primary: !actions.length });

  const page = line(lead.meta.page, 500);
  const referrer = line(lead.meta.referrer, 500);
  const lang = line(p.lang, 5).toLowerCase();
  const meta: Field[] = [
    { label: 'Page', value: page.replace(/^https?:\/\//, ''), href: /^https:\/\//.test(page) ? page : undefined },
    { label: 'Referrer', value: referrer.replace(/^https?:\/\//, '') },
    { label: 'Language', value: lang === 'ar' ? 'Arabic' : lang === 'en' ? 'English' : lang.toUpperCase() },
  ];

  return {
    kind,
    h,
    ref,
    when: riyadhTime(lead.meta.submittedAt),
    heroName: heroName || h.title,
    heroSub,
    arabic: lang === 'ar',
    hasEmail: !!email,
    actions,
    sections: sections.map((s) => ({ ...s, fields: s.fields?.filter((f) => f.value) })),
    preheader: preheader.filter(Boolean).join(' · ').slice(0, 140),
    meta: meta.filter((m) => m.value),
    subject:
      `${h.subject}: ${line(kind === 'trading-account' ? company || name : name, 80)}${kind !== 'trading-account' && company ? ` (${line(company, 80)})` : ''} · ${ref}`.slice(
        0,
        200,
      ),
  };
}
type View = ReturnType<typeof view>;

// ---------- HTML ----------
const font = (weight: number, size: number, lh: number, family = F.body) =>
  `font-family:${family};font-weight:${weight};font-size:${size}px;line-height:${lh};`;
const a = (href: string, text: string, style = '') =>
  `<a href="${esc(href)}" style="color:${C.link};text-decoration:underline;${style}">${text}</a>`;

function fieldValue(f: Field) {
  if (f.chips?.length)
    return f.chips
      .map(
        (c) =>
          `<span style="display:inline-block;margin:2px 6px 3px 0;padding:4px 11px;border-radius:999px;background:${C.chip};border:1px solid ${C.sand};${font(500, 13, 1.3)}color:${C.green};" dir="auto">${esc(c)}</span>`,
      )
      .join('');
  if (f.good !== undefined)
    return f.good
      ? `<span style="color:${C.ok};font-weight:600;">&#10003; Agreed to be contacted</span>`
      : `<span style="color:#b23a26;font-weight:600;">Not given</span>`;
  const v = esc(f.value);
  return f.href ? a(f.href, v) : v;
}

function fieldsTable(fields: Field[]) {
  const cell = `padding:11px 0;border-bottom:1px solid ${C.rowLine};vertical-align:top;`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="stack" style="border-collapse:collapse;">${fields
    .map(
      (f) =>
        `<tr><th align="left" width="36%" style="${cell}padding-right:14px;${font(500, 13, 1.5)}color:${C.muted};">${esc(f.label)}</th><td style="${cell}${font(500, 15, 1.5)}color:${C.ink};text-align:left;"${f.ltr ? ' dir="ltr"' : ' dir="auto"'}>${fieldValue(f)}</td></tr>`,
    )
    .join('')}</table>`;
}

function productsTable(t: NonNullable<Section['table']>) {
  const th = `padding:10px 14px;${font(600, 11, 1.2)}letter-spacing:.08em;text-transform:uppercase;color:${C.muted};border-bottom:1px solid ${C.line};`;
  const td = `padding:12px 14px;border-bottom:1px solid ${C.rowLine};${font(500, 14, 1.4)}color:${C.ink};vertical-align:top;`;
  const rows = t.rows
    .map(
      ([prod, pack, qty, kg]) =>
        `<tr><td style="${td}font-weight:600;text-align:left;" dir="auto"><span style="color:${C.gold};">&#9670;</span>&nbsp; ${esc(prod)}</td><td style="${td}${font(500, 13, 1.4, F.mono)}" dir="ltr">${esc(pack)}</td><td align="right" style="${td}${font(500, 13, 1.4, F.mono)}" dir="ltr">${esc(qty)}</td><td align="right" class="hide-sm" style="${td}${font(500, 13, 1.4, F.mono)}color:${C.muted};" dir="ltr">${esc(kg)}</td></tr>`,
    )
    .join('');
  const total = t.total
    ? `<tr><td colspan="4" style="background:${C.green};padding:13px 14px;${font(500, 13, 1.4)}color:${C.cream};"><span style="letter-spacing:.12em;text-transform:uppercase;color:${C.goldLight};font-size:11px;font-weight:600;">Total</span>&nbsp;&nbsp; <strong style="font-weight:600;" dir="ltr">${esc(t.total)}</strong></td></tr>`
    : '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border:1px solid ${C.line};border-radius:10px;overflow:hidden;margin-top:14px;">
<tr style="background:${C.tint};"><th align="left" style="${th}">Product</th><th align="left" style="${th}">Pack</th><th align="right" style="${th}">Qty</th><th align="right" class="hide-sm" style="${th}">Weight</th></tr>${rows}${total}</table>`;
}

function sectionHtml(s: Section) {
  const head = `<tr><td style="padding:30px 0 10px;border-bottom:2px solid ${C.line};${font(600, 11, 1.2)}letter-spacing:.16em;text-transform:uppercase;color:${C.goldText};"><span style="color:${C.gold};">&#9670;</span>&nbsp; ${esc(s.title)}</td></tr>`;
  let body = '';
  if (s.fields?.length) body = fieldsTable(s.fields);
  if (s.table) body = productsTable(s.table);
  if (s.items?.length)
    body = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:4px;">${s.items
      .map(
        (i) =>
          `<tr><td style="padding:11px 0;border-bottom:1px solid ${C.rowLine};${font(500, 15, 1.5)}color:${C.ink};text-align:left;" dir="auto"><span style="color:${C.gold};">&#9670;</span>&nbsp; ${esc(i)}</td></tr>`,
      )
      .join('')}</table>`;
  if (s.quote)
    body = `<div style="margin-top:14px;padding:16px 18px;background:#faf7ef;border-left:3px solid ${C.gold};border-radius:0 10px 10px 0;${font(400, 15, 1.65)}color:${C.ink};white-space:pre-wrap;text-align:left;" dir="auto">${esc(s.quote)}</div>`;
  if (s.files?.length)
    body = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:4px;">${s.files
      .map(
        (f) =>
          `<tr><td style="padding:11px 0;border-bottom:1px solid ${C.rowLine};${font(500, 14, 1.5)}color:${C.ink};" dir="ltr">&#128206;&nbsp; ${esc(f)}</td></tr>`,
      )
      .join('')}<tr><td style="padding:8px 0 0;${font(400, 12, 1.5)}color:${C.faint};">Attached to this email.</td></tr></table>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${head}<tr><td>${body}</td></tr></table>`;
}

function buttons(actions: Action[]) {
  if (!actions.length) return '';
  const cells = actions
    .map((b) => {
      const bg = b.primary ? C.green : C.card;
      const fg = b.primary ? C.cream : C.green;
      return `<td style="border-radius:8px;background:${bg};border:1px solid ${C.green};"><a href="${esc(b.href)}" style="display:inline-block;padding:11px 18px;${font(600, 14, 1)}color:${fg};text-decoration:none;border-radius:8px;">${esc(b.label)}</a></td>`;
    })
    .join('<td width="8" style="font-size:0;line-height:0;">&nbsp;</td>');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:20px;"><tr>${cells}</tr></table>`;
}

function renderHtml(v: View, note?: string) {
  const hidden = '&#8199;&#65279;&#847; '.repeat(30);
  const noteHtml = note
    ? `<tr><td style="padding:0 0 14px;"><div style="background:#fff4d6;border:1px solid #e9c46a;border-radius:10px;padding:12px 14px;${font(400, 13, 1.5)}color:#5c4a12;">${esc(note)}</div></td></tr>`
    : '';
  const arabic = v.arabic
    ? `<p style="margin:12px 0 0;"><span style="display:inline-block;padding:4px 11px;border-radius:999px;background:${C.cream};${font(600, 12, 1.4)}color:${C.green};">Prefers Arabic · <span dir="rtl" lang="ar">يفضّل العربية</span></span></p>`
    : '';
  const replyHint = v.hasEmail
    ? 'Replying to this email goes straight to the customer.'
    : 'No email given: contact the customer by phone or WhatsApp.';
  const meta = v.meta
    .map((m) => `${esc(m.label)}: ${m.href ? a(m.href, esc(m.value.slice(0, 70)), `color:${C.faint};`) : esc(m.value.slice(0, 70))}`)
    .join(' &nbsp;·&nbsp; ');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(v.subject)}</title>
<style>
@media only screen and (max-width:540px){
.px{padding-left:20px!important;padding-right:20px!important}
.h1{font-size:26px!important}
.stack th,.stack td{display:block!important;width:100%!important;box-sizing:border-box}
.stack th{padding-bottom:2px!important;border-bottom:0!important}
.hide-sm{display:none!important}
.ref{display:block!important;text-align:left!important;padding-top:14px!important}
}
</style></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(v.preheader)}${hidden}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;">
${noteHtml}
<tr><td class="px" style="background:${C.green};border-radius:14px 14px 0 0;padding:26px 32px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="46" valign="middle"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#fcfaf3;border-radius:11px;padding:4px;"><img src="${LOGO}" width="38" height="38" alt="Medad-X" style="display:block;border:0;outline:none;"></td></tr></table></td>
<td valign="middle" style="padding-left:12px;${font(600, 11, 1.5)}letter-spacing:.16em;text-transform:uppercase;color:${C.goldLight};">Medad-X<br><span style="color:#c9cfbf;font-weight:500;letter-spacing:.12em;">Website lead</span></td>
<td class="ref" align="right" valign="middle"><span style="display:inline-block;border:1px solid ${C.gold};border-radius:999px;padding:6px 13px;${font(500, 13, 1, F.mono)}color:${C.cream};" dir="ltr">${esc(v.ref)}</span></td>
</tr></table>
<h1 class="h1" style="margin:24px 0 6px;${font(600, 31, 1.15, F.head)}color:${C.cream};">${esc(v.h.title)}</h1>
<p style="margin:0;${font(400, 13, 1.5)}color:#b9c4b4;">${esc(v.when)}</p>
</td></tr>
<tr><td style="background:${C.gold};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td class="px" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:28px 32px 32px;">
<p style="margin:0;${font(600, 11, 1.2)}letter-spacing:.16em;text-transform:uppercase;color:${C.goldText};">${v.kind === 'trading-account' ? 'Applicant' : 'Customer'}</p>
<p style="margin:8px 0 0;${font(600, 24, 1.25, F.head)}color:${C.ink};text-align:left;" dir="auto">${esc(v.heroName)}</p>
${v.heroSub ? `<p style="margin:4px 0 0;${font(400, 15, 1.5)}color:${C.muted};text-align:left;" dir="auto">${esc(v.heroSub)}</p>` : ''}
${arabic}
${buttons(v.actions)}
<p style="margin:12px 0 0;${font(400, 12, 1.5)}color:${C.faint};">${replyHint}</p>
${v.sections.map(sectionHtml).join('\n')}
</td></tr>
<tr><td style="padding:20px 12px 0;text-align:center;${font(400, 12, 1.7)}color:${C.faint};">${meta}<br>Sent automatically by the ${a('https://medadx.com', 'medadx.com', `color:${C.faint};`)} website.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------- plain text ----------
function renderText(v: View, note?: string) {
  const out: string[] = [];
  if (note) out.push(note, '');
  out.push(`${v.h.title.toUpperCase()} · ${v.ref}`, v.when, '', v.heroName + (v.heroSub ? ` — ${v.heroSub}` : ''));
  if (v.arabic) out.push('Prefers Arabic');
  for (const s of v.sections) {
    out.push('', s.title.toUpperCase());
    for (const f of s.fields ?? []) out.push(`${f.label}: ${f.value}`);
    if (s.table) {
      for (const [prod, pack, qty, kg] of s.table.rows) out.push(`- ${prod} · ${pack} × ${qty}${kg ? ` (${kg})` : ''}`);
      if (s.table.total) out.push(`Total: ${s.table.total}`);
    }
    for (const i of s.items ?? []) out.push(`- ${i}`);
    if (s.quote) out.push(s.quote);
    for (const f of s.files ?? []) out.push(`- ${f} (attached)`);
  }
  out.push('', ...v.meta.map((m) => `${m.label}: ${m.value}`));
  out.push(
    '',
    v.hasEmail ? 'Reply to this email to answer the customer directly.' : 'No email given: contact the customer by phone or WhatsApp.',
  );
  return out.join('\n');
}

/** Builds the notification email. All visitor-supplied text is escaped. */
export function buildLeadEmail(lead: Lead, ref: string, note?: string): MailMessage {
  const v = view(lead, ref);
  const email = line(lead.payload?.email, 200);
  return { subject: v.subject, html: renderHtml(v, note), text: renderText(v, note), replyTo: email || undefined };
}
