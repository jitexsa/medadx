import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../api/lead';
import { buildLeadEmail, deliverLead, mailConfig, type Lead } from '../../src/lib/lead/deliver';

const cfg = mailConfig({ RESEND_API_KEY: 're_test', LEAD_FALLBACK_TO: 'owner@medadx.com' })!;
const quote = (over: Partial<Lead> = {}): Lead => ({
  meta: { type: 'quote', submittedAt: '2026-11-08T10:00:00.000Z', page: 'https://medadx.com/contact', referrer: null },
  payload: {
    name: 'Ali <script>',
    company: 'Hotel & Co',
    email: 'buyer@hotel.sa',
    phone: '+966 50 000 0000',
    message: 'Line one\nLine two',
    lines: [{ product: 'Farah', size: '40 kg', qty: '100' }],
    totals: { qty: 100, kg: 4000 },
    lang: 'en',
  },
  files: [],
  ...over,
});

type Call = { url: string; body: Record<string, any>; headers: Record<string, string> };
function mockFetch(...responses: { status: number; body?: unknown }[]) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)]!;
    return new Response(JSON.stringify(r.body ?? { id: 'em_1' }), { status: r.status });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('mailConfig', () => {
  it('is null without an API key and has sensible defaults', () => {
    expect(mailConfig({})).toBeNull();
    expect(mailConfig({ RESEND_API_KEY: 'k' })).toEqual({
      apiKey: 'k',
      to: ['info@medadx.com'],
      from: 'Medad-X Website <leads@medadx.com>',
      fallbackTo: [],
      confirmFrom: 'Medad-X <leads@medadx.com>',
      confirm: true,
    });
    expect(mailConfig({ RESEND_API_KEY: 'k', LEAD_CONFIRM: 'OFF' })!.confirm).toBe(false);
    expect(mailConfig({ RESEND_API_KEY: 'k', LEAD_TO: 'a@x.sa, b@x.sa' })!.to).toEqual(['a@x.sa', 'b@x.sa']);
  });
});

describe('buildLeadEmail', () => {
  it('escapes visitor input and sets reply-to', () => {
    const m = buildLeadEmail(quote(), 'MX-ABC12');
    expect(m.subject).toBe('Quote request: Ali <script> (Hotel & Co) · MX-ABC12');
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('Ali &lt;script&gt;');
    expect(m.html).toContain('Hotel &amp; Co');
    expect(m.html).toContain('https://wa.me/966500000000');
    expect(m.text).toContain('Farah · 40 kg × 100');
    expect(m.text).toContain('Total: 100 units · 4,000 kg');
    expect(m.replyTo).toBe('buyer@hotel.sa');
  });
  it('joins the dial code for trading-account phones and lists arrays', () => {
    const m = buildLeadEmail(
      {
        meta: { type: 'trading-account' },
        payload: {
          company: 'Gulf Foods',
          name: 'Sara',
          email: 's@gulf.sa',
          dial: '+971',
          phone: '050 123 4567',
          products: ['Farah', 'Dhoqan'],
          consent: true,
        },
        files: [],
      },
      'MX-1',
    );
    expect(m.subject).toBe('Trading account application: Gulf Foods · MX-1');
    expect(m.text).toContain('Phone: +971 50 123 4567');
    expect(m.text).toContain('Products of interest: Farah, Dhoqan');
    expect(m.text).toContain('Consent to contact: Yes');
  });
  it('adds reply/WhatsApp/call buttons, Riyadh time and the Arabic badge', () => {
    const m = buildLeadEmail(quote({ payload: { ...quote().payload, lang: 'ar' } }), 'MX-9');
    expect(m.html).toContain(`mailto:buyer@hotel.sa?subject=${encodeURIComponent('Re: Your Medad-X quote request (MX-9)')}`);
    expect(m.html).toContain('tel:+966500000000');
    expect(m.html).toContain('Sun, 8 Nov 2026 · 13:00 Riyadh time');
    expect(m.html).toContain('Prefers Arabic');
    expect(m.html).toContain('4,000 kg'); // per-line weight from the pack size
  });
  it('never turns crafted input into links', () => {
    const m = buildLeadEmail(
      quote({
        meta: { type: 'quote', page: 'javascript:alert(1)' },
        payload: { ...quote().payload, email: 'a@b.sa?bcc=x@y.sa' },
      }),
      'MX-10',
    );
    expect(m.html).not.toContain('href="mailto:');
    expect(m.html).not.toContain('href="javascript:');
  });
  it('has no reply-to for the quick inquiry (no email field)', () => {
    const m = buildLeadEmail(
      { meta: { type: 'quick-quote' }, payload: { name: 'A', phone: '0591278526', items: ['Farah · 5 kg × 10 bags'] }, files: [] },
      'MX-Q1',
    );
    expect(m.replyTo).toBeUndefined();
    expect(m.text).toContain('- Farah · 5 kg × 10 bags');
    expect(m.html).not.toContain('wa.me'); // local number: no guessing the country code
  });
});

