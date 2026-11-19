import { economy, siteIn } from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/index.ts';
import { FLYABLE, LANDABLE, NO_SURFACE, placement, type Placement } from '#lib/game/ships/index.ts';
import { bodyGrouper } from './bodyGroups.ts';
import { bodyName } from './shipsView.ts';

export const LAUNCH_CARGO = 'launch';

export const foundPlan: { group: string; place: string; region: string; carrier: string; pick: string } =
  $state({ group: '', place: 'orbit:earth', region: '', carrier: LAUNCH_CARGO, pick: '' });

export interface PlanPlace {
  key: string;
  label: string;
  at: Placement;
  group: string;
  rank: number;
}

export function planPlaces(game: Game): PlanPlace[] {
  const grouper = bodyGrouper(game);
  const out: PlanPlace[] = [];
  for (const b of FLYABLE)
    out.push({
      key: `orbit:${b}`,
      label: NO_SURFACE.includes(b) ? `${bodyName(b)} atmosphere` : `${bodyName(b)} orbit`,
      at: placement('orbit', b),
      ...grouper(b)
    });
  for (const b of LANDABLE)
    out.push({
      key: `surface:${b}`,
      label: `${bodyName(b)} surface`,
      at: placement('surface', b),
      ...grouper(b)
    });
  for (const j of game.world.systems.flatMap((s) => s.jumps))
    out.push({
      key: `point:${j.id}`,
      label: j.name,
      at: placement('orbit', j.id),
      group: 'Jump points',
      rank: 1
    });
  return out;
}

export const siteHere = (p: Placement, region: string | null) =>
  siteIn(economy, p.worldBody, p.place, p.place === 'surface' ? region : null);
