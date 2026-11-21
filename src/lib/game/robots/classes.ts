import { digClasses, type DigClass } from '#lib/game/data/index.ts';

export const DIG_CLASSES: readonly DigClass[] = ['loose', 'hard', 'ice', 'looseIce'];

export const DIG_CLASS_NAMES: Readonly<Record<DigClass, string>> = {
  loose: 'Loose',
  hard: 'Hard',
  ice: 'Ice',
  looseIce: 'Loose ice'
};

export const classesOf = (materialId: string): DigClass[] =>
  DIG_CLASSES.filter((k) => digClasses[k].includes(materialId));

export const isDiggable = (materialId: string): boolean => classesOf(materialId).length > 0;
