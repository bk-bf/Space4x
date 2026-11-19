import { describe, expect, it } from 'vitest';
import { milestone, milestones } from '#lib/game/data/index.ts';
import {
  assign,
  newSite,
  siteFlows,
  siteNeedCheck,
  siteNeedMissing,
  startEconomy,
  type Economy
} from '#lib/game/economy/index.ts';
import { goalOf, materialStep, type World } from './next.ts';
import { checkFor } from './programme.ts';

const world = (eco: Economy, designs = 0, vessels: World['vessels'] = []): World => ({
  eco,
  home: eco.sites[0]!,
  flows: (s) => siteFlows(eco, s),
  designs,
  vessels
});

const moonOutpost = (eco: Economy, people: number) => {
  const site = newSite(eco, {
    worldBody: 'luna',
    bodyName: 'Luna',
    place: 'surface',
    region: 'luna-south-pole',
    angle: 0
  })!;
  site.population = people;
  return site;
};

describe('the goal at the start', () => {
  it('is milestone 1, waiting on GRCop, fixed by switching an alloy works to it', () => {
    const eco = startEconomy();
    const goal = goalOf(world(eco));
    expect(goal.milestone).toBe(1);
    expect(goal.status).toBe('waiting');
    expect(goal.blocker).toMatch(/^GRCop/);
    expect(goal.icon).toEqual({ kind: 'material', id: 'grcop' });
    expect(goal.step.text).toMatch(/^Switch an Alloy works to GRCop/);
    const place = goal.step.place;
    expect(place.kind).toBe('production');
    if (place.kind !== 'production') return;
    const group = eco.sites[0]!.groups.find((g) => g.id === place.group)!;
    expect(group.building).toBe('alloy_works');
    expect(place.target).toBe('grcop_42_melting');
    expect(place.count).toBe(1);
  });

  it('turns into an ETA once the switch is made, and into Start when the bill is in store', () => {
    const eco = startEconomy();
    const home = eco.sites[0]!;
    const place = goalOf(world(eco)).step.place;
    if (place.kind !== 'production') throw new Error('expected a production step');
    assign(eco, home, place.group, place.target!, place.count!);
    const waiting = goalOf(world(eco));
    expect(waiting.step.text).toMatch(/^GRCop .* in 1 d at the current rate$/);
    expect(waiting.step.place).toEqual({ kind: 'stockpiles', site: 'earth', material: 'grcop' });
    home.stock.grcop = 1000;
    const ready = goalOf(world(eco));
    expect(ready).toMatchObject({ milestone: 1, status: 'ready', missing: 0 });
    expect(ready.step.place).toEqual({ kind: 'research', milestone: 1 });
  });
});

describe('the goal after milestone 1', () => {
  it('is milestone 2, whose depot stands only in orbit, so the step leads to a ship', () => {
    const eco = startEconomy();
    eco.done = [1];
    const goal = goalOf(world(eco));
    expect(goal.milestone).toBe(2);
    expect(goal.blocker).toBe('No Propellant depot standing');
    expect(goal.step).toEqual({
      text: 'Design and lock a ship class to found a site in orbit with a Propellant depot',
      place: { kind: 'classes' }
    });
    expect(goalOf(world(eco, 1)).step.place).toEqual({ kind: 'economy', site: 'earth', tab: 'yard' });
    expect(goalOf(world(eco, 1, [{ onLaunchSite: true }])).step.place).toEqual({
      kind: 'economy',
      site: 'earth',
      tab: 'launch'
    });
  });

  it('follows a running programme when nothing else is open', () => {
    const eco = startEconomy();
    eco.running = [{ number: 1, site: 'earth', progress: 0.5 }];
    const goal = goalOf(world(eco));
    expect(goal).toMatchObject({ milestone: 1, status: 'running' });
    expect(goal.blocker).toMatch(/^Running, \d+ d left$/);
  });

  it('says so when every milestone is reached', () => {
    const eco = startEconomy();
    eco.done = milestones.map((m) => m.number);
    expect(goalOf(world(eco)).status).toBe('finished');
  });
});

