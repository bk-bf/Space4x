import { afterEach, describe, expect, it } from 'vitest';
import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { setEngines } from './design';
import {
  buildOf,
  classBuild,
  classes,
  classInUse,
  classStats,
  ClassRegistry,
  fleetSpeed,
  shipClass,
  shipClasses,
  TONS_PER_MASS
} from './classes.svelte';
import { Game } from './index';
import { orderEtas } from './orders';

const shipped = classes.saved;

afterEach(() => {
  classes.saved = shipped;
});

describe('the ship class registry', () => {
  it('holds the shipped classes and finds them by id', () => {
    expect(shipClasses().map((c) => c.id)).toEqual(
      expect.arrayContaining([
        'pathfinder',
        'atlas',
        'mule',
        'bastion',
        'lancer',
        'pike',
        'ark',
        'lighthouse'
      ])
    );
    expect(shipClass('bastion')?.name).toBe('Bastion');
    expect(shipClass('nothing')).toBeUndefined();
  });

  it('takes tons, cost and yard kind from the part tables of the design', () => {
    const bastion = classStats('bastion')!;
    expect(classBuild('bastion')).toEqual(buildOf(bastion));
    expect(classBuild('bastion')!.tons).toBe(Math.round(bastion.mass * TONS_PER_MASS));
    expect(classBuild('bastion')!.kind).toBe('naval');
    expect(classBuild('pathfinder')!.kind).toBe('commercial');
    expect(classBuild('lighthouse')!.kind).toBe('commercial');
    expect(classBuild('bastion')!.bp).toBeGreaterThan(classBuild('lancer')!.bp);
  });

  it('gives a fleet the speed of its slowest class, the number the designer shows', () => {
    const g = withFixture(new Game());
    const picket = g.fleet('picket')!;
    expect(picket.ships.map((s) => s.classId)).toEqual(['bastion', 'lancer', 'lancer']);
    expect(fleetSpeed(picket)).toBe(classStats('bastion')!.speed);
    expect(fleetSpeed(picket)).toBeLessThan(classStats('lancer')!.speed);
    expect(fleetSpeed(g.fleet('survey')!)).toBe(classStats('pathfinder')!.speed);
    expect(fleetSpeed(g.fleet('convoy')!)).toBe(classStats('atlas')!.speed);
  });

  it('moves every fleet that carries a class the moment the class is redesigned', () => {
    const g = withFixture(new Game());
    const survey = g.fleet('survey')!;
    const before = fleetSpeed(survey);
    const eta = () => orderEtas(g, survey)[0];
    const slow = eta();
    const faster = setEngines(shipClass('pathfinder')!, 3);
    classes.replace(faster);
    expect(fleetSpeed(survey)).toBeGreaterThan(before);
    expect(fleetSpeed(survey)).toBe(classStats('pathfinder')!.speed);
    expect(eta()).not.toBe(slow);
  });

  it('refuses to forget a class a fleet or a registered user still needs', () => {
    const g = withFixture(new Game());
    expect(classInUse(g, 'bastion')).toBe(true);
    expect(classInUse(g, 'lighthouse')).toBe(false);
  });

  it('keeps separate registries separate', () => {
    const other = new ClassRegistry();
    other.remove('atlas');
    expect(other.find('atlas')).toBeUndefined();
    expect(classes.find('atlas')).toBeDefined();
  });
});
