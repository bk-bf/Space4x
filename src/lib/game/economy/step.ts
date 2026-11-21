import { WARN_DAYS } from '#lib/game/alerts.ts';
import { building, depletableRecord, finiteContent, material, project } from '#lib/game/data/index.ts';
import { DEPLETED_EPS, remainingMass, reserveLeft } from './deposits.ts';
import { finishProgramme, RP_EPS, trimLabs } from './programmes.ts';
import { isStockless } from './processes.ts';
import { arrivalsAt, siteFlows, STOCK_EPS, teleopShare, type SiteFlows } from './flows.ts';
import { elevatorBases } from './elevator.ts';
import { nextWarning, supplyText, supplyWarnings } from './forecast.ts';
import { chargeUpkeep, marketEvents, marketHours } from './market.ts';
import { startShips } from './yard.ts';
import { addRobots } from './robots.ts';
import type { BuildOrder, Economy, LogFn, Site } from './types.ts';
import { addBuildings, berthsOf, kitOf, packKit, standsHere } from './housing.ts';

export const SEGMENT_HOURS = 24;
const MAX_SEGMENTS = 100_000;
const MIN_HOURS = 1e-9;

const noLog: LogFn = () => {};

function nextEvent(eco: Economy, site: Site, flows: SiteFlows, warnDays: number): number {
  let t = nextWarning(site, flows, warnDays);
  const berths = berthsOf(site);
  if (flows.growthPerHour > 0 && berths !== null && site.population > 0)
    t = Math.min(t, Math.log(berths / site.population) / flows.growthPerHour);
  for (const [m, rate] of Object.entries(flows.net)) {
    if (isStockless(m) || rate >= 0) continue;
    const stock = site.stock[m] ?? 0;
    if (stock > STOCK_EPS) t = Math.min(t, stock / -rate);
  }
  for (const a of flows.actors) {
    if (a.share <= 0) continue;
    if (a.kind === 'build' || a.kind === 'yard') t = Math.min(t, ((1 - a.order.done) * a.hours) / a.share);
    if (a.kind === 'programme' && a.rate > 0)
      t = Math.min(t, (project(a.programme.number).rp - a.programme.rp) / (a.rate * a.share));
  }
  return t;
}

function reserveRates(site: Site, flows: SiteFlows): Record<string, number> {
  const rates: Record<string, number> = {};
  if (site.place !== 'surface') return rates;
  for (const a of flows.actors) {
    if (a.share <= 0) continue;
    for (const [m, v] of Object.entries(a.extracts))
      if (finiteContent(site.worldBody, m) !== undefined) rates[m] = (rates[m] ?? 0) + v * a.share;
  }
  return rates;
}

function drawReserves(
  eco: Economy,
  site: Site,
  flows: SiteFlows,
  hours: number,
  at: number,
  log: LogFn
): void {
  for (const [m, rate] of Object.entries(reserveRates(site, flows))) {
    const content = finiteContent(site.worldBody, m) ?? Infinity;
    const total = Math.min(content, (eco.drawn[m] ?? 0) + rate * hours);
    const spent = content - total <= DEPLETED_EPS;
    eco.drawn[m] = spent ? content : total;
    if (spent)
      log(`${site.name} has used up its reserves of ${material(m).name}.`, true, at, site.id, {
        kind: 'shortage',
        material: m
      });
  }
}

function placeBuilding(eco: Economy, site: Site, o: BuildOrder): void {
  if (kitOf(o.building) && !standsHere(o.building, site)) packKit(eco, site, o.building);
  else addBuildings(eco, site, o.building, o.process, 1);
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
  const body = depletableRecord(site.worldBody);
  if (body && site.place === 'surface' && flows.extractedMass > 0) {
    const total = Math.min(body.mass, (eco.mined[site.worldBody] ?? 0) + flows.extractedMass * hours);
    eco.mined[site.worldBody] = body.mass - total <= DEPLETED_EPS ? body.mass : total;
    if (body.mass - total <= DEPLETED_EPS && !eco.exhausted.includes(site.worldBody)) {
      eco.exhausted.push(site.worldBody);
      log(`${body.name} has been mined out; ${site.name} has nothing left to extract.`, true, at, site.id, {
        kind: 'shortage'
      });
    }
  }
  drawReserves(eco, site, flows, hours, at, log);
  eco.ledger.lost += flows.lostMass * hours;
  eco.ledger.built += flows.builtMass * hours;
  eco.ledger.eaten += flows.eatenMass * hours;
  site.population *= Math.exp(flows.growthPerHour * hours);
  const berths = berthsOf(site);
  if (flows.growthPerHour > 0 && berths !== null) site.population = Math.min(site.population, berths);

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
        log(`${site.name} finished a ${building(o.building).name}.`, false, at, site.id, {
          kind: 'finished'
        });
      }
    }
    if (a.kind === 'yard') {
      const o = a.order;
      o.done = Math.min(1, o.done + (a.share * hours) / a.hours);
      if (o.done >= 1 - 1e-9) {
        site.yard.splice(site.yard.indexOf(o), 1);
        if (o.robot) addRobots(eco, site, o.design, 1);
        else eco.delivered.push({ site: site.id, design: o.design, order: o.id, at });
        log(`${site.name} finished a ${o.name}.`, false, at, site.id, { kind: 'finished' });
      }
    }
    if (a.kind === 'programme') {
      const p = a.programme;
      const cost = project(p.number).rp;
      p.rp = Math.min(cost, p.rp + a.rate * a.share * hours);
      if (p.rp >= cost - RP_EPS) finishProgramme(eco, p, at, log);
    }
  }
}

