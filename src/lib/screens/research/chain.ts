import { depthOf, projects, subjects } from '#lib/game/data/index.ts';
import type { Project, Subject } from '#lib/game/data/index.ts';
import type { IconName } from '#lib/gfx/icons.ts';

export const TILE_W = 144;
export const TILE_H = 56;
export const GUTTER = 28;
export const ROW_GAP = 10;
export const LABEL_W = 132;
export const EDGE_PAD = 12;
export const LANE_PAD = 3;
export const LINE_STEP = 3;
const CLEARANCE = 2;

export const SUBJECT_ICONS: Readonly<Record<string, IconName>> = {
  launch: 'rocket',
  habitats: 'dome',
  power: 'bolt',
  computing: 'chip',
  chemistry: 'flask',
  mining: 'hammer',
  propulsion: 'flame',
  physics: 'atom'
};

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placed {
  number: number;
  lane: number;
  col: number;
  row: number;
  x: number;
  y: number;
  requires: readonly number[];
}

export interface Lane {
  id: string;
  name: string;
  rows: number;
  top: number;
  height: number;
}

export interface Edge {
  from: number;
  to: number;
  points: Point[];
  d: string;
}

export interface Chain {
  nodes: Placed[];
  lanes: Lane[];
  cols: number;
  rows: number;
  width: number;
  height: number;
  edges: Edge[];
  at: (number: number) => Placed;
}

export const tileRect = (n: { x: number; y: number }): Rect => ({ x: n.x, y: n.y, w: TILE_W, h: TILE_H });

export const columnX = (col: number): number => LABEL_W + EDGE_PAD + col * (TILE_W + GUTTER);

const slotCount = (room: number): number => Math.floor((room - 4) / LINE_STEP) + 1;
const slotOffset = (k: number, count: number): number => (k - (count - 1) / 2) * LINE_STEP;

const GUTTER_SLOTS = slotCount(GUTTER);
const CHANNEL_SLOTS = slotCount(ROW_GAP);

export function segmentHitsRect(a: Point, b: Point, r: Rect, margin = 0): boolean {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x1 > r.x - margin && x0 < r.x + r.w + margin && y1 > r.y - margin && y0 < r.y + r.h + margin;
}

export const segmentsOf = (points: readonly Point[]): [Point, Point][] =>
  points.slice(1).map((p, i) => [points[i]!, p]);

function place(ms: readonly Project[], groups: readonly Subject[]) {
  const depth = new Map(ms.map((m) => [m.number, depthOf(m.number)]));
  const cols = Math.max(...depth.values()) + 1;
  const laneOf = new Map(ms.map((m) => [m.number, groups.findIndex((s) => s.id === m.subject)]));
  const rowsIn = groups.map((_, lane) => {
    let most = 1;
    for (let c = 0; c < cols; c++)
      most = Math.max(
        most,
        ms.filter((m) => laneOf.get(m.number) === lane && depth.get(m.number) === c).length
      );
    return most;
  });
  const firstRow = rowsIn.map((_, lane) => rowsIn.slice(0, lane).reduce((a, b) => a + b, 0));
  const rows = rowsIn.reduce((a, b) => a + b, 0);
  const rowTop = (r: number) => ROW_GAP + r * (TILE_H + ROW_GAP);
  const placed = new Map<number, Placed>();

  for (let c = 0; c < cols; c++) {
    for (let lane = 0; lane < groups.length; lane++) {
      const here = ms.filter((m) => laneOf.get(m.number) === lane && depth.get(m.number) === c);
      if (!here.length) continue;
      const desired = (m: Project): number => {
        const ys = m.requires.map((r) => placed.get(r)).filter((p): p is Placed => p !== undefined);
        return ys.length
          ? ys.reduce((a, p) => a + p.y, 0) / ys.length
          : rowTop(firstRow[lane]! + (rowsIn[lane]! - 1) / 2);
      };
      const ordered = here.slice().sort((a, b) => desired(a) - desired(b) || a.number - b.number);
      const taken = new Set<number>();
      for (const m of ordered) {
        const want = desired(m);
        let best = -1;
        let bestGap = Infinity;
        for (let r = 0; r < rowsIn[lane]!; r++) {
          if (taken.has(r)) continue;
          const left = ordered.length - ordered.indexOf(m) - 1;
          const free = rowsIn[lane]! - taken.size - 1;
          if (free < left) continue;
          const gap = Math.abs(rowTop(firstRow[lane]! + r) - want);
          if (gap < bestGap) {
            best = r;
            bestGap = gap;
          }
        }
        taken.add(best);
        placed.set(m.number, {
          number: m.number,
          lane,
          col: c,
          row: firstRow[lane]! + best,
          x: columnX(c),
          y: rowTop(firstRow[lane]! + best),
          requires: m.requires
        });
      }
    }
  }
  return { placed, cols, rows, rowsIn, firstRow, rowTop };
}

