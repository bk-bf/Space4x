import { MAX_SECTIONS } from '#lib/game/design.ts';
import type { BowKey, CoreKey, Section, ShipSpec, SternKey } from '#lib/gfx/ships/specs.ts';
import { component, isEngine } from './catalogue.ts';
import { ROLE_NAMES, type ShipDesign } from './types.ts';

export const scaled = (count: number, cap: number): number =>
  Math.min(cap, 1 + Math.floor(Math.log2(Math.max(1, count))));

const BIG_ENGINES = 4;
const WIDE_DRIVES = new Set(['ntr_engine', 'fusion_drive']);

interface Plan {
  sections: { core: CoreKey; top?: string; bottom?: string }[];
}

function stern(design: ShipDesign): ShipSpec['stern'] {
  const engines = design.parts.flatMap((p) => {
    const c = component(p.component);
    return c && isEngine(c) ? [{ id: c.id, count: p.count }] : [];
  });
  const main = engines.some((e) => e.id !== 'rcs_thruster')
    ? engines.filter((e) => e.id !== 'rcs_thruster')
    : engines;
  const count = main.reduce((total, e) => total + e.count, 0);
  if (count <= 0) return undefined;
  const key: SternKey = count >= BIG_ENGINES || main.some((e) => WIDE_DRIVES.has(e.id)) ? 'big' : 'engines';
  return key === 'big' ? ['big'] : ['engines', Math.min(3, count)];
}

function bow(design: ShipDesign): BowKey | undefined {
  const has = (id: string) => design.parts.some((p) => p.component === id && p.count > 0);
  if (has('crew_capsule')) return 'bridge';
  if (has('docking_adapter')) return 'dock';
  if (has('heat_shield')) return 'prow';
  if (has('cargo_bay')) return 'blunt';
  return undefined;
}

export function designSpec(design: ShipDesign): ShipSpec {
  const count = (id: string) => design.parts.find((p) => p.component === id)?.count ?? 0;
  const plan: Plan = { sections: [] };
  const section = (core: CoreKey, times: number, top?: string, bottom?: string) => {
    for (let i = 0; i < times; i++)
      plan.sections.push({ core, ...(top ? { top } : {}), ...(bottom ? { bottom } : {}) });
  };

  if (count('fission_reactor_ship')) section('reactor', scaled(count('fission_reactor_ship'), 2));
  if (count('propellant_tank')) section('tank', scaled(count('propellant_tank'), 4));
  if (count('copv')) section('fuel', scaled(count('copv'), 2));
  if (count('structure_truss')) section('truss', scaled(count('structure_truss'), 3));
  if (count('cargo_bay')) section('hull', scaled(count('cargo_bay'), 3), 'cargo2', 'cargo2');
  if (count('habitat_module')) section('crew', scaled(count('habitat_module'), 3));
  if (count('inflatable_habitat')) section('ring', scaled(count('inflatable_habitat'), 2));
  if (count('life_support_unit')) section('hull', 1);
  if (count('radiation_shield')) section('armor', scaled(count('radiation_shield'), 2));
  if (count('heat_shield') && count('crew_capsule')) section('armor', 1);

  const attachments: string[] = [
    ...Array<string>(Math.min(4, Math.ceil(count('radiator') / 2))).fill('radiator'),
    ...Array<string>(Math.min(4, Math.ceil(count('solar_array') / 2))).fill('solar'),
    ...Array<string>(Math.min(2, count('rcs_thruster'))).fill('pod'),
    ...Array<string>(count('landing_legs') ? 2 : 0).fill('fin'),
    ...Array<string>(count('avionics') ? 1 : 0).fill('antenna'),
    ...Array<string>(count('sampling_arm') ? 1 : 0).fill('dish')
  ];
  if (attachments.length && !plan.sections.length) section('hull', 1);

  const free = plan.sections.flatMap((s, i) => (s.top ? [] : [i]));
  const slots = free.flatMap((i) => [
    { i, slot: 'top' as const },
    { i, slot: 'bottom' as const }
  ]);
  attachments.forEach((name, n) => {
    const at = slots[n];
    const target = at && plan.sections[at.i];
    if (!at || !target) return;
    if (at.slot === 'top') target.top = name;
    else target.bottom = name;
  });

  const parts: Section[] = plan.sections.slice(0, MAX_SECTIONS).map((s) => {
    if (s.bottom && !s.top) return [s.core, s.bottom];
    return s.bottom ? [s.core, s.top, s.bottom] : s.top ? [s.core, s.top] : [s.core];
  });

  const sternPart = stern(design);
  const bowPart = bow(design);
  return {
    id: design.id,
    name: design.name,
    role: ROLE_NAMES[design.role],
    livery: 'civ',
    ...(sternPart ? { stern: sternPart } : {}),
    ...(bowPart ? { bow: bowPart } : {}),
    parts
  };
}
