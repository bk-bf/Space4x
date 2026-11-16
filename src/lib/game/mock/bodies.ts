import type { Body } from '../types';
import { au, orbitRate } from '../units';

export const mockBodies = (): Body[] => [
  {
    system: 'sol',
    id: 'mercury',
    name: 'Mercury',
    type: 'rock',
    radius: 2.4397e6,
    orbit: au(0.387),
    angle: 2.2,
    angularSpeed: orbitRate(87.97),
    tilt: 0.05,
    facts: {
      kind: 'Rocky',
      gravity: '0.38 g',
      surface: '167 °C',
      air: 'None',
      size: '4,879 km'
    }
  },
  {
    system: 'sol',
    id: 'venus',
    name: 'Venus',
    type: 'venus',
    radius: 6.0518e6,
    orbit: au(0.723),
    angle: 1.0,
    angularSpeed: orbitRate(224.7),
    tilt: 0.1,
    facts: {
      kind: 'Rocky',
      gravity: '0.90 g',
      surface: '464 °C',
      air: 'Dense CO2',
      size: '12,104 km'
    }
  },
  {
    system: 'sol',
    id: 'earth',
    colony: true,
    name: 'Earth',
    type: 'terran',
    radius: 6.371e6,
    orbit: au(1),
    angle: 4.2,
    angularSpeed: orbitRate(365.26),
    tilt: 0.4,
    facts: {
      kind: 'Rocky',
      gravity: '1.00 g',
      surface: '15 °C',
      air: 'Breathable',
      size: '12,742 km'
    }
  },
  {
    system: 'sol',
    id: 'mars',
    name: 'Mars',
    type: 'mars',
    radius: 3.3895e6,
    orbit: au(1.524),
    angle: 5.6,
    angularSpeed: orbitRate(686.98),
    tilt: 0.43,
    facts: {
      kind: 'Rocky',
      gravity: '0.38 g',
      surface: '-63 °C',
      air: 'Thin CO2',
      size: '6,779 km'
    }
  },
  {
    system: 'sol',
    id: 'jupiter',
    name: 'Jupiter',
    type: 'gas',
    radius: 6.9911e7,
    orbit: au(5.203),
    angle: 0.28,
    angularSpeed: orbitRate(4332.6),
    tilt: 0.06,
    facts: {
      kind: 'Gas giant',
      gravity: '2.53 g',
      surface: '-108 °C',
      air: 'Hydrogen',
      size: '139,820 km'
    }
  },
  {
    system: 'sol',
    id: 'saturn',
    name: 'Saturn',
    type: 'saturn',
    radius: 5.8232e7,
    orbit: au(9.537),
    angle: 2.6,
    angularSpeed: orbitRate(10759),
    rings: true,
    facts: {
      kind: 'Gas giant',
      gravity: '1.06 g',
      surface: '-139 °C',
      air: 'Hydrogen',
      size: '116,460 km'
    }
  },
  {
    system: 'sol',
    id: 'uranus',
    name: 'Uranus',
    type: 'ice',
    radius: 2.5362e7,
    orbit: au(19.19),
    angle: 3.9,
    angularSpeed: orbitRate(30687),
    tilt: 0.1,
    facts: {
      kind: 'Ice giant',
      gravity: '0.90 g',
      surface: '-197 °C',
      air: 'Hydrogen',
      size: '50,724 km'
    }
  },
  {
    system: 'sol',
    id: 'neptune',
    name: 'Neptune',
    type: 'ice2',
    radius: 2.4622e7,
    orbit: au(30.07),
    angle: 5.1,
    angularSpeed: orbitRate(60190),
    tilt: 0.05,
    facts: {
      kind: 'Ice giant',
      gravity: '1.14 g',
      surface: '-201 °C',
      air: 'Hydrogen',
      size: '49,244 km'
    }
  },
  {
    system: 'sol',
    id: 'luna',
    parent: 'earth',
    name: 'Luna',
    type: 'rock',
    radius: 1.7374e6,
    orbit: 3.844e8,
    angle: 1,
    angularSpeed: orbitRate(27.32),
    facts: {
      kind: 'Moon',
      gravity: '0.16 g',
      surface: '-23 °C',
      air: 'None',
      size: '3,474 km'
    }
  },
  {
    system: 'sol',
    id: 'europa',
    parent: 'jupiter',
    name: 'Europa',
    type: 'rock',
    radius: 1.5608e6,
    orbit: 6.709e8,
    angle: 2.2,
    angularSpeed: orbitRate(3.551),
    facts: {
      kind: 'Icy moon',
      gravity: '0.13 g',
      surface: '-160 °C',
      air: 'None',
      size: '3,122 km'
    }
  },
  {
    system: 'sol',
    id: 'io',
    parent: 'jupiter',
    name: 'Io',
    type: 'rock',
    radius: 1821600.0,
    orbit: 421700000.0,
    angle: 0.5,
    angularSpeed: orbitRate(1.769),
    facts: {
      kind: 'Moon',
      gravity: '0.18 g',
      surface: '-143 °C',
      air: 'Sulfur dioxide, traces',
      size: '3,643 km'
    }
  },
  {
    system: 'sol',
    id: 'ganymede',
    parent: 'jupiter',
    name: 'Ganymede',
    type: 'rock',
    radius: 2634100.0,
    orbit: 1070400000.0,
    angle: 4.1,
    angularSpeed: orbitRate(7.155),
    facts: {
      kind: 'Icy moon',
      gravity: '0.15 g',
      surface: '-163 °C',
      air: 'None',
      size: '5,268 km'
    }
  },
  {
    system: 'sol',
    id: 'callisto',
    parent: 'jupiter',
    name: 'Callisto',
    type: 'rock',
    radius: 2410300.0,
    orbit: 1882700000.0,
    angle: 5.6,
    angularSpeed: orbitRate(16.689),
    facts: {
      kind: 'Icy moon',
      gravity: '0.13 g',
      surface: '-139 °C',
      air: 'Carbon dioxide, traces',
      size: '4,821 km'
    }
  },
  {
    system: 'sol',
    id: 'titan',
    parent: 'saturn',
    name: 'Titan',
    type: 'venus',
    radius: 2574700.0,
    orbit: 1221870000.0,
    angle: 2.9,
    angularSpeed: orbitRate(15.945),
    facts: {
      kind: 'Moon',
      gravity: '0.14 g',
      surface: '-179 °C',
      air: 'Dense nitrogen',
      size: '5,149 km'
    }
  },
  {
    system: 'sol',
    id: 'enceladus',
    parent: 'saturn',
    name: 'Enceladus',
    type: 'rock',
    radius: 252000.0,
    orbit: 238020000.0,
    angle: 0.3,
    angularSpeed: orbitRate(1.37),
    facts: {
      kind: 'Icy moon',
      gravity: '0.01 g',
      surface: '-198 °C',
      air: 'Water vapour plumes',
      size: '504 km'
    }
  }
];
