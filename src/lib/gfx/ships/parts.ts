import type { Surface } from '../framebuffer';
import { hash } from '../math';
import type { RGB } from '../palette';
import { ARM, C, F1, F2, F3, type HullColors } from './colors';
import type { AttachmentKey, BowKey, CoreKey, SternKey } from './specs';

export type PartSize = readonly [width: number, halfHeight: number, round?: boolean];
export type PartDraw = (fb: Surface, x: number, cy: number, t: number, n?: number) => PartSize;
export type Plot = (dx: number, k: number, c: RGB) => void;
export type AttachmentDraw = (P: Plot, t: number, n: number) => void;

function sec(fb: Surface, x: number, w: number, cy: number, a = 3, b = 3, K: HullColors = C): void {
  for (let i = 0; i < w; i++) {
    fb.px(x + i, cy - a, K.o);
    fb.px(x + i, cy + b, K.o);
    fb.px(x + i, cy - a + 1, K.H);
    fb.px(x + i, cy + b - 1, K.d);
    for (let y = cy - a + 2; y < cy + b - 1; y++) fb.px(x + i, y, K.h);
  }
  for (let y = cy - a + 1; y < cy + b; y++) fb.px(x, y, K.d);
}

function column(fb: Surface, x: number, cy: number, a: number, b: number, K: HullColors): void {
  for (let y = cy - a + 2; y < cy + b - 1; y++) fb.px(x, y, K.h);
  fb.px(x, cy - a + 1, K.H);
  fb.px(x, cy + b - 1, K.d);
  fb.px(x, cy - a, K.o);
  fb.px(x, cy + b, K.o);
}

export const CORE = {
  hull(fb, x, cy) {
    sec(fb, x, 8, cy);
    return [8, 3];
  },
  crew(fb, x, cy, t) {
    sec(fb, x, 8, cy);
    for (const i of [2, 4, 6]) fb.px(x + i, cy - 1, hash(i, x, Math.floor(t / 30)) > 0.3 ? C.y : C.w);
    fb.px(x + 3, cy + 1, C.w);
    fb.px(x + 5, cy + 1, C.w);
    return [8, 3];
  },
  reactor(fb, x, cy, t) {
    sec(fb, x, 6, cy);
    fb.rect(x + 2, cy - 1, 2, 3, (t >> 2) & 1 ? C.w : [70, 170, 190]);
    return [6, 3];
  },
  fuel(fb, x, cy) {
    sec(fb, x, 8, cy);
    for (let i = 1; i < 7; i++) {
      fb.px(x + i, cy - 4, C.o);
      fb.px(x + i, cy - 3, C.H);
      fb.px(x + i, cy + 4, C.o);
      fb.px(x + i, cy + 3, C.d);
    }
    for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + 3, y, C.y);
    return [8, 4, true];
  },
  armor(fb, x, cy) {
    sec(fb, x, 8, cy, 5, 5, ARM);
    for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + 4, y, ARM.d);
    for (let i = 1; i < 8; i++) fb.px(x + i, cy, ARM.d);
    fb.px(x + 2, cy - 3, ARM.H);
    fb.px(x + 6, cy + 2, ARM.H);
    return [8, 5];
  },
  truss(fb, x, cy) {
    for (let i = 0; i < 8; i++) {
      fb.px(x + i, cy - 2, C.h);
      fb.px(x + i, cy + 2, C.d);
      fb.px(x + i, cy + [-1, 0, 1, 0][i % 4]!, C.d);
    }
    return [8, 2];
  },
  tank(fb, x, cy) {
    for (let i = 0; i < 13; i++) fb.px(x + i, cy, C.d);
    for (let j = -6; j <= 6; j++)
      for (let i = -6; i <= 6; i++) {
        const d = i * i + j * j;
        if (d > 38) continue;
        fb.px(
          x + 6 + i,
          cy + j,
          d > 27
            ? C.o
            : j === 1
              ? [214, 160, 70]
              : i + j < -3
                ? [234, 228, 216]
                : i + j > 4
                  ? [128, 120, 126]
                  : [190, 182, 172]
        );
      }
    return [13, 6, true];
  },
  ring(fb, x, cy, t) {
    sec(fb, x, 6, cy);
    for (let y = cy - 12; y <= cy + 12; y++) {
      const end = Math.abs(y - cy) === 12;
      fb.px(x + 1, y, C.o);
      fb.px(x + 4, y, C.o);
      fb.px(x + 2, y, end ? C.o : C.H);
      fb.px(
        x + 3,
        y,
        end ? C.o : (y - cy + 12) % 3 === 1 ? (hash(y, x, Math.floor(t / 40)) > 0.25 ? C.y : C.w) : C.h
      );
    }
    return [6, 12, true];
  },
  hangar(fb, x, cy, t) {
    sec(fb, x, 14, cy, 5, 5, ARM);
    fb.rect(x + 2, cy - 2, 10, 5, C.e);
    for (let i = 3; i < 11; i += 2) fb.px(x + i, cy - 2, C.y);
    fb.px(x + 5, cy + 1, C.H);
    fb.px(x + 6, cy + 1, C.H);
    fb.px(x + 7, cy + 1, C.h);
    fb.px(x + 6, cy, C.h);
    fb.px(x + 4, cy + 1, (t >> 2) & 1 ? F2 : F3);
    return [14, 5];
  }
} satisfies Record<CoreKey, PartDraw>;

