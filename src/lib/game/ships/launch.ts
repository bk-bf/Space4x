import { DAY } from '#lib/game/clock.ts';
import { statsFor } from '#lib/game/classes.svelte.ts';
import { economy, standing, type Site } from '#lib/game/economy/index.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import { material } from '#lib/game/data/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import {
  PROPELLANT_KINDS,
  PROPELLANTS,
  climbDrive,
  climbFrom,
  climbReasons,
  climbWith,
  withBoosters,
  type Climb,
  type DesignStats,
  type PropellantKind,
  type ShipDesign
} from '#lib/game/shipdesign/index.ts';
import { cargoMass, designOf, statsOf } from './model.ts';
import { ships } from './state.svelte.ts';
import type { Vessel } from './types.ts';
import { flightBody } from './world.ts';

export const PAD_TURNAROUND_DAYS = 4;
export const ORBIT_ANGLE = 0;
export const launchEstimated = true;

export interface LaunchRequest {
  ship: string;
  cargo?: Record<string, number>;
}

export interface LaunchPlan extends Climb {
  drive: PropellantKind | undefined;
  ok: boolean;
  reasons: string[];
  name: string;
  payloadMass: number;
  draw: Amounts;
  burned: number;
}

const NO_CLIMB: Climb = {
  boosters: 0,
  boosterMass: 0,
  boosterLoad: 0,
  liftoffMass: 0,
  liftoffThrust: 0,
  twr: 0,
  boosterDv: 0,
  shipDv: 0,
  deltaV: 0,
  need: 0,
  boosterBurned: 0,
  shipBurned: 0,
  leftover: 0,
  reaches: false
};

const refused = (reasons: string[], name = ''): LaunchPlan => ({
  ...NO_CLIMB,
  drive: undefined,
  ok: false,
  reasons,
  name,
  payloadMass: 0,
  draw: {},
  burned: 0
});

export const freePads = (site: Site, now: number): number =>
  Math.max(0, standing(site, 'launch_site') - site.launches.filter((t) => t > now).length);

const vesselOf = (id: string): Vessel | undefined => ships.vessels.find((v) => v.id === id);

const mix = (draw: Amounts, kind: PropellantKind, kg: number): void => {
  for (const [m, share] of Object.entries(PROPELLANTS[kind].mix)) draw[m] = (draw[m] ?? 0) + share * kg;
};

const fullLoad = (design: ShipDesign, stats: DesignStats, k: PropellantKind): number =>
  Math.min(design.load[k] ?? 0, stats.capacity[k] ?? 0);

function topUp(v: Vessel, draw: Amounts): Partial<Record<PropellantKind, number>> {
  const d = designOf(v);
  const s = statsOf(v);
  const out: Partial<Record<PropellantKind, number>> = { ...v.propellant };
  if (!d || !s) return out;
  for (const k of PROPELLANT_KINDS) {
    const target = fullLoad(d, s, k);
    const more = target - (v.propellant[k] ?? 0);
    if (more > 0) {
      out[k] = target;
      mix(draw, k, more);
    }
  }
  return out;
}

export function fullTanks(design: ShipDesign): Partial<Record<PropellantKind, number>> {
  const stats = statsFor(design);
  const out: Partial<Record<PropellantKind, number>> = {};
  for (const k of PROPELLANT_KINDS) {
    const kg = fullLoad(design, stats, k);
    if (kg > 0) out[k] = kg;
  }
  return out;
}

export const boostersLeft = (v: Vessel) => {
  const b = statsOf(v)?.boosters;
  return b ? withBoosters(b, Math.min(b.count, v.boosters)) : undefined;
};

