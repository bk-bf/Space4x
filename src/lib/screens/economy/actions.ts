import { game } from '#lib/game/index.ts';
import type { Colony, ItemId } from '#lib/game/types.ts';
import { buildClass } from './catalog.ts';
import {
  canYardBuild,
  expansionCost,
  expansionStep,
  retoolCost,
  retooling,
  slipwayCost,
  slipwayIdle
} from './sim.ts';
import { economy } from './state.svelte.ts';

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(n) || lo));

export function addOrder(colony: Colony, id: ItemId, quantity: number, share: number): void {
  colony.queue.push({
    id: economy.nextId++,
    item: id,
    ordered: clamp(quantity, 1, 9999),
    quantity: clamp(quantity, 1, 9999),
    share: clamp(share, 1, 100),
    done: 0,
    paused: false,
    waiting: null
  });
}

export function moveOrder(colony: Colony, orderId: number, delta: -1 | 1): void {
  const from = colony.queue.findIndex((o) => o.id === orderId);
  const to = from + delta;
  const moved = colony.queue[from];
  const other = colony.queue[to];
  if (!moved || !other) return;
  colony.queue[from] = other;
  colony.queue[to] = moved;
}

export function pauseOrder(colony: Colony, orderId: number): void {
  const order = colony.queue.find((o) => o.id === orderId);
  if (order) order.paused = !order.paused;
}

export function removeOrder(colony: Colony, orderId: number): void {
  colony.queue = colony.queue.filter((o) => o.id !== orderId);
}

export function setShare(colony: Colony, orderId: number, share: number): void {
  const order = colony.queue.find((o) => o.id === orderId);
  if (order) order.share = clamp(share, 1, 100);
}

const yardOf = (colony: Colony, yardId: number) => colony.yards.find((y) => y.id === yardId);

export function startBuild(colony: Colony, yardId: number, slipwayId: number, classId: string): void {
  const yard = yardOf(colony, yardId);
  const slip = yard?.slipways.find((s) => s.id === slipwayId);
  if (!yard || !slip || !slipwayIdle(yard, slip) || yard.tooled !== classId || !canYardBuild(yard, classId))
    return;
  const cls = buildClass(classId);
  slip.build = { classId, done: 0, total: cls.bp };
  game.log(
    'factory',
    `${yard.name} laid down ${/^[AEIOU]/.test(cls.name) ? 'an' : 'a'} ${cls.name} ${cls.role.toLowerCase()}.`
  );
}

export function cancelBuild(colony: Colony, yardId: number, slipwayId: number): void {
  const slip = yardOf(colony, yardId)?.slipways.find((s) => s.id === slipwayId);
  if (slip) slip.build = null;
}

export function addSlipway(colony: Colony, yardId: number): void {
  const yard = yardOf(colony, yardId);
  if (yard) yard.tasks.push({ id: economy.nextId++, kind: 'slipway', total: slipwayCost(yard), done: 0 });
}

export function expandYard(colony: Colony, yardId: number): void {
  const yard = yardOf(colony, yardId);
  if (!yard) return;
  yard.tasks.push({
    id: economy.nextId++,
    kind: 'capacity',
    total: expansionCost(yard),
    done: 0,
    amount: expansionStep(yard)
  });
}

export function retoolYard(colony: Colony, yardId: number, classId: string): void {
  const yard = yardOf(colony, yardId);
  if (!yard || yard.tooled === classId || !canYardBuild(yard, classId)) return;
  if (retooling(yard) || yard.slipways.some((s) => s.build)) return;
  yard.tasks.unshift({
    id: economy.nextId++,
    kind: 'retool',
    total: retoolCost(yard, classId),
    done: 0,
    classId
  });
}

export function cancelTask(colony: Colony, yardId: number, taskId: number): void {
  const yard = yardOf(colony, yardId);
  if (yard) yard.tasks = yard.tasks.filter((t) => t.id !== taskId);
}

export function toggleSubsidy(lineId: number): void {
  const line = economy.lines.find((l) => l.id === lineId);
  if (line) line.subsidy = !line.subsidy;
}
