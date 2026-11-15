import { DEFAULT_ALTITUDE, DEFAULT_ATMOSPHERE_ALTITUDE, GRAVITY_LOSS_FRACTION } from './constants.ts';
import type { FlightBody } from './types.ts';

export const circularSpeed = (gm: number, r: number): number => Math.sqrt(gm / r);
export const orbitalPeriod = (gm: number, r: number): number => 2 * Math.PI * Math.sqrt((r * r * r) / gm);
export const surfaceGravity = (b: FlightBody): number => b.gm / (b.radius * b.radius);

export const lowOrbitRadius = (b: FlightBody, altitude?: number): number =>
  b.radius +
  (altitude ?? b.lowOrbitAltitude ?? (b.atmosphere ? DEFAULT_ATMOSPHERE_ALTITUDE : DEFAULT_ALTITUDE));

export const idealAscent = (b: FlightBody, orbitRadius: number): number =>
  Math.sqrt(2 * b.gm * (1 / b.radius - 1 / (2 * orbitRadius)));

export const surfaceToOrbit = (b: FlightBody, orbitRadius = lowOrbitRadius(b)): number =>
  idealAscent(b, orbitRadius) * (1 + GRAVITY_LOSS_FRACTION) + (b.atmosphere?.ascentLoss ?? 0);

export const orbitToSurface = (
  b: FlightBody,
  options: { aero?: boolean; orbitRadius?: number } = {}
): number => {
  if (options.aero && b.atmosphere) return b.atmosphere.landingDv;
  return surfaceToOrbit(b, options.orbitRadius);
};

export const escapeFromOrbit = (gm: number, r: number, vInf = 0): number => {
  const vc = circularSpeed(gm, r);
  return Math.sqrt(vInf * vInf + 2 * vc * vc) - vc;
};

export interface Capture {
  dv: number;
  aero: boolean;
}

export const canAerobrake = (b: FlightBody | undefined, vInf: number): boolean =>
  !!b?.atmosphere?.aerobrake && vInf <= b.atmosphere.aerobrake.maxVInf;

export function captureIntoOrbit(
  b: FlightBody | undefined,
  gm: number,
  r: number,
  vInf: number,
  allowAero: boolean
): Capture {
  if (allowAero && canAerobrake(b, vInf) && b?.atmosphere?.aerobrake) {
    return { dv: b.atmosphere.aerobrake.residualDv, aero: true };
  }
  return { dv: escapeFromOrbit(gm, r, vInf), aero: false };
}
