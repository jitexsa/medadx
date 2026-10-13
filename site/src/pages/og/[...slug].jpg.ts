import type { APIRoute, GetStaticPaths } from 'astro';
import { ogEntries, type OgEntry } from '@/lib/og-entries';
import { renderOg } from '@/og/render';

export const getStaticPaths: GetStaticPaths = async () =>
  (await ogEntries()).map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));

export const GET: APIRoute = async ({ props }) => {
  const body = await renderOg((props as { entry: OgEntry }).entry);
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
