export const CATEGORY_NAMES: Record<string, string> = {
  bio_life_support: 'Life support',
  carbon_materials: 'Carbon',
  ceramic: 'Ceramics and regolith',
  computation: 'Computation',
  exotic: 'Exotic',
  fertiliser: 'Fertiliser',
  food: 'Food',
  metal: 'Metals and alloys',
  nuclear: 'Nuclear',
  polymer: 'Polymers',
  propellant: 'Fuel',
  semiconductor_electronics: 'Semiconductors and electronics',
  volatile: 'Volatiles and gases'
};

export const CATEGORY_ORDER = [
  'metal',
  'volatile',
  'propellant',
  'ceramic',
  'semiconductor_electronics',
  'carbon_materials',
  'polymer',
  'nuclear',
  'food',
  'fertiliser',
  'bio_life_support',
  'computation',
  'exotic'
] as const;

export const CATEGORY_EXAMPLES: Record<string, string> = {
  metal: 'iron',
  nuclear: 'uranium',
  semiconductor_electronics: 'electronic_silicon',
  ceramic: 'alumina',
  volatile: 'oxygen',
  propellant: 'lox',
  polymer: 'polyimide',
  carbon_materials: 'carbon_fibre',
  food: 'wheat',
  fertiliser: 'urea',
  bio_life_support: 'spirulina',
  computation: 'compute',
  exotic: 'exotic_matter'
};

export const BUILDING_KIND_NAMES: Record<string, string> = {
  extraction: 'Extraction',
  processing: 'Processing',
  power: 'Power',
  electronics: 'Electronics',
  habitat: 'Habitat and food',
  infrastructure: 'Infrastructure',
  nuclear: 'Nuclear',
  special: 'Special'
};

export const COMPONENT_KIND_NAMES: Record<string, string> = {
  propulsion: 'Propulsion',
  structure: 'Structure',
  power: 'Power',
  thermal: 'Thermal',
  habitat: 'Habitat',
  protection: 'Protection',
  electronics: 'Electronics'
};

export const BUILDING_KIND_DESCRIPTIONS: Record<string, string> = {
  extraction: 'Takes material out of the ground.',
  processing: 'Turns raw materials into industrial ones.',
  power: 'Makes electricity.',
  electronics: 'Builds chips, cells and electronics.',
  habitat: 'Feeds and houses people.',
  infrastructure: 'Launch, yards and depots.',
  nuclear: 'Nuclear fuel and reactors.',
  special: 'Late-game exotic industry.'
};

export const COMPONENT_KIND_DESCRIPTIONS: Record<string, string> = {
  structure: 'Hull frame and tanks.',
  propulsion: 'Moves the ship.',
  power: "Makes the ship's electricity.",
  thermal: 'Gets rid of heat.',
  habitat: 'Keeps a crew alive.',
  protection: 'Shields against radiation and debris.',
  electronics: 'Computing and control.'
};

const sentence = (id: string) => {
  const t = id.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const categoryName = (category: string): string => CATEGORY_NAMES[category] ?? sentence(category);
export const buildingKindName = (kind: string): string => BUILDING_KIND_NAMES[kind] ?? sentence(kind);
export const componentKindName = (kind: string): string => COMPONENT_KIND_NAMES[kind] ?? sentence(kind);
