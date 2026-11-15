import { fleetSpeed } from './classes.svelte';
import { DAY } from './clock';
import { KM_PER_UNIT, parkingSpot, type Point } from './orbits';
import type { Game } from './state.svelte';
import type { Body, Fleet, JumpPoint, Order, OrderType } from './types';

export const ORDER_TYPES: readonly { type: OrderType; label: string }[] = [
  { type: 'move', label: 'Move to' },
  { type: 'survey', label: 'Survey' },
  { type: 'orbit', label: 'Hold orbit at' },
  { type: 'load', label: 'Load cargo at' },
  { type: 'unload', label: 'Unload at' },
  { type: 'join', label: 'Join fleet' },
  { type: 'refuel', label: 'Refuel at colony' }
];

export const SURVEY_DAYS_PER_RADIUS = 6;
export const CARGO_SECONDS = 2 * DAY;
export const REFUEL_PER_DAY = 20;
export const FUEL_PER_UNIT = 0.02;

let lastOrderId = 0;

export const nextOrderId = (): number => ++lastOrderId;

export const isColony = (b: Body): boolean => b.colony === true;

export const canCarry = (f: Fleet): boolean => f.kind === 'civ';

export function orderTypesFor(f: Fleet): OrderType[] {
  return ORDER_TYPES.map((o) => o.type).filter((t) => canCarry(f) || (t !== 'load' && t !== 'unload'));
}

export interface OrderTarget {
  id: string;
  name: string;
}

export function orderTargets(game: Game, f: Fleet, type: OrderType): OrderTarget[] {
  const bodies = game.world.bodies.filter((b) => b.system === f.system);
  const named = (list: readonly { id: string; name: string }[]) => list.map(({ id, name }) => ({ id, name }));
  if (type === 'move') return named([...bodies, ...(game.starSystem(f.system)?.jumps ?? [])]);
  if (type === 'survey' || type === 'orbit') return named(bodies);
  if (type === 'join') return named(game.world.fleets.filter((o) => o.system === f.system && o.id !== f.id));
  return named(bodies.filter(isColony));
}

export function parkingSlot(game: Game, f: Fleet, bodyId: string): number {
  return game.world.fleets.filter((o) => o === f || (o.at === bodyId && o.system === f.system)).indexOf(f);
}

export interface Goal {
  x: number;
  y: number;
  name: string;
  body?: Body;
  jump?: JumpPoint;
  fleet?: Fleet;
}

export function resolveGoal(game: Game, f: Fleet, o: Order): Goal | undefined {
  if (o.type === 'join') {
    const t = game.fleet(o.target);
    return t && t.id !== f.id && t.system === f.system
      ? { x: t.x, y: t.y, name: t.name, fleet: t }
      : undefined;
  }
  const b = game.body(o.target);
  if (b) {
    if (b.system !== f.system) return undefined;
    const spot = parkingSpot(f, b, game.world.bodies, game.elapsed, parkingSlot(game, f, b.id));
    return { x: spot.x, y: spot.y, name: b.name, body: b };
  }
  const j = o.type === 'move' ? game.jump(o.target) : undefined;
  return j && j.system.id === f.system
    ? { x: j.point.x, y: j.point.y, name: j.point.name, jump: j.point }
    : undefined;
}

function targetName(game: Game, o: Order): string {
  return (
    game.body(o.target)?.name ??
    game.jump(o.target)?.point.name ??
    game.fleet(o.target)?.name ??
    'a lost target'
  );
}

export function orderLabel(game: Game, o: Order): string {
  const name = targetName(game, o);
  switch (o.type) {
    case 'move':
      return `Move to ${name}`;
    case 'survey':
      return `Survey ${name}`;
    case 'orbit':
      return `Hold orbit at ${name}`;
    case 'load':
      return `Load cargo at ${name}`;
    case 'unload':
      return `Unload at ${name}`;
    case 'join':
      return `Join ${name}`;
    case 'refuel':
      return `Refuel at ${name}`;
  }
}

export function workSeconds(game: Game, f: Fleet, o: Order, fuel = f.meters.fuel): number {
  if (o.type === 'survey') return (game.body(o.target)?.radius ?? 0) * SURVEY_DAYS_PER_RADIUS * DAY;
  if (o.type === 'load' || o.type === 'unload') return CARGO_SECONDS;
  if (o.type === 'refuel') return (Math.max(0, 100 - fuel) / REFUEL_PER_DAY) * DAY + o.done;
  return 0;
}

export const travelSeconds = (f: Fleet, units: number): number => (units * KM_PER_UNIT) / fleetSpeed(f);

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'never';
  if (seconds < 60) return 'now';
  if (seconds < DAY) return `+${Math.max(1, Math.round(seconds / 3600))} h`;
  return `+${(seconds / DAY).toFixed(1)} d`;
}

export function orderEtas(game: Game, f: Fleet): string[] {
  let pos: Point = [f.x, f.y],
    at = f.at,
    t = 0,
    fuel = f.meters.fuel,
    holding = false;
  return f.orders.map((o) => {
    if (holding) return '-';
    const goal = resolveGoal(game, f, o);
    if (!goal) return 'lost';
    if (!(goal.body && at === goal.body.id)) {
      const units = Math.hypot(goal.x - pos[0], goal.y - pos[1]);
      t += travelSeconds(f, units);
      fuel -= units * FUEL_PER_UNIT;
      pos = [goal.x, goal.y];
      at = goal.body?.id;
    }
    if (o.type === 'orbit') {
      holding = true;
      return 'hold';
    }
    t += Math.max(0, workSeconds(game, f, o, fuel) - o.done);
    if (o.type === 'refuel') fuel = 100;
    return formatEta(t);
  });
}

export function addOrder(f: Fleet, type: OrderType, target: string): Order {
  const order: Order = { id: nextOrderId(), type, target, done: 0 };
  f.orders.push(order);
  return order;
}

export function moveOrder(f: Fleet, index: number, by: number): number {
  const to = index + by;
  if (index < 0 || to < 0 || index >= f.orders.length || to >= f.orders.length) return index;
  const [o] = f.orders.splice(index, 1);
  f.orders.splice(to, 0, o!);
  return to;
}

export function removeOrder(f: Fleet, index: number): void {
  if (index >= 0 && index < f.orders.length) f.orders.splice(index, 1);
}

export function clearOrders(f: Fleet): void {
  f.orders.splice(0);
}
