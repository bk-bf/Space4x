import { ui } from '#lib/screens/economy/state.svelte.ts';
import { shell } from '#lib/ui/index.ts';
import type { Place } from './next.ts';
import { research } from './research.svelte.ts';

export function go(place: Place): void {
  switch (place.kind) {
    case 'research':
      research.selected = place.milestone;
      shell.setScreen('research');
      return;
    case 'classes':
      shell.setScreen('classes');
      return;
    case 'production':
      ui.site = place.site;
      ui.tab = 'production';
      ui.groupKind = 'all';
      ui.group = place.group;
      ui.target = place.target ?? '';
      ui.switchCount = place.count ?? 1;
      break;
    case 'construction':
      ui.site = place.site;
      ui.tab = 'construction';
      ui.buildKind = 'all';
      ui.pick = place.building;
      ui.side = 'pick';
      ui.recipe = place.recipe ?? '';
      break;
    case 'stockpiles':
      ui.site = place.site;
      ui.tab = 'stockpiles';
      ui.category = 'all';
      ui.material = place.material;
      break;
    case 'economy':
      ui.site = place.site;
      ui.tab = place.tab;
      break;
  }
  shell.setScreen('economy');
}
