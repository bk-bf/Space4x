import type { FB } from '#lib/gfx/framebuffer.ts';
import { clamp, hash, mix } from '#lib/gfx/math.ts';
import { dith, fbm, noise3 } from '#lib/gfx/noise.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { LIVERIES } from '#lib/gfx/topdown/palette.ts';
import { DEFAULT_LIGHT, drawSprite, dropShadow } from '#lib/gfx/topdown/render.ts';
import { turretSprite } from '#lib/gfx/topdown/sprites.ts';
import { ease } from '#lib/screens/map/mapCamera.ts';
import { prop } from '#lib/screens/map/sites/craft.ts';
import { FIRE, Fx, rand, thick, wrap } from '#lib/screens/map/sites/fx.ts';
import { menOf, type Unit, type UnitKind } from './model.ts';

export const FIELD_W = 1040;
export const FIELD_H = 600;
const VIEW_X0 = -385;
const VIEW_X1 = 330;
const VIEW_Y0 = -195;
const VIEW_Y1 = 195;
const CYCLE = 75;
const GLOD = [1, 2] as const;
const TANK_LODS = [1.5, 3] as const;
const SUN = Math.atan2(DEFAULT_LIGHT[1], DEFAULT_LIGHT[0]);
const LD = DEFAULT_LIGHT;
const OURS: readonly [RGB, RGB, RGB, RGB] = [
  [220, 240, 250],
  [90, 130, 190],
  [60, 90, 150],
  [150, 180, 220]
];
const THEIRS: readonly [RGB, RGB, RGB, RGB] = [
  [255, 190, 170],
  [200, 60, 60],
  [150, 44, 50],
  [200, 60, 60]
];
const SHADOW: RGB = [40, 34, 30];
const FALLEN: RGB = [70, 30, 30];
const PLAIN: readonly RGB[] = [
  [70, 62, 50],
  [98, 86, 62],
  [126, 110, 76],
  [152, 134, 92],
  [176, 158, 112],
  [200, 184, 138]
];
const GREEN: readonly RGB[] = [
  [52, 60, 44],
  [70, 80, 54],
  [90, 100, 64],
  [112, 120, 76],
  [134, 140, 92],
  [156, 160, 110]
];
const OFF_FIELD: RGB = [14, 12, 20];

let texture: Uint8ClampedArray | null = null;

