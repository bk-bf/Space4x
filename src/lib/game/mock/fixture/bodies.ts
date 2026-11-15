import type { Body } from '../../types';
import { au, orbitRate } from '../../units';

export const fixtureBodies = (): Body[] => [
  {
    system: 'acen',
    id: 'acen-1',
    name: 'Centauri I',
    type: 'rock',
    radius: 3.06e6,
    orbit: au(0.41),
    angle: 0.7,
    angularSpeed: orbitRate(95),
    tilt: 0.1,
    facts: {
      kind: 'Rocky',
      gravity: '0.52 g',
      surface: '312 °C',
      air: 'None',
      size: '6,120 km'
    }
  },
  {
    system: 'acen',
    id: 'acen-2',
    colony: true,
    name: 'Centauri II',
    type: 'mars',
    radius: 4.92e6,
    orbit: au(0.78),
    angle: 3.4,
    angularSpeed: orbitRate(250),
    tilt: 0.3,
    surveyed: true,
    facts: {
      kind: 'Rocky',
      gravity: '0.71 g',
      surface: '-12 °C',
      air: 'Thin N2',
      size: '9,840 km'
    }
  },
  {
    system: 'acen',
    id: 'acen-3',
    name: 'Centauri III',
    type: 'gas',
    radius: 6.07e7,
    orbit: au(1.41),
    angle: 5.2,
    angularSpeed: orbitRate(610),
    tilt: 0.08,
    facts: {
      kind: 'Gas giant',
      gravity: '1.84 g',
      surface: '-96 °C',
      air: 'Hydrogen',
      size: '121,400 km'
    }
  },
  {
    system: 'acen',
    id: 'acen-4',
    name: 'Centauri IV',
    type: 'venus',
    radius: 3.655e6,
    orbit: au(1.89),
    angle: 1.9,
    angularSpeed: orbitRate(950),
    tilt: 0.2,
    facts: {
      kind: 'Icy',
      gravity: '0.44 g',
      surface: '-171 °C',
      air: 'Trace CH4',
      size: '7,310 km'
    }
  },
  {
    system: 'barn',
    id: 'barn-b',
    name: 'Barnard b',
    type: 'rock',
    radius: 2.205e6,
    orbit: au(0.35),
    angle: 1.2,
    angularSpeed: orbitRate(233),
    facts: {
      kind: 'Rocky',
      gravity: '0.41 g',
      surface: '127 °C',
      air: 'None',
      size: '4,410 km'
    }
  },
  {
    system: 'barn',
    id: 'barn-c',
    name: 'Barnard c',
    type: 'venus',
    radius: 2.975e6,
    orbit: au(0.59),
    angle: 4.0,
    angularSpeed: orbitRate(510),
    tilt: 0.15,
    facts: {
      kind: 'Rocky',
      gravity: '0.58 g',
      surface: '88 °C',
      air: 'Dense CO2',
      size: '5,950 km'
    }
  },
  {
    system: 'barn',
    id: 'barn-d',
    name: 'Barnard d',
    type: 'mars',
    radius: 4.1e6,
    orbit: au(1.11),
    angle: 2.5,
    angularSpeed: orbitRate(1320),
    tilt: 0.35,
    facts: {
      kind: 'Rocky',
      gravity: '0.66 g',
      surface: '-58 °C',
      air: 'Thin CO2',
      size: '8,200 km'
    }
  },
  {
    system: 'barn',
    id: 'barn-e',
    name: 'Barnard e',
    type: 'saturn',
    radius: 4.81e7,
    orbit: au(1.78),
    angle: 5.6,
    angularSpeed: orbitRate(2680),
    rings: true,
    facts: {
      kind: 'Gas giant',
      gravity: '0.93 g',
      surface: '-182 °C',
      air: 'Hydrogen',
      size: '96,200 km'
    }
  }
];
