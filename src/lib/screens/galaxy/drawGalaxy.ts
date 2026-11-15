import type { FB } from '#lib/gfx/framebuffer.ts';
import { dith } from '#lib/gfx/noise.ts';
import { PAL, shade } from '#lib/gfx/palette.ts';
import { toScreen, type Camera } from './camera.ts';
import { systemCounts } from './counts.ts';
import { LINKS, SYSTEMS, type StarSystem } from './stars.ts';

export const GALAXY_SCALE = 2;

export const starRadius = (s: StarSystem, z: number): number =>
  Math.max(2, Math.round(s.radius * Math.sqrt(z)));

export interface Star {
  system: StarSystem;
  x: number;
  y: number;
  r: number;
}

export function placeStars(c: Camera, w: number, h: number): Star[] {
  return SYSTEMS.map((system) => {
    const [x, y] = toScreen(c, w, h, system.x, system.y);
    return { system, x: Math.round(x), y: Math.round(y), r: starRadius(system, c.z) };
  });
}

export function drawGalaxy(f: FB, c: Camera, selected: string, t: number): void {
  f.start();
  const stars = new Map(placeStars(c, f.w, f.h).map((s) => [s.system.id, s]));
  for (const [a, b] of LINKS) {
    const p = stars.get(a)!,
      q = stars.get(b)!,
      unknown = q.system.unknown;
    f.line(p.x, p.y, q.x, q.y, unknown ? PAL.orbit : PAL.jump, unknown ? 4 : 2, unknown ? 0 : t >> 2);
  }
  for (const { system: s, x, y, r: R } of stars.values()) {
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const d = i * i + j * j;
        if (d > R * R + 1) continue;
        if (s.unknown) {
          if (d >= R * R - 2) f.px(x + i, y + j, s.color);
        } else f.px(x + i, y + j, d < R * R * 0.4 + dith(x + i, y + j) * 3 ? [255, 250, 232] : s.color);
      }
    if (!s.unknown)
      for (const [i, j] of [
        [R + 2, 0],
        [-R - 2, 0],
        [0, R + 2],
        [0, -R - 2]
      ] as const)
        f.px(x + i, y + j, (t + s.x) % 14 < 7 ? s.color : shade(s.color, 0.5));
    const counts = systemCounts(s);
    if (counts.colonies) f.rect(x - R - 5, y + R + 1, 3, 3, PAL.sel);
    if (counts.fleets)
      for (const [i, j] of [
        [3, 2],
        [4, 3],
        [5, 2]
      ] as const)
        f.px(x + R + i, y + R + j, PAL.jump);
    if (s.id === selected) f.ring(x, y, R + 5, PAL.sel, 2, t >> 2);
  }
  f.present();
}

export interface LabelBox {
  system: StarSystem;
  left: number;
  top: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

const CHAR_W = 7.4;
const LABEL_H = 20;

export function placeLabels(c: Camera, w: number, h: number, selected: string): LabelBox[] {
  const stars = placeStars(c, w, h).sort(
    (a, b) => Number(b.system.id === selected) - Number(a.system.id === selected) || b.r - a.r
  );
  const out: LabelBox[] = [];
  for (const s of stars) {
    if (s.x < 4 || s.y < 8 || s.x > w - 4 || s.y > h - 8) continue;
    const width = Math.ceil(s.system.name.length * CHAR_W) + 6;
    const left = (s.x + s.r + 6) * GALAXY_SCALE,
      top = s.y * GALAXY_SCALE - 10;
    if (left + width > w * GALAXY_SCALE) continue;
    const hit = out.some(
      (o) =>
        left < o.left + o.width + 4 &&
        left + width + 4 > o.left &&
        top < o.top + LABEL_H &&
        top + LABEL_H > o.top
    );
    if (!hit)
      out.push({
        system: s.system,
        left,
        top,
        width,
        height: LABEL_H,
        cx: s.x * GALAXY_SCALE,
        cy: s.y * GALAXY_SCALE
      });
  }
  return out;
}

export function pickStar(
  c: Camera,
  w: number,
  h: number,
  px: number,
  py: number,
  boxes: readonly LabelBox[]
): string | undefined {
  let best: { id: string; d: number } | undefined;
  for (const s of placeStars(c, w, h)) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (d <= s.r + 5 && (!best || d < best.d)) best = { id: s.system.id, d };
  }
  if (best) return best.id;
  const cx = px * GALAXY_SCALE,
    cy = py * GALAXY_SCALE;
  return boxes.find((b) => cx >= b.left && cx <= b.left + b.width && cy >= b.top && cy <= b.top + b.height)
    ?.system.id;
}
