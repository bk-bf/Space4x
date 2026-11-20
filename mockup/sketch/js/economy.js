'use strict';
(() => {
  const { D, E, fmt, esc, gl, mi, bi, ci, T, dl, meter, short } = S4;
  const P = () => S4.perOf();
  const here = () => S4.site();
  const nm2 = (a, b) => `<span class="nm two"><b>${esc(a)}</b><em>${esc(b)}</em></span>`;
  const nm = t => `<span class="nm"><b>${esc(t)}</b></span>`;
  const pill = (ic, text, tone = '', tip = '') => `<span class="pill ${tone}" ${tip ? `data-tip="${esc(tip)}"` : ''}>${ic ? gl(ic) : ''}${esc(text)}</span>`;
  const ES = {
    tab: 'summary', group: 12, kind: 'all', order: null, pick: 'farmland', side: 'pick', cat: 'all', mat: 'iron', qty: 1, target: null, bkind: 'all', num: 1, empty: false,
    yardOrder: null, yardPick: 'booster', yardQty: 1, stages: [], payload: 'none', cargoMat: 'stainless_steel', cargoKg: 1000, cargo: {}, payloadShip: null,
    vessel: 'v4', vkind: 'all', orderType: 'load', orderRow: 0, profile: 'cheapest', tripGroup: 'Sites', tripTo: 'orbit-earth', planned: null, supplyMat: null, supplyShip: null, supplyKg: 0
  };
  const TABS = [['summary', 'Summary', 'list'], ['production', 'Production', 'factory'], ['construction', 'Construction', 'hammer'], ['stockpiles', 'Stockpiles', 'box'], ['people', 'People', 'people'], ['yard', 'Shipyard', 'yard'], ['launch', 'Launch', 'rocket'], ['ships', 'Ships', 'ship'], ['supply', 'Supply', 'flame']];
  const kc = k => { const c = S4.KIND[k] || [150, 150, 180]; return `rgb(${c.join(',')})`; };
  const FACTS = { earth: ['1.00 g', 'Breathable', '15 °C'], luna: ['0.16 g', 'None', '-23 °C'] };

  const PLANETS = {};
  function planet(world) {
    if (PLANETS[world]) return PLANETS[world];
    const W = 120, im = new S4.Img(W, W), c = (W - 1) / 2, r = W / 2 - 2, moon = world === 'luna';
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const dx = (x - c) / r, dy = (y - c) / r, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const z = Math.sqrt(1 - d * d), a = Math.atan2(dx, z) + .6, b = Math.asin(dy);
      const px = Math.cos(b) * Math.sin(a), py = Math.sin(b), pz = Math.cos(b) * Math.cos(a);
      const n = fbm(px * 2.2 + 5, py * 2.2 + 2, pz * 2.2 + 1, 5), cl = fbm(px * 3.4 + 9, py * 5 + 4, pz * 3.4, 4);
      let col;
      if (moon) {
        const cr = fbm(px * 7 + 3, py * 7 + 8, pz * 7 + 2, 3);
        col = n > .56 ? [96, 94, 104] : n > .5 ? [128, 126, 132] : [158, 156, 160];
        if (cr > .62) col = col.map(v => v * .78);
        if (cr < .34) col = col.map(v => Math.min(255, v * 1.12));
      } else {
        if (Math.abs(py) > .86 + (n - .5) * .2) col = [232, 240, 250];
        else if (n > .53) col = n > .64 ? [150, 140, 96] : n > .58 ? [84, 150, 82] : [66, 130, 76];
        else col = n > .47 ? [52, 108, 190] : [34, 78, 160];
        if (cl > .6 + (dith(x, y) - .5) * .12) col = cl > .68 ? [244, 246, 252] : [214, 224, 242];
      }
      const light = (-dx * .6 - dy * .5) + z * .55 + .05;
      const f = light > .75 ? 1.12 : light > .45 ? 1 : light > .22 ? .78 : light > .05 ? .56 : .36;
      const dd = dith(x, y) - .5;
      const ff = f + (Math.abs(f - .78) < .001 || Math.abs(f - .56) < .001 ? dd * .1 : 0);
      im.set(x, y, col.map(v => Math.max(0, Math.min(255, v * ff))));
      if (!moon && d > .95) im.set(x, y, [120, 170, 255].map((v, i) => v * (.3 + .5 * Math.max(0, light)) + col[i] * .3));
    }
    return PLANETS[world] = im.url();
  }

  const mainOut = a => { if (!a.p) return null; const e = Object.entries(a.p.outputs).sort((x, y) => y[1] - x[1])[0]; return e ? e[0] : null; };
  const gname = a => D.bld[a.g.building].name;

  function prodTip(a) {
    const l = [];
    if (!a.p) return T(gname(a), dl(S4.desc.bld(a.g.building)), 'No recipe set', `${fmt.group(a.g.count)} built`);
    l.push(dl(S4.desc.bld(a.g.building)), 'Recipe: ' + a.p.name, `${fmt.group(a.g.count)} built, running ${fmt.pct(a.share)}`);
    for (const [m, v] of Object.entries(a.out || {})) l.push(`Makes ${fmt.amount(m, v * P().hours)} ${short(m).toLowerCase()} ${P().word}`);
    if (a.p.generates) l.push(`Generates ${fmt.power(a.p.generates * a.g.count * a.share)}`);
    if (a.limit) l.push((a.limit.kind === 'off' || a.limit.kind === 'idle' ? '~' : '!') + a.limit.text);
    return T(gname(a), l);
  }

  function troubled(s) { const f = S4.flows(s); return f.food.cover < 1 || f.power.supply < f.power.demand; }
  function sitesPanel() {
    const s = here(), all = S4.sites, pop = all.reduce((a, x) => a + x.pop, 0), facts = s.place === 'orbit' ? null : FACTS[s.world];
    return `<div class="pan"><h2>Sites</h2><div class="pb" style="padding:6px 4px">
      <div class="row" style="display:flex;justify-content:space-between;padding:2px 6px"><b class="pf" style="font-size:14px">Sol</b><span class="dim">${all.length} ${all.length === 1 ? 'site' : 'sites'}, ${fmt.population(pop)}</span></div>
      ${all.map(x => `<button class="tile site ${x.id === s.id ? 'sel' : ''} ${troubled(x) ? 'warn' : ''}" data-act="site" data-id="${x.id}" data-tip="${esc(T(x.name, dl(x.place === 'orbit' ? 'Orbital station' : 'Surface outpost'), `${fmt.population(x.pop)} people`, troubled(x) ? '!Short of food or power' : ''))}">
        <img class="px" src="${planet(x.world)}" width="30" height="30"><span class="snm">${esc(x.name)}</span><span class="dim">${fmt.population(x.pop)}</span>${troubled(x) ? `<span class="hot">${gl('warn', 'sm')}</span>` : ''}</button>`).join('')}
      </div></div>
      <div class="pan grow"><h2>${esc(s.name)}</h2><div class="pb planetview">
        <img class="px" src="${planet(s.world)}" width="${s.place === 'orbit' ? 216 : 200}" height="${s.place === 'orbit' ? 216 : 200}">
        ${facts ? `<div class="facts">${pill('down', facts[0], '', 'Surface gravity')}${pill('drop', facts[1], '', 'Atmosphere')}${pill('gear', facts[2], '', 'Surface')}</div>` : ''}</div></div>`;
  }

  const stat = (ic, big, sub, warn, tip) => `<div class="kpi ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;
  const foodStore = s => (s.food || E.food).reduce((a, m) => a + (s.stock[m] || 0), 0);
  const foodStoreKcal = s => (s.food || E.food).reduce((a, m) => a + (s.stock[m] || 0) * S4.KCAL[m], 0);

  function kpis(f, s) {
    const spare = f.power.supply - f.power.demand, fs = f.food.need > 0 ? f.food.made / f.food.need - 1 : 0;
    const each = s.pop > 0 ? f.food.made * 24 / s.pop : 0, g = s.growth;
    return `<div class="kpis">
      ${stat('people', fmt.population(s.pop), `${g >= 0 ? '+' : ''}${(g * 100).toFixed(2)}% a year`, false, T('People', dl('Everyone at this site. They eat, work and grow in number while fed.'), `Workforce ${fmt.population(f.workers.avail)}`))}
      ${stat('grain', fmt.signedPct(fs), `${fmt.group(each)} kcal each a day`, fs < 0 || f.food.cover < 1, T('Food', dl('Counted in food calories (kcal).'), `Need ${fmt.kcal(f.food.need * P().hours)} ${P().word}, ${fmt.group(s.kcalPerPersonDay)} kcal a person a day`, `Made ${fmt.kcal(f.food.made * P().hours)} ${P().word}`, `Stored ${fmt.kcal(foodStoreKcal(s))}`))}
      ${stat('bolt', (spare >= 0 ? '+' : '-') + fmt.power(Math.abs(spare)), `demand ${fmt.power(f.power.demand)}`, spare < 0, T('Power', dl('Grid plus generators, against what every running building draws.'), `Grid ${fmt.power(f.power.grid)}`, `Generated ${fmt.power(f.power.gen)}`, `Demand ${fmt.power(f.power.demand)}`))}
      ${S4.sketchUI ? S4.sketchUI.kpiCompute(stat) : stat('chip', 'None', 'wanted 0', false, T('Compute', dl('Cycles for programmes and building. Made by data centres.'), 'Made 0', 'Wanted 0'))}
      ${stat('gear', fmt.pct(f.workers.share), `${fmt.population(f.workers.need)} needed`, f.workers.share < 1, T('Staffing', dl('Workers available against workers every running building needs.'), `Workforce ${fmt.population(f.workers.avail)}`, `Needed ${fmt.population(f.workers.need)}`))}
    </div>`;
  }

  function prodTile(a, sel) {
    const mo = mainOut(a), w = a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle';
    const idle = a.limit && (a.limit.kind === 'off' || a.limit.kind === 'idle');
    const gen = a.p && a.p.generates;
    const badge = w ? `<span class="corner hot" style="top:3px;left:3px">${gl('warn', 'sm')}</span>` : a.limit && a.limit.kind === 'off' ? `<span class="corner dim" style="top:3px;left:3px">${gl('power', 'sm')}</span>` : '';
    const tip = prodTip(a);
    return `<button class="tile prod ${sel ? 'sel' : ''} ${w ? 'warn' : ''} ${idle ? 'idle' : ''}" data-act="grp" data-id="${a.g.id}" data-tip="${esc(tip)}">
      <i class="kstripe" style="background:${kc(a.b.kind)}"></i>${badge}
      <span class="art2">${bi(a.g.building, 2, tip)}${mo ? mi(mo, 2, tip) : gen ? `<span style="width:32px;display:flex;justify-content:center;color:var(--accent)">${gl('bolt', 'lg')}</span>` : ''}</span>
      ${nm2(mo ? short(mo) : a.p ? a.p.name : gname(a), gname(a))}
      <span class="foot"><span class="n">${fmt.count(a.g.count)}</span>${a.p ? meter(a.share, w ? 'hot' : '') : `<span class="dim" style="font-size:15px">idle</span>`}</span>
    </button>`;
  }

  const rateRow = items => items.map(([m, v], i) => `${i ? `<span class="plus">${gl('plus', 'xs')}</span>` : ''}<span class="rate" data-tip="${esc(S4.matTip(m))}">${mi(m, 2)}<span>${fmt.amount(m, v * P().hours)}</span></span>`).join('');

  function foodPanel(f, s) {
    const parts = Object.entries(f.food.madeBy).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const made = f.food.made, need = f.food.need, top = Math.max(made, need, 1e-9), each = s.pop > 0 ? made * 24 / s.pop : 0;
    const eaten = Object.entries(f.food.eatenBy).filter(([, v]) => f.food.eaten > 0 && v / f.food.eaten >= .005).sort((a, b) => b[1] - a[1]);
    const storeKg = foodStore(s), storeKcal = foodStoreKcal(s), days = made >= need ? Infinity : storeKcal / Math.max(1e-9, need - made) / 24;
    const foods = (s.food || E.food).filter(m => (s.stock[m] || 0) > 0 || (f.out[m] || 0) > 0);
    return `<h3>${gl('grain', 'sm')}Food, counted in calories <small class="dim">${fmt.group(each)} kcal a person a day made against ${fmt.group(s.kcalPerPersonDay)} needed</small></h3>
      <div class="pills">${pill('people', `${fmt.pct(f.food.cover)} fed`, f.food.cover < 1 ? 'hot' : '', 'Share of the calorie need met')}${pill('box', `${fmt.mass(storeKg)}, ${isFinite(days) ? fmt.days(days) : 'growing'} in store`, '', 'Food in store, and how long it lasts')}</div>
      <div class="cbar" data-tip="${esc(T('Calories made, by source', dl('Each block is one food. The marker is what people need.'), ...parts.map(([m, v]) => `${short(m)} ${fmt.kcal(v * P().hours)} ${P().word}`), `Need ${fmt.kcal(need * P().hours)} ${P().word}`))}">${parts.map(([m, v]) => `<i style="width:${v / top * 100}%;background:rgb(${S4.matInfo(m).base.join(',')})">${v / top > .07 ? esc(`${short(m)} ${fmt.pct(v / made)}`) : ''}</i>`).join('')}<u style="left:${need / top * 100}%"></u></div>
      ${eaten.length ? `<div class="pills"><span class="dim">Eaten</span>${eaten.map(([m, v]) => pill('', `${short(m)} ${fmt.pct(v / f.food.eaten)}`, '', 'Share of the calories people eat')).join('')}</div>` : ''}
      <div class="grid s" style="margin-bottom:6px">${foods.map(m => stkTile(m, f, false)).join('')}</div>`;
  }

  function summary(f, s) {
    const shortIds = D.mats.map(m => m.id).filter(id => { const c = S4.cover(id, f), st = s.stock[id] || 0; return (isFinite(c) && c < 365 && st > 0) || (st <= 0 && (f.use[id] || 0) > (f.out[id] || 0) + 1e-9); }).slice(0, 14);
    const limited = f.actors.filter(a => a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle');
    const byKind = {};
    for (const a of f.actors) { const k = a.b.kind, r = byKind[k] = byKind[k] || { count: 0, workers: 0, power: 0, n: 0 }; r.count += a.g.count; r.n++; r.workers += a.g.on && a.p ? a.g.count * a.b.workers : 0; r.power += a.power || 0; }
    const maxPow = Math.max(...Object.values(byKind).map(r => r.power), 1);
    const kindOrder = Object.keys(S4.KIND_NAMES), kinds = Object.entries(byKind).sort((a, b) => kindOrder.indexOf(a[0]) - kindOrder.indexOf(b[0]));
    const progs = s === E ? E.programmes : [];
    return `<div class="main" style="grid-column:1/-1">${kpis(f, s)}
      ${S4.sketchUI && s === E ? S4.sketchUI.summary() : ''}
      ${foodPanel(f, s)}
      <h3>${gl('warn', 'sm')}What is short <small class="dim">${shortIds.length} materials, ${limited.length} building groups</small></h3>
      <div class="grid s" style="margin-bottom:6px">${shortIds.map(id => stkTile(id, f, false)).join('')}</div>
      ${!shortIds.length && !limited.length ? '<p class="none" style="margin-bottom:6px">Nothing is short.</p>' : ''}
      ${limited.length ? `<div class="grid" style="margin-bottom:6px">${limited.map(a => prodTile(a, false)).join('')}</div>` : ''}
      <div class="cols2">
        <div><h3>Industry by kind</h3><div class="grid">${kinds.map(([k, r]) => `<div class="tile prod" style="cursor:default" data-tip="${esc(T(S4.KIND_NAMES[k], dl(S4.KIND_DESC[k]), `${fmt.count(r.count)} buildings in ${r.n} groups`, `${fmt.population(r.workers)} workers`, `${fmt.power(r.power)} power`))}"><i class="kstripe" style="background:${kc(k)}"></i><span class="art">${bi(S4.KIND_EX[k], 2)}</span>${nm(S4.KIND_NAMES[k])}<span class="foot"><span class="n">${fmt.count(r.count)}</span>${meter(r.power / maxPow)}</span></div>`).join('')}</div></div>
        <div><h3>Programmes <small class="dim">${E.done.length} of ${D.miles.length} researched</small></h3>${progs.length ? `<div class="grid m">${progs.map(msTileMini).join('')}</div>` : '<p class="none">No programme is running. Start one from Research.</p>'}
          <h3>Building now</h3>${activeOrders(s).length ? `<div class="grid m">${activeOrders(s).map(o => qTile(o, false, s)).join('')}</div>` : '<p class="none">Nothing is being built.</p>'}</div>
      </div></div>`;
  }

  let MSI = null;
  function msIcon(m, sc) {
    if (!MSI) {
      MSI = {}; const used = new Set();
      for (const x of D.miles) {
        const c = [...x.needs.buildings.slice().reverse().map(b => ['b', b]), ...x.needs.components.slice().reverse().map(b => ['c', b]), ...x.needs.materials.slice().reverse().map(b => ['m', b])];
        const pick = c.find(q => !used.has(q[0] + q[1])) || c[0];
        if (pick) used.add(pick[0] + pick[1]);
        MSI[x.number] = pick;
      }
    }
    const q = MSI[m.number];
    if (!q) return gl('flask', 'lg');
    return q[0] === 'b' ? bi(q[1], sc, m.name) : q[0] === 'c' ? ci(q[1], sc, m.name) : mi(q[1], sc, m.name);
  }

  function msTileMini(p) {
    const m = S4.mile(p.number), left = (1 - p.progress) * S4.programmeDays(p.number);
    return `<div class="tile q" style="cursor:default" data-tip="${esc(T(m.name, dl(m.unlocks), `Programme ${p.number}`, `${fmt.pct(p.progress)} done`, `${fmt.days(left)} left`))}"><span class="corner">${p.number}</span><span class="art">${msIcon(m, 2)}</span>${nm(m.name)}${meter(p.progress, 'cool', 'full')}<span class="dim note">${fmt.days(left)} left</span></div>`;
  }

  function production(f, s) {
    const order = Object.keys(S4.KIND_NAMES);
    const sel = typeof ES.group === 'string' ? null : f.actors.find(a => a.g.id === ES.group) || f.actors.filter(a => ES.kind === 'all' || a.b.kind === ES.kind)[0];
    const items = f.actors.map(a => ({ kind: a.b.kind, n: a.g.count, html: prodTile(a, sel && a.g.id === sel.g.id) })).concat(S4.sketchUI && s === E ? S4.sketchUI.prodExtra(ES) : []);
    const kinds = order.filter(k => items.some(i => i.kind === k));
    const list = items.filter(i => ES.kind === 'all' || i.kind === ES.kind).sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind) || y.n - x.n);
    return `<div class="main"><div class="filters"><button class="${ES.kind === 'all' ? 'on' : ''}" data-act="kind" data-id="all">All ${items.length}</button>${kinds.map(k => `<button class="${ES.kind === k ? 'on' : ''}" data-act="kind" data-id="${k}" data-tip="${S4.KIND_NAMES[k]}">${bi(S4.KIND_EX[k], 1)}${items.filter(i => i.kind === k).length}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map(i => i.html).join('')}</div>` : ''}</div>
      <div class="side">${(S4.sketchUI && S4.sketchUI.prodCard(ES.group)) || (sel ? prodCard(sel, s) : '')}</div>`;
  }

  function prodCard(a, s) {
    const choices = S4.choicesFor(a.g.building);
    const others = choices.filter(c => c.id !== a.g.process);
    const tgt = others.find(c => c.id === ES.target) || others[0];
    const full = o => Object.entries(o || {}).map(([m, v]) => [m, v * a.g.count * (a.share || 1)]);
    const inp = a.p ? full(a.p.inputs) : [], out = a.p ? full(a.p.outputs) : [];
    const pw = a.p ? a.p.power * a.g.count * (a.share || 1) : 0;
    const w = a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle';
    const b = a.b, extract = a.p && a.p.extract;
    return `<div class="card" style="--ec:${w ? 'var(--hot)' : 'var(--line)'}"><header>${bi(a.g.building, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${a.p ? esc(a.p.name) : 'no recipe'}</div></div></header><div class="cb">
      <div class="row">${pill('factory', fmt.group(a.g.count), '', 'Buildings in this group')}${pill('people', fmt.population(b.workers * a.g.count), '', T('Workers', `${b.workers} a building`, `${fmt.population(b.workers * a.g.count)} in all`))}${pill('bolt', a.p ? fmt.power(pw) : '-', '', 'Power used when running')}${extract ? pill('drop', 'grade 1.00', '', T('Grade', dl('1 is the nominal yield of one extractor; 2 yields twice that for the same power.'))) : ''}</div>
      <div><span class="lbl">Running</span><div class="row">${meter(a.share, w ? 'hot' : '', 'thick')}<span class="${w ? 'hot' : ''}" style="min-width:34px;text-align:right">${fmt.pct(a.share)}</span></div>${a.limit ? `<div class="${a.limit.kind === 'off' || a.limit.kind === 'idle' ? 'dim' : 'hot'}" style="margin-top:3px">${gl(a.limit.kind === 'off' || a.limit.kind === 'idle' ? 'minus' : 'warn', 'xs')} ${esc(a.limit.text)}</div>` : ''}</div>
      ${a.p ? `<div><span class="lbl">Recipe, ${P().word}</span><div class="eq">${inp.length ? rateRow(inp) : pill('drop', 'From the ground')}${a.p.power && !extract ? `<span class="rate">${gl('bolt', 'lg')}<span>${fmt.power(pw)}</span></span>` : ''}</div><div class="eq" style="margin-top:4px"><span class="arr">${gl('arrowR')}</span>${out.length ? rateRow(out) : a.p.generates ? `<span class="rate">${gl('bolt', 'lg')}<span>${fmt.power(a.p.generates * a.g.count * a.share)}</span></span>` : ''}</div></div>` : ''}
      <div class="btns"><button data-act="tgl">${gl('power')}${a.g.on ? 'Switch off' : 'Switch on'}</button></div>
      ${others.length ? `<div><span class="lbl">Switch recipe</span><div class="grid s" style="grid-template-columns:repeat(auto-fill,40px);gap:3px">${others.slice(0, 40).map(c => { const o = Object.keys(c.outputs)[0]; return `<button class="tile ${tgt && tgt.id === c.id ? 'sel' : ''}" style="width:40px;height:40px;justify-content:center;padding:0" data-act="target" data-id="${esc(c.id)}" data-tip="${esc(T(c.name, Object.keys(c.outputs).map(m => '→ ' + short(m)), c.inputs && Object.keys(c.inputs).length ? 'from ' + Object.keys(c.inputs).map(short).join(', ') : ''))}">${o ? mi(o, 2) : gl('bolt')}</button>`; }).join('')}</div>
        ${tgt ? `<div class="row" style="margin-top:6px"><span>${esc(tgt.name)}</span></div><div class="row"><label class="field">How many <input id="num" type="number" min="1" max="${a.g.count}" value="${Math.min(ES.num, a.g.count)}" style="width:92px"></label><button data-act="switch">${gl('arrowR')}Switch ${fmt.count(Math.min(ES.num, a.g.count))}</button><button data-act="all" data-tip="All of them">all</button></div>` : ''}</div>` : ''}
    </div></div>`;
  }

  function stkTile(id, f, selectable = true) {
    const s = here(), m = D.mat[id], net = (f.out[id] || 0) - (f.use[id] || 0), c = S4.cover(id, f), st = s.stock[id] || 0;
    const stockless = m.unit === 'cu';
    const bad = isFinite(c) && c < 365 || (st <= 0 && (f.use[id] || 0) > (f.out[id] || 0));
    const flat = Math.abs(net) < 1e-6 * (st + 1);
    const tr = flat ? 'flat' : net > 0 ? 'up' : 'down';
    const cv = st <= 0 && !(f.out[id] || f.use[id]) ? 0 : !isFinite(c) ? 1 : Math.min(1, c / 730);
    const rate = flat ? '0' : fmt.rate(id, net, true);
    return `<button class="tile stk ${bad ? 'warn' : ''} ${selectable && ES.mat === id ? 'sel' : ''} ${st <= 0 && !(f.out[id] || f.use[id]) ? 'dimmed' : ''}" data-act="mat" data-id="${id}" data-tip="${esc(S4.matTip(id) + (bad ? '\n!Short' : ''))}">
      <span class="trend ${tr === 'down' ? 'hot' : tr === 'up' ? 'cool' : 'dim'}">${gl(tr)}</span>${mi(id, 2)}${nm(short(id))}${S4.fitText('amt', stockless ? '-' : st > 0 ? fmt.amount(id, st) : '0 t', 17)}${S4.fitText('net ' + (tr === 'down' ? 'hot' : tr === 'up' ? 'cool' : 'dim'), rate, 15)}${meter(cv, bad ? 'hot' : 'cool', 'full')}</button>`;
  }

  function stockpiles(f, s) {
    const has = id => ES.empty || (s.stock[id] || 0) > 0 || (f.out[id] || 0) > 0 || (f.use[id] || 0) > 0;
    const cats = D.cats.map(c => [c, D.mats.filter(m => m.category === c && has(m.id)).map(m => m.id)]).filter(x => x[1].length);
    const shown = ES.cat === 'all' ? cats : cats.filter(x => x[0] === ES.cat);
    const pick = shown.some(([, ids]) => ids.includes(ES.mat)) ? ES.mat : (shown[0] || [null, []])[1][0];
    return `<div class="main"><div class="filters"><button class="${ES.cat === 'all' ? 'on' : ''}" data-act="cat" data-id="all">All ${cats.reduce((a, x) => a + x[1].length, 0)}</button>${cats.map(([c, ids]) => `<button class="${ES.cat === c ? 'on' : ''}" data-act="cat" data-id="${c}" data-tip="${S4.CAT_NAMES[c]}">${mi(S4.CAT_REP[c], 1)}${ids.length}</button>`).join('')}<span style="flex:1"></span><button class="${ES.empty ? 'on' : ''}" data-act="empty" data-tip="Also list materials with no stock and no flow, to see the whole catalogue">${gl('filter', 'sm')}Show empty</button></div>
      ${shown.length ? shown.map(([c, ids]) => `${ES.cat === 'all' ? `<h3>${mi(S4.CAT_REP[c], 1)}${S4.CAT_NAMES[c]} <small class="dim">${ids.length}</small></h3>` : ''}<div class="grid s" style="margin-bottom:6px">${ids.map(id => stkTile(id, f)).join('')}</div>`).join('') : '<p class="none">Nothing is stored here.</p>'}</div>
      <div class="side">${pick ? matCard(pick, f, s) : ''}</div>`;
  }

  function matCard(id, f, s) {
    const m = D.mat[id], st = s.stock[id] || 0, made = (f.out[id] || 0) * P().hours, used = (f.use[id] || 0) * P().hours, c = S4.cover(id, f), net = made - used;
    const mk = D.recipes.filter(r => r.outputs[id] && S4.canStand(r.building, s)).slice(0, 6), us = D.recipes.filter(r => r.inputs[id] && S4.canStand(r.building, s)).slice(0, 6);
    const srcs = s === E ? (m.sources || []).filter(x => x.body === 'earth') : [];
    const line = (ic, label, v, cls = '') => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${label}</span><span class="v ${cls}">${v}</span></div>`;
    const recRow = r => `<div class="eq">${bi(r.building, 1)}${Object.keys(r.inputs).slice(0, 4).map(i => mi(i, 1)).join('')}<span class="arr">${gl('arrowR', 'sm')}</span>${Object.keys(r.outputs).map(o => mi(o, 1)).join('')}</div>`;
    return `<div class="card"><header>${mi(id, 2)}<div><div class="t">${esc(m.name.split(' (')[0])}</div><div class="s">${S4.CAT_NAMES[m.category]}</div></div></header><div class="cb">
      <div class="flow">${line('box', 'In store', fmt.amount(id, st))}${line('up', 'Made ' + P().word, fmt.amount(id, made), 'cool')}${line('down', 'Used ' + P().word, fmt.amount(id, used))}${line(net < 0 ? 'down' : 'up', 'Balance ' + P().word, fmt.signed(id, net), net < 0 ? 'hot' : 'cool')}${line('box', 'In a year', fmt.amount(id, Math.max(0, st + ((f.out[id] || 0) - (f.use[id] || 0)) * 8766)), st + ((f.out[id] || 0) - (f.use[id] || 0)) * 8766 <= 0 ? 'hot' : '')}${S4.KCAL[id] ? line('grain', 'Energy', fmt.group(S4.KCAL[id]) + ' kcal a kg') : ''}${line('clock', 'Cover', isFinite(c) ? fmt.days(c) : 'growing', isFinite(c) && c < 365 ? 'hot' : '')}</div>
      ${meter(isFinite(c) ? Math.min(1, c / 730) : 1, isFinite(c) && c < 365 ? 'hot' : 'cool', 'thick full')}
      ${srcs.length ? `<div><span class="lbl">Taken from the ground by</span><div class="eq">${[...new Set(srcs.map(x => x.building))].map(b => `<span class="ibox">${bi(b, 1)}</span>`).join('')}</div></div>` : ''}
      ${mk.length ? `<div><span class="lbl">Made by</span><div class="flow">${mk.map(recRow).join('')}</div></div>` : ''}
      ${us.length ? `<div><span class="lbl">Used by</span><div class="flow">${us.map(recRow).join('')}</div></div>` : ''}
      <div class="dim">${esc(S4.desc.mat(id))}</div></div></div>`;
  }

  const activeOrders = s => s.queue.filter(o => !o.paused).slice(0, S4.BUILD_SLOTS);
  function qTile(o, sel, s) {
    const act = activeOrders(s).includes(o), b = D.bld[o.building];
    const left = (1 - o.done) * S4.buildHours(o.building) / 24;
    const st = o.paused ? 'pause' : act ? 'hammer' : 'clock';
    return `<button class="tile q ${sel ? 'sel' : ''} ${o.paused ? 'idle' : ''}" data-act="qsel" data-id="${o.id}" data-tip="${esc(T(b.name, dl(S4.desc.bld(o.building)), o.paused ? '~Paused' : act ? 'Building' : '~Waiting for a crew', `${fmt.pct(o.done)} done`, act ? fmt.days(left) + ' left' : ''))}">
      <span class="corner">${s.queue.indexOf(o) + 1}</span><span class="corner r ${act ? 'acc' : 'dim'}">${gl(st)}</span><span class="art">${bi(o.building, 2)}</span>${nm(b.name)}${meter(o.done, act ? '' : 'cool', 'full')}<span class="dim note">${act ? fmt.days(left) + ' left' : o.paused ? 'paused' : 'waiting'}</span></button>`;
  }

  function bldTile(b, sel, s) {
    const open = S4.unlocked(b), costs = Object.entries(b.cost).sort((x, y) => y[1] - x[1]);
    const st = S4.standing(b.id, s), waits = S4.missingPrerequisites(b.milestone).map(n => S4.mile(n).name);
    return `<button class="tile bld ${sel ? 'sel' : ''} ${open ? '' : 'dimmed'}" data-act="bpick" data-id="${b.id}" data-tip="${esc(T(b.name, S4.KIND_NAMES[b.kind], dl(S4.desc.bld(b.id)), open ? 'Open' : `!Needs ${waits.join(' and ')} first`, `${st ? fmt.count(st) + ' standing' : 'none standing'}`, `Build time ${fmt.days(S4.buildHours(b.id) / 24)}`))}">
      <i class="kstripe" style="background:${kc(b.kind)}"></i><span class="corner">${st ? '×' + fmt.count(st) : ''}</span>${open ? '' : `<span class="corner r dim">${gl('lock')}</span>`}
      <span class="art">${bi(b.id, 2)}</span>${nm(b.name)}<span class="costs">${costs.slice(0, 3).map(([m]) => mi(m, 1)).join('')}${costs.length > 3 ? `<span class="dim" style="font-size:14px;align-self:center">+${costs.length - 3}</span>` : ''}</span></button>`;
  }

  function construction(f, s) {
    const order = Object.keys(S4.KIND_NAMES);
    const cat = D.blds.filter(b => S4.canStand(b.id, s) && !(S4.sketchUI && s === E && S4.sketchUI.replaces.includes(b.id))).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.milestone - b.milestone);
    const extra = S4.sketchUI && s === E ? S4.sketchUI.consExtra(ES) : [];
    const kinds = order.filter(k => cat.some(b => b.kind === k) || extra.some(x => x.kind === k));
    const list = cat.filter(b => ES.bkind === 'all' || b.kind === ES.bkind);
    const xlist = extra.filter(x => ES.bkind === 'all' || x.kind === ES.bkind);
    const open = cat.filter(S4.unlocked).length;
    const pick = D.bld[ES.pick] && S4.canStand(ES.pick, s) ? D.bld[ES.pick] : list[0];
    const ord = ES.side === 'order' && s.queue.find(o => o.id === ES.order);
    const queue = s.queue.map(o => qTile(o, ord && ord.id === o.id, s)).concat(S4.sketchUI && s === E ? S4.sketchUI.queueExtra() : []);
    return `<div class="main">${S4.sketchUI && s === E ? S4.sketchUI.consSection(ES) : ''}<h3>${gl('hammer', 'sm')}Construction queue${S4.sketchUI && s === E ? '' : ` <small class="dim">${activeOrders(s).length} of ${S4.BUILD_SLOTS} crews busy</small>`}</h3>
      ${queue.length ? `<div class="grid m" style="margin-bottom:6px">${queue.join('')}</div>` : ''}
      <h3>${gl('factory', 'sm')}Buildings <small class="dim">${open} open, ${cat.length - open} locked</small></h3>
      <div class="filters"><button class="${ES.bkind === 'all' ? 'on' : ''}" data-act="bkind" data-id="all">All ${cat.length + extra.length}</button>${kinds.map(k => `<button class="${ES.bkind === k ? 'on' : ''}" data-act="bkind" data-id="${k}" data-tip="${S4.KIND_NAMES[k]}">${bi(S4.KIND_EX[k], 1)}${cat.filter(b => b.kind === k).length + extra.filter(x => x.kind === k).length}</button>`).join('')}</div>
      <div class="grid">${xlist.map(x => x.html).join('')}${list.map(b => bldTile(b, !ord && ES.side !== 'sk' && pick && pick.id === b.id, s)).join('')}</div></div>
      <div class="side">${(S4.sketchUI && S4.sketchUI.consCard(ES)) || (ord ? orderCard(ord, s) : pickCard(pick, s))}</div>`;
  }

  const haveRow = (cost, qty = 1, s = here()) => `<div class="eq">${Object.entries(cost).sort((a, b) => b[1] - a[1]).map(([m, v]) => { const have = s.stock[m] || 0, need = v * qty, ok = have >= need; return `<span class="have ${ok ? 'ok' : 'short'}" data-tip="${esc(S4.matTip(m) + `\nNeed ${fmt.cargo(m, need)}, have ${fmt.cargo(m, have)}`)}">${mi(m, 2)}<span>${fmt.cargo(m, have)}</span><span class="need">/ ${fmt.cargo(m, need)}</span></span>`; }).join('')}</div>`;

  function pickCard(b, s) {
    if (!b) return '';
    const open = S4.unlocked(b), recs = open ? S4.choicesFor(b.id) : [];
    const rec = recs.find(r => r.id === ES.recipe) || recs[0];
    return `<div class="card"><header>${bi(b.id, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${S4.KIND_NAMES[b.kind]}</div></div></header><div class="cb">
      <div class="row">${pill('people', String(b.workers), '', 'Workers')}${S4.sketchUI ? pill('hammer', S4.sketchUI.bpOf(b.id) + ' BP', '', 'Build points') + pill('coin', '$' + (S4.sketchUI.bpOf(b.id) * BAL.WAGE_PER_BP).toFixed(3) + 'B', '', 'Wages') : pill('clock', fmt.days(S4.buildHours(b.id) / 24), '', 'Build time')}${pill('factory', fmt.count(S4.standing(b.id, s)), '', 'Standing')}${b.start ? pill('check', 'start', 'cool', 'Exists on Earth at the start') : ''}</div>
      <div><span class="lbl">Build cost</span>${haveRow(b.cost, ES.qty, s)}</div>
      ${open ? (recs.length ? `<div><span class="lbl">Recipe</span><div class="grid s" style="grid-template-columns:repeat(auto-fill,40px);gap:3px">${recs.slice(0, 30).map(c => { const o = Object.keys(c.outputs)[0]; return `<button class="tile ${rec && rec.id === c.id ? 'sel' : ''}" style="width:40px;height:40px;justify-content:center;padding:0" data-act="recipe" data-id="${esc(c.id)}" data-tip="${esc(T(c.name, Object.keys(c.outputs).map(m => '→ ' + short(m))))}">${o ? mi(o, 2) : gl('bolt')}</button>`; }).join('')}</div></div>` : '')
        + `<div class="row"><label class="field">Quantity <input id="qty" type="number" min="1" value="${ES.qty}" style="width:60px"></label><button data-act="badd">${gl('plus')}Add to queue</button></div>${S4.sketchUI && s === E ? S4.sketchUI.queuedRows(b.id) : ''}` : `<div class="flag w">${gl('lock')}<span>Needs ${esc(S4.missingPrerequisites(b.milestone).map(n => S4.mile(n).name).join(' and '))} first</span></div>`}
    </div></div>`;
  }
  function orderCard(o, s) {
    const b = D.bld[o.building], i = s.queue.indexOf(o), act = activeOrders(s).includes(o);
    return `<div class="card"><header>${bi(o.building, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">order ${i + 1}, ${o.paused ? 'paused' : act ? 'building' : 'waiting for a crew'}</div></div></header><div class="cb">
      <div class="row">${meter(o.done, '', 'thick')}<span style="min-width:34px;text-align:right">${fmt.pct(o.done)}</span></div>
      <div class="dim">${act ? fmt.days((1 - o.done) * S4.buildHours(o.building) / 24) + ' left' : ''}</div>
      <div><span class="lbl">Cost, spent evenly while building</span>${haveRow(b.cost, 1, s)}</div>
      <div class="btns"><button data-act="qup" ${i <= 0 ? 'disabled' : ''}>${gl('up')}Up</button><button data-act="qdown" ${i >= s.queue.length - 1 ? 'disabled' : ''}>${gl('down')}Down</button><button data-act="qpause">${gl(o.paused ? 'play' : 'pause')}${o.paused ? 'Resume' : 'Pause'}</button><button data-act="qrem">${gl('trash')}Remove</button></div></div></div>`;
  }

  function people(f, s) {
    const byKind = {}; for (const a of f.actors) { if (a.g.on && a.p) byKind[a.b.kind] = (byKind[a.b.kind] || 0) + a.g.count * a.b.workers; }
    const total = Object.values(byKind).reduce((x, y) => x + y, 0), spare = Math.max(0, f.workers.avail - f.workers.need);
    const coh = [['Workforce', s.workShare, 'gear', 'Of working age and available for jobs.'], ['Not in the workforce', 1 - s.workShare, 'clock', 'Children, students, carers and the retired.']];
    const line = (ic, l, v) => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v">${esc(v)}</span></div>`;
    const bar = (l, v) => `<div class="fr"><span class="nm">${l}</span><span class="v" style="min-width:180px;display:flex;gap:6px;align-items:center">${meter(v, v < 1 ? 'hot' : 'cool', '')}<span style="min-width:34px;text-align:right">${fmt.pct(v)}</span></span></div>`;
    const tile = (n, d, ic, sh, v) => `<div class="tile q" style="cursor:default" data-tip="${esc(T(n, dl(d), sh === null ? '' : fmt.pct(sh)))}"><span class="art acc">${gl(ic, 'lg')}</span>${nm(n)}<span class="n">${v}</span>${sh === null ? '' : meter(sh, '', 'full')}</div>`;
    const g = s.growth;
    return `<div class="main"><h3>${gl('people', 'sm')}Who lives here <small class="dim">${fmt.population(s.pop)}</small></h3><div class="grid m">${tile('People', 'Everyone at this site. They eat, work and grow in number while fed.', 'people', null, fmt.population(s.pop))}${coh.map(([n, sh, ic, d]) => tile(n, d, ic, sh, fmt.population(s.pop * sh))).join('')}</div>
      <h3>${gl('gear', 'sm')}Jobs by industry <small class="dim">${fmt.population(total)} workers needed, ${fmt.population(spare)} not needed</small></h3>${total ? `<div class="grid m">${Object.entries(byKind).sort((a, b) => Object.keys(S4.KIND_NAMES).indexOf(a[0]) - Object.keys(S4.KIND_NAMES).indexOf(b[0])).map(([k, w]) => `<div class="tile q" style="cursor:default" data-tip="${esc(T(S4.KIND_NAMES[k], dl(S4.KIND_DESC[k]), `${fmt.population(w)} workers`))}"><i class="kstripe" style="background:${kc(k)}"></i><span class="art">${bi(S4.KIND_EX[k], 2)}</span>${nm(S4.KIND_NAMES[k])}<span class="n">${fmt.population(w)}</span>${meter(w / total, '', 'full')}</div>`).join('')}</div>` : '<p class="none">No building here needs workers yet.</p>'}</div>
      <div class="side"><div class="card"><header><div><div class="t">Population</div><div class="s">${esc(s.name)}, ${fmt.population(s.pop)}</div></div></header><div class="cb">
        <div><span class="lbl">Share of need met</span><div class="flow">${bar('Jobs filled', f.workers.share)}${bar('Fed', f.food.cover)}${s.berths !== null ? bar('Housed', s.berths ? Math.min(1, s.berths / Math.max(1, s.pop)) : 1) : ''}</div></div>
        <div class="flow">${line('gear', 'Workforce', fmt.population(f.workers.avail))}${line('grain', 'Food a person', fmt.group(s.kcalPerPersonDay) + ' kcal a day')}${line(g >= 0 ? 'up' : 'down', 'Growth', `${g >= 0 ? '+' : ''}${(g * 100).toFixed(2)}% a year`)}${line('gear', 'Workers not needed', fmt.population(spare))}${s.berths !== null ? line('dome', 'Berths', `${fmt.group(s.pop)} of ${fmt.group(s.berths)}`) : ''}</div></div></div></div>`;
  }

  const F = S4.F;
  const yardsAt = s => S4.standing('rocket_factory', s) + S4.standing('orbital_shipyard', s);
  const roleName = r => S4.ROLE_NAMES[r];
  function shipTile(v, sel, act) {
    const blocked = !!v.blocked, mark = blocked ? 'warn' : v.trip ? 'rocket' : v.run ? 'arrowR' : null;
    return `<button class="tile q ship ${sel ? 'sel' : ''} ${blocked ? 'warn' : ''}" data-act="${act}" data-id="${v.id}" data-tip="${esc(S4.vesselTip(v))}">${mark ? `<span class="corner r ${blocked ? 'hot' : 'acc'}">${gl(mark)}</span>` : ''}<span class="art">${S4.artImg(S4.classOf(v.design), 104, 34)}</span><span class="nm two"><b>${esc(v.name)}</b><em>${esc(S4.classOf(v.design).name)}</em></span><span class="dim note ${blocked ? 'hot' : ''}">${esc(S4.tileWhere(v))}</span>${meter(S4.tankFill(v), 'cool', 'full')}</button>`;
  }

  function yard(f, s) {
    const q = F.yard[s.id] || [], yards = yardsAt(s), designs = F.classes.filter(c => c.locked);
    const design = S4.classOf(ES.yardPick) || designs[0], sel = q.find(o => o.id === ES.yardOrder);
    const left = o => { const st = S4.designStats(S4.classOf(o.design), () => true); return fmt.days((1 - o.done) * (2 + .5 * st.dryMass / 1000)) + ' left'; };
    const st = design ? S4.designStats(design, () => true) : null;
    const costs = st ? Object.entries(st.cost).sort((a, b) => b[1] - a[1]) : [];
    return `<div class="main"><h3>${gl('yard', 'sm')}Ship queue <small class="dim">${yards} yards standing</small></h3>
      ${q.length ? `<div class="grid m" style="margin-bottom:6px">${q.map((o, i) => `<button class="tile q ${sel === o ? 'sel' : ''} ${o.paused ? 'idle' : ''}" data-act="ysel" data-id="${o.id}" data-tip="${esc(T(o.name, S4.yardName(o.yard), o.paused ? 'Paused' : 'Building', `${fmt.pct(o.done)} done`, left(o)))}"><span class="corner">${i + 1}</span><span class="corner r acc">${gl(o.paused ? 'pause' : 'hammer')}</span><span class="art">${S4.artImg(S4.classOf(o.design), 104, 34)}</span>${nm(o.name)}${meter(o.done, '', 'full')}<span class="dim note">${o.paused ? 'paused' : left(o)}</span></button>`).join('')}</div>` : `<p class="none" style="margin-bottom:6px">${yards ? 'No ships are being built. Pick a locked design below and add it.' : 'This site has no yard.'}</p>`}
      <h3>${gl('ship', 'sm')}Designs <small class="dim">${designs.length} locked</small></h3>
      ${designs.length ? `<div class="grid">${designs.map(d => { const ds = S4.designStats(d, () => true), c = Object.entries(ds.cost).sort((a, b) => b[1] - a[1]); return `<button class="tile bld ${design === d ? 'sel' : ''}" data-act="ypick" data-id="${d.id}" data-tip="${esc(T(d.name, `${roleName(d.role)}, built at the ${S4.yardName(d.yard).toLowerCase()}`, dl(`Dry mass ${fmt.mass(ds.dryMass)}`), ds.main ? `Delta-v ${S4.kms(ds.main.deltaV)} at design load` : '!No drive'))}"><span class="corner">${roleName(d.role).split(' ')[0]}</span><span class="art">${S4.artImg(d, 100, 34)}</span>${nm(d.name)}<span class="costs">${c.slice(0, 3).map(([m]) => mi(m, 1)).join('')}${c.length > 3 ? `<span class="dim" style="font-size:14px;align-self:center">+${c.length - 3}</span>` : ''}</span></button>`; }).join('')}</div>` : '<p class="none">No locked design. Lock one on the Ship classes screen.</p>'}</div>
      <div class="side">${sel ? `<div class="card"><header>${S4.artImg(S4.classOf(sel.design), 60, 22)}<div><div class="t">${esc(sel.name)}</div><div class="s">order ${q.indexOf(sel) + 1}, ${sel.paused ? 'paused' : 'building'}</div></div></header><div class="cb"><div class="row">${pill('yard', S4.yardName(sel.yard))}${pill('clock', left(sel), '', 'Time left')}</div>${meter(sel.done, '', 'thick full')}
        <div class="btns"><button data-act="yup" ${q.indexOf(sel) <= 0 ? 'disabled' : ''}>${gl('up')}Up</button><button data-act="ydown" ${q.indexOf(sel) >= q.length - 1 ? 'disabled' : ''}>${gl('down')}Down</button><button data-act="ypause">${gl(sel.paused ? 'play' : 'pause')}${sel.paused ? 'Resume' : 'Pause'}</button><button data-act="yrem">${gl('trash')}Remove</button></div></div></div>` : ''}
        ${design ? `<div class="card"><header>${S4.artImg(design, 60, 22)}<div><div class="t">${esc(design.name)}</div><div class="s">${S4.yardName(design.yard)}</div></div></header><div class="cb">
          <div class="row">${pill('box', fmt.mass(st.dryMass), '', 'Dry mass')}${st.main ? pill('rocket', S4.kms(st.main.deltaV), '', 'Delta-v at design load') : ''}${pill('yard', `${yards} standing`, yards ? 'cool' : 'hot', 'Yards at this site')}</div>
          <div><span class="lbl">Cost for one, have / need</span>${haveRow(st.cost, ES.yardQty, s)}</div>
          <div class="row"><label class="field">Quantity <input id="yqty" type="number" min="1" value="${ES.yardQty}" style="width:60px"></label><button data-act="yadd" ${yards ? '' : 'disabled'}>${gl('plus')}Add to queue</button></div></div></div>` : ''}</div>`;
  }

  const atSite = (v, s) => !v.trip && v.at.kind === 'site' && v.at.site === s.id;
  function launchPlan(s) {
    const stages = ES.stages.map(id => F.vessels.find(v => v.id === id)).filter(Boolean);
    if (!stages.length) return null;
    const full = stages.map(v => { const st = S4.statsOf(v), k = st.main && st.main.propellant; return { v, st, prop: k ? st.capacity[k] || 0 : 0, k }; });
    const payloadMass = ES.payload === 'cargo' ? Object.values(ES.cargo).reduce((a, b) => a + b, 0) : ES.payload === 'ship' && ES.payloadShip ? S4.statsOf(F.vessels.find(v => v.id === ES.payloadShip)).dryMass : 0;
    let dv = 0, above = payloadMass;
    const wet = full.map(x => x.st.dryMass + x.prop), out = [];
    for (let i = full.length - 1; i >= 0; i--) { out[i] = { above }; above += wet[i]; }
    const liftoffMass = above;
    const res = full.map((x, i) => { const m1 = x.st.dryMass + out[i].above, d = x.st.main ? S4.dvOf(x.st.main.isp, m1 + x.prop, m1) : 0; return { ...x, dv: d, dry: x.st.dryMass, mass0: m1 + x.prop }; });
    let orbit = -1, acc = 0;
    res.forEach((r, i) => { acc += r.dv; if (orbit < 0 && acc >= S4.EARTH_TO_ORBIT) orbit = i; r.fate = orbit === i ? 'orbit' : orbit >= 0 ? 'carried' : (r.st.lines.some(l => l.component === 'landing_legs') ? 'returns' : 'expended'); });
    dv = acc;
    const first = res[0], thrust = first.st.main ? first.st.main.thrustSeaLevel : 0, twr = thrust / (liftoffMass * S4.GRAV.earth);
    const burned = res.filter(r => r.fate !== 'carried').reduce((a, r) => a + r.prop, 0) * (orbit >= 0 ? .92 : 1);
    const draw = {}; for (const r of res) if (r.k) for (const [m, sh] of Object.entries(S4.PROPELLANTS[r.k].mix)) draw[m] = (draw[m] || 0) + r.prop * sh;
    const reasons = [];
    if (dv < S4.EARTH_TO_ORBIT) reasons.push(`Delta-v ${S4.kms(dv)} is short of the ${S4.kms(S4.EARTH_TO_ORBIT)} orbit takes.`);
    if (twr < 1.2) reasons.push(`Thrust to weight at lift-off is ${twr.toFixed(2)}; 1.2 is needed.`);
    return { stages: res, dv, need: S4.EARTH_TO_ORBIT, liftoffMass, liftoffThrust: thrust, twr, payloadMass, leftover: Math.max(0, res.reduce((a, r) => a + r.prop, 0) - burned), burned, draw, reasons, ok: !reasons.length };
  }
  const FATE = { orbit: ['check', 'acc', 'reaches orbit'], carried: ['up', 'dim', 'carried to orbit'], returns: ['down', 'cool', 'lands back'], expended: ['cross', 'hot', 'expended'] };
  function launch(f, s) {
    const pads = S4.standing('launch_site', s), free = F.vessels.filter(v => atSite(v, s) && !ES.stages.includes(v.id)), plan = launchPlan(s);
    const fr = (ic, l, v, cls = '') => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v ${cls}">${v}</span></div>`;
    const stocked = D.mats.filter(m => (s.stock[m.id] || 0) > 0 && !m.unit).map(m => m.id).slice(0, 60);
    const main = !pads ? `<p class="none">${esc(s.name)} has no launch site, so nothing launches from here.</p>` : `
      ${plan ? `<div class="grid m" style="margin-bottom:6px">${plan.stages.map((r, i) => `<div class="tile q" data-tip="${esc(T(`Stage ${i + 1}: ${r.v.name}`, FATE[r.fate][2], `Dry mass ${fmt.mass(r.dry)}`, `Propellant ${fmt.mass(r.prop)}`, `Ignition mass ${fmt.mass(r.mass0)}`, `Delta-v ${S4.kms(r.dv)}`))}"><span class="corner">${i + 1}</span><span class="corner r ${FATE[r.fate][1]}">${gl(FATE[r.fate][0])}</span><span class="art">${S4.artImg(S4.classOf(r.v.design), 104, 34)}</span>${nm(r.v.name)}<span class="n">${S4.kms(r.dv)}</span><span class="note ${r.fate === 'expended' ? 'hot' : r.fate === 'returns' ? 'cool' : 'dim'}">${FATE[r.fate][2]}</span></div>`).join('')}</div>` : '<p class="none">The stack is empty. Add the first stage, then the stages above it. Ships are built on the Shipyard tab.</p>'}
      <div class="btns" style="margin-bottom:4px"><button data-act="lpop" ${ES.stages.length ? '' : 'disabled'}>${gl('minus')}Remove top stage</button><button data-act="lclear" ${ES.stages.length ? '' : 'disabled'}>${gl('trash')}Clear</button></div>
      <h3>${gl('ship', 'sm')}Ships at the pad <small class="dim">${free.length}</small></h3>
      ${free.length ? `<div class="grid m" style="margin-bottom:6px">${free.map(v => shipTile(v, false, 'lstage')).join('')}</div>` : '<p class="none">No free ship here. Click a ship to add it as the next stage.</p>'}
      <h3>${gl('box', 'sm')}Payload</h3>
      <div class="filters">${[['none', 'None', ''], ['cargo', 'Cargo', 'box'], ['ship', 'A ship', 'ship']].map(([id, l, ic]) => `<button class="${ES.payload === id ? 'on' : ''}" data-act="lpay" data-id="${id}">${ic ? gl(ic, 'sm') : ''}${l}</button>`).join('')}</div>
      ${ES.payload === 'cargo' ? `<div class="row"><label class="field">Material <select id="lmat">${stocked.map(m => `<option value="${m}" ${m === ES.cargoMat ? 'selected' : ''}>${esc(short(m))}</option>`).join('')}</select></label><label class="field">Kilograms <input id="lkg" type="number" min="0" value="${ES.cargoKg}" style="width:100px"></label><button data-act="lcargo">${gl('plus')}Add cargo</button><button data-act="lcargoclr" ${Object.keys(ES.cargo).length ? '' : 'disabled'}>${gl('trash')}Clear cargo</button></div>${Object.keys(ES.cargo).length ? `<div class="eq">${Object.entries(ES.cargo).map(([m, kg]) => `<span class="rate">${mi(m, 2)}<span>${fmt.mass(kg)}</span></span>`).join('')}</div>` : ''}` : ''}
      ${ES.payload === 'ship' ? (free.length ? `<div class="grid m">${free.map(v => shipTile(v, ES.payloadShip === v.id, 'lship')).join('')}</div>` : '<p class="none">No free ship here to carry.</p>') : ''}`;
    const log = F.launches.slice().reverse().slice(0, 12).map(l => `<div class="logrow">${pill('clock', l.at)}<span>${esc(l.stages.join(' + '))}</span>${pill('box', fmt.mass(l.payload), '', 'Payload')}${pill('flame', fmt.mass(l.propellant), '', 'Propellant')}<span class="dim">${l.returned} back, ${l.lost} lost</span></div>`).join('');
    return `<div class="main">${S4.sketchUI && s === E ? S4.sketchUI.launchSection() : ''}<h3>${gl('rocket', 'sm')}Launch stack <small class="dim">${pads > 0 ? `${Math.max(0, pads - 1)} of ${pads} pads free` : 'no launch site'}</small></h3>${main}
      <h3>${gl('list', 'sm')}Launches <small class="dim">${F.launches.length}</small></h3>${F.launches.length ? `<div class="flow">${log}</div>` : '<p class="none">Nothing has launched yet.</p>'}</div>
      <div class="side">${pads ? `<div class="card"><header>${plan ? S4.artImg(S4.classOf(plan.stages[0].v.design), 60, 22) : ''}<div><div class="t">Launch plan</div><div class="s">${plan ? `${plan.stages.length} ${plan.stages.length === 1 ? 'stage' : 'stages'}` : 'no stack yet'}</div></div></header><div class="cb">
        ${plan ? `<div><span class="lbl">Delta-v, against what orbit needs</span>${meter(plan.dv / plan.need, plan.dv >= plan.need ? 'cool' : 'hot', 'thick full')}<div class="flow" style="margin-top:4px">${fr('rocket', 'Delta-v', `${S4.kms(plan.dv)} of ${S4.kms(plan.need)}`, plan.dv >= plan.need ? '' : 'hot')}</div></div>
          <div><span class="lbl">Lift-off</span><div class="flow">${fr('box', 'Lift-off mass', fmt.mass(plan.liftoffMass))}${fr('up', 'Lift-off thrust', fmt.thrust(plan.liftoffThrust))}${fr('gear', 'Thrust to weight', `${plan.twr.toFixed(2)}, first stage only`)}</div></div>
          <div><span class="lbl">Payload and propellant</span><div class="flow">${fr('box', 'Payload', fmt.mass(plan.payloadMass))}${fr('check', 'Left in orbit', fmt.mass(plan.leftover))}${fr('flame', 'Propellant burned', fmt.mass(plan.burned))}</div></div>
          <div><span class="lbl">Taken from stock</span><div class="eq">${Object.entries(plan.draw).map(([m, kg]) => `<span class="rate" data-tip="${esc(S4.matTip(m) + '\nDrawn ' + fmt.mass(kg))}">${mi(m, 1)}<span>${fmt.mass(kg)}</span></span>`).join('')}</div></div>
          ${plan.reasons.length ? `<div class="flow">${plan.reasons.map(r => `<div class="hot">${gl('warn', 'xs')} ${esc(r)}</div>`).join('')}</div>` : ''}
          <div class="row"><button data-act="lgo" ${plan.ok ? '' : 'disabled'}>${gl('rocket')}Launch</button>${plan.ok ? '' : '<span class="hot">refused</span>'}</div>`
        : '<p class="dim" style="margin:0">Click ships under Ships at the pad to build the stack, first stage first.</p>'}</div></div>` : ''}</div>`;
  }

  const VKINDS = [['trip', 'rocket', 'On a trip'], ['site', 'yard', 'Docked or landed at a site'], ['orbit', 'ship', 'Free in orbit'], ['blocked', 'warn', 'Blocked']];
  const kindsOf = v => [v.trip ? 'trip' : v.at.kind, ...(v.blocked ? ['blocked'] : [])];
  const ORDER_TYPES = [['load', 'Load'], ['unload', 'Unload'], ['dock', 'Dock'], ['survey', 'Survey'], ['sample', 'Sample'], ['wait', 'Wait']];
  const PROFILES = [['cheapest', 'Cheapest'], ['balanced', 'Balanced'], ['fastest', 'Fastest']];
  const orderLabel = o => o.type === 'dock' ? `Dock at ${S4.siteName(o.site)}` : o.type === 'load' ? `Load ${o.item}` : o.type === 'unload' ? `Unload ${o.item}` : o.type === 'wait' ? `Wait ${o.hours} h` : o.type === 'survey' ? `Survey ${o.body}` : o.type === 'sample' ? 'Take a sample' : `Fly to ${o.to}`;
  const DEST = { Sites: () => S4.sites.map(s => [s.id, s.name]), Planets: () => [['earth', 'Earth'], ['mars', 'Mars'], ['venus', 'Venus']], 'Moons of Earth': () => [['luna', 'Luna']] };

  function shipsTab() {
    const vs = F.vessels, shown = ES.vkind === 'all' ? vs : vs.filter(v => kindsOf(v).includes(ES.vkind));
    const v = vs.find(x => x.id === ES.vessel) || vs[0];
    const chips = [['all', 'All', vs.length, ''], ...VKINDS.filter(([k]) => vs.some(x => kindsOf(x).includes(k))).map(([k, ic, tip]) => [k, '', vs.filter(x => kindsOf(x).includes(k)).length, ic, tip])];
    let side = '<div class="card"><header><div><div class="t">No ship selected</div><div class="s">build one on the Shipyard tab</div></div></header></div>';
    if (v) {
      const st = S4.statsOf(v), cls = S4.classOf(v.design);
      const props = Object.entries(v.propellant).filter(([, kg]) => kg > 0), cargo = Object.entries(v.cargo).filter(([, kg]) => kg > 0);
      const items = [...S4.PROP_KINDS.filter(k => st.capacity[k]).map(k => S4.PROPELLANTS[k].name), ...D.mats.filter(m => (here().stock[m.id] || 0) > 0 && !m.unit).slice(0, 30).map(m => short(m.id)), 'Crew'];
      const row = Math.min(ES.orderRow, Math.max(0, v.orders.length - 1));
      const dests = (DEST[ES.tripGroup] || DEST.Sites)();
      side = `<div class="card"><header>${S4.artImg(cls, 60, 22)}<div><div class="t">${esc(v.name)}</div><div class="s">${esc(cls.name)}, ${esc(S4.vesselWhere(v))}</div></div></header><div class="cb">
        <div class="row">${st.main ? pill('rocket', S4.kms(st.main.deltaV), '', 'Delta-v at design load') : pill('warn', 'No drive', 'hot')}${pill('people', `${v.crew} of ${st.berths}`, '', 'Crew and berths')}${pill('box', fmt.mass(st.dryMass), '', 'Dry mass')}</div>
        ${v.blocked ? `<p class="hot" style="margin:0">${esc(v.blocked)}</p>` : ''}
        <div><span class="lbl">Propellant</span>${props.length ? `<div class="eq">${props.map(([k, kg]) => `<span class="rate" data-tip="${esc(S4.PROPELLANTS[k].name + '\n' + fmt.mass(kg))}">${mi(S4.propIcon(k), 1)}<span>${fmt.mass(kg)}</span></span>`).join('')}</div>` : '<span class="dim">None</span>'}</div>
        <div><span class="lbl">Cargo</span>${cargo.length ? `<div class="eq">${cargo.map(([m, kg]) => `<span class="rate" data-tip="${esc(S4.matTip(m))}">${mi(m, 1)}<span>${fmt.mass(kg)}</span></span>`).join('')}</div>` : '<span class="dim">Empty</span>'}</div>
        <div><span class="lbl">Orders</span>${v.orders.length ? `<div class="orders">${v.orders.map((o, i) => `<button class="ord ${i === row ? 'on' : ''}" data-act="ordrow" data-id="${i}"><span class="dim">${i + 1}</span>${esc(orderLabel(o))}</button>`).join('')}</div>` : '<span class="dim">No orders.</span>'}
          <div class="btns" style="margin-top:4px"><button data-act="ordup" ${row <= 0 || !v.orders.length ? 'disabled' : ''}>${gl('up')}Up</button><button data-act="orddown" ${row >= v.orders.length - 1 ? 'disabled' : ''}>${gl('down')}Down</button><button data-act="ordrem" ${v.orders.length ? '' : 'disabled'}>${gl('trash')}Remove</button><button data-act="ordclr" ${v.orders.length ? '' : 'disabled'}>Clear</button></div></div>
        <div><span class="lbl">Add an order</span><div class="filters">${ORDER_TYPES.map(([id, l]) => `<button class="${ES.orderType === id ? 'on' : ''}" data-act="otype" data-id="${id}">${l}</button>`).join('')}</div>
          <div class="row">${ES.orderType === 'load' || ES.orderType === 'unload' ? `<label class="field">Item <select id="oitem">${items.map(i => `<option>${esc(i)}</option>`).join('')}</select></label><label class="field"><input type="checkbox" checked> All</label><label class="field">Kilograms <input type="number" value="1000" disabled style="width:80px"></label>`
            : ES.orderType === 'dock' ? `<label class="field">At <select id="odock">${S4.sites.filter(s => s.place === 'orbit').map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>`
              : ES.orderType === 'survey' ? `<label class="field">Group <select><option>Planets</option></select></label><label class="field">Body <select><option>Mars</option></select></label>`
                : ES.orderType === 'wait' ? `<label class="field">Hours <input id="ohours" type="number" value="24" style="width:60px"></label>` : ''}<button data-act="oadd">${gl('plus')}Add order</button></div></div>
        <div><span class="lbl">Trip</span><div class="row"><label class="field">Group <select id="tgroup">${Object.keys(DEST).map(g => `<option ${g === ES.tripGroup ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label></div>
          <div class="row"><label class="field">To <select id="tto">${dests.map(([id, n]) => `<option value="${id}" ${id === ES.tripTo ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label></div>
          <div class="filters">${PROFILES.map(([id, l]) => `<button class="${ES.profile === id ? 'on' : ''}" data-act="tprof" data-id="${id}">${l}</button>`).join('')}</div>
          <div class="btns"><button data-act="tplan" ${v.trip ? 'disabled' : ''}>${gl('clock')}Plan trip</button><button data-act="tfly" ${ES.planned === v.id && !v.trip ? '' : 'disabled'}>${gl('rocket')}Fly</button></div>
          ${ES.planned === v.id && !v.trip ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,86px);gap:4px;margin-top:6px">${[['cheapest', 2, 5.1, 3.2], ['balanced', 1, 3.4, 4.1], ['fastest', 1, 2.2, 5.6]].map(([id, dep, dur, dv]) => `<button class="tile cmp ${ES.profile === id ? 'sel' : ''}" data-act="tprof" data-id="${id}" data-tip="${esc(T(PROFILES.find(p => p[0] === id)[1], `Departs in ${dep} d`, `Takes ${dur} d`, `Delta-v ${dv.toFixed(2)} km/s`, 'Can stop at the target', 'Can come back', '~mock figures'))}"><span class="corner">${dep} d</span>${mi('lch4', 1)}${nm(PROFILES.find(p => p[0] === id)[1])}<span class="st">${dur} d</span><span class="dim" style="font-size:14px">${dv.toFixed(2)} km/s</span></button>`).join('')}</div>` : ''}</div>
      </div></div>`;
    }
    return `<div class="main"><h3>${gl('ship', 'sm')}Ships <small class="dim">${vs.length}</small></h3>
      ${vs.length ? `<div class="filters">${chips.map(([id, l, n, ic, tip]) => `<button class="${ES.vkind === id ? 'on' : ''}" data-act="vkind" data-id="${id}" ${tip ? `data-tip="${esc(tip)}"` : ''}>${ic ? gl(ic, 'sm') : ''}${l}${l ? ' ' : ''}${n}</button>`).join('')}</div><div class="grid m">${shown.map(x => shipTile(x, v && x.id === v.id, 'vsel')).join('')}</div>` : '<p class="none">No ships yet. Build one on the Shipyard tab.</p>'}</div>
      <div class="side">${side}</div>`;
  }

  function supplyRows(s, f) {
    const want = {};
    for (const o of s.queue) for (const [m, v] of Object.entries(D.bld[o.building].cost)) want[m] = (want[m] || 0) + v / S4.buildHours(o.building);
    for (const a of f.actors) for (const [m, v] of Object.entries(a.inp || {})) want[m] = (want[m] || 0) + v;
    if (s.pop > 0) want.food_ration = (want.food_ration || 0) + s.pop * s.kcalPerPersonDay / 24 / S4.KCAL.food_ration;
    return Object.entries(want).map(([m, need]) => ({ material: m, need, made: f.out[m] || 0, stock: s.stock[m] || 0 }));
  }
  function supply(f, s) {
    if (s === E) return `<div class="main"><h3>${gl('box', 'sm')}Make or import <small class="dim">${esc(s.name)}</small></h3><p class="none">Earth makes what it needs. Pick a site off Earth in the list to see what it would cost to import.</p>
      <h3>${gl('rocket', 'sm')}Supply runs <small class="dim">0</small></h3><p class="none">No supply runs.</p></div><div class="side"><div class="card"><header><div><div class="t">Supply</div><div class="s">select a material tile</div></div></header><div class="cb"><p class="dim" style="margin:0">Pick what the site needs to see where it could come from.</p></div></div></div>`;
    const rows = supplyRows(s, f), row = rows.find(r => r.material === ES.supplyMat) || rows[0];
    const runs = F.vessels.filter(v => v.run && v.run.to === s.id);
    const freighters = F.vessels.filter(v => !v.trip && !v.run && S4.statsOf(v).payloadCapacity > 0).slice(0, 4);
    const ship = freighters.find(v => v.id === ES.supplyShip) || freighters[0];
    const cap = ship ? S4.statsOf(ship).payloadCapacity : 0, load = Math.min(cap, ES.supplyKg || cap);
    const tile = r => { const sh = r.made + 1e-9 < r.need; return `<button class="tile stk ${row === r ? 'sel' : ''} ${sh && r.stock <= 0 ? 'warn' : ''}" data-act="smat" data-id="${r.material}" data-tip="${esc(T(short(r.material), `Needed ${fmt.amount(r.material, r.need * P().hours)} ${P().word}`, `Made here ${fmt.amount(r.material, r.made * P().hours)} ${P().word}`, `In stock ${fmt.amount(r.material, r.stock)}`))}"><span class="trend ${sh ? 'hot' : 'cool'}">${gl(sh ? 'down' : 'up')}</span>${mi(r.material, 2)}${nm(short(r.material))}<span class="amt">${fmt.amount(r.material, r.stock)}</span><span class="net ${sh ? 'hot' : 'cool'}">${fmt.signed(r.material, (r.made - r.need) * P().hours)}/${P().unit}</span>${meter(r.need > 0 ? Math.min(1, r.made / r.need) : 1, sh ? 'hot' : 'cool', 'full')}</button>`; };
    return `<div class="main"><h3>${gl('box', 'sm')}Make or import <small class="dim">${esc(s.name)}</small></h3>
      ${rows.length ? `<div class="grid s" style="margin-bottom:6px">${rows.map(tile).join('')}</div>` : `<p class="none">${esc(s.name)} needs nothing yet that a ship could bring.</p>`}
      <h3>${gl('rocket', 'sm')}Supply runs <small class="dim">${runs.length}</small></h3>${runs.length ? `<div class="grid m">${runs.map(v => `<div class="tile q" data-tip="${esc(T(v.name, `${short(v.run.item)}, ${fmt.mass(v.run.amount)} a trip`, `${S4.siteName(v.run.from)} to ${S4.siteName(v.run.to)}`))}"><span class="art">${mi(v.run.item, 2)}</span>${nm2(v.name, short(v.run.item))}<span class="n">${fmt.mass(v.run.amount)}</span><span class="dim note">${v.trip ? 'On a trip' : 'Handling cargo'}</span><button class="stop" data-act="srunstop" data-id="${v.id}">${gl('cross', 'xs')}Stop</button></div>`).join('')}</div>` : '<p class="none">No supply runs.</p>'}</div>
      <div class="side">${row ? `<div class="card"><header>${mi(row.material, 2)}<div><div class="t">${esc(short(row.material))}</div><div class="s">for ${esc(s.name)}</div></div></header><div class="cb">
        <div class="row">${pill('down', fmt.amount(row.material, row.need * P().hours), '', `Needed ${P().word}`)}${pill('up', fmt.amount(row.material, row.made * P().hours), row.made + 1e-9 < row.need ? 'hot' : 'cool', `Made here ${P().word}`)}${pill('box', fmt.amount(row.material, row.stock), '', 'In stock')}</div>
        <div><span class="lbl">Source</span><select><option>Earth</option></select><div class="row" style="margin-top:4px">${pill('flame', '23,101 kg/t', '', 'Propellant a tonne')}${pill('clock', '-', '', 'Trip')}${pill('box', fmt.amount(row.material, E.stock[row.material] || 0), '', 'In stock there')}</div><p class="dim" style="margin:4px 0 0">Launch stack: The last stack launched with a full load.</p></div>
        <div><span class="lbl">Ship</span>${freighters.length ? `<div class="grid m" style="gap:4px">${freighters.map(v => shipTile(v, ship === v, 'sship')).join('')}</div>` : '<p class="dim" style="margin:0">No idle freighter.</p>'}</div>
        <div class="row"><label class="field">Kilograms a trip <input id="skg" type="number" min="0" value="${Math.round(ES.supplyKg)}" style="width:90px"></label><button data-act="srun" ${ship ? '' : 'disabled'}>${gl('rocket')}Start supply run</button></div>
        ${ship ? `<span class="dim">Takes ${fmt.mass(load)} a trip in ${esc(ship.name)}</span>` : ''}</div></div>` : `<div class="card"><header><div><div class="t">Supply</div><div class="s">select a material tile</div></div></header></div>`}</div>`;
  }

  function perToggle() {
    return `<span class="per" data-tip="${esc(T('Rates', dl('Every rate on the economy screens is shown over this period.')))}"><small>rates a</small>${Object.values(S4.PER).map(p => `<button class="${S4.per.key === p.name ? 'on' : ''}" data-act="per" data-id="${p.name}">${p.name}</button>`).join('')}</span>`;
  }

  function render() {
    const root = document.getElementById('view');
    const s = here(), f = S4.flows(s); S4.lastFlows = f;
    const sc = [...root.querySelectorAll('.main, .side')].map(e => e.scrollTop);
    const body = (S4.sketchUI && S4.sketchUI.etab(ES.tab, f, s)) || { summary, production, construction, stockpiles, people, yard, launch, ships: shipsTab, supply }[ES.tab](f, s);
    root.style.gridTemplateColumns = '300px minmax(0,1fr)';
    root.innerHTML = `<div class="stack">${sitesPanel()}</div><div class="pan grow"><h2>${esc(s.name)} <small>Sol</small>${perToggle()}</h2><div class="pb tb"><div class="tabs">${TABS.map(([id, n, ic]) => `<button class="${ES.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${gl(ic)}${n}</button>`).join('')}</div><div class="split tabbody">${body}</div></div></div>`;
    [...root.querySelectorAll('.main, .side')].forEach((e, i) => { if (sc[i]) e.scrollTop = sc[i]; });
    S4.chipsOnly();
  }

  function act(a, id) {
    const s = here(), find = i => s.groups.find(g => g.id === +i), v = F.vessels.find(x => x.id === ES.vessel) || F.vessels[0];
    const q = F.yard[s.id] = F.yard[s.id] || [];
    const H = {
      tab: () => { ES.tab = id; },
      site: () => { S4.cur.site = id; history.replaceState(null, '', '#economy/' + ES.tab + (id === 'earth' ? '' : '/' + id)); ES.group = null; ES.order = null; ES.side = 'pick'; ES.stages = []; },
      grp: () => { ES.group = +id; ES.target = null; const g = find(id); ES.num = g ? g.count : 1; },
      kind: () => { ES.kind = id; }, bkind: () => { ES.bkind = id; }, cat: () => { ES.cat = id; }, empty: () => { ES.empty = !ES.empty; }, mat: () => { ES.mat = id; ES.tab = ES.tab === 'summary' ? 'stockpiles' : ES.tab; },
      target: () => { ES.target = id; },
      tgl: () => { const g = find(ES.group) || s.groups[0]; if (g) g.on = !g.on; },
      all: () => { const g = find(ES.group); if (g) ES.num = g.count; },
      switch: () => {
        const g = find(ES.group); if (!g) return;
        const others = S4.choicesFor(g.building).filter(c => c.id !== g.process), t = others.find(c => c.id === ES.target) || others[0];
        const n = Math.max(1, Math.min(g.count, +document.getElementById('num').value || g.count));
        if (!t) return;
        if (n >= g.count) g.process = t.id;
        else { g.count -= n; const ng = { id: s.uid++, building: g.building, process: t.id, count: n, on: true }; s.groups.splice(s.groups.indexOf(g) + 1, 0, ng); ES.group = ng.id; }
        ES.target = null; ES.num = n;
      },
      bpick: () => { ES.pick = id; ES.side = 'pick'; ES.recipe = null; },
      recipe: () => { ES.recipe = id; },
      qsel: () => { ES.order = +id; ES.side = 'order'; if (ES.tab === 'summary') ES.tab = 'construction'; },
      badd: () => { const n = Math.max(1, +document.getElementById('qty').value || 1); ES.qty = n; let o; for (let i = 0; i < n; i++) { o = { id: s.qid++, building: ES.pick, process: ES.recipe || null, done: 0, paused: false }; s.queue.push(o); } ES.order = o.id; ES.side = 'order'; },
      qup: () => { const i = s.queue.findIndex(o => o.id === ES.order); if (i > 0) [s.queue[i - 1], s.queue[i]] = [s.queue[i], s.queue[i - 1]]; },
      qdown: () => { const i = s.queue.findIndex(o => o.id === ES.order); if (i >= 0 && i < s.queue.length - 1) [s.queue[i + 1], s.queue[i]] = [s.queue[i], s.queue[i + 1]]; },
      qpause: () => { const o = s.queue.find(o => o.id === ES.order); if (o) o.paused = !o.paused; },
      qrem: () => { s.queue = s.queue.filter(o => o.id !== ES.order); ES.order = null; ES.side = 'pick'; },
      per: () => { S4.per.key = id; },
      ysel: () => { ES.yardOrder = +id; }, ypick: () => { ES.yardPick = id; ES.yardOrder = null; },
      yadd: () => { const n = Math.max(1, +document.getElementById('yqty').value || 1), d = S4.classOf(ES.yardPick) || F.classes.find(c => c.locked); for (let i = 0; i < n; i++) q.push({ id: F.yard.qid++, design: d.id, name: d.name, yard: d.yard, done: 0, paused: false }); },
      yup: () => { const i = q.findIndex(o => o.id === ES.yardOrder); if (i > 0) [q[i - 1], q[i]] = [q[i], q[i - 1]]; },
      ydown: () => { const i = q.findIndex(o => o.id === ES.yardOrder); if (i >= 0 && i < q.length - 1) [q[i + 1], q[i]] = [q[i], q[i + 1]]; },
      ypause: () => { const o = q.find(o => o.id === ES.yardOrder); if (o) o.paused = !o.paused; },
      yrem: () => { F.yard[s.id] = q.filter(o => o.id !== ES.yardOrder); ES.yardOrder = null; },
      lstage: () => { ES.stages.push(id); }, lpop: () => { ES.stages.pop(); }, lclear: () => { ES.stages = []; },
      lpay: () => { ES.payload = id; }, lship: () => { ES.payloadShip = id; },
      lcargo: () => { const m = document.getElementById('lmat').value, kg = Math.max(0, +document.getElementById('lkg').value || 0); ES.cargoMat = m; ES.cargoKg = kg; ES.cargo[m] = (ES.cargo[m] || 0) + kg; },
      lcargoclr: () => { ES.cargo = {}; },
      lgo: () => {
        const plan = launchPlan(s); if (!plan || !plan.ok) return;
        for (const r of plan.stages) {
          if (r.fate === 'orbit' || r.fate === 'carried') { r.v.at = { kind: 'orbit', body: s.world }; if (r.fate === 'orbit' && r.k) r.v.propellant = { [r.k]: plan.leftover }; if (r.fate === 'orbit') r.v.cargo = { ...ES.cargo }; }
          else if (r.fate === 'returns') r.v.propellant = {};
          else F.vessels.splice(F.vessels.indexOf(r.v), 1);
        }
        F.launches.push({ at: S4.clockText().split(' ').slice(0, 2).reverse().join(' '), stages: plan.stages.map(r => r.v.name), payload: plan.payloadMass, propellant: plan.burned, returned: plan.stages.filter(r => r.fate === 'returns').length, lost: plan.stages.filter(r => r.fate === 'expended').length });
        ES.stages = []; ES.cargo = {};
      },
      vsel: () => { ES.vessel = id; ES.orderRow = 0; ES.planned = null; }, vkind: () => { ES.vkind = id; },
      ordrow: () => { ES.orderRow = +id; },
      ordup: () => { const i = ES.orderRow; if (i > 0) { [v.orders[i - 1], v.orders[i]] = [v.orders[i], v.orders[i - 1]]; ES.orderRow--; } },
      orddown: () => { const i = ES.orderRow; if (i < v.orders.length - 1) { [v.orders[i + 1], v.orders[i]] = [v.orders[i], v.orders[i + 1]]; ES.orderRow++; } },
      ordrem: () => { v.orders.splice(ES.orderRow, 1); ES.orderRow = Math.max(0, ES.orderRow - 1); },
      ordclr: () => { v.orders = []; v.run = null; },
      otype: () => { ES.orderType = id; },
      oadd: () => {
        const t = ES.orderType;
        if (t === 'dock') v.orders.push({ type: 'dock', site: document.getElementById('odock').value });
        else if (t === 'load' || t === 'unload') v.orders.push({ type: t, item: document.getElementById('oitem').value });
        else if (t === 'wait') v.orders.push({ type: 'wait', hours: +document.getElementById('ohours').value || 24 });
        else if (t === 'survey') v.orders.push({ type: 'survey', body: 'Mars' });
        else v.orders.push({ type: 'sample' });
      },
      tprof: () => { ES.profile = id; }, tplan: () => { ES.planned = v.id; },
      tfly: () => { const to = (DEST[ES.tripGroup] || DEST.Sites)().find(d => d[0] === ES.tripTo) || ['', 'Earth orbit']; v.trip = { to: to[1], left: ES.profile === 'fastest' ? 2.2 : ES.profile === 'balanced' ? 3.4 : 5.1, total: 5.1 }; ES.planned = null; },
      smat: () => { ES.supplyMat = id; }, sship: () => { ES.supplyShip = id; },
      srun: () => { const fl = S4.flows(s), row = supplyRows(s, fl).find(r => r.material === ES.supplyMat) || supplyRows(s, fl)[0], sh = F.vessels.find(x => x.id === ES.supplyShip) || F.vessels.find(x => !x.trip && !x.run && S4.statsOf(x).payloadCapacity > 0); if (row && sh) sh.run = { item: row.material, amount: ES.supplyKg || S4.statsOf(sh).payloadCapacity, from: 'earth', to: s.id }; },
      srunstop: () => { const x = F.vessels.find(y => y.id === id); if (x) x.run = null; }
    };
    if (H[a]) { H[a](); render(); }
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'economy') return;
    const t = e.target.closest('[data-act]');
    if (t && document.getElementById('view').contains(t)) act(t.dataset.act, t.dataset.id);
  });
  document.addEventListener('input', e => {
    if (S4.screen !== 'economy') return;
    if (e.target.id === 'num') { ES.num = Math.max(1, +e.target.value || 1); const b = document.querySelector('[data-act=switch]'); if (b) b.lastChild.textContent = 'Switch ' + fmt.count(ES.num); }
    if (e.target.id === 'qty') ES.qty = Math.max(1, +e.target.value || 1);
    if (e.target.id === 'yqty') ES.yardQty = Math.max(1, +e.target.value || 1);
    if (e.target.id === 'skg') ES.supplyKg = Math.max(0, +e.target.value || 0);
  });
  document.addEventListener('change', e => {
    if (S4.screen !== 'economy') return;
    if (e.target.id === 'tgroup') { ES.tripGroup = e.target.value; ES.tripTo = (DEST[ES.tripGroup] || DEST.Sites)()[0][0]; render(); }
    if (e.target.id === 'tto') ES.tripTo = e.target.value;
  });

  let lastRender = 0;
  S4.advance = dt => {
    for (const s of S4.sites) {
      for (const o of activeOrders(s)) o.done = Math.min(1, o.done + dt / 3600 / S4.buildHours(o.building));
      for (const o of s.queue.filter(o => o.done >= 1)) { const g = s.groups.find(g => g.building === o.building && g.process === o.process); if (g) g.count++; else s.groups.push({ id: s.uid++, building: o.building, process: o.process, count: 1, on: true }); }
      s.queue = s.queue.filter(o => o.done < 1);
    }
    for (const [sid, q] of Object.entries(F.yard)) if (Array.isArray(q)) {
      const o = q.find(x => !x.paused); if (!o) continue;
      const st = S4.designStats(S4.classOf(o.design), () => true);
      o.done = Math.min(1, o.done + dt / 86400 / (2 + .5 * st.dryMass / 1000));
      if (o.done >= 1) { S4.vessel(S4.classOf(o.design), { kind: 'site', site: sid }); q.splice(q.indexOf(o), 1); }
    }
    for (const v of F.vessels) if (v.trip) { v.trip.left -= dt / 86400; if (v.trip.left <= 0) { v.at = { kind: 'orbit', body: /Luna/.test(v.trip.to) ? 'luna' : 'earth' }; v.trip = null; } }
    if (S4.groundAdvance) S4.groundAdvance(dt);
    for (const p of E.programmes) p.progress = Math.min(1, p.progress + dt / 86400 / S4.programmeDays(p.number));
    for (const p of E.programmes.filter(p => p.progress >= 1)) E.done.push(p.number);
    E.programmes = E.programmes.filter(p => p.progress < 1);
    if (Date.now() - lastRender > 900) {
      lastRender = Date.now();
      const typing = document.activeElement && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
      if (typing) return;
      if (S4.screen === 'economy') render(); else if (S4.screen === 'research') S4.research.render(); else if (S4.screen === 'ground') S4.ground.render();
    }
  };

  S4.economy = { render, ES, TABS, msIcon };
})();
