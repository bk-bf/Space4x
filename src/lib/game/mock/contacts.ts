import type { Contact } from '../types';

const at = (day: number, hour: number, minute: number) => Date.UTC(2087, 2, day, hour, minute);

export const mockContacts = (): Contact[] => [
  {
    id: 'C-014',
    system: 'sol',
    kind: 'Unknown',
    signal: 'Thermal 240',
    range: '3.1 AU',
    seen: '04:12',
    x: -24,
    y: 116,
    hostile: true,
    alienClass: 'x1',
    speedKmS: 1900,
    route: [
      [-120, 64],
      [-178, -30],
      [-70, -150],
      [110, -150],
      [212, -10],
      [140, 120],
      [-24, 116]
    ],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 6, 0), x: 128, y: 176 },
      { at: at(12, 1, 30), x: 32, y: 148 },
      { at: at(12, 4, 12), x: -24, y: 116 }
    ]
  },
  {
    id: 'C-011',
    system: 'sol',
    kind: 'Civilian',
    signal: 'Transponder',
    range: '0.4 AU',
    seen: '06:38',
    x: -104,
    y: -8,
    speedKmS: 300,
    route: [
      [-40, -70],
      [24, -58],
      [-60, 20],
      [-104, -8]
    ],
    leg: 0,
    held: true,
    fixes: [
      { at: at(12, 0, 38), x: -112, y: 6 },
      { at: at(12, 6, 38), x: -104, y: -8 }
    ]
  },
  {
    id: 'C-009',
    system: 'sol',
    kind: 'Wreck',
    signal: 'Radar echo',
    range: '5.2 AU',
    seen: '2 Mar',
    x: 150,
    y: -118,
    speedKmS: 0,
    route: [],
    leg: 0,
    held: false,
    fixes: [{ at: Date.UTC(2087, 2, 2, 9, 0), x: 150, y: -118 }]
  },
  {
    id: 'C-017',
    system: 'acen',
    kind: 'Unknown',
    signal: 'EM 80',
    range: '2.2 AU',
    seen: '05:50',
    x: 60,
    y: 120,
    hostile: true,
    alienClass: 'x2',
    speedKmS: 800,
    route: [
      [-80, 110],
      [-150, -20],
      [-40, -130],
      [130, -40],
      [60, 120]
    ],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 22, 10), x: 120, y: 30 },
      { at: at(12, 5, 50), x: 60, y: 120 }
    ]
  },
  {
    id: 'C-016',
    system: 'acen',
    kind: 'Wreck',
    signal: 'Radar echo',
    range: '1.4 AU',
    seen: '8 Mar',
    x: -96,
    y: -64,
    speedKmS: 0,
    route: [],
    leg: 0,
    held: false,
    fixes: [{ at: Date.UTC(2087, 2, 8, 14, 0), x: -96, y: -64 }]
  },
  {
    id: 'C-019',
    system: 'barn',
    kind: 'Unknown',
    signal: 'Gravitic 30',
    range: '1.9 AU',
    seen: '03:05',
    x: 110,
    y: 40,
    speedKmS: 450,
    route: [
      [40, 110],
      [-100, 60],
      [-60, -80],
      [90, -70],
      [110, 40]
    ],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 18, 0), x: 112, y: -30 },
      { at: at(12, 3, 5), x: 110, y: 40 }
    ]
  }
];
