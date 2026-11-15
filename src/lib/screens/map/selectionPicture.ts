import { fleetClassId, shipClass, type Game, type Selection } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { planet } from '#lib/gfx/planets.ts';
import { stars } from '#lib/gfx/scenes.ts';
import { shipCentered, silhouette } from '#lib/gfx/ships/draw.ts';
import { ALIEN_SPECS } from '#lib/gfx/ships/specs.ts';

export const PICTURE_W = 140;
export const PICTURE_H = 72;

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
    if (cls) shipCentered(f, cls, t);
  } else if (sel.kind === 'body') {
    const b = game.body(sel.id);
    f.start();
    if (b) planet(f, 70, 36, b.rings ? 19 : 30, b.type, t * 0.02, b);
  } else {
    const c = game.contact(sel.id),
      alien = c?.alienClass ? ALIEN_SPECS[c.alienClass] : undefined;
    if (alien) silhouette(f, alien, t);
    else unknownMark(f, PAL.belt[1]);
  }
  f.present();
}
