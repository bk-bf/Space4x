import {
  AU,
  bodyPosition,
  FLEET_SENSOR,
  sitePosition,
  type Contact,
  type Game,
  type SelectionKind,
  type StarSystem
} from '#lib/game/index.ts';
import { asteroidRecord } from '#lib/game/data/index.ts';
import { economy } from '#lib/game/economy/index.ts';
import { positionAt } from '#lib/game/flight/index.ts';
import { stateOf, tripOptionOf, vesselById, vesselState, ships } from '#lib/game/ships/index.ts';
import { drawSphere, sphereReach } from '#lib/gfx/bodies/sphere.ts';
import { drawStar, starReach } from '#lib/gfx/bodies/star.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { clamp, hash, mix } from '#lib/gfx/math.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import type { SunTint } from '#lib/gfx/sun.ts';
import { METRES_PER_UNIT } from '#lib/gfx/topdown/index.ts';
import { select } from '#lib/ui/index.ts';
import { cam, flyToTarget, hopTo, layers, MAP_SCALE } from './camera.svelte';
import { LABEL_H, type Anchor, type LabelLine } from './labels';
import { type Point, type Target } from './mapCamera';
import {
  ASTEROID_COLOUR,
  asteroidMark,
  baseMark,
  bodyMark,
  BODY_COLOUR,
  brackets,
  clipLine,
  jumpMark,
  MARK_R,
  orbitArc,
  SIDE_COLOUR,
  starMark
} from './markers';
import {
  contactGroup,
  drawShipGroup,
  fleetGroup,
  vesselGroup,
  type ShipGroup,
  type ShipTally,
  type ShipView
} from './shipLayer';
import { SCENE_REACH, sceneOf, siteIcon, siteMark, type SceneLabel } from './sites/index';
import { target } from './targets';

const MARKER_BELOW = 2.5;
const CAP_WIDTHS = 1.25;
const CAP_EASE = 0.45;
const BIG_LABEL = 110;
const UNDER_MARK = 6;
const UNDER_DISC = 13;
const TRAIL_M = 0.6 * AU;
const BELT_MIN = 60;
const BELT_MAX = 900;
const BELT_DENSITY = 5;
const YEAR_S = 365.25 * 86_400;
const FOCUS_PRI = 100;
const SITE_PRI = 5;
const SCENE_LABEL_PRI = 1;
const NEAR_UNIT_PX = 0.75;
const DRAWN_PRI = 50;
const ASTEROID_NAMES_BELOW = 1.5e9;
const ASTEROID_PLUS_BELOW = 5e9;
const ASTEROID_BASE_PRI = 1;
const ASTEROID_MAX_BOOST = 4;
const HOSTILE_PRI = 15;
const PRIORITY: Record<PlanetType | 'star', number> = {
  star: 20,
  gas: 12,
  saturn: 12,
  ice: 10,
  ice2: 10,
  terran: 9,
  mars: 8,
  venus: 7,
  rock: 6
};

interface MapBody {
  key: Target;
  id: string;
  name: string;
  star: boolean;
  selectable: boolean;
  asteroid?: number;
  w: Point;
  r: number;
  orbit: number;
  parent?: string;
  type: PlanetType | 'star';
  tint?: SunTint;
  look?: { type: PlanetType; rot: number; tilt?: number; rings?: boolean; lights?: boolean };
  col: RGB;
  p: Point;
  R: number;
  mk: boolean;
  capped: boolean;
  hide: boolean;
  list: LabelLine[];
}

const ss = (v: number) => {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
};

