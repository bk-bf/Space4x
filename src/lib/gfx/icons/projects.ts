import { project, unlockedAt, type Effect } from '#lib/game/data/index.ts';
import type { IconRef } from './index.ts';

const EFFECT_ICONS: Record<Effect, IconRef | undefined> = {
  booster_thrust: { kind: 'component', id: 'booster' },
  booster_load: { kind: 'component', id: 'booster' },
  shipyard_points: { kind: 'building', id: 'rocket_factory' },
  build_speed: undefined,
  extraction: { kind: 'building', id: 'mine_earth' },
  research: { kind: 'building', id: 'research_lab' },
  chip_output: { kind: 'building', id: 'semiconductor_fab' },
  data_centre_compute: { kind: 'building', id: 'data_centre' },
  solar_array_output: { kind: 'component', id: 'solar_array' },
  battery_storage: { kind: 'component', id: 'battery_pack' },
  electrolysis_power: { kind: 'building', id: 'electrolysis_plant' }
};

const NAMED: Record<string, IconRef> = {
  booster_recovery: { kind: 'component', id: 'booster' },
  helium_3_extraction: { kind: 'material', id: 'helium3' }
};

export function projectIcon(number: number): IconRef | undefined {
  const p = project(number);
  const named = NAMED[p.id];
  if (named) return named;
  const effect = Object.keys(p.effects ?? {})[0] as Effect | undefined;
  if (effect) return EFFECT_ICONS[effect];
  const u = unlockedAt(number);
  const b = u.buildings.at(-1);
  if (b) return { kind: 'building', id: b.id };
  const c = u.components.at(-1);
  if (c) return { kind: 'component', id: c.id };
  const r = u.recipes.at(-1);
  const made = r && (r.product ?? Object.keys(r.outputs)[0]);
  return made ? { kind: 'material', id: made } : undefined;
}
