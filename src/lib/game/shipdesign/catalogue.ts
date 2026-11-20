import { shipComponents, type Component, type Propulsion } from '#lib/game/data/index.ts';
import { boostedComponent } from './boosts.ts';

export const COMPONENT_KINDS = [
  'propulsion',
  'structure',
  'habitat',
  'power',
  'thermal',
  'protection',
  'electronics'
] as const;

export const KIND_NAMES: Readonly<Record<string, string>> = {
  propulsion: 'Drives',
  structure: 'Structure',
  habitat: 'Crew',
  power: 'Power',
  thermal: 'Heat',
  protection: 'Shields',
  electronics: 'Avionics'
};

export const component = (id: string): Component | undefined => {
  const found = shipComponents.find((c) => c.id === id);
  return found && boostedComponent(found);
};

export const massOf = (c: Component): number => c.design.mass ?? c.performance?.mass ?? 0;

export const isBooster = (c: Component): c is Component & { performance: Propulsion } =>
  c.design.boost !== undefined && c.performance !== undefined;

export const isEngine = (c: Component): c is Component & { performance: Propulsion } =>
  c.kind === 'propulsion' && c.performance !== undefined && c.design.boost === undefined;

export const isTank = (c: Component): boolean => (c.design.volume ?? 0) > 0;

export const catalogue = (): Component[] =>
  [...shipComponents].sort(
    (a, b) =>
      COMPONENT_KINDS.indexOf(a.kind as (typeof COMPONENT_KINDS)[number]) -
        COMPONENT_KINDS.indexOf(b.kind as (typeof COMPONENT_KINDS)[number]) ||
      a.research - b.research ||
      a.name.localeCompare(b.name)
  );
