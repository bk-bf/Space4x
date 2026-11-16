import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { classes } from './classes.svelte.ts';
import { formatDay } from './clock.ts';
import { economy, flowsOf, remainingMass, siteAt, standing } from './economy/index.ts';
import { PathPlayer } from './playPath.ts';
import { freshGame } from './ships/fixtures.ts';
import { ships } from './ships/index.ts';
import { isSurveyed } from './survey.svelte.ts';

const year = (ms: number) => new Date(ms).getUTCFullYear();

describe('the scripted player from the start state', () => {
  it('reaches milestones 1 to 17: a station, a Moon base, lunar propellant, nuclear ships and two asteroid mines', () => {
    const game = freshGame();
    const player = new PathPlayer(game);

    for (const n of [1, 2, 3, 4]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    expect(player.crewedStation()).toBe(true);
    const station = siteAt(economy, 'earth', 'orbit')!;
    expect(station.population).toBe(6);
    expect(station.stock.food_ration).toBeGreaterThan(2000);

    for (const n of [5, 6]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    const moon = siteAt(economy, 'luna', 'surface')!;
    expect(moon).toBeDefined();
    expect(moon.region).toBe('luna-south-pole');
    expect(moon.population).toBeGreaterThanOrEqual(1);
    expect(economy.done).toEqual([1, 2, 3, 4, 5, 6]);

    for (const n of [7, 8, 9, 10, 11, 12]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    for (const b of [
      'fission_reactor',
      'ice_mine',
      'regolith_excavator',
      'regolith_oxygen_plant',
      'sinter_printer',
      'greenhouse',
      'electrolysis_plant',
      'cryogenic_liquefaction_plant'
    ])
      expect(standing(moon, b), b).toBeGreaterThan(0);
    expect(moon.population).toBeGreaterThanOrEqual(4);
    expect(flowsOf(moon).food.cover).toBeGreaterThan(0.99);

    player.cislunarSupply();
    const compare = player.path.comparison!;
    expect(compare.moon).not.toBeNull();
    expect(compare.earth).not.toBeNull();
    expect(compare.moon!).toBeLessThan(compare.earth!);
    expect(compare.chose).toBe('moon');
    expect(player.path.lunarLox).toBeGreaterThan(15_000);
    const lunarLoxAt = game.time;

    for (const n of [13, 14, 15, 16, 17]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    expect(economy.done).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));

    const perKg = (f: { launches: number; kg: number }) => f.launches / f.kg;
    const fills = player.path.fills.filter((f) => f.kind === 'methalox' && f.launches > 0);
    const before = fills.filter((f) => f.at <= lunarLoxAt);
    const after = fills.filter((f) => f.at > lunarLoxAt);
    expect(before.length).toBeGreaterThan(3);
    expect(after.length).toBeGreaterThan(0);
    expect(after.some((f) => f.fromStock > 10_000)).toBe(true);
    const mean = (list: typeof fills) => list.reduce((a, f) => a + perKg(f), 0) / list.length;
    expect(mean(after)).toBeLessThan(mean(before));

    const bennu = siteAt(economy, 'bennu', 'surface')!;
    const hertha = siteAt(economy, 'hertha', 'surface')!;
    expect(bennu).toBeDefined();
    expect(hertha).toBeDefined();
    expect(standing(bennu, 'asteroid_miner')).toBeGreaterThan(0);
    expect(standing(bennu, 'asteroid_processor')).toBeGreaterThan(0);
    expect(standing(hertha, 'asteroid_miner')).toBeGreaterThan(0);
    expect(standing(hertha, 'metal_refinery')).toBeGreaterThan(0);
    expect(isSurveyed('bennu') && isSurveyed('hertha')).toBe(true);
    expect(economy.sites.some((s) => (s.stock.carbonaceous_chondrite ?? 0) >= 0.1)).toBe(true);

    player.days(365);
    expect(economy.mined.bennu ?? 0).toBeGreaterThan(0);
    expect(economy.mined.hertha ?? 0).toBeGreaterThan(0);
    expect(remainingMass(economy, 'bennu')).toBeLessThan(7.33e10);
    console.info(
      'BENNU',
      JSON.stringify(bennu.groups),
      JSON.stringify(bennu.stock),
      bennu.gridKw,
      JSON.stringify(flowsOf(bennu).power)
    );
    expect(bennu.stock.carbonaceous_chondrite ?? 0).toBeGreaterThan(0);

    const reached = player.report.reached;
    expect(reached.map((r) => r.number)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    const times = reached.map((r) => r.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(year(times[0]!)).toBe(2027);
    expect(year(times[5]!)).toBeLessThan(2035);
    expect(year(times[16]!)).toBeLessThan(2075);

    expect(player.report.launches.length).toBeGreaterThan(30);
    expect(player.report.launches.length).toBeLessThan(200);
    expect(player.report.tonnes).toBeGreaterThan(300);
    expect(ships.launches.every((l) => l.lost === 0)).toBe(true);
    const used = new Set(classes.saved.map((d) => d.id));
    for (const id of [
      'path-lander',
      'path-hauler',
      'path-tanker',
      'path-probe',
      'path-ntr-hauler',
      'path-nep-tug'
    ])
      expect(used.has(id), id).toBe(true);
    expect(player.path.sites.sort()).toEqual(['bennu', 'hertha', 'luna'].sort());

    console.info(
      'milestones',
      JSON.stringify(reached.map((r) => [r.number, formatDay(r.at), year(r.at)])),
      'launches',
      player.report.launches.length,
      'tonnes',
      player.report.tonnes.toFixed(0),
      'sites',
      economy.sites.map((s) => s.id).join(','),
      'comparison',
      JSON.stringify(compare)
    );
  }, 600_000);
});
