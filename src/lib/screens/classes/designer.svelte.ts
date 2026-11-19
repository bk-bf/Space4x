import { classes, classInUse, game, specFor, statsFor, type ClassRegistry } from '#lib/game/index.ts';
import { milestones } from '#lib/game/data/index.ts';
import { economy, touch, waitingOn, unlockedTag } from '#lib/game/economy/index.ts';
import { payloadFor, loadedWith, type Loaded } from './figures.ts';
import { addBelow } from './stackTry.svelte.ts';
import {
  addPart,
  canLock,
  copyOf,
  lock,
  newDesign,
  removePart,
  rename,
  setCount,
  setLoad,
  setRole,
  setYard,
  type DesignStats,
  type PropellantKind,
  type Role,
  type ShipDesign,
  type Yard
} from '#lib/game/shipdesign/index.ts';

export const PRESETS: Readonly<
  Record<string, { name: string; role: Role; yard: Yard; parts: [string, number][] }>
> = {
  stage: {
    name: 'Small stage',
    role: 'launcher',
    yard: 'rocket_factory',
    parts: [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 4],
      ['structure_truss', 1],
      ['cargo_bay', 1]
    ]
  },
  crewed: {
    name: 'Crewed vehicle',
    role: 'capsule',
    yard: 'orbital_shipyard',
    parts: [
      ['chemical_engine_hydrolox', 1],
      ['propellant_tank', 2],
      ['crew_capsule', 1],
      ['life_support_unit', 1],
      ['heat_shield', 1],
      ['solar_array', 1],
      ['battery_pack', 1],
      ['radiator', 1],
      ['mli_blanket', 1],
      ['docking_adapter', 1]
    ]
  }
};

export class Designer {
  pickedId = $state<string | null>(null);
  payloadAsked = $state<{ id: string; kg: number } | null>(null);

  constructor(private readonly registry: ClassRegistry = classes) {}

  get saved(): readonly ShipDesign[] {
    return this.registry.saved;
  }

  get design(): ShipDesign | undefined {
    return this.pickedId ? this.registry.find(this.pickedId) : undefined;
  }

  get unlocked(): (tag: number) => boolean {
    return unlockedTag(economy);
  }

  waitsFor(tag: number): string[] {
    return waitingOn(economy, tag);
  }

  get stats(): DesignStats | undefined {
    const d = this.design;
    return d ? statsFor(d) : undefined;
  }

  get payload(): number {
    const s = this.stats;
    if (!s) return 0;
    const asked = this.payloadAsked;
    return payloadFor(s, asked && asked.id === this.pickedId ? asked.kg : undefined);
  }

  get loaded(): Loaded | undefined {
    const d = this.design;
    const s = this.stats;
    return d && s ? loadedWith(d, s, this.payload) : undefined;
  }

  get inService(): boolean {
    return !!this.pickedId && classInUse(game, this.pickedId);
  }

  get canDelete(): boolean {
    return !!this.design && !this.inService;
  }

  get canLock(): boolean {
    const d = this.design;
    return !!d && canLock(d, this.unlocked);
  }

  specOf(d: ShipDesign) {
    return specFor(d);
  }

  pick(id: string): void {
    if (this.registry.find(id)) this.pickedId = id;
  }

  start(): void {
    const d = newDesign(this.registry.newId());
    this.registry.add(d);
    this.pickedId = d.id;
  }

  preset(key: string): void {
    const p = PRESETS[key];
    if (!p) return;
    let d: ShipDesign = { ...newDesign(this.registry.newId(), p.name), role: p.role, yard: p.yard };
    for (const [id, n] of p.parts) d = setCount(d, id, n);
    this.registry.add(d);
    this.pickedId = d.id;
  }

  addOrStart(id: string): void {
    if (!this.design) this.start();
    this.add(id);
  }

  setPayload(kg: number): void {
    if (this.pickedId) this.payloadAsked = { id: this.pickedId, kg };
  }

  copy(): void {
    const d = this.design;
    if (!d) return;
    const next = copyOf(d, this.registry.newId());
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
    if (d) this.replace(lock(d, this.unlocked));
  }

  private replace(next: ShipDesign | undefined): void {
    if (next && next !== this.design) this.registry.replace(next);
  }

  private edit(fn: (d: ShipDesign) => ShipDesign): void {
    const d = this.design;
    if (d) this.replace(fn(d));
  }

  add = (id: string) => this.edit((d) => addPart(d, id));
  take = (id: string) => this.edit((d) => removePart(d, id));
  count = (id: string, n: number) => this.edit((d) => setCount(d, id, n));
  load = (kind: PropellantKind, kg: number) => this.edit((d) => setLoad(d, kind, kg));
  rename = (name: string) => this.edit((d) => rename(d, name));
  role = (role: Role) => this.edit((d) => setRole(d, role));
  yard = (yard: Yard) => this.edit((d) => setYard(d, yard));
}

export const designer = new Designer();

export function applyClassParams(params: URLSearchParams): void {
  const reached = Number(params.get('reached'));
  if (Number.isInteger(reached) && reached > 0) {
    economy.done = milestones.filter((m) => !m.optional && m.number <= reached).map((m) => m.number);
    touch();
  }
  const key = params.get('new');
  if (key) designer.preset(key);
  const below = Number(params.get('below'));
  const open = designer.pickedId;
  if (open && Number.isInteger(below)) for (let i = 0; i < below; i++) addBelow(open);
}
