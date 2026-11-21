import { economy, unlockedTag, waitingOn } from '#lib/game/economy/index.ts';
import {
  addRobotPart,
  canLockRobot,
  copyRobot,
  lockRobot,
  newRobot,
  removeRobotPart,
  renameRobot,
  robots,
  robotStats,
  setRobotCount,
  type RobotDesign,
  type RobotRegistry,
  type RobotStats
} from '#lib/game/robots/index.ts';
import { ships } from '#lib/game/ships/index.ts';

export const ROBOT_PRESETS: Readonly<Record<string, { name: string; parts: [string, number][] }>> = {
  excavator: {
    name: 'Regolith digger',
    parts: [
      ['drum_excavator', 1],
      ['wheeled_chassis', 1],
      ['battery_dock', 1]
    ]
  },
  driller: {
    name: 'Asteroid driller',
    parts: [
      ['drill_oven', 1],
      ['anchored_chassis', 1],
      ['radioisotope_generator', 3],
      ['robot_computer', 1]
    ]
  }
};

export function robotInUse(id: string): boolean {
  return (
    economy.sites.some(
      (s) => s.robots.some((r) => r.design === id) || s.yard.some((o) => o.robot && o.design === id)
    ) || ships.vessels.some((v) => (v.robots[id] ?? 0) > 0)
  );
}

export class RobotDesigner {
  pickedId = $state<string | null>(null);

  constructor(private readonly registry: RobotRegistry = robots) {}

  get saved(): readonly RobotDesign[] {
    return this.registry.saved;
  }

  get design(): RobotDesign | undefined {
    return this.pickedId ? this.registry.find(this.pickedId) : undefined;
  }

  get unlocked(): (tag: number) => boolean {
    return unlockedTag(economy);
  }

  waitsFor(tag: number): string[] {
    return waitingOn(economy, tag);
  }

  get stats(): RobotStats | undefined {
    const d = this.design;
    return d ? robotStats(d, this.unlocked) : undefined;
  }

  get inService(): boolean {
    return !!this.pickedId && robotInUse(this.pickedId);
  }

  get canDelete(): boolean {
    return !!this.design && !this.inService;
  }

  get canLock(): boolean {
    const d = this.design;
    return !!d && canLockRobot(d, this.unlocked);
  }

  pick(id: string): void {
    if (this.registry.find(id)) this.pickedId = id;
  }

  start(): void {
    const d = newRobot(this.registry.newId());
    this.registry.add(d);
    this.pickedId = d.id;
  }

  preset(key: string): void {
    const p = ROBOT_PRESETS[key];
    if (!p) return;
    let d = newRobot(this.registry.newId(), p.name);
    for (const [id, n] of p.parts) d = setRobotCount(d, id, n);
    this.registry.add(d);
    this.pickedId = d.id;
  }

  addOrStart(id: string): void {
    if (!this.design) this.start();
    this.add(id);
  }

  copy(): void {
    const d = this.design;
    if (!d) return;
    const next = copyRobot(d, this.registry.newId());
    this.registry.add(next);
    this.pickedId = next.id;
  }

  remove(): void {
    const d = this.design;
    if (!d || !this.canDelete) return;
    this.registry.remove(d.id);
    this.pickedId = this.registry.saved.at(-1)?.id ?? null;
  }

  lockIt(): void {
    const d = this.design;
    if (d) this.replace(lockRobot(d, this.unlocked));
  }

  private replace(next: RobotDesign): void {
    if (next !== this.design) this.registry.replace(next);
  }

  private edit(fn: (d: RobotDesign) => RobotDesign): void {
    const d = this.design;
    if (d) this.replace(fn(d));
  }

  add = (id: string) => this.edit((d) => addRobotPart(d, id));
  take = (id: string) => this.edit((d) => removeRobotPart(d, id));
  count = (id: string, n: number) => this.edit((d) => setRobotCount(d, id, n));
  rename = (name: string) => this.edit((d) => renameRobot(d, name));
}

export const robotDesigner = new RobotDesigner();

export function applyRobotParams(params: URLSearchParams): void {
  const key = params.get('robot');
  if (key) {
    robotDesigner.preset(key);
    if (params.has('lock')) robotDesigner.lockIt();
  }
}
