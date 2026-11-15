import { PAL, type RGB } from '../palette';
import type { ShipSpec } from '../ships/specs';
import type { Component, Mount, Slot, Sprite } from './builder';
import { LIVERIES, SYSTEM_KINDS, type Livery } from './palette';
import { METRES_PER_UNIT, specParts, type PartTarget } from './parts';

export { METRES_PER_UNIT };
import {
  DEFAULT_LIGHT,
  damageMap,
  drawSprite,
  dropShadow,
  hullPoint,
  lightFrom,
  pickSprite,
  plume,
  type Hit,
  type Light,
  type Pixels
} from './render';
import {
  craftSprite,
  lodFor,
  propSprite,
  shipSprite,
  stationSprite,
  turretSprite,
  type CraftKind,
  type PropKind,
  type ShipSprite,
  type StationKind
} from './sprites';

export type { Component, Livery, Mount, PartTarget, Pixels, Slot, CraftKind, PropKind, StationKind };
export { LODS, spritesBuilt } from './sprites';
export { SYSTEMS, SYSTEM_KINDS, type SystemKind } from './palette';

export const detailLevel = (pxPerMetre: number): number => lodFor(pxPerMetre * METRES_PER_UNIT);

export class ShipDamage {
  readonly hits: Hit[] = [];
  private readonly maps = new WeakMap<Sprite, { n: number; d: Uint8Array }>();

  hit(x: number, y: number, radius: number, severity: number): void {
    this.hits.push([x / METRES_PER_UNIT, y / METRES_PER_UNIT, radius / METRES_PER_UNIT, severity]);
  }

  map(sp: Sprite): Uint8Array | null {
    if (!this.hits.length) return null;
    let c = this.maps.get(sp);
    if (!c) this.maps.set(sp, (c = { n: 0, d: new Uint8Array(sp.w * sp.h) }));
    if (c.n < this.hits.length) {
      damageMap(sp, this.hits, c.d, c.n);
      c.n = this.hits.length;
    }
    return c.d;
  }
}

export interface View {
  x: number;
  y: number;
  angle: number;
  pxPerMetre: number;
  sun?: number;
  frame?: number;
}

export interface ShipView extends View {
  livery?: Livery;
  thrust?: number;
  damage?: ShipDamage;
  aim?: readonly number[];
  swap?: { owner: ArrayLike<number>; livery: Livery };
  systems?: boolean;
  highlight?: number;
  dead?: boolean;
  cut?: { at: number; keep: 1 | -1 };
  build?: number;
  ghost?: number;
  clipX?: number;
  charging?: readonly boolean[];
}

export interface DrawnShip {
  readonly lod: number;
  readonly scale: number;
  readonly culled: boolean;
}

export const liveryOf = (cls: ShipSpec): Livery => cls.livery ?? (isArmed(cls) ? 'navy' : 'civ');

function isArmed(cls: ShipSpec): boolean {
  if (cls.bow === 'gun') return true;
  return cls.parts.some(
    ([core, top, bot]) => core === 'hangar' || [top, bot].some((a) => !!a && /^(turret|launcher|pod)/.test(a))
  );
}

const lightOf = (v: View): Light => (v.sun === undefined ? DEFAULT_LIGHT : lightFrom(v.sun));

export function shipLengthMetres(cls: ShipSpec): number {
  return specParts(cls).len * METRES_PER_UNIT;
}

export function shipBeamMetres(cls: ShipSpec): number {
  return (specParts(cls).half + 0.5) * 2 * METRES_PER_UNIT;
}

const unitsToMetres = (m: Mount): Mount => ({
  ...m,
  x: m.x * METRES_PER_UNIT,
  y: m.y * METRES_PER_UNIT
});

export function shipMounts(cls: ShipSpec): readonly Mount[] {
  return shipSprite(cls, 3).mounts.map(unitsToMetres);
}

export function shipComponents(cls: ShipSpec): readonly (Component | null)[] {
  return shipSprite(cls, 3).comps;
}

export function nearestHull(cls: ShipSpec, x: number, y: number): [number, number] {
  const [xu, yu] = hullPoint(shipSprite(cls, 3), x / METRES_PER_UNIT, y / METRES_PER_UNIT);
  return [xu * METRES_PER_UNIT, yu * METRES_PER_UNIT];
}

