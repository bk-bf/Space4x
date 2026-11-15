import { game, type Game } from '#lib/game/index.ts';
import { shell } from '#lib/ui/index.ts';
import { isFieldId, TECHS, techById, techsOf, type FieldId, type Tech } from './tech.ts';

export interface Scientist {
  id: string;
  name: string;
  field: FieldId;
  bonus: number;
  capacity: number;
}

export interface Project {
  tech: string;
  lead: string;
  labs: number;
}

export type TechState = 'done' | 'running' | 'open' | 'locked';

export const POINTS_PER_LAB_YEAR = 1950;
export const YEAR_SECONDS = 365.25 * 86400;

const RATE_PER_LAB = POINTS_PER_LAB_YEAR / YEAR_SECONDS;

const mockScientists = (): Scientist[] => [
  { id: 'okafor', name: 'Okafor', field: 'propulsion', bonus: 0.2, capacity: 3 },
  { id: 'lindqvist', name: 'Lindqvist', field: 'defence', bonus: 0.1, capacity: 2 },
  { id: 'tanaka', name: 'Tanaka', field: 'sensors', bonus: 0.35, capacity: 4 },
  { id: 'moreau', name: 'Moreau', field: 'industry', bonus: 0.15, capacity: 2 },
  { id: 'adeyemi', name: 'Adeyemi', field: 'power', bonus: 0.25, capacity: 2 },
  { id: 'kowalski', name: 'Kowalski', field: 'weapons', bonus: 0.05, capacity: 2 },
  { id: 'rahman', name: 'Rahman', field: 'biology', bonus: 0.3, capacity: 3 },
  { id: 'sato', name: 'Sato', field: 'logistics', bonus: 0.1, capacity: 2 }
];

const MOCK_DONE: readonly string[] = [
  'chemical-rockets',
  'nuclear-thermal',
  'solar-sail',
  'fission-piles',
  'radiator-panels',
  'solar-arrays',
  'optical-arrays',
  'radio-telescopes',
  'heat-trackers',
  'slug-turrets',
  'beam-emitters',
  'guided-rockets',
  'steel-plating',
  'damage-control',
  'ore-processing',
  'fuel-refining',
  'assemblers',
  'closed-loop-air',
  'hydroponics',
  'field-medicine',
  'cargo-handling',
  'standard-containers',
  'fuel-depots'
];

const mockRunning = (): Project[] => [
  { tech: 'ion-drive', lead: 'okafor', labs: 2 },
  { tech: 'composite-armour', lead: 'lindqvist', labs: 1 },
  { tech: 'deep-space-sensors', lead: 'tanaka', labs: 1 },
  { tech: 'fuel-refining-ii', lead: 'moreau', labs: 0 }
];

const mockPoints = (): Record<string, number> => ({
  'ion-drive': 0.64 * 6000,
  'composite-armour': 0.22 * 3200,
  'deep-space-sensors': 0.88 * 4800,
  'fuel-refining-ii': 0.41 * 3800
});

export class Research {
  totalLabs = $state(5);
  scientists = $state<Scientist[]>(mockScientists());
  done = $state<string[]>([...MOCK_DONE]);
  running = $state<Project[]>(mockRunning());
  points = $state<Record<string, number>>(mockPoints());
  field = $state<FieldId>('propulsion');
  selected = $state<string>('ion-drive');
  lead = $state('okafor');

  labsUsed = $derived(this.running.reduce((n, p) => n + p.labs, 0));
  labsFree = $derived(this.totalLabs - this.labsUsed);

  stateOf(id: string): TechState {
    if (this.done.includes(id)) return 'done';
    if (this.running.some((p) => p.tech === id)) return 'running';
    const tech = techById(id);
    return tech && tech.needs.every((n) => this.done.includes(n)) ? 'open' : 'locked';
  }

  project(id: string): Project | undefined {
    return this.running.find((p) => p.tech === id);
  }

  scientist(id: string): Scientist | undefined {
    return this.scientists.find((s) => s.id === id);
  }

  fraction(id: string): number {
    const tech = techById(id);
    if (!tech) return 0;
    if (this.done.includes(id)) return 1;
    return Math.min(1, (this.points[id] ?? 0) / tech.cost);
  }

  open(): Tech[] {
    return TECHS.filter((t) => this.stateOf(t.id) === 'open');
  }

