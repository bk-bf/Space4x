import { hash } from '../math';
import type { ShipSpec } from '../ships/specs';
import { Builder, type Sprite } from './builder';
import { M, PLATED } from './palette';
import { buildParts, specParts, type LaidPart } from './parts';

export const LODS = [0.375, 0.75, 1.5, 3, 6, 12] as const;

export const lodFor = (S: number): number => LODS.find((l) => l >= S * 0.999) ?? 12;

export interface ShipSprite extends Sprite {
  readonly spec: ShipSpec;
  readonly parts: readonly LaidPart[];
  readonly partComps: readonly number[];
}

const ships = new WeakMap<ShipSpec, Map<number, ShipSprite>>();

let built = 0;

export const spritesBuilt = (): number => built;

const BODY_KINDS = new Set(['hull', 'armor', 'crew', 'hangar', 'fuel', 'reactor']);
const STRIPE_KINDS = new Set(['hull', 'armor', 'engines', 'big', 'crew', 'reactor']);

function buildShip(spec: ShipSpec, S: number): ShipSprite {
  const { parts, len, half } = specParts(spec);
  const b = new Builder(len, half + 0.5, S);
  const partComps = buildParts(b, parts);
  let wide: LaidPart | null = null;
  for (const p of parts) if (BODY_KINDS.has(p.k) && (!wide || p.hw > wide.hw)) wide = p;
  let stripes = 0;
  parts.forEach((p, i) => {
    if (!STRIPE_KINDS.has(p.k) || stripes >= 2) return;
    stripes++;
    const xs = p.x + p.L - 2.2,
      comp = partComps[i];
    b.each(xs, -p.hw, xs + 1.1, p.hw, (k) => {
      if (PLATED[b.m[k]!] && b.c[k] === comp) b.m[k] = M.accent;
    });
    b.each(xs + 1.3, -p.hw, xs + 1.3 + 0.34, p.hw, (k) => {
      if (PLATED[b.m[k]!] && b.c[k] === comp) b.m[k] = M.white;
    });
  });
  const plateAt = [...parts.keys()].reverse().find((i) => parts[i]!.k === 'armor' || parts[i]!.k === 'hull');
  const textPart = plateAt !== undefined ? plateAt : wide ? parts.indexOf(wide) : -1;
  if (textPart >= 0 && spec.code) b.text(spec.code, parts[textPart]!.x + 0.7, 1.5, partComps[textPart]!);
  if (wide) {
    b.light(wide.x + wide.L / 2, -wide.hw + 0.15, 3);
    b.light(wide.x + wide.L / 2, wide.hw - 0.2, 4);
  }
  if (parts.length) {
    b.light(len - 0.3, 0, 5);
    b.light(0.2 + (parts[0]!.k === 'big' ? 7 : 3), 0, 5);
  }
  b.finish();
  built++;
  return Object.assign(b, { spec, parts, partComps });
}

export function shipSprite(spec: ShipSpec, S: number): ShipSprite {
  let byLod = ships.get(spec);
  if (!byLod) ships.set(spec, (byLod = new Map()));
  let sp = byLod.get(S);
  if (!sp) byLod.set(S, (sp = buildShip(spec, S)));
  return sp;
}

const others = new Map<string, Sprite>();

function cached(key: string, make: () => Sprite): Sprite {
  let sp = others.get(key);
  if (!sp) {
    others.set(key, (sp = make()));
    built++;
  }
  return sp;
}

export type TurretKind = 'beam' | 'pd';

