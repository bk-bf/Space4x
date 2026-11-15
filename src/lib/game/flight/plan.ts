import {
  LINE_GRAVITY_RATIO_LIMIT,
  MAX_BURN_SHARE,
  MIN_LANDING_TWR,
  PASS_ARC_LIMIT,
  SPIRAL_ACCURACY_LIMIT,
  MIN_LIFTOFF_TWR,
  TWO_PI
} from './constants.ts';
import { localBurn, spiralBurn, type BurnResult, type BurnSpec } from './burns.ts';
import { crossingTransfer, hohmann, type Crossing } from './kepler.ts';
import { lineAt, lineGravityRatio, solveLine, type LineSolution } from './line.ts';
import {
  burnTime,
  exhaustVelocity,
  meanAcceleration,
  shipDeltaV,
  shipMass,
  shipThrust,
  type Ship
} from './rocket.ts';
import { spiralDuration, spiralDv, spiralSweep, type Spiral } from './spiral.ts';
import {
  absoluteState,
  bodyOf,
  gmOfPrimary,
  placeState,
  relativeState,
  resolvePlace,
  samePlace,
  STAR,
  type Endpoint,
  type State
} from './system.ts';
import type {
  FlightBody,
  FlightSystem,
  Maneuver,
  Place,
  Profile,
  Reason,
  Track,
  TripOption,
  TripPlan
} from './types.ts';
import { norm, sub, type V2 } from './vec.ts';
import { captureIntoOrbit, orbitalPeriod, orbitToSurface, surfaceGravity, surfaceToOrbit } from './wells.ts';

export interface TripRequest {
  from: Place;
  to: Place;
  departAfter: number;
  ship: Ship;
  system: FlightSystem;
  aerobrake?: boolean;
}

interface Stage {
  body: FlightBody;
  r: number;
}

interface Side {
  e: Endpoint;
  stages: Stage[];
  top?: FlightBody;
  r: number;
  angle0: number;
  omega: number;
  surface?: FlightBody;
}

function buildSide(system: FlightSystem, e: Endpoint, primary: string): Side | undefined {
  const k = e.chain.indexOf(primary);
  if (k < 0) return undefined;
  const stages: Stage[] = [];
  for (let i = 0; i < k; i++) {
    const body = bodyOf(system, e.chain[i] ?? '');
    const below = i === 0 ? undefined : bodyOf(system, e.chain[i - 1] ?? '');
    if (!body) return undefined;
    stages.push({ body, r: i === 0 ? e.r : (below?.orbit ?? e.r) });
  }
  const surface = e.place.kind === 'surface' ? e.body : undefined;
  if (k === 0) return { e, stages, r: e.r, angle0: e.angle, omega: e.omega, surface };
  const top = stages[k - 1]?.body;
  if (!top) return undefined;
  return { e, stages, top, r: top.orbit, angle0: top.angle, omega: top.angularSpeed, surface };
}

const levelState = (system: FlightSystem, side: Side, primary: string, t: number): State => {
  if (side.top) return relativeState(system, side.top.id, primary, t);
  const s = placeState(system, side.e, t);
  const p = absoluteState(system, primary, t);
  return { pos: sub(s.pos, p.pos), vel: sub(s.vel, p.vel) };
};

type Model = 'orbit' | 'spiral' | 'line';

interface Candidate {
  model: Model;
  vInfDep: number;
  vInfArr: number;
  bareDepDv: number;
  bareArrDv: number;
  outward: boolean;
  helioDv: number;
  helioDuration: number;
  stop: boolean;
}

type Phase = 'pre' | 'helio' | 'post';

interface Evaluation {
  maneuvers: Maneuver[];
  phases: Phase[];
  dv: number;
  propellant: number;
  massEnd: number;
  massAfterDeparture: number;
  pre: number;
  post: number;
  reasons: Reason[];
  spiralLocal: boolean;
  aerobraked: boolean;
}

interface Context {
  req: TripRequest;
  primary: string;
  gm: number;
  A: Side;
  B: Side;
  thrust: number;
  thrustSeaLevel: number;
  isp: number;
}

const zeroCandidate = (model: Model): Candidate => ({
  model,
  vInfDep: 0,
  vInfArr: 0,
  bareDepDv: 0,
  bareArrDv: 0,
  outward: true,
  helioDv: 0,
  helioDuration: 0,
  stop: true
});

