import { economy, standing } from './economy/index.ts';
import { milestones } from './data/index.ts';
import type { Game } from './state.svelte.ts';

export const STABILISER = 'jump_point_stabiliser';

export function settleJumps(game: Game): void {
  if (!economy.done.includes(milestones.length)) return;
  for (const system of game.world.systems)
    for (const point of system.jumps) {
      if (point.stable) continue;
      const site = economy.sites.find((s) => s.place === 'point' && s.worldBody === point.id);
      if (!site || standing(site, STABILISER) <= 0) continue;
      point.stable = true;
      game.log(
        'flask',
        `${point.name} is stable. Stabilising it was the goal of the first prototype, and it is reached.`,
        false,
        { subject: { kind: 'base', id: site.id } }
      );
    }
}
