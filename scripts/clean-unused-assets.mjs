import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const astroDir = path.join(distDir, '_astro');

if (!fs.existsSync(astroDir)) {
  process.exit(0);
}

const textExtensions = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg']);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

const consumerFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (textExtensions.has(ext)) {
        consumerFiles.push(fullPath);
      }
    }
  }
}

walk(distDir);

const combinedContent = consumerFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const astroFiles = fs.readdirSync(astroDir);
let removedCount = 0;
let removedBytes = 0;

for (const file of astroFiles) {
  const ext = path.extname(file).toLowerCase();
  if (!imageExtensions.has(ext)) {
    continue;
  }

  // If the exact file name does not appear anywhere in the generated HTML/JS/CSS/manifests
  if (!combinedContent.includes(file)) {
    const filePath = path.join(astroDir, file);
    const size = fs.statSync(filePath).size;
    fs.unlinkSync(filePath);
    removedCount += 1;
    removedBytes += size;
  }
}

if (removedCount > 0) {
  const mb = (removedBytes / (1024 * 1024)).toFixed(2);
  console.log(
    `Cleaned ${removedCount} unreferenced image assets from dist/_astro (${mb} MB saved).`,
  );
} else {
  console.log('No unreferenced image assets found in dist/_astro.');
}
