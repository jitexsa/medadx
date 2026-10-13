/**
 * Generates favicons + PWA icons from the logo mark:
 *   public/favicon.ico (16+32), public/icons/icon-{192,512}.png, maskable-512.png,
 *   apple-touch-icon.png (180, opaque — iOS renders transparency as black).
 *   npm run icons
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'src/assets/brand/logo-mark.png');
const out = (p: string) => resolve(root, 'public', p);
const CREAM = { r: 245, g: 240, b: 228, alpha: 1 };

const square = (size: number, pad = 0, bg?: typeof CREAM) =>
  sharp(src)
    .resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten(bg ? { background: bg } : false)
    .png({ compressionLevel: 9 })
    .toBuffer();

await sharp(await square(192)).toFile(out('icons/icon-192.png'));
await sharp(await square(512)).toFile(out('icons/icon-512.png'));
await sharp(await square(512, 64, CREAM)).toFile(out('icons/maskable-512.png'));
await sharp(await square(180, 14, CREAM)).toFile(out('icons/apple-touch-icon.png'));

// ICO container holding PNG images (supported by every current browser).
const pngs = await Promise.all([16, 32, 48].map((s) => square(s)));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const size = [16, 32, 48][i]!;
  const e = 6 + i * 16;
  header.writeUInt8(size, e);
  header.writeUInt8(size, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(out('favicon.ico'), Buffer.concat([header, ...pngs]));
console.log('icons written');
