import { describe, expect, it } from 'vitest';
import { projects, subjects } from '#lib/game/data/index.ts';
import {
  CHAIN,
  GUTTER,
  ROW_GAP,
  TILE_H,
  TILE_W,
  segmentHitsRect,
  segmentsOf,
  tileRect,
  type Point
} from './chain.ts';

describe('the research tree layout', () => {
  it('places every project once, in the lane of its subject, at a column of its prerequisite depth', () => {
    expect(CHAIN.nodes.map((n) => n.number)).toEqual(projects.map((m) => m.number));
    for (const n of CHAIN.nodes) {
      const m = projects.find((x) => x.number === n.number)!;
      expect(subjects[n.lane]!.id).toBe(m.subject);
      for (const r of m.requires) expect(CHAIN.at(r).col, `${r} before ${n.number}`).toBeLessThan(n.col);
    }
  });

  it('gives a lane as many rows as its fullest column needs, and no two tiles overlap', () => {
    for (const lane of CHAIN.lanes) {
      const here = CHAIN.nodes.filter((n) => subjects[n.lane]!.id === lane.id);
      const most = Math.max(
        ...Array.from({ length: CHAIN.cols }, (_, c) => here.filter((n) => n.col === c).length)
      );
      expect(lane.rows, lane.id).toBe(most);
    }
    for (const a of CHAIN.nodes)
      for (const b of CHAIN.nodes) {
        if (a === b) continue;
        const far = a.x + TILE_W + GUTTER > b.x && b.x + TILE_W + GUTTER > a.x;
        const near = a.y + TILE_H + ROW_GAP > b.y && b.y + TILE_H + ROW_GAP > a.y;
        expect(far && near, `${a.number} and ${b.number}`).toBe(false);
      }
  });

  it('fits the eight lanes, with the boost lines, in seventeen rows', () => {
    expect(CHAIN.lanes).toHaveLength(8);
    expect(CHAIN.rows).toBe(17);
  });
});

describe('the research tree lines', () => {
  it('has one line for each prerequisite, leaving its source at the right edge and entering its target at the left edge', () => {
    const count = projects.reduce((a, m) => a + m.requires.length, 0);
    expect(CHAIN.edges).toHaveLength(count);
    for (const e of CHAIN.edges) {
      const a = CHAIN.at(e.from);
      const b = CHAIN.at(e.to);
      expect(e.points[0], `${e.from}-${e.to}`).toEqual({ x: a.x + TILE_W, y: a.y + TILE_H / 2 });
      expect(e.points.at(-1), `${e.from}-${e.to}`).toEqual({ x: b.x, y: b.y + TILE_H / 2 });
      for (const [p, q] of segmentsOf(e.points)) expect(p.x === q.x || p.y === q.y).toBe(true);
      const xs = e.points.map((p) => p.x);
      expect(xs, `${e.from}-${e.to}`).toEqual([...xs].sort((p, q) => p - q));
    }
  });

  it('never runs behind a tile that is not one of its two ends', () => {
    for (const e of CHAIN.edges)
      for (const [p, q] of segmentsOf(e.points))
        for (const n of CHAIN.nodes) {
          if (n.number === e.from || n.number === e.to) continue;
          expect(segmentHitsRect(p, q, tileRect(n)), `${e.from}-${e.to} through ${n.number}`).toBe(false);
        }
  });

  it('leaves its ends only through the open sides of its own two tiles', () => {
    for (const e of CHAIN.edges) {
      const a = tileRect(CHAIN.at(e.from));
      const b = tileRect(CHAIN.at(e.to));
      const inner = (pts: Point[], r: typeof a) =>
        segmentsOf(pts).some(([p, q]) => segmentHitsRect(p, q, { ...r, x: r.x + 1, w: r.w - 2 }));
      expect(inner(e.points, a), `${e.from}-${e.to} in source`).toBe(false);
      expect(inner(e.points, b), `${e.from}-${e.to} in target`).toBe(false);
    }
  });

  it('keeps lines that share a gutter on different slots unless they share an end', () => {
    const verticals = CHAIN.edges.flatMap((e) =>
      segmentsOf(e.points)
        .filter(([p, q]) => p.x === q.x && p.y !== q.y)
        .map(([p, q]) => ({ e, x: p.x, lo: Math.min(p.y, q.y), hi: Math.max(p.y, q.y) }))
    );
    for (const a of verticals)
      for (const b of verticals) {
        if (a === b || a.x !== b.x || a.hi < b.lo || b.hi < a.lo) continue;
        const share = a.e.from === b.e.from || a.e.to === b.e.to;
        expect(share, `${a.e.from}-${a.e.to} and ${b.e.from}-${b.e.to}`).toBe(true);
      }
  });
});
