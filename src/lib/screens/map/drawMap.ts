import { bodyPosition, type Game } from '#lib/game/index.ts';
import type { FB, SpritePalette } from '#lib/gfx/framebuffer.ts';
import { hash } from '#lib/gfx/math.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { planet } from '#lib/gfx/planets.ts';
import { C } from '#lib/gfx/ships/colors.ts';
import { drawShip, measure } from '#lib/gfx/ships/draw.ts';
import { spec } from '#lib/gfx/ships/specs.ts';
import { sun } from '#lib/gfx/sun.ts';
import { select } from '#lib/ui/index.ts';
import { camera, layers, SHIP_ZOOM, viewCentre } from './camera.svelte';
import type { Anchor } from './labels';

const SHIP_ICONS = {
  mil: ['..ooo....', 'goHHHoo..', 'gohhhwwo.', 'goddddo..', '..ooo....'],
  civ: ['.ooooooo...', 'gocCcCcHoo.', 'gocCcCchwwo', 'goddddddoo.', '.ooooooo...']
} as const;

const FLAME_HOT: RGB = [255, 214, 120];
const FLAME_COOL: RGB = [240, 130, 60];
const JUMP_POINT = [-150, -84] as const;
const BELT_ROCKS = 230;

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

function drawBelt(f: FB, P: Project, S: number): void {
  for (let i = 0; i < BELT_ROCKS; i++) {
    const r = 124 + hash(i, 5, 2) * 13,
      a = hash(i, 6, 2) * 6.283 + S * 0.0002;
    const [x, y] = P(Math.cos(a) * r, Math.sin(a) * r);
    f.px(x, y, PAL.belt[i & 1 ? 1 : 0]);
  }
}

export function drawMap(f: FB, game: Game, A: number): Anchor[] {
  const z = camera.z,
    [cx0, cy0] = viewCentre(),
    S = game.elapsed / 2000,
    sel = game.selection,
    world = game.world;
  const X = (wx: number) => cx0 + (wx - camera.x) * z,
    Y = (wy: number) => cy0 + (wy - camera.y) * z;
  const P: Project = (wx, wy) => [X(wx), Y(wy)];
  const on = (x: number, y: number, r: number) => x > -r && y > -r && x < f.w + r && y < f.h + r;
  const an: Anchor[] = [];
  f.start();
  if (layers.Orbits) for (const b of world.bodies) f.ring(X(0), Y(0), b.orbit * z, PAL.orbit, 3);
  if (layers.Asteroids) drawBelt(f, P, S);
  const sf = sel.kind === 'fleet' ? game.fleet(sel.id) : undefined;
  if (sf) {
    const dest = sf.destination ? game.body(sf.destination) : undefined;
    if (layers.Course && dest) {
      const [tx, ty] = bodyPosition(dest);
      f.line(X(sf.x), Y(sf.y), X(tx), Y(ty), PAL.course, 3, A >> 1);
    }
    if (layers.Sensors) f.ring(X(sf.x), Y(sf.y), 40 * z, PAL.sensor, 3, A >> 2);
  }
  const sr = Math.round(14 * z);
  if (on(X(0), Y(0), sr + 8)) sun(f, Math.round(X(0)), Math.round(Y(0)), sr, A);
  for (const b of world.bodies) {
    const [wx, wy] = bodyPosition(b);
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
      pick: () => select('body', b.id)
    });
  }
  const earth = game.body('earth');
  if (earth) {
    const [ex, ey] = bodyPosition(earth),
      la = S * 0.012 + 1,
      mr = Math.max(1, Math.round(2 * z));
    planet(f, Math.round(X(ex + Math.cos(la) * 15)), Math.round(Y(ey + Math.sin(la) * 15)), mr, 'rock', 0);
  }
  for (const fl of world.fleets) {
    const x = X(fl.x),
      y = Y(fl.y),
      chosen = sel.kind === 'fleet' && sel.id === fl.id;
    let bw: number, bh: number;
    if (z >= SHIP_ZOOM) {
      const sp = spec(fl.classId),
        m = measure(sp);
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
      pick: () => select('fleet', fl.id)
    });
  }
  for (const c of world.contacts) {
    const x = Math.round(X(c.x)),
      y = Math.round(Y(c.y)),
      col = c.hostile ? PAL.hot : PAL.belt[1],
      chosen = sel.kind === 'contact' && sel.id === c.id;
    if (c.hostile) f.line(X(c.x + 38), Y(c.y + 22), X(c.x + 5), Y(c.y + 3), PAL.hot, 4, A >> 2);
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
      pick: () => select('contact', c.id)
    });
  }
  const [jx, jy] = P(...JUMP_POINT);
  f.ring(jx, jy, 5, PAL.jump, 2, A >> 1);
  f.ring(jx, jy, 2, PAL.jump, 2, -(A >> 1));
  f.px(jx, jy, PAL.jump);
  an.push({ id: 'jump', text: 'Jump point A', x: jx, y: jy, rx: 6, ry: 6 });
  f.present();
  return an;
}
