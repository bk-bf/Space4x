import { afterEach, describe, expect, it } from 'vitest';
import { DAY, Game } from '#lib/game/index.ts';
import { ground } from './ground.svelte.ts';
import {
  KINDS,
  STANCES,
  menOf,
  mockFormations,
  mockUnits,
  supplyUseOf,
  type Formation,
  type Unit
} from './model.ts';
import {
  DEMORALISED_BELOW,
  STARVING_BELOW,
  advanceGround,
  moraleTarget,
  stepUnit,
  supplyDrift
} from './sim.ts';
import './system.ts';

const unit = (over: Partial<Unit> = {}): Unit => ({
  id: 'u',
  name: 'Test',
  kind: 'inf',
  formation: 'f',
  strength: 80,
  morale: 70,
  supply: 50,
  stance: 'Dug in',
  trainedAt: 'Earth',
  ...over
});

const camp: Formation = { id: 'f', name: 'Camp', place: 'Mars' };

describe('supply', () => {
  it('drifts by the intake minus the kind use times the stance multiplier', () => {
    expect(supplyDrift(unit({ stance: 'Dug in' }), 2)).toBeCloseTo(2 - 4 * 0.45);
    expect(supplyDrift(unit({ stance: 'Advance' }), 2)).toBeCloseTo(2 - 4 * 1.4);
    expect(supplyDrift(unit({ kind: 'tank', stance: 'Reserve' }), 2)).toBeCloseTo(2 - 9 * 0.3);
  });

  it('falls faster when advancing than when dug in', () => {
    const dug = unit({ stance: 'Dug in' }),
      push = unit({ stance: 'Advance' });
    stepUnit(dug, 2, 5);
    stepUnit(push, 2, 5);
    expect(push.supply).toBeLessThan(dug.supply);
  });

  it('stays between 0 and 100', () => {
    const empty = unit({ stance: 'Advance', supply: 3 });
    stepUnit(empty, 0, 30);
    expect(empty.supply).toBe(0);
    const full = unit({ kind: 'hq', stance: 'Reserve', supply: 99 });
    stepUnit(full, 4, 30);
    expect(full.supply).toBe(100);
  });
});

describe('morale', () => {
  it('has a higher target with more supply and in a calmer stance', () => {
    expect(moraleTarget({ supply: 90, stance: 'Dug in' })).toBeGreaterThan(
      moraleTarget({ supply: 30, stance: 'Dug in' })
    );
    expect(moraleTarget({ supply: 60, stance: 'Reserve' })).toBeGreaterThan(
      moraleTarget({ supply: 60, stance: 'Advance' })
    );
  });

  it('drops hard once supply runs short', () => {
    const fine = moraleTarget({ supply: DEMORALISED_BELOW, stance: 'Dug in' });
    expect(moraleTarget({ supply: 0, stance: 'Dug in' })).toBeLessThan(fine - 20);
  });

  it('moves toward the target and never past it', () => {
    const u = unit({ morale: 100, supply: 50 });
    const target = moraleTarget(u);
    stepUnit(u, supplyUseOf(u) ? 1.8 : 0, 10);
    expect(u.morale).toBeLessThan(100);
    expect(u.morale).toBeGreaterThan(target - 1);
  });
});

describe('strength', () => {
  it('erodes while the unit is out of supply', () => {
    const u = unit({ supply: 0, stance: 'Advance' });
    stepUnit(u, 0, 10);
    expect(u.strength).toBeLessThan(80);
  });

  it('recovers while well supplied and not advancing, and stays at 100', () => {
    const u = unit({ supply: 90, morale: 90, strength: 70 });
    stepUnit(u, 4, 20);
    expect(u.strength).toBeGreaterThan(70);
    stepUnit(u, 4, 400);
    expect(u.strength).toBe(100);
  });

  it('does not recover while advancing', () => {
    const u = unit({ supply: 90, morale: 90, strength: 70, stance: 'Advance' });
    stepUnit(u, 8, 5);
    expect(u.strength).toBe(70);
  });

  it('only erodes below the starvation threshold', () => {
    const u = unit({ supply: STARVING_BELOW + 5, strength: 60, morale: 40 });
    stepUnit(u, 4 * 0.45, 3);
    expect(u.strength).toBe(60);
  });
});

describe('advanceGround', () => {
  it('gives the same result for one long step as for the days it is made of', () => {
    const a = [unit({ stance: 'Support', supply: 70 })],
      b = [unit({ stance: 'Support', supply: 70 })];
    advanceGround(a, [camp], 30 * DAY);
    for (let i = 0; i < 30; i++) advanceGround(b, [camp], DAY);
    expect(a[0]!.supply).toBeCloseTo(b[0]!.supply, 6);
    expect(a[0]!.morale).toBeCloseTo(b[0]!.morale, 6);
    expect(a[0]!.strength).toBeCloseTo(b[0]!.strength, 6);
  });

  it('is exponential in morale so a part day moves it a part of the way', () => {
    const half = [unit({ morale: 100 })],
      whole = [unit({ morale: 100 })];
    advanceGround(half, [camp], DAY / 2);
    advanceGround(whole, [camp], DAY);
    expect(100 - half[0]!.morale).toBeLessThan(100 - whole[0]!.morale);
  });

  it('draws supply from the place the unit stands in', () => {
    const near = [unit({ formation: 'near', supply: 40 })],
      far = [unit({ formation: 'far', supply: 40 })];
    const places: Formation[] = [
      { id: 'near', name: 'Home', place: 'Earth' },
      { id: 'far', name: 'Outpost', place: 'Mars' }
    ];
    advanceGround([...near, ...far], places, 10 * DAY);
    expect(near[0]!.supply).toBeGreaterThan(far[0]!.supply);
  });

  it('ignores zero, negative and invalid time', () => {
    const u = [unit()];
    advanceGround(u, [camp], 0);
    advanceGround(u, [camp], -DAY);
    advanceGround(u, [camp], Number.NaN);
    expect(u[0]).toEqual(unit());
  });
});

