import { DAY } from '#lib/game/clock.ts';
import { drainDeliveries, economy, touch } from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { DOCK_SECONDS, HANDLING_SECONDS, loadItem, unloadItem } from './cargo.ts';
import { classes } from '#lib/game/classes.svelte.ts';
import { completeSurvey, isSurveyable, isSurveyed, surveyDays } from '#lib/game/survey.svelte.ts';
import { burnHop, planHop, surfaceBodyOf, type HopKind } from './hop.ts';
import { canSample, canSurvey, cargoRoom, designOf, mainKind } from './model.ts';
import { SAMPLE_DAYS, SAMPLE_KG, sampleMaterial } from './sample.ts';
import { cycleOrders } from './run.ts';
import { ships } from './state.svelte.ts';
import {
  arrivalPlace,
  clockAt,
  commitTrip,
  destinationOf,
  finishTrip,
  needsLaunchStack,
  pickOption,
  planVessel,
  type Destination
} from './trips.ts';
import type { Order, Vessel } from './types.ts';
import { bodyOfWhereabouts, tripOptionOf } from './world.ts';
import { siteOf } from './orders.ts';

const MAX_STEPS = 256;

function say(game: Game, v: Vessel, text: string, t: number, warn = false): void {
  game.log('ship', text, warn, { at: clockAt(t), subject: { kind: 'ship', id: v.id } });
}

export function spawnDeliveries(game: Game): void {
  for (const d of drainDeliveries(economy)) {
    const design = classes.find(d.design);
    if (!design) continue;
    const id = `ship-${ships.nextId++}`;
    ships.vessels.push({
      id,
      name: `${design.name} ${ships.built + 1}`,
      design: design.id,
      at: { kind: 'site', site: d.site },
      trip: null,
      propellant: {},
      cargo: {},
      crew: 0,
      orders: [],
      run: null,
      progress: 0,
      blocked: null
    });
    ships.built++;
    game.log('ship', `${design.name} ${ships.built} left the yard.`, false, {
      at: clockAt(d.at),
      subject: { kind: 'ship', id }
    });
  }
}

function work(v: Vessel, seconds: number, cursor: { t: number }, end: number): boolean {
  const need = seconds - v.progress;
  const avail = end - cursor.t;
  if (avail + 1e-9 >= need) {
    cursor.t += Math.max(0, need);
    v.progress = 0;
    return true;
  }
  v.progress += avail;
  cursor.t = end;
  return false;
}

function sameOrbit(v: Vessel, d: Destination): boolean {
  if (d.kind !== 'orbit') return false;
  if (v.at.kind === 'orbit') return v.at.body === d.body;
  if (v.at.kind !== 'site') return false;
  const s = siteOf(v.at.site);
  return !!s && s.place === 'orbit' && s.worldBody === d.body;
}

function block(v: Vessel, reason: string): void {
  v.blocked = reason;
}

function hopKind(v: Vessel, o: Order & { type: 'fly' | 'land' }): HopKind | null {
  if (o.type === 'land') return sameOrbit(v, { kind: 'orbit', body: o.body, angle: 0 }) ? 'descent' : null;
  const on = surfaceBodyOf(v);
  return on === o.body ? 'ascent' : null;
}

function hop(
  game: Game,
  v: Vessel,
  kind: HopKind,
  o: Order & { type: 'fly' | 'land' },
  cursor: { t: number },
  end: number
) {
  const dest = destinationOf(o)!;
  const plan = planHop(game, v, kind, o.body);
  if (typeof plan === 'string') {
    block(v, plan);
    return false;
  }
  if (!work(v, plan.seconds, cursor, end)) return false;
  burnHop(v, plan);
  v.at =
    kind === 'descent' ? arrivalPlace(game, dest) : { kind: 'orbit', body: dest.body, angle: dest.angle };
  v.blocked = null;
  const name = game.body(o.body)?.name ?? o.body;
  say(
    game,
    v,
    kind === 'descent' ? `${v.name} landed on ${name}.` : `${v.name} reached orbit of ${name}.`,
    cursor.t
  );
  return true;
}

function fly(game: Game, v: Vessel, o: Order & { type: 'fly' | 'land' }, t: number): boolean {
  const dest = destinationOf(o)!;
  if (sameOrbit(v, dest)) {
    v.at = { kind: 'orbit', body: dest.body, angle: dest.angle };
    v.blocked = null;
    return true;
  }
  const plan = planVessel(game, v, dest, t, o.profile === 'cheapest' ? 'cheapest' : undefined);
  const option = pickOption(plan.options, o.profile);
  if (!option) {
    block(v, plan.reasons[0] ?? 'No trip is possible.');
    return false;
  }
  commitTrip(game, v, dest, option);
  const to = arrivalPlace(game, dest);
  const name = to.kind === 'site' ? (siteOf(to.site)?.name ?? '') : (game.body(dest.body)?.name ?? '');
  say(game, v, `${v.name} left for ${name}; it arrives in ${(option.duration / DAY).toFixed(1)} days.`, t);
  return true;
}

