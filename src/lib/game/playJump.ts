import { statsFor } from './classes.svelte.ts';
import { building, material } from './data/index.ts';
import {
  economy,
  flowsOf,
  isStockless,
  kcalOf,
  queueBuilding,
  setOn,
  standing,
  touch,
  type Site
} from './economy/index.ts';
import { PathPlayer } from './playPath.ts';
import { addOrder, installModule, orderShips, ships, type Payload, type Vessel } from './ships/index.ts';
import { SOUTH_POLE } from './playPath.ts';
import type { ShipDesign } from './shipdesign/index.ts';

const BARGE = 'jump-barge';
const TENDER = 'jump-tender';
const FOOD_HAULER = 'jump-food-hauler';

const XENON_KG = 150_000;
const FOOD_MIN_DAYS = 700;
const FOOD_TOP_UP_DAYS = 2_300;
const MOON_FOOD_KG = 7_500;
const FOOD_RESERVE_LAUNCHES = 14;
const ACCELERATOR_KG = 3_000;
const FOOD_RESERVE_CHUNK_KG = 36_000;
const XENON_CHUNK_KG = 36_000;
const BARGE_METHALOX_KG = 9_000;
const STEEL_LOAD_KG = 52_000;
const BARGE_CARBON_KG = 3_000;
const HERTHA_REGION = 'hertha-body';

export class JumpPlayer extends PathPlayer {
  barge?: Vessel;
  protected bargePhase: 'out' | 'landed' | 'back' = 'out';

