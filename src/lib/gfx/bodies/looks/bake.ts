import { bakeSteps } from './define.ts';
import type { Look } from './types.ts';

const SLICE_MS = 8;
const IDLE_TIMEOUT_MS = 100;
const queue: Look[] = [];
const listeners = new Set<() => void>();
let running: { look: Look; steps: Generator<void> } | null = null;
let scheduled = false;
let done = 0;

export const bakedCount = (): number => done;

export function onBaked(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function finish(look: Look): void {
  done++;
  const at = queue.indexOf(look);
  if (at >= 0) queue.splice(at, 1);
  for (const fn of listeners) fn();
}

export function bakeStep(budget = SLICE_MS): boolean {
  const end = performance.now() + budget;
  do {
    if (!running) {
      const look = queue.find((l) => !l.ready);
      if (!look) {
        queue.length = 0;
        return false;
      }
      running = { look, steps: bakeSteps(look) };
    }
    if (running.steps.next().done) {
      finish(running.look);
      running = null;
    }
  } while (performance.now() < end);
  return true;
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const run = (budget: number) => {
    scheduled = false;
    if (bakeStep(budget)) schedule();
  };
  if (typeof requestIdleCallback === 'function')
    requestIdleCallback(
      (idle) => run(idle.didTimeout ? SLICE_MS : Math.max(SLICE_MS, idle.timeRemaining() - 2)),
      {
        timeout: IDLE_TIMEOUT_MS
      }
    );
  else setTimeout(() => run(SLICE_MS), 0);
}

export function want(look: Look): void {
  if (look.ready || queue.includes(look)) return;
  queue.push(look);
  schedule();
}

export function forget(look: Look): void {
  const at = queue.indexOf(look);
  if (at >= 0) queue.splice(at, 1);
  if (running?.look === look) running = null;
}

export function bakeNow(look: Look): void {
  if (look.ready) return;
  const own = running?.look === look ? running.steps : bakeSteps(look);
  while (!own.next().done);
  if (running?.look === look) running = null;
  finish(look);
}

export function bakeWanted(): void {
  while (bakeStep(1e9));
}
