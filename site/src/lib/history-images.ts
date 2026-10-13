import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/history/*.jpg', { eager: true });

/** history image id (slug of the Wikimedia filename) → image metadata */
export const HISTORY_IMG: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [
    path
      .split('/')
      .pop()!
      .replace(/\.jpg$/, ''),
    mod.default,
  ]),
);

export const fileSlug = (file: string) =>
  file
    .replace(/\.[a-z]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
