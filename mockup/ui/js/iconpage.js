'use strict';
(() => {
  const { D, esc, gl, mi, bi, ci, short } = S4;
  const IS = { tab: 'materials', sel: ['mat', 'iron'] };
  const TABS = [['materials', 'Materials'], ['buildings', 'Buildings'], ['components', 'Components'], ['glyphs', 'Glyphs']];

  const cell = (kind, id, name, big = 2) => `<button class="icell ${IS.sel[0] === kind && IS.sel[1] === id ? 'on' : ''}" data-act="isel" data-k="${kind}" data-id="${id}" style="${IS.sel[0] === kind && IS.sel[1] === id ? '--ec:var(--accent)' : ''}">${kind === 'mat' ? mi(id, big, name) : kind === 'bld' ? bi(id, big, name) : ci(id, big, name)}<span>${esc(name)}</span></button>`;

  function preview() {
    const [k, id] = IS.sel;
    if (k === 'glyph') return `<div class="card"><header><div><div class="t">${id}</div><div class="s">11 by 11 glyph, one colour</div></div></header><div class="cb"><div style="color:var(--accent)">${gl(id).replace('class="ic ', 'style="width:176px;height:176px" class="ic ')}</div></div></div>`;
    if (k === 'mat') {
      const m = D.mat[id], I = S4.matInfo(id);
      return `<div class="card"><header><div><div class="t">${esc(short(id))}</div><div class="s">${S4.CAT_NAMES[m.category]}</div></div></header><div class="cb">
        <div style="background:var(--bg);display:flex;justify-content:center;padding:10px">${mi(id, 10, short(id))}</div>
        <div class="flow"><div class="fr"><span class="nm dim">Shape</span><span class="v">${S4.SHAPE_NAMES[I.shape]}</span></div><div class="fr"><span class="nm dim">Mark</span><span class="v">${I.code}</span></div><div class="fr"><span class="nm dim">Colour</span><span class="v" style="display:flex;gap:2px;align-items:center">${['d', 'm', 'l', 'h'].map(c => `<i style="width:14px;height:14px;background:rgb(${I.R[c]})"></i>`).join('')}</span></div></div>
        <div style="display:flex;gap:10px;align-items:flex-end">${mi(id, 1)}${mi(id, 2)}${mi(id, 3)}<span class="dim" style="font-size:15px">16, 32, 48 px</span></div></div></div>`;
    }
    if (k === 'bld') {
      const b = D.bld[id];
      return `<div class="card"><header><div><div class="t">${esc(b.name)}</div><div class="s">${S4.KIND_NAMES[b.kind]}</div></div></header><div class="cb"><div style="background:var(--bg);display:flex;justify-content:center;padding:10px">${bi(id, 8, b.name)}</div><div style="display:flex;gap:10px;align-items:flex-end">${bi(id, 1)}${bi(id, 2)}${bi(id, 3)}<span class="dim" style="font-size:15px">24, 48, 72 px</span></div></div></div>`;
    }
    const c = D.comp[id];
    return `<div class="card"><header><div><div class="t">${esc(c.name)}</div><div class="s">${c.kind}</div></div></header><div class="cb"><div style="background:var(--bg);display:flex;justify-content:center;padding:10px">${ci(id, 10, c.name)}</div><div style="display:flex;gap:10px;align-items:flex-end">${ci(id, 1)}${ci(id, 2)}${ci(id, 3)}</div></div></div>`;
  }

  function body() {
    if (IS.tab === 'materials') {
      return D.cats.map(c => { const ms = D.mats.filter(m => m.category === c); return `<h3>${mi(S4.CAT_REP[c], 1)}${S4.CAT_NAMES[c]} <small class="dim">${ms.length}, drawn as: ${[...new Set(ms.map(m => S4.SHAPE_NAMES[S4.matInfo(m.id).shape]))].join(', ')}</small></h3><div class="igrid sm">${ms.map(m => cell('mat', m.id, short(m.id))).join('')}</div>`; }).join('');
    }
    if (IS.tab === 'buildings') {
      return Object.keys(S4.KIND_NAMES).map(k => { const bs = D.blds.filter(b => b.kind === k); return `<h3>${bi(S4.KIND_EX[k], 1)}${S4.KIND_NAMES[k]} <small class="dim">${bs.length}</small></h3><div class="igrid b">${bs.map(b => cell('bld', b.id, b.name, 3)).join('')}</div>`; }).join('');
    }
    if (IS.tab === 'components') {
      const kinds = [...new Set(D.comps.map(c => c.kind))];
      return kinds.map(k => `<h3>${ci(D.comps.find(c => c.kind === k).id, 1)}${k[0].toUpperCase() + k.slice(1)}</h3><div class="igrid b">${D.comps.filter(c => c.kind === k).map(c => cell('comp', c.id, c.name, 3)).join('')}</div>`).join('');
    }
    return `<h3>UI glyphs, 11 by 11, one colour. The first 25 are the game's own; the rest are new for this look</h3><div class="igrid sm" style="grid-template-columns:repeat(auto-fill,74px)">${Object.keys(S4.GLYPHS).filter(g => g !== 'sort').map(g => `<button class="icell" data-act="isel" data-k="glyph" data-id="${g}" style="min-height:0;color:var(--text)">${gl(g).replace('class="ic ', 'style="width:33px;height:33px" class="ic ')}<span>${g}</span></button>`).join('')}</div>`;
  }

  function render() {
    const root = document.getElementById('view');
    const sc = (root.querySelector('.main') || {}).scrollTop || 0;
    root.style.gridTemplateColumns = '1fr';
    root.innerHTML = `<div class="pan grow"><h2>${gl('list')}Icon set <small>${D.mats.length} materials, ${D.blds.length} buildings, ${D.comps.length} components, all drawn in code</small></h2><div class="pb tb"><div class="tabs">${TABS.map(([id, n]) => `<button class="${IS.tab === id ? 'on' : ''}" data-act="itab" data-id="${id}">${n}</button>`).join('')}</div><div class="split tabbody" style="grid-template-columns:minmax(0,1fr) 330px"><div class="main">${body()}</div><div class="side">${preview()}</div></div></div></div>`;
    const m = root.querySelector('.main'); if (m) m.scrollTop = sc;
  }

  document.addEventListener('click', e => {
    if (S4.screen !== 'icons') return;
    const t = e.target.closest('[data-act]'); if (!t) return;
    if (t.dataset.act === 'itab') { IS.tab = t.dataset.id; IS.sel = IS.tab === 'materials' ? ['mat', 'iron'] : IS.tab === 'buildings' ? ['bld', 'mine_earth'] : IS.tab === 'components' ? ['comp', 'kerolox_engine'] : ['glyph', 'logo']; history.replaceState(null, '', '#icons/' + IS.tab); render(); const m = document.querySelector('#view .main'); if (m) m.scrollTop = 0; }
    else if (t.dataset.act === 'isel') { IS.sel = [t.dataset.k, t.dataset.id]; render(); }
  });

  S4.iconpage = { render, IS };
})();
