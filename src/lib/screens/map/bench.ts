import { bakeAll } from '#lib/gfx/bodies/fields.ts';
import { prebakeStar } from '#lib/gfx/bodies/star.ts';
import { cam } from './camera.svelte';
import { setFrameCache } from './drawMap';

const DEFAULT_FRAMES = 60;
const SWING = 0.25;
const SWING_RATE = 0.21;

const at = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;

export function runBench(params: URLSearchParams, draw: (dt: number) => number): void {
  const n = Number(params.get('bench')) || DEFAULT_FRAMES,
    moving = params.has('move'),
    t0 = performance.now();
  bakeAll();
  prebakeStar();
  const bake = performance.now() - t0;
  setFrameCache(!params.has('nc'));
  draw(0);
  const base = cam.L,
    times: number[] = [],
    painting: number[] = [];
  for (let i = 0; i < n; i++) {
    if (moving) cam.L = cam.LT = base + SWING * Math.sin(i * SWING_RATE);
    const a = performance.now();
    painting.push(draw(1 / 30));
    times.push(performance.now() - a);
  }
  if (moving) cam.L = cam.LT = base;
  setFrameCache(true);
  times.sort((p, q) => p - q);
  painting.sort((p, q) => p - q);
  document.title = `BENCH ${moving ? 'moving' : params.has('nc') ? 'rest-uncached' : 'rest'} median ${at(times, 0.5).toFixed(1)} p90 ${at(times, 0.9).toFixed(1)} max ${times.at(-1)!.toFixed(1)} paint ${at(painting, 0.5).toFixed(1)} bake ${bake.toFixed(0)}`;
}
