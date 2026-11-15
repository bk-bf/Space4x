export interface Anchor {
  id: string;
  text?: string;
  cls?: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  sel?: boolean;
  pick?: () => void;
  centre?: () => void;
}

export type Box = readonly [number, number, number, number];

export interface Spot {
  slot: number;
  x: number;
  y: number;
}

export interface LabelInput {
  anchor: Anchor;
  w: number;
  slot: number | null;
}

export const LABEL_H = 20;
const hit = (r: Box, q: Box) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];

export function layoutLabels(
  inputs: readonly LabelInput[],
  obstacles: readonly Anchor[],
  scale: number,
  deskW: number,
  deskH: number,
  blocks: readonly Box[],
  names: boolean
): Map<string, Spot | null> {
  const placed: Box[] = [];
  const result = new Map<string, Spot | null>();
  const boxOf = (a: Anchor): Box => [
    (a.x - a.rx) * scale,
    (a.y - a.ry) * scale,
    (a.x + a.rx) * scale,
    (a.y + a.ry) * scale
  ];
  const solid = [
    ...inputs.map((i) => ({ id: i.anchor.id, box: boxOf(i.anchor) })),
    ...obstacles.map((a) => ({ id: a.id, box: boxOf(a) }))
  ];
  const order = [...inputs].sort((p, q) => (q.anchor.sel ? 1 : 0) - (p.anchor.sel ? 1 : 0));
  for (const { anchor: a, w, slot } of order) {
    const cx = a.x * scale,
      cy = a.y * scale,
      rx = a.rx * scale,
      ry = a.ry * scale,
      h = LABEL_H;
    const slots: readonly (readonly [number, number])[] = [
      [cx + rx + 6, cy - h / 2],
      [cx - w / 2, cy + ry + 4],
      [cx - rx - 6 - w, cy - h / 2],
      [cx - w / 2, cy - ry - 4 - h],
      [cx + rx + 6, cy + ry],
      [cx + rx + 6, cy - ry - h],
      [cx - rx - 6 - w, cy + ry],
      [cx - rx - 6 - w, cy - ry - h],
      [cx - w / 2, cy + ry + 6 + h],
      [cx - w / 2, cy - ry - 6 - 2 * h]
    ];
    const visible =
      names &&
      cx > 0 &&
      cx < deskW &&
      cy > 0 &&
      cy < deskH &&
      !blocks.some((q) => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3]);
    const tries = slot == null ? [...slots.keys()] : [slot, ...slots.keys()];
    let spot: Spot | null = null;
    if (visible)
      for (const i of tries) {
        const [x, y] = slots[i]!,
          r: Box = [x, y, x + w, y + h];
        if (r[0] < 2 || r[2] > deskW - 2 || r[1] < 2 || r[3] > deskH - 2) continue;
        if (placed.some((q) => hit(r, q)) || blocks.some((q) => hit(r, q))) continue;
        if (solid.some((o) => o.id !== a.id && hit(r, o.box))) continue;
        placed.push(r);
        spot = { slot: i, x, y };
        break;
      }
    result.set(a.id, spot);
  }
  return result;
}

interface Label {
  el: HTMLSpanElement;
  w: number;
  slot: number | null;
}

export class LabelLayer {
  private labels = new Map<string, Label>();

  constructor(private readonly host: HTMLElement) {}

  private label(a: Anchor & { text: string }): Label {
    const known = this.labels.get(a.id);
    if (known) return known;
    const el = document.createElement('span');
    el.textContent = a.text;
    if (a.pick) el.onclick = a.pick;
    if (a.centre) el.ondblclick = a.centre;
    this.host.append(el);
    const made = { el, w: el.offsetWidth, slot: null };
    this.labels.set(a.id, made);
    return made;
  }

  place(
    anchors: readonly Anchor[],
    scale: number,
    deskW: number,
    deskH: number,
    blocks: readonly Box[],
    names: boolean
  ) {
    const named = anchors.filter((a): a is Anchor & { text: string } => !!a.text);
    const present = new Set(named.map((a) => a.id));
    for (const [id, l] of this.labels)
      if (!present.has(id)) {
        l.el.remove();
        this.labels.delete(id);
      }
    const inputs = named.map((anchor) => {
      const lab = this.label(anchor);
      lab.el.className = (anchor.cls ?? '') + (anchor.sel ? ' sel' : '');
      return { anchor, w: lab.w, slot: lab.slot };
    });
    const obstacles = anchors.filter((a) => !a.text);
    const spots = layoutLabels(inputs, obstacles, scale, deskW, deskH, blocks, names);
    for (const { anchor } of inputs) {
      const lab = this.labels.get(anchor.id)!,
        spot = spots.get(anchor.id) ?? null;
      if (spot) {
        lab.slot = spot.slot;
        lab.el.style.left = Math.round(spot.x) + 'px';
        lab.el.style.top = Math.round(spot.y) + 'px';
      }
      lab.el.hidden = !spot;
    }
  }

  clear(): void {
    for (const l of this.labels.values()) l.el.remove();
    this.labels.clear();
  }
}
