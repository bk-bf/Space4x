import { clamp } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import { ALIEN_SPECS, spec, type ShipSpec } from '#lib/gfx/ships/specs.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { Craft, small, type Turret } from './craft';
import { FIRE, Fx, rand, TAU, thick, wrap } from './fx';
import { inView, label, type SceneLabel, type SceneView, type SiteScene } from './scene';

type ClassId = 'bastion' | 'pike' | 'lancer' | 'x1' | 'x2';

interface Profile {
  hp: number;
  sh: number;
  v: number;
  turn: number;
  R: number;
  mode: 'orbit' | 'joust';
  pd: number;
  craft?: number;
}

const PROFILES: Record<ClassId, Profile> = {
  bastion: { hp: 1000, sh: 560, v: 6.5, turn: 0.11, R: 120, mode: 'orbit', pd: 4, craft: 5 },
  pike: { hp: 400, sh: 240, v: 12, turn: 0.3, R: 105, mode: 'joust', pd: 2 },
  lancer: { hp: 320, sh: 200, v: 10.5, turn: 0.27, R: 150, mode: 'orbit', pd: 2 },
  x1: { hp: 900, sh: 460, v: 7.5, turn: 0.13, R: 110, mode: 'joust', pd: 3, craft: 4 },
  x2: { hp: 280, sh: 170, v: 12.5, turn: 0.32, R: 135, mode: 'orbit', pd: 1 }
};

const NAMES = [
  ['Kestrel', 'Harrier', 'Merlin', 'Osprey', 'Falcon', 'Sparrowhawk', 'Tern', 'Petrel', 'Lark', 'Swift'],
  ['C-014', 'C-015', 'C-017', 'C-018', 'C-021', 'C-022', 'C-025', 'C-026', 'C-030', 'C-031']
] as const;

const specOf = (id: ClassId): ShipSpec => ALIEN_SPECS[id] ?? spec(id);

interface Mark {
  x: number;
  y: number;
  kill?: number;
  fighter?: boolean;
}

class Warship extends Craft {
  hp: number;
  sh: number;
  v: number;
  side = Math.random() < 0.5 ? 1 : -1;
  salvo = rand(7, 2);
  pass = false;
  launch: { cell: { x: number; y: number }; t: number }[] = [];
  hangar: number;
  hcd = rand(4, 1);
  spin = 0;
  vx = 0;
  vy = 0;
  dying = 0;
  age = 0;
  scd = rand(4, 1);
  tgt: Warship | null = null;
  sx = 0;
  sy = 0;
  readonly cells: readonly { x: number; y: number }[];
  readonly spinal: { x: number; y: number } | null;

  constructor(
    readonly id: ClassId,
    readonly team: 0 | 1,
    readonly cls: Profile,
    readonly name: string,
    x: number,
    y: number,
    a: number
  ) {
    super(specOf(id), team ? 'foe' : 'navy', { x, y, a });
    this.hp = cls.hp;
    this.sh = cls.sh;
    this.v = cls.v;
    this.hangar = cls.craft ?? 0;
    this.cells = this.sprite.cells;
    this.spinal = this.sprite.spinal;
    for (let i = 0; i < cls.pd; i++) {
      const face = ((i & 1 ? 1 : -1) * Math.PI) / 2;
      this.extra.push({
        m: {
          x: (i >> 1 ? -1 : 1) * this.len * 0.18 + rand(4, -4),
          y: (i & 1 ? 1 : -1) * 2.6,
          type: 'pd',
          face,
          arc: 2.2,
          comp: 0
        },
        a: face,
        cd: rand(1),
        fire: 0
      });
    }
  }
}

interface Missile {
  x: number;
  y: number;
  a: number;
  v: number;
  T: Warship;
  team: number;
  life: number;
  p: [number, number];
  kill?: number;
}

interface Fighter {
  x: number;
  y: number;
  a: number;
  v: number;
  team: number;
  home: Warship;
  fighter: true;
  cd: number;
  away: number;
  T: Warship | Fighter | null;
  kill?: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  team: number;
}

