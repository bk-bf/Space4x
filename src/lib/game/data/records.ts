import components from './components.json';
import milestoneRecords from './milestones.json';
import type { Building, Component, Material, Milestone, Recipe } from './types.ts';

const files = <T>(modules: Record<string, T[]>): { name: string; items: T[] }[] =>
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, items]) => ({ name: path.slice(path.lastIndexOf('/') + 1, -'.json'.length), items }));

const materialFiles = files(
  import.meta.glob<Material[]>('./materials/*.json', { eager: true, import: 'default' })
);
const recipeFiles = files(import.meta.glob<Recipe[]>('./recipes/*.json', { eager: true, import: 'default' }));
const buildingFiles = files(
  import.meta.glob<Building[]>('./buildings/*.json', { eager: true, import: 'default' })
);

export const dataFiles = { materials: materialFiles, recipes: recipeFiles, buildings: buildingFiles };

export const materials: Material[] = materialFiles.flatMap((f) => f.items);
export const recipes: Recipe[] = recipeFiles.flatMap((f) => f.items);
export const buildings: Building[] = buildingFiles.flatMap((f) => f.items);
export const shipComponents = components as unknown as Component[];
export const milestones = (milestoneRecords as Milestone[]).slice().sort((a, b) => a.number - b.number);

const index = <T extends { id: string }>(items: T[]): Map<string, T> => new Map(items.map((i) => [i.id, i]));

const materialIndex = index(materials);
const recipeIndex = index(recipes);
const buildingIndex = index(buildings);
const componentIndex = index(shipComponents);

const lookup =
  <T>(kind: string, map: Map<string, T>) =>
  (id: string): T => {
    const found = map.get(id);
    if (!found) throw new Error(`unknown ${kind}: ${id}`);
    return found;
  };

export const material = lookup('material', materialIndex);
export const recipe = lookup('recipe', recipeIndex);
export const building = lookup('building', buildingIndex);
export const shipComponent = lookup('component', componentIndex);
export const milestone = (number: number): Milestone => {
  const found = milestones.find((m) => m.number === number);
  if (!found) throw new Error(`unknown milestone: ${number}`);
  return found;
};

export const hasMaterial = (id: string) => materialIndex.has(id);
export const hasRecipe = (id: string) => recipeIndex.has(id);
export const hasBuilding = (id: string) => buildingIndex.has(id);
export const hasComponent = (id: string) => componentIndex.has(id);
