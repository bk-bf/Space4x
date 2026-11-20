import { describe, expect, it } from 'vitest';
import { economy, homeSite } from '#lib/game/economy/index.ts';
import { PROPELLANTS } from '#lib/game/shipdesign/index.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { designCeiling, launch, payloadCeiling, planLaunch } from './launch.ts';
import { cargoMass, statsOf } from './model.ts';
import { ships } from './state.svelte.ts';

const orbiter = (boosters: number, tanks = 6, id = `orbiter-${boosters}`) =>
  addDesign({
    id,
    role: 'freighter',
    parts: [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', tanks],
      ['structure_truss', 1],
      ['cargo_bay', 2],
      ...(boosters ? [['booster', boosters] as const] : [])
    ],
    load: [['methalox', 1e9]]
  });

const methalox = (stock: Record<string, number>) =>
  Object.keys(PROPELLANTS.methalox.mix).reduce((t, m) => t + (stock[m] ?? 0), 0);

describe('a launch', () => {
  it('fills the ship and its boosters from stock, drops the boosters and leaves the ship in orbit', () => {
    const g = freshGame();
    const site = homeSite();
    orbiter(2);
    const v = spawn('orbiter-2');
    expect(v.boosters).toBe(2);
    const before = methalox(site.stock);
    const steel = site.stock.stainless_steel ?? 0;
    const burnedBefore = economy.ledger.burned;
    const plan = launch(g, site, { ship: v.id, cargo: { stainless_steel: 3000 } });
    expect(plan.ok).toBe(true);
    expect(plan.boosters).toBe(2);
    expect(plan.twr).toBeGreaterThanOrEqual(1.2);
    expect(plan.deltaV).toBeGreaterThanOrEqual(plan.need);
    expect(v.at.kind).toBe('orbit');
    expect(v.boosters).toBe(0);
    expect(v.cargo.stainless_steel).toBe(3000);
    expect(steel - (site.stock.stainless_steel ?? 0)).toBeCloseTo(3000, 6);
    expect(v.propellant.methalox).toBeCloseTo(plan.leftover, 6);
    expect(plan.leftover).toBeGreaterThan(0);
    const drawn = before - methalox(site.stock);
    const burned = economy.ledger.burned - burnedBefore;
    expect(drawn).toBeCloseTo((v.propellant.methalox ?? 0) + burned, 3);
    expect(ships.launches).toHaveLength(1);
    expect(ships.launches[0]).toMatchObject({ ship: v.name, boosters: 2, payload: 3000 });
    expect(ships.launches[0]!.perTonne).toBeGreaterThan(0);
  });

  it('refuses a ship whose own drive falls short of orbit and names the shortfall', () => {
    const g = freshGame();
    const site = homeSite();
    orbiter(0);
    const plan = planLaunch(g, site, { ship: spawn('orbiter-0').id, cargo: { stainless_steel: 8000 } });
    expect(plan.ok).toBe(false);
    expect(plan.boosters).toBe(0);
    expect(plan.reasons.join(' ')).toMatch(/Delta-v to orbit is .* km\/s/);
  });

  it('refuses a ship too heavy for its boosters on lift-off thrust', () => {
    const g = freshGame();
    const site = homeSite();
    addDesign({
      id: 'heavy',
      parts: [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 40],
        ['booster', 1]
      ],
      load: [['methalox', 1e9]]
    });
    const plan = planLaunch(g, site, { ship: spawn('heavy').id });
    expect(plan.ok).toBe(false);
    expect(plan.reasons.join(' ')).toMatch(/thrust to weight/);
  });

  it('cannot launch a second time on the boosters it dropped', () => {
    const g = freshGame();
    const site = homeSite();
    orbiter(2);
    const v = spawn('orbiter-2');
    expect(launch(g, site, { ship: v.id }).ok).toBe(true);
    v.at = { kind: 'site', site: site.id };
    g.time += 5 * 86400 * 1000;
    const again = planLaunch(g, site, { ship: v.id, cargo: { stainless_steel: 8000 } });
    expect(again.boosters).toBe(0);
    expect(again.ok).toBe(false);
  });

  it('refuses without propellant in stock', () => {
    const g = freshGame();
    const site = homeSite();
    orbiter(2);
    const v = spawn('orbiter-2');
    site.stock.lch4 = 0;
    const plan = planLaunch(g, site, { ship: v.id });
    expect(plan.ok).toBe(false);
    expect(plan.reasons.join(' ')).toMatch(/short by/);
  });

  it('refuses cargo that does not fit in the bays', () => {
    const g = freshGame();
    const site = homeSite();
    orbiter(2);
    const v = spawn('orbiter-2');
    const room = statsOf(v)!.payloadCapacity;
    expect(
      planLaunch(g, site, { ship: v.id, cargo: { stainless_steel: room + 1 } }).reasons.join(' ')
    ).toMatch(/holds/);
  });

  it('is limited by the launch rate: a pad is busy for its turnaround', () => {
    const g = freshGame();
    const site = homeSite();
    for (const grp of site.groups) if (grp.building === 'launch_site') grp.count = 1;
    orbiter(2);
    const a = spawn('orbiter-2');
    const b = spawn('orbiter-2');
    expect(launch(g, site, { ship: a.id }).ok).toBe(true);
    const second = planLaunch(g, site, { ship: b.id });
    expect(second.ok).toBe(false);
    expect(second.reasons.join(' ')).toMatch(/pad/);
    g.time += 5 * 86400 * 1000;
    expect(planLaunch(g, site, { ship: b.id }).ok).toBe(true);
  });
});

describe('the payload a ship lifts', () => {
  it('is the same tried on the design as on a ship built from it', () => {
    const g = freshGame();
    const site = homeSite();
    const one = orbiter(1, 3);
    const v = spawn('orbiter-1');
    const ceiling = payloadCeiling(g, site, v.id);
    expect(ceiling).toBeGreaterThan(0);
    expect(ceiling).toBeLessThan(statsOf(v)!.payloadCapacity);
    expect(designCeiling(one)).toBeCloseTo(ceiling, 3);
    expect(planLaunch(g, site, { ship: v.id }, { extraMass: ceiling * 0.99 }).reaches).toBe(true);
    expect(planLaunch(g, site, { ship: v.id }, { extraMass: ceiling * 1.01 }).reaches).toBe(false);
    expect(cargoMass(v)).toBe(0);
  });

  it('is the whole bay once there are boosters enough', () => {
    const g = freshGame();
    const site = homeSite();
    const two = orbiter(2);
    const v = spawn('orbiter-2');
    expect(payloadCeiling(g, site, v.id)).toBe(statsOf(v)!.payloadCapacity);
    expect(designCeiling(two)).toBe(statsOf(v)!.payloadCapacity);
  });
});
