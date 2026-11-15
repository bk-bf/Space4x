import { game } from '#lib/game/index.ts';
import type { Body, Colony } from '#lib/game/types.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import { allocate, annualUse } from './sim.ts';
import { economy } from './state.svelte.ts';
import { MINERALS } from './catalog.ts';
import { formatPeople } from './format.ts';

export const systemName = (id: string): string => game.world.systems.find((s) => s.id === id)?.name ?? id;

export function colonyBody(c: Colony): Body {
  const body = game.body(c.id);
  if (!body) throw new Error(`colony ${c.id} has no body`);
  return body;
}

export const colonyName = (c: Colony): string => colonyBody(c).name;

export const colonySystem = (c: Colony): string => colonyBody(c).system;

export const colonyPlanet = (c: Colony): PlanetType => colonyBody(c).type;

export const colonyOf = (bodyId: string): Colony | undefined => economy.colonies.find((c) => c.id === bodyId);

export const peopleAt = (bodyId: string): string => {
  const colony = colonyOf(bodyId);
  return colony ? formatPeople(colony.population) : 'None';
};

export function colonyEnvironment(c: Colony): {
  air: string;
  gravity: string;
  surface: string;
  note: string;
} {
  const { facts } = colonyBody(c);
  return {
    air: c.environment.domed ? `${facts.air}, domed` : facts.air,
    gravity: facts.gravity,
    surface: facts.surface,
    note: c.environment.note
  };
}

export function colonyWarnings(c: Colony): string[] {
  const out: string[] = [];
  for (const [key, low] of Object.entries(c.lowStock))
    if (low) out.push(`${key} stock is below a year of use`);
  if (allocate(c, economy).some((a) => a.order.waiting)) out.push('Construction is waiting for minerals');
  for (const m of MINERALS)
    if (c.stock[m.id] <= 0 && annualUse(c, m.id, economy) > 0) out.push(`No ${m.name}`);
  return out;
}
