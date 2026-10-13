import { readFileSync } from 'node:fs';

/** All indexable URLs (from the built sitemap), as paths. */
export function sitemapPaths(): string[] {
  const xml = readFileSync(new URL('../../dist/sitemap-0.xml', import.meta.url), 'utf8');
  return [...xml.matchAll(/<loc>https:\/\/medadx\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
}
