import { statsFor } from './classes.svelte.ts';
import { building, projectById } from './data/index.ts';
import {
  assign,
  biospheresAt,
  economy,
  extractionId,
  queueBuilding,
  setOn,
  siteIn,
  standing,
  touch,
  type Site
} from './economy/index.ts';
import { JumpPlayer } from './playJump.ts';
import { SOUTH_POLE } from './playPath.ts';
import type { ShipDesign } from './shipdesign/index.ts';
import {
  addOrder,
  foundSite,
  installModule,
  orderShips,
  propellantAvailable,
  ships,
  type Vessel
} from './ships/index.ts';

const HAULER = 'jump-hauler';
const SCOUT = 'jump-scout';
const SCOOP_SHIP = 'jump-scoop-ship';
const FOUNDER = 'jump-founder';
const POWER_SHIP = 'jump-power';
const SETTLER = 'jump-settler';
const BIOSPHERE = 'biosphere';
const DIGGER = 'regolith_excavator';
const REGOLITH = extractionId('lunar_regolith');

export const MARIA = 'luna-maria';
export const JUMP = 'sol-a';
export const GIANT = 'uranus';

const SEPARATORS = 200;
const DEUTERIUM_CHUNK_KG = 36_000;
const HAULER_DEUTERIUM_KG = 140_000;
const HAULER_STEEL_KG = 240_000;
const HAULER_METHALOX_KG = 18_000;
const SCOUT_DEUTERIUM_KG = 14_000;
const SCOOP_DEUTERIUM_KG = 45_000;
const FOUNDER_DEUTERIUM_KG = 40_000;
const FOUNDER_CREW = 6;
const FOUNDER_WHEAT_KG = 26_000;
const MARIA_WHEAT_KG = 5_500;
const STABILISER_STEEL_KG = 200_000;
const STEEL_HAUL_KG = 201_000;
const JUMP_WHEAT_KG = 30_000;
const STATION_WHEAT_KEPT_KG = 60_000;
const POWER_SHIPS = 14;
const POWER_SHIP_DEUTERIUM_KG = 20_000;
const JUMP_POWER_KW = 32_000;
const EXOTIC_KG = 0.012;
const CNT_FIBRE_KG = 5_300;
const METHANE_KG = 14_000;

export interface Trip {
  label: string;
  from: number;
  days: number;
}

export class OuterPlayer extends JumpPlayer {
  readonly trips: Trip[] = [];
  protected hauler?: Vessel;
  protected scoutShip?: Vessel;

  protected timed(label: string, run: () => boolean): boolean {
    const from = this.game.time;
    const ok = run();
    this.trips.push({ label, from, days: (this.game.time - from) / 86_400_000 });
    return ok;
  }

  protected supplyRate(id: string, short: number): number {
    return id === 'deuterium' ? 0.001 : super.supplyRate(id, short);
  }

  protected earthProcess(buildingId: string, process: string, count: number, limit = 1500): boolean {
    const earth = this.earth;
    this.pin(buildingId, process);
    const have = () =>
      earth.groups
        .filter((g) => g.building === buildingId && g.process === process)
        .reduce((a, g) => a + g.count, 0);
    const queued = earth.queue.filter((o) => o.building === buildingId && o.process === process).length;
    if (have() + queued < count) queueBuilding(economy, earth, buildingId, process, count - have() - queued);
    return this.waitFor(() => have() >= count, `${buildingId} for ${process}`, limit, 3);
  }

  protected separators(): void {
    this.earthProcess('isotope_separator', 'deuterium_separation', SEPARATORS, 3000);
  }

  protected deuteriumAt(kg: number): void {
    const st = this.station();
    let guard = 0;
    while (propellantAvailable(st, 'deuterium') < kg - 5 && guard++ < 12) {
      this.separators();
      this.cargoToStation({
        deuterium: Math.min(DEUTERIUM_CHUNK_KG, kg - propellantAvailable(st, 'deuterium'))
      });
    }
  }

