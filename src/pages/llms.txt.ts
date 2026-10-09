import type { APIContext } from 'astro';
import { site } from '../lib/site';
import { projects, tools } from '../lib/projects';
import { getCreativeSubpages, getTrips } from '../lib/content';

export async function GET({ site: origin }: APIContext) {
  const abs = (path: string) => new URL(path, origin).href;
  const [trips, creativePages] = await Promise.all([getTrips(), getCreativeSubpages()]);

  const link = (name: string, url: string, note: string) => `- [${name}](${url}): ${note}`;

  const body = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    'Physics & Astronomy graduate (University of Victoria, 2026) based in Vancouver, BC. Builds reliable systems across Python tooling, release infrastructure, analog circuits, and embedded data acquisition. Looking next for work where software meets physical systems: measurement, inspection, robotics, and the infrastructure that keeps them running.',
    '',
    `Contact: ${site.emailAddress} · GitHub: ${site.github} · LinkedIn: ${site.linkedin}`,
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
    '## Resumes',
    '',
    link(
      'Software Development Resume (PDF)',
      abs('/resumes/Jackson-Ferguson-Software-Resume.pdf'),
      'Software development focus: Python, developer tooling, DevOps, CI/CD, automation, and software infrastructure.',
    ),
    link(
      'Hardware–Software Systems Resume (PDF)',
      abs('/resumes/Jackson-Ferguson-Hardware-Software-Resume.pdf'),
      'Hardware–software systems focus: Software development for physical systems, including automation, embedded interfaces, test systems, data acquisition, and hardware integration.',
    ),
    '',
    '## Optional',
    '',
    ...tools.map((t) => link(t.name, t.url, t.description)),
    link('Homepage', abs('/'), 'About, full project list, and contact.'),
    ...creativePages.map((c) => link(c.data.title, abs(`/creative/${c.id}/`), c.data.description)),
    ...trips.map((t) =>
      link(t.data.title, abs(`/trips/${t.id}/`), `${t.data.location}. ${t.data.description}`),
    ),
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
