import type { Locale } from '@/i18n';

export const SITE_URL = 'https://medadx.com';

export const absUrl = (path: string) => new URL(path, SITE_URL).toString().replace(/\/$/, '') || SITE_URL;

/** Social-share image for a page: `/` → /og/home.jpg, `/ar/about` → /og/ar/about.jpg. */
export function ogPath(path: string, locale: Locale): string {
  const base = path === '/' ? '/home' : path;
  return `/og${locale === 'ar' ? '/ar' : ''}${base}.jpg`;
}

/** Serialize JSON-LD safely for inline <script> (no `</script>` breakout). */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
