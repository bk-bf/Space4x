import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { describe, expect, it } from 'vitest';
import { AU, Game, parkingRadius } from '#lib/game/index.ts';
import { locate, planetExtent, presetFor, presets, systemExtent } from './targets';

describe('map presets', () => {
  const g = withFixture(new Game()),
    W = 410,
    H = 280;

  it('fits the whole system, out to Neptune, in the System view', () => {
    const p = presetFor(g, 'system', W, H)!;
    const extent = planetExtent(g, 'sol');
    expect(extent).toBeGreaterThan(30 * AU);
    expect(extent).toBeLessThan(31 * AU);
    expect(extent / 10 ** p.L).toBeLessThan(H / 2);
    expect(extent / 10 ** p.L).toBeGreaterThan(H / 2 - 20);
  });

  it('lets the zoom reach the farthest dwarf planet and comet', () => {
    expect(systemExtent(g, 'sol')).toBeGreaterThan(planetExtent(g, 'sol') * 10);
  });

  it('fits the rocky bodies and the belt, not the giants, in the Inner system view', () => {
    const p = presetFor(g, 'inner', W, H)!,
      ceres = g.body('ceres')!.orbit;
    expect(ceres / 10 ** p.L).toBeLessThan(H / 2);
    expect(ceres / 10 ** p.L).toBeGreaterThan(H / 4);
  });

  it('offers the star, every colony and every fleet of the shown system', () => {
    const ids = presets(g, W, H).map((p) => p.label);
    expect(ids.slice(0, 4)).toEqual(['System', 'Inner system', 'Belt', 'Sun']);
    expect(ids).toEqual(
      expect.arrayContaining(['Earth', 'Mars', 'Luna', 'Freight convoy', 'Jupiter picket'])
    );
    expect(ids).not.toContain('Probe group');
  });

  it('frames a parked fleet with the body it orbits', () => {
    const p = presetFor(g, 'convoy', W, H)!,
      earth = g.body('earth')!;
    expect(parkingRadius(earth) / 10 ** p.L).toBeCloseTo(H * 0.3, 6);
    expect(locate(p.aim as string, g)).toMatchObject({ x: g.fleet('convoy')!.x });
  });
});
