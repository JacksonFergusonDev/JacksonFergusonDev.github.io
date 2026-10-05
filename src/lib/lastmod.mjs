import { execFileSync } from 'node:child_process';

/**
 * ISO date of the newest commit touching any of the given paths, or undefined when git has no
 * history for them (no checkout, or files not yet committed). Sitemap `lastmod` should only change
 * when a page's own content does, so callers pass that page's files rather than the whole repo.
 * @param {string[]} paths
 * @returns {string | undefined}
 */
export function lastModified(paths) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The newest of several ISO dates, ignoring missing ones.
 * @param {(string | undefined)[]} dates
 * @returns {string | undefined}
 */
export function newest(dates) {
  return dates.filter((d) => Boolean(d)).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}
