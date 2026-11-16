import { familyLook, FAMILY_KINDS, type FamilyKind } from './families.ts';
import { ariel, miranda, oberon, titania, umbriel } from './uranian.ts';
import { callisto, europa, ganymede, io } from './jovian.ts';
import { charon, eris, haumea, makemake, pluto, triton } from './outer.ts';
import { dione, enceladus, hyperion, iapetus, mimas, rhea, tethys, titan } from './saturnian.ts';
import { ceres, deimos, phobos } from './small.ts';
import { earth, jupiter, mars, neptune, saturn, uranus, venus } from './planets.ts';
import { mercury } from './mercury.ts';
import { moon } from './moon.ts';
import type { Look } from './types.ts';

const NAMED: Readonly<Record<string, () => Look>> = {
  mercury,
  venus,
  earth,
  luna: moon,
  mars,
  phobos,
  deimos,
  ceres,
  jupiter,
  io,
  europa,
  ganymede,
  callisto,
  saturn,
  mimas,
  enceladus,
  tethys,
  dione,
  rhea,
  titan,
  hyperion,
  iapetus,
  uranus,
  miranda,
  ariel,
  umbriel,
  titania,
  oberon,
  neptune,
  triton,
  pluto,
  charon,
  eris,
  haumea,
  makemake
};

export const NAMED_LOOKS: readonly string[] = Object.keys(NAMED);

export const familyId = (kind: FamilyKind, seed: number, round = false): string =>
  `${kind}:${seed}${round ? ':round' : ''}`;

const ORIENTATION: Readonly<Record<string, { tilt: number; pitch?: number }>> = {
  luna: { tilt: 0.1 },
  phobos: { tilt: 0.1 },
  deimos: { tilt: 0.1 },
  ceres: { tilt: 0.05 },
  io: { tilt: 0.05 },
  europa: { tilt: 0.05 },
  ganymede: { tilt: 0.05 },
  callisto: { tilt: 0.05 },
  mimas: { tilt: 0.05 },
  enceladus: { tilt: 0.05, pitch: -0.7 },
  tethys: { tilt: 0.05 },
  dione: { tilt: 0.05 },
  rhea: { tilt: 0.05 },
  titan: { tilt: 0.05 },
  hyperion: { tilt: 0.1 },
  iapetus: { tilt: 0.05 },
  miranda: { tilt: 0.05 },
  ariel: { tilt: 0.05 },
  umbriel: { tilt: 0.05 },
  titania: { tilt: 0.05 },
  oberon: { tilt: 0.05 },
  triton: { tilt: 0.05, pitch: -0.55 },
  pluto: { tilt: 0.1 },
  charon: { tilt: 0.1, pitch: 0.5 },
  eris: { tilt: 0.1 },
  haumea: { tilt: 0.1 },
  makemake: { tilt: 0.1 }
};

const made = new Map<string, Look>();

export function lookById(id: string): Look | undefined {
  let look = made.get(id);
  if (look) return look;
  const named = NAMED[id];
  if (named) {
    look = named();
    Object.assign(look, ORIENTATION[id]);
  } else {
    const [kind, seed, round] = id.split(':');
    if (FAMILY_KINDS.includes(kind as FamilyKind) && seed && Number.isInteger(Number(seed)))
      look = familyLook(kind as FamilyKind, Number(seed), round === 'round');
  }
  if (look) made.set(id, look);
  return look;
}
