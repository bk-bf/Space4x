import './systems/orbits';
import './systems/fleets';

export { Game, game, advance } from './state.svelte';
export { registerSystem, systemNames, type System } from './systems';
export { startLoop, TICK_MS } from './loop';
export {
  START_TIME,
  STEPS,
  DAY,
  formatClock,
  formatDay,
  formatTimeOfDay,
  formatEventTime,
  type TimeStep
} from './clock';
export { bodyPosition, KM_PER_UNIT, type Point } from './orbits';
export type * from './types';
