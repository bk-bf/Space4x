import { DAY } from '#lib/game/clock.ts';
import type {
  BuildOrder,
  Colony,
  Deposit,
  Economy,
  EventCategory,
  GoodId,
  InstallationId,
  MineralId,
  ShippingLine,
  Slipway,
  Yard,
  YardTask
} from '#lib/game/types.ts';
import { GOODS, ITEMS, MINERALS, SECTORS, item, shipClass, type ItemDef, type Sector } from './catalog.ts';

export const YEAR = 365 * DAY;
export const MINE_OUTPUT = 250;
export const FACTORY_OUTPUT = 600;
export const REFINERY_OUTPUT = 900;
export const DOME_CAPACITY = 600_000;
export const WEALTH_PER_1000_WORKERS = 10;
export const EXCHANGE_WEALTH = 350;
export const UPKEEP_PER_INSTALLATION = 5;
export const LAB_UPKEEP = 150;
export const WEALTH_PER_BP = 1;
export const SLIPWAY_RATE = 1500;
export const TASK_RATE = 1500;
export const YARD_WORKERS_PER_SLIPWAY = 2_500;
export const TRADE_TAX = 0.4;
export const SHIP_TRADE_CAPACITY = 30;
export const SUBSIDY_PER_SHIP = 150;
export const SUBSIDY_GROWTH_YEARS = 0.8;
export const DEFICIT_SCALE = 10_000;
export const WEALTH_CAP_YEARS = 2;
export const MIN_ACCESSIBILITY = 0.1;
export const SUBSTEP = DAY;

export const SHIP_MINERALS_PER_BP: Readonly<Partial<Record<MineralId, number>>> = {
  iron: 0.25,
  titanium: 0.15,
  copper: 0.08,
  uranium: 0.02
};

export type Log = (category: EventCategory, text: string, warn?: boolean) => void;

const years = (seconds: number): number => seconds / YEAR;
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export const workforce = (c: Colony): number => c.population * c.workforceShare;

export function workersBySector(c: Colony): Record<Sector, number> {
  const out: Record<Sector, number> = { industry: 0, mining: 0, research: 0, shipyards: 0, services: 0 };
  for (const def of ITEMS)
    if (def.kind === 'installation')
      out[def.sector] += def.workers * c.installations[def.id as InstallationId];
  out.shipyards = sum(c.yards.map((y) => y.slipways.length * YARD_WORKERS_PER_SLIPWAY));
  return out;
}

export const workersRequired = (c: Colony): number => sum(SECTORS.map((s) => workersBySector(c)[s.id]));

export function staffing(c: Colony): number {
  const need = workersRequired(c);
  return need <= 0 ? 1 : Math.min(1, workforce(c) / need);
}

export const workersEmployed = (c: Colony): number => Math.min(workforce(c), workersRequired(c));

export const workersFree = (c: Colony): number => Math.max(0, workforce(c) - workersRequired(c));

export const populationCapacity = (c: Colony): number =>
  c.capacityBase + c.installations.dome * DOME_CAPACITY;

export function growthRate(c: Colony): number {
  const cap = populationCapacity(c);
  if (cap <= 0) return -c.birthRate;
  return Math.max(-c.birthRate, c.birthRate * (1 - c.population / cap));
}

export function productionModifier(eco: Economy): number {
  return eco.wealth >= 0 ? 1 : Math.max(0.3, 1 + eco.wealth / DEFICIT_SCALE);
}

const governorFactor = (c: Colony): number => 1 + c.governor.bonus;

export const productivity = (c: Colony, eco: Economy): number =>
  staffing(c) * governorFactor(c) * productionModifier(eco);

export const industrialCapacity = (c: Colony, eco: Economy): number =>
  c.installations.factory * FACTORY_OUTPUT * productivity(c, eco);

export interface Allocation {
  order: BuildOrder;
  fraction: number;
  bpPerYear: number;
}

export function allocate(c: Colony, eco: Economy): Allocation[] {
  const capacity = industrialCapacity(c, eco);
  let left = 1;
  return c.queue.map((order) => {
    const fraction = order.paused ? 0 : Math.min(left, order.share / 100);
    left -= fraction;
    return { order, fraction, bpPerYear: capacity * fraction };
  });
}

