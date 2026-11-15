import { describe, expect, it } from 'vitest';
import { DAY } from '../clock';
import {
  addOrder,
  clearOrders,
  moveOrder,
  orderEtas,
  orderLabel,
  orderTargets,
  removeOrder
} from '../orders';
import { bodyPosition } from '../orbits';
import { Game } from '../state.svelte';
import './fleets';

const texts = (g: Game) => g.events.map((e) => e.text);

describe('fleet orders', () => {
  it('flies a fleet toward its move target and parks it there on arrival', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    const mars = () => bodyPosition(g.body('mars')!, g.world.bodies);
    const gap = () => Math.hypot(survey.x - mars()[0], survey.y - mars()[1]);
    const start = gap();
    g.advance(3600);
    expect(gap()).toBeLessThan(start);
    expect(survey.note).toBe('To Mars');
    g.advance(2 * DAY);
    expect(survey.at).toBe('mars');
    expect(survey.note).toBe('Mars');
    expect(orderLabel(g, survey.orders[0]!)).toBe('Survey Mars');
    expect(survey.activity).toBe('Surveying');
    expect(texts(g)).toContain('Survey group 1 arrived at Mars.');
  });

  it('surveys for a time that grows with the root of the radius and then starts the next order', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    g.advance(2 * DAY);
    expect(g.body('mars')!.surveyed).toBe(true);
    g.body('mars')!.surveyed = false;
    g.advance(20 * DAY);
    expect(g.body('mars')!.surveyed).toBe(false);
    g.advance(20 * DAY);
    expect(g.body('mars')!.surveyed).toBe(true);
    expect(texts(g)).toContain('Survey group 1 completed the survey of Mars.');
    expect(survey.orders).toEqual([]);
    expect(survey.meters.fuel).toBe(100);
  });

  it('carries leftover time from one order into the next within one long step', () => {
    const g = new Game();
    const convoy = g.fleet('convoy')!;
    g.advance(10 * DAY);
    expect(texts(g)).toEqual(
      expect.arrayContaining([
        'Freight convoy loaded cargo at Earth.',
        'Freight convoy arrived at Mars.',
        'Freight convoy unloaded cargo from Earth at Mars.'
      ])
    );
    expect(convoy.at).toBe('mars');
    expect(convoy.cargo).toBeUndefined();
    const loaded = g.events.find((e) => e.text === 'Freight convoy loaded cargo at Earth.')!;
    const unloaded = g.events.find((e) => e.text.startsWith('Freight convoy unloaded'))!;
    expect(unloaded.at).toBeGreaterThan(loaded.at);
    expect(g.events.indexOf(unloaded)).toBeLessThan(g.events.indexOf(loaded));
    expect(unloaded.subject).toEqual({ kind: 'fleet', id: 'convoy' });
  });

  it('holds orbit until the order is removed, then runs the next one', () => {
    const g = new Game();
    const picket = g.fleet('picket')!;
    addOrder(picket, 'move', 'saturn');
    g.advance(30 * DAY);
    expect(picket.at).toBe('jupiter');
    expect(orderEtas(g, picket)).toEqual(['hold', '-']);
    removeOrder(picket, 0);
    g.advance(60 * DAY);
    expect(picket.at).toBe('saturn');
    expect(texts(g)).toContain('Jupiter picket arrived at Saturn.');
  });

  it('reorders, removes and clears queued orders', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    const labels = () => survey.orders.map((o) => orderLabel(g, o));
    expect(moveOrder(survey, 2, -1)).toBe(1);
    expect(labels()).toEqual(['Move to Mars', 'Refuel at Mars', 'Survey Mars']);
    expect(moveOrder(survey, 0, -1)).toBe(0);
    removeOrder(survey, 1);
    expect(labels()).toEqual(['Move to Mars', 'Survey Mars']);
    clearOrders(survey);
    expect(survey.orders).toEqual([]);
  });

  it('jumps a fleet through a jump point into the paired system', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    clearOrders(survey);
    addOrder(survey, 'move', 'sol-a');
    g.advance(30 * DAY);
    expect(survey.system).toBe('acen');
    expect(survey.note).toBe('Jump point A');
    expect(texts(g)).toContain('Survey group 1 jumped to Alpha Centauri.');
  });

  it('merges a fleet into the fleet it joins and passes the selection on', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    clearOrders(survey);
    addOrder(survey, 'join', 'picket');
    g.select({ kind: 'fleet', id: 'survey' });
    g.advance(30 * DAY);
    expect(g.fleet('survey')).toBeUndefined();
    expect(g.fleet('picket')!.ships.map((s) => s.name)).toContain('Halley');
    expect(g.selection).toEqual({ kind: 'fleet', id: 'picket' });
  });

  it('drops an order whose target is in another system and warns', () => {
    const g = new Game();
    const survey = g.fleet('survey')!;
    clearOrders(survey);
    addOrder(survey, 'survey', 'acen-3');
    g.advance(DAY);
    expect(survey.orders).toEqual([]);
    expect(g.events[0]).toMatchObject({ warn: true, text: expect.stringContaining('out of reach') });
  });

  it('offers cargo orders only to civilian fleets and only colonies as their targets', () => {
    const g = new Game();
    const colonies = g.world.bodies.filter((b) => b.system === 'sol' && b.colony).map((b) => b.name);
    expect(colonies).toContain('Luna');
    expect(orderTargets(g, g.fleet('convoy')!, 'load').map((t) => t.name)).toEqual(colonies);
    expect(orderTargets(g, g.fleet('survey')!, 'move').map((t) => t.name)).toContain('Jump point A');
    expect(orderTargets(g, g.fleet('survey')!, 'join').map((t) => t.name)).toEqual([
      'Freight convoy',
      'Jupiter picket'
    ]);
  });
});
