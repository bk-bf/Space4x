import { describe, expect, it } from 'vitest';
import { buildings, material, recipes } from '#lib/game/data/index.ts';
import { process } from '#lib/game/economy/processes.ts';

const nameOf = (id: string): string => {
  const r = recipes.find((x) => x.id === id)!;
  return process(id, buildings.find((b) => b.id === r.building)!.where[0]!).name;
};

const AFFECTED = [
  ['uranium_enrichment_haleu', 'haleu', 'depleted_uranium'],
  ['uranium_enrichment_heu', 'heu', 'depleted_uranium'],
  ['lithium6_separation', 'lithium6', 'lithium'],
  ['deuterium_separation', 'deuterium', 'water']
] as const;

describe('process names', () => {
  it.each(AFFECTED)('%s is named exactly after %s, not its by-product %s', (id, product, byProduct) => {
    expect(nameOf(id)).toBe(material(product).name);
    expect(nameOf(id)).not.toBe(material(byProduct).name);
  });

  it('names every recipe that declares a product after it', () => {
    for (const r of recipes.filter((x) => x.product !== undefined))
      expect(nameOf(r.id), r.id).toContain(material(r.product!).name);
  });

  it('gives the four affected recipes four different names', () => {
    expect(new Set(AFFECTED.map(([id]) => nameOf(id))).size).toBe(4);
  });
});
