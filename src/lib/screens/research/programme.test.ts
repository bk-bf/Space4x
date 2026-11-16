import { describe, expect, it } from 'vitest';
import { SHORT_NAMES, milestones, opensTags } from '#lib/game/data/index.ts';
import {
  missingFor,
  newSite,
  programmeBill,
  programmeStatus,
  startEconomy,
  startProgramme,
  type Economy
} from '#lib/game/economy/index.ts';
import { GROUPS, checkFor, milestoneIcon, openedBy, openedCount } from './programme.ts';

const states = (): Economy[] => {
  const start = startEconomy();
  const later = startEconomy();
  later.done = [1, 2, 3, 4, 5];
  const moon = startEconomy();
  moon.done = [1, 2, 3, 4, 5];
  const site = newSite(moon, {
    worldBody: 'luna',
    bodyName: 'Luna',
    place: 'surface',
    region: 'luna-south-pole',
    angle: 0
  })!;
  site.population = 1;
  return [start, later, moon];
};

describe('the programme card checks what the game checks', () => {
  it('counts exactly the blockers that missingFor reports, in every state and for every milestone', () => {
    for (const eco of states())
      for (const m of milestones) {
        const site = eco.sites[0]!;
        expect(checkFor(eco, site, m).blockers, `milestone ${m.number}`).toBe(
          missingFor(eco, site, m).length
        );
      }
  });

  it('lists each site need with whether it is met', () => {
    const [start, , moon] = states();
    const six = milestones.find((m) => m.number === 6)!;
    expect(checkFor(start!, start!.sites[0]!, six).sites).toEqual([
      { label: 'Crewed outpost on the Moon', ok: false }
    ]);
    expect(checkFor(moon!, moon!.sites[0]!, six).sites).toEqual([
      { label: 'Crewed outpost on the Moon', ok: true }
    ]);
  });

  it('is ready only when nothing blocks it', () => {
    for (const eco of states())
      for (const m of milestones)
        if (programmeStatus(eco, eco.sites[0]!, m) === 'ready')
          expect(checkFor(eco, eco.sites[0]!, m).blockers).toBe(0);
  });

  it('lets a milestone start while a lower unrelated one is still open', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4];
    const site = eco.sites[0]!;
    const six = milestones.find((m) => m.number === 6)!;
    const check = checkFor(eco, site, six);
    expect(check.requires.every((r) => r.ok)).toBe(true);
    expect(programmeStatus(eco, site, six)).not.toBe('locked');
    expect(
      programmeStatus(
        eco,
        site,
        milestones.find((m) => m.number === 5)!
      )
    ).not.toBe('done');
  });

  it('starts a milestone whose prerequisites are done while a lower unrelated one is still open', () => {
    const [, , moon] = states();
    const eco = moon!;
    eco.done = [1, 2, 3, 4];
    const site = eco.sites[0]!;
    const six = milestones.find((m) => m.number === 6)!;
    for (const [id, need] of Object.entries(programmeBill(six))) site.stock[id] = need * 2;
    expect(programmeStatus(eco, site, six)).toBe('ready');
    expect(startProgramme(eco, site, 6)).toBe(true);
    expect(eco.running.map((p) => p.number)).toEqual([6]);
    expect(eco.done).not.toContain(5);
  });

  it('keeps a milestone locked until its own prerequisites are done', () => {
    const eco = startEconomy();
    const seventeen = milestones.find((m) => m.number === 17)!;
    const check = checkFor(eco, eco.sites[0]!, seventeen);
    expect(check.requires.every((r) => !r.ok)).toBe(true);
    expect(programmeStatus(eco, eco.sites[0]!, seventeen)).toBe('locked');
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
    expect(GROUPS).toEqual(['running', 'ready', 'waiting', 'locked', 'done']);
  });

  it('list what is open at the start and what each milestone opens', () => {
    expect(openedCount(openedBy(0))).toBeGreaterThan(0);
    expect(openedBy(1).buildings.every((b) => opensTags(1).includes(b.milestone))).toBe(true);
    expect(openedCount(openedBy(1))).toBeGreaterThan(0);
  });
});
