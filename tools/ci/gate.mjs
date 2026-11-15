#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { manifest, scopeFor } from './scope.mjs';

export const BASE_REF = 'origin/dev';

export const LEG_SCRIPTS = {
  typecheck: 'check:types',
  lint: 'lint',
  knip: 'knip',
  format: 'format:check',
  unit: 'test',
  layout: 'test:layout'
};

export const planLegs = (scope) =>
  manifest.legs.map((leg) => ({ leg, script: LEG_SCRIPTS[leg], run: scope[leg] === true }));

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
const resolves = (ref) => {
  try {
    git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
const untracked = () => git('ls-files', '--others', '--exclude-standard');

const die = (msg, code = 2) => {
  process.stderr.write(`[gate] ${msg}\n`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const i = argv.indexOf('--base');
  const base = i >= 0 ? argv[i + 1] : undefined;
  const unknown = argv.filter((a, n) => a !== '--all' && a !== '--base' && argv[n - 1] !== '--base');
  if (i >= 0 && (base === undefined || base.startsWith('--'))) die('--base needs a ref');
  if (unknown.length) die(`unknown argument(s): ${unknown.join(' ')}`);
  return { all: argv.includes('--all'), base };
};

const defaultBase = () => {
  if (!resolves(BASE_REF)) return null;
  try {
    return git('merge-base', 'HEAD', BASE_REF)[0] ?? null;
  } catch {
    return null;
  }
};

const main = () => {
  const { all, base: explicitBase } = parseArgs(process.argv.slice(2));
  const present = [...new Set([...git('ls-files'), ...untracked()])];

  let base = null;
  let files = null;
  if (!all) {
    base = explicitBase ?? defaultBase();
    if (base !== null && !resolves(base)) die(`base ${base} does not resolve`);
    if (base !== null) files = [...new Set([...git('diff', '--name-only', base), ...untracked()])];
  }

  let scope;
  try {
    scope = scopeFor({ present, files });
  } catch (e) {
    die(e.message, 1);
  }

  const plan = planLegs(scope);
  const runs = plan.filter((p) => p.run);
  const skips = plan.filter((p) => !p.run);
  const describe = all
    ? 'every leg (--all)'
    : base === null
      ? `no base to diff against (${BASE_REF} missing); every leg`
      : `${base} (${files.length} changed path(s): committed, staged, unstaged and untracked)`;
  process.stdout.write(`[gate] scope against ${describe}\n`);
  for (const p of runs) process.stdout.write(`[gate] run   ${p.leg}  (pnpm run ${p.script})\n`);
  for (const p of skips) process.stdout.write(`[gate] skip  ${p.leg}  (no changed path needs it)\n`);

  for (const p of runs) {
    process.stdout.write(`[gate] > ${p.leg}\n`);
    const r = spawnSync('pnpm', ['run', p.script], { stdio: 'inherit' });
    if (r.error) die(`${p.leg}: ${r.error.message}`, 127);
    if (r.status !== 0) die(`${p.leg} failed with exit ${r.status ?? 1}; stopping`, r.status ?? 1);
  }
  process.stdout.write(
    runs.length ? `[gate] passed: ${runs.map((p) => p.leg).join(' ')}\n` : '[gate] passed: nothing to run\n'
  );
};

if (process.argv[1] === import.meta.filename) main();
