import type { Profile } from '#lib/game/flight/index.ts';
import type { PropellantKind } from '#lib/game/shipdesign/index.ts';

export type Whereabouts =
  | { kind: 'site'; site: string }
  | { kind: 'orbit'; body: string; angle: number }
  | { kind: 'surface'; body: string };

export type Item =
  { kind: 'cargo'; id: string } | { kind: 'propellant'; id: PropellantKind } | { kind: 'crew' };

export type Order =
  | { id: number; type: 'fly'; body: string; angle: number; profile: Profile }
  | { id: number; type: 'land'; body: string; profile: Profile }
  | { id: number; type: 'dock'; site: string }
  | { id: number; type: 'load'; item: Item; amount: number | null }
  | { id: number; type: 'unload'; item: Item; amount: number | null }
  | { id: number; type: 'wait'; seconds: number };

export type OrderType = Order['type'];

export interface Trip {
  to: Whereabouts;
  profile: Profile;
  departure: number;
  arrival: number;
  dv: number;
  propellant: number;
}

export interface SupplyRun {
  item: string;
  amount: number;
  from: string;
  to: string;
}

export interface Vessel {
  id: string;
  name: string;
  design: string;
  at: Whereabouts;
  trip: Trip | null;
  propellant: Partial<Record<PropellantKind, number>>;
  cargo: Record<string, number>;
  crew: number;
  orders: Order[];
  run: SupplyRun | null;
  progress: number;
  blocked: string | null;
}

export interface LaunchRecord {
  at: number;
  site: string;
  stages: string[];
  returned: number;
  lost: number;
  payload: number;
  propellant: number;
}

export interface ShipsState {
  vessels: Vessel[];
  nextId: number;
  nextOrder: number;
  launches: LaunchRecord[];
  built: number;
}
