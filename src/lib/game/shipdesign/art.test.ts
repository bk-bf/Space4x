import { describe, expect, it } from 'vitest';
import { drawShip, shipLengthMetres, type Pixels } from '#lib/gfx/topdown/index.ts';
import { designSpec, scaled } from './art.ts';
import { build, crewedVehicle, upperStage } from './fixtures.ts';
import { designStats } from './stats.ts';

const surface = (w: number, h: number): Pixels => ({ w, h, d: new Uint8ClampedArray(w * h * 4), px() {} });

const painted = (fb: Pixels) => {
  let n = 0;
  for (let i = 0; i < fb.d.length; i += 4) if (fb.d[i] || fb.d[i + 1] || fb.d[i + 2]) n++;
  return n;
};

function checksum(a: ArrayLike<number>): number {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ (a[i]! & 255), 16777619);
  return h >>> 0;
}

const render = (d: ReturnType<typeof build>) => {
  const fb = surface(200, 100);
  drawShip(fb, designSpec(d), { x: 100, y: 50, angle: 0, pxPerMetre: 0.3 });
  return fb;
};

describe('the top-down art from a design', () => {
  it('scales a count into a few sections', () => {
    expect([1, 2, 3, 4, 7, 8, 99].map((n) => scaled(n, 4))).toEqual([1, 2, 2, 3, 3, 4, 4]);
    expect(scaled(99, 2)).toBe(2);
  });

  it('puts the engines at the stern, tanks in the body and the capsule at the bow', () => {
    const spec = designSpec(build(crewedVehicle));
    expect(spec.stern).toEqual(['engines', 1]);
    expect(spec.bow).toBe('bridge');
    expect(spec.parts.map((p) => p[0])).toEqual(['tank', 'tank', 'hull', 'armor']);
    const attached = spec.parts.flatMap((p) => [p[1], p[2]]);
    expect(attached).toContain('solar');
    expect(attached).toContain('radiator');
  });

  it('uses the big stern for a large drive or many engines, and fewer engines for a few', () => {
    expect(designSpec(build([['chemical_engine_methalox', 2]])).stern).toEqual(['engines', 2]);
    expect(designSpec(build([['chemical_engine_methalox', 9]])).stern).toEqual(['big']);
    expect(designSpec(build([['ntr_engine', 1]])).stern).toEqual(['big']);
    expect(designSpec(build([['propellant_tank', 1]])).stern).toBeUndefined();
  });

  it('turns more tanks into a longer ship', () => {
    const small = designSpec(
      build([
        ['kerolox_engine', 1],
        ['propellant_tank', 1]
      ])
    );
    const large = designSpec(
      build([
        ['kerolox_engine', 1],
        ['propellant_tank', 8]
      ])
    );
    expect(shipLengthMetres(large)).toBeGreaterThan(shipLengthMetres(small));
  });

  it('draws different designs differently', () => {
    const sums = [
      build([
        ['kerolox_engine', 1],
        ['propellant_tank', 2]
      ]),
      build(upperStage),
      build(crewedVehicle),
      build([
        ['chemical_engine_methalox', 4],
        ['propellant_tank', 6],
        ['cargo_bay', 2],
        ['radiator', 2]
      ])
    ].map((d) => {
      const fb = render(d);
      expect(painted(fb)).toBeGreaterThan(50);
      return checksum(fb.d);
    });
    expect(new Set(sums).size).toBe(sums.length);
  });

  it('draws the same design the same way and a changed one anew', () => {
    const a = build(upperStage);
    expect(checksum(render(a).d)).toBe(checksum(render(build(upperStage)).d));
    expect(designSpec(a)).not.toBe(designSpec(a));
  });

  it('carries solar arrays and radiators on the body', () => {
    const spec = designSpec(
      build([
        ['kerolox_engine', 1],
        ['propellant_tank', 1],
        ['solar_array', 2],
        ['radiator', 2]
      ])
    );
    const names = spec.parts.flatMap((p) => [p[1], p[2]]).filter(Boolean);
    expect(names).toEqual(expect.arrayContaining(['solar', 'radiator']));
  });

  it('names a design the way the player named it', () => {
    const d = { ...build(upperStage), name: 'Dray' };
    expect(designSpec(d).name).toBe('Dray');
    expect(designStats(d).errors).toBe(0);
  });

  it('draws a design with only engines and with only a hull', () => {
    expect(painted(render(build([['kerolox_engine', 1]])))).toBeGreaterThan(0);
    expect(painted(render(build([['cargo_bay', 1]])))).toBeGreaterThan(0);
  });
});
