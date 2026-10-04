import type { APIContext } from 'astro';
import { routes } from '../lib/site';
import { getCreativeSubpages, getTrips } from '../lib/content';

export async function GET({ site }: APIContext) {
  const [trips, creativePages] = await Promise.all([getTrips(), getCreativeSubpages()]);

  const paths = [
    routes.home.path,
    routes.trips.path,
    ...trips.map((p) => `${routes.trips.path}${p.id}/`),
    routes.creative.path,
    ...creativePages.map((c) => `${routes.creative.path}${c.id}/`),
  ];
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(new URL(path, site).href)}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
