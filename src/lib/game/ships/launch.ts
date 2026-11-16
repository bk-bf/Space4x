import { DAY } from '#lib/game/clock.ts';
import { economy, standing, type Site } from '#lib/game/economy/index.ts';
import { G0, MIN_LIFTOFF_TWR, surfaceGravity, surfaceToOrbit } from '#lib/game/flight/index.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import { material } from '#lib/game/data/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { PROPELLANT_KINDS, PROPELLANTS, type PropellantKind } from '#lib/game/shipdesign/index.ts';
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

function topUp(v: Vessel, draw: Amounts): Partial<Record<PropellantKind, number>> {
  const d = designOf(v);
  const s = statsOf(v);
  const out: Partial<Record<PropellantKind, number>> = { ...v.propellant };
  if (!d || !s) return out;
  for (const k of PROPELLANT_KINDS) {
    const target = Math.min(d.load[k] ?? 0, s.capacity[k] ?? 0);
    const more = target - (v.propellant[k] ?? 0);
    if (more > 0) {
      out[k] = target;
      mix(draw, k, more);
    }
  }
  return out;
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

  const rows = stages.map((v) => {
    const s = statsOf(v);
    const main = s?.main;
    const props = topUp(v, draw);
    const others = PROPELLANT_KINDS.filter((k) => k !== main?.propellant).reduce(
      (a, k) => a + (props[k] ?? 0),
      0
    );
    return { v, s, main, prop: main ? (props[main.propellant] ?? 0) : 0, others };
  });
  for (const r of rows) if (!r.main) reasons.push(`${r.v.name} has no drive.`);
  if (rows.some((r) => !r.main)) return { ...empty(reasons), reasons };

  const lastIndex = rows.length - 1;
  const dryOf = (i: number) => {
    const r = rows[i]!;
    return (
      r.s!.dryMass +
      r.others +
      cargoMass(r.v) +
      (i === lastIndex && stack.payload.kind === 'cargo' ? payloadMass : 0)
    );
  };
  payloadMass += probe?.extraMass ?? 0;
  const shipPayload = stack.payload.kind === 'cargo' ? 0 : payloadMass;
  const above: number[] = [];
  let carry = shipPayload;
  for (let i = lastIndex; i >= 0; i--) {
    above[i] = carry;
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
    const r = rows[i]!;
    const ve = r.main!.isp * G0;
    const dry = dryOf(i);
    const m0 = above[i]! + dry + r.prop;
    const rating = landingRating(designOf(r.v)!);
    const reusable = i < lastIndex && rating >= dry;
    const reserve = reusable ? r.prop * RETURN_RESERVE : 0;
    const dvFull = ve * Math.log(m0 / (m0 - r.prop));
    const base = {
      vessel: r.v.id,
      name: r.v.name,
      dry,
      propellant: r.prop,
      mass0: m0,
      thrust: r.main!.thrust * r.main!.throttle
    };
    if (final < 0 && cum + dvFull >= need - 1e-9) {
      final = i;
      const used = m0 * (1 - Math.exp(-(need - cum) / ve));
      leftover = r.prop - used;
      burned += used;
      plans.push({ ...base, fate: 'orbit', reserve: 0, burned: used, dv: need - cum });
      cum = need;
      continue;
    }
    if (final >= 0) {
      plans.push({ ...base, fate: 'carried', reserve: 0, burned: 0, dv: 0 });
      continue;
    }
    const dv = ve * Math.log(m0 / (m0 - (r.prop - reserve)));
    cum += dv;
    burned += r.prop;
    plans.push({ ...base, fate: reusable ? 'returns' : 'expended', reserve, burned: r.prop, dv });
  }

  const first = rows[0]!;
  const g = surfaceGravity(body);
  const liftoffThrust =
    (body.atmosphere ? first.main!.thrustSeaLevel : first.main!.thrust) * first.main!.throttle;
  const twr = liftoffThrust / (liftoffMass * g);
  if (twr < MIN_LIFTOFF_TWR)
    reasons.push(`Lift-off thrust to weight is ${twr.toFixed(2)}; ${MIN_LIFTOFF_TWR} is needed.`);
  if (final < 0)
    reasons.push(
      `The stack has ${(cum / 1000).toFixed(2)} km/s of delta-v; reaching orbit takes ${(need / 1000).toFixed(2)} km/s.`
    );
  for (const [m, kg] of checkStock ? Object.entries(draw) : []) {
    const have = site.stock[m] ?? 0;
    if (have + 1e-6 < kg)
      reasons.push(`${material(m).name} is short by ${Math.ceil(kg - have).toLocaleString('en-US')} kg.`);
  }
  return {
    ok: reasons.length === 0,
    reasons,
    stages: plans,
    payloadMass,
    liftoffMass,
    liftoffThrust,
    twr,
    dv: cum,
    need,
    final,
    leftover,
    draw,
    burned
  };
}

export function payloadCeiling(game: Game, site: Site, stack: Stack, limit = 500_000): number {
  const none: Stack = { ...stack, payload: { kind: 'none' } };
  const reaches = (kg: number) => {
    const plan = planStack(game, site, none, { extraMass: kg });
    return plan.final >= 0 && plan.twr >= MIN_LIFTOFF_TWR;
  };
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

export function launch(game: Game, site: Site, stack: Stack): StackPlan {
  const plan = planStack(game, site, stack);
  if (!plan.ok) return plan;
  const stageVessels = stack.stages.map((id) => vesselOf(id)!);
  const top = stageVessels[stageVessels.length - 1]!;
  for (const [m, kg] of Object.entries(plan.draw)) site.stock[m] = Math.max(0, (site.stock[m] ?? 0) - kg);
  for (const v of stageVessels) {
    const d = designOf(v);
    const s = statsOf(v);
    if (!d || !s) continue;
    for (const k of PROPELLANT_KINDS) {
      const target = Math.min(d.load[k] ?? 0, s.capacity[k] ?? 0);
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
    propellant: plan.burned
  });
  game.log(
    'ship',
    `Launch from ${site.name}: ${stageVessels.length} stages, ${Math.round(plan.payloadMass / 100) / 10} t of payload reached ${game.body(site.worldBody)?.name ?? 'orbit'} orbit; ${returned} stage${returned === 1 ? '' : 's'} came back, ${lost.length} lost.`,
    false,
    { subject: { kind: 'ship', id: top.id } }
  );
  return plan;
}
