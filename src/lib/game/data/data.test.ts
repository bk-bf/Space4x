import { describe, expect, it } from 'vitest';
import {
  ASTEROID_BODY,
  GRADE_MAX,
  GRADE_MIN,
  WORLD_BODIES,
  asteroids,
  atmosphereOf,
  comets,
  moons,
  bodyTypeOf,
  buildings,
  dataFiles,
  depositGrade,
  environments,
  regions,
  regionsOf,
  reserves,
  material,
  materials,
  materialSites,
  boostOf,
  dependentsOf,
  missingPrerequisites,
  project,
  projectById,
  projects,
  reach,
  recipes,
  recipesProducing,
  robotParts,
  digClasses,
  shipComponents,
  subjects,
  tagOpen,
  tagsOf,
  unlockedAt,
  type Amounts,
  type Body,
  type Site
} from './index.ts';
import earth from './earth.json';

const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const TIERS = ['P', 'E', 'S'];
const BODIES: Body[] = [
  'earth',
  'moon',
  'mercury',
  'mars',
  'venus',
  'io',
  'titan',
  'icy-moon',
  'comet',
  'asteroid-c',
  'asteroid-s',
  'asteroid-m',
  'gas-giant',
  'ice-giant'
];
const SITES: Site[] = [...BODIES, 'orbit', 'jump-point'];
const HOWS = [
  'mined',
  'wells',
  'brine',
  'byproduct',
  'atmosphere',
  'ice',
  'regolith',
  'solar-wind',
  'liquid'
];
const known = new Set([0, ...projects.map((p) => p.number)]);
const num = (id: string) => projectById(id).number;

const materialIds = new Set(materials.map((m) => m.id));
const buildingIds = new Set(buildings.map((b) => b.id));
const componentIds = new Set(shipComponents.map((c) => c.id));
const unitOf = (id: string) => material(id).unit ?? 'kg';
const mass = (amounts: Amounts) => Object.values(amounts).reduce((a, b) => a + b, 0);
const massOnly = (r: { inputs: Amounts; outputs: Amounts }) =>
  [...Object.keys(r.inputs), ...Object.keys(r.outputs)].every((id) => unitOf(id) === 'kg');
const OPEN_AIR = new Set(['farmland']);
const unknown = (ids: string[], known: Set<string>) => ids.filter((id) => !known.has(id));

