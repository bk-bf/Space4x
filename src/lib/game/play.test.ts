import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { classes } from './classes.svelte.ts';
import { money } from '#lib/ui/format.ts';
import { formatDay } from './clock.ts';
import { economy, flowsOf, remainingMass, siteAt, siteIn, standing } from './economy/index.ts';
import { OuterPlayer } from './playOuter.ts';
import { freshGame } from './ships/fixtures.ts';
import { ships } from './ships/index.ts';
import type { Game } from './state.svelte.ts';
import { isSurveyed } from './survey.svelte.ts';

const year = (ms: number) => new Date(ms).getUTCFullYear();
const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('the scripted player from the start state', () => {
  let game: Game;
  let player: OuterPlayer;

  const reach = (numbers: number[]) => {
    for (const n of numbers) expect(player.reach(n), `milestone ${n}`).toBe(true);
  };

  it('reaches milestones 1 to 17: a station, a Moon base, lunar propellant, nuclear ships and two asteroid mines', () => {
    game = freshGame();
    player = new OuterPlayer(game);

    reach([1, 2, 3, 4]);
    expect(player.crewedStation()).toBe(true);
    const station = siteAt(economy, 'earth', 'orbit')!;
    expect(station.population).toBe(6);
    expect(station.stock.food_ration).toBeGreaterThan(2000);
    expect(station.stock.wheat).toBeGreaterThan(300_000);

    reach([5, 6]);
    const moon = siteAt(economy, 'luna', 'surface')!;
    expect(moon).toBeDefined();
    expect(moon.region).toBe('luna-south-pole');
    expect(moon.population).toBeGreaterThanOrEqual(1);
    expect(economy.done).toEqual([1, 2, 3, 4, 5, 6]);

    reach([7, 8, 9, 10, 11, 12]);
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

    reach([13, 14, 15, 16, 17]);
    expect(economy.done).toEqual(upTo(17));

    const perKg = (f: { launches: number; kg: number }) => f.launches / f.kg;
    const fills = player.path.fills.filter((f) => f.kind === 'methalox' && f.launches > 0);
    const before = fills.filter((f) => f.at <= lunarLoxAt);
    const after = fills.filter((f) => f.at > lunarLoxAt);
    expect(before.length).toBeGreaterThan(3);
    expect(after.length).toBeGreaterThan(0);
    expect(after.some((f) => f.fromStock > 10_000)).toBe(true);
    const mean = (list: typeof fills) => list.reduce((a, f) => a + perKg(f), 0) / list.length;
    expect(Math.min(...after.map(perKg))).toBeLessThan(mean(before));

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
    expect(bennu.stock.carbonaceous_chondrite ?? 0).toBeGreaterThan(0);

    const reached = player.report.reached;
    expect(reached.map((r) => r.number)).toEqual(upTo(17));
    const times = reached.map((r) => r.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(year(times[0]!)).toBe(2027);
    expect(year(times[5]!)).toBeLessThan(2035);
    expect(year(times[16]!)).toBeLessThan(2075);

    expect(player.report.launches.length).toBeGreaterThan(30);
    expect(player.report.launches.length).toBeLessThan(250);
    expect(player.report.tonnes).toBeGreaterThan(300);
    expect(
      ships.vessels
        .filter((v) => v.at.kind !== 'site' || v.at.site !== 'earth')
        .every((v) => v.boosters === 0)
    ).toBe(true);
    const used = new Set(classes.saved.map((d) => d.id));
    for (const id of [
      'path-lander',
      'path-hauler',
      'path-tanker',
      'path-probe',
      'path-ntr-hauler',
      'path-nep-tug',
      'jump-barge'
    ])
      expect(used.has(id), id).toBe(true);
    expect(player.path.sites.sort()).toEqual(['bennu', 'hertha', 'luna'].sort());
    expect(player.barge).toBeDefined();
  }, 300_000);

  it('reaches 18 to 21: steel from Hertha by electric barge, an orbital shipyard that builds a ship, a chip fab, a space solar power station and the optional Mars programme', () => {
    reach([18, 19, 20, 21]);
    const station = siteAt(economy, 'earth', 'orbit')!;
    expect(standing(station, 'orbital_shipyard')).toBeGreaterThan(0);
    expect(ships.vessels.some((v) => v.design === 'jump-tender')).toBe(true);
    expect(standing(station, 'semiconductor_fab')).toBeGreaterThan(0);
    expect(standing(station, 'solar_cell_fab')).toBeGreaterThan(0);
    expect(standing(station, 'solar_power_station')).toBeGreaterThan(0);
    expect(flowsOf(station).power.supply).toBeGreaterThan(50_000);
    expect(economy.done).toEqual(upTo(21));
    const steelAt18 = player.report.reached.find((r) => r.number === 18)!;
    expect(year(steelAt18.at)).toBeLessThan(2100);
  }, 300_000);

  it('reaches 22 to 24: a fusion plant running, helium-3 mined on the maria, and a ship flown on a fusion drive to the jump point', () => {
    reach([22, 23, 24]);
    const earth = economy.sites[0]!;
    expect(standing(earth, 'fusion_plant')).toBeGreaterThan(0);
    expect(earth.groups.some((g) => g.process === 'd_t_fusion_power' && g.count > 0)).toBe(true);
    const maria = siteIn(economy, 'luna', 'surface', 'luna-maria')!;
    expect(maria).toBeDefined();
    expect(maria.groups.some((g) => g.process === 'extract:helium3' && g.count > 0)).toBe(true);
    expect(game.jump('sol-a')!.point.surveyed).toBe(true);
    expect(game.jump('sol-a')!.point.stable).toBe(false);
    expect(economy.done).toEqual(upTo(24));
  }, 300_000);

  it('reaches 25 to 29: a scoop at Uranus, carbon nanotube fibre, superconductors, exotic matter and a stabilised jump point', () => {
    reach([25, 26, 27, 28, 29]);
    expect(economy.done).toEqual(upTo(29));

    const uranus = siteIn(economy, 'uranus', 'surface', null)!;
    expect(uranus).toBeDefined();
    expect(standing(uranus, 'gas_giant_scoop')).toBeGreaterThan(0);
    expect(uranus.stock.helium3 ?? 0).toBeGreaterThan(0);

    const station = siteAt(economy, 'earth', 'orbit')!;
    expect(standing(station, 'fibre_works')).toBeGreaterThan(0);
    expect(standing(station, 'exotic_matter_facility')).toBeGreaterThan(0);

    const jump = siteAt(economy, 'sol-a', 'point')!;
    expect(jump).toBeDefined();
    expect(jump.body).toBe('jump-point');
    expect(standing(jump, 'jump_point_stabiliser')).toBe(1);
    const point = game.jump('sol-a')!.point;
    expect(point.surveyed).toBe(true);
    expect(point.stable).toBe(true);
    const ending = game.events.filter((e) => e.text.includes('Jump point A is stable'));
    expect(ending).toHaveLength(1);

    expect(player.hunger).toEqual([]);
    expect(player.unpaid).toEqual([]);
    expect(player.leases.length).toBeGreaterThan(0);
    expect(economy.market.treasury).toBeGreaterThan(0);
    for (const site of economy.sites.filter((s) => s.id !== 'earth' && s.population >= 0.5)) {
      expect(site.alerts.food, `${site.name} is hungry`).toBe(false);
      expect(flowsOf(site).food.cover, `${site.name} is fed`).toBeGreaterThan(0.999);
    }
    expect(flowsOf(economy.sites[0]!).food.cover).toBeGreaterThan(0.99);
    expect(
      economy.sites
        .filter((s) => s.population >= 0.5)
        .map((s) => s.id)
        .sort()
    ).toEqual(['earth', 'luna', 'luna-maria', 'orbit-earth', 'sol-a'].sort());

    const reached = player.report.reached;
    expect(reached.map((r) => r.number)).toEqual(upTo(29));
    const times = reached.map((r) => r.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(year(times.at(-1)!)).toBeLessThan(2200);

    expect(player.report.launches.length).toBeGreaterThan(100);
    expect(player.report.launches.length).toBeLessThan(500);
    expect(player.report.tonnes).toBeGreaterThan(1500);
    expect(
      ships.vessels
        .filter((v) => v.at.kind !== 'site' || v.at.site !== 'earth')
        .every((v) => v.boosters === 0)
    ).toBe(true);
    expect(player.path.sites.sort()).toEqual(
      ['bennu', 'hertha', 'luna', 'luna-maria', 'uranus', 'sol-a'].sort()
    );
    const used = new Set(classes.saved.map((d) => d.id));
    for (const id of ['jump-hauler', 'jump-scout', 'jump-scoop-ship', 'jump-founder', 'jump-power'])
      expect(used.has(id), id).toBe(true);
    expect(ships.launches.length).toBe(player.report.launches.length);

    const legs = game.events
      .filter((e) => e.text.includes('it arrives in'))
      .map((e) => `${formatDay(e.at)} ${e.text}`)
      .reverse();
    console.info(
      'milestones',
      JSON.stringify(reached.map((r) => [r.number, formatDay(r.at), year(r.at)])),
      'launches',
      player.report.launches.length,
      'tonnes',
      player.report.tonnes.toFixed(0),
      'sites',
      economy.sites.map((s) => s.id).join(','),
      'leases',
      player.leases.length,
      'treasury',
      money(economy.market.treasury)
    );
    console.info('trips', JSON.stringify(player.trips.map((t) => [t.label, Math.round(t.days)])));
    console.info('legs', JSON.stringify(legs.filter((l) => /Fusion|Scoop|founder|barge|Steel/i.test(l))));
  }, 300_000);
});
