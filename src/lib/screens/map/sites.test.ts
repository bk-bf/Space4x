import { describe, expect, it } from 'vitest';
import { AU, bodyPosition, Game, sitePosition } from '#lib/game/index.ts';
import { locate, presetFor, presets } from './targets';

describe('sites', () => {
  const g = new Game();
  const at = (id: string) => sitePosition(g, g.site(id)!)!;
  const dist = (p: readonly number[], q: readonly number[]) => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!);

  it('puts Sol Station in low Earth orbit and the harvester in low Jupiter orbit', () => {
    const earth = g.body('earth')!,
      jupiter = g.body('jupiter')!;
    const low = dist(at('sol-station'), bodyPosition(earth, g.world.bodies));
    expect(low).toBeGreaterThan(earth.radius);
    expect(low).toBeLessThan(earth.radius * 1.4);
    const deep = dist(at('deep-well'), bodyPosition(jupiter, g.world.bodies));
    expect(deep).toBeGreaterThan(jupiter.radius);
    expect(deep).toBeLessThan(jupiter.radius * 1.4);
  });

  it('keeps the battle on contact C-014 as it moves', () => {
    const c = g.contact('C-014')!;
    expect(at('battle')).toEqual([c.x, c.y]);
    g.advance(86_400);
    expect(at('battle')).toEqual([c.x, c.y]);
  });

  it('puts the boarding action near Mars, the salvage in the belt and the gate on Jump point A', () => {
    const mars = g.body('mars')!;
    expect(dist(at('boarding'), bodyPosition(mars, g.world.bodies))).toBeLessThan(mars.radius * 10);
    const belt = g.starSystem('sol')!.belt!,
      r = Math.hypot(...at('salvage'));
    expect(r).toBeGreaterThan(belt.inner);
    expect(r).toBeLessThan(belt.inner + belt.width);
    const gate = g.jump('sol-a')!.point;
    expect(at('gate')).toEqual([gate.x, gate.y]);
  });

  it('offers a jump button for every site of the shown system and aims it at the site', () => {
    const ids = presets(g, 410, 280).map((p) => p.id);
    for (const s of g.world.sites) expect(ids).toContain(s.id);
    const p = presetFor(g, 'battle', 410, 280)!;
    expect(p.aim).toBe('site:battle');
    expect(10 ** p.L).toBeLessThan(10);
    expect(locate('site:gate', g)).toMatchObject({ x: g.jump('sol-a')!.point.x });
    expect(g.systemOf({ kind: 'site', id: 'battle' })).toBe('sol');
  });

  it('places every site inside the system', () => {
    for (const s of g.world.sites) expect(Math.hypot(...at(s.id))).toBeLessThan(10 * AU);
  });
});
