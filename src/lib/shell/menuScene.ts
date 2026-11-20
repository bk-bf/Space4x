import { FB } from '#lib/gfx/framebuffer.ts';
import { YardScene } from '#lib/screens/map/sites/yard.ts';

const MIN_SCALE = 2;
const VIGNETTE = 0.7;
const SUN = Math.atan2(-0.45, -0.55);
const SITE_SCALE = 5 / 10 ** 0.26;
const FRAME_MS = 1000 / 31;
const MAX_STEP = 0.1;

export interface Fit {
  scale: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
}

export function fitStill(iw: number, ih: number, vw: number, vh: number): Fit {
  const scale = Math.max(MIN_SCALE, Math.ceil(Math.max(vw / iw, vh / ih))),
    w = Math.ceil(vw / scale),
    h = Math.ceil(vh / scale);
  return { scale, w, h, ox: Math.round((w - iw) / 2), oy: Math.round((h - ih) / 2) };
}

function cropped(still: ImageData, fit: Fit): Uint8ClampedArray {
  const out = new Uint8ClampedArray(fit.w * fit.h * 4);
  for (let y = 0; y < fit.h; y++) {
    const from = ((y - fit.oy) * still.width - fit.ox) * 4;
    out.set(still.data.subarray(from, from + fit.w * 4), y * fit.w * 4);
  }
  return out;
}

export class MenuScene {
  private readonly yard = new YardScene();
  private fb: FB | null = null;
  private bg: Uint8ClampedArray = new Uint8ClampedArray(0);
  private fit: Fit | null = null;
  private frame = 0;
  private last = 0;

  constructor(private readonly still: ImageData) {}

  resize(cv: HTMLCanvasElement, vw: number, vh: number): void {
    if (!vw || !vh) return;
    const fit = fitStill(this.still.width, this.still.height, vw, vh);
    this.fit = fit;
    this.fb = new FB(cv, fit.w, fit.h, fit.scale, VIGNETTE);
    this.bg = cropped(this.still, fit);
    this.last = 0;
    this.paint(0);
  }

  tick(now: number): void {
    if (this.last && now - this.last < FRAME_MS) return;
    this.paint(this.last ? Math.min(MAX_STEP, (now - this.last) / 1000) : 0);
    this.last = now;
  }

  private paint(dt: number): void {
    const { fb, fit } = this;
    if (!fb || !fit) return;
    const cx = this.still.width / 2 + fit.ox,
      cy = this.still.height / 2 + fit.oy;
    fb.d.set(this.bg);
    this.yard.draw(
      {
        f: fb,
        W: (x, y) => [cx + x * SITE_SCALE, cy + y * SITE_SCALE],
        S: SITE_SCALE,
        dt,
        frame: this.frame++,
        sun: SUN
      },
      []
    );
    fb.present();
  }
}

export async function loadStill(url: string): Promise<ImageData> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const ctx = new OffscreenCanvas(img.naturalWidth, img.naturalHeight).getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
}
