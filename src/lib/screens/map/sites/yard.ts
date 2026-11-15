import { spec } from '#lib/gfx/ships/specs.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { drawStation, METRES_PER_UNIT } from '#lib/gfx/topdown/index.ts';
import { Craft, small } from './craft';
import { Fx, rand } from './fx';
import { inView, label, Shuttles, type SceneLabel, type SceneView, type SiteScene } from './scene';

const CYCLE = 46;
const BUILD_DAYS = 118;
const RAIL: readonly [number, number, number][] = [
  [96, 100, 126],
  [58, 60, 84],
  [74, 76, 98]
];

export class YardScene implements SiteScene {
  readonly fx = new Fx();
  private t = 0;
  private readonly atlas = new Craft(spec('atlas'), 'civ');
  private readonly build = new Craft(spec('pike'), 'navy');
  private readonly mule = new Craft(spec('mule'), 'civ', { thr: 0.5 });
  private readonly path = new Craft(spec('pathfinder'), 'navy', { thr: 0.9 });
  private readonly shuttles = new Shuttles(7);
  private readonly bx: number;

  constructor() {
    this.atlas.x = -46 - this.atlas.len / 2 + 1;
    this.bx = 47 + this.build.len / 2;
  }

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, dt, sun, frame } = v,
      fx = this.fx;
    this.t += dt;
    fx.step(dt);
    const t = this.t,
      cyc = t % CYCLE,
      prog = cyc < 34 ? 0.22 + (cyc / 34) * 0.78 : 1,
      leave = cyc > 37 ? cyc - 37 : 0,
      [sx, sy] = W(0, 0),
      ppm = S / METRES_PER_UNIT,
      b = this.build;
    this.rails(v);
    drawStation(f, 'core', { x: sx, y: sy, angle: 0, pxPerMetre: ppm, sun, frame });
    {
      const [X, Y] = W(this.atlas.x, this.atlas.y);
      this.atlas.draw(f, X, Y, S, sun, frame);
      label(out, f, 'atlas', 'Ceres Star · unloading', X, Y, this.atlas.half * S);
    }
    drawStation(f, 'ring', { x: sx, y: sy, angle: t * 0.07, pxPerMetre: ppm, sun, frame });
    b.x = this.bx + leave * leave * 1.6;
    b.thr = leave ? Math.min(1, leave * 0.4) : 0;
    {
      const [X, Y] = W(b.x, 0);
      b.draw(f, X, Y, S, sun, frame, prog < 1 ? { build: prog } : {});
      if (prog < 1 && Math.random() < 0.5)
        fx.add('spark', this.bx - b.len / 2 + prog * b.len, rand(4, -4), {
          vx: rand(8, -8),
          vy: rand(8, -8),
          life: 0.4,
          col: [200, 240, 255]
        });
      const [lx, ly] = W(this.bx, -14);
      label(
        out,
        f,
        'slip',
        prog < 1
          ? `Slipway 1 · Pike · ${Math.round(prog * 100)}% · ${Math.round((1 - prog) * BUILD_DAYS)} days`
          : leave
            ? 'Tern · launched'
            : 'Slipway 1 · Pike · fitting out',
        lx,
        ly,
        4,
        'gold'
      );
    }
    {
      const m = this.mule,
        a = t * 0.045 + 2.2;
      m.x = Math.cos(a) * 150;
      m.y = Math.sin(a) * 86 + 6;
      m.a = a + Math.PI / 2 + 0.12;
      const [X, Y] = W(m.x, m.y);
      m.draw(f, X, Y, S, sun, frame);
      label(out, f, 'mule', 'Juno Star · tanker', X, Y, m.half * S);
    }
    {
      const p = this.path,
        u = (t % 60) / 60;
      p.x = -260 + u * 620;
      p.y = -78 + Math.sin(u * 3) * 14;
      p.a = Math.atan2((Math.cos(u * 3) * 14 * 3) / 620, 1);
      const [X, Y] = W(p.x, p.y);
      p.draw(f, X, Y, S, sun, frame);
      label(out, f, 'path', 'Halley · outbound', X, Y, p.half * S);
    }
    this.shuttles.draw(v, [
      [-46, 4],
      [46, -4],
      [0, 34],
      [0, -34],
      [this.atlas.x, 12],
      [this.atlas.x + 14, -12],
      [this.bx, 14],
      [-150, 120],
      [-110, 150],
      [this.mule.x, this.mule.y]
    ]);
    for (const i of [0, 1, 2]) {
      const a = t * 0.22 + 1,
        x = Math.cos(a) * 96 - Math.cos(a + 1.57) * i * 6,
        y = Math.sin(a) * 60 - 4 + (i - 1) * 7,
        h = a + Math.PI / 2,
        [X, Y] = W(x, y);
      if (inView(f, X, Y, 20)) small(f, 'fighter', X, Y, h, S, sun, frame, { livery: 'navy', thrust: 1 });
    }
    fx.draw(f, W, S, frame);
  }

  private rails(v: SceneView): void {
    const { f, W, S, frame } = v,
      len = this.build.len;
    for (const s of [-1, 1]) {
      const [gx, gy] = W(46, s * 9.5),
        [gx2] = W(46 + len + 4, 0);
      for (let x = Math.max(0, Math.round(gx)); x < Math.min(f.w, gx2); x++)
        for (let j = 0; j < Math.max(2, S); j++)
          f.px(x, gy + j * s, (Math.floor((x - gx) / S) + j) % 4 === 0 ? RAIL[0]! : RAIL[1]!);
      for (let q = 0; q < 5; q++) {
        const [px] = W(50 + q * (len / 4.4), 0);
        for (let j = 0; j < 3 * S; j++) f.px(px, gy - s * j, RAIL[2]!);
        f.px(px, gy - s * 3 * S, (frame >> 4) % 5 === q ? PAL.sel : [150, 62, 60]);
      }
    }
  }
}
