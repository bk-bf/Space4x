import { designer } from './designer.svelte.ts';
import type { ShipClass } from './design.ts';

export type { ShipClass } from './design.ts';

export const shipClasses = (): readonly ShipClass[] => designer.saved;

export const shipClass = (id: string): ShipClass | undefined => designer.saved.find((c) => c.id === id);
