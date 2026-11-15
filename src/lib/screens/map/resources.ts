import { materials, type Body as DataBody } from '#lib/game/data/index.ts';

const DATA_BODY: Record<string, DataBody> = {
  earth: 'earth',
  luna: 'moon',
  mars: 'mars',
  venus: 'venus',
  ceres: 'asteroid-c',
  europa: 'icy-moon',
  jupiter: 'gas-giant',
  saturn: 'gas-giant',
  uranus: 'ice-giant',
  neptune: 'ice-giant'
};

const SHOWN = 8;

export function resourcesOf(bodyId: string): string {
  const body = DATA_BODY[bodyId];
  const names = body
    ? materials.filter((m) => m.sources?.some((s) => s.body === body)).map((m) => m.name)
    : [];
  if (!names.length) return 'None known';
  const more = names.length - SHOWN;
  return names.slice(0, SHOWN).join(', ') + (more > 0 ? ` and ${more} more` : '');
}
