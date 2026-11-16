'use strict';
(() => {
  const { mixc, sprite, Img, esc } = S4;
  const W = 64, H = 72;
  const SKIN = [
    [[255, 232, 214], [244, 206, 180], [206, 152, 134], [140, 88, 88]], [[250, 214, 184], [232, 184, 150], [190, 132, 110], [124, 76, 74]],
    [[236, 190, 150], [212, 158, 116], [166, 110, 84], [106, 64, 60]], [[204, 150, 108], [174, 116, 78], [130, 80, 58], [80, 48, 46]],
    [[164, 112, 80], [132, 84, 58], [96, 58, 46], [58, 34, 36]], [[124, 86, 66], [96, 62, 48], [68, 42, 38], [40, 24, 30]]
  ];
  const HAIR = [
    [[78, 74, 104], [42, 38, 60], [26, 22, 40], [14, 10, 24]], [[118, 82, 62], [82, 54, 44], [56, 36, 36], [32, 20, 28]], [[160, 112, 72], [122, 80, 52], [86, 54, 42], [50, 30, 30]],
    [[204, 110, 70], [166, 76, 50], [118, 50, 44], [70, 28, 34]], [[246, 220, 140], [220, 184, 104], [174, 134, 78], [112, 80, 56]], [[240, 150, 80], [208, 112, 56], [156, 76, 46], [94, 44, 36]]
  ];
  const GREY = [[[214, 216, 226], [170, 172, 188], [122, 124, 146], [74, 74, 98]], [[248, 248, 252], [220, 222, 234], [170, 174, 196], [108, 110, 138]]];
  const EYE = [[120, 74, 44], [64, 44, 40], [84, 140, 212], [92, 160, 110], [140, 152, 170], [160, 124, 60], [214, 150, 50], [150, 200, 240], [56, 110, 80], [150, 110, 210]];
  const BG = [[[18, 16, 44], [30, 26, 66], [48, 42, 100]], [[14, 24, 44], [24, 40, 66], [38, 64, 96]], [[30, 16, 44], [48, 28, 64], [74, 44, 92]], [[14, 28, 34], [24, 46, 52], [40, 72, 78]]];
  const UNIFORM = { staff: [[84, 104, 176], [48, 62, 124], [30, 40, 86], [16, 20, 48]], ground: [[128, 142, 96], [88, 102, 66], [58, 70, 48], [30, 38, 32]], governor: [[108, 108, 134], [70, 70, 96], [46, 46, 68], [24, 24, 40]] };
  const GOLD = [[255, 226, 150], [242, 184, 92], [176, 120, 52]];
  const CROP = [[16, 22], [17, 14], [22, 8], [31, 6], [40, 7], [45, 12], [46, 18], [44, 16], [39, 13], [31, 13], [25, 15], [22, 20], [21, 25], [18, 26]];
  const TIGHT = [[16, 22], [17, 13], [23, 8], [31, 7], [40, 8], [45, 13], [45, 17], [42, 15], [37, 13], [30, 13], [24, 15], [21, 21], [19, 25]];
  const LONGF = [[15, 26], [15, 14], [21, 7], [31, 5], [41, 6], [46, 12], [47, 19], [44, 17], [39, 13], [33, 11], [27, 13], [23, 18], [21, 27], [19, 34], [16, 34]];
  const LONGB = [[[12, 16], [18, 10], [21, 30], [22, 44], [21, 57], [8, 59], [7, 36]], [[44, 15], [48, 24], [49, 40], [47, 52], [42, 52], [43, 40], [45, 30]]];
  const HAIRS = {
    crop: { g: 'm', name: 'Crop', front: [CROP] },
    buzz: { g: 'mf', name: 'Buzz cut', buzz: [[[17, 21], [18, 14], [23, 9], [31, 8], [39, 9], [44, 13], [45, 17], [43, 16], [38, 13], [31, 13], [25, 15], [22, 20], [20, 24], [18, 24]]] },
    spiky: { g: 'm', name: 'Spiky', front: [[[16, 22], [17, 14], [20, 9], [22, 5], [25, 8], [28, 3], [31, 7], [34, 2], [37, 6], [40, 3], [42, 8], [46, 8], [45, 13], [46, 18], [44, 16], [39, 13], [31, 13], [25, 15], [22, 20], [21, 25], [18, 26]]] },
    quiff: { g: 'm', name: 'Quiff', front: [[[16, 22], [17, 14], [21, 8], [28, 4], [36, 1], [44, 2], [49, 7], [48, 13], [46, 17], [44, 14], [40, 12], [33, 12], [26, 14], [22, 19], [21, 25], [18, 26]]] },
    part: { g: 'mf', name: 'Side part', front: [[[16, 23], [16, 14], [21, 7], [31, 5], [41, 6], [46, 11], [47, 19], [45, 21], [42, 17], [36, 14], [29, 15], [24, 13], [22, 19], [21, 25], [18, 27]]], lines: [[25, 7, 24, 13]] },
    undercut: { g: 'mf', name: 'Undercut', front: [[[19, 16], [21, 8], [30, 4], [41, 5], [47, 11], [46, 17], [43, 15], [38, 12], [31, 12], [25, 14], [22, 18]]], buzz: [[[17, 16], [21, 16], [22, 21], [21, 26], [17, 26]]] },
    slick: { g: 'm', name: 'Slicked back', front: [[[16, 24], [16, 14], [21, 7], [31, 5], [41, 6], [46, 12], [46, 17], [43, 14], [37, 11], [30, 11], [24, 13], [21, 18], [20, 26], [17, 28]]], back: [[[13, 18], [18, 13], [19, 30], [21, 37], [15, 39], [12, 30]]] },
    mohawk: { g: 'm', name: 'Mohawk', front: [[[24, 12], [25, 5], [31, 2], [38, 3], [42, 7], [43, 13], [39, 11], [32, 10], [27, 11]]], buzz: [[[17, 20], [18, 14], [22, 10], [25, 10], [25, 14], [22, 19], [21, 25], [18, 25]], [[40, 11], [44, 14], [45, 18], [42, 15]]] },
    receding: { g: 'm', name: 'Receding', front: [[[16, 22], [17, 14], [22, 8], [31, 6], [40, 7], [45, 12], [46, 17], [44, 14], [40, 10], [34, 9], [29, 10], [27, 13], [24, 12], [22, 18], [21, 25], [18, 26]]] },
    horseshoe: { g: 'm', name: 'Bald on top', front: [[[16, 25], [16, 17], [18, 15], [21, 18], [21, 26], [18, 28]], [[44, 16], [46, 18], [46, 22], [44, 20]]], shine: true },
    bald: { g: 'm', name: 'Bald', shine: true },
    curls: { g: 'mf', name: 'Short curls', front: [CROP], discs: [[18, 16, 3.2], [20, 11, 3.2], [24, 8, 3.2], [29, 6, 3.2], [34, 6, 3.2], [39, 7, 3.2], [43, 10, 3.2], [45, 14, 3], [18, 21, 3], [46, 18, 2.4]], curly: true },
    afro: { g: 'mf', name: 'Afro', afro: true, curly: true },
    pixie: { g: 'f', name: 'Pixie', front: [[[15, 25], [15, 14], [20, 7], [30, 5], [40, 6], [46, 11], [47, 17], [44, 18], [41, 15], [35, 14], [30, 17], [25, 15], [22, 21], [21, 28], [17, 30]]] },
    bob: { g: 'f', name: 'Bob', front: [[[15, 24], [15, 14], [20, 7], [30, 5], [41, 6], [47, 12], [48, 19], [45, 19], [43, 16], [37, 14], [30, 15], [25, 15], [22, 19], [21, 27], [20, 40], [15, 42], [13, 32]]], back: [[[45, 13], [49, 20], [50, 38], [46, 42], [44, 36], [45, 28]], [[11, 20], [17, 12], [20, 41], [13, 43]]] },
    long: { g: 'f', name: 'Long', front: [LONGF], back: LONGB },
    wavy: { g: 'f', name: 'Long wavy', front: [LONGF], back: LONGB, backDiscs: [[8, 28, 3], [7, 38, 3], [8, 48, 3], [9, 56, 3], [49, 28, 2.6], [50, 38, 2.6], [48, 48, 2.6]], curly: true },
    tail: { g: 'mf', name: 'Ponytail', front: [TIGHT], back: [[[10, 15], [15, 13], [18, 17], [18, 24], [14, 26], [10, 22]], [[9, 22], [14, 23], [14, 34], [12, 46], [8, 44], [8, 30]]] },
    bun: { g: 'f', name: 'Bun', front: [TIGHT], backDiscs: [[15, 10, 5.2]] },
    braid: { g: 'f', name: 'Braid', front: [TIGHT], braid: true },
    locs: { g: 'mf', name: 'Locs', front: [LONGF], back: LONGB, locs: true }
  };
  const BEARDS = {
    none: { name: 'Clean shaven' }, shadow: { name: 'Five o\'clock shadow' }, stubble: { name: 'Stubble' },
    mustache: { name: 'Moustache', polys: [[[30, 37.5], [35, 37], [40, 37.5], [41, 40], [36, 39], [31, 40]]] },
    handlebar: { name: 'Handlebar', polys: [[[29, 37.5], [35, 37], [41, 37.5], [43, 36], [44, 38.5], [41, 41], [36, 39], [31, 41], [28, 39.5], [27, 37]]] },
    soul: { name: 'Soul patch', polys: [[[34, 42.5], [37, 42.5], [36.5, 46], [34.5, 46]]] },
    goatee: { name: 'Goatee', polys: [[[30, 37.5], [39, 37.5], [40, 43], [38, 48], [32, 48], [30, 44]]], gap: true },
    vandyke: { name: 'Van Dyke', polys: [[[30, 37.5], [35, 37], [40, 37.5], [41, 40], [36, 39], [31, 40]], [[32, 43.5], [38, 43.5], [37, 50], [33, 50]]] },
    chops: { name: 'Mutton chops', polys: [[[18, 30], [22, 33], [27, 38], [29, 43], [24, 44], [20, 39]]] },
    chinstrap: { name: 'Chin strap', strap: true },
    full: { name: 'Full beard', polys: [[[19, 33], [22, 36], [27, 38], [30, 37], [34, 37.5], [40, 37], [44, 35], [43, 41], [40, 46], [36, 49], [31, 49], [26, 47], [21, 43], [19, 38]]], gap: true },
    long: { name: 'Long beard', polys: [[[19, 33], [22, 36], [27, 38], [30, 37], [34, 37.5], [40, 37], [44, 35], [43, 41], [41, 48], [39, 55], [34, 59], [29, 56], [25, 49], [21, 43], [19, 38]]], gap: true, over: true }
  };
  const EYES = { narrow: 'Narrow', open: 'Open', hooded: 'Hooded', sharp: 'Sharp', squint: 'Squint', tired: 'Tired' };
  const MOUTHS = { firm: 'Firm', thin: 'Thin', wide: 'Wide', smirk: 'Smirk', down: 'Downturned', smile: 'Smile', grit: 'Gritted teeth', full: 'Full lips' };
  const BROWS = { stern: 'Stern', flat: 'Flat', raised: 'One raised', arch: 'Arched', heavy: 'Heavy' };
  const byG = g => Object.keys(HAIRS).filter(k => HAIRS[k].g.includes(g));

  function rng(seed) { let a = (seed * 2654435761 + 977) >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function pip(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  const poly = pts => (x, y) => pip(pts, x + .5, y + .5);

  function traits(seed, age, rank, gender) {
    const r = rng(seed), f = gender === 'f', grey = Math.max(0, Math.min(1, (age - 40) / 26));
    const T = { gender: f ? 'f' : 'm', skin: SKIN[Math.floor(r() * 6)], eye: EYE[Math.floor(r() * (r() < .12 ? 10 : 7))], bg: pick(r, BG), age, rank };
    T.hair = r() < grey ? (age > 60 && r() < .6 ? GREY[1] : GREY[0]) : pick(r, HAIR);
    T.style = pick(r, byG(T.gender).filter(k => !['bald', 'horseshoe', 'receding'].includes(k)));
    if (!f && r() < (age > 50 ? .4 : .08)) T.style = pick(r, ['bald', 'horseshoe', 'receding']);
    T.jaw = Math.floor(r() * 3);
    T.eyes = pick(r, f ? ['open', 'open', 'narrow', 'sharp', 'hooded'] : ['narrow', 'narrow', 'open', 'hooded', 'sharp', 'squint']);
    if (age > 55 && r() < .4) T.eyes = 'tired';
    T.brow = pick(r, f ? ['arch', 'arch', 'stern', 'raised', 'flat'] : ['stern', 'stern', 'flat', 'raised', 'heavy']);
    T.nose = Math.floor(r() * (f ? 2 : 3));
    T.mouth = pick(r, f ? ['full', 'full', 'firm', 'smirk', 'smile', 'thin'] : ['firm', 'firm', 'smirk', 'down', 'thin', 'wide', 'grit']);
    T.lip = f ? pick(r, [null, null, [190, 50, 70], [150, 56, 96], [214, 104, 90]]) : null;
    T.gaunt = r() < (f ? .15 : .45);
    T.beard = f ? 'none' : pick(r, ['none', 'none', 'none', 'none', 'shadow', 'stubble', 'stubble', 'mustache', 'handlebar', 'soul', 'goatee', 'vandyke', 'chops', 'chinstrap', 'full', 'full', 'long']);
    T.gear = pick(r, ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'shades', 'patch', 'implant', 'headset', 'scar', 'scar']);
    T.cap = rank >= 2 && r() < .3;
    T.jag = Math.floor(r() * 3);
    T.earring = f && r() < .4;
    T.shadow = f && r() < .3;
    return T;
  }

  const dull = c => mixc(c, [64, 60, 82], .22).map(v => v * .9);
  function draw(im, T, branch, grit) {
    const tone = a => (grit ? a.map(dull) : a);
    const [SH, SM, SD, SO] = tone(T.skin), [HL, HM, HD, HO] = tone(T.hair), U = tone(UNIFORM[branch] || UNIFORM.staff), B = tone(T.bg), G = tone(GOLD);
    const px = (x, y, c) => im.set(x, y, c);
    const layer = (inside, shade, outline) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inside(x, y)) continue; const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1); im.set(x, y, edge && outline ? outline : shade(x, y)); } };
    const seg = (x0, y0, x1, y1, c) => im.line(x0, y0, x1, y1, c);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 22, y - 26); px(x, y, d < 17 ? B[2] : d < 27 ? B[1] : B[0]); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + y * 2) % 23 === 0 && Math.hypot(x - 22, y - 26) >= 27) px(x, y, mixc(B[0], B[1], .6));
    const bg = new Uint8ClampedArray(im.d);

    const f = T.gender === 'f', st = T.style, HS = HAIRS[st] || {};
    const jx = (f ? 23 : 21) + (2 - T.jaw) * (f ? .5 : 1), sq = !f && T.jaw === 0 ? 1 : 0;
    const HEAD = f
      ? [[25, 10], [31, 9], [38, 10], [43, 14], [45, 20], [45, 24], [44, 27], [45, 30], [44, 34], [42, 40], [39, 45], [35, 48], [32, 48], [28, 46], [jx, 42], [20, 37], [18, 30], [17, 24], [17, 18], [20, 13]]
      : [[25, 10], [31, 9], [38, 10], [43, 14], [45, 20], [45, 24], [44, 27], [45, 30], [45, 34], [43, 40], [40, 45], [36 + sq, 48], [32, 48.4], [27 - sq, 46], [jx, 42], [19, 37], [18, 30], [17, 24], [17, 18], [20, 13]];
    const inHead = poly(HEAD);
    const hairShade = (x, y) => { const e = ((x - 27) / 10) ** 2 + ((y - 9) / 4) ** 2; if (e < 1 && e > .3 && y <= 11) return HL; if ((x + T.jag) % 5 === 0 && y < 14 && x > 22 && x < 42) return HL; if (x >= 42 || x <= 15 || (y > 26 && (x + T.jag) % 3 === 0)) return HD; return HM; };
    const shadeH = (x, y) => (HS.curly && (x * 3 + y * 5 + T.jag) % 7 === 0 ? HD : HS.locs && y > 15 && x % 2 === 0 ? HD : hairShade(x, y));
    const capOk = y => !T.cap || y >= 19;
    const discIn = (ds, x, y) => !!ds && ds.some(([a, b, r]) => Math.hypot(x + .5 - a, y + .5 - b) <= r);

    const backs = (HS.back || []).map(poly);
    if (backs.length || HS.backDiscs) layer((x, y) => capOk(y) && (backs.some(q => q(x, y)) || discIn(HS.backDiscs, x, y)), shadeH, HO);
    if (HS.afro) layer((x, y) => capOk(y) && Math.hypot(x - 29, y - 15) <= 16 && y <= 29, shadeH, HO);

    layer(poly([[0, 72], [2, 62], [12, 56], [21, 52], [42, 52], [52, 55], [61, 61], [64, 72]]), (x, y) => { if (y <= 57 + (x - 12) * -.1 && x < 22 && y < 60) return U[0]; if (x >= 46) return U[2]; if ((x - y * .5) % 9 < 1 && y > 60) return U[2]; return U[1]; }, U[3]);
    seg(33, 56, 36, 71, U[3]); seg(34, 56, 37, 71, U[2]);
    for (const y of [60, 64, 68]) px(32 + Math.floor((y - 56) / 5), y, G[1]);
    layer(poly([[5, 59], [17, 54], [20, 57], [8, 62]]), (x, y) => (y < 57 ? G[0] : G[1]), G[2]);
    layer(poly([[46, 55], [56, 59], [55, 61], [45, 58]]), () => G[1], G[2]);
    for (let i = 0; i <= Math.min(4, T.rank); i++) { px(9 + i * 2, 58 - Math.floor(i * .8), U[3]); }
    const rb = [[214, 80, 76], [90, 160, 226], [246, 196, 96], [100, 196, 130], [236, 236, 246], [170, 110, 220]];
    for (let i = 0; i < Math.min(6, T.rank + 1); i++) { const x = 41 + (i % 3) * 3, y = 63 + Math.floor(i / 3) * 2; px(x, y, rb[i]); px(x + 1, y, rb[i]); }

    layer(poly(f ? [[23, 40], [23, 55], [39, 55], [39, 44]] : [[22, 40], [21, 55], [41, 55], [40, 44]]), (x, y) => (x <= 25 && y > 45 ? SM : SD), SO);
    layer(poly([[18, 54], [21, 47], [27, 51], [33, 57], [30, 59]]), (x, y) => (y < 51 ? U[0] : U[1]), U[3]);
    layer(poly([[43, 54], [41, 48], [37, 52], [33, 57], [37, 59]]), () => U[2], U[3]);
    seg(21, 48, 26, 51, G[1]); px(24, 53, G[0]); if (T.rank >= 3) px(27, 55, G[0]);

    layer(poly([[14, 27], [18, 25], [20, 34], [16, 36], [13, 31]]), (x, y) => (x >= 16 && y > 28 && y < 33 ? SD : SM), SO);
    if (T.earring) { px(16, 37, G[0]); px(16, 38, G[1]); }

    layer(inHead, (x, y) => {
      if (x >= 43) return mixc(SD, SO, .45);
      if ((x >= 38 + (y - 26) * .1 && y >= 29) || (x >= 41 && y < 26) || (y >= 44 && x < 30) || (y >= 46)) return SD;
      if (((x - 26) / 6) ** 2 + ((y - 16) / 3.4) ** 2 < 1 || ((x - 23) / 3.4) ** 2 + ((y - 32) / 1.8) ** 2 < 1) return SH;
      return SM;
    }, SO);
    for (let i = 0; i < 8; i++) { const x = 20 + i, y = 37 + Math.floor(i * .45); px(x, y, T.gaunt ? SD : mixc(SM, SD, f ? .3 : .5)); if (T.gaunt) px(x, y + 1, mixc(SM, SD, .5)); }
    px(31, 45, SH); px(32, 45, SH);

    const LASH = f ? [16, 10, 22] : mixc(HO, [16, 10, 22], .65), WHITE = grit ? [210, 204, 204] : [240, 236, 234], PUP = [18, 12, 24], IR = grit ? dull(T.eye) : T.eye, IL = mixc(IR, [255, 255, 255], .4);
    const BR = T.hair === GREY[1] ? HD : mixc(HD, HO, .5), EV = T.eyes, two = EV === 'open', sock = f ? mixc(SM, SD, .6) : SD;
    for (let x = 22; x <= 29; x++) px(x, 25, EV === 'hooded' ? mixc(SD, SO, .45) : sock);
    for (let x = 36; x <= 42; x++) px(x, 25, mixc(SD, SO, EV === 'hooded' ? .6 : .4));
    if (T.shadow) { const es = mixc(SD, [130, 70, 150], .45); for (let x = 23; x <= 28; x++) px(x, 25, es); for (let x = 37; x <= 41; x++) px(x, 25, es); }
    for (let x = 23; x <= 28; x++) px(x, 26, LASH);
    px(22, EV === 'sharp' ? 26 : 27, LASH); px(23, 27, mixc(WHITE, SD, .4)); px(24, 27, WHITE); px(25, 27, IR); px(26, 27, PUP); px(27, 27, IL); px(28, 27, WHITE);
    const lid = EV === 'squint' ? mixc(SD, SO, .4) : SD;
    if (two) { px(24, 28, mixc(WHITE, SD, .3)); px(25, 28, IR); px(26, 28, IR); px(27, 28, IR); px(28, 28, mixc(WHITE, SD, .3)); for (let x = 24; x <= 27; x++) px(x, 29, SD); }
    else for (let x = 24; x <= 28; x++) px(x, 28, lid);
    for (let x = 37; x <= 41; x++) px(x, 26, LASH);
    px(37, 27, WHITE); px(38, 27, IR); px(39, 27, PUP); px(40, 27, IL); px(41, 27, mixc(WHITE, SD, .5)); px(42, EV === 'sharp' ? 26 : 27, LASH);
    if (two) { px(37, 28, mixc(WHITE, SD, .3)); px(38, 28, IR); px(39, 28, IR); px(40, 28, IR); for (let x = 37; x <= 40; x++) px(x, 29, mixc(SD, SO, .3)); }
    else for (let x = 37; x <= 41; x++) px(x, 28, mixc(lid, SO, .3));
    if (f) { px(22, 25, LASH); px(21, 24, LASH); px(42, 25, LASH); }
    if (EV === 'tired') { const by = two ? 30 : 29; for (let x = 24; x <= 28; x++) { px(x, by, SD); px(x, by + 1, mixc(SM, SD, .5)); } for (let x = 37; x <= 41; x++) px(x, by, mixc(SD, SO, .4)); }
    if (T.age > 45) { px(21, 29, SD); px(22, 30, SD); if (EV !== 'tired') for (let x = 24; x <= 27; x++) px(x, two ? 30 : 29, mixc(SM, SD, .7)); }
    const brow = (x0, x1, innerAtEnd, lift) => {
      for (let x = x0; x <= x1; x++) {
        const t = innerAtEnd ? (x1 - x) : (x - x0), n = x1 - x0, bv = T.brow;
        let dy = 0;
        if (bv === 'stern' || bv === 'heavy') dy = t < 2 ? 1 : t > 5 ? -1 : 0;
        if (bv === 'arch') dy = t < 1 || t >= n ? 0 : -1;
        const y = 24 + dy - lift;
        if (f) { px(x, y - (bv === 'flat' ? 1 : 0), BR); if (t < 3 && bv !== 'arch') px(x, y - 1, BR); continue; }
        px(x, y - 1, BR); if (!(t > 5 && bv !== 'flat')) px(x, y, BR);
        if (bv === 'heavy' && t < 6) px(x, y - 2, t < 4 ? BR : null);
      }
    };
    brow(21, 30, true, 0); brow(35, 42, false, T.brow === 'raised' ? 1 : 0);

    const nl = T.nose, NS = f ? mixc(SM, SD, .65) : SD;
    for (let y = 27; y <= 33 + (nl > 1 ? 1 : 0); y++) { px(33, y, SH); px(35, y, NS); }
    px(36, 33 + (nl > 1 ? 1 : 0), NS); px(37, 34 + (nl > 1 ? 1 : 0), SO); px(36, 34 + (nl > 1 ? 1 : 0), SM); px(35, 33, SH);
    const ny = 36 + (nl > 1 ? 1 : 0);
    for (let x = 32; x <= 36; x++) px(x, ny, SD); px(31, ny - 1, NS); px(33, ny, SO); px(36, ny, SO); px(37, ny - 1, SO);
    const LINE = mixc(SO, [96, 30, 44], .5), LIP = T.lip ? mixc(SM, grit ? dull(T.lip) : T.lip, .82) : mixc(SM, [176, 86, 92], f ? .62 : .5), my = 40 + (nl > 1 ? 1 : 0), MV = T.mouth;
    const mx0 = MV === 'thin' ? 31 : MV === 'wide' ? 29 : 30, mx1 = MV === 'thin' ? 38 : MV === 'wide' ? 40 : 39, LH = mixc(LIP, [255, 255, 255], .28);
    if (MV === 'grit') { for (let x = 31; x <= 38; x++) { px(x, my - 1, LINE); px(x, my + 1, LINE); px(x, my, x % 2 ? [226, 222, 214] : [190, 184, 182]); } px(30, my, LINE); px(39, my, LINE); }
    else for (let x = mx0; x <= mx1; x++) px(x, my, LINE);
    if (MV === 'full') { for (let x = 31; x <= 38; x++) { px(x, my - 1, mixc(LIP, SO, .28)); px(x, my + 1, LIP); } for (let x = 32; x <= 37; x++) px(x, my + 2, mixc(LIP, SD, .4)); px(33, my + 1, LH); px(34, my + 1, LH); }
    else if (MV === 'thin') for (let x = 33; x <= 36; x++) px(x, my + 1, mixc(LIP, SM, .45));
    else if (MV !== 'grit') { for (let x = 32; x <= 37; x++) { px(x, my - 1, mixc(LIP, SD, .5)); px(x, my + 1, LIP); } px(33, my + 1, LH); }
    for (let x = 32; x <= 37; x++) px(x, my + (MV === 'full' ? 4 : 3), SD);
    if (MV === 'smirk') { px(40, my - 1, LINE); px(41, my - 2, LINE); px(29, my, LINE); }
    if (MV === 'down') { px(mx0 - 1, my + 1, LINE); px(mx1 + 1, my + 1, LINE); }
    if (MV === 'smile') { px(mx0 - 1, my - 1, LINE); px(mx1 + 1, my - 1, LINE); px(mx1 + 2, my - 2, mixc(SD, SO, .4)); }
    if (T.age > 50) { seg(29, ny, 28, my, SD); seg(39, ny, 40, my - 1, mixc(SD, SO, .4)); for (let x = 23; x <= 38; x++) if (x % 6 !== 2) px(x, 20, mixc(SM, SD, .7)); }
    if (T.age > 60) for (let x = 24; x <= 36; x++) if (x % 5 !== 0) px(x, 18, mixc(SM, SD, .6));

    const mouthBox = (x, y) => x >= 31 && x <= 38 && y >= my - 1 && y <= my + 1;
    const BD = (!f && BEARDS[T.beard]) || {}, fullM = poly(BEARDS.full.polys[0]), bshade = (x, y) => (x >= 39 ? HD : (x + y * 2) % 6 === 0 ? HL : HM);
    if (!f && (T.beard === 'stubble' || T.beard === 'shadow')) { for (let y = 30; y < 50; y++) for (let x = 16; x < 46; x++) if (fullM(x, y) && inHead(x, y) && !mouthBox(x, y) && (T.beard === 'stubble' ? (x + y) % 2 === 0 : (x + y * 2) % 3 === 0)) px(x, y, mixc(im.get(x, y), HM, T.beard === 'stubble' ? .4 : .3)); }
    else if (BD.strap) layer((x, y) => inHead(x, y) && y >= 32 && x <= 43 && (!inHead(x - 2, y) || !inHead(x, y + 2) || !inHead(x + 2, y + 1)), bshade, HO);
    else if (BD.polys) { const fs = BD.polys.map(poly); layer((x, y) => fs.some(q => q(x, y)) && (inHead(x, y) || (BD.over && y >= 45)) && !(BD.gap && mouthBox(x, y)), bshade, HO); }

    const fronts = (HS.front || []).map(poly);
    if (fronts.length || HS.discs) layer((x, y) => capOk(y) && (fronts.some(q => q(x, y)) || discIn(HS.discs, x, y)), shadeH, HO);
    for (const b of HS.buzz || []) { const q = poly(b); layer((x, y) => capOk(y) && q(x, y), () => mixc(SM, HM, .55), HS.front ? null : mixc(SD, HD, .55)); }
    if (!T.cap) for (const [a, b, c, d] of HS.lines || []) seg(a, b, c, d, HD);
    if (HS.afro) { const hl = x => (x < 25 ? 22 - (x - 19) : x < 34 ? 16 - (x - 25) * .2 : 14 + (x - 34) * .5); layer((x, y) => capOk(y) && Math.hypot(x - 29, y - 15) <= 16 && y <= 29 && !(inHead(x, y) && y > hl(x)) && (inHead(x, y) || y <= 27), shadeH, HO); }
    if (HS.shine && !T.cap) { px(25, 12, SH); px(26, 12, SH); px(27, 12, SH); px(24, 13, SH); }
    if (HS.braid) for (let i = 0; i < 6; i++) { const cx = 16.5 + (i % 2), cy = 38.5 + i * 4; layer((x, y) => Math.hypot(x + .5 - cx, y + .5 - cy) <= 2.8, (x, y) => (x + .5 < cx - .5 ? HD : y + .5 < cy ? HL : HM), HO); }

    if (T.cap) {
      const CW = tone([[236, 238, 246], [204, 208, 226], [154, 158, 188], [66, 68, 98]]), CB = tone([[70, 74, 110], [34, 36, 60], [20, 20, 38], [10, 8, 22]]);
      layer(poly([[13, 14], [16, 5], [30, 2], [45, 4], [50, 10], [49, 15]]), (x, y) => (y <= 7 && x < 32 ? CW[0] : x >= 43 ? CW[2] : CW[1]), CW[3]);
      layer(poly([[14, 14], [49, 15], [48, 19], [15, 19]]), (x) => (x >= 42 ? CB[2] : CB[1]), CB[3]);
      layer(poly([[26, 19], [48, 19], [54, 22], [52, 24], [29, 23]]), (x, y) => (y === 20 ? CB[0] : CB[1]), CB[3]);
      for (const [x, y] of [[35, 15], [36, 15], [35, 16], [36, 16], [34, 16], [37, 16], [35, 17], [36, 17]]) px(x, y, G[1]);
      px(35, 15, G[0]);
      for (let y = 23; y <= 25; y++) for (let x = 20; x <= 44; x++) if (inHead(x, y)) px(x, y, mixc(im.get(x, y), [10, 8, 24], y === 23 ? .5 : .28));
    }

    const TEAL = [95, 230, 215];
    if (T.gear === 'shades') {
      const D = [20, 18, 36], f1 = poly([[21, 25], [31, 25], [31, 29], [28, 31], [22, 30]]), f2 = poly([[36, 25], [44, 25], [44, 29], [39, 31], [36, 29]]);
      layer((x, y) => f1(x, y) || f2(x, y), (x, y) => ((x + y) % 9 === 0 ? [90, 120, 190] : [34, 34, 66]), D);
      for (let x = 31; x <= 36; x++) px(x, 25, D); seg(17, 26, 21, 26, D); px(23, 26, [150, 190, 240]); px(24, 26, [150, 190, 240]); px(38, 26, [150, 190, 240]);
    } else if (T.gear === 'patch') {
      const D = [20, 18, 36]; layer(poly([[36, 24], [44, 24], [44, 30], [38, 31], [36, 29]]), () => [36, 34, 58], D); seg(36, 24, 19, 18, D); seg(44, 24, 45, 22, D);
    } else if (T.gear === 'implant') {
      px(19, 21, [60, 60, 86]); px(20, 21, [60, 60, 86]); px(19, 22, TEAL); px(20, 22, [60, 60, 86]); px(19, 23, [60, 60, 86]); seg(20, 23, 21, 24, [60, 60, 86]); px(38, 27, TEAL); px(40, 27, mixc(TEAL, [255, 255, 255], .5));
    } else if (T.gear === 'headset') {
      const D = [26, 24, 44]; layer(poly([[13, 27], [17, 26], [18, 33], [14, 34]]), () => [50, 50, 78], D); seg(17, 33, 27, 42, D); px(28, 42, D); px(29, 42, TEAL); px(15, 29, TEAL);
    } else if (T.gear === 'scar') {
      const c = mixc(SH, [236, 150, 150], .5); for (const y of [20, 21, 22, 23, 24, 29, 30, 31, 32]) px(26 - (y > 26 ? 1 : 0), y, c);
    }

    const isChar = (x, y) => { if (x < 0 || x >= W || y < 0 || y >= H) return false; const i = (y * W + x) * 4; return im.d[i] !== bg[i] || im.d[i + 1] !== bg[i + 1] || im.d[i + 2] !== bg[i + 2]; };
    const rim = [];
    for (let y = 2; y < 62; y++) for (let x = 20; x < W - 1; x++) if (isChar(x, y) && !isChar(x + 1, y)) rim.push([x, y]);
    for (const [x, y] of rim) { px(x, y, mixc(im.get(x, y), [150, 200, 255], grit ? .5 : .4)); }
  }

  const STYLES_P = [['flat', 'A', 'Clean', 'Full colour.'], ['gritty', 'B', 'Gritty', 'Muted colour, darker.']];
  const cur = { style: 'gritty' };
  const cache = new Map();
  function image(o, style, over) {
    const k = [o.seed, o.age, o.rank, o.branch, o.gender, style, over ? JSON.stringify(over) : ''].join(':');
    if (!cache.has(k)) { const im = new Img(W, H), T = Object.assign(traits(o.seed, o.age, o.rank, o.gender), over || {}); draw(im, T, o.branch, style === 'gritty'); cache.set(k, im); }
    return [k, cache.get(k)];
  }
  const big = (o, st, over) => { const [k, src] = image(o, st, over); return sprite('pb:' + k, W, H, im => { im.d.set(src.d); }, false); };
  const mini = (o, st) => { const [k, src] = image(o, st); return sprite('pm:' + k, 32, 36, im => { for (let y = 0; y < 36; y++) for (let x = 0; x < 32; x++) im.set(x, y, src.get(x + 15, y + 14)); }, false); };
  S4.bigFace = (o, s = 3, tip = '', st = cur.style, over = null) => `<img class="px" src="${big(o, st, over)}" width="${W * s}" height="${H * s}" alt="" data-tip="${esc(tip)}">`;
  S4.miniFace = (o, s = 2, tip = '', st = cur.style) => `<img class="px" src="${mini(o, st)}" width="${32 * s}" height="${36 * s}" alt="" data-tip="${esc(tip)}">`;
  S4.portrait = { cur, STYLES: STYLES_P, HAIRS, BEARDS, EYES, MOUTHS, BROWS, SKIN, HAIR, EYE };
})();
