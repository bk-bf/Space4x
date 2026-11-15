import {
  applyScenario,
  economy,
  homeSite,
  resetEconomy,
  siteById,
  type Site
} from '#lib/game/economy/index.ts';
import { milestones } from '#lib/game/data/index.ts';

export type TabId = 'summary' | 'production' | 'construction' | 'stockpiles' | 'milestones';

export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'production', label: 'Production' },
  { id: 'construction', label: 'Construction' },
  { id: 'stockpiles', label: 'Stockpiles' },
  { id: 'milestones', label: 'Milestones' }
];

export const isTabId = (id: string | null | undefined): id is TabId => TABS.some((t) => t.id === id);

export const ui: {
  site: string;
  tab: TabId;
  group: number | null;
  order: number | null;
  pick: string;
  milestone: number;
} = $state({ site: 'earth', tab: 'summary', group: null, order: null, pick: 'farmland', milestone: 1 });

export function showColony(id: string): void {
  const site = siteById(id);
  if (site) ui.site = site.id;
}

export function applyEconomyParams(params: URLSearchParams): void {
  const tab = params.get('tab');
  const colony = params.get('colony');
  if (isTabId(tab)) ui.tab = tab;
  if (colony) showColony(colony);
  const milestone = Number(params.get('milestone'));
  if (Number.isInteger(milestone) && milestone >= 1 && milestone <= milestones.length)
    ui.milestone = milestone;
  applyScenario(params.get('scenario'));
}

export function selectedSite(): Site {
  return economy.sites.find((s) => s.id === ui.site) ?? homeSite();
}

export function resetEconomyScreen(): void {
  resetEconomy();
  Object.assign(ui, {
    site: 'earth',
    tab: 'summary',
    group: null,
    order: null,
    pick: 'farmland',
    milestone: 1
  });
}
