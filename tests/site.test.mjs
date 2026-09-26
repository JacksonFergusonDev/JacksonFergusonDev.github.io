import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const projectRoot = path.resolve('.');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name),
      ),
    )
  ).flat();
}
const files = await walk(root);
const pages = files.filter((f) => f.endsWith('.html'));
const read = (file) => readFile(file, 'utf8');
test('every generated page has metadata and valid local navigation/assets', async () => {
  for (const page of pages) {
    const html = await read(page);
    assert.match(html, /<html lang="en"/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /name="description"/);
    assert.match(html, /rel="canonical"/);
    for (const [, value] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      if (!value.startsWith('/') || value.startsWith('//')) continue;
      const clean = decodeURIComponent(value.split(/[?#]/)[0]);
      let target = path.join(root, clean);
      if (clean.endsWith('/')) target = path.join(target, 'index.html');
      assert.ok(await stat(target).catch(() => false), `Missing ${value} linked from ${page}`);
    }
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
      assert.ok(html.includes(`id="${id}"`), `Missing anchor #${id} on ${page}`);
  }
});
test('project hierarchy and real downloads are preserved', async () => {
  const raw = await read(path.join(root, 'index.html'));
  const home = raw
    .slice(raw.indexOf('id="projects"'))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const order = [
    'Protostar',
    'Systems Audio Lab',
    'Data Science Portfolio',
    'CI/CD & Release',
    'Star Ground',
    'Git Pulsar',
    'Dark Matter',
    'Focal',
  ];
  let previous = -1;
  for (const name of order) {
    const index = home.indexOf(name);
    assert.ok(index > previous, `Project order: ${name}`);
    previous = index;
  }
  for (const href of [
    'https://protostar.jacksonferguson.me/',
    'https://github.com/JacksonFergusonDev/systems-audio-lab',
    'https://github.com/JacksonFergusonDev/data-science-portfolio',
    'https://github.com/JacksonFergusonDev/ci-cd-release-infrastructure',
    'https://github.com/JacksonFergusonDev/star-ground',
  ]) {
    assert.ok(raw.includes(`href="${href}"`), `Missing project destination ${href}`);
  }
  assert.ok(raw.includes('data-asciinema="/protostar-demo.cast"'));
  for (const file of ['jackson-ferguson-software.pdf', 'jackson-ferguson-instrumentation.pdf']) {
    const pdf = await readFile(path.join(root, 'resumes', file));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  }
});
test('remote build asset manifest feeds generated public assets', async () => {
  const manifest = JSON.parse(
    await readFile(path.join(projectRoot, 'config', 'remote-assets.json'), 'utf8'),
  );
  const ids = new Set();
  const targets = new Set();

  for (const asset of manifest.assets) {
    assert.match(asset.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(asset.id), `Duplicate remote asset id ${asset.id}`);
    ids.add(asset.id);
    assert.ok(asset.source.startsWith('https://'), `Remote asset ${asset.id} must use HTTPS`);
    assert.ok(asset.target.startsWith('public/'), `Remote asset ${asset.id} must write to public/`);
    assert.ok(!targets.has(asset.target), `Duplicate remote asset target ${asset.target}`);
    targets.add(asset.target);

    const outputPath = path.join(root, asset.target.replace(/^public\//, ''));
    const output = await readFile(outputPath);
    assert.ok(output.byteLength >= asset.minBytes, `${asset.id} output is smaller than expected`);

    const text = output.toString('utf8');
    if (asset.type === 'svg') assert.ok(text.includes('<svg'), `${asset.id} is not SVG-like`);
    if (asset.type === 'asciinema-cast') {
      const header = JSON.parse(text.split(/\r?\n/, 1)[0]);
      assert.equal(header.version, 2, `${asset.id} is not an Asciinema v2 cast`);
    }
  }

  const home = await read(path.join(root, 'index.html'));
  assert.ok(home.includes('data-asciinema="/protostar-demo.cast"'));
  assert.ok(home.includes('src="/images/protostar.svg"'));
  assert.ok(home.includes('src="/images/audio-analysis.svg"'));
  assert.ok(home.includes('src="/images/gmm-redshift-distribution.svg"'));
});
test('publishes four real photo journals', async () => {
  assert.ok(
    pages.filter((p) => p.includes('/trips/') && p !== path.join(root, 'trips/index.html'))
      .length >= 4,
  );
  const sitemap = await read(path.join(root, 'sitemap.xml'));
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, pages.length - 1);
  assert.equal((await read(path.join(root, 'CNAME'))).trim(), 'jacksonferguson.me');
  const trips = await read(path.join(root, 'trips', 'index.html'));
  assert.ok(!trips.includes('Photo journals are on their way'));
  assert.ok(trips.includes('Out of office'));
  assert.ok(trips.includes('Into the mountains.'));
  assert.ok((trips.match(/class="trip-card"/g) ?? []).length >= 4);
  assert.ok(trips.includes('/creative/'));
  assert.match(trips, /Explore creative studio, events (&amp;|&) 3D/);
  const creative = await read(path.join(root, 'creative', 'index.html'));
  assert.ok(creative.includes('/trips/'));
  assert.ok(creative.includes('Explore camping trips'));
});
test('scroll reveal transitions are preserved on landing cards', async () => {
  const css = await readFile(path.join(projectRoot, 'src', 'styles', 'global.css'), 'utf8');
  assert.match(
    css,
    /\.project-card\.landing-reveal\s*\{[^}]*opacity[^}]*transform[^}]*\}/s,
    'Expected .project-card.landing-reveal to explicitly declare opacity and transform transitions',
  );
});
test('external website links open in a new tab with noopener noreferrer', async () => {
  for (const page of pages) {
    const html = await read(page);
    for (const [linkTag] of html.matchAll(/<a\b[^>]*>/gi)) {
      const hrefMatch = linkTag.match(/href="([^"]+)"/i);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      if (href.startsWith('http://') || href.startsWith('https://')) {
        assert.match(
          linkTag,
          /target="_blank"/,
          `External link to ${href} in ${page} missing target="_blank"`,
        );
        assert.match(
          linkTag,
          /rel="[^"]*noopener[^"]*"/,
          `External link to ${href} in ${page} missing rel="noopener"`,
        );
        assert.match(
          linkTag,
          /rel="[^"]*noreferrer[^"]*"/,
          `External link to ${href} in ${page} missing rel="noreferrer"`,
        );
      }
    }
  }
});
test('every <a> containing the diagonal arrow SVG path must have target="_blank"', async () => {
  const diagonalPath = 'M5 19 19 5M5 5h14v14';
  for (const page of pages) {
    const html = await read(page);
    for (const [fullMatch, attrs, content] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      if (content.includes(diagonalPath)) {
        assert.match(
          attrs,
          /target="_blank"/i,
          `Link containing diagonal arrow in ${page} missing target="_blank": ${fullMatch.slice(0, 100)}`,
        );
      }
    }
  }
});
test('every <a> with target="_blank" must contain the diagonal arrow SVG path', async () => {
  const diagonalPath = 'M5 19 19 5M5 5h14v14';
  for (const page of pages) {
    const html = await read(page);
    for (const [fullMatch, attrs, content] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      if (!/target="_blank"/i.test(attrs)) continue;
      // Header social navigation uses dedicated service brand icons
      if (content.includes('class="service-icon"')) continue;
      // Pure media preview / diagram links wrapping an image
      if (/<img\b/.test(content)) continue;
      // Card heading titles for featured projects (which have explicit CTA action buttons below)
      if (
        content.trim() === 'Systems Audio Lab' ||
        content.trim() === 'Data Science Portfolio' ||
        content.includes('CI/CD') ||
        content.trim() === 'Star Ground'
      ) {
        continue;
      }
      assert.ok(
        content.includes(diagonalPath),
        `Link with target="_blank" in ${page} missing diagonal arrow: ${fullMatch.slice(0, 120)}`,
      );
    }
  }
});
test('agent-facing files: llms.txt, robots policy, and rel="me" profiles', async () => {
  const llms = await read(path.join(root, 'llms.txt'));
  assert.match(llms, /^# Jackson Ferguson\n\n> /);
  assert.ok(llms.includes('https://protostar.jacksonferguson.me/llms.txt'));
  assert.ok(llms.indexOf('Protostar') < llms.indexOf('Systems Audio Lab'));
  const robots = await read(path.join(root, 'robots.txt'));
  assert.match(robots, /User-agent: GPTBot[\s\S]*?Disallow: \//);
  assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*?Allow: \//);
  const home = await read(path.join(root, 'index.html'));
  assert.match(home, /href="https:\/\/github\.com\/JacksonFergusonDev"[^>]*rel="me /);
});
test('homepage exposes a schema.org profile and a share card', async () => {
  const home = await read(path.join(root, 'index.html'));
  const [, json] = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? [];
  assert.ok(json, 'Missing JSON-LD on homepage');
  const graph = JSON.parse(json)['@graph'];
  const person = graph.find((node) => node['@type'] === 'Person');
  assert.equal(person.name, 'Jackson Ferguson');
  assert.ok(!('jobTitle' in person));
  const headshot = new URL(person.image).pathname;
  assert.ok(await stat(path.join(root, headshot)).catch(() => false), `Missing ${headshot}`);
  const code = graph.filter((node) => node['@type'] === 'SoftwareSourceCode');
  assert.equal(code[0].name, 'Protostar');
  assert.match(
    home,
    /property="og:image" content="https:\/\/jacksonferguson\.me\/images\/og-card\.png"/,
  );
  assert.ok(!/engineer/i.test(home.replace(/<[^>]+>/g, ' ')), 'Homepage copy mentions engineering');
});
test('buttons and interactive controls use SVG icons instead of raw unicode symbols', async () => {
  const PSEUDO_ICONS = /[→←↑↓↗↖↘↙▶◀▲▼►◄✕✖×✓✔☰⏸⏯⏹]|&(?:rarr|larr|uarr|darr|times|check);/i;
  for (const page of pages) {
    const html = await read(page);

    const checkElement = (fullMatch, tag, inner) => {
      const textOnly = inner.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ');
      const match = textOnly.match(PSEUDO_ICONS);
      assert.ok(
        !match,
        `Found raw icon-like symbol "${match?.[0]}" in <${tag}> on ${page}. Use an SVG icon instead:\n  ${fullMatch.slice(0, 120)}`,
      );
    };

    for (const [fullMatch, inner] of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
      checkElement(fullMatch, 'button', inner);
    }
    for (const [fullMatch, inner] of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
      checkElement(fullMatch, 'a', inner);
    }
    for (const [fullMatch, inner] of html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)) {
      checkElement(fullMatch, 'summary', inner);
    }
    for (const [fullMatch, tag, inner] of html.matchAll(
      /<([a-z0-9-]+)\b[^>]*\brole=["']button["'][^>]*>([\s\S]*?)<\/\1>/gi,
    )) {
      checkElement(fullMatch, tag, inner);
    }
  }
});
test('creative index cards match the title and description within each subpage', async () => {
  const creativeHtml = await read(path.join(root, 'creative', 'index.html'));
  const cards = [
    {
      subpage: 'events',
      title: 'Live Events &amp; Sound',
      desc: 'DJing and live event production bring their own systems to understand: signal flow, routing, and the energy of a room. Photos from shows, club nights, and beach festivals.',
    },
    {
      subpage: 'blender',
      title: '3D Visuals &amp; Blender Projects',
      desc: 'I use Blender to explore atmosphere, light, and geometry, from quiet interiors to imagined cosmic scenes. Source project files are available to download.',
    },
    {
      subpage: 'python',
      title: 'Python Generative Art',
      desc: 'I use Python to turn mathematical patterns into images, from warped nebulae to chaotic attractors. Each piece includes the runnable script behind it.',
    },
  ];

  for (const card of cards) {
    const subHtml = await read(path.join(root, 'creative', card.subpage, 'index.html'));
    // Check root creative page card contains title and description
    assert.ok(
      creativeHtml.includes(card.title),
      `Root creative page missing card title: ${card.title}`,
    );
    assert.ok(
      creativeHtml.includes(card.desc),
      `Root creative page missing card description: ${card.desc}`,
    );
    // Check subpage contains matching title in h1 and description
    assert.ok(
      subHtml.includes(`<h1>${card.title}</h1>`),
      `Subpage ${card.subpage} missing <h1>${card.title}</h1>`,
    );
    assert.ok(
      subHtml.includes(card.desc),
      `Subpage ${card.subpage} missing description: ${card.desc}`,
    );
  }
});
