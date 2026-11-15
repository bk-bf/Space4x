import { FINITE_BURN_LOSS_COEFFICIENT, MAX_PERIGEE_PASSES, PASS_ARC_LIMIT, TWO_PI } from './constants.ts';
import { burnTime, exhaustVelocity } from './rocket.ts';
import type { ManeuverMode } from './types.ts';
import { circularSpeed } from './wells.ts';

export interface Thrusters {
  thrust: number;
  isp: number;
}

export interface BurnResult {
  dv: number;
  duration: number;
  mode: ManeuverMode;
  massEnd: number;
  passes: number;
}

export type BurnSpec =
  | { kind: 'escape' | 'capture'; gm: number; r: number; vInf: number }
  | { kind: 'bare'; gm: number; r: number; dv: number; outward: boolean };

const orbitPeriodAtSpeed = (gm: number, r: number, v: number): number => {
  const energy = (v * v) / 2 - gm / r;
  if (energy >= 0) return 0;
  const a = -gm / (2 * energy);
  return TWO_PI * Math.sqrt((a * a * a) / gm);
};

function speeds(spec: BurnSpec): { from: number; to: number } {
  const vc = circularSpeed(spec.gm, spec.r);
  if (spec.kind === 'bare') {
    return spec.outward ? { from: vc, to: vc + spec.dv } : { from: vc, to: vc - spec.dv };
  }
  const hyper = Math.sqrt(spec.vInf * spec.vInf + 2 * vc * vc);
  return spec.kind === 'escape' ? { from: vc, to: hyper } : { from: hyper, to: vc };
}

export function spiralBurn(spec: BurnSpec, mass: number, t: Thrusters): BurnResult {
  const vc = circularSpeed(spec.gm, spec.r);
  const dv = spec.kind === 'bare' ? spec.dv : vc + spec.vInf;
  const duration = burnTime(mass, t.thrust, t.isp, dv);
  return {
    dv,
    duration,
    mode: 'spiral',
    massEnd: mass * Math.exp(-dv / exhaustVelocity(t.isp)),
    passes: 0
  };
}

export function localBurn(spec: BurnSpec, mass: number, t: Thrusters): BurnResult {
  const { from, to } = speeds(spec);
  const ve = exhaustVelocity(t.isp);
  const sign = to >= from ? 1 : -1;
  let remaining = Math.abs(to - from);
  let v = from;
  let m = mass;
  let dvTotal = 0;
  let time = 0;
  let passes = 0;
  while (remaining > 1e-9) {
    const accel = t.thrust / m;
    const dvMax = (accel * PASS_ARC_LIMIT * spec.r) / Math.max(v, 1e-9);
    const dvPass = Math.min(remaining, dvMax);
    const arcTime = dvPass / accel;
    const arc = (arcTime * v) / spec.r;
    const dvEff = dvPass * (1 + FINITE_BURN_LOSS_COEFFICIENT * arc * arc);
    time += burnTime(m, t.thrust, t.isp, dvEff);
    m *= Math.exp(-dvEff / ve);
    dvTotal += dvEff;
    remaining -= dvPass;
    v += sign * dvPass;
    passes++;
    if (passes > MAX_PERIGEE_PASSES) return spiralBurn(spec, mass, t);
    if (
      spec.kind === 'capture' &&
      passes === 1 &&
      remaining > 1e-9 &&
      v >= Math.SQRT2 * circularSpeed(spec.gm, spec.r)
    ) {
      return spiralBurn(spec, mass, t);
    }
    if (remaining > 1e-9) time += orbitPeriodAtSpeed(spec.gm, spec.r, v);
  }
  return {
    dv: dvTotal,
    duration: time,
    mode: passes === 1 ? 'impulsive' : 'passes',
    massEnd: m,
    passes
  };
}
