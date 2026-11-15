import { describe, expect, it } from 'vitest';
import { DAY } from '../clock';
import { Game } from '../state.svelte';
import './contacts';

describe('contacts', () => {
  it('moves contacts along their routes and leaves wrecks at rest', () => {
    const g = new Game();
    const hostile = g.contact('C-014')!,
      wreck = g.contact('C-009')!;
    const from = [hostile.x, hostile.y];
    g.advance(DAY / 4);
    expect([hostile.x, hostile.y]).not.toEqual(from);
    expect([wreck.x, wreck.y]).toEqual([150, -118]);
  });

  it('keeps every contact on its route over a long step', () => {
    const g = new Game();
    g.advance(90 * DAY);
    for (const c of g.world.contacts) {
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
      expect(Math.hypot(c.x, c.y)).toBeLessThan(260);
    }
  });

  it('logs when a hostile contact is picked up by a fleet', () => {
    const g = new Game();
    const hostile = g.contact('C-014')!,
      survey = g.fleet('survey')!;
    survey.orders.splice(0);
    survey.x = hostile.route[0]![0];
    survey.y = hostile.route[0]![1];
    for (let i = 0; i < 24; i++) g.advance(3600);
    expect(g.events.some((e) => e.text.startsWith('Survey group 1 picked up C-014'))).toBe(true);
    expect(g.events.find((e) => e.text.includes('picked up C-014'))?.subject).toEqual({
      kind: 'contact',
      id: 'C-014'
    });
  });
});
