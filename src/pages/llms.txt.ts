import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '../lib/site';
import { projects, tools } from '../lib/projects';

type TripEntry = CollectionEntry<'trips'> & {
  data: Extract<CollectionEntry<'trips'>['data'], { type: 'trip' }>;
};

export async function GET({ site: origin }: APIContext) {
  const abs = (path: string) => new URL(path, origin).href;
  const [trips, creativeEntries] = await Promise.all([
    getCollection('trips', ({ data }) => data.type === 'trip' && !data.draft) as Promise<
      TripEntry[]
    >,
    getCollection('creative', ({ data }) => data.type !== 'index'),
  ]);

  const sortedTrips = trips.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const creativeOrder = ['events', 'blender', 'python'];
  const sortedCreative = creativeEntries.sort(
    (a, b) => creativeOrder.indexOf(a.id) - creativeOrder.indexOf(b.id),
  );

  const link = (name: string, url: string, note: string) => `- [${name}](${url}): ${note}`;

  const body = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    'Physics & Astronomy graduate (University of Victoria, 2026) based in Vancouver, BC. Builds reliable systems across Python tooling, release infrastructure, analog circuits, and embedded data acquisition. Next areas of exploration: DevOps, robotics, and physical AI.',
    '',
    `Contact: ${site.email.replace('mailto:', '')} · GitHub: ${site.github} · LinkedIn: ${site.linkedin}`,
    '',
    '## Projects',
    '',
    ...projects.map((p) =>
      link(
        p.name,
        p.url,
        [p.extra, p.description, p.url === p.repo ? '' : `Source: ${p.repo}`]
          .filter(Boolean)
          .join(' '),
      ),
    ),
    '',
    '## Résumés',
    '',
    link(
      'Software résumé (PDF)',
      abs('/resumes/jackson-ferguson-software.pdf'),
      'Software and infrastructure focus.',
    ),
    link(
      'Instrumentation résumé (PDF)',
      abs('/resumes/jackson-ferguson-instrumentation.pdf'),
      'Hardware and instrumentation focus.',
    ),
    '',
    '## Optional',
    '',
    ...tools.map((t) => link(t.name, t.url, t.description)),
    link('Homepage', abs('/'), 'About, full project list, and contact.'),
    ...sortedCreative.map((c) =>
      link(
        c.data.type !== 'index' ? c.data.title : c.id,
        abs(`/creative/${c.id}/`),
        c.data.type !== 'index' ? c.data.description : '',
      ),
    ),
    ...sortedTrips.map((t) =>
      link(t.data.title, abs(`/trips/${t.id}/`), `${t.data.location}. ${t.data.description}`),
    ),
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