export function groundTexture(): Uint8ClampedArray {
  if (texture) return texture;
  const W = FIELD_W,
    H = FIELD_H,
    hgt = new Float32Array(W * H),
    tex = new Uint8ClampedArray(W * H * 3),
    Q = 4,
    gw = (W >> 2) + 2,
    gh = (H >> 2) + 2,
    base = new Float32Array(gw * gh),
    vg = new Float32Array(gw * gh),
    dr = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const X = x * Q,
        Y = y * Q,
        k = y * gw + x;
      base[k] = fbm(X * 0.0045 + 3, Y * 0.0045, 2.2, 5) * 70;
      vg[k] = fbm(X * 0.012 + 40, Y * 0.012, 5.5, 4);
      dr[k] = Math.abs(fbm(X * 0.006 + 9, Y * 0.006, 1.3, 4) - 0.5);
    }
  const smp = (g: Float32Array, x: number, y: number) => {
    const fx = x / Q,
      fy = y / Q,
      ix = fx | 0,
      iy = fy | 0,
      tx = fx - ix,
      ty = fy - iy,
      k = iy * gw + ix;
    return mix(mix(g[k]!, g[k + 1]!, tx), mix(g[k + gw]!, g[k + gw + 1]!, tx), ty);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      hgt[y * W + x] =
        smp(base, x, y) + noise3(x * 0.03, y * 0.03, 7.1) * 5 + noise3(x * 0.09, y * 0.09, 3.3) * 2.2;
  for (let i = 0; i < 16; i++) {
    const cx = hash(i, 1, 61) * W,
      cy = hash(i, 2, 61) * H,
      r = 8 + hash(i, 3, 61) * 30;
    for (let y = Math.max(0, Math.floor(cy - r * 1.3)); y < Math.min(H, cy + r * 1.3); y++)
      for (let x = Math.max(0, Math.floor(cx - r * 1.3)); x < Math.min(W, cx + r * 1.3); x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d < 1.3)
          hgt[y * W + x] =
            hgt[y * W + x]! +
            (d < 1
              ? -r * 0.35 * (1 - d * d) + (d > 0.8 ? (d - 0.8) * r * 0.5 : 0)
              : ((1.3 - d) / 0.3) * r * 0.1);
      }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x,
        dx = (hgt[k + (x < W - 1 ? 1 : 0)]! - hgt[k - (x > 0 ? 1 : 0)]!) * 0.5,
        dy = (hgt[k + (y < H - 1 ? W : 0)]! - hgt[k - (y > 0 ? W : 0)]!) * 0.5,
        l = Math.hypot(dx, dy, 1.1),
        L = (-dx * LD[0] - dy * LD[1] + 1.1 * LD[2]) / l,
        dv = dith(x, y),
        veg = smp(vg, x, y) + (dv - 0.5) * 0.03,
        dry = smp(dr, x, y) < 0.012,
        lv = clamp(Math.floor(2.6 + (L - LD[2]) * 5 + (hgt[k]! - 35) * 0.012 + (dv - 0.5) * 0.9), 0, 5),
        c = dry ? PLAIN[Math.max(0, lv - 2)]! : (veg > 0.56 ? GREEN : PLAIN)[lv]!;
      tex[k * 3] = c[0];
      tex[k * 3 + 1] = c[1];
      tex[k * 3 + 2] = c[2];
    }
  return (texture = tex);
}

export type Project = (x: number, y: number) => [number, number];

export interface View {
  S: number;
  cx: number;
  cy: number;
  W: Project;
}

export function fitView(f: FB, x0 = VIEW_X0, x1 = VIEW_X1, y0 = VIEW_Y0, y1 = VIEW_Y1): View {
  const S = Math.min(f.w / (x1 - x0), f.h / (y1 - y0)),
    cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  return { S, cx, cy, W: (x, y) => [f.w / 2 + (x - cx) * S, f.h / 2 + (y - cy) * S] };
}

export function paintGround(f: FB, v: View): void {
  const tex = groundTexture(),
    D = f.d,
    iS = 1 / v.S,
    wx0 = v.cx - f.w * 0.5 * iS + FIELD_W / 2,
    wy0 = v.cy - f.h * 0.5 * iS + FIELD_H / 2;
  for (let y = 0; y < f.h; y++) {
    const ty = Math.floor(wy0 + y * iS);
    for (let x = 0; x < f.w; x++) {
      const tx = Math.floor(wx0 + x * iS),
        k = (y * f.w + x) * 4;
      if (tx < 0 || ty < 0 || tx >= FIELD_W || ty >= FIELD_H) {
        D[k] = OFF_FIELD[0];
        D[k + 1] = OFF_FIELD[1];
        D[k + 2] = OFF_FIELD[2];
        continue;
      }
      const q = (ty * FIELD_W + tx) * 3;
      D[k] = tex[q]!;
      D[k + 1] = tex[q + 1]!;
      D[k + 2] = tex[q + 2]!;
    }
  }
}

export function soldier(f: FB, X: number, Y: number, foe: boolean, S: number): void {
  const c = foe ? THEIRS : OURS;
  f.px(X + 1, Y + 1, SHADOW);
  f.px(X, Y - 1, c[0]);
  f.px(X, Y, c[1]);
  if (S >= 1.6) {
    f.px(X + 1, Y, c[2]);
    f.px(X + 1, Y - 1, c[3]);
  }
}

export function tankSprite(f: FB, X: number, Y: number, a: number, S: number, dead = false): void {
  prop(f, 'tank', X, Y, a, S * 1.4, SUN, { livery: 'navy', dead, lods: TANK_LODS });
}

