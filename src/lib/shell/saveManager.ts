import { classes, START_TIME, type Game, type GameEvent } from '#lib/game/index.ts';
import { robots } from '#lib/game/robots/index.ts';
import { checkSave, serialise, type SaveData } from '#lib/game/save.ts';
import { prefs } from './uiPrefs.svelte.ts';

const DB_NAME = 'space4x';
const DB_VERSION = 1;
const STORE = 'saves';

const SAVE_PREFIX = 'save:';
const CLASSES_PREFIX = 'classes:';
const META_PREFIX = 'meta:';
const LOG_PREFIX = 'log:';
const saveKey = (id: string) => SAVE_PREFIX + id;
const classesKey = (id: string) => CLASSES_PREFIX + id;
const metaKey = (id: string) => META_PREFIX + id;
const logKey = (id: string) => LOG_PREFIX + id;

export const AUTOSAVE_GAP_MS = 10_000;

function newSaveId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface SaveFile extends SaveData {
  ui?: unknown;
}

type Dynamic = Omit<SaveFile, 'classes' | 'game'> & { game: { time: number; step: number } };

let savedClassesRef: unknown = null;
let savedLogMark: string | null = null;

const logMark = (events: readonly GameEvent[]): string =>
  `${events.length}:${events[0]?.at ?? ''}:${events[0]?.text ?? ''}`;

function resetDirty(): void {
  savedClassesRef = null;
  savedLogMark = null;
}

const classesDirty = (): boolean => classes.saved !== savedClassesRef;
const logDirty = (game: Game): boolean => logMark(game.events) !== savedLogMark;

interface Baseline {
  elapsed: number;
  classes: unknown;
  robots: unknown;
  log: string;
}

let baseline: Baseline | null = null;

export function markClean(game: Game): void {
  baseline = {
    elapsed: game.elapsed,
    classes: classes.saved,
    robots: robots.saved,
    log: logMark(game.events)
  };
}

export const hasChanged = (game: Game): boolean =>
  !baseline ||
  baseline.elapsed !== game.elapsed ||
  baseline.classes !== classes.saved ||
  baseline.robots !== robots.saved ||
  baseline.log !== logMark(game.events);

export const sinceSaved = (game: Game): number => (baseline ? game.elapsed - baseline.elapsed : Infinity);

export const classesEdited = (): boolean =>
  !baseline || baseline.classes !== classes.saved || baseline.robots !== robots.saved;

let activeSaveId: string | null = null;
let activeCommitted = true;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastWrite = 0;

export function setActiveSave(id: string): void {
  activeSaveId = id;
  activeCommitted = true;
  resetDirty();
}

export function mintActiveSave(): string {
  activeSaveId = newSaveId();
  activeCommitted = true;
  resetDirty();
  return activeSaveId;
}

export function ensureActiveSave(): string {
  return activeSaveId ?? mintActiveSave();
}