describe('a site need partly met', () => {
  it('lists the criteria of milestone 11 at the outpost, with the four people unmet', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const outpost = moonOutpost(eco, 2);
    const eleven = milestone(11);
    const [row] = checkFor(eco, eco.sites[0]!, eleven).sites;
    expect(row!.ok).toBe(false);
    expect(row!.site).toBe(outpost.name);
    expect(row!.criteria).toEqual([
      { text: 'On Luna', ok: true },
      { text: 'On the surface', ok: true },
      { text: 'Greenhouse standing', ok: false },
      { text: '4 people, has 2', ok: false },
      { text: 'Everyone fed', ok: true }
    ]);
  });

  it('marks every criterion unmet when no site stands there', () => {
    const eco = startEconomy();
    const [row] = checkFor(eco, eco.sites[0]!, milestone(6)).sites;
    expect(row!.site).toBeUndefined();
    expect(row!.criteria).toEqual([
      { text: 'On Luna', ok: false },
      { text: 'On the surface', ok: false },
      { text: '1 person, has 0', ok: false }
    ]);
  });

  it('agrees with siteNeedMissing for every site need', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    moonOutpost(eco, 4);
    for (const m of milestones)
      for (const need of m.needs.sites ?? [])
        expect(
          siteNeedCheck(eco, need).criteria.every((c) => c.ok),
          need.label
        ).toBe(siteNeedMissing(eco, need) === undefined);
  });

  it('leads a building that a site need names to that site, not to any site', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const goal = goalOf(world(eco, 1, [{ onLaunchSite: false }]));
    expect(goal.milestone).toBe(11);
    expect(goal.blocker).toBe('No Greenhouse standing');
    expect(goal.step.text).toBe('Send a ship to found a site on Luna with 4 crew');
  });

  it('steps to the first unmet criterion: the greenhouse, then the people', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const outpost = moonOutpost(eco, 2);
    const goal = goalOf(world(eco, 1, [{ onLaunchSite: false }]));
    expect(goal.milestone).toBe(11);
    expect(goal.step.place).toEqual({ kind: 'construction', site: outpost.id, building: 'greenhouse' });
    outpost.groups.push({ id: 999, building: 'greenhouse', process: null, count: 1, on: true });
    eco.sites[0]!.groups.push({ id: 998, building: 'greenhouse', process: null, count: 1, on: true });
    const people = goalOf(world(eco, 1, [{ onLaunchSite: false }]));
    expect(people.blocker).toBe('No fed crew with a greenhouse on the Moon');
    expect(people.step).toEqual({
      text: `Send a ship to bring 2 more people to ${outpost.name}`,
      place: { kind: 'economy', site: 'earth', tab: 'ships' }
    });
  });
});

describe('a bill short', () => {
  it('gives the days until the stock covers it at the current net rate', () => {
    const eco = startEconomy();
    const home = eco.sites[0]!;
    const one = milestone(1);
    const group = home.groups.find((g) => g.building === 'alloy_works')!;
    assign(eco, home, group.id, 'grcop_42_melting', 1);
    const flows = siteFlows(eco, home);
    const net = flows.produced.grcop! - (flows.consumed.grcop ?? 0);
    expect(net).toBeGreaterThan(0);
    home.stock.grcop = 50;
    const row = checkFor(eco, home, one, flows).bill.find((r) => r.id === 'grcop')!;
    expect(row.ok).toBe(false);
    expect(row.net).toBeCloseTo(net);
    expect(row.days).toBeCloseTo((row.need - 50) / net / 24);
  });

  it('is never met when nothing makes it', () => {
    const eco = startEconomy();
    const home = eco.sites[0]!;
    const row = checkFor(eco, home, milestone(1), siteFlows(eco, home)).bill.find((r) => r.id === 'grcop')!;
    expect(row.days).toBe(Infinity);
    const met = checkFor(eco, home, milestone(1), siteFlows(eco, home)).bill.find((r) => r.ok)!;
    expect(met.days).toBe(0);
  });

  it('leads to building a plant when none stands to switch', () => {
    const eco = startEconomy();
    const home = eco.sites[0]!;
    home.groups = home.groups.filter((g) => g.building !== 'alloy_works');
    const step = materialStep(world(eco), home, 'grcop', 200);
    expect(step).toEqual({
      text: 'Build an Alloy works to make GRCop copper-chromium-niobium alloy',
      place: { kind: 'construction', site: 'earth', building: 'alloy_works', recipe: 'grcop_42_melting' }
    });
  });
});
