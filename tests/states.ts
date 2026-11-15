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
  'sel=fleet:convoy',
  'sys=acen',
  'sys=barn&sel=contact:C-019',
  'screen=economy',
  'screen=economy&tab=industry',
  'screen=economy&tab=mining',
  'screen=economy&tab=shipyards',
  'screen=economy&tab=stockpiles',
  'screen=economy&tab=wealth',
  'screen=economy&colony=earth&tab=industry',
  'screen=economy&colony=earth&tab=mining',
  'screen=economy&colony=luna&tab=shipyards',
  'screen=economy&colony=europa&tab=industry',
  'screen=economy&colony=europa&tab=shipyards',
  'screen=research',
  'screen=research&field=sensors',
  'screen=classes',
  'screen=classes&cls=lighthouse',
  'screen=classes&cls=atlas',
  'screen=classes&new=hauler',
  'screen=colony',
  'screen=colony&colony=luna',
  'screen=ground',
  'screen=commanders',
  'screen=commanders&cmd=3',
  'screen=intel',
  'screen=intel&group=civilian',
  'screen=galaxy',
  'screen=galaxy&sys=luy'
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
