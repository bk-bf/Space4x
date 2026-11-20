'use strict';
(root => {
  const ROLES = {
    production: 'Production',
    processing: 'Processing',
    compute: 'Compute',
    research: 'Research',
    shipbuilding: 'Shipbuilding',
    infrastructure: 'Infrastructure'
  };

  const BUILDINGS = {
    silicon: { name: 'Semiconductor fab', kind: 'electronics', role: 'production', icon: 'semiconductor_fab', desc: 'Purifies metallurgical silicon to electronic grade.', make: { si: 2.5 }, power: 60, upkeep: 0.08, water: 500000, cost: { bp: 1, mach: 5, elec: 1 }, start: 1 },
    mshop: { name: 'Flight machine shop', kind: 'processing', role: 'processing', icon: 'machine_shop', desc: 'Space-grade motors, pumps, valves and turbopumps from nickel superalloy.', make: { mach: 3 }, power: 30, upkeep: 0.06, water: 1000, cost: { bp: 0.2, mach: 5, elec: 1 }, start: 2 },
    efab: { name: 'Semiconductor fab', kind: 'electronics', role: 'processing', icon: 'semiconductor_fab', desc: 'Radiation-hardened integrated circuits for flight computers and drives.', use: { si: 1.5 }, compute: 4, make: { elec: 1.2 }, power: 80, upkeep: 0.12, water: 1140000, cost: { bp: 2, mach: 6, elec: 2 }, start: 1 },
    dc: { name: 'Data centre', kind: 'electronics', role: 'compute', icon: 'data_centre', desc: 'Compute for research, for the electronics lines and for sale.', make: { cu: 10 }, power: 120, upkeep: 0.1, water: 157788, cost: { bp: 1.8, mach: 2, elec: 6 }, start: 2 },
    lab: { name: 'Research lab', kind: 'infrastructure', role: 'research', icon: 'lab', desc: 'One lab adds one point of research a month to the project it is assigned to, if it has its compute.', compute: 2, make: { rp: 1 }, power: 10, upkeep: 0.05, water: 500, cost: { bp: 0.1, mach: 1, elec: 1 }, start: 4 },
    yard: { name: 'Construction yard', kind: 'infrastructure', role: 'infrastructure', icon: 'yard', desc: 'A construction contractor working the queue.', make: { bp: 0.01 }, power: 0.1, upkeep: 0, water: 2000, cost: { bp: 0.12, mach: 4 }, start: 2000 },
    coal: { name: 'Coal power station', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Burns coal; dispatchable, the largest emitter.', gw: 1, cf: 0.55, co2: 0.95, firm: 0.9, power: 0, upkeep: 0, waterMwh: 2.6, cost: { bp: 2.0 }, start: 400 },
    gas: { name: 'Gas power station', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Burns natural gas; dispatchable, half the emissions of coal.', gw: 1, cf: 0.4, co2: 0.43, firm: 0.9, power: 0, upkeep: 0, waterMwh: 0.75, cost: { bp: 1.0 }, start: 352 },
    oil: { name: 'Oil power station', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Burns oil products; peaking and island grids.', gw: 1, cf: 0.2, co2: 0.75, firm: 0.9, power: 0, upkeep: 0, waterMwh: 2.6, cost: { bp: 1.2 }, start: 89 },
    nuclear: { name: 'Nuclear power station', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Fission; steady output without emissions.', gw: 1, cf: 0.82, co2: 0, firm: 0.9, power: 0, upkeep: 0, waterMwh: 2.5, cost: { bp: 8.0 }, start: 70 },
    hydro: { name: 'Hydroelectric dam', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Dispatchable within the water it holds.', gw: 1, cf: 0.37, co2: 0, firm: 0.9, power: 0, upkeep: 0, waterMwh: 0, cost: { bp: 3.0 }, start: 247 },
    bio: { name: 'Bioenergy plant', kind: 'power', role: 'power', icon: 'fission_reactor', desc: 'Burns biomass and waste; counted as carbon neutral.', gw: 1, cf: 0.55, co2: 0, firm: 0.9, power: 0, upkeep: 0, waterMwh: 2.0, cost: { bp: 3.0 }, start: 29 },
    wind: { name: 'Wind farm', kind: 'power', role: 'power', icon: 'solar_power_station', desc: 'Output follows the wind.', gw: 1, cf: 0.25, co2: 0, firm: 0.1, power: 0, upkeep: 0, waterMwh: 0, cost: { bp: 1.4 }, start: 207 },
    solar: { name: 'Solar farm', kind: 'power', role: 'power', icon: 'solar_power_station', desc: 'Output follows the sun; nothing at night.', gw: 1, cf: 0.13, co2: 0, firm: 0.05, power: 0, upkeep: 0, waterMwh: 0.1, cost: { bp: 0.8 }, start: 339 },
    battery: { name: 'Battery storage', kind: 'power', role: 'power', icon: 'solar_power_station', desc: 'Shifts power by hours.', gw: 1, cf: 0, co2: 0, firm: 0.6, gwh: 2.5, power: 0, upkeep: 0, waterMwh: 0, cost: { bp: 0.6 }, start: 29 },
    pumped: { name: 'Pumped hydro storage', kind: 'power', role: 'power', icon: 'solar_power_station', desc: 'Shifts power by days.', gw: 1, cf: 0, co2: 0, firm: 1.0, gwh: 48, power: 0, upkeep: 0, waterMwh: 0, cost: { bp: 2.5 }, start: 34 }
  };

  const SUBJECTS = { launch: 'Launch', habitats: 'Habitats', power: 'Power', computing: 'Computing' };

  const PROGRAMMES = [
    { n: 1, name: 'Reusable orbital launch', subject: 'launch', rp: 60, needs: [] },
    { n: 2, name: 'Orbital propellant transfer', subject: 'launch', rp: 100, needs: [1] },
    { n: 3, name: 'Long-duration station', subject: 'habitats', rp: 160, needs: [1, 2] },
    { n: 4, name: 'Space solar at scale', subject: 'power', rp: 140, needs: [1, 3], effect: 'Power plants give half as much again.' },
    { n: 5, name: 'Data centres and autonomy', subject: 'computing', rp: 160, needs: [4], effect: 'Data centres make twice the compute; the electronics lines need half.' },
    { n: 6, name: 'Crewed lunar outpost', subject: 'habitats', rp: 260, needs: [3] }
  ];

  const GOODS = {
    si: { name: 'Electronic-grade silicon', sell: 0.03, q: 20, buy: 0.12, avail: 3 },
    mach: { name: 'Machinery', sell: 0.03, q: 30, buy: 0.1, avail: 8 },
    elec: { name: 'Control electronics', sell: 0.5, q: 4, buy: 1.6, avail: 1 },
    cu: { name: 'Compute', sell: 0.06, q: 20 },
    launch: { name: 'Commercial launches', sell: 0.35, q: 2 }
  };

  const SCIENTISTS = [
    ['Aiko Tanaka', 'f', 'launch', 7, 3, 11],
    ['Marcus Bell', 'm', 'habitats', 5, 4, 23],
    ['Leila Haddad', 'f', 'computing', 8, 2, 4],
    ['Viktor Sokolov', 'm', 'power', 6, 3, 17],
    ['Nadia Petrova', 'f', 'launch', 4, 5, 29],
    ['Samuel Osei', 'm', 'habitats', 6, 2, 8]
  ];
  const RECRUITS = [
    ['Chen Wei', 'm', 'computing', 5, 4, 33],
    ['Ines Moreau', 'f', 'habitats', 8, 3, 41],
    ['Tariq Rahman', 'm', 'launch', 6, 4, 52],
    ['Sofia Lindgren', 'f', 'power', 7, 3, 47],
    ['Diego Alvarez', 'm', 'launch', 9, 2, 60],
    ['Mei Nakamura', 'f', 'computing', 7, 4, 66]
  ];

  const BASE_GRID = 1e9;
  const BASE_INCOME = 2;
  const STAGE = { mach: 12, elec: 3, usd: 0.4 };
  const CARGO = { mach: 0.6, elec: 0.15 };
  const LAUNCH_OPS = 0.08;
  const PAYLOAD = 20;
  const RECRUIT_COST = 1;
  const RECRUIT_MONTHS = 12;
  const START = 2026 * 12 + 10;

  const scientist = (s, id) => ({ id, name: s[0], gender: s[1], subject: s[2], skill: s[3], admin: s[4], seed: s[5], born: 1970 + (s[5] % 25), on: null });

  function newGame() {
    const g = {
      month: START,
      usd: 15,
      stock: { si: 6, mach: 30, elec: 8 },
      count: {}, active: {},
      queue: [],
      stages: 1, stageTarget: 2,
      sell: { mach: 0, elec: 0, cu: 0 },
      buy: { si: 0, mach: 0, elec: 0 },
      commercial: 0,
      moonCargo: true,
      programmes: PROGRAMMES.map(p => ({ n: p.n, started: false, queued: false, rp: 0, tests: 0, cargo: 0, done: null, labs: 0, lead: null })),
      scientists: SCIENTISTS.map(scientist),
      recruiting: [], recruitsUsed: 0,
      leases: [], offers: [], log: [], last: null, flows: null, climate: { ppm: 429, temp: START_TEMP, sea: 0, cumulative: 0, lastGt: 0 }
    };
    for (const [id, b] of Object.entries(BUILDINGS)) { g.count[id] = b.start; g.active[id] = b.start; }
    g.flows = simulate(g, true);
    g.offers = makeOffers(g);
    return g;
  }

  const prog = (g, n) => g.programmes.find(p => p.n === n);
  const def = n => PROGRAMMES.find(p => p.n === n);
  const done = (g, n) => prog(g, n).done !== null;
  const available = (g, n) => !done(g, n) && def(n).needs.every(m => done(g, m));
  const monthName = m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m % 12] + ' ' + Math.floor(m / 12);
  const priceFor = (id, q) => GOODS[id].sell / (1 + q / GOODS[id].q);
  const revenue = (id, q) => (q <= 0 ? 0 : (GOODS[id].sell * GOODS[id].q) * Math.log(1 + q / GOODS[id].q));
  const allocated = g => g.queue.reduce((a, q) => a + (q.pct || 0), 0);
  const labsInUse = g => g.programmes.reduce((a, p) => a + (p.started && !p.done ? p.labs : 0), 0);
  const leading = (g, sid) => g.programmes.find(p => p.lead === sid && p.started && p.done === null);
  const queueOf = (g, sid) => g.programmes.filter(p => p.lead === sid && p.queued);
  const bonusOf = (s, subject) => (s.subject === subject ? 0.08 * s.skill : 0.02 * s.skill);
  const income = g => BASE_INCOME * Math.pow(1.02, (g.month - START) / 12);
  const canPay = (g, cost) => Object.entries(cost).every(([k, v]) => k === 'bp' || (k === 'usd' ? g.usd >= v : (g.stock[k] || 0) >= v - 1e-9));
  const pay = (g, cost) => { for (const [k, v] of Object.entries(cost)) { if (k === 'bp') continue; if (k === 'usd') g.usd -= v; else g.stock[k] -= v; } };
  const log = (g, text, tone = '') => { g.log.unshift({ at: g.month, text, tone }); if (g.log.length > 60) g.log.pop(); };

  const CO2_T_PER_PERSON_YEAR = 4.26;
  const WAGE_PER_BP = 0.4;
  const PEAK_RATIO = 1.4;
  const GT_PER_PPM = 7.82;
  const AIRBORNE = 0.44;
  const TCRE = 0.45e-3;
  const SEA_MM_YEAR = 4.5;
  const START_TEMP = 1.4;
  function gridOf(g, sketchGw) {
    let avg = 0, firm = 0, capacity = 0, storage = 0, co2 = 0;
    const bySource = {};
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (b.kind !== 'power') continue;
      const n = g.active[id] || 0, gen = n * b.gw * b.cf;
      bySource[id] = gen;
      avg += gen; firm += n * b.gw * b.firm; capacity += n * b.gw;
      storage += n * (b.gwh || 0);
      co2 += gen * 730.5 * b.co2 * 1000 / 1e9;
    }
    const industry = (g.ext && g.ext.industryGw ? g.ext.industryGw() : 0) + sketchGw;
    const demand = industry, peak = PEAK_RATIO * demand;
    return { avg, firm, capacity, storage, co2, bySource, sketch: sketchGw, industry, demand, peak, effective: Math.min(avg, firm / PEAK_RATIO) };
  }
  const population = g => (g.ext && g.ext.population ? g.ext.population(g.month - START) : 8.2e9);
  const worldCo2 = g => CO2_T_PER_PERSON_YEAR * population(g) / 1e9;
  function warm(g, grid) {
    const c = g.climate, gt = grid.co2 + worldCo2(g) / 12 + (g.ext && g.ext.farmCo2 ? g.ext.farmCo2() : 0) / 12;
    c.cumulative += gt; c.lastGt = gt;
    c.ppm += gt * AIRBORNE / GT_PER_PPM;
    c.temp = START_TEMP + TCRE * c.cumulative;
    c.sea += SEA_MM_YEAR * (c.temp / START_TEMP) / 12;
  }
  const LEASE_YIELD = 0.015;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function leasedOf(g, kind, id) { return g.leases.filter(l => l.kind === kind && l.id === id).reduce((a, l) => a + l.count, 0); }
  function makeOffers(g) {
    const r = rng(g.month * 7919 + 13), out = [];
    const pick = a => a[Math.floor(r() * a.length)];
    const months = () => pick([3, 6, 6, 12, 12, 24]);
    const demand = () => 0.6 + r() * 1.0;
    const sketchIds = Object.keys(BUILDINGS).filter(id => !['lab', 'yard'].includes(id));
    for (let i = 0; i < 3; i++) {
      const id = pick(sketchIds), b = BUILDINGS[id], free = (g.active[id] || 0) - leasedOf(g, 'sketch', id);
      if (free < 1) continue;
      const count = Math.max(1, Math.round(free * (0.05 + r() * 0.15)));
      out.push({ kind: 'sketch', id, name: b.name, count, months: months(), usd: count * b.cost.bp * LEASE_YIELD * demand() });
    }
    const games = g.ext && g.ext.gameGroups ? g.ext.gameGroups() : [];
    for (let i = 0; i < 3 && games.length; i++) {
      const x = pick(games), count = Math.max(1, Math.round(x.count * (0.005 + r() * 0.02)));
      out.push({ kind: 'game', id: x.building, process: x.process, name: x.name, count, months: months(), usd: count * x.bp * LEASE_YIELD * demand() });
    }
    for (const k of ['mach', 'elec']) {
      if (r() < 0.4) continue;
      const amount = Math.round(((g.flows && g.flows.made[k]) || 1) * (0.1 + r() * 0.3) * 10) / 10;
      out.push({ kind: 'supply', id: k, name: GOODS[k].name, amount, months: months(), usd: amount * GOODS[k].sell * (0.8 + r() * 0.7) });
    }
    return out;
  }
  function emptyUse() { return { research: 0, processing: 0, production: 0, compute: 0, shipbuilding: 0, construction: 0, infrastructure: 0, programme: 0, sold: 0, upkeep: 0, idle: 0 }; }

  function simulate(g, dry) {
    const f = { power: emptyUse(), cu: emptyUse(), mach: emptyUse(), elec: emptyUse(), bp: emptyUse(), usd: emptyUse(), launch: emptyUse(), made: {}, supply: {}, notes: [], income: 0, sales: {}, launches: { test: 0, cargo: 0, commercial: 0 }, rp: {} };
    const A = { ...g.active };
    for (const l of g.leases) if (l.kind === 'sketch') A[l.id] = Math.max(0, (A[l.id] || 0) - l.count);
    const M5 = done(g, 5), M4 = done(g, 4), M1 = done(g, 1), M2 = done(g, 2), M3 = done(g, 3);
    const st = dry ? JSON.parse(JSON.stringify(g.stock)) : g.stock;

    let demand = 0;
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (b.kind === 'power') continue;
      const used = id === 'lab' ? Math.min(A.lab, labsInUse(g)) : A[id];
      const kw = used * b.power;
      demand += kw;
      f.power[b.role] += kw;
    }
    const grid = gridOf(g, demand / 1000);
    f.grid = grid;
    const supply = Math.max(0, grid.effective - grid.industry + demand / 1000) * 1000;
    const broke = g.usd < 0 ? 0.5 : 1;
    const ps = (demand > 0 ? Math.min(1, supply / demand) : 1) * broke;
    if (grid.firm < grid.peak) f.notes.push(['Firm capacity short of peak demand', 'hot']);
    for (const k of Object.keys(f.power)) f.power[k] *= ps;
    f.power.idle = Math.max(0, supply - demand);
    f.supply.power = supply;
    f.ps = ps;
    if (broke < 1) f.notes.push(['Treasury overdrawn: upkeep unpaid, everything runs at half rate', 'hot']);
    else if (ps < 1) f.notes.push(['Power short: every building runs at ' + Math.round(ps * 100) + '%', 'hot']);

    const bp = A.yard * BUILDINGS.yard.make.bp * ps;
    f.supply.bp = bp;

    const cuMade = A.dc * BUILDINGS.dc.make.cu * ps * (M5 ? 2 : 1);
    f.supply.cu = cuMade;
    const cuSold = cuMade * g.sell.cu;
    const efabNeed = A.efab * BUILDINGS.efab.compute * (M5 ? 0.5 : 1) * ps;
    const labsRunning = Math.min(A.lab, labsInUse(g));
    const labNeed = labsRunning * BUILDINGS.lab.compute * ps;
    const cuLeft = cuMade - cuSold;
    const cs = efabNeed + labNeed > 0 ? Math.min(1, cuLeft / (efabNeed + labNeed)) : 1;
    f.cu.sold = cuSold; f.cu.processing = efabNeed * cs; f.cu.research = labNeed * cs;
    f.cu.idle = Math.max(0, cuLeft - (efabNeed + labNeed) * cs);
    f.cs = cs;
    if (cs < 1) f.notes.push(['Compute short: labs and electronics lines run at ' + Math.round(cs * 100) + '%', 'hot']);

    const siMade = A.silicon * BUILDINGS.silicon.make.si * ps;
    st.si += siMade;
    f.made.si = siMade;

    const machWant = A.mshop * BUILDINGS.mshop.make.mach * ps;
    const machCan = machWant;
    const elecWant = A.efab * BUILDINGS.efab.make.elec * ps * cs;
    const elecCan = Math.min(elecWant, st.si / BUILDINGS.efab.use.si);
    if (elecCan < elecWant - 1e-6) f.notes.push(['Electronics plants short of silicon', 'hot']);
    st.si -= elecCan * BUILDINGS.efab.use.si;
    f.made.mach = machCan; f.made.elec = elecCan;
    f.supply.mach = machCan; f.supply.elec = elecCan;

    let usd = 0;
    const sales = {};
    for (const k of ['mach', 'elec']) {
      const q = f.made[k] * g.sell[k];
      sales[k] = revenue(k, q);
      f[k].sold = q;
      st[k] += f.made[k] - q;
    }
    sales.cu = revenue('cu', cuSold);
    f.sales = sales;
    usd += sales.mach + sales.elec + sales.cu;

    for (const k of Object.keys(g.buy)) {
      const q = Math.min(g.buy[k], GOODS[k].avail);
      if (q <= 0) continue;
      const c = q * GOODS[k].buy;
      usd -= c; f.usd.sold += 0; f.bought = (f.bought || 0) + c;
      st[k] += q;
    }

    let upkeep = 0;
    for (const [id, b] of Object.entries(BUILDINGS)) upkeep += A[id] * b.upkeep;
    upkeep += g.scientists.length * 0.02;
    f.upkeep = upkeep;
    f.income = income(g);
    f.leaseIncome = g.leases.filter(l => l.kind !== 'supply').reduce((a, l) => a + l.usd, 0);
    f.supplyIncome = 0;
    for (const l of g.leases) if (l.kind === 'supply') {
      const ok = st[l.id] >= l.amount - 1e-9;
      if (ok) { st[l.id] -= l.amount; f[l.id].sold = (f[l.id].sold || 0) + l.amount; f.supplyIncome += l.usd; }
      if (!dry) l.missed = !ok;
    }
    usd += f.income + f.leaseIncome + f.supplyIncome - upkeep;
    f.usd.upkeep = upkeep;

    const spend = (cat, cost) => {
      for (const [k, v] of Object.entries(cost)) {
        if (k === 'bp') continue;
        if (k === 'usd') { f.usd[cat] += v; usd -= v; continue; }
        f[k][cat] += v; st[k] -= v;
      }
    };
    const has = cost => Object.entries(cost).every(([k, v]) => k === 'bp' || (k === 'usd' ? g.usd + usd >= v : st[k] >= v - 1e-9));

    let bpLeft = bp;
    const queue = dry ? g.queue.map(q => ({ ...q })) : g.queue;
    f.bpTo = [];
    for (const q of queue) {
      const b = q.game ? { cost: { bp: q.bpCost }, role: 'construction' } : BUILDINGS[q.id];
      const share = bp * (q.pct || 0) / 100;
      f.bpTo.push(0);
      if (share <= 0) continue;
      if (!q.paid && q.game) {
        const short = g.ext ? g.ext.short(q) : ['materials'];
        if (short.length) { q.blocked = short; continue; }
        if (!dry) g.ext.pay(q);
        q.paid = true; q.blocked = null;
      }
      if (!q.paid) {
        const goods = { ...b.cost };
        if (!has(goods)) { q.blocked = Object.entries(goods).filter(([k, v]) => k !== 'bp' && (k === 'usd' ? g.usd + usd < v : st[k] < v)).map(([k]) => k); continue; }
        spend('construction', goods); q.paid = true; q.blocked = null;
      }
      const affordable = Math.max(0, (g.usd + usd) / WAGE_PER_BP);
      const put = Math.min(share, bpLeft, b.cost.bp - q.bp, affordable);
      if (put <= 0) { q.blocked = q.blocked || ['usd']; continue; }
      q.blocked = null;
      q.bp += put; bpLeft -= put;
      usd -= put * WAGE_PER_BP; f.usd.construction += put * WAGE_PER_BP;
      f.bpTo[f.bpTo.length - 1] = put;
    }
    f.bp.idle = bpLeft;

    let built = 0;
    const factories = (A.rocket || 0) * ps;
    let stages = g.stages;
    while (built < Math.floor(factories + 1e-9) && stages < g.stageTarget) {
      if (!has(STAGE)) { f.notes.push(['Stage factory waiting for machinery and electronics', 'hot']); break; }
      spend('shipbuilding', STAGE); built++; stages++;
    }

    const slots = Math.floor((A.pad || 0) * ps + 1e-9);
    f.supply.launch = slots;
    const flights = M1 ? 10 : 1;
    let wear = g.wear || 0;
    let launched = 0;
    const needTests = g.programmes.filter(p => p.started && !p.done && p.tests < def(p.n).tests);
    const cargoProg = prog(g, 6);
    const wants = [];
    for (let i = 0; i < Math.min(g.commercial, slots); i++) wants.push('commercial');
    for (const p of needTests) for (let i = p.tests; i < def(p.n).tests; i++) wants.push('test:' + p.n);
    if (M3 && g.moonCargo && cargoProg.cargo < def(6).cargo) for (let i = 0; i < slots; i++) wants.push('cargo');
    const ratio = M2 ? 3 : 4;
    for (const w of wants) {
      if (launched >= slots) break;
      if (stages <= 0) { f.notes.push(['No heavy-lift stage ready on the pad', 'hot']); break; }
      if (g.usd + usd < LAUNCH_OPS) break;
      usd -= LAUNCH_OPS; launched++;
      wear += 1 / flights;
      if (wear >= 1 - 1e-9) { stages--; wear -= 1; }
      if (w === 'commercial') { f.launch.sold++; f.launches.commercial++; }
      else if (w.startsWith('test')) { f.launch.research++; f.launches.test++; if (!dry) prog(g, +w.slice(5)).tests++; }
      else {
        const t = Math.min(PAYLOAD / ratio, def(6).cargo - cargoProg.cargo);
        const goods = { mach: CARGO.mach * t, elec: CARGO.elec * t };
        if (!has(goods)) { f.notes.push(['Moon cargo waiting for machinery and electronics', 'hot']); launched--; usd += LAUNCH_OPS; wear -= 1 / flights; if (wear < 0) { stages++; wear += 1; } continue; }
        spend('programme', goods);
        f.launch.programme++; f.launches.cargo++; if (!dry) cargoProg.cargo += t;
      }
    }
    f.launch.idle = slots - launched;
    sales.launch = revenue('launch', f.launches.commercial);
    usd += sales.launch;
    f.usd.shipbuilding += f.launches.cargo * LAUNCH_OPS + f.launches.test * LAUNCH_OPS;
    f.usd.sold = 0;

    const hs = 1;
    f.hs = hs;
    for (const p of g.programmes) {
      if (!p.started || p.done) continue;
      const d = def(p.n), lead = g.scientists.find(s => s.id === p.lead);
      if (!lead) { f.rp[p.n] = 0; continue; }
      const labs = p.labs;
      const bonus = 1 + bonusOf(lead, d.subject);
      f.rp[p.n] = labs * ps * cs * hs * bonus;
    }

    if (!dry) {
      g.stages = stages; g.wear = wear;
      g.usd += usd;
      for (const p of g.programmes) {
        if (!p.started || p.done) continue;
        p.rp = Math.min(def(p.n).rp, p.rp + (f.rp[p.n] || 0));
      }
      f.usdNet = usd;
    } else f.usdNet = usd;
    f.usd.idle = 0;
    return f;
  }

  function finish(g) {
    for (let i = g.queue.length - 1; i >= 0; i--) {
      const q = g.queue[i];
      if (q.game) {
        if (q.bp >= q.bpCost - 1e-9) { g.queue.splice(i, 1); if (g.ext) g.ext.built(q); log(g, q.name + ' finished', 'cool'); }
        continue;
      }
      const b = BUILDINGS[q.id];
      if (q.bp >= b.cost.bp - 1e-9) {
        g.queue.splice(i, 1); g.count[q.id]++; g.active[q.id]++;
        log(g, b.name + ' finished', 'cool');
      }
    }
    for (const p of g.programmes) {
      const d = def(p.n);
      if (!p.started || p.done) continue;
      const ok = p.rp >= d.rp - 1e-9 && p.tests >= d.tests && (!d.cargo || p.cargo >= d.cargo - 1e-9);
      if (ok) {
        const labs = p.labs, sid = p.lead;
        p.done = g.month; p.labs = 0; p.lead = null;
        log(g, 'Researched: ' + d.name, 'acc');
        const lead = g.scientists.find(s => s.id === sid);
        if (lead) lead.on = null;
        const next = lead && queueOf(g, sid).find(q => available(g, q.n));
        if (next) { next.queued = false; next.started = true; next.labs = labs; lead.on = next.n; log(g, lead.name + ' moves on to ' + def(next.n).name, 'cool'); }
      }
    }
    for (let i = g.recruiting.length - 1; i >= 0; i--) {
      const r = g.recruiting[i];
      if (g.month >= r.at) { g.recruiting.splice(i, 1); g.scientists.push(r.s); log(g, r.s.name + ' joins the programme (' + SUBJECTS[r.s.subject] + ')', 'cool'); }
    }
  }

  function step(g) {
    const f = simulate(g, false);
    g.last = f;
    warm(g, f.grid);
    g.month++;
    for (const l of g.leases) l.left--;
    for (const l of g.leases.filter(x => x.left <= 0)) { if (l.kind === 'game' && g.ext) g.ext.release(l); log(g, 'Contract ended: ' + l.name, 'cool'); }
    g.leases = g.leases.filter(x => x.left > 0);
    g.offers = makeOffers(g);
    finish(g);
    for (const [t, tone] of f.notes) if (!g.log.length || g.log[0].text !== t) log(g, t, tone);
    g.flows = simulate(g, true);
    return f;
  }

  const act = {
    buildGame(g, id, name, bpCost, process) { g.queue.push({ id, game: true, name, bpCost, process, bp: 0, paid: false, blocked: null, pct: Math.max(0, 100 - allocated(g)) }); g.flows = simulate(g, true); },
    setPct(g, i, v) {
      const q = g.queue[i];
      if (!q) return;
      q.pct = Math.max(0, Math.min(100 - allocated(g) + q.pct, Math.round(v)));
      g.flows = simulate(g, true);
    },
    build(g, id) { g.queue.push({ id, bp: 0, paid: false, blocked: null, pct: Math.max(0, 100 - allocated(g)) }); g.flows = simulate(g, true); },
    pct(g, i, d) {
      const q = g.queue[i];
      if (!q) return;
      q.pct = Math.max(0, Math.min(100 - allocated(g) + q.pct, q.pct + d));
      g.flows = simulate(g, true);
    },
    unqueue(g, i) { const q = g.queue[i]; if (q && !q.paid) g.queue.splice(i, 1); g.flows = simulate(g, true); },
    retool(g, from, to) {
      if (!g.count[from] || !BUILDINGS[to]) return;
      g.count[from]--; g.active[from] = Math.min(g.active[from], g.count[from]);
      g.count[to]++; g.active[to]++;
      g.flows = simulate(g, true);
    },
    setActive(g, id, n) { g.active[id] = Math.max(0, Math.min(g.count[id], n)); if (id === 'lab') trimLabs(g); g.flows = simulate(g, true); },
    create(g, n, sid, labs) {
      const p = prog(g, n), d = def(n), s = g.scientists.find(x => x.id === sid);
      if (!s || p.started || p.queued || p.done !== null || !available(g, n)) return false;
      p.lead = sid;
      if (leading(g, sid)) { p.queued = true; log(g, d.name + ' queued for ' + s.name); }
      else {
        p.started = true; s.on = n;
        p.labs = Math.max(0, Math.min(labs, s.admin, g.active.lab - labsInUse(g)));
        log(g, 'Project created: ' + d.name + ', led by ' + s.name + ' with ' + p.labs + (p.labs === 1 ? ' lab' : ' labs'));
      }
      g.flows = simulate(g, true); return true;
    },
    cancel(g, n) {
      const p = prog(g, n);
      if (!p.queued) return;
      p.queued = false; p.lead = null;
      g.flows = simulate(g, true);
    },
    labs(g, n, k) {
      const p = prog(g, n), s = g.scientists.find(x => x.id === p.lead);
      if (!p.started || p.done !== null || !s) return;
      const free = g.active.lab - labsInUse(g);
      p.labs = Math.max(0, Math.min(p.labs + Math.min(k, free), s.admin));
      g.flows = simulate(g, true);
    },
    accept(g, i) {
      const o = g.offers[i];
      if (!o) return;
      if (o.kind === 'sketch' && (g.active[o.id] || 0) - leasedOf(g, 'sketch', o.id) < o.count) return;
      if (o.kind === 'game' && !(g.ext && g.ext.take(o))) return;
      g.leases.push({ ...o, left: o.months });
      g.offers.splice(i, 1);
      log(g, 'Contract signed: ' + o.name, 'acc');
      g.flows = simulate(g, true);
    },
    recruit(g) {
      if (g.usd < RECRUIT_COST || g.recruitsUsed >= RECRUITS.length) return;
      g.usd -= RECRUIT_COST;
      const s = scientist(RECRUITS[g.recruitsUsed], 100 + g.recruitsUsed);
      g.recruitsUsed++;
      g.recruiting.push({ s, at: g.month + RECRUIT_MONTHS });
      log(g, 'Recruiting a ' + SUBJECTS[s.subject].toLowerCase() + ' scientist; arrives in a year');
    },
    sell(g, id, v) { g.sell[id] = Math.max(0, Math.min(1, v)); g.flows = simulate(g, true); },
    buy(g, id, v) { g.buy[id] = Math.max(0, Math.min(GOODS[id].avail, v)); g.flows = simulate(g, true); },
    commercial(g, v) { g.commercial = Math.max(0, Math.min(g.count.pad || 0, v)); g.flows = simulate(g, true); },
    stageTarget(g, v) { g.stageTarget = Math.max(0, Math.min(8, v)); g.flows = simulate(g, true); },
    moonCargo(g, v) { g.moonCargo = v; g.flows = simulate(g, true); }
  };

  function trimLabs(g) {
    let over = labsInUse(g) - g.active.lab;
    for (const p of [...g.programmes].reverse()) {
      if (over <= 0) break;
      const cut = Math.min(p.labs, over); p.labs -= cut; over -= cut;
    }
  }

  const api = { BASE_GRID_SHOWN: false, ROLES, BUILDINGS, PROGRAMMES, GOODS, SUBJECTS, STAGE, CARGO, PAYLOAD, LAUNCH_OPS, RECRUIT_COST, RECRUIT_MONTHS, BASE_GRID, START, newGame, step, act, simulate, prog, def, done, available, monthName, priceFor, labsInUse, allocated, leasedOf, makeOffers, gridOf, START_TEMP, worldCo2, population, WAGE_PER_BP, leading, queueOf, bonusOf, income, canPay };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BAL = api;
})(typeof window !== 'undefined' ? window : globalThis);