export function gunSprite(f: FB, X: number, Y: number, a: number, S: number, foe = false): void {
  const lod = S <= 1.15 ? 1.5 : 3;
  drawSprite(f, turretSprite('beam', lod), X, Y, a, LIVERIES[foe ? 'foe' : 'navy'], { k: (S * 1.3) / lod });
}

export function aaSprite(f: FB, X: number, Y: number, a: number, S: number): void {
  const lod = S <= 1.15 ? 1.5 : 3;
  drawSprite(f, turretSprite('pd', lod), X, Y, a, LIVERIES.navy, { k: (S * 1.6) / lod });
}

export function commander(f: FB, X: number, Y: number, S: number): void {
  const hh = Math.round(7 * Math.max(1, S * 0.7));
  for (let j = 0; j < hh; j++) f.px(X, Y - j, [230, 230, 240]);
  for (let j = 0; j < 3; j++) for (let i = 1; i < 5; i++) f.px(X + i, Y - hh + 1 + j, PAL.sel);
  f.px(X, Y + 1, PAL.sel);
  f.px(X + 1, Y + 1, SHADOW);
}

interface Man {
  ox: number;
  oy: number;
  alive: boolean;
}

interface Regiment {
  unit?: Unit;
  x: number;
  y: number;
  lag: number;
  team: 0 | 1;
  men: Man[];
}

interface Tank {
  unit: Unit;
  x: number;
  y: number;
  a: number;
  cd: number;
  alive: boolean;
  i: number;
}

interface Bunker {
  x: number;
  y: number;
  a: number;
  cd: number;
  hp: number;
}

interface Gun {
  unit: Unit;
  x: number;
  y: number;
  a: number;
  cd: number;
}

interface Post {
  unit: Unit;
  x: number;
  y: number;
}

interface Scorch {
  x: number;
  y: number;
  r: number;
}

interface Shot {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  foe?: boolean;
  shell?: boolean;
}

interface Beam {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  lance?: boolean;
}

export interface Placed {
  unit: Unit;
  x: number;
  y: number;
  w: number;
  h: number;
}

const block = (n: number): Man[] =>
  Array.from({ length: n }, (_, i) => ({
    ox: (i % 9) * 5 - 20 + rand(1.5, -1.5),
    oy: Math.floor(i / 9) * 5 - 12 + rand(1.5, -1.5),
    alive: true
  }));

const of = (units: readonly Unit[], kind: UnitKind) => units.filter((u) => u.kind === kind);

export class Invasion {
  readonly fx = new Fx();
  private t = 0;
  private regs: Regiment[] = [];
  private tanks: Tank[] = [];
  private bunkers: Bunker[] = [];
  private guns: Gun[] = [];
  private aa: Post[] = [];
  private hq: Post | null = null;
  private scorch: Scorch[] = [];
  private shots: Shot[] = [];
  private beams: Beam[] = [];
  private later: { t: number; x: number; y: number; r: number }[] = [];
  private strike = 0;
  private sx = 0;
  private sy = 0;

  constructor(private readonly units: readonly Unit[]) {
    this.reset();
  }

