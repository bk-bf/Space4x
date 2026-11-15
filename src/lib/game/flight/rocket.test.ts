import { describe, expect, it } from 'vitest';
import {
  burnTime,
  dvFromMasses,
  exhaustVelocity,
  legBudget,
  massAfterBurn,
  meanAcceleration,
  propellantForDv,
  roundTripFeasible,
  shipDeltaV,
  shipThrust,
  type Ship
} from './rocket.ts';
import { G0 } from './constants.ts';

const engine = { isp: 350, thrust: 1e6 };
const ship: Ship = { dryMass: 10000, payload: 2000, propellant: 30000, engine };

describe('rocket equation', () => {
  it('uses standard gravity for exhaust velocity (ISO 80000-3: g0 = 9.80665 m/s2)', () => {
    expect(G0).toBe(9.80665);
    expect(exhaustVelocity(350)).toBeCloseTo(3432.3275, 4);
  });

  it('inverts: propellant for a delta-v gives back that delta-v from the masses', () => {
    for (const dv of [100, 1500, 4000, 9400]) {
      const final = 12000;
      const prop = propellantForDv(dv, final, 350);
      expect(dvFromMasses(350, final + prop, final)).toBeCloseTo(dv, 8);
    }
  });

  it('takes zero propellant for zero delta-v and grows exponentially (Tsiolkovsky)', () => {
    expect(propellantForDv(0, 5000, 300)).toBe(0);
    const ve = exhaustVelocity(300);
    expect(propellantForDv(ve, 1000, 300)).toBeCloseTo(1000 * (Math.E - 1), 8);
  });

  it('gives a ship its delta-v from its masses', () => {
    expect(shipDeltaV(ship)).toBeCloseTo(exhaustVelocity(350) * Math.log(42000 / 12000), 8);
  });

  it('adds delta-v across legs: two burns equal one burn of the sum', () => {
    const legs = legBudget(ship, [1500, 2500]);
    const single = legBudget(ship, [4000]);
    expect(legs[1]?.massEnd).toBeCloseTo(single[0]?.massEnd ?? 0, 6);
    expect((legs[0]?.propellant ?? 0) + (legs[1]?.propellant ?? 0)).toBeCloseTo(
      single[0]?.propellant ?? 0,
      6
    );
  });

  it('flags the leg that runs the tank dry', () => {
    const legs = legBudget(ship, [3000, 3000]);
    expect(legs.map((l) => l.feasible)).toEqual([true, false]);
    expect(roundTripFeasible(ship, 2000, 2000)).toBe(true);
    expect(roundTripFeasible(ship, 3000, 3000)).toBe(false);
  });

  it('burns for the rocket-equation time: m0 ve / F (1 - exp(-dv/ve))', () => {
    const t = burnTime(42000, 1e6, 350, 2000);
    const final = massAfterBurn(42000, 2000, 350);
    expect(t).toBeCloseTo((42000 - final) / (1e6 / exhaustVelocity(350)), 6);
  });

  it('has a mean acceleration whose product with burn time is the delta-v', () => {
    const a = meanAcceleration(42000, 1e6, 350, 2000);
    expect(a * burnTime(42000, 1e6, 350, 2000)).toBeCloseTo(2000, 6);
  });

  it('throttles an electric engine to the power available', () => {
    const electric: Ship = { ...ship, engine: { isp: 1600, thrust: 0.08, power: 1.35 } };
    expect(shipThrust(electric)).toBeCloseTo(0.08, 12);
    expect(shipThrust({ ...electric, powerAvailable: 0.675, count: 2 })).toBeCloseTo(0.08, 12);
    expect(shipThrust({ ...electric, count: 4 })).toBeCloseTo(0.32, 12);
  });
});
