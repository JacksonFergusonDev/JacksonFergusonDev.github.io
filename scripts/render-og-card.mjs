// Renders the homepage social share card (public/images/og-card.png).
// Run manually with `npm run og:render` after changing the name or tagline; the PNG is committed.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve('.');
const out = path.join(root, 'public/images/og-card.png');
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

const html = `<!doctype html><html><head><style>
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
</style></head><body>
<svg class="field" viewBox="0 0 1200 630">${stars}</svg>
<div class="glow"></div>
<div class="inner">
  <div class="mark">${favicon}</div>
  <h1>Jackson<br>Ferguson<span class="accent">.</span></h1>
  <p>I build reliable systems across software, infrastructure, and hardware.</p>
  <div class="rule"></div>
  <div class="meta"><span class="url">jacksonferguson.me</span><span>VANCOUVER, BC</span></div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${path.relative(root, out)}`);
