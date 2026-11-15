'use strict';
const G = 8, TB = 28, LW = 290, RW = 310, BH = 238;
let FREE = { x: 0, y: 0, w: 0, h: 0 }, SCREEN = 'map', zTop = 10, A = 0, S = 0, running = false, stepSec = 86400, drag = null;
let clock = Date.UTC(2087, 2, 12, 6, 40);
const NAV = [['map', 'System map', 'map', 'F1'], ['economy', 'Economy', 'factory', 'F2'], ['research', 'Research', 'flask', 'F3'], ['classes', 'Ship classes', 'ship', 'F4'], ['colony', 'Colony', 'dome', 'F5'], ['ground', 'Ground forces', 'tank', 'F6'], ['commanders', 'Commanders', 'star', 'F7'], ['intel', 'Intelligence', 'eye', 'F8'], ['galaxy', 'Galaxy', 'net', 'F9']];
const STEPS = [['5s', 5], ['30s', 30], ['2m', 120], ['5m', 300], ['20m', 1200], ['1h', 3600], ['3h', 10800], ['8h', 28800], ['1d', 86400], ['5d', 432000], ['30d', 2592000]];
const CHIPS = [['coin', '12,480', 'Wealth'], ['people', '1.21bn', 'People'], ['drop', '4.2Mt', 'Fuel stock'], ['warn', 'Uranium', 'Running low', 1], ['flask', '4/5', 'Labs busy'], ['yard', '2/3', 'Shipyards busy']];
const wins = () => $$('#desk .win');
const isMin = w => w.classList.contains('min');

