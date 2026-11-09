# medadx.com

Static website for Medad-X (Arsan Global Group), built with **Astro 7**: English at `/` and Arabic at `/ar/`, deployed on Vercel.

## Commands

```sh
npm ci
npm run dev          # http://localhost:4321
npm run build        # astro check + static build to dist/ (pages, WebP images, share thumbnails)
npm run lint         # ESLint + Prettier
npm test             # unit (vitest) + end-to-end/SEO/axe (Playwright)
npm run test:links   # internal link check on dist/ (Vercel cleanUrls rules)
npm run lhci         # Lighthouse budgets
```

## Structure

| Path                                        | What                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/pages/`                                | Routes. The `en` and `ar` versions are thin wrappers around `src/views/*`     |
| `src/views/`, `src/components/`             | Page templates and sections                                                   |
| `src/islands/`                              | Preact islands: quote drawer, buyer tools, quote form, trading-account form   |
| `src/scripts/`                              | Small vanilla scripts: header, hero carousel, reveal, recipe tools            |
| `src/i18n/en.json`, `ar.json`               | Copy ported from the design (keep both in sync; a unit test checks the keys)  |
| `src/i18n/ui.ts`                            | New copy: SEO titles and descriptions, product pages, accessibility labels    |
| `src/content/`                              | Products, 30 recipes, legal, history article, image credits                   |
| `src/og/render.ts`, `src/lib/og-entries.ts` | Share-image generator: one 1200×630 JPEG per URL, written to `/og/…`          |
| `src/lib/schema.ts`                         | JSON-LD builders                                                              |
| `api/lead.ts`, `src/lib/lead/`              | Lead endpoint: validates form posts and emails them via Resend                |
| `scripts/`                                  | One-time and maintenance scripts (content extraction, image downloads, icons) |
| `docs/`                                     | `AUDIT.md`, `SEO-PLAN.md`                                                     |

## Adding a recipe

1. Add `src/content/recipes/<slug>.json`. The schema in `src/content.config.ts` validates it at build time.
2. Put the photo at `src/assets/recipes/<slug>.jpg`. For Wikimedia photos, add the file to the JSON's `sourceImage` and run `npm run content:images` to download it and record the credit.
3. `npm run build` creates the page, the share image, the structured data and the sitemap entry.

## Forms

Forms call `submitLead()` in `src/lib/lead/submit.ts`, which keeps the same contract as the original `lead-submit.js`.

All three forms (contact-page quote form, trading-account application, quick-inquiry drawer) post to `/api/lead`, which validates the lead and emails it to the trade team through [Resend](https://resend.com) (`src/lib/lead/deliver.ts`). Attachments are included, and Reply-To is the customer's email.

- With `PUBLIC_LEAD_ENDPOINT` empty, submits are simulated: a "Preview build" notice shows and nothing is sent. Production sets it to `/api/lead` (build-time: redeploy after changing it).
- Vercel env vars (see `.env.example`): `RESEND_API_KEY` (required), `LEAD_TO` (default `info@medadx.com`), `LEAD_FROM` (default `Medad-X Website <leads@medadx.com>`), `LEAD_FALLBACK_TO`.
- The sender's domain must be verified in Resend (Domains → add `medadx.com`, then add its DKIM/SPF records at SiteGround; they live on `resend._domainkey` and `send`, so they do not affect Zoho mail). Until then, if `LEAD_FALLBACK_TO` is set, leads are sent from `onboarding@resend.dev` to that address (it must be the Resend account owner's email) with a banner saying so. Once the domain verifies, delivery switches to `LEAD_FROM` → `LEAD_TO` automatically.
- Customers who give an email (quote form, trading-account application) also get a branded confirmation in the language of the page (EN or RTL Arabic) with their reference, a summary and next steps (`src/lib/lead/confirm-email.ts`). It is sent from `CONFIRM_FROM` (default `Medad-X <leads@medadx.com>`), replies go to `LEAD_TO`, and the success screen says it was sent. It never repeats the free-text message and drops link-like values, so the form can't be used to mail content to strangers. Set `LEAD_CONFIRM=off` to stop confirmations (env changes apply after a redeploy).
- Failures return an error to the visitor (who is pointed to WhatsApp) and log `[lead] delivery failed` in the Vercel runtime logs, without visitor data.

## Deploy (Vercel)

1. Create a project with Root Directory `site`. Framework: Astro. Node 22.
2. Add the domains `medadx.com` (primary, no redirect) and `www.medadx.com` set in Vercel to 308-redirect to `medadx.com`. Never redirect the apex to `www`: canonical URLs use the apex.
3. Preview deployments get `X-Robots-Tag: noindex`.

Security headers live in `vercel.json`. Script and style CSP hashes are emitted by Astro (`security.csp`). Do not add inline `style=""` attributes; use classes or CSSOM, because the CSP blocks inline styles.
