import { DAY } from '../clock';
import { KM_PER_UNIT, parkingSpot } from '../orbits';
import {
  canCarry,
  FUEL_PER_UNIT,
  isColony,
  orderLabel,
  parkingSlot,
  REFUEL_PER_DAY,
  resolveGoal,
  workSeconds,
  type Goal
} from '../orders';
import type { Game } from '../state.svelte';
import { registerSystem } from '../systems';
import type { Body, Fleet, Order } from '../types';

const MAX_STEPS = 32;
const LOW_FUEL = 50;

interface Run {
  game: Game;
  fleet: Fleet;
  dt: number;
  used: number;
}

type Outcome = 'done' | 'wait';

const left = (r: Run) => r.dt - r.used;

function say(r: Run, text: string, warn = false): void {
  r.game.log('ship', text, warn, {
    at: r.game.time - left(r) * 1000,
    subject: { kind: 'fleet', id: r.fleet.id }
  });
}

function setActivity(f: Fleet, activity: string): void {
  if (f.activity === activity) return;
  f.activity = activity;
  for (const s of f.ships) s.status = s.fuel < LOW_FUEL ? 'Low fuel' : activity;
}

function burn(f: Fleet, units: number): void {
  const used = units * FUEL_PER_UNIT;
  f.meters.fuel = Math.max(0, f.meters.fuel - used);
  for (const s of f.ships) s.fuel = Math.max(0, s.fuel - used);
}

function park(game: Game, f: Fleet, body: Body): void {
  Object.assign(f, parkingSpot(f, body, game.world.bodies, game.elapsed, parkingSlot(game, f, body.id)));
}

function travel(r: Run, goal: Goal): boolean {
  const f = r.fleet,
    dx = goal.x - f.x,
    dy = goal.y - f.y,
    dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  if (f.meters.fuel <= 0) {
    if (f.activity !== 'Out of fuel') say(r, `${f.name} ran out of fuel.`, true);
    setActivity(f, 'Out of fuel');
    r.used = r.dt;
    return false;
  }
  if (Math.abs(dx) > 1e-9) f.heading = dx > 0 ? 1 : -1;
  const speed = f.speedKmS / KM_PER_UNIT,
    need = dist / speed;
  if (need <= left(r)) {
    f.x = goal.x;
    f.y = goal.y;
    r.used += need;
    burn(f, dist);
    return true;
  }
  const reach = speed * left(r);
  f.x += (dx / dist) * reach;
  f.y += (dy / dist) * reach;
  r.used = r.dt;
  burn(f, reach);
  return false;
}

function transit(r: Run, goal: Goal): void {
  const f = r.fleet,
    pair = goal.jump ? r.game.jump(goal.jump.to) : undefined;
  if (!pair) return;
  f.system = pair.system.id;
  f.x = pair.point.x;
  f.y = pair.point.y;
  f.at = undefined;
  f.note = pair.point.name;
  say(r, `${f.name} jumped to ${pair.system.name}.`);
}

function join(r: Run, target: Fleet): void {
  const f = r.fleet,
    game = r.game,
    a = f.ships.length,
    b = target.ships.length,
    mean = (x: number, y: number) => Math.round((x * a + y * b) / (a + b));
  target.meters = {
    fuel: mean(f.meters.fuel, target.meters.fuel),
    supplies: mean(f.meters.supplies, target.meters.supplies),
    crew: mean(f.meters.crew, target.meters.crew)
  };
  target.ships.push(...f.ships);
  game.world.fleets.splice(game.world.fleets.indexOf(f), 1);
  if (game.selection.kind === 'fleet' && game.selection.id === f.id)
    game.select({ kind: 'fleet', id: target.id });
  say(r, `${f.name} joined ${target.name}.`);
}

const WORKING: Partial<Record<Order['type'], string>> = {
  survey: 'Surveying',
  load: 'Loading',
  unload: 'Unloading',
  refuel: 'Refuelling'
};

