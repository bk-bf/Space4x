import type { Surface } from './framebuffer';
import { dith, noise3 } from './noise';
import type { RGB } from './palette';

export interface SunTint {
  core: readonly [RGB, RGB, RGB];
  corona: readonly [RGB, RGB];
}

const YELLOW: SunTint = {
  core: [
    [255, 250, 224],
    [255, 216, 112],
    [246, 156, 60]
  ],
  corona: [
    [230, 120, 50],
    [150, 62, 44]
  ]
};

export function sun(fb: Surface, cx: number, cy: number, R: number, t: number, tint: SunTint = YELLOW): void {
  const E = R + 8,
    [c0, c1, c2] = tint.core,
    [k0, k1] = tint.corona;
  for (let j = -E; j <= E; j++)
    for (let i = -E; i <= E; i++) {
      const d = Math.hypot(i, j),
        th = dith(cx + i, cy + j);
      if (d <= R + 0.3) {
        const v = d / R;
        fb.px(cx + i, cy + j, v + th * 0.35 < 0.55 ? c0 : v + th * 0.3 < 0.92 ? c1 : c2);
      } else if (d < E) {
        const s = (1 - (d - R) / 8) * 0.9 + (noise3(i * 0.35, j * 0.35, t * 0.15) - 0.5) * 0.7;
        if (s > th + 0.25) fb.px(cx + i, cy + j, s > th + 0.6 ? k0 : k1);
      }
    }
}
