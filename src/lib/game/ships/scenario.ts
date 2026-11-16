import { classes } from '#lib/game/classes.svelte.ts';
import { milestones } from '#lib/game/data/index.ts';
import { economy, homeSite, newSite, queueBuilding, standFirst, touch } from '#lib/game/economy/index.ts';
import { lock, newDesign, setCount, type ShipDesign } from '#lib/game/shipdesign/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { orderShips } from './build.ts';
import { foundSite } from './colonise.ts';
import { launch } from './launch.ts';
import { addOrder, goTo } from './orders.ts';
import { ships } from './state.svelte.ts';
import type { Vessel } from './types.ts';

function design(id: string, name: string, role: ShipDesign['role'], parts: [string, number][]): ShipDesign {
  let d: ShipDesign = { ...newDesign(id, name), role, yard: 'rocket_factory' };
  for (const [c, n] of parts) d = setCount(d, c, n);
  d = lock(d);
  classes.add(d);
  return d;
}

function vessel(d: ShipDesign, at: Vessel['at'], fill: Partial<Vessel> = {}): Vessel {
  const id = `ship-${ships.nextId++}`;
  ships.built++;
  const v: Vessel = {
    id,
    name: `${d.name} ${ships.built}`,
    design: d.id,
    at,
    trip: null,
    propellant: {},
    cargo: {},
    crew: 0,
    orders: [],
    run: null,
    progress: 0,
    blocked: null,
    ...fill
  };
  ships.vessels.push(v);
  return v;
}

export function seedTravel(game: Game): void {
  if (ships.vessels.length > 0 || classes.saved.length > 0) return;
  economy.done = milestones.filter((m) => !m.optional && m.number <= 4).map((m) => m.number);
  const earth = homeSite();
  earth.stock.grcop = 5e5;
  earth.stock.platinum = 5e4;
  const booster = design('travel-booster', 'Booster', 'launcher', [
    ['chemical_engine_methalox', 3],
    ['propellant_tank', 25],
    ['structure_truss', 1],
    ['landing_legs', 1]
  ]);
  design('travel-orbiter', 'Orbiter', 'freighter', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ]);
  const tug = design('travel-tug', 'Tug', 'freighter', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 14],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ]);
  earth.stock.food_ration = 5e5;
  const orbiter = classes.find('travel-orbiter')!;
  const stageOne = vessel(booster, { kind: 'site', site: 'earth' });
  const stageTwo = vessel(orbiter, { kind: 'site', site: 'earth' });
  launch(game, earth, {
    stages: [stageOne.id, stageTwo.id],
    payload: { kind: 'cargo', cargo: { stainless_steel: 3000 } }
  });
  vessel(orbiter, { kind: 'site', site: 'earth' });
  orderShips(earth, 'travel-orbiter', 1);
  const station = newSite(economy, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0.6 })!;
  standFirst(economy, station, 'propellant_depot');
  queueBuilding(economy, station, 'life_support_plant', null);
  station.population = 6;
  station.berths = 6;
  station.gridKw = 20;
  station.stock.stainless_steel = 40_000;
  station.stock.food_ration = 2500;
  station.stock.lch4 = 120_000;
  station.stock.lox = 430_000;
  const outpost = newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;
  standFirst(economy, outpost, 'propellant_depot');
  const flying = vessel(
    tug,
    { kind: 'site', site: station.id },
    { propellant: { methalox: 200_000 }, cargo: { stainless_steel: 4000 } }
  );
  goTo(flying, outpost);
  vessel(tug, { kind: 'site', site: station.id }, { propellant: { methalox: 90_000 } });
  const idle = vessel(tug, { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 20_000 } });
  addOrder(idle, { type: 'dock', site: station.id });
  game.advance(86400);
  touch();
}

export function seedBelt(game: Game, outpost = false): void {
  if (ships.vessels.length > 0 || classes.saved.length > 0) return;
  economy.done = milestones.filter((m) => !m.optional && m.number <= 14).map((m) => m.number);
  const probe = design('belt-probe', 'Survey probe', 'probe', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 2],
    ['structure_truss', 1],
    ['solar_array', 1],
    ['avionics', 1],
    ['survey_suite', 1]
  ]);
  const lander = design('belt-lander', 'Lander', 'lander', [
    ['chemical_engine_hydrolox', 1],
    ['propellant_tank', 1],
    ['structure_truss', 1],
    ['landing_legs', 1],
    ['cargo_bay', 1]
  ]);
  vessel(probe, { kind: 'orbit', body: 'mars', angle: 0 }, { propellant: { methalox: 3000 } });
  vessel(probe, { kind: 'orbit', body: 'bennu', angle: 0 }, { propellant: { methalox: 3000 } });
  if (outpost) {
    const founder = vessel(
      lander,
      { kind: 'surface', body: 'luna' },
      { crew: 4, cargo: { stainless_steel: 2500, copper: 400, ai_models: 3 } }
    );
    const site = foundSite(game, founder, 'ice_mine', 'luna-south-pole');
    if (typeof site !== 'string') {
      site.gridKw = 2000;
      site.stock.food_ration = 5000;
    }
  }
  vessel(
    lander,
    { kind: 'surface', body: 'luna' },
    {
      propellant: { hydrolox: 2000 },
      cargo: { stainless_steel: 2500, copper: 400, li_ion_cell: 300, ai_models: 3, ndfeb_magnet: 100 }
    }
  );
  game.advance(86400);
  touch();
}

export function seedJump(game: Game, outpost = false): void {
  if (ships.vessels.length > 0 || classes.saved.length > 0) return;
  economy.done = milestones.filter((m) => !m.optional && m.number < milestones.length).map((m) => m.number);
  const jump = game.world.systems[0]?.jumps[0];
  if (!jump) return;
  const probe = design('jump-probe', 'Survey probe', 'probe', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 2],
    ['structure_truss', 1],
    ['solar_array', 1],
    ['avionics', 1],
    ['survey_suite', 1]
  ]);
  if (outpost) {
    jump.surveyed = true;
    const site = newSite(economy, { worldBody: jump.id, bodyName: jump.name, place: 'point', angle: 0 })!;
    standFirst(economy, site, 'data_centre');
    site.population = 6;
    site.berths = 6;
    site.gridKw = 2000;
    site.stock.food_ration = 5000;
    site.stock.stainless_steel = 200_000;
  }
  vessel(probe, { kind: 'orbit', body: jump.id, angle: 0 }, { propellant: { methalox: 3000 } });
  vessel(probe, { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 3000 } });
  game.advance(86400);
  touch();
}