interface Beam {
  s: Warship;
  t?: Turret;
  spinal?: boolean;
  T: Warship;
  p: [number, number];
  life: number;
  age: number;
  team: number;
  w: number;
}

interface Flare {
  s: Warship;
  a: number;
  t: number;
  big: boolean;
}

const SHIELD: readonly RGB[] = [
  [240, 250, 255],
  [255, 170, 110],
  [170, 80, 70],
  [110, 220, 230],
  [52, 128, 150]
];

export class BattleScene implements SiteScene {
  readonly fx = new Fx();
  ships: Warship[] = [];
  private mis: Missile[] = [];
  private shots: Shot[] = [];
  private beams: Beam[] = [];
  private flares: Flare[] = [];
  private craft: Fighter[] = [];
  private queue: { id: ClassId; team: 0 | 1; t: number }[] = [];
  private named = [0, 0];

  constructor() {
    this.spawn('bastion', 0, -150, 10, 0);
    this.spawn('pike', 0, -120, -62, 0.1);
    this.spawn('pike', 0, -125, 78, -0.1);
    this.spawn('lancer', 0, -200, -40, 0);
    this.spawn('lancer', 0, -205, 60, 0);
    this.spawn('x1', 1, 150, -20, Math.PI);
    this.spawn('x1', 1, 190, 70, Math.PI);
    this.spawn('x2', 1, 120, -85, Math.PI);
    this.spawn('x2', 1, 125, 110, Math.PI);
    this.spawn('x2', 1, 215, -70, Math.PI);
  }

  private spawn(id: ClassId, team: 0 | 1, x: number, y: number, a: number, jump = false): Warship {
    const s = new Warship(id, team, PROFILES[id], NAMES[team][this.named[team]!++ % 10]!, x, y, a);
    this.ships.push(s);
    if (jump) {
      this.fx.add('jump', x, y, { r: s.len * 0.8, life: 0.8 });
      this.fx.add('flash', x, y, { r: s.len * 0.35, life: 0.5 });
    }
    return s;
  }

  private ellipse(T: Warship): [number, number] {
    return [T.len / 2 + 5, Math.min(T.half, 9) + 5];
  }

  private hurt(T: Warship, dmg: number, xu: number, yu: number, fromA: number): void {
    if (T.dead) return;
    if (T.sh > 0) {
      T.sh -= dmg;
      const ph = fromA - T.a,
        [ea, eb] = this.ellipse(T);
      this.flares.push({ s: T, a: Math.atan2(ea * Math.sin(ph), eb * Math.cos(ph)), t: 0, big: dmg > 20 });
      if (T.sh <= 0) {
        T.sh = 0;
        const [wx, wy] = T.world(xu, yu);
        this.fx.add('ring', wx, wy, { r: T.len * 0.5, life: 0.5 });
      }
      return;
    }
    T.hp -= dmg;
    T.hit(xu, yu, 1.1 + dmg * 0.045, 140 + rand(110));
    const [wx, wy] = T.world(xu, yu);
    this.fx.burst(wx, wy, 5 + dmg * 0.2, 12, { vx: Math.cos(T.a) * T.v, vy: Math.sin(T.a) * T.v });
    if (dmg > 20) this.fx.add('smoke', wx, wy, { r: 2, life: 2, dark: true });
    if (T.hp <= 0) {
      T.dead = true;
      T.dying = 3.2;
      T.thr = 0;
      T.vx = Math.cos(T.a) * T.v * 0.6;
      T.vy = Math.sin(T.a) * T.v * 0.6;
      T.spin = rand(0.12, -0.12);
      this.queue.push({ id: T.id, team: T.team, t: 9 });
    }
  }

  private aimPoint(T: Warship, fromX: number, fromY: number): [number, number] {
    const side = Math.sign(-Math.sin(T.a) * (fromX - T.x) + Math.cos(T.a) * (fromY - T.y)) || 1;
    return T.hull(rand(T.len * 0.38, -T.len * 0.38), side * rand(Math.min(T.half, 7) * 0.85, 1));
  }

