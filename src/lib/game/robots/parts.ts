import { DIG_CLASSES } from './classes.ts';
import { hasRobotPart, robotPart, robotParts, type DigClass } from '#lib/game/data/index.ts';
import { component, massOf } from '#lib/game/shipdesign/index.ts';
import type { Figures } from './types.ts';

export const ROBOT_PART_KINDS = ['tool', 'chassis', 'power', 'computer'] as const;

export const ROBOT_KIND_NAMES: Readonly<Record<(typeof ROBOT_PART_KINDS)[number], string>> = {
  tool: 'Tools',
  chassis: 'Chassis',
  power: 'Power',
  computer: 'Computer'
};

const cache = new Map<string, { key: unknown; figures: Figures }>();

export function figures(id: string): Figures | undefined {
  if (!hasRobotPart(id)) return undefined;
  const p = robotPart(id);
  const c = p.component ? component(p.component) : undefined;
  const hit = cache.get(id);
  if (hit && hit.key === (c ?? p)) return hit.figures;
  const rates: Partial<Record<DigClass, number>> = {};
  for (const k of DIG_CLASSES) if (p.rates?.[k]) rates[k] = p.rates[k];
  const made: Figures = {
    id: p.id,
    name: p.name,
    kind: p.kind,
    research: Math.max(p.research, c?.research ?? 0),
    mass: c ? massOf(c) : (p.mass ?? 0),
    power: c ? (c.design.power ?? 0) : (p.power ?? 0),
    generates: c ? (c.design.generates ?? 0) : (p.generates ?? 0),
    storage: c ? (c.design.storage ?? 0) : (p.storage ?? 0),
    dock: p.dock ?? false,
    compute: p.compute ?? 0,
    cost: { ...(c ? c.cost : (p.cost ?? {})) },
    rates,
    bakes: p.bakes ?? 1,
    gravity: p.gravity,
    chassis: p.chassis,
    basis: c ? `${p.basis} ${c.design.basis}` : p.basis,
    source: c?.design.source ?? p.source,
    estimated: c ? c.estimated || c.design.estimated : p.estimated
  };
  cache.set(id, { key: c ?? p, figures: made });
  return made;
}

export const robotCatalogue = (): Figures[] => robotParts.flatMap((p) => figures(p.id) ?? []);

export const ROBOT_COMPUTE = robotParts.find((p) => p.kind === 'computer')?.compute ?? 0;
