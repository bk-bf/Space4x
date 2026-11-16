import { economy } from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { mainKind } from './model.ts';
import { legOrders, makeOrder, projectedPlace } from './orders.ts';
import { needsLaunchStack } from './trips.ts';
import type { Order, SupplyRun, Vessel } from './types.ts';

export function cycleOrders(run: SupplyRun, kind: string | undefined): Order[] | undefined {
  const from = economy.sites.find((s) => s.id === run.from);
  const to = economy.sites.find((s) => s.id === run.to);
  if (!from || !to) return undefined;
  const out = legOrders({ kind: 'site', site: from.id }, to);
  const back = legOrders({ kind: 'site', site: to.id }, from);
  return [
    ...(kind
      ? [{ type: 'load' as const, item: { kind: 'propellant' as const, id: kind }, amount: null }]
      : []),
    { type: 'load' as const, item: { kind: 'cargo' as const, id: run.item }, amount: run.amount },
    ...out,
    { type: 'unload' as const, item: { kind: 'cargo' as const, id: run.item }, amount: null },
    ...back
  ].map((o) => makeOrder(o as Parameters<typeof makeOrder>[0]));
}

export function startRun(game: Game, v: Vessel, run: SupplyRun): string | undefined {
  const from = economy.sites.find((s) => s.id === run.from);
  const to = economy.sites.find((s) => s.id === run.to);
  if (!from || !to || from.id === to.id) return 'Pick two different sites.';
  if (v.trip) return `${v.name} is on a trip.`;
  const kind = mainKind(v);
  if (!kind) return `${v.name} has no drive.`;
  if (needsLaunchStack(game, { kind: 'site', site: from.id }))
    return `${from.name} is a launch site; ships leave it by launch stack.`;
  if (needsLaunchStack(game, { kind: 'site', site: to.id }))
    return `A ship cannot land at ${to.name}; it is reached by launch only.`;
  const cycle = cycleOrders(run, kind);
  if (!cycle) return 'The route is gone.';
  const first = legOrders(projectedPlace(v), from).map(makeOrder);
  v.orders = [...first, ...cycle];
  v.run = { ...run };
  v.progress = 0;
  v.blocked = null;
  return undefined;
}