export function setActiveCommitted(committed: boolean): void {
  activeCommitted = committed;
  if (!committed && saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export function isActiveCommitted(): boolean {
  return activeCommitted;
}

export interface SaveMeta {
  version: number;
  time: number;
  researched: number;
  sites: number;
  ships: number;
  savedAt: number;
  kind: 'auto' | 'manual';
}

export interface SaveEntry {
  id: string;
  meta: SaveMeta;
}

function buildMeta(
  data: Pick<SaveData, 'version' | 'game' | 'economy' | 'ships'>,
  kind: 'auto' | 'manual'
): SaveMeta {
  return {
    version: data.version,
    time: data.game.time,
    researched: data.economy.done.length,
    sites: data.economy.sites.length,
    ships: data.ships.vessels.length,
    savedAt: Date.now(),
    kind
  };
}

let db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const store = await openDb();
  return new Promise((resolve) => {
    const req = store.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

function putInto(store: IDBDatabase, entries: [string, unknown][]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = store.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    for (const [key, value] of entries) os.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.commit();
  });
}

function idbPut(entries: [string, unknown][]): Promise<void> {
  return db ? putInto(db, entries) : openDb().then((store) => putInto(store, entries));
}

async function idbDelete(keys: string[]): Promise<void> {
  const store = await openDb();
  return new Promise((resolve) => {
    const tx = store.transaction(STORE, 'readwrite');
    for (const key of keys) tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbKeys(): Promise<string[]> {
  const store = await openDb();
  return new Promise((resolve) => {
    const req = store.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result.map(String));
    req.onerror = () => resolve([]);
  });
}

const available = (): boolean => typeof indexedDB !== 'undefined';

function warn(what: string, err: unknown): void {
  console.warn(`[saveManager] ${what}:`, err);
}

function dynamicOf(data: SaveFile): Dynamic {
  const { classes: _classes, game, ...rest } = data;
  return { ...rest, game: { time: game.time, step: game.step } };
}

function writes(
  id: string,
  game: Game,
  ui: unknown,
  kind: 'auto' | 'manual',
  all: boolean
): [string, unknown][] {
  const data: SaveFile = { ...serialise(game), ui };
  const out: [string, unknown][] = [
    [saveKey(id), dynamicOf(data)],
    [metaKey(id), buildMeta(data, kind)]
  ];
  if (all || classesDirty()) out.push([classesKey(id), data.classes]);
  if (all || logDirty(game)) out.push([logKey(id), data.game.events]);
  return out;
}

function markSaved(game: Game): void {
  savedClassesRef = classes.saved;
  savedLogMark = logMark(game.events);
}

export async function listSaves(): Promise<SaveEntry[]> {
  if (!available()) return [];
  try {
    const keys = await idbKeys();
    const ids = keys.filter((k) => k.startsWith(SAVE_PREFIX)).map((k) => k.slice(SAVE_PREFIX.length));
    const entries: SaveEntry[] = [];
    for (const id of ids) {
      let meta = await idbGet<SaveMeta>(metaKey(id));
      if (!meta) {
        const dyn = await idbGet<Partial<Dynamic>>(saveKey(id));
        meta = {
          version: typeof dyn?.version === 'number' ? dyn.version : 0,
          time: dyn?.game?.time ?? START_TIME,
          researched: dyn?.economy?.done?.length ?? 0,
          sites: dyn?.economy?.sites?.length ?? 0,
          ships: dyn?.ships?.vessels?.length ?? 0,
          savedAt: 0,
          kind: 'manual'
        };
      }
      entries.push({ id, meta });
    }
    entries.sort((a, b) => b.meta.savedAt - a.meta.savedAt);
    return entries;
  } catch (err) {
    warn('list failed', err);
    return [];
  }
}

export type LoadResult = { id: string; data: SaveFile } | { id: string; error: string } | null;

export async function loadSave(game: Game, id?: string): Promise<LoadResult> {
  if (!available()) return null;
  let target: string | null = id ?? activeSaveId;
  try {
    target ??= (await listSaves())[0]?.id ?? null;
    if (!target) return null;
    const dyn = await idbGet<Dynamic>(saveKey(target));
    if (!dyn) return { id: target, error: 'it is missing' };
    const saved = await idbGet<SaveData['classes']>(classesKey(target));
    const events = await idbGet<GameEvent[]>(logKey(target));
    const raw = { ...dyn, game: { ...dyn.game, events: events ?? [] }, classes: saved };
    const error = checkSave(raw, game);
    return error ? { id: target, error } : { id: target, data: raw as SaveFile };
  } catch (err) {
    warn('load failed', err);
    return target ? { id: target, error: 'it could not be read' } : null;
  }
}

export async function hasSave(): Promise<boolean> {
  if (!available()) return false;
  try {
    return (await idbKeys()).some((k) => k.startsWith(SAVE_PREFIX));
  } catch {
    return false;
  }
}

export async function deleteSaveById(id: string): Promise<void> {
  if (!available()) return;
  try {
    await idbDelete([saveKey(id), classesKey(id), metaKey(id), logKey(id)]);
  } catch (err) {
    warn('delete failed', err);
  }
}

function runWhenIdle(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  if (ric) ric(fn, { timeout: 1000 });
  else setTimeout(fn, 0);
}

export const lastSaveAt = (): number => lastWrite;

export function scheduleSave(game: Game, ui: () => unknown): void {
  if (!available() || !activeCommitted || !prefs.autosave || !activeSaveId) return;
  if (saveTimer !== null) return;
  const wait = Math.max(0, lastWrite + AUTOSAVE_GAP_MS - Date.now());
  saveTimer = setTimeout(() => {
    saveTimer = null;
    runWhenIdle(() => void saveGameNow(game, ui()));
  }, wait);
}

export function saveGameNow(game: Game, ui: unknown): Promise<void> {
  if (!available() || !activeCommitted) return Promise.resolve();
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const id = ensureActiveSave();
  const entries = writes(id, game, ui, 'auto', false);
  markSaved(game);
  markClean(game);
  lastWrite = Date.now();
  return idbPut(entries).catch((err: unknown) => {
    resetDirty();
    warn('autosave failed', err);
  });
}

async function writeSnapshot(id: string, game: Game, ui: unknown): Promise<void> {
  try {
    await idbPut(writes(id, game, ui, 'manual', true));
  } catch (err) {
    warn('snapshot failed', err);
  }
}

export async function saveSnapshotNow(game: Game, ui: unknown): Promise<string> {
  if (!available()) return '';
  const id = newSaveId();
  await writeSnapshot(id, game, ui);
  return id;
}

export async function overwriteSnapshotNow(id: string, game: Game, ui: unknown): Promise<void> {
  if (!available()) return;
  await writeSnapshot(id, game, ui);
}
