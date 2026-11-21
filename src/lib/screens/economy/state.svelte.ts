import {
  applyScenario,
  economy,
  homeSite,
  resetEconomy,
  siteById,
  type Site
} from '#lib/game/economy/index.ts';
import { game } from '#lib/game/index.ts';
import { completeSurvey, resetSurvey } from '#lib/game/survey.svelte.ts';
import { resetShips, seedBelt, seedJump, seedRobots, seedTravel, ships } from '#lib/game/ships/index.ts';
import type { Tab } from '#lib/ui/index.ts';
import { launchUi } from './launchState.svelte.ts';
import type { Period } from '#lib/ui/format.ts';

export type TabId =
  | 'summary'
  | 'production'
  | 'construction'
  | 'stockpiles'
  | 'minerals'
  | 'people'
  | 'yard'
  | 'launch'
  | 'ships'
  | 'supply'
  | 'market';

export const TABS: readonly (Tab & { id: TabId })[] = [
  { id: 'summary', label: 'Summary', icon: 'list' },
  { id: 'production', label: 'Production', icon: 'factory' },
  { id: 'construction', label: 'Construction', icon: 'hammer' },
  { id: 'stockpiles', label: 'Stockpiles', icon: 'box' },
  { id: 'minerals', label: 'Minerals', icon: 'map' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'yard', label: 'Shipyard', icon: 'yard' },
  { id: 'launch', label: 'Launch', icon: 'rocket' },
  { id: 'ships', label: 'Ships', icon: 'ship' },
  { id: 'supply', label: 'Supply', icon: 'flame' },
  { id: 'market', label: 'Market', icon: 'coin' }
];

export const isTabId = (id: string | null | undefined): id is TabId => TABS.some((t) => t.id === id);

interface EconomyUi {
  site: string;
  tab: TabId;
  period: Period;
  group: number | null;
  robots: number | null;
  groupKind: string;
  target: string;
  switchCount: number;
  order: number | null;
  pick: string;
  buildKind: string;
  recipe: string;
  quantity: number;
  side: 'pick' | 'order';
  material: string;
  category: string;
  showEmpty: boolean;
  mineral: string;
  deposit: string;
  vessel: string | null;
  yardOrder: number | null;
}

const initial = (): EconomyUi => ({
  site: 'earth',
  tab: 'summary',
  period: 'day',
  group: null,
  robots: null,
  groupKind: 'all',
  target: '',
  switchCount: 1,
  order: null,
  pick: 'farmland',
  buildKind: 'all',
  recipe: '',
  quantity: 1,
  side: 'pick',
  material: 'iron',
  category: 'all',
  showEmpty: false,
  mineral: '',
  deposit: '',
  vessel: null,
  yardOrder: null
});

export const ui: EconomyUi = $state(initial());

export function showColony(id: string): void {
  const site = siteById(id);
  if (site) ui.site = site.id;
}

export function applyEconomyParams(params: URLSearchParams): void {
  const scenario = params.get('scenario');
  applyScenario(scenario, params.has('broke'));
  if (scenario === 'travel') {
    seedTravel(game);
    ui.vessel ??= ships.vessels.find((v) => v.trip)?.id ?? null;
  }
  if (scenario === 'belt') {
    seedBelt(game, params.has('outpost'), params.get('asteroid') ?? undefined);
    ui.vessel ??= ships.vessels[0]?.id ?? null;
  }
  if (scenario === 'robots') {
    seedRobots(game);
    const moon = siteById('luna');
    if (moon) ui.site = moon.id;
  }
  if (scenario === 'jump') {
    seedJump(game, params.has('outpost'));
    ui.vessel ??= ships.vessels[0]?.id ?? null;
  }
  for (const id of params.get('surveyed')?.split(',') ?? []) completeSurvey(id);
  const tab = params.get('tab');
  const colony = params.get('colony');
  if (params.get('screen') === 'colony') ui.tab = 'people';
  if (isTabId(tab)) ui.tab = tab;
  if (colony) showColony(colony);
  const period = params.get('per');
  if (period === 'day' || period === 'year') ui.period = period;
  const vessel = params.get('vessel');
  if (vessel) ui.vessel = vessel;
  if (params.has('launch'))
    launchUi.ship =
      ships.vessels.find((v) => v.at.kind === 'site' && v.at.site === ui.site && !v.trip)?.id ?? '';
}

export function selectedSite(): Site {
  return economy.sites.find((s) => s.id === ui.site) ?? homeSite();
}

export function resetEconomyScreen(): void {
  resetEconomy();
  resetShips();
  resetSurvey();
  Object.assign(ui, initial());
}
