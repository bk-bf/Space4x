import { describe, expect, it } from 'vitest';
import { projectById } from '#lib/game/data/index.ts';
import { berthsOf, biospheresAt, economy, newSite } from '#lib/game/economy/index.ts';
import { biospherePeople } from '#lib/game/suitability.ts';
import { unloadItem } from './cargo.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';

const KIT = 'biosphere_kit';

const FREIGHTER = {
  id: 'freighter',
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 4],
    ['heavy_cargo_bay', 1],
    ['heavy_landing_legs', 1]
  ] as const
};

describe('biospheres as cargo', () => {
  it('stand at the site they are unloaded at once a whole one is there', () => {
    freshGame();
    economy.done.push(projectById('biosphere').number);
    addDesign(FREIGHTER);
    const moon = newSite(economy, {
      worldBody: 'luna',
      bodyName: 'Luna',
      place: 'surface',
      region: 'luna-maria',
      angle: 0
    })!;
    const at = { kind: 'site' as const, site: moon.id };
    const first = spawn('freighter', at, { cargo: { [KIT]: 300_000 } });
    expect(unloadItem(moon, first, { kind: 'all-cargo' }, null)).toBe(300_000);
    expect(biospheresAt(moon)).toBe(0);
    expect(moon.stock[KIT]).toBe(300_000);
    const second = spawn('freighter', at, { cargo: { [KIT]: 251_000 } });
    expect(unloadItem(moon, second, { kind: 'cargo', id: KIT }, null)).toBe(251_000);
    expect(biospheresAt(moon)).toBe(1);
    expect(moon.stock[KIT]).toBeUndefined();
    expect(berthsOf(moon)).toBe(biospherePeople('luna'));
  });
});