function initWins() {
  for (const w of wins()) {
    const body = document.createElement('div'), h = document.createElement('h2'), tools = w.querySelector(':scope > .tools');
    if (tools) tools.remove();
    body.className = 'wb'; body.append(...w.childNodes);
    w.dataset.home = w.dataset.dock || ''; w.dataset.dock = w.dataset.home;
    h.className = 'tb';
    h.innerHTML = `<i data-ic="${w.dataset.icon}"></i><span>${w.dataset.title}</span><button data-wm="min" title="Minimise">_</button>${w.dataset.home ? '<button data-wm="dock" title="Dock or float">^</button>' : ''}<button data-wm="close" title="Close">x</button>`;
    if (tools) h.querySelector('span').after(tools);
    w.append(h, body);
  }
  $('#nav').innerHTML = NAV.map(([id, n, ic, k]) => `<button data-nav="${id}" title="${n} (${k})"><i data-ic="${ic}"></i></button>`).join('');
  $('#steps').innerHTML = STEPS.map(([n, s]) => `<button data-step="${s}"${s === stepSec ? ' class="on"' : ''}>${n}</button>`).join('');
  $('#chips').innerHTML = CHIPS.map(([ic, v, t, w]) => `<span class="chip${w ? ' warn' : ''}" title="${t}"><i data-ic="${ic}"></i>${v}</span>`).join('');
  showClock();
}
function tile() {
  if (SCREEN !== 'map') return;
  const d = $('#desk'), W = d.clientWidth, H = d.clientHeight;
  const vis = s => wins().filter(w => !w.hidden && w.dataset.dock === s);
  const L = vis('left'), R = vis('right'), B = vis('bottom');
  const bh = B.length ? (B.every(isMin) ? TB : BH) : 0, colH = H - (bh ? bh + G : 0);
  const col = (list, x, ww) => {
    let y = 0;
    list.forEach((w, i) => {
      Object.assign(w.style, { left: x + 2 + 'px', top: y + 2 + 'px', width: ww - 4 + 'px', height: '' });
      const rest = colH - y - list.slice(i + 1).length * (TB + G), last = list.slice(i + 1).every(isMin);
      const hh = isMin(w) ? TB : w.dataset.grow && last ? rest : Math.min(w.offsetHeight + 4, rest);
      w.style.height = hh - 4 + 'px';
      y += hh + G;
    });
  };
  col(L, 0, LW); col(R, W - RW, RW);
  B.forEach((w, i) => {
    const x0 = Math.round(i * (W + G) / B.length), x1 = Math.round((i + 1) * (W + G) / B.length) - G;
    Object.assign(w.style, { left: x0 + 2 + 'px', top: H - bh + 2 + 'px', width: x1 - x0 - 4 + 'px', height: bh - 4 + 'px' });
  });
  const lx = L.some(w => !isMin(w)) ? LW + G : 0, rx = R.some(w => !isMin(w)) ? RW + G : 0;
  FREE = { x: lx, y: 0, w: W - lx - rx, h: colH };
  for (const w of wins()) {
    if (w.hidden || w.dataset.dock) continue;
    const ww = Math.min(+w.dataset.w || 300, W - 8);
    w.style.width = ww + 'px'; w.style.height = '';
    if (!w.style.left) { w.style.left = Math.round((W - ww) / 2) + 'px'; w.style.top = '40px'; }
    w.style.left = clamp(parseFloat(w.style.left), 2, Math.max(2, W - ww - 2)) + 'px';
    w.style.top = clamp(parseFloat(w.style.top), 2, Math.max(2, H - TB - 2)) + 'px';
  }
  syncNav();
  mapView();
}
function front(w) { w.style.zIndex = ++zTop; }
function showWin(id, on = true) {
  const w = $('#w-' + id);
  w.hidden = !on;
  if (on) { w.classList.remove('min'); front(w); }
  tile(); render();
}
function syncNav() {
  $$('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === SCREEN));
  $$('[data-panel]').forEach(b => b.classList.toggle('on', !$('#w-' + b.dataset.panel).hidden));
}
function setScreen(s) {
  SCREEN = s;
  $$('#stage > [data-screen]').forEach(e => { e.hidden = e.dataset.screen !== s; });
  syncNav();
  if (s === 'map') tile(); else fitScreen(s);
  render();
}
function arrange(mode) {
  const d = $('#desk'), W = d.clientWidth, H = d.clientHeight;
  const spots = { 'w-side': [10, 10], 'w-sel': [W - RW - 14, 10], 'w-events': [Math.round((W - 640) / 2), H - 340] };
  for (const w of wins()) {
    if (!w.dataset.home) { if (mode === 'reset') w.hidden = true; continue; }
    w.hidden = false; w.classList.remove('min');
    w.dataset.dock = mode === 'float' ? '' : w.dataset.home;
    if (mode === 'float') { w.style.left = spots[w.id][0] + 'px'; w.style.top = spots[w.id][1] + 'px'; }
  }
  if (mode === 'reset') { cam.x = cam.y = 0; cam.z = 1; $('#w-settings').hidden = false; }
  $$('[data-set]').forEach(b => b.classList.toggle('on', b.dataset.set === (mode === 'float' ? 'float' : 'dock')));
  tile(); render();
}
const snapSlot = (e, r) => e.clientX - r.left < 40 ? 'left' : r.right - e.clientX < 40 ? 'right' : r.bottom - e.clientY < 40 ? 'bottom' : '';

document.addEventListener('pointerdown', e => {
  const w = e.target.closest('.win');
  if (w) front(w);
  if (!e.target.closest('.tb') || e.target.closest('button,select')) return;
  const r = w.getBoundingClientRect();
  drag = { w, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
  e.preventDefault();
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const { w } = drag, r = $('#desk').getBoundingClientRect();
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    if (w.dataset.dock) { w.dataset.dock = ''; drag.dx = Math.min(drag.dx, 140); w.style.left = '0px'; tile(); }
  }
  w.style.left = e.clientX - r.left - drag.dx + 'px';
  w.style.top = Math.max(0, e.clientY - r.top - drag.dy) + 'px';
  $('#desk').dataset.snap = w.dataset.home ? snapSlot(e, r) : '';
});
addEventListener('pointerup', e => {
  if (!drag) return;
  const { w } = drag, s = drag.moved && w.dataset.home ? snapSlot(e, $('#desk').getBoundingClientRect()) : '';
  if (s) w.dataset.dock = s;
  $('#desk').dataset.snap = '';
  drag = null;
  tile(); render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset, w = b.closest('.win');
  if (d.wm === 'min') { w.classList.toggle('min'); tile(); render(); }
  else if (d.wm === 'close') { w.hidden = true; tile(); render(); }
  else if (d.wm === 'dock') {
    const r = w.getBoundingClientRect(), dr = $('#desk').getBoundingClientRect();
    w.dataset.dock = w.dataset.dock ? '' : w.dataset.home;
    if (!w.dataset.dock) { w.style.left = clamp(r.left - dr.left + (w.dataset.home === 'right' ? -40 : 40), 4, dr.width - 320) + 'px'; w.style.top = clamp(r.top - dr.top + (w.dataset.home === 'bottom' ? -60 : 30), 4, dr.height - 300) + 'px'; }
    tile(); render();
  } else if (d.nav) setScreen(d.nav);
  else if (d.go) setScreen(d.go);
  else if (b.id === 'bSet') { if (SCREEN !== 'map') setScreen('map'); showWin('settings', $('#w-settings').hidden); }
  else if (d.set) arrange(d.set);
  else if (d.panel) showWin(d.panel, $('#w-' + d.panel).hidden);
  else if (d.step) {
    stepSec = +d.step;
    $$('[data-step]').forEach(x => x.classList.toggle('on', x === b));
    if (!running) { clock += stepSec * 1000; S += stepSec / 2000; showClock(); render(); }
  } else if (b.id === 'bPlay' || b.id === 'bPause') { running = b.id === 'bPlay'; showClock(); }
});
addEventListener('keydown', e => {
  const n = NAV.find(x => x[3] === e.key);
  if (n && e.key !== 'F5') { e.preventDefault(); setScreen(n[0]); }
  if (e.key === ' ' && !e.target.closest('select,button,input')) { e.preventDefault(); running = !running; showClock(); }
});
function showClock() {
  const d = new Date(clock), p = n => String(n).padStart(2, '0');
  $('#clock').textContent = `${d.getUTCDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  $('#bPlay').classList.toggle('on', running); $('#bPause').classList.toggle('on', !running);
}
function tick() {
  if (document.hidden) return;
  A++;
  if (running) { S += stepSec / 20000; clock += stepSec * 100; showClock(); }
  render();
}

function layoutCheck() {
  const out = [], R = el => el.getBoundingClientRect();
  const hit = (a, b, m = 0) => a.left < b.right - m && a.right > b.left + m && a.top < b.bottom - m && a.bottom > b.top + m;
  const name = el => el.id ? '#' + el.id : (el.closest('[id]') ? '#' + el.closest('[id]').id + ' ' : '') + el.tagName.toLowerCase() + ' "' + el.textContent.trim().slice(0, 18) + '"';
  const near = (a, b) => Math.abs(a - b) <= 1;
  const root = SCREEN === 'map' ? $('#desk') : $(`#stage > [data-screen="${SCREEN}"]`), d = R(root);
  const panels = SCREEN === 'map' ? wins().filter(w => !w.hidden && !isMin(w)) : [...root.querySelectorAll('.pan')].filter(p => p.offsetParent);
  const bodyOf = p => p.querySelector('.wb, .pb');
  const spare = [], starved = [];
  for (const p of panels) {
    const b = bodyOf(p), cs = getComputedStyle(b), inner = R(b).right - parseFloat(cs.paddingRight), floating = SCREEN === 'map' && !p.dataset.dock;
    if (b.scrollWidth > b.clientWidth + 1) out.push(`clipped: ${name(p)} content is ${b.scrollWidth - b.clientWidth}px wider than the panel`);
    const over = b.scrollHeight - b.clientHeight;
    if (over > 1 && floating) out.push(`clipped: ${name(p)} content is ${over}px taller than the window`);
    else if (over > 1 && over < 40) out.push(`cut: ${name(p)} content is ${over}px taller than the panel, so the last row is cut off`);
    if (over >= 20) starved.push([p, over]);
    const kids = [...b.children].filter(c => c.offsetParent || c.tagName === 'CANVAS');
    if (kids.length && !b.querySelector('.fit') && !p.dataset.grow) {
      const free = R(b).bottom - parseFloat(cs.paddingBottom) - Math.max(...kids.map(c => R(c).bottom));
      if (free >= 120) spare.push([p, Math.round(free)]);
    }
    let k = 0;
    for (const el of b.querySelectorAll('td,th,dd,dt,button,select,canvas,summary')) {
      if (!el.offsetParent || k > 3) continue;
      if (R(el).right > inner + 1) { out.push(`overflow: ${name(el)} runs ${Math.round(R(el).right - inner)}px past the right edge of ${name(p)}`); k++; }
    }
    for (const v of b.querySelectorAll('.view')) {
      const c = v.querySelector('canvas');
      if (!c || !v.offsetParent) continue;
      const want = parseFloat(v.style.height);
      if (want && Math.abs(R(v).height - want) > 1) out.push(`squashed: the frame of ${name(c)} is ${Math.round(R(v).height)}px tall, not the ${want}px it asks for`);
      const dw = R(v).width - R(c).width, dh = R(v).height - R(c).height, sc = R(c).width / c.width;
      if (dw < -1 || dh < -1 || dw >= sc + 1 || dh >= sc + 1) out.push(`canvas: ${name(c)} is ${dw.toFixed(0)}x${dh.toFixed(0)}px smaller than its frame`);
    }
  }
  for (const [p, n] of starved) for (const [q, m] of spare) out.push(`imbalance: ${name(p)} needs ${n}px more while ${name(q)} has ${m}px unused`);
  if (SCREEN === 'map') {
    const docked = wins().filter(w => !w.hidden && w.dataset.dock), boxes = docked.map(w => { const r = R(w); return { left: r.left - 2, top: r.top - 2, right: r.right + 2, bottom: r.bottom + 2, w }; });
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => { if (hit(a, b, 1)) out.push(`overlap: ${name(a.w)} and ${name(b.w)}`); }));
    for (const b of boxes) {
      const s = b.w.dataset.dock, others = boxes.filter(o => o !== b);
      if (s === 'left' && !near(b.left, d.left)) out.push(`edge: ${name(b.w)} is ${(b.left - d.left).toFixed(1)}px off the left edge`);
      if (s === 'right' && !near(b.right, d.right)) out.push(`edge: ${name(b.w)} is ${(d.right - b.right).toFixed(1)}px off the right edge`);
      if (s === 'bottom' && !near(b.bottom, d.bottom)) out.push(`edge: ${name(b.w)} is ${(d.bottom - b.bottom).toFixed(1)}px off the bottom edge`);
      if (s !== 'bottom' && !near(b.top, d.top) && !others.some(o => o.w.dataset.dock === s && near(o.bottom + G, b.top))) out.push(`gap: nothing sits ${G}px above ${name(b.w)}`);
      for (const o of others) {
        const dx = Math.max(o.left - b.right, b.left - o.right), dy = Math.max(o.top - b.bottom, b.top - o.bottom);
        if (dx < 0 && dy > 0 && dy < G - 1) out.push(`gutter: ${name(b.w)} and ${name(o.w)} are ${dy.toFixed(1)}px apart, not ${G}`);
        if (dy < 0 && dx > 0 && dx < G - 1) out.push(`gutter: ${name(b.w)} and ${name(o.w)} are ${dx.toFixed(1)}px apart, not ${G}`);
      }
    }
    for (const w of wins().filter(x => !x.hidden && !x.dataset.dock)) {
      const r = R(w);
      if (r.left < d.left - 1 || r.right > d.right + 1 || r.top < d.top - 1 || r.bottom > d.bottom + 1) out.push(`off-desk: ${name(w)} extends ${Math.round(Math.max(d.left - r.left, r.right - d.right, d.top - r.top, r.bottom - d.bottom))}px outside`);
    }
    const labs = $$('#mapLabels span').filter(s => !s.hidden).map(s => ({ r: R(s), s }));
    labs.forEach((a, i) => labs.slice(i + 1).forEach(b => { if (hit(a.r, b.r, 1)) out.push(`label overlap: "${a.s.textContent}" and "${b.s.textContent}"`); }));
    for (const a of labs) for (const w of wins().filter(x => !x.hidden)) if (hit(a.r, R(w), 1)) out.push(`label under panel: "${a.s.textContent}" and ${name(w)}`);
    const mc = R($('#mapCv'));
    if (d.width - mc.width >= 2 || d.height - mc.height >= 2) out.push(`canvas: map is ${Math.round(d.width - mc.width)}x${Math.round(d.height - mc.height)}px smaller than the desk`);
  } else {
    const solid = [...root.querySelectorAll('.pan, .card')].filter(p => p.offsetParent), boxes = solid.map(p => R(p));
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b, j) => { if (hit(a, b, 1)) out.push(`overlap: ${name(solid[i])} and ${name(solid[i + 1 + j])}`); }));
    let hole = null, n = 0;
    for (let y = d.top + 3; y < d.bottom; y += 6) for (let x = d.left + 3; x < d.right; x += 6) {
      if (boxes.some(b => x >= b.left - G - 3 && x <= b.right + G + 3 && y >= b.top - G - 3 && y <= b.bottom + G + 3)) continue;
      n++; hole = hole ? { l: Math.min(hole.l, x), t: Math.min(hole.t, y), r: Math.max(hole.r, x), b: Math.max(hole.b, y) } : { l: x, t: y, r: x, b: y };
    }
    if (n) out.push(`gap: ${n * 36} px² of the screen is covered by no panel, around ${Math.round(hole.l - d.left)},${Math.round(hole.t - d.top)} to ${Math.round(hole.r - d.left)},${Math.round(hole.b - d.top)}`);
  }
  const mids = [...$('#top').children].map(c => (R(c).top + R(c).bottom) / 2).sort((p, q) => p - q), rows = 1 + mids.filter((v, i) => i && v - mids[i - 1] > 16).length;
  if (rows > 1) out.push(`top bar: wrapped onto ${rows} rows`);
  if (document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1) out.push('page: scrolls');
  return out;
}
