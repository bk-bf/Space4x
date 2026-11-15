import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { stars } from '#lib/gfx/scenes.ts';
import { C } from '#lib/gfx/ships/colors.ts';
import { drawShip, measure } from '#lib/gfx/ships/draw.ts';
import {
  ATT,
  BOW,
  CORE,
  PW,
  STERN,
  type AttachmentKey,
  type BowKey,
  type CoreKey,
  type SternKey
} from '#lib/gfx/ships/parts.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import { PALETTE, type Selection } from '#lib/game/design.ts';
import { frameOf } from './geometry.ts';

export const PARTS_W = 120;
export const PARTS_SCALE = 2;
export const CELL_W = 30;
export const CELL_H = 34;
export const PARTS_COLUMNS = 4;
export const PARTS_H = Math.ceil(PALETTE.length / PARTS_COLUMNS) * CELL_H;

const SLOT_W = 8;
const SLOT_H = 5;

function slotMarks(f: FB, x: number, y: number, up: boolean, hot: boolean): void {
  const c = hot ? PAL.sel : PAL.orbit;
  for (let i = 0; i < SLOT_W; i++) {
    if (hot || i % 2 === 0) {
      f.px(x + i, y, c);
      f.px(x + i, y + (up ? -SLOT_H : SLOT_H), c);
    }
  }
  for (let j = 1; j < SLOT_H; j++) {
    if (hot || j % 2 === 1) {
      f.px(x, y + (up ? -j : j), c);
      f.px(x + SLOT_W - 1, y + (up ? -j : j), c);
    }
  }
}

export function drawDesign(f: FB, sp: ShipSpec, t: number, sel: Selection): void {
  const frame = frameOf(sp, f.w, f.h, f.scale);
  f.start();
  drawShip(f, frame.originX, frame.cy, sp, t);
  const first = frame.parts[0];
  const last = frame.parts[frame.parts.length - 1];
  if (!first || !last) {
    f.present();
    return;
  }
  const y = frame.lineY;
  const x0 = frame.originX + first.x;
  const x1 = frame.originX + last.x + last.w;
  f.line(x0, y, x1, y, PAL.orbit, 2);
  for (const q of [...frame.parts.map((p) => p.x), last.x + last.w]) {
    const x = frame.originX + q;
    for (let j = -2; j <= 0; j++) f.px(x, y + j, PAL.sel);
  }
  const chosen = frame.parts.find((p) =>
    sel.kind === 'section'
      ? p.target.kind === 'section' && p.target.index === sel.index
      : p.target.kind === sel.kind
  );
  if (chosen) {
    const a = frame.originX + chosen.x;
    for (let i = 0; i <= chosen.w; i++) {
      f.px(a + i, y + 1, PAL.sel);
      f.px(a + i, y + 2, PAL.sel);
    }
    if (sel.kind === 'section') {
      const ox = a + Math.floor((chosen.w - 8) / 2);
      const section = sp.parts[sel.index]!;
      for (const slot of ['top', 'bottom'] as const) {
        const name = section[slot === 'top' ? 1 : 2];
        const hot = sel.slot === slot;
        if (name && !hot) continue;
        if (slot === 'top') slotMarks(f, ox, frame.cy - chosen.hh - 1, true, hot);
        else slotMarks(f, ox, frame.cy + chosen.hh + 1, false, hot);
      }
    }
  }
  f.present();
}

export function drawCard(f: FB, sp: ShipSpec, t: number): void {
  stars(f, sp.stern ? t : 0, 14);
  const m = measure(sp);
  drawShip(f, Math.round((f.w - m.w) / 2) - m.x0, Math.round((f.h - m.h) / 2) - m.y0, sp, t);
  f.present();
}

export function cardScale(sp: ShipSpec, width: number): number {
  const m = measure(sp);
  for (const scale of [3, 2]) if ((m.w + 6) * scale <= width) return scale;
  return 1;
}

export function drawParts(p: FB, t: number): void {
  p.fill(PAL.panel);
  PALETTE.forEach((item, n) => {
    const ox = (n % PARTS_COLUMNS) * CELL_W;
    const oy = Math.floor(n / PARTS_COLUMNS) * CELL_H;
    const cy = oy + 13;
    if (item.kind === 'core') {
      const k = item.key as CoreKey;
      CORE[k](p, ox + Math.floor((CELL_W - PW[k]) / 2), cy, t);
    } else if (item.kind === 'stern') {
      const k = item.key as SternKey;
      STERN[k](p, ox + (k === 'big' ? 12 : 13), cy, t, 2);
    } else if (item.kind === 'bow') {
      const k = item.key as BowKey;
      BOW[k](p, ox + Math.floor((CELL_W - PW[k]) / 2), cy, t);
    } else {
      for (let i = 0; i < 12; i++) p.px(ox + 9 + i, oy + 21, C.o);
      ATT[item.key as AttachmentKey]((dx, k, c) => p.px(ox + 11 + dx, oy + 21 - k, c), t, 2);
    }
  });
  p.present();
}
