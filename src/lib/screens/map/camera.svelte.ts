import { clamp } from '#lib/gfx/math.ts';
import { requestRender, wm } from '#lib/ui/index.ts';

export const MAP_SCALE = 2;
export const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const;
export const SHIP_ZOOM = 3;

export const camera = $state({ x: 0, y: 0, z: 1 });

export const layers = $state({ Orbits: true, Names: true, Sensors: true, Asteroids: true, Course: true });

export type Layer = keyof typeof layers;

export function viewCentre(): readonly [number, number] {
  const f = wm.free;
  return [(f.x + f.w / 2) / MAP_SCALE, (f.y + f.h / 2) / MAP_SCALE];
}

export function zoomBy(dir: number, at?: { x: number; y: number }): void {
  const [cx0, cy0] = viewCentre();
  const px = at ? at.x / MAP_SCALE : cx0,
    py = at ? at.y / MAP_SCALE : cy0;
  const wx = camera.x + (px - cx0) / camera.z,
    wy = camera.y + (py - cy0) / camera.z;
  const i = ZOOMS.findIndex((z) => z === camera.z);
  camera.z = ZOOMS[clamp((i < 0 ? 2 : i) + dir, 0, ZOOMS.length - 1)]!;
  camera.x = wx - (px - cx0) / camera.z;
  camera.y = wy - (py - cy0) / camera.z;
  requestRender();
}

export function resetCamera(): void {
  camera.x = camera.y = 0;
  camera.z = 1;
  requestRender();
}

export function setZoom(z: number): void {
  camera.z = z;
  requestRender();
}

export function toggleLayer(k: Layer): void {
  layers[k] = !layers[k];
  requestRender();
}
