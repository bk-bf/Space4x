import { economy } from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { mainKind, statsOf } from './model.ts';
import { legOrders, makeOrder, projectedPlace, type NewOrder } from './orders.ts';
import type { PropellantKind } from '#lib/game/shipdesign/index.ts';
import { leavesByLaunch } from './trips.ts';
import type { ManifestLine, Order, SupplyRun, Vessel } from './types.ts';

export function cycleOrders(run: SupplyRun, kind: PropellantKind | undefined): Order[] | undefined {
  const from = economy.sites.find((s) => s.id === run.from);
  const to = economy.sites.find((s) => s.id === run.to);
  if (!from || !to) return undefined;
  const out = legOrders({ kind: 'site', site: from.id }, to);
  const back = legOrders({ kind: 'site', site: to.id }, from);
  const lines: ManifestLine[] = run.manifest.map((l) => ({
    item: { kind: 'cargo', id: l.material },
    amount: l.amount
  }));
  const cycle: NewOrder[] = [
    ...(kind ? [{ type: 'load', item: { kind: 'propellant', id: kind }, amount: null } as const] : []),
    { type: 'manifest', lines },
    ...out,
    { type: 'unload', item: { kind: 'all-cargo' }, amount: null },
    ...back
  ];
  return cycle.map(makeOrder);
}

export const runTotal = (run: SupplyRun): number => run.manifest.reduce((a, l) => a + l.amount, 0);

export function startRun(game: Game, v: Vessel, run: SupplyRun): string | undefined {
  const from = economy.sites.find((s) => s.id === run.from);
  const to = economy.sites.find((s) => s.id === run.to);
  if (!from || !to || from.id === to.id) return 'Pick two different sites.';
  if (v.trip) return `${v.name} is on a trip.`;
  const kind = mainKind(v);
  if (!kind) return `${v.name} has no drive.`;
  if (leavesByLaunch(game, { kind: 'site', site: from.id }))
    return `${from.name} is a launch site; ships leave it by launch.`;
  if (leavesByLaunch(game, { kind: 'site', site: to.id }))
    return `A ship cannot land at ${to.name}; it is reached by launch only.`;
  if (!run.manifest.length || run.manifest.some((l) => !(l.amount > 0)))
    return 'Name an amount for every material in the run.';
  const hold = statsOf(v)?.payloadCapacity ?? 0;
  if (runTotal(run) > hold + 1e-6)
    return `${v.name} holds ${Math.round(hold).toLocaleString('en-US')} kg; the run asks for ${Math.round(runTotal(run)).toLocaleString('en-US')} kg.`;
  const cycle = cycleOrders(run, kind);
  if (!cycle) return 'The route is gone.';
  const first = legOrders(projectedPlace(v), from).map(makeOrder);
  v.orders = [...first, ...cycle];
  v.run = { ...run, manifest: run.manifest.map((l) => ({ ...l })) };
  v.progress = 0;
  v.blocked = null;
  return undefined;
}
