import { GAP } from './wm/wm.svelte';

type Box = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

const R = (el: Element): DOMRect => el.getBoundingClientRect();
const hit = (a: Box, b: Box, m = 0) =>
  a.left < b.right - m && a.right > b.left + m && a.top < b.bottom - m && a.bottom > b.top + m;
const near = (a: number, b: number) => Math.abs(a - b) <= 1;
const shown = (el: Element) => (el as HTMLElement).offsetParent !== null;
const all = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [
  ...root.querySelectorAll<T>(sel)
];

function name(el: Element): string {
  if (el.id) return '#' + el.id;
  const owner = el.closest('[id]');
  return (
    (owner ? '#' + owner.id + ' ' : '') +
    el.tagName.toLowerCase() +
    ' "' +
    (el.textContent ?? '').trim().slice(0, 18) +
    '"'
  );
}

const windows = () => all(document, '#desk .win');
const isMin = (w: Element) => w.classList.contains('min');
const dockOf = (w: HTMLElement) => w.dataset.dock ?? '';

function checkPanel(
  p: HTMLElement,
  onMap: boolean,
  out: string[],
  spare: [HTMLElement, number][],
  starved: [HTMLElement, number][]
) {
  const b = p.querySelector<HTMLElement>('.wb, .pb');
  if (!b) {
    out.push(`structure: ${name(p)} has no .wb or .pb body`);
    return;
  }
  const cs = getComputedStyle(b),
    inner = R(b).right - parseFloat(cs.paddingRight),
    floating = onMap && !p.dataset.dock;
  if (b.scrollWidth > b.clientWidth + 1)
    out.push(`clipped: ${name(p)} content is ${b.scrollWidth - b.clientWidth}px wider than the panel`);
  const over = b.scrollHeight - b.clientHeight;
  if (over > 1 && floating) out.push(`clipped: ${name(p)} content is ${over}px taller than the window`);
  else if (over > 1 && over < 40)
    out.push(`cut: ${name(p)} content is ${over}px taller than the panel, so the last row is cut off`);
  if (over >= 20) starved.push([p, over]);
  const kids = [...b.children].filter((c) => shown(c) || c.tagName === 'CANVAS');
  if (kids.length && !b.querySelector('.fit') && !p.dataset.grow) {
    const free = R(b).bottom - parseFloat(cs.paddingBottom) - Math.max(...kids.map((c) => R(c).bottom));
    if (free >= 120) spare.push([p, Math.round(free)]);
  }
  let k = 0;
  for (const el of all(b, 'td,th,dd,dt,button,select,canvas,summary')) {
    if (!shown(el) || k > 3) continue;
    if (R(el).right > inner + 1) {
      out.push(
        `overflow: ${name(el)} runs ${Math.round(R(el).right - inner)}px past the right edge of ${name(p)}`
      );
      k++;
    }
  }
  for (const v of all(b, '.view')) {
    const c = v.querySelector('canvas');
    if (!c || !shown(v)) continue;
    const want = parseFloat(v.style.height);
    if (want && Math.abs(R(v).height - want) > 1)
      out.push(
        `squashed: the frame of ${name(c)} is ${Math.round(R(v).height)}px tall, not the ${want}px it asks for`
      );
    const dw = R(v).width - R(c).width,
      dh = R(v).height - R(c).height,
      sc = R(c).width / c.width;
    if (dw < -1 || dh < -1 || dw >= sc + 1 || dh >= sc + 1)
      out.push(`canvas: ${name(c)} is ${dw.toFixed(0)}x${dh.toFixed(0)}px smaller than its frame`);
  }
}

