import { describe, expect, it } from 'vitest';
import { AU } from '../units.ts';
import { earth, mars, moon } from './reference.ts';
import {
  captureIntoOrbit,
  circularSpeed,
  escapeFromOrbit,
  lowOrbitRadius,
  orbitalPeriod,
  orbitToSurface,
  surfaceToOrbit
} from './wells.ts';

const KM = 1000;

describe('gravity wells', () => {
  it('lifts Earth surface to low orbit for about 9.4 km/s (Wikipedia, Delta-v budget: 9.3 to 10)', () => {
    expect(surfaceToOrbit(earth) / KM).toBeGreaterThan(9.3);
    expect(surfaceToOrbit(earth) / KM).toBeLessThan(9.5);
  });

  it('lifts the Moon surface to low lunar orbit for about 1.9 km/s (Wikipedia, Delta-v budget: 1.87)', () => {
    expect(surfaceToOrbit(moon) / KM).toBeCloseTo(1.87, 1);
  });

  it('lifts Mars surface to low Mars orbit for about 4.1 km/s (Wikipedia, Delta-v budget: 4.1)', () => {
    expect(surfaceToOrbit(mars) / KM).toBeCloseTo(4.1, 1);
  });

  it('lands for the same delta-v as it lifts when there is no atmosphere to help', () => {
    expect(orbitToSurface(moon)).toBeCloseTo(surfaceToOrbit(moon), 9);
    expect(orbitToSurface(mars)).toBeCloseTo(surfaceToOrbit(mars), 9);
  });

  it('lands through an atmosphere for far less when aerobraking is allowed', () => {
    expect(orbitToSurface(mars, { aero: true })).toBeLessThan(0.15 * orbitToSurface(mars));
    expect(orbitToSurface(moon, { aero: true })).toBeCloseTo(surfaceToOrbit(moon), 9);
  });

  it('circles Earth at 200 km at 7.79 km/s in 88.5 minutes (standard LEO values)', () => {
    const r = lowOrbitRadius(earth);
    expect(r).toBeCloseTo(6.571e6, -2);
    expect(circularSpeed(earth.gm, r) / KM).toBeCloseTo(7.79, 2);
    expect(orbitalPeriod(earth.gm, r) / 60).toBeCloseTo(88.5, 0);
  });

  it('escapes from low Earth orbit for (sqrt 2 - 1) of the circular speed, 3.23 km/s', () => {
    const r = lowOrbitRadius(earth);
    expect(escapeFromOrbit(earth.gm, r) / KM).toBeCloseTo(3.226, 2);
    expect(escapeFromOrbit(earth.gm, r)).toBeCloseTo((Math.SQRT2 - 1) * circularSpeed(earth.gm, r), 6);
  });

  it('leaves with the Oberth effect: more excess speed costs less than its own size', () => {
    const r = lowOrbitRadius(earth);
    const vInf = 2944.7;
    expect(escapeFromOrbit(earth.gm, r, vInf)).toBeLessThan(escapeFromOrbit(earth.gm, r) + vInf);
    expect(escapeFromOrbit(earth.gm, r, vInf) / KM).toBeCloseTo(3.61, 2);
  });

  it('captures for the same delta-v it takes to leave, unless the atmosphere does the braking', () => {
    const r = lowOrbitRadius(mars);
    const plain = captureIntoOrbit(mars, mars.gm, r, 2650, false);
    expect(plain.dv).toBeCloseTo(escapeFromOrbit(mars.gm, r, 2650), 9);
    expect(plain.aero).toBe(false);
    const aero = captureIntoOrbit(mars, mars.gm, r, 2650, true);
    expect(aero.aero).toBe(true);
    expect(aero.dv).toBeLessThan(0.1 * plain.dv);
  });

  it('does not aerobrake above the speed the atmosphere can take, or where there is no air', () => {
    const r = lowOrbitRadius(mars);
    expect(captureIntoOrbit(mars, mars.gm, r, 9000, true).aero).toBe(false);
    expect(captureIntoOrbit(moon, moon.gm, lowOrbitRadius(moon), 800, true).aero).toBe(false);
  });

  it('keeps a body above its own surface when the altitude is the default', () => {
    expect(lowOrbitRadius({ ...moon, lowOrbitAltitude: undefined })).toBeCloseTo(moon.radius + 100e3, 6);
    expect(AU).toBeGreaterThan(1e11);
  });
});
