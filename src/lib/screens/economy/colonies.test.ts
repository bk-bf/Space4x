import { describe, expect, it } from 'vitest';
import { bodyPosition, game, isColony } from '#lib/game/index.ts';
import { postOptions } from '#lib/screens/commanders/roster.svelte.ts';
import { systemCounts } from '#lib/screens/galaxy/counts.ts';
import { systemById } from '#lib/screens/galaxy/stars.ts';
import { colonyEnvironment, colonyName, colonyOf, colonySystem, peopleAt } from './lookup.ts';
import { economy } from './state.svelte.ts';

const colonised = () => game.world.bodies.filter(isColony);

describe('colonies', () => {
  it('are the colonised bodies of the world and nothing else', () => {
    expect(economy.colonies.map((c) => c.id).sort()).toEqual(
      colonised()
        .map((b) => b.id)
        .sort()
    );
    expect(colonised().map((b) => b.name)).toEqual(
      expect.arrayContaining(['Earth', 'Luna', 'Mars', 'Ceres', 'Europa', 'Centauri II'])
    );
  });

  it('take name, system and surroundings from their body', () => {
    for (const c of economy.colonies) {
      const body = game.body(c.id)!;
      expect(colonyName(c)).toBe(body.name);
      expect(colonySystem(c)).toBe(body.system);
      expect(colonyEnvironment(c)).toMatchObject({
        gravity: body.facts.gravity,
        surface: body.facts.surface
      });
      expect(colonyOf(body.id)).toBe(c);
    }
  });

  it('show their population wherever a body is described, and None elsewhere', () => {
    expect(peopleAt('mars')).toBe('2.4 M');
    expect(peopleAt('earth')).toBe('1.2 bn');
    expect(peopleAt('venus')).toBe('None');
  });

  it('feed the governorships and the galaxy counts', () => {
    expect(postOptions('governor', game).map((p) => p.ref)).toEqual(colonised().map((b) => b.id));
    for (const id of ['sol', 'acen', 'barn']) {
      const counts = systemCounts(systemById(id)!);
      const bodies = game.world.bodies.filter((b) => b.system === id);
      expect(counts).toEqual({
        bodies: bodies.length,
        colonies: bodies.filter(isColony).length,
        fleets: game.world.fleets.filter((f) => f.system === id).length
      });
    }
    expect(systemCounts(systemById('sol')!).colonies).toBe(5);
    expect(systemCounts(systemById('acen')!).colonies).toBe(1);
  });

  it('keep moons on their parent body', () => {
    const luna = game.body('luna')!;
    const earth = game.body('earth')!;
    const [lx, ly] = bodyPosition(luna, game.world.bodies);
    const [ex, ey] = bodyPosition(earth, game.world.bodies);
    expect(luna.parent).toBe('earth');
    expect(Math.hypot(lx - ex, ly - ey) / luna.orbit).toBeCloseTo(1, 9);
    const europa = game.body('europa')!;
    const [jx, jy] = bodyPosition(game.body('jupiter')!, game.world.bodies);
    const [px, py] = bodyPosition(europa, game.world.bodies);
    expect(Math.hypot(px - jx, py - jy) / europa.orbit).toBeCloseTo(1, 9);
  });
});
