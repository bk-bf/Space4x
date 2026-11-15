import type { ProgrammeStatus } from '#lib/game/economy/index.ts';
import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import type { ChainNode } from './chain.ts';

export const NODE_W = 30;
export const NODE_H = 14;
const MARGIN_X = 6;
const MARGIN_Y = 4;

const FILL: Record<ProgrammeStatus, RGB> = {
  done: [30, 70, 84],
  running: [42, 36, 88],
  ready: [42, 36, 88],
  waiting: PAL.bg,
  locked: PAL.bg
};

const EDGE: Record<ProgrammeStatus, RGB> = {
  done: PAL.jump,
  running: PAL.sel,
  ready: [148, 143, 192],
  waiting: [108, 101, 168],
  locked: [68, 61, 128]
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreeView {
  nodes: readonly ChainNode[];
  cols: number;
  rows: number;
  stateOf: (n: number) => ProgrammeStatus;
  fraction: (n: number) => number;
  selected: number;
}

export function nodeBox(
  size: { w: number; h: number },
  view: { cols: number; rows: number },
  node: ChainNode
): Box {
  const stepX = (size.w - 2 * MARGIN_X - NODE_W) / Math.max(1, view.cols - 1);
  const stepY = (size.h - 2 * MARGIN_Y - NODE_H) / Math.max(1, view.rows - 1);
  return {
    x: Math.round(MARGIN_X + node.col * stepX),
    y: Math.round(MARGIN_Y + node.row * stepY),
    w: NODE_W,
    h: NODE_H
  };
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
  const byNumber = new Map(view.nodes.map((n) => [n.number, n]));
  for (const n of view.nodes)
    for (const need of n.requires) {
      const p = byNumber.get(need);
      if (!p) continue;
      const from = nodeBox(f, view, p),
        to = nodeBox(f, view, n),
        locked = view.stateOf(n.number) === 'locked',
        c = locked ? PAL.orbit : PAL.jump,
        gap = locked ? 2 : 1,
        x0 = from.x + from.w,
        y0 = Math.round(from.y + from.h / 2),
        x1 = to.x,
        y1 = Math.round(to.y + to.h / 2),
        mx = x1 - 3;
      f.line(x0, y0, mx, y0, c, gap);
      f.line(mx, y0, mx, y1, c, gap);
      f.line(mx, y1, x1, y1, c, gap);
    }
}

function drawNode(f: FB, view: TreeView, node: ChainNode, t: number): void {
  const b = nodeBox(f, view, node),
    state = view.stateOf(node.number),
    frac = view.fraction(node.number);
  if (node.number === view.selected) {
    f.rect(b.x - 2, b.y - 2, b.w + 4, 2, PAL.sel);
    f.rect(b.x - 2, b.y + b.h, b.w + 4, 2, PAL.sel);
    f.rect(b.x - 2, b.y, 2, b.h, PAL.sel);
    f.rect(b.x + b.w, b.y, 2, b.h, PAL.sel);
  }
  f.rect(b.x, b.y, b.w, b.h, FILL[state]);
  if (frac > 0 && state === 'running') {
    const shimmer = 0.97 + 0.03 * Math.sin(t * 0.3);
    f.rect(b.x + 1, b.y + b.h - 3, Math.round((b.w - 2) * frac * shimmer), 2, PAL.sel);
  }
  frame(f, b, EDGE[state], state === 'locked');
}

export function drawTree(f: FB, view: TreeView, t: number): void {
  f.fill(PAL.panel);
  drawEdges(f, view);
  for (const node of view.nodes) drawNode(f, view, node, t);
  f.present();
}
