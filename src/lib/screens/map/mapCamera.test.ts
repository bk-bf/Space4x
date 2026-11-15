import { describe, expect, it } from 'vitest';
import { FOCUS_FILL, L_MIN, MapCamera, tierOf, WHEEL_STEP, type Frame, type Locate } from './mapCamera';

const FRAME: Frame = { w: 400, h: 280, ox: 260, oy: 150 };
const EARTH = { x: 1.2e11, y: -8e10, radius: 6.371e6 };
const locate: Locate = (t) => (t === 'body:earth' ? EARTH : undefined);

function settle(c: MapCamera, seconds = 3): void {
  for (let i = 0; i < seconds * 60; i++) c.step(1 / 60, locate, FRAME);
}

function camera(L: number): MapCamera {
  const c = new MapCamera();
  c.max = 12;
  c.place(L, [3e10, -2e10]);
  c.step(0, locate, FRAME);
  return c;
}

describe('map camera', () => {
  it('keeps the world point under the cursor fixed while the zoom eases in and out', () => {
    for (const notches of [-3, 2.5]) {
      const c = camera(9),
        [mx, my] = [355, 61],
        before = c.toWorld(mx, my);
      c.zoom(notches, mx, my);
      for (let i = 0; i < 90; i++) {
        c.step(1 / 60, locate, FRAME);
        const [x, y] = c.toWorld(mx, my);
        expect(Math.abs(x - before[0]) / c.s).toBeLessThan(1e-6);
        expect(Math.abs(y - before[1]) / c.s).toBeLessThan(1e-6);
      }
      expect(c.L).toBeCloseTo(9 + notches * WHEEL_STEP, 12);
    }
  });

  it('eases toward the target and lands on it exactly', () => {
    const c = camera(8);
    c.zoomCentre(-2);
    c.step(1 / 60, locate, FRAME);
    expect(c.L).toBeLessThan(8);
    expect(c.L).toBeGreaterThan(8 - 2 * WHEEL_STEP);
    expect(c.moving()).toBe(true);
    settle(c, 1);
    expect(c.L).toBe(8 - 2 * WHEEL_STEP);
    expect(c.moving()).toBe(false);
  });

  it('clamps the zoom between its limits', () => {
    const c = camera(0);
    for (let i = 0; i < 40; i++) c.zoomCentre(-1.5);
    settle(c);
    expect(c.L).toBe(L_MIN);
    for (let i = 0; i < 400; i++) c.zoomCentre(1.5);
    settle(c);
    expect(c.L).toBe(c.max);
  });

  it('stops zooming into a focused body before its disc overfills the view', () => {
    const c = camera(6);
    c.flyTo(5, 'body:earth');
    settle(c);
    expect(c.focus).toBe('body:earth');
    for (let i = 0; i < 60; i++) c.zoomCentre(-1.5);
    settle(c);
    const cap = Math.log10(EARTH.radius / (FRAME.h * FOCUS_FILL));
    expect(c.L).toBeCloseTo(cap, 9);
    expect(EARTH.radius / c.s).toBeCloseTo(FRAME.h * FOCUS_FILL, 6);
  });

  it('flies to a preset and follows its target afterwards', () => {
    const c = camera(10);
    c.flyTo(4.5, 'body:earth');
    c.step(1, locate, FRAME);
    expect(c.focus).toBeNull();
    settle(c);
    expect(c.focus).toBe('body:earth');
    expect(c.L).toBe(4.5);
    EARTH.x += 1e7;
    c.step(1 / 60, locate, FRAME);
    expect(c.centre).toEqual([EARTH.x, EARTH.y]);
  });

  it('snaps the focus to the object under the cursor on a zoom in', () => {
    const c = camera(9);
    c.zoom(-1, 10, 10, 'body:earth');
    settle(c, 1);
    expect(c.focus).toBe('body:earth');
    expect(c.centre).toEqual([EARTH.x, EARTH.y]);
  });

  it('pans by the dragged distance and lets go of the focus', () => {
    const c = camera(9);
    c.flyTo(9, 'body:earth');
    settle(c);
    const [x0, y0] = c.centre;
    c.down(100, 100);
    expect(c.move(101, 101)).toBe(false);
    expect(c.move(160, 70)).toBe(true);
    expect(c.up()).toBe(false);
    expect(c.focus).toBeNull();
    expect(c.centre[0]).toBeCloseTo(x0 - 60 * c.s, -3);
    expect(c.centre[1]).toBeCloseTo(y0 + 30 * c.s, -3);
    c.down(5, 5);
    expect(c.up()).toBe(true);
  });

  it('names the level of detail by the metres per pixel', () => {
    expect(tierOf(10)).toBe('far');
    expect(tierOf(4)).toBe('mid');
    expect(tierOf(0.5)).toBe('near');
  });
});
