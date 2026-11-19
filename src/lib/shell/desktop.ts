export type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

type Page = Pick<Window, 'addEventListener' | 'location' | 'document'> & { console: Console };

const internals = () => (globalThis as { __TAURI_INTERNALS__?: { invoke: Invoke } }).__TAURI_INTERNALS__;

const text = (value: unknown) =>
  value instanceof Error ? (value.stack ?? `${value.name}: ${value.message}`) : String(value);

export function connectDesktop(invoke: Invoke, page: Page): void {
  const report = (level: 'info' | 'error', message: string) =>
    void invoke('report', { level, message }).catch(() => {});

  page.addEventListener('error', (e) =>
    report('error', `${e.message} (${e.filename}:${e.lineno}:${e.colno})`)
  );
  page.addEventListener('unhandledrejection', (e) => report('error', `unhandled: ${text(e.reason)}`));
  const consoleError = page.console.error.bind(page.console);
  page.console.error = (...args: unknown[]) => {
    report('error', args.map(text).join(' '));
    consoleError(...args);
  };

  page.addEventListener('keydown', (e) => {
    if (e.key !== 'F11' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    void invoke('fullscreen').catch(() => {});
  });

  let title = '';
  const watchTitle = () => {
    if (page.document.title === title) return;
    title = page.document.title;
    if (title.startsWith('BENCH')) report('info', title);
  };
  new MutationObserver(watchTitle).observe(page.document.head, {
    subtree: true,
    childList: true,
    characterData: true
  });

  report('info', `loaded ${page.location.href}`);
}

export function startDesktop(): void {
  const tauri = internals();
  if (tauri) connectDesktop(tauri.invoke, window);
}
