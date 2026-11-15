import { classStats, game, registerClassUse, type Game } from '#lib/game/index.ts';
import { weaponSummary } from '#lib/game/design.ts';

export const STANCES = ['Unknown', 'Hostile', 'Wary', 'Neutral', 'Friendly', 'Allied'] as const;

export type Stance = (typeof STANCES)[number];

export interface ContactClass {
  id: string;
  name: string;
  likely: string;
  look: string;
  facts?: readonly (readonly [string, string])[];
}

export interface Group {
  id: string;
  name: string;
  stance: Stance;
  firstSeen: number;
  home: string;
  largest: string;
  classes: readonly string[];
  seenEarlier: number;
}

export interface Sighting {
  id: string;
  at: number;
  system: string;
  place: string;
  group: string;
  cls: string;
  what: string;
  range: string;
  encounter: string;
  contact?: string;
}

export const CLASSES: readonly ContactClass[] = [
  {
    id: 'x1',
    name: 'Type A',
    likely: 'likely a cruiser',
    look: 'x1',
    facts: [
      ['Length', 'about 310 m'],
      ['Top speed seen', '1,900 km/s'],
      ['Weapons seen', 'Beam, missiles']
    ]
  },
  {
    id: 'x2',
    name: 'Type B',
    likely: 'likely an escort',
    look: 'x2',
    facts: [
      ['Length', 'about 110 m'],
      ['Top speed seen', '2,600 km/s'],
      ['Weapons seen', 'Missiles']
    ]
  },
  {
    id: 'hauler',
    name: 'Hauler',
    likely: 'bulk freight',
    look: 'atlas'
  },
  {
    id: 'tanker',
    name: 'Tanker',
    likely: 'fuel transport',
    look: 'mule'
  }
];

export class Intel {
  groups = $state<Group[]>([]);
  sightings = $state<Sighting[]>([]);
  group = $state('');
  sighting = $state('');
  filterGroup = $state('all');
  filterClass = $state('all');

  groupOf(id: string): Group | undefined {
    return this.groups.find((g) => g.id === id);
  }

  classOf(id: string): ContactClass | undefined {
    return CLASSES.find((c) => c.id === id);
  }

  seen(id: string): number {
    const group = this.groupOf(id);
    const encounters = this.sightings.filter((s) => s.group === id).map((s) => s.encounter);
    return (group?.seenEarlier ?? 0) + encounters.filter((e, i) => encounters.indexOf(e) === i).length;
  }

  classOptions(): ContactClass[] {
    const ids =
      this.filterGroup === 'all' ? CLASSES.map((c) => c.id) : (this.groupOf(this.filterGroup)?.classes ?? []);
    return CLASSES.filter((c) => ids.includes(c.id));
  }

  visible(): Sighting[] {
    return this.sightings
      .filter((s) => this.filterGroup === 'all' || s.group === this.filterGroup)
      .filter((s) => this.filterClass === 'all' || s.cls === this.filterClass)
      .sort((a, b) => b.at - a.at);
  }

  pickGroup(id: string): void {
    if (!this.groupOf(id)) return;
    this.group = id;
    this.setGroupFilter(id);
  }

  showContact(contactId: string): boolean {
    const latest = this.sightings.filter((s) => s.contact === contactId).sort((a, b) => b.at - a.at)[0];
    if (!latest) return false;
    this.pickGroup(latest.group);
    this.filterClass = 'all';
    this.sighting = latest.id;
    return true;
  }

  setGroupFilter(id: string): void {
    this.filterGroup = id;
    if (!this.classOptions().some((c) => c.id === this.filterClass)) this.filterClass = 'all';
  }

  setStance(id: string, stance: Stance, g: Game = game): boolean {
    const group = this.groupOf(id);
    if (!group || !STANCES.includes(stance) || group.stance === stance) return false;
    group.stance = stance;
    g.log('eye', `Stance toward ${group.name} set to ${stance}.`, stance === 'Hostile');
    return true;
  }
}

export function factsOf(c: ContactClass): readonly (readonly [string, string])[] {
  const stats = classStats(c.look);
  if (!stats) return c.facts ?? [];
  return [
    ['Length', `about ${stats.length} m`],
    ['Top speed seen', `${stats.speed.toLocaleString('en-US')} km/s`],
    ['Weapons seen', weaponSummary(stats.weapons)]
  ];
}

registerClassUse((id) => CLASSES.some((c) => c.look === id));

export const intel = new Intel();

export function applyIntelParams(params: URLSearchParams): void {
  const id = params.get('group');
  if (id) intel.pickGroup(id);
}
