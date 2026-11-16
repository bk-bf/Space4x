import { drawSmallBody, smallReach, spinStep, type SmallBody } from '#lib/gfx/bodies/small/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { RAD } from '#lib/gfx/bodies/looks/math.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { familyId, lookById } from '#lib/gfx/bodies/looks/index.ts';
import { drawSphere, sphereReach } from '#lib/gfx/bodies/sphere.ts';
import { lookOf, sphereState } from '#lib/game/looks.ts';
import type { Body } from '#lib/game/types.ts';

const TILT = 0.43;
const MOON_REACH = 1.17;

export function drawColonyPlanet(
  fb: FB,
  t: number,
  body: Body | undefined,
  moon: boolean,
  small?: SmallBody
): void {
  fb.start();
  const cx = Math.floor(fb.w / 2);
  const cy = Math.floor(fb.h / 2);
  if (small) {
    const fit = Math.floor(Math.min(fb.w / 2, fb.h / 2) / smallReach(small)) - 6;
    drawSmallBody(fb, small, cx, cy, Math.max(10, fit), spinStep(t));
    fb.present();
    return;
  }
  const look = (body ? lookOf(body) : lookById('earth'))!,
    ratio = Math.max(moon ? MOON_REACH + 0.08 : 1, sphereReach(look, 100) / 100),
    radius = Math.max(10, Math.floor(Math.min(fb.w / 2 / ratio, fb.h / 2 / ratio)) - 6),
    spin = t * 0.012 + (look.facing ?? 0) * RAD,
    state = {
      ...(body ? sphereState(body, look, spin, true) : { rot: spin, lights: true }),
      tilt: look.tilt ?? TILT
    };
  drawSphere(fb, look, state, cx, cy, radius);
  const a = t * 0.004;
  if (moon && (Math.sin(a) > -0.2 || Math.abs(Math.cos(a)) > 0.9))
    drawSphere(
      fb,
      lookById(familyId('rock', 1))!,
      { rot: 0 },
      Math.round(cx + Math.cos(a) * radius * MOON_REACH),
      Math.round(cy + Math.sin(a) * radius * 0.15),
      Math.max(2, Math.round(radius / 30))
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
