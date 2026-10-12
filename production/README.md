# Medad-X — production site

Static website for **medadx.com** (Medad-X, Arsan Global Group). No build step: every file in this folder is served as-is.

## Deploy (for Claude Code)

1. Copy this folder's contents to the repo/web root (it *is* the site root).
2. Set `leadEndpoint` in `config.js` (see **Forms** — required before launch).
3. Domain: canonical host is the apex `https://medadx.com` (set in `config.js`, `robots.txt`, `sitemap.xml` and each page's `<head>` canonical/OG tags). `vercel.json` and `netlify.toml` 301-redirect `www.medadx.com` to it — add both `medadx.com` and `www.medadx.com` to the hosting project.
4. Deploy to any static host:
   - **Vercel:** `vercel --prod` from this folder (`vercel.json` included: clean URLs, cache + security headers).
   - **Netlify:** `netlify deploy --prod --dir .` (`netlify.toml` included).
   - **Cloudflare Pages / S3+CloudFront / nginx:** serve the folder; map `/recipes` → `recipes.html` and `/history-of-rice` → `history-of-rice.html`; use `404.html` as the error page.
5. Point DNS at the host, enable HTTPS, redirect apex ↔ www to the canonical host.
6. Smoke test (list below).

Local preview: `npx serve .` (must be served over http — `file://` won't load the scripts).

## Files

| File | Purpose |
|---|---|
| `index.html` | Main site — single-page app with hash routes: `#/`, `#/about`, `#/supply-chain`, `#/contact`, `#/inquiry`, `#/trading-account`, `#/terms`, `#/privacy`, `#/rice-terms` |
| `recipes.html` | Recipe index + detail views (`recipes.html#/<slug>`) |
| `history-of-rice.html` | Long-form "History of Rice" article |
| `content.js` | All EN/AR copy for `index.html` (`window.MEDADX_CONTENT`) — edit copy here |
| `recipes-data.js` | Recipe content + image URLs |
| `support.js` | Runtime that renders the `<x-dc>` templates in each page. **Do not edit.** Loads React 18.3.1 UMD from unpkg.com (SRI-pinned) |
| `config.js` | Deploy-time settings (domain, lead endpoint) |
| `lead-submit.js` | `window.MEDADX_SUBMIT` — sends form leads to `leadEndpoint` |
| `assets/` | Images (WebP; logos PNG; `og-*.jpg` link-preview images) + `image-slot.js` (image component). Full-size PNG originals are kept outside the web root in `../design-originals/assets/`. |
| `robots.txt`, `sitemap.xml`, `404.html`, `vercel.json`, `netlify.toml` | Hosting/SEO |

Pages are hand-off-ready static HTML: markup and inline styles live inside `<x-dc>…</x-dc>`, logic in the `<script data-dc-script>` class at the bottom of each page. Edit in place; keep the structure.

## Forms (must wire before launch)

Three lead forms in `index.html` call `window.MEDADX_SUBMIT(type, payload, files)`:

- `trading-account` — 4-step "Open Trading Account" wizard (company, contact, requirements, consent). May include trade-license files.
- `quote` — "Request Quote" page (contact + product/size/qty lines + totals).
- `quick-quote` — product drawer quick inquiry (name, phone, selected items).

With `leadEndpoint` empty, submits are **simulated** (console warning, success screen, nothing delivered). Once set:

- JSON: `POST { meta: { type, submittedAt, page, referrer }, payload }` with `Content-Type: application/json`.
- If files are attached: `multipart/form-data` with fields `meta` (JSON), `payload` (JSON) + one part per file.
- Respond `2xx`, optionally with JSON `{ "ref": "MX-123456" }` — shown to the user as their reference number. Non-2xx → bilingual error alert, form data kept.

Good options: a serverless function (`/api/lead` on Vercel/Netlify) that emails sales + writes to a CRM, or a form service (Formspree, Basin, HubSpot Forms). Add spam protection (honeypot/Turnstile) server-side. Must allow CORS if the endpoint is on another origin. Keep secrets server-side — `config.js` is public.

Draft data for the trading form is auto-saved in `localStorage` (`mx-trade-draft`) and cleared on success. Language/theme prefs: `mx-lang`, `mx-theme`.

## Contact details

Phone, WhatsApp (`wa.me/966591278526`), email, address and social links (LinkedIn/Instagram/X `medadx`) come from `content.js` (`window.MEDADX_DATA`). Verify they're final before launch.

## Pre-launch checklist

- [ ] `leadEndpoint` set and a test lead received for all three form types (incl. one with a file).
- [ ] **Two empty image slots** on the home page "raw vs cooked grain" comparison (`id="mx-grain-raw"`, `id="mx-grain-cooked"` in `index.html`) — add real photos: put files in `assets/` and add `src="assets/…"` to both `<image-slot>` tags. Without them visitors see an empty placeholder.
- [ ] Recipe + History images hot-link Wikimedia Commons / Unsplash. Works, but for reliability download them into `assets/` and update URLs in `recipes-data.js` / `history-of-rice.html`; keep Wikimedia attribution where the licence requires it.
- [ ] Legal pages (`#/terms`, `#/privacy`, `#/rice-terms`) reviewed by Medad-X.
- [ ] Domain/canonical correct; `sitemap.xml` submitted in Google Search Console.
- [ ] Optional: add analytics `<script>` in each page's `<head>` (before `support.js`).

## Smoke test

- Home loads with no console errors (one 404 for `.image-slots.state.json` is expected and harmless).
- EN ⇄ AR toggle flips to RTL; light/dark toggle works; both persist on reload.
- All nav links, including Recipes and History of Rice and back to the main site.
- Mobile (≤ 390px): burger menu, drawer, sticky CTA, forms usable.
- Each form: validation errors show; successful submit shows reference number.
- `/recipes`, `/history-of-rice`, and an unknown URL (→ 404 page).

## Known limitations / future work

- Routes inside `index.html` are hash-based (`#/about`), so search engines index it as one page. If SEO for sub-pages matters, port to a framework with real routes (e.g. Next.js/Astro) — the pages, copy (`content.js`) and assets here are the reference.
- Rendering is client-side (needs JS; first paint depends on unpkg.com for React). For hardening, self-host React by downloading the two UMD files and changing `REACT_URL` / `REACT_DOM_URL` in `support.js`.

## Source

Generated from the design project files `Medad-X Website.dc.html`, `Recipes.dc.html`, `History of Rice.dc.html`. Rewrite rules applied: `Medad-X%20Website.dc.html` → `./`, `Recipes.dc.html` → `recipes.html`, `History%20of%20Rice.dc.html` → `history-of-rice.html`; SEO `<head>` tags + `config.js`/`lead-submit.js` added; unused assets dropped.
