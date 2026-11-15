import { game } from '#lib/game/index.ts';
import type { SelectionKind } from '#lib/game/index.ts';
import { requestRender } from './frame';
import { wm } from './wm/wm.svelte';

export const SELECTION_WINDOW = 'sel';

export function select(kind: SelectionKind, id: string): void {
  game.select({ kind, id });
  wm.reveal(SELECTION_WINDOW);
  requestRender();
}