function checkAlerts(site: Site, flows: SiteFlows, at: number, log: LogFn, warnDays: number): void {
  const hungry = flows.food.cover < 1 - 1e-9;
  if (hungry !== site.alerts.food)
    log(
      hungry ? `${site.name} is short of food; its population is shrinking.` : `${site.name} is fed again.`,
      hungry,
      at,
      site.id,
      hungry ? { kind: 'shortage' } : undefined
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
      site.id,
      dark ? { kind: 'shortage' } : undefined
    );
  site.alerts.power = dark;
  const firm = flows.grid.firmShort;
  if (firm !== (site.alerts.firm ?? false))
    log(
      firm
        ? `${site.name}'s firm capacity is short of peak demand.`
        : `${site.name}'s firm capacity covers peak demand again.`,
      firm,
      at,
      site.id,
      firm ? { kind: 'shortage' } : undefined
    );
  site.alerts.firm = firm;
  forecast(site, flows, at, log, warnDays);
}

function forecast(site: Site, flows: SiteFlows, at: number, log: LogFn, warnDays: number): void {
  const soon = supplyWarnings(site, flows, warnDays).filter((s) => s.days > 1e-6);
  const before = new Set(site.alerts.soon ?? []);
  for (const s of soon)
    if (!before.has(s.key))
      log(supplyText(site, s), true, at, site.id, {
        kind: 'shortage',
        ...(s.material ? { material: s.material } : {})
      });
  const keys = soon.map((s) => s.key);
  if (keys.length || site.alerts.soon) site.alerts.soon = keys;
}

function depletionEvent(eco: Economy, all: SiteState[]): number {
  let t = Infinity;
  const rate: Record<string, number> = {};
  for (const { site, flows } of all)
    if (site.place === 'surface' && depletableRecord(site.worldBody) && flows.extractedMass > 0)
      rate[site.worldBody] = (rate[site.worldBody] ?? 0) + flows.extractedMass;
  for (const [id, r] of Object.entries(rate)) t = Math.min(t, remainingMass(eco, id) / r);
  for (const { site, flows } of all)
    for (const [m, r] of Object.entries(reserveRates(site, flows)))
      if (r > 0) t = Math.min(t, reserveLeft(eco, site.worldBody, m) / r);
  return t;
}

type SiteState = { site: Site; flows: SiteFlows };

function segmentHours(eco: Economy, all: SiteState[], left: number, warnDays: number): number {
  const now = eco.elapsed / 3600;
  const boundary = (Math.floor(now / SEGMENT_HOURS + 1e-9) + 1) * SEGMENT_HOURS - now;
  let hours = Math.min(left, boundary);
  for (const { site, flows } of all) hours = Math.min(hours, nextEvent(eco, site, flows, warnDays));
  hours = Math.min(hours, depletionEvent(eco, all), marketHours(eco));
  return Math.max(hours, 0);
}

const statesOf = (eco: Economy, log?: LogFn): SiteState[] => {
  trimLabs(eco);
  if (log) for (const site of eco.sites) startShips(eco, site, eco.elapsed, log);
  let operated = 1;
  const flows = new Map<Site, SiteFlows>();
  const receiving = eco.sites.filter((site) => elevatorBases(eco, site).length > 0);
  eco.sites.forEach((site, i) => {
    if (receiving.includes(site)) return;
    const f = siteFlows(eco, site, i === 0 ? 1 : operated, {});
    if (i === 0) operated = teleopShare(f);
    flows.set(site, f);
  });
  for (const site of receiving)
    flows.set(
      site,
      siteFlows(
        eco,
        site,
        operated,
        arrivalsAt(eco, site, (base) => flows.get(base) ?? siteFlows(eco, base, operated, {}))
      )
    );
  return eco.sites.map((site) => ({ site, flows: flows.get(site)! }));
};

export function economyHorizon(eco: Economy, warnDays = WARN_DAYS): number {
  return segmentHours(eco, statesOf(eco), Infinity, warnDays) * 3600;
}

export function advanceEconomy(
  eco: Economy,
  seconds: number,
  log: LogFn = noLog,
  warnDays = WARN_DAYS
): void {
  let left = seconds / 3600;
  let segments = 0;
  let all = statesOf(eco, log);
  for (const { site, flows } of all) checkAlerts(site, flows, eco.elapsed, log, warnDays);
  while (left > MIN_HOURS && segments++ < MAX_SEGMENTS) {
    if (segments > 1) {
      all = statesOf(eco, log);
      for (const { site, flows } of all) checkAlerts(site, flows, eco.elapsed, log, warnDays);
    }
    const hours = segmentHours(eco, all, left, warnDays);
    const at = eco.elapsed + hours * 3600;
    chargeUpkeep(eco, hours);
    for (const { site, flows } of all) applySegment(eco, site, flows, hours, at, log);
    eco.elapsed = at;
    marketEvents(eco, log);
    left -= hours;
  }
}
