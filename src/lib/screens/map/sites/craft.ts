import type { FB } from '#lib/gfx/framebuffer.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import {
  drawCraft,
  METRES_PER_UNIT,
  ShipDamage,
  drawShip,
  type CraftKind,
  type Livery,
  type Mount,
  type PropKind,
  type ShipView
} from '#lib/gfx/topdown/index.ts';
import { LIVERIES } from '#lib/gfx/topdown/palette.ts';
import { drawSprite, hullPoint, lightFrom } from '#lib/gfx/topdown/render.ts';
import { craftSprite, lodFor, propSprite, shipSprite, turretSprite } from '#lib/gfx/topdown/sprites.ts';

export interface Turret {
  m: Mount;
  a: number;
  cd: number;
  fire: number;
  burst?: number;
}

export type CraftDraw = Omit<Partial<ShipView>, 'cut'> & { cutAt?: [number, 1 | -1] };

export class Craft {
  x = 0;
  y = 0;
  a = 0;
  thr = 0;
  dead = false;
  readonly len: number;
  readonly half: number;
  readonly tur: Turret[];
  readonly extra: Turret[] = [];
  readonly damage = new ShipDamage();

  constructor(
    readonly spec: ShipSpec,
    public livery: Livery,
    o: { x?: number; y?: number; a?: number; thr?: number; dead?: boolean } = {}
  ) {
    Object.assign(this, o);
    const sp = shipSprite(spec, 3);
    this.len = sp.len;
    this.half = sp.half;
    this.tur = sp.mounts.map((m) => ({ m, a: m.face, cd: Math.random() * 2, fire: 0 }));
  }

  get sprite() {
    return shipSprite(this.spec, 3);
  }

  hit(xu: number, yu: number, r: number, sev: number): void {
    this.damage.hit(xu * METRES_PER_UNIT, yu * METRES_PER_UNIT, r * METRES_PER_UNIT, sev);
  }

  hull(xu: number, yu: number): [number, number] {
    return hullPoint(this.sprite, xu, yu);
  }

  world(xu: number, yu: number): [number, number] {
    const c = Math.cos(this.a),
      n = Math.sin(this.a);
    return [this.x + c * xu - n * yu, this.y + n * xu + c * yu];
  }

  draw(f: FB, X: number, Y: number, S: number, sun: number, frame: number, o: CraftDraw = {}): void {
    const { cutAt, ...rest } = o;
    drawShip(f, this.spec, {
      x: X,
      y: Y,
      angle: this.a,
      pxPerMetre: S / METRES_PER_UNIT,
      sun,
      frame,
      livery: this.livery,
      thrust: this.dead ? 0 : this.thr,
      dead: this.dead,
      damage: this.damage,
      aim: this.tur.map((t) => t.a),
      charging: this.tur.map((t) => t.fire > 0),
      ...(cutAt ? { cut: { at: cutAt[0] * METRES_PER_UNIT, keep: cutAt[1] } } : {}),
      ...rest
    });
    if (S < 0.7 || !this.extra.length) return;
    const lod = lodFor(S),
      c = Math.cos(this.a),
      n = Math.sin(this.a);
    for (const t of this.extra)
      drawSprite(
        f,
        turretSprite(t.m.type, lod),
        X + (c * t.m.x - n * t.m.y) * S,
        Y + (n * t.m.x + c * t.m.y) * S,
        this.a + t.a,
        LIVERIES[this.livery],
        {
          k: S / lod,
          light: lightFrom(sun),
          frame,
          dead: this.dead
        }
      );
  }
}

export interface SmallDraw {
  livery?: Livery;
  thrust?: number;
  ghost?: number;
}

export function small(
  f: FB,
  kind: CraftKind,
  X: number,
  Y: number,
  a: number,
  S: number,
  sun: number,
  frame: number,
  o: SmallDraw = {}
): void {
  const livery = o.livery ?? 'civ';
  if (!o.ghost) {
    drawCraft(
      f,
      kind,
      { x: X, y: Y, angle: a, pxPerMetre: S / METRES_PER_UNIT, sun, frame, thrust: o.thrust ?? 0 },
      livery
    );
    return;
  }
  const lod = lodFor(S);
  drawSprite(f, craftSprite(kind, lod), X, Y, a, LIVERIES[livery], {
    k: S / lod,
    light: lightFrom(sun),
    frame,
    ghost: o.ghost
  });
}

export interface PropDraw {
  livery?: Livery;
  dead?: boolean;
  lods?: readonly number[];
}

export function prop(
  f: FB,
  kind: PropKind,
  X: number,
  Y: number,
  a: number,
  S: number,
  sun: number,
  o: PropDraw = {}
): void {
  const lod = o.lods ? (o.lods.find((l) => l >= S * 0.999) ?? o.lods.at(-1)!) : lodFor(S);
  drawSprite(f, propSprite(kind, lod), X, Y, a, LIVERIES[o.livery ?? 'civ'], {
    k: S / lod,
    light: lightFrom(sun),
    dead: !!o.dead
  });
}
