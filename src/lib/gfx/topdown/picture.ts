import type { RGB } from '../palette';
import type { ShipSpec } from '../ships/specs';
import { pngDataUrl } from '../icons/png.ts';
import { drawShip, fitShip, type Pixels } from './index.ts';

export interface ShipPicture {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

const PAD = 1;
const MIN_ALPHA = 6;

const cache = new WeakMap<ShipSpec, Map<string, ShipPicture | null>>();
let drawn = 0;

export const picturesDrawn = (): number => drawn;

function surface(w: number, h: number, ground: number): Pixels {
  const d = new Uint8ClampedArray(w * h * 4).fill(ground);
  for (let i = 3; i < d.length; i += 4) d[i] = 255;
  return {
    w,
    h,
    d,
    px(x: number, y: number, c: RGB): void {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
    }
  };
}

function paint(cls: ShipSpec, w: number, h: number, ground: number): Uint8ClampedArray {
  const fb = surface(w, h, ground);
  drawShip(fb, cls, { ...fitShip(cls, w, h, PAD), angle: 0, thrust: 0 });
  return fb.d;
}

function render(cls: ShipSpec, w: number, h: number): ShipPicture | null {
  const dark = paint(cls, w, h, 0),
    light = paint(cls, w, h, 255),
    out = new Uint8ClampedArray(w * h * 4);
  let covered = 0;
  for (let i = 0; i < out.length; i += 4) {
    const gap = (light[i]! - dark[i]! + light[i + 1]! - dark[i + 1]! + light[i + 2]! - dark[i + 2]!) / 3,
      a = 255 - gap;
    if (a < MIN_ALPHA) continue;
    covered++;
    out[i] = (dark[i]! * 255) / a;
    out[i + 1] = (dark[i + 1]! * 255) / a;
    out[i + 2] = (dark[i + 2]! * 255) / a;
    out[i + 3] = a;
  }
  drawn++;
  return covered ? { url: pngDataUrl(w, h, out), width: w, height: h } : null;
}

export function shipPicture(cls: ShipSpec, w: number, h: number): ShipPicture | null {
  let sizes = cache.get(cls);
  if (!sizes) cache.set(cls, (sizes = new Map()));
  const key = `${w}x${h}`;
  if (!sizes.has(key)) sizes.set(key, render(cls, w, h));
  return sizes.get(key) ?? null;
}
