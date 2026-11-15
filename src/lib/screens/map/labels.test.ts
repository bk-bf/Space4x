import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelLayer, LABEL_H, layoutLabels, type Anchor, type Box } from './labels.ts';

const W = 60;
const anchor = (id: string, x: number, y: number, rx = 4, ry = 4): Anchor => ({
  id,
  text: id,
  x,
  y,
  rx,
  ry
});
const input = (a: Anchor) => ({ anchor: a, w: W, slot: null });
const star = (id: string, x: number, y: number, r: number): Anchor => ({ id, x, y, rx: r, ry: r });
const hit = (r: Box, q: Box) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];
const boxOf = (s: { x: number; y: number }): Box => [s.x, s.y, s.x + W, s.y + LABEL_H];
const around = (a: Anchor): Box => [a.x - a.rx, a.y - a.ry, a.x + a.rx, a.y + a.ry];

describe('label layout', () => {
  it('keeps a label off a star that sits where its first choice would go', () => {
    const fleet = anchor('fleet', 100, 100, 8, 5);
    const sun = star('star', 140, 100, 34);
    const spots = layoutLabels([input(fleet)], [sun], 1, 600, 400, [], true);
    const spot = spots.get('fleet');
    expect(spot).not.toBeNull();
    expect(hit(boxOf(spot!), around(sun))).toBe(false);
    expect(spot!.slot).not.toBe(0);
  });

  it('hides a label that has nowhere to go but over a star', () => {
    const fleet = anchor('fleet', 40, 40, 8, 5);
    const sun = star('star', 40, 40, 400);
    expect(layoutLabels([input(fleet)], [sun], 1, 200, 120, [], true).get('fleet')).toBeNull();
  });

  it('keeps a label off bodies and other labels', () => {
    const a = anchor('a', 100, 100, 6, 6);
    const b = anchor('b', 140, 100, 12, 12);
    const c = anchor('c', 100, 140, 6, 6);
    const spots = layoutLabels([a, b, c].map(input), [], 1, 600, 400, [], true);
    const placed = [...spots.entries()].flatMap(([id, s]) => (s ? [[id, boxOf(s)] as const] : []));
    expect(placed.length).toBeGreaterThan(0);
    for (const [id, r] of placed) {
      for (const o of [a, b, c].filter((x) => x.id !== id)) expect(hit(r, around(o))).toBe(false);
      for (const [other, q] of placed) if (other !== id) expect(hit(r, q)).toBe(false);
    }
  });

  it('keeps a label out of the windows and hides it under one', () => {
    const a = anchor('a', 100, 100);
    const window: Box = [110, 80, 300, 200];
    const spot = layoutLabels([input(a)], [], 1, 600, 400, [window], true).get('a');
    expect(spot && hit(boxOf(spot), window)).toBeFalsy();
    const under: Box = [90, 90, 120, 120];
    expect(layoutLabels([input(a)], [], 1, 600, 400, [under], true).get('a')).toBeNull();
  });

  it('shows no labels when names are off', () => {
    expect(layoutLabels([input(anchor('a', 100, 100))], [], 1, 600, 400, [], false).get('a')).toBeNull();
  });
});

interface FakeEl {
  textContent: string;
  offsetWidth: number;
  className: string;
  hidden: boolean;
  style: Record<string, string>;
  onclick: (() => void) | null;
  ondblclick: (() => void) | null;
  remove(): void;
}

function fakeDom() {
  const attached = new Set<FakeEl>();
  vi.stubGlobal('document', {
    createElement: (): FakeEl => {
      const el: FakeEl = {
        textContent: '',
        offsetWidth: W,
        className: '',
        hidden: false,
        style: {},
        onclick: null,
        ondblclick: null,
        remove: () => attached.delete(el)
      };
      return el;
    }
  });
  const host = { append: (el: FakeEl) => attached.add(el) } as unknown as HTMLElement;
  return { host, attached };
}

describe('the label layer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('removes the label of an anchor that is gone, with its click handler', () => {
    const { host, attached } = fakeDom();
    const layer = new LabelLayer(host);
    const picks: string[] = [];
    const a = { ...anchor('f-a', 100, 100), pick: () => picks.push('a') };
    const b = { ...anchor('f-b', 300, 100), pick: () => picks.push('b') };
    layer.place([a, b], 1, 600, 400, [], true);
    expect(attached.size).toBe(2);
    const labelB = [...attached].find((el) => el.textContent === 'f-b')!;
    layer.place([a], 1, 600, 400, [], true);
    expect(attached.size).toBe(1);
    expect(attached.has(labelB)).toBe(false);
    layer.place([a, b], 1, 600, 400, [], true);
    expect(attached.size).toBe(2);
  });

  it('removes a label that is merely hidden under a window once its anchor is gone', () => {
    const { host, attached } = fakeDom();
    const layer = new LabelLayer(host);
    const a = anchor('c-1', 100, 100);
    layer.place([a], 1, 600, 400, [[50, 50, 200, 200]], true);
    expect([...attached][0]!.hidden).toBe(true);
    layer.place([], 1, 600, 400, [], true);
    expect(attached.size).toBe(0);
  });

  it('draws no label for an obstacle', () => {
    const { host, attached } = fakeDom();
    new LabelLayer(host).place([star('star-0', 100, 100, 20)], 1, 600, 400, [], true);
    expect(attached.size).toBe(0);
  });
});
