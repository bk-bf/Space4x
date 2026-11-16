import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BALDING,
  BEARDS,
  BROWS,
  EYE,
  EYES,
  GEARS,
  GREY,
  HAIR,
  HAIRS,
  HEAD_H,
  HEAD_W,
  MOUTHS,
  PORTRAIT_H,
  PORTRAIT_STYLES,
  PORTRAIT_W,
  ROLLS,
  SKIN,
  hairFor,
  hairGenders,
  portraitBust,
  portraitHead,
  traitsOf,
  type BeardId,
  type Branch,
  type BrowId,
  type EyeId,
  type GearId,
  type Gender,
  type HairId,
  type MouthId,
  type PortraitSpec,
  type PortraitStyle,
  type TraitOverrides
} from './index.ts';
import hashes from './mockup-hashes.json';

const sha = (pixels: Uint8ClampedArray) => createHash('sha1').update(pixels).digest('hex');

const BASE: TraitOverrides = {
  gear: 'none',
  cap: false,
  beard: 'none',
  skin: SKIN[1]!,
  hair: HAIR[2]!,
  eye: EYE[2]!,
  earring: false,
  shadow: false,
  lip: null,
  gaunt: false,
  eyes: 'narrow',
  brow: 'stern',
  mouth: 'firm'
};
const MAN: PortraitSpec = { seed: 31, age: 38, rank: 2, branch: 'staff', gender: 'm' };
const WOMAN: PortraitSpec = { seed: 44, age: 34, rank: 2, branch: 'staff', gender: 'f' };

interface OptionCase {
  name: string;
  spec: PortraitSpec;
  over: TraitOverrides;
}

const optionCases = (): OptionCase[] => {
  const cases: OptionCase[] = [];
  const add = (name: string, spec: PortraitSpec, over: TraitOverrides) =>
    cases.push({ name, spec, over: { ...BASE, ...over } });
  for (const k of hairFor('m')) add(`hair-m:${k}`, MAN, { style: k });
  for (const k of hairFor('f')) add(`hair-f:${k}`, WOMAN, { style: k });
  for (const k of Object.keys(BEARDS) as BeardId[]) add(`beard:${k}`, MAN, { beard: k, style: 'crop' });
  for (const k of Object.keys(EYES) as EyeId[]) {
    add(`eyes-m:${k}`, MAN, { eyes: k, style: 'crop' });
    add(`eyes-f:${k}`, WOMAN, { eyes: k, style: 'bun' });
  }
  for (const k of Object.keys(BROWS) as BrowId[]) {
    add(`brow-m:${k}`, MAN, { brow: k, style: 'buzz' });
    add(`brow-f:${k}`, WOMAN, { brow: k, style: 'bun' });
  }
  for (const k of Object.keys(MOUTHS) as MouthId[]) {
    add(`mouth-m:${k}`, MAN, { mouth: k, style: 'crop' });
    add(`mouth-f:${k}`, WOMAN, { mouth: k, style: 'bun' });
  }
  for (const k of Object.keys(GEARS).filter((g) => g !== 'none') as GearId[])
    add(`gear:${k}`, MAN, { gear: k, style: 'crop' });
  add('cap:bob', WOMAN, { cap: true, style: 'bob' });
  return cases;
};

const specOfKey = (key: string): [PortraitSpec, PortraitStyle] => {
  const [seed, age, rank, branch, gender, style] = key.split(':');
  return [
    { seed: +seed!, age: +age!, rank: +rank!, branch: branch as Branch, gender: gender as Gender },
    style as PortraitStyle
  ];
};

