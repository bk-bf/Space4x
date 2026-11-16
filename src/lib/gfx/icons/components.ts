import { shipComponents } from '#lib/game/data/records.ts';
import { KIND_COLOURS } from './buildings.ts';
import { ramp, type Color, type Pix, type Ramp } from './pixels.ts';
import { sprite, type Sprite } from './sprite.ts';

const C = {
  steel: ramp([128, 138, 172]),
  white: ramp([226, 230, 244]),
  gold: ramp([226, 178, 84]),
  copper: ramp([214, 128, 72]),
  red: ramp([210, 84, 70]),
  blue: ramp([80, 120, 214]),
  green: ramp([96, 190, 100]),
  teal: ramp([84, 196, 176]),
  dark: ramp([72, 72, 104]),
  orange: ramp([244, 146, 62]),
  purple: ramp([176, 94, 226]),
  pink: ramp([255, 120, 176]),
  glass: ramp([150, 220, 236]),
  lime: ramp([160, 236, 104])
};
const GLOW: Color = [255, 214, 120];

const bell = (im: Pix, cx: number, top: number, h: number, w0: number, w1: number, Rm: Ramp) => {
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1),
      w = w0 + (w1 - w0) * t ** 1.4,
      x0 = Math.round(cx - w / 2),
      n = Math.round(w);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      im.set(x0 + i, top + j, u < 0.25 ? Rm.l : u < 0.45 ? Rm.h : u < 0.7 ? Rm.m : Rm.d);
    }
    im.set(x0, top + j, Rm.l);
    im.set(x0 + n - 1, top + j, Rm.d);
  }
};

type Draw = (im: Pix) => void;

