import {
  boostOf,
  building,
  hasProject,
  project,
  projects,
  requiresDone,
  startScientists
} from '#lib/game/data/index.ts';
import type { Lab, Project } from '#lib/game/data/index.ts';
import { MONTH_HOURS } from './calendar.ts';
import type { Economy, LogFn, Programme, Queued, Scientist, Site } from './types.ts';

export const LAB = 'research_lab';
export const IN_FIELD_BONUS = 0.08;
export const OUT_OF_FIELD_BONUS = 0.02;
export const SKILL_MAX = 10;
export const EXPERIENCE_CHANCE = 0.5;
export const RP_EPS = 1e-9;

export const standing = (site: Site, buildingId: string): number =>
  site.groups.filter((g) => g.building === buildingId).reduce((a, g) => a + g.count, 0);

export const labFigures = (): Lab => {
  const lab = building(LAB).lab;
  if (!lab) throw new Error(`${LAB} has no lab figures`);
  return lab;
};

export const researchSite = (eco: Economy): Site | undefined => eco.sites[0];

export function labsActive(eco: Economy): number {
  const site = researchSite(eco);
  if (!site) return 0;
  return site.groups.filter((g) => g.building === LAB && g.on).reduce((a, g) => a + g.count, 0);
}

export const labsInUse = (eco: Economy): number => eco.running.reduce((a, p) => a + p.labs, 0);

export const freeLabs = (eco: Economy): number => Math.max(0, labsActive(eco) - labsInUse(eco));

export const scientistById = (eco: Economy, id: number): Scientist | undefined =>
  eco.scientists.find((s) => s.id === id);

export const leading = (eco: Economy, scientist: number): Programme | undefined =>
  eco.running.find((p) => p.lead === scientist);

export const queueOf = (eco: Economy, scientist: number): Queued[] =>
  eco.queued.filter((q) => q.lead === scientist);

export const bonusOf = (s: Scientist, subject: string): number =>
  (s.subject === subject ? IN_FIELD_BONUS : OUT_OF_FIELD_BONUS) * s.skill;

export const labCap = (eco: Economy, s: Scientist): number => Math.min(s.admin, freeLabs(eco));

export type ProgrammeStatus = 'done' | 'running' | 'queued' | 'ready' | 'locked';

export function programmeStatus(eco: Economy, p: Project): ProgrammeStatus {
  if (eco.done.includes(p.number)) return 'done';
  if (eco.running.some((r) => r.number === p.number)) return 'running';
  if (eco.queued.some((q) => q.number === p.number)) return 'queued';
  return requiresDone(eco.done, p.number) ? 'ready' : 'locked';
}

export const runningProgramme = (eco: Economy, number: number): Programme | undefined =>
  eco.running.find((p) => p.number === number);

export const queuedProgramme = (eco: Economy, number: number): Queued | undefined =>
  eco.queued.find((q) => q.number === number);

export function createProject(eco: Economy, number: number, lead: number, labs: number): boolean {
  const s = scientistById(eco, lead);
  if (!s || !hasProject(number) || programmeStatus(eco, project(number)) !== 'ready') return false;
  if (leading(eco, lead)) {
    eco.queued.push({ number, lead });
    return true;
  }
  eco.running.push({ number, lead, labs: Math.max(0, Math.min(Math.floor(labs), labCap(eco, s))), rp: 0 });
  return true;
}

export const bestFor = (eco: Economy, subject: string, idle = true): Scientist | undefined =>
  eco.scientists
    .filter((s) => !idle || !leading(eco, s.id))
    .sort((a, b) => bonusOf(b, subject) - bonusOf(a, subject) || b.admin - a.admin || a.id - b.id)[0];

export function startProgramme(eco: Economy, number: number): boolean {
  if (!hasProject(number)) return false;
  const s = bestFor(eco, project(number).subject);
  return !!s && createProject(eco, number, s.id, s.admin);
}

export function cancelQueued(eco: Economy, number: number): boolean {
  const i = eco.queued.findIndex((q) => q.number === number);
  if (i < 0) return false;
  eco.queued.splice(i, 1);
  return true;
}

export function setLabs(eco: Economy, number: number, labs: number): boolean {
  const p = runningProgramme(eco, number);
  const s = p && scientistById(eco, p.lead);
  if (!p || !s) return false;
  const most = Math.min(s.admin, p.labs + freeLabs(eco));
  const next = Math.max(0, Math.min(Math.floor(labs), most));
  if (next === p.labs) return false;
  p.labs = next;
  return true;
}

export function trimLabs(eco: Economy): void {
  let over = labsInUse(eco) - labsActive(eco);
  for (const p of [...eco.running].reverse()) {
    if (over <= 0) return;
    const cut = Math.min(p.labs, over);
    p.labs -= cut;
    over -= cut;
  }
}

export const rpPerMonth = (eco: Economy, p: Programme): number => {
  const s = scientistById(eco, p.lead);
  if (!s) return 0;
  return (
    p.labs *
    labFigures().rpPerMonth *
    (1 + bonusOf(s, project(p.number).subject)) *
    boostOf(eco.done, 'research')
  );
};

export const rpPerHour = (eco: Economy, p: Programme): number => rpPerMonth(eco, p) / MONTH_HOURS;

function roll(a: number, b: number, salt: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + salt * 0x27d4eb2f, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface Experience {
  admin: boolean;
  skill: boolean;
}

export function gainExperience(s: Scientist, number: number): Experience {
  const admin = roll(s.id, number, 1) < EXPERIENCE_CHANCE;
  const skill = s.skill < SKILL_MAX && roll(s.id, number, 2) < EXPERIENCE_CHANCE;
  if (admin) s.admin += 1;
  if (skill) s.skill += 1;
  return { admin, skill };
}

const gainText = (s: Scientist, g: Experience): string =>
  `${s.name} gains ${[g.admin ? 'administration' : '', g.skill ? 'skill' : ''].filter(Boolean).join(' and ')}.`;

function moveOn(eco: Economy, s: Scientist, labs: number): Queued | undefined {
  const next = queueOf(eco, s.id).find(
    (q) => requiresDone(eco.done, q.number) && !eco.done.includes(q.number)
  );
  if (!next) return undefined;
  eco.queued.splice(eco.queued.indexOf(next), 1);
  eco.running.push({ number: next.number, lead: s.id, labs, rp: 0 });
  return next;
}

export function finishProgramme(eco: Economy, p: Programme, at: number, log: LogFn): void {
  const site = researchSite(eco)?.id;
  eco.running.splice(eco.running.indexOf(p), 1);
  eco.done.push(p.number);
  const s = scientistById(eco, p.lead);
  if (s) {
    const gained = gainExperience(s, p.number);
    if (gained.admin || gained.skill) log(gainText(s, gained), false, at, site, { project: p.number });
    const next = moveOn(eco, s, p.labs);
    if (next)
      log(`${s.name} moves on to ${project(next.number).name}.`, false, at, site, { project: next.number });
  }
  log(`${project(p.number).name} researched.`, false, at, site, { kind: 'research', project: p.number });
}

export const startingScientists = (): Scientist[] => startScientists.map((s, i) => ({ id: i + 1, ...s }));

export const projectCount = projects.length;
