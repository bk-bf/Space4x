'use strict';
(() => {
  const { D, E, fmt, esc, gl, mi, bi, ci, T, dl, meter, short, human } = S4;
  const P = () => S4.perOf();
  const nm2 = (a, b) => `<span class="nm two"><b>${esc(a)}</b><em>${esc(b)}</em></span>`;
  const nm = t => `<span class="nm"><b>${esc(t)}</b></span>`;
  const ES = { tab: 'summary', group: 12, kind: 'all', order: null, pick: 'sabatier_plant', side: 'pick', cat: 'all', mat: 'iron', ms: 3, qty: 1, target: null, bkind: 'all', num: 1 };
  const TABS = [['summary', 'Summary', 'list'], ['production', 'Production', 'factory'], ['construction', 'Construction', 'hammer'], ['stockpiles', 'Stockpiles', 'box'], ['people', 'People', 'people']];
  const kc = k => { const c = S4.KIND[k] || [150, 150, 180]; return `rgb(${c.join(',')})`; };
  const kindGl = { extraction: 'drop', processing: 'flask', power: 'bolt', electronics: 'chip', habitat: 'leaf', infrastructure: 'rocket', nuclear: 'atom', special: 'star' };

  let planetUrl = null;
  function planet() {
    if (planetUrl) return planetUrl;
    const W = 120, im = new S4.Img(W, W), c = (W - 1) / 2, r = W / 2 - 2;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const dx = (x - c) / r, dy = (y - c) / r, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const z = Math.sqrt(1 - d * d), a = Math.atan2(dx, z) + .6, b = Math.asin(dy);
      const px = Math.cos(b) * Math.sin(a), py = Math.sin(b), pz = Math.cos(b) * Math.cos(a);
      const n = fbm(px * 2.2 + 5, py * 2.2 + 2, pz * 2.2 + 1, 5), cl = fbm(px * 3.4 + 9, py * 5 + 4, pz * 3.4, 4);
      let col;
      if (Math.abs(py) > .86 + (n - .5) * .2) col = [232, 240, 250];
      else if (n > .53) col = n > .64 ? [150, 140, 96] : n > .58 ? [84, 150, 82] : [66, 130, 76];
      else col = n > .47 ? [52, 108, 190] : [34, 78, 160];
      if (cl > .6 + (dith(x, y) - .5) * .12) col = cl > .68 ? [244, 246, 252] : [214, 224, 242];
      const light = (-dx * .6 - dy * .5) + z * .55 + .05;
      const f = light > .75 ? 1.12 : light > .45 ? 1 : light > .22 ? .78 : light > .05 ? .56 : .36;
      const dd = dith(x, y) - .5;
      const ff = f + (Math.abs(f - .78) < .001 || Math.abs(f - .56) < .001 ? dd * .1 : 0);
      im.set(x, y, col.map(v => Math.max(0, Math.min(255, v * ff))));
      if (d > .95) im.set(x, y, [120, 170, 255].map((v, i) => v * (.3 + .5 * Math.max(0, light)) + col[i] * .3));
    }
    return planetUrl = im.url();
  }

  const mainOut = a => {
    if (!a.p) return null;
    const e = Object.entries(a.p.outputs).sort((x, y) => y[1] - x[1])[0];
    return e ? e[0] : null;
  };
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

  function sitesPanel() {
    return `<div class="pan"><h2>Sites</h2><div class="pb" style="padding:6px 4px">
      <div class="row" style="display:flex;justify-content:space-between;padding:2px 6px"><b class="pf" style="font-size:14px">Sol</b><span class="dim">1 site, ${fmt.people(E.pop)}</span></div>
      <div class="tile sel" style="flex-direction:row;justify-content:flex-start;gap:8px;width:100%;padding:4px 8px;margin:2px 0;--ec:var(--accent)" data-tip="Earth">
        <img class="px" src="${planet()}" width="30" height="30" style="image-rendering:pixelated"><span style="flex:1;text-align:left">Earth</span><span class="dim">${fmt.people(E.pop)}</span><span class="hot" data-tip="Short of materials">${gl('warn', 'sm')}</span>
      </div></div></div>
      <div class="pan grow"><h2>Earth <small>Sol</small></h2><div class="pb" style="display:flex;flex-direction:column;align-items:center;gap:8px;overflow:hidden">
        <img class="px" src="${planet()}" width="240" height="240" style="outline:2px solid var(--line)">
        <div class="eq" style="justify-content:center"><span class="pill" data-tip="Surface gravity">${gl('down')}1.00 g</span><span class="pill" data-tip="Atmosphere">${gl('drop')}breathable</span><span class="pill" data-tip="Land under farmland">${gl('leaf')}${fmt.count(D.earth.groups.filter(g => g.building === 'farmland').reduce((a, g) => a + g.count, 0))} farms</span></div>
        <span class="tag" style="align-self:flex-start">mock scene</span></div></div>`;
  }

  function kpis(f) {
    const spare = f.power.supply - f.power.demand, fs = f.food.made / f.food.need - 1;
    const k = (ic, big, sub, warn, tip) => `<div class="kpi ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;
    const foodStock = E.food.reduce((a, m) => a + (E.stock[m] || 0) * S4.KCAL[m], 0);
    const perPerson = f.food.made * 24 / E.pop;
    return `<div class="kpis">
      ${k('people', fmt.people(E.pop), `+${(E.growth * 100).toFixed(2)}% a year`, false, T('People', dl('Everyone on Earth. They eat, work and grow in number while fed.'), 'Fed and growing', `Workforce ${fmt.people(f.workers.avail)}`))}
      ${k('grain', (fs >= 0 ? '+' : '') + fmt.pct(fs), `${fmt.group(perPerson)} kcal each a day`, fs < 0, T('Food', dl('Counted in food Calories (kcal). 1 Tcal is a trillion kcal.'), `Need ${fmt.tcal(f.food.need * P().hours)} ${P().word}, ${fmt.group(S4.KCAL_PERSON)} kcal a person a day`, `Made ${fmt.tcal(f.food.made * P().hours)} ${P().word}`, `Stored ${fmt.tcal(foodStock)}`))}
      ${k('bolt', (spare >= 0 ? '+' : '-') + fmt.power(Math.abs(spare)), `demand ${fmt.power(f.power.demand)}`, spare < 0, T('Power', dl('Grid plus generators, against what every running building draws.'), `Grid ${fmt.power(f.power.grid)}`, `Generated ${fmt.power(f.power.gen)}`, `Demand ${fmt.power(f.power.demand)}`))}
      ${k('chip', 'None', 'no data centre yet', false, T('Compute', dl('Cycles for programmes and autonomy. Made by data centres.'), 'Needs a data centre', 'Unlocks with milestone 5'))}
      ${k('gear', fmt.pct(f.workers.share), `${fmt.people(f.workers.need)} needed`, f.workers.share < 1, T('Staffing', dl('Workers available against workers every running building needs.'), `Workforce ${fmt.people(f.workers.avail)}`, `Needed ${fmt.people(f.workers.need)}`))}
    </div>`;
  }

  function prodTile(a, sel) {
    const mo = mainOut(a), w = a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle';
    const idle = a.limit && (a.limit.kind === 'off' || a.limit.kind === 'idle');
    const cls = `tile prod ${sel ? 'sel' : ''} ${w ? 'warn' : ''} ${idle ? 'idle' : ''}`;
    const gen = a.p && a.p.generates;
    const badge = w ? `<span class="corner hot" style="top:3px;left:3px">${gl('warn', 'sm')}</span>` : a.limit && a.limit.kind === 'off' ? `<span class="corner dim" style="top:3px;left:3px">${gl('power', 'sm')}</span>` : '';
    const tip = prodTip(a);
    return `<button class="${cls}" data-act="grp" data-id="${a.g.id}" data-tip="${esc(tip)}">
      <i class="kstripe" style="background:${kc(a.b.kind)}"></i>${badge}
      <span class="art2">${bi(a.g.building, 2, tip)}${mo ? mi(mo, 2, tip) : gen ? `<span style="width:32px;display:flex;justify-content:center;color:var(--accent)">${gl('bolt', 'lg')}</span>` : '<span style="width:32px"></span>'}</span>
      ${nm2(mo ? short(mo) : a.p ? a.p.name : gname(a), gname(a))}
      <span class="foot"><span class="n">${fmt.count(a.g.count)}</span>${a.p ? meter(a.share, w ? 'hot' : '') : `<span class="dim" style="font-size:15px">idle</span>`}</span>
    </button>`;
  }

  function rateRow(items, a, dir) {
    return items.map(([m, v], i) => `${i ? `<span class="plus">${gl('plus', 'xs')}</span>` : ''}<span class="rate" data-tip="${esc(S4.matTip(m))}">${mi(m, 2)}<span>${fmt.amount(m, v * P().hours)}</span></span>`).join('');
  }

  function foodPanel(f) {
    const avail = m => Math.max(0, (f.out[m] || 0) - (f.use[m] || 0) + (f.eat[m] || 0));
    const parts = E.food.filter(m => avail(m) > 0).map(m => [m, avail(m) * S4.KCAL[m]]).sort((a, b) => b[1] - a[1]);
    const made = f.food.made, need = f.food.need, top = Math.max(made, need), pp = made * 24 / E.pop, meat = avail('meat') * S4.KCAL.meat / made;
    return `<h3>${gl('grain', 'sm')}Food, counted in calories <small class="dim">${fmt.group(pp)} kcal a person a day made against ${fmt.group(S4.KCAL_PERSON)} needed, meat is ${fmt.pct(meat)} of it</small></h3>
      <div class="cbar" data-tip="${esc(T('Calories made, by source', dl('Each block is one food. The marker is what people need.'), ...parts.map(([m, v]) => `${short(m)} ${fmt.tcal(v * P().hours)} ${P().word}`), `Need ${fmt.tcal(need * P().hours)} ${P().word}`))}">${parts.map(([m, v]) => `<i style="width:${v / top * 100}%;background:rgb(${S4.matInfo(m).base.join(',')})">${v / top > .07 ? esc(short(m)) : ''}</i>`).join('')}<u style="left:${need / top * 100}%"></u></div>
      <div class="grid s" style="margin-bottom:6px">${E.food.filter(m => E.stock[m] > 0 || f.out[m]).map(m => stkTile(m, f, false)).join('')}</div>`;
  }

  function summary(f) {
    const short_ = D.mats.filter(m => { const c = S4.cover(m.id, f); return (isFinite(c) && c < 730 && (E.stock[m.id] || 0) > 0) || (!isFinite(c) ? false : (E.stock[m.id] || 0) <= 0); }).map(m => m.id).slice(0, 14);
    const limited = f.actors.filter(a => a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle');
    const byKind = {};
    for (const a of f.actors) { const k = a.b.kind; const r = byKind[k] = byKind[k] || { count: 0, workers: 0, power: 0, n: 0 }; r.count += a.g.count; r.n++; r.workers += a.g.on && a.p ? a.g.count * a.b.workers : 0; r.power += a.power || 0; }
    const maxPow = Math.max(...Object.values(byKind).map(r => r.power), 1);
    return `<div class="main" style="grid-column:1/-1">${kpis(f)}
      ${foodPanel(f)}
      <h3>${gl('warn', 'sm')}What is short <small class="dim">${short_.length} materials, ${limited.length} building groups</small></h3>
      <div class="grid s" style="margin-bottom:6px">${short_.map(id => stkTile(id, f, false)).join('') || '<p class="none">Nothing is short.</p>'}</div>
      <div class="grid" style="margin-bottom:6px">${limited.map(a => prodTile(a, false)).join('')}</div>
      <div class="cols2">
        <div><h3>Industry by kind</h3><div class="grid m" style="grid-template-columns:repeat(auto-fill,108px)">${Object.entries(byKind).map(([k, r]) => `<div class="tile" style="width:108px;height:104px;cursor:default" data-tip="${esc(T(S4.KIND_NAMES[k], dl(S4.KIND_DESC[k]), `${fmt.group(r.count)} buildings in ${r.n} groups`, `${fmt.people(r.workers)} workers`, `${fmt.power(r.power)} power`))}"><i class="kstripe" style="background:${kc(k)}"></i><span class="art" style="height:40px;display:flex;align-items:center">${bi(S4.KIND_EX[k], 2)}</span>${nm(S4.KIND_NAMES[k])}<span class="n">${fmt.count(r.count)}</span>${meter(r.power / maxPow, '', 'full')}</div>`).join('')}</div></div>
        <div><h3>Programmes</h3>${E.programmes.length ? `<div class="grid m" style="grid-template-columns:repeat(auto-fill,120px)">${E.programmes.map(p => msTileMini(p)).join('')}</div>` : '<p class="none">No programme is running. Start one from Research.</p>'}
          <h3>Building now</h3>${activeOrders().length ? `<div class="grid m" style="grid-template-columns:repeat(auto-fill,120px)">${activeOrders().map(o => qTile(o, false)).join('')}</div>` : '<p class="none">Nothing is being built.</p>'}</div>
      </div></div>`;
  }
  const sideNote = () => `<div class="card"><header>${gl('list')}<div><div class="t">Earth at a glance</div><div class="s">select a tile anywhere to open its card</div></div></header><div class="cb flow">
      <div class="fr">${gl('people', 'sm')}<span class="nm">People</span><span class="v">${fmt.people(E.pop)}</span></div>
      <div class="fr">${gl('gear', 'sm')}<span class="nm">Building groups</span><span class="v">${E.groups.length}</span></div>
      <div class="fr">${gl('factory', 'sm')}<span class="nm">Buildings</span><span class="v">${fmt.count(E.groups.reduce((a, g) => a + g.count, 0))}</span></div>
      <div class="fr">${gl('box', 'sm')}<span class="nm">Materials in store</span><span class="v">${D.mats.filter(m => (E.stock[m.id] || 0) > 0).length}</span></div>
      <div class="fr">${gl('flask', 'sm')}<span class="nm">Milestones</span><span class="v">${E.done.length} of ${D.miles.length}</span></div></div></div>`;

  function msTileMini(p) {
    const m = D.miles[p.number - 1];
    return `<div class="tile" style="width:120px;height:104px;cursor:default;--ec:var(--cool)" data-tip="${esc(T(m.name, dl(m.unlocks), `Programme ${p.number}`, `${fmt.pct(p.progress)} done`, `${fmt.days((1 - p.progress) * S4.programmeDays(p.number))} left`))}"><span class="corner">M${p.number}</span><span class="art" style="height:40px;display:flex;align-items:center">${msIcon(m, 2)}</span>${nm(S4.MS_SHORT[m.number])}${meter(p.progress, 'cool', 'full')}<span class="dim" style="font-size:15px">${fmt.days((1 - p.progress) * S4.programmeDays(p.number))} left</span></div>`;
  }

  function production(f) {
    const kinds = [...new Set(f.actors.map(a => a.b.kind))];
    const order = Object.keys(S4.KIND_NAMES);
    const list = f.actors.filter(a => ES.kind === 'all' || a.b.kind === ES.kind).sort((x, y) => order.indexOf(x.b.kind) - order.indexOf(y.b.kind) || y.g.count - x.g.count);
    const sel = f.actors.find(a => a.g.id === ES.group);
    return `<div class="main"><div class="filters"><button class="${ES.kind === 'all' ? 'on' : ''}" data-act="kind" data-id="all">All ${f.actors.length}</button>${kinds.map(k => `<button class="${ES.kind === k ? 'on' : ''}" data-act="kind" data-id="${k}" data-tip="${S4.KIND_NAMES[k]}">${bi(S4.KIND_EX[k], 1)}${f.actors.filter(a => a.b.kind === k).length}</button>`).join('')}</div>
      <div class="grid">${list.map(a => prodTile(a, a.g.id === ES.group)).join('')}</div></div>
      <div class="side">${sel ? prodCard(sel, f) : '<div class="card"><div class="cb"><p class="none">Select a building tile.</p></div></div>'}</div>`;
  }

  function prodCard(a, f) {
    const choices = S4.choicesFor(a.g.building);
    const others = choices.filter(c => c.id !== a.g.process);
    const tgt = others.find(c => c.id === ES.target) || others[0];
    const full = (o) => Object.entries(o || {}).map(([m, v]) => [m, v * a.g.count * (a.share || 1)]);
    const inp = a.p ? full(a.p.inputs) : [], out = a.p ? full(a.p.outputs) : [];
    const pw = a.p ? a.p.power * a.g.count * (a.share || 1) : 0;
    const w = a.limit && a.limit.kind !== 'off' && a.limit.kind !== 'idle';
    const b = a.b;
    return `<div class="card" style="--ec:${w ? 'var(--hot)' : 'var(--line)'}"><header>${bi(a.g.building, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${a.p ? esc(a.p.name) : 'no recipe'}</div></div></header><div class="cb">
      <div class="row sp"><span class="pill" data-tip="Buildings in this group">${gl('factory')}${fmt.group(a.g.count)}</span><span class="pill" data-tip="${esc(T('Workers', `${b.workers} a building`, `${fmt.people(b.workers * a.g.count)} in all`))}">${gl('people')}${fmt.people(b.workers * a.g.count)}</span><span class="pill" data-tip="Power used when running">${gl('bolt')}${a.p ? fmt.power(pw) : '-'}</span></div>
      <div><span class="lbl">Running</span><div class="row">${meter(a.share, w ? 'hot' : '', 'thick')}<span class="${w ? 'hot' : ''}" style="min-width:34px;text-align:right">${fmt.pct(a.share)}</span></div>${a.limit ? `<div class="${a.limit.kind === 'off' || a.limit.kind === 'idle' ? 'dim' : 'hot'}" style="margin-top:3px">${gl(a.limit.kind === 'off' || a.limit.kind === 'idle' ? 'minus' : 'warn', 'xs')} ${esc(a.limit.text)}</div>` : ''}</div>
      ${a.p ? `<div><span class="lbl">Recipe, ${P().word}</span><div class="eq">${inp.length ? rateRow(inp) : `<span class="rate">${gl('drop', 'lg')}<span>from ground</span></span>`}${a.p.power ? `<span class="rate">${gl('bolt', 'lg')}<span>${fmt.power(pw)}</span></span>` : ''}<span class="arr">${gl('arrowR')}</span>${out.length ? rateRow(out) : a.p.generates ? `<span class="rate">${gl('bolt', 'lg')}<span>${fmt.power(a.p.generates * a.g.count * a.share)}</span></span>` : ''}</div></div>` : ''}
      <div class="btns"><button data-act="tgl">${gl('power')}${a.g.on ? 'Switch off' : 'Switch on'}</button></div>
      ${choices.length > 1 || !a.p ? `<div><span class="lbl">Switch recipe</span><div class="grid s" style="grid-template-columns:repeat(auto-fill,40px);gap:3px">${others.slice(0, 30).map(c => { const o = Object.keys(c.outputs)[0]; return `<button class="tile ${tgt && tgt.id === c.id ? 'sel' : ''}" style="width:40px;height:40px;justify-content:center;padding:0" data-act="target" data-id="${esc(c.id)}" data-tip="${esc(T(c.name, Object.keys(c.outputs).map(m => '→ ' + short(m)), c.inputs && Object.keys(c.inputs).length ? 'from ' + Object.keys(c.inputs).map(short).join(', ') : ''))}">${o ? mi(o, 2) : gl('bolt')}</button>`; }).join('')}</div>
        ${tgt ? `<div class="row" style="margin-top:6px"><span class="dim">${esc(tgt.name)}</span></div><div class="row"><input id="num" type="number" min="1" max="${a.g.count}" value="${Math.min(ES.num, a.g.count)}" style="width:92px" data-tip="Buildings to move"><button data-act="switch">${gl('arrowR')}Switch ${fmt.count(Math.min(ES.num, a.g.count))}</button><button data-act="all" data-tip="All of them">all</button></div>` : ''}</div>` : ''}
    </div></div>`;
  }

  function stkTile(id, f, selectable = true) {
    const m = D.mat[id], net = (f.out[id] || 0) - (f.use[id] || 0), c = S4.cover(id, f), st = E.stock[id] || 0;
    const stockless = m.unit === 'cu';
    const bad = isFinite(c) && c < 365 || (st <= 0 && (f.use[id] || 0) > (f.out[id] || 0));
    const flat = Math.abs(net) < 1e-6 * (st + 1);
    const tr = flat ? 'flat' : net > 0 ? 'up' : 'down';
    const cv = st <= 0 && !(f.out[id] || f.use[id]) ? 0 : !isFinite(c) ? 1 : Math.min(1, c / 730);
    const rate = flat ? '0' : fmt.rate(id, net, true);
    return `<button class="tile stk ${bad ? 'warn' : ''} ${selectable && ES.mat === id ? 'sel' : ''} ${st <= 0 && !(f.out[id] || f.use[id]) ? 'dimmed' : ''}" data-act="mat" data-id="${id}" data-tip="${esc(S4.matTip(id) + (bad ? '\n!Short' : ''))}">
      <span class="trend ${tr === 'down' ? 'hot' : tr === 'up' ? 'cool' : 'dim'}">${gl(tr)}</span>${mi(id, 2)}${nm(short(id))}<span class="amt">${stockless ? '-' : st > 0 ? fmt.amount(id, st) : '0'}</span><span class="net ${tr === 'down' ? 'hot' : tr === 'up' ? 'cool' : 'dim'}">${rate}</span>${meter(cv, bad ? 'hot' : 'cool', 'full')}</button>`;
  }

  function stockpiles(f) {
    const has = id => ES.empty || (E.stock[id] || 0) > 0 || (f.out[id] || 0) > 0 || (f.use[id] || 0) > 0;
    const cats = D.cats.map(c => [c, D.mats.filter(m => m.category === c && has(m.id)).map(m => m.id)]).filter(x => x[1].length);
    const shown = ES.cat === 'all' ? cats : cats.filter(x => x[0] === ES.cat);
    return `<div class="main"><div class="filters"><button class="${ES.cat === 'all' ? 'on' : ''}" data-act="cat" data-id="all">All ${cats.reduce((a, x) => a + x[1].length, 0)}</button>${cats.map(([c, ids]) => `<button class="${ES.cat === c ? 'on' : ''}" data-act="cat" data-id="${c}" data-tip="${S4.CAT_NAMES[c]}">${mi(S4.CAT_REP[c], 1)}${ids.length}</button>`).join('')}<span style="flex:1"></span><button class="${ES.empty ? 'on' : ''}" data-act="empty" data-tip="Also list materials with no stock and no flow, to see the whole catalogue">${gl('filter', 'sm')}Show empty</button></div>
      ${shown.map(([c, ids]) => `${ES.cat === 'all' ? `<h3>${mi(S4.CAT_REP[c], 1)}${S4.CAT_NAMES[c]} <small class="dim">${ids.length}</small></h3>` : ''}<div class="grid s" style="margin-bottom:6px">${ids.map(id => stkTile(id, f)).join('')}</div>`).join('')}</div>
      <div class="side">${matCard(ES.mat, f)}</div>`;
  }

  function matCard(id, f) {
    const m = D.mat[id], st = E.stock[id] || 0, made = (f.out[id] || 0) * P().hours, used = (f.use[id] || 0) * P().hours, c = S4.cover(id, f), net = made - used;
    const mk = D.recipes.filter(r => r.outputs[id]).slice(0, 6), us = D.recipes.filter(r => r.inputs[id]).slice(0, 6);
    const srcs = (m.sources || []).filter(s => s.body === 'earth');
    const line = (ic, label, v, cls = '') => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${label}</span><span class="v ${cls}">${v}</span></div>`;
    const recRow = r => `<div class="eq">${bi(r.building, 1)}<span class="dim" style="font-size:15px;min-width:34px">${S4.standing(r.building) ? '' : ''}</span>${Object.keys(r.inputs).slice(0, 4).map(i => mi(i, 1)).join('')}<span class="arr">${gl('arrowR', 'sm')}</span>${Object.keys(r.outputs).map(o => mi(o, 1)).join('')}</div>`;
    return `<div class="card"><header>${mi(id, 3)}<div><div class="t">${esc(m.name.split(' (')[0])}</div><div class="s">${S4.CAT_NAMES[m.category]}</div></div></header><div class="cb">
      <div class="flow">${line('box', 'In store', fmt.amount(id, st))}${S4.KCAL[id] ? line('box', 'Mass in store', fmt.mass(st)) : ''}${line('up', 'Made ' + P().word, fmt.amount(id, made), 'cool')}${line('down', 'Used ' + P().word, fmt.amount(id, used))}${line(net < 0 ? 'down' : 'up', 'Balance ' + P().word, fmt.signed(id, net), net < 0 ? 'hot' : 'cool')}${S4.KCAL[id] ? line('grain', 'Energy', fmt.group(S4.KCAL[id]) + ' kcal a kg') : ''}${line('clock', 'Cover', isFinite(c) ? fmt.days(c) : 'growing', isFinite(c) && c < 365 ? 'hot' : '')}</div>
      ${meter(isFinite(c) ? Math.min(1, c / 730) : 1, isFinite(c) && c < 365 ? 'hot' : 'cool', 'thick full')}
      ${srcs.length ? `<div><span class="lbl">Taken from the ground by</span><div class="eq">${[...new Set(srcs.map(s => s.building))].map(b => bi(b, 1)).join('')}</div></div>` : ''}
      ${mk.length ? `<div><span class="lbl">Made by</span><div class="flow">${mk.map(recRow).join('')}</div></div>` : ''}
      ${us.length ? `<div><span class="lbl">Used by</span><div class="flow">${us.map(recRow).join('')}</div></div>` : ''}
      <div class="dim" style="font-size:16px">${esc(S4.desc.mat(id))}</div></div></div>`;
  }

  const activeOrders = () => E.queue.filter(o => !o.paused).slice(0, S4.BUILD_SLOTS);
  function qTile(o, sel) {
    const act = activeOrders().includes(o), b = D.bld[o.building];
    const left = (1 - o.done) * S4.buildHours(o.building) / 24;
    const st = o.paused ? 'pause' : act ? 'hammer' : 'clock';
    return `<button class="tile q ${sel ? 'sel' : ''} ${o.paused ? 'idle' : ''}" data-act="qsel" data-id="${o.id}" data-tip="${esc(T(b.name, dl(S4.desc.bld(o.building)), o.paused ? '~Paused' : act ? 'Building' : '~Waiting for a crew', `${fmt.pct(o.done)} done`, act ? fmt.days(left) + ' left' : ''))}">
      <span class="corner">${E.queue.indexOf(o) + 1}</span><span class="corner r ${act ? 'acc' : 'dim'}">${gl(st)}</span><span class="art" style="height:40px;display:flex;align-items:center;justify-content:center">${bi(o.building, 2)}</span>${nm(b.name)}${meter(o.done, act ? '' : 'cool', 'full')}<span class="dim" style="font-size:15px">${act ? fmt.days(left) + ' left' : o.paused ? 'paused' : 'waiting'}</span></button>`;
  }

  function bldTile(b, sel) {
    const open = S4.unlocked(b), costs = Object.entries(b.cost).sort((x, y) => y[1] - x[1]);
    const st = S4.standing(b.id);
    return `<button class="tile bld ${sel ? 'sel' : ''} ${open ? '' : 'dimmed'}" data-act="bpick" data-id="${b.id}" data-tip="${esc(T(b.name, S4.KIND_NAMES[b.kind], dl(S4.desc.bld(b.id)), open ? 'Open' : '!Needs milestone ' + (b.milestone - 1), `${st ? fmt.count(st) + ' standing' : 'none standing'}`, `Build time ${fmt.days(S4.buildHours(b.id) / 24)}`))}">
      <i class="kstripe" style="background:${kc(b.kind)}"></i><span class="corner">${st ? '×' + fmt.count(st) : ''}</span>${open ? '' : `<span class="corner r dim">${gl('lock')}<span style="font-size:14px">${b.milestone - 1}</span></span>`}
      <span class="art">${bi(b.id, 2)}</span>${nm(b.name)}<span class="costs">${costs.slice(0, 3).map(([m]) => mi(m, 1)).join('')}${costs.length > 3 ? `<span class="dim" style="font-size:14px;align-self:center">+${costs.length - 3}</span>` : ''}</span></button>`;
  }

  function construction(f) {
    const cat = D.blds.slice().sort((a, b) => Object.keys(S4.KIND_NAMES).indexOf(a.kind) - Object.keys(S4.KIND_NAMES).indexOf(b.kind) || a.milestone - b.milestone);
    const kinds = [...new Set(cat.map(b => b.kind))];
    const list = cat.filter(b => ES.bkind === 'all' || b.kind === ES.bkind);
    const open = cat.filter(S4.unlocked).length;
    return `<div class="main"><h3>${gl('hammer', 'sm')}Construction queue <small class="dim">${activeOrders().length} of ${S4.BUILD_SLOTS} crews busy</small></h3>
      ${E.queue.length ? `<div class="grid m" style="grid-template-columns:repeat(auto-fill,120px);margin-bottom:6px">${E.queue.map(o => qTile(o, ES.side === 'order' && ES.order === o.id)).join('')}</div>` : '<p class="none">The queue is empty. Pick a building below and add it.</p>'}
      <h3>${gl('factory', 'sm')}Buildings <small class="dim">${open} open, ${cat.length - open} locked</small></h3>
      <div class="filters"><button class="${ES.bkind === 'all' ? 'on' : ''}" data-act="bkind" data-id="all">All ${cat.length}</button>${kinds.map(k => `<button class="${ES.bkind === k ? 'on' : ''}" data-act="bkind" data-id="${k}" data-tip="${S4.KIND_NAMES[k]}">${bi(S4.KIND_EX[k], 1)}${cat.filter(b => b.kind === k).length}</button>`).join('')}</div>
      <div class="grid">${list.map(b => bldTile(b, ES.side === 'pick' && ES.pick === b.id)).join('')}</div></div>
      <div class="side">${ES.side === 'order' && E.queue.find(o => o.id === ES.order) ? orderCard(E.queue.find(o => o.id === ES.order), f) : pickCard(D.bld[ES.pick], f)}</div>`;
  }

  const haveRow = (cost, qty = 1) => `<div class="eq">${Object.entries(cost).sort((a, b) => b[1] - a[1]).map(([m, v]) => { const have = E.stock[m] || 0, need = v * qty, ok = have >= need; return `<span class="have ${ok ? 'ok' : 'short'}" data-tip="${esc(S4.matTip(m) + `\nNeed ${fmt.cargo(m, need)}, have ${fmt.cargo(m, have)}`)}">${mi(m, 2)}<span>${fmt.cargo(m, have)}</span><span class="need">/ ${fmt.cargo(m, need)}</span></span>`; }).join('')}</div>`;

  function pickCard(b, f) {
    if (!b) return '';
    const open = S4.unlocked(b), recs = open ? S4.choicesFor(b.id) : [];
    const rec = recs.find(r => r.id === ES.recipe) || recs[0];
    return `<div class="card"><header>${bi(b.id, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">${S4.KIND_NAMES[b.kind]}</div></div></header><div class="cb">
      <div class="row"><span class="pill" data-tip="Workers">${gl('people')}${b.workers}</span><span class="pill" data-tip="Build time">${gl('clock')}${fmt.days(S4.buildHours(b.id) / 24)}</span><span class="pill" data-tip="Standing">${gl('factory')}${fmt.count(S4.standing(b.id))}</span>${b.start ? `<span class="pill cool" data-tip="Exists on Earth at the start">${gl('check')}start</span>` : ''}</div>
      <div><span class="lbl">Cost for one, have / need</span>${haveRow(b.cost, ES.qty)}</div>
      ${open ? (recs.length ? `<div><span class="lbl">Recipe</span><div class="grid s" style="grid-template-columns:repeat(auto-fill,40px);gap:3px">${recs.slice(0, 30).map(c => { const o = Object.keys(c.outputs)[0]; return `<button class="tile ${rec && rec.id === c.id ? 'sel' : ''}" style="width:40px;height:40px;justify-content:center;padding:0" data-act="recipe" data-id="${esc(c.id)}" data-tip="${esc(T(c.name, Object.keys(c.outputs).map(m => '→ ' + short(m))))}">${o ? mi(o, 2) : gl('bolt')}</button>`; }).join('')}</div></div>` : '')
        + `<div class="row"><input id="qty" type="number" min="1" value="${ES.qty}" style="width:70px" data-tip="Quantity"><button data-act="badd">${gl('plus')}Add to queue</button></div>` : `<div class="flag w">${gl('lock')}<span>Needs milestone ${b.milestone - 1}</span></div>`}
    </div></div>`;
  }
  function orderCard(o, f) {
    const b = D.bld[o.building], i = E.queue.indexOf(o), act = activeOrders().includes(o);
    return `<div class="card"><header>${bi(o.building, 2)}<div><div class="t">${esc(b.name)}</div><div class="s">order ${i + 1}, ${o.paused ? 'paused' : act ? 'building' : 'waiting for a crew'}</div></div></header><div class="cb">
      <div class="row">${meter(o.done, '', 'thick')}<span style="min-width:34px;text-align:right">${fmt.pct(o.done)}</span></div>
      <div class="dim">${act ? fmt.days((1 - o.done) * S4.buildHours(o.building) / 24) + ' left' : ''}</div>
      <div><span class="lbl">Cost, spent evenly while building</span>${haveRow(b.cost)}</div>
      <div class="btns"><button data-act="qup" ${i <= 0 ? 'disabled' : ''}>${gl('up')}Up</button><button data-act="qdown" ${i >= E.queue.length - 1 ? 'disabled' : ''}>${gl('down')}Down</button><button data-act="qpause">${gl(o.paused ? 'play' : 'pause')}${o.paused ? 'Resume' : 'Pause'}</button><button data-act="qrem">${gl('trash')}Remove</button></div></div></div>`;
  }

  let MSI = null;
  function msIcon(m, s) {
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
    return q[0] === 'b' ? bi(q[1], s, m.name) : q[0] === 'c' ? ci(q[1], s, m.name) : mi(q[1], s, m.name);
  }

  function msTile(m, cls = '') {
    const st = S4.milestoneState(m.number);
    const glyph = st === 'done' ? gl('check', 'sm acc') : st === 'locked' ? gl('lock', 'sm dim') : st === 'running' ? gl('hammer', 'sm cool') : gl('play', 'sm cool');
    const p = E.programmes.find(x => x.number === m.number);
    return `<button class="tile node ${cls} ${st === 'locked' ? 'lock' : st === 'done' ? 'done' : 'avail'} ${ES.ms === m.number ? 'sel' : ''}" data-act="ms" data-id="${m.number}" data-tip="${esc(T(m.number + '. ' + m.name, dl(m.unlocks), { done: 'Done', locked: '!Locked: needs ' + m.requires.filter(r => !E.done.includes(r)).join(', '), available: 'Available', running: 'Programme running' }[st], m.tier === 'P' ? 'Proven' : m.tier === 'E' ? 'Engineering-plausible' : 'Speculative'))}">
      <span class="num">${m.number}</span><span class="state">${glyph}</span><span class="art" style="height:42px;display:flex;align-items:center;justify-content:center;margin-top:8px">${msIcon(m, 2)}</span>${nm(S4.MS_SHORT[m.number])}${p ? meter(p.progress, 'cool', 'full') : `<span class="dim" style="font-size:14px">${m.tier}${m.optional ? ' optional' : ''}</span>`}</button>`;
  }

  const COMPUTE = n => (n < 6 ? 0 : 20 * (n - 4));
  function unlocksOf(n) {
    const k = n + 1;
    const lower = new Set(D.recipes.filter(r => r.milestone < k).flatMap(r => Object.keys(r.outputs)));
    const ground = new Set(D.mats.filter(m => (m.sources || []).some(x => x.body === 'earth')).map(m => m.id));
    return {
      blds: D.blds.filter(b => b.milestone === k).map(b => b.id),
      comps: D.comps.filter(c => c.milestone === k).map(c => c.id),
      mats: [...new Set(D.recipes.filter(r => r.milestone === k).flatMap(r => Object.keys(r.outputs)))].filter(x => !lower.has(x) && !ground.has(x))
    };
  }

  function msCard(n, narrow) {
    const m = D.miles[n - 1], st = S4.milestoneState(n), bl = S4.bill(n), un = unlocksOf(n);
    const matsOk = Object.entries(bl.mats).every(([id, v]) => (E.stock[id] || 0) >= v);
    const bOk = bl.buildings.map(b => S4.stands(b)), cOk = bl.comps.map(c => D.comp[c].builtAt.some(S4.stands));
    const can = st === 'available' && matsOk && bOk.every(Boolean) && cOk.every(Boolean);
    const p = E.programmes.find(x => x.number === n);
    const need = (arr, ok, kind) => arr.map((id, i) => `<span class="have stand ${ok[i] ? 'ok' : 'short'}" data-tip="${esc(T(kind === 'b' ? D.bld[id].name : D.comp[id].name, ok[i] ? 'Standing' : '!Missing'))}"><span class="ibox">${kind === 'b' ? bi(id, 2) : ci(id, 2)}</span><span>${ok[i] ? 'yes' : 'no'}</span></span>`).join('');
    const nUn = un.blds.length + un.comps.length + un.mats.length;
    const cu = COMPUTE(n);
    const billBox = `<div><span class="lbl">Bill, have / need</span><div class="eq">${Object.entries(bl.mats).map(([id, v]) => { const have = E.stock[id] || 0, ok = have >= v; return `<span class="have ${ok ? 'ok' : 'short'}" data-tip="${esc(S4.matTip(id) + `\nNeed ${fmt.cargo(id, v)}, have ${fmt.cargo(id, have)}`)}">${mi(id, 2)}<span>${fmt.cargo(id, have)}</span><span class="need">/ ${fmt.cargo(id, v)}</span></span>`; }).join('') || '<span class="dim">no materials</span>'}</div></div>`;
    const standBox = `<div><span class="lbl">Must stand</span><div class="eq">${need(bl.buildings, bOk, 'b')}${need(bl.comps, cOk, 'c')}${!bl.buildings.length && !bl.comps.length ? '<span class="dim">nothing</span>' : ''}</div>
      <span class="lbl" style="margin-top:8px">Needs milestones</span><div class="eq">${m.requires.length ? m.requires.map(r => `<button class="tile" style="width:34px;height:34px;justify-content:center;margin:0;--ec:${E.done.includes(r) ? 'var(--accent)' : 'var(--hot)'}" data-act="ms" data-id="${r}" data-tip="${esc(T(D.miles[r - 1].name, dl(D.miles[r - 1].unlocks)))}">${gl(E.done.includes(r) ? 'check' : 'lock', 'sm')}</button>`).join('') : '<span class="dim">none</span>'}</div></div>`;
    const unBox = `<div><span class="lbl">Unlocks ${nUn ? `(${nUn})` : ''}</span><div class="eq" style="gap:3px">${un.blds.map(id => `<span class="ibox">${bi(id, 2)}</span>`).join('')}${un.comps.map(id => `<span class="ibox">${ci(id, 2)}</span>`).join('')}${un.mats.map(id => `<span class="ibox">${mi(id, 2)}</span>`).join('')}${nUn ? '' : '<span class="dim">nothing new, it is a gate for later ones</span>'}</div></div>`;
    const rowBox = `<div class="row"><span class="pill" data-tip="Programme length">${gl('clock')}${S4.programmeDays(n)} d</span><span class="pill" data-tip="${m.tier === 'P' ? 'Proven' : m.tier === 'E' ? 'Engineering-plausible' : 'Speculative'}">${m.tier}</span><span class="pill" data-tip="${esc(T('Compute', dl('Cycles the programme draws while it runs. Mock figure.')))}">${gl('chip')}${cu ? cu + ' cu an hour' : 'no compute'}</span>${p ? `${meter(p.progress, 'cool', 'thick')}<span>${fmt.pct(p.progress)}</span>` : `<button data-act="mstart" ${can ? '' : 'disabled'}>${gl('play')}Start programme</button>${!can && st === 'available' ? '<span class="hot">bill not in store</span>' : ''}${st === 'locked' ? '<span class="hot">needs earlier milestones</span>' : ''}`}</div>`;
    return `<div class="card" style="margin:0"><header>${msIcon(m, 2)}<div style="flex:1"><div class="t">${m.number}. ${esc(m.name)}</div><div class="s">${esc(m.unlocks)}</div></div><span class="pill ${st === 'done' ? 'cool' : st === 'locked' ? 'hot' : ''}">${{ done: 'done', locked: 'locked', available: 'available', running: 'running' }[st]}</span></header><div class="cb">
      ${rowBox}${narrow ? billBox + standBox + unBox : `<div class="cols2" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr) minmax(0,4fr)">${billBox}${standBox}${unBox}</div>`}
    </div></div>`;
  }

  function people(f) {
    const byKind = {}; for (const a of f.actors) { if (a.g.on && a.p) byKind[a.b.kind] = (byKind[a.b.kind] || 0) + a.g.count * a.b.workers; }
    const total = Object.values(byKind).reduce((x, y) => x + y, 0), spare = Math.max(0, f.workers.avail - f.workers.need);
    const coh = [['Children', .26, 'leaf', 'Under 15, not yet working.'], ['Workers', E.workShare, 'gear', 'Of working age and available for jobs.'], ['Others', 1 - .26 - E.workShare, 'clock', 'Students, carers and retired.']];
    const gov = S4.commanders ? S4.commanders.officer('gov') : null, gar = S4.ground ? S4.ground.total() : 0, forms = S4.ground ? S4.ground.count() : 0;
    const line = (ic, l, v) => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v">${esc(v)}</span></div>`;
    const bar = (l, v, c) => `<div class="fr"><span class="nm">${l}</span><span class="v" style="min-width:130px;display:flex;gap:6px;align-items:center">${meter(v, c, '')}<span style="min-width:34px;text-align:right">${fmt.pct(v)}</span></span></div>`;
    const tile = (n, d, ic, s, v) => `<div class="tile" style="cursor:default;width:120px;height:104px" data-tip="${esc(T(n, dl(d), v))}"><span class="art" style="height:40px;display:flex;align-items:center;color:var(--accent)">${ic}</span>${nm(n)}<span class="n">${v}</span>${meter(s, '', 'full')}</div>`;
    return `<div class="main"><h3>${gl('people', 'sm')}Who lives here <small class="dim">${fmt.people(E.pop)}</small></h3><div class="grid m">${coh.map(([n, s, ic, d]) => tile(n, d, gl(ic, 'lg'), s, fmt.people(E.pop * s))).join('')}</div>
      <h3>${gl('gear', 'sm')}Jobs by industry <small class="dim">${fmt.people(total)} workers needed, ${fmt.people(spare)} not needed</small></h3><div class="grid m">${Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, w]) => `<div class="tile" style="cursor:default;width:120px;height:104px" data-tip="${esc(T(S4.KIND_NAMES[k], dl(S4.KIND_DESC[k]), `${fmt.people(w)} workers`))}"><i class="kstripe" style="background:${kc(k)}"></i><span class="art" style="height:40px;display:flex;align-items:center">${bi(S4.KIND_EX[k], 2)}</span>${nm(S4.KIND_NAMES[k])}<span class="n">${fmt.people(w)}</span>${meter(w / total, '', 'full')}</div>`).join('')}</div></div>
      <div class="side"><div class="card"><header>${gl('people')}<div><div class="t">Population</div><div class="s">Earth, ${fmt.people(E.pop)}</div></div></header><div class="cb">
        <div class="flow">${bar('Jobs filled', f.workers.share, f.workers.share < 1 ? 'hot' : 'cool')}${bar('Fed', Math.min(1, f.food.made / f.food.need), 'cool')}${bar('Housed', 1, 'cool')}${bar('Content', .82, 'cool')}</div>
        <div class="flow">${line('grain', 'Food a person', fmt.group(S4.KCAL_PERSON) + ' kcal a day')}${line('up', 'Growth', '+' + (E.growth * 100).toFixed(2) + '% a year')}${line('gear', 'Workers not needed', fmt.people(spare))}</div></div></div>
        ${gov ? `<div class="card"><header>${S4.miniFace(gov.face, 2)}<div><div class="t">${esc(gov.name)}</div><div class="s">Governor of Earth, ${esc(gov.rankName)}</div></div></header><div class="cb"><div class="btns"><button data-nav="#commanders">${gl('star')}Commanders</button></div></div></div>` : ''}
        <div class="card"><header>${gl('tank')}<div><div class="t">Garrison</div><div class="s">${gar} units in ${forms} formations</div></div></header><div class="cb"><div class="btns"><button data-nav="#ground">${gl('tank')}Ground forces</button></div></div></div>
        <span class="tag">mock figures except the total</span></div>`;
  }

  function perToggle() {
    return `<span class="per" data-tip="${esc(T('Rates', dl('Every rate on the economy screens is shown over this period. Aurora 4X shows production a year, which is too coarse here.')))}"><small>rates a</small>${Object.values(S4.PER).map(p => `<button class="${S4.per.key === p.name ? 'on' : ''}" data-act="per" data-id="${p.name}">${p.name}</button>`).join('')}</span>`;
  }

  function render() {
    const root = document.getElementById('view');
    const f = S4.flows(); S4.lastFlows = f;
    const sc = [...root.querySelectorAll('.main, .side')].map(e => e.scrollTop);
    const body = ES.tab === 'summary' ? summary(f) : ES.tab === 'production' ? production(f) : ES.tab === 'construction' ? construction(f) : ES.tab === 'stockpiles' ? stockpiles(f) : people(f);
    root.style.gridTemplateColumns = '300px minmax(0,1fr)';
    root.innerHTML = `<div class="stack">${sitesPanel()}</div><div class="pan grow"><h2>Earth <small>Sol</small>${perToggle()}</h2><div class="pb tb"><div class="tabs">${TABS.map(([id, n, ic]) => `<button class="${ES.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${gl(ic)}${n}</button>`).join('')}</div><div class="split tabbody">${body}</div></div></div>`;
    [...root.querySelectorAll('.main, .side')].forEach((e, i) => { if (sc[i]) e.scrollTop = sc[i]; });
    S4.chipsOnly();
  }

  function act(a, id, el) {
    const find = i => E.groups.find(g => g.id === +i);
    if (a === 'tab') { ES.tab = id; }
    else if (a === 'grp') { ES.group = +id; ES.target = null; const g = find(id); ES.num = g ? g.count : 1; }
    else if (a === 'kind') ES.kind = id;
    else if (a === 'bkind') ES.bkind = id;
    else if (a === 'cat') ES.cat = id;
    else if (a === 'empty') ES.empty = !ES.empty;
    else if (a === 'mat') ES.mat = id;
    else if (a === 'target') ES.target = id;
    else if (a === 'tgl') { const g = find(ES.group); if (g) g.on = !g.on; }
    else if (a === 'all') { const g = find(ES.group); if (g) ES.num = g.count; }
    else if (a === 'switch') {
      const g = find(ES.group), f = S4.lastFlows;
      const others = S4.choicesFor(g.building).filter(c => c.id !== g.process), t = others.find(c => c.id === ES.target) || others[0];
      const n = Math.max(1, Math.min(g.count, +document.getElementById('num').value || g.count));
      if (t) {
        if (n >= g.count) g.process = t.id;
        else { g.count -= n; const ng = { id: E.uid++, building: g.building, process: t.id, count: n, on: true }; E.groups.splice(E.groups.indexOf(g) + 1, 0, ng); ES.group = ng.id; }
        ES.target = null; ES.num = n;
      }
    }
    else if (a === 'bpick') { ES.pick = id; ES.side = 'pick'; ES.recipe = null; }
    else if (a === 'recipe') ES.recipe = id;
    else if (a === 'qsel') { ES.order = +id; ES.side = 'order'; }
    else if (a === 'badd') {
      const n = Math.max(1, +document.getElementById('qty').value || 1); ES.qty = n;
      const o = { id: E.qid++, building: ES.pick, process: ES.recipe || null, done: 0, paused: false };
      E.queue.push(o); ES.order = o.id; ES.side = 'order';
    }
    else if (a === 'qup' || a === 'qdown') { const i = E.queue.findIndex(o => o.id === ES.order), j = i + (a === 'qup' ? -1 : 1); if (j >= 0 && j < E.queue.length) { const t = E.queue[i]; E.queue[i] = E.queue[j]; E.queue[j] = t; } }
    else if (a === 'qpause') { const o = E.queue.find(o => o.id === ES.order); if (o) o.paused = !o.paused; }
    else if (a === 'qrem') { E.queue = E.queue.filter(o => o.id !== ES.order); ES.order = null; ES.side = 'pick'; }
    else if (a === 'per') S4.per.key = id;
    render();
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'economy') return;
    if (!document.querySelector('#view .tabbody') && !document.querySelector('#view .tabs')) return;
    const t = e.target.closest('[data-act]');
    if (t && document.getElementById('view').contains(t) && document.querySelector('#view .tabs')) act(t.dataset.act, t.dataset.id, t);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'num') { ES.num = Math.max(1, +e.target.value || 1); const b = document.querySelector('[data-act=switch]'); if (b) b.lastChild.textContent = 'Switch ' + fmt.count(ES.num); }
    if (e.target.id === 'qty') ES.qty = Math.max(1, +e.target.value || 1);
  });

  let lastRender = 0;
  S4.advance = dt => {
    for (const o of activeOrders()) { o.done = Math.min(1, o.done + dt / 3600 / S4.buildHours(o.building)); }
    for (const o of E.queue.filter(o => o.done >= 1)) { const g = E.groups.find(g => g.building === o.building && g.process === o.process); if (g) g.count++; else E.groups.push({ id: E.uid++, building: o.building, process: o.process, count: 1, on: true }); }
    E.queue = E.queue.filter(o => o.done < 1);
    if (S4.groundAdvance) S4.groundAdvance(dt);
    for (const p of E.programmes) p.progress = Math.min(1, p.progress + dt / 86400 / S4.programmeDays(p.number));
    for (const p of E.programmes.filter(p => p.progress >= 1)) E.done.push(p.number);
    E.programmes = E.programmes.filter(p => p.progress < 1);
    if (Date.now() - lastRender > 900) { lastRender = Date.now(); if (S4.screen === 'economy') render(); else if (S4.screen === 'research') S4.research.render(); else if (S4.screen === 'ground' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) S4.ground.render(); }
  };

  S4.economy = { render, ES, TABS, msTile, msCard, msIcon, unlocksOf, COMPUTE };
})();
