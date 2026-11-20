'use strict';
(() => {
  S4.screen = '';
  S4.refreshTop = () => S4.topbar(S4.screen);

  const MODS = {
    ground: () => [S4.ground, S4.ground.GS, ['formations', 'designer', 'templates', 'training']],
    commanders: () => [S4.commanders, S4.commanders.CM, ['officers', 'posts', 'styles']],
    intel: () => [S4.intel, S4.intel.IS, ['groups', 'sightings']],
    galaxy: () => [S4.galaxy, S4.galaxy.GA, ['map', 'systems']]
  };

  function route() {
    const [scr, sub, sub2] = (location.hash || '#economy').slice(1).split('/');
    S4.screen = ['economy', 'research', 'ground', 'commanders', 'intel', 'galaxy', 'designer', 'icons', 'map'].includes(scr) ? scr : 'economy';
    const root = document.getElementById('view');
    root.style.gridTemplateColumns = '';
    if (S4.screen === 'economy') {
      if (sub && S4.economy.TABS.some(t => t[0] === sub)) S4.economy.ES.tab = sub;
      if (sub2 && S4.sites.some(x => x.id === sub2)) S4.cur.site = sub2;
      S4.economy.render();
    } else if (S4.screen === 'research') {
      if (sub && S4.research.TABS.some(t => t[0] === sub)) S4.research.RS.tab = sub;
      S4.research.render();
    } else if (MODS[S4.screen]) {
      const [mod, st, tabs] = MODS[S4.screen]();
      if (sub && tabs.includes(sub)) st.tab = sub;
      mod.render();
    } else if (S4.screen === 'designer') { if (sub) S4.designer.ready(sub); S4.designer.render(); }
    else if (S4.screen === 'icons') {
      if (sub && ['materials', 'buildings', 'components', 'glyphs'].includes(sub)) {
        S4.iconpage.IS.tab = sub;
        S4.iconpage.IS.sel = sub === 'materials' ? ['mat', 'iron'] : sub === 'buildings' ? ['bld', 'mine_earth'] : sub === 'components' ? ['comp', 'kerolox_engine'] : ['glyph', 'logo'];
      }
      S4.iconpage.render();
    } else root.innerHTML = `<div class="pan grow"><h2>System map</h2><div class="pb"><div class="ph"><div class="pf" style="font-size:18px">The system map and its windows stay as they are</div><div>Out of scope for this mockup.</div></div></div></div>`;
    S4.refreshTop();
  }

  S4.load().then(() => { window.addEventListener('hashchange', route); route(); document.title = 'Space4x UI mockup'; })
    .catch(e => { document.getElementById('view').textContent = 'load failed: ' + e; console.error(e); });

  const tabHash = e => { const t = e.target.closest('[data-act=tab]'); if (t) history.replaceState(null, '', '#economy/' + t.dataset.id + (S4.cur.site === 'earth' ? '' : '/' + S4.cur.site)); };
  document.addEventListener('click', tabHash, true);
})();