const DRAW: Record<string, Draw> = {
  kerolox_engine(im) {
    im.rect(5, 1, 6, 1, C.steel.l);
    im.box(5, 2, 6, 4, C.steel);
    im.rect(2, 3, 3, 2, C.copper.m);
    im.rect(11, 3, 3, 2, C.copper.m);
    bell(im, 8, 6, 8, 5, 10, C.copper);
    im.rect(5, 13, 6, 1, C.copper.d);
    im.set(8, 14, GLOW);
  },
  chemical_engine_methalox(im) {
    im.box(3, 1, 10, 4, C.steel);
    im.rect(5, 2, 2, 2, C.blue.m);
    im.rect(9, 2, 2, 2, C.blue.m);
    im.rect(4, 5, 8, 1, C.steel.d);
    bell(im, 8, 6, 8, 6, 11, C.steel);
    im.rect(4, 14, 8, 1, C.steel.d);
  },
  chemical_engine_hydrolox(im) {
    im.box(5, 1, 6, 3, C.white);
    im.rect(7, 2, 2, 1, C.blue.m);
    bell(im, 8, 4, 10, 4, 13, C.white);
    im.rect(2, 13, 12, 1, C.white.d);
    im.rect(5, 6, 6, 1, C.blue.m);
    im.set(8, 14, GLOW);
  },
  rcs_thruster(im) {
    im.box(2, 4, 6, 8, C.dark);
    im.rect(3, 6, 4, 1, C.green.m);
    bell(im, 11, 6, 5, 3, 7, C.steel);
    im.rect(8, 7, 5, 3, C.steel.m);
    im.rect(13, 6, 2, 5, C.steel.d);
    im.rect(14, 7, 1, 3, GLOW);
    im.set(1, 8, C.red.m);
  },
  hall_thruster(im) {
    im.disc(8, 8, 6.4, C.steel.m);
    im.disc(8, 8, 5, C.dark.m);
    im.disc(8, 8, 3.6, C.blue.l);
    im.disc(8, 8, 2.2, C.dark.d);
    im.disc(8, 8, 1, [200, 230, 255]);
    for (let a = 0; a < 6.3; a += 0.8) im.set(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, C.steel.h);
  },
  ion_thruster(im) {
    im.disc(8, 8, 6.4, C.gold.m);
    im.disc(8, 8, 5.4, C.dark.d);
    for (let y = 3; y < 14; y++)
      for (let x = 3; x < 14; x++)
        if (Math.hypot(x - 7.5, y - 7.5) < 5 && (x + y) % 2 === 0)
          im.set(x, y, (x * y) % 3 ? C.blue.h : C.teal.l);
  },
  ntr_engine(im) {
    im.cylV(5, 1, 6, 6, C.lime);
    im.rect(5, 3, 6, 1, C.lime.d);
    im.rect(6, 2, 1, 4, C.lime.h);
    im.rect(4, 1, 8, 1, C.steel.l);
    bell(im, 8, 7, 7, 5, 11, C.steel);
    im.rect(4, 13, 8, 1, C.steel.d);
    im.set(8, 14, [160, 255, 200]);
  },
  fusion_drive(im) {
    for (let k = 0; k < 4; k++) im.ell(8, 3 + k * 3, 6.5 - k * 0.2, 1.8, k % 2 ? C.purple.m : C.purple.l);
    im.rect(7, 1, 2, 12, C.steel.d);
    im.rect(4, 13, 8, 1, C.pink.m);
    im.rect(5, 14, 6, 1, C.pink.h);
    for (let k = 0; k < 4; k++) im.ell(8, 3 + k * 3, 4.6 - k * 0.1, 0.9, C.dark.d);
  },
  fission_reactor_ship(im) {
    im.cylV(4, 2, 8, 9, C.steel);
    im.rect(6, 4, 4, 5, C.lime.m);
    im.rect(7, 5, 2, 3, C.lime.h);
    im.rect(4, 10, 8, 1, C.steel.d);
    im.rect(1, 4, 3, 7, C.red.m);
    im.rect(12, 4, 3, 7, C.red.m);
    for (let y = 5; y < 11; y += 2) {
      im.rect(1, y, 3, 1, C.red.d);
      im.rect(12, y, 3, 1, C.red.d);
    }
    im.rect(6, 11, 4, 3, C.dark.m);
  },
  radiator(im) {
    for (let i = 0; i < 5; i++) {
      im.rect(2 + i * 2.6, 3, 2, 10, i % 2 ? C.red.m : C.orange.m);
      im.rect(2 + i * 2.6, 3, 2, 1, C.red.h);
    }
    im.rect(1, 2, 14, 1, C.steel.m);
    im.rect(1, 13, 14, 1, C.steel.d);
    im.rect(7, 13, 2, 2, C.steel.m);
  },
  solar_array(im) {
    for (const sx of [1, 9])
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 6; i++) im.set(sx + i, 4 + j, i % 3 === 2 || j % 3 === 2 ? C.white.m : C.blue.m);
    for (const sx of [1, 9]) im.rect(sx, 4, 6, 1, C.blue.l);
    im.rect(7, 7, 2, 2, C.steel.m);
    im.rect(7, 2, 2, 12, C.steel.d);
    im.rect(7, 2, 2, 1, C.steel.l);
  },
  battery_pack(im) {
    im.box(2, 4, 12, 9, C.steel);
    im.rect(4, 3, 2, 1, C.gold.m);
    im.rect(10, 3, 2, 1, C.gold.m);
    im.rect(3, 5, 10, 7, C.dark.d);
    for (let i = 0; i < 4; i++) im.rect(4 + i * 2.4, 6, 2, 5, i < 3 ? C.lime.m : C.dark.m);
  },
  habitat_module(im) {
    im.cylH(1, 4, 14, 8, C.white);
    im.rect(1, 4, 2, 8, C.steel.m);
    im.rect(13, 4, 2, 8, C.steel.m);
    im.rect(5, 4, 1, 8, C.steel.d);
    im.rect(10, 4, 1, 8, C.steel.d);
    for (const x of [3, 7, 11]) im.rect(x, 7, 1, 2, [255, 226, 140]);
    im.rect(1, 12, 14, 1, C.steel.d);
  },
  inflatable_habitat(im) {
    im.rect(6, 12, 4, 3, C.steel.m);
    im.rect(5, 14, 6, 1, C.steel.d);
    im.sphere(8, 7, 6, C.gold);
    for (let a = -1; a <= 1; a++) im.line(3 + a * 0, 7 + a * 2, 13, 7 + a * 2, C.gold.d);
    im.line(8, 1, 8, 12, C.gold.d);
    im.set(5, 4, C.gold.h);
  },
  life_support_unit(im) {
    im.box(2, 2, 12, 12, C.steel);
    im.rect(3, 3, 10, 10, C.dark.d);
    im.rect(7, 5, 2, 6, C.lime.m);
    im.rect(5, 7, 6, 2, C.lime.m);
    im.rect(7, 6, 2, 4, C.lime.h);
    im.rect(3, 3, 1, 1, C.green.h);
    im.rect(4, 12, 2, 1, C.teal.m);
    im.rect(10, 12, 2, 1, C.red.m);
  },
  radiation_shield(im) {
    im.box(1, 3, 14, 10, ramp([108, 110, 134]));
    im.rect(2, 4, 12, 1, [236, 190, 60]);
    for (let x = 2; x < 14; x += 2) im.rect(x, 4, 1, 1, [34, 28, 40]);
    im.rect(7, 7, 2, 2, C.lime.h);
    im.rect(7, 6, 2, 1, C.lime.m);
    im.rect(5, 9, 2, 2, C.lime.m);
    im.rect(9, 9, 2, 2, C.lime.m);
  },
  whipple_shield(im) {
    im.box(1, 2, 14, 3, C.steel);
    im.box(1, 11, 14, 3, C.steel);
    for (const x of [3, 8, 13]) im.rect(x, 5, 1, 6, C.steel.d);
    for (let x = 2; x < 15; x += 3) im.set(x, 7 + (x % 2) * 2, C.steel.h);
    im.line(5, 0, 8, 12, C.red.m);
    im.set(8, 13, GLOW);
  },
  heat_shield(im) {
    im.poly(
      [
        [1, 3],
        [15, 3],
        [13, 6],
        [11, 10],
        [8, 13],
        [5, 10],
        [3, 6]
      ],
      (_x, y) => (y < 6 ? C.orange.m : y < 9 ? C.copper.d : C.dark.d)
    );
    im.rect(1, 3, 14, 1, C.orange.h);
    im.set(6, 6, C.red.h);
    im.set(10, 5, C.red.h);
    im.set(8, 9, C.orange.l);
    for (let y = 4; y < 12; y += 2) for (let x = 3; x < 14; x += 3) if (im.has(x, y)) im.set(x, y, C.dark.d);
  },
  mli_blanket(im) {
    for (let y = 2; y < 14; y++)
      for (let x = 1; x < 15; x++) {
        const w = Math.sin(x * 0.9 + y * 0.55) + Math.cos(y * 1.3 - x * 0.4);
        im.set(x, y, w > 1 ? C.gold.h : w > 0.2 ? C.gold.l : w > -0.7 ? C.gold.m : C.gold.d);
      }
  },
  avionics(im) {
    im.box(2, 4, 12, 10, ramp([40, 130, 96]));
    im.rect(3, 5, 10, 1, C.green.h);
    im.rect(5, 7, 6, 5, C.dark.d);
    im.rect(6, 8, 4, 3, C.dark.m);
    im.set(8, 9, C.teal.h);
    for (let i = 0; i < 4; i++) {
      im.rect(3, 6 + i * 2, 1, 1, C.gold.m);
      im.rect(12, 6 + i * 2, 1, 1, C.gold.m);
    }
    im.rect(12, 1, 1, 3, C.steel.l);
    im.set(12, 0, C.red.h);
  },
  docking_adapter(im) {
    im.disc(8, 8, 6.4, C.steel.m);
    im.disc(8, 8, 4.6, C.dark.d);
    im.disc(8, 8, 3.2, C.steel.d);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.571 + 0.785;
      im.rect(8 + Math.cos(a) * 5 - 1, 8 + Math.sin(a) * 5 - 1, 2, 2, C.gold.m);
    }
    im.set(8, 8, C.teal.h);
    im.rect(7, 1, 2, 2, C.steel.h);
  },
  sampling_arm(im) {
    im.box(1, 11, 6, 4, C.steel);
    im.line(4, 11, 7, 6, C.steel.l);
    im.line(5, 11, 8, 6, C.steel.d);
    im.disc(7.5, 6, 1.5, C.gold.m);
    im.line(8, 6, 12, 5, C.steel.l);
    im.line(8, 7, 12, 6, C.steel.d);
    im.disc(12, 5.5, 1.2, C.gold.m);
    im.line(12, 6, 14, 9, C.white.m);
    im.line(13, 5, 15, 8, C.white.m);
    im.rect(13, 12, 2, 2, C.orange.m);
  },
  structure_truss(im) {
    im.rect(1, 3, 14, 1, C.steel.l);
    im.rect(1, 12, 14, 1, C.steel.d);
    for (let x = 1; x < 14; x += 4) {
      im.line(x, 12, x + 2, 3, C.steel.m);
      im.line(x + 2, 3, x + 4, 12, C.steel.m);
    }
    for (let x = 1; x < 15; x += 4) {
      im.set(x, 4, C.white.m);
      im.set(x, 11, C.white.m);
    }
  },
  propellant_tank(im) {
    im.cylH(1, 4, 14, 9, C.white);
    im.ell(2.5, 8.5, 2.2, 4.5, C.white.l);
    im.ell(13.5, 8.5, 2.2, 4.5, C.white.d);
    im.rect(5, 4, 1, 9, C.steel.d);
    im.rect(10, 4, 1, 9, C.steel.d);
    im.rect(7, 2, 2, 2, C.steel.m);
    im.rect(6, 6, 4, 3, C.blue.m);
  },
  copv(im) {
    im.sphere(8, 8, 6.2, C.blue);
    for (let a = -2; a <= 2; a++)
      im.line(3 + Math.abs(a) * 0.6, 8 + a * 2, 13 - Math.abs(a) * 0.6, 8 + a * 2, C.blue.d);
    im.rect(7, 1, 2, 2, C.steel.l);
    im.set(6, 5, C.blue.h);
  }
};

const kindOf = (id: string) => shipComponents.find((c) => c.id === id)?.kind;

export const hasComponentArt = (id: string): boolean => id in DRAW && shipComponents.some((c) => c.id === id);

export function componentSprite(id: string): Sprite {
  return sprite('c:' + id, 16, 16, (im) => {
    const f = DRAW[id];
    if (f) f(im);
    else {
      const kind = kindOf(id),
        base = (kind ? KIND_COLOURS[kind] : undefined) ?? [128, 138, 172];
      im.box(2, 2, 12, 12, ramp(base));
    }
  });
}
