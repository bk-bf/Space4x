import { describe, expect, it } from 'vitest';
import { DAY, Game } from '#lib/game/index.ts';
import { POINTS_PER_LAB_YEAR, Research, research, YEAR_SECONDS } from './research.svelte.ts';
import { TECHS, techById } from './tech.ts';
import './system.ts';

const labsChip = (g: Game) => g.status.find((c) => c.id === 'labs')?.value;

describe('the research tree', () => {
  it('has eight fields of eight technologies each, with prerequisites inside the field', () => {
    const fields = new Set(TECHS.map((t) => t.field));
    expect(fields.size).toBe(8);
    for (const f of fields) expect(TECHS.filter((t) => t.field === f)).toHaveLength(8);
    for (const t of TECHS)
      for (const need of t.needs) expect(techById(need)?.field, `${t.id} needs ${need}`).toBe(t.field);
  });

  it('gives every technology its own cell on its field grid', () => {
    const cells = TECHS.map((t) => `${t.field}:${t.col}:${t.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });
});

describe('Research', () => {
  it('starts with four of five labs busy and sorts technologies into the four states', () => {
    const r = new Research();
    expect(r.labsUsed).toBe(4);
    expect(r.labsFree).toBe(1);
    expect(r.stateOf('nuclear-thermal')).toBe('done');
    expect(r.stateOf('ion-drive')).toBe('running');
    expect(r.stateOf('fusion-torch')).toBe('open');
    expect(r.stateOf('plasma-drive')).toBe('locked');
  });

  it('advances a running project by labs times the base rate times the field bonus', () => {
    const r = new Research();
    const g = new Game();
    const before = r.points['ion-drive']!;
    r.advance(g, YEAR_SECONDS / 10);
    expect(r.points['ion-drive']! - before).toBeCloseTo(2 * POINTS_PER_LAB_YEAR * 1.2 * 0.1, 6);
  });

  it('gives no bonus when the lead works in another field', () => {
    const r = new Research();
    const fusion = techById('fusion-torch')!;
    expect(r.rateOf(fusion, 'sato', 1)).toBeCloseTo(POINTS_PER_LAB_YEAR / YEAR_SECONDS, 12);
    expect(r.rateOf(fusion, 'okafor', 1)).toBeCloseTo((POINTS_PER_LAB_YEAR * 1.2) / YEAR_SECONDS, 12);
  });

  it('does not progress a project that has no labs', () => {
    const r = new Research();
    const before = r.points['fuel-refining-ii']!;
    r.advance(new Game(), YEAR_SECONDS);
    expect(r.points['fuel-refining-ii']).toBe(before);
    expect(r.stateOf('fuel-refining-ii')).toBe('running');
  });

  it('completes a project, opens its dependants, frees its labs and writes an event', () => {
    const r = new Research();
    const g = new Game();
    r.totalLabs = 10;
    r.setLabs('fuel-refining-ii', 1, g);
    expect(r.start('orbital-smelting', 'moreau', 1, g)).toBe(true);
    expect(r.stateOf('deep-mining')).toBe('locked');
    const usedBefore = r.labsUsed;
    r.advance(g, 10 * YEAR_SECONDS);
    expect(r.stateOf('fuel-refining-ii')).toBe('done');
    expect(r.stateOf('orbital-smelting')).toBe('done');
    expect(r.stateOf('deep-mining')).toBe('open');
    expect(r.labsUsed).toBeLessThan(usedBefore);
    expect(g.events.some((e) => e.text.includes('Fuel refining II finished under Moreau'))).toBe(true);
    expect(g.events.some((e) => e.text.includes('Now open: Deep mining'))).toBe(true);
  });

  it('keeps the top bar labs chip equal to the labs in use', () => {
    const r = new Research();
    const g = new Game();
    r.advance(g, DAY);
    expect(labsChip(g)).toBe('4/5');
    expect(r.start('fusion-torch', 'okafor', 1, g)).toBe(true);
    expect(labsChip(g)).toBe('5/5');
    r.cancel('fusion-torch', g);
    expect(labsChip(g)).toBe('4/5');
  });

  it('refuses to start what is locked, running, done, or beyond free labs or the lead capacity', () => {
    const r = new Research();
    const g = new Game();
    expect(r.start('plasma-drive', 'okafor', 1, g)).toBe(false);
    expect(r.start('ion-drive', 'okafor', 1, g)).toBe(false);
    expect(r.start('chemical-rockets', 'okafor', 1, g)).toBe(false);
    expect(r.start('fusion-torch', 'okafor', 2, g)).toBe(false);
    expect(r.start('fusion-torch', 'okafor', 0, g)).toBe(false);
    expect(r.start('laser-sail', 'okafor', 1, g)).toBe(true);
    expect(r.start('compact-reactor', 'adeyemi', 1, g)).toBe(false);
    expect(r.labsFree).toBe(0);
  });

  it('moves labs between projects within the free labs and the lead capacity', () => {
    const r = new Research();
    const g = new Game();
    expect(r.setLabs('ion-drive', 3, g)).toBe(true);
    expect(r.labsFree).toBe(0);
    expect(r.setLabs('ion-drive', 4, g)).toBe(false);
    expect(r.setLabs('composite-armour', 2, g)).toBe(false);
    expect(r.setLabs('ion-drive', 1, g)).toBe(true);
    expect(r.setLabs('composite-armour', 2, g)).toBe(true);
    expect(r.setLabs('composite-armour', 3, g)).toBe(false);
  });

  it('keeps the progress of a cancelled project so that starting it again resumes it', () => {
    const r = new Research();
    const g = new Game();
    const fraction = r.fraction('ion-drive');
    expect(r.cancel('ion-drive', g)).toBe(true);
    expect(r.stateOf('ion-drive')).toBe('open');
    expect(r.labsUsed).toBe(2);
    expect(r.fraction('ion-drive')).toBeCloseTo(fraction, 12);
    expect(r.start('ion-drive', 'okafor', 1, g)).toBe(true);
    expect(r.fraction('ion-drive')).toBeCloseTo(fraction, 12);
  });

  it('runs on the game clock through the registered system', () => {
    const g = new Game();
    const before = research.points['ion-drive']!;
    g.advance(30 * DAY);
    const gained = 2 * POINTS_PER_LAB_YEAR * 1.2 * ((30 * DAY) / YEAR_SECONDS);
    expect(research.points['ion-drive']! - before).toBeCloseTo(gained, 6);
    expect(labsChip(g)).toBe('4/5');
  });
});
