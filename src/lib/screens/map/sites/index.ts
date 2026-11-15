import type { Site, SiteKind } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { hash } from '#lib/gfx/math.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { ALIEN_SPECS, spec } from '#lib/gfx/ships/specs.ts';
import {
  drawShipIcon,
  drawStation,
  fitShip,
  METRES_PER_UNIT,
  ShipDamage,
  drawShip
} from '#lib/gfx/topdown/index.ts';
import { stationSprite } from '#lib/gfx/topdown/sprites.ts';
import { SIDE_COLOUR } from '../markers';
import { BattleScene } from './battle';
import { BoardingScene } from './boarding';
import { small } from './craft';
import { FIRE, thick } from './fx';
import { drawGate, GateScene } from './gate';
import { HARVESTER, HarvesterScene } from './harvester';
import { SalvageScene } from './salvage';
import type { SiteScene } from './scene';
import { YardScene } from './yard';

export type { SceneLabel } from './scene';

export const SCENE_REACH = 420;
export const SITE_ICON_PX = 16;

const MAKE: Record<SiteKind, () => SiteScene> = {
  yard: () => new YardScene(),
  harvester: () => new HarvesterScene(),
  battle: () => new BattleScene(),
  boarding: () => new BoardingScene(),
  salvage: () => new SalvageScene(),
  gate: () => new GateScene()
};

const scenes = new Map<string, SiteScene>();

export function sceneOf(site: Site): SiteScene {
  let s = scenes.get(site.id);
  if (!s) scenes.set(site.id, (s = MAKE[site.kind]()));
  return s;
}

const WRECK = new ShipDamage();
for (let i = 0; i < 8; i++)
  WRECK.hit((hash(i, 1, 5) * 60 - 30) * METRES_PER_UNIT, (hash(i, 2, 5) * 10 - 5) * METRES_PER_UNIT, 20, 240);

const DIM: RGB = [148, 143, 192];

export function siteMark(f: FB, site: Site, X: number, Y: number, t: number): void {
  X = Math.round(X);
  Y = Math.round(Y);
  if (site.station) {
    const c = SIDE_COLOUR.civ;
    for (let i = -3; i <= 3; i++) {
      f.px(X + i, Y - 3, c);
      f.px(X + i, Y + 3, c);
      f.px(X - 3, Y + i, c);
      f.px(X + 3, Y + i, c);
    }
    f.px(X, Y, c);
    return;
  }
  if (site.hostile) {
    for (let i = 0; i < 4; i++) {
      f.px(X - 3 + i, Y - i, PAL.hot);
      f.px(X + i, Y - 3 + i, PAL.hot);
      f.px(X + 3 - i, Y + i, PAL.hot);
      f.px(X - i, Y + 3 - i, PAL.hot);
    }
    if ((t >> 2) % 5 < 2) {
      f.px(X + (t % 7) - 3, Y + (t % 5) - 2, FIRE[0]);
      f.px(X - (t % 5) + 2, Y - (t % 3) + 1, FIRE[1]);
    }
    return;
  }
  for (let i = -2; i <= 2; i++) {
    f.px(X + i, Y + i, DIM);
    f.px(X + i, Y - i, DIM);
  }
}

export function siteIcon(f: FB, site: Site, X: number, Y: number, sun: number, t: number): number {
  const size = SITE_ICON_PX,
    frame = t * 3;
  if (site.kind === 'yard') {
    const ppm = size / 2 / (stationSprite('core', 3).rad / 3) / METRES_PER_UNIT;
    drawStation(f, 'core', { x: X, y: Y, angle: 0, pxPerMetre: ppm, sun, frame });
    drawStation(f, 'ring', { x: X, y: Y, angle: t * 0.02, pxPerMetre: ppm, sun, frame });
  } else if (site.kind === 'harvester') drawShipIcon(f, HARVESTER, X, Y, 0, size, { sun, frame });
  else if (site.kind === 'boarding')
    drawShipIcon(f, ALIEN_SPECS.x1!, X, Y, 0.22, size, { sun, frame, livery: 'foe', thrust: 0.3 });
  else if (site.kind === 'salvage')
    drawShipIcon(f, ALIEN_SPECS.x1!, X, Y, 0.6, size, {
      sun,
      frame,
      livery: 'foe',
      dead: true,
      damage: WRECK
    });
  else siteMark(f, site, X, Y, t);
  return size / 2;
}

const NAVY: RGB = [130, 230, 250];

export function drawSitePicture(f: FB, site: Site, t: number): void {
  const frame = t * 3,
    cx = f.w / 2,
    cy = f.h / 2,
    sun = Math.atan2(-0.45, -0.55);
  if (site.kind === 'yard') {
    const ppm = (f.h * 0.42) / (stationSprite('core', 3).rad / 3) / METRES_PER_UNIT;
    drawStation(f, 'core', { x: cx, y: cy, angle: 0, pxPerMetre: ppm, sun, frame });
    drawStation(f, 'ring', { x: cx, y: cy, angle: t * 0.02, pxPerMetre: ppm, sun, frame });
  } else if (site.kind === 'harvester') {
    drawShip(f, HARVESTER, { ...fitShip(HARVESTER, f.w, f.h, 6), angle: 0, sun, frame });
  } else if (site.kind === 'battle') {
    const navy = spec('bastion'),
      foe = ALIEN_SPECS.x1!,
      fit = fitShip(navy, f.w / 2, f.h, 6);
    drawShip(f, navy, {
      x: cx * 0.5,
      y: cy + 8,
      angle: -0.2,
      pxPerMetre: fit.pxPerMetre,
      sun,
      frame,
      thrust: 0.6
    });
    drawShip(f, foe, {
      x: cx * 1.5,
      y: cy - 8,
      angle: Math.PI - 0.2,
      pxPerMetre: fit.pxPerMetre,
      sun,
      frame,
      livery: 'foe',
      thrust: 0.6
    });
    if ((t >> 1) % 3 === 0) thick(f, cx * 0.5 + 12, cy + 4, cx * 1.5 - 12, cy - 4, 1, [236, 252, 255], NAVY);
  } else if (site.kind === 'boarding') {
    const foe = ALIEN_SPECS.x1!,
      fit = fitShip(foe, f.w, f.h, 10);
    drawShip(f, foe, { ...fit, angle: 0, sun, frame, livery: 'foe', thrust: 0.3 });
    for (const [dx, dy] of [
      [-18, -11],
      [2, 11],
      [16, -11]
    ] as const)
      small(
        f,
        'shuttle',
        cx + dx,
        cy + dy,
        dy < 0 ? Math.PI / 2 : -Math.PI / 2,
        fit.pxPerMetre * METRES_PER_UNIT,
        sun,
        frame,
        {
          livery: 'navy'
        }
      );
  } else if (site.kind === 'salvage') {
    const foe = ALIEN_SPECS.x1!,
      fit = fitShip(foe, f.w * 0.8, f.h, 6);
    for (const [keep, dx, a] of [
      [1, 8, 0.25],
      [-1, -8, 0.1]
    ] as const)
      drawShip(f, foe, {
        x: cx + dx,
        y: cy,
        angle: a,
        pxPerMetre: fit.pxPerMetre,
        sun,
        frame,
        livery: 'foe',
        dead: true,
        damage: WRECK,
        cut: { at: 4 * METRES_PER_UNIT, keep }
      });
  } else drawGate(f, cx, cy, 0.62, t * 0.1, sun, 0);
}
