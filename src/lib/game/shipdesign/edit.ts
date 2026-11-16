import { component, isEngine } from './catalogue.ts';
import { PROPELLANT_KINDS, isPropellant, type PropellantKind } from './propellants.ts';
import { designStats, type Unlocked } from './stats.ts';
import type { Load, Part, Role, ShipDesign, Yard } from './types.ts';

export const MAX_COUNT = 99;

export const newDesign = (id: string, name = 'New class'): ShipDesign => ({
  id,
  name,
  role: 'launcher',
  yard: 'rocket_factory',
  parts: [],
  load: {},
  locked: false
});

export const countOf = (design: ShipDesign, componentId: string): number =>
  design.parts.find((p) => p.component === componentId)?.count ?? 0;

const needed = (design: ShipDesign): Set<PropellantKind> =>
  new Set(
    design.parts.flatMap((p) => {
      const c = component(p.component);
      const kind = c && isEngine(c) ? c.design.propellants?.find(isPropellant) : undefined;
      return kind ? [kind] : [];
    })
  );

function refill(before: ShipDesign, after: ShipDesign): ShipDesign {
  const was = designStats(before);
  const now = designStats(after);
  const wanted = needed(after);
  const load: Partial<Record<PropellantKind, number>> = {};
  for (const kind of PROPELLANT_KINDS) {
    const room = now.capacity[kind] ?? 0;
    if (room <= 0) continue;
    const asked = after.load[kind];
    const wasRoom = was.capacity[kind] ?? 0;
    const wasFull = wasRoom > 0 && (was.propellant[kind] ?? 0) >= wasRoom - 0.5;
    if (asked === undefined) {
      if (wanted.has(kind)) load[kind] = room;
    } else load[kind] = wasFull ? room : Math.min(asked, room);
  }
  return { ...after, load };
}

const unlocked = (design: ShipDesign, next: Partial<ShipDesign>): ShipDesign =>
  design.locked ? design : refill(design, { ...design, ...next });

export function setCount(design: ShipDesign, componentId: string, count: number): ShipDesign {
  if (design.locked || !component(componentId)) return design;
  const n = Math.max(0, Math.min(MAX_COUNT, Math.round(count)));
  const exists = design.parts.some((p) => p.component === componentId);
  const parts: Part[] = exists
    ? design.parts.map((p) => (p.component === componentId ? { ...p, count: n } : p))
    : [...design.parts, { component: componentId, count: n }];
  return unlocked(design, { parts: parts.filter((p) => p.count > 0) });
}

export const addPart = (design: ShipDesign, componentId: string): ShipDesign =>
  setCount(design, componentId, countOf(design, componentId) + 1);

export const removePart = (design: ShipDesign, componentId: string): ShipDesign =>
  setCount(design, componentId, countOf(design, componentId) - 1);

export function setLoad(design: ShipDesign, kind: PropellantKind, kg: number): ShipDesign {
  if (design.locked) return design;
  const room = designStats(design).capacity[kind] ?? 0;
  const load: Load = { ...design.load, [kind]: Math.max(0, Math.min(room, kg)) };
  return { ...design, load };
}

export const rename = (design: ShipDesign, name: string): ShipDesign =>
  design.locked ? design : { ...design, name };

export const setRole = (design: ShipDesign, role: Role): ShipDesign =>
  design.locked ? design : { ...design, role };

export const setYard = (design: ShipDesign, yard: Yard): ShipDesign =>
  design.locked ? design : { ...design, yard };

export const canLock = (design: ShipDesign, unlocked?: Unlocked): boolean =>
  !design.locked && designStats(design, unlocked).errors === 0;

export const lock = (design: ShipDesign, unlocked?: Unlocked): ShipDesign =>
  canLock(design, unlocked) ? { ...design, locked: true } : design;

export const copyOf = (design: ShipDesign, id: string): ShipDesign => ({
  ...design,
  id,
  name: `${design.name} copy`,
  locked: false
});
