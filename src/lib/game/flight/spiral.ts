import { circularSpeed } from './wells.ts';
import { exhaustVelocity } from './rocket.ts';

export interface Spiral {
  gm: number;
  r1: number;
  r2: number;
  mass: number;
  thrust: number;
  isp: number;
}

export const spiralDv = (gm: number, r1: number, r2: number): number =>
  Math.abs(circularSpeed(gm, r1) - circularSpeed(gm, r2));

const speedAt = (s: Spiral, tau: number): number => {
  const ve = exhaustVelocity(s.isp);
  const m = s.mass - (s.thrust / ve) * tau;
  const u = ve * Math.log(s.mass / m);
  const v1 = circularSpeed(s.gm, s.r1);
  return s.r2 > s.r1 ? v1 - u : v1 + u;
};

export function spiralDuration(s: Spiral): number {
  const ve = exhaustVelocity(s.isp);
  const dv = spiralDv(s.gm, s.r1, s.r2);
  return ((s.mass * ve) / s.thrust) * -Math.expm1(-dv / ve);
}

export function spiralSweep(s: Spiral, tau: number): number {
  const n = 400;
  const h = tau / n;
  if (h === 0) return 0;
  const f = (t: number): number => speedAt(s, t) ** 3 / s.gm;
  let sum = f(0) + f(tau);
  for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 === 0 ? 2 : 4);
  return (sum * h) / 3;
}

export function spiralAt(s: Spiral, tau: number): { r: number; sweep: number; vr: number; vt: number } {
  const ve = exhaustVelocity(s.isp);
  const v = speedAt(s, tau);
  const m = s.mass - (s.thrust / ve) * tau;
  const outward = s.r2 > s.r1 ? 1 : -1;
  return {
    r: s.gm / (v * v),
    sweep: spiralSweep(s, tau),
    vr: (2 * s.gm * outward * (s.thrust / m)) / (v * v * v),
    vt: v
  };
}
