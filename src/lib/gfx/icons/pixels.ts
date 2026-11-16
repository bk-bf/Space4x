export type Color = readonly [number, number, number];

export interface Ramp {
  o: Color;
  d: Color;
  m: Color;
  l: Color;
  h: Color;
}

type Paint = Color | ((x: number, y: number) => Color);

const INDIGO: Color = [24, 18, 58];
const WARM: Color = [255, 246, 220];
const NEAR_WHITE: Color = [255, 252, 238];
const OUTLINE: Color = [12, 9, 28];

export const mixc = (a: Color, b: Color, t: number): Color => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

const clamp8 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const rnd = (c: Color): Color => [clamp8(c[0]), clamp8(c[1]), clamp8(c[2])];
const scale = (c: Color, k: number): Color => [c[0] * k, c[1] * k, c[2] * k];

export function hsl(h: number, s: number, l: number): Color {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

export function ramp(base: Color): Ramp {
  return {
    o: rnd(mixc(scale(base, 0.22), [10, 8, 24], 0.55)),
    d: rnd(mixc(scale(base, 0.55), INDIGO, 0.3)),
    m: rnd(base),
    l: rnd(mixc(base, WARM, 0.32)),
    h: rnd(mixc(base, NEAR_WHITE, 0.72))
  };
}

export function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const FONT: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '110001010100111',
  '3': '110001010001110',
  '4': '101101111001001',
  '5': '111100110001110',
  '6': '011100111101111',
  '7': '111001010010010',
  '8': '111101111101111',
  '9': '111101111001110',
  '-': '000000111000000'
};

export class Pix {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  set(x: number, y: number, c: Color | undefined): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0];
    this.d[i + 1] = c[1];
    this.d[i + 2] = c[2];
    this.d[i + 3] = 255;
  }

  get(x: number, y: number): Color {
    const i = (y * this.w + x) * 4;
    return [this.d[i]!, this.d[i + 1]!, this.d[i + 2]!];
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3]! > 0;
  }

  rect(x: number, y: number, w: number, h: number, c: Color): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  box(x: number, y: number, w: number, h: number, R: Ramp): void {
    this.rect(x, y, w, h, R.m);
    this.rect(x, y, w, 1, R.l);
    this.rect(x, y, 1, h, R.l);
    this.rect(x + w - 1, y, 1, h, R.d);
    this.rect(x, y + h - 1, w, 1, R.d);
  }

  cylV(x: number, y: number, w: number, h: number, R: Ramp): void {
    for (let i = 0; i < w; i++) {
      const t = (i + 0.5) / w,
        c = t < 0.16 ? R.l : t < 0.32 ? R.h : t < 0.5 ? R.l : t < 0.72 ? R.m : R.d;
      this.rect(x + i, y, 1, h, c);
    }
  }

  cylH(x: number, y: number, w: number, h: number, R: Ramp): void {
    for (let j = 0; j < h; j++) {
      const t = (j + 0.5) / h,
        c = t < 0.16 ? R.l : t < 0.32 ? R.h : t < 0.5 ? R.l : t < 0.72 ? R.m : R.d;
      this.rect(x, y + j, w, 1, c);
    }
  }

  sphere(cx: number, cy: number, r: number, R: Ramp): void {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
        const dx = i + 0.5 - cx,
          dy = j + 0.5 - cy,
          d = Math.hypot(dx, dy);
        if (d > r) continue;
        const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)),
          L = (-dx * 0.45 - dy * 0.6) / r + nz * 0.6;
        this.set(i, j, L > 0.82 ? R.h : L > 0.5 ? R.l : L > 0.15 ? R.m : R.d);
      }
  }

  disc(cx: number, cy: number, r: number, c: Color): void {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
        if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= r) this.set(i, j, c);
  }

  ell(cx: number, cy: number, rx: number, ry: number, c: Color): void {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++)
        if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) this.set(i, j, c);
  }

  poly(pts: readonly (readonly [number, number])[], c: Paint): void {
    let y0 = Infinity,
      y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yy = y + 0.5,
        xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!,
          b = pts[(i + 1) % pts.length]!;
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy))
          xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]!); x < Math.round(xs[k + 1]!); x++)
          this.set(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }

  text(str: string, x: number, y: number, c: Color): void {
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch];
      if (g)
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') this.set(x + i, y + j, c);
      x += 4;
    }
  }

  outline(c: Color = OUTLINE): void {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.has(x, y)) continue;
        if (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1))
          add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }
}
