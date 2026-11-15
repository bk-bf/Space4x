import { hash } from '#lib/gfx/math.ts';
import type { Body, Fleet } from './types';

export const KM_PER_UNIT = 1.496e8 / 74;

export type Point = readonly [number, number];

export const bodyPosition = (b: Body): Point => [Math.cos(b.angle) * b.orbit, Math.sin(b.angle) * b.orbit];

const PARKING_RATE = 1e-5;

const SLOT_ANGLE = 1.1;

export function parkingSpot(
  fleet: Fleet,
  body: Body,
  elapsed: number,
  slot = 0
): { x: number; y: number; heading: 1 | -1 } {
  const [bx, by] = bodyPosition(body);
  const a = elapsed * PARKING_RATE + hash(fleet.id.length, 1, 1) * 6 + slot * SLOT_ANGLE,
    r = body.radius + 9;
  return { x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r * 0.6, heading: Math.sin(a) > 0 ? -1 : 1 };
}
