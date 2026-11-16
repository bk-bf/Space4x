import { lookOf, sphereState, staticRot } from '#lib/game/looks.ts';
import type { Body } from '#lib/game/types.ts';
import { drawSmallBody, smallReach, smallReady, type SmallBody } from '#lib/gfx/bodies/small/index.ts';
import { lookById } from '#lib/gfx/bodies/looks/index.ts';
import { drawSphere, sphereReach } from '#lib/gfx/bodies/sphere.ts';
import { sprite } from '#lib/gfx/icons/sprite.ts';
import { bakes } from '#lib/ui/bakes.svelte.ts';

const TILT = 0.43;
const ROT = 0.6;

const smallSprite = (body: SmallBody, size: number): string =>
  sprite(
    `small:${body.key}:${size}:${smallReady(body) ? 'ready' : 'wait'}`,
    size,
    size,
    (im) =>
      drawSmallBody(
        { w: size, h: size, d: im.d },
        body,
        size / 2,
        size / 2,
        Math.max(3, Math.floor(size / 2 / smallReach(body)) - 1),
        0
      ),
    false
  ).url;

export function planetSprite(body: Body | undefined, size: number, small?: SmallBody): string {
  void bakes.n;
  if (small) return smallSprite(small, size);
  const look = (body ? lookOf(body) : lookById('earth'))!,
    state = {
      ...(body ? sphereState(body, look, staticRot(look, ROT), true) : { rot: ROT, lights: true }),
      tilt: look.tilt ?? TILT
    },
    half = size / 2,
    radius = Math.max(3, Math.floor(half / (sphereReach(look, half) / half)) - 1);
  return sprite(
    `look:${look.id}:${size}:${look.ready ? 'ready' : 'wait'}`,
    size,
    size,
    (im) => drawSphere({ w: size, h: size, d: im.d }, look, state, half, half, radius),
    false
  ).url;
}
