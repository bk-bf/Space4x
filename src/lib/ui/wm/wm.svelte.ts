import { flushSync } from 'svelte';
import type { IconName } from '#lib/gfx/icons.ts';
import { clamp } from '#lib/gfx/math.ts';
import { requestRender } from '../frame';

export type Dock = '' | 'left' | 'right' | 'bottom';
export type Arrangement = 'dock' | 'float';

export const GAP = 8;
export const TITLE_H = 28;
export const LEFT_W = 290;
export const RIGHT_W = 310;
export const BOTTOM_H = 200;
export const SNAP_EDGE = 40;
export const SETTINGS_ID = 'settings';
export const LAYOUT_KEY = 'space4x.windows';

const DOCKS: readonly Dock[] = ['', 'left', 'right', 'bottom'];

interface SavedWin {
  dock: Dock;
  min: boolean;
  hidden: boolean;
  x: number | null;
  y: number | null;
}

interface SavedLayout {
  arrangement: Arrangement;
  wins: Record<string, SavedWin>;
}

const coordinate = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function readLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<SavedLayout>) : null;
    return saved && typeof saved.wins === 'object' && saved.wins ? (saved as SavedLayout) : null;
  } catch {
    return null;
  }
}

export interface WindowSpec {
  id: string;
  title: string;
  icon: IconName;
  home?: Dock;
  width?: number;
  grow?: boolean;
  hidden?: boolean;
  floatAt?: (deskW: number, deskH: number) => readonly [number, number];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Win {
  readonly id: string;
  readonly title: string;
  readonly icon: IconName;
  readonly home: Dock;
  readonly width: number;
  readonly grow: boolean;
  readonly floatAt: WindowSpec['floatAt'];
  dock = $state<Dock>('');
  min = $state(false);
  hidden = $state(false);
  z = $state(0);
  x: number | null = null;
  y: number | null = null;
  el: HTMLElement | null = null;

  constructor(spec: WindowSpec) {
    this.id = spec.id;
    this.title = spec.title;
    this.icon = spec.icon;
    this.home = spec.home ?? '';
    this.width = spec.width ?? 300;
    this.grow = !!spec.grow;
    this.floatAt = spec.floatAt;
    this.dock = this.home;
    this.hidden = !!spec.hidden;
  }
}

interface Drag {
  win: Win;
  dx: number;
  dy: number;
  x0: number;
  y0: number;
  moved: boolean;
}

const px = (n: number) => n + 'px';

export function snapSlot(x: number, y: number, r: DOMRect): Dock {
  if (x - r.left < SNAP_EDGE) return 'left';
  if (r.right - x < SNAP_EDGE) return 'right';
  if (r.bottom - y < SNAP_EDGE) return 'bottom';
  return '';
}

class WindowManager {
  wins = $state<Win[]>([]);
  arrangement = $state<Arrangement>('dock');
  snap = $state<Dock>('');
  free: Rect = { x: 0, y: 0, w: 0, h: 0 };
  desk: HTMLElement | null = null;
  private zTop = 10;
  private drag: Drag | null = null;
  private resetHooks = new Set<() => void>();
  private tileQueued = false;
  private remembering = false;

  remember(restore: boolean): void {
    const saved = restore ? readLayout() : null;
    if (saved) {
      this.arrangement = saved.arrangement === 'float' ? 'float' : 'dock';
      for (const w of this.wins) {
        const s = saved.wins[w.id];
        if (!s) continue;
        w.dock = DOCKS.includes(s.dock) && (s.dock === '' || w.home) ? s.dock : w.dock;
        w.min = !!s.min;
        w.hidden = !!s.hidden;
        w.x = coordinate(s.x);
        w.y = coordinate(s.y);
      }
    }
    this.remembering = true;
    this.relayout();
  }

