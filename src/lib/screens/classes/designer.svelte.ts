import { game } from '#lib/game/index.ts';
import type { BowKey, CoreKey } from '#lib/gfx/ships/parts.ts';
import { SPECS } from '#lib/gfx/ships/specs.ts';
import {
  HULLS,
  MAX_SECTIONS,
  addSection,
  asClass,
  attachmentAt,
  attachmentKey,
  clearAft,
  clearBow,
  clearStern,
  defaultAttachment,
  moveSection,
  removeSection,
  sameDesign,
  setAft,
  setAttachment,
  setBow,
  setCargoLayers,
  setEngines,
  setStern,
  type PaletteItem,
  type Selection,
  type ShipClass,
  type Slot
} from './design.ts';

export type Drag = { kind: 'palette'; item: PaletteItem } | { kind: 'section'; index: number };

const FIRST_CLASS = 'bastion';

export class Designer {
  saved = $state.raw<readonly ShipClass[]>(SPECS.map((s) => asClass(s)));
  draft = $state.raw<ShipClass>(asClass(SPECS.find((s) => s.id === FIRST_CLASS)!));
  baseId = $state<string | null>(FIRST_CLASS);
  selection = $state.raw<Selection>({ kind: 'section', index: 0, slot: 'top' });
  drag = $state.raw<Drag | null>(null);
  private counter = 0;

  get base(): ShipClass | undefined {
    return this.saved.find((c) => c.id === this.baseId);
  }

  get dirty(): boolean {
    const base = this.base;
    return !base || !sameDesign(base, this.draft);
  }

  get inService(): boolean {
    return !!this.baseId && game.world.fleets.some((f) => f.classId === this.baseId);
  }

  get canDelete(): boolean {
    return !!this.base && !this.inService;
  }

  private open(c: ShipClass, baseId: string | null): void {
    this.draft = c;
    this.baseId = baseId;
    this.selection = c.parts.length ? { kind: 'section', index: 0, slot: 'top' } : { kind: 'bow' };
  }

  pick(id: string): void {
    const found = this.saved.find((c) => c.id === id);
    if (found) this.open(found, found.id);
  }

  start(hullId: string): void {
    const hull = HULLS.find((h) => h.id === hullId) ?? HULLS[0]!;
    this.open(hull.build(), null);
  }

  save(): void {
    const name = this.draft.name.trim() || 'Unnamed class';
    const role = this.draft.role.trim() || 'Unassigned';
    if (this.base) {
      const next = { ...this.draft, id: this.base.id, name, role };
      this.saved = this.saved.map((c) => (c.id === next.id ? next : c));
      this.draft = next;
      return;
    }
    const next = { ...this.draft, id: `custom-${++this.counter}`, name, role };
    this.saved = [...this.saved, next];
    this.draft = next;
    this.baseId = next.id;
  }

  copy(): void {
    const next = { ...this.draft, id: `custom-${++this.counter}`, name: `${this.draft.name} copy` };
    this.saved = [...this.saved, next];
    this.open(next, next.id);
  }

  remove(): void {
    if (!this.canDelete) return;
    const id = this.baseId;
    const at = this.saved.findIndex((c) => c.id === id);
    this.saved = this.saved.filter((c) => c.id !== id);
    const next = this.saved[Math.min(at, this.saved.length - 1)];
    if (next) this.open(next, next.id);
    else this.start(HULLS[0]!.id);
  }

  rename(name: string): void {
    this.draft = { ...this.draft, name };
  }

  setRole(role: string): void {
    this.draft = { ...this.draft, role };
  }

  select(selection: Selection): void {
    this.selection = selection;
  }

  selectSlot(slot: Slot): void {
    if (this.selection.kind === 'section') this.selection = { ...this.selection, slot };
  }

  addCore(core: CoreKey, at?: number): void {
    const sel = this.selection;
    const index = at ?? (sel.kind === 'section' ? sel.index + 1 : this.draft.parts.length);
    const next = addSection(this.draft, core, index);
    if (next === this.draft) return;
    this.draft = next;
    this.selection = { kind: 'section', index: Math.min(index, next.parts.length - 1), slot: 'top' };
  }

  canAddSection(): boolean {
    return this.draft.parts.length < MAX_SECTIONS;
  }

  place(item: PaletteItem): void {
    if (item.kind === 'core') this.addCore(item.key as CoreKey);
    else if (item.kind === 'stern') this.setSternPart(item.key as 'engines' | 'big');
    else if (item.kind === 'bow') this.setBowPart(item.key as BowKey);
    else this.attach(item.key as string);
  }

  setSternPart(key: 'engines' | 'big'): void {
    this.draft = setStern(this.draft, key);
    this.selection = { kind: 'stern' };
  }

  setBowPart(key: BowKey): void {
    if (this.selection.kind === 'aft') this.draft = setAft(this.draft, key);
    else {
      this.draft = setBow(this.draft, key);
      this.selection = { kind: 'bow' };
    }
  }

  addAft(): void {
    this.draft = setAft(this.draft, 'dock');
    this.selection = { kind: 'aft' };
  }

  attach(key: string, at?: { index: number; slot: Slot }): void {
    const sel = this.selection;
    const target = at ?? (sel.kind === 'section' ? { index: sel.index, slot: sel.slot } : undefined);
    if (!target || !attachmentKey(key)) return;
    this.draft = setAttachment(this.draft, target.index, target.slot, defaultAttachment(attachmentKey(key)!));
    this.selection = { kind: 'section', index: target.index, slot: target.slot };
  }

  clearAttachment(slot: Slot): void {
    const sel = this.selection;
    if (sel.kind !== 'section') return;
    this.draft = setAttachment(this.draft, sel.index, slot, undefined);
  }

  layers(delta: number): void {
    const sel = this.selection;
    if (sel.kind !== 'section') return;
    const name = attachmentAt(this.draft, sel.index, sel.slot);
    if (!name || attachmentKey(name) !== 'cargo') return;
    this.draft = setCargoLayers(this.draft, sel.index, sel.slot, (Number(name.slice(5)) || 1) + delta);
  }

  engines(delta: number): void {
    this.draft = setEngines(this.draft, (this.draft.stern?.[1] ?? 2) + delta);
  }

  removeSelected(): void {
    const sel = this.selection;
    if (sel.kind === 'section') {
      this.draft = removeSection(this.draft, sel.index);
      const index = Math.min(sel.index, this.draft.parts.length - 1);
      this.selection = index >= 0 ? { kind: 'section', index, slot: sel.slot } : { kind: 'bow' };
    } else if (sel.kind === 'stern') this.draft = clearStern(this.draft);
    else if (sel.kind === 'aft') this.draft = clearAft(this.draft);
    else this.draft = clearBow(this.draft);
    if (sel.kind !== 'section') {
      this.selection = this.draft.parts.length ? { kind: 'section', index: 0, slot: 'top' } : { kind: 'bow' };
    }
  }

  shift(delta: number): void {
    const sel = this.selection;
    if (sel.kind === 'section') this.moveTo(sel.index, sel.index + delta);
  }

  moveTo(from: number, to: number): void {
    const next = moveSection(this.draft, from, to);
    if (next === this.draft) return;
    this.draft = next;
    const sel = this.selection;
    this.selection = { kind: 'section', index: to, slot: sel.kind === 'section' ? sel.slot : 'top' };
  }
}

export const designer = new Designer();

let applied = false;

export function applyClassParams(params: URLSearchParams): void {
  if (applied) return;
  applied = true;
  const hull = params.get('new');
  const id = params.get('cls');
  if (hull) designer.start(hull);
  else if (id) designer.pick(id);
}
