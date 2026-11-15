import type { IconName } from '#lib/gfx/icons.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { SunTint } from '#lib/gfx/sun.ts';

export type SelectionKind = 'fleet' | 'body' | 'contact';

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
  people: string;
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
  rings?: boolean;
  surveyed?: boolean;
  facts: BodyFacts;
}

export interface Ship {
  name: string;
  className: string;
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
  classId: string;
  note: string;
  activity: string;
  meters: FleetMeters;
  orders: Order[];
  ships: Ship[];
  speedKmS: number;
  cargo?: string;
  at?: string;
  x: number;
  y: number;
  heading: 1 | -1;
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

export interface GameEvent {
  at: number;
  category: EventCategory;
  text: string;
  warn?: boolean;
  subject?: Selection;
}

export interface StatusValue {
  id: string;
  icon: IconName;
  value: string;
  title: string;
  warn?: boolean;
}

export interface Star {
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
  to: string;
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
}
