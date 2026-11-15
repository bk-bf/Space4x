import { shipClass, type Contact, type Fleet } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { ALIEN_SPECS, type ShipSpec } from '#lib/gfx/ships/specs.ts';
import {
  drawShip as drawTopdown,
  drawShipIcon,
  shipBeamMetres,
  shipLengthMetres
} from '#lib/gfx/topdown/index.ts';
import type { Point, Tier } from './mapCamera';
import { brackets, chevron, diamond, SIDE_COLOUR, type Side } from './markers';

export interface ShipPlace {
  name: string;
  classId?: string;
  x: number;
  y: number;
  heading: number;
}

export interface ShipGroup {
  key: string;
  name: string;
  label: string;
  side: Side;
  contact: boolean;
  x: number;
  y: number;
  heading: number;
  ships: readonly ShipPlace[];
  selected: boolean;
  blink: boolean;
  thrust: number;
}

export interface ShipView {
  project(x: number, y: number): Point;
  pxPerMetre: number;
  tier: Tier;
  sun: Point;
  t: number;
}

export interface ShipMark {
  key: string;
  text: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export type ShipLook = 'marker' | 'icon' | 'true';

export interface ShipTally {
  marker: number;
  icon: number;
  true: number;
}

export const ICON_PX = 16;
const FORMATION_SPACING = 400;
const MARK_HALF = 5;
const FRAMES_PER_TICK = 3;

export const classSpec = (id: string | undefined): ShipSpec | undefined =>
  id ? (shipClass(id) ?? ALIEN_SPECS[id]) : undefined;

export function shipLook(spec: ShipSpec | undefined, pxPerMetre: number, tier: Tier): ShipLook {
  if (!spec || tier === 'far') return 'marker';
  return shipLengthMetres(spec) * pxPerMetre > ICON_PX ? 'true' : 'icon';
}

export function fleetShips(fleet: Fleet): ShipPlace[] {
  const c = Math.cos(fleet.heading),
    s = Math.sin(fleet.heading);
  return fleet.ships.map((ship, i) => {
    const row = Math.ceil(i / 2),
      side = i === 0 ? 0 : i % 2 ? -1 : 1,
      back = -row * FORMATION_SPACING,
      across = side * row * FORMATION_SPACING;
    return {
      name: ship.name,
      classId: ship.classId,
      x: fleet.x + c * back - s * across,
      y: fleet.y + s * back + c * across,
      heading: fleet.heading
    };
  });
}

export function fleetGroup(fleet: Fleet, selected: boolean): ShipGroup {
  return {
    key: 'fleet:' + fleet.id,
    name: fleet.name,
    label: `${fleet.name} ×${fleet.ships.length}`,
    side: fleet.kind === 'mil' ? 'navy' : 'civ',
    contact: false,
    x: fleet.x,
    y: fleet.y,
    heading: fleet.heading,
    ships: fleetShips(fleet),
    selected,
    blink: false,
    thrust: fleet.at ? 0 : 0.7
  };
}

export function contactGroup(c: Contact, selected: boolean): ShipGroup {
  const next = c.route.length ? c.route[c.leg % c.route.length]! : undefined,
    heading = next ? Math.atan2(next[1] - c.y, next[0] - c.x) : 0;
  return {
    key: 'contact:' + c.id,
    name: c.id,
    label: c.id + ' ' + c.kind.toLowerCase(),
    side: c.hostile ? 'foe' : 'neutral',
    contact: true,
    x: c.x,
    y: c.y,
    heading,
    ships: [{ name: c.id, classId: c.hostile ? c.alienClass : undefined, x: c.x, y: c.y, heading }],
    selected,
    blink: !!c.hostile,
    thrust: c.speedKmS > 0 ? 0.6 : 0
  };
}

export function drawShip(
  f: FB,
  ship: ShipPlace,
  group: ShipGroup,
  X: number,
  Y: number,
  view: ShipView,
  tally?: ShipTally
): [number, number] {
  const spec = classSpec(ship.classId),
    look = shipLook(spec, view.pxPerMetre, view.tier);
  if (tally) tally[look]++;
  if (!spec || look === 'marker') {
    const col = SIDE_COLOUR[group.side];
    if (group.contact) {
      if (!group.blink || (view.t >> 2) & 1 || group.selected) diamond(f, X, Y, col);
      f.px(X, Y, col);
    } else chevron(f, X, Y, ship.heading, col);
    return [MARK_HALF, MARK_HALF];
  }
  const o = {
    sun: Math.atan2(view.sun[1] - Y, view.sun[0] - X),
    frame: view.t * FRAMES_PER_TICK,
    thrust: group.thrust,
    ...(group.side === 'foe' ? { livery: 'foe' as const } : {})
  };
  if (look === 'icon') {
    drawShipIcon(f, spec, X, Y, ship.heading, ICON_PX, o);
    return [ICON_PX / 2, ICON_PX / 2];
  }
  drawTopdown(f, spec, { ...o, x: X, y: Y, angle: ship.heading, pxPerMetre: view.pxPerMetre });
  const half = (shipLengthMetres(spec) * view.pxPerMetre) / 2,
    beam = (shipBeamMetres(spec) * view.pxPerMetre) / 2,
    c = Math.abs(Math.cos(ship.heading)),
    s = Math.abs(Math.sin(ship.heading));
  return [Math.max(MARK_HALF, half * c + beam * s), Math.max(MARK_HALF, half * s + beam * c)];
}

export function nearestGapPx(group: ShipGroup, view: ShipView): number {
  const pts = group.ships.map((s) => view.project(s.x, s.y));
  let gap = Infinity;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      gap = Math.min(gap, Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1]));
  return gap;
}

export function separates(group: ShipGroup, view: ShipView): boolean {
  if (group.ships.length < 2 || view.tier === 'far') return false;
  if (group.ships.some((s) => shipLook(classSpec(s.classId), view.pxPerMetre, view.tier) === 'true'))
    return true;
  return nearestGapPx(group, view) > ICON_PX + 2;
}

export function drawShipGroup(f: FB, group: ShipGroup, view: ShipView, tally?: ShipTally): ShipMark[] {
  const [gx, gy] = view.project(group.x, group.y);
  if (separates(group, view))
    return group.ships.map((s, i) => {
      const [x, y] = view.project(s.x, s.y),
        [rx, ry] = drawShip(f, s, group, x, y, view, tally);
      if (group.selected) brackets(f, x, y, rx + 3, ry + 1);
      return { key: `${group.key}#${i}`, text: s.name, x, y, rx, ry };
    });
  const lead = group.ships[0],
    [rx, ry] = lead ? drawShip(f, lead, group, gx, gy, view, tally) : [MARK_HALF, MARK_HALF];
  if (group.selected) brackets(f, gx, gy, rx + 3, ry + 1);
  return [{ key: group.key, text: group.label, x: gx, y: gy, rx, ry }];
}
