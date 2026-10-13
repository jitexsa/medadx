import { getImage } from 'astro:assets';
import type { Locale } from '@/i18n';
import type { FormProduct } from '@/islands/QuoteForm';
import { getProducts, productCopy } from './catalog';

/** Product data + optimized bag images for the form islands. */
export async function formProducts(locale: Locale): Promise<FormProduct[]> {
  return Promise.all(
    (await getProducts()).map(async (p) => {
      const c = productCopy(p, locale);
      const packBags: Record<string, string> = {};
      for (const [i, label] of p.i18n.en.packs.entries()) {
        const src = p.packImages[label]?.[0];
        if (src) packBags[String(i)] = (await getImage({ src, height: 240, format: 'webp' })).src;
      }
      return {
        id: p.id,
        name: c.name,
        short: c.short,
        type: c.type,
        packs: c.packs,
        bag: (await getImage({ src: p.journeyBag, height: 240, format: 'webp' })).src,
        packBags,
      };
    }),
  );
}
