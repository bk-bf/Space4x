import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { DAY } from '#lib/game/clock.ts';
import { milestones } from '#lib/game/data/index.ts';
import { economy, siteAt, standing, standFirst, touch, type Site } from '#lib/game/economy/index.ts';
import { settleJumps } from '#lib/game/jump.ts';
import { foundSite } from './colonise.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { addOrder } from './orders.ts';
import { ships } from './state.svelte.ts';

const unlock = (upTo: number) => {
  economy.done = milestones.filter((m) => !m.optional && m.number <= upTo).map((m) => m.number);
};

const SURVEYOR = {
  id: 'surveyor',
  role: 'probe' as const,
  parts: [
    ['fusion_drive', 4],
    ['propellant_tank', 2],
    ['structure_truss', 1],
    ['avionics', 1],
    ['survey_suite', 1],
    ['radiator', 4],
    ['cargo_bay', 2]
  ] as const
};

describe('the jump point', () => {
  it('is reached by a fusion ship, surveyed by its instrument, and founded only once surveyed', () => {
    const g = freshGame();
    unlock(28);
    addDesign(SURVEYOR);
    const v = spawn(
      'surveyor',
      { kind: 'orbit', body: 'earth', angle: 0 },
      {
        propellant: { deuterium: 15_000 },
        cargo: { stainless_steel: 1000, copper: 300, aluminium: 300, ai_accelerator: 50 }
      }
    );
    const jump = g.jump('sol-a')!.point;
    expect(jump.surveyed).toBe(false);
    expect(jump.stable).toBe(false);
    const early = spawn(
      'surveyor',
      { kind: 'orbit', body: 'sol-a', angle: 0 },
      { cargo: { stainless_steel: 1000 } }
    );
    expect(foundSite(g, early, 'data_centre')).toMatch(/not been surveyed/);
    expect(economy.sites).toHaveLength(1);
    addOrder(v, { type: 'fly', body: 'sol-a', angle: 0, profile: 'fastest' });
    addOrder(v, { type: 'survey', body: 'sol-a' });
    g.advance(DAY);
    expect(v.blocked, String(v.blocked)).toBeNull();
    expect(v.trip).not.toBeNull();
    const days = (v.trip!.arrival - g.elapsed) / DAY;
    console.info(
      'jump point trip days',
      days.toFixed(1),
      'dv',
      v.trip!.dv.toFixed(0),
      'propellant',
      v.trip!.propellant.toFixed(0)
    );
    g.advance((days + 2) * DAY);
    expect(v.at).toEqual({ kind: 'orbit', body: 'sol-a', angle: 0 });
    expect(jump.surveyed).toBe(false);
    g.advance(31 * DAY);
    expect(jump.surveyed).toBe(true);
    expect(v.orders).toHaveLength(0);
  });

  it('holds a site that receives cargo, builds there, and goes stable when the last milestone is reached', () => {
    const g = freshGame();
    unlock(28);
    addDesign(SURVEYOR);
    const jump = g.jump('sol-a')!.point;
    jump.surveyed = true;
    const v = spawn(
      'surveyor',
      { kind: 'orbit', body: 'sol-a', angle: 0 },
      {
        propellant: { deuterium: 1000 },
        cargo: { stainless_steel: 1000, copper: 300, aluminium: 300, ai_accelerator: 50 }
      }
    );
    const site = foundSite(g, v, 'data_centre') as Site;
    expect(typeof site).not.toBe('string');
    expect(site.id).toBe('sol-a');
    expect(site.place).toBe('point');
    expect(site.worldBody).toBe('sol-a');
    expect(site.body).toBe('jump-point');
    expect(standing(site, 'data_centre')).toBe(1);
    expect(site.gridKw).toBeGreaterThan(1000);
    const hauler = spawn(
      'surveyor',
      { kind: 'orbit', body: 'sol-a', angle: 0 },
      { cargo: { stainless_steel: 500 } }
    );
    addOrder(hauler, { type: 'dock', site: site.id });
    addOrder(hauler, { type: 'unload', item: { kind: 'cargo', id: 'stainless_steel' }, amount: null });
    g.advance(DAY);
    expect(hauler.at).toEqual({ kind: 'site', site: 'sol-a' });
    expect(site.stock.stainless_steel).toBeGreaterThan(499);
    expect(siteAt(economy, 'sol-a', 'point')).toBe(site);

    settleJumps(g);
    expect(jump.stable).toBe(false);
    standFirst(economy, site, 'jump_point_stabiliser');
    settleJumps(g);
    expect(jump.stable).toBe(false);
    economy.done.push(29);
    settleJumps(g);
    expect(jump.stable).toBe(true);
    const ending = g.events.filter((e) => e.text.includes('is stable'));
    expect(ending).toHaveLength(1);
    settleJumps(g);
    expect(g.events.filter((e) => e.text.includes('is stable'))).toHaveLength(1);
    touch();
    expect(ships.vessels).toContain(hauler);
  });
});

describe('a scoop at a gas giant', () => {
  it('is founded from orbit as a platform, makes helium-3 from the air and takes cargo from orbit', () => {
    const g = freshGame();
    unlock(28);
    addDesign({
      id: 'scooper',
      role: 'freighter',
      parts: [
        ['fusion_drive', 2],
        ['propellant_tank', 2],
        ['structure_truss', 1],
        ['avionics', 1],
        ['radiator', 2],
        ['cargo_bay', 6]
      ]
    });
    const v = spawn(
      'scooper',
      { kind: 'orbit', body: 'jupiter', angle: 0 },
      { cargo: { asteroidal_steel: 20_000, rebco: 50, uhtc: 500, ai_models: 5 } }
    );
    const site = foundSite(g, v, 'gas_giant_scoop') as Site;
    expect(typeof site).not.toBe('string');
    expect(site.id).toBe('jupiter');
    expect(site.place).toBe('surface');
    expect(site.region).toBeNull();
    expect(standing(site, 'gas_giant_scoop')).toBe(1);
    const process = site.groups[0]!.process;
    expect(process).toMatch(/^extract:/);
    site.gridKw = 5000;
    g.advance(DAY);
    const first = process!.slice('extract:'.length);
    expect(site.stock[first]).toBeGreaterThan(0);
    const hauler = spawn('scooper', { kind: 'orbit', body: 'jupiter', angle: 0 }, {});
    addOrder(hauler, { type: 'dock', site: site.id });
    addOrder(hauler, { type: 'load', item: { kind: 'cargo', id: first }, amount: null });
    addOrder(hauler, { type: 'fly', body: 'jupiter', angle: 0 });
    g.advance(DAY);
    expect(hauler.blocked).toBeNull();
    expect(hauler.at).toEqual({ kind: 'orbit', body: 'jupiter', angle: 0 });
    expect(Object.values(hauler.cargo).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});
