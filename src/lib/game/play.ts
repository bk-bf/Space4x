import { DAY, formatClock } from './clock.ts';
import { classes } from './classes.svelte.ts';
import {
  building,
  material,
  milestone,
  recipe,
  recipesProducing,
  reserveOf,
  shipComponent
} from './data/index.ts';
import type { Milestone } from './data/index.ts';
import {
  assign,
  buildingsAt,
  earthStart,
  economy,
  extractionId,
  extractRate,
  isExtraction,
  isStockless,
  flowsOf,
  homeSite,
  isUnlocked,
  process,
  programmeCompute,
  programmeStatus,
  queueBuilding,
  setShipPercent,
  siteAt,
  standing,
  setOn,
  startProgramme,
  switchSome,
  touch,
  unlockedProcesses,
  unlockedTag,
  type Site
} from './economy/index.ts';
import { climbWith, designStats, lock, newDesign, setCount, type ShipDesign } from './shipdesign/index.ts';
import {
  addOrder,
  foundSite,
  installModule,
  launch,
  orderShips,
  planLaunch,
  ships,
  type Vessel
} from './ships/index.ts';
import type { Game } from './state.svelte.ts';

export interface PlayReport {
  reached: { number: number; at: number }[];
  launches: { at: number; payload: number }[];
  tonnes: number;
  log: string[];
}

const floor = (materialId: string): number => (material(materialId).unit ? 1 : extractRate(materialId));

const SPARE = 1.2;
const TRIM_STOCK_DAYS = 365;
const TRIM_PASSES = 5;
const TRIM_EVERY_DAYS = 30;
const END_PRODUCTS = new Set(Object.keys(earthStart.endProducts));

const ORBITER = 'play-orbiter';
const HABITAT = 'play-habitat';
const MAX_BOOSTERS = 99;

export function withBoosters(d: ShipDesign): ShipDesign {
  if (d.yard !== 'rocket_factory') return d;
  for (const full of [true, false])
    for (let n = 0; n <= MAX_BOOSTERS; n++) {
      const t = setCount(d, 'booster', n);
      const s = designStats(t);
      if (climbWith(s, full ? s.payloadCapacity : 0).reaches) return t;
    }
  throw new Error(`${d.name} cannot reach orbit on any number of boosters`);
}

function makeDesign(
  id: string,
  name: string,
  role: ShipDesign['role'],
  parts: [string, number][]
): ShipDesign {
  const found = classes.find(id);
  if (found) return found;
  let d: ShipDesign = { ...newDesign(id, name), role, yard: 'rocket_factory' };
  for (const [c, n] of parts) d = setCount(d, c, n);
  d = lock(withBoosters(d), unlockedTag(economy));
  classes.add(d);
  return d;
}

const orbiterDesign = (): ShipDesign =>
  makeDesign(ORBITER, 'Orbiter', 'freighter', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ]);

export class Player {
  readonly report: PlayReport = { reached: [], launches: [], tonnes: 0, log: [] };

  constructor(protected readonly game: Game) {}

  protected say(text: string): void {
    this.report.log.push(`${formatClock(this.game.time)}  ${text}`);
  }

  protected get earth(): Site {
    return homeSite();
  }

  protected shareShipyards(): void {
    for (const site of economy.sites)
      for (const yard of new Set(site.yard.map((o) => o.yard))) {
        const orders = site.yard.filter((o) => o.yard === yard && !o.paused);
        const each = Math.floor(100 / Math.max(1, orders.length));
        if (orders.every((o) => o.percent === each)) continue;
        for (const o of orders) o.percent = 0;
        for (const o of orders) setShipPercent(economy, site, o.id, each);
      }
  }

  protected trimmedAt = -Infinity;

