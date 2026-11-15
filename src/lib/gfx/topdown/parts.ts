import { hash } from '../math';
import type { AttachmentKey, BowKey, CoreKey, ShipSpec, SternKey } from '../ships/specs';
import type { Builder, SlabOptions, Slot } from './builder';
import { M, PLATED } from './palette';

export const METRES_PER_UNIT = 5;

export type PartTarget = { kind: 'stern' | 'aft' | 'bow' } | { kind: 'section'; index: number };

type BodyKey = CoreKey | SternKey | BowKey;

export interface LaidPart {
  readonly k: BodyKey;
  readonly target: PartTarget;
  readonly n: number;
  readonly top?: string;
  readonly bot?: string;
  readonly L: number;
  readonly hw: number;
  readonly x: number;
  readonly prev: number;
  readonly next: number;
}

interface BodyPart {
  x: number;
  L: number;
  hw: number;
  prev: number;
  next: number;
}

export const PLEN: Readonly<Record<BodyKey, number>> = {
  hull: 8,
  crew: 8,
  reactor: 6,
  fuel: 8,
  armor: 8,
  truss: 8,
  tank: 13,
  ring: 6,
  hangar: 14,
  bridge: 12,
  blunt: 5,
  gun: 17,
  prow: 11,
  dock: 4,
  engines: 8,
  big: 12
};

const PHW: Readonly<Partial<Record<BodyKey, number>>> = {
  hull: 5,
  crew: 5.5,
  reactor: 5,
  fuel: 5,
  armor: 7,
  truss: 1.3,
  tank: 6,
  ring: 2.2,
  hangar: 8,
  bridge: 5,
  blunt: 4.6,
  gun: 4.6,
  prow: 7,
  dock: 3,
  big: 6
};

const PZ: Readonly<Partial<Record<BodyKey, number>>> = {
  hull: 4,
  crew: 4,
  reactor: 4,
  fuel: 3.4,
  armor: 5,
  truss: 2.2,
  tank: 6.5,
  ring: 3,
  hangar: 5
};

const AEXT: Readonly<Partial<Record<AttachmentKey, number>>> = {
  solar: 13,
  radiator: 8.5,
  pod: 4.2,
  fin: 5.2,
  antenna: 6,
  cargo: 0
};

const CONT = [M.rust, M.teal, M.yellow, M.white, M.rust, M.teal, M.hull2];

const ATTACHMENT = /^(\D+)(\d*)$/;

export function parseAttachment(a: string): [AttachmentKey, number] {
  const m = ATTACHMENT.exec(a);
  return [(m?.[1] ?? a) as AttachmentKey, Number(m?.[2]) || 1];
}

function body(b: Builder, p: BodyPart, z: number, mat: number = M.hull, o: SlabOptions = {}): void {
  const xa = p.x,
    xb = p.x + p.L,
    a = Math.max(p.prev, p.hw * 0.5),
    e = Math.max(p.next, p.hw * 0.5);
  b.slabF(xa, xb, (x) => Math.min(p.hw, a + (x - xa) * 1.2, e + (xb - x) * 1.2), p.hw, z, mat, o);
  b.plates(xa, xb, p.hw);
  b.greebles(xa, xb, p.hw, o.dens);
}

type PartBuild = (b: Builder, p: LaidPart) => void;

