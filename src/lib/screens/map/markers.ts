import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { AsteroidType } from '#lib/game/data/index.ts';

export const MARK_R = 3;

export const BODY_COLOUR: Record<PlanetType, RGB> = {
  terran: [80, 140, 200],
  mars: [196, 108, 62],
  venus: [232, 204, 132],
  gas: [226, 198, 158],
  saturn: [214, 190, 136],
  ice: [150, 210, 220],
  ice2: [80, 120, 220],
  rock: [150, 146, 150]
};

export const ASTEROID_COLOUR: Record<AsteroidType, RGB> = {
  carbonaceous: [176, 150, 132],
  stony: [236, 196, 140],
  metallic: [150, 200, 240],
  icy: [196, 218, 232]
};

export const COMET_COLOUR: RGB = [214, 236, 244];

export function asteroidMark(f: FB, x: number, y: number, col: RGB, plus: boolean): void {
  x = Math.round(x);
  y = Math.round(y);
  if (!plus) return f.px(x, y, col);
  f.rect(x - 1, y, 3, 1, col);
  f.rect(x, y - 1, 1, 3, col);
}

export const SIDE_COLOUR = {
  navy: [95, 208, 197],
  civ: [182, 222, 240],
  foe: PAL.hot,
  neutral: PAL.belt[1]
} as const satisfies Record<string, RGB>;

export type Side = keyof typeof SIDE_COLOUR;

const STAR_RAY: RGB = [246, 156, 60];
const STAR_CORE: RGB = [255, 250, 224];
const RING: RGB = [190, 164, 112];

export function bodyMark(f: FB, x: number, y: number, col: RGB, moon: boolean, rings: boolean): void {
  x = Math.round(x);
  y = Math.round(y);
  if (moon) return f.px(x, y, col);
  f.rect(x - 1, y - 2, 3, 5, col);
  f.rect(x - 2, y - 1, 5, 3, col);
  if (rings) for (let i = -4; i <= 4; i++) if (Math.abs(i) > 2) f.px(x + i, y, RING);
}

export function starMark(f: FB, x: number, y: number, core: RGB = STAR_CORE, ray: RGB = STAR_RAY): void {
  x = Math.round(x);
  y = Math.round(y);
  for (const [i, j] of [
    [-4, 0],
    [-3, 0],
    [3, 0],
    [4, 0],
    [0, -4],
    [0, -3],
    [0, 3],
    [0, 4]
  ] as const)
    f.px(x + i, y + j, ray);
  f.rect(x - 1, y - 2, 3, 5, core);
  f.rect(x - 2, y - 1, 5, 3, core);
}

export function chevron(f: FB, x: number, y: number, a: number, col: RGB): void {
  const c = Math.cos(a),
    s = Math.sin(a),
    tx = x + c * 4,
    ty = y + s * 4,
    lx = x - c * 3 - s * 3,
    ly = y - s * 3 + c * 3,
    rx = x - c * 3 + s * 3,
    ry = y - s * 3 - c * 3;
  f.line(tx, ty, lx, ly, col);
  f.line(tx, ty, rx, ry, col);
  f.line(lx, ly, x - c, y - s, col);
  f.line(rx, ry, x - c, y - s, col);
}

export function diamond(f: FB, x: number, y: number, col: RGB): void {
  x = Math.round(x);
  y = Math.round(y);
  for (let i = 0; i < 4; i++) {
    f.px(x - 3 + i, y - i, col);
    f.px(x + i, y - 3 + i, col);
    f.px(x + 3 - i, y + i, col);
    f.px(x - i, y + 3 - i, col);
  }
}

export function baseMark(f: FB, x: number, y: number, col: RGB): void {
  x = Math.round(x);
  y = Math.round(y);
  f.rect(x - 1, y - 1, 3, 3, col);
  for (const [i, j] of [
    [-3, 0],
    [3, 0],
    [0, -3],
    [0, 3]
  ] as const)
    f.px(x + i, y + j, col);
}

export function jumpMark(f: FB, x: number, y: number, t: number, stable = false): void {
  if (stable) {
    f.ring(x, y, 5, PAL.jump, 1, 0);
    f.ring(x, y, 2, PAL.jump, 1, 0);
  } else {
    f.ring(x, y, 5, PAL.jump, 2, t >> 1);
    f.ring(x, y, 2, PAL.jump, 2, -(t >> 1));
  }
  f.px(x, y, PAL.jump);
}

export function brackets(f: FB, x: number, y: number, bw: number, bh: number): void {
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ] as const)
    for (let i = 0; i < 3; i++) {
      f.px(x + dx * (bw - i), y + dy * bh, PAL.sel);
      f.px(x + dx * bw, y + dy * (bh - i), PAL.sel);
    }
}

export function clipLine(
  f: FB,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: RGB,
  gap = 1,
  phase = 0
): void {
  let t0 = 0,
    t1 = 1;
  const dx = x1 - x0,
    dy = y1 - y0;
  for (const [p, q] of [
    [-dx, x0 + 2],
    [dx, f.w + 1 - x0],
    [-dy, y0 + 2],
    [dy, f.h + 1 - y0]
  ] as const) {
    if (p === 0) {
      if (q < 0) return;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return;
      if (r < t1) t1 = r;
    }
  }
  f.line(x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1, c, gap, phase);
}

const ARC_FULL = 4000;

export function orbitArc(f: FB, x: number, y: number, r: number, c: RGB, gap = 3, phase = 0): void {
  if (r < 3) return;
  const diag = Math.hypot(f.w, f.h),
    dc = Math.hypot(f.w / 2 - x, f.h / 2 - y);
  if (Math.abs(dc - r) > diag) return;
  if (r < ARC_FULL) return f.ring(x, y, r, c, gap, phase);
  const a0 = Math.atan2(f.h / 2 - y, f.w / 2 - x),
    span = (diag / r) * 1.2,
    n = Math.ceil((span * r) / 2);
  for (let i = -n; i <= n; i++)
    if ((i + phase) % gap === 0) {
      const a = a0 + (i / n) * span;
      f.px(x + Math.cos(a) * r, y + Math.sin(a) * r, c);
    }
}
