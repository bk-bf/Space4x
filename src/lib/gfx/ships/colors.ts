import type { RGB } from '../palette';

export interface HullColors {
  o: RGB;
  H: RGB;
  h: RGB;
  d: RGB;
  w: RGB;
  r: RGB;
  y: RGB;
  c: RGB;
  C: RGB;
  e: RGB;
}

export const C: HullColors = {
  o: [14, 14, 26],
  H: [182, 192, 210],
  h: [126, 136, 162],
  d: [72, 80, 108],
  w: [110, 220, 230],
  r: [214, 84, 74],
  y: [238, 186, 84],
  c: [168, 100, 62],
  C: [70, 144, 144],
  e: [40, 40, 58]
};

export const ARM: HullColors = { ...C, H: [158, 162, 178], h: [102, 108, 132], d: [58, 62, 88] };

export const F1: RGB = [255, 244, 200];
export const F2: RGB = [255, 190, 90];
export const F3: RGB = [230, 110, 60];
