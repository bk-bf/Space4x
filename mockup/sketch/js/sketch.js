'use strict';
(() => {
  if (!new URLSearchParams(location.search).has('sketch')) return;
  const M = window.BAL;
  const { BUILDINGS, GOODS, ROLES, SUBJECTS, act } = M;
  const { esc, gl, sprite, ramp, T, meter } = S4;
  const { nm2 } = S4.kit;
  const IDS = Object.keys(BUILDINGS).filter(id => id !== 'power');
  const MONTH = 30 * 86400;
  let g = M.newGame();
  g.ext = {
    gameGroups: () => S4.E.groups.filter(x => x.process && x.count >= 20 && S4.D.bld[x.building]).sort((a, b) => b.count - a.count).slice(0, 14).map(x => ({ building: x.building, process: x.process, count: x.count, name: S4.D.bld[x.building].name, bp: gameBp(x.building) })),
    take: o => { const x = S4.E.groups.find(y => y.building === o.id && y.process === o.process); if (!x || x.count < o.count) return false; x.count -= o.count; return true; },
    release: l => { const x = S4.E.groups.find(y => y.building === l.id && y.process === l.process); if (x) x.count += l.count; else S4.E.groups.push({ id: S4.E.uid++, building: l.id, process: l.process, count: l.count, on: true }); },
    farmCo2: () => { const f = flows0(S4.E); return Object.entries(FARM_CO2E).reduce((a, [id, k]) => a + (f.out[id] || 0) * 8766 * k / 1e12, 0); },
    processingWorkers: () => S4.E.groups.length ? flows0(S4.E).actors.filter(a => a.b && a.b.kind === 'processing' && a.g.on !== false).reduce((s2, a) => s2 + a.b.workers * a.g.count, 0) : 0,
    population: months => S4.E.pop * Math.pow(1 + (S4.E.growth || 0), months / 12),
    industryGw: () => (S4.E.groups.length ? flows0(S4.E).power.demand / 1e6 : 0),
    short: q => Object.entries(S4.D.bld[q.id].cost).filter(([m, v]) => (S4.E.stock[m] || 0) < v).map(([m]) => m),
    pay: q => { for (const [m, v] of Object.entries(S4.D.bld[q.id].cost)) S4.E.stock[m] = (S4.E.stock[m] || 0) - v; },
    built: q => {
      const grp = S4.E.groups.find(x => x.building === q.id && x.process === q.process);
      if (grp) grp.count++; else S4.E.groups.push({ id: S4.E.uid++, building: q.id, process: q.process, count: 1, on: true });
    }
  };
  let acc = 0;
  const SK = { bsel: 'efab', ssel: null, csel: 'lab', plan: {} };

  const STEEL = ramp([132, 146, 184]), BRASS = ramp([226, 170, 76]), PCB = ramp([70, 160, 98]), INK = [28, 22, 50];
  const R = S4.R;
  const GOOD_ICON = {
    mach: im => {
      for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; im.disc(8 + Math.cos(t) * 6, 8 + Math.sin(t) * 6, 1.6, STEEL.d); }
      im.sphere(8, 8, 5.6, STEEL); im.disc(8, 8, 2, INK); im.disc(8, 8, 1, STEEL.d);
    }
  };
  const BLD_EXTRA = {
    machine_shop: im => {
      im.box(2, 8, 20, 11, R.steel); im.poly([[2, 8], [7, 4], [12, 8]], R.steel.l); im.poly([[12, 8], [17, 4], [22, 8]], R.steel.l);
      im.rect(5, 12, 6, 7, R.dark.d); im.box(14, 11, 6, 4, R.glass);
      im.disc(17, 3, 2.5, R.amber.m); im.disc(17, 3, 1, R.dark.d);
    },
    lab: im => {
      im.box(3, 9, 18, 10, R.white); im.rect(3, 9, 18, 2, R.teal.m);
      im.disc(12, 7, 5, R.white.l); im.disc(12, 7, 3, R.glass.m); im.rect(7, 13, 3, 3, R.glass.l); im.rect(14, 13, 3, 3, R.glass.l);
    },
    yard: im => {
      im.rect(5, 2, 2, 17, R.amber.m); im.rect(5, 2, 15, 2, R.amber.m); im.rect(18, 4, 1, 7, R.steel.l); im.box(16, 11, 5, 3, R.steel);
      im.box(9, 13, 8, 6, R.steel); im.rect(3, 17, 6, 2, R.dark.m);
    }
  };
  const KIND_OF = { production: 'processing', processing: 'processing', compute: 'electronics', research: 'special', shipbuilding: 'infrastructure', infrastructure: 'infrastructure' };
  const kc = role => { const c = S4.KIND[KIND_OF[role]] || [150, 150, 180]; return `rgb(${c.join(',')})`; };
  const MAT_ID = { si: 'electronic_silicon', elec: 'rad_hard_ic' };
  const RES = {
    mach: { name: 'Machinery', unit: 't' }, elec: { name: 'Radiation-hardened integrated circuits', unit: 't' },
    si: { name: 'Electronic-grade polysilicon', unit: 't' },
    cu: { name: 'Compute', unit: 'EFLOP/s', glyph: 'chip' }, usd: { name: 'Treasury', unit: '$B', glyph: 'coin' },
    bp: { name: 'Build points', unit: 'BP', glyph: 'hammer' }, power: { name: 'Power', unit: 'MW', glyph: 'bolt' },
    launch: { name: 'Heavy-lift launches', unit: '', glyph: 'rocket' }, rp: { name: 'Research points', unit: 'RP', glyph: 'flask' }
  };
  const n1 = v => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en') : Math.abs(v) >= 10 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, ''));
  const EFLOPS_PER_CU = 9;
  const eflops = cu => n1(cu * EFLOPS_PER_CU) + ' EFLOP/s';
  const amt = (id, v) => id === 'cu' ? eflops(v) : id === 'usd' ? '$' + n1(v) + 'B' : n1(v) + (RES[id].unit ? ' ' + RES[id].unit : '');
  const ricon = (id, s = 2, tip) => {
    const t = esc(tip || RES[id].name);
    if (GOOD_ICON[id]) return `<img class="px" src="${sprite('sk:' + id, 16, 16, GOOD_ICON[id])}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${t}">`;
    if (MAT_ID[id]) return `<img class="px" src="${S4.matIcon(MAT_ID[id])}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${t}">`;
    return `<span data-tip="${t}" style="display:inline-flex">${gl(RES[id].glyph, s >= 2 ? '' : 'sm')}</span>`;
  };
  const bicon = (id, s = 2) => { const ic = BUILDINGS[id].icon; return `<img class="px" src="${BLD_EXTRA[ic] ? sprite('skb:' + ic, 24, 20, BLD_EXTRA[ic]) : S4.bldIcon(ic)}" width="${24 * s}" height="${20 * s}" alt="">`; };
  const have = (id, h, n) => `<span class="have ${h + 1e-9 >= n ? 'ok' : 'short'}" data-tip="${esc(T(RES[id].name, 'Need ' + amt(id, n) + ', have ' + amt(id, h)))}">${ricon(id, 2)}<span>${n1(h)}</span><span class="need">/ ${n1(n)}</span></span>`;
  const costList = cost => `<div class="eq">${Object.entries(cost).filter(([k]) => k !== 'bp').map(([k, v]) => have(k, k === 'usd' ? g.usd : g.stock[k], v)).join('')}${cost.bp ? `<span class="have" data-tip="Build points">${ricon('bp', 2)}<span>${cost.bp}</span><span class="need">BP</span></span>` : ''}</div>`;
  const ctl = (a, id, val, tip) => `<span class="ctl" data-tip="${esc(tip || '')}"><button data-act="${a}" data-id="${id}" data-d="-1">${gl('minus', 'xs')}</button><span class="val">${esc(val)}</span><button data-act="${a}" data-id="${id}" data-d="1">${gl('plus', 'xs')}</button></span>`;
  const CAT = {
    research: 'Research', processing: 'Processing', production: 'Production', compute: 'Compute', shipbuilding: 'Shipbuilding',
    programme: 'Moon cargo', construction: 'Construction', infrastructure: 'Infrastructure', sold: 'Sold', upkeep: 'Upkeep', idle: 'Spare'
  };

  const GOOD_MAT = { mach: 'machinery', elec: 'rad_hard_ic', si: 'electronic_silicon' };
  const HOURS_MONTH = 730.5;
  function goodsUse(f, k) {
    if (k === 'si') return f.made.elec * BUILDINGS.efab.use.si;
    return Object.entries(f[k] || {}).reduce((a, [c, v]) => a + (c === 'idle' ? 0 : v), 0);
  }
  function waterKgPerHour() {
    let kg = 0;
    for (const [id, b] of Object.entries(BUILDINGS)) {
      const n = g.active[id] || 0;
      if (b.kind === 'power') kg += n * b.gw * b.cf * 1000 * (b.waterMwh || 0) * 1000;
      else kg += n * (b.water || 0) * 1000 / HOURS_MONTH;
    }
    return kg;
  }
  const FARM_CO2E = { wheat: 1.4, potato: 0.46, soybean: 1.0, leafy_greens: 0.53, meat: 31 };
  const YIELD_PER_DEGREE = { wheat: 0.06, soybean: 0.031, potato: 0.05, leafy_greens: 0.05 };
  function sync() {
    const gr = g.flows && g.flows.grid;
    if (gr) S4.E.gridKw = Math.max(0, gr.effective - gr.sketch) * 1e6;
    for (const [k, id] of Object.entries(GOOD_MAT)) S4.E.stock[id] = (g.stock[k] || 0) * 1000;
    S4.E.done.length = 0;
    for (const p of g.programmes) if (p.done !== null) S4.E.done.push(p.n);
    S4.E.doneTags = M.PROGRAMMES.filter(p => p.grant && M.prog(g, p.n).done !== null).map(p => p.grant);
    S4.E.programmes.length = 0;
    for (const p of g.programmes) if (p.started && p.done === null) S4.E.programmes.push({ number: p.n, progress: p.rp / M.def(p.n).rp });
  }

  const load0 = S4.load;
  S4.load = () => load0().then(() => {
    S4.sites.splice(1);
    S4.E.queue = [];
    S4.F.vessels.length = 0; S4.F.launches.length = 0;
    for (const k of Object.keys(S4.F.yard)) if (Array.isArray(S4.F.yard[k])) S4.F.yard[k] = [];
    S4.clock.t = Date.UTC(2026, 10, 1, 0, 0); S4.clock.step = 2592000;
    if (!S4.D.mat.machinery) {
      const m = { id: 'machinery', name: 'Machinery', category: 'machinery', description: 'Motors, pumps, valves and turbopumps machined from nickel superalloy.' };
      S4.D.mat.machinery = m; S4.D.mats.push(m); S4.D.cats.push('machinery');
      S4.CAT_NAMES.machinery = 'Machinery'; S4.CAT_REP.machinery = 'machinery';
    }
    if (!S4.D.tagMiles) {
      const old = S4.D.miles, by = n => M.PROGRAMMES.find(p => p.grant === n);
      S4.D.tagMiles = old.map(m => ({ ...m, name: by(m.number) ? by(m.number).name : m.name }));
      S4.D.miles = M.PROGRAMMES.map(p => {
        const o = p.grant ? old.find(m => m.number === p.grant) : null;
        S4.MS_SHORT[p.n] = p.name;
        return { number: p.n, name: p.name, subject: p.subject, requires: p.needs, grant: p.grant, tier: 'P', unlocks: o ? o.unlocks.replace(/milestones?/gi, 'project') : '', needs: o ? o.needs : { buildings: [], components: [], materials: [], sites: [] } };
      });
      S4.research.RS.sel = M.PROGRAMMES[0].n;
    }
    g.offers = M.makeOffers(g);
    sync();
  });
  const mat0 = S4.matIcon;
  S4.matIcon = id => (id === 'machinery' ? sprite('sk:mach', 16, 16, GOOD_ICON.mach) : mat0(id));
  const flows0 = S4.flows;
  S4.flows = s => {
    const f = flows0(s);
    if (s !== S4.E || !g.flows) return f;
    f.use.water = (f.use.water || 0) + waterKgPerHour();
    for (const [id, b] of Object.entries(BUILDINGS)) for (const [m, v] of Object.entries(b.useGame || {})) f.use[m] = (f.use[m] || 0) + (g.active[id] || 0) * v * 1000 / HOURS_MONTH;
    const paid = g.flows.paid ?? 1;
    if (paid < 1) for (const a of f.actors) if (a.b && a.b.kind === 'processing') {
      for (const [m, v] of Object.entries(a.out || {})) f.out[m] -= v * (1 - paid);
      for (const [m, v] of Object.entries(a.inp || {})) f.use[m] -= v * (1 - paid);
    }
    const dT = g.climate.temp - M.START_TEMP;
    for (const [id, k] of Object.entries(YIELD_PER_DEGREE)) if (f.out[id]) f.out[id] *= Math.max(0, 1 - k * dT);
    for (const [k, id] of Object.entries(GOOD_MAT)) {
      f.out[id] = (f.out[id] || 0) + (g.flows.made[k] || 0) * 1000 / HOURS_MONTH;
      f.use[id] = (f.use[id] || 0) + goodsUse(g.flows, k) * 1000 / HOURS_MONTH;
    }
    return f;
  };

  const ms0 = S4.milestoneState;
  S4.milestoneState = n => {
    if (!M.def(n)) return ms0(n);
    const p = M.prog(g, n);
    if (p.done !== null) return 'done';
    if (p.started) return 'running';
    if (!M.available(g, n)) return 'locked';
    return p.queued ? 'waiting' : 'ready';
  };

  function rerender() {
    if (S4.screen === 'economy') S4.economy.render();
    else if (S4.screen === 'research') S4.research.render();
    else S4.chipsOnly();
  }
  const adv0 = S4.advance;
  S4.advance = dt => {
    adv0(dt);
    acc += dt;
    let stepped = false;
    while (acc >= MONTH - 1) { acc -= MONTH; M.step(g); stepped = true; }
    if (stepped) { sync(); rerender(); S4.refreshTop(); }
  };

  function sbar(parts, total, overBy = 0) {
    const sum = parts.reduce((a, [, v]) => a + v, 0) + overBy;
    const scale = Math.max(total, sum, 1e-9);
    return `<div class="sbar">${parts.filter(([, v]) => v > 1e-6).map(([k, v]) => `<i class="c-${k}" style="width:${v / scale * 100}%" data-tip="${esc(T(CAT[k], n1(v)))}"></i>`).join('')}${overBy > 1e-6 ? `<i class="over" style="width:${overBy / scale * 100}%" data-tip="${esc(T('Drawn from store', n1(overBy)))}"></i>` : ''}</div>`;
  }
  const KEYS = ['research', 'processing', 'production', 'compute', 'shipbuilding', 'programme', 'construction', 'infrastructure', 'sold'];
  const partsOf = o => KEYS.map(k => [k, o[k] || 0]);
  const used = o => KEYS.reduce((a, k) => a + (o[k] || 0), 0);

  const SEG = ['c-q0', 'c-q1', 'c-q2', 'c-q3'];
  function pool(icon, label, valueText, parts, total, short) {
    const scale = Math.max(total, parts.reduce((a, [, v]) => a + v, 0), 1e-9);
    const shown = parts.filter(([, v]) => v > 1e-6);
    return `<div class="pool ${short ? 'short' : ''}"><div class="ph2">${ricon(icon, 1)}<span>${label}</span><span class="v">${valueText}</span></div>
      <div class="sbar">${shown.map(([n, v], i) => `<i class="${SEG[i % SEG.length]}" style="width:${v / scale * 100}%" data-tip="${esc(T(n, v.toFixed(2)))}"></i>`).join('')}</div>
      <div class="legend">${shown.map(([n, v], i) => `<span><b class="${SEG[i % SEG.length]}"></b>${esc(n)} ${n1(v)}</span>`).join('')}</div></div>`;
  }
  function contested() {
    const f = g.flows;
    const inc = f.income + f.sales.mach + f.sales.elec + f.sales.cu + (f.sales.launch || 0);
    const out = f.upkeep + (f.usd.construction || 0) + (f.bought || 0);
    return `<h3>${gl('net', 'sm')}Capacity use</h3>
      <div class="cols2 pools">
        <div>${pool('cu', 'Compute', `${eflops(f.supply.cu)} · ${f.cs < 1 ? Math.round(f.cs * 100) + '% met' : eflops(f.cu.idle) + ' spare'}`, [[BUILDINGS.lab.name, f.cu.research], [BUILDINGS.efab.name, f.cu.processing], ['Market', f.cu.sold]], f.supply.cu, f.cs < 1)}</div>
        <div>${pool('bp', 'Build points', `${n1(f.supply.bp)} BP · ${n1(f.bp.idle)} unused`, g.queue.map((q, i) => [qName(q), (f.bpTo || [])[i] || 0]), f.supply.bp, false)}
        ${pool('usd', 'Treasury', `${amt('usd', g.usd)} · in ${amt('usd', inc)} · out ${amt('usd', out)}`, [['Upkeep', f.upkeep], ['Construction', f.usd.construction || 0], ['Purchases', f.bought || 0]], Math.max(inc, out), g.usd < 0)}</div>
      </div>`;
  }

  const logHtml = () => `<div class="sklog">${g.log.slice(0, 14).map(l => `<div class="${l.tone}"><em>${M.monthName(l.at)}</em><span>${esc(l.text)}</span></div>`).join('')}</div>`;

  const gw = v => S4.fmt.group(v) + ' GW';
  const fr = (k, v, hot) => `<div class="fr"><span class="nm">${k}</span><span class="v ${hot ? 'hot' : ''}">${v}</span></div>`;
  function powerBlock() {
    const gr = g.flows.grid;
    const src = Object.entries(gr.bySource).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => [BUILDINGS[id].name, v]);
    return `<h3>${gl('bolt', 'sm')}Power</h3>
      ${pool('power', 'Generation', `${gw(gr.avg)} average · ${gw(gr.demand)} demand`, src, Math.max(gr.avg, gr.demand), gr.avg < gr.demand)}
      <div class="cols2"><div class="flow">${fr('Industry demand', gw(gr.industry))}${fr('Installed capacity', gw(gr.capacity))}</div>
      <div class="flow">${fr('Firm capacity', gw(gr.firm), gr.firm < gr.peak)}${fr('Peak demand', gw(gr.peak))}${fr('Storage', S4.fmt.group(gr.storage) + ' GWh')}</div></div>`;
  }
  function climateBlock() {
    const c = g.climate, dT = c.temp - M.START_TEMP;
    const yearGt = (g.flows.grid.co2 * 12 + M.worldCo2(g) + g.ext.farmCo2());
    return `<h3>${gl('leaf', 'sm')}Climate</h3>
      <div class="cols2"><div class="flow">${fr('Carbon dioxide', c.ppm.toFixed(1) + ' ppm')}${fr('Warming', '+' + c.temp.toFixed(2) + ' °C')}${fr('Sea level since start', '+' + c.sea.toFixed(0) + ' mm')}</div>
      <div class="flow">${fr('Emissions a year', yearGt.toFixed(1) + ' Gt CO₂')}${fr('From your power plants', (g.flows.grid.co2 * 12).toFixed(2) + ' Gt CO₂')}${fr('From your farms', g.ext.farmCo2().toFixed(2) + ' Gt CO₂')}${fr('Population', M.worldCo2(g).toFixed(1) + ' Gt CO₂')}${fr('Wheat yield', (dT > 0 ? '−' : '') + (Math.abs(dT) * 6).toFixed(1) + '%', dT > 0.05)}</div></div>`;
  }
  function summaryBlock() {
    return `${contested()}${powerBlock()}${climateBlock()}<h3>${gl('list', 'sm')}Programme log</h3>${logHtml()}`;
  }

  function util(id) {
    const f = g.flows;
    if (id === 'lab') return g.active.lab ? Math.min(g.active.lab, M.labsInUse(g)) / g.active.lab * f.cs : 0;
    if (id === 'efab') return f.cs * (f.made.elec / Math.max(1e-9, g.active.efab * BUILDINGS.efab.make.elec)) / Math.max(f.cs, 1e-9);
    if (id === 'mshop') return f.made.mach / Math.max(1e-9, g.active.mshop * BUILDINGS.mshop.make.mach);
    if (id === 'yard') return f.supply.bp ? 1 - f.bp.idle / f.supply.bp : 0;
    if (id === 'pad') return f.supply.launch ? 1 - f.launch.idle / f.supply.launch : 0;
    if (id === 'dc') return f.supply.cu ? 1 - f.cu.idle / f.supply.cu : 0;
    if (id === 'rocket') return g.stages >= g.stageTarget ? 0 : 1;
    return g.active[id] ? 1 : 0;
  }
  const MAIN_OUT = { coal: 'power', gas: 'power', oil: 'power', nuclear: 'power', hydro: 'power', bio: 'power', wind: 'power', solar: 'power', battery: 'power', pumped: 'power', silicon: 'si', mshop: 'mach', efab: 'elec', dc: 'cu', lab: 'rp', yard: 'bp', rocket: 'launch', pad: 'launch' };
  function prodTile(id, sel) {
    const b = BUILDINGS[id], u = util(id), out = MAIN_OUT[id];
    const tip = T(b.name, '~' + b.desc, `${g.active[id]} running of ${g.count[id]}`, `${Math.round(u * 100)}% busy`);
    return `<button class="tile prod ${sel ? 'sel' : ''} ${g.active[id] < g.count[id] ? 'idle' : ''}" data-act="skgrp" data-id="${id}" data-tip="${esc(tip)}">
      <i class="kstripe" style="background:${kcol(b.kind)}"></i><span class="art2">${bicon(id, 2)}${ricon(out, 2)}</span>
      ${nm2(RES[out].name, b.name)}<span class="foot"><span class="n">${g.active[id]}/${g.count[id]}</span>${meter(u)}</span></button>`;
  }
  const FAB_RECIPE = { silicon: 'efab', efab: 'silicon' };
  const kcol = kind => `rgb(${(S4.KIND[kind] || [150, 150, 180]).join(',')})`;
  function prodExtra(ES) {
    const sel = typeof ES.group === 'string' && ES.group.startsWith('sk:') ? ES.group.slice(3) : null;
    return IDS.filter(id => g.count[id] > 0).map(id => ({ kind: BUILDINGS[id].kind, n: g.count[id], html: prodTile(id, sel === id) }));
  }
  const perMonth = (k, v) => {
    const P = S4.perOf(), months = P.hours / 730.5;
    if (RES[k] && RES[k].unit === 't') return S4.fmt.mass(v * 1000 * months) + '/' + P.unit;
    if (k === 'cu') return eflops(v);
    if (k === 'usd') return '$' + n1(v * months) + 'B/' + P.unit;
    return n1(v * months) + ' ' + RES[k].unit + '/' + P.unit;
  };
  const rateTile = (k, v) => `<span class="rate">${ricon(k, 2)}<span>${perMonth(k, v)}</span></span>`;
  function plantCard(id, withBuild) {
    const b = BUILDINGS[id], n = g.active[id] || 0;
    return `<div class="card"><header>${bicon(id, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${esc(S4.KIND_NAMES.power)}</div></div></header><div class="cb">
      <div class="flow">${fr('Capacity each', gw(b.gw))}${b.gwh ? fr('Storage each', b.gwh + ' GWh') : fr('Capacity factor', Math.round(b.cf * 100) + '%')}${fr('Firm share', Math.round(b.firm * 100) + '%')}${b.co2 ? fr('CO₂', b.co2 + ' t/MWh') : ''}${b.waterMwh ? fr('Water', b.waterMwh + ' t/MWh') : ''}
      ${withBuild ? fr('Standing', S4.fmt.group(g.count[id])) : fr('Average output', gw(n * b.gw * b.cf)) + fr('CO₂ a year', (n * b.gw * b.cf * 8766 * b.co2 / 1e6).toFixed(2) + ' Gt')}</div>
      ${withBuild ? '' : `<div class="row sp"><span class="lbl" style="margin:0">Active</span>${ctl('skactive', id, S4.fmt.group(n) + ' / ' + S4.fmt.group(g.count[id]))}</div>`}
      ${withBuild ? `<div><span class="lbl">Build cost</span>${costList({ ...b.cost, usd: b.cost.bp * M.WAGE_PER_BP })}</div><div class="btns"><button data-act="skbuild" data-id="${id}">${gl('plus')}Add to queue</button></div>${queuedRows(id)}` : ''}
    </div></div>`;
  }
  function bCard(id, withBuild) {
    if (BUILDINGS[id].kind === 'power') return plantCard(id, withBuild);
    const b = BUILDINGS[id];
    const out = b.make ? Object.values(b.make)[0] : 1;
    const output = Object.entries(b.make || {}).filter(([k]) => k !== 'mw').map(([k, v]) => rateTile(k, v)).join('');
    const input = [...Object.entries(b.useGame || {}).map(([k, v]) => `<span class="rate">${S4.mi(k, 2)}<span>${S4.fmt.mass(v * 1000 * S4.perOf().hours / HOURS_MONTH)}/${S4.perOf().unit}</span></span>`), ...Object.entries(b.use || {}).map(([k, v]) => rateTile(k, id === 'lab' ? v : v * out)), b.compute ? rateTile('cu', b.compute) : ''].join('');
    return `<div class="card"><header>${bicon(id, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${esc(S4.KIND_NAMES[b.kind])}${FAB_RECIPE[id] ? ' · ' + esc(RES[MAIN_OUT[id]].name) : ''}</div></div></header><div class="cb">
      ${output ? `<div><span class="lbl">Output</span><div class="eq">${output}</div></div>` : ''}
      ${input ? `<div><span class="lbl">Input</span><div class="eq">${input}</div></div>` : ''}
      <div class="flow"><div class="fr"><span class="nm">Power</span><span class="v">${S4.fmt.power(b.power * 1000)}</span></div>${b.workers ? `<div class="fr"><span class="nm">Workers</span><span class="v">${S4.fmt.group(b.workers)}</span></div><div class="fr"><span class="nm">Wages</span><span class="v">$${S4.fmt.group(b.workers * M.WAGE_B * 1e9 * S4.perOf().hours / HOURS_MONTH)}/${S4.perOf().unit}</span></div>` : ''}${b.water ? `<div class="fr"><span class="nm">Water</span><span class="v">${S4.fmt.mass(b.water * 1000 * S4.perOf().hours / HOURS_MONTH)}/${S4.perOf().unit}</span></div>` : ''}<div class="fr"><span class="nm">Upkeep</span><span class="v">${perMonth('usd', b.upkeep)}</span></div>${withBuild ? `<div class="fr"><span class="nm">Standing</span><span class="v">${g.count[id]}</span></div>` : ''}</div>
      ${withBuild ? '' : `<div class="row sp"><span class="lbl" style="margin:0">Active</span>${ctl('skactive', id, g.active[id] + ' / ' + g.count[id])}</div>`}
      ${!withBuild && FAB_RECIPE[id] ? `<div class="row sp"><span class="lbl" style="margin:0">Switch one to ${esc(RES[MAIN_OUT[FAB_RECIPE[id]]].name)}</span><button data-act="skretool" data-id="${id}" ${g.count[id] ? '' : 'disabled'}>${gl('arrowR', 'sm')}</button></div>` : ''}
      ${withBuild ? `<div><span class="lbl">Build cost</span>${costList({ ...b.cost, usd: b.cost.bp * M.WAGE_PER_BP })}</div>
      <div class="btns"><button data-act="skbuild" data-id="${id}">${gl('plus')}Add to queue</button></div>
      ${queuedRows(id)}` : ''}
    </div></div>`;
  }
  const gameBp = id => (S4.D.bld[id] && S4.D.bld[id].kind === 'extraction' ? 0.01 : Math.max(0.01, Math.round(S4.buildHours(id) / 24) / 100));
  const qName = q => (q.game ? q.name : BUILDINGS[q.id].name);
  const qCost = q => (q.game ? q.bpCost : BUILDINGS[q.id].cost.bp);
  const qIcon = (q, s) => (q.game ? S4.bi(q.id, s) : bicon(q.id, s));
  const shortName = k => (k === 'usd' ? 'money' : RES[k] ? RES[k].name.toLowerCase() : S4.short(k).toLowerCase());
  function eta(q) {
    if (q.blocked && !q.paid) return { text: 'short of ' + q.blocked.map(shortName).join(', '), hot: true };
    const rate = g.flows.supply.bp * (q.pct || 0) / 100;
    if (rate <= 0) return { text: 'no build points', hot: true };
    return { text: M.monthName(g.month + Math.ceil((qCost(q) - q.bp) / rate)), hot: false };
  }
  function qTile(q, i) {
    const e = eta(q);
    const tip = T(qName(q), `${Math.round(q.bp)} / ${qCost(q)} BP`, (e.hot ? '!' : '') + 'Completion ' + e.text);
    return `<button class="tile q" data-act="${q.game ? 'skgpick' : 'skcpick'}" data-id="${q.id}" data-tip="${esc(tip)}"><span class="corner">${i + 1}</span><span class="corner r ${q.pct ? 'acc' : 'hot'}">${q.pct}%</span><span class="art">${qIcon(q, 2)}</span>${S4.kit.nm(qName(q))}${meter(q.bp / qCost(q), e.hot ? 'hot' : '', 'full')}<span class="${e.hot ? 'hot' : 'dim'} note">${esc(e.text)}</span></button>`;
  }
  function queuedRows(id) {
    const rows = g.queue.map((q, i) => [q, i]).filter(([q]) => q.id === id);
    if (!rows.length) return '';
    return `<div><span class="lbl">In queue</span><div class="flow">${rows.map(([q, i]) => { const e = eta(q); return `<div class="fr"><label class="field">Percentage <input class="skpct" data-id="${i}" type="number" min="0" max="100" step="5" value="${q.pct}" style="width:64px"></label>${meter(q.bp / qCost(q))}<span class="v ${e.hot ? 'hot' : ''}">${esc(e.text)}</span>${q.paid ? '' : `<button data-act="skunq" data-id="${i}">${gl('cross', 'xs')}</button>`}</div>`; }).join('')}</div></div>`;
  }
  function bldTile(id, sel) {
    const b = BUILDINGS[id], costs = Object.keys(b.cost).filter(k => k !== 'bp'), n = id === 'efab' ? g.count.efab + g.count.silicon : g.count[id];
    return `<button class="tile bld ${sel ? 'sel' : ''}" data-act="skcpick" data-id="${id}" data-tip="${esc(T(b.name, '~' + b.desc, n + ' standing', b.cost.bp + ' build points'))}">
      <i class="kstripe" style="background:${kcol(b.kind)}"></i><span class="corner">${n ? '×' + n : ''}</span><span class="art">${bicon(id, 2)}</span>${S4.kit.nm(b.name)}<span class="costs">${costs.slice(0, 3).map(k => ricon(k, 1)).join('')}</span></button>`;
  }
  function bpTracker() {
    const f = g.flows, made = f.supply.bp, used = (f.bpTo || []).reduce((a, v) => a + v, 0), free = 100 - M.allocated(g);
    return `<div class="bpt">
      <div class="ph2">${ricon('bp', 1)}<span>Build points</span><span class="v">${n1(made)} a month · ${g.active.yard} ${g.active.yard === 1 ? 'yard' : 'yards'} · ${n1(made - used)} unused</span></div>
      <div class="sbar">${g.queue.map((q, i) => `<i class="c-q${i % 2}" style="width:${q.pct}%" data-tip="${esc(T(qName(q), q.pct + '%'))}"></i>`).join('')}${free > 0 ? `<i class="free" style="width:${free}%" data-tip="${esc(T('Unallocated', free + '%'))}"></i>` : ''}</div></div>`;
  }
  function consExtra(ES) {
    const sel = ES.side === 'sk' ? SK.csel : null;
    return IDS.filter(id => id !== 'silicon').map(id => ({ kind: BUILDINGS[id].kind, html: bldTile(id, sel === id || (id === 'efab' && sel === 'silicon')) }));
  }
  const queueExtra = () => g.queue.map(qTile);

  const launchSection = () => '';

  function market() {
    const f = g.flows;
    const sellCard = (id, made) => {
      const q = id === 'launch' ? f.launches.commercial : made * g.sell[id];
      const price = M.priceFor(id, q), rev = id === 'launch' ? f.sales.launch || 0 : f.sales[id];
      const icon = id === 'launch' ? ricon('launch', 2) : ricon(id, 2);
      return `<div class="card"><header>${icon}<div><div class="t">${esc(id === 'launch' ? 'Commercial launches' : RES[id].name)}</div><div class="s">${id === 'launch' ? '' : (id === 'cu' ? eflops(made) : S4.fmt.mass(made * 1000) + ' made a month')}</div></div></header><div class="cb">
        <div class="row sp"><span class="lbl" style="margin:0">${id === 'launch' ? 'Launches a month' : 'Share sold'}</span>${id === 'launch' ? ctl('skcommercial', 'x', String(g.commercial)) : ctl('sksell', id, Math.round(g.sell[id] * 100) + '%')}</div>
        <div class="flow"><div class="fr"><span class="nm">Price now</span><span class="v">$${n1(price * 1000)}M ${id === 'launch' ? 'a launch' : id === 'cu' ? 'an EFLOP/s a month' : 'a tonne'}</span></div><div class="fr"><span class="nm">Earns a month</span><span class="v cool">${amt('usd', rev)}</span></div></div></div></div>`;
    };
    const buyCard = id => {
      const c = GOODS[id];
      return `<div class="card"><header>${ricon(id, 2)}<div><div class="t">${esc(RES[id].name)}</div><div class="s">up to ${n1(c.avail)} t a month</div></div></header><div class="cb">
        <div class="row sp"><span class="lbl" style="margin:0">Bought a month</span>${ctl('skbuy', id, n1(g.buy[id]) + ' t')}</div>
        <div class="flow"><div class="fr"><span class="nm">Price</span><span class="v">$${n1(c.buy * 1000)}M a tonne</span></div><div class="fr"><span class="nm">Costs a month</span><span class="v hot">${amt('usd', g.buy[id] * c.buy)}</span></div></div></div></div>`;
    };
    const offerCard = (o, i) => `<div class="card"><header>${o.kind === 'supply' ? ricon(o.id, 2) : o.kind === 'sketch' ? bicon(o.id, 2) : S4.bi(o.id, 2)}<div><div class="t">${esc(o.name)}</div><div class="s">${o.kind === 'supply' ? 'Supply ' + S4.fmt.mass(o.amount * 1000) + ' a month' : 'Lease ' + S4.fmt.group(o.count)}</div></div></header><div class="cb">
        <div class="flow">${fr('Length', o.months + ' months')}${fr('Pays a month', amt('usd', o.usd))}${fr('Pays in all', amt('usd', o.usd * o.months))}</div>
        <div class="btns"><button data-act="skaccept" data-id="${i}">${gl('check')}Accept</button></div></div></div>`;
    const leaseCard = l => `<div class="card"><header>${l.kind === 'supply' ? ricon(l.id, 2) : l.kind === 'sketch' ? bicon(l.id, 2) : S4.bi(l.id, 2)}<div><div class="t">${esc(l.name)}</div><div class="s">${l.kind === 'supply' ? 'Supplying ' + S4.fmt.mass(l.amount * 1000) + ' a month' : 'Leased ' + S4.fmt.group(l.count)}</div></div></header><div class="cb">
        <div class="flow">${fr('Months left', l.left)}${fr('Pays a month', amt('usd', l.usd))}${l.missed ? fr('Last month', 'not delivered', true) : ''}</div></div></div>`;
    return `<div class="main"><h3>${gl('list', 'sm')}Offers</h3><div class="mk">${g.offers.map(offerCard).join('')}</div>
      ${g.leases.length ? `<h3>${gl('check', 'sm')}Contracts</h3><div class="mk">${g.leases.map(leaseCard).join('')}</div>` : ''}
      <h3>${gl('coin', 'sm')}Sell</h3><div class="mk">${sellCard('elec', f.made.elec)}${sellCard('mach', f.made.mach)}${sellCard('cu', f.supply.cu)}</div>
      <h3>${gl('box', 'sm')}Buy</h3><div class="mk">${['elec', 'mach', 'si'].map(buyCard).join('')}</div></div>
      <div class="side">${ledger()}</div>`;
  }
  function ledger() {
    const f = g.flows;
    const rows = [
      ['Taxes', f.income], ['Leases', f.leaseIncome || 0], ['Supply contracts', f.supplyIncome || 0], ['Electronics sold', f.sales.elec], ['Machinery sold', f.sales.mach], ['Compute sold', f.sales.cu], ['Commercial launches', f.sales.launch || 0],
      ['Wages', -(f.wages || 0)], ['Upkeep', -(f.upkeep - (f.wages || 0))], ['Construction', -f.usd.construction], ['Stages and launches', -(f.usd.shipbuilding + f.usd.programme)], ['Purchases', -(f.bought || 0)]
    ];
    const net = rows.reduce((a, [, v]) => a + v, 0);
    const growth = M.growthOf(g);
    const taxCard = `<div class="card"><header>${gl('coin', 'lg')}<div><div class="t">Taxes</div><div class="s">${S4.fmt.group(g.gdp)} $B a year economy</div></div></header><div class="cb">
      <label class="field">Tax rate <input class="sktax" type="number" min="0" max="60" step="1" value="${Math.round(g.taxRate * 100)}" style="width:64px"> %</label>
      <div class="flow">${fr('Civilian growth', (growth * 100).toFixed(1) + '% a year', growth < 0)}${fr('Taxes a month', amt('usd', f.income))}${fr('Offers a month', String(g.offers.length))}${fr('Longest contract', Math.max(3, Math.round(6 + growth * 400)) + ' months')}</div></div></div>`;
    return taxCard + `<div class="card ledger"><header>${gl('coin', 'lg')}<div><div class="t">Next month</div><div class="s">Treasury ${amt('usd', g.usd)}</div></div></header><div class="cb"><div class="flow">${rows.map(([t, v]) => `<div class="fr"><span class="nm">${t}</span><span class="v ${v > 0.0005 ? 'cool' : v < -0.0005 ? 'hot' : ''}">${v >= 0 ? '+' : '−'}${amt('usd', Math.abs(v))}</span></div>`).join('')}<div class="fr tot"><span class="nm">Net</span><span class="v ${net >= 0 ? 'cool' : 'hot'}">${net >= 0 ? '+' : '−'}${amt('usd', Math.abs(net))}</span></div></div>${f.paid < 1 ? `<div class="hot">Upkeep paid ${Math.round(f.paid * 100)}%</div>` : ''}</div></div>`;
  }

  const face = s => ({ seed: s.seed, age: 2026 - s.born + Math.floor((g.month - M.START) / 12), rank: 1, branch: 'staff', gender: s.gender });
  const pct = v => '+' + Math.round(v * 100) + '%';
  const doing = s => {
    const p = M.leading(g, s.id), q = M.queueOf(g, s.id);
    return p ? S4.MS_SHORT[p.n] + (q.length ? ' +' + q.length : '') : 'unassigned';
  };
  function sciTile(s, opts = {}) {
    const busy = M.leading(g, s.id);
    const tip = T(s.name, SUBJECTS[s.subject] + ' ' + s.skill, 'Administration ' + s.admin + ': up to ' + s.admin + ' labs', opts.subject ? (s.subject === opts.subject ? 'In field ' : 'Out of field ') + pct(M.bonusOf(s, opts.subject)) : '', busy ? 'Leads ' + S4.MS_SHORT[busy.n] : '');
    const sub = opts.subject ? `${s.subject === opts.subject ? '★ ' : ''}${pct(M.bonusOf(s, opts.subject))} · ${s.admin} labs` : SUBJECTS[s.subject] + ' ' + s.skill;
    return `<button class="tile off ${opts.sel ? 'sel' : ''} ${busy ? '' : 'idle'}" data-act="${opts.act || 'skssel'}" data-id="${s.id}" data-tip="${esc(tip)}"><span class="art" style="height:72px;display:flex;align-items:center">${S4.miniFace(face(s), 2)}</span>${nm2(s.name, sub)}<span class="dim" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${esc(doing(s))}</span></button>`;
  }
  function scientists() {
    return `<div class="main"><h3>${gl('people', 'sm')}Scientists</h3>
      <div class="filters"><button data-act="skrecruit" ${g.usd >= M.RECRUIT_COST ? '' : 'disabled'} data-tip="${esc(T('Recruit', '$' + M.RECRUIT_COST + 'B', M.RECRUIT_MONTHS + ' months'))}">${gl('plus', 'xs')} Recruit${g.recruiting.length ? ' (' + g.recruiting.length + ' on the way)' : ''}</button></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,112px)">${g.scientists.map(s => sciTile(s, { sel: SK.ssel === s.id })).join('')}</div></div>`;
  }
  function sciCard(id) {
    const s = g.scientists.find(x => x.id === id), cur = M.leading(g, s.id), q = M.queueOf(g, s.id);
    const open = g.programmes.filter(p => !p.started && !p.queued && M.available(g, p.n));
    return `<div class="card" style="margin:0"><header><div><div class="t">${esc(s.name)}</div><div class="s">${esc(SUBJECTS[s.subject])}</div></div></header><div class="cb"><div class="bigpic">${S4.bigFace(face(s), 3)}</div>
      <div class="flow"><div class="fr"><span class="nm">${esc(SUBJECTS[s.subject])}</span><span class="v">${s.skill} / 10</span></div><div class="fr"><span class="nm">Administration</span><span class="v">${s.admin} labs</span></div><div class="fr"><span class="nm">Leads</span><span class="v">${cur ? esc(S4.MS_SHORT[cur.n]) : '—'}</span></div>${q.map(p => `<div class="fr"><span class="nm">Queued</span><span class="v">${esc(S4.MS_SHORT[p.n])}</span></div>`).join('')}</div>
      ${open.length ? `<div><span class="lbl">${cur ? 'Queue' : 'Create'}</span><div class="btns">${open.map(p => `<button data-act="skassign" data-id="${p.n}" data-tip="${esc(T(M.def(p.n).name, (s.subject === M.def(p.n).subject ? 'In field ' : 'Out of field ') + pct(M.bonusOf(s, M.def(p.n).subject))))}">${s.subject === M.def(p.n).subject ? '★ ' : ''}${p.n}. ${esc(S4.MS_SHORT[p.n])}</button>`).join('')}</div></div>` : ''}
    </div></div>`;
  }
  function planFor(n) {
    const d = M.def(n), plan = SK.plan[n] || (SK.plan[n] = { lead: null, labs: 0 });
    const s = g.scientists.find(x => x.id === plan.lead);
    if (!s) {
      const best = [...g.scientists].sort((a, b) => !!M.leading(g, a.id) - !!M.leading(g, b.id) || M.bonusOf(b, d.subject) - M.bonusOf(a, d.subject))[0];
      plan.lead = best ? best.id : null;
    }
    const lead = g.scientists.find(x => x.id === plan.lead);
    const free = g.active.lab - M.labsInUse(g);
    const cap = lead ? Math.min(lead.admin, free) : 0;
    if (!plan.touched) plan.labs = cap;
    plan.labs = Math.max(0, Math.min(plan.labs, cap));
    return { plan, lead, free, cap };
  }
  function progCard(n) {
    const p = M.prog(g, n), d = M.def(n), m = S4.mile(n), st = S4.milestoneState(n), lead = g.scientists.find(s => s.id === p.lead);
    const rate = g.flows.rp[n] || 0, left = d.rp - p.rp, eta = rate > 0 ? Math.ceil(left / rate) : null;
    const free = g.active.lab - M.labsInUse(g);
    const order = [...g.scientists].sort((a, b) => (b.subject === d.subject) - (a.subject === d.subject) || b.skill - a.skill);
    let body = '';
    if (p.started && p.done === null) {
      body = `<div class="row">${meter(p.rp / d.rp, 'cool', 'thick')}<span>${Math.round(p.rp)} / ${d.rp} RP</span><span class="dim">${eta ? eta + ' months' : 'stalled'}</span></div>
        <div class="row">${lead ? S4.miniFace(face(lead), 1) : ''}<span>${esc(lead.name)}</span><span class="pill">${lead.subject === d.subject ? '★ ' : ''}${pct(M.bonusOf(lead, d.subject))}</span></div>
        <div class="row sp"><span class="lbl" style="margin:0">Labs</span>${ctl('sklabs', n, p.labs + ' / ' + lead.admin)}<span class="dim">${free} free</span></div>`;
    } else if (p.queued) {
      body = `<div class="row">${S4.miniFace(face(lead), 1)}<span>Queued for ${esc(lead.name)}</span><button data-act="skcancel" data-id="${n}">${gl('cross', 'xs')}</button></div>`;
    } else if (st === 'ready') {
      const { plan, lead: pick, cap } = planFor(n);
      const busy = pick && M.leading(g, pick.id);
      body = `<div><span class="lbl">Scientist</span><div class="grid" style="grid-template-columns:repeat(2,112px)">${order.map(s => sciTile(s, { act: 'skpick', subject: d.subject, sel: s.id === plan.lead })).join('')}</div></div>
        ${busy ? '' : `<div class="row sp"><span class="lbl" style="margin:0">Labs</span>${ctl('skplabs', n, plan.labs + ' / ' + cap)}<span class="dim">${free} free</span></div>`}
        <div class="btns"><button data-act="skcreate" data-id="${n}" ${pick ? '' : 'disabled'}>${gl(busy ? 'list' : 'play', 'sm')}${busy ? 'Queue for ' + esc(pick.name.split(' ')[0]) : 'Create project'}</button></div>`;
    } else if (st === 'done') {
      body = `<div class="row"><span class="pill cool">${gl('check')}${M.monthName(p.done)}</span></div>`;
    }
    const req = m.requires.length ? m.requires.map(r => `<button class="tile slot" data-act="ms" data-id="${r}"><span class="corner r ${M.done(g, r) ? 'acc' : 'hot'}">${gl(M.done(g, r) ? 'check' : 'lock')}</span><span>${esc(S4.MS_SHORT[r])}</span></button>`).join('') : '';
    return `<div class="card" style="margin:0"><header>${gl(d.subject === 'launch' ? 'rocket' : d.subject === 'power' ? 'bolt' : d.subject === 'computing' ? 'chip' : 'dome', 'lg')}<div style="flex:1"><div class="t">${n}. ${esc(m.name)}</div><div class="s">${esc(m.unlocks)}</div></div><span class="pill ${st === 'done' ? 'cool' : st === 'locked' ? 'hot' : ''}">${p.queued ? 'queued' : st}</span></header><div class="cb">
      <div class="row"><span class="pill">${gl('flask')}${d.rp} RP</span><span class="pill">${esc(SUBJECTS[d.subject])}</span>${p.started && p.done === null ? `<span class="pill">${gl('clock')}${n1(rate)} RP a month</span>` : ''}</div>
      ${body}
      ${req ? `<div><span class="lbl">Prerequisites</span><div class="eq">${req}</div></div>` : ''}
      ${S4.research.unlocksBlock(n)}
    </div></div>`;
  }
  function researchKpis(kp) {
    const f = g.flows, running = g.programmes.filter(p => p.started && p.done === null);
    return `<div class="kpis s">
      ${kp('flask', `${S4.E.done.length} of ${S4.D.miles.length}`, 'researched', false, T('Research'))}
      ${kp('hammer', String(running.length), running.length ? running.map(p => p.n).join(', ') + ' running' : 'none running', false, T('Programmes running'))}
      ${kp('star', `${M.labsInUse(g)} / ${g.active.lab}`, 'labs assigned', g.active.lab > M.labsInUse(g), T('Labs'))}
      ${kp('chip', eflops(f.cu.research), f.cs < 1 ? `${Math.round(f.cs * 100)}% met` : 'to labs', f.cs < 1, T('Compute to research'))}
      ${kp('people', String(g.scientists.length), `${g.scientists.filter(s => !M.leading(g, s.id)).length} unassigned`, false, T('Scientists'))}
    </div>`;
  }

  S4.sketchUI = {
    rtab: tab => (tab === 'scientists' ? scientists() : ''),
    rkpis: kp => researchKpis(kp),
    rcard: RS => (RS.tab === 'scientists' && SK.ssel !== null ? sciCard(SK.ssel) : M.def(RS.sel) ? progCard(RS.sel) : null),
    etab: (tab, f, s) => (tab === 'market' ? market() : tab === 'minerals' && s === S4.E ? S4.minerals.render(f) : null),
    summary: () => summaryBlock(),
    replaces: ['semiconductor_fab', 'data_centre'],
    queuedRows, bpOf: id => gameBp(id),
    prodExtra, consExtra, queueExtra, prodCard: group => (typeof group === 'string' && group.startsWith('sk:') ? bCard(group.slice(3), false) : null),
    consSection: () => bpTracker(), consCard: ES => (ES.side === 'sk' ? bCard(SK.csel, true) : null),
    launchSection,
    kpiCompute: stat => stat('chip', eflops(g.flows.supply.cu), `${eflops(g.flows.cu.idle)} spare`, g.flows.cs < 1, T('Compute')),
    chips: () => [
      ['coin', amt('usd', g.usd), 'Treasury', g.usd < 0],
      ['flask', `${M.labsInUse(g)}/${g.active.lab}`, 'Labs assigned', M.labsInUse(g) < g.active.lab],
      ['chip', g.flows.cs < 1 ? Math.round(g.flows.cs * 100) + '% compute' : '+' + eflops(g.flows.cu.idle), 'Compute', g.flows.cs < 1]
    ]
  };
  S4.research.TABS.push(['scientists', 'Scientists', 'people']);
  S4.economy.TABS.splice(4, 0, ['minerals', 'Minerals', 'map']);
  S4.economy.TABS.push(['market', 'Market', 'coin']);

  const H = {
    skgrp: id => { S4.economy.ES.group = 'sk:' + id; },
    skaccept: id => act.accept(g, +id),
    skretool: id => act.retool(g, id, FAB_RECIPE[id]),
    skactive: (id, d) => act.setActive(g, id, g.active[id] + d),
    skcpick: id => { SK.csel = id; S4.economy.ES.side = 'sk'; },
    skbuild: id => act.build(g, id),
    skunq: id => act.unqueue(g, +id),
    skgpick: id => { S4.economy.ES.pick = id; S4.economy.ES.side = 'pick'; },
    sklabs: (id, d) => act.labs(g, +id, d),
    skpick: id => { const n = S4.research.RS.sel; SK.plan[n] = { lead: +id, labs: 0, touched: false }; },
    skplabs: (id, d) => { const pl = SK.plan[+id]; pl.labs += d; pl.touched = true; },
    skcreate: id => { const pl = SK.plan[+id]; act.create(g, +id, pl.lead, pl.labs); delete SK.plan[+id]; },
    skcancel: id => act.cancel(g, +id),
    skassign: id => { const s = g.scientists.find(x => x.id === SK.ssel); act.create(g, +id, s.id, Math.min(s.admin, g.active.lab - M.labsInUse(g))); },
    skssel: id => { SK.ssel = +id; },
    skrecruit: () => act.recruit(g),
    sksell: (id, d) => act.sell(g, id, Math.round((g.sell[id] + d * 0.1) * 10) / 10),
    skbuy: (id, d) => act.buy(g, id, g.buy[id] + d * (GOODS[id].avail >= 8 ? 2 : 0.5)),
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act="badd"]');
    if (!t) return;
    e.stopImmediatePropagation();
    const ES = S4.economy.ES, b = S4.D.bld[ES.pick], n = Math.max(1, +document.getElementById('qty').value || 1);
    const recs = S4.choicesFor(b.id), rec = recs.find(r => r.id === ES.recipe) || recs[0];
    for (let i = 0; i < n; i++) act.buildGame(g, b.id, b.name, gameBp(b.id), rec ? rec.id : null);
    sync(); rerender();
  }, true);
  document.addEventListener('change', e => {
    if (e.target.classList.contains('sktax')) { act.tax(g, (+e.target.value || 0) / 100); sync(); rerender(); return; }
    if (!e.target.classList.contains('skpct')) return;
    act.setPct(g, +e.target.dataset.id, +e.target.value || 0);
    sync(); rerender();
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || !H[t.dataset.act]) return;
    H[t.dataset.act](t.dataset.id, +(t.dataset.d || 0));
    sync();
    rerender();
  });
  const tag = document.querySelector('.tag.mock');
  if (tag) tag.setAttribute('data-tip', 'Balance sketch: mock numbers');
})();
