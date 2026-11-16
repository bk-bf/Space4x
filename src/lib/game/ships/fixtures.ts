import { classes } from '#lib/game/classes.svelte.ts';
import { resetEconomy } from '#lib/game/economy/index.ts';
import { Game } from '#lib/game/state.svelte.ts';
import {
  newDesign,
  setCount,
  setLoad,
  type PropellantKind,
  type Role,
  type ShipDesign,
  type Yard
} from '#lib/game/shipdesign/index.ts';
import { resetShips, ships } from './state.svelte.ts';
import type { Vessel, Whereabouts } from './types.ts';

export function freshGame(): Game {
  resetEconomy();
  resetShips();
  classes.saved = [];
  return new Game();
}

export interface DesignSpec {
  id: string;
  name?: string;
  role?: Role;
  yard?: Yard;
  parts: readonly (readonly [string, number])[];
  load?: readonly (readonly [PropellantKind, number])[];
}

export function addDesign(spec: DesignSpec): ShipDesign {
  let d: ShipDesign = {
    ...newDesign(spec.id, spec.name ?? spec.id),
    role: spec.role ?? 'launcher',
    yard: spec.yard ?? 'rocket_factory'
  };
  for (const [id, n] of spec.parts) d = setCount(d, id, n);
  for (const [k, kg] of spec.load ?? []) d = setLoad(d, k, kg);
  d = { ...d, locked: true };
  classes.add(d);
  return d;
}

export function spawn(
  design: string,
  at: Whereabouts = { kind: 'site', site: 'earth' },
  fill: Partial<Vessel> = {}
): Vessel {
  const d = classes.find(design);
  const id = `ship-${ships.nextId++}`;
  ships.vessels.push({
    id,
    name: `${d?.name ?? design} ${id}`,
    design,
    at,
    trip: null,
    propellant: {},
    cargo: {},
    crew: 0,
    orders: [],
    run: null,
    progress: 0,
    blocked: null,
    ...fill
  });
  return ships.vessels[ships.vessels.length - 1]!;
}
