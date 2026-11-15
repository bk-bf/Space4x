import { hash } from '#lib/gfx/math.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import { METRES_PER_UNIT, ShipDamage, nearestHull, shipLengthMetres } from '#lib/gfx/topdown/index.ts';
import type { PartHit } from './geometry.ts';

export const TURN_PER_TICK = 0.022;

export class Inspector {
  turning = $state(false);
  systems = $state(false);
  hover = $state.raw<PartHit | null>(null);
  damage = $state.raw(new ShipDamage());
  hits = $state(0);
  private turnedFrom = 0;

  angleAt(t: number): number {
    return this.turning ? (t - this.turnedFrom) * TURN_PER_TICK : 0;
  }

  toggleTurn(t: number): void {
    this.turning = !this.turning;
    this.turnedFrom = t;
    this.hover = null;
  }

  toggleSystems(): void {
    this.systems = !this.systems;
  }

  takeHit(cls: ShipSpec): void {
    const n = this.hits,
      r = (q: number) => hash(n, q, 41),
      len = shipLengthMetres(cls),
      big = r(3) < 0.3;
    const [x, y] = nearestHull(cls, (r(1) - 0.5) * 0.84 * len, (r(2) - 0.5) * 12 * METRES_PER_UNIT);
    this.damage.hit(x, y, (big ? 3 + r(4) * 1.5 : 1.2 + r(4) * 1.2) * METRES_PER_UNIT, 170 + r(5) * 85);
    this.hits = n + 1;
  }

  repair(): void {
    this.damage = new ShipDamage();
    this.hits = 0;
  }
}

export const inspector = new Inspector();
