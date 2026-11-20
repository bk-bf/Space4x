import { defaultPauses, WARN_DAYS, type PauseKinds } from './alerts';
import { DAY, START_TIME } from './clock';
import { mockEvents } from './mock/events';
import { mockWorld } from './mock/world';
import { statusValues } from './status';
import { nextHorizon, runSystems } from './systems';
import type {
  Body,
  Contact,
  EventCategory,
  EventKind,
  Fleet,
  GameEvent,
  JumpPoint,
  Selection,
  Site,
  StarSystem,
  StatusValue,
  World
} from './types';

export interface EventDetails {
  at?: number;
  subject?: Selection;
  kind?: EventKind;
  site?: string;
  project?: number;
  material?: string;
}

const EVENT_LIMIT = 500;
const MIN_CHUNK = 1e-3;
const MAX_CHUNKS = 20_000;

export class Game {
  time = $state(START_TIME);
  running = $state(false);
  step = $state(DAY);
  selection = $state<Selection>({ kind: 'body', id: 'earth' });
  world = $state<World>(mockWorld());
  events = $state<GameEvent[]>(mockEvents());
  pauseOn = $state<PauseKinds>(defaultPauses());
  warnDays = $state(WARN_DAYS);
  pausedBy = $state<GameEvent | null>(null);
  readonly mock = true;
  private halted = false;

  get status(): StatusValue[] {
    return statusValues();
  }

  get elapsed(): number {
    return (this.time - START_TIME) / 1000;
  }

  advance(seconds: number): void {
    if (!(seconds > 0)) return;
    this.time += seconds * 1000;
    runSystems(this, seconds);
  }

  tick(seconds: number): void {
    if (!(seconds > 0)) return;
    this.halted = false;
    if (!Object.values(this.pauseOn).some(Boolean)) return this.advance(seconds);
    let left = seconds;
    for (let i = 0; left > 1e-6 && i < MAX_CHUNKS; i++) {
      runSystems(this, 0);
      if (this.halted) return;
      const dt = Math.min(left, Math.max(MIN_CHUNK, nextHorizon(this)));
      this.advance(dt);
      left -= dt;
      if (this.halted) return;
    }
  }

  setStep(seconds: number): void {
    this.step = seconds;
    if (!this.running) this.tick(seconds);
  }

  run(): void {
    this.running = true;
    this.pausedBy = null;
  }

  pause(): void {
    this.running = false;
  }

  toggleRunning(): void {
    if (this.running) this.pause();
    else this.run();
  }

  select(selection: Selection): void {
    this.selection = selection;
  }

  log(category: EventCategory, text: string, warn = false, details: EventDetails = {}): void {
    const at = details.at ?? this.time;
    const e: GameEvent = { at, category, text, ...(warn ? { warn } : {}) };
    if (details.subject) e.subject = details.subject;
    if (details.kind) e.kind = details.kind;
    if (details.site) e.site = details.site;
    if (details.project !== undefined) e.project = details.project;
    if (details.material) e.material = details.material;
    const i = this.events.findIndex((x) => x.at <= at);
    this.events.splice(i < 0 ? this.events.length : i, 0, e);
    if (this.events.length > EVENT_LIMIT) this.events.length = EVENT_LIMIT;
    if (details.kind && this.pauseOn[details.kind]) this.halt(e);
  }

  private halt(e: GameEvent): void {
    if (!this.halted || !this.pausedBy || e.at < this.pausedBy.at) this.pausedBy = e;
    this.halted = true;
    this.running = false;
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

  site(id: string): Site | undefined {
    return this.world.sites.find((s) => s.id === id);
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

  placeName(id: string): string | undefined {
    return this.body(id)?.name ?? this.jump(id)?.point.name;
  }

  placeSystem(id: string): string | undefined {
    return this.body(id)?.system ?? this.jump(id)?.system.id;
  }

  systemOf(sel: Selection): string | undefined {
    if (sel.kind === 'fleet') return this.fleet(sel.id)?.system;
    if (sel.kind === 'body') return this.body(sel.id)?.system;
    if (sel.kind === 'site') return this.site(sel.id)?.system;
    if (sel.kind === 'ship' || sel.kind === 'base' || sel.kind === 'jump') return this.world.systems[0]?.id;
    return this.contact(sel.id)?.system;
  }
}

export const game = new Game();

export const advance = (seconds: number): void => game.advance(seconds);
