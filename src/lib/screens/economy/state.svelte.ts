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

export function showColony(id: string): void {
  if (economy.colonies.some((c) => c.id === id)) ui.colony = id;
}

export function applyEconomyParams(params: URLSearchParams): void {
  const tab = params.get('tab');
  const colony = params.get('colony');
  if (isTabId(tab)) ui.tab = tab;
  if (colony) showColony(colony);
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
