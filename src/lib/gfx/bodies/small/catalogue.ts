import { hash } from '#lib/gfx/math.ts';
import type { Lumpy } from '#lib/gfx/bodies/looks/cratered.ts';
import type { ShapeFamily, SmallBody, SmallType } from './draw.ts';
import { shapeSpec, type Lobe, type ShapeSpec, type Vec3 } from './shape.ts';

export interface SmallInfo {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly diameter: number;
}

export const FAMILY_NAMES: Readonly<Record<ShapeFamily, string>> = {
  top: 'Spinning top',
  contact: 'Contact binary',
  peanut: 'Peanut',
  elongated: 'Elongated',
  bone: 'Dog bone',
  lumpy: 'Lumpy',
  round: 'Nearly round',
  nucleus: 'Comet nucleus'
};

interface Named {
  readonly family: ShapeFamily;
  readonly spec: ShapeSpec;
  readonly tilt?: number;
  readonly rock?: Partial<Lumpy>;
}

const ROCK: Readonly<Record<ShapeFamily, Lumpy>> = {
  top: { amp: 0.16, lump: 0.1, dent: 0.25, ridge: 0.05, freq: 2.6, octaves: 3 },
  contact: {
    amp: 0.26,
    lump: 0.14,
    dent: 0.2,
    ridge: 0.05,
    freq: 2.2,
    facets: 6,
    facetMin: 0.8,
    facetMax: 1
  },
  peanut: {
    amp: 0.28,
    lump: 0.14,
    dent: 0.2,
    ridge: 0.05,
    freq: 1.9,
    facets: 7,
    facetMin: 0.76,
    facetMax: 0.98
  },
  elongated: {
    amp: 0.34,
    lump: 0.2,
    dent: 0.2,
    ridge: 0.05,
    freq: 2,
    facets: 7,
    facetMin: 0.66,
    facetMax: 0.92
  },
  bone: { amp: 0.22, lump: 0.1, dent: 0.2, ridge: 0.05, freq: 2, facets: 5, facetMin: 0.82, facetMax: 1 },
  lumpy: { amp: 0.4, lump: 0.2, dent: 0.2, ridge: 0.05, freq: 1.7, facets: 9 },
  round: { amp: 0.1, lump: 0.05, dent: 0.18, ridge: 0.04, freq: 1.6 },
  nucleus: { amp: 0.3, lump: 0.1, dent: 0.2, ridge: 0.07, freq: 1.4 }
};

const RUBBLE_FROM = 80;
const RUBBLE: Partial<Lumpy> = { lump: 0.18, freq: 2.8 };

const lobe = (c: Vec3, a: Vec3, n?: number): Lobe => (n === undefined ? { c, a } : { c, a, n });
const ball = (a: Vec3): readonly Lobe[] => [lobe([0, 0, 0], a)];
const SPIN_UP: Vec3 = [0, 0, 0];

