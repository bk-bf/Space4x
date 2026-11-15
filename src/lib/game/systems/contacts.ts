import { formatEventTime } from '../clock';
import { bodyPosition, KM_PER_UNIT } from '../orbits';
import { isColony } from '../orders';
import type { Game } from '../state.svelte';
import { registerSystem } from '../systems';
import type { Contact } from '../types';

export const FLEET_SENSOR = 40;
export const COLONY_SENSOR = 60;
export const UNITS_PER_AU = 74;
const FIX_EVERY_MS = 6 * 3600 * 1000;
const FIXES_KEPT = 8;

export interface Observer {
  name: string;
  x: number;
  y: number;
  reach: number;
}

export function observers(game: Game, system: string): Observer[] {
  return [
    ...game.world.fleets
      .filter((f) => f.system === system)
      .map((f) => ({ name: f.name, x: f.x, y: f.y, reach: FLEET_SENSOR })),
    ...game.world.bodies
      .filter((b) => b.system === system && isColony(b))
      .map((b) => {
        const [x, y] = bodyPosition(b, game.world.bodies);
        return { name: b.name, x, y, reach: COLONY_SENSOR };
      })
  ];
}

export function nearest(
  list: readonly Observer[],
  x: number,
  y: number
): { o: Observer; d: number } | undefined {
  let best: { o: Observer; d: number } | undefined;
  for (const o of list) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (!best || d < best.d) best = { o, d };
  }
  return best;
}

export const bearing = (from: { x: number; y: number }, x: number, y: number): number =>
  Math.round(((Math.atan2(x - from.x, -(y - from.y)) * 180) / Math.PI + 360) % 360);

export const formatAu = (units: number): string => `${(units / UNITS_PER_AU).toFixed(1)} AU`;

function move(c: Contact, dt: number): void {
  if (!c.route.length || c.speedKmS <= 0) return;
  let reach = (c.speedKmS * dt) / KM_PER_UNIT;
  for (let n = 0; n < 500 && reach > 0; n++) {
    const [tx, ty] = c.route[c.leg % c.route.length]!,
      d = Math.hypot(tx - c.x, ty - c.y);
    if (d <= reach) {
      c.x = tx;
      c.y = ty;
      reach -= d;
      c.leg = (c.leg + 1) % c.route.length;
    } else {
      c.x += ((tx - c.x) / d) * reach;
      c.y += ((ty - c.y) / d) * reach;
      reach = 0;
    }
  }
}

function track(game: Game, c: Contact): void {
  const near = nearest(observers(game, c.system), c.x, c.y),
    held = !!near && near.d <= near.o.reach;
  if (near) c.range = formatAu(near.d);
  if (held) {
    const last = c.fixes.at(-1);
    if (!last || game.time - last.at >= FIX_EVERY_MS) {
      c.fixes.push({ at: game.time, x: c.x, y: c.y });
      if (c.fixes.length > FIXES_KEPT) c.fixes.splice(0, c.fixes.length - FIXES_KEPT);
    }
  }
  if (held !== c.held && c.hostile && near) {
    const subject = { kind: 'contact' as const, id: c.id };
    if (held) game.log('eye', `${near.o.name} picked up ${c.id} at ${c.range}.`, true, { subject });
    else game.log('eye', `${near.o.name} lost its track on ${c.id}.`, true, { subject });
  }
  c.held = held;
  const seen = c.fixes.at(-1);
  if (seen) c.seen = formatEventTime(seen.at, game.time);
}

registerSystem('contacts', (game, dt) => {
  for (const c of game.world.contacts) {
    move(c, dt);
    track(game, c);
  }
});
