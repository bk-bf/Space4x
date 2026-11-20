'use strict';
(() => {
  const MCS = 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-';
  const R = (t, basis, prod, src, say, estimated = false) => ({ t, basis, prod, src, say, estimated });
  const RESERVES = {
    phosphorus: R(74e9, 'marketable phosphate rock', 240e6, MCS + 'phosphate.pdf'),
    graphite: R(290e6, 'natural graphite', 1.6e6, MCS + 'graphite.pdf'),
    ilmenite: R(510e6, 'TiO2 content of ilmenite', 8.9e6, MCS + 'titanium-minerals.pdf'),
    iron: R(88e9, 'iron content', 1.6e9, MCS + 'iron-ore.pdf'),
    nickel: R(130e6, 'nickel content', 3.7e6, MCS + 'nickel.pdf'),
    cobalt: R(11e6, 'cobalt content', 290e3, MCS + 'cobalt.pdf'),
    aluminium: R(29e9, 'bauxite', 450e6, MCS + 'bauxite-alumina.pdf'),
    titanium: R(560e6, 'TiO2 content, ilmenite and rutile', 9.4e6, MCS + 'titanium-minerals.pdf'),
    lithium: R(30e6, 'lithium content', 240e3, MCS + 'lithium.pdf'),
    copper: R(980e6, 'copper content', 23e6, MCS + 'copper.pdf'),
    chromium: R(1.2e9, 'chromite ore', 47e6, MCS + 'chromium.pdf'),
    molybdenum: R(15e6, 'molybdenum content', 260e3, MCS + 'molybdenum.pdf'),
    tungsten: R(4.6e6, 'tungsten content', 81e3, MCS + 'tungsten.pdf'),
    vanadium: R(18e6, 'vanadium content', 100e3, MCS + 'vanadium.pdf'),
    niobium: R(17e6, 'niobium content', 110e3, MCS + 'niobium.pdf'),
    tin: R(4.2e6, 'tin content', 300e3, MCS + 'tin.pdf'),
    tantalum: R(140e3, 'tantalum content', 2100, MCS + 'tantalum.pdf', null, true),
    zirconium: R(70e6, 'ZrO2 content', 1.5e6, MCS + 'zirconium-hafnium.pdf'),
    rhenium: R(2400, 'rhenium content', 62, MCS + 'rhenium.pdf', null, true),
    platinum: R(81e3, 'all platinum-group metals', 170, MCS + 'platinum-group.pdf'),
    gold: R(64e3, 'gold content', 3300, MCS + 'gold.pdf'),
    silver: R(640e3, 'silver content', 25e3, MCS + 'silver.pdf'),
    beryllium: R(100e3, 'beryllium content', 360, MCS + 'beryllium.pdf', null, true),
    lead: R(96e6, 'lead content', 4.3e6, MCS + 'lead.pdf'),
    potassium: R(4.8e9, 'K2O equivalent', 48e6, MCS + 'potash.pdf'),
    neodymium: R(90e6, 'all rare-earth oxides', 390e3, MCS + 'rare-earths.pdf'),
    samarium: R(90e6, 'all rare-earth oxides', 390e3, MCS + 'rare-earths.pdf'),
    yttrium: R(90e6, 'all rare-earth oxides', 390e3, MCS + 'rare-earths.pdf'),
    barium: R(230e6, 'barium content of barite', 8.2e6, MCS + 'barite.pdf', null, true),
    boron: R(370e6, 'boron content', null, MCS + 'boron.pdf', null, true),
    uranium: R(3.87e6, 'reasonably assured, below $130/kgU', 54345, 'https://oecd-nea.org/upload/docs/application/pdf/2025-04/7683_uranium_2024_-_resources_production_and_demand_2025-04-22_14-29-2_928.pdf'),
    thorium: R(6.4e6, 'thorium, identified resources', null, MCS + 'thorium.pdf', null, true),
    silicon: R(1e12, 'silicon content of quartzite and quartz sand', 9.7e6, MCS + 'silicon.pdf', null, true),
    gallium: R(100e3, 'recoverable gallium in bauxite', 760, MCS + 'gallium.pdf', null, true),
    germanium: R(8600, 'germanium in zinc ores', null, MCS + 'germanium.pdf', null, true),
    indium: R(15e3, 'indium in zinc ores', 1080, MCS + 'indium.pdf', null, true),
    arsenic: R(880e3, 'arsenic content', 58e3, MCS + 'arsenic.pdf', null, true),
    fluorite: R(320e6, 'fluorspar', 9.5e6, MCS + 'fluorspar.pdf'),
    sulfur: R(5e9, 'sulfur in oil, gas and sulfide ores', 85e6, MCS + 'sulfur.pdf', null, true),
    iodine: R(6.2e6, 'iodine', 33e3, MCS + 'iodine.pdf'),
    helium4: R(5.35e6, 'helium in natural gas', 30.5e3, MCS + 'helium.pdf', null, true),
    methane: R(152e9, 'natural gas, proven', 3.13e9, 'https://www.opec.org/assets/assetdb/asb-2025.pdf'),
    rp1: R(214e9, 'crude oil, proven', 3.62e9, 'https://www.opec.org/assets/assetdb/asb-2025.pdf')
  };
  const MS = { sel: null };

  const tonnes = t => S4.fmt.mass(t * 1000);
  const years = y => (!isFinite(y) ? 'not mined' : y >= 1000 ? Math.round(y / 100) * 100 + ' yr' : Math.round(y) + ' yr');

  function minedPerYear(f, id) {
    let kgh = 0;
    for (const a of f.actors) if (a.p && a.p.extract === id && a.out) kgh += a.out[id] || 0;
    return kgh * 8766 / 1000;
  }

  function row(f, id) {
    const r = RESERVES[id], mined = minedPerYear(f, id), left = r.t !== null && mined > 0 ? r.t / mined : Infinity;
    return { id, r, mined, left };
  }

  function tile(x) {
    const { esc, mi, short, kit } = S4;
    const low = isFinite(x.left) && x.left < 50;
    const tip = S4.T(short(x.id), x.r.t !== null ? tonnes(x.r.t) + ' in reserves' : 'Reserves ' + x.r.say, '~' + x.r.basis, x.mined > 0 ? tonnes(x.mined) + ' mined a year' : 'Not mined');
    return `<button class="tile stk ${low ? 'warn' : ''} ${MS.sel === x.id ? 'sel' : ''}" data-act="mnsel" data-id="${x.id}" data-tip="${esc(tip)}">
      ${mi(x.id, 2)}${kit.nm(short(x.id))}${S4.fitText('amt', x.r.t !== null ? tonnes(x.r.t) : '—', 17)}<span class="net ${low ? 'hot' : 'dim'}">${x.r.t !== null ? years(x.left) : ''}</span></button>`;
  }

  function card(x) {
    const { esc, mi, short } = S4;
    const line = (k, v, cls = '') => `<div class="fr"><span class="nm">${k}</span><span class="v ${cls}">${v}</span></div>`;
    return `<div class="card"><header>${mi(x.id, 2)}<div><div class="t">${esc(short(x.id))}</div><div class="s">${esc(x.r.basis)}</div></div></header><div class="cb">
      <div class="flow">
        ${line('Reserves', x.r.t !== null ? tonnes(x.r.t) : esc(x.r.say))}
        ${line('Mined a year', x.mined > 0 ? tonnes(x.mined) : '0 t')}
        ${line('Lasts', x.r.t !== null ? years(x.left) : '—', isFinite(x.left) && x.left < 50 ? 'hot' : '')}
        ${line('Accessibility', '1.0')}
        ${line('World output, 2024', x.r.prod !== null ? tonnes(x.r.prod) : '—')}
      </div>
      ${S4.D.mat[x.id].why ? `<div class="dim">${esc(S4.D.mat[x.id].why)}</div>` : ''}
    </div></div>`;
  }

  function render(f) {
    const ids = Object.keys(RESERVES).filter(id => S4.D.mat[id]);
    const rows = ids.map(id => row(f, id)).sort((a, b) => (a.r.t === null) - (b.r.t === null) || a.left - b.left);
    const sel = rows.find(x => x.id === MS.sel) || rows[0];
    MS.sel = sel.id;
    return `<div class="main"><div class="grid s">${rows.map(tile).join('')}</div></div><div class="side">${card(sel)}</div>`;
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act="mnsel"]');
    if (!t) return;
    MS.sel = t.dataset.id;
    S4.economy.render();
  });

  S4.minerals = { render, RESERVES };
})();
