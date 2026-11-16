import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { formatDay } from './clock.ts';
import { economy, siteAt } from './economy/index.ts';
import { Player } from './play.ts';
import { freshGame } from './ships/fixtures.ts';
import { ships } from './ships/index.ts';

describe('the scripted player from the start state', () => {
  it('reaches milestones 1 to 6 by play, with a crewed station in low Earth orbit', () => {
    const game = freshGame();
    const player = new Player(game);
    for (const n of [1, 2, 3, 4]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    expect(player.crewedStation()).toBe(true);
    const crewed = siteAt(economy, 'earth', 'orbit')!;
    expect(crewed.population).toBe(6);
    expect(crewed.stock.food_ration).toBeGreaterThan(2000);
    for (const n of [5, 6]) expect(player.reach(n), `milestone ${n}`).toBe(true);
    expect(economy.done).toEqual([1, 2, 3, 4, 5, 6]);
    const dates = player.report.reached.map((r) => [r.number, formatDay(r.at), new Date(r.at).getUTCFullYear()]);
    console.info(
      'milestones',
      JSON.stringify(dates),
      'launches',
      player.report.launches.length,
      'tonnes',
      player.report.tonnes.toFixed(1)
    );
    const times = player.report.reached.map((r) => r.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const station = siteAt(economy, 'earth', 'orbit');
    expect(station).toBeDefined();
    expect(station!.groups.map((g) => g.building).sort()).toEqual(['life_support_plant', 'propellant_depot']);
    expect(player.report.launches).toHaveLength(3);
    expect(ships.launches.every((l) => l.returned === 1 && l.lost === 0)).toBe(true);
  }, 120_000);
});
