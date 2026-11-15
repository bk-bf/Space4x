import { shipClass } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { ALIEN_SPECS } from '#lib/gfx/ships/specs.ts';
import { drawShip, fitShip, silhouette } from '#lib/gfx/topdown/index.ts';

const FRAMES_PER_TICK = 3;
const PAD = 3;

export function drawClass(f: FB, look: string, t: number): void {
  const alien = ALIEN_SPECS[look];
  const own = shipClass(look);
  const frame = t * FRAMES_PER_TICK;
  if (alien) silhouette(f, alien, { ...fitShip(alien, f.w, f.h, PAD), angle: 0, frame });
  else {
    f.fill(PAL.bg);
    if (own) drawShip(f, own, { ...fitShip(own, f.w, f.h, PAD), angle: 0, frame });
  }
  f.present();
}