export const unusedShare = (c: Colony, eco: Economy): number =>
  Math.max(0, 1 - sum(allocate(c, eco).map((a) => a.fraction)));

export const orderBP = (order: BuildOrder): number => item(order.item).bp;

export const orderRemaining = (order: BuildOrder): number =>
  order.quantity <= 0 ? 0 : (order.quantity - 1) * orderBP(order) + (orderBP(order) - order.done);

export const orderProgress = (order: BuildOrder): number => {
  const total = order.ordered * orderBP(order);
  return total <= 0 ? 1 : Math.min(1, 1 - orderRemaining(order) / total);
};

export function orderFinish(a: Allocation, now: number): number | null {
  if (a.bpPerYear <= 0) return null;
  return now + (orderRemaining(a.order) / a.bpPerYear) * YEAR * 1000;
}

export function accessibility(d: Deposit): number {
  const base = Math.max(MIN_ACCESSIBILITY, d.accessibility);
  const left = d.initial > 0 ? d.amount / d.initial : 0;
  if (left >= 0.5) return base;
  return Math.min(base, MIN_ACCESSIBILITY + (base - MIN_ACCESSIBILITY) * (left / 0.5));
}

export const mineOutput = (c: Colony, mineral: MineralId, eco: Economy): number => {
  const d = c.deposits[mineral];
  return d.amount <= 0 ? 0 : c.installations.mine * MINE_OUTPUT * accessibility(d) * productivity(c, eco);
};

export function yearsLeft(c: Colony, mineral: MineralId, eco: Economy): number {
  const out = mineOutput(c, mineral, eco);
  return out > 0 ? c.deposits[mineral].amount / out : Number.POSITIVE_INFINITY;
}

export const refineryCapacity = (c: Colony, eco: Economy): number =>
  c.installations.refinery * REFINERY_OUTPUT * productivity(c, eco);

export const fuelOutput = (c: Colony, eco: Economy): number =>
  c.stock.ice > 0 ? refineryCapacity(c, eco) : Math.min(refineryCapacity(c, eco), mineOutput(c, 'ice', eco));

export function annualUse(c: Colony, mineral: MineralId | 'fuel', eco: Economy): number {
  let use = c.draw[mineral];
  if (mineral === 'fuel') return use;
  for (const a of allocate(c, eco)) {
    const def = item(a.order.item);
    if (a.bpPerYear > 0 && !a.order.waiting) use += ((def.minerals[mineral] ?? 0) / def.bp) * a.bpPerYear;
  }
  use += slipwayDemand(c, eco) * (SHIP_MINERALS_PER_BP[mineral] ?? 0);
  if (mineral === 'ice') use += fuelOutput(c, eco);
  return use;
}

function slipwayDemand(c: Colony, eco: Economy): number {
  return sum(
    c.yards.map((y) => (retooling(y) ? 0 : y.slipways.filter((s) => s.build).length * slipwayRate(c, eco)))
  );
}

export const slipwayRate = (c: Colony, eco: Economy): number => SLIPWAY_RATE * productivity(c, eco);

export const taskRate = (y: Yard, c: Colony, eco: Economy): number =>
  TASK_RATE * y.slipways.length * staffing(c) * productionModifier(eco);

export const retooling = (y: Yard): boolean => y.tasks[0]?.kind === 'retool';

export const slipwayCost = (y: Yard): number => Math.round(500 + y.capacity * 0.04);

export const expansionStep = (y: Yard): number => (y.kind === 'commercial' ? 5_000 : 1_000);

export const expansionCost = (y: Yard): number =>
  Math.round(expansionStep(y) * (y.kind === 'commercial' ? 0.12 : 0.7));

export const retoolCost = (y: Yard, classId: string): number =>
  Math.round(200 + Math.abs(shipClass(classId).tons - shipClass(y.tooled).tons) * 0.05);

export const canYardBuild = (y: Yard, classId: string): boolean => {
  const cls = shipClass(classId);
  return cls.tons <= y.capacity && (y.kind === 'naval' || cls.kind === 'commercial');
};

export const slipwayIdle = (y: Yard, s: Slipway): boolean => !s.build && !retooling(y);

export function buildFinish(c: Colony, eco: Economy, y: Yard, s: Slipway, now: number): number | null {
  if (!s.build || retooling(y)) return null;
  const rate = slipwayRate(c, eco);
  if (rate <= 0) return null;
  const gap = retoolWait(y, c, eco);
  return now + (gap + (s.build.total - s.build.done) / rate) * YEAR * 1000;
}

