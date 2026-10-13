import { describe, expect, it } from 'vitest';
import ar from '../../src/i18n/ar.json';
import en from '../../src/i18n/en.json';
import { alternates, basePath, fmt, localizedPath } from '../../src/i18n';
import legalAr from '../../src/content/legal/ar.json';
import legalEn from '../../src/content/legal/en.json';
import histAr from '../../src/content/history/ar.json';
import histEn from '../../src/content/history/en.json';

/** Every key path (arrays compared by length) — EN and AR must have the same shape. */
function shape(v: unknown, path = ''): string[] {
  if (Array.isArray(v)) return [`${path}[${v.length}]`, ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => shape(x, path ? `${path}.${k}` : k));
  return [path];
}

describe('dictionaries', () => {
  it('EN and AR UI copy have identical keys', () => expect(shape(ar)).toEqual(shape(en)));
  it('EN and AR legal copy have identical keys', () => expect(shape(legalAr)).toEqual(shape(legalEn)));
  it('EN and AR history copy have identical keys', () => expect(shape(histAr)).toEqual(shape(histEn)));
});

describe('routing helpers', () => {
  it('localizes paths', () => {
    expect(localizedPath('/', 'ar')).toBe('/ar');
    expect(localizedPath('/about', 'ar')).toBe('/ar/about');
    expect(localizedPath('/about', 'en')).toBe('/about');
  });
  it('parses localized paths', () => {
    expect(basePath('/ar')).toEqual({ locale: 'ar', path: '/' });
    expect(basePath('/ar/products/farah')).toEqual({ locale: 'ar', path: '/products/farah' });
    expect(basePath('/recipes/kabsa')).toEqual({ locale: 'en', path: '/recipes/kabsa' });
  });
  it('recipes are English-only', () => {
    expect(alternates('/recipes/chicken-kabsa')).toEqual({ en: '/recipes/chicken-kabsa' });
    expect(alternates('/about')).toEqual({ en: '/about', ar: '/ar/about' });
  });
  it('formats placeholders', () => expect(fmt('{0}% of one container', 42)).toBe('42% of one container'));
});