function evaluate(ctx: Context, c: Candidate): Evaluation {
  const { A, B, req } = ctx;
  const th = { thrust: ctx.thrust, isp: ctx.isp };
  const ve = exhaustVelocity(ctx.isp);
  const forceSpiral = c.model === 'spiral';
  const list: Maneuver[] = [];
  const phases: Phase[] = [];
  const reasons: Reason[] = [];
  let mass = shipMass(req.ship);
  let dv = 0;
  let pre = 0;
  let post = 0;
  let spiralLocal = false;
  let aerobraked = false;
  const push = (m: Omit<Maneuver, 'start'>, side: Phase, newMass: number) => {
    list.push({ ...m, start: 0 });
    phases.push(side);
    dv += m.dv;
    if (side === 'pre') pre += m.duration;
    if (side === 'post') post += m.duration;
    mass = newMass;
  };
  const run = (spec: BurnSpec): BurnResult =>
    forceSpiral ? spiralBurn(spec, mass, th) : localBurn(spec, mass, th);

  if (A.surface) {
    const b = A.surface;
    const d = surfaceToOrbit(b, A.stages[0]?.r ?? A.r);
    const twr = ctx.thrustSeaLevel / (mass * surfaceGravity(b));
    if (twr < MIN_LIFTOFF_TWR) {
      reasons.push({
        code: 'thrust-surface',
        message: `thrust is too low to leave the surface of ${b.id}`,
        need: MIN_LIFTOFF_TWR,
        have: twr
      });
    }
    push(
      {
        kind: 'ascent',
        body: b.id,
        mode: 'surface',
        dv: d,
        duration: burnTime(mass, ctx.thrustSeaLevel, ctx.isp, d)
      },
      'pre',
      mass * Math.exp(-d / ve)
    );
  }
  A.stages.forEach((s, i) => {
    const top = i === A.stages.length - 1;
    const r = run({ kind: 'escape', gm: s.body.gm, r: s.r, vInf: top && !forceSpiral ? c.vInfDep : 0 });
    if (r.mode === 'spiral') spiralLocal = true;
    push({ kind: 'escape', body: s.body.id, mode: r.mode, dv: r.dv, duration: r.duration }, 'pre', r.massEnd);
  });
  if (A.stages.length === 0 && c.model === 'orbit' && c.bareDepDv > 0) {
    const r = localBurn({ kind: 'bare', gm: ctx.gm, r: A.r, dv: c.bareDepDv, outward: c.outward }, mass, th);
    if (r.mode === 'spiral') spiralLocal = true;
    push({ kind: 'burn', mode: r.mode, dv: r.dv, duration: r.duration }, 'pre', r.massEnd);
  }
  const massAfterDeparture = mass;
  if (c.model !== 'orbit') {
    const d = c.helioDv;
    const dur = c.model === 'spiral' ? burnTime(mass, ctx.thrust, ctx.isp, d) : c.helioDuration;
    push(
      { kind: 'burn', mode: c.model === 'spiral' ? 'spiral' : 'impulsive', dv: d, duration: dur },
      'helio',
      mass * Math.exp(-d / ve)
    );
  }
  if (c.stop) {
    if (B.stages.length === 0 && c.model === 'orbit' && c.bareArrDv > 0) {
      const r = localBurn(
        { kind: 'bare', gm: ctx.gm, r: B.r, dv: c.bareArrDv, outward: !c.outward },
        mass,
        th
      );
      if (r.mode === 'spiral') spiralLocal = true;
      push({ kind: 'burn', mode: r.mode, dv: r.dv, duration: r.duration }, 'post', r.massEnd);
    }
    for (let i = B.stages.length - 1; i >= 0; i--) {
      const s = B.stages[i];
      if (!s) continue;
      const top = i === B.stages.length - 1;
      const vInf = top && !forceSpiral ? c.vInfArr : 0;
      const aero = !forceSpiral && !!req.aerobrake;
      const cap = captureIntoOrbit(s.body, s.body.gm, s.r, vInf, aero);
      if (cap.aero) {
        aerobraked = true;
        const dur = burnTime(mass, ctx.thrust, ctx.isp, cap.dv) + orbitalPeriod(s.body.gm, s.r);
        push(
          { kind: 'capture', body: s.body.id, mode: 'aero', dv: cap.dv, duration: dur },
          'post',
          mass * Math.exp(-cap.dv / ve)
        );
      } else {
        const r = run({ kind: 'capture', gm: s.body.gm, r: s.r, vInf });
        if (r.mode === 'spiral') spiralLocal = true;
        push(
          { kind: 'capture', body: s.body.id, mode: r.mode, dv: r.dv, duration: r.duration },
          'post',
          r.massEnd
        );
      }
    }
    if (B.surface) {
      const b = B.surface;
      const aero = !!req.aerobrake && !!b.atmosphere;
      const d = orbitToSurface(b, { aero, orbitRadius: B.stages[0]?.r ?? B.r });
      const massEnd = mass * Math.exp(-d / ve);
      const twr = ctx.thrustSeaLevel / (massEnd * surfaceGravity(b));
      if (!aero && twr < MIN_LANDING_TWR) {
        reasons.push({
          code: 'thrust-landing',
          message: `thrust is too low to land on ${b.id}`,
          need: MIN_LANDING_TWR,
          have: twr
        });
      }
      push(
        {
          kind: 'descent',
          body: b.id,
          mode: aero ? 'aero' : 'surface',
          dv: d,
          duration: burnTime(mass, ctx.thrustSeaLevel, ctx.isp, d)
        },
        'post',
        massEnd
      );
    }
  }
  return {
    maneuvers: list,
    phases,
    dv,
    propellant: shipMass(req.ship) - mass,
    massEnd: mass,
    massAfterDeparture,
    pre,
    post,
    reasons,
    spiralLocal,
    aerobraked
  };
}

