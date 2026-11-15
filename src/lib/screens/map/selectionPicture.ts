import { fleetClassId, shipClass, type Game, type Selection } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { planet } from '#lib/gfx/planets.ts';
import { stars } from '#lib/gfx/scenes.ts';
import { ALIEN_SPECS } from '#lib/gfx/ships/specs.ts';
import { drawShip, fitShip, silhouette } from '#lib/gfx/topdown/index.ts';

export const PICTURE_W = 140;
export const PICTURE_H = 72;
const FRAMES_PER_TICK = 3;

function unknownMark(f: FB, col: RGB): void {
  f.start();
  for (let i = 0; i < 9; i++) {
    f.px(61 + i, 36 - i, col);
    f.px(70 + i, 27 + i, col);
    f.px(79 - i, 36 + i, col);
    f.px(70 - i, 45 - i, col);
  }
}

export function drawSelection(f: FB, game: Game, sel: Selection, t: number): void {
  if (sel.kind === 'fleet') {
    const fleet = game.fleet(sel.id);
    stars(f, t, 26);
    const cls = fleet ? shipClass(fleetClassId(fleet) ?? '') : undefined;
    if (cls)
      drawShip(f, cls, {
        ...fitShip(cls, f.w, f.h, 3, true),
        angle: 0,
        frame: t * FRAMES_PER_TICK,
        thrust: fleet?.orders.length ? 0.7 : 0
      });
  } else if (sel.kind === 'body') {
    const b = game.body(sel.id);
    f.start();
    if (b) planet(f, 70, 36, b.rings ? 19 : 30, b.type, t * 0.02, b);
  } else {
    const c = game.contact(sel.id),
      alien = c?.alienClass ? ALIEN_SPECS[c.alienClass] : undefined;
    if (alien) silhouette(f, alien, { ...fitShip(alien, f.w, f.h, 3), angle: 0, frame: t * FRAMES_PER_TICK });
    else unknownMark(f, PAL.belt[1]);
  }
  f.present();
}
