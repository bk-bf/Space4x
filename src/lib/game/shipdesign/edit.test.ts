import { describe, expect, it } from 'vitest';
import {
  addPart,
  canLock,
  copyOf,
  countOf,
  lock,
  newDesign,
  removePart,
  rename,
  setCount,
  setLoad,
  setRole,
  setYard
} from './edit.ts';
import { designStats } from './stats.ts';
import { build, crewedVehicle } from './fixtures.ts';

describe('editing a design', () => {
  it('adds, counts and removes components and drops a part at zero', () => {
    let d = newDesign('a');
    d = addPart(d, 'propellant_tank');
    d = addPart(d, 'propellant_tank');
    expect(countOf(d, 'propellant_tank')).toBe(2);
    d = removePart(d, 'propellant_tank');
    expect(countOf(d, 'propellant_tank')).toBe(1);
    d = removePart(d, 'propellant_tank');
    expect(d.parts).toEqual([]);
    expect(setCount(d, 'nothing', 3)).toBe(d);
  });

  it('keeps tanks full as they grow and fills the tank for the engine that arrives', () => {
    let d = newDesign('a');
    d = setCount(d, 'propellant_tank', 2);
    expect(d.load).toEqual({});
    d = setCount(d, 'kerolox_engine', 1);
    const full = designStats(d).capacity.kerolox!;
    expect(d.load.kerolox).toBeCloseTo(full, 6);
    d = setCount(d, 'propellant_tank', 3);
    expect(d.load.kerolox).toBeCloseTo(designStats(d).capacity.kerolox!, 6);
    d = setLoad(d, 'kerolox', 1000);
    d = setCount(d, 'propellant_tank', 4);
    expect(d.load.kerolox).toBe(1000);
    d = setCount(d, 'propellant_tank', 0);
    expect(d.load.kerolox).toBeUndefined();
  });

  it('clamps a load to the room there is', () => {
    const d = build([
      ['kerolox_engine', 1],
      ['propellant_tank', 1]
    ]);
    const room = designStats(d).capacity.kerolox!;
    expect(setLoad(d, 'kerolox', room * 2).load.kerolox).toBeCloseTo(room, 6);
    expect(setLoad(d, 'kerolox', -5).load.kerolox).toBe(0);
    expect(setLoad(d, 'xenon', 100).load.xenon).toBe(0);
  });

  it('renames and changes role and yard', () => {
    const d = newDesign('a');
    expect(rename(d, 'Dray').name).toBe('Dray');
    expect(setRole(d, 'lander').role).toBe('lander');
    expect(setYard(d, 'orbital_shipyard').yard).toBe('orbital_shipyard');
  });
});

describe('locking a design', () => {
  const good = build(crewedVehicle, { role: 'capsule' });

  it('is refused while there are errors and allowed once they are resolved', () => {
    const bad = build([['kerolox_engine', 1]]);
    expect(canLock(bad)).toBe(false);
    expect(lock(bad)).toBe(bad);
    expect(canLock(good)).toBe(true);
    expect(lock(good).locked).toBe(true);
  });

  it('refuses a component that is still locked in the game', () => {
    expect(canLock(good, (tag) => tag <= 1)).toBe(false);
  });

  it('freezes the class: no edit changes it, a copy is open', () => {
    const locked = lock(good);
    expect(addPart(locked, 'radiator')).toBe(locked);
    expect(removePart(locked, 'radiator')).toBe(locked);
    expect(setLoad(locked, 'hydrolox', 0)).toBe(locked);
    expect(rename(locked, 'x')).toBe(locked);
    expect(setRole(locked, 'probe')).toBe(locked);
    expect(setYard(locked, 'rocket_factory')).toBe(locked);
    const copy = copyOf(locked, 'b');
    expect(copy.locked).toBe(false);
    expect(copy.id).toBe('b');
    expect(copy.name).toBe('Test copy');
    expect(copy.parts).toEqual(locked.parts);
    expect(addPart(copy, 'radiator')).not.toBe(copy);
  });

  it('cannot lock twice', () => {
    expect(canLock(lock(good))).toBe(false);
  });
});
