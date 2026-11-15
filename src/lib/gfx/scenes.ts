import type { FB } from './framebuffer';
import { clamp, hash } from './math';
import { dith, fbm } from './noise';
import { PAL, type RGB } from './palette';

export function stars(fb: FB, t: number, n: number): void {
  fb.fill(PAL.bg);
  for (let k = 0; k < n; k++) {
    const v = hash(k, 2, 9),
      x = (((hash(k, 1, 9) * fb.w - t * (0.3 + v * 1.4)) % fb.w) + fb.w) % fb.w;
    fb.px(x, hash(k, 3, 9) * fb.h, PAL.star[v < 0.5 ? 0 : v < 0.85 ? 1 : 2]);
  }
}

const DUSK_SKY: readonly RGB[] = [
  [70, 44, 58],
  [150, 96, 74],
  [206, 156, 108]
];
const LIT: RGB = [250, 210, 120];

export function duskSky(x: number, y: number, horizon: number): RGB {
  return DUSK_SKY[clamp(Math.floor((y / horizon) * 2.6 + (dith(x, y) - 0.5) * 0.9), 0, 2)]!;
}

export function regolith(x: number, y: number): RGB {
  return fbm(x * 0.08, y * 0.3, 2, 2) + dith(x, y) * 0.3 > 0.62 ? [96, 46, 38] : [78, 38, 34];
}

function dome(s: FB, x: number, yb: number, t: number): number {
  const r = 6;
  for (let i = -r; i <= r; i++) {
    const h = Math.round(Math.sqrt(r * r - i * i));
    for (let y = yb - h; y <= yb; y++)
      s.px(
        x + r + i,
        y,
        y === yb - h ? [214, 224, 232] : hash(x + i, y, Math.floor(t / 25)) > 0.86 ? LIT : [84, 106, 128]
      );
  }
  return 16;
}

function mine(s: FB, x: number, yb: number, t: number): number {
  s.line(x, yb, x + 4, yb - 10, [40, 30, 34]);
  s.line(x + 8, yb, x + 4, yb - 10, [40, 30, 34]);
  s.px(x + 4, yb - 11, (t >> 3) & 1 ? [239, 111, 94] : [40, 30, 34]);
  for (let i = 0; i < 6; i++)
    for (let j = 0; j <= Math.min(i, 5 - i); j++) s.px(x + 9 + i, yb - j, [140, 78, 54]);
  return 18;
}

function factory(s: FB, x: number, yb: number, t: number): number {
  s.rect(x, yb - 7, 13, 8, [62, 56, 74]);
  s.rect(x, yb - 8, 13, 1, [110, 104, 124]);
  s.rect(x + 9, yb - 14, 2, 6, [62, 56, 74]);
  for (let i = 1; i < 12; i += 2)
    s.px(x + i, yb - 4, hash(x + i, 3, Math.floor(t / 18)) > 0.35 ? LIT : [40, 36, 50]);
  for (let j = 0; j < 5; j++)
    s.px(
      x + 10 + Math.round(Math.sin((t + j * 6) * 0.25) * 1.4) + j,
      yb - 16 - j * 2 - (t % 2),
      [188, 170, 164]
    );
  return 17;
}

function refinery(s: FB, x: number, yb: number, t: number): number {
  for (const o of [0, 7]) {
    s.rect(x + o, yb - 7, 5, 8, [150, 150, 160]);
    s.rect(x + o, yb - 7, 1, 8, [100, 100, 116]);
    s.rect(x + o + 1, yb - 8, 3, 1, [150, 150, 160]);
  }
  s.rect(x + 13, yb - 12, 1, 13, [60, 54, 66]);
  s.px(x + 13, yb - 13, hash(t, 1, 5) > 0.4 ? [255, 190, 90] : [240, 110, 60]);
  s.px(x + 13, yb - 14, [255, 240, 200]);
  return 18;
}

function lab(s: FB, x: number, yb: number): number {
  s.rect(x, yb - 5, 10, 6, [176, 184, 196]);
  s.rect(x, yb - 5, 10, 1, [226, 232, 240]);
  s.px(x + 5, yb - 6, [100, 104, 120]);
  s.px(x + 5, yb - 7, [100, 104, 120]);
  for (let i = 3; i < 8; i++) s.px(x + i, yb - 8, [226, 232, 240]);
  s.px(x + 2, yb - 9, [226, 232, 240]);
  s.px(x + 8, yb - 9, [226, 232, 240]);
  s.px(x + 2, yb - 2, LIT);
  s.px(x + 4, yb - 2, LIT);
  s.px(x + 7, yb - 2, [110, 220, 230]);
  return 14;
}

const BUILDINGS: Record<string, (s: FB, x: number, yb: number, t: number) => number> = {
  d: dome,
  m: mine,
  f: factory,
  r: refinery,
  l: lab
};

export function surfaceScene(s: FB, t: number): void {
  const W = s.w,
    H = s.h,
    hz = Math.floor(H * 0.6);
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) s.px(x, y, duskSky(x, y, hz));
  for (let j = -4; j <= 4; j++)
    for (let i = -4; i <= 4; i++) if (i * i + j * j < 18) s.px(W * 0.78 + i, hz * 0.4 + j, [250, 236, 206]);
  s.px(W * 0.2, hz * 0.25, [220, 200, 190]);
  s.px(W * 0.2 + 1, hz * 0.25, [220, 200, 190]);
  for (let x = 0; x < W; x++) {
    const r = hz - 5 - Math.floor(fbm(x * 0.03, 0, 5, 3) * 16);
    for (let y = r; y < hz; y++) s.px(x, y, [112, 60, 48]);
    for (let y = hz; y < H; y++) s.px(x, y, regolith(x, y));
  }
  const yb = hz + 9;
  let x = Math.max(6, Math.round((W - 190) / 2));
  for (const k of 'dmfdmrdflmd') x += BUILDINGS[k]!(s, x, yb, t);
  s.present();
}
