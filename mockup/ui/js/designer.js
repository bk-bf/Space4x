'use strict';
(() => {
  const { D, fmt, esc, gl, ci, mi, T, meter, short } = S4;
  const G0 = 9.80665;
  const SHORT = { structure_truss: 'Truss', propellant_tank: 'Tank', copv: 'COPV', kerolox_engine: 'Kerolox', chemical_engine_methalox: 'Methalox', chemical_engine_hydrolox: 'Hydrolox', rcs_thruster: 'RCS', hall_thruster: 'Hall', ion_thruster: 'Ion', ntr_engine: 'NTR', fusion_drive: 'Fusion', fission_reactor_ship: 'Reactor', solar_array: 'Solar', battery_pack: 'Battery', radiator: 'Radiator', mli_blanket: 'MLI', habitat_module: 'Habitat', inflatable_habitat: 'Inflatable', life_support_unit: 'Life sup.', radiation_shield: 'Rad shield', whipple_shield: 'Whipple', heat_shield: 'Heat shield', avionics: 'Avionics', docking_adapter: 'Dock', sampling_arm: 'Arm' };
  const KIND_ORDER = ['propulsion', 'structure', 'power', 'thermal', 'habitat', 'protection', 'electronics'];
  const KIND_NAME = { propulsion: 'Propulsion', structure: 'Structure', power: 'Power', thermal: 'Thermal', habitat: 'Habitat', protection: 'Protection', electronics: 'Electronics' };
  const MOCK = {
    propellant_tank: { cap: 20000 }, copv: { cap: 0 }, fission_reactor_ship: { kwe: 100, kwt: 300 }, solar_array: { kwe: 25 }, battery_pack: { kwh: 50 },
    radiator: { rej: 120 }, habitat_module: { crew: 6, kw: 2 }, inflatable_habitat: { crew: 12, kw: 3 }, life_support_unit: { ls: 8, kw: 1.5 }, avionics: { kw: .5 },
    radiation_shield: { rad: 1 }, whipple_shield: {}, heat_shield: {}, mli_blanket: {}, docking_adapter: {}, sampling_arm: { kw: .3 }
  };
  const big = new Set(['chemical_engine_methalox', 'chemical_engine_hydrolox', 'ntr_engine', 'fusion_drive', 'kerolox_engine']);
  const costOf = c => Object.values(c.cost).reduce((a, v) => a + v, 0);
  const massOf = c => c.performance ? c.performance.mass : .65 * costOf(c);

  const DS = { name: 'New design', items: {}, order: [], payload: 0, flash: null };
  const nz = () => DS.order.filter(id => DS.items[id] > 0);

  function sci(n, unit) {
    if (unit === 'N') return fmt.num(n / 1000) + ' kN';
    const a = Math.abs(n);
    if (a === 0) return '0 ' + unit;
    if (a >= 1e6) return (n / 1e6).toFixed(2) + ' M' + unit;
    if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 1 : 2) + ' k' + unit;
    if (a >= 1) return (a >= 100 ? n.toFixed(0) : n.toFixed(2)) + ' ' + unit;
    return n.toFixed(a >= .01 ? 3 : 4) + ' ' + unit;
  }
  const tons = kg => fmt.mass(kg);

  function stats() {
    const it = DS.items, n = id => it[id] || 0;
    const r = { dry: 0, prop: 0, thrustRaw: 0, thrust: 0, flowRaw: 0, kweGen: 0, kwUse: 0, kwEng: 0, crew: 0, ls: 0, rej: 0, kwt: 0, cost: {}, count: 0, engines: 0 };
    for (const id of nz()) {
      const c = D.comp[id], k = n(id), mk = MOCK[id] || {};
      r.count += k; r.dry += massOf(c) * k;
      for (const [m, v] of Object.entries(c.cost)) r.cost[m] = (r.cost[m] || 0) + v * k;
      r.prop += (mk.cap || 0) * k; r.kweGen += (mk.kwe || 0) * k; r.kwUse += (mk.kw || 0) * k; r.crew += (mk.crew || 0) * k; r.ls += (mk.ls || 0) * k; r.rej += (mk.rej || 0) * k; r.kwt += (mk.kwt || 0) * k;
      if (c.performance) { r.engines += k; r.kwEng += (c.performance.power || 0) * k; }
    }
    const batt = n('battery_pack');
    r.powerFactor = r.kwEng > 0 ? Math.min(1, (r.kweGen + (r.kweGen ? 0 : 0)) / Math.max(r.kwEng + r.kwUse, 1e-9)) : 1;
    for (const id of nz()) {
      const c = D.comp[id]; if (!c.performance) continue;
      const k = n(id), p = c.performance, f = p.power ? p.thrust * Math.min(1, r.powerFactor) * k : p.thrust * k;
      r.thrust += f; r.thrustRaw += p.thrust * k; r.flowRaw += f / (p.isp * G0);
    }
    r.isp = r.flowRaw > 0 ? r.thrust / r.flowRaw / G0 : 0;
    r.crewKg = r.crew * 100;
    r.payload = DS.payload * 1000;
    r.dryAll = r.dry + r.crewKg + r.payload; r.wet = r.dryAll + r.prop;
    r.dv = r.isp > 0 && r.prop > 0 ? r.isp * G0 * Math.log(r.wet / r.dryAll) : 0;
    r.acc = r.thrust / r.wet; r.twr = r.acc / G0;
    r.burn = r.thrust > 0 ? r.prop * r.isp * G0 / r.thrust : 0;
    r.powerBal = r.kweGen - r.kwEng - r.kwUse;
    return r;
  }

  function flagsOf(r) {
    const it = DS.items, n = id => it[id] || 0, out = [];
    const E = t => out.push(['e', t]), W = t => out.push(['w', t]);
    if (!r.count) return out;
    if (!r.engines) E('No engine');
    if (!n('avionics')) E('No avionics: nothing flies it');
    if (r.engines && !r.prop) E('Engines have no propellant: add a tank');
    if (r.crew && r.ls < r.crew) E(`Crew ${r.crew} but life support for ${r.ls}`);
    if (!r.crew && r.ls) W('Life support with nobody aboard');
    if (r.kwEng > 0 && !r.kweGen) E('Electric engines, no power source');
    else if (r.kwEng > 0 && r.powerFactor < 1) W(`Power limits engines to ${fmt.pct(r.powerFactor)} thrust`);
    if (r.powerBal < 0 && r.kweGen) W(`Power short by ${fmt.power(-r.powerBal)}`);
    if (r.kwt && r.rej < r.kwt) W(n('radiator') ? `Radiators reject ${r.rej} of ${r.kwt} kW heat` : 'Reactor heat has no radiator');
    if (r.crew && !n('radiation_shield')) W('Crew without radiation shield');
    if (r.engines && r.prop && r.dv < 1000) W('Under 1 km/s of delta-v');
    if (!n('docking_adapter')) W('No docking adapter');
    if (!out.some(f => f[0] === 'e') && r.engines && r.prop && n('avionics')) out.unshift(['ok', 'Design is flyable']);
    return out;
  }

  function specFor() {
    const it = DS.items, n = id => it[id] || 0, ids = nz();
    if (!ids.length) return null;
    let mainEng = null, engN = 0;
    for (const id of ids) if (D.comp[id].performance && id !== 'rcs_thruster') { engN += n(id); if (!mainEng || D.comp[id].performance.thrust * n(id) > D.comp[mainEng].performance.thrust * n(mainEng)) mainEng = id; }
    const spec = { id: 'd:' + ids.map(i => i + n(i)).join(','), name: DS.name, parts: [] };
    if (engN) spec.stern = (engN === 1 && big.has(mainEng)) ? ['big'] : ['engines', Math.min(5, engN)];
    const parts = spec.parts;
    const put = (k, top, bot) => parts.push([k, top, bot]);
    const rad = n('radiator'), sol = n('solar_array');
    let radLeft = rad, solLeft = sol;
    const takeRad = () => { if (radLeft > 0) { const k = Math.min(2, radLeft); radLeft -= k; return k; } return 0; };
    const takeSol = () => { if (solLeft > 0) { const k = Math.min(2, solLeft); solLeft -= k; return k; } return 0; };
    const att = (name, k) => k ? [k >= 1 ? name : null, k > 1 ? name : null] : [null, null];
    for (let i = 0; i < Math.min(2, n('fission_reactor_ship')); i++) { const a = att('radiator', takeRad()); put('reactor', a[0], a[1]); }
    for (let i = 0; i < Math.min(2, Math.ceil(n('battery_pack') / 3)); i++) put('fuel');
    for (let i = 0; i < Math.min(5, Math.ceil(n('propellant_tank') / 3)); i++) { const a = att('radiator', takeRad()); put('tank', a[0], a[1]); }
    if (n('copv')) put('fuel', 'pod', 'pod');
    for (let i = 0; i < Math.min(4, n('structure_truss')); i++) { const a = att('solar', takeSol()); put('truss', a[0], a[1]); }
    while (solLeft > 0) { const a = att('solar', takeSol()); put('truss', a[0], a[1]); if (parts.length > 14) break; }
    while (radLeft > 0) { const a = att('radiator', takeRad()); put('hull', a[0], a[1]); if (parts.length > 14) break; }
    for (let i = 0; i < Math.min(3, Math.ceil(n('habitat_module') / 2)); i++) put('crew', i === 0 && n('sampling_arm') ? 'dish' : null);
    for (let i = 0; i < Math.min(2, n('inflatable_habitat')); i++) put('ring');
    for (let i = 0; i < Math.min(2, Math.ceil(n('life_support_unit') / 2)); i++) put('hull');
    for (let i = 0; i < Math.min(2, Math.ceil((n('radiation_shield') + n('whipple_shield')) / 2)); i++) put('armor');
    if (n('sampling_arm') && !n('habitat_module')) put('hull', 'dish');
    if (!parts.length) put('hull');
    if (n('heat_shield')) spec.bow = 'prow';
    else if (n('avionics')) spec.bow = n('docking_adapter') ? 'bridge' : 'blunt';
    else if (n('docking_adapter')) spec.bow = 'dock';
    if (n('docking_adapter') && spec.bow !== 'dock' && spec.bow !== 'bridge') spec.aft = undefined;
    if (!spec.stern && n('docking_adapter')) spec.aft = 'dock';
    return spec;
  }

  let fb = null, cv = null, craft = null, craftKey = '', raf = 0;
  function draw() {
    raf = 0;
    if (S4.screen !== 'designer') return;
    const host = document.querySelector('.shipview');
    if (!host) return;
    const cw = host.clientWidth, ch = host.clientHeight;
    if (!cv || !host.contains(cv)) { cv = host.querySelector('canvas'); fb = null; }
    if (!cv) return;
    const w = Math.max(60, Math.floor(cw / 2)), h = Math.max(60, Math.floor(ch / 2));
    if (!fb || fb.w !== w || fb.h !== h) fb = new FB(cv, w, h, 2, .72);
    fb.makeBg('grid');
    const spec = specFor();
    const lenEl = document.getElementById('lenov');
    if (spec) {
      if (craftKey !== spec.id) { craft = new Craft(spec, PALS.navy, { thr: .55 }); craftKey = spec.id; }
      const sp = shipSprite(spec, 3);
      const S = Math.max(.375, Math.min(6, w * .8 / sp.len, h * .62 / (sp.half * 2)));
      craft.thr = .55 + .1 * Math.sin(FRAME * .1);
      craft.draw(fb, w / 2 + (spec.stern ? 3 * S : 0), h / 2, S);
      if (lenEl) lenEl.textContent = `${Math.round(sp.len * 5)} m long, ${Math.round(sp.half * 2 * 5)} m across`;
    } else if (lenEl) lenEl.textContent = '';
    FRAME++;
    fb.present();
    raf = requestAnimationFrame(() => setTimeout(draw, 50));
  }
  function ensureLoop() { if (!raf) raf = requestAnimationFrame(draw); }

  function palTile(c) {
    const k = DS.items[c.id] || 0, p = c.performance;
    const stat = p ? (p.power ? `${p.isp} s` : `${p.isp} s`) : fmt.mass(massOf(c)).replace(' ', '');
    return `<button class="tile cmp ${k ? 'sel' : ''}" data-act="add" data-id="${c.id}" data-tip="${esc(compTip(c))}">${k ? `<span class="corner r acc" style="font-size:16px">×${k}</span>` : ''}${ci(c.id, 2, compTip(c))}<span class="nm"><b>${c.name}</b></span><span class="st dim">${stat}</span></button>`;
  }
  function compTip(c) {
    const p = c.performance, mk = MOCK[c.id] || {}, l = [KIND_NAME[c.kind] || c.kind, S4.dl(S4.desc.comp(c.id)), `Mass ${tons(massOf(c))}`];
    if (p) { l.push(`${p.engine}`, `Isp ${p.isp} s, thrust ${sci(p.thrust, 'N')}`); if (p.power) l.push(`Needs ${p.power} kW`); l.push('~' + ({ flown: 'Flown', 'ground-tested': 'Ground-tested', 'design-study': 'Design study' }[p.basis])); }
    if (mk.cap) l.push(`Holds ${tons(mk.cap)} propellant`);
    if (mk.kwe) l.push(`Makes ${mk.kwe} kW`); if (mk.rej) l.push(`Rejects ${mk.rej} kW heat`); if (mk.crew) l.push(`Berths ${mk.crew}`); if (mk.ls) l.push(`Supports ${mk.ls} crew`);
    l.push('~Cost: ' + Object.entries(c.cost).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, v]) => `${short(m)} ${fmt.mass(v)}`).join(', '));
    return T(c.name, l);
  }
  function stripTile(id) {
    const c = D.comp[id], k = DS.items[id];
    return `<div class="tile cmp" style="cursor:default" data-tip="${esc(compTip(c))}">${ci(id, 2, compTip(c))}<span class="nm"><b>${D.comp[id].name}</b></span><span class="cnt"><button data-act="dec" data-id="${id}">${gl('minus')}</button><span class="num">${k}</span><button data-act="inc" data-id="${id}">${gl('plus')}</button></span></div>`;
  }
  const stat = (ic, big, sub, warn, tip) => `<div class="stat ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;

  function render() {
    const root = document.getElementById('view');
    const r = stats(), fl = flagsOf(r), ids = nz();
    const kinds = KIND_ORDER.map(k => [k, D.comps.filter(c => c.kind === k)]).filter(x => x[1].length);
    const pal = kinds.map(([k, cs]) => `<div class="pal-kind">${ci(cs[0].id, 1)}${KIND_NAME[k]}</div><div class="grid" style="grid-template-columns:repeat(auto-fill,86px);gap:5px">${cs.map(palTile).join('')}</div>`).join('');
    const costs = Object.entries(r.cost).sort((a, b) => b[1] - a[1]).slice(0, 14);
    root.style.gridTemplateColumns = '1fr';
    const lastVal = (document.getElementById('dname') || {}).value;
    root.innerHTML = `<div class="designer">
      <div class="pan"><h2>${gl('ship')}Components <small>${D.comps.length}, no premade classes</small></h2><div class="pb">${pal}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0">
        <div class="shipview" style="flex:1"><canvas></canvas><div class="ov"><span id="lenov"></span></div>${ids.length ? '' : `<div class="ph"><div class="empty" style="background:rgba(20,17,42,.85)">${gl('plus', 'lg')}<div style="margin-top:6px" class="pf">New design</div><div>Click a component to add it. The ship draws itself from what you add.</div></div></div>`}</div>
        <div class="pan" style="min-height:130px"><h2>${gl('list')}Class <small>${r.count} components, ${ids.length} kinds</small><span style="flex:1"></span><button data-act="clear" ${ids.length ? '' : 'disabled'} data-tip="Start a new design">${gl('trash', 'sm')}</button><button disabled data-tip="Saving is not part of this mockup">Save class</button></h2><div class="pb"><div class="strip">${ids.length ? ids.map(stripTile).join('') : '<span class="dim">Nothing yet.</span>'}</div></div></div>
      </div>
      <div class="pan"><h2>${gl('gear')}Stats</h2><div class="pb">
        <input id="dname" class="namein" value="${esc(DS.name)}" maxlength="24" data-tip="Class name">
        <div class="stats" style="margin-top:8px">
          ${stat('box', tons(r.wet), `dry ${tons(r.dryAll)}`, false, T('Mass', `Hardware ${tons(r.dry)}`, `Crew ${tons(r.crewKg)}`, `Payload ${tons(r.payload)}`, `Propellant ${tons(r.prop)}`))}
          ${stat('rocket', r.dv ? (r.dv / 1000).toFixed(2) + ' km/s' : '-', r.isp ? `Isp ${Math.round(r.isp)} s` : 'delta-v', r.count && r.engines && r.dv < 1000, T('Delta-v', 'Rocket equation on full tanks', r.isp ? `Isp ${Math.round(r.isp)} s` : ''))}
          ${stat('up', r.engines ? (r.twr >= .1 ? r.twr.toFixed(2) : r.twr.toExponential(1)) : '-', r.engines ? `${sci(r.acc, 'm/s²')}` : 'thrust to weight', false, T('Thrust to weight', 'At full tanks, against 1 g'))}
          ${stat('flame', sci(r.thrust, 'N'), `${r.engines} engine${r.engines === 1 ? '' : 's'}`, false, T('Thrust', `Raw ${sci(r.thrustRaw, 'N')}`))}
          ${stat('people', String(r.crew), `life support ${r.ls}`, r.crew > r.ls, T('Crew', `Berths ${r.crew}`, `Life support for ${r.ls}`))}
          ${stat('bolt', (r.powerBal >= 0 ? '+' : '-') + fmt.power(Math.abs(r.powerBal)), `makes ${fmt.power(r.kweGen)}`, r.powerBal < 0, T('Power', `Makes ${fmt.power(r.kweGen)}`, `Engines ${fmt.power(r.kwEng)}`, `Systems ${fmt.power(r.kwUse)}`))}
          ${stat('drop', tons(r.prop), r.burn ? `burn ${Math.round(r.burn)} s` : 'propellant', false, T('Propellant', 'Held in tanks', r.burn ? `Full burn ${Math.round(r.burn)} s` : ''))}
          ${stat('warn', r.kwt ? (r.rej >= r.kwt ? 'ok' : 'hot') : 'cold', r.kwt ? `${r.rej} of ${r.kwt} kW` : 'no reactor', r.kwt > r.rej, T('Heat', 'Reactor heat against radiators'))}
        </div>
        <div style="margin-top:8px"><div class="row" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="margin:0">Payload (t)</span><input type="number" id="payload" min="0" value="${DS.payload}" style="width:80px"></div></div>
        <h3 style="margin-top:10px">Design</h3><div class="flags">${fl.length ? fl.map(([k, t]) => `<div class="flag ${k === 'w' ? 'w' : k === 'ok' ? 'ok' : ''}">${gl(k === 'ok' ? 'check' : 'warn')}<span>${esc(t)}</span></div>`).join('') : '<div class="dim">Nothing to check.</div>'}</div>
        <h3 style="margin-top:10px">Build cost</h3><div class="eq">${costs.length ? costs.map(([m, v]) => `<span class="rate" data-tip="${esc(S4.matTip(m) + '\nNeeded ' + fmt.amount(m, v))}">${mi(m, 2)}<span>${fmt.amount(m, v)}</span></span>`).join('') : '<span class="dim">Empty.</span>'}</div>
      </div></div></div>`;
    const inp = document.getElementById('dname');
    if (document.activeElement && document.activeElement.id === 'dname') inp.focus();
    cv = null; fb = null;
    ensureLoop();
  }

  function add(id, k = 1) {
    DS.items[id] = (DS.items[id] || 0) + k;
    if (DS.items[id] <= 0) { delete DS.items[id]; DS.order = DS.order.filter(x => x !== id); }
    else if (!DS.order.includes(id)) DS.order.push(id);
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'designer') return;
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act, id = t.dataset.id;
    if (a === 'add' || a === 'inc') add(id, 1);
    else if (a === 'dec') add(id, -1);
    else if (a === 'clear') { DS.items = {}; DS.order = []; DS.name = 'New design'; DS.payload = 0; craftKey = ''; }
    else return;
    render();
  });
  document.addEventListener('input', e => {
    if (S4.screen !== 'designer') return;
    if (e.target.id === 'dname') DS.name = e.target.value;
    if (e.target.id === 'payload') { DS.payload = Math.max(0, +e.target.value || 0); const pos = e.target.selectionStart; render(); const p = document.getElementById('payload'); p.focus(); }
  });

  S4.designer = { render, add, DS, stats: () => stats(), ensureLoop };
})();
