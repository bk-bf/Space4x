import {
  METRES_PER_UNIT,
  PLUME_UNITS,
  pickShip,
  shipBeamMetres,
  type Component,
  type ShipView
} from '#lib/gfx/topdown/index.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import { layout, type LaidPart, type Selection } from '#lib/game/design.ts';

export const DESIGN_SCALE = 2;
export const LABEL_ROOM = 96;
export const MAX_PX_PER_UNIT = 12;
const TOP = 6;
const SIDE = 4;

export interface Frame {
  S: number;
  originX: number;
  cy: number;
  lineY: number;
  len: number;
  parts: LaidPart[];
}

export function frameOf(sp: ShipSpec, fbW: number, fbH: number, scale: number): Frame {
  const parts = layout(sp);
  const last = parts[parts.length - 1];
  const len = last ? last.x + last.w : 0;
  const beam = shipBeamMetres(sp) / METRES_PER_UNIT;
  const room = fbH - Math.ceil(LABEL_ROOM / scale) - TOP - 4;
  const S = Math.max(
    0.375,
    Math.min(MAX_PX_PER_UNIT, (fbW - SIDE * 2) / Math.max(1, len + PLUME_UNITS * 2), room / Math.max(1, beam))
  );
  const originX = Math.round((fbW - len * S) / 2 + (PLUME_UNITS * S) / 2);
  const cy = Math.round(TOP + room / 2);
  return { S, originX, cy, lineY: Math.round(cy + (beam / 2) * S + 3), len, parts };
}

export const colX = (frame: Frame, x: number): number => frame.originX + x * frame.S;

export function viewOf(frame: Frame, angle: number): ShipView {
  return {
    x: frame.originX + (frame.len * frame.S) / 2,
    y: frame.cy,
    angle,
    pxPerMetre: frame.S / METRES_PER_UNIT
  };
}

export interface PartHit {
  selection: Selection;
  comp: number;
  component: Component;
}

export function partAt(sp: ShipSpec, frame: Frame, angle: number, x: number, y: number): PartHit | null {
  const hit = pickShip(sp, viewOf(frame, angle), x, y);
  const part = hit?.component.part;
  const target = part !== undefined ? frame.parts[part]?.target : undefined;
  if (!hit || !target) return null;
  const selection: Selection =
    target.kind === 'section'
      ? { kind: 'section', index: target.index, slot: hit.component.slot ?? (hit.y < 0 ? 'top' : 'bottom') }
      : { kind: target.kind };
  return { selection, comp: hit.comp, component: hit.component };
}
