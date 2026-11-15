import type { Contact, Fleet } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
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

export const SEPARATE_PX = 16;
const FORMATION_SPACING = 400;
const MARK_HALF = 5;

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
    blink: false
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
    ships: [{ name: c.id, classId: c.alienClass, x: c.x, y: c.y, heading }],
    selected,
    blink: !!c.hostile
  };
}

export function drawShip(
  f: FB,
  ship: ShipPlace,
  group: ShipGroup,
  X: number,
  Y: number,
  view: ShipView
): number {
  const col = SIDE_COLOUR[group.side];
  if (group.contact) {
    if (!group.blink || (view.t >> 2) & 1 || group.selected) diamond(f, X, Y, col);
    f.px(X, Y, col);
  } else chevron(f, X, Y, ship.heading, col);
  return MARK_HALF;
}

export function spreadPx(group: ShipGroup, view: ShipView): number {
  const [gx, gy] = view.project(group.x, group.y);
  let far = 0;
  for (const s of group.ships) {
    const [x, y] = view.project(s.x, s.y);
    far = Math.max(far, Math.hypot(x - gx, y - gy));
  }
  return far;
}

export function drawShipGroup(f: FB, group: ShipGroup, view: ShipView): ShipMark[] {
  const [gx, gy] = view.project(group.x, group.y);
  if (group.ships.length > 1 && spreadPx(group, view) > SEPARATE_PX)
    return group.ships.map((s, i) => {
      const [x, y] = view.project(s.x, s.y),
        half = drawShip(f, s, group, x, y, view);
      if (group.selected) brackets(f, x, y, half + 3, half + 1);
      return { key: `${group.key}#${i}`, text: s.name, x, y, rx: half, ry: half };
    });
  const half = drawShip(f, group.ships[0] ?? group, group, gx, gy, view);
  if (group.selected) brackets(f, gx, gy, half + 3, half + 1);
  return [{ key: group.key, text: group.label, x: gx, y: gy, rx: half, ry: half }];
}
