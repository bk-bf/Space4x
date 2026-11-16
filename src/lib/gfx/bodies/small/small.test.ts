import { describe, expect, it } from 'vitest';
import { asteroids } from '#lib/game/data/index.ts';
import { NAMED_BODIES, smallBody } from './catalogue.ts';
import { drawSmallBody, smallReach, spinStep, type Pixels } from './render.ts';

const SIZES = [3, 6, 12, 24, 48, 96];

function canvas(size: number): Pixels {
  return { w: size, h: size, d: new Uint8ClampedArray(size * size * 4) };
}

function paint(id: string, type: string, diameter: number, radius: number, step = 0): Pixels {
  const reach = Math.ceil(radius * 2.4) + 6,
    f = canvas(reach * 2);
  drawSmallBody(f, smallBody({ id, name: id, type, diameter }), reach, reach, radius, step);
  return f;
}

const lit = (f: Pixels): number => {
  let n = 0;
  for (let i = 3; i < f.d.length; i += 4) if (f.d[i]) n++;
  return n;
};

const asRecord = (id: string) => asteroids.find((a) => a.id === id);

describe('small bodies', () => {
  it('draws the same pixels for the same body', () => {
    const a = paint('bennu', 'carbonaceous', 0.5, 24),
      b = paint('bennu', 'carbonaceous', 0.5, 24);
    expect(Array.from(a.d)).toEqual(Array.from(b.d));
  });

  it('draws a different shape for another seed', () => {
    const a = paint('sample-one', 'stony', 40, 24),
      b = paint('sample-two', 'stony', 40, 24);
    expect(Array.from(a.d)).not.toEqual(Array.from(b.d));
  });

  it('turns: a later step gives other pixels, a full turn comes back', () => {
    const a = paint('eros', 'stony', 17, 24, 0),
      b = paint('eros', 'stony', 17, 24, 6),
      c = paint('eros', 'stony', 17, 24, 48);
    expect(Array.from(b.d)).not.toEqual(Array.from(a.d));
    expect(Array.from(c.d)).toEqual(Array.from(a.d));
  });

  it('steps once every few ticks', () => {
    expect(spinStep(0)).toBe(spinStep(4));
    expect(spinStep(5)).toBe(spinStep(0) + 1);
  });

  it.each(NAMED_BODIES)('renders %s at every size and never empty', (id) => {
    const rec = asRecord(id),
      type = rec?.type ?? 'stony',
      diameter = rec?.diameter ?? 60;
    for (const radius of SIZES) {
      const f = paint(id, type, diameter, radius);
      expect(lit(f)).toBeGreaterThan(radius * radius * 0.8);
    }
  });

  it('renders every asteroid record, each type and a comet', () => {
    for (const a of asteroids) expect(lit(paint(a.id, a.type, a.diameter, 10))).toBeGreaterThan(30);
    expect(lit(paint('some-comet', 'comet', 5, 10))).toBeGreaterThan(30);
    expect(lit(paint('unknown', 'mystery', 5, 10))).toBeGreaterThan(30);
  });

  it('stays inside the reach it reports', () => {
    for (const id of ['eros', 'kleopatra', 'bennu', 'vesta']) {
      const b = smallBody({ id, name: id, type: 'stony', diameter: 50 }),
        radius = 20,
        size = 120,
        f = canvas(size);
      drawSmallBody(f, b, 60, 60, radius, 0);
      let far = 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          if (
            f.d[(y * size + x) * 4 + 3] &&
            Math.hypot(x - 60, y - 60) > smallReach(b) * (radius + 0.5) * 1.1 + 2
          )
            far++;
      expect(far).toBe(0);
    }
  });

  it('keeps the spheres for planets: only records and comets are small bodies', async () => {
    const { smallBodyOf } = await import('#lib/game/smallBodies.ts');
    const { Game } = await import('#lib/game/index.ts');
    const game = new Game();
    for (const b of game.world.bodies) {
      const small = smallBodyOf(b);
      expect(!!small).toBe(!!asRecord(b.id));
    }
    expect(game.world.bodies.some((b) => b.id === 'luna' && b.type === 'rock')).toBe(true);
    expect(smallBodyOf(game.world.bodies.find((b) => b.id === 'luna')!)).toBeUndefined();
  });
});
