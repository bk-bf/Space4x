import { clamp, mix } from '../math';
import type { RGB } from '../palette';

export const NL = 6;
const NM = 24;

export const M = {
  hull: 1,
  hull2: 2,
  dark: 3,
  armor: 4,
  accent: 5,
  white: 6,
  engine: 7,
  radiator: 8,
  solar: 9,
  glass: 10,
  gold: 11,
  rust: 12,
  teal: 13,
  yellow: 14,
  truss: 15,
  char: 16,
  hazard: 17,
  pit: 18,
  deck: 19,
  red: 20
} as const;

type MaterialName = keyof typeof M;

const BASE: Record<MaterialName, RGB> = {
  hull: [146, 154, 176],
  hull2: [172, 180, 200],
  dark: [58, 60, 84],
  armor: [112, 118, 142],
  accent: [242, 179, 93],
  white: [226, 230, 238],
  engine: [74, 76, 98],
  radiator: [200, 84, 52],
  solar: [44, 74, 170],
  glass: [110, 220, 230],
  gold: [214, 170, 84],
  rust: [168, 96, 58],
  teal: [62, 140, 140],
  yellow: [226, 190, 84],
  truss: [96, 100, 126],
  char: [44, 34, 42],
  hazard: [230, 180, 60],
  pit: [16, 14, 26],
  deck: [48, 50, 72],
  red: [200, 70, 64]
};

const SHADOW: RGB = [24, 18, 58];
const GLARE: RGB = [255, 246, 220];
const STEPS = [0.2, 0.36, 0.56, 0.78, 1, 1.22];

function ramp(b: RGB): RGB[] {
  return STEPS.map((f) => {
    let c = [b[0] * f, b[1] * f, b[2] * f];
    if (f < 1) c = c.map((v, i) => mix(v, SHADOW[i]!, (1 - f) * 0.42));
    else if (f > 1) c = b.map((v, i) => mix(v, GLARE[i]!, 0.4));
    return [
      clamp(Math.round(c[0]!), 0, 255),
      clamp(Math.round(c[1]!), 0, 255),
      clamp(Math.round(c[2]!), 0, 255)
    ];
  });
}

function palette(over: Partial<Record<MaterialName, RGB>>): Uint8Array {
  const p = new Uint8Array(NM * NL * 3);
  for (const [k, id] of Object.entries(M) as [MaterialName, number][])
    ramp(over[k] ?? BASE[k]).forEach((c, l) => p.set(c, (id * NL + l) * 3));
  return p;
}

export const LIVERIES = {
  navy: palette({}),
  civ: palette({
    hull: [178, 170, 158],
    hull2: [200, 192, 178],
    armor: [142, 134, 126],
    accent: [70, 150, 160]
  }),
  foe: palette({
    hull: [150, 64, 70],
    hull2: [178, 82, 80],
    armor: [106, 46, 64],
    accent: [34, 28, 44],
    dark: [52, 28, 44],
    engine: [62, 36, 52],
    truss: [98, 52, 66],
    white: [240, 200, 180],
    glass: [255, 150, 90],
    deck: [44, 26, 40]
  })
};

export type Livery = keyof typeof LIVERIES;

export const SYSTEMS = {
  hull: [112, 118, 142],
  armor: [134, 140, 164],
  prop: [240, 130, 60],
  power: [240, 210, 90],
  weapon: [232, 78, 78],
  sensor: [95, 208, 197],
  crew: [110, 200, 110],
  bridge: [150, 220, 150],
  store: [176, 124, 80],
  hangar: [170, 120, 220],
  dock: [200, 200, 210]
} as const satisfies Record<string, RGB>;

export type SystemKind = keyof typeof SYSTEMS;

export const SYSTEM_KINDS = Object.keys(SYSTEMS) as SystemKind[];

export const SYSTEM_RAMPS = new Uint8Array(SYSTEM_KINDS.length * NL * 3);
SYSTEM_KINDS.forEach((k, n) => ramp(SYSTEMS[k]).forEach((c, l) => SYSTEM_RAMPS.set(c, (n * NL + l) * 3)));

export const PLATED = new Uint8Array(NM);
PLATED[M.hull] = PLATED[M.hull2] = PLATED[M.armor] = PLATED[M.accent] = 1;

export const EMISSIVE: readonly (RGB | null)[] = [
  null,
  [255, 214, 120],
  [110, 220, 230],
  [255, 70, 60],
  [90, 240, 120],
  [255, 255, 255],
  null,
  [120, 240, 255],
  [255, 120, 60],
  [255, 240, 200],
  [150, 250, 255],
  [255, 230, 160]
];
