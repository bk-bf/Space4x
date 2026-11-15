import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { describe, expect, it } from 'vitest';
import { Game } from '#lib/game/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { spec } from '#lib/gfx/ships/specs.ts';
import { shipLengthMetres } from '#lib/gfx/topdown/index.ts';
import { tierOf, type Point } from './mapCamera';
import {
  classSpec,
  contactGroup,
  drawShipGroup,
  fleetGroup,
  ICON_PX,
  separates,
  shipLook,
  type ShipTally,
  type ShipView
} from './shipLayer';

function canvas(w = 400, h = 300): FB {
  const d = new Uint8ClampedArray(w * h * 4);
  const px = (x: number, y: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < h) d[(y * w + x) * 4] = 255;
  };
  return { w, h, d, px, line: (x0: number, y0: number) => px(x0, y0) } as unknown as FB;
}

function viewAt(centre: Point, metresPerPx: number, w = 400, h = 300): ShipView {
  return {
    project: (x, y) => [w / 2 + (x - centre[0]) / metresPerPx, h / 2 + (y - centre[1]) / metresPerPx],
    pxPerMetre: 1 / metresPerPx,
    tier: tierOf(Math.log10(metresPerPx)),
    sun: [-1e6, 0],
    t: 0
  };
}

const tally = (): ShipTally => ({ marker: 0, icon: 0, true: 0 });

describe('ship layer', () => {
  const g = withFixture(new Game()),
    convoy = g.fleet('convoy')!,
    group = fleetGroup(convoy, false),
    atlas = spec('atlas');

  it('draws a marker far out, a fixed-size sprite in between and true scale close in', () => {
    expect(shipLook(atlas, 1 / 2e5, tierOf(Math.log10(2e5)))).toBe('marker');
    expect(shipLook(atlas, 1 / 1000, tierOf(3))).toBe('icon');
    const switchAt = shipLengthMetres(atlas) / ICON_PX;
    expect(shipLook(atlas, 1 / (switchAt * 1.05), tierOf(Math.log10(switchAt * 1.05)))).toBe('icon');
    expect(shipLook(atlas, 1 / (switchAt * 0.95), tierOf(Math.log10(switchAt * 0.95)))).toBe('true');
    expect(shipLook(undefined, 1, 'near')).toBe('marker');
  });

  it('switches to icons at about 100 km per pixel', () => {
    expect(shipLook(atlas, 1 / 9e4, tierOf(Math.log10(9e4)))).toBe('icon');
    expect(shipLook(atlas, 1 / 1.1e5, tierOf(Math.log10(1.1e5)))).toBe('marker');
  });

  it('keeps a fleet as one sprite with its count until its ships separate on screen', () => {
    const at: Point = [convoy.x, convoy.y];
    for (const [mpp, one, look] of [
      [2e5, true, 'marker'],
      [500, true, 'icon'],
      [25, false, 'icon'],
      [5, false, 'true']
    ] as const) {
      const v = viewAt(at, mpp),
        n = tally(),
        marks = drawShipGroup(canvas(), group, v, n);
      expect(separates(group, v), `${mpp} m/px`).toBe(!one);
      expect(marks, `${mpp} m/px`).toHaveLength(one ? 1 : convoy.ships.length);
      if (one) expect(marks[0]!.text).toBe('Freight convoy ×4');
      expect(n[look], `${mpp} m/px`).toBe(marks.length);
    }
  });

  it('draws every ship from its own position, not from the fleet centre', () => {
    const v = viewAt([convoy.x, convoy.y], 5),
      marks = drawShipGroup(canvas(), group, v);
    const spread = new Set(marks.map((m) => `${Math.round(m.x)},${Math.round(m.y)}`));
    expect(spread.size).toBe(convoy.ships.length);
    group.ships.forEach((s, i) => {
      const [x, y] = v.project(s.x, s.y);
      expect(marks[i]!.x).toBeCloseTo(x);
      expect(marks[i]!.y).toBeCloseTo(y);
    });
  });

  it('draws a hostile contact as its class and an unknown contact as a diamond', () => {
    const hostile = contactGroup(g.contact('C-014')!, false),
      civilian = contactGroup(g.contact('C-011')!, false);
    expect(classSpec(hostile.ships[0]!.classId)?.id).toBe('x1');
    expect(hostile.side).toBe('foe');
    const near = tally(),
      far = tally();
    drawShipGroup(canvas(), hostile, viewAt([hostile.x, hostile.y], 500), near);
    drawShipGroup(canvas(), hostile, viewAt([hostile.x, hostile.y], 1e9), far);
    expect(near).toEqual({ marker: 0, icon: 1, true: 0 });
    expect(far).toEqual({ marker: 1, icon: 0, true: 0 });
    const plain = tally();
    drawShipGroup(canvas(), civilian, viewAt([civilian.x, civilian.y], 5), plain);
    expect(plain).toEqual({ marker: 1, icon: 0, true: 0 });
  });

  it('lights a moving fleet’s plumes and leaves a parked one dark', () => {
    expect(group.thrust).toBe(0);
    expect(fleetGroup(g.fleet('survey')!, false).thrust).toBeGreaterThan(0);
  });
});