  protected trimmable(processId: string): string | undefined {
    const p = process(processId, this.earth.body);
    const finite = (m: string) => (reserveOf(m)?.content ?? null) !== null;
    const outputs = Object.entries(p.outputs).sort((a, b) => b[1] - a[1]);
    const end = outputs.find(([m]) => END_PRODUCTS.has(m));
    if (end) return end[0];
    if (isExtraction(processId)) return outputs.find(([m]) => finite(m))?.[0];
    if (!Object.keys(p.inputs).some(finite)) return undefined;
    return recipe(processId).product ?? outputs.find(([m]) => !isStockless(m))?.[0];
  }

  protected economise(): void {
    for (let i = 0; i < TRIM_PASSES && this.trimPass(); i++);
    touch();
  }

  protected trimPass(): boolean {
    const site = this.earth;
    const f = flowsOf(site);
    let changed = false;
    for (const g of [...site.groups]) {
      if (!g.on || !g.process || this.pinned.has(g.process)) continue;
      const id = this.trimmable(g.process);
      if (!id) continue;
      const per = process(g.process, site.body).outputs[id] ?? 0;
      const need = Math.max(((f.consumed[id] ?? 0) + (f.eaten[id] ?? 0)) * SPARE, this.floorRate(id));
      if (per <= 0 || (site.stock[id] ?? 0) < need * 24 * TRIM_STOCK_DAYS) continue;
      const running = site.groups
        .filter((x) => x.on && x.building === g.building && x.process === g.process)
        .reduce((a, x) => a + x.count, 0);
      const surplus = Math.min(g.count, running - Math.max(1, Math.ceil(need / per)));
      if (surplus <= 0) continue;
      switchSome(economy, site, g.id, surplus);
      this.say(`switched off ${surplus} ${building(g.building).name} on ${material(id).name}`);
      changed = true;
    }
    touch();
    return changed;
  }

  days(n: number): void {
    let left = n;
    while (left > 1e-9) {
      if (this.game.elapsed - this.trimmedAt >= TRIM_EVERY_DAYS * 86_400) {
        this.economise();
        this.trimmedAt = this.game.elapsed;
      }
      const step = Math.min(left, 5);
      this.shareShipyards();
      this.game.advance(step * DAY);
      left -= step;
    }
    touch();
  }

  protected groupFor(buildingId: string, process: string) {
    const site = this.earth;
    return site.groups.find((g) => g.building === buildingId && g.process === process);
  }

  protected readonly chosen = new Map<string, string>();

  protected produce(materialId: string, kgPerHour: number, depth = 0): boolean {
    const site = this.earth;
    if (depth > 5) return false;
    const m = material(materialId);
    const ids = [
      ...(m.sources?.some((s) => s.body === 'earth') ? [extractionId(materialId)] : []),
      ...recipesProducing(materialId)
        .filter((r) => isUnlocked(economy, r) && building(r.building).where.includes('earth'))
        .map((r) => r.id)
    ];
    const id = this.chosen.get(materialId) ?? ids[0];
    if (!id) return false;
    const b = id.startsWith('extract:')
      ? (m.sources?.find((s) => s.body === 'earth')?.building ?? 'mine_earth')
      : recipesProducing(materialId).find((r) => r.id === id)!.building;
    this.chosen.set(materialId, id);
    this.standOnly.delete(b);
    if (standing(site, b) <= 0) {
      if (!site.queue.some((o) => o.building === b)) {
        queueBuilding(economy, site, b, id);
        this.say(`queued a ${building(b).name}`);
      }
      return true;
    }
    const proc = unlockedProcesses(economy, site, b).find((p) => p.id === id);
    if (!proc) return false;
    const per = proc.outputs[materialId] ?? 0;
    if (per <= 0) return false;
    const have = site.groups
      .filter((g) => g.building === b && g.process === id && g.on)
      .reduce((a, g) => a + g.count, 0);
    const want = Math.ceil(kgPerHour / per);
    if (have >= want) return true;
    const parked =
      site.groups.find((g) => g.building === b && g.process === id && !g.on) ??
      site.groups
        .filter((g) => g.building === b && !g.on && g.process !== null)
        .sort((x, y) => y.count - x.count)[0];
    if (parked) {
      const n = Math.min(want - have, parked.count);
      const moved = parked.process === id ? parked : assign(economy, site, parked.id, id, n);
      if (moved) {
        switchSome(economy, site, moved.id, n);
        this.say(`switched on ${n} ${building(b).name} on ${proc.name}`);
        touch();
        return true;
      }
    }
    const donors = site.groups
      .filter((g) => g.building === b && g.process !== id && g.on)
      .sort((x, y) => y.count - x.count);
    const donor = donors.find((g) => g.process === null) ?? donors[0];
    if (donor && (donor.count > 1 || donor.process === null)) {
      const n = Math.min(
        want - have,
        donor.process === null ? donor.count : Math.max(1, Math.floor(donor.count / 2))
      );
      assign(economy, site, donor.id, id, n);
      this.say(`switched ${n} ${building(b).name} to ${proc.name}`);
    } else {
      const queued = site.queue.filter((o) => o.building === b && o.process === id).length;
      if (want - have - queued > 0) {
        queueBuilding(economy, site, b, id, want - have - queued);
        this.say(`queued ${want - have - queued} ${building(b).name} for ${proc.name}`);
      }
    }
    touch();
    return true;
  }

