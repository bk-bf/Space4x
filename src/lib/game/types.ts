import type { IconName } from '#lib/gfx/icons.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';

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
  name: string;
  type: PlanetType;
  radius: number;
  orbit: number;
  angle: number;
  angularSpeed: number;
  tilt?: number;
  rings?: boolean;
  facts: BodyFacts;
}

export interface Ship {
  name: string;
  className: string;
  fuel: number;
  status: string;
}

export interface FleetMeters {
  fuel: number;
  supplies: number;
  crew: number;
}

export type FleetKind = 'mil' | 'civ';

export interface Fleet {
  id: string;
  name: string;
  kind: FleetKind;
  classId: string;
  note: string;
  meters: FleetMeters;
  orders: string[];
  ships: Ship[];
  speedKmS: number;
  at?: string;
  destination?: string;
  x: number;
  y: number;
  heading: 1 | -1;
}

export interface Contact {
  id: string;
  kind: string;
  signal: string;
  range: string;
  seen: string;
  x: number;
  y: number;
  hostile?: boolean;
  alienClass?: string;
}

export type EventCategory = 'ship' | 'eye' | 'factory' | 'flask';

export interface GameEvent {
  at: number;
  category: EventCategory;
  text: string;
  warn?: boolean;
}

export interface StatusValue {
  id: string;
  icon: IconName;
  value: string;
  title: string;
  warn?: boolean;
}

export interface StarSystem {
  id: string;
  name: string;
}

export interface World {
  system: string;
  systems: StarSystem[];
  bodies: Body[];
  fleets: Fleet[];
  contacts: Contact[];
}
