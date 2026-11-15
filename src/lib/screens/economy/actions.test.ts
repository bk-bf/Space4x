import { beforeEach, describe, expect, it } from 'vitest';
import { game } from '#lib/game/index.ts';
import {
  addOrder,
  addSlipway,
  cancelTask,
  expandYard,
  moveOrder,
  pauseOrder,
  removeOrder,
  retoolYard,
  setShare,
  startBuild,
  toggleSubsidy
} from './actions.ts';
import { buildClass } from './catalog.ts';
import { economy, resetEconomy, selectedColony } from './state.svelte.ts';
import './system.ts';

beforeEach(() => {
  resetEconomy();
  game.events.length = 0;
});

describe('construction queue actions', () => {
  it('adds an order with a clamped quantity and share', () => {
    const mars = selectedColony();
    addOrder(mars, 'factory', 0, 500);
    const added = mars.queue.at(-1)!;
    expect(added).toMatchObject({ item: 'factory', quantity: 1, ordered: 1, share: 100, paused: false });
  });

  it('moves an order up and down and ignores moves past either end', () => {
    const mars = selectedColony();
    const [first, second] = mars.queue.map((o) => o.id);
    moveOrder(mars, second!, -1);
    expect(mars.queue.map((o) => o.id).slice(0, 2)).toEqual([second, first]);
    moveOrder(mars, second!, -1);
    expect(mars.queue[0]!.id).toBe(second);
    const last = mars.queue.at(-1)!.id;
    moveOrder(mars, last, 1);
    expect(mars.queue.at(-1)!.id).toBe(last);
  });

  it('pauses and resumes an order, and removing it frees its share', () => {
    const mars = selectedColony();
    const id = mars.queue[0]!.id;
    pauseOrder(mars, id);
    expect(mars.queue[0]!.paused).toBe(true);
    pauseOrder(mars, id);
    expect(mars.queue[0]!.paused).toBe(false);
    removeOrder(mars, id);
    expect(mars.queue.some((o) => o.id === id)).toBe(false);
  });

  it('changes the share of an order within 1 to 100', () => {
    const mars = selectedColony();
    setShare(mars, mars.queue[0]!.id, 65);
    expect(mars.queue[0]!.share).toBe(65);
    setShare(mars, mars.queue[0]!.id, -4);
    expect(mars.queue[0]!.share).toBe(1);
  });
});

describe('shipyard actions', () => {
  const luna = () => economy.colonies.find((c) => c.id === 'luna')!;

  it('lays down the tooled class on a free slipway and logs it', () => {
    const yard = luna().yards[0]!;
    startBuild(luna(), yard.id, 2, 'atlas');
    expect(yard.slipways[1]!.build).toMatchObject({
      classId: 'atlas',
      done: 0,
      total: buildClass('atlas').bp
    });
    expect(game.events[0]!.text).toBe('Luna yard 1 laid down an Atlas bulk freighter.');
  });

  it('refuses a class the yard is not tooled for, a busy slipway and a class that is too big', () => {
    const yard = luna().yards[0]!;
    startBuild(luna(), yard.id, 2, 'mule');
    expect(yard.slipways[1]!.build).toBeNull();
    startBuild(luna(), yard.id, 1, 'atlas');
    expect(yard.slipways[0]!.build!.done).toBe(876);
    const naval = luna().yards[1]!;
    startBuild(luna(), naval.id, 1, 'atlas');
    expect(naval.slipways[0]!.build!.classId).toBe('pathfinder');
  });

  it('queues timed tasks for a slipway and a capacity step', () => {
    const yard = luna().yards[0]!;
    addSlipway(luna(), yard.id);
    expandYard(luna(), yard.id);
    expect(yard.tasks.map((t) => t.kind)).toEqual(['slipway', 'capacity']);
    expect(yard.tasks[0]!.total).toBe(500 + 40_000 * 0.04);
    cancelTask(luna(), yard.id, yard.tasks[0]!.id);
    expect(yard.tasks.map((t) => t.kind)).toEqual(['capacity']);
  });

  it('retools only an idle yard, only to a class it can build, and puts the retool first', () => {
    const yard = luna().yards[0]!;
    addSlipway(luna(), yard.id);
    retoolYard(luna(), yard.id, 'ark');
    expect(yard.tasks).toHaveLength(1);
    yard.slipways[0]!.build = null;
    retoolYard(luna(), yard.id, 'lancer');
    expect(yard.tasks).toHaveLength(1);
    retoolYard(luna(), yard.id, 'ark');
    expect(yard.tasks.map((t) => t.kind)).toEqual(['retool', 'slipway']);
    retoolYard(luna(), yard.id, 'mule');
    expect(yard.tasks).toHaveLength(2);
  });
});

describe('shipping line subsidy', () => {
  it('toggles a line subsidy', () => {
    const line = economy.lines[0]!;
    expect(line.subsidy).toBe(false);
    toggleSubsidy(line.id);
    expect(line.subsidy).toBe(true);
  });
});

describe('the registered system', () => {
  it('advances the economy when the game clock advances', () => {
    const before = economy.wealth;
    const mars = selectedColony();
    const people = mars.population;
    game.advance(30 * 86400);
    expect(mars.population).toBeGreaterThan(people);
    expect(economy.wealth).not.toBe(before);
  });
});
