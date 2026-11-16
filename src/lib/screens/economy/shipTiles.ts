import { shipComponents } from '#lib/game/data/records.ts';
import { DAY } from '#lib/game/clock.ts';
import { className, game } from '#lib/game/index.ts';
import { PROPELLANTS, type PropellantKind, type ShipDesign } from '#lib/game/shipdesign/index.ts';
import { cargoMass, designOf, propellantMass, statsOf, type Vessel } from '#lib/game/ships/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';
import { dim, fmt, tipText, warn } from '#lib/ui/index.ts';
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

export const vesselIcon = (v: Vessel): IconRef => designIcon(designOf(v));

export function propellantIcon(kind: PropellantKind): IconRef {
  const mix = Object.entries(PROPELLANTS[kind].mix).sort((a, b) => b[1] - a[1]);
  return { kind: 'material', id: mix[0]?.[0] ?? 'water' };
}

export const propellantName = (kind: PropellantKind): string => PROPELLANTS[kind].name;

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
