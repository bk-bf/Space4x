#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const MANIFEST = 'tools/ci/scope.json';
const manifest = JSON.parse(readFileSync(new URL('./scope.json', import.meta.url), 'utf8'));

const globToRegExp = (glob) =>
  new RegExp(
    '^' +
      glob
        .split(/(\*\*\/|\*\*|\*)/)
        .map((part) =>
          part === '**/' ? '(?:.*/)?' : part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        )
        .join('') +
      '$'
  );

const rules = manifest.rules.map((r) => ({ ...r, res: r.paths.map(globToRegExp) }));
const ruleFor = (file) => rules.find((r) => r.res.some((re) => re.test(file)));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
const all = (value) => Object.fromEntries(manifest.legs.map((leg) => [leg, value]));

const i = process.argv.indexOf('--base');
const base = i >= 0 ? process.argv[i + 1] : 'HEAD^1';

const tracked = git('ls-files');
const unused = rules.flatMap((r) => r.paths.filter((p, n) => !tracked.some((f) => r.res[n].test(f))));
if (unused.length) {
  process.stderr.write(`${unused.length} pattern(s) in ${MANIFEST} match no tracked file:\n${unused.map((p) => `  ${p}`).join('\n')}\n`);
  process.exit(1);
}

let scope;
if (!base || /^0+$/.test(base) || !git('rev-parse', '--verify', '--quiet', `${base}^{commit}`).length) {
  scope = all(true);
} else {
  const files = git('diff', '--name-only', base, 'HEAD');
  const missing = files.filter((f) => tracked.includes(f) && !ruleFor(f));
  if (missing.length) {
    process.stderr.write(`${missing.length} file(s) match no rule in ${MANIFEST}:\n${missing.map((f) => `  ${f}`).join('\n')}\nGive each a rule: the legs it needs, or [].\n`);
    process.exit(1);
  }
  scope = all(false);
  for (const f of files) for (const leg of ruleFor(f)?.legs ?? []) scope[leg] = true;
}
for (const [leg, needed] of Object.entries(scope)) {
  process.stdout.write(`${leg}=${needed}\n`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${leg}=${needed}\n`);
}
