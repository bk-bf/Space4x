import { shipClass } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { shipCentered, silhouette } from '#lib/gfx/ships/draw.ts';
import { ALIEN_SPECS } from '#lib/gfx/ships/specs.ts';

export function drawClass(f: FB, look: string, t: number): void {
  const alien = ALIEN_SPECS[look];
  const own = shipClass(look);
  if (alien) silhouette(f, alien, t);
  else {
    f.fill(PAL.bg);
    if (own) shipCentered(f, own, t);
  }
  f.present();
}
