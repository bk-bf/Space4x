import { describe, expect, it } from 'vitest';
import {
  advanceEconomy,
  economyHorizon,
  newSite,
  siteFlows,
  siteSupplies,
  startEconomy,
  type Economy,
  type LogTag,
  type Site
} from './index.ts';

const DAY = 86400;

interface Logged {
  text: string;
  warn: boolean;
  day: number;
  site: string | undefined;
  tag: LogTag | undefined;
}

const recorder = () => {
  const logs: Logged[] = [];
  const log = (text: string, warn: boolean, at: number, site?: string, tag?: LogTag) =>
    logs.push({ text, warn, day: at / DAY, site, tag });
  return { logs, log };
};

const outpost = (eco: Economy, people: number, stock: Record<string, number>): Site => {
  const site = newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', angle: 0 })!;
  site.population = people;
  site.workforceShare = 1;
  site.stock = stock;
  return site;
};

const supply = (eco: Economy, site: Site, key: string) =>
  siteSupplies(site, siteFlows(eco, site)).find((s) => s.key === key);

const wheatFor = (people: number, days: number) => (people * 2800 * days) / 3270;

describe('the depletion forecast', () => {
  it('warns that a station runs out of food a set number of days before it does', () => {
    const eco = startEconomy();
    const site = outpost(eco, 6, { wheat: wheatFor(6, 60) });
    expect(supply(eco, site, 'food')?.days).toBeCloseTo(60, 6);
    const { logs, log } = recorder();
    advanceEconomy(eco, 100 * DAY, log, 30);
    const mine = logs.filter((l) => l.site === site.id);
    const warning = mine.find((l) => l.text === 'Luna outpost runs out of food in 30 days.');
    const short = mine.find((l) => l.text.includes('short of food'));
    expect(warning?.tag?.kind).toBe('shortage');
    expect(warning?.warn).toBe(true);
    expect(warning?.day).toBeCloseTo(30, 6);
    expect(short?.day).toBeCloseTo(60, 6);
    expect(mine.indexOf(warning!)).toBeLessThan(mine.indexOf(short!));
    expect(mine.filter((l) => l.text.includes('runs out of food'))).toHaveLength(1);
  });

  it('warns at once when the warning reaches further than the stock already lasts', () => {
    const eco = startEconomy();
    const site = outpost(eco, 6, { wheat: wheatFor(6, 10) });
    const { logs, log } = recorder();
    advanceEconomy(eco, DAY / 4, log, 30);
    const warning = logs.find((l) => l.site === site.id && l.tag?.kind === 'shortage');
    expect(warning?.text).toBe('Luna outpost runs out of food in 10 days.');
    expect(warning?.day).toBe(0);
  });

  it('warns before a reactor runs out of HALEU and power fails', () => {
    const eco = startEconomy();
    const site = outpost(eco, 200, { wheat: wheatFor(200, 1000) });
    site.groups.push(
      { id: eco.nextId++, building: 'fission_reactor', process: 'fission_haleu_power', count: 125, on: true },
      { id: eco.nextId++, building: 'data_centre', process: 'compute_generation', count: 1, on: true }
    );
    site.stock.haleu = 1;
    const flows = siteFlows(eco, site);
    const haleuPerDay = -(flows.net.haleu ?? 0) * 24;
    expect(haleuPerDay).toBeGreaterThan(0);
    expect(flows.power.supply).toBeGreaterThanOrEqual(flows.power.demand);
    site.stock.haleu = haleuPerDay * 50;
    expect(supply(eco, site, 'power:haleu')?.days).toBeCloseTo(50, 6);
    expect(economyHorizon(eco, 30) / DAY).toBeLessThanOrEqual(1);

    const { logs, log } = recorder();
    advanceEconomy(eco, 90 * DAY, log, 30);
    const mine = logs.filter((l) => l.site === site.id);
    const fuel = mine.find((l) => l.tag?.material === 'haleu');
    const dark = mine.find((l) => l.text.includes('short of power'));
    expect(fuel?.text).toBe(
      'Luna outpost runs out of High-assay low-enriched uranium (HALEU) in 30 days; its Fission reactor will stop and power will fail.'
    );
    expect(fuel?.day).toBeCloseTo(20, 6);
    expect(dark?.day).toBeCloseTo(50, 6);
    expect(dark?.tag?.kind).toBe('shortage');
  });

  it('logs no warning for Earth from the start state', () => {
    const eco = startEconomy();
    const { logs, log } = recorder();
    advanceEconomy(eco, 120 * DAY, log, 30);
    expect(logs.filter((l) => l.tag?.kind === 'shortage')).toEqual([]);
  });
});