  private reset(): void {
    this.t = 0;
    this.fx.clear();
    this.scorch = [];
    this.shots = [];
    this.beams = [];
    this.later = [];
    this.strike = 0;
    const inf = of(this.units, 'inf'),
      lines = Math.ceil(inf.length / 3);
    this.regs = inf.map((unit, i) => {
      const line = Math.floor(i / 3),
        lane = i % 3,
        lanes = Math.min(3, inf.length - line * 3);
      return {
        unit,
        x: -250,
        y: (lane - (lanes - 1) / 2) * 100 + (line % 2 ? 40 : 0) - (lines > 1 ? 20 : 0),
        lag: line * 55,
        team: 0,
        men: block(clamp(Math.round(menOf(unit) / 11), 6, 54))
      };
    });
    this.regs.push(
      { x: 95, y: -70, lag: 0, team: 1, men: block(45) },
      { x: 90, y: 60, lag: 0, team: 1, men: block(45) }
    );
    const tankUnits = of(this.units, 'tank'),
      count = tankUnits.length * 2;
    this.tanks = tankUnits.flatMap((unit, u) =>
      [0, 1].map((k) => {
        const j = u * 2 + k;
        return {
          unit,
          x: -225 - (j % 2) * 12,
          y: -150 + ((j + 0.5) * 300) / Math.max(1, count),
          a: 0,
          cd: rand(3, 1),
          alive: true,
          i: j
        };
      })
    );
    this.bunkers = (
      [
        [120, -120],
        [105, -10],
        [120, 110],
        [150, 40]
      ] as const
    ).map(([x, y]) => ({ x, y, a: Math.PI, cd: rand(4, 2), hp: 5 }));
    this.guns = of(this.units, 'art').flatMap((unit, i) =>
      [-1, 1].map((s) => ({ unit, x: -330 + s * 9, y: -150 + i * 34, a: 0, cd: rand(4, 1) }))
    );
    this.aa = of(this.units, 'aa').map((unit, i) => ({
      unit,
      x: -318 - (i % 2) * 22,
      y: 8 + Math.floor(i / 2) * 22
    }));
    const hq = of(this.units, 'hq')[0],
      anchor = this.regs.find((r) => r.team === 0 && r.y >= 0) ?? this.regs.find((r) => r.team === 0);
    this.hq = hq ? { unit: hq, x: anchor ? anchor.x + 30 : -300, y: anchor ? anchor.y + 4 : -100 } : null;
  }

  private ours(): Regiment[] {
    return this.regs.filter((r) => r.team === 0);
  }

  private theirs(): Regiment[] {
    return this.regs.filter((r) => r.team === 1);
  }

  draw(f: FB, v: View, dt: number, frame: number, selected: string | null): Placed[] {
    const { W, S } = v,
      fx = this.fx;
    this.t += dt;
    fx.step(dt);
    if (this.t > CYCLE) this.reset();
    const t = this.t,
      adv = clamp((t - 6) / 26, 0, 1),
      front = mix(-250, -20, ease(adv)),
      eng = adv > 0.85,
      placed: Placed[] = [];
    paintGround(f, v);
    this.drawScorch(f, W, S);
    for (let i = this.later.length - 1; i >= 0; i--) {
      const q = this.later[i]!;
      q.t -= dt;
      if (q.t <= 0) {
        fx.explode(q.x, q.y, q.r);
        this.later.splice(i, 1);
      }
    }
    {
      const [X, Y] = W(250, 0);
      prop(f, 'colony', X - 85 * S, Y, 0, S, SUN, { livery: 'foe', lods: GLOD });
    }
    this.drawBunkers(f, W, S, dt, t);
    for (const [x, y, a] of [
      [-345, -40, 0.2],
      [-360, 55, -0.15]
    ] as const) {
      const [X, Y] = W(x, y);
      dropShadow(f, X, Y, Math.round(10 * S));
      prop(f, 'dropship', X, Y, a, S, SUN, { livery: 'navy', lods: GLOD });
    }
    for (const p of this.aa) {
      const [X, Y] = W(p.x, p.y);
      aaSprite(f, X, Y, -Math.PI / 2 + Math.sin(t * 0.7 + p.x) * 0.6, S);
      placed.push({ unit: p.unit, x: X - 5, y: Y - 5, w: 10, h: 10 });
    }
    this.drawGuns(f, W, S, dt, t, placed);
    this.drawRegiments(f, W, S, dt, t, front, eng, placed);
    this.drawCommander(f, W, S, dt, t, eng, placed);
    this.drawTanks(f, W, S, dt, front, placed);
    if (t > 10 && Math.random() < dt * (0.4 + this.guns.length * 0.25)) {
      const x = rand(190, 60),
        y = rand(170, -170);
      fx.explode(x, y, rand(6, 3.5));
      this.scorch.push({ x, y, r: rand(7, 4) });
      if (this.scorch.length > 60) this.scorch.shift();
    }
    this.orbital(f, W, S, dt, t);
    this.drawShots(f, W, S, dt);
    this.dropship(f, W, S, dt, t);
    fx.draw(f, W, S, frame);
    const chosen = placed.filter((p) => p.unit.id === selected);
    if (chosen.length) {
      const x0 = Math.min(...chosen.map((p) => p.x)),
        y0 = Math.min(...chosen.map((p) => p.y)),
        x1 = Math.max(...chosen.map((p) => p.x + p.w)),
        y1 = Math.max(...chosen.map((p) => p.y + p.h));
      corners(f, x0 - 2, y0 - 2, x1 + 2, y1 + 2);
    }
    return merge(placed);
  }

