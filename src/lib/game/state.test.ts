import { afterEach, describe, expect, it } from 'vitest';
import { DAY, Game, START_TIME, registerSystem } from './index';
import { bodyPosition } from './orbits';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((undo) => undo()));

describe('Game', () => {
  it('starts paused on the one day step at the start date', () => {
    const g = new Game();
    expect(g.running).toBe(false);
    expect(g.step).toBe(DAY);
    expect(g.time).toBe(START_TIME);
    expect(g.elapsed).toBe(0);
  });

  it('keeps only the newest 500 events', () => {
    const g = new Game();
    for (let i = 0; i < 600; i++) g.log('ship', `event ${i}`);
    expect(g.events).toHaveLength(500);
    expect(g.events[0]?.text).toBe('event 599');
  });

  it('advances game time by the given seconds', () => {
    const g = new Game();
    g.advance(3600);
    expect(g.time).toBe(START_TIME + 3600_000);
    expect(g.elapsed).toBe(3600);
  });

  it('ignores zero, negative and non-numeric advances', () => {
    const g = new Game();
    g.advance(0);
    g.advance(-5);
    g.advance(Number.NaN);
    expect(g.time).toBe(START_TIME);
  });

  it('single-steps when a step is picked while paused', () => {
    const g = new Game();
    g.setStep(300);
    expect(g.step).toBe(300);
    expect(g.time).toBe(START_TIME + 300_000);
  });

  it('only changes the step when a step is picked while running', () => {
    const g = new Game();
    g.run();
    g.setStep(300);
    expect(g.step).toBe(300);
    expect(g.time).toBe(START_TIME);
  });

  it('toggles between running and paused', () => {
    const g = new Game();
    g.toggleRunning();
    expect(g.running).toBe(true);
    g.toggleRunning();
    expect(g.running).toBe(false);
    g.run();
    g.pause();
    expect(g.running).toBe(false);
  });

  it('calls every registered system with the game and the elapsed seconds', () => {
    const g = new Game();
    const calls: [Game, number][] = [];
    cleanups.push(registerSystem('probe', (game, dt) => calls.push([game, dt])));
    g.advance(120);
    expect(calls).toEqual([[g, 120]]);
  });

  it('replaces a system registered again under the same name and stops calling it once removed', () => {
    const g = new Game();
    const seen: string[] = [];
    registerSystem('probe', () => seen.push('first'));
    const undo = registerSystem('probe', () => seen.push('second'));
    g.advance(1);
    undo();
    g.advance(1);
    expect(seen).toEqual(['second']);
  });

  it('moves bodies along their orbits as time passes', () => {
    const g = new Game();
    const before = bodyPosition(g.body('earth')!, g.world.bodies);
    g.advance(30 * DAY);
    const after = bodyPosition(g.body('earth')!, g.world.bodies);
    expect(after).not.toEqual(before);
    expect(Math.hypot(...after) / g.body('earth')!.orbit).toBeCloseTo(1, 9);
  });

  it('records events at the current game time, newest first', () => {
    const g = new Game();
    g.advance(60);
    g.log('flask', 'Test finished.', true);
    expect(g.events[0]).toEqual({
      at: START_TIME + 60_000,
      category: 'flask',
      text: 'Test finished.',
      warn: true
    });
  });

  it('files an event logged with an earlier time below the newer ones', () => {
    const g = new Game();
    g.advance(3600);
    g.log('ship', 'Later.');
    g.log('ship', 'Earlier.', false, { at: START_TIME + 60_000, subject: { kind: 'fleet', id: 'survey' } });
    expect(g.events[0]?.text).toBe('Later.');
    expect(g.events[1]).toEqual({
      at: START_TIME + 60_000,
      category: 'ship',
      text: 'Earlier.',
      subject: { kind: 'fleet', id: 'survey' }
    });
  });
});
