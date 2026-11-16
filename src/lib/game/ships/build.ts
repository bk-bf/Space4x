import { classes, statsFor } from '#lib/game/classes.svelte.ts';
import { economy, hasYard, queueShips, type Site, type YardOrder } from '#lib/game/economy/index.ts';
import { yardName } from '#lib/game/shipdesign/index.ts';

export function orderShips(site: Site, designId: string, count = 1): YardOrder[] | string {
  const design = classes.find(designId);
  if (!design) return 'That design no longer exists.';
  if (!design.locked) return 'Lock the design before building it.';
  const stats = statsFor(design);
  if (stats.errors > 0) return 'The design has errors.';
  if (!hasYard(site, design.yard)) return `${site.name} has no ${yardName(design.yard).toLowerCase()}.`;
  return queueShips(
    economy,
    site,
    { design: design.id, name: design.name, yard: design.yard, cost: stats.cost, dryMass: stats.dryMass },
    count
  );
}
