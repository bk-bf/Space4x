import type { Amounts } from '#lib/game/data/index.ts';
import type { PropellantKind } from './propellants.ts';

export const ROLES = ['launcher', 'transfer', 'lander', 'capsule', 'freighter', 'probe'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Readonly<Record<Role, string>> = {
  launcher: 'Launch vehicle',
  transfer: 'Transfer vehicle',
  lander: 'Lander',
  capsule: 'Return capsule',
  freighter: 'Freighter',
  probe: 'Probe'
};

export const YARDS = ['rocket_factory', 'orbital_shipyard'] as const;
export type Yard = (typeof YARDS)[number];

export interface Part {
  readonly component: string;
  readonly count: number;
}

export type Load = Readonly<Partial<Record<PropellantKind, number>>>;

export interface ShipDesign {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
  readonly yard: Yard;
  readonly parts: readonly Part[];
  readonly load: Load;
  readonly locked: boolean;
}

export type IssueLevel = 'error' | 'warning';

export type IssueCode =
  | 'no-parts'
  | 'locked-part'
  | 'no-engine'
  | 'no-tank'
  | 'no-load'
  | 'overfull'
  | 'crew-berths'
  | 'crew-supplies'
  | 'power-deficit'
  | 'engine-throttled'
  | 'eclipse'
  | 'heat-deficit'
  | 'no-yard'
  | 'no-liftoff'
  | 'short-of-orbit'
  | 'no-landing'
  | 'landing-overload'
  | 'lander-thrust'
  | 'no-reentry'
  | 'reentry-overload'
  | 'no-cargo'
  | 'boil-off'
  | 'reactor-radiation';

export interface Issue {
  level: IssueLevel;
  code: IssueCode;
  text: string;
}

export interface Line {
  component: string;
  name: string;
  count: number;
  mass: number;
  cost: Amounts;
}

export interface Drive {
  propellant: PropellantKind;
  engines: readonly { component: string; count: number }[];
  count: number;
  isp: number;
  thrust: number;
  thrustSeaLevel: number;
  power: number;
  throttle: number;
  load: number;
  deltaV: number;
}

export type BodyId = 'earth' | 'moon' | 'mars';

export interface Condition {
  mass: number;
  deltaV: number;
  acceleration: number;
  thrustToWeight: Readonly<Record<BodyId, number>>;
  liftoff: Readonly<Record<BodyId, boolean>>;
}

export interface DesignStats {
  lines: readonly Line[];
  dryMass: number;
  propellant: Readonly<Partial<Record<PropellantKind, number>>>;
  capacity: Readonly<Partial<Record<PropellantKind, number>>>;
  propellantMass: number;
  payloadCapacity: number;
  loaded: Condition;
  empty: Condition;
  drives: readonly Drive[];
  main: Drive | undefined;
  crew: number;
  berths: number;
  stores: number;
  endurance: number | undefined;
  power: { made: number; used: number; engines: number; balance: number; burning: number; storage: number };
  heat: { produced: number; radiated: number; balance: number };
  builtAt: readonly Yard[];
  cost: Amounts;
  propellantCost: Amounts;
  issues: readonly Issue[];
  errors: number;
  warnings: number;
}
