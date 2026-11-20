import type { Component, Effect } from '#lib/game/data/index.ts';

export type BoostSource = (effect: Effect) => number;

const SHIP_EFFECTS: readonly Effect[] = [
  'booster_thrust',
  'booster_load',
  'solar_array_output',
  'battery_storage'
];

export const SOLAR_ARRAY = 'solar_array';
export const BATTERY_PACK = 'battery_pack';

let source: BoostSource = () => 1;

export function setComponentBoosts(next: BoostSource): void {
  source = next;
}

export const boostKey = (): string => SHIP_EFFECTS.map((e) => source(e)).join(',');

const cache = new Map<string, { key: string; c: Component }>();

function apply(c: Component): Component {
  if (c.design.boost && c.performance) {
    const thrust = source('booster_thrust');
    const load = source('booster_load');
    if (thrust === 1 && load === 1) return c;
    return {
      ...c,
      performance: {
        ...c.performance,
        thrust: c.performance.thrust * thrust,
        ...(c.performance.thrustSeaLevel !== undefined
          ? { thrustSeaLevel: c.performance.thrustSeaLevel * thrust }
          : {})
      },
      design: { ...c.design, boost: { ...c.design.boost, load: c.design.boost.load * load } }
    };
  }
  if (c.id === SOLAR_ARRAY && c.design.generates !== undefined) {
    const f = source('solar_array_output');
    return f === 1 ? c : { ...c, design: { ...c.design, generates: c.design.generates * f } };
  }
  if (c.id === BATTERY_PACK && c.design.storage !== undefined) {
    const f = source('battery_storage');
    return f === 1 ? c : { ...c, design: { ...c.design, storage: c.design.storage * f } };
  }
  return c;
}

export function boostedComponent(c: Component): Component {
  const key = boostKey();
  const hit = cache.get(c.id);
  if (hit && hit.key === key) return hit.c;
  const made = apply(c);
  cache.set(c.id, { key, c: made });
  return made;
}