const PART: Readonly<Record<BodyKey, PartBuild>> = {
  hull(b, p) {
    b.begin('hull', 'Hull section');
    body(b, p, 4);
    b.box(p.x + 0.6, -1.3, p.x + p.L - 0.6, 1.3, 4.9, (_x, _y, i) => (i % 7 === 3 ? M.dark : M.hull2));
  },
  crew(b, p) {
    b.begin('crew', 'Crew quarters');
    body(b, p, 4);
    const xa = p.x + 1,
      xb = p.x + p.L - 1;
    b.box(xa, -3.2, xb, 3.2, 5.6, M.hull2, { b: 1.6 });
    b.box(xa + 1.2, -1.6, xb - 1.2, 1.6, 6.4, M.hull, { b: 1.2 });
    for (const y of [-2.75, 2.55])
      b.each(xa + 0.5, y, xb - 0.5, y + 0.01, (k, i) => {
        if (i % 2 === 0 && hash(i, k, 3) > 0.22) b.e[k] = 1;
      });
    if (b.S >= 6)
      for (const y of [-1.25, 1.1])
        b.each(xa + 1.6, y, xb - 1.6, y + 0.01, (k, i) => {
          if (i % 3 === 0 && hash(i, k, 5) > 0.3) b.e[k] = 1;
        });
  },
  reactor(b, p) {
    b.begin('power', 'Fusion reactor');
    body(b, p, 4);
    const cx = p.x + p.L / 2;
    b.cyl(cx, 0, 2.9, 4.8, M.engine);
    b.dome(cx, 0, 2.3, 6.6, (x, y) => (Math.hypot(x - cx, y) < 1 ? M.glass : M.dark), {
      e: (x, y) => (Math.hypot(x - cx, y) < 1 ? 7 : 0),
      base: 4.8
    });
    for (const s of [-1, 1])
      b.box(p.x + 0.8, s * 3.5 - 0.45, p.x + p.L - 0.8, s * 3.5 + 0.45, 4.5, M.radiator, {
        e: (_x, _y, i) => (i % 2 ? 8 : 0)
      });
  },
  fuel(b, p) {
    b.begin('store', 'Fuel bunkers');
    body(b, p, 3.4);
    const cx = p.x + p.L / 2;
    b.tube(p.x + 0.7, p.x + p.L - 0.7, 2.5, 2.1, 5.6, (x) => (Math.abs(x - cx) < 0.5 ? M.gold : M.white), {
      sym: true,
      cap: true,
      base: 3.2
    });
    b.box(p.x + 1, -0.35, p.x + p.L - 1, 0.35, 4.2, M.engine);
  },
  armor(b, p) {
    b.begin('armor', 'Armour belt');
    body(b, p, 5, M.armor, { side: 0.42, dens: 200 });
    b.box(p.x + 1, -1, p.x + p.L - 1, 1, 5.6, M.hull, { b: 1 });
  },
  truss(b, p) {
    b.begin('hull', 'Truss spine');
    b.shape(
      p.x,
      -1.3,
      p.x + p.L,
      1.3,
      (_x, y) => 2.2 * Math.min(1, (1.3 - Math.abs(y)) * 2 + 0.4),
      (_x, y, i, j) =>
        Math.abs(y) > 0.95 || (i + j) % 5 === 0 || (i - j + 400) % 5 === 0
          ? M.truss
          : b.S >= 3
            ? M.pit
            : M.engine
    );
  },
  tank(b, p) {
    b.begin('store', 'Pressure tank');
    const cx = p.x + p.L / 2;
    b.box(p.x, -1, p.x + p.L, 1, 2.2, M.truss);
    b.dome(
      cx,
      0,
      6,
      7,
      (x, y) => {
        const r = Math.hypot(x - cx, y);
        return r > 2.6 && r < 3.3 ? M.gold : Math.abs(y) < 0.3 && r > 3.3 ? M.dark : M.white;
      },
      { base: 1 }
    );
    b.cyl(cx, 0, 0.9, 7.5, M.engine);
  },
  ring(b, p) {
    b.begin('crew', 'Habitat ring');
    const cx = p.x + p.L / 2,
      r = p.L / 2 - 0.6;
    b.box(p.x, -2.2, p.x + p.L, 2.2, 3, M.hull);
    b.shape(
      cx - r,
      -12.5,
      cx + r,
      12.5,
      (x, y) => {
        const d = ((x - cx) / r) ** 2,
          ey = Math.min(1, (12.5 - Math.abs(y)) / 1.5 + 0.2);
        return d < 1 ? (2 + 3 * Math.sqrt(1 - d)) * ey : 0;
      },
      (_x, _y, _i, j) => (j % 9 === 0 ? M.dark : M.hull2),
      {
        e: (x, y, i, j) =>
          Math.abs(x - cx) < r * 0.45 &&
          Math.abs(Math.abs(x - cx) - r * 0.3) < 0.6 / b.S + 0.08 &&
          j % 3 === 1 &&
          hash(i, j, 2) > 0.25 &&
          Math.abs(y) > 2.6
            ? 1
            : 0
      }
    );
    b.cyl(cx, 0, 2.6, 5.6, M.armor);
  },
  hangar(b, p) {
    b.begin('hangar', 'Hangar deck');
    body(b, p, 5, M.armor, { side: 0.25, dens: 240 });
    const xa = p.x + 1.6,
      xb = p.x + p.L - 1.6,
      S = b.S;
    b.shape(
      xa,
      -4.6,
      xb,
      4.6,
      () => 2.4,
      (x, y, i, j) =>
        Math.abs(y) > 4.6 - 1.2 / S - 0.2 || x < xa + 1.4 / S + 0.15 || x > xb - 1.4 / S - 0.15
          ? (i + j) % 4 < 2
            ? M.hazard
            : M.pit
          : M.deck,
      {
        force: true,
        e: (_x, y, i) =>
          Math.abs(y) < 0.5 / S + 0.02 && i % 4 === 0
            ? 9
            : Math.abs(Math.abs(y) - 3.2) < 0.5 / S + 0.02 && i % 6 === 0
              ? 2
              : 0
      }
    );
    for (let n = 0; n < 4; n++) {
      const fx = xa + 1.6 + (n >> 1) * 4.4,
        fy = (n & 1 ? 1 : -1) * 2;
      b.shape(
        fx,
        fy - 1.1,
        fx + 2.6,
        fy + 1.1,
        (x, y) => (Math.abs(y - fy) < (0.35 + (fx + 2.6 - x) * 0.28) * (x > fx + 1.9 ? 0.5 : 1) ? 3.2 : 0),
        (x) => (x > fx + 1.7 ? M.glass : M.hull2)
      );
    }
  },
  engines(b, p) {
    const n = p.n,
      xa = p.x;
    b.begin('prop', n + ' × fusion drive');
    body(b, { ...p, x: xa + 2.6, L: p.L - 2.6, prev: p.hw * 0.75 }, 4.5);
    b.box(xa + 3.4, -p.hw + 1.2, xa + 4.6, p.hw - 1.2, 5.1, M.engine);
    for (let k = 0; k < n; k++) {
      const y0 = n > 1 ? (k - (n - 1) / 2) * ((2 * (p.hw - 1.9)) / (n - 1)) : 0,
        rf = (x: number) => 1.65 - (x - xa) * 0.16;
      b.tube(xa, xa + 3.6, y0, 1.65, 4.6, (_x, _y, i) => (i % 3 === 0 ? M.dark : M.engine), {
        rf,
        base: 1.6
      });
      b.shape(
        xa,
        y0 - 1.2,
        xa + 1.1,
        y0 + 1.2,
        (x, y) => (Math.abs(y - y0) < rf(x) * 0.68 ? 2.2 : 0),
        M.pit,
        {
          force: true,
          e: 6
        }
      );
      b.nozzles.push({ x: xa - b.len / 2, y: y0, r: 1.25 });
    }
  },
  big(b, p) {
    const xa = p.x;
    b.begin('prop', 'Main drive');
    body(b, { ...p, x: xa + 6, L: p.L - 6, prev: 3 }, 4.5);
    b.box(xa + 4.6, -2.4, xa + 7, 2.4, 4, M.truss);
    const rf = (x: number) => 5.7 - (x - xa) * 0.5;
    b.tube(
      xa,
      xa + 6.2,
      0,
      5.7,
      6,
      (_x, _y, i) => (i % 4 === 0 ? M.dark : i % 4 === 1 ? M.hull2 : M.engine),
      {
        rf,
        base: 1.5
      }
    );
    b.shape(xa, -4.6, xa + 1.9, 4.6, (x, y) => (Math.abs(y) < rf(x) * 0.78 ? 2 : 0), M.pit, {
      force: true,
      e: 6
    });
    b.nozzles.push({ x: xa - b.len / 2, y: 0, r: 4.2 });
    for (const s of [-1, 1])
      b.box(xa + 7.4, s * 4.3 - 0.5, xa + 11, s * 4.3 + 0.5, 4.9, M.radiator, {
        e: (_x, _y, i) => (i % 2 ? 8 : 0)
      });
  },
  bridge(b, p) {
    b.begin('bridge', 'Bridge');
    const xa = p.x,
      L = p.L,
      hwf = (x: number) => p.hw * (1 - Math.pow((x - xa) / L, 1.7) * 0.72);
    b.slabF(xa, xa + L, hwf, p.hw, 4, M.hull, { zf: (x) => 4 - ((x - xa) / L) * 0.9, bx: 2.5 });
    b.plates(xa, xa + L, p.hw);
    b.greebles(xa, xa + L, p.hw);
    b.box(xa + 0.8, -2.7, xa + 5.2, 2.7, 5.8, M.hull2, { b: 1.8 });
    b.box(xa + 1.6, -1.5, xa + 4.2, 1.5, 6.6, M.hull, { b: 1.2 });
    b.each(xa + 5.2 - 1.6 / b.S, -2.2, xa + 5.2 - 0.6 / b.S, 2.2, (k, _i, j) => {
      if (b.m[k] && j % 2 === 0) b.e[k] = 2;
    });
    for (const y of [-2.3, 2.1])
      b.each(xa + 1.2, y, xa + 4.6, y + 0.01, (k, i) => {
        if (i % 2 === 0 && b.m[k]) b.e[k] = 1;
      });
    b.cyl(xa + 7.6, 0, 1, 4.6, M.white);
    b.dome(xa + 7.6, 0, 0.7, 5.6, M.gold, { base: 4.6 });
    b.box(xa + 9, -0.3, xa + L - 0.4, 0.3, 4, M.engine);
  },
  blunt(b, p) {
    b.begin('bridge', 'Command cab');
    const xa = p.x,
      L = p.L;
    b.slabF(xa, xa + L, (x) => p.hw - ((x - xa) / L) * 1.3, p.hw, 4.2, M.hull2, { bx: 3 });
    b.plates(xa, xa + L, p.hw);
    b.each(xa + L - 1.5, -2.6, xa + L - 1.5 + 1.2 / b.S, 2.6, (k) => {
      if (b.m[k]) b.e[k] = 2;
    });
    b.box(xa + 0.6, -1.6, xa + 2.6, 1.6, 5, M.hull, { b: 1.2 });
  },
  gun(b, p) {
    b.begin('weapon', 'Spinal lance');
    const xa = p.x,
      xe = xa + p.L;
    b.slabF(xa, xa + 6.5, (x) => p.hw - ((x - xa) / 6.5) * 2.4, p.hw, 4, M.hull, { bx: 2 });
    b.plates(xa, xa + 6.5, p.hw);
    b.greebles(xa, xa + 6.5, p.hw);
    b.box(xa + 0.5, -1.5, xa + 6.2, 1.5, 5.2, M.armor, { b: 1.2 });
    b.tube(
      xa + 5.5,
      xe - 0.4,
      0,
      0.8,
      3.6,
      (x) => (Math.floor((x - xa) * 1.5) % 3 === 0 ? M.dark : M.engine),
      {
        base: 1.8
      }
    );
    for (const s of [-1, 1]) b.box(xa + 6, s * 1.5 - 0.25, xe - 3, s * 1.5 + 0.25, 2.6, M.truss);
    b.tube(xe - 2, xe, 0, 1.25, 4, M.hull2, { base: 2, cap: true });
    b.each(xe - 0.8, -0.5, xe - 0.1, 0.5, (k) => {
      if (b.m[k]) b.e[k] = 10;
    });
    b.spinal = { x: xe - b.len / 2, y: 0 };
  },
  prow(b, p) {
    b.begin('armor', 'Armoured prow');
    const xa = p.x,
      L = p.L,
      hwf = (x: number) => Math.max(0.5, p.hw * (1 - Math.pow((x - xa) / L, 1.5)));
    b.slabF(xa, xa + L, hwf, p.hw, 5, M.armor, { side: 0.5, zf: (x) => 5 - ((x - xa) / L) * 1.6, bx: 2.5 });
    b.plates(xa, xa + L, p.hw);
    b.each(xa + 1, -p.hw, xa + L, p.hw, (k, _i, _j, I, J) => {
      const x = (I + 0.5 - b.pad) / b.S - xa,
        y = Math.abs((J + 0.5 - b.cy) / b.S);
      if (PLATED[b.m[k]!] && Math.abs(x + y * 0.9 - 6.2) < 0.55) b.m[k] = M.accent;
    });
    b.each(xa + 1.5, -0.4, xa + 3, 0.4, (k) => {
      if (b.m[k]) b.e[k] = 2;
    });
  },
  dock(b, p) {
    b.begin('dock', 'Docking port');
    const cx = p.x + p.L / 2;
    b.box(p.x, -3, p.x + p.L, 3, 3.2, M.hull2);
    b.cyl(cx, 0, 1.9, 3.8, (x, y, i, j) =>
      Math.hypot(x - cx, y) < 1.15 ? M.pit : (i + j) % 4 < 2 ? M.hazard : M.dark
    );
    b.light(cx, -2.4, 4);
    b.light(cx, 2.3, 4);
  }
};

