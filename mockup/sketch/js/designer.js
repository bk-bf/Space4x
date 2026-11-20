'use strict';
(() => {
  const { D, fmt, esc, gl, ci, mi, T, dl } = S4;
  const DS = { open: null, payload: null, uid: 1 };
  const READY = {
    stage: ['Small stage', 'launcher', 'rocket_factory', [['chemical_engine_methalox', 1], ['propellant_tank', 4], ['structure_truss', 1], ['cargo_bay', 1]]],
    crewed: ['Crewed vehicle', 'capsule', 'orbital_shipyard', [['chemical_engine_hydrolox', 1], ['propellant_tank', 2], ['crew_capsule', 1], ['life_support_unit', 1], ['heat_shield', 1], ['solar_array', 1], ['battery_pack', 1], ['radiator', 1], ['mli_blanket', 1], ['docking_adapter', 1]]]
  };

  const F = () => S4.F;
  const open = () => F().classes.find(c => c.id === DS.open) || null;
  const statsFor = d => S4.designStats(d);
  const formatKw = kw => (Math.abs(kw) >= 1000 ? `${(kw / 1000).toFixed(1)} MW` : `${(Math.round(kw * 10) / 10).toLocaleString('en-US')} kW`);
  const formatDv = ms => `${(ms / 1000).toFixed(2)} km/s`;
  const formatAccel = a => (a >= .1 ? `${a.toFixed(2)} m/s²` : a >= .001 ? `${(a * 1000).toFixed(1)} mm/s²` : `${(a * 1e6).toFixed(0)} µm/s²`);
  const formatThrust = n => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} MN` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} kN` : n >= 1 ? `${n.toFixed(1)} N` : `${(n * 1e3).toFixed(0)} mN`);
  const twrText = n => (n >= .1 ? n.toFixed(2) : n.toExponential(1));
  const keyFigure = c => (c.performance ? `${c.performance.isp} s` : fmt.mass(S4.massOf(c)));

  function factList(c) {
    const d = c.design || {}, out = [`Mass ${fmt.mass(S4.massOf(c))}`];
    if (c.performance) { out.push(`Isp ${c.performance.isp} s, thrust ${formatThrust(c.performance.thrust)}`); if (c.performance.power) out.push(`Needs ${formatKw(c.performance.power)}`); }
    if (d.volume) out.push(`Tank ${d.volume} m³`);
    if (d.cargo) out.push(`Carries ${fmt.mass(d.cargo)}`);
    if (d.housing) out.push(`Berths ${d.housing}`);
    if (d.supports) out.push(`Sustains ${d.supports} crew`);
    if (d.generates) out.push(`Makes ${formatKw(d.generates)} at 1 AU`);
    if (d.radiates) out.push(`Sheds ${formatKw(d.radiates)}`);
    if (d.storage) out.push(`Stores ${d.storage} kWh`);
    if (d.landing) out.push(`Lands ${fmt.mass(d.landing)}`);
    if (d.reentry) out.push(`Returns ${fmt.mass(d.reentry)}`);
    const k = (d.propellants || []).find(p => p in S4.PROPELLANTS);
    if (k && !d.volume) out.push(`Burns ${S4.PROPELLANTS[k].name.toLowerCase()}`);
    return out;
  }
  const compTip = (c, ...extra) => T(c.name, S4.COMP_KIND_NAMES[c.kind] || c.kind, ...factList(c).map(dl), ...extra);

  function start(parts = [], name = 'New class', role = 'launcher', yard = 'rocket_factory') {
    const d = S4.refill({ parts: [], load: {} }, { id: 'c' + DS.uid++, name, role, yard, parts: parts.map(([component, count]) => ({ component, count })), load: {}, locked: false });
    F().classes.push(d); DS.open = d.id; DS.payload = null;
    return d;
  }
  function setCount(id, n) {
    const d = open(); if (!d || d.locked) return;
    n = Math.max(0, Math.min(99, Math.round(n)));
    const before = { parts: d.parts.map(x => ({ ...x })), load: { ...d.load } };
    const p = d.parts.find(x => x.component === id);
    if (p) p.count = n; else if (n > 0) d.parts.push({ component: id, count: n });
    d.parts = d.parts.filter(x => x.count > 0);
    S4.refill(before, d);
  }
  const countOf = (d, id) => (d ? (d.parts.find(p => p.component === id) || { count: 0 }).count : 0);

  function loadedWith(d, s, payload) {
    const base = s.loaded, mass = s.dryMass + s.propellantMass + payload, scale = mass > 0 ? base.mass / mass : 0, m = s.main;
    const others = m ? s.propellantMass - (s.propellant[m.propellant] || 0) : 0, m1 = s.dryMass + others + payload;
    return { payload, mass, deltaV: m ? S4.dvOf(m.isp, m1 + m.load, m1) : 0, acceleration: base.acceleration * scale, twr: { earth: base.thrustToWeight.earth * scale, moon: base.thrustToWeight.moon * scale, mars: base.thrustToWeight.mars * scale } };
  }

  function primary(s, l) {
    const m = s.main, thrust = m ? m.thrust * m.throttle : 0, engines = m ? m.count : 0, bal = s.power.balance;
    const names = Object.entries(s.propellant).filter(([, kg]) => kg > 0).map(([k]) => S4.PROPELLANTS[k].name.toLowerCase()).join(' and ');
    const heat = s.heat.produced <= 0 ? ['cold', 'no heat made'] : [s.heat.balance < 0 ? 'hot' : 'ok', `sheds ${formatKw(s.heat.radiated)} of ${formatKw(s.heat.produced)}`];
    return [
      ['box', fmt.mass(l.mass), `dry ${fmt.mass(s.dryMass)}`, false, T('Mass', `Hardware ${fmt.mass(s.dryMass)}`, `Propellant ${fmt.mass(s.propellantMass)}`, `Payload ${fmt.mass(l.payload)}`)],
      ['rocket', m ? formatDv(l.deltaV) : '-', m ? `Isp ${Math.round(m.isp)} s` : 'delta-v', false, T('Delta-v', dl('The rocket equation on full tanks with the payload shown.'), m ? '' : '!No drive')],
      ['up', m ? twrText(l.twr.earth) : '-', m ? formatAccel(l.acceleration) : 'thrust to weight', false, T('Thrust to weight', dl('Sea-level thrust against weight on Earth, full tanks.'))],
      ['flame', m ? fmt.thrust(thrust) : '-', `${engines} engine${engines === 1 ? '' : 's'}`, false, T('Thrust', dl('Vacuum thrust of the main drive, throttled to the power left.'))],
      ['people', String(s.crew), `berths ${s.berths}`, s.crew > s.berths, T('Crew', `Needed aboard ${s.crew}`, `Berths ${s.berths}`, s.crew > s.berths ? '!Not enough berths' : '')],
      ['bolt', `${bal < 0 ? '-' : '+'}${formatKw(Math.abs(bal))}`, `makes ${formatKw(s.power.made)}`, bal < 0, T('Power', `Makes ${formatKw(s.power.made)}`, `Systems ${formatKw(s.power.used)}`, `Engines want ${formatKw(s.power.engines)}`)],
      ['drop', fmt.mass(s.propellantMass), names || 'propellant', false, T('Propellant', dl('Loaded in the tanks.'))],
      ['warn', heat[0], heat[1], s.heat.balance < 0, T('Heat', dl('Waste heat against what the radiators and the hull shed.'))]
    ];
  }
  function secondary(s, l) {
    const m = s.main, lifts = ok => (ok ? 'lifts off' : 'too low');
    return [
      ['rocket', m ? formatDv(s.empty.deltaV) : '-', 'delta-v empty', false, T('Delta-v empty', dl('Full tanks, nothing in the bay.'))],
      ['box', s.payloadCapacity ? fmt.mass(s.payloadCapacity) : 'none', 'bay capacity', false, T('Payload', dl('What the cargo bays carry.'))],
      ...['earth', 'moon', 'mars'].map(b => ['up', m ? twrText(l.twr[b]) : '-', `${b[0].toUpperCase()}${b.slice(1)}, ${m ? lifts(s.loaded.liftoff[b]) : 'no drive'}`, false, T(`Thrust to weight on ${b[0].toUpperCase()}${b.slice(1)}`, dl('Lift-off needs 1.2.'))]),
      ['flat', m ? formatAccel(l.acceleration) : '-', 'acceleration', false, T('Acceleration', dl('Thrust over mass at full tanks.'))],
      ['leaf', s.endurance === undefined ? 'no crew' : `${Math.floor(s.endurance)} days`, 'life support', false, T('Life support', dl('How long the stores and recycling keep the crew alive.'))],
      ['yard', s.builtAt.length ? s.builtAt.map(S4.yardName).join(', ') : 'nowhere', 'can be built at', !s.builtAt.length, T('Built at', dl('Yards that can build every part.'))]
    ];
  }
  const stat = ([ic, big, sub, warn, tip]) => `<div class="stat ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;

  let fb = null, cv = null, craft = null, craftKey = '', raf = 0;
  function draw() {
    raf = 0;
    if (S4.screen !== 'designer') return;
    const host = document.querySelector('.shipview');
    if (!host) return;
    if (!cv || !host.contains(cv)) { cv = host.querySelector('canvas'); fb = null; }
    if (!cv) return;
    const w = Math.max(60, Math.floor(host.clientWidth / 2)), h = Math.max(60, Math.floor(host.clientHeight / 2));
    if (!fb || fb.w !== w || fb.h !== h) fb = new FB(cv, w, h, 2, .72);
    fb.makeBg('stars');
    const d = open(), spec = d ? S4.designSpec(d) : null;
    if (spec && !S4.specEmpty(spec)) {
      if (craftKey !== spec.id) { craft = new Craft(spec, PALS.civ, { thr: .55 }); craftKey = spec.id; }
      const sp = shipSprite(spec, 3);
      const S = Math.max(.375, Math.min(6, w * .8 / sp.len, h * .62 / (sp.half * 2)));
      craft.thr = .55 + .1 * Math.sin(FRAME * .1);
      craft.draw(fb, w / 2 + (spec.stern ? 3 * S : 0), h / 2, S);
    }
    FRAME++;
    fb.present();
    raf = requestAnimationFrame(() => setTimeout(draw, 50));
  }
  function ensureLoop() { if (!raf) raf = requestAnimationFrame(draw); }

  function palette(d) {
    const items = S4.catalogue(), editable = !d || !d.locked;
    return S4.COMPONENT_KINDS.map(k => [k, items.filter(c => c.kind === k)]).filter(x => x[1].length).map(([k, cs]) => `<div class="pal-kind">${ci(cs[0].id, 1)}${S4.COMP_KIND_NAMES[k]}</div><div class="grid" style="grid-template-columns:repeat(auto-fill,86px);gap:5px">${cs.map(c => {
      const ok = S4.tagOpen(c.milestone), have = countOf(d, c.id), waits = S4.missingPrerequisites(c.milestone).map(n => S4.mile(n).name);
      const tip = compTip(c, ok ? '' : `!Part of ${S4.mile(c.milestone).name}; needs ${waits.join(' and ')} first`);
      return `<button class="tile cmp ${have ? 'sel' : ''} ${ok ? '' : 'dimmed'}" data-act="add" data-id="${c.id}" ${!ok || !editable ? 'disabled' : ''} data-tip="${esc(tip)}">${have ? `<span class="corner r acc" style="font-size:16px">×${have}</span>` : ok ? '' : `<span class="corner r hot">${gl('lock')}</span>`}${ci(c.id, 2, tip)}<span class="nm"><b>${esc(c.name)}</b></span><span class="st ${ok ? '' : 'dim'}">${ok ? keyFigure(c) : 'locked'}</span></button>`;
    }).join('')}</div>`).join('');
  }

  function classBar(d) {
    const list = F().classes;
    return `<div class="row classes">${list.map(c => `<button class="${d && c.id === d.id ? 'on' : ''}" data-act="pick" data-id="${c.id}">${esc(c.name)}${c.locked ? ' (locked)' : ''}</button>`).join('')}</div>
      <div class="row meta">${d ? `<input id="clsName" maxlength="24" value="${esc(d.name)}" ${d.locked ? 'disabled' : ''} aria-label="Class name">${d.locked ? `<span class="pill">${gl('lock')}locked</span>` : ''}
        <label class="field">Role <select id="clsRole" ${d.locked ? 'disabled' : ''}>${S4.ROLES.map(r => `<option value="${r}" ${r === d.role ? 'selected' : ''}>${S4.ROLE_NAMES[r]}</option>`).join('')}</select></label>
        <label class="field">Built at <select id="clsYard" ${d.locked ? 'disabled' : ''}>${S4.YARDS.map(y => `<option value="${y}" ${y === d.yard ? 'selected' : ''}>${S4.yardName(y)}${S4.tagOpen(D.bld[y].milestone) ? '' : ' (locked)'}</option>`).join('')}</select></label>`
        : '<span class="none">No class open. Click a component or press New.</span>'}</div>`;
  }

  function strip(d, s) {
    if (!d || !s.lines.length) return '<span class="none">Nothing yet. Click a component to add it.</span>';
    return `<div class="strip">${s.lines.map(l => { const c = D.comp[l.component], tip = compTip(c); return `<div class="tile cmp" style="cursor:default" data-tip="${esc(tip)}">${ci(l.component, 2, tip)}<span class="nm"><b>${esc(l.name)}</b></span><span class="cnt"><button data-act="dec" data-id="${l.component}" ${d.locked ? 'disabled' : ''}>${gl('minus')}</button><input type="number" min="0" max="99" value="${l.count}" data-count="${l.component}" ${d.locked ? 'disabled' : ''}><button data-act="inc" data-id="${l.component}" ${d.locked ? 'disabled' : ''}>${gl('plus')}</button></span></div>`; }).join('')}</div>`;
  }

  function loadRows(d, s) {
    const wanted = new Set(s.drives.map(x => x.propellant));
    const rows = d ? Object.entries(s.capacity).filter(([k, room]) => room > 0 && (wanted.has(k) || (d.load[k] || 0) > 0)).map(([k, room]) => ({ k, room, kg: s.propellant[k] || 0 })) : [];
    const cap = s.payloadCapacity, pay = d ? Math.max(0, Math.min(cap, DS.payload ?? cap)) : 0;
    return `${rows.length ? rows.map(r => `<div class="lrow"><span class="lname">${esc(S4.PROPELLANTS[r.k].name)}</span><input type="number" min="0" max="${Math.floor(r.room)}" step="100" value="${Math.round(r.kg)}" data-load="${r.k}" ${d.locked ? 'disabled' : ''}><small>of ${fmt.mass(r.room)}</small><button data-act="fill" data-id="${r.k}" ${d.locked ? 'disabled' : ''}>Fill</button></div>`).join('') : '<p class="none">Nothing to load yet: add an engine and a tank that holds its propellant.</p>'}
      <div class="lrow"><span class="lname">Payload (t)</span><input type="number" id="payload" min="0" max="${cap / 1000}" step="0.5" value="${Math.round(pay) / 1000}" ${!d || cap <= 0 ? 'disabled' : ''}><small>of ${fmt.mass(cap)}</small></div>`;
  }

  function flags(d, s) {
    if (!d) return '<div class="dim">Nothing to check.</div>';
    const out = s.issues.filter(i => i.code !== 'no-parts' || d.parts.length).map(i => `<div class="flag ${i.level === 'error' ? '' : 'w'}">${gl('warn')}<span><b>${i.level === 'error' ? 'Error' : 'Warning'}</b> ${esc(i.text)}</span></div>`);
    if (d.locked) out.push(`<div class="flag ok">${gl('lock')}<span>Locked: it can only be copied.</span></div>`);
    else if (!s.errors && d.parts.length) out.push(`<div class="flag ok">${gl('check')}<span>Flyable: no errors, the class can be locked.</span></div>`);
    return out.join('') || '<div class="dim">Nothing to check.</div>';
  }

  function render() {
    const root = document.getElementById('view');
    const d = open(), s = statsFor(d || { parts: [], load: {}, role: 'launcher', yard: 'rocket_factory' });
    const pay = d ? Math.max(0, Math.min(s.payloadCapacity, DS.payload ?? s.payloadCapacity)) : 0, l = loadedWith(d, s, pay);
    const spec = d ? S4.designSpec(d) : null, sp = spec && !S4.specEmpty(spec) ? shipSprite(spec, 3) : null;
    const size = sp ? `${Math.round(sp.len * 5)} m long, ${Math.round(sp.half * 2 * 5)} m across` : '';
    const costs = Object.entries(s.cost).sort((a, b) => b[1] - a[1]);
    const inUse = d && S4.F.vessels.some(v => v.design === d.id);
    const sc = [...root.querySelectorAll('.pb')].map(e => e.scrollTop);
    const focus = document.activeElement && document.activeElement.id;
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = `<div class="designer">
      <div class="pan grow"><h2>${gl('ship')}Components <small>${d && d.locked ? 'locked' : 'no premade classes'}</small></h2><div class="pb">${palette(d)}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0">
        <div class="pan grow"><h2>${gl('ship')}Drawing <small>${size}</small></h2><div class="shipview" style="flex:1"><canvas></canvas>${d && s.lines.length ? '' : `<div class="ph"><div class="empty" style="background:rgba(20,17,42,.85)">${gl('plus', 'lg')}<div style="margin-top:6px" class="pf">New design</div><div>Click a component to add it. The ship draws itself from what you add.</div></div></div>`}</div></div>
        <div class="pan classpan"><h2>${gl('list')}Class <small>${d ? `${s.lines.reduce((n, x) => n + x.count, 0)} parts` : ''}</small><span style="flex:1"></span><button data-act="new">${gl('plus', 'sm')}New</button><button data-act="copy" ${d ? '' : 'disabled'}>Copy</button><button data-act="lock" ${d && !d.locked && !s.errors ? '' : 'disabled'} data-tip="${d && s.errors && !d.locked ? 'Resolve the errors first' : 'Lock the class'}">${gl('lock', 'sm')}Lock</button><button data-act="del" ${d && !inUse ? '' : 'disabled'} data-tip="${inUse ? 'A fleet is using this class' : 'Delete the class'}">${gl('trash', 'sm')}Delete</button></h2><div class="pb">${classBar(d)}${strip(d, s)}</div></div>
      </div>
      <div class="pan grow"><h2>${gl('gear')}Stats</h2><div class="pb">
        <div class="stats">${primary(s, l).map(stat).join('')}</div>
        <h3 style="margin-top:10px">Propellant and payload</h3>${loadRows(d, s)}
        <h3 style="margin-top:10px">Design</h3><div class="flags">${flags(d, s)}</div>
        <h3 style="margin-top:10px">Build cost</h3><div class="eq">${costs.length ? costs.map(([m, v]) => `<span class="rate" data-tip="${esc(S4.matTip(m) + '\nNeeded ' + fmt.mass(v))}">${mi(m, 2)}<span>${fmt.mass(v)}</span></span>`).join('') : '<span class="dim">Empty.</span>'}</div>
        <h3 style="margin-top:10px">More figures</h3><div class="stats">${secondary(s, l).map(stat).join('')}</div>
      </div></div></div>`;
    [...root.querySelectorAll('.pb')].forEach((e, i) => { if (sc[i]) e.scrollTop = sc[i]; });
    if (focus === 'clsName') { const i = document.getElementById('clsName'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    cv = null; fb = null;
    ensureLoop();
    S4.chipsOnly();
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'designer') return;
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const a = t.dataset.act, id = t.dataset.id, d = open();
    if (a === 'add') { if (!d || d.locked) start([[id, 1]]); else setCount(id, countOf(d, id) + 1); }
    else if (a === 'inc') setCount(id, countOf(d, id) + 1);
    else if (a === 'dec') setCount(id, countOf(d, id) - 1);
    else if (a === 'new') start();
    else if (a === 'copy' && d) { const c = start(d.parts.map(p => [p.component, p.count]), d.name + ' copy', d.role, d.yard); c.load = { ...d.load }; }
    else if (a === 'lock' && d) d.locked = true;
    else if (a === 'del' && d) { F().classes.splice(F().classes.indexOf(d), 1); DS.open = null; }
    else if (a === 'pick') { DS.open = id; DS.payload = null; }
    else if (a === 'fill' && d) { d.load[id] = statsFor(d).capacity[id]; }
    else return;
    render();
  });
  document.addEventListener('input', e => {
    if (S4.screen !== 'designer') return;
    const d = open();
    if (e.target.id === 'clsName' && d) { d.name = e.target.value; const b = document.querySelector(`[data-act=pick][data-id="${d.id}"]`); if (b) b.textContent = d.name; }
  });
  document.addEventListener('change', e => {
    if (S4.screen !== 'designer') return;
    const d = open(); if (!d) return;
    const t = e.target;
    if (t.id === 'clsRole') d.role = t.value;
    else if (t.id === 'clsYard') d.yard = t.value;
    else if (t.dataset.count) setCount(t.dataset.count, +t.value || 0);
    else if (t.dataset.load) { const room = statsFor(d).capacity[t.dataset.load] || 0; d.load[t.dataset.load] = Math.max(0, Math.min(room, +t.value || 0)); }
    else if (t.id === 'payload') DS.payload = Math.max(0, (+t.value || 0) * 1000);
    else return;
    render();
  });

  function ready(n) {
    if (!READY[n]) return;
    const have = F().classes.find(c => c.name === READY[n][0]);
    if (have) { DS.open = have.id; return; }
    const [name, role, yard, parts] = READY[n];
    start(parts, name, role, yard);
  }

  S4.designer = { render, ready, DS, ensureLoop, start, READY };
})();
