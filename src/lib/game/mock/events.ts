import type { EventCategory, GameEvent, Selection } from '../types';

const at = (day: number, hour: number, minute: number) => Date.UTC(2087, 2, day, hour, minute);

const event = (
  time: number,
  category: EventCategory,
  text: string,
  subject?: Selection,
  warn = false
): GameEvent => ({
  at: time,
  category,
  text,
  ...(warn ? { warn } : {}),
  ...(subject ? { subject } : {})
});

const fleet = (id: string): Selection => ({ kind: 'fleet', id });
const body = (id: string): Selection => ({ kind: 'body', id });
const contact = (id: string): Selection => ({ kind: 'contact', id });

export const mockEvents = (): GameEvent[] => [
  event(at(12, 6, 40), 'ship', 'Survey group 1 passed the halfway point to Mars.', fleet('survey')),
  event(at(12, 4, 12), 'eye', 'Jupiter picket lost its track on C-014.', contact('C-014'), true),
  event(at(12, 2, 55), 'factory', 'Uranium stock at Earth fell below one year of use.', body('earth'), true),
  event(
    at(12, 1, 30),
    'eye',
    'Jupiter picket picked up C-014 at 3.4 AU, thermal 240.',
    contact('C-014'),
    true
  ),
  event(at(11, 20, 5), 'ship', 'Freight convoy began loading at Earth.', fleet('convoy')),
  event(at(11, 14, 0), 'flask', 'Deep-space sensors reached 88%.'),
  event(at(11, 9, 20), 'factory', 'Luna yard 1 laid down an Atlas freighter.'),
  event(at(10, 17, 45), 'ship', 'Probe group entered Alpha Centauri.', fleet('probe')),
  event(at(10, 8, 10), 'factory', 'Mars finished 2 mines.', body('mars')),
  event(
    at(9, 22, 40),
    'eye',
    'A Type B ship was seen near Jupiter and lost after 2 hours.',
    body('jupiter'),
    true
  ),
  event(at(9, 11, 0), 'flask', 'Composite armour started under Lindqvist.'),
  event(at(8, 15, 30), 'ship', 'Jupiter picket took station at Jupiter.', fleet('picket'))
];