function mapBodies(game: Game, system: StarSystem | undefined): MapBody[] {
  const blank = { p: [0, 0] as Point, R: 0, mk: false, capped: false, hide: false, list: [] as LabelLine[] };
  const stars: MapBody[] = (system?.stars ?? []).map((s, i) => ({
    ...blank,
    list: [],
    key: target('star', i),
    id: String(i),
    name: s.name,
    star: true,
    selectable: false,
    w: [s.x, s.y],
    r: s.radius,
    orbit: 0,
    type: 'star',
    tint: s.tint,
    col: s.tint ? s.tint.core[1] : [255, 216, 112]
  }));
  const here = game.world.bodies.filter((b) => b.system === game.world.system);
  const planets: MapBody[] = [...here.filter((b) => !b.parent), ...here.filter((b) => b.parent)].map((b) => ({
    ...blank,
    list: [],
    key: target('body', b.id),
    id: b.id,
    name: b.name,
    star: false,
    selectable: true,
    w: bodyPosition(b, game.world.bodies),
    r: b.radius,
    orbit: b.orbit,
    parent: b.parent,
    type: b.type,
    look: {
      type: b.type,
      rot: (b.orbit % 1e11) * 1e-11 + 0.6,
      tilt: b.tilt,
      rings: b.rings,
      lights: b.colony && b.type === 'terran'
    },
    ...(asteroidRecord(b.id) ? { asteroid: asteroidRecord(b.id)!.diameter } : {}),
    col: asteroidRecord(b.id) ? ASTEROID_COLOUR[asteroidRecord(b.id)!.type] : BODY_COLOUR[b.type]
  }));
  return [...stars, ...planets];
}

function trail(c: Contact): Point[] {
  const pts: Point[] = [[c.x, c.y]],
    n = c.route.length;
  let budget = TRAIL_M,
    x = c.x,
    y = c.y;
  for (let k = 1; k <= n && budget > 0; k++) {
    const [px, py] = c.route[(((c.leg - k) % n) + n) % n]!,
      d = Math.hypot(px - x, py - y);
    if (d >= budget) {
      pts.push([x + ((px - x) / d) * budget, y + ((py - y) / d) * budget]);
      break;
    }
    pts.push([px, py]);
    budget -= d;
    x = px;
    y = py;
  }
  return pts;
}

let cacheKey = '';
let lastKey = '';
let cache: Uint8ClampedArray | null = null;
let useCache = true;

export function setFrameCache(on: boolean): void {
  useCache = on;
  cacheKey = lastKey = '';
}

export interface MapFrame {
  anchors: Anchor[];
  ships: ShipTally;
  live: string[];
}

