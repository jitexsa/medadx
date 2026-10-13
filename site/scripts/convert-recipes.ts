/**
 * One-time port of ../production/recipes-data.js into one JSON file per recipe
 * (src/content/recipes/<slug>.json). Photos are downloaded separately by
 * scripts/fetch-wikimedia.ts, which reads `sourceImage` from these files.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win: Record<string, any> = {};
vm.runInNewContext(readFileSync(resolve(root, '../production/recipes-data.js'), 'utf8'), { window: win });
const recipes = win.MEDADX_RECIPES as Record<string, any>[];

// Photos that show a different dish than the recipe (flagged for the client).
const STAND_IN = new Set(['lamb-kabsa', 'lamb-mandi', 'mathloutha', 'saleeg', 'zurbian']);

// Default product match, from each product's "best use" copy. Client to confirm.
const PRODUCT: Record<string, 'farah' | 'khayber' | 'dhoqan'> = {};
for (const r of recipes) {
  const s = r.slug as string;
  if (/biryani|kabsa|mandi|madfoon|madghout|mathloutha|bukhari|zurbian/.test(s)) PRODUCT[s] = 'farah';
  else if (/pulao|tahiri|saleeg|zarda/.test(s)) PRODUCT[s] = 'khayber';
  else PRODUCT[s] = 'dhoqan';
}

const outDir = resolve(root, 'src/content/recipes');
mkdirSync(outDir, { recursive: true });

for (const r of recipes) {
  const { image, ...rest } = r;
  const data = {
    ...rest,
    image: `../../assets/recipes/${r.slug}.jpg`,
    sourceImage: String(image).replace(/\?width=\d+$/, ''),
    standInImage: STAND_IN.has(r.slug),
    recommendedProduct: PRODUCT[r.slug],
  };
  writeFileSync(resolve(outDir, `${r.slug}.json`), JSON.stringify(data, null, 2) + '\n');
}
console.log(`wrote ${recipes.length} recipes to src/content/recipes/`);
