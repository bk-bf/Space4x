import { mulMat, rotX, rotY, rotZ } from './looks/math.ts';

export interface Pixels {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8ClampedArray;
}

export interface SphereState {
  rot: number;
  tilt?: number;
  pitch?: number;
  lights?: boolean;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const LIGHT = (() => {
  const v = [-0.55, -0.45, 0.7] as const,
    l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l] as const;
})();

export const SHADES = [0.2, 0.5, 0.76, 1] as const;

export function orientation(st: SphereState) {
  return mulMat(mulMat(rotY(st.rot), rotX(st.pitch ?? 0)), rotZ(-(st.tilt ?? 0)));
}
