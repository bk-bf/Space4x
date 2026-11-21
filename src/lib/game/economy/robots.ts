import { building } from '#lib/game/data/index.ts';
import {
  chassisFor,
  digRate,
  isDiggable,
  isNearEarth,
  robotStatsOf,
  robots as registry,
  runsOnboard,
  ROBOT_COMPUTE
} from '#lib/game/robots/index.ts';
import { gradeAt, siteDeposits } from './deposits.ts';
import { queueShips } from './yard.ts';
import type { Economy, RobotGroup, Site, YardOrder } from './types.ts';

export const ROBOT_YARD = 'rocket_factory';

export const robotsWorkHere = (site: Site): boolean =>
  site.place === 'surface' && site.region !== null && site.body !== 'earth';

export const robotTotal = (site: Site, design?: string): number =>
  site.robots.reduce((a, r) => a + (design === undefined || r.design === design ? r.count : 0), 0);

export const idleRobots = (site: Site, design: string): number =>
  site.robots.reduce((a, r) => a + (r.design === design && r.material === null ? r.count : 0), 0);

function joinGroup(eco: Economy, site: Site, design: string, material: string | null, n: number): void {
  const same = site.robots.find((r) => r.design === design && r.material === material);
  if (same) same.count += n;
  else site.robots.push({ id: eco.nextId++, design, count: n, material });
}

export function bestMaterial(site: Site, design: string): string | null {
  const stats = robotStatsOf(design);
  if (!stats || !robotsWorkHere(site) || stats.chassis !== chassisFor(site.worldBody)) return null;
  let best: string | null = null;
  let most = 0;
  for (const m of diggable(site)) {
    const rate = digRate(stats, m) * (gradeAt(site, m) ?? 0);
    if (rate > most + 1e-12) {
      most = rate;
      best = m;
    }
  }
  return best;
}

export function diggable(site: Site): string[] {
  if (!robotsWorkHere(site)) return [];
  return [...new Set(siteDeposits(site).ground.map((d) => d.material))].filter(isDiggable);
}

export function addRobots(eco: Economy, site: Site, design: string, n: number): void {
  if (n <= 0) return;
  joinGroup(eco, site, design, bestMaterial(site, design), n);
}

export function takeRobots(site: Site, design: string, n: number): number {
  let left = Math.max(0, Math.floor(n));
  let taken = 0;
  const order = [...site.robots]
    .filter((r) => r.design === design)
    .sort((a, b) => (a.material === null ? -1 : 0) - (b.material === null ? -1 : 0));
  for (const r of order) {
    if (left <= 0) break;
    const k = Math.min(left, r.count);
    r.count -= k;
    left -= k;
    taken += k;
  }
  site.robots = site.robots.filter((r) => r.count > 0);
  return taken;
}

export function assignRobots(
  eco: Economy,
  site: Site,
  groupId: number,
  material: string | null,
  count?: number
): void {
  const g = site.robots.find((r) => r.id === groupId);
  if (!g || g.material === material) return;
  const n = Math.max(0, Math.min(g.count, Math.floor(count ?? g.count)));
  if (n <= 0) return;
  g.count -= n;
  site.robots = site.robots.filter((r) => r.count > 0);
  joinGroup(eco, site, g.design, material, n);
}

export const chargingKw = (site: Site): number =>
  site.groups.reduce((a, g) => a + (g.on ? (building(g.building).charger?.kw ?? 0) * g.count : 0), 0);

export function earthOperated(eco: Economy): number {
  let need = 0;
  for (const site of eco.sites) {
    if (!robotsWorkHere(site) || !isNearEarth(site.worldBody)) continue;
    for (const r of site.robots) {
      const stats = r.material ? robotStatsOf(r.design) : undefined;
      if (stats && !runsOnboard(stats)) need += ROBOT_COMPUTE * r.count;
    }
  }
  return need;
}

export function queueRobots(eco: Economy, site: Site, designId: string, count = 1): YardOrder[] | string {
  const design = registry.find(designId);
  if (!design) return 'That robot no longer exists.';
  if (!design.locked) return 'Lock the robot before building it.';
  const stats = robotStatsOf(designId);
  if (!stats || stats.errors > 0) return 'The robot has errors.';
  const made = queueShips(
    eco,
    site,
    { design: design.id, name: design.name, yard: ROBOT_YARD, cost: stats.cost, dryMass: stats.mass },
    count
  );
  if (!made.length) return `${site.name} has no rocket factory.`;
  for (const o of made) o.robot = true;
  return made;
}

export const robotGroup = (site: Site, id: number): RobotGroup | undefined =>
  site.robots.find((r) => r.id === id);