  protected fusionDesign(
    id: string,
    name: string,
    role: ShipDesign['role'],
    parts: readonly (readonly [string, number])[]
  ): ShipDesign {
    return this.design(
      id,
      name,
      role,
      parts,
      [
        ['methalox', parts.some(([c]) => c === 'chemical_engine_methalox') ? 9_000 : 0],
        ['deuterium', 1e9]
      ],
      'orbital_shipyard'
    );
  }

  protected haulerDesign2(): ShipDesign {
    return this.fusionDesign(HAULER, 'Fusion hauler', 'freighter', [
      ['fusion_drive', 1],
      ['radiator', 45],
      ['cargo_bay', 60],
      ['propellant_tank', 48],
      ['structure_truss', 4],
      ['avionics', 1],
      ['chemical_engine_methalox', 1]
    ]);
  }

  protected scoutDesign(): ShipDesign {
    return this.fusionDesign(SCOUT, 'Fusion scout', 'probe', [
      ['fusion_drive', 1],
      ['radiator', 45],
      ['survey_suite', 1],
      ['propellant_tank', 14],
      ['structure_truss', 1],
      ['avionics', 1],
      ['cargo_bay', 1]
    ]);
  }

  protected scoopShipDesign(): ShipDesign {
    return this.fusionDesign(SCOOP_SHIP, 'Scoop carrier', 'freighter', [
      ['fusion_drive', 1],
      ['radiator', 45],
      ['cargo_bay', 6],
      ['propellant_tank', 22],
      ['structure_truss', 1],
      ['avionics', 1]
    ]);
  }

  protected founderDesign(): ShipDesign {
    return this.fusionDesign(FOUNDER, 'Jump point founder', 'freighter', [
      ['fusion_drive', 2],
      ['radiator', 90],
      ['habitat_module', 1],
      ['life_support_unit', 1],
      ['cargo_bay', 10],
      ['propellant_tank', 24],
      ['structure_truss', 2],
      ['avionics', 1]
    ]);
  }

  protected powerShipDesign(): ShipDesign {
    return this.fusionDesign(POWER_SHIP, 'Jump point power ship', 'transfer', [
      ['fusion_drive', 2],
      ['radiator', 90],
      ['propellant_tank', 24],
      ['structure_truss', 2],
      ['avionics', 1]
    ]);
  }

  protected powerJump(site: Site): void {
    if (site.gridKw >= JUMP_POWER_KW) return;
    const st = this.station();
    const design = this.powerShipDesign();
    const cost = statsFor(design).cost;
    const docked = () => this.owned(design.id, st.id);
    const wanted = Math.min(
      POWER_SHIPS,
      Math.ceil((JUMP_POWER_KW - site.gridKw) / statsFor(design).power.made)
    );
    const ordered = docked().length + st.yard.filter((o) => o.design === design.id).length;
    if (ordered < wanted) {
      const all = Object.fromEntries(Object.entries(cost).map(([m, kg]) => [m, kg * (wanted - ordered)]));
      let guard = 0;
      while (Object.keys(this.missingAtStation(all)).length && guard++ < 20)
        this.deliverToStation(this.missingAtStation(all));
      const r = orderShips(st, design.id, wanted - ordered);
      if (typeof r === 'string') throw new Error(`could not order the power ships: ${r}`);
    }
    if (!this.waitFor(() => docked().length >= wanted, 'the power ships', 3000, 3))
      throw new Error('the power ships were not built');
    const fleet = docked().slice(0, wanted);
    for (const v of fleet) {
      this.deuteriumAt(POWER_SHIP_DEUTERIUM_KG);
      addOrder(v, {
        type: 'load',
        item: { kind: 'propellant', id: 'deuterium' },
        amount: POWER_SHIP_DEUTERIUM_KG
      });
      addOrder(v, { type: 'fly', body: JUMP, angle: 0 });
      addOrder(v, { type: 'dock', site: site.id });
      this.days(1);
    }
    const arrived = this.timed('the power ships to the jump point', () =>
      this.waitFor(() => fleet.every((v) => this.flightDone(v) || !!v.blocked), 'the power ships', 9000, 1)
    );
    for (const v of fleet) {
      if (!arrived || v.blocked)
        throw new Error(`${v.name} to the jump point: ${v.blocked ?? 'it did not arrive'}`);
      const done = installModule(this.game, v);
      if (done) throw new Error(done);
    }
    this.say(`${fleet.length} power ships installed at ${site.name}: ${Math.round(site.gridKw / 1000)} MW`);
    touch();
  }

