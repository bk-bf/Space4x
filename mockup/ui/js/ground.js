'use strict';
(() => {
  const { D, E, fmt, esc, gl, mi, T, dl, meter } = S4;
  const { nm, nm2, kpis, tabs, filters, page, bind } = S4.kit;

  const CHASSIS = [
    { id: 'inf', name: 'Infantry', desc: 'Soldiers on foot: cheap, many slots, little protection.', slots: 6, size: 60, hp: 30, crew: 120, supply: 1, cost: 1, train: 40 },
    { id: 'lveh', name: 'Light vehicle', desc: 'Jeeps and carriers: quick and light.', slots: 4, size: 300, hp: 90, crew: 8, supply: 3, cost: 4, train: 60 },
    { id: 'veh', name: 'Vehicle', desc: 'The main battle tank hull.', slots: 5, size: 900, hp: 220, crew: 6, supply: 6, cost: 8, train: 90 },
    { id: 'hveh', name: 'Heavy vehicle', desc: 'A big hull with room for the biggest guns.', slots: 6, size: 2200, hp: 520, crew: 5, supply: 12, cost: 16, train: 130 },
    { id: 'static', name: 'Static', desc: 'Emplaced guns and bunkers. They do not move.', slots: 8, size: 1200, hp: 400, crew: 40, supply: 2, cost: 5, train: 70 }
  ];
  const ARMOUR = [
    { id: 'none', name: 'None', v: 0, cost: 0, desc: 'No plate at all.' },
    { id: 'ballistic', name: 'Ballistic plate', v: 2, cost: .08, desc: 'Stops rifle fire and shrapnel.' },
    { id: 'composite', name: 'Composite', v: 5, cost: .18, desc: 'Layered plate against cannon rounds.' },
    { id: 'ceramic', name: 'Ceramic', v: 9, cost: .3, desc: 'Hard tiles that shatter missiles.' },
    { id: 'reactive', name: 'Reactive', v: 13, cost: .45, desc: 'Plate that fights back against shaped charges.' }
  ];
  const ALL = ['inf', 'lveh', 'veh', 'hveh', 'static'];
  const WEAPONS = [
    { id: 'rifle', name: 'Rifle squad', desc: 'Rifles and light support weapons for a squad.', dmg: 2, shots: 6, pen: 1, size: 2, slots: 1, on: ['inf', 'lveh', 'static'], role: 'small' },
    { id: 'mg', name: 'Heavy machine gun', desc: 'Pins infantry down.', dmg: 3, shots: 8, pen: 1, size: 4, slots: 1, on: ALL, role: 'small' },
    { id: 'gl', name: 'Grenade launcher', desc: 'Short range, hits groups and light cover.', dmg: 4, shots: 3, pen: 2, size: 5, slots: 1, on: ['inf', 'lveh', 'veh'], role: 'small' },
    { id: 'atgm', name: 'Anti-tank missile', desc: 'One guided missile that can kill a tank.', dmg: 24, shots: 1, pen: 16, size: 6, slots: 1, on: ALL, role: 'avt' },
    { id: 'acan', name: 'Autocannon', desc: 'Rapid cannon for light armour and aircraft.', dmg: 8, shots: 4, pen: 6, size: 12, slots: 1, on: ['lveh', 'veh', 'hveh', 'static'], role: 'avt' },
    { id: 'tgun', name: 'Tank gun', desc: 'Heavy gun for killing armour.', dmg: 30, shots: 1, pen: 24, size: 40, slots: 2, on: ['veh', 'hveh'], role: 'avt' },
    { id: 'mortar', name: 'Mortar', desc: 'Indirect fire from behind cover.', dmg: 10, shots: 2, pen: 2, size: 8, slots: 1, on: ['inf', 'lveh', 'static'], role: 'art' },
    { id: 'how', name: 'Howitzer', desc: 'Long range shells on the enemy line.', dmg: 28, shots: 1, pen: 3, size: 30, slots: 2, on: ['veh', 'hveh', 'static'], role: 'art' },
    { id: 'sam', name: 'SAM launcher', desc: 'Missiles against aircraft and landers.', dmg: 16, shots: 2, pen: 10, size: 14, slots: 1, on: ['lveh', 'veh', 'static'], role: 'aa' },
    { id: 'bunker', name: 'Bunker buster', desc: 'One huge round for fortifications.', dmg: 50, shots: 1, pen: 20, size: 60, slots: 2, on: ['hveh', 'static'], role: 'bb' }
  ];
  const EQUIP = [
    { id: 'radio', name: 'Command radio', desc: 'Lets the unit act as a headquarters.', size: 2, slots: 1, on: ALL, hq: 1 },
    { id: 'medic', name: 'Field medics', desc: 'Cuts losses and speeds recovery.', size: 3, slots: 1, on: ['inf', 'lveh', 'static'], med: 1 },
    { id: 'engineer', name: 'Engineer kit', desc: 'Builds defences and clears mines.', size: 4, slots: 1, on: ['inf', 'lveh', 'veh', 'static'], eng: 1 },
    { id: 'supply', name: 'Supply train', desc: 'Carries ammunition and food for others.', size: 8, slots: 1, on: ['inf', 'lveh', 'veh'], log: 12 },
    { id: 'sensor', name: 'Sensor suite', desc: 'Radar and optics to see the enemy first.', size: 3, slots: 1, on: ['lveh', 'veh', 'hveh', 'static'], sens: 1 }
  ];
  const ITEM = Object.fromEntries([...WEAPONS, ...EQUIP].map(x => [x.id, x]));
  const chassisOf = id => CHASSIS.find(c => c.id === id);
  const armourOf = id => ARMOUR.find(a => a.id === id);

  const DESIGNS = [
    { id: 'hq', name: 'HQ company', chassis: 'inf', armour: 'none', items: { radio: 3, medic: 1, rifle: 1 } },
    { id: 'inf', name: 'Rifle battalion', chassis: 'inf', armour: 'ballistic', items: { rifle: 3, mg: 1, atgm: 1 } },
    { id: 'tank', name: 'Armour', chassis: 'veh', armour: 'composite', items: { tgun: 1, mg: 1, sensor: 1 } },
    { id: 'art', name: 'Artillery', chassis: 'veh', armour: 'none', items: { how: 2, radio: 1 } },
    { id: 'aa', name: 'Air defence', chassis: 'lveh', armour: 'ballistic', items: { sam: 2, radio: 1 } }
  ];
  const dOf = id => DESIGNS.find(d => d.id === id);

  function stats(d) {
    const C = chassisOf(d.chassis), A = armourOf(d.armour), it = Object.entries(d.items).filter(([, n]) => n > 0).map(([id, n]) => [ITEM[id], n]);
    const used = it.reduce((a, [x, n]) => a + x.slots * n, 0), weapons = it.filter(([x]) => x.dmg);
    const size = (C.size + it.reduce((a, [x, n]) => a + x.size * n, 0)) * (1 + A.v * .03);
    const hp = Math.round(C.hp * (1 + A.v * .08)), attack = Math.round(weapons.reduce((a, [x, n]) => a + x.dmg * x.shots * n, 0) / 4);
    const pen = Math.max(0, ...weapons.map(([x]) => x.pen)), crew = C.crew + it.reduce((a, [x, n]) => a + (x.id === 'medic' ? 4 * n : 0), 0);
    const supply = +(C.supply * (1 + .12 * weapons.reduce((a, [, n]) => a + n, 0))).toFixed(1), cap = it.reduce((a, [x, n]) => a + (x.log || 0) * n, 0);
    const kg = size * 1000, cost = { stainless_steel: Math.round(kg * .35 * (1 + A.cost)), aluminium: Math.round(kg * .08) };
    if (A.v >= 5) cost.nickel_superalloy = Math.round(kg * .02 * A.v / 5);
    if (it.some(([x]) => x.hq || x.sens)) cost.copper = Math.round(kg * .015);
    const errors = [], warns = [];
    if (used > C.slots) errors.push(`${used} slots used and the ${C.name.toLowerCase()} has ${C.slots}`);
    if (!it.length) errors.push('Nothing is fitted');
    else if (!weapons.length && !it.some(([x]) => x.hq || x.log)) errors.push('Nothing to fight with, command or carry');
    if (!d.name.trim()) errors.push('The class needs a name');
    if (A.v === 0 && d.chassis !== 'inf') warns.push('A vehicle with no armour dies to the first rifle');
    if (weapons.length && !weapons.some(([x]) => x.role === 'avt' || x.role === 'bb') && d.chassis !== 'inf') warns.push('Cannot hurt armour');
    if (it.some(([x]) => x.hq) && d.chassis === 'inf' && weapons.length > 2) warns.push('A headquarters with that many guns is a target');
    return { C, A, used, size, hp, defence: Math.round(hp / 8 + A.v * 2), attack, pen, crew, supply, cap, cost, errors, warns, train: C.train, weapons: weapons.length };
  }
  const iconOf = d => {
    const ids = Object.keys(d.items).filter(k => d.items[k] > 0), roles = ids.map(i => ITEM[i].role);
    if (d.chassis === 'inf') return ids.length && ids.every(i => ITEM[i].hq || ITEM[i].med) ? 'hq' : 'inf';
    if (d.chassis === 'lveh') return roles.includes('aa') ? 'aa' : 'lveh';
    if (d.chassis === 'veh') return roles.includes('art') && !roles.includes('avt') ? 'art' : 'tank';
    if (d.chassis === 'hveh') return 'hveh';
    return roles.includes('aa') ? 'aa' : roles.includes('art') ? 'art' : 'bunker';
  };
  const uiOf = (d, s = 2, tip) => S4.ui(iconOf(d), s, tip || '');

  const STANCES = [['Dug in', .45, 'Holds and builds defences.'], ['Advance', 1.4, 'Pushes forward and burns the most supply.'], ['Reserve', .3, 'Rests behind the line.'], ['Support', .5, 'Fires or covers from the rear.']];
  const FORMS = [
    { id: 'home', name: 'Home guard', place: 'Earth', cmd: 'Col. A. Okafor', units: { hq: [1, 'Dug in', 100, 92, 80], inf: [6, 'Dug in', 94, 88, 76], tank: [3, 'Reserve', 81, 90, 62], art: [2, 'Support', 100, 85, 70], aa: [1, 'Support', 100, 79, 74] } },
    { id: 'capital', name: 'Capital guard', place: 'Earth', cmd: 'Gen. R. Lindqvist', units: { hq: [1, 'Dug in', 100, 90, 96], inf: [3, 'Dug in', 97, 91, 94], tank: [1, 'Reserve', 99, 93, 92] } },
    { id: 'port', name: 'Spaceport guard', place: 'Earth', cmd: 'Maj. J. Haddad', units: { hq: [1, 'Dug in', 100, 88, 90], inf: [2, 'Dug in', 98, 86, 84], aa: [1, 'Dug in', 100, 84, 88] } }
  ];
  const TEMPLATES = [
    { id: 't1', name: 'Rifle brigade', el: { hq: 1, inf: 4, art: 1 } },
    { id: 't2', name: 'Armoured regiment', el: { hq: 1, tank: 6, inf: 1, aa: 1 } },
    { id: 't3', name: 'Garrison company', el: { hq: 1, inf: 2 } },
    { id: 't4', name: 'Air defence battery', el: { hq: 1, aa: 4 } }
  ];
  const QUEUE = [{ id: 1, tpl: 't3', done: .46, paused: false }, { id: 2, tpl: 't1', done: .08, paused: false }];
  const FACILITIES = 4;
  const GS = { tab: 'formations', form: 'home', unit: 'inf', tpl: 't1', qsel: 1, draft: null, ctab: 'all', qid: 3, fid: 10, did: 10 };
  const formOf = id => FORMS.find(f => f.id === id), tplOf = id => TEMPLATES.find(t => t.id === id);
  const tot = f => Object.values(f.units).reduce((a, u) => a + u[0], 0);
  const men = f => Object.entries(f.units).reduce((a, [k, u]) => a + u[0] * stats(dOf(k)).crew, 0);
  const avg = (f, i) => { const n = tot(f); return n ? Object.values(f.units).reduce((a, u) => a + u[0] * u[i], 0) / n / 100 : 0; };
  const tplStats = t => { const r = { units: 0, men: 0, attack: 0, hp: 0, size: 0, cost: {}, days: 0 }; for (const [k, n] of Object.entries(t.el)) { const s = stats(dOf(k)); r.units += n; r.men += s.crew * n; r.attack += s.attack * n; r.hp += s.hp * n; r.size += s.size * n; r.days = Math.max(r.days, s.train); for (const [m, v] of Object.entries(s.cost)) r.cost[m] = (r.cost[m] || 0) + v * n; } r.days = Math.round(r.days * .6 + r.units * 1.5); return r; };

  const have = (cost, qty = 1) => `<div class="eq">${Object.entries(cost).sort((a, b) => b[1] - a[1]).map(([m, v]) => { const h = E.stock[m] || 0, n = v * qty, ok = h >= n; return `<span class="have ${ok ? 'ok' : 'short'}" data-tip="${esc(S4.matTip(m) + `\nNeed ${fmt.cargo(m, n)}, have ${fmt.cargo(m, h)}`)}">${mi(m, 2)}<span>${fmt.cargo(m, h)}</span><span class="need">/ ${fmt.cargo(m, n)}</span></span>`; }).join('')}</div>`;
  const line = (ic, l, v) => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v">${v}</span></div>`;
  const bar3 = (u, low) => `<span class="bars3"><i class="a" style="width:${u[2]}%"></i><i class="c" style="width:${u[3]}%"></i><i class="${low ? 'h' : 'c'}" style="width:${u[4]}%"></i></span>`;

  function unitTile(k, f, sel) {
    const u = f.units[k], d = dOf(k), s = stats(d), low = u[4] < 70;
    const tip = T(d.name, dl(`${s.C.name}, ${s.A.name.toLowerCase()} armour.`), `${u[0]} in ${f.name}`, `Strength ${u[2]}%, morale ${u[3]}%, supply ${u[4]}%`, `Stance: ${u[1]}`);
    return `<button class="tile prod ${sel ? 'sel' : ''} ${low ? 'warn' : ''}" data-act="gunit" data-id="${k}" data-tip="${esc(tip)}"><span class="corner">${u[1]}</span><span class="art2" style="margin-top:8px">${uiOf(d, 2, tip)}</span>${nm(d.name)}<span class="foot"><span class="n">x${u[0]}</span>${bar3(u, low)}</span></button>`;
  }
  function formTile(f) {
    const tip = T(f.name, dl(`Stationed on ${f.place}, commanded by ${f.cmd}.`), `${tot(f)} units, ${fmt.group(men(f))} men`, `Morale ${fmt.pct(avg(f, 3))}, supply ${fmt.pct(avg(f, 4))}`);
    return `<button class="tile q ${GS.form === f.id ? 'sel' : ''}" data-act="gform" data-id="${f.id}" data-tip="${esc(tip)}"><span class="art" style="height:36px;display:flex;align-items:center">${S4.fmi(2, tip)}</span>${nm2(f.name, f.place)}${meter(avg(f, 2), '', 'full')}<span class="dim" style="font-size:15px">${tot(f)} units, ${fmt.group(men(f))} men</span></button>`;
  }
  function statCard(d, head) {
    const s = stats(d);
    return `<div class="flow">${line('people', 'Men', fmt.group(s.crew))}${line('flame', 'Attack', s.attack)}${line('rocket', 'Armour piercing', s.pen)}${line('lock', 'Hit points', s.hp)}${line('star', 'Defence', s.defence)}${line('box', 'Supply use', s.supply + ' a day')}${s.cap ? line('plus', 'Supply carried', s.cap) : ''}${line('rocket', 'Transport size', fmt.mass(s.size * 1000))}${line('clock', 'Training', s.train + ' days')}</div>`;
  }
  function unitCard(f) {
    const k = f.units[GS.unit] ? GS.unit : Object.keys(f.units)[0], u = f.units[k], d = dOf(k), s = stats(d);
    const m = (l, v, c) => `<div class="fr"><span class="nm">${l}</span><span class="v" style="min-width:130px;display:flex;gap:6px;align-items:center">${meter(v / 100, c, '')}${v}%</span></div>`;
    return `<div class="card"><header>${uiOf(d, 3)}<div><div class="t">${esc(d.name)}</div><div class="s">${f.name}, ${u[0]} here</div></div></header><div class="cb">
      <div class="dim" style="font-size:16px">${s.C.name}, ${s.A.name.toLowerCase()} armour, ${Object.entries(d.items).filter(([, n]) => n).map(([i, n]) => `${n} ${ITEM[i].name.toLowerCase()}`).join(', ')}.</div>
      ${statCard(d)}<div class="flow">${m('Strength', u[2], '')}${m('Morale', u[3], 'cool')}${m('Supply', u[4], u[4] < 70 ? 'hot' : 'cool')}</div>
      <div><span class="lbl">Stance</span><div class="btns">${STANCES.map(([n, , t]) => `<button class="${u[1] === n ? 'on' : ''}" data-act="gstance" data-id="${n}" data-tip="${esc(T(n, dl(t)))}">${n}</button>`).join('')}</div></div></div></div>`;
  }

  const draft = () => GS.draft || (GS.draft = { id: null, name: '', chassis: 'inf', armour: 'none', items: {} });
  function paletteTile(x, d, kind) {
    const ok = x.on.includes(d.chassis), n = d.items[x.id] || 0, S = stats(d), room = S.C.slots - S.used >= x.slots;
    const sub = x.dmg ? `${x.dmg}x${x.shots}` : 'kit';
    const tip = T(x.name, dl(x.desc), x.dmg ? `Damage ${x.dmg}, ${x.shots} shots, pierces ${x.pen}` : '', `Size ${x.size} t, ${x.slots} slot${x.slots > 1 ? 's' : ''}`, ok ? (room ? '' : '!No room left') : '!Cannot be fitted to this chassis');
    return `<button class="tile cmp ${n ? 'sel' : ''} ${ok ? '' : 'dimmed'}" ${ok && room ? '' : 'disabled'} data-act="dadd" data-id="${x.id}" data-tip="${esc(tip)}">${n ? `<span class="corner r acc" style="font-size:16px">x${n}</span>` : ''}<span class="art" style="height:36px;display:flex;align-items:center;color:var(--accent)">${gl(x.dmg ? (x.role === 'aa' ? 'rocket' : x.role === 'art' ? 'flame' : 'cross') : kind === 'eq' ? 'gear' : 'box', 'lg')}</span><span class="nm"><b>${esc(x.name)}</b></span><span class="st dim">${sub}</span></button>`;
  }
  const flagsHtml = S => [...S.errors.map(e => `<div class="flag">${gl('warn')}<span>${esc(e)}</span></div>`), ...S.warns.map(e => `<div class="flag w">${gl('warn')}<span>${esc(e)}</span></div>`)].join('') || `<div class="flag ok">${gl('check')}<span>Ready to train</span></div>`;
  function designer() {
    const d = draft(), S = stats(d);
    const cls = DESIGNS.map(c => `<button class="tile q ${d.id === c.id ? 'sel' : ''}" style="width:104px;height:84px" data-act="dload" data-id="${c.id}" data-tip="${esc(T(c.name, dl(chassisOf(c.chassis).name)))}"><span class="art" style="height:34px;display:flex;align-items:center">${uiOf(c, 2)}</span>${nm(c.name)}</button>`).join('') + `<button class="tile q" style="width:104px;height:84px;--ec:var(--accent)" data-act="dnew"><span class="art" style="height:34px;display:flex;align-items:center;color:var(--accent)">${gl('plus', 'lg')}</span>${nm('New class')}</button>`;
    const chas = CHASSIS.map(c => `<button class="tile cmp ${d.chassis === c.id ? 'sel' : ''}" data-act="dchassis" data-id="${c.id}" data-tip="${esc(T(c.name, dl(c.desc), `${c.slots} slots, ${c.hp} hit points, ${c.size} t base`, `${c.crew} men, training ${c.train} days`))}"><span class="art" style="height:36px;display:flex;align-items:center">${S4.ui(c.id === 'inf' ? 'inf' : c.id === 'lveh' ? 'lveh' : c.id === 'veh' ? 'tank' : c.id === 'hveh' ? 'hveh' : 'bunker', 2)}</span><span class="nm"><b>${c.name}</b></span><span class="st dim">${c.slots} slots</span></button>`).join('');
    const arm = ARMOUR.map(a => `<button class="tile cmp ${d.armour === a.id ? 'sel' : ''}" style="height:70px" data-act="darmour" data-id="${a.id}" data-tip="${esc(T(a.name, dl(a.desc), `Armour value ${a.v}`, `Mass +${a.v * 3}%, cost +${Math.round(a.cost * 100)}%`))}"><span class="art" style="height:28px;display:flex;align-items:center;color:var(--cool)">${gl('lock', 'lg')}</span><span class="nm" style="height:22px"><b>${a.name}</b></span><span class="st dim">${a.v}</span></button>`).join('');
    const strip = Object.entries(d.items).filter(([, n]) => n > 0).map(([id, n]) => { const x = ITEM[id]; return `<div class="tile cmp" style="cursor:default" data-tip="${esc(T(x.name, dl(x.desc)))}"><span class="art" style="height:30px;display:flex;align-items:center;color:var(--accent)">${gl(x.dmg ? 'cross' : 'gear', 'lg')}</span><span class="nm"><b>${esc(x.name)}</b></span><span class="cnt"><button data-act="ddec" data-id="${id}">${gl('minus')}</button><span class="num">${n}</span><button data-act="dadd" data-id="${id}">${gl('plus')}</button></span></div>`; }).join('');
    const flags = flagsHtml(S);
    const main = `<div class="main"><h3>${gl('list', 'sm')}Classes <small class="dim">${DESIGNS.length}</small></h3><div class="grid m" style="grid-template-columns:repeat(auto-fill,104px);margin-bottom:6px">${cls}</div>
      <h3>${gl('tank', 'sm')}Chassis</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,86px)">${chas}</div>
      <h3>${gl('lock', 'sm')}Armour</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,86px)">${arm}</div>
      <h3>${gl('flame', 'sm')}Weapons</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,86px)">${WEAPONS.map(x => paletteTile(x, d, 'w')).join('')}</div>
      <h3>${gl('gear', 'sm')}Equipment</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,86px)">${EQUIP.map(x => paletteTile(x, d, 'eq')).join('')}</div></div>`;
    const side = `<div class="side"><div class="card"><header><input class="namein" id="dname" placeholder="Name the class" value="${esc(d.name)}"></header><div class="cb">
      <div style="background:var(--bg);padding:8px;display:flex;justify-content:center">${uiOf(d, 5)}</div>
      <div class="dim" style="font-size:16px">${S.C.name}, ${S.A.name.toLowerCase()} armour, ${S.used} of ${S.C.slots} slots used</div>
      <div class="strip">${strip || '<span class="dim">Click a weapon or equipment tile to fit it.</span>'}</div>
      ${statCard(d)}<div class="flags">${flags}</div>
      <div><span class="lbl">Cost for one</span>${have(S.cost)}</div>
      <div class="btns"><button data-act="dsave" ${S.errors.length ? 'disabled' : ''}>${gl('check')}Save class</button><button data-act="dnew">${gl('plus')}New</button>${d.id && !['hq', 'inf', 'tank', 'art', 'aa'].includes(d.id) ? `<button data-act="ddel">${gl('trash')}Delete</button>` : ''}</div></div></div></div>`;
    return main + side;
  }

  function templates() {
    const t = tplOf(GS.tpl) || TEMPLATES[0], S = tplStats(t);
    const tt = TEMPLATES.map(x => { const s = tplStats(x); return `<button class="tile q ${GS.tpl === x.id ? 'sel' : ''}" data-act="ttpl" data-id="${x.id}" data-tip="${esc(T(x.name, dl(`${s.units} units, ${fmt.group(s.men)} men`), `Train in about ${s.days} days`))}"><span class="art" style="height:36px;display:flex;align-items:center">${S4.fmi(2)}</span>${nm(x.name)}<span class="dim" style="font-size:15px">${s.units} units, ${fmt.group(s.men)} men</span></button>`; }).join('') + `<button class="tile q" style="--ec:var(--accent)" data-act="tnew"><span class="art" style="height:36px;display:flex;align-items:center;color:var(--accent)">${gl('plus', 'lg')}</span>${nm('New template')}</button>`;
    const el = Object.entries(t.el).filter(([, n]) => n > 0).map(([k, n]) => { const d = dOf(k); return `<div class="tile cmp" style="cursor:default" data-tip="${esc(T(d.name, dl(stats(d).C.name)))}"><span class="art" style="height:36px;display:flex;align-items:center">${uiOf(d, 2)}</span><span class="nm"><b>${esc(d.name)}</b></span><span class="cnt"><button data-act="tdec" data-id="${k}">${gl('minus')}</button><span class="num">${n}</span><button data-act="tinc" data-id="${k}">${gl('plus')}</button></span></div>`; }).join('');
    const pal = DESIGNS.map(d => `<button class="tile cmp" data-act="tinc" data-id="${d.id}" data-tip="${esc(T(d.name, dl('Add one to the template.')))}"><span class="art" style="height:36px;display:flex;align-items:center">${uiOf(d, 2)}</span><span class="nm"><b>${esc(d.name)}</b></span></button>`).join('');
    return `<div class="main"><h3>${gl('tank', 'sm')}Formation templates <small class="dim">${TEMPLATES.length}</small></h3><div class="grid m" style="grid-template-columns:repeat(auto-fill,120px);margin-bottom:6px">${tt}</div>
      <h3>${gl('list', 'sm')}${esc(t.name)} <small class="dim">units in the template</small></h3><div class="strip" style="margin-bottom:6px;min-height:0">${el || '<span class="dim">Empty. Add classes below.</span>'}</div>
      <h3>${gl('plus', 'sm')}Add a class</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,86px)">${pal}</div></div>
      <div class="side"><div class="card"><header>${S4.fmi(2)}<div style="flex:1"><input class="namein" id="tname" value="${esc(t.name)}"></div></header><div class="cb">
        <div class="flow">${line('tank', 'Units', S.units)}${line('people', 'Men', fmt.group(S.men))}${line('flame', 'Attack', S.attack)}${line('lock', 'Hit points', fmt.group(S.hp))}${line('rocket', 'Transport size', fmt.mass(S.size * 1000))}${line('clock', 'Training', S.days + ' days')}</div>
        <div><span class="lbl">Cost to train</span>${have(S.cost)}</div>
        <div class="btns"><button data-act="ttrain" ${S.units ? '' : 'disabled'}>${gl('plus')}Train one</button>${TEMPLATES.length > 1 ? `<button data-act="tdel">${gl('trash')}Delete</button>` : ''}</div></div></div></div>`;
  }

  const active = () => QUEUE.filter(o => !o.paused).slice(0, FACILITIES);
  function qTile(o) {
    const t = tplOf(o.tpl), S = tplStats(t), act = active().includes(o), left = Math.ceil((1 - o.done) * S.days);
    const tip = T(t.name, dl(`${S.units} units, ${fmt.group(S.men)} men`), o.paused ? '~Paused' : act ? `${left} days left` : '~Waiting for a facility');
    return `<button class="tile q ${GS.qsel === o.id ? 'sel' : ''} ${o.paused ? 'idle' : ''}" data-act="qsel" data-id="${o.id}" data-tip="${esc(tip)}"><span class="corner">${QUEUE.indexOf(o) + 1}</span><span class="corner r ${act ? 'acc' : 'dim'}">${gl(o.paused ? 'pause' : act ? 'hammer' : 'clock')}</span><span class="art" style="height:36px;display:flex;align-items:center">${S4.fmi(2)}</span>${nm(t.name)}${meter(o.done, act ? '' : 'cool', 'full')}<span class="dim" style="font-size:15px">${act ? left + ' d left' : o.paused ? 'paused' : 'waiting'}</span></button>`;
  }
  function training() {
    const o = QUEUE.find(x => x.id === GS.qsel), t = o ? tplOf(o.tpl) : null, S = t ? tplStats(t) : null, i = QUEUE.indexOf(o);
    const ready = TEMPLATES.map(x => { const s = tplStats(x); return `<button class="tile bld" data-act="tqueue" data-id="${x.id}" data-tip="${esc(T(x.name, dl('Queue one at the training facilities.'), `${s.units} units, ${s.days} days`))}"><span class="art">${S4.fmi(2)}</span>${nm(x.name)}<span class="costs">${Object.keys(s.cost).slice(0, 3).map(m => mi(m, 1)).join('')}</span></button>`; }).join('');
    return `<div class="main"><h3>${gl('hammer', 'sm')}Training queue <small class="dim">${active().length} of ${FACILITIES} facilities busy</small></h3>${QUEUE.length ? `<div class="grid m" style="grid-template-columns:repeat(auto-fill,120px);margin-bottom:6px">${QUEUE.map(qTile).join('')}</div>` : '<p class="none">Nothing is in training. Queue a template below.</p>'}
      <h3>${gl('plus', 'sm')}Queue a template</h3><div class="grid">${ready}</div></div>
      <div class="side">${o ? `<div class="card"><header>${S4.fmi(2)}<div><div class="t">${esc(t.name)}</div><div class="s">order ${i + 1}, ${o.paused ? 'paused' : active().includes(o) ? 'training' : 'waiting for a facility'}</div></div></header><div class="cb">
        <div class="row">${meter(o.done, '', 'thick')}<span style="min-width:34px;text-align:right">${fmt.pct(o.done)}</span></div>
        <div class="flow">${line('tank', 'Units', S.units)}${line('people', 'Men', fmt.group(S.men))}${line('clock', 'Left', Math.ceil((1 - o.done) * S.days) + ' days')}</div>
        <div><span class="lbl">Cost, spent as they train</span>${have(S.cost)}</div>
        <div class="btns"><button data-act="qup" ${i <= 0 ? 'disabled' : ''}>${gl('up')}Up</button><button data-act="qdown" ${i >= QUEUE.length - 1 ? 'disabled' : ''}>${gl('down')}Down</button><button data-act="qpause">${gl(o.paused ? 'play' : 'pause')}${o.paused ? 'Resume' : 'Pause'}</button><button data-act="qrem">${gl('trash')}Remove</button></div></div></div>` : '<div class="card"><div class="cb"><p class="none">Select an order.</p></div></div>'}</div>`;
  }

  function render() {
    const all = FORMS.reduce((a, f) => a + tot(f), 0), allMen = FORMS.reduce((a, f) => a + men(f), 0);
    const mor = FORMS.reduce((a, f) => a + avg(f, 3) * tot(f), 0) / all, sup = FORMS.reduce((a, f) => a + avg(f, 4) * tot(f), 0) / all;
    const kpi = kpis([['tank', String(all), `units in ${FORMS.length} formations`, false, T('Units', dl('Every ground unit you own.'))], ['people', fmt.group(allMen), 'men under arms', false, T('Men')], ['star', fmt.pct(mor), 'average morale', mor < .7, T('Morale')], ['box', fmt.pct(sup), 'average supply', sup < .7, T('Supply', dl('Units with low supply fight worse and lose morale.'))], ['hammer', `${active().length} of ${FACILITIES}`, 'training facilities busy', false, T('Training facilities', dl('Each one trains one formation at a time. Mock figure.'))]]);
    let body;
    if (GS.tab === 'formations') {
      const f = formOf(GS.form), kinds = Object.keys(f.units);
      if (!f.units[GS.unit]) GS.unit = kinds[0];
      body = `<div class="main"><h3>${gl('tank', 'sm')}Formations <small class="dim">${FORMS.length}, all on Earth</small></h3><div class="grid m" style="grid-template-columns:repeat(auto-fill,120px);margin-bottom:6px">${FORMS.map(formTile).join('')}</div>
        <h3>${gl('list', 'sm')}${f.name} <small class="dim">commanded by ${f.cmd}</small></h3><div class="grid">${kinds.map(k => unitTile(k, f, GS.unit === k)).join('')}</div>
        <div class="tkey" style="margin-top:10px"><span><b class="acc">bars</b> strength, morale, supply</span><span><i style="width:18px;height:12px;display:inline-block;box-shadow:0 0 0 2px var(--hot)"></i>supply under 70%</span></div></div><div class="side">${unitCard(f)}</div>`;
    } else if (GS.tab === 'designer') body = designer();
    else if (GS.tab === 'templates') body = templates();
    else body = training();
    page({ icon: 'tank', title: 'Ground forces', small: 'formations, unit classes and training', kpi, tabsHtml: tabs([['formations', 'Formations', 'tank'], ['designer', 'Unit classes', 'wrench'], ['templates', 'Templates', 'list'], ['training', 'Training', 'hammer']], GS.tab), body });
  }

  const newFormation = t => {
    const f = { id: 'f' + GS.fid++, name: t.name + ' ' + (FORMS.filter(x => x.name.startsWith(t.name)).length + 1), place: 'Earth', cmd: 'unassigned', units: {} };
    for (const [k, n] of Object.entries(t.el)) if (n > 0) f.units[k] = [n, 'Reserve', 100, 75, 85];
    FORMS.push(f); GS.form = f.id;
  };
  S4.groundAdvance = dt => {
    for (const o of active()) { const t = tplOf(o.tpl); o.done = Math.min(1, o.done + dt / 86400 / tplStats(t).days); }
    for (const o of QUEUE.filter(x => x.done >= 1)) newFormation(tplOf(o.tpl));
    for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].done >= 1) QUEUE.splice(i, 1);
  };

  bind('ground', GS, render, {
    gform: id => { GS.form = id; },
    gunit: id => { GS.unit = id; },
    gstance: id => { const f = formOf(GS.form); if (f.units[GS.unit]) f.units[GS.unit][1] = id; },
    dload: id => { const c = dOf(id); GS.draft = { id: c.id, name: c.name, chassis: c.chassis, armour: c.armour, items: { ...c.items } }; },
    dnew: () => { GS.draft = null; },
    dchassis: id => { const d = draft(); d.chassis = id; for (const k of Object.keys(d.items)) if (!ITEM[k].on.includes(id)) delete d.items[k]; },
    darmour: id => { draft().armour = id; },
    dadd: id => { const d = draft(), S = stats(d); if (ITEM[id].on.includes(d.chassis) && S.C.slots - S.used >= ITEM[id].slots) d.items[id] = (d.items[id] || 0) + 1; },
    ddec: id => { const d = draft(); if (d.items[id]) { d.items[id]--; if (!d.items[id]) delete d.items[id]; } },
    dsave: () => { const d = draft(), c = { id: d.id || 'c' + GS.did++, name: d.name.trim(), chassis: d.chassis, armour: d.armour, items: { ...d.items } }; const i = DESIGNS.findIndex(x => x.id === c.id); if (i >= 0) DESIGNS[i] = c; else DESIGNS.push(c); d.id = c.id; },
    ddel: () => { const d = draft(), i = DESIGNS.findIndex(x => x.id === d.id); const used = FORMS.some(f => f.units[d.id]) || TEMPLATES.some(t => t.el[d.id]); if (i >= 0 && !used) { DESIGNS.splice(i, 1); GS.draft = null; } },
    ttpl: id => { GS.tpl = id; },
    tnew: () => { const t = { id: 't' + GS.did++, name: 'New template', el: {} }; TEMPLATES.push(t); GS.tpl = t.id; },
    tinc: id => { const t = tplOf(GS.tpl); t.el[id] = (t.el[id] || 0) + 1; },
    tdec: id => { const t = tplOf(GS.tpl); if (t.el[id]) { t.el[id]--; if (!t.el[id]) delete t.el[id]; } },
    tdel: () => { if (TEMPLATES.length > 1) { const i = TEMPLATES.findIndex(x => x.id === GS.tpl); TEMPLATES.splice(i, 1); GS.tpl = TEMPLATES[0].id; } },
    ttrain: () => { const o = { id: GS.qid++, tpl: GS.tpl, done: 0, paused: false }; QUEUE.push(o); GS.qsel = o.id; GS.tab = 'training'; },
    tqueue: id => { const o = { id: GS.qid++, tpl: id, done: 0, paused: false }; QUEUE.push(o); GS.qsel = o.id; },
    qsel: id => { GS.qsel = +id; },
    qup: () => { const i = QUEUE.findIndex(o => o.id === GS.qsel); if (i > 0) [QUEUE[i - 1], QUEUE[i]] = [QUEUE[i], QUEUE[i - 1]]; },
    qdown: () => { const i = QUEUE.findIndex(o => o.id === GS.qsel); if (i >= 0 && i < QUEUE.length - 1) [QUEUE[i + 1], QUEUE[i]] = [QUEUE[i], QUEUE[i + 1]]; },
    qpause: () => { const o = QUEUE.find(x => x.id === GS.qsel); if (o) o.paused = !o.paused; },
    qrem: () => { const i = QUEUE.findIndex(o => o.id === GS.qsel); if (i >= 0) { QUEUE.splice(i, 1); GS.qsel = QUEUE[0] ? QUEUE[0].id : null; } }
  });
  document.addEventListener('input', e => {
    if (S4.screen !== 'ground') return;
    if (e.target.id === 'dname') { const d = draft(); d.name = e.target.value; const S = stats(d), f = document.querySelector('.flags'), b = document.querySelector('[data-act=dsave]'); if (f) f.innerHTML = flagsHtml(S); if (b) b.disabled = S.errors.length > 0; }
    if (e.target.id === 'tname') { const t = tplOf(GS.tpl); if (t) t.name = e.target.value; }
  });
  S4.ground = { render, GS, total: () => FORMS.reduce((a, f) => a + tot(f), 0), count: () => FORMS.length };
})();
