import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const productCopy = z.object({
  name: z.string(),
  desc: z.string(),
  type: z.string(),
  grain: z.string(),
  aroma: z.string(),
  origin: z.string(),
  sizes: z.string(),
  use: z.string(),
  packs: z.array(z.string()).min(1),
});

const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: ({ image }) =>
    z.object({
      id: z.enum(['farah', 'khayber', 'dhoqan']),
      order: z.number().int(),
      accent: z.string(),
      accent2: z.string(),
      image: image(),
      life: image(),
      journeyBag: image(),
      banners: z.array(image()),
      packImages: z.record(z.string(), z.array(image())),
      i18n: z.object({ en: productCopy, ar: productCopy }),
    }),
});

const iso = z.string().regex(/^PT(\d+H)?(\d+M)?$/, 'ISO 8601 duration like PT1H30M');

const recipes = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/recipes' }),
  schema: ({ image }) =>
    z.object({
      num: z.number().int(),
      slug: z.string(),
      image: image(),
      sourceImage: z.url(),
      imageAlt: z.string(),
      standInImage: z.boolean(),
      recommendedProduct: reference('products'),
      region: z.enum(['Indian & Pakistani', 'Saudi']),
      title: z.string(),
      tagline: z.string(),
      intro: z.string(),
      cuisine: z.string(),
      course: z.string(),
      category: z.string(),
      servings: z.number().int().positive(),
      prepTime: z.string(),
      cookTime: z.string(),
      totalTime: z.string(),
      prepISO: iso,
      cookISO: iso,
      totalISO: iso,
      difficulty: z.enum(['Easy', 'Intermediate', 'Advanced']),
      rice: z.string(),
      ingredients: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
      method: z.array(z.string()).min(1),
      tips: z.array(z.string()),
      toServe: z.string(),
    }),
});

const credits = defineCollection({
  loader: file('./src/content/credits.json'),
  schema: z.object({
    id: z.string(),
    file: z.string(),
    sourceUrl: z.url(),
    artist: z.string(),
    license: z.string(),
    licenseUrl: z.url().nullable(),
    attributionRequired: z.boolean(),
    width: z.number(),
    height: z.number(),
    fetchedAt: z.string(),
  }),
});

export const collections = { products, recipes, credits };
