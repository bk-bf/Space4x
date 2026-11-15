import type { IconName } from '#lib/gfx/icons.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { SunTint } from '#lib/gfx/sun.ts';

export type SelectionKind = 'fleet' | 'body' | 'contact' | 'site';

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

export type MineralId = 'iron' | 'titanium' | 'copper' | 'uranium' | 'ice';

export type InstallationId = 'mine' | 'factory' | 'refinery' | 'lab' | 'dome' | 'spaceport' | 'exchange';

export type ComponentId = 'cargo-container' | 'sensor-array' | 'hull-plating' | 'drive-coil' | 'fuel-tank';

export type ItemId = InstallationId | ComponentId;

export type GoodId = 'food' | 'consumer' | 'parts' | 'medical' | 'luxury';

export interface Deposit {
  amount: number;
  initial: number;
  accessibility: number;
}

export interface BuildOrder {
  id: number;
  item: ItemId;
  ordered: number;
  quantity: number;
  share: number;
  done: number;
  paused: boolean;
  waiting: MineralId | null;
}

export interface ShipBuild {
  classId: string;
  done: number;
  total: number;
}

export interface Slipway {
  id: number;
  build: ShipBuild | null;
}

export type YardTaskKind = 'slipway' | 'capacity' | 'retool';

export interface YardTask {
  id: number;
  kind: YardTaskKind;
  total: number;
  done: number;
  classId?: string;
  amount?: number;
}

export type YardKind = 'commercial' | 'naval';

export interface Yard {
  id: number;
  name: string;
  kind: YardKind;
  capacity: number;
  tooled: string;
  slipways: Slipway[];
  tasks: YardTask[];
}

export interface Governor {
  name: string;
  bonus: number;
}

export interface ColonyEnvironment {
  domed: boolean;
  note: string;
}

export interface TradeBalance {
  supply: number;
  demand: number;
}

export interface Colony {
  id: string;
  moon: boolean;
  population: number;
  birthRate: number;
  capacityBase: number;
  workforceShare: number;
  governor: Governor;
  garrison: number;
  environment: ColonyEnvironment;
  installations: Record<InstallationId, number>;
  components: Record<ComponentId, number>;
  stock: Record<MineralId, number>;
  fuel: number;
  target: number;
  draw: Record<MineralId | 'fuel', number>;
  deposits: Record<MineralId, Deposit>;
  queue: BuildOrder[];
  yards: Yard[];
  trade: Record<GoodId, TradeBalance>;
  built: Record<string, number>;
  lowStock: Partial<Record<MineralId | 'fuel', boolean>>;
}

export interface ShippingLine {
  id: number;
  name: string;
  ships: number;
  subsidy: boolean;
  growth: number;
}

export interface MonthFlow {
  income: number;
  spending: number;
}

export interface Economy {
  colonies: Colony[];
  lines: ShippingLine[];
  wealth: number;
  history: MonthFlow[];
  month: MonthFlow;
  monthIndex: number;
  nextId: number;
}
