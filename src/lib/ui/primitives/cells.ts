import type { Snippet } from 'svelte';
import type { IconName } from '#lib/gfx/icons.ts';

export type Cell =
  | string
  | number
  | Snippet
  | { text: string | number; warn?: boolean }
  | { icon: IconName; text: string | number; warn?: boolean }
  | { meter: number; wide?: boolean; label?: string }
  | { pct: number };

export const isNumericColumn = (head: string): boolean => head.startsWith('>');

export const columnLabel = (head: string): string => (isNumericColumn(head) ? head.slice(1) : head);

export interface Tab {
  id: string;
  label: string;
  icon?: IconName;
}
