export type Tier = 'P' | 'E' | 'S';

export type Body =
  | 'earth'
  | 'moon'
  | 'mercury'
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

export type AsteroidType = 'carbonaceous' | 'stony' | 'metallic' | 'icy';

export type TypeBasis = 'albedo' | 'assumed';

export type RegionKind = 'ground' | 'atmosphere';

export interface Deposit {
  material: string;
  grade: number;
}

export interface Region {
  id: string;
  world: string;
  body: Body;
  name: string;
  kind: RegionKind;
  known?: boolean;
  template?: boolean;
  deposits: Deposit[];
  basis: string;
  source: string;
  estimated: boolean;
}

export interface AsteroidRecord {
  id: string;
  number?: number;
  name: string;
  type: AsteroidType;
  typeBasis?: TypeBasis;
  spectral?: string;
  dwarf?: boolean;
  a: number;
  e: number;
  diameter: number;
  diameterEstimated?: boolean;
  mass: number;
  massEstimated?: boolean;
  source: string;
}

export interface MoonRecord {
  id: string;
  code: number;
  name: string;
  planet: string;
  type: AsteroidType;
  irregular?: boolean;
  aKm: number;
  e: number;
  period: number;
  diameter: number;
  diameterEstimated?: boolean;
  mass: number;
  massEstimated?: boolean;
  source: string;
}

export interface CometRecord {
  id: string;
  designation: string;
  name: string;
  a: number;
  e: number;
  diameter: number;
  mass: number;
  massEstimated: true;
  source: string;
}

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
  kcalPerKg?: number;
  kcalSource?: string;
  kcalBasis?: string;
  kcalEstimated?: boolean;
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
  automates?: boolean;
  surveys?: boolean;
  samples?: boolean;
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

export interface SiteNeed {
  label: string;
  world?: string;
  body?: Body;
  place?: 'surface' | 'orbit' | 'point';
  region?: string;
  buildings?: string[];
  people?: number;
  fed?: boolean;
  stock?: { material: string; amount: number };
  made?: { material: string; amount: number };
  ran?: Record<string, number>;
  built?: number;
  flown?: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  number: number;
  name: string;
  subject: string;
  tier: Tier;
  optional?: boolean;
  unlocks: string;
  requires: number[];
  needs: {
    materials: string[];
    buildings: string[];
    components: string[];
    sites?: SiteNeed[];
    bill?: Record<string, number>;
  };
  sources: string[];
}
