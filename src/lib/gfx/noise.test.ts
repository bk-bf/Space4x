import { describe, expect, it } from 'vitest';
import { hash, mix } from './math';
import { noise3 } from './noise';

const smooth = (t: number) => t * t * (3 - 2 * t);

function reference(x: number, y: number, z: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z),
    xf = smooth(x - xi),
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

describe('noise3', () => {
  it('gives the value noise of the lattice hash', () => {
    for (let i = 0; i < 2000; i++) {
      const x = (hash(i, 1, 9) - 0.5) * 200,
        y = (hash(i, 2, 9) - 0.5) * 200,
        z = (hash(i, 3, 9) - 0.5) * 200;
      expect(noise3(x, y, z)).toBeCloseTo(reference(x, y, z), 12);
    }
  });
});