export function turretSprite(type: TurretKind, S: number): Sprite {
  return cached(`T${type}@${S}`, () => {
    const pd = type === 'pd',
      b = new Builder(pd ? 4.4 : 8, pd ? 1.4 : 2.3, S);
    b.comp = 1;
    if (pd) {
      b.cyl(1.3, 0, 1.1, 1.8, M.hull2);
      b.box(1.6, -0.3, 4.2, 0.3, 1.4, M.engine, { b: 0.8 });
      b.each(3.9, -0.3, 4.3, 0.3, (k) => {
        if (b.m[k]) b.e[k] = 11;
      });
    } else {
      b.cyl(2.2, 0, 1.9, 2.2, M.hull2, { b: 1.6 });
      b.box(1, -1.35, 3.9, 1.35, 3, M.armor, { b: 1.4 });
      b.box(1.5, -0.7, 3, 0.7, 3.5, M.hull2, { b: 1 });
      for (const s of [-1, 1]) {
        b.tube(3.6, 7.6, s * 0.75, 0.36, 2.5, (_x, _y, i) => (i % 4 === 0 ? M.dark : M.engine), {
          base: 1.4
        });
        b.each(7.2, s * 0.75 - 0.3, 7.7, s * 0.75 + 0.3, (k) => {
          if (b.m[k]) b.e[k] = 10;
        });
      }
      b.each(1.2, -1.1, 1.2 + 1.2 / S, 1.1, (k, _i, j) => {
        if (b.m[k] && j % 2) b.t[k] = -2;
      });
    }
    b.finish(b.pad + (pd ? 1.3 : 2.2) * S);
    b.muzzle = pd ? 3.1 : 5.6;
    return b;
  });
}

export type CraftKind = 'fighter' | 'shuttle';

export function craftSprite(kind: CraftKind, S: number): Sprite {
  return cached(`C${kind}@${S}`, () => {
    let b: Builder;
    if (kind === 'fighter') {
      b = new Builder(4.6, 2.1, S);
      b.comp = 1;
      b.shape(
        0.4,
        -2,
        3.4,
        2,
        (x, y) => (Math.abs(y) < 1.9 * (1 - (x - 0.4) / 3) ? 0.9 : 0),
        (x, y) => (Math.abs(y) > 1.9 * (1 - (x - 0.4) / 3) - 0.45 ? M.accent : M.hull)
      );
      b.tube(0.3, 4.4, 0, 0.6, 1.7, (x) => (x > 3 && x < 3.8 ? M.glass : M.hull2), { cap: true, base: 0.8 });
      b.each(0.3, -0.3, 0.8, 0.3, (k) => {
        if (b.m[k]) b.e[k] = 6;
      });
      b.nozzles.push({ x: 0.3 - 2.3, y: 0, r: 0.45 });
    } else {
      b = new Builder(3.6, 1.3, S);
      b.comp = 1;
      b.box(0.3, -1, 3.2, 1, 1.6, M.white, { b: 1 });
      b.box(2.4, -0.7, 3.3, 0.7, 1.9, M.glass, { b: 0.8 });
      b.each(0.3, -0.6, 0.7, 0.6, (k) => {
        if (b.m[k]) b.e[k] = 6;
      });
      b.each(1.2, -1, 1.6, 1, (k) => {
        if (b.m[k]) b.m[k] = M.accent;
      });
      b.nozzles.push({ x: 0.3 - 1.8, y: 0, r: 0.4 });
    }
    return b.finish();
  });
}

export type PropKind = 'crate' | 'pylon' | 'tank' | 'dropship' | 'colony' | 'bunker';

const radiatorMat = (_x: number, _y: number, i: number) => (i % 5 === 0 ? M.dark : M.radiator);
const radiatorGlow = (_x: number, _y: number, i: number, j: number) => (i % 5 && j % 3 === 1 ? 8 : 0);

function crate(S: number): Builder {
  const b = new Builder(2.6, 1.3, S);
  b.comp = 1;
  b.box(0.2, -1, 2.4, 1, 1.8, (_x, _y, i) => (i % 4 === 0 ? M.dark : M.gold), { b: 1 });
  b.each(1, -0.3, 1.6, 0.3, (k) => {
    if (b.m[k]) b.e[k] = 7;
  });
  return b;
}

