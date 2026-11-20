import { building, milestone, type Amounts, type Component } from '#lib/game/data/index.ts';
import { MIN_LANDING_TWR, MIN_LIFTOFF_TWR, shipDeltaV, type Ship } from '#lib/game/flight/index.ts';
import { earth, mars, moon } from '#lib/game/flight/reference.ts';
import { surfaceGravity } from '#lib/game/flight/wells.ts';
import type { FlightBody } from '#lib/game/flight/types.ts';
import { component, isBooster, isEngine, massOf } from './catalogue.ts';
import { boostersOf, climbFrom, type Climb } from './climb.ts';
import {
  isPropellant,
  massIn,
  PROPELLANT_KINDS,
  PROPELLANTS,
  volumeFor,
  type PropellantKind
} from './propellants.ts';
import {
  YARDS,
  type BodyId,
  type Condition,
  type DesignStats,
  type Drive,
  type Issue,
  type Line,
  type ShipDesign,
  type Yard
} from './types.ts';

export const OPEN_LOOP_KG_PER_PERSON_DAY = 5;
export const REGENERATIVE_KG_PER_PERSON_DAY = 1;
export const PASSIVE_KW_PER_TONNE = 0.5;
export const ECLIPSE_HOURS = 0.6;

const BODIES: Readonly<Record<BodyId, FlightBody>> = { earth, moon, mars };
const BODY_NAMES: Readonly<Record<BodyId, string>> = { earth: 'Earth', moon: 'the Moon', mars: 'Mars' };

const YARD_BODY: Readonly<Record<Yard, BodyId | undefined>> = {
  rocket_factory: 'earth',
  orbital_shipyard: undefined
};

const scale = (amounts: Amounts, n: number): Amounts =>
  Object.fromEntries(Object.entries(amounts).map(([id, kg]) => [id, kg * n]));

const addTo = (total: Amounts, amounts: Amounts): void => {
  for (const [id, kg] of Object.entries(amounts)) total[id] = (total[id] ?? 0) + kg;
};

const sum = (items: readonly { c: Component; count: number }[], pick: (c: Component) => number): number =>
  items.reduce((total, { c, count }) => total + pick(c) * count, 0);

const kg = (n: number): string => `${Math.round(n).toLocaleString('en-US')} kg`;
const kw = (n: number): string => `${(Math.round(n * 10) / 10).toLocaleString('en-US')} kW`;
const kms = (n: number): string => `${(n / 1000).toFixed(1)} km/s`;

export interface Allocation {
  carried: Partial<Record<PropellantKind, number>>;
  capacity: Partial<Record<PropellantKind, number>>;
}

export function allocate(
  tanks: readonly { c: Component; count: number }[],
  load: ShipDesign['load']
): Allocation {
  const free = new Map<string, number>(tanks.map(({ c, count }) => [c.id, (c.design.volume ?? 0) * count]));
  const carried: Partial<Record<PropellantKind, number>> = {};
  const capacity: Partial<Record<PropellantKind, number>> = {};
  const accepts = (kind: PropellantKind) => tanks.filter(({ c }) => c.design.propellants?.includes(kind));
  for (const kind of PROPELLANT_KINDS) {
    const room = accepts(kind).reduce((total, { c, count }) => total + (c.design.volume ?? 0) * count, 0);
    if (room > 0) capacity[kind] = massIn(kind, room);
  }
  for (const kind of PROPELLANT_KINDS) {
    let want = volumeFor(kind, Math.max(0, load[kind] ?? 0));
    let took = 0;
    for (const { c } of accepts(kind)) {
      if (want <= 0) break;
      const left = free.get(c.id) ?? 0;
      const use = Math.min(left, want);
      free.set(c.id, left - use);
      want -= use;
      took += use;
    }
    if (took > 0) carried[kind] = massIn(kind, took);
  }
  return { carried, capacity };
}