function toScreen(angle: number, xu: number, yu: number, X: number, Y: number, S: number): [number, number] {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [X + (c * xu - s * yu) * S, Y + (s * xu + c * yu) * S];
}

const WEAPON_SYSTEM = [null, { system: SYSTEM_KINDS.indexOf('weapon') }];

export function drawShip(fb: Pixels, cls: ShipSpec, v: ShipView): DrawnShip {
  const S = v.pxPerMetre * METRES_PER_UNIT,
    lod = lodFor(S),
    sp: ShipSprite = shipSprite(cls, lod),
    k = S / lod,
    R = sp.rad * k + 40 * S;
  const { x: X, y: Y, angle } = v;
  if (X < -R || Y < -R || X > fb.w + R || Y > fb.h + R) return { lod, scale: k, culled: true };
  const livery = v.livery ?? liveryOf(cls),
    pal = LIVERIES[livery],
    light = lightOf(v),
    frame = v.frame ?? 0,
    thr = v.thrust ?? 0,
    pal2 = v.swap ? LIVERIES[v.swap.livery] : undefined,
    own = v.swap?.owner ?? null,
    cut = v.cut ? v.cut.keep * (sp.pvx + (v.cut.at / METRES_PER_UNIT) * lod) : 0;
  if (!v.dead && thr > 0.02 && v.build == null && !v.ghost && !cut)
    for (const n of sp.nozzles) {
      const [nx, ny] = toScreen(angle, n.x + 0.4, n.y, X, Y, S);
      plume(
        fb,
        nx,
        ny,
        angle,
        n.r * S,
        n.r * S * (2.5 + thr * (n.r > 2 ? 4.5 : 6)) * (0.9 + 0.1 * Math.sin(frame * 0.7)),
        livery === 'foe',
        frame
      );
    }
  const dm = v.damage ? v.damage.map(sp) : null;
  drawSprite(fb, sp, X, Y, angle, pal, {
    k,
    light,
    frame,
    dm,
    thr,
    dead: !!v.dead,
    hi: v.highlight ?? 0,
    systems: v.systems ? sp.comps : null,
    build: v.build ?? null,
    own,
    ...(pal2 ? { pal2 } : {}),
    ghost: v.ghost ?? 0,
    cut,
    ...(v.clipX !== undefined ? { maxX: v.clipX } : {})
  });
  if ((v.build == null || v.build >= 1) && S >= 0.7)
    sp.mounts.forEach((m, i) => {
      if (cut) {
        const q = sp.pvx + m.x * lod;
        if (cut > 0 ? q > cut - 8 : q < -cut + 8) return;
      }
      const ts = turretSprite(m.type, lod),
        [tx, ty] = toScreen(angle, m.x, m.y, X, Y, S),
        ow = own ? own[m.comp] : 0;
      if (S >= 3 && !v.ghost) dropShadow(fb, tx, ty, Math.round(S * 1.1), light);
      drawSprite(fb, ts, tx, ty, angle + (v.aim?.[i] ?? m.face), ow === 2 && pal2 ? pal2 : pal, {
        k,
        light,
        frame,
        dead: !!v.dead,
        charge: !!v.charging?.[i],
        hi: v.highlight === m.comp ? 1 : 0,
        systems: v.systems ? WEAPON_SYSTEM : null,
        ghost: v.ghost ?? 0,
        ...(v.clipX !== undefined ? { maxX: v.clipX } : {})
      });
    });
  return { lod, scale: k, culled: false };
}

export const PLUME_UNITS = 9;

export interface Fit {
  readonly x: number;
  readonly y: number;
  readonly pxPerMetre: number;
}

export function fitShip(cls: ShipSpec, w: number, h: number, pad = 2, plumeRoom = false): Fit {
  const { len, half } = specParts(cls);
  const tail = plumeRoom && cls.stern ? PLUME_UNITS : 0,
    beam = (half + 0.5) * 2;
  const S = Math.min((w - 2 * pad) / Math.max(1, len + tail), (h - 2 * pad) / Math.max(1, beam), 12);
  return { x: w / 2 + (tail * S) / 2, y: h / 2, pxPerMetre: S / METRES_PER_UNIT };
}

export function iconScale(cls: ShipSpec, sizePx: number): number {
  const { len, half } = specParts(cls);
  return sizePx / Math.max(len, (half + 0.5) * 2, 1) / METRES_PER_UNIT;
}

