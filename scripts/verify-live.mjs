// Checks the live site after a deployment and once a day: HTTPS with a certificate that is not
// about to expire, the HTTP redirect, every page in the sitemap, every asset those pages load,
// and the custom 404 page. With EXPECTED_COMMIT set, it first waits for the CDN to serve that
// build on every page. GitHub Pages caches pages for up to ten minutes, so a deployment that
// finished is not yet what visitors see. Uses only Node built-ins, so CI needs no npm install.
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';
import { withRetries } from './retry.mjs';

const pollIntervalMs = 30_000;
const waitLimitMs = 15 * 60_000;
const certificateMinDays = 14;
const userAgent = 'jackson-ferguson-portfolio-verify';

export const buildCommit = (html) =>
  html.match(/<meta name="build-commit" content="([a-f0-9]{40})"/)?.[1] ?? null;

// Same-origin paths a page loads or links to: src, href, and every srcset candidate.
export function localReferences(html, pageUrl) {
  const values = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(([, value]) => value);
  for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g))
    values.push(...srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]));
  const urls = new Set();
  for (const value of values) {
    const url = new URL(value.replace(/&amp;/g, '&'), pageUrl);
    url.hash = '';
    if (url.origin === new URL(pageUrl).origin) urls.add(url.href);
  }
  return [...urls];
}

// Polls until every URL serves the expected commit, and returns how many polls that took.
export async function waitForCommit(urls, expected, options = {}) {
  const {
    fetchText,
    interval = pollIntervalMs,
    limit = waitLimitMs,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    log = console.log,
  } = options;
  const deadline = now() + limit;
  let pending = [...urls];
  for (let poll = 1; ; poll += 1) {
    const served = await Promise.all(pending.map(async (url) => [url, await fetchText(url)]));
    const stale = served.filter(([, html]) => buildCommit(html) !== expected);
    if (stale.length === 0) return poll;
    if (now() + interval > deadline) {
      const report = stale.map(
        ([url, html]) => `${url} serves ${buildCommit(html) ?? 'no commit'}`,
      );
      throw new Error(
        `The live site did not serve ${expected} within ${limit / 60_000} minutes:\n${report.join('\n')}`,
      );
    }
    log(`${stale.length} of ${urls.length} pages still serve an earlier build; checking again`);
    pending = stale.map(([url]) => url);
    await sleep(interval);
  }
}

function certificateDaysLeft(host) {
  return new Promise((resolve, reject) => {
    // Node verifies the chain and hostname; an invalid certificate fails the connection.
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 15_000 }, () => {
      const expires = new Date(socket.getPeerCertificate().valid_to);
      socket.end();
      resolve((expires - Date.now()) / 86_400_000);
    });
    socket.on('timeout', () => socket.destroy(new Error(`TLS connection to ${host} timed out`)));
    socket.on('error', reject);
  });
}

// A short retry rides out a dropped connection without masking a real outage.
const request = (url, init = {}) =>
  withRetries(
    `GET ${url}`,
    async () => {
      const response = await fetch(url, {
        ...init,
        headers: { 'user-agent': userAgent },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status >= 500) throw new Error(`${url}: HTTP ${response.status}`);
      return response;
    },
    [2000, 5000],
  );

async function fetchPage(url) {
  const response = await request(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.startsWith('text/html'))
    throw new Error(`${url}: served as ${response.headers.get('content-type')}, not HTML`);
  return response.text();
}

// Runs at most `limit` checks at once, so hundreds of images do not open hundreds of sockets.
async function inBatches(items, limit, check) {
  const failures = [];
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await check(item).catch((error) => failures.push(error.message));
      }
    }),
  );
  return failures;
}

const expectedTypes = { '.css': 'text/css', '.js': 'javascript', '.pdf': 'application/pdf' };

async function checkAsset(url) {
  const response = await request(url, { method: 'HEAD' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const extension = new URL(url).pathname.match(/\.[a-z0-9]+$/)?.[0];
  const type = response.headers.get('content-type') ?? '';
  // A stylesheet or script with the wrong type is refused by the browser.
  if (expectedTypes[extension] && !type.includes(expectedTypes[extension]))
    throw new Error(`${url}: served as ${type}`);
}

async function main() {
  const domain = (await readFile('public/CNAME', 'utf8')).trim();
  const origin = `https://${domain}`;
  const expected = process.env.EXPECTED_COMMIT || null;
  const failures = [];

  const days = await certificateDaysLeft(domain);
  console.log(`HTTPS certificate for ${domain} is valid for ${Math.floor(days)} more days`);
  if (days < certificateMinDays)
    failures.push(`The certificate expires in ${Math.floor(days)} days; GitHub Pages renews it`);

  const insecure = await request(`http://${domain}/`, { redirect: 'manual' });
  const location = insecure.headers.get('location') ?? '';
  if (![301, 308].includes(insecure.status) || !location.startsWith(`${origin}/`))
    failures.push(`http://${domain}/ does not redirect to HTTPS (${insecure.status} ${location})`);

  if (expected) {
    // The homepage first: until it updates, the sitemap may still list the previous build's pages.
    await waitForCommit([`${origin}/`], expected, { fetchText: fetchPage });
  }
  const sitemap = await (await request(`${origin}/sitemap.xml`)).text();
  const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  if (pages.length === 0) throw new Error(`${origin}/sitemap.xml lists no pages`);
  if (expected) {
    const polls = await waitForCommit(pages, expected, { fetchText: fetchPage });
    console.log(`All ${pages.length} pages serve ${expected} (after ${polls} checks)`);
  }

  const assets = new Set();
  failures.push(
    ...(await inBatches(pages, 4, async (page) => {
      for (const url of localReferences(await fetchPage(page), page)) assets.add(url);
    })),
  );
  const pageSet = new Set(pages);
  const files = [...assets].filter((url) => !pageSet.has(url));
  failures.push(...(await inBatches(files, 8, checkAsset)));
  console.log(`Checked ${pages.length} pages and ${files.length} linked files`);

  const missing = await request(`${origin}/verify-live-missing-${Date.now()}/`);
  const body = await missing.text();
  if (missing.status !== 404 || !body.includes('name="robots" content="noindex"'))
    failures.push(`A missing page returned ${missing.status} without the site's own 404 page`);

  if (failures.length) {
    console.error(`Live site check failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`${origin} is serving correctly`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
