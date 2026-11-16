import { milestones } from '#lib/game/data/index.ts';

export const RESEARCH_TABS = ['tree', 'programmes', 'unlocks'] as const;
export type ResearchTab = (typeof RESEARCH_TABS)[number];

export const research: { selected: number; tab: ResearchTab } = $state({ selected: 1, tab: 'tree' });

export function applyResearchParams(params: URLSearchParams): void {
  const n = Number(params.get('milestone'));
  if (milestones.some((m) => m.number === n)) research.selected = n;
  const tab = params.get('rtab');
  const found = RESEARCH_TABS.find((t) => t === tab);
  if (found) research.tab = found;
}