export function drawMap(f: FB, game: Game, t: number, dt = 0): MapFrame {
  const s = cam.s,
    [ccx, ccy] = cam.centre,
    { ox, oy, w: fw, h: fh } = cam.frame,
    S = (x: number, y: number): Point => [ox + (x - ccx) / s, oy + (y - ccy) / s],
    vis = (p: Point, r = 0) => p[0] > -r && p[1] > -r && p[0] < f.w + r && p[1] < f.h + r,
    system = game.starSystem(game.world.system),
    sel = game.selection,
    aim = cam.aim,
    cap = fw * CAP_WIDTHS,
    E = fh * CAP_EASE;
  const bodies = mapBodies(game, system),
    byId = new Map(bodies.filter((b) => !b.star).map((b) => [b.id, b]));
  for (const b of bodies) {
    let p = S(b.w[0], b.w[1]);
    const Rt = b.r / s;
    let R = Rt;
    b.mk = Rt < MARKER_BELOW;
    if (b.mk) R = MARK_R;
    if (Rt > cap) {
      const dx = p[0] - ox,
        dy = p[1] - oy,
        d = Math.hypot(dx, dy) || 1e-9,
        e = d - Rt,
        q = e / Rt;
      const eB = e < 0 ? (e * cap) / Rt : E * (1 - Math.exp(-q * 6) + (q > 2 ? (q - 2) * (q - 2) * 3 : 0));
      const e2 = e < 0 ? eB : mix(Math.min(e, 1e6), eB, ss((Rt / cap - 1) / 3)),
        d2 = cap + e2;
      p = [ox + (dx / d) * d2, oy + (dy / d) * d2];
      R = cap;
      b.capped = true;
    }
    b.p = p;
    b.R = R;
    if (b.parent) {
      const P = byId.get(b.parent);
      if (!P || P.mk || Math.hypot(p[0] - P.p[0], p[1] - P.p[1]) < P.R + R + 4) b.hide = true;
    }
  }
  const shown = bodies.filter((b) => !b.hide);
  const liveStar = shown.some((b) => b.star && !b.mk && vis(b.p, starReach(b.R)));
  const key = [
    ccx,
    ccy,
    s,
    f.w,
    f.h,
    ox,
    oy,
    game.world.system,
    game.elapsed,
    layers.Orbits,
    layers.Asteroids,
    sel.kind === 'body' ? sel.id : '',
    aim ?? ''
  ].join('|');
  if (useCache && !liveStar && key === cacheKey && cache) f.d.set(cache);
  else {
    f.start();
    if (layers.Orbits)
      for (const b of shown)
        if (
          b.orbit > 0 &&
          (b.asteroid === undefined || aim === b.key || (sel.kind === 'body' && sel.id === b.id))
        ) {
          const P = b.parent ? byId.get(b.parent) : undefined;
          if (P?.capped) continue;
          const c = P ? P.p : S(0, 0);
          orbitArc(f, c[0], c[1], b.orbit / s, PAL.orbit);
        }
    if (layers.Asteroids && system?.belt) drawBelt(f, S, s, game.elapsed, system.belt);
    for (const b of shown) {
      if (b.mk) {
        if (b.star) starMark(f, b.p[0], b.p[1], b.tint?.core[0], b.tint?.core[2]);
        else if (b.asteroid !== undefined) asteroidMark(f, b.p[0], b.p[1], b.col, s < ASTEROID_PLUS_BELOW);
        else bodyMark(f, b.p[0], b.p[1], b.col, !!b.parent, !!b.look?.rings);
      } else if (b.star) drawStar(f, b.p[0], b.p[1], b.R, t, b.tint);
      else if (b.look && vis(b.p, sphereReach(b.look, b.R))) drawSphere(f, b.look, b.p[0], b.p[1], b.R);
    }
    if (useCache && !liveStar && key === lastKey) {
      cache = cache && cache.length === f.d.length ? cache : new Uint8ClampedArray(f.d.length);
      cache.set(f.d);
      cacheKey = key;
    }
  }
  lastKey = key;

  const under = (P: Point): MapBody | undefined => {
    let best: MapBody | undefined,
      bd = Infinity;
    for (const b of shown) {
      if (b.capped) continue;
      const d = Math.hypot(P[0] - b.p[0], P[1] - b.p[1]);
      if (d < b.R + (b.mk ? UNDER_MARK : UNDER_DISC) && d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  };
  const an: Anchor[] = [];
  const pickOf = (t: Target, selectable: boolean, kind?: SelectionKind, id?: string) => ({
    pick: () => {
      if (selectable && kind && id) select(kind, id);
      hopTo(t);
    },
    centre: () => flyToTarget(t)
  });

  const selFleet = sel.kind === 'fleet' ? game.fleet(sel.id) : undefined;
  if (selFleet && selFleet.system === game.world.system) {
    if (layers.Sensors) {
      const P = S(selFleet.x, selFleet.y);
      orbitArc(f, P[0], P[1], FLEET_SENSOR / s, PAL.sensor, 3, t >> 2);
    }
  }

  const selShip = sel.kind === 'ship' ? vesselById(sel.id) : undefined;
  const tripOption = selShip?.trip ? tripOptionOf(selShip.id) : undefined;
  if (selShip?.trip && tripOption && layers.Course) {
    const t0 = game.elapsed,
      t1 = selShip.trip.arrival,
      pts = Array.from({ length: 49 }, (_, i) => {
        const p = positionAt(tripOption, t0 + ((t1 - t0) * i) / 48).pos;
        return S(p[0], p[1]);
      });
    for (let i = 1; i < pts.length; i++)
      clipLine(f, pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], PAL.course, 3, t >> 1);
  }

  const contacts = game.world.contacts.filter((c) => c.system === game.world.system);
  for (const c of contacts)
    if (c.hostile && c.route.length && c.speedKmS > 0) {
      const pts = trail(c).map(([x, y]) => S(x, y));
      for (let i = 1; i < pts.length; i++)
        clipLine(f, pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], PAL.hot, 4, t >> 2);
    }

  for (const j of system?.jumps ?? []) {
    const P = S(j.x, j.y),
      key2 = target('jump', j.id),
      b = under(P),
      text = j.stable
        ? `${j.name}, stable`
        : j.surveyed === false
          ? `${j.name}, unsurveyed`
          : `${j.name}, unstable`;
    if (b) {
      b.list.push({ id: key2, text, target: key2, ...pickOf(key2, true, 'jump', j.id) });
      continue;
    }
    if (!vis(P, 20)) continue;
    jumpMark(f, P[0], P[1], t, !!j.stable);
    an.push({
      id: key2,
      text,
      x: P[0],
      y: P[1],
      rx: 6,
      ry: 6,
      sel: sel.kind === 'jump' && sel.id === j.id,
      pri: aim === key2 ? FOCUS_PRI : 4,
      target: key2,
      ...pickOf(key2, true, 'jump', j.id)
    });
  }

  const star = system?.stars[0] ?? { x: 0, y: 0 },
    sun = S(star.x, star.y),
    St = METRES_PER_UNIT / s,
    tally: ShipTally = { marker: 0, icon: 0, true: 0 },
    view: ShipView = { project: S, pxPerMetre: 1 / s, tier: cam.tier, sun, t };
  const sites = game.world.sites
    .filter((x) => x.system === game.world.system)
    .flatMap((site) => {
      const w = sitePosition(game, site);
      return w ? [{ site, w, P: S(w[0], w[1]), key: target('site', site.id) }] : [];
    });
  const live = St >= NEAR_UNIT_PX ? sites.filter((x) => vis(x.P, SCENE_REACH * St + 40)) : [];
  const hidden = new Set(
    live.flatMap((x) => ('contact' in x.site.place ? [target('contact', x.site.place.contact)] : []))
  );
  const sitePicks = (key: Target, id: string) => pickOf(key, true, 'site', id);
  for (const { site, w, P, key } of live) {
    const labels: SceneLabel[] = [],
      picks = sitePicks(key, site.id),
      chosen = sel.kind === 'site' && sel.id === site.id;
    sceneOf(site).draw(
      {
        f,
        W: (x, y) => [P[0] + x * St, P[1] + y * St],
        S: St,
        dt,
        frame: t * 3,
        sun: Math.atan2(star.y - w[1], star.x - w[0])
      },
      labels
    );
    an.push({
      id: key,
      text: site.name,
      cls: site.hostile ? 'hot' : 'fl',
      x: P[0],
      y: P[1],
      rx: 6,
      ry: 6,
      sel: chosen,
      pri: aim === key ? FOCUS_PRI : SITE_PRI,
      target: key,
      ...picks
    });
    for (const l of labels)
      an.push({
        id: `${key}/${l.key}`,
        text: l.text,
        cls: l.cls,
        x: l.x,
        y: l.y,
        rx: l.r,
        ry: l.r,
        pri: SCENE_LABEL_PRI,
        solid: false,
        target: key,
        ...picks
      });
  }

  const groups: ShipGroup[] = [
    ...game.world.fleets
      .filter((x) => x.system === game.world.system)
      .map((x) => fleetGroup(x, sel.kind === 'fleet' && sel.id === x.id)),
    ...contacts.map((c) => contactGroup(c, sel.kind === 'contact' && sel.id === c.id)),
    ...ships.vessels.flatMap((v) => {
      const st = vesselState(game, v);
      return st
        ? [
            vesselGroup(
              v,
              st.pos[0],
              st.pos[1],
              Math.atan2(st.vel[1], st.vel[0]),
              sel.kind === 'ship' && sel.id === v.id,
              v.trip ? 0.7 : 0
            )
          ]
        : [];
    })
  ];
  for (const g of groups) {
    if (hidden.has(g.key)) continue;
    const P = S(g.x, g.y),
      picks = pickOf(g.key, true, g.kind, g.id),
      b = under(P);
    if (b) {
      b.list.push({
        id: g.key,
        text: g.label,
        cls: g.side === 'foe' ? 'hot' : 'fl',
        target: g.key,
        ...picks
      });
      continue;
    }
    if (!vis(P, 200)) continue;
    for (const m of drawShipGroup(f, g, view, tally))
      an.push({
        id: m.key,
        text: m.text,
        cls: g.side === 'foe' ? 'hot' : g.contact ? '' : 'fl',
        x: m.x,
        y: m.y,
        rx: m.rx,
        ry: m.ry,
        sel: g.selected,
        pri: aim === g.key ? FOCUS_PRI : g.contact ? (g.side === 'foe' ? HOSTILE_PRI : 2) : 3,
        target: g.key,
        ...picks
      });
  }

  for (const base of economy.sites.filter((x) => x.place === 'orbit' || x.place === 'point')) {
    const st = stateOf(game, { kind: 'site', site: base.id });
    if (!st) continue;
    const P = S(st.pos[0], st.pos[1]),
      key = target('base', base.id),
      picks = pickOf(key, true, 'base', base.id),
      chosen = sel.kind === 'base' && sel.id === base.id,
      host = under(P);
    if (host) {
      host.list.push({ id: key, text: base.name, cls: 'fl', target: key, ...picks });
      continue;
    }
    if (!vis(P, 20)) continue;
    baseMark(f, P[0], P[1], SIDE_COLOUR.civ);
    an.push({
      id: key,
      text: base.name,
      cls: 'fl',
      x: P[0],
      y: P[1],
      rx: 5,
      ry: 5,
      sel: chosen,
      pri: aim === key ? FOCUS_PRI : SITE_PRI,
      target: key,
      ...picks
    });
    if (chosen) brackets(f, P[0], P[1], 8, 6);
  }

  for (const { site, P, key } of sites) {
    if (live.some((x) => x.key === key)) continue;
    const picks = sitePicks(key, site.id),
      chosen = sel.kind === 'site' && sel.id === site.id,
      line: LabelLine = { id: key, text: site.name, cls: site.hostile ? 'hot' : 'fl', target: key, ...picks },
      host =
        'contact' in site.place
          ? target('contact', site.place.contact)
          : 'jump' in site.place
            ? target('jump', site.place.jump)
            : null,
      at = host ? an.findIndex((a) => a.id === host) : -1;
    if (at >= 0) {
      const a = an[at]!;
      an[at] = { ...a, lines: [...(a.lines ?? []), line] };
      continue;
    }
    const b = under(P);
    if (b) {
      if (cam.tier !== 'far') b.list.push(line);
      continue;
    }
    if (host || !vis(P, 20)) continue;
    const half =
      cam.tier === 'far'
        ? (siteMark(f, site, P[0], P[1], t), 4)
        : siteIcon(f, site, P[0], P[1], Math.atan2(sun[1] - P[1], sun[0] - P[0]), t);
    an.push({
      id: key,
      text: site.name,
      cls: site.hostile ? 'hot' : 'fl',
      x: P[0],
      y: P[1],
      rx: half,
      ry: half,
      sel: chosen,
      pri: aim === key ? FOCUS_PRI : SITE_PRI,
      solid: cam.tier !== 'far',
      target: key,
      ...picks
    });
    if (chosen) brackets(f, P[0], P[1], half + 3, half + 1);
  }

  for (const b of shown) {
    const chosen = b.selectable && sel.kind === 'body' && sel.id === b.id,
      picks = pickOf(b.key, b.selectable, 'body', b.id),
      pri =
        aim === b.key
          ? FOCUS_PRI
          : b.capped || !b.mk
            ? DRAWN_PRI
            : b.asteroid !== undefined
              ? ASTEROID_BASE_PRI + Math.min(ASTEROID_MAX_BOOST, Math.log10(1 + b.asteroid))
              : PRIORITY[b.type],
      named = b.asteroid === undefined || chosen || aim === b.key || s < ASTEROID_NAMES_BELOW || !b.mk,
      base = {
        id: b.key,
        ...(named ? { text: b.name } : {}),
        sel: chosen,
        pri,
        lines: b.list,
        target: b.key,
        ...picks
      };
    if (b.capped) {
      if (!vis(b.p, b.R)) continue;
      const rows = 1 + b.list.length;
      an.push({
        ...base,
        x: ox - fw / 2 + 4,
        y: oy + fh / 2 - 4 - (rows * LABEL_H) / MAP_SCALE,
        rx: 0,
        ry: 0,
        fixed: true,
        solid: false,
        pick: undefined
      });
    } else if (b.R > BIG_LABEL) {
      if (!vis(b.p, b.R)) continue;
      an.push({
        ...base,
        x: clamp(b.p[0], ox - fw / 2 + 30, ox + fw / 2 - 60),
        y: clamp(b.p[1] - 8, oy - fh / 2 + 12, oy + fh / 2 - 20),
        rx: 0,
        ry: 0,
        solid: false
      });
    } else {
      if (!vis(b.p)) continue;
      const r =
        b.asteroid !== undefined && b.mk
          ? 3
          : b.mk
            ? MARK_R + 1
            : b.star
              ? b.R * 1.3 + 4
              : b.R * (b.look?.rings ? 2.3 : 1);
      if (chosen && b.mk && b.asteroid !== undefined) brackets(f, b.p[0], b.p[1], 5, 4);
      an.push({
        ...base,
        ...(b.asteroid !== undefined ? { solid: false } : {}),
        x: b.p[0],
        y: b.p[1],
        rx: r,
        ry: b.asteroid !== undefined && b.mk ? 3 : b.mk ? MARK_R + 1 : b.star ? b.R + 4 : b.R
      });
    }
  }
  f.present();
  return { anchors: an, ships: tally, live: live.map((x) => x.site.id) };
}

function drawBelt(
  f: FB,
  S: (x: number, y: number) => Point,
  s: number,
  elapsed: number,
  belt: NonNullable<StarSystem['belt']>
): void {
  const mid = belt.inner + belt.width / 2,
    n = clamp(Math.round((mid / s) * BELT_DENSITY), BELT_MIN, BELT_MAX);
  for (let i = 0; i < n; i++) {
    const r = (belt.inner + hash(i, 5, 2) * belt.width) * (1 + (hash(i, 9, 2) - 0.5) * 0.04),
      period = YEAR_S * Math.pow(r / AU, 1.5),
      a = hash(i, 6, 2) * Math.PI * 2 + (elapsed / period) * Math.PI * 2,
      p = S(Math.cos(a) * r, Math.sin(a) * r);
    if (p[0] < 0 || p[1] < 0 || p[0] >= f.w || p[1] >= f.h) continue;
    const v = hash(i, 7, 2);
    f.px(p[0], p[1], v > 0.9 ? [176, 168, 176] : v > 0.5 ? PAL.belt[1] : PAL.belt[0]);
    if (v > 0.96) {
      f.px(p[0] + 1, p[1], PAL.belt[0]);
      f.px(p[0], p[1] + 1, [70, 66, 92]);
    }
  }
}
