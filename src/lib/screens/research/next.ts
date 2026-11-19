import {
  building,
  material,
  milestone,
  milestones,
  recipes,
  recipesProducing,
  shipComponent,
  shortName,
  type Body,
  type Milestone,
  type SiteNeed
} from '#lib/game/data/index.ts';
import {
  extractionId,
  isUnlocked,
  missingFor,
  process,
  programmeDays,
  programmeStatus,
  siteNeedCheck,
  type Economy,
  type GroupActor,
  type Missing,
  type ProgrammeStatus,
  type Site,
  type SiteFlows
} from '#lib/game/economy/index.ts';
import { shipClasses } from '#lib/game/classes.svelte.ts';
import { ships } from '#lib/game/ships/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';
import * as fmt from '#lib/ui/format.ts';
import { bodyWords, daysToMeet, netRate, placeWords, regionName, worldName } from './programme.ts';

export type EconomyTab = 'yard' | 'launch' | 'ships' | 'people';

export type Place =
  | { kind: 'research'; milestone: number }
  | { kind: 'production'; site: string; group: number; target?: string; count?: number }
  | { kind: 'construction'; site: string; building: string; recipe?: string }
  | { kind: 'stockpiles'; site: string; material: string }
  | { kind: 'economy'; site: string; tab: EconomyTab }
  | { kind: 'classes' };

export interface Step {
  text: string;
  place: Place;
}

export interface Goal {
  milestone: number | undefined;
  status: ProgrammeStatus | 'finished';
  blocker: string;
  icon?: IconRef;
  step: Step;
  missing: number;
}

export interface World {
  eco: Economy;
  home: Site;
  flows: (site: Site) => SiteFlows;
  designs: number;
  vessels: { onLaunchSite: boolean }[];
}

const SWITCH_DAYS = 30;
const DEPTH = 3;

const article = (name: string): string => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);

const siteName = (w: World, site: Site): string => (site === w.home ? 'home' : site.name);

const at = (w: World, site: Site): string => (site === w.home ? '' : ` at ${site.name}`);

export function liveWorld(eco: Economy, home: Site, flows: (site: Site) => SiteFlows): World {
  const launchSites = new Set(
    eco.sites
      .filter((s) => s.groups.some((g) => g.building === 'launch_site' && g.count > 0))
      .map((s) => s.id)
  );
  return {
    eco,
    home,
    flows,
    designs: shipClasses().filter((d) => d.locked).length,
    vessels: ships.vessels.map((v) => ({ onLaunchSite: v.at.kind === 'site' && launchSites.has(v.at.site) }))
  };
}

export function shipStep(w: World, purpose: string): Step {
  if (!w.designs) return { text: `Design and lock a ship class to ${purpose}`, place: { kind: 'classes' } };
  if (!w.vessels.length)
    return { text: `Build a ship to ${purpose}`, place: { kind: 'economy', site: w.home.id, tab: 'yard' } };
  if (w.vessels.every((v) => v.onLaunchSite))
    return {
      text: `Launch a ship to ${purpose}`,
      place: { kind: 'economy', site: w.home.id, tab: 'launch' }
    };
  return { text: `Send a ship to ${purpose}`, place: { kind: 'economy', site: w.home.id, tab: 'ships' } };
}

function whereWords(where: readonly string[]): string {
  if (where.includes('orbit')) return 'in orbit';
  if (where.includes('jump-point')) return 'at the jump point';
  const body = where.find((x): x is Body => x !== 'orbit' && x !== 'jump-point');
  return body ? `on ${bodyWords(body)}` : 'somewhere new';
}

export function buildStep(w: World, id: string, prefer?: Site): Step {
  const b = building(id);
  if (!isUnlocked(w.eco, b))
    return { text: `${b.name} is not open yet`, place: { kind: 'research', milestone: b.milestone } };
  const sites = [prefer, w.home, ...w.eco.sites].filter((s): s is Site => !!s && b.where.includes(s.body));
  const site = sites[0];
  if (site)
    return {
      text: `Build ${article(b.name)}${at(w, site)}`,
      place: { kind: 'construction', site: site.id, building: id }
    };
  return shipStep(w, `found a site ${whereWords(b.where)} with ${article(b.name)}`);
}

export interface Way {
  process: string;
  building: string;
  name: string;
  perHour: number;
}

