/**
 * POST /api/lead — receives quote / quick-quote / trading-account leads.
 *
 * STATUS: delivery not configured yet. Until `deliver()` is wired to email/CRM the
 * endpoint answers 501, so the site shows an error instead of silently losing leads.
 * To activate: implement deliver(), set PUBLIC_LEAD_ENDPOINT=/api/lead in Vercel.
 *
 * Contract (unchanged from the original lead-submit.js):
 *   application/json        { meta, payload }
 *   multipart/form-data     meta (JSON), payload (JSON), one part per file
 *   2xx → { ref: "MX-…" }   shown to the visitor as their reference number
 */
import { checkFiles, isEmail, isPhone, looksLikeBot } from '../src/lib/lead/validate.js';

const ALLOWED_ORIGINS = new Set(['https://medadx.com', 'https://www.medadx.com']);
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(['trading-account', 'quote', 'quick-quote']);

type Lead = { meta: Record<string, unknown>; payload: Record<string, unknown>; files: File[] };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** TODO(owner): send the lead to email / CRM (e.g. Resend, SMTP, HubSpot webhook). Return true on success. */
async function deliver(_lead: Lead, _ref: string): Promise<boolean> {
  return false;
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const isPreview = origin?.endsWith('.vercel.app');
  if (origin && !ALLOWED_ORIGINS.has(origin) && !isPreview) return json(403, { ok: false, reason: 'origin' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return json(413, { ok: false, reason: 'too-large' });

  let lead: Lead;
  try {
    if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const fd = await request.formData();
      const files = [...fd.entries()].filter(([k, v]) => k !== 'meta' && k !== 'payload' && v instanceof File).map(([, v]) => v as File);
      lead = { meta: JSON.parse(String(fd.get('meta'))), payload: JSON.parse(String(fd.get('payload'))), files };
    } else {
      const body = await request.json();
      lead = { meta: body.meta, payload: body.payload, files: [] };
    }
  } catch {
    return json(400, { ok: false, reason: 'bad-request' });
  }

  const p = lead.payload ?? {};
  if (!TYPES.has(String(lead.meta?.type))) return json(400, { ok: false, reason: 'type' });
  if (looksLikeBot(String(p.company_website ?? ''), Date.now() - Number(lead.meta?.elapsedMs ?? 0))) return json(200, { ok: true });
  if (!String(p.name ?? '').trim() || !isPhone(String(p.phone ?? ''))) return json(422, { ok: false, reason: 'fields' });
  if (p.email && !isEmail(String(p.email))) return json(422, { ok: false, reason: 'email' });
  if (lead.files.length && !checkFiles(lead.files).ok) return json(422, { ok: false, reason: 'files' });

  const ref = 'MX-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  const delivered = await deliver(lead, ref);
  if (!delivered) return json(501, { ok: false, reason: 'not-configured' });
  return json(200, { ok: true, ref });
}

export async function GET() {
  return json(405, { ok: false });
}
