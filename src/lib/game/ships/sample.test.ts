import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { DAY } from '#lib/game/clock.ts';
import { economy, newSite, standFirst } from '#lib/game/economy/index.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { addOrder } from './orders.ts';
import { SAMPLE_DAYS, SAMPLE_KG, sampleMaterial } from './sample.ts';

const PROBE = {
  id: 'prospector',
  role: 'probe' as const,
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 2],
    ['structure_truss', 1],
    ['solar_array', 1],
    ['avionics', 1],
    ['sampling_arm', 1],
    ['cargo_bay', 1]
  ] as const
};

describe('sampling an asteroid', () => {
  it('takes the main material of the asteroid into the hold after the sampling time, then lets it be unloaded at a site', () => {
    const g = freshGame();
    addDesign(PROBE);
    expect(sampleMaterial('bennu')).toBe('carbonaceous_chondrite');
    expect(sampleMaterial('luna')).toBeUndefined();
    const v = spawn('prospector', { kind: 'orbit', body: 'bennu', angle: 0 });
    addOrder(v, { type: 'sample' });
    g.advance((SAMPLE_DAYS - 1) * DAY);
    expect(v.cargo.carbonaceous_chondrite).toBeUndefined();
    g.advance(2 * DAY);
    expect(v.cargo.carbonaceous_chondrite).toBe(SAMPLE_KG);
    expect(v.orders).toEqual([]);
    expect(g.events.some((e) => e.text.includes('took a sample of Bennu'))).toBe(true);
  });

  it('is refused without a sampling arm, away from an asteroid, and with a full hold', () => {
    const g = freshGame();
    addDesign(PROBE);
    addDesign({ ...PROBE, id: 'armless', parts: PROBE.parts.filter(([c]) => c !== 'sampling_arm') });
    const blind = spawn('armless', { kind: 'orbit', body: 'bennu', angle: 0 });
    addOrder(blind, { type: 'sample' });
    const near = spawn('prospector', { kind: 'orbit', body: 'luna', angle: 0 });
    addOrder(near, { type: 'sample' });
    const full = spawn('prospector', { kind: 'orbit', body: 'bennu', angle: 0 }, { cargo: { iron: 4000 } });
    addOrder(full, { type: 'sample' });
    g.advance(DAY);
    expect(blind.blocked).toContain('no sampling arm');
    expect(near.blocked).toContain('not at an asteroid');
    expect(full.blocked).toContain('no room');
  });

  it('puts a sample into the station stock once it is unloaded there', () => {
    const g = freshGame();
    addDesign(PROBE);
    const station = newSite(economy, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
    standFirst(economy, station, 'propellant_depot');
    const v = spawn(
      'prospector',
      { kind: 'site', site: station.id },
      { cargo: { carbonaceous_chondrite: 1 } }
    );
    expect(station.stock.carbonaceous_chondrite ?? 0).toBe(0);
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'carbonaceous_chondrite' }, amount: null });
    g.advance(DAY);
    expect(station.stock.carbonaceous_chondrite).toBe(1);
  });
});
