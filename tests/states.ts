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
  'sel=body:earth',
  'zoom=inner',
  'zoom=star',
  'zoom=earth',
  'zoom=earth:3000',
  'zoom=jupiter',
  'zoom=sol-station',
  'zoom=battle',
  'zoom=gate&sel=site:gate',
  'sel=site:boarding',
  'zoom=battle:1e7',
  'dock=events:left',
  'dock=events:right',
  'screen=economy',
  'screen=economy&tab=production',
  'screen=economy&tab=construction',
  'screen=economy&tab=stockpiles',
  'screen=economy&tab=milestones',
  'screen=economy&tab=milestones&milestone=5',
  'screen=economy&scenario=famine',
  'screen=research',
  'screen=research&milestone=12',
  'screen=classes',
  'screen=classes&new=stage',
  'screen=classes&reached=6&new=crewed',
  'screen=classes&reached=29',
  'screen=colony',
  'screen=colony&scenario=famine',
  'screen=ground',
  'screen=commanders',
  'screen=commanders&cmd=3',
  'screen=intel',
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