type AttachmentBuild = (b: Builder, p: LaidPart, slot: Slot, v: number, n: number) => void;

const zOf = (p: LaidPart) => PZ[p.k] ?? 4;

const TATT: Readonly<Record<AttachmentKey, AttachmentBuild>> = {
  turret(b, p, slot, y) {
    const xc = p.x + p.L / 2,
      z = zOf(p);
    const c = b.begin('weapon', 'Twin beam turret', slot);
    b.cyl(xc, y, 2.2, z + 0.9, M.dark, { b: 2 });
    b.mounts.push({
      x: xc - b.len / 2,
      y,
      type: 'beam',
      face: y ? (Math.sign(y) * Math.PI) / 2 : 0,
      arc: y ? 1.75 : 2.6,
      comp: c
    });
  },
  launcher(b, p, slot, y) {
    const xc = p.x + p.L / 2,
      z = zOf(p) + 0.9;
    b.begin('weapon', 'Missile cells ×6', slot);
    b.box(
      xc - 2.5,
      y - 1.7,
      xc + 2.5,
      y + 1.7,
      z,
      (x, yy) => {
        const u = (x - xc + 2.5) % 1.66,
          v = (yy - y + 1.7) % 1.7;
        return u < 0.3 || v < 0.3 ? M.dark : M.red;
      },
      { b: 1 }
    );
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++)
        b.cells.push({ x: xc - 1.66 + i * 1.66 - b.len / 2, y: y - 0.85 + j * 1.7 });
  },
  dish(b, p, slot, y) {
    const xc = p.x + p.L / 2,
      z = zOf(p);
    b.begin('sensor', 'Active sensor', slot);
    b.cyl(xc, y, 0.9, z + 1.4, M.engine);
    b.shape(
      xc - 2.3,
      y - 2.3,
      xc + 2.3,
      y + 2.3,
      (x, yy) => {
        const d = ((x - xc) ** 2 + (yy - y) ** 2) / 5.29;
        return d < 1 ? z + 1 + d * 1.5 : 0;
      },
      (x, yy) => (Math.hypot(x - xc, yy - y) < 0.5 ? M.gold : M.white)
    );
  },
  antenna(b, p, slot, y) {
    const xc = p.x + p.L / 2,
      z = zOf(p);
    b.begin('sensor', 'Comm mast', slot);
    if (!y) {
      b.cyl(xc, 0, 0.8, z + 2, M.white);
      b.light(xc, 0, 3);
      return;
    }
    const s = Math.sign(y),
      y0 = p.hw - 0.6,
      y1 = p.hw + 5.6;
    b.shape(
      xc - 0.35,
      Math.min(s * y0, s * y1),
      xc + 0.35,
      Math.max(s * y0, s * y1),
      () => 1.8,
      (_x, _yy, i, j) => ((i + j) % 2 ? M.truss : M.white)
    );
    b.cyl(xc, s * y0, 0.9, z + 1, M.engine);
    b.light(xc, s * (y1 - 0.3), 3);
  },
  tower(b, p, slot) {
    const xc = p.x + p.L / 2,
      z = zOf(p);
    b.begin('bridge', 'Conning tower', slot);
    const isl = p.k === 'hangar',
      yc = isl ? -(p.hw - 1.7) : 0,
      hw = isl ? 1.5 : 2.1,
      hl = isl ? 3.6 : 2.6;
    b.box(xc - hl, yc - hw, xc + hl, yc + hw, z + 2.2, M.hull2, { b: 1.6 });
    b.box(xc - hl * 0.45, yc - hw * 0.62, xc + hl * 0.78, yc + hw * 0.62, z + 3.4, M.hull, { b: 1.2 });
    b.each(xc + hl * 0.78 - 1.4 / b.S, yc - hw * 0.5, xc + hl * 0.78 - 0.4 / b.S, yc + hw * 0.5, (k) => {
      b.e[k] = 2;
    });
    for (const yy of [yc - hw + 0.3, yc + hw - 0.5])
      b.each(xc - hl + 0.6, yy, xc + hl - 0.6, yy + 0.01, (k, i) => {
        if (i % 2 === 0) b.e[k] = 1;
      });
    b.cyl(xc - hl * 0.7, yc, 0.5, z + 4.4, M.white);
    b.light(xc - hl * 0.7, yc, 3);
  },
  cargo(b, p, slot, s, n) {
    b.begin('store', 'Cargo racks', slot);
    for (let r = 0; r < n; r++)
      for (let q = 0; q < 2; q++) {
        const xa = p.x + 0.35 + q * 3.85,
          ya = p.hw + 0.35 + r * 3.05,
          zz = 2.6 + hash(r, q, p.x + s) * 1.2,
          mm = CONT[Math.floor(hash(q, r, p.x * 3 + s) * CONT.length)]!;
        const y0 = s > 0 ? ya : -ya - 2.75;
        b.box(xa, y0, xa + 3.5, y0 + 2.75, zz, mm, { b: 1 });
        b.each(xa + 0.2, y0 + 0.2, xa + 3.3, y0 + 2.55, (k, i) => {
          if (i % 3 === 1 && b.m[k] === mm) b.t[k] = -1;
        });
      }
  },
  radiator(b, p, slot, s) {
    const xc = p.x + p.L / 2,
      y0 = p.hw - 0.4;
    b.begin('power', 'Radiator', slot);
    b.shape(
      xc - 2.2,
      s > 0 ? y0 : -y0 - 8.4,
      xc + 2.2,
      s > 0 ? y0 + 8.4 : -y0,
      () => 1.4,
      (_x, _y, i) => (i % 5 === 0 ? M.dark : M.radiator),
      { e: (_x, _y, i, j) => (i % 5 && j % 3 === 1 ? 8 : 0) }
    );
  },
  solar(b, p, slot, s) {
    const xc = p.x + p.L / 2,
      y0 = p.hw - 0.3;
    b.begin('power', 'Solar array', slot);
    b.shape(xc - 0.35, s > 0 ? y0 : -y0 - 1.6, xc + 0.35, s > 0 ? y0 + 1.6 : -y0, () => 1.6, M.truss);
    const ya = s > 0 ? y0 + 1.4 : -y0 - 12.6;
    b.shape(
      xc - 3.8,
      ya,
      xc + 3.8,
      ya + 11.2,
      () => 1.1,
      (_x, _y, i, j) => (i % 5 === 0 || j % 5 === 0 ? M.white : M.solar),
      { t: 0 }
    );
    b.each(xc - 3.8, ya, xc + 3.8, ya + 11.2, (k, i, j) => {
      if (b.m[k] === M.solar)
        b.t[k] = hash(Math.floor(i / 5), Math.floor(j / 5), 3) > 0.6 ? 1 : (i + j) % 2 ? 0 : -1;
    });
  },
  pod(b, p, slot, s) {
    const xc = p.x + p.L / 2,
      y0 = p.hw + 2.4;
    b.begin('prop', 'Manoeuvring pod', slot);
    b.shape(xc - 0.8, s > 0 ? p.hw - 0.6 : -y0, xc + 0.8, s > 0 ? y0 : -p.hw + 0.6, () => 2.4, M.truss);
    b.tube(
      xc - 3.2,
      xc + 2.6,
      s * y0,
      1.3,
      3.6,
      (x, _y, i) => (x > xc + 1.4 ? M.hull2 : i % 4 === 0 ? M.dark : M.engine),
      { cap: true, base: 1.6 }
    );
    b.each(xc - 3.2, s * y0 - 0.6, xc - 2.5, s * y0 + 0.6, (k) => {
      if (b.m[k]) b.e[k] = 6;
    });
    b.nozzles.push({ x: xc - 3.2 - b.len / 2, y: s * y0, r: 0.8 });
  },
  fin(b, p, slot, s) {
    const xa = p.x + 0.6,
      y0 = p.hw - 0.5;
    b.begin('hull', 'Stabiliser', slot);
    b.shape(
      xa,
      s > 0 ? y0 : -y0 - 5.4,
      xa + 6.6,
      s > 0 ? y0 + 5.4 : -y0,
      (x, y) => (Math.abs(y) - y0 < 5.2 * (1 - (x - xa) / 6.6) ? 1.8 : 0),
      (x, y) => (Math.abs(y) - y0 > 5.2 * (1 - (x - xa) / 6.6) - 0.9 ? M.accent : M.hull)
    );
  }
};

