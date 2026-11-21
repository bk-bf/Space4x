import { project, type Amounts, type DigClass } from '#lib/game/data/index.ts';
import { DIG_CLASSES } from './classes.ts';
import { figures } from './parts.ts';
import type { Chassis, Figures, RobotDesign, RobotIssue, RobotLine, RobotStats } from './types.ts';

export type Unlocked = (tag: number) => boolean;

export const WEAR_PER_YEAR = 0.1;
export const WEAR_MATERIAL = 'machinery';

const everything: Unlocked = () => true;

const w = (kw: number): string => `${Math.round(kw * 1000).toLocaleString('en-US')} W`;

export function robotStats(design: RobotDesign, unlocked: Unlocked = everything): RobotStats {
  const items = design.parts
    .filter((p) => p.count > 0)
    .flatMap((p) => {
      const f = figures(p.part);
      return f ? [{ f, count: p.count }] : [];
    });
  const lines: RobotLine[] = items.map(({ f, count }) => ({
    part: f.id,
    name: f.name,
    count,
    mass: f.mass * count,
    cost: Object.fromEntries(Object.entries(f.cost).map(([m, kg]) => [m, kg * count]))
  }));
  const cost: Amounts = {};
  for (const l of lines) for (const [m, kg] of Object.entries(l.cost)) cost[m] = (cost[m] ?? 0) + kg;
  const sum = (pick: (f: Figures) => number) => items.reduce((a, { f, count }) => a + pick(f) * count, 0);
  const mass = sum((f) => f.mass);
  const made = sum((f) => f.generates);
  const used = sum((f) => f.power);
  const storage = sum((f) => f.storage);
  const dock = items.some(({ f }) => f.dock);
  const compute = sum((f) => f.compute);
  const kinds = new Set(items.map(({ f }) => f.chassis).filter((c): c is Chassis => !!c));
  const chassis = kinds.size === 1 ? [...kinds][0] : undefined;
  const tools = items.filter(({ f }) => f.kind === 'tool');
  const working = tools.filter(({ f }) => chassis === 'wheeled' || f.gravity !== 'surface');
  const rates = Object.fromEntries(
    DIG_CLASSES.map((k) => [
      k,
      working.reduce((a, { f, count }) => a + (f.rates[k] ?? 0) * (k === 'ice' ? f.bakes : 1) * count, 0)
    ])
  ) as Record<DigClass, number>;

  const issues: RobotIssue[] = [];
  const error = (code: RobotIssue['code'], text: string) => issues.push({ level: 'error', code, text });
  const warning = (code: RobotIssue['code'], text: string) => issues.push({ level: 'warning', code, text });
  if (!items.length) error('no-parts', 'No parts.');
  for (const { f } of items)
    if (!unlocked(f.research)) error('locked-part', `${f.name} needs ${project(f.research).name}.`);
  if (items.length && !kinds.size) error('no-chassis', 'No chassis.');
  if (kinds.size > 1) error('two-chassis', 'Wheels and anchors on one robot.');
  if (items.length && !tools.length) error('no-tool', 'No tool.');
  if (chassis === 'anchored')
    for (const { f } of tools)
      if (f.gravity === 'surface') warning('idle-tool', `${f.name} digs nothing in microgravity.`);
  if (items.length && made <= 0 && !dock) error('no-power', 'No power source.');
  else if (!dock && made < used - 1e-9) error('power-deficit', `Uses ${w(used)}, makes ${w(made)}.`);
  if (items.length && compute <= 0) warning('no-computer', 'Works only near Earth, run from Earth.');

  const errors = issues.filter((i) => i.level === 'error').length;
  return {
    lines,
    mass,
    cost,
    chassis,
    power: { made, used, storage, dock, balance: made - used },
    compute,
    rates,
    wear: mass * WEAR_PER_YEAR,
    issues,
    errors,
    warnings: issues.length - errors
  };
}
