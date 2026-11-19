import { describe, expect, it } from 'vitest';
import { designSpec, newDesign, setCount } from '../../game/shipdesign/index.ts';
import { picturesDrawn, shipPicture } from './picture.ts';

const rocket = (tanks: number) => {
  let d = newDesign('t', 'Test');
  for (const [c, n] of [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', tanks],
    ['structure_truss', 1]
  ] as const)
    d = setCount(d, c, n);
  return designSpec(d);
};

describe('shipPicture', () => {
  it('draws a spec once per size and serves the same object after', () => {
    const spec = rocket(6);
    const before = picturesDrawn();
    const a = shipPicture(spec, 52, 20);
    expect(a).not.toBeNull();
    expect(picturesDrawn()).toBe(before + 1);
    expect(shipPicture(spec, 52, 20)).toBe(a);
    expect(picturesDrawn()).toBe(before + 1);
    shipPicture(spec, 32, 16);
    expect(picturesDrawn()).toBe(before + 2);
  });

  it('draws an edited design, a new object, afresh', () => {
    const a = shipPicture(rocket(6), 52, 20);
    const b = shipPicture(rocket(14), 52, 20);
    expect(b?.url).not.toBe(a?.url);
  });

  it('is a PNG of the requested size', () => {
    const p = shipPicture(rocket(3), 52, 20)!;
    expect([p.width, p.height]).toEqual([52, 20]);
    expect(p.url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('has nothing to show for a design with no parts', () => {
    expect(shipPicture(designSpec(newDesign('e', 'Empty')), 52, 20)).toBeNull();
  });
});