function pylon(S: number): Builder {
  const b = new Builder(30, 10, S);
  b.begin('dock', 'Gate pylon');
  const p = { x: 0, L: 17, hw: 6.5, prev: 4, next: 3.5 };
  const xa = p.x,
    xb = p.x + p.L,
    a = Math.max(p.prev, p.hw * 0.5),
    e = Math.max(p.next, p.hw * 0.5);
  b.slabF(xa, xb, (x) => Math.min(p.hw, a + (x - xa) * 1.2, e + (xb - x) * 1.2), p.hw, 5, M.armor, {
    side: 0.35
  });
  b.plates(xa, xb, p.hw);
  b.greebles(xa, xb, p.hw);
  b.box(2, -3.4, 14, 3.4, 6.4, M.hull2, { b: 2 });
  b.plates(2, 14, 3.4);
  b.greebles(2, 14, 3.4, 60);
  b.dome(8, 0, 2.6, 9, (x, y) => (Math.hypot(x - 8, y) < 1.1 ? M.glass : M.dark), {
    base: 6.4,
    e: (x, y) => (Math.hypot(x - 8, y) < 1.1 ? 7 : 0)
  });
  for (const s of [-1, 1]) {
    b.box(3, s * 7.4 - 1.6, 9, s * 7.4 + 1.6, 1.4, radiatorMat, { e: radiatorGlow });
    b.tube(15, 27, s * 4.2, 1, 4, (_x, _y, i) => (i % 4 === 0 ? M.dark : M.engine), { base: 2 });
    b.each(26.2, s * 4.2 - 0.7, 27, s * 4.2 + 0.7, (k) => {
      if (b.m[k]) b.e[k] = 10;
    });
  }
  b.tube(16, 24, 0, 2.4, 5.4, (_x, _y, i) => (i % 3 === 0 ? M.gold : M.white), {
    rf: (x) => 2.4 + (x - 16) * 0.22,
    rmax: 4.4,
    base: 2
  });
  b.each(23.2, -3.6, 24.2, 3.6, (k) => {
    if (b.m[k]) b.e[k] = 7;
  });
  b.light(1, -5, 3);
  b.light(1, 4.8, 4);
  return b;
}

function tank(S: number): Builder {
  const b = new Builder(9, 3, S);
  b.comp = 1;
  for (const s of [-1, 1])
    b.box(0.3, s * 2 - 0.75, 8, s * 2 + 0.75, 1.2, (_x, _y, i) => (i % 2 ? M.dark : M.engine), { b: 0.6 });
  b.box(0.8, -1.7, 7.6, 1.7, 1.9, M.armor, { b: 1 });
  b.cyl(3.6, 0, 1.6, 2.9, M.hull, { b: 1 });
  b.box(4.6, -0.3, 8.8, 0.3, 2.4, M.engine, { b: 0.5 });
  b.each(1.2, -1.2, 1.8, 1.2, (k) => {
    if (b.m[k]) b.m[k] = M.accent;
  });
  return b;
}

function dropship(S: number): Builder {
  const b = new Builder(36, 13, S);
  b.begin('hull', 'Dropship');
  b.slabF(2, 34, (x) => (x < 24 ? 4.6 : 4.6 * (1 - Math.pow((x - 24) / 10, 1.6) * 0.75)), 4.6, 4, M.hull, {
    bx: 2
  });
  b.plates(2, 34, 4.6);
  b.greebles(2, 30, 4.6, 70);
  b.shape(
    8,
    -12.5,
    22,
    12.5,
    (x, y) => (Math.abs(y) < 4 + 8.5 * (1 - Math.abs(x - 14) / 8) && Math.abs(y) > 3 ? 2.2 : 0),
    (x, y) => (Math.abs(y) > 2.6 + 8.5 * (1 - Math.abs(x - 14) / 8) ? M.accent : M.armor)
  );
  for (const sx of [9.5, 18.5])
    for (const s of [-1, 1]) {
      b.cyl(sx, s * 8.2, 2.5, 3.6, M.engine, { b: 1.4 });
      b.cyl(sx, s * 8.2, 1.5, 3, M.pit, { e: 6 });
    }
  b.box(
    2.5,
    -3,
    9,
    3,
    2.2,
    (x, y, i, j) => ((i + j) % 4 < 2 && (Math.abs(y) > 2.4 || x < 3.2) ? M.hazard : M.deck),
    { b: 0.6 }
  );
  b.box(24, -2.2, 29.5, 2.2, 5, M.glass, { b: 2.4, e: (_x, _y, i, j) => ((i + j) % 3 === 0 ? 2 : 0) });
  b.box(12, -1.3, 22, 1.3, 5, M.hull2, { b: 1 });
  b.text('D-4', 12.4, 2, 1);
  b.light(14, -12, 3);
  b.light(14, 11.8, 4);
  b.light(33.5, 0, 5);
  return b;
}

