import { dith } from '#lib/gfx/noise.ts';
import { PAL, shade, type RGB } from '#lib/gfx/palette.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';

export const PORTRAIT_W = 60;
export const PORTRAIT_H = 64;

const SKIN: readonly RGB[] = [
  [232, 190, 160],
  [204, 150, 112],
  [150, 100, 72],
  [244, 214, 190]
];
const HAIR: readonly RGB[] = [
  [40, 30, 30],
  [110, 70, 40],
  [190, 170, 150],
  [20, 20, 28],
  [150, 60, 40]
];
const UNIFORM: RGB = [44, 54, 104];
const CX = 30;

export function drawPortrait(f: FB, seed: number, pips: number): void {
  const skin = SKIN[seed % 4]!,
    hair = HAIR[(seed >> 1) % 5]!,
    style = seed % 3;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) f.px(x, y, dith(x, y) < (y / f.h) * 0.9 ? [42, 36, 88] : [30, 26, 62]);
  for (let y = 46; y < f.h; y++) {
    const hw = Math.min(26, 8 + (y - 46) * 3);
    for (let x = CX - hw; x <= CX + hw; x++)
      f.px(
        x,
        y,
        x === CX - hw || x === CX + hw || y === 46
          ? [20, 24, 50]
          : (x + y) % 7 === 0
            ? [58, 70, 128]
            : UNIFORM
      );
  }
  for (let i = -3; i <= 3; i++) f.px(CX + i, 47 + Math.abs(i), [230, 230, 240]);
  for (let i = 0; i < pips; i++) f.rect(CX - 20 + i * 4, 55, 2, 2, PAL.sel);
  f.rect(CX - 4, 39, 8, 8, shade(skin, 0.78));
  for (let j = -14; j <= 14; j++)
    for (let i = -11; i <= 11; i++) {
      if ((i * i) / 121 + (j * j) / 196 > 1) continue;
      f.px(
        CX + i,
        26 + j,
        j < -7 + Math.abs(i) * 0.3
          ? hair
          : i > 8 || (i > 4 && dith(CX + i, 26 + j) > 0.45)
            ? shade(skin, 0.78)
            : skin
      );
    }
  if (style === 1)
    for (let j = -9; j <= 13; j++) for (const i of [-12, -11, 11, 12]) f.px(CX + i, 26 + j, hair);
  if (style === 2) {
    f.rect(CX - 12, 9, 25, 5, [26, 30, 60]);
    f.rect(CX - 13, 14, 27, 1, [14, 14, 26]);
    f.rect(CX - 1, 10, 3, 2, PAL.sel);
  }
  f.rect(CX - 6, 25, 2, 2, [30, 26, 40]);
  f.rect(CX + 4, 25, 2, 2, [30, 26, 40]);
  for (let i = 0; i < 4; i++) {
    f.px(CX - 7 + i, 22, hair);
    f.px(CX + 3 + i, 22, hair);
  }
  for (let j = 29; j < 32; j++) f.px(CX, j, shade(skin, 0.7));
  for (let i = -2; i <= 2; i++) f.px(CX + i, 35, [150, 70, 70]);
  f.present();
}
