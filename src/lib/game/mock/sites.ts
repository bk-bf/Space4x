import { bodyPosition } from '../orbits';
import type { Game } from '../state.svelte';
import type { Site } from '../types';
import { AU } from '../units';

export const mockSites = (): Site[] => [
  {
    id: 'sol-station',
    system: 'sol',
    name: 'Sol Station',
    kind: 'yard',
    station: true,
    place: { body: 'earth', angle: -2.2, altitude: 0.3 },
    facts: [
      ['Kind', 'Station and shipyard'],
      ['Doing', 'Building a Pike hull'],
      ['Docked', 'Ceres Star'],
      ['Orbit', 'Low Earth']
    ]
  },
  {
    id: 'deep-well',
    system: 'sol',
    name: 'Deep Well 2',
    kind: 'harvester',
    station: true,
    place: { body: 'jupiter', angle: -1.3, altitude: 0.3 },
    facts: [
      ['Kind', 'Gas harvester'],
      ['Doing', 'Refuelling a tanker'],
      ['Docking', 'Juno Star'],
      ['Orbit', 'Low Jupiter']
    ]
  },
  {
    id: 'battle',
    system: 'sol',
    name: 'Battle · C-014',
    kind: 'battle',
    hostile: true,
    place: { contact: 'C-014' },
    facts: [
      ['Kind', 'Fleet battle'],
      ['Sides', '5 against 5'],
      ['Foe', 'Unknown cruisers'],
      ['Where', 'With C-014']
    ]
  },
  {
    id: 'boarding',
    system: 'sol',
    name: 'Boarding · C-022',
    kind: 'boarding',
    hostile: true,
    place: { body: 'mars', angle: 2, altitude: 6 },
    facts: [
      ['Kind', 'Boarding action'],
      ['Craft', '3 boarding craft'],
      ['Target', 'Hostile cruiser'],
      ['Where', 'Near Mars']
    ]
  },
  {
    id: 'salvage',
    system: 'sol',
    name: 'Salvage · wreck',
    kind: 'salvage',
    place: { orbit: 2.45 * AU, angle: 1.2 },
    facts: [
      ['Kind', 'Salvage'],
      ['Wreck', 'Unknown cruiser'],
      ['Tender', 'Ceres Star'],
      ['Where', 'Main belt']
    ]
  },
  {
    id: 'gate',
    system: 'sol',
    name: 'Gate transit',
    kind: 'gate',
    place: { jump: 'sol-a' },
    facts: [
      ['Kind', 'Gate transit'],
      ['Through', 'Task force 2'],
      ['Inbound', 'Vesta Star'],
      ['Where', 'Jump point A']
    ]
  }
];

export function sitePosition(game: Game, site: Site): [number, number] | undefined {
  const p = site.place;
  if ('body' in p) {
    const b = game.body(p.body);
    if (!b) return undefined;
    const [x, y] = bodyPosition(b, game.world.bodies),
      r = b.radius * (1 + p.altitude);
    return [x + Math.cos(p.angle) * r, y + Math.sin(p.angle) * r];
  }
  if ('contact' in p) {
    const c = game.contact(p.contact);
    return c ? [c.x, c.y] : undefined;
  }
  if ('jump' in p) {
    const j = game.jump(p.jump)?.point;
    return j ? [j.x, j.y] : undefined;
  }
  return [Math.cos(p.angle) * p.orbit, Math.sin(p.angle) * p.orbit];
}
