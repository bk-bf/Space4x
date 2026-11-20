import { hasProject } from '#lib/game/data/index.ts';
import { economy, startProgramme, touch } from '#lib/game/economy/index.ts';

export const RESEARCH_TABS = ['tree', 'programmes', 'unlocks', 'scientists'] as const;
export type ResearchTab = (typeof RESEARCH_TABS)[number];

export interface Plan {
  lead: number | null;
  labs: number;
  touched: boolean;
}

export const research: {
  selected: number;
  tab: ResearchTab;
  scientist: number | null;
  plans: Record<number, Plan>;
} = $state({ selected: 1, tab: 'tree', scientist: null, plans: {} });

export function planOf(number: number): Plan {
  if (!research.plans[number]) research.plans[number] = { lead: null, labs: 0, touched: false };
  return research.plans[number];
}

export function applyResearchParams(params: URLSearchParams): void {
  const n = Number(params.get('project'));
  if (hasProject(n)) research.selected = n;
  const tab = params.get('rtab');
  const found = RESEARCH_TABS.find((t) => t === tab);
  if (found) research.tab = found;
  const s = Number(params.get('scientist'));
  if (Number.isInteger(s) && s > 0) research.scientist = s;
  for (const v of params.getAll('start')) if (startProgramme(economy, Number(v))) touch();
}
