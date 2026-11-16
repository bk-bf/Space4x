import type { RGB } from '#lib/gfx/palette.ts';
import { toward, type Stops } from './colour.ts';
import { craterLook } from './cratered.ts';
import { rng } from './math.ts';
import { clamp, contour, warped } from './terrain.ts';
import type { Look } from './types.ts';

export type FamilyKind = 'ice' | 'rock' | 'captured';

export const FAMILY_KINDS: readonly FamilyKind[] = ['ice', 'rock', 'captured'];

type Tint = readonly [number, number, number];

const TINTS: Record<FamilyKind, readonly Tint[]> = {
  ice: [
    [1, 1, 1],
    [0.94, 0.98, 1.06],
    [1.05, 1.0, 0.92],
    [1.04, 0.95, 0.95]
  ],
  rock: [
    [1.1, 1, 0.9],
    [1, 1, 1],
    [1.05, 1.02, 0.9],
    [0.95, 0.98, 1.04]
  ],
  captured: [
    [1, 1, 1],
    [1.18, 0.98, 0.86],
    [0.96, 1, 1.06],
    [1.1, 1.04, 0.92]
  ]
};

const scaled = (base: number, tint: Tint, k: number): RGB => [
  clamp(base * k * tint[0], 0, 255),
  clamp(base * k * tint[1], 0, 255),
  clamp(base * k * tint[2], 0, 255)
];

const palette = (base: number, tint: Tint, lo: number, hi: number): Stops => [
  [0, scaled(base, tint, lo)],
  [0.5, scaled(base, tint, 1)],
  [1, scaled(base, tint, hi)]
];

export function familyLook(kind: FamilyKind, seed: number, round = false): Look {
  const r = rng(seed * 7919 + kind.length * 104729),
    tint = TINTS[kind][Math.floor(r() * 4)]!,
    base = kind === 'ice' ? 150 + r() * 90 : kind === 'rock' ? 96 + r() * 70 : 82 + r() * 70,
    contrast = kind === 'ice' ? 0.8 : 1.15,
    density = kind === 'ice' ? 0.3 + r() * 0.5 : kind === 'rock' ? 0.55 + r() * 0.35 : 0.3 + r() * 0.35,
    elong =
      kind === 'ice'
        ? r() < 0.5
          ? 0
          : 0.3 + r() * 0.3
        : kind === 'rock'
          ? 0.15 + r() * 0.4
          : 0.3 + r() * 0.45,
    shape: readonly [number, number, number] | undefined =
      elong || kind !== 'ice' ? [1, 1 - elong * (0.5 + r() * 0.5), 1 - elong * (0.3 + r() * 0.6)] : undefined,
    big = r() < 0.4,
    groove = kind === 'ice' && r() < 0.4,
    dichot = r() < 0.3 ? (r() - 0.5) * 1.2 : 0,
    dAxis = [r() - 0.5, r() - 0.5, r() - 0.5] as const,
    fresh = 0.03 + r() * 0.08,
    spots = kind === 'captured' ? r() < 0.6 : r() < 0.4,
    seed2 = seed * 5 + 3,
    flat = kind === 'captured',
    lumpy =
      round || !shape
        ? undefined
        : {
            amp: kind === 'ice' ? 0.1 : kind === 'rock' ? 0.2 : 0.28,
            lump: kind === 'ice' ? 0.05 : kind === 'rock' ? 0.1 : 0.16,
            dent: kind === 'ice' ? 0.12 : 0.22,
            ridge: 0.05,
            face: 64
          },
    groovePattern = (x: number, y: number, z: number) => contour(warped(x, y, z, 2.4, 1.2, seed2, 3), 0.025),
    dark = scaled(base, tint, 0.55);
  const facing = r() * 360,
    f1 = 1.4 + r() * 0.8,
    d1 = 0.55 + r() * 0.3,
    f2 = 3 + r(),
    f3 = 6 + r() * 2,
    bigAt = big ? { lon: (r() - 0.5) * 300, lat: (r() - 0.5) * 100, rad: 0.2 + r() * 0.2 } : null,
    noiseFreq = 3 + r() * 3,
    noiseAmt = 0.8 + r() * 0.6;
  return craterLook({
    id: `${kind}:${seed}${round ? ':round' : ''}`,
    seed: seed2,
    face: 96,
    hs: 0.5,
    bump: 1.4,
    facing,
    shape: round ? undefined : shape,
    lumpy,
    layers: [
      { f: f1, dn: density, rmin: 0.2, rmax: 0.32, depth: d1, flat },
      { f: f2, dn: density + 0.1, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh, flat },
      { f: f3, dn: Math.min(0.95, density + 0.2), rmin: 0.14, rmax: 0.3, depth: 0.45, fresh }
    ],
    features: bigAt ? [{ ...bigAt, depth: 0.8, peak: true }] : [],
    extraH: groove ? (x, y, z) => -groovePattern(x, y, z) * 0.012 : undefined,
    extraScale: 8,
    m1: groove ? groovePattern : undefined,
    m2: (x, y, z) => x * dAxis[0] + y * dAxis[1] + z * dAxis[2],
    noiseFreq,
    noiseAmt,
    palette: palette(base, tint, 1 - contrast * 0.5, 1 + contrast * 0.5),
    bright: scaled(Math.min(255, base * 1.5 + 30), tint, 1),
    brightAmt: 1,
    floor: kind === 'rock' ? scaled(base, tint, 0.5) : undefined,
    floorAmt: 1.4,
    post: (_x, _y, _z, _R, _dv, G, O) => {
      if (G[3] > 0.03) toward(O, dark, clamp(G[3] * 0.6, 0, 0.6));
      if (dichot)
        toward(
          O,
          dichot > 0 ? [20, 16, 14] : [250, 250, 250],
          clamp(Math.abs(dichot) * (G[4] * 0.8) * 0.5, 0, 0.5)
        );
      if (spots && G[2] > 0.6) toward(O, [226, 228, 232], clamp((G[2] - 0.6) * 5, 0, 0.85));
    }
  });
}
