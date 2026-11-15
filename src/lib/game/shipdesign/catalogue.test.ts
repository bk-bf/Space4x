import { describe, expect, it } from 'vitest';
import { buildings, material, reach, shipComponents } from '#lib/game/data/index.ts';
import { catalogue, isEngine, isTank, massOf } from './catalogue.ts';
import { PROPELLANT_KINDS, PROPELLANTS, isPropellant } from './propellants.ts';

const URL = /^https:\/\/\S+$/;
const NEW = ['cargo_bay', 'landing_legs', 'crew_capsule'];

describe('the component design records', () => {
  it('give every component a mass, a basis and a source where the figure is real', () => {
    for (const c of shipComponents) {
      expect(c.design, c.id).toBeDefined();
      expect(massOf(c), `${c.id} mass`).toBeGreaterThan(0);
      expect(c.design.basis.length, `${c.id} basis`).toBeGreaterThan(10);
      if (!c.design.estimated) expect(c.design.source, `${c.id} source`).toMatch(URL);
      if (c.design.source) expect(c.design.source, `${c.id} source`).toMatch(URL);
    }
  });

  it('keep every figure non-negative and name only known propellants', () => {
    for (const c of shipComponents) {
      for (const [key, value] of Object.entries(c.design))
        if (typeof value === 'number') expect(value, `${c.id} ${key}`).toBeGreaterThanOrEqual(0);
      for (const p of c.design.propellants ?? []) expect(isPropellant(p), `${c.id} ${p}`).toBe(true);
    }
  });

  it('give each engine exactly one propellant and each tank a volume and a list', () => {
    for (const c of shipComponents) {
      if (isEngine(c)) expect(c.design.propellants, c.id).toHaveLength(1);
      if (isTank(c)) {
        expect(c.design.propellants?.length, c.id).toBeGreaterThan(0);
        expect(c.design.mass, `${c.id} mass`).toBeGreaterThan(0);
      }
    }
  });

  it('let some tank hold every propellant an engine burns', () => {
    const held = new Set(shipComponents.filter(isTank).flatMap((c) => c.design.propellants ?? []));
    for (const c of shipComponents.filter(isEngine))
      expect(held.has(c.design.propellants![0]!), c.id).toBe(true);
  });

  it('build every component that exists in a yard the data knows', () => {
    const yards = new Set(buildings.map((b) => b.id));
    for (const c of shipComponents)
      for (const y of c.builtAt) expect(yards.has(y), `${c.id} ${y}`).toBe(true);
  });

  it('make each added component from materials the world can supply by its milestone', () => {
    for (const id of NEW) {
      const c = shipComponents.find((x) => x.id === id)!;
      const got = reach({ upTo: c.milestone });
      expect(got.components.has(id), `${id} at milestone ${c.milestone}`).toBe(true);
    }
  });

  it('count the first stage a design can start from among the milestone 1 unlocks', () => {
    const first = catalogue()
      .filter((c) => c.milestone === 1)
      .map((c) => c.id);
    expect(first).toEqual(
      expect.arrayContaining(['propellant_tank', 'kerolox_engine', 'cargo_bay', 'landing_legs'])
    );
  });
});

describe('the propellants', () => {
  it('name materials that exist and mix to one kilogram', () => {
    for (const k of PROPELLANT_KINDS) {
      const mix = PROPELLANTS[k].mix;
      for (const id of Object.keys(mix)) expect(() => material(id), `${k} ${id}`).not.toThrow();
      expect(
        Object.values(mix).reduce((a, b) => a + b, 0),
        k
      ).toBeCloseTo(1, 9);
    }
  });

  it('give hydrogen far less mass in a tank than kerosene and oxygen', () => {
    expect(PROPELLANTS.hydrolox.density).toBeLessThan(PROPELLANTS.kerolox.density / 2);
    expect(PROPELLANTS.hydrogen.density).toBeLessThan(PROPELLANTS.hydrolox.density);
  });
});
