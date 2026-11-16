import { bodyTypeOf, materials } from '#lib/game/data/index.ts';

const SHOWN = 8;

export function resourcesOf(bodyId: string): string {
  const type = bodyTypeOf(bodyId);
  const names = type
    ? materials.filter((m) => m.sources?.some((s) => s.body === type)).map((m) => m.name)
    : [];
  if (!names.length) return 'None known';
  const more = names.length - SHOWN;
  return names.slice(0, SHOWN).join(', ') + (more > 0 ? ` and ${more} more` : '');
}