export function waysToMake(w: World, site: Site, id: string): Way[] {
  const recipes = recipesProducing(id)
    .filter((r) => isUnlocked(w.eco, r) && building(r.building).where.includes(site.body))
    .map((r) => {
      const p = process(r.id, site.body);
      return { process: r.id, building: r.building, name: p.name, perHour: p.outputs[id] ?? 0 };
    });
  const mined = (material(id).sources ?? [])
    .filter((s) => s.body === site.body && isUnlocked(w.eco, building(s.building)))
    .map((s) => {
      const p = process(extractionId(id), site.body);
      return { process: p.id, building: s.building, name: p.name, perHour: p.outputs[id] ?? 0 };
    });
  return [...mined, ...recipes];
}

const groupsOf = (w: World, site: Site): GroupActor[] =>
  w.flows(site).actors.filter((a): a is GroupActor => a.kind === 'group');

export function materialStep(w: World, site: Site, id: string, short: number, depth = 0): Step {
  const name = material(id).name;
  const stockpiles: Place = { kind: 'stockpiles', site: site.id, material: id };
  const net = netRate(w.flows(site), id);
  if (net > 1e-12)
    return {
      text: `${name} in ${fmt.days(daysToMeet(0, short, net))} at the current rate${at(w, site)}`,
      place: stockpiles
    };
  const groups = groupsOf(w, site);
  const ways = waysToMake(w, site, id);
  for (const way of ways) {
    const running = groups.find((g) => g.group.process === way.process && g.group.count > 0);
    if (!running) continue;
    const held = running.limit;
    if (held?.kind === 'material' && held.id !== id && depth < DEPTH) {
      const next = materialStep(w, site, held.id, 1, depth + 1);
      return { ...next, text: `${material(held.id).name} for ${name}: ${lower(next.text)}` };
    }
    if (running.share > 1e-9)
      return { text: `${name} is used as fast as it is made${at(w, site)}`, place: stockpiles };
    return {
      text: `${building(way.building).name} makes no ${name}${at(w, site)}`,
      place: { kind: 'production', site: site.id, group: running.group.id }
    };
  }
  for (const way of ways) {
    const from = groups
      .filter(
        (g) => g.group.building === way.building && g.group.process !== way.process && g.group.count > 0
      )
      .sort((x, y) => y.group.count - x.group.count)[0];
    if (!from) continue;
    const want = Math.ceil(short / Math.max(1e-9, way.perHour * 24 * SWITCH_DAYS));
    const count = Math.max(1, Math.min(from.group.count, want));
    return {
      text: `Switch ${count === 1 ? article(building(way.building).name) : `${fmt.group(count)} ${building(way.building).name}`} to ${way.name}${at(w, site)}`,
      place: { kind: 'production', site: site.id, group: from.group.id, target: way.process, count }
    };
  }
  const way = ways[0];
  if (way) {
    const step = buildStep(w, way.building, site);
    return step.place.kind === 'construction'
      ? {
          text: `${step.text} to make ${name}`,
          place: { ...step.place, ...(way.process.startsWith('extract:') ? {} : { recipe: way.process }) }
        }
      : step;
  }
  return {
    text: `${name} cannot be made${site === w.home ? ' at home' : ` at ${site.name}`} yet`,
    place: stockpiles
  };
}

const lower = (text: string): string => text.replace(/^./, (c) => c.toLowerCase());

function foundWords(need: SiteNeed): string {
  const parts = [
    need.world ? `on ${worldName(need.world)}` : '',
    need.body ? `on ${bodyWords(need.body)}` : '',
    need.place && !need.world && !need.body ? lower(placeWords(need.place)) : '',
    need.region ? `in ${regionName(need.region)}` : ''
  ].filter(Boolean);
  const crew = need.people ? ` with ${fmt.group(need.people)} crew` : '';
  return `found a site ${parts.join(' ') || 'there'}${crew}`;
}

