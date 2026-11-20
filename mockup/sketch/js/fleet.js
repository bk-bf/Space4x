'use strict';
(() => {
  const { D, fmt, esc } = S4;
  const G0 = 9.80665;
  const GRAV = { earth: 3.986004418e14 / 6.371e6 ** 2, moon: 4.9048695e12 / 1.7374e6 ** 2, mars: 4.282837e13 / 3.3895e6 ** 2 };
  const EARTH_TO_ORBIT = 9400;
  const MIN_LIFTOFF = 1.2, MIN_LANDING = 1;
  const ULLAGE = .98;
  const split = (f, o, r) => ({ [f]: 1 / (1 + r), [o]: r / (1 + r) });
  const PROPELLANTS = {
    kerolox: { name: 'Kerosene and oxygen', density: 1017, cryogenic: true, mix: split('rp1', 'lox', 2.34) },
    methalox: { name: 'Methane and oxygen', density: 833, cryogenic: true, mix: split('lch4', 'lox', 3.6) },
    hydrolox: { name: 'Hydrogen and oxygen', density: 357, cryogenic: true, mix: split('lh2', 'lox', 5.88) },
    hypergolic: { name: 'Hydrazine and tetroxide', density: 1163, cryogenic: false, mix: split('mmh', 'nto', 1.65) },
    hydrogen: { name: 'Liquid hydrogen', density: 70.8, cryogenic: true, mix: { lh2: 1 } },
    deuterium: { name: 'Liquid deuterium', density: 162, cryogenic: true, mix: { deuterium: 1 } },
    xenon: { name: 'Xenon', density: 1500, cryogenic: false, mix: { xenon: 1 } }
  };
  const KINDS = Object.keys(PROPELLANTS);
  const massIn = (k, m3) => m3 * PROPELLANTS[k].density * ULLAGE;
  const volumeFor = (k, kg) => kg / (PROPELLANTS[k].density * ULLAGE);
  const ROLES = ['launcher', 'transfer', 'lander', 'capsule', 'freighter', 'probe'];
  const ROLE_NAMES = { launcher: 'Launch vehicle', transfer: 'Transfer vehicle', lander: 'Lander', capsule: 'Return capsule', freighter: 'Freighter', probe: 'Probe' };
  const YARDS = ['rocket_factory', 'orbital_shipyard'];
  const COMPONENT_KINDS = ['propulsion', 'structure', 'habitat', 'power', 'thermal', 'protection', 'electronics'];
  const KIND_NAMES = { propulsion: 'Drives', structure: 'Structure', habitat: 'Crew', power: 'Power', thermal: 'Heat', protection: 'Shields', electronics: 'Avionics' };
  const yardName = y => D.bld[y].name;

  const massOf = c => (c.design && c.design.mass) ?? (c.performance ? c.performance.mass : 0) ?? 0;
  const isEngine = c => c.kind === 'propulsion' && !!c.performance;
  const kgT = n => `${Math.round(n).toLocaleString('en-US')} kg`;
  const kwT = n => `${(Math.round(n * 10) / 10).toLocaleString('en-US')} kW`;
  const kmsT = n => `${(n / 1000).toFixed(1)} km/s`;
  const sum = (items, f) => items.reduce((t, { c, count }) => t + f(c) * count, 0);
  const dvOf = (isp, m0, m1) => (m1 > 0 && m0 > m1 ? isp * G0 * Math.log(m0 / m1) : 0);

  function catalogue() {
    return [...D.comps].sort((a, b) => COMPONENT_KINDS.indexOf(a.kind) - COMPONENT_KINDS.indexOf(b.kind) || a.milestone - b.milestone || a.name.localeCompare(b.name));
  }

  function allocate(tanks, load) {
    const free = new Map(tanks.map(({ c, count }) => [c.id, (c.design.volume || 0) * count]));
    const carried = {}, capacity = {};
    const accepts = k => tanks.filter(({ c }) => (c.design.propellants || []).includes(k));
    for (const k of KINDS) { const room = accepts(k).reduce((t, { c, count }) => t + (c.design.volume || 0) * count, 0); if (room > 0) capacity[k] = massIn(k, room); }
    for (const k of KINDS) {
      let want = volumeFor(k, Math.max(0, load[k] || 0)), took = 0;
      for (const { c } of accepts(k)) { if (want <= 0) break; const left = free.get(c.id) || 0, use = Math.min(left, want); free.set(c.id, left - use); want -= use; took += use; }
      if (took > 0) carried[k] = massIn(k, took);
    }
    return { carried, capacity };
  }

  function drivesOf(engines, carried, dry, payload, powerAvailable) {
    const groups = new Map();
    for (const e of engines) { const k = (e.c.design.propellants || []).find(p => p in PROPELLANTS); if (k) groups.set(k, [...(groups.get(k) || []), e]); }
    const others = k => KINDS.filter(x => x !== k).reduce((t, x) => t + (carried[x] || 0), 0);
    return [...groups].map(([k, list]) => {
      const thrust = sum(list, c => c.performance.thrust), thrustSeaLevel = sum(list, c => c.performance.thrustSeaLevel ?? c.performance.thrust);
      const flow = list.reduce((t, { c, count }) => t + c.performance.thrust * count / c.performance.isp, 0);
      const isp = thrust / flow, power = sum(list, c => c.performance.power || 0);
      const throttle = power > 0 ? Math.min(1, powerAvailable / power) : 1, load = carried[k] || 0;
      const m1 = dry + others(k) + payload;
      return { propellant: k, count: list.reduce((t, { count }) => t + count, 0), isp, thrust, thrustSeaLevel, power, throttle, load, deltaV: load > 0 ? dvOf(isp, m1 + load, m1) : 0 };
    });
  }

  function condition(main, dry, prop, payload) {
    const mass = dry + prop + payload, thrust = main ? main.thrust * main.throttle : 0;
    const twr = b => (!main || mass <= 0 ? 0 : (b === 'earth' ? main.thrustSeaLevel * main.throttle : thrust) / (mass * GRAV[b]));
    const t = { earth: twr('earth'), moon: twr('moon'), mars: twr('mars') };
    return { mass, deltaV: main ? main.deltaV : 0, acceleration: mass > 0 ? thrust / mass : 0, thrustToWeight: t, liftoff: { earth: t.earth >= MIN_LIFTOFF, moon: t.moon >= MIN_LIFTOFF, mars: t.mars >= MIN_LIFTOFF } };
  }

  function designStats(design, open = S4.tagOpen) {
    const items = design.parts.filter(p => p.count > 0 && D.comp[p.component]).map(p => ({ c: D.comp[p.component], count: p.count }));
    const lines = items.map(({ c, count }) => ({ component: c.id, name: c.name, count, mass: massOf(c) * count, cost: Object.fromEntries(Object.entries(c.cost).map(([k, v]) => [k, v * count])) }));
    const dryMass = lines.reduce((t, l) => t + l.mass, 0);
    const { carried, capacity } = allocate(items.filter(({ c }) => (c.design.volume || 0) > 0), design.load);
    const propellantMass = KINDS.reduce((t, k) => t + (carried[k] || 0), 0);
    const payloadCapacity = sum(items, c => c.design.cargo || 0);
    const engines = items.filter(({ c }) => isEngine(c));
    const made = sum(items, c => c.design.generates || 0), used = sum(items.filter(({ c }) => !isEngine(c)), c => c.design.power || 0);
    const engineDraw = sum(engines, c => c.performance.power || 0), available = Math.max(0, made - used);
    const drives = drivesOf(engines, carried, dryMass, payloadCapacity, available), emptyDrives = drivesOf(engines, carried, dryMass, 0, available);
    const mainEmpty = [...emptyDrives].sort((a, b) => b.deltaV - a.deltaV || b.thrust * b.throttle - a.thrust * a.throttle)[0];
    const mainLoaded = mainEmpty && drives.find(d => d.propellant === mainEmpty.propellant);
    const loaded = condition(mainLoaded, dryMass, propellantMass, payloadCapacity), empty = condition(mainEmpty, dryMass, propellantMass, 0);
    const automated = items.some(({ c }) => c.design.automates === true);
    const crew = sum(items, c => (automated && !c.design.housing ? 0 : c.design.crew || 0));
    const berths = sum(items, c => c.design.housing || 0), stores = sum(items, c => c.design.stores || 0);
    const regen = Math.min(crew, sum(items, c => c.design.supports || 0)), daily = regen * 1 + (crew - regen) * 5;
    const endurance = crew > 0 && daily > 0 ? stores / daily : undefined;
    const storage = sum(items, c => c.design.storage || 0);
    const produced = sum(items.filter(({ c }) => !isEngine(c)), c => c.design.heat ?? c.design.power ?? 0) + sum(engines, c => c.design.heat ?? c.performance.power ?? 0) * Math.min(1, engineDraw > 0 ? available / engineDraw : 1);
    const radiated = sum(items, c => c.design.radiates || 0) + .5 * dryMass / 1000;
    const builtAt = YARDS.filter(y => items.every(({ c }) => c.builtAt.includes(y)));
    const cost = {}; for (const l of lines) for (const [k, v] of Object.entries(l.cost)) cost[k] = (cost[k] || 0) + v;
    const main = loaded.mass > 0 ? mainLoaded : undefined;
    const s = { lines, dryMass, propellant: carried, capacity, propellantMass, payloadCapacity, loaded, empty, drives, main, crew, berths, stores, endurance, power: { made, used, engines: engineDraw, balance: made - used, storage }, heat: { produced, radiated, balance: radiated - produced }, builtAt, cost };
    s.issues = issuesOf(design, items, s, open);
    s.errors = s.issues.filter(i => i.level === 'error').length;
    return s;
  }

  function issuesOf(design, items, s, open) {
    const out = [], error = (code, text) => out.push({ level: 'error', code, text }), warn = (code, text) => out.push({ level: 'warning', code, text });
    const has = f => items.some(({ c }) => f(c));
    if (!items.length) { error('no-parts', 'Add components to the class.'); return out; }
    for (const { c } of items) if (!open(c.milestone)) error('locked-part', `${c.name} is locked until the research that leads to ${S4.mile(c.milestone).name} is done.`);
    if (!has(isEngine)) error('no-engine', 'No engine: the ship cannot change its velocity.');
    for (const d of s.drives) { const n = PROPELLANTS[d.propellant].name.toLowerCase(); if ((s.capacity[d.propellant] || 0) <= 0) error('no-tank', `The engines burn ${n} but no tank holds it.`); else if (d.load <= 0) error('no-load', `No ${n} is loaded.`); }
    for (const k of KINDS) { const asked = design.load[k] || 0, got = s.propellant[k] || 0; if (asked > got + .5 && (s.capacity[k] || 0) > 0) warn('overfull', `Only ${kgT(got)} of ${PROPELLANTS[k].name.toLowerCase()} fits; ${kgT(asked)} was asked for.`); }
    if (s.crew > s.berths) error('crew-berths', `${s.crew} crew but berths for ${s.berths}: add a habitat or a capsule.`);
    if (s.crew > 0 && s.stores <= 0) error('crew-supplies', 'The crew has no life support or stores.');
    if (s.crew > 0 && has(c => c.id === 'fission_reactor_ship') && !has(c => c.id === 'radiation_shield')) warn('reactor-radiation', 'The crew lives beside a reactor with no radiation shield.');
    if (s.power.balance < -1e-9) {
      if (s.power.storage > 0) warn('power-deficit', `Systems draw ${kwT(s.power.used)} against ${kwT(s.power.made)} made: the stored energy lasts ${(s.power.storage / -s.power.balance).toFixed(1)} hours.`);
      else error('power-deficit', `Systems draw ${kwT(s.power.used)} but power makes ${kwT(s.power.made)}.`);
    } else if (s.power.engines > 0 && s.main && s.main.throttle < 1) warn('engine-throttled', `Only ${kwT(Math.max(0, s.power.balance))} is left for the drive, which wants ${kwT(s.power.engines)}: thrust runs at ${Math.round(s.main.throttle * 100)} percent.`);
    const solarOnly = has(c => c.id === 'solar_array') && !has(c => (c.design.generates || 0) > 0 && c.id !== 'solar_array');
    if (solarOnly && s.power.used > 0 && s.power.storage < s.power.used * .6) warn('eclipse', `Batteries hold ${Math.round(s.power.storage)} kWh; a 36 minute eclipse takes ${Math.round(s.power.used * .6)} kWh.`);
    if (s.heat.balance < -1e-9) error('heat-deficit', `Waste heat is ${kwT(s.heat.produced)} but only ${kwT(s.heat.radiated)} can be radiated: add radiators.`);
    if (!s.builtAt.length) error('no-yard', 'No yard can build every one of these components.');
    else if (!s.builtAt.includes(design.yard)) error('no-yard', `${yardName(design.yard)} cannot build every one of these components.`);
    else {
      if (design.yard === 'rocket_factory' && s.main && !s.loaded.liftoff.earth) warn('no-liftoff', `Alone this cannot leave Earth: thrust to weight is ${s.loaded.thrustToWeight.earth.toFixed(2)} and ${MIN_LIFTOFF} is needed. It must ride a lower stage in a launch stack.`);
      if (design.role === 'launcher' && s.main && s.loaded.deltaV < EARTH_TO_ORBIT) warn('short-of-orbit', `Delta-v is ${kmsT(s.loaded.deltaV)}; reaching low Earth orbit takes ${kmsT(EARTH_TO_ORBIT)}.`);
    }
    const dryP = s.dryMass + s.payloadCapacity;
    if (design.role === 'lander') {
      const r = sum(items, c => c.design.landing || 0);
      if (r <= 0) error('no-landing', 'A lander needs landing legs.'); else if (dryP > r) error('landing-overload', `The legs are rated for ${kgT(r)} and ${kgT(dryP)} lands.`);
      if (s.main && s.main.thrust * s.main.throttle < MIN_LANDING * dryP * GRAV.moon) warn('lander-thrust', 'The drive cannot hover the empty lander on the Moon.');
    }
    if (design.role === 'capsule') { const r = sum(items, c => c.design.reentry || 0); if (r <= 0) error('no-reentry', 'A ship that returns to a surface with air needs a heat shield.'); else if (dryP > r) error('reentry-overload', `The heat shield brings home ${kgT(r)} and ${kgT(dryP)} enters.`); }
    if (design.role === 'freighter' && s.payloadCapacity <= 0) error('no-cargo', 'A freighter needs a cargo bay.');
    if (design.role !== 'launcher' && !has(c => c.design.insulates === true) && KINDS.some(k => PROPELLANTS[k].cryogenic && (s.propellant[k] || 0) > 0)) warn('boil-off', 'Cryogenic propellant will boil off without insulation.');
    return out.sort((a, b) => (b.level === 'error') - (a.level === 'error'));
  }

  const scaled = (n, cap) => Math.min(cap, 1 + Math.floor(Math.log2(Math.max(1, n))));
  function designSpec(design) {
    const count = id => (design.parts.find(p => p.component === id) || { count: 0 }).count;
    const secs = [], section = (core, times, top, bottom) => { for (let i = 0; i < times; i++) secs.push({ core, top, bottom }); };
    if (count('fission_reactor_ship')) section('reactor', scaled(count('fission_reactor_ship'), 2));
    if (count('propellant_tank')) section('tank', scaled(count('propellant_tank'), 4));
    if (count('copv')) section('fuel', scaled(count('copv'), 2));
    if (count('structure_truss')) section('truss', scaled(count('structure_truss'), 3));
    if (count('cargo_bay')) section('hull', scaled(count('cargo_bay'), 3), 'cargo2', 'cargo2');
    if (count('habitat_module')) section('crew', scaled(count('habitat_module'), 3));
    if (count('inflatable_habitat')) section('ring', scaled(count('inflatable_habitat'), 2));
    if (count('life_support_unit')) section('hull', 1);
    if (count('radiation_shield')) section('armor', scaled(count('radiation_shield'), 2));
    if (count('heat_shield') && count('crew_capsule')) section('armor', 1);
    const att = [...Array(Math.min(4, Math.ceil(count('radiator') / 2))).fill('radiator'), ...Array(Math.min(4, Math.ceil(count('solar_array') / 2))).fill('solar'), ...Array(Math.min(2, count('rcs_thruster'))).fill('pod'), ...Array(count('landing_legs') ? 2 : 0).fill('fin'), ...Array(count('avionics') ? 1 : 0).fill('antenna'), ...Array(count('sampling_arm') ? 1 : 0).fill('dish')];
    if (att.length && !secs.length) section('hull', 1);
    const slots = secs.flatMap((s, i) => (s.top ? [] : [[i, 'top'], [i, 'bottom']]));
    att.forEach((name, n) => { const at = slots[n]; if (at) secs[at[0]][at[1]] = name; });
    const parts = secs.slice(0, 16).map(s => (s.bottom && !s.top ? [s.core, s.bottom] : s.bottom ? [s.core, s.top, s.bottom] : s.top ? [s.core, s.top] : [s.core]));
    const engines = design.parts.filter(p => D.comp[p.component] && isEngine(D.comp[p.component]) && p.count > 0);
    const main = engines.some(e => e.component !== 'rcs_thruster') ? engines.filter(e => e.component !== 'rcs_thruster') : engines;
    const n = main.reduce((t, e) => t + e.count, 0);
    const spec = { id: 'd:' + design.parts.map(p => p.component + p.count).join(','), name: design.name, parts };
    if (n > 0) spec.stern = n >= 4 || main.some(e => e.component === 'ntr_engine' || e.component === 'fusion_drive') ? ['big'] : ['engines', Math.min(3, n)];
    const has = id => count(id) > 0;
    const bow = has('crew_capsule') ? 'bridge' : has('docking_adapter') ? 'dock' : has('heat_shield') ? 'prow' : has('cargo_bay') ? 'blunt' : undefined;
    if (bow) spec.bow = bow;
    return spec;
  }
  const specEmpty = spec => !spec.stern && !spec.parts.length && !spec.bow;

  const ART = new Map();
  function shipArt(design, w, h) {
    const spec = designSpec(design);
    const key = spec.id + '@' + w + 'x' + h;
    if (ART.has(key)) return ART.get(key);
    let url = '';
    if (!specEmpty(spec)) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const f = { w, h, d: new Uint8ClampedArray(w * h * 4) };
      for (let i = 0; i < f.d.length; i += 4) { f.d[i] = 1; f.d[i + 1] = 2; f.d[i + 2] = 3; }
      const sp = shipSprite(spec, 1.5), S = Math.max(.25, Math.min(3, (w - 4) / sp.len, (h - 2) / (sp.half * 2)));
      const craft = new Craft(spec, PALS.civ, { thr: 0 });
      craft.draw(f, w / 2, h / 2, S);
      const img = new ImageData(w, h);
      for (let i = 0; i < f.d.length; i += 4) {
        const blank = f.d[i] === 1 && f.d[i + 1] === 2 && f.d[i + 2] === 3;
        img.data[i] = f.d[i]; img.data[i + 1] = f.d[i + 1]; img.data[i + 2] = f.d[i + 2]; img.data[i + 3] = blank ? 0 : 255;
      }
      cv.getContext('2d').putImageData(img, 0, 0);
      url = cv.toDataURL();
    }
    ART.set(key, url);
    return url;
  }
  const artImg = (design, w, h, scale = 1) => { const u = shipArt(design, w, h); return u ? `<img class="px" src="${u}" width="${w * scale}" height="${h * scale}" alt="">` : `<span style="width:${w * scale}px;height:${h * scale}px"></span>`; };

  const F = { classes: [], vessels: [], launches: [], yard: {}, uid: 1 };
  const needed = d => new Set(d.parts.flatMap(p => { const c = D.comp[p.component], k = c && isEngine(c) ? (c.design.propellants || []).find(x => x in PROPELLANTS) : null; return k ? [k] : []; }));
  function refill(before, after) {
    const was = designStats({ ...after, parts: before.parts, load: before.load }, () => true), now = designStats({ ...after, load: {} }, () => true), wanted = needed(after), load = {};
    for (const k of KINDS) {
      const room = now.capacity[k] || 0; if (room <= 0) continue;
      const asked = after.load[k], wasRoom = was.capacity[k] || 0, wasFull = wasRoom > 0 && (was.propellant[k] || 0) >= wasRoom - .5;
      if (asked === undefined) { if (wanted.has(k)) load[k] = room; } else load[k] = wasFull ? room : Math.min(asked, room);
    }
    after.load = load;
    return after;
  }
  const design = (id, name, role, yard, parts, locked = true) => {
    const d = refill({ parts: [], load: {} }, { id, name, role, yard, parts: parts.map(([component, count]) => ({ component, count })), load: {}, locked });
    F.classes.push(d);
    return d;
  };
  const classOf = id => F.classes.find(c => c.id === id);
  const statsOf = v => designStats(classOf(v.design), () => true);

  function vessel(cls, at, o = {}) {
    const n = F.uid++;
    const v = { id: 'v' + n, name: `${cls.name} ${n}`, design: cls.id, at, trip: null, propellant: o.propellant || {}, cargo: o.cargo || {}, crew: 0, orders: o.orders || [], run: null, blocked: null };
    F.vessels.push(v);
    return v;
  }

  function initFleet() {
    const booster = design('booster', 'Booster', 'launcher', 'rocket_factory', [['chemical_engine_methalox', 3], ['propellant_tank', 25], ['structure_truss', 1], ['landing_legs', 1]]);
    const orbiter = design('orbiter', 'Orbiter', 'freighter', 'rocket_factory', [['chemical_engine_methalox', 1], ['propellant_tank', 6], ['structure_truss', 1], ['cargo_bay', 2]]);
    const tug = design('tug', 'Tug', 'freighter', 'rocket_factory', [['chemical_engine_methalox', 1], ['propellant_tank', 14], ['structure_truss', 1], ['cargo_bay', 2]]);
    vessel(booster, { kind: 'site', site: 'earth' });
    vessel(orbiter, { kind: 'orbit', body: 'earth' }, { propellant: { methalox: 7400 }, cargo: { stainless_steel: 3000 } });
    vessel(orbiter, { kind: 'site', site: 'earth' });
    const flying = vessel(tug, { kind: 'site', site: 'orbit-earth' }, { propellant: { methalox: 55200 }, cargo: { stainless_steel: 4000 }, orders: [{ type: 'dock', site: 'orbit-luna' }] });
    flying.trip = { to: 'Luna orbit', left: 4, total: 5 };
    vessel(tug, { kind: 'site', site: 'orbit-earth' }, { propellant: { methalox: 90000 } });
    vessel(tug, { kind: 'site', site: 'orbit-earth' }, { propellant: { methalox: 20000 }, orders: [] });
    F.yard.earth = [{ id: 1, design: 'orbiter', name: 'Orbiter', yard: 'rocket_factory', done: .62, paused: false }];
    F.yard.qid = 2;
    F.launches.push({ at: 'Nov 15', stages: ['Booster 1', 'Orbiter 2'], payload: 3000, propellant: 489000, returned: 1, lost: 0 });
  }

  const siteName = id => (S4.sites.find(s => s.id === id) || { name: id }).name;
  const whereabouts = at => (at.kind === 'site' ? siteName(at.site) : at.kind === 'orbit' ? `${at.body === 'earth' ? 'Earth' : 'Luna'} orbit` : 'Surface');
  const vesselWhere = v => (v.trip ? `To ${v.trip.to}, ${v.trip.left.toFixed(1)} d left` : whereabouts(v.at));
  const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const tileWhere = v => (v.trip ? `${fmt.days(v.trip.left)} left` : clip(whereabouts(v.at), 17));
  const propellantMass = v => Object.values(v.propellant).reduce((a, b) => a + b, 0);
  const cargoMass = v => Object.values(v.cargo).reduce((a, b) => a + b, 0);
  function tankFill(v) { const s = statsOf(v), k = s.main && s.main.propellant, cap = k ? s.capacity[k] || 0 : 0; return cap > 0 ? propellantMass(v) / cap : 0; }
  const propellantText = v => Object.entries(v.propellant).filter(([, kg]) => kg > 0).map(([k, kg]) => `${PROPELLANTS[k].name} ${fmt.mass(kg)}`).join(', ') || 'none';
  const cargoText = v => Object.entries(v.cargo).filter(([, kg]) => kg > 0).map(([m, kg]) => `${S4.short(m)} ${fmt.mass(kg)}`).join(', ') || 'empty';
  function vesselTip(v) {
    const s = statsOf(v);
    return S4.T(v.name, classOf(v.design).name, S4.dl(vesselWhere(v)), `Propellant: ${propellantText(v)}`, `Cargo: ${cargoText(v)} (${fmt.mass(cargoMass(v))} of ${fmt.mass(s.payloadCapacity)})`, `Crew ${v.crew} of ${s.berths} berths`, v.blocked ? '!' + v.blocked : v.run ? 'Supply run' : `${v.orders.length} orders`);
  }
  const kms = dv => `${(dv / 1000).toFixed(2)} km/s`;
  const propIcon = k => Object.entries(PROPELLANTS[k].mix).sort((a, b) => b[1] - a[1])[0][0];

  Object.assign(S4, { refill, PROPELLANTS, PROP_KINDS: KINDS, ROLES, ROLE_NAMES, YARDS, COMPONENT_KINDS, COMP_KIND_NAMES: KIND_NAMES, yardName, massOf, isEngine, catalogue, designStats, designSpec, specEmpty, shipArt, artImg, F, classOf, statsOf, vessel, initFleet, whereabouts, vesselWhere, tileWhere, tankFill, vesselTip, propellantText, cargoText, propellantMass, cargoMass, kms, propIcon, EARTH_TO_ORBIT, GRAV, G0, dvOf, siteName, clip });
})();
