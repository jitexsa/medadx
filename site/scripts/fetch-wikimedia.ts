/**
 * Downloads every Wikimedia image the site uses into src/assets/ (so nothing is
 * hot-linked at runtime) and records author + licence in src/content/credits.json.
 *
 *   npm run content:images            # fetch missing files only
 *   npm run content:images -- --force # re-download everything
 *
 * Follows the Wikimedia User-Agent policy and throttles to ~1 request/second.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const UA = 'MedadX-site-build/1.0 (https://medadx.com; info@medadx.com)';
const LICENCE_OK = /^(cc0|public domain|pd\b|cc by(-sa)? \d(\.\d)?|cc by(-sa)?$)/i;

type Source = { id: string; file: string; out: string };

const slug = (s: string) =>
  s
    .replace(/\.[a-z]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// --- sources ------------------------------------------------------------------
const sources: Source[] = [];

const recipeDir = resolve(root, 'src/content/recipes');
for (const f of readdirSync(recipeDir).filter((f) => f.endsWith('.json'))) {
  const r = JSON.parse(readFileSync(resolve(recipeDir, f), 'utf8'));
  const file = decodeURIComponent(r.sourceImage.split('Special:FilePath/')[1]);
  sources.push({ id: `recipes/${r.slug}`, file, out: `src/assets/recipes/${r.slug}.jpg` });
}

const HISTORY_FILES = [
  'Koeh-232.jpg',
  'Terrace_field_yunnan_china_denoised.jpg',
  'Banaue-terrace.JPG',
  'Reis.jpg',
  'Brown_rice.jpg',
  'White,_Brown,_Red_&_Wild_rice.jpg',
  'Rice_plants.jpg',
  'Paddy_field.jpg',
  'Rice_drying.jpg',
  'Cooked_rice.jpg',
  'Golden_Rice.jpg',
  'Basmati_Rice.jpg',
  'White_rice.jpg',
  'Black_rice.jpg',
];
for (const file of HISTORY_FILES) {
  sources.push({ id: `history/${slug(file)}`, file, out: `src/assets/history/${slug(file)}.jpg` });
}

// --- helpers --------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s = '') =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function imageInfo(file: string) {
  for (const host of ['commons.wikimedia.org', 'en.wikipedia.org']) {
    const url =
      `https://${host}/w/api.php?action=query&format=json&prop=imageinfo` +
      `&iiprop=url|size|mime|extmetadata&iiurlwidth=1600` +
      `&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|AttributionRequired|Credit` +
      `&titles=${encodeURIComponent('File:' + file)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${host} ${res.status} for ${file}`);
    const page: any = Object.values((await res.json()).query.pages)[0];
    if (page?.imageinfo?.[0]) return page.imageinfo[0];
    await sleep(1000);
  }
  throw new Error(`not found on Commons or en.wikipedia: ${file}`);
}

// --- run ------------------------------------------------------------------------
const creditsPath = resolve(root, 'src/content/credits.json');
const existing: any[] = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : [];
const credits = new Map(existing.map((c) => [c.id, c]));

for (const s of sources) {
  const out = resolve(root, s.out);
  if (!force && existsSync(out) && credits.has(s.id)) continue;

  const info = await imageInfo(s.file);
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value) || 'Unknown';
  if (!LICENCE_OK.test(license)) throw new Error(`licence not allowed for ${s.file}: ${license}`);

  await sleep(1000);
  const img = await fetch(info.thumburl ?? info.url, { headers: { 'User-Agent': UA } });
  if (!img.ok) throw new Error(`download ${img.status} for ${s.file}`);
  mkdirSync(dirname(out), { recursive: true });
  // Re-encode: auto-orient, cap at 1600px, drop EXIF/GPS metadata.
  await sharp(Buffer.from(await img.arrayBuffer()))
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out);

  credits.set(s.id, {
    id: s.id,
    file: s.file,
    sourceUrl: info.descriptionurl,
    artist: stripHtml(meta.Artist?.value) || 'Unknown',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    attributionRequired: meta.AttributionRequired?.value === 'true',
    width: info.width,
    height: info.height,
    fetchedAt: new Date().toISOString().slice(0, 10),
  });
  console.log(`✓ ${s.id}  (${license}, ${stripHtml(meta.Artist?.value).slice(0, 40)})`);
  await sleep(1000);
}

const sorted = [...credits.values()].sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(creditsPath, JSON.stringify(sorted, null, 2) + '\n');
console.log(`credits: ${sorted.length} entries`);
