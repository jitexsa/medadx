/**
 * Social-share (Open Graph) image renderer: satori (layout → SVG) + sharp (SVG → JPEG).
 * 1200×630 JPEG, because LinkedIn and some WhatsApp/Facebook crawlers reject WebP.
 * Runs at build time only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import type { OgEntry } from '@/lib/og-entries';

const W = 1200;
const H = 630;
const root = process.cwd();
const fsrc = (pkg: string, file: string) => readFileSync(resolve(root, 'node_modules', pkg, 'files', file));

let fonts: Parameters<typeof satori>[1]['fonts'] | null = null;
function loadFonts() {
  fonts ??= [
    {
      name: 'Cormorant',
      data: fsrc('@fontsource/cormorant-garamond', 'cormorant-garamond-latin-700-normal.woff'),
      weight: 700,
      style: 'normal',
    },
    { name: 'Plex', data: fsrc('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Plex', data: fsrc('@fontsource/ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Mono', data: fsrc('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Archivo', data: fsrc('@fontsource/archivo', 'archivo-latin-800-normal.woff'), weight: 800, style: 'normal' },
    {
      name: 'PlexAr',
      data: fsrc('@fontsource/ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'PlexAr',
      data: fsrc('@fontsource/ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-700-normal.woff'),
      weight: 700,
      style: 'normal',
    },
  ];
  return fonts;
}

const imgCache = new Map<string, string>();
/** Read + downscale an image from src/assets and return a data URI for satori. */
async function img(rel: string, width: number, height?: number, fit: 'cover' | 'inside' = 'inside') {
  const key = `${rel}|${width}|${height}|${fit}`;
  const hit = imgCache.get(key);
  if (hit) return hit;
  const buf = await sharp(resolve(root, 'src/assets', rel))
    .resize({ width, height, fit, position: 'attention', withoutEnlargement: false })
    .png()
    .toBuffer();
  const uri = `data:image/png;base64,${buf.toString('base64')}`;
  imgCache.set(key, uri);
  return uri;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown; style?: Record<string, unknown> } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children, ...extra },
});

const C = {
  green: '#1F3D2A',
  deep: '#0F2116',
  gold: '#C9A24B',
  goldDark: '#A67F2E',
  cream: '#F3ECD6',
  bg: '#F5F0E4',
};
const ACCENT: Record<string, [string, string]> = {
  farah: ['#1F5B3C', '#C29A45'],
  khayber: ['#B23A26', '#1F5B3C'],
  dhoqan: ['#1D6DA1', '#20303F'],
};

const fontFor = (locale: string, latin: string) => (locale === 'ar' ? `PlexAr, ${latin}` : latin);
const clampText = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

/** satori mis-positions `row-reverse` inside padded boxes, so RTL layouts reverse the child order instead. */
const rtlOrder = <T>(rtl: boolean, kids: T[]) => (rtl ? [...kids].reverse() : kids);

function diamond(size: number, color: string) {
  return h('div', { width: size, height: size, background: color, transform: 'rotate(45deg)' });
}

async function brandRow(light: boolean, locale: string) {
  const mark = await img('brand/logo-mark.png', 120);
  return h('div', { alignItems: 'center', gap: 16, flexDirection: locale === 'ar' ? 'row-reverse' : 'row' }, [
    { type: 'img', props: { src: mark, width: 56, height: 59 } },
    h('div', { flexDirection: 'column', gap: 4, alignItems: locale === 'ar' ? 'flex-end' : 'flex-start' }, [
      h('div', { fontFamily: 'Archivo', fontSize: 28, letterSpacing: 2, color: light ? C.cream : C.green }, 'MEDADX'),
      h(
        'div',
        {
          fontFamily: fontFor(locale, 'Mono'),
          fontSize: 14,
          letterSpacing: locale === 'ar' ? 0 : 3,
          color: light ? 'rgba(243,236,214,.65)' : 'rgba(30,38,25,.6)',
        },
        locale === 'ar' ? 'medadx.com · مجموعة أرسان العالمية' : 'MEDADX.COM · ARSAN GLOBAL GROUP',
      ),
    ]),
  ]);
}

function kickerRow(text: string, locale: string, color = C.gold) {
  return h('div', { alignItems: 'center', gap: 14, flexDirection: locale === 'ar' ? 'row-reverse' : 'row' }, [
    diamond(12, color),
    h(
      'div',
      { fontFamily: fontFor(locale, 'Mono'), fontSize: 20, letterSpacing: locale === 'ar' ? 0 : 4, textTransform: 'uppercase', color },
      text,
    ),
  ]);
}

