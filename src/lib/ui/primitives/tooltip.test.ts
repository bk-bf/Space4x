import { describe, expect, it } from 'vitest';
import { dim, parseTip, placeAtPointer, placeBeside, tipText, warn } from './tooltip.ts';

const view = { w: 1000, h: 600 };
const tip = { w: 200, h: 80 };

describe('tooltip text', () => {
  it('takes the first line as the title and marks dimmed and warning lines', () => {
    expect(parseTip(tipText('Iron', 'Metals', dim('A metal.'), warn('Short'), false, ''))).toEqual({
      title: 'Iron',
      lines: [{ text: 'Metals' }, { text: 'A metal.', tone: 'dim' }, { text: 'Short', tone: 'warn' }]
    });
  });

  it('leaves a ready tip alone and drops empty extras', () => {
    const ready = { title: 'T', lines: [] };
    expect(parseTip(ready)).toBe(ready);
    expect(dim('')).toBe('');
    expect(tipText('A', ['x', false, 'y'])).toBe('A\nx\ny');
  });
});

describe('tooltip placement at the pointer', () => {
  it('sits below and right of the pointer', () => {
    expect(placeAtPointer({ x: 100, y: 100 }, tip, view)).toEqual({ x: 114, y: 116 });
  });

  it('flips left of the pointer at the right edge', () => {
    const at = placeAtPointer({ x: 950, y: 100 }, tip, view);
    expect(at.x).toBe(950 - tip.w - 10);
    expect(at.x + tip.w).toBeLessThanOrEqual(view.w);
  });

  it('flips above the pointer at the bottom edge', () => {
    const at = placeAtPointer({ x: 100, y: 580 }, tip, view);
    expect(at.y).toBe(580 - tip.h - 10);
    expect(at.y + tip.h).toBeLessThanOrEqual(view.h);
  });

  it('stays inside the window in every corner, even in a window smaller than the tip', () => {
    for (const w of [1000, 150])
      for (const h of [600, 60])
        for (const [x, y] of [
          [0, 0],
          [w, 0],
          [0, h],
          [w, h]
        ] as const) {
          const at = placeAtPointer({ x, y }, tip, { w, h });
          expect(at.x).toBeGreaterThanOrEqual(2);
          expect(at.y).toBeGreaterThanOrEqual(2);
          if (w >= tip.w + 4) expect(at.x + tip.w).toBeLessThanOrEqual(w);
          if (h >= tip.h + 4) expect(at.y + tip.h).toBeLessThanOrEqual(h);
        }
  });
});

describe('tooltip placement beside a focused element', () => {
  const box = { left: 100, top: 100, right: 150, bottom: 130 };

  it('sits below the element', () => {
    expect(placeBeside(box, tip, view)).toEqual({ x: 100, y: 134 });
  });

  it('sits above an element at the bottom of the window', () => {
    const at = placeBeside({ left: 100, top: 560, right: 150, bottom: 590 }, tip, view);
    expect(at.y + tip.h).toBeLessThanOrEqual(560);
  });

  it('is pulled in from the right edge', () => {
    const at = placeBeside({ left: 990, top: 100, right: 1000, bottom: 130 }, tip, view);
    expect(at.x + tip.w).toBeLessThanOrEqual(view.w);
  });
});
