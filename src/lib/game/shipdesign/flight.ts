import type { Ship } from '#lib/game/flight/index.ts';
import { PROPELLANT_KINDS } from './propellants.ts';
import { designStats } from './stats.ts';
import type { ShipDesign } from './types.ts';

export interface FlightLoad {
  propellant?: number;
  payload?: number;
}

export function flightShip(design: ShipDesign, load: FlightLoad = {}): Ship | undefined {
  const stats = designStats(design);
  const main = stats.main;
  if (!main) return undefined;
  const others = PROPELLANT_KINDS.filter((k) => k !== main.propellant).reduce(
    (total, k) => total + (stats.propellant[k] ?? 0),
    0
  );
  const room = stats.capacity[main.propellant] ?? 0;
  const propellant = Math.max(0, Math.min(room, load.propellant ?? main.load));
  const payload = Math.max(0, Math.min(stats.payloadCapacity, load.payload ?? 0));
  return {
    dryMass: stats.dryMass + others,
    payload,
    propellant,
    engine: {
      isp: main.isp,
      thrust: main.thrust,
      thrustSeaLevel: main.thrustSeaLevel,
      ...(main.power > 0 ? { power: main.power } : {})
    },
    powerAvailable: Math.max(0, stats.power.balance)
  };
}
