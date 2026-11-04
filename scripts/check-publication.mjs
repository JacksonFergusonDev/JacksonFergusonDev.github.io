import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function currentPublication(
  { repository, commit, runId, token, apiUrl = 'https://api.github.com' },
  fetchImpl = fetch,
) {
  async function get(path) {
    const response = await fetchImpl(`${apiUrl}/repos/${repository}/${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Publication check: GitHub returned ${response.status}`);
    return response.json();
  }

  const head = await get('commits/main');
  if (!head.sha) throw new Error('Publication check: missing main commit');
  if (head.sha !== commit) return false;

  const result = await get('actions/workflows/deploy.yml/runs?branch=main&per_page=100');
  if (!Array.isArray(result.workflow_runs))
    throw new Error('Publication check: missing workflow runs');
  const runs = result.workflow_runs.filter(
    (run) => run.head_branch === 'main' && run.event !== 'pull_request',
  );
  if (!runs.length || runs.some((run) => !run.id || !Number.isInteger(run.run_number)))
    throw new Error('Publication check: invalid workflow runs');
  const latest = runs.reduce((a, b) => (a.run_number > b.run_number ? a : b));
  return String(latest.id) === String(runId);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const current = await currentPublication({
    repository: process.env.GITHUB_REPOSITORY,
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL,
  });
  await appendFile(process.env.GITHUB_OUTPUT, `current=${current}\n`);
  console.log(current ? 'Publishing the current run' : 'Skipping a superseded build');
}
