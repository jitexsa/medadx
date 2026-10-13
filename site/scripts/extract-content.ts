/**
 * One-time port of the Claude Design export copy into typed JSON.
 *
 * Reads ../production/{content.js,index.html,history-of-rice.html} and writes:
 *   src/i18n/{en,ar}.json            UI + section copy (content.js + index.html UX dictionaries)
 *   src/data/site.json               contact data, countries (MEDADX_DATA)
 *   src/content/products/<id>.json   product copy (EN + AR) + images/accents
 *   src/content/legal/<locale>.json  terms / privacy / rice-terms
 *   src/content/history/<locale>.json history-of-rice article
 *
 * Functions in the source dictionaries (e.g. `one: (p) => p + '% of one container'`)
 * become template strings with `{0}` placeholders — see `fmt()` in src/i18n/t.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prod = resolve(root, '../production');
const read = (f: string) => readFileSync(resolve(prod, f), 'utf8');

function write(rel: string, data: unknown) {
  const out = resolve(root, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', rel);
}

/** Replace functions with their output for positional placeholders. */
function serialize(value: unknown): unknown {
  if (typeof value === 'function') {
    const args = Array.from({ length: value.length }, (_, i) => `{${i}}`);
    return (value as (...a: string[]) => string)(...args);
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

function slice(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`markers not found: ${start} … ${end}`);
  return src.slice(a, b);
}

// --- content.js -----------------------------------------------------------
const win: Record<string, any> = {};
vm.runInNewContext(read('content.js'), { window: win });
const C = win.MEDADX_CONTENT as Record<'en' | 'ar', Record<string, any>>;
const D = win.MEDADX_DATA as Record<string, any>;

// --- index.html UX dictionaries ------------------------------------------
const indexSrc = read('index.html');
const uxSrc = slice(indexSrc, 'const UX_EN = {', 'class Component extends DCLogic');
const ux = vm.runInNewContext(`${uxSrc}; ({ en: UX_EN, ar: UX_AR })`, {}) as Record<'en' | 'ar', unknown>;

// --- history-of-rice.html dictionaries ------------------------------------
const histSrc = read('history-of-rice.html');
const histBlock = slice(histSrc, 'const en = {', 'const dict = { en, ar };');
const history = vm.runInNewContext(`(function(){ ${histBlock}; return { en, ar }; })()`, {}) as Record<'en' | 'ar', Record<string, any>>;

// --- write ------------------------------------------------------------------
const productImages: Record<string, { image: string; life: string; journeyBag: string; packImages?: Record<string, string[]> }> = {};

for (const locale of ['en', 'ar'] as const) {
  const { products, legal, ...rest } = C[locale];
  write(`src/i18n/${locale}.json`, serialize({ ...rest, ux: ux[locale] }));
  write(`src/content/legal/${locale}.json`, serialize(legal));
  write(`src/content/history/${locale}.json`, serialize(history[locale]));

  for (const p of products as any[]) {
    productImages[p.id] ??= {
      image: p.img,
      life: p.life,
      journeyBag: `assets/journey-bag-${p.id}.webp`,
      ...(p.packImages ? { packImages: p.packImages } : {}),
    };
  }
}

// About-page banner slides per product (index.html aboutHeroSlidesData).
const BANNERS: Record<string, string[]> = {
  farah: ['farah-banner'],
  khayber: ['khyber-gate-sella-banner', 'khyber-gate-banner'],
  dhoqan: ['dhoqan-banner'],
};

const en = C.en.products as any[];
const ar = C.ar.products as any[];
en.forEach((p, order) => {
  const a = ar.find((x) => x.id === p.id);
  const copy = (x: any) => ({
    name: x.name,
    desc: x.desc,
    type: x.type,
    grain: x.grain,
    aroma: x.aroma,
    origin: x.origin,
    sizes: x.sizes,
    use: x.use,
    packs: x.packs,
  });
  // Point at the PNG originals (copied from design-originals/ into src/assets/brand/);
  // astro:assets generates the WebP variants at build time.
  const brand = (src: string) => `../../assets/brand/${src.replace(/^assets\//, '').replace(/\.webp$/, '.png')}`;
  const imgs = productImages[p.id];
  write(`src/content/products/${p.id}.json`, {
    id: p.id,
    order,
    accent: p.accent,
    accent2: p.accent2,
    image: brand(imgs.image),
    life: brand(imgs.life),
    journeyBag: brand(imgs.journeyBag),
    banners: BANNERS[p.id].map((b) => brand(`${b}.png`)),
    // Keyed by the EN pack label; AR labels are matched by position in `packs`.
    packImages: Object.fromEntries(Object.entries(imgs.packImages ?? {}).map(([k, v]) => [k, v.map(brand)])),
    i18n: { en: copy(p), ar: copy(a) },
  });
});

write('src/data/site.json', D);
