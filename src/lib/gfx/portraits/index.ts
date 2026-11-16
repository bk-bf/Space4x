import { Pix } from '../icons/pixels.ts';
import { sprite, type Sprite } from '../icons/sprite.ts';
import { HEAD_H, HEAD_W, HEAD_X, HEAD_Y, PORTRAIT_H, PORTRAIT_W, type PortraitStyle } from './catalogue.ts';
import { drawPortrait } from './draw.ts';
import { traitsOf, type PortraitSpec, type TraitOverrides } from './traits.ts';

export {
  BACKDROPS,
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
  PORTRAIT_W,
  SKIN,
  UNIFORM,
  hairFor,
  hairGenders,
  type BeardId,
  type Branch,
  type BrowId,
  type EyeId,
  type GearId,
  type Gender,
  type HairId,
  type MouthId,
  type PortraitStyle
} from './catalogue.ts';
export { ROLLS, traitsOf, type PortraitSpec, type TraitOverrides, type Traits } from './traits.ts';

export const PORTRAIT_STYLES: readonly { id: PortraitStyle; name: string; note: string }[] = [
  { id: 'clean', name: 'Clean', note: 'Full colour.' },
  { id: 'gritty', name: 'Gritty', note: 'Muted colour, darker.' }
];

export const DEFAULT_PORTRAIT_STYLE: PortraitStyle = 'gritty';

const keyOf = (spec: PortraitSpec, style: PortraitStyle, over?: TraitOverrides): string =>
  [spec.seed, spec.age, spec.rank, spec.branch, spec.gender, style, over ? JSON.stringify(over) : ''].join(
    ':'
  );

const images = new Map<string, Pix>();

function image(spec: PortraitSpec, style: PortraitStyle, over?: TraitOverrides): [string, Pix] {
  const key = keyOf(spec, style, over);
  let im = images.get(key);
  if (!im) {
    im = new Pix(PORTRAIT_W, PORTRAIT_H);
    drawPortrait(im, { ...traitsOf(spec), ...over }, spec.branch, style === 'gritty');
    images.set(key, im);
  }
  return [key, im];
}

export function portraitBust(
  spec: PortraitSpec,
  style: PortraitStyle = DEFAULT_PORTRAIT_STYLE,
  over?: TraitOverrides
): Sprite {
  const [key, src] = image(spec, style, over);
  return sprite(
    `pb:${key}`,
    PORTRAIT_W,
    PORTRAIT_H,
    (im) => {
      im.d.set(src.d);
    },
    false
  );
}

export function portraitHead(
  spec: PortraitSpec,
  style: PortraitStyle = DEFAULT_PORTRAIT_STYLE,
  over?: TraitOverrides
): Sprite {
  const [key, src] = image(spec, style, over);
  return sprite(
    `pm:${key}`,
    HEAD_W,
    HEAD_H,
    (im) => {
      for (let y = 0; y < HEAD_H; y++)
        for (let x = 0; x < HEAD_W; x++) im.set(x, y, src.get(x + HEAD_X, y + HEAD_Y));
    },
    false
  );
}
