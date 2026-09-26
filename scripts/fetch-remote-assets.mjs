import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'config', 'remote-assets.json');
const timeoutMs = 15000;
const attempts = 3;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const seenIds = new Set();
const seenTargets = new Set();

function assertManifest(condition, message) {
  if (!condition) throw new Error(`Remote asset manifest error: ${message}`);
}

function validateManifestAsset(asset) {
  assertManifest(asset && typeof asset === 'object', 'each asset must be an object');
  assertManifest(typeof asset.id === 'string' && /^[a-z0-9-]+$/.test(asset.id), 'invalid id');
  assertManifest(!seenIds.has(asset.id), `duplicate id "${asset.id}"`);
  seenIds.add(asset.id);

  assertManifest(
    typeof asset.description === 'string' && asset.description.length > 0,
    `${asset.id} missing description`,
  );
  assertManifest(
    typeof asset.source === 'string' && asset.source.startsWith('https://'),
    `${asset.id} source must be HTTPS`,
  );
  assertManifest(
    typeof asset.target === 'string' && asset.target.startsWith('public/'),
    `${asset.id} target must be inside public/`,
  );
  assertManifest(!asset.target.includes('..'), `${asset.id} target must not traverse directories`);
  assertManifest(!path.isAbsolute(asset.target), `${asset.id} target must be relative`);
  assertManifest(!seenTargets.has(asset.target), `duplicate target "${asset.target}"`);
  seenTargets.add(asset.target);

  assertManifest(
    ['svg', 'asciinema-cast'].includes(asset.type),
    `${asset.id} has unsupported type`,
  );
  assertManifest(
    Number.isInteger(asset.minBytes) && asset.minBytes > 0,
    `${asset.id} minBytes must be positive`,
  );
}

function validateSvg(asset, text) {
  if (!text.includes('<svg') || !text.includes('</svg>')) {
    throw new Error(`${asset.id}: expected an SVG document from ${asset.source}`);
  }
}

function validateCast(asset, text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  let header;

  try {
    header = JSON.parse(firstLine);
  } catch (error) {
    throw new Error(`${asset.id}: expected a JSON Asciinema v2 header`, { cause: error });
  }

  if (header.version !== 2 || !Number.isFinite(header.width) || !Number.isFinite(header.height)) {
    throw new Error(`${asset.id}: expected an Asciinema v2 header with width and height`);
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'jackson-ferguson-portfolio-build',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAsset(asset) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(asset.source);

      if (!response.ok) {
        throw new Error(`${asset.id}: ${response.status} ${response.statusText}`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength < asset.minBytes) {
        throw new Error(
          `${asset.id}: fetched ${bytes.byteLength} bytes, expected at least ${asset.minBytes}`,
        );
      }

      const text = new TextDecoder('utf8', { fatal: true }).decode(bytes);
      if (asset.type === 'svg') validateSvg(asset, text);
      if (asset.type === 'asciinema-cast') validateCast(asset, text);

      return {
        bytes,
        hash: createHash('sha256').update(bytes).digest('hex'),
        size: bytes.byteLength,
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

async function writeIfChanged(targetPath, bytes) {
  const current = await readFile(targetPath).catch(() => null);
  if (current && Buffer.compare(current, Buffer.from(bytes)) === 0) return false;

  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.tmp-${process.pid}`;

  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, targetPath);
    return true;
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

assertManifest(Array.isArray(manifest.assets), 'assets must be an array');
manifest.assets.forEach(validateManifestAsset);

const results = [];

for (const asset of manifest.assets) {
  const targetPath = path.join(root, asset.target);
  const fetched = await fetchAsset(asset);
  const changed = await writeIfChanged(targetPath, fetched.bytes);

  results.push({
    id: asset.id,
    target: asset.target,
    size: fetched.size,
    sha256: fetched.hash,
    changed,
  });
}

for (const result of results) {
  const status = result.changed ? 'updated' : 'current';
  console.log(`${status} ${result.target} ${result.size} bytes sha256:${result.sha256}`);
}
