import { milestone } from '#lib/game/data/index.ts';

export const SHORT_NAMES: Readonly<Record<number, string>> = {
  1: 'Orbital launch',
  2: 'Propellant transfer',
  3: 'LEO station',
  4: 'Space solar power',
  5: 'Data centres',
  6: 'Lunar outpost',
  7: 'Fission power',
  8: 'Lunar ice',
  9: 'Regolith oxygen',
  10: 'Regolith building',
  11: 'Moon base',
  12: 'Cislunar fuel',
  13: 'Electric drive',
  14: 'Nuclear thermal',
  15: 'Asteroid survey',
  16: 'Volatile mining',
  17: 'Metal mining',
  18: 'Orbital shipyard',
  19: 'Space chips',
  20: 'Power stations',
  21: 'Mars ISRU',
  22: 'D-T fusion',
  23: 'Helium-3',
  24: 'Fusion drive',
  25: 'Gas giant mining',
  26: 'Megastructures',
  27: 'Superconductors',
  28: 'Exotic matter',
  29: 'Jump point'
};

export const shortName = (number: number): string => SHORT_NAMES[number] ?? milestone(number).name;

export const TIER_NAMES = { P: 'Proven', E: 'Engineering-plausible', S: 'Speculative' } as const;
