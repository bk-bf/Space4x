import { economy } from '#lib/game/economy/index.ts';
import { bodyPosition, game, parkingRadius, sitePosition, type Game } from '#lib/game/index.ts';
import { ships, stateOf, vesselById, vesselState } from '#lib/game/ships/index.ts';
import type { SiteKind } from '#lib/game/index.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { Located, Point, Target } from './mapCamera';

export const target = (kind: string, id: string | number): Target => `${kind}:${id}`;

export function splitTarget(t: Target): [string, string] {
  const i = t.indexOf(':');
  return [t.slice(0, i), t.slice(i + 1)];
}

export function locate(t: Target, g: Game = game): Located | undefined {
  const [kind, id] = splitTarget(t),
    sys = g.starSystem(g.world.system);
  if (kind === 'body') {
    const b = g.body(id);
    if (!b || b.system !== g.world.system) return undefined;
    const [x, y] = bodyPosition(b, g.world.bodies);
    return { x, y, radius: b.radius };
  }
  if (kind === 'star') {
    const s = sys?.stars[Number(id)];
    return s ? { x: s.x, y: s.y, radius: s.radius } : undefined;
  }
  if (kind === 'fleet') {
    const f = g.fleet(id);
    return f && f.system === g.world.system ? { x: f.x, y: f.y } : undefined;
  }
  if (kind === 'contact') {
    const c = g.contact(id);
    return c && c.system === g.world.system ? { x: c.x, y: c.y } : undefined;
  }
  if (kind === 'jump') {
    const j = sys?.jumps.find((p) => p.id === id);
    return j ? { x: j.x, y: j.y } : undefined;
  }
  if (kind === 'ship') {
    const v = vesselById(id),
      st = v ? vesselState(g, v) : undefined;
    return st ? { x: st.pos[0], y: st.pos[1] } : undefined;
  }
  if (kind === 'base') {
    const st = stateOf(g, { kind: 'site', site: id });
    return st ? { x: st.pos[0], y: st.pos[1] } : undefined;
  }
  if (kind === 'site') {
    const site = g.site(id),
      p = site && site.system === g.world.system ? sitePosition(g, site) : undefined;
    return p ? { x: p[0], y: p[1] } : undefined;
  }
  return undefined;
}

export function nameOf(t: Target | null, g: Game = game): string {
  if (!t) return 'free';
  const [kind, id] = splitTarget(t);
  if (kind === 'body') return g.body(id)?.name ?? 'free';
  if (kind === 'star') return g.starSystem(g.world.system)?.stars[Number(id)]?.name ?? 'free';
  if (kind === 'fleet') return g.fleet(id)?.name ?? 'free';
  if (kind === 'contact') return id;
  if (kind === 'jump') return g.starSystem(g.world.system)?.jumps.find((j) => j.id === id)?.name ?? 'free';
  if (kind === 'site') return g.site(id)?.name ?? 'free';
  if (kind === 'ship') return vesselById(id)?.name ?? 'free';
  if (kind === 'base') return economy.sites.find((s) => s.id === id)?.name ?? 'free';
  return 'free';
}

export interface Preset {
  id: string;
  label: string;
  L: number;
  aim: Target | Point;
}

const SYSTEM_MARGIN = 0.92;
const INNER_MARGIN = 1.1;
const STAR_FILL = 0.3;
const BODY_FILL = 0.25;
const FLEET_PARKED_FILL = 0.3;
const FLEET_ROAMING_L = 6;
const SHIP_VIEW_M = 4e6;
const GIANTS: readonly PlanetType[] = ['gas', 'saturn', 'ice', 'ice2'];
export const SITE_VIEW_L: Readonly<Record<SiteKind, number>> = {
  yard: 0.4,
  harvester: 0.3,
  battle: 0.56,
  boarding: 0.1,
  salvage: 0.26,
  gate: 0.34
};

export function systemExtent(g: Game, system: string): number {
  const sys = g.starSystem(system);
  const reach = [
    ...g.world.bodies.filter((b) => b.system === system && !b.parent).map((b) => b.orbit + b.radius),
    ...(sys?.stars ?? []).map((s) => Math.hypot(s.x, s.y) + s.radius),
    ...(sys?.jumps ?? []).map((j) => Math.hypot(j.x, j.y))
  ];
  return Math.max(1e9, ...reach);
}

function innerExtent(g: Game, system: string): number {
  const rocky = g.world.bodies
    .filter((b) => b.system === system && !b.parent && !GIANTS.includes(b.type))
    .map((b) => b.orbit);
  return rocky.length ? Math.max(...rocky) * INNER_MARGIN : systemExtent(g, system) / 4;
}

const fit = (metres: number, px: number) => Math.log10(metres / Math.max(1, px));

export function presets(g: Game, fw: number, fh: number): Preset[] {
  const system = g.world.system,
    sys = g.starSystem(system),
    half = Math.min(fw, fh) / 2;
  const list: Preset[] = [
    { id: 'system', label: 'System', L: fit(systemExtent(g, system), half * SYSTEM_MARGIN), aim: [0, 0] },
    { id: 'inner', label: 'Inner system', L: fit(innerExtent(g, system), half), aim: [0, 0] }
  ];
  (sys?.stars ?? []).forEach((s, i) =>
    list.push({
      id: i ? `star${i}` : 'star',
      label: s.name,
      L: fit(s.radius, fh * STAR_FILL),
      aim: target('star', i)
    })
  );
  for (const b of g.world.bodies)
    if (b.system === system && b.colony)
      list.push({ id: b.id, label: b.name, L: fit(b.radius, fh * BODY_FILL), aim: target('body', b.id) });
  for (const f of g.world.fleets)
    if (f.system === system) {
      const home = f.at ? g.body(f.at) : undefined;
      list.push({
        id: f.id,
        label: f.name,
        L: home ? fit(parkingRadius(home), fh * FLEET_PARKED_FILL) : FLEET_ROAMING_L,
        aim: target('fleet', f.id)
      });
    }
  for (const v of ships.vessels)
    list.push({
      id: v.id,
      label: v.name,
      L: v.trip ? FLEET_ROAMING_L : fit(SHIP_VIEW_M, fh * FLEET_PARKED_FILL),
      aim: target('ship', v.id)
    });
  for (const base of economy.sites.filter((x) => x.place === 'orbit'))
    list.push({
      id: base.id,
      label: base.name,
      L: fit(SHIP_VIEW_M, fh * FLEET_PARKED_FILL),
      aim: target('base', base.id)
    });
  for (const site of g.world.sites)
    if (site.system === system)
      list.push({
        id: site.id,
        label: site.name,
        L: SITE_VIEW_L[site.kind],
        aim: target('site', site.id)
      });
  return list;
}

export function presetFor(g: Game, id: string, fw: number, fh: number): Preset | undefined {
  const known = presets(g, fw, fh).find((p) => p.id === id);
  if (known) return known;
  const b = g.body(id);
  if (b && b.system === g.world.system)
    return { id, label: b.name, L: fit(b.radius, fh * BODY_FILL), aim: target('body', b.id) };
  return undefined;
}
