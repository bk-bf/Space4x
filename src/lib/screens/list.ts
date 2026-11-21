import type { IconName } from '#lib/gfx/icons.ts';
import { gallery } from '#lib/shell/mode.ts';

const ALL = [
  { id: 'map', title: 'System map', icon: 'map', key: 'F1', mock: false },
  { id: 'economy', title: 'Economy', icon: 'factory', key: 'F2', mock: false },
  { id: 'research', title: 'Research', icon: 'flask', key: 'F3', mock: false },
  { id: 'classes', title: 'Ship classes', icon: 'ship', key: 'F4', mock: false },
  { id: 'robots', title: 'Robots', icon: 'wrench', key: 'F5', mock: false },
  { id: 'ground', title: 'Ground forces', icon: 'tank', key: 'F6', mock: true },
  { id: 'commanders', title: 'Commanders', icon: 'star', key: 'F7', mock: true },
  { id: 'intel', title: 'Intelligence', icon: 'eye', key: 'F8', mock: true },
  { id: 'galaxy', title: 'Galaxy', icon: 'net', key: 'F9', mock: true }
] as const satisfies readonly { id: string; title: string; icon: IconName; key: string; mock: boolean }[];

export const SCREENS = ALL.filter((s) => gallery || !s.mock);

export type ScreenId = (typeof ALL)[number]['id'];

export const isScreenId = (id: string | null | undefined): id is ScreenId => SCREENS.some((s) => s.id === id);
