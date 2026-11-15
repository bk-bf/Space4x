import { registerSystem } from '#lib/game/index.ts';
import { economy } from './state.svelte.ts';
import { stepEconomy } from './sim.ts';

registerSystem('economy', (game, dt) => {
  stepEconomy(economy, dt, game.time, (category, text, warn) => game.log(category, text, warn));
});