export const STERN = {
  engines(fb, x, cy, t, n = 2) {
    const a = 2 + n;
    sec(fb, x + 2, 6, cy, a, a);
    for (let y = cy - a; y <= cy + a; y++) fb.px(x + 2, y, C.o);
    for (let k = 0; k < n; k++) {
      const ny = cy + Math.round((k - (n - 1) / 2) * (n > 1 ? (2 * a - 4) / (n - 1) : 0));
      for (let j = -1; j <= 1; j++) {
        fb.px(x + 1, ny + j, C.e);
        fb.px(x, ny + j, C.o);
      }
      const len = 2 + ((hash(t, k, 3) * 3) | 0);
      for (let j = 0; j <= len; j++) fb.px(x - j, ny, j < 2 ? F1 : j < len ? F2 : F3);
      fb.px(x - 1, ny - 1, F2);
      fb.px(x - 1, ny + 1, F2);
    }
    return [8, a];
  },
  big(fb, x, cy, t) {
    sec(fb, x + 6, 6, cy, 4, 4);
    for (let y = cy - 4; y <= cy + 4; y++) fb.px(x + 6, y, C.o);
    for (let i = 0; i < 6; i++) {
      const hh = 5 - Math.floor(i * 0.5);
      for (let y = cy - hh; y <= cy + hh; y++)
        fb.px(x + i, y, Math.abs(y - cy) === hh ? C.o : i < 2 ? [120, 60, 50] : C.e);
    }
    const len = 5 + ((hash(t, 1, 8) * 3) | 0);
    for (let j = 1; j <= len; j++) {
      const hw = Math.max(0, 3 - Math.floor(j / 2));
      for (let y = -hw; y <= hw; y++)
        fb.px(x - j, cy + y, j < 3 && Math.abs(y) < 2 ? F1 : j < len - 1 && Math.abs(y) < hw ? F2 : F3);
    }
    return [12, 4];
  }
} satisfies Record<SternKey, PartDraw>;

export const BOW = {
  bridge(fb, x, cy) {
    for (let i = 0; i < 11; i++)
      column(
        fb,
        x + i,
        cy,
        3 - Math.max(0, Math.floor((i - 3) / 2.7)),
        3 - Math.max(0, Math.floor((i - 6) / 2)),
        C
      );
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x, y, C.d);
    fb.px(x + 11, cy, C.o);
    fb.px(x + 5, cy - 1, C.w);
    fb.px(x + 6, cy - 1, C.w);
    fb.px(x + 8, cy, C.w);
    return [12, 3];
  },
  blunt(fb, x, cy) {
    sec(fb, x, 4, cy);
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x + 4, y, C.o);
    fb.px(x + 2, cy - 1, C.w);
    fb.px(x + 2, cy, C.w);
    return [5, 3];
  },
  gun(fb, x, cy, t) {
    for (let i = 0; i < 5; i++) column(fb, x + i, cy, 3 - Math.floor(i / 2), 3 - Math.floor(i / 2), C);
    for (let i = 5; i < 15; i++) {
      fb.px(x + i, cy - 1, C.o);
      fb.px(x + i, cy, i % 3 ? C.h : C.d);
      fb.px(x + i, cy + 1, C.o);
    }
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x + 15, y, C.o);
    fb.px(x + 16, cy, (t >> 3) & 1 ? C.w : C.d);
    return [17, 3];
  },
  prow(fb, x, cy) {
    for (let i = 0; i < 10; i++) column(fb, x + i, cy, 5 - Math.floor(i / 2), 5 - Math.floor(i / 3), ARM);
    for (let y = cy - 4; y <= cy + 4; y++) fb.px(x, y, ARM.d);
    fb.px(x + 10, cy, C.o);
    fb.px(x + 10, cy + 1, C.o);
    fb.px(x + 3, cy - 2, C.w);
    fb.px(x + 4, cy - 2, C.w);
    return [11, 5];
  },
  dock(fb, x, cy) {
    for (const i of [0, 3]) for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + i, y, C.o);
    for (const i of [1, 2]) {
      fb.px(x + i, cy - 2, C.o);
      fb.px(x + i, cy + 2, C.o);
      for (let y = cy - 1; y <= cy + 1; y++) fb.px(x + i, y, y === cy ? C.y : C.h);
    }
    return [4, 3, true];
  }
} satisfies Record<BowKey, PartDraw>;

