import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { moons } from '#lib/game/data/index.ts';
import { Game } from '#lib/game/index.ts';
import { lookIdOf, lookOf, moonFamily } from '#lib/game/looks.ts';
import { smallBodyOf } from '#lib/game/smallBodies.ts';
import { drawSphere, sphereReach, type SphereState } from '#lib/gfx/bodies/sphere.ts';
import type { Pixels } from '#lib/gfx/bodies/small/render.ts';
import { bakeNow } from './bake.ts';
import { familyLook, FAMILY_KINDS } from './families.ts';
import golden from './planets.golden.json';
import { familyId, lookById, NAMED_LOOKS } from './index.ts';
import type { Look } from './types.ts';

const SIZES = [3, 6, 12, 24, 48];
const STATE: SphereState = { rot: 0.9, tilt: 0.43, lights: true };

function paint(look: Look, R: number, st: SphereState = STATE): Pixels {
  const reach = Math.ceil(sphereReach(look, R)) + 2,
    size = reach * 2,
    f = { w: size, h: size, d: new Uint8ClampedArray(size * size * 4) };
  drawSphere(f, look, st, reach, reach, R);
  return f;
}

const lit = (f: Pixels): number => {
  let n = 0;
  for (let i = 3; i < f.d.length; i += 4) if (f.d[i]) n++;
  return n;
};

const md5 = (f: Pixels): string => createHash('md5').update(f.d).digest('hex');

const need = (id: string): Look => {
  const look = lookById(id);
  expect(look).toBeDefined();
  bakeNow(look!);
  return look!;
};

describe('named looks', () => {
  it.each(NAMED_LOOKS)(
    '%s bakes and renders at every size, never empty',
    (id) => {
      const look = need(id);
      for (const R of SIZES) expect(lit(paint(look, R))).toBeGreaterThan(R * R * 0.9);
    },
    20_000
  );

  it('the planets keep the pixels the game drew before the looks were added', () => {
    const entries = Object.entries(golden as Record<string, string>);
    expect(entries.length).toBe(24);
    for (const [key, hash] of entries) {
      const [id, R] = key.split(':');
      const look = need(id!);
      const radius = Number(R),
        reach = Math.ceil(radius + (radius >= 6 ? Math.max(1.5, radius * 0.03) : 0) + 1) + 2,
        size = reach * 2,
        f = { w: size, h: size, d: new Uint8ClampedArray(size * size * 4) };
      for (let i = 3; i < f.d.length; i += 4) f.d[i] = 255;
      drawSphere(f, look, STATE, reach, reach, radius);
      expect(md5(f), key).toBe(hash);
    }
  }, 60_000);

  it('Uranus is paler than Neptune', () => {
    const mean = (f: Pixels) => {
      let s = 0;
      for (let i = 0; i < f.d.length; i += 4) s += f.d[i]! + f.d[i + 1]! + f.d[i + 2]!;
      return s / Math.max(1, lit(f));
    };
    expect(mean(paint(need('uranus'), 30))).toBeGreaterThan(mean(paint(need('neptune'), 30)));
  });

  it('irregular looks are not round', () => {
    const aspect = (look: Look, rot: number): number => {
      const f = paint(look, 24, { rot, tilt: 0 });
      let x0 = f.w,
        x1 = -1,
        y0 = f.h,
        y1 = -1;
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++)
          if (f.d[(y * f.w + x) * 4 + 3]) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      const w = x1 - x0 + 1,
        h = y1 - y0 + 1;
      return Math.max(w / h, h / w);
    };
    for (const id of ['phobos', 'deimos', 'hyperion', 'haumea']) {
      const look = need(id);
      expect(Math.max(...[0, 0.6, 1.2, 1.8, 2.4].map((r) => aspect(look, r))), id).toBeGreaterThan(1.12);
    }
    expect(Math.max(...[0, 1.2].map((r) => aspect(need('luna'), r)))).toBeLessThan(1.05);
  }, 20_000);
});

describe('families', () => {
  it.each(FAMILY_KINDS)(
    '%s: eight seeds bake, render and differ',
    (kind) => {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 8; seed++) {
        const look = familyLook(kind, seed);
        bakeNow(look);
        for (const R of [3, 12, 28])
          expect(lit(paint(look, R)), `${kind} ${seed} ${R}`).toBeGreaterThan(R * R * 0.4);
        seen.add(md5(paint(look, 28)));
      }
      expect(seen.size).toBe(8);
    },
    20_000
  );

  it('the same seed gives the same pixels and another seed does not', () => {
    const a = familyLook('ice', 5),
      b = familyLook('ice', 5),
      c = familyLook('ice', 6);
    for (const look of [a, b, c]) bakeNow(look);
    expect(md5(paint(a, 30))).toBe(md5(paint(b, 30)));
    expect(md5(paint(a, 30))).not.toBe(md5(paint(c, 30)));
  });

  it('a round family look is not lumpy', () => {
    const look = familyLook('captured', 3, true);
    expect(look.shape).toBeUndefined();
  });
});

describe('the game resolves a look for every body', () => {
  const game = new Game();

  it('gives every moon a family and a seed from its record', () => {
    for (const m of moons) {
      const body = game.world.bodies.find((b) => b.id === m.id);
      expect(body, m.id).toBeDefined();
      const id = lookIdOf(body!);
      expect(
        id.startsWith('ice:') ||
          id.startsWith('rock:') ||
          id.startsWith('captured:') ||
          NAMED_LOOKS.includes(id)
      ).toBe(true);
      if (!NAMED_LOOKS.includes(m.id)) expect(id).toBe(familyId(moonFamily(m), m.code));
      expect(lookOf(body!)).toBeDefined();
    }
  });

  it('sorts moons by orbit, composition and size', () => {
    const fam = (id: string) => moonFamily(moons.find((m) => m.id === id)!);
    expect(fam('himalia')).toBe('captured');
    expect(fam('phoebe')).toBe('captured');
    expect(fam('amalthea')).toBe('rock');
    expect(fam('puck')).toBe('rock');
    expect(fam('proteus')).toBe('rock');
    expect(fam('pandora-saturn')).toBe('ice');
    expect(fam('nix')).toBe('ice');
  });

  it('names every look the mockup approved and resolves each to its body', () => {
    for (const id of NAMED_LOOKS) {
      const body = game.world.bodies.find((b) => b.id === id);
      expect(body, id).toBeDefined();
      expect(lookIdOf(body!)).toBe(id);
    }
  });

  it('draws dwarf planets as spheres and asteroids and comets as small bodies', () => {
    for (const id of [
      'ceres',
      'pluto',
      'eris',
      'haumea',
      'makemake',
      'quaoar',
      'sedna',
      'orcus',
      'salacia',
      'gonggong'
    ])
      expect(smallBodyOf(game.world.bodies.find((b) => b.id === id)!), id).toBeUndefined();
    expect(smallBodyOf(game.world.bodies.find((b) => b.id === 'bennu')!)).toBeDefined();
    expect(lookIdOf(game.world.bodies.find((b) => b.id === 'quaoar')!)).toMatch(/^ice:\d+:round$/);
  });

  it('every sphere body has a look that is not the generic fallback unless it is one', () => {
    for (const b of game.world.bodies) {
      if (smallBodyOf(b)) continue;
      expect(lookOf(b), b.id).toBeDefined();
    }
  });
});
