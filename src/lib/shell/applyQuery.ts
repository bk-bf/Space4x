import { flushSync } from 'svelte';
import { game } from '#lib/game/index.ts';
import { select, shell, wm } from '#lib/ui/index.ts';
import { setZoom } from '#lib/screens/map/camera.svelte.ts';
import { showSystem } from '#lib/screens/map/focus.ts';
import { applyScreenParams } from '#lib/screens/params.ts';
import type { QueryState } from './query';

export function applyQuery(q: QueryState, params: URLSearchParams): void {
  applyScreenParams(params);
  wm.arrange(q.arrangement);
  const system = q.system ?? game.systemOf(q.selection);
  if (system) showSystem(system);
  select(q.selection.kind, q.selection.id);
  if (q.zoom) setZoom(q.zoom);
  if (q.dock) wm.setDock(q.dock.id, q.dock.slot);
  if (q.screen) shell.setScreen(q.screen);
  flushSync();
}
