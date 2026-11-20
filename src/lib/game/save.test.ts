import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { classes } from './classes.svelte.ts';
import { DAY } from './clock.ts';
import { projectById } from './data/index.ts';
import { economy, startingScientists } from './economy/index.ts';
import { PathPlayer } from './playPath.ts';
import { checkSave, restore, resetGame, SAVE_VERSION, serialise, type SaveData } from './save.ts';
import { addDesign, freshGame, spawn } from './ships/fixtures.ts';
import { addOrder, ships, tripOptionEntries } from './ships/index.ts';
import { Game } from './state.svelte.ts';
import { survey } from './survey.svelte.ts';

const TUG = {
  id: 'save-tug',
  role: 'freighter' as const,
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ] as const,
  load: [['methalox', 1e9]] as const
};

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const live = () =>
  copy({
    economy,
    ships,
    classes: classes.saved,
    survey: survey.levels,
    trips: tripOptionEntries().map(([id, o]) => [id, o.stamps, o.departure])
  });

describe('saving and loading', () => {
  it('restores the game after stage 6, with research running, and runs on exactly as the original', () => {
    const game = freshGame();
    const player = new PathPlayer(game);
    expect(player.reach(4)).toBe(true);
    expect(player.crewedStation()).toBe(true);
    expect(player.reach(6)).toBe(true);
    expect(economy.done).toContain(projectById('lunar_surface_habitat').number);
    expect(economy.running.length).toBeGreaterThan(0);
    expect(economy.scientists.some((s, i) => s.admin !== startingScientists()[i]!.admin)).toBe(true);
    expect(economy.sites.some((s) => s.worldBody === 'luna' && s.population > 0)).toBe(true);
    expect(economy.sites.length).toBeGreaterThan(2);
    expect(ships.vessels.length).toBeGreaterThan(0);
    expect(classes.saved.length).toBeGreaterThan(0);
    expect(survey.levels.luna).toBe(1);

    addDesign(TUG);
    const tug = spawn(
      TUG.id,
      { kind: 'orbit', body: 'earth', angle: 0 },
      { propellant: { methalox: 90000 } }
    );
    addOrder(tug, { type: 'fly', body: 'luna', angle: 0 });
    addOrder(tug, { type: 'wait', seconds: 40 * DAY });
    game.advance(DAY);
    expect(tug.trip).not.toBeNull();
    expect(tug.orders).toHaveLength(1);
    expect(tripOptionEntries()).toHaveLength(1);

    const text = JSON.stringify(serialise(game));
    const before = live();
    const time = game.time;
    const events = copy(game.events);

    game.advance(30 * DAY);
    const after = live();
    const afterSave = serialise(game);

    resetGame(game);
    expect(economy.done).toEqual([]);
    expect(ships.vessels).toEqual([]);
    expect(classes.saved).toEqual([]);

    const restored = new Game();
    const data = JSON.parse(text) as SaveData;
    expect(checkSave(data, restored)).toBeNull();
    restore(restored, data);
    expect(restored.time).toBe(time);
    expect(copy(restored.events)).toEqual(events);
    expect(live()).toEqual(before);
    expect(JSON.stringify(serialise(restored))).toBe(text);

    expect(ships.vessels.at(-1)!.trip).not.toBeNull();
    restored.advance(30 * DAY);
    expect(ships.vessels.at(-1)!.trip).toBeNull();
    expect(live()).toEqual(after);
    expect(serialise(restored)).toEqual(afterSave);
  }, 120_000);

  it('rejects a save of another version or of another shape', () => {
    const game = freshGame();
    const good = serialise(game);
    expect(checkSave(good, game)).toBeNull();
    expect(checkSave({ ...good, version: SAVE_VERSION + 1 }, game)).toMatch(/version/);
    expect(checkSave({ ...good, angles: [1, 2] }, game)).toMatch(/bodies/);
    expect(checkSave({ ...good, economy: { sites: [] } }, game)).toMatch(/economy/);
    expect(checkSave({ ...good, economy: { ...good.economy, scientists: undefined } }, game)).toMatch(
      /research/
    );
    expect(checkSave('nonsense', game)).toMatch(/not a saved game/);
    expect(checkSave(null, game)).toMatch(/not a saved game/);
  });
});
