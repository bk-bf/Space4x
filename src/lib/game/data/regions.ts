import asteroidFile from './asteroids.json';
import cometFile from './comets.json';
import moonFile from './moons.json';
import { material } from './records.ts';
import type { AsteroidRecord, AsteroidType, Body, CometRecord, MoonRecord, Region } from './types.ts';

export const GRADE_MIN = 0.05;
export const GRADE_MAX = 4;

export const ASTEROID_BODY: Readonly<Record<AsteroidType, Body>> = {
  carbonaceous: 'asteroid-c',
  stony: 'asteroid-s',
  metallic: 'asteroid-m',
  icy: 'icy-moon'
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

export const moons = moonFile as MoonRecord[];

export const comets = cometFile as CometRecord[];

const asteroidIndex = new Map(asteroids.map((a) => [a.id, a]));
const moonIndex = new Map(moons.map((m) => [m.id, m]));
const cometIndex = new Map(comets.map((c) => [c.id, c]));

export const asteroidRecord = (id: string): AsteroidRecord | undefined => asteroidIndex.get(id);

export const moonRecord = (id: string): MoonRecord | undefined => moonIndex.get(id);

export const cometRecord = (id: string): CometRecord | undefined => cometIndex.get(id);

export const depletableRecord = (id: string): AsteroidRecord | CometRecord | undefined =>
  asteroidIndex.get(id) ?? cometIndex.get(id);

export const diameterOf = (id: string): number | undefined =>
  (asteroidIndex.get(id) ?? moonIndex.get(id) ?? cometIndex.get(id))?.diameter;

const smallTypes = new Map<string, Body>([
  ...asteroids.map((a): [string, Body] => [a.id, ASTEROID_BODY[a.type]]),
  ...moons.map((m): [string, Body] => [m.id, ASTEROID_BODY[m.type]]),
  ...comets.map((c): [string, Body] => [c.id, 'comet'])
]);

export const isSmallBody = (id: string): boolean => smallTypes.has(id);

const files = import.meta.glob<Region[]>('./regions/*.json', { eager: true, import: 'default' });

export const regionFiles = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, items]) => ({ name: path.slice(path.lastIndexOf('/') + 1, -'.json'.length), items }));

const records = regionFiles.flatMap((f) => f.items);
const templates = new Map(records.filter((r) => r.template).map((r) => [r.body, r]));

const generated: Region[] = [...smallTypes]
  .filter(([id]) => !records.some((r) => r.world === id))
  .map(([id, type]) => {
    const { template: _, ...base } = templates.get(type)!;
    return { ...base, id: `${id}-body`, world: id };
  });

export const regions: Region[] = [...records.filter((r) => !r.template), ...generated];

const regionIndex = new Map(regions.map((r) => [r.id, r]));

export const region = (id: string): Region | undefined => regionIndex.get(id);

export const bodyTypeOf = (world: string): Body | undefined => smallTypes.get(world) ?? WORLD_BODIES[world];

const groundOf = new Map<string, Region[]>();
const airOf = new Map<string, Region>();
for (const r of regions)
  if (r.kind === 'ground') groundOf.set(r.world, [...(groundOf.get(r.world) ?? []), r]);
  else if (!airOf.has(r.world)) airOf.set(r.world, r);

export const regionsOf = (world: string): Region[] => groundOf.get(world) ?? [];

export const atmosphereOf = (world: string): Region | undefined => airOf.get(world);

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
