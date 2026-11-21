import { afterEach, describe, expect, it } from 'vitest';
import { addRobots, economy, newSite } from '#lib/game/economy/index.ts';
import { lockRobot, newRobot, robots, setRobotCount } from '#lib/game/robots/index.ts';
import { loadItem, unloadItem } from './cargo.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { cargoMass } from './model.ts';
import { orderLabel, addOrder } from './orders.ts';

const DIGGER = 'digger';

function digger(): void {
  const parts: [string, number][] = [
    ['drum_excavator', 1],
    ['wheeled_chassis', 1],
    ['battery_dock', 1]
  ];
  robots.add(lockRobot(parts.reduce((d, [p, n]) => setRobotCount(d, p, n), newRobot(DIGGER, 'Digger'))));
}

const LANDER = {
  id: 'lander',
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 4],
    ['structure_truss', 1],
    ['cargo_bay', 1],
    ['landing_legs', 1]
  ] as const
};

afterEach(() => {
  robots.saved = [];
  robots.counter = 0;
});

describe('robots as cargo', () => {
  it('load from the idle robots of a site, weigh their mass, and join the site they are unloaded at', () => {
    const game = freshGame();
    digger();
    addDesign(LANDER);
    const earth = economy.sites[0]!;
    addRobots(economy, earth, DIGGER, 5);
    const v = spawn('lander');
    expect(loadItem(earth, v, { kind: 'robot', id: DIGGER }, 3)).toBe(3);
    expect(v.robots[DIGGER]).toBe(3);
    expect(earth.robots).toEqual([expect.objectContaining({ count: 2, material: null })]);
    expect(cargoMass(v)).toBeCloseTo(3 * 29.2, 6);

    const moon = newSite(economy, {
      worldBody: 'luna',
      bodyName: 'Luna',
      place: 'surface',
      region: 'luna-maria',
      angle: 0
    })!;
    expect(unloadItem(moon, v, { kind: 'all-cargo' }, null)).toBe(3);
    expect(v.robots).toEqual({});
    expect(moon.robots).toEqual([
      expect.objectContaining({ design: DIGGER, count: 3, material: 'lunar_regolith' })
    ]);
    const o = addOrder(v, { type: 'load', item: { kind: 'robot', id: DIGGER }, amount: 2 });
    expect(orderLabel(game, o)).toBe('Load 2 Digger');
  });
});
