import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../api/lead';
import site from '../../src/data/site.json';
import { buildConfirmationEmail, CONTACT, safeEcho } from '../../src/lib/lead/confirm-email';
import { buildLeadEmail, deliverLead, mailConfig, type Lead } from '../../src/lib/lead/deliver';
import { LOGO_ATTACHMENT } from '../../src/lib/lead/email';

const cfg = mailConfig({ RESEND_API_KEY: 're_test' })!;
const quote = (payload: Record<string, unknown> = {}, files: Lead['files'] = []): Lead => ({
  meta: { type: 'quote' },
  payload: {
    name: 'Khalid Al-Harbi',
    company: 'Al Waha Hotels',
    email: 'k@alwaha.sa',
    phone: '+966 55 214 7789',
    message: 'SECRET-MESSAGE-TEXT please call me',
    lines: [
      { product: 'Farah', size: '40 kg', qty: '250' },
      { product: 'Dhoqan', size: '20 kg', qty: '120' },
    ],
    lang: 'en',
    ...payload,
  },
  files,
});
const trading = (payload: Record<string, unknown> = {}): Lead => ({
  meta: { type: 'trading-account' },
  payload: {
    company: 'مؤسسة الريان',
    name: 'فهد',
    email: 'fahad@alrayan.sa',
    dial: '+966',
    phone: '0501234567',
    products: ['فرح', 'ذوقان'],
    volume: '50–200 طن',
    lang: 'ar',
    ...payload,
  },
  files: [{ key: 'vat', file: new File(['x'], 'VAT certificate.pdf', { type: 'application/pdf' }) }],
});

function mockFetch(...statuses: number[]) {
  const calls: { body: Record<string, any>; headers: Record<string, string> }[] = [];
  const fn = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({ body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)]!;
    return new Response(JSON.stringify(status < 300 ? { id: 'em_1' } : { message: 'boom' }), { status });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('confirmation contents', () => {
  it('uses the same contact details as the website', () => {
    expect(CONTACT.phone).toBe(site.phone);
    expect(CONTACT.phoneHref).toBe(site.phoneHref);
    expect(CONTACT.wa).toBe(site.wa);
    expect(CONTACT.waHref).toBe(site.waHref);
    expect(CONTACT.email).toBe(site.email);
  });

  it('English quote: greeting, reference, products and total, but never the message', () => {
    const m = buildConfirmationEmail(quote(), 'MX-AB12')!;
    expect(m.to).toBe('k@alwaha.sa');
    expect(m.subject).toBe('We’ve received your quote request · MX-AB12');
    expect(m.html).toContain('lang="en" dir="ltr"');
    expect(m.text).toContain('Dear Khalid Al-Harbi,');
    expect(m.text).toContain('- Farah · 40 kg × 250');
    expect(m.text).toContain('Total: 370 units · 12,400 kg');
    expect(m.text).toContain('We’ll contact you at: k@alwaha.sa · +966 55 214 7789');
    expect(m.html).toContain('https://wa.me/966591278526');
    expect(m.html + m.text).not.toContain('SECRET-MESSAGE-TEXT');
  });

  it('Arabic trading application: RTL, Arabic copy, products, documents, phone with dial code', () => {
    const m = buildConfirmationEmail(trading(), 'MX-AR34')!;
    expect(m.subject).toBe('استلمنا طلب فتح حسابك التجاري · MX-AR34');
    expect(m.html).toContain('lang="ar" dir="rtl"');
    expect(m.text).toContain('مرحباً فهد،');
    expect(m.text).toContain('المنتجات المطلوبة: فرح, ذوقان');
    expect(m.text).toContain('vat-VAT certificate.pdf');
    expect(m.text).toContain('+966 501234567');
    expect(m.html).toContain('https://medadx.com/ar/privacy');
  });

  it('cannot be used to send links or markup to a stranger', () => {
    const m = buildConfirmationEmail(
      quote({
        name: 'Win a prize at www.spam.example',
        lines: [
          { product: 'Visit http://evil.example', size: '40 kg', qty: '1' },
          { product: '<script>x</script>', size: '5 kg', qty: '2' },
        ],
      }),
      'MX-X',
    )!;
    expect(m.text).toContain('Hello,'); // link-like name dropped → generic greeting
    expect(m.html + m.text).not.toMatch(/spam\.example|evil\.example/);
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(safeEcho('Ali (a@b.sa)', 60)).toBe('');
    expect(safeEcho('Gulf Foods Co.', 60)).toBe('Gulf Foods Co.');
  });

  it('is skipped for the quick inquiry and for invalid addresses', () => {
    expect(buildConfirmationEmail({ meta: { type: 'quick-quote' }, payload: { email: 'a@b.sa' }, files: [] }, 'MX-Q')).toBeNull();
    expect(buildConfirmationEmail(quote({ email: 'a@b.sa?bcc=c@d.sa' }), 'MX-1')).toBeNull();
    expect(buildConfirmationEmail(quote({ email: '' }), 'MX-1')).toBeNull();
  });
});

describe('inline logo', () => {
  it('both emails show the embedded logo instead of loading it from the web', () => {
    const team = buildLeadEmail(quote(), 'MX-L');
    const customer = buildConfirmationEmail(quote(), 'MX-L')!;
    for (const html of [team.html, customer.html]) {
      expect(html).toContain('src="cid:medadx-logo"');
      expect(html).not.toContain('icon-192.png');
    }
    const png = Buffer.from(LOGO_ATTACHMENT.content, 'base64');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.length).toBeLessThan(8000);
  });
});

describe('sending the confirmation', () => {
  it('goes to the customer from CONFIRM_FROM, replies to the team, no attachments', async () => {
    const { fn, calls } = mockFetch(200);
    const file = new File(['x'], 'spec.pdf', { type: 'application/pdf' });
    await deliverLead(quote({}, [{ key: 'file', file }]), 'MX-5', cfg, fn);
    expect(calls[1]!.headers['Idempotency-Key']).toBe('MX-5-confirm');
    expect(calls[1]!.body).toMatchObject({ from: 'Medad-X <leads@medadx.com>', to: ['k@alwaha.sa'], reply_to: ['info@medadx.com'] });
    expect(calls[1]!.body.attachments).toEqual([expect.objectContaining({ content_id: 'medadx-logo' })]); // only the inline logo
  });
  it('a failed confirmation never fails the lead', async () => {
    const { fn } = mockFetch(200, 422);
    expect(await deliverLead(quote(), 'MX-6', cfg, fn)).toEqual({ ok: true, via: 'primary', confirmed: false, confirmError: '422 boom' });
  });
  it('LEAD_CONFIRM=off and the quick inquiry send only the team email', async () => {
    const off = mockFetch(200);
    await deliverLead(quote(), 'MX-7', { ...cfg, confirm: false }, off.fn);
    expect(off.calls).toHaveLength(1);
    const quick = mockFetch(200);
    await deliverLead(
      { meta: { type: 'quick-quote' }, payload: { name: 'A', phone: '0591278526', items: [] }, files: [] },
      'MX-8',
      cfg,
      quick.fn,
    );
    expect(quick.calls).toHaveLength(1);
  });
});

describe('POST /api/lead confirmation flag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it('tells the form whether the confirmation went out', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubGlobal('fetch', mockFetch(200).fn);
    const res = await POST(
      new Request('https://medadx.com/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://medadx.com' },
        body: JSON.stringify({ meta: { type: 'quote', elapsedMs: 10_000 }, payload: quote().payload }),
      }),
    );
    expect(await res.json()).toMatchObject({ ok: true, confirmationSent: true });
  });
});
