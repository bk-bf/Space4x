import { clamp, mix } from '#lib/gfx/math.ts';

export type Point = readonly [number, number];
export type Target = string;
export type Aim = Target | Point;

export interface Located {
  x: number;
  y: number;
  radius?: number;
}

export type Locate = (target: Target) => Located | undefined;

export interface Frame {
  w: number;
  h: number;
  ox: number;
  oy: number;
}

export type Tier = 'far' | 'mid' | 'near';

export const WHEEL_STEP = 0.1;
export const L_MIN = -0.38;
export const EASE_RATE = 9;
export const FLY_SECONDS = 2.6;
export const HOP_SECONDS = 0.5;
export const FOCUS_FILL = 0.9;
export const FAR_L = 5;
export const NEAR_L = Math.log10(5 / 0.75);

const SETTLE = 0.0008;
const DRAG_START = 3;

export const ease = (v: number): number => {
  v = clamp(v, 0, 1);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};

const lerp2 = (a: Point, b: Point, t: number): Point => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

export const tierOf = (L: number): Tier => (L > FAR_L ? 'far' : L <= NEAR_L ? 'near' : 'mid');

export function wheelNotches(deltaY: number, deltaMode: number): number {
  const px = deltaY * (deltaMode === 1 ? 33 : deltaMode === 2 ? 300 : 1);
  return clamp(px / 100, -1.5, 1.5);
}

interface Fly {
  a: number;
  b: number;
  from: Point;
  to: Aim;
  u: number;
}

interface Hop {
  from: Point;
  to: Target;
  u: number;
}

interface Anchor {
  world: Point;
  px: number;
  py: number;
}

interface Drag {
  mx: number;
  my: number;
  centre: Point;
  s: number;
  moved: boolean;
}

export class MapCamera {
  L = 10;
  LT = 10;
  min = L_MIN;
  max = 11;
  free: Point = [0, 0];
  focus: Target | null = null;
  centre: Point = [0, 0];
  frame: Frame = { w: 400, h: 300, ox: 200, oy: 150 };
  private fly: Fly | null = null;
  private hop: Hop | null = null;
  private anchor: Anchor | null = null;
  private drag: Drag | null = null;

  get s(): number {
    return Math.pow(10, this.L);
  }

  get tier(): Tier {
    return tierOf(this.L);
  }

  get aim(): Target | null {
    return this.fly
      ? typeof this.fly.to === 'string'
        ? this.fly.to
        : null
      : this.hop
        ? this.hop.to
        : this.focus;
  }

  moving(): boolean {
    return !!this.fly || !!this.hop || this.L !== this.LT || !!this.drag?.moved;
  }

  place(L: number, aim: Aim): void {
    this.fly = this.hop = this.anchor = null;
    this.L = this.LT = clamp(L, this.min, this.max);
    this.aimAt(aim);
  }

  private aimAt(aim: Aim): void {
    if (typeof aim === 'string') this.focus = aim;
    else {
      this.focus = null;
      this.free = aim;
    }
  }

  private where(aim: Aim, locate: Locate): Point {
    if (typeof aim !== 'string') return aim;
    const p = locate(aim);
    return p ? [p.x, p.y] : this.centre;
  }

  private capFor(target: Target | null, locate: Locate): number {
    const r = target ? locate(target)?.radius : undefined;
    return r ? Math.log10(r / (this.frame.h * FOCUS_FILL)) : -Infinity;
  }

