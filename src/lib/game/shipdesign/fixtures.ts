import { newDesign, setCount, type Role, type ShipDesign, type Yard } from './index.ts';

export function build(
  parts: readonly (readonly [string, number])[],
  options: { role?: Role; yard?: Yard; id?: string } = {}
): ShipDesign {
  let design: ShipDesign = {
    ...newDesign(options.id ?? 'test', 'Test'),
    role: options.role ?? 'transfer',
    yard: options.yard ?? 'orbital_shipyard'
  };
  for (const [id, n] of parts) design = setCount(design, id, n);
  return design;
}

export const upperStage = [
  ['chemical_engine_hydrolox', 1],
  ['propellant_tank', 4],
  ['structure_truss', 1],
  ['avionics', 1],
  ['battery_pack', 1],
  ['mli_blanket', 1]
] as const;

export const crewedVehicle = [
  ['chemical_engine_hydrolox', 1],
  ['propellant_tank', 2],
  ['crew_capsule', 1],
  ['life_support_unit', 1],
  ['heat_shield', 1],
  ['solar_array', 1],
  ['radiator', 1],
  ['mli_blanket', 1],
  ['docking_adapter', 1]
] as const;
