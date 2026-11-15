export type RGB = readonly [number, number, number];

export const PAL = {
  bg: [20, 17, 42],
  neb: [
    [30, 24, 62],
    [42, 31, 80]
  ],
  star: [
    [74, 70, 118],
    [140, 138, 184],
    [232, 230, 250]
  ],
  orbit: [58, 54, 104],
  belt: [
    [96, 90, 120],
    [134, 126, 146]
  ],
  course: [190, 138, 72],
  sensor: [52, 128, 128],
  sel: [242, 179, 93],
  hot: [239, 111, 94],
  jump: [95, 208, 197],
  grid: [44, 39, 86],
  vig: [8, 6, 22],
  panel: [28, 24, 56]
} as const satisfies Record<string, RGB | readonly RGB[]>;

export const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