function drivesOf(
  engines: readonly { c: Component; count: number }[],
  carried: Allocation['carried'],
  dryMass: number,
  payload: number,
  powerAvailable: number
): Drive[] {
  const groups = new Map<PropellantKind, { c: Component; count: number }[]>();
  for (const e of engines) {
    const kind = e.c.design.propellants?.find(isPropellant);
    if (!kind) continue;
    groups.set(kind, [...(groups.get(kind) ?? []), e]);
  }
  const others = (kind: PropellantKind) =>
    PROPELLANT_KINDS.filter((k) => k !== kind).reduce((total, k) => total + (carried[k] ?? 0), 0);
  return [...groups].map(([kind, list]) => {
    const thrust = sum(list, (c) => c.performance?.thrust ?? 0);
    const thrustSeaLevel = sum(list, (c) => c.performance?.thrustSeaLevel ?? c.performance?.thrust ?? 0);
    const flow = list.reduce(
      (total, { c, count }) => total + ((c.performance?.thrust ?? 0) * count) / (c.performance?.isp ?? 1),
      0
    );
    const isp = thrust / flow;
    const power = sum(list, (c) => c.performance?.power ?? 0);
    const throttle = power > 0 ? Math.min(1, powerAvailable / power) : 1;
    const load = carried[kind] ?? 0;
    const ship: Ship = {
      dryMass: dryMass + others(kind),
      payload,
      propellant: load,
      engine: { isp, thrust, thrustSeaLevel, ...(power > 0 ? { power } : {}) },
      powerAvailable
    };
    return {
      propellant: kind,
      engines: list.map(({ c, count }) => ({ component: c.id, count })),
      count: list.reduce((total, { count }) => total + count, 0),
      isp,
      thrust,
      thrustSeaLevel,
      power,
      throttle,
      load,
      deltaV: load > 0 ? shipDeltaV(ship) : 0
    };
  });
}

function condition(
  main: Drive | undefined,
  dryMass: number,
  propellantMass: number,
  payload: number
): Condition {
  const mass = dryMass + propellantMass + payload;
  const thrust = main ? main.thrust * main.throttle : 0;
  const twr = (body: BodyId): number => {
    if (!main || mass <= 0) return 0;
    const t = body === 'earth' ? main.thrustSeaLevel * main.throttle : thrust;
    return t / (mass * surfaceGravity(BODIES[body]));
  };
  const thrustToWeight = { earth: twr('earth'), moon: twr('moon'), mars: twr('mars') };
  return {
    mass,
    deltaV: main?.deltaV ?? 0,
    acceleration: mass > 0 ? thrust / mass : 0,
    thrustToWeight,
    liftoff: {
      earth: thrustToWeight.earth >= MIN_LIFTOFF_TWR,
      moon: thrustToWeight.moon >= MIN_LIFTOFF_TWR,
      mars: thrustToWeight.mars >= MIN_LIFTOFF_TWR
    }
  };
}

export type Unlocked = (tag: number) => boolean;

export const yardName = (yard: Yard): string => building(yard).name;

export const yardMilestone = (yard: Yard): number => building(yard).milestone;

