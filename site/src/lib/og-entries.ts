/**
 * Every page that gets a social-share image, with the text each template needs.
 * The OG endpoint (src/pages/og/[...slug].jpg.ts) renders one 1200×630 JPEG per entry,
 * and BaseLayout points `og:image` at the same path via ogPath().
 */
import { getDict, LOCALES, type Locale } from '@/i18n';
import { getLegal } from '@/i18n/legal';
import { ui } from '@/i18n/ui';
import histAr from '@/content/history/ar.json';
import histEn from '@/content/history/en.json';
import { getProducts, getRecipes, productCopy } from './catalog';
import { ogPath } from './seo';
import { shortTime } from './recipe-format';

export type OgEntry =
  | { kind: 'page'; slug: string; locale: Locale; kicker: string; title: string; sub?: string; bags?: string[] }
  | { kind: 'product'; slug: string; locale: Locale; id: string; name: string; type: string; meta: string; packs: string[] }
  | { kind: 'recipe'; slug: string; locale: 'en'; recipe: string; title: string; meta: string; credit: string }
  | { kind: 'article'; slug: string; locale: Locale; kicker: string; title: string; sub: string }
  | { kind: 'collage'; slug: string; locale: 'en'; kicker: string; title: string; sub: string; recipes: string[] };

const slugOf = (path: string, locale: Locale) =>
  ogPath(path, locale)
    .replace(/^\/og\//, '')
    .replace(/\.jpg$/, '');

export async function ogEntries(): Promise<OgEntry[]> {
  const out: OgEntry[] = [];
  const products = await getProducts();
  const bags = products.map((p) => p.id);

  for (const locale of LOCALES) {
    const t = getDict(locale);
    const u = ui(locale);
    const lg = getLegal(locale);
    const h = locale === 'ar' ? histAr : histEn;
    const page = (path: string, kicker: string, title: string, sub?: string, withBags = false) =>
      out.push({ kind: 'page', slug: slugOf(path, locale), locale, kicker, title, sub, bags: withBags ? bags : undefined });

    page('/', t.footer.tagline, t.hero.h1, t.hero.sub, true);
    page('/about', t.aboutPage.heroT, t.aboutPage.ovTitle, t.aboutPage.heroSub);
    page('/supply-chain', t.supplyPage.procLabel, t.supplyPage.heroT, t.supplyPage.heroSub);
    page('/products', t.prodSec.label, t.prodSec.title, u.productPage.indexIntro, true);
    page('/contact', t.contact.heroT, t.contact.formT, t.contact.formSub);
    page('/trading-account', 'MEDAD-X · B2B', t.trading.heroT, t.trading.heroSub);
    page('/terms', lg.metaLabel, lg.terms.title);
    page('/privacy', lg.metaLabel, lg.privacy.title);
    page('/rice-terms', lg.metaLabel, lg.riceTerms.title);
    page('/image-credits', u.brand, u.credits.title);
    out.push({
      kind: 'article',
      slug: slugOf('/history-of-rice', locale),
      locale,
      kicker: h.hero.kicker,
      title: h.hero.title,
      sub: h.hero.standfirst,
    });

    for (const p of products) {
      const c = productCopy(p, locale);
      out.push({
        kind: 'product',
        slug: slugOf(`/products/${p.id}`, locale),
        locale,
        id: p.id,
        name: c.name,
        type: c.type,
        meta: `${c.grain} · ${c.aroma} · ${c.origin}`,
        packs: c.packs,
      });
    }
  }

  const recipes = await getRecipes();
  out.push({
    kind: 'collage',
    slug: 'recipes',
    locale: 'en',
    kicker: 'Medad-X Kitchen',
    title: 'The Rice Recipe Collection',
    sub: '30 classic dishes for premium aged basmati',
    recipes: ['chicken-kabsa', 'pakistani-chicken-biryani', 'chicken-mandi'],
  });
  const { getCredits } = await import('./catalog');
  const credits = await getCredits();
  for (const r of recipes) {
    const cr = credits.get(`recipes/${r.slug}`);
    out.push({
      kind: 'recipe',
      slug: `recipes/${r.slug}`,
      locale: 'en',
      recipe: r.slug,
      title: r.title,
      meta: `${r.cuisine.split('(')[0]!.trim()} · Serves ${r.servings} · ${shortTime(r.totalTime)}`,
      credit: cr ? `Photo: ${cr.artist} · ${cr.license}` : '',
    });
  }
  return out;
}
