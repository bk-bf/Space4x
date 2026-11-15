import { hash, mix } from './math';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const dith = (x: number, y: number): number => (BAYER4[((y & 3) << 2) | (x & 3)]! + 0.5) / 16;

const smooth = (t: number) => t * t * (3 - 2 * t);

export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const xf = smooth(x - xi),
    yf = smooth(y - yi),
    zf = smooth(z - zi);
  return mix(
    mix(
      mix(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf),
      mix(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf),
      yf
    ),
    mix(
      mix(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf),
      mix(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf),
      yf
    ),
    zf
  );
}

export function fbm(x: number, y: number, z: number, octaves: number): number {
  let a = 0.5,
    f = 1,
    s = 0,
    n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f);
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
}
