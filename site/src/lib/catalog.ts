import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n';

export type ProductId = 'farah' | 'khayber' | 'dhoqan';
export type Product = CollectionEntry<'products'>['data'];
export type Recipe = CollectionEntry<'recipes'>['data'];

import { shortName } from './catalog-shared';
export { fmtInt, packKg, shortName } from './catalog-shared';

export async function getProducts() {
  const all = await getCollection('products');
  return all.map((e) => e.data).sort((a, b) => a.order - b.order);
}

export function productCopy(p: Product, locale: Locale) {
  const c = p.i18n[locale];
  return { ...c, short: shortName(c.name) };
}

export async function getRecipes() {
  const all = await getCollection('recipes');
  return all.map((e) => e.data).sort((a, b) => a.num - b.num);
}

export async function getCredits() {
  const all = await getCollection('credits');
  return new Map(all.map((e) => [e.data.id, e.data]));
}
