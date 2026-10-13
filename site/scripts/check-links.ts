// Internal link check over dist/: every href/src/srcset (and absolute https://medadx.com URLs in
// canonical, hreflang and og:image) must resolve the way Vercel cleanUrls does — path, path.html or
// path/index.html (same order as tests/e2e/serve.mjs). Same-site #fragments must match an id.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://medadx.com';
const ATTR_RE = /\s(href|src|srcset|content)="([^"]*)"/g;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const isFile = async (p: string) => (await stat(p).catch(() => null))?.isFile() ?? false;

const resolved = new Map<string, string | null>();
async function resolvePath(pathname: string): Promise<string | null> {
  if (resolved.has(pathname)) return resolved.get(pathname)!;
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean, `${clean}.html`, `${clean}/index.html`];
  let hit: string | null = null;
  for (const c of candidates) {
    const p = join(ROOT, c);
    if (p.startsWith(ROOT) && (await isFile(p))) {
      hit = p;
      break;
    }
  }
  resolved.set(pathname, hit);
  return hit;
}

const idCache = new Map<string, Set<string>>();
async function idsOf(file: string): Promise<Set<string>> {
  let ids = idCache.get(file);
  if (!ids) {
    const html = await readFile(file, 'utf8');
    ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
    idCache.set(file, ids);
  }
  return ids;
}

/** Candidate URLs in one attribute; `content` only counts when it is an absolute same-site URL. */
function urlsIn(attr: string, value: string): string[] {
  const v = decode(value).trim();
  if (attr === 'srcset')
    return v
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0]!)
      .filter(Boolean);
  if (attr === 'content') return v.startsWith(`${SITE}/`) || v === SITE ? [v] : [];
  return v ? [v] : [];
}

const pages = await walk(ROOT);
const broken: string[] = [];
let checked = 0;

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const pageUrl = new URL(`/${relative(ROOT, page).split(sep).join('/')}`.replace(/(index)?\.html$/, ''), SITE);
  for (const [, attr, value] of html.matchAll(ATTR_RE)) {
    for (const raw of urlsIn(attr!, value!)) {
      if (/^(mailto|tel|data|javascript|sms|whatsapp):/i.test(raw)) continue;
      let url: URL;
      try {
        url = new URL(raw, pageUrl);
      } catch {
        broken.push(`${relative(ROOT, page)}: unparseable ${raw}`);
        continue;
      }
      if (url.origin !== SITE) continue; // external — not checked here
      checked++;
      const target = await resolvePath(url.pathname);
      if (!target) {
        broken.push(`${relative(ROOT, page)}: ${raw}`);
        continue;
      }
      // Fragments: skip legacy hash routes (#/about) — they are handled by script, not ids.
      const frag = url.hash.slice(1);
      if (frag && !frag.startsWith('/') && target.endsWith('.html') && !(await idsOf(target)).has(decodeURIComponent(frag))) {
        broken.push(`${relative(ROOT, page)}: ${raw} (missing #${frag})`);
      }
    }
  }
}

if (broken.length) {
  console.error([...new Set(broken)].join('\n'));
  console.error(`\n✗ ${broken.length} broken internal links (${checked} checked across ${pages.length} pages)`);
  process.exit(1);
}
console.log(`✓ ${checked} internal links OK across ${pages.length} pages`);
