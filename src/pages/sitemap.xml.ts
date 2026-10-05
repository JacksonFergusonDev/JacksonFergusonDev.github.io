import type { APIContext } from 'astro';
import { routes } from '../lib/site';
import { getCreativeSubpages, getTrips } from '../lib/content';
import { lastModified, newest } from '../lib/lastmod.mjs';

interface Entry {
  path: string;
  lastmod?: string;
}

export async function GET({ site }: APIContext) {
  const [trips, creativePages] = await Promise.all([getTrips(), getCreativeSubpages()]);

  // A page changes when its content file or its photos do; shared layout and CSS edits don't count.
  const tripEntries: Entry[] = trips.map((trip) => ({
    path: `${routes.trips.path}${trip.id}/`,
    lastmod: lastModified([`src/content/trips/${trip.id}.md`, `src/assets/trips/${trip.id}`]),
  }));
  const creativeEntries: Entry[] = creativePages.map((page) => ({
    path: `${routes.creative.path}${page.id}/`,
    lastmod: lastModified([`src/content/creative/${page.id}.md`, `src/assets/${page.id}`]),
  }));

  // Index pages list their children, so they change when any child or their own intro does.
  const tripsIndex = newest([
    lastModified(['src/content/trips/index.md', 'src/pages/trips/index.astro']),
    ...tripEntries.map((e) => e.lastmod),
  ]);
  const creativeIndex = newest([
    lastModified(['src/content/creative/index.md', 'src/pages/creative/index.astro']),
    ...creativeEntries.map((e) => e.lastmod),
  ]);
  const home = newest([
    lastModified(['src/pages/index.astro', 'src/lib/projects.ts']),
    tripsIndex,
    creativeIndex,
  ]);

  const entries: Entry[] = [
    { path: routes.home.path, lastmod: home },
    { path: routes.trips.path, lastmod: tripsIndex },
    ...tripEntries,
    { path: routes.creative.path, lastmod: creativeIndex },
    ...creativeEntries,
  ];

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const urls = entries.map(
    ({ path, lastmod }) =>
      `<url><loc>${escape(new URL(path, site).href)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
