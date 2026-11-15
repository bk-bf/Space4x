import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildOf, classes, DAY, game, statsFor } from '#lib/game/index.ts';
import { Designer } from '#lib/screens/classes/designer.svelte.ts';
import { retoolYard, startBuild } from './actions.ts';
import { buildClass, buildClasses } from './catalog.ts';
import { canYardBuild } from './sim.ts';
import { economy, resetEconomy } from './state.svelte.ts';
import './system.ts';

const shipped = classes.saved;

beforeEach(() => {
  resetEconomy();
  game.events.length = 0;
});

afterEach(() => {
  classes.saved = shipped;
});

describe('classes saved in the designer', () => {
  it('reach the shipyard build list with the cost the part tables give', () => {
    expect(buildClasses().map((c) => c.id)).toEqual(shipped.map((c) => c.id));
    const designer = new Designer();
    designer.start('frame');
    designer.rename('Dray');
    designer.setRole('Light hauler');
    designer.save();
    const dray = buildClasses().find((c) => c.name === 'Dray')!;
    expect(dray).toMatchObject({ role: 'Light hauler', ...buildOf(statsFor(designer.draft)) });
    expect(buildClasses()).toHaveLength(shipped.length + 1);
  });

  it('are built once a yard is retooled for them, and cannot be deleted while a yard needs them', () => {
    const designer = new Designer();
    designer.start('frame');
    designer.rename('Dray');
    designer.save();
    const id = designer.baseId!;
    const earth = economy.colonies.find((c) => c.id === 'earth')!;
    const yard = earth.yards[0]!;
    expect(canYardBuild(yard, id)).toBe(true);
    startBuild(earth, yard.id, 1, id);
    expect(yard.slipways[0]!.build).toBeNull();
    retoolYard(earth, yard.id, id);
    expect(designer.canDelete).toBe(false);
    game.advance(200 * DAY);
    expect(yard.tooled).toBe(id);
    startBuild(earth, yard.id, 1, id);
    expect(yard.slipways[0]!.build).toEqual({ classId: id, done: 0, total: buildClass(id).bp });
    expect(game.events.some((e) => e.text.includes('laid down a Dray'))).toBe(true);
    designer.remove();
    expect(classes.find(id)).toBeDefined();
  });

  it('change a yard list when the class is redesigned', () => {
    const designer = new Designer();
    designer.pick('pike');
    const before = buildClass('pike');
    designer.addCore('armor');
    designer.save();
    expect(buildClass('pike').tons).toBeGreaterThan(before.tons);
    expect(buildClass('pike').bp).toBeGreaterThan(before.bp);
  });
});