  private drawScorch(f: FB, W: Project, S: number): void {
    for (const s of this.scorch) {
      const [X, Y] = W(s.x, s.y),
        R = Math.max(1, s.r * S);
      if (X < -R || Y < -R || X > f.w + R || Y > f.h + R) continue;
      for (let j = -Math.ceil(R); j <= R; j++)
        for (let i = -Math.ceil(R); i <= R; i++) {
          const d = (i * i + j * j) / (R * R);
          if (d <= 1 && dith(Math.round(X + i), Math.round(Y + j)) < 1.1 - d)
            f.px(X + i, Y + j, d < 0.3 ? [38, 30, 30] : [58, 48, 40]);
        }
    }
  }

  private drawBunkers(f: FB, W: Project, S: number, dt: number, t: number): void {
    for (const b of this.bunkers) {
      const [X, Y] = W(b.x, b.y);
      prop(f, 'bunker', X - 5 * S, Y, 0, S, SUN, { livery: 'foe', dead: b.hp <= 0, lods: GLOD });
      if (b.hp <= 0) {
        if (Math.random() < dt * 2) this.fx.add('smoke', b.x, b.y, { r: 4, life: 3, dark: true, vy: -3 });
        continue;
      }
      const tg = this.tanks
        .filter((q) => q.alive)
        .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (tg) {
        b.a += clamp(wrap(Math.atan2(tg.y - b.y, tg.x - b.x) - b.a), -1.2 * dt, 1.2 * dt);
        b.cd -= dt;
        if (b.cd <= 0 && Math.hypot(tg.x - b.x, tg.y - b.y) < 260) {
          b.cd = rand(5, 3);
          this.beams.push({ x0: b.x, y0: b.y, x1: tg.x, y1: tg.y, t: 0.25 });
          if (Math.random() < 0.14 && t > 44) {
            tg.alive = false;
            this.fx.explode(tg.x, tg.y, 7);
            this.scorch.push({ x: tg.x, y: tg.y, r: 7 });
          } else this.fx.burst(tg.x, tg.y, 6, 10);
        }
      }
      gunSprite(f, X, Y, b.a, S, true);
    }
  }

  private drawGuns(f: FB, W: Project, S: number, dt: number, t: number, placed: Placed[]): void {
    for (const g of this.guns) {
      const [X, Y] = W(g.x, g.y);
      g.a += clamp(wrap(-0.15 + Math.sin(t * 0.3 + g.y) * 0.1 - g.a), -dt, dt);
      g.cd -= dt;
      if (t > 8 && g.cd <= 0) {
        g.cd = rand(5, 3);
        this.fx.add('flash', g.x + Math.cos(g.a) * 7, g.y + Math.sin(g.a) * 7, { r: 2.2, life: 0.18 });
        this.fx.add('smoke', g.x + Math.cos(g.a) * 8, g.y + Math.sin(g.a) * 8, { r: 2, life: 1.2 });
      }
      dropShadow(f, X, Y, Math.round(4 * S));
      gunSprite(f, X, Y, g.a, S);
      placed.push({ unit: g.unit, x: X - 7, y: Y - 6, w: 14, h: 12 });
    }
  }