  protected buildAtStation(design: ShipDesign): Vessel | undefined {
    const st = this.station();
    const have = this.owned(design.id, st.id).length + st.yard.filter((o) => o.design === design.id).length;
    if (have < 1) {
      let guard = 0;
      const missing = () => this.missingAtStation(statsFor(design).cost);
      while (Object.keys(missing()).length && guard++ < 10) this.deliverToStation(missing());
      const r = orderShips(st, design.id, 1);
      if (typeof r === 'string') {
        this.say(`could not order ${design.name}: ${r}`);
        return undefined;
      }
    }
    this.waitFor(() => this.owned(design.id, st.id).length >= 1, design.name, 900, 3);
    return this.owned(design.id, st.id)[0];
  }

  protected loadFrom(v: Vessel, items: Record<string, number>): void {
    for (const [m, kg] of Object.entries(items))
      addOrder(v, { type: 'load', item: { kind: 'cargo', id: m }, amount: kg });
  }

  protected provideSite(n: number): void {
    if (n === 19) return this.chipFab();
    if (n === 22) return this.fusionPlant();
    if (n === 23) return this.mariaOutpost();
    if (n === 24) return this.fusionFlight();
    if (n === 26) return this.fibre();
    if (n === 28) return this.exotic();
    if (n === 29) return this.stabiliser();
    super.provideSite(n);
  }

  protected provideBuilding(id: string): void {
    if (id === 'solar_power_station' || id === 'exotic_matter_facility') {
      this.ensureSteel(20_000);
      this.stationBuild(id);
      return;
    }
    if (id === 'gas_giant_scoop') return this.scoopMission();
    if (id === 'jump_point_stabiliser') return this.stabiliser();
    super.provideBuilding(id);
  }

  protected ensureSteel(kg: number): void {
    if (this.steelAt(this.station()) >= kg) return;
    if (!this.hauler) this.steelRun(HAULER_STEEL_KG);
  }

  protected chipFab(): void {
    const st = this.station();
    if (standing(st, 'semiconductor_fab') > 0 && standing(st, 'solar_cell_fab') > 0) return;
    this.stationBuild('semiconductor_fab');
    this.stationBuild('solar_cell_fab');
    for (const b of ['semiconductor_fab', 'solar_cell_fab']) this.switchOff(st, b);
  }

  protected fusionPlant(): void {
    const earth = this.earth;
    if (earth.groups.some((g) => g.process === 'd_t_fusion_power' && g.count > 0)) return;
    this.earthProcess('isotope_separator', 'lithium6_separation', 2);
    this.earthProcess('fusion_plant', 'tritium_breeding', 2);
    this.waitFor(() => (earth.stock.tritium ?? 0) > 1 && (earth.stock.deuterium ?? 0) > 1, 'tritium', 600, 3);
    this.earthProcess('fusion_plant', 'd_t_fusion_power', 1);
  }

  protected mariaShip?: Vessel;

  protected must(ok: boolean, v: Vessel, label: string): void {
    if (!ok) throw new Error(`${label}: ${v.blocked ?? 'it did not arrive'}`);
  }

