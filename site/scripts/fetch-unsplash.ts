/**
 * Downloads the Unsplash photos the design used (HORECA tiles, CTA benefit cards)
 * into src/assets/stock/ so nothing is hot-linked at runtime. Unsplash License:
 * free to use, attribution appreciated — credits are listed on /image-credits.
 *
 *   npx tsx scripts/fetch-unsplash.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/assets/stock');
mkdirSync(outDir, { recursive: true });

// id → Unsplash photo id (from production/index.html homeVals()).
const PHOTOS: Record<string, string> = {
  'horeca-hotels': '1566073771259-6a8506099945',
  'horeca-restaurants': '1517248135467-4c7edcad34c4',
  'horeca-catering': '1555244162-803834f70033',
  'horeca-distributors': '1553413077-190dd305871c',
  'horeca-home': '1543353071-873f17a7a088',
  'cta-pricing': '1554224155-6726b3ff858f',
  'cta-supply': '1494412651409-8963ce7935a7',
  'cta-manager': '1560250097-0b93528c311a',
  'cta-delivery': '1601584115197-04ecc0da31d7',
};

const credits: { id: string; sourceUrl: string; license: string }[] = [];
for (const [id, photo] of Object.entries(PHOTOS)) {
  const out = resolve(outDir, `${id}.jpg`);
  credits.push({ id: `stock/${id}`, sourceUrl: `https://unsplash.com/photos/${photo}`, license: 'Unsplash License' });
  if (existsSync(out)) continue;
  const res = await fetch(`https://images.unsplash.com/photo-${photo}?w=1400&q=85&auto=format&fit=crop&fm=jpg`);
  if (!res.ok) throw new Error(`${res.status} for ${id}`);
  await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out);
  console.log('✓', id);
}
writeFileSync(resolve(root, 'src/content/stock-credits.json'), JSON.stringify(credits, null, 2) + '\n');
