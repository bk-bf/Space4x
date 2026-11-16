import { DAY, game } from '#lib/game/index.ts';
import type { PlayReport } from '#lib/game/play.ts';
import { PathPlayer } from '#lib/game/playPath.ts';
import { economy, homeSite, startProgramme } from '#lib/game/economy/index.ts';
import { ships } from '#lib/game/ships/index.ts';

export interface TestApi {
  advanceDays(days: number): void;
  play(milestone: number): PlayReport;
  crewedStation(): boolean;
  startProgramme(number: number): boolean;
  state(): { done: number[]; sites: string[]; ships: number; launches: number; time: number };
}

declare global {
  interface Window {
    space4xTest?: TestApi;
  }
}

export function installTestApi(params: URLSearchParams): void {
  if (!import.meta.env.DEV || !params.has('test')) return;
  const player = new PathPlayer(game);
  window.space4xTest = {
    advanceDays: (days) => game.advance(days * DAY),
    play: (milestone) => {
      player.reach(milestone);
      return player.report;
    },
    crewedStation: () => player.crewedStation(),
    startProgramme: (number) => startProgramme(economy, homeSite(), number),
    state: () => ({
      done: [...economy.done],
      sites: economy.sites.map((s) => s.id),
      ships: ships.vessels.length,
      launches: ships.launches.length,
      time: game.time
    })
  };
}