  private drawRegiments(
    f: FB,
    W: Project,
    S: number,
    dt: number,
    t: number,
    front: number,
    eng: boolean,
    placed: Placed[]
  ): void {
    const ours = this.ours(),
      theirs = this.theirs();
    for (const r of this.regs) {
      const foe = r.team === 1;
      if (!foe) {
        const reserve = r.unit?.stance === 'Reserve',
          dug = r.unit?.stance === 'Dug in';
        r.x = reserve ? -300 - r.lag * 0.3 : Math.min(front - r.lag, dug && eng ? -45 - r.lag : 1e9);
      }
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const m of r.men) {
        const wx = r.x + m.ox + (eng && m.alive ? Math.sin(t * 3 + m.ox) * 0.6 : 0),
          wy = r.y + m.oy,
          [X, Y] = W(wx, wy);
        x0 = Math.min(x0, X);
        y0 = Math.min(y0, Y);
        x1 = Math.max(x1, X);
        y1 = Math.max(y1, Y);
        if (!m.alive) {
          f.px(X, Y, FALLEN);
          continue;
        }
        if (eng && Math.random() < dt * (foe ? 0.012 : 0.006)) {
          m.alive = false;
          continue;
        }
        soldier(f, X, Y, foe, S);
        const enemy = foe ? ours : theirs;
        if (eng && enemy.length && Math.random() < dt * 0.5) {
          const o = enemy[Math.floor(rand(enemy.length))]!,
            tm = o.men[Math.floor(rand(o.men.length))]!;
          this.shots.push({ x0: wx, y0: wy, x1: o.x + tm.ox, y1: o.y + tm.oy, t: 0.12, foe });
        }
      }
      if (r.unit && r.unit.stance === 'Dug in')
        for (let x = Math.round(x0) - 1; x <= x1 + 1; x++) f.px(x, y1 + 2, [58, 44, 36]);
      if (r.unit) placed.push({ unit: r.unit, x: x0 - 1, y: y0 - 2, w: x1 - x0 + 3, h: y1 - y0 + 4 });
    }
  }

  private drawCommander(
    f: FB,
    W: Project,
    S: number,
    dt: number,
    t: number,
    eng: boolean,
    placed: Placed[]
  ): void {
    const hq = this.hq;
    if (!hq) return;
    const anchor = this.ours().find((r) => r.y >= 0 && r.unit?.stance !== 'Reserve');
    if (anchor) {
      hq.x = anchor.x + 30;
      hq.y = anchor.y + 4;
    }
    const [X, Y] = W(hq.x, hq.y);
    commander(f, X, Y, S);
    placed.push({ unit: hq.unit, x: X - 3, y: Y - 9, w: 9, h: 12 });
    if (eng && Math.floor(t / 5) !== Math.floor((t - dt) / 5)) {
      const b = this.bunkers.find((q) => q.hp > 0);
      if (b) {
        this.beams.push({ x0: hq.x, y0: hq.y, x1: b.x, y1: b.y, t: 0.5, lance: true });
        b.hp -= 3;
        this.fx.explode(b.x, b.y, 6);
        this.scorch.push({ x: b.x + rand(6, -6), y: b.y + rand(6, -6), r: 8 });
      }
    }
  }

  private drawTanks(f: FB, W: Project, S: number, dt: number, front: number, placed: Placed[]): void {
    for (const k of this.tanks) {
      if (k.alive) {
        const reserve = k.unit.stance === 'Reserve',
          tx = reserve ? -235 : front + 60 + (k.i % 2) * 22,
          tg =
            this.bunkers.find((b) => b.hp > 0 && Math.abs(b.y - k.y) < 140) ??
            this.bunkers.find((b) => b.hp > 0);
        if (k.x < tx) {
          k.x += 9 * dt;
          k.a = 0;
        } else if (tg && !reserve) {
          k.a += clamp(wrap(Math.atan2(tg.y - k.y, tg.x - k.x) - k.a), -dt, dt);
          k.cd -= dt;
          if (k.cd <= 0) {
            k.cd = rand(4, 2.5);
            this.shots.push({ x0: k.x, y0: k.y, x1: tg.x, y1: tg.y, t: 0.3, shell: true });
            this.fx.add('flash', k.x + Math.cos(k.a) * 6, k.y + Math.sin(k.a) * 6, { r: 2, life: 0.15 });
            tg.hp -= 0.6;
            this.later.push({ t: 0.3, x: tg.x + rand(5, -5), y: tg.y + rand(5, -5), r: 3.5 });
          }
        }
      } else if (Math.random() < dt * 3)
        this.fx.add('smoke', k.x, k.y, { r: 3, life: 2.5, dark: true, vy: -3 });
      const [X, Y] = W(k.x, k.y);
      tankSprite(f, X, Y, k.a, S, !k.alive);
      placed.push({ unit: k.unit, x: X - 7, y: Y - 5, w: 14, h: 10 });
    }
  }

  private orbital(f: FB, W: Project, S: number, dt: number, t: number): void {
    if (t > 40 && Math.floor(t / 11) !== Math.floor((t - dt) / 11)) {
      const b = this.bunkers.find((q) => q.hp > 0);
      this.strike = 0.9;
      this.sx = b?.x ?? 200;
      this.sy = b?.y ?? 20;
      if (b) b.hp = 0;
    }
    if (this.strike <= 0) return;
    this.strike -= dt;
    const [X, Y] = W(this.sx, this.sy),
      R = Math.round((6 + (1 - this.strike) * 16) * S);
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const d = Math.hypot(i, j) / R;
        if (d < 1 && dith(Math.round(X + i), Math.round(Y + j)) < 1.4 - d - (1 - this.strike) * 0.3)
          f.px(X + i, Y + j, d < 0.45 ? [255, 255, 255] : d < 0.75 ? [180, 240, 255] : [95, 208, 197]);
      }
    if (this.strike <= 0) {
      this.fx.explode(this.sx, this.sy, 14);
      this.scorch.push({ x: this.sx, y: this.sy, r: 16 });
    }
  }

  private drawShots(f: FB, W: Project, S: number, dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      s.t -= dt;
      const [a, b] = W(s.x0, s.y0),
        [c, d] = W(s.x1, s.y1);
      if (s.shell) {
        const u = 1 - s.t / 0.3;
        f.px(mix(a, c, u), mix(b, d, u), [255, 240, 200]);
        f.px(mix(a, c, u - 0.04), mix(b, d, u - 0.04), FIRE[1]);
      } else {
        const u = 1 - s.t / 0.12,
          v = Math.max(0, u - 0.25);
        f.line(
          mix(a, c, v),
          mix(b, d, v),
          mix(a, c, u),
          mix(b, d, u),
          s.foe ? [255, 150, 110] : [255, 240, 180]
        );
      }
      if (s.t <= 0) this.shots.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const s = this.beams[i]!;
      s.t -= dt;
      const [a, b] = W(s.x0, s.y0),
        [c, d] = W(s.x1, s.y1);
      thick(
        f,
        a,
        b,
        c,
        d,
        s.lance ? Math.max(3, Math.round(S * 2.5)) : Math.max(1, Math.round(S)),
        s.lance ? [255, 255, 255] : [255, 236, 214],
        s.lance ? [230, 120, 255] : [239, 111, 94]
      );
      if (s.t <= 0) this.beams.splice(i, 1);
    }
  }

  private dropship(f: FB, W: Project, S: number, dt: number, t: number): void {
    const cyc = t % 24;
    if (cyc >= 22) return;
    const alt = cyc < 7 ? 1 - ease(cyc / 7) : cyc < 15 ? 0 : ease((cyc - 15) / 7),
      x = -330 - alt * 180,
      y = 150 + alt * 60,
      [X, Y] = W(x, y),
      [SX, SY] = W(x + 6 + alt * 46, y + 6 + alt * 46),
      cs = Math.ceil(S);
    for (let j = -5; j <= 5; j++)
      for (let i = -16; i <= 16; i++)
        if ((i * i) / 256 + (j * j) / 25 <= 1) {
          const px = Math.round(SX + i * S),
            py = Math.round(SY + j * S);
          if (dith(px, py) < 0.75 - alt * 0.35) f.rect(px, py, cs, cs, [50, 44, 40]);
        }
    prop(f, 'dropship', X, Y, 0.12 - alt * 0.3, S * (1 + alt * 0.35), SUN, { livery: 'navy', lods: GLOD });
    if (alt > 0 && alt < 0.5 && Math.random() < dt * 20)
      this.fx.add('smoke', x + rand(14, -14) + alt * 40, y + rand(8, -8) + alt * 40, {
        r: 3,
        life: 1.2,
        vx: rand(14, -14),
        vy: rand(14, -14)
      });
  }
}