const NAMED: Readonly<Record<string, Named>> = {
  bennu: {
    family: 'top',
    spec: shapeSpec(101, [lobe(SPIN_UP, [1, 0.97, 1], 1.72)], {
      ridge: 0.03,
      ridgeWidth: 0.15,
      lumps: 0.03,
      lumpFreq: 2.6,
      craters: 0.35,
      craterDepth: 0.12,
      boulders: 150
    })
  },
  ryugu: {
    family: 'top',
    spec: shapeSpec(103, [lobe(SPIN_UP, [1, 0.94, 1], 1.78)], {
      ridge: 0.03,
      ridgeWidth: 0.15,
      lumps: 0.04,
      lumpFreq: 2.4,
      craters: 0.55,
      craterDepth: 0.14,
      boulders: 100
    })
  },
  didymos: {
    family: 'top',
    spec: shapeSpec(107, [lobe(SPIN_UP, [1, 0.9, 1], 1.85)], {
      ridge: 0.03,
      ridgeWidth: 0.15,
      lumps: 0.03,
      craters: 0.3,
      craterDepth: 0.12,
      boulders: 40
    })
  },
  itokawa: {
    family: 'contact',
    spec: shapeSpec(109, [lobe([-0.3, 0, 0], [0.8, 0.5, 0.42]), lobe([0.42, 0.03, 0], [0.46, 0.3, 0.27])], {
      blend: 0.1,
      lumps: 0.05,
      lumpFreq: 3,
      craters: 0.12,
      craterDepth: 0.12,
      boulders: 110
    }),
    tilt: 0.35
  },
  eros: {
    family: 'peanut',
    spec: shapeSpec(
      113,
      [
        lobe([-0.55, 0.14, 0], [0.8, 0.42, 0.4]),
        lobe([0.02, -0.1, 0], [0.55, 0.37, 0.36]),
        lobe([0.55, 0.13, 0], [0.75, 0.42, 0.4])
      ],
      { blend: 0.12, lumps: 0.04, lumpFreq: 2.2, craters: 1.1, boulders: 24 }
    ),
    tilt: -0.3
  },
  apophis: {
    family: 'elongated',
    spec: shapeSpec(127, [lobe([-0.25, 0, 0], [0.75, 0.5, 0.44]), lobe([0.3, 0, 0], [0.62, 0.46, 0.4])], {
      blend: 0.2,
      lumps: 0.05,
      craters: 0.25,
      craterDepth: 0.14,
      boulders: 40
    }),
    tilt: 0.2
  },
  ida: {
    family: 'peanut',
    spec: shapeSpec(
      131,
      [lobe([-0.6, 0.04, 0], [0.7, 0.4, 0.34]), lobe([0.56, -0.02, 0], [0.72, 0.43, 0.35])],
      {
        blend: 0.14,
        lumps: 0.05,
        craters: 1.7,
        boulders: 16
      }
    ),
    tilt: 0.3
  },
  gaspra: {
    family: 'elongated',
    spec: shapeSpec(137, [lobe(SPIN_UP, [1.35, 0.8, 0.68])], {
      lumps: 0.1,
      lumpFreq: 1.7,
      craters: 0.8,
      craterDepth: 0.3
    }),
    tilt: -0.25
  },
  kleopatra: {
    family: 'bone',
    spec: shapeSpec(
      139,
      [
        lobe([-0.62, 0, 0], [0.55, 0.46, 0.43]),
        lobe([0, 0, 0], [0.8, 0.24, 0.24]),
        lobe([0.62, 0.02, 0], [0.55, 0.5, 0.45])
      ],
      { blend: 0.12, lumps: 0.03, craters: 0.6, craterDepth: 0.14 }
    ),
    tilt: 0.28
  },
  mathilde: {
    family: 'lumpy',
    spec: shapeSpec(149, ball([1.15, 0.88, 0.82]), {
      lumps: 0.05,
      craters: 1.5,
      craterDepth: 0.3,
      basins: [
        { dir: [0.9, 0.2, 0.3], rho: 0.62, depth: 0.2, peak: 0 },
        { dir: [-0.3, -0.6, 0.7], rho: 0.5, depth: 0.16, peak: 0 },
        { dir: [-0.5, 0.5, -0.6], rho: 0.46, depth: 0.15, peak: 0 }
      ]
    })
  },
  lutetia: {
    family: 'lumpy',
    spec: shapeSpec(151, ball([1.18, 0.95, 0.82]), {
      lumps: 0.07,
      craters: 1.6,
      craterDepth: 0.2,
      basins: [{ dir: [0.2, 0.9, 0.3], rho: 0.55, depth: 0.12, peak: 0 }]
    })
  },
  arrokoth: {
    family: 'contact',
    spec: shapeSpec(157, [lobe([-0.55, 0, 0], [0.82, 0.46, 0.8]), lobe([0.62, 0, 0], [0.62, 0.36, 0.6])], {
      blend: 0.06,
      lumps: 0.02,
      craters: 0.1,
      craterDepth: 0.1
    }),
    tilt: 0.1
  },
  psyche: {
    family: 'lumpy',
    spec: shapeSpec(163, ball([1.12, 0.92, 0.8]), {
      lumps: 0.09,
      lumpFreq: 1.8,
      craters: 0.9,
      craterDepth: 0.16,
      basins: [
        { dir: [0.6, 0.3, 0.7], rho: 0.7, depth: 0.14, peak: 0 },
        { dir: [-0.7, -0.2, 0.4], rho: 0.5, depth: 0.12, peak: 0 }
      ]
    })
  },
  vesta: {
    family: 'round',
    spec: shapeSpec(167, ball([1.03, 0.92, 1]), {
      lumps: 0.035,
      craters: 1,
      craterDepth: 0.2,
      basins: [
        { dir: [0.1, -0.96, 0.2], rho: 0.85, depth: 0.16, peak: 0.55 },
        { dir: [-0.5, -0.75, -0.3], rho: 0.5, depth: 0.1, peak: 0 }
      ]
    }),
    tilt: 0.2
  },
  pallas: {
    family: 'round',
    spec: shapeSpec(179, ball([1.04, 0.95, 0.98]), {
      lumps: 0.03,
      craters: 1.2,
      craterDepth: 0.17
    }),
    tilt: 0.45
  },
  hygiea: {
    family: 'round',
    spec: shapeSpec(181, ball([1.02, 0.98, 1]), {
      lumps: 0.02,
      craters: 0.6,
      craterDepth: 0.15
    }),
    tilt: -0.2
  }
};

