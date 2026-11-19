import { DAY } from '#lib/game/clock.ts';
import { statsFor } from '#lib/game/classes.svelte.ts';
import { economy, standing, type Site } from '#lib/game/economy/index.ts';
import {
  G0,
  MIN_LIFTOFF_TWR,
  surfaceGravity,
  surfaceToOrbit,
  type FlightBody
} from '#lib/game/flight/index.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import { material } from '#lib/game/data/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import {
  PROPELLANT_KINDS,
  PROPELLANTS,
  type DesignStats,
  type PropellantKind,
  type ShipDesign
} from '#lib/game/shipdesign/index.ts';
import { cargoMass, designOf, landingRating, statsOf, wetMass } from './model.ts';
import { ships } from './state.svelte.ts';
import type { Vessel } from './types.ts';
import { clearTripOption, flightBody } from './world.ts';

export const RETURN_RESERVE = 0.07;
export const PAD_TURNAROUND_DAYS = 4;
export const ORBIT_ANGLE = 0;
export const launchEstimated = true;

export type Payload =
  { kind: 'none' } | { kind: 'ship'; ship: string } | { kind: 'cargo'; cargo: Record<string, number> };

export interface Stack {
  stages: string[];
  payload: Payload;
}

export type Fate = 'returns' | 'expended' | 'orbit' | 'carried';

export interface StagePlan {
  vessel: string;
  name: string;
  fate: Fate;
  dry: number;
  propellant: number;
  reserve: number;
  mass0: number;
  burned: number;
  dv: number;
  thrust: number;
}

export interface StackPlan {
  ok: boolean;
  reasons: string[];
  stages: StagePlan[];
  payloadMass: number;
  liftoffMass: number;
  liftoffThrust: number;
  twr: number;
  dv: number;
  need: number;
  final: number;
  leftover: number;
  draw: Amounts;
  burned: number;
}

