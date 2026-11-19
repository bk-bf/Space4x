import { describe, expect, it } from 'vitest';
import { Game } from '#lib/game/index.ts';
import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { PLACE_SUPPLY, mockFormations, mockUnits } from './model.ts';
import { placeName, placesOf } from './places.ts';

describe('ground places from the colonised bodies', () => {
  it('lists exactly the bodies marked as colonies', () => {
    for (const g of [new Game(), withFixture(new Game())]) {
      const colonies = g.world.bodies.filter((b) => b.colony);
      expect(placesOf(g)).toEqual(colonies.map((b) => ({ id: b.id, name: b.name })));
    }
    expect(placesOf(new Game()).map((p) => p.name)).toEqual(['Earth']);
    expect(placesOf(withFixture(new Game()))).toHaveLength(6);
  });

  it('follows a body that becomes a colony', () => {
    const g = new Game();
    g.world.bodies.find((b) => b.id === 'mars')!.colony = true;
    expect(placesOf(g).map((p) => p.id)).toEqual(['earth', 'mars']);
  });

  it('puts every mock formation and the place every unit trained at on a colonised body', () => {
    const ids = new Set(placesOf(new Game()).map((p) => p.id));
    for (const f of mockFormations()) expect(ids.has(f.place)).toBe(true);
    for (const u of mockUnits()) expect(ids.has(u.trainedAt)).toBe(true);
    for (const id of Object.keys(PLACE_SUPPLY)) expect(new Game().body(id)).toBeDefined();
  });

  it('names a place with the body name', () => {
    const g = new Game();
    expect(placeName('earth', g)).toBe(g.body('earth')!.name);
  });
});
