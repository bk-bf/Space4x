import { afterEach, describe, expect, it } from 'vitest';
import { lockRobot, newRobot, robots, setRobotCount, type RobotDesign } from '#lib/game/robots/index.ts';
import {
  addRobots,
  advanceEconomy,
  assignRobots,
  newSite,
  POWER,
  queueRobots,
  siteFlows,
  startEconomy,
  teleopShare,
  type Economy,
  type RobotActor,
  type Site
} from './index.ts';

const MACHINERY = 'machinery';

function design(id: string, parts: [string, number][]): RobotDesign {
  const d = lockRobot(parts.reduce((x, [p, n]) => setRobotCount(x, p, n), newRobot(id, id)));
  robots.add(d);
  return d;
}

const ipex = () =>
  design('ipex', [
    ['drum_excavator', 1],
    ['wheeled_chassis', 1],
    ['battery_dock', 1]
  ]);

const driller = () =>
  design('driller', [
    ['drill_oven', 1],
    ['anchored_chassis', 1],
    ['radioisotope_generator', 3],
    ['robot_computer', 1]
  ]);

function outpost(eco: Economy, worldBody: string, region: string | null): Site {
  const site = newSite(eco, { worldBody, bodyName: worldBody, place: 'surface', region, angle: 0 })!;
  site.stock[MACHINERY] = 1000;
  return site;
}

const actorOf = (eco: Economy, site: Site): RobotActor =>
  siteFlows(eco, site).actors.find((a): a is RobotActor => a.kind === 'robot')!;

afterEach(() => {
  robots.saved = [];
  robots.counter = 0;
});

describe('robots at a site', () => {
  it('dig the deposit their tool suits best, at its rate times the grade', () => {
    const eco = startEconomy();
    const site = outpost(eco, 'luna', 'luna-south-pole');
    site.groups.push({ id: eco.nextId++, building: 'charging_station', process: null, count: 1, on: true });
    site.gridKw = 10;
    addRobots(eco, site, ipex().id, 4);
    expect(site.robots).toEqual([expect.objectContaining({ count: 4, material: 'lunar_regolith' })]);
    const a = actorOf(eco, site);
    expect(a.share).toBeCloseTo(1, 9);
    expect(a.outputs.lunar_regolith).toBeCloseTo(4 * 42, 9);
    expect(a.inputs[MACHINERY]).toBeCloseTo((4 * 29.2 * 0.1) / 8766, 12);
    expect(a.inputs[POWER]).toBeCloseTo(4 * 0.15, 9);
    expect(a.remote).toBe(true);
  });

  it('are run from Earth near it, on Earth data centre compute', () => {
    const eco = startEconomy();
    const site = outpost(eco, 'luna', 'luna-south-pole');
    site.groups.push({ id: eco.nextId++, building: 'charging_station', process: null, count: 1, on: true });
    site.gridKw = 10;
    addRobots(eco, site, ipex().id, 3);
    const home = siteFlows(eco, eco.sites[0]!);
    const teleop = home.actors.find((a) => a.kind === 'teleop');
    expect(teleop?.inputs.compute).toBeCloseTo(3 * 0.002, 12);
    expect(teleopShare(home)).toBeGreaterThan(0);
  });

  it('wait for a charging station to dock at, and for the site power it draws', () => {
    const eco = startEconomy();
    const site = outpost(eco, 'luna', 'luna-south-pole');
    addRobots(eco, site, ipex().id, 2);
    expect(actorOf(eco, site).limit).toEqual({ kind: 'charging' });
    expect(actorOf(eco, site).cap).toBe(0);
    site.groups.push({ id: eco.nextId++, building: 'charging_station', process: null, count: 1, on: true });
    expect(actorOf(eco, site).limit).toEqual({ kind: 'power' });
    site.gridKw = 0.15;
    expect(actorOf(eco, site).share).toBeCloseTo(0.5, 9);
    site.gridKw = 1;
    expect(actorOf(eco, site).share).toBeCloseTo(1, 9);
  });

  it('need their own computer beyond the Moon, and anchors in microgravity', () => {
    const eco = startEconomy();
    const site = outpost(eco, 'bennu', 'bennu-body');
    addRobots(eco, site, driller().id, 1);
    const a = actorOf(eco, site);
    expect(site.robots[0]?.material).toBe('carbonaceous_chondrite');
    expect(a.share).toBeCloseTo(1, 9);
    expect(a.outputs.carbonaceous_chondrite).toBeCloseTo(5 * 2, 9);
    assignRobots(eco, site, site.robots[0]!.id, 'water');
    expect(actorOf(eco, site).outputs.water).toBeCloseTo(4 * 1.5, 9);

    addRobots(eco, site, ipex().id, 1);
    const wheeled = siteFlows(eco, site).actors.filter((x): x is RobotActor => x.kind === 'robot');
    expect(wheeled.find((x) => x.robots.design === 'ipex')?.limit).toEqual({ kind: 'idle' });
    const g = site.robots.find((r) => r.design === 'ipex')!;
    assignRobots(eco, site, g.id, 'water');
    expect(actorOf2(eco, site, 'ipex').limit).toEqual({ kind: 'chassis' });
  });

  it('stop when the site runs out of machinery for spares', () => {
    const eco = startEconomy();
    const site = outpost(eco, 'bennu', 'bennu-body');
    addRobots(eco, site, driller().id, 1);
    site.stock[MACHINERY] = 0;
    expect(actorOf(eco, site).limit).toEqual({ kind: 'material', id: MACHINERY });
  });

  it('are built at the rocket factory on Earth and wait there idle', () => {
    const eco = startEconomy();
    const earth = eco.sites[0]!;
    const d = ipex();
    earth.stock.li_ion_cell = 100;
    const made = queueRobots(eco, earth, d.id, 1);
    expect(Array.isArray(made) && made.every((o) => o.robot)).toBe(true);
    advanceEconomy(eco, 30 * 86400);
    expect(earth.robots).toEqual([expect.objectContaining({ design: d.id, count: 1, material: null })]);
    expect(earth.stock.li_ion_cell).toBeCloseTo(100 - 6.7, 9);
    expect(eco.delivered).toEqual([]);
    expect(queueRobots(eco, earth, 'nothing')).toMatch(/no longer exists/);
  });
});

const actorOf2 = (eco: Economy, site: Site, designId: string): RobotActor =>
  siteFlows(eco, site).actors.find(
    (a): a is RobotActor => a.kind === 'robot' && a.robots.design === designId
  )!;
