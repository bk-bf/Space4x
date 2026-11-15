import { buildings, materials, milestone, recipes, shipComponents } from './records.ts';
import type { Body, Building, Component, Material, Recipe, Site } from './types.ts';

export const recipesProducing = (id: string): Recipe[] => recipes.filter((r) => id in r.outputs);
export const recipesConsuming = (id: string): Recipe[] => recipes.filter((r) => id in r.inputs);
export const recipesAt = (buildingId: string): Recipe[] => recipes.filter((r) => r.building === buildingId);

export const milestoneNeeds = (number: number) => milestone(number).needs;

export const unlockedAt = (number: number) => ({
  recipes: recipes.filter((r) => r.milestone === number),
  buildings: buildings.filter((b) => b.milestone === number),
  components: shipComponents.filter((c) => c.milestone === number)
});

export const extractionBodies = (id: string): Body[] => {
  const found = materials.find((m) => m.id === id);
  return [...new Set((found?.sources ?? []).map((s) => s.body))];
};

export const makeSites = (id: string): Site[] => {
  const sites = new Set<Site>();
  for (const r of recipesProducing(id)) {
    const host = buildings.find((b) => b.id === r.building);
    for (const site of host?.where ?? []) sites.add(site);
  }
  return [...sites];
};

export const materialSites = (id: string) => ({ extract: extractionBodies(id), make: makeSites(id) });

export interface ReachOptions {
  upTo?: number;
  thinOnly?: boolean;
  site?: Site;
}

export interface Reach {
  materials: Set<string>;
  recipes: Set<string>;
  buildings: Set<string>;
  components: Set<string>;
}

const included = (item: { milestone: number; thin?: boolean }, upTo: number, thinOnly: boolean): boolean =>
  item.milestone <= upTo && (!thinOnly || item.thin === true);

export const reach = ({ upTo = Infinity, thinOnly = false, site }: ReachOptions = {}): Reach => {
  const have = new Set<string>();
  const used = new Set<string>();
  const built = new Set<string>();
  const made = new Set<string>();
  const thinMaterial = new Set(materials.filter((m: Material) => m.thin).map((m) => m.id));
  const wanted = (id: string) => !thinOnly || thinMaterial.has(id);
  const candidates = buildings.filter(
    (b: Building) => included(b, upTo, thinOnly) && (site === undefined || b.where.includes(site))
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (const b of candidates) {
      if (built.has(b.id)) continue;
      const affordable =
        site !== undefined ||
        b.start === true ||
        (Object.keys(b.cost).every((m) => have.has(m)) && (b.parts ?? []).every((p) => made.has(p)));
      if (affordable) {
        built.add(b.id);
        changed = true;
      }
    }
    for (const m of materials) {
      if (have.has(m.id) || !wanted(m.id)) continue;
      const extracted = (m.sources ?? []).some(
        (s) => built.has(s.building) && (site === undefined || s.body === site)
      );
      if (extracted) {
        have.add(m.id);
        changed = true;
      }
    }
    for (const r of recipes) {
      if (used.has(r.id) || !included(r, upTo, thinOnly) || !built.has(r.building)) continue;
      if (!Object.keys(r.inputs).every((m) => have.has(m))) continue;
      used.add(r.id);
      changed = true;
      for (const out of Object.keys(r.outputs)) if (wanted(out)) have.add(out);
    }
    if (site === undefined) {
      for (const c of shipComponents as Component[]) {
        if (made.has(c.id) || !included(c, upTo, thinOnly)) continue;
        const buildable =
          c.builtAt.some((b) => built.has(b)) && Object.keys(c.cost).every((m) => have.has(m));
        if (buildable) {
          made.add(c.id);
          changed = true;
        }
      }
    }
  }
  return { materials: have, recipes: used, buildings: built, components: made };
};
