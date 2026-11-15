import type { Body } from '../types';

const RATE = 1e-4;

export const mockBodies = (): Body[] => [
  {
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
    id: 'earth',
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
    id: 'mars',
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
  }
];
