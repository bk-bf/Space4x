import { describe, expect, it } from 'vitest';
import { DAY } from '../clock.ts';
import { shipComponent } from '../data/index.ts';
import { AU } from '../units.ts';
import { conicAt, crossingTransfer, hohmann } from './kepler.ts';
import { lineThresholdAcceleration } from './line.ts';
import { planTrip, type TripRequest } from './plan.ts';
import { earth, GM_SUN, jupiter, mars, moon, solar } from './reference.ts';
import { legBudget, propellantForDv, shipDeltaV, type Engine, type Ship } from './rocket.ts';
import { absoluteState, placeState, resolvePlace } from './system.ts';
import { eventsOf, positionAt } from './trajectory.ts';
import type { Place } from './types.ts';
import { circularSpeed } from './wells.ts';

const KM = 1000;
const engineOf = (id: string): Engine => {
  const p = shipComponent(id).performance;
  if (!p) throw new Error(id);
  return p;
};

const strong: Engine = { isp: 450, thrust: 1e6 };
const tug: Ship = { dryMass: 20000, payload: 10000, propellant: 150000, engine: strong };
const freighter: Ship = { ...tug, propellant: 500000 };
const lowEarth: Place = { kind: 'orbit', body: 'earth' };
const lowMars: Place = { kind: 'orbit', body: 'mars' };

const req = (over: Partial<TripRequest> = {}): TripRequest => ({
  from: lowEarth,
  to: lowMars,
  departAfter: 0,
  ship: tug,
  system: solar,
  ...over
});

