import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { assetsChanged } from '../scripts/remote-asset-state.mjs';

const asset = {
  id: 'report',
  source: 'https://example.com/report.pdf',
  target: 'public/reports/report.pdf',
  sha256: 'a'.repeat(64),
};
const state = { version: 1, assets: [asset] };
const url = 'https://example.com/remote-assets-state.json';
const served = (document) => async () => Response.json(document);
// Unit tests retry immediately rather than waiting through the real backoff.
const check = (current, fetchImpl, delays = []) =>
  assetsChanged(current, url, { fetchImpl, delays });
const commit = 'c'.repeat(40);

test('unchanged assets skip a build regardless of entry order or JSON formatting', async () => {
  const second = { ...asset, id: 'figure', target: 'public/figure.svg' };
  assert.equal(
    await check(
      { version: 1, assets: [asset, second] },
      served({ assets: [second, asset], version: 1 }),
    ),
    false,
  );
});

test('changed bytes, sources, destinations, additions and removals require a build', async () => {
  for (const modified of [
    { ...asset, sha256: 'b'.repeat(64) },
    { ...asset, source: 'https://example.com/new.pdf' },
    { ...asset, target: 'public/new.pdf' },
  ]) {
    assert.equal(await check(state, served({ version: 1, assets: [modified] })), true);
  }
  assert.equal(await check(state, served({ version: 1, assets: [] })), true);
  assert.equal(await check({ version: 1, assets: [] }, served(state)), true);
});

test('missing deployed snapshot bootstraps the first deployment', async () => {
  assert.equal(await check(state, async () => new Response(null, { status: 404 })), true);
});

test('network failures and invalid deployed snapshots fail instead of reporting unchanged', async () => {
  await assert.rejects(
    check(state, async () => {
      throw new Error('Network unavailable');
    }),
    (error) =>
      /failed after 1 attempts/.test(error.message) &&
      /Network unavailable/.test(error.cause.message),
  );
  await assert.rejects(
    check(state, async () => new Response(null, { status: 503 })),
    (error) => /HTTP 503/.test(error.cause.message),
  );
  await assert.rejects(check(state, async () => new Response('<html>not JSON</html>')));
  for (const invalid of [
    {},
    { version: 2, assets: [] },
    { version: 1, assets: [{ ...asset, sha256: 'invalid' }] },
    { version: 1, assets: [asset, asset] },
  ]) {
    await assert.rejects(check(state, served(invalid)), /Invalid remote asset state/);
  }
});

test('transient baseline failures are retried before the check gives up', async () => {
  let requests = 0;
  const flaky = async () => {
    requests += 1;
    if (requests === 1) throw new Error('Network unavailable');
    if (requests === 2) return new Response(null, { status: 502 });
    return Response.json(state);
  };
  assert.equal(await check(state, flaky, [0, 0]), false);
  assert.equal(requests, 3);

  requests = 0;
  const failing = async () => {
    requests += 1;
    return new Response(null, { status: 503 });
  };
  await assert.rejects(check(state, failing, [0, 0]), /failed after 3 attempts/);
  assert.equal(requests, 3);

  requests = 0;
  const missing = async () => {
    requests += 1;
    return new Response(null, { status: 404 });
  };
  assert.equal(await check(state, missing, [0, 0]), true);
  assert.equal(requests, 1, 'a missing snapshot is an answer, not a failure to retry');
});

test('a main commit that never deployed requires a build even with unchanged assets', async () => {
  const deployed = { ...state, commit };
  assert.equal(await check({ ...state, commit: 'd'.repeat(40) }, served(deployed)), true);
  assert.equal(await check({ ...state, commit }, served(deployed)), false);
  // Snapshots without a commit come from local runs and older deployments.
  assert.equal(await check({ ...state, commit }, served(state)), true);
  assert.equal(await check({ ...state, commit: null }, served(deployed)), false);
  await assert.rejects(
    check(state, served({ ...state, commit: 'main' })),
    /Invalid remote asset state commit/,
  );
});

test('baseline requests bypass caches and have a timeout', async () => {
  await check(state, async (requested, options) => {
    assert.equal(requested, url);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['cache-control'], 'no-cache');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(state);
  });
});

