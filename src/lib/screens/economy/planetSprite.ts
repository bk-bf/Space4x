import { sprite } from '#lib/gfx/icons/sprite.ts';
import { planet, type PlanetType } from '#lib/gfx/planets.ts';

export const planetSprite = (type: PlanetType, size: number): string =>
  sprite(
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
