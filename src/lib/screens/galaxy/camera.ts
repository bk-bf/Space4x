import type { StarSystem } from './stars.ts';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export const Z_MIN = 0.4;
export const Z_MAX = 10;
export const WHEEL_RATE = 0.0016;
export const FIT_PADDING = 64;

export const clampZoom = (z: number): number => Math.max(Z_MIN, Math.min(Z_MAX, z));

export const wheelFactor = (deltaY: number, deltaMode = 0): number =>
  Math.exp(-(deltaMode === 1 ? deltaY * 33 : deltaY) * WHEEL_RATE);

export const toScreen = (c: Camera, w: number, h: number, x: number, y: number): [number, number] => [
  w / 2 + (x - c.x) * c.z,
  h / 2 + (y - c.y) * c.z
];

export const toWorld = (c: Camera, w: number, h: number, px: number, py: number): [number, number] => [
  c.x + (px - w / 2) / c.z,
  c.y + (py - h / 2) / c.z
];

export function zoomAbout(c: Camera, w: number, h: number, px: number, py: number, factor: number): Camera {
  const [wx, wy] = toWorld(c, w, h, px, py);
  const z = clampZoom(c.z * factor);
  return { z, x: wx - (px - w / 2) / z, y: wy - (py - h / 2) / z };
}

export function fitAll(systems: readonly StarSystem[], w: number, h: number): Camera {
  const xs = systems.map((s) => s.x),
    ys = systems.map((s) => s.y);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const z = clampZoom(Math.min((w - FIT_PADDING) / (x1 - x0 || 1), (h - FIT_PADDING) / (y1 - y0 || 1)));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z };
}
