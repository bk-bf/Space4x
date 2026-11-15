import type { Game } from '../state.svelte';
import { KM_PER_UNIT, bodyPosition, parkingSpot } from '../orbits';
import { registerSystem } from '../systems';
import type { Body, Fleet } from '../types';

function park(fleet: Fleet, body: Body, elapsed: number): void {
  const spot = parkingSpot(fleet, body, elapsed);
  fleet.x = spot.x;
  fleet.y = spot.y;
  fleet.heading = spot.heading;
}

function arrive(game: Game, fleet: Fleet, body: Body): void {
  fleet.at = body.id;
  fleet.destination = undefined;
  fleet.note = body.name;
  if (fleet.orders[0]?.startsWith('Move to')) fleet.orders.shift();
  for (const s of fleet.ships) if (s.status === 'Under way') s.status = 'In orbit';
  game.log('ship', `${fleet.name} arrived at ${body.name}.`);
}

function travel(game: Game, fleet: Fleet, target: Body, dt: number): void {
  const [tx, ty] = bodyPosition(target);
  const dx = tx - fleet.x,
    dy = ty - fleet.y,
    dist = Math.hypot(dx, dy),
    reach = (fleet.speedKmS * dt) / KM_PER_UNIT;
  if (Math.abs(dx) > 1e-9) fleet.heading = dx > 0 ? 1 : -1;
  if (reach >= dist) {
    arrive(game, fleet, target);
    park(fleet, target, game.elapsed);
    return;
  }
  fleet.x += (dx / dist) * reach;
  fleet.y += (dy / dist) * reach;
}

registerSystem('fleets', (game, dt) => {
  for (const fleet of game.world.fleets) {
    const target = fleet.destination ? game.body(fleet.destination) : undefined;
    const home = fleet.at ? game.body(fleet.at) : undefined;
    if (target) travel(game, fleet, target, dt);
    else if (home) park(fleet, home, game.elapsed);
  }
});
