import {
  bodyPosition,
  FLEET_SENSOR,
  fleetClassId,
  resolveGoal,
  shipClass,
  type Contact,
  type Fleet,
  type Game,
  type StarSystem
} from '#lib/game/index.ts';
import type { FB, SpritePalette } from '#lib/gfx/framebuffer.ts';
import { hash } from '#lib/gfx/math.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { planet } from '#lib/gfx/planets.ts';
import { C } from '#lib/gfx/ships/colors.ts';
import { drawShip, measure } from '#lib/gfx/ships/draw.ts';
import { sun } from '#lib/gfx/sun.ts';
import { select } from '#lib/ui/index.ts';
import { camera, layers, SHIP_ZOOM, viewCentre } from './camera.svelte';
import { centreOn } from './focus';
import type { Anchor } from './labels';

const SHIP_ICONS = {
  mil: ['..ooo....', 'goHHHoo..', 'gohhhwwo.', 'goddddo..', '..ooo....'],
  civ: ['.ooooooo...', 'gocCcCcHoo.', 'gocCcCchwwo', 'goddddddoo.', '.ooooooo...']
} as const;

const FLAME_HOT: RGB = [255, 214, 120];
const FLAME_COOL: RGB = [240, 130, 60];
const BELT_ROCKS = 230;
const TRAIL_UNITS = 44;

type Project = (wx: number, wy: number) => readonly [number, number];

function brackets(f: FB, x: number, y: number, bw: number, bh: number): void {
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ] as const)
    for (let i = 0; i < 3; i++) {
      f.px(x + dx * (bw - i), y + dy * bh, PAL.sel);
      f.px(x + dx * bw, y + dy * (bh - i), PAL.sel);
    }
}

function contactMark(f: FB, x: number, y: number, col: RGB): void {
  for (let i = 0; i < 4; i++) {
    f.px(x - 3 + i, y - i, col);
    f.px(x + i, y - 3 + i, col);
    f.px(x + 3 - i, y + i, col);
    f.px(x - i, y + 3 - i, col);
  }
}

function drawBelt(f: FB, P: Project, S: number, belt: NonNullable<StarSystem['belt']>): void {
  for (let i = 0; i < BELT_ROCKS; i++) {
    const r = belt.inner + hash(i, 5, 2) * belt.width,
      a = hash(i, 6, 2) * 6.283 + S * 0.0002;
    const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
    f.px(x, y, PAL.belt[i & 1 ? 1 : 0]);
  }
}

function trail(c: Contact): [number, number][] {
  const pts: [number, number][] = [[c.x, c.y]],
    n = c.route.length;
  let budget = TRAIL_UNITS,
    [x, y] = [c.x, c.y];
  for (let k = 1; k <= n && budget > 0; k++) {
    const [px, py] = c.route[(((c.leg - k) % n) + n) % n]!,
      d = Math.hypot(px - x, py - y);
    if (d >= budget) {
      pts.push([x + ((px - x) / d) * budget, y + ((py - y) / d) * budget]);
      break;
    }
    pts.push([px, py]);
    budget -= d;
    [x, y] = [px, py];
  }
  return pts;
}

function course(game: Game, fleet: Fleet): [number, number][] {
  const pts: [number, number][] = [[fleet.x, fleet.y]];
  let at = fleet.at;
  for (const o of fleet.orders) {
    const goal = resolveGoal(game, fleet, o);
    if (!goal) break;
    if (!(goal.body && goal.body.id === at)) pts.push([goal.x, goal.y]);
    at = goal.body?.id;
    if (o.type === 'orbit' || goal.jump) break;
  }
  return pts;
}

function polyline(
  f: FB,
  P: Project,
  pts: readonly (readonly [number, number])[],
  col: RGB,
  gap: number,
  phase: number
) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = P(...pts[i - 1]!),
      [x1, y1] = P(...pts[i]!);
    f.line(x0, y0, x1, y1, col, gap, phase);
  }
}