export function planLaunch(
  game: Game,
  site: Site,
  request: LaunchRequest,
  probe?: { extraMass: number }
): LaunchPlan {
  const v = vesselOf(request.ship);
  if (!v) return refused(['The ship no longer exists.']);
  const body = flightBody(game, site.worldBody);
  if (!body || site.place !== 'surface') return refused(['Launches start from a surface site.'], v.name);
  const stats = statsOf(v);
  if (!stats) return refused(['The design no longer exists.'], v.name);
  const reasons: string[] = [];
  if (standing(site, 'launch_site') <= 0) reasons.push(`${site.name} has no launch site.`);
  else if (freePads(site, game.elapsed) <= 0) reasons.push('Every launch pad is busy.');
  if (v.at.kind !== 'site' || v.at.site !== site.id || v.trip)
    reasons.push(`${v.name} is not at ${site.name}.`);

  const draw: Amounts = {};
  const cargo = request.cargo ?? {};
  const added = Object.values(cargo).reduce((a, x) => a + x, 0);
  const room = stats.payloadCapacity - cargoMass(v);
  if (added > room + 1e-6)
    reasons.push(
      `${v.name} holds ${Math.round(room)} kg of cargo and ${Math.round(added)} kg was asked for.`
    );
  for (const [m, kg] of Object.entries(cargo)) draw[m] = (draw[m] ?? 0) + kg;

  const propellant = topUp(v, draw);
  const boosters = boostersLeft(v);
  if (boosters) mix(draw, boosters.propellant, boosters.load);
  const drive = climbDrive(stats.drives, (k) => propellant[k] ?? 0);
  if (!drive && !boosters) return refused([...reasons, `${v.name} has no drive.`], v.name);
  const kind = drive?.propellant;
  const others = PROPELLANT_KINDS.filter((k) => k !== kind).reduce((a, k) => a + (propellant[k] ?? 0), 0);
  const payloadMass = cargoMass(v) + added + (probe?.extraMass ?? 0);
  const climb = climbFrom(body, boosters, {
    dry: stats.dryMass + others + payloadMass,
    propellant: kind ? (propellant[kind] ?? 0) : 0,
    drive
  });
  reasons.push(...climbReasons(climb));
  for (const [m, kg] of probe ? [] : Object.entries(draw)) {
    const have = site.stock[m] ?? 0;
    if (have + 1e-6 < kg)
      reasons.push(`${material(m).name} is short by ${Math.ceil(kg - have).toLocaleString('en-US')} kg.`);
  }
  return {
    ...climb,
    drive: kind,
    ok: reasons.length === 0,
    reasons,
    name: v.name,
    payloadMass,
    draw,
    burned: climb.boosterBurned + climb.shipBurned
  };
}

export const reachesOrbit = (plan: Pick<Climb, 'reaches'>): boolean => plan.reaches;

function ceilingOf(reaches: (kg: number) => boolean, limit: number): number {
  if (!reaches(0)) return 0;
  let lo = 0;
  let hi = limit;
  if (reaches(hi)) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (reaches(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function payloadCeiling(game: Game, site: Site, ship: string): number {
  const v = vesselOf(ship);
  const stats = v && statsOf(v);
  if (!v || !stats) return 0;
  const limit = Math.max(0, stats.payloadCapacity - cargoMass(v));
  return ceilingOf((kg) => planLaunch(game, site, { ship }, { extraMass: kg }).reaches, limit);
}

export function designCeiling(design: ShipDesign): number {
  const stats = statsFor(design);
  return ceilingOf((kg) => climbWith(stats, kg).reaches, stats.payloadCapacity);
}

export function launch(game: Game, site: Site, request: LaunchRequest): LaunchPlan {
  const plan = planLaunch(game, site, request);
  if (!plan.ok) return plan;
  const v = vesselOf(request.ship)!;
  const ceiling = payloadCeiling(game, site, request.ship);
  const atCeiling = planLaunch(game, site, { ship: request.ship }, { extraMass: ceiling });
  const d = designOf(v)!;
  const s = statsOf(v)!;
  for (const [m, kg] of Object.entries(plan.draw)) site.stock[m] = Math.max(0, (site.stock[m] ?? 0) - kg);
  for (const k of PROPELLANT_KINDS) {
    const target = fullLoad(d, s, k);
    if (target > (v.propellant[k] ?? 0)) v.propellant[k] = target;
  }
  for (const [m, kg] of Object.entries(request.cargo ?? {})) v.cargo[m] = (v.cargo[m] ?? 0) + kg;
  if (plan.drive) v.propellant[plan.drive] = plan.leftover;
  const dropped = plan.boosters;
  v.boosters = 0;
  v.at = { kind: 'orbit', body: site.worldBody, angle: ORBIT_ANGLE };
  economy.ledger.burned += plan.burned;
  const now = game.elapsed;
  site.launches = [...site.launches.filter((t) => t > now), now + PAD_TURNAROUND_DAYS * DAY];
  ships.launches.push({
    at: game.time,
    site: site.id,
    ship: v.name,
    boosters: dropped,
    payload: plan.payloadMass,
    propellant: plan.burned,
    perTonne: atCeiling.payloadMass > 0 ? (atCeiling.burned / atCeiling.payloadMass) * 1000 : 0
  });
  game.log(
    'ship',
    `Launch from ${site.name}: ${v.name} reached ${game.body(site.worldBody)?.name ?? 'its'} orbit with ${Math.round(plan.payloadMass / 100) / 10} t of payload; ${dropped} booster${dropped === 1 ? '' : 's'} dropped.`,
    false,
    { subject: { kind: 'ship', id: v.id } }
  );
  return plan;
}
