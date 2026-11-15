import type { Body } from '#lib/game/data/index.ts';

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

export interface Alerts {
  food: boolean;
  power: boolean;
}

export interface Site {
  id: string;
  name: string;
  body: Body;
  worldBody: string;
  population: number;
  workforceShare: number;
  foodPerPersonDay: number;
  growthPerYear: number;
  gridKw: number;
  stock: Record<string, number>;
  groups: Group[];
  queue: BuildOrder[];
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
  spent: number;
  lost: number;
}

export interface Economy {
  sites: Site[];
  done: number[];
  running: Programme[];
  elapsed: number;
  nextId: number;
  ledger: Ledger;
}

export type LogFn = (text: string, warn: boolean, atSeconds: number, site?: string) => void;
