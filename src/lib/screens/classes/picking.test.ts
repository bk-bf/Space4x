import { describe, expect, it } from 'vitest';
import { asClass } from '#lib/game/design.ts';
import { SPECS } from '#lib/gfx/ships/specs.ts';
import { METRES_PER_UNIT } from '#lib/gfx/topdown/index.ts';
import { colX, frameOf, partAt, viewOf } from './geometry.ts';

const W = 560;
const H = 300;
const SCALE = 2;

const probe = asClass({
  id: 'probe',
  name: 'Probe',
  role: 'Test',
  stern: ['engines', 2],
  bow: 'bridge',
  parts: [['hull', 'radiator'], ['reactor', 'turret', 'dish'], ['crew']]
});

function rotate(x: number, y: number, angle: number, frame: ReturnType<typeof frameOf>) {
  const v = viewOf(frame, angle);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [v.x + (c * x - s * y) * frame.S, v.y + (s * x + c * y) * frame.S] as const;
}

describe('picking a part on the top-down design', () => {
  const frame = frameOf(probe, W, H, SCALE);
  const centre = (index: number) => {
    const p = frame.parts[index]!;
    return colX(frame, p.x + p.w / 2);
  };

  it('fits the ship and its labels into the frame', () => {
    expect(frame.S).toBeGreaterThan(1.5);
    expect(colX(frame, 0)).toBeGreaterThan(0);
    expect(colX(frame, frame.len)).toBeLessThan(W);
    expect(frame.lineY).toBeLessThan(H - 96 / SCALE);
  });

  it('picks the stern, the bow and a section with the slot on the side of the hull that was hit', () => {
    expect(partAt(probe, frame, 0, centre(0), frame.cy)?.selection).toEqual({ kind: 'stern' });
    expect(partAt(probe, frame, 0, centre(4), frame.cy)?.selection).toEqual({ kind: 'bow' });
    expect(partAt(probe, frame, 0, centre(3), frame.cy - 2)?.selection).toEqual({
      kind: 'section',
      index: 2,
      slot: 'top'
    });
    expect(partAt(probe, frame, 0, centre(3), frame.cy + 2)?.selection).toEqual({
      kind: 'section',
      index: 2,
      slot: 'bottom'
    });
  });

  it('picks a hardpoint by its own slot, including the mirrored copy of a lone top hardpoint', () => {
    const radiatorReach = (5 + 4) * frame.S;
    const above = partAt(probe, frame, 0, centre(1), frame.cy - radiatorReach);
    const below = partAt(probe, frame, 0, centre(1), frame.cy + radiatorReach);
    expect(above?.component.name).toBe('Radiator');
    expect(below?.component.name).toBe('Radiator');
    expect(above?.selection).toEqual({ kind: 'section', index: 0, slot: 'top' });
    expect(below?.selection).toEqual({ kind: 'section', index: 0, slot: 'top' });
  });

  it('picks a turret above the hull it stands on and a dish on the other side', () => {
    const turret = partAt(probe, frame, 0, centre(2), frame.cy - 2.6 * frame.S);
    const dish = partAt(probe, frame, 0, centre(2), frame.cy + 2.6 * frame.S);
    expect(turret?.component.name).toBe('Twin beam turret');
    expect(turret?.selection).toEqual({ kind: 'section', index: 1, slot: 'top' });
    expect(dish?.component.name).toBe('Active sensor');
    expect(dish?.selection).toEqual({ kind: 'section', index: 1, slot: 'bottom' });
  });

  it('follows the ship when it turns', () => {
    const p = frame.parts[3]!;
    const along = p.x + p.w / 2 - frame.len / 2;
    for (const angle of [0.6, Math.PI / 2, 2.4]) {
      const [x, y] = rotate(along, 0, angle, frame);
      expect(partAt(probe, frame, angle, x, y)?.selection, `angle ${angle}`).toMatchObject({
        kind: 'section',
        index: 2
      });
    }
  });

  it('finds nothing off the hull', () => {
    expect(partAt(probe, frame, 0, 2, 2)).toBeNull();
    expect(partAt(probe, frame, 0, centre(3), frame.cy + 30 * frame.S)).toBeNull();
  });

  it('frames every shipped class inside the stage at the same scale its sprite is drawn', () => {
    for (const sp of SPECS) {
      const f = frameOf(sp, W, H, SCALE);
      expect(f.len * METRES_PER_UNIT, sp.id).toBeGreaterThan(0);
      expect(colX(f, f.len), sp.id).toBeLessThanOrEqual(W);
    }
  });
});
