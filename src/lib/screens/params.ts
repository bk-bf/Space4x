import { applyClassParams } from './classes/designer.svelte.ts';
import { applyCommandersParams } from './commanders/roster.svelte.ts';
import { applyEconomyParams } from './economy/state.svelte.ts';
import { applyGalaxyParams } from './galaxy/galaxy.svelte.ts';
import { applyIntelParams } from './intel/intel.svelte.ts';
import { applyResearchParams } from './research/research.svelte.ts';
import { applyRobotParams } from './robots/designer.svelte.ts';

export function applyScreenParams(params: URLSearchParams): void {
  applyEconomyParams(params);
  applyClassParams(params);
  applyResearchParams(params);
  applyRobotParams(params);
  applyCommandersParams(params);
  applyIntelParams(params);
  applyGalaxyParams(params);
}
