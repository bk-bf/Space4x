import { describe, expect, it } from 'vitest';
import { Z_MAX, Z_MIN, fitAll, toScreen, toWorld, wheelFactor, zoomAbout } from './camera.ts';
import { SYSTEMS } from './stars.ts';

const W = 540,
  H = 400;

describe('camera', () => {
  it('maps a world point to the screen and back', () => {
    const c = { x: 16, y: -4, z: 2.5 };
    const [sx, sy] = toScreen(c, W, H, 40, 12);
    const [wx, wy] = toWorld(c, W, H, sx, sy);
    expect(wx).toBeCloseTo(40);
    expect(wy).toBeCloseTo(12);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const c = { x: 16, y: 0, z: 2 };
    for (const factor of [1.17, 0.85, 2, 0.3]) {
      const before = toWorld(c, W, H, 123, 310);
      const next = zoomAbout(c, W, H, 123, 310, factor);
      const after = toWorld(next, W, H, 123, 310);
      expect(after[0]).toBeCloseTo(before[0], 6);
      expect(after[1]).toBeCloseTo(before[1], 6);
    }
  });

  it('zooms in for a wheel up and out for a wheel down, smoothly in between', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-10)).toBeGreaterThan(1);
    expect(wheelFactor(-10)).toBeLessThan(wheelFactor(-100));
    expect(wheelFactor(-3, 1)).toBeCloseTo(wheelFactor(-99, 0));
  });

  it('clamps the zoom and does not move the centre once it is clamped', () => {
    let c = { x: 0, y: 0, z: 2 };
    for (let i = 0; i < 80; i++) c = zoomAbout(c, W, H, 200, 100, 1.5);
    expect(c.z).toBe(Z_MAX);
    for (let i = 0; i < 80; i++) c = zoomAbout(c, W, H, 200, 100, 0.5);
    expect(c.z).toBe(Z_MIN);
  });

  it('fits every system in the view', () => {
    const c = fitAll(SYSTEMS, W, H);
    for (const s of SYSTEMS) {
      const [x, y] = toScreen(c, W, H, s.x, s.y);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(W);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(H);
    }
  });

  it('has one unsurveyed system with unknown facts and links only between known ids', () => {
    expect(SYSTEMS.filter((s) => s.unknown)).toHaveLength(1);
    expect(SYSTEMS.find((s) => s.unknown)!.counts).toBeUndefined();
    expect(new Set(SYSTEMS.map((s) => s.id)).size).toBe(SYSTEMS.length);
  });
});
