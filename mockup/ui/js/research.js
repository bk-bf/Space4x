'use strict';
(() => {
  const { D, E, fmt, esc, gl, mi, bi, ci, T, dl, meter } = S4;
  const X = () => S4.economy;
  const RS = { tab: 'tree' };
  const TABS = [['tree', 'Dependency tree', 'net'], ['programmes', 'Programmes', 'list'], ['unlocks', 'Unlocks', 'box']];
  
  function layout() {
    const depth = {};
    for (const m of D.miles) depth[m.number] = 1 + Math.max(-1, ...m.requires.map(r => depth[r]));
    const byCol = {};
    for (const m of D.miles) (byCol[depth[m.number]] = byCol[depth[m.number]] || []).push(m.number);
    const cols = Object.keys(byCol).length, rows = Math.max(...Object.values(byCol).map(a => a.length));
    const pos = {};
    for (const [c, ns] of Object.entries(byCol)) ns.forEach((n, i) => { pos[n] = { col: +c, row: (i + .5) * (rows / ns.length) - .5 }; });
    return { pos, cols, rows };
  }

  const kp = (ic, big, sub, warn, tip) => `<div class="kpi ${warn ? 'warn' : ''}" data-tip="${esc(tip)}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;

  function kpis() {
    const states = D.miles.map(m => S4.milestoneState(m.number));
    const avail = D.miles.filter((m, i) => states[i] === 'available');
    const ready = avail.filter(m => Object.entries(S4.bill(m.number).mats).every(([id, v]) => (E.stock[id] || 0) >= v)).length;
    const want = E.programmes.reduce((a, p) => a + X().COMPUTE(p.number), 0);
    const next = E.programmes.map(p => (1 - p.progress) * S4.programmeDays(p.number)).sort((a, b) => a - b)[0];
    const items = D.blds.filter(S4.unlocked).length + D.comps.filter(S4.unlocked).length;
    return `<div class="kpis s">
      ${kp('flask', `${E.done.length} of ${D.miles.length}`, 'milestones reached', false, T('Milestones', dl('The 29 gates from present-day Earth to a stabilised jump point.')))}
      ${kp('hammer', String(E.programmes.length), next ? `next done in ${fmt.days(next)}` : 'none running', false, T('Programmes running', dl('A programme spends its bill when it starts and runs for its length.')))}
      ${kp('play', String(avail.length), `${ready} with the bill in store`, false, T('Ready to start', dl('Milestones whose earlier gates are done.'), `${ready} have every material in store`))}
      ${kp('chip', '0 cu', `wants ${fmt.group(want)} cu an hour`, want > 0, T('Compute', dl('Cycles made by data centres, against what running programmes draw. Mock figures.'), 'No data centre yet'))}
      ${kp('box', String(items), 'buildings and parts open', false, T('Unlocked', dl('Buildings and ship components that research has opened so far.')))}
    </div>`;
  }

  function tree() {
    const L = layout(), pos = L.pos;
    return `<div class="main treemain">
      <div class="tree" id="tree" data-rows="${L.rows}" data-cols="${L.cols}"><svg></svg>${D.miles.map(m => `<div class="tpos" style="left:calc((100% - var(--tw)) * ${pos[m.number].col} / ${L.cols - 1});top:calc((100% - var(--th)) * ${pos[m.number].row} / ${L.rows - 1})">${X().msTile(m, 't')}</div>`).join('')}</div>
      <div class="tkey"><span><i class="d"></i>done</span><span><i class="a"></i>available or running</span><span><i class="l"></i>locked</span><span><u class="done"></u>line from a done milestone</span><span><u></u>line from one not yet done</span><span>selected: prerequisites amber, what it opens teal</span></div></div>
      <div class="side">${X().msCard(X().ES.ms, true)}</div>`;
  }

  function fit() {
    const box = document.getElementById('tree'); if (!box) return;
    const rows = +box.dataset.rows, cols = +box.dataset.cols, h = box.clientHeight, w = box.clientWidth;
    const th = Math.max(54, Math.min(88, Math.floor((h - 4 * (rows - 1)) / rows)));
    const tw = Math.max(64, Math.min(100, Math.floor((w - 4 * (cols - 1)) / cols)));
    box.style.setProperty('--th', th + 'px');
    box.style.setProperty('--tw', tw + 'px');
    box.classList.toggle('tiny', th < 84);
    box.classList.toggle('narrow', tw < 92);
  }

  function edges() {
    fit();
    const box = document.getElementById('tree'); if (!box) return;
    const svg = box.querySelector('svg'), R = box.getBoundingClientRect();
    if (!R.width) return;
    svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
    const sel = X().ES.ms, selM = D.miles[sel - 1];
    box.querySelectorAll('.tile.node').forEach(t => {
      const n = +t.dataset.id;
      t.classList.toggle('needs', selM.requires.includes(n));
      t.classList.toggle('feeds', D.miles[n - 1].requires.includes(sel));
    });
    const at = n => box.querySelector(`[data-act="ms"][data-id="${n}"]`).getBoundingClientRect();
    const open = [], done = [];
    for (const m of D.miles) for (const r of m.requires) {
      const a = at(r), b = at(m.number);
      const x1 = a.right - R.left, y1 = a.top + a.height / 2 - R.top, x2 = b.left - R.left, y2 = b.top + b.height / 2 - R.top;
      (E.done.includes(r) ? done : open).push(`M${x1} ${y1}H${x2 - 4}V${y2}H${x2}`);
    }
    svg.innerHTML = `<path d="${open.join('')}" fill="none" stroke="#443d80" stroke-width="2" stroke-dasharray="4 3"/><path d="${done.join('')}" fill="none" stroke="#f2b35d" stroke-width="2"/>`;
  }

  function progTile(m) {
    const st = S4.milestoneState(m.number), bl = S4.bill(m.number), ids = Object.keys(bl.mats);
    const ok = ids.filter(id => (E.stock[id] || 0) >= bl.mats[id]).length;
    const p = E.programmes.find(x => x.number === m.number);
    const glyph = st === 'done' ? gl('check', 'sm acc') : st === 'locked' ? gl('lock', 'sm dim') : st === 'running' ? gl('hammer', 'sm cool') : gl('play', 'sm cool');
    const miss = m.requires.filter(r => !E.done.includes(r));
    const foot = p ? `${meter(p.progress, 'cool', 'full')}<span class="dim sm">${fmt.days((1 - p.progress) * S4.programmeDays(m.number))} left</span>`
      : st === 'done' ? `<span class="dim sm">done</span>`
        : st === 'locked' ? `<span class="dim sm">needs ${miss.join(', ')}</span>`
          : `${meter(ids.length ? ok / ids.length : 1, ok === ids.length ? 'cool' : 'hot', 'full')}<span class="dim sm">${ok} of ${ids.length} in store</span>`;
    const tip = T(m.number + '. ' + m.name, dl(m.unlocks), `${S4.programmeDays(m.number)} d, tier ${m.tier}`, st === 'available' ? `${ok} of ${ids.length} bill materials in store` : '');
    return `<button class="tile node p ${st === 'locked' ? 'lock' : st === 'done' ? 'done' : 'avail'} ${X().ES.ms === m.number ? 'sel' : ''}" data-act="ms" data-id="${m.number}" data-tip="${esc(tip)}"><span class="num">${m.number}</span><span class="state">${glyph}</span><span class="art" style="height:42px;display:flex;align-items:center;justify-content:center;margin-top:8px">${X().msIcon(m, 2)}</span><span class="nm"><b>${esc(S4.MS_SHORT[m.number])}</b></span>${foot}</button>`;
  }

  function programmes() {
    const groups = [['running', 'Running', 'hammer'], ['available', 'Ready to start', 'play'], ['locked', 'Locked', 'lock'], ['done', 'Done', 'check']];
    return `<div class="main">${groups.map(([k, name, ic]) => { const ms = D.miles.filter(m => S4.milestoneState(m.number) === k); return `<h3>${gl(ic, 'sm')}${name} <small class="dim">${ms.length}</small></h3>${ms.length ? `<div class="grid m" style="grid-template-columns:repeat(auto-fill,112px);margin-bottom:6px">${ms.map(progTile).join('')}</div>` : `<p class="none" style="margin-bottom:6px">${k === 'running' ? 'No programme is running.' : 'None.'}</p>`}`; }).join('')}</div>
      <div class="side">${X().msCard(X().ES.ms, true)}</div>`;
  }

  function unlocks() {
    const rows = [{ number: 0, name: 'At the start' }, ...D.miles];
    return `<div class="main"><div class="urows">${rows.map(m => {
      const un = X().unlocksOf(m.number), n = un.blds.length + un.comps.length + un.mats.length, st = m.number ? S4.milestoneState(m.number) : 'done';
      return `<div class="urow ${st === 'locked' ? 'lock' : ''} ${st === 'done' ? 'done' : ''} ${X().ES.ms === m.number ? 'sel' : ''}" ${m.number ? `data-act="ms" data-id="${m.number}"` : ''} data-tip="${esc(T(m.name, m.number ? dl(m.unlocks) : dl('Buildings, parts and materials open before any research.'), `${n} items`))}">
        <div class="uh"><span class="num">${m.number || '-'}</span><b>${esc(m.number ? S4.MS_SHORT[m.number] : m.name)}</b><small class="dim">${n} items</small></div>
        <div class="eq" style="align-items:flex-end;gap:3px">${un.blds.map(id => bi(id, 1)).join('')}${un.comps.map(id => ci(id, 2)).join('')}${un.mats.map(id => mi(id, 2)).join('') || ''}${n ? '' : '<span class="dim">a gate for later milestones</span>'}</div></div>`;
    }).join('')}</div></div>
      <div class="side">${X().msCard(X().ES.ms, true)}</div>`;
  }

  function render() {
    const root = document.getElementById('view');
    const sc = [...root.querySelectorAll('.main, .side')].map(e => e.scrollTop);
    const body = RS.tab === 'tree' ? tree() : RS.tab === 'programmes' ? programmes() : unlocks();
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = `<div class="pan grow"><h2>${gl('flask')}Research <small>programmes, one for each milestone; left to right is the order the gates are passed</small></h2><div class="pb tb">${kpis()}<div class="tabs">${TABS.map(([id, n, ic]) => `<button class="${RS.tab === id ? 'on' : ''}" data-act="rtab" data-id="${id}">${gl(ic)}${n}</button>`).join('')}</div><div class="split tabbody">${body}</div></div></div>`;
    [...root.querySelectorAll('.main, .side')].forEach((e, i) => { if (sc[i]) e.scrollTop = sc[i]; });
    edges();
    watchTree();
    S4.chipsOnly();
  }

  let ro = null;
  function watchTree() {
    if (ro) ro.disconnect();
    const box = document.getElementById('tree');
    if (!box) return;
    ro = new ResizeObserver(() => edges());
    ro.observe(box);
    if (document.fonts) document.fonts.ready.then(edges);
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'research') return;
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, ES = X().ES;
    if (a === 'rtab') { RS.tab = t.dataset.id; history.replaceState(null, '', '#research/' + RS.tab); }
    else if (a === 'ms') ES.ms = +t.dataset.id;
    else if (a === 'mstart') { if (!E.programmes.some(p => p.number === ES.ms)) E.programmes.push({ number: ES.ms, progress: 0 }); }
    else return;
    render();
  });
  window.addEventListener('resize', () => { if (S4.screen === 'research') edges(); });

  S4.research = { render, RS, TABS };
})();
