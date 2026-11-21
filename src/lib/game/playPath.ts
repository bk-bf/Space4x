import { classes } from './classes.svelte.ts';
import { building, material, projectById, regionsOf } from './data/index.ts';
import {
  assign,
  economy,
  ELEVATOR,
  extractionId,
  flowsOf,
  liftId,
  queueBuilding,
  setOn,
  siteAt,
  standing,
  touch,
  unlockedProcesses,
  unlockedTag,
  type GroupActor,
  type Group,
  type Site
} from './economy/index.ts';
import { Player, withBoosters } from './play.ts';
import {
  designStats,
  lock,
  newDesign,
  PROPELLANTS,
  setCount,
  setLoad,
  type ShipDesign
} from './shipdesign/index.ts';
import {
  addOrder,
  foundSite,
  importCost,
  installModule,
  orderShips,
  propellantAvailable,
  ships,
  type Vessel
} from './ships/index.ts';

const REACTORS = 3;
const CREW = 4;
const LAUNCH_CARGO_KG = 95_000;
export const HEAVY_CHUNK_KG = 90_000;
const TANKER_LOAD_KG = 160_000;
const TANKER_CARGO_KG = 20_000;
const UPKEEP_DAYS = 1100;
const ELEVATOR_STALL_DAYS = 30;
const LIFT_EPS = 1e-9;

const MOON_KIT: Record<string, number> = {
  stainless_steel: 8800,
  copper: 1050,
  ai_models: 3,
  li_ion_cell: 200,
  ndfeb_magnet: 50,
  nickel_superalloy: 200,
  al_li_alloy: 2000,
  fused_silica: 800,
  polyimide: 100,
  platinum: 2,
  aluminium: 600,
  carbon_dioxide: 8000,
  urea: 600,
  map_fertiliser: 200,
  potassium_sulfate: 200,
  food_ration: 6000
};

const BYPRODUCTS = new Set(['xenon']);

const MINED: Record<string, string> = {
  bennu: 'carbonaceous_chondrite',
  hertha: 'fe_ni_metal'
};

const MOON_BUILDINGS = ['regolith_oxygen_plant', 'sinter_printer'];

const MOON_PROCESS: Record<string, string> = {
  greenhouse: 'greenhouse_wheat',
  cryogenic_liquefaction_plant: 'lox_liquefaction'
};

const HEAVY = 'path-heavy';
const LANDER = 'path-lander';
const HAULER = 'path-hauler';
const TANKER = 'path-tanker';
const PROBE = 'path-probe';
const NTR_HAULER = 'path-ntr-hauler';
const NEP_TUG = 'path-nep-tug';

export const SOUTH_POLE = 'luna-south-pole';

export interface PathReport {
  sites: string[];
  comparison?: { earth: number | null; moon: number | null; chose: 'earth' | 'moon' };
  lunarLox: number;
  lifted: number;
  fills: { at: number; kind: string; kg: number; launches: number; fromStock: number }[];
}

type Parts = readonly (readonly [string, number])[];

export type Payload = { kind: 'ship'; ship: string } | { kind: 'cargo'; cargo: Record<string, number> };

export class PathPlayer extends Player {
  readonly path: PathReport = { sites: [], lunarLox: 0, lifted: 0, fills: [] };

  protected design(
    id: string,
    name: string,
    role: ShipDesign['role'],
    parts: Parts,
    load?: readonly (readonly [Parameters<typeof setLoad>[1], number])[],
    yard: ShipDesign['yard'] = 'rocket_factory'
  ): ShipDesign {
    const found = classes.find(id);
    if (found) return found;
    let d: ShipDesign = { ...newDesign(id, name), role, yard };
    for (const [c, n] of parts) d = setCount(d, c, n);
    for (const [k, kg] of load ?? []) d = setLoad(d, k, kg);
    d = lock(withBoosters(d), unlockedTag(economy));
    if (!d.locked)
      throw new Error(
        `${name} could not be locked: ${designStats(d, unlockedTag(economy))
          .issues.filter((i) => i.level === 'error')
          .map((i) => i.text)
          .join(' ')}`
      );
    classes.add(d);
    return d;
  }

