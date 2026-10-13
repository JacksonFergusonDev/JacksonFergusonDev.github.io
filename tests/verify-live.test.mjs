import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommit, localReferences, waitForCommit } from '../scripts/verify-live.mjs';

const current = 'a'.repeat(40);
const previous = 'b'.repeat(40);
const page = (commit) => `<head><meta name="build-commit" content="${commit}"></head>`;

// A clock that advances only when the poller sleeps, so tests run instantly.
function fakeClock() {
  let time = 0;
  return { now: () => time, sleep: async (ms) => (time += ms) };
}

test('reads the build commit from a page', () => {
  assert.equal(buildCommit(page(current)), current);
  assert.equal(buildCommit('<head></head>'), null);
});

test('collects same-origin links, sources, and srcset candidates without fragments', () => {
  const html = `<a href="/#about">About</a><a href="https://github.com/x">GitHub</a>
    <img src="/a.webp" srcset="/a.webp 480w, /b.webp 800w"><link href="style.css" rel="stylesheet">`;
  assert.deepEqual(localReferences(html, 'https://example.test/trips/').sort(), [
    'https://example.test/',
    'https://example.test/a.webp',
    'https://example.test/b.webp',
    'https://example.test/trips/style.css',
  ]);
});

test('waits for every page to serve the deployed commit', async () => {
  const served = { '/': [previous, current], '/trips/': [previous, previous, current] };
  const fetched = [];
  const polls = await waitForCommit(Object.keys(served), current, {
    ...fakeClock(),
    log: () => {},
    fetchText: async (url) => {
      fetched.push(url);
      return page(served[url].shift());
    },
  });
  assert.equal(polls, 3);
  // Pages that already serve the new build are not fetched again.
  assert.deepEqual(fetched, ['/', '/trips/', '/', '/trips/', '/trips/']);
});

test('fails after the limit, naming the pages still serving an earlier build', async () => {
  await assert.rejects(
    waitForCommit(['/', '/trips/'], current, {
      ...fakeClock(),
      log: () => {},
      interval: 30_000,
      limit: 15 * 60_000,
      fetchText: async (url) => (url === '/' ? page(current) : '<html></html>'),
    }),
    (error) => {
      const [summary, ...stale] = error.message.split('\n');
      assert.match(summary, /within 15 minutes/);
      assert.deepEqual(stale, ['/trips/ serves no commit']);
      return true;
    },
  );
});
