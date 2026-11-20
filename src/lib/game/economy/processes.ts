import {
  boostOf,
  building,
  buildings,
  hasMaterial,
  material,
  materials,
  recipe,
  recipesAt
} from '#lib/game/data/index.ts';
import type { Amounts, Building, Recipe, Site as Where } from '#lib/game/data/index.ts';
import type { Economy } from './types.ts';

export const POWER = '@power';
export const COMPUTE = 'compute';
export const EXTRACT_KG_PER_HOUR = 1000;
export const extractRate = (materialId: string): number =>
  material(materialId).extractKgH ?? EXTRACT_KG_PER_HOUR;
export const EXTRACT_KW = 200;
export const FOOD_CATEGORY = 'food';
export const WATER = 'water';
export const WATER_DRAWN_ON: Where = 'earth';
export const REAL_PLANTS_ON: Where = 'earth';

const real = (body: Where): boolean => body === REAL_PLANTS_ON;

export const scaleAt = (b: Building, body: Where): number => (real(body) ? (b.scale ?? 1) : 1);

export const workersAt = (b: Building, body: Where): number =>
  real(body) ? b.workers : (b.away?.workers ?? b.workers);

export interface Process {
  id: string;
  name: string;
  building: string;
  research: number;
  inputs: Amounts;
  outputs: Amounts;
  extracts: Amounts;
  water: number;
  upkeep: number;
  estimated: boolean;
}

const EXTRACT = 'extract:';

export const extractionId = (materialId: string): string => `${EXTRACT}${materialId}`;

export const isExtraction = (id: string): boolean => id.startsWith(EXTRACT);

const perHour = (amounts: Amounts, hours: number, scale: number): Amounts =>
  Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, (k === COMPUTE ? v : v / hours) * scale]));

const selfExtracted = (r: Recipe, body: Where): string[] =>
  Object.keys(r.inputs).filter((m) =>
    material(m).sources?.some((s) => s.body === body && s.building === r.building)
  );

function drawnWater(b: Building, body: Where, recipeWater: number, scale: number): number {
  if (body !== WATER_DRAWN_ON) return 0;
  if (real(body) && b.water !== undefined) return b.water;
  return recipeWater * scale;
}

function recipeProcess(r: Recipe, body: Where): Process {
  const b = building(r.building);
  const scale = scaleAt(b, body);
  const inputs = perHour(r.inputs, r.hours, scale);
  const extracts: Amounts = {};
  for (const m of selfExtracted(r, body)) {
    extracts[m] = inputs[m] ?? 0;
    delete inputs[m];
  }
  const power = real(body) && b.power !== undefined ? b.power : r.power * scale;
  if (power > 0) inputs[POWER] = power;
  const water = drawnWater(b, body, r.water ? r.water / r.hours : 0, scale);
  if (water > 0) inputs[WATER] = (inputs[WATER] ?? 0) + water;
  const outputs = perHour(r.outputs, r.hours, scale);
  if (r.generates) outputs[POWER] = r.generates * scale;
  return {
    id: r.id,
    name: processName(r),
    building: r.building,
    research: r.research,
    inputs,
    outputs,
    extracts,
    water,
    upkeep: r.upkeep ?? 0,
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

function extractionProcess(materialId: string, b: Building, body: Where): Process {
  const own = real(body);
  const rate = (own ? b.extracts?.[materialId] : undefined) ?? extractRate(materialId);
  const power = own && b.power !== undefined ? b.power : EXTRACT_KW;
  const water = materialId === WATER ? 0 : drawnWater(b, body, 0, 1);
  const inputs: Amounts = power > 0 ? { [POWER]: power } : {};
  if (water > 0) inputs[WATER] = water;
  return {
    id: extractionId(materialId),
    name: `Extract ${material(materialId).name}`,
    building: b.id,
    research: b.research,
    inputs,
    outputs: { [materialId]: rate },
    extracts: { [materialId]: rate },
    water,
    upkeep: 0,
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
    made = extractionProcess(m, building(source.building), body);
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

export const CHIP_FAB = 'semiconductor_fab';
export const COMPUTE_PROCESS = 'compute_generation';
export const ELECTROLYSIS = 'water_electrolysis';

const isMaterialFlow = (id: string): boolean => id !== POWER && id !== COMPUTE && id !== WATER;

const scaleWhere = (amounts: Amounts, k: number, pick: (id: string) => boolean): Amounts =>
  Object.fromEntries(Object.entries(amounts).map(([m, v]) => [m, pick(m) ? v * k : v]));

export function boosted(eco: Economy, p: Process, buildingId: string): Process {
  const done = eco.done;
  let { inputs, outputs, extracts } = p;
  if (isExtraction(p.id)) {
    const f = boostOf(done, 'extraction');
    if (f !== 1) {
      outputs = scaleWhere(outputs, f, isMaterialFlow);
      extracts = scaleWhere(extracts, f, isMaterialFlow);
    }
  }
  if (buildingId === CHIP_FAB) {
    const f = boostOf(done, 'chip_output');
    if (f !== 1) {
      inputs = scaleWhere(inputs, f, isMaterialFlow);
      outputs = scaleWhere(outputs, f, isMaterialFlow);
    }
  }
  const compute = boostOf(done, 'data_centre_compute');
  if (p.id === COMPUTE_PROCESS && compute !== 1) outputs = scaleWhere(outputs, compute, (m) => m === COMPUTE);
  const electrolysis = boostOf(done, 'electrolysis_power');
  if (p.id === ELECTROLYSIS && electrolysis !== 1)
    inputs = scaleWhere(inputs, electrolysis, (m) => m === POWER);
  if (inputs === p.inputs && outputs === p.outputs && extracts === p.extracts) return p;
  return { ...p, inputs, outputs, extracts };
}
