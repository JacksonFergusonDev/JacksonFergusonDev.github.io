// Shrinks photo originals before they are committed: caps the long edge, bakes in the
// camera orientation, and drops all metadata (GPS included). Astro builds every served
// size from these files, so nothing larger than the photo viewer's 2400px is needed.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const maxEdge = 3000;
const jpegQuality = 85;
const extensions = new Set(['.jpg', '.jpeg', '.png']);

async function collect(target) {
  if (!(await stat(target)).isDirectory()) {
    return extensions.has(path.extname(target).toLowerCase()) ? [target] : [];
  }
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collect(path.join(target, entry.name))));
  return nested.flat();
}

async function prepare(file) {
  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  const longEdge = Math.max(meta.autoOrient.width, meta.autoOrient.height);
  const hasMetadata = Boolean(meta.exif || meta.xmp || meta.iptc || meta.comments?.length);

  // Already prepared: re-encoding again would only lose quality.
  if (longEdge <= maxEdge && !hasMetadata) return null;

  let image = sharp(input).autoOrient();
  if (longEdge > maxEdge) {
    image = image.resize({ width: maxEdge, height: maxEdge, fit: 'inside' });
  }
  image =
    meta.format === 'png'
      ? image.png({ compressionLevel: 9 })
      : image.jpeg({ quality: jpegQuality, mozjpeg: true });

  const output = await image.toBuffer();
  await writeFile(file, output);
  return { before: input.byteLength, after: output.byteLength };
}

const targets = process.argv.slice(2);
const files = (await Promise.all((targets.length ? targets : ['src/assets']).map(collect))).flat();

let before = 0;
let after = 0;
for (const file of files.sort()) {
  const result = await prepare(file);
  if (!result) continue;
  before += result.before;
  after += result.after;
  console.log(
    `prepared ${file} ${(result.before / 1e6).toFixed(1)} MB -> ${(result.after / 1e6).toFixed(1)} MB`,
  );
}

console.log(
  before
    ? `Prepared images: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB.`
    : 'All images are already prepared.',
);