function colony(S: number): Builder {
  const b = new Builder(170, 62, S);
  b.begin('armor', 'Perimeter wall');
  b.shape(
    0,
    -62,
    170,
    62,
    (x, y) => {
      const d = Math.min(x - 2, 168 - x, 60 - Math.abs(y));
      return d > 0 && d < 3 ? 2.6 : 0;
    },
    (_x, _y, i, j) => ((i + j) % 9 === 0 ? M.dark : M.armor)
  );
  b.begin('dock', 'Landing pad');
  b.cyl(
    34,
    -30,
    17,
    1,
    (x, y, i, j) => {
      const r = Math.hypot(x - 34, y + 30);
      if (r > 15) return (i + j) % 4 < 2 ? M.hazard : M.pit;
      return (Math.abs(x - 34) < 1.2 && Math.abs(y + 30) < 7) ||
        (Math.abs(y + 30) < 1.2 && Math.abs(x - 34) < 5)
        ? M.white
        : M.deck;
    },
    { b: 0.5 }
  );
  for (let a = 0; a < 8; a++) b.light(34 + Math.cos(a * 0.785) * 13, -30 + Math.sin(a * 0.785) * 13, 9);
  b.begin('crew', 'Habitat dome');
  for (const [dx, dy, r] of [
    [86, -22, 22],
    [128, 14, 17],
    [52, 26, 14]
  ] as const) {
    b.cyl(dx, dy, r + 1.5, 2, M.hull2, { b: 1 });
    b.dome(dx, dy, r, r * 0.7, (_x, _y, i, j) => (i % 7 === 0 || j % 7 === 0 ? M.white : M.teal), {
      base: 1.5,
      e: (_x, _y, i, j) => (i % 7 === 3 && j % 7 === 3 && hash(i, j, 5) > 0.45 ? 1 : 0)
    });
  }
  b.begin('crew', 'Barracks');
  for (const [x0, y0, w, h] of [
    [20, 8, 22, 9],
    [20, 22, 22, 9],
    [78, 30, 26, 10],
    [110, -44, 30, 10],
    [140, -24, 12, 26]
  ] as const) {
    b.box(x0, y0, x0 + w, y0 + h, 4, M.hull, { b: 1.4 });
    b.box(x0 + 2, y0 + 2, x0 + w - 2, y0 + h - 2, 5, (_x, _y, i) => (i % 6 === 0 ? M.dark : M.hull2), {
      b: 1
    });
    b.each(x0 + 1, y0 + 0.4, x0 + w - 1, y0 + 0.9, (k, i) => {
      if (b.m[k] && i % 3 === 0) b.e[k] = 1;
    });
  }
  b.begin('power', 'Reactor');
  b.cyl(146, 36, 9, 5, M.armor, { b: 2 });
  b.dome(146, 36, 5.5, 9, (x, y) => (Math.hypot(x - 146, y - 36) < 2 ? M.glass : M.dark), {
    base: 5,
    e: (x, y) => (Math.hypot(x - 146, y - 36) < 2 ? 7 : 0)
  });
  for (const s of [-1, 1])
    b.box(134, 36 + s * 12 - 2, 158, 36 + s * 12 + 2, 1.2, radiatorMat, { e: radiatorGlow });
  b.begin('hull', 'Transit tube');
  for (const [x0, y0, x1, y1] of [
    [51, -30, 66, -28],
    [86, 0, 88, 30],
    [100, -8, 128, -6],
    [128, -4, 130, 0],
    [42, 12, 52, 14],
    [66, 26, 78, 34]
  ] as const)
    b.box(x0, y0, x1, y1, 1.6, M.truss, { b: 0.6 });
  b.begin('sensor', 'Comm tower');
  b.cyl(66, -48, 3.4, 3, M.engine);
  b.cyl(66, -48, 1.4, 9, M.white);
  b.light(66, -48, 3);
  b.shape(
    60,
    -54,
    72,
    -42,
    (x, y) => {
      const d = ((x - 66) ** 2 + (y + 48) ** 2) / 36;
      return d < 1 && d > 0.12 ? 3 + d * 2.4 : 0;
    },
    M.white
  );
  return b;
}

