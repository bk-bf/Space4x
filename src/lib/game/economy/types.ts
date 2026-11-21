import type { Amounts, Site as Where } from '#lib/game/data/index.ts';
import type { EventKind } from '#lib/game/types.ts';

export interface Group {
  id: number;
  building: string;
  process: string | null;
  count: number;
  on: boolean;
  active?: number;
}

export interface RobotGroup {
  id: number;
  design: string;
  count: number;
  material: string | null;
}

export interface BuildOrder {
  id: number;
  building: string;
  process: string | null;
  done: number;
  paused: boolean;
  stalled: string | null;
}

export interface YardOrder {
  id: number;
  design: string;
  name: string;
  yard: string;
  cost: Amounts;
  shipyards: number;
  points: number;
  percent: number;
  paid: boolean;
  done: number;
  paused: boolean;
  stalled: string | null;
  robot?: boolean;
}

export interface Delivery {
  site: string;
  design: string;
  order: number;
  at: number;
}

export type SitePlace = 'surface' | 'orbit' | 'point';

export interface Alerts {
  food: boolean;
  power: boolean;
  firm?: boolean;
  soon?: string[];
}

export interface Site {
  id: string;
  name: string;
  body: Where;
  worldBody: string;
  region: string | null;
  place: SitePlace;
  angle: number;
  berths: number | null;
  population: number;
  workforceShare: number;
  kcalPerPersonDay: number;
  growthPerYear: number;
  gridKw: number;
  stock: Record<string, number>;
  groups: Group[];
  robots: RobotGroup[];
  queue: BuildOrder[];
  yard: YardOrder[];
  launches: number[];
  alerts: Alerts;
}

export interface Scientist {
  id: number;
  name: string;
  gender: 'm' | 'f';
  subject: string;
  skill: number;
  admin: number;
  seed: number;
  born: number;
}

export interface Programme {
  number: number;
  lead: number;
  labs: number;
  rp: number;
}

export interface Queued {
  number: number;
  lead: number;
}

export interface Ledger {
  extracted: number;
  eaten: number;
  built: number;
  lost: number;
  burned: number;
}

export type Terms =
  | { kind: 'lease'; building: string; process: string | null; count: number }
  | { kind: 'supply'; material: string; amount: number };

export type Offer = Terms & { id: number; months: number; pays: number };

export type Contract = Offer & { left: number; due: number; missed: boolean };

export interface Market {
  treasury: number;
  paid: number;
  month: number;
  offers: Offer[];
  contracts: Contract[];
}

export interface Economy {
  sites: Site[];
  done: number[];
  running: Programme[];
  queued: Queued[];
  scientists: Scientist[];
  elapsed: number;
  nextId: number;
  delivered: Delivery[];
  mined: Record<string, number>;
  exhausted: string[];
  drawn: Record<string, number>;
  ledger: Ledger;
  market: Market;
}

export interface LogTag {
  kind?: EventKind;
  project?: number;
  material?: string;
}

export type LogFn = (text: string, warn: boolean, atSeconds: number, site?: string, tag?: LogTag) => void;
