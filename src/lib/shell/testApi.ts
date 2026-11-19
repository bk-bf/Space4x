import { DAY, game } from '#lib/game/index.ts';
import type { PlayReport } from '#lib/game/play.ts';
import { PathPlayer } from '#lib/game/playPath.ts';
import { economy, homeSite, newSite, startProgramme, touch } from '#lib/game/economy/index.ts';
import { serialise } from '#lib/game/save.ts';
import { ships } from '#lib/game/ships/index.ts';

export interface TestApi {
  advanceDays(days: number): void;
  play(milestone: number): PlayReport;
  crewedStation(): boolean;
  startProgramme(number: number): boolean;
  stock(material: string, kg: number): void;
  station(people: number, foodDays: number): string;
  state(): { done: number[]; sites: string[]; ships: number; launches: number; time: number };
  snapshot(): string;
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
    stock: (material, kg) => {
      homeSite().stock[material] = kg;
      touch();
    },
    station: (people, foodDays) => {
      const site = newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;
      site.population = people;
      site.stock = { wheat: (people * site.kcalPerPersonDay * foodDays) / 3270 };
      touch();
      return site.id;
    },
    state: () => ({
      done: [...economy.done],
      sites: economy.sites.map((s) => s.id),
      ships: ships.vessels.length,
      launches: ships.launches.length,
      time: game.time
    }),
    snapshot: () => JSON.stringify(serialise(game))
  };
}
