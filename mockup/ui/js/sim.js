'use strict';
(() => {
  const MAT_FILES = ['bio_life_support', 'carbon_materials', 'ceramic', 'computation', 'exotic', 'fertiliser', 'food', 'metal-alloy', 'metal', 'nuclear', 'polymer', 'propellant', 'semiconductor_electronics', 'volatile'];
  const REC_FILES = ['ceramics_composites', 'chemicals', 'electronics', 'energy', 'life', 'metals', 'polymers'];
  const BLD_FILES = ['electronics', 'energy', 'extraction', 'habitat', 'infrastructure', 'processing'];
  const J = async p => (await fetch('data/' + p)).json();

  const CAT_NAMES = {
    bio_life_support: 'Life support', carbon_materials: 'Carbon', ceramic: 'Ceramics and regolith', computation: 'Computation', exotic: 'Exotic', fertiliser: 'Fertiliser', food: 'Food',
    metal: 'Metals and alloys', nuclear: 'Nuclear', polymer: 'Polymers', propellant: 'Propellant', semiconductor_electronics: 'Semiconductors and electronics', volatile: 'Volatiles and gases'
  };
  const CAT_ORDER = ['metal', 'volatile', 'propellant', 'ceramic', 'semiconductor_electronics', 'carbon_materials', 'polymer', 'nuclear', 'food', 'fertiliser', 'bio_life_support', 'computation', 'exotic'];
  const KIND_NAMES = { extraction: 'Extraction', processing: 'Processing', power: 'Power', electronics: 'Electronics', habitat: 'Habitat and food', infrastructure: 'Infrastructure', nuclear: 'Nuclear', special: 'Special' };
  const BUILD_SLOTS = 3;

  const D = {};
  async function load() {
    const [mats, recs, blds, comps, miles, earth, mock] = await Promise.all([
      Promise.all(MAT_FILES.map(f => J('materials/' + f + '.json'))), Promise.all(REC_FILES.map(f => J('recipes/' + f + '.json'))),
      Promise.all(BLD_FILES.map(f => J('buildings/' + f + '.json'))), J('components.json'), J('milestones.json'), J('earth.json'), J('mock.json')
    ]);
    D.mats = [...mats.flat(), ...mock.materials]; D.recipes = [...recs.flat(), ...mock.recipes]; D.blds = [...blds.flat(), ...mock.buildings]; D.comps = comps; D.miles = miles; D.earth = earth;
    D.mat = {}; D.mats.forEach(m => D.mat[m.id] = m);
    D.rec = {}; D.recipes.forEach(r => D.rec[r.id] = r);
    D.bld = {}; D.blds.forEach(b => D.bld[b.id] = b);
    D.comp = {}; D.comps.forEach(c => D.comp[c.id] = c);
    D.cats = CAT_ORDER.filter(c => D.mats.some(m => m.category === c));
    S4.buildMats(D.mats);
    initSim();
  }

  const human = s => { const t = s.replace(/_/g, ' '); return t[0].toUpperCase() + t.slice(1); };
  const short = id => (D.mat[id] ? D.mat[id].name.split(' (')[0] : human(id));

  const KCAL = { wheat: 3330, potato: 770, soybean: 4460, leafy_greens: 230, single_cell_protein: 3500, food_ration: 4200, meat: 2500 };
  const KCAL_PERSON = 2800;
  const PER = { year: { hours: 8760, unit: 'yr', word: 'a year', name: 'year' }, day: { hours: 24, unit: 'd', word: 'a day', name: 'day' } };
  const per = { key: 'day' };
  const perOf = () => PER[per.key];

  const fmt = {
    group: n => Math.round(n).toLocaleString('en-US'),
    num(v) {
      const a = Math.abs(v);
      if (a < 0.0005) return '0';
      const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 2 : 3;
      return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
    },
    people: n => fmt.group(n / 1e6) + ' M',
    count: n => fmt.group(n),
    mass: kg => `${fmt.num(kg / 1000)} t`,
    tcal: kcal => `${fmt.num(kcal / 1e12)} Tcal`,
    amount(id, a) {
      const u = D.mat[id] && D.mat[id].unit;
      if (u === 'cu') return fmt.group(a) + ' cu';
      if (u === 'model') return fmt.num(a);
      if (KCAL[id]) return fmt.tcal(a * KCAL[id]);
      return fmt.mass(a);
    },
    cargo(id, a) { return KCAL[id] ? fmt.mass(a) : fmt.amount(id, a); },
    power: kw => `${fmt.num(kw / 1000)} MW`,
    pct: f => Math.round(f * 100) + '%',
    days(d) { return !isFinite(d) ? 'never' : d >= 3652.5 ? Math.round(d / 365.25) + ' y' : d >= 365.25 ? (d / 365.25).toFixed(1) + ' y' : Math.max(1, Math.ceil(d)) + ' d'; },
    signed(id, a) { const t = fmt.amount(id, Math.abs(a)); return t.startsWith('0 ') || t === '0' ? '0' : (a < 0 ? '-' : '+') + t; },
    rate(id, perHour, signed = false) {
      const v = perHour * perOf().hours, t = signed ? fmt.signed(id, v) : fmt.amount(id, v);
      return t === '0' ? '0' : `${t}/${perOf().unit}`;
    }
  };

  const POWER = '@power';
  const E = { groups: [], stock: {}, queue: [], programmes: [], done: [1, 2], uid: 1, tick: 0 };

  function processOf(pid) {
    if (!pid) return null;
    if (pid.startsWith('extract:')) {
      const m = pid.slice(8);
      return { id: pid, name: 'Extract ' + short(m).toLowerCase(), inputs: {}, outputs: { [m]: 1000 }, power: 400, extract: m };
    }
    const r = D.rec[pid];
    const out = {}, inp = {};
    for (const [m, v] of Object.entries(r.outputs)) out[m] = v / r.hours;
    for (const [m, v] of Object.entries(r.inputs)) inp[m] = v / r.hours;
    return { id: pid, name: human(pid), inputs: inp, outputs: out, power: r.power, generates: r.generates, recipe: r };
  }

  function choicesFor(building) {
    const out = [];
    for (const r of D.recipes) if (r.building === building && r.milestone <= 3) out.push(processOf(r.id));
    for (const m of D.mats) if ((m.sources || []).some(s => s.body === 'earth' && s.building === building)) out.push(processOf('extract:' + m.id));
    return out;
  }

  const LIMITS = {
    'extract:sulfur': { share: .55, kind: 'input', text: 'Short of workers' },
    steam_methane_reforming: { share: .82, kind: 'power', text: 'Short of power' },
    pan_polymerisation: { share: .46, kind: 'input', text: 'Short of ethylene' },
    farm_leafy_greens: { share: .92, kind: 'workers', text: 'Short of workers' },
    'extract:ethylene': { share: .6, kind: 'workers', text: 'Short of workers' },
    carbon_fibre_carbonisation: { share: .74, kind: 'input', text: 'Short of polyacrylonitrile' },
    urea_synthesis: { share: .9, kind: 'power', text: 'Short of power' }
  };

  const RANCH_TONNES_A_YEAR = 360e6;

  function initSim() {
    const e = D.earth;
    E.pop = e.population; E.workShare = e.workforceShare; E.growth = e.growthPerYear;
    E.groups = e.groups.map((g, i) => ({ id: i + 1, building: g.building, process: g.process, count: g.count, on: true }));
    const rp = processOf('ranch_meat');
    const ranches = Math.round(RANCH_TONNES_A_YEAR * 1000 / 8760 / rp.outputs.meat);
    E.groups.push({ id: E.groups.length + 1, building: 'ranch', process: 'ranch_meat', count: ranches, on: true });
    for (const [m, farm] of [['wheat', 'farm_wheat'], ['soybean', 'farm_soybean'], ['water', 'extract:water']]) {
      const g = E.groups.find(x => x.process === farm), per1 = processOf(farm).outputs[m];
      g.count += Math.ceil(ranches * rp.inputs[m] * 1.05 / per1);
    }
    E.uid = E.groups.length + 1;
    const full = {};
    for (const g of E.groups) {
      const p = processOf(g.process); if (!p) continue;
      for (const [m, v] of Object.entries(p.outputs)) full[m] = (full[m] || 0) + v * g.count;
    }
    for (const m of Object.keys(full)) E.stock[m] = full[m] * 24 * e.stockDays;
    E.stock.copper = (E.stock.copper || 0);
    E.stock.stainless_steel *= .6;
    E.stock.nickel_superalloy = (E.stock.nickel_superalloy || 0) * 3;
    for (const m of ['titanium', 'chromium', 'aluminium', 'nickel', 'copper', 'cfrp', 'al_li_alloy', 'ti_6al_4v']) E.stock[m] = (E.stock[m] || 0) + 4e6;
    E.stock.platinum = 3e3;
    E.queue = [
      { id: 1, building: 'sabatier_plant', process: null, done: .41, paused: false },
      { id: 2, building: 'electrolysis_plant', process: null, done: .12, paused: false },
      { id: 3, building: 'orbital_shipyard', process: null, done: 0, paused: false },
      { id: 4, building: 'propellant_depot', process: null, done: 0, paused: true }
    ];
    E.qid = 5;
    E.programmes = [{ number: 3, progress: .38 }];
    E.food = ['wheat', 'potato', 'soybean', 'leafy_greens', 'food_ration', 'single_cell_protein', 'meat'];
  }

  function stands(building) { return E.groups.some(g => g.building === building) || (D.bld[building] && D.bld[building].start); }
  const standing = b => E.groups.filter(g => g.building === b).reduce((a, g) => a + g.count, 0);

  function flows() {
    const out = {}, use = {}, actors = [];
    let pwr = 0, gen = 0, workers = 0, cuMade = 0, cuWant = 0;
    for (const g of E.groups) {
      const b = D.bld[g.building], p = processOf(g.process);
      const lim = g.process && LIMITS[g.process];
      const a = { g, b, p, share: !p ? 0 : !g.on ? 0 : lim ? lim.share : 1, limit: !p ? { kind: 'idle', text: 'No recipe set' } : !g.on ? { kind: 'off', text: 'Switched off' } : lim ? { kind: lim.kind, text: lim.text } : null };
      actors.push(a);
      if (!p) continue;
      a.out = {}; a.inp = {};
      for (const [m, v] of Object.entries(p.outputs)) { a.out[m] = v * g.count * a.share; out[m] = (out[m] || 0) + a.out[m]; }
      for (const [m, v] of Object.entries(p.inputs)) { a.inp[m] = v * g.count * a.share; use[m] = (use[m] || 0) + a.inp[m]; }
      a.power = p.power * g.count * a.share;
      if (p.generates) gen += p.generates * g.count * a.share; else pwr += a.power;
      workers += g.on ? b.workers * g.count : 0;
    }
    const avail = {};
    for (const m of E.food) avail[m] = Math.max(0, (out[m] || 0) - (use[m] || 0));
    const foodMade = E.food.reduce((t, m) => t + avail[m] * KCAL[m], 0);
    const foodNeed = E.pop * KCAL_PERSON / 24;
    const eat = {}, eaten = Math.min(1, foodNeed / Math.max(1e-9, foodMade));
    for (const m of E.food) if (avail[m]) { eat[m] = avail[m] * eaten; use[m] = (use[m] || 0) + eat[m]; }
    const grid = pwr * 1.15, workAvail = E.pop * E.workShare;
    return { out, use, eat, actors, power: { supply: grid + gen, demand: pwr, grid, gen }, workers: { avail: workAvail, need: workers, share: Math.min(1, workAvail / Math.max(1, workers)) }, food: { made: foodMade, need: foodNeed, cover: Math.min(1, foodMade / foodNeed) }, compute: { made: cuMade, want: cuWant } };
  }

  function cover(m, f) {
    const net = (f.out[m] || 0) - (f.use[m] || 0);
    const stock = E.stock[m] || 0;
    if (net >= -1e-9) return Infinity;
    return stock / -net / 24;
  }

  function buildHours(id) { const b = D.bld[id]; const kg = Object.values(b.cost).reduce((a, v) => a + v, 0); return 240 + 48 * kg / 1000; }

  function milestoneState(n) {
    if (E.done.includes(n)) return 'done';
    if (E.programmes.some(p => p.number === n)) return 'running';
    const m = D.miles[n - 1];
    return m.requires.every(r => E.done.includes(r)) ? 'available' : 'locked';
  }
  function bill(n) {
    const m = D.miles[n - 1], mats = {};
    for (const id of m.needs.materials) mats[id] = 50000 * n;
    return { mats, buildings: m.needs.buildings, comps: m.needs.components };
  }
  const programmeDays = n => 60 + 30 * n;
  const unlocked = b => D.miles.every(x => x.number >= b.milestone || x.optional || E.done.includes(x.number));

  const MS_SHORT = { 1: 'Orbital launch', 2: 'Propellant transfer', 3: 'LEO station', 4: 'Space solar power', 5: 'Data centres', 6: 'Lunar outpost', 7: 'Fission power', 8: 'Lunar ice', 9: 'Regolith oxygen', 10: 'Regolith building', 11: 'Moon base', 12: 'Cislunar fuel', 13: 'Electric drive', 14: 'Nuclear thermal', 15: 'Asteroid survey', 16: 'Volatile mining', 17: 'Metal mining', 18: 'Orbital shipyard', 19: 'Space chips', 20: 'Power stations', 21: 'Mars ISRU', 22: 'D-T fusion', 23: 'Helium-3', 24: 'Fusion drive', 25: 'Gas giant mining', 26: 'Megastructures', 27: 'Superconductors', 28: 'Exotic matter', 29: 'Jump point' };
  const KIND_DESC = { extraction: 'Takes material out of the ground.', processing: 'Turns raw materials into industrial ones.', power: 'Makes electricity.', electronics: 'Builds chips, cells and electronics.', habitat: 'Feeds and houses people.', infrastructure: 'Launch, yards and depots.', nuclear: 'Nuclear fuel and reactors.', special: 'Late-game exotic industry.' };
  const COMP_DESC = { structure: 'Hull frame and tanks.', propulsion: 'Moves the ship.', power: 'Makes the ship\'s electricity.', thermal: 'Gets rid of heat.', habitat: 'Keeps a crew alive.', protection: 'Shields against radiation and debris.', electronics: 'Computing and control.' };
  const uniq = a => [...new Set(a)];
  const desc = {
    mat: id => { const m = D.mat[id]; return (m.why || '') + (m.mock ? ' (Not in the game data yet.)' : ''); },
    bld(id) {
      const b = D.bld[id];
      let outs = uniq(D.recipes.filter(r => r.building === id).flatMap(r => Object.keys(r.outputs)));
      if (!outs.length) outs = D.mats.filter(m => (m.sources || []).some(x => x.building === id)).map(m => m.id);
      const list = outs.slice(0, 4).map(m => short(m).toLowerCase()).join(', ');
      return `${KIND_DESC[b.kind]}${list ? ' Makes ' + list + (outs.length > 4 ? ' and more' : '') + '.' : ''}${b.mock ? ' (Not in the game data yet.)' : ''}`;
    },
    comp(id) {
      const c = D.comp[id], p = c.performance;
      return COMP_DESC[c.kind] + (p && p.isp ? ` Isp ${p.isp} s, thrust ${fmt.num(p.thrust / 1000)} kN.` : '');
    },
    ms: n => D.miles[n - 1].unlocks
  };

  Object.assign(S4, { KIND_DESC, KCAL, KCAL_PERSON, PER, per, perOf, MS_SHORT, desc, D, load, E, fmt, human, short, flows, cover, processOf, choicesFor, standing, stands, buildHours, milestoneState, bill, programmeDays, unlocked, CAT_NAMES, KIND_NAMES, BUILD_SLOTS, POWER });
})();
