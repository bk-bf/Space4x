import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildings, materials, shipComponents } from '#lib/game/data/records.ts';
import { buildingIcon, componentIcon, hasIconArt, iconSprite, materialIcon, type IconKind } from './index.ts';
import hashes from './mockup-hashes.json';

const digest = (kind: IconKind, id: string) =>
  createHash('sha1').update(iconSprite({ kind, id }).pixels).digest('hex');

const ids: Record<IconKind, string[]> = {
  material: materials.map((m) => m.id),
  building: buildings.map((b) => b.id),
  component: shipComponents.map((c) => c.id)
};

describe('icons drawn like the mockup', () => {
  for (const [name, kind] of [
    ['material', 'material'],
    ['building', 'building'],
    ['component', 'component']
  ] as const)
    it(`every ${name} the mockup drew has the same pixels`, () => {
      const wrong = Object.entries(hashes[kind]).filter(([id, sha]) => digest(kind, id) !== sha);
      expect(wrong.map(([id]) => id)).toEqual([]);
    });
});

describe('icon coverage', () => {
  it('draws something for every id in the data', () => {
    for (const kind of Object.keys(ids) as IconKind[])
      for (const id of ids[kind]) {
        const s = iconSprite({ kind, id });
        expect(s.url.startsWith('data:image/png;base64,')).toBe(true);
        expect(s.pixels.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
      }
  });

  it('draws unknown ids as a generic icon instead of nothing', () => {
    for (const kind of ['material', 'building', 'component'] as const)
      expect(
        iconSprite({ kind, id: 'not_in_the_data' }).pixels.some((v, i) => i % 4 === 3 && v === 255)
      ).toBe(true);
  });

  it('lists the ids that fall back to a generic drawing', () => {
    const fallback = (Object.keys(ids) as IconKind[]).flatMap((kind) =>
      ids[kind].filter((id) => !hasIconArt({ kind, id })).map((id) => `${kind}:${id}`)
    );
    expect(fallback.sort()).toEqual([
      'component:cargo_bay',
      'component:crew_capsule',
      'component:landing_legs',
      'material:u_mo_fuel',
      'material:uzrh_fuel',
      'material:w_cermet'
    ]);
  });

  it('keeps the fallback of a known kind distinct from an unknown id', () => {
    expect(digest('component', 'cargo_bay')).not.toBe(digest('component', 'not_in_the_data'));
  });
});

describe('icon cache', () => {
  it('renders each icon once', () => {
    expect(iconSprite({ kind: 'material', id: 'iron' })).toBe(iconSprite({ kind: 'material', id: 'iron' }));
    expect(materialIcon('iron')).toBe(materialIcon('iron'));
    expect(buildingIcon('smelter')).toBe(buildingIcon('smelter'));
    expect(componentIcon('avionics')).toBe(componentIcon('avionics'));
  });

  it('sizes icons as the mockup does', () => {
    expect(iconSprite({ kind: 'material', id: 'iron' })).toMatchObject({ width: 16, height: 16 });
    expect(iconSprite({ kind: 'building', id: 'smelter' })).toMatchObject({ width: 24, height: 20 });
    expect(iconSprite({ kind: 'component', id: 'avionics' })).toMatchObject({ width: 16, height: 16 });
  });
});
