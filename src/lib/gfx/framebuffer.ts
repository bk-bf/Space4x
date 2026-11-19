import { clamp } from './math';
import { dith, fbm } from './noise';
import { hash } from './math';
import { PAL, type RGB } from './palette';

export interface Surface {
  readonly w: number;
  readonly h: number;
  px(x: number, y: number, c: RGB): void;
  rect(x: number, y: number, w: number, h: number, c: RGB): void;
}

export type Background = 'space' | 'stars' | 'grid';

export type SpritePalette = Readonly<Record<string, RGB | undefined>>;

export class FB implements Surface {
  readonly d: Uint8ClampedArray;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly frame: OffscreenCanvasRenderingContext2D;
  private readonly img: ImageData;
  private readonly vigAt: Uint32Array;
  private readonly vigLut: Uint16Array;
  private bg: Uint8ClampedArray;

  constructor(
    readonly cv: HTMLCanvasElement,
    readonly w: number,
    readonly h: number,
    readonly scale: number,
    vignetteStart = 0.62
  ) {
    const device = scale * (globalThis.devicePixelRatio || 1);
    cv.width = Math.round(w * device);
    cv.height = Math.round(h * device);
    cv.style.width = w * scale + 'px';
    cv.style.height = h * scale + 'px';
    cv.dataset.scale = String(scale);
    const ctx = cv.getContext('2d'),
      frame = new OffscreenCanvas(w, h).getContext('2d');
    if (!ctx || !frame) throw new Error('canvas 2d context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.frame = frame;
    this.img = frame.createImageData(w, h);
    this.d = new Uint8ClampedArray(w * h * 4).fill(255);
    this.bg = this.d;
    const mask = vignetteMask(w, h, vignetteStart),
      shaded: number[] = [];
    mask.forEach((v, i) => {
      if (v) shaded.push(i);
    });
    this.vigAt = Uint32Array.from(shaded, (i) => i * 4);
    this.vigLut = Uint16Array.from(shaded, (i) => (mask[i]! - 1) * 768);
  }

  px(x: number, y: number, c: RGB): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4,
      d = this.d;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
  }

  fill(c: RGB): void {
    const d = this.d;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, gap = 1, phase = 0): void {
    const n = Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let i = 0; i <= n; i++) {
      if ((i + phase) % gap) continue;
      const k = n ? i / n : 0;
      this.px(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, c);
    }
  }

  ring(cx: number, cy: number, r: number, c: RGB, gap = 2, phase = 0): void {
    const n = Math.max(8, Math.round(6.283 * r));
    for (let i = 0; i < n; i++) {
      if ((i + phase) % gap) continue;
      const a = (i / n) * 6.283;
      this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
    }
  }

  sprite(rows: readonly string[], x: number, y: number, pal: SpritePalette, flip = false): void {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j]!,
        w = r.length;
      for (let i = 0; i < w; i++) {
        const c = pal[r[flip ? w - 1 - i : i]!];
        if (c) this.px(x + i, y + j, c);
      }
    }
  }

  present(): void {
    const o = this.img.data,
      d = this.d,
      at = this.vigAt,
      lut = this.vigLut;
    o.set(d);
    for (let k = 0; k < at.length; k++) {
      const j = at[k]!,
        b = lut[k]!;
      o[j] = VIG_LUT[b + d[j]!]!;
      o[j + 1] = VIG_LUT[b + 256 + d[j + 1]!]!;
      o[j + 2] = VIG_LUT[b + 512 + d[j + 2]!]!;
    }
    this.frame.putImageData(this.img, 0, 0);
    this.ctx.drawImage(this.frame.canvas, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  makeBg(kind: Background): this {
    const { w, h } = this;
    this.fill(PAL.bg);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (kind === 'grid') {
          if (x % 8 === 0 && y % 8 === 0) this.px(x, y, PAL.grid);
          continue;
        }
        if (kind !== 'space') continue;
        const n = fbm(x * 0.011 + 3, y * 0.011 + 7, 1.5, 4),
          t = (dith(x, y) - 0.5) * 0.1;
        if (n > 0.6 + t) this.px(x, y, PAL.neb[0]);
        if (n > 0.69 + t) this.px(x, y, PAL.neb[1]);
      }
    if (kind !== 'grid') {
      const n = Math.round((w * h) / 240);
      for (let i = 0; i < n; i++) {
        const b = hash(i, 4, w);
        this.px(hash(i, 1, w) * w, hash(i, 2, w) * h, PAL.star[b < 0.62 ? 0 : b < 0.92 ? 1 : 2]);
      }
    }
    this.bg = this.d.slice();
    return this;
  }

  start(): void {
    this.d.set(this.bg);
  }
}

const VIG_LUT = (() => {
  const lut = new Uint8ClampedArray(4 * 768),
    vc = PAL.vig;
  for (let level = 1; level <= 4; level++)
    for (let ch = 0; ch < 3; ch++)
      for (let v = 0; v < 256; v++)
        lut[(level - 1) * 768 + ch * 256 + v] = v + (vc[ch]! - v) * (level * 0.21);
  return lut;
})();

function vignetteMask(w: number, h: number, start: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const cx = (w - 1) / 2,
    cy = (h - 1) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = clamp((Math.hypot((x - cx) / cx, (y - cy) / cy) - start) / (1.42 - start), 0, 1);
      v = v * v * (3 - 2 * v);
      mask[y * w + x] = Math.min(4, Math.floor(v * 4 + dith(x, y)));
    }
  return mask;
}
