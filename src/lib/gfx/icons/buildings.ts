import { buildings } from '#lib/game/data/records.ts';
import { mixc, ramp, strHash, type Color, type Pix, type Ramp } from './pixels.ts';
import { sprite, type Sprite } from './sprite.ts';

const G = 17;

const R = {
  conc: ramp([150, 152, 186]),
  steel: ramp([124, 134, 170]),
  white: ramp([222, 226, 242]),
  red: ramp([204, 88, 78]),
  brick: ramp([178, 100, 80]),
  blue: ramp([70, 112, 206]),
  green: ramp([90, 178, 92]),
  amber: ramp([240, 192, 80]),
  teal: ramp([80, 192, 170]),
  dirt: ramp([152, 112, 76]),
  rock: ramp([132, 126, 142]),
  purple: ramp([172, 92, 224]),
  dark: ramp([76, 76, 108]),
  glass: ramp([140, 216, 232]),
  orange: ramp([242, 142, 60]),
  pink: ramp([255, 110, 170]),
  lime: ramp([150, 230, 100]),
  ice: ramp([170, 214, 244])
};

const GLOW: Color = [255, 214, 120];
const LIT: Color = [255, 226, 140];
const DARK: Color = [34, 28, 52];

const wall = (im: Pix, x: number, w: number, h: number, C: Ramp = R.conc, y: number = G - h) =>
  im.box(x, y, w, h, C);
const win = (im: Pix, x: number, y: number, n: number, c: Color = LIT, step = 2) => {
  for (let i = 0; i < n; i++) im.rect(x + i * step, y, 1, 2, c);
};
const silo = (im: Pix, x: number, w: number, h: number, C: Ramp = R.steel) => {
  im.cylV(x, G - h, w, h, C);
  im.rect(x + 1, G - h - 1, w - 2, 1, C.l);
};
const chim = (im: Pix, x: number, y: number, h: number, w = 2) => {
  im.rect(x, y, w, h, R.brick.m);
  im.rect(x, y, 1, h, R.brick.l);
  im.rect(x + w - 1, y, 1, h, R.brick.d);
  im.rect(x, y, w, 1, R.brick.d);
};
const smoke = (im: Pix, x: number, y: number) => {
  im.set(x, y, [200, 200, 226]);
  im.set(x + 1, y - 1, [170, 170, 204]);
  im.set(x, y - 2, [150, 150, 186]);
  im.set(x + 1, y - 3, [128, 128, 170]);
};
const ground = (im: Pix, a: Color = [70, 60, 100], b: Color = [44, 36, 70]) => {
  im.rect(1, G, 22, 2, b);
  im.rect(1, G, 22, 1, a);
  for (let x = 2; x < 22; x += 3) im.set(x, G + 1, a);
};
const pipe = (im: Pix, x0: number, y0: number, x1: number, y1: number, c: Color = R.steel.l) =>
  im.line(x0, y0, x1, y1, c);
const lattice = (im: Pix, x: number, y: number, h: number, w = 4, c: Color = R.steel.l) => {
  im.rect(x, y, 1, h, c);
  im.rect(x + w - 1, y, 1, h, c);
  for (let j = 0; j < h; j += 2) im.line(x, y + j, x + w - 1, y + j + 1, R.steel.d);
};
const tank = (im: Pix, cx: number, cy: number, r: number, C: Ramp = R.white) => {
  im.sphere(cx, cy, r, C);
};
const rocket = (im: Pix, x: number, y: number, h: number, C: Ramp = R.white) => {
  im.cylV(x, y + 3, 3, h - 3, C);
  im.poly(
    [
      [x + 1.5, y],
      [x + 3, y + 3],
      [x, y + 3]
    ],
    R.red.m
  );
  im.rect(x - 1, y + h - 2, 1, 2, R.red.d);
  im.rect(x + 3, y + h - 2, 1, 2, R.red.m);
};
const panel = (im: Pix, x: number, y: number, w: number, h: number) => {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) im.set(x + i, y + j, i % 3 === 0 || j % 2 === 1 ? R.blue.d : R.blue.l);
  im.rect(x, y, w, 1, R.white.m);
};
const reactorVessel = (im: Pix, x: number, w: number, h: number, C: Ramp) => {
  silo(im, x, w, h, C);
  im.rect(x, G - h + 2, w, 1, C.d);
  im.rect(x, G - 4, w, 1, C.d);
};
const rockblob = (im: Pix, cx: number, cy: number, r: number, C: Ramp = R.rock, seed = 1) => {
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 24; x++) {
      const dx = x + 0.5 - cx,
        dy = y + 0.5 - cy,
        a = Math.atan2(dy, dx),
        rr = r * (0.8 + 0.25 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 2));
      if (Math.hypot(dx, dy) > rr) continue;
      const L = (-dx - dy) / r,
        h = strHash('r' + x + y + seed);
      im.set(x, y, h < 0.1 ? C.d : L > 0.45 ? C.l : L > -0.2 ? C.m : C.d);
    }
};
const hangar = (im: Pix, x: number, w: number, h: number, C: Ramp = R.conc) => {
  wall(im, x, w, h, C);
  im.rect(x + 1, G - h + 1, w - 2, 1, C.l);
};