const CENTERED: ReadonlySet<AttachmentKey> = new Set(['turret', 'launcher', 'dish', 'antenna', 'tower']);

function yOffset(k: AttachmentKey, p: LaidPart): number {
  if (k === 'turret') return Math.max(0, p.hw - 2.4);
  if (k === 'launcher') return Math.max(0, p.hw - 2.2);
  if (k === 'dish') return Math.max(0, p.hw - 2.5);
  return 1;
}

function attach(b: Builder, p: LaidPart): void {
  const put = (a: string, slot: Slot, alone: boolean) => {
    const [k, n] = parseAttachment(a);
    const s = slot === 'top' ? -1 : 1;
    if (!(k in TATT)) return;
    if (CENTERED.has(k)) {
      if (k === 'tower') {
        if (alone || s < 0) TATT.tower(b, p, slot, 0, n);
        return;
      }
      TATT[k](b, p, slot, alone ? 0 : s * yOffset(k, p), n);
      return;
    }
    TATT[k](b, p, slot, s, n);
    if (alone) TATT[k](b, p, slot, -s, n);
  };
  if (p.top) put(p.top, 'top', !p.bot);
  if (p.bot) put(p.bot, 'bottom', false);
}

export interface Layout {
  readonly parts: readonly LaidPart[];
  readonly len: number;
  readonly half: number;
}