describe('deliverLead', () => {
  it('sends the lead with attachments, then the customer confirmation', async () => {
    const { fn, calls } = mockFetch({ status: 200 });
    const file = new File([new Uint8Array([1, 2, 3])], 'licence scan.pdf', { type: 'application/pdf' });
    const res = await deliverLead(quote({ files: [{ key: 'vat', file }] }), 'MX-1', cfg, fn);
    expect(res).toEqual({ ok: true, via: 'primary', confirmed: true });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.headers.Authorization).toBe('Bearer re_test');
    expect(calls[0]!.headers['Idempotency-Key']).toBe('MX-1');
    expect(calls[0]!.body).toMatchObject({
      from: 'Medad-X Website <leads@medadx.com>',
      to: ['info@medadx.com'],
      reply_to: 'buyer@hotel.sa',
    });
    expect(calls[0]!.body.attachments).toEqual([{ filename: 'vat-licence scan.pdf', content: 'AQID' }]);
  });
  it('falls back to the Resend test sender while the domain is unverified', async () => {
    const { fn, calls } = mockFetch({ status: 403, body: { message: 'The medadx.com domain is not verified.' } }, { status: 200 });
    const res = await deliverLead(quote(), 'MX-2', cfg, fn);
    expect(res).toEqual({ ok: true, via: 'fallback', confirmed: false });
    expect(calls).toHaveLength(2); // no confirmation: an unverified domain can't email customers
    expect(calls[1]!.body).toMatchObject({ from: 'Medad-X Website <onboarding@resend.dev>', to: ['owner@medadx.com'] });
    expect(calls[1]!.body.text).toContain('Intended for: info@medadx.com');
  });
  it('fails (no fallback) when unverified and no fallback address is set', async () => {
    const { fn } = mockFetch({ status: 403, body: { message: 'The medadx.com domain is not verified.' } });
    const res = await deliverLead(quote(), 'MX-3', { ...cfg, fallbackTo: [] }, fn);
    expect(res).toMatchObject({ ok: false, status: 403 });
  });
  it('retries once on a Resend outage', async () => {
    const { fn, calls } = mockFetch({ status: 503 }, { status: 200 });
    expect(await deliverLead(quote(), 'MX-4', cfg, fn)).toEqual({ ok: true, via: 'primary', confirmed: true });
    expect(calls).toHaveLength(3); // 503, retry, confirmation
  });
});

describe('POST /api/lead', () => {
  const req = (body: unknown, origin = 'https://medadx.com') =>
    new Request('https://medadx.com/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin },
      body: JSON.stringify(body),
    });
  const valid = () => ({ meta: { type: 'quote', elapsedMs: 10_000 }, payload: quote().payload });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects foreign origins and invalid fields', async () => {
    expect((await POST(req(valid(), 'https://evil.example'))).status).toBe(403);
    expect((await POST(req({ meta: { type: 'quote', elapsedMs: 10_000 }, payload: { name: 'x', phone: '1' } }))).status).toBe(422);
  });
  it('answers 501 when Resend is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await POST(req(valid()))).status).toBe(501);
  });
  it('delivers and returns a reference', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const { fn, calls } = mockFetch({ status: 200 });
    vi.stubGlobal('fetch', fn);
    const res = await POST(req(valid()));
    expect(res.status).toBe(200);
    expect((await res.json()).ref).toMatch(/^MX-[A-Z0-9]{5}\d{2}$/);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
  });
  it('returns 502 when delivery fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('LEAD_FALLBACK_TO', '');
    vi.stubGlobal('fetch', mockFetch({ status: 422, body: { message: 'bad' } }).fn);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await POST(req(valid()))).status).toBe(502);
  });
  it('silently accepts bots without sending', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const { fn, calls } = mockFetch({ status: 200 });
    vi.stubGlobal('fetch', fn);
    const res = await POST(req({ ...valid(), meta: { type: 'quote', elapsedMs: 100 } }));
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });
});
