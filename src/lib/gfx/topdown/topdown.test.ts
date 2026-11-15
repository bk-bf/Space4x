import { describe, expect, it } from 'vitest';
import { ALIEN_SPECS, SPECS, type ShipSpec } from '../ships/specs';
import {
  LODS,
  METRES_PER_UNIT,
  ShipDamage,
  detailLevel,
  drawCraft,
  drawProp,
  drawShip,
  drawShipIcon,
  drawStation,
  pickShip,
  shipLengthMetres,
  shipMounts,
  silhouette,
  spritesBuilt,
  type Pixels
} from './index';
import { shipSprite } from './sprites';

const surface = (w: number, h: number): Pixels => ({ w, h, d: new Uint8ClampedArray(w * h * 4), px() {} });

function checksum(a: ArrayLike<number>): number {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ (a[i]! & 255), 16777619);
  return h >>> 0;
}

const bastion = SPECS.find((s) => s.id === 'bastion')!;
const copy = (sp: ShipSpec): ShipSpec => JSON.parse(JSON.stringify(sp));

const painted = (fb: Pixels) => {
  let n = 0;
  for (let i = 0; i < fb.d.length; i += 4) if (fb.d[i] || fb.d[i + 1] || fb.d[i + 2]) n++;
  return n;
};

describe('the top-down sprite builder', () => {
  it('builds the same maps every time for the same design', () => {
    for (const S of [0.75, 3, 6]) {
      const a = shipSprite(bastion, S),
        b = shipSprite(copy(bastion), S);
      expect(a).not.toBe(b);
      for (const f of ['z', 'm', 'c', 'e', 't', 'nx', 'ny', 'nz'] as const)
        expect(checksum(new Uint8Array(b[f].buffer)), `${f}@${S}`).toBe(
          checksum(new Uint8Array(a[f].buffer))
        );
    }
  });

  it('draws the same pixels every time for the same view', () => {
    const view = { x: 120, y: 70, angle: 0.4, pxPerMetre: 0.9, frame: 12, thrust: 0.6 };
    const a = surface(240, 140),
      b = surface(240, 140);
    drawShip(a, bastion, view);
    drawShip(b, copy(bastion), view);
    expect(checksum(b.d)).toBe(checksum(a.d));
    expect(painted(a)).toBeGreaterThan(2000);
  });

  it('builds a sprite once per class and detail level and again when the design changes', () => {
    const sp = copy(bastion);
    const fb = surface(320, 200);
    drawShip(fb, sp, { x: 160, y: 100, angle: 0, pxPerMetre: 0.6 });
    const before = spritesBuilt();
    for (let i = 0; i < 20; i++)
      drawShip(fb, sp, { x: 160, y: 100, angle: i * 0.3, pxPerMetre: 0.6, frame: i });
    expect(spritesBuilt()).toBe(before);
    expect(shipSprite(sp, 3)).toBe(shipSprite(sp, 3));
    drawShip(fb, { ...sp, parts: sp.parts.slice(1) }, { x: 160, y: 100, angle: 0, pxPerMetre: 0.6 });
    expect(spritesBuilt()).toBe(before + 1);
  });

  it('chooses the detail level at or above the scale and scales down from it', () => {
    expect(LODS).toEqual([0.375, 0.75, 1.5, 3, 6, 12]);
    expect(detailLevel(0.01)).toBe(0.375);
    expect(detailLevel(0.375 / METRES_PER_UNIT)).toBe(0.375);
    expect(detailLevel(0.376 / METRES_PER_UNIT)).toBe(0.75);
    expect(detailLevel(1.5 / METRES_PER_UNIT)).toBe(1.5);
    expect(detailLevel(2 / METRES_PER_UNIT)).toBe(3);
    expect(detailLevel(11 / METRES_PER_UNIT)).toBe(12);
    expect(detailLevel(40 / METRES_PER_UNIT)).toBe(12);
    const drawn = drawShip(surface(400, 300), bastion, {
      x: 200,
      y: 150,
      angle: 0,
      pxPerMetre: 2 / METRES_PER_UNIT
    });
    expect(drawn.lod).toBe(3);
    expect(drawn.scale).toBeCloseTo(2 / 3);
  });

  it('draws a ship at true scale for its length in metres', () => {
    const len = shipLengthMetres(bastion);
    expect(len).toBe(65 * METRES_PER_UNIT);
    for (const pxPerMetre of [0.1, 0.4, 1.2]) {
      const fb = surface(800, 400);
      drawShip(fb, bastion, { x: 400, y: 200, angle: 0, pxPerMetre });
      let x0 = fb.w,
        x1 = -1;
      for (let i = 0; i < fb.d.length; i += 4)
        if (fb.d[i] || fb.d[i + 1] || fb.d[i + 2]) {
          const x = (i / 4) % fb.w;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
      expect(Math.abs(x1 - x0 + 1 - len * pxPerMetre), `${pxPerMetre}`).toBeLessThan(4);
    }
  });

  it('keeps the shipped classes looking different from each other', () => {
    const looks = [...SPECS, ...Object.values(ALIEN_SPECS)].map((sp) => {
      const s = shipSprite(sp, 3);
      const mats = new Array<number>(24).fill(0);
      for (const m of s.m) mats[m]!++;
      return { id: sp.id, w: s.w, h: s.h, mats };
    });
    for (let i = 0; i < looks.length; i++)
      for (let j = i + 1; j < looks.length; j++) {
        const a = looks[i]!,
          b = looks[j]!;
        const diff = a.mats.reduce((n, v, k) => n + Math.abs(v - b.mats[k]!), 0);
        const area = a.mats.reduce((n, v, k) => n + (k ? v + b.mats[k]! : 0), 0);
        expect(diff / area, `${a.id} and ${b.id}`).toBeGreaterThan(0.2);
      }
  });

  it('places mounts in metres around the ship centre and aims turrets on their own', () => {
    const mounts = shipMounts(bastion);
    expect(mounts).toHaveLength(4);
    for (const m of mounts) expect(Math.abs(m.x)).toBeLessThan(shipLengthMetres(bastion) / 2);
    const a = surface(400, 260),
      b = surface(400, 260);
    const view = { x: 200, y: 130, angle: 0, pxPerMetre: 1 };
    drawShip(a, bastion, view);
    drawShip(b, bastion, { ...view, aim: mounts.map(() => Math.PI) });
    expect(checksum(a.d)).not.toBe(checksum(b.d));
  });

  it('shows damage where it landed and only there', () => {
    const view = { x: 200, y: 130, angle: 0, pxPerMetre: 1 };
    const clean = surface(400, 260),
      hit = surface(400, 260),
      damage = new ShipDamage();
    damage.hit(60, 0, 15, 240);
    drawShip(clean, bastion, view);
    drawShip(hit, bastion, { ...view, damage });
    let changed = 0,
      far = 0;
    for (let i = 0; i < clean.d.length; i += 4)
      if (clean.d[i] !== hit.d[i] || clean.d[i + 1] !== hit.d[i + 1]) {
        changed++;
        if (Math.abs(((i / 4) % 400) - 260) > 20) far++;
      }
    expect(changed).toBeGreaterThan(200);
    expect(far).toBe(0);
  });

  it('picks the component under a screen point', () => {
    const view = { x: 200, y: 130, angle: 0, pxPerMetre: 1 };
    const sternEnd = 200 - shipLengthMetres(bastion) / 2;
    expect(pickShip(bastion, view, sternEnd + 20, 130)?.component.kind).toBe('prop');
    expect(pickShip(bastion, view, 200 + shipLengthMetres(bastion) / 2 - 15, 130)?.component.name).toBe(
      'Armoured prow'
    );
    expect(pickShip(bastion, view, 5, 5)).toBeNull();
  });

  it('colours the hull by system and swaps captured components to another livery', () => {
    const view = { x: 200, y: 130, angle: 0, pxPerMetre: 1 };
    const plain = surface(400, 260),
      systems = surface(400, 260),
      swapped = surface(400, 260);
    drawShip(plain, bastion, view);
    drawShip(systems, bastion, { ...view, systems: true });
    drawShip(swapped, bastion, {
      ...view,
      livery: 'foe',
      swap: { owner: new Array(64).fill(2), livery: 'navy' }
    });
    expect(checksum(systems.d)).not.toBe(checksum(plain.d));
    expect(checksum(swapped.d)).toBe(checksum(plain.d));
  });

  it('cuts a wreck in two along the hull', () => {
    const view = { x: 200, y: 130, angle: 0, pxPerMetre: 1 };
    const fore = surface(400, 260),
      aft = surface(400, 260);
    drawShip(fore, bastion, { ...view, cut: { at: 20, keep: -1 } });
    drawShip(aft, bastion, { ...view, cut: { at: 20, keep: 1 } });
    const span = (fb: Pixels) => {
      let x0 = fb.w,
        x1 = 0;
      for (let i = 0; i < fb.d.length; i += 4)
        if (fb.d[i] || fb.d[i + 1] || fb.d[i + 2]) {
          x0 = Math.min(x0, (i / 4) % fb.w);
          x1 = Math.max(x1, (i / 4) % fb.w);
        }
      return [x0, x1];
    };
    expect(span(aft)[1]).toBeLessThan(235);
    expect(span(fore)[0]).toBeGreaterThan(205);
  });

  it('draws an icon at a fixed size whatever the class length', () => {
    for (const sp of [bastion, SPECS.find((s) => s.id === 'pathfinder')!]) {
      const fb = surface(64, 64);
      drawShipIcon(fb, sp, 32, 32, 0, 24);
      let x0 = 64,
        x1 = 0;
      for (let i = 0; i < fb.d.length; i += 4)
        if (fb.d[i] || fb.d[i + 1] || fb.d[i + 2]) {
          x0 = Math.min(x0, (i / 4) % 64);
          x1 = Math.max(x1, (i / 4) % 64);
        }
      expect(x1 - x0 + 1, sp.id).toBeLessThanOrEqual(26);
      expect(x1 - x0 + 1, sp.id).toBeGreaterThanOrEqual(14);
    }
  });

  it('draws unknown classes as a red silhouette', () => {
    const fb = surface(120, 60);
    silhouette(fb, ALIEN_SPECS.x1!, { x: 60, y: 30, angle: 0, pxPerMetre: 0.3 });
    let red = 0;
    for (let i = 0; i < fb.d.length; i += 4) if (fb.d[i]! > 150 && fb.d[i + 1]! < 130) red++;
    expect(red).toBeGreaterThan(50);
  });

  it('draws stations, props and craft', () => {
    for (const draw of [
      (fb: Pixels) => drawStation(fb, 'core', { x: 100, y: 100, angle: 0, pxPerMetre: 0.3 }),
      (fb: Pixels) => drawStation(fb, 'ring', { x: 100, y: 100, angle: 0.3, pxPerMetre: 0.3 }),
      (fb: Pixels) => drawProp(fb, 'pylon', { x: 100, y: 100, angle: 0, pxPerMetre: 0.6 }),
      (fb: Pixels) => drawProp(fb, 'dropship', { x: 100, y: 100, angle: 1, pxPerMetre: 0.6 }),
      (fb: Pixels) => drawCraft(fb, 'fighter', { x: 100, y: 100, angle: 0, pxPerMetre: 3, thrust: 1 })
    ]) {
      const fb = surface(200, 200);
      draw(fb);
      expect(painted(fb)).toBeGreaterThan(40);
    }
  });
});

describe('drawing many ships', () => {
  it('draws 50 ships at mixed map scales into a 720x450 framebuffer', () => {
    const fb = surface(720, 450);
    const classes = [...SPECS, ...Object.values(ALIEN_SPECS)];
    const ships = Array.from({ length: 50 }, (_, i) => ({
      cls: classes[i % classes.length]!,
      x: ((i * 137) % 700) + 10,
      y: ((i * 89) % 430) + 10,
      angle: i * 0.37,
      pxPerMetre: [0.02, 0.05, 0.1, 0.2, 0.4][i % 5]!,
      thrust: (i % 3) / 2
    }));
    const frame = (n: number) => {
      fb.d.fill(0);
      for (const s of ships) drawShip(fb, s.cls, { ...s, frame: n });
    };
    const warm = performance.now();
    frame(0);
    const firstMs = performance.now() - warm;
    const times: number[] = [];
    for (let n = 1; n <= 40; n++) {
      const t0 = performance.now();
      frame(n);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[20]!,
      p90 = times[36]!;
    console.log(
      `50 ships, 720x450: first frame (builds sprites) ${firstMs.toFixed(1)} ms, median ${median.toFixed(2)} ms, p90 ${p90.toFixed(2)} ms`
    );
    expect(median).toBeLessThan(40);
  });
});
