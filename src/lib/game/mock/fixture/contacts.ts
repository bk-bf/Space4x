import type { Contact } from '../../types';
import { AU } from '../../units';

const au2 = (x: number, y: number) => [x * AU, y * AU] as const;
const xy = (x: number, y: number) => ({ x: x * AU, y: y * AU });

const at = (day: number, hour: number, minute: number) => Date.UTC(2087, 2, day, hour, minute);

export const fixtureContacts = (): Contact[] => [
  {
    id: 'C-014',
    system: 'sol',
    kind: 'Unknown',
    signal: 'Thermal 240',
    range: '3.1 AU',
    seen: '04:12',
    ...xy(-0.46, 2.24),
    hostile: true,
    alienClass: 'x1',
    speedKmS: 1900,
    route: [
      au2(-2.84, 1.52),
      au2(-7.46, -1.26),
      au2(-2.39, -5.12),
      au2(4.89, -6.66),
      au2(10.66, -0.5),
      au2(6.12, 5.24),
      au2(-0.46, 2.24)
    ],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 6, 0), ...xy(6.5, 8.93) },
      { at: at(12, 1, 30), ...xy(0.93, 4.3) },
      { at: at(12, 4, 12), ...xy(-0.46, 2.24) }
    ]
  },
  {
    id: 'C-011',
    system: 'sol',
    kind: 'Civilian',
    signal: 'Transponder',
    range: '0.4 AU',
    seen: '06:38',
    ...xy(-1.7, -0.13),
    speedKmS: 300,
    route: [au2(-0.56, -0.98), au2(0.33, -0.79), au2(-0.82, 0.27), au2(-1.7, -0.13)],
    leg: 0,
    held: true,
    fixes: [
      { at: at(12, 0, 38), ...xy(-2.02, 0.11) },
      { at: at(12, 6, 38), ...xy(-1.7, -0.13) }
    ]
  },
  {
    id: 'C-009',
    system: 'sol',
    kind: 'Wreck',
    signal: 'Radar echo',
    range: '5.2 AU',
    seen: '2 Mar',
    ...xy(6.98, -5.49),
    speedKmS: 0,
    route: [],
    leg: 0,
    held: false,
    fixes: [{ at: Date.UTC(2087, 2, 2, 9, 0), ...xy(6.98, -5.49) }]
  },
  {
    id: 'C-017',
    system: 'acen',
    kind: 'Unknown',
    signal: 'EM 80',
    range: '2.2 AU',
    seen: '05:50',
    ...xy(0.81, 1.62),
    hostile: true,
    alienClass: 'x2',
    speedKmS: 800,
    route: [au2(-1.08, 1.49), au2(-2.03, -0.27), au2(-0.54, -1.76), au2(1.76, -0.54), au2(0.81, 1.62)],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 22, 10), ...xy(1.62, 0.41) },
      { at: at(12, 5, 50), ...xy(0.81, 1.62) }
    ]
  },
  {
    id: 'C-016',
    system: 'acen',
    kind: 'Wreck',
    signal: 'Radar echo',
    range: '1.4 AU',
    seen: '8 Mar',
    ...xy(-1.3, -0.86),
    speedKmS: 0,
    route: [],
    leg: 0,
    held: false,
    fixes: [{ at: Date.UTC(2087, 2, 8, 14, 0), ...xy(-1.3, -0.86) }]
  },
  {
    id: 'C-019',
    system: 'barn',
    kind: 'Unknown',
    signal: 'Gravitic 30',
    range: '1.9 AU',
    seen: '03:05',
    ...xy(1.49, 0.54),
    speedKmS: 450,
    route: [au2(0.54, 1.49), au2(-1.35, 0.81), au2(-0.81, -1.08), au2(1.22, -0.95), au2(1.49, 0.54)],
    leg: 0,
    held: false,
    fixes: [
      { at: at(11, 18, 0), ...xy(1.51, -0.41) },
      { at: at(12, 3, 5), ...xy(1.49, 0.54) }
    ]
  }
];
