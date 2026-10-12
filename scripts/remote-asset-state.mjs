import { retryDelays, withRetries } from './retry.mjs';

function canonicalState(state) {
  if (state?.version !== 1 || !Array.isArray(state.assets)) {
    throw new Error('Invalid remote asset state: expected version 1 and an assets array');
  }
  if (state.commit != null && !/^[a-f0-9]{40}$/.test(state.commit)) {
    throw new Error('Invalid remote asset state commit');
  }
  const ids = new Set();
  const entries = state.assets.map((asset) => {
    if (
      !asset ||
      typeof asset.id !== 'string' ||
      ids.has(asset.id) ||
      typeof asset.source !== 'string' ||
      typeof asset.target !== 'string' ||
      !/^[a-f0-9]{64}$/.test(asset.sha256)
    ) {
      throw new Error('Invalid remote asset state entry');
    }
    ids.add(asset.id);
    return [asset.id, asset.source, asset.target, asset.sha256];
  });
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)));
}

export async function assetsChanged(
  current,
  url,
  { fetchImpl = fetch, delays = retryDelays } = {},
) {
  const currentState = canonicalState(current);
  const response = await withRetries(
    'Deployed asset state',
    async () => {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Deployed asset state: HTTP ${response.status}`);
      }
      return response;
    },
    delays,
  );
  // The first deployment of this feature has no snapshot yet.
  if (response.status === 404) return true;
  const deployed = await response.json();
  const deployedState = canonicalState(deployed);
  // A newer main commit means its own deployment failed or was cancelled while queued.
  if (current.commit && current.commit !== deployed.commit) return true;
  return currentState !== deployedState;
}
