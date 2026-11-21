import components from './components.json';
import projectRecords from './research.json';
import robotRecords from './robots.json';
import scientistRecords from './scientists.json';
import type {
  Building,
  Component,
  DigClass,
  Material,
  Project,
  Recipe,
  RobotPart,
  ScientistRecord
} from './types.ts';

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
export const robotParts = robotRecords.parts as RobotPart[];
export const digClasses = robotRecords.classes as Readonly<Record<DigClass, readonly string[]>>;
export const startScientists = scientistRecords as ScientistRecord[];
export const projects = (projectRecords as Project[]).slice().sort((a, b) => a.number - b.number);

const index = <T extends { id: string }>(items: T[]): Map<string, T> => new Map(items.map((i) => [i.id, i]));

const materialIndex = index(materials);
const recipeIndex = index(recipes);
const buildingIndex = index(buildings);
const componentIndex = index(shipComponents);
const robotPartIndex = index(robotParts);

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
export const robotPart = lookup('robot part', robotPartIndex);
const projectIndex = new Map(projects.map((p) => [p.number, p]));

export const project = (number: number): Project => {
  const found = projectIndex.get(number);
  if (!found) throw new Error(`unknown project: ${number}`);
  return found;
};

export const hasProject = (number: number) => projectIndex.has(number);

export const projectById = (id: string): Project => {
  const found = projects.find((p) => p.id === id);
  if (!found) throw new Error(`unknown project: ${id}`);
  return found;
};

export const hasMaterial = (id: string) => materialIndex.has(id);
export const hasRecipe = (id: string) => recipeIndex.has(id);
export const hasBuilding = (id: string) => buildingIndex.has(id);
export const hasComponent = (id: string) => componentIndex.has(id);
export const hasRobotPart = (id: string) => robotPartIndex.has(id);