function nextWindow(
  tMin: number,
  lead0: number,
  omegaOrigin: number,
  omegaTarget: number,
  sweep: number,
  T: number
): number {
  const k = omegaTarget - omegaOrigin;
  if (Math.abs(k) < 1e-18) return tMin;
  const c = sweep - omegaTarget * T - lead0;
  const synodic = TWO_PI / Math.abs(k);
  const ref = c / k;
  return ref + synodic * Math.ceil((tMin - ref) / synodic - 1e-12);
}

const dirOf = (omega: number): 1 | -1 => (omega >= 0 ? 1 : -1);

interface Built {
  option: Omit<TripOption, 'profile' | 'canReturn' | 'returnDv'>;
  eval: Evaluation;
  feasible: boolean;
}

const slack = (x: number): number => 1e-9 * Math.max(1, Math.abs(x));

function finish(
  ctx: Context,
  c: Candidate,
  ev: Evaluation,
  track: Track,
  tWindow: number,
  helioDuration: number
): Built {
  const launch = tWindow - ev.pre;
  const helioEnd = tWindow + helioDuration;
  let pre = launch;
  let post = helioEnd;
  const maneuvers = ev.maneuvers.map((m, i) => {
    const phase = ev.phases[i];
    if (phase === 'helio') return { ...m, start: tWindow };
    if (phase === 'pre') {
      const out = { ...m, start: pre };
      pre += m.duration;
      return out;
    }
    const out = { ...m, start: post };
    post += m.duration;
    return out;
  });
  const end = helioEnd + ev.post;
  const left = ctx.req.ship.propellant - ev.propellant;
  return {
    option: {
      model: c.model,
      departure: launch,
      window: tWindow,
      arrival: end,
      duration: end - launch,
      dv: ev.dv,
      propellant: ev.propellant,
      propellantLeft: left,
      canStop: c.stop,
      aerobraked: ev.aerobraked,
      approximate: false,
      maneuvers,
      stamps: { launch, helioStart: tWindow, helioEnd, end },
      track,
      primary: ctx.primary,
      origin: ctx.A.e,
      target: ctx.B.e,
      system: ctx.req.system
    },
    eval: ev,
    feasible:
      ev.reasons.length === 0 && ev.propellant <= ctx.req.ship.propellant + slack(ctx.req.ship.propellant)
  };
}

function orbitBuild(ctx: Context, c: Candidate, cross: Crossing, time: number, sweep: number): Built {
  const ev = evaluate(ctx, c);
  const tMin = ctx.req.departAfter + ev.pre;
  const tWindow = nextWindow(tMin, ctx.B.angle0 - ctx.A.angle0, ctx.A.omega, ctx.B.omega, sweep, time);
  const start = levelState(ctx.req.system, ctx.A, ctx.primary, tWindow);
  const theta0 = Math.atan2(start.pos[1], start.pos[0]);
  const track: Track = { kind: 'conic', conic: cross.conic, dir: dirOf(ctx.A.omega), theta0 };
  return finish(ctx, c, ev, track, tWindow, time);
}