  protected floorRate(id: string): number {
    return floor(id);
  }

  protected readonly standOnly = new Set<string>();
  protected readonly pinned = new Set<string>();

  protected restStanding(): void {
    const site = this.earth;
    for (const g of site.groups)
      if (g.on && g.process && this.standOnly.has(g.building) && !this.pinned.has(g.process))
        setOn(site, g.id, false);
    touch();
  }

  protected pin(buildingId: string, processId: string): void {
    const site = this.earth;
    this.pinned.add(processId);
    this.standOnly.delete(buildingId);
    for (const g of site.groups)
      if (!g.on && g.building === buildingId && g.process === processId) setOn(site, g.id, true);
    touch();
  }

  protected fixShortages(): void {
    const site = this.earth;
    this.restStanding();
    const f = flowsOf(site);
    for (const a of f.actors) {
      if (a.limit?.kind === 'material' && a.worst < 0.999) {
        const id = (a.limit as { id: string }).id;
        const needRate = Math.max(
          this.floorRate(id),
          (a.inputs[id] ?? 0) * a.cap * (id === 'compute' ? 1 : 2)
        );
        this.produce(id, needRate, 1);
      }
    }
    for (const o of site.yard) {
      if (o.paid || o.paused) continue;
      for (const [id, need] of Object.entries(o.cost)) {
        const short = need - (site.stock[id] ?? 0);
        if (short > 1e-9) this.produce(id, Math.max(this.floorRate(id), short / 24), 1);
      }
    }
  }

  protected ensureBuilding(id: string): void {
    const site = this.earth;
    const b = building(id);
    if (!b.where.includes('earth')) return;
    if (standing(site, id) > 0 || site.queue.some((o) => o.building === id)) return;
    queueBuilding(economy, site, id, null);
    this.standOnly.add(id);
    this.say(`queued a ${b.name}`);
  }

  protected orbital(): Site | undefined {
    return siteAt(economy, 'earth', 'orbit');
  }

  protected stockFor(need: Record<string, number>): void {
    const site = this.earth;
    const short = () => Object.entries(need).filter(([m, kg]) => (site.stock[m] ?? 0) < kg);
    let guard = 0;
    while (short().length && guard++ < 200) {
      for (const [m, kg] of short())
        this.produce(m, Math.max(this.floorRate(m), (kg - (site.stock[m] ?? 0)) / 48));
      this.fixShortages();
      this.days(2);
    }
  }

