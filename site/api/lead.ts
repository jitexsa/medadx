/**
 * POST /api/lead — receives quote / quick-quote / trading-account leads and emails them to the
 * trade team through Resend (see src/lib/lead/deliver.ts for the env settings).
 *
 * Without RESEND_API_KEY the endpoint answers 501, so the site shows an error instead of
 * silently losing leads. The forms only post here when PUBLIC_LEAD_ENDPOINT=/api/lead at build time.
 *
 * Contract (unchanged from the original lead-submit.js):
 *   application/json        { meta, payload }
 *   multipart/form-data     meta (JSON), payload (JSON), one part per file
 *   2xx → { ref: "MX-…" }   shown to the visitor as their reference number
 */
import { deliverLead, mailConfig, type Lead } from '../src/lib/lead/deliver.js';
import { checkFiles, isEmail, isPhone, looksLikeBot } from '../src/lib/lead/validate.js';

const ALLOWED_ORIGINS = new Set(['https://medadx.com', 'https://www.medadx.com']);
/** Vercel Functions reject request bodies above 4.5 MB; uploads are capped at 4 MiB client-side. */
const MAX_BYTES = 4_500_000;
const TYPES = new Set(['trading-account', 'quote', 'quick-quote']);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const isPreview = origin?.endsWith('.vercel.app');
  if (origin && !ALLOWED_ORIGINS.has(origin) && !isPreview) return json(403, { ok: false, reason: 'origin' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return json(413, { ok: false, reason: 'too-large' });

  let lead: Lead;
  try {
    if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const fd = await request.formData();
      const files = [...fd.entries()]
        .filter(([k, v]) => k !== 'meta' && k !== 'payload' && v instanceof File)
        .map(([key, v]) => ({ key, file: v as File }));
      lead = { meta: JSON.parse(String(fd.get('meta'))), payload: JSON.parse(String(fd.get('payload'))), files };
    } else {
      const body = await request.json();
      lead = { meta: body.meta, payload: body.payload, files: [] };
    }
  } catch {
    return json(400, { ok: false, reason: 'bad-request' });
  }
  if (!lead.meta || typeof lead.meta !== 'object') return json(400, { ok: false, reason: 'bad-request' });

  const p = (lead.payload ??= {});
  if (!TYPES.has(String(lead.meta.type))) return json(400, { ok: false, reason: 'type' });
  if (looksLikeBot(String(p.company_website ?? ''), Date.now() - Number(lead.meta.elapsedMs ?? 0))) return json(200, { ok: true });
  if (!String(p.name ?? '').trim() || !isPhone(String(p.phone ?? ''))) return json(422, { ok: false, reason: 'fields' });
  if (p.email && !isEmail(String(p.email))) return json(422, { ok: false, reason: 'email' });
  if (lead.files.length && !checkFiles(lead.files.map((f) => f.file)).ok) return json(422, { ok: false, reason: 'files' });

  const cfg = mailConfig(process.env);
  if (!cfg) return json(501, { ok: false, reason: 'not-configured' });

  const ref = 'MX-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  const result = await deliverLead(lead, ref, cfg);
  if (!result.ok) {
    // No visitor data in logs: just enough to diagnose the mail setup.
    console.error('[lead] delivery failed', { ref, type: lead.meta.type, status: result.status, error: result.error });
    return json(502, { ok: false, reason: 'delivery' });
  }
  if (result.via === 'fallback') console.warn('[lead] sent via Resend test sender: verify the sending domain', { ref });
  if (result.confirmError) console.warn('[lead] customer confirmation failed', { ref, error: result.confirmError });
  // confirmationSent lets the form tell the visitor to check their inbox.
  return json(200, { ok: true, ref, confirmationSent: result.confirmed });
}

export async function GET() {
  return json(405, { ok: false });
}
