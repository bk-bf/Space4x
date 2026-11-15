import { describe, expect, it } from 'vitest';
import { DAY } from '../clock.ts';
import { AU } from '../units.ts';
import { LINE_GRAVITY_RATIO_LIMIT } from './constants.ts';
import {
  brachistochroneDv,
  brachistochroneTime,
  burnCoastBurn,
  burnFlipBurn,
  lineAt,
  lineGravityRatio,
  lineThresholdAcceleration,
  solveLine,
  type LineSolution
} from './line.ts';
import { earth, GM_SUN, mars, solar } from './reference.ts';
import { absoluteState } from './system.ts';
import type { V2 } from './vec.ts';

const g = 9.80665;
const days = (s: number): number => s / DAY;

describe('brachistochrone times (the decision table in issue #8)', () => {
  it('takes about 2.1 days from Earth to Mars at the mean opposition distance, 0.52 AU, at 1 g', () => {
    expect(days(brachistochroneTime(0.52 * AU, g))).toBeCloseTo(2.1, 1);
  });

  it('takes about 6.5 days over the same distance at 0.1 g', () => {
    expect(days(brachistochroneTime(0.52 * AU, 0.1 * g))).toBeCloseTo(6.5, 1);
  });

  it('takes about 5.9 days from Earth to Jupiter at its closest, 4.2 AU, at 1 g', () => {
    expect(days(brachistochroneTime(4.2 * AU, g))).toBeCloseTo(5.9, 1);
  });

  it('takes about 15 days from Earth to Neptune at 1 g, 56 times the distance for about 7 times the time', () => {
    const near = brachistochroneTime(0.52 * AU, g);
    const far = brachistochroneTime(29.07 * AU, g);
    expect(days(far)).toBeCloseTo(15.4, 0);
    expect(29.07 / 0.52).toBeCloseTo(56, 0);
    expect(far / near).toBeCloseTo(7.5, 0);
  });

  it('takes 21 and 154 days at 0.01 g to Mars and Neptune, as the decision says', () => {
    expect(days(brachistochroneTime(0.52 * AU, 0.01 * g))).toBeCloseTo(21, -0.3);
    expect(days(brachistochroneTime(29.07 * AU, 0.01 * g))).toBeCloseTo(154, -1);
  });

  it('needs a times T of delta-v and grows with the square root of distance', () => {
    expect(brachistochroneDv(1e10, 2)).toBeCloseTo(2 * brachistochroneTime(1e10, 2), 6);
    expect(brachistochroneTime(4e10, 1) / brachistochroneTime(1e10, 1)).toBeCloseTo(2, 12);
  });
});

const reaches = (sol: LineSolution, D: V2, w: V2): void => {
  const s = lineAt(sol, sol.T);
  expect(Math.hypot(s.pos[0] - D[0], s.pos[1] - D[1]) / Math.hypot(D[0], D[1])).toBeLessThan(1e-9);
  expect(Math.hypot(s.vel[0] - w[0], s.vel[1] - w[1])).toBeLessThan(
    1e-6 * Math.max(1, Math.hypot(w[0], w[1]))
  );
};

describe('burn-flip-burn with a moving target', () => {
  const D: V2 = [0.52 * AU, 0.2 * AU];
  const w: V2 = [12000, -8000];

  it('arrives at the target position and matches its velocity', () => {
    const sol = burnFlipBurn(D, w, g);
    if (!sol) throw new Error('no solution');
    reaches(sol, D, w);
    expect(sol.coast).toBe(false);
  });

  it('flips at the midpoint when the target is at rest', () => {
    const sol = burnFlipBurn([1e10, 0], [0, 0], 1);
    expect(sol?.t1 ?? 0).toBeCloseTo(sol?.t3 ?? 1, 6);
    expect(sol?.u3[0] ?? 0).toBeCloseTo(-(sol?.u1[0] ?? 0), 9);
  });

  it('is symmetric: the reverse trip takes the same time', () => {
    const there = burnFlipBurn([3e10, 4e10], [0, 0], 2);
    const back = burnFlipBurn([-3e10, -4e10], [0, 0], 2);
    expect(there?.T ?? 0).toBeCloseTo(back?.T ?? 1, 6);
  });

  it('costs exactly acceleration times burn time in delta-v', () => {
    const sol = burnFlipBurn(D, w, g);
    expect(sol?.dv ?? 0).toBeCloseTo(g * ((sol?.t1 ?? 0) + (sol?.t3 ?? 0)), 3);
  });
});

describe('burn-coast-burn when the budget is below the full burn', () => {
  const D: V2 = [0.52 * AU, 0.2 * AU];
  const w: V2 = [12000, -8000];

  it('uses exactly the budget, coasts, and still arrives matched', () => {
    const full = burnFlipBurn(D, w, g);
    const budget = (full?.dv ?? 0) / 4;
    const sol = burnCoastBurn(D, w, g, budget);
    if (!sol) throw new Error('no solution');
    expect(sol.dv).toBeCloseTo(budget, 6);
    expect(sol.c).toBeGreaterThan(0);
    expect(sol.coast).toBe(true);
    reaches(sol, D, w);
  });

  it('is slower the smaller the budget, and approaches distance over cruise speed', () => {
    const full = burnFlipBurn([1e11, 0], [0, 0], g);
    const big = burnCoastBurn([1e11, 0], [0, 0], g, (full?.dv ?? 0) / 2);
    const small = burnCoastBurn([1e11, 0], [0, 0], g, (full?.dv ?? 0) / 8);
    expect(small?.T ?? 0).toBeGreaterThan(big?.T ?? Infinity);
    const cruise = (full?.dv ?? 0) / 16;
    expect(small?.T ?? 0).toBeGreaterThan(1e11 / cruise);
    expect(small?.T ?? 0).toBeLessThan(1.1 * (1e11 / cruise));
  });

  it('falls back from coast to burn-flip-burn when the budget allows it', () => {
    const full = burnFlipBurn([1e10, 0], [0, 0], g);
    const sol = solveLine(g, () => ({ D: [1e10, 0], w: [0, 0] }), (full?.dv ?? 0) * 2);
    expect(sol?.coast).toBe(false);
    expect(sol?.T ?? 0).toBeCloseTo(full?.T ?? 1, 6);
  });
});