type Draw = (im: Pix) => void;

const BLD: Record<string, Draw> = {
  mine_earth(im) {
    im.poly(
      [
        [1, G],
        [4, 12],
        [8, 11],
        [12, G]
      ],
      (x, y) => ((x + y) % 5 === 0 ? R.dirt.l : R.dirt.m)
    );
    lattice(im, 14, 5, 12, 6);
    im.disc(17, 5, 2.6, R.steel.l);
    im.disc(17, 5, 1.2, DARK);
    im.line(11, 14, 17, 5, R.steel.d);
    wall(im, 14, 8, 3, R.steel, G - 3);
    im.rect(5, 15, 5, 2, R.dark.m);
    im.disc(6, 17, 1, DARK);
    im.disc(9, 17, 1, DARK);
  },
  regolith_excavator(im) {
    wall(im, 3, 9, 4, R.amber, 12);
    im.rect(2, 16, 12, 1, R.dark.d);
    im.disc(4, 16, 1.5, DARK);
    im.disc(11, 16, 1.5, DARK);
    im.line(10, 12, 17, 6, R.steel.l);
    im.line(10, 13, 17, 7, R.steel.d);
    im.disc(18, 7, 4.2, R.steel.m);
    im.disc(18, 7, 2, DARK);
    for (let a = 0; a < 6.3; a += 0.8) im.set(18 + Math.cos(a) * 4.4, 7 + Math.sin(a) * 4.4, R.amber.h);
    im.poly(
      [
        [15, 16],
        [18, 13],
        [23, 16]
      ],
      R.rock.m
    );
  },
  ice_mine(im) {
    im.poly(
      [
        [1, G],
        [5, 12],
        [9, 10],
        [13, G]
      ],
      R.ice.m
    );
    im.line(5, 12, 5, 15, R.ice.h);
    im.line(8, 11, 8, 14, R.ice.h);
    lattice(im, 15, 3, 14, 4);
    im.rect(14, 3, 6, 2, R.red.m);
    im.rect(16, 17, 2, 0, R.white.l);
    im.rect(16, 14, 2, 3, R.steel.d);
    im.set(16, 17, R.ice.h);
  },
  asteroid_miner(im) {
    rockblob(im, 10, 10, 7, R.rock, 3);
    rockblob(im, 17, 14, 3, R.dirt, 7);
    im.rect(17, 2, 5, 3, R.white.m);
    im.rect(17, 2, 5, 1, R.white.h);
    im.rect(22, 3, 1, 1, R.amber.m);
    im.line(18, 5, 14, 9, R.steel.l);
    im.line(20, 5, 12, 11, R.steel.d);
    im.set(13, 10, R.red.h);
  },
  gas_giant_scoop(im) {
    im.sphere(10, 9, 8, R.orange);
    for (let y = 3; y < 16; y += 3)
      for (let x = 2; x < 19; x++) if (im.has(x, y)) im.set(x, y, y % 6 ? R.amber.l : R.red.m);
    im.rect(15, 4, 7, 3, R.white.m);
    im.rect(15, 4, 7, 1, R.white.h);
    im.line(15, 7, 12, 11, R.steel.l);
    im.poly(
      [
        [11, 11],
        [15, 11],
        [13, 16]
      ],
      R.dark.m
    );
  },
  atmosphere_skimmer(im) {
    for (let y = 12; y < 18; y++)
      for (let x = 1; x < 23; x++) im.set(x, y, (y + (x >> 1)) % 3 ? R.orange.m : R.orange.l);
    im.poly(
      [
        [3, 8],
        [14, 6],
        [20, 8],
        [14, 10]
      ],
      R.white.m
    );
    im.poly(
      [
        [10, 7],
        [14, 2],
        [15, 7]
      ],
      R.white.l
    );
    im.poly(
      [
        [10, 9],
        [14, 14],
        [15, 9]
      ],
      R.white.d
    );
    im.rect(20, 8, 2, 1, R.red.m);
    im.rect(1, 8, 2, 1, GLOW);
  },
  air_separation_plant(im) {
    silo(im, 3, 4, 14, R.glass);
    silo(im, 8, 4, 11, R.white);
    silo(im, 13, 3, 9, R.glass);
    wall(im, 17, 6, 6, R.conc);
    win(im, 18, 13, 2);
    pipe(im, 7, 5, 8, 6);
    pipe(im, 7, 9, 13, 9, R.steel.m);
    im.set(4, 8, R.white.h);
    im.set(4, 11, R.white.h);
  },
  farmland(im) {
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 22; i++) {
        const sk = i - j,
          f = (sk >> 1) % 2 === 0;
        im.set(1 + i, 10 + j, j < 1 ? R.green.l : f ? R.green.m : R.amber.m);
        if ((i + j * 2) % 5 === 0) im.set(1 + i, 10 + j, f ? R.green.d : R.amber.d);
      }
    wall(im, 15, 7, 5, R.red, 5);
    im.poly(
      [
        [14, 6],
        [18.5, 2],
        [23, 6]
      ],
      R.red.d
    );
    im.rect(17, 8, 2, 3, R.dark.d);
    im.rect(5, 8, 1, 2, R.dirt.d);
    im.rect(4, 7, 3, 1, R.green.l);
  },
  ranch(im) {
    for (let x = 1; x < 23; x++) im.set(x, 16, R.green.m);
    wall(im, 12, 10, 8, R.red, 8);
    im.poly(
      [
        [11, 8],
        [13, 4],
        [21, 4],
        [23, 8]
      ],
      R.red.d
    );
    im.rect(13, 4, 8, 1, R.red.l);
    im.rect(15, 11, 4, 5, R.white.m);
    im.line(15, 11, 18, 15, R.red.d);
    im.line(18, 11, 15, 15, R.red.d);
    silo(im, 9, 3, 11, R.steel);
    im.rect(1, 13, 8, 1, R.dirt.l);
    im.rect(1, 15, 8, 1, R.dirt.l);
    for (const x of [1, 4, 8]) im.rect(x, 12, 1, 5, R.dirt.m);
    im.rect(2, 14, 3, 2, R.white.l);
    im.rect(5, 14, 1, 2, R.dark.m);
    im.rect(2, 16, 1, 1, R.dark.d);
    im.rect(4, 16, 1, 1, R.dark.d);
  },
  greenhouse(im) {
    im.poly(
      [
        [2, G],
        [2, 9],
        [12, 3],
        [22, 9],
        [22, G]
      ],
      R.glass.m
    );
    im.line(2, 9, 12, 3, R.white.l);
    im.line(12, 3, 22, 9, R.white.l);
    for (let x = 2; x <= 22; x += 4) im.line(x, 9, x, G - 1, R.white.d);
    for (let x = 4; x < 21; x += 4) {
      im.rect(x, 12, 1, 4, R.green.m);
      im.set(x - 1, 12, R.green.l);
      im.set(x + 1, 11, R.green.l);
    }
    im.rect(3, 16, 18, 1, R.dirt.m);
  },
  algae_bioreactor(im) {
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 5;
      im.rect(x, 3, 3, 13, R.glass.l);
      im.rect(x + 1, 6, 1, 10, i % 2 ? R.lime.m : R.green.m);
      im.rect(x, 3, 3, 1, R.white.m);
      im.set(x + 1, 8 + i, R.lime.h);
      im.set(x + 1, 12 - i, R.lime.h);
    }
    im.rect(1, 15, 22, 2, R.steel.m);
  },
  protein_fermenter(im) {
    silo(im, 6, 9, 14, ramp([200, 170, 120]));
    im.poly(
      [
        [6, 3],
        [14, 3],
        [10.5, 0.4]
      ],
      R.amber.l
    );
    im.rect(6, 7, 9, 1, R.steel.d);
    im.rect(6, 11, 9, 1, R.steel.d);
    im.disc(10, 9, 1.4, R.glass.l);
    wall(im, 17, 5, 5, R.conc);
    pipe(im, 15, 6, 17, 6);
    pipe(im, 17, 6, 19, 3);
    im.set(19, 3, R.red.h);
  },
  food_plant(im) {
    hangar(im, 2, 14, 8);
    win(im, 4, 11, 5, LIT);
    wall(im, 17, 5, 5, R.amber);
    im.rect(0, 15, 24, 1, R.dark.m);
    for (let x = 3; x < 22; x += 4) im.rect(x, 14, 3, 2, R.dirt.m);
    chim(im, 12, 3, 6);
    smoke(im, 12, 2);
  },
  life_support_plant(im) {
    im.sphere(10, 12, 6.2, R.glass);
    im.rect(3, 12, 14, 5, R.glass.m);
    im.rect(4, 12, 12, 1, R.white.l);
    for (let x = 5; x < 16; x += 3) {
      im.rect(x, 11, 1, 5, R.green.m);
      im.set(x + 1, 11, R.green.l);
    }
    wall(im, 18, 4, 7, R.steel);
    im.rect(18, 8, 4, 1, R.teal.m);
    pipe(im, 16, 14, 18, 14);
  },
  smelter(im) {
    hangar(im, 2, 12, 8, R.dark);
    chim(im, 4, 2, 7, 3);
    chim(im, 9, 4, 5, 2);
    smoke(im, 5, 1);
    im.rect(5, 12, 5, 5, R.orange.m);
    im.rect(6, 13, 3, 3, GLOW);
    im.rect(14, 14, 8, 3, R.rock.d);
    im.poly(
      [
        [15, 14],
        [18, 12],
        [22, 14]
      ],
      R.orange.m
    );
    im.set(18, 12, GLOW);
  },
  alloy_works(im) {
    hangar(im, 1, 13, 8, R.steel);
    chim(im, 3, 3, 6);
    chim(im, 7, 5, 4);
    smoke(im, 4, 2);
    im.rect(4, 12, 7, 5, R.dark.d);
    im.rect(5, 13, 5, 2, R.orange.m);
    im.rect(6, 13, 3, 1, GLOW);
    silo(im, 16, 6, 8, R.white);
    im.rect(16, 11, 6, 2, R.teal.m);
    im.rect(16, 11, 6, 1, R.teal.l);
  },
  metal_refinery(im) {
    silo(im, 2, 4, 14, R.steel);
    silo(im, 8, 4, 11, R.orange);
    silo(im, 14, 4, 9, R.steel);
    wall(im, 19, 4, 5, R.dark);
    for (const x of [4, 10, 16]) im.set(x, 6 + (x >> 2), GLOW);
    pipe(im, 5, 6, 8, 8);
    pipe(im, 11, 9, 14, 10);
    pipe(im, 17, 11, 19, 12);
  },
  electrolysis_plant(im) {
    hangar(im, 2, 14, 7, R.teal);
    win(im, 4, 12, 5, R.white.h);
    im.rect(4, 8, 4, 3, R.glass.l);
    im.rect(10, 8, 4, 3, R.glass.l);
    im.set(5, 8, R.white.h);
    im.set(11, 7, R.white.h);
    im.set(6, 7, R.white.h);
    im.rect(17, 3, 5, 14, R.dark.m);
    im.rect(18, 6, 3, 4, R.amber.m);
    im.set(19, 6, R.white.h);
    im.rect(19, 7, 1, 3, R.dark.d);
  },
  cryogenic_liquefaction_plant(im) {
    tank(im, 8, 9, 6.5, R.ice);
    im.line(4, 15, 3, G, R.steel.m);
    im.line(12, 15, 13, G, R.steel.m);
    silo(im, 16, 5, 11, R.white);
    im.rect(16, 8, 5, 1, R.ice.d);
    im.rect(16, 12, 5, 1, R.ice.d);
    pipe(im, 14, 7, 16, 7);
    im.set(6, 6, R.white.h);
    im.set(11, 12, R.white.h);
    im.set(9, 4, R.white.h);
  },
  sabatier_plant(im) {
    reactorVessel(im, 3, 5, 12, R.green);
    reactorVessel(im, 10, 5, 9, R.teal);
    wall(im, 17, 6, 5, R.conc);
    pipe(im, 8, 6, 10, 9, R.steel.m);
    pipe(im, 15, 12, 17, 12, R.steel.m);
    im.rect(5, 2, 1, 2, R.red.m);
    im.set(5, 1, GLOW);
    win(im, 18, 14, 2);
  },
  chemical_plant(im) {
    silo(im, 2, 5, 13, R.conc);
    silo(im, 9, 4, 9, R.white);
    tank(im, 17, 11, 4.4, R.amber);
    pipe(im, 7, 7, 9, 9, R.steel.m);
    pipe(im, 13, 11, 14, 11, R.steel.m);
    im.rect(2, 8, 5, 1, R.steel.d);
    lattice(im, 20, 3, 6, 3);
    im.set(4, 3, R.red.h);
  },
  polymer_plant(im) {
    reactorVessel(im, 2, 5, 12, R.blue);
    wall(im, 9, 12, 5, R.conc);
    win(im, 11, 11, 4, LIT);
    im.disc(19, 15, 2.2, R.amber.m);
    im.disc(19, 15, 0.8, DARK);
    im.rect(9, 11, 12, 1, R.steel.d);
    pipe(im, 7, 7, 9, 12);
  },
  fibre_works(im) {
    hangar(im, 1, 14, 8);
    win(im, 3, 11, 6, LIT);
    for (let i = 0; i < 3; i++) {
      im.disc(18 + i * 2.2 - 1, 14, 1.8, [R.red, R.amber, R.teal][i]!.m);
      im.disc(18 + i * 2.2 - 1, 14, 0.6, DARK);
    }
    for (let i = 0; i < 4; i++) im.line(15, 5 + i * 2, 20, 8 + i, R.white.m);
  },
  composite_works(im) {
    im.cylH(2, 9, 14, 6, R.steel);
    im.rect(15, 9, 2, 6, R.steel.d);
    im.rect(2, 9, 2, 6, R.steel.d);
    im.set(9, 12, R.red.h);
    im.rect(5, 15, 1, 2, R.steel.d);
    im.rect(12, 15, 1, 2, R.steel.d);
    wall(im, 17, 5, 3, R.conc);
    im.poly(
      [
        [17, 6],
        [22, 8],
        [22, 10],
        [17, 9]
      ],
      R.dark.m
    );
    im.rect(17, 7, 5, 1, R.dark.l);
  },
  ceramics_works(im) {
    wall(im, 2, 12, 7, R.brick);
    win(im, 4, 12, 4, LIT);
    chim(im, 4, 2, 8, 3);
    smoke(im, 5, 1);
    im.rect(5, 13, 6, 4, R.dark.d);
    im.rect(6, 14, 4, 2, R.orange.m);
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 2; i++) im.box(15 + i * 4, 12 + j * 2 + (i ? 1 : 0), 4, 2, R.rock);
  },
  regolith_oxygen_plant(im) {
    im.rect(1, 12, 22, 5, R.rock.m);
    for (let x = 2; x < 22; x += 2) im.set(x, 13 + (x % 3), R.rock.d);
    reactorVessel(im, 4, 5, 8, R.steel);
    tank(im, 15, 11, 3.6, R.glass);
    wall(im, 19, 4, 4, R.white);
    pipe(im, 9, 11, 12, 11);
    im.set(6, 8, GLOW);
  },
  sinter_printer(im) {
    lattice(im, 2, 2, 15, 3);
    lattice(im, 19, 2, 15, 3);
    im.rect(2, 2, 20, 2, R.amber.m);
    im.rect(2, 2, 20, 1, R.amber.h);
    im.rect(10, 4, 3, 4, R.steel.m);
    im.rect(11, 8, 1, 2, R.red.h);
    for (let j = 0; j < 5; j++) im.box(6, 16 - j * 1.4, 12, 1, j % 2 ? R.rock : R.dirt);
  },
  asteroid_processor(im) {
    rockblob(im, 6, 9, 5, R.rock, 5);
    wall(im, 11, 10, 8, R.steel);
    im.rect(11, 9, 10, 1, R.red.m);
    win(im, 13, 12, 3, LIT);
    im.poly(
      [
        [8, 7],
        [13, 9],
        [13, 11],
        [8, 9]
      ],
      R.dark.m
    );
    chim(im, 18, 5, 4);
    smoke(im, 19, 4);
  },
  semiconductor_fab(im) {
    hangar(im, 1, 17, 9, R.white);
    im.rect(1, 9, 17, 1, R.teal.m);
    win(im, 3, 12, 7, R.glass.h);
    im.disc(21, 7, 2.6, R.steel.l);
    im.disc(21, 7, 1, R.dark.d);
    im.rect(19, 8, 4, 1, R.steel.d);
    im.rect(20, 11, 2, 6, R.steel.m);
  },
  solar_cell_fab(im) {
    hangar(im, 1, 14, 7, R.steel);
    panel(im, 15, 6, 8, 10);
    win(im, 3, 12, 5, LIT);
    im.rect(1, 9, 14, 1, R.amber.m);
  },
  battery_plant(im) {
    hangar(im, 1, 14, 8, R.conc);
    win(im, 3, 11, 5, LIT);
    im.rect(17, 5, 5, 12, R.blue.m);
    im.rect(18, 3, 3, 2, R.white.m);
    im.rect(18, 8, 3, 6, R.white.l);
    im.rect(19, 9, 1, 4, R.blue.d);
    im.rect(18, 11, 3, 1, R.blue.d);
  },
  magnet_works(im) {
    hangar(im, 1, 14, 7, R.dark);
    win(im, 3, 12, 5, LIT);
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 9; x++) {
        const dx = x + 0.5 - 4.5,
          dy = y + 0.5 - 8,
          d = Math.hypot(dx, dy);
        if (d > 4.4 || d < 1.8 || (dy < 0 && Math.abs(dx) < 1.6)) continue;
        im.set(15 + x, 2 + y - 1 + 2, dy < 0 ? (dx < 0 ? [226, 70, 70] : [90, 130, 236]) : R.steel.l);
      }
  },
  data_centre(im) {
    hangar(im, 1, 18, 9, R.dark);
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 8; i++) im.rect(3 + i * 2, 10 + j * 3, 1, 2, (i + j) % 3 ? R.teal.h : R.amber.h);
    for (let i = 0; i < 3; i++) {
      im.rect(20, 11 + i * 2, 3, 1, R.steel.m);
      im.rect(20, 10, 3, 1, R.steel.l);
    }
    im.rect(1, 8, 18, 1, R.teal.m);
  },
  enrichment_plant(im) {
    for (let i = 0; i < 6; i++) {
      im.cylV(2 + i * 3.5, 4 + (i % 2) * 2, 3, 13 - (i % 2) * 2, i % 2 ? R.steel : R.white);
      im.set(3 + i * 3.5, 3 + (i % 2) * 2, R.green.h);
    }
    im.rect(1, 15, 22, 2, R.dark.m);
    im.rect(1, 15, 22, 1, R.lime.m);
  },
  fuel_fabrication_plant(im) {
    hangar(im, 1, 13, 8, R.conc);
    win(im, 3, 11, 5, LIT);
    for (let i = 0; i < 5; i++) {
      im.rect(16 + i * 1.5, 6, 1, 11, [210, 210, 224]);
      im.rect(16 + i * 1.5, 5, 1, 1, R.lime.h);
    }
    im.rect(15, 16, 9, 1, R.dark.m);
  },
  fission_reactor(im) {
    im.sphere(7, 11, 6, R.white);
    im.rect(1, 11, 13, 6, R.white.m);
    im.rect(1, 11, 2, 6, R.white.l);
    im.rect(11, 11, 3, 6, R.white.d);
    im.rect(1, 11, 13, 1, R.white.l);
    im.poly(
      [
        [16, G],
        [17.5, 8],
        [18.5, 4],
        [21.5, 4],
        [22.5, 8],
        [24, G]
      ],
      R.conc.m
    );
    im.rect(18, 4, 4, 1, R.conc.h);
    smoke(im, 19, 3);
    im.rect(5, 13, 4, 2, R.lime.m);
    im.rect(6, 13, 2, 1, R.lime.h);
  },
  reprocessing_plant(im) {
    hangar(im, 1, 12, 8, R.conc);
    win(im, 3, 11, 5, LIT);
    silo(im, 15, 3, 10, R.steel);
    silo(im, 19, 3, 7, R.steel);
    im.rect(15, 9, 3, 2, R.lime.m);
    im.rect(19, 11, 3, 2, R.lime.m);
    pipe(im, 13, 9, 15, 9);
  },
  rtg_factory(im) {
    hangar(im, 1, 14, 8, R.steel);
    win(im, 3, 11, 4, LIT);
    im.cylV(17, 6, 4, 8, R.dark);
    im.rect(17, 8, 4, 1, R.orange.h);
    im.rect(17, 11, 4, 1, R.orange.m);
    for (let i = 0; i < 3; i++) im.rect(16 + i * 3, 14, 2, 3, R.steel.l);
  },
  isotope_separator(im) {
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 24; x++) {
        const dx = x + 0.5 - 12,
          dy = y + 0.5 - 15,
          d = Math.hypot(dx, dy);
        if (d > 11 || d < 7.5 || dy > 1) continue;
        im.set(x, y, d < 8.8 ? R.steel.l : d < 10 ? R.steel.m : R.steel.d);
      }
    for (let i = 0; i < 6; i++)
      im.set(5 + i * 2.7, 14 - Math.sin((i / 5) * 3.14) * 8, i % 2 ? R.lime.h : R.teal.h);
    im.rect(2, 15, 4, 2, R.dark.m);
    im.rect(18, 15, 4, 2, R.dark.m);
  },
  fusion_plant(im) {
    im.ell(11, 10, 9.5, 6.5, R.steel.m);
    im.ell(11, 10, 5.5, 3.2, DARK);
    im.ell(11, 10, 3, 1.6, R.pink.m);
    for (let a = 0; a < 6.3; a += 0.6) im.set(11 + Math.cos(a) * 7.4, 10 + Math.sin(a) * 4.8, R.steel.h);
    im.rect(7, 15, 8, 2, R.dark.m);
    im.set(11, 10, [255, 240, 255]);
    wall(im, 20, 3, 6, R.conc);
  },
  solar_power_station(im) {
    for (let r = 0; r < 3; r++) panel(im, 1 + r * 3, 5 + r * 3, 14, 3);
    lattice(im, 19, 4, 13, 3);
    im.rect(18, 3, 5, 1, R.amber.m);
    im.set(20, 2, GLOW);
    im.set(19, 1, GLOW);
    im.set(21, 1, GLOW);
  },
  exotic_matter_facility(im) {
    im.sphere(11, 9, 4.4, R.purple);
    for (let a = 0; a < 6.3; a += 0.5)
      im.set(11 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, a % 1 < 0.5 ? R.purple.h : R.purple.l);
    im.rect(2, 15, 20, 2, R.dark.m);
    im.rect(4, 10, 1, 5, R.steel.m);
    im.rect(18, 10, 1, 5, R.steel.m);
    im.set(10, 7, [255, 255, 255]);
  },
  antimatter_facility(im) {
    im.ell(11, 10, 10, 6.5, R.dark.m);
    im.ell(11, 10, 7, 4, DARK);
    for (let a = 0; a < 6.3; a += 0.5) im.set(11 + Math.cos(a) * 8.5, 10 + Math.sin(a) * 5.3, R.pink.m);
    im.sphere(16, 10, 2.2, R.pink);
    im.rect(2, 15, 20, 2, R.steel.d);
    im.set(15, 9, [255, 255, 255]);
  },
  rocket_factory(im) {
    hangar(im, 1, 12, 14, R.white);
    im.rect(1, 3, 12, 1, R.red.m);
    im.rect(4, 13, 6, 4, R.dark.d);
    im.rect(4, 6, 6, 1, R.steel.d);
    rocket(im, 17, 6, 11, R.white);
    im.rect(15, 16, 7, 1, R.dark.m);
  },
  launch_site(im) {
    lattice(im, 11, 2, 15, 4);
    rocket(im, 16, 3, 14, R.white);
    im.rect(1, 16, 22, 1, R.conc.m);
    im.rect(14, 15, 8, 2, R.dark.d);
    im.set(18, 17, GLOW);
    im.rect(17, 16, 3, 1, R.orange.m);
    im.rect(3, 12, 4, 5, R.conc.m);
    im.rect(3, 12, 4, 1, R.conc.l);
    im.rect(11, 5, 6, 1, R.steel.m);
  },
  propellant_depot(im) {
    tank(im, 6, 11, 5.2, R.ice);
    tank(im, 16, 12, 4.6, R.white);
    tank(im, 11, 6, 3.4, R.glass);
    im.rect(1, 16, 22, 1, R.dark.m);
    pipe(im, 9, 9, 12, 8, R.steel.m);
    pipe(im, 12, 12, 13, 12, R.steel.m);
  },
  orbital_shipyard(im) {
    lattice(im, 2, 3, 13, 3);
    lattice(im, 19, 3, 13, 3);
    im.rect(2, 3, 20, 2, R.steel.m);
    im.rect(2, 3, 20, 1, R.steel.l);
    im.rect(2, 14, 20, 2, R.steel.d);
    im.poly(
      [
        [5, 8],
        [17, 7],
        [21, 9.5],
        [17, 12],
        [5, 11]
      ],
      R.white.m
    );
    im.rect(5, 8, 12, 1, R.white.h);
    im.rect(3, 8, 2, 3, R.orange.m);
    im.rect(16, 9, 3, 1, R.glass.l);
  },
  jump_point_stabiliser(im) {
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 24; x++) {
        const dx = x + 0.5 - 12,
          dy = y + 0.5 - 9,
          d = Math.hypot(dx / 1.15, dy);
        if (d > 8.5 || d < 6) {
          if (d <= 5.4)
            im.set(x, y, (x + y) % 3 === 0 ? R.purple.m : Math.hypot(dx, dy) < 2 ? R.purple.h : R.purple.d);
          continue;
        }
        im.set(x, y, d < 7 ? R.steel.l : R.steel.m);
      }
    im.rect(10, 16, 4, 2, R.dark.m);
  }
};

