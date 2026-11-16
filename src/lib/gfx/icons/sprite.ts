import { pngDataUrl } from './png.ts';
import { Pix } from './pixels.ts';

export interface Sprite {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

const cache = new Map<string, Sprite>();

export function sprite(key: string, w: number, h: number, draw: (im: Pix) => void, outline = true): Sprite {
  let s = cache.get(key);
  if (!s) {
    const im = new Pix(w, h);
    draw(im);
    if (outline) im.outline();
    s = { url: pngDataUrl(w, h, im.d), width: w, height: h, pixels: im.d };
    cache.set(key, s);
  }
  return s;
}