interface Run {
  slot: number;
  lo: number;
  hi: number;
  key: string;
}

class Slots {
  private readonly runs = new Map<string, Run[]>();

  private readonly order: number[];

  constructor(capacity: number) {
    const middle = (capacity - 1) / 2;
    this.order = Array.from({ length: capacity }, (_, k) => k).sort(
      (p, q) => Math.abs(p - middle) - Math.abs(q - middle) || p - q
    );
  }

  free(line: string, lo: number, hi: number, key: string, merge: boolean): number {
    const here = this.runs.get(line) ?? [];
    for (const slot of this.order) {
      const clash = here.some(
        (r) => r.slot === slot && r.hi >= lo - 1 && r.lo <= hi + 1 && !(merge && r.key === key)
      );
      if (!clash) return slot;
    }
    return -1;
  }

  take(line: string, slot: number, lo: number, hi: number, key: string): void {
    const here = this.runs.get(line) ?? [];
    here.push({ slot, lo, hi, key });
    this.runs.set(line, here);
  }
}

export function layoutChain(ms: readonly Project[] = projects, groups: readonly Subject[] = subjects): Chain {
  const { placed, cols, rows, rowsIn, firstRow, rowTop } = place(ms, groups);
  const nodes = ms.map((m) => placed.get(m.number)!);
  const at = (number: number): Placed => placed.get(number)!;
  const width = columnX(cols) - GUTTER + EDGE_PAD;
  const height = rowTop(rows);
  const lanes: Lane[] = groups.map((s, i) => ({
    id: s.id,
    name: s.name,
    rows: rowsIn[i]!,
    top: rowTop(firstRow[i]!) - LANE_PAD,
    height: rowsIn[i]! * TILE_H + (rowsIn[i]! - 1) * ROW_GAP + 2 * LANE_PAD
  }));

  const rects = nodes.map(tileRect);
  const gutterSlots = new Slots(GUTTER_SLOTS);
  const channelSlots = new Slots(CHANNEL_SLOTS);
  const gutterX = (g: number, slot: number) =>
    columnX(g) + TILE_W + GUTTER / 2 + slotOffset(slot, GUTTER_SLOTS);
  const channelY = (c: number, slot: number) =>
    (c === 0 ? 0 : rowTop(c - 1) + TILE_H) + ROW_GAP / 2 + slotOffset(slot, CHANNEL_SLOTS);

  const clear = (points: Point[], a: Placed, b: Placed): boolean =>
    segmentsOf(points).every(([p, q]) =>
      nodes.every((n, i) => n === a || n === b || !segmentHitsRect(p, q, rects[i]!, CLEARANCE))
    );

  const edges: Edge[] = [];
  const pairs = nodes
    .flatMap((b) => b.requires.map((r) => ({ a: at(r), b })))
    .sort(
      (p, q) => p.b.col - p.a.col - (q.b.col - q.a.col) || p.b.number - q.b.number || p.a.number - q.a.number
    );

  for (const { a, b } of pairs) {
    const xs = a.x + TILE_W;
    const ys = a.y + TILE_H / 2;
    const xt = b.x;
    const yt = b.y + TILE_H / 2;
    const ga = a.col;
    const gb = b.col - 1;
    const sKey = `s${a.number}`;
    const tKey = `t${b.number}`;
    const lo = (p: number, q: number) => Math.min(p, q);
    const hi = (p: number, q: number) => Math.max(p, q);

    type Plan = () => Point[] | undefined;
    const viaGutter =
      (g: number, key: string): Plan =>
      () => {
        const slot = gutterSlots.free(`g${g}`, lo(ys, yt), hi(ys, yt), key, true);
        if (slot < 0) return undefined;
        const x = gutterX(g, slot);
        const pts = [
          { x: xs, y: ys },
          { x, y: ys },
          { x, y: yt },
          { x: xt, y: yt }
        ];
        if (!clear(pts, a, b)) return undefined;
        gutterSlots.take(`g${g}`, slot, lo(ys, yt), hi(ys, yt), key);
        return pts;
      };
    const planChannel = (c: number): Point[] | undefined => {
      const cy0 = channelY(c, 0);
      const cyLo = lo(ys, cy0);
      const cyHi = hi(ys, cy0);
      const slotA = gutterSlots.free(`g${ga}`, cyLo - 1, cyHi + 1, sKey, true);
      if (slotA < 0) return undefined;
      const xa = gutterX(ga, slotA);
      const slotB = gutterSlots.free(`g${gb}`, lo(yt, cy0) - 1, hi(yt, cy0) + 1, tKey, true);
      if (slotB < 0) return undefined;
      const xb = gutterX(gb, slotB);
      const slotC = channelSlots.free(`c${c}`, xa, xb, '', false);
      if (slotC < 0) return undefined;
      const cy = channelY(c, slotC);
      const pts = [
        { x: xs, y: ys },
        { x: xa, y: ys },
        { x: xa, y: cy },
        { x: xb, y: cy },
        { x: xb, y: yt },
        { x: xt, y: yt }
      ];
      if (!clear(pts, a, b)) return undefined;
      gutterSlots.take(`g${ga}`, slotA, lo(ys, cy), hi(ys, cy), sKey);
      gutterSlots.take(`g${gb}`, slotB, lo(yt, cy), hi(yt, cy), tKey);
      channelSlots.take(`c${c}`, slotC, xa, xb, '');
      return pts;
    };

    let points: Point[] | undefined;
    if (
      ys === yt &&
      clear(
        [
          { x: xs, y: ys },
          { x: xt, y: yt }
        ],
        a,
        b
      )
    ) {
      points = [
        { x: xs, y: ys },
        { x: xt, y: yt }
      ];
    } else if (b.col === a.col + 1) {
      points = viaGutter(ga, sKey)() ?? viaGutter(ga, tKey)();
    } else {
      const channels = Array.from({ length: rows + 1 }, (_, c) => c).sort(
        (p, q) =>
          Math.abs(channelY(p, 0) - ys) +
          Math.abs(channelY(p, 0) - yt) -
          (Math.abs(channelY(q, 0) - ys) + Math.abs(channelY(q, 0) - yt))
      );
      points = viaGutter(gb, tKey)() ?? viaGutter(ga, sKey)();
      for (const c of channels) {
        if (points) break;
        points = planChannel(c);
      }
    }
    if (!points) throw new Error(`no route from ${a.number} to ${b.number}`);
    const clean = points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
    const d = clean
      .map((p, i) => {
        if (i === 0) return `M${p.x} ${p.y}`;
        const prev = clean[i - 1]!;
        return p.y === prev.y ? `H${p.x}` : `V${p.y}`;
      })
      .join('');
    edges.push({ from: a.number, to: b.number, points: clean, d });
  }

  return { nodes, lanes, cols, rows, width, height, edges, at };
}

export const CHAIN = layoutChain();
