import { comets, type CometRecord } from '#lib/game/data/index.ts';
import { hash } from '#lib/gfx/math.ts';
import { periodDays, smallBodyFacts, smallBodyRadius, stringHash } from './asteroids';
import type { Body } from './types';
import { AU, orbitRate } from './units';

export function cometBody(c: CometRecord): Body {
  const seed = stringHash(c.id);
  return {
    system: 'sol',
    id: c.id,
    name: c.name,
    type: 'rock',
    radius: smallBodyRadius(c),
    orbit: c.a * AU,
    angle: hash(seed, 3, 11) * Math.PI * 2,
    angularSpeed: orbitRate(periodDays(c)),
    tilt: hash(seed, 4, 11) * 0.4,
    rotation: c.rotation,
    facts: smallBodyFacts('Comet', c, c.a)
  };
}

export const cometBodies = (): Body[] => comets.map(cometBody);
