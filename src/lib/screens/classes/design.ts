import {
  ATT,
  BOW,
  CORE,
  PNAME,
  PW,
  STERN,
  type AttachmentKey,
  type BowKey,
  type CoreKey,
  type PartKey,
  type SternKey
} from '#lib/gfx/ships/parts.ts';
import type { Section, ShipSpec } from '#lib/gfx/ships/specs.ts';

export type Slot = 'top' | 'bottom';

export type Target = { kind: 'stern' | 'aft' | 'bow' } | { kind: 'section'; index: number };

export type Selection = { kind: 'stern' | 'aft' | 'bow' } | { kind: 'section'; index: number; slot: Slot };

export interface ShipClass extends ShipSpec {
  readonly name: string;
  readonly role: string;
}

export type PaletteKind = 'core' | 'stern' | 'bow' | 'att';

export interface PaletteItem {
  kind: PaletteKind;
  key: PartKey;
  name: string;
}

export interface LaidPart {
  target: Target;
  key: PartKey;
  name: string;
  x: number;
  w: number;
  hh: number;
}

export interface Weapons {
  turrets: number;
  launchers: number;
  pods: number;
  spinal: number;
  hangars: number;
}

export interface DesignStats {
  mass: number;
  length: number;
  sections: number;
  hardpoints: number;
  crew: number;
  thrust: number;
  speed: number;
  fuel: number;
  armour: number;
  cargo: number;
  weapons: Weapons;
}

interface PartStat {
  mass: number;
  crew: number;
  fuel?: number;
  armour?: number;
}

export const MAX_SECTIONS = 14;
export const MAX_ENGINES = 3;
export const MAX_CARGO_LAYERS = 3;
export const METRES_PER_PIXEL = 4;

const ENGINE_BASE_MASS = 60;
const ENGINE_MASS = 90;
const ENGINE_CREW = 2;
const ENGINE_THRUST = 830;
const CARGO_TONNES_PER_LAYER = 800;

const CORE_STATS: Record<CoreKey, PartStat> = {
  hull: { mass: 120, crew: 6 },
  crew: { mass: 150, crew: 40 },
  reactor: { mass: 180, crew: 10 },
  fuel: { mass: 140, crew: 4, fuel: 600 },
  armor: { mass: 380, crew: 12, armour: 40 },
  truss: { mass: 50, crew: 2 },
  tank: { mass: 160, crew: 4, fuel: 1400 },
  ring: { mass: 210, crew: 30 },
  hangar: { mass: 520, crew: 60 }
};

const BOW_STATS: Record<BowKey, PartStat> = {
  bridge: { mass: 110, crew: 20 },
  blunt: { mass: 40, crew: 4 },
  gun: { mass: 360, crew: 14 },
  prow: { mass: 300, crew: 10, armour: 20 },
  dock: { mass: 80, crew: 6 }
};

const BIG_STERN: PartStat = { mass: 420, crew: 14 };
const BIG_THRUST = 2600;

const ATT_STATS: Record<AttachmentKey, PartStat> = {
  turret: { mass: 40, crew: 6 },
  launcher: { mass: 60, crew: 8 },
  dish: { mass: 15, crew: 3 },
  antenna: { mass: 5, crew: 1 },
  tower: { mass: 30, crew: 10 },
  cargo: { mass: 70, crew: 1 },
  radiator: { mass: 25, crew: 0 },
  solar: { mass: 20, crew: 0 },
  pod: { mass: 45, crew: 4 },
  fin: { mass: 12, crew: 0 }
};

const STERN_WIDTH: Record<SternKey, number> = { engines: 8, big: 12 };

const CORE_HALF_HEIGHT: Record<CoreKey, number> = {
  hull: 3,
  crew: 3,
  reactor: 3,
  fuel: 4,
  armor: 5,
  truss: 2,
  tank: 6,
  ring: 12,
  hangar: 5
};

const BOW_HALF_HEIGHT: Record<BowKey, number> = { bridge: 3, blunt: 3, gun: 3, prow: 5, dock: 3 };

const ATTACHMENT = /^(\D+)(\d*)$/;

export const keysOf = <T extends object>(o: T): (keyof T)[] => Object.keys(o) as (keyof T)[];

export const PALETTE: readonly PaletteItem[] = [
  ...keysOf(CORE).map((key) => ({ kind: 'core' as const, key, name: PNAME[key] })),
  ...keysOf(STERN).map((key) => ({ kind: 'stern' as const, key, name: PNAME[key] })),
  ...keysOf(BOW).map((key) => ({ kind: 'bow' as const, key, name: PNAME[key] })),
  ...keysOf(ATT).map((key) => ({ kind: 'att' as const, key, name: PNAME[key] }))
];

export const paletteId = (item: PaletteItem): string => `${item.kind}:${item.key}`;