  protected mariaOutpost(): void {
    if (siteIn(economy, 'luna', 'surface', MARIA)) return;
    const lander = this.landerDesign();
    const kit = {
      stainless_steel: 800,
      li_ion_cell: 200,
      ai_models: 1,
      ndfeb_magnet: 50,
      copper: 100
    };
    let v = this.mariaShip;
    if (!v || !ships.vessels.includes(v)) {
      this.stationPropellant('methalox', 98_000);
      this.buildAtEarth(lander.id);
      v = this.owned(lander.id)[0];
      if (!v) throw new Error('there is no lander for the maria');
      let tries = 0;
      const left = () =>
        Object.fromEntries(
          Object.entries(kit)
            .map(([m, kg]) => [m, kg - (v!.cargo[m] ?? 0)] as const)
            .filter(([, kg]) => kg > 1e-6)
        );
      while (Object.keys(left()).length && tries++ < 8) {
        this.supply(left());
        this.loadAtEarth(v, left(), v.crew > 0 ? 0 : 1);
      }
      if (Object.keys(left()).length)
        throw new Error(`the maria kit is short of ${Object.keys(left()).join(', ')}`);
      if (!this.launchHeavy({ kind: 'ship', ship: v.id })) throw new Error('the maria lander did not launch');
      this.mariaShip = v;
      addOrder(v, { type: 'dock', site: this.station().id });
      addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'wheat' }, amount: MARIA_WHEAT_KG });
      addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: null });
      addOrder(v, { type: 'fly', body: 'luna', angle: 0 });
      addOrder(v, { type: 'land', body: 'luna', region: MARIA });
      this.must(this.fly(v, 'the maria lander'), v, 'the maria lander');
    }
    const r = foundSite(this.game, v, 'regolith_excavator', MARIA);
    if (typeof r === 'string') throw new Error(`founding in the maria failed: ${r}`);
    this.say(`founded ${r.name}`);
    this.path.sites.push(r.id);
    const group = r.groups.find((g) => g.building === 'regolith_excavator');
    if (group) assign(economy, r, group.id, extractionId('helium3'), group.count);
    touch();
  }

  protected steelRun(kg: number): boolean {
    const st = this.station();
    const hertha = this.asteroidSite('hertha');
    const design = this.haulerDesign2();
    const v = this.hauler ?? this.buildAtStation(design);
    if (!v || !hertha) return false;
    this.hauler = v;
    this.deuteriumAt(HAULER_DEUTERIUM_KG);
    this.stationPropellant('methalox', HAULER_METHALOX_KG);
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'deuterium' }, amount: null });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: HAULER_METHALOX_KG });
    addOrder(v, { type: 'fly', body: 'hertha', angle: 0 });
    addOrder(v, { type: 'land', body: 'hertha', region: 'hertha-body' });
    addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'asteroidal_steel' }, amount: kg });
    addOrder(v, { type: 'fly', body: 'hertha', angle: 0 });
    addOrder(v, { type: 'fly', body: 'earth', angle: 0 });
    addOrder(v, { type: 'dock', site: st.id });
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'asteroidal_steel' }, amount: null });
    const ok = this.timed('the fusion hauler brings steel from Hertha', () =>
      this.fly(v, 'the hauler', 20_000)
    );
    this.say(
      ok
        ? `the hauler delivered steel: the station holds ${Math.round(this.steelAt(st) / 1000)} t`
        : `the hauler is stuck: ${v.blocked}`
    );
    this.must(ok, v, 'the steel run');
    return ok;
  }

  protected fusionFlight(): void {
    if (this.game.jump(JUMP)?.point.surveyed) return;
    const v = this.scoutShip ?? this.buildAtStation(this.scoutDesign());
    if (!v) return;
    this.scoutShip = v;
    this.deuteriumAt(SCOUT_DEUTERIUM_KG);
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'deuterium' }, amount: SCOUT_DEUTERIUM_KG });
    addOrder(v, { type: 'fly', body: JUMP, angle: 0, profile: 'fastest' });
    addOrder(v, { type: 'survey', body: JUMP });
    this.must(
      this.timed('the fusion scout to the jump point', () => this.fly(v, 'the scout', 6000)),
      v,
      'the fusion scout'
    );
  }

  protected scoopCarrier?: Vessel;

  protected scoopMission(): void {
    if (siteIn(economy, GIANT, 'surface', null)) return;
    let v = this.scoopCarrier;
    if (!v || !ships.vessels.includes(v)) {
      this.ensureSteel(20_000);
      v = this.buildAtStation(this.scoopShipDesign());
      if (!v) throw new Error('there is no scoop carrier');
      const kit = { asteroidal_steel: 20_000, rebco: 50, uhtc: 500, ai_models: 5 };
      let guard = 0;
      const outstanding = () =>
        Object.fromEntries(
          Object.entries(this.missingAtStation(kit)).filter(([m]) => m !== 'asteroidal_steel')
        );
      while (Object.keys(outstanding()).length && guard++ < 6) this.deliverToStation(outstanding());
      this.deuteriumAt(SCOOP_DEUTERIUM_KG);
      addOrder(v, {
        type: 'load',
        item: { kind: 'propellant', id: 'deuterium' },
        amount: SCOOP_DEUTERIUM_KG
      });
      this.loadFrom(v, kit);
      addOrder(v, { type: 'fly', body: GIANT, angle: 0 });
      this.scoopCarrier = v;
      const ship = v;
      this.must(
        this.timed('the scoop carrier to the gas giant', () => this.fly(ship, 'the scoop carrier', 9000)),
        v,
        'the scoop carrier'
      );
    }
    const r = foundSite(this.game, v, 'gas_giant_scoop');
    if (typeof r === 'string') throw new Error(`founding the scoop failed: ${r}`);
    this.say(`founded ${r.name}`);
    this.path.sites.push(r.id);
    const group = r.groups.find((g) => g.building === 'gas_giant_scoop');
    if (group) assign(economy, r, group.id, extractionId('helium3'), group.count);
    touch();
  }

  protected fibre(): void {
    const st = this.station();
    if ((st.stock.cnt_fibre ?? 0) >= CNT_FIBRE_KG) return;
    this.stationBuild('fibre_works', 1, 'cnt_fibre_growth');
    let guard = 0;
    const need = { methane: METHANE_KG };
    while (Object.keys(this.missingAtStation(need)).length && guard++ < 6)
      this.deliverToStation(this.missingAtStation(need));
    this.waitFor(() => (st.stock.cnt_fibre ?? 0) >= CNT_FIBRE_KG, 'carbon nanotube fibre in orbit', 1500, 3);
    this.switchOff(st, 'fibre_works');
  }

  protected exotic(): void {
    const st = this.station();
    if ((st.stock.exotic_matter ?? 0) >= EXOTIC_KG) return;
    if (standing(st, 'exotic_matter_facility') <= 0) return;
    const need = { rt_superconductor: 20 };
    let guard = 0;
    while (Object.keys(this.missingAtStation(need)).length && guard++ < 6)
      this.deliverToStation(this.missingAtStation(need));
    this.waitFor(() => (st.stock.exotic_matter ?? 0) >= EXOTIC_KG, 'exotic matter', 2000, 3);
  }

  protected jumpSite(): Site | undefined {
    return economy.sites.find((s) => s.place === 'point' && s.worldBody === JUMP);
  }

  protected founderShip?: Vessel;

  protected stabiliser(): void {
    const existing = this.jumpSite();
    if (existing && standing(existing, 'jump_point_stabiliser') > 0) return;
    const site = existing ?? this.foundJump();
    if ((site.stock.asteroidal_steel ?? 0) < STABILISER_STEEL_KG - 1) this.haulSteelToJump(site);
    this.powerJump(site);
    if (
      standing(site, 'jump_point_stabiliser') <= 0 &&
      !site.queue.some((o) => o.building === 'jump_point_stabiliser')
    )
      queueBuilding(economy, site, 'jump_point_stabiliser', null);
    this.switchOn(site, 'data_centre');
    const done = this.waitFor(() => standing(site, 'jump_point_stabiliser') > 0, 'the stabiliser', 3000, 5);
    if (!done) throw new Error('the stabiliser did not finish at the jump point');
    this.say('the stabiliser stands at the jump point');
  }

  protected foundJump(): Site {
    const st = this.station();
    let f = this.founderShip;
    if (!f || !ships.vessels.includes(f)) {
      const crewed = st.population >= FOUNDER_CREW * 2 || this.crewedStation(FOUNDER_CREW);
      if (!crewed) throw new Error('there is no crew for the jump point');
      f = this.buildAtStation(this.founderDesign());
      if (!f) throw new Error('there is no founder ship');
      const kit = {
        machinery: 2000,
        rad_hard_ic: 6000,
        ai_models: 21,
        rt_superconductor: 520,
        exotic_matter: 0.0105,
        cnt_fibre: 5100,
        wheat: FOUNDER_WHEAT_KG
      };
      const outstanding = () =>
        Object.fromEntries(
          Object.entries(this.missingAtStation(kit)).filter(
            ([m]) => m !== 'exotic_matter' && m !== 'cnt_fibre' && m !== 'wheat'
          )
        );
      let guard = 0;
      while (Object.keys(outstanding()).length && guard++ < 8) this.deliverToStation(outstanding());
      for (const m of ['exotic_matter', 'cnt_fibre', 'wheat'] as const)
        if ((st.stock[m] ?? 0) < kit[m]) throw new Error(`the station is short of ${m} for the founder`);
      this.deuteriumAt(FOUNDER_DEUTERIUM_KG);
      addOrder(f, {
        type: 'load',
        item: { kind: 'propellant', id: 'deuterium' },
        amount: FOUNDER_DEUTERIUM_KG
      });
      addOrder(f, { type: 'load', item: { kind: 'crew' }, amount: FOUNDER_CREW });
      this.loadFrom(f, kit);
      addOrder(f, { type: 'fly', body: JUMP, angle: 0 });
      this.founderShip = f;
      const ship = f;
      this.must(
        this.timed('the founder to the jump point', () => this.fly(ship, 'the founder', 9000)),
        f,
        'the founder'
      );
    }
    const site = foundSite(this.game, f, 'data_centre');
    if (typeof site === 'string') throw new Error(`founding at the jump point failed: ${site}`);
    this.say(
      `founded ${site.name} with ${site.population} people and ${Math.round(site.stock.wheat ?? 0)} kg of wheat`
    );
    this.path.sites.push(site.id);
    this.switchOff(site, 'data_centre');
    return site;
  }

  protected haulSteelToJump(site: Site): void {
    const st = this.station();
    const h = this.hauler;
    if (!h) throw new Error('there is no hauler for the stabiliser steel');
    if (this.steelAt(st) < STABILISER_STEEL_KG) throw new Error('there is not enough asteroidal steel');
    this.deuteriumAt(HAULER_DEUTERIUM_KG);
    addOrder(h, { type: 'load', item: { kind: 'propellant', id: 'deuterium' }, amount: null });
    addOrder(h, {
      type: 'load',
      item: { kind: 'cargo', id: 'asteroidal_steel' },
      amount: STEEL_HAUL_KG
    });
    const wheat = Math.min(JUMP_WHEAT_KG, (st.stock.wheat ?? 0) - STATION_WHEAT_KEPT_KG);
    if (wheat > 0) addOrder(h, { type: 'load', item: { kind: 'cargo', id: 'wheat' }, amount: wheat });
    addOrder(h, { type: 'fly', body: JUMP, angle: 0 });
    addOrder(h, { type: 'dock', site: site.id });
    addOrder(h, { type: 'unload', item: { kind: 'cargo', id: 'asteroidal_steel' }, amount: null });
    this.must(
      this.timed('the fusion hauler to the jump point', () => this.fly(h, 'the hauler', 9000)),
      h,
      'the hauler to the jump point'
    );
    const done = installModule(this.game, h);
    if (done) this.say(done);
    touch();
  }

  readonly biospheres: { site: string; at: number }[] = [];
  protected settling = false;

  protected keepFed(): void {
    super.keepFed();
    this.settle();
  }

  protected settle(): void {
    if (this.settling || this.feeding || this.building > 0) return;
    if (!economy.done.includes(projectById(BIOSPHERE).number)) return;
    const site = economy.sites.find(
      (s) =>
        s.place === 'surface' &&
        s.worldBody === 'luna' &&
        s.population >= 0.5 &&
        biospheresAt(s) + s.queue.filter((o) => o.building === BIOSPHERE).length === 0
    );
    if (!site) return;
    this.settling = true;
    try {
      this.raiseBiosphere(site);
    } finally {
      this.settling = false;
    }
  }

  protected settlerDesign(): ShipDesign {
    return this.design(SETTLER, 'Biosphere freighter', 'lander', [
      ['chemical_engine_methalox', 2],
      ['propellant_tank', 16],
      ['structure_truss', 1],
      ['landing_legs', 3],
      ['cargo_bay', 8],
      ['solar_array', 1],
      ['avionics', 1]
    ]);
  }

  protected digsRegolith(site: Site): boolean {
    return site.groups.some((g) => g.building === DIGGER && g.process === REGOLITH);
  }

  protected raiseBiosphere(site: Site): void {
    const design = this.settlerDesign();
    const digger = !this.digsRegolith(site);
    const need: Record<string, number> = {};
    for (const cost of [building(BIOSPHERE).cost, ...(digger ? [building(DIGGER).cost] : [])])
      for (const [m, kg] of Object.entries(cost)) need[m] = (need[m] ?? 0) + kg;
    for (const m of Object.keys(need)) need[m] = Math.max(0, need[m]! - (site.stock[m] ?? 0));
    const cargo = Object.fromEntries(Object.entries(need).filter(([, kg]) => kg > 1e-6));
    for (const part of this.chunks(cargo, statsFor(design).payloadCapacity))
      if (!this.ferry(design, part, site.region ?? SOUTH_POLE)) {
        this.say(`the biosphere kit did not reach ${site.name}`);
        return;
      }
    if (digger) queueBuilding(economy, site, DIGGER, REGOLITH);
    for (const g of site.groups) if (g.building === DIGGER && g.process === REGOLITH) setOn(site, g.id, true);
    queueBuilding(economy, site, BIOSPHERE, null);
    this.biospheres.push({ site: site.id, at: this.game.time });
    this.say(`queued a biosphere at ${site.name}`);
    touch();
  }

  protected ferry(design: ShipDesign, cargo: Record<string, number>, region: string): boolean {
    this.supply(cargo);
    this.stationPropellant('methalox', statsFor(design).capacity.methalox ?? 0);
    this.buildAtEarth(design.id);
    const v = this.owned(design.id)[0];
    if (!v) return false;
    this.loadAtEarth(v, cargo);
    if (!this.launchHeavy({ kind: 'ship', ship: v.id })) return false;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: null });
    addOrder(v, { type: 'fly', body: 'luna', angle: 0 });
    addOrder(v, { type: 'land', body: 'luna', region });
    addOrder(v, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
    if (!this.fly(v, `${v.name} with a biosphere kit`)) return false;
    const done = installModule(this.game, v);
    if (done) this.say(done);
    touch();
    return !done;
  }
}
