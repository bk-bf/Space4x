import { DAY, formatDay, game } from '#lib/game/index.ts';
import { resetGame, restore } from '#lib/game/save.ts';
import { designer } from '#lib/screens/classes/designer.svelte.ts';
import { launchUi } from '#lib/screens/economy/launchState.svelte.ts';
import { isTabId, resetEconomyScreen, ui } from '#lib/screens/economy/state.svelte.ts';
import { research, RESEARCH_TABS } from '#lib/screens/research/research.svelte.ts';
import { requestRender, shell } from '#lib/ui/index.ts';
import {
  classesEdited,
  deleteSaveById,
  hasChanged,
  isActiveCommitted,
  lastSaveAt,
  listSaves,
  loadSave,
  markClean,
  mintActiveSave,
  overwriteSnapshotNow,
  saveGameNow,
  saveSnapshotNow,
  scheduleSave,
  setActiveCommitted,
  setActiveSave,
  sinceSaved,
  type SaveEntry
} from './saveManager.ts';
import { prefs } from './uiPrefs.svelte.ts';

const POLL_MS = 1000;
const TEST_PARAMS = [
  'check',
  'test',
  'scenario',
  'reached',
  'start',
  'new',
  'surveyed',
  'outpost',
  'asteroid',
  'bench'
];

export type SaveDialog = 'save' | 'load';

export const session = $state({
  autoload: false,
  ready: false,
  menu: false,
  title: false,
  resumable: false,
  dialog: null as SaveDialog | null,
  savedAt: 0,
  revision: 0
});

let wasPausedBeforeMenu = true;

export function openPauseMenu(): void {
  wasPausedBeforeMenu = !game.running;
  game.pause();
  session.menu = true;
}

export function closePauseMenu(): void {
  session.menu = false;
  if (!wasPausedBeforeMenu) game.run();
  wasPausedBeforeMenu = true;
}

export const isTestUrl = (params: URLSearchParams): boolean => TEST_PARAMS.some((p) => params.has(p));

interface SavedUi {
  screen: string;
  tab: string;
  site: string;
  vessel: string | null;
  period: string;
  research: { selected: number; tab: string };
}

export function uiState(): SavedUi {
  return {
    screen: shell.screen,
    tab: ui.tab,
    site: ui.site,
    vessel: ui.vessel,
    period: ui.period,
    research: { selected: research.selected, tab: research.tab }
  };
}

function applyUi(saved: unknown): void {
  if (typeof saved !== 'object' || saved === null) return;
  const s = saved as Partial<SavedUi>;
  if (typeof s.screen === 'string') shell.setScreen(s.screen);
  if (isTabId(s.tab)) ui.tab = s.tab;
  if (typeof s.site === 'string') ui.site = s.site;
  if (typeof s.vessel === 'string') ui.vessel = s.vessel;
  if (s.period === 'day' || s.period === 'year') ui.period = s.period;
  const r = s.research;
  if (r && typeof r.selected === 'number') research.selected = r.selected;
  const tab = RESEARCH_TABS.find((t) => t === r?.tab);
  if (tab) research.tab = tab;
}

function resetAll(): void {
  resetGame(game);
  resetEconomyScreen();
  launchUi.ship = '';
  designer.pickedId = null;
  research.selected = 1;
  research.tab = 'tree';
  requestRender();
}

function freshGame(): void {
  mintActiveSave();
  setActiveCommitted(false);
  markClean(game);
}

function changed(): void {
  session.savedAt = lastSaveAt();
  session.revision++;
}

async function load(entry: SaveEntry): Promise<boolean> {
  const result = await loadSave(game, entry.id);
  if (!result) return false;
  if ('error' in result) {
    await deleteSaveById(entry.id);
    game.log('flask', `The save of ${formatDay(entry.meta.time)} was dropped because ${result.error}.`, true);
    changed();
    return false;
  }
  try {
    resetAll();
    restore(game, result.data);
    applyUi(result.data.ui);
  } catch (e) {
    resetAll();
    freshGame();
    await deleteSaveById(entry.id);
    const why = e instanceof Error ? e.message : 'it could not be restored';
    game.log('flask', `The save of ${formatDay(entry.meta.time)} was dropped because ${why}.`, true);
    changed();
    return false;
  }
  if (entry.meta.kind === 'auto') setActiveSave(entry.id);
  else mintActiveSave();
  markClean(game);
  requestRender();
  changed();
  return true;
}

export async function startGame(mode: 'new' | 'load', entry?: SaveEntry): Promise<void> {
  await flushSave();
  session.dialog = null;
  session.menu = false;
  session.title = false;
  wasPausedBeforeMenu = true;
  if (mode === 'load' && entry && (await load(entry))) return;
  if (mode === 'load' && entry) return;
  resetAll();
  freshGame();
  if (session.autoload && prefs.autosave) {
    setActiveCommitted(true);
    await saveGameNow(game, uiState());
  }
  changed();
}

export function continueGame(): void {
  session.title = false;
}

export async function openTitle(): Promise<void> {
  game.pause();
  wasPausedBeforeMenu = true;
  await flushSave();
  session.dialog = null;
  session.menu = false;
  session.resumable = true;
  session.title = true;
}

export async function saveGame(): Promise<void> {
  await saveSnapshotNow(game, uiState());
  markClean(game);
  changed();
}

export async function overwriteSave(id: string): Promise<void> {
  await overwriteSnapshotNow(id, game, uiState());
  markClean(game);
  changed();
}

const unsavedProgress = (): boolean => session.autoload && hasChanged(game);

function onLeave(e: BeforeUnloadEvent): void {
  if (!unsavedProgress()) return;
  if (prefs.autosave) {
    void flushSave();
    return;
  }
  e.preventDefault();
  e.returnValue = '';
}

export async function flushSave(): Promise<void> {
  if (!session.autoload || !prefs.autosave || !hasChanged(game)) return;
  setActiveCommitted(true);
  await saveGameNow(game, uiState());
  changed();
}

function tick(): void {
  if (!prefs.autosave || !hasChanged(game)) return;
  if (!isActiveCommitted()) setActiveCommitted(true);
  if (sinceSaved(game) >= DAY || classesEdited()) scheduleSave(game, uiState);
  if (lastSaveAt() !== session.savedAt) changed();
}

export async function startSession(params: URLSearchParams): Promise<() => void> {
  if (isTestUrl(params)) {
    freshGame();
    session.title = params.has('menu');
    session.ready = true;
    return () => {};
  }
  session.autoload = true;
  const latest = (await listSaves())[0];
  session.resumable = !!latest && (await load(latest));
  if (!session.resumable) freshGame();
  session.title = true;
  const timer = setInterval(tick, POLL_MS);
  const onHide = () => void flushSave();
  const onHidden = () => {
    if (document.visibilityState === 'hidden') onHide();
  };
  addEventListener('pagehide', onHide);
  addEventListener('beforeunload', onLeave);
  document.addEventListener('visibilitychange', onHidden);
  session.ready = true;
  return () => {
    clearInterval(timer);
    removeEventListener('pagehide', onHide);
    removeEventListener('beforeunload', onLeave);
    document.removeEventListener('visibilitychange', onHidden);
    session.autoload = false;
  };
}
