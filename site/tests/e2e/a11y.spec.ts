import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/ar',
  '/products',
  '/products/farah',
  '/about',
  '/supply-chain',
  '/contact',
  '/ar/contact',
  '/trading-account',
  '/recipes',
  '/recipes/chicken-kabsa',
  '/history-of-rice',
  '/privacy',
];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    // Reveal-on-scroll content would otherwise be measured at opacity 0.
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in', 'is-instant')));
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
}