describe('portraits drawn like the mockup', () => {
  it('draws every rolled bust with the same pixels', () => {
    const wrong = Object.entries(hashes.rolled.bust).filter(([key, expected]) => {
      const [spec, style] = specOfKey(key);
      return sha(portraitBust(spec, style).pixels) !== expected;
    });
    expect(wrong.map(([key]) => key)).toEqual([]);
    expect(Object.keys(hashes.rolled.bust).length).toBe(480);
  }, 60_000);

  it('crops every head from the same picture as the mockup', () => {
    const wrong = Object.entries(hashes.rolled.head).filter(([key, expected]) => {
      const [spec, style] = specOfKey(key);
      return sha(portraitHead(spec, style).pixels) !== expected;
    });
    expect(wrong.map(([key]) => key)).toEqual([]);
  }, 60_000);

  it('draws every catalogue option with the same pixels', () => {
    const cases = optionCases();
    const wrong: string[] = [];
    for (const style of ['gritty', 'clean'] as const)
      for (const c of cases) {
        const expected = (hashes.options.bust as Record<string, string>)[`${c.name}:${style}`];
        if (sha(portraitBust(c.spec, style, c.over).pixels) !== expected) wrong.push(`${c.name}:${style}`);
      }
    expect(wrong).toEqual([]);
    expect(Object.keys(hashes.options.bust).length).toBe(cases.length * 2);
  });
});

describe('the same officer, the same face', () => {
  const spec: PortraitSpec = { seed: 17, age: 44, rank: 3, branch: 'staff', gender: 'f' };

  it('returns identical pixels for the same arguments', () => {
    const again = { ...spec };
    expect(sha(portraitBust(again).pixels)).toBe(sha(portraitBust(spec).pixels));
    expect(portraitHead(again).url).toBe(portraitHead(spec).url);
  });

  it('rolls the face at one age and rank when asked, so it never changes as they age or rise', () => {
    const rolledAt = { age: 40, rank: 2 };
    const FACE = ['skin', 'eye', 'jaw', 'eyes', 'brow', 'nose', 'mouth', 'beard', 'gear', 'style'] as const;
    for (const gender of ['m', 'f'] as const)
      for (let seed = 0; seed < 60; seed++) {
        const at = (age: number, rank: number) =>
          traitsOf({ seed, age, rank, branch: 'staff', gender, rolledAt });
        const start = at(40, 2);
        for (const [age, rank] of [
          [28, 0],
          [47, 3],
          [58, 4],
          [71, 5]
        ] as const)
          for (const k of FACE) expect(at(age, rank)[k]).toEqual(start[k]);
      }
  });

  it('rolls the same picture as an unrolled spec when asked at the age and a rank that can wear a cap', () => {
    const plain: PortraitSpec = { seed: 12, age: 52, rank: 3, branch: 'staff', gender: 'm' };
    const rolled: PortraitSpec = { ...plain, rolledAt: { age: 52, rank: 3 } };
    expect(sha(portraitBust(rolled).pixels)).toBe(sha(portraitBust(plain).pixels));
  });

  it('only shows a cap on a rank that can wear one', () => {
    const rolledAt = { age: 45, rank: 2 };
    const capped = Array.from({ length: 60 }, (_, seed) => seed).filter(
      (seed) => traitsOf({ seed, age: 45, rank: 4, branch: 'staff', gender: 'm', rolledAt }).cap
    );
    expect(capped.length).toBeGreaterThan(0);
    for (const seed of capped)
      expect(traitsOf({ seed, age: 45, rank: 1, branch: 'staff', gender: 'm', rolledAt }).cap).toBe(false);
  });

  it('greys the hair with age', () => {
    const seeds = Array.from({ length: 80 }, (_, i) => i);
    const greyShare = (age: number) =>
      seeds.filter((seed) => (GREY as readonly unknown[]).includes(traitsOf({ ...spec, seed, age }).hair))
        .length / seeds.length;
    expect(greyShare(25)).toBe(0);
    expect(greyShare(66)).toBe(1);
    expect(greyShare(52)).toBeGreaterThan(greyShare(25));
  });

  it('draws a different picture when the post changes the uniform', () => {
    expect(sha(portraitBust({ ...spec, branch: 'governor' }).pixels)).not.toBe(
      sha(portraitBust(spec).pixels)
    );
  });

  it('draws the two styles differently', () => {
    expect(sha(portraitBust(spec, 'clean').pixels)).not.toBe(sha(portraitBust(spec, 'gritty').pixels));
    expect(PORTRAIT_STYLES.map((s) => s.id)).toEqual(['clean', 'gritty']);
  });
});

