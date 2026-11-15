export type V2 = readonly [number, number];

export const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: V2, k: number): V2 => [a[0] * k, a[1] * k];
export const norm = (a: V2): number => Math.hypot(a[0], a[1]);
export const unit = (a: V2): V2 => {
  const n = norm(a);
  return n === 0 ? [0, 0] : [a[0] / n, a[1] / n];
};
export const polar = (r: number, angle: number): V2 => [r * Math.cos(angle), r * Math.sin(angle)];
