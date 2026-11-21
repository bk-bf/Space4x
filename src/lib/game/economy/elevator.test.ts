import { describe, expect, it } from 'vitest';
import { ancestorsOf, building, projectById, projects } from '#lib/game/data/index.ts';
import { stage, stageProjects } from '#lib/game/stages.ts';
import {
  advanceEconomy,
  assign,
  buildable,
  ELEVATOR,
  firstBuildings,
  liftId,
  newSite,
  POWER,
  queueBuilding,
  siteFlows,
  startEconomy,
  stockMass,
  unlockedProcesses,
  type Economy,
  type Site
} from './index.ts';

const DAY = 86_400;
const elevatorProject = projectById('space_elevator').number;

function withElevator(eco: Economy, site: Site, count = 1) {
  const g = { id: eco.nextId++, building: ELEVATOR, process: null, count, on: true };
  site.groups.push(g);
  return g;
}

function earthAndStation(): { eco: Economy; earth: Site; station: Site } {
  const eco = startEconomy();
  eco.done.push(elevatorProject, ...ancestorsOf(elevatorProject));
  const earth = eco.sites[0]!;
  const station = newSite(eco, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
  return { eco, earth, station };
}

describe('the space elevator', () => {
  it('opens with its own project after carbon nanotube fibre, both researched before the Moon base', () => {
    const p = projectById('space_elevator');
    const fibre = projectById('carbon_nanotube_fibre');
    expect(building(ELEVATOR).research).toBe(p.number);
    expect(p.requires).toContain(fibre.number);
    expect(p.subject).toBe('launch');
    expect(p.rp).toBe(240);
    const beforeBase = new Set([...stageProjects(stage(11).number - 1), fibre.number]);
    for (const a of ancestorsOf(p.number)) expect(beforeBase.has(a), `needs ${a}`).toBe(true);
  });

  it('has a throughput line of four levels, 1.2 to 2 times, like construction', () => {
    const levels = projects.filter((x) => x.line === 'elevator_throughput');
    expect(levels.map((x) => x.effects?.elevator_throughput)).toEqual([1.2, 1.4, 1.6, 2]);
    expect(levels.map((x) => x.rp)).toEqual(
      projects.filter((x) => x.line === 'construction_rate').map((x) => x.rp)
    );
    expect(levels[0]!.requires).toEqual([projectById('space_elevator').number]);
  });

  it('costs 10 BP, a 750 t ribbon of carbon nanotube fibre and three 7 t climbers', () => {
    const b = building(ELEVATOR);
    expect(b.bp).toBe(10);
    expect(b.cost.cnt_fibre).toBe(750_000);
    const e = b.elevator!;
    const climbers = Object.entries(b.cost)
      .filter(([m]) => m !== 'cnt_fibre')
      .reduce((a, [, v]) => a + v, 0);
    expect(climbers).toBe(e.climbers * e.climberMass);
    expect(e.climbers).toBe(Math.ceil((e.kgPerDay * e.climbDays) / e.payload));
    expect([e.kgPerDay, e.payload, e.climbDays]).toEqual([5000, 13000, 7]);
  });

  it('stands only at a surface site whose body has an orbital site', () => {
    const eco = startEconomy();
    eco.done.push(elevatorProject, ...ancestorsOf(elevatorProject));
    const earth = eco.sites[0]!;
    const has = (s: Site) => buildable(eco, s).some((b) => b.id === ELEVATOR);
    expect(has(earth)).toBe(false);
    expect(queueBuilding(eco, earth, ELEVATOR, null)).toEqual([]);
    const station = newSite(eco, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
    expect(has(earth)).toBe(true);
    expect(has(station)).toBe(false);
    expect(queueBuilding(eco, earth, ELEVATOR, null)[0]?.process).toBeNull();
    const moon = newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', angle: 0 })!;
    expect(has(moon)).toBe(false);
    expect(firstBuildings(eco, 'luna', 'surface').some((b) => b.id === ELEVATOR)).toBe(false);
    newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 });
    expect(has(moon)).toBe(true);
  });

  it('lifts 5 t a day of one material from the surface stock into the orbital stock, mass kept', () => {
    const { eco, earth, station } = earthAndStation();
    const g = withElevator(eco, earth);
    expect(unlockedProcesses(eco, earth, ELEVATOR).some((p) => p.id === liftId('lox'))).toBe(true);
    expect(assign(eco, earth, g.id, liftId('lox'), 1)).toBe(g);
    const a = siteFlows(eco, earth).actors.find((x) => x.kind === 'group' && x.group === g)!;
    expect(a.inputs[POWER]).toBe(20_000);
    expect(station.stock.lox ?? 0).toBe(0);
    const before = eco.sites.reduce((x, s) => x + stockMass(s), 0);
    const top = siteFlows(eco, station);
    expect(top.net.lox).toBeCloseTo(5000 / 24, 6);
    advanceEconomy(eco, 10 * DAY);
    expect(station.stock.lox).toBeCloseTo(50_000, 3);
    const after = eco.sites.reduce((x, s) => x + stockMass(s), 0);
    const { extracted, eaten, built, lost } = eco.ledger;
    expect(Math.abs(after - before - (extracted - eaten - built - lost))).toBeLessThan(1e-6 * extracted);
  });

  it('stops when the surface runs out and lifts faster with the throughput line', () => {
    const { eco, earth, station } = earthAndStation();
    const g = withElevator(eco, earth);
    earth.stock.cnt_fibre = 20_000;
    expect(assign(eco, earth, g.id, liftId('cnt_fibre'), 1)).toBe(g);
    advanceEconomy(eco, 10 * DAY);
    expect(station.stock.cnt_fibre).toBeCloseTo(20_000, 3);
    expect(earth.stock.cnt_fibre ?? 0).toBeCloseTo(0, 3);
    const a = siteFlows(eco, earth).actors.find((x) => x.kind === 'group' && x.group === g)!;
    expect(a.share).toBe(0);
    eco.done.push(...projects.filter((x) => x.line === 'elevator_throughput').map((x) => x.number));
    earth.stock.cnt_fibre = 100_000;
    advanceEconomy(eco, DAY);
    expect(station.stock.cnt_fibre).toBeCloseTo(30_000, 3);
  });
});
