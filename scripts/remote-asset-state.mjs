function canonicalState(state) {
  if (state?.version !== 1 || !Array.isArray(state.assets)) {
    throw new Error('Invalid remote asset state: expected version 1 and an assets array');
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

export async function assetsChanged(current, url, fetchImpl = fetch) {
  const currentState = canonicalState(current);
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache' },
  });
  // The first deployment of this feature has no snapshot yet.
  if (response.status === 404) return true;
  if (!response.ok) throw new Error(`Deployed asset state: HTTP ${response.status}`);
  return currentState !== canonicalState(await response.json());
}