  protected owned(designId: string, at = 'earth'): Vessel[] {
    return ships.vessels.filter(
      (v) => v.design === designId && v.at.kind === 'site' && v.at.site === at && !v.trip
    );
  }

  protected waitFor(done: () => boolean, label: string, limitDays = 600, step = 2): boolean {
    let left = limitDays;
    while (!done() && left > 0) {
      this.fixShortages();
      this.days(step);
      left -= step;
    }
    if (!done()) this.say(`gave up waiting for ${label}`);
    return done();
  }

  protected buildAtEarth(designId: string, n = 1): void {
    const site = this.earth;
    const have = this.owned(designId).length + site.yard.filter((o) => o.design === designId).length;
    if (have < n) {
      const r = orderShips(site, designId, n - have);
      if (typeof r === 'string') this.say(`could not order ${designId}: ${r}`);
    }
    this.waitFor(() => this.owned(designId).length >= n, designId);
  }

  protected supplyRate(id: string, short: number): number {
    return Math.max(this.floorRate(id), short / 24);
  }

  protected supply(cargo: Record<string, number>): void {
    const site = this.earth;
    const short = () => Object.entries(cargo).filter(([m, kg]) => (site.stock[m] ?? 0) < kg);
    let guard = 0;
    while (short().length && guard++ < 250) {
      for (const [m, kg] of short())
        if (!BYPRODUCTS.has(m)) this.produce(m, this.supplyRate(m, kg - (site.stock[m] ?? 0)));
      this.fixShortages();
      this.days(3);
    }
    this.computeForResearch();
    const left = short();
    if (left.length) this.say(`short of ${left.map(([m]) => material(m).name).join(', ')}`);
  }

  protected heavyDesign(): ShipDesign {
    return this.design(HEAVY, 'Heavy freighter', 'freighter', [
      ['chemical_engine_methalox', 3],
      ['large_tank', 1],
      ['structure_truss', 1],
      ['heavy_cargo_bay', 1]
    ]);
  }

  protected launchHeavy(payload: Payload): Vessel | undefined {
    if (payload.kind === 'ship') {
      const v = ships.vessels.find((x) => x.id === payload.ship);
      return v && this.launchFromEarth(v) ? v : undefined;
    }
    const heavy = this.heavyDesign();
    this.buildAtEarth(heavy.id);
    const v = this.owned(heavy.id)[0]!;
    return this.launchFromEarth(v, payload.cargo) ? v : undefined;
  }

  protected station(): Site {
    const st = this.orbital();
    if (!st) throw new Error('there is no orbital station');
    return st;
  }

  protected flightDone(v: Vessel): boolean {
    return v.orders.length === 0 && !v.trip;
  }

  protected fly(v: Vessel, label: string, limitDays = 4000): boolean {
    this.days(0.5);
    const ok = this.waitFor(() => this.flightDone(v) || !!v.blocked, label, limitDays, 1);
    if (v.blocked) this.say(`${v.name} is blocked: ${v.blocked}`);
    return ok && !v.blocked;
  }

  protected raiseElevator(): void {
    const earth = this.earth;
    if (!economy.done.includes(projectById('space_elevator').number) || !this.orbital()) return;
    if (standing(earth, ELEVATOR) > 0 || earth.queue.some((o) => o.building === ELEVATOR)) return;
    if (queueBuilding(economy, earth, ELEVATOR, null).length) this.say('queued a space elevator');
  }

  protected research(): void {
    super.research();
    this.raiseElevator();
  }

  protected liftedPerHour(g: Group): number {
    const a = flowsOf(this.earth).actors.find(
      (x): x is GroupActor => x.kind === 'group' && x.group.id === g.id
    );
    return a ? Object.values(a.lifts).reduce((sum, v) => sum + v, 0) * a.share : 0;
  }

