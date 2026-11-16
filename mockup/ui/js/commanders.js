'use strict';
(() => {
  const { fmt, esc, gl, T, dl, meter } = S4;
  const { nm, nm2, kpis, tabs, filters, page, bind } = S4.kit;
  const RANKS = ['Lieutenant', 'Lt commander', 'Commander', 'Captain', 'Vice admiral', 'Admiral'];
  const SKILLS = ['Fleet handling', 'Logistics', 'Survey', 'Leadership', 'Engineering'];
  const POSTS = [
    { id: 'gov', kind: 'governor', label: 'Governor, Earth', desc: 'Runs the colony: growth, order and the garrison.' },
    { id: 'cos', kind: 'staff', label: 'Chief of staff', desc: 'Coordinates every other post. Leadership counts most.' },
    { id: 'log', kind: 'staff', label: 'Logistics chief', desc: 'Keeps supply moving to units and ships.' },
    { id: 'sur', kind: 'staff', label: 'Survey service', desc: 'Leads the search for new systems and deposits.' },
    { id: 'eng', kind: 'staff', label: 'Engineering chief', desc: 'Speeds construction and ship builds.' },
    { id: 'yard', kind: 'staff', label: 'Shipyard director', desc: 'Runs the yards.' },
    { id: 'g1', kind: 'ground', label: 'Home guard', desc: 'Commands the Home guard formation.' },
    { id: 'g2', kind: 'ground', label: 'Capital guard', desc: 'Commands the Capital guard formation.' },
    { id: 'g3', kind: 'ground', label: 'Spaceport guard', desc: 'Commands the Spaceport guard formation.' }
  ];
  const KIND_L = { governor: 'Governors', staff: 'Staff', ground: 'Ground commands' };
  const O = [
    ['Tomas Nakamura', 3, 1979, [5, 6, 3, 8, 4], 7, 'gov'], ['Amara Okafor', 2, 1983, [4, 5, 2, 6, 5], 12, 'g1'], ['Rolf Lindqvist', 4, 1971, [7, 5, 4, 9, 3], 5, 'g2'], ['Jamil Haddad', 2, 1985, [3, 4, 3, 5, 6], 21, 'g3'],
    ['Priya Raman', 3, 1976, [6, 9, 3, 7, 4], 30, 'log'], ['Elena Vasquez', 4, 1974, [5, 6, 9, 7, 6], 2, 'sur'], ['Ingrid Solberg', 3, 1978, [4, 5, 4, 6, 9], 17, 'eng'], ['Kenji Watanabe', 5, 1966, [8, 7, 5, 10, 6], 9, 'cos'],
    ['Mateo Silva', 1, 1990, [5, 3, 4, 4, 3], 14, 'yard'], ['Hana Kim', 0, 1996, [4, 4, 5, 3, 3], 26, null], ['Oluwaseun Bello', 1, 1991, [6, 3, 2, 5, 4], 3, null], ['Freya Lund', 2, 1984, [7, 4, 3, 6, 5], 19, null],
    ['Dmitri Orlov', 3, 1977, [6, 6, 4, 7, 5], 8, null], ['Sofia Mendes', 0, 1998, [3, 5, 6, 4, 4], 11, null]
  ].map((o, i) => ({ id: i, name: o[0], rank: o[1], born: o[2], skills: o[3], seed: o[4], post: o[5], gender: 'mfmmfffmmfmfmf'[i] }));
  const CM = { tab: 'officers', sel: 0, filter: 'all' };
  const age = o => 2026 - o.born;
  const postOf = o => POSTS.find(p => p.id === o.post);
  const branch = o => (postOf(o) || { kind: 'staff' }).kind;
  const face = o => ({ seed: o.seed, age: age(o), rank: o.rank, branch: branch(o), gender: o.gender });
  const holder = p => O.find(o => o.post === p.id);

  function offTile(o) {
    const p = postOf(o), tip = T(o.name, dl(`${RANKS[o.rank]}, age ${age(o)}.`), p ? `Post: ${p.label}` : '~Unassigned', ...SKILLS.map((s, i) => `${s} ${o.skills[i]}`));
    return `<button class="tile off ${CM.sel === o.id ? 'sel' : ''} ${p ? '' : 'idle'}" data-act="coff" data-id="${o.id}" data-tip="${esc(tip)}"><span class="art" style="height:72px;display:flex;align-items:center">${S4.miniFace(face(o), 2, tip)}</span>${nm2(o.name, RANKS[o.rank])}<span class="dim" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${p ? esc(p.label) : 'unassigned'}</span></button>`;
  }
  function postTile(p) {
    const h = holder(p), tip = T(p.label, dl(p.desc), h ? `Held by ${h.name}` : '!Vacant');
    return `<button class="tile off ${h ? '' : 'warn'}" data-act="cpost" data-id="${p.id}" data-tip="${esc(tip)}"><span class="art" style="height:72px;display:flex;align-items:center;justify-content:center">${h ? S4.miniFace(face(h), 2, tip) : `<span style="width:64px;height:72px;border:2px dashed var(--line);display:flex;align-items:center;justify-content:center;color:var(--dim)">${gl('plus')}</span>`}</span>${nm2(p.label, h ? h.name : 'vacant')}</button>`;
  }

  function card() {
    const o = O[CM.sel], p = postOf(o), best = o.skills.indexOf(Math.max(...o.skills));
    return `<div class="card"><header><div><div class="t">${esc(o.name)}</div><div class="s">${RANKS[o.rank]}, age ${age(o)}</div></div></header><div class="cb"><div class="bigpic">${S4.bigFace(face(o), 3)}</div>
      <div class="flow"><div class="fr">${gl('people', 'sm')}<span class="nm">Gender</span><span class="v">${o.gender === 'f' ? 'Female' : 'Male'}</span></div><div class="fr">${gl('star', 'sm')}<span class="nm">Post</span><span class="v">${p ? esc(p.label) : 'unassigned'}</span></div><div class="fr">${gl('clock', 'sm')}<span class="nm">Served</span><span class="v">${2026 - o.born - 22} years</span></div><div class="fr">${gl('up', 'sm')}<span class="nm">Best at</span><span class="v">${SKILLS[best]}</span></div></div>
      <div><span class="lbl">Skills</span><div class="flow">${SKILLS.map((s, i) => `<div class="fr"><span class="nm">${s}</span><span class="v" style="min-width:130px;display:flex;gap:6px;align-items:center">${meter(o.skills[i] / 10, i === best ? '' : 'cool', '')}<span style="min-width:14px;text-align:right">${o.skills[i]}</span></span></div>`).join('')}</div></div>
      <div><span class="lbl">Assign to</span><div class="grid s" style="grid-template-columns:repeat(auto-fill,96px);gap:4px">${POSTS.map(q => `<button class="tile ${o.post === q.id ? 'sel' : ''}" style="width:96px;height:44px;justify-content:center;padding:2px" data-act="cassign" data-id="${q.id}" data-tip="${esc(T(q.label, dl(q.desc), holder(q) && holder(q) !== o ? `Now held by ${holder(q).name}` : ''))}"><span style="font-size:14px;line-height:1">${esc(q.label)}</span></button>`).join('')}<button class="tile" style="width:96px;height:44px;justify-content:center;padding:2px" data-act="cassign" data-id="none"><span style="font-size:14px">Unassign</span></button></div></div>
      <div class="btns"><button data-act="cpromote" ${o.rank >= 5 ? 'disabled' : ''}>${gl('up')}Promote</button></div></div></div>`;
  }

  function render() {
    const un = O.filter(o => !o.post).length, avgAge = Math.round(O.reduce((a, o) => a + age(o), 0) / O.length), flag = O.filter(o => o.rank >= 4).length;
    const kpi = kpis([['star', String(O.length), 'officers', false, T('Officers', dl('Everyone who can hold a post.'))], ['check', String(O.length - un), 'in a post', false, T('In a post')], ['warn', String(POSTS.filter(p => !holder(p)).length), 'posts vacant', POSTS.some(p => !holder(p)), T('Vacant posts', dl('A vacant post gets none of its benefit.'))], ['clock', String(avgAge), 'average age', false, T('Average age')], ['up', String(flag), 'flag officers', false, T('Flag officers', dl('Vice admirals and admirals.'))]]);
    let body;
    if (CM.tab === 'officers') {
      const list = O.filter(o => CM.filter === 'all' || (CM.filter === 'none' ? !o.post : (postOf(o) || {}).kind === CM.filter)).sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
      body = `<div class="main">${filters([['all', 'All', O.length], ['none', 'Unassigned', un], ...Object.entries(KIND_L).map(([k, l]) => [k, l, O.filter(o => (postOf(o) || {}).kind === k).length])], CM.filter, 'cfilter')}<div class="grid" style="grid-template-columns:repeat(auto-fill,112px)">${list.map(offTile).join('')}</div></div><div class="side">${card()}</div>`;
    } else if (CM.tab === 'styles') {
      const P = S4.portrait, M = { seed: 31, age: 38, rank: 2, branch: 'staff', gender: 'm' }, F = { seed: 44, age: 34, rank: 2, branch: 'staff', gender: 'f' };
      const base = { gear: 'none', cap: false, beard: 'none', skin: P.SKIN[1], hair: P.HAIR[2], eye: P.EYE[2], earring: false, shadow: false, lip: null, gaunt: false, eyes: 'narrow', brow: 'stern', mouth: 'firm' };
      const cell = (o, over, name) => `<span class="pcell">${S4.bigFace(o, 2, name, P.cur.style, Object.assign({}, base, over))}<em>${esc(name)}</em></span>`;
      const hairs = g => Object.entries(P.HAIRS).filter(([, h]) => h.g.includes(g));
      const sec = (title, n, cells) => `<h3>${title} <small class="dim">${n}</small></h3><div class="pfaces">${cells}</div>`;
      body = `<div class="main"><div class="filters">${P.STYLES.map(([id, , name]) => `<button class="${P.cur.style === id ? 'on' : ''}" data-act="cstyle" data-id="${id}">${name}</button>`).join('')}<span class="dim" style="margin-left:8px">Every option below is rolled at random for each officer. Beards are for men only.</span></div>
        ${sec('Hair, men', hairs('m').length, hairs('m').map(([k, h]) => cell(M, { style: k }, h.name)).join(''))}
        ${sec('Hair, women', hairs('f').length, hairs('f').map(([k, h]) => cell(F, { style: k }, h.name)).join(''))}
        ${sec('Beards', Object.keys(P.BEARDS).length, Object.entries(P.BEARDS).map(([k, b]) => cell(M, { beard: k, style: 'crop' }, b.name)).join(''))}
        ${sec('Eyes', Object.keys(P.EYES).length * 2, Object.entries(P.EYES).map(([k, n]) => cell(M, { eyes: k, style: 'crop' }, n) + cell(F, { eyes: k, style: 'bun' }, n)).join(''))}
        ${sec('Brows', Object.keys(P.BROWS).length * 2, Object.entries(P.BROWS).map(([k, n]) => cell(M, { brow: k, style: 'buzz' }, n) + cell(F, { brow: k, style: 'bun' }, n)).join(''))}
        ${sec('Mouths', Object.keys(P.MOUTHS).length * 2, Object.entries(P.MOUTHS).map(([k, n]) => cell(M, { mouth: k, style: 'crop' }, n) + cell(F, { mouth: k, style: 'bun' }, n)).join(''))}
        ${sec('Gear', 6, ['shades', 'patch', 'implant', 'headset', 'scar'].map(k => cell(M, { gear: k, style: 'crop' }, k[0].toUpperCase() + k.slice(1))).join('') + cell(F, { cap: true, style: 'bob' }, 'Cap'))}</div><div class="side">${card()}</div>`;
    } else {
      body = `<div class="main">${Object.entries(KIND_L).map(([k, l]) => `<h3>${gl('star', 'sm')}${l} <small class="dim">${POSTS.filter(p => p.kind === k).length}</small></h3><div class="grid" style="grid-template-columns:repeat(auto-fill,112px);margin-bottom:6px">${POSTS.filter(p => p.kind === k).map(postTile).join('')}</div>`).join('')}</div><div class="side">${card()}</div>`;
    }
    page({ icon: 'star', title: 'Commanders', small: 'officers and posts', kpi, tabsHtml: tabs([['officers', 'Officers', 'star'], ['posts', 'Posts', 'list'], ['styles', 'Portrait options', 'eye']], CM.tab), body });
  }

  bind('commanders', CM, render, {
    coff: id => { CM.sel = +id; },
    cfilter: id => { CM.filter = id; },
    cpost: id => { const h = holder(POSTS.find(p => p.id === id)); if (h) CM.sel = h.id; else O[CM.sel].post = id; },
    cassign: id => { const o = O[CM.sel]; if (id === 'none') { o.post = null; return; } const h = O.find(x => x.post === id); if (h) h.post = o.post || null; o.post = id; },
    cstyle: id => { S4.portrait.cur.style = id; },
    cpromote: () => { const o = O[CM.sel]; if (o.rank < 5) o.rank++; }
  });
  S4.commanders = { render, CM, officer: postId => { const o = O.find(x => x.post === postId); return o ? { name: o.name, face: face(o), seed: o.seed, age: age(o), rank: o.rank, rankName: RANKS[o.rank].toLowerCase() } : null; } };
})();
