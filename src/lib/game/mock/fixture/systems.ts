import type { StarSystem } from '../../types';
import { AU, au } from '../../units';

const polar = (r: number, a: number) => ({ x: Math.cos(a) * r * AU, y: Math.sin(a) * r * AU });

export const fixtureSystems = (): StarSystem[] => [
  {
    id: 'acen',
    name: 'Alpha Centauri',
    stars: [
      { name: 'Alpha Centauri A', x: 0, y: 0, radius: 8.51e8 },
      {
        name: 'Alpha Centauri B',
        ...polar(23.4, -0.5),
        radius: 6.02e8,
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
    belt: { inner: au(1.08), width: au(0.12) },
    jumps: [
      { id: 'acen-a', name: 'Jump point A', ...polar(2.36, 2.73), to: 'sol-a' },
      { id: 'acen-b', name: 'Jump point B', ...polar(2.28, 0.78), to: 'barn-a' }
    ]
  },
  {
    id: 'barn',
    name: "Barnard's Star",
    stars: [
      {
        name: "Barnard's Star",
        x: 0,
        y: 0,
        radius: 1.36e8,
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
    jumps: [{ id: 'barn-a', name: 'Jump point A', ...polar(2.24, -2.7), to: 'acen-b' }]
  }
];
