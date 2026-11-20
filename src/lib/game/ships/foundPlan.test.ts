import { describe, expect, it } from 'vitest';
import { stageProjects } from '#lib/game/stages.ts';
import { economy, touch } from '#lib/game/economy/index.ts';
import { completeSurvey } from '#lib/game/survey.svelte.ts';
import {
  foundOptions,
  foundOptionsAt,
  foundRegions,
  needsRegion,
  placeNeedsRegion,
  placement,
  regionsAt
} from './colonise.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';

const CARGO = { stainless_steel: 2600, copper: 120, aluminium: 500 };

function reachAll(): void {
  economy.done = stageProjects(17);
  touch();
}

function carrier() {
  addDesign({
    id: 'carrier',
    role: 'freighter',
    parts: [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1],
      ['cargo_bay', 1]
    ],
    load: [['methalox', 1e9]]
  });
}

describe('the founding preview of a planned place', () => {
  it('lists the first buildings and missing cargo a ship in Earth orbit would get', () => {
    freshGame();
    reachAll();
    carrier();
    const v = spawn('carrier', { kind: 'orbit', body: 'earth', angle: 0.4 }, { cargo: { ...CARGO } });
    const planned = placement('orbit', 'earth');
    expect(planned).toEqual({ worldBody: 'earth', place: 'orbit' });
    expect(placeNeedsRegion(planned)).toBe(false);
    const preview = foundOptionsAt(planned, CARGO);
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).toEqual(foundOptions(v));
    expect(preview.some((o) => o.missing.length > 0)).toBe(true);
  });

  it('lists the same options in a Moon region as a ship landed there', () => {
    freshGame();
    reachAll();
    carrier();
    const v = spawn('carrier', { kind: 'surface', body: 'luna' }, { cargo: { ...CARGO } });
    const planned = placement('surface', 'luna');
    expect(placeNeedsRegion(planned)).toBe(needsRegion(v));
    expect(regionsAt(planned)).toEqual(foundRegions(v));
    expect(foundOptionsAt(planned, CARGO)).toEqual([]);
    for (const r of regionsAt(planned)) {
      const preview = foundOptionsAt(planned, CARGO, r.id);
      expect(preview).toEqual(foundOptions(v, r.id));
    }
    const pole = foundOptionsAt(planned, CARGO, 'luna-south-pole').map((o) => o.building.id);
    const maria = foundOptionsAt(planned, CARGO, 'luna-maria').map((o) => o.building.id);
    expect(pole).not.toEqual(maria);
  });

  it('lists the same options on a surveyed asteroid as a ship landed on it, and none before the survey', () => {
    freshGame();
    reachAll();
    carrier();
    const v = spawn('carrier', { kind: 'surface', body: 'bennu' }, { cargo: { ...CARGO } });
    const planned = placement('surface', 'bennu');
    expect(regionsAt(planned)).toEqual([]);
    completeSurvey('bennu');
    const regions = regionsAt(planned);
    expect(regions.map((r) => r.id)).toEqual(['bennu-body']);
    const preview = foundOptionsAt(planned, CARGO, 'bennu-body');
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).toEqual(foundOptions(v, 'bennu-body'));
  });

  it('treats the orbit of a giant as a platform and a jump point as a point', () => {
    const g = freshGame();
    const jump = g.world.systems.flatMap((s) => s.jumps)[0]!;
    expect(placement('orbit', jump.id).place).toBe('point');
    expect(placement('orbit', 'jupiter').place).toBe('surface');
    expect(placement('orbit', 'luna').place).toBe('orbit');
  });
});
