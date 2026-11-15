import { flushSync } from 'svelte';
import { select, shell, wm } from '#lib/ui/index.ts';
import { setZoom } from '#lib/screens/map/camera.svelte.ts';
import type { QueryState } from './query';

export function applyQuery(q: QueryState): void {
  wm.arrange(q.arrangement);
  select(q.selection.kind, q.selection.id);
  if (q.zoom) setZoom(q.zoom);
  if (q.dock) wm.setDock(q.dock.id, q.dock.slot);
  if (q.screen) shell.setScreen(q.screen);
  flushSync();
}
