import { hash } from '#lib/gfx/math.ts';

export const DETAIL_SIZE = 256;
const MASK = DETAIL_SIZE - 1;
const CRATERS = 260;
const BOULDERS = 900;
const GRAIN = 0.35;

export interface Detail {
  readonly gu: Float32Array;
  readonly gv: Float32Array;
  readonly tone: Float32Array;
}

const wrap = (d: number): number =>
  d > DETAIL_SIZE / 2 ? d - DETAIL_SIZE : d < -DETAIL_SIZE / 2 ? d + DETAIL_SIZE : d;

function stamp(
  h: Float32Array,
  t: Float32Array,
  cx: number,
  cy: number,
  r: number,
  fn: (u: number) => [number, number]
): void {
  const reach = Math.ceil(r * 1.5);
  for (let j = -reach; j <= reach; j++)
    for (let i = -reach; i <= reach; i++) {
      const x = (Math.round(cx) + i) & MASK,
        y = (Math.round(cy) + j) & MASK,
        u = Math.hypot(wrap(x - cx), wrap(y - cy)) / r;
      if (u > 1.5) continue;
      const [dh, dt] = fn(u),
        q = y * DETAIL_SIZE + x;
      h[q] = h[q]! + dh;
      t[q] = t[q]! + dt;
    }
}

function build(): Detail {
  const n = DETAIL_SIZE * DETAIL_SIZE,
    h = new Float32Array(n),
    tone = new Float32Array(n);
  for (let y = 0; y < DETAIL_SIZE; y++)
    for (let x = 0; x < DETAIL_SIZE; x++) {
      const q = y * DETAIL_SIZE + x;
      h[q] = (hash(x, y, 11) - 0.5) * GRAIN;
      tone[q] = (hash(x, y, 13) - 0.5) * 0.16;
    }
  for (let k = 0; k < CRATERS; k++) {
    const r = 1.6 + 16 * hash(k, 3, 17) ** 3,
      depth = r * 0.45;
    stamp(h, tone, hash(k, 1, 17) * DETAIL_SIZE, hash(k, 2, 17) * DETAIL_SIZE, r, (u) => [
      u < 1
        ? -depth * (1 - u * u) + depth * 0.32 * Math.exp(-(((u - 1) / 0.22) ** 2))
        : depth * 0.32 * Math.exp(-(((u - 1) / 0.22) ** 2)),
      u < 0.8 ? -0.1 : u < 1.15 ? 0.08 : 0
    ]);
  }
  for (let k = 0; k < BOULDERS; k++) {
    const r = 0.7 + 2.6 * hash(k, 3, 23) ** 2.5;
    stamp(h, tone, hash(k, 1, 23) * DETAIL_SIZE, hash(k, 2, 23) * DETAIL_SIZE, r, (u) => [
      u < 1 ? r * 0.7 * Math.sqrt(1 - u * u) : 0,
      u < 1 ? 0.06 : 0
    ]);
  }
  const gu = new Float32Array(n),
    gv = new Float32Array(n);
  for (let y = 0; y < DETAIL_SIZE; y++)
    for (let x = 0; x < DETAIL_SIZE; x++) {
      const q = y * DETAIL_SIZE + x;
      gu[q] = (h[y * DETAIL_SIZE + ((x + 1) & MASK)]! - h[y * DETAIL_SIZE + ((x - 1) & MASK)]!) / 2;
      gv[q] = (h[((y + 1) & MASK) * DETAIL_SIZE + x]! - h[((y - 1) & MASK) * DETAIL_SIZE + x]!) / 2;
    }
  return { gu, gv, tone };
}

let detail: Detail | null = null;

export const detailMap = (): Detail => (detail ??= build());
