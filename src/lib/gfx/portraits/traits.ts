import type { Color } from '../icons/pixels.ts';
import {
  BACKDROPS,
  BALDING,
  EYE,
  GREY,
  HAIR,
  hairFor,
  SKIN,
  type BeardId,
  type BrowId,
  type EyeId,
  type Gender,
  type GearId,
  type HairId,
  type MouthId,
  type Ramp3,
  type Ramp4
} from './catalogue.ts';

export interface PortraitSpec {
  seed: number;
  age: number;
  rank: number;
  branch: 'staff' | 'ground' | 'governor';
  gender: Gender;
}

export interface Traits {
  gender: Gender;
  skin: Ramp4;
  eye: Color;
  bg: Ramp3;
  age: number;
  rank: number;
  hair: Ramp4;
  style: HairId;
  jaw: number;
  eyes: EyeId;
  brow: BrowId;
  nose: number;
  mouth: MouthId;
  lip: Color | null;
  gaunt: boolean;
  beard: BeardId;
  gear: GearId;
  cap: boolean;
  jag: number;
  earring: boolean;
  shadow: boolean;
}

export type TraitOverrides = Partial<Traits>;

export const ROLLS = {
  eyes: {
    f: ['open', 'open', 'narrow', 'sharp', 'hooded'],
    m: ['narrow', 'narrow', 'open', 'hooded', 'sharp', 'squint']
  },
  brow: {
    f: ['arch', 'arch', 'stern', 'raised', 'flat'],
    m: ['stern', 'stern', 'flat', 'raised', 'heavy']
  },
  mouth: {
    f: ['full', 'full', 'firm', 'smirk', 'smile', 'thin'],
    m: ['firm', 'firm', 'smirk', 'down', 'thin', 'wide', 'grit']
  },
  beard: {
    f: ['none'],
    m: [
      'none',
      'none',
      'none',
      'none',
      'shadow',
      'stubble',
      'stubble',
      'mustache',
      'handlebar',
      'soul',
      'goatee',
      'vandyke',
      'chops',
      'chinstrap',
      'full',
      'full',
      'long'
    ]
  },
  gear: [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'shades',
    'patch',
    'implant',
    'headset',
    'scar',
    'scar'
  ]
} as const satisfies {
  eyes: Record<Gender, readonly EyeId[]>;
  brow: Record<Gender, readonly BrowId[]>;
  mouth: Record<Gender, readonly MouthId[]>;
  beard: Record<Gender, readonly BeardId[]>;
  gear: readonly GearId[];
};

export function rng(seed: number): () => number {
  let a = (seed * 2654435761 + 977) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)]!;

export function traitsOf(spec: PortraitSpec): Traits {
  const { seed, age, rank, gender } = spec;
  const r = rng(seed),
    f = gender === 'f',
    grey = Math.max(0, Math.min(1, (age - 40) / 26));
  const skin = SKIN[Math.floor(r() * 6)]!;
  const eye = EYE[Math.floor(r() * (r() < 0.12 ? 10 : 7))]!;
  const bg = pick(r, BACKDROPS);
  const hair = r() < grey ? (age > 60 && r() < 0.6 ? GREY[1] : GREY[0]) : pick(r, HAIR);
  let style = pick(
    r,
    hairFor(gender).filter((k) => !BALDING.includes(k))
  );
  if (!f && r() < (age > 50 ? 0.4 : 0.08)) style = pick(r, BALDING);
  const jaw = Math.floor(r() * 3);
  let eyes: EyeId = pick(r, ROLLS.eyes[gender]);
  if (age > 55 && r() < 0.4) eyes = 'tired';
  const brow = pick(r, ROLLS.brow[gender]);
  const nose = Math.floor(r() * (f ? 2 : 3));
  const mouth = pick(r, ROLLS.mouth[gender]);
  const lip: Color | null = f
    ? pick<Color | null>(r, [null, null, [190, 50, 70], [150, 56, 96], [214, 104, 90]])
    : null;
  const gaunt = r() < (f ? 0.15 : 0.45);
  const beard: BeardId = f ? 'none' : pick(r, ROLLS.beard.m);
  const gear = pick(r, ROLLS.gear);
  const cap = rank >= 2 && r() < 0.3;
  const jag = Math.floor(r() * 3);
  const earring = f && r() < 0.4;
  const shadow = f && r() < 0.3;
  return {
    gender: f ? 'f' : 'm',
    skin,
    eye,
    bg,
    age,
    rank,
    hair,
    style,
    jaw,
    eyes,
    brow,
    nose,
    mouth,
    lip,
    gaunt,
    beard,
    gear,
    cap,
    jag,
    earring,
    shadow
  };
}
