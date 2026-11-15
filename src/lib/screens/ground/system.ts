import { registerSystem } from '#lib/game/index.ts';
import { ground } from './ground.svelte.ts';
import { advanceGround } from './sim.ts';

registerSystem('ground', (_game, dt) => advanceGround(ground.units, ground.formations, dt));
