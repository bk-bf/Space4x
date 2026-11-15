import type { FB } from '#lib/gfx/framebuffer.ts';
import { hash } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import type { Point } from '../mapCamera';

export const TAU = Math.PI * 2;
export const FIRE: readonly [RGB, RGB, RGB] = [
  [255, 244, 200],
  [255, 190, 90],
  [230, 110, 60]
];
const EMBER: RGB = [150, 62, 60];
const SMOKE: readonly RGB[] = [
  [96, 90, 112],
  [62, 58, 84],
  [50, 44, 62],
  [34, 30, 48],
  [240, 150, 80]
];
const DEBRIS: readonly [RGB, RGB] = [
  [96, 100, 126],
  [58, 60, 84]
];
const LIMIT = 900;

export const rand = (a = 1, b = 0): number => b + Math.random() * (a - b);

export const wrap = (a: number): number => {
  a = (a + Math.PI) % TAU;
  return (a < 0 ? a + TAU : a) - Math.PI;
};

export type Project = (x: number, y: number) => Point;

export type FxKind = 'spark' | 'debris' | 'smoke' | 'flash' | 'ring' | 'jump';

export interface Particle {
  kind: FxKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  r: number;
  drag?: number;
  col?: RGB;
  dark?: boolean;
}

export type FxOptions = Partial<Omit<Particle, 'kind' | 'x' | 'y' | 't'>>;

export class Fx {
  readonly list: Particle[] = [];

  add(kind: FxKind, x: number, y: number, o: FxOptions = {}): void {
    if (this.list.length < LIMIT) this.list.push({ kind, x, y, vx: 0, vy: 0, t: 0, life: 1, r: 1, ...o });
  }

  clear(): void {
    this.list.length = 0;
  }

  step(dt: number): void {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i]!;
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag) {
        p.vx *= 1 - p.drag * dt;
        p.vy *= 1 - p.drag * dt;
      }
      if (p.t >= p.life) l.splice(i, 1);
    }
  }

  burst(x: number, y: number, n: number, sp: number, o: FxOptions = {}): void {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU),
        v = rand(sp, sp * 0.2);
      this.add('spark', x, y, {
        life: rand(0.9, 0.3),
        drag: 1.5,
        ...o,
        vx: Math.cos(a) * v + (o.vx ?? 0),
        vy: Math.sin(a) * v + (o.vy ?? 0)
      });
    }
  }

  explode(x: number, y: number, r: number, o: { vx?: number; vy?: number } = {}): void {
    const vx = o.vx ?? 0,
      vy = o.vy ?? 0;
    this.add('flash', x, y, { r, life: 0.35 + r * 0.02 });
    this.burst(x, y, Math.round(6 + r * 2.5), 14 + r * 3, o);
    for (let i = 0; i < 2 + r * 0.6; i++)
      this.add('smoke', x + rand(r, -r) * 0.4, y + rand(r, -r) * 0.4, {
        r: r * rand(0.9, 0.4),
        life: rand(2.6, 1.2),
        vx: rand(2, -2) + vx,
        vy: rand(2, -2) + vy
      });
    if (r <= 5) return;
    this.add('ring', x, y, { r: r * 3.5, life: 0.7 });
    for (let i = 0; i < r; i++) {
      const a = rand(TAU),
        v = rand(16, 3);
      this.add('debris', x, y, {
        vx: Math.cos(a) * v + vx,
        vy: Math.sin(a) * v + vy,
        life: rand(9, 4),
        r: rand(1, 0.3)
      });
    }
  }

  draw(f: FB, W: Project, S: number, frame: number): void {
    for (const p of this.list) {
      const [x, y] = W(p.x, p.y),
        u = p.t / p.life;
      if (x < -60 || y < -60 || x > f.w + 60 || y > f.h + 60) continue;
      if (p.kind === 'spark') spark(f, p, x, y, u, S);
      else if (p.kind === 'debris') debris(f, p, x, y, S);
      else if (p.kind === 'smoke') smoke(f, p, x, y, u, S);
      else if (p.kind === 'flash') flash(f, p, x, y, u, S);
      else ring(f, p, x, y, u, S, frame);
    }
  }
}

function spark(f: FB, p: Particle, x: number, y: number, u: number, S: number): void {
  const c = p.col
    ? u < 0.5
      ? p.col
      : ([p.col[0] * 0.5, p.col[1] * 0.5, p.col[2] * 0.6] as RGB)
    : u < 0.25
      ? FIRE[0]
      : u < 0.55
        ? FIRE[1]
        : u < 0.8
          ? FIRE[2]
          : EMBER;
  f.px(x, y, c);
  if (S >= 6 && u < 0.5) f.px(x + 1, y, c);
}