function step(game: Game, v: Vessel, cursor: { t: number }, end: number): 'next' | 'stop' {
  const order = v.orders[0];
  if (!order) {
    if (v.run && v.at.kind === 'site') {
      const next = cycleOrders(v.run, mainKind(v));
      if (next?.length) {
        v.orders = next;
        return 'next';
      }
    }
    return 'stop';
  }
  if (order.type === 'fly' || order.type === 'land') {
    if (needsLaunchStack(game, v.at)) {
      block(v, 'A ship on Earth leaves by launch stack, not by trip.');
      return 'stop';
    }
    const local = hopKind(v, order);
    if (local) {
      if (!hop(game, v, local, order, cursor, end)) return 'stop';
    } else if (!fly(game, v, order, cursor.t)) return 'stop';
    v.orders.shift();
    return 'next';
  }
  if (order.type === 'survey') {
    const world = order.body;
    const name = game.body(world)?.name ?? world;
    if (!isSurveyable(world) || isSurveyed(world)) {
      v.orders.shift();
      v.progress = 0;
      v.blocked = null;
      return 'next';
    }
    if (!canSurvey(designOf(v))) {
      block(v, `${v.name} carries no survey instruments.`);
      return 'stop';
    }
    if (!sameOrbit(v, { kind: 'orbit', body: world, angle: 0 })) {
      block(v, `${v.name} must be in orbit of ${name} to survey it.`);
      return 'stop';
    }
    v.blocked = null;
    if (!work(v, surveyDays(world) * DAY, cursor, end)) return 'stop';
    completeSurvey(world);
    say(game, v, `${v.name} surveyed ${name}: its regions and grades are known.`, cursor.t);
    v.orders.shift();
    touch();
    return 'next';
  }
  if (order.type === 'sample') {
    const world = bodyOfWhereabouts(v.at);
    const found = world ? sampleMaterial(world) : undefined;
    if (!world || !found) {
      block(v, `${v.name} is not at an asteroid.`);
      return 'stop';
    }
    if (!canSample(designOf(v))) {
      block(v, `${v.name} carries no sampling arm.`);
      return 'stop';
    }
    if (cargoRoom(v) <= 0) {
      block(v, `${v.name} has no room for a sample.`);
      return 'stop';
    }
    v.blocked = null;
    if (!work(v, SAMPLE_DAYS * DAY, cursor, end)) return 'stop';
    v.cargo[found] = (v.cargo[found] ?? 0) + Math.min(SAMPLE_KG, cargoRoom(v));
    say(game, v, `${v.name} took a sample of ${game.body(world)?.name ?? world}.`, cursor.t);
    v.orders.shift();
    return 'next';
  }
  if (order.type === 'wait') {
    if (!work(v, order.seconds, cursor, end)) return 'stop';
    v.orders.shift();
    return 'next';
  }
  if (order.type === 'dock') {
    const site = siteOf(order.site);
    if (!site) {
      v.orders.shift();
      return 'next';
    }
    const sameSite = v.at.kind === 'site' && v.at.site === site.id;
    const inOrbit = v.at.kind === 'orbit' && site.place === 'orbit' && v.at.body === site.worldBody;
    if (!sameSite && !inOrbit) {
      block(v, `${v.name} is not in orbit at ${site.name}.`);
      return 'stop';
    }
    if (!work(v, DOCK_SECONDS, cursor, end)) return 'stop';
    v.at = { kind: 'site', site: site.id };
    v.blocked = null;
    v.orders.shift();
    return 'next';
  }
  if (v.at.kind !== 'site') {
    block(v, `${v.name} must be docked or landed at a site to move cargo.`);
    return 'stop';
  }
  const site = siteOf(v.at.site);
  if (!site) return 'stop';
  if (!work(v, HANDLING_SECONDS, cursor, end)) return 'stop';
  const moved = (order.type === 'load' ? loadItem : unloadItem)(site, v, order.item, order.amount);
  if (moved <= 0 && order.amount !== null && order.item.kind !== 'propellant')
    say(game, v, `${v.name} found nothing to ${order.type} at ${site.name}.`, cursor.t, true);
  v.blocked = null;
  v.orders.shift();
  touch();
  return 'next';
}

function run(game: Game, v: Vessel, start: number, end: number): void {
  const cursor = { t: start };
  for (let i = 0; i < MAX_STEPS; i++) {
    if (v.trip) {
      const option = tripOptionOf(v.id);
      if (!option || v.trip.arrival <= end + 1e-9) {
        cursor.t = Math.max(cursor.t, v.trip.arrival);
        finishTrip(game, v, cursor.t);
        continue;
      }
      return;
    }
    if (step(game, v, cursor, end) === 'stop') return;
  }
}

export function advanceShips(game: Game, dt: number): void {
  spawnDeliveries(game);
  const end = game.elapsed;
  for (const v of [...ships.vessels]) run(game, v, end - dt, end);
}