const integrate = (sol: LineSolution, start: { pos: V2; vel: V2 }, steps: number): { pos: V2; vel: V2 } => {
  let x = start.pos[0];
  let y = start.pos[1];
  let vx = start.vel[0];
  let vy = start.vel[1];
  const dt = sol.T / steps;
  const thrust = (t: number): V2 => {
    if (t < sol.t1) return [sol.a * sol.u1[0], sol.a * sol.u1[1]];
    if (t < sol.t1 + sol.c) return [0, 0];
    return [sol.a * sol.u3[0], sol.a * sol.u3[1]];
  };
  const acc = (px: number, py: number, t: number): V2 => {
    const r3 = Math.hypot(px, py) ** 3;
    const th = thrust(t);
    return [(-GM_SUN * px) / r3 + th[0], (-GM_SUN * py) / r3 + th[1]];
  };
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const k1 = acc(x, y, t);
    const k2 = acc(x + 0.5 * dt * vx, y + 0.5 * dt * vy, t + dt / 2);
    const k3 = acc(
      x + 0.5 * dt * (vx + 0.5 * dt * k1[0]),
      y + 0.5 * dt * (vy + 0.5 * dt * k1[1]),
      t + dt / 2
    );
    const k4 = acc(x + dt * (vx + 0.5 * dt * k2[0]), y + dt * (vy + 0.5 * dt * k2[1]), t + dt);
    x += dt * vx + (dt * dt * (k1[0] + k2[0] + k3[0])) / 6;
    y += dt * vy + (dt * dt * (k1[1] + k2[1] + k3[1])) / 6;
    vx += (dt * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6;
    vy += (dt * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6;
  }
  return { pos: [x, y], vel: [vx, vy] };
};

const opposition = { ...solar, bodies: [earth, { ...mars, angle: 0 }] };

const missFraction = (a: number): { miss: number; ratio: number; D: number } => {
  const earthAt = (t: number) => absoluteState(opposition, 'earth', t);
  const marsAt = (t: number) => absoluteState(opposition, 'mars', t);
  const o = earthAt(0);
  const sol = solveLine(a, (T) => {
    const m = marsAt(T);
    return {
      D: [m.pos[0] - o.pos[0] - o.vel[0] * T, m.pos[1] - o.pos[1] - o.vel[1] * T],
      w: [m.vel[0] - o.vel[0], m.vel[1] - o.vel[1]]
    };
  });
  if (!sol) throw new Error('no line solution');
  const shipStart = { pos: o.pos, vel: o.vel };
  const inFrame = integrate(sol, shipStart, 40000);
  const m = marsAt(sol.T);
  const D = Math.hypot(m.pos[0] - o.pos[0], m.pos[1] - o.pos[1]);
  const miss = Math.hypot(inFrame.pos[0] - m.pos[0], inFrame.pos[1] - m.pos[1]);
  return { miss: miss / D, ratio: lineGravityRatio(GM_SUN, AU, sol), D };
};

describe('the regime boundary between the straight-line and orbital models', () => {
  const threshold = lineThresholdAcceleration(GM_SUN, AU);

  it('puts the threshold at 2 gm / (r^2 limit): about 0.24 m/s2 at 1 AU for a 5 percent limit', () => {
    expect(LINE_GRAVITY_RATIO_LIMIT).toBe(0.05);
    expect(threshold).toBeCloseTo((2 * GM_SUN) / (AU * AU * 0.05), 9);
    expect(threshold).toBeGreaterThan(0.2);
    expect(threshold).toBeLessThan(0.3);
  });

  it('misses the target by about the limit when integrated under the Sun at the threshold acceleration', () => {
    const r = missFraction(threshold);
    expect(r.ratio).toBeLessThanOrEqual(LINE_GRAVITY_RATIO_LIMIT * 1.05);
    expect(r.miss).toBeLessThan(LINE_GRAVITY_RATIO_LIMIT * 1.5);
  });

  it('misses ten times less at ten times the threshold, where the straight line is safe', () => {
    const low = missFraction(threshold);
    const high = missFraction(threshold * 10);
    expect(high.miss).toBeLessThan(low.miss / 5);
    expect(high.miss).toBeLessThan(0.01);
  });

  it('misses badly at a tenth of the threshold, where the planner will not use it', () => {
    expect(missFraction(threshold / 10).miss).toBeGreaterThan(0.2);
  });

  it('cannot agree with the orbital model in time or cost: it spends delta-v where Hohmann spends time', () => {
    const line = brachistochroneDv(0.52 * AU, threshold);
    expect(line).toBeGreaterThan(100000);
    expect(earth.id).toBe('earth');
  });
});
