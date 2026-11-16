import { hash } from '#lib/gfx/math.ts';
import type { Body, Fleet } from './types';

export const isColony = (b: Body): boolean => b.colony === true;

export type Point = readonly [number, number];

export function bodyPosition(b: Body, bodies: readonly Body[]): Point {
  const parent = b.parent ? bodies.find((x) => x.id === b.parent) : undefined;
  const [px, py] = parent ? bodyPosition(parent, bodies) : [0, 0];
  return [px + Math.cos(b.angle) * b.orbit, py + Math.sin(b.angle) * b.orbit];
}

const PARKING_RATE = 1e-5;
const SLOT_ANGLE = 1.1;
const PARKING_RADII = 1.6;
const PARKING_CLEARANCE = 1e6;

export const parkingRadius = (body: Body): number => body.radius * PARKING_RADII + PARKING_CLEARANCE;

export function parkingSpot(
  fleet: Fleet,
  body: Body,
  bodies: readonly Body[],
  elapsed: number,
  slot = 0
): { x: number; y: number; heading: number } {
  const [bx, by] = bodyPosition(body, bodies);
  const a = elapsed * PARKING_RATE + hash(fleet.id.length, 1, 1) * 6 + slot * SLOT_ANGLE,
    r = parkingRadius(body);
  return { x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, heading: a + Math.PI / 2 };
}
