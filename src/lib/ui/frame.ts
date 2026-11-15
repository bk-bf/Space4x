export type FrameFn = (t: number) => void;

const callbacks = new Set<FrameFn>();
let t = 0;
let ready = false;
let queued = false;

export const animTime = (): number => t;

export function onFrame(fn: FrameFn): () => void {
  callbacks.add(fn);
  return () => {
    callbacks.delete(fn);
  };
}

export function renderNow(): void {
  if (!ready) return;
  for (const fn of callbacks) fn(t);
}

export function requestRender(): void {
  if (queued || typeof requestAnimationFrame === 'undefined') return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    renderNow();
  });
}

export function frameTick(): void {
  t++;
  renderNow();
}

export function startRendering(): void {
  ready = true;
  renderNow();
}
