/**
 * Confirmation the customer receives after the quote or trading-account form, in the language
 * of the page they used (EN or AR, RTL). Server-only (deliver.ts). The quick inquiry has no
 * email field, so it gets none.
 *
 * Anyone can type anyone's address into a form, so this email must be useless for sending
 * content to a stranger: it never repeats the free-text message, drops visitor-typed values
 * that look like links, caps their length, and escapes everything.
 */
import { fmtInt, packKg } from '../catalog-shared.js';
import type { Lead } from './deliver.js';
import { arr, attachmentName, C, esc, F, font, line, LOGO, SAFE_EMAIL } from './email.js';

/** Mirrors src/data/site.json (a unit test keeps them in sync; JSON can't be imported here). */
export const CONTACT = {
  phone: '+966 920009050',
  phoneHref: 'tel:+966920009050',
  wa: '+966 59 127 8526',
  waHref: 'https://wa.me/966591278526',
  email: 'info@medadx.com',
} as const;

type Kind = 'quote' | 'trading-account';
type Lang = 'en' | 'ar';

const T = {
  en: {
    subject: { quote: 'We’ve received your quote request', 'trading-account': 'We’ve received your trading account application' },
    title: { quote: 'Quote request received', 'trading-account': 'Application received' },
    hello: (n: string) => (n ? `Dear ${n},` : 'Hello,'),
    lead: {
      quote: 'Thank you for your quote request. Our trade team has received it and will reply within 24 business hours.',
      'trading-account':
        'Thank you for applying for a Medad-X trading account. Our trade team has received your application and will reply within 24 business hours.',
    },
    ref: 'Your reference number',
    refHint: 'Please quote it in any correspondence with us.',
    summary: { quote: 'Your request', 'trading-account': 'Your application' },
    product: 'Product',
    pack: 'Pack',
    qty: 'Qty',
    total: 'Total',
    units: 'units',
    company: 'Company',
    products: 'Products of interest',
    volume: 'Monthly volume',
    docs: 'Documents received',
    contactAt: 'We’ll contact you at',
    next: 'What happens next',
    steps: {
      quote: [
        'A trade specialist reviews your products and quantities.',
        'We send you pricing, availability and delivery options.',
        'Once you confirm, we prepare your order and shipping documents.',
      ],
      'trading-account': [
        'We review your company details and documents.',
        'A dedicated account manager contacts you to confirm terms.',
        'Once approved, your account is set up with contract pricing.',
      ],
    },
    help: 'Need us sooner?',
    wa: 'WhatsApp us',
    call: 'Call',
    replyHint: 'You can reply to this email to reach our trade team.',
    why: 'You’re receiving this because this email address was entered on a form at medadx.com. If that wasn’t you, you can ignore this email.',
    privacy: 'Privacy policy',
    privacyHref: 'https://medadx.com/privacy',
    brand: 'Medad-X General Trading · Arsan Global Group · Dammam, Saudi Arabia',
  },
  ar: {
    subject: { quote: 'استلمنا طلب عرض السعر الخاص بك', 'trading-account': 'استلمنا طلب فتح حسابك التجاري' },
    title: { quote: 'تم استلام طلب عرض السعر', 'trading-account': 'تم استلام طلبك' },
    hello: (n: string) => (n ? `مرحباً ${n}،` : 'مرحباً،'),
    lead: {
      quote: 'شكراً لطلبك عرض سعر من ميداد-إكس. استلم فريقنا التجاري طلبك وسيرد عليك خلال 24 ساعة عمل.',
      'trading-account': 'شكراً لتقديمك طلب فتح حساب تجاري لدى ميداد-إكس. استلم فريقنا التجاري طلبك وسيرد عليك خلال 24 ساعة عمل.',
    },
    ref: 'رقمك المرجعي',
    refHint: 'يرجى ذكره في أي مراسلات معنا.',
    summary: { quote: 'تفاصيل طلبك', 'trading-account': 'تفاصيل طلبك' },
    product: 'المنتج',
    pack: 'العبوة',
    qty: 'الكمية',
    total: 'الإجمالي',
    units: 'وحدة',
    company: 'الشركة',
    products: 'المنتجات المطلوبة',
    volume: 'الكمية الشهرية التقديرية',
    docs: 'المستندات المستلمة',
    contactAt: 'سنتواصل معك عبر',
    next: 'الخطوات التالية',
    steps: {
      quote: [
        'يراجع أحد مختصي التجارة المنتجات والكميات المطلوبة.',
        'نرسل إليك الأسعار والتوافر وخيارات التسليم.',
        'بعد تأكيدك، نجهّز طلبك ومستندات الشحن.',
      ],
      'trading-account': [
        'نراجع بيانات شركتك والمستندات المرفقة.',
        'يتواصل معك مدير حساب مخصص لتأكيد الشروط.',
        'بعد الموافقة، يُفعَّل حسابك بأسعار العقود.',
      ],
    },
    help: 'هل تحتاج إلينا بشكل أسرع؟',
    wa: 'راسلنا عبر واتساب',
    call: 'اتصل بنا',
    replyHint: 'يمكنك الرد على هذه الرسالة للتواصل مع فريقنا التجاري.',
    why: 'تلقيت هذه الرسالة لأن عنوان بريدك الإلكتروني أُدخل في نموذج على موقع medadx.com. إن لم تكن أنت، يمكنك تجاهل هذه الرسالة.',
    privacy: 'سياسة الخصوصية',
    privacyHref: 'https://medadx.com/ar/privacy',
    brand: 'ميداد-إكس للتجارة العامة · مجموعة أرسان العالمية · الدمام، المملكة العربية السعودية',
  },
} as const;

