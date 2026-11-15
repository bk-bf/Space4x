'use strict';
const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / SCALE, (e.clientY - r.top) / SCALE]; };
function resize(force) {
  const w = Math.floor(stage.clientWidth / SCALE), h = Math.floor(stage.clientHeight / SCALE);
  if (w < 20 || h < 20) return;
  if (!force && fb && fb.w === w && fb.h === h) return;
  fb = new FB(cv, w, h, SCALE, .7);
  if (scene.bg) scene.bg(fb); else fb.makeBg('space');
}
function go() {
  const id = location.hash.slice(1) || 'zoom';
  scene = SCENES[id] || SCENES.zoom;
  scene.time = 0;
  $$('#top button').forEach(b => b.classList.toggle('on', SCENES[b.dataset.go] === scene));
  $('#zoomUI').hidden = scene !== SCENES.zoom;
  $('#note').textContent = scene.note;
  $('#readout').hidden = true;
  $('#ctl').innerHTML = '';
  $('#bar').hidden = false;
  labels = [];
  if (scene.enter) scene.enter();
  resize(true);
  const warm = +new URLSearchParams(location.search).get('warm');
  if (warm && scene.warm) scene.warm(warm);
}
for (const [id, sc] of Object.entries(SCENES)) {
  const b = document.createElement('button');
  b.textContent = sc.name; b.dataset.go = id;
  b.onclick = () => { location.hash = id; };
  $('#top').append(b);
}
cv.addEventListener('wheel', e => { if (scene.wheel) { e.preventDefault(); scene.wheel(e, ...at(e)); } }, { passive: false });
cv.addEventListener('pointerdown', e => { if (scene.down) scene.down(e, ...at(e)); });
addEventListener('pointermove', e => { if (scene.move) scene.move(e, ...at(e)); });
addEventListener('pointerup', e => { if (scene.up) scene.up(e, ...at(e)); });
const q = new URLSearchParams(location.search);
if (q.has('z')) { const p = PRESETS[+q.get('z')]; Z.L = Z.LT = p[1]; Z.focus = p[2]; }
addEventListener('hashchange', go);
const tGo = performance.now();
go();
if (q.has('bench')) { const t0 = performance.now(), n = +q.get('bench'), ft = []; for (let i = 0; i < n; i++) { const a = performance.now(); T++; FRAME++; scene.time += 1 / 30; if (q.has('nc')) Z.still = 0, Z.ckey = null; fb.start(); scene.draw(fb, scene.time, 1 / 30); fb.present(); ft.push(performance.now() - a); } ft.sort((a, b) => a - b); document.title = `BENCH enter ${Math.round(t0 - tGo)} median ${ft[n >> 1].toFixed(1)} p90 ${ft[Math.floor(n * .9)].toFixed(1)} max ${ft[n - 1].toFixed(0)}`; }
let last = performance.now(), drawn = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000);
  if (dt < 1 / 31 && drawn) return;
  drawn = true;
  last = now;
  resize();
  if (!fb) return;
  T += dt * 30; FRAME++;
  scene.time += dt;
  fb.start();
  scene.draw(fb, scene.time + (+q.get('t') || 0), dt);
  fb.present();
  flushLabels();
}
requestAnimationFrame(frame);
