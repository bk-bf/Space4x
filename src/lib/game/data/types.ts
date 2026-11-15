export type Tier = 'P' | 'E' | 'S';

export type Body =
  | 'earth'
  | 'moon'
  | 'mars'
  | 'venus'
  | 'io'
  | 'titan'
  | 'icy-moon'
  | 'comet'
  | 'asteroid-c'
  | 'asteroid-s'
  | 'asteroid-m'
  | 'gas-giant'
  | 'ice-giant';

export type Site = Body | 'orbit' | 'jump-point';

export type How =
  'mined' | 'wells' | 'brine' | 'byproduct' | 'atmosphere' | 'ice' | 'regolith' | 'solar-wind' | 'liquid';

export type Unit = 'kg' | 'cu' | 'model';

export type Amounts = Record<string, number>;

export interface Source {
  body: Body;
  how: How;
  building: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  tier: Tier;
  thin?: boolean;
  unit?: Unit;
  sources?: Source[];
  why: string;
  source: string;
}

export interface Recipe {
  id: string;
  building: string;
  milestone: number;
  thin?: boolean;
  estimated: boolean;
  inputs: Amounts;
  outputs: Amounts;
  power: number;
  hours: number;
  generates?: number;
  reaction?: string;
  source?: string;
}

export type BuildingKind =
  | 'extraction'
  | 'processing'
  | 'nuclear'
  | 'power'
  | 'electronics'
  | 'habitat'
  | 'infrastructure'
  | 'special';

export interface Building {
  id: string;
  name: string;
  kind: BuildingKind;
  where: Site[];
  milestone: number;
  start?: boolean;
  thin?: boolean;
  estimated: boolean;
  cost: Amounts;
  parts?: string[];
  workers: number;
  footprint?: { land?: number; habitat?: number };
}

export type PerformanceBasis = 'flown' | 'ground-tested' | 'design-study';

export interface Propulsion {
  engine: string;
  isp: number;
  thrust: number;
  thrustSeaLevel?: number;
  mass: number;
  power?: number;
  basis: PerformanceBasis;
  source: string;
  massSource?: string;
}

export interface ComponentDesign {
  mass?: number;
  crew?: number;
  housing?: number;
  stores?: number;
  supports?: number;
  power?: number;
  generates?: number;
  storage?: number;
  heat?: number;
  radiates?: number;
  volume?: number;
  propellants?: string[];
  cargo?: number;
  landing?: number;
  reentry?: number;
  insulates?: boolean;
  basis: string;
  source?: string;
  estimated: boolean;
}

export interface Component {
  id: string;
  name: string;
  kind: string;
  milestone: number;
  thin?: boolean;
  estimated: boolean;
  builtAt: string[];
  cost: Amounts;
  performance?: Propulsion;
  design: ComponentDesign;
}

export interface Milestone {
  id: string;
  number: number;
  name: string;
  tier: Tier;
  optional?: boolean;
  unlocks: string;
  requires: number[];
  needs: { materials: string[]; buildings: string[]; components: string[] };
  sources: string[];
}