export function designStats(design: ShipDesign, unlocked: Unlocked = () => true): DesignStats {
  const items = design.parts.flatMap((p) => {
    const c = component(p.component);
    return c && p.count > 0 ? [{ c, count: p.count }] : [];
  });
  const lines: Line[] = items.map(({ c, count }) => ({
    component: c.id,
    name: c.name,
    count,
    mass: massOf(c) * count,
    cost: scale(c.cost, count)
  }));
  const dryMass = items.reduce((total, { c, count }) => total + (isBooster(c) ? 0 : massOf(c) * count), 0);
  const boosters = boostersOf(items);
  const tanks = items.filter(({ c }) => (c.design.volume ?? 0) > 0);
  const { carried, capacity } = allocate(tanks, design.load);
  const propellantMass = PROPELLANT_KINDS.reduce((total, k) => total + (carried[k] ?? 0), 0);
  const payloadCapacity = sum(items, (c) => c.design.cargo ?? 0);

  const engines = items.filter(({ c }) => isEngine(c));
  const made = sum(items, (c) => c.design.generates ?? 0);
  const used = sum(
    items.filter(({ c }) => !isEngine(c)),
    (c) => c.design.power ?? 0
  );
  const engineDraw = sum(engines, (c) => c.performance?.power ?? 0);
  const available = Math.max(0, made - used);

  const drives = drivesOf(engines, carried, dryMass, payloadCapacity, available);
  const emptyDrives = drivesOf(engines, carried, dryMass, 0, available);
  const best = (list: readonly Drive[]) =>
    [...list].sort((a, b) => b.deltaV - a.deltaV || b.thrust * b.throttle - a.thrust * a.throttle)[0];
  const mainEmpty = best(emptyDrives);
  const mainLoaded = mainEmpty && drives.find((d) => d.propellant === mainEmpty.propellant);
  const loaded = condition(mainLoaded, dryMass, propellantMass, payloadCapacity);
  const empty = condition(mainEmpty, dryMass, propellantMass, 0);

  const automated = items.some(({ c }) => c.design.automates === true);
  const crew = sum(items, (c) => (automated && !c.design.housing ? 0 : (c.design.crew ?? 0)));
  const berths = sum(items, (c) => c.design.housing ?? 0);
  const stores = sum(items, (c) => c.design.stores ?? 0);
  const regenerative = Math.min(
    crew,
    sum(items, (c) => c.design.supports ?? 0)
  );
  const daily =
    regenerative * REGENERATIVE_KG_PER_PERSON_DAY + (crew - regenerative) * OPEN_LOOP_KG_PER_PERSON_DAY;
  const endurance = crew > 0 && daily > 0 ? stores / daily : undefined;

  const storage = sum(items, (c) => c.design.storage ?? 0);
  const produced =
    sum(
      items.filter(({ c }) => !isEngine(c)),
      (c) => c.design.heat ?? c.design.power ?? 0
    ) +
    sum(engines, (c) => c.design.heat ?? c.performance?.power ?? 0) *
      Math.min(1, engineDraw > 0 ? available / engineDraw : 1);
  const radiated = sum(items, (c) => c.design.radiates ?? 0) + (PASSIVE_KW_PER_TONNE * dryMass) / 1000;

  const builtAt = YARDS.filter((y) => items.every(({ c }) => c.builtAt.includes(y)));

  const cost: Amounts = {};
  for (const l of lines) addTo(cost, l.cost);
  const propellantCost: Amounts = {};
  for (const k of PROPELLANT_KINDS) addTo(propellantCost, scale(PROPELLANTS[k].mix, carried[k] ?? 0));

  const main = loaded.mass > 0 ? mainLoaded : undefined;
  const climb = climbWith({ dryMass, propellant: carried, main, boosters }, payloadCapacity);
  const base = {
    lines,
    dryMass,
    boosters,
    climb,
    propellant: carried,
    capacity,
    propellantMass,
    payloadCapacity,
    loaded,
    empty,
    drives,
    main,
    crew,
    berths,
    stores,
    endurance,
    power: {
      made,
      used,
      engines: engineDraw,
      balance: made - used,
      burning: made - used - engineDraw,
      storage
    },
    heat: { produced, radiated, balance: radiated - produced },
    builtAt,
    cost,
    propellantCost
  };
  const issues = issuesOf(design, items, base, unlocked);
  return {
    ...base,
    issues,
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warning').length
  };
}

type Base = Omit<DesignStats, 'issues' | 'errors' | 'warnings'>;

export function climbWith(
  s: Pick<DesignStats, 'dryMass' | 'propellant' | 'main' | 'boosters'>,
  payload: number
): Climb {
  const kind = s.main?.propellant;
  const load = kind ? (s.propellant[kind] ?? 0) : 0;
  const others = PROPELLANT_KINDS.filter((k) => k !== kind).reduce((t, k) => t + (s.propellant[k] ?? 0), 0);
  return climbFrom(earth, s.boosters, { dry: s.dryMass + others + payload, propellant: load, drive: s.main });
}

