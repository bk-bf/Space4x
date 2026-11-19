import type { IconName } from '#lib/gfx/icons.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';
import type { Tip } from './tooltip.ts';

export interface Chip {
  icon?: IconName;
  text: string | number;
  tone?: 'hot' | 'cool';
  tip?: Tip;
}

export interface IconItem {
  icon: IconRef;
  amount?: string;
  need?: string;
  ok?: boolean;
  note?: string;
  noteTone?: 'hot' | 'cool' | 'dim';
  tip?: Tip;
  onpick?: () => void;
}

export interface FilterItem {
  id: string;
  label?: string;
  count?: number;
  icon?: IconRef | IconName;
  tip?: Tip;
}
