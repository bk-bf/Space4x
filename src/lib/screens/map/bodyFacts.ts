import { asteroidRecord, bodyTypeOf } from '#lib/game/data/index.ts';
import { TYPE_NAMES, YEAR_DAYS, isNearEarth, periodDays } from '#lib/game/asteroids.ts';
import { economy, minedOf, remainingMass } from '#lib/game/economy/index.ts';
import { ships } from '#lib/game/ships/index.ts';
import { isSurveyable, isSurveyed } from '#lib/game/survey.svelte.ts';
import type { Body } from '#lib/game/types.ts';
import { formatMass } from '#lib/screens/economy/format.ts';

export function surveyText(b: Body): string {
  const type = bodyTypeOf(b.id);
  if (!type) return b.surveyed ? 'Done' : 'None';
  if (type === 'earth') return 'Done';
  if (!isSurveyable(b.id)) return 'Atmosphere only';
  if (isSurveyed(b.id)) return 'Done';
  const doing = ships.vessels.some((v) => v.orders[0]?.type === 'survey' && v.orders[0].body === b.id);
  return doing ? 'Under way' : 'Not surveyed';
}

export function asteroidRows(b: Body): [string, string][] {
  const a = asteroidRecord(b.id);
  if (!a) return [];
  const years = periodDays(a) / YEAR_DAYS;
  const rows: [string, string][] = [
    ['Class', `${TYPE_NAMES[a.type]}${a.spectral ? ` (${a.spectral})` : ''}`],
    ['Group', isNearEarth(a) ? 'Near-Earth' : a.id === 'ceres' ? 'Dwarf planet' : 'Main belt'],
    ['Orbit', `${a.a.toFixed(2)} AU, ${years.toFixed(1)} y`],
    ['Mass', `${formatMass(a.mass)}${a.massEstimated ? ' est.' : ''}`]
  ];
  if (minedOf(economy, a.id) > 0)
    rows.push(['Left', `${((remainingMass(economy, a.id) / a.mass) * 100).toFixed(2)}%`]);
  return rows;
}
