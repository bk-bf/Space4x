import { afterEach, describe, expect, it } from 'vitest';
import { withFixture } from '#lib/game/mock/fixture/index.ts';
import {
  className,
  classes,
  classInUse,
  classStats,
  ClassRegistry,
  shipClass,
  shipClasses,
  specFor,
  statsFor
} from './classes.svelte';
import { projectById } from './data/index.ts';
import { economy } from './economy/index.ts';
import { Game } from './index';
import { setCount } from './shipdesign/edit.ts';
import { build, upperStage } from './shipdesign/fixtures.ts';

afterEach(() => {
  classes.saved = [];
});

describe('the ship class registry', () => {
  it('starts empty: no ship class is premade', () => {
    expect(shipClasses()).toEqual([]);
    expect(shipClass('bastion')).toBeUndefined();
    expect(className('bastion')).toBe('Unknown class');
    expect(classStats('bastion')).toBeUndefined();
  });

  it('holds the designs the player makes and finds them by id', () => {
    const r = new ClassRegistry();
    const a = build(upperStage, { id: 'a' });
    r.add(a);
    expect(r.find('a')).toBe(a);
    const renamed = { ...a, name: 'Dray' };
    r.replace(renamed);
    expect(r.find('a')?.name).toBe('Dray');
    r.remove('a');
    expect(r.saved).toEqual([]);
  });

  it('never hands out an id that is taken', () => {
    const r = new ClassRegistry();
    r.add(build([], { id: 'design-1' }));
    expect(r.newId()).toBe('design-2');
  });

  it('draws and measures a class from its design, once per edit', () => {
    const d = build(upperStage, { id: 'dray' });
    classes.add(d);
    expect(shipClass('dray')).toBe(specFor(d));
    expect(classStats('dray')).toBe(statsFor(d));
    expect(className('dray')).toBe('Test');
    const edited = setCount(d, 'propellant_tank', 6);
    classes.replace(edited);
    expect(shipClass('dray')).not.toBe(specFor(d));
    expect(classStats('dray')!.propellantMass).toBeGreaterThan(statsFor(d).propellantMass);
  });

  it('keeps a class in use while a fleet or a screen holds it', () => {
    const g = withFixture(new Game());
    expect(classInUse(g, 'pathfinder')).toBe(true);
    expect(classInUse(g, 'unused')).toBe(false);
  });
});

describe('research boosts', () => {
  it('give a class the solar array output of the level researched, and drop the cached stats', () => {
    const d = build([
      ['solar_array', 2],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1]
    ]);
    const before = statsFor(d).power.made;
    economy.done = [projectById('space_solar_arrays').number, projectById('solar_array_output_1').number];
    try {
      expect(statsFor(d).power.made / before).toBeCloseTo(1.5, 9);
    } finally {
      economy.done = [];
    }
    expect(statsFor(d).power.made).toBe(before);
  });
});
