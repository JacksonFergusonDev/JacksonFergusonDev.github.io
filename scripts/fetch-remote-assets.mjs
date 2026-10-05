import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'config', 'remote-assets.json');
const timeoutMs = 15000;
const attempts = 3;
// CI starts without any fetched copies, so a failed download must fail the build there.
const allowLocalFallback = !process.env.CI;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const seenIds = new Set();
const seenTargets = new Set();
const jsonKinds = ['string', 'number', 'boolean'];

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
    ['svg', 'asciinema-cast', 'pdf', 'json'].includes(asset.type),
    `${asset.id} has unsupported type`,
  );
  if (asset.type === 'json') {
    assertManifest(
      asset.shape &&
        typeof asset.shape === 'object' &&
        Object.keys(asset.shape).length > 0 &&
        Object.values(asset.shape).every((kind) => jsonKinds.includes(kind)),
      `${asset.id} shape must map each required key to one of ${jsonKinds.join(', ')}`,
    );
  } else {
    assertManifest(asset.shape === undefined, `${asset.id} shape applies only to json assets`);
  }
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

function validateJson(asset, text) {
  let document;

  try {
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`${asset.id}: expected a JSON document from ${asset.source}`, { cause: error });
  }

  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`${asset.id}: expected a JSON object from ${asset.source}`);
  }
  for (const [key, kind] of Object.entries(asset.shape)) {
    if (typeof document[key] !== kind) {
      throw new Error(`${asset.id}: expected "${key}" to be a ${kind} in ${asset.source}`);
    }
  }
}

function validatePdf(asset, bytes) {
  if (Buffer.from(bytes.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new Error(`${asset.id}: expected a PDF document from ${asset.source}`);
  }
}

function validateAsset(asset, bytes) {
  if (asset.type === 'pdf') {
    validatePdf(asset, bytes);
    return;
  }

  const text = new TextDecoder('utf8', { fatal: true }).decode(bytes);
  if (asset.type === 'svg') validateSvg(asset, text);
  if (asset.type === 'asciinema-cast') validateCast(asset, text);
  if (asset.type === 'json') validateJson(asset, text);
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

      validateAsset(asset, bytes);

      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw new Error(`${asset.id}: no valid download after ${attempts} attempts`, {
    cause: lastError,
  });
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

// Offline local work can keep using the last copy that passed validation.
async function readFallback(asset, targetPath, error) {
  if (!allowLocalFallback) throw error;

  const bytes = await readFile(targetPath).catch(() => null);
  if (!bytes) throw error;

  try {
    validateAsset(asset, bytes);
  } catch {
    throw error;
  }
  console.warn(`warning: ${error.message}; keeping the existing ${asset.target}`);
  return bytes;
}

assertManifest(Array.isArray(manifest.assets), 'assets must be an array');
manifest.assets.forEach(validateManifestAsset);

const results = [];

for (const asset of manifest.assets) {
  const targetPath = path.join(root, asset.target);
  let bytes;
  let status;

  try {
    bytes = await fetchAsset(asset);
    status = (await writeIfChanged(targetPath, bytes)) ? 'updated' : 'current';
  } catch (error) {
    bytes = await readFallback(asset, targetPath, error);
    status = 'kept';
  }

  results.push({
    target: asset.target,
    size: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    status,
  });
}

for (const result of results) {
  console.log(`${result.status} ${result.target} ${result.size} bytes sha256:${result.sha256}`);
}
