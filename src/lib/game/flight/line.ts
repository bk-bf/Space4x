import { LINE_GRAVITY_RATIO_LIMIT } from './constants.ts';
import { add, norm, scale, sub, unit, type V2 } from './vec.ts';

export const brachistochroneTime = (distance: number, acceleration: number): number =>
  2 * Math.sqrt(distance / acceleration);

export const brachistochroneDv = (distance: number, acceleration: number): number =>
  acceleration * brachistochroneTime(distance, acceleration);

export interface Burns {
  t1: number;
  t3: number;
  c: number;
  u1: V2;
  u3: V2;
}

export interface LineSolution extends Burns {
  a: number;
  T: number;
  dv: number;
  coast: boolean;
}

export interface Frame {
  D: V2;
  w: V2;
}

function newton2(f: (x: number[]) => number[], x0: number[]): number[] | undefined {
  let x = x0.slice();
  for (let i = 0; i < 80; i++) {
    const f0 = f(x);
    if (Math.hypot(f0[0] ?? 0, f0[1] ?? 0) < 1e-9 * Math.max(1, Math.abs(x[0] ?? 1) ** 2)) return x;
    const h = [Math.max(1e-6 * Math.abs(x[0] ?? 1), 1e-9), Math.max(1e-6 * Math.abs(x[1] ?? 1), 1e-9)];
    const fa = f([(x[0] ?? 0) + (h[0] ?? 0), x[1] ?? 0]);
    const fb = f([x[0] ?? 0, (x[1] ?? 0) + (h[1] ?? 0)]);
    const j00 = ((fa[0] ?? 0) - (f0[0] ?? 0)) / (h[0] ?? 1);
    const j10 = ((fa[1] ?? 0) - (f0[1] ?? 0)) / (h[0] ?? 1);
    const j01 = ((fb[0] ?? 0) - (f0[0] ?? 0)) / (h[1] ?? 1);
    const j11 = ((fb[1] ?? 0) - (f0[1] ?? 0)) / (h[1] ?? 1);
    const det = j00 * j11 - j01 * j10;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-300) return undefined;
    const dx0 = ((f0[0] ?? 0) * j11 - (f0[1] ?? 0) * j01) / det;
    const dx1 = ((f0[1] ?? 0) * j00 - (f0[0] ?? 0) * j10) / det;
    let lambda = 1;
    const base = Math.hypot(f0[0] ?? 0, f0[1] ?? 0);
    let next = [(x[0] ?? 0) - dx0, (x[1] ?? 0) - dx1];
    for (let k = 0; k < 30; k++) {
      const fn = f(next);
      const ok = (next[0] ?? 0) > 0 && (next[1] ?? 0) >= 0 && Math.hypot(fn[0] ?? 0, fn[1] ?? 0) < base;
      if (ok) break;
      lambda /= 2;
      next = [(x[0] ?? 0) - lambda * dx0, (x[1] ?? 0) - lambda * dx1];
    }
    x = next;
  }
  const last = f(x);
  return Math.hypot(last[0] ?? 0, last[1] ?? 0) < 1e-6 * Math.max(1, (x[0] ?? 1) ** 2) ? x : undefined;
}

export function burnFlipBurn(D: V2, w: V2, a: number): LineSolution | undefined {
  const d = norm(D);
  if (d === 0) return undefined;
  const T0 = 2 * Math.sqrt(d / a);
  const f = (x: number[]): number[] => {
    const T = x[0] ?? T0;
    const s = x[1] ?? T0 / 2;
    const p = scale(sub(scale(D, 2), scale(w, s)), 1 / T);
    const q = sub(w, p);
    return [(norm(p) - a * (T - s)) * a * T, (norm(q) - a * s) * a * T];
  };
  const root = newton2(f, [T0, T0 / 2]);
  if (!root) return undefined;
  const T = root[0] ?? T0;
  const t3 = root[1] ?? T0 / 2;
  const t1 = T - t3;
  if (t1 < 0 || t3 < 0) return undefined;
  const p = scale(sub(scale(D, 2), scale(w, t3)), 1 / T);
  const q = sub(w, p);
  return { t1, t3, c: 0, u1: unit(p), u3: unit(q), a, T, dv: a * T, coast: false };
}

export function burnCoastBurn(D: V2, w: V2, a: number, budget: number): LineSolution | undefined {
  const Tb = budget / a;
  const pOf = (x: number): V2 => {
    const R = sub(D, scale(w, x / 2));
    return scale(unit(R), a * (Tb - x));
  };
  const g = (x: number): number => norm(sub(w, pOf(x))) - a * x;
  let lo = 0;
  let hi = Tb;
  if (g(lo) < 0 || g(hi) > 0) return undefined;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  const x = (lo + hi) / 2;
  const t3 = x;
  const t1 = Tb - x;
  if (t1 <= 0) return undefined;
  const R = sub(D, scale(w, x / 2));
  const c = norm(R) / (a * t1) - Tb / 2;
  if (c < 0) return undefined;
  const p = pOf(x);
  const q = sub(w, p);
  return { t1, t3, c, u1: unit(p), u3: unit(q), a, T: Tb + c, dv: budget, coast: true };
}

export function solveBurns(D: V2, w: V2, a: number, budget?: number): LineSolution | undefined {
  const full = burnFlipBurn(D, w, a);
  if (budget === undefined) return full;
  if (full && full.dv <= budget) return full;
  return burnCoastBurn(D, w, a, budget);
}

export function solveLine(a: number, frame: (T: number) => Frame, budget?: number): LineSolution | undefined {
  const f0 = frame(0);
  let T = 2 * Math.sqrt(norm(f0.D) / a);
  let sol: LineSolution | undefined;
  for (let i = 0; i < 200; i++) {
    const fr = frame(T);
    sol = solveBurns(fr.D, fr.w, a, budget);
    if (!sol) return undefined;
    const next = sol.T;
    if (Math.abs(next - T) < 1e-7 * Math.max(1, T)) {
      const check = frame(next);
      return solveBurns(check.D, check.w, a, budget);
    }
    T = next;
  }
  return undefined;
}

export interface LineState {
  pos: V2;
  vel: V2;
}

export function lineAt(sol: LineSolution, tau: number): LineState {
  const { a, t1, t3, c, u1, u3 } = sol;
  if (tau <= 0) return { pos: [0, 0], vel: [0, 0] };
  if (tau <= t1) {
    return { pos: scale(u1, 0.5 * a * tau * tau), vel: scale(u1, a * tau) };
  }
  const p1 = scale(u1, 0.5 * a * t1 * t1);
  const v1 = scale(u1, a * t1);
  if (tau <= t1 + c) {
    return { pos: add(p1, scale(v1, tau - t1)), vel: v1 };
  }
  const p2 = add(p1, scale(v1, c));
  const s = Math.min(tau - t1 - c, t3);
  const pos = add(add(p2, scale(v1, s)), scale(u3, 0.5 * a * s * s));
  const vel = add(v1, scale(u3, a * s));
  if (tau <= t1 + c + t3) return { pos, vel };
  return { pos: add(pos, scale(vel, tau - (t1 + c + t3))), vel };
}

export const lineGravityRatio = (gm: number, closest: number, sol: LineSolution): number =>
  ((gm / (closest * closest)) * sol.T) / (sol.a * sol.t1);

export const lineThresholdAcceleration = (gm: number, closest: number): number =>
  (2 * gm) / (closest * closest * LINE_GRAVITY_RATIO_LIMIT);
