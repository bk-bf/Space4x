import type { FB, SpritePalette } from '#lib/gfx/framebuffer.ts';
import { clamp } from '#lib/gfx/math.ts';
import { dith, fbm } from '#lib/gfx/noise.ts';
import { PAL, type RGB } from '#lib/gfx/palette.ts';
import { KIND_ORDER, type Stance, type Unit, type UnitKind } from './model.ts';

export const SPRITES: Record<UnitKind, readonly string[]> = {
  inf: ['.ooo.', '.oGo.', '.ooo.', 'ogggo', 'ogggo', '.ogo.', '.o.o.', '.o.o.'],
  tank: [
    '....ooooo....',
    '...oGGGGooooo',
    '...oggggo....',
    '.ooooooooooo.',
    'oGGGGGGGGGGGo',
    'ododododododo',
    '.ooooooooooo.'
  ],
  art: [
    '.........oo.',
    '.......oo...',
    '.....oo.....',
    '..oooo......',
    '.oGGggo.....',
    'ooooooooo...',
    '.o.o..o.o...'
  ],
  hq: [
    '......r....',
    '......o....',
    '.oooooo....',
    '.oGGGGoooo.',
    '.oggggoGwo.',
    'ooooooooooo',
    '.oo....oo..',
    '.oo....oo..'
  ],
  aa: [
    '.......oo...',
    '......oGGo..',
    '.......oGo..',
    '..oooooooo..',
    '.oGGggGGgGo.',
    '.oggggggggo.',
    '.o.o....o.o.'
  ]
};

export const SPRITE_PALETTE: SpritePalette = {
  o: [20, 18, 30],
  g: [86, 104, 72],
  G: [132, 150, 104],
  d: [54, 66, 50],
  w: [110, 220, 230],
  r: [214, 84, 74]
};

export const spriteSize = (kind: UnitKind): { w: number; h: number } => ({
  w: SPRITES[kind][0]!.length,
  h: SPRITES[kind].length
});

const SKY: readonly RGB[] = [
  [70, 44, 58],
  [150, 96, 74],
  [206, 156, 108]
];
const SOIL: RGB = [78, 38, 34];
const SOIL_LIGHT: RGB = [96, 46, 38];
const RIDGE: RGB = [112, 60, 48];

const terrain = new Map<string, Uint8ClampedArray>();

function paintTerrain(f: FB, horizon: number): void {
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      if (y < horizon)
        f.px(x, y, SKY[clamp(Math.floor((y / horizon) * 2.6 + (dith(x, y) - 0.5) * 0.9), 0, 2)]!);
      else f.px(x, y, fbm(x * 0.08, y * 0.3, 2, 2) + dith(x, y) * 0.3 > 0.62 ? SOIL_LIGHT : SOIL);
    }
  for (let x = 0; x < f.w; x++)
    for (let y = horizon - 3 - Math.floor(fbm(x * 0.03, 0, 9, 3) * 14); y < horizon; y++) f.px(x, y, RIDGE);
}

export function drawTerrain(f: FB, horizon: number): void {
  const key = `${f.w}x${f.h}x${horizon}`;
  const cached = terrain.get(key);
  if (cached) {
    f.d.set(cached);
    return;
  }
  paintTerrain(f, horizon);
  terrain.set(key, f.d.slice());
}

export interface Placed {
  unit: Unit;
  x: number;
  base: number;
  w: number;
  h: number;
}

export const FIELD_HORIZON = 24;
export const FIELD_ROWS: readonly number[] = [36, 47, 58];
const MARGIN = 6;

export function layoutUnits(units: readonly Unit[], width: number): Placed[] {
  const groups = KIND_ORDER.map((k) => units.filter((u) => u.kind === k)).filter((g) => g.length);
  const rows = FIELD_ROWS.length;
  const place = (columnGap: number, groupGap: number): { placed: Placed[]; end: number } => {
    const placed: Placed[] = [];
    let x = MARGIN;
    for (const g of groups) {
      const { w, h } = spriteSize(g[0]!.kind);
      g.forEach((unit, i) => {
        placed.push({
          unit,
          x: x + Math.floor(i / rows) * (w + columnGap),
          base: FIELD_ROWS[i % rows]!,
          w,
          h
        });
      });
      x += Math.ceil(g.length / rows) * (w + columnGap) + groupGap;
    }
    return { placed, end: x - groupGap };
  };
  let { placed, end } = place(3, 7);
  if (end > width - MARGIN) ({ placed, end } = place(1, 2));
  if (end > width - MARGIN && end > MARGIN) {
    const k = (width - 2 * MARGIN) / (end - MARGIN);
    placed = placed.map((p) => ({ ...p, x: Math.round(MARGIN + (p.x - MARGIN) * k) }));
  }
  return placed;
}

function stanceMark(f: FB, p: Placed, stance: Stance): void {
  const { x, base, w } = p;
  if (stance === 'Dug in') {
    for (let i = -1; i <= w; i++) {
      f.px(x + i, base, [58, 26, 26]);
      if (i > 0 && i < w - 1) f.px(x + i, base + 1, [44, 20, 22]);
    }
  } else if (stance === 'Advance') {
    for (let j = 0; j < 3; j++) f.px(x + w + 1 + j, base - 4 + j, PAL.sel);
    for (let j = 0; j < 2; j++) f.px(x + w + 3 - j, base - 2 + j, PAL.sel);
  } else if (stance === 'Support') {
    for (let i = 0; i < w; i += 2) f.px(x + i, base, PAL.jump);
  } else {
    for (let i = 0; i < w; i += 3) f.px(x + i, base, [148, 143, 192]);
  }
}

export function drawBattlefield(f: FB, units: readonly Unit[], t: number, selected: string | null): Placed[] {
  drawTerrain(f, FIELD_HORIZON);
  const placed = layoutUnits(units, f.w);
  const order = [...placed].sort((a, b) => a.base - b.base || a.x - b.x);
  order.forEach((p, i) => {
    f.sprite(SPRITES[p.unit.kind], p.x, p.base - p.h, SPRITE_PALETTE);
    stanceMark(f, p, p.unit.stance);
    if (p.unit.kind === 'tank' && (t + i * 3) % 6 < 3) f.px(p.x - 1, p.base - 4, [150, 140, 140]);
    if (p.unit.supply < 25) f.px(p.x + p.w - 1, p.base - p.h - 2, PAL.hot);
  });
  const chosen = placed.find((p) => p.unit.id === selected);
  if (chosen) {
    const cx = chosen.x + Math.floor(chosen.w / 2),
      top = chosen.base - chosen.h - 6 + ((t >> 2) & 1);
    for (let k = 0; k < 3; k++) for (let i = -2 + k; i <= 2 - k; i++) f.px(cx + i, top + k, PAL.sel);
  }
  f.present();
  return placed;
}

const SQUAD: Record<UnitKind, number> = { inf: 5, tank: 3, art: 3, hq: 2, aa: 3 };

export function drawSquad(f: FB, kind: UnitKind): void {
  const horizon = 18;
  drawTerrain(f, horizon);
  const { w, h } = spriteSize(kind);
  const n = SQUAD[kind];
  const gap = w + (kind === 'inf' ? 6 : 4);
  const left = Math.floor((f.w - (n * gap - (gap - w))) / 2);
  for (let i = 0; i < n; i++) f.sprite(SPRITES[kind], left + i * gap, 29 + (i % 2) * 4 - h, SPRITE_PALETTE);
  f.present();
}
