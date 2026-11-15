import { conicAt } from './kepler.ts';
import { lineAt } from './line.ts';
import { spiralAt } from './spiral.ts';
import { absoluteState, placeState } from './system.ts';
import type { ManeuverKind, TripOption } from './types.ts';
import { add, polar, type V2 } from './vec.ts';

export type Phase =
  'parked' | 'departing' | 'accelerating' | 'coasting' | 'decelerating' | 'transfer' | 'arriving' | 'arrived';

export interface ShipState {
  pos: V2;
  vel: V2;
  phase: Phase;
  thrusting: boolean;
  maneuver?: ManeuverKind;
}

function activeManeuver(option: TripOption, t: number): ManeuverKind | undefined {
  const m = option.maneuvers.find((x) => t >= x.start && t < x.start + x.duration);
  return m?.kind;
}

function rotated(r: number, theta: number, vr: number, vt: number, dir: 1 | -1): { pos: V2; vel: V2 } {
  const pos = polar(r, theta);
  const rhat: V2 = [Math.cos(theta), Math.sin(theta)];
  const that: V2 = [-Math.sin(theta) * dir, Math.cos(theta) * dir];
  return { pos, vel: [vr * rhat[0] + vt * that[0], vr * rhat[1] + vt * that[1]] };
}

export function positionAt(option: TripOption, t: number): ShipState {
  const { stamps, system, primary, track } = option;
  if (t < stamps.helioStart) {
    const s = placeState(system, option.origin, t);
    const m = activeManeuver(option, t);
    return {
      pos: s.pos,
      vel: s.vel,
      phase: t < stamps.launch ? 'parked' : 'departing',
      thrusting: !!m,
      maneuver: m
    };
  }
  const flyby = !option.canStop;
  if (t > stamps.helioEnd && !flyby) {
    const s = placeState(system, option.target, t);
    const m = activeManeuver(option, t);
    return {
      pos: s.pos,
      vel: s.vel,
      phase: t < stamps.end ? 'arriving' : 'arrived',
      thrusting: !!m,
      maneuver: m
    };
  }
  const tau = t - stamps.helioStart;
  const base = absoluteState(system, primary, t);
  let rel: { pos: V2; vel: V2 };
  let phase: Phase = 'transfer';
  let thrusting = false;
  if (track.kind === 'conic') {
    const c = conicAt(track.conic, tau);
    rel = rotated(c.r, track.theta0 + track.dir * (c.nu - track.conic.startAnomaly), c.vr, c.vt, track.dir);
  } else if (track.kind === 'spiral') {
    const s = spiralAt(track.spiral, tau);
    rel = rotated(s.r, track.theta0 + track.dir * s.sweep, s.vr, s.vt, track.dir);
    thrusting = true;
  } else {
    const sol = track.solution;
    const s = lineAt(sol, tau);
    const st = track.start;
    const drift: V2 = [st.vel[0] * tau, st.vel[1] * tau];
    rel = {
      pos: add(add(st.pos, drift), s.pos),
      vel: add(st.vel, s.vel)
    };
    if (tau < sol.t1) {
      phase = 'accelerating';
      thrusting = true;
    } else if (tau < sol.t1 + sol.c) phase = 'coasting';
    else if (tau < sol.t1 + sol.c + sol.t3) {
      phase = 'decelerating';
      thrusting = true;
    }
  }
  return { pos: add(base.pos, rel.pos), vel: add(base.vel, rel.vel), phase, thrusting };
}

export interface TripEvent {
  t: number;
  kind: 'burn-start' | 'burn-end' | 'flip' | 'arrival';
}

export function eventsOf(option: TripOption): TripEvent[] {
  const out: TripEvent[] = [];
  for (const m of option.maneuvers) {
    out.push({ t: m.start, kind: 'burn-start' }, { t: m.start + m.duration, kind: 'burn-end' });
  }
  if (option.track.kind === 'line') {
    const s = option.track.solution;
    out.push({ t: option.stamps.helioStart + s.t1 + s.c, kind: 'flip' });
  }
  out.push({ t: option.stamps.end, kind: 'arrival' });
  return out.sort((a, b) => a.t - b.t);
}
