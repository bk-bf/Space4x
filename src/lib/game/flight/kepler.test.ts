import { describe, expect, it } from 'vitest';
import { DAY } from '../clock.ts';
import { AU } from '../units.ts';
import { conicAt, crossingTransfer, hohmann, synodicPeriod } from './kepler.ts';
import { earth, GM_SUN, mars, moon } from './reference.ts';
import { circularSpeed, escapeFromOrbit, lowOrbitRadius } from './wells.ts';

const KM = 1000;

describe('Hohmann transfers', () => {
  const h = hohmann(GM_SUN, AU, mars.orbit);

  it('takes about 259 days from Earth to Mars (Wikipedia, Hohmann transfer orbit: 259 days)', () => {
    expect(h.time / DAY).toBeGreaterThan(257);
    expect(h.time / DAY).toBeLessThan(261);
  });

  it('needs 2.94 and 2.65 km/s at the two ends, 5.6 km/s in all, in the heliocentric frame', () => {
    expect(h.dv1 / KM).toBeCloseTo(2.94, 2);
    expect(h.dv2 / KM).toBeCloseTo(2.65, 2);
    expect(h.dv / KM).toBeCloseTo(5.6, 1);
  });

  it('costs about 5.6 km/s from low Earth orbit to low Mars orbit without aerobraking', () => {
    const dep = escapeFromOrbit(earth.gm, lowOrbitRadius(earth), h.dv1);
    const cap = escapeFromOrbit(mars.gm, lowOrbitRadius(mars), h.dv2);
    expect((dep + cap) / KM).toBeGreaterThan(5.5);
    expect((dep + cap) / KM).toBeLessThan(5.8);
  });

  it('costs about 4 km/s from low Earth orbit to low lunar orbit in 3 to 5 days', () => {
    const lm = hohmann(earth.gm, lowOrbitRadius(earth), moon.orbit);
    const total = lm.dv1 + escapeFromOrbit(moon.gm, lowOrbitRadius(moon), lm.dv2);
    expect(total / KM).toBeGreaterThan(3.8);
    expect(total / KM).toBeLessThan(4.2);
    expect(lm.time / DAY).toBeGreaterThan(3);
    expect(lm.time / DAY).toBeLessThanOrEqual(5);
  });

  it('is symmetric: Mars back to Earth costs the same and takes the same time', () => {
    const back = hohmann(GM_SUN, mars.orbit, AU);
    expect(back.dv).toBeCloseTo(h.dv, 6);
    expect(back.time).toBeCloseTo(h.time, 6);
  });

  it('returns a zero-cost, zero-length transfer between equal orbits', () => {
    const same = hohmann(GM_SUN, AU, AU);
    expect(same.dv).toBeCloseTo(0, 6);
  });

  it('sweeps half an orbit, so the target must lead by 44 degrees at departure (Mars: 44.4 deg)', () => {
    const lead = h.sweep - mars.angularSpeed * h.time;
    expect((lead * 180) / Math.PI).toBeCloseTo(44.4, 0);
  });
});

describe('synodic period', () => {
  it('is about 780 days between Earth to Mars windows (Wikipedia, Orbital period: 779.94 days)', () => {
    expect(synodicPeriod(earth.angularSpeed, mars.angularSpeed) / DAY).toBeCloseTo(779.94, 0);
  });
});

describe('crossing transfers', () => {
  const h = hohmann(GM_SUN, AU, mars.orbit);

  it('reduce to the Hohmann transfer at its departure speed', () => {
    const c = crossingTransfer(GM_SUN, AU, mars.orbit, h.dv1);
    expect(c?.time ?? 0).toBeCloseTo(h.time, -2);
    expect(c?.dv2 ?? 0).toBeCloseTo(h.dv2, 0);
    expect(c?.sweep ?? 0).toBeCloseTo(Math.PI, 3);
  });

  it('get faster and costlier as the departure burn grows', () => {
    let lastTime = Infinity;
    let lastDv = 0;
    for (const f of [1.05, 1.2, 1.6, 2.5, 5, 10]) {
      const c = crossingTransfer(GM_SUN, AU, mars.orbit, h.dv1 * f);
      expect(c).toBeDefined();
      expect(c?.time ?? Infinity).toBeLessThan(lastTime);
      expect(c?.dv ?? 0).toBeGreaterThan(lastDv);
      lastTime = c?.time ?? Infinity;
      lastDv = c?.dv ?? 0;
    }
  });

  it('conserve energy and angular momentum along the conic', () => {
    const c = crossingTransfer(GM_SUN, AU, mars.orbit, 6000);
    if (!c) throw new Error('no crossing');
    const h0 = AU * (circularSpeed(GM_SUN, AU) + 6000);
    for (const f of [0.1, 0.4, 0.8, 1]) {
      const s = conicAt(c.conic, c.time * f);
      expect(s.r * s.vt).toBeCloseTo(h0, -3);
      const e = (s.vr * s.vr + s.vt * s.vt) / 2 - GM_SUN / s.r;
      const e0 = (circularSpeed(GM_SUN, AU) + 6000) ** 2 / 2 - GM_SUN / AU;
      expect(e / e0).toBeCloseTo(1, 9);
    }
  });

  it('reach the target radius at the end of the time of flight, outward and inward', () => {
    const out = crossingTransfer(GM_SUN, AU, mars.orbit, 5000);
    expect(conicAt(out!.conic, out!.time).r / mars.orbit).toBeCloseTo(1, 9);
    const inn = crossingTransfer(GM_SUN, mars.orbit, AU, 4000);
    expect(inn).toBeDefined();
    expect(conicAt(inn!.conic, inn!.time).r / AU).toBeCloseTo(1, 9);
  });

  it('match a numerical integration of the same departure under the same gravity (RK4)', () => {
    const c = crossingTransfer(GM_SUN, AU, mars.orbit, 7000);
    if (!c) throw new Error('no crossing');
    const state = { x: AU, y: 0, vx: 0, vy: circularSpeed(GM_SUN, AU) + 7000 };
    const acc = (x: number, y: number): [number, number] => {
      const r3 = Math.hypot(x, y) ** 3;
      return [(-GM_SUN * x) / r3, (-GM_SUN * y) / r3];
    };
    const steps = 20000;
    const dt = c.time / steps;
    for (let i = 0; i < steps; i++) {
      const [a1x, a1y] = acc(state.x, state.y);
      const k2 = acc(state.x + 0.5 * dt * state.vx, state.y + 0.5 * dt * state.vy);
      const k3 = acc(
        state.x + 0.5 * dt * (state.vx + 0.5 * dt * a1x),
        state.y + 0.5 * dt * (state.vy + 0.5 * dt * a1y)
      );
      const k4 = acc(
        state.x + dt * (state.vx + 0.5 * dt * k2[0]),
        state.y + dt * (state.vy + 0.5 * dt * k2[1])
      );
      state.x += dt * state.vx + (dt * dt * (a1x + k2[0] + k3[0])) / 6;
      state.y += dt * state.vy + (dt * dt * (a1y + k2[1] + k3[1])) / 6;
      const nvx = state.vx + (dt * (a1x + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6;
      const nvy = state.vy + (dt * (a1y + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6;
      state.vx = nvx;
      state.vy = nvy;
    }
    const s = conicAt(c.conic, c.time);
    expect(Math.hypot(state.x, state.y) / mars.orbit).toBeCloseTo(1, 4);
    expect(Math.atan2(state.y, state.x)).toBeCloseTo(c.sweep, 3);
    expect(s.nu).toBeCloseTo(c.sweep, 9);
  });
});
