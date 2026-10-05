// Renders the social share cards: the homepage (public/images/og-card.png) and one per trip and
// creative page (public/images/og/). Run manually with `npm run og:render` after changing the name,
// tagline, or a page's title, description, location, or date; the PNGs are committed.
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve('.');
const outDir = path.join(root, 'public/images/og');
const font = (file) =>
  readFile(path.join(root, 'node_modules/house-style/fonts', file)).then((b) =>
    b.toString('base64'),
  );
const [sans400, sans700, mono400, favicon] = await Promise.all([
  font('dm-sans-latin-400-normal.woff2'),
  font('dm-sans-latin-700-normal.woff2'),
  font('jetbrains-mono-latin-400-normal.woff2'),
  readFile(path.join(root, 'public/favicon.svg'), 'utf8'),
]);

// Deterministic star field so re-renders are byte-stable.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const stars = Array.from({ length: 140 }, () => {
  const x = 560 + rand() * 640;
  const y = rand() * 630;
  const r = rand() < 0.08 ? 1.6 : 0.5 + rand() * 0.7;
  const cyan = rand() < 0.12;
  const o = (0.15 + rand() * 0.5 * ((x - 560) / 640)).toFixed(2);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${cyan ? '#22d3ee' : '#e8edef'}" opacity="${o}"/>`;
}).join('');

const styles = `
@font-face { font-family: 'DM Sans'; font-weight: 400; src: url(data:font/woff2;base64,${sans400}) format('woff2'); }
@font-face { font-family: 'DM Sans'; font-weight: 700; src: url(data:font/woff2;base64,${sans700}) format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 400; src: url(data:font/woff2;base64,${mono400}) format('woff2'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0a0c0e; color: #e8edef; font-family: 'DM Sans'; position: relative; overflow: hidden; }
.field { position: absolute; inset: 0; }
.glow { position: absolute; right: -180px; top: -160px; width: 720px; height: 720px; border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.10), rgba(34, 211, 238, 0) 65%); }
.inner { position: absolute; inset: 72px 80px; display: flex; flex-direction: column; }
.mark { width: 56px; height: 56px; }
.mark svg { width: 100%; height: 100%; }
h1 { margin-top: auto; font-size: 112px; font-weight: 700; line-height: 0.95; letter-spacing: -0.035em; }
h1 .accent { color: #22d3ee; }
p { margin-top: 28px; font-size: 32px; line-height: 1.3; color: #939da6; max-width: 760px; }
.rule { margin-top: 44px; height: 1px; background: #252c31; }
.meta { margin-top: 20px; display: flex; justify-content: space-between; font-family: 'JetBrains Mono'; font-size: 19px; letter-spacing: 0.08em; color: #939da6; }
.meta .url { color: #22d3ee; }

.eyebrow { font-family: 'JetBrains Mono'; font-size: 21px; letter-spacing: 0.08em; text-transform: uppercase; color: #22d3ee; }
h1.page { margin-top: 20px; font-size: 76px; line-height: 1.02; max-width: 1000px; }
p.page { margin-top: 24px; font-size: 28px; max-width: 960px; }
.spacer { margin-top: auto; }
`;

const shell = (body) => `<!doctype html><html><head><style>${styles}</style></head><body>
<svg class="field" viewBox="0 0 1200 630">${stars}</svg>
<div class="glow"></div>
<div class="inner">
  <div class="mark">${favicon}</div>
${body}
</div>
</body></html>`;

// Long descriptions would overflow the card, and the first sentence carries the point.
const firstSentence = (text) => text.split(/(?<=[.!?])\s/)[0];
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const homepage = shell(`  <h1>Jackson<br>Ferguson<span class="accent">.</span></h1>
  <p>I build reliable systems across software, infrastructure, and hardware.</p>
  <div class="rule"></div>
  <div class="meta"><span class="url">jacksonferguson.me</span><span>VANCOUVER, BC</span></div>`);

const pageCard = ({ eyebrow, title, description, url, section }) =>
  shell(`  <div class="spacer"></div>
  <div class="eyebrow">${escape(eyebrow)}</div>
  <h1 class="page">${escape(title)}<span class="accent">.</span></h1>
  <p class="page">${escape(firstSentence(description))}</p>
  <div class="rule"></div>
  <div class="meta"><span class="url">${url}</span><span>${section}</span></div>`);

// Top-level `key: 'value'` lines of a content file's frontmatter; enough for titles and dates.
async function frontmatter(file) {
  const text = await readFile(file, 'utf8');
  const block = text.split(/^---$/m)[1] ?? '';
  const fields = {};
  for (const [, key, value] of block.matchAll(/^(\w+): '((?:[^']|'')*)'\s*$/gm))
    fields[key] = value.replace(/''/g, "'");
  fields.year = block.match(/^date: (\d{4})/m)?.[1];
  return fields;
}

const cards = [
  {
    file: 'trips.png',
    eyebrow: 'Beyond the terminal',
    title: 'Camping Trips',
    description: 'Photos from the mountains, coastlines, and campsites beyond the terminal.',
    url: 'jacksonferguson.me/trips',
    section: 'TRIPS',
  },
  {
    file: 'creative.png',
    eyebrow: 'Beyond the codebase',
    title: 'Creative & Field Archives',
    description: 'Live event sound, 3D simulations in Blender, and algorithmic art in Python.',
    url: 'jacksonferguson.me/creative',
    section: 'CREATIVE',
  },
];
for (const name of (await readdir(path.join(root, 'src/content/trips'))).sort()) {
  const data = await frontmatter(path.join(root, 'src/content/trips', name));
  if (data.location === undefined) continue; // the index entry has no location
  const id = name.replace(/\.md$/, '');
  cards.push({
    file: `trips-${id}.png`,
    eyebrow: `${data.location} / ${data.dateLabel ?? data.year}`,
    title: data.title,
    description: data.description,
    url: `jacksonferguson.me/trips/${id}`,
    section: 'TRIPS',
  });
}
for (const id of ['events', 'blender', 'python']) {
  const data = await frontmatter(path.join(root, 'src/content/creative', `${id}.md`));
  cards.push({
    file: `creative-${id}.png`,
    eyebrow: data.eyebrow,
    title: data.title,
    description: data.description,
    url: `jacksonferguson.me/creative/${id}`,
    section: 'CREATIVE',
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
async function render(html, out) {
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  console.log(`Wrote ${path.relative(root, out)}`);
}
await mkdir(outDir, { recursive: true });
await render(homepage, path.join(root, 'public/images/og-card.png'));
for (const { file, ...card } of cards) await render(pageCard(card), path.join(outDir, file));
await browser.close();