  step(dt: number, locate: Locate, frame: Frame = this.frame): void {
    this.frame = frame;
    if (!this.fly) {
      const lim = this.capFor(this.hop ? this.hop.to : this.focus, locate);
      if (this.LT < lim) this.LT = Math.min(lim, this.max);
    }
    if (this.fly) {
      const A = this.fly;
      A.u = Math.min(1, A.u + dt / FLY_SECONDS);
      const zin = A.b < A.a,
        eL = zin ? ease((A.u - 0.25) / 0.75) : ease(A.u / 0.75),
        eC = zin ? ease(A.u / 0.45) : ease((A.u - 0.55) / 0.45);
      this.L = this.LT = mix(A.a, A.b, eL);
      this.centre = lerp2(A.from, this.where(A.to, locate), eC);
      if (A.u >= 1) {
        this.fly = null;
        this.aimAt(A.to);
      }
      return;
    }
    this.L += (this.LT - this.L) * Math.min(1, dt * EASE_RATE);
    if (Math.abs(this.LT - this.L) < SETTLE) this.L = this.LT;
    if (this.hop) {
      const H = this.hop;
      H.u = Math.min(1, H.u + dt / HOP_SECONDS);
      this.centre = lerp2(H.from, this.where(H.to, locate), ease(H.u));
      if (H.u >= 1) {
        this.hop = null;
        this.focus = H.to;
      }
      return;
    }
    if (this.anchor && !this.focus) {
      const a = this.anchor,
        s = this.s;
      this.free = [a.world[0] - (a.px - frame.ox) * s, a.world[1] - (a.py - frame.oy) * s];
      if (this.L === this.LT) this.anchor = null;
    }
    if (this.focus) {
      const p = locate(this.focus);
      if (p) this.centre = [p.x, p.y];
      else {
        this.free = this.centre;
        this.focus = null;
      }
    }
    if (!this.focus) this.centre = this.free;
  }

  toWorld(mx: number, my: number): Point {
    const s = this.s,
      f = this.frame;
    return [this.centre[0] + (mx - f.ox) * s, this.centre[1] + (my - f.oy) * s];
  }

  toScreen(x: number, y: number): Point {
    const s = this.s,
      f = this.frame;
    return [f.ox + (x - this.centre[0]) / s, f.oy + (y - this.centre[1]) / s];
  }

  private endFly(): void {
    if (!this.fly) return;
    const to = this.fly.to;
    this.fly = null;
    this.LT = this.L;
    if (typeof to === 'string') this.hop = { from: this.centre, to, u: 0 };
    else this.free = this.centre;
  }

  zoom(notches: number, mx: number, my: number, hit: Target | null = null): void {
    this.endFly();
    const zin = notches < 0;
    this.LT = clamp(this.LT + notches * WHEEL_STEP, this.min, this.max);
    if (zin && hit && hit !== this.focus) {
      if (!this.hop || this.hop.to !== hit) this.hop = { from: this.centre, to: hit, u: 0 };
      this.anchor = null;
      return;
    }
    this.anchor = !this.focus && !this.hop ? { world: this.toWorld(mx, my), px: mx, py: my } : null;
  }

  zoomCentre(notches: number): void {
    this.zoom(notches, this.frame.ox, this.frame.oy);
  }

  down(mx: number, my: number): void {
    this.drag = { mx, my, centre: this.centre, s: this.s, moved: false };
  }

  move(mx: number, my: number): boolean {
    const d = this.drag;
    if (!d) return false;
    if (!d.moved && Math.hypot(mx - d.mx, my - d.my) < DRAG_START) return false;
    if (!d.moved) this.endFly();
    d.moved = true;
    this.hop = this.anchor = null;
    this.focus = null;
    this.free = this.centre = [d.centre[0] - (mx - d.mx) * d.s, d.centre[1] - (my - d.my) * d.s];
    return true;
  }

  up(): boolean {
    const d = this.drag;
    this.drag = null;
    return !!d && !d.moved;
  }

  hopTo(target: Target): void {
    this.endFly();
    this.anchor = null;
    if (target !== this.focus) this.hop = { from: this.centre, to: target, u: 0 };
  }

  flyTo(L: number, aim: Aim): void {
    this.endFly();
    this.hop = this.anchor = null;
    this.fly = { a: this.L, b: clamp(L, this.min, this.max), from: this.centre, to: aim, u: 0 };
  }
}