function bunker(S: number): Builder {
  const b = new Builder(10, 5, S);
  b.comp = 1;
  b.cyl(5, 0, 4.6, 2.4, (_x, _y, i, j) => ((i + j) % 7 === 0 ? M.dark : M.armor), { b: 2 });
  b.cyl(5, 0, 2.6, 3.2, M.dark, { b: 1 });
  return b;
}

const PROPS: Readonly<Record<PropKind, (S: number) => Builder>> = {
  crate,
  pylon,
  tank,
  dropship,
  colony,
  bunker
};

export function propSprite(kind: PropKind, S: number): Sprite {
  return cached(`P${kind}@${S}`, () => {
    const b = PROPS[kind](S);
    return b.finish(kind === 'pylon' ? b.pad : undefined);
  });
}

export type StationKind = 'core' | 'ring';

const TAU = 6.2832;

function ring(b: Builder, R: number, cx: number, S: number): void {
  b.begin('crew', 'Habitat ring');
  b.shape(
    0,
    -R,
    2 * R,
    R,
    (x, y) => {
      const r = Math.hypot(x - cx, y),
        t = (r - 30) / 3;
      return Math.abs(t) < 1 ? 3 + 3.4 * Math.sqrt(1 - t * t) : 0;
    },
    (x, y) => {
      const a = Math.atan2(y, x - cx);
      return Math.floor((((a + 7) * 12) / TAU) * 4) % 4 === 0 ? M.dark : M.hull2;
    },
    {
      e: (x, y, i, j) => {
        const r = Math.hypot(x - cx, y),
          a = Math.atan2(y, x - cx);
        return Math.abs(Math.abs(r - 30) - 1.5) < 0.5 / S + 0.06 &&
          Math.floor((a + 7) * 150) % 3 === 0 &&
          hash(i, j, 4) > 0.3
          ? 1
          : 0;
      }
    }
  );
  for (let s = 0; s < 6; s++) {
    const a = (s * TAU) / 6 + 0.26,
      c = Math.cos(a),
      sn = Math.sin(a);
    b.shape(
      0,
      -R,
      2 * R,
      R,
      (x, y) => {
        const u = (x - cx) * c + y * sn,
          v = -(x - cx) * sn + y * c;
        return u > 9 && u < 28 && Math.abs(v) < 0.7 ? 2.6 : 0;
      },
      (_x, _y, i, j) => ((i + j) % 3 ? M.truss : M.white)
    );
  }
}

