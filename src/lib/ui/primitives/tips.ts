import { buildings, materials, recipes, shipComponents } from '#lib/game/data/records.ts';
import {
  BUILDING_KIND_DESCRIPTIONS,
  COMPONENT_KIND_DESCRIPTIONS,
  buildingKindName,
  categoryName,
  componentKindName,
  type IconRef
} from '#lib/gfx/icons/index.ts';
import { thrust } from '../format.ts';
import { dim, tipText } from './tooltip.ts';

const byId = <T extends { id: string }>(items: readonly T[]) => new Map(items.map((i) => [i.id, i]));

const materialById = byId(materials);
const buildingById = byId(buildings);
const componentById = byId(shipComponents);

const bare = (name: string) => name.split(' (')[0] ?? name;

export const materialName = (id: string): string => {
  const m = materialById.get(id);
  return m ? bare(m.name) : 'Unknown material';
};

export const buildingName = (id: string): string => buildingById.get(id)?.name ?? 'Unknown building';

export const componentName = (id: string): string => componentById.get(id)?.name ?? 'Unknown part';

export const iconName = (ref: IconRef): string =>
  ref.kind === 'material'
    ? materialName(ref.id)
    : ref.kind === 'building'
      ? buildingName(ref.id)
      : componentName(ref.id);

function outputsOf(buildingId: string): string[] {
  const made = new Set(
    recipes.filter((r) => r.building === buildingId).flatMap((r) => Object.keys(r.outputs))
  );
  if (made.size) return [...made];
  return materials.filter((m) => m.sources?.some((s) => s.building === buildingId)).map((m) => m.id);
}

export function buildingDescription(id: string): string {
  const b = buildingById.get(id);
  if (!b) return '';
  const outs = outputsOf(id),
    list = outs
      .slice(0, 4)
      .map((m) => materialName(m).toLowerCase())
      .join(', ');
  return `${BUILDING_KIND_DESCRIPTIONS[b.kind] ?? ''}${list ? ` Makes ${list}${outs.length > 4 ? ' and more' : ''}.` : ''}`.trim();
}

export function componentDescription(id: string): string {
  const c = componentById.get(id);
  if (!c) return '';
  const p = c.performance;
  return `${COMPONENT_KIND_DESCRIPTIONS[c.kind] ?? ''}${p?.isp ? ` Isp ${p.isp} s, thrust ${thrust(p.thrust)}.` : ''}`.trim();
}

export function materialTip(id: string, ...extra: (string | false | null | undefined)[]): string {
  const m = materialById.get(id);
  return tipText(materialName(id), m ? categoryName(m.category) : '', m ? dim(m.why) : '', extra);
}

export function buildingTip(id: string, ...extra: (string | false | null | undefined)[]): string {
  const b = buildingById.get(id);
  return tipText(buildingName(id), b ? buildingKindName(b.kind) : '', dim(buildingDescription(id)), extra);
}

export function componentTip(id: string, ...extra: (string | false | null | undefined)[]): string {
  const c = componentById.get(id);
  return tipText(componentName(id), c ? componentKindName(c.kind) : '', dim(componentDescription(id)), extra);
}

export function iconTip(ref: IconRef, ...extra: (string | false | null | undefined)[]): string {
  return ref.kind === 'material'
    ? materialTip(ref.id, ...extra)
    : ref.kind === 'building'
      ? buildingTip(ref.id, ...extra)
      : componentTip(ref.id, ...extra);
}
