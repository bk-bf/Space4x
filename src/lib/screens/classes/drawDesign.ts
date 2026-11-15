import type { FB } from '#lib/gfx/framebuffer.ts';
import { stars } from '#lib/gfx/scenes.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import { drawShip, fitShip } from '#lib/gfx/topdown/index.ts';

const FRAMES_PER_TICK = 3;
const PAD = 8;
const THRUST = 0.6;
const STARS = 40;

export function drawDesign(fb: FB, spec: ShipSpec | undefined, t: number): void {
  stars(fb, spec?.stern ? t : 0, STARS);
  if (spec && (spec.stern || spec.parts.length || spec.bow))
    drawShip(fb, spec, {
      ...fitShip(spec, fb.w, fb.h, PAD, true),
      angle: 0,
      frame: t * FRAMES_PER_TICK,
      thrust: spec.stern ? THRUST : 0
    });
  fb.present();
}
