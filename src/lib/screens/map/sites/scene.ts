import type { FB } from '#lib/gfx/framebuffer.ts';
import { mix } from '#lib/gfx/math.ts';
import type { Livery } from '#lib/gfx/topdown/index.ts';
import { ease, type Point } from '../mapCamera';
import { small } from './craft';
import { Fx, rand, type Project } from './fx';

export interface SceneView {
  f: FB;
  W: Project;
  S: number;
  dt: number;
  frame: number;
  sun: number;
}

export interface SceneLabel {
  key: string;
  text: string;
  x: number;
  y: number;
  r: number;
  cls?: string;
}

export interface SiteScene {
  readonly fx: Fx;
  draw(v: SceneView, labels: SceneLabel[]): void;
}

export const inView = (f: FB, X: number, Y: number, m = 0): boolean =>
  X > -m && Y > -m && X < f.w + m && Y < f.h + m;

export function label(
  out: SceneLabel[],
  f: FB,
  key: string,
  text: string,
  X: number,
  Y: number,
  r: number,
  cls = 'fl'
): void {
  if (inView(f, X, Y)) out.push({ key, text, x: X, y: Y, r: Math.max(3, r), cls });
}

interface Shuttle {
  x: number;
  y: number;
  a: number;
  from: Point;
  to: Point;
  u: number;
  dur: number;
  wait: number;
  i: number;
}

export class Shuttles {
  readonly list: Shuttle[];

  constructor(n: number) {
    this.list = Array.from({ length: n }, (_, i) => {
      const x = rand(60, -60),
        y = rand(40, -40);
      return { x, y, a: 0, from: [x, y], to: [x, y], u: 1, dur: 1, wait: 0, i };
    });
  }

  draw(v: SceneView, stops: readonly Point[], livery: Livery = 'civ'): void {
    const { f, W, S, dt, sun, frame } = v;
    for (const s of this.list) {
      if (s.u >= 1) {
        s.from = s.to;
        s.to = stops[Math.floor(Math.random() * stops.length)]!;
        s.u = 0;
        s.dur = Math.max(3, Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) / 16);
        s.wait = rand(3, 0.5);
      }
      if (s.wait > 0) s.wait -= dt;
      else s.u += dt / s.dur;
      const e = ease(s.u),
        nx = mix(s.from[0], s.to[0], e),
        ny = mix(s.from[1], s.to[1], e) + Math.sin(e * Math.PI) * (s.i % 2 ? 10 : -10);
      if (Math.hypot(nx - s.x, ny - s.y) > 0.01) s.a = Math.atan2(ny - s.y, nx - s.x);
      s.x = nx;
      s.y = ny;
      const [X, Y] = W(s.x, s.y);
      if (!inView(f, X, Y, 20)) continue;
      small(f, 'shuttle', X, Y, s.a, S, sun, frame, {
        livery,
        thrust: S >= 2 && s.wait <= 0 && s.u < 1 ? 0.75 : 0
      });
    }
  }
}
