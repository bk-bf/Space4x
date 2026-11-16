import { existsSync, readFileSync } from 'node:fs';

export interface LayoutState {
  query: string;
  screen: string;
  name: string;
  built: boolean;
  mock: boolean;
  size?: readonly [number, number];
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
  'zoom=jupiter:4e6',
  'zoom=saturn:5e6',
  'sel=body:rhea&zoom=saturn:5e6',
  'zoom=pluto:1e7',
  'zoom=belt',
  'sel=body:ceres&zoom=belt',
  'sel=body:bennu&zoom=bennu',
  'sel=body:eros&zoom=eros',
  'sel=body:kleopatra&zoom=kleopatra',
  'sel=body:luna',
  'sel=body:mars&surveyed=mars',
  'sel=body:eros&surveyed=eros&zoom=belt',
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
  'screen=economy&tab=people',
  'screen=economy&tab=people&scenario=famine',
  'screen=economy&per=year',
  'screen=economy&tab=production&per=year',
  'screen=economy&tab=stockpiles&per=year',
  'screen=economy&scenario=famine',
  'screen=economy&tab=yard&scenario=travel',
  'screen=economy&tab=launch&scenario=travel',
  'screen=economy&tab=ships&scenario=travel',
  'screen=economy&tab=ships&scenario=belt',
  'screen=economy&colony=luna&scenario=belt&outpost=1',
  'screen=economy&colony=bennu&scenario=belt&asteroid=bennu',
  'screen=economy&tab=people&colony=luna&scenario=belt&outpost=1',
  'screen=economy&tab=stockpiles&colony=luna&scenario=belt&outpost=1',
  'screen=economy&tab=construction&colony=luna&scenario=belt&outpost=1',
  'screen=economy&tab=production&colony=luna&scenario=belt&outpost=1',
  'screen=economy&tab=supply&colony=orbit-earth&scenario=travel',
  'screen=economy&colony=orbit-earth&scenario=travel',
  'sel=ship:ship-4&scenario=travel',
  'sel=base:orbit-earth&scenario=travel',
  'screen=economy&tab=ships&scenario=jump',
  'screen=economy&tab=ships&scenario=jump&outpost=1',
  'screen=economy&colony=sol-a&scenario=jump&outpost=1',
  'screen=economy&tab=construction&colony=sol-a&scenario=jump&outpost=1',
  'sel=jump:sol-a&scenario=jump&outpost=1',
  'screen=research',
  'screen=research&milestone=12',
  'screen=research&milestone=22&reached=8',
  'screen=research&milestone=29&reached=28',
  'screen=research&rtab=programmes&milestone=6',
  'screen=research&rtab=unlocks&milestone=3',
  'screen=classes',
  'screen=classes&new=stage',
  'screen=classes&reached=6&new=crewed',
  'screen=classes&reached=29',
  'screen=ground',
  'screen=commanders',
  'screen=commanders&cmd=3',
  'screen=commanders&cmd=6&tab=posts',
  'screen=intel',
  'screen=galaxy',
  'screen=galaxy&sys=luy'
];

const SHORT_WINDOW: readonly [number, number] = [1280, 720];

const SHORT_WINDOW_QUERIES = [
  'screen=research&milestone=17',
  'screen=research&milestone=22&reached=8',
  'screen=research&milestone=29&reached=28',
  'screen=research&rtab=programmes&milestone=6',
  'screen=research&rtab=unlocks&milestone=3',
  'screen=classes',
  'screen=classes&new=stage',
  'screen=classes&reached=6&new=crewed'
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

const stateOf = (query: string, size?: readonly [number, number]): LayoutState => {
  const screen = screenOf(query);
  const base = query.replace(/[=&:,]/g, '-') || 'default';
  return {
    query,
    screen,
    name: size ? `${base}-${size.join('x')}` : base,
    built: isBuilt(screen),
    mock: MOCK_SCREENS.has(screen) || SITE_QUERIES.has(query),
    ...(size ? { size } : {})
  };
};

export const STATES: readonly LayoutState[] = [
  ...QUERIES.map((query) => stateOf(query)),
  ...SHORT_WINDOW_QUERIES.map((query) => stateOf(query, SHORT_WINDOW))
];
