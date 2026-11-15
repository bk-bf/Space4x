import type { IconName } from '#lib/gfx/icons.ts';

export const SCREENS = [
  { id: 'map', title: 'System map', icon: 'map', key: 'F1' },
  { id: 'economy', title: 'Economy', icon: 'factory', key: 'F2' },
  { id: 'research', title: 'Research', icon: 'flask', key: 'F3' },
  { id: 'classes', title: 'Ship classes', icon: 'ship', key: 'F4' },
  { id: 'colony', title: 'Colony', icon: 'dome', key: 'F5' },
  { id: 'ground', title: 'Ground forces', icon: 'tank', key: 'F6' },
  { id: 'commanders', title: 'Commanders', icon: 'star', key: 'F7' },
  { id: 'intel', title: 'Intelligence', icon: 'eye', key: 'F8' },
  { id: 'galaxy', title: 'Galaxy', icon: 'net', key: 'F9' }
] as const satisfies readonly { id: string; title: string; icon: IconName; key: string }[];

export type ScreenId = (typeof SCREENS)[number]['id'];

export const isScreenId = (id: string | null | undefined): id is ScreenId => SCREENS.some((s) => s.id === id);
