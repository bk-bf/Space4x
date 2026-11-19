import { describe, expect, it } from 'vitest';
import { coverScale } from './backdrop';

describe('the menu backdrop scale', () => {
  it('draws the scene at two screen pixels a pixel when that covers the window', () => {
    expect(coverScale(970, 625, 1440, 900)).toBe(2);
    expect(coverScale(970, 625, 1100, 700)).toBe(2);
  });

  it('steps up by whole pixels to cover a larger window', () => {
    expect(coverScale(970, 625, 1920, 1080)).toBe(2);
    expect(coverScale(970, 625, 2560, 1440)).toBe(3);
    expect(coverScale(970, 625, 3840, 2160)).toBe(4);
  });
});
