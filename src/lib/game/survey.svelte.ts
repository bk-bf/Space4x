import { isAsteroid, regionsOf, regions, type Region } from '#lib/game/data/index.ts';

export const SURVEY_ERROR = 0.3;
export const SURVEY_DAYS_SMALL_BODY = 14;
export const SURVEY_DAYS_PLANET = 60;
export const JUMP_SURVEY_DAYS = 30;

function startLevels(): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const world of new Set(regions.filter((r) => r.kind === 'ground').map((r) => r.world)))
    if (regionsOf(world).every((r) => r.known)) levels[world] = 1;
  return levels;
}

export const survey: { levels: Record<string, number> } = $state({ levels: startLevels() });

export const surveyLevel = (world: string): number => survey.levels[world] ?? 0;

export const isSurveyable = (world: string): boolean => regionsOf(world).length > 0;

export const isSurveyed = (world: string): boolean => surveyLevel(world) >= 1;

export const regionKnown = (r: Region): boolean => r.kind === 'atmosphere' || isSurveyed(r.world);

export const knownRegions = (world: string): Region[] => regionsOf(world).filter(regionKnown);

export const surveyDays = (world: string): number =>
  isAsteroid(world) ? SURVEY_DAYS_SMALL_BODY : SURVEY_DAYS_PLANET;

export function completeSurvey(world: string, level = 1): void {
  if (isSurveyable(world) && surveyLevel(world) < level) survey.levels[world] = level;
}

export function resetSurvey(): void {
  survey.levels = startLevels();
}

export interface GradeView {
  mid: number;
  low: number;
  high: number;
}

const stringHash = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 33) ^ s.charCodeAt(i);
  return h >>> 0;
};

export function gradeView(r: Region, material: string): GradeView | undefined {
  const deposit = r.deposits.find((d) => d.material === material);
  if (!deposit) return undefined;
  const unit = (stringHash(`${r.id}:${material}`) % 1000) / 1000;
  const mid = deposit.grade * (1 + (unit * 2 - 1) * SURVEY_ERROR);
  return { mid, low: mid / (1 + SURVEY_ERROR), high: mid / (1 - SURVEY_ERROR) };
}

const decimals = (v: number): number => (v < 0.095 ? 2 : 1);

export function gradeText(v: GradeView): string {
  return `${v.low.toFixed(decimals(v.low))} to ${v.high.toFixed(decimals(v.low))}`;
}
