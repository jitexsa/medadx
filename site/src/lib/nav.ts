import { getDict, localizedPath, type Locale } from '@/i18n';
import { ui } from '@/i18n/ui';

export type NavKey = 'home' | 'products' | 'about' | 'supply-chain' | 'recipes' | 'history' | 'contact' | 'trading';

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  /** Link target exists only in English. */
  enOnly?: boolean;
}

/** Primary navigation (header + mobile menu + footer "Quick links"). */
export function primaryNav(locale: Locale): NavItem[] {
  const t = getDict(locale);
  const u = ui(locale);
  const label = (path: string) => t.nav.items.find((i) => i.path === path)?.label ?? path;
  const href = (p: string) => localizedPath(p, locale);
  return [
    { key: 'home', href: href('/'), label: label('home') },
    { key: 'products', href: href('/products'), label: u.productsNav },
    { key: 'about', href: href('/about'), label: label('about') },
    { key: 'supply-chain', href: href('/supply-chain'), label: label('supply-chain') },
    { key: 'recipes', href: '/recipes', label: u.recipesNav, enOnly: locale === 'ar' },
    { key: 'history', href: href('/history-of-rice'), label: label('history') },
  ];
}

export const contactLabel = (locale: Locale) => getDict(locale).nav.items.find((i) => i.path === 'contact')?.label ?? 'Contact';
