/**
 * Every indexable page: status, language, one h1, metadata, canonical, share image,
 * structured data, hreflang reciprocity, image attributes, no console errors and no
 * third-party requests.
 */
import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { sitemapPaths } from './pages';

const SITE = 'https://medadx.com';
const paths = sitemapPaths();

test('sitemap lists every page', () => {
  expect(paths.length).toBeGreaterThanOrEqual(55);
  expect(paths).toContain('/products/farah');
  expect(paths).toContain('/ar/products/farah');
  expect(paths).toContain('/recipes/chicken-kabsa');
});

for (const path of paths) {
  test(`page ${path}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    const external: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url());
    });

    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);

    const ar = path === '/ar' || path.startsWith('/ar/');
    await expect(page.locator('html')).toHaveAttribute('lang', ar ? 'ar' : 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
    await expect(page.locator('h1')).toHaveCount(1);

    const title = await page.title();
    expect(title.length, title).toBeGreaterThanOrEqual(10);
    expect(title.length, title).toBeLessThanOrEqual(75);
    const desc = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(desc.length, desc).toBeGreaterThanOrEqual(40);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE + (path === '/' ? '' : path));

    // Share image: absolute, exists in dist, 1200×630 JPEG.
    const og = (await page.locator('meta[property="og:image"]').getAttribute('content')) ?? '';
    expect(og).toMatch(/^https:\/\/medadx\.com\/og\/.+\.jpg$/);
    const file = new URL(`../../dist${new URL(og).pathname}`, import.meta.url).pathname;
    expect(existsSync(file), og).toBe(true);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 630, 'jpeg']);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

    // Structured data parses and has a @type.
    for (const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) {
      const data = JSON.parse(raw);
      expect(data['@type'], raw.slice(0, 80)).toBeTruthy();
    }

    // hreflang: self + x-default; Arabic pair reciprocal (recipes are EN-only).
    const alts = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((ls) => Object.fromEntries(ls.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')])));
    expect(alts['x-default']).toBeTruthy();
    expect(alts[ar ? 'ar' : 'en']).toBe(SITE + (path === '/' ? '' : path));
    if (path.startsWith('/recipes')) expect(alts.ar).toBeUndefined();
    else expect(alts.en && alts.ar).toBeTruthy();

    // Images: alt present; raster images carry width/height (no layout shift).
    const bad = await page
      .locator('img')
      .evaluateAll((imgs) =>
        imgs
          .filter(
            (i) =>
              !i.hasAttribute('alt') ||
              (!i.getAttribute('src')?.startsWith('data:') && !(i.hasAttribute('width') && i.hasAttribute('height'))),
          )
          .map((i) => i.outerHTML.slice(0, 120)),
      );
    expect(bad).toEqual([]);

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(baseURL).toBeTruthy();
  });
}

test('404 page is served for unknown URLs and is noindex', async ({ page }) => {
  const res = await page.goto('/this-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
