// Renders the social share cards: the homepage (public/images/og-card.png) and one per trip and
// creative page (public/images/og/). Run manually with `npm run og:render` after changing the name,
// tagline, or a page's title, description, location, or date; the PNGs are committed, along with
// config/og-cards.lock.json, which records what each one was rendered from.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { digest, lockPath, ogCards } from './og-cards.mjs';

const root = path.resolve('.');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
async function render(html, out) {
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  console.log(`Wrote ${path.relative(root, out)}`);
}
await mkdir(path.join(root, 'public/images/og'), { recursive: true });
for (const { file, html } of ogCards) await render(html, path.join(root, file));
await browser.close();

const lock = Object.fromEntries(ogCards.map(({ file, html }) => [file, digest(html)]));
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, lockPath)}`);