async function pageCard(e: Extract<OgEntry, { kind: 'page' }>): Promise<Node> {
  const rtl = e.locale === 'ar';
  const colW = e.bags ? 640 : 1072;
  const align = rtl ? 'right' : 'left';
  const bagNodes = e.bags
    ? await Promise.all(
        e.bags.map(async (id, i) =>
          h('div', { marginLeft: i ? -46 : 0, marginTop: i === 1 ? 0 : 50, flexShrink: 0 }, [
            {
              type: 'img',
              props: {
                src: await img(`brand/journey-bag-${id}.png`, 200),
                width: 160,
                height: i === 1 ? 280 : 240,
                style: { objectFit: 'contain' },
              },
            },
          ]),
        ),
      )
    : null;
  const text = h(
    'div',
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: colW,
      height: H - 128,
      flexShrink: 0,
      alignItems: rtl ? 'flex-end' : 'flex-start',
    },
    [
      kickerRow(e.kicker, e.locale),
      h('div', { flexDirection: 'column', gap: 18, width: colW }, [
        h(
          'div',
          {
            display: 'block',
            width: colW,
            fontFamily: fontFor(e.locale, 'Cormorant'),
            fontSize: e.title.length > 60 ? 56 : 68,
            lineHeight: 1.05,
            color: C.cream,
            textAlign: align,
          },
          clampText(e.title, 90),
        ),
        e.sub
          ? h(
              'div',
              {
                display: 'block',
                width: colW,
                fontFamily: fontFor(e.locale, 'Plex'),
                fontSize: 24,
                lineHeight: 1.45,
                color: 'rgba(243,236,214,.78)',
                textAlign: align,
              },
              clampText(e.sub, 130),
            )
          : h('div', {}, ''),
      ]),
      await brandRow(true, e.locale),
    ],
  );
  const visual = bagNodes
    ? h('div', { alignItems: 'center', justifyContent: 'center', width: 400, height: H - 128, flexShrink: 0, overflow: 'hidden' }, bagNodes)
    : null;
  return h(
    'div',
    {
      width: W,
      height: H,
      background: `radial-gradient(circle at ${rtl ? '15%' : '85%'} 20%, rgba(201,162,75,.28), rgba(15,33,22,0) 55%), linear-gradient(135deg, #16301F, ${C.green})`,
      padding: 64,
      gap: 32,
      color: C.cream,
    },
    visual ? rtlOrder(rtl, [text, visual]) : [text],
  );
}