function corners(f: FB, x0: number, y0: number, x1: number, y1: number): void {
  for (const [x, y, dx, dy] of [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x0, y1, 1, -1],
    [x1, y1, -1, -1]
  ] as const)
    for (let i = 0; i < 3; i++) {
      f.px(x + dx * i, y, PAL.sel);
      f.px(x, y + dy * i, PAL.sel);
    }
}

function merge(placed: readonly Placed[]): Placed[] {
  const byUnit = new Map<string, Placed>();
  for (const p of placed) {
    const q = byUnit.get(p.unit.id);
    if (!q) {
      byUnit.set(p.unit.id, { ...p });
      continue;
    }
    const x1 = Math.max(q.x + q.w, p.x + p.w),
      y1 = Math.max(q.y + q.h, p.y + p.h);
    q.x = Math.min(q.x, p.x);
    q.y = Math.min(q.y, p.y);
    q.w = x1 - q.x;
    q.h = y1 - q.y;
  }
  return [...byUnit.values()];
}

const scenes = new Map<string, { key: string; scene: Invasion }>();

export function invasionFor(formation: string, units: readonly Unit[]): Invasion {
  const key = units.map((u) => u.id).join(),
    held = scenes.get(formation);
  if (held && held.key === key) return held.scene;
  const scene = new Invasion(units);
  scenes.set(formation, { key, scene });
  return scene;
}