  protected liftToStation(cargo: Record<string, number>): Record<string, number> {
    const earth = this.earth;
    const g = earth.groups.find((x) => x.building === ELEVATOR && x.count > 0);
    if (!g) return cargo;
    const left: Record<string, number> = {};
    for (const [m, kg] of Object.entries(cargo)) {
      if (kg <= 0) continue;
      this.supply({ [m]: kg });
      if (g.process !== liftId(m) && !assign(economy, earth, g.id, liftId(m), g.count)) {
        left[m] = kg;
        continue;
      }
      setOn(earth, g.id, true);
      touch();
      let lifted = 0;
      let stalled = 0;
      while (kg - lifted > LIFT_EPS * kg && stalled < ELEVATOR_STALL_DAYS) {
        const per = this.liftedPerHour(g);
        if (per <= 0) {
          stalled++;
          this.supply({ [m]: kg - lifted });
        }
        const step = per > 0 ? Math.min(1, (kg - lifted) / per / 24) : 1;
        this.days(step);
        lifted += per * 24 * step;
      }
      setOn(earth, g.id, false);
      touch();
      if (kg - lifted > LIFT_EPS * kg) left[m] = kg - lifted;
      this.path.lifted += lifted;
      this.say(`lifted ${Math.round(lifted / 100) / 10} t of ${material(m).name} by elevator`);
    }
    return left;
  }

  protected cargoToStation(whole: Record<string, number>): void {
    const cargo = this.liftToStation(whole);
    if (!Object.keys(cargo).length) return;
    this.supply(cargo);
    const up = this.launchHeavy({ kind: 'cargo', cargo });
    if (!up) return;
    addOrder(up, { type: 'dock', site: this.station().id });
    addOrder(up, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
    this.fly(up, 'cargo at the station');
  }

  protected stationPropellant(kind: 'methalox' | 'hydrolox' | 'hydrogen' | 'xenon', kg: number): void {
    const st = this.station();
    const mix = PROPELLANTS[kind].mix;
    const fromStock = Math.min(st.stock.lox ?? 0, (mix.lox ?? 0) * kg);
    const first = this.report.launches.length;
    let guard = 0;
    while (propellantAvailable(st, kind) < kg - 2 && guard++ < 60) {
      const short = Object.entries(mix)
        .map(([m, share]) => [m, Math.max(0, share * kg - (st.stock[m] ?? 0))] as const)
        .filter(([, need]) => need > 1);
      const total = short.reduce((a, [, need]) => a + need, 0);
      if (total <= 0) break;
      const scale = Math.min(1, LAUNCH_CARGO_KG / total);
      const cargo = Object.fromEntries(short.map(([m, need]) => [m, need * scale]));
      this.cargoToStation(cargo);
    }
    this.path.fills.push({
      at: this.game.time,
      kind,
      kg,
      launches: this.report.launches.length - first,
      fromStock
    });
  }

  protected lunarSite(): Site | undefined {
    return siteAt(economy, 'luna', 'surface');
  }

  protected fuelAndGo(v: Vessel, kind: 'methalox' | 'hydrolox', destination: 'luna'): boolean {
    const st = this.station();
    addOrder(v, { type: 'dock', site: st.id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: kind }, amount: null });
    addOrder(v, { type: 'fly', body: destination, angle: 0 });
    addOrder(v, { type: 'land', body: destination, region: SOUTH_POLE });
    return this.fly(v, `${v.name} to the Moon`);
  }

