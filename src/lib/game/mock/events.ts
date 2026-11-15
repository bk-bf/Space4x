import type { GameEvent } from '../types';
import { START_TIME } from '../clock';

export const mockEvents = (): GameEvent[] => [
  {
    at: START_TIME,
    category: 'flask',
    text: 'Earth has one government. Jump point A, out past Jupiter, is unsurveyed and unstable; stabilising it is the goal.',
    subject: { kind: 'body', id: 'earth' }
  }
];
