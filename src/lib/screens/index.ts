import type { Component } from 'svelte';
import { SCREENS, type ScreenId } from './list';

export { SCREENS, isScreenId, type ScreenId } from './list';

const components = import.meta.glob<{ default: Component }>('./*/Screen.svelte', { eager: true });

import.meta.glob('./*/system.ts', { eager: true });

export function screenComponent(id: ScreenId): Component {
  const mod = components[`./${id}/Screen.svelte`];
  if (!mod) throw new Error(`screen ${id} has no Screen.svelte`);
  return mod.default;
}

export const SCREEN_COMPONENTS = SCREENS.map((s) => ({ ...s, component: screenComponent(s.id) }));
