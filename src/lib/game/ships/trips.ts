import { START_TIME } from '#lib/game/clock.ts';
import { economy, standing } from '#lib/game/economy/index.ts';
import { planTrip, type Place, type Profile, type Reason, type TripOption } from '#lib/game/flight/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { canAerobrake, mainKind, vesselShip } from './model.ts';
import { surfaceSite } from './orders.ts';
import type { Order, Vessel, Whereabouts } from './types.ts';
import {
  bodyOfWhereabouts,
  clearTripOption,
  flightBody,
  flightSystem,
  placeOf,
  setTripOption,
  tripOptionOf
} from './world.ts';

export interface Destination {
  kind: 'orbit' | 'surface';
  body: string;
  angle: number;
  region?: string;
}

export const clockAt = (t: number): number => START_TIME + t * 1000;

export const kms = (v: number): string => `${(v / 1000).toFixed(2)} km/s`;

export function reasonText(r: Reason): string {
  if (r.code === 'delta-v') return `Needs ${kms(r.need ?? 0)} of delta-v; the ship has ${kms(r.have ?? 0)}.`;
  if (r.code === 'thrust-surface')
    return `Thrust to weight is ${(r.have ?? 0).toFixed(2)} and ${(r.need ?? 0).toFixed(1)} is needed to leave the surface.`;
  if (r.code === 'thrust-landing')
    return `Thrust to weight is ${(r.have ?? 0).toFixed(2)} and ${(r.need ?? 0).toFixed(1)} is needed to land.`;
  if (r.code === 'same-place') return 'The ship is already there.';
  if (r.code === 'unknown-body') return 'That body is not in the flight model.';
  return 'No transfer exists between these places.';
}

export const needsLaunchStack = (game: Game, w: Whereabouts): boolean => {
  if (w.kind !== 'site') return false;
  const site = economy.sites.find((s) => s.id === w.site);
  if (!site || site.place !== 'surface' || standing(site, 'launch_site') <= 0) return false;
  return !!flightBody(game, site.worldBody)?.atmosphere;
};

export function toPlace(d: Destination): Place {
  return d.kind === 'orbit'
    ? { kind: 'orbit', body: d.body, angle: d.angle }
    : { kind: 'surface', body: d.body };
}

export interface VesselPlan {
  options: TripOption[];
  reasons: string[];
}

export function planVessel(
  game: Game,
  v: Vessel,
  to: Destination,
  departAfter = game.elapsed,
  only?: Profile
): VesselPlan {
  const from = placeOf(v.at);
  const ship = vesselShip(v);
  if (!from || !ship) return { options: [], reasons: ['The ship has no drive.'] };
  if (needsLaunchStack(game, v.at))
    return { options: [], reasons: ['A ship on Earth leaves by launch stack, not by trip.'] };
  const plan = planTrip({
    from,
    to: toPlace(to),
    departAfter,
    ship,
    system: flightSystem(game),
    aerobrake: canAerobrake(v),
    ...(only ? { only } : {})
  });
  return {
    options: plan.options.filter((o) => o.canStop),
    reasons: plan.options.some((o) => o.canStop) ? [] : plan.reasons.map(reasonText)
  };
}

export function pickOption(options: readonly TripOption[], profile: Profile): TripOption | undefined {
  return options.find((o) => o.profile === profile) ?? options[0];
}

export function arrivalPlace(game: Game, d: Destination): Whereabouts {
  if (d.kind === 'orbit') return { kind: 'orbit', body: d.body, angle: d.angle };
  const site = surfaceSite(d.body, d.region);
  return site
    ? { kind: 'site', site: site.id }
    : { kind: 'surface', body: d.body, ...(d.region ? { region: d.region } : {}) };
}

export function commitTrip(game: Game, v: Vessel, to: Destination, option: TripOption): void {
  const kind = mainKind(v);
  if (kind) {
    const used = Math.min(option.propellant, v.propellant[kind] ?? 0);
    v.propellant[kind] = (v.propellant[kind] ?? 0) - used;
    economy.ledger.burned += used;
  }
  v.trip = {
    to: arrivalPlace(game, to),
    profile: option.profile,
    departure: option.departure,
    arrival: option.stamps.end,
    dv: option.dv,
    propellant: option.propellant
  };
  v.blocked = null;
  setTripOption(v.id, option);
}

export function finishTrip(game: Game, v: Vessel, t: number): void {
  if (!v.trip) return;
  const to = v.trip.to;
  v.at = to.kind === 'orbit' ? { ...to } : to;
  v.trip = null;
  clearTripOption(v.id);
  const body = bodyOfWhereabouts(v.at);
  const name = body ? (game.body(body)?.name ?? body) : 'its destination';
  game.log('ship', `${v.name} arrived at ${name}.`, false, {
    at: clockAt(t),
    subject: { kind: 'ship', id: v.id }
  });
}

export const tripOf = (v: Vessel): TripOption | undefined => tripOptionOf(v.id);

export const destinationOf = (order: Order): Destination | undefined => {
  if (order.type === 'fly') return { kind: 'orbit', body: order.body, angle: order.angle };
  if (order.type === 'land')
    return { kind: 'surface', body: order.body, angle: 0, ...(order.region ? { region: order.region } : {}) };
  return undefined;
};
