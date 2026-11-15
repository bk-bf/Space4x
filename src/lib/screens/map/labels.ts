export interface Anchor {
  id: string;
  text: string;
  cls?: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  sel?: boolean;
  pick?: () => void;
  centre?: () => void;
}

type Box = readonly [number, number, number, number];

interface Label {
  el: HTMLSpanElement;
  w: number;
  slot: number | null;
}

const LABEL_H = 20;
const hit = (r: Box, q: Box) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];

export class LabelLayer {
  private labels = new Map<string, Label>();

  constructor(private readonly host: HTMLElement) {}

  private label(a: Anchor): Label {
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
    const placed: Box[] = [];
    const present = new Set(anchors.map((a) => a.id));
    for (const [id, l] of this.labels) if (!present.has(id)) l.el.hidden = true;
    const boxes: Box[] = anchors.map((a) => [
      (a.x - a.rx) * scale,
      (a.y - a.ry) * scale,
      (a.x + a.rx) * scale,
      (a.y + a.ry) * scale
    ]);
    const order = anchors
      .map((a, i) => [a, i] as const)
      .sort((p, q) => (q[0].sel ? 1 : 0) - (p[0].sel ? 1 : 0));
    for (const [a, n] of order) {
      const lab = this.label(a);
      lab.el.className = (a.cls ?? '') + (a.sel ? ' sel' : '');
      const cx = a.x * scale,
        cy = a.y * scale,
        rx = a.rx * scale,
        ry = a.ry * scale,
        w = lab.w,
        h = LABEL_H;
      const slots: Box[] = [
        [cx + rx + 6, cy - h / 2, 0, 0],
        [cx - w / 2, cy + ry + 4, 0, 0],
        [cx - rx - 6 - w, cy - h / 2, 0, 0],
        [cx - w / 2, cy - ry - 4 - h, 0, 0],
        [cx + rx + 6, cy + ry, 0, 0],
        [cx + rx + 6, cy - ry - h, 0, 0],
        [cx - rx - 6 - w, cy + ry, 0, 0],
        [cx - rx - 6 - w, cy - ry - h, 0, 0],
        [cx - w / 2, cy + ry + 6 + h, 0, 0],
        [cx - w / 2, cy - ry - 6 - 2 * h, 0, 0]
      ];
      const visible =
        names &&
        cx > 0 &&
        cx < deskW &&
        cy > 0 &&
        cy < deskH &&
        !blocks.some((q) => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3]);
      const tries = lab.slot == null ? [...slots.keys()] : [lab.slot, ...slots.keys()];
      let done = false;
      if (visible)
        for (const i of tries) {
          const [x, y] = slots[i]!,
            r: Box = [x, y, x + w, y + h];
          if (r[0] < 2 || r[2] > deskW - 2 || r[1] < 2 || r[3] > deskH - 2) continue;
          if (
            placed.some((q) => hit(r, q)) ||
            blocks.some((q) => hit(r, q)) ||
            boxes.some((q, j) => j !== n && hit(r, q))
          )
            continue;
          lab.slot = i;
          lab.el.style.left = Math.round(x) + 'px';
          lab.el.style.top = Math.round(y) + 'px';
          placed.push(r);
          done = true;
          break;
        }
      lab.el.hidden = !done;
    }
  }

  clear(): void {
    for (const l of this.labels.values()) l.el.remove();
    this.labels.clear();
  }
}
