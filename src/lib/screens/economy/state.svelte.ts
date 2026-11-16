import {
  applyScenario,
  economy,
  homeSite,
  resetEconomy,
  siteById,
  type Site
} from '#lib/game/economy/index.ts';
import { milestones } from '#lib/game/data/index.ts';
import { game } from '#lib/game/index.ts';
import { completeSurvey, resetSurvey } from '#lib/game/survey.svelte.ts';
import { resetShips, seedBelt, seedTravel, ships } from '#lib/game/ships/index.ts';

export type TabId =
  | 'summary'
  | 'production'
  | 'construction'
  | 'stockpiles'
  | 'milestones'
  | 'yard'
  | 'launch'
  | 'ships'
  | 'supply';

export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'production', label: 'Production' },
  { id: 'construction', label: 'Construction' },
  { id: 'stockpiles', label: 'Stockpiles' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'yard', label: 'Shipyard' },
  { id: 'launch', label: 'Launch' },
  { id: 'ships', label: 'Ships' },
  { id: 'supply', label: 'Supply' }
];

export const isTabId = (id: string | null | undefined): id is TabId => TABS.some((t) => t.id === id);

export const ui: {
  site: string;
  tab: TabId;
  group: number | null;
  order: number | null;
  pick: string;
  milestone: number;
  vessel: string | null;
  yardOrder: number | null;
} = $state({
  site: 'earth',
  tab: 'summary',
  group: null,
  order: null,
  pick: 'farmland',
  milestone: 1,
  vessel: null,
  yardOrder: null
});

export function showColony(id: string): void {
  const site = siteById(id);
  if (site) ui.site = site.id;
}

export function applyEconomyParams(params: URLSearchParams): void {
  const scenario = params.get('scenario');
  applyScenario(scenario);
  if (scenario === 'travel') {
    seedTravel(game);
    ui.vessel ??= ships.vessels.find((v) => v.trip)?.id ?? null;
  }
  if (scenario === 'belt') {
    seedBelt(game, params.has('outpost'));
    ui.vessel ??= ships.vessels[0]?.id ?? null;
  }
  for (const id of params.get('surveyed')?.split(',') ?? []) completeSurvey(id);
  const tab = params.get('tab');
  const colony = params.get('colony');
  if (isTabId(tab)) ui.tab = tab;
  if (colony) showColony(colony);
  const milestone = Number(params.get('milestone'));
  if (Number.isInteger(milestone) && milestone >= 1 && milestone <= milestones.length)
    ui.milestone = milestone;
  const vessel = params.get('vessel');
  if (vessel) ui.vessel = vessel;
}

export function selectedSite(): Site {
  return economy.sites.find((s) => s.id === ui.site) ?? homeSite();
}

export function resetEconomyScreen(): void {
  resetEconomy();
  resetShips();
  resetSurvey();
  Object.assign(ui, {
    site: 'earth',
    tab: 'summary',
    group: null,
    order: null,
    pick: 'farmland',
    milestone: 1,
    vessel: null,
    yardOrder: null
  });
}
