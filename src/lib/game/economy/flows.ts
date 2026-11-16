import { building, material, milestone } from '#lib/game/data/index.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import { buildCost, buildHours, BUILD_SLOTS } from './construction.ts';
import { gradeAt, isDepleted } from './deposits.ts';
import { foodIds, isExtraction, isMass, isStockless, POWER, process } from './processes.ts';
import { programmeCompute, standing } from './programmes.ts';
import type { BuildOrder, Economy, Group, Programme, Site, YardOrder } from './types.ts';

export const STOCK_EPS = 1e-6;
export const STARVE_PER_YEAR = 0.25;
export const HOURS_PER_YEAR = 8766;

export type Limit =
  | { kind: 'off' }
  | { kind: 'idle' }
  | { kind: 'workers' }
  | { kind: 'power' }
  | { kind: 'compute' }
  | { kind: 'material'; id: string }
  | { kind: 'deposit'; id: string }
  | { kind: 'depleted' }
  | { kind: 'slot' }
  | { kind: 'paused' };

interface ActorBase {
  cap: number;
  share: number;
  inputs: Amounts;
  outputs: Amounts;
  extracts: Amounts;
  limit: Limit | null;
  worst: number;
}

export interface GroupActor extends ActorBase {
  kind: 'group';
  group: Group;
  grade: number;
}

export interface BuildActor extends ActorBase {
  kind: 'build';
  order: BuildOrder;
  hours: number;
}

export interface ProgrammeActor extends ActorBase {
  kind: 'programme';
  programme: Programme;
  hours: number;
}

export interface YardActor extends ActorBase {
  kind: 'yard';
  order: YardOrder;
  hours: number;
}

export type Actor = GroupActor | BuildActor | ProgrammeActor | YardActor;

export interface Balance {
  supply: number;
  demand: number;
  used: number;
}

export interface SiteFlows {
  actors: Actor[];
  produced: Amounts;
  consumed: Amounts;
  eaten: Amounts;
  net: Amounts;
  extractedMass: number;
  lostMass: number;
  builtMass: number;
  eatenMass: number;
  food: { demand: number; eaten: number; cover: number; made: number; eatenBy: Amounts; madeBy: Amounts };
  power: Balance;
  compute: Balance;
  workers: { available: number; needed: number; share: number };
  growthPerHour: number;
}

const scaled = (amounts: Amounts, k: number): Amounts =>
  Object.fromEntries(Object.entries(amounts).map(([m, v]) => [m, v * k]));

const massOf = (amounts: Amounts): number =>
  Object.entries(amounts).reduce((a, [m, v]) => a + (isMass(m) ? v : 0), 0);

function deposit(site: Site, p: ReturnType<typeof process>): { grade: number; missing: string | null } {
  let grade = Infinity;
  for (const m of Object.keys(p.extracts)) {
    const g = gradeAt(site, m);
    if (g === undefined) return { grade: 0, missing: m };
    grade = Math.min(grade, g);
  }
  return { grade: Number.isFinite(grade) ? grade : 1, missing: null };
}

function groupActor(eco: Economy, site: Site, g: Group, workerShare: number): GroupActor {
  const base = { kind: 'group' as const, group: g, share: 0, worst: 1, grade: 1 };
  if (!g.on) return { ...base, cap: 0, inputs: {}, outputs: {}, extracts: {}, limit: { kind: 'off' } };
  if (!g.process) return { ...base, cap: 0, inputs: {}, outputs: {}, extracts: {}, limit: { kind: 'idle' } };
  const p = process(g.process, site.body);
  const { grade, missing } = deposit(site, p);
  const none = { ...base, cap: 0, inputs: {}, outputs: {}, extracts: {} };
  if (missing) return { ...none, grade: 0, limit: { kind: 'deposit', id: missing } };
  if (Object.keys(p.extracts).length && site.place === 'surface' && isDepleted(eco, site.worldBody))
    return { ...none, grade: 0, limit: { kind: 'depleted' } };
  const mined = isExtraction(g.process);
  const rich = mined ? grade : 1;
  const cap = workerShare * (mined ? 1 : Math.min(1, grade));
  const gradeLimited = !mined && grade < 1 - 1e-9;
  return {
    ...base,
    grade: mined ? grade : Math.min(1, grade),
    cap,
    inputs: scaled(p.inputs, g.count),
    outputs: scaled(p.outputs, g.count * rich),
    extracts: scaled(p.extracts, g.count * rich),
    limit: gradeLimited
      ? { kind: 'deposit', id: Object.keys(p.extracts)[0] ?? '' }
      : workerShare < 1
        ? { kind: 'workers' }
        : null,
    worst: cap
  };
}