describe('gender rules', () => {
  const seeds = Array.from({ length: 400 }, (_, i) => i);
  const rolled = (gender: Gender, age: number) =>
    seeds.map((seed) => traitsOf({ seed, age, rank: 3, branch: 'staff', gender }));

  it('gives no woman a beard, and only women hair styles she can roll', () => {
    for (const age of [28, 45, 60]) {
      for (const t of rolled('f', age)) {
        expect(t.beard).toBe('none');
        expect(hairGenders(t.style)).toContain('f');
        expect(BALDING).not.toContain(t.style);
        expect(ROLLS.eyes.f).toContain(t.eyes === 'tired' ? ROLLS.eyes.f[0] : t.eyes);
        expect(t.lip === null || t.lip.length === 3).toBe(true);
      }
    }
  });

  it('rolls balding and receding on men only, more often when older', () => {
    const balding = (age: number) => rolled('m', age).filter((t) => BALDING.includes(t.style)).length;
    expect(balding(30)).toBeGreaterThan(0);
    expect(balding(60)).toBeGreaterThan(balding(30));
    for (const t of rolled('m', 60)) expect(hairGenders(t.style)).toContain('m');
    expect(hairFor('f').filter((k) => BALDING.includes(k))).toEqual([]);
  });

  it('gives men every beard option and women none but clean shaven', () => {
    const beards = new Set(rolled('m', 40).map((t) => t.beard));
    expect([...beards].sort()).toEqual(Object.keys(BEARDS).sort());
    expect(new Set(ROLLS.beard.f)).toEqual(new Set(['none']));
  });

  it('lists which gender can roll each hair style', () => {
    for (const id of Object.keys(HAIRS) as HairId[]) expect(hairGenders(id).length).toBeGreaterThan(0);
    expect(hairGenders('pixie')).toEqual(['f']);
    expect(hairGenders('crop')).toEqual(['m']);
    expect(hairGenders('buzz')).toEqual(['m', 'f']);
    expect(hairFor('m').length + hairFor('f').length).toBeGreaterThan(Object.keys(HAIRS).length);
  });
});

describe('catalogue', () => {
  it('draws every option on a visible, opaque picture of the right size', () => {
    for (const c of optionCases()) {
      const s = portraitBust(c.spec, 'gritty', c.over);
      expect(s.width).toBe(PORTRAIT_W);
      expect(s.height).toBe(PORTRAIT_H);
      expect(s.pixels.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
      expect(s.url.startsWith('data:image/png;base64,')).toBe(true);
    }
  });

  it('draws every option differently from the plain base picture', () => {
    const crop = sha(portraitBust(MAN, 'gritty', { ...BASE, style: 'crop' }).pixels);
    const seen = new Set<string>();
    for (const k of Object.keys(BEARDS).filter((b) => b !== 'none') as BeardId[]) {
      const h = sha(portraitBust(MAN, 'gritty', { ...BASE, style: 'crop', beard: k }).pixels);
      expect(h).not.toBe(crop);
      seen.add(h);
    }
    expect(seen.size).toBe(Object.keys(BEARDS).length - 1);
  });

  it('crops a head of the size the tiles use', () => {
    const h = portraitHead(MAN);
    expect([h.width, h.height]).toEqual([HEAD_W, HEAD_H]);
  });
});

describe('portrait cache', () => {
  it('renders each picture once', () => {
    expect(portraitBust(MAN)).toBe(portraitBust({ ...MAN }));
    expect(portraitHead(MAN)).toBe(portraitHead({ ...MAN }));
    expect(portraitBust(MAN, 'clean')).toBe(portraitBust(MAN, 'clean'));
    expect(portraitBust(MAN, 'clean')).not.toBe(portraitBust(MAN, 'gritty'));
    const rolled = { ...MAN, rolledAt: { age: 30, rank: 2 } };
    expect(portraitBust(rolled)).toBe(portraitBust({ ...rolled }));
    expect(portraitBust({ ...MAN, age: 70, rolledAt: { age: 30, rank: 2 } })).not.toBe(
      portraitBust({ ...MAN, age: 70, rolledAt: { age: 60, rank: 2 } })
    );
    const over = { ...BASE, style: 'bald' as const };
    expect(portraitBust(MAN, 'gritty', over)).toBe(portraitBust(MAN, 'gritty', { ...over }));
  });
});