function core(b: Builder, R: number, cx: number): void {
  b.begin('dock', 'Station core');
  b.shape(
    0,
    -R,
    2 * R,
    R,
    (x, y) =>
      Math.abs(y) < 1.6 && Math.abs(x - cx) < 44 ? 2.4 : Math.abs(x - cx) < 1.6 && Math.abs(y) < 44 ? 2.4 : 0,
    (_x, _y, i, j) => ((i + j) % 4 === 0 || (i - j + 800) % 4 === 0 ? M.truss : M.engine)
  );
  b.cyl(cx, 0, 11, 6, M.armor, { b: 3 });
  b.plates(cx - 11, cx + 11, 11);
  b.cyl(cx, 0, 7.5, 8, M.hull, { b: 2 });
  b.plates(cx - 7.5, cx + 7.5, 7.5);
  b.greebles(cx - 7, cx + 7, 7, 60);
  b.dome(cx, 0, 4, 12, (x, y) => (Math.hypot(x - cx, y) < 1.4 ? M.glass : M.hull2), {
    base: 8,
    e: (x, y) => (Math.hypot(x - cx, y) < 1.4 ? 7 : 0)
  });
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    b.light(cx + Math.cos(a) * 9.4, Math.sin(a) * 9.4, k % 2 ? 1 : 2);
  }
  b.begin('power', 'Solar farm');
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (let q = 0; q < 2; q++) {
        const xa = cx + sx * (3 + q * 7.4) - (sx < 0 ? 6.6 : 0),
          ya = sy > 0 ? 33 : -44.5;
        b.shape(
          xa,
          ya,
          xa + 6.6,
          ya + 11.5,
          () => 1.2,
          (_x, _y, i, j) => (i % 5 === 0 || j % 5 === 0 ? M.white : M.solar)
        );
        b.each(xa, ya, xa + 6.6, ya + 11.5, (k, i, j) => {
          if (b.m[k] === M.solar)
            b.t[k] = hash(Math.floor(i / 5), Math.floor(j / 5), 3 + q) > 0.6 ? 1 : (i + j) % 2 ? 0 : -1;
        });
      }
  b.begin('power', 'Radiators');
  for (const sy of [-1, 1])
    for (const sx of [-1, 1])
      b.shape(
        cx + sx * 4 - (sx < 0 ? 9 : 0),
        sy * 20 - 1.6,
        cx + sx * 4 + (sx < 0 ? 0 : 9),
        sy * 20 + 1.6,
        () => 1.5,
        radiatorMat,
        { e: radiatorGlow }
      );
  b.begin('dock', 'Docking arm');
  for (const sx of [-1, 1]) {
    const xe = cx + sx * 43;
    b.box(Math.min(xe - sx * 6, xe + sx * 2.5), -3, Math.max(xe - sx * 6, xe + sx * 2.5), 3, 4, M.hull2, {
      b: 1.6
    });
    b.cyl(xe, 0, 2.2, 4.8, (x, y, i, j) =>
      Math.hypot(x - xe, y) < 1.2 ? M.pit : (i + j) % 4 < 2 ? M.hazard : M.dark
    );
    b.light(xe, -2.6, 4);
    b.light(xe, 2.5, 4);
  }
  b.begin('sensor', 'Traffic control array');
  for (const [dx, dy] of [
    [-17, -8],
    [17, 8]
  ] as const) {
    b.cyl(cx + dx, dy, 1, 3.6, M.engine);
    b.shape(
      cx + dx - 3,
      dy - 3,
      cx + dx + 3,
      dy + 3,
      (x, y) => {
        const d = ((x - cx - dx) ** 2 + (y - dy) ** 2) / 9;
        return d < 1 ? 3 + d * 2 : 0;
      },
      (x, y) => (Math.hypot(x - cx - dx, y - dy) < 0.6 ? M.gold : M.white)
    );
  }
}

export function stationSprite(kind: StationKind, S: number): Sprite {
  return cached(`S${kind}@${S}`, () => {
    const R = 46,
      b = new Builder(R * 2, R, S);
    if (kind === 'ring') ring(b, R, R, S);
    else core(b, R, R);
    return b.finish();
  });
}
