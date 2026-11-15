import { clamp, mix } from '#lib/gfx/math.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { spec, type ShipSpec } from '#lib/gfx/ships/specs.ts';
import { ease } from '../mapCamera';
import { clipLine } from '../markers';
import { Craft } from './craft';
import { Fx } from './fx';
import { label, Shuttles, type SceneLabel, type SceneView, type SiteScene } from './scene';

export const HARVESTER: ShipSpec = {
  id: 'harvester',
  name: 'Harvester',
  role: 'Gas harvester',
  code: 'HV-02',
  livery: 'civ',
  aft: 'dock',
  bow: 'dock',
  parts: [
    ['truss', 'solar', 'solar'],
    ['tank'],
    ['tank'],
    ['reactor', 'radiator', 'radiator'],
    ['truss', 'antenna'],
    ['crew', 'tower']
  ]
};

const CYCLE = 34;
const HOSE: RGB = [134, 126, 146];
const GAS: readonly RGB[] = [
  [226, 198, 158],
  [255, 236, 190],
  [196, 160, 118]
];
const BOOM: readonly RGB[] = [
  [58, 60, 84],
  [96, 100, 126]
];

export class HarvesterScene implements SiteScene {
  readonly fx = new Fx();
  private t = 0;
  private readonly h = new Craft(HARVESTER, 'civ');
  private readonly m = new Craft(spec('mule'), 'civ');
  private readonly drones = new Shuttles(3);

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, dt, sun, frame } = v,
      h = this.h,
      m = this.m;
    this.t += dt;
    this.fx.step(dt);
    const t = this.t,
      cyc = t % CYCLE,
      dockX = h.len / 2 + m.len / 2 + 5,
      [sx0, sy0] = W(-h.len * 0.2, 3),
      [sx1, sy1] = W(-h.len * 0.2 - 190, 250);
    for (const o of [-1, 1]) clipLine(f, sx0 + o * S, sy0, sx1 + o * S * 3, sy1, HOSE, 2, 0);
    for (let i = 0; i < 26; i++) {
      const u = 1 - ((t * 0.12 + i / 26) % 1),
        x = mix(sx0, sx1, u) + Math.sin(i * 7 + t) * S,
        y = mix(sy0, sy1, u);
      f.px(x, y, i % 3 ? GAS[0]! : GAS[1]!);
      if (S >= 2) f.px(x + 1, y, GAS[2]!);
    }
    {
      const [X, Y] = W(0, 0);
      h.draw(f, X, Y, S, sun, frame);
      label(out, f, 'harv', 'Deep Well 2 · scooping', X, Y, h.half * S);
    }
    let st = 'approaching';
    if (cyc < 10) {
      const u = 1 - Math.pow(1 - cyc / 10, 3);
      m.x = mix(dockX + 330, dockX, u);
      m.y = mix(-40, 0, u);
      m.a = Math.PI + (1 - u) * 0.12;
      m.thr = (1 - u) * 0.8;
    } else if (cyc < 24) {
      m.x = dockX;
      m.y = 0;
      m.a = Math.PI;
      m.thr = 0;
      st = 'pumping';
    } else {
      const u = (cyc - 24) / 10,
        d = Math.pow(Math.max(0, u - 0.25), 2) * 520;
      m.a = Math.PI + ease(u * 2.4) * 2.3;
      m.thr = clamp(u * 3 - 0.6, 0, 1);
      m.x = dockX + u * 14 + Math.cos(Math.PI + 2.3) * d;
      m.y = Math.sin(Math.PI + 2.3) * d;
      st = 'departing';
    }
    {
      const [X, Y] = W(m.x, m.y);
      m.draw(f, X, Y, S, sun, frame);
      label(out, f, 'mule', `Juno Star · ${st}`, X, Y, m.half * S);
    }
    if (cyc >= 10 && cyc < 24) {
      const [x0, y0] = W(h.len / 2, 0),
        [x1, y1] = W(dockX - m.len / 2, 0);
      for (let j = -1; j <= 1; j++) f.line(x0, y0 + j, x1, y1 + j, BOOM[j ? 0 : 1]!);
      for (let q = 0; q < 5; q++) f.px(mix(x0, x1, (t * 1.2 + q / 5) % 1), y0, PAL.sel);
    }
    this.drones.draw(v, [
      [0, 10],
      [h.len * 0.3, -10],
      [-h.len * 0.3, 12],
      [m.x, m.y + 12],
      [120, -80],
      [-140, 60]
    ]);
    this.fx.draw(f, W, S, frame);
  }
}
