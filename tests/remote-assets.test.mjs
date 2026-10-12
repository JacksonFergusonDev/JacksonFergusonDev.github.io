import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
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

test('unchanged assets skip a build regardless of entry order or JSON formatting', async () => {
  const second = { ...asset, id: 'figure', target: 'public/figure.svg' };
  assert.equal(
    await assetsChanged(
      { version: 1, assets: [asset, second] },
      url,
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
    assert.equal(await assetsChanged(state, url, served({ version: 1, assets: [modified] })), true);
  }
  assert.equal(await assetsChanged(state, url, served({ version: 1, assets: [] })), true);
  assert.equal(await assetsChanged({ version: 1, assets: [] }, url, served(state)), true);
});

test('missing deployed snapshot bootstraps the first deployment', async () => {
  assert.equal(
    await assetsChanged(state, url, async () => new Response(null, { status: 404 })),
    true,
  );
});

test('network failures and invalid deployed snapshots fail instead of reporting unchanged', async () => {
  await assert.rejects(
    assetsChanged(state, url, async () => {
      throw new Error('Network unavailable');
    }),
    /Network unavailable/,
  );
  await assert.rejects(
    assetsChanged(state, url, async () => new Response(null, { status: 503 })),
    /HTTP 503/,
  );
  await assert.rejects(
    assetsChanged(state, url, async () => new Response('<html>not JSON</html>')),
  );
  for (const invalid of [
    {},
    { version: 2, assets: [] },
    { version: 1, assets: [{ ...asset, sha256: 'invalid' }] },
    { version: 1, assets: [asset, asset] },
  ]) {
    await assert.rejects(assetsChanged(state, url, served(invalid)), /Invalid remote asset state/);
  }
});

test('baseline requests bypass caches and have a timeout', async () => {
  await assetsChanged(state, url, async (requested, options) => {
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
          `globalThis.fetch = async () => ${response}; await import(${JSON.stringify(scriptUrl)});`,
        ],
        { cwd: directory, env: { ...process.env, GITHUB_OUTPUT: output } },
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
          `globalThis.fetch = async () => new Response(null, { status: 503 }); await import(${JSON.stringify(scriptUrl)});`,
        ],
        { cwd: directory, env: { ...process.env, GITHUB_OUTPUT: output } },
      ),
    );
    assert.equal(await readFile(output, 'utf8'), '');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('deployed snapshot hashes describe every actual built remote asset', async () => {
  const manifest = JSON.parse(await readFile('config/remote-assets.json', 'utf8'));
  const snapshot = JSON.parse(await readFile('dist/remote-assets-state.json', 'utf8'));
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.assets.length, manifest.assets.length);
  for (const entry of manifest.assets) {
    const record = snapshot.assets.find(({ id }) => id === entry.id);
    assert.ok(record, `Missing snapshot record: ${entry.id}`);
    assert.equal(record.source, entry.source);
    assert.equal(record.target, entry.target);
    const bytes = await readFile(entry.target.replace(/^public\//, 'dist/'));
    assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
});