export const ATT = {
  turret(P) {
    for (let i = 2; i < 5; i++) {
      P(i, 1, C.d);
      P(i, 2, C.h);
    }
    P(3, 3, C.H);
    P(3, 2, C.r);
    for (let i = 5; i < 9; i++) P(i, 2, C.o);
  },
  launcher(P) {
    for (let k = 1; k < 4; k++)
      for (let i = 1; i < 7; i++) P(i, k, i === 1 || i === 6 || k === 3 ? C.o : C.d);
    P(2, 2, C.r);
    P(4, 2, C.r);
  },
  dish(P, t) {
    P(3, 1, C.h);
    P(3, 2, C.h);
    for (let i = 1; i < 6; i++) P(i, 3, C.H);
    P(1, 4, C.H);
    P(5, 4, C.H);
    P(3, 4, (t >> 3) & 1 ? C.r : C.d);
  },
  antenna(P, t) {
    for (let k = 1; k < 7; k++) P(3, k, C.d);
    P(2, 4, C.d);
    P(4, 4, C.d);
    P(3, 7, (t >> 3) & 1 ? C.r : C.d);
  },
  tower(P) {
    for (let k = 1; k < 3; k++) for (let i = 1; i < 7; i++) P(i, k, i === 1 || i === 6 ? C.o : C.h);
    for (let k = 3; k < 5; k++)
      for (let i = 2; i < 6; i++) P(i, k, i === 2 || i === 5 ? C.o : k === 3 ? C.w : C.h);
    P(1, 3, C.o);
    P(6, 3, C.o);
    for (let i = 2; i < 6; i++) P(i, 5, C.o);
    P(4, 6, C.d);
    P(4, 7, C.d);
  },
  cargo(P, _t, n) {
    for (let l = 0; l < n; l++)
      for (let k = 1; k < 4; k++)
        for (let i = 0; i < 8; i++) {
          P(
            i,
            l * 3 + k,
            i === 0 || i === 7
              ? C.o
              : i < 4 !== !!(l & 1)
                ? k === 3
                  ? C.c
                  : [140, 80, 52]
                : k === 3
                  ? C.C
                  : [54, 116, 120]
          );
        }
    for (let i = 0; i < 8; i++) P(i, n * 3 + 1, C.o);
  },
  radiator(P) {
    for (let k = 1; k < 11; k++)
      for (let i = 2; i < 6; i++)
        P(i, k, i === 2 || i === 5 || k === 10 ? C.o : k % 2 ? [214, 96, 60] : [120, 50, 44]);
  },
  solar(P) {
    P(3, 1, C.d);
    P(4, 1, C.d);
    for (let k = 2; k < 14; k++)
      for (let i = 0; i < 8; i++) {
        P(
          i,
          k,
          i === 0 || i === 7 || k === 2 || k === 13
            ? [96, 136, 214]
            : (k - 2) % 4 === 0 || i % 4 === 0
              ? [60, 96, 180]
              : [34, 56, 128]
        );
      }
  },
  pod(P, t) {
    P(3, 1, C.d);
    P(4, 1, C.d);
    for (let i = 1; i < 7; i++) {
      P(i, 2, C.o);
      P(i, 4, C.o);
      P(i, 3, C.h);
    }
    P(0, 3, C.e);
    P(7, 3, C.o);
    P(-1, 3, F1);
    P(-2, 3, hash(t, 5, 5) > 0.5 ? F2 : F3);
  },
  fin(P) {
    for (let k = 1; k < 6; k++) for (let i = k; i < 6; i++) P(i, k, i === k || i === 5 ? C.o : C.d);
  }
} satisfies Record<AttachmentKey, AttachmentDraw>;
