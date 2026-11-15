import { mockEconomy } from '#lib/game/mock/economy.ts';
import type { Colony, Economy, ItemId } from '#lib/game/types.ts';

export type TabId = 'summary' | 'industry' | 'mining' | 'shipyards' | 'stockpiles' | 'wealth';

export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'industry', label: 'Industry' },
  { id: 'mining', label: 'Mining' },
  { id: 'shipyards', label: 'Shipyards' },
  { id: 'stockpiles', label: 'Stockpiles' },
  { id: 'wealth', label: 'Wealth and trade' }
];

export const isTabId = (id: string | null | undefined): id is TabId => TABS.some((t) => t.id === id);

export const DEFAULT_COLONY = 'mars';

export const economy: Economy = $state(mockEconomy());

export const ui: { colony: string; tab: TabId; pick: ItemId } = $state({
  colony: DEFAULT_COLONY,
  tab: 'summary',
  pick: 'mine'
});

let paramsApplied = false;

export function applyParams(param: (name: string) => string | null): void {
  if (paramsApplied) return;
  paramsApplied = true;
  const tab = param('tab');
  const colony = param('colony');
  if (isTabId(tab)) ui.tab = tab;
  if (colony && economy.colonies.some((c) => c.id === colony)) ui.colony = colony;
}

export function selectedColony(): Colony {
  const found = economy.colonies.find((c) => c.id === ui.colony);
  const first = economy.colonies[0];
  if (found) return found;
  if (!first) throw new Error('the economy has no colonies');
  return first;
}

export function resetEconomy(): void {
  Object.assign(economy, mockEconomy());
  ui.colony = DEFAULT_COLONY;
  ui.tab = 'summary';
  ui.pick = 'mine';
}