test('check command emits GitHub outputs and fails without an output on a bad baseline', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remote-assets-check-'));
  const scriptUrl = pathToFileURL(path.resolve('scripts/check-remote-assets.mjs')).href;
  const output = path.join(directory, 'github-output');
  try {
    await mkdir(path.join(directory, 'public'));
    await writeFile(path.join(directory, 'public/remote-assets-state.json'), JSON.stringify(state));
    await writeFile(path.join(directory, 'public/CNAME'), 'example.test\n');
    // The baseline URL comes from the CNAME; any other host fails the request.
    const mockFetch = (response) =>
      `globalThis.fetch = async (requested) => new URL(requested).host === 'example.test' ? ${response} : new Response(null, { status: 500 });`;
    // Short local retries keep the failure case quick even when the suite runs in CI.
    const env = { ...process.env, CI: '', GITHUB_OUTPUT: output };
    for (const [response, expected] of [
      [`Response.json(${JSON.stringify(state)})`, 'false'],
      ['new Response(null, { status: 404 })', 'true'],
    ]) {
      await writeFile(output, '');
      await promisify(execFile)(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `${mockFetch(response)} await import(${JSON.stringify(scriptUrl)});`,
        ],
        { cwd: directory, env },
      );
      assert.equal(await readFile(output, 'utf8'), `changed=${expected}\n`);
    }
    await writeFile(output, '');
    await assert.rejects(
      promisify(execFile)(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `${mockFetch('new Response(null, { status: 503 })')} await import(${JSON.stringify(scriptUrl)});`,
        ],
        { cwd: directory, env },
      ),
    );
    assert.equal(await readFile(output, 'utf8'), '');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('fetcher rejects a metric whose value is a placeholder', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remote-assets-fetch-'));
  const scriptUrl = pathToFileURL(path.resolve('scripts/fetch-remote-assets.mjs')).href;
  const metric = {
    id: 'metric',
    description: 'A metric',
    source: 'https://example.test/metric.json',
    target: 'public/data/metric.json',
    type: 'json',
    shape: { message: 'string' },
    match: { message: '^\\d+(\\.\\d+)?%$' },
    minBytes: 10,
  };
  const fetchWith = (message) =>
    promisify(execFile)(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `globalThis.fetch = async () => Response.json({ message: ${JSON.stringify(message)}, padding: 'x' });
        await import(${JSON.stringify(scriptUrl)});`,
      ],
      // Short local retries; no earlier copy exists to fall back on.
      { cwd: directory, env: { ...process.env, CI: '' } },
    );
  try {
    await mkdir(path.join(directory, 'config'));
    await writeFile(
      path.join(directory, 'config/remote-assets.json'),
      JSON.stringify({ assets: [metric] }),
    );
    await assert.rejects(fetchWith('unknown'), /"message" is "unknown"/);
    await fetchWith('99.9%');
    const fetched = JSON.parse(await readFile(path.join(directory, metric.target), 'utf8'));
    assert.equal(fetched.message, '99.9%');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

// CI always builds first; a local run without a build skips rather than failing.
const builtSnapshot = 'dist/remote-assets-state.json';
const skipBuilt = !process.env.CI && !existsSync(builtSnapshot) && 'run npm run build first';

test(
  'deployed snapshot hashes describe every actual built remote asset',
  { skip: skipBuilt },
  async () => {
    const manifest = JSON.parse(await readFile('config/remote-assets.json', 'utf8'));
    const snapshot = JSON.parse(await readFile(builtSnapshot, 'utf8'));
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.commit, process.env.GITHUB_SHA ?? null);
    assert.equal(snapshot.assets.length, manifest.assets.length);
    for (const entry of manifest.assets) {
      const record = snapshot.assets.find(({ id }) => id === entry.id);
      assert.ok(record, `Missing snapshot record: ${entry.id}`);
      assert.equal(record.source, entry.source);
      assert.equal(record.target, entry.target);
      const bytes = await readFile(entry.target.replace(/^public\//, 'dist/'));
      assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
    }
  },
);
