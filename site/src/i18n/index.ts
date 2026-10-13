import ar from './ar.json';
import en from './en.json';

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export type Dict = typeof en;

const dicts: Record<Locale, Dict> = { en, ar: ar as Dict };

export const getDict = (locale: Locale): Dict => dicts[locale];
export const dir = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', ar: 'ar_SA' };

/** Fill `{0}`, `{1}` … placeholders (ported from the source dictionaries' formatter functions). */
export const fmt = (template: string, ...args: (string | number)[]) =>
  template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));

/** `/about` → `/ar/about`; `/` → `/ar`. Paths are always unprefixed EN paths. */
export function localizedPath(path: string, locale: Locale): string {
  if (locale === 'en') return path;
  return path === '/' ? '/ar' : `/ar${path}`;
}

/** Inverse of localizedPath: strip a leading `/ar`. */
export function basePath(pathname: string): { locale: Locale; path: string } {
  const clean = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (clean === '/ar') return { locale: 'ar', path: '/' };
  if (clean.startsWith('/ar/')) return { locale: 'ar', path: clean.slice(3) };
  return { locale: 'en', path: clean };
}

/** Pages that exist in English only (no Arabic translation yet). */
export const EN_ONLY = (path: string) => path === '/recipes' || path.startsWith('/recipes/');

export function alternates(path: string): Partial<Record<Locale, string>> {
  return EN_ONLY(path) ? { en: path } : { en: path, ar: localizedPath(path, 'ar') };
}
