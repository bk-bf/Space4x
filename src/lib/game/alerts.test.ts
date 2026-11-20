import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { defaultPauses, PAUSE_KINDS, WARN_DAYS } from './alerts.ts';
import { DAY } from './clock.ts';
import {
  economy,
  homeSite,
  newSite,
  programmeStatus,
  queueBuilding,
  startProgramme
} from './economy/index.ts';
import { project } from './data/index.ts';
import { restore, resetGame, serialise } from './save.ts';
import { addDesign, freshGame, spawn } from './ships/fixtures.ts';
import { addOrder, ships } from './ships/index.ts';
import type { Game } from './state.svelte.ts';
import type { EventKind } from './types.ts';

const STEP = 30 * DAY;

const TUG = {
  id: 'pause-tug',
  role: 'freighter' as const,
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ] as const,
  load: [['methalox', 1e9]] as const
};

function only(game: Game, kind: EventKind | null): void {
  for (const k of PAUSE_KINDS) game.pauseOn[k.id] = k.id === kind;
}

function runUntilPaused(game: Game, ticks = 100): number {
  game.run();
  for (let i = 0; i < ticks; i++) {
    const before = game.time;
    game.tick(STEP);
    if (!game.running) return before;
  }
  throw new Error('the game never paused');
}

function expectPausedAtEvent(game: Game, kind: EventKind, tickStart: number): void {
  const e = game.pausedBy;
  expect(e?.kind).toBe(kind);
  expect(game.running).toBe(false);
  expect(Math.abs(game.time - e!.at)).toBeLessThan(1);
  expect(game.time - tickStart).toBeLessThanOrEqual(STEP * 1000);
  expect(game.events[0]).toEqual(e);
}

const tug = () => {
  addDesign(TUG);
  return spawn(TUG.id, { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 90000 } });
};

describe('pausing on chosen events', () => {
  it('pauses at the moment a project is researched, inside a 30-day step', () => {
    const game = freshGame();
    only(game, null);
    expect(programmeStatus(economy, project(1))).toBe('ready');
    expect(startProgramme(economy, 1)).toBe(true);
    only(game, 'research');
    const start = runUntilPaused(game);
    expectPausedAtEvent(game, 'research', start);
    expect(game.pausedBy?.text).toBe('Booster recovery researched.');
    expect(game.pausedBy?.project).toBe(1);
    expect(economy.done).toEqual([1]);
    expect(economy.elapsed * 1000).toBeCloseTo(game.time - game.events.at(-1)!.at, -1);
  });

  it('pauses when a building is finished', () => {
    const game = freshGame();
    queueBuilding(economy, homeSite(), 'chemical_plant', 'haber_bosch');
    only(game, 'finished');
    const start = runUntilPaused(game);
    expectPausedAtEvent(game, 'finished', start);
    expect(game.pausedBy?.text).toBe('Earth finished a Chemical plant.');
    expect(homeSite().queue).toEqual([]);
  });

  it('pauses when a ship arrives, at its arrival time', () => {
    const game = freshGame();
    const v = tug();
    addOrder(v, { type: 'fly', body: 'luna', angle: 0 });
    only(game, 'arrival');
    game.run();
    game.tick(DAY / 24);
    const arrival = v.trip!.arrival;
    const start = runUntilPaused(game);
    expectPausedAtEvent(game, 'arrival', start);
    expect(game.elapsed).toBeCloseTo(arrival, 3);
    expect(v.trip).toBeNull();
    expect(v.at).toMatchObject({ kind: 'orbit', body: 'luna' });
  });

  it('pauses when an order is blocked, without letting time pass', () => {
    const game = freshGame();
    const v = tug();
    addOrder(v, { type: 'survey', body: 'mars' });
    only(game, 'blocked');
    const start = runUntilPaused(game);
    expectPausedAtEvent(game, 'blocked', start);
    expect(game.time).toBe(start);
    expect(v.blocked).toContain('no survey instruments');
    game.run();
    game.tick(STEP);
    expect(game.running).toBe(true);
  });

  it('pauses on the forecast and again when the food runs out', () => {
    const game = freshGame();
    game.warnDays = 5;
    const site = newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;
    site.population = 6;
    site.stock = { wheat: (6 * 2800 * 10) / 3270 };
    only(game, 'shortage');
    const first = runUntilPaused(game);
    expectPausedAtEvent(game, 'shortage', first);
    expect(game.pausedBy?.text).toBe('Luna orbital station runs out of food in 5 days.');
    expect(game.elapsed / DAY).toBeCloseTo(5, 6);
    const second = runUntilPaused(game);
    expectPausedAtEvent(game, 'shortage', second);
    expect(game.pausedBy?.text).toBe('Luna orbital station is short of food; its population is shrinking.');
    expect(game.elapsed / DAY).toBeCloseTo(10, 6);
  });

  it('does not pause on kinds that are switched off', () => {
    const game = freshGame();
    queueBuilding(economy, homeSite(), 'chemical_plant', 'haber_bosch');
    only(game, 'arrival');
    game.run();
    for (let i = 0; i < 4; i++) game.tick(STEP);
    expect(game.running).toBe(true);
    expect(game.elapsed).toBeCloseTo(4 * STEP, 3);
    expect(game.events.some((e) => e.kind === 'finished')).toBe(true);
  });

  it('lands in the same state in pausing steps as in one plain advance', () => {
    const run = (pausing: boolean) => {
      const game = freshGame();
      const v = tug();
      addOrder(v, { type: 'fly', body: 'luna', angle: 0 });
      addOrder(v, { type: 'wait', seconds: 3 * DAY });
      addOrder(v, { type: 'fly', body: 'earth', angle: 0 });
      only(game, pausing ? 'research' : null);
      if (pausing) {
        game.run();
        for (let i = 0; i < 4; i++) game.tick(STEP);
      } else game.advance(4 * STEP);
      return JSON.parse(
        JSON.stringify({ stock: homeSite().stock, at: ships.vessels[0]!.at, t: game.time })
      ) as {
        stock: Record<string, number>;
        at: unknown;
        t: number;
      };
    };
    const a = run(true);
    const b = run(false);
    expect(a.at).toEqual(b.at);
    expect(a.t).toBeCloseTo(b.t, -1);
    for (const [m, v] of Object.entries(b.stock))
      expect(Math.abs((a.stock[m] ?? 0) - v)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(v)));
  });

  it('keeps the choice of kinds and the warning days with the saved game', () => {
    const game = freshGame();
    game.pauseOn.arrival = false;
    game.pauseOn.finished = false;
    game.warnDays = 60;
    const data = serialise(game);
    resetGame(game);
    expect(game.pauseOn).toEqual(defaultPauses());
    expect(game.warnDays).toBe(WARN_DAYS);
    restore(game, data);
    expect(game.pauseOn).toEqual({ ...defaultPauses(), arrival: false, finished: false });
    expect(game.warnDays).toBe(60);
    const older = { ...serialise(game), alerts: undefined };
    restore(game, older);
    expect(game.pauseOn).toEqual(defaultPauses());
    expect(game.warnDays).toBe(WARN_DAYS);
  });
});
