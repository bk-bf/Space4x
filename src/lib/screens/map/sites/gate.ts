import type { FB } from '#lib/gfx/framebuffer.ts';
import { dith, noise3 } from '#lib/gfx/noise.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { spec } from '#lib/gfx/ships/specs.ts';
import { Craft, prop } from './craft';
import { Fx, rand } from './fx';
import { label, type SceneLabel, type SceneView, type SiteScene } from './scene';

const SPEED = 26;
const GAP = 105;
const FIELD: readonly RGB[] = [[220, 250, 245], PAL.jump, [52, 128, 128], [30, 60, 80]];

export function drawGate(f: FB, X: number, Y: number, S: number, t: number, sun: number, glow = 0): void {
  const ry = 47 * S,
    rx = Math.max(1.5, 5 * S),
    D = f.d;
  if (X + 80 * S < 0 || X - 80 * S > f.w || Y + 80 * S < 0 || Y - 80 * S > f.h) return;
  const y0 = Math.max(0, Math.floor(Y - ry)),
    y1 = Math.min(f.h - 1, Math.ceil(Y + ry)),
    q = 0.12 / Math.max(0.4, S);
  for (let y = y0; y <= y1; y++) {
    const v = (y + 0.5 - Y) / ry,
      hw = rx * Math.sqrt(Math.max(0, 1 - v * v));
    for (let x = Math.max(0, Math.round(X - hw)); x <= Math.min(f.w - 1, Math.round(X + hw)); x++) {
      const n =
          noise3((x - X) * q * 2.2, (y - Y) * q * 0.6 - t * 0.8, t * 0.4) +
          glow * 0.5 +
          (dith(x, y) - 0.5) * 0.15 -
          (Math.abs(x - X) / (hw + 1)) * 0.12,
        c = FIELD[n > 0.8 ? 0 : n > 0.6 ? 1 : n > 0.45 ? 2 : 3]!,
        k = (y * f.w + x) * 4;
      D[k] = c[0];
      D[k + 1] = c[1];
      D[k + 2] = c[2];
    }
  }
  if (S >= 0.3) for (const s of [-1, 1]) prop(f, 'pylon', X, Y + s * 75 * S, (-s * Math.PI) / 2, S, sun);
}

interface Column {
  c: Craft;
  name: string;
  y: number;
  i: number;
  rip: number;
}

export class GateScene implements SiteScene {
  readonly fx = new Fx();
  private t = 0;
  private glow = 0;
  private readonly column: Column[] = (
    [
      ['bastion', 'Steadfast', -16],
      ['pike', 'Lynx', -30],
      ['lancer', 'Talon', -6],
      ['lancer', 'Ranger', -24]
    ] as const
  ).map(([id, name, y], i) => ({ c: new Craft(spec(id), 'navy', { thr: 0.7 }), name, y, i, rip: -1 }));
  private readonly inbound: Column = {
    c: new Craft(spec('atlas'), 'civ', { thr: 0.6 }),
    name: 'Vesta Star · inbound',
    y: 30,
    i: 0,
    rip: -1
  };

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, dt, sun, frame } = v;
    this.t += dt;
    this.fx.step(dt);
    const total = (this.column.length * GAP + 330) / SPEED + 3,
      t = this.t % total,
      [gx, gy] = W(0, 0),
      plane = Math.round(gx);
    this.glow = Math.max(0, this.glow - dt * 1.4);
    drawGate(f, gx, gy, S, this.t, sun, this.glow);
    const pass = (q: Column, x: number, a: number): void => {
      const c = q.c;
      c.x = x;
      c.y = q.y;
      c.a = a;
      const bow = x + (Math.cos(a) * c.len) / 2,
        stern = x - (Math.cos(a) * c.len) / 2;
      if (Math.min(bow, stern) > 0) return;
      if (Math.max(bow, stern) > 0) {
        this.glow = Math.max(this.glow, 0.9);
        if (Math.random() < dt * 10)
          this.fx.add('spark', 0, q.y + rand(c.half * 0.6, -c.half * 0.6), {
            vx: rand(-4, -22),
            vy: rand(10, -10),
            life: 0.5,
            col: [200, 250, 245]
          });
        if (q.rip < 0 || this.t - q.rip > 0.5) {
          q.rip = this.t;
          this.fx.add('ring', 0, q.y, { r: c.half + 8, life: 0.6, col: PAL.jump });
        }
      }
      const [X, Y] = W(x, q.y);
      c.draw(f, X, Y, S, sun, frame, { clipX: plane - 1 });
      if (X < plane - 30) label(out, f, q.name, q.name, X, Y, c.half * S);
    };
    for (const q of this.column) pass(q, -260 - q.i * GAP + t * SPEED, 0);
    {
      const ta = (this.t + total * 0.45) % total,
        x = this.inbound.c.len / 2 - ta * SPEED * 0.8;
      if (x > -420) pass(this.inbound, x, Math.PI);
    }
    this.fx.draw(f, W, S, frame);
    label(out, f, 'gate', 'Jump gate · to Alpha Centauri', gx, gy - 80 * S, 4);
  }
}
