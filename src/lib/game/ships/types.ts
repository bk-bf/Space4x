import type { Profile } from '#lib/game/flight/index.ts';
import type { PropellantKind } from '#lib/game/shipdesign/index.ts';

export type Whereabouts =
  | { kind: 'site'; site: string }
  | { kind: 'orbit'; body: string; angle: number }
  | { kind: 'surface'; body: string; region?: string };

export type Item =
  { kind: 'cargo'; id: string } | { kind: 'propellant'; id: PropellantKind } | { kind: 'crew' };

export interface AllCargo {
  kind: 'all-cargo';
}

export interface ManifestLine {
  item: Item;
  amount: number | null;
}

export interface RunLine {
  material: string;
  amount: number;
}

export type Order =
  | { id: number; type: 'fly'; body: string; angle: number; profile: Profile }
  | { id: number; type: 'land'; body: string; profile: Profile; region?: string }
  | { id: number; type: 'survey'; body: string }
  | { id: number; type: 'sample' }
  | { id: number; type: 'dock'; site: string }
  | { id: number; type: 'load'; item: Item; amount: number | null }
  | { id: number; type: 'unload'; item: Item | AllCargo; amount: number | null }
  | { id: number; type: 'manifest'; lines: ManifestLine[] }
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
  manifest: RunLine[];
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
  boosters: number;
  orders: Order[];
  run: SupplyRun | null;
  progress: number;
  blocked: string | null;
}

export interface LaunchRecord {
  at: number;
  site: string;
  ship: string;
  boosters: number;
  payload: number;
  propellant: number;
  perTonne: number;
}

export interface ShipsState {
  vessels: Vessel[];
  nextId: number;
  nextOrder: number;
  launches: LaunchRecord[];
  built: number;
}
