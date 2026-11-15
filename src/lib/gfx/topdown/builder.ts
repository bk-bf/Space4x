import { clamp, hash } from '../math';
import { M, PLATED, SYSTEM_KINDS, type SystemKind } from './palette';

export type Slot = 'top' | 'bottom';

export interface Component {
  readonly kind: SystemKind;
  readonly name: string;
  readonly system: number;
  readonly part?: number;
  readonly slot?: Slot;
}

export interface Mount {
  readonly x: number;
  readonly y: number;
  readonly type: 'beam' | 'pd';
  readonly face: number;
  readonly arc: number;
  readonly comp: number;
}

export interface Nozzle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

type PixelFn = (x: number, y: number, i: number, j: number) => number;
type HeightFn = (x: number, y: number) => number;
type Mat = number | PixelFn;

export interface ShapeOptions {
  on?: boolean;
  force?: boolean;
  e?: number | PixelFn;
  t?: number;
  sym?: boolean;
}

export interface SlabOptions extends ShapeOptions {
  side?: number;
  bx?: number;
  zf?: (x: number) => number;
  dens?: number;
}

export interface BoxOptions extends ShapeOptions {
  b?: number;
}

export interface DomeOptions extends ShapeOptions {
  base?: number;
}

export interface TubeOptions extends ShapeOptions {
  base?: number;
  rf?: (x: number) => number;
  rmax?: number;
  cap?: boolean;
}

const FONT: Readonly<Record<string, string>> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111',
  1: '010110010010111',
  2: '110001010100111',
  3: '110001010001110',
  4: '101101111001001',
  5: '111100110001110',
  6: '011100111101111',
  7: '111001010010010',
  8: '111101111101111',
  9: '111101111001110',
  '-': '000000111000000'
};

const NONE: ShapeOptions = {};

export class Builder {
  readonly pad: number;
  readonly w: number;
  readonly h: number;
  readonly cy: number;
  readonly z: Float32Array;
  readonly m: Uint8Array;
  readonly c: Uint8Array;
  readonly e: Uint8Array;
  readonly t: Int8Array;
  nx = new Int8Array(0);
  ny = new Int8Array(0);
  nz = new Int8Array(0);
  comp = 0;
  readonly comps: (Component | null)[] = [null];
  readonly mounts: Mount[] = [];
  readonly cells: { x: number; y: number }[] = [];
  readonly nozzles: Nozzle[] = [];
  spinal: { x: number; y: number } | null = null;
  muzzle = 0;
  pvx = 0;
  pvy = 0;
  rad = 0;
  part: number | undefined;

  constructor(
    readonly len: number,
    readonly half: number,
    readonly S: number
  ) {
    this.pad = Math.ceil(2 + S);
    this.w = Math.ceil(len * S) + this.pad * 2;
    this.h = (Math.ceil(half * S) + this.pad) * 2;
    this.cy = this.h / 2;
    const n = this.w * this.h;
    this.z = new Float32Array(n);
    this.m = new Uint8Array(n);
    this.c = new Uint8Array(n);
    this.e = new Uint8Array(n);
    this.t = new Int8Array(n);
  }

  begin(kind: SystemKind, name: string, slot?: Slot): number {
    this.comps.push({
      kind,
      name,
      system: SYSTEM_KINDS.indexOf(kind),
      ...(this.part !== undefined ? { part: this.part } : {}),
      ...(slot ? { slot } : {})
    });
    return (this.comp = this.comps.length - 1);
  }