function debris(f: FB, p: Particle, x: number, y: number, S: number): void {
  const c = DEBRIS[Math.floor(p.t * 6 + p.r * 9) & 1]!,
    n = Math.max(1, Math.round(p.r * S * 0.5));
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) f.px(x + a, y + b, c);
}

function smoke(f: FB, p: Particle, x: number, y: number, u: number, S: number): void {
  const R = Math.max(1, p.r * S * (0.5 + u * 0.9)),
    al = (1 - u) * 0.85,
    hot = u < 0.15 && !p.dark,
    c1 = hot ? SMOKE[4]! : p.dark ? SMOKE[2]! : SMOKE[0]!,
    c2 = hot ? SMOKE[4]! : p.dark ? SMOKE[3]! : SMOKE[1]!,
    X0 = Math.round(x),
    Y0 = Math.round(y),
    RR = Math.ceil(R),
    R2 = R * R;
  for (let j = -RR; j <= RR; j++)
    for (let i = -RR; i <= RR; i++) {
      const d = (i * i + j * j) / R2;
      if (d > 1) continue;
      if (dith(X0 + i, Y0 + j) < al * (1 - d * 0.8)) f.px(X0 + i, Y0 + j, d < 0.25 === u < 0.5 ? c1 : c2);
    }
}

function flash(f: FB, p: Particle, x: number, y: number, u: number, S: number): void {
  const R = Math.max(1, p.r * S * (0.4 + u * 0.8)),
    RR = Math.ceil(R);
  for (let j = -RR; j <= R; j++)
    for (let i = -RR; i <= R; i++) {
      const d = Math.hypot(i, j) / R;
      if (d > 1) continue;
      const X = Math.round(x + i),
        Y = Math.round(y + j),
        q = d + u * 0.9 + (dith(X, Y) - 0.5) * 0.3;
      if (q < 1.25) f.px(X, Y, q < 0.45 ? [255, 252, 236] : q < 0.75 ? FIRE[0] : q < 1 ? FIRE[1] : FIRE[2]);
    }
}

function ring(f: FB, p: Particle, x: number, y: number, u: number, S: number, frame: number): void {
  const jump = p.kind === 'jump',
    R = p.r * S * (jump ? 1 - u : u),
    n = Math.max(12, Math.round(R * 6.3)),
    col = p.col ?? (jump ? PAL.jump : ([255, 230, 190] as RGB));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      X = Math.round(x + Math.cos(a) * R),
      Y = Math.round(y + Math.sin(a) * R);
    if (dith(X, Y) < 1 - u * 0.9) {
      f.px(X, Y, col);
      if (S >= 3 && u < 0.5) f.px(X + 1, Y, col);
    }
  }
  if (jump)
    for (let i = 0; i < 40; i++) {
      const a = hash(i, 3, 1) * TAU,
        rr = R * hash(i, 4, frame >> 1);
      f.px(x + Math.cos(a) * rr, y + Math.sin(a) * rr, [220, 250, 245]);
    }
}

export function thick(
  f: FB,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wd: number,
  c0: RGB,
  c1: RGB
): void {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)),
    dx = (x1 - x0) / (n || 1),
    dy = (y1 - y0) / (n || 1),
    lo = -Math.floor((wd - 1) / 2),
    hi = Math.ceil((wd - 1) / 2),
    ax = Math.abs(dx) > Math.abs(dy);
  for (let i = 0; i <= n; i++) {
    const x = x0 + dx * i,
      y = y0 + dy * i;
    if (x < -4 || y < -4 || x > f.w + 4 || y > f.h + 4) continue;
    for (let a = lo; a <= hi; a++) {
      const core = wd < 3 ? a === 0 : a > lo && a < hi;
      if (ax) f.px(x, y + a, core ? c0 : c1);
      else f.px(x + a, y, core ? c0 : c1);
    }
  }
}

export function disc(
  f: FB,
  X: number,
  Y: number,
  R: number,
  inner: number,
  c0: RGB,
  c1: RGB,
  density = 0.8
): void {
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++)
      if (i * i + j * j <= R * R && dith(Math.round(X + i), Math.round(Y + j)) < density)
        f.px(X + i, Y + j, i * i + j * j < R * R * inner ? c0 : c1);
}
