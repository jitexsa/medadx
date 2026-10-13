// Minimal static server for tests: serves dist/ like Vercel (cleanUrls, 404.html, brotli).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const root = new URL('../../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4322);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};
const brCache = new Map(); // compressed once per file — the server is single-threaded
const isFile = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false;

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const clean = normalize(decodeURIComponent(url.pathname)).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const c of candidates) {
    const p = join(root, c);
    if (p.startsWith(root) && (await isFile(p))) {
      const type = TYPES[extname(p)] ?? 'application/octet-stream';
      let body = await readFile(p);
      const headers = { 'Content-Type': type };
      // Compress text like Vercel does (brotli), so Lighthouse measures realistic transfer sizes.
      if (/text|javascript|json|xml|svg|manifest/.test(type) && /br/.test(req.headers['accept-encoding'] ?? '')) {
        let br = brCache.get(p);
        if (!br) brCache.set(p, (br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })));
        body = br;
        headers['Content-Encoding'] = 'br';
      }
      res.writeHead(200, headers);
      return res.end(body);
    }
  }
  res.writeHead(404, { 'Content-Type': TYPES['.html'] });
  res.end(await readFile(join(root, '404.html')));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
