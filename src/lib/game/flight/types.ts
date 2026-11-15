import type { Conic } from './kepler.ts';
import type { LineSolution } from './line.ts';
import type { Spiral } from './spiral.ts';
import type { Endpoint, State } from './system.ts';

export interface Aerobrake {
  maxVInf: number;
  residualDv: number;
}

export interface Atmosphere {
  ascentLoss: number;
  landingDv: number;
  aerobrake?: Aerobrake;
}

export interface FlightBody {
  id: string;
  parent?: string;
  gm: number;
  radius: number;
  orbit: number;
  angle: number;
  angularSpeed: number;
  lowOrbitAltitude?: number;
  atmosphere?: Atmosphere;
}

export interface FlightSystem {
  star: { gm: number; radius: number };
  bodies: readonly FlightBody[];
}

export type Place =
  | { kind: 'surface'; body: string }
  | { kind: 'orbit'; body: string; altitude?: number; angle?: number }
  | {
      kind: 'point';
      id: string;
      primary?: string;
      orbit: number;
      angle: number;
      angularSpeed?: number;
    };

export type Profile = 'cheapest' | 'balanced' | 'fastest';
export type Model = 'orbit' | 'spiral' | 'line';

export type ManeuverKind = 'ascent' | 'escape' | 'burn' | 'capture' | 'descent';
export type ManeuverMode = 'impulsive' | 'passes' | 'spiral' | 'aero' | 'surface';

export interface Maneuver {
  kind: ManeuverKind;
  body?: string;
  mode: ManeuverMode;
  dv: number;
  duration: number;
  start: number;
}

export type ReasonCode =
  'delta-v' | 'thrust-surface' | 'thrust-landing' | 'no-path' | 'same-place' | 'unknown-body';

export interface Reason {
  code: ReasonCode;
  message: string;
  need?: number;
  have?: number;
}

export type Track =
  | { kind: 'conic'; conic: Conic; dir: 1 | -1; theta0: number }
  | { kind: 'spiral'; spiral: Spiral; dir: 1 | -1; theta0: number }
  | { kind: 'line'; solution: LineSolution; start: State };

export interface Stamps {
  launch: number;
  helioStart: number;
  helioEnd: number;
  end: number;
}

export interface TripOption {
  profile: Profile;
  model: Model;
  departure: number;
  window: number;
  arrival: number;
  duration: number;
  dv: number;
  propellant: number;
  propellantLeft: number;
  canStop: boolean;
  canReturn: boolean;
  returnDv?: number;
  aerobraked: boolean;
  approximate: boolean;
  maneuvers: Maneuver[];
  stamps: Stamps;
  track: Track;
  primary: string;
  origin: Endpoint;
  target: Endpoint;
  system: FlightSystem;
}

export interface TripPlan {
  options: TripOption[];
  reasons: Reason[];
}