function checkDesk(d: DOMRect, out: string[]) {
  const docked = windows().filter((w) => !w.hidden && dockOf(w));
  const boxes = docked.map((w) => {
    const r = R(w);
    return { left: r.left - 2, top: r.top - 2, right: r.right + 2, bottom: r.bottom + 2, w };
  });
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b) => {
      if (hit(a, b, 1)) out.push(`overlap: ${name(a.w)} and ${name(b.w)}`);
    })
  );
  for (const b of boxes) {
    const s = dockOf(b.w),
      others = boxes.filter((o) => o !== b);
    if (s === 'left' && !near(b.left, d.left))
      out.push(`edge: ${name(b.w)} is ${(b.left - d.left).toFixed(1)}px off the left edge`);
    if (s === 'right' && !near(b.right, d.right))
      out.push(`edge: ${name(b.w)} is ${(d.right - b.right).toFixed(1)}px off the right edge`);
    if (s === 'bottom' && !near(b.bottom, d.bottom))
      out.push(`edge: ${name(b.w)} is ${(d.bottom - b.bottom).toFixed(1)}px off the bottom edge`);
    if (
      s !== 'bottom' &&
      !near(b.top, d.top) &&
      !others.some((o) => dockOf(o.w) === s && near(o.bottom + GAP, b.top))
    )
      out.push(`gap: nothing sits ${GAP}px above ${name(b.w)}`);
    for (const o of others) {
      const dx = Math.max(o.left - b.right, b.left - o.right),
        dy = Math.max(o.top - b.bottom, b.top - o.bottom);
      if (dx < 0 && dy > 0 && dy < GAP - 1)
        out.push(`gutter: ${name(b.w)} and ${name(o.w)} are ${dy.toFixed(1)}px apart, not ${GAP}`);
      if (dy < 0 && dx > 0 && dx < GAP - 1)
        out.push(`gutter: ${name(b.w)} and ${name(o.w)} are ${dx.toFixed(1)}px apart, not ${GAP}`);
    }
  }
  for (const w of windows().filter((x) => !x.hidden && !dockOf(x))) {
    const r = R(w);
    if (r.left < d.left - 1 || r.right > d.right + 1 || r.top < d.top - 1 || r.bottom > d.bottom + 1)
      out.push(
        `off-desk: ${name(w)} extends ${Math.round(Math.max(d.left - r.left, r.right - d.right, d.top - r.top, r.bottom - d.bottom))}px outside`
      );
  }
  const labs = all(document, '#mapLabels span')
    .filter((s) => !s.hidden)
    .map((s) => ({ r: R(s), s }));
  labs.forEach((a, i) =>
    labs.slice(i + 1).forEach((b) => {
      if (hit(a.r, b.r, 1)) out.push(`label overlap: "${a.s.textContent}" and "${b.s.textContent}"`);
    })
  );
  for (const a of labs)
    for (const w of windows().filter((x) => !x.hidden))
      if (hit(a.r, R(w), 1)) out.push(`label under panel: "${a.s.textContent}" and ${name(w)}`);
  const map = document.querySelector('#mapCv');
  if (!map) out.push('canvas: the map canvas #mapCv is missing');
  else {
    const mc = R(map);
    if (d.width - mc.width >= 2 || d.height - mc.height >= 2)
      out.push(
        `canvas: map is ${Math.round(d.width - mc.width)}x${Math.round(d.height - mc.height)}px smaller than the desk`
      );
  }
}

function checkGrid(root: Element, d: DOMRect, out: string[]) {
  const solid = all(root, '.pan, .card').filter(shown),
    boxes = solid.map(R);
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b, j) => {
      if (hit(a, b, 1)) out.push(`overlap: ${name(solid[i]!)} and ${name(solid[i + 1 + j]!)}`);
    })
  );
  let hole: { l: number; t: number; r: number; b: number } | null = null,
    n = 0;
  for (let y = d.top + 3; y < d.bottom; y += 6)
    for (let x = d.left + 3; x < d.right; x += 6) {
      if (
        boxes.some(
          (b) =>
            x >= b.left - GAP - 3 && x <= b.right + GAP + 3 && y >= b.top - GAP - 3 && y <= b.bottom + GAP + 3
        )
      )
        continue;
      n++;
      hole = hole
        ? { l: Math.min(hole.l, x), t: Math.min(hole.t, y), r: Math.max(hole.r, x), b: Math.max(hole.b, y) }
        : { l: x, t: y, r: x, b: y };
    }
  if (n && hole)
    out.push(
      `gap: ${n * 36} px² of the screen is covered by no panel, around ${Math.round(hole.l - d.left)},${Math.round(hole.t - d.top)} to ${Math.round(hole.r - d.left)},${Math.round(hole.b - d.top)}`
    );
}

function checkPage(out: string[]) {
  const top = document.querySelector('#top');
  if (top) {
    const mids = [...top.children].map((c) => (R(c).top + R(c).bottom) / 2).sort((p, q) => p - q),
      rows = 1 + mids.filter((v, i) => i && v - mids[i - 1]! > 16).length;
    if (rows > 1) out.push(`top bar: wrapped onto ${rows} rows`);
  }
  const de = document.documentElement;
  if (de.scrollWidth > innerWidth + 1 || de.scrollHeight > innerHeight + 1) out.push('page: scrolls');
}

export function layoutCheck(screen: string): string[] {
  const out: string[] = [];
  const onMap = screen === 'map';
  const root = onMap
    ? document.querySelector('#desk')
    : document.querySelector(`#stage > [data-screen="${screen}"]`);
  if (!root) return [`screen: no element for ${screen}`];
  const d = R(root);
  const panels = onMap ? windows().filter((w) => !w.hidden && !isMin(w)) : all(root, '.pan').filter(shown);
  const spare: [HTMLElement, number][] = [],
    starved: [HTMLElement, number][] = [];
  for (const p of panels) checkPanel(p, onMap, out, spare, starved);
  for (const [p, n] of starved)
    for (const [q, m] of spare)
      out.push(`imbalance: ${name(p)} needs ${n}px more while ${name(q)} has ${m}px unused`);
  if (onMap) checkDesk(d, out);
  else checkGrid(root, d, out);
  checkPage(out);
  return out;
}

export function reportLayout(screen: string): HTMLPreElement {
  const r = layoutCheck(screen),
    pre = document.createElement('pre');
  pre.id = 'check';
  pre.textContent = r.length ? r.map((x) => 'FAIL ' + x).join('\n') : 'PASS layout';
  document.body.append(pre);
  return pre;
}
