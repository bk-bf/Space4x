import { asteroidRecord, building, material, milestone } from '#lib/game/data/index.ts';
import { DEPLETED_EPS, remainingMass } from './deposits.ts';
import { programmeDays } from './programmes.ts';
import { isStockless } from './processes.ts';
import { siteFlows, STOCK_EPS, type SiteFlows } from './flows.ts';
import type { BuildOrder, Economy, LogFn, Site } from './types.ts';

export const SEGMENT_HOURS = 24;
const MAX_SEGMENTS = 100_000;
const MIN_HOURS = 1e-9;

const noLog: LogFn = () => {};

function nextEvent(eco: Economy, site: Site, flows: SiteFlows): number {
  let t = Infinity;
  for (const [m, rate] of Object.entries(flows.net)) {
    if (isStockless(m) || rate >= 0) continue;
    const stock = site.stock[m] ?? 0;
    if (stock > STOCK_EPS) t = Math.min(t, stock / -rate);
  }
  for (const a of flows.actors) {
    if (a.share <= 0) continue;
    if (a.kind === 'build' || a.kind === 'yard') t = Math.min(t, ((1 - a.order.done) * a.hours) / a.share);
    if (a.kind === 'programme') {
      const hours = programmeDays(milestone(a.programme.number)) * 24;
      t = Math.min(t, ((1 - a.programme.progress) * hours) / a.share);
    }
  }
  return t;
}

function placeBuilding(eco: Economy, site: Site, o: BuildOrder): void {
  const same = site.groups.find((g) => g.building === o.building && g.process === o.process && g.on);
  if (same) same.count += 1;
  else site.groups.push({ id: eco.nextId++, building: o.building, process: o.process, count: 1, on: true });
}

function applySegment(
  eco: Economy,
  site: Site,
  flows: SiteFlows,
  hours: number,
  at: number,
  log: LogFn
): void {
  for (const [m, rate] of Object.entries(flows.net)) {
    if (isStockless(m)) continue;
    const next = (site.stock[m] ?? 0) + rate * hours;
    site.stock[m] = Math.abs(next) <= STOCK_EPS * Math.max(1, Math.abs(rate)) ? 0 : next;
  }
  eco.ledger.extracted += flows.extractedMass * hours;
  const body = asteroidRecord(site.worldBody);
  if (body && site.place === 'surface' && flows.extractedMass > 0) {
    const total = Math.min(body.mass, (eco.mined[site.worldBody] ?? 0) + flows.extractedMass * hours);
    eco.mined[site.worldBody] = body.mass - total <= DEPLETED_EPS ? body.mass : total;
    if (body.mass - total <= DEPLETED_EPS && !eco.exhausted.includes(site.worldBody)) {
      eco.exhausted.push(site.worldBody);
      log(`${body.name} has been mined out; ${site.name} has nothing left to extract.`, true, at, site.id);
    }
  }
  eco.ledger.lost += flows.lostMass * hours;
  eco.ledger.built += flows.builtMass * hours;
  eco.ledger.eaten += flows.eatenMass * hours;
  site.population *= Math.exp(flows.growthPerHour * hours);

  for (const a of flows.actors) {
    if (a.kind === 'build') {
      const o = a.order;
      o.done = Math.min(1, o.done + (a.share * hours) / a.hours);
      const short = a.share < 1 - 1e-9 && a.limit?.kind === 'material' ? a.limit.id : null;
      if (short && short !== o.stalled)
        log(
          `${building(o.building).name} at ${site.name} is waiting for ${material(short).name}.`,
          true,
          at,
          site.id
        );
      o.stalled = short;
      if (o.done >= 1 - 1e-9) {
        site.queue.splice(site.queue.indexOf(o), 1);
        placeBuilding(eco, site, o);
        log(`${site.name} finished a ${building(o.building).name}.`, false, at, site.id);
      }
    }
    if (a.kind === 'yard') {
      const o = a.order;
      o.done = Math.min(1, o.done + (a.share * hours) / a.hours);
      const short = a.share < 1 - 1e-9 && a.limit?.kind === 'material' ? a.limit.id : null;
      if (short && short !== o.stalled)
        log(`The ${o.name} at ${site.name} is waiting for ${material(short).name}.`, true, at, site.id);
      o.stalled = short;
      if (o.done >= 1 - 1e-9) {
        site.yard.splice(site.yard.indexOf(o), 1);
        eco.delivered.push({ site: site.id, design: o.design, order: o.id, at });
        log(`${site.name} finished a ${o.name}.`, false, at, site.id);
      }
    }
    if (a.kind === 'programme') {
      const p = a.programme;
      const m = milestone(p.number);
      p.progress = Math.min(1, p.progress + (a.share * hours) / (programmeDays(m) * 24));
      if (p.progress >= 1 - 1e-9) {
        eco.running.splice(eco.running.indexOf(p), 1);
        eco.done.push(p.number);
        log(`Milestone ${p.number} reached: ${m.name}.`, false, at, site.id);
      }
    }
  }

  const hungry = flows.food.cover < 1 - 1e-9;
  if (hungry !== site.alerts.food)
    log(
      hungry ? `${site.name} is short of food; its population is shrinking.` : `${site.name} is fed again.`,
      hungry,
      at,
      site.id
    );
  site.alerts.food = hungry;
  const dark = flows.power.demand > flows.power.supply * (1 + 1e-9);
  if (dark !== site.alerts.power)
    log(
      dark
        ? `${site.name} is short of power; powered work is slowed.`
        : `${site.name} has enough power again.`,
      dark,
      at,
      site.id
    );
  site.alerts.power = dark;
}

function depletionEvent(eco: Economy, all: { site: Site; flows: SiteFlows }[]): number {
  let t = Infinity;
  const rate: Record<string, number> = {};
  for (const { site, flows } of all)
    if (site.place === 'surface' && asteroidRecord(site.worldBody) && flows.extractedMass > 0)
      rate[site.worldBody] = (rate[site.worldBody] ?? 0) + flows.extractedMass;
  for (const [id, r] of Object.entries(rate)) t = Math.min(t, remainingMass(eco, id) / r);
  return t;
}

export function advanceEconomy(eco: Economy, seconds: number, log: LogFn = noLog): void {
  let left = seconds / 3600;
  let segments = 0;
  while (left > MIN_HOURS && segments++ < MAX_SEGMENTS) {
    const now = eco.elapsed / 3600;
    const boundary = (Math.floor(now / SEGMENT_HOURS + 1e-9) + 1) * SEGMENT_HOURS - now;
    let hours = Math.min(left, boundary);
    const all = eco.sites.map((site) => ({ site, flows: siteFlows(eco, site) }));
    for (const { site, flows } of all) hours = Math.min(hours, nextEvent(eco, site, flows));
    hours = Math.min(hours, depletionEvent(eco, all));
    hours = Math.max(hours, 0);
    const at = eco.elapsed + hours * 3600;
    for (const { site, flows } of all) applySegment(eco, site, flows, hours, at, log);
    eco.elapsed = at;
    left -= hours;
  }
}
