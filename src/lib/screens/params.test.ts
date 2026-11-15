import { beforeEach, describe, expect, it } from 'vitest';
import { roster } from './commanders/roster.svelte.ts';
import { resetEconomy, showColony, ui } from './economy/state.svelte.ts';
import { galaxy } from './galaxy/galaxy.svelte.ts';
import { Intel, intel } from './intel/intel.svelte.ts';
import { applyScreenParams } from './params.ts';
import { research } from './research/research.svelte.ts';

beforeEach(resetEconomy);

describe('URL parameters', () => {
  it('set each screen once, and the screen state wins afterwards', () => {
    applyScreenParams(
      new URLSearchParams('colony=luna&tab=wealth&field=sensors&group=civilian&cmd=3&sys=barn')
    );
    expect(ui.colony).toBe('luna');
    expect(ui.tab).toBe('wealth');
    expect(research.field).toBe('sensors');
    expect(intel.group).toBe('civilian');
    expect(roster.selected).toBe(roster.officers[3]!.id);
    expect(galaxy.selected).toBe('barn');
    showColony('ceres');
    expect(ui.colony).toBe('ceres');
  });

  it('ignore a value that names nothing', () => {
    applyScreenParams(new URLSearchParams('colony=nowhere&tab=nothing'));
    expect(ui.colony).toBe('mars');
    expect(ui.tab).toBe('summary');
    showColony('nowhere');
    expect(ui.colony).toBe('mars');
  });
});

describe('opening Intelligence from a contact', () => {
  it('picks the group and the latest sighting of that contact', () => {
    const i = new Intel();
    expect(i.showContact('C-011')).toBe(true);
    expect(i.group).toBe('civilian');
    expect(i.filterGroup).toBe('civilian');
    expect(i.sighting).toBe('s5');
    expect(i.showContact('C-014')).toBe(true);
    expect(i.group).toBe('unidentified-1');
    expect(i.sighting).toBe('s1');
    expect(i.visible().map((s) => s.id)).toContain('s1');
  });

  it('leaves the screen as it was for a contact nobody has reported', () => {
    const i = new Intel();
    expect(i.showContact('C-999')).toBe(false);
    expect(i.group).toBe('unidentified-1');
  });
});
