import type { EventCategory, GameEvent } from '../types';

const at = (day: number, hour: number, minute: number) => Date.UTC(2087, 2, day, hour, minute);

const event = (time: number, category: EventCategory, text: string, warn = false): GameEvent =>
  warn ? { at: time, category, text, warn } : { at: time, category, text };

export const mockEvents = (): GameEvent[] => [
  event(at(12, 6, 40), 'ship', 'Survey group 1 passed the halfway point to Mars.'),
  event(at(12, 4, 12), 'eye', 'Jupiter picket lost its track on C-014.', true),
  event(at(12, 2, 55), 'factory', 'Uranium stock at Earth fell below one year of use.', true),
  event(at(12, 1, 30), 'eye', 'Jupiter picket picked up C-014 at 3.4 AU, thermal 240.', true),
  event(at(11, 20, 5), 'ship', 'Freight convoy began loading at Earth.'),
  event(at(11, 14, 0), 'flask', 'Deep-space sensors reached 88%.'),
  event(at(11, 9, 20), 'factory', 'Luna yard 1 laid down an Atlas freighter.'),
  event(at(10, 17, 45), 'ship', 'Probe group entered Alpha Centauri.'),
  event(at(10, 8, 10), 'factory', 'Mars finished 2 mines.'),
  event(at(9, 22, 40), 'eye', 'A Type B ship was seen near Jupiter and lost after 2 hours.', true),
  event(at(9, 11, 0), 'flask', 'Composite armour started under Lindqvist.'),
  event(at(8, 15, 30), 'ship', 'Jupiter picket took station at Jupiter.')
];