  protected launchFromEarth(v: Vessel, cargo?: Record<string, number>): boolean {
    const site = this.earth;
    const request = { ship: v.id, ...(cargo ? { cargo } : {}) };
    let plan = planLaunch(this.game, site, request);
    if (plan.reasons.some((r) => r.includes('short by'))) {
      this.stockFor(plan.draw);
      plan = planLaunch(this.game, site, request);
    }
    let guard = 0;
    while (!plan.ok && plan.reasons.some((r) => r.includes('pad')) && guard++ < 10) {
      this.days(1);
      plan = planLaunch(this.game, site, request);
    }
    if (!plan.ok) {
      this.say(`launch of ${v.name} refused: ${plan.reasons.join(' ')}`);
      return false;
    }
    launch(this.game, site, request);
    this.report.launches.push({ at: this.game.time, payload: plan.payloadMass });
    this.report.tonnes += plan.payloadMass / 1000;
    this.say(`launched ${v.name} with ${Math.round(plan.payloadMass / 100) / 10} t to orbit`);
    return true;
  }

  deliver(cargo: Record<string, number>, found?: string): void {
    const orbiter = orbiterDesign();
    const site = this.earth;
    const own = () =>
      ships.vessels.filter(
        (v) => v.design === orbiter.id && v.at.kind === 'site' && v.at.site === 'earth' && !v.trip
      );
    const have = own().length + site.yard.filter((o) => o.design === orbiter.id).length;
    if (have < 1) orderShips(site, orbiter.id, 1);
    for (const m of Object.keys(cargo)) site.stock[m] ??= 0;
    this.stockFor(cargo);
    let guard = 0;
    while (own().length < 1 && guard++ < 200) {
      this.fixShortages();
      this.days(2);
    }
    const v = own()[0]!;
    if (!this.launchFromEarth(v, cargo)) return;
    if (found) {
      const r = foundSite(this.game, v, found);
      this.say(typeof r === 'string' ? `founding failed: ${r}` : `founded ${r.name}`);
    } else {
      const st = this.orbital();
      if (st) {
        addOrder(v, { type: 'dock', site: st.id });
        addOrder(v, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
        this.days(1);
      }
    }
  }

  protected provideSite(_n: number): void {}

  protected standsAnywhere(buildingId: string): boolean {
    return economy.sites.some((s) => standing(s, buildingId) > 0);
  }

  protected prepare(n: number): void {
    const m = milestone(n);
    for (let guard = 0; guard < 120; guard++) {
      const buildings = m.needs.buildings.filter((id) => !this.standsAnywhere(id));
      const builders = m.needs.components
        .map((id) => shipComponent(id).builtAt)
        .filter((at) => !at.some((b) => this.standsAnywhere(b)))
        .flatMap((at) => at.slice(0, 1));
      for (const id of buildings) this.provideBuilding(id);
      this.provideSite(n);
      for (const id of builders) this.ensureBuilding(id);
      if (!buildings.length && !builders.length) return;
      this.fixShortages();
      this.days(3);
      if (guard % 50 === 49) this.say(`milestone ${n} still lacks ${[...buildings, ...builders].join(', ')}`);
    }
  }

  reach(n: number): boolean {
    const site = this.earth;
    const m = milestone(n);
    for (const r of m.requires) if (!economy.done.includes(r)) this.reach(r);
    if (programmeStatus(economy, m) === 'ready') {
      this.computeForProgramme();
      this.ensureCompute(m);
      startProgramme(economy, site, n);
      this.say(`started milestone ${n}`);
    }
    this.prepare(n);
    let guard = 0;
    while (economy.running.some((p) => p.number === n) && guard++ < 1000) {
      this.computeForProgramme();
      this.days(10);
    }
    if (economy.done.includes(n) && !this.report.reached.some((r) => r.number === n)) {
      const e = this.game.events.find((x) => x.text.startsWith(`Milestone ${n} reached`));
      this.report.reached.push({ number: n, at: e?.at ?? this.game.time });
    }
    return economy.done.includes(n);
  }

  crewedStation(crew = 6): boolean {
    const site = this.earth;
    const st = this.orbital();
    if (!st) return false;
    let habitat = classes.find(HABITAT);
    if (!habitat) {
      let d: ShipDesign = {
        ...newDesign(HABITAT, 'Habitat module'),
        role: 'freighter',
        yard: 'rocket_factory'
      };
      for (const [c, n] of [
        ['habitat_module', 1],
        ['life_support_unit', 1],
        ['solar_array', 1],
        ['radiator', 1],
        ['cargo_bay', 1],
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 1]
      ] as [string, number][])
        d = setCount(d, c, n);
      habitat = lock(withBoosters(d), unlockedTag(economy));
      classes.add(habitat);
    }
    const here = (id: string) =>
      ships.vessels.filter(
        (v) => v.design === id && v.at.kind === 'site' && v.at.site === 'earth' && !v.trip
      );
    const have = here(habitat.id).length + site.yard.filter((o) => o.design === habitat.id).length;
    if (have < 1) orderShips(site, habitat.id, 1);
    const rations = 3000;
    const short = () => (site.stock.food_ration ?? 0) < rations;
    let guard = 0;
    while ((short() || here(habitat.id).length < 1) && guard++ < 200) {
      if (short())
        this.produce(
          'food_ration',
          Math.max(this.floorRate('food_ration'), (rations - (site.stock.food_ration ?? 0)) / 48)
        );
      this.fixShortages();
      this.days(2);
    }
    const mod = here(habitat.id)[0]!;
    addOrder(mod, {
      type: 'manifest',
      lines: [
        { item: { kind: 'crew' }, amount: crew },
        { item: { kind: 'cargo', id: 'food_ration' }, amount: rations }
      ]
    });
    this.days(1);
    if (!this.launchFromEarth(mod)) return false;
    addOrder(mod, { type: 'dock', site: st.id });
    this.days(1);
    const result = installModule(this.game, mod);
    this.say(result ?? `${crew} crew moved into ${st.name}`);
    return result === undefined;
  }

