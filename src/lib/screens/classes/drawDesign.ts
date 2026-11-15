import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import { stars } from '#lib/gfx/scenes.ts';
import type { ShipSpec } from '#lib/gfx/ships/specs.ts';
import {
  METRES_PER_UNIT,
  drawShip,
  fitShip,
  shipBeamMetres,
  shipLengthMetres
} from '#lib/gfx/topdown/index.ts';
import { PALETTE, defaultAttachment, type PaletteItem, type Selection } from '#lib/game/design.ts';
import { colX, frameOf, viewOf, type Frame } from './geometry.ts';
import type { Inspector } from './inspector.svelte.ts';

export const PARTS_W = 120;
export const PARTS_SCALE = 2;
export const CELL_W = 30;
export const CELL_H = 34;
export const PARTS_COLUMNS = 4;
export const PARTS_H = Math.ceil(PALETTE.length / PARTS_COLUMNS) * CELL_H;
export const CARD_SCALE = 2;

const ANIMATION_FRAMES_PER_TICK = 3;
const DESIGN_THRUST = 0.75;
const CARD_THRUST = 0.35;

function slotMarks(f: FB, x: number, y: number, w: number, h: number, up: boolean, hot: boolean): void {
  const c = hot ? PAL.sel : PAL.orbit,
    dir = up ? -1 : 1;
  for (let i = 0; i < w; i++) {
    if (hot || i % 2 === 0) {
      f.px(x + i, y, c);
      f.px(x + i, y + dir * h, c);
    }
  }
  for (let j = 1; j < h; j++) {
    if (hot || j % 2 === 1) {
      f.px(x, y + dir * j, c);
      f.px(x + w - 1, y + dir * j, c);
    }
  }
}

function selectionMarks(f: FB, sp: ShipSpec, frame: Frame, sel: Selection): void {
  const first = frame.parts[0];
  const last = frame.parts[frame.parts.length - 1];
  if (!first || !last) return;
  const y = frame.lineY;
  f.line(colX(frame, first.x), y, colX(frame, last.x + last.w), y, PAL.orbit, 2);
  for (const q of [...frame.parts.map((p) => p.x), last.x + last.w]) {
    const x = Math.round(colX(frame, q));
    for (let j = -2; j <= 0; j++) f.px(x, y + j, PAL.sel);
  }
  const chosen = frame.parts.find((p) =>
    sel.kind === 'section'
      ? p.target.kind === 'section' && p.target.index === sel.index
      : p.target.kind === sel.kind
  );
  if (!chosen) return;
  const a = Math.round(colX(frame, chosen.x)),
    b = Math.round(colX(frame, chosen.x + chosen.w));
  for (let i = a; i <= b; i++) {
    f.px(i, y + 1, PAL.sel);
    f.px(i, y + 2, PAL.sel);
  }
  if (sel.kind !== 'section') return;
  const section = sp.parts[sel.index];
  if (!section) return;
  const w = Math.max(6, Math.min(b - a - 2, Math.round(4 * frame.S))),
    h = Math.max(4, Math.round(2.4 * frame.S)),
    x = Math.round((a + b - w) / 2),
    edge = chosen.hh * frame.S + 2;
  for (const slot of ['top', 'bottom'] as const) {
    const hot = sel.slot === slot;
    if (section[slot === 'top' ? 1 : 2] && !hot) continue;
    slotMarks(
      f,
      x,
      Math.round(slot === 'top' ? frame.cy - edge : frame.cy + edge),
      w,
      h,
      slot === 'top',
      hot
    );
  }
}

export function drawDesign(f: FB, sp: ShipSpec, t: number, sel: Selection, inspect: Inspector): void {
  const frame = frameOf(sp, f.w, f.h, f.scale);
  const angle = inspect.angleAt(t);
  f.start();
  drawShip(f, sp, {
    ...viewOf(frame, angle),
    frame: t * ANIMATION_FRAMES_PER_TICK,
    thrust: DESIGN_THRUST,
    systems: inspect.systems,
    damage: inspect.damage,
    highlight: inspect.hover?.comp ?? 0
  });
  if (!inspect.turning) selectionMarks(f, sp, frame, sel);
  f.present();
}

export function drawCard(f: FB, sp: ShipSpec, t: number): void {
  stars(f, sp.stern ? t : 0, 14);
  const fit = fitShip(sp, f.w, f.h, 3, true);
  drawShip(f, sp, { ...fit, angle: 0, frame: t * ANIMATION_FRAMES_PER_TICK, thrust: CARD_THRUST });
  f.present();
}

const partSpecs = new Map<string, ShipSpec>();

function partSpec(item: PaletteItem): ShipSpec {
  const id = `${item.kind}:${item.key}`;
  let sp = partSpecs.get(id);
  if (sp) return sp;
  if (item.kind === 'core') sp = { id, parts: [[item.key as never]] };
  else if (item.kind === 'stern') sp = { id, parts: [], stern: [item.key as never, 2] };
  else if (item.kind === 'bow') sp = { id, parts: [], bow: item.key as never };
  else sp = { id, parts: [['hull', defaultAttachment(item.key as never)]] };
  partSpecs.set(id, sp);
  return sp;
}

const ICON_W = 27;
const ICON_H = 21;
const ICON_MAX = 1.5;

export function drawParts(p: FB, t: number): void {
  p.fill(PAL.panel);
  PALETTE.forEach((item, n) => {
    const sp = partSpec(item),
      len = shipLengthMetres(sp) / METRES_PER_UNIT,
      beam = shipBeamMetres(sp) / METRES_PER_UNIT,
      S = Math.min(ICON_MAX, ICON_W / len, ICON_H / beam);
    drawShip(p, sp, {
      x: (n % PARTS_COLUMNS) * CELL_W + CELL_W / 2,
      y: Math.floor(n / PARTS_COLUMNS) * CELL_H + 12,
      angle: 0,
      pxPerMetre: S / METRES_PER_UNIT,
      frame: t * ANIMATION_FRAMES_PER_TICK,
      livery: 'navy'
    });
  });
  p.present();
}