export const activeOrders = (site: Site): BuildOrder[] =>
  site.queue.filter((o) => !o.paused).slice(0, BUILD_SLOTS);

export function activeYardOrders(site: Site): YardOrder[] {
  const taken: Record<string, number> = {};
  return site.yard.filter((o) => {
    if (o.paused) return false;
    const n = taken[o.yard] ?? 0;
    if (n >= standing(site, o.yard)) return false;
    taken[o.yard] = n + 1;
    return true;
  });
}

function yardActor(o: YardOrder): YardActor {
  return {
    kind: 'yard',
    order: o,
    hours: o.hours,
    cap: 1,
    share: 0,
    inputs: scaled(o.cost, 1 / o.hours),
    outputs: {},
    extracts: {},
    limit: null,
    worst: 1
  };
}

function buildActor(o: BuildOrder): BuildActor {
  const hours = buildHours(o.building);
  return {
    kind: 'build',
    order: o,
    hours,
    cap: 1,
    share: 0,
    inputs: scaled(buildCost(o.building), 1 / hours),
    outputs: {},
    extracts: {},
    limit: null,
    worst: 1
  };
}

function programmeActor(p: Programme): ProgrammeActor {
  const m = milestone(p.number);
  const compute = programmeCompute(m);
  return {
    kind: 'programme',
    programme: p,
    hours: 0,
    cap: 1,
    share: 0,
    inputs: compute > 0 ? { compute } : {},
    outputs: {},
    extracts: {},
    limit: null,
    worst: 1
  };
}

const ITERATIONS = 200;

function settle(site: Site, actors: Actor[]): void {
  const constrained = (m: string) => isStockless(m) || (site.stock[m] ?? 0) <= STOCK_EPS;
  for (const a of actors) a.share = a.cap;
  for (let i = 0; i < ITERATIONS; i++) {
    const prod: Amounts = { [POWER]: site.gridKw };
    const cons: Amounts = {};
    for (const a of actors) {
      if (a.share <= 0) continue;
      for (const [m, v] of Object.entries(a.outputs)) prod[m] = (prod[m] ?? 0) + v * a.share;
      for (const [m, v] of Object.entries(a.inputs)) cons[m] = (cons[m] ?? 0) + v * a.share;
    }
    const factor: Amounts = {};
    let tight = false;
    for (const [m, c] of Object.entries(cons)) {
      if (c <= 0 || !constrained(m)) continue;
      const f = Math.min(1, (prod[m] ?? 0) / c);
      if (f < 1 - 1e-12) {
        factor[m] = f;
        tight = true;
      }
    }
    if (!tight) return;
    for (const a of actors) {
      if (a.share <= 0) continue;
      let worst = 1;
      let by: string | null = null;
      for (const m of Object.keys(a.inputs)) {
        const f = factor[m];
        if (f !== undefined && f < worst) {
          worst = f;
          by = m;
        }
      }
      if (by === null) continue;
      a.share *= worst;
      if (a.share < 1e-15) a.share = 0;
      const total = a.share / Math.max(a.cap, 1e-300);
      if (total < a.worst) {
        a.worst = total;
        a.limit =
          by === POWER
            ? { kind: 'power' }
            : by === 'compute'
              ? { kind: 'compute' }
              : { kind: 'material', id: by };
      }
    }
  }
}

export const kcalOf = (id: string): number => material(id).kcalPerKg ?? 0;

