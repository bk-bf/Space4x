'use strict';
(() => {
  const { fmt, esc, gl, E, D } = S4;
  const T = (title, ...lines) => [title, ...lines.flat().filter(Boolean)].join('\n');

  const dl = t => (t ? '~' + t : '');
  const mi = (id, s = 1, tip) => `<img class="px mi" src="${S4.matIcon(id)}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${esc(tip || matTip(id))}">`;
  const bi = (id, s = 1, tip) => `<img class="px bi" src="${S4.bldIcon(id)}" width="${24 * s}" height="${20 * s}" alt="" data-tip="${esc(tip || bldTip(id))}">`;
  const ci = (id, s = 1, tip) => `<img class="px ci" src="${S4.compIcon(id)}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${esc(tip || compTip(id))}">`;

  const bldTip = id => T(D.bld[id].name, S4.KIND_NAMES[D.bld[id].kind], dl(S4.desc.bld(id)));
  const compTip = id => T(D.comp[id].name, D.comp[id].kind[0].toUpperCase() + D.comp[id].kind.slice(1), dl(S4.desc.comp(id)));

  function matTip(id) {
    const m = D.mat[id], f = S4.lastFlows, P = S4.perOf();
    const lines = [S4.CAT_NAMES[m.category], dl(S4.desc.mat(id))];
    if (f) {
      const made = (f.out[id] || 0) * P.hours, used = (f.use[id] || 0) * P.hours, st = E.stock[id] || 0, c = S4.cover(id, f);
      if (st > 0 || made > 0 || used > 0) {
        lines.push(`Stock ${fmt.amount(id, st)}`);
        lines.push(`Made ${fmt.amount(id, made)} ${P.word}, used ${fmt.amount(id, used)} ${P.word}`);
        lines.push(`Balance ${fmt.signed(id, made - used)} ${P.word}`);
        lines.push(isFinite(c) ? `Cover ${fmt.days(c)}` : made > 0 ? 'Growing' : '');
        if (S4.KCAL[id]) lines.push(`${fmt.group(S4.KCAL[id])} kcal a kilogram`);
      }
    }
    return T(m.name.split(' (')[0], lines);
  }

  const meter = (v, cls = '', extra = '') => `<span class="mt ${cls} ${extra}"><i style="width:${Math.max(0, Math.min(1, v)) * 100}%"></i></span>`;

  const tip = document.getElementById('tip');
  document.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const parts = t.getAttribute('data-tip').split('\n');
    tip.innerHTML = `<b>${esc(parts[0])}</b>` + parts.slice(1).map(l => `<div class="l ${l.startsWith('!') ? 'w' : l.startsWith('~') ? 'd' : ''}">${esc(l.replace(/^[!~]/, ''))}</div>`).join('');
    tip.hidden = false;
    place(e);
  });
  document.addEventListener('mousemove', e => { if (!tip.hidden) place(e); });
  document.addEventListener('mouseleave', () => { tip.hidden = true; });
  function place(e) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + w > innerWidth - 4) x = e.clientX - w - 10;
    if (y + h > innerHeight - 4) y = e.clientY - h - 10;
    tip.style.left = Math.max(2, x) + 'px'; tip.style.top = Math.max(2, y) + 'px';
  }

  const SCREENS = [
    { id: 'map', title: 'System map (unchanged, not in this mockup)', icon: 'map', key: 'F1', hash: '#map' },
    { id: 'economy', title: 'Economy', icon: 'factory', key: 'F2', hash: '#economy' },
    { id: 'research', title: 'Research', icon: 'flask', key: 'F3', hash: '#research' },
    { id: 'designer', title: 'Ship classes', icon: 'ship', key: 'F4', hash: '#designer' },
    { id: 'ground', title: 'Ground forces', icon: 'tank', key: 'F6', hash: '#ground' },
    { id: 'commanders', title: 'Commanders', icon: 'star', key: 'F7', hash: '#commanders' },
    { id: 'intel', title: 'Intelligence', icon: 'eye', key: 'F8', hash: '#intel' },
    { id: 'galaxy', title: 'Galaxy', icon: 'net', key: 'F9', hash: '#galaxy' }
  ];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STEPS = [['5s', 5], ['30s', 30], ['2m', 120], ['5m', 300], ['20m', 1200], ['1h', 3600], ['3h', 10800], ['8h', 28800], ['1d', 86400], ['5d', 432000], ['30d', 2592000]];
  const clock = { t: Date.UTC(2026, 10, 15, 6, 0), step: 3600, running: false };
  const clockText = () => { const d = new Date(clock.t); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

  function chips() {
    const f = S4.flows(); S4.lastFlows = f;
    const spare = f.power.supply - f.power.demand;
    const fs = f.food.made / f.food.need - 1;
    let scarce = null;
    for (const m of D.mats) { const c = S4.cover(m.id, f); if (isFinite(c) && (E.stock[m.id] || 0) > 0 && (!scarce || c < scarce.c)) scarce = { id: m.id, c }; }
    const c = [
      ['people', fmt.people(E.pop), 'People', false],
      ['grain', (fs >= 0 ? '+' : '') + fmt.pct(fs), 'Food: production against need', fs < 0],
      ['bolt', (spare >= 0 ? '+' : '-') + fmt.power(Math.abs(spare)), 'Power: generation less demand', spare < 0],
      ['chip', 'None', 'Compute produced an hour', false],
      ['warn', scarce ? S4.short(scarce.id) : 'None', scarce ? `Scarcest material: ${fmt.days(scarce.c)} left` : 'Scarcest material', !!scarce],
      ['flask', `${E.done.length}/${D.miles.length}`, 'Milestones reached', false]
    ];
    return c.map(([i, v, t, w]) => `<span class="chip ${w ? 'warn' : ''}" data-tip="${esc(t)}">${gl(i)}${esc(v)}</span>`).join('');
  }

  function topbar(cur) {
    const el = document.getElementById('top');
    el.innerHTML = `<span class="brand">${gl('logo')}<b>Space4x</b></span>
      <nav id="nav">${SCREENS.map(s => `<button data-nav="${s.hash || ''}" ${s.hash ? '' : 'disabled'} class="${cur === s.id ? 'on' : ''}" data-tip="${esc(s.title + ' (' + s.key + ')')}">${gl(s.icon)}</button>`).join('')}</nav>
      <div id="time"><span class="clock">${clockText()}</span><button id="bPause" class="${clock.running ? '' : 'on'}" data-tip="Pause (space)">${gl('pause')}</button><button id="bPlay" class="${clock.running ? 'on' : ''}" data-tip="Run continuously (space)">${gl('play')}</button><span id="steps">${STEPS.map(([l, s]) => `<button data-step="${s}" class="${clock.step === s ? 'on' : ''}">${l}</button>`).join('')}</span></div>
      <div id="chips">${chips()}</div>
      <button id="bSet" class="${cur === 'icons' ? 'on' : ''}" data-nav="#icons" data-tip="Icon set">${gl('list')}</button>`;
  }
  function chipsOnly() { const el = document.getElementById('chips'); if (el) el.innerHTML = chips(); }

  document.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]');
    if (n && n.dataset.nav) { location.hash = n.dataset.nav; return; }
    const st = e.target.closest('[data-step]');
    if (st) { clock.step = +st.dataset.step; S4.refreshTop(); }
    if (e.target.closest('#bPause')) { clock.running = false; S4.refreshTop(); }
    if (e.target.closest('#bPlay')) { clock.running = true; S4.refreshTop(); }
  });
  setInterval(() => {
    if (!clock.running) return;
    clock.t += clock.step * 1000 / 4;
    const c = document.querySelector('.clock'); if (c) c.textContent = clockText();
    if (S4.advance) S4.advance(clock.step / 4);
  }, 250);

  Object.assign(S4, { T, dl, mi, bi, ci, matTip, bldTip, compTip, meter, SCREENS, topbar, chipsOnly, clock, clockText });
})();
