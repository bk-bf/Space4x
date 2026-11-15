import { clamp } from '#lib/gfx/math.ts';
import { ALIEN_SPECS } from '#lib/gfx/ships/specs.ts';
import type { Sprite } from '#lib/gfx/topdown/builder.ts';
import { ease } from '../mapCamera';
import { Craft, small } from './craft';
import { Fx, rand, wrap } from './fx';
import { label, type SceneLabel, type SceneView, type SiteScene } from './scene';

interface Centre {
  x: number;
  y: number;
  hw: number;
  c: number;
}

interface Pod {
  q: Centre;
  side: number;
  from: [number, number];
  lit: boolean;
}

interface Section {
  q: Centre;
  name: string;
  t0: number;
  t1: number;
}

const APPROACH = 7;

function centres(sp: Sprite): Centre[] {
  const n = sp.comps.length,
    sx = new Float64Array(n),
    sy = new Float64Array(n),
    ct = new Float64Array(n),
    mx = new Float64Array(n);
  for (let j = 0; j < sp.h; j++)
    for (let i = 0; i < sp.w; i++) {
      const k = j * sp.w + i,
        c = sp.c[k]!;
      if (!sp.m[k] || !c) continue;
      sx[c] = sx[c]! + i;
      sy[c] = sy[c]! + j;
      ct[c] = ct[c]! + 1;
      mx[c] = Math.max(mx[c]!, Math.abs(j - sp.pvy));
    }
  const out: Centre[] = [];
  sp.comps.forEach((q, c) => {
    if (q && ct[c])
      out.push({
        x: (sx[c]! / ct[c]! - sp.pvx) / sp.S,
        y: (sy[c]! / ct[c]! - sp.pvy) / sp.S,
        hw: mx[c]! / sp.S,
        c
      });
  });
  return out;
}

export class BoardingScene implements SiteScene {
  readonly fx = new Fx();
  private t = 0;
  private T = new Craft(ALIEN_SPECS.x1!, 'foe', { a: 0.22, thr: 0.3 });
  private pods: Pod[] = [];
  private sched: Section[] = [];
  private end = 0;
  private own = new Uint8Array(0);

  constructor() {
    this.reset();
  }

  private reset(): void {
    this.t = 0;
    this.fx.clear();
    const T = (this.T = new Craft(ALIEN_SPECS.x1!, 'foe', { a: 0.22, thr: 0.3 })),
      sp = T.sprite,
      cen = centres(sp),
      mid = cen.reduce((a, q) => (Math.abs(q.x) < Math.abs(a.x) ? q : a)),
      start = [
        cen.find((q) => q.x < -T.len * 0.3),
        mid,
        cen.find((q) => q.x > T.len * 0.12 && Math.abs(q.y) < 2)
      ].filter((q): q is Centre => !!q);
    this.pods = start.map((q, i) => ({
      q,
      side: i % 2 ? 1 : -1,
      from: [-T.len * 0.5 - 70 - i * 18, (i % 2 ? 1 : -1) * (50 + i * 12)],
      lit: false
    }));
    const dist = (a: Centre) =>
      Math.min(...start.map((s) => Math.abs(s.x - a.x) + Math.abs(s.y - a.y) * 0.4));
    this.sched = [...cen]
      .sort((a, b) => dist(a) - dist(b))
      .map((q, i) => {
        const k = Math.max(0, i - start.length + 1) * 1.7;
        return { q, name: sp.comps[q.c]!.name, t0: 8 + k, t1: 11 + k };
      });
    this.end = this.sched.at(-1)?.t1 ?? 20;
    this.own = new Uint8Array(sp.comps.length);
  }

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, dt, sun, frame } = v;
    this.t += dt;
    this.fx.step(dt);
    if (this.t > this.end + 7) this.reset();
    const T = this.T,
      t = this.t,
      done = t > this.end;
    T.a = 0.22 + Math.sin(t * 0.13) * 0.04;
    T.thr = done ? 0.6 : 0.3;
    T.livery = 'foe';
    const fight: Section[] = [];
    let taken = 0;
    for (const s of this.sched) {
      this.own[s.q.c] = t >= s.t1 ? 2 : t >= s.t0 ? 1 : 0;
      if (t >= s.t1) taken++;
      else if (t >= s.t0) fight.push(s);
    }
    for (const tu of T.tur) {
      const o = this.own[tu.m.comp];
      tu.a += clamp(
        wrap((o === 2 ? tu.m.face : tu.m.face + Math.sin(t * 1.7 + tu.m.x) * 1.2) - tu.a),
        -1.5 * dt,
        1.5 * dt
      );
    }
    const [X, Y] = W(0, 0);
    T.draw(f, X, Y, S, sun, frame, { swap: { owner: this.own, livery: 'navy' } });
    fight.forEach((s, i) => {
      const q = s.q,
        [wx, wy] = T.world(q.x + rand(3, -3), q.y + rand(2, -2));
      if (Math.random() < dt * 5)
        this.fx.add('spark', wx, wy, {
          vx: rand(5, -5),
          vy: rand(5, -5),
          life: 0.35,
          col: Math.random() < 0.5 ? [255, 236, 170] : [255, 130, 100]
        });
      if (i < 2) {
        const [cx, cy] = T.world(q.x, q.y),
          [lx, ly] = W(cx, cy);
        label(out, f, `fight${i}`, `${s.name} · fighting`, lx, ly, 3, 'hot');
      }
    });
    const u = ease(t / APPROACH);
    this.pods.forEach((p, i) => {
      const lp: [number, number] = [p.q.x, p.side * (p.q.hw + 1.4)],
        pos = t < APPROACH ? [p.from[0] + (lp[0] - p.from[0]) * u, p.from[1] + (lp[1] - p.from[1]) * u] : lp,
        [wx, wy] = T.world(pos[0]!, pos[1]!),
        [px, py] = W(wx, wy),
        a =
          t < APPROACH
            ? T.a + Math.atan2(lp[1] - p.from[1], lp[0] - p.from[0])
            : T.a - (p.side * Math.PI) / 2;
      small(f, 'shuttle', px, py, a, S, sun, frame, {
        livery: 'navy',
        ...(t < APPROACH ? { ghost: 0.5 } : {})
      });
      if (t < APPROACH && i === 0) label(out, f, 'pods', 'Boarding craft ×3 · cloaked', px, py, 4);
      if (t >= APPROACH && !p.lit) {
        p.lit = true;
        this.fx.add('flash', wx, wy, { r: 2.5, life: 0.4 });
        this.fx.add('ring', wx, wy, { r: 7, life: 0.5, col: [110, 220, 230] });
      }
    });
    this.fx.draw(f, W, S, frame);
    label(
      out,
      f,
      'prize',
      done ? `C-022 · taken as prize` : `C-022 · ${taken}/${this.sched.length} sections held`,
      X,
      Y,
      T.half * S,
      done ? 'fl' : 'hot'
    );
  }
}
