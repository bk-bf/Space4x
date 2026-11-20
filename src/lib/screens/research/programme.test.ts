import { describe, expect, it } from 'vitest';
import { SHORT_NAMES, milestones, opensTags } from '#lib/game/data/index.ts';
import { programmeStatus, startEconomy, startProgramme, type Economy } from '#lib/game/economy/index.ts';
import { GROUPS, checkFor, milestoneIcon, openedBy, openedCount } from './programme.ts';

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

describe('the programme card checks what the game checks', () => {
  it('counts a blocker for each prerequisite not researched, and none exactly when the project is not locked', () => {
    for (const eco of states())
      for (const m of milestones) {
        const blockers = checkFor(eco, m).blockers;
        expect(blockers, `milestone ${m.number}`).toBe(
          m.requires.filter((r) => !eco.done.includes(r)).length
        );
        expect(blockers > 0, `milestone ${m.number}`).toBe(programmeStatus(eco, m) === 'locked');
      }
  });

  it('starts a project whose prerequisites are done while a lower unrelated one is still open, with nothing in stock', () => {
    const [, , bare] = states();
    const eco = bare!;
    eco.done = [1, 2, 3, 4];
    const six = milestones.find((m) => m.number === 6)!;
    expect(checkFor(eco, six).requires.every((r) => r.ok)).toBe(true);
    expect(programmeStatus(eco, six)).toBe('ready');
    expect(startProgramme(eco, eco.sites[0]!, 6)).toBe(true);
    expect(eco.running.map((p) => p.number)).toEqual([6]);
    expect(eco.done).not.toContain(5);
  });

  it('keeps a project locked until its own prerequisites are done', () => {
    const eco = startEconomy();
    const seventeen = milestones.find((m) => m.number === 17)!;
    expect(checkFor(eco, seventeen).requires.every((r) => !r.ok)).toBe(true);
    expect(programmeStatus(eco, seventeen)).toBe('locked');
    expect(startProgramme(eco, eco.sites[0]!, 17)).toBe(false);
  });
});

describe('the tiles', () => {
  it('give every milestone a short name and an icon', () => {
    for (const m of milestones) {
      expect(SHORT_NAMES[m.number], `milestone ${m.number}`).toBeTruthy();
      expect(milestoneIcon(m.number), `milestone ${m.number}`).toBeDefined();
    }
  });

  it('give the milestones different icons where the data allows', () => {
    const used = milestones.map((m) => {
      const i = milestoneIcon(m.number)!;
      return `${i.kind}:${i.id}`;
    });
    expect(new Set(used).size).toBeGreaterThan(milestones.length - 4);
  });

  it('group every status', () => {
    expect(GROUPS).toEqual(['running', 'ready', 'locked', 'done']);
  });

  it('list what is open at the start and what each milestone opens', () => {
    expect(openedCount(openedBy(0))).toBeGreaterThan(0);
    expect(openedBy(1).buildings.every((b) => opensTags(1).includes(b.milestone))).toBe(true);
    expect(openedCount(openedBy(1))).toBeGreaterThan(0);
  });
});
