import { building } from '#lib/game/data/index.ts';
import { gradeAt } from './deposits.ts';
import { buildingsAt, processesAt, type Process } from './processes.ts';
import type { BuildOrder, Economy, Group, Site } from './types.ts';
import { isUnlocked } from './unlocks.ts';

export const holdsDeposits = (site: Site, p: Process): boolean =>
  Object.keys(p.extracts).every((m) => gradeAt(site, m) !== undefined);

export const unlockedProcesses = (eco: Economy, site: Site, buildingId: string) =>
  processesAt(buildingId, site.body).filter((p) => isUnlocked(eco, p) && holdsDeposits(site, p));

export const buildable = (eco: Economy, site: Site) =>
  buildingsAt(site.body).filter((b) => isUnlocked(eco, b));

export const lockedBuildings = (eco: Economy, site: Site) =>
  buildingsAt(site.body).filter((b) => !isUnlocked(eco, b));

export function assign(
  eco: Economy,
  site: Site,
  groupId: number,
  processId: string,
  count: number
): Group | undefined {
  const g = site.groups.find((x) => x.id === groupId);
  if (!g || g.process === processId) return g;
  if (!unlockedProcesses(eco, site, g.building).some((p) => p.id === processId)) return undefined;
  const n = Math.max(0, Math.min(g.count, Math.floor(count)));
  if (n <= 0) return undefined;
  const into = site.groups.find(
    (x) => x.id !== g.id && x.building === g.building && x.process === processId && x.on === g.on
  );
  if (n === g.count && !into) {
    g.process = processId;
    return g;
  }
  g.count -= n;
  let target = into;
  if (target) target.count += n;
  else {
    target = { id: eco.nextId++, building: g.building, process: processId, count: n, on: g.on };
    site.groups.splice(site.groups.indexOf(g) + 1, 0, target);
  }
  if (g.count <= 0) site.groups.splice(site.groups.indexOf(g), 1);
  return target;
}

export function setOn(site: Site, groupId: number, on: boolean): void {
  const g = site.groups.find((x) => x.id === groupId);
  if (g) g.on = on;
}

export function setActive(site: Site, groupId: number, active: number): void {
  const g = site.groups.find((x) => x.id === groupId);
  if (!g) return;
  const n = Math.max(0, Math.min(g.count, Math.round(active)));
  if (n === g.count) delete g.active;
  else g.active = n;
}

export function switchSome(eco: Economy, site: Site, groupId: number, count: number): Group | undefined {
  const g = site.groups.find((x) => x.id === groupId);
  if (!g) return undefined;
  const n = Math.max(0, Math.min(g.count, Math.floor(count)));
  if (n <= 0) return undefined;
  const into = site.groups.find(
    (x) => x.id !== g.id && x.building === g.building && x.process === g.process && x.on !== g.on
  );
  if (n === g.count && !into) {
    g.on = !g.on;
    return g;
  }
  g.count -= n;
  let target = into;
  if (target) target.count += n;
  else {
    target = { id: eco.nextId++, building: g.building, process: g.process, count: n, on: !g.on };
    site.groups.splice(site.groups.indexOf(g) + 1, 0, target);
  }
  if (g.count <= 0) site.groups.splice(site.groups.indexOf(g), 1);
  return target;
}

export function queueBuilding(
  eco: Economy,
  site: Site,
  buildingId: string,
  processId: string | null,
  count = 1
): BuildOrder[] {
  const b = building(buildingId);
  if (!isUnlocked(eco, b) || !b.where.includes(site.body)) return [];
  const process = processId ?? unlockedProcesses(eco, site, buildingId)[0]?.id ?? null;
  const made: BuildOrder[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(count)); i++) {
    const o: BuildOrder = {
      id: eco.nextId++,
      building: buildingId,
      process,
      done: 0,
      paused: false,
      stalled: null
    };
    site.queue.push(o);
    made.push(o);
  }
  return made;
}

export function moveOrder(site: Site, orderId: number, by: number): void {
  const i = site.queue.findIndex((o) => o.id === orderId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= site.queue.length) return;
  const [o] = site.queue.splice(i, 1);
  if (o) site.queue.splice(j, 0, o);
}

export function pauseOrder(site: Site, orderId: number): void {
  const o = site.queue.find((x) => x.id === orderId);
  if (o) o.paused = !o.paused;
}

export function removeOrder(site: Site, orderId: number): void {
  const i = site.queue.findIndex((o) => o.id === orderId);
  if (i >= 0) site.queue.splice(i, 1);
}
