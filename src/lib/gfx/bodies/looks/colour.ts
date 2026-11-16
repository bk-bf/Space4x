import type { RGB } from '#lib/gfx/palette.ts';
import type { Colour } from './types.ts';

export type Stops = readonly (readonly [number, RGB])[];

export function setc(O: Colour, c: RGB): void {
  O[0] = c[0];
  O[1] = c[1];
  O[2] = c[2];
}

function mixc(O: Colour, a: RGB, b: RGB, t: number): void {
  O[0] = a[0] + (b[0] - a[0]) * t;
  O[1] = a[1] + (b[1] - a[1]) * t;
  O[2] = a[2] + (b[2] - a[2]) * t;
}

export function toward(O: Colour, c: RGB, t: number): void {
  O[0] += (c[0] - O[0]) * t;
  O[1] += (c[1] - O[1]) * t;
  O[2] += (c[2] - O[2]) * t;
}

export function ramp(O: Colour, stops: Stops, t: number): void {
  const n = stops.length;
  if (t <= stops[0]![0]) return setc(O, stops[0]![1]);
  for (let i = 1; i < n; i++) {
    const a = stops[i - 1]!,
      b = stops[i]!;
    if (t <= b[0]) return mixc(O, a[1], b[1], (t - a[0]) / (b[0] - a[0]));
  }
  setc(O, stops[n - 1]![1]);
}
