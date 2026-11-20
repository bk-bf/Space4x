import type { Amounts, Site as Where } from '#lib/game/data/index.ts';
import type { EventKind } from '#lib/game/types.ts';

export interface Group {
  id: number;
  building: string;
  process: string | null;
  count: number;
  on: boolean;
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
  hours: number;
  done: number;
  paused: boolean;
  stalled: string | null;
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
  queue: BuildOrder[];
  yard: YardOrder[];
  launches: number[];
  alerts: Alerts;
}

export interface Programme {
  number: number;
  site: string;
  progress: number;
}

export interface Ledger {
  extracted: number;
  eaten: number;
  built: number;
  lost: number;
  burned: number;
}

export interface Economy {
  sites: Site[];
  done: number[];
  running: Programme[];
  elapsed: number;
  nextId: number;
  delivered: Delivery[];
  mined: Record<string, number>;
  exhausted: string[];
  ledger: Ledger;
}

export interface LogTag {
  kind: EventKind;
  milestone?: number;
  material?: string;
}

export type LogFn = (text: string, warn: boolean, atSeconds: number, site?: string, tag?: LogTag) => void;
