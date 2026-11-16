import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { planet, type PlanetType } from '#lib/gfx/planets.ts';

const TILT = 0.43;
const MOON_REACH = 1.17;

export function drawColonyPlanet(fb: FB, t: number, type: PlanetType, moon: boolean): void {
  fb.start();
  const cx = Math.floor(fb.w / 2);
  const cy = Math.floor(fb.h / 2);
  const reach = moon ? MOON_REACH + 0.08 : 1;
  const radius = Math.max(10, Math.floor(Math.min(fb.w / 2 / reach, fb.h / 2)) - 6);
  planet(fb, cx, cy, radius, type, t * 0.012, { lights: true, tilt: TILT });
  const a = t * 0.004;
  if (moon && (Math.sin(a) > -0.2 || Math.abs(Math.cos(a)) > 0.9))
    planet(
      fb,
      Math.round(cx + Math.cos(a) * radius * MOON_REACH),
      Math.round(cy + Math.sin(a) * radius * 0.15),
      Math.max(2, Math.round(radius / 30)),
      'rock',
      0
    );
  fb.present();
}

const JUMP_RINGS = [1, 0.62, 0.3];

export function drawJumpPoint(fb: FB, t: number, stable: boolean): void {
  fb.start();
  const cx = Math.floor(fb.w / 2);
  const cy = Math.floor(fb.h / 2);
  const radius = Math.max(10, Math.floor(Math.min(fb.w, fb.h) / 2) - 12);
  JUMP_RINGS.forEach((share, i) => {
    const turn = stable ? 0 : (t >> 1) * (i % 2 ? -1 : 1);
    fb.ring(cx, cy, Math.round(radius * share), PAL.jump, stable ? 1 : 3, turn);
  });
  fb.px(cx, cy, PAL.jump);
  fb.present();
}
