import { DAY, formatClock } from './clock.ts';
import { classes } from './classes.svelte.ts';
import { building, material, milestone, recipesProducing, shipComponent } from './data/index.ts';
import type { Milestone } from './data/index.ts';
import {
  assign,
  buildingsAt,
  economy,
  extractionId,
  flowsOf,
  homeSite,
  isUnlocked,
  programmeCompute,
  programmeStatus,
  queueBuilding,
  siteAt,
  standing,
  startProgramme,
  touch,
  unlockedProcesses,
  unlockedTag,
  type Site
} from './economy/index.ts';
import { lock, newDesign, setCount, type ShipDesign } from './shipdesign/index.ts';
import {
  addOrder,
  foundSite,
  installModule,
  launch,
  orderShips,
  planStack,
  ships,
  type Stack
} from './ships/index.ts';
import type { Game } from './state.svelte.ts';

export interface PlayReport {
  reached: { number: number; at: number }[];
  launches: { at: number; payload: number }[];
  tonnes: number;
  log: string[];
}

const floor = (materialId: string): number => (material(materialId).unit ? 1 : 1000);

const BOOSTER = 'play-booster';
const ORBITER = 'play-orbiter';
const HABITAT = 'play-habitat';

export function launchDesigns(): { booster: ShipDesign; orbiter: ShipDesign } {
  const make = (id: string, name: string, role: ShipDesign['role'], parts: [string, number][]) => {
    const found = classes.find(id);
    if (found) return found;
    let d: ShipDesign = { ...newDesign(id, name), role, yard: 'rocket_factory' };
    for (const [c, n] of parts) d = setCount(d, c, n);
    d = lock(d, unlockedTag(economy));
    classes.add(d);
    return d;
  };
  return {
    booster: make(BOOSTER, 'Booster', 'launcher', [
      ['chemical_engine_methalox', 3],
      ['propellant_tank', 25],
      ['structure_truss', 1],
      ['landing_legs', 1]
    ]),
    orbiter: make(ORBITER, 'Orbiter', 'freighter', [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 6],
      ['structure_truss', 1],
      ['cargo_bay', 2]
    ])
  };
}

export class Player {
  readonly report: PlayReport = { reached: [], launches: [], tonnes: 0, log: [] };

  constructor(protected readonly game: Game) {}

  protected say(text: string): void {
    this.report.log.push(`${formatClock(this.game.time)}  ${text}`);
  }

  protected get earth(): Site {
    return homeSite();
  }

  days(n: number): void {
    let left = n;
    while (left > 1e-9) {
      const step = Math.min(left, 5);
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
      .filter((g) => g.building === b && g.process === id)
      .reduce((a, g) => a + g.count, 0);
    const want = Math.ceil(kgPerHour / per);
    if (have >= want) return true;
    const donors = site.groups
      .filter((g) => g.building === b && g.process !== id && g.on && g.process !== null)
      .sort((x, y) => y.count - x.count);
    const donor = donors[0];
    if (donor && donor.count > 1) {
      const n = Math.min(want - have, Math.max(1, Math.floor(donor.count / 2)));
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

  protected fixShortages(): void {
    const site = this.earth;
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
  }

  protected ensureBuilding(id: string): void {
    const site = this.earth;
    const b = building(id);
    if (!b.where.includes('earth')) return;
    if (standing(site, id) > 0 || site.queue.some((o) => o.building === id)) return;
    const p = unlockedProcesses(economy, site, id)[0];
    queueBuilding(economy, site, id, p?.id ?? null);
    this.say(`queued a ${b.name}`);
  }

  protected orbital(): Site | undefined {
    return siteAt(economy, 'earth', 'orbit');
  }

  deliver(cargo: Record<string, number>, found?: string): void {
    const { booster, orbiter } = launchDesigns();
    const site = this.earth;
    const own = (id: string) =>
      ships.vessels.filter(
        (v) => v.design === id && v.at.kind === 'site' && v.at.site === 'earth' && !v.trip
      );
    const need = (d: ShipDesign, n: number) => {
      const have = own(d.id).length + site.yard.filter((o) => o.design === d.id).length;
      if (have < n) orderShips(site, d.id, n - have);
    };
    need(booster, 1);
    need(orbiter, 1);
    for (const m of Object.keys(cargo)) site.stock[m] ??= 0;
    const short = () => Object.entries(cargo).filter(([m, kg]) => (site.stock[m] ?? 0) < kg);
    let guard = 0;
    while ((own(booster.id).length < 1 || own(orbiter.id).length < 1 || short().length) && guard++ < 200) {
      for (const [m, kg] of short())
        this.produce(m, Math.max(this.floorRate(m), (kg - (site.stock[m] ?? 0)) / 48));
      this.fixShortages();
      this.days(2);
    }
    const stack: Stack = {
      stages: [own(booster.id)[0]!.id, own(orbiter.id)[0]!.id],
      payload: { kind: 'cargo', cargo }
    };
    const plan = planStack(this.game, site, stack);
    if (!plan.ok) {
      this.say(`launch refused: ${plan.reasons.join(' ')}`);
      return;
    }
    launch(this.game, site, stack);
    this.report.launches.push({ at: this.game.time, payload: plan.payloadMass });
    this.report.tonnes += plan.payloadMass / 1000;
    this.say(`launched ${Math.round(plan.payloadMass / 100) / 10} t to orbit`);
    const v = ships.vessels.find((x) => x.id === stack.stages[1])!;
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
    const { booster, orbiter } = launchDesigns();
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
      habitat = lock(d, unlockedTag(economy));
      classes.add(habitat);
    }
    const here = (id: string) =>
      ships.vessels.filter(
        (v) => v.design === id && v.at.kind === 'site' && v.at.site === 'earth' && !v.trip
      );
    for (const d of [booster, orbiter, habitat]) {
      const have = here(d.id).length + site.yard.filter((o) => o.design === d.id).length;
      if (have < 1) orderShips(site, d.id, 1);
    }
    let guard = 0;
    while ([booster, orbiter, habitat].some((d) => here(d.id).length < 1) && guard++ < 200) {
      this.fixShortages();
      this.days(2);
    }
    const mod = here(habitat.id)[0]!;
    addOrder(mod, {
      type: 'manifest',
      lines: [
        { item: { kind: 'crew' }, amount: crew },
        { item: { kind: 'cargo', id: 'food_ration' }, amount: 3000 }
      ]
    });
    this.days(1);
    const stack: Stack = {
      stages: [here(booster.id)[0]!.id, here(orbiter.id)[0]!.id],
      payload: { kind: 'ship', ship: mod.id }
    };
    const plan = planStack(this.game, site, stack);
    if (!plan.ok) {
      this.say(`crewed launch refused: ${plan.reasons.join(' ')}`);
      return false;
    }
    launch(this.game, site, stack);
    this.report.launches.push({ at: this.game.time, payload: plan.payloadMass });
    this.report.tonnes += plan.payloadMass / 1000;
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
        .reduce((a, g) => a + g.count, 0) * 1000;
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