/** Visitor-typed text we repeat to the customer: one line, capped, and dropped if it looks like a link. */
const LINKISH = /(https?:|www\.|\/\/|@|\b[\w-]+\.(com|net|org|info|biz|xyz|top|site|online|link|click|ru|cn|io|co|me|sa|ae)\b)/i;
export const safeEcho = (v: unknown, max: number) => {
  const s = line(v, max);
  return LINKISH.test(s) ? '' : s;
};
const digits = (v: unknown, max = 12) =>
  line(v, 40)
    .replace(/[^\d.,]/g, '')
    .slice(0, max);
const phoneEcho = (v: unknown) =>
  line(v, 40)
    .replace(/[^\d+\s()-]/g, '')
    .trim();

interface View {
  lang: Lang;
  kind: Kind;
  to: string;
  name: string;
  rows?: [string, string, string][];
  total?: string;
  fields: [string, string][];
  chips?: string[];
  docs: string[];
  contact: string[];
}

function view(lead: Lead): View | null {
  const kind = String(lead.meta?.type) as Kind;
  if (kind !== 'quote' && kind !== 'trading-account') return null;
  const p = lead.payload ?? {};
  const to = line(p.email, 200);
  if (!SAFE_EMAIL.test(to)) return null;
  const lang: Lang = line(p.lang, 5).toLowerCase() === 'ar' ? 'ar' : 'en';
  const t = T[lang];
  const phone =
    kind === 'trading-account' && !line(p.phone).startsWith('+') ? `${line(p.dial, 8)} ${line(p.phone).replace(/^0+/, '')}` : p.phone;
  const v: View = {
    lang,
    kind,
    to,
    name: safeEcho(p.name, 60),
    fields: [],
    docs: lead.files.map((f) => safeEcho(attachmentName(f), 80)).filter(Boolean),
    contact: [to, phoneEcho(phone)].filter(Boolean),
  };
  if (kind === 'quote') {
    v.rows = (Array.isArray(p.lines) ? p.lines : [])
      .slice(0, 20)
      .map((l: Record<string, unknown>) => [safeEcho(l?.product, 40), safeEcho(l?.size, 20), digits(l?.qty)] as [string, string, string])
      .filter(([prod, , qty]) => prod && qty);
    const qty = v.rows.reduce((n, [, , q]) => n + (parseFloat(q.replace(/,/g, '')) || 0), 0);
    const kg = v.rows.reduce((n, [, pack, q]) => n + packKg(pack) * (parseFloat(q.replace(/,/g, '')) || 0), 0);
    if (kg > 0) v.total = `${fmtInt(qty)} ${t.units} · ${fmtInt(kg)} kg`;
  } else {
    const company = safeEcho(p.company, 80);
    const volume = safeEcho(p.volume, 40);
    if (company) v.fields.push([t.company, company]);
    if (volume) v.fields.push([t.volume, volume]);
    v.chips = arr(p.products, 10)
      .map((x) => safeEcho(x, 40))
      .filter(Boolean);
  }
  return v;
}