  private respawn(dt: number, alive: Warship[]): void {
    for (const q of this.queue) q.t -= dt;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i]!.t > 0) continue;
      const q = this.queue.splice(i, 1)[0]!,
        foes = alive.filter((s) => s.team !== q.team),
        cx = foes.length ? foes.reduce((a, s) => a + s.x, 0) / foes.length : 0,
        cy = foes.length ? foes.reduce((a, s) => a + s.y, 0) / foes.length : 0,
        a = rand(TAU);
      this.spawn(q.id, q.team, cx + Math.cos(a) * 230, cy + Math.sin(a) * 150, a + Math.PI, true);
    }
  }

  private wreck(s: Warship, dt: number): void {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.a += s.spin * dt;
    s.age += dt;
    if (s.dying > 0) {
      s.dying -= dt;
      if (Math.random() < dt * 9) {
        const p = s.hull(rand(s.len * 0.45, -s.len * 0.45), rand(6, -6)),
          [wx, wy] = s.world(p[0], p[1]);
        this.fx.explode(wx, wy, rand(5, 2), { vx: s.vx, vy: s.vy });
        s.hit(p[0], p[1], rand(4, 2), 230);
      }
      if (s.dying <= 0) {
        this.fx.explode(s.x, s.y, s.len * 0.22, { vx: s.vx, vy: s.vy });
        for (let k = 0; k < 6; k++) s.hit(rand(s.len * 0.45, -s.len * 0.45), rand(5, -5), rand(7, 4), 200);
      }
    } else if (Math.random() < dt * 1.2) {
      const p = s.hull(rand(s.len * 0.4, -s.len * 0.4), rand(4, -4)),
        [wx, wy] = s.world(p[0], p[1]);
      this.fx.add('smoke', wx, wy, { r: 2.5, life: 3, dark: true, vx: s.vx, vy: s.vy });
    }
  }

  private steer(s: Warship, dt: number, alive: Warship[]): void {
    const c = s.cls;
    if (!s.tgt || s.tgt.dead || Math.random() < dt * 0.03) {
      let best: Warship | null = null,
        bd = 1e9;
      for (const o of alive)
        if (o.team !== s.team) {
          const d = Math.hypot(o.x - s.x, o.y - s.y) * (o.cls.hp > 500 === c.hp > 500 ? 0.7 : 1);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
      s.tgt = best;
    }
    const T = s.tgt;
    let wx = Math.cos(s.a),
      wy = Math.sin(s.a),
      dist = 1e9,
      bearing = s.a;
    if (T) {
      const dx = T.x - s.x,
        dy = T.y - s.y;
      dist = Math.hypot(dx, dy);
      bearing = Math.atan2(dy, dx);
      let want: number;
      if (c.mode === 'orbit')
        want = bearing + s.side * (Math.PI / 2) * (1 - clamp(((dist - c.R) / c.R) * 1.6, -0.5, 1));
      else {
        if (dist < (s.len + T.len) * 0.5 + 18) s.pass = true;
        else if (dist > c.R) s.pass = false;
        want = s.pass ? bearing + s.side * 1.9 : bearing + s.side * 0.22;
      }
      wx = Math.cos(want);
      wy = Math.sin(want);
    }
    for (const o of this.ships)
      if (o !== s) {
        const dx = s.x - o.x,
          dy = s.y - o.y,
          d = Math.hypot(dx, dy),
          r = (s.len + o.len) * 0.62 + 6;
        if (d < r && d > 0.1) {
          const k = (1 - d / r) * 7;
          wx += (dx / d) * k;
          wy += (dy / d) * k;
          if (d < r * 0.55) {
            s.x += (dx / d) * dt * 5;
            s.y += (dy / d) * dt * 5;
          }
        }
      }
    const cd = Math.hypot(s.x, s.y);
    if (cd > 330) {
      wx -= (s.x / cd) * (cd - 330) * 0.03;
      wy -= (s.y / cd) * (cd - 330) * 0.03;
    }
    const da = wrap(Math.atan2(wy, wx) - s.a);
    s.a += clamp(da, -c.turn * dt, c.turn * dt);
    s.thr = 0.55 + 0.45 * Math.max(0, Math.cos(da));
    s.v = c.v * s.thr;
    s.x += Math.cos(s.a) * s.v * dt;
    s.y += Math.sin(s.a) * s.v * dt;
    if (s.sh > 0 && s.sh < c.sh) s.sh = Math.min(c.sh, s.sh + dt * 4);
    for (const t of [...s.tur, ...s.extra]) this.turret(s, t, T, dist, dt);
    this.heavy(s, T, dist, bearing, dt);
  }

  private turret(s: Warship, t: Turret, T: Warship | null, dist: number, dt: number): void {
    t.cd -= dt;
    t.fire -= dt;
    const [mx, my] = s.world(t.m.x, t.m.y),
      pd = t.m.type === 'pd';
    let aim: Mark | null = null;
    if (pd) {
      let bd = 75;
      for (const m of this.mis)
        if (m.team !== s.team) {
          const d = Math.hypot(m.x - mx, m.y - my);
          if (d < bd) {
            bd = d;
            aim = m;
          }
        }
      for (const k of this.craft)
        if (k.team !== s.team && !aim && Math.hypot(k.x - mx, k.y - my) < 55) aim = k;
    } else if (T && dist < 190) aim = T;
    let goal = t.m.face,
      ok = false;
    if (aim) {
      const rel = wrap(Math.atan2(aim.y - my, aim.x - mx) - s.a - t.m.face);
      ok = Math.abs(rel) < t.m.arc;
      goal = t.m.face + clamp(rel, -t.m.arc, t.m.arc);
    }
    const dA = wrap(goal - t.a),
      rate = pd ? 5 : 1.4;
    t.a += clamp(dA, -rate * dt, rate * dt);
    if (!aim || !ok || Math.abs(dA) >= 0.07 || t.cd > 0) return;
    if (pd) {
      t.cd = 0.09;
      t.burst = (t.burst ?? 0) + 1;
      if (t.burst > 9) {
        t.burst = 0;
        t.cd = rand(1.2, 0.5);
      }
      const a = s.a + t.a + rand(0.05, -0.05);
      this.shots.push({
        x: mx,
        y: my,
        vx: Math.cos(a) * 260,
        vy: Math.sin(a) * 260,
        life: Math.hypot(aim.x - mx, aim.y - my) / 260,
        team: s.team
      });
      if (Math.random() < (aim.fighter ? 0.045 : 0.075)) aim.kill = 0.12;
    } else if (T) {
      t.cd = rand(3.6, 2.2);
      t.fire = 0.3;
      const p = this.aimPoint(T, mx, my);
      this.beams.push({ s, t, T, p, life: 0.3, age: 0, team: s.team, w: 1 });
      this.hurt(T, 13, p[0], p[1], Math.atan2(my - T.y, mx - T.x));
    }
  }

  private heavy(s: Warship, T: Warship | null, dist: number, bearing: number, dt: number): void {
    if (s.spinal && T) {
      s.scd -= dt;
      if (s.scd <= 0 && dist < 210 && Math.abs(wrap(bearing - s.a)) < 0.09) {
        s.scd = rand(8, 6);
        const [mx, my] = s.world(s.spinal.x, 0),
          p = this.aimPoint(T, mx, my);
        this.beams.push({ s, spinal: true, T, p, life: 0.7, age: 0, team: s.team, w: 2 });
        this.hurt(T, 55, p[0], p[1], Math.atan2(my - T.y, mx - T.x));
      }
    }
    if (s.cells.length && T) {
      s.salvo -= dt;
      if (s.salvo <= 0 && dist < 280) {
        s.salvo = rand(13, 9);
        s.launch = s.cells.map((cell, i) => ({ cell, t: i * 0.11 }));
      }
    }
    for (let i = s.launch.length - 1; i >= 0; i--) {
      const L = s.launch[i]!;
      L.t -= dt;
      if (L.t > 0 || !s.tgt) continue;
      s.launch.splice(i, 1);
      const [mx, my] = s.world(L.cell.x, L.cell.y),
        a = s.a + Math.sign(L.cell.y || rand(1, -1)) * rand(1.3, 0.8);
      this.mis.push({
        x: mx,
        y: my,
        a,
        v: 14,
        T: s.tgt,
        team: s.team,
        life: 9,
        p: this.aimPoint(s.tgt, mx, my)
      });
      this.fx.add('flash', mx, my, { r: 1.2, life: 0.2 });
    }
    if (s.hangar > 0) {
      s.hcd -= dt;
      if (s.hcd <= 0) {
        s.hcd = 0.7;
        s.hangar--;
        const [hx, hy] = s.world(0, 0);
        this.craft.push({
          x: hx,
          y: hy,
          a: s.a + rand(0.6, -0.6),
          v: 26,
          team: s.team,
          home: s,
          fighter: true,
          cd: rand(1),
          away: 0,
          T: null
        });
      }
    }
  }

  private missiles(dt: number): void {
    for (let i = this.mis.length - 1; i >= 0; i--) {
      const m = this.mis[i]!;
      m.life -= dt;
      m.v = Math.min(70, m.v + 60 * dt);
      if (m.kill != null) {
        m.kill -= dt;
        if (m.kill <= 0) {
          this.fx.explode(m.x, m.y, 1.6);
          this.mis.splice(i, 1);
          continue;
        }
      }
      if (m.T.dead && !m.T.dying) m.life = Math.min(m.life, 0.3);
      const [tx, ty] = m.T.world(m.p[0], m.p[1]),
        d = Math.hypot(tx - m.x, ty - m.y);
      m.a += clamp(wrap(Math.atan2(ty - m.y, tx - m.x) - m.a), -3.2 * dt, 3.2 * dt);
      m.x += Math.cos(m.a) * m.v * dt;
      m.y += Math.sin(m.a) * m.v * dt;
      if (Math.random() < dt * 24)
        this.fx.add('smoke', m.x - Math.cos(m.a) * 1.5, m.y - Math.sin(m.a) * 1.5, { r: 0.6, life: 0.7 });
      if (d < 4 + m.v * dt) {
        this.hurt(m.T, 34, m.p[0], m.p[1], m.a + Math.PI);
        this.fx.explode(tx, ty, m.T.sh > 0 ? 2 : 3.5);
        this.mis.splice(i, 1);
      } else if (m.life <= 0) {
        this.fx.add('smoke', m.x, m.y, { r: 1.5, life: 1 });
        this.mis.splice(i, 1);
      }
    }
  }

  private fighters(dt: number, alive: Warship[]): void {
    for (let i = this.craft.length - 1; i >= 0; i--) {
      const k = this.craft[i]!;
      if (k.kill != null) {
        k.kill -= dt;
        if (k.kill <= 0) {
          this.fx.explode(k.x, k.y, 2.2);
          this.craft.splice(i, 1);
          if (!k.home.dead) k.home.hangar++;
          continue;
        }
      }
      const gone = !k.T || ('dead' in k.T ? k.T.dead : !this.craft.includes(k.T));
      if (gone) {
        let best: Warship | Fighter | null = null,
          bd = 1e9;
        for (const o of this.craft)
          if (o.team !== k.team) {
            const d = Math.hypot(o.x - k.x, o.y - k.y);
            if (d < 90 && d < bd) {
              bd = d;
              best = o;
            }
          }
        if (!best)
          for (const o of alive)
            if (o.team !== k.team) {
              const d = Math.hypot(o.x - k.x, o.y - k.y);
              if (d < bd) {
                bd = d;
                best = o;
              }
            }
        k.T = best;
      }
      k.away -= dt;
      k.cd -= dt;
      let want = k.a;
      const T = k.T;
      if (T) {
        const dx = T.x - k.x,
          dy = T.y - k.y,
          d = Math.hypot(dx, dy),
          br = Math.atan2(dy, dx),
          isFighter = !('dead' in T);
        if (d < (isFighter ? 8 : 14)) k.away = rand(1.6, 0.8);
        want = k.away > 0 ? k.a + 0.9 * dt * 8 * (i & 1 ? 1 : -1) : br;
        if (k.away <= 0 && d < 45 && Math.abs(wrap(br - k.a)) < 0.2 && k.cd <= 0) {
          k.cd = 0.14;
          this.shots.push({
            x: k.x,
            y: k.y,
            vx: Math.cos(k.a) * 180,
            vy: Math.sin(k.a) * 180,
            life: d / 180,
            team: k.team
          });
          if (!('dead' in T)) {
            if (Math.random() < 0.05) T.kill = 0.1;
          } else if (Math.random() < 0.25) {
            const p = this.aimPoint(T, k.x, k.y);
            this.hurt(T, 1.5, p[0], p[1], br + Math.PI);
          }
        }
      }
      for (const o of this.craft)
        if (o !== k) {
          const dx = k.x - o.x,
            dy = k.y - o.y,
            d = Math.hypot(dx, dy);
          if (d < 5 && d > 0.01) want += 0.3 * Math.sign(wrap(Math.atan2(dy, dx) - k.a));
        }
      k.a += clamp(wrap(want - k.a), -2.4 * dt, 2.4 * dt);
      k.x += Math.cos(k.a) * k.v * dt;
      k.y += Math.sin(k.a) * k.v * dt;
    }
  }

  step(dt: number): void {
    const alive = this.ships.filter((s) => !s.dead);
    this.respawn(dt, alive);
    for (const s of this.ships) {
      if (s.dead) this.wreck(s, dt);
      else this.steer(s, dt, alive);
    }
    this.missiles(dt);
    this.fighters(dt, alive);
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) this.shots.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!;
      b.age += dt;
      if (b.age > b.life) this.beams.splice(i, 1);
    }
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const b = this.flares[i]!;
      b.t += dt;
      if (b.t > 0.55) this.flares.splice(i, 1);
    }
    for (let i = this.ships.length - 1; i >= 0; i--) {
      const s = this.ships[i]!;
      if (s.dead && s.age > 45) this.ships.splice(i, 1);
    }
    this.fx.step(dt);
  }

  draw(v: SceneView, out: SceneLabel[]): void {
    const { f, W, S, sun, frame } = v;
    this.step(Math.min(v.dt, 0.05));
    const order = [...this.ships].sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1) || b.len - a.len);
    for (const s of order) {
      const [X, Y] = W(s.x, s.y);
      s.sx = X;
      s.sy = Y;
      s.draw(f, X, Y, S, sun, frame);
    }
    for (const k of this.craft) {
      const [X, Y] = W(k.x, k.y);
      if (!inView(f, X, Y, 20)) continue;
      if (S >= 1.2) small(f, 'fighter', X, Y, k.a, S, sun, frame, { livery: k.home.livery, thrust: 1 });
      else {
        f.px(X, Y, k.team ? [239, 111, 94] : [182, 222, 240]);
        f.px(X - Math.cos(k.a), Y - Math.sin(k.a), FIRE[1]);
      }
    }
    this.drawMissiles(v);
    for (const s of this.shots) {
      const [X, Y] = W(s.x, s.y),
        k = S * 0.012;
      f.line(X, Y, X - s.vx * k, Y - s.vy * k, s.team ? [255, 150, 110] : [255, 236, 170]);
    }
    this.drawBeams(v);
    this.fx.draw(f, W, S, frame);
    this.drawFlares(v);
    for (const s of order) {
      const r = Math.max(8, s.len * S * 0.5);
      if (!s.dead && (S >= 1.2 || s.len > 60))
        label(out, f, s.name, s.name, s.sx, s.sy, Math.min(r, s.half * S + 4), s.team ? 'hot' : 'fl');
    }
  }

  private drawMissiles(v: SceneView): void {
    const { f, W, S } = v;
    for (const m of this.mis) {
      const [X, Y] = W(m.x, m.y),
        c = Math.cos(m.a),
        n = Math.sin(m.a),
        L = Math.max(1, S * 0.9);
      for (let i = 0; i <= L; i++)
        f.px(
          X + c * i,
          Y + n * i,
          i > L - 1.5 ? (m.team ? [255, 150, 120] : [236, 240, 250]) : [150, 154, 176]
        );
      f.px(X - c, Y - n, FIRE[0]);
      f.px(X - c * 2, Y - n * 2, FIRE[1]);
      if (S >= 3) {
        f.px(X - c * 3, Y - n * 3, FIRE[2]);
        f.px(X - c * 4, Y - n * 4, FIRE[2]);
      }
    }
  }

  private drawBeams(v: SceneView): void {
    const { f, W, S, frame } = v;
    for (const b of this.beams) {
      const from =
        b.spinal && b.s.spinal
          ? b.s.world(b.s.spinal.x, 0)
          : b.t
            ? b.s.world(b.t.m.x + Math.cos(b.t.a) * 5.6, b.t.m.y + Math.sin(b.t.a) * 5.6)
            : b.s.world(0, 0);
      const [x0, y0] = W(from[0], from[1]);
      let [tx, ty] = b.T.world(b.p[0], b.p[1]);
      if (b.T.sh > 0) {
        const T = b.T,
          ph = Math.atan2(b.s.y - T.y, b.s.x - T.x) - T.a,
          [ea, eb] = this.ellipse(T),
          la = Math.atan2(ea * Math.sin(ph), eb * Math.cos(ph)),
          c = Math.cos(T.a),
          n = Math.sin(T.a),
          ex = Math.cos(la) * ea,
          ey = Math.sin(la) * eb;
        tx = T.x + c * ex - n * ey;
        ty = T.y + n * ex + c * ey;
      }
      const [x1, y1] = W(tx, ty),
        u = b.age / b.life,
        fl = frame & 1,
        wd = Math.max(1, Math.round(S * (b.w === 2 ? 1.6 : 0.85) * (u > 0.7 ? 0.6 : 1))),
        core: RGB = b.team ? [255, 236, 214] : [236, 252, 255],
        edge: RGB = b.team ? (fl ? [239, 111, 94] : [255, 150, 110]) : fl ? [95, 208, 197] : [130, 230, 250];
      thick(f, x0, y0, x1, y1, wd, core, edge);
      if (u < 0.5) {
        const R = Math.round((b.w === 2 ? 3 : 1.6) * Math.max(1, S * 0.6));
        for (let j = -R; j <= R; j++)
          for (let i = -R; i <= R; i++)
            if (i * i + j * j <= R * R && dith(Math.round(x1 + i), Math.round(y1 + j)) < 0.8)
              f.px(x1 + i, y1 + j, i * i + j * j < R * R * 0.3 ? core : edge);
      }
    }
  }

  private drawFlares(v: SceneView): void {
    const { f, W, S, frame } = v;
    for (const b of this.flares) {
      const s = b.s,
        [ea0, eb0] = this.ellipse(s),
        ea = ea0 * S,
        eb = eb0 * S,
        u = b.t / 0.55,
        c = Math.cos(s.a),
        n = Math.sin(s.a),
        [X, Y] = W(s.x, s.y),
        N = Math.round((b.big ? 26 : 15) * S),
        foe = s.team,
        layers = S >= 3 ? 3 : S >= 1.5 ? 2 : 1;
      for (let i = -N; i <= N; i++) {
        const la = b.a + i / Math.max(ea, eb),
          ex = Math.cos(la) * ea,
          ey = Math.sin(la) * eb,
          I = (1 - Math.abs(i) / N) * (1 - u);
        for (let t = 0; t < layers; t++) {
          const k = 1 - (t * 1.3) / Math.max(ea, eb),
            x = Math.round(X + c * ex * k - n * ey * k),
            y = Math.round(Y + n * ex * k + c * ey * k);
          if (dith(x, y) < I * 1.6 - t * 0.2 && (x + y * 2 + frame) % 5 !== 0)
            f.px(
              x,
              y,
              I > 0.62
                ? SHIELD[0]!
                : foe
                  ? I > 0.3
                    ? SHIELD[1]!
                    : SHIELD[2]!
                  : I > 0.3
                    ? SHIELD[3]!
                    : SHIELD[4]!
            );
        }
      }
    }
  }
}