const empty = (reasons: string[]): StackPlan => ({
  ok: false,
  reasons,
  stages: [],
  payloadMass: 0,
  liftoffMass: 0,
  liftoffThrust: 0,
  twr: 0,
  dv: 0,
  need: 0,
  final: -1,
  leftover: 0,
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

export interface StageInput {
  id: string;
  name: string;
  design: ShipDesign | undefined;
  stats: DesignStats | undefined;
  propellant: Partial<Record<PropellantKind, number>>;
  cargo: number;
}

type Flight = Omit<StackPlan, 'ok' | 'reasons' | 'payloadMass' | 'draw'>;

function flyStack(body: FlightBody, inputs: readonly StageInput[], cargo: number, above: number): Flight {
  const rows = inputs.map((r) => {
    const main = r.stats!.main!;
    const others = PROPELLANT_KINDS.filter((k) => k !== main.propellant).reduce(
      (a, k) => a + (r.propellant[k] ?? 0),
      0
    );
    return { r, main, prop: r.propellant[main.propellant] ?? 0, others };
  });
  const lastIndex = rows.length - 1;
  const dryOf = (i: number) => {
    const row = rows[i]!;
    return row.r.stats!.dryMass + row.others + row.r.cargo + (i === lastIndex ? cargo : 0);
  };
  const aboveOf: number[] = [];
  let carry = above;
  for (let i = lastIndex; i >= 0; i--) {
    aboveOf[i] = carry;
    carry += dryOf(i) + rows[i]!.prop;
  }
  const liftoffMass = carry;
  const need = surfaceToOrbit(body);
  const plans: StagePlan[] = [];
  let cum = 0;
  let final = -1;
  let leftover = 0;
  let burned = 0;
  for (let i = 0; i <= lastIndex; i++) {
    const row = rows[i]!;
    const ve = row.main.isp * G0;
    const dry = dryOf(i);
    const m0 = aboveOf[i]! + dry + row.prop;
    const rating = row.r.design ? landingRating(row.r.design) : 0;
    const reusable = i < lastIndex && rating >= dry;
    const reserve = reusable ? row.prop * RETURN_RESERVE : 0;
    const dvFull = ve * Math.log(m0 / (m0 - row.prop));
    const base = {
      vessel: row.r.id,
      name: row.r.name,
      dry,
      propellant: row.prop,
      mass0: m0,
      thrust: row.main.thrust * row.main.throttle
    };
    if (final < 0 && cum + dvFull >= need - 1e-9) {
      final = i;
      const used = m0 * (1 - Math.exp(-(need - cum) / ve));
      leftover = row.prop - used;
      burned += used;
      plans.push({ ...base, fate: 'orbit', reserve: 0, burned: used, dv: need - cum });
      cum = need;
      continue;
    }
    if (final >= 0) {
      plans.push({ ...base, fate: 'carried', reserve: 0, burned: 0, dv: 0 });
      continue;
    }
    const dv = ve * Math.log(m0 / (m0 - (row.prop - reserve)));
    cum += dv;
    burned += row.prop;
    plans.push({ ...base, fate: reusable ? 'returns' : 'expended', reserve, burned: row.prop, dv });
  }
  const first = rows[0]!.main;
  const liftoffThrust = (body.atmosphere ? first.thrustSeaLevel : first.thrust) * first.throttle;
  const twr = liftoffThrust / (liftoffMass * surfaceGravity(body));
  return { stages: plans, liftoffMass, liftoffThrust, twr, dv: cum, need, final, leftover, burned };
}

const flightReasons = (f: Flight): string[] => [
  ...(f.twr < MIN_LIFTOFF_TWR
    ? [`Lift-off thrust to weight is ${f.twr.toFixed(2)}; ${MIN_LIFTOFF_TWR} is needed.`]
    : []),
  ...(f.final < 0
    ? [
        `The stack has ${(f.dv / 1000).toFixed(2)} km/s of delta-v; reaching orbit takes ${(f.need / 1000).toFixed(2)} km/s.`
      ]
    : [])
];

export const reachesOrbit = (plan: Pick<StackPlan, 'final' | 'twr'>): boolean =>
  plan.final >= 0 && plan.twr >= MIN_LIFTOFF_TWR;

function stagesFly(inputs: readonly StageInput[]): string[] {
  return inputs.filter((r) => !r.stats?.main).map((r) => `${r.name} has no drive.`);
}

export function planStack(game: Game, site: Site, stack: Stack, probe?: { extraMass: number }): StackPlan {
  const checkStock = !probe;
  const reasons: string[] = [];
  if (stack.stages.length === 0) return empty(['Add a first stage.']);
  const body = flightBody(game, site.worldBody);
  if (!body || site.place !== 'surface') return empty(['Launches start from a surface site.']);
  if (standing(site, 'launch_site') <= 0) reasons.push(`${site.name} has no launch site.`);
  else if (freePads(site, game.elapsed) <= 0) reasons.push('Every launch pad is busy.');

  const stages: Vessel[] = [];
  for (const id of stack.stages) {
    const v = vesselOf(id);
    if (!v) return empty(['A stage no longer exists.']);
    if (v.at.kind !== 'site' || v.at.site !== site.id || v.trip)
      reasons.push(`${v.name} is not at ${site.name}.`);
    if (stages.includes(v)) return empty(['A stage is listed twice.']);
    stages.push(v);
  }
  const top = stages[stages.length - 1]!;
  const draw: Amounts = {};
  let payloadMass = 0;
  if (stack.payload.kind === 'ship') {
    const p = vesselOf(stack.payload.ship);
    if (!p || stages.includes(p)) return empty(['The payload ship no longer exists.']);
    if (p.at.kind !== 'site' || p.at.site !== site.id || p.trip)
      reasons.push(`${p.name} is not at ${site.name}.`);
    payloadMass = wetMass(p);
  } else if (stack.payload.kind === 'cargo') {
    const mass = Object.values(stack.payload.cargo).reduce((a, x) => a + x, 0);
    const room = (statsOf(top)?.payloadCapacity ?? 0) - cargoMass(top);
    if (mass > room + 1e-6)
      reasons.push(
        `${top.name} holds ${Math.round(room)} kg of cargo and ${Math.round(mass)} kg was asked for.`
      );
    for (const [m, kg] of Object.entries(stack.payload.cargo)) draw[m] = (draw[m] ?? 0) + kg;
    payloadMass = mass;
  }

  const inputs: StageInput[] = stages.map((v) => ({
    id: v.id,
    name: v.name,
    design: designOf(v),
    stats: statsOf(v),
    propellant: topUp(v, draw),
    cargo: cargoMass(v)
  }));
  const noDrive = stagesFly(inputs);
  if (noDrive.length) return { ...empty([...reasons, ...noDrive]) };

  const cargo = stack.payload.kind === 'cargo' ? payloadMass : 0;
  payloadMass += probe?.extraMass ?? 0;
  const flight = flyStack(body, inputs, cargo, payloadMass - cargo);
  reasons.push(...flightReasons(flight));
  for (const [m, kg] of checkStock ? Object.entries(draw) : []) {
    const have = site.stock[m] ?? 0;
    if (have + 1e-6 < kg)
      reasons.push(`${material(m).name} is short by ${Math.ceil(kg - have).toLocaleString('en-US')} kg.`);
  }
  return { ...flight, ok: reasons.length === 0, reasons, payloadMass, draw };
}

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

export const CEILING_LIMIT = 500_000;

export function payloadCeiling(game: Game, site: Site, stack: Stack, limit = CEILING_LIMIT): number {
  const none: Stack = { ...stack, payload: { kind: 'none' } };
  return ceilingOf((kg) => reachesOrbit(planStack(game, site, none, { extraMass: kg })), limit);
}

export const LAUNCH_BODY = 'earth';

export function planDesignStack(
  game: Game,
  designs: readonly ShipDesign[],
  payload: number,
  worldBody = LAUNCH_BODY
): StackPlan {
  if (designs.length === 0) return empty(['Add a first stage.']);
  const body = flightBody(game, worldBody);
  if (!body) return empty(['Launches start from a surface site.']);
  const inputs: StageInput[] = designs.map((d, i) => ({
    id: `${i}:${d.id}`,
    name: d.name,
    design: d,
    stats: statsFor(d),
    propellant: fullTanks(d),
    cargo: 0
  }));
  const noDrive = stagesFly(inputs);
  if (noDrive.length) return empty(noDrive);
  const flight = flyStack(body, inputs, 0, payload);
  const reasons = flightReasons(flight);
  return { ...flight, ok: reasons.length === 0, reasons, payloadMass: payload, draw: {} };
}

export function designCeiling(
  game: Game,
  designs: readonly ShipDesign[],
  worldBody = LAUNCH_BODY,
  limit = CEILING_LIMIT
): number {
  return ceilingOf((kg) => reachesOrbit(planDesignStack(game, designs, kg, worldBody)), limit);
}

export function launch(game: Game, site: Site, stack: Stack): StackPlan {
  const plan = planStack(game, site, stack);
  if (!plan.ok) return plan;
  const stageVessels = stack.stages.map((id) => vesselOf(id)!);
  const ceiling = payloadCeiling(game, site, stack);
  const atCeiling =
    ceiling > 0
      ? planStack(game, site, { ...stack, payload: { kind: 'none' } }, { extraMass: ceiling })
      : plan;
  const top = stageVessels[stageVessels.length - 1]!;
  for (const [m, kg] of Object.entries(plan.draw)) site.stock[m] = Math.max(0, (site.stock[m] ?? 0) - kg);
  for (const v of stageVessels) {
    const d = designOf(v);
    const s = statsOf(v);
    if (!d || !s) continue;
    for (const k of PROPELLANT_KINDS) {
      const target = fullLoad(d, s, k);
      if (target > (v.propellant[k] ?? 0)) v.propellant[k] = target;
    }
  }
  if (stack.payload.kind === 'cargo')
    for (const [m, kg] of Object.entries(stack.payload.cargo)) top.cargo[m] = (top.cargo[m] ?? 0) + kg;

  const lost: string[] = [];
  let returned = 0;
  stageVessels.forEach((v, i) => {
    const p = plan.stages[i]!;
    const main = statsOf(v)!.main!.propellant;
    if (p.fate === 'orbit') {
      v.propellant[main] = plan.leftover;
      v.at = { kind: 'orbit', body: site.worldBody, angle: ORBIT_ANGLE };
    } else if (p.fate === 'carried') {
      v.at = { kind: 'orbit', body: site.worldBody, angle: ORBIT_ANGLE };
    } else if (p.fate === 'returns') {
      v.propellant[main] = 0;
      returned++;
    } else {
      lost.push(v.id);
    }
  });
  if (stack.payload.kind === 'ship') {
    const p = vesselOf(stack.payload.ship)!;
    p.at = { kind: 'orbit', body: site.worldBody, angle: ORBIT_ANGLE };
  }
  ships.vessels = ships.vessels.filter((v) => !lost.includes(v.id));
  for (const id of lost) clearTripOption(id);
  economy.ledger.burned += plan.burned;
  const now = game.elapsed;
  site.launches = [...site.launches.filter((t) => t > now), now + PAD_TURNAROUND_DAYS * DAY];
  ships.launches.push({
    at: game.time,
    site: site.id,
    stages: stageVessels.map((v) => v.name),
    returned,
    lost: lost.length,
    payload: plan.payloadMass,
    propellant: plan.burned,
    perTonne: ceiling > 0 ? (atCeiling.burned / ceiling) * 1000 : 0
  });
  game.log(
    'ship',
    `Launch from ${site.name}: ${stageVessels.length} stages, ${Math.round(plan.payloadMass / 100) / 10} t of payload reached ${game.body(site.worldBody)?.name ?? 'orbit'} orbit; ${returned} stage${returned === 1 ? '' : 's'} came back, ${lost.length} lost.`,
    false,
    { subject: { kind: 'ship', id: top.id } }
  );
  return plan;
}