  labsOf(scientistId: string): number {
    return this.running.filter((p) => p.lead === scientistId).reduce((n, p) => n + p.labs, 0);
  }

  capacityLeft(scientistId: string): number {
    const s = this.scientist(scientistId);
    return s ? s.capacity - this.labsOf(scientistId) : 0;
  }

  rateOf(tech: Tech, scientistId: string, labs: number): number {
    const s = this.scientist(scientistId);
    const bonus = s && s.field === tech.field ? s.bonus : 0;
    return labs * RATE_PER_LAB * (1 + bonus);
  }

  secondsLeft(tech: Tech, scientistId: string, labs: number): number {
    const rate = this.rateOf(tech, scientistId, labs);
    const left = tech.cost - (this.points[tech.id] ?? 0);
    return rate > 0 ? left / rate : Infinity;
  }

  maxStartLabs(scientistId: string): number {
    return Math.max(0, Math.min(this.labsFree, this.capacityLeft(scientistId)));
  }

  start(id: string, scientistId: string, labs: number, g: Game = game): boolean {
    const tech = techById(id);
    if (!tech || this.stateOf(id) !== 'open') return false;
    if (!(labs >= 1) || labs > this.maxStartLabs(scientistId)) return false;
    this.running.push({ tech: id, lead: scientistId, labs });
    const lead = this.scientist(scientistId);
    g.log(
      'flask',
      `${tech.name} started under ${lead?.name ?? 'a scientist'} with ${labs} ${labs === 1 ? 'lab' : 'labs'}.`
    );
    syncLabsChip(g, this);
    return true;
  }

  setLabs(id: string, labs: number, g: Game = game): boolean {
    const p = this.project(id);
    if (!p || !Number.isInteger(labs) || labs < 0) return false;
    const grow = labs - p.labs;
    if (grow > this.labsFree || grow > this.capacityLeft(p.lead)) return false;
    p.labs = labs;
    syncLabsChip(g, this);
    return true;
  }

  cancel(id: string, g: Game = game): boolean {
    const i = this.running.findIndex((p) => p.tech === id);
    const tech = techById(id);
    if (i < 0 || !tech) return false;
    this.running.splice(i, 1);
    g.log('flask', `${tech.name} was set aside at ${Math.round(this.fraction(id) * 100)}%.`);
    syncLabsChip(g, this);
    return true;
  }

  showField(id: FieldId): void {
    this.field = id;
    const tech = techsOf(id).find((t) => ['running', 'open'].includes(this.stateOf(t.id)));
    if (tech) this.selected = tech.id;
  }

  select(id: string): void {
    const tech = techById(id);
    if (!tech) return;
    this.selected = id;
    this.field = tech.field;
  }

  advance(g: Game, seconds: number): void {
    const finished: Project[] = [];
    for (const p of this.running) {
      const tech = techById(p.tech);
      if (!tech || p.labs === 0) continue;
      const total = (this.points[p.tech] ?? 0) + this.rateOf(tech, p.lead, p.labs) * seconds;
      this.points[p.tech] = Math.min(tech.cost, total);
      if (total >= tech.cost) finished.push(p);
    }
    for (const p of finished) this.finish(g, p);
    syncLabsChip(g, this);
  }

  private finish(g: Game, p: Project): void {
    const tech = techById(p.tech);
    if (!tech) return;
    const before = this.open().map((t) => t.id);
    this.running.splice(this.running.indexOf(p), 1);
    this.done.push(tech.id);
    delete this.points[tech.id];
    const opened = this.open()
      .filter((t) => !before.includes(t.id))
      .map((t) => t.name);
    const lead = this.scientist(p.lead)?.name ?? 'the team';
    g.log(
      'flask',
      `${tech.name} finished under ${lead}.${opened.length ? ` Now open: ${opened.join(', ')}.` : ''}`
    );
  }
}

export function syncLabsChip(g: Game, research: Research): void {
  const chip = g.status.find((c) => c.id === 'labs');
  if (chip) chip.value = `${research.labsUsed}/${research.totalLabs}`;
}

export const research = new Research();

let queryApplied = false;

export function applyResearchQuery(): void {
  if (queryApplied) return;
  queryApplied = true;
  const field = shell.param('field');
  if (isFieldId(field)) research.showField(field);
}
