import { describe, expect, it } from 'vitest';
import { projectById, projects, unlockedAt } from '#lib/game/data/index.ts';
import { createProject, programmeStatus, startEconomy, type Economy } from '#lib/game/economy/index.ts';
import { projectIcon } from '#lib/gfx/icons/index.ts';
import { GROUPS, checkFor, effectLines, openedBy, openedCount } from './programme.ts';

const num = (id: string) => projectById(id).number;

const states = (): Economy[] => {
  const start = startEconomy();
  const later = startEconomy();
  later.done = [1, 2, 3, 4, 5];
  const bare = startEconomy();
  bare.done = [1, 2, 3, 4, 5];
  bare.sites[0]!.stock = {};
  bare.sites[0]!.groups = [];
  return [start, later, bare];
};

describe('the project card checks what the game checks', () => {
  it('counts a blocker for each prerequisite not researched, and none exactly when the project is not locked', () => {
    for (const eco of states())
      for (const p of projects) {
        const blockers = checkFor(eco, p).blockers;
        expect(blockers, `project ${p.number}`).toBe(p.requires.filter((r) => !eco.done.includes(r)).length);
        expect(blockers > 0, `project ${p.number}`).toBe(programmeStatus(eco, p) === 'locked');
      }
  });

  it('creates a project whose prerequisites are done while an unrelated one is still open, with nothing in stock', () => {
    const [, , bare] = states();
    const eco = bare!;
    const fission = projectById('small_modular_fission');
    eco.done = [num('closed_loop_water_and_air')];
    expect(checkFor(eco, fission).requires.every((r) => r.ok)).toBe(true);
    expect(programmeStatus(eco, fission)).toBe('ready');
    expect(createProject(eco, fission.number, eco.scientists[0]!.id, 0)).toBe(true);
    expect(eco.running.map((p) => p.number)).toEqual([fission.number]);
  });

  it('keeps a project locked until its own prerequisites are done', () => {
    const eco = startEconomy();
    const jump = projectById('jump_point_stabilisation');
    expect(checkFor(eco, jump).requires.every((r) => !r.ok)).toBe(true);
    expect(programmeStatus(eco, jump)).toBe('locked');
    expect(createProject(eco, jump.number, eco.scientists[0]!.id, 1)).toBe(false);
  });
});

describe('the tiles', () => {
  it('give every project an icon but construction rate and the biosphere', () => {
    const without = projects.filter((p) => !projectIcon(p.number)).map((p) => p.line ?? p.id);
    expect([...new Set(without)]).toEqual(['construction_rate', 'biosphere']);
  });

  it('group every status', () => {
    expect(GROUPS).toEqual(['running', 'queued', 'ready', 'locked', 'done']);
  });

  it('list what is open at the start, what each project opens and what each boost level does', () => {
    expect(openedCount(openedBy(0))).toBeGreaterThan(0);
    const transfer = num('propellant_transfer_in_orbit');
    expect(openedBy(transfer).buildings).toEqual(unlockedAt(transfer).buildings);
    expect(openedCount(openedBy(transfer))).toBeGreaterThan(0);
    expect(effectLines(projectById('research_rate_2'))).toEqual(['×1.4 research points a lab']);
  });
});
