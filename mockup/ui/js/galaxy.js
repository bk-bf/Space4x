'use strict';
(() => {
  const { esc, gl, T, dl } = S4;
  const { nm, nm2, kpis, tabs, page, bind } = S4.kit;
  const SYS = [
    { id: 'sol', name: 'Sol', x: 0, y: 0, color: [255, 216, 112], r: 4, star: 'G2 yellow', jumps: '1, unsurveyed', bodies: 11, colonies: 1, home: true },
    { id: 'acen', name: 'Alpha Centauri', x: 72, y: -44, color: [255, 236, 170], r: 4, star: 'G2 and K1 pair', jumps: 'Unknown' },
    { id: 'barn', name: "Barnard's Star", x: -66, y: -56, color: [230, 110, 70], r: 2, star: 'M4 red dwarf', jumps: 'Unknown' },
    { id: 'wolf', name: 'Wolf 359', x: -118, y: 20, color: [230, 110, 70], r: 2, star: 'M6 red dwarf', jumps: 'Unknown' },
    { id: 'lal', name: 'Lalande 21185', x: 10, y: 76, color: [240, 150, 90], r: 3, star: 'M2 red dwarf', jumps: 'Unknown' },
    { id: 'sir', name: 'Sirius', x: 122, y: 42, color: [200, 220, 255], r: 5, star: 'A1 white pair', jumps: 'Unknown' },
    { id: 'luy', name: 'Beyond jump point A', x: 40, y: 26, color: [120, 116, 160], r: 2, star: 'Unknown', jumps: 'Unknown', unknown: true },
    { id: 'tauc', name: 'Tau Ceti', x: -48, y: 118, color: [250, 214, 140], r: 3, star: 'G8 yellow dwarf', jumps: 'Unknown' },
    { id: 'eri', name: 'Epsilon Eridani', x: 60, y: -118, color: [246, 168, 100], r: 3, star: 'K2 orange dwarf', jumps: 'Unknown' },
    { id: 'proc', name: 'Procyon', x: -128, y: -112, color: [242, 236, 206], r: 4, star: 'F5 pair', jumps: 'Unknown' }
  ];
  const LINKS = [['sol', 'luy']];
  const GA = { tab: 'map', sel: 'sol', z: 2, fitted: false };
  const dist = s => Math.hypot(s.x, s.y) / 10 * 1.0;
  const tipOf = s => T(s.name, dl(s.unknown ? 'A system beyond a jump point nobody has surveyed.' : `${s.star} star.`), s.home ? 'Your home system' : `${dist(s).toFixed(1)} light years from Sol`, `Jump points: ${s.jumps}`);

  function map() {
    const z = GA.z, W = 270 * z + 140, H = 250 * z + 120, cx = 128 * z + 70, cy = 118 * z + 60;
    const pos = s => [cx + s.x * z, cy + s.y * z];
    const lines = LINKS.map(([a, b]) => { const A = pos(SYS.find(s => s.id === a)), B = pos(SYS.find(s => s.id === b)); return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`; }).join('');
    return `<div class="gmap"><div class="gtools"><button data-act="gzoom" data-id="-1" ${z <= 1 ? 'disabled' : ''}>${gl('minus')}</button><span class="dim">zoom ${z}</span><button data-act="gzoom" data-id="1" ${z >= 6 ? 'disabled' : ''}>${gl('plus')}</button><span class="tag">mock map</span></div>
      <div class="gscroll"><div class="gin" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" class="glinks">${lines}</svg>${SYS.map(s => { const [x, y] = pos(s); return `<button class="gstar ${GA.sel === s.id ? 'sel' : ''} ${s.unknown ? 'unk' : ''}" style="left:${x}px;top:${y}px" data-act="gsel" data-id="${s.id}" data-tip="${esc(tipOf(s))}">${S4.si(s.color, s.r, 2, tipOf(s))}<span>${esc(s.name)}</span></button>`; }).join('')}</div></div></div>`;
  }
  function sysTile(s) {
    return `<button class="tile bld ${GA.sel === s.id ? 'sel' : ''} ${s.unknown ? 'idle' : ''}" data-act="gsel" data-id="${s.id}" data-tip="${esc(tipOf(s))}"><span class="art">${S4.si(s.color, s.r, 2, tipOf(s))}</span>${nm(s.name)}<span class="dim" style="font-size:14px">${s.home ? 'home' : s.unknown ? 'unexplored' : dist(s).toFixed(1) + ' ly'}</span></button>`;
  }
  function card() {
    const s = SYS.find(x => x.id === GA.sel);
    const line = (ic, l, v) => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v">${esc(v)}</span></div>`;
    return `<div class="card"><header>${S4.si(s.color, s.r, 3)}<div><div class="t">${esc(s.name)}</div><div class="s">${s.home ? 'home system' : s.unknown ? 'unexplored' : 'seen from afar'}</div></div></header><div class="cb">
      <div class="flow">${line('star', 'Star', s.star)}${line('map', 'Distance', s.home ? '-' : dist(s).toFixed(1) + ' light years')}${line('net', 'Jump points', s.jumps)}${line('drop', 'Bodies', s.bodies ? String(s.bodies) : 'not surveyed')}${line('dome', 'Colonies', s.colonies ? String(s.colonies) : 'none')}</div>
      <div class="btns">${s.home ? `<button data-nav="#map">${gl('map')}Open on the system map</button>` : `<button disabled data-tip="${esc(T('Not charted', dl('Survey the jump point to chart this system.')))}">${gl('map')}Not charted</button>`}</div>
      <span class="tag" style="align-self:flex-start">mock data</span></div></div>`;
  }

  function render() {
    const kpi = kpis([['net', String(SYS.length), 'systems known', false, T('Systems known', dl('Seen by telescope or reached through a jump point.'))], ['map', '1', 'surveyed', false, T('Surveyed', dl('Systems with every body charted.'))], ['rocket', '2', 'jump points known', false, T('Jump points')], ['dome', '1', 'colonies', false, T('Colonies')], ['eye', String(SYS.filter(s => s.unknown).length), 'unexplored', true, T('Unexplored')]]);
    const body = GA.tab === 'map' ? `<div class="main galmain">${map()}</div><div class="side">${card()}</div>` : `<div class="main"><h3>${gl('net', 'sm')}Known systems <small class="dim">${SYS.length}</small></h3><div class="grid">${SYS.map(sysTile).join('')}</div></div><div class="side">${card()}</div>`;
    const prev = document.querySelector('.gscroll'), keep = prev ? [prev.scrollLeft, prev.scrollTop] : null;
    page({ icon: 'net', title: 'Galaxy', small: 'known systems', kpi, tabsHtml: tabs([['map', 'Map', 'net'], ['systems', 'Systems', 'list']], GA.tab), body });
    const sc = document.querySelector('.gscroll');
    if (sc && GA.tab === 'map' && !GA.fitted) { GA.fitted = true; GA.z = Math.max(1, Math.min(6, Math.floor(Math.min((sc.clientWidth - 150) / 256, (sc.clientHeight - 130) / 240) * 4) / 4)); render(); return; }
    if (sc && keep) { sc.scrollLeft = keep[0]; sc.scrollTop = keep[1]; }
    else if (sc) { const sel = document.querySelector('.gstar.sel'); if (sel) { sc.scrollLeft = sel.offsetLeft - sc.clientWidth / 2; sc.scrollTop = sel.offsetTop - sc.clientHeight / 2; } }
  }

  bind('galaxy', GA, render, { gsel: id => { GA.sel = id; }, gzoom: id => { GA.z = Math.max(1, Math.min(6, GA.z + +id * .5)); } });
  S4.galaxy = { render, GA };
})();
