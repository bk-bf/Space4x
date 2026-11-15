import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAY, Game, START_TIME, startLoop } from './index';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('startLoop', () => {
  it('advances one step of game time per real second while running', () => {
    const g = new Game();
    g.run();
    const stop = startLoop(g, () => {}, { isHidden: () => false });
    vi.advanceTimersByTime(1000);
    stop();
    expect(g.time).toBeCloseTo(START_TIME + DAY * 1000, -1);
  });

  it('keeps game time still while paused but still ticks the display', () => {
    const g = new Game();
    let ticks = 0;
    const stop = startLoop(g, () => ticks++, { isHidden: () => false });
    vi.advanceTimersByTime(1000);
    stop();
    expect(g.time).toBe(START_TIME);
    expect(ticks).toBe(10);
  });

  it('does nothing while the page is hidden', () => {
    const g = new Game();
    g.run();
    let ticks = 0;
    const stop = startLoop(g, () => ticks++, { isHidden: () => true });
    vi.advanceTimersByTime(1000);
    stop();
    expect(g.time).toBe(START_TIME);
    expect(ticks).toBe(0);
  });

  it('stops when the returned function is called', () => {
    const g = new Game();
    g.run();
    const stop = startLoop(g, () => {}, { isHidden: () => false });
    stop();
    vi.advanceTimersByTime(1000);
    expect(g.time).toBe(START_TIME);
  });
});
