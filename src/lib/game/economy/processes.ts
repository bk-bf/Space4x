import {
  building,
  buildings,
  hasMaterial,
  material,
  materials,
  milestones,
  recipe,
  recipesAt
} from '#lib/game/data/index.ts';
import type { Amounts, Building, Recipe, Site as Where } from '#lib/game/data/index.ts';

export const POWER = '@power';
export const COMPUTE = 'compute';
export const EXTRACT_KG_PER_HOUR = 1000;
export const extractRate = (materialId: string): number =>
  material(materialId).extractKgH ?? EXTRACT_KG_PER_HOUR;
export const EXTRACT_KW = 200;
export const FOOD_CATEGORY = 'food';

export interface Process {
  id: string;
  name: string;
  building: string;
  milestone: number;
  inputs: Amounts;
  outputs: Amounts;
  extracts: Amounts;
  estimated: boolean;
}

const EXTRACT = 'extract:';

export const extractionId = (materialId: string): string => `${EXTRACT}${materialId}`;

export const isExtraction = (id: string): boolean => id.startsWith(EXTRACT);

const perHour = (amounts: Amounts, hours: number): Amounts =>
  Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, k === COMPUTE ? v : v / hours]));

const selfExtracted = (r: Recipe, body: Where): string[] =>
  Object.keys(r.inputs).filter((m) =>
    material(m).sources?.some((s) => s.body === body && s.building === r.building)
  );

function recipeProcess(r: Recipe, body: Where): Process {
  const inputs = perHour(r.inputs, r.hours);
  const extracts: Amounts = {};
  for (const m of selfExtracted(r, body)) {
    extracts[m] = inputs[m] ?? 0;
    delete inputs[m];
  }
  if (r.power > 0) inputs[POWER] = r.power;
  const outputs = perHour(r.outputs, r.hours);
  if (r.generates) outputs[POWER] = r.generates;
  return {
    id: r.id,
    name: processName(r),
    building: r.building,
    milestone: r.milestone,
    inputs,
    outputs,
    extracts,
    estimated: r.estimated
  };
}

const mainOutput = (r: Recipe): string | undefined =>
  Object.keys(r.outputs).reduce<string | undefined>(
    (best, id) => (best === undefined || (r.outputs[id] ?? 0) > (r.outputs[best] ?? 0) ? id : best),
    undefined
  );

const leadOutput = (r: Recipe): string | undefined => r.product ?? mainOutput(r);

const largestInput = (r: Recipe): string | undefined =>
  Object.keys(r.inputs).reduce<string | undefined>(
    (best, id) => (best === undefined || (r.inputs[id] ?? 0) > (r.inputs[best] ?? 0) ? id : best),
    undefined
  );

function processName(r: Recipe): string {
  const names = (ids: string[]) => ids.map((m) => material(m).name).join(' and ');
  if (r.generates) {
    const ins = Object.keys(r.inputs);
    return ins.length ? `Power from ${names(ins)}` : 'Generate power';
  }
  const main = leadOutput(r);
  if (!main) return 'Process';
  if (main in r.inputs) return `Recycle ${material(main).name}`;
  const total = Object.values(r.outputs).reduce((a, v) => a + v, 0);
  const products = r.product
    ? [material(r.product).name]
    : Object.entries(r.outputs)
        .filter(([, v]) => v >= total * 0.1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([m]) => material(m).name);
  const name = products.join(' and ');
  const twin = recipesAt(r.building).some((o) => o.id !== r.id && leadOutput(o) === main);
  const from = largestInput(r);
  return twin && from ? `${name} from ${material(from).name}` : name;
}

function extractionProcess(materialId: string, b: Building): Process {
  return {
    id: extractionId(materialId),
    name: `Extract ${material(materialId).name}`,
    building: b.id,
    milestone: b.milestone,
    inputs: { [POWER]: EXTRACT_KW },
    outputs: { [materialId]: extractRate(materialId) },
    extracts: { [materialId]: extractRate(materialId) },
    estimated: true
  };
}

const cache = new Map<string, Process>();

export function process(id: string, body: Where): Process {
  const key = `${body}|${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let made: Process;
  if (isExtraction(id)) {
    const m = id.slice(EXTRACT.length);
    const source = material(m).sources?.find((s) => s.body === body);
    if (!source) throw new Error(`${m} cannot be extracted on ${body}`);
    made = extractionProcess(m, building(source.building));
  } else made = recipeProcess(recipe(id), body);
  cache.set(key, made);
  return made;
}

export function processesAt(buildingId: string, body: Where): Process[] {
  const b = building(buildingId);
  const recs = recipesAt(buildingId);
  const own = new Set(recs.flatMap((r) => selfExtracted(r, body)));
  const extraction = materials
    .filter((m) => !own.has(m.id) && m.sources?.some((s) => s.body === body && s.building === b.id))
    .map((m) => process(extractionId(m.id), body));
  return [...extraction, ...recs.map((r) => process(r.id, body))];
}

export const buildingsAt = (body: Where): Building[] => buildings.filter((b) => b.where.includes(body));

export const isMass = (id: string): boolean => id !== POWER && hasMaterial(id) && !material(id).unit;

export const isStockless = (id: string): boolean => id === POWER || id === COMPUTE;

export const isFood = (id: string): boolean => hasMaterial(id) && material(id).category === FOOD_CATEGORY;

export const foodIds = materials.filter((m) => m.category === FOOD_CATEGORY).map((m) => m.id);

export const lastMilestone = milestones.length;
