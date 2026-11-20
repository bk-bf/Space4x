import { defaultPauses, isWarnDays, PAUSE_KINDS, WARN_DAYS, type PauseKinds } from './alerts.ts';
import { classes } from './classes.svelte.ts';
import { DAY, START_TIME } from './clock.ts';
import { economy, resetEconomy, touch, type Economy } from './economy/index.ts';
import type { FlightSystem, TripOption } from './flight/index.ts';
import { mockEvents } from './mock/events.ts';
import { mockWorld } from './mock/world.ts';
import type { ShipDesign } from './shipdesign/index.ts';
import {
  clearSupplyCache,
  clearTripOptions,
  flightSystem,
  forgetFlightSystem,
  resetShips,
  setTripOption,
  ships,
  tripOptionEntries,
  type ShipsState
} from './ships/index.ts';
import type { Game } from './state.svelte.ts';
import { resetSurvey, survey } from './survey.svelte.ts';
import type { GameEvent } from './types.ts';

export const SAVE_VERSION = 7;

type SavedTrip = Omit<TripOption, 'system'> & { system: number };

interface SavedJump {
  id: string;
  surveyed: boolean;
  stable: boolean;
}

export interface SaveData {
  version: number;
  game: { time: number; step: number; events: GameEvent[] };
  angles: number[];
  jumps: SavedJump[];
  economy: Economy;
  ships: ShipsState;
  systems: number[][];
  trips: [string, SavedTrip][];
  classes: { saved: readonly ShipDesign[]; counter: number };
  survey: Record<string, number>;
  alerts?: { pauseOn: PauseKinds; warnDays: number };
}

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function serialise(game: Game): SaveData {
  const systems: FlightSystem[] = [];
  const indexOf = (s: FlightSystem): number => {
    const i = systems.indexOf(s);
    return i >= 0 ? i : systems.push(s) - 1;
  };
  const trips = tripOptionEntries().map(([id, option]): [string, SavedTrip] => [
    id,
    { ...option, system: indexOf(option.system) }
  ]);
  return plain({
    version: SAVE_VERSION,
    game: { time: game.time, step: game.step, events: game.events },
    angles: game.world.bodies.map((b) => b.angle),
    jumps: game.world.systems.flatMap((s) =>
      s.jumps.map((j) => ({ id: j.id, surveyed: !!j.surveyed, stable: !!j.stable }))
    ),
    economy,
    ships,
    systems: systems.map((s) => s.bodies.map((b) => b.angle)),
    trips,
    classes: { saved: classes.saved, counter: classes.counter },
    survey: survey.levels,
    alerts: { pauseOn: game.pauseOn, warnDays: game.warnDays }
  });
}

export function resetGame(game: Game): void {
  resetEconomy();
  resetShips();
  resetSurvey();
  classes.saved = [];
  classes.counter = 0;
  clearTripOptions();
  clearSupplyCache();
  const fresh = mockWorld();
  game.world.bodies.forEach((b, i) => {
    b.angle = fresh.bodies[i]?.angle ?? b.angle;
  });
  const jumps = new Map(fresh.systems.flatMap((s) => s.jumps.map((j) => [j.id, j])));
  for (const s of game.world.systems)
    for (const j of s.jumps) {
      j.surveyed = jumps.get(j.id)?.surveyed;
      j.stable = jumps.get(j.id)?.stable;
    }
  game.running = false;
  game.time = START_TIME;
  game.step = DAY;
  game.events = mockEvents();
  game.pauseOn = defaultPauses();
  game.warnDays = WARN_DAYS;
  game.pausedBy = null;
  forgetFlightSystem(game);
  touch();
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNumber);

export function checkSave(raw: unknown, game: Game): string | null {
  if (!isObject(raw)) return 'it is not a saved game';
  if (raw.version !== SAVE_VERSION) return `it is version ${String(raw.version)}, not ${SAVE_VERSION}`;
  const g = raw.game;
  if (!isObject(g) || !isNumber(g.time) || !isNumber(g.step) || !Array.isArray(g.events))
    return 'its clock is missing';
  if (!isNumbers(raw.angles) || raw.angles.length !== game.world.bodies.length)
    return 'its bodies do not match this version';
  if (!Array.isArray(raw.jumps)) return 'its jump points are missing';
  const e = raw.economy;
  if (!isObject(e) || !Array.isArray(e.sites) || !e.sites.length || !Array.isArray(e.done))
    return 'its economy is missing';
  if (!isObject(e.market) || !isNumber(e.market.treasury) || !Array.isArray(e.market.contracts))
    return 'its treasury is missing';
  if (!Array.isArray(e.running) || !Array.isArray(e.queued) || !Array.isArray(e.scientists))
    return 'its research is missing';
  const s = raw.ships;
  if (!isObject(s) || !Array.isArray(s.vessels) || !Array.isArray(s.launches)) return 'its ships are missing';
  const c = raw.classes;
  if (!isObject(c) || !Array.isArray(c.saved) || !isNumber(c.counter)) return 'its ship classes are missing';
  if (!isObject(raw.survey)) return 'its survey is missing';
  if (!Array.isArray(raw.systems) || !raw.systems.every(isNumbers)) return 'its trips are missing';
  if (!Array.isArray(raw.trips)) return 'its trips are missing';
  return null;
}

function restoreAlerts(game: Game, alerts: SaveData['alerts']): void {
  if (!isObject(alerts)) return;
  const on: Record<string, unknown> = isObject(alerts.pauseOn) ? alerts.pauseOn : {};
  for (const k of PAUSE_KINDS) {
    const v = on[k.id];
    if (typeof v === 'boolean') game.pauseOn[k.id] = v;
  }
  if (isWarnDays(alerts.warnDays)) game.warnDays = alerts.warnDays;
}

function restoreSystem(game: Game, angles: number[] | undefined): FlightSystem | undefined {
  const base = flightSystem(game);
  if (!angles || angles.length !== base.bodies.length) return undefined;
  return { star: base.star, bodies: base.bodies.map((b, i) => ({ ...b, angle: angles[i]! })) };
}

export function restore(game: Game, data: SaveData): void {
  resetGame(game);
  const saved = plain(data);
  game.time = saved.game.time;
  game.step = saved.game.step;
  game.events = saved.game.events;
  game.world.bodies.forEach((b, i) => {
    b.angle = saved.angles[i]!;
  });
  const jumps = new Map(saved.jumps.map((j) => [j.id, j]));
  for (const s of game.world.systems)
    for (const j of s.jumps) {
      const k = jumps.get(j.id);
      if (k?.surveyed) j.surveyed = true;
      if (k?.stable) j.stable = true;
    }
  Object.assign(economy, saved.economy);
  Object.assign(ships, saved.ships);
  classes.saved = saved.classes.saved;
  classes.counter = saved.classes.counter;
  survey.levels = saved.survey;
  restoreAlerts(game, saved.alerts);
  forgetFlightSystem(game);
  const systems = saved.systems.map((angles) => restoreSystem(game, angles));
  for (const [id, trip] of saved.trips) {
    const system = systems[trip.system];
    if (system) setTripOption(id, { ...trip, system });
  }
  touch();
}
