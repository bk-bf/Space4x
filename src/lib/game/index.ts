import './systems/orbits';
import './systems/contacts';

export { Game, game, advance } from './state.svelte';
export {
  className,
  classes,
  ClassRegistry,
  classInUse,
  classStats,
  fleetClassId,
  registerClassUse,
  shipClass,
  shipClasses,
  specFor,
  statsFor
} from './classes.svelte';
export { registerHorizon, registerSystem, systemNames, type Horizon, type System } from './systems';
export {
  PAUSE_KINDS,
  WARN_DAYS,
  WARN_DAY_CHOICES,
  defaultPauses,
  isWarnDays,
  type PauseKinds
} from './alerts';
export { registerStatus, STATUS_IDS, type StatusId, type StatusSource } from './status';
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
export { bodyPosition, isColony, parkingRadius, type Point } from './orbits';
export { AU, KM, au, formatAu, formatDistance } from './units';
export { sitePosition } from './mock/sites';
export { FLEET_SENSOR, bearing, nearest, observers } from './systems/contacts';
export type * from './types';
