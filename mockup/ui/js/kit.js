'use strict';
(() => {
  const { esc, gl } = S4;
  const nm = t => `<span class="nm"><b>${esc(t)}</b></span>`;
  const nm2 = (a, b) => `<span class="nm two"><b>${esc(a)}</b><em>${esc(b)}</em></span>`;
  const kp = (ic, big, sub, warn, tip) => `<div class="kpi ${warn ? 'warn' : ''}" data-tip="${esc(tip || '')}"><span class="gico">${gl(ic)}</span><div><div class="big">${esc(big)}</div><small>${esc(sub)}</small></div></div>`;
  const kpis = list => `<div class="kpis s" style="grid-template-columns:repeat(${list.length},minmax(0,1fr))">${list.map(k => kp(...k)).join('')}</div>`;
  const tabs = (list, cur) => `<div class="tabs">${list.map(([id, n, ic]) => `<button class="${cur === id ? 'on' : ''}" data-act="stab" data-id="${id}">${gl(ic)}${n}</button>`).join('')}</div>`;
  const pct = v => Math.round(v * 100) + '%';
  const filters = (list, cur, act) => `<div class="filters">${list.map(([id, label, n]) => `<button class="${cur === id ? 'on' : ''}" data-act="${act}" data-id="${id}">${esc(label)}${n === undefined ? '' : ' ' + n}</button>`).join('')}</div>`;
  const pb = (label, v, cls = '') => `<div class="fr"><span class="nm">${label}</span><span class="v" style="display:flex;align-items:center;gap:6px;min-width:120px">${S4.meter(v, cls, '')}<span style="min-width:34px;text-align:right">${pct(v)}</span></span></div>`;

  function page({ icon, title, small, kpi, tabsHtml, body, side = true }) {
    const root = document.getElementById('view');
    const sc = [...root.querySelectorAll('.main, .side')].map(e => e.scrollTop);
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = `<div class="pan grow"><h2>${gl(icon)}${esc(title)} <small>${esc(small)}</small></h2><div class="pb tb">${kpi}${tabsHtml}<div class="split tabbody">${body}</div></div></div>`;
    [...root.querySelectorAll('.main, .side')].forEach((e, i) => { if (sc[i]) e.scrollTop = sc[i]; });
    S4.chipsOnly();
  }

  function bind(screen, state, render, handlers) {
    document.addEventListener('click', e => {
      if (S4.screen !== screen) return;
      const t = e.target.closest('[data-act]'); if (!t || !document.getElementById('view').contains(t)) return;
      const a = t.dataset.act;
      if (a === 'stab') { state.tab = t.dataset.id; history.replaceState(null, '', '#' + screen + '/' + state.tab); render(); return; }
      if (handlers[a]) { handlers[a](t.dataset.id, t); render(); }
    });
  }

  S4.kit = { nm, nm2, kp, kpis, tabs, pct, filters, pb, page, bind };
})();
