import { describe, expect, it } from 'vitest';
import { MIN_LIFTOFF_TWR } from '#lib/game/flight/index.ts';
import { build } from './fixtures.ts';
import { climbWith, designStats } from './index.ts';

const orbiter = [
  ['chemical_engine_methalox', 1],
  ['propellant_tank', 6],
  ['structure_truss', 1],
  ['cargo_bay', 2]
] as const;

const withBoosters = (n: number) =>
  build([...orbiter, ['booster', n]], { role: 'freighter', yard: 'rocket_factory' });

const codes = (n: number) => designStats(withBoosters(n)).issues.map((i) => i.code);

describe('boosters', () => {
  it('add up to Super Heavy when 33 are mounted', () => {
    const b = designStats(withBoosters(33)).boosters!;
    expect(b.count).toBe(33);
    expect(b.mass / 1000).toBeCloseTo(275, 0);
    expect(b.load / 1000).toBeCloseTo(3400, 0);
    expect(b.thrustSeaLevel / 1e6).toBeCloseTo(73.5, 1);
    expect(b.isp).toBeCloseTo(347, 6);
  });

  it('stay out of the ship it leaves in orbit but in what is built', () => {
    const bare = designStats(withBoosters(0));
    const boosted = designStats(withBoosters(3));
    expect(boosted.dryMass).toBe(bare.dryMass);
    expect(boosted.loaded.deltaV).toBe(bare.loaded.deltaV);
    expect(boosted.drives).toEqual(bare.drives);
    expect(boosted.cost.stainless_steel).toBeGreaterThan((bare.cost.stainless_steel ?? 0) + 29_000);
    expect(boosted.lines.find((l) => l.component === 'booster')?.count).toBe(3);
  });

  it('lift the ship off and add their delta-v to its own on the climb to orbit', () => {
    const bare = designStats(withBoosters(0)).climb;
    const two = designStats(withBoosters(2)).climb;
    expect(bare.boosterDv).toBe(0);
    expect(bare.deltaV).toBeLessThan(bare.need);
    expect(bare.reaches).toBe(false);
    expect(two.shipDv).toBeCloseTo(bare.shipDv, 6);
    expect(two.boosterDv).toBeGreaterThan(2000);
    expect(two.deltaV).toBe(two.boosterDv + two.shipDv);
    expect(two.liftoffThrust).toBeCloseTo(2 * 2_227_000, 0);
    expect(two.twr).toBeGreaterThan(MIN_LIFTOFF_TWR);
    expect(two.reaches).toBe(true);
    expect(two.boosterBurned).toBe(two.boosterLoad);
    expect(two.leftover).toBeGreaterThan(0);
    expect(two.leftover).toBeLessThan(designStats(withBoosters(2)).propellantMass);
  });

  it('cannot lift a heavy ship that too few of them hold up', () => {
    const heavy = build([...orbiter, ['propellant_tank', 40], ['booster', 1]], {
      role: 'freighter',
      yard: 'rocket_factory'
    });
    const s = designStats(heavy);
    expect(s.climb.twr).toBeLessThan(MIN_LIFTOFF_TWR);
    expect(s.issues.map((i) => i.code)).toContain('no-liftoff');
  });

  it('warns, without blocking the design, when a ship built on Earth falls short of orbit', () => {
    expect(codes(0)).toContain('short-of-orbit');
    expect(designStats(withBoosters(0)).errors).toBe(0);
    expect(codes(2)).not.toContain('short-of-orbit');
    expect(codes(2)).not.toContain('no-liftoff');
  });

  it('are built only on Earth', () => {
    const orbital = build([...orbiter, ['booster', 2]], { role: 'freighter', yard: 'orbital_shipyard' });
    expect(designStats(orbital).issues.map((i) => i.code)).toContain('no-yard');
  });

  it('do not make a drive: a ship of boosters alone has no engine', () => {
    const only = build([['booster', 4]], { yard: 'rocket_factory' });
    expect(designStats(only).issues.map((i) => i.code)).toContain('no-engine');
  });

  it('carry less payload to orbit than the bay holds when there are too few', () => {
    const s = designStats(withBoosters(1));
    expect(climbWith(s, 0).deltaV).toBeGreaterThan(climbWith(s, s.payloadCapacity).deltaV);
  });
});
