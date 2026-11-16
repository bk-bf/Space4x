import { describe, expect, it } from 'vitest';
import { asteroids, comets, moons } from '#lib/game/data/index.ts';
import { Game } from '#lib/game/index.ts';
import { flightSystem, FLYABLE, LANDABLE } from '#lib/game/ships/world.ts';
import { planTrip } from '#lib/game/flight/index.ts';
import { DAY } from '#lib/game/clock.ts';

const g = new Game();
const bodies = g.world.bodies;

describe('the Sol catalogue in the world', () => {
  it('holds every body once, and every moon beside a parent that is in the world', () => {
    expect(new Set(bodies.map((b) => b.id)).size).toBe(bodies.length);
    for (const b of bodies) if (b.parent) expect(g.body(b.parent), b.id).toBeDefined();
    expect(bodies.length).toBe(15 + moons.length + asteroids.length + comets.length);
  });

  it('keeps every moon outside its parent and its period within 10 percent of the two-body period', () => {
    const system = flightSystem(g);
    for (const m of moons) {
      const parent = system.bodies.find((b) => b.id === m.planet)!;
      expect(parent, m.id).toBeDefined();
      const a = m.aKm * 1000;
      expect(a, m.id).toBeGreaterThan(parent.radius);
      const kepler = (2 * Math.PI * Math.sqrt((a * a * a) / parent.gm)) / DAY;
      expect(m.period / kepler, m.id).toBeGreaterThan(0.9);
      expect(m.period / kepler, m.id).toBeLessThan(1.1);
    }
  });

  it('gives every body a flight body with mass and size, and makes all of them flyable', () => {
    const system = flightSystem(g);
    expect(system.bodies.length).toBe(bodies.length);
    for (const b of system.bodies) {
      expect(b.gm, b.id).toBeGreaterThan(0);
      expect(b.radius, b.id).toBeGreaterThan(0);
    }
    expect(FLYABLE.length).toBe(bodies.length);
    expect(LANDABLE.length).toBe(bodies.length - 5);
  });

  it('plans, or explains why not, a trip to a moon, a dwarf planet, a comet and a distant asteroid', () => {
    const ship = {
      dryMass: 20_000,
      payload: 0,
      propellant: 60_000,
      engine: { isp: 450, thrust: 2e5, thrustSeaLevel: 2e5, mass: 1000 }
    };
    const system = flightSystem(g);
    for (const id of ['phobos', 'charon', 'pluto', 'halley', 'himalia']) {
      expect(
        system.bodies.some((b) => b.id === id),
        id
      ).toBe(true);
      const plan = planTrip({
        from: { kind: 'orbit', body: 'earth' },
        to: { kind: 'orbit', body: id },
        departAfter: 0,
        ship,
        system
      });
      expect(plan.options.length + plan.reasons.length, id).toBeGreaterThan(0);
      for (const o of plan.options) {
        expect(Number.isFinite(o.duration), id).toBe(true);
        expect(Number.isFinite(o.dv), id).toBe(true);
      }
    }
  });
});