describe('the registered ground system', () => {
  it('runs on the game clock and changes strength, morale and supply with it', () => {
    const before = ground.units.map((u) => ({ id: u.id, supply: u.supply, morale: u.morale }));
    const g = new Game();
    g.advance(20 * DAY);
    const changed = ground.units.filter(
      (u, i) => u.supply !== before[i]!.supply || u.morale !== before[i]!.morale
    );
    expect(changed.length).toBeGreaterThan(ground.units.length / 2);
    const armour = ground.units.find((u) => u.kind === 'tank' && u.formation === 'home-guard')!;
    expect(armour.supply).toBeGreaterThan(before.find((b) => b.id === armour.id)!.supply);
  });

  it('logs nothing about the units, so the map event order is untouched', () => {
    const g = new Game();
    g.advance(60 * DAY);
    const named = g.events.filter((e) => ground.units.some((u) => e.text.includes(u.name)));
    expect(named).toEqual([]);
  });
});

describe('the mock forces', () => {
  it('keeps every formation on Earth, the home guard as the mockup lists it, and every unit in a formation', () => {
    const units = mockUnits(),
      formations = mockFormations();
    const guard = units.filter((u) => u.formation === 'home-guard');
    expect(guard).toHaveLength(13);
    expect(guard.filter((u) => u.kind === 'inf')).toHaveLength(6);
    expect(formations.filter((f) => f.place === 'Earth')).toHaveLength(formations.length);
    for (const u of units) expect(formations.some((f) => f.id === u.formation)).toBe(true);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });

  it('computes men and supply use from strength and stance', () => {
    expect(menOf({ kind: 'inf', strength: 50 })).toBe(300);
    expect(menOf({ kind: 'inf', strength: 100 })).toBe(KINDS.inf.men);
    expect(supplyUseOf({ kind: 'inf', stance: 'Advance' })).toBe(5.6);
    expect(STANCES).toHaveLength(4);
  });
});

describe('the ground store', () => {
  afterEach(() => {
    ground.selectFormation('home-guard');
  });

  it('selects a formation and the first of its units', () => {
    ground.selectFormation('capital-guard');
    expect(ground.formation?.name).toBe('Capital guard');
    expect(ground.unit?.formation).toBe('capital-guard');
  });

  it('changes a unit stance', () => {
    const u = ground.units.find((x) => x.kind === 'tank')!;
    ground.setStance(u.id, 'Advance');
    expect(ground.units.find((x) => x.id === u.id)!.stance).toBe('Advance');
    ground.setStance(u.id, 'Reserve');
  });

  it('moves a unit between formations and counts follow', () => {
    const from = ground.unitsOf('home-guard').length,
      to = ground.unitsOf('coastal-guard').length;
    ground.selectFormation('home-guard');
    const u = ground.unitsOf('home-guard').find((x) => x.kind === 'art')!;
    ground.selectUnit(u.id);
    ground.moveUnit(u.id, 'coastal-guard');
    expect(ground.unitsOf('home-guard')).toHaveLength(from - 1);
    expect(ground.unitsOf('coastal-guard')).toHaveLength(to + 1);
    expect(ground.unit?.formation).toBe('home-guard');
    ground.moveUnit(u.id, 'home-guard');
    expect(ground.unitsOf('home-guard')).toHaveLength(from);
  });

  it('creates a formation, moves a unit into it and disbands it into a sibling', () => {
    const before = ground.formationsAt('Earth').length;
    const id = ground.create('Earth');
    expect(ground.formationsAt('Earth')).toHaveLength(before + 1);
    expect(ground.formationId).toBe(id);
    const u = ground.unitsOf('home-guard')[0]!;
    ground.moveUnit(u.id, id);
    expect(ground.unitsOf(id)).toHaveLength(1);
    expect(ground.disbandable(id)).toBe(true);
    ground.disband(id);
    expect(ground.formationsAt('Earth')).toHaveLength(before);
    expect(ground.units.find((x) => x.id === u.id)!.formation).toBe('home-guard');
    expect(ground.formationId).toBe('home-guard');
  });

  it('refuses to disband the only formation of a place while it has units', () => {
    const id = ground.create('Orbit');
    const u = ground.unitsOf('home-guard')[0]!;
    ground.moveUnit(u.id, id);
    expect(ground.disbandable(id)).toBe(false);
    ground.disband(id);
    expect(ground.formations.some((f) => f.id === id)).toBe(true);
    ground.moveUnit(u.id, 'home-guard');
    ground.disband(id);
    expect(ground.formations.some((f) => f.id === id)).toBe(false);
  });
});
