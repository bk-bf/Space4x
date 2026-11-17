import { describe, expect, it } from 'vitest';
import { asteroids, cometRecord } from '#lib/game/data/index.ts';
import type { Pixels } from '#lib/gfx/bodies/light.ts';
import { bakeNow } from '#lib/gfx/bodies/looks/bake.ts';
import { NAMED_BODIES, smallBody, type SmallInfo } from './catalogue.ts';
import {
  drawSmallBody,
  heldBytes,
  heldLooks,
  smallLook,
  smallReach,
  smallReady,
  type SmallBody
} from './draw.ts';

const SIZES = [3, 6, 12, 24, 48, 96, 264];
const TICK_TURN = (2 * Math.PI) / 300;

function canvas(size: number): Pixels {
  return { w: size, h: size, d: new Uint8ClampedArray(size * size * 4) };
}

function ready(info: SmallInfo): SmallBody {
  const b = smallBody(info);
  bakeNow(smallLook(b));
  return b;
}

function paint(b: SmallBody, radius: number, turn = 0): Pixels {
  const reach = Math.ceil(smallReach(b) * (radius + 0.5)) + 4,
    f = canvas(reach * 2);
  drawSmallBody(f, b, reach, reach, radius, turn);
  return f;
}

const lit = (f: Pixels): number => {
  let n = 0;
  for (let i = 3; i < f.d.length; i += 4) if (f.d[i]) n++;
  return n;
};

const BLUR = 3;

function blurred(f: Pixels): Float64Array {
  const lum = new Float64Array(f.w * f.h),
    out = new Float64Array(f.w * f.h);
  for (let i = 0; i < lum.length; i++) lum[i] = f.d[i * 4]! + f.d[i * 4 + 1]! + f.d[i * 4 + 2]!;
  for (let y = BLUR; y < f.h - BLUR; y++)
    for (let x = BLUR; x < f.w - BLUR; x++) {
      let s = 0;
      for (let j = -BLUR; j <= BLUR; j++)
        for (let i = -BLUR; i <= BLUR; i++) s += lum[(y + j) * f.w + x + i]!;
      out[y * f.w + x] = s;
    }
  return out;
}

function moved(a: Pixels, b: Pixels): number {
  const p = blurred(a),
    q = blurred(b);
  let s = 0;
  for (let i = 0; i < p.length; i++) s += Math.abs(p[i]! - q[i]!);
  return s / p.length;
}

const info = (id: string): SmallInfo => {
  const rec = asteroids.find((a) => a.id === id);
  return { id, name: id, type: rec?.type ?? 'stony', diameter: rec?.diameter ?? 60 };
};

const GENERIC: readonly SmallInfo[] = [
  { id: 'sample-rubble-pile', name: 'Rubble pile', type: 'carbonaceous', diameter: 0.6 },
  { id: 'sample-small-stony', name: 'Small stony', type: 'stony', diameter: 2.4 },
  { id: 'sample-stony-30', name: 'Stony, 30 km', type: 'stony', diameter: 30 },
  { id: 'sample-metal-90', name: 'Metallic, 90 km', type: 'metallic', diameter: 90 },
  { id: 'sample-dark-180', name: 'Dark, 180 km', type: 'carbonaceous', diameter: 180 },
  { id: 'sample-big-stony', name: 'Large stony', type: 'stony', diameter: 450 },
  { id: 'sample-comet', name: 'Comet', type: 'comet', diameter: 4 },
  { id: 'sample-comet-2', name: 'Comet', type: 'comet', diameter: 9 }
];