export function drawMap(f: FB, game: Game, A: number): Anchor[] {
  const z = camera.z,
    [cx0, cy0] = viewCentre(),
    S = game.elapsed / 2000,
    sel = game.selection,
    world = game.world,
    system = game.starSystem(world.system);
  const X = (wx: number) => cx0 + (wx - camera.x) * z,
    Y = (wy: number) => cy0 + (wy - camera.y) * z;
  const P: Project = (wx, wy) => [X(wx), Y(wy)];
  const on = (x: number, y: number, r: number) => x > -r && y > -r && x < f.w + r && y < f.h + r;
  const here = <T extends { system: string }>(list: readonly T[]) =>
    list.filter((o) => o.system === world.system);
  const bodies = here(world.bodies),
    fleets = here(world.fleets),
    contacts = here(world.contacts);
  const an: Anchor[] = [];
  f.start();
  if (layers.Orbits) for (const b of bodies) if (!b.parent) f.ring(X(0), Y(0), b.orbit * z, PAL.orbit, 3);
  if (layers.Asteroids && system?.belt) drawBelt(f, P, S, system.belt);
  const sf = sel.kind === 'fleet' ? fleets.find((x) => x.id === sel.id) : undefined;
  if (sf) {
    if (layers.Course) polyline(f, P, course(game, sf), PAL.course, 3, A >> 1);
    if (layers.Sensors) f.ring(X(sf.x), Y(sf.y), FLEET_SENSOR * z, PAL.sensor, 3, A >> 2);
  }
  for (const s of system?.stars ?? []) {
    const sr = Math.round(s.radius * z),
      x = Math.round(X(s.x)),
      y = Math.round(Y(s.y));
    if (on(x, y, sr + 8)) sun(f, x, y, sr, A, s.tint);
  }
  for (const b of bodies) {
    const [wx, wy] = bodyPosition(b, world.bodies);
    const x = Math.round(X(wx)),
      y = Math.round(Y(wy)),
      R = Math.max(2, Math.round(b.radius * z)),
      rr = R * (b.rings ? 1.92 : 1);
    if (on(x, y, rr + 2)) planet(f, x, y, R, b.type, A * 0.01 + b.orbit, b);
    an.push({
      id: 'b-' + b.id,
      text: b.name,
      x,
      y,
      rx: rr,
      ry: R,
      sel: sel.kind === 'body' && sel.id === b.id,
      pick: () => select('body', b.id),
      centre: () => {
        const body = game.body(b.id);
        if (body) centreOn(...bodyPosition(body, game.world.bodies));
      }
    });
  }
  for (const fl of fleets) {
    const x = X(fl.x),
      y = Y(fl.y),
      chosen = sel.kind === 'fleet' && sel.id === fl.id;
    const sp = shipClass(fleetClassId(fl) ?? '');
    let bw: number, bh: number;
    if (z >= SHIP_ZOOM && sp) {
      const m = measure(sp);
      drawShip(f, Math.round(x - m.w / 2) - m.x0, Math.round(y - (m.y0 + m.y1) / 2), sp, A);
      bw = m.w / 2 + 3;
      bh = m.h / 2 + 3;
    } else {
      const ic = SHIP_ICONS[fl.kind],
        w = ic[0].length;
      const pal: SpritePalette = { ...C, g: hash(A, w, 1) > 0.5 ? FLAME_HOT : FLAME_COOL };
      f.sprite(ic, Math.round(x - w / 2), Math.round(y - 2), pal, fl.heading < 0);
      bw = w / 2 + 3;
      bh = 5;
    }
    if (chosen) brackets(f, x, y, bw, bh);
    an.push({
      id: 'f-' + fl.id,
      text: fl.name,
      cls: 'fl',
      x,
      y,
      rx: bw,
      ry: bh,
      sel: chosen,
      pick: () => select('fleet', fl.id),
      centre: () => {
        const now = game.fleet(fl.id);
        if (now) centreOn(now.x, now.y);
      }
    });
  }
  for (const c of contacts) {
    const x = Math.round(X(c.x)),
      y = Math.round(Y(c.y)),
      col = c.hostile ? PAL.hot : PAL.belt[1],
      chosen = sel.kind === 'contact' && sel.id === c.id;
    if (c.hostile && c.route.length && c.speedKmS > 0) polyline(f, P, trail(c), PAL.hot, 4, A >> 2);
    if (!c.hostile || (A >> 2) & 1 || chosen) contactMark(f, x, y, col);
    f.px(x, y, col);
    an.push({
      id: 'c-' + c.id,
      text: c.id + ' ' + c.kind.toLowerCase(),
      cls: c.hostile ? 'hot' : '',
      x,
      y,
      rx: 5,
      ry: 5,
      sel: chosen,
      pick: () => select('contact', c.id),
      centre: () => {
        const now = game.contact(c.id);
        if (now) centreOn(now.x, now.y);
      }
    });
  }
  for (const j of system?.jumps ?? []) {
    const [jx, jy] = P(j.x, j.y);
    f.ring(jx, jy, 5, PAL.jump, 2, A >> 1);
    f.ring(jx, jy, 2, PAL.jump, 2, -(A >> 1));
    f.px(jx, jy, PAL.jump);
    an.push({ id: 'j-' + j.id, text: j.name, x: jx, y: jy, rx: 6, ry: 6 });
  }
  f.present();
  return an;
}
