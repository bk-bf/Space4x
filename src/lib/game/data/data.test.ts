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
  regions,
  regionsOf,
  reserves,
  material,
  materials,
  materialSites,
  milestone,
  milestones,
  missingPrerequisites,
  opensTags,
  reach,
  recipes,
  recipesProducing,
  shipComponents,
  subjects,
  tagOpen,
  tagsOf,
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
const LAST = milestones.length;

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
    expect(duplicates(milestones.map((m) => m.id))).toEqual([]);
  });

  it('never collide between materials, buildings, components and recipes', () => {
    const all = [...materials, ...buildings, ...shipComponents, ...recipes].map((x) => x.id);
    expect(duplicates(all)).toEqual([]);
  });

  it('are snake_case everywhere', () => {
    const all = [...materials, ...recipes, ...buildings, ...shipComponents, ...milestones].map((x) => x.id);
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

  it('are either extractable somewhere or produced by some recipe', () => {
    const orphans = materials.filter((m) => !m.sources?.length && recipesProducing(m.id).length === 0);
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
  it('run in a known building, from a known milestone, on known materials', () => {
    for (const r of recipes) {
      const host = buildings.find((b) => b.id === r.building);
      expect(host, `${r.id} building`).toBeDefined();
      expect(r.milestone, r.id).toBeGreaterThanOrEqual(host?.milestone ?? 0);
      expect(r.milestone, r.id).toBeLessThanOrEqual(LAST);
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

  it('cost known materials and parts, and unlock at a known milestone', () => {
    for (const b of buildings) {
      expect(unknown(Object.keys(b.cost), materialIds), `${b.id} cost`).toEqual([]);
      expect(unknown(b.parts ?? [], componentIds), `${b.id} parts`).toEqual([]);
      expect(b.milestone, b.id).toBeGreaterThanOrEqual(1);
      expect(b.milestone, b.id).toBeLessThanOrEqual(LAST);
      for (const site of b.where) expect(SITES, `${b.id} where`).toContain(site);
      expect(b.where.length, b.id).toBeGreaterThan(0);
      if (b.start) expect(b.milestone, `${b.id} exists at the start`).toBe(1);
    }
  });

  it('cost build points with a source and a basis, except the buildings open on #72', () => {
    const open = new Set([
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
      'metal_refinery'
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

  it('cost known materials, are assembled in known buildings and unlock at a known milestone', () => {
    for (const c of shipComponents) {
      expect(unknown(Object.keys(c.cost), materialIds), `${c.id} cost`).toEqual([]);
      expect(unknown(c.builtAt, buildingIds), `${c.id} builtAt`).toEqual([]);
      expect(c.milestone, c.id).toBeGreaterThanOrEqual(1);
      expect(c.milestone, c.id).toBeLessThanOrEqual(LAST);
    }
  });
});

describe('milestones', () => {
  it('number 1 to 29 in order', () => {
    expect(milestones.map((m) => m.number)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });

  it('require only earlier milestones and need things that exist', () => {
    for (const m of milestones) {
      expect(TIERS, m.id).toContain(m.tier);
      expect(m.sources.length, m.id).toBeGreaterThan(0);
      for (const r of m.requires) expect(r, m.id).toBeLessThan(m.number);
      expect(unknown(m.needs.materials, materialIds), `${m.id} materials`).toEqual([]);
      expect(unknown(m.needs.buildings, buildingIds), `${m.id} buildings`).toEqual([]);
      expect(unknown(m.needs.components, componentIds), `${m.id} components`).toEqual([]);
    }
    expect(milestone(1).requires).toEqual([]);
  });

  it.each([true, false])(
    'makes what each milestone needs from its own ancestors alone (thin path: %s)',
    (thinOnly) => {
      for (const m of milestones) {
        const got = reach({ tags: tagsOf(m.number), thinOnly });
        expect(
          m.needs.materials.filter((id) => !got.materials.has(id)),
          `${m.id} materials`
        ).toEqual([]);
        expect(
          m.needs.buildings.filter((id) => !got.buildings.has(id)),
          `${m.id} buildings`
        ).toEqual([]);
        expect(
          m.needs.components.filter((id) => !got.components.has(id)),
          `${m.id} components`
        ).toEqual([]);
      }
    }
  );

  it('name a known subject each, and every subject is used', () => {
    const known = subjects.map((s) => s.id);
    expect(new Set(known).size).toBe(known.length);
    for (const m of milestones) expect(known, m.id).toContain(m.subject);
    for (const s of subjects)
      expect(
        milestones.some((m) => m.subject === s.id),
        s.id
      ).toBe(true);
  });

  it('unlock a tag once its own requires are done, and tag 0 from the start', () => {
    expect(tagOpen([], 0)).toBe(true);
    expect(tagOpen([], 1)).toBe(true);
    expect(tagOpen([1], 2)).toBe(true);
    expect(tagOpen([1], 3)).toBe(false);
    expect(tagOpen([1, 2], 3)).toBe(true);
    expect(missingPrerequisites([1], 4)).toEqual([3]);
  });

  it('opens a tag from each of its prerequisites', () => {
    expect(opensTags(1)).toEqual(expect.arrayContaining([2, 3, 4, 15]));
    for (const m of milestones) for (const r of m.requires) expect(opensTags(r), m.id).toContain(m.number);
  });

  it('end at jump point stabilisation', () => {
    expect(milestone(29).needs.buildings).toEqual(['jump_point_stabiliser']);
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

  it('holds every material the milestones need', () => {
    for (const m of milestones) {
      expect(
        m.needs.materials.filter((id) => !material(id).thin),
        `${m.id}`
      ).toEqual([]);
      expect(
        m.needs.buildings.filter((id) => !buildings.find((b) => b.id === id)?.thin),
        `${m.id}`
      ).toEqual([]);
      expect(
        m.needs.components.filter((id) => !shipComponents.find((c) => c.id === id)?.thin),
        `${m.id}`
      ).toEqual([]);
    }
  });

  it('keeps food on it from the first crew that stays for months', () => {
    expect(milestone(3).needs.materials).toContain('food_ration');
    expect(thinMaterials.map((m) => m.id)).toEqual(
      expect.arrayContaining(['food_ration', 'plant_biomass', 'urea', 'map_fertiliser', 'potassium_sulfate'])
    );
  });

  it('reaches every milestone 1 to 29 in order from what present-day Earth can extract', () => {
    for (const m of milestones) {
      const got = reach({ upTo: m.number, thinOnly: true });
      expect(
        m.needs.materials.filter((id) => !got.materials.has(id)),
        `${m.id} materials`
      ).toEqual([]);
      expect(
        m.needs.buildings.filter((id) => !got.buildings.has(id)),
        `${m.id} buildings`
      ).toEqual([]);
      expect(
        m.needs.components.filter((id) => !got.components.has(id)),
        `${m.id} components`
      ).toEqual([]);
    }
  });

  it('starts from extraction alone: nothing is reachable with no milestone unlocked', () => {
    const got = reach({ upTo: 0, thinOnly: true });
    expect(got.materials.size).toBe(0);
    expect(got.buildings.size).toBe(0);
  });

  it('runs on only the first milestone unlocks at the start', () => {
    const first = reach({ upTo: 1, thinOnly: true });
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
    const moon = reach({ upTo: 12, thinOnly: true, site: 'moon' });
    expect(moon.materials.has('lox')).toBe(true);
    expect(moon.materials.has('lh2')).toBe(true);
    expect(moon.materials.has('lch4')).toBe(false);
  });

  it('lets a gas giant supply fusion fuel', () => {
    const giant = reach({ upTo: 25, thinOnly: true, site: 'gas-giant' });
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

  it('keep the thin path closed through regions: ice only from the south pole still reaches milestone 12', () => {
    const moon = reach({ upTo: 12, thinOnly: true, site: 'moon' });
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
  it('is one real component, unlocked early and needed by asteroid prospecting', () => {
    const suites = shipComponents.filter((c) => c.design.surveys);
    expect(suites.map((c) => c.id)).toEqual(['survey_suite']);
    expect(suites[0]?.design.source).toMatch(/^https:\/\//);
    expect(suites[0]?.milestone).toBeLessThan(15);
    expect(milestone(15).needs.components).toContain('survey_suite');
  });
});
