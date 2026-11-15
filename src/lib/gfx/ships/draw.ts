import type { Surface } from '../framebuffer';
import { C } from './colors';
import { ATT, BOW, CORE, STERN, type PartSize } from './parts';
import { PNAME, type AttachmentKey, type PartKey, type ShipSpec } from './specs';

export interface PlacedPart {
  x: number;
  w: number;
  hh: number;
  round: boolean;
  name: string;
}

export interface Extent {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  w: number;
  h: number;
}

const ATTACHMENT = /^(\D+)(\d*)$/;

function attach(
  fb: Surface,
  name: string,
  ox: number,
  cy: number,
  reach: number,
  dir: number,
  t: number
): void {
  const m = ATTACHMENT.exec(name);
  if (!m) return;
  const draw = ATT[m[1] as AttachmentKey];
  draw((dx, k, c) => fb.px(ox + dx, cy + dir * (reach + k), c), t, Number(m[2]) || 1);
}

function joinSteps(fb: Surface, ps: readonly PlacedPart[], cy: number): void {
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i]!,
      b = ps[i + 1]!;
    if (a.hh === b.hh) continue;
    const big = a.hh > b.hh ? a : b,
      small = big === a ? b : a;
    if (big.round) continue;
    const cx = big === a ? a.x + a.w - 1 : b.x;
    for (let dy = small.hh; dy <= big.hh; dy++) {
      fb.px(cx, cy - dy, C.o);
      fb.px(cx, cy + dy, C.o);
    }
  }
}

export function drawShip(fb: Surface, x: number, cy: number, sp: ShipSpec, t: number): PlacedPart[] {
  const ps: PlacedPart[] = [];
  const add = (r: PartSize, key: PartKey, at: number) => {
    ps.push({ x: at, w: r[0], hh: r[1], round: !!r[2], name: PNAME[key] });
    return r[0];
  };
  if (sp.stern) x += add(STERN[sp.stern[0]](fb, x, cy, t, sp.stern[1]), sp.stern[0], x);
  if (sp.aft) x += add(BOW[sp.aft](fb, x, cy, t), sp.aft, x);
  for (const [core, top, bottom] of sp.parts) {
    const r = CORE[core](fb, x, cy, t),
      ox = x + Math.floor((r[0] - 8) / 2);
    if (top) attach(fb, top, ox, cy, r[1], -1, t);
    if (bottom) attach(fb, bottom, ox, cy, r[1], 1, t);
    x += add(r, core, x);
  }
  if (sp.bow) add(BOW[sp.bow](fb, x, cy, t), sp.bow, x);
  joinSteps(fb, ps, cy);
  return ps;
}

const extents = new WeakMap<ShipSpec, Extent>();

class Bounds implements Surface {
  readonly w = 0;
  readonly h = 0;
  x0 = 1e9;
  x1 = -1e9;
  y0 = 1e9;
  y1 = -1e9;
  px(x: number, y: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < this.x0) this.x0 = x;
    if (x > this.x1) this.x1 = x;
    if (y < this.y0) this.y0 = y;
    if (y > this.y1) this.y1 = y;
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.px(x, y);
    this.px(x + w - 1, y + h - 1);
  }
}

export function measure(sp: ShipSpec): Extent {
  const known = extents.get(sp);
  if (known) return known;
  const b = new Bounds();
  drawShip(b, 0, 0, sp, 0);
  const m = { x0: b.x0 - 2, x1: b.x1, y0: b.y0, y1: b.y1, w: b.x1 - b.x0 + 3, h: b.y1 - b.y0 + 1 };
  extents.set(sp, m);
  return m;
}