export function drawShipIcon(
  fb: Pixels,
  cls: ShipSpec,
  x: number,
  y: number,
  angle: number,
  sizePx: number,
  v: Partial<ShipView> = {}
): DrawnShip {
  return drawShip(fb, cls, { ...v, x, y, angle, pxPerMetre: iconScale(cls, sizePx) });
}

export interface ShipPick {
  readonly comp: number;
  readonly component: Component;
  readonly x: number;
  readonly y: number;
}

export function pickShip(cls: ShipSpec, v: ShipView, sx: number, sy: number): ShipPick | null {
  const S = v.pxPerMetre * METRES_PER_UNIT,
    lod = lodFor(S),
    sp = shipSprite(cls, lod),
    k = S / lod;
  if (S >= 0.7)
    for (let i = sp.mounts.length - 1; i >= 0; i--) {
      const m = sp.mounts[i]!,
        [tx, ty] = toScreen(v.angle, m.x, m.y, v.x, v.y, S);
      if (pickSprite(turretSprite(m.type, lod), tx, ty, v.angle + (v.aim?.[i] ?? m.face), sx, sy, k)) {
        const component = sp.comps[m.comp];
        if (component) return { comp: m.comp, component, x: m.x * METRES_PER_UNIT, y: m.y * METRES_PER_UNIT };
      }
    }
  const p = pickSprite(sp, v.x, v.y, v.angle, sx, sy, k);
  const component = p ? sp.comps[p.comp] : null;
  return p && component
    ? {
        comp: p.comp,
        component,
        x: p.xu * METRES_PER_UNIT,
        y: p.yu * METRES_PER_UNIT
      }
    : null;
}

const HOSTILE: readonly RGB[] = [
  [239, 111, 94],
  [168, 64, 70],
  [96, 36, 58]
];

export function silhouette(fb: Pixels, cls: ShipSpec, v: ShipView, background: RGB = PAL.bg): void {
  const d = fb.d,
    frame = v.frame ?? 0;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = background[0];
    d[i + 1] = background[1];
    d[i + 2] = background[2];
  }
  drawShip(fb, cls, { ...v, livery: 'foe', thrust: 0 });
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === background[0] && d[i + 1] === background[1] && d[i + 2] === background[2]) continue;
    const l = d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11,
      y = Math.floor(i / 4 / fb.w),
      k = (y + (frame >> 1)) % 4 === 0 ? 0.6 : 1;
    const c = HOSTILE[l > 140 ? 0 : l > 70 ? 1 : 2]!;
    d[i] = c[0] * k;
    d[i + 1] = c[1] * k;
    d[i + 2] = c[2] * k;
  }
}

function drawFixed(fb: Pixels, sp: Sprite, lod: number, v: View, livery: Livery): void {
  const S = v.pxPerMetre * METRES_PER_UNIT;
  drawSprite(fb, sp, v.x, v.y, v.angle, LIVERIES[livery], {
    k: S / lod,
    light: lightOf(v),
    frame: v.frame ?? 0
  });
}

export function drawStation(fb: Pixels, kind: StationKind, v: View, livery: Livery = 'civ'): void {
  const lod = Math.min(6, lodFor(v.pxPerMetre * METRES_PER_UNIT));
  drawFixed(fb, stationSprite(kind, lod), lod, v, livery);
}

export function drawProp(fb: Pixels, kind: PropKind, v: View, livery: Livery = 'civ'): void {
  const lod = lodFor(v.pxPerMetre * METRES_PER_UNIT);
  drawFixed(fb, propSprite(kind, lod), lod, v, livery);
}

export function drawCraft(
  fb: Pixels,
  kind: CraftKind,
  v: View & { thrust?: number },
  livery: Livery = 'navy'
): void {
  const S = v.pxPerMetre * METRES_PER_UNIT,
    lod = lodFor(S),
    sp = craftSprite(kind, lod);
  const thr = v.thrust ?? 0;
  if (thr > 0.02 && S >= 1.2)
    plume(
      fb,
      v.x - Math.cos(v.angle) * 2 * S,
      v.y - Math.sin(v.angle) * 2 * S,
      v.angle,
      0.45 * S,
      2.2 * S * thr,
      livery === 'foe',
      v.frame ?? 0
    );
  drawFixed(fb, sp, lod, v, livery);
}
