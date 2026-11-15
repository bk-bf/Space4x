import { game } from '#lib/game/index.ts';
import { shell } from '#lib/ui/index.ts';
import { fitAll, type Camera } from './camera.ts';
import { SYSTEMS, systemById } from './stars.ts';

class GalaxyState {
  camera = $state<Camera>({ x: 16, y: 0, z: 2 });
  selected = $state('sol');
  fitted = $state(false);
  size = $state.raw({ w: 0, h: 0 });

  showAll(): void {
    if (!this.size.w) return;
    this.camera = fitAll(SYSTEMS, this.size.w, this.size.h);
    this.fitted = true;
  }

  centreOn(id: string): void {
    const s = systemById(id);
    if (s) this.camera = { ...this.camera, x: s.x, y: s.y };
  }

  select(id: string): void {
    if (systemById(id)) this.selected = id;
  }

  canOpenOnMap(id: string): boolean {
    return game.world.systems.some((s) => s.id === id);
  }

  openOnMap(id: string): void {
    if (!this.canOpenOnMap(id)) return;
    game.world.system = id;
    shell.setScreen('map');
  }
}

export const galaxy = new GalaxyState();

let applied = false;

export function applyGalaxyParams(params: URLSearchParams): void {
  if (applied) return;
  applied = true;
  const id = params.get('sys');
  if (id) galaxy.select(id);
}
