import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { describe, expect, it } from 'vitest';
import { DAY } from '../clock';
import { Game } from '../state.svelte';
import { KM } from '../units';
import { FLEET_SENSOR } from './contacts';
import './contacts';

describe('contacts', () => {
  it('moves contacts along their routes and leaves wrecks at rest', () => {
    const g = withFixture(new Game());
    const hostile = g.contact('C-014')!,
      wreck = g.contact('C-009')!;
    const from = [hostile.x, hostile.y],
      rest = [wreck.x, wreck.y];
    g.advance(DAY / 4);
    const flown = Math.hypot(hostile.x - from[0]!, hostile.y - from[1]!),
      reach = hostile.speedKmS * KM * (DAY / 4);
    expect(flown).toBeGreaterThan(reach / 2);
    expect(flown).toBeLessThanOrEqual(reach * 1.000001);
    expect([wreck.x, wreck.y]).toEqual(rest);
  });

  it('keeps every contact on its route over a long step', () => {
    const g = withFixture(new Game());
    const reach = new Map(
      g.world.contacts.map((c) => [
        c.id,
        Math.max(Math.hypot(c.x, c.y), ...c.route.map(([x, y]) => Math.hypot(x, y)))
      ])
    );
    g.advance(90 * DAY);
    for (const c of g.world.contacts) {
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
      expect(Math.hypot(c.x, c.y)).toBeLessThanOrEqual(reach.get(c.id)! * 1.000001);
    }
  });

  it('logs when a hostile contact is picked up by a fleet', () => {
    const g = withFixture(new Game());
    const hostile = g.contact('C-014')!,
      survey = g.fleet('survey')!;
    const [tx, ty] = hostile.route[hostile.leg]!,
      d = Math.hypot(tx - hostile.x, ty - hostile.y),
      gap = FLEET_SENSOR * 1.5;
    survey.orders.splice(0);
    survey.x = hostile.x + ((tx - hostile.x) / d) * gap;
    survey.y = hostile.y + ((ty - hostile.y) / d) * gap;
    const hours = Math.ceil(gap / (hostile.speedKmS * KM) / 3600);
    for (let i = 0; i < hours; i++) g.advance(3600);
    expect(g.events.some((e) => e.text.startsWith('Survey group 1 picked up C-014'))).toBe(true);
    expect(g.events.find((e) => e.text.includes('picked up C-014'))?.subject).toEqual({
      kind: 'contact',
      id: 'C-014'
    });
  });
});