  protected ensureCompute(m: Milestone): void {
    const site = this.earth;
    const need = programmeCompute(m) * 1.1;
    if (need <= 0) return;
    const have = () =>
      site.groups
        .filter((g) => g.building === 'data_centre' && g.process === 'compute_generation')
        .reduce((a, g) => a + g.count, 0) * (process('compute_generation', site.body).outputs.compute ?? 0);
    let guard = 0;
    while (have() < need && guard++ < 100) {
      this.produce('compute', need);
      this.fixShortages();
      this.days(3);
      this.computeForProgramme();
    }
  }

  protected computeForProgramme(): void {
    const site = this.earth;
    for (const g of [...site.groups])
      if (g.building === 'data_centre' && g.process === 'ai_model_training')
        assign(economy, site, g.id, 'compute_generation', g.count);
    touch();
  }

  protected provideBuilding(id: string): void {
    const b = building(id);
    if (b.where.includes('earth')) return this.ensureBuilding(id);
    if (!b.where.includes('orbit')) return;
    const st = this.orbital();
    if (!st) {
      const cost = { ...b.cost };
      this.deliver(cost, id);
      return;
    }
    if (standing(st, id) > 0 || st.queue.some((o) => o.building === id)) return;
    const missing = Object.entries(b.cost).filter(([mid, need]) => (st.stock[mid] ?? 0) < need);
    if (missing.length) {
      const cargo = Object.fromEntries(missing.map(([mid, need]) => [mid, need - (st.stock[mid] ?? 0)]));
      for (const mid of Object.keys(cargo)) this.produce(mid, 500);
      this.deliver(cargo);
      return;
    }
    queueBuilding(
      economy,
      st,
      id,
      buildingsAt('orbit').length ? (unlockedProcesses(economy, st, id)[0]?.id ?? null) : null
    );
    this.say(`queued a ${b.name} at ${st.name}`);
  }
}

export function playTo(game: Game, target: number): PlayReport {
  const p = new Player(game);
  p.reach(target);
  return p.report;
}
