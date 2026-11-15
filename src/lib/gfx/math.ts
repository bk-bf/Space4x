export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export function hash(x: number, y: number, z: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
