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
  rotation: number;
  rotationEstimated?: boolean;
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
  rotation?: number;
  rotationEstimated?: boolean;
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
  rotation: number;
  rotationEstimated?: boolean;
  source: string;
}

export type Site = Body | 'orbit' | 'jump-point';

export type How =
  'mined' | 'wells' | 'brine' | 'byproduct' | 'atmosphere' | 'ice' | 'regolith' | 'solar-wind' | 'liquid';

export type Unit = 'kg' | 'eflops' | 'model';

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
  price?: number;
  extractKgH?: number;
  kcalSource?: string;
  kcalBasis?: string;
  kcalEstimated?: boolean;
  molarMass?: number;
  why: string;
  source: string;
}

export interface Recipe {
  id: string;
  building: string;
  research: number;
  thin?: boolean;
  estimated: boolean;
  inputs: Amounts;
  outputs: Amounts;
  power: number;
  hours: number;
  generates?: number;
  upkeep?: number;
  product?: string;
  reaction?: string;
  source?: string;
  water?: number;
  waterSource?: string;
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

export interface Plant {
  capacityKw: number;
  capacityFactor?: number;
  storageKwh?: number;
  firmShare: number;
  co2PerMwh: number;
  waterPerMwh: number;
}

export interface Lab {
  rpPerMonth: number;
  compute: number;
  powerKw: number;
  waterPerMonth: number;
  basis: string;
  source: string;
}

export interface Charger {
  kw: number;
  basis: string;
  source: string;
  estimated: boolean;
}

export type RobotPartKind = 'tool' | 'chassis' | 'power' | 'computer';

export type DigClass = 'loose' | 'hard' | 'ice' | 'looseIce';

export interface RobotPart {
  id: string;
  name: string;
  kind: RobotPartKind;
  research: number;
  estimated: boolean;
  component?: string;
  cost?: Amounts;
  mass?: number;
  power?: number;
  generates?: number;
  storage?: number;
  dock?: boolean;
  compute?: number;
  rates?: Partial<Record<DigClass, number>>;
  bakes?: number;
  gravity?: 'surface' | 'any';
  chassis?: 'wheeled' | 'anchored';
  basis: string;
  source?: string;
}

export interface Elevator {
  kgPerDay: number;
  payload: number;
  climbDays: number;
  climbers: number;
  climberMass: number;
  powerKw: number;
  basis: string;
  source: string;
  powerSource: string;
  climberSource: string;
  estimated: boolean;
}

export interface Biosphere {
  people: number;
  residentKw: number;
  residentWorkers: number;
  residentVolume: number;
  basis: string;
  source: string;
  volumeSource: string;
  shellSource: string;
  workersSource: string;
  estimated: boolean;
}

export interface Kit {
  material: string;
  builtWith: string;
}

export interface Building {
  id: string;
  name: string;
  kind: BuildingKind;
  where: Site[];
  research: number;
  start?: boolean;
  thin?: boolean;
  estimated: boolean;
  cost: Amounts;
  parts?: string[];
  workers: number;
  footprint?: { land?: number; habitat?: number };
  plant?: Plant;
  lab?: Lab;
  biosphere?: Biosphere;
  kit?: Kit;
  elevator?: Elevator;
  charger?: Charger;
  bp?: number;
  bpSource?: string;
  bpBasis?: string;
  bpEstimated?: boolean;
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
  boost?: { propellant: string; load: number };
  basis: string;
  source?: string;
  estimated: boolean;
}

export interface Component {
  id: string;
  name: string;
  kind: string;
  research: number;
  thin?: boolean;
  estimated: boolean;
  builtAt: string[];
  cost: Amounts;
  performance?: Propulsion;
  design: ComponentDesign;
}

export interface Subject {
  id: string;
  name: string;
}

export type Effect =
  | 'booster_thrust'
  | 'booster_load'
  | 'shipyard_points'
  | 'build_speed'
  | 'extraction'
  | 'research'
  | 'chip_output'
  | 'data_centre_compute'
  | 'solar_array_output'
  | 'battery_storage'
  | 'electrolysis_power'
  | 'elevator_throughput';

export interface ScientistRecord {
  name: string;
  gender: 'm' | 'f';
  subject: string;
  skill: number;
  admin: number;
  seed: number;
  born: number;
}

export interface Project {
  id: string;
  number: number;
  name: string;
  subject: string;
  tier?: Tier;
  rp: number;
  requires: number[];
  line?: string;
  level?: number;
  effects?: Partial<Record<Effect, number>>;
  basis?: string;
  source?: string;
  estimated?: boolean;
}

export interface ReserveRecord {
  material: string;
  reserve: number;
  basis: string;
  content: number | null;
  output: number | null;
  accessibility: number;
  source: string;
  estimated: boolean;
}

export interface NichePoint {
  warming: number;
  share: number;
}

export interface Environment {
  world: string;
  gravity: number;
  radius: number;
  temperature: number;
  water: number;
  atmosphere: Amounts;
  warming?: number;
  niche?: NichePoint[];
  basis: string;
  source: string;
  temperatureSource?: string;
  waterSource?: string;
  nicheSource?: string;
  estimated: boolean;
}