  protected landerDesign(): ShipDesign {
    return this.design(LANDER, 'Lunar lander', 'lander', [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 6],
      ['structure_truss', 1],
      ['landing_legs', 2],
      ['habitat_module', 1],
      ['life_support_unit', 1],
      ['solar_array', 1],
      ['radiator', 1],
      ['cargo_bay', 2],
      ['avionics', 1]
    ]);
  }

  protected haulerDesign(): ShipDesign {
    return this.design(HAULER, 'Lunar hauler', 'lander', [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 5],
      ['structure_truss', 1],
      ['landing_legs', 1],
      ['cargo_bay', 2],
      ['solar_array', 1],
      ['avionics', 1]
    ]);
  }

  protected loadAtEarth(v: Vessel, cargo: Record<string, number>, crew = 0): void {
    addOrder(v, {
      type: 'manifest',
      lines: [
        ...Object.entries(cargo).map(([m, kg]) => ({ item: { kind: 'cargo' as const, id: m }, amount: kg })),
        ...(crew > 0 ? [{ item: { kind: 'crew' as const }, amount: crew }] : [])
      ]
    });
    this.days(2);
  }

  protected moonOutpost(): void {
    if (this.lunarSite()) return;
    const lander = this.landerDesign();
    const cargo = {
      stainless_steel: 2800,
      copper: 400,
      platinum: 2,
      food_ration: 2200,
      aluminium: 300,
      nickel_superalloy: 200
    };
    this.supply(cargo);
    this.stationPropellant('methalox', 98_000);
    this.buildAtEarth(lander.id);
    const v = this.owned(lander.id)[0]!;
    this.loadAtEarth(v, cargo, CREW);
    const up = this.launchHeavy({ kind: 'ship', ship: v.id });
    if (!up) return;
    if (!this.fuelAndGo(v, 'methalox', 'luna')) return;
    const r = foundSite(this.game, v, 'life_support_plant', SOUTH_POLE);
    this.say(typeof r === 'string' ? `founding failed: ${r}` : `founded ${r.name}`);
    if (typeof r !== 'string') this.path.sites.push(r.id);
  }

  protected shuttle(cargo: Record<string, number>): boolean {
    const moon = this.lunarSite();
    if (!moon) return false;
    const design = this.haulerDesign();
    const cap = 82_000;
    this.supply(cargo);
    this.stationPropellant('methalox', cap);
    this.buildAtEarth(design.id);
    const v = this.owned(design.id)[0]!;
    this.loadAtEarth(v, cargo);
    if (!this.launchHeavy({ kind: 'ship', ship: v.id })) return false;
    if (!this.fuelAndGo(v, 'methalox', 'luna')) return false;
    addOrder(v, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
    this.fly(v, `${v.name} unloading`);
    const done = installModule(this.game, v);
    if (done) this.say(done);
    touch();
    return !done;
  }

  protected moonBuild(buildingId: string, process?: string, count = 1): boolean {
    const moon = this.lunarSite();
    if (!moon) return false;
    const have = standing(moon, buildingId) + moon.queue.filter((o) => o.building === buildingId).length;
    if (have < count) {
      const made = queueBuilding(economy, moon, buildingId, process ?? null, count - have);
      if (!made.length) this.say(`could not queue ${building(buildingId).name} on the Moon`);
    }
    return this.waitFor(
      () => standing(moon, buildingId) >= count,
      `${building(buildingId).name} on the Moon`,
      200,
      3
    );
  }

  protected chunks(cargo: Record<string, number>, room = 7_900): Record<string, number>[] {
    const out: Record<string, number>[] = [];
    let current: Record<string, number> = {};
    let left = room;
    for (const [m, total] of Object.entries(cargo).sort((a, b) => b[1] - a[1])) {
      let rest = total;
      while (rest > 1e-9) {
        const take = Math.min(rest, left);
        current[m] = (current[m] ?? 0) + take;
        rest -= take;
        left -= take;
        if (left <= 1e-9) {
          out.push(current);
          current = {};
          left = room;
        }
      }
    }
    if (Object.keys(current).length) out.push(current);
    return out;
  }

  protected upkeepDays(): number {
    return UPKEEP_DAYS;
  }

  protected foodItem(): string {
    return 'food_ration';
  }

  protected upkeep(): Record<string, number> {
    const moon = this.lunarSite();
    if (!moon) return {};
    const reactors = standing(moon, 'fission_reactor');
    const food = Math.max(0, moon.population * this.upkeepDays() - this.moonStock(this.foodItem()));
    const fuel = Math.max(0, reactors * 0.0104 * (this.upkeepDays() / 365) * 1000 - this.moonStock('haleu'));
    return {
      ...(food > 100 ? { [this.foodItem()]: Math.round(food) } : {}),
      ...(fuel > 5 ? { haleu: Math.round(fuel) } : {})
    };
  }

  protected deliverToMoon(base: Record<string, number>): void {
    const cargo = { ...base };
    for (const [m, kg] of Object.entries(this.upkeep())) cargo[m] = (cargo[m] ?? 0) + kg;
    const parts = this.chunks(cargo);
    for (const part of parts) this.shuttle(part);
  }

  protected moonStock(id: string): number {
    return this.lunarSite()?.stock[id] ?? 0;
  }

  reach(n: number): boolean {
    const done = super.reach(n);
    if (done && n === 13) this.launchNepTug();
    return done;
  }

  protected provideSite(n: number): void {
    if (n === 6) this.moonOutpost();
    if (n === 7) this.moonReactors();
    if (n === 8) this.moonIceMine();
    if (n === 11) this.moonBuild('greenhouse', this.moonProcess('greenhouse'));
    if (n === 15) this.sampleReturn();
    if (n === 16) this.carbonaceousMiner();
    if (n === 17) this.metallicMiner();
    if (n === 12) {
      this.moonBuild('electrolysis_plant');
      this.moonBuild('cryogenic_liquefaction_plant', this.moonProcess('cryogenic_liquefaction_plant'));
    }
  }

  protected provideBuilding(id: string): void {
    if (MOON_BUILDINGS.includes(id)) {
      if (!this.lunarSite()) return;
      this.moonBuild(id, this.moonProcess(id));
      return;
    }
    super.provideBuilding(id);
  }

  protected moonProcess(id: string): string | undefined {
    const moon = this.lunarSite();
    if (!moon) return undefined;
    const want = MOON_PROCESS[id];
    return want ? this.processOf(moon, id, want) : undefined;
  }

  protected tankerDesign(): ShipDesign {
    return this.design(TANKER, 'Lunar tanker', 'lander', [
      ['chemical_engine_hydrolox', 6],
      ['propellant_tank', 30],
      ['structure_truss', 1],
      ['landing_legs', 3],
      ['cargo_bay', 5],
      ['solar_array', 1],
      ['avionics', 1],
      ['mli_blanket', 2]
    ]);
  }

  protected moonBuildProcess(buildingId: string, process: string): boolean {
    const moon = this.lunarSite();
    if (!moon) return false;
    const running = () =>
      moon.groups.some((g) => g.building === buildingId && g.process === process && g.count > 0);
    if (!running() && !moon.queue.some((o) => o.building === buildingId && o.process === process))
      queueBuilding(economy, moon, buildingId, process);
    return this.waitFor(running, `${buildingId} for ${process}`, 200, 3);
  }

  cislunarSupply(): void {
    const moon = this.lunarSite();
    if (!moon || this.path.comparison) return;
    for (const b of ['regolith_oxygen_plant', 'sinter_printer', 'regolith_excavator', 'greenhouse'])
      this.switchOff(moon, b);
    this.moonBuildProcess('cryogenic_liquefaction_plant', 'lh2_liquefaction');
    const tanker = this.tankerDesign();
    this.stationPropellant('hydrolox', 80_000);
    this.buildAtEarth(tanker.id);
    const v = this.owned(tanker.id)[0]!;
    if (!this.launchHeavy({ kind: 'ship', ship: v.id })) return;
    if (!this.fuelAndGo(v, 'hydrolox', 'luna')) return;
    const station = this.station();
    const earth = importCost(this.game, this.earth, station);
    const load = TANKER_LOAD_KG;
    const hydrolox = PROPELLANTS.hydrolox.mix;
    const ready = () =>
      Object.entries(hydrolox).every(([m, share]) => (moon.stock[m] ?? 0) >= share * load) &&
      (moon.stock.lox ?? 0) >= TANKER_CARGO_KG;
    this.waitFor(ready, 'lunar hydrolox', 1500, 5);
    const before = station.stock.lox ?? 0;
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'hydrolox' }, amount: load });
    addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'lox' }, amount: TANKER_CARGO_KG });
    const filled = (v.propellant.hydrolox ?? 0) + load;
    addOrder(v, { type: 'fly', body: 'earth', angle: 0 });
    addOrder(v, { type: 'dock', site: station.id });
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'lox' }, amount: null });
    this.fly(v, 'lunar lox to the station');
    const burned = Math.max(0, filled - (v.propellant.hydrolox ?? 0));
    const delivered = (station.stock.lox ?? 0) - before;
    this.path.lunarLox = delivered;
    const moonCost = delivered > 0 ? (burned / delivered) * 1000 : null;
    const chose =
      moonCost !== null && (earth.perTonne === null || moonCost <= earth.perTonne) ? 'moon' : 'earth';
    this.path.comparison = { earth: earth.perTonne, moon: moonCost, chose };
    this.say(
      `a tonne at the station costs ${((earth.perTonne ?? 0) / 1000).toFixed(1)} t of propellant by launch from Earth and ${((moonCost ?? 0) / 1000).toFixed(1)} t from the Moon`
    );
  }

  protected nepDesign(): ShipDesign {
    return this.design(NEP_TUG, 'Nuclear electric tug', 'freighter', [
      ['ion_thruster', 14],
      ['copv', 8],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1],
      ['fission_reactor_ship', 6],
      ['structure_truss', 1],
      ['avionics', 1],
      ['radiator', 4],
      ['cargo_bay', 2],
      ['survey_suite', 1]
    ]);
  }

  protected ntrDesign(): ShipDesign {
    return this.design(NTR_HAULER, 'Nuclear thermal hauler', 'freighter', [
      ['ntr_engine', 1],
      ['propellant_tank', 40],
      ['structure_truss', 1],
      ['avionics', 1],
      ['cargo_bay', 2],
      ['solar_array', 1]
    ]);
  }

  protected probeDesign(): ShipDesign {
    return this.design(PROBE, 'Sample return probe', 'probe', [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 5],
      ['structure_truss', 1],
      ['avionics', 1],
      ['survey_suite', 1],
      ['sampling_arm', 1],
      ['heat_shield', 1],
      ['cargo_bay', 1],
      ['solar_array', 1]
    ]);
  }

  protected launchedShip(design: ShipDesign, cargo: Record<string, number>): Vessel | undefined {
    this.supply(cargo);
    this.buildAtEarth(design.id);
    const v = this.owned(design.id)[0]!;
    this.loadAtEarth(v, cargo);
    return this.launchHeavy({ kind: 'ship', ship: v.id }) ? v : undefined;
  }

  protected sampleReturn(): void {
    const stock = this.station().stock;
    if ((stock.carbonaceous_chondrite ?? 0) > 0) return;
    const probe = this.probeDesign();
    this.stationPropellant('methalox', 82_000);
    const v = this.launchedShip(probe, {});
    if (!v) return;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: null });
    addOrder(v, { type: 'fly', body: 'bennu', angle: 0 });
    addOrder(v, { type: 'survey', body: 'bennu' });
    addOrder(v, { type: 'sample' });
    addOrder(v, { type: 'fly', body: 'earth', angle: 0 });
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'carbonaceous_chondrite' }, amount: null });
    this.fly(v, 'the sample from Bennu', 9000);
    this.say('the sample from Bennu is at the station');
  }

  protected asteroidSite(world: string): Site | undefined {
    return siteAt(economy, world, 'surface');
  }

  protected found(v: Vessel, buildingId: string, world: string): Site | undefined {
    const region = regionsOf(world)[0]?.id ?? null;
    const r = foundSite(this.game, v, buildingId, region);
    this.say(typeof r === 'string' ? `founding on ${world} failed: ${r}` : `founded ${r.name}`);
    if (typeof r === 'string') return undefined;
    this.path.sites.push(r.id);
    const ore = MINED[world];
    const group = ore && r.groups.find((g) => g.building === buildingId);
    if (group && ore) assign(economy, r, group.id, extractionId(ore), group.count);
    touch();
    return r;
  }

  protected carbonaceousMiner(): void {
    if (this.asteroidSite('bennu')) return;
    const kit = { stainless_steel: 7000, nickel_superalloy: 300, ai_models: 4 };
    this.supply({ ai_models: 4 });
    const ntr = this.ntrDesign();
    this.stationPropellant('hydrogen', 45_000);
    const v = this.launchedShip(ntr, kit);
    if (!v) return;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'hydrogen' }, amount: null });
    addOrder(v, { type: 'fly', body: 'bennu', angle: 0 });
    addOrder(v, { type: 'land', body: 'bennu', region: 'bennu-body' });
    this.fly(v, 'the miner to Bennu', 3000);
    const site = this.found(v, 'asteroid_miner', 'bennu');
    if (site) this.minerSupport(site, 'asteroid_processor');
  }

  protected minerSupport(site: Site, buildingId: string): void {
    queueBuilding(economy, site, buildingId, null);
    this.waitFor(
      () => standing(site, buildingId) > 0,
      `${building(buildingId).name} on ${site.name}`,
      200,
      3
    );
  }

  nepTug?: Vessel;

  protected launchNepTug(): void {
    if (this.nepTug || this.asteroidSite('hertha')) return;
    const kit = { stainless_steel: 7000, nickel_superalloy: 500, ai_models: 4, carbon: 300 };
    this.supply({ ai_models: 4, carbon: 300 });
    const tug = this.nepDesign();
    this.cargoToStation({ xenon: 17_000, lox: 1_700, lch4: 500 });
    const v = this.launchedShip(tug, kit);
    if (!v) return;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'xenon' }, amount: null });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: 2000 });
    addOrder(v, { type: 'fly', body: 'hertha', angle: 0 });
    addOrder(v, { type: 'survey', body: 'hertha' });
    addOrder(v, { type: 'land', body: 'hertha', region: 'hertha-body' });
    this.nepTug = v;
    this.say('the nuclear electric tug left for Hertha');
    this.days(1);
  }

  protected metallicMiner(): void {
    if (this.asteroidSite('hertha')) return;
    this.launchNepTug();
    const v = this.nepTug;
    if (!v) return;
    this.fly(v, 'the tug at Hertha', 9000);
    const site = this.found(v, 'asteroid_miner', 'hertha');
    if (site) this.minerSupport(site, 'metal_refinery');
  }

  protected moonReactors(): void {
    const moon = this.lunarSite();
    if (!moon || standing(moon, 'fission_reactor') >= REACTORS) return;
    if (this.moonStock('haynes_230') < 800 * REACTORS) {
      this.supply({ ai_models: 12 });
      this.deliverToMoon({
        haynes_230: 800 * REACTORS,
        sodium: 150 * REACTORS,
        beryllium: 400 * REACTORS,
        boron_carbide: 150 * REACTORS,
        stainless_steel: 1500 * REACTORS,
        haleu: 20
      });
    }
    this.moonBuild('fission_reactor', undefined, REACTORS);
  }

  protected moonIceMine(): void {
    const moon = this.lunarSite();
    if (!moon || standing(moon, 'ice_mine') > 0) return;
    if (this.moonStock('li_ion_cell') < 200) this.deliverToMoon(MOON_KIT);
    const water = this.processOf(moon, 'ice_mine', 'extract:water');
    this.moonBuild('ice_mine', water);
    this.moonBuild(
      'regolith_excavator',
      this.processOf(moon, 'regolith_excavator', 'extract:lunar_regolith')
    );
  }

  protected processOf(site: Site, buildingId: string, want: string): string | undefined {
    return unlockedProcesses(economy, site, buildingId).find((p) => p.id === want)?.id;
  }

  protected switchOff(site: Site, buildingId: string): void {
    for (const g of site.groups) if (g.building === buildingId) setOn(site, g.id, false);
    touch();
  }
}
