import type { Channel } from '#lib/gfx/bodies/cube.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { ramp, toward, type Stops } from './colour.ts';
import { defineLook } from './define.ts';
import { rng } from './math.ts';
import {
  C,
  basin,
  clamp,
  clearC,
  craterField,
  fbm,
  feature,
  featureField,
  layers,
  makeBasin,
  noise3,
  type BasinDef,
  type CraterLayerDef,
  type FeatureDef
} from './terrain.ts';
import { ADD, LAND, type Colour, type Look, type Texels } from './types.ts';

type At = (x: number, y: number, z: number) => number;

export interface Lumpy {
  amp: number;
  lump: number;
  dent: number;
  ridge?: number;
  face?: number;
  freq?: number;
  octaves?: number;
  waist?: boolean;
  facets?: number;
  facetMin?: number;
  facetMax?: number;
}

export interface CraterOptions {
  id: string;
  seed?: number;
  face?: number;
  hs?: number;
  bump?: number;
  gradRange?: number;
  facing?: number;
  tilt?: number;
  pitch?: number;
  shape?: readonly [number, number, number];
  lumpy?: Lumpy;
  layers: readonly CraterLayerDef[];
  features?: readonly FeatureDef[];
  basins?: readonly BasinDef[];
  damp?: At;
  dampAmt?: number;
  extraH?: At;
  extraScale?: number;
  m1?: At;
  m2?: At;
  m3?: At;
  noiseFreq?: number;
  noiseAmt?: number;
  palette: Stops;
  bright?: RGB;
  brightAmt?: number;
  floor?: RGB;
  floorAt?: number;
  floorAmt?: number;
  addK?: number;
  post?: (x: number, y: number, z: number, R: number, dv: number, G: Texels, O: Colour, hgt: number) => void;
}

const BIG_DENT = [
  { f: 1.6, dn: 0.5, rmin: 0.2, rmax: 0.34, depth: 0.7 },
  { f: 3.4, dn: 0.6, rmin: 0.16, rmax: 0.32, depth: 0.6 },
  { f: 7, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.5 }
] as const;

export function craterLook(o: CraterOptions): Look {
  const ls = layers(o.layers, o.seed ?? 0),
    fs = (o.features ?? []).map(feature),
    bs = (o.basins ?? []).map(makeBasin),
    hs = o.hs ?? 0.5,
    nf = o.noiseFreq ?? 3,
    sd = (o.seed ?? 0) * 3.17;
  let lx = NaN,
    ly = 0,
    lz = 0,
    lh = 0,
    lr = 0,
    lb = 0;
  const compute = (x: number, y: number, z: number) => {
    if (x === lx && y === ly && z === lz) return;
    lx = x;
    ly = y;
    lz = z;
    clearC();
    craterField(x, y, z, ls);
    const damp = o.damp ? o.damp(x, y, z) : 0;
    if (damp) {
      C.h *= 1 - damp * (o.dampAmt ?? 0.75);
      C.rel *= 1 - damp * (o.dampAmt ?? 0.75);
    }
    featureField(x, y, z, fs);
    for (let i = 0; i < bs.length; i++) basin(x, y, z, bs[i]!);
    lh = C.h;
    lr = C.rel;
    lb = C.bright;
  };
  const none: At = () => 0,
    extraH = o.extraH ?? none,
    extraScale = o.extraScale ?? 12;
  let rawLast = 0;
  const channels: Channel[] = [
    (x, y, z) => {
      compute(x, y, z);
      const e = extraH(x, y, z);
      rawLast = lh + e;
      return 0.5 + (lr + e * extraScale) * hs;
    },
    (x, y, z) => {
      compute(x, y, z);
      return lb;
    },
    (x, y, z) => fbm(x * nf + sd, y * nf, z * nf, 4),
    o.m1 ?? none,
    o.m2 ?? none,
    o.m3 ?? none
  ];
  const pal = o.palette,
    bright = o.bright ?? [230, 230, 230],
    floor = o.floor ?? null;
  const shade = (x: number, y: number, z: number, R: number, dv: number, G: Texels, O: Colour) => {
    const hgt = (G[0] - 0.5) / hs;
    const a = clamp((G[2] - 0.5) * (o.noiseAmt ?? 1.6) + 0.5, 0, 1);
    ramp(O, pal, a);
    O[LAND] = 1;
    O[ADD] = hgt * (o.addK ?? 0.6);
    if (floor && hgt < -(o.floorAt ?? 0.12))
      toward(O, floor, clamp((-hgt - (o.floorAt ?? 0.12)) * (o.floorAmt ?? 2.2), 0, 1));
    if (G[1] > 0.04) toward(O, bright, clamp(G[1] * (o.brightAmt ?? 1.1), 0, 1));
    if (o.post) o.post(x, y, z, R, dv, G, O, hgt);
  };
  let shapeFn: Channel | undefined;
  let lumpyAmp: number | undefined;
  if (o.lumpy) {
    const L = o.lumpy,
      dl = layers(BIG_DENT, (o.seed ?? 0) + 40);
    lumpyAmp = L.amp;
    const rr = rng(Math.floor((o.seed ?? 0) * 977) + 5),
      planes: [number, number, number, number][] = [];
    for (let i = 0; i < (L.facets ?? 0); i++) {
      const a = rr() * 6.283,
        zc = rr() * 2 - 1,
        s = Math.sqrt(1 - zc * zc);
      planes.push([
        Math.cos(a) * s,
        zc,
        Math.sin(a) * s,
        (L.facetMin ?? 0.72) + rr() * ((L.facetMax ?? 0.95) - (L.facetMin ?? 0.72))
      ]);
    }
    shapeFn = (x, y, z) => {
      const n =
          (fbm(x * (L.freq ?? 1.4) + sd, y * (L.freq ?? 1.4), z * (L.freq ?? 1.4), L.octaves ?? 3) - 0.5) * 2,
        lump = Math.sign(n) * Math.abs(n) ** 0.75,
        rg = 1 - Math.abs(noise3(x * 4 + sd, y * 4, z * 4) * 2 - 1);
      clearC();
      craterField(x, y, z, dl);
      const waist = L.waist ? -0.85 * L.amp * Math.exp(-(x * x) / 0.02) : 0;
      let base = lump * L.lump + (rg - 0.5) * (L.ridge ?? 0.04) + waist;
      if (planes.length) {
        let cut = 9;
        for (let i = 0; i < planes.length; i++) {
          const p = planes[i]!,
            dt = x * p[0] + y * p[1] + z * p[2];
          if (dt > 0.05) cut = Math.min(cut, p[3] / dt);
        }
        base = Math.min(base, cut - 1 + base * 0.25);
      }
      return clamp(0.5 + (base + C.rel * L.dent) / (2 * L.amp), 0, 1);
    };
  }
  return defineLook({
    id: o.id,
    shapeFn,
    lumpyAmp,
    shapeFace: o.lumpy?.face ?? 96,
    face: o.face ?? 192,
    bump: o.bump ?? 0.9,
    gradRange: o.gradRange ?? 1.6,
    rawOf: () => rawLast,
    channels,
    shade,
    tint: pal[1]![1],
    shape: o.shape,
    facing: o.facing ?? 0,
    tilt: o.tilt,
    pitch: o.pitch
  });
}
