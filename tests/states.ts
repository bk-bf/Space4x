import { existsSync, readFileSync } from 'node:fs';

export interface LayoutState {
  query: string;
  screen: string;
  name: string;
  built: boolean;
  mock: boolean;
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
  'screen=classes&cls=lighthouse',
  'screen=classes&cls=atlas',
  'screen=classes&new=hauler',
  'screen=colony',
  'screen=colony&scenario=famine',
  'screen=ground',
  'screen=commanders',
  'screen=commanders&cmd=3',
  'screen=intel',
  'screen=galaxy',
  'screen=galaxy&sys=luy'
];

const SITE_QUERIES = new Set([
  'zoom=sol-station',
  'zoom=battle',
  'zoom=gate&sel=site:gate',
  'sel=site:boarding',
  'zoom=battle:1e7'
]);

const MOCK_SCREENS = new Set(
  [...readFileSync('src/lib/screens/list.ts', 'utf8').matchAll(/id: '(\w+)'[^}]*mock: true/g)].map(
    (m) => m[1]
  )
);

const screenOf = (query: string) => new URLSearchParams(query).get('screen') ?? 'map';

export function isBuilt(screen: string): boolean {
  const file = `src/lib/screens/${screen}/Screen.svelte`;
  return existsSync(file) && !readFileSync(file, 'utf8').includes('<Placeholder');
}

export const STATES: readonly LayoutState[] = QUERIES.map((query) => {
  const screen = screenOf(query);
  return {
    query,
    screen,
    name: query.replace(/[=&:,]/g, '-') || 'default',
    built: isBuilt(screen),
    mock: MOCK_SCREENS.has(screen) || SITE_QUERIES.has(query)
  };
});
