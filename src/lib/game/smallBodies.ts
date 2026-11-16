import { asteroidRecord } from '#lib/game/data/index.ts';
import { smallBody, type SmallBody } from '#lib/gfx/bodies/small/index.ts';
import type { Body } from './types';

const COMET_KIND = 'comet';

export function smallBodyOf(body: Body): SmallBody | undefined {
  const rec = asteroidRecord(body.id);
  if (rec) return smallBody({ id: rec.id, name: rec.name, type: rec.type, diameter: rec.diameter });
  if (body.facts.kind.toLowerCase() === COMET_KIND)
    return smallBody({ id: body.id, name: body.name, type: COMET_KIND, diameter: (body.radius * 2) / 1000 });
  return undefined;
}
