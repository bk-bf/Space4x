import type { IconRef } from '#lib/gfx/icons/index.ts';

export const mat = (id: string): IconRef => ({ kind: 'material', id });
export const bld = (id: string): IconRef => ({ kind: 'building', id });
export const comp = (id: string): IconRef => ({ kind: 'component', id });
