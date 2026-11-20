import { shipComponents } from '#lib/game/data/records.ts';
import { DAY } from '#lib/game/clock.ts';
import { className, game } from '#lib/game/index.ts';
import { PROPELLANTS, type PropellantKind, type ShipDesign } from '#lib/game/shipdesign/index.ts';
import {
  cargoMass,
  lineText,
  propellantMass,
  statsOf,
  type Order,
  type PropellantStock,
  type RunLine,
  type Vessel
} from '#lib/game/ships/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';
import { dim, fmt, materialName, tipText, warn } from '#lib/ui/index.ts';
import { cargoText, propellantText, vesselWhere, whereabouts } from './shipsView.ts';

export const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export function tileWhere(v: Vessel): string {
  if (v.trip) return `${daysText(Math.max(0, v.trip.arrival - game.elapsed))} left`;
  return clip(whereabouts(v.at), 17);
}

export const kms = (dv: number): string => `${(dv / 1000).toFixed(2)} km/s`;

export const daysText = (seconds: number): string => fmt.days(seconds / DAY);

export function designIcon(design: ShipDesign | undefined): IconRef {
  const kindOf = (id: string) => shipComponents.find((c) => c.id === id)?.kind;
  const part =
    design?.parts.find((p) => kindOf(p.component) === 'propulsion') ?? design?.parts[0] ?? undefined;
  return { kind: 'component', id: part?.component ?? 'structure_truss' };
}

export function propellantIcon(kind: PropellantKind): IconRef {
  const mix = Object.entries(PROPELLANTS[kind].mix).sort((a, b) => b[1] - a[1]);
  return { kind: 'material', id: mix[0]?.[0] ?? 'water' };
}

export const propellantName = (kind: PropellantKind): string => PROPELLANTS[kind].name;

export function propellantMixIcons(kind: PropellantKind): IconRef[] {
  return Object.keys(PROPELLANTS[kind].mix)
    .slice(0, 2)
    .map((id) => ({ kind: 'material', id }));
}

const ratio = (n: number): string => `${Math.round(n * 100) / 100}`;

export function mixText(kind: PropellantKind): string {
  const mix = Object.entries(PROPELLANTS[kind].mix).filter(([, share]) => share > 0);
  const [only] = mix;
  if (mix.length === 1 && only) return `${materialName(only[0])} alone`;
  const least = Math.min(...mix.map(([, share]) => share));
  return `${mix.map(([m]) => materialName(m).toLowerCase()).join(' and ')}, ${mix
    .map(([, share]) => ratio(share / least))
    .join(' : ')} by mass`;
}

export function propellantTip(kind: PropellantKind, ...extra: (string | false | undefined)[]): string {
  return tipText(propellantName(kind), `Mixed from ${mixText(kind)}`, ...extra);
}

export function stockTip(p: PropellantStock): string {
  const limit = p.mix.find((m) => m.material === p.limit);
  return propellantTip(
    p.kind,
    `Can load ${fmt.mass(p.available)} from stock`,
    ...p.mix.map((m) => `${materialName(m.material)}: ${fmt.mass(m.stock)} in stock`),
    limit && p.mix.length > 1 && `Limited by ${materialName(limit.material).toLowerCase()}`,
    p.available <= 0 && warn(`Short of ${materialName(limit?.material ?? '').toLowerCase()}`)
  );
}

export function runText(lines: readonly RunLine[]): string {
  return lines.map((l) => `${materialName(l.material)} ${fmt.mass(l.amount)}`).join(', ');
}

export function orderTip(o: Order): string | undefined {
  if (o.type === 'manifest') return tipText('Load manifest', ...o.lines.map(lineText));
  if (o.type === 'unload' && o.item.kind === 'all-cargo') return 'Unload all cargo';
  return undefined;
}

export function tankFill(v: Vessel): number {
  const s = statsOf(v);
  const kind = s?.main?.propellant;
  const cap = kind ? (s?.capacity[kind] ?? 0) : 0;
  return cap > 0 ? propellantMass(v) / cap : 0;
}

export function vesselTip(v: Vessel): string {
  const s = statsOf(v);
  return tipText(
    v.name,
    className(v.design),
    dim(vesselWhere(v)),
    `Propellant: ${propellantText(v)}`,
    `Cargo: ${cargoText(v)} (${fmt.mass(cargoMass(v))} of ${fmt.mass(s?.payloadCapacity ?? 0)})`,
    `Crew ${v.crew} of ${s?.berths ?? 0} berths`,
    v.blocked ? warn(v.blocked) : v.run ? 'Supply run' : `${v.orders.length} orders`
  );
}