async function productCard(e: Extract<OgEntry, { kind: 'product' }>): Promise<Node> {
  const rtl = e.locale === 'ar';
  const [a1, a2] = ACCENT[e.id] ?? [C.green, C.gold];
  const bag = await img(`brand/journey-bag-${e.id}.png`, 420);
  return h('div', { width: W, height: H, background: C.bg, flexDirection: rtl ? 'row-reverse' : 'row' }, [
    h(
      'div',
      {
        width: 520,
        height: H,
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 45%, ${a1}, ${a2})`,
      },
      [{ type: 'img', props: { src: bag, width: 360, height: 500, style: { objectFit: 'contain' } } }],
    ),
    h(
      'div',
      {
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 680,
        flexShrink: 0,
        padding: 56,
        alignItems: rtl ? 'flex-end' : 'flex-start',
      },
      [
        h('div', { alignItems: 'center', gap: 12, flexDirection: rtl ? 'row-reverse' : 'row' }, [
          h('div', { width: 14, height: 14, borderRadius: 7, background: a1 }),
          h(
            'div',
            {
              fontFamily: fontFor(e.locale, 'Mono'),
              fontSize: 20,
              letterSpacing: rtl ? 0 : 3,
              color: 'rgba(30,38,25,.6)',
              textTransform: 'uppercase',
            },
            e.type,
          ),
        ]),
        h('div', { flexDirection: 'column', gap: 18, width: '100%', alignItems: rtl ? 'flex-end' : 'flex-start' }, [
          h(
            'div',
            {
              fontFamily: fontFor(e.locale, 'Cormorant'),
              fontSize: 58,
              lineHeight: 1.05,
              color: '#1E2619',
              width: '100%',
              justifyContent: rtl ? 'flex-end' : 'flex-start',
              textAlign: rtl ? 'right' : 'left',
            },
            e.name,
          ),
          h(
            'div',
            {
              fontFamily: fontFor(e.locale, 'Plex'),
              fontSize: 22,
              color: 'rgba(30,38,25,.7)',
              width: '100%',
              justifyContent: rtl ? 'flex-end' : 'flex-start',
              textAlign: rtl ? 'right' : 'left',
            },
            e.meta,
          ),
          h(
            'div',
            { gap: 10, flexWrap: 'wrap', flexDirection: rtl ? 'row-reverse' : 'row' },
            e.packs.map((p) =>
              h(
                'div',
                {
                  border: `2px solid ${a1}`,
                  color: a1,
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontFamily: fontFor(e.locale, 'Plex'),
                  fontSize: 20,
                  fontWeight: 600,
                },
                p,
              ),
            ),
          ),
        ]),
        await brandRow(false, e.locale),
      ],
    ),
  ]);
}

async function recipeCard(e: Extract<OgEntry, { kind: 'recipe' }>): Promise<Node> {
  const photo = await img(`recipes/${e.recipe}.jpg`, W, H, 'cover');
  const mark = await img('brand/logo-mark.png', 100);
  return h('div', { width: W, height: H, position: 'relative' }, [
    { type: 'img', props: { src: photo, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover' } } },
    h('div', {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: H,
      background: 'linear-gradient(180deg, rgba(13,31,20,0) 35%, rgba(13,31,20,.92) 100%)',
    }),
    h(
      'div',
      {
        position: 'absolute',
        top: 40,
        left: 48,
        alignItems: 'center',
        gap: 12,
        background: 'rgba(15,33,22,.82)',
        borderRadius: 999,
        padding: '10px 20px 10px 12px',
      },
      [
        { type: 'img', props: { src: mark, width: 34, height: 36 } },
        h('div', { fontFamily: 'Mono', fontSize: 17, letterSpacing: 3, color: C.cream }, 'MEDAD-X KITCHEN · RECIPE'),
      ],
    ),
    h('div', { position: 'absolute', left: 56, right: 56, bottom: 44, flexDirection: 'column', gap: 14 }, [
      h('div', { fontFamily: 'Archivo', fontSize: e.title.length > 28 ? 62 : 74, lineHeight: 1, color: '#FCFAF3' }, e.title),
      h('div', { justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }, [
        h('div', { fontFamily: 'Plex', fontSize: 24, fontWeight: 600, color: '#E8CE84' }, e.meta),
        h(
          'div',
          { fontFamily: 'Plex', fontSize: 14, color: 'rgba(252,250,243,.6)', maxWidth: 420, textAlign: 'right' },
          clampText(e.credit, 70),
        ),
      ]),
    ]),
  ]);
}

async function articleCard(e: Extract<OgEntry, { kind: 'article' }>): Promise<Node> {
  const rtl = e.locale === 'ar';
  const plate = await img('history/koeh-232.jpg', 360);
  return h(
    'div',
    { width: W, height: H, background: 'linear-gradient(#F4ECD8, #EEE2C7)', padding: 60, gap: 56, flexDirection: 'row' },
    rtlOrder(rtl, [
      h('div', { background: '#EFE7CE', border: '1px solid rgba(35,32,26,.16)', borderRadius: 18, padding: 14 }, [
        {
          type: 'img',
          props: { src: plate, width: 300, height: 480, style: { objectFit: 'cover', borderRadius: 10, filter: 'sepia(.3)' } },
        },
      ]),
      h(
        'div',
        {
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 700,
          flexShrink: 0,
          alignItems: rtl ? 'flex-end' : 'flex-start',
        },
        [
          kickerRow(e.kicker, e.locale, C.goldDark),
          h('div', { flexDirection: 'column', gap: 22, width: '100%', alignItems: rtl ? 'flex-end' : 'flex-start' }, [
            h(
              'div',
              {
                fontFamily: fontFor(e.locale, 'Archivo'),
                fontSize: 84,
                lineHeight: 0.98,
                color: C.green,
                width: '100%',
                justifyContent: rtl ? 'flex-end' : 'flex-start',
                textAlign: rtl ? 'right' : 'left',
              },
              e.title,
            ),
            h(
              'div',
              {
                fontFamily: fontFor(e.locale, 'Plex'),
                fontSize: 24,
                lineHeight: 1.5,
                color: '#3A3427',
                width: '100%',
                justifyContent: rtl ? 'flex-end' : 'flex-start',
                textAlign: rtl ? 'right' : 'left',
              },
              clampText(e.sub, 150),
            ),
          ]),
          await brandRow(false, e.locale),
        ],
      ),
    ]),
  );
}

async function collageCard(e: Extract<OgEntry, { kind: 'collage' }>): Promise<Node> {
  const photos = await Promise.all(e.recipes.map((r) => img(`recipes/${r}.jpg`, 400, 630, 'cover')));
  return h('div', { width: W, height: H, position: 'relative' }, [
    h(
      'div',
      { position: 'absolute', top: 0, left: 0, width: W, height: H },
      photos.map((p) => ({ type: 'img', props: { src: p, width: 400, height: H, style: { objectFit: 'cover' } } })),
    ),
    h('div', {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: H,
      background: 'linear-gradient(180deg, rgba(13,31,20,.2) 0%, rgba(13,31,20,.92) 75%)',
    }),
    h('div', { position: 'absolute', left: 60, right: 60, bottom: 52, flexDirection: 'column', gap: 16 }, [
      kickerRow(e.kicker, 'en', '#E8CE84'),
      h('div', { fontFamily: 'Archivo', fontSize: 76, lineHeight: 1, color: '#FCFAF3' }, e.title),
      h('div', { fontFamily: 'Plex', fontSize: 26, color: 'rgba(252,250,243,.85)' }, e.sub),
    ]),
  ]);
}

export async function renderOg(e: OgEntry): Promise<Buffer> {
  const tree =
    e.kind === 'product'
      ? await productCard(e)
      : e.kind === 'recipe'
        ? await recipeCard(e)
        : e.kind === 'article'
          ? await articleCard(e)
          : e.kind === 'collage'
            ? await collageCard(e)
            : await pageCard(e);
  const svg = await satori(tree as never, { width: W, height: H, fonts: loadFonts() });
  return sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();
}