  private save(): void {
    if (!this.remembering) return;
    const wins: Record<string, SavedWin> = {};
    for (const w of this.wins) wins[w.id] = { dock: w.dock, min: w.min, hidden: w.hidden, x: w.x, y: w.y };
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ arrangement: this.arrangement, wins }));
    } catch {
      this.remembering = false;
    }
  }

  register(spec: WindowSpec): Win {
    const known = this.get(spec.id);
    if (known) return known;
    const win = new Win(spec);
    this.wins.push(win);
    return win;
  }

  get(id: string): Win | undefined {
    return this.wins.find((w) => w.id === id);
  }

  attach(win: Win, el: HTMLElement): void {
    win.el = el;
    this.scheduleTile();
  }

  detach(win: Win): void {
    win.el = null;
  }

  onReset(fn: () => void): () => void {
    this.resetHooks.add(fn);
    return () => {
      this.resetHooks.delete(fn);
    };
  }

  front(win: Win): void {
    win.z = ++this.zTop;
  }

  show(id: string, on = true): void {
    const win = this.get(id);
    if (!win) return;
    win.hidden = !on;
    if (on) {
      win.min = false;
      this.front(win);
    }
    this.relayout();
  }

  reveal(id: string): void {
    const win = this.get(id);
    if (win) win.hidden = false;
    this.relayout();
  }

  toggleMin(win: Win): void {
    win.min = !win.min;
    this.relayout();
  }

  close(win: Win): void {
    win.hidden = true;
    this.relayout();
  }

  toggleDock(win: Win): void {
    const desk = this.desk;
    if (!desk || !win.el) return;
    const r = win.el.getBoundingClientRect(),
      dr = desk.getBoundingClientRect();
    win.dock = win.dock ? '' : win.home;
    if (!win.dock) {
      win.x = clamp(r.left - dr.left + (win.home === 'right' ? -40 : 40), 4, dr.width - 320);
      win.y = clamp(r.top - dr.top + (win.home === 'bottom' ? -60 : 30), 4, dr.height - 300);
    }
    this.relayout();
  }

  setDock(id: string, dock: Dock): void {
    const win = this.get(id);
    if (!win) return;
    win.dock = dock;
    this.relayout();
  }

  arrange(mode: Arrangement | 'reset'): void {
    const W = this.desk?.clientWidth ?? 0,
      H = this.desk?.clientHeight ?? 0;
    for (const w of this.wins) {
      if (!w.home) {
        if (mode === 'reset') w.hidden = true;
        continue;
      }
      w.hidden = false;
      w.min = false;
      w.dock = mode === 'float' ? '' : w.home;
      if (mode === 'float' && w.floatAt) [w.x, w.y] = w.floatAt(W, H);
    }
    if (mode === 'reset') {
      for (const fn of this.resetHooks) fn();
      const settings = this.get(SETTINGS_ID);
      if (settings) settings.hidden = false;
    }
    this.arrangement = mode === 'float' ? 'float' : 'dock';
    this.relayout();
  }

  startDrag(win: Win, e: PointerEvent): void {
    if (!win.el || (e.target as Element).closest('button,select')) return;
    const r = win.el.getBoundingClientRect();
    this.drag = {
      win,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      x0: e.clientX,
      y0: e.clientY,
      moved: false
    };
    e.preventDefault();
  }

  moveDrag(e: PointerEvent): void {
    const drag = this.drag,
      desk = this.desk,
      el = drag?.win.el;
    if (!drag || !desk || !el) return;
    const { win } = drag,
      r = desk.getBoundingClientRect();
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moved = true;
      if (win.dock) {
        win.dock = '';
        drag.dx = Math.min(drag.dx, 140);
        win.x = 0;
        this.relayout();
      }
    }
    win.x = e.clientX - r.left - drag.dx;
    win.y = Math.max(0, e.clientY - r.top - drag.dy);
    el.style.left = px(win.x);
    el.style.top = px(win.y);
    this.snap = win.home ? snapSlot(e.clientX, e.clientY, r) : '';
  }

  endDrag(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    const { win } = drag;
    const slot =
      drag.moved && win.home && this.desk
        ? snapSlot(e.clientX, e.clientY, this.desk.getBoundingClientRect())
        : '';
    if (slot) win.dock = slot;
    this.snap = '';
    this.drag = null;
    this.relayout();
  }

  relayout(): void {
    flushSync();
    this.tile();
    this.save();
    requestRender();
  }

  scheduleTile(): void {
    if (this.tileQueued) return;
    this.tileQueued = true;
    queueMicrotask(() => {
      this.tileQueued = false;
      this.tile();
      requestRender();
    });
  }

  visibleElements(): HTMLElement[] {
    return this.wins.filter((w) => !w.hidden && w.el).map((w) => w.el!);
  }

  tile(): void {
    const desk = this.desk;
    if (!desk || !desk.clientWidth) return;
    const W = desk.clientWidth,
      H = desk.clientHeight;
    const placed = this.wins.filter((w) => w.el);
    const docked = (slot: Dock) => placed.filter((w) => !w.hidden && w.dock === slot);
    const L = docked('left'),
      R = docked('right'),
      B = docked('bottom');
    const bh = B.length ? (B.every((w) => w.min) ? TITLE_H : BOTTOM_H) : 0,
      colH = H - (bh ? bh + GAP : 0);
    stackColumn(L, 0, LEFT_W, colH);
    stackColumn(R, W - RIGHT_W, RIGHT_W, colH);
    B.forEach((w, i) => {
      const x0 = Math.round((i * (W + GAP)) / B.length),
        x1 = Math.round(((i + 1) * (W + GAP)) / B.length) - GAP;
      Object.assign(w.el!.style, {
        left: px(x0 + 2),
        top: px(H - bh + 2),
        width: px(x1 - x0 - 4),
        height: px(bh - 4)
      });
    });
    const lx = L.some((w) => !w.min) ? LEFT_W + GAP : 0,
      rx = R.some((w) => !w.min) ? RIGHT_W + GAP : 0;
    this.free = { x: lx, y: 0, w: W - lx - rx, h: colH };
    for (const w of placed) if (!w.hidden && !w.dock) placeFloating(w, W, H);
  }
}

function stackColumn(list: Win[], x: number, width: number, colH: number): void {
  let y = 0;
  list.forEach((w, i) => {
    const el = w.el!,
      body = el.querySelector<HTMLElement>('.wb'),
      scrolled = body?.scrollTop ?? 0;
    Object.assign(el.style, { left: px(x + 2), top: px(y + 2), width: px(width - 4), height: '' });
    const after = list.slice(i + 1),
      rest = colH - y - after.length * (TITLE_H + GAP),
      last = after.every((q) => q.min);
    const hh = w.min ? TITLE_H : w.grow && last ? rest : Math.min(el.offsetHeight + 4, rest);
    el.style.height = px(hh - 4);
    if (body) body.scrollTop = scrolled;
    y += hh + GAP;
  });
}

function placeFloating(w: Win, W: number, H: number): void {
  const el = w.el!,
    ww = Math.min(w.width, W - 8);
  el.style.width = px(ww);
  el.style.height = '';
  if (w.x == null || w.y == null) {
    w.x = Math.round((W - ww) / 2);
    w.y = 40;
  }
  w.x = clamp(w.x, 2, Math.max(2, W - ww - 2));
  w.y = clamp(w.y, 2, Math.max(2, H - Math.max(TITLE_H, el.offsetHeight) - 2));
  el.style.left = px(w.x);
  el.style.top = px(w.y);
}

export const wm = new WindowManager();
