import { siteById } from '#lib/game/economy/index.ts';
import { game } from '#lib/game/index.ts';
import type { Body } from '#lib/game/types.ts';
import { formatPeople } from './format.ts';

export const systemName = (id: string): string => game.world.systems.find((s) => s.id === id)?.name ?? id;

export const peopleAt = (bodyId: string): string => {
  const site = siteById(bodyId);
  return site ? formatPeople(site.population) : 'None';
};

export const siteBody = (worldBody: string): Body | undefined => game.body(worldBody);
