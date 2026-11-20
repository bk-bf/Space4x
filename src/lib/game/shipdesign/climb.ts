import type { Component } from '#lib/game/data/index.ts';
import { G0, MIN_LIFTOFF_TWR, surfaceGravity, surfaceToOrbit } from '#lib/game/flight/index.ts';
import type { FlightBody } from '#lib/game/flight/types.ts';
import { isBooster, massOf } from './catalogue.ts';
import { isPropellant, type PropellantKind } from './propellants.ts';
import type { Drive } from './types.ts';

export interface Boosters {
  count: number;
  mass: number;
  propellant: PropellantKind;
  load: number;
  isp: number;
  thrust: number;
  thrustSeaLevel: number;
}

export function boostersOf(items: readonly { c: Component; count: number }[]): Boosters | undefined {
  const list = items.filter(({ c }) => isBooster(c));
  const count = list.reduce((n, { count }) => n + count, 0);
  if (count <= 0) return undefined;
  const kind = list
    .map(({ c }) => c.design.boost?.propellant)
    .find((k) => k !== undefined && isPropellant(k));
  if (!kind || !isPropellant(kind)) return undefined;
  const total = (pick: (c: Component) => number) => list.reduce((s, { c, count }) => s + pick(c) * count, 0);
  const thrust = total((c) => c.performance?.thrust ?? 0);
  const flow = total((c) => (c.performance?.thrust ?? 0) / (c.performance?.isp ?? 1));
  return {
    count,
    mass: total(massOf),
    propellant: kind,
    load: total((c) => c.design.boost?.load ?? 0),
    isp: flow > 0 ? thrust / flow : 0,
    thrust,
    thrustSeaLevel: total((c) => c.performance?.thrustSeaLevel ?? c.performance?.thrust ?? 0)
  };
}

export const builtMass = (s: { dryMass: number; boosters: Boosters | undefined }): number =>
  s.dryMass + (s.boosters?.mass ?? 0);

export const withBoosters = (b: Boosters, count: number): Boosters | undefined =>
  count <= 0
    ? undefined
    : {
        ...b,
        count,
        mass: (b.mass / b.count) * count,
        load: (b.load / b.count) * count,
        thrust: (b.thrust / b.count) * count,
        thrustSeaLevel: (b.thrustSeaLevel / b.count) * count
      };

export const climbDrive = (
  drives: readonly Drive[],
  load: (kind: PropellantKind) => number
): Drive | undefined =>
  [...drives]
    .filter((d) => load(d.propellant) > 0)
    .sort((a, b) => b.thrust * b.throttle - a.thrust * a.throttle)[0];

export interface ClimbShip {
  dry: number;
  propellant: number;
  drive: Pick<Drive, 'isp' | 'thrust' | 'thrustSeaLevel' | 'throttle'> | undefined;
}

export interface Climb {
  boosters: number;
  boosterMass: number;
  boosterLoad: number;
  liftoffMass: number;
  liftoffThrust: number;
  twr: number;
  boosterDv: number;
  shipDv: number;
  deltaV: number;
  need: number;
  boosterBurned: number;
  shipBurned: number;
  leftover: number;
  reaches: boolean;
}

const rocket = (ve: number, m0: number, m1: number): number =>
  m1 > 0 && m0 > m1 ? ve * Math.log(m0 / m1) : 0;

export function climbFrom(body: FlightBody, boosters: Boosters | undefined, ship: ClimbShip): Climb {
  const need = surfaceToOrbit(body);
  const shipMass = ship.dry + ship.propellant;
  const boosterMass = boosters?.mass ?? 0;
  const boosterLoad = boosters?.load ?? 0;
  const liftoffMass = shipMass + boosterMass + boosterLoad;
  const air = body.atmosphere !== undefined;
  const drive = ship.drive;
  const liftoffThrust = boosters
    ? air
      ? boosters.thrustSeaLevel
      : boosters.thrust
    : drive
      ? (air ? drive.thrustSeaLevel : drive.thrust) * drive.throttle
      : 0;
  const twr = liftoffMass > 0 ? liftoffThrust / (liftoffMass * surfaceGravity(body)) : 0;
  const veBooster = (boosters?.isp ?? 0) * G0;
  const boosterDv = boosters ? rocket(veBooster, liftoffMass, liftoffMass - boosterLoad) : 0;
  const veShip = (drive?.isp ?? 0) * G0;
  const shipDv = drive ? rocket(veShip, shipMass, ship.dry) : 0;
  const deltaV = boosterDv + shipDv;

  let boosterBurned = boosterLoad;
  let shipBurned = 0;
  if (boosters && boosterDv >= need) boosterBurned = liftoffMass * (1 - Math.exp(-need / veBooster));
  else if (veShip > 0)
    shipBurned = Math.min(ship.propellant, shipMass * (1 - Math.exp(-(need - boosterDv) / veShip)));
  return {
    boosters: boosters?.count ?? 0,
    boosterMass,
    boosterLoad,
    liftoffMass,
    liftoffThrust,
    twr,
    boosterDv,
    shipDv,
    deltaV,
    need,
    boosterBurned: boosters ? boosterBurned : 0,
    shipBurned,
    leftover: Math.max(0, ship.propellant - shipBurned),
    reaches: twr >= MIN_LIFTOFF_TWR && deltaV >= need - 1e-9
  };
}

export const climbReasons = (c: Climb): string[] => [
  ...(c.twr < MIN_LIFTOFF_TWR
    ? [`Lift-off thrust to weight is ${c.twr.toFixed(2)}; ${MIN_LIFTOFF_TWR} is needed.`]
    : []),
  ...(c.deltaV < c.need - 1e-9
    ? [
        `Delta-v to orbit is ${(c.deltaV / 1000).toFixed(2)} km/s; reaching orbit takes ${(c.need / 1000).toFixed(2)} km/s.`
      ]
    : [])
];
