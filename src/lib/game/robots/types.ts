import type { Amounts, DigClass, RobotPartKind } from '#lib/game/data/index.ts';

export interface RobotPartCount {
  readonly part: string;
  readonly count: number;
}

export interface RobotDesign {
  readonly id: string;
  readonly name: string;
  readonly parts: readonly RobotPartCount[];
  readonly locked: boolean;
}

export type Chassis = 'wheeled' | 'anchored';

export interface Figures {
  id: string;
  name: string;
  kind: RobotPartKind;
  research: number;
  mass: number;
  power: number;
  generates: number;
  storage: number;
  dock: boolean;
  compute: number;
  cost: Amounts;
  rates: Partial<Record<DigClass, number>>;
  bakes: number;
  gravity: 'surface' | 'any' | undefined;
  chassis: Chassis | undefined;
  basis: string;
  source: string | undefined;
  estimated: boolean;
}

export type RobotIssueCode =
  | 'no-parts'
  | 'locked-part'
  | 'no-chassis'
  | 'two-chassis'
  | 'no-tool'
  | 'idle-tool'
  | 'no-power'
  | 'power-deficit'
  | 'no-computer';

export interface RobotIssue {
  level: 'error' | 'warning';
  code: RobotIssueCode;
  text: string;
}

export interface RobotLine {
  part: string;
  name: string;
  count: number;
  mass: number;
  cost: Amounts;
}

export interface RobotStats {
  lines: readonly RobotLine[];
  mass: number;
  cost: Amounts;
  chassis: Chassis | undefined;
  power: { made: number; used: number; storage: number; dock: boolean; balance: number };
  compute: number;
  rates: Readonly<Record<DigClass, number>>;
  wear: number;
  issues: readonly RobotIssue[];
  errors: number;
  warnings: number;
}