function hohmannCandidate(ctx: Context, stop: boolean): Built | undefined {
  const r1 = ctx.A.r;
  const r2 = ctx.B.r;
  if (Math.abs(r1 - r2) < 1) return undefined;
  const h = hohmann(ctx.gm, r1, r2);
  const cross = crossingTransfer(ctx.gm, r1, r2, h.dv1);
  if (!cross) return undefined;
  const c: Candidate = {
    ...zeroCandidate('orbit'),
    vInfDep: h.dv1,
    vInfArr: h.dv2,
    bareDepDv: h.dv1,
    bareArrDv: h.dv2,
    outward: r2 > r1,
    stop
  };
  return orbitBuild(ctx, c, { ...cross, conic: cross.conic }, h.time, Math.PI);
}

function familyCandidate(ctx: Context, dv1: number): Built | undefined {
  const r1 = ctx.A.r;
  const r2 = ctx.B.r;
  const cross = crossingTransfer(ctx.gm, r1, r2, dv1);
  if (!cross) return undefined;
  const c: Candidate = {
    ...zeroCandidate('orbit'),
    vInfDep: cross.dv1,
    vInfArr: cross.dv2,
    bareDepDv: cross.dv1,
    bareArrDv: cross.dv2,
    outward: r2 > r1
  };
  return orbitBuild(ctx, c, cross, cross.time, cross.sweep);
}

function spiralBuild(ctx: Context): Built | undefined {
  const r1 = ctx.A.r;
  const r2 = ctx.B.r;
  if (Math.abs(r1 - r2) < 1) return undefined;
  const dv = spiralDv(ctx.gm, r1, r2);
  const c: Candidate = { ...zeroCandidate('spiral'), helioDv: dv };
  const ev = evaluate(ctx, c);
  const sp: Spiral = {
    gm: ctx.gm,
    r1,
    r2,
    mass: ev.massAfterDeparture,
    thrust: ctx.thrust,
    isp: ctx.isp
  };
  const T = spiralDuration(sp);
  const sweep = spiralSweep(sp, T);
  const tMin = ctx.req.departAfter + ev.pre;
  const tWindow = nextWindow(tMin, ctx.B.angle0 - ctx.A.angle0, ctx.A.omega, ctx.B.omega, sweep, T);
  const start = levelState(ctx.req.system, ctx.A, ctx.primary, tWindow);
  const theta0 = Math.atan2(start.pos[1], start.pos[0]);
  const track: Track = { kind: 'spiral', spiral: sp, dir: dirOf(ctx.A.omega), theta0 };
  const built = finish(ctx, { ...c, helioDuration: T }, ev, track, tWindow, T);
  const accel = ctx.thrust / ev.massAfterDeparture;
  const gravity = ctx.gm / Math.max(r1, r2) ** 2;
  built.option.approximate = accel / gravity > SPIRAL_ACCURACY_LIMIT;
  return built;
}

const primaryRadius = (system: FlightSystem, id: string): number =>
  id === STAR ? system.star.radius : (bodyOf(system, id)?.radius ?? 0);

function lineAtDelay(ctx: Context, budget: number, delay: number): Built | undefined {
  const sys = ctx.req.system;
  const zero = zeroCandidate('line');
  const ev0 = evaluate(ctx, zero);
  const budgetH = budget - ev0.dv;
  if (budgetH <= 0) return undefined;
  const tD = ctx.req.departAfter + ev0.pre + delay;
  const o = levelState(sys, ctx.A, ctx.primary, tD);
  const frame = (T: number) => {
    const g = levelState(sys, ctx.B, ctx.primary, tD + T);
    const D: V2 = [g.pos[0] - o.pos[0] - o.vel[0] * T, g.pos[1] - o.pos[1] - o.vel[1] * T];
    const w: V2 = [g.vel[0] - o.vel[0], g.vel[1] - o.vel[1]];
    return { D, w };
  };
  let dvTry = budgetH;
  let sol: LineSolution | undefined;
  for (let i = 0; i < 40; i++) {
    const a = meanAcceleration(ev0.massAfterDeparture, ctx.thrust, ctx.isp, dvTry);
    sol = solveLine(a, frame, budgetH);
    if (!sol) return undefined;
    if (Math.abs(sol.dv - dvTry) < 1e-7 * Math.max(1, dvTry)) break;
    dvTry = sol.dv;
  }
  if (!sol) return undefined;
  const closest = lineClosest(ctx, sol, o);
  if (closest <= primaryRadius(sys, ctx.primary)) return undefined;
  if (lineGravityRatio(ctx.gm, closest, sol) > LINE_GRAVITY_RATIO_LIMIT) return undefined;
  const c: Candidate = { ...zero, helioDv: sol.dv, helioDuration: sol.T };
  const ev = evaluate(ctx, c);
  const track: Track = { kind: 'line', solution: sol, start: o };
  return finish(ctx, c, ev, track, tD, sol.T);
}