const gap = (a: readonly [number, number], b: readonly [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('the cheapest Earth to Mars trip', () => {
  const plan = planTrip(req({ ship: freighter }));
  const cheap = plan.options.find((o) => o.profile === 'cheapest');

  it('is a Hohmann transfer of about 259 days at 5.7 to 5.9 km/s from low Earth orbit to low Mars orbit (5.73 impulsive plus finite-burn loss)', () => {
    expect(plan.reasons).toEqual([]);
    expect(cheap?.model).toBe('orbit');
    const transfer = (cheap?.stamps.helioEnd ?? 0) - (cheap?.stamps.helioStart ?? 0);
    expect(transfer / DAY).toBeGreaterThan(257);
    expect(transfer / DAY).toBeLessThan(261);
    expect((cheap?.dv ?? 0) / KM).toBeGreaterThan(5.5);
    expect((cheap?.dv ?? 0) / KM).toBeLessThan(5.9);
  });

  it('departs in a window when Mars leads Earth by 44 degrees', () => {
    const w = cheap?.stamps.helioStart ?? 0;
    const e = absoluteState(solar, 'earth', w).pos;
    const m = absoluteState(solar, 'mars', w).pos;
    const lead = (Math.atan2(m[1], m[0]) - Math.atan2(e[1], e[0]) + 4 * Math.PI) % (2 * Math.PI);
    expect((lead * 180) / Math.PI).toBeCloseTo(44.4, 0);
  });

  it('repeats the window every synodic period, 780 days', () => {
    const next = planTrip(req({ ship: freighter, departAfter: (cheap?.stamps.helioStart ?? 0) + DAY }));
    const again = next.options.find((o) => o.profile === 'cheapest');
    const spacing = ((again?.stamps.helioStart ?? 0) - (cheap?.stamps.helioStart ?? 0)) / DAY;
    expect(spacing).toBeCloseTo(779.94, 0);
  });

  it('never departs before it is asked to', () => {
    for (const after of [0, 100 * DAY, 400 * DAY, 900 * DAY]) {
      const o = planTrip(req({ ship: freighter, departAfter: after })).options[0];
      expect(o?.departure ?? 0).toBeGreaterThanOrEqual(after - 1e-6);
    }
  });

  it('starts at the origin and ends at the target', () => {
    if (!cheap) throw new Error('no option');
    const origin = placeState(solar, resolvePlace(solar, lowEarth)!, cheap.stamps.helioStart);
    const start = positionAt(cheap, cheap.stamps.helioStart);
    expect(gap(start.pos, origin.pos)).toBeLessThan(1e7);
    const arrive = positionAt(cheap, cheap.stamps.helioEnd);
    const marsPos = absoluteState(solar, 'mars', cheap.stamps.helioEnd).pos;
    expect(gap(arrive.pos, marsPos)).toBeLessThan(1e7);
    const end = positionAt(cheap, cheap.stamps.end + 40 * DAY);
    expect(end.phase).toBe('arrived');
    const marsLater = placeState(solar, resolvePlace(solar, lowMars)!, cheap.stamps.end + 40 * DAY);
    expect(gap(end.pos, marsLater.pos)).toBeLessThan(1);
  });

  it('spends propellant by the rocket equation: out and back adds up', () => {
    if (!cheap) throw new Error('no option');
    const back = planTrip(
      req({
        from: lowMars,
        to: lowEarth,
        departAfter: cheap.arrival,
        ship: { ...freighter, propellant: cheap.propellantLeft }
      })
    );
    const r = back.options[0];
    if (!r) throw new Error('no return');
    const both = legBudget(freighter, [cheap.dv, r.dv]);
    expect(both[1]?.feasible).toBe(true);
    expect(both[1]?.propellantLeft ?? 0).toBeCloseTo(r.propellantLeft, 3);
    expect(cheap.canReturn).toBe(true);
    expect(cheap.returnDv ?? 0).toBeCloseTo(r.dv, 3);
  });

  it('says a ship cannot return when the tank is dry after arriving', () => {
    if (!cheap) throw new Error('no option');
    const tight = planTrip(
      req({ ship: { ...tug, propellant: propellantForDv(cheap.dv * 1.3, 30000, 450) } })
    );
    const o = tight.options.find((x) => x.profile === 'cheapest');
    expect(o?.canStop).toBe(true);
    expect(o?.canReturn).toBe(false);
  });

  it('is cheaper with aerobraking at Mars, and says so', () => {
    const aero = planTrip(req({ ship: freighter, aerobrake: true })).options.find(
      (o) => o.profile === 'cheapest'
    );
    expect(aero?.aerobraked).toBe(true);
    expect(cheap?.aerobraked).toBe(false);
    expect((cheap?.dv ?? 0) - (aero?.dv ?? 0)).toBeGreaterThan(1500);
    expect(aero?.maneuvers.some((m) => m.mode === 'aero')).toBe(true);
  });
});

describe('profiles', () => {
  const ntr = engineOf('ntr_engine');
  const ship: Ship = { dryMass: 60000, payload: 10000, propellant: 300000, engine: ntr, count: 3 };
  const plan = planTrip(req({ ship }));

  it('offers a faster option that costs more delta-v, within what the ship carries', () => {
    const cheap = plan.options.find((o) => o.profile === 'cheapest');
    const fast = plan.options.find((o) => o.profile === 'fastest');
    expect(fast).toBeDefined();
    expect(fast?.arrival ?? Infinity).toBeLessThan((cheap?.arrival ?? 0) * 0.9);
    expect(fast?.dv ?? 0).toBeGreaterThan((cheap?.dv ?? Infinity) * 1.5);
    expect(fast?.dv ?? Infinity).toBeLessThanOrEqual(shipDeltaV(ship) * 1.0001);
  });

  it('lists the cheapest first and orders the rest by speed', () => {
    const names = plan.options.map((o) => o.profile);
    expect(names[0]).toBe('cheapest');
    const arrivals = plan.options.map((o) => o.arrival);
    expect(arrivals).toEqual([...arrivals].sort((a, b) => b - a));
  });

  it('flies a strong ship straight: burn, flip, burn, in days not months', () => {
    const synthetic: Ship = {
      dryMass: 5000,
      payload: 5000,
      propellant: 20000,
      engine: { isp: 100000, thrust: 1e6 }
    };
    const fast = planTrip(req({ ship: synthetic })).options.find((o) => o.profile === 'fastest');
    expect(fast?.model).toBe('line');
    expect((fast?.stamps.helioEnd ?? 0) - (fast?.stamps.helioStart ?? 0)).toBeLessThan(15 * DAY);
    if (!fast) throw new Error('no fast option');
    const hit = positionAt(fast, fast.stamps.helioEnd);
    const m = absoluteState(solar, 'mars', fast.stamps.helioEnd);
    expect(gap(hit.pos, m.pos)).toBeLessThan(1e6);
    expect(gap(hit.vel, m.vel)).toBeLessThan(5);
    expect(eventsOf(fast).some((e) => e.kind === 'flip')).toBe(true);
    const mid = positionAt(
      fast,
      fast.stamps.helioStart + (fast.stamps.helioEnd - fast.stamps.helioStart) / 2
    );
    expect(['coasting', 'accelerating', 'decelerating']).toContain(mid.phase);
  });

  it('lets a weak electric ship spiral, for years, and arrive matched', () => {
    const ion = engineOf('ion_thruster');
    const ship2: Ship = { dryMass: 2000, payload: 500, propellant: 3000, engine: ion, count: 2 };
    const p = planTrip(req({ ship: ship2 }));
    expect(p.reasons).toEqual([]);
    const o = p.options[0];
    expect(p.options).toHaveLength(1);
    expect(o?.model).toBe('spiral');
    expect(o?.approximate).toBe(false);
    const strongSpiral = planTrip(req({ ship: { ...ship2, count: 8 } })).options[0];
    expect(strongSpiral?.model).toBe('spiral');
    expect(strongSpiral?.approximate).toBe(true);
    expect((o?.duration ?? 0) / DAY).toBeGreaterThan(365);
    if (!o) throw new Error('none');
    const end = positionAt(o, o.stamps.helioEnd);
    const m = absoluteState(solar, 'mars', o.stamps.helioEnd);
    expect(gap(end.pos, m.pos) / AU).toBeLessThan(0.01);
    expect(gap(end.vel, m.vel)).toBeLessThan(0.1 * Math.hypot(m.vel[0], m.vel[1]));
  });
});

describe('the planner regime boundary', () => {
  const opposition = { ...solar, bodies: [earth, { ...mars, angle: 0 }] };
  const threshold = lineThresholdAcceleration(GM_SUN, AU);
  const shipAt = (accel: number): Ship => ({
    dryMass: 5000,
    payload: 5000,
    propellant: 20000,
    engine: { isp: 100000, thrust: accel * 22000 }
  });
  const fastest = (accel: number) =>
    planTrip(req({ system: opposition, ship: shipAt(accel) })).options.find((o) => o.profile === 'fastest');

  it('uses the straight-line model above the threshold acceleration and the orbital one below it', () => {
    expect(fastest(threshold * 3)?.model).toBe('line');
    expect(fastest(threshold / 3)?.model).not.toBe('line');
  });

  it('agrees with the orbital model where both apply: a very fast crossing orbit is a straight coast', () => {
    const h = hohmann(GM_SUN, AU, mars.orbit);
    const c = crossingTransfer(GM_SUN, AU, mars.orbit, h.dv1 * 60);
    if (!c) throw new Error('no crossing');
    const start = absoluteState(opposition, 'earth', 0).pos;
    const s = conicAt(c.conic, c.time);
    const end: [number, number] = [s.r * Math.cos(c.sweep), s.r * Math.sin(c.sweep)];
    const chord = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const speed = Math.hypot(0, circularSpeed(GM_SUN, AU) + c.dv1);
    expect(c.time / (chord / speed)).toBeGreaterThan(0.95);
    expect(c.time / (chord / speed)).toBeLessThan(1.1);
  });
});

describe('why a trip fails', () => {
  it('says how much delta-v is missing, and offers a fly-by when departure alone is affordable', () => {
    const small: Ship = { ...tug, propellant: 30000 };
    const p = planTrip(req({ ship: small }));
    const why = p.reasons.find((r) => r.code === 'delta-v');
    expect(why?.need ?? 0).toBeGreaterThan(why?.have ?? Infinity);
    expect(p.options.length === 0 || p.options[0]?.canStop === false).toBe(true);
  });

  it('refuses to leave a surface when thrust cannot lift the ship', () => {
    const ion = engineOf('ion_thruster');
    const p = planTrip(
      req({
        from: { kind: 'surface', body: 'earth' },
        ship: { dryMass: 2000, payload: 500, propellant: 3000, engine: ion, count: 4 }
      })
    );
    expect(p.options).toEqual([]);
    expect(p.reasons.map((r) => r.code)).toContain('thrust-surface');
  });

  it('refuses to land where thrust cannot hold the ship up', () => {
    const weak: Ship = {
      dryMass: 20000,
      payload: 10000,
      propellant: 150000,
      engine: { isp: 450, thrust: 3e4 }
    };
    const p = planTrip(
      req({ from: { kind: 'orbit', body: 'moon' }, to: { kind: 'surface', body: 'earth' }, ship: weak })
    );
    expect(p.reasons.map((r) => r.code)).toContain('thrust-landing');
  });

  it('reports the same place, an unknown body and places with no shared primary', () => {
    expect(planTrip(req({ to: lowEarth })).reasons[0]?.code).toBe('same-place');
    expect(planTrip(req({ to: { kind: 'orbit', body: 'nowhere' } })).reasons[0]?.code).toBe('unknown-body');
    const lone = { ...solar, bodies: [...solar.bodies, { ...jupiter, id: 'rogue', parent: 'ghost' }] };
    expect(planTrip(req({ system: lone, to: { kind: 'orbit', body: 'rogue' } })).options).toEqual([]);
  });
});

describe('places', () => {
  const raptor = engineOf('chemical_engine_methalox');
  const lander: Ship = { dryMass: 3000, payload: 2000, propellant: 400000, engine: raptor, count: 4 };

  it('plans Earth surface to Moon surface for about 15 km/s: 9.4 lift, 4.0 transfer, 1.9 landing', () => {
    const p = planTrip(
      req({ from: { kind: 'surface', body: 'earth' }, to: { kind: 'surface', body: 'moon' }, ship: lander })
    );
    expect(p.reasons).toEqual([]);
    const o = p.options[0];
    expect((o?.dv ?? 0) / KM).toBeGreaterThan(15);
    expect((o?.dv ?? 0) / KM).toBeLessThan(15.5);
    expect(o?.maneuvers.map((m) => m.kind)).toEqual(['ascent', 'burn', 'capture', 'descent']);
    expect(((o?.stamps.helioEnd ?? 0) - (o?.stamps.helioStart ?? 0)) / DAY).toBeCloseTo(4.98, 1);
  });

  it('plans low Earth orbit to low lunar orbit for 4 km/s in about 5 days', () => {
    const p = planTrip(req({ to: { kind: 'orbit', body: 'moon' } }));
    const o = p.options.find((x) => x.profile === 'cheapest');
    expect((o?.dv ?? 0) / KM).toBeGreaterThan(3.8);
    expect((o?.dv ?? 0) / KM).toBeLessThan(4.2);
    const arrive = positionAt(o!, o!.stamps.helioEnd);
    expect(gap(arrive.pos, absoluteState(solar, 'moon', o!.stamps.helioEnd).pos)).toBeLessThan(3e6);
  });

  it('climbs out of a moon and out of its planet: lunar orbit to low Mars orbit', () => {
    const p = planTrip(req({ from: { kind: 'orbit', body: 'moon' } }));
    const o = p.options[0];
    expect(o?.maneuvers.filter((m) => m.kind === 'escape').map((m) => m.body)).toEqual(['moon', 'earth']);
    expect((o?.dv ?? 0) / KM).toBeGreaterThan(4.5);
    expect((o?.dv ?? 0) / KM).toBeLessThan(5.6);
    expect(o?.primary).toBe('star');
  });

  it('flies to a free point such as a jump point or a station at fixed elements', () => {
    const jump: Place = {
      kind: 'point',
      id: 'jp',
      orbit: 5.2 * AU,
      angle: 2,
      angularSpeed: (2 * Math.PI) / (4332 * DAY)
    };
    const p = planTrip(req({ to: jump, ship: { ...tug, engine: { isp: 5000, thrust: 1e6 } } }));
    const o = p.options[0];
    expect(o?.maneuvers.map((m) => m.kind)).toEqual(['escape', 'burn']);
    expect(((o?.stamps.helioEnd ?? 0) - (o?.stamps.helioStart ?? 0)) / DAY).toBeGreaterThan(900);
    const hit = positionAt(o!, o!.stamps.helioEnd);
    const a = 2 + ((2 * Math.PI) / (4332 * DAY)) * o!.stamps.helioEnd;
    expect(gap(hit.pos, [5.2 * AU * Math.cos(a), 5.2 * AU * Math.sin(a)])).toBeLessThan(1e6);
  });
});

describe('ship state along a trip', () => {
  const plan = planTrip(req({ ship: freighter }));
  const o = plan.options[0];
  if (!o) throw new Error('no option');
  const t0 = o.stamps.helioStart + 20 * DAY;

  it('gives the same position after one 30-day step as after thirty 1-day steps', () => {
    let t = t0;
    let last = positionAt(o, t);
    for (let i = 0; i < 30; i++) {
      t += DAY;
      last = positionAt(o, t);
    }
    const once = positionAt(o, t0 + 30 * DAY);
    expect(gap(last.pos, once.pos)).toBe(0);
    expect(gap(last.vel, once.vel)).toBe(0);
  });

  it('has a velocity equal to the derivative of its position, on the transfer', () => {
    for (const f of [0.1, 0.5, 0.9]) {
      const t = o.stamps.helioStart + (o.stamps.helioEnd - o.stamps.helioStart) * f;
      const h = 60;
      const a = positionAt(o, t - h).pos;
      const b = positionAt(o, t + h).pos;
      const v = positionAt(o, t).vel;
      expect(Math.hypot((b[0] - a[0]) / (2 * h) - v[0], (b[1] - a[1]) / (2 * h) - v[1])).toBeLessThan(0.5);
    }
  });

  it('keeps its speed continuous where the ship leaves the origin and reaches the target', () => {
    const before = positionAt(o, o.stamps.helioStart - 1);
    const after = positionAt(o, o.stamps.helioStart + 1);
    expect(gap(before.pos, after.pos)).toBeLessThan(1e7);
    expect(gap(before.vel, after.vel)).toBeLessThan(1.2e4);
  });

  it('is parked before it departs and lists its burns in order', () => {
    expect(positionAt(o, o.departure - 10 * DAY).phase).toBe('parked');
    const ev = eventsOf(o);
    expect(ev.map((e) => e.t)).toEqual([...ev.map((e) => e.t)].sort((a, b) => a - b));
    expect(ev.at(-1)?.kind).toBe('arrival');
    const burns = o.maneuvers;
    expect(burns[0]?.start).toBeCloseTo(o.departure, 3);
    expect(burns.at(-1)?.start ?? 0).toBeGreaterThanOrEqual(o.stamps.helioEnd - 1e-6);
  });

  it('keeps a straight-line trip identical whether it is stepped in days or all at once', () => {
    const synthetic: Ship = {
      dryMass: 5000,
      payload: 5000,
      propellant: 20000,
      engine: { isp: 100000, thrust: 1e6 }
    };
    const fast = planTrip(req({ ship: synthetic })).options.find((x) => x.model === 'line');
    if (!fast) throw new Error('no line');
    const s = fast.stamps.helioStart;
    expect(gap(positionAt(fast, s + 3 * DAY).pos, positionAt(fast, s + 3 * DAY).pos)).toBe(0);
    const a = positionAt(fast, s + 1 * DAY);
    const b = positionAt(fast, s + 1 * DAY + 5);
    expect(gap(a.vel, [(b.pos[0] - a.pos[0]) / 5, (b.pos[1] - a.pos[1]) / 5])).toBeLessThan(5);
    void moon;
    void earth;
    void mars;
  });
});
