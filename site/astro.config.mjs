// @ts-check
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export const SITE = 'https://medadx.com';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  // No Markdown code blocks on the site; Shiki's inline styles would also conflict with the CSP.
  markdown: { syntaxHighlight: false },
  // /about → about.html; Vercel `cleanUrls` serves it at /about.
  // Inline CSS: removes render-blocking requests (the biggest mobile LCP cost); CSP hashes cover it.
  build: { format: 'file', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    preact(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar' } },
      filter: (page) => !/\/404$/.test(page) && !page.includes('/og/'),
    }),
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: {
    // Never inline assets as data: URIs — tiny font subsets would be blocked by `font-src 'self'`.
    build: { assetsInlineLimit: 0 },
  },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
});
