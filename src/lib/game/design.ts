import { PNAME, type PartKey, type ShipSpec } from '#lib/gfx/ships/specs.ts';
import { METRES_PER_UNIT, specParts, type PartTarget } from '#lib/gfx/topdown/parts.ts';

export type ShipClass = ShipSpec;

export interface LaidPart {
  target: PartTarget;
  key: PartKey;
  name: string;
  x: number;
  w: number;
  hh: number;
}

export const MAX_SECTIONS = 14;

export function layout(sp: ShipSpec): LaidPart[] {
  return specParts(sp).parts.map((p) => ({
    target: p.target,
    key: p.k,
    name: PNAME[p.k],
    x: p.x,
    w: p.L,
    hh: p.hw
  }));
}

export const lengthOf = (sp: ShipSpec): number => specParts(sp).len * METRES_PER_UNIT;