export function attachmentKey(name: string): AttachmentKey | undefined {
  const m = ATTACHMENT.exec(name);
  const key = m?.[1];
  return key && key in ATT ? (key as AttachmentKey) : undefined;
}

export function cargoLayers(name: string): number {
  return Number(ATTACHMENT.exec(name)?.[2]) || 1;
}

export function attachmentName(name: string): string {
  const key = attachmentKey(name);
  if (!key) return name;
  return key === 'cargo' ? `${PNAME[key]} x${cargoLayers(name)}` : PNAME[key];
}

export function defaultAttachment(key: AttachmentKey): string {
  return key === 'cargo' ? 'cargo2' : key;
}

export function asClass(sp: ShipSpec, id = sp.id): ShipClass {
  return { ...sp, id, name: sp.name ?? 'Unnamed', role: sp.role ?? 'Unassigned' };
}

const section = (core: CoreKey, top?: string, bottom?: string): Section =>
  bottom ? [core, top, bottom] : top ? [core, top] : [core];

const withParts = (sp: ShipClass, parts: readonly Section[]): ShipClass => ({ ...sp, parts });

export function addSection(sp: ShipClass, core: CoreKey, at = sp.parts.length): ShipClass {
  if (sp.parts.length >= MAX_SECTIONS) return sp;
  const i = Math.max(0, Math.min(at, sp.parts.length));
  return withParts(sp, [...sp.parts.slice(0, i), section(core), ...sp.parts.slice(i)]);
}

export function removeSection(sp: ShipClass, index: number): ShipClass {
  if (index < 0 || index >= sp.parts.length) return sp;
  return withParts(
    sp,
    sp.parts.filter((_, i) => i !== index)
  );
}

export function moveSection(sp: ShipClass, from: number, to: number): ShipClass {
  const n = sp.parts.length;
  if (from < 0 || from >= n || to < 0 || to >= n || from === to) return sp;
  const rest = sp.parts.filter((_, i) => i !== from);
  return withParts(sp, [...rest.slice(0, to), sp.parts[from]!, ...rest.slice(to)]);
}

export function setAttachment(sp: ShipClass, index: number, slot: Slot, name: string | undefined): ShipClass {
  const current = sp.parts[index];
  if (!current) return sp;
  const [core, top, bottom] = current;
  return withParts(
    sp,
    sp.parts.map((s, i) =>
      i !== index ? s : slot === 'top' ? section(core, name, bottom) : section(core, top, name)
    )
  );
}

export const attachmentAt = (sp: ShipSpec, index: number, slot: Slot): string | undefined =>
  sp.parts[index]?.[slot === 'top' ? 1 : 2];

export function setCargoLayers(sp: ShipClass, index: number, slot: Slot, layers: number): ShipClass {
  const name = attachmentAt(sp, index, slot);
  if (!name || attachmentKey(name) !== 'cargo') return sp;
  const n = Math.max(1, Math.min(MAX_CARGO_LAYERS, layers));
  return setAttachment(sp, index, slot, `cargo${n}`);
}

export function setStern(sp: ShipClass, key: SternKey): ShipClass {
  if (key === 'big') return { ...sp, stern: ['big'] };
  return { ...sp, stern: ['engines', sp.stern?.[0] === 'engines' ? (sp.stern[1] ?? 2) : 2] };
}

export function setEngines(sp: ShipClass, count: number): ShipClass {
  if (sp.stern?.[0] !== 'engines') return sp;
  return { ...sp, stern: ['engines', Math.max(1, Math.min(MAX_ENGINES, count))] };
}

export function clearStern(sp: ShipClass): ShipClass {
  const { stern: _stern, ...rest } = sp;
  return rest;
}

export function setBow(sp: ShipClass, key: BowKey): ShipClass {
  return { ...sp, bow: key };
}

export function clearBow(sp: ShipClass): ShipClass {
  const { bow: _bow, ...rest } = sp;
  return rest;
}

export function setAft(sp: ShipClass, key: BowKey): ShipClass {
  return { ...sp, aft: key };
}

export function clearAft(sp: ShipClass): ShipClass {
  const { aft: _aft, ...rest } = sp;
  return rest;
}

export function layout(sp: ShipSpec): LaidPart[] {
  const out: LaidPart[] = [];
  let x = 0;
  const add = (target: Target, key: PartKey, w: number, hh: number) => {
    out.push({ target, key, name: PNAME[key], x, w, hh });
    x += w;
  };
  if (sp.stern) {
    const [key, n = 2] = sp.stern;
    add({ kind: 'stern' }, key, STERN_WIDTH[key], key === 'big' ? 4 : 2 + n);
  }
  if (sp.aft) add({ kind: 'aft' }, sp.aft, PW[sp.aft], BOW_HALF_HEIGHT[sp.aft]);
  sp.parts.forEach(([core], index) =>
    add({ kind: 'section', index }, core, PW[core], CORE_HALF_HEIGHT[core])
  );
  if (sp.bow) add({ kind: 'bow' }, sp.bow, PW[sp.bow], BOW_HALF_HEIGHT[sp.bow]);
  return out;
}

