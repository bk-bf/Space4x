'use strict';
(() => {
  const { esc, gl, T, dl, meter } = S4;
  const { nm, nm2, kpis, tabs, filters, page, bind } = S4.kit;
  const GROUPS = [
    { id: 'u1', name: 'Unidentified 1', hostile: true, stance: 'Unknown', first: '2 Mar', home: 'Unknown', largest: 'about 9,000 t', seen: 3, classes: ['A', 'B'], desc: 'Ships that answer no hail and carry no known markings.' },
    { id: 'civ', name: 'Civilian operators', hostile: false, stance: 'Neutral', first: 'at the start', home: 'Earth', largest: 'about 40,000 t', seen: 41, classes: ['C'], desc: 'Commercial hulls on the Earth orbit lanes.' }
  ];
  const CLASSES = {
    A: { name: 'Type A', likely: 'likely a cruiser', type: 'cruiser', length: 'about 310 m', speed: '1,900 km/s', weapons: 'Beam, missiles', conf: .55, thermal: 240, group: 'u1' },
    B: { name: 'Type B', likely: 'likely an escort', type: 'escort', length: 'about 110 m', speed: '2,600 km/s', weapons: 'Missiles', conf: .4, thermal: 90, group: 'u1' },
    C: { name: 'Type C', likely: 'civilian freighter', type: 'freighter', length: 'about 180 m', speed: '700 km/s', weapons: 'None seen', conf: .95, thermal: 60, group: 'civ' }
  };
  const SIGHT = [
    ['12 Mar 04:12', 'Sol, beyond Venus', 'One Type A, thermal 240', '3.1 AU', 'A'], ['12 Mar 01:30', 'Sol, beyond Venus', 'One Type A, first detection', '3.4 AU', 'A'],
    ['9 Mar 22:40', 'Sol, near Jupiter', 'One Type B, lost after 2 hours', '0.9 AU', 'B'], ['2 Mar 13:05', 'Alpha Centauri', 'Two Type B at the inner jump point', '6.4 AU', 'B'],
    ['11 Mar 08:00', 'Earth orbit', 'Three Type C on the lane to Luna', '0.01 AU', 'C'], ['10 Mar 19:20', 'Earth orbit', 'Two Type C, outbound', '0.01 AU', 'C'], ['8 Mar 06:45', 'Earth orbit', 'One Type C, inbound', '0.01 AU', 'C'], ['6 Mar 11:10', 'Earth orbit', 'Four Type C at the depot', '0.01 AU', 'C']
  ];
  const IS = { tab: 'groups', group: 'u1', cls: 'A', filter: 'all' };

  function groupTile(g) {
    const n = g.classes.length, tip = T(g.name, dl(g.desc), `Stance: ${g.stance}`, `${n} classes seen, ${g.seen} sightings`);
    return `<button class="tile q ${IS.group === g.id ? 'sel' : ''} ${g.hostile ? 'warn' : ''}" data-act="igroup" data-id="${g.id}" data-tip="${esc(tip)}"><span class="art" style="height:36px;display:flex;align-items:center;color:${g.hostile ? 'var(--hot)' : 'var(--cool)'}">${gl(g.hostile ? 'warn' : 'people', 'lg')}</span>${nm2(g.name, g.stance)}<span class="dim" style="font-size:15px">${g.seen} sightings</span></button>`;
  }
  function classTile(k) {
    const c = CLASSES[k], g = GROUPS.find(x => x.id === c.group), tip = T(`${c.name}, ${c.likely}`, dl(`Seen as part of ${g.name}.`), `${c.length}, top speed ${c.speed}`, `Weapons: ${c.weapons}`);
    return `<button class="tile ship ${IS.cls === k ? 'sel' : ''} ${g.hostile ? 'warn' : ''}" data-act="icls" data-id="${k}" data-tip="${esc(tip)}"><span class="art" style="height:36px;display:flex;align-items:center">${S4.shi(c.type, g.hostile, 2, tip)}</span>${nm2(c.name, c.likely)}${meter(c.conf, g.hostile ? 'hot' : 'cool', 'full')}</button>`;
  }
  function sightTile(s, i) {
    const c = CLASSES[s[4]], g = GROUPS.find(x => x.id === c.group), tip = T(s[2], dl(s[1]), `Range ${s[3]}`, s[0]);
    return `<button class="tile sight ${IS.cls === s[4] ? 'sel' : ''}" data-act="icls" data-id="${s[4]}" data-tip="${esc(tip)}"><span class="shp">${S4.shi(c.type, g.hostile, 1, tip)}</span><span class="txt"><b>${esc(s[2])}</b><em>${esc(s[1])}</em><em class="dim">${s[0]}, range ${s[3]}</em></span></button>`;
  }
  function card() {
    const c = CLASSES[IS.cls], g = GROUPS.find(x => x.id === c.group);
    const line = (ic, l, v) => `<div class="fr">${gl(ic, 'sm')}<span class="nm">${l}</span><span class="v">${esc(v)}</span></div>`;
    return `<div class="card" style="--ec:${g.hostile ? 'var(--hot)' : 'var(--line)'}"><header><div><div class="t">${c.name}, ${c.likely}</div><div class="s">${esc(g.name)}</div></div></header><div class="cb">
      <div style="background:var(--bg);padding:10px;display:flex;justify-content:center">${S4.shi(c.type, g.hostile, 6)}</div>
      <div class="flow">${line('rocket', 'Length', c.length)}${line('flame', 'Top speed seen', c.speed)}${line('warn', 'Weapons seen', c.weapons)}${line('flame', 'Thermal signature', String(c.thermal))}</div>
      <div><span class="lbl">How sure we are of the type</span><div class="row">${meter(c.conf, g.hostile ? 'hot' : 'cool', 'thick')}<span style="min-width:34px;text-align:right">${S4.kit.pct(c.conf)}</span></div></div>
      <span class="tag" style="align-self:flex-start">mock data</span></div></div>`;
  }

  function render() {
    const g = GROUPS.find(x => x.id === IS.group);
    const kpi = kpis([['eye', String(GROUPS.length), 'groups known', false, T('Groups', dl('Every operator we have told apart.'))], ['ship', String(Object.keys(CLASSES).length), 'classes seen', false, T('Classes')], ['list', String(GROUPS.reduce((a, x) => a + x.seen, 0)), 'sightings', false, T('Sightings')], ['warn', '1', 'unidentified group', true, T('Unidentified', dl('A group with no known owner or intent.'))], ['clock', '12 Mar', 'last contact', false, T('Last contact')]]);
    let body;
    if (IS.tab === 'groups') {
      body = `<div class="main"><h3>${gl('eye', 'sm')}Groups <small class="dim">${GROUPS.length}</small></h3><div class="grid m" style="grid-template-columns:repeat(auto-fill,120px);margin-bottom:6px">${GROUPS.map(groupTile).join('')}</div>
        <h3>${gl('ship', 'sm')}${esc(g.name)} <small class="dim">first seen ${g.first}, home ${g.home}, largest ${g.largest}</small></h3><div class="grid" style="grid-template-columns:repeat(auto-fill,120px)">${g.classes.map(classTile).join('')}</div></div><div class="side">${card()}</div>`;
    } else {
      const list = SIGHT.filter(s => IS.filter === 'all' || CLASSES[s[4]].group === IS.filter);
      body = `<div class="main">${filters([['all', 'All', SIGHT.length], ...GROUPS.map(x => [x.id, x.name, SIGHT.filter(s => CLASSES[s[4]].group === x.id).length])], IS.filter, 'ifilter')}<div class="sights">${list.map(sightTile).join('')}</div></div><div class="side">${card()}</div>`;
    }
    page({ icon: 'eye', title: 'Intelligence', small: 'groups, classes and sightings', kpi, tabsHtml: tabs([['groups', 'Groups', 'eye'], ['sightings', 'Sightings', 'list']], IS.tab), body });
  }

  bind('intel', IS, render, { igroup: id => { IS.group = id; IS.cls = GROUPS.find(x => x.id === id).classes[0]; }, icls: id => { IS.cls = id; IS.group = CLASSES[id].group; }, ifilter: id => { IS.filter = id; } });
  S4.intel = { render, IS };
})();
