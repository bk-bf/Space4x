import { buildingSprite, hasBuildingArt } from './buildings.ts';
import { componentSprite, hasComponentArt } from './components.ts';
import { hasMaterialArt, materialSprite } from './materials.ts';
import type { Sprite } from './sprite.ts';

export type IconKind = 'material' | 'building' | 'component';

export interface IconRef {
  kind: IconKind;
  id: string;
}

export const ICON_SIZE: Record<IconKind, { width: number; height: number }> = {
  material: { width: 16, height: 16 },
  building: { width: 24, height: 20 },
  component: { width: 16, height: 16 }
};

export const materialIcon = (id: string): string => materialSprite(id).url;
export const buildingIcon = (id: string): string => buildingSprite(id).url;
export const componentIcon = (id: string): string => componentSprite(id).url;

export function iconSprite(ref: IconRef): Sprite {
  return ref.kind === 'material'
    ? materialSprite(ref.id)
    : ref.kind === 'building'
      ? buildingSprite(ref.id)
      : componentSprite(ref.id);
}

export const iconUrl = (ref: IconRef): string => iconSprite(ref).url;

export function hasIconArt(ref: IconRef): boolean {
  return ref.kind === 'material'
    ? hasMaterialArt(ref.id)
    : ref.kind === 'building'
      ? hasBuildingArt(ref.id)
      : hasComponentArt(ref.id);
}

export { materialLook, SHAPE_NAMES, type MaterialLook, type MaterialShape } from './materials.ts';
export { KIND_COLOURS, KIND_EXAMPLES, FALLBACK_KIND_COLOUR } from './buildings.ts';
export * from './catalogue.ts';
export type { Sprite } from './sprite.ts';