function refuse(r: Run, o: Order, body: Body): string | undefined {
  const f = r.fleet;
  if ((o.type === 'load' || o.type === 'unload') && !canCarry(f)) return `${f.name} has no cargo holds.`;
  if (o.type === 'unload' && !f.cargo) return `${f.name} has no cargo to unload at ${body.name}.`;
  if (o.type !== 'survey' && !isColony(body)) return `${body.name} has no colony to work with.`;
  return undefined;
}

function finish(r: Run, o: Order, body: Body): void {
  const f = r.fleet;
  if (o.type === 'survey') {
    body.surveyed = true;
    say(r, `${f.name} completed the survey of ${body.name}.`);
  } else if (o.type === 'load') {
    f.cargo = body.id;
    say(r, `${f.name} loaded cargo at ${body.name}.`);
  } else if (o.type === 'unload') {
    const from = f.cargo ? r.game.body(f.cargo)?.name : undefined;
    f.cargo = undefined;
    say(r, `${f.name} unloaded cargo${from ? ' from ' + from : ''} at ${body.name}.`);
  } else if (o.type === 'refuel') {
    f.meters.fuel = 100;
    for (const s of f.ships) s.fuel = 100;
    say(r, `${f.name} refuelled at ${body.name}.`);
  }
}

function work(r: Run, o: Order, body: Body): Outcome {
  const f = r.fleet,
    problem = refuse(r, o, body);
  if (problem) {
    say(r, problem, true);
    return 'done';
  }
  setActivity(f, WORKING[o.type] ?? 'In orbit');
  const need = Math.max(0, workSeconds(r.game, f, o) - o.done),
    use = Math.min(need, left(r));
  o.done += use;
  r.used += use;
  if (o.type === 'refuel') {
    const gain = (use / DAY) * REFUEL_PER_DAY;
    f.meters.fuel = Math.min(100, f.meters.fuel + gain);
    for (const s of f.ships) s.fuel = Math.min(100, s.fuel + gain);
  }
  if (use < need - 1e-6) return 'wait';
  finish(r, o, body);
  return 'done';
}

function step(r: Run, o: Order): Outcome {
  const f = r.fleet,
    goal = resolveGoal(r.game, f, o);
  if (!goal) {
    say(r, `${f.name} dropped "${orderLabel(r.game, o)}": the target is out of reach.`, true);
    return 'done';
  }
  if (!(goal.body && f.at === goal.body.id)) {
    f.at = undefined;
    f.note = 'To ' + goal.name;
    if (f.activity !== 'Out of fuel' || f.meters.fuel > 0) setActivity(f, 'Under way');
    if (!travel(r, goal)) return 'wait';
    if (goal.body) {
      f.at = goal.body.id;
      f.note = goal.body.name;
    }
    if (goal.jump) {
      f.note = goal.name;
      if (o.type === 'move') transit(r, goal);
      return 'done';
    }
    if (goal.fleet) {
      join(r, goal.fleet);
      return 'done';
    }
    if (o.type === 'move') {
      say(r, `${f.name} arrived at ${goal.name}.`);
      return 'done';
    }
  }
  if (!goal.body || o.type === 'move') return 'done';
  if (o.type === 'orbit') {
    setActivity(f, 'On station');
    r.used = r.dt;
    return 'wait';
  }
  return work(r, o, goal.body);
}

function idle(game: Game, f: Fleet): void {
  const body = f.at ? game.body(f.at) : undefined;
  setActivity(f, body ? 'In orbit' : 'Holding');
  if (body) f.note = body.name;
}

function runFleet(game: Game, f: Fleet, dt: number): void {
  const r: Run = { game, fleet: f, dt, used: 0 };
  for (let n = 0; n < MAX_STEPS && left(r) > 0 && f.orders.length; n++) {
    const o = f.orders[0]!;
    if (step(r, o) === 'done') {
      const i = f.orders.indexOf(o);
      if (i >= 0) f.orders.splice(i, 1);
    }
    if (!game.world.fleets.includes(f)) return;
  }
  if (!f.orders.length) idle(game, f);
  const home = f.at ? game.body(f.at) : undefined;
  if (home) park(game, f, home);
}

registerSystem('fleets', (game, dt) => {
  for (const f of [...game.world.fleets]) if (game.world.fleets.includes(f)) runFleet(game, f, dt);
});