export function siteStep(w: World, need: SiteNeed): Step {
  const check = siteNeedCheck(w.eco, need);
  const site = check.site;
  const gap = check.criteria.find((c) => !c.ok);
  if (gap?.kind === 'flown') return shipStep(w, `fly on a ${shipComponent(gap.id).name}`);
  if (!site) return shipStep(w, foundWords(need));
  if (!gap) return { text: `${need.label}`, place: { kind: 'economy', site: site.id, tab: 'people' } };
  switch (gap.kind) {
    case 'building':
      return buildStep(w, gap.id, site);
    case 'people': {
      const more = gap.need - gap.have;
      return shipStep(
        w,
        `bring ${fmt.group(more)} more ${more === 1 ? 'person' : 'people'} to ${siteName(w, site)}`
      );
    }
    case 'fed':
      return {
        text: `Feed the people at ${siteName(w, site)}`,
        place: { kind: 'economy', site: site.id, tab: 'people' }
      };
    case 'stock':
      return site === w.home
        ? shipStep(w, `bring ${material(gap.material).name} home`)
        : materialStep(w, site, gap.material, gap.need - gap.have);
    case 'made':
      return materialStep(w, site, gap.material, gap.need - gap.have);
    case 'ran': {
      const group = groupsOf(w, site).find((g) => g.group.building === gap.id || g.group.process === gap.id);
      return group
        ? {
            text: `Keep it running at ${siteName(w, site)}: ${fmt.duration((gap.need - gap.have) * 3600)} to go`,
            place: { kind: 'production', site: site.id, group: group.group.id }
          }
        : buildStep(w, recipes.find((r) => r.id === gap.id)?.building ?? gap.id, site);
    }
    case 'built':
      return {
        text: `Build a ship at ${siteName(w, site)}`,
        place: { kind: 'economy', site: site.id, tab: 'yard' }
      };
    default:
      return shipStep(w, foundWords(need));
  }
}

export function stepFor(w: World, m: Milestone, x: Missing): Step {
  switch (x.kind) {
    case 'requires':
      return { text: `Reach ${shortName(x.number)} first`, place: { kind: 'research', milestone: x.number } };
    case 'building':
    case 'builder': {
      const need = (m.needs.sites ?? []).find((n) => n.buildings?.includes(x.id));
      return need && !siteNeedCheck(w.eco, need).criteria.every((c) => c.ok)
        ? siteStep(w, need)
        : buildStep(w, x.id);
    }
    case 'site': {
      const need = (m.needs.sites ?? []).find((s) => s.label === x.label);
      return need ? siteStep(w, need) : { text: x.label, place: { kind: 'research', milestone: m.number } };
    }
    case 'material':
      return materialStep(w, w.home, x.id, x.need - x.have);
  }
}

export function blockerText(x: Missing): string {
  switch (x.kind) {
    case 'requires':
      return `Needs ${shortName(x.number)}`;
    case 'building':
      return `No ${building(x.id).name} standing`;
    case 'builder':
      return `No ${building(x.id).name} to build parts`;
    case 'site':
      return x.label;
    case 'material': {
      const unit = material(x.id).unit;
      return `${material(x.id).name}: ${fmt.amount(x.have, unit)} of ${fmt.amount(x.need, unit)}`;
    }
  }
}

function blockerIcon(x: Missing): { icon?: IconRef } {
  if (x.kind === 'material') return { icon: { kind: 'material', id: x.id } };
  if (x.kind === 'building' || x.kind === 'builder') return { icon: { kind: 'building', id: x.id } };
  return {};
}

export function nextMilestone(eco: Economy, home: Site): Milestone | undefined {
  const status = (m: Milestone) => programmeStatus(eco, home, m);
  return milestones.find((m) => status(m) === 'ready') ?? milestones.find((m) => status(m) === 'waiting');
}

export function goalOf(w: World): Goal {
  const m = nextMilestone(w.eco, w.home);
  if (m) {
    const missing = missingFor(w.eco, w.home, m);
    const first = missing[0];
    if (!first)
      return {
        milestone: m.number,
        status: 'ready',
        blocker: 'Ready to start',
        step: { text: 'Start the programme', place: { kind: 'research', milestone: m.number } },
        missing: 0
      };
    return {
      milestone: m.number,
      status: 'waiting',
      blocker: blockerText(first),
      ...blockerIcon(first),
      step: stepFor(w, m, first),
      missing: missing.length
    };
  }
  const running = [...w.eco.running].sort(
    (a, b) =>
      (1 - a.progress) * programmeDays(milestone(a.number)) -
      (1 - b.progress) * programmeDays(milestone(b.number))
  )[0];
  if (running) {
    const left = (1 - running.progress) * programmeDays(milestone(running.number));
    return {
      milestone: running.number,
      status: 'running',
      blocker: `Running, ${fmt.days(left)} left`,
      step: { text: 'Wait for it to finish', place: { kind: 'research', milestone: running.number } },
      missing: 0
    };
  }
  return {
    milestone: undefined,
    status: 'finished',
    blocker: 'Every milestone reached',
    step: { text: 'Every milestone reached', place: { kind: 'research', milestone: milestones.length } },
    missing: 0
  };
}