function retoolWait(y: Yard, c: Colony, eco: Economy): number {
  const task = y.tasks[0];
  return task?.kind === 'retool' ? (task.total - task.done) / Math.max(1e-9, taskRate(y, c, eco)) : 0;
}

export function taskFinishes(c: Colony, eco: Economy, y: Yard, now: number): (number | null)[] {
  const rate = taskRate(y, c, eco);
  let elapsed = 0;
  return y.tasks.map((t) => {
    if (rate <= 0) return null;
    elapsed += (t.total - t.done) / rate;
    return now + elapsed * YEAR * 1000;
  });
}

export const taskLabel = (t: YardTask, y: Yard): string => {
  if (t.kind === 'slipway') return 'Add slipway';
  if (t.kind === 'capacity')
    return `Expand capacity by ${(t.amount ?? expansionStep(y)).toLocaleString('en-US')} t`;
  return `Retool to ${t.classId ? shipClass(t.classId).name : ''}`;
};

export interface TradeSummary {
  volume: number;
  capacity: number;
  carried: number;
  revenue: number;
  tax: number;
  goods: Record<GoodId, { supply: number; demand: number; traded: number }>;
  byColony: Record<string, number>;
}

export function trade(eco: Economy): TradeSummary {
  const goods = {} as TradeSummary['goods'];
  for (const g of GOODS) {
    const supply = sum(eco.colonies.map((c) => c.trade[g.id].supply));
    const demand = sum(eco.colonies.map((c) => c.trade[g.id].demand));
    goods[g.id] = { supply, demand, traded: Math.min(supply, demand) };
  }
  const volume = sum(GOODS.map((g) => goods[g.id].traded));
  const capacity = sum(eco.lines.map((l) => l.ships * SHIP_TRADE_CAPACITY));
  const carried = volume <= 0 ? 1 : Math.min(1, capacity / volume);
  const byColony: Record<string, number> = {};
  let revenue = 0;
  for (const g of GOODS) {
    const { supply, demand } = goods[g.id];
    revenue += goods[g.id].traded * g.price * carried;
    for (const c of eco.colonies) {
      const out = supply > 0 ? c.trade[g.id].supply * Math.min(1, demand / supply) : 0;
      const into = demand > 0 ? c.trade[g.id].demand * Math.min(1, supply / demand) : 0;
      byColony[c.id] = (byColony[c.id] ?? 0) + ((out + into) / 2) * g.price * carried * TRADE_TAX;
    }
  }
  return { volume, capacity, carried, revenue, tax: revenue * TRADE_TAX, goods, byColony };
}

export const lineIncome = (l: ShippingLine, eco: Economy, t: TradeSummary): number => {
  const ships = sum(eco.lines.map((x) => x.ships));
  return ships > 0 ? (t.tax * l.ships) / ships : 0;
};

export const subsidyCost = (l: ShippingLine): number => (l.subsidy ? l.ships * SUBSIDY_PER_SHIP : 0);

export interface WealthLines {
  taxes: number;
  exchange: number;
  trade: number;
  maintenance: number;
  research: number;
  shipbuilding: number;
}

export const shipbuildingRate = (c: Colony, eco: Economy): number =>
  sum(
    c.yards.map((y) => {
      const active = y.tasks.length > 0 ? taskRate(y, c, eco) : 0;
      const builds = retooling(y) ? 0 : y.slipways.filter((s) => s.build).length * slipwayRate(c, eco);
      return (active + builds) * WEALTH_PER_BP;
    })
  );

export function wealthLines(c: Colony, eco: Economy, t: TradeSummary): WealthLines {
  return {
    taxes: (workersEmployed(c) / 1000) * WEALTH_PER_1000_WORKERS,
    exchange: c.installations.exchange * EXCHANGE_WEALTH,
    trade: t.byColony[c.id] ?? 0,
    maintenance: sum(Object.values(c.installations)) * UPKEEP_PER_INSTALLATION,
    research: c.installations.lab * LAB_UPKEEP,
    shipbuilding: shipbuildingRate(c, eco)
  };
}

export const wealthIncome = (w: WealthLines): number => w.taxes + w.exchange + w.trade;

