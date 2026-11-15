import { TWO_PI } from './constants.ts';
import { circularSpeed } from './wells.ts';

export interface Hohmann {
  dv1: number;
  dv2: number;
  dv: number;
  time: number;
  semiMajor: number;
  sweep: number;
}

export function hohmann(gm: number, r1: number, r2: number): Hohmann {
  const a = (r1 + r2) / 2;
  const v1 = Math.sqrt(gm * (2 / r1 - 1 / a));
  const v2 = Math.sqrt(gm * (2 / r2 - 1 / a));
  const dv1 = Math.abs(v1 - circularSpeed(gm, r1));
  const dv2 = Math.abs(circularSpeed(gm, r2) - v2);
  return {
    dv1,
    dv2,
    dv: dv1 + dv2,
    time: Math.PI * Math.sqrt((a * a * a) / gm),
    semiMajor: a,
    sweep: Math.PI
  };
}

export const synodicPeriod = (omega1: number, omega2: number): number => TWO_PI / Math.abs(omega1 - omega2);

export interface Conic {
  gm: number;
  p: number;
  e: number;
  startAnomaly: number;
}

export interface ConicState {
  r: number;
  nu: number;
  vr: number;
  vt: number;
}

const NEAR_PARABOLIC = 1e-7;

const eccentricity = (c: Conic): number => (Math.abs(c.e - 1) < NEAR_PARABOLIC ? 1 + NEAR_PARABOLIC : c.e);

function meanMotion(c: Conic): number {
  const e = eccentricity(c);
  const a = Math.abs(c.p / (1 - e * e));
  return Math.sqrt(c.gm / (a * a * a));
}

function meanAnomalyOf(c: Conic, nu: number): number {
  const e = eccentricity(c);
  if (e < 1) {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    return E - e * Math.sin(E);
  }
  const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
  return e * Math.sinh(F) - F;
}

function anomalyFromMean(c: Conic, M: number): number {
  const e = eccentricity(c);
  if (e < 1) {
    const mm = M - TWO_PI * Math.round(M / TWO_PI);
    let E = e < 0.8 ? mm : Math.PI * (mm < 0 ? -1 : 1);
    for (let i = 0; i < 60; i++) {
      const d = (E - e * Math.sin(E) - mm) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-14) break;
    }
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    return nu + (M - mm);
  }
  let F = Math.asinh(M / e);
  for (let i = 0; i < 80; i++) {
    const d = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
    F -= d;
    if (Math.abs(d) < 1e-14 * Math.max(1, Math.abs(F))) break;
  }
  return 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2));
}

export const conicTime = (c: Conic, nu: number): number => meanAnomalyOf(c, nu) / meanMotion(c);

export function conicAt(c: Conic, tau: number): ConicState {
  const M0 = meanAnomalyOf(c, c.startAnomaly);
  const nu = anomalyFromMean(c, M0 + tau * meanMotion(c));
  const r = c.p / (1 + c.e * Math.cos(nu));
  return {
    r,
    nu,
    vr: Math.sqrt(c.gm / c.p) * c.e * Math.sin(nu),
    vt: Math.sqrt(c.gm * c.p) / r
  };
}

export interface Crossing {
  dv1: number;
  dv2: number;
  dv: number;
  time: number;
  sweep: number;
  vInf1: number;
  vInf2: number;
  e: number;
  arrivalRadial: number;
  arrivalTangential: number;
  conic: Conic;
  inward: boolean;
}

export function crossingTransfer(gm: number, r1: number, r2: number, dv1: number): Crossing | undefined {
  const inward = r2 < r1;
  const vc1 = circularSpeed(gm, r1);
  const vc2 = circularSpeed(gm, r2);
  const v1 = inward ? vc1 - dv1 : vc1 + dv1;
  if (v1 <= 0) return undefined;
  const e = inward ? 1 - (r1 * v1 * v1) / gm : (r1 * v1 * v1) / gm - 1;
  if (e < 0) return undefined;
  const p = inward ? r1 * (1 - e) : r1 * (1 + e);
  const energy = (v1 * v1) / 2 - gm / r1;
  const h = r1 * v1;
  const vt = h / r2;
  const vr2 = 2 * energy + (2 * gm) / r2 - vt * vt;
  if (vr2 < -1e-6 * vt * vt) return undefined;
  const vr = Math.sqrt(Math.max(0, vr2));
  const cosNu = e < 1e-12 ? 1 : (p / r2 - 1) / e;
  if (cosNu > 1 + 1e-9 || cosNu < -1 - 1e-9) return undefined;
  const nuCross = Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const conic: Conic = { gm, p, e, startAnomaly: inward ? Math.PI : 0 };
  const t = inward
    ? conicTime(conic, 2 * Math.PI - nuCross) - conicTime(conic, Math.PI)
    : conicTime(conic, nuCross);
  const sweep = inward ? Math.PI - nuCross : nuCross;
  const dv2 = Math.hypot(vr, vt - vc2);
  return {
    dv1,
    dv2,
    dv: dv1 + dv2,
    time: t,
    sweep,
    vInf1: dv1,
    vInf2: dv2,
    e,
    arrivalRadial: vr,
    arrivalTangential: vt,
    conic,
    inward
  };
}
