import { DAY } from '#lib/game/clock.ts';
import { material } from '#lib/game/data/index.ts';
import { economy } from '#lib/game/economy/index.ts';
import { game } from '#lib/game/index.ts';
import { PROPELLANTS, PROPELLANT_KINDS } from '#lib/game/shipdesign/index.ts';
import {
  cargoMass,
  propellantMass,
  siteOf,
  statsOf,
  type Vessel,
  type Whereabouts
} from '#lib/game/ships/index.ts';
import { formatAmount, formatMass } from './format.ts';

export const bodyName = (id: string): string => game.placeName(id) ?? id;

export function whereabouts(w: Whereabouts): string {
  if (w.kind === 'site') return siteOf(w.site)?.name ?? 'a lost site';
  if (w.kind === 'orbit') return game.jump(w.body) ? bodyName(w.body) : `${bodyName(w.body)} orbit`;
  return `${bodyName(w.body)} surface`;
}

export function vesselWhere(v: Vessel): string {
  if (!v.trip) return whereabouts(v.at);
  const left = Math.max(0, v.trip.arrival - game.elapsed);
  return `To ${whereabouts(v.trip.to)}, ${(left / DAY).toFixed(1)} d left`;
}

export function propellantText(v: Vessel): string {
  const parts = PROPELLANT_KINDS.filter((k) => (v.propellant[k] ?? 0) > 0).map(
    (k) => `${formatMass(v.propellant[k] ?? 0)} ${PROPELLANTS[k].name.toLowerCase()}`
  );
  return parts.length ? parts.join(', ') : 'None';
}

export function cargoText(v: Vessel): string {
  const parts = Object.entries(v.cargo)
    .filter(([, kg]) => kg > 0)
    .map(([m, kg]) => `${formatAmount(m, kg)} ${material(m).name.toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'Empty';
}

export function holdText(v: Vessel): string {
  const s = statsOf(v);
  return `${formatMass(cargoMass(v))} of ${formatMass(s?.payloadCapacity ?? 0)}`;
}

export function tankText(v: Vessel): string {
  const s = statsOf(v);
  const kind = s?.main?.propellant;
  const cap = kind ? (s?.capacity[kind] ?? 0) : 0;
  return cap > 0 ? `${Math.round((propellantMass(v) / cap) * 100)}%` : '0%';
}

export const sitesOff = () => economy.sites.slice(1);

export const dateText = (seconds: number): string =>
  new Date(game.time + (seconds - game.elapsed) * 1000).toISOString().slice(0, 10);

export const dayText = (seconds: number): string =>
  `${(seconds / DAY).toFixed(seconds < 10 * DAY ? 1 : 0)} d`;
