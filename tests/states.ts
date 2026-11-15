import { existsSync, readFileSync } from 'node:fs';

export interface LayoutState {
  query: string;
  screen: string;
  name: string;
  built: boolean;
}

const QUERIES = [
  '',
  'arr=float',
  'sel=body:mars',
  'sel=contact:C-014',
  'zoom=3',
  'dock=events:left',
  'dock=events:right',
  'screen=economy',
  'screen=research',
  'screen=classes',
  'screen=classes&cls=lighthouse',
  'screen=colony',
  'screen=ground',
  'screen=commanders',
  'screen=intel',
  'screen=galaxy'
];

const screenOf = (query: string) => new URLSearchParams(query).get('screen') ?? 'map';

export function isBuilt(screen: string): boolean {
  const file = `src/lib/screens/${screen}/Screen.svelte`;
  return existsSync(file) && !readFileSync(file, 'utf8').includes('<Placeholder');
}

export const STATES: readonly LayoutState[] = QUERIES.map((query) => {
  const screen = screenOf(query);
  return { query, screen, name: query.replace(/[=&:,]/g, '-') || 'default', built: isBuilt(screen) };
});
