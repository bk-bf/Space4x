import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { COLS, ROWS, type Tech } from './tech.ts';
import type { TechState } from './research.svelte.ts';

export const NODE_W = 84;
export const NODE_H = 22;
const MARGIN_X = 10;
const MARGIN_Y = 10;

const FILL: Record<TechState, RGB> = {
  done: [30, 70, 84],
  running: [42, 36, 88],
  open: [42, 36, 88],
  locked: PAL.bg
};

const EDGE: Record<TechState, RGB> = {
  done: PAL.jump,
  running: PAL.sel,
  open: [148, 143, 192],
  locked: [68, 61, 128]
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function nodeBox(size: { w: number; h: number }, tech: Tech): Box {
  const stepX = (size.w - 2 * MARGIN_X - NODE_W) / (COLS - 1);
  const stepY = (size.h - 2 * MARGIN_Y - NODE_H) / (ROWS - 1);
  return {
    x: Math.round(MARGIN_X + tech.col * stepX),
    y: Math.round(MARGIN_Y + tech.row * stepY),
    w: NODE_W,
    h: NODE_H
  };
}

export interface TreeView {
  techs: readonly Tech[];
  stateOf: (id: string) => TechState;
  fraction: (id: string) => number;
  selected: string;
}

function frame(f: FB, b: Box, c: RGB, dashed: boolean): void {
  for (let i = 0; i < b.w; i++)
    if (!dashed || i % 2) {
      f.px(b.x + i, b.y, c);
      f.px(b.x + i, b.y + b.h - 1, c);
    }
  for (let j = 0; j < b.h; j++)
    if (!dashed || j % 2) {
      f.px(b.x, b.y + j, c);
      f.px(b.x + b.w - 1, b.y + j, c);
    }
}

function drawEdges(f: FB, view: TreeView): void {
  const byId = new Map(view.techs.map((t) => [t.id, t]));
  for (const t of view.techs)
    for (const need of t.needs) {
      const p = byId.get(need);
      if (!p) continue;
      const from = nodeBox(f, p),
        to = nodeBox(f, t),
        locked = view.stateOf(t.id) === 'locked',
        c = locked ? PAL.orbit : PAL.jump,
        gap = locked ? 2 : 1,
        x0 = from.x + from.w,
        y0 = from.y + from.h / 2,
        x1 = to.x,
        y1 = to.y + to.h / 2,
        mx = Math.round((x0 + x1) / 2);
      f.line(x0, y0, mx, y0, c, gap);
      f.line(mx, y0, mx, y1, c, gap);
      f.line(mx, y1, x1, y1, c, gap);
    }
}

function drawNode(f: FB, view: TreeView, tech: Tech, t: number): void {
  const b = nodeBox(f, tech),
    state = view.stateOf(tech.id),
    frac = view.fraction(tech.id);
  if (tech.id === view.selected) {
    f.rect(b.x - 2, b.y - 2, b.w + 4, 2, PAL.sel);
    f.rect(b.x - 2, b.y + b.h, b.w + 4, 2, PAL.sel);
    f.rect(b.x - 2, b.y, 2, b.h, PAL.sel);
    f.rect(b.x + b.w, b.y, 2, b.h, PAL.sel);
  }
  f.rect(b.x, b.y, b.w, b.h, FILL[state]);
  if (frac > 0 && state !== 'done') {
    const shimmer = state === 'running' ? 0.97 + 0.03 * Math.sin(t * 0.3) : 1;
    f.rect(
      b.x + 1,
      b.y + b.h - 3,
      Math.round((b.w - 2) * frac * shimmer),
      2,
      state === 'running' ? PAL.sel : PAL.jump
    );
  }
  frame(f, b, EDGE[state], state === 'locked');
}

export function drawTree(f: FB, view: TreeView, t: number): void {
  f.fill(PAL.panel);
  drawEdges(f, view);
  for (const tech of view.techs) drawNode(f, view, tech, t);
  f.present();
}
