import { statsFor, classes } from '#lib/game/classes.svelte.ts';
import type { Ship } from '#lib/game/flight/index.ts';
import {
  component,
  PROPELLANT_KINDS,
  type DesignStats,
  type PropellantKind,
  type ShipDesign
} from '#lib/game/shipdesign/index.ts';
import type { Vessel } from './types.ts';

export const designOf = (v: Vessel): ShipDesign | undefined => classes.find(v.design);

export const statsOf = (v: Vessel): DesignStats | undefined => {
  const d = designOf(v);
  return d ? statsFor(d) : undefined;
};

const total = (r: Readonly<Record<string, number | undefined>>): number =>
  Object.values(r).reduce<number>((a, x) => a + (x ?? 0), 0);

export const cargoMass = (v: Vessel): number => total(v.cargo);

export const propellantMass = (v: Vessel): number => total(v.propellant);

export const wetMass = (v: Vessel): number => (statsOf(v)?.dryMass ?? 0) + propellantMass(v) + cargoMass(v);

export const cargoRoom = (v: Vessel): number =>
  Math.max(0, (statsOf(v)?.payloadCapacity ?? 0) - cargoMass(v));

export const propellantRoom = (v: Vessel, kind: PropellantKind): number =>
  Math.max(0, (statsOf(v)?.capacity[kind] ?? 0) - (v.propellant[kind] ?? 0));

export const mainKind = (v: Vessel): PropellantKind | undefined => statsOf(v)?.main?.propellant;

export function reentryRating(design: ShipDesign): number {
  return design.parts.reduce((a, p) => a + (component(p.component)?.design.reentry ?? 0) * p.count, 0);
}

export function landingRating(design: ShipDesign): number {
  return design.parts.reduce((a, p) => a + (component(p.component)?.design.landing ?? 0) * p.count, 0);
}

export function canAerobrake(v: Vessel): boolean {
  const d = designOf(v);
  return !!d && reentryRating(d) >= wetMass(v);
}

export function vesselShip(v: Vessel): Ship | undefined {
  const stats = statsOf(v);
  const main = stats?.main;
  if (!stats || !main) return undefined;
  const others = PROPELLANT_KINDS.filter((k) => k !== main.propellant).reduce(
    (a, k) => a + (v.propellant[k] ?? 0),
    0
  );
  return {
    dryMass: stats.dryMass + others,
    payload: cargoMass(v),
    propellant: v.propellant[main.propellant] ?? 0,
    engine: {
      isp: main.isp,
      thrust: main.thrust,
      thrustSeaLevel: main.thrustSeaLevel,
      ...(main.power > 0 ? { power: main.power } : {})
    },
    powerAvailable: Math.max(0, stats.power.balance)
  };
}
