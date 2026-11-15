import type { StarSystem } from '../types';

export const mockSystems = (): StarSystem[] => [
  {
    id: 'sol',
    name: 'Sol',
    stars: [{ x: 0, y: 0, radius: 14 }],
    belt: { inner: 124, width: 13 },
    jumps: [{ id: 'sol-a', name: 'Jump point A', x: -150, y: -84, to: 'acen-a' }]
  },
  {
    id: 'acen',
    name: 'Alpha Centauri',
    stars: [
      { x: 0, y: 0, radius: 14 },
      {
        x: 176,
        y: -96,
        radius: 9,
        tint: {
          core: [
            [255, 236, 200],
            [255, 184, 96],
            [228, 120, 52]
          ],
          corona: [
            [214, 96, 44],
            [132, 52, 40]
          ]
        }
      }
    ],
    belt: { inner: 80, width: 9 },
    jumps: [
      { id: 'acen-a', name: 'Jump point A', x: -160, y: 70, to: 'sol-a' },
      { id: 'acen-b', name: 'Jump point B', x: 120, y: 118, to: 'barn-a' }
    ]
  },
  {
    id: 'barn',
    name: "Barnard's Star",
    stars: [
      {
        x: 0,
        y: 0,
        radius: 9,
        tint: {
          core: [
            [255, 214, 186],
            [240, 128, 84],
            [196, 72, 56]
          ],
          corona: [
            [176, 60, 48],
            [108, 36, 44]
          ]
        }
      }
    ],
    jumps: [{ id: 'barn-a', name: 'Jump point A', x: -150, y: -70, to: 'acen-b' }]
  }
];