const SPACE = new Set([
  'orbital_shipyard',
  'jump_point_stabiliser',
  'asteroid_miner',
  'gas_giant_scoop',
  'atmosphere_skimmer',
  'fusion_plant',
  'exotic_matter_facility',
  'antimatter_facility',
  'isotope_separator',
  'farmland',
  'greenhouse'
]);

export const KIND_COLOURS: Record<string, Color> = {
  extraction: [190, 128, 80],
  processing: [124, 150, 210],
  power: [242, 200, 90],
  electronics: [84, 196, 176],
  habitat: [100, 184, 96],
  infrastructure: [214, 220, 238],
  nuclear: [140, 214, 100],
  special: [200, 100, 236],
  structure: [150, 160, 190],
  propulsion: [240, 140, 70],
  thermal: [230, 100, 80],
  protection: [150, 190, 230]
};

export const FALLBACK_KIND_COLOUR: Color = [150, 150, 180];

export const KIND_EXAMPLES: Record<string, string> = {
  extraction: 'mine_earth',
  processing: 'chemical_plant',
  power: 'solar_power_station',
  electronics: 'semiconductor_fab',
  habitat: 'greenhouse',
  infrastructure: 'rocket_factory',
  nuclear: 'fission_reactor',
  special: 'jump_point_stabiliser'
};

const kindOf = (id: string) => buildings.find((b) => b.id === id)?.kind;

export const hasBuildingArt = (id: string): boolean => id in BLD && buildings.some((b) => b.id === id);

export function buildingSprite(id: string): Sprite {
  return sprite('b:' + id, 24, 20, (im) => {
    const f = BLD[id];
    if (f) f(im);
    else {
      const kind = kindOf(id),
        c = kind ? KIND_COLOURS[kind] : undefined,
        tint = c ? ramp(mixc(c, [150, 152, 186], 0.35)) : R.conc;
      hangar(im, 3, 18, 9, tint);
      win(im, 5, 11, 7);
    }
    if (!SPACE.has(id)) ground(im);
  });
}
