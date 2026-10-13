# Medad-X website audit (October 2026)

What we found in the original site, which was exported from Claude Design (`production/`), and what the Astro rebuild (`site/`) changes.

## Summary

The exported site looked finished, but it was not built to industry standards:

- Every page was drawn in the browser by a design-tool runtime. That runtime loaded React from a third-party CDN (unpkg).
- Search engines and link-preview bots saw template placeholders (`{{ t.hero.h1 }}`) instead of content.
- All sub-pages lived behind `#` links, so only 3 URLs could be indexed and every shared link showed the same thumbnail.

The rebuild fixes all of the findings below. The items still open are listed under **Remaining** at the end.

## Findings

| #   | Area               | Finding (original)                                                           | Severity | Status in `site/`                                                                                               |
| --- | ------------------ | ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | SEO                | Content rendered client-side only; crawlers saw `{{ }}` placeholders         | High     | Fixed: every page is static HTML                                                                                |
| 2   | SEO                | Hash routes (`#/about`, `recipes.html#/slug`) — 3 indexable URLs             | High     | Fixed: 60 real URLs; old hash links redirect                                                                    |
| 3   | SEO                | `hreflang` en/ar both pointed at the same URL (invalid)                      | Med      | Fixed: Arabic at `/ar/…`, reciprocal hreflang + x-default                                                       |
| 4   | SEO                | No structured data except a client-side Recipe without `image`               | Med      | Fixed: Organization, WebSite, Product, Recipe, Article, FAQPage, LocalBusiness, HowTo, BreadcrumbList, ItemList |
| 5   | Social             | 3 static share images; product/recipe links had no own thumbnail             | High     | Fixed: 59 generated 1200×630 thumbnails (one per URL)                                                           |
| 6   | Perf               | 27 MB of PNG images; no width/height (layout shift)                          | High     | Fixed: responsive WebP via `astro:assets`, all images sized                                                     |
| 7   | Perf               | 6 render-blocking scripts; 164 KB of copy JSON on every page                 | High     | Fixed: no blocking JS; ~21 KB gzipped JS on the home page (was React + runtime + 164 KB data)                   |
| 8   | Perf / reliability | React + fonts from third-party CDNs; blank page if unpkg blocked             | High     | Fixed: everything self-hosted, zero third-party requests                                                        |
| 9   | Reliability        | Recipe/history photos hot-linked from Wikimedia/Unsplash                     | Med      | Fixed: downloaded, credited, served as WebP                                                                     |
| 10  | Security           | No CSP possible (runtime used `new Function`)                                | High     | Fixed: strict CSP — hashed scripts, no `unsafe-eval`/`unsafe-inline`                                            |
| 11  | Security           | No spam protection on forms; uploads unrestricted                            | High     | Fixed: honeypot + minimum fill time; PDF/JPG/PNG, 3 files, 4 MB                                                 |
| 12  | Privacy            | Trading form draft (name, email, phone) kept in localStorage indefinitely    | Med      | Fixed: sessionStorage, 24 h expiry; legacy key deleted                                                          |
| 13  | Privacy            | Policy claimed cookies/analytics the site did not use                        | Med      | Fixed (EN+AR wording updated) — **needs legal review**                                                          |
| 14  | A11y               | No skip link; clickable `div`s without keyboard support                      | Med      | Fixed: skip link, real buttons/links everywhere                                                                 |
| 15  | A11y               | Drawer had no focus trap or focus return                                     | Med      | Fixed: focus trap, `inert` background, Esc, focus return                                                        |
| 16  | A11y               | Form errors not announced; file inputs unreachable by keyboard               | Med      | Fixed: error summary (`role=alert`), `aria-invalid`/`describedby`, focusable inputs                             |
| 17  | A11y               | About/Contact pages had no `h1`; carousels could not be paused               | Med      | Fixed: one `h1` per page; pause controls (WCAG 2.2.2)                                                           |
| 18  | A11y               | Gold labels (#A67F2E) and grey labels failed contrast (≈3:1)                 | Med      | Fixed: text gold #7F5F1C, muted text ≥ 4.5:1; axe clean on 13 key pages                                         |
| 19  | Maintainability    | No git, package.json, lint, tests or CI                                      | Med      | Fixed: git, ESLint, Prettier, `astro check`, 14 unit + 84 E2E tests, GitHub Actions                             |
| 20  | Maintainability    | Dark mode via `[style*="rgb(...)"]` selector hacks                           | Low      | Fixed: design tokens with light/dark values                                                                     |
| 21  | Content            | 404 request for `.image-slots.state.json` on every page; editor code shipped | Low      | Fixed: editor runtime not shipped                                                                               |

## Remaining (needs client input)

See `../CONTENT-TODO.md`. Most important:

1. **Lead delivery** — forms are simulated until `api/lead.ts` `deliver()` is connected to email/CRM and `PUBLIC_LEAD_ENDPOINT` is set.
2. **Legal review** of the updated privacy policy wording (EN + AR).
3. **Photos**: raw vs cooked grain (tool tab hidden until supplied); 5 Saudi recipes use photos of other dishes (marked "Illustrative photo").

## How this is verified

`npm run build && npm test` checks every page on each push (CI). The checks cover:

- 200 status, `lang`/`dir`, exactly one `h1`, title/description lengths, self-canonical
- a 1200×630 JPEG share image that exists
- valid JSON-LD, reciprocal hreflang
- images with alt/width/height
- no console errors, no third-party requests
- axe WCAG 2.1 AA on 13 key pages, with no serious or critical issues
