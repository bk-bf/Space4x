import { registerSystem } from '#lib/game/index.ts';
import { research } from './research.svelte.ts';

registerSystem('research', (game, dt) => research.advance(game, dt));
