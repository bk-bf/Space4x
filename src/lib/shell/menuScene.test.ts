import { describe, expect, it } from 'vitest';
import { fitStill } from './menuScene';

describe('the menu scene fit', () => {
  it('draws the still at the mockup scale of two screen pixels a pixel when that covers the window', () => {
    expect(fitStill(720, 450, 1440, 900)).toEqual({ scale: 2, w: 720, h: 450, ox: 0, oy: 0 });
    expect(fitStill(720, 450, 1440, 870)).toEqual({ scale: 2, w: 720, h: 435, ox: 0, oy: -7 });
    expect(fitStill(720, 450, 1100, 700).scale).toBe(2);
  });

  it('steps up by whole pixels to cover a larger window, centred', () => {
    expect(fitStill(720, 450, 1920, 1080)).toEqual({ scale: 3, w: 640, h: 360, ox: -40, oy: -45 });
    expect(fitStill(720, 450, 2560, 1600).scale).toBe(4);
  });

  it('never leaves part of the window uncovered', () => {
    for (const [vw, vh] of [
      [1101, 701],
      [1600, 1000],
      [3840, 2160],
      [1440, 1200]
    ] as const) {
      const f = fitStill(720, 450, vw, vh);
      expect(f.w * f.scale).toBeGreaterThanOrEqual(vw);
      expect(f.h * f.scale).toBeGreaterThanOrEqual(vh);
      expect(f.ox).toBeLessThanOrEqual(0);
      expect(f.oy).toBeLessThanOrEqual(0);
      expect(f.w - f.ox).toBeLessThanOrEqual(720);
      expect(f.h - f.oy).toBeLessThanOrEqual(450);
    }
  });
});