  shape(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    fn: HeightFn,
    mat: Mat,
    o: ShapeOptions = NONE
  ): void {
    const { S, pad, cy, w, h } = this,
      mf = typeof mat === 'function' ? mat : null,
      oe = o.e,
      ef = typeof oe === 'function' ? oe : null;
    const X0 = Math.max(0, Math.floor(pad + x0 * S)),
      X1 = Math.min(w - 1, Math.ceil(pad + x1 * S));
    const Y0 = Math.max(0, Math.floor(cy + y0 * S)),
      Y1 = Math.min(h - 1, Math.ceil(cy + y1 * S));
    for (let j = Y0; j <= Y1; j++)
      for (let i = X0; i <= X1; i++) {
        const x = (i + 0.5 - pad) / S,
          y = (j + 0.5 - cy) / S,
          zu = fn(x, y);
        if (!(zu > 0)) continue;
        const k = j * w + i;
        let zz = zu * S;
        if (o.on) {
          if (!this.m[k]) continue;
          zz += this.z[k]!;
        } else if (!o.force && zz <= this.z[k]!) continue;
        if (o.force && !this.m[k]) continue;
        const mm = mf ? mf(x, y, i, j) : (mat as number);
        if (!mm) continue;
        this.z[k] = zz;
        this.m[k] = mm;
        this.c[k] = this.comp;
        this.e[k] = ef ? ef(x, y, i, j) : ((oe as number | undefined) ?? 0);
        this.t[k] = o.t ?? 0;
      }
    if (o.sym)
      this.shape(x0, -y1, x1, -y0, (x, y) => fn(x, -y), mf ? (x, y, i, j) => mf(x, -y, i, h - 1 - j) : mat, {
        ...o,
        sym: false,
        e: ef ? (x, y, i, j) => ef(x, -y, i, h - 1 - j) : oe
      });
  }

  slabF(
    xa: number,
    xb: number,
    hwf: (x: number) => number,
    hwMax: number,
    z: number,
    mat: Mat,
    o: SlabOptions = NONE
  ): void {
    const S = this.S,
      side = o.side ?? 0.3,
      bx = (o.bx ?? 1.2) / S,
      zf = o.zf;
    this.shape(
      xa,
      -hwMax,
      xb,
      hwMax,
      (x, y) => {
        const hw = hwf(x),
          e = (hw - Math.abs(y)) / Math.max(hw * side, 1.2 / S),
          d = Math.min(x - xa, xb - x) / bx;
        return (zf ? zf(x) : z) * Math.min(1, e, Math.max(d, 0.55));
      },
      mat,
      o
    );
  }

  box(xa: number, ya: number, xb: number, yb: number, z: number, mat: Mat, o: BoxOptions = NONE): void {
    const b = (o.b ?? 1.2) / this.S;
    this.shape(
      xa,
      ya,
      xb,
      yb,
      (x, y) => z * Math.min(1, Math.min(x - xa, xb - x, y - ya, yb - y) / b + 0.35),
      mat,
      o
    );
  }

