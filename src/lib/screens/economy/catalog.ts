import { SPECS } from '#lib/gfx/ships/specs.ts';
import type { ComponentId, GoodId, InstallationId, ItemId, MineralId, YardKind } from '#lib/game/types.ts';

export type Sector = 'industry' | 'mining' | 'research' | 'shipyards' | 'services';

export const SECTORS: readonly { id: Sector; name: string }[] = [
  { id: 'industry', name: 'Industry' },
  { id: 'mining', name: 'Mining' },
  { id: 'research', name: 'Research' },
  { id: 'shipyards', name: 'Shipyards' },
  { id: 'services', name: 'Services' }
];

export const MINERALS: readonly { id: MineralId; name: string }[] = [
  { id: 'iron', name: 'Iron' },
  { id: 'titanium', name: 'Titanium' },
  { id: 'copper', name: 'Copper' },
  { id: 'uranium', name: 'Uranium' },
  { id: 'ice', name: 'Ice' }
];

export const mineralName = (id: MineralId | 'fuel'): string =>
  id === 'fuel' ? 'Fuel' : (MINERALS.find((m) => m.id === id)?.name ?? id);

export interface ItemDef {
  id: ItemId;
  name: string;
  plural: string;
  kind: 'installation' | 'component';
  sector: Sector;
  bp: number;
  workers: number;
  minerals: Partial<Record<MineralId, number>>;
}

export const ITEMS: readonly ItemDef[] = [
  {
    id: 'mine',
    name: 'Mine',
    plural: 'mines',
    kind: 'installation',
    sector: 'mining',
    bp: 40,
    workers: 2_500,
    minerals: { iron: 30, copper: 10 }
  },
  {
    id: 'factory',
    name: 'Factory',
    plural: 'factories',
    kind: 'installation',
    sector: 'industry',
    bp: 80,
    workers: 3_000,
    minerals: { iron: 60, titanium: 20, copper: 20 }
  },
  {
    id: 'refinery',
    name: 'Fuel refinery',
    plural: 'fuel refineries',
    kind: 'installation',
    sector: 'industry',
    bp: 100,
    workers: 3_000,
    minerals: { iron: 50, titanium: 30, copper: 20 }
  },
  {
    id: 'lab',
    name: 'Research lab',
    plural: 'research labs',
    kind: 'installation',
    sector: 'research',
    bp: 240,
    workers: 4_000,
    minerals: { iron: 80, titanium: 80, copper: 120 }
  },
  {
    id: 'dome',
    name: 'Habitat dome',
    plural: 'habitat domes',
    kind: 'installation',
    sector: 'services',
    bp: 60,
    workers: 500,
    minerals: { iron: 80, titanium: 10 }
  },
  {
    id: 'spaceport',
    name: 'Spaceport',
    plural: 'spaceports',
    kind: 'installation',
    sector: 'services',
    bp: 400,
    workers: 6_000,
    minerals: { iron: 400, titanium: 200, copper: 100 }
  },
  {
    id: 'exchange',
    name: 'Exchange',
    plural: 'exchanges',
    kind: 'installation',
    sector: 'services',
    bp: 300,
    workers: 5_000,
    minerals: { iron: 100, titanium: 50, copper: 150 }
  },
  {
    id: 'cargo-container',
    name: 'Cargo containers',
    plural: 'cargo containers',
    kind: 'component',
    sector: 'industry',
    bp: 6,
    workers: 0,
    minerals: { iron: 8 }
  },
  {
    id: 'sensor-array',
    name: 'Sensor array parts',
    plural: 'sensor array parts',
    kind: 'component',
    sector: 'industry',
    bp: 30,
    workers: 0,
    minerals: { titanium: 8, copper: 10 }
  },
  {
    id: 'hull-plating',
    name: 'Hull plating',
    plural: 'hull plating',
    kind: 'component',
    sector: 'industry',
    bp: 20,
    workers: 0,
    minerals: { iron: 30, titanium: 20 }
  },
  {
    id: 'drive-coil',
    name: 'Drive coils',
    plural: 'drive coils',
    kind: 'component',
    sector: 'industry',
    bp: 50,
    workers: 0,
    minerals: { titanium: 10, copper: 40, uranium: 2 }
  },
  {
    id: 'fuel-tank',
    name: 'Fuel tank modules',
    plural: 'fuel tank modules',
    kind: 'component',
    sector: 'industry',
    bp: 14,
    workers: 0,
    minerals: { iron: 16, titanium: 4 }
  }
];

export function item(id: ItemId): ItemDef {
  const def = ITEMS.find((i) => i.id === id);
  if (!def) throw new Error(`no item ${id}`);
  return def;
}

export const INSTALLATIONS = ITEMS.filter((i) => i.kind === 'installation') as readonly (ItemDef & {
  id: InstallationId;
})[];

export const COMPONENTS = ITEMS.filter((i) => i.kind === 'component') as readonly (ItemDef & {
  id: ComponentId;
})[];

export const GOODS: readonly { id: GoodId; name: string; price: number }[] = [
  { id: 'food', name: 'Foodstuffs', price: 12 },
  { id: 'consumer', name: 'Consumer goods', price: 20 },
  { id: 'parts', name: 'Machine parts', price: 30 },
  { id: 'medical', name: 'Medical supplies', price: 45 },
  { id: 'luxury', name: 'Luxuries', price: 60 }
];

export interface ShipClass {
  id: string;
  name: string;
  role: string;
  tons: number;
  bp: number;
  kind: YardKind;
}

const SHIP_BUILD: Readonly<Record<string, Pick<ShipClass, 'tons' | 'bp' | 'kind'>>> = {
  pathfinder: { tons: 3_000, bp: 600, kind: 'commercial' },
  atlas: { tons: 40_000, bp: 1_200, kind: 'commercial' },
  mule: { tons: 20_000, bp: 800, kind: 'commercial' },
  bastion: { tons: 18_000, bp: 3_600, kind: 'naval' },
  lancer: { tons: 6_000, bp: 1_500, kind: 'naval' },
  pike: { tons: 8_000, bp: 1_900, kind: 'naval' },
  ark: { tons: 30_000, bp: 2_000, kind: 'commercial' },
  lighthouse: { tons: 25_000, bp: 1_400, kind: 'commercial' }
};

export const SHIP_CLASSES: readonly ShipClass[] = SPECS.flatMap((s) => {
  const build = SHIP_BUILD[s.id];
  return build ? [{ id: s.id, name: s.name ?? s.id, role: s.role ?? '', ...build }] : [];
});

export function shipClass(id: string): ShipClass {
  const cls = SHIP_CLASSES.find((c) => c.id === id);
  if (!cls) throw new Error(`no ship class ${id}`);
  return cls;
}