function issuesOf(
  design: ShipDesign,
  items: readonly { c: Component; count: number }[],
  s: Base,
  unlocked: Unlocked
): Issue[] {
  const out: Issue[] = [];
  const error = (code: Issue['code'], text: string) => out.push({ level: 'error', code, text });
  const warn = (code: Issue['code'], text: string) => out.push({ level: 'warning', code, text });
  const has = (pick: (c: Component) => boolean) => items.some(({ c }) => pick(c));

  if (!items.length) {
    error('no-parts', 'Add components to the class.');
    return out;
  }
  for (const { c } of items)
    if (!unlocked(c.milestone))
      error(
        'locked-part',
        `${c.name} is locked until the research that leads to ${milestone(c.milestone).name} is done.`
      );

  if (!has(isEngine)) error('no-engine', 'No engine: the ship cannot change its velocity.');

  for (const d of s.drives) {
    const name = PROPELLANTS[d.propellant].name.toLowerCase();
    const room = s.capacity[d.propellant] ?? 0;
    if (room <= 0) error('no-tank', `The engines burn ${name} but no tank holds it.`);
    else if (d.load <= 0) error('no-load', `No ${name} is loaded.`);
  }
  for (const kind of PROPELLANT_KINDS) {
    const asked = design.load[kind] ?? 0;
    const room = s.capacity[kind] ?? 0;
    const got = s.propellant[kind] ?? 0;
    if (asked > got + 0.5 && room > 0)
      warn(
        'overfull',
        `Only ${kg(got)} of ${PROPELLANTS[kind].name.toLowerCase()} fits; ${kg(asked)} was asked for.`
      );
  }

  if (s.crew > s.berths)
    error('crew-berths', `${s.crew} crew but berths for ${s.berths}: add a habitat or a capsule.`);
  if (s.crew > 0 && s.stores <= 0) error('crew-supplies', 'The crew has no life support or stores.');
  if (s.crew > 0 && has((c) => c.id === 'fission_reactor_ship') && !has((c) => c.id === 'radiation_shield'))
    warn('reactor-radiation', 'The crew lives beside a reactor with no radiation shield.');

  if (s.power.balance < -1e-9) {
    if (s.power.storage > 0)
      warn(
        'power-deficit',
        `Systems draw ${kw(s.power.used)} against ${kw(s.power.made)} made: the stored energy lasts ${(s.power.storage / -s.power.balance).toFixed(1)} hours.`
      );
    else error('power-deficit', `Systems draw ${kw(s.power.used)} but power makes ${kw(s.power.made)}.`);
  } else if (s.power.engines > 0 && s.main && s.main.throttle < 1)
    warn(
      'engine-throttled',
      `Only ${kw(Math.max(0, s.power.balance))} is left for the drive, which wants ${kw(s.power.engines)}: thrust runs at ${Math.round(s.main.throttle * 100)} percent.`
    );
  const solarOnly =
    has((c) => c.id === 'solar_array') &&
    !has((c) => (c.design.generates ?? 0) > 0 && c.id !== 'solar_array');
  if (solarOnly && s.power.used > 0 && s.power.storage < s.power.used * ECLIPSE_HOURS)
    warn(
      'eclipse',
      `Batteries hold ${Math.round(s.power.storage)} kWh; a ${ECLIPSE_HOURS * 60} minute eclipse takes ${Math.round(s.power.used * ECLIPSE_HOURS)} kWh.`
    );

  if (s.heat.balance < -1e-9)
    error(
      'heat-deficit',
      `Waste heat is ${kw(s.heat.produced)} but only ${kw(s.heat.radiated)} can be radiated: add radiators.`
    );

  if (!s.builtAt.length) error('no-yard', 'No yard can build every one of these components.');
  else if (!s.builtAt.includes(design.yard))
    error('no-yard', `${yardName(design.yard)} cannot build every one of these components.`);
  else {
    const body = YARD_BODY[design.yard];
    const climb = s.climb;
    if (body && (s.main || s.boosters)) {
      if (climb.twr < MIN_LIFTOFF_TWR)
        warn(
          'no-liftoff',
          `Lift-off thrust to weight from ${BODY_NAMES[body]} is ${climb.twr.toFixed(2)} and ${MIN_LIFTOFF_TWR} is needed.`
        );
      if (climb.deltaV < climb.need)
        warn(
          'short-of-orbit',
          `Delta-v to orbit is ${kms(climb.deltaV)}; reaching low Earth orbit takes ${kms(climb.need)}.`
        );
    }
  }

  const dryWithPayload = s.dryMass + s.payloadCapacity;
  if (design.role === 'lander') {
    const rating = sum(items, (c) => c.design.landing ?? 0);
    if (rating <= 0) error('no-landing', 'A lander needs landing legs.');
    else if (dryWithPayload > rating)
      error('landing-overload', `The legs are rated for ${kg(rating)} and ${kg(dryWithPayload)} lands.`);
    if (s.main && s.main.thrust * s.main.throttle < MIN_LANDING_TWR * dryWithPayload * surfaceGravity(moon))
      warn('lander-thrust', 'The drive cannot hover the empty lander on the Moon.');
  }
  if (design.role === 'capsule') {
    const rating = sum(items, (c) => c.design.reentry ?? 0);
    if (rating <= 0) error('no-reentry', 'A ship that returns to a surface with air needs a heat shield.');
    else if (dryWithPayload > rating)
      error(
        'reentry-overload',
        `The heat shield brings home ${kg(rating)} and ${kg(dryWithPayload)} enters.`
      );
  }
  if (design.role === 'freighter' && s.payloadCapacity <= 0)
    error('no-cargo', 'A freighter needs a cargo bay.');

  if (
    design.role !== 'launcher' &&
    !has((c) => c.design.insulates === true) &&
    PROPELLANT_KINDS.some((k) => PROPELLANTS[k].cryogenic && (s.propellant[k] ?? 0) > 0)
  )
    warn('boil-off', 'Cryogenic propellant will boil off without insulation.');

  return out.sort((a, b) => Number(b.level === 'error') - Number(a.level === 'error'));
}
