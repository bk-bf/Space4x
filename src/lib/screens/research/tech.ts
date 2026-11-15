export const FIELDS = [
  { id: 'propulsion', label: 'Propulsion' },
  { id: 'power', label: 'Power' },
  { id: 'sensors', label: 'Sensors' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'defence', label: 'Defence' },
  { id: 'industry', label: 'Industry' },
  { id: 'biology', label: 'Biology' },
  { id: 'logistics', label: 'Logistics' }
] as const;

export type FieldId = (typeof FIELDS)[number]['id'];

export const isFieldId = (id: string | null | undefined): id is FieldId => FIELDS.some((f) => f.id === id);

export const fieldLabel = (id: FieldId): string => FIELDS.find((f) => f.id === id)?.label ?? id;

export interface Tech {
  id: string;
  field: FieldId;
  name: string;
  col: number;
  row: number;
  cost: number;
  needs: readonly string[];
}

type Seed = readonly [id: string, name: string, col: number, row: number, cost: number, ...needs: string[]];

const field = (id: FieldId, seeds: readonly Seed[]): Tech[] =>
  seeds.map(([techId, name, col, row, cost, ...needs]) => ({
    id: techId,
    field: id,
    name,
    col,
    row,
    cost,
    needs
  }));

export const TECHS: readonly Tech[] = [
  ...field('propulsion', [
    ['chemical-rockets', 'Chemical rockets', 0, 1, 600],
    ['nuclear-thermal', 'Nuclear thermal', 1, 0, 2400, 'chemical-rockets'],
    ['solar-sail', 'Solar sail', 1, 2, 1800, 'chemical-rockets'],
    ['ion-drive', 'Ion drive', 2, 0, 6000, 'nuclear-thermal'],
    ['fusion-torch', 'Fusion torch', 2, 1, 8000, 'nuclear-thermal'],
    ['laser-sail', 'Laser sail', 2, 2, 5000, 'solar-sail'],
    ['plasma-drive', 'Plasma drive', 3, 0, 14000, 'ion-drive', 'fusion-torch'],
    ['antimatter', 'Antimatter', 3, 1, 20000, 'fusion-torch']
  ]),
  ...field('power', [
    ['fission-piles', 'Fission piles', 0, 1, 800],
    ['radiator-panels', 'Radiator panels', 1, 0, 1500, 'fission-piles'],
    ['solar-arrays', 'Solar arrays', 1, 2, 1600, 'fission-piles'],
    ['compact-reactor', 'Compact reactor', 2, 0, 5500, 'radiator-panels'],
    ['fusion-cells', 'Fusion cells', 2, 1, 9000, 'radiator-panels'],
    ['beamed-power', 'Beamed power', 2, 2, 4500, 'solar-arrays'],
    ['pinch-reactor', 'Pinch reactor', 3, 0, 12000, 'compact-reactor', 'fusion-cells'],
    ['ring-storage', 'Ring storage', 3, 1, 15000, 'fusion-cells']
  ]),
  ...field('sensors', [
    ['optical-arrays', 'Optical arrays', 0, 1, 700],
    ['radio-telescopes', 'Radio telescopes', 1, 0, 1400, 'optical-arrays'],
    ['heat-trackers', 'Heat trackers', 1, 2, 1900, 'optical-arrays'],
    ['deep-space-sensors', 'Deep-space sensors', 2, 0, 4800, 'radio-telescopes'],
    ['phased-radar', 'Phased radar', 2, 1, 3500, 'radio-telescopes'],
    ['multi-band-scanners', 'Multi-band scanners', 2, 2, 5600, 'heat-trackers'],
    ['wide-array', 'Wide array', 3, 0, 9000, 'deep-space-sensors', 'phased-radar'],
    ['signature-analysis', 'Signature analysis', 3, 1, 11000, 'phased-radar', 'multi-band-scanners']
  ]),
  ...field('weapons', [
    ['slug-turrets', 'Slug turrets', 0, 1, 600],
    ['beam-emitters', 'Beam emitters', 1, 0, 1800, 'slug-turrets'],
    ['guided-rockets', 'Guided rockets', 1, 2, 1700, 'slug-turrets'],
    ['focused-beams', 'Focused beams', 2, 0, 5000, 'beam-emitters'],
    ['salvo-racks', 'Salvo racks', 2, 1, 4200, 'guided-rockets'],
    ['seeker-heads', 'Seeker heads', 2, 2, 4800, 'guided-rockets'],
    ['pulse-battery', 'Pulse battery', 3, 0, 10000, 'focused-beams', 'salvo-racks'],
    ['deep-strike-warheads', 'Deep-strike warheads', 3, 1, 12000, 'salvo-racks', 'seeker-heads']
  ]),
  ...field('defence', [
    ['steel-plating', 'Steel plating', 0, 1, 700],
    ['composite-armour', 'Composite armour', 1, 0, 3200, 'steel-plating'],
    ['damage-control', 'Damage control', 1, 2, 1800, 'steel-plating'],
    ['ablative-coats', 'Ablative coats', 2, 0, 6000, 'composite-armour'],
    ['field-screens', 'Field screens', 2, 1, 7500, 'damage-control'],
    ['crew-shelters', 'Crew shelters', 2, 2, 3000, 'damage-control'],
    ['layered-hulls', 'Layered hulls', 3, 0, 11000, 'ablative-coats', 'field-screens'],
    ['point-defence', 'Point defence', 3, 1, 9500, 'field-screens']
  ]),
  ...field('industry', [
    ['ore-processing', 'Ore processing', 0, 1, 800],
    ['fuel-refining', 'Fuel refining', 1, 0, 1800, 'ore-processing'],
    ['assemblers', 'Automated assemblers', 1, 2, 2000, 'ore-processing'],
    ['fuel-refining-ii', 'Fuel refining II', 2, 0, 3800, 'fuel-refining'],
    ['orbital-smelting', 'Orbital smelting', 2, 1, 6000, 'fuel-refining'],
    ['modular-yards', 'Modular yards', 2, 2, 5200, 'assemblers'],
    ['deep-mining', 'Deep mining', 3, 0, 9000, 'fuel-refining-ii', 'orbital-smelting'],
    ['yard-automation', 'Yard automation', 3, 1, 10500, 'orbital-smelting', 'modular-yards']
  ]),
  ...field('biology', [
    ['closed-loop-air', 'Closed-loop air', 0, 1, 700],
    ['hydroponics', 'Hydroponics', 1, 0, 1400, 'closed-loop-air'],
    ['field-medicine', 'Field medicine', 1, 2, 1500, 'closed-loop-air'],
    ['hardy-crops', 'Hardy crops', 2, 0, 4200, 'hydroponics'],
    ['cold-sleep', 'Cold sleep', 2, 1, 6500, 'field-medicine'],
    ['soil-engineering', 'Soil engineering', 2, 2, 5000, 'field-medicine'],
    ['ecosystem-design', 'Ecosystem design', 3, 0, 11000, 'hardy-crops', 'soil-engineering'],
    ['longevity-therapy', 'Longevity therapy', 3, 1, 13000, 'cold-sleep', 'soil-engineering']
  ]),
  ...field('logistics', [
    ['cargo-handling', 'Cargo handling', 0, 1, 700],
    ['standard-containers', 'Standard containers', 1, 0, 1300, 'cargo-handling'],
    ['fuel-depots', 'Fuel depots', 1, 2, 1600, 'cargo-handling'],
    ['bulk-haulers', 'Bulk haulers', 2, 0, 4000, 'standard-containers'],
    ['orbital-cranes', 'Orbital cranes', 2, 1, 5000, 'standard-containers'],
    ['supply-chains', 'Supply chains', 2, 2, 4400, 'fuel-depots'],
    ['convoy-routing', 'Convoy routing', 3, 0, 8500, 'bulk-haulers', 'supply-chains'],
    ['automated-depots', 'Automated depots', 3, 1, 9800, 'orbital-cranes', 'supply-chains']
  ])
];

export const COLS = 4;
export const ROWS = 3;

export const techById = (id: string): Tech | undefined => TECHS.find((t) => t.id === id);

export const techsOf = (id: FieldId): Tech[] => TECHS.filter((t) => t.field === id);