export const wealthSpending = (w: WealthLines): number => w.maintenance + w.research + w.shipbuilding;

export function empireFlows(eco: Economy): {
  income: number;
  spending: number;
  subsidies: number;
  cap: number;
} {
  const t = trade(eco);
  const lines = eco.colonies.map((c) => wealthLines(c, eco, t));
  const subsidies = sum(eco.lines.map(subsidyCost));
  const income = sum(lines.map(wealthIncome));
  return {
    income,
    spending: sum(lines.map(wealthSpending)) + subsidies,
    subsidies,
    cap: income * WEALTH_CAP_YEARS
  };
}

interface Consumed {
  bp: number;
  limit: MineralId | null;
}

function consume(
  stock: Record<MineralId, number>,
  perBP: Readonly<Partial<Record<MineralId, number>>>,
  wanted: number
): Consumed {
  let bp = wanted;
  let limit: MineralId | null = null;
  for (const m of MINERALS) {
    const need = perBP[m.id] ?? 0;
    if (need <= 0) continue;
    const afford = stock[m.id] / need;
    if (afford < bp) {
      bp = afford;
      limit = m.id;
    }
  }
  bp = Math.max(0, bp);
  for (const m of MINERALS) stock[m.id] -= (perBP[m.id] ?? 0) * bp;
  return { bp, limit };
}

const perBPOf = (def: ItemDef): Partial<Record<MineralId, number>> =>
  Object.fromEntries(Object.entries(def.minerals).map(([m, tons]) => [m, tons / def.bp]));

function runOrder(c: Colony, order: BuildOrder, wanted: number): void {
  const def = item(order.item);
  const perBP = perBPOf(def);
  let left = wanted;
  order.waiting = null;
  while (left > 1e-9 && order.quantity > 0) {
    const { bp, limit } = consume(c.stock, perBP, Math.min(left, def.bp - order.done));
    order.done += bp;
    left -= bp;
    if (limit) {
      order.waiting = limit;
      return;
    }
    if (order.done < def.bp - 1e-9) continue;
    order.done = 0;
    order.quantity -= 1;
    if (def.kind === 'installation') c.installations[def.id as keyof Colony['installations']] += 1;
    else c.components[def.id as keyof Colony['components']] += 1;
  }
}

function runQueue(c: Colony, eco: Economy, y: number, log: Log): void {
  const plan = allocate(c, eco);
  for (const a of plan) if (a.fraction > 0) runOrder(c, a.order, a.bpPerYear * y);
  for (const a of plan) {
    if (a.order.quantity > 0) continue;
    const def = item(a.order.item);
    const noun = a.order.ordered === 1 ? def.name.toLowerCase() : def.plural;
    log('factory', `${c.name} finished ${a.order.ordered} ${noun}.`);
  }
  c.queue = c.queue.filter((o) => o.quantity > 0);
}

function mine(c: Colony, eco: Economy, y: number): void {
  for (const m of MINERALS) {
    const d = c.deposits[m.id];
    const out = Math.min(d.amount, mineOutput(c, m.id, eco) * y);
    d.amount -= out;
    c.stock[m.id] += out;
  }
}

function refine(c: Colony, eco: Economy, y: number): void {
  const out = Math.min(refineryCapacity(c, eco) * y, c.stock.ice);
  c.stock.ice -= out;
  c.fuel += out;
}

function drawDown(c: Colony, y: number): void {
  for (const m of MINERALS) c.stock[m.id] = Math.max(0, c.stock[m.id] - c.draw[m.id] * y);
  c.fuel = Math.max(0, c.fuel - c.draw.fuel * y);
}

function warnLow(c: Colony, log: Log): void {
  const keys: (MineralId | 'fuel')[] = [...MINERALS.map((m) => m.id), 'fuel'];
  for (const key of keys) {
    const use = c.draw[key];
    const stock = key === 'fuel' ? c.fuel : c.stock[key];
    if (use <= 0) continue;
    if (stock < use && !c.lowStock[key]) {
      c.lowStock[key] = true;
      const name = key === 'fuel' ? 'Fuel' : MINERALS.find((m) => m.id === key)?.name;
      log('factory', `${name} stock at ${c.name} fell below one year of use.`, true);
    } else if (stock >= use * 1.2) c.lowStock[key] = false;
  }
}

