import type { Milestone, Tier } from '#lib/game/data/index.ts';
import {
  describeMissing,
  missingFor,
  programmeStatus,
  runningProgramme,
  type Economy,
  type Site
} from '#lib/game/economy/index.ts';
import type { Cell } from '#lib/ui/index.ts';
import { shortName } from './format.ts';

const TIERS: Record<Tier, string> = { P: 'Proven', E: 'Engineering', S: 'Speculative' };

export const tierName = (tier: Tier): string => TIERS[tier];

export function statusCell(eco: Economy, site: Site, m: Milestone): Cell {
  const status = programmeStatus(eco, site, m);
  if (status === 'done') return { icon: 'star', text: 'Done' };
  if (status === 'running') {
    const p = runningProgramme(eco, m.number);
    return { icon: 'gear', text: `Running, ${Math.floor((p?.progress ?? 0) * 100)}%` };
  }
  if (status === 'ready') return { icon: 'play', text: 'Ready to start' };
  if (status === 'locked')
    return {
      text: `After ${m.requires.filter((r) => !eco.done.includes(r)).join(', ')}`
    };
  const missing = missingFor(eco, site, m);
  const first = missing[0];
  const head = first
    ? first.kind === 'material'
      ? `${shortName(first.id)} short`
      : describeMissing(first)
    : '';
  return { text: `${head}${missing.length > 1 ? `, +${missing.length - 1}` : ''}`, warn: true };
}
