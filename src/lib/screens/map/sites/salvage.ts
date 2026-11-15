import { PAL } from '#lib/gfx/palette.ts';
import { ALIEN_SPECS, spec } from '#lib/gfx/ships/specs.ts';
import { ease } from '../mapCamera';
import { clipLine } from '../markers';
import { Craft, prop } from './craft';
import { Fx, rand, TAU } from './fx';
import { label, Shuttles, type SceneLabel, type SceneView, type SiteScene } from './scene';

interface Piece {
  x: number;
  y: number;
  a: number;
}

const local = (p: Piece, xu: number, yu: number): [number, number] => {
  const c = Math.cos(p.a),
    n = Math.sin(p.a);
  return [p.x + c * xu - n * yu, p.y + n * xu + c * yu];
};

export class SalvageScene implements SiteScene {
  readonly fx = new Fx();
  private t = 0;
  private readonly wreck = new Craft(ALIEN_SPECS.x1!, 'foe', { dead: true });
  private readonly ship = new Craft(spec('atlas'), 'civ', { x: -92, y: 26, a: -0.12 });
  private readonly drones = new Shuttles(5);

  constructor() {
    const w = this.wreck;
    for (let i = 0; i < 9; i++) {
      const p = w.hull(rand(w.len * 0.46, -w.len * 0.46), rand(7, -7));
      w.hit(p[0], p[1], rand(4.5, 2), rand(255, 170));
    }
    for (const y of [-6, -2, 2, 6]) w.hit(4, y, 3.4, 255);
    for (let i = 0; i < 70; i++) {
      const a = rand(TAU),
        r = rand(70, 6);
      this.fx.add('debris', 34 + Math.cos(a) * r, -6 + Math.sin(a) * r * 0.7, {
        vx: rand(0.5, -0.5),
        vy: rand(0.5, -0.5),
        life: 1e6,
        r: rand(1.3, 0.3)
      });
    }
  }

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, dt, sun, frame } = v,
      w = this.wreck,
      sh = this.ship;
    this.t += dt;
    this.fx.step(dt);
    const t = this.t % 120,
      A: Piece = { x: 20 - t * 0.1, y: -14 - t * 0.04, a: 0.5 + t * 0.006 },
      B: Piece = { x: 24 + t * 0.12, y: -8 + t * 0.07, a: 0.74 - t * 0.009 };
    for (const [p, keep] of [
      [A, 1],
      [B, -1]
    ] as const) {
      w.a = p.a;
      const [X, Y] = W(p.x, p.y);
      w.draw(f, X, Y, S, sun, frame, { cutAt: [4, keep] });
    }
    {
      const [X, Y] = W(sh.x, sh.y);
      sh.draw(f, X, Y, S, sun, frame);
      label(out, f, 'tender', 'Ceres Star · salvage tender', X, Y, sh.half * S);
    }
    const pa = local(A, -18, 3),
      pb = local(B, 22, -2),
      bow = sh.world(sh.len / 2 + 2, 0);
    this.drones.draw(v, [pa, pb, local(A, -6, -4), local(B, 10, 4), sh.world(10, -8), sh.world(-4, 9)]);
    for (const d of this.drones.list)
      if (d.wait > 0 && Math.hypot(d.x - sh.x, d.y - sh.y) > 40 && Math.random() < dt * 14)
        this.fx.add('spark', d.x + rand(2, -2), d.y + rand(2, -2), {
          vx: rand(9, -9),
          vy: rand(9, -9),
          life: 0.35,
          col: [200, 240, 255]
        });
    const cyc = this.t % 16,
      u = ease(cyc / 12),
      cr: [number, number] = [pa[0] + (bow[0] - pa[0]) * u, pa[1] + (bow[1] - pa[1]) * u];
    if (cyc < 12.4) {
      const [x0, y0] = W(bow[0], bow[1]),
        [x1, y1] = W(cr[0], cr[1]);
      for (const o of [-1, 0, 1])
        clipLine(
          f,
          x0,
          y0 + o * Math.max(1, S * 0.6),
          x1,
          y1 + o * Math.max(1, S * 0.3),
          o ? [52, 128, 128] : PAL.jump,
          3,
          frame >> 1
        );
      prop(f, 'crate', x1, y1, this.t * 0.4, S, sun);
      label(out, f, 'core', 'Drive core · unknown design', x1, y1, 3 + S * 2, 'gold');
    }
    this.fx.draw(f, W, S, frame);
    const [X, Y] = W(B.x, B.y);
    label(out, f, 'wreck', 'Wreck · unknown cruiser', X, Y, 10 * S, 'dim');
  }
}
