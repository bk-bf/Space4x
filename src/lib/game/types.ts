import type { IconName } from '#lib/gfx/icons.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { SunTint } from '#lib/gfx/sun.ts';

export type SelectionKind = 'fleet' | 'body' | 'contact' | 'site' | 'ship' | 'base' | 'jump';

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export interface BodyFacts {
  kind: string;
  gravity: string;
  surface: string;
  air: string;
  size: string;
}

export interface Body {
  id: string;
  system: string;
  name: string;
  type: PlanetType;
  radius: number;
  orbit: number;
  angle: number;
  angularSpeed: number;
  tilt?: number;
  rotation?: number;
  rings?: boolean;
  surveyed?: boolean;
  parent?: string;
  colony?: boolean;
  facts: BodyFacts;
}

export interface Ship {
  name: string;
  classId: string;
  fuel: number;
  status: string;
}

export interface FleetMeters {
  fuel: number;
  supplies: number;
  crew: number;
}

export type FleetKind = 'mil' | 'civ';

export type OrderType = 'move' | 'survey' | 'orbit' | 'load' | 'unload' | 'join' | 'refuel';

export interface Order {
  id: number;
  type: OrderType;
  target: string;
  done: number;
}

export interface Fleet {
  id: string;
  system: string;
  name: string;
  kind: FleetKind;
  note: string;
  activity: string;
  meters: FleetMeters;
  orders: Order[];
  ships: Ship[];
  cargo?: string;
  at?: string;
  x: number;
  y: number;
  heading: number;
}

export interface TrackFix {
  at: number;
  x: number;
  y: number;
}

export interface Contact {
  id: string;
  system: string;
  kind: string;
  signal: string;
  range: string;
  seen: string;
  x: number;
  y: number;
  hostile?: boolean;
  alienClass?: string;
  speedKmS: number;
  route: readonly (readonly [number, number])[];
  leg: number;
  held: boolean;
  fixes: TrackFix[];
}

export type EventCategory = 'ship' | 'eye' | 'factory' | 'flask';

export type EventKind = 'arrival' | 'blocked' | 'finished' | 'research' | 'shortage';

export interface GameEvent {
  at: number;
  category: EventCategory;
  text: string;
  warn?: boolean;
  subject?: Selection;
  kind?: EventKind;
  site?: string;
  project?: number;
  material?: string;
}

export interface StatusValue {
  id: string;
  icon: IconName;
  value: string;
  title: string;
  warn?: boolean;
  open?: { site: string; material?: string };
}

export interface Star {
  name: string;
  x: number;
  y: number;
  radius: number;
  tint?: SunTint;
}

export interface JumpPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  to?: string;
  surveyed?: boolean;
  stable?: boolean;
}

export interface StarSystem {
  id: string;
  name: string;
  stars: Star[];
  belt?: { inner: number; width: number };
  jumps: JumpPoint[];
}

export interface World {
  system: string;
  systems: StarSystem[];
  bodies: Body[];
  fleets: Fleet[];
  contacts: Contact[];
  sites: Site[];
}

export type SiteKind = 'yard' | 'harvester' | 'battle' | 'boarding' | 'salvage' | 'gate';

export type SitePlace =
  | { body: string; angle: number; altitude: number }
  | { contact: string }
  | { jump: string }
  | { orbit: number; angle: number };

export interface Site {
  id: string;
  system: string;
  name: string;
  kind: SiteKind;
  place: SitePlace;
  hostile?: boolean;
  station?: boolean;
  facts: [string, string][];
}

export type YardKind = 'commercial' | 'naval';
