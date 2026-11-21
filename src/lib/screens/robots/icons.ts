import { robotPart } from '#lib/game/data/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';

export const partIcon = (id: string): IconRef => ({ kind: 'component', id: robotPart(id).component ?? id });