function lineClosest(ctx: Context, sol: LineSolution, o: State): number {
  let closest = Infinity;
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const tau = (sol.T * i) / n;
    const s = lineAt(sol, tau);
    const p: V2 = [o.pos[0] + o.vel[0] * tau + s.pos[0], o.pos[1] + o.vel[1] * tau + s.pos[1]];
    closest = Math.min(closest, norm(p));
  }
  return closest;
}

const LINE_DELAY_STEPS = 72;

function lineBuild(ctx: Context, budget: number): Built | undefined {
  const k = Math.abs(ctx.B.omega - ctx.A.omega);
  const span = k > 1e-18 ? TWO_PI / k : 365.25 * 86400;
  for (let i = 0; i < LINE_DELAY_STEPS; i++) {
    const b = lineAtDelay(ctx, budget, (span * i) / LINE_DELAY_STEPS);
    if (b) return b;
  }
  return undefined;
}

const arrivalOf = (b: Built): number => b.option.arrival;

function familyAtBudget(ctx: Context, budget: number, floorDv1: number): Built | undefined {
  const f = (dv1: number): number => {
    const b = familyCandidate(ctx, dv1);
    if (!b) return Infinity;
    const T = b.option.stamps.helioEnd - b.option.stamps.helioStart;
    return (b.eval.pre + b.eval.post) / T > MAX_BURN_SHARE ? Infinity : b.eval.dv;
  };
  if (f(floorDv1) > budget) return undefined;
  let lo = floorDv1;
  let hi = floorDv1 * 1.2;
  for (let i = 0; i < 60 && f(hi) <= budget; i++) {
    lo = hi;
    hi *= 1.5;
  }
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= budget) lo = mid;
    else hi = mid;
  }
  return familyCandidate(ctx, lo);
}

function bestAtBudget(ctx: Context, budget: number, floorDv1: number): Built | undefined {
  const fam = familyAtBudget(ctx, budget, floorDv1);
  const line = lineBuild(ctx, budget);
  const options = [fam, line].filter((b): b is Built => !!b && b.feasible);
  options.sort((a, b) => arrivalOf(a) - arrivalOf(b));
  return options[0];
}

function contextFor(req: TripRequest): { ctx?: Context; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const ea = resolvePlace(req.system, req.from);
  const eb = resolvePlace(req.system, req.to);
  if (!ea || !eb) {
    reasons.push({ code: 'unknown-body', message: 'a place names a body that is not in the system' });
    return { reasons };
  }
  if (samePlace(req.from, req.to)) {
    reasons.push({ code: 'same-place', message: 'the origin and the destination are the same place' });
    return { reasons };
  }
  const primary = ea.chain.find((id) => eb.chain.includes(id));
  if (!primary) {
    reasons.push({ code: 'no-path', message: 'the places share no primary body' });
    return { reasons };
  }
  const A = buildSide(req.system, ea, primary);
  const B = buildSide(req.system, eb, primary);
  if (!A || !B) {
    reasons.push({ code: 'no-path', message: 'the places cannot be placed around a shared primary' });
    return { reasons };
  }
  const ctx: Context = {
    req,
    primary,
    gm: gmOfPrimary(req.system, primary),
    A,
    B,
    thrust: shipThrust(req.ship),
    thrustSeaLevel: shipThrust(req.ship, true),
    isp: req.ship.engine.isp
  };
  return { ctx, reasons };
}

