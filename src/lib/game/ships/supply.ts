import { DAY } from '#lib/game/clock.ts';
import { economy, flowsOf, kcalOf, POWER, type Site } from '#lib/game/economy/index.ts';
import { hasMaterial } from '#lib/game/data/index.ts';
import { planTrip } from '#lib/game/flight/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { classes, statsFor } from '#lib/game/classes.svelte.ts';
import { ships } from './state.svelte.ts';
import { flightSystem, hangsInOrbit } from './world.ts';
import { needsLaunchStack } from './trips.ts';
import { reentryRating } from './model.ts';
import type { Vessel } from './types.ts';

export interface ImportOption {
  from: string;
  fromName: string;
  stock: number;
  design: string | null;
  designName: string;
  perTonne: number | null;
  days: number | null;
  note: string;
}

export interface SupplyRow {
  material: string;
  need: number;
  made: number;
  stock: number;
  options: ImportOption[];
}

const cache = new Map<string, Omit<ImportOption, 'from' | 'fromName' | 'stock'>>();
const EPOCH = 30 * DAY;

function placeFor(site: Site) {
  return hangsInOrbit(site)
    ? ({ kind: 'orbit', body: site.worldBody, angle: site.angle } as const)
    : ({ kind: 'surface', body: site.worldBody } as const);
}

function freighterDesigns(): string[] {
  const seen = new Set<string>();
  for (const v of ships.vessels) {
    const s = statsFor(classes.find(v.design)!);
    if (s.main && s.payloadCapacity > 0 && s.errors === 0) seen.add(v.design);
  }
  return [...seen];
}

function leg(game: Game, designId: string, from: Site, to: Site) {
  const design = classes.find(designId)!;
  const stats = statsFor(design);
  const kind = stats.main!.propellant;
  const system = flightSystem(game);
  const base = {
    dryMass: stats.dryMass,
    payload: stats.payloadCapacity,
    propellant: stats.capacity[kind] ?? 0,
    engine: {
      isp: stats.main!.isp,
      thrust: stats.main!.thrust,
      thrustSeaLevel: stats.main!.thrustSeaLevel,
      ...(stats.main!.power > 0 ? { power: stats.main!.power } : {})
    },
    powerAvailable: Math.max(0, stats.power.balance)
  };
  const aero = reentryRating(design) >= stats.dryMass + stats.payloadCapacity;
  const out = planTrip({
    from: placeFor(from),
    to: placeFor(to),
    departAfter: game.elapsed,
    ship: base,
    system,
    aerobrake: aero,
    only: 'cheapest'
  });
  const go = out.options.find((o) => o.canStop);
  if (!go) return undefined;
  const back = planTrip({
    from: placeFor(to),
    to: placeFor(from),
    departAfter: go.arrival,
    ship: { ...base, payload: 0, propellant: go.propellantLeft },
    system,
    aerobrake: aero,
    only: 'cheapest'
  });
  const home = back.options.find((o) => o.canStop);
  if (!home) return undefined;
  return {
    out: go.propellant,
    back: home.propellant,
    days: go.duration / DAY,
    capacity: stats.payloadCapacity
  };
}

export function importCost(
  game: Game,
  from: Site,
  to: Site
): Omit<ImportOption, 'from' | 'fromName' | 'stock'> {
  const epoch = Math.floor(game.elapsed / EPOCH);
  const key = `${from.id}|${to.id}|${ships.vessels.length}|${classes.saved.length}|${ships.launches.length}|${epoch}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let best: Omit<ImportOption, 'from' | 'fromName' | 'stock'> = {
    design: null,
    designName: '',
    perTonne: null,
    days: null,
    note: 'No ship can make this trip'
  };
  const launchSite = needsLaunchStack(game, { kind: 'site', site: from.id });
  if (launchSite) {
    const last = ships.launches.at(-1);
    const sameBody = to.place === 'orbit' && to.worldBody === from.worldBody;
    best =
      last && last.perTonne > 0 && sameBody
        ? {
            design: null,
            designName: 'Launch stack',
            perTonne: last.perTonne,
            days: 0,
            note: 'The last stack launched with a full load'
          }
        : { ...best, note: sameBody ? 'No launch yet' : 'Leaves by launch stack only' };
  } else {
    for (const id of freighterDesigns()) {
      const c = leg(game, id, from, to);
      if (!c || c.capacity <= 0) continue;
      const perTonne = ((c.out + c.back) / c.capacity) * 1000;
      if (best.perTonne === null || perTonne < best.perTonne)
        best = {
          design: id,
          designName: classes.find(id)?.name ?? id,
          perTonne,
          days: c.days,
          note: 'Round trip, full hold'
        };
    }
  }
  if (cache.size > 400) cache.clear();
  cache.set(key, best);
  return best;
}

export function supplyRows(game: Game, site: Site): SupplyRow[] {
  const flows = flowsOf(site);
  const need: Record<string, number> = {};
  for (const a of flows.actors)
    for (const [m, v] of Object.entries(a.inputs))
      if (m !== POWER && hasMaterial(m)) need[m] = (need[m] ?? 0) + v * a.cap;
  if (flows.food.demand > 0) {
    const food = Object.keys(flows.eaten)[0] ?? 'food_ration';
    need[food] = (need[food] ?? 0) + flows.food.demand / Math.max(1, kcalOf(food));
  }
  const ids = new Set([
    ...Object.keys(need),
    ...Object.keys(site.stock).filter((m) => (site.stock[m] ?? 0) > 0)
  ]);
  const others = economy.sites.filter((s) => s.id !== site.id);
  return [...ids]
    .filter((m) => hasMaterial(m) && !m.startsWith('@'))
    .map((material): SupplyRow => ({
      material,
      need: (need[material] ?? 0) * 24,
      made: (flows.produced[material] ?? 0) * 24,
      stock: site.stock[material] ?? 0,
      options: others
        .filter((o) => (o.stock[material] ?? 0) > 0)
        .map((o) => ({
          from: o.id,
          fromName: o.name,
          stock: o.stock[material] ?? 0,
          ...importCost(game, o, site)
        }))
    }))
    .filter((r) => r.need > 0)
    .sort((a, b) => b.need - a.need);
}

export function runsList(): Vessel[] {
  return ships.vessels.filter((v) => v.run);
}