function eat(site: Site, net: Amounts, demand: number): Amounts {
  const eaten: Amounts = {};
  const surplus = foodIds
    .map((m) => [m, Math.max(0, net[m] ?? 0) * kcalOf(m)] as const)
    .filter(([, v]) => v > 0);
  const made = surplus.reduce((a, [, v]) => a + v, 0);
  if (made >= demand) {
    for (const [m, v] of surplus) eaten[m] = (v * demand) / made / kcalOf(m);
    return eaten;
  }
  for (const [m, v] of surplus) eaten[m] = v / kcalOf(m);
  const stocked = foodIds.filter((m) => (site.stock[m] ?? 0) > STOCK_EPS);
  const held = stocked.reduce((a, m) => a + (site.stock[m] ?? 0) * kcalOf(m), 0);
  if (held <= 0) return eaten;
  const rest = demand - made;
  for (const m of stocked) eaten[m] = (eaten[m] ?? 0) + (rest * (site.stock[m] ?? 0)) / held;
  return eaten;
}

export function siteFlows(eco: Economy, site: Site): SiteFlows {
  const available = site.population * site.workforceShare;
  const needed = site.groups.reduce((a, g) => a + (g.on ? g.count * building(g.building).workers : 0), 0);
  const workerShare = needed > available ? available / needed : 1;
  const actors: Actor[] = [
    ...site.groups.map((g) => groupActor(eco, site, g, workerShare)),
    ...activeOrders(site).map(buildActor),
    ...activeYardOrders(site).map(yardActor),
    ...eco.running.filter((p) => p.site === site.id).map(programmeActor)
  ];
  const wanted = (m: string) => actors.reduce((a, x) => a + (x.inputs[m] ?? 0) * x.cap, 0);
  settle(site, actors);

  const produced: Amounts = {};
  const consumed: Amounts = {};
  let extractedMass = 0;
  let lostMass = 0;
  let builtMass = 0;
  for (const a of actors) {
    if (a.share <= 0) continue;
    for (const [m, v] of Object.entries(a.outputs)) produced[m] = (produced[m] ?? 0) + v * a.share;
    for (const [m, v] of Object.entries(a.inputs)) consumed[m] = (consumed[m] ?? 0) + v * a.share;
    const extracted = massOf(a.extracts) * a.share;
    extractedMass += extracted;
    if (a.kind === 'build' || a.kind === 'yard') builtMass += massOf(a.inputs) * a.share;
    else lostMass += massOf(a.inputs) * a.share + extracted - massOf(a.outputs) * a.share;
  }
  const net: Amounts = {};
  for (const m of new Set([...Object.keys(produced), ...Object.keys(consumed)]))
    net[m] = (produced[m] ?? 0) - (consumed[m] ?? 0);

  const demand = (site.population * site.kcalPerPersonDay) / 24;
  const madeBy: Amounts = {};
  for (const m of foodIds) {
    const kcal = Math.max(0, net[m] ?? 0) * kcalOf(m);
    if (kcal > 0) madeBy[m] = kcal;
  }
  const made = Object.values(madeBy).reduce((a, v) => a + v, 0);
  const eaten = eat(site, net, demand);
  let eatenMass = 0;
  let eatenKcal = 0;
  const eatenBy: Amounts = {};
  for (const [m, v] of Object.entries(eaten)) {
    net[m] = (net[m] ?? 0) - v;
    eatenMass += v;
    eatenBy[m] = v * kcalOf(m);
    eatenKcal += eatenBy[m];
  }
  const cover = demand > 0 ? Math.min(1, eatenKcal / demand) : 1;
  const growthPerHour =
    cover >= 1 - 1e-9
      ? site.growthPerYear / HOURS_PER_YEAR
      : (-STARVE_PER_YEAR * (1 - cover)) / HOURS_PER_YEAR;

  return {
    actors,
    produced,
    consumed,
    eaten,
    net,
    extractedMass,
    lostMass,
    builtMass,
    eatenMass,
    food: { demand, eaten: eatenKcal, cover, made, eatenBy, madeBy },
    power: {
      supply: site.gridKw + (produced[POWER] ?? 0),
      demand: wanted(POWER),
      used: consumed[POWER] ?? 0
    },
    compute: { supply: produced.compute ?? 0, demand: wanted('compute'), used: consumed.compute ?? 0 },
    workers: { available, needed, share: workerShare },
    growthPerHour
  };
}