  protected bargeDesign(): ShipDesign {
    return this.design(BARGE, 'Steel barge', 'freighter', [
      ['ion_thruster', 29],
      ['copv', 54],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 2],
      ['fission_reactor_ship', 20],
      ['structure_truss', 1],
      ['avionics', 1],
      ['radiator', 13],
      ['cargo_bay', 13]
    ]);
  }

  protected foodHaulerDesign(): ShipDesign {
    return this.design(FOOD_HAULER, 'Food hauler', 'lander', [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 5],
      ['structure_truss', 1],
      ['landing_legs', 1],
      ['cargo_bay', 2],
      ['solar_array', 1],
      ['avionics', 1]
    ]);
  }

  protected tenderDesign(): ShipDesign {
    return this.design(
      TENDER,
      'Orbital tender',
      'probe',
      [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 1],
        ['structure_truss', 1],
        ['avionics', 1],
        ['solar_array', 1]
      ],
      undefined,
      'orbital_shipyard'
    );
  }

  protected launchNepTug(): void {
    const first = !this.nepTug;
    super.launchNepTug();
    if (first && this.nepTug) this.launchBarge();
  }

  launchBarge(): void {
    if (this.barge) return;
    const barge = this.bargeDesign();
    let guard = 0;
    while (this.station().stock.xenon === undefined || (this.station().stock.xenon ?? 0) < XENON_KG - 2000) {
      if (guard++ > 12) break;
      this.cargoToStation({ xenon: XENON_CHUNK_KG });
    }
    this.cargoToStation({ carbon: BARGE_CARBON_KG });
    this.stationPropellant('methalox', BARGE_METHALOX_KG);
    this.buildAtEarth(barge.id);
    const v = this.owned(barge.id)[0];
    if (!v) return;
    const up = this.launchHeavy({ kind: 'ship', ship: v.id });
    if (!up) return;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'xenon' }, amount: null });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: BARGE_METHALOX_KG });
    addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'carbon' }, amount: BARGE_CARBON_KG });
    addOrder(v, { type: 'fly', body: 'hertha', angle: 0 });
    this.barge = v;
    this.say('the steel barge left for Hertha');
    this.days(1);
  }

  protected steelAt(site: Site | undefined): number {
    return site?.stock.asteroidal_steel ?? 0;
  }

  fetchSteel(kg = STEEL_LOAD_KG): boolean {
    const v = this.barge;
    const hertha = this.asteroidSite('hertha');
    if (!v || !hertha) return false;
    if (v.orders.length || v.trip) this.fly(v, 'the barge', 13_000);
    if (v.blocked) return false;
    const at = (): Vessel['at'] => v.at;
    const landed = () => {
      const w = at();
      return w.kind === 'site' && w.site === hertha.id;
    };
    const inOrbit = () => {
      const w = at();
      return w.kind === 'orbit' && w.body === 'hertha';
    };
    if (this.bargePhase === 'out' && inOrbit()) {
      addOrder(v, { type: 'land', body: 'hertha', region: HERTHA_REGION });
      if ((v.cargo.carbon ?? 0) > 0)
        addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'carbon' }, amount: null });
      this.fly(v, 'the barge landing at Hertha', 400);
      if (landed()) this.bargePhase = 'landed';
    }
    if (this.bargePhase === 'landed') {
      this.waitFor(() => this.steelAt(hertha) >= kg, 'steel at Hertha', 4000, 5);
      addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'asteroidal_steel' }, amount: kg });
      addOrder(v, { type: 'fly', body: 'hertha', angle: 0 });
      addOrder(v, { type: 'fly', body: 'earth', angle: 0 });
      addOrder(v, { type: 'dock', site: this.station().id });
      addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'asteroidal_steel' }, amount: null });
      this.bargePhase = 'back';
      this.fly(v, 'steel to the station', 13_000);
    }
    return this.steelAt(this.station()) >= kg - 1;
  }

  protected switchOn(site: Site, buildingId: string): void {
    for (const g of site.groups) if (g.building === buildingId) setOn(site, g.id, true);
    touch();
  }

  readonly hunger: { site: string; at: number }[] = [];

  protected feeding = false;
  protected building = 0;

  protected buildAtEarth(designId: string, n = 1): void {
    this.building++;
    try {
      super.buildAtEarth(designId, n);
    } finally {
      this.building--;
    }
  }

  protected launchHeavy(payload: Payload): Vessel | undefined {
    this.building++;
    try {
      return super.launchHeavy(payload);
    } finally {
      this.building--;
    }
  }

  protected readonly warned = new Map<string, number>();

  days(n: number): void {
    let left = n;
    while (left > 1e-9) {
      const step = Math.min(left, 30);
      super.days(step);
      left -= step;
      this.keepFed();
    }
  }

  foodDays(site: Site): number {
    const food = flowsOf(site).food;
    const deficit = food.demand - food.made;
    if (deficit <= 1e-9) return Infinity;
    const stock = Object.entries(site.stock).reduce((a, [m, kg]) => a + kg * kcalOf(m), 0);
    return stock / deficit / 24;
  }

  protected keepFed(): void {
    if (this.feeding || this.building > 0) return;
    this.feeding = true;
    try {
      for (const site of [...economy.sites]) {
        if (site.id === 'earth' || site.population < 0.5) continue;
        if (site.alerts.food && !this.hunger.some((h) => h.site === site.id))
          this.hunger.push({ site: site.id, at: this.game.time });
        if (this.foodDays(site) < FOOD_MIN_DAYS) this.feed(site);
      }
      const st = this.orbital();
      if (st && this.reserved) {
        if (standing(st, 'data_centre') > 0 && (st.stock.ai_accelerator ?? 0) < 150)
          this.deliverToStation({ ai_accelerator: ACCELERATOR_KG });
        if (standing(st, 'fission_reactor') > 0 && (st.stock.haleu ?? 0) < 40)
          this.deliverToStation({ haleu: 300 });
      }
    } finally {
      this.feeding = false;
    }
  }

  protected reserved = false;

  crewedStation(crew = 6): boolean {
    const ok = super.crewedStation(crew);
    if (ok && !this.reserved) {
      this.reserved = true;
      this.foodReserve();
    }
    return ok;
  }

  protected foodReserve(): void {
    for (let i = 0; i < FOOD_RESERVE_LAUNCHES; i++) this.cargoToStation({ wheat: FOOD_RESERVE_CHUNK_KG });
    this.say(
      `the station holds ${Math.round((this.station().stock.wheat ?? 0) / 1000)} t of wheat in reserve`
    );
  }

  protected feed(site: Site): void {
    const st = this.orbital();
    if (!this.reserved) return;
    if (st && site.id === st.id) {
      this.warnOnce(site, `${site.name} is running short of its wheat reserve`);
      return;
    }
    if (site.id === 'luna' || site.region === 'luna-maria') {
      const kg = Math.min(MOON_FOOD_KG, Math.max(1000, Math.ceil(site.population) * FOOD_TOP_UP_DAYS * 0.86));
      if (st && (st.stock.wheat ?? 0) >= kg + 1000) {
        this.say(`feeding ${site.name}: ${Math.round(kg)} kg of wheat from the station`);
        this.moonFood(kg, site.region ?? SOUTH_POLE);
        return;
      }
    }
    this.warnOnce(site, `${site.name} is short of food and nothing is sent`);
  }

  protected warnOnce(site: Site, text: string): void {
    const year = Math.floor(this.game.time / (365 * 86_400_000));
    if (this.warned.get(site.id) === year) return;
    this.warned.set(site.id, year);
    this.say(text);
  }

  protected moonFood(kg: number, region: string): boolean {
    const moon = this.lunarSite();
    if (!moon) return false;
    const design = this.foodHaulerDesign();
    this.stationPropellant('methalox', 82_000);
    this.buildAtEarth(design.id);
    const v = this.owned(design.id)[0];
    if (!v) return false;
    if (!this.launchHeavy({ kind: 'ship', ship: v.id })) return false;
    addOrder(v, { type: 'dock', site: this.station().id });
    addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'wheat' }, amount: kg });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: null });
    addOrder(v, { type: 'fly', body: 'luna', angle: 0 });
    addOrder(v, { type: 'land', body: 'luna', region });
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'wheat' }, amount: null });
    if (!this.fly(v, `${v.name} with food for the Moon`)) return false;
    const done = installModule(this.game, v);
    if (done) this.say(done);
    touch();
    return !done;
  }

  protected floorRate(id: string): number {
    return material(id).unit ? 1 : 0.01;
  }

  protected supplyRate(id: string, short: number): number {
    const used = flowsOf(this.earth).consumed[id] ?? 0;
    return Math.max(this.floorRate(id), used * 1.2 + short / (60 * 24));
  }

  protected deliverToStation(cargo: Record<string, number>): void {
    const need = Object.fromEntries(
      Object.entries(cargo).filter(([m, kg]) => kg > 1e-6 && m !== 'asteroidal_steel' && !isStockless(m))
    );
    for (const part of this.chunks(need, 36_000)) this.cargoToStation(part);
  }

  protected stationBuild(id: string, count = 1, process: string | null = null): boolean {
    const st = this.station();
    const b = building(id);
    const have = standing(st, id) + st.queue.filter((o) => o.building === id).length;
    if (have < count) {
      const need = count - have;
      let guard = 0;
      const missing = () => {
        const out: Record<string, number> = {};
        for (const [m, kg] of Object.entries(b.cost)) {
          const miss = kg * need - (st.stock[m] ?? 0);
          if (miss > 1e-6 && m !== 'asteroidal_steel' && !isStockless(m)) out[m] = miss;
        }
        return out;
      };
      while (Object.keys(missing()).length && guard++ < 6) this.deliverToStation(missing());
      queueBuilding(economy, st, id, process, need);
      this.say(`queued ${need} ${b.name} at ${st.name}`);
    }
    const done = this.waitFor(() => standing(st, id) >= count, `${b.name} at the station`, 1500, 3);
    if (!done) throw new Error(`${b.name} did not finish at ${st.name}`);
    return done;
  }

  protected stationPower(): void {
    const st = this.station();
    if (standing(st, 'fission_reactor') <= 0 && (st.stock.haleu ?? 0) < 250)
      this.deliverToStation({ haleu: 300 });
    this.stationBuild('fission_reactor');
    this.stationBuild('data_centre');
    this.deliverToStation(this.missingAtStation({ ai_accelerator: ACCELERATOR_KG }));
  }

  protected provideBuilding(id: string): void {
    if (id === 'orbital_shipyard') return this.shipyard();
    super.provideBuilding(id);
  }

  protected shipyard(): void {
    const st = this.station();
    if (standing(st, 'orbital_shipyard') > 0 || st.queue.some((o) => o.building === 'orbital_shipyard'))
      return;
    this.stationPower();
    if (this.steelAt(st) < 30_000 && !this.fetchSteel()) return;
    this.stationBuild('orbital_shipyard');
  }

  protected provideSite(n: number): void {
    if (n === 18) this.firstShip();
    else super.provideSite(n);
  }

  protected firstShip(): void {
    const st = this.station();
    const tender = this.tenderDesign();
    const built = () => ships.vessels.some((v) => v.design === tender.id);
    if (built() || standing(st, 'orbital_shipyard') <= 0) return;
    if (!st.yard.some((o) => o.design === tender.id)) {
      this.deliverToStation(this.missingAtStation(statsFor(tender).cost));
      const r = orderShips(st, tender.id, 1);
      if (typeof r === 'string') this.say(`could not order the tender: ${r}`);
    }
    this.waitFor(built, 'the first ship from the orbital yard', 800, 3);
  }

  protected missingAtStation(cost: Record<string, number>): Record<string, number> {
    const st = this.station();
    const out: Record<string, number> = {};
    for (const [m, kg] of Object.entries(cost)) {
      const miss = kg - (st.stock[m] ?? 0);
      if (miss > 1e-6) out[m] = miss;
    }
    return out;
  }
}
