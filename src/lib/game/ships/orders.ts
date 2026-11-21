import { robotName } from '#lib/game/robots/index.ts';
import { economy, type Site } from '#lib/game/economy/index.ts';
import { material } from '#lib/game/data/index.ts';
import type { Profile } from '#lib/game/flight/index.ts';
import { PROPELLANTS } from '#lib/game/shipdesign/index.ts';
import { hangsInOrbit, isPlatform } from './world.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { ships } from './state.svelte.ts';
import type { AllCargo, Item, ManifestLine, Order, Vessel, Whereabouts } from './types.ts';

export type NewOrder =
  | { type: 'fly'; body: string; angle: number; profile?: Profile }
  | { type: 'land'; body: string; profile?: Profile; region?: string }
  | { type: 'survey'; body: string }
  | { type: 'sample' }
  | { type: 'dock'; site: string }
  | { type: 'load'; item: Item; amount: number | null }
  | { type: 'unload'; item: Item | AllCargo; amount: number | null }
  | { type: 'manifest'; lines: ManifestLine[] }
  | { type: 'wait'; seconds: number };

export function makeOrder(o: NewOrder): Order {
  const id = ships.nextOrder++;
  if (o.type === 'fly' || o.type === 'land') return { ...o, id, profile: o.profile ?? 'cheapest' };
  return { ...o, id };
}

export function addOrder(v: Vessel, o: NewOrder): Order {
  const order = makeOrder(o);
  v.orders.push(order);
  return order;
}

export function moveOrder(v: Vessel, orderId: number, by: number): void {
  const i = v.orders.findIndex((o) => o.id === orderId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= v.orders.length) return;
  const [o] = v.orders.splice(i, 1);
  if (o) v.orders.splice(j, 0, o);
}

export function removeOrder(v: Vessel, orderId: number): void {
  const i = v.orders.findIndex((o) => o.id === orderId);
  if (i === 0) v.progress = 0;
  if (i >= 0) v.orders.splice(i, 1);
}

export function clearOrders(v: Vessel): void {
  v.orders.splice(0);
  v.run = null;
  v.progress = 0;
  v.blocked = null;
}

export const siteOf = (id: string): Site | undefined => economy.sites.find((s) => s.id === id);

export function surfaceSite(body: string, region?: string): Site | undefined {
  const here = economy.sites.filter((s) => s.worldBody === body && s.place === 'surface');
  return region ? here.find((s) => s.region === region) : here[0];
}

export function projectedPlace(v: Vessel): Whereabouts {
  let at: Whereabouts = v.trip ? v.trip.to : v.at;
  for (const o of v.orders) {
    if (o.type === 'fly') at = { kind: 'orbit', body: o.body, angle: o.angle };
    else if (o.type === 'land') {
      const s = surfaceSite(o.body, o.region);
      at = s
        ? { kind: 'site', site: s.id }
        : { kind: 'surface', body: o.body, ...(o.region ? { region: o.region } : {}) };
    } else if (o.type === 'dock') at = { kind: 'site', site: o.site };
  }
  return at;
}

export function legOrders(from: Whereabouts, to: Site, profile: Profile = 'cheapest'): NewOrder[] {
  if (from.kind === 'site' && from.site === to.id) return [];
  if (to.place === 'surface' && !isPlatform(to))
    return [{ type: 'land', body: to.worldBody, profile, ...(to.region ? { region: to.region } : {}) }];
  const here = from.kind === 'site' ? siteOf(from.site) : undefined;
  const fromBody =
    from.kind === 'orbit'
      ? from.body
      : here && (hangsInOrbit(here) || here.place === 'point')
        ? here.worldBody
        : undefined;
  const orders: NewOrder[] = [];
  if (fromBody !== to.worldBody) orders.push({ type: 'fly', body: to.worldBody, angle: to.angle, profile });
  orders.push({ type: 'dock', site: to.id });
  return orders;
}

export function goTo(v: Vessel, to: Site, profile: Profile = 'cheapest'): Order[] {
  return legOrders(projectedPlace(v), to, profile).map((o) => addOrder(v, o));
}

export const itemName = (i: Item | AllCargo): string =>
  i.kind === 'crew'
    ? 'crew'
    : i.kind === 'robot'
      ? robotName(i.id)
      : i.kind === 'all-cargo'
        ? 'cargo'
        : i.kind === 'cargo'
          ? material(i.id).name
          : PROPELLANTS[i.id].name.toLowerCase();

const amountText = (item: Item | AllCargo, amount: number | null): string =>
  amount === null
    ? 'all'
    : item.kind === 'crew' || item.kind === 'robot'
      ? `${Math.round(amount)}`
      : `${Math.round(amount).toLocaleString('en-US')} kg`;

export const lineText = (l: ManifestLine): string => `${amountText(l.item, l.amount)} ${itemName(l.item)}`;

export function orderLabel(game: Game, o: Order): string {
  const body = (id: string) => game.placeName(id) ?? id;
  switch (o.type) {
    case 'fly':
      return game.jump(o.body) ? `Fly to ${body(o.body)}` : `Fly to ${body(o.body)} orbit`;
    case 'land':
      return `Land on ${body(o.body)}`;
    case 'dock':
      return `Dock at ${siteOf(o.site)?.name ?? 'a lost site'}`;
    case 'load':
      return `Load ${amountText(o.item, o.amount)} ${itemName(o.item)}`;
    case 'unload':
      return o.item.kind === 'all-cargo'
        ? 'Unload all cargo'
        : `Unload ${amountText(o.item, o.amount)} ${itemName(o.item)}`;
    case 'manifest':
      return `Load ${o.lines.length} items`;
    case 'survey':
      return `Survey ${body(o.body)}`;
    case 'sample':
      return 'Take a sample';
    case 'wait':
      return `Wait ${Math.round((o.seconds / 3600) * 10) / 10} h`;
  }
}
