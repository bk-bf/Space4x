import type { Body } from '../types';

const RATE = 1e-4;

export const mockBodies = (): Body[] => [
  {
    system: 'sol',
    id: 'mercury',
    name: 'Mercury',
    type: 'rock',
    radius: 4,
    orbit: 34,
    angle: 2.2,
    angularSpeed: 0.004 * RATE,
    tilt: 0.05,
    facts: {
      kind: 'Rocky',
      gravity: '0.38 g',
      surface: '167 °C',
      air: 'None',
      size: '4,879 km',
      people: 'None'
    }
  },
  {
    system: 'sol',
    id: 'venus',
    name: 'Venus',
    type: 'venus',
    radius: 6,
    orbit: 52,
    angle: 1.0,
    angularSpeed: 0.003 * RATE,
    tilt: 0.1,
    facts: {
      kind: 'Rocky',
      gravity: '0.90 g',
      surface: '464 °C',
      air: 'Dense CO2',
      size: '12,104 km',
      people: 'None'
    }
  },
  {
    system: 'sol',
    id: 'earth',
    surveyed: true,
    name: 'Earth',
    type: 'terran',
    radius: 8,
    orbit: 74,
    angle: 4.2,
    angularSpeed: 0.002 * RATE,
    tilt: 0.4,
    facts: {
      kind: 'Rocky',
      gravity: '1.00 g',
      surface: '15 °C',
      air: 'Breathable',
      size: '12,742 km',
      people: '1.2 bn'
    }
  },
  {
    system: 'sol',
    id: 'mars',
    surveyed: true,
    name: 'Mars',
    type: 'mars',
    radius: 5,
    orbit: 100,
    angle: 5.6,
    angularSpeed: 0.0015 * RATE,
    tilt: 0.43,
    facts: {
      kind: 'Rocky',
      gravity: '0.38 g',
      surface: '-63 °C',
      air: 'Thin CO2',
      size: '6,779 km',
      people: '2.4 M'
    }
  },
  {
    system: 'sol',
    id: 'jupiter',
    name: 'Jupiter',
    type: 'gas',
    radius: 16,
    orbit: 162,
    angle: 0.28,
    angularSpeed: 0.0006 * RATE,
    tilt: 0.06,
    facts: {
      kind: 'Gas giant',
      gravity: '2.53 g',
      surface: '-108 °C',
      air: 'Hydrogen',
      size: '139,820 km',
      people: 'None'
    }
  },
  {
    system: 'sol',
    id: 'saturn',
    name: 'Saturn',
    type: 'saturn',
    radius: 12,
    orbit: 196,
    angle: 2.6,
    angularSpeed: 0.0004 * RATE,
    rings: true,
    facts: {
      kind: 'Gas giant',
      gravity: '1.06 g',
      surface: '-139 °C',
      air: 'Hydrogen',
      size: '116,460 km',
      people: 'None'
    }
  },
  {
    system: 'acen',
    id: 'acen-1',
    name: 'Centauri I',
    type: 'rock',
    radius: 4,
    orbit: 30,
    angle: 0.7,
    angularSpeed: 0.0045 * RATE,
    tilt: 0.1,
    facts: {
      kind: 'Rocky',
      gravity: '0.52 g',
      surface: '312 °C',
      air: 'None',
      size: '6,120 km',
      people: 'None'
    }
  },
  {
    system: 'acen',
    id: 'acen-2',
    name: 'Centauri II',
    type: 'mars',
    radius: 6,
    orbit: 58,
    angle: 3.4,
    angularSpeed: 0.0025 * RATE,
    tilt: 0.3,
    surveyed: true,
    facts: {
      kind: 'Rocky',
      gravity: '0.71 g',
      surface: '-12 °C',
      air: 'Thin N2',
      size: '9,840 km',
      people: '18,000'
    }
  },
  {
    system: 'acen',
    id: 'acen-3',
    name: 'Centauri III',
    type: 'gas',
    radius: 14,
    orbit: 104,
    angle: 5.2,
    angularSpeed: 0.0009 * RATE,
    tilt: 0.08,
    facts: {
      kind: 'Gas giant',
      gravity: '1.84 g',
      surface: '-96 °C',
      air: 'Hydrogen',
      size: '121,400 km',
      people: 'None'
    }
  },
  {
    system: 'acen',
    id: 'acen-4',
    name: 'Centauri IV',
    type: 'venus',
    radius: 5,
    orbit: 140,
    angle: 1.9,
    angularSpeed: 0.0005 * RATE,
    tilt: 0.2,
    facts: {
      kind: 'Icy',
      gravity: '0.44 g',
      surface: '-171 °C',
      air: 'Trace CH4',
      size: '7,310 km',
      people: 'None'
    }
  },
  {
    system: 'barn',
    id: 'barn-b',
    name: 'Barnard b',
    type: 'rock',
    radius: 3,
    orbit: 26,
    angle: 1.2,
    angularSpeed: 0.006 * RATE,
    facts: {
      kind: 'Rocky',
      gravity: '0.41 g',
      surface: '127 °C',
      air: 'None',
      size: '4,410 km',
      people: 'None'
    }
  },
  {
    system: 'barn',
    id: 'barn-c',
    name: 'Barnard c',
    type: 'venus',
    radius: 4,
    orbit: 44,
    angle: 4.0,
    angularSpeed: 0.004 * RATE,
    tilt: 0.15,
    facts: {
      kind: 'Rocky',
      gravity: '0.58 g',
      surface: '88 °C',
      air: 'Dense CO2',
      size: '5,950 km',
      people: 'None'
    }
  },
  {
    system: 'barn',
    id: 'barn-d',
    name: 'Barnard d',
    type: 'mars',
    radius: 5,
    orbit: 82,
    angle: 2.5,
    angularSpeed: 0.002 * RATE,
    tilt: 0.35,
    facts: {
      kind: 'Rocky',
      gravity: '0.66 g',
      surface: '-58 °C',
      air: 'Thin CO2',
      size: '8,200 km',
      people: 'None'
    }
  },
  {
    system: 'barn',
    id: 'barn-e',
    name: 'Barnard e',
    type: 'saturn',
    radius: 10,
    orbit: 132,
    angle: 5.6,
    angularSpeed: 0.0006 * RATE,
    rings: true,
    facts: {
      kind: 'Gas giant',
      gravity: '0.93 g',
      surface: '-182 °C',
      air: 'Hydrogen',
      size: '96,200 km',
      people: 'None'
    }
  }
];
