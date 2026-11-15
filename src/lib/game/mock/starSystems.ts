import type { StarSystem } from '../types';
import { AU, au } from '../units';

const polar = (r: number, a: number) => ({ x: Math.cos(a) * r * AU, y: Math.sin(a) * r * AU });

export const mockSystems = (): StarSystem[] => [
  {
    id: 'sol',
    name: 'Sol',
    stars: [{ name: 'Sun', x: 0, y: 0, radius: 6.957e8 }],
    belt: { inner: au(2.15), width: au(1.15) },
    jumps: [{ id: 'sol-a', name: 'Jump point A', ...polar(6.2, 4), surveyed: false, stable: false }]
  }
];
