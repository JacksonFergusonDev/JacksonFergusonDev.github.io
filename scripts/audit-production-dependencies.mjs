import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['audit', '--prod', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

if (result.error) throw result.error;
if (result.signal) throw new Error(`pnpm audit was terminated by ${result.signal}`);

process.stdout.write(result.stdout);
process.exitCode = result.status;

if (result.status === 1) {
  const report = JSON.parse(result.stdout);
  const advisories = Object.values(report.advisories ?? {});
  const [advisory] = advisories;

  // Pages serves static files, and Astro reads fixed content globs at build time.
  if (
    !report.error &&
    advisories.length === 1 &&
    advisory?.severity === 'high' &&
    advisory.module_name === 'picomatch' &&
    advisory.github_advisory_id === 'GHSA-fc5q-39xc-vjpf' &&
    advisory.patched_versions === null
  ) {
    console.warn(
      'Temporarily tolerating GHSA-fc5q-39xc-vjpf while pnpm reports no patched version.',
    );
    process.exitCode = 0;
  }
}
