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
| `api/lead.ts`                               | Lead endpoint stub (returns 501 until delivery is implemented)                |
| `scripts/`                                  | One-time and maintenance scripts (content extraction, image downloads, icons) |
| `docs/`                                     | `AUDIT.md`, `SEO-PLAN.md`                                                     |

## Adding a recipe

1. Add `src/content/recipes/<slug>.json`. The schema in `src/content.config.ts` validates it at build time.
2. Put the photo at `src/assets/recipes/<slug>.jpg`. For Wikimedia photos, add the file to the JSON's `sourceImage` and run `npm run content:images` to download it and record the credit.
3. `npm run build` creates the page, the share image, the structured data and the sitemap entry.

## Forms

Forms call `submitLead()` in `src/lib/lead/submit.ts`, which keeps the same contract as the original `lead-submit.js`.

- With `PUBLIC_LEAD_ENDPOINT` empty, submits are simulated: a "Preview build" notice shows and nothing is sent.
- To go live, implement `deliver()` in `api/lead.ts` and set `PUBLIC_LEAD_ENDPOINT=/api/lead` in Vercel.
- If you post to an external form service instead, add its origin to `connect-src` in `astro.config.mjs`.

## Deploy (Vercel)

1. Create a project with Root Directory `site`. Framework: Astro. Node 22.
2. Add the domains `medadx.com` (primary) and `www.medadx.com`. `vercel.json` also 308-redirects `www` to the apex domain.
3. Preview deployments get `X-Robots-Tag: noindex`.

Security headers live in `vercel.json`. Script and style CSP hashes are emitted by Astro (`security.csp`). Do not add inline `style=""` attributes; use classes or CSSOM, because the CSP blocks inline styles.
