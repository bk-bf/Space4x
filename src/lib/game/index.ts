import './systems/orbits';
import './systems/fleets';
import './systems/contacts';

export { Game, game, advance } from './state.svelte';
export {
  buildOf,
  className,
  classBuild,
  classes,
  ClassRegistry,
  classInUse,
  classStats,
  fleetClassId,
  fleetSpeed,
  registerClassUse,
  shipClass,
  shipClasses,
  statsFor,
  type ClassBuild
} from './classes.svelte';
export { registerSystem, systemNames, type System } from './systems';
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
export { bodyPosition, KM_PER_UNIT, type Point } from './orbits';
export {
  ORDER_TYPES,
  addOrder,
  clearOrders,
  isColony,
  moveOrder,
  orderEtas,
  orderLabel,
  orderTargets,
  orderTypesFor,
  removeOrder,
  resolveGoal,
  workSeconds
} from './orders';
export { FLEET_SENSOR, bearing, formatAu, nearest, observers } from './systems/contacts';
export type * from './types';