const SQUAD_ROWS = 3;
const pictures = new Map<string, Uint8ClampedArray>();

export function drawUnitPicture(f: FB, unit: Unit): void {
  const key = `${unit.kind}:${f.w}x${f.h}`,
    held = pictures.get(key);
  if (held) {
    f.d.set(held);
    f.present();
    return;
  }
  const v = fitView(f, -150, -90, 115, 165),
    { W, S } = v,
    [cx, cy] = W(-120, 140);
  paintGround(f, v);
  if (unit.kind === 'inf')
    for (let i = 0; i < 9 * SQUAD_ROWS; i++) {
      const [X, Y] = W(-140 + (i % 9) * 5, 132 + Math.floor(i / 9) * 6);
      soldier(f, X, Y, false, S);
    }
  else if (unit.kind === 'tank')
    for (const dy of [-6, 6]) tankSprite(f, cx + dy * 2 * S - 4 * S, cy + dy * S, 0, S);
  else if (unit.kind === 'art')
    for (const dx of [-10, 10]) {
      dropShadow(f, cx + dx * S, cy, Math.round(4 * S));
      gunSprite(f, cx + dx * S, cy, -0.3, S);
    }
  else if (unit.kind === 'aa')
    for (const dx of [-9, 9]) aaSprite(f, cx + dx * S, cy, -Math.PI / 2 + dx * 0.04, S);
  else {
    commander(f, cx, cy + 4 * S, S);
    for (let i = 0; i < 6; i++) {
      const [X, Y] = W(-128 + (i % 3) * 5, 132 + Math.floor(i / 3) * 6);
      soldier(f, X, Y, false, S);
    }
  }
  pictures.set(key, f.d.slice());
  f.present();
}
