import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { routes } from '../lib/site';

export async function GET({ site }: APIContext) {
  const [trips, creativeEntries] = await Promise.all([
    getCollection('trips', ({ data }) => data.type === 'trip' && !data.draft),
    getCollection('creative', ({ data }) => data.type !== 'index'),
  ]);

  const creativeOrder = ['events', 'blender', 'python'];
  const sortedCreative = creativeEntries.sort(
    (a, b) => creativeOrder.indexOf(a.id) - creativeOrder.indexOf(b.id),
  );

  const paths = [
    routes.home.path,
    routes.trips.path,
    ...trips.map((p) => `${routes.trips.path}${p.id}/`),
    routes.creative.path,
    ...sortedCreative.map((c) => `${routes.creative.path}${c.id}/`),
  ];
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(new URL(path, site).href)}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
