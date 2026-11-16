import { DAY, formatClock } from './clock.ts';
import { classes } from './classes.svelte.ts';
import { building, material, milestone, milestones, recipesProducing } from './data/index.ts';
import {
  assign,
  buildingsAt,
  economy,
  extractionId,
  flowsOf,
  homeSite,
  isUnlocked,
  missingFor,
  programmeDays,
  programmeStatus,
  queueBuilding,
  siteAt,
  standing,
  startProgramme,
  touch,
  unlockedProcesses,
  unlockedUpTo,
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

const BOOSTER = 'play-booster';
const ORBITER = 'play-orbiter';
const HABITAT = 'play-habitat';

export function launchDesigns(): { booster: ShipDesign; orbiter: ShipDesign } {
  const make = (id: string, name: string, role: ShipDesign['role'], parts: [string, number][]) => {
    const found = classes.find(id);
    if (found) return found;
    let d: ShipDesign = { ...newDesign(id, name), role, yard: 'rocket_factory' };
    for (const [c, n] of parts) d = setCount(d, c, n);
    d = lock(d, unlockedUpTo(economy));
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

  constructor(private readonly game: Game) {}

  private say(text: string): void {
    this.report.log.push(`${formatClock(this.game.time)}  ${text}`);
  }

  private get earth(): Site {
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

  private groupFor(buildingId: string, process: string) {
    const site = this.earth;
    return site.groups.find((g) => g.building === buildingId && g.process === process);
  }

  private readonly chosen = new Map<string, string>();

  private produce(materialId: string, kgPerHour: number, depth = 0): boolean {
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

  private fixShortages(): void {
    const site = this.earth;
    const f = flowsOf(site);
    for (const a of f.actors) {
      if (a.limit?.kind === 'material' && a.worst < 0.999) {
        const id = (a.limit as { id: string }).id;
        const needRate = Math.max(1000, (a.inputs[id] ?? 0) * a.cap * 2);
        this.produce(id, needRate, 1);
      }
    }
  }

  private ensureBuilding(id: string): void {
    const site = this.earth;
    const b = building(id);
    if (!b.where.includes('earth')) return;
    if (standing(site, id) > 0 || site.queue.some((o) => o.building === id)) return;
    const p = unlockedProcesses(economy, site, id)[0];
    queueBuilding(economy, site, id, p?.id ?? null);
    this.say(`queued a ${b.name}`);
  }

  private orbital(): Site | undefined {
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
    let guard = 0;
    while ((own(booster.id).length < 1 || own(orbiter.id).length < 1) && guard++ < 200) {
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
        for (const m of Object.keys(cargo))
          addOrder(v, { type: 'unload', item: { kind: 'cargo', id: m }, amount: null });
        this.days(1);
      }
    }
  }

  private missingNote(site: Site, n: number): string {
    const m = milestone(n);
    return missingFor(economy, site, m)
      .map((x) =>
        x.kind === 'material' ? `${material(x.id).name} ${Math.round(x.have)}/${Math.round(x.need)}` : x.kind
      )
      .join(', ');
  }

  reach(n: number): boolean {
    const site = this.earth;
    const m = milestone(n);
    let guard = 0;
    while (!economy.done.includes(n) && guard++ < 120) {
      if (economy.running.some((p) => p.number === n)) {
        this.computeForProgramme();
        this.days(10);
        continue;
      }
      const missing = missingFor(economy, site, m);
      if (!missing.length && programmeStatus(economy, site, m) === 'ready') {
        this.computeForProgramme();
        startProgramme(economy, site, n);
        this.say(`started milestone ${n}`);
        this.days(programmeDays(m) + 1);
        continue;
      }
      for (const x of missing) {
        if (x.kind === 'requires') this.reach(x.number);
        else if (x.kind === 'locked') {
          const f = milestones.find((q) => !q.optional && !economy.done.includes(q.number));
          if (f && f.number < n) this.reach(f.number);
        } else if (x.kind === 'building') this.provideBuilding(x.id);
        else if (x.kind === 'builder') this.ensureBuilding(x.id);
        else if (x.kind === 'material') this.produce(x.id, Math.max(1000, x.need / 48));
      }
      this.fixShortages();
      this.days(3);
      if (guard % 50 === 0) this.say(`milestone ${n} waits for ${this.missingNote(site, n)}`);
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
      habitat = lock(d, unlockedUpTo(economy));
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
    addOrder(mod, { type: 'load', item: { kind: 'crew' }, amount: crew });
    addOrder(mod, { type: 'load', item: { kind: 'cargo', id: 'food_ration' }, amount: 3000 });
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

  private computeForProgramme(): void {
    const site = this.earth;
    for (const g of [...site.groups])
      if (g.building === 'data_centre' && g.process === 'ai_model_training')
        assign(economy, site, g.id, 'compute_generation', g.count);
    touch();
  }

  private provideBuilding(id: string): void {
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
