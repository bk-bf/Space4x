import { measure } from '#lib/gfx/ships/draw.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import { layout, type LaidPart } from './design.ts';

export const LABEL_ROOM = 96;
export const SIDE_MARGIN = 30;
export const TOP_MARGIN = 12;
export const MAX_SCALE = 8;

export interface Frame {
  originX: number;
  cy: number;
  lineY: number;
  parts: LaidPart[];
}

export interface Box {
  w: number;
  h: number;
}

export function pickScale(sp: ShipSpec, box: Box): number {
  const m = measure(sp);
  let scale = MAX_SCALE;
  while (
    scale > 1 &&
    ((m.w + SIDE_MARGIN) * scale > box.w || (m.h + TOP_MARGIN) * scale + LABEL_ROOM > box.h)
  )
    scale--;
  return scale;
}

export function frameOf(sp: ShipSpec, fbW: number, fbH: number, scale: number): Frame {
  const m = measure(sp);
  const room = fbH - Math.ceil(LABEL_ROOM / scale) - m.h;
  const cy = Math.max(6, Math.floor(room / 2)) - m.y0;
  const originX = Math.round((fbW - m.w) / 2) - m.x0;
  return { originX, cy, lineY: cy + m.y1 + 5, parts: layout(sp) };
}