  dome(cx: number, cy: number, r: number, z: number, mat: Mat, o: DomeOptions = NONE): void {
    const base = o.base || 0;
    this.shape(
      cx - r,
      cy - r,
      cx + r,
      cy + r,
      (x, y) => {
        const d = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r);
        return d < 1 ? base + (z - base) * Math.sqrt(1 - d) : 0;
      },
      mat,
      o
    );
  }

  cyl(cx: number, cy: number, r: number, z: number, mat: Mat, o: BoxOptions = NONE): void {
    const b = (o.b ?? 1.4) / this.S;
    this.shape(
      cx - r,
      cy - r,
      cx + r,
      cy + r,
      (x, y) => {
        const d = r - Math.hypot(x - cx, y - cy);
        return d > 0 ? z * Math.min(1, d / b + 0.35) : 0;
      },
      mat,
      o
    );
  }

  tube(xa: number, xb: number, y0: number, r: number, z: number, mat: Mat, o: TubeOptions = NONE): void {
    const base = o.base ?? z * 0.45,
      rf = o.rf;
    this.shape(
      xa,
      y0 - (o.rmax || r),
      xb,
      y0 + (o.rmax || r),
      (x, y) => {
        const rr = rf ? rf(x) : r,
          d = ((y - y0) / rr) ** 2;
        if (d >= 1) return 0;
        const cap = o.cap ? Math.min(1, Math.min(x - xa, xb - x) / (rr * 0.6) + 0.3) : 1;
        return (base + (z - base) * Math.sqrt(1 - d)) * cap;
      },
      mat,
      o
    );
  }

  px(xu: number, yu: number): [number, number] {
    return [Math.floor(this.pad + xu * this.S), Math.floor(this.cy + yu * this.S)];
  }

  each(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    cb: (k: number, i: number, j: number, I: number, J: number) => void,
    sym = false
  ): void {
    const { S, pad, cy, w, h } = this;
    const X0 = Math.max(0, Math.floor(pad + x0 * S)),
      X1 = Math.min(w - 1, Math.ceil(pad + x1 * S) - 1);
    const Y0 = Math.max(0, Math.floor(cy + y0 * S)),
      Y1 = Math.min(h - 1, Math.ceil(cy + y1 * S) - 1);
    for (let j = Y0; j <= Y1; j++)
      for (let i = X0; i <= X1; i++) {
        cb(j * w + i, i - X0, j - Y0, i, j);
        if (sym) cb((h - 1 - j) * w + i, i - X0, j - Y0, i, h - 1 - j);
      }
  }

  plates(xa: number, xb: number, hw: number): void {
    const { S, pad, w, h, comp } = this;
    if (S < 1.5) return;
    const cyi = h / 2,
      groove = S >= 6 ? 0.6 : 0,
      mw = Math.round(4.5 + S * 0.75),
      mh = Math.round(3.5 + S * 0.5);
    const leaf = (X0: number, Y0: number, X1: number, Y1: number, sd: number) => {
      const tint = [-1, 0, 0, 0, 1, 0, 1, -1][Math.floor(hash(sd, 3, 1) * 8)]!;
      for (let j = Y0; j < Y1; j++)
        for (let i = X0; i < X1; i++)
          for (const jj of [j, h - 1 - j]) {
            const k = jj * w + i;
            if (this.c[k] !== comp || !PLATED[this.m[k]!]) continue;
            const seam = i === X1 - 1 || j === Y1 - 1;
            this.t[k] = seam ? -2 : tint;
            if (seam) this.z[k] = this.z[k]! - groove;
            else if (
              S >= 6 &&
              (i === X0 + 1 || i === X1 - 3) &&
              (j === Y0 + 1 || j === Y1 - 3) &&
              X1 - X0 > 8 &&
              hash(sd, 9, 2) > 0.45
            )
              this.t[k] = tint + 2;
            else if (
              S >= 12 &&
              hash(sd, 5, 5) > 0.8 &&
              i > X0 + 3 &&
              i < X1 - 5 &&
              j > Y0 + 2 &&
              j < Y1 - 4 &&
              (i - X0) % 3 === 0
            )
              this.t[k] = tint - 1;
          }
    };
    const split = (X0: number, Y0: number, X1: number, Y1: number, sd: number, depth: number): void => {
      const W = X1 - X0,
        H = Y1 - Y0,
        canX = W >= mw * 2,
        canY = H >= mh * 2;
      if ((!canX && !canY) || (depth > 1 && W * H < mw * mh * 7 && hash(sd, 1, 3) < 0.25))
        return leaf(X0, Y0, X1, Y1, sd);
      if (canX && (!canY || W > H * 1.25)) {
        const c = X0 + Math.round(W * (0.36 + 0.28 * hash(sd, 2, 3)));
        split(X0, Y0, c, Y1, sd * 2 + 1, depth + 1);
        split(c, Y0, X1, Y1, sd * 2 + 2, depth + 1);
      } else {
        const c = Y0 + Math.round(H * (0.36 + 0.28 * hash(sd, 4, 3)));
        split(X0, Y0, X1, c, sd * 2 + 1, depth + 1);
        split(X0, c, X1, Y1, sd * 2 + 2, depth + 1);
      }
    };
    split(Math.round(pad + xa * S), cyi, Math.round(pad + xb * S), Math.round(cyi + hw * S), 17 + comp, 0);
  }

  greebles(xa: number, xb: number, hw: number, dens = 120): void {
    const { S, pad, w, h, comp } = this;
    if (S < 3) return;
    const X0 = pad + xa * S,
      W = (xb - xa) * S,
      Y0 = h / 2,
      H = hw * S,
      n = Math.round((W * H) / dens);
    for (let g = 0; g < n; g++) {
      const r = (q: number) => hash(g, q, comp * 7 + (S | 0));
      const gw = 2 + Math.floor(r(1) * (S >= 6 ? 5 : 3)),
        gh = 1 + Math.floor(r(2) * (S >= 6 ? 4 : 2));
      const gx = Math.floor(X0 + 1 + r(3) * (W - gw - 2)),
        gy = Math.floor(Y0 + r(4) * (H - gh - 1));
      const kc = gy * w + gx;
      if (this.c[kc] !== comp || !PLATED[this.m[kc]!] || this.m[kc] === M.accent) continue;
      const dz = 0.8 + r(5) * 1.8,
        mm = r(6) < 0.45 ? M.hull2 : r(6) < 0.75 ? M.engine : M.dark,
        pipe = S >= 6 && r(7) > 0.8;
      for (let j = 0; j < (pipe ? 1 : gh); j++)
        for (let i = 0; i < (pipe ? gw * 4 : gw); i++)
          for (const jj of [gy + j, h - 1 - gy - j]) {
            const k = jj * w + gx + i;
            if (this.c[k] !== comp || !PLATED[this.m[k]!]) continue;
            this.z[k] = this.z[k]! + dz;
            this.m[k] = pipe ? M.engine : mm;
            this.t[k] = 0;
          }
    }
  }

  text(str: string, xu: number, yu: number, comp: number, mat: number = M.white): void {
    const { S, w } = this,
      sc = S >= 12 ? 3 : S >= 6 ? 2 : 1;
    if (S < 3) return;
    const at = this.px(xu, yu),
      Y = at[1];
    let X = at[0];
    for (const ch of str) {
      const g = FONT[ch];
      if (g)
        for (let r = 0; r < 5; r++)
          for (let c = 0; c < 3; c++)
            if (g[r * 3 + c] === '1')
              for (let a = 0; a < sc; a++)
                for (let b = 0; b < sc; b++) {
                  const k = (Y + r * sc + a) * w + X + c * sc + b;
                  if (this.m[k] && this.c[k] === comp) {
                    this.m[k] = mat;
                    this.t[k] = 0;
                    this.e[k] = 0;
                  }
                }
      X += 4 * sc;
    }
  }

  light(xu: number, yu: number, e: number): void {
    const [X, Y] = this.px(xu, yu),
      k = Y * this.w + X;
    if (this.m[k]) this.e[k] = e;
  }

  finish(pvx?: number): this {
    const { w, h, z, m } = this,
      n = w * h,
      K = 1.5;
    this.nx = new Int8Array(n);
    this.ny = new Int8Array(n);
    this.nz = new Int8Array(n);
    const g = (kk: number, ok: boolean) => (ok && m[kk] ? z[kk]! : 0);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        if (!m[k]) continue;
        let dx = (g(k + 1, i < w - 1) - g(k - 1, i > 0)) / 2,
          dy = (g(k + w, j < h - 1) - g(k - w, j > 0)) / 2;
        dx = clamp(dx, -4, 4);
        dy = clamp(dy, -4, 4);
        const l = Math.hypot(dx, dy, K);
        this.nx[k] = Math.round((-dx / l) * 127);
        this.ny[k] = Math.round((-dy / l) * 127);
        this.nz[k] = Math.round((K / l) * 127);
      }
    this.pvx = pvx ?? this.pad + (this.len * this.S) / 2;
    this.pvy = this.cy;
    this.rad = Math.hypot(Math.max(this.pvx, w - this.pvx), h / 2);
    return this;
  }
}

export type Sprite = Builder;
