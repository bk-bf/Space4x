import type { Contact } from '../types';

export const mockContacts = (): Contact[] => [
  {
    id: 'C-014',
    kind: 'Unknown',
    signal: 'Thermal 240',
    range: '3.1 AU',
    seen: '04:12',
    x: -24,
    y: 116,
    hostile: true,
    alienClass: 'x1'
  },
  { id: 'C-011', kind: 'Civilian', signal: 'Transponder', range: '0.4 AU', seen: '06:38', x: -104, y: -8 },
  { id: 'C-009', kind: 'Wreck', signal: 'Radar echo', range: '5.2 AU', seen: '2 Mar', x: 150, y: -118 }
];
