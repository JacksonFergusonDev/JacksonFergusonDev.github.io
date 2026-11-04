import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPublication } from '../scripts/check-publication.mjs';

const options = { repository: 'owner/site', commit: 'current', runId: '2', token: 'test' };
const run = (id, extra = {}) => ({
  id,
  run_number: id,
  head_branch: 'main',
  event: 'push',
  ...extra,
});
function responses(head, runs) {
  return async (url) => ({
    ok: true,
    json: async () => (url.endsWith('/commits/main') ? head : { workflow_runs: runs }),
  });
}

test('the latest main run can publish, including a rerun with the same run ID', async () => {
  assert.equal(
    await currentPublication(options, responses({ sha: 'current' }, [run(1), run(2)])),
    true,
  );
});

test('an older commit cannot publish even if its checks finish last', async () => {
  assert.equal(await currentPublication(options, responses({ sha: 'newer' }, [run(2)])), false);
});

test('a newer asset refresh supersedes an older build of the same commit', async () => {
  const newer = run(3, { event: 'repository_dispatch' });
  assert.equal(
    await currentPublication(options, responses({ sha: 'current' }, [run(2), newer])),
    false,
  );
});

test('PRs and runs from other branches do not supersede a main publication', async () => {
  const runs = [run(2), run(3, { event: 'pull_request' }), run(4, { head_branch: 'feature' })];
  assert.equal(await currentPublication(options, responses({ sha: 'current' }, runs)), true);
});

test('GitHub API failures and incomplete responses prevent publication', async () => {
  await assert.rejects(
    currentPublication(options, async () => ({ ok: false, status: 503 })),
    /GitHub returned 503/,
  );
  await assert.rejects(currentPublication(options, responses({}, [])), /missing main commit/);
  await assert.rejects(
    currentPublication(options, responses({ sha: 'current' }, undefined)),
    /missing workflow runs/,
  );
  await assert.rejects(
    currentPublication(options, responses({ sha: 'current' }, [])),
    /invalid workflow runs/,
  );
});
