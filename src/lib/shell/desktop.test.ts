import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectDesktop, type Invoke } from './desktop';

let titleChanged = () => {};

class TitleObserver {
  constructor(callback: () => void) {
    titleChanged = callback;
  }
  observe() {}
}

function fakePage() {
  const target = new EventTarget();
  const document = { title: 'Space4x', head: {} };
  const logged = vi.fn();
  const console = { error: logged };
  const page = {
    addEventListener: target.addEventListener.bind(target),
    console,
    location: { href: 'tauri://localhost/' },
    document
  } as unknown as Parameters<typeof connectDesktop>[1];
  return { target, document, logged, page };
}

function connect() {
  vi.stubGlobal('MutationObserver', TitleObserver);
  const calls: [string, Record<string, unknown> | undefined][] = [];
  const invoke: Invoke = (cmd, args) => {
    calls.push([cmd, args]);
    return Promise.resolve();
  };
  const fake = fakePage();
  connectDesktop(invoke, fake.page);
  return { ...fake, calls };
}

const keyEvent = (key: string, mods: Partial<KeyboardEvent> = {}) =>
  Object.assign(new Event('keydown', { cancelable: true }), { key, ...mods });

afterEach(() => vi.unstubAllGlobals());

describe('the desktop shell hook', () => {
  it('reports the page it loaded', () => {
    expect(connect().calls).toEqual([['report', { level: 'info', message: 'loaded tauri://localhost/' }]]);
  });

  it('forwards uncaught errors, rejections and console errors, and still logs them', () => {
    const { target, page, logged, calls } = connect();
    target.dispatchEvent(
      Object.assign(new Event('error'), { message: 'boom', filename: 'app.js', lineno: 3, colno: 7 })
    );
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'lost' }));
    page.console.error('bad', 2);
    expect(calls.slice(1).map(([, args]) => args)).toEqual([
      { level: 'error', message: 'boom (app.js:3:7)' },
      { level: 'error', message: 'unhandled: lost' },
      { level: 'error', message: 'bad 2' }
    ]);
    expect(logged).toHaveBeenCalledWith('bad', 2);
  });

  it('toggles full screen on a bare F11 only', () => {
    const { target, calls } = connect();
    const f11 = keyEvent('F11');
    target.dispatchEvent(f11);
    target.dispatchEvent(keyEvent('F11', { ctrlKey: true }));
    target.dispatchEvent(keyEvent('F1'));
    expect(f11.defaultPrevented).toBe(true);
    expect(calls.filter(([cmd]) => cmd === 'fullscreen')).toHaveLength(1);
  });

  it('reports a bench result once when the title shows it', () => {
    const { document, calls } = connect();
    document.title = 'BENCH rest median 4.0';
    titleChanged();
    titleChanged();
    document.title = 'Space4x';
    titleChanged();
    expect(calls.slice(1)).toEqual([['report', { level: 'info', message: 'BENCH rest median 4.0' }]]);
  });
});
