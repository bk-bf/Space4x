#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const MANIFEST = 'tools/ci/scope.json';
export const manifest = JSON.parse(readFileSync(new URL('./scope.json', import.meta.url), 'utf8'));

const globToRegExp = (glob) =>
  new RegExp(
    '^' +
      glob
        .split(/(\*\*\/|\*\*|\*)/)
        .map((part) =>
          part === '**/'
            ? '(?:.*/)?'
            : part === '**'
              ? '.*'
              : part === '*'
                ? '[^/]*'
                : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        )
        .join('') +
      '$'
  );

export const scopeFor = ({ present, files }) => {
  const rules = manifest.rules.map((r) => ({ ...r, res: r.paths.map(globToRegExp) }));
  const ruleFor = (file) => rules.find((r) => r.res.some((re) => re.test(file)));
  const all = (value) => Object.fromEntries(manifest.legs.map((leg) => [leg, value]));

  const unused = rules.flatMap((r) => r.paths.filter((p, n) => !present.some((f) => r.res[n].test(f))));
  if (unused.length) {
    throw new Error(
      `${unused.length} pattern(s) in ${MANIFEST} match no tracked file:\n${unused.map((p) => `  ${p}`).join('\n')}`
    );
  }
  if (files === null) return all(true);

  const presentSet = new Set(present);
  const missing = files.filter((f) => presentSet.has(f) && !ruleFor(f));
  if (missing.length) {
    throw new Error(
      `${missing.length} file(s) match no rule in ${MANIFEST}:\n${missing.map((f) => `  ${f}`).join('\n')}\nGive each a rule: the legs it needs, or [].`
    );
  }
  const scope = all(false);
  for (const f of files) for (const leg of ruleFor(f)?.legs ?? []) scope[leg] = true;
  return scope;
};

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
const resolves = (ref) => {
  try {
    git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};

if (process.argv[1] === import.meta.filename) {
  const i = process.argv.indexOf('--base');
  const base = i >= 0 ? process.argv[i + 1] : 'HEAD^1';
  const resolvable = Boolean(base) && !/^0+$/.test(base) && resolves(base);
  let scope;
  try {
    scope = scopeFor({
      present: git('ls-files'),
      files: resolvable ? git('diff', '--name-only', base, 'HEAD') : null
    });
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
  for (const [leg, needed] of Object.entries(scope)) {
    process.stdout.write(`${leg}=${needed}\n`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${leg}=${needed}\n`);
  }
}
