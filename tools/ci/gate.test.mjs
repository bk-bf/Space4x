import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { manifest, scopeFor } from './scope.mjs';
import { BASE_REF, LEG_SCRIPTS, planLegs } from './gate.mjs';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const ALL = Object.fromEntries(manifest.legs.map((leg) => [leg, true]));
const NONE = Object.fromEntries(manifest.legs.map((leg) => [leg, false]));
const legsOf = (files) => scopeFor({ present: tracked, files });

test('every tracked file matches a scope rule', () => {
  assert.doesNotThrow(() => scopeFor({ present: tracked, files: tracked }));
});

test('a docs-only change runs no leg', () => {
  assert.deepEqual(legsOf(['README.md', 'AGENTS.md']), NONE);
});

test('a change under src/ runs every leg', () => {
  assert.deepEqual(legsOf(['src/lib/game/index.ts']), ALL);
});

test('a change under tools/ci/ runs every leg, including the new gate', () => {
  assert.deepEqual(legsOf(['tools/ci/gate.mjs']), ALL);
  assert.deepEqual(legsOf(['tools/ci/gate.test.mjs']), ALL);
});

test('a config file runs only the leg it configures', () => {
  assert.deepEqual(legsOf(['knip.json']), { ...NONE, knip: true });
  assert.deepEqual(legsOf(['eslint.config.js']), { ...NONE, lint: true });
  assert.deepEqual(legsOf(['vitest.config.ts']), { ...NONE, unit: true });
});

test('a deleted file keeps its rule without being present', () => {
  assert.deepEqual(scopeFor({ present: tracked, files: ['src/gone.ts'] }), ALL);
});

test('a changed tracked file with no rule fails the scope', () => {
  assert.throws(
    () => scopeFor({ present: [...tracked, 'mystery.bin'], files: ['mystery.bin'] }),
    /match no rule/
  );
});

test('a pattern that matches no present file fails the scope', () => {
  assert.throws(() => scopeFor({ present: ['README.md'], files: [] }), /match no tracked file/);
});

test('no base runs every leg', () => {
  assert.deepEqual(scopeFor({ present: tracked, files: null }), ALL);
});

test('planLegs keeps the CI order and marks skipped legs', () => {
  const plan = planLegs({ ...NONE, lint: true, format: true });
  assert.deepEqual(
    plan.map((p) => [p.leg, p.run]),
    [
      ['typecheck', false],
      ['lint', true],
      ['knip', false],
      ['format', true],
      ['unit', false],
      ['layout', false]
    ]
  );
  assert.deepEqual(
    plan.map((p) => p.leg),
    ['typecheck', 'lint', 'knip', 'format', 'unit', 'layout']
  );
});

test('every leg maps to the package script CI runs', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(LEG_SCRIPTS).sort(), [...manifest.legs].sort());
  for (const script of Object.values(LEG_SCRIPTS))
    assert.ok(scripts[script], `package.json has no ${script}`);
});

test('the gate diffs against dev, where changes land', () => {
  assert.equal(BASE_REF, 'origin/dev');
});

test('the promotion workflow runs every leg on purpose and is listed as full', () => {
  assert.deepEqual(manifest.full, ['.github/workflows/promote.yml']);
  assert.ok(tracked.includes('.github/workflows/promote.yml'));
});

test('the browser-build files have scope rules', () => {
  assert.deepEqual(legsOf(['install.sh', 'deploy/update', 'deploy/build']), NONE);
  assert.deepEqual(legsOf(['tools/serve.mjs']), { ...NONE, lint: true, knip: true, format: true });
  assert.deepEqual(legsOf(['tools/promote.mjs']), { ...NONE, lint: true, knip: true, format: true });
});