function runYard(
  c: Colony,
  eco: Economy,
  yard: Yard,
  y: number,
  log: Log,
  spend: (wealth: number) => void
): void {
  const task = yard.tasks[0];
  if (task) {
    const bp = Math.min(task.total - task.done, taskRate(yard, c, eco) * y);
    task.done += bp;
    spend(bp * WEALTH_PER_BP);
    if (task.done >= task.total - 1e-9) finishTask(yard, task, log);
  }
  if (retooling(yard)) return;
  for (const slip of yard.slipways) {
    const build = slip.build;
    if (!build) continue;
    const wanted = Math.min(build.total - build.done, slipwayRate(c, eco) * y);
    const { bp } = consume(c.stock, SHIP_MINERALS_PER_BP, wanted);
    build.done += bp;
    spend(bp * WEALTH_PER_BP);
    if (build.done < build.total - 1e-9) continue;
    slip.build = null;
    c.built[build.classId] = (c.built[build.classId] ?? 0) + 1;
    const cls = shipClass(build.classId);
    log('factory', `${yard.name} finished ${article(cls.name)} ${cls.role.toLowerCase()}.`);
  }
}

const article = (name: string): string => `${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}`;

function finishTask(yard: Yard, task: YardTask, log: Log): void {
  yard.tasks = yard.tasks.filter((t) => t !== task);
  if (task.kind === 'slipway') {
    const next = Math.max(0, ...yard.slipways.map((s) => s.id)) + 1;
    yard.slipways.push({ id: next, build: null });
    log('factory', `${yard.name} gained slipway ${next}.`);
  } else if (task.kind === 'capacity') {
    yard.capacity += task.amount ?? expansionStep(yard);
    log('factory', `${yard.name} can now build ships up to ${yard.capacity.toLocaleString('en-US')} t.`);
  } else if (task.classId) {
    yard.tooled = task.classId;
    log('factory', `${yard.name} finished retooling for the ${shipClass(task.classId).name}.`);
  }
}

function growLines(eco: Economy, t: TradeSummary, y: number, log: Log): void {
  for (const line of eco.lines) {
    if (!line.subsidy || t.capacity >= t.volume * 1.25) continue;
    line.growth += y / SUBSIDY_GROWTH_YEARS;
    if (line.growth < 1) continue;
    line.growth -= 1;
    line.ships += 1;
    log('ship', `${line.name} added a ship, ${line.ships} in service.`);
  }
}

const monthIndex = (ms: number): number => {
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};

function rollMonth(eco: Economy, now: number): void {
  const index = monthIndex(now);
  if (index === eco.monthIndex) return;
  eco.history.push({ ...eco.month });
  while (eco.history.length > 12) eco.history.shift();
  eco.month = { income: 0, spending: 0 };
  eco.monthIndex = index;
}

function stepOnce(eco: Economy, dt: number, now: number, log: Log): void {
  const y = years(dt);
  const t = trade(eco);
  let income = 0;
  let spending = 0;
  let incomeRate = 0;
  const spend = (w: number) => {
    spending += w;
  };
  for (const c of eco.colonies) {
    const lines = wealthLines(c, eco, t);
    c.population = Math.max(0, c.population * Math.exp(growthRate(c) * y));
    mine(c, eco, y);
    refine(c, eco, y);
    drawDown(c, y);
    runQueue(c, eco, y, log);
    for (const yard of c.yards) runYard(c, eco, yard, y, log, spend);
    warnLow(c, log);
    incomeRate += wealthIncome(lines);
    income += wealthIncome(lines) * y;
    spending += (lines.maintenance + lines.research) * y;
  }
  growLines(eco, t, y, log);
  spending += sum(eco.lines.map(subsidyCost)) * y;
  eco.wealth = Math.min(eco.wealth + income - spending, incomeRate * WEALTH_CAP_YEARS);
  eco.month.income += income;
  eco.month.spending += spending;
  rollMonth(eco, now);
}

export function stepEconomy(eco: Economy, dt: number, endTime: number, log: Log): void {
  const start = endTime - dt * 1000;
  let elapsed = 0;
  while (elapsed < dt - 1e-9) {
    const h = Math.min(SUBSTEP, dt - elapsed);
    elapsed += h;
    stepOnce(eco, h, start + elapsed * 1000, (category, text, warn = false) => log(category, text, warn));
  }
}
