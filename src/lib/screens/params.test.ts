import { beforeEach, describe, expect, it } from 'vitest';
import { roster } from './commanders/roster.svelte.ts';
import { resetEconomyScreen, showColony, ui } from './economy/state.svelte.ts';
import { galaxy } from './galaxy/galaxy.svelte.ts';
import { intel } from './intel/intel.svelte.ts';
import { applyScreenParams } from './params.ts';
import { research } from './research/research.svelte.ts';

beforeEach(resetEconomyScreen);

describe('URL parameters', () => {
  it('set each screen once, and the screen state wins afterwards', () => {
    applyScreenParams(
      new URLSearchParams('colony=earth&tab=stockpiles&project=4&group=civilian&cmd=3&sys=barn')
    );
    expect(ui.site).toBe('earth');
    expect(ui.tab).toBe('stockpiles');
    expect(research.selected).toBe(4);
    expect(intel.group).toBe('');
    expect(roster.selected).toBe(roster.officers[3]!.id);
    expect(galaxy.selected).toBe('barn');
    ui.tab = 'production';
    expect(ui.tab).toBe('production');
  });

  it('ignore a value that names nothing', () => {
    applyScreenParams(new URLSearchParams('colony=nowhere&tab=nothing&project=99'));
    expect(ui.site).toBe('earth');
    expect(ui.tab).toBe('summary');
    showColony('nowhere');
    expect(ui.site).toBe('earth');
  });
});
