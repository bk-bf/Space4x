import { classes, statsFor } from '#lib/game/classes.svelte.ts';
import {
  economy,
  hasYard,
  queueShips,
  shipyardsFor,
  standing,
  type Site,
  type YardOrder
} from '#lib/game/economy/index.ts';
import { yardName } from '#lib/game/shipdesign/index.ts';

export function orderShips(site: Site, designId: string, count = 1): YardOrder[] | string {
  const design = classes.find(designId);
  if (!design) return 'That design no longer exists.';
  if (!design.locked) return 'Lock the design before building it.';
  const stats = statsFor(design);
  if (stats.errors > 0) return 'The design has errors.';
  const yard = yardName(design.yard).toLowerCase();
  if (!hasYard(site, design.yard)) return `${site.name} has no ${yard}.`;
  const need = shipyardsFor(stats.dryMass);
  const stand = standing(site, design.yard);
  if (need > stand) return `${design.name} needs ${need} ${yard}s; ${site.name} has ${stand}.`;
  return queueShips(
    economy,
    site,
    { design: design.id, name: design.name, yard: design.yard, cost: stats.cost, dryMass: stats.dryMass },
    count
  );
}
