import { DAY, START_TIME } from './clock';
import { mockEvents } from './mock/events';
import { mockStatus } from './mock/status';
import { mockWorld } from './mock/world';
import { runSystems } from './systems';
import type {
  Body,
  Contact,
  EventCategory,
  Fleet,
  GameEvent,
  JumpPoint,
  Selection,
  StarSystem,
  StatusValue,
  World
} from './types';

export interface EventDetails {
  at?: number;
  subject?: Selection;
}

const EVENT_LIMIT = 500;

export class Game {
  time = $state(START_TIME);
  running = $state(false);
  step = $state(DAY);
  selection = $state<Selection>({ kind: 'fleet', id: 'survey' });
  world = $state<World>(mockWorld());
  events = $state<GameEvent[]>(mockEvents());
  status = $state<StatusValue[]>(mockStatus());
  readonly mock = true;

  get elapsed(): number {
    return (this.time - START_TIME) / 1000;
  }

  advance(seconds: number): void {
    if (!(seconds > 0)) return;
    this.time += seconds * 1000;
    runSystems(this, seconds);
  }

  setStep(seconds: number): void {
    this.step = seconds;
    if (!this.running) this.advance(seconds);
  }

  run(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  toggleRunning(): void {
    this.running = !this.running;
  }

  select(selection: Selection): void {
    this.selection = selection;
  }

  log(category: EventCategory, text: string, warn = false, details: EventDetails = {}): void {
    const at = details.at ?? this.time;
    const e: GameEvent = { at, category, text, ...(warn ? { warn } : {}) };
    if (details.subject) e.subject = details.subject;
    const i = this.events.findIndex((x) => x.at <= at);
    this.events.splice(i < 0 ? this.events.length : i, 0, e);
    if (this.events.length > EVENT_LIMIT) this.events.length = EVENT_LIMIT;
  }

  body(id: string): Body | undefined {
    return this.world.bodies.find((b) => b.id === id);
  }

  fleet(id: string): Fleet | undefined {
    return this.world.fleets.find((f) => f.id === id);
  }

  contact(id: string): Contact | undefined {
    return this.world.contacts.find((c) => c.id === id);
  }

  starSystem(id: string): StarSystem | undefined {
    return this.world.systems.find((s) => s.id === id);
  }

  jump(id: string): { system: StarSystem; point: JumpPoint } | undefined {
    for (const system of this.world.systems) {
      const point = system.jumps.find((j) => j.id === id);
      if (point) return { system, point };
    }
    return undefined;
  }

  systemOf(sel: Selection): string | undefined {
    if (sel.kind === 'fleet') return this.fleet(sel.id)?.system;
    if (sel.kind === 'body') return this.body(sel.id)?.system;
    return this.contact(sel.id)?.system;
  }
}

export const game = new Game();

export const advance = (seconds: number): void => game.advance(seconds);
