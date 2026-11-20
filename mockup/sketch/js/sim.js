'use strict';
(() => {
  const MAT_FILES = ['bio_life_support', 'carbon_materials', 'ceramic', 'computation', 'exotic', 'fertiliser', 'food', 'metal-alloy', 'metal', 'nuclear', 'polymer', 'propellant', 'semiconductor_electronics', 'volatile'];
  const REC_FILES = ['ceramics_composites', 'chemicals', 'electronics', 'energy', 'life', 'metals', 'polymers'];
  const BLD_FILES = ['electronics', 'energy', 'extraction', 'habitat', 'infrastructure', 'processing'];
  const J = async p => (await fetch('data/' + p)).json();

  const CAT_NAMES = {
    bio_life_support: 'Life support', carbon_materials: 'Carbon', ceramic: 'Ceramics and regolith', computation: 'Computation', exotic: 'Exotic', fertiliser: 'Fertiliser', food: 'Food',
    metal: 'Metals and alloys', nuclear: 'Nuclear', polymer: 'Polymers', propellant: 'Fuel', semiconductor_electronics: 'Semiconductors and electronics', volatile: 'Volatiles and gases'
  };
  const CAT_ORDER = ['metal', 'volatile', 'propellant', 'ceramic', 'semiconductor_electronics', 'carbon_materials', 'polymer', 'nuclear', 'food', 'fertiliser', 'bio_life_support', 'computation', 'exotic'];
  const KIND_NAMES = { extraction: 'Extraction', processing: 'Processing', power: 'Power', electronics: 'Electronics', habitat: 'Habitat and food', infrastructure: 'Infrastructure', nuclear: 'Nuclear', special: 'Special' };
  const BUILD_SLOTS = 3;

  const D = {};
  async function load() {
    const [mats, recs, blds, comps, miles, earth, subjects] = await Promise.all([
      Promise.all(MAT_FILES.map(f => J('materials/' + f + '.json'))), Promise.all(REC_FILES.map(f => J('recipes/' + f + '.json'))),
      Promise.all(BLD_FILES.map(f => J('buildings/' + f + '.json'))), J('components.json'), J('milestones.json'), J('earth.json'), J('subjects.json')
    ]);
    D.mats = mats.flat(); D.recipes = recs.flat(); D.blds = blds.flat(); D.comps = comps; D.miles = miles; D.earth = earth; D.subjects = subjects;
    D.mat = {}; D.mats.forEach(m => D.mat[m.id] = m);
    D.rec = {}; D.recipes.forEach(r => D.rec[r.id] = r);
    D.bld = {}; D.blds.forEach(b => D.bld[b.id] = b);
    D.comp = {}; D.comps.forEach(c => D.comp[c.id] = c);
    D.cats = CAT_ORDER.filter(c => D.mats.some(m => m.category === c));
    for (const m of D.mats) if (m.kcalPerKg) KCAL[m.id] = m.kcalPerKg;
    S4.buildMats(D.mats);
    initSim();
    if (S4.initFleet) S4.initFleet();
  }

  const human = s => { const t = s.replace(/_/g, ' '); return t[0].toUpperCase() + t.slice(1); };
  const short = id => (D.mat[id] ? D.mat[id].name.split(' (')[0] : human(id));

  const KCAL = {};
  const KCAL_PERSON = 2800;
  const PER = { day: { hours: 24, unit: 'd', word: 'a day', name: 'day' }, year: { hours: 8760, unit: 'yr', word: 'a year', name: 'year' } };
  const per = { key: 'day' };
  const perOf = () => PER[per.key];

  const fmt = {
    group: n => Math.round(n).toLocaleString('en-US'),
    num(v) {
      const a = Math.abs(v);
      if (a < 0.0005) return '0';
      const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 0.1 ? 2 : 3;
      return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
    },
    people: n => fmt.group(n / 1e6) + ' M',
    population: n => (n >= 5e5 ? fmt.people(n) : fmt.group(n)),
    count: n => fmt.group(n),
    mass: kg => `${Math.abs(kg) >= 10000 ? fmt.group(kg / 1000) : fmt.num(kg / 1000)} t`,
    kcal(n) {
      const a = Math.abs(n);
      if (a < .5) return '0 kcal';
      if (a >= 1e12) return `${fmt.num(n / 1e12)} T kcal`;
      if (a >= 1e9) return `${fmt.num(n / 1e9)} G kcal`;
      if (a >= 1e6) return `${fmt.num(n / 1e6)} M kcal`;
      return `${fmt.group(n)} kcal`;
    },
    amount(id, a) {
      const u = D.mat[id] && D.mat[id].unit;
      if (u === 'cu') return fmt.group(a) + ' cu';
      if (u === 'model') return fmt.num(a);
      return fmt.mass(a);
    },
    cargo(id, a) { return fmt.amount(id, a); },
    power: kw => `${fmt.num(kw / 1000)} MW`,
    thrust: n => `${fmt.num(n / 1000)} kN`,
    pct: f => Math.round(f * 100) + '%',
    signedPct: f => { const t = fmt.pct(Math.abs(f)); return t === '0%' ? '0%' : (f < 0 ? '-' : '+') + t; },
    days(d) { return !isFinite(d) ? 'never' : d >= 3652.5 ? Math.round(d / 365.25) + ' y' : d >= 365.25 ? (d / 365.25).toFixed(1) + ' y' : Math.max(1, Math.ceil(d)) + ' d'; },
    signed(id, a) { const t = fmt.amount(id, Math.abs(a)); return t.startsWith('0 ') || t === '0' ? '0' : (a < 0 ? '-' : '+') + t; },
    rate(id, perHour, signed = false) {
      const v = perHour * perOf().hours, t = signed ? fmt.signed(id, v) : fmt.amount(id, v);
      return t === '0' ? '0' : `${t}/${perOf().unit}`;
    }
  };

  const POWER = '@power';
  const E = { id: 'earth', name: 'Earth', world: 'earth', place: 'surface', system: 'Sol', groups: [], stock: {}, queue: [], programmes: [], done: [], uid: 1, tick: 0, berths: null };
  const sites = [E];
  const cur = { site: 'earth' };
  const site = () => sites.find(s => s.id === cur.site) || E;

  function processOf(pid) {
    if (!pid) return null;
    if (pid.startsWith('extract:')) {
      const m = pid.slice(8);
      return { id: pid, name: 'Extract ' + short(m).toLowerCase(), inputs: {}, outputs: { [m]: 1000 }, power: 200, extract: m };
    }
    const r = D.rec[pid];
    const out = {}, inp = {};
    for (const [m, v] of Object.entries(r.outputs)) out[m] = v / r.hours;
    for (const [m, v] of Object.entries(r.inputs)) inp[m] = v / r.hours;
    return { id: pid, name: human(pid), inputs: inp, outputs: out, power: r.power, generates: r.generates, recipe: r };
  }

  const prerequisitesOf = tag => (D.miles.find(m => m.number === tag) || { requires: [] }).requires;
  const tagOpen = tag => prerequisitesOf(tag).every(r => E.done.includes(r));
  const missingPrerequisites = tag => prerequisitesOf(tag).filter(r => !E.done.includes(r));
  const depthOf = n => { const r = prerequisitesOf(n); return r.length ? 1 + Math.max(...r.map(depthOf)) : 0; };
  const opensTags = n => D.miles.filter(m => m.requires.includes(n)).map(m => m.number);
  const unlocked = item => tagOpen(item.milestone);
  const canStand = (b, s = site()) => (D.bld[b].where || []).includes(s.place === 'orbit' ? 'orbit' : s.world === 'luna' ? 'moon' : s.world);

  function choicesFor(building) {
    const out = [];
    for (const r of D.recipes) if (r.building === building && tagOpen(r.milestone)) out.push(processOf(r.id));
    for (const m of D.mats) if ((m.sources || []).some(s => s.body === 'earth' && s.building === building)) out.push(processOf('extract:' + m.id));
    return out;
  }

  const LIMITS = {
    pan_polymerisation: { share: .46, kind: 'input', text: 'Short of ethylene' },
    carbon_fibre_carbonisation: { share: .74, kind: 'input', text: 'Short of polyacrylonitrile' },
    steam_methane_reforming: { share: .82, kind: 'power', text: 'Short of power' }
  };

  function initSim() {
    const e = D.earth;
    Object.assign(E, { pop: e.population, workShare: e.workforceShare, growth: e.growthPerYear, gridKw: e.gridKw, kcalPerPersonDay: e.kcalPerPersonDay || KCAL_PERSON });
    E.groups = e.groups.map((g, i) => ({ id: i + 1, building: g.building, process: g.process, count: g.count, on: true }));
    E.uid = E.groups.length + 1;
    const full = {};
    for (const g of E.groups) {
      const p = processOf(g.process); if (!p) continue;
      for (const [m, v] of Object.entries(p.outputs)) full[m] = (full[m] || 0) + v * g.count;
    }
    for (const m of Object.keys(full)) E.stock[m] = full[m] * 24 * e.stockDays;
    E.stock.grcop = 5e5; E.stock.platinum = 5e4; E.stock.food_ration = 5e5;
    E.queue = [
      { id: 1, building: 'sabatier_plant', process: null, done: .41, paused: false },
      { id: 2, building: 'electrolysis_plant', process: null, done: .12, paused: false },
      { id: 3, building: 'battery_plant', process: null, done: 0, paused: true }
    ];
    E.qid = 10;
    E.done = D.miles.filter(m => !m.optional && m.number <= 4).map(m => m.number);
    E.programmes = [{ number: 5, progress: .38 }];
    E.food = D.mats.filter(m => m.category === 'food' && KCAL[m.id]).map(m => m.id);
    const station = { id: 'orbit-earth', name: 'Earth orbital station', world: 'earth', place: 'orbit', system: 'Sol', pop: 6, workShare: 1, growth: 0, gridKw: 20, berths: 6, kcalPerPersonDay: E.kcalPerPersonDay, uid: 2, qid: 2,
      groups: [{ id: 1, building: 'propellant_depot', process: null, count: 1, on: true }],
      queue: [{ id: 1, building: 'life_support_plant', process: null, done: .22, paused: false }],
      stock: { stainless_steel: 40000, food_ration: 2500, lch4: 120000, lox: 430000 }, food: E.food };
    const luna = { id: 'orbit-luna', name: 'Luna orbital station', world: 'luna', place: 'orbit', system: 'Sol', pop: 0, workShare: 1, growth: 0, gridKw: 0, berths: 0, kcalPerPersonDay: E.kcalPerPersonDay, uid: 2, qid: 1,
      groups: [{ id: 1, building: 'propellant_depot', process: null, count: 1, on: true }], queue: [], stock: {}, food: E.food };
    sites.push(station, luna);
  }

  function stands(building) { return sites.some(s => s.groups.some(g => g.building === building && g.count > 0)) || (D.bld[building] && D.bld[building].start); }
  const standing = (b, s = site()) => s.groups.filter(g => g.building === b).reduce((a, g) => a + g.count, 0);

  const fromGround = (m, building, s) => (D.mat[m].sources || []).some(x => x.building === building && x.body === s.world && s.place !== 'orbit');

  function flows(s = site()) {
    const out = {}, use = {}, actors = [];
    let pwr = 0, gen = 0, workers = 0;
    for (const g of s.groups) {
      const b = D.bld[g.building], p = processOf(g.process);
      const lim = s === E && g.process && LIMITS[g.process];
      const a = { g, b, p, share: !p ? 0 : !g.on ? 0 : lim ? lim.share : 1, limit: !p ? { kind: 'idle', text: 'No recipe set' } : !g.on ? { kind: 'off', text: 'Switched off' } : lim ? { kind: lim.kind, text: lim.text } : null };
      actors.push(a);
      if (!p) continue;
      a.out = {}; a.inp = {};
      for (const [m, v] of Object.entries(p.outputs)) { a.out[m] = v * g.count * a.share; out[m] = (out[m] || 0) + a.out[m]; }
      for (const [m, v] of Object.entries(p.inputs)) { if (fromGround(m, g.building, s)) continue; a.inp[m] = v * g.count * a.share; use[m] = (use[m] || 0) + a.inp[m]; }
      a.power = p.power * g.count * a.share;
      if (p.generates) gen += p.generates * g.count * a.share; else pwr += a.power;
      workers += g.on ? b.workers * g.count : 0;
    }
    const food = s.food || E.food;
    const avail = {};
    for (const m of food) avail[m] = Math.max(0, (out[m] || 0) - (use[m] || 0));
    const madeBy = {}; for (const m of food) if (avail[m] > 0) madeBy[m] = avail[m] * KCAL[m];
    const foodMade = Object.values(madeBy).reduce((a, v) => a + v, 0);
    const foodNeed = s.pop * s.kcalPerPersonDay / 24;
    const eat = {}, eatenBy = {};
    if (foodMade >= foodNeed) {
      const k = foodMade > 0 ? foodNeed / foodMade : 0;
      for (const m of food) if (avail[m]) { eat[m] = avail[m] * k; eatenBy[m] = madeBy[m] * k; }
    } else {
      for (const m of food) if (avail[m]) { eat[m] = avail[m]; eatenBy[m] = madeBy[m]; }
      let gap = foodNeed - foodMade;
      const stored = food.filter(m => (s.stock[m] || 0) > 0), storedKcal = stored.reduce((a, m) => a + s.stock[m] * KCAL[m], 0);
      for (const m of stored) { const kc = gap * s.stock[m] * KCAL[m] / storedKcal; eatenBy[m] = (eatenBy[m] || 0) + kc; eat[m] = (eat[m] || 0) + kc / KCAL[m]; }
      if (storedKcal > 0) gap = 0;
    }
    for (const m of Object.keys(eat)) use[m] = (use[m] || 0) + eat[m];
    const eaten = Object.values(eatenBy).reduce((a, v) => a + v, 0);
    const workAvail = s.pop * s.workShare;
    return {
      out, use, eat, actors,
      power: { supply: s.gridKw + gen, demand: pwr, grid: s.gridKw, gen },
      workers: { avail: workAvail, need: workers, share: workers ? Math.min(1, workAvail / workers) : 1 },
      food: { made: foodMade, need: foodNeed, demand: foodNeed, eaten, madeBy, eatenBy, cover: foodNeed > 0 ? Math.min(1, eaten / foodNeed) : 1 },
      compute: { made: 0, want: 0 }
    };
  }

  function cover(m, f, s = site()) {
    const net = (f.out[m] || 0) - (f.use[m] || 0);
    const stock = s.stock[m] || 0;
    if (net >= -1e-9) return Infinity;
    return stock / -net / 24;
  }

  function buildHours(id) { const b = D.bld[id]; const kg = Object.values(b.cost).reduce((a, v) => a + v, 0); return 240 + 48 * kg / 1000; }

  let madeAtHome = null;
  function earthMakes(id) {
    if (!madeAtHome) {
      madeAtHome = new Set(D.mats.filter(m => (m.sources || []).some(x => x.body === 'earth')).map(m => m.id));
      const atEarth = new Set(D.blds.filter(b => (b.where || []).includes('earth')).map(b => b.id));
      for (let changed = true; changed;) {
        changed = false;
        for (const r of D.recipes) {
          if (!atEarth.has(r.building) || !Object.keys(r.inputs).every(i => madeAtHome.has(i))) continue;
          for (const o of Object.keys(r.outputs)) if (!madeAtHome.has(o)) { madeAtHome.add(o); changed = true; }
        }
      }
    }
    return madeAtHome.has(id);
  }

  const TIER = { P: 1, E: 1.25, S: 1.5 };
  const mile = n => D.miles.find(m => m.number === n);
  const programmeDays = n => { const m = mile(n); return (60 + 30 * (n - 1)) * TIER[m.tier]; };
  const programmeCompute = n => { const m = mile(n); return n < 6 ? 0 : 1000 * (n - 5) * TIER[m.tier]; };

  function bill(n) {
    const m = mile(n), mats = {};
    for (const id of m.needs.materials) {
      if (!earthMakes(id)) continue;
      const u = D.mat[id].unit;
      if (!u) mats[id] = (mats[id] || 0) + ((m.needs.bill || {})[id] ?? 50000 * n);
      else if (u === 'model') mats[id] = (mats[id] || 0) + 1;
    }
    for (const c of m.needs.components) for (const [k, v] of Object.entries(D.comp[c].cost)) mats[k] = (mats[k] || 0) + v;
    delete mats.compute;
    return { mats, buildings: m.needs.buildings, comps: m.needs.components };
  }

  function siteNeedMet(need) {
    return sites.some(s => (need.world ? s.world === need.world : true) && (need.place ? s.place === need.place : true) && (need.people ? s.pop >= need.people : true) && (need.buildings || []).every(b => s.groups.some(g => g.building === b)));
  }

  function check(n) {
    const m = mile(n), bl = bill(n);
    const billRows = Object.entries(bl.mats).map(([id, need]) => { const have = E.stock[id] || 0; return { id, have, need, ok: have >= need }; });
    const stand = [...bl.buildings.map(id => ({ kind: 'building', id, ok: !!stands(id) })), ...bl.comps.map(id => ({ kind: 'component', id, ok: D.comp[id].builtAt.some(stands) }))];
    const siteRows = ((m.needs.sites) || []).map(need => ({ label: need.label.replace(/^No /, '').replace(/^./, c => c.toUpperCase()), ok: siteNeedMet(need) }));
    const requires = m.requires.map(r => ({ number: r, ok: E.done.includes(r) }));
    const missing = [
      ...requires.filter(r => !r.ok).map(r => `Needs ${mile(r.number).name}`),
      ...stand.filter(s => !s.ok).map(s => `${s.kind === 'building' ? D.bld[s.id].name : D.comp[s.id].name} must stand`),
      ...siteRows.filter(s => !s.ok).map(s => s.label),
      ...billRows.filter(b => !b.ok).map(b => `${D.mat[b.id].name} short`)
    ];
    return { bill: billRows, stand, sites: siteRows, requires, missing };
  }

  function milestoneState(n) {
    if (E.done.includes(n)) return 'done';
    if (E.programmes.some(p => p.number === n)) return 'running';
    if (!mile(n).requires.every(r => E.done.includes(r))) return 'locked';
    return check(n).missing.length ? 'waiting' : 'ready';
  }

  const MS_SHORT = { 1: 'Orbital launch', 2: 'Propellant transfer', 3: 'LEO station', 4: 'Space solar power', 5: 'Data centres', 6: 'Lunar outpost', 7: 'Fission power', 8: 'Lunar ice', 9: 'Regolith oxygen', 10: 'Regolith building', 11: 'Moon base', 12: 'Cislunar fuel', 13: 'Electric drive', 14: 'Nuclear thermal', 15: 'Asteroid survey', 16: 'Volatile mining', 17: 'Metal mining', 18: 'Orbital shipyard', 19: 'Space chips', 20: 'Power stations', 21: 'Mars ISRU', 22: 'D-T fusion', 23: 'Helium-3', 24: 'Fusion drive', 25: 'Gas giant mining', 26: 'Megastructures', 27: 'Superconductors', 28: 'Exotic matter', 29: 'Jump point' };
  const KIND_DESC = { extraction: 'Takes material out of the ground.', processing: 'Turns raw materials into industrial ones.', power: 'Makes electricity.', electronics: 'Builds chips, cells and electronics.', habitat: 'Feeds and houses people.', infrastructure: 'Launch, yards and depots.', nuclear: 'Nuclear fuel and reactors.', special: 'Late-game exotic industry.' };
  const COMP_DESC = { structure: 'Hull frame and tanks.', propulsion: 'Moves the ship.', power: 'Makes the ship\'s electricity.', thermal: 'Gets rid of heat.', habitat: 'Keeps a crew alive.', protection: 'Shields against radiation and debris.', electronics: 'Computing and control.' };
  const uniq = a => [...new Set(a)];
  const desc = {
    mat: id => D.mat[id].why || '',
    bld(id) {
      const b = D.bld[id];
      let outs = uniq(D.recipes.filter(r => r.building === id).flatMap(r => Object.keys(r.outputs)));
      if (!outs.length) outs = D.mats.filter(m => (m.sources || []).some(x => x.building === id)).map(m => m.id);
      const list = outs.slice(0, 4).map(m => short(m).toLowerCase()).join(', ');
      return `${KIND_DESC[b.kind]}${list ? ' Makes ' + list + (outs.length > 4 ? ' and more' : '') + '.' : ''}`;
    },
    comp(id) { return COMP_DESC[D.comp[id].kind] || ''; },
    ms: n => mile(n).unlocks
  };

  Object.assign(S4, { KIND_DESC, KCAL, KCAL_PERSON, PER, per, perOf, MS_SHORT, desc, D, load, E, sites, cur, site, fmt, human, short, flows, cover, processOf, choicesFor, standing, stands, canStand, buildHours, milestoneState, check, bill, programmeDays, programmeCompute, unlocked, tagOpen, missingPrerequisites, prerequisitesOf, depthOf, opensTags, mile, CAT_NAMES, KIND_NAMES, BUILD_SLOTS, POWER });
})();
