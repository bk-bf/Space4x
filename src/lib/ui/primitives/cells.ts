import type { Snippet } from 'svelte';

export type Cell =
  | string
  | number
  | Snippet
  | { text: string | number; warn?: boolean }
  | { meter: number; wide?: boolean; label?: string }
  | { pct: number };

export const isNumericColumn = (head: string): boolean => head.startsWith('>');

export const columnLabel = (head: string): string => (isNumericColumn(head) ? head.slice(1) : head);

export interface Tab {
  id: string;
  label: string;
}
