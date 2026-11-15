import { G0 } from './constants.ts';

export interface Engine {
  isp: number;
  thrust: number;
  thrustSeaLevel?: number;
  power?: number;
}

export interface Ship {
  dryMass: number;
  payload: number;
  propellant: number;
  engine: Engine;
  count?: number;
  powerAvailable?: number;
}

export const exhaustVelocity = (isp: number): number => isp * G0;

export const shipThrust = (ship: Ship, seaLevel = false): number => {
  const e = ship.engine;
  const each = seaLevel ? (e.thrustSeaLevel ?? e.thrust) : e.thrust;
  const throttle =
    e.power && ship.powerAvailable !== undefined ? Math.min(1, ship.powerAvailable / e.power) : 1;
  return each * (ship.count ?? 1) * throttle;
};

export const propellantForDv = (dv: number, finalMass: number, isp: number): number =>
  finalMass * Math.expm1(dv / exhaustVelocity(isp));

export const dvFromMasses = (isp: number, initialMass: number, finalMass: number): number =>
  exhaustVelocity(isp) * Math.log(initialMass / finalMass);

export const massAfterBurn = (mass: number, dv: number, isp: number): number =>
  mass * Math.exp(-dv / exhaustVelocity(isp));

export const shipMass = (ship: Ship): number => ship.dryMass + ship.payload + ship.propellant;

export const shipDeltaV = (ship: Ship): number =>
  dvFromMasses(ship.engine.isp, shipMass(ship), ship.dryMass + ship.payload);

export const burnTime = (mass: number, thrust: number, isp: number, dv: number): number => {
  const ve = exhaustVelocity(isp);
  return ((mass * ve) / thrust) * -Math.expm1(-dv / ve);
};

export const meanAcceleration = (mass: number, thrust: number, isp: number, dv: number): number => {
  const ve = exhaustVelocity(isp);
  const x = dv / ve;
  if (x < 1e-9) return thrust / mass;
  return thrust / ((mass * -Math.expm1(-x)) / x);
};

export interface LegResult {
  dv: number;
  propellant: number;
  massStart: number;
  massEnd: number;
  propellantLeft: number;
  feasible: boolean;
}

export function legBudget(ship: Ship, dvs: readonly number[]): LegResult[] {
  const out: LegResult[] = [];
  let mass = shipMass(ship);
  let left = ship.propellant;
  for (const dv of dvs) {
    const massEnd = massAfterBurn(mass, dv, ship.engine.isp);
    const used = mass - massEnd;
    left -= used;
    out.push({
      dv,
      propellant: used,
      massStart: mass,
      massEnd,
      propellantLeft: left,
      feasible: left >= -1e-9 * ship.propellant
    });
    mass = massEnd;
  }
  return out;
}

export const roundTripFeasible = (ship: Ship, outDv: number, backDv: number): boolean =>
  legBudget(ship, [outDv, backDv]).every((l) => l.feasible);
