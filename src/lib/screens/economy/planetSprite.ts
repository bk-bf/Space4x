import { drawSmallBody, smallReach, type SmallBody } from '#lib/gfx/bodies/small/index.ts';
import { sprite } from '#lib/gfx/icons/sprite.ts';
import { planet, type PlanetType } from '#lib/gfx/planets.ts';

const smallSprite = (body: SmallBody, size: number): string =>
  sprite(
    `small:${body.key}:${size}`,
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

export const planetSprite = (type: PlanetType, size: number, small?: SmallBody): string =>
  small
    ? smallSprite(small, size)
    : sprite(
        `planet:${type}:${size}`,
        size,
        size,
        (im) => {
          const surface = {
            w: size,
            h: size,
            px: (x: number, y: number, c: readonly [number, number, number]) => im.set(x, y, c),
            rect: (x: number, y: number, w: number, h: number, c: readonly [number, number, number]) =>
              im.rect(x, y, w, h, c)
          };
          planet(surface, size / 2, size / 2, size / 2 - 1, type, 0.6, { lights: true, tilt: 0.43 });
        },
        false
      ).url;
