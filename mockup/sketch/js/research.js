'use strict';
(() => {
  const { D, E, fmt, esc, gl, mi, bi, ci, T, dl, meter } = S4;
  const RS = { tab: 'tree', sel: 1, hover: null };
  const TABS = [['tree', 'Dependency tree', 'net'], ['programmes', 'Programmes', 'list'], ['unlocks', 'Unlocks', 'box']];
  const TILE_W = 144, TILE_H = 56, GUTTER = 28, ROW_GAP = 10, LABEL_W = 132, EDGE_PAD = 12, LANE_PAD = 3, LINE_STEP = 3, CLEARANCE = 2;
  const SUBJECT_ICONS = { launch: 'rocket', habitats: 'dome', power: 'bolt', computing: 'chip', chemistry: 'flask', mining: 'hammer', propulsion: 'flame', physics: 'atom' };
  const GLYPH = { done: ['check', 'acc'], running: ['hammer', 'cool'], ready: ['play', 'cool'], waiting: ['clock', 'dim'], locked: ['lock', 'dim'] };
  const STATUS_LABEL = { done: 'done', running: 'running', ready: 'ready', waiting: 'waiting', locked: 'locked' };
  const GROUP_NAMES = { running: 'Running', ready: 'Ready to start', waiting: 'Waiting for materials or buildings', locked: 'Locked behind prerequisites', done: 'Done' };
  const NONE = { running: 'No programme is running.', ready: 'None are ready.', waiting: 'None are waiting.', locked: 'None are locked.', done: 'None are done yet.' };
  const columnX = col => LABEL_W + EDGE_PAD + col * (TILE_W + GUTTER);
  const slotCount = room => Math.floor((room - 4) / LINE_STEP) + 1;
  const slotOffset = (k, n) => (k - (n - 1) / 2) * LINE_STEP;
  const GUTTER_SLOTS = slotCount(GUTTER), CHANNEL_SLOTS = slotCount(ROW_GAP);
  const hits = (a, b, r, m) => Math.max(a.x, b.x) > r.x - m && Math.min(a.x, b.x) < r.x + r.w + m && Math.max(a.y, b.y) > r.y - m && Math.min(a.y, b.y) < r.y + r.h + m;
  const segs = pts => pts.slice(1).map((p, i) => [pts[i], p]);

  class Slots {
    constructor(cap) { const mid = (cap - 1) / 2; this.runs = new Map(); this.order = Array.from({ length: cap }, (_, k) => k).sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid) || p - q); }
    free(line, lo, hi, key, merge) { const h = this.runs.get(line) || []; for (const s of this.order) if (!h.some(r => r.slot === s && r.hi >= lo - 1 && r.lo <= hi + 1 && !(merge && r.key === key))) return s; return -1; }
    take(line, slot, lo, hi, key) { const h = this.runs.get(line) || []; h.push({ slot, lo, hi, key }); this.runs.set(line, h); }
  }

  let CHAIN = null;
  function layoutChain() {
    const ms = D.miles, groups = D.subjects;
    const depth = new Map(ms.map(m => [m.number, S4.depthOf(m.number)]));
    const cols = Math.max(...depth.values()) + 1;
    const laneOf = new Map(ms.map(m => [m.number, groups.findIndex(s => s.id === m.subject)]));
    const rowsIn = groups.map((_, lane) => { let most = 1; for (let c = 0; c < cols; c++) most = Math.max(most, ms.filter(m => laneOf.get(m.number) === lane && depth.get(m.number) === c).length); return most; });
    const firstRow = rowsIn.map((_, l) => rowsIn.slice(0, l).reduce((a, b) => a + b, 0));
    const rows = rowsIn.reduce((a, b) => a + b, 0);
    const rowTop = r => ROW_GAP + r * (TILE_H + ROW_GAP);
    const placed = new Map();
    for (let c = 0; c < cols; c++) for (let lane = 0; lane < groups.length; lane++) {
      const hereMs = ms.filter(m => laneOf.get(m.number) === lane && depth.get(m.number) === c);
      if (!hereMs.length) continue;
      const desired = m => { const ys = m.requires.map(r => placed.get(r)).filter(Boolean); return ys.length ? ys.reduce((a, p) => a + p.y, 0) / ys.length : rowTop(firstRow[lane] + (rowsIn[lane] - 1) / 2); };
      const ordered = hereMs.slice().sort((a, b) => desired(a) - desired(b) || a.number - b.number);
      const taken = new Set();
      for (const m of ordered) {
        const want = desired(m); let best = -1, gap = Infinity;
        for (let r = 0; r < rowsIn[lane]; r++) {
          if (taken.has(r)) continue;
          const left = ordered.length - ordered.indexOf(m) - 1, free = rowsIn[lane] - taken.size - 1;
          if (free < left) continue;
          const g = Math.abs(rowTop(firstRow[lane] + r) - want);
          if (g < gap) { best = r; gap = g; }
        }
        taken.add(best);
        placed.set(m.number, { number: m.number, lane, col: c, row: firstRow[lane] + best, x: columnX(c), y: rowTop(firstRow[lane] + best), requires: m.requires });
      }
    }
    const nodes = ms.map(m => placed.get(m.number)), at = n => placed.get(n);
    const width = columnX(cols) - GUTTER + EDGE_PAD, height = rowTop(rows);
    const lanes = groups.map((s, i) => ({ id: s.id, name: s.name, top: rowTop(firstRow[i]) - LANE_PAD, height: rowsIn[i] * TILE_H + (rowsIn[i] - 1) * ROW_GAP + 2 * LANE_PAD }));
    const rects = nodes.map(n => ({ x: n.x, y: n.y, w: TILE_W, h: TILE_H }));
    const gs = new Slots(GUTTER_SLOTS), cs = new Slots(CHANNEL_SLOTS);
    const gutterX = (g, s) => columnX(g) + TILE_W + GUTTER / 2 + slotOffset(s, GUTTER_SLOTS);
    const channelY = (c, s) => (c === 0 ? 0 : rowTop(c - 1) + TILE_H) + ROW_GAP / 2 + slotOffset(s, CHANNEL_SLOTS);
    const clear = (pts, a, b) => segs(pts).every(([p, q]) => nodes.every((n, i) => n === a || n === b || !hits(p, q, rects[i], CLEARANCE)));
    const edges = [];
    const pairs = nodes.flatMap(b => b.requires.map(r => ({ a: at(r), b }))).sort((p, q) => p.b.col - p.a.col - (q.b.col - q.a.col) || p.b.number - q.b.number || p.a.number - q.a.number);
    for (const { a, b } of pairs) {
      const xs = a.x + TILE_W, ys = a.y + TILE_H / 2, xt = b.x, yt = b.y + TILE_H / 2, ga = a.col, gb = b.col - 1, sKey = 's' + a.number, tKey = 't' + b.number;
      const lo = Math.min, hi = Math.max;
      const viaGutter = (g, key) => () => {
        const slot = gs.free('g' + g, lo(ys, yt), hi(ys, yt), key, true); if (slot < 0) return;
        const x = gutterX(g, slot), pts = [{ x: xs, y: ys }, { x, y: ys }, { x, y: yt }, { x: xt, y: yt }];
        if (!clear(pts, a, b)) return;
        gs.take('g' + g, slot, lo(ys, yt), hi(ys, yt), key); return pts;
      };
      const planChannel = c => {
        const cy0 = channelY(c, 0);
        const sA = gs.free('g' + ga, lo(ys, cy0) - 1, hi(ys, cy0) + 1, sKey, true); if (sA < 0) return;
        const xa = gutterX(ga, sA);
        const sB = gs.free('g' + gb, lo(yt, cy0) - 1, hi(yt, cy0) + 1, tKey, true); if (sB < 0) return;
        const xb = gutterX(gb, sB);
        const sC = cs.free('c' + c, xa, xb, '', false); if (sC < 0) return;
        const cy = channelY(c, sC), pts = [{ x: xs, y: ys }, { x: xa, y: ys }, { x: xa, y: cy }, { x: xb, y: cy }, { x: xb, y: yt }, { x: xt, y: yt }];
        if (!clear(pts, a, b)) return;
        gs.take('g' + ga, sA, lo(ys, cy), hi(ys, cy), sKey); gs.take('g' + gb, sB, lo(yt, cy), hi(yt, cy), tKey); cs.take('c' + c, sC, xa, xb, '');
        return pts;
      };
      let pts;
      if (ys === yt && clear([{ x: xs, y: ys }, { x: xt, y: yt }], a, b)) pts = [{ x: xs, y: ys }, { x: xt, y: yt }];
      else if (b.col === a.col + 1) pts = viaGutter(ga, sKey)() || viaGutter(ga, tKey)();
      else {
        const chans = Array.from({ length: rows + 1 }, (_, c) => c).sort((p, q) => Math.abs(channelY(p, 0) - ys) + Math.abs(channelY(p, 0) - yt) - (Math.abs(channelY(q, 0) - ys) + Math.abs(channelY(q, 0) - yt)));
        pts = viaGutter(gb, tKey)() || viaGutter(ga, sKey)();
        for (const c of chans) { if (pts) break; pts = planChannel(c); }
      }
      if (!pts) pts = [{ x: xs, y: ys }, { x: xt, y: yt }];
      const cl = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
      edges.push({ from: a.number, to: b.number, d: cl.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : p.y === cl[i - 1].y ? `H${p.x}` : `V${p.y}`)).join('') });
    }
    return { nodes, lanes, cols, rows, width, height, edges, at };
  }

  const shortName = n => S4.MS_SHORT[n];
  const msIcon = (m, s) => S4.economy.msIcon(m, s);

  function openedBy(n) {
    if (n === 0) return { blds: D.blds.filter(b => !S4.prerequisitesOf(b.milestone).length), comps: D.comps.filter(c => !S4.prerequisitesOf(c.milestone).length), mats: [], also: false };
    const tags = S4.opensTags(n);
    const ground = new Set(D.mats.filter(m => (m.sources || []).some(s => s.body === 'earth')).map(m => m.id));
    const made = D.recipes.filter(r => tags.includes(r.milestone)).flatMap(r => Object.keys(r.outputs));
    const elsewhere = new Set(D.recipes.filter(r => !tags.includes(r.milestone)).flatMap(r => Object.keys(r.outputs)));
    return { blds: D.blds.filter(b => tags.includes(b.milestone)), comps: D.comps.filter(c => tags.includes(c.milestone)), mats: tags.length ? [...new Set(made)].filter(id => !elsewhere.has(id) && !ground.has(id) && !D.mat[id].unit) : [], also: tags.some(t => S4.prerequisitesOf(t).length > 1) };
  }
  const openedCount = o => o.blds.length + o.comps.length + o.mats.length;

  const kp = (ic, big, sub, warn, tip) => `<div class="kpi ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;
  function kpis() {
    const states = D.miles.map(m => S4.milestoneState(m.number));
    const open = states.filter(s => s === 'ready' || s === 'waiting').length, ready = states.filter(s => s === 'ready').length;
    const want = E.programmes.reduce((a, p) => a + S4.programmeCompute(p.number), 0);
    const next = E.programmes.map(p => (1 - p.progress) * S4.programmeDays(p.number)).sort((a, b) => a - b)[0];
    const items = D.blds.filter(S4.unlocked).length + D.comps.filter(S4.unlocked).length;
    return `<div class="kpis s">
      ${kp('flask', `${E.done.length} of ${D.miles.length}`, 'researched', false, T('Research', dl('The gates from present-day Earth to a stabilised jump point.')))}
      ${kp('hammer', String(E.programmes.length), E.programmes.length ? `next done in ${fmt.days(next)}` : 'none running', false, T('Programmes running', dl('A programme spends its bill when it starts and runs for its length.')))}
      ${kp('play', String(ready), `ready of ${open} open`, false, T('Ready to start', dl('Open projects with every building, site and material in place.'), `${open} projects have their prerequisites done`))}
      ${kp('chip', '0 cu', `wants ${fmt.group(want)} cu an hour`, want > 0, T('Compute', dl('Cycles made by data centres, against what running programmes and recipes draw.')))}
      ${kp('box', String(items), 'buildings and parts open', false, T('Unlocked', dl('Buildings and ship components that research has opened so far.')))}
    </div>`;
  }

  function tipFor(n) {
    const m = S4.mile(n), st = S4.milestoneState(n), miss = m.requires.filter(r => !E.done.includes(r));
    return T(`${n}. ${m.name}`, dl(m.unlocks), { done: 'Done', running: 'Programme running', ready: 'Ready to start', waiting: 'Waiting for materials or buildings', locked: '!Locked: needs ' + miss.map(shortName).join(', ') }[st], `${fmt.days(S4.programmeDays(n))}, tier ${m.tier}`);
  }

  function tree() {
    const C = CHAIN = CHAIN || layoutChain();
    const focus = RS.hover || RS.sel, fm = S4.mile(focus);
    const needs = new Set(fm.requires), feeds = new Set(D.miles.filter(m => m.requires.includes(focus)).map(m => m.number));
    const lines = C.edges.map(e => ({ ...e, kind: e.to === focus ? 'into' : e.from === focus ? 'out' : E.done.includes(e.from) ? 'done' : 'open' }));
    lines.sort((a, b) => ['open', 'done', 'out', 'into'].indexOf(a.kind) - ['open', 'done', 'out', 'into'].indexOf(b.kind));
    const dim = RS.hover || RS.sel;
    return `<div class="main treemain"><div class="treewrap">
      <div class="scroller" id="techTree"><div class="tcanvas" style="width:${C.width}px;height:${C.height}px">
        ${C.lanes.map(l => `<div class="lane" style="top:${l.top}px;height:${l.height}px"></div>`).join('')}
        <svg width="${C.width}" height="${C.height}">${lines.map(e => `<path class="e ${e.kind}" d="${e.d}"/>`).join('')}</svg>
        ${C.nodes.map(n => {
          const st = S4.milestoneState(n.number), [g, tone] = GLYPH[st], p = E.programmes.find(x => x.number === n.number);
          const rel = n.number === focus || needs.has(n.number) || feeds.has(n.number);
          return `<div class="tpos" style="left:${n.x}px;top:${n.y}px" data-ms="${n.number}"><button class="tile wide tn ${st} ${needs.has(n.number) ? 'needs' : ''} ${feeds.has(n.number) ? 'feeds' : ''} ${n.number === RS.sel ? 'sel' : ''} ${st === 'locked' ? 'locked' : ''} ${dim && !rel ? 'faded' : ''}" data-act="ms" data-id="${n.number}" data-tip="${esc(tipFor(n.number))}">
            <span class="pic">${msIcon(S4.mile(n.number), 1)}</span><span class="txt"><span class="top"><span class="num">${n.number}</span><span class="${tone}">${gl(g, 'sm')}</span></span><span class="wn">${esc(shortName(n.number))}</span>${p ? meter(p.progress, 'cool', 'full') : ''}</span></button></div>`;
        }).join('')}
        <div class="lanelabels" style="width:${LABEL_W}px;height:${C.height}px">${C.lanes.map(l => `<div class="lanelabel" style="top:${l.top}px;height:${l.height}px">${gl(SUBJECT_ICONS[l.id] || 'star', 'sm')}<span>${esc(l.name)}</span></div>`).join('')}</div>
      </div></div>
      <div class="tkey"><span><i class="d"></i>done</span><span><i class="a"></i>open or running</span><span><i class="l"></i>locked</span><span><u class="done"></u>from done research</span><span>${gl('arrowR', 'sm')}selected: <b class="acc">prerequisites</b>, <b class="cool">opens</b></span></div>
    </div></div>`;
  }

  function foot(m, st) {
    const p = E.programmes.find(x => x.number === m.number), c = S4.check(m.number);
    if (st === 'running') return { note: `${fmt.days((1 - p.progress) * S4.programmeDays(m.number))} left`, meter: p.progress, tone: 'cool' };
    if (st === 'done') return { note: 'done' };
    if (st === 'locked') return { note: 'needs ' + m.requires.filter(r => !E.done.includes(r)).map(shortName).join(', ') };
    const ok = c.bill.filter(b => b.ok).length;
    return { note: `${ok} of ${c.bill.length} in store`, meter: c.bill.length ? ok / c.bill.length : 1, tone: ok === c.bill.length ? 'cool' : 'hot' };
  }
  function programmes() {
    const order = ['running', 'ready', 'waiting', 'locked', 'done'], ICON = { running: 'hammer', ready: 'play', waiting: 'clock', locked: 'lock', done: 'check' }, TONE = { running: 'cool', ready: 'cool', waiting: 'dim', locked: 'hot', done: 'acc' };
    return `<div class="main">${order.map(k => {
      const ms = D.miles.filter(m => S4.milestoneState(m.number) === k);
      return `<h3>${gl(ICON[k], 'sm')}${GROUP_NAMES[k]} <small class="dim">${ms.length}</small></h3>${ms.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,112px);margin-bottom:6px">${ms.map(m => {
        const f = foot(m, k);
        return `<button class="tile node p ${k === 'locked' ? 'lock' : k === 'done' ? 'done' : 'avail'} ${RS.sel === m.number ? 'sel' : ''}" data-act="ms" data-id="${m.number}" data-tip="${esc(T(`${m.number}. ${m.name}`, dl(m.unlocks), `${fmt.days(S4.programmeDays(m.number))}, tier ${m.tier}`, k === 'waiting' ? '!' + f.note : f.note))}"><span class="num">${m.number}</span><span class="state ${TONE[k]}">${gl(ICON[k], 'sm')}</span><span class="art" style="height:42px;display:flex;align-items:center;justify-content:center;margin-top:8px">${msIcon(m, 2)}</span><span class="nm"><b>${esc(shortName(m.number))}</b></span>${f.meter !== undefined ? meter(f.meter, f.tone, 'full') : ''}<span class="dim sm clip">${esc(f.note)}</span></button>`;
      }).join('')}</div>` : `<p class="none" style="margin-bottom:6px">${NONE[k]}</p>`}`;
    }).join('')}</div>`;
  }

  function unlocks() {
    const rows = [{ number: 0, label: 'At the start' }, ...D.miles.map(m => ({ number: m.number, label: shortName(m.number) }))];
    return `<div class="main"><div class="urows">${rows.map(r => {
      const o = openedBy(r.number), n = openedCount(o), st = r.number ? S4.milestoneState(r.number) : 'done';
      return `<div class="urow ${st === 'locked' ? 'lock' : ''} ${st === 'done' ? 'done' : ''} ${RS.sel === r.number ? 'sel' : ''}" ${r.number ? `data-act="ms" data-id="${r.number}"` : ''}>
        <div class="uh"><span class="num">${r.number || '-'}</span><b>${esc(r.label)}</b><small class="dim">${n} items${o.also ? ', some need more' : ''}</small></div>
        <div class="eq" style="align-items:flex-end;gap:3px">${o.blds.map(b => bi(b.id, 1)).join('')}${o.comps.map(c => ci(c.id, 2)).join('')}${o.mats.map(id => mi(id, 2)).join('')}${n ? '' : '<span class="dim">a gate for later projects</span>'}</div></div>`;
    }).join('')}</div></div>`;
  }

  function card() {
    const n = RS.sel, m = S4.mile(n), st = S4.milestoneState(n), c = S4.check(n), o = openedBy(n), opens = openedCount(o), p = E.programmes.find(x => x.number === n), days = S4.programmeDays(n), cu = S4.programmeCompute(n);
    const chips = `<div class="row"><span class="pill" data-tip="Programme length">${gl('clock')}${fmt.days(days)}</span><span class="pill" data-tip="${m.tier === 'P' ? 'Proven' : m.tier === 'E' ? 'Engineering-plausible' : 'Speculative'}">${m.tier}</span><span class="pill" data-tip="${esc(T('Compute', dl('Cycles the programme draws while it runs.')))}">${gl('chip')}${cu ? fmt.group(cu) + ' cu an hour' : 'no compute'}</span></div>`;
    const action = st === 'running' ? `${meter(p.progress, 'cool', 'thick')}<span>${fmt.pct(p.progress)}</span><span class="dim">${fmt.days((1 - p.progress) * days)} left</span>`
      : st === 'done' ? `<span class="pill cool">${gl('check')}Reached</span>`
        : `<button data-act="mstart" ${st === 'ready' ? '' : 'disabled'}>${gl('play', 'sm')}Start programme</button>${c.missing.length ? `<span class="hot">${esc(c.missing.length === 1 ? c.missing[0] : `${c.missing.length} things missing`)}</span>` : ''}`;
    const bill = c.bill.length ? `<div class="eq">${c.bill.map(b => `<span class="have ${b.ok ? 'ok' : 'short'}" data-tip="${esc(S4.matTip(b.id) + `\nNeed ${fmt.cargo(b.id, b.need)}, have ${fmt.cargo(b.id, b.have)}`)}">${mi(b.id, 2)}<span>${fmt.cargo(b.id, b.have)}</span><span class="need">/ ${fmt.cargo(b.id, b.need)}</span></span>`).join('')}</div>` : '<span class="dim">no materials</span>';
    const stand = c.stand.length ? `<div class="eq">${c.stand.map(s => `<span class="have stand ${s.ok ? 'ok' : 'short'}" data-tip="${esc(T(s.kind === 'building' ? D.bld[s.id].name : D.comp[s.id].name, s.ok ? 'Standing' : '!Missing'))}"><span class="ibox">${s.kind === 'building' ? bi(s.id, 2) : ci(s.id, 2)}</span><span>${s.ok ? 'yes' : 'no'}</span></span>`).join('')}</div>` : '<span class="dim">no buildings or parts</span>';
    const sites = c.sites.length ? `<div class="siteneeds">${c.sites.map(s => `<div class="siteneed ${s.ok ? '' : 'short'}">${gl(s.ok ? 'check' : 'cross', 'sm')}<span>${esc(s.label)}</span></div>`).join('')}</div>` : '';
    const req = c.requires.length ? c.requires.map(r => `<button class="tile slot" data-act="ms" data-id="${r.number}" data-tip="${esc(T(`${r.number}. ${S4.mile(r.number).name}`, dl(S4.mile(r.number).unlocks), r.ok ? 'Done' : '!Not done'))}"><span class="corner r ${r.ok ? 'acc' : 'hot'}">${gl(r.ok ? 'check' : 'lock')}</span><span>${esc(shortName(r.number))}</span></button>`).join('') : '<span class="dim">none</span>';
    const un = opens ? `<div class="eq" style="gap:3px">${o.blds.map(b => `<span class="ibox">${bi(b.id, 2)}</span>`).join('')}${o.comps.map(x => `<span class="ibox">${ci(x.id, 2)}</span>`).join('')}${o.mats.map(id => `<span class="ibox">${mi(id, 2)}</span>`).join('')}</div>${o.also ? '<div class="dim">Some also wait for their other prerequisites.</div>' : ''}` : '<span class="dim">nothing new, it is a gate for later ones</span>';
    return `<div class="card" style="margin:0"><header>${msIcon(m, 2)}<div style="flex:1"><div class="t">${m.number}. ${esc(m.name)}</div><div class="s">${esc(m.unlocks)}</div></div><span class="pill ${st === 'done' ? 'cool' : st === 'locked' ? 'hot' : ''}">${STATUS_LABEL[st]}</span></header><div class="cb">
      ${chips}<div class="row">${action}</div>
      <div><span class="lbl">Bill, have / need</span>${bill}</div>
      <div><span class="lbl">Must stand</span>${stand}${sites}</div>
      <div><span class="lbl">Prerequisites</span><div class="eq">${req}</div></div>
      <div><span class="lbl">${opens ? `Unlocks (${opens})` : 'Unlocks'}</span>${un}</div>
    </div></div>`;
  }

  function render() {
    const root = document.getElementById('view');
    const sc = [...root.querySelectorAll('.main, .side, .scroller')].map(e => [e.scrollTop, e.scrollLeft]);
    const body = RS.tab === 'tree' ? tree() : RS.tab === 'programmes' ? programmes() : RS.tab === 'unlocks' ? unlocks() : S4.sketchUI.rtab(RS.tab);
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = `<div class="pan grow"><h2>${gl('flask')}Research</h2><div class="pb tb">${S4.sketchUI ? S4.sketchUI.rkpis(kp) : kpis()}<div class="tabs">${TABS.map(([id, n, ic]) => `<button class="${RS.tab === id ? 'on' : ''}" data-act="rtab" data-id="${id}">${gl(ic)}${n}</button>`).join('')}</div><div class="split tabbody">${body}<div class="side">${(S4.sketchUI && S4.sketchUI.rcard(RS)) || card()}</div></div></div></div>`;
    [...root.querySelectorAll('.main, .side, .scroller')].forEach((e, i) => { if (sc[i]) { e.scrollTop = sc[i][0]; e.scrollLeft = sc[i][1]; } });
    S4.chipsOnly();
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'research') return;
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act;
    if (a === 'rtab') { RS.tab = t.dataset.id; history.replaceState(null, '', '#research/' + RS.tab); }
    else if (a === 'ms') { RS.sel = +t.dataset.id; RS.hover = null; }
    else if (a === 'mstart') { if (S4.milestoneState(RS.sel) === 'ready') { const b = S4.bill(RS.sel); for (const [id, v] of Object.entries(b.mats)) E.stock[id] -= v; E.programmes.push({ number: RS.sel, progress: 0 }); } }
    else return;
    render();
  });
  document.addEventListener('mouseover', e => {
    if (S4.screen !== 'research' || RS.tab !== 'tree') return;
    const t = e.target.closest && e.target.closest('.tpos');
    const n = t ? +t.dataset.ms : null;
    if (n === RS.hover) return;
    RS.hover = n;
    const box = document.getElementById('techTree');
    if (box) render();
  });
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const s = e.target.closest && e.target.closest('#techTree');
    if (!s || e.target.closest('.tile')) return;
    drag = { s, x: e.clientX, y: e.clientY, l: s.scrollLeft, t: s.scrollTop };
    s.classList.add('panning');
  });
  document.addEventListener('pointermove', e => { if (drag) { drag.s.scrollLeft = drag.l - (e.clientX - drag.x); drag.s.scrollTop = drag.t - (e.clientY - drag.y); } });
  document.addEventListener('pointerup', () => { if (drag) { drag.s.classList.remove('panning'); drag = null; } });
  document.addEventListener('wheel', e => {
    const s = e.target.closest && e.target.closest('#techTree');
    if (!s || s.scrollHeight > s.clientHeight || e.shiftKey) return;
    s.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });

  const unlocksBlock = n => {
    const o = openedBy(n), opens = openedCount(o);
    return opens ? `<div><span class="lbl">Unlocks (${opens})</span><div class="eq" style="gap:3px">${o.blds.map(b => `<span class="ibox">${bi(b.id, 2)}</span>`).join('')}${o.comps.map(x => `<span class="ibox">${ci(x.id, 2)}</span>`).join('')}${o.mats.map(id => `<span class="ibox">${mi(id, 2)}</span>`).join('')}</div></div>` : '';
  };
  S4.research = { render, RS, TABS, unlocksBlock };
})();
