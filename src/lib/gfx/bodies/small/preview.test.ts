import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encodePng } from '#lib/gfx/icons/png.ts';
import { smallBody } from './catalogue.ts';
import { drawSmallBody } from './render.ts';

const LIST: [string, string, number][] = (
  process.env.BODIES ??
  'bennu:carbonaceous:0.48,ryugu:carbonaceous:0.9,itokawa:stony:0.33,eros:stony:16.8,kleopatra:metallic:122,psyche:metallic:222,vesta:stony:523,ceres:carbonaceous:939,gaspra:stony:12,ida:stony:32,mathilde:carbonaceous:52,pallas:carbonaceous:513,apophis:stony:0.34,didymos:stony:0.78,arrokoth:stony:30,c67p:comet:4'
)
  .split(',')
  .map((s) => s.split(':') as [string, string, string])
  .map(([a, b, c]) => [a, b, Number(c)] as [string, string, number]);

test('preview', () => {
  const R = Number(process.env.R ?? 40);
  const cols = 4,
    cell = Math.ceil(R * 3.6) + 8,
    rows = Math.ceil(LIST.length / cols),
    w = cols * cell,
    h = rows * cell,
    d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 20;
    d[i + 1] = 17;
    d[i + 2] = 42;
    d[i + 3] = 255;
  }
  const t0 = performance.now();
  LIST.forEach(([id, type, dia], k) => {
    const b = smallBody({ id, name: id, type, diameter: dia });
    drawSmallBody(
      { w, h, d },
      b,
      (k % cols) * cell + cell / 2,
      Math.floor(k / cols) * cell + cell / 2,
      R,
      Number(process.env.STEP ?? 0)
    );
  });
  writeFileSync('/tmp/asteroid-art/prev/ms.txt', String(performance.now() - t0));
  const SC = 3;
  const w2 = w * SC,
    h2 = h * SC,
    o = new Uint8ClampedArray(w2 * h2 * 4);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      const a = (Math.floor(y / SC) * w + Math.floor(x / SC)) * 4,
        q = (y * w2 + x) * 4;
      o[q] = d[a]!;
      o[q + 1] = d[a + 1]!;
      o[q + 2] = d[a + 2]!;
      o[q + 3] = 255;
    }
  writeFileSync(process.env.OUT ?? '/tmp/asteroid-art/prev/sheet.png', encodePng(w2, h2, o));
}, 120000);