export const lengthOf = (sp: ShipSpec): number => {
  const parts = layout(sp);
  const last = parts[parts.length - 1];
  return last ? (last.x + last.w) * METRES_PER_PIXEL : 0;
};

function addStat(total: { mass: number; crew: number; fuel: number; armour: number }, s: PartStat, n = 1) {
  total.mass += s.mass * n;
  total.crew += s.crew * n;
  total.fuel += (s.fuel ?? 0) * n;
  total.armour += (s.armour ?? 0) * n;
}

export function designStats(sp: ShipSpec): DesignStats {
  const total = { mass: 0, crew: 0, fuel: 0, armour: 0 };
  const weapons: Weapons = { turrets: 0, launchers: 0, pods: 0, spinal: 0, hangars: 0 };
  let thrust = 0;
  let hardpoints = 0;
  let cargo = 0;
  let sections = sp.parts.length;
  if (sp.stern) {
    sections++;
    const [key, n = 2] = sp.stern;
    if (key === 'big') {
      addStat(total, BIG_STERN);
      thrust = BIG_THRUST;
    } else {
      addStat(total, { mass: ENGINE_BASE_MASS + ENGINE_MASS * n, crew: ENGINE_CREW * n });
      thrust = ENGINE_THRUST * n;
    }
  }
  for (const key of [sp.aft, sp.bow]) {
    if (!key) continue;
    sections++;
    addStat(total, BOW_STATS[key]);
    if (key === 'gun') weapons.spinal++;
  }
  for (const [core, ...slots] of sp.parts) {
    addStat(total, CORE_STATS[core]);
    if (core === 'hangar') weapons.hangars++;
    for (const name of slots) {
      const key = name ? attachmentKey(name) : undefined;
      if (!name || !key) continue;
      hardpoints++;
      const layers = key === 'cargo' ? cargoLayers(name) : 1;
      addStat(total, ATT_STATS[key], layers);
      if (key === 'cargo') cargo += layers * CARGO_TONNES_PER_LAYER;
      if (key === 'turret') weapons.turrets++;
      if (key === 'launcher') weapons.launchers++;
      if (key === 'pod') weapons.pods++;
    }
  }
  return {
    ...total,
    length: lengthOf(sp),
    sections,
    hardpoints,
    thrust,
    speed: total.mass > 0 ? Math.round((thrust * 1000) / total.mass) : 0,
    cargo,
    weapons
  };
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function weaponSummary(w: Weapons): string {
  const parts = [
    w.turrets && plural(w.turrets, 'turret'),
    w.launchers && plural(w.launchers, 'launcher'),
    w.pods && plural(w.pods, 'pod'),
    w.spinal && plural(w.spinal, 'spinal gun'),
    w.hangars && plural(w.hangars, 'hangar')
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'None';
}

export interface Hull {
  id: string;
  name: string;
  build(): ShipClass;
}

const blank = (id: string, spec: Omit<ShipSpec, 'id'>): ShipClass => ({
  id,
  name: 'New class',
  role: 'Unassigned',
  ...spec
});

export const HULLS: readonly Hull[] = [
  {
    id: 'frame',
    name: 'Light frame',
    build: () => blank('draft', { stern: ['engines', 1], bow: 'bridge', parts: [['reactor'], ['crew']] })
  },
  {
    id: 'hauler',
    name: 'Hauler frame',
    build: () => blank('draft', { stern: ['big'], bow: 'blunt', parts: [['reactor'], ['truss'], ['crew']] })
  },
  {
    id: 'platform',
    name: 'Platform frame',
    build: () => blank('draft', { aft: 'dock', bow: 'dock', parts: [['truss'], ['crew'], ['truss']] })
  }
];

export const sameDesign = (a: ShipSpec, b: ShipSpec): boolean => JSON.stringify(a) === JSON.stringify(b);

export function insertIndex(parts: readonly LaidPart[], x: number): number {
  let n = 0;
  for (const p of parts) if (p.target.kind === 'section' && p.x + p.w / 2 < x) n++;
  return n;
}

export const targetLabel = (sp: ShipSpec, sel: Selection): string => {
  if (sel.kind === 'section') {
    const core = sp.parts[sel.index]?.[0];
    return core ? `Section ${sel.index + 1} of ${sp.parts.length}: ${PNAME[core]}` : 'No section';
  }
  const key = sel.kind === 'stern' ? sp.stern?.[0] : sel.kind === 'aft' ? sp.aft : sp.bow;
  const where = sel.kind === 'stern' ? 'Stern' : sel.kind === 'aft' ? 'Aft cap' : 'Bow';
  return key ? `${where}: ${PNAME[key]}` : where;
};
