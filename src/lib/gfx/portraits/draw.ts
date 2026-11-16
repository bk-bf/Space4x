import { mixc, type Color, type Pix } from '../icons/pixels.ts';
import {
  BEARDS,
  CAP_BAND,
  CAP_WHITE,
  GOLD,
  GREY,
  HAIRS,
  PORTRAIT_H as H,
  PORTRAIT_W as W,
  RIBBONS,
  UNIFORM,
  type BeardShape,
  type Branch,
  type Disc,
  type HairShape,
  type Pts
} from './catalogue.ts';
import type { Traits } from './traits.ts';

type Inside = (x: number, y: number) => boolean;
type Shade = (x: number, y: number) => Color;

function pip(pts: Pts, x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!,
      b = pts[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

const poly =
  (pts: Pts): Inside =>
  (x, y) =>
    pip(pts, x + 0.5, y + 0.5);

const dull = (c: Color): Color => {
  const m = mixc(c, [64, 60, 82], 0.22);
  return [m[0] * 0.9, m[1] * 0.9, m[2] * 0.9];
};

function drawPortrait(im: Pix, T: Traits, branch: Branch, grit: boolean): void {
  const tone = <A extends readonly Color[]>(a: A): A => (grit ? (a.map(dull) as unknown as A) : a);
  const [SH, SM, SD, SO] = tone(T.skin);
  const [HL, HM, HD, HO] = tone(T.hair);
  const U = tone(UNIFORM[branch]);
  const B = tone(T.bg);
  const G = tone(GOLD);
  const px = (x: number, y: number, c: Color | undefined) => im.set(x, y, c);
  const layer = (inside: Inside, shade: Shade, outline?: Color | null) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        im.set(x, y, edge && outline ? outline : shade(x, y));
      }
  };
  const seg = (x0: number, y0: number, x1: number, y1: number, c: Color) => im.line(x0, y0, x1, y1, c);

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 22, y - 26);
      px(x, y, d < 17 ? B[2] : d < 27 ? B[1] : B[0]);
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if ((x + y * 2) % 23 === 0 && Math.hypot(x - 22, y - 26) >= 27) px(x, y, mixc(B[0], B[1], 0.6));
  const bg = new Uint8ClampedArray(im.d);

  const f = T.gender === 'f',
    st = T.style,
    HS: HairShape = HAIRS[st];
  const jx = (f ? 23 : 21) + (2 - T.jaw) * (f ? 0.5 : 1),
    sq = !f && T.jaw === 0 ? 1 : 0;
  const HEAD: Pts = f
    ? [
        [25, 10],
        [31, 9],
        [38, 10],
        [43, 14],
        [45, 20],
        [45, 24],
        [44, 27],
        [45, 30],
        [44, 34],
        [42, 40],
        [39, 45],
        [35, 48],
        [32, 48],
        [28, 46],
        [jx, 42],
        [20, 37],
        [18, 30],
        [17, 24],
        [17, 18],
        [20, 13]
      ]
    : [
        [25, 10],
        [31, 9],
        [38, 10],
        [43, 14],
        [45, 20],
        [45, 24],
        [44, 27],
        [45, 30],
        [45, 34],
        [43, 40],
        [40, 45],
        [36 + sq, 48],
        [32, 48.4],
        [27 - sq, 46],
        [jx, 42],
        [19, 37],
        [18, 30],
        [17, 24],
        [17, 18],
        [20, 13]
      ];
  const inHead = poly(HEAD);
  const hairShade: Shade = (x, y) => {
    const e = ((x - 27) / 10) ** 2 + ((y - 9) / 4) ** 2;
    if (e < 1 && e > 0.3 && y <= 11) return HL;
    if ((x + T.jag) % 5 === 0 && y < 14 && x > 22 && x < 42) return HL;
    if (x >= 42 || x <= 15 || (y > 26 && (x + T.jag) % 3 === 0)) return HD;
    return HM;
  };
  const shadeH: Shade = (x, y) =>
    HS.curly && (x * 3 + y * 5 + T.jag) % 7 === 0
      ? HD
      : HS.locs && y > 15 && x % 2 === 0
        ? HD
        : hairShade(x, y);
  const capOk = (y: number) => !T.cap || y >= 19;
  const discIn = (ds: readonly Disc[] | undefined, x: number, y: number) =>
    !!ds && ds.some(([a, b, r]) => Math.hypot(x + 0.5 - a, y + 0.5 - b) <= r);

  const backs = (HS.back ?? []).map(poly);
  if (backs.length || HS.backDiscs)
    layer((x, y) => capOk(y) && (backs.some((q) => q(x, y)) || discIn(HS.backDiscs, x, y)), shadeH, HO);
  if (HS.afro) layer((x, y) => capOk(y) && Math.hypot(x - 29, y - 15) <= 16 && y <= 29, shadeH, HO);

  layer(
    poly([
      [0, 72],
      [2, 62],
      [12, 56],
      [21, 52],
      [42, 52],
      [52, 55],
      [61, 61],
      [64, 72]
    ]),
    (x, y) => {
      if (y <= 57 + (x - 12) * -0.1 && x < 22 && y < 60) return U[0];
      if (x >= 46) return U[2];
      if ((x - y * 0.5) % 9 < 1 && y > 60) return U[2];
      return U[1];
    },
    U[3]
  );
  seg(33, 56, 36, 71, U[3]);
  seg(34, 56, 37, 71, U[2]);
  for (const y of [60, 64, 68]) px(32 + Math.floor((y - 56) / 5), y, G[1]);
  layer(
    poly([
      [5, 59],
      [17, 54],
      [20, 57],
      [8, 62]
    ]),
    (_x, y) => (y < 57 ? G[0] : G[1]),
    G[2]
  );
  layer(
    poly([
      [46, 55],
      [56, 59],
      [55, 61],
      [45, 58]
    ]),
    () => G[1],
    G[2]
  );
  for (let i = 0; i <= Math.min(4, T.rank); i++) px(9 + i * 2, 58 - Math.floor(i * 0.8), U[3]);
  for (let i = 0; i < Math.min(6, T.rank + 1); i++) {
    const x = 41 + (i % 3) * 3,
      y = 63 + Math.floor(i / 3) * 2;
    px(x, y, RIBBONS[i]);
    px(x + 1, y, RIBBONS[i]);
  }

  layer(
    poly(
      f
        ? [
            [23, 40],
            [23, 55],
            [39, 55],
            [39, 44]
          ]
        : [
            [22, 40],
            [21, 55],
            [41, 55],
            [40, 44]
          ]
    ),
    (x, y) => (x <= 25 && y > 45 ? SM : SD),
    SO
  );
  layer(
    poly([
      [18, 54],
      [21, 47],
      [27, 51],
      [33, 57],
      [30, 59]
    ]),
    (_x, y) => (y < 51 ? U[0] : U[1]),
    U[3]
  );
  layer(
    poly([
      [43, 54],
      [41, 48],
      [37, 52],
      [33, 57],
      [37, 59]
    ]),
    () => U[2],
    U[3]
  );
  seg(21, 48, 26, 51, G[1]);
  px(24, 53, G[0]);
  if (T.rank >= 3) px(27, 55, G[0]);

  layer(
    poly([
      [14, 27],
      [18, 25],
      [20, 34],
      [16, 36],
      [13, 31]
    ]),
    (x, y) => (x >= 16 && y > 28 && y < 33 ? SD : SM),
    SO
  );
  if (T.earring) {
    px(16, 37, G[0]);
    px(16, 38, G[1]);
  }

  layer(
    inHead,
    (x, y) => {
      if (x >= 43) return mixc(SD, SO, 0.45);
      if ((x >= 38 + (y - 26) * 0.1 && y >= 29) || (x >= 41 && y < 26) || (y >= 44 && x < 30) || y >= 46)
        return SD;
      if (
        ((x - 26) / 6) ** 2 + ((y - 16) / 3.4) ** 2 < 1 ||
        ((x - 23) / 3.4) ** 2 + ((y - 32) / 1.8) ** 2 < 1
      )
        return SH;
      return SM;
    },
    SO
  );
  for (let i = 0; i < 8; i++) {
    const x = 20 + i,
      y = 37 + Math.floor(i * 0.45);
    px(x, y, T.gaunt ? SD : mixc(SM, SD, f ? 0.3 : 0.5));
    if (T.gaunt) px(x, y + 1, mixc(SM, SD, 0.5));
  }
  px(31, 45, SH);
  px(32, 45, SH);

  const LASH: Color = f ? [16, 10, 22] : mixc(HO, [16, 10, 22], 0.65),
    WHITE: Color = grit ? [210, 204, 204] : [240, 236, 234],
    PUP: Color = [18, 12, 24],
    IR: Color = grit ? dull(T.eye) : T.eye,
    IL = mixc(IR, [255, 255, 255], 0.4);
  const BR = T.hair === GREY[1] ? HD : mixc(HD, HO, 0.5),
    EV = T.eyes,
    two = EV === 'open',
    sock = f ? mixc(SM, SD, 0.6) : SD;
  for (let x = 22; x <= 29; x++) px(x, 25, EV === 'hooded' ? mixc(SD, SO, 0.45) : sock);
  for (let x = 36; x <= 42; x++) px(x, 25, mixc(SD, SO, EV === 'hooded' ? 0.6 : 0.4));
  if (T.shadow) {
    const es = mixc(SD, [130, 70, 150], 0.45);
    for (let x = 23; x <= 28; x++) px(x, 25, es);
    for (let x = 37; x <= 41; x++) px(x, 25, es);
  }
  for (let x = 23; x <= 28; x++) px(x, 26, LASH);
  px(22, EV === 'sharp' ? 26 : 27, LASH);
  px(23, 27, mixc(WHITE, SD, 0.4));
  px(24, 27, WHITE);
  px(25, 27, IR);
  px(26, 27, PUP);
  px(27, 27, IL);
  px(28, 27, WHITE);
  const lid = EV === 'squint' ? mixc(SD, SO, 0.4) : SD;
  if (two) {
    px(24, 28, mixc(WHITE, SD, 0.3));
    px(25, 28, IR);
    px(26, 28, IR);
    px(27, 28, IR);
    px(28, 28, mixc(WHITE, SD, 0.3));
    for (let x = 24; x <= 27; x++) px(x, 29, SD);
  } else for (let x = 24; x <= 28; x++) px(x, 28, lid);
  for (let x = 37; x <= 41; x++) px(x, 26, LASH);
  px(37, 27, WHITE);
  px(38, 27, IR);
  px(39, 27, PUP);
  px(40, 27, IL);
  px(41, 27, mixc(WHITE, SD, 0.5));
  px(42, EV === 'sharp' ? 26 : 27, LASH);
  if (two) {
    px(37, 28, mixc(WHITE, SD, 0.3));
    px(38, 28, IR);
    px(39, 28, IR);
    px(40, 28, IR);
    for (let x = 37; x <= 40; x++) px(x, 29, mixc(SD, SO, 0.3));
  } else for (let x = 37; x <= 41; x++) px(x, 28, mixc(lid, SO, 0.3));
  if (f) {
    px(22, 25, LASH);
    px(21, 24, LASH);
    px(42, 25, LASH);
  }
  if (EV === 'tired') {
    const by = two ? 30 : 29;
    for (let x = 24; x <= 28; x++) {
      px(x, by, SD);
      px(x, by + 1, mixc(SM, SD, 0.5));
    }
    for (let x = 37; x <= 41; x++) px(x, by, mixc(SD, SO, 0.4));
  }
  if (T.age > 45) {
    px(21, 29, SD);
    px(22, 30, SD);
    if (EV !== 'tired') for (let x = 24; x <= 27; x++) px(x, two ? 30 : 29, mixc(SM, SD, 0.7));
  }
  const brow = (x0: number, x1: number, innerAtEnd: boolean, lift: number) => {
    for (let x = x0; x <= x1; x++) {
      const t = innerAtEnd ? x1 - x : x - x0,
        n = x1 - x0,
        bv = T.brow;
      let dy = 0;
      if (bv === 'stern' || bv === 'heavy') dy = t < 2 ? 1 : t > 5 ? -1 : 0;
      if (bv === 'arch') dy = t < 1 || t >= n ? 0 : -1;
      const y = 24 + dy - lift;
      if (f) {
        px(x, y - (bv === 'flat' ? 1 : 0), BR);
        if (t < 3 && bv !== 'arch') px(x, y - 1, BR);
        continue;
      }
      px(x, y - 1, BR);
      if (!(t > 5 && bv !== 'flat')) px(x, y, BR);
      if (bv === 'heavy' && t < 6) px(x, y - 2, t < 4 ? BR : undefined);
    }
  };
  brow(21, 30, true, 0);
  brow(35, 42, false, T.brow === 'raised' ? 1 : 0);

  const nl = T.nose,
    NS = f ? mixc(SM, SD, 0.65) : SD;
  for (let y = 27; y <= 33 + (nl > 1 ? 1 : 0); y++) {
    px(33, y, SH);
    px(35, y, NS);
  }
  px(36, 33 + (nl > 1 ? 1 : 0), NS);
  px(37, 34 + (nl > 1 ? 1 : 0), SO);
  px(36, 34 + (nl > 1 ? 1 : 0), SM);
  px(35, 33, SH);
  const ny = 36 + (nl > 1 ? 1 : 0);
  for (let x = 32; x <= 36; x++) px(x, ny, SD);
  px(31, ny - 1, NS);
  px(33, ny, SO);
  px(36, ny, SO);
  px(37, ny - 1, SO);
  const LINE = mixc(SO, [96, 30, 44], 0.5),
    LIP = T.lip ? mixc(SM, grit ? dull(T.lip) : T.lip, 0.82) : mixc(SM, [176, 86, 92], f ? 0.62 : 0.5),
    my = 40 + (nl > 1 ? 1 : 0),
    MV = T.mouth;
  const mx0 = MV === 'thin' ? 31 : MV === 'wide' ? 29 : 30,
    mx1 = MV === 'thin' ? 38 : MV === 'wide' ? 40 : 39,
    LH = mixc(LIP, [255, 255, 255], 0.28);
  if (MV === 'grit') {
    for (let x = 31; x <= 38; x++) {
      px(x, my - 1, LINE);
      px(x, my + 1, LINE);
      px(x, my, x % 2 ? [226, 222, 214] : [190, 184, 182]);
    }
    px(30, my, LINE);
    px(39, my, LINE);
  } else for (let x = mx0; x <= mx1; x++) px(x, my, LINE);
  if (MV === 'full') {
    for (let x = 31; x <= 38; x++) {
      px(x, my - 1, mixc(LIP, SO, 0.28));
      px(x, my + 1, LIP);
    }
    for (let x = 32; x <= 37; x++) px(x, my + 2, mixc(LIP, SD, 0.4));
    px(33, my + 1, LH);
    px(34, my + 1, LH);
  } else if (MV === 'thin') for (let x = 33; x <= 36; x++) px(x, my + 1, mixc(LIP, SM, 0.45));
  else if (MV !== 'grit') {
    for (let x = 32; x <= 37; x++) {
      px(x, my - 1, mixc(LIP, SD, 0.5));
      px(x, my + 1, LIP);
    }
    px(33, my + 1, LH);
  }
  for (let x = 32; x <= 37; x++) px(x, my + (MV === 'full' ? 4 : 3), SD);
  if (MV === 'smirk') {
    px(40, my - 1, LINE);
    px(41, my - 2, LINE);
    px(29, my, LINE);
  }
  if (MV === 'down') {
    px(mx0 - 1, my + 1, LINE);
    px(mx1 + 1, my + 1, LINE);
  }
  if (MV === 'smile') {
    px(mx0 - 1, my - 1, LINE);
    px(mx1 + 1, my - 1, LINE);
    px(mx1 + 2, my - 2, mixc(SD, SO, 0.4));
  }
  if (T.age > 50) {
    seg(29, ny, 28, my, SD);
    seg(39, ny, 40, my - 1, mixc(SD, SO, 0.4));
    for (let x = 23; x <= 38; x++) if (x % 6 !== 2) px(x, 20, mixc(SM, SD, 0.7));
  }
  if (T.age > 60) for (let x = 24; x <= 36; x++) if (x % 5 !== 0) px(x, 18, mixc(SM, SD, 0.6));

  const mouthBox: Inside = (x, y) => x >= 31 && x <= 38 && y >= my - 1 && y <= my + 1;
  const fullM = poly(BEARDS.full.polys[0]),
    bshade: Shade = (x, y) => (x >= 39 ? HD : (x + y * 2) % 6 === 0 ? HL : HM);
  const shape: BeardShape | undefined = f ? undefined : BEARDS[T.beard];
  if (!f && (T.beard === 'stubble' || T.beard === 'shadow')) {
    for (let y = 30; y < 50; y++)
      for (let x = 16; x < 46; x++)
        if (
          fullM(x, y) &&
          inHead(x, y) &&
          !mouthBox(x, y) &&
          (T.beard === 'stubble' ? (x + y) % 2 === 0 : (x + y * 2) % 3 === 0)
        )
          px(x, y, mixc(im.get(x, y), HM, T.beard === 'stubble' ? 0.4 : 0.3));
  } else if (shape?.strap)
    layer(
      (x, y) =>
        inHead(x, y) &&
        y >= 32 &&
        x <= 43 &&
        (!inHead(x - 2, y) || !inHead(x, y + 2) || !inHead(x + 2, y + 1)),
      bshade,
      HO
    );
  else if (shape?.polys) {
    const fs = shape.polys.map(poly);
    layer(
      (x, y) =>
        fs.some((q) => q(x, y)) &&
        (inHead(x, y) || (!!shape.over && y >= 45)) &&
        !(shape.gap && mouthBox(x, y)),
      bshade,
      HO
    );
  }

  const fronts = (HS.front ?? []).map(poly);
  if (fronts.length || HS.discs)
    layer((x, y) => capOk(y) && (fronts.some((q) => q(x, y)) || discIn(HS.discs, x, y)), shadeH, HO);
  for (const b of HS.buzz ?? []) {
    const q = poly(b);
    layer(
      (x, y) => capOk(y) && q(x, y),
      () => mixc(SM, HM, 0.55),
      HS.front ? null : mixc(SD, HD, 0.55)
    );
  }
  if (!T.cap) for (const [a, b, c, d] of HS.lines ?? []) seg(a, b, c, d, HD);
  if (HS.afro) {
    const hl = (x: number) => (x < 25 ? 22 - (x - 19) : x < 34 ? 16 - (x - 25) * 0.2 : 14 + (x - 34) * 0.5);
    layer(
      (x, y) =>
        capOk(y) &&
        Math.hypot(x - 29, y - 15) <= 16 &&
        y <= 29 &&
        !(inHead(x, y) && y > hl(x)) &&
        (inHead(x, y) || y <= 27),
      shadeH,
      HO
    );
  }
  if (HS.shine && !T.cap) {
    px(25, 12, SH);
    px(26, 12, SH);
    px(27, 12, SH);
    px(24, 13, SH);
  }
  if (HS.braid)
    for (let i = 0; i < 6; i++) {
      const cx = 16.5 + (i % 2),
        cy = 38.5 + i * 4;
      layer(
        (x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 2.8,
        (x, y) => (x + 0.5 < cx - 0.5 ? HD : y + 0.5 < cy ? HL : HM),
        HO
      );
    }

  if (T.cap) {
    const CW = tone(CAP_WHITE),
      CB = tone(CAP_BAND);
    layer(
      poly([
        [13, 14],
        [16, 5],
        [30, 2],
        [45, 4],
        [50, 10],
        [49, 15]
      ]),
      (x, y) => (y <= 7 && x < 32 ? CW[0] : x >= 43 ? CW[2] : CW[1]),
      CW[3]
    );
    layer(
      poly([
        [14, 14],
        [49, 15],
        [48, 19],
        [15, 19]
      ]),
      (x) => (x >= 42 ? CB[2] : CB[1]),
      CB[3]
    );
    layer(
      poly([
        [26, 19],
        [48, 19],
        [54, 22],
        [52, 24],
        [29, 23]
      ]),
      (_x, y) => (y === 20 ? CB[0] : CB[1]),
      CB[3]
    );
    for (const [x, y] of [
      [35, 15],
      [36, 15],
      [35, 16],
      [36, 16],
      [34, 16],
      [37, 16],
      [35, 17],
      [36, 17]
    ] as const)
      px(x, y, G[1]);
    px(35, 15, G[0]);
    for (let y = 23; y <= 25; y++)
      for (let x = 20; x <= 44; x++)
        if (inHead(x, y)) px(x, y, mixc(im.get(x, y), [10, 8, 24], y === 23 ? 0.5 : 0.28));
  }

  const TEAL: Color = [95, 230, 215];
  if (T.gear === 'shades') {
    const D: Color = [20, 18, 36],
      f1 = poly([
        [21, 25],
        [31, 25],
        [31, 29],
        [28, 31],
        [22, 30]
      ]),
      f2 = poly([
        [36, 25],
        [44, 25],
        [44, 29],
        [39, 31],
        [36, 29]
      ]);
    layer(
      (x, y) => f1(x, y) || f2(x, y),
      (x, y) => ((x + y) % 9 === 0 ? [90, 120, 190] : [34, 34, 66]),
      D
    );
    for (let x = 31; x <= 36; x++) px(x, 25, D);
    seg(17, 26, 21, 26, D);
    px(23, 26, [150, 190, 240]);
    px(24, 26, [150, 190, 240]);
    px(38, 26, [150, 190, 240]);
  } else if (T.gear === 'patch') {
    const D: Color = [20, 18, 36];
    layer(
      poly([
        [36, 24],
        [44, 24],
        [44, 30],
        [38, 31],
        [36, 29]
      ]),
      () => [36, 34, 58],
      D
    );
    seg(36, 24, 19, 18, D);
    seg(44, 24, 45, 22, D);
  } else if (T.gear === 'implant') {
    px(19, 21, [60, 60, 86]);
    px(20, 21, [60, 60, 86]);
    px(19, 22, TEAL);
    px(20, 22, [60, 60, 86]);
    px(19, 23, [60, 60, 86]);
    seg(20, 23, 21, 24, [60, 60, 86]);
    px(38, 27, TEAL);
    px(40, 27, mixc(TEAL, [255, 255, 255], 0.5));
  } else if (T.gear === 'headset') {
    const D: Color = [26, 24, 44];
    layer(
      poly([
        [13, 27],
        [17, 26],
        [18, 33],
        [14, 34]
      ]),
      () => [50, 50, 78],
      D
    );
    seg(17, 33, 27, 42, D);
    px(28, 42, D);
    px(29, 42, TEAL);
    px(15, 29, TEAL);
  } else if (T.gear === 'scar') {
    const c = mixc(SH, [236, 150, 150], 0.5);
    for (const y of [20, 21, 22, 23, 24, 29, 30, 31, 32]) px(26 - (y > 26 ? 1 : 0), y, c);
  }

  const isChar = (x: number, y: number) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    const i = (y * W + x) * 4;
    return im.d[i] !== bg[i] || im.d[i + 1] !== bg[i + 1] || im.d[i + 2] !== bg[i + 2];
  };
  const rim: [number, number][] = [];
  for (let y = 2; y < 62; y++)
    for (let x = 20; x < W - 1; x++) if (isChar(x, y) && !isChar(x + 1, y)) rim.push([x, y]);
  for (const [x, y] of rim) px(x, y, mixc(im.get(x, y), [150, 200, 255], grit ? 0.5 : 0.4));
}

export { drawPortrait };
