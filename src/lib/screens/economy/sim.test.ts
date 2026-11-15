import { beforeEach, describe, expect, it } from 'vitest';
import { DAY, START_TIME } from '#lib/game/clock.ts';
import { mockEconomy } from '#lib/game/mock/economy.ts';
import type { Colony, Economy, EventCategory } from '#lib/game/types.ts';
import { item } from './catalog.ts';
import {
  FACTORY_OUTPUT,
  MINE_OUTPUT,
  YEAR,
  accessibility,
  allocate,
  buildFinish,
  empireFlows,
  growthRate,
  industrialCapacity,
  mineOutput,
  orderFinish,
  orderProgress,
  orderRemaining,
  productionModifier,
  staffing,
  stepEconomy,
  trade,
  workersFree,
  workersRequired,
  yearsLeft,
  type Log
} from './sim.ts';
import { colonyName } from './lookup.ts';

let eco: Economy;
let events: { category: EventCategory; text: string; warn: boolean }[];
const log: Log = (category, text, warn = false) => events.push({ category, text, warn });

const colony = (id: string): Colony => {
  const c = eco.colonies.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

const run = (seconds: number) => stepEconomy(eco, seconds, START_TIME + seconds * 1000, log, colonyName);

beforeEach(() => {
  eco = mockEconomy();
  events = [];
});

describe('workforce', () => {
  it('counts the workers installations and slipways need and what is left over', () => {
    const mars = colony('mars');
    expect(workersRequired(mars)).toBe(8 * 2500 + 3 * 3000 + 2 * 3000 + 4000 + 6 * 500 + 6000 + 2500);
    expect(workersFree(mars)).toBeCloseTo(mars.population * mars.workforceShare - 50_500, 6);
    expect(staffing(mars)).toBe(1);
  });

  it('scales output down when there are too few workers', () => {
    const ceres = colony('ceres');
    ceres.workforceShare = 0.2;
    expect(staffing(ceres)).toBeCloseTo(4000 / 8500, 6);
  });
});

describe('population', () => {
  it('grows logistically toward the dome capacity', () => {
    const mars = colony('mars');
    expect(growthRate(mars)).toBeCloseTo(0.093 * (1 - 2.4e6 / 3.6e6), 6);
    const before = mars.population;
    run(YEAR);
    expect(mars.population).toBeGreaterThan(before);
    expect(mars.population).toBeLessThan(3.6e6);
  });

  it('shrinks above capacity but never faster than the birth rate', () => {
    const mars = colony('mars');
    mars.population = 9e6;
    expect(growthRate(mars)).toBe(-0.093);
  });
});

describe('mining', () => {
  it('multiplies mines, base output, accessibility and the governor bonus', () => {
    const mars = colony('mars');
    expect(mineOutput(mars, 'iron', eco)).toBeCloseTo(8 * MINE_OUTPUT * 0.7 * 1.12, 6);
  });

  it('keeps accessibility until half the deposit is gone, then lets it fall to the floor', () => {
    const d = { amount: 600, initial: 1000, accessibility: 0.8 };
    expect(accessibility(d)).toBe(0.8);
    d.amount = 250;
    expect(accessibility(d)).toBeCloseTo(0.1 + 0.7 * 0.5, 6);
    d.amount = 0;
    expect(accessibility(d)).toBeCloseTo(0.1, 6);
  });

  it('moves ore from the deposit to the stockpile and stops at an empty deposit', () => {
    const mars = colony('mars');
    const before = { deposit: mars.deposits.iron.amount, stock: mars.stock.iron };
    const rate = mineOutput(mars, 'iron', eco);
    run(30 * DAY);
    const mined = before.deposit - mars.deposits.iron.amount;
    expect(mined).toBeGreaterThan(rate * 0.07);
    expect(mined).toBeLessThan(rate * 0.1);
    expect(mars.stock.iron).toBeGreaterThan(before.stock + mined - mars.draw.iron);
    mars.deposits.uranium.amount = 0;
    expect(mineOutput(mars, 'uranium', eco)).toBe(0);
    expect(yearsLeft(mars, 'uranium', eco)).toBe(Number.POSITIVE_INFINITY);
  });

  it('reports the years a deposit will last at the current rate', () => {
    const mars = colony('mars');
    expect(yearsLeft(mars, 'iron', eco)).toBeCloseTo(
      mars.deposits.iron.amount / mineOutput(mars, 'iron', eco),
      6
    );
  });

  it('depletes a deposit over a long run and lowers output as it thins', () => {
    const europa = colony('europa');
    europa.deposits.iron.amount = 2000;
    europa.deposits.iron.initial = 60_000;
    const first = mineOutput(europa, 'iron', eco);
    run(5 * YEAR);
    expect(europa.deposits.iron.amount).toBeLessThan(2000);
    expect(mineOutput(europa, 'iron', eco)).toBeLessThanOrEqual(first);
  });
});

describe('industry', () => {
  it('turns factories into capacity with staffing and the governor bonus', () => {
    const mars = colony('mars');
    expect(industrialCapacity(mars, eco)).toBeCloseTo(3 * FACTORY_OUTPUT * 1.12, 6);
  });

  it('hands out capacity top down by share and skips paused orders', () => {
    const mars = colony('mars');
    const [mine, dome, plating] = mars.queue;
    expect(allocate(mars, eco).map((a) => a.fraction)).toEqual([0.4, 0.2, 0.15]);
    mine!.paused = true;
    expect(allocate(mars, eco).map((a) => a.fraction)).toEqual([0, 0.2, 0.15]);
    mine!.paused = false;
    dome!.share = 80;
    plating!.share = 50;
    expect(allocate(mars, eco).map((a) => a.fraction)).toEqual([0.4, 0.6, 0]);
  });

  it('computes remaining build points, progress and the completion date from capacity and the clock', () => {
    const mars = colony('mars');
    const mine = mars.queue[0]!;
    expect(orderRemaining(mine)).toBe(40 + (40 - 22));
    expect(orderProgress(mine)).toBeCloseTo(1 - 58 / 160, 6);
    const a = allocate(mars, eco)[0]!;
    const finish = orderFinish(a, START_TIME)!;
    expect(finish - START_TIME).toBeCloseTo((58 / (industrialCapacity(mars, eco) * 0.4)) * YEAR * 1000, 0);
    mine.paused = true;
    expect(orderFinish(allocate(mars, eco)[0]!, START_TIME)).toBeNull();
  });

  it('builds installations into the colony, takes their minerals and writes an event', () => {
    const mars = colony('mars');
    const mines = mars.installations.mine;
    const iron = mars.stock.iron;
    run(120 * DAY);
    expect(mars.installations.mine).toBe(mines + 2);
    expect(mars.queue.some((o) => o.item === 'mine')).toBe(false);
    expect(events.some((e) => e.text === 'Mars finished 4 mines.')).toBe(true);
    expect(mars.stock.iron).toBeLessThan(iron + 8 * MINE_OUTPUT * 120);
  });

  it('adds finished components to the stockpile', () => {
    const luna = colony('luna');
    const sensors = luna.components['sensor-array'];
    run(60 * DAY);
    expect(luna.components['sensor-array']).toBe(sensors + 2);
    expect(luna.queue).toHaveLength(0);
    expect(events.some((e) => e.text === 'Luna finished 6 sensor array parts.')).toBe(true);
  });

  it('stalls an order that is out of a mineral instead of building from nothing', () => {
    const mars = colony('mars');
    mars.stock.iron = 0;
    const before = mars.queue[0]!.done;
    run(10 * DAY);
    const mine = mars.queue[0]!;
    expect(mine.waiting).toBe('iron');
    expect(mine.done).toBe(before);
  });

  it('consumes the item cost in minerals in step with the build points', () => {
    const mars = colony('mars');
    mars.draw = { iron: 0, titanium: 0, copper: 0, uranium: 0, ice: 0, fuel: 0 };
    mars.installations.mine = 0;
    mars.yards = [];
    mars.queue = [
      { ...mars.queue[0]!, item: 'hull-plating', ordered: 40, quantity: 40, done: 0, share: 100 }
    ];
    const iron = mars.stock.iron;
    const titanium = mars.stock.titanium;
    run(10 * DAY);
    const order = mars.queue[0]!;
    const built = 40 * item('hull-plating').bp - orderRemaining(order);
    expect(built).toBeGreaterThan(0);
    expect(iron - mars.stock.iron).toBeCloseTo(
      (built * item('hull-plating').minerals.iron!) / item('hull-plating').bp,
      6
    );
    expect(titanium - mars.stock.titanium).toBeCloseTo(
      (built * item('hull-plating').minerals.titanium!) / item('hull-plating').bp,
      6
    );
  });
});

describe('shipyards', () => {
  it('finishes ships on a slipway, counts them and logs it', () => {
    const luna = colony('luna');
    const slip = luna.yards[0]!.slipways[0]!;
    expect(buildFinish(luna, eco, luna.yards[0]!, slip, START_TIME)).toBeGreaterThan(START_TIME);
    const built = luna.built.atlas ?? 0;
    run(120 * DAY);
    expect(slip.build).toBeNull();
    expect(luna.built.atlas).toBe(built + 1);
    expect(events.some((e) => e.text === 'Luna yard 1 finished an Atlas bulk freighter.')).toBe(true);
  });

  it('runs yard tasks in order and applies them when they finish', () => {
    const mars = colony('mars');
    const yard = mars.yards[0]!;
    yard.tasks.push({ id: 9, kind: 'slipway', total: 900, done: 0 });
    const capacity = yard.capacity;
    run(400 * DAY);
    expect(yard.capacity).toBe(capacity + 5000);
    expect(yard.slipways).toHaveLength(2);
    expect(yard.tasks).toHaveLength(0);
  });

  it('pauses building while the yard retools and then switches the class', () => {
    const mars = colony('mars');
    const yard = mars.yards[0]!;
    yard.tasks = [{ id: 9, kind: 'retool', total: 1500, done: 0, classId: 'ark' }];
    const done = yard.slipways[0]!.build!.done;
    run(30 * DAY);
    expect(yard.slipways[0]!.build!.done).toBe(done);
    run(400 * DAY);
    expect(yard.tooled).toBe('ark');
  });
});

describe('wealth', () => {
  it('slows production when the balance is negative and floors the penalty', () => {
    expect(productionModifier(eco)).toBe(1);
    eco.wealth = -5000;
    expect(productionModifier(eco)).toBeCloseTo(0.5, 6);
    eco.wealth = -1e9;
    expect(productionModifier(eco)).toBe(0.3);
  });

  it('never lets the balance pass twice the yearly income', () => {
    eco.wealth = 1e7;
    run(DAY);
    const income = empireFlows(eco).income;
    expect(eco.wealth).toBeLessThanOrEqual(2 * income + 1);
    expect(eco.wealth).toBeGreaterThan(income);
  });

  it('adds a year of net income to the balance and the month history', () => {
    const before = eco.wealth;
    run(YEAR);
    expect(eco.wealth).not.toBe(before);
    expect(eco.history).toHaveLength(12);
    expect(eco.month.income).toBeGreaterThan(0);
  });
});

describe('civilian trade', () => {
  it('trades the smaller of supply and demand and taxes what the lines carry', () => {
    const t = trade(eco);
    expect(t.goods.food).toEqual({ supply: 109, demand: 95, traded: 95 });
    expect(t.volume).toBe(Object.values(t.goods).reduce((a, g) => a + g.traded, 0));
    expect(t.carried).toBeLessThan(1);
    expect(t.tax).toBeCloseTo(t.revenue * 0.4, 6);
    const perColony = Object.values(t.byColony).reduce((a, b) => a + b, 0);
    expect(perColony).toBeCloseTo(t.tax, 6);
  });

  it('adds ships to a subsidised line while demand outruns shipping capacity', () => {
    const line = eco.lines.find((l) => l.subsidy)!;
    const ships = line.ships;
    run(2 * YEAR);
    expect(line.ships).toBeGreaterThan(ships);
  });
});

describe('stockpile warnings', () => {
  it('warns once when a stock falls below a year of use', () => {
    const europa = colony('europa');
    europa.stock.iron = 10;
    run(DAY);
    run(DAY);
    expect(events.filter((e) => e.warn && e.text.startsWith('Iron stock at Europa'))).toHaveLength(1);
  });
});
