import { appendFile, readFile } from 'node:fs/promises';
import { assetsChanged } from './remote-asset-state.mjs';

const current = JSON.parse(await readFile('public/remote-assets-state.json', 'utf8'));
const url = new URL('https://jacksonferguson.me/remote-assets-state.json');
// Avoid comparing against a cached snapshot from an earlier deployment.
url.searchParams.set('check', Date.now().toString());
const changed = await assetsChanged(current, url);
console.log(
  changed ? 'Remote assets changed; build required.' : 'Remote assets match the live site.',
);
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}