const known = (t: string): SmallType =>
  t === 'carbonaceous' || t === 'metallic' || t === 'comet' ? t : 'stony';

function seedOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 100_000;
}

function between(id: string, k: number, lo: number, hi: number): number {
  return lo + (hi - lo) * hash(seedOf(id), k, 91);
}

function generic(info: SmallInfo, type: SmallType): Named {
  const seed = seedOf(info.id),
    d = info.diameter,
    pick = hash(seed, 3, 91),
    metal = type === 'metallic',
    dense = type === 'carbonaceous' ? 0.7 : metal ? 0.7 : 1;
  if (type === 'comet') {
    const two = pick < 0.6;
    return {
      family: 'nucleus',
      spec: shapeSpec(
        seed,
        two
          ? [
              lobe([-0.5, 0, 0], [between(info.id, 1, 0.75, 0.9), 0.55, 0.52]),
              lobe([0.5, 0.02, 0], [between(info.id, 2, 0.5, 0.65), 0.4, 0.38])
            ]
          : ball([1.2, 0.85, 0.8]),
        { blend: 0.1, lumps: 0.07, lumpFreq: 2.3, craters: 0.5, craterDepth: 0.1, boulders: 40 }
      ),
      tilt: between(info.id, 5, -0.5, 0.5)
    };
  }
  if (d >= 400)
    return {
      family: 'round',
      spec: shapeSpec(seed, ball([1.02, between(info.id, 1, 0.94, 0.99), 1]), {
        lumps: between(info.id, 2, 0.015, 0.035),
        craters: dense * 1.2,
        craterDepth: 0.17
      }),
      tilt: between(info.id, 5, -0.5, 0.5)
    };
  if (d >= 150)
    return {
      family: 'lumpy',
      spec: shapeSpec(
        seed,
        ball([
          between(info.id, 1, 1.0, 1.14),
          between(info.id, 2, 0.86, 0.96),
          between(info.id, 3, 0.8, 0.92)
        ]),
        {
          lumps: between(info.id, 4, 0.04, 0.075),
          lumpFreq: between(info.id, 6, 1.8, 2.6),
          craters: dense * 1.3,
          craterDepth: 0.18,
          basins:
            pick > 0.55
              ? [
                  {
                    dir: [hash(seed, 8, 91) - 0.5, hash(seed, 9, 91) - 0.5, hash(seed, 10, 91) - 0.5],
                    rho: between(info.id, 11, 0.4, 0.65),
                    depth: 0.1,
                    peak: 0
                  }
                ]
              : []
        }
      ),
      tilt: between(info.id, 5, -0.5, 0.5)
    };
  if (d >= 40)
    return pick < 0.22
      ? {
          family: 'peanut',
          spec: shapeSpec(
            seed,
            [
              lobe([-0.55, 0.05, 0], [between(info.id, 1, 0.62, 0.78), 0.42, 0.36]),
              lobe([0.55, -0.04, 0], [between(info.id, 2, 0.62, 0.78), 0.44, 0.38])
            ],
            { blend: 0.15, lumps: 0.05, craters: dense * 1.4 }
          ),
          tilt: between(info.id, 5, -0.5, 0.5)
        }
      : {
          family: 'elongated',
          spec: shapeSpec(
            seed,
            ball([
              between(info.id, 1, 1.15, 1.4),
              between(info.id, 2, 0.75, 0.9),
              between(info.id, 3, 0.6, 0.78)
            ]),
            { lumps: between(info.id, 4, 0.06, 0.1), lumpFreq: 1.9, craters: dense * 1.2, craterDepth: 0.2 }
          ),
          tilt: between(info.id, 5, -0.5, 0.5)
        };
  if (pick < 0.4)
    return {
      family: 'top',
      spec: shapeSpec(
        seed,
        [lobe(SPIN_UP, [1, between(info.id, 1, 0.88, 0.97), 1], between(info.id, 2, 1.55, 1.8))],
        {
          ridge: between(info.id, 3, 0.03, 0.06),
          ridgeWidth: 0.11,
          lumps: 0.035,
          craters: dense * 0.4,
          craterDepth: 0.12,
          boulders: 50
        }
      ),
      tilt: between(info.id, 5, -0.5, 0.5)
    };
  if (pick < 0.65)
    return {
      family: 'contact',
      spec: shapeSpec(
        seed,
        [
          lobe([-0.3, 0, 0], [between(info.id, 1, 0.7, 0.85), 0.5, 0.44]),
          lobe([0.42, 0.02, 0], [between(info.id, 2, 0.42, 0.5), 0.3, 0.28])
        ],
        { blend: 0.1, lumps: 0.05, craters: dense * 0.3, craterDepth: 0.12, boulders: 60 }
      ),
      tilt: between(info.id, 5, -0.5, 0.5)
    };
  return {
    family: 'elongated',
    spec: shapeSpec(
      seed,
      ball([between(info.id, 1, 1.1, 1.35), between(info.id, 2, 0.75, 0.9), between(info.id, 3, 0.6, 0.78)]),
      { lumps: between(info.id, 4, 0.05, 0.09), craters: dense * 0.6, craterDepth: 0.14, boulders: 30 }
    ),
    tilt: between(info.id, 5, -0.5, 0.5)
  };
}

const cache = new Map<string, SmallBody>();

export function smallBody(info: SmallInfo): SmallBody {
  const id = info.id.toLowerCase();
  let b = cache.get(id);
  if (!b) {
    const type = known(info.type),
      named = NAMED[id] ?? generic({ ...info, id }, type);
    b = {
      key: id,
      name: info.name,
      type,
      family: named.family,
      spec: named.spec,
      rock: {
        ...ROCK[named.family],
        ...(named.spec.boulders >= RUBBLE_FROM ? RUBBLE : {}),
        ...named.rock,
        ...(named.family === 'nucleus' && named.spec.lobes.length === 1 ? { waist: true } : {})
      },
      tilt: named.tilt ?? between(id, 5, -0.5, 0.5),
      phase: between(id, 7, 0, Math.PI * 2)
    };
    cache.set(id, b);
  }
  return b;
}

export const NAMED_BODIES: readonly string[] = Object.keys(NAMED);
