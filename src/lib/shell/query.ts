import type { Selection, SelectionKind } from '#lib/game/index.ts';
import type { Dock } from '#lib/ui/index.ts';

export interface QueryState {
  screen: string | null;
  selection: Selection;
  system: string | null;
  zoom: number | null;
  arrangement: 'dock' | 'float';
  dock: { id: string; slot: Dock } | null;
  check: boolean;
}

const KINDS: readonly SelectionKind[] = ['fleet', 'body', 'contact'];
const SLOTS: readonly Dock[] = ['', 'left', 'right', 'bottom'];
const DEFAULT_SELECTION: Selection = { kind: 'fleet', id: 'survey' };

function parseSelection(raw: string | null): Selection {
  const [kind, id] = (raw ?? '').split(':');
  return KINDS.includes(kind as SelectionKind) && id
    ? { kind: kind as SelectionKind, id }
    : DEFAULT_SELECTION;
}

function parseDock(raw: string | null): QueryState['dock'] {
  const [id, slot = ''] = (raw ?? '').split(':');
  return id && SLOTS.includes(slot as Dock) ? { id, slot: slot as Dock } : null;
}

export function parseQuery(params: URLSearchParams): QueryState {
  const zoom = Number(params.get('zoom'));
  return {
    screen: params.get('screen'),
    selection: parseSelection(params.get('sel')),
    system: params.get('sys'),
    zoom: params.has('zoom') && zoom > 0 ? zoom : null,
    arrangement: params.get('arr') === 'float' ? 'float' : 'dock',
    dock: parseDock(params.get('dock')),
    check: params.has('check')
  };
}
