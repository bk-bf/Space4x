'use strict';
(() => {
  const { ramp, sprite, esc, mixc, strHash } = S4;
  const K = {
    olive: ramp([112, 140, 84]), steel: ramp([124, 134, 170]), sand: ramp([196, 168, 108]), red: ramp([204, 88, 78]), navy: ramp([58, 76, 150]),
    amber: ramp([240, 192, 80]), white: ramp([222, 226, 242]), dark: ramp([76, 76, 108]), teal: ramp([80, 192, 170]), grey: ramp([150, 152, 176]), hot: ramp([230, 90, 80])
  };

  const UNIT = {
    hq(im) {
      im.rect(4, 2, 1, 12, K.steel.l); im.poly([[5, 2], [11, 3.5], [5, 6]], K.red.m); im.rect(5, 2, 6, 1, K.red.l);
      im.poly([[3, 14], [8, 8], [14, 14]], K.olive.m); im.poly([[8, 8], [14, 14], [9, 14]], K.olive.d); im.rect(7, 11, 2, 3, K.dark.d);
      im.rect(2, 14, 13, 1, K.dark.m);
    },
    inf(im) {
      im.disc(7, 4, 2.4, K.olive.m); im.rect(5, 3, 5, 1, K.olive.l); im.rect(6, 5, 3, 1, K.sand.m);
      im.box(5, 7, 5, 5, K.olive); im.rect(5, 12, 2, 3, K.olive.d); im.rect(8, 12, 2, 3, K.olive.d);
      im.rect(10, 7, 1, 7, K.dark.d); im.rect(11, 6, 3, 1, K.dark.d); im.rect(10, 8, 3, 1, K.steel.m);
    },
    tank(im) {
      im.box(2, 9, 12, 4, K.olive); im.rect(1, 12, 14, 3, K.dark.m); for (let x = 2; x < 14; x += 2) im.set(x, 13, K.steel.l);
      im.box(5, 6, 6, 4, K.olive); im.rect(10, 7, 5, 1, K.steel.l); im.rect(10, 8, 5, 1, K.steel.d); im.set(7, 5, K.steel.l);
    },
    art(im) {
      im.line(4, 11, 13, 4, K.steel.l); im.line(4, 12, 13, 5, K.steel.m); im.line(4, 10, 13, 3, K.steel.d);
      im.box(2, 10, 6, 3, K.olive); im.disc(5, 13, 2.2, K.dark.m); im.disc(5, 13, .9, K.steel.l); im.rect(9, 13, 5, 1, K.dark.d); im.rect(13, 12, 1, 2, K.dark.d);
    },
    lveh(im) {
      im.box(2, 8, 12, 4, K.olive); im.rect(4, 6, 6, 2, K.olive.l); im.rect(5, 6, 3, 2, K.glass || [140, 216, 232]);
      im.disc(4, 13, 2.2, K.dark.m); im.disc(12, 13, 2.2, K.dark.m); im.disc(4, 13, .9, K.steel.l); im.disc(12, 13, .9, K.steel.l); im.rect(10, 5, 1, 3, K.steel.l); im.set(10, 4, K.red.m);
    },
    hveh(im) {
      im.box(1, 9, 14, 4, K.olive); im.rect(0, 12, 16, 3, K.dark.m); for (let x = 1; x < 15; x += 2) im.set(x, 13, K.steel.l);
      im.box(3, 5, 9, 5, K.olive); im.box(5, 3, 4, 2, K.olive); im.rect(11, 6, 5, 2, K.steel.l); im.rect(11, 7, 5, 1, K.steel.d); im.set(9, 3, K.red.m);
    },
    bunker(im) {
      im.poly([[1, 14], [3, 8], [13, 8], [15, 14]], K.grey.m); im.rect(1, 14, 14, 1, K.dark.d); im.rect(3, 8, 10, 1, K.grey.l);
      im.rect(5, 10, 6, 2, K.dark.d); im.rect(10, 10, 4, 1, K.steel.l); im.rect(7, 6, 2, 2, K.olive.m); im.set(7, 5, K.red.m);
    },
    aa(im) {
      im.box(3, 11, 10, 3, K.olive); im.rect(7, 9, 2, 2, K.dark.m);
      im.line(5, 9, 3, 2, K.steel.l); im.line(7, 9, 5, 2, K.steel.m); im.line(10, 9, 12, 2, K.steel.l); im.line(12, 9, 14, 2, K.steel.m);
      im.set(3, 1, K.red.h); im.set(5, 1, K.red.m); im.set(12, 1, K.red.h); im.set(14, 1, K.red.m);
    }
  };
  const unitIcon = kind => sprite('u:' + kind, 16, 16, UNIT[kind]);

  const SKIN = [[232, 190, 160], [204, 150, 112], [150, 100, 72], [244, 214, 190]];
  const HAIR = [[40, 30, 30], [110, 70, 40], [190, 170, 150], [20, 20, 28], [150, 60, 40]];
  function faceIcon(seed, pips) {
    return sprite(`f:${seed}:${pips}`, 30, 32, im => {
      const skin = SKIN[seed % 4], hair = HAIR[(seed >> 1) % 5], style = seed % 3, R = ramp(skin), U = K.navy;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 30; x++) im.set(x, y, (x + y) % 7 === 0 ? [44, 38, 92] : y > 16 ? [34, 28, 70] : [30, 26, 62]);
      for (let y = 23; y < 32; y++) { const hw = Math.min(13, 4 + (y - 23) * 2); im.rect(15 - hw, y, hw * 2, 1, (y + hw) % 5 === 0 ? U.l : U.m); im.set(15 - hw, y, U.d); im.set(14 + hw, y, U.d); }
      for (let i = -2; i <= 2; i++) im.set(15 + i, 24 + Math.abs(i), [230, 230, 240]);
      for (let i = 0; i < pips; i++) im.rect(5 + i * 2, 28, 1, 2, [242, 179, 93]);
      im.rect(13, 19, 4, 4, R.d);
      im.ell(15, 13, 6, 7.4, skin);
      im.ell(18, 14, 3, 6, R.l === undefined ? skin : mixc(skin, [90, 60, 60], .12));
      im.ell(15, 7, 6.3, 3.2, hair);
      if (style === 1) { im.rect(8, 8, 2, 11, hair); im.rect(20, 8, 2, 11, hair); }
      if (style === 2) { im.rect(8, 4, 14, 3, [26, 30, 60]); im.rect(7, 7, 16, 1, [14, 14, 26]); im.rect(14, 4, 2, 1, [242, 179, 93]); }
      im.rect(12, 12, 1, 1, [30, 26, 40]); im.rect(18, 12, 1, 1, [30, 26, 40]);
      im.rect(11, 10, 3, 1, hair); im.rect(17, 10, 3, 1, hair);
      im.rect(13, 17, 4, 1, mixc(skin, [150, 70, 70], .55));
      im.rect(15, 14, 1, 2, R.d);
    }, false);
  }

  function starIcon(color, radius) {
    return sprite(`s:${color}:${radius}`, 16, 16, im => {
      const R = ramp(color), r = Math.min(5.5, radius * .9 + 1.4);
      im.disc(8, 8, r + 2.4, mixc(color, [20, 16, 44], .86));
      im.disc(8, 8, r + 1.4, mixc(color, [20, 16, 44], .66));
      im.sphere(8, 8, r, R);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = Math.round(r) + 2; k < 8; k++) if (k < r + 3 + radius) im.set(8 + dx * k, 8 + dy * k, mixc(color, [20, 16, 44], .35 + (k - r) * .15));
    }, false);
  }

  const SHIP = {
    cruiser(im, C) {
      im.poly([[1, 8], [5, 5], [26, 4.6], [30, 8], [26, 11.4], [5, 11]], C.m); im.rect(5, 5, 22, 1, C.l); im.rect(5, 10, 22, 1, C.d);
      im.rect(12, 2, 6, 3, C.l); im.rect(13, 1, 4, 1, C.m); im.rect(1, 7, 3, 2, C.h); im.rect(27, 6, 2, 1, C.d); im.rect(27, 9, 2, 1, C.d);
      im.rect(30, 7, 1, 2, [255, 170, 90]);
    },
    escort(im, C) {
      im.poly([[4, 8], [9, 6], [24, 6.6], [28, 8], [24, 9.4], [9, 10]], C.m); im.rect(9, 6, 15, 1, C.l); im.rect(9, 9, 15, 1, C.d);
      im.rect(17, 4, 3, 2, C.l); im.rect(4, 7, 3, 2, C.h); im.rect(28, 7, 1, 2, [255, 170, 90]);
    },
    freighter(im, C) {
      im.box(3, 5, 6, 6, C); im.box(10, 6, 5, 4, C); im.box(16, 6, 5, 4, C); im.box(22, 6, 4, 4, C); im.rect(9, 7, 20, 2, C.d);
      im.rect(26, 5, 4, 6, C.m); im.rect(27, 6, 2, 1, [140, 216, 232]); im.rect(1, 7, 2, 2, [255, 170, 90]);
    },
    unknown(im, C) {
      im.poly([[3, 8], [9, 4], [20, 5], [29, 8], [20, 11], [9, 12]], C.d); im.rect(10, 6, 12, 1, C.m);
      im.text('?', 14, 6, [255, 210, 200]);
    }
  };
  const shipIcon = (type, hostile) => sprite(`sh:${type}:${hostile ? 1 : 0}`, 32, 16, im => SHIP[type](im, hostile ? K.hot : K.grey));

  const FORM = sprite('fm', 16, 16, im => {
    im.rect(3, 2, 1, 13, K.steel.l); im.poly([[4, 2], [14, 2], [12, 5], [14, 8], [4, 8]], K.navy.m); im.rect(4, 2, 10, 1, K.navy.l); im.set(8, 5, [242, 179, 93]); im.rect(7, 4, 3, 1, [242, 179, 93]);
  });

  const ui = (kind, s = 2, tip = '') => `<img class="px" src="${unitIcon(kind)}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${esc(tip)}">`;
  const fi = (seed, pips, s = 2, tip = '') => `<img class="px" src="${faceIcon(seed, pips)}" width="${30 * s}" height="${32 * s}" alt="" data-tip="${esc(tip)}">`;
  const si = (color, radius, s = 2, tip = '') => `<img class="px" src="${starIcon(color, radius)}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${esc(tip)}">`;
  const shi = (type, hostile, s = 2, tip = '') => `<img class="px" src="${shipIcon(type, hostile)}" width="${32 * s}" height="${16 * s}" alt="" data-tip="${esc(tip)}">`;
  const fmi = (s = 2, tip = '') => `<img class="px" src="${FORM}" width="${16 * s}" height="${16 * s}" alt="" data-tip="${esc(tip)}">`;

  Object.assign(S4, { ui, fi, si, shi, fmi });
})();
