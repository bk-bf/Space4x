import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { DAY } from '#lib/game/clock.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { burnHop, planHop } from './hop.ts';
import { addOrder } from './orders.ts';

const TUG = [
  ['ion_thruster', 14],
  ['copv', 8],
  ['fission_reactor_ship', 6],
  ['structure_truss', 1],
  ['avionics', 1],
  ['radiator', 4],
  ['cargo_bay', 2]
] as const;

describe('landing on a small body with the drive that has the thrust', () => {
  it('cannot land a ship on an electric drive on a large asteroid', () => {
    const g = freshGame();
    addDesign({ id: 'ion', role: 'freighter', parts: TUG });
    const v = spawn('ion', { kind: 'orbit', body: 'hertha', angle: 0 }, { propellant: { xenon: 10_000 } });
    const plan = planHop(g, v, 'descent', 'hertha');
    expect(typeof plan).toBe('string');
    expect(plan).toContain('Thrust to weight');
  });

  it('lands it on a chemical engine it carries as well and burns that engine propellant, not the xenon', () => {
    const g = freshGame();
    addDesign({
      id: 'both',
      role: 'freighter',
      parts: [...TUG, ['chemical_engine_methalox', 1], ['propellant_tank', 1]]
    });
    const v = spawn(
      'both',
      { kind: 'orbit', body: 'hertha', angle: 0 },
      { propellant: { xenon: 10_000, methalox: 2000 } }
    );
    const plan = planHop(g, v, 'descent', 'hertha');
    expect(typeof plan).not.toBe('string');
    if (typeof plan === 'string') return;
    expect(plan.fuel).toBe('methalox');
    burnHop(v, plan);
    expect(v.propellant.xenon).toBe(10_000);
    expect(v.propellant.methalox).toBeLessThan(2000);
    addOrder(v, { type: 'land', body: 'hertha' });
    g.advance(2 * DAY);
    expect(v.at.kind).toBe('surface');
  });

  it('is unchanged for a ship with one kind of drive', () => {
    const g = freshGame();
    addDesign({
      id: 'plain',
      role: 'lander',
      parts: [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 2],
        ['structure_truss', 1],
        ['landing_legs', 1]
      ]
    });
    const v = spawn('plain', { kind: 'orbit', body: 'luna', angle: 0 }, { propellant: { methalox: 30_000 } });
    const plan = planHop(g, v, 'descent', 'luna');
    expect(typeof plan).not.toBe('string');
    if (typeof plan !== 'string') expect(plan.fuel).toBe('methalox');
  });
});
