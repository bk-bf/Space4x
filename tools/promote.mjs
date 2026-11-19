#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WORKFLOW = 'promote.yml';
const BRANCH = 'promote/main';
const POLL_MS = 60_000;
const WAIT_MS = 2 * 3600_000;

const flag = (name) => process.argv.includes(`--${name}`);
const out = (line) => process.stdout.write(`${line}\n`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const run = (cmd, args, cwd = ROOT) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (args, cwd = ROOT) => run('git', args, cwd);
const gh = (args) => run('gh', args);
const lines = (text) => text.split('\n').filter(Boolean);

const worktree = join(ROOT, '.claude', 'worktrees', 'promote');

git(['fetch', '--quiet', 'origin', 'main', 'dev']);

const commits = lines(git(['log', '--oneline', '--no-merges', 'origin/main..origin/dev']));
if (commits.length === 0) {
  out('dev has nothing main does not. Nothing to promote.');
  process.exit(0);
}

const onDev = new Set(lines(git(['rev-list', 'origin/main..origin/dev'])));
const pulls = JSON.parse(
  gh(['pr', 'list', '--state', 'merged', '--limit', '200', '--json', 'number,title,mergeCommit'])
)
  .filter((pr) => pr.mergeCommit && onDev.has(pr.mergeCommit.oid))
  .sort((a, b) => a.number - b.number);
const files = lines(git(['diff', '--stat', 'origin/main...origin/dev']));

out(`${commits.length} commit(s) on dev not on main, ${pulls.length} merged pull request(s)\n`);
for (const pr of pulls) out(`  #${pr.number}  ${pr.title.slice(0, 66)}`);
if (pulls.length) out('');
for (const commit of commits.slice(0, 20)) out(`  ${commit.slice(0, 80)}`);
if (commits.length > 20) out(`  ... and ${commits.length - 20} more`);
out('');
for (const file of files.slice(-14)) out(`  ${file}`);
out('');

if (flag('list')) process.exit(0);

const mainSha = git(['rev-parse', 'origin/main']);
const devSha = git(['rev-parse', 'origin/dev']);

const reusableCandidate = () => {
  try {
    git(['fetch', '--quiet', 'origin', BRANCH]);
  } catch {
    return null;
  }
  const [sha, ...parents] = git(['rev-list', '--parents', '-n', '1', `origin/${BRANCH}`]).split(' ');
  return parents[0] === mainSha && parents[1] === devSha ? sha : null;
};

const waitForRun = async (sha) => {
  const until = Date.now() + WAIT_MS;
  let shown = '';
  while (Date.now() < until) {
    const [latest] = JSON.parse(
      gh([
        'run',
        'list',
        '--workflow',
        WORKFLOW,
        '--commit',
        sha,
        '--limit',
        '1',
        '--json',
        'databaseId,status,conclusion,url'
      ])
    );
    if (latest) {
      const { jobs } = JSON.parse(gh(['run', 'view', String(latest.databaseId), '--json', 'jobs']));
      const line = jobs.map((job) => `${job.name} ${job.conclusion || job.status}`).join(', ');
      if (line !== shown) out(`    ${line}`);
      shown = line;
      if (latest.status === 'completed') return { latest, jobs };
    }
    await sleep(POLL_MS);
  }
  return null;
};

const removeWorktree = () => {
  try {
    git(['worktree', 'remove', '--force', worktree]);
  } catch {
    rmSync(worktree, { recursive: true, force: true });
    git(['worktree', 'prune']);
  }
};

if (existsSync(worktree)) removeWorktree();
try {
  git(['branch', '-D', BRANCH]);
} catch {
  out(`--- no local ${BRANCH} to replace`);
}

let code = 0;
let pushed = false;
try {
  const reused = reusableCandidate();
  if (reused) {
    git(['worktree', 'add', '-b', BRANCH, worktree, reused]);
    out(`--- reusing ${reused.slice(0, 8)} on origin/${BRANCH}: main and dev have not moved`);
  } else {
    git(['worktree', 'add', '-b', BRANCH, worktree, 'origin/main']);
    git(['merge', '--no-ff', '--no-edit', 'origin/dev'], worktree);
    out('--- dev merges onto main cleanly');
    git(['push', '--force', 'origin', `HEAD:refs/heads/${BRANCH}`], worktree);
    out(`--- pushed the merge to ${BRANCH}, where ${WORKFLOW} runs`);
  }

  const sha = git(['rev-parse', 'HEAD'], worktree);
  out(`--- waiting for ${WORKFLOW} on ${sha.slice(0, 8)}`);
  const result = await waitForRun(sha);
  if (!result)
    throw new Error(`${WORKFLOW} did not finish on ${sha.slice(0, 8)} within ${WAIT_MS / 3600_000} h`);
  const { latest, jobs } = result;

  if (latest.conclusion !== 'success') {
    for (const job of jobs.filter((j) => !['success', 'skipped'].includes(j.conclusion)))
      out(`    ${job.conclusion || job.status}  ${job.name}`);
    out(`\nNot green: ${latest.url}\nmain is untouched and the worktree is kept so you can look.`);
    code = 1;
  } else if (!flag('push')) {
    out('--- installing dependencies in the candidate worktree');
    run('pnpm', ['install', '--frozen-lockfile'], worktree);
    out(`\nGreen: ${latest.url}`);
    out('\nPlaytest first, in the desktop app. On the machine you play on, in a checkout of dev:');
    out('  git pull && ./launch.sh');
    out('The candidate (main plus dev) has its own checkout:');
    out(`  cd ${worktree} && ./launch.sh`);
    out('\nThen, when you are happy:');
    out('  pnpm promote --push');
  } else {
    git(['push', 'origin', 'HEAD:main'], worktree);
    pushed = true;
    out(`--- pushed ${sha.slice(0, 8)} to main after ${latest.url}`);
  }
} catch (e) {
  out(`--- ${e.message}`);
  out('main is untouched.');
  code = 1;
} finally {
  if (pushed) {
    removeWorktree();
    try {
      git(['branch', '-D', BRANCH]);
    } catch {
      out(`--- could not delete local ${BRANCH}`);
    }
  } else {
    out(`--- worktree kept at ${worktree}`);
  }
}

process.exit(code);
