import { game } from '#lib/game/index.ts';
import { lookOf, sphereState, staticRot } from '#lib/game/looks.ts';
import { drawSphere } from '#lib/gfx/bodies/sphere.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { YardScene } from '#lib/screens/map/sites/yard.ts';

const SUN = Math.atan2(-0.6, -0.8);
const MAX_STEP = 0.25;
const SCENE_UNITS = 190;

export interface MenuLayout {
  earth: { x: number; y: number; r: number };
  station: { x: number; y: number; unit: number };
}

export function menuLayout(w: number, h: number): MenuLayout {
  return {
    earth: { x: w * 0.9, y: h * 1.7, r: h * 1.12 },
    station: { x: w * 0.64, y: h * 0.42, unit: (w * 0.8) / SCENE_UNITS }
  };
}

export class MenuScene {
  private readonly yard = new YardScene();
  private backdrop: Uint8ClampedArray | null = null;
  private drawnFor = '';
  private last = 0;

  draw(fb: FB): void {
    const earth = game.body('earth');
    if (!earth) return;
    const look = lookOf(earth),
      { earth: at, station } = menuLayout(fb.w, fb.h),
      key = `${fb.w}x${fb.h}:${look.ready}`;
    if (key !== this.drawnFor || !this.backdrop) {
      fb.start();
      drawSphere(
        fb,
        look,
        { ...sphereState(earth, look, staticRot(look, 0), false), sun: SUN },
        at.x,
        at.y,
        at.r
      );
      this.backdrop = fb.d.slice();
      this.drawnFor = key;
    } else fb.d.set(this.backdrop);
    const now = performance.now(),
      dt = this.last ? Math.min(MAX_STEP, (now - this.last) / 1000) : 0;
    this.last = now;
    const S = station.unit;
    this.yard.draw(
      {
        f: fb,
        W: (x, y) => [station.x + x * S, station.y + y * S],
        S,
        dt,
        frame: Math.floor(now / 33),
        sun: SUN
      },
      []
    );
    fb.present();
  }
}
