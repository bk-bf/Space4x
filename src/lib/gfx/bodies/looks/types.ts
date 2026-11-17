import type { Channel, Cube } from '#lib/gfx/bodies/cube.ts';
import type { RGB } from '#lib/gfx/palette.ts';

export interface Texels {
  readonly 0: number;
  readonly 1: number;
  readonly 2: number;
  readonly 3: number;
  readonly 4: number;
  readonly 5: number;
  readonly 6: number;
  readonly 7: number;
  readonly 8: number;
}

export interface Colour {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export const ADD = 3;
export const LAND = 4;
export const SEA = 5;

export type Shader = (x: number, y: number, z: number, R: number, dv: number, G: Texels, O: Colour) => void;

export interface Veil {
  readonly c: RGB;
  readonly k?: number;
  readonly rim?: number;
}

export interface LookDef {
  readonly id: string;
  readonly channels: readonly Channel[];
  readonly shade: Shader;
  readonly tint?: RGB;
  readonly face?: number;
  readonly facing?: number;
  readonly tilt?: number;
  readonly pitch?: number;
  readonly bump?: number;
  readonly gradRange?: number;
  readonly rawOf?: () => number;
  readonly shapeFn?: Channel;
  readonly lumpyAmp?: number;
  readonly macro?: Channel;
  readonly shape?: readonly [number, number, number];
  readonly atmo?: Veil;
  readonly halo?: Veil;
  readonly rimW?: number;
  readonly rings?: boolean;
}

export interface Look {
  readonly id: string;
  readonly channels: readonly Channel[];
  readonly shade: Shader;
  readonly tint: RGB;
  readonly cube: Cube;
  readonly surface: Channel | undefined;
  readonly shape: readonly [number, number, number] | undefined;
  readonly bump: number;
  readonly gradAt: number;
  readonly gradRange: number;
  readonly rawOf: (() => number) | undefined;
  readonly atmo: Veil | undefined;
  readonly halo: Veil | undefined;
  readonly rimW: number;
  readonly rings: boolean;
  readonly facing: number | undefined;
  tilt: number | undefined;
  pitch: number | undefined;
  ready: boolean;
}
