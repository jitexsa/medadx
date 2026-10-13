# Medad-X site (Astro)

- Read README.md first. `production/` (repo root) is the original Claude Design export: reference only, do not edit.
- Keep EN and AR copy in sync (`src/i18n/*.json`, `src/content/legal/*`, `src/content/history/*`); `npm run test:unit` checks key parity.
- No inline `style` attributes in markup or island output. The strict CSP blocks them; use classes, `data-*` + CSS, or CSSOM (`el.style.setProperty`).
- Images: import from `src/assets` and render with `<Image format="webp">`. Never hot-link.
- Every new page must go through `BaseLayout`: one `h1`, a meta title and description. Register its share image in `src/lib/og-entries.ts`; the e2e test fails without it.
- Before finishing: `npm run lint && npm run build && npm test`.