function burnsAreShort(ctx: Context, b: Built): boolean {
  const side = (s: Side, phase: Phase, duration: number): boolean => {
    if (s.stages.length > 0) return Math.abs(s.omega) * duration <= PASS_ARC_LIMIT;
    return !b.eval.maneuvers.some(
      (m, i) => b.eval.phases[i] === phase && m.kind === 'burn' && m.mode === 'spiral'
    );
  };
  return side(ctx.A, 'pre', b.eval.pre) && side(ctx.B, 'post', b.eval.post);
}

function cheapest(ctx: Context): { built?: Built; flyby?: Built } {
  const h = hohmannCandidate(ctx, true);
  if (!h) return {};
  if (burnsAreShort(ctx, h)) return { built: h, flyby: hohmannCandidate(ctx, false) };
  return { built: spiralBuild(ctx) };
}

function infeasibility(ctx: Context, b: Built): Reason[] {
  const out = [...b.eval.reasons];
  const have = shipDeltaV(ctx.req.ship);
  if (b.eval.propellant > ctx.req.ship.propellant + slack(ctx.req.ship.propellant)) {
    const need =
      exhaustVelocity(ctx.isp) *
      Math.log(shipMass(ctx.req.ship) / (shipMass(ctx.req.ship) - b.eval.propellant));
    out.push({
      code: 'delta-v',
      message: 'the ship does not carry enough delta-v for this trip',
      need,
      have
    });
  }
  return out;
}

function returnCheck(ctx: Context, b: Built): { canReturn: boolean; returnDv?: number } {
  if (!b.option.canStop) return { canReturn: false };
  const ship: Ship = { ...ctx.req.ship, propellant: b.option.propellantLeft };
  const back = contextFor({
    ...ctx.req,
    from: ctx.req.to,
    to: ctx.req.from,
    departAfter: b.option.arrival,
    ship,
    aerobrake: false
  });
  if (!back.ctx) return { canReturn: false };
  const r = cheapest(back.ctx).built;
  if (!r) return { canReturn: false };
  return { canReturn: r.feasible, returnDv: r.eval.dv };
}

export function planTrip(req: TripRequest): TripPlan {
  const { ctx, reasons } = contextFor(req);
  if (!ctx) return { options: [], reasons };
  const base = cheapest(ctx);
  if (!base.built) {
    return {
      options: [],
      reasons: [{ code: 'no-path', message: 'no transfer exists between these places' }]
    };
  }
  const built: { profile: Profile; b: Built }[] = [];
  const cheap = base.built;
  if (!cheap.feasible) {
    const why = infeasibility(ctx, cheap);
    if (base.flyby?.feasible && base.flyby.option.model === 'orbit') {
      return { options: [seal(ctx, 'cheapest', base.flyby)], reasons: why };
    }
    return { options: [], reasons: why };
  }
  built.push({ profile: 'cheapest', b: cheap });
  if (cheap.option.model === 'orbit') {
    const floor = crossingFloor(ctx);
    const budget = shipDeltaV(req.ship) * 0.999999999;
    const fast = floor === undefined ? undefined : bestAtBudget(ctx, budget, floor);
    if (fast && arrivalOf(fast) < arrivalOf(cheap) * 0.999 && fast.eval.dv > cheap.eval.dv * 1.01) {
      const mid = Math.sqrt(cheap.eval.dv * fast.eval.dv);
      const bal = bestAtBudget(ctx, mid, floor ?? 0);
      if (
        bal &&
        arrivalOf(bal) < arrivalOf(cheap) * 0.999 &&
        arrivalOf(bal) > arrivalOf(fast) * 1.02 &&
        bal.eval.dv > cheap.eval.dv * 1.01
      ) {
        built.push({ profile: 'balanced', b: bal });
      }
      built.push({ profile: 'fastest', b: fast });
    }
  }
  return { options: built.map((x) => seal(ctx, x.profile, x.b)), reasons: [] };
}

function crossingFloor(ctx: Context): number | undefined {
  const r1 = ctx.A.r;
  const r2 = ctx.B.r;
  if (Math.abs(r1 - r2) < 1) return undefined;
  return hohmann(ctx.gm, r1, r2).dv1;
}

function seal(ctx: Context, profile: Profile, b: Built): TripOption {
  const ret = returnCheck(ctx, b);
  return { profile, ...b.option, canReturn: ret.canReturn, returnDv: ret.returnDv };
}
