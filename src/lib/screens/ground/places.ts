import { game, isColony, type Game } from '#lib/game/index.ts';

export interface Place {
  id: string;
  name: string;
}

export const placesOf = (g: Game = game): Place[] =>
  g.world.bodies.filter(isColony).map((b) => ({ id: b.id, name: b.name }));

export const placeName = (id: string, g: Game = game): string => g.body(id)?.name ?? id;
