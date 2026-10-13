import process from 'node:process';

// The commit being built, which CI stamps on every page so scripts/verify-live.mjs can tell when
// the CDN serves this build. Local builds have none.
export const buildCommit = process.env.GITHUB_SHA ?? null;
