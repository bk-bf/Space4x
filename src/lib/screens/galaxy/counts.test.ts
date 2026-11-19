import { describe, expect, it } from 'vitest';
import { Game } from '#lib/game/index.ts';
import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { jumpSummary, systemCounts } from './counts.ts';
import { SYSTEMS, systemById } from './stars.ts';

const sol = systemById('sol')!;

describe('galaxy figures from the map', () => {
  it('counts the jump points of every system the map has data for', () => {
    const g = withFixture(new Game());
    for (const s of SYSTEMS) {
      const mapped = g.starSystem(s.id);
      if (!mapped) continue;
      expect(jumpSummary(s, g).split(',')[0]).toBe(String(mapped.jumps.length));
    }
    expect(jumpSummary(systemById('acen')!, g)).toBe('2, unsurveyed');
    expect(jumpSummary(systemById('barn')!, g)).toBe('1, unsurveyed');
  });

  it('shows Sol with the one jump point the map holds, and follows its state', () => {
    const g = new Game();
    expect(g.starSystem('sol')!.jumps).toHaveLength(1);
    expect(jumpSummary(sol, g)).toBe('1, unsurveyed');
    const point = g.starSystem('sol')!.jumps[0]!;
    point.surveyed = true;
    expect(jumpSummary(sol, g)).toBe('1');
    point.stable = true;
    expect(jumpSummary(sol, g)).toBe('1, stable');
  });

  it('says a system the map has no data for has unknown jump points', () => {
    const g = new Game();
    for (const s of SYSTEMS) if (!g.starSystem(s.id)) expect(jumpSummary(s, g)).toBe('Unknown');
  });

  it('counts bodies, colonies and fleets from the world', () => {
    const g = withFixture(new Game());
    const here = g.world.bodies.filter((b) => b.system === 'sol');
    expect(systemCounts(sol, g)).toEqual({
      bodies: here.length,
      colonies: here.filter((b) => b.colony).length,
      fleets: g.world.fleets.filter((f) => f.system === 'sol').length
    });
  });
});