// ---------- HTML ----------
function renderHtml(v: View, ref: string) {
  const t = T[v.lang];
  const rtl = v.lang === 'ar';
  const start = rtl ? 'right' : 'left';
  const end = rtl ? 'left' : 'right';
  const body = rtl ? `'IBM Plex Sans Arabic',Tahoma,${F.body}` : F.body;
  const head = rtl ? body : F.head;
  const f = (w: number, s: number, lh: number, fam = body) => font(w, s, lh, fam);
  const label = `${rtl ? f(700, 13, 1.3) : f(600, 11, 1.2)}letter-spacing:${rtl ? '0' : '.16em'};text-transform:uppercase;color:${C.goldText};`;
  const section = (title: string, inner: string) =>
    `<tr><td style="padding:28px 0 10px;border-bottom:2px solid ${C.line};${label}" align="${start}"><span style="color:${C.gold};">&#9670;</span>&nbsp; ${esc(title)}</td></tr><tr><td>${inner}</td></tr>`;
  const kv = (k: string, val: string, ltr = false, html = esc(val)) =>
    `<tr><th align="${start}" width="42%" style="padding:10px 0;border-bottom:1px solid ${C.rowLine};${f(500, 13, 1.5)}color:${C.muted};">${esc(k)}</th><td align="${start}" style="padding:10px 0;border-bottom:1px solid ${C.rowLine};${f(500, 15, 1.5)}color:${C.ink};"${ltr ? ' dir="ltr"' : ''}>${html}</td></tr>`;
  const kvTable = (rows: string) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="stack">${rows}</table>`;

  let summary = '';
  if (v.rows?.length) {
    const th = `padding:10px 12px;${f(600, 11, 1.2)}color:${C.muted};border-bottom:1px solid ${C.line};`;
    const td = `padding:11px 12px;border-bottom:1px solid ${C.rowLine};${f(500, 14, 1.4)}color:${C.ink};`;
    summary += `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border:1px solid ${C.line};border-radius:10px;overflow:hidden;margin-top:14px;">
<tr style="background:${C.tint};"><th align="${start}" style="${th}">${esc(t.product)}</th><th align="${start}" style="${th}">${esc(t.pack)}</th><th align="${end}" style="${th}">${esc(t.qty)}</th></tr>
${v.rows.map(([prod, pack, qty]) => `<tr><td align="${start}" style="${td}font-weight:600;">${esc(prod)}</td><td align="${start}" style="${td}${f(500, 13, 1.4, F.mono)}" dir="ltr">${esc(pack)}</td><td align="${end}" style="${td}${f(500, 13, 1.4, F.mono)}" dir="ltr">${esc(qty)}</td></tr>`).join('')}
${v.total ? `<tr><td colspan="3" align="${start}" style="background:${C.green};padding:12px;${f(500, 13, 1.4)}color:${C.cream};"><span style="color:${C.goldLight};font-weight:600;">${esc(t.total)}</span>&nbsp;&nbsp; <strong style="font-weight:600;">${esc(v.total)}</strong></td></tr>` : ''}
</table>`;
  }
  const kvRows = [
    ...v.fields.map(([k, val]) => kv(k, val)),
    ...(v.chips?.length
      ? [
          `<tr><th align="${start}" width="42%" style="padding:10px 0;border-bottom:1px solid ${C.rowLine};${f(500, 13, 1.5)}color:${C.muted};vertical-align:top;">${esc(t.products)}</th><td align="${start}" style="padding:8px 0;border-bottom:1px solid ${C.rowLine};">${v.chips.map((c) => `<span style="display:inline-block;margin:2px 0 3px 6px;padding:4px 11px;border-radius:999px;background:${C.chip};border:1px solid ${C.sand};${f(500, 13, 1.3)}color:${C.green};">${esc(c)}</span>`).join(' ')}</td></tr>`,
        ]
      : []),
    ...(v.docs.length ? [kv(t.docs, v.docs.join(', '), true)] : []),
    kv(t.contactAt, '', true, v.contact.map((c) => `<span style="white-space:nowrap;">${esc(c)}</span>`).join('<br>')),
  ].join('');
  summary += `<div style="margin-top:${v.rows?.length ? 10 : 4}px;">${kvTable(kvRows)}</div>`;

  const steps = t.steps[v.kind]
    .map(
      (s, i) =>
        `<tr><td width="34" valign="top" style="padding:12px 0 0;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:50%;background:${C.green};color:${C.cream};text-align:center;${f(600, 12, 24 / 12)}">${i + 1}</span></td><td align="${start}" style="padding:12px 0 0;${f(400, 15, 1.55)}color:${C.ink};">${esc(s)}</td></tr>`,
    )
    .join('');

  const btn = (href: string, text: string, primary: boolean, ltrSuffix = '') =>
    `<td class="cta-btn" style="border-radius:8px;background:${primary ? C.green : C.card};border:1px solid ${C.green};"><a class="cta-a" href="${esc(href)}" style="display:inline-block;padding:11px 18px;white-space:nowrap;${f(600, 14, 1)}color:${primary ? C.cream : C.green};text-decoration:none;border-radius:8px;">${esc(text)}${ltrSuffix ? ` <span dir="ltr" style="unicode-bidi:embed;white-space:nowrap;">${esc(ltrSuffix)}</span>` : ''}</a></td>`;

  return `<!doctype html>
<html lang="${v.lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(t.subject[v.kind])}</title>
<style>@media only screen and (max-width:540px){.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:25px!important}.stack th,.stack td{display:block!important;width:100%!important;box-sizing:border-box}.stack th{padding-bottom:0!important;border-bottom:0!important}.cta,.cta tr,.cta-btn{display:block!important;width:100%!important}.cta-btn{margin:0 0 8px!important;box-sizing:border-box}.cta-a{display:block!important;text-align:center}.cta-gap{display:none!important}}</style></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(`${t.ref}: ${ref}`)}${'&#8199;&#65279;&#847; '.repeat(30)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;" dir="${rtl ? 'rtl' : 'ltr'}">
<tr><td class="px" style="background:${C.green};border-radius:14px 14px 0 0;padding:26px 32px 28px;" align="${start}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="46" valign="middle"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#fcfaf3;border-radius:11px;padding:4px;"><img src="${LOGO}" width="38" height="38" alt="Medad-X" style="display:block;border:0;outline:none;"></td></tr></table></td>
<td valign="middle" align="${start}" style="padding-${start}:12px;${f(600, 12, 1.5)}letter-spacing:${rtl ? '0' : '.16em'};text-transform:uppercase;color:${C.goldLight};">${rtl ? 'ميداد-إكس' : 'Medad-X'}</td>
</tr></table>
<h1 class="h1" style="margin:22px 0 0;${f(600, 30, 1.2, head)}color:${C.cream};">${esc(t.title[v.kind])}</h1>
</td></tr>
<tr><td style="background:${C.gold};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td class="px" align="${start}" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:28px 32px 32px;">
<p style="margin:0;${f(600, 17, 1.5)}color:${C.ink};">${esc(t.hello(v.name))}</p>
<p style="margin:10px 0 0;${f(400, 15, 1.65)}color:${C.ink};">${esc(t.lead[v.kind])}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;"><tr><td align="center" style="background:${C.tint};border:1px dashed ${C.gold};border-radius:12px;padding:16px;">
<p style="margin:0;${label}">${esc(t.ref)}</p>
<p style="margin:8px 0 0;${f(600, 24, 1.2, F.mono)}color:${C.green};letter-spacing:.04em;" dir="ltr">${esc(ref)}</p>
<p style="margin:6px 0 0;${f(400, 12, 1.5)}color:${C.faint};">${esc(t.refHint)}</p>
</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${section(t.summary[v.kind], summary)}
${section(t.next, `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${steps}</table>`)}
${section(t.help, `<table role="presentation" class="cta" cellspacing="0" cellpadding="0" style="margin-top:16px;"><tr>${btn(CONTACT.waHref, t.wa, true)}<td class="cta-gap" width="8" style="font-size:0;line-height:0;">&nbsp;</td>${btn(CONTACT.phoneHref, t.call, false, CONTACT.phone)}</tr></table><p style="margin:12px 0 0;${f(400, 13, 1.5)}color:${C.muted};">${esc(t.replyHint)}</p>`)}
</table>
</td></tr>
<tr><td align="center" style="padding:20px 16px 0;${f(400, 12, 1.7)}color:${C.faint};">${esc(t.why)}<br><a href="${t.privacyHref}" style="color:${C.faint};text-decoration:underline;">${esc(t.privacy)}</a> &nbsp;·&nbsp; <a href="https://medadx.com" style="color:${C.faint};text-decoration:underline;">medadx.com</a><br>${esc(t.brand)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------- plain text ----------
function renderText(v: View, ref: string) {
  const t = T[v.lang];
  const out = [t.hello(v.name), '', t.lead[v.kind], '', `${t.ref}: ${ref}`, t.refHint, '', t.summary[v.kind].toUpperCase()];
  for (const [prod, pack, qty] of v.rows ?? []) out.push(`- ${prod} · ${pack} × ${qty}`);
  if (v.total) out.push(`${t.total}: ${v.total}`);
  for (const [k, val] of v.fields) out.push(`${k}: ${val}`);
  if (v.chips?.length) out.push(`${t.products}: ${v.chips.join(', ')}`);
  if (v.docs.length) out.push(`${t.docs}: ${v.docs.join(', ')}`);
  out.push(`${t.contactAt}: ${v.contact.join(' · ')}`, '', t.next.toUpperCase(), ...t.steps[v.kind].map((s, i) => `${i + 1}. ${s}`));
  out.push('', `${t.help} WhatsApp ${CONTACT.wa} · ${t.call} ${CONTACT.phone} · ${CONTACT.email}`, t.replyHint, '', t.why, t.privacyHref);
  return out.join('\n');
}

/** The customer's confirmation, or null when there is none to send (quick inquiry, no valid email). */
export function buildConfirmationEmail(lead: Lead, ref: string): { to: string; subject: string; html: string; text: string } | null {
  const v = view(lead);
  if (!v) return null;
  return { to: v.to, subject: `${T[v.lang].subject[v.kind]} · ${ref}`, html: renderHtml(v, ref), text: renderText(v, ref) };
}
