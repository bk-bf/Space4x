import { game, type Selection } from '#lib/game/index.ts';
import { requestRender, select } from '#lib/ui/index.ts';
import { camera, resetCamera } from './camera.svelte';

export function showSystem(id: string): void {
  if (game.world.system === id || !game.starSystem(id)) return;
  game.world.system = id;
  resetCamera();
}

export function focus(sel: Selection): void {
  const system = game.systemOf(sel);
  if (!system) return;
  showSystem(system);
  select(sel.kind, sel.id);
}

export function centreOn(x: number, y: number): void {
  camera.x = x;
  camera.y = y;
  requestRender();
}