describe('food', () => {
  const foods = materials.filter((m) => m.category === 'food');

  it('gives every food an energy content with a source, or marks it estimated', () => {
    expect(foods.map((m) => m.id)).toEqual(expect.arrayContaining(['wheat', 'meat', 'food_ration']));
    for (const m of foods) {
      expect(m.kcalPerKg, m.id).toBeGreaterThan(50);
      expect(m.kcalPerKg, m.id).toBeLessThan(9000);
      expect(m.kcalSource, m.id).toMatch(/^https?:\/\//);
      expect(m.kcalBasis?.length, m.id).toBeGreaterThan(20);
    }
  });

  it('makes meat in a ranch from feed crops and water, at the published feed ratio, without creating mass', () => {
    const r = recipes.find((x) => x.id === 'ranch_meat')!;
    expect(r.building).toBe('ranch');
    expect(r.estimated).toBe(true);
    expect(r.source).toMatch(/^https?:\/\//);
    expect(Object.keys(r.outputs)).toEqual(['meat']);
    const feed = (r.inputs.wheat ?? 0) + (r.inputs.soybean ?? 0);
    expect(feed / (r.outputs.meat ?? 1)).toBeGreaterThanOrEqual(2.8);
    expect(feed / (r.outputs.meat ?? 1)).toBeLessThanOrEqual(3.2);
    expect(mass(r.outputs)).toBeLessThan(mass(r.inputs));
    expect(buildings.find((b) => b.id === 'ranch')?.where).toEqual(['earth']);
  });
});

describe('ids', () => {
  const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

  it('are unique within each kind', () => {
    expect(duplicates(materials.map((m) => m.id))).toEqual([]);
    expect(duplicates(recipes.map((r) => r.id))).toEqual([]);
    expect(duplicates(buildings.map((b) => b.id))).toEqual([]);
    expect(duplicates(shipComponents.map((c) => c.id))).toEqual([]);
    expect(duplicates(projects.map((p) => p.id))).toEqual([]);
  });

  it('never collide between materials, buildings, components and recipes', () => {
    const all = [...materials, ...buildings, ...shipComponents, ...recipes, ...robotParts].map((x) => x.id);
    expect(duplicates(all)).toEqual([]);
  });

  it('are snake_case everywhere', () => {
    const all = [...materials, ...recipes, ...buildings, ...shipComponents, ...projects, ...robotParts].map(
      (x) => x.id
    );
    expect(all.filter((id) => !SNAKE.test(id))).toEqual([]);
  });
});

describe('files', () => {
  it('keep every record in the file named for its category', () => {
    const wrong = dataFiles.materials.flatMap((f) =>
      f.items.filter((m) => f.name !== m.category && !f.name.startsWith(`${m.category}-`)).map((m) => m.id)
    );
    expect(wrong).toEqual([]);
  });

  it('stay under about 400 lines each', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const root = new URL('.', import.meta.url).pathname;
    const files = ['materials', 'recipes', 'buildings'].flatMap((dir) =>
      readdirSync(root + dir).map((f) => `${dir}/${f}`)
    );
    const long = files.filter((f) => readFileSync(root + f, 'utf8').split('\n').length > 420);
    expect(long).toEqual([]);
  });
});

describe("Earth's reserves", () => {
  const HOURS_A_YEAR = 8766;
  const mineKgAYear = (id: string) => (material(id).extractKgH ?? 1000) * HOURS_A_YEAR;
  const counts = new Map(
    earth.groups.filter((g) => g.process?.startsWith('extract:')).map((g) => [g.process!.slice(8), g.count])
  );

  it('name materials Earth mines, once each, with a basis and a source url', () => {
    expect(
      unknown(
        reserves.map((r) => r.material),
        materialIds
      )
    ).toEqual([]);
    expect(new Set(reserves.map((r) => r.material)).size).toBe(reserves.length);
    for (const r of reserves) {
      expect(r.basis, r.material).not.toBe('');
      expect(r.source, r.material).toMatch(/^https:\/\//);
      expect(
        material(r.material).sources?.some((s) => s.body === 'earth' && s.building === 'mine_earth')
      ).toBe(true);
    }
  });

  it('give a mine rate only as a positive number of kg an hour', () => {
    for (const m of materials.filter((x) => x.extractKgH !== undefined))
      expect(m.extractKgH, m.id).toBeGreaterThan(0);
  });

  it('hold no more content than the published reserve, and positive amounts', () => {
    for (const r of reserves) {
      expect(r.reserve, r.material).toBeGreaterThan(0);
      if (r.content !== null) expect(r.content, r.material).toBeLessThanOrEqual(r.reserve);
      if (r.content !== null) expect(r.content, r.material).toBeGreaterThan(0);
      if (r.output !== null) expect(r.output, r.material).toBeGreaterThan(0);
    }
  });

  it('convert an ore or oxide reserve to content by the share its mine count takes of world output', () => {
    for (const r of reserves.filter((x) => x.content !== null && x.content !== x.reserve)) {
      const count = counts.get(r.material) ?? 0;
      expect(count, r.material).toBeGreaterThan(0);
      expect(r.content! / r.reserve).toBeCloseTo((count * mineKgAYear(r.material)) / r.output!, 6);
    }
  });

  it('mine no more at the start than world output, within one mine', () => {
    for (const r of reserves) {
      const count = counts.get(r.material);
      if (count === undefined || r.output === null) continue;
      expect(count * mineKgAYear(r.material), r.material).toBeLessThanOrEqual(
        r.output + mineKgAYear(r.material)
      );
    }
  });
});

describe("Earth's starting stocks", () => {
  it('name known materials with a positive stock, a basis, a source url and an estimated flag', () => {
    const stocks = Object.entries(earth.stocks);
    expect(stocks.length).toBeGreaterThan(0);
    expect(
      unknown(
        stocks.map(([id]) => id),
        materialIds
      )
    ).toEqual([]);
    for (const [id, s] of stocks) {
      expect(s.stock, id).toBeGreaterThan(0);
      expect(s.basis, id).not.toBe('');
      expect(s.source, id).toMatch(/^https:\/\//);
      expect(typeof s.estimated, id).toBe('boolean');
    }
  });
});

describe('money', () => {
  it('gives upkeep in dollars a month only to the fabs, machine shops and data centres of the design sketch', () => {
    const upkeep = Object.fromEntries(
      recipes.filter((r) => r.upkeep !== undefined).map((r) => [r.id, r.upkeep])
    );
    expect(upkeep).toEqual({
      electronic_silicon_purification: 80e6,
      rad_hard_ic_fabrication: 120e6,
      machinery_machining: 60e6,
      compute_generation: 100e6,
      ai_model_training: 100e6
    });
  });

  it('prices machinery and integrated circuits in dollars a kilogram', () => {
    const priced = Object.fromEntries(
      materials.filter((m) => m.price !== undefined).map((m) => [m.id, m.price])
    );
    expect(priced).toEqual({ machinery: 30_000, rad_hard_ic: 500_000 });
  });
});

describe('materials', () => {
  it('use known tiers and categories with a source url', () => {
    for (const m of materials) {
      expect(TIERS, m.id).toContain(m.tier);
      expect(m.source, m.id).toMatch(/^https?:\/\//);
      expect(m.why.length, m.id).toBeGreaterThan(10);
    }
  });

  it('record sources in known bodies, with an extraction building that works on that body', () => {
    for (const m of materials) {
      for (const s of m.sources ?? []) {
        expect(BODIES, `${m.id} body`).toContain(s.body);
        expect(HOWS, `${m.id} how`).toContain(s.how);
        const host = buildings.find((b) => b.id === s.building);
        expect(host, `${m.id} building ${s.building}`).toBeDefined();
        expect(host?.kind, `${m.id} building kind`).toBe('extraction');
        expect(host?.where, `${m.id} on ${s.body}`).toContain(s.body);
      }
    }
  });

  it('are either extractable somewhere, produced by some recipe or a building packed as cargo', () => {
    const kits = new Set(buildings.flatMap((b) => (b.kit ? [b.kit.material] : [])));
    const orphans = materials.filter(
      (m) => !m.sources?.length && recipesProducing(m.id).length === 0 && !kits.has(m.id)
    );
    expect(orphans.map((m) => m.id)).toEqual([]);
  });

  it('say where they can be extracted and made, in a form code can query', () => {
    expect(materialSites('lox').make).toContain('moon');
    expect(materialSites('water').extract).toEqual(expect.arrayContaining(['earth', 'moon', 'mars']));
    expect(materialSites('oxygen').extract).toEqual([]);
    expect(materialSites('oxygen').make).toEqual(expect.arrayContaining(['earth', 'moon', 'mars']));
  });

  it('carry no restriction other than physics, geology and industry', () => {
    const politics = /\b(export|ban|banned|sanction|embargo|restrict\w*|controlled|monopoly)\b/i;
    expect(materials.filter((m) => politics.test(m.why)).map((m) => m.id)).toEqual([]);
  });
});

describe('recipes', () => {
  it('run in a known building, from a known project that opens no sooner than the building, on known materials', () => {
    for (const r of recipes) {
      const host = buildings.find((b) => b.id === r.building);
      expect(host, `${r.id} building`).toBeDefined();
      expect(known.has(r.research), r.id).toBe(true);
      expect(tagsOf(r.research).has(host?.research ?? -1), `${r.id} after its building`).toBe(true);
      expect(unknown(Object.keys(r.inputs), materialIds), `${r.id} inputs`).toEqual([]);
      expect(unknown(Object.keys(r.outputs), materialIds), `${r.id} outputs`).toEqual([]);
      for (const amount of [...Object.values(r.inputs), ...Object.values(r.outputs)])
        expect(amount, r.id).toBeGreaterThan(0);
      expect(r.power, r.id).toBeGreaterThanOrEqual(0);
      expect(r.hours, r.id).toBeGreaterThan(0);
    }
  });

  it('name their product among their outputs', () => {
    for (const r of recipes.filter((x) => x.product !== undefined))
      expect(Object.keys(r.outputs), r.id).toContain(r.product);
  });

  it('produce something, or generate power', () => {
    for (const r of recipes)
      expect(Object.keys(r.outputs).length > 0 || (r.generates ?? 0) > 0, r.id).toBe(true);
  });

  it('never create mass', () => {
    for (const r of recipes.filter(massOnly)) {
      if (mass(r.inputs) === 0 || OPEN_AIR.has(r.building)) continue;
      expect(mass(r.outputs), r.id).toBeLessThanOrEqual(mass(r.inputs) * 1.01);
    }
  });

  it('balance to one percent when the ratio is a real reaction or composition', () => {
    const real = recipes.filter((r) => !r.estimated);
    expect(real.length).toBeGreaterThan(20);
    for (const r of real) {
      expect(r.reaction, `${r.id} states its basis`).toBeTruthy();
      expect(r.source, `${r.id} cites a source`).toMatch(/^https?:\/\//);
      if (!massOnly(r) || Object.keys(r.outputs).length === 0) continue;
      expect(Math.abs(mass(r.outputs) - mass(r.inputs)) / mass(r.inputs), r.id).toBeLessThan(0.01);
    }
  });
});

describe('buildings and components', () => {
  it('hold the ten power plants and storage of #76 at 1 GW each, standing on Earth from the start', () => {
    const table: [string, number | undefined, number, number, number, number, number | undefined][] = [
      ['coal_power_station', 0.55, 0.9, 0.95, 2.6, 2, undefined],
      ['gas_power_station', 0.4, 0.9, 0.43, 0.75, 1, undefined],
      ['oil_power_station', 0.2, 0.9, 0.75, 2.6, 1.2, undefined],
      ['nuclear_power_station', 0.82, 0.9, 0, 2.5, 8, undefined],
      ['hydroelectric_dam', 0.37, 0.9, 0, 0, 3, undefined],
      ['bioenergy_plant', 0.55, 0.9, 0, 2, 3, undefined],
      ['wind_farm', 0.25, 0.1, 0, 0, 1.4, undefined],
      ['solar_farm', 0.13, 0.05, 0, 0.1, 0.8, undefined],
      ['battery_storage', undefined, 0.6, 0, 0, 0.6, 2.5e6],
      ['pumped_hydro_storage', undefined, 1, 0, 0, 2.5, 4.8e7]
    ];
    expect(
      buildings
        .filter((b) => b.plant)
        .map((b) => b.id)
        .sort()
    ).toEqual(table.map((t) => t[0]).sort());
    const counts = new Map(earth.groups.map((g) => [g.building, g.count]));
    for (const [id, cf, firm, co2, water, bp, kwh] of table) {
      const b = buildings.find((x) => x.id === id)!;
      expect([b.plant, b.bp, b.start, b.kind, b.where], id).toEqual([
        {
          capacityKw: 1e6,
          ...(cf === undefined ? {} : { capacityFactor: cf }),
          ...(kwh === undefined ? {} : { storageKwh: kwh }),
          firmShare: firm,
          co2PerMwh: co2,
          waterPerMwh: water
        },
        bp,
        true,
        'power',
        ['earth']
      ]);
      expect(counts.get(id), id).toBeGreaterThan(0);
    }
  });

  it('cost known materials and parts, and unlock with a known project', () => {
    for (const b of buildings) {
      expect(unknown(Object.keys(b.cost), materialIds), `${b.id} cost`).toEqual([]);
      expect(unknown(b.parts ?? [], componentIds), `${b.id} parts`).toEqual([]);
      expect(known.has(b.research), b.id).toBe(true);
      for (const site of b.where) expect(SITES, `${b.id} where`).toContain(site);
      expect(b.where.length, b.id).toBeGreaterThan(0);
      if (b.start) expect(b.research, `${b.id} exists at the start`).toBe(0);
    }
  });

  it('cost build points with a source and a basis, except the buildings open on #72, #88, #91 and #101', () => {
    const open = new Set([
      'university',
      'mine_earth',
      'regolith_excavator',
      'asteroid_miner',
      'gas_giant_scoop',
      'atmosphere_skimmer',
      'life_support_plant',
      'ranch',
      'rtg_factory',
      'isotope_separator',
      'exotic_matter_facility',
      'antimatter_facility',
      'propellant_depot',
      'orbital_shipyard',
      'jump_point_stabiliser',
      'sabatier_plant',
      'composite_works',
      'ceramics_works',
      'regolith_oxygen_plant',
      'sinter_printer',
      'asteroid_processor',
      'metal_refinery',
      'charging_station'
    ]);
    expect(unknown([...open], buildingIds)).toEqual([]);
    for (const b of buildings) {
      if (open.has(b.id)) {
        expect([b.bp, b.bpSource, b.bpBasis, b.bpEstimated], b.id).toEqual([
          undefined,
          undefined,
          undefined,
          undefined
        ]);
        continue;
      }
      expect(b.bp, b.id).toBeGreaterThan(0);
      expect(b.bpSource, b.id).toMatch(/^https?:\/\//);
      expect(b.bpBasis?.length, b.id).toBeGreaterThan(40);
      expect([undefined, true], b.id).toContain(b.bpEstimated);
    }
  });

  it('give every farming building a footprint and every extractor a source to work', () => {
    const grows = (id: string) =>
      recipes.some(
        (r) =>
          r.building === id &&
          Object.keys(r.outputs).some(
            (m) => material(m).category === 'food' || ['plant_biomass', 'spirulina'].includes(m)
          )
      );
    for (const b of buildings.filter((x) => grows(x.id))) expect(b.footprint, b.id).toBeDefined();
    for (const b of buildings.filter((x) => x.kind === 'extraction')) {
      const used = materials.some((m) => m.sources?.some((s) => s.building === b.id));
      expect(used, `${b.id} extracts something`).toBe(true);
    }
  });

  it('cost known materials, are assembled in known buildings and unlock with a known project', () => {
    for (const c of shipComponents) {
      expect(unknown(Object.keys(c.cost), materialIds), `${c.id} cost`).toEqual([]);
      expect(unknown(c.builtAt, buildingIds), `${c.id} builtAt`).toEqual([]);
      expect(known.has(c.research), c.id).toBe(true);
    }
  });
});

const LADDER = [30, 60, 120, 240, 360, 600, 1200];
const EFFECTS = [
  'booster_thrust',
  'booster_load',
  'shipyard_points',
  'build_speed',
  'extraction',
  'research',
  'chip_output',
  'data_centre_compute',
  'solar_array_output',
  'battery_storage',
  'electrolysis_power',
  'elevator_throughput'
];
const opens = (n: number) => {
  const u = unlockedAt(n);
  return [...u.buildings, ...u.recipes, ...u.components];
};

describe('body environments', () => {
  const HAND_MADE = Object.keys(WORLD_BODIES);
  const URL = /^https:\/\//;

  it('describe the hand-made bodies and Ceres once each, with a source url', () => {
    const worlds = environments.map((e) => e.world);
    expect(new Set(worlds).size).toBe(worlds.length);
    expect([...worlds].sort()).toEqual([...HAND_MADE, 'ceres'].sort());
    for (const e of environments) {
      expect(bodyTypeOf(e.world), e.world).toBeDefined();
      expect(e.source, e.world).toMatch(URL);
      for (const extra of [e.temperatureSource, e.waterSource, e.nicheSource])
        if (extra !== undefined) expect(extra, e.world).toMatch(URL);
      expect(e.basis.length, e.world).toBeGreaterThan(20);
      expect(typeof e.estimated).toBe('boolean');
    }
  });

  it('give gravity, radius and mean temperature as positive numbers and water cover as a share', () => {
    for (const e of environments) {
      expect(e.gravity, e.world).toBeGreaterThan(0);
      expect(e.radius, e.world).toBeGreaterThan(1e5);
      expect(e.temperature, e.world).toBeGreaterThan(0);
      expect(e.water, e.world).toBeGreaterThanOrEqual(0);
      expect(e.water, e.world).toBeLessThanOrEqual(1);
    }
    expect(environments.filter((e) => e.water > 0).map((e) => e.world)).toEqual(['earth']);
  });

  it('hold their air as kilograms of gases that are materials with a molar mass', () => {
    for (const e of environments)
      for (const [gas, kg] of Object.entries(e.atmosphere)) {
        expect(materialIds.has(gas), `${e.world} ${gas}`).toBe(true);
        expect(material(gas).category, gas).toBe('volatile');
        expect(material(gas).molarMass, gas).toBeGreaterThan(0);
        expect(kg, `${e.world} ${gas}`).toBeGreaterThan(0);
      }
  });

  it('give Earth its warming and the climate niche from no warming upwards', () => {
    const withNiche = environments.filter((e) => e.niche);
    expect(withNiche.map((e) => e.world)).toEqual(['earth']);
    const niche = withNiche[0]!.niche!;
    expect(niche[0]).toEqual({ warming: 0, share: 1 });
    for (let i = 1; i < niche.length; i++) {
      expect(niche[i]!.warming).toBeGreaterThan(niche[i - 1]!.warming);
      expect(niche[i]!.share).toBeLessThan(niche[i - 1]!.share);
    }
    expect(withNiche[0]!.warming).toBe(1.4);
  });
});

describe('the biosphere', () => {
  const b = buildings.find((x) => x.id === 'biosphere')!;
  const bio = b.biosphere!;

  it('opens with the Biosphere project, holds 1,000 people at full suitability, 9 workers and 0.83 kW a resident', () => {
    expect(b.research).toBe(num('biosphere'));
    expect(bio.people).toBe(1000);
    expect(bio.residentKw).toBe(0.83);
    expect(bio.residentWorkers).toBe(0.09);
    expect(bio.residentVolume).toBe(25);
    expect(b.bp).toBe(0.35);
    expect(b.where).not.toContain('earth');
    expect(b.where).not.toContain('orbit');
  });

  it('is built from goods, 500 t of fibres, 50 t of machinery and 1 t of ICs, the same on every body', () => {
    const fibres = (b.cost.vectran ?? 0) + (b.cost.aramid ?? 0) + (b.cost.polyimide ?? 0);
    expect(fibres).toBe(500_000);
    expect(b.cost.machinery).toBe(50_000);
    expect(b.cost.rad_hard_ic).toBe(1000);
    expect(Object.keys(b.cost).sort()).toEqual([
      'aramid',
      'machinery',
      'polyimide',
      'rad_hard_ic',
      'vectran'
    ]);
    for (const url of [bio.source, bio.volumeSource, bio.shellSource, bio.workersSource])
      expect(url).toMatch(/^https:\/\//);
  });

  it('is built where a flight machine shop stands and ships as a material of its own', () => {
    expect(b.kit).toEqual({ material: 'biosphere_kit', builtWith: 'machine_shop' });
    expect(material(b.kit!.material).name).toBe('Biosphere');
    expect(material(b.kit!.material).unit).toBeUndefined();
    expect(buildings.some((x) => x.id === b.kit!.builtWith)).toBe(true);
  });
});

describe('research projects', () => {
  const unlocks = projects.filter((p) => !p.line);
  const levels = projects.filter((p) => p.line);

  it('number from 1 in order, each requiring only lower numbers that exist', () => {
    expect(projects.map((p) => p.number)).toEqual(projects.map((_, i) => i + 1));
    for (const p of projects) {
      for (const r of p.requires) expect(r, p.id).toBeLessThan(p.number);
      expect(p.rp, p.id).toBeGreaterThan(0);
      if (p.tier !== undefined) expect(TIERS, p.id).toContain(p.tier);
    }
  });

  it('hold the 40 projects of the tree and the 34 levels of the eleven boost lines', () => {
    expect(unlocks).toHaveLength(40);
    expect(levels).toHaveLength(34);
    expect(new Set(levels.map((p) => p.line)).size).toBe(11);
  });

  it("cost a rung of Aurora's engine ladder by their place in their lane", () => {
    for (const p of unlocks) expect(LADDER, p.id).toContain(p.rp);
    expect(project(num('jump_point_stabilisation')).rp).toBe(240);
    expect(project(num('solar_power_stations_in_orbit')).rp).toBe(1200);
  });

  it('chain each boost line level after level, with known effects and a source', () => {
    for (const p of levels) {
      const before = levels.find((q) => q.line === p.line && q.level === (p.level ?? 0) - 1);
      if (before) expect(p.requires, p.id).toEqual([before.number]);
      expect(Object.keys(p.effects ?? {}).length, p.id).toBeGreaterThan(0);
      for (const k of Object.keys(p.effects ?? {})) expect(EFFECTS, p.id).toContain(k);
      expect(p.source, p.id).toMatch(/^https?:\/\//);
      expect(p.basis?.length, p.id).toBeGreaterThan(20);
      expect(typeof p.estimated, p.id).toBe('boolean');
      expect(opens(p.number), p.id).toEqual([]);
    }
  });

  it('open what they list when they finish, and tag 0 from the start', () => {
    expect(tagOpen([], 0)).toBe(true);
    expect(tagOpen([], 1)).toBe(false);
    expect(tagOpen([1], 1)).toBe(true);
    expect(tagOpen([1], 2)).toBe(false);
    expect(missingPrerequisites([], num('propellant_transfer_in_orbit'))).toEqual([num('booster_recovery')]);
    for (const p of projects) for (const r of p.requires) expect(dependentsOf(r), p.id).toContain(p.number);
  });

  it('give each unlock project something to open, but helium-3 extraction', () => {
    expect(unlocks.filter((p) => opens(p.number).length === 0).map((p) => p.id)).toEqual([
      'helium_3_extraction'
    ]);
  });

  it('place the biosphere of #91 after the greenhouse and regolith excavation, at 600 RP and tier E', () => {
    const b = projectById('biosphere');
    expect(b.subject).toBe('habitats');
    expect(b.rp).toBe(600);
    expect(b.tier).toBe('E');
    expect(b.requires).toEqual(
      [num('regolith_excavation'), num('greenhouse_at_low_gravity')].sort((x, y) => x - y)
    );
  });

  it.each([true, false])(
    'make everything a project opens from the start and its own prerequisites alone (thin path: %s)',
    (thinOnly) => {
      for (const p of projects) {
        const got = reach({ tags: tagsOf(p.number), thinOnly });
        const u = unlockedAt(p.number);
        const keep = (x: { thin?: boolean }) => !thinOnly || x.thin === true;
        expect(
          u.buildings
            .filter(keep)
            .filter((b) => !got.buildings.has(b.id))
            .map((b) => b.id),
          `${p.id} buildings`
        ).toEqual([]);
        expect(
          u.recipes
            .filter(keep)
            .filter((r) => !got.recipes.has(r.id))
            .map((r) => r.id),
          `${p.id} recipes`
        ).toEqual([]);
        expect(
          u.components
            .filter(keep)
            .filter((c) => !got.components.has(c.id))
            .map((c) => c.id),
          `${p.id} components`
        ).toEqual([]);
      }
    }
  );

  it('name a known subject each, and every subject is used', () => {
    const ids = subjects.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of projects) expect(ids, p.id).toContain(p.subject);
    for (const s of subjects)
      expect(
        unlocks.some((p) => p.subject === s.id),
        s.id
      ).toBe(true);
  });

  it('boost by the highest level researched in a line, and by nothing before', () => {
    const one = num('research_rate_1');
    const two = num('research_rate_2');
    expect(boostOf([], 'research')).toBe(1);
    expect(boostOf([one], 'research')).toBe(1.2);
    expect(boostOf([one, two], 'research')).toBe(1.4);
  });

  it('end at jump point stabilisation', () => {
    expect(unlockedAt(num('jump_point_stabilisation')).buildings.map((b) => b.id)).toEqual([
      'jump_point_stabiliser'
    ]);
  });
});

describe('the thin path', () => {
  const thinMaterials = materials.filter((m) => m.thin);

  it('closes on itself: thin recipes, buildings and components use only thin parts', () => {
    const isThin = (id: string) => material(id).thin === true;
    for (const r of recipes.filter((x) => x.thin)) {
      expect(
        Object.keys(r.inputs).filter((id) => !isThin(id)),
        `${r.id} inputs`
      ).toEqual([]);
      expect(
        Object.keys(r.outputs).some(isThin) || (r.generates ?? 0) > 0,
        `${r.id} makes a thin material or power`
      ).toBe(true);
      expect(buildings.find((b) => b.id === r.building)?.thin, `${r.id} building`).toBe(true);
    }
    for (const b of buildings.filter((x) => x.thin)) {
      expect(
        Object.keys(b.cost).filter((id) => !isThin(id)),
        `${b.id} cost`
      ).toEqual([]);
      for (const p of b.parts ?? [])
        expect(shipComponents.find((c) => c.id === p)?.thin, `${b.id} ${p}`).toBe(true);
    }
    for (const c of shipComponents.filter((x) => x.thin)) {
      expect(
        Object.keys(c.cost).filter((id) => !isThin(id)),
        `${c.id} cost`
      ).toEqual([]);
      expect(
        c.builtAt.some((id) => buildings.find((b) => b.id === id)?.thin),
        `${c.id} builder`
      ).toBe(true);
    }
  });

  it('keeps food on it from the first crew that stays for months', () => {
    expect(material('food_ration').thin).toBe(true);
    expect(thinMaterials.map((m) => m.id)).toEqual(
      expect.arrayContaining(['food_ration', 'plant_biomass', 'urea', 'map_fertiliser', 'potassium_sulfate'])
    );
  });

  it('starts from extraction alone: nothing is reachable with nothing open', () => {
    const got = reach({ tags: new Set(), thinOnly: true });
    expect(got.materials.size).toBe(0);
    expect(got.buildings.size).toBe(0);
  });

  it('runs on what is open at the start', () => {
    const first = reach({ upTo: 0, thinOnly: true });
    expect(first.materials.has('oxygen')).toBe(true);
    expect(first.materials.has('cfrp')).toBe(true);
    expect(first.materials.has('haleu')).toBe(false);
  });
});

describe('the whole data set', () => {
  const all = reach();

  it('reaches every material, building, component and recipe: no cycle strands one', () => {
    expect(materials.filter((m) => !all.materials.has(m.id)).map((m) => m.id)).toEqual([]);
    expect(buildings.filter((b) => !all.buildings.has(b.id)).map((b) => b.id)).toEqual([]);
    expect(shipComponents.filter((c) => !all.components.has(c.id)).map((c) => c.id)).toEqual([]);
    expect(recipes.filter((r) => !all.recipes.has(r.id)).map((r) => r.id)).toEqual([]);
  });

  it('makes each thin material on the thin path and each other material somewhere', () => {
    const thin = reach({ thinOnly: true });
    expect(materials.filter((m) => m.thin && !thin.materials.has(m.id)).map((m) => m.id)).toEqual([]);
  });
});

describe('make or import', () => {
  it('lets the Moon make its own propellant once lunar ice and regolith are worked', () => {
    const moon = reach({ tags: tagsOf(num('regolith_oxygen_extraction')), thinOnly: true, site: 'moon' });
    expect(moon.materials.has('lox')).toBe(true);
    expect(moon.materials.has('lh2')).toBe(true);
    expect(moon.materials.has('lch4')).toBe(false);
  });

  it('lets a gas giant supply fusion fuel', () => {
    const giant = reach({ tags: tagsOf(num('gas_giant_scooping')), thinOnly: true, site: 'gas-giant' });
    for (const id of ['helium3', 'deuterium', 'hydrogen', 'helium4'])
      expect(giant.materials.has(id), id).toBe(true);
  });

  it('keeps nitrogen off the Moon: it must be imported or bred from comets', () => {
    const moon = reach({ site: 'moon' });
    expect(moon.materials.has('nitrogen')).toBe(false);
    expect(materialSites('nitrogen').extract).not.toContain('moon');
  });
});

describe('propulsion performance', () => {
  const engines = shipComponents.filter((c) => c.kind === 'propulsion');
  const URL = /^https:\/\/\S+$/;

  it('gives every propulsion component specific impulse, thrust, mass and a source', () => {
    for (const c of engines) {
      const p = c.performance;
      expect(p, c.id).toBeDefined();
      if (!p) continue;
      expect(p.isp, `${c.id} isp`).toBeGreaterThan(0);
      expect(p.thrust, `${c.id} thrust`).toBeGreaterThan(0);
      expect(p.mass, `${c.id} mass`).toBeGreaterThan(0);
      expect(p.source, `${c.id} source`).toMatch(URL);
      expect(['flown', 'ground-tested', 'design-study'], c.id).toContain(p.basis);
    }
  });

  it('keeps every figure in a plausible range for its kind of engine', () => {
    const range = (id: string, isp: [number, number], thrust: [number, number], mass: [number, number]) => {
      const p = shipComponents.find((c) => c.id === id)?.performance;
      expect(p, id).toBeDefined();
      if (!p) return;
      expect(p.isp, `${id} isp`).toBeGreaterThanOrEqual(isp[0]);
      expect(p.isp, `${id} isp`).toBeLessThanOrEqual(isp[1]);
      expect(p.thrust, `${id} thrust`).toBeGreaterThanOrEqual(thrust[0]);
      expect(p.thrust, `${id} thrust`).toBeLessThanOrEqual(thrust[1]);
      expect(p.mass, `${id} mass`).toBeGreaterThanOrEqual(mass[0]);
      expect(p.mass, `${id} mass`).toBeLessThanOrEqual(mass[1]);
    };
    range('kerolox_engine', [280, 340], [1e5, 3e6], [100, 3000]);
    range('chemical_engine_methalox', [320, 390], [1e5, 4e6], [500, 3000]);
    range('chemical_engine_hydrolox', [420, 470], [5e3, 3e6], [100, 4000]);
    range('rcs_thruster', [200, 340], [1, 5e3], [0.5, 50]);
    range('hall_thruster', [1000, 3500], [0.01, 5], [1, 100]);
    range('ion_thruster', [2000, 10000], [0.01, 5], [1, 100]);
    range('ntr_engine', [700, 1000], [5e4, 1e6], [5000, 30000]);
    range('fusion_drive', [5000, 100000], [1, 1e4], [1000, 50000]);
  });

  it('keeps thrust and specific impulse consistent with the power an electric engine needs', () => {
    for (const c of engines) {
      const p = c.performance;
      if (!p?.power) continue;
      const jetPower = (p.thrust * p.isp * 9.80665) / 2;
      expect(jetPower, `${c.id} jet power`).toBeLessThan(p.power * 1000);
      expect(jetPower, `${c.id} efficiency`).toBeGreaterThan(p.power * 1000 * 0.2);
    }
  });

  it('puts a sea-level thrust only on engines that can fire in atmosphere, below vacuum thrust', () => {
    for (const c of engines) {
      const p = c.performance;
      if (p?.thrustSeaLevel === undefined) continue;
      expect(p.thrustSeaLevel, c.id).toBeLessThan(p.thrust);
    }
  });

  it('marks the fusion drive as a design study', () => {
    expect(shipComponents.find((c) => c.id === 'fusion_drive')?.performance?.basis).toBe('design-study');
  });
});

describe('regions', () => {
  const ground = regions.filter((r) => r.kind === 'ground');
  const sourceOf = (id: string, type: string) => material(id).sources?.find((s) => s.body === type);

  it('are unique, sourced, marked estimated and in a known body type', () => {
    expect(new Set(regions.map((r) => r.id)).size).toBe(regions.length);
    for (const r of regions) {
      expect(BODIES, r.id).toContain(r.body);
      expect(bodyTypeOf(r.world), `${r.id} world ${r.world}`).toBe(r.body);
      expect(r.source, r.id).toMatch(/^https:\/\//);
      expect(r.basis.length, r.id).toBeGreaterThan(40);
      expect(r.estimated, r.id).toBe(true);
    }
  });

  it('hold deposits of known materials with a grade between the stated bounds', () => {
    expect(GRADE_MIN).toBe(0.05);
    expect(GRADE_MAX).toBe(4);
    for (const r of regions) {
      expect(r.deposits.length, r.id).toBeGreaterThan(0);
      expect(new Set(r.deposits.map((d) => d.material)).size, `${r.id} duplicates`).toBe(r.deposits.length);
      for (const d of r.deposits) {
        expect(materialIds.has(d.material), `${r.id} ${d.material}`).toBe(true);
        expect(d.grade, `${r.id} ${d.material}`).toBeGreaterThanOrEqual(GRADE_MIN);
        expect(d.grade, `${r.id} ${d.material}`).toBeLessThanOrEqual(GRADE_MAX);
      }
    }
  });

  it('hold only what some building can extract on that body type, in the right way for the kind', () => {
    for (const r of regions)
      for (const d of r.deposits) {
        const s = sourceOf(d.material, r.body);
        expect(s, `${r.id} ${d.material} on ${r.body}`).toBeDefined();
        expect(s?.how === 'atmosphere', `${r.id} ${d.material} atmospheric`).toBe(r.kind === 'atmosphere');
      }
  });

  it('cover every extraction source of the body types they map, so none is stranded', () => {
    const mapped = new Set(regions.map((r) => r.body));
    for (const m of materials)
      for (const s of m.sources ?? []) {
        if (!mapped.has(s.body) || s.body === 'earth') continue;
        const held = regions.some(
          (r) =>
            r.body === s.body &&
            (r.kind === 'atmosphere') === (s.how === 'atmosphere') &&
            r.deposits.some((d) => d.material === m.id)
        );
        expect(held, `${m.id} on ${s.body}`).toBe(true);
      }
  });

  it('give Earth none and give comets a region each', () => {
    expect(regions.filter((r) => r.body === 'earth')).toEqual([]);
    expect(regions.some((r) => r.body === 'comet')).toBe(true);
    expect(depositGrade('earth', null, 'iron')).toBe(1);
  });

  it('put lunar ice at the south pole, helium-3 in the maria and aluminium rock in the highlands', () => {
    const holders = (m: string) => regionsOf('luna').filter((r) => r.deposits.some((d) => d.material === m));
    expect(holders('water').map((r) => r.id)).toEqual(['luna-south-pole']);
    expect(holders('ilmenite').map((r) => r.id)).toEqual(['luna-maria']);
    expect(holders('anorthite').map((r) => r.id)).toEqual(['luna-highlands']);
    expect(depositGrade('luna', 'luna-maria', 'helium3')!).toBeGreaterThan(
      depositGrade('luna', 'luna-highlands', 'helium3')!
    );
    expect(depositGrade('luna', 'luna-maria', 'water')).toBeUndefined();
  });

  it('make atmospheres available whatever the region', () => {
    expect(depositGrade('mars', null, 'carbon_dioxide')).toBe(atmosphereOf('mars')?.deposits[0]?.grade);
    expect(depositGrade('mars', 'mars-basaltic-plains', 'carbon_dioxide')).toBeGreaterThan(0);
    expect(depositGrade('mars', null, 'water')).toBeUndefined();
    expect(depositGrade('mars', 'mars-polar-layered-deposits', 'water')).toBe(3);
    expect(depositGrade('luna', 'mars-polar-layered-deposits', 'water')).toBeUndefined();
  });

  it('start with the Moon and every atmosphere known and every other ground region unknown', () => {
    const known = ground.filter((r) => r.known).map((r) => r.world);
    expect(new Set(known)).toEqual(new Set(['luna']));
    expect(regionsOf('luna').every((r) => r.known)).toBe(true);
    expect(regions.filter((r) => r.kind === 'atmosphere').every((r) => r.known)).toBe(true);
  });

  it('map every body to a type that exists', () => {
    for (const [world, type] of Object.entries(WORLD_BODIES)) expect(BODIES, world).toContain(type);
  });

  it('keep the thin path closed through regions: ice only from the south pole still reaches lunar oxygen', () => {
    const moon = reach({ tags: tagsOf(num('regolith_oxygen_extraction')), thinOnly: true, site: 'moon' });
    expect(moon.materials.has('water')).toBe(true);
    expect(moon.materials.has('lox')).toBe(true);
  });
});

describe('asteroids', () => {
  const near = asteroids.filter((a) => a.a * (1 - a.e) < 1.3);

  it('are real bodies with unique ids and numbers, an orbit, a size, a mass and a source', () => {
    expect(new Set(asteroids.map((a) => a.id)).size).toBe(asteroids.length);
    const numbers = asteroids.flatMap((a) => (a.number === undefined ? [] : [a.number]));
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const a of asteroids) {
      expect(Object.keys(WORLD_BODIES), a.id).not.toContain(a.id);
      expect(Object.keys(ASTEROID_BODY), a.id).toContain(a.type);
      expect(a.a, a.id).toBeGreaterThan(0.8);
      expect(a.a, a.id).toBeLessThan(1000);
      expect(a.e, a.id).toBeGreaterThanOrEqual(0);
      expect(a.e, a.id).toBeLessThan(1);
      expect(a.diameter, a.id).toBeGreaterThan(0.1);
      expect(a.mass, a.id).toBeGreaterThan(1e9);
      expect(a.source, a.id).toMatch(/^https:\/\//);
    }
  });

  it('hold near-Earth asteroids, a main belt, Trojans, centaurs and the dwarf planets, all four types', () => {
    const names = (list: typeof asteroids) => list.map((a) => a.name);
    expect(names(near)).toEqual(expect.arrayContaining(['Bennu', 'Ryugu', 'Eros', 'Itokawa', 'Apophis']));
    expect(asteroids.length - near.length).toBeGreaterThanOrEqual(40);
    expect(names(asteroids)).toEqual(
      expect.arrayContaining(['Ceres', 'Vesta', 'Pallas', 'Hygiea', 'Psyche', 'Kalliope'])
    );
    expect(names(asteroids.filter((a) => a.dwarf))).toEqual(
      expect.arrayContaining(['Ceres', 'Pluto', 'Eris', 'Haumea', 'Makemake', 'Quaoar', 'Sedna'])
    );
    for (const type of Object.keys(ASTEROID_BODY))
      expect(asteroids.filter((a) => a.type === type).length, type).toBeGreaterThanOrEqual(5);
  });

  it('resolve to the data asteroid types and have exactly one ground region unless they have their own', () => {
    for (const a of asteroids) {
      expect(bodyTypeOf(a.id), a.id).toBe(ASTEROID_BODY[a.type]);
      expect(regionsOf(a.id).length, a.id).toBeGreaterThanOrEqual(1);
      if (a.id !== 'ceres') expect(regionsOf(a.id).map((r) => r.id)).toEqual([`${a.id}-body`]);
    }
  });

  it('give each type the materials its extraction sources name', () => {
    const metal = asteroids.find((a) => a.type === 'metallic')!;
    const stone = asteroids.find((a) => a.type === 'stony')!;
    expect(depositGrade(metal.id, `${metal.id}-body`, 'fe_ni_metal')!).toBeGreaterThan(
      depositGrade(stone.id, `${stone.id}-body`, 'fe_ni_metal')!
    );
    const carbon = asteroids.find((a) => a.type === 'carbonaceous' && a.id !== 'ceres')!;
    expect(depositGrade(carbon.id, `${carbon.id}-body`, 'water')).toBeGreaterThan(0);
    expect(depositGrade(carbon.id, `${carbon.id}-body`, 'iron')).toBeUndefined();
    const ice = asteroids.find((a) => a.type === 'icy')!;
    expect(depositGrade(ice.id, `${ice.id}-body`, 'water')).toBeGreaterThan(0);
    expect(depositGrade(ice.id, `${ice.id}-body`, 'iron')).toBeUndefined();
  });

  it('mark an estimated mass as such and keep every mass near the density of the type', () => {
    for (const a of asteroids) {
      const rho = a.mass / ((Math.PI / 6) * Math.pow(a.diameter * 1000, 3));
      expect(rho, a.id).toBeGreaterThan(300);
      expect(rho, a.id).toBeLessThan(8000);
    }
    expect(asteroids.find((a) => a.id === 'bennu')?.massEstimated).toBeUndefined();
    expect(asteroids.find((a) => a.id === 'apophis')?.massEstimated).toBe(true);
  });

  it('say how a type was found when it did not come from a spectral class', () => {
    for (const a of asteroids) {
      if (a.typeBasis === 'assumed') expect(['stony', 'icy'], a.id).toContain(a.type);
    }
    expect(asteroids.find((a) => a.id === 'bennu')?.typeBasis).toBeUndefined();
  });
});

describe('moons', () => {
  it('are real, with a parent, an orbit, a size, a mass and a source, each once', () => {
    expect(new Set(moons.map((m) => m.id)).size).toBe(moons.length);
    expect(new Set(moons.map((m) => m.code)).size).toBe(moons.length);
    const ids = new Set([
      ...Object.keys(WORLD_BODIES),
      ...asteroids.map((a) => a.id),
      ...comets.map((c) => c.id)
    ]);
    const parents = new Set([
      ...Object.keys(WORLD_BODIES),
      ...asteroids.filter((a) => a.dwarf).map((a) => a.id)
    ]);
    for (const m of moons) {
      expect(ids.has(m.id), m.id).toBe(false);
      expect(parents.has(m.planet), `${m.id} parent`).toBe(true);
      expect(m.aKm, m.id).toBeGreaterThan(0);
      expect(m.e, m.id).toBeGreaterThanOrEqual(0);
      expect(m.e, m.id).toBeLessThan(1);
      expect(m.period, m.id).toBeGreaterThan(0);
      expect(m.diameter, m.id).toBeGreaterThan(1);
      expect(m.mass, m.id).toBeGreaterThan(1e12);
      expect(m.source, m.id).toMatch(/^https:\/\//);
    }
  });

  it('fall into the types of their bodies: dark irregular and Martian moons carbonaceous, the rest icy', () => {
    for (const m of moons) {
      expect(bodyTypeOf(m.id), m.id).toBe(ASTEROID_BODY[m.type]);
      expect(m.type, m.id).toBe(m.irregular || m.planet === 'mars' ? 'carbonaceous' : 'icy');
      expect(
        regionsOf(m.id).map((r) => r.id),
        m.id
      ).toEqual([`${m.id}-body`]);
    }
  });

  it('have the Martian moons, the small moons of every giant and the moons of Pluto', () => {
    const names = moons.map((m) => m.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Phobos',
        'Deimos',
        'Himalia',
        'Rhea',
        'Titania',
        'Triton',
        'Charon',
        'Amalthea'
      ])
    );
  });
});

describe('comets', () => {
  it('are real, with an orbit, a nucleus, an estimated mass and a source, each once', () => {
    expect(new Set(comets.map((c) => c.id)).size).toBe(comets.length);
    for (const c of comets) {
      expect(c.a, c.id).toBeGreaterThan(1);
      expect(c.e, c.id).toBeLessThan(1);
      expect(c.diameter, c.id).toBeGreaterThan(0.1);
      expect(c.massEstimated, c.id).toBe(true);
      const rho = c.mass / ((Math.PI / 6) * Math.pow(c.diameter * 1000, 3));
      expect(rho, c.id).toBeGreaterThan(495);
      expect(rho, c.id).toBeLessThan(505);
      expect(c.source, c.id).toMatch(/^https:\/\//);
      expect(bodyTypeOf(c.id), c.id).toBe('comet');
      expect(
        regionsOf(c.id).map((r) => r.id),
        c.id
      ).toEqual([`${c.id}-body`]);
    }
    expect(comets.map((c) => c.name)).toEqual(expect.arrayContaining(['Halley', 'Encke', 'Hale-Bopp']));
  });

  it('hold only water and carbon and nitrogen ices, and no metal', () => {
    for (const c of comets)
      for (const d of regionsOf(c.id).flatMap((r) => r.deposits))
        expect(['water', 'comet_ice', 'carbon_dioxide', 'ammonia'], c.id).toContain(d.material);
  });
});

describe('the survey instrument', () => {
  it('is one real component, opened by remote-sensing instruments before asteroid sampling', () => {
    const suites = shipComponents.filter((c) => c.design.surveys);
    expect(suites.map((c) => c.id)).toEqual(['survey_suite']);
    expect(suites[0]?.design.source).toMatch(/^https:\/\//);
    expect(suites[0]?.research).toBe(num('remote_sensing_instruments'));
    expect(project(num('asteroid_sampling')).requires).toContain(num('remote_sensing_instruments'));
  });
});

describe('robot parts', () => {
  const URL = /^https:\/\//;

  it('cost known materials, open with a known project and say how their figures come about', () => {
    for (const p of robotParts) {
      expect(known.has(p.research), p.id).toBe(true);
      expect(p.basis.length, p.id).toBeGreaterThan(20);
      if (p.source) expect(p.source, p.id).toMatch(URL);
      if (p.component) {
        expect(componentIds.has(p.component), p.id).toBe(true);
        expect(p.cost, p.id).toBeUndefined();
        expect(p.mass, p.id).toBeUndefined();
      } else {
        expect(unknown(Object.keys(p.cost ?? {}), materialIds), p.id).toEqual([]);
        expect(p.mass, p.id).toBeGreaterThan(0);
      }
      expect(!!p.rates, p.id).toBe(p.kind === 'tool');
      expect(!!p.chassis, p.id).toBe(p.kind === 'chassis');
    }
  });

  it('are made from what their own project and its ancestors open', () => {
    for (const p of robotParts) {
      const got = reach({ tags: tagsOf(p.research) });
      const cost = p.component ? shipComponents.find((c) => c.id === p.component)!.cost : (p.cost ?? {});
      expect(unknown(Object.keys(cost), got.materials), p.id).toEqual([]);
    }
  });

  it('take the figures the owner settled on #101', () => {
    const part = (id: string) => robotParts.find((p) => p.id === id)!;
    expect(part('drum_excavator').rates).toEqual({ loose: 42 });
    expect(part('drill_oven').rates).toEqual({ loose: 10, hard: 5, ice: 5 });
    expect(part('drill_oven').bakes).toBe(0.8);
    expect(part('regolith_scoop').rates).toEqual({ loose: 15, looseIce: 15 });
    expect([part('radioisotope_generator').generates, part('radioisotope_generator').mass]).toEqual([
      0.11, 45
    ]);
    expect([part('robot_computer').compute, part('robot_computer').power]).toEqual([0.002, 0.13]);
    expect(part('robot_solar_array').component).toBe('solar_array');
    expect(
      new Set(
        robotParts
          .filter((p) => p.id !== 'radioisotope_generator' && p.id !== 'battery_dock')
          .map((p) => p.research)
      )
    ).toEqual(new Set([num('autonomous_operations')]));
    expect(part('radioisotope_generator').research).toBe(num('small_modular_fission'));
    expect(part('battery_dock').research).toBe(num('space_batteries'));
    const station = buildings.find((b) => b.id === 'charging_station')!;
    expect(station.charger?.kw).toBe(10);
    expect(station.charger?.source).toMatch(URL);
    expect(station.research).toBe(num('autonomous_operations'));
  });

  it('dig only known materials that some region holds', () => {
    const held = new Set(regions.flatMap((r) => r.deposits.map((d) => d.material)));
    for (const ids of Object.values(digClasses))
      for (const id of ids) {
        expect(materialIds.has(id), id).toBe(true);
        expect(held.has(id), id).toBe(true);
      }
    for (const id of digClasses.looseIce) expect(digClasses.ice, id).toContain(id);
  });
});
