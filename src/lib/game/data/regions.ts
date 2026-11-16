import asteroidFile from './asteroids.json';
import { material } from './records.ts';
import type { AsteroidRecord, AsteroidType, Body, Region } from './types.ts';

export const GRADE_MIN = 0.05;
export const GRADE_MAX = 4;

export const ASTEROID_BODY: Readonly<Record<AsteroidType, Body>> = {
  carbonaceous: 'asteroid-c',
  stony: 'asteroid-s',
  metallic: 'asteroid-m'
};

export const WORLD_BODIES: Readonly<Record<string, Body>> = {
  earth: 'earth',
  luna: 'moon',
  mercury: 'mercury',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'gas-giant',
  saturn: 'gas-giant',
  uranus: 'ice-giant',
  neptune: 'ice-giant',
  io: 'io',
  europa: 'icy-moon',
  ganymede: 'icy-moon',
  callisto: 'icy-moon',
  enceladus: 'icy-moon',
  titan: 'titan'
};

export const asteroids = asteroidFile as AsteroidRecord[];

const asteroidIndex = new Map(asteroids.map((a) => [a.id, a]));

export const asteroidRecord = (id: string): AsteroidRecord | undefined => asteroidIndex.get(id);

export const isAsteroid = (id: string): boolean => asteroidIndex.has(id);

const files = import.meta.glob<Region[]>('./regions/*.json', { eager: true, import: 'default' });

export const regionFiles = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, items]) => ({ name: path.slice(path.lastIndexOf('/') + 1, -'.json'.length), items }));

const records = regionFiles.flatMap((f) => f.items);
const templates = new Map(records.filter((r) => r.template).map((r) => [r.body, r]));

const generated: Region[] = asteroids
  .filter((a) => !records.some((r) => r.world === a.id))
  .map((a) => {
    const { template: _, ...base } = templates.get(ASTEROID_BODY[a.type])!;
    return { ...base, id: `${a.id}-body`, world: a.id };
  });

export const regions: Region[] = [...records.filter((r) => !r.template), ...generated];

const regionIndex = new Map(regions.map((r) => [r.id, r]));

export const region = (id: string): Region | undefined => regionIndex.get(id);

export const bodyTypeOf = (world: string): Body | undefined => {
  const a = asteroidIndex.get(world);
  return a ? ASTEROID_BODY[a.type] : WORLD_BODIES[world];
};

export const regionsOf = (world: string): Region[] =>
  regions.filter((r) => r.world === world && r.kind === 'ground');

export const atmosphereOf = (world: string): Region | undefined =>
  regions.find((r) => r.world === world && r.kind === 'atmosphere');

const mappedTypes = new Set<Body>(regions.map((r) => r.body));

export function typeHolds(type: Body, materialId: string, atmospheric: boolean): boolean {
  if (type === 'earth' || !mappedTypes.has(type)) return true;
  return regions.some(
    (r) =>
      r.body === type &&
      (r.kind === 'atmosphere') === atmospheric &&
      r.deposits.some((d) => d.material === materialId)
  );
}

export function depositGrade(world: string, regionId: string | null, materialId: string): number | undefined {
  const type = bodyTypeOf(world);
  if (!type) return undefined;
  if (type === 'earth') return 1;
  const source = material(materialId).sources?.find((s) => s.body === type);
  if (!source) return undefined;
  const where = source.how === 'atmosphere' ? atmosphereOf(world) : regionId ? region(regionId) : undefined;
  if (!where || where.world !== world) return undefined;
  return where.deposits.find((d) => d.material === materialId)?.grade;
}
