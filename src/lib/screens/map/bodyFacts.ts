import { asteroidRecord, bodyTypeOf, cometRecord, moonRecord } from '#lib/game/data/index.ts';
import { TYPE_NAMES, YEAR_DAYS, groupOf, periodDays } from '#lib/game/asteroids.ts';
import { KM, formatDistance } from '#lib/game/units.ts';
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
  return doing ? 'Under way' : 'None';
}

const BASIS_NOTES = { albedo: ', by albedo', assumed: ', assumed' } as const;

export function asteroidRows(b: Body): [string, string][] {
  const a = asteroidRecord(b.id);
  if (a) {
    const years = periodDays(a) / YEAR_DAYS;
    const rows: [string, string][] = [
      [
        'Class',
        `${TYPE_NAMES[a.type]}${a.spectral ? ` (${a.spectral})` : ''}${a.typeBasis ? BASIS_NOTES[a.typeBasis] : ''}`
      ],
      ['Group', a.dwarf ? 'Dwarf planet' : groupOf(a)],
      ['Orbit', `${a.a < 100 ? a.a.toFixed(2) : Math.round(a.a)} AU, ${formatYears(years)}`],
      ['Mass', `${formatMass(a.mass)}${a.massEstimated ? ' est.' : ''}`]
    ];
    if (minedOf(economy, a.id) > 0)
      rows.push(['Left', `${((remainingMass(economy, a.id) / a.mass) * 100).toFixed(2)}%`]);
    return rows;
  }
  const m = moonRecord(b.id);
  if (m)
    return [
      ['Class', `${m.irregular ? 'Irregular' : 'Regular'}, ${TYPE_NAMES[m.type].toLowerCase()}`],
      ['Orbit', `${formatDistance(m.aKm * KM)}, ${formatYears(m.period / YEAR_DAYS)}`],
      ['Mass', `${formatMass(m.mass)}${m.massEstimated ? ' est.' : ''}`]
    ];
  const c = cometRecord(b.id);
  if (c) {
    const rows: [string, string][] = [
      ['Class', 'Comet nucleus'],
      [
        'Orbit',
        `${c.a < 100 ? c.a.toFixed(2) : Math.round(c.a)} AU, ${formatYears(periodDays(c) / YEAR_DAYS)}`
      ],
      ['Mass', `${formatMass(c.mass)} est.`]
    ];
    if (minedOf(economy, c.id) > 0)
      rows.push(['Left', `${((remainingMass(economy, c.id) / c.mass) * 100).toFixed(2)}%`]);
    return rows;
  }
  return [];
}

const formatYears = (y: number): string =>
  y < 0.1 ? `${(y * YEAR_DAYS).toFixed(1)} d` : `${y.toFixed(y < 100 ? 1 : 0)} y`;
