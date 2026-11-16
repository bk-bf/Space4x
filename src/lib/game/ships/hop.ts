import { economy } from '#lib/game/economy/index.ts';
import {
  massAfterBurn,
  MIN_LANDING_TWR,
  MIN_LIFTOFF_TWR,
  orbitToSurface,
  shipDeltaV,
  shipMass,
  shipThrust,
  surfaceToOrbit
} from '#lib/game/flight/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { canAerobrake, mainKind, vesselShip } from './model.ts';
import { siteOf } from './orders.ts';
import { reasonText } from './trips.ts';
import type { Vessel } from './types.ts';
import { flightBody } from './world.ts';

export const HOP_SECONDS = 3600;

export type HopKind = 'descent' | 'ascent';

export interface Hop {
  kind: HopKind;
  dv: number;
  propellant: number;
  seconds: number;
}

export function surfaceBodyOf(v: Vessel): string | undefined {
  if (v.at.kind === 'surface') return v.at.body;
  const site = v.at.kind === 'site' ? siteOf(v.at.site) : undefined;
  return site?.place === 'surface' ? site.worldBody : undefined;
}

const surfaceG = (gm: number, radius: number): number => gm / (radius * radius);

export function planHop(game: Game, v: Vessel, kind: HopKind, body: string): Hop | string {
  const ship = vesselShip(v);
  const fb = flightBody(game, body);
  if (!ship) return 'The ship has no drive.';
  if (!fb) return reasonText({ code: 'unknown-body', message: '' });
  const aero = kind === 'descent' && !!fb.atmosphere && canAerobrake(v);
  const dv = kind === 'descent' ? orbitToSurface(fb, { aero }) : surfaceToOrbit(fb);
  const mass = shipMass(ship);
  const g = surfaceG(fb.gm, fb.radius);
  if (!aero) {
    const finalMass = kind === 'descent' ? ship.dryMass + ship.payload : mass;
    const thrust = shipThrust(ship, kind === 'ascent' && !!fb.atmosphere);
    const twr = thrust / (finalMass * g);
    const need = kind === 'descent' ? MIN_LANDING_TWR : MIN_LIFTOFF_TWR;
    if (twr < need)
      return reasonText({
        code: kind === 'descent' ? 'thrust-landing' : 'thrust-surface',
        message: '',
        need,
        have: twr
      });
  }
  const have = shipDeltaV(ship);
  if (have < dv) return reasonText({ code: 'delta-v', message: '', need: dv, have });
  return { kind, dv, propellant: mass - massAfterBurn(mass, dv, ship.engine.isp), seconds: HOP_SECONDS };
}

export function burnHop(v: Vessel, hop: Hop): void {
  const kind = mainKind(v);
  if (!kind) return;
  const used = Math.min(hop.propellant, v.propellant[kind] ?? 0);
  v.propellant[kind] = (v.propellant[kind] ?? 0) - used;
  economy.ledger.burned += used;
}