describe('small bodies', () => {
  it('draws the same pixels for the same body and time', () => {
    const b = ready(info('bennu'));
    expect(Array.from(paint(b, 40, 3).d)).toEqual(Array.from(paint(b, 40, 3).d));
  });

  it('draws a plain disc until the look is baked, then the rock', () => {
    const b = smallBody({ id: 'sample-unbaked', name: 'x', type: 'stony', diameter: 3 });
    expect(smallReady(b)).toBe(false);
    const before = paint(b, 20);
    bakeNow(smallLook(b));
    expect(smallReady(b)).toBe(true);
    expect(lit(before)).toBeGreaterThan(0);
    expect(Array.from(paint(b, 20).d)).not.toEqual(Array.from(before.d));
  });

  it('draws a different rock for another seed', () => {
    const a = ready({ id: 'sample-one', name: 'a', type: 'stony', diameter: 40 }),
      b = ready({ id: 'sample-two', name: 'b', type: 'stony', diameter: 40 });
    expect(Array.from(paint(a, 24).d)).not.toEqual(Array.from(paint(b, 24).d));
  });

  it('turns smoothly: a small turn moves the picture a little, a full turn comes back', () => {
    const b = ready(info('eros')),
      R = 150,
      a = paint(b, R, 1),
      next = paint(b, R, 1 + TICK_TURN),
      later = paint(b, R, 1 + 30 * TICK_TURN),
      turn = paint(b, R, 1 + Math.PI * 2);
    expect(moved(a, next)).toBeGreaterThan(0);
    expect(moved(a, next)).toBeLessThan(moved(a, later) / 8);
    expect(moved(a, turn)).toBeLessThan(moved(a, next));
  }, 30_000);

  it.each([...NAMED_BODIES])('renders %s at every size and never empty', (id) => {
    const b = ready(info(id));
    for (const radius of SIZES)
      expect(lit(paint(b, radius)), `${id} ${radius}`).toBeGreaterThan(radius * radius);
  });

  it.each(GENERIC.map((g) => g.id))('renders the generic %s at every size and never empty', (id) => {
    const b = ready(GENERIC.find((g) => g.id === id)!);
    for (const radius of SIZES)
      expect(lit(paint(b, radius)), `${id} ${radius}`).toBeGreaterThan(radius * radius);
  });

  it('gives every asteroid record a shape and an unknown type a stony one', () => {
    for (const a of asteroids) expect(smallBody(a).family).toBeDefined();
    expect(smallBody({ id: 'unknown', name: 'u', type: 'mystery', diameter: 5 }).type).toBe('stony');
  });

  it('stays inside the reach it reports and returns its outline as the label box', () => {
    for (const id of ['eros', 'kleopatra', 'bennu', 'vesta', 'apophis']) {
      const b = ready(info(id)),
        radius = 40,
        size = 260,
        c = size / 2,
        f = canvas(size),
        box = drawSmallBody(f, b, c, c, radius, 7)!;
      let far = 0,
        x0 = size,
        x1 = 0,
        y0 = size,
        y1 = 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          if (f.d[(y * size + x) * 4 + 3]) {
            if (Math.hypot(x + 0.5 - c, y + 0.5 - c) > smallReach(b) * (radius + 0.5) + 2) far++;
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x + 1);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y + 1);
          }
      expect(far, id).toBe(0);
      expect(Math.abs(box.x0 - x0), id).toBeLessThan(2);
      expect(Math.abs(box.x1 - x1), id).toBeLessThan(2);
      expect(Math.abs(box.y0 - y0), id).toBeLessThan(2);
      expect(Math.abs(box.y1 - y1), id).toBeLessThan(2);
    }
  }, 30_000);

  it('keeps the baked looks of bodies it has drawn within a memory budget', () => {
    for (const a of asteroids.slice(0, 40)) {
      const b = smallBody(a);
      bakeNow(smallLook(b));
      paint(b, 8);
    }
    expect(heldLooks()).toBeLessThan(30);
    expect(heldBytes()).toBeLessThanOrEqual(48 * 1024 * 1024);
  }, 120_000);

  it('keeps the spheres for planets and dwarf planets: only other records and comets are small bodies', async () => {
    const { smallBodyOf } = await import('#lib/game/smallBodies.ts');
    const { Game } = await import('#lib/game/index.ts');
    const game = new Game();
    const record = (id: string) => asteroids.find((a) => a.id === id);
    for (const b of game.world.bodies) {
      const small = smallBodyOf(b);
      expect(!!small).toBe((!!record(b.id) && !record(b.id)!.dwarf) || !!cometRecord(b.id));
    }
    expect(smallBodyOf(game.world.bodies.find((b) => b.id === 'luna')!)).toBeUndefined();
  });
});
