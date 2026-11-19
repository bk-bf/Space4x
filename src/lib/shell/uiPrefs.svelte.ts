const AUTOSAVE_KEY = 'space4x.gameplay.autosave';

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function saveBool(key: string, value: boolean): boolean {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    return value;
  }
  return value;
}

export const prefs = $state({ autosave: loadBool(AUTOSAVE_KEY, true) });

export function setAutosave(on: boolean): void {
  prefs.autosave = saveBool(AUTOSAVE_KEY, on);
}