export function specParts(spec: ShipSpec): Layout {
  const raw: { k: BodyKey; target: PartTarget; n: number; top?: string; bot?: string }[] = [];
  if (spec.stern) raw.push({ k: spec.stern[0], target: { kind: 'stern' }, n: spec.stern[1] ?? 2 });
  if (spec.aft) raw.push({ k: spec.aft, target: { kind: 'aft' }, n: 1 });
  spec.parts.forEach(([k, top, bot], index) =>
    raw.push({
      k,
      target: { kind: 'section', index },
      n: 1,
      ...(top ? { top } : {}),
      ...(bot ? { bot } : {})
    })
  );
  if (spec.bow) raw.push({ k: spec.bow, target: { kind: 'bow' }, n: 1 });
  let len = 0,
    half = 0;
  const sized = raw.map((p) => {
    const L = PLEN[p.k],
      hw = PHW[p.k] ?? 2.6 + p.n * 1.5,
      x = len;
    len += L;
    let ext = p.k === 'ring' ? 12.6 : hw;
    for (const a of [p.top, p.bot])
      if (a) {
        const [k, n] = parseAttachment(a);
        ext = Math.max(ext, hw + (k === 'cargo' ? n * 3.05 + 0.5 : (AEXT[k] ?? 0)));
      }
    half = Math.max(half, ext);
    return { ...p, L, hw, x };
  });
  const parts = sized.map((p, i) => ({
    ...p,
    prev: sized[i - 1]?.hw ?? p.hw,
    next: sized[i + 1]?.hw ?? p.hw
  }));
  return { parts, len, half };
}

export function buildParts(b: Builder, parts: readonly LaidPart[]): number[] {
  const comps = parts.map((p, i) => {
    b.part = i;
    PART[p.k](b, p);
    return b.comp;
  });
  parts.forEach((p, i) => {
    b.part = i;
    attach(b, p);
  });
  b.part = undefined;
  return comps;
}
